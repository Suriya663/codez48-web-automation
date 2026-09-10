const fetch = require('node-fetch');

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
        const { amount, currency, receipt, notes } = JSON.parse(event.body);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        console.log(`[RAZORPAY_CREATE_ORDER] KeyID Present: ${!!keyId}, KeySecret Present: ${!!keySecret}`);

        if (!keyId || !keySecret) {
            return {
                statusCode: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    error: "Razorpay credentials (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are not configured in Netlify environment variables."
                })
            };
        }

        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                amount: Math.round(amount),
                currency: currency || 'INR',
                receipt: receipt || `receipt_${Date.now()}`,
                notes: notes || {},
                payment_capture: 1
            })
        });

        const order = await response.json();

        if (!response.ok) {
            console.error("[RAZORPAY_API_ERROR]", order);
            return {
                statusCode: response.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    success: false,
                    error: order.error?.description || "Failed to create order via Razorpay API"
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(order)
        };
    } catch (error) {
        console.error("Internal Function Error:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ success: false, error: "Internal Server Error: " + error.message })
        };
    }
};
