const admin = require('firebase-admin');
const fetch = require('node-fetch');

let isInitialized = false;
let db = null;
let messaging = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp();
            db = admin.firestore();
            messaging = admin.messaging();
            isInitialized = true;
            return true;
        }

        let serviceAccount = JSON.parse(saVar.trim());
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        messaging = admin.messaging();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in cli-tools-manager:', e.message);
        return false;
    }
};

const verifyApiKey = async (apiKey) => {
    if (!apiKey) return null;
    const keySnap = await db.collection('api_keys').doc(apiKey).get();
    if (!keySnap.exists || keySnap.data().status !== 'ACTIVE') return null;
    return keySnap.data().userId;
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, x-api-key",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Database unavailable" });
    }

    const apiKey = event.headers['x-api-key'];
    const sellerId = await verifyApiKey(apiKey);

    if (!sellerId) {
        return jsonResponse(401, { success: false, error: "Unauthorized: Invalid or missing API Key." });
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { tool, action } = body;
        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        if (!tool) {
            return jsonResponse(200, {
                success: true,
                tools: ["tracker", "notifications", "mail", "webhook", "ai-studio", "mail-campaign"],
                message: "Use 'tool' parameter to access specific tool data."
            });
        }

        // --- 1. WEBSITE TRACKER ---
        if (tool === 'tracker') {
            if (action === 'LIST') {
                const snap = await db.collection('external_sites').where('ownerId', '==', sellerId).get();
                const sites = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    sites.push({ id: doc.id, ...data });
                });
                return jsonResponse(200, { success: true, sites });
            }
            if (action === 'ADD') {
                const { url, name, features } = body;
                if (!url) return jsonResponse(400, { success: false, error: "URL required" });
                const siteId = 'SITE_' + Math.random().toString(36).substring(2, 9).toUpperCase();
                const siteData = {
                    ownerId: sellerId,
                    websiteUrl: url,
                    websiteName: name || url,
                    status: 'active',
                    features: features || { visitors: true, live: true, scroll: true, clicks: true, duration: true },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await db.collection('external_sites').doc(siteId).set(siteData);
                const trackingScript = `<script>\n(function(){var s=document.createElement('script');s.src='${protocol}://${host}/tracker.js';s.setAttribute('data-id','${siteId}');document.head.appendChild(s);})();\n</script>`;
                return jsonResponse(201, { success: true, siteId, trackingScript });
            }
            if (action === 'STATS') {
                const { siteId } = body;
                if (!siteId) return jsonResponse(400, { success: false, error: "siteId required" });
                const siteSnap = await db.collection('external_sites').doc(siteId).get();
                if (!siteSnap.exists || siteSnap.data().ownerId !== sellerId) return jsonResponse(403, { success: false, error: "Forbidden" });

                const eventsSnap = await db.collection('external_sites').doc(siteId).collection('events').orderBy('timestamp', 'desc').limit(10).get();
                const sessionsSnap = await db.collection('external_sites').doc(siteId).collection('sessions').limit(100).get();

                return jsonResponse(200, {
                    success: true,
                    eventCount: eventsSnap.size,
                    sessionCount: sessionsSnap.size,
                    recentEvents: eventsSnap.docs.map(d => ({...d.data(), timestamp: d.data().timestamp?.toDate()}))
                });
            }
        }

        // --- 2. PUSH NOTIFICATIONS ---
        if (tool === 'notifications') {
            if (action === 'LIST') {
                const sitesSnap = await db.collection('external_sites').where('ownerId', '==', sellerId).get();
                let allCampaigns = [];
                for (const siteDoc of sitesSnap.docs) {
                    const campsSnap = await siteDoc.ref.collection('campaigns').get();
                    campsSnap.forEach(c => allCampaigns.push({ id: c.id, siteId: siteDoc.id, siteUrl: siteDoc.data().websiteUrl, ...c.data() }));
                }
                return jsonResponse(200, { success: true, campaigns: allCampaigns });
            }
            if (action === 'SEND') {
                const { siteId, title, body: msgBody, url, image } = body;
                if (!siteId || !title || !msgBody) return jsonResponse(400, { success: false, error: "siteId, title, and body required" });

                const siteRef = db.collection('external_sites').doc(siteId);
                const siteSnap = await siteRef.get();
                if (!siteSnap.exists || siteSnap.data().ownerId !== sellerId) return jsonResponse(403, { success: false, error: "Forbidden" });

                const campaignId = 'CAMP_' + Math.random().toString(36).substring(2, 9).toUpperCase();

                const subsSnap = await siteRef.collection('subscribers').get();
                const tokens = [];
                subsSnap.forEach(d => { if(d.data().fcmToken) tokens.push(d.data().fcmToken); });

                if (tokens.length === 0) {
                    return jsonResponse(200, { success: false, message: "No subscribers found for this site." });
                }

                const messages = tokens.map(t => ({
                    token: t,
                    notification: { title, body: msgBody, image: image || undefined },
                    data: { url: url || '/', siteId }
                }));

                const response = await messaging.sendEach(messages);

                await siteRef.collection('campaigns').doc(campaignId).set({
                    title,
                    description: msgBody,
                    image: image || null,
                    targetUrl: url || siteSnap.data().websiteUrl,
                    audience: 'all',
                    status: 'Sent',
                    sentCount: response.successCount,
                    failedCount: response.failureCount,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return jsonResponse(200, { success: true, sentCount: response.successCount, failureCount: response.failureCount, campaignId });
            }
        }

        // --- 3. MAIL AUTOMATION ---
        if (tool === 'mail') {
            const settingsRef = db.collection('mail_automation_settings').doc(sellerId);
            if (action === 'STATUS') {
                const snap = await settingsRef.get();
                let settings = null;
                if (snap.exists) {
                    settings = snap.data();
                    // SECURITY: Redact sensitive keys
                    if (settings.activeApiKey) settings.activeApiKey = 'HIDDEN';
                    if (settings.apiKey) settings.apiKey = 'HIDDEN';
                }
                return jsonResponse(200, { success: true, settings });
            }
            if (action === 'SETUP') {
                const { email, enabled, dailyCron, recipients, template } = body;
                const settingsData = {
                    siteId: sellerId,
                    userId: sellerId,
                    notificationEmail: email,
                    mailAutomation: enabled !== false,
                    enableDailyCron: Boolean(dailyCron),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await settingsRef.set(settingsData, { merge: true });

                const scheduleRef = db.collection('mail_automation_schedules').doc(sellerId);
                await scheduleRef.set({
                    ...settingsData,
                    recipients: recipients || [],
                    templatePayload: template || {},
                }, { merge: true });

                return jsonResponse(200, { success: true, message: "Mail settings saved" });
            }
            if (action === 'TEST') {
                const { targetEmail, template } = body;
                const res = await fetch(`${protocol}://${host}/.netlify/functions/send-login-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'TEST_SMTP',
                        siteId: sellerId,
                        notificationEmail: targetEmail,
                        ...template,
                        time: new Date().toISOString()
                    })
                });
                const result = await res.json();
                return jsonResponse(res.status, result);
            }
        }

        // --- 4. WEBHOOK GATEWAY ---
        if (tool === 'webhook') {
            if (action === 'STATUS') {
                const webhookUrl = `${protocol}://${host}/.netlify/functions/inbound-webhook?sid=${sellerId}`;
                return jsonResponse(200, { success: true, webhookUrl });
            }
            if (action === 'INBOX') {
                const snap = await db.collection('webhook_inbox')
                    .where('userId', '==', sellerId)
                    .orderBy('receivedAt', 'desc')
                    .limit(20)
                    .get();
                const messages = [];
                snap.forEach(doc => messages.push({ id: doc.id, ...doc.data(), receivedAt: doc.data().receivedAt?.toDate() }));
                return jsonResponse(200, { success: true, messages });
            }
        }

        // --- 5. AI MODEL STUDIO ---
        if (tool === 'ai-studio') {
            if (action === 'LIST') {
                const snap = await db.collection('ai_workspaces').where('ownerId', '==', sellerId).get();
                const workspaces = [];
                snap.forEach(doc => workspaces.push({ id: doc.id, ...doc.data() }));
                return jsonResponse(200, { success: true, workspaces });
            }
        }

        // --- 6. AI MAIL CAMPAIGN ---
        if (tool === 'mail-campaign') {
            if (action === 'LIST') {
                const snap = await db.collection('ai_mail_campaigns').where('userId', '==', sellerId).orderBy('createdAt', 'desc').get();
                const campaigns = [];
                snap.forEach(doc => campaigns.push({ id: doc.id, ...doc.data() }));
                return jsonResponse(200, { success: true, campaigns });
            }
            if (action === 'CREATE') {
                const { name, email, goal, description, price, productId, productImage } = body;
                if (!name || !email) return jsonResponse(400, { success: false, error: "Name and Email required" });

                const campaignId = 'CAMP_' + Date.now();
                const campaignData = {
                    campaignId,
                    userId: sellerId,
                    sellerId,
                    businessName: name,
                    businessEmail: email,
                    title: goal || 'Product Promotion',
                    description: description || '',
                    headline: 'Special Offer from ' + name,
                    price: parseFloat(price) || 0,
                    productId: productId || null,
                    productImage: productImage || null,
                    status: 'Queued',
                    sentCount: 0,
                    failedCount: 0,
                    createdAt: new Date().toISOString()
                };

                await db.collection('ai_mail_campaigns').doc(campaignId).set(campaignData);

                fetch(`${protocol}://${host}/.netlify/functions/aiMailCampaignQueue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ campaignId, userId: sellerId })
                }).catch(() => {});

                return jsonResponse(201, { success: true, campaignId });
            }
        }

        return jsonResponse(400, { success: false, error: "Invalid tool or action" });

    } catch (error) {
        console.error("CLI Tools Manager Error:", error.message);
        return jsonResponse(500, { success: false, error: error.message });
    }
};
