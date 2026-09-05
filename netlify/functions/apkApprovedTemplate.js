const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const OFFICIAL_LOGO_URL = 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg';

exports.getApkApprovedTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">Android Application Approved</h2>
                <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">APK Ready for Download</p>
            </div>

            <p style="font-size: 15px; font-weight: 500; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Hello ${escapeHtml(data.sellerBrand || 'Merchant')},
            </p>
            <p style="font-size: 16px; font-weight: 800; color: #000000; line-height: 1.6; margin-bottom: 24px; text-transform: uppercase;">
                Your Android application is now available.
            </p>

            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 24px; margin-bottom: 32px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #000000;">
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600; width: 40%;">Seller ID</td>
                        <td style="padding: 12px 0; text-align: right; font-family: monospace;">${escapeHtml(data.sellerId)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Business Name</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 800;">${escapeHtml(data.sellerBrand)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; font-weight: 600;">Approval Date / Time</td>
                        <td style="padding: 12px 0; text-align: right;">${new Date(data.approvedAt || Date.now()).toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="${escapeHtml(data.apkUrl)}" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 18px 40px; text-decoration: none; border: 1px solid #000000;">
                    Download Android Application
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Official Network</p>
            </div>
        </div>
    `;
};
