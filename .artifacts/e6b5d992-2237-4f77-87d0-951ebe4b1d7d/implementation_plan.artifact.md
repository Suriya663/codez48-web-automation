# Implementation Plan - Fix Backend Unhandled Promise Rejections (Quota Exceeded)

The user is seeing a complete failure when chatting via `node cli.js ai`. The error logged is an AWS Lambda / Netlify crash response: `{"errorType":"Error","errorMessage":"8 RESOURCE_EXHAUSTED: Quota exceeded."}`.

This means a Firebase Firestore operation on the backend is failing because the free daily quota has been exceeded, and because the database calls lacked `try/catch` wrappers, they were causing the entire backend Node process to crash before it could even talk to the AI models (Groq/Gemini).

## Proposed Changes

### 1. Robust Firestore Error Handling (`netlify/functions/cli-ai-chat.js`)
- Add `try/catch` blocks around `verifyApiKey` so that if reading from the `api_keys` collection fails (due to quota), it gracefully falls back to anonymous mode instead of crashing.
- Add `try/catch` blocks around all `db.collection(...).set(...)` logging operations (like saving previews or logging requests) so that telemetry failures don't break core AI chat functionality.

---

## Verification Plan
1. Send a direct chat message via `node cli.js ai`.
2. Confirm the backend no longer crashes with `500 Server returned non-JSON` and instead returns a healthy response from the LLM.