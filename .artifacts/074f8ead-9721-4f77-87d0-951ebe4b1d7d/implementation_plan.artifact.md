# AI Website Generation & Live Preview Implementation Plan

Adding the capability to generate full websites and provide live preview URLs directly from the Codez48 CLI AI chat.

## 1. Backend Infrastructure (Netlify & Firestore)

### [NEW] `generated_websites` Collection
Stores the code for AI-generated projects.
- `projectId`: Unique random slug (e.g., `a8k29x`).
- `ownerId`: Seller UID (derived from API Key).
- `html`: The full generated HTML (including inline CSS/JS).
- `prompt`: The user's original request.
- `createdAt`, `updatedAt`: Timestamps.

### [MODIFY] `netlify/functions/cli-ai-chat.js`
- **Intent Detection**: Add a system instruction to detect website generation requests.
- **Generation Logic**: If a website is requested, the AI will be instructed to return the code in a structured format (JSON within the response or a specific block).
- **Persistence**: Save the generated code to Firestore and return a `projectId`.
- **Update Support**: Accept an optional `projectId` in the request to update an existing project.

### [NEW] `netlify/functions/preview-website.js`
- **Function**: Retrieves the HTML from Firestore based on the `projectId` provided in the query string.
- **Response**: Returns the content with `Content-Type: text/html`.
- **Security**: Basic sanitization and security headers to isolate the preview.

### [MODIFY] `netlify.toml`
- Add a redirect rule: `/preview/:id  /.netlify/functions/preview-website?id=:id  200`.

## 2. CLI Extension (codez48cli)

### [MODIFY] `cli.js`
- **State Management**: Keep track of `currentProjectId` during the AI session.
- **Visual Feedback**: When `isWebsite` is detected in the response:
    - Display "Creating your website..."
    - Simulate "Generating HTML/CSS/JS..." steps for a premium feel.
    - Display the final Preview URL.
- **Context**: Pass the `currentProjectId` to the backend for all subsequent messages in the session to allow follow-up edits.

## 3. Website Documentation

### [MODIFY] `cli.html`
- Update the **AI Chat Interface** section to document the new website generation feature.
- Example: "You can now say 'Create a landing page for a coffee shop' and get a live URL instantly."

---

## User Review Required

> [!IMPORTANT]
> **Data Persistence**: Previews are stored in Firestore. This ensures they are available permanently unless manually deleted from the database.

> [!WARNING]
> **Security Isolation**: Previews will be served from `codez48.netlify.app/preview/:id`. Since they share the main domain, generated scripts will have access to the same-origin scope. We will mitigate this by not storing sensitive main-site data in accessible browser storage (cookies/localStorage) where possible, but users should be aware that generated code is live.

## Verification Plan

### Local Development Tests
1.  **Generation**: Ask `codez48 ai` to "Create a personal portfolio for Suriya".
2.  **Preview**: Copy the returned URL and open it in a browser. Verify the content renders correctly.
3.  **Edits**: Ask "Make the text color blue" and verify the *same* URL reflects the change upon refresh.
4.  **Ownership**: Verify that project IDs are random and unique.
5.  **Graceful Fallback**: Verify that normal questions (e.g., "What is 2+2?") still return simple text answers without creating projects.
