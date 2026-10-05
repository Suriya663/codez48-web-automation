const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Absolute Mouse Test</title></head>
<body style="padding: 20px;">
    <h1>Absolute Mouse Test</h1>
    <div style="height: 2500px;">Spacer</div>
    <button id="deep-btn" onclick="document.getElementById('deep-result').innerText = 'Deep Clicked Absolute!';">Deep Below Fold Button</button>
    <div id="deep-result">Initial</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4854, async () => {
    try {
        console.log('=== TEST 3C: ABSOLUTE MOUSE_EVENT WITH 0..65535 NORMALIZATION ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4854/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const locator = page.locator('#deep-btn').first();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const box = await locator.boundingBox();
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

        bringWindowToFront(await page.title());
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // Move cursor there first
        setCursor(targetScreenX, targetScreenY);
        await new Promise(r => setTimeout(r, 200));

        // Get virtual screen dimensions
        const user32 = koffi.load('user32.dll');
        const GetSystemMetrics = user32.func('int GetSystemMetrics(int nIndex)');
        const screenWidth = GetSystemMetrics(0);  // SM_CXSCREEN
        const screenHeight = GetSystemMetrics(1); // SM_CYSCREEN

        const absX = Math.round((targetScreenX * 65535) / screenWidth);
        const absY = Math.round((targetScreenY * 65535) / screenHeight);

        const mouse_event = user32.func('void mouse_event(uint32 dwFlags, long dx, long dy, uint32 dwData, uint64 dwExtraInfo)');

        // MOUSEEVENTF_ABSOLUTE (0x8000) | MOUSEEVENTF_LEFTDOWN (0x0002)
        mouse_event(0x8000 | 0x0002, absX, absY, 0, 0);
        await new Promise(r => setTimeout(r, 50));
        // MOUSEEVENTF_ABSOLUTE (0x8000) | MOUSEEVENTF_LEFTUP (0x0004)
        mouse_event(0x8000 | 0x0004, absX, absY, 0, 0);

        await page.waitForTimeout(1000);
        const deepResultText = await page.textContent('#deep-result');
        console.log('Deep Result Text After Absolute Click:', deepResultText);

        await browserManager.close();
        server.close();
    } catch (err) {
        console.error('Test 3C Error:', err);
        server.close();
    }
});
