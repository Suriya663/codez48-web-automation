const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const { bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>ClientToScreen Test</title></head>
<body style="padding: 20px;">
    <h1>ClientToScreen Test</h1>
    <div style="height: 2500px;">Spacer</div>
    <button id="deep-btn" onclick="document.getElementById('deep-result').innerText = 'ClientToScreen Clicked!';">Deep Below Fold Button</button>
    <div id="deep-result">Initial</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4855, async () => {
    try {
        console.log('=== TEST 3D: CLIENT-TO-SCREEN WIN32 API ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4855/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const locator = page.locator('#deep-btn').first();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const box = await locator.boundingBox();

        // Find browser HWND using FindWindowW and title
        const user32 = koffi.load('user32.dll');
        const FindWindowW = user32.func('void *FindWindowW(string lpClassName, string lpWindowName)');
        const ClientToScreen = user32.func('bool ClientToScreen(void *hWnd, void *lpPoint)');

        const title = await page.title();
        bringWindowToFront(title);
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        const hwnd = FindWindowW(null, title + " - Google Chrome for Testing") || FindWindowW(null, title);

        if (hwnd && box) {
            // POINT struct { long x; long y; }
            const pt = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
            const success = ClientToScreen(hwnd, pt);
            console.log('ClientToScreen success:', success, 'Screen PT:', pt);

            // Move cursor and click via mouse_event with absolute normalized coords or direct SetCursorPos
            const SetCursorPos = user32.func('bool SetCursorPos(int X, int Y)');
            const GetSystemMetrics = user32.func('int GetSystemMetrics(int nIndex)');
            const mouse_event = user32.func('void mouse_event(uint32 dwFlags, long dx, long dy, uint32 dwData, uint64 dwExtraInfo)');

            SetCursorPos(pt.x, pt.y);
            await new Promise(r => setTimeout(r, 100));

            const screenWidth = GetSystemMetrics(0);
            const screenHeight = GetSystemMetrics(1);
            const absX = Math.round((pt.x * 65535) / screenWidth);
            const absY = Math.round((pt.y * 65535) / screenHeight);

            mouse_event(0x8000 | 0x0002, absX, absY, 0, 0); // DOWN
            await new Promise(r => setTimeout(r, 50));
            mouse_event(0x8000 | 0x0004, absX, absY, 0, 0); // UP

            await page.waitForTimeout(1000);
            const text = await page.textContent('#deep-result');
            console.log('Result text after ClientToScreen click:', text);
        } else {
            console.error('HWND or box not found.');
        }

        await browserManager.close();
        server.close();
    } catch (err) {
        console.error('Test 3D Error:', err);
        server.close();
    }
});
