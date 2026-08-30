/**
 * AI Call Interface - Secure Proxy Edition
 * Redirects requests to Netlify Functions to keep API keys safe.
 */
export const callAI = async (messages, useGemini = false) => {
    try {
        const response = await fetch("/.netlify/functions/call-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, useGemini })
        });

        if (!response.ok) {
            let errorDetail = "Unknown Error";
            try {
                const errorData = await response.json();
                errorDetail = errorData.error || errorData.details || errorDetail;

                // Log specific protocol errors as requested
                console.error(`[AI Protocol Error] Status: ${response.status}`, {
                    message: errorDetail,
                    requestedModel: "openai/gpt-oss-120b",
                    endpoint: "/.netlify/functions/call-ai"
                });
            } catch (e) {
                console.error(`[AI Network Error] Status: ${response.status}`);
            }
            return null;
        }

        const data = await response.json();
        return data.content;

    } catch (e) {
        console.error("AI Network Transport Failure:", e.message);
        return null;
    }
};

/**
 * Notification Dispatched to Node
 */
export const sendFast2SMS = async (to, body) => {
    const API_KEY = 'mqUusjf4rHSl0gYEBkNVi1FC86hnDIwQAK7eo52JMWLcRTPxOZfjqstkAO38TYg2SmQZzoiVM970BnR6';
    let clean = to.toString().replace(/\D/g, '');
    if (clean.length === 10) clean = '91' + clean;
    if (clean.length < 10) return;

    try {
        const target = `https://www.fast2sms.com/dev/bulkV2?route=q&message=${encodeURIComponent(body)}&numbers=${clean}&authorization=${API_KEY}`;
        await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
        console.log("Protocol SMS Dispatched to Node:", clean);
    } catch (e) { console.error("SMS Protocol Failure:", e); }
};

/**
 * Image Compression Utility
 */
export const compressImage = (base64Str, maxWidth, maxHeight) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
};

/**
 * Format relative time (e.g., "5 seconds ago", "2 minutes ago")
 */
export const formatRelativeTime = (ms) => {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec} second${sec !== 1 ? 's' : ''} ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
    const hrs = Math.round(min / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
};

/**
 * Developer Recovery Email
 */
export const sendDeveloperAccessEmail = async () => {
    const email = 'codez4848@gmail.com';
    const pass = 'codez@4848';
    console.log("Preparing Developer REST Recovery Protocol...");

    const payload = {
        service_id: 'service_tgo402q',
        template_id: 'template_fliq26w',
        user_id: 'tK4laGJuWBYJYy9zy',
        accessToken: 'lkB8W-36jhbPmSNnxMudb',
        template_params: {
            customer_name: "Tori Architect",
            order_id: "ARCH-ROOT-RECOVERY",
            product_name: "Architect Protocol Recovery",
            seller_id: email,
            seller_password: pass,
            protocol_url: window.location.origin,
            customer_email: email,
            product_description: `ROOT ACCESS GRANTED. \n\nEmail: ${email}\nPassword: ${pass}`
        }
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Protocol Recovery Email dispatched.");
        } else {
            alert("Protocol Recovery Dispatch Failed.");
        }
    } catch(e) {
        alert("Protocol Recovery Dispatch Failed.");
    }
};

window.sendDeveloperAccessEmail = sendDeveloperAccessEmail;
