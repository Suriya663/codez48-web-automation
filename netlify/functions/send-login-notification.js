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

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const DEVELOPER_EMAILS = ['rajnaga75556@gmail.com', 'codez4848@gmail.com'];
const OFFICIAL_LOGO_URL = 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg';

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
        const {
            action,
            event: eventName = 'LOGIN_SUCCESS',
            siteId = 'site_001',
            userName,
            userEmail,
            notificationEmail,
            time,
            loginEventId,
            headerText = 'Welcome to CODEZ48',
            enableSubHeader = true,
            subHeaderText = 'CODEZ48 Automation & Application Network',
            headerFont = "'Plus Jakarta Sans', sans-serif",
            subHeaderFont = "'Plus Jakarta Sans', sans-serif",
            businessDescription,
            ctaText = 'Contact Us Now',
            ctaUrl = 'https://codez48.netlify.app/about.html',
            ctaBgColor = '#9333ea',
            ctaTextColor = '#ffffff',
            imageUrl,
            imageWidth = '100%',
            imageAlign = 'center',
            imageShape = 'rounded'
        } = data;

        // Read Default SMTP Environment Variables with Request Overrides
        let smtpHost = data.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
        let smtpPort = Number(data.smtpPort || process.env.SMTP_PORT) || 587;
        let smtpUser = data.smtpUser || process.env.SMTP_USER || '';
        let smtpPass = data.smtpPass || process.env.SMTP_PASS || '';

        // Check if custom Pro SMTP credentials exist for this user/siteId
        if (initAdmin() && db && siteId && (!smtpUser || !smtpPass)) {
            try {
                const customSnap = await db.collection('user_custom_smtp').doc(siteId).get();
                if (customSnap.exists) {
                    const cData = customSnap.data();
                    if (cData.customSmtpUser && cData.customSmtpPass) {
                        smtpUser = cData.customSmtpUser;
                        smtpPass = cData.customSmtpPass;
                        if (cData.customSmtpHost) smtpHost = cData.customSmtpHost;
                        if (cData.customSmtpPort) smtpPort = Number(cData.customSmtpPort);
                        console.log(`[PRO CUSTOM SMTP ACTIVE] Using custom verified SMTP for ${siteId}: ${smtpUser}`);
                    }
                }
            } catch (e) {}
        }

        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Alerts <no-reply@codez48.io>';

        // Resilient Transporter: Genuine Nodemailer if credentials present, safe simulated pipeline if missing
        const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
        const transporter = isSmtpConfigured ? nodemailer.createTransport({
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
        }) : {
            sendMail: async (opts) => {
                console.warn('[SMTP SIMULATED] Credentials missing. Delivery simulated for:', opts.to, '| Subject:', opts.subject);
                return { messageId: 'simulated_' + Date.now(), simulated: true };
            },
            verify: async () => true
        };

        // -------------------------------------------------------------------------
        // Handle Mail Automation Studio: TEST_SMTP & Campaign Dispatches
        // -------------------------------------------------------------------------
        if (action === 'TEST_SMTP') {
            const targetEmail = notificationEmail || userEmail || data.toEmail || data.recipient;
            if (!targetEmail || !targetEmail.includes('@')) {
                return {
                    statusCode: 400,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        error: "Invalid or missing recipient email address."
                    })
                };
            }

            // Construct High-Fidelity Responsive HTML Email from Template Payload
            const subjectLine = headerText || "Welcome to CODEZ48";
            const fontStack = headerFont || "'Plus Jakarta Sans', sans-serif";
            const descContent = businessDescription || "Welcome to CODEZ48! You can create your website and Android application in just one minute. Use our tools and automation suite to grow your business.";
            const btnBg = ctaBgColor || '#9333ea';
            const btnColor = ctaTextColor || '#ffffff';
            const btnRadius = data.ctaRadius || '99px';
            const logoUrl = data.headerLogoUrl || OFFICIAL_LOGO_URL;
            const logoWidth = data.headerLogoWidth || '50px';

            let imageHtml = '';
            if (imageUrl && imageUrl.trim()) {
                const imgAlign = imageAlign || 'center';
                const imgWidth = imageWidth || '100%';
                let borderRadius = '16px';
                if (imageShape === 'circle') borderRadius = '50%';
                if (imageShape === 'square') borderRadius = '0px';

                imageHtml = `
                    <div style="text-align: ${imgAlign}; margin: 24px 0;">
                        <img src="${escapeHtml(imageUrl)}" alt="Feature Image" style="max-width: ${escapeHtml(imgWidth)}; width: 100%; border-radius: ${borderRadius}; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); display: inline-block;" />
                    </div>
                `;
            }

            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${escapeHtml(subjectLine)}</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: ${fontStack};">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
                        <tr>
                            <td align="center">
                                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);">
                                    <!-- Header Banner -->
                                    <tr>
                                        <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                                            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height: auto; width: ${escapeHtml(logoWidth)}; margin-bottom: 16px; display: inline-block;" />` : ''}
                                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                                                ${escapeHtml(headerText)}
                                            </h1>
                                            ${enableSubHeader ? `
                                                <p style="margin: 8px 0 0; font-size: 13px; font-weight: 600; color: #7c3aed;">
                                                    ${escapeHtml(subHeaderText)}
                                                </p>
                                            ` : ''}
                                        </td>
                                    </tr>

                                    <!-- Body Content -->
                                    <tr>
                                        <td style="padding: 32px;">
                                            <div style="font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-line;">
                                                ${escapeHtml(descContent)}
                                            </div>

                                            ${imageHtml}

                                            <!-- Call to Action Button -->
                                            <div style="text-align: center; margin: 32px 0 16px 0;">
                                                <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${escapeHtml(btnBg)}; color: ${escapeHtml(btnColor)}; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 36px; border-radius: ${btnRadius}; box-shadow: 0 4px 14px 0 ${escapeHtml(btnBg)}66;">
                                                    ${escapeHtml(ctaText)}
                                                </a>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #0f172a; padding: 24px; text-align: center; font-size: 11px; color: #94a3b8;">
                                            <div style="font-weight: 700; color: #f8fafc; margin-bottom: 4px;">CODEZ48 Technologies & Automation Suite</div>
                                            <p style="margin: 0;">Verified Automated Dispatch • Powered by CODEZ48 Network</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            // If SMTP credentials are missing, provide clear diagnostic & simulation logging
            if (!isSmtpConfigured) {
                console.warn('[SMTP CONFIG NOTICE] SMTP credentials not configured in Netlify settings or request.');

                // Log audit record to Firestore
                if (initAdmin() && db) {
                    try {
                        await db.collection('mail_campaign_deliveries').add({
                            siteId,
                            recipient: targetEmail,
                            action: 'TEST_SMTP',
                            subject: subjectLine,
                            timestamp: new Date().toISOString(),
                            deliveryStatus: 'LOGGED_UNCONFIGURED_SMTP',
                            note: 'SMTP credentials missing in Netlify settings. Add SMTP_USER & SMTP_PASS.'
                        });
                    } catch (e) {}
                }

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: true,
                        simulated: true,
                        warning: "SMTP Credentials Missing in Netlify",
                        message: `Template verified & recorded for ${targetEmail}. To send live emails: Add SMTP_USER and SMTP_PASS (Google 16-character App Password) in Netlify Site Settings > Environment Variables.`,
                        recipient: targetEmail
                    })
                };
            }

            // Attempt live dispatch
            try {
                const sendInfo = await transporter.sendMail({
                    from: smtpFrom,
                    to: targetEmail,
                    subject: subjectLine,
                    html: emailHtml
                });

                console.log(`[SMTP SUCCESS] Mail delivered to ${targetEmail}, messageId: ${sendInfo.messageId}`);

                // Record delivery in Firestore
                if (initAdmin() && db) {
                    try {
                        await db.collection('mail_campaign_deliveries').add({
                            siteId,
                            recipient: targetEmail,
                            action: 'TEST_SMTP',
                            subject: subjectLine,
                            messageId: sendInfo.messageId,
                            timestamp: new Date().toISOString(),
                            deliveryStatus: 'DELIVERED_SUCCESS'
                        });
                    } catch (e) {}
                }

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: true,
                        message: `Email successfully delivered to ${targetEmail}!`,
                        messageId: sendInfo.messageId
                    })
                };
            } catch (sendErr) {
                console.error('[SMTP SEND FAILURE]:', sendErr.message);

                let friendlyMsg = sendErr.message;
                if (sendErr.message.includes('Username and Password not accepted') || sendErr.message.includes('Invalid login') || sendErr.message.includes('EAUTH')) {
                    friendlyMsg = "Gmail authentication rejected: Please use a 16-character Google App Password (not your standard account password) generated at https://myaccount.google.com/apppasswords.";
                } else if (sendErr.message.includes('ETIMEDOUT') || sendErr.message.includes('ECONNREFUSED')) {
                    friendlyMsg = `Connection to ${smtpHost}:${smtpPort} timed out. Ensure port 587 or 465 is open and accessible.`;
                }

                return {
                    statusCode: 502,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: false,
                        errorCode: "SMTP_DELIVERY_FAILED",
                        error: friendlyMsg,
                        rawError: sendErr.message
                    })
                };
            }
        }

        // Handle Developer Payout Request Email Alerts (Sent to Developer Admin + Requesting User with 24h Guarantee)
        // Handle Pilot Subscription & User ID Welcome Email (First-time user & renewal)
        if (action === 'PILOT_SUBSCRIPTION_WELCOME') {
            const targetEmail = data.userEmail || data.email || notificationEmail || 'rajnaga75556@gmail.com';
            const userId = data.userId || 'USR-CDZ48-USER';
            const planName = data.planName || 'Enterprise Plan';
            const credits = data.credits || 700;
            const amountPaid = data.amountPaid || 599;
            const paymentId = data.paymentId || `pay_${Date.now()}`;
            const timeStr = data.time || new Date().toISOString();

            // Record to Firestore pilot_email_logs
            if (initAdmin() && db) {
                try {
                    await db.collection('pilot_email_logs').add({
                        userId,
                        userEmail: targetEmail,
                        action: 'PILOT_SUBSCRIPTION_WELCOME',
                        planName,
                        credits,
                        amountPaid,
                        paymentId,
                        timestamp: timeStr,
                        status: 'RECORDED'
                    });
                } catch (e) {
                    console.error('[FIRESTORE EMAIL LOG ERROR]:', e.message);
                }
            }

            // Attempt email dispatch via SMTP if credentials exist
            let emailSent = false;
            let emailError = null;

            if (smtpHost && smtpUser && smtpPass) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpPort === 465,
                        connectionTimeout: 10000,
                        auth: { user: smtpUser, pass: smtpPass }
                    });

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #090d16; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; color: #f8fafc;">
                            <div style="background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%); padding: 32px 24px; text-align: center;">
                                <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff;">CODEZ48 PILOT</h1>
                                <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Subscription Activated • Official User Credentials</p>
                            </div>
                            
                            <div style="padding: 32px 24px; background: #0f172a;">
                                <h2 style="font-size: 18px; margin-top: 0; color: #ffffff; font-weight: 700;">Welcome to Codez48 Pilot!</h2>
                                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                                    Your payment has been successfully verified, and your monthly subscription has been activated in the system.
                                </p>

                                <div style="background: #020617; border: 1px solid #3b82f6; border-radius: 14px; padding: 18px; margin: 20px 0;">
                                    <div style="font-size: 11px; font-weight: 700; color: #60a5fa; text-transform: uppercase; margin-bottom: 6px;">Your Official User Identifier (UID)</div>
                                    <div style="font-size: 18px; font-family: monospace; font-weight: 800; color: #38bdf8; word-break: break-all;">${escapeHtml(userId)}</div>
                                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Keep this User ID safe. It is required for CLI commands, credit tracking, and plan renewals.</div>
                                </div>

                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0; background: #020617; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
                                    <tr style="border-bottom: 1px solid #1e293b;">
                                        <td style="padding: 12px 16px; color: #64748b;">Associated Email:</td>
                                        <td style="padding: 12px 16px; color: #ffffff; font-weight: 600; text-align: right;">${escapeHtml(targetEmail)}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #1e293b;">
                                        <td style="padding: 12px 16px; color: #64748b;">Activated Plan:</td>
                                        <td style="padding: 12px 16px; color: #38bdf8; font-weight: 700; text-align: right;">${escapeHtml(planName)}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #1e293b;">
                                        <td style="padding: 12px 16px; color: #64748b;">Credits Added:</td>
                                        <td style="padding: 12px 16px; color: #34d399; font-weight: 700; text-align: right;">+${escapeHtml(String(credits))} Credits</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #1e293b;">
                                        <td style="padding: 12px 16px; color: #64748b;">Amount Paid:</td>
                                        <td style="padding: 12px 16px; color: #ffffff; font-weight: 600; text-align: right;">₹${escapeHtml(String(amountPaid))}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 16px; color: #64748b;">Payment / UTR Reference:</td>
                                        <td style="padding: 12px 16px; color: #94a3b8; font-family: monospace; font-size: 11px; text-align: right;">${escapeHtml(paymentId)}</td>
                                    </tr>
                                </table>

                                <div style="background: #1e1b4b; border-left: 4px solid #818cf8; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
                                    <div style="font-size: 12px; font-weight: 700; color: #c7d2fe; margin-bottom: 4px;">Quick CLI Usage:</div>
                                    <div style="font-family: monospace; font-size: 12px; color: #a5b4fc;">codez48 user ${escapeHtml(userId)}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Run this command in your terminal to inspect your active plan and remaining credits.</div>
                                </div>

                                <div style="text-align: center; margin-top: 28px;">
                                    <a href="https://codez48.netlify.app/tools/index.html" style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 28px; border-radius: 10px;">Launch Tools Dashboard</a>
                                </div>
                            </div>
                            
                            <div style="background: #020617; padding: 20px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #475569;">
                                Codez48 Technologies • Razorpay Live Approved Gateway • codez48.netlify.app
                            </div>
                        </div>
                    `;

                    await transporter.sendMail({
                        from: smtpFrom,
                        to: targetEmail,
                        cc: DEVELOPER_EMAILS.join(', '),
                        subject: `🎉 Codez48 Pilot Subscription Activated — User ID: ${userId}`,
                        html: htmlContent
                    });
                    emailSent = true;
                } catch (sendErr) {
                    console.error('[SUBSCRIPTION EMAIL SEND ERROR]:', sendErr.message);
                    emailError = sendErr.message;
                }
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: true,
                    emailSent,
                    userId,
                    userEmail: targetEmail,
                    message: emailSent ? `Credentials successfully emailed to ${targetEmail}` : `Credentials logged to Firestore pilot_email_logs`,
                    error: emailError
                })
            };
        }

        if (action === 'DEVELOPER_PAYOUT_REQUEST_ALERT') {
            const targetEmail = data.email || data.userEmail || notificationEmail;
            const name = data.name || userName || 'Developer Partner';
            const mobileNumber = data.mobile || 'N/A';
            const upiId = data.upiId || 'N/A';
            const amount = data.amount || 0;

            // Email 1: To Developer Admins
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAILS.join(', '),
                subject: `⚡ DEVELOPER PAYOUT REQUEST: ${escapeHtml(name)} (₹${amount})`,
                html: `
                    <div style="font-family: monospace, system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 3px solid #000000; max-width: 580px; margin: 0 auto; box-sizing: border-box;">
                        <div style="text-align: center; border-b: 2px solid #000000; padding-bottom: 20px; margin-bottom: 24px;">
                            <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                            <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #000000;">DEVELOPER PAYOUT WITHDRAWAL REQUEST</h2>
                        </div>

                        <div style="border: 1px solid #000000; padding: 20px; margin-bottom: 24px;">
                            <p style="margin: 0 0 8px 0;">Developer Name: <strong>${escapeHtml(name)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Developer Email: <strong>${escapeHtml(targetEmail)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Mobile Number: <strong>${escapeHtml(mobileNumber)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Payout UPI ID: <strong>${escapeHtml(upiId)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Requested Amount: <strong style="font-size: 18px; color: #000000;">₹${amount}</strong></p>
                            <p style="margin: 0;">Status: <strong>Pending Admin Authorization</strong></p>
                        </div>

                        <div style="text-align: center; border-t: 1px solid #000000; padding-top: 16px; font-size: 10px; font-weight: bold;">
                            CODEZ48 DEVELOPER NETWORK — PAYOUT AUTHORIZATION REQUIRED
                        </div>
                    </div>
                `
            });

            // Email 2: To Requesting User (24-Hour Processing Guarantee)
            if (targetEmail && targetEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: targetEmail,
                    subject: `CODEZ48 Developer Payout Request Received - Processing in 24 Hours`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 580px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px; border-b: 2px solid #000000; padding-bottom: 20px;">
                                <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000000;">Payout Request Confirmed</h2>
                            </div>

                            <p style="font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                Hello ${escapeHtml(name)}, your payout withdrawal request of <strong>₹${amount}</strong> has been received successfully!
                            </p>

                            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 20px; border-radius: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #000000;">
                                <p style="margin: 0 0 6px 0;">Requested Amount: <strong>₹${amount}</strong></p>
                                <p style="margin: 0 0 6px 0;">Target UPI ID: <strong>${escapeHtml(upiId)}</strong></p>
                                <p style="margin: 0;">Processing Timeframe: <strong>Within 24 Hours</strong></p>
                            </div>

                            <p style="font-size: 12px; font-weight: 500; color: #000000; text-align: center; margin-bottom: 24px;">
                                Your requested payout amount of ₹${amount} will be verified and credited to your bank/UPI account (${escapeHtml(upiId)}) within 24 hours.
                            </p>

                            <div style="text-align: center;">
                                <a href="https://codez48.netlify.app/seller/developer.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 16px 36px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                    View Developer Console →
                                </a>
                            </div>
                        </div>
                    `
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Developer payout request emails dispatched successfully!"
                })
            };
        }

        // Handle Merchant Wallet Top-Up Email Notifications (Sent to Developer + Seller)
        if (action === 'WALLET_TOPUP_ALERTS') {
            const sellerEmail = data.sellerEmail || notificationEmail;
            const sellerId = data.sellerId || siteId || 'SLR-000';
            const brandName = data.brandName || userName || 'Merchant Node';
            const mobileNumber = data.mobileNumber || 'N/A';
            const amountPaid = data.amount || 200;
            const paymentId = data.paymentId || 'PAY_' + Date.now();
            const remainingBalance = data.remainingBalance || amountPaid;

            // Email 1: To Developer Admins
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAILS.join(', '),
                subject: `⚡ WALLET RECHARGE ALERT: ${escapeHtml(sellerId)} (₹${amountPaid})`,
                html: `
                    <div style="font-family: monospace, system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 3px solid #000000; max-width: 580px; margin: 0 auto; box-sizing: border-box;">
                        <div style="text-align: center; border-b: 2px solid #000000; padding-bottom: 20px; margin-bottom: 24px;">
                            <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                            <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #000000;">DEVELOPER ALERT: MERCHANT WALLET TOP-UP</h2>
                        </div>

                        <div style="border: 1px solid #000000; padding: 20px; margin-bottom: 24px;">
                            <p style="margin: 0 0 8px 0;">Seller ID: <strong>${escapeHtml(sellerId)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Brand Name: <strong>${escapeHtml(brandName)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Seller Email: <strong>${escapeHtml(sellerEmail)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Mobile Number: <strong>${escapeHtml(mobileNumber)}</strong></p>
                            <p style="margin: 0 0 8px 0;">Recharge Amount: <strong style="font-size: 16px;">₹${amountPaid}</strong></p>
                            <p style="margin: 0 0 8px 0;">Payment ID: <strong>${escapeHtml(paymentId)}</strong></p>
                            <p style="margin: 0;">New Wallet Balance: <strong style="font-size: 16px;">₹${remainingBalance}</strong></p>
                        </div>

                        <div style="text-align: center; border-t: 1px solid #000000; padding-top: 16px; font-size: 10px; font-weight: bold;">
                            CODEZ48 OFFICIAL NETWORK — VERIFIED TOP-UP TRANSACTION
                        </div>
                    </div>
                `
            });

            // Email 2: To Seller / User
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `CODEZ48 Wallet Recharge Confirmed - ₹${amountPaid} Credited`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 580px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px; border-b: 2px solid #000000; padding-bottom: 20px;">
                                <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000000;">Wallet Recharge Confirmed</h2>
                            </div>

                            <p style="font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                Hello ${escapeHtml(brandName)}, your wallet recharge of <strong>₹${amountPaid}</strong> on CODEZ48 was successful and credited to your merchant account.
                            </p>

                            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 20px; border-radius: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #000000;">
                                <p style="margin: 0 0 6px 0;">Seller ID: <strong>${escapeHtml(sellerId)}</strong></p>
                                <p style="margin: 0 0 6px 0;">Amount Credited: <strong>₹${amountPaid}</strong></p>
                                <p style="margin: 0 0 6px 0;">Payment ID: <strong>${escapeHtml(paymentId)}</strong></p>
                                <p style="margin: 0;">Updated Wallet Balance: <strong style="font-size: 16px;">₹${remainingBalance}</strong></p>
                            </div>

                            <div style="text-align: center;">
                                <a href="https://codez48.netlify.app/#public-profile" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 16px 36px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                    View Merchant Wallet & Dashboard →
                                </a>
                            </div>
                        </div>
                    `
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Wallet top-up alert emails dispatched to seller and developer!"
                })
            };
        }

        // Handle Black & White Email Dispatch for Collaboration Token Approval
        if (action === 'SEND_COLLAB_EMAIL') {
            const targetRecipient = data.toEmail || notificationEmail;
            const fromBrand = data.fromBrand || 'Merchant Partner';
            const fromSellerId = data.fromSellerId || 'SLR-000';
            const fromDescription = data.fromDescription || 'Business Network Partner';
            const collabToken = data.collabToken || `collab_${Date.now()}`;

            if (!targetRecipient || !targetRecipient.includes('@')) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Valid recipient email required." })
                };
            }

            const acceptUrl = `https://codez48.netlify.app/#collab-action?token=${collabToken}&action=accept`;
            const declineUrl = `https://codez48.netlify.app/#collab-action?token=${collabToken}&action=decline`;

            await transporter.sendMail({
                from: smtpFrom,
                to: targetRecipient,
                subject: `🤝 Business Collaboration Request - ${fromBrand} (${fromSellerId})`,
                html: `
                    <div style="font-family: monospace, system-ui, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 3px solid #000000; max-width: 580px; margin: 0 auto; box-sizing: border-box;">
                        <div style="text-align: center; border-b: 2px solid #000000; padding-bottom: 20px; margin-bottom: 24px;">
                            <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                            <h2 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000000;">CODEZ48 BUSINESS COLLABORATION REQUEST</h2>
                            <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #000000;">Token ID: ${collabToken}</p>
                        </div>

                        <div style="border: 1px solid #000000; padding: 20px; margin-bottom: 24px;">
                            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">REQUESTER DETAILS:</p>
                            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 900;">Username / Brand: ${escapeHtml(fromBrand)}</p>
                            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold;">Seller ID: ${escapeHtml(fromSellerId)}</p>
                            <p style="margin: 0; font-size: 12px; font-weight: 500; line-height: 1.6;">Nature of Business / Description: ${escapeHtml(fromDescription)}</p>
                        </div>

                        <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; text-align: center;">
                            Click below to accept or decline this business collaboration request:
                        </p>

                        <div style="text-align: center; margin-bottom: 30px;">
                            <a href="${acceptUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 16px 36px; border-radius: 8px; text-decoration: none; margin-right: 10px; border: 2px solid #000000;">
                                [ ACCEPT COLLABORATION ]
                            </a>
                            <a href="${declineUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 14px 30px; border-radius: 8px; text-decoration: none; border: 2px solid #000000;">
                                [ DECLINE / CANCEL ]
                            </a>
                        </div>

                        <div style="border-t: 1px solid #000000; padding-top: 16px; text-align: center; font-size: 10px; font-weight: bold;">
                            CODEZ48 OFFICIAL NETWORK — VERIFIED TOKEN AUTHORIZATION
                        </div>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Black & White collaboration request email sent successfully!",
                    recipient: targetRecipient
                })
            };
        }

        // Handle Collaboration Token Acceptance / Decline via Email Click
        if (action === 'PROCESS_COLLAB_TOKEN') {
            const token = data.collabToken;
            const userAction = data.collabAction; // 'accept' or 'decline'

            if (!token) {
                return { statusCode: 400, body: JSON.stringify({ success: false, error: "Token required." }) };
            }

            if (!initAdmin() || !db) {
                return { statusCode: 500, body: JSON.stringify({ error: "Database unavailable" }) };
            }

            // Find collaboration request by token
            const q = db.collection('collaboration_requests').where('collabToken', '==', token);
            const snap = await q.get();

            if (snap.empty) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ success: false, error: "Invalid or expired collaboration token." })
                };
            }

            const reqDoc = snap.docs[0];
            const reqData = reqDoc.data();

            if (userAction === 'accept') {
                // Activate Collaboration
                await reqDoc.ref.update({ status: 'accepted', activatedAt: admin.firestore.FieldValue.serverTimestamp() });

                const collabId = `PARTNER_${reqData.fromSellerId}_${reqData.toSellerId}`;
                await db.collection('collaborations').doc(collabId).set({
                    collabId,
                    sellerA: reqData.fromSellerId,
                    sellerB: reqData.toSellerId,
                    status: 'active',
                    collabToken: token,
                    activatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: true,
                        status: 'accepted',
                        sellerA: reqData.fromSellerId,
                        sellerB: reqData.toSellerId,
                        message: "🤝 Business Collaboration Accepted & Activated Successfully!"
                    })
                };
            } else {
                await reqDoc.ref.update({ status: 'declined', declinedAt: admin.firestore.FieldValue.serverTimestamp() });
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        success: true,
                        status: 'declined',
                        message: "Collaboration request declined."
                    })
                };
            }
        }

        // Handle Seller Registration Event (Sends credentials to Seller + Alert to Developer)
        if (action === 'SELLER_REGISTRATION_ALERT') {
            const sellerEmail = data.sellerEmail || notificationEmail;
            const sellerId = data.sellerId || 'SLR-000';
            const sellerPassword = data.sellerPassword || 'N/A';
            const planName = data.planName || 'STARTER';
            const brandName = data.brandName || data.userName || 'Merchant Node';
            const username = data.username || sellerId;
            const mobileNumber = data.mobileNumber || 'N/A';
            const paidAmount = data.paidAmount || '₹2,500';
            const isFreeTrial = data.isFreeTrial || false;

            const planExtension = planName.toLowerCase() === 'premium' ? '' : '.codeez';
            const profileUrl = `https://codez48.netlify.app/seller/index.html?s=${username}${planExtension}`;
            const devUrl = `https://codez48.netlify.app/seller/developer.html`;

            const trialMessage = isFreeTrial ?
                '<div style="background-color: #EBF8FF; border-left: 4px solid #3182CE; padding: 12px; margin-bottom: 24px;"><p style="margin: 0; font-size: 13px; color: #2B6CB0; font-weight: 700;">🎁 Special Offer: Your service is FREE for the first month! Access to your Medium plan has been activated without any payment.</p></div>' : '';

            const displayAmount = isFreeTrial ?
                '<span style="text-decoration: line-through; color: #718096; margin-right: 6px;">₹2,500</span> <span style="color: #38A169;">₹0</span>' : escapeHtml(String(paidAmount));

            // Email 1: To Seller (Credentials & Homepage Login Instructions + Invoice)
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `Welcome to CODEZ48 - Your Merchant Node Credentials & Invoice`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 560px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px; border-b: 2px solid #000000; padding-bottom: 16px;">
                                <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #000000; text-transform: uppercase;">Welcome to CODEZ48</h2>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase;">Merchant Registration Confirmed</p>
                            </div>

                            ${trialMessage}

                            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #000000;">
                                    Hello ${escapeHtml(brandName)}, your CODEZ48 Merchant Node has been registered successfully on the ${escapeHtml(planName.toUpperCase())} plan.
                                </p>
                            </div>

                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #000000; margin-bottom: 28px;">
                                <tr style="border-b: 1px solid #000000;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #000000; text-transform: uppercase; font-size: 10px;">Seller ID:</td>
                                    <td style="padding: 12px 0; font-weight: 800; font-family: monospace; color: #000000; font-size: 15px;">${escapeHtml(sellerId)}</td>
                                </tr>
                                <tr style="border-b: 1px solid #000000;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #000000; text-transform: uppercase; font-size: 10px;">Login Password:</td>
                                    <td style="padding: 12px 0; font-weight: 800; font-family: monospace; color: #000000; font-size: 15px;">${escapeHtml(sellerPassword)}</td>
                                </tr>
                                <tr style="border-b: 1px solid #000000;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #000000; text-transform: uppercase; font-size: 10px;">Chosen Plan:</td>
                                    <td style="padding: 12px 0; font-weight: 700; color: #000000;">${escapeHtml(planName.toUpperCase())} (${displayAmount})</td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin-bottom: 24px;">
                                <a href="${profileUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 32px; border-radius: 99px; text-decoration: none; border: 2px solid #000000; margin-bottom: 12px; width: 80%; max-width: 300px;">
                                    Go to Profile Page →
                                </a>
                            </div>

                            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; margin-bottom: 32px; text-align: center;">
                                <p style="margin: 0 0 12px 0; font-size: 12px; color: #475569; font-weight: 600;">To add and manage your products, please access the Product Addition Portal.</p>
                                <a href="${devUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 10px 24px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                    Add Products / Admin Login
                                </a>
                            </div>

                            <!-- INVOICE SECTION -->
                            <div style="border-top: 2px dashed #cbd5e1; padding-top: 24px; margin-top: 32px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                                    <div>
                                        <img src="${OFFICIAL_LOGO_URL}" style="height: 30px; width: auto; margin-bottom: 8px;" alt="CODEZ48 Logo" />
                                        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">CODEZ48 Network</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <h3 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #000000; letter-spacing: 2px;">INVOICE</h3>
                                        <div style="font-size: 10px; color: #64748b; font-family: monospace;">INV-${Math.floor(100000 + Math.random() * 900000)}</div>
                                        <div style="font-size: 10px; color: #64748b;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    </div>
                                </div>

                                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #000000; background-color: #f8fafc;">
                                            <th style="padding: 10px; text-align: left; text-transform: uppercase; font-size: 10px;">Description</th>
                                            <th style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 10px;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">CODEZ48 ${escapeHtml(planName.toUpperCase())} Plan Subscription<br><span style="font-size: 10px; color: #64748b; font-weight: 400;">Activation of Merchant Node (${escapeHtml(sellerId)})</span></td>
                                            <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; font-family: monospace;">${isFreeTrial ? '₹0.00' : escapeHtml(String(paidAmount))}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td style="padding: 12px 10px; text-align: right; font-weight: 800; font-size: 14px; text-transform: uppercase;">Total Paid:</td>
                                            <td style="padding: 12px 10px; text-align: right; font-weight: 900; font-size: 16px; color: #38A169;">${isFreeTrial ? '₹0.00' : escapeHtml(String(paidAmount))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <p style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px;">This is a computer-generated invoice and does not require a signature.</p>
                            </div>
                        </div>
                    `
                });
            }

            // Email 2: To Developer Admins
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAILS.join(', '),
                subject: `⚡ NEW MERCHANT REGISTRATION: ${escapeHtml(sellerId)} (${escapeHtml(planName.toUpperCase())})`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #ffffff; color: #000000; border: 2px solid #000000; border-radius: 20px;">
                        <img src="${OFFICIAL_LOGO_URL}" style="height: 50px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                        <h2 style="color: #000000; margin: 0 0 10px 0; text-transform: uppercase;">⚡ New Merchant Node Registered</h2>
                        <p style="color: #000000; font-size: 13px;">A new merchant completed registration & payment on CODEZ48 platform:</p>
                        <ul style="line-height: 2; font-family: monospace; font-size: 13px; color: #000000;">
                            <li><strong>Brand/Name:</strong> ${escapeHtml(brandName)}</li>
                            <li><strong>Seller Email:</strong> ${escapeHtml(sellerEmail)}</li>
                            <li><strong>Mobile Number:</strong> ${escapeHtml(mobileNumber)}</li>
                            <li><strong>Seller ID:</strong> ${escapeHtml(sellerId)}</li>
                            <li><strong>Password:</strong> ${escapeHtml(sellerPassword)}</li>
                            <li><strong>Plan Selected:</strong> ${escapeHtml(planName.toUpperCase())} (${escapeHtml(String(paidAmount))})</li>
                            <li><strong>Payment ID:</strong> ${escapeHtml(data.paymentId || 'N/A')}</li>
                            <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Seller registration emails dispatched to seller and developer!"
                })
            };
        }

        // Handle Merchant Login Event (Sends confirmation to User + Alert to Developer)
        if (action === 'LOGIN_CONFIRMATION_ALERT') {
            const sellerEmail = userEmail || notificationEmail;
            const sellerId = data.sellerId || siteId || 'SLR-000';
            const brandName = data.brandName || userName || 'Merchant Node';

            // Email 1: To User (Login Confirmation)
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `Welcome Back to CODEZ48 - Login Confirmed`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 540px; margin: 0 auto;">
                            <img src="${OFFICIAL_LOGO_URL}" style="height: 50px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                            <h2 style="color: #000000; margin: 0 0 10px 0; text-transform: uppercase;">Welcome Back, ${escapeHtml(brandName)}!</h2>
                            <p style="font-size: 13px; color: #000000;">Your login to CODEZ48 Merchant Platform was successful.</p>
                            <p style="font-size: 12px; color: #000000; font-family: monospace;">Seller ID: <strong>${escapeHtml(sellerId)}</strong> | Login Time: <strong>${new Date().toLocaleString()}</strong></p>
                        </div>
                    `
                });
            }

            // Email 2: To Developer Admins
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAILS.join(', '),
                subject: `⚡ MERCHANT LOGIN EVENT: ${escapeHtml(sellerId)} (${escapeHtml(brandName)})`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #ffffff; color: #000000; border: 2px solid #000000; border-radius: 20px;">
                        <img src="${OFFICIAL_LOGO_URL}" style="height: 50px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                        <h2 style="color: #000000; margin: 0 0 10px 0; text-transform: uppercase;">⚡ Merchant Login Activity Alert</h2>
                        <ul style="line-height: 2; font-family: monospace; font-size: 13px; color: #000000;">
                            <li><strong>Seller Brand:</strong> ${escapeHtml(brandName)}</li>
                            <li><strong>Seller ID:</strong> ${escapeHtml(sellerId)}</li>
                            <li><strong>Seller Email:</strong> ${escapeHtml(sellerEmail)}</li>
                            <li><strong>Login Timestamp:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Login confirmation dispatched to seller and developer!"
                })
            };
        }

        // Handle Insufficient Wallet Balance Alert Email
        if (action === 'INSUFFICIENT_WALLET_ALERT') {
            const sellerEmail = notificationEmail || userEmail;
            const sellerId = data.sellerId || siteId || 'SLR-000';
            const brandName = data.brandName || userName || 'Merchant';
            const walletBalance = data.walletBalance || 0;
            const dailyFee = data.dailyFee || 83;

            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `⚠️ Action Required: Your CODEZ48 Website is Inactive (Insufficient Wallet Balance)`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 580px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px; border-b: 2px solid #000000; padding-bottom: 16px;">
                                <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #000000; text-transform: uppercase;">Website Temporarily Paused</h2>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase;">Insufficient Wallet Balance Notice</p>
                            </div>

                            <p style="font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                Hello ${escapeHtml(brandName)}, your website has been temporarily paused because your wallet balance (<strong>₹${walletBalance}</strong>) is below the required daily activation fee (<strong>₹${dailyFee}</strong>).
                            </p>

                            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 20px; border-radius: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #000000;">
                                <p style="margin: 0 0 6px 0;">Seller ID: <strong>${escapeHtml(sellerId)}</strong></p>
                                <p style="margin: 0 0 6px 0;">Current Wallet Balance: <strong>₹${walletBalance}</strong></p>
                                <p style="margin: 0;">Daily Plan Fee: <strong>₹${dailyFee} / Day</strong></p>
                            </div>

                            <div style="text-align: center;">
                                <a href="https://codez48.netlify.app/api-keys.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 16px 36px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                    Recharge Wallet & Activate Website Now →
                                </a>
                            </div>
                        </div>
                    `
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Insufficient wallet alert email dispatched successfully!"
                })
            };
        }

        // Handle New Order Notification (Sent to Developer + Seller)
        if (action === 'NEW_ORDER_NOTIFICATION') {
            const sellerEmail = data.sellerEmail;
            const sellerId = data.sellerId || 'SLR-000';
            const brandName = data.brandName || 'Merchant Node';
            const orderId = data.orderId;
            const total = data.total;
            const customerName = data.customerName;
            const customerEmail = data.customerEmail;
            const customerPhone = data.customerPhone;
            const items = data.items;
            const method = data.paymentMethod;

            const orderHtml = `
                <div style="font-family: monospace, system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 3px solid #000000; max-width: 580px; margin: 0 auto; box-sizing: border-box;">
                    <div style="text-align: center; border-b: 2px solid #000000; padding-bottom: 20px; margin-bottom: 24px;">
                        <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                        <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; color: #000000;">NEW ORDER RECEIVED</h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; color: #666;">Order ID: ${orderId}</p>
                    </div>

                    <div style="border: 1px solid #000000; padding: 20px; margin-bottom: 24px; line-height: 1.6;">
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Merchant: <strong>${escapeHtml(brandName)} (${sellerId})</strong></p>
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Customer: <strong>${escapeHtml(customerName)}</strong></p>
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Email: <strong>${escapeHtml(customerEmail)}</strong></p>
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Phone: <strong>${escapeHtml(customerPhone)}</strong></p>
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Items: <strong>${escapeHtml(items)}</strong></p>
                        <p style="margin: 0 0 8px 0; font-size: 13px;">Payment Method: <strong>${escapeHtml(method)}</strong></p>
                        <p style="margin: 0; font-size: 18px; font-weight: 900;">Total: ₹${total}</p>
                    </div>

                    <div style="text-align: center; border-t: 1px solid #000000; padding-top: 16px; font-size: 10px; font-weight: bold;">
                        CODEZ48 OFFICIAL NETWORK — TRANSACTIONAL ALERT
                    </div>
                </div>
            `;

            // Email 1: To Developer Admins
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAILS.join(', '),
                subject: `🛒 NEW ORDER: ${escapeHtml(sellerId)} - ₹${total}`,
                html: orderHtml
            });

            // Email 2: To Seller
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `New Order Enquiry Received from Your CODEZ48 Website`,
                    html: orderHtml
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ success: true, message: "Order notification emails dispatched to seller and developer!" })
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: 'Event processed' })
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
