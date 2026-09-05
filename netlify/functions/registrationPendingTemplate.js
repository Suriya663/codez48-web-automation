// Black & White Minimalist Premium Template
const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const OFFICIAL_LOGO_URL = 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg';

exports.getUserEmailTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">Registration Received</h2>
                <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">Payment Pending</p>
            </div>

            <p style="font-size: 15px; font-weight: 500; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Hello ${escapeHtml(data.brandName || data.username)},
            </p>
            <p style="font-size: 14px; font-weight: 400; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Your registration and business profile information have been successfully submitted to CODEZ48. Your account setup is currently waiting for payment completion.
            </p>

            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 24px; margin-bottom: 32px;">
                <p style="margin: 0 0 16px 0; font-weight: 700; color: #000000; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">Available Payment Plans</p>

                <div style="margin-bottom: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 16px;">
                    <strong style="color: #000000; font-size: 14px; display: block; margin-bottom: 4px;">1-Day Pay-As-You-Go Rental</strong>
                    <p style="margin: 0; color: #000000; font-size: 13px; line-height: 1.5;">Starter: ₹83 / Day<br/>Premium: ₹133 / Day</p>
                    <p style="margin: 6px 0 0 0; color: #666666; font-size: 11px; line-height: 1.4;">Instead of paying the entire monthly amount at once, you can use the daily-payment option to activate your website for just a single day.</p>
                </div>

                <div>
                    <strong style="color: #000000; font-size: 14px; display: block; margin-bottom: 4px;">Monthly Subscription</strong>
                    <p style="margin: 0; color: #000000; font-size: 13px; line-height: 1.5;">Starter: ₹2,500 / Month<br/>Premium: ₹4,000 / Month</p>
                </div>
            </div>

            <p style="font-size: 14px; font-weight: 400; color: #000000; line-height: 1.6; margin-bottom: 32px; text-align: center;">
                Please choose one of the available payment options and complete the payment to launch your business online.
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://codez48.netlify.app/#auth" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 18px 40px; text-decoration: none; border: 1px solid #000000;">
                    Continue to Payment
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Official Network</p>
            </div>
        </div>
    `;
};

exports.getAdminEmailTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">New Registration – Payment Pending</h2>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 24px; margin-bottom: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6;">
                    This user has registered successfully but payment has not yet been completed.
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #000000;">
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600; width: 40%;">Registration/User ID</td>
                        <td style="padding: 12px 0; font-family: monospace;">${escapeHtml(data.sellerId)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Username</td>
                        <td style="padding: 12px 0;">${escapeHtml(data.username)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Business/Brand Name</td>
                        <td style="padding: 12px 0;">${escapeHtml(data.brandName)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Registered Email</td>
                        <td style="padding: 12px 0;">${escapeHtml(data.email)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Registered Mobile</td>
                        <td style="padding: 12px 0;">${escapeHtml(data.mobile || 'Not Provided')}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Registration Timestamp</td>
                        <td style="padding: 12px 0;">${new Date(data.timestamp).toLocaleString()}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Payment Status</td>
                        <td style="padding: 12px 0; font-weight: 800;">PENDING</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://codez48.netlify.app/seller/developer.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 16px 36px; text-decoration: none; border: 1px solid #000000;">
                    Open Developer Console
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Admin Alert</p>
            </div>
        </div>
    `;
};
