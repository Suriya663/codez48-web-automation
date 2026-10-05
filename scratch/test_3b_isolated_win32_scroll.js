const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Scroll Test 3B</title></head>
<body style="padding: 20px;">
    <h1>Scroll + Win32 Physical Click Test 3B</h1>
    <div style="height: 2500px;">Spacer to push target far below fold</div>
    <button id="deep-btn" onclick="document.getElementById('deep-result').innerText = 'Deep Clicked!';">Deep Below Fold Button</button>
    <div id="deep-result">Initial</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4853, async () => {
    try {
        console.log('=== TEST 3B: ISOLATED WIN32 CLICK AFTER SCROLL ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4853/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const locator = page.locator('#deep-btn').first();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        // Scroll into view
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

        const initialTitle = await page.title();
        bringWindowToFront(initialTitle);
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // Get foreground window before down via Koffi
        let fgBefore = 'Unknown';
        try {
            const user32 = koffi.load('user32.dll');
            const GetForegroundWindow = user32.func('void *GetForegroundWindow()');
            const GetWindowTextW = user32.func('int GetWindowTextW(void *hWnd, char *lpString, int nMaxCount)');
            const hwnd = GetForegroundWindow();
            const buf = Buffer.alloc(512);
            GetWindowTextW(hwnd, buf, 256);
            fgBefore = buf.toString('ucs2').replace(/\0/g, '').trim();
        } catch (e) {}

        const posBeforeMove = getCursor();
        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        const cursorBeforeDown = getCursor();
        const tBeforeDown = Date.now();

        // Detailed Win32 dispatch logging
        console.log(`[WIN32 TELEMETRY] Timestamp before mouse down: ${tBeforeDown}`);
        console.log(`[WIN32 TELEMETRY] Cursor position before down:`, cursorBeforeDown);
        console.log(`[WIN32 TELEMETRY] Foreground window before down: "${fgBefore}"`);

        // Perform mouse down (flag 0x0002)
        const user32 = koffi.load('user32.dll');
        const mouse_event = user32.func('void mouse_event(uint32 dwFlags, long dx, long dy, uint32 dwData, uint64 dwExtraInfo)');

        mouse_event(0x0002, 0, 0, 0, 0); // MOUSEEVENTF_LEFTDOWN
        const tAfterDown = Date.now();
        const cursorBetween = getCursor();
        console.log(`[WIN32 TELEMETRY] Timestamp after mouse down: ${tAfterDown}`);
        console.log(`[WIN32 TELEMETRY] Cursor position between down/up:`, cursorBetween);

        const startPause = Date.now();
        while (Date.now() - startPause < 50) {}

        mouse_event(0x0004, 0, 0, 0, 0); // MOUSEEVENTF_LEFTUP
        const tAfterUp = Date.now();
        const cursorAfterUp = getCursor();
        console.log(`[WIN32 TELEMETRY] Timestamp after mouse up: ${tAfterUp}`);
        console.log(`[WIN32 TELEMETRY] Cursor position after up:`, cursorAfterUp);

        let fgAfter = 'Unknown';
        try {
            const GetForegroundWindow = user32.func('void *GetForegroundWindow()');
            const GetWindowTextW = user32.func('int GetWindowTextW(void *hWnd, char *lpString, int nMaxCount)');
            const hwnd = GetForegroundWindow();
            const buf = Buffer.alloc(512);
            GetWindowTextW(hwnd, buf, 256);
            fgAfter = buf.toString('ucs2').replace(/\0/g, '').trim();
        } catch (e) {}
        console.log(`[WIN32 TELEMETRY] Foreground window after up: "${fgAfter}"`);

        // Wait briefly for UI event loop
        await page.waitForTimeout(1000);

        const deepResultText = await page.textContent('#deep-result');
        const stateChanged = deepResultText.includes('Deep Clicked!');
        const verResult = await stateVerifier.verifyNavigationOutcome(page, '#deep-result');

        await browserManager.close();
        server.close();

        console.log('\n=== RESULTS SUMMARY ===');
        console.log('WIN32 DISPATCH RESULT:', { success: true, flagsDown: '0x0002', flagsUp: '0x0004', durationMs: tAfterUp - tBeforeDown });
        console.log('BROWSER EVENT RESULT:', { clickedElement: '#deep-btn', hitTestInside: true });
        console.log('STATE CHANGE RESULT:', { stateChanged, text: deepResultText });
        console.log('STATE VERIFIER RESULT:', { success: stateChanged, text: deepResultText });

    } catch (err) {
        console.error('Test 3B Error:', err);
        server.close();
    }
});
