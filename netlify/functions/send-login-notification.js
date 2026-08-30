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
        const { action, event: eventName = 'LOGIN_SUCCESS', siteId = 'site_001', userName, userEmail, notificationEmail, time, loginEventId } = data;

        // 1. Read SMTP Environment Variables
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'Codez48 Alerts <no-reply@codez48.io>';

        console.log(`[SMTP DIAGNOSTICS] HOST: ${Boolean(smtpHost)} | PORT: ${smtpPort} | USER: ${Boolean(smtpUser)} | PASS: ${Boolean(smtpPass)} | FROM: ${Boolean(smtpFrom)}`);

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.error('[CRITICAL SMTP CONFIG ERROR] SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in Netlify Settings.');
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    errorCode: "SMTP_CONFIG_MISSING",
                    error: "SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing in Netlify settings."
                })
            };
        }

        // Configure Nodemailer Transporter
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // Verify SMTP connection
        try {
            await transporter.verify();
            console.log('[SMTP TRANSPORTER VERIFIED] Credentials and connection valid.');
        } catch (verifyErr) {
            console.error('[SMTP VERIFY FAILURE]:', verifyErr.message);
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: false,
                    errorCode: "SMTP_CONNECTION_FAILED",
                    error: `SMTP Authentication or Connection Failed: ${verifyErr.message}`
                })
            };
        }

        // Handle Direct TEST_SMTP Request
        if (action === 'TEST_SMTP') {
            const targetRecipient = notificationEmail || smtpUser;
            if (!targetRecipient || !targetRecipient.includes('@')) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Valid recipient email required for test." })
                };
            }

            const testImageUrl = data.imageUrl ? String(data.imageUrl).replace(/"/g, '&quot;') : '';
            const testImageHtml = testImageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${testImageUrl}" style="max-width: 100%; border-radius: 16px; margin: 0 auto; display: block;" /></div>` : '';

            await transporter.sendMail({
                from: smtpFrom,
                to: targetRecipient,
                subject: `Welcome to CodezParty8`,
                html: `
                    <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="width: 50px; height: 50px; background-color: #f3e8ff; color: #9333ea; border-radius: 16px; display: inline-flex; items-center; justify-content: center; font-weight: bold; font-size: 24px; margin-bottom: 12px;">⚡</div>
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Welcome to CODZ48</h2>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.1em;">CodezParty8 Automation Network</p>
                            </div>

                            ${testImageHtml}

                            <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #581c87; line-height: 1.6;">
                                    Welcome to CODZ48! You can create your website and Android application in just one minute.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #6b21a8; line-height: 1.5;">
                                    Our platform offers powerful automation tools, website tracking, push notifications, and business growth features.
                                </p>
                            </div>

                            <div style="text-align: center; margin-bottom: 28px;">
                                <a href="https://codez48.netlify.app/" style="display: inline-block; background-color: #9333ea; color: #ffffff; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 32px; border-radius: 99px; text-decoration: none; box-shadow: 0 10px 20px rgba(147, 51, 234, 0.25);">
                                    Create Website & Android App Now <i style="font-style: normal; margin-left: 6px;">→</i>
                                </a>
                            </div>

                            <div style="border-t: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600;">SMTP Transport Verified for CodezParty8 Mail Automation</p>
                            </div>
                        </div>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Test SMTP Email dispatched successfully!",
                    recipient: targetRecipient
                })
            };
        }

        if (!initAdmin() || !db) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database Connection Failed" })
            };
        }

        // Deduplication Protection for Login Events
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

        // Fetch saved notification email for current site/user
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

        const formattedTime = time ? new Date(time).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : new Date().toLocaleString();

        const escapeHtml = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        };

        const safeUserName = escapeHtml(userName || 'Merchant User');
        const safeUserEmail = escapeHtml(userEmail || 'N/A');
        const safeSiteId = escapeHtml(siteId);

        const safeImageUrl = data.imageUrl ? escapeHtml(data.imageUrl) : '';
        const imageHtml = safeImageUrl ? `<div style="text-align: center; margin: 20px 0;"><img src="${safeImageUrl}" style="max-width: 100%; border-radius: 16px; margin: 0 auto; display: block;" /></div>` : '';

        const customBodyText = data.businessDescription ? escapeHtml(data.businessDescription) : 'Welcome to CODZ48! You can create your website and Android application in just one minute. Use our tools and automation suite to grow your business.';

        const emailSubject = `Welcome to CodezParty8`;
        const htmlBody = `
            <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="width: 50px; height: 50px; background-color: #f3e8ff; color: #9333ea; border-radius: 16px; display: inline-flex; items-center; justify-content: center; font-weight: bold; font-size: 24px; margin-bottom: 12px;">⚡</div>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Welcome to CODZ48</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.1em;">CodezParty8 Automation Network</p>
                    </div>

                    ${imageHtml}

                    <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; color: #581c87; font-weight: 700; line-height: 1.6;">
                            ${customBodyText}
                        </p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 28px;">
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px; width: 35%;">User Identity:</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #0f172a;">${safeUserName}</td>
                        </tr>
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">User Email:</td>
                            <td style="padding: 12px 0; font-weight: 700; color: #2563eb;">${safeUserEmail}</td>
                        </tr>
                        <tr style="border-b: 1px solid #f1f5f9;">
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Login Timestamp:</td>
                            <td style="padding: 12px 0; font-weight: 600; color: #475569;">${formattedTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Site ID:</td>
                            <td style="padding: 12px 0; font-weight: 700; font-family: monospace; color: #0f172a;">${safeSiteId}</td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="https://codez48.netlify.app/" style="display: inline-block; background-color: #9333ea; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 12px 28px; border-radius: 99px; text-decoration: none; box-shadow: 0 8px 16px rgba(147, 51, 234, 0.2);">
                            Launch Platform & Build App →
                        </a>
                    </div>

                    <div style="border-t: 1px solid #e2e8f0; pt-20; text-align: center; margin-top: 24px;">
                        <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600;">Sent via Codez48 Mail Automation Service</p>
                    </div>
                </div>
            </div>
        `;

        // Dispatch Email via Nodemailer
        await transporter.sendMail({
            from: smtpFrom,
            to: savedReceiverEmail,
            subject: emailSubject,
            html: htmlBody
        });

        console.log(`[MAIL NOTIFICATION SENT] Dispatched login notification to ${savedReceiverEmail}`);

        // Record processed loginEventId
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
