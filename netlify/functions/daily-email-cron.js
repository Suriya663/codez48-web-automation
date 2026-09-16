const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getSubscriptionExpiredTemplate, getSubscriptionRenewedTemplate } = require('./subscriptionExpiredTemplate.js');

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
        console.error('Firebase Admin Init Failure in daily-email-cron:', e.message);
        return false;
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

/**
 * NETLIFY SCHEDULED BACKGROUND CRON FUNCTION (0 9 * * *)
 */
exports.handler = async (event, context) => {
    console.log("[DAILY CRON ENGINE] Starting 24-hour background execution...");

    if (!initAdmin() || !db) {
        console.error("[CRON ERROR] Database unavailable.");
        return { statusCode: 500, body: JSON.stringify({ error: "Database Connection Failed" }) };
    }

    try {
        const now = new Date();
        const todayDateStr = now.toISOString().split('T')[0];

        // Configure default SMTP Transporter
        let smtpHost = process.env.SMTP_HOST;
        let smtpPort = Number(process.env.SMTP_PORT) || 587;
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASS;

        const defaultTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Alerts <no-reply@codez48.io>';

        // ----------------------------------------------------
        // 1. PROCESS DAILY EMAIL AUTOMATION CAMPAIGN SCHEDULES
        // ----------------------------------------------------
        const q = db.collection('mail_automation_schedules').where('enableDailyCron', '==', true);
        const snapshot = await q.get();

        if (!snapshot.empty) {
            for (const docSnap of snapshot.docs) {
                const schedule = docSnap.data();
                const { siteId, notificationEmail, recipients = [], templatePayload = {}, activeApiKey, lastCronRunAt } = schedule;

                if (!recipients || recipients.length === 0) continue;

                const lastRun = lastCronRunAt ? new Date(lastCronRunAt.toDate ? lastCronRunAt.toDate() : lastCronRunAt) : new Date(0);
                const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);

                if (hoursSinceLastRun < 20) continue;

                let activeTransporter = defaultTransporter;
                let activeUser = smtpUser;

                if (siteId) {
                    try {
                        const customSnap = await db.collection('user_custom_smtp').doc(siteId).get();
                        if (customSnap.exists) {
                            const cData = customSnap.data();
                            if (cData.customSmtpUser && cData.customSmtpPass) {
                                activeUser = cData.customSmtpUser;
                                activeTransporter = nodemailer.createTransport({
                                    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
                                    auth: { user: cData.customSmtpUser, pass: cData.customSmtpPass }
                                });
                            }
                        }
                    } catch (e) {}
                }

                let allowedLimit = 20;
                if (activeApiKey) {
                    try {
                        const keySnap = await db.collection('api_keys').doc(activeApiKey).get();
                        if (keySnap.exists) {
                            const kData = keySnap.data();
                            if (kData.planType === 'PRO_SUBSCRIPTION') allowedLimit = 60;
                            else allowedLimit = Math.min(20, (kData.tokensRemaining || 10) * 2);
                        }
                    } catch (e) {}
                }

                const sendList = recipients.slice(0, allowedLimit);
                let cronSentCount = 0;

                for (const recipient of sendList) {
                    try {
                        const safeHeader = escapeHtml(templatePayload.headerText || 'Welcome to CODEZ48');
                        const safeDesc = escapeHtml(templatePayload.businessDescription || 'Welcome to CODZ48! You can create your website and Android application in just one minute.');
                        const safeCtaText = escapeHtml(templatePayload.ctaText || 'Contact Us Now');
                        const safeCtaUrl = escapeHtml(templatePayload.ctaUrl || 'https://codez48.netlify.app/api-keys.html');

                        await activeTransporter.sendMail({
                            from: process.env.SMTP_FROM || activeUser,
                            to: recipient,
                            subject: `Daily Update: ${safeHeader}`,
                            html: `
                                <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0;">
                                    <div style="text-align: center; margin-bottom: 20px;">
                                        <h2 style="color: #0f172a; margin: 0;">${safeHeader}</h2>
                                        <p style="color: #9333ea; font-size: 11px; font-weight: bold; text-transform: uppercase;">Daily Automatic Email</p>
                                    </div>
                                    <div style="background-color: #faf5ff; padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                                        <p style="margin: 0; font-size: 14px; color: #4c1d95; line-height: 1.6;">${safeDesc}</p>
                                    </div>
                                    <div style="text-align: center;">
                                        <a href="${safeCtaUrl}" style="display: inline-block; background-color: ${templatePayload.ctaBgColor || '#9333ea'}; color: #ffffff; padding: 12px 28px; border-radius: 99px; font-weight: bold; text-decoration: none; font-size: 12px; text-transform: uppercase;">${safeCtaText} →</a>
                                    </div>
                                </div>
                            `
                        });
                        cronSentCount++;
                    } catch (sendErr) {
                        console.warn(`[DAILY CRON SEND NOTICE] ${recipient}:`, sendErr.message);
                    }
                }

                await db.collection('mail_automation_schedules').doc(docSnap.id).update({
                    lastCronRunAt: admin.firestore.FieldValue.serverTimestamp(),
                    dailySentToday: cronSentCount,
                    totalCronRuns: admin.firestore.FieldValue.increment(1)
                });
            }
        }

        // ----------------------------------------------------
        // 2. PROCESS MONTHLY SUBSCRIPTION RENEWALS (ELITE NODES)
        // ----------------------------------------------------
        const expiredSellersSnap = await db.collection('sellers').where('isSubscribed', '==', true).get();

        for (const sDoc of expiredSellersSnap.docs) {
            const seller = sDoc.data();
            if (!seller.subscriptionExpiresAt) continue;

            const expiry = new Date(seller.subscriptionExpiresAt);
            if (now > expiry) {
                const renewalPrice = 4000;
                const currentWallet = Number(seller.walletBalance) || 0;

                if (currentWallet >= renewalPrice) {
                    const newBalance = currentWallet - renewalPrice;
                    const newExpiry = new Date();
                    newExpiry.setDate(newExpiry.getDate() + 30);

                    await sDoc.ref.update({
                        walletBalance: newBalance,
                        subscriptionExpiresAt: newExpiry.toISOString(),
                        status: 'active', // Ensure status is set back to active on successful renewal
                        lastRenewedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    await db.collection('wallet_transactions').add({
                        sellerId: sDoc.id, type: 'MONTHLY_AUTO_RENEWAL', amount: -renewalPrice,
                        remainingBalance: newBalance, description: `Elite Node Monthly Renewal (₹4,000)`,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    if (seller.email) {
                        await defaultTransporter.sendMail({
                            from: smtpFrom, to: seller.email,
                            subject: `✅ Elite Subscription Renewed Successfully`,
                            html: getSubscriptionRenewedTemplate({ brandName: seller.brand || sDoc.id, type: 'Elite Node Subscription', newExpiryDate: newExpiry, amount: renewalPrice })
                        });
                    }
                } else {
                    await sDoc.ref.update({ status: 'suspended_insufficient_funds', isSubscribed: false });
                    if (seller.email) {
                        await defaultTransporter.sendMail({
                            from: smtpFrom, to: seller.email,
                            subject: `⚠️ Important: Your Elite Subscription has Expired`,
                            html: getSubscriptionExpiredTemplate({ brandName: seller.brand || sDoc.id, type: 'Elite Node Subscription', expiryDate: expiry })
                        });
                    }
                }
            }
        }

        // ----------------------------------------------------
        // 3. PROCESS PRO API KEY RENEWALS
        // ----------------------------------------------------
        const expiredKeysSnap = await db.collection('api_keys').where('planType', '==', 'PRO_SUBSCRIPTION').where('status', '==', 'ACTIVE').get();

        for (const kDoc of expiredKeysSnap.docs) {
            const key = kDoc.data();
            if (!key.expiresAt) continue;

            const expiry = new Date(key.expiresAt);
            if (now > expiry) {
                const renewalPrice = 99;
                const uDoc = await db.collection('sellers').doc(key.userId).get();
                if (!uDoc.exists) continue;

                const user = uDoc.data();
                const currentWallet = Number(user.walletBalance) || 0;

                if (currentWallet >= renewalPrice) {
                    const newBalance = currentWallet - renewalPrice;
                    const newExpiry = new Date();
                    newExpiry.setDate(newExpiry.getDate() + 30);

                    await kDoc.ref.update({
                        expiresAt: newExpiry.toISOString(),
                        status: 'ACTIVE',
                        lastRenewedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    await uDoc.ref.update({ walletBalance: newBalance });

                    await db.collection('wallet_transactions').add({
                        sellerId: key.userId, type: 'PRO_API_AUTO_RENEWAL', amount: -renewalPrice,
                        remainingBalance: newBalance, description: `Pro API Key Monthly Renewal (₹99)`,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    if (user.email) {
                        await defaultTransporter.sendMail({
                            from: smtpFrom, to: user.email,
                            subject: `✅ Pro API Subscription Renewed`,
                            html: getSubscriptionRenewedTemplate({ brandName: user.brand || key.userId, type: 'Pro API Subscription', newExpiryDate: newExpiry, amount: renewalPrice })
                        });
                    }
                } else {
                    await kDoc.ref.update({ status: 'EXPIRED' });
                    if (user.email) {
                        await defaultTransporter.sendMail({
                            from: smtpFrom, to: user.email,
                            subject: `⚠️ Your Pro API Subscription has Expired`,
                            html: getSubscriptionExpiredTemplate({ brandName: user.brand || key.userId, type: 'Pro API Subscription', expiryDate: expiry })
                        });
                    }
                }
            }
        }

        // ----------------------------------------------------
        // 4. PROCESS MERCHANT WALLET DAILY DEDUCTIONS
        // ----------------------------------------------------
        const sellersSnap = await db.collection('sellers').where('status', '==', 'active').get();
        for (const sDoc of sellersSnap.docs) {
            const seller = sDoc.data();
            const sId = sDoc.id;
            const dailyFee = seller.dailyFee || (seller.tier === 'premium' ? 133 : 83);
            const currentWallet = Number(seller.walletBalance) || 0;
            const idempotencyKey = `DAILY_FEE_${sId}_${todayDateStr}`;

            const existingTxSnap = await db.collection('wallet_transactions').where('idempotencyKey', '==', idempotencyKey).get();
            if (!existingTxSnap.empty) continue;

            if (currentWallet >= dailyFee) {
                const newBalance = currentWallet - dailyFee;
                await sDoc.ref.update({ walletBalance: newBalance, status: 'active', lastActivatedAt: admin.firestore.FieldValue.serverTimestamp() });
                await db.collection('wallet_transactions').add({
                    sellerId: sId, type: 'DAILY_AUTO_DEDUCTION', amount: -dailyFee, remainingBalance: newBalance,
                    idempotencyKey: idempotencyKey, description: `24-Hour Website Activation Fee (${seller.tier || 'Starter'})`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await sDoc.ref.update({ status: 'deactivated_insufficient_funds' });
            }
        }

        return { statusCode: 200, body: "Daily background cron executed successfully." };

    } catch (error) {
        console.error("[DAILY CRON ERROR]:", error.message);
        return { statusCode: 500, body: error.message };
    }
};
