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
 * Automatically dispatches active daily email schedules every 24 hours without requiring user login.
 */
exports.handler = async (event, context) => {
    console.log("[DAILY EMAIL CRON ENGINE] Starting 24-hour background schedule execution...");

    if (!initAdmin() || !db) {
        console.error("[CRON ERROR] Database unavailable.");
        return { statusCode: 500, body: JSON.stringify({ error: "Database Connection Failed" }) };
    }

    try {
        const q = db.collection('mail_automation_schedules').where('enableDailyCron', '==', true);
        const snapshot = await q.get();

        if (snapshot.empty) {
            console.log("[DAILY CRON] No active daily email schedules found.");
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: "No active daily schedules." })
            };
        }

        console.log(`[DAILY CRON] Found ${snapshot.size} active daily schedules to process.`);

        let processedSchedules = 0;
        let totalEmailsDispatched = 0;

        for (const docSnap of snapshot.docs) {
            const schedule = docSnap.data();
            const { siteId, notificationEmail, recipients = [], templatePayload = {}, activeApiKey, lastCronRunAt } = schedule;

            if (!recipients || recipients.length === 0) continue;

            // Check 24-hour timer interval
            const now = new Date();
            const lastRun = lastCronRunAt ? new Date(lastCronRunAt.toDate ? lastCronRunAt.toDate() : lastCronRunAt) : new Date(0);
            const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);

            if (hoursSinceLastRun < 20) {
                console.log(`[DAILY CRON SKIPPED] Schedule ${docSnap.id} already ran ${hoursSinceLastRun.toFixed(1)} hours ago.`);
                continue;
            }

            // Configure SMTP Transporter for user
            let smtpHost = process.env.SMTP_HOST;
            let smtpPort = Number(process.env.SMTP_PORT) || 587;
            let smtpUser = process.env.SMTP_USER;
            let smtpPass = process.env.SMTP_PASS;

            // Check if Pro Custom SMTP exists
            if (siteId) {
                try {
                    const customSnap = await db.collection('user_custom_smtp').doc(siteId).get();
                    if (customSnap.exists) {
                        const cData = customSnap.data();
                        if (cData.customSmtpUser && cData.customSmtpPass) {
                            smtpUser = cData.customSmtpUser;
                            smtpPass = cData.customSmtpPass;
                        }
                    }
                } catch (e) {}
            }

            if (!smtpHost || !smtpUser || !smtpPass) continue;

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass }
            });

            // Calculate API Key Quota Limit
            let allowedLimit = 20; // Default 20 emails/day Free Tier
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

            // Dispatch emails to allowed recipients
            for (const recipient of sendList) {
                try {
                    const safeHeader = escapeHtml(templatePayload.headerText || 'Welcome to CODEZ48');
                    const safeDesc = escapeHtml(templatePayload.businessDescription || 'Welcome to CODZ48! You can create your website and Android application in just one minute.');
                    const safeCtaText = escapeHtml(templatePayload.ctaText || 'Contact Us Now');
                    const safeCtaUrl = escapeHtml(templatePayload.ctaUrl || 'https://codez48.netlify.app/about.html');

                    await transporter.sendMail({
                        from: process.env.SMTP_FROM || smtpUser,
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

            // Update schedule record
            await db.collection('mail_automation_schedules').doc(docSnap.id).update({
                lastCronRunAt: admin.firestore.FieldValue.serverTimestamp(),
                dailySentToday: cronSentCount,
                totalCronRuns: admin.firestore.FieldValue.increment(1)
            });

            // Send daily summary alert to owner
            if (notificationEmail && notificationEmail.includes('@')) {
                try {
                    await transporter.sendMail({
                        from: process.env.SMTP_FROM || smtpUser,
                        to: notificationEmail,
                        subject: `⚡ CODEZ48 Daily Automatic Email Summary`,
                        html: `
                            <div style="font-family: system-ui, sans-serif; padding: 25px; background: #faf5ff; border-radius: 16px; border: 1px solid #e9d5ff;">
                                <h3 style="color: #9333ea; margin: 0 0 10px 0;">⚡ Daily Automatic Email Campaign Completed</h3>
                                <p style="color: #4c1d95; font-size: 13px; margin: 0 0 10px 0;">Your scheduled daily emails were automatically dispatched today without requiring website login.</p>
                                <ul style="font-family: monospace; font-size: 12px; color: #6b21a8; margin: 0; padding-left: 20px;">
                                    <li>Emails Delivered Today: <strong>${cronSentCount} / ${recipients.length}</strong></li>
                                    <li>API Key Used: <strong>${activeApiKey || 'Default'}</strong></li>
                                    <li>Next Scheduled Run: <strong>Tomorrow at 9:00 AM</strong></li>
                                </ul>
                            </div>
                        `
                    });
                } catch (e) {}
            }

            processedSchedules++;
            totalEmailsDispatched += cronSentCount;
        }

        console.log(`[DAILY CRON COMPLETED] Processed ${processedSchedules} schedules, dispatched ${totalEmailsDispatched} emails.`);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                processedSchedules,
                totalEmailsDispatched,
                message: `Daily background cron executed successfully for ${processedSchedules} schedules.`
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
