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
        console.error('Firebase Admin Init Failure in aiMailCampaignAction:', e.message);
        return false;
    }
};

const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const DEVELOPER_EMAIL = 'rajnaga75556@gmail.com';

/**
 * Secure Token Action Handler for Email Commerce (Order Now, Confirm, Unsubscribe)
 */
exports.handler = async (event, context) => {
    const { token, action } = event.queryStringParameters || {};

    if (!token || !['order', 'confirm', 'cancel', 'unsubscribe'].includes(action)) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Invalid or missing action token.</h2></div></body></html>`
        };
    }

    if (!initAdmin() || !db) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Database connection error.</h2></div></body></html>`
        };
    }

    try {
        let decoded = {};
        try {
            decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        } catch (e) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Malformed action token.</h2></div></body></html>`
            };
        }

        const { cId, email, sId, pId } = decoded;
        const campDoc = await db.collection('ai_mail_campaigns').doc(cId).get();
        if (!campDoc.exists) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "text/html" },
                body: `<html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px;background:#fff;color:#000;"><div style="max-width:480px;margin:0 auto;border:1px solid #000;padding:40px;border-radius:8px;"><h2>Campaign not found or expired.</h2></div></body></html>`
            };
        }
        const campData = campDoc.data();

        const host = event.headers.host || 'codez48.netlify.app';
        const protocol = event.headers['x-forwarded-proto'] || 'https';

        if (action === 'unsubscribe') {
            const contactQuery = db.collection('email_contacts').where('email', '==', email);
            const contactSnap = await contactQuery.get();
            if (!contactSnap.empty) {
                await contactSnap.docs[0].ref.update({ unsubscribed: true, suppressed: true, status: 'unsubscribed' });
            }
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Successfully Unsubscribed</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Email address <strong>${escapeHtml(email)}</strong> has been removed from future marketing campaigns.</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'order') {
            const confirmToken = Buffer.from(JSON.stringify({ cId, email, sId, pId, action: 'confirm', t: Date.now() })).toString('base64');
            const cancelToken = Buffer.from(JSON.stringify({ cId, email, sId, pId, action: 'cancel', t: Date.now() })).toString('base64');

            const confirmUrl = `${protocol}://${host}/.netlify/functions/aiMailCampaignAction?token=${confirmToken}&action=confirm`;
            const cancelUrl = `${protocol}://${host}/.netlify/functions/aiMailCampaignAction?token=${cancelToken}&action=cancel`;

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Confirm Your Order</h2>

                            <div style="margin: 20px 0; padding: 20px; background: #fafafa; border: 1px solid #eee; text-align: left;">
                                ${campData.productImage ? `<img src="${escapeHtml(campData.productImage)}" style="width: 80px; height: 80px; object-fit: contain; background: #fff; border: 1px solid #ddd; border-radius: 8px; float: right; margin-left: 20px;">` : ''}
                                <p style="margin: 0; font-size: 16px; font-weight: 800;">${escapeHtml(campData.productName || campData.businessName)}</p>
                                <p style="margin: 5px 0; font-size: 18px; font-weight: 900; color: #047857;">₹${escapeHtml(String(campData.price || 0))}</p>
                                <div style="clear: both;"></div>
                                <p style="margin-top: 15px; font-size: 13px; color: #666; line-height: 1.5;">${escapeHtml(campData.description || 'Exclusive offer from ' + campData.businessName)}</p>
                            </div>

                            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px;">Would you like to place this order?</p>

                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <a href="${confirmUrl}" style="background: #000; color: #fff; padding: 16px 36px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px; border: 1px solid #000;">Place Order Now</a>
                                <a href="${cancelUrl}" style="background: #fff; color: #000; padding: 16px 36px; text-decoration: none; font-weight: 700; text-transform: uppercase; font-size: 12px; border: 1px solid #000;">Cancel</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'confirm') {
            const orderRefId = `ORD_${cId}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const existingOrder = await db.collection('ai_mail_orders').doc(orderRefId).get();

            if (!existingOrder.exists) {
                const orderData = {
                    orderId: orderRefId,
                    campaignId: cId,
                    sellerId: sId || campData.userId || 'unknown',
                    productName: campData.productName || campData.businessName,
                    price: campData.price || 0,
                    customerEmail: email,
                    status: 'confirmed',
                    createdAt: new Date().toISOString()
                };

                await db.collection('ai_mail_orders').doc(orderRefId).set(orderData);

                if (sId) {
                    try {
                        const mainOrderId = 'AIM-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                        await db.collection('orders').doc(mainOrderId).set({
                            orderId: mainOrderId,
                            sellerId: sId,
                            items: [{
                                pid: pId,
                                name: campData.productName || campData.businessName,
                                price: campData.price || 0,
                                qty: 1
                            }],
                            total: campData.price || 0,
                            customer: { email },
                            status: 'pending',
                            payment: { method: 'COD', status: 'Pending' },
                            date: new Date().toISOString(),
                            source: 'AI Mail Campaign'
                        });

                        // Trigger notifications via SMTP
                        const smtpHost = process.env.SMTP_HOST;
                        const smtpPort = Number(process.env.SMTP_PORT) || 587;
                        const smtpUser = process.env.SMTP_USER;
                        const smtpPass = process.env.SMTP_PASS;
                        const smtpFrom = process.env.SMTP_FROM || smtpUser || 'CODEZ48 Alerts <no-reply@codez48.io>';

                        if (smtpHost && smtpUser && smtpPass) {
                            const transporter = nodemailer.createTransport({
                                host: smtpHost,
                                port: smtpPort,
                                secure: smtpPort === 465,
                                auth: { user: smtpUser, pass: smtpPass }
                            });

                            const notificationHtml = `
                                <div style="font-family: sans-serif; padding: 30px; border: 1px solid #000;">
                                    <h2 style="text-transform: uppercase;">New Order Received</h2>
                                    <p>An order has been placed via AI Mail Campaign.</p>
                                    <p><strong>Order ID:</strong> ${mainOrderId}</p>
                                    <p><strong>Customer:</strong> ${email}</p>
                                    <p><strong>Product:</strong> ${campData.productName || campData.businessName}</p>
                                    <p><strong>Price:</strong> ₹${campData.price || 0}</p>
                                    <p><strong>Campaign ID:</strong> ${cId}</p>
                                </div>
                            `;

                            // Notification to Developer Admin
                            await transporter.sendMail({
                                from: smtpFrom,
                                to: DEVELOPER_EMAIL,
                                subject: `[NEW ORDER] AI Mail Campaign Conversion (${mainOrderId})`,
                                html: notificationHtml
                            });

                            // Notification to Seller (if they have an email)
                            const sellerSnap = await db.collection('sellers').doc(sId).get();
                            if (sellerSnap.exists() && sellerSnap.data().email) {
                                await transporter.sendMail({
                                    from: smtpFrom,
                                    to: sellerSnap.data().email,
                                    subject: `New Order Enquiry Received from Your AI Mail Campaign`,
                                    html: notificationHtml
                                });
                            }

                            // Confirmation to Customer
                            await transporter.sendMail({
                                from: smtpFrom,
                                to: email,
                                subject: `Order Successful - CODEZ48`,
                                html: `
                                    <div style="font-family: sans-serif; padding: 30px; border: 1px solid #000;">
                                        <h2 style="text-transform: uppercase;">Order Placed Successfully</h2>
                                        <p>Your order for <strong>${campData.productName || campData.businessName}</strong> has been successfully transmitted to the merchant.</p>
                                        <p><strong>Order ID:</strong> ${mainOrderId}</p>
                                        <p><strong>Merchant:</strong> ${campData.businessName}</p>
                                        <p><strong>Price:</strong> ₹${campData.price || 0}</p>
                                        <p style="margin-top: 20px; font-size: 12px; color: #666;">Thank you for choosing CODEZ48.</p>
                                    </div>
                                `
                            });
                        }
                    } catch (e) {
                        console.error("Order Notification Error:", e);
                    }
                }

                await db.collection('ai_mail_campaign_events').add({
                    campaignId: cId,
                    recipientEmail: email,
                    status: 'order_confirmed',
                    timestamp: new Date().toISOString()
                });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Order Successful!</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Thank you. Your order has been placed successfully and transmitted to the merchant.</p>
                            <div style="margin-top: 25px;">
                                <a href="https://codez48.netlify.app" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; border-radius: 4px;">Return to CODEZ48</a>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        if (action === 'cancel') {
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                    <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 60px; background: #ffffff; color: #000000;">
                        <div style="max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 40px; border-radius: 8px;">
                            <h2 style="text-transform: uppercase; font-weight: 900;">Request Cancelled</h2>
                            <p style="font-size: 14px; line-height: 1.6;">Your order request has been cancelled successfully.</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

    } catch (error) {
        console.error("AI Mail Campaign Action Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "text/html" },
            body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Server error processing action.</h2></body></html>`
        };
    }
};
