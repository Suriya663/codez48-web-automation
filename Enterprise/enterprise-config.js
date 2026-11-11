/**
 * CODEZ48 ENTERPRISE RAZORPAY CONFIGURATION
 * Protected and Sealed Live Merchant Configuration
 * User-tamper-proof runtime isolation via Object.freeze and Object.defineProperty
 * Official Razorpay Live API Key: rzp_live_TaX2zuAv0lLUKf
 */
(function (global) {
    'use strict';

    // Official Live Razorpay Merchant Key ID (from Codez48 Profile & Payment Gateway)
    const LIVE_RAZORPAY_KEY = 'rzp_live_TaX2zuAv0lLUKf';

    const config = {
        RAZORPAY_KEY_ID: LIVE_RAZORPAY_KEY,
        ORIGINAL_VALUATION_INR: 50000,
        STAGE1_TEST_PRICE_INR: 1,
        STAGE2_FINAL_PRICE_INR: 29000,
        CURRENCY: 'INR',
        COMPANY_NAME: 'Codez48 Technologies',
        PRODUCT_NAME: 'Codez48 Pilot CLI Enterprise Master Source Code Buyout',
        OFFICIAL_DOMAIN: 'https://codez48.netlify.app',
        CHECKOUT_PATH: '/Enterprise/index.html',
        ARCHIVE_NAME: 'codez48cli_enterprise_master.zip',
        THEME_COLOR: '#000000',
        IS_LIVE: true
    };

    // Deep freeze configuration object
    Object.freeze(config);

    // Bind to window / global as read-only, non-writable and non-configurable
    try {
        Object.defineProperty(global, 'CODEZ48_ENTERPRISE_CONFIG', {
            value: config,
            writable: false,
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(global, 'ENTERPRISE_CONFIG', {
            value: config,
            writable: false,
            configurable: false,
            enumerable: true
        });
    } catch (_) {
        global.CODEZ48_ENTERPRISE_CONFIG = config;
        global.ENTERPRISE_CONFIG = config;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = config;
    }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
