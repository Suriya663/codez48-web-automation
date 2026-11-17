const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        let serviceAccount = null;

        if (saVar) {
            try {
                let rawData = saVar.trim();
                if ((rawData.startsWith('"') && rawData.endsWith('"')) || (rawData.startsWith("'") && rawData.endsWith("'"))) {
                    rawData = rawData.substring(1, rawData.length - 1);
                }
                serviceAccount = JSON.parse(rawData);
            } catch (_) {}
        }

        if (serviceAccount && serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            if (admin.apps.length === 0) {
                admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            }
            db = admin.firestore();
            isInitialized = true;
            return true;
        } else if (admin.apps.length === 0) {
            try {
                admin.initializeApp();
                db = admin.firestore();
                isInitialized = true;
                return true;
            } catch (_) {
                return false;
            }
        } else {
            db = admin.firestore();
            isInitialized = true;
            return true;
        }
    } catch (e) {
        console.warn('Firebase Admin Init Fallback in mobile-otp-auth:', e.message);
        try {
            if (admin.apps.length === 0) admin.initializeApp();
            db = admin.firestore();
            isInitialized = true;
            return true;
        } catch (_) {
            return false;
        }
    }
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
    },
    body: JSON.stringify(data)
});

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return jsonResponse(204, {});
    }

    if (event.httpMethod !== "POST") {
        return jsonResponse(405, { success: false, error: "Method Not Allowed" });
    }

    if (!initAdmin() || !db) {
        return jsonResponse(500, { success: false, error: "Firebase Database Connection Failed" });
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action = 'SEND_OTP', email, otp } = body;

        if (!email || !email.includes('@')) {
            return jsonResponse(400, { success: false, error: "Valid email address is required." });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. ACTION: SEND_OTP
        if (action === 'SEND_OTP') {
            const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

            // Store in Firestore
            await db.collection('mobile_auth_otps').doc(normalizedEmail).set({
                email: normalizedEmail,
                otp: generatedOtp,
                createdAt: new Date().toISOString(),
                expiresAt,
                verified: false
            });

            // Send Email via Codez48 Mailer
            const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
            const smtpPort = Number(process.env.SMTP_PORT) || 587;
            const smtpUser = process.env.SMTP_USER || 'codez4848@gmail.com';
            const smtpPass = process.env.SMTP_PASS;
            const smtpFrom = process.env.SMTP_FROM || `"Codez48 Security" <${smtpUser}>`;

            let emailSent = false;
            let mailError = null;

            if (smtpPass) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpPort === 465,
                        auth: { user: smtpUser, pass: smtpPass }
                    });

                    const htmlContent = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; color: #f8fafc;">
                        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px 24px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Codez48 Mobile App</h1>
                            <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 14px;">Instant OTP Authentication</p>
                        </div>
                        <div style="padding: 32px 24px; text-align: center;">
                            <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px; line-height: 1.5;">
                                Welcome to <strong>Codez48 Pilot Mobile</strong>. Use this 6-digit verification code to connect your account and mobile device.
                            </p>
                            <div style="background: #1e293b; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
                                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: monospace;">${generatedOtp}</span>
                            </div>
                            <p style="color: #64748b; font-size: 13px; margin: 0;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                        </div>
                        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; color: #475569; font-size: 12px;">
                            Official Authentication Sentinel • Codez48 Desktop Pilot & Mobile Automation
                        </div>
                    </div>`;

                    await transporter.sendMail({
                        from: smtpFrom,
                        to: normalizedEmail,
                        subject: `Your Codez48 Access Code: ${generatedOtp}`,
                        html: htmlContent
                    });
                    emailSent = true;
                } catch (err) {
                    console.error('[SMTP ERROR] Failed to send email:', err.message);
                    mailError = err.message;
                }
            } else {
                console.log(`[DEV OTP NOTIFICATION] SMTP credentials not configured in env. OTP for ${normalizedEmail} is: ${generatedOtp}`);
            }

            return jsonResponse(200, {
                success: true,
                message: emailSent ? "OTP sent to your email successfully." : "OTP generated successfully (Recorded in cloud secure vault).",
                email: normalizedEmail,
                emailDelivered: emailSent,
                // In development / testing environment without Netlify SMTP, return code for instant verification
                debugOtp: smtpPass ? undefined : generatedOtp
            });
        }

        // 2. ACTION: VERIFY_OTP
        if (action === 'VERIFY_OTP') {
            if (!otp || String(otp).trim().length !== 6) {
                return jsonResponse(400, { success: false, error: "A 6-digit OTP is required." });
            }

            const otpDoc = await db.collection('mobile_auth_otps').doc(normalizedEmail).get();
            if (!otpDoc.exists) {
                return jsonResponse(400, { success: false, error: "No OTP request found for this email. Please request a new code." });
            }

            const otpData = otpDoc.data();
            if (Date.now() > otpData.expiresAt) {
                return jsonResponse(400, { success: false, error: "This OTP has expired. Please request a new code." });
            }

            if (String(otpData.otp).trim() !== String(otp).trim()) {
                return jsonResponse(400, { success: false, error: "Invalid OTP code. Please check and try again." });
            }

            // Mark OTP as verified
            await db.collection('mobile_auth_otps').doc(normalizedEmail).update({ verified: true });

            // Look up existing seller/user by email
            let sellerRecord = null;
            let snap = await db.collection('sellers').where('email', '==', normalizedEmail).limit(1).get();
            if (snap.empty) {
                snap = await db.collection('sellers').where('contactEmail', '==', normalizedEmail).limit(1).get();
            }
            if (snap.empty) {
                snap = await db.collection('seller_requests').where('email', '==', normalizedEmail).limit(1).get();
            }

            if (!snap.empty) {
                const doc = snap.docs[0];
                sellerRecord = { id: doc.id, ...doc.data() };
            } else {
                // Auto-create new Seller / CLI User profile
                const randomId = Math.floor(100000 + Math.random() * 900000);
                const newSellerId = `SLR-${randomId}`;
                const newProfile = {
                    sellerId: newSellerId,
                    email: normalizedEmail,
                    brand: normalizedEmail.split('@')[0].toUpperCase(),
                    username: normalizedEmail.split('@')[0],
                    plan: 'FREE_PILOT_TIER',
                    credits: 100,
                    status: 'ACTIVE',
                    linkedMobile: true,
                    createdAt: new Date().toISOString()
                };

                await db.collection('sellers').doc(newSellerId).set(newProfile);
                sellerRecord = newProfile;
            }

            // Ensure active API Key exists
            let apiKey = null;
            const keySnap = await db.collection('api_keys')
                .where('userId', '==', sellerRecord.sellerId || sellerRecord.id)
                .where('status', '==', 'ACTIVE')
                .limit(1)
                .get();

            if (!keySnap.empty) {
                apiKey = keySnap.docs[0].id;
            } else {
                apiKey = 'c48_mob_' + Math.random().toString(36).substring(2, 12);
                await db.collection('api_keys').doc(apiKey).set({
                    keyId: apiKey,
                    userId: sellerRecord.sellerId || sellerRecord.id,
                    email: normalizedEmail,
                    planType: sellerRecord.plan || 'MOBILE_PILOT',
                    tokensRemaining: 150,
                    status: 'ACTIVE',
                    createdAt: new Date().toISOString()
                });
            }

            return jsonResponse(200, {
                success: true,
                message: "OTP Verified successfully! Welcome to Codez48.",
                user: {
                    sellerId: sellerRecord.sellerId || sellerRecord.id,
                    email: normalizedEmail,
                    brand: sellerRecord.brand || sellerRecord.username || 'Codez48 Merchant',
                    plan: sellerRecord.plan || 'FREE_PILOT_TIER',
                    credits: sellerRecord.credits !== undefined ? sellerRecord.credits : 100,
                    apiKey: apiKey,
                    token: 'Bearer_' + apiKey
                }
            });
        }

        return jsonResponse(400, { success: false, error: `Unknown action '${action}'` });

    } catch (err) {
        console.error("mobile-otp-auth error:", err);
        return jsonResponse(500, { success: false, error: "Internal Server Error: " + err.message });
    }
};
