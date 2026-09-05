const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getAcceptedTemplate } = require('./collabAcceptedTemplate.js');

let isInitialized = false;

const initAdmin = () => {
    if (isInitialized) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!saVar) {
            if (admin.apps.length === 0) admin.initializeApp();
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

        if (data.event !== 'COLLABORATION_ACCEPTED') {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid event type." }) };
        }

        initAdmin();

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

        if (data.senderEmail && data.senderEmail.includes('@')) {
            await transporter.sendMail({
                from: smtpFrom,
                to: data.senderEmail,
                subject: `Collaboration Accepted by ${data.receiverBrand || 'Partner'}`,
                html: getAcceptedTemplate(data)
            });
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: "Collaboration acceptance email sent." })
        };
    } catch (error) {
        console.error("Collab Accepted Email Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};
