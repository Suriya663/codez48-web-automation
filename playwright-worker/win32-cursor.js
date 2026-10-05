const koffi = require('koffi');

let GetCursorPos = null;
let SetCursorPos = null;
let mouse_event = null;
let FindWindowW = null;
let SetForegroundWindow = null;

try {
    const user32 = koffi.load('user32.dll');
    const POINT = koffi.struct('POINT', {
        x: 'long',
        y: 'long'
    });
    GetCursorPos = user32.func('bool GetCursorPos(_Out_ POINT *lpPoint)');
    SetCursorPos = user32.func('bool SetCursorPos(int X, int Y)');
    mouse_event = user32.func('void mouse_event(uint32 dwFlags, long dx, long dy, uint32 dwData, uint64 dwExtraInfo)');
    FindWindowW = user32.func('void *FindWindowW(string lpClassName, string lpWindowName)');
    SetForegroundWindow = user32.func('bool SetForegroundWindow(void *hWnd)');
} catch (e) {
    console.warn('[WIN32 CURSOR WARNING]: Failed to load user32.dll bindings:', e.message);
}

function getCursor() {
    const t0 = process.hrtime();
    if (!GetCursorPos) {
        throw new Error("cursor measurement unavailable");
    }
    const pt = { x: 0, y: 0 };
    const success = GetCursorPos(pt);
    const dt = process.hrtime(t0);
    const ms = dt[0] * 1000 + dt[1] / 1000000;

    if (!success) {
        throw new Error("cursor measurement unavailable");
    }
    return { x: pt.x, y: pt.y, latencyMs: ms };
}

function setCursor(x, y) {
    if (!SetCursorPos) {
        throw new Error("cursor movement unavailable");
    }
    SetCursorPos(Math.round(x), Math.round(y));
}

function simulateClick(x, y) {
    if (!mouse_event) {
        throw new Error("mouse_event unavailable");
    }
    if (x !== undefined && y !== undefined) {
        setCursor(x, y);
    }
    const cur = getCursor();
    const cx = x !== undefined ? x : cur.x;
    const cy = y !== undefined ? y : cur.y;

    const user32 = koffi.load('user32.dll');
    const GetSystemMetrics = user32.func('int GetSystemMetrics(int nIndex)');
    const screenWidth = GetSystemMetrics(0) || 1920;
    const screenHeight = GetSystemMetrics(1) || 1080;

    const absX = Math.round((cx * 65535) / screenWidth);
    const absY = Math.round((cy * 65535) / screenHeight);

    // MOUSEEVENTF_ABSOLUTE (0x8000) | MOUSEEVENTF_LEFTDOWN (0x0002)
    mouse_event(0x8000 | 0x0002, absX, absY, 0, 0);
    const start = Date.now();
    while (Date.now() - start < 50) {}
    // MOUSEEVENTF_ABSOLUTE (0x8000) | MOUSEEVENTF_LEFTUP (0x0004)
    mouse_event(0x8000 | 0x0004, absX, absY, 0, 0);
}

function moveCursorSmoothly(targetX, targetY, steps = 20) {
    const cur = getCursor();
    const startX = cur.x;
    const startY = cur.y;

    for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const ease = 1 - Math.pow(1 - progress, 3);
        const x = startX + (targetX - startX) * ease;
        const y = startY + (targetY - startY) * ease;
        setCursor(x, y);
        const start = Date.now();
        while (Date.now() - start < 10) {}
    }

    const finalPos = getCursor();
    return finalPos;
}

function bringWindowToFront(windowTitle) {
    if (!FindWindowW || !SetForegroundWindow) return;
    try {
        const hwnd = FindWindowW(null, windowTitle);
        if (hwnd) {
            SetForegroundWindow(hwnd);
        }
    } catch (e) {}
}

module.exports = { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront };
