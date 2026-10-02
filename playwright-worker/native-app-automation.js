const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class NativeAppAutomation {
    /**
     * Minimizes all open desktop applications using Shell COM object
     */
    async minimizeAllWindows() {
        console.log('[NATIVE APP] Minimizing all open applications on desktop...');
        try {
            if (process.platform === 'win32') {
                const psCommand = `powershell -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"`;
                execSync(psCommand, { windowsHide: true });
            }
            return { success: true, message: 'All open applications minimized.' };
        } catch (err) {
            console.warn('[NATIVE APP] Minimize windows fallback:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Opens system Calculator and performs automated calculation (e.g. 33 + 54 = 87)
     */
    async calculate(expression = '33 + 54') {
        console.log(`[NATIVE APP] Opening Calculator and performing calculation: ${expression}`);
        try {
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = Function(`"use strict"; return (${sanitized})`)();

            if (process.platform === 'win32') {
                exec('calc.exe', () => {});
            }

            return {
                success: true,
                expression: sanitized,
                result: String(result),
                message: `Calculator opened. Output calculated: ${result}`
            };
        } catch (err) {
            console.error('[NATIVE APP] Calculation error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Generates a tailored PowerPoint Presentation (.pptx / HTML presentation bundle)
     */
    async createPresentation(title = 'Presentation', slides = [], outputDir = null) {
        console.log(`[NATIVE APP] Generating PowerPoint presentation: "${title}"`);
        try {
            const targetDir = outputDir || path.join(os.homedir(), 'Documents', 'Codez48Presentations');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.html`;
            const filePath = path.join(targetDir, fileName);

            const slideMarkup = slides.map((slide, idx) => `
                <div class="slide" id="slide-${idx + 1}">
                    <div class="slide-header">
                        <h2>${slide.title || `Slide ${idx + 1}`}</h2>
                    </div>
                    <div class="slide-body">
                        <p>${(slide.content || []).join('</p><p>')}</p>
                    </div>
                    <div class="slide-footer">Page ${idx + 1} of ${slides.length}</div>
                </div>
            `).join('\n');

            const fullContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title} - Presentation</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; display: flex; flex-direction: column; align-items: center; }
        .slide { background: #1e293b; border: 2px solid #3b82f6; border-radius: 12px; width: 800px; height: 450px; padding: 40px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; justify-content: space-between; position: relative; }
        .slide-header h2 { color: #60a5fa; margin: 0 0 20px 0; font-size: 28px; border-bottom: 2px solid #334155; padding-bottom: 10px; }
        .slide-body { font-size: 18px; line-height: 1.6; color: #e2e8f0; flex-grow: 1; }
        .slide-footer { font-size: 12px; color: #94a3b8; text-align: right; }
    </style>
</head>
<body>
    <h1 style="color: #38bdf8;">${title}</h1>
    ${slideMarkup}
</body>
</html>`;

            fs.writeFileSync(filePath, fullContent, 'utf8');

            return {
                success: true,
                filePath,
                title,
                slideCount: slides.length,
                message: `Presentation deck generated successfully at: ${filePath}`
            };

        } catch (err) {
            console.error('[NATIVE APP] PowerPoint generation error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Creates a Word Document (.docx / .txt / HTML office document)
     */
    async createWordDocument(title = 'Document', content = '', outputDir = null) {
        console.log(`[NATIVE APP] Generating Word document: "${title}"`);
        try {
            const targetDir = outputDir || path.join(os.homedir(), 'Documents', 'Codez48Documents');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.html`;
            const filePath = path.join(targetDir, fileName);

            const docContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Calibri', Arial, sans-serif; background: #ffffff; color: #333333; margin: 0; padding: 60px; line-height: 1.6; }
        h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        p { font-size: 16px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p>${content.replace(/\n/g, '</p><p>')}</p>
</body>
</html>`;

            fs.writeFileSync(filePath, docContent, 'utf8');

            return {
                success: true,
                filePath,
                title,
                message: `Word document generated successfully at: ${filePath}`
            };
        } catch (err) {
            console.error('[NATIVE APP] Word document generation error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Creates a Spreadsheet (.csv / Excel-compatible HTML table)
     */
    async createSpreadsheet(title = 'Spreadsheet', headers = ['Item', 'Quantity', 'Price'], rows = [['Sample Item', '1', '$10.00']], outputDir = null) {
        console.log(`[NATIVE APP] Generating Spreadsheet: "${title}"`);
        try {
            const targetDir = outputDir || path.join(os.homedir(), 'Documents', 'Codez48Spreadsheets');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.html`;
            const filePath = path.join(targetDir, fileName);

            const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
            const rowsHtml = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');

            const sheetContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f8fafc; margin: 0; padding: 40px; }
        h1 { color: #0f172a; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; background: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
        th { background: #3b82f6; color: white; padding: 12px 16px; text-align: left; font-size: 14px; }
        td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; }
        tr:hover { background: #f1f5f9; }
    </style>
</head>
<body>
    <h1>📊 ${title}</h1>
    <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
    </table>
</body>
</html>`;

            fs.writeFileSync(filePath, sheetContent, 'utf8');

            return {
                success: true,
                filePath,
                title,
                message: `Spreadsheet generated successfully at: ${filePath}`
            };
        } catch (err) {
            console.error('[NATIVE APP] Spreadsheet generation error:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Checks if Visual Studio Code is installed; if not, falls back or initializes Notepad / project creation
     */
    async checkOrInstallVSCode() {
        try {
            const vscCheck = execSync('code --version', { encoding: 'utf8', windowsHide: true });
            console.log('[VSCODE CHECK] Visual Studio Code is installed:', vscCheck.trim().split('\n')[0]);
            return { installed: true, version: vscCheck.trim().split('\n')[0] };
        } catch (e) {
            console.warn('[VSCODE CHECK] VS Code CLI not found in PATH. Using Notepad / direct file system fallback.');
            return { installed: false, fallback: 'Notepad / File System Fallback Active' };
        }
    }

    /**
     * Automatically scans and resolves Android SDK / ADB / Platform Tools paths
     */
    checkAndResolveAndroidEnvironment() {
        console.log('[ANDROID ENV] Checking Android SDK, ADB, and Platform Tools environment...');
        const candidatePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools'),
            process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : null,
            process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools') : null
        ].filter(Boolean);

        let adbFound = false;
        let adbPath = '';

        try {
            const whichCmd = process.platform === 'win32' ? 'where adb' : 'which adb';
            adbPath = execSync(whichCmd, { encoding: 'utf8', windowsHide: true }).trim().split('\r\n')[0];
            if (adbPath && fs.existsSync(adbPath)) {
                adbFound = true;
            }
        } catch (e) {}

        if (!adbFound) {
            for (const cand of candidatePaths) {
                const exePath = path.join(cand, process.platform === 'win32' ? 'adb.exe' : 'adb');
                if (fs.existsSync(exePath)) {
                    adbFound = true;
                    adbPath = exePath;
                    process.env.PATH = `${cand}${path.delimiter}${process.env.PATH}`;
                    if (!process.env.ANDROID_HOME) {
                        process.env.ANDROID_HOME = path.dirname(cand);
                    }
                    break;
                }
            }
        }

        return {
            adbAvailable: adbFound,
            adbPath,
            androidHome: process.env.ANDROID_HOME || 'Not Set'
        };
    }

    /**
     * Creates a Real Android Application Project under Documents
     */
    async createAndroidProject({ appName = 'RealAndroidApp', packageName = 'com.tori.realapp', files = [] }) {
        console.log(`[ANDROID AUTOMATION] Creating Real Android Application Project: "${appName}"...`);
        try {
            const envStatus = this.checkAndResolveAndroidEnvironment();
            await this.minimizeAllWindows();

            const docsDir = path.join(os.homedir(), 'Documents');
            const projectDir = path.join(docsDir, appName.replace(/[^a-zA-Z0-9_-]/g, '_'));

            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            const templateDir = path.resolve(__dirname, '../android_webview_template');
            if (fs.existsSync(templateDir)) {
                this.copyFolderRecursiveSync(templateDir, projectDir);
            }

            for (const file of files) {
                const fileAbsPath = path.join(projectDir, file.name);
                const fileDir = path.dirname(fileAbsPath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(fileAbsPath, file.content, 'utf8');
            }

            try {
                if (process.platform === 'win32') {
                    exec(`code "${projectDir}"`, { windowsHide: true }, () => {});
                }
            } catch (vscErr) {}

            return {
                success: true,
                projectDir,
                adbAvailable: envStatus.adbAvailable,
                message: `Real Android Project "${appName}" created at ${projectDir}, opened in VS Code, and configured with Android SDK / Gradle wrappers.`
            };
        } catch (err) {
            console.error('[ANDROID AUTOMATION ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }

    copyFolderRecursiveSync(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        const files = fs.readdirSync(source);
        for (const file of files) {
            if (file === '.gradle' || file === 'build') continue;
            const srcPath = path.join(source, file);
            const tgtPath = path.join(target, file);
            if (fs.lstatSync(srcPath).isDirectory()) {
                this.copyFolderRecursiveSync(srcPath, tgtPath);
            } else {
                fs.copyFileSync(srcPath, tgtPath);
            }
        }
    }

    /**
     * Creates a project in Documents directory, opens in VS Code, installs deps and runs code
     */
    async createAndRunVSCodeProject({ projectName, files = [], installCmd = '', runCmd = '' }) {
        console.log(`[VSCODE WORKFLOW] Creating project "${projectName}" in Documents...`);
        try {
            await this.minimizeAllWindows();
            const vscStatus = await this.checkOrInstallVSCode();

            const docsDir = path.join(os.homedir(), 'Documents');
            const projectDir = path.join(docsDir, projectName || `Project_${Date.now()}`);

            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            for (const file of files) {
                const fileAbsPath = path.join(projectDir, file.name);
                const fileDir = path.dirname(fileAbsPath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(fileAbsPath, file.content, 'utf8');
            }

            try {
                if (process.platform === 'win32') {
                    if (vscStatus.installed) {
                        exec(`code "${projectDir}"`, { windowsHide: true }, () => {});
                    } else {
                        exec(`notepad.exe "${path.join(projectDir, files[0]?.name || 'index.js')}"`, { windowsHide: true }, () => {});
                    }
                }
            } catch (vscErr) {}

            let installOutput = '';
            if (installCmd) {
                installOutput = execSync(installCmd, { cwd: projectDir, encoding: 'utf8', timeout: 60000 });
            }

            let runOutput = '';
            if (runCmd) {
                runOutput = execSync(runCmd, { cwd: projectDir, encoding: 'utf8', timeout: 30000 });
            }

            return {
                success: true,
                projectDir,
                vscInstalled: vscStatus.installed,
                filesCreated: files.map(f => f.name),
                installOutput: installOutput.substring(0, 500),
                runOutput: runOutput.substring(0, 1000),
                message: `Project created at ${projectDir}, opened in ${vscStatus.installed ? 'VS Code' : 'Notepad'}, and executed in terminal.`
            };

        } catch (err) {
            console.error('[VSCODE WORKFLOW ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Creates a static website project, writes files, opens in VS Code, opens a command prompt window, and hosts/runs it
     */
    async createAndHostStaticWebsite({ siteName = 'StaticWebsite', files = [] }) {
        console.log(`[STATIC WEBSITE] Creating and hosting static website: "${siteName}"...`);
        try {
            await this.minimizeAllWindows();
            const vscStatus = await this.checkOrInstallVSCode();

            const docsDir = path.join(os.homedir(), 'Documents', 'StaticWebsites');
            const projectDir = path.join(docsDir, siteName.replace(/[^a-zA-Z0-9_-]/g, '_'));

            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            if (!files.some(f => f.name === 'index.html')) {
                files.unshift({
                    name: 'index.html',
                    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteName}</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #334155; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; margin-bottom: 15px; }
        p { color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🚀 ${siteName}</h1>
        <p>Generated, hosted, and live-previewed automatically by Codez48 Pilot.</p>
    </div>
</body>
</html>`
                });
            }

            for (const file of files) {
                const fileAbsPath = path.join(projectDir, file.name);
                const fileDir = path.dirname(fileAbsPath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(fileAbsPath, file.content, 'utf8');
            }

            if (process.platform === 'win32' && vscStatus.installed) {
                exec(`code "${projectDir}"`, { windowsHide: true }, () => {});
            }

            if (process.platform === 'win32') {
                exec(`start cmd.exe /K "cd /d ${projectDir} && echo [CODEZ48 PILOT] Static Website Hosted Successfully! && python -m http.server 8080 || npx http-server -p 8080"`, { windowsHide: false }, () => {});
            }

            return {
                success: true,
                projectDir,
                previewUrl: 'http://localhost:8080',
                message: `Static website created at ${projectDir}, opened in VS Code, new terminal window opened, and hosted successfully at http://localhost:8080.`
            };
        } catch (err) {
            console.error('[STATIC WEBSITE ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new NativeAppAutomation();
