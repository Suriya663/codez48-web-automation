/**
 * CODEZ48 TERMINAL PROCESS MANAGER
 * Spawns and manages non-blocking development servers and processes with log buffering & port detection.
 */

const { spawn } = require('child_process');

class ProcessManager {
    constructor() {
        this.activeProcess = null; // { child, pid, command, cwd, port, stdout, stderr, startTime, exited, exitCode }
        this.logBuffer = [];
        this.maxBufferLines = 200;
    }

    writeToProcess(input) {
        if (this.activeProcess && !this.activeProcess.exited && this.activeProcess.child.stdin) {
            this.activeProcess.child.stdin.write(input + '\n');
            console.log(`\x1b[36m[INPUT PROVIDED] ${input}\x1b[0m`);
            return true;
        }
        return false;
    }

    startProcess(command, cwd) {
        // Stop previous server if running in same session
        this.stopActiveProcess();

        this.logBuffer = [];
        const isWin = process.platform === 'win32';
        const shellCmd = isWin ? 'cmd.exe' : '/bin/sh';
        const shellArgs = isWin ? ['/s', '/c', command] : ['-c', command];

        const freePort = 3000 + Math.floor(Math.random() * 5000);
        console.log(`\n\x1b[34m[PROCESS START] ${command}\x1b[0m`);
        console.log(`\x1b[90mWorking dir: ${cwd} (Environment PORT=${freePort})\x1b[0m\n`);

        const child = spawn(shellCmd, shellArgs, {
            cwd,
            env: { ...process.env, PORT: String(freePort), FORCE_COLOR: 'true' },
            detached: false
        });

        this.activeProcess = {
            child,
            pid: child.pid,
            command,
            cwd,
            port: null,
            stdout: '',
            stderr: '',
            startTime: new Date(),
            exited: false,
            exitCode: null
        };

        child.stdout.on('data', (data) => {
            const str = data.toString();
            this.appendLog('STDOUT', str);
            this.detectPort(str);
        });

        child.stderr.on('data', (data) => {
            const str = data.toString();
            this.appendLog('STDERR', str);
            this.detectPort(str);
        });

        child.on('exit', (code) => {
            if (this.activeProcess) {
                this.activeProcess.exited = true;
                this.activeProcess.exitCode = code;
                console.log(`\n\x1b[33m[PROCESS EXITED] Code: ${code}\x1b[0m`);
            }
        });

        child.on('error', (err) => {
            this.appendLog('ERROR', err.message);
            console.error(`\x1b[31m[PROCESS ERROR] ${err.message}\x1b[0m`);
        });

        return this.activeProcess;
    }

    appendLog(type, text) {
        if (!this.activeProcess) return;

        if (type === 'STDERR' || type === 'ERROR') {
            this.activeProcess.stderr += text;
            process.stderr.write(text);
        } else {
            this.activeProcess.stdout += text;
            process.stdout.write(text);
        }

        const lines = text.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                this.logBuffer.push(`[${type}] ${line}`);
                if (this.logBuffer.length > this.maxBufferLines) {
                    this.logBuffer.shift();
                }
            }
        }
    }

    detectPort(text) {
        if (this.activeProcess && this.activeProcess.port) return;

        // Regex patterns for local URLs
        const portRegexes = [
            /http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i,
            /Local:\s+http:\/\/[^\s:]+:(\d+)/i,
            /running on [^\s:]+:(\d+)/i,
            /port (\d+)/i,
            /listening at [^\s:]+:(\d+)/i
        ];

        for (const regex of portRegexes) {
            const match = text.match(regex);
            if (match && match[1]) {
                const port = parseInt(match[1], 10);
                if (port > 1000 && port < 65535) {
                    this.activeProcess.port = port;
                    console.log(`\x1b[32m[PORT DETECTED] Server listening on port ${port}\x1b[0m`);
                    break;
                }
            }
        }
    }

    stopActiveProcess() {
        if (this.activeProcess && !this.activeProcess.exited) {
            try {
                console.log(`\x1b[33m[STOPPING PROCESS] PID: ${this.activeProcess.pid}\x1b[0m`);
                if (process.platform === 'win32') {
                    const { execSync } = require('child_process');
                    execSync(`taskkill /pid ${this.activeProcess.pid} /T /F`, { stdio: 'ignore' });
                } else {
                    this.activeProcess.child.kill('SIGTERM');
                }
            } catch (e) {}
            this.activeProcess.exited = true;
        }
    }

    getLatestLogs(count = 20) {
        return this.logBuffer.slice(-count).join('\n');
    }

    hasError() {
        if (!this.activeProcess) return false;
        if (this.activeProcess.exited && this.activeProcess.exitCode !== 0) return true;
        const errText = this.activeProcess.stderr.toLowerCase();
        return errText.includes('error') || errText.includes('failed') || errText.includes('exception');
    }

    getErrorSummary() {
        if (!this.activeProcess) return '';
        return this.activeProcess.stderr || this.activeProcess.stdout;
    }
}

module.exports = new ProcessManager();
