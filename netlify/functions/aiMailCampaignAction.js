const admin = require('firebase-admin');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp();
            db = admin.firestore();
            isInitialized = true;
            return true;
        }

        let serviceAccount = JSON.parse(saVar.trim());
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in aiMailCampaignAction:', e.message);
        return false;
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

/**
 * Secure Token Action Handler for Email Commerce (Order Now, Confirm, Unsubscribe)
 */
exports.handler = async (event, context) => {
    const { token, action } = event.queryStringParameters || {};

    if (!token || !['order', 'confirm', 'cancel', 'unsubscribe'].includes(action)) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Invalid or missing action token.</h2></div></body></html>`
        };
    }

    if (!initAdmin() || !db) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Database connection error.</h2></div></body></html>`
        };
    }

    try {
        let decoded = {};
        try {
            decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        } catch (e) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Malformed action token.</h2></div></body></html>`
            };
        }

        const { cId, email } = decoded;
        const campDoc = await db.collection('ai_mail_campaigns').doc(cId).get();
        if (!campDoc.exists) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Campaign not found or expired.</h2></div></body></html>`
            };
        }
        const campData = campDoc.data();

        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        if (action === 'unsubscribe') {
            const contactQuery = db.collection('email_contacts').where('email', '==', email);
            const contactSnap = await contactQuery.get();
            if (!contactSnap.empty) {
                await contactSnap.docs[0].ref.update({ unsubscribed: true, suppressed: true, status: 'unsubscribed' });
            }
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Successfully Unsubscribed</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Email address <strong>${escapeHtml(email)}</strong> has been removed from future marketing campaigns.</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'order') {
            const confirmToken = Buffer.from(JSON.stringify({ cId, email, action: 'confirm', t: Date.now() })).toString('base64');
            const cancelToken = Buffer.from(JSON.stringify({ cId, email, action: 'cancel', t: Date.now() })).toString('base64');

            const confirmUrl = `${protocol}://${host}/.netlify/functions/aiMailCampaignAction?token=${confirmToken}&action=confirm`;
            const cancelUrl = `${protocol}://${host}/.netlify/functions/aiMailCampaignAction?token=${cancelToken}&action=cancel`;

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Confirm Your Order</h2>
                            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">You selected <strong>${escapeHtml(campData.businessName)}</strong> for <strong>₹${escapeHtml(String(campData.price || 0))}</strong>.</p>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <a href="${confirmUrl}" style="background: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px; border: 1px solid #000;">Confirm Order</a>
                                <a href="${cancelUrl}" style="background: #fff; color: #000; padding: 14px 28px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px; border: 1px solid #000;">Cancel</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'confirm') {
            const orderRefId = `ORD_${cId}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const existingOrder = await db.collection('ai_mail_orders').doc(orderRefId).get();

            if (!existingOrder.exists) {
                await db.collection('ai_mail_orders').doc(orderRefId).set({
                    orderId: orderRefId,
                    campaignId: cId,
                    sellerId: campData.userId || 'unknown',
                    productName: campData.businessName,
                    price: campData.price || 0,
                    customerEmail: email,
                    status: 'confirmed',
                    createdAt: new Date().toISOString()
                });

                await db.collection('ai_mail_campaign_events').add({
                    campaignId: cId,
                    recipientEmail: email,
                    status: 'order_confirmed',
                    timestamp: new Date().toISOString()
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Order Confirmed!</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Thank you. Your order enquiry has been successfully transmitted to the merchant.</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'cancel') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Request Cancelled</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Your order request has been cancelled successfully.</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

    } catch (error) {
        console.error("AI Mail Campaign Action Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Server error processing action.</h2></body></html>`
        };
    }
};
