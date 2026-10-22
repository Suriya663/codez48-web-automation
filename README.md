# Codez48 CLI & AI Browser Automation System

Codez48 is a powerful developer toolkit and autonomous agent system featuring a persistent Node.js Playwright Browser Worker Service, real-time automation, and a comprehensive CLI.

---

## Codez48 CLI Usage

### Installation
```bash
npm install -g codez48-cli-1.3.3.tgz
```

### Supported Commands

1. **`codez48 --help` / `--version`**
   - Display usage information or current CLI version.

2. **`codez48 open [project-path]`**
   - Validates that the target directory exists and opens it in VS Code using the `code` command. Defaults to the current directory (`.`) if omitted.

3. **`codez48 dev "<task>" --path "<project-path>"`**
   - Runs the AI development workflow: opens the project in VS Code, analyzes the task against project files, proposes an AI execution plan, applies surgical code modifications, and executes verification tests.

4. **`codez48 ai "<prompt>"`**
   - Queries the Netlify Function AI proxy (`https://codez48.netlify.app/.netlify/functions/call-ai`) and returns clean prose answers.

5. **`codez48 pilot "<prompt>"`**
   - Runs autonomous agent workflows, chat generation, code generation, and scraping.

6. **Interactive REPL (`codez48 pilot`)**
   - Starts an interactive conversational session allowing multiple sequential user prompts (`Hi`, `Explain Node.js`, etc.) and clean exit (`exit`).

---

## System Architecture

```text
CODEZ48 CLI / Pilot
        ↓
Netlify Function Proxy (netlify/functions/call-ai.js)
        ↓
Groq API (openai/gpt-oss-120b) / Playwright Worker Service
```
