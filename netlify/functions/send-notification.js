const admin = require('firebase-admin');

// Shared initialization state
let isInitialized = false;
let db = null;
let messaging = null;

const initAdmin = () => {
  if (isInitialized) return true;

  console.log('--- Starting Firebase Admin Init ---');
  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saVar) {
      console.error('ERROR: FIREBASE_SERVICE_ACCOUNT env var is missing');
      throw new Error('Config Error: FIREBASE_SERVICE_ACCOUNT environment variable is missing in Netlify settings.');
    }

    console.log('Found FIREBASE_SERVICE_ACCOUNT, length:', saVar.length);

    let serviceAccount;
    try {
      let rawData = saVar.trim();

      if ((rawData.startsWith('"') && rawData.endsWith('"')) || (rawData.startsWith("'") && rawData.endsWith("'"))) {
        rawData = rawData.substring(1, rawData.length - 1);
      }

      serviceAccount = JSON.parse(rawData);
      console.log('JSON parsed successfully. Project ID:', serviceAccount.project_id);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      throw new Error('Config Error: FIREBASE_SERVICE_ACCOUNT is not valid JSON. Ensure it is a single line without broken quotes.');
    }

    if (serviceAccount && serviceAccount.private_key) {
      // Fix potential escaped newlines
      const originalKey = serviceAccount.private_key;
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      console.log('Private key processed. Newlines replaced:', originalKey !== serviceAccount.private_key);
    } else {
      throw new Error('Config Error: private_key is missing in service account JSON');
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized');
    }

    db = admin.firestore();
    messaging = admin.messaging();
    isInitialized = true;
    return true;
  } catch (e) {
    console.error('CRITICAL Init Failure:', e.message);
    throw e;
  }
};

exports.handler = async (event, context) => {
  try {
    // 1. Handle preflight OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: 'Method Not Allowed'
      };
    }

    // 2. Ensure Firebase is ready
    initAdmin();

    // 3. Authenticate the requester using their Firebase ID Token
    const authHeader = event.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized: Missing token' })
      };
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 4. Parse request parameters
    const { siteId, campaignId, targetToken, welcomeTitle, welcomeBody } = JSON.parse(event.body);

    // Case 1: Direct Send (Automatic Welcome)
    if (targetToken && welcomeTitle) {
      const message = {
        token: targetToken,
        notification: {
          title: welcomeTitle,
          body: welcomeBody || 'Thanks for subscribing!'
        },
        data: { url: '/', siteId: siteId || 'unknown' }
      };
      const response = await messaging.send(message);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, messageId: response })
      };
    }

    if (!siteId || !campaignId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing siteId or campaignId' })
      };
    }

    // 5. Security: Verify that the user owns this site
    const siteRef = db.collection('external_sites').doc(siteId);
    const siteSnap = await siteRef.get();

    if (!siteSnap.exists || siteSnap.data().ownerId !== uid) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forbidden: Ownership verification failed' })
      };
    }

    // 6. Load Campaign Details
    const campaignRef = siteRef.collection('campaigns').doc(campaignId);
    const campaignSnap = await campaignRef.get();
    if (!campaignSnap.exists) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Campaign not found' })
      };
    }
    const campaign = campaignSnap.data();

    // 7. Get Target Audience (Subscribers)
    let subscribersQuery = siteRef.collection('subscribers');
    if (campaign.audience === 'active') {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - (30 * 24 * 60 * 60 * 1000));
      subscribersQuery = subscribersQuery.where('lastActiveAt', '>', thirtyDaysAgo);
    }

    const subscribersSnap = await subscribersQuery.get();
    const tokens = [];
    subscribersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    console.log(`Found ${tokens.length} subscribers for campaign: ${campaignId}`);

    if (tokens.length === 0) {
      console.warn('Delivery skipped: No active subscribers found');
      await campaignRef.update({
        status: 'Failed',
        error: 'No active subscribers found',
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, sentCount: 0, error: 'No subscribers found' })
      };
    }

    // 8. Execute Send (FCM v12 Multicast)
    console.log(`Sending messages to ${tokens.length} devices...`);
    const messages = tokens.map(token => ({
      token: token,
      notification: {
        title: campaign.title,
        body: campaign.description,
        image: campaign.image || undefined
      },
      data: {
        url: campaign.targetUrl,
        campaignId: campaignId,
        siteId: siteId
      }
    }));

    const response = await messaging.sendEach(messages);
    console.log(`FCM Multicast Results: Success=${response.successCount}, Failure=${response.failureCount}`);

    // 9. Log Analytics Results
    await campaignRef.update({
      status: 'Sent',
      sentCount: response.successCount,
      failedCount: response.failureCount,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        sentCount: response.successCount,
        failedCount: response.failureCount
      })
    };

  } catch (error) {
    console.error('Function execution error:', error);

    // Determine the type of error to return a more helpful message
    let status = 500;
    let message = error.message;

    if (message.includes('Config Error')) {
      status = 500; // Still a server error, but we've tagged it
    } else if (message.includes('auth/')) {
      status = 401;
      message = 'Authentication failed: ' + message;
    } else if (message.includes('permission-denied')) {
      status = 403;
      message = 'Permission denied: ' + message;
    }

    return {
      statusCode: status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: message,
        details: error.stack ? 'See logs' : undefined
      })
    };
  }
};
