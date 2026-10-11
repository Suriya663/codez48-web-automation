const koffi = require('koffi');

let keybd_event = null;
let FindWindowW = null;
let SetForegroundWindow = null;

try {
    const user32 = koffi.load('user32.dll');
    keybd_event = user32.func('void keybd_event(uint8_t bVk, uint8_t bScan, uint32 dwFlags, uint64 dwExtraInfo)');
    FindWindowW = user32.func('void *FindWindowW(string lpClassName, string lpWindowName)');
    SetForegroundWindow = user32.func('bool SetForegroundWindow(void *hWnd)');
} catch (e) {}

class WindowManager {
    altTab() {
        if (!keybd_event) return;
        // Alt down, Tab down, Tab up, Alt up
        keybd_event(0x12, 0, 0, 0); // Alt
        keybd_event(0x09, 0, 0, 0); // Tab
        const s = Date.now(); while (Date.now() - s < 50) {}
        keybd_event(0x09, 0, 2, 0);
        keybd_event(0x12, 0, 2, 0);
    }

    focusWindow(titleSubstring) {
        if (!FindWindowW || !SetForegroundWindow) return false;
        try {
            const hwnd = FindWindowW(null, titleSubstring);
            if (hwnd) {
                SetForegroundWindow(hwnd);
                return true;
            }
        } catch (e) {}
        return false;
    }
}

module.exports = new WindowManager();
