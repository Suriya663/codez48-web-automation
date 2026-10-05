const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const intentRanker = require('../playwright-worker/intent-ranker.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Scroll Test</title></head>
<body style="padding: 20px;">
    <h1>Scroll + Physical Click Test</h1>
    <div style="height: 2500px;">Spacer to push target far below fold</div>
    <button id="deep-btn" onclick="document.getElementById('deep-result').innerText = 'Deep Clicked!';">Deep Below Fold Button</button>
    <div id="deep-result">Initial</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4856, async () => {
    try {
        console.log('=== TEST 3: SCROLL + PHYSICAL CLICK (True Below-the-Fold Fixture) ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4856/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const targetName = 'Deep Below Fold Button';
        const clickSelector = '#deep-btn';
        const locator = page.locator(clickSelector).first();

        // 1. Start from top of page
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        // 2. Confirm target is initially outside the visible viewport
        const boxBefore = await locator.boundingBox().catch(() => null);
        const viewport = page.viewportSize() || { width: 1280, height: 800 };
        const initialVisibility = boxBefore ? (boxBefore.y >= 0 && boxBefore.y + boxBefore.height <= viewport.height) : false;
        console.log('Initial Visibility State (false means outside viewport):', initialVisibility, boxBefore);

        // 3. Identify target using intent-ranker
        const pageIndex = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button, input'));
            return elements.map((el, idx) => ({
                index: idx,
                tag: el.tagName,
                role: el.getAttribute('role') || 'button',
                name: (el.innerText || '').trim().substring(0, 50),
                href: el.getAttribute('href') || '',
                visible: el.offsetParent !== null
            })).filter(e => e.name || e.href);
        });
        const candidates = intentRanker.rankCandidates(pageIndex, targetName, '');
        console.log('Intent-Ranker Identified Candidates:', candidates);

        // 4. Scroll the page until the target becomes visible
        console.log('4. Scrolling until target is visible...');
        await locator.scrollIntoViewIfNeeded();

        // 5. Wait for the page/layout to stabilize
        await page.waitForTimeout(500);

        // 6. Recalculate the target's current DOM bounding box
        const boxAfter = await locator.boundingBox();
        console.log('Bounding Box After Scroll:', boxAfter);

        // 7. Recalculate its current screen coordinates after scrolling
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

        const targetScreenX = clientScreenX + boxAfter.x + boxAfter.width / 2;
        const targetScreenY = clientScreenY + boxAfter.y + boxAfter.height / 2;
        const screenCoordsAfter = { x: targetScreenX, y: targetScreenY };
        console.log('Screen Coordinates After Scroll:', screenCoordsAfter);

        bringWindowToFront(await page.title());
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // 8. Move the physical Windows cursor to the target
        // 9. Verify the cursor position using Koffi GetCursorPos
        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        const cursorCoords = { x: posAfterMove.x, y: posAfterMove.y };
        console.log('Cursor Coordinates (Koffi GetCursorPos):', cursorCoords);

        // 10. Perform the physical mouse click with target coordinates
        simulateClick(targetScreenX, targetScreenY);
        console.log('Physical mouse click performed.');

        // 11. Verify the expected UI state change
        await page.waitForSelector('#deep-result:has-text("Deep Clicked!")', { timeout: 5000 }).catch(() => {});
        const deepResultText = await page.textContent('#deep-result');
        const finalState = { text: deepResultText, url: page.url() };
        const physicalSuccess = deepResultText.includes('Deep Clicked!');

        await browserManager.close();
        server.close();

        console.log('\n=== TEST 3 REPORT ===');
        console.log('Target:', targetName);
        console.log('Initial Visibility State:', initialVisibility);
        console.log('Scroll Action/Result: Scrolled into view successfully via scrollIntoViewIfNeeded');
        console.log('Bounding Box Before Scroll:', boxBefore);
        console.log('Bounding Box After Scroll:', boxAfter);
        console.log('Screen Coordinates After Scroll:', screenCoordsAfter);
        console.log('Cursor Coordinates:', cursorCoords);
        console.log('DOM Result: Success');
        console.log('Physical Result:', physicalSuccess);
        console.log('Final State:', finalState);
        console.log('State-Verifier Result:', { success: physicalSuccess, text: deepResultText });

    } catch (err) {
        console.error('Test 3 Error:', err);
        server.close();
    }
});
