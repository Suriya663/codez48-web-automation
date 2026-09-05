const escapeHtml = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

const OFFICIAL_LOGO_URL = 'https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/003/810/744/datas/original.jpg';

exports.getSellerApkReqTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">Android Application Request</h2>
                <p style="margin: 8px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">APK Submission Successful</p>
            </div>

            <p style="font-size: 15px; font-weight: 500; color: #000000; line-height: 1.6; margin-bottom: 24px;">
                Hello ${escapeHtml(data.sellerBrand || 'Merchant')},
            </p>
            <p style="font-size: 16px; font-weight: 800; color: #000000; line-height: 1.6; margin-bottom: 24px; text-transform: uppercase;">
                Your Android application/APK request has been submitted successfully.
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
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Request ID</td>
                        <td style="padding: 12px 0; text-align: right; font-family: monospace;">${escapeHtml(data.requestId)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Current Status</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: 800; color: #d97706;">${escapeHtml(data.status || 'PENDING')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; font-weight: 600;">Submission Date</td>
                        <td style="padding: 12px 0; text-align: right;">${new Date(data.createdAt || Date.now()).toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://codez48.netlify.app/seller/developer.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 18px 40px; text-decoration: none; border: 1px solid #000000;">
                    Open Seller Console
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Official Network</p>
            </div>
        </div>
    `;
};

exports.getAdminApkReqTemplate = (data) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; border: 1px solid #000000; max-width: 600px; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; border-b: 1px solid #000000; padding-bottom: 24px; margin-bottom: 32px;">
                <img src="${OFFICIAL_LOGO_URL}" style="height: 48px; width: auto; margin-bottom: 24px;" alt="CODEZ48 Logo" />
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; color: #000000;">Android Application Requested</h2>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #000000; padding: 24px; margin-bottom: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 14px; font-weight: 600; color: #000000; line-height: 1.6;">
                    A merchant has submitted an Android application / APK build request.
                </p>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #000000;">
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600; width: 40%;">Request ID</td>
                        <td style="padding: 12px 0; font-family: monospace;">${escapeHtml(data.requestId)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Seller ID</td>
                        <td style="padding: 12px 0; font-family: monospace;">${escapeHtml(data.sellerId)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Business Name</td>
                        <td style="padding: 12px 0; font-weight: 800;">${escapeHtml(data.sellerBrand)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Registered Email</td>
                        <td style="padding: 12px 0; font-family: monospace;">${escapeHtml(data.sellerEmail)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Mobile Number</td>
                        <td style="padding: 12px 0;">${escapeHtml(data.sellerMobile || 'N/A')}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Profile URL</td>
                        <td style="padding: 12px 0;"><a href="${escapeHtml(data.profileUrl)}" target="_blank" style="color: #000000; text-decoration: underline;">Open Profile</a></td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Website URL</td>
                        <td style="padding: 12px 0;"><a href="${escapeHtml(data.websiteUrl)}" target="_blank" style="color: #000000; text-decoration: underline;">Open Website</a></td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Application Name</td>
                        <td style="padding: 12px 0; font-weight: 800;">${escapeHtml(data.appName || 'N/A')}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Status</td>
                        <td style="padding: 12px 0; font-weight: 800; color: #d97706;">PENDING</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 12px 0; font-weight: 600;">Submission Timestamp</td>
                        <td style="padding: 12px 0;">${new Date(data.createdAt || Date.now()).toLocaleString()}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-bottom: 32px;">
                <a href="https://codez48.netlify.app/seller/developer.html?view=apk" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 16px 36px; text-decoration: none; border: 1px solid #000000;">
                    Open APK Request
                </a>
            </div>

            <div style="border-t: 1px solid #000000; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #000000; letter-spacing: 1px;">CODEZ48 Admin Audit Trail</p>
            </div>
        </div>
    `;
};
