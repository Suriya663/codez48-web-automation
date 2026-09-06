const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
        console.error('Firebase Admin Init Failure in aiMailCampaignQueue:', e.message);
        return false;
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

/**
 * AI Mail Campaign Queue Worker & Scheduled Batch Processor
 * Handles per-email credit deduction and sequential stopping on zero balance.
 */
exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: JSON.stringify({ error: "Database unavailable." }) };
    }

    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { campaignId, userId: incomingUserId } = body;

        let smtpHost = process.env.SMTP_HOST;
        let smtpPort = Number(process.env.SMTP_PORT) || 587;
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;
        let smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Email Commerce <no-reply@codez48.io>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            return { statusCode: 500, body: JSON.stringify({ error: "SMTP configuration missing." }) };
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        const campaignsRef = db.collection('ai_mail_campaigns');
        let queryRef = campaignsRef.where('status', 'in', ['Queued', 'Sending']);
        if (campaignId) {
            queryRef = campaignsRef.where(admin.firestore.FieldPath.documentId(), '==', campaignId);
        }

        const campaignsSnap = await queryRef.get();
        if (campaignsSnap.empty) {
            return { statusCode: 200, body: JSON.stringify({ message: "No active campaigns in queue." }) };
        }

        const batchSize = Number(process.env.SMTP_BATCH_SIZE) || 50;
        const delayMs = Number(process.env.SMTP_DELAY_MS) || 1000;

        let totalSentOverall = 0;

        for (const campDoc of campaignsSnap.docs) {
            const campData = campDoc.data();
            const cId = campDoc.id;
            const userId = campData.userId;

            // Fetch User Wallet
            const walletRef = db.collection('ai_mail_wallets').doc(userId);
            const walletSnap = await walletRef.get();
            let credits = walletSnap.exists ? (walletSnap.data().credits || 0) : 0;

            if (credits <= 0) {
                await campDoc.ref.update({ status: 'Stopped (Insufficient Balance)', stoppedAt: new Date().toISOString() });
                continue;
            }

            await campDoc.ref.update({ status: 'Sending' });

            const contactsSnap = await db.collection('email_contacts')
                .where('suppressed', '==', false)
                .where('unsubscribed', '==', false)
                .where('status', '==', 'active')
                .get();

            const contacts = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const processedRecipients = campData.processedRecipients || [];

            // Get pending recipients for this batch, limited by credits and batch size
            const maxSendable = Math.min(credits, batchSize);
            const pendingContacts = contacts.filter(c => !processedRecipients.includes(c.email)).slice(0, maxSendable);

            if (pendingContacts.length === 0) {
                await campDoc.ref.update({ status: 'Completed', completedAt: new Date().toISOString() });
                continue;
            }

            let sentInThisBatch = 0;
            let failedInThisBatch = 0;

            for (const contact of pendingContacts) {
                // Double check credits before each send
                if (credits <= 0) {
                    await campDoc.ref.update({ status: 'Stopped (Insufficient Balance)', stoppedAt: new Date().toISOString() });
                    break;
                }

                try {
                    const actionToken = Buffer.from(JSON.stringify({
                        cId,
                        email: contact.email,
                        sId: campData.sellerId,
                        pId: campData.productId,
                        t: Date.now()
                    })).toString('base64');

                    const actionUrl = `https://codez48.netlify.app/.netlify/functions/aiMailCampaignAction?token=${actionToken}`;
                    const orderUrl = `${actionUrl}&action=order`;
                    const unsubUrl = `${actionUrl}&action=unsubscribe`;

                    const emailHtml = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
                            <div style="text-align: center; border-bottom: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                                <h2 style="margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; color: #000000;">${escapeHtml(campData.headline || campData.title)}</h2>
                                <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666666; letter-spacing: 1px;">Exclusive Offer from ${escapeHtml(campData.businessName)}</p>
                            </div>

                            ${campData.productImage ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${escapeHtml(campData.productImage)}" style="max-width: 100%; height: auto; border: 1px solid #000000; border-radius: 8px;" alt="Offer Image" /></div>` : ''}

                            <p style="font-size: 14px; font-weight: 400; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                ${escapeHtml(campData.description || '')}
                            </p>

                            <div style="background-color: #fafafa; border: 1px solid #000000; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px 0; font-weight: 700; text-transform: uppercase; font-size: 12px;">Offer Details</p>
                                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800;">${escapeHtml(campData.businessName)}</p>
                                ${campData.price ? `<p style="margin: 0; font-size: 16px; font-weight: 900; color: #047857;">₹${escapeHtml(String(campData.price))}</p>` : ''}
                            </div>

                            <div style="text-align: center; margin-bottom: 32px;">
                                <a href="${orderUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 16px 36px; text-decoration: none; border: 1px solid #000000;">
                                    Order Now
                                </a>
                            </div>

                            <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; text-align: center; font-size: 11px; color: #666666;">
                                <p style="margin: 0 0 8px 0;">You received this email because you are registered in our business directory.</p>
                                <a href="${unsubUrl}" style="color: #000000; text-decoration: underline; font-weight: 600;">Unsubscribe from future campaigns</a>
                            </div>
                        </div>
                    `;

                    await transporter.sendMail({
                        from: smtpFrom,
                        to: contact.email,
                        subject: campData.headline || 'Special Offer from ' + campData.businessName,
                        html: emailHtml
                    });

                    // Successfully sent - Deduct Credit & Update Stats
                    processedRecipients.push(contact.email);
                    sentInThisBatch++;
                    credits--;

                    // Atomic deduction
                    await walletRef.update({ credits: admin.firestore.FieldValue.increment(-1) });

                    await db.collection('ai_mail_campaign_events').add({
                        campaignId: cId,
                        recipientEmail: contact.email,
                        status: 'sent',
                        timestamp: new Date().toISOString()
                    });

                    await new Promise(r => setTimeout(r, delayMs));
                } catch (sendErr) {
                    failedInThisBatch++;
                    await db.collection('ai_mail_campaign_events').add({
                        campaignId: cId,
                        recipientEmail: contact.email,
                        status: 'failed',
                        error: sendErr.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            const newSentCount = (campData.sentCount || 0) + sentInThisBatch;
            const newFailedCount = (campData.failedCount || 0) + failedInThisBatch;
            const isFinished = processedRecipients.length >= contacts.length;

            await campDoc.ref.update({
                processedRecipients,
                sentCount: newSentCount,
                failedCount: newFailedCount,
                status: isFinished ? 'Completed' : (credits <= 0 ? 'Stopped (Insufficient Balance)' : 'Sending')
            });

            totalSentOverall += sentInThisBatch;
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, sent: totalSentOverall })
        };
    } catch (e) {
        console.error("AI Mail Campaign Queue Error:", e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
