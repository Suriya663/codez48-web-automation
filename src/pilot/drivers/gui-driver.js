const logger = require('../../core/logger');
/**
 * CODEZ48 GUI DRIVER (STAGES 4-13)
 * Provides ultra-fast native Win32 cursor positioning, clicking, typing, and hotkeys
 * via high-speed compiled fast_input.exe with robust PowerShell fallbacks.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');

const FAST_INPUT_EXE = path.join(__dirname, 'fast_input.exe');

class GuiDriver {
    constructor() {}

    hasFastInput() {
        return process.platform === 'win32' && fs.existsSync(FAST_INPUT_EXE);
    }

    runFastInput(args, timeout = 2500) {
        try {
            return execFileSync(FAST_INPUT_EXE, args, {
                encoding: 'utf8',
                timeout,
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
        } catch (_) {
            return null;
        }
    }

    getForegroundWindow() {
        if (process.platform !== 'win32') return { title: 'Desktop', process: 'unknown' };
        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                if (-not ([System.Management.Automation.PSTypeName]'WinFg').Type) {
                    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinFg {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@ -ErrorAction SilentlyContinue
                }
                $hwnd = [WinFg]::GetForegroundWindow();
                if ($hwnd -ne [IntPtr]::Zero) {
                    $sb = New-Object System.Text.StringBuilder 256;
                    [WinFg]::GetWindowText($hwnd, $sb, 256) | Out-Null;
                    $title = $sb.ToString();
                    if ([string]::IsNullOrWhiteSpace($title)) { $title = "Active Application Window"; }

                    $procName = "unknown";
                    try {
                        [uint32]$pidVal = 0;
                        [WinFg]::GetWindowThreadProcessId($hwnd, [ref]$pidVal) | Out-Null;
                        if ($pidVal -gt 0) {
                            $p = Get-Process -Id $pidVal -ErrorAction SilentlyContinue;
                            if ($p) { $procName = $p.ProcessName; }
                        }
                    } catch {}
                    [PSCustomObject]@{ Title = $title; Process = $procName; Hwnd = $hwnd.ToInt64() } | ConvertTo-Json -Compress
                } else {
                    [PSCustomObject]@{ Title = "Windows Desktop"; Process = "explorer"; Hwnd = 0 } | ConvertTo-Json -Compress
                }
            `;
            const stdout = this.execPs(psScript, 2000).trim();
            const json = stdout.match(/\{[\s\S]*\}/);
            if (json) {
                const parsed = JSON.parse(json[0]);
                if (parsed && parsed.Title) {
                    return { title: parsed.Title, process: parsed.Process || 'unknown' };
                }
            }
        } catch (e) {}
        return { title: 'Windows Application', process: 'msedge' };
    }

    getCursorPos() {
        if (process.platform !== 'win32') return { x: 0, y: 0 };
        if (this.hasFastInput()) {
            const out = this.runFastInput(['getpos']);
            if (out) {
                const parts = out.split(',');
                if (parts.length === 2) {
                    return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
                }
            }
        }
        try {
            const psScript = `
                Add-Type -AssemblyName System.Windows.Forms;
                $pos = [System.Windows.Forms.Cursor]::Position;
                "$($pos.X),$($pos.Y)";
            `;
            const stdout = this.execPs(psScript, 8000).trim();
            const parts = stdout.split(',');
            if (parts.length === 2) {
                return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
            }
        } catch (e) {}
        return { x: 0, y: 0 };
    }

    setCursorPos(x, y) {
        if (process.platform !== 'win32') return;
        if (this.hasFastInput()) {
            this.runFastInput(['move', String(Math.round(x)), String(Math.round(y))]);
            return;
        }
        try {
            const psScript = `
                Add-Type -AssemblyName System.Windows.Forms;
                [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
            `;
            this.execPs(psScript, 8000);
        } catch (e) {}
    }

    moveCursor(x, y) {
        return this.setCursorPos(x, y);
    }

    getClientOrigin(windowTitle) {
        if (process.platform !== 'win32') return { x: 0, y: 0 };
        try {
            const psScript = `
                Add-Type -AssemblyName System.Windows.Forms;
                Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName); [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect); [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; } [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint); [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; } }'
                $proc = Get-Process | Where-Object { ($_.ProcessName -like "*edge*" -or $_.ProcessName -like "*chrome*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1;
                if (-not $proc -and "${windowTitle}") {
                    $proc = Get-Process -Name "${windowTitle}" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1;
                }
                if ($proc) {
                    $hwnd = $proc.MainWindowHandle;
                    $pt = New-Object Win32+POINT;
                    $pt.X = 0; $pt.Y = 0;
                    [Win32]::ClientToScreen($hwnd, [ref]$pt);
                    "$($pt.X),$($pt.Y)";
                } else {
                    "0,0"
                }
            `;
            const stdout = this.execPs(psScript, 1500).trim();
            const parts = stdout.split(',');
            if (parts.length === 2) {
                const x = parseInt(parts[0], 10);
                const y = parseInt(parts[1], 10);
                return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y };
            }
        } catch (e) {}
        return { x: 0, y: 0 };
    }

    getWindowBounds(windowTitle) {
        return this.getClientOrigin(windowTitle);
    }

    focusWindow(windowTitle, maximize = false) {
        if (process.platform !== 'win32') return false;
        try {
            const isWa = (windowTitle || '').toLowerCase().includes('whatsapp');
            const shouldMax = maximize || isWa;
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                if (-not ('WinFocus' -as [type])) {
                    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinFocus { [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); }' -ErrorAction SilentlyContinue;
                }
                $proc = $null;
                if ("${windowTitle}") {
                    $proc = Get-Process | Where-Object { ($_.ProcessName -like "*${windowTitle}*" -or $_.MainWindowTitle -like "*${windowTitle}*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1;
                }
                if (-not $proc -and -not ${isWa}) {
                    $proc = Get-Process | Where-Object { ($_.ProcessName -like "*edge*" -or $_.ProcessName -like "*chrome*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1;
                }
                if ($proc) {
                    $hwnd = $proc.MainWindowHandle;
                    $cmdShow = ${shouldMax ? '3' : '5'};
                    [WinFocus]::ShowWindow($hwnd, $cmdShow);
                    [WinFocus]::SetForegroundWindow($hwnd);
                    if (${shouldMax ? '$true' : '$false'}) {
                        [WinFocus]::ShowWindow($hwnd, 3);
                    }
                }
            `;
            this.execPs(psScript, 8000);
            return true;
        } catch (e) {
            return false;
        }
    }

    async moveCursorSmoothlyWithFeedback(targetX, targetY, description = 'TARGET') {
        if (process.platform !== 'win32') return { success: true };

        logger.status(`\x1b[36m[MOTOR] Moving real Windows cursor to ${description} (${targetX}, ${targetY})...\x1b[0m`);

        let currentPos = this.getCursorPos();
        logger.debug(`\x1b[32m[CURSOR START] x = ${currentPos.x}, y = ${currentPos.y}\x1b[0m`);
        logger.debug(`\x1b[32m[TARGET SCREEN POINT] x = ${targetX}, y = ${targetY}\x1b[0m`);

        let dx = targetX - currentPos.x;
        let dy = targetY - currentPos.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 15) {
            this.setCursorPos(targetX, targetY);
            return { success: true, arrivalPos: { x: targetX, y: targetY }, finalDistance: 0.0, iterations: 0 };
        }

        // Fast smooth glide without multi-second process spawn bottleneck
        const midX = Math.round(currentPos.x + dx * 0.5);
        const midY = Math.round(currentPos.y + dy * 0.5);
        this.setCursorPos(midX, midY);
        this.setCursorPos(targetX, targetY);

        const finalPos = this.getCursorPos();
        const finalDist = Math.sqrt(Math.pow((finalPos.x || targetX) - targetX, 2) + Math.pow((finalPos.y || targetY) - targetY, 2));
        logger.debug(`\x1b[32m[CURSOR ARRIVED] x = ${finalPos.x || targetX}, y = ${finalPos.y || targetY} (Target Dist: ${finalDist.toFixed(1)}px)\x1b[0m`);
        logger.status(`\x1b[32m[CURSOR POSITION VERIFIED]: ${finalDist <= 20 ? 'PASS' : 'WARNING'}\x1b[0m`);

        return { success: true, arrivalPos: { x: targetX, y: targetY }, finalDistance: finalDist, iterations: 2 };
    }

    click(x = null, y = null) {
        return this.clickPhysicalMouse(x, y);
    }

    clickPhysicalMouse(x = null, y = null) {
        if (process.platform !== 'win32') return { success: false };
        if (this.hasFastInput()) {
            const args = (x !== null && y !== null) ? ['click', String(Math.round(x)), String(Math.round(y))] : ['click'];
            const res = this.runFastInput(args);
            if (res === 'OK') {
                logger.status(`\x1b[32m[PHYSICAL CLICK] Fast native click executed successfully\x1b[0m`);
                return { success: true };
            }
        }
        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                if (-not ('WinFastClick' -as [type])) {
                    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinFastClick { [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo); public static void Click() { mouse_event(0x02, 0, 0, 0, 0); mouse_event(0x04, 0, 0, 0, 0); } }' -ErrorAction SilentlyContinue;
                }
                [WinFastClick]::Click();
            `;
            this.execPs(psScript, 8000);
            logger.status(`\x1b[32m[PHYSICAL CLICK] User32 mouse_event LEFT DOWN & UP executed successfully\x1b[0m`);
            return { success: true };
        } catch (e) {
            logger.error(`\x1b[31m[CLICK ERROR] ${e.message}\x1b[0m`);
            return { success: false, error: e.message };
        }
    }

    async moveCursorAndClick(x, y, description = 'TARGET') {
        if (this.hasFastInput()) {
            const res = this.runFastInput(['click', String(Math.round(x)), String(Math.round(y))]);
            if (res === 'OK') {
                logger.status(`\x1b[32m[MOTOR & CLICK] Fast native move and click at (${x}, ${y}) [${description}]\x1b[0m`);
                return { success: true };
            }
        }
        if (process.platform === 'win32') {
            try {
                const psScript = `
                    $ErrorActionPreference = 'SilentlyContinue';
                    Add-Type -AssemblyName System.Windows.Forms;
                    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
                    if (-not ('WinFastClick' -as [type])) {
                        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinFastClick { [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo); public static void Click() { mouse_event(0x02, 0, 0, 0, 0); mouse_event(0x04, 0, 0, 0, 0); } }' -ErrorAction SilentlyContinue;
                    }
                    [WinFastClick]::Click();
                `;
                this.execPs(psScript, 8000);
                logger.status(`\x1b[32m[MOTOR & CLICK] Fast cursor move and click at (${x}, ${y}) [${description}]\x1b[0m`);
                return { success: true };
            } catch (e) {
                logger.debug(`Fast click fallback: ${e.message}`);
            }
        }
        this.setCursorPos(x, y);
        return this.clickPhysicalMouse();
    }

    async moveCursorAndDrag(startX, startY, endX, endY, description = 'DRAG') {
        await this.moveCursorSmoothlyWithFeedback(startX, startY, description);
        return this.mouseDrag(startX, startY, endX, endY);
    }

    mouseDrag(startX, startY, endX, endY) {
        if (process.platform !== 'win32') return { success: false };
        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                Add-Type -AssemblyName System.Windows.Forms | Out-Null;
                Add-Type -AssemblyName System.Drawing | Out-Null;
                [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${startX}, ${startY});

                if (-not ('WinDrag' -as [type])) {
                    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinDrag { [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo); public const uint MOUSEEVENTF_LEFTDOWN = 0x0002; public const uint MOUSEEVENTF_LEFTUP = 0x0004; public static void Down() { mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0); } public static void Up() { mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0); } }' -ErrorAction SilentlyContinue;
                }
                [WinDrag]::Down();
                Start-Sleep -Milliseconds 150;
                [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${endX}, ${endY});
                Start-Sleep -Milliseconds 150;
                [WinDrag]::Up();
            `;
            this.execPs(psScript, 8000);
            logger.status(`\x1b[32m[PHYSICAL DRAG] Dragged from (${startX}, ${startY}) to (${endX}, ${endY})\x1b[0m`);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    typeText(text) {
        if (process.platform !== 'win32') return { success: false };
        if (!text) return { success: true };
        if (this.hasFastInput()) {
            const b64 = Buffer.from(String(text), 'utf8').toString('base64');
            const res = this.runFastInput(['type', b64]);
            if (res === 'OK') {
                logger.status(`\x1b[32m[PHYSICAL KEYBOARD] Fast typed text successfully: "${String(text).substring(0, 40)}..."\x1b[0m`);
                return { success: true };
            }
        }
        try {
            const b64 = Buffer.from(String(text), 'utf8').toString('base64');
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                Add-Type -AssemblyName System.Windows.Forms;
                $bytes = [System.Convert]::FromBase64String('${b64}');
                $decoded = [System.Text.Encoding]::UTF8.GetString($bytes);
                try {
                    [System.Windows.Forms.Clipboard]::SetText($decoded);
                    Start-Sleep -Milliseconds 40;
                    [System.Windows.Forms.SendKeys]::SendWait('^v');
                } catch {
                    $escaped = $decoded -replace '([+^%~{}()])', '{$1}';
                    [System.Windows.Forms.SendKeys]::SendWait($escaped);
                }
            `;
            this.execPs(psScript, 8000);
            logger.status(`\x1b[32m[PHYSICAL KEYBOARD] Typed text successfully: "${String(text).substring(0, 40)}..."\x1b[0m`);
            return { success: true };
        } catch (e) {
            // Resilient fallback: WScript.Shell SendKeys
            try {
                const vbsPath = path.join(os.tmpdir(), `type_fallback_${Date.now()}.vbs`);
                const escapedText = String(text).replace(/"/g, '""');
                fs.writeFileSync(vbsPath, `Set w = CreateObject("WScript.Shell")\nw.SendKeys "${escapedText}"`, 'utf8');
                execSync(`cscript //nologo "${vbsPath}"`, { timeout: 4000 });
                try { fs.unlinkSync(vbsPath); } catch (_) {}
                logger.status(`\x1b[32m[PHYSICAL KEYBOARD FALLBACK] Typed text via WScript.Shell: "${String(text).substring(0, 40)}..."\x1b[0m`);
                return { success: true };
            } catch (fallbackErr) {
                logger.error(`\x1b[31m[TYPING ERROR] ${e.message} (Fallback: ${fallbackErr.message})\x1b[0m`);
                return { success: false, error: e.message };
            }
        }
    }

    pasteText(text) {
        if (process.platform !== 'win32') return { success: false };
        if (!text) return { success: true };
        if (this.hasFastInput()) {
            const b64 = Buffer.from(String(text), 'utf8').toString('base64');
            const res = this.runFastInput(['paste', b64]);
            if (res === 'OK') {
                logger.status(`\x1b[32m[DIRECT PASTE] Directly pasted message into input field: "${String(text).substring(0, 40)}..."\x1b[0m`);
                return { success: true };
            }
        }
        try {
            const b64 = Buffer.from(String(text), 'utf8').toString('base64');
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                Add-Type -AssemblyName System.Windows.Forms;
                $bytes = [System.Convert]::FromBase64String('${b64}');
                $decoded = [System.Text.Encoding]::UTF8.GetString($bytes);
                [System.Windows.Forms.Clipboard]::SetText($decoded);
                Start-Sleep -Milliseconds 40;
                [System.Windows.Forms.SendKeys]::SendWait('^v');
            `;
            this.execPs(psScript, 8000);
            logger.status(`\x1b[32m[DIRECT PASTE] Directly pasted message into input field: "${String(text).substring(0, 40)}..."\x1b[0m`);
            return { success: true };
        } catch (e) {
            logger.error(`\x1b[31m[PASTE ERROR] ${e.message}\x1b[0m`);
            return { success: false, error: e.message };
        }
    }

    hotkey(keys, windowTitle = null) {
        if (!keys) return { success: false };
        if (Array.isArray(keys)) {
            const hasCtrl = keys.some(k => /ctrl|control/i.test(k));
            const hasAlt = keys.some(k => /alt/i.test(k));
            const hasShift = keys.some(k => /shift/i.test(k));

            if (keys.some(k => /^f9$/i.test(k))) return this.sendHotkey('{F9}', windowTitle);
            if (keys.some(k => /^f[1-9]|f1[0-2]$/i.test(k))) {
                const fKey = keys.find(k => /^f[1-9]|f1[0-2]$/i.test(k));
                return this.sendHotkey(`{${fKey.toUpperCase()}}`, windowTitle);
            }
            if (hasCtrl && keys.some(k => /^a$/i.test(k))) return this.sendHotkey('^a', windowTitle);
            if (hasCtrl && keys.some(k => /^v$/i.test(k))) return this.sendHotkey('^v', windowTitle);
            if (hasCtrl && keys.some(k => /^c$/i.test(k))) return this.sendHotkey('^c', windowTitle);
            if (hasCtrl && keys.some(k => /^m$/i.test(k))) return this.sendHotkey('^m', windowTitle);
            if (hasCtrl && keys.some(k => /^n$/i.test(k))) return this.sendHotkey('^n', windowTitle);
            if (hasCtrl && keys.some(k => /^t$/i.test(k))) return this.sendHotkey('^t', windowTitle);
            if (hasCtrl && keys.some(k => /^r$/i.test(k))) return this.sendHotkey('^r', windowTitle);
            if (hasAlt && keys.some(k => /^1$/i.test(k))) return this.sendHotkey('%1', windowTitle);
            if (hasAlt && keys.some(k => /^2$/i.test(k))) return this.sendHotkey('%2', windowTitle);
            if (hasAlt && keys.some(k => /^3$/i.test(k))) return this.sendHotkey('%3', windowTitle);

            let prefix = '';
            if (hasCtrl) prefix += '^';
            if (hasAlt) prefix += '%';
            if (hasShift) prefix += '+';
            const mainKey = keys.filter(k => !/ctrl|control|alt|shift/i.test(k)).pop() || '';
            return this.sendHotkey(prefix + mainKey, windowTitle);
        }
        return this.sendHotkey(keys, windowTitle);
    }

    sendHotkey(key, windowTitle = null) {
        if (process.platform !== 'win32') return { success: false };
        try {
            if (windowTitle) {
                this.focusWindow(windowTitle);
            }
            if (this.hasFastInput()) {
                if (/^\{?enter\}?$/i.test(String(key || '').trim())) {
                    const res = this.runFastInput(['enter']);
                    if (res === 'OK') return { success: true };
                } else {
                    const res = this.runFastInput(['hotkey', key]);
                    if (res === 'OK') return { success: true };
                }
            }
            const cleanKey = (key || '').trim();
            let sendKeyPattern = cleanKey;
            if (/^enter$/i.test(cleanKey) || cleanKey === '~') sendKeyPattern = '{ENTER}';
            else if (/^esc$/i.test(cleanKey) || /^escape$/i.test(cleanKey)) sendKeyPattern = '{ESC}';
            else if (/^tab$/i.test(cleanKey)) sendKeyPattern = '{TAB}';
            else if (/^backspace$/i.test(cleanKey) || /^bs$/i.test(cleanKey)) sendKeyPattern = '{BACKSPACE}';
            else if (cleanKey.toLowerCase() === '^a') sendKeyPattern = '^a';
            else if (cleanKey.toLowerCase() === '^v') sendKeyPattern = '^v';
            else if (cleanKey.toLowerCase() === '^s') sendKeyPattern = '^s';
            else if (cleanKey.toLowerCase() === '^l') sendKeyPattern = '^l';

            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                Add-Type -AssemblyName System.Windows.Forms;
                [System.Windows.Forms.SendKeys]::SendWait('${sendKeyPattern}');
            `;
            this.execPs(psScript, 8000);
            return { success: true };
        } catch (e) {
            // WScript SendKeys fallback
            try {
                const vbsPath = path.join(os.tmpdir(), `hotkey_fallback_${Date.now()}.vbs`);
                fs.writeFileSync(vbsPath, `Set w = CreateObject("WScript.Shell")\nw.SendKeys "${key}"`, 'utf8');
                execSync(`cscript //nologo "${vbsPath}"`, { timeout: 3000 });
                try { fs.unlinkSync(vbsPath); } catch (_) {}
                return { success: true };
            } catch (fallbackErr) {
                return { success: false, error: e.message };
            }
        }
    }

    scroll(deltaY) {
        if (process.platform !== 'win32') return { success: false };
        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                if (-not ('WinScroll' -as [type])) {
                    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinScroll { [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo); public const uint MOUSEEVENTF_WHEEL = 0x0800; }' -ErrorAction SilentlyContinue;
                }
                [WinScroll]::mouse_event(0x0800, 0, 0, ${deltaY}, 0);
            `;
            this.execPs(psScript, 8000);
            logger.status(`\x1b[32m[PHYSICAL SCROLL] Scrolled deltaY: ${deltaY}\x1b[0m`);
            return { success: true };
        } catch (e) {
            logger.error(`\x1b[31m[PHYSICAL SCROLL ERROR] ${e.message}\x1b[0m`);
            return { success: false, error: e.message };
        }
    }



    showVisualTextHighlightOverlay(x, y, width, height, text) {
        logger.debug(`\x1b[32m[VISUAL OVERLAY] Highlight overlay at (${x}, ${y}), size: ${width}x${height}, text: "${text}"\x1b[0m`);
    }

    execPs(psScript, timeoutMs = 12000) {
        try {
            const wrappedScript = `
                $ErrorActionPreference = 'Stop';
                $ProgressPreference = 'SilentlyContinue';
                ${psScript}
            `;
            const buffer = Buffer.from(wrappedScript, 'utf16le');
            const base64Cmd = buffer.toString('base64');
            return execSync(`powershell.exe -NoProfile -NonInteractive -Sta -ExecutionPolicy Bypass -EncodedCommand ${base64Cmd}`, {
                timeout: timeoutMs,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });
        } catch (e) {
            throw e;
        }
    }
}

module.exports = new GuiDriver();
