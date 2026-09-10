const crypto = require('crypto');
const fetch = require('node-fetch');

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
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Razorpay credentials not configured." })
            };
        }

        // 1. Verify Signature
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, error: "Invalid payment signature" })
            };
        }

        // 2. Verify Payment Status with Razorpay API
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });

        const payment = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: payment.error || "Failed to fetch payment details" })
            };
        }

        // We accept both 'authorized' and 'captured' here because we have payment_capture: 1
        // Razorpay will eventually move 'authorized' to 'captured'
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: `Payment status is ${payment.status}. Verification failed.`,
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
        console.error("Verify Payment Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
