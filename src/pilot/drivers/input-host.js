const logger = require('../../core/logger');
/**
 * CODEZ48 PERSISTENT WIN32 INPUT HOST
 * Spawns a single long-lived background PowerShell process running User32 P/Invoke (GetCursorPos, SetCursorPos).
 * Communicates via JSON lines over stdin/stdout with zero spawn-per-step overhead and zero CLIXML warnings.
 */

const { spawn } = require('child_process');
const readline = require('readline');

class InputHost {
    constructor() {
        this.proc = null;
        this.rl = null;
        this.callbacks = new Map();
        this.seq = 0;
        this.ready = false;
        this.queue = [];
        this.init();
    }

    init() {
        if (process.platform !== 'win32') return;
        if (this.proc && !this.proc.killed) return;

        try {
            const psCode = `
                $ErrorActionPreference = 'SilentlyContinue';
                $ProgressPreference = 'SilentlyContinue';
                Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinInput { [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint); [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y); [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; } }' -ErrorAction SilentlyContinue;
                [Console]::Out.WriteLine((ConvertTo-Json @{ status = 'ready' } -Compress));

                while($true) {
                    $line = [Console]::In.ReadLine();
                    if ($null -eq $line) { break; }
                    try {
                        $req = $line | ConvertFrom-Json;
                        if ($req.cmd -eq 'get') {
                            $pt = New-Object WinInput+POINT;
                            [WinInput]::GetCursorPos([ref]$pt) | Out-Null;
                            [Console]::Out.WriteLine((ConvertTo-Json @{ id = $req.id; x = $pt.X; y = $pt.Y } -Compress));
                        } elseif ($req.cmd -eq 'set') {
                            [WinInput]::SetCursorPos($req.x, $req.y) | Out-Null;
                            [Console]::Out.WriteLine((ConvertTo-Json @{ id = $req.id; success = $true } -Compress));
                        }
                    } catch {
                        [Console]::Out.WriteLine((ConvertTo-Json @{ id = $req.id; error = $_.Exception.Message } -Compress));
                    }
                }
            `;

            this.proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCode], {
                stdio: ['pipe', 'pipe', 'ignore'],
                windowsHide: true
            });

            this.rl = readline.createInterface({ input: this.proc.stdout });
            this.rl.on('line', (line) => {
                try {
                    const res = JSON.parse(line);
                    if (res.status === 'ready') {
                        this.ready = true;
                        while (this.queue.length > 0) {
                            this.queue.shift()();
                        }
                        return;
                    }
                    const cb = this.callbacks.get(res.id);
                    if (cb) {
                        this.callbacks.delete(res.id);
                        cb(res);
                    }
                } catch (e) {}
            });
        } catch (e) {
            logger.error(`\x1b[31m[INPUT HOST ERROR] ${e.message}\x1b[0m`);
        }
    }

    request(cmd, params = {}) {
        return new Promise((resolve) => {
            const execute = () => {
                const id = ++this.seq;
                this.callbacks.set(id, resolve);
                const payload = JSON.stringify({ id, cmd, ...params }) + '\n';
                try {
                    this.proc.stdin.write(payload);
                } catch (e) {
                    resolve({ error: e.message });
                }
            };

            if (!this.proc || this.proc.killed) {
                this.init();
            }

            if (this.ready) {
                execute();
            } else {
                this.queue.push(execute);
                setTimeout(() => {
                    if (!this.ready) {
                        this.ready = true;
                        while (this.queue.length > 0) {
                            this.queue.shift()();
                        }
                    }
                }, 800);
            }
        });
    }

    async getCursorPos() {
        const res = await this.request('get');
        return { x: res.x || 0, y: res.y || 0 };
    }

    async setCursorPos(x, y) {
        const res = await this.request('set', { x, y });
        return res.success || false;
    }
}

module.exports = new InputHost();
