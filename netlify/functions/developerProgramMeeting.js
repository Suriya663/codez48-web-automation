const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getMeetingTemplate } = require('./developerProgramMeetingTemplate.js');

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
        console.error('Firebase Admin Init Failure:', e.message);
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

        if (data.event !== 'DEVELOPER_PROGRAM_MEETING_CREATED') {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid event type." }) };
        }

        if (!initAdmin() || !db) {
            return { statusCode: 500, body: JSON.stringify({ error: "Database unavailable." }) };
        }

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Alerts <no-reply@codez48.io>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            return { statusCode: 500, body: JSON.stringify({ error: "SMTP configuration missing." }) };
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        // Fetch all active Developer Program registrants from dev_prog_users
        const usersSnap = await db.collection('dev_prog_users').get();
        let sentCount = 0;
        let failCount = 0;

        const emailHtml = getMeetingTemplate(data);

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const recipientEmail = userData.email;

            if (recipientEmail && recipientEmail.includes('@')) {
                try {
                    await transporter.sendMail({
                        from: smtpFrom,
                        to: recipientEmail,
                        subject: `[Live Session] ${data.title || 'Developer Program Meeting'}`,
                        html: emailHtml
                    });
                    sentCount++;
                } catch (indivErr) {
                    failCount++;
                    console.warn(`[MEETING EMAIL FAIL] Recipient ${recipientEmail}:`, indivErr.message);
                }
            }
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                sentCount,
                failCount,
                message: `Meeting broadcasted to developers successfully.`
            })
        };

    } catch (error) {
        console.error("Developer Program Meeting Broadcast Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};
