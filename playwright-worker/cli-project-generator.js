const fs = require('fs');
const path = require('path');
const os = require('os');
const terminalExecutor = require('./terminal-executor');

class CliProjectGenerator {
    constructor() {
        this.baseDir = path.resolve(__dirname, '../pilot-workspace/projects');
    }

    async generateProject(aiPlan) {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }

        const projectName = `project_${Date.now()}`;
        const projectDir = path.join(this.baseDir, projectName);
        fs.mkdirSync(projectDir, { recursive: true });

        console.log(`[45%] Generating source files...`);

        for (const file of aiPlan.files || []) {
            const filePath = path.join(projectDir, file.path);
            const dirName = path.dirname(filePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            fs.writeFileSync(filePath, file.content, 'utf8');
            console.log(`Created: ${file.path}`);
        }

        console.log(`[60%] Saving and validating files...`);
        await this.validateSyntax(projectDir);

        console.log(`[70%] Opening VS Code workspace...`);
        await this.openVsCode(projectDir);

        if (aiPlan.dependencies && aiPlan.dependencies.length > 0) {
            console.log(`[80%] Installing required dependencies...`);
            await this.installDependencies(projectDir, aiPlan.dependencies);
        }

        return {
            projectDir,
            startCommand: aiPlan.startCommand || null
        };
    }

    async validateSyntax(projectDir) {
        if (!fs.existsSync(projectDir)) return;
        const entries = fs.readdirSync(projectDir, { recursive: true });
        for (const entry of entries) {
            const relPath = String(entry);
            if ((relPath.endsWith('.js') || relPath.endsWith('.mjs')) && !relPath.includes('node_modules')) {
                const absPath = path.join(projectDir, relPath);
                if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
                    const checkRes = await terminalExecutor.runCommand('node', ['--check', absPath], projectDir);
                    if (checkRes.exitCode !== 0) {
                        throw new Error(`Syntax check failed for ${relPath}:\n${checkRes.stderr}`);
                    }
                }
            }
        }
    }

    async installDependencies(projectDir, dependencies) {
        if (dependencies.length === 0) return;

        try {
            if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
                await terminalExecutor.runCommand('npm', ['init', '-y'], projectDir);
            }

            let installCommand = 'install';
            if (fs.existsSync(path.join(projectDir, 'package-lock.json')) || fs.existsSync(path.join(projectDir, 'npm-shrinkwrap.json'))) {
                if (dependencies.length === 1 && dependencies[0] === '--only=production') {
                     installCommand = 'ci';
                }
            }

            console.log(`Running npm ${installCommand} ${dependencies.join(' ')}`);
            const installRes = await terminalExecutor.runCommand('npm', [installCommand, ...dependencies], projectDir);
            if (installRes.exitCode !== 0) {
                console.error(`Dependency installation error: ${installRes.stderr}`);
            } else {
                console.log(installRes.stdout);
            }
        } catch (error) {
            console.error(`Dependency installation failed: ${error.message}`);
            throw error;
        }
    }

    async openVsCode(projectDir) {
        try {
            const checkCmd = os.platform() === 'win32' ? 'where' : 'which';
            const checkStatus = await terminalExecutor.runCommand(checkCmd, ['code'], process.cwd());

            if (checkStatus.exitCode !== 0) {
                 console.error('[VS CODE ERROR] The "code" command was not found in PATH. Ensure Visual Studio Code is installed and in your environment variables.');
                 return;
            }

            console.log(`Opening Modified Project in VS Code...`);

            const { spawn } = require('child_process');
            const useShell = os.platform() === 'win32';
            const codeProc = spawn(useShell ? 'code.cmd' : 'code', [projectDir], { stdio: 'ignore', windowsHide: false, detached: true, shell: useShell });

            codeProc.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    console.error('[VS CODE ERROR] Failed to spawn VS Code process.');
                } else {
                    console.error('[VS CODE ERROR]', err.message);
                }
            });
            codeProc.unref();

        } catch (e) {
            console.error('[VS CODE ERROR] Failed to check VS Code:', e.message);
        }
    }

    async startApplication(projectDir, startCommand) {
        if (!startCommand) return null;

        console.log(`[90%] Running program and tests... (${startCommand})`);
        const parts = startCommand.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        const result = await terminalExecutor.startAndMonitor(cmd, args, projectDir, 2000);

        if (result.status === 'closed' && result.exitCode !== 0) {
            throw new Error(result.stderr || `Process exited with code ${result.exitCode}`);
        } else if (result.status === 'error') {
            throw new Error(result.stderr || 'Failed to start process');
        }

        return result.child;
    }
}

module.exports = new CliProjectGenerator();