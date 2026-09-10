const crypto = require('crypto');

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        console.log(`[RAZORPAY_VERIFY_PAYMENT] Credentials Present: ${!!keyId && !!keySecret}`);

        if (!keyId || !keySecret) {
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    error: "Razorpay credentials not configured in backend environment."
                })
            };
        }

        // 1. Verify Signature
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error("[SIGNATURE_MISMATCH]");
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: "Invalid payment signature. Potential fraud attempt." })
            };
        }

        // 2. Verify Payment Status with Razorpay API
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });

        const payment = await response.json();

        if (!response.ok) {
            console.error("[RAZORPAY_PAYMENT_FETCH_ERROR]", payment);
            return {
                statusCode: response.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ success: false, error: payment.error?.description || "Failed to fetch payment details from Razorpay." })
            };
        }

        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    error: `Verification failed. Payment status is ${payment.status}.`,
                    status: payment.status
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ success: true, payment })
        };
    } catch (error) {
        console.error("Internal Verification Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: "Internal Verification Error: " + error.message })
        };
    }
};
