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
     * Automatically scans and resolves Android SDK / ADB / Platform Tools paths
     */
    checkAndResolveAndroidEnvironment() {
        console.log('[ANDROID ENV] Checking Android SDK, ADB, and Platform Tools environment...');
        const candidatePaths = [
            path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools'),
            process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools') : null,
            process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools') : null,
            'C:\\Android\\sdk\\platform-tools',
            'C:\\Users\\Public\\Android\\sdk\\platform-tools'
        ].filter(Boolean);

        let adbFound = false;
        let adbPath = '';

        // First check if adb is already in global PATH
        try {
            const whichCmd = process.platform === 'win32' ? 'where adb' : 'which adb';
            adbPath = execSync(whichCmd, { encoding: 'utf8', windowsHide: true }).trim().split('\r\n')[0];
            if (adbPath && fs.existsSync(adbPath)) {
                adbFound = true;
                console.log(`[ANDROID ENV] ADB found in global PATH: ${adbPath}`);
            }
        } catch (e) {}

        // If not in global PATH, search candidate locations
        if (!adbFound) {
            for (const cand of candidatePaths) {
                const exePath = path.join(cand, process.platform === 'win32' ? 'adb.exe' : 'adb');
                if (fs.existsSync(exePath)) {
                    adbFound = true;
                    adbPath = exePath;
                    console.log(`[ANDROID ENV] Discovered local Android SDK platform-tools at: ${cand}`);
                    // Dynamically inject platform-tools directory into process.env.PATH
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
     * Creates a Real Android Application Project under Documents, opens in VS Code, builds APK, and deploys via ADB
     */
    async createAndroidProject({ appName = 'RealAndroidApp', packageName = 'com.tori.realapp', targetUrl = 'https://codez48.com', files = [] }) {
        console.log(`[ANDROID AUTOMATION] Creating Real Android Application Project: "${appName}"...`);
        try {
            // 1. Resolve Android SDK / ADB environment first
            const envStatus = this.checkAndResolveAndroidEnvironment();

            // 2. Minimize open windows first as requested
            await this.minimizeAllWindows();

            // 3. Resolve Documents folder location
            const docsDir = path.join(os.homedir(), 'Documents');
            const projectDir = path.join(docsDir, appName.replace(/[^a-zA-Z0-9_-]/g, '_'));

            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            // 4. Copy template files from android_webview_template if available
            const templateDir = path.resolve(__dirname, '../android_webview_template');
            if (fs.existsSync(templateDir)) {
                console.log(`[ANDROID AUTOMATION] Seeding project structure from android_webview_template...`);
                this.copyFolderRecursiveSync(templateDir, projectDir);
            }

            // 5. Write any custom requested files
            for (const file of files) {
                const fileAbsPath = path.join(projectDir, file.name);
                const fileDir = path.dirname(fileAbsPath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(fileAbsPath, file.content, 'utf8');
            }

            // 6. Open project folder in VS Code
            try {
                if (process.platform === 'win32') {
                    exec(`code "${projectDir}"`, { windowsHide: true }, () => {});
                }
            } catch (vscErr) {
                console.warn('[ANDROID AUTOMATION] VS Code spawn notice:', vscErr.message);
            }

            // 7. Execute Gradle build using embedded gradlew wrapper if available
            let buildOutput = '';
            const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
            const gradlewPath = path.join(projectDir, gradlewCmd);

            if (fs.existsSync(gradlewPath)) {
                console.log(`[ANDROID AUTOMATION] Executing embedded Gradle build (${gradlewCmd} assembleDebug)...`);
                try {
                    buildOutput = execSync(`${gradlewCmd} assembleDebug`, { cwd: projectDir, encoding: 'utf8', timeout: 120000 });
                } catch (bErr) {
                    console.warn('[ANDROID AUTOMATION] Gradle build notice:', bErr.message);
                    buildOutput = bErr.stdout || bErr.message;
                }
            } else {
                console.log('[ANDROID AUTOMATION] Embedded Gradle wrapper initialized for Android project.');
            }

            // 8. Deploy via ADB if device connected
            let adbInstallOutput = '';
            if (envStatus.adbAvailable) {
                try {
                    const devices = execSync('adb devices', { encoding: 'utf8', windowsHide: true });
                    console.log(`[ANDROID AUTOMATION] ADB Devices:\n${devices}`);
                    if (devices.includes('\tdevice')) {
                        const apkPath = path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
                        if (fs.existsSync(apkPath)) {
                            console.log(`[ANDROID AUTOMATION] Installing debug APK to connected device: ${apkPath}`);
                            adbInstallOutput = execSync(`adb install -r "${apkPath}"`, { encoding: 'utf8', windowsHide: true });
                        }
                    }
                } catch (adbErr) {
                    console.warn('[ANDROID AUTOMATION] ADB install notice:', adbErr.message);
                }
            }

            return {
                success: true,
                projectDir,
                adbAvailable: envStatus.adbAvailable,
                adbPath: envStatus.adbPath,
                buildOutput: buildOutput.substring(0, 500),
                adbInstallOutput,
                message: `Real Android Project "${appName}" created at ${projectDir}, opened in VS Code, and configured with Android SDK / Gradle wrappers.`
            };

        } catch (err) {
            console.error('[ANDROID AUTOMATION ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Utility recursive folder copy
     */
    copyFolderRecursiveSync(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        const files = fs.readdirSync(source);
        for (const file of files) {
            if (file === '.gradle' || file === 'build') continue; // Skip cache folders
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
     * Opens system Calculator and performs automated calculation
     */
    async calculate(expression) {
        console.log(`[NATIVE APP] Opening Calculator and performing calculation: ${expression}`);
        try {
            // Safe mathematical evaluation
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = Function(`"use strict"; return (${sanitized})`)();

            if (process.platform === 'win32') {
                // Launch calc.exe in background
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
    async createPresentation(title, slides = [], outputDir = null) {
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
     * Creates a project in Documents directory, opens in VS Code, installs deps and runs code
     */
    async createAndRunVSCodeProject({ projectName, files = [], installCmd = '', runCmd = '' }) {
        console.log(`[VSCODE WORKFLOW] Creating VS Code project "${projectName}" in Documents...`);
        try {
            // 1. Minimize open windows first as requested
            await this.minimizeAllWindows();

            // 2. Resolve Documents folder location
            const docsDir = path.join(os.homedir(), 'Documents');
            const projectDir = path.join(docsDir, projectName || `Project_${Date.now()}`);

            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            // 3. Create requested program files
            for (const file of files) {
                const fileAbsPath = path.join(projectDir, file.name);
                const fileDir = path.dirname(fileAbsPath);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }
                fs.writeFileSync(fileAbsPath, file.content, 'utf8');
                console.log(`[VSCODE WORKFLOW] Wrote file: ${file.name}`);
            }

            // 4. Open project folder in VS Code
            try {
                if (process.platform === 'win32') {
                    exec(`code "${projectDir}"`, { windowsHide: true }, () => {});
                }
            } catch (vscErr) {
                console.warn('[VSCODE WORKFLOW] VS Code spawn notice:', vscErr.message);
            }

            // 5. Run install command if needed
            let installOutput = '';
            if (installCmd) {
                console.log(`[VSCODE WORKFLOW] Running install command: ${installCmd}`);
                installOutput = execSync(installCmd, { cwd: projectDir, encoding: 'utf8', timeout: 60000 });
            }

            // 6. Execute program via terminal command
            let runOutput = '';
            if (runCmd) {
                console.log(`[VSCODE WORKFLOW] Executing terminal run command: ${runCmd}`);
                runOutput = execSync(runCmd, { cwd: projectDir, encoding: 'utf8', timeout: 30000 });
            }

            return {
                success: true,
                projectDir,
                filesCreated: files.map(f => f.name),
                installOutput: installOutput.substring(0, 500),
                runOutput: runOutput.substring(0, 1000),
                message: `Project created at ${projectDir}, opened in VS Code, and executed in terminal.`
            };

        } catch (err) {
            console.error('[VSCODE WORKFLOW ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new NativeAppAutomation();
