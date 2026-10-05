const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Scroll Diagnosis</title></head>
<body style="padding: 20px;">
    <h1>Scroll Diagnosis Test</h1>
    <div style="height: 2500px;">Spacer</div>
    <button id="deep-btn" onclick="document.getElementById('deep-result').innerText = 'Deep Clicked!';">Deep Below Fold Button</button>
    <div id="deep-result">Initial</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4852, async () => {
    try {
        console.log('=== TEST 3 DIAGNOSTIC RUN ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4852/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const locator = page.locator('#deep-btn').first();
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const box = await locator.boundingBox();
        const viewport = page.viewportSize();

        const winGeometry = await page.evaluate(() => ({
            screenX: window.screenX || window.screenLeft || 0,
            screenY: window.screenY || window.screenTop || 0,
            outerWidth: window.outerWidth || 1280,
            outerHeight: window.outerHeight || 800,
            innerWidth: window.innerWidth || 1280,
            innerHeight: window.innerHeight || 800
        }));

        const borderWidth = Math.max(0, Math.round((winGeometry.outerWidth - winGeometry.innerWidth) / 2));
        const titleBarHeight = Math.max(0, winGeometry.outerHeight - winGeometry.innerHeight);

        const clientScreenX = winGeometry.screenX + borderWidth;
        const clientScreenY = winGeometry.screenY + titleBarHeight;

        const targetScreenX = clientScreenX + box.x + box.width / 2;
        const targetScreenY = clientScreenY + box.y + box.height / 2;

        // Foreground window info via Win32 API
        let foregroundWindowText = 'Unknown';
        try {
            const user32 = koffi.load('user32.dll');
            const GetForegroundWindow = user32.func('void *GetForegroundWindow()');
            const GetWindowTextW = user32.func('int GetWindowTextW(void *hWnd, char *lpString, int nMaxCount)');
            const hwnd = GetForegroundWindow();
            const buf = Buffer.alloc(512);
            GetWindowTextW(hwnd, buf, 256);
            foregroundWindowText = buf.toString('ucs2').replace(/\0/g, '').trim();
        } catch (e) {}

        const cursorBefore = getCursor();

        console.log('--- DIAGNOSTIC METRICS ---');
        console.log('browser screenX:', winGeometry.screenX);
        console.log('browser screenY:', winGeometry.screenY);
        console.log('outerWidth:', winGeometry.outerWidth);
        console.log('outerHeight:', winGeometry.outerHeight);
        console.log('innerWidth:', winGeometry.innerWidth);
        console.log('innerHeight:', winGeometry.innerHeight);
        console.log('viewport width/height:', viewport.width, '/', viewport.height);
        console.log('target boundingBox:', box);
        console.log('calculated screen coordinate:', { x: targetScreenX, y: targetScreenY });
        console.log('cursor coordinate before click:', cursorBefore);
        console.log('foreground window information:', foregroundWindowText);
        console.log('Is Y=835 inside visible client area (Y < screenY + outerHeight)?', targetScreenY < (winGeometry.screenY + winGeometry.outerHeight));

        await browserManager.close();
        server.close();
    } catch (err) {
        console.error('Diagnosis Error:', err);
        server.close();
    }
});
