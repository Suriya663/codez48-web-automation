/**
 * CODEZ48 FOREGROUND LOCK & APPLICATION GUARD
 *
 * Enforces persistent, uninterrupted foreground focus AND Full-Screen (Maximized)
 * mode for WhatsApp during automation.
 * Prevents other applications, desktop notifications, or background tasks from interfering
 * or shifting WhatsApp out of view, and prevents window downscaling.
 *
 * Features:
 *   - Win32 AttachThreadInput bypass to ensure focus acquisition
 *   - ShowWindow SW_MAXIMIZE (3) & ShowWindowAsync SW_MAXIMIZE (3) to keep WhatsApp in full-screen
 *   - BringWindowToTop & SetForegroundWindow
 *   - HWND_TOPMOST pin to keep WhatsApp permanently above other windows
 *   - Continuous background focus monitor (auto-refocuses and enforces maximize if focus drifts)
 */

'use strict';

const { spawnSync } = require('child_process');

class ForegroundLock {
    constructor() {
        this.guardTimer = null;
        this.targetName = 'WhatsApp';
        this.isActive = false;
        this.lastHwnd = null;
    }

    /**
     * Executes PowerShell script synchronously
     */
    _execPs(script, timeout = 3000) {
        try {
            const encoded = Buffer.from(script, 'utf16le').toString('base64');
            const res = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
                encoding: 'utf8',
                timeout
            });
            return (res.stdout || '').trim();
        } catch (_) {
            return '';
        }
    }

    /**
     * Finds the WhatsApp application window HWND, locks it to foreground, and maximizes to full-screen
     */
    lockToForeground(pinTopMost = true, maximize = true) {
        if (process.platform !== 'win32') return true;

        const psScript = `
$ErrorActionPreference = 'SilentlyContinue'

if (-not ('WinFgLock' -as [type])) {
    $def = @'
    using System;
    using System.Runtime.InteropServices;
    using System.Text;

    public class WinFgLock {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
        [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);
        [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
        [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
        [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
        [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
        public const uint SWP_NOSIZE = 0x0001;
        public const uint SWP_NOMOVE = 0x0002;
        public const uint SWP_SHOWWINDOW = 0x0040;
        public const int SW_MAXIMIZE = 3;
        public const int SW_SHOWMAXIMIZED = 3;

        public static IntPtr FindWhatsAppWindow() {
            IntPtr res = IntPtr.Zero;
            EnumWindows((hWnd, lParam) => {
                if (IsWindowVisible(hWnd)) {
                    StringBuilder sb = new StringBuilder(256);
                    GetWindowText(hWnd, sb, 256);
                    string title = sb.ToString();
                    if (!string.IsNullOrEmpty(title) && title.IndexOf("WhatsApp", StringComparison.OrdinalIgnoreCase) >= 0) {
                        res = hWnd;
                        return false;
                    }
                }
                return true;
            }, IntPtr.Zero);
            return res;
        }

        public static bool ForceForeground(IntPtr hWnd, bool pinTop, bool maximizeWindow) {
            if (hWnd == IntPtr.Zero) return false;

            // Enforce Full-Screen Maximized Mode
            if (maximizeWindow) {
                ShowWindow(hWnd, SW_MAXIMIZE);
                ShowWindowAsync(hWnd, SW_MAXIMIZE);
            }

            IntPtr fgHwnd = GetForegroundWindow();
            uint fgThread = GetWindowThreadProcessId(fgHwnd, IntPtr.Zero);
            uint curThread = GetCurrentThreadId();

            if (fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, true);
            }

            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);

            if (fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, false);
            }

            // Re-enforce maximize in foreground
            if (maximizeWindow) {
                ShowWindow(hWnd, SW_MAXIMIZE);
                ShowWindowAsync(hWnd, SW_MAXIMIZE);
            }

            if (pinTop) {
                SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
            }

            return true;
        }

        public static bool UnpinTopMost(IntPtr hWnd) {
            if (hWnd == IntPtr.Zero) return false;
            return SetWindowPos(hWnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
        }
    }
'@
    Add-Type -TypeDefinition $def -ErrorAction SilentlyContinue
}

# 1. Native EnumWindows search for any visible WhatsApp window (covers UWP, WinUI3, Electron, Chrome, Edge)
$foundHwnd = [WinFgLock]::FindWhatsAppWindow()
if ($foundHwnd -ne [IntPtr]::Zero) {
    [WinFgLock]::ForceForeground($foundHwnd, ${pinTopMost ? '$true' : '$false'}, ${maximize ? '$true' : '$false'}) | Out-Null
    Write-Output "LOCKED:$($foundHwnd.ToInt64()):WhatsApp"
    return
}

# 2. Search for dedicated WhatsApp process
$proc = Get-Process | Where-Object { ($_.ProcessName -like "*WhatsApp*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1

# 3. Search for browser window with WhatsApp in title
if (-not $proc) {
    $proc = Get-Process | Where-Object { ($_.MainWindowTitle -like "*WhatsApp*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
}

# 4. Fallback: Search for any Chrome or Edge with WhatsApp
if (-not $proc) {
    $proc = Get-Process | Where-Object { ($_.ProcessName -like "*chrome*" -or $_.ProcessName -like "*msedge*" -or $_.ProcessName -like "*firefox*") -and ($_.MainWindowTitle -like "*WhatsApp*") -and $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
}

if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
    $hwnd = $proc.MainWindowHandle
    [WinFgLock]::ForceForeground($hwnd, ${pinTopMost ? '$true' : '$false'}, ${maximize ? '$true' : '$false'}) | Out-Null
    Write-Output "LOCKED:$($hwnd.ToInt64()):$($proc.ProcessName)"
} else {
    Write-Output "NOT_FOUND"
}
`;

        const out = this._execPs(psScript, 2500);
        if (out.startsWith('LOCKED:')) {
            const parts = out.split(':');
            this.lastHwnd = parts[1];
            return true;
        }
        return false;
    }

    /**
     * Unpin topmost state when automation completes
     */
    releaseLock() {
        return this.releaseTopMost();
    }

    releaseTopMost() {
        if (!this.lastHwnd || process.platform !== 'win32') return;

        const psScript = `
if ('WinFgLock' -as [type]) {
    $hwnd = [IntPtr]::new([int64]${this.lastHwnd})
    [WinFgLock]::UnpinTopMost($hwnd) | Out-Null
}
`;
        this._execPs(psScript, 1500);
    }

    /**
     * Starts continuous background monitor to ensure WhatsApp stays in front and maximized
     */
    startForegroundGuard(intervalMs = 1500, maximize = true) {
        if (this.guardTimer) return;
        this.isActive = true;
        this.lockToForeground(true, maximize);

        this.guardTimer = setInterval(() => {
            if (!this.isActive) return;
            try {
                this.lockToForeground(true, maximize);
            } catch (_) {}
        }, intervalMs);
    }

    /**
     * Stops continuous guard
     */
    stopForegroundGuard() {
        this.isActive = false;
        if (this.guardTimer) {
            clearInterval(this.guardTimer);
            this.guardTimer = null;
        }
        this.releaseTopMost();
    }
}

module.exports = new ForegroundLock();
