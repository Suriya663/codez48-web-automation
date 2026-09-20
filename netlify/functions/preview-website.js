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
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in preview-website:', e.message);
        return false;
    }
};

exports.handler = async (event, context) => {
    const id = event.queryStringParameters.id;

    if (!id) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "text/html" },
            body: "<html><body><h1>Error: Missing project ID.</h1></body></html>"
        };
    }

    if (!initAdmin() || !db) {
        return { statusCode: 500, body: "Database unavailable" };
    }

    try {
        const docSnap = await db.collection('generated_websites').doc(id).get();

        if (!docSnap.exists) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "text/html" },
                body: `
                    <html>
                        <body style="font-family: sans-serif; text-align: center; padding: 50px; color: #666;">
                            <h1>404: Preview Not Found</h1>
                            <p>The requested AI-generated website does not exist or has expired.</p>
                            <a href="https://codez48.netlify.app" style="color: #2563EB;">Return to Codez48</a>
                        </body>
                    </html>
                `
            };
        }

        const data = docSnap.data();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/html",
                "X-Frame-Options": "DENY",
                "Content-Security-Policy": "default-src 'self' https: 'unsafe-inline' 'unsafe-eval'; img-src * data:; font-src *;"
            },
            body: data.html
        };

    } catch (error) {
        console.error("Preview Retrieval Error:", error.message);
        return {
            statusCode: 500,
            body: "Internal Server Error"
        };
    }
};
