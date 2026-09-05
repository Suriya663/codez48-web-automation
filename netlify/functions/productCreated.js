const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { getSellerCreatedTemplate, getAdminCreatedTemplate } = require('./productCreatedTemplate.js');

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

        if (data.event !== 'SELLER_PRODUCT_CREATED') {
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

        // Email A: Seller confirmation
        if (data.sellerEmail && data.sellerEmail.includes('@')) {
            await transporter.sendMail({
                from: smtpFrom,
                to: data.sellerEmail,
                subject: `Product Successfully Launched - ${data.productName}`,
                html: getSellerCreatedTemplate(data)
            });
        }

        // Email B: Developer / Admin notification
        await transporter.sendMail({
            from: smtpFrom,
            to: DEVELOPER_EMAIL,
            subject: `New Product Created: ${data.productName} (${data.sellerId})`,
            html: getAdminCreatedTemplate(data)
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true, message: "Product created notification emails dispatched successfully." })
        };

    } catch (error) {
        console.error("Product Created Email Error:", error);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
};
