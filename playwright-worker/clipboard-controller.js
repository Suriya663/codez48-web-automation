const { execSync } = require('child_process');

class ClipboardController {
    getClipboardText() {
        try {
            return execSync('powershell -Command "Get-Clipboard"', { encoding: 'utf8', windowsHide: true }).trim();
        } catch (e) {
            return '';
        }
    }

    setClipboardText(text) {
        try {
            const escaped = (text || '').replace(/"/g, '`"');
            execSync(`powershell -Command "Set-Clipboard -Value \\"${escaped}\\""`, { encoding: 'utf8', windowsHide: true });
            return true;
        } catch (e) {
            return false;
        }
    }

    verifyClipboard(expectedContent) {
        const current = this.getClipboardText();
        const matches = current.includes(expectedContent);
        console.log(`[CLIPBOARD VERIFIER] Expected: "${expectedContent}" | Actual: "${current}" | Matches: ${matches}`);
        return { success: matches, actual: current, expected: expectedContent };
    }
}

module.exports = new ClipboardController();
