/**
 * CODEZ48 VS CODE & TERMINAL ACTIONS
 * Opens the exact active project path in VS Code and launches dedicated PowerShell terminal.
 */

const path = require('path');
const { exec } = require('child_process');
const workspaceManager = require('../core/workspace-manager');

class VsCodeActions {
    openProject(targetPath = null) {
        const projectDir = targetPath || workspaceManager.getActiveProject();
        console.log(`\x1b[34m[VS CODE] Opening: ${projectDir}\x1b[0m`);

        return new Promise((resolve) => {
            exec(`code "${projectDir}"`, (err) => {
                if (err) {
                    console.error('\x1b[31m[ERROR] VS Code (code) command not found in system PATH.\x1b[0m');
                    resolve({ success: false, error: 'VS Code command not found in PATH' });
                } else {
                    resolve({ success: true, path: projectDir });
                }
            });
        });
    }

    /**
     * Launches a dedicated PowerShell terminal pinned directly to the active project path,
     * navigates automatically, and auto-executes the project with dependency self-healing.
     */
    openTerminal(targetPath = null) {
        const projectDir = targetPath || workspaceManager.getActiveProject();
        if (process.platform === 'win32' && process.env.TEST_MODE !== 'true') {
            try {
                const cleanDir = path.resolve(projectDir).replace(/'/g, "''");
                const startupCmd = `Set-Location ''${cleanDir}''; Write-Host ''=== CODEZ48 PILOT PROJECT TERMINAL ==='' -ForegroundColor Cyan; Write-Host ''Directory: ${cleanDir}'' -ForegroundColor Green; if (Test-Path package.json) { if (-not (Test-Path node_modules)) { Write-Host ''Installing dependencies (npm install)...'' -ForegroundColor Yellow; npm install }; Write-Host ''Starting project...'' -ForegroundColor Green; if (Select-String -Path package.json -Pattern ''"start":'') { npm start } else { node server.js } } elseif (Test-Path server.js) { node server.js } elseif (Test-Path app.py) { python app.py } elseif (Test-Path index.html) { Start-Process index.html }`;
                exec(`powershell.exe -NoProfile -Command "Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', '${startupCmd}'"`).unref();
            } catch (_) {}
        }
    }
}

module.exports = new VsCodeActions();
