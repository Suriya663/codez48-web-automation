const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Note: Website Verification is now handled via Heartbeat logic
 * in js/tracker-tool.js and tracker.js to bypass CORS/Proxy issues.
 * Cloud Functions are not required for the free-tier tracker.
 */
