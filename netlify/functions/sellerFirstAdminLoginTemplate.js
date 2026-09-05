const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const OFFICIAL_LOGO_URL = 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg';

exports.getSellerFirstLoginTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">Seller Admin Access Opened</h2>
                <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">Onboarding Congratulations</p>
            </div>

            <p style="font-size: 15px; font-weight: 500; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Hello ${escapeHtml(data.brandName || data.name || 'Merchant')},
            </p>
            <p style="font-size: 16px; font-weight: 800; color: #000000; line-height: 1.6; margin-bottom: 24px; text-transform: uppercase;">
                Congratulations. You have successfully opened your Codez48 Seller Admin page.
            </p>
            <p style="font-size: 14px; font-weight: 400; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Your merchant node is fully active. You can now:
            </p>

            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 24px; margin-bottom: 32px;">
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #000000; line-height: 1.8;">
                    <li><strong>Manage your business:</strong> Oversee orders, sales, and analytics.</li>
                    <li><strong>Add/Manage products:</strong> Publish inventory, update stock, and set pricing.</li>
                    <li><strong>Grow your online presence:</strong> Launch high-visibility advertisements and tools.</li>
                    <li><strong>Use plan features:</strong> Access all available seller features included in your plan.</li>
                </ul>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://codez48.netlify.app/seller/developer.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 18px 40px; text-decoration: none; border: 1px solid #000000;">
                    Open Seller Admin Page
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Official Network</p>
            </div>
        </div>
    `;
};
