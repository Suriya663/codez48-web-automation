const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Button State Test</title></head>
<body style="padding: 50px;">
    <h1>Button UI State Test</h1>
    <button id="state-btn" onclick="document.getElementById('result').innerText = 'State Changed Successfully';">Click Me</button>
    <div id="result">Initial State</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4949, async () => {
    try {
        console.log('=== TEST 2: BUTTON / UI STATE CHANGE (Local Fixture) ===');

        const page = await browserManager.getPage({ headless: false });
        await page.goto('http://localhost:4949/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const buttonSelector = '#state-btn';
        const buttonLocator = page.locator(buttonSelector).first();
        await buttonLocator.waitFor({ state: 'visible', timeout: 5000 });

        // --- A. DOM STRATEGY ---
        const beforeState = await page.textContent('#result');
        console.log('\n--- A. DOM STRATEGY EXECUTION ---');
        console.log('Before State:', beforeState);

        let domSucceeded = false;
        try {
            await buttonLocator.click({ timeout: 5000 });
            domSucceeded = true;
        } catch (e) {
            console.warn('DOM click error:', e.message);
        }

        const afterStateDOM = await page.textContent('#result');
        console.log('After State (DOM):', afterStateDOM);
        const domResult = domSucceeded && afterStateDOM.includes('State Changed Successfully');

        // --- B. PHYSICAL STRATEGY ---
        await page.goto('http://localhost:4949/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await buttonLocator.waitFor({ state: 'visible', timeout: 5000 });

        const beforeStatePhysical = await page.textContent('#result');
        console.log('\n--- B. PHYSICAL STRATEGY EXECUTION ---');
        console.log('Before State (Physical):', beforeStatePhysical);

        const box = await buttonLocator.boundingBox();
        let screenCoords = null;
        let cursorCoords = null;
        let physicalSucceeded = false;

        if (box) {
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
            screenCoords = { x: targetScreenX, y: targetScreenY };

            bringWindowToFront(await page.title());
            await page.bringToFront();
            await new Promise(r => setTimeout(r, 500));

            const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
            cursorCoords = { x: posAfterMove.x, y: posAfterMove.y };

            // Perform physical mouse click (no page.mouse, no locator.click, no JS click)
            simulateClick();
            physicalSucceeded = true;

            await page.waitForTimeout(500);
        }

        const afterStatePhysical = await page.textContent('#result');
        console.log('After State (Physical):', afterStatePhysical);
        const physicalResult = physicalSucceeded && afterStatePhysical.includes('State Changed Successfully');

        await browserManager.close();
        server.close();

        console.log('\n=== TEST 2 REPORT ===');
        console.log('Target Button:', buttonSelector);
        console.log('DOM Bounding Box:', box);
        console.log('Screen Coordinates:', screenCoords);
        console.log('Cursor Coordinates (Koffi GetCursorPos):', cursorCoords);
        console.log('DOM Result:', domResult);
        console.log('Physical Click Result:', physicalResult);
        console.log('Before State:', beforeState);
        console.log('After State:', afterStatePhysical);
        console.log('State-Verifier Result:', { success: domResult && physicalResult, stateChanged: afterStatePhysical.includes('State Changed Successfully') });

    } catch (err) {
        console.error('Test 2 Error:', err);
        server.close();
    }
});
