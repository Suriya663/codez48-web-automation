const getSubscriptionExpiredTemplate = (data) => {
    const { brandName, type, expiryDate, billingUrl = 'https://codez48.netlify.app/api-keys.html' } = data;

    return `
        <div style="font-family: system-ui, sans-serif; padding: 40px; background-color: #ffffff; border-radius: 24px; border: 2px solid #000000; max-width: 600px; margin: 0 auto; color: #000000;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;">Subscription Expired</h1>
                <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #ef4444; text-transform: uppercase; tracking-widest: 0.1em;">Action Required: Service Suspended</p>
            </div>

            <p style="font-size: 15px; font-weight: 600; line-height: 1.6; margin-bottom: 25px;">
                Hello ${brandName},<br><br>
                Your <strong>${type}</strong> has expired as of ${new Date(expiryDate).toLocaleDateString()}. Due to insufficient wallet balance for auto-renewal, your network node service has been temporarily suspended.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase;">Current Status</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; font-weight: 600;">Website Service</span>
                    <span style="background-color: #fee2e2; color: #ef4444; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Suspended</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 14px; font-weight: 600;">Public Profile</span>
                    <span style="background-color: #fef3c7; color: #d97706; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Network Issue Shown</span>
                </div>
            </div>

            <div style="text-align: center;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Click the button below to visit your billing dashboard and reactivate your service instantly.</p>
                <a href="${billingUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 16px 40px; border-radius: 12px; text-decoration: none; shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    Reactivate My Node Now →
                </a>
            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; pt: 20px;">
                <p style="font-size: 11px; color: #94a3b8;">© 2025 CODEZ48 Network Protocol. Internal Automated Dispatch.</p>
            </div>
        </div>
    `;
};

const getSubscriptionRenewedTemplate = (data) => {
    const { brandName, type, newExpiryDate, amount } = data;

    return `
        <div style="font-family: system-ui, sans-serif; padding: 40px; background-color: #ffffff; border-radius: 24px; border: 2px solid #000000; max-width: 600px; margin: 0 auto; color: #000000;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;">Subscription Renewed</h1>
                <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: 700; color: #10b981; text-transform: uppercase; tracking-widest: 0.1em;">Automated Wallet Renewal Success</p>
            </div>

            <p style="font-size: 15px; font-weight: 600; line-height: 1.6; margin-bottom: 25px;">
                Hello ${brandName},<br><br>
                Great news! Your <strong>${type}</strong> has been successfully renewed using your wallet funds. Your service remains active without any interruption.
            </p>

            <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #15803d; text-transform: uppercase;">Transaction Summary</p>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 13px; color: #374151;">Renewal Amount</span>
                    <strong style="font-size: 13px;">₹${amount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 13px; color: #374151;">New Expiry Date</span>
                    <strong style="font-size: 13px;">${new Date(newExpiryDate).toLocaleDateString()}</strong>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="https://codez48.netlify.app/api-keys.html" style="display: inline-block; background-color: #000000; color: #ffffff; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 16px 40px; border-radius: 12px; text-decoration: none;">
                    View My Dashboard →
                </a>
            </div>
        </div>
    `;
};

module.exports = { getSubscriptionExpiredTemplate, getSubscriptionRenewedTemplate };
