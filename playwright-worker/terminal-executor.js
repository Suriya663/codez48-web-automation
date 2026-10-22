const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

class TerminalExecutor {
    constructor() {
        this.isWin = os.platform() === 'win32';
    }

    /**
     * Resolves the actual JavaScript CLI path for npm/npx on Windows to avoid .cmd shell issues.
     */
    resolveNodeCLI(command) {
        if (!this.isWin) return null;
        try {
            const lines = execSync(`where ${command}`, { stdio: 'pipe' }).toString().split('\n');
            let cmdPath = null;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.toLowerCase().endsWith('.cmd')) {
                    cmdPath = trimmed;
                    break;
                }
            }

            if (cmdPath) {
                const baseDir = path.dirname(cmdPath);
                const jsCliPath = path.join(baseDir, 'node_modules', command, 'bin', `${command}-cli.js`);
                if (fs.existsSync(jsCliPath)) {
                    return jsCliPath;
                }

                if (command === 'npx') {
                    const npxJsCliPath = path.join(baseDir, 'node_modules', 'npm', 'bin', `npx-cli.js`);
                    if (fs.existsSync(npxJsCliPath)) {
                        return npxJsCliPath;
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    /**
     * Executes a command and returns { exitCode, stdout, stderr }
     */
    runCommand(cmd, args = [], cwd = process.cwd(), timeoutMs = 60000) {
        return new Promise((resolve) => {
            let actualCmd = cmd;
            let actualArgs = [...args];
            let useShell = false;

            if (this.isWin) {
                if (cmd === 'npm' || cmd === 'npx') {
                    const cliJsPath = this.resolveNodeCLI(cmd);
                    if (cliJsPath) {
                        actualCmd = process.execPath;
                        actualArgs = [cliJsPath, ...args];
                    } else {
                        actualCmd = `${cmd}.cmd`;
                        useShell = true;
                    }
                } else if (cmd === './gradlew') {
                    actualCmd = 'gradlew.bat';
                    useShell = true;
                }

                if (useShell || actualCmd.toLowerCase().endsWith('.cmd') || actualCmd.toLowerCase().endsWith('.bat')) {
                    const argsString = actualArgs.map(arg => {
                        let s = String(arg);
                        s = s.replace(/"/g, '""');
                        if (/[ \t\n\r&|<>^]/.test(s)) s = `"${s}"`;
                        return s;
                    }).join(' ');

                    const fullCommand = `"${actualCmd}" ${argsString}`;
                    actualArgs = ['/d', '/s', '/c', `"${fullCommand}"`];
                    actualCmd = 'cmd.exe';
                    useShell = false;
                }
            }

            const child = spawn(actualCmd, actualArgs, {
                cwd,
                shell: useShell,
                windowsHide: true,
                windowsVerbatimArguments: this.isWin && actualCmd === 'cmd.exe'
            });

            let stdout = '';
            let stderr = '';

            let timeoutId = null;
            if (timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    try { child.kill('SIGKILL'); } catch (e) {}
                    resolve({ exitCode: 124, stdout, stderr: stderr + '\n[TIMEOUT] Process killed after ' + timeoutMs + 'ms' });
                }, timeoutMs);
            }

            child.stdout.on('data', data => { stdout += data.toString(); });
            child.stderr.on('data', data => { stderr += data.toString(); });

            child.on('error', err => {
                if (timeoutId) clearTimeout(timeoutId);
                if (err.code === 'ENOENT') {
                    resolve({ exitCode: 127, stdout, stderr: `Command not found: ${actualCmd}` });
                } else {
                    resolve({ exitCode: -1, stdout, stderr: err.message });
                }
            });

            child.on('close', code => {
                if (timeoutId) clearTimeout(timeoutId);
                resolve({ exitCode: code, stdout, stderr });
            });
        });
    }

    /**
     * Starts a background process and monitors it for a short duration.
     * Returns { status: 'running'|'closed'|'error', exitCode, stdout, stderr, child }
     */
    startAndMonitor(cmd, args = [], cwd = process.cwd(), waitMs = 2000) {
        return new Promise((resolve) => {
            let actualCmd = cmd;
            let actualArgs = [...args];
            let useShell = false;

            if (this.isWin) {
                if (cmd === 'npm' || cmd === 'npx') {
                    const cliJsPath = this.resolveNodeCLI(cmd);
                    if (cliJsPath) {
                        actualCmd = process.execPath;
                        actualArgs = [cliJsPath, ...args];
                    } else {
                        actualCmd = `${cmd}.cmd`;
                        useShell = true;
                    }
                } else if (cmd === './gradlew') {
                    actualCmd = 'gradlew.bat';
                    useShell = true;
                } else if (cmd === 'code') {
                    actualCmd = 'code.cmd';
                    useShell = true;
                }

                if (useShell || actualCmd.toLowerCase().endsWith('.cmd') || actualCmd.toLowerCase().endsWith('.bat')) {
                    const argsString = actualArgs.map(arg => {
                        let s = String(arg);
                        s = s.replace(/"/g, '""');
                        if (/[ \t\n\r&|<>^]/.test(s)) s = `"${s}"`;
                        return s;
                    }).join(' ');

                    const fullCommand = `"${actualCmd}" ${argsString}`;
                    actualArgs = ['/d', '/s', '/c', `"${fullCommand}"`];
                    actualCmd = 'cmd.exe';
                    useShell = false;
                }
            }

            const child = spawn(actualCmd, actualArgs, {
                cwd,
                shell: useShell,
                detached: false,
                windowsHide: true,
                windowsVerbatimArguments: this.isWin && actualCmd === 'cmd.exe'
            });

            let stdout = '';
            let stderr = '';
            let resolved = false;

            child.stdout.on('data', d => { stdout += d.toString(); });
            child.stderr.on('data', d => { stderr += d.toString(); });

            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    child.unref();
                    resolve({ status: 'running', exitCode: null, stdout, stderr, child });
                }
            }, waitMs);

            child.on('error', err => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ status: 'error', exitCode: -1, stdout, stderr: err.message, child: null });
                }
            });

            child.on('close', code => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({ status: 'closed', exitCode: code, stdout, stderr, child: null });
                }
            });
        });
    }

    /**
     * Spawns a visible terminal window (PowerShell on Win, inline on Linux) and waits for completion.
     */
    runVisibleWait(cmd, args = [], cwd = process.cwd()) {
        return new Promise((resolve) => {
            if (this.isWin) {
                const tempPs1 = path.join(os.tmpdir(), `run_${Date.now()}.ps1`);

                const formattedArgs = args.map(a => {
                    const s = String(a);
                    return `'${s.replace(/'/g, "''")}'`;
                }).join(' ');

                const psContent = `Write-Host "Codez48 AI Processing..." -ForegroundColor Cyan\n& "${cmd}" ${formattedArgs}\n`;
                fs.writeFileSync(tempPs1, psContent, 'utf8');

                const child = spawn('cmd.exe', ['/c', 'start', '/wait', 'powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tempPs1], {
                    cwd,
                    windowsHide: true
                });

                child.on('close', code => {
                    try { fs.unlinkSync(tempPs1); } catch(e){}
                    resolve({ exitCode: code });
                });
            } else {
                const child = spawn(cmd, args, { cwd, stdio: 'inherit' });
                child.on('close', code => resolve({ exitCode: code }));
            }
        });
    }
}

module.exports = new TerminalExecutor();