# Codez48 CLI AI Chat Integration Plan

Adding a continuous interactive AI chat feature to the Codez48 CLI, powered by the existing backend AI infrastructure.

## 1. Backend Infrastructure (Netlify)

### [NEW] `cli-ai-chat.js`
A dedicated Netlify Function to handle CLI-based AI requests.
- **Security**: Validates the `x-api-key` header to ensure only authenticated sellers can use the service.
- **AI Logic**: Reuses the existing `GROQ_API_KEY` and `GEMINI_API_KEY` configuration.
- **Context Support**: Accepts an array of messages to maintain conversation context.
- **Standardized Response**: Always returns `application/json` with a `success` flag and the AI's `answer`.

## 2. CLI Extension (codez48cli)

### [MODIFY] `cli.js`
- **New Command**: `codez48 ai`.
- **Interactive Loop**: Implements a continuous `You:` -> `Thinking...` -> `AI:` cycle using the `node:readline/promises` interface.
- **Context Management**: Maintains up to 10 previous message pairs in memory during the session.
- **Graceful Exit**: Handles `Ctrl+C` (SIGINT) to close the session cleanly with a professional message.

## 3. Website Documentation

### [MODIFY] `cli.html`
- Added an **AI Chat Interface** section documenting the `codez48 ai` command.
- Updated the **Terminal Visual** mockup to showcase the interactive AI conversation.
- Included the command in the **Full Reference** table.

---

## User Review Required

> [!IMPORTANT]
> **API Quota**: AI chat requests will be subject to standard API rate limits. High-volume usage may trigger throttling from the AI providers (Groq/Gemini).

> [!WARNING]
> **Context Window**: To keep requests performant, only the last 10 interactions are preserved in the session context. Restarting the chat (`Ctrl+C` and running `codez48 ai` again) will clear the history.

## Verification Plan

### Local Development Tests
1.  **Auth Check**: Run `node cli.js ai` without logging in. Verify rejection.
2.  **Interaction**: Start the chat and ask "Hello". Verify response.
3.  **Context**: Ask "My name is User", then "What is my name?". Verify context retention.
4.  **Exit**: Press `Ctrl+C` and verify clean exit.
5.  **Secrets**: Verify that NO API keys are logged or returned to the CLI.
