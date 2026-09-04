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
 * 1. Automatically dispatches active daily email schedules every 24 hours without requiring user login.
 * 2. Automatically processes 24-hour merchant wallet daily fee deductions (₹83 / ₹133).
 * 3. Automatically credits pro-rata daily developer commissions (₹16.67/day) to referring developers.
 */
exports.handler = async (event, context) => {
    console.log("[DAILY CRON ENGINE] Starting 24-hour background execution...");

    if (!initAdmin() || !db) {
        console.error("[CRON ERROR] Database unavailable.");
        return { statusCode: 500, body: JSON.stringify({ error: "Database Connection Failed" }) };
    }

    try {
        const now = new Date();

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

        // ----------------------------------------------------
        // 1. PROCESS DAILY EMAIL AUTOMATION CAMPAIGN SCHEDULES
        // ----------------------------------------------------
        const q = db.collection('mail_automation_schedules').where('enableDailyCron', '==', true);
        const snapshot = await q.get();

        let processedSchedules = 0;
        let totalEmailsDispatched = 0;

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

                // Check Pro Custom SMTP
                if (siteId) {
                    try {
                        const customSnap = await db.collection('user_custom_smtp').doc(siteId).get();
                        if (customSnap.exists) {
                            const cData = customSnap.data();
                            if (cData.customSmtpUser && cData.customSmtpPass) {
                                activeUser = cData.customSmtpUser;
                                activeTransporter = nodemailer.createTransport({
                                    host: smtpHost,
                                    port: smtpPort,
                                    secure: smtpPort === 465,
                                    auth: { user: cData.customSmtpUser, pass: cData.customSmtpPass }
                                });
                            }
                        }
                    } catch (e) {}
                }

                // Calculate API Key Quota Limit
                let allowedLimit = 20;
                if (activeApiKey) {
                    try {
                        const keySnap = await db.collection('api_keys').doc(activeApiKey).get();
                        if (keySnap.exists) {
                            const kData = keySnap.data();
                            if (kData.planType === 'PRO_SUBSCRIPTION') {
                                allowedLimit = 60;
                            } else {
                                allowedLimit = Math.min(20, (kData.tokensRemaining || 10) * 2);
                            }
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
                        const safeCtaUrl = escapeHtml(templatePayload.ctaUrl || 'https://codez48.netlify.app/about.html');

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

                processedSchedules++;
                totalEmailsDispatched += cronSentCount;
            }
        }

        // ----------------------------------------------------
        // 2. PROCESS MERCHANT WALLET DAILY DEDUCTIONS & DEVELOPER PRO-RATA COMMISSIONS
        // ----------------------------------------------------
        const sellersSnap = await db.collection('sellers').get();
        let walletDeductedCount = 0;
        let pausedCount = 0;
        let devCommissionsCredited = 0;

        for (const sDoc of sellersSnap.docs) {
            const seller = sDoc.data();
            const sId = sDoc.id;
            const lastActive = seller.lastActivatedAt ? new Date(seller.lastActivatedAt.toDate ? seller.lastActivatedAt.toDate() : seller.lastActivatedAt) : new Date(0);
            const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);

            if (hoursSinceActive >= 20) {
                const dailyFee = seller.dailyFee || (seller.tier === 'premium' ? 133 : 83);
                const currentWallet = Number(seller.walletBalance) || 0;

                if (currentWallet >= dailyFee) {
                    const newBalance = currentWallet - dailyFee;
                    await sDoc.ref.update({
                        walletBalance: newBalance,
                        status: 'active',
                        lastActivatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    await db.collection('wallet_transactions').add({
                        sellerId: sId,
                        type: 'DAILY_AUTO_DEDUCTION',
                        amount: -dailyFee,
                        remainingBalance: newBalance,
                        description: `24-Hour Website Activation Fee (${seller.tier || 'Starter'})`,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    walletDeductedCount++;

                    // ----------------------------------------------------
                    // 3. PRO-RATA DEVELOPER DAILY COMMISSION (₹16.67/DAY)
                    // ----------------------------------------------------
                    if (seller.referredBy) {
                        try {
                            const devQuery = db.collection('dev_prog_users').where('referralCode', '==', seller.referredBy);
                            const devSnap = await devQuery.get();

                            if (!devSnap.empty) {
                                const devDoc = devSnap.docs[0];
                                const devData = devDoc.data();
                                const dailyCommissionShare = 16.67; // Pro-rata share of ₹500 over 30 days

                                await devDoc.ref.update({
                                    walletBalance: admin.firestore.FieldValue.increment(dailyCommissionShare),
                                    totalEarned: admin.firestore.FieldValue.increment(dailyCommissionShare)
                                });

                                await db.collection('dev_prog_earnings_log').add({
                                    developerEmail: devData.email,
                                    referralCode: seller.referredBy,
                                    sellerId: sId,
                                    sellerBrand: seller.brand || seller.username || 'Merchant',
                                    type: 'PRO_RATA_DAILY_COMMISSION',
                                    amount: dailyCommissionShare,
                                    description: `Daily Pro-Rata Commission for Referred Seller ${sId} (₹83/Day Plan)`,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                                });

                                devCommissionsCredited++;
                            }
                        } catch (devErr) {
                            console.warn(`[DEV COMMISSION NOTICE] Seller ${sId}:`, devErr.message);
                        }
                    }

                    // Check if wallet balance is low (< 2 days remaining) and dispatch low balance warning email
                    if (newBalance < (dailyFee * 2) && seller.email && seller.email.includes('@')) {
                        try {
                            await defaultTransporter.sendMail({
                                from: process.env.SMTP_FROM || smtpUser,
                                to: seller.email,
                                subject: `⚠️ Warning: Your CODEZ48 Wallet Balance is Very Low`,
                                html: `
                                    <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; border-radius: 24px; border: 2px solid #000000; max-width: 580px; margin: 0 auto; color: #000000;">
                                        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 16px;">
                                            <img src="https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg" style="height: 50px; width: auto; margin-bottom: 10px;" alt="CODEZ48 Logo" />
                                            <h2 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000000;">Low Wallet Balance Notice</h2>
                                            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #000000;">Recharge Required Soon</p>
                                        </div>

                                        <p style="font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                            Hello ${escapeHtml(seller.brand || seller.username || 'Merchant')}, your CODEZ48 wallet balance is very low (<strong>₹${newBalance.toFixed(2)}</strong>).
                                            Please recharge your wallet now to keep your website and profile active without interruption.
                                        </p>

                                        <div style="background-color: #ffffff; border: 1px solid #000000; padding: 18px; border-radius: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #000000;">
                                            <p style="margin: 0 0 6px 0;">Seller ID: <strong>${escapeHtml(sId)}</strong></p>
                                            <p style="margin: 0 0 6px 0;">Remaining Balance: <strong>₹${newBalance.toFixed(2)}</strong></p>
                                            <p style="margin: 0;">Daily Plan Fee: <strong>₹${dailyFee} / Day</strong></p>
                                        </div>

                                        <div style="text-align: center;">
                                            <a href="https://codez48.netlify.app/api-keys.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; padding: 14px 32px; border-radius: 99px; text-decoration: none; border: 2px solid #000000;">
                                                Recharge Wallet Now →
                                            </a>
                                        </div>
                                    </div>
                                `
                            });
                        } catch (e) {}
                    }
                } else {
                    // Insufficient balance: Pause website & dispatch email alert
                    await sDoc.ref.update({ status: 'deactivated_insufficient_funds' });
                    pausedCount++;

                    if (seller.email && seller.email.includes('@')) {
                        try {
                            await defaultTransporter.sendMail({
                                from: process.env.SMTP_FROM || smtpUser,
                                to: seller.email,
                                subject: `⚠️ Action Required: Your CODEZ48 Website is Inactive (Insufficient Wallet Balance)`,
                                html: `
                                    <div style="font-family: system-ui, sans-serif; padding: 36px; background-color: #ffffff; border-radius: 24px; border: 2px solid #000000; max-width: 580px; margin: 0 auto; color: #000000;">
                                        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000000; padding-bottom: 16px;">
                                            <img src="https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg" style="height: 50px; width: auto; margin-bottom: 10px;" alt="CODEZ48 Logo" />
                                            <h2 style="margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; color: #000000;">Website Temporarily Paused</h2>
                                            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #000000;">Insufficient Wallet Balance Notice</p>
                                        </div>

                                        <p style="font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6; margin-bottom: 20px;">
                                            Hello ${escapeHtml(seller.brand || seller.username || 'Merchant')}, your website has been temporarily paused because your wallet balance (<strong>₹${currentWallet}</strong>) is below the required daily activation fee (<strong>₹${dailyFee}</strong>).
                                        </p>

                                        <div style="background-color: #ffffff; border: 1px solid #000000; padding: 20px; border-radius: 16px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #000000;">
                                            <p style="margin: 0 0 6px 0;">Seller ID: <strong>${escapeHtml(sId)}</strong></p>
                                            <p style="margin: 0 0 6px 0;">Current Wallet Balance: <strong>₹${currentWallet}</strong></p>
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
                        } catch (e) {}
                    }
                }
            }
        }

        console.log(`[DAILY CRON COMPLETED] Schedules: ${processedSchedules}, Emails: ${totalEmailsDispatched}, Wallet Deductions: ${walletDeductedCount}, Dev Commissions: ${devCommissionsCredited}, Paused Sites: ${pausedCount}`);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                processedSchedules,
                totalEmailsDispatched,
                walletDeductedCount,
                devCommissionsCredited,
                pausedCount,
                message: `Daily background cron executed successfully.`
            })
        };

    } catch (error) {
        console.error("[DAILY CRON ERROR]:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
