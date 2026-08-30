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
        console.error('Firebase Admin Init Failure in send-login-notification:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const data = JSON.parse(event.body || '{}');
        const { event: eventName = 'LOGIN_SUCCESS', siteId = 'site_001', userName, userEmail, time, loginEventId } = data;

        if (!initAdmin() || !db) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database Connection Failed" })
            };
        }

        // 1. Deduplication Protection
        if (loginEventId) {
            const eventRef = db.collection('mail_events_processed').doc(loginEventId);
            const eventSnap = await eventRef.get();
            if (eventSnap.exists) {
                console.log(`[MAIL NOTIFICATION DUP] Event ${loginEventId} already processed. Skipping SMTP send.`);
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ success: true, message: 'Event already processed' })
                };
            }
        }

        // 2. Fetch saved notification email for current site/user
        const settingsRef = db.collection('mail_automation_settings').doc(siteId);
        const settingsSnap = await settingsRef.get();

        if (!settingsSnap.exists) {
            console.log(`[MAIL NOTIFICATION] No saved mail settings found for site: ${siteId}`);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, message: 'Mail automation settings not configured for this account' })
            };
        }

        const settings = settingsSnap.data();

        if (settings.mailAutomation === false) {
            console.log(`[MAIL NOTIFICATION] Mail automation is disabled for site: ${siteId}`);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, message: 'Mail automation is disabled in settings' })
            };
        }

        const savedReceiverEmail = settings.notificationEmail;
        if (!savedReceiverEmail || !savedReceiverEmail.includes('@')) {
            console.log(`[MAIL NOTIFICATION] Invalid receiver email saved for site: ${siteId}`);
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, message: 'No valid receiver email saved' })
            };
        }

        // 3. Read SMTP Environment Variables
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'Codez48 Alerts <no-reply@codez48.io>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.error('[CRITICAL SMTP CONFIG ERROR] SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in Netlify Settings.');
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    error: "SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in Netlify settings."
                })
            };
        }

        // 4. Configure Nodemailer Transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const formattedTime = time ? new Date(time).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : new Date().toLocaleString();

        const emailSubject = `⚡ New Login Notification - Codez48 Alert`;
        const htmlBody = `
            <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <div style="width: 44px; height: 44px; background-color: #f3e8ff; color: #9333ea; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">⚡</div>
                        <div>
                            <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">Codez48 Alert</h2>
                            <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Automated Security Notification</p>
                        </div>
                    </div>

                    <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #581c87;">A merchant node successfully authenticated on your Codez48 platform.</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 28px;">
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px; width: 35%;">User Identity:</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${userName || 'Merchant User'}</td>
                        </tr>
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">User Email:</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #2563eb;">${userEmail || 'N/A'}</td>
                        </tr>
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Login Timestamp:</td>
                            <td style="padding: 12px 0; font-weight: 600; color: #475569;">${formattedTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Site ID:</td>
                            <td style="padding: 12px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${siteId}</td>
                        </tr>
                    </table>

                    <div style="border-t: 1px solid #e2e8f0; pt-20; text-align: center; margin-top: 24px;">
                        <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600;">Sent via Codez48 Mail Automation Service</p>
                    </div>
                </div>
            </div>
        `;

        // 5. Dispatch Email via Nodemailer
        await transporter.sendMail({
            from: smtpFrom,
            to: savedReceiverEmail,
            subject: emailSubject,
            html: htmlBody
        });

        console.log(`[MAIL NOTIFICATION SENT] Dispatched login notification to ${savedReceiverEmail}`);

        // 6. Record processed loginEventId
        if (loginEventId) {
            await db.collection('mail_events_processed').doc(loginEventId).set({
                siteId,
                receiverEmail: savedReceiverEmail,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                message: 'Login notification email sent successfully',
                recipient: savedReceiverEmail
            })
        };

    } catch (error) {
        console.error("Send Login Notification Error:", error.message);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
