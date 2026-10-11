const koffi = require('koffi');

let keybd_event = null;
try {
    const user32 = koffi.load('user32.dll');
    keybd_event = user32.func('void keybd_event(uint8_t bVk, uint8_t bScan, uint32 dwFlags, uint64 dwExtraInfo)');
} catch (e) {}

class KeyboardController {
    async sendShortcut(keys) {
        if (!keybd_event) {
            throw new Error("keybd_event unavailable");
        }

        const parts = keys.split('+').map(k => k.trim().toUpperCase());
        const hasCtrl = parts.includes('CTRL');
        const hasShift = parts.includes('SHIFT');
        const hasAlt = parts.includes('ALT');
        const mainKey = parts[parts.length - 1];

        const vkMap = {
            'TAB': 0x09,
            'BACKSPACE': 0x08,
            'BACK': 0x08,
            'ENTER': 0x0D,
            'RETURN': 0x0D,
            'ESC': 0x1B,
            'ESCAPE': 0x1B,
            'SPACE': 0x20,
            'DELETE': 0x2E
        };

        let vk = 0x0D;
        if (mainKey.length === 1) {
            vk = mainKey.charCodeAt(0);
        } else if (vkMap[mainKey]) {
            vk = vkMap[mainKey];
        }

        if (hasCtrl) keybd_event(0x11, 0, 0, 0); // Control down
        if (hasShift) keybd_event(0x10, 0, 0, 0); // Shift down
        if (hasAlt) keybd_event(0x12, 0, 0, 0); // Alt down

        keybd_event(vk, 0, 0, 0); // Key down
        const s = Date.now(); while (Date.now() - s < 50) {}
        keybd_event(vk, 0, 2, 0); // Key up (KEYEVENTF_KEYUP = 0x0002)

        if (hasAlt) keybd_event(0x12, 0, 2, 0);
        if (hasShift) keybd_event(0x10, 0, 2, 0);
        if (hasCtrl) keybd_event(0x11, 0, 2, 0);
    }
}

module.exports = new KeyboardController();
