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

const DEVELOPER_EMAIL = 'rajnaga75556@gmail.com';

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

        // Read Default SMTP Environment Variables
        let smtpHost = process.env.SMTP_HOST;
        let smtpPort = Number(process.env.SMTP_PORT) || 587;
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;

        // Check if custom Pro SMTP credentials exist for this user/siteId
        if (initAdmin() && db && siteId) {
            try {
                const customSnap = await db.collection('user_custom_smtp').doc(siteId).get();
                if (customSnap.exists) {
                    const cData = customSnap.data();
                    if (cData.customSmtpUser && cData.customSmtpPass) {
                        smtpUser = cData.customSmtpUser;
                        smtpPass = cData.customSmtpPass;
                        console.log(`[PRO CUSTOM SMTP ACTIVE] Using custom verified SMTP for ${siteId}: ${smtpUser}`);
                    }
                }
            } catch (e) {}
        }

        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Alerts <no-reply@codez48.io>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.error('[CRITICAL SMTP CONFIG ERROR] SMTP environment variables are missing in Netlify Settings.');
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

        // Verify SMTP Connection
        try {
            await transporter.verify();
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

        // Handle Security OTP Email Generation for Custom Pro SMTP Setup
        if (action === 'SEND_OTP') {
            const targetRecipient = notificationEmail;
            if (!targetRecipient || !targetRecipient.includes('@')) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Valid email address required to receive OTP." })
                };
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            if (initAdmin() && db) {
                await db.collection('mail_otp_codes').doc(targetRecipient.toLowerCase()).set({
                    otpCode,
                    siteId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            await transporter.sendMail({
                from: smtpFrom,
                to: targetRecipient,
                subject: `🔒 Security Verification OTP Code - CODEZ48 Pro API`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #faf5ff; border-radius: 20px; border: 1px solid #e9d5ff;">
                        <h2 style="color: #9333ea; margin: 0 0 10px 0;">Pro API Credentials Verification</h2>
                        <p style="color: #4c1d95; font-size: 14px;">Your 6-digit security OTP code for configuring custom Pro email credentials on CODEZ48 is:</p>
                        <div style="font-size: 28px; font-weight: 900; color: #9333ea; letter-spacing: 8px; background: #ffffff; padding: 15px 25px; border-radius: 12px; display: inline-block; margin: 15px 0;">${otpCode}</div>
                        <p style="color: #6b21a8; font-size: 12px;">This OTP code expires in 15 minutes. Do not share it with anyone.</p>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Security OTP Code dispatched successfully!",
                    recipient: targetRecipient
                })
            };
        }

        // Handle Security OTP Code Verification
        if (action === 'VERIFY_OTP') {
            const targetRecipient = notificationEmail;
            const inputOtp = data.otpCode ? String(data.otpCode).trim() : '';

            if (!targetRecipient || !inputOtp) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Recipient email and OTP code required." })
                };
            }

            if (!initAdmin() || !db) {
                return { statusCode: 500, body: JSON.stringify({ error: "Database unavailable" }) };
            }

            const otpDoc = await db.collection('mail_otp_codes').doc(targetRecipient.toLowerCase()).get();
            if (!otpDoc.exists || otpDoc.data().otpCode !== inputOtp) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Invalid or expired security OTP code." })
                };
            }

            // Save verified custom Pro SMTP credentials
            if (data.customSmtpUser && data.customSmtpPass) {
                await db.collection('user_custom_smtp').doc(siteId).set({
                    siteId,
                    customSmtpUser: data.customSmtpUser,
                    customSmtpPass: data.customSmtpPass,
                    verifiedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Pro API credentials verified and saved successfully!"
                })
            };
        }

        // Handle Seller Registration Event (Sends credentials to Seller + Alert to Developer)
        if (action === 'SELLER_REGISTRATION_ALERT') {
            const sellerEmail = data.sellerEmail || notificationEmail;
            const sellerId = data.sellerId || 'SLR-000';
            const sellerPassword = data.sellerPassword || 'N/A';
            const planName = data.planName || 'STARTER';
            const brandName = data.brandName || data.userName || 'Merchant Node';
            const mobileNumber = data.mobileNumber || 'N/A';
            const paidAmount = data.paidAmount || '₹2,500';

            // Email 1: To Seller (Credentials & Homepage Login Instructions)
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `Welcome to CODEZ48 - Your Merchant Node Credentials`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #f8fafc; border-radius: 24px; border: 1px solid #e2e8f0; max-width: 560px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="width: 50px; height: 50px; background-color: #f3e8ff; color: #9333ea; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; margin-bottom: 10px;">⚡</div>
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Welcome to CODEZ48</h2>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase;">Merchant Registration Confirmed</p>
                            </div>

                            <div style="background-color: #faf5ff; border-left: 4px solid #9333ea; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #581c87;">
                                    Hello ${escapeHtml(brandName)}, your CODEZ48 Merchant Node has been registered successfully on the ${escapeHtml(planName.toUpperCase())} plan.
                                </p>
                            </div>

                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 28px;">
                                <tr style="border-b: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Seller ID:</td>
                                    <td style="padding: 12px 0; font-weight: 800; font-family: monospace; color: #9333ea; font-size: 15px;">${escapeHtml(sellerId)}</td>
                                </tr>
                                <tr style="border-b: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Login Password:</td>
                                    <td style="padding: 12px 0; font-weight: 800; font-family: monospace; color: #0f172a; font-size: 15px;">${escapeHtml(sellerPassword)}</td>
                                </tr>
                                <tr style="border-b: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 0; font-weight: 800; color: #64748b; text-transform: uppercase; font-size: 10px;">Chosen Plan:</td>
                                    <td style="padding: 12px 0; font-weight: 700; color: #059669;">${escapeHtml(planName.toUpperCase())} (${escapeHtml(String(paidAmount))})</td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin-bottom: 24px;">
                                <a href="https://codez48.netlify.app/" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 32px; border-radius: 99px; text-decoration: none;">
                                    Login On Home Page →
                                </a>
                            </div>
                        </div>
                    `
                });
            }

            // Email 2: To Developer (codez48@codez48.netlify.app)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
                subject: `⚡ NEW MERCHANT REGISTRATION: ${escapeHtml(sellerId)} (${escapeHtml(planName.toUpperCase())})`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #0f172a; color: #ffffff; border-radius: 20px;">
                        <h2 style="color: #a855f7; margin: 0 0 10px 0;">⚡ New Merchant Node Registered</h2>
                        <p style="color: #cbd5e1; font-size: 13px;">A new merchant completed registration & payment on CODEZ48 platform:</p>
                        <ul style="line-height: 2; font-family: monospace; font-size: 13px; color: #38bdf8;">
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

        // Handle Credit / Ad Service Purchase Event
        if (action === 'CREDIT_PURCHASE_ALERT') {
            const sellerEmail = data.sellerEmail || notificationEmail;
            const sellerId = data.sellerId || 'SLR-000';
            const brandName = data.brandName || 'Merchant Node';
            const creditsBought = data.creditsBought || '0';
            const paidAmount = data.paidAmount || '₹0';
            const paymentId = data.paymentId || 'PAY_000';

            // Email 1: To Seller (Receipt)
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `CODEZ48 Service Purchase Receipt - ${creditsBought} Credits`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;">
                            <h2 style="color: #059669; margin: 0 0 10px 0;">Purchase Confirmed!</h2>
                            <p style="font-size: 13px; color: #334155;">Hello ${escapeHtml(brandName)}, your purchase of <strong>${escapeHtml(String(creditsBought))} credits</strong> on CODEZ48 was successful.</p>
                            <p style="font-size: 12px; color: #64748b;">Seller ID: <strong>${escapeHtml(sellerId)}</strong> | Payment ID: <strong>${escapeHtml(paymentId)}</strong> | Amount: <strong>${escapeHtml(String(paidAmount))}</strong></p>
                        </div>
                    `
                });
            }

            // Email 2: To Developer (codez48@codez48.netlify.app)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
                subject: `⚡ NEW SERVICE PURCHASE: ${escapeHtml(sellerId)} (${creditsBought} Credits)`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #0f172a; color: #ffffff; border-radius: 20px;">
                        <h2 style="color: #34d399; margin: 0 0 10px 0;">⚡ New Ad Credit Purchase</h2>
                        <ul style="line-height: 2; font-family: monospace; font-size: 13px; color: #38bdf8;">
                            <li><strong>Seller Brand:</strong> ${escapeHtml(brandName)}</li>
                            <li><strong>Seller ID:</strong> ${escapeHtml(sellerId)}</li>
                            <li><strong>Seller Email:</strong> ${escapeHtml(sellerEmail)}</li>
                            <li><strong>Credits Purchased:</strong> ${escapeHtml(String(creditsBought))}</li>
                            <li><strong>Amount Paid:</strong> ${escapeHtml(String(paidAmount))}</li>
                            <li><strong>Payment ID:</strong> ${escapeHtml(paymentId)}</li>
                        </ul>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Credit purchase receipt & developer alert sent!"
                })
            };
        }

        // Handle User Logout Event (Sends quiet notification to Developer)
        if (action === 'USER_LOGOUT_ALERT') {
            const sellerId = data.sellerId || siteId || 'SLR-000';
            const brandName = data.brandName || userName || 'Merchant Node';
            const sellerEmail = userEmail || notificationEmail || 'N/A';

            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
                subject: `🔒 USER LOGOUT EVENT: ${escapeHtml(sellerId)} (${escapeHtml(brandName)})`,
                html: `
                    <div style="font-family: system-ui, sans-serif; padding: 30px; background-color: #0f172a; color: #ffffff; border-radius: 20px;">
                        <h2 style="color: #38bdf8; margin: 0 0 10px 0;">🔒 User Logout Activity Alert</h2>
                        <ul style="line-height: 2; font-family: monospace; font-size: 13px; color: #cbd5e1;">
                            <li><strong>Seller Brand:</strong> ${escapeHtml(brandName)}</li>
                            <li><strong>Seller ID:</strong> ${escapeHtml(sellerId)}</li>
                            <li><strong>Seller Email:</strong> ${escapeHtml(sellerEmail)}</li>
                            <li><strong>Logout Timestamp:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                `
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "User logout notification sent to developer!"
                })
            };
        }

        // Handle Base64 Data URL Image Attachments for 100% Gmail/Outlook rendering
        const attachments = [];
        let finalLogoUrl = data.headerLogoUrl || '';
        let finalImageUrl = imageUrl || '';

        // Only attach logo if it's a valid custom URL or Base64 data string (not broken static default)
        if (finalLogoUrl.startsWith('data:image/')) {
            attachments.push({
                filename: 'logo.png',
                path: finalLogoUrl,
                cid: 'headerLogo'
            });
            finalLogoUrl = 'cid:headerLogo';
        } else if (finalLogoUrl.includes('/img/logo.png') || finalLogoUrl === 'https://codez48.netlify.app/img/logo.png') {
            finalLogoUrl = ''; // fallback to styled badge
        }

        if (finalImageUrl.startsWith('data:image/')) {
            attachments.push({
                filename: 'hero.png',
                path: finalImageUrl,
                cid: 'heroImage'
            });
            finalImageUrl = 'cid:heroImage';
        }

        // Helper to construct full-width HTML template
        const buildEmailHtml = (recipientEmail) => {
            const safeHeader = escapeHtml(headerText);
            const safeSubHeader = escapeHtml(subHeaderText);
            const safeDesc = escapeHtml(businessDescription || 'Welcome to CODZ48! You can create your website and Android application in just one minute. Use our tools and automation suite to grow your business.');
            const safeCtaText = escapeHtml(ctaText);
            const safeCtaUrl = escapeHtml(ctaUrl);

            const borderRadius = imageShape === 'circle' ? '50%' : imageShape === 'square' ? '0px' : '20px';
            const imgAlignStyle = imageAlign === 'left' ? 'text-align: left;' : imageAlign === 'right' ? 'text-align: right;' : 'text-align: center;';

            const safeImageUrl = finalImageUrl.startsWith('cid:') ? finalImageUrl : escapeHtml(finalImageUrl);
            const imageHtml = safeImageUrl ? `
                <div style="${imgAlignStyle} margin: 24px 0;">
                    <img src="${safeImageUrl}" style="max-width: ${imageWidth}; width: 100%; height: auto; border-radius: ${borderRadius}; display: inline-block; border: 0; box-shadow: 0 10px 20px rgba(0,0,0,0.08);" alt="Hero Banner" />
                </div>` : '';

            const safeLogoUrl = finalLogoUrl.startsWith('cid:') ? finalLogoUrl : escapeHtml(finalLogoUrl);
            const safeLogoWidth = data.headerLogoWidth ? escapeHtml(data.headerLogoWidth) : '50px';

            const logoHtml = (safeLogoUrl && safeLogoUrl.length > 5) ? `
                <div style="text-align: center; margin-bottom: 12px;">
                    <img src="${safeLogoUrl}" style="width: ${safeLogoWidth}; max-width: 150px; height: auto; display: inline-block; object-fit: contain; border-radius: 12px; border: 0;" alt="Logo" />
                </div>` : `
                <div style="width: 52px; height: 52px; background-color: #f3e8ff; color: #9333ea; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 26px; margin: 0 auto 12px auto;">⚡</div>`;

            const subHeaderHtml = enableSubHeader ? `<p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.1em; font-family: ${subHeaderFont};">${safeSubHeader}</p>` : '';

            return `
                <div style="width: 100%; margin: 0; padding: 0; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif;">
                    <div style="width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); box-sizing: border-box;">

                        <!-- Header -->
                        <div style="text-align: center; margin-bottom: 28px;">
                            ${logoHtml}
                            <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; text-transform: uppercase; font-family: ${headerFont}; letter-spacing: -0.02em;">${safeHeader}</h2>
                            ${subHeaderHtml}
                        </div>

                        <!-- Image -->
                        ${imageHtml}

                        <!-- Description Body (Borderless, 100% full width) -->
                        <div style="width: 100%; background-color: #faf5ff; padding: 24px; border-radius: 20px; margin-bottom: 28px; box-sizing: border-box;">
                            <p style="margin: 0; font-size: 14px; color: #4c1d95; font-weight: 600; line-height: 1.7; font-family: 'Plus Jakarta Sans', sans-serif;">
                                ${safeDesc}
                            </p>
                        </div>

                        <!-- Call To Action Button -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="${safeCtaUrl}" style="${(data.ctaPreset === 'outlined') ? `display: inline-block; background-color: transparent; color: ${ctaBgColor}; border: 2px solid ${ctaBgColor}; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 34px; border-radius: ${data.ctaRadius || '99px'}; text-decoration: none;` : `display: inline-block; background-color: ${ctaBgColor}; color: ${ctaTextColor}; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 16px 36px; border-radius: ${data.ctaRadius || '99px'}; text-decoration: none; box-shadow: 0 10px 20px rgba(147, 51, 234, 0.25);`}">
                                ${safeCtaText} <i style="font-style: normal; margin-left: 6px;">→</i>
                            </a>
                        </div>

                        <!-- Official Footer -->
                        <div style="border-t: 1px solid #e2e8f0; padding-top: 24px; text-align: center; margin-top: 28px;">
                            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                                CODEZ48 Official Platform — <a href="https://codez48.netlify.app/about.html" style="color: #9333ea; font-weight: 900; text-decoration: none;">Contact Us Now →</a>
                            </p>
                        </div>
                    </div>
                </div>
            `;
        };

        // Handle Direct TEST_SMTP Request
        if (action === 'TEST_SMTP') {
            const targetRecipient = notificationEmail || smtpUser;
            if (!targetRecipient || !targetRecipient.includes('@')) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ success: false, error: "Valid recipient email required for test." })
                };
            }

            await transporter.sendMail({
                from: smtpFrom,
                to: targetRecipient,
                subject: `Welcome to CODEZ48`,
                html: buildEmailHtml(targetRecipient),
                attachments
            });

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    success: true,
                    message: "Welcome email dispatched successfully!",
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
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ success: true, message: 'Event already processed' })
                };
            }
        }

        // Fetch saved notification email for current site/user (with automatic default fallback)
        let savedReceiverEmail = (notificationEmail && notificationEmail.includes('@')) ? notificationEmail : (userEmail && userEmail.includes('@')) ? userEmail : null;

        try {
            const settingsRef = db.collection('mail_automation_settings').doc(siteId);
            const settingsSnap = await settingsRef.get();

            if (settingsSnap.exists) {
                const settings = settingsSnap.data();
                if (settings.mailAutomation === false) {
                    return {
                        statusCode: 200,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ success: false, message: 'Mail automation is disabled in settings' })
                    };
                }
                if (settings.notificationEmail && settings.notificationEmail.includes('@')) {
                    savedReceiverEmail = settings.notificationEmail;
                }
            }
        } catch (e) {}

        // Fallback to default platform email if no custom receiver saved
        if (!savedReceiverEmail || !savedReceiverEmail.includes('@')) {
            savedReceiverEmail = process.env.SMTP_USER || 'codez4848@gmail.com';
        }

        // Dispatch Email via Nodemailer
        await transporter.sendMail({
            from: smtpFrom,
            to: savedReceiverEmail,
            subject: `Welcome to CODEZ48`,
            html: buildEmailHtml(savedReceiverEmail),
            attachments
        });

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
                message: 'Notification email sent successfully',
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
