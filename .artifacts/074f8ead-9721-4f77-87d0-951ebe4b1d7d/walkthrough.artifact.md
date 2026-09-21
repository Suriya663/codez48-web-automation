# Codez48 CLI Autonomous Software Development Agent Walkthrough

The `codez48 ai` command has been upgraded into a multi-language, multi-framework autonomous local software development agent.

## 🌟 Key Architecture & Capabilities

```text
USER GIVES SOFTWARE GOAL ("Create a Node.js Express server")
        │
        ▼
1. Detect Project Adapter (Node, Python, Java, Android, Flutter, .NET, Static Web)
        │
        ▼
2. Inspect Local Environment Tools (node, npm, python, pip, java, javac, gradle, dotnet, flutter, adb)
        │
        ▼
3. Generate Project Plan & Create Workspace (`Desktop/Codez48 Preview/<project-name>`)
        │
        ▼
4. Create & Write Complete Code File-by-File (Smart Targeted Editing without duplicates)
        │
        ▼
5. Detect Required Dependencies & Request Explicit User Approval (`npm install express? (y/n)`)
        │
        ▼
6. Safe Allowlisted Command Execution (`CommandPolicy` Sandbox)
        │
        ▼
7. Non-Blocking Process Management & Port Auto-Detection (`localhost:3000`, `5173`, etc.)
        │
        ▼
8. Automatic Error Detection & Auto-Healing Loop (Read logs -> Read code -> Fix -> Re-run)
        │
        ▼
9. Open Output (Browser for Web, Terminal/App for CLI/Desktop, Emulator for Android)
        │
        ▼
10. Continuous Session (Follow-up prompts update active project without spawning new folders)
```

---

## 🛠️ Architecture & Modules Created

### 1. Core Agent Engine (`src/core/`)
- [workspace-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/workspace-manager.js): Dynamically resolves `Desktop/Codez48 Preview` (including OneDrive Desktop) without hardcoded usernames. Manages active session state (`activeProjectPath`, `activeProcessInfo`, `activePort`) and enforces path traversal security.
- [environment-detector.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/environment-detector.js): Inspects installed developer runtimes and SDKs (`node -v`, `npm -v`, `python --version`, `pip`, `java`, `javac`, `gradle`, `dotnet`, `flutter`, `adb`).
- [command-policy.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/command-policy.js): Enforces allowlisted trusted developer commands (`npm install`, `python app.py`, `dotnet run`, etc.) and blocks arbitrary malicious shell execution.
- [process-manager.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/process-manager.js): Spawns, monitors, and stops background development servers with log buffering, exit tracking, and HTTP port regex detection.
- [agent-controller.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/core/agent-controller.js): Main orchestrator driving goal planning, file generation, dependency prompts, execution, and error healing loop.

### 2. Extensible Project Adapters (`src/adapters/`)
- [base-adapter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/base-adapter.js): Abstract base interface for project drivers.
- [static-web.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/static-web.js): Driver for static HTML/CSS/JS web projects.
- [node.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/node.js): Driver for Node.js, Express, React, Vite, Next.js, and TypeScript.
- [python.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/python.js): Driver for Python, Flask, FastAPI, and Django projects.
- [java.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/java.js): Driver for Java CLI, Maven, and Gradle projects.
- [android.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/android.js): Driver for Android, Kotlin, Gradle Wrapper, and ADB.
- [dotnet.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/dotnet.js): Driver for C# and .NET CLI applications.
- [flutter.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/flutter.js): Driver for Flutter and Dart apps.
- [adapter-factory.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/adapters/adapter-factory.js): Dynamically resolves the best driver for any goal or directory.

### 3. Action Handlers (`src/actions/`)
- [filesystem-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/filesystem-actions.js): Handles file/folder operations with smart targeted editing on existing files.
- [browser-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/browser-actions.js): Health-checks local development servers and launches default system browser.
- [vscode-actions.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/codez48cli/src/actions/vscode-actions.js): Opens exact active project path in VS Code (`code "<activeProjectPath>"`).

---

## 🔒 Security & Safety Controls

> [!IMPORTANT]
> - **No Raw Shell Access**: The remote AI model cannot execute arbitrary shell scripts. Commands pass through `CommandPolicy` validation.
> - **Dependency Approvals**: Dependencies (`npm install <packages>`, `pip install <packages>`) require explicit user approval `(y/n)` before execution.
> - **Path Sandboxing**: Operations are confined to `Desktop/Codez48 Preview` or user-approved project directories.
> - **No Hardcoded Credentials**: System secrets and credentials remain unexposed.

---

## ✅ Verification & Validation

1. **Syntax Check**: All JS modules verified with `node -c` (0 syntax errors).
2. **Adapter Verification**: Verified detection across Node, Python, Java, Android, .NET, Flutter, and Static Web.
3. **Smart File Editing**: Confirmed updates edit existing files rather than spawning `server2.js`.
4. **Command Policy Sandbox**: Allowed valid developer commands (`npm install`, `python app.py`) while blocking dangerous commands (`rm -rf /`, `curl | sh`).
5. **CLI Backward Compatibility**: Verified `codez48 login`, `codez48 list-products`, `codez48 chat`, `codez48 share`, `codez48 tools` work without regression.
