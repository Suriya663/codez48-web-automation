# Push Notification Authorization & Firestore Indexing Fixes

Resolved the **401 Unauthorized** error for push notifications and implemented a user-friendly fallback for the **Firestore indexing** requirement in the AI Mail Campaign dashboard.

## Key Changes Made

### 1. Push Notification Security Fix (`js/push-notifications.js`)
- **Anonymous Sign-In**: Added a check to ensure the user is signed in (anonymously if needed) before requesting the FCM push token. This provides a legitimate `uid` for device registration.
- **Authorization Header**: Updated the `send-notification` fetch call to include the mandatory `Authorization: Bearer <ID_TOKEN>` header. This resolves the 401 error by providing valid credentials to the Netlify serverless function.

### 2. Firestore Indexing Support (`js/ai-mail-campaign-modal.js`)
- **Graceful Error Handling**: Wrapped the campaign history query in a `try-catch` block specifically designed to detect missing Firestore indices.
- **Index Creation Prompt**: If the query fails due to a missing index, the UI now displays a "Database Setup Required" card with a direct button link to the Firebase Console, allowing the admin to create the required composite index with one click.

---

## Verification Results

### Code Health
- `analyze_file` executed cleanly on `js/push-notifications.js` and `js/ai-mail-campaign-modal.js` with zero syntax errors.

### Feature Verification
- Verified ID token generation and inclusion in push notification headers.
- Verified error trapping for Firestore index requirements in the AI Mail Campaign dashboard.
