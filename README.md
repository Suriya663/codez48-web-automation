# Codez48 - AI Browser Automation System

Codez48 is a high-performance web application featuring a persistent Node.js Playwright Browser Worker Service, real-time Chromium control, stateful multi-tab tracking, AI action planning, and a live browser stream viewer.

---

## System Architecture

```text
CODEZ48 Frontend (tools/index.html)
        ↓
Netlify API Gateway (netlify/functions/trigger-automation.js)
        ↓
Persistent Playwright Worker Service (playwright-worker/server.js)
        ↓
Playwright Chromium Browser → Per-User BrowserContext Isolation → Real Playwright Page Actions
```

---

## Deployment Instructions

### 1. Persistent Playwright Worker Service (`playwright-worker/`)

Serverless hosts (such as Netlify Functions or Vercel) have execution timeouts and do not support long-running Chromium processes or WebSocket servers.

The `playwright-worker/` service MUST be deployed as a standalone always-on Node.js process on a container host such as **Railway**, **Render**, **Fly.io**, or a **VPS**:

```bash
cd playwright-worker
npm install
npx playwright install chromium
npm start
```

### 2. Environment Variables Configuration

In Netlify Dashboard (**Site Settings** → **Environment Variables**):

| Key | Description / Value |
| :--- | :--- |
| **`PLAYWRIGHT_WORKER_URL`** | The public HTTP URL of your deployed Playwright Worker service (e.g., `https://your-worker.up.railway.app/api/runs` or `http://localhost:8080/api/runs` for local dev). |
| **`GROQ_API_KEY`** | Your Groq API Key(s) for AI action planning. |
| **`FIREBASE_SERVICE_ACCOUNT`** | Your Firebase Admin Service Account JSON string for project `nshandlooms-a19be`. |

> [!CAUTION]
> **API Key Rotation Notice**: Any API keys previously exposed in source control should be rotated immediately in your [Groq Dashboard](https://console.groq.com/).

---

## Verification & Health Check

To verify your Playwright Worker service status:
- Visit `GET /health` on your worker URL (e.g. `http://localhost:8080/health`).
- It will return:
  ```json
  {
    "service": "Codez48 Playwright Worker",
    "status": "online",
    "browserConnected": true,
    "activeRunsCount": 0
  }
  ```
