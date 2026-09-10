const crypto = require('crypto');
const admin = require('firebase-admin');

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
        console.error('Firebase Admin Init Failure in Razorpay Webhook:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    const signature = event.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return { statusCode: 400, body: "Missing signature or secret" };
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(event.body)
        .digest('hex');

    if (signature !== expectedSignature) {
        return { statusCode: 400, body: "Invalid webhook signature" };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    try {
        const { event: razorpayEvent, payload } = JSON.parse(event.body);
        const payment = payload.payment.entity;

        console.log(`[RAZORPAY WEBHOOK] Event: ${razorpayEvent}, Payment ID: ${payment.id}`);

        // IDEMPOTENCY CHECK: Log the webhook event
        const webhookRef = db.collection('razorpay_webhooks').doc(payment.id + "_" + razorpayEvent);
        const webhookSnap = await webhookRef.get();
        if (webhookSnap.exists) {
            return { statusCode: 200, body: "Duplicate event skipped" };
        }
        await webhookRef.set({
            event: razorpayEvent,
            paymentId: payment.id,
            orderId: payment.order_id,
            status: payment.status,
            amount: payment.amount,
            processedAt: new Date().toISOString()
        });

        // Handle specific events
        if (razorpayEvent === 'order.paid' || razorpayEvent === 'payment.captured') {
            // Note: The frontend usually handles the activation immediately after payment verification.
            // This webhook serves as a backup to ensure nothing is missed.
            // Logic to verify if the order/user is already activated would go here.
        }

        if (razorpayEvent === 'payment.refunded') {
            console.warn(`[REFUND DETECTED] Payment ${payment.id} was refunded. Reason: ${payment.refund_status}`);
            // Update internal records if necessary
        }

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        console.error("Webhook Error:", error);
        return { statusCode: 500, body: error.message };
    }
};
