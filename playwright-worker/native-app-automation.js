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
