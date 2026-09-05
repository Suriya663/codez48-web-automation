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
        console.error('Firebase Admin Init Failure:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    const { token, action } = event.queryStringParameters || {};

    if (!token || !['accept', 'reject'].includes(action)) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Invalid or missing collaboration token.</h2></body></html>`
        };
    }

    if (!initAdmin() || !db) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Database connection error.</h2></body></html>`
        };
    }

    try {
        const reqQuery = db.collection('collaboration_requests').where('collabToken', '==', token);
        const snap = await reqQuery.get();

        if (snap.empty) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Collaboration request not found or token expired.</h2></body></html>`
            };
        }

        const reqDoc = snap.docs[0];
        const reqData = reqDoc.data();

        if (reqData.status !== 'pending') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>This collaboration request has already been ${reqData.status}.</h2></body></html>`
            };
        }

        // Fetch sender and receiver brand info
        const [senderSnap, receiverSnap] = await Promise.all([
            db.collection('sellers').doc(reqData.senderUserId).get(),
            db.collection('sellers').doc(reqData.receiverUserId).get()
        ]);

        const senderData = senderSnap.exists ? senderSnap.data() : {};
        const receiverData = receiverSnap.exists ? receiverSnap.data() : {};

        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        if (action === 'accept') {
            await reqDoc.ref.update({ status: 'accepted', acceptedAt: new Date().toISOString() });

            // Create permanent partnership relationship
            const collabId = `PARTNER_${reqData.senderUserId}_${reqData.receiverUserId}`;
            await db.collection('collaborations').doc(collabId).set({
                collabId,
                sellerA: reqData.senderUserId,
                sellerB: reqData.receiverUserId,
                status: 'active',
                createdAt: new Date().toISOString()
            });

            // Trigger COLLABORATION_ACCEPTED email to sender
            try {
                await fetch(`${protocol}://${host}/.netlify/functions/collabAccepted`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'COLLABORATION_ACCEPTED',
                        senderEmail: senderData.email,
                        senderBrand: senderData.brand || senderData.username || 'Partner',
                        receiverBrand: receiverData.brand || receiverData.username || 'Receiver'
                    })
                });
            } catch (e) {}

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Collaboration Accepted</h2>
                            <p style="font-size: 14px; line-height: 1.6;">You have successfully accepted the collaboration request from <strong>${escapeHtml(senderData.brand || 'Partner')}</strong>. The partnership is now active.</p>
                            <a href="https://codez48.netlify.app/#public-profile" style="display: inline-block; margin-top: 20px; background: #000; color: #fff; padding: 12px 28px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px;">Go to Dashboard</a>
                        </div>
                    </body>
                    </html>
                `
            };
        } else {
            await reqDoc.ref.update({ status: 'rejected', rejectedAt: new Date().toISOString() });

            // Trigger COLLABORATION_REJECTED email to sender
            try {
                await fetch(`${protocol}://${host}/.netlify/functions/collabRejected`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'COLLABORATION_REJECTED',
                        senderEmail: senderData.email,
                        senderBrand: senderData.brand || senderData.username || 'Partner',
                        receiverBrand: receiverData.brand || receiverData.username || 'Receiver'
                    })
                });
            } catch (e) {}

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Collaboration Declined</h2>
                            <p style="font-size: 14px; line-height: 1.6;">You have declined the collaboration request.</p>
                            <a href="https://codez48.netlify.app/" style="display: inline-block; margin-top: 20px; background: #000; color: #fff; padding: 12px 28px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px;">Return Home</a>
                        </div>
                    </body>
                    </html>
                `
            };
        }
    } catch (error) {
        console.error("Process Collab Action Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Server error processing action.</h2></body></html>`
        };
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};
