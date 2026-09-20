# CLI Authentication & Secure Login Integration Plan

Implementation plan to provide a secure login mechanism for the Codez48 CLI using the existing `sellerId` and `password` system.

## 1. CLI Login Flow (Authentication)

### Backend: Netlify Function
- **[NEW] [cli-login.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-login.js)**:
    - Secure POST endpoint for CLI authentication.
    - **Logic**:
        1. Initialize `firebase-admin`.
        2. Accept `sellerId` and `password` from request body.
        3. Query `sellers` (and `seller_requests`) for the matching `sellerId`.
        4. Perform a server-side password verification (reusing existing raw-string comparison logic).
        5. Upon success:
           - Check the `api_keys` collection for an existing `ACTIVE` key for this user.
           - If no key exists, generate a new one (type: `CLI_SESSION`).
           - Return the `keyId` to the CLI.
        6. Log the login event for security auditing.

## 2. Secure Request Bridge

### Updated API Endpoint: `add-product`
- The previously created `add-product` function already supports `x-api-key` authentication.
- It will now seamlessly accept the key returned by `cli-login`, creating a complete authentication cycle for the CLI tool.

---

## User Review Required

> [!IMPORTANT]
> **Password Security**:
> - As per your existing architecture, passwords are currently stored and compared as raw strings. The `cli-login` function will maintain this behavior to ensure compatibility with your current database.

> [!CAUTION]
> **Credential Handling**:
> - The CLI should NEVER store the user's password locally. It should only store the returned API Key (token) securely for future requests.

## Verification Plan

### CLI Login Test
- **Invalid Credentials**: POST to `/cli-login` with wrong password. (Expect 401).
- **Valid Login**: POST valid `sellerId` and `password`. (Expect 200 + `apiKey`).
- **Token Persistence**: Use the returned `apiKey` to call `add-product`. Verify successful authorization.

### Security Audit
- Verify that no Firestore administrative secrets are exposed in the CLI response.
- Verify that the `sellerId` is derived server-side from the API Key, preventing account impersonation.
