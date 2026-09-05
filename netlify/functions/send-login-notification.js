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

        // Handle Developer Payout Request Email Alerts (Sent to Developer Admin + Requesting User with 24h Guarantee)
        if (action === 'DEVELOPER_PAYOUT_REQUEST_ALERT') {
            const targetEmail = data.email || data.userEmail || notificationEmail;
            const name = data.name || userName || 'Developer Partner';
            const mobileNumber = data.mobile || 'N/A';
            const upiId = data.upiId || 'N/A';
            const amount = data.amount || 0;

            // Email 1: To Developer Admin (rajnaga75556@gmail.com)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
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

            // Email 1: To Developer (rajnaga75556@gmail.com)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
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
            const mobileNumber = data.mobileNumber || 'N/A';
            const paidAmount = data.paidAmount || '₹2,500';

            // Email 1: To Seller (Credentials & Homepage Login Instructions)
            if (sellerEmail && sellerEmail.includes('@')) {
                await transporter.sendMail({
                    from: smtpFrom,
                    to: sellerEmail,
                    subject: `Welcome to CODEZ48 - Your Merchant Node Credentials`,
                    html: `
                        <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; color: #000000; border: 2px solid #000000; max-width: 560px; margin: 0 auto;">
                            <div style="text-align: center; margin-bottom: 24px; border-b: 2px solid #000000; padding-bottom: 16px;">
                                <img src="${OFFICIAL_LOGO_URL}" style="height: 55px; width: auto; margin-bottom: 12px;" alt="CODEZ48 Logo" />
                                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: #000000; text-transform: uppercase;">Welcome to CODEZ48</h2>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; color: #000000; text-transform: uppercase;">Merchant Registration Confirmed</p>
                            </div>

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
                                    <td style="padding: 12px 0; font-weight: 700; color: #000000;">${escapeHtml(planName.toUpperCase())} (${escapeHtml(String(paidAmount))})</td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin-bottom: 24px;">
                                <a href="https://codez48.netlify.app/" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; padding: 14px 32px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                    Login On Home Page →
                                </a>
                            </div>
                        </div>
                    `
                });
            }

            // Email 2: To Developer (codez48@codez48.netlify.app / rajnaga75556@gmail.com)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
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

            // Email 2: To Developer (rajnaga75556@gmail.com)
            await transporter.sendMail({
                from: smtpFrom,
                to: DEVELOPER_EMAIL,
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
