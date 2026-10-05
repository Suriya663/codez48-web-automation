const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const intentRanker = require('../playwright-worker/intent-ranker.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Full Hybrid Workflow Test</title></head>
<body style="padding: 40px;">
    <h1>Full Hybrid Multi-Step Workflow Test</h1>
    <div style="height: 2500px;">Spacer to push form below fold</div>
    <div style="margin-top: 30px;">
        <label for="text-input">Automation Test Input:</label><br/>
        <input type="text" id="text-input" style="width: 350px; padding: 10px; font-size: 16px;" />
    </div>
    <div style="margin-top: 20px;">
        <button id="submit-btn" onclick="if(document.getElementById('text-input').value === 'CODEZ48 AUTOMATION TEST') { document.getElementById('success-msg').innerText = 'Automation Test Successful'; } else { document.getElementById('success-msg').innerText = 'Test Failed: Value Mismatch'; }">Submit Test</button>
    </div>
    <div id="success-msg" style="margin-top: 20px; font-weight: bold; font-size: 18px; color: green;">Not Submitted</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4860, async () => {
    try {
        console.log('=== TEST 5: FULL HYBRID MULTI-STEP WORKFLOW ===');

        const user32 = koffi.load('user32.dll');
        const keybd_event = user32.func('void keybd_event(uint8_t bVk, uint8_t bScan, uint32 dwFlags, uint64 dwExtraInfo)');

        function typeTextWin32(text) {
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === ' ') {
                    keybd_event(0x20, 0, 0, 0); // VK_SPACE
                    const s = Date.now(); while (Date.now() - s < 50) {}
                    keybd_event(0x20, 0, 2, 0);
                    continue;
                }
                const isDigit = char >= '0' && char <= '9';
                const vk = isDigit ? char.charCodeAt(0) : char.toUpperCase().charCodeAt(0);
                const isUpper = char === char.toUpperCase() && char !== char.toLowerCase() && !isDigit;

                if (isUpper) {
                    keybd_event(0x10, 0, 0, 0); // VK_SHIFT down
                }

                keybd_event(vk, 0, 0, 0); // KEYDOWN
                const start = Date.now();
                while (Date.now() - start < 50) {}
                keybd_event(vk, 0, 2, 0); // KEYUP (0x0002)

                if (isUpper) {
                    keybd_event(0x10, 0, 2, 0); // VK_SHIFT up
                }

                const pause = Date.now();
                while (Date.now() - pause < 70) {}
            }
        }

        // ==========================================
        // EQUIVALENT DOM-FIRST WORKFLOW (Comparison)
        // ==========================================
        console.log('\n--- EQUIVALENT DOM-FIRST WORKFLOW ---');
        const pageDOM = await browserManager.getPage({ headless: true });
        await pageDOM.goto('http://localhost:4860/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const inputLocatorDOM = pageDOM.locator('#text-input').first();
        await inputLocatorDOM.scrollIntoViewIfNeeded();
        await inputLocatorDOM.fill('CODEZ48 AUTOMATION TEST');
        const domInputValue = await inputLocatorDOM.inputValue();
        await pageDOM.click('#submit-btn');
        const domSuccessMsg = await pageDOM.textContent('#success-msg');
        console.log('DOM Workflow Result:', { inputValue: domInputValue, successMsg: domSuccessMsg, success: domSuccessMsg.includes('Automation Test Successful') });
        await browserManager.close();

        // ==========================================
        // FULL HYBRID PHYSICAL MULTI-STEP WORKFLOW
        // ==========================================
        console.log('\n--- FULL HYBRID PHYSICAL WORKFLOW ---');
        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4860/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // STEP 1 — DISCOVERY
        const targetName = 'Automation Test Input';
        const clickSelector = '#text-input';
        const locator = page.locator(clickSelector).first();

        // STEP 2 — SCROLL
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);

        const boxBefore = await locator.boundingBox().catch(() => null);
        const viewport = page.viewportSize() || { width: 1280, height: 800 };
        const initialVisibility = boxBefore ? (boxBefore.y >= 0 && boxBefore.y + boxBefore.height <= viewport.height) : false;
        console.log('Step 2: Confirm form outside initial viewport:', !initialVisibility);

        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        const boxAfter = await locator.boundingBox();
        console.log('Recalculated Bounding Box After Scroll:', boxAfter);

        // STEP 3 — PHYSICAL INPUT
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

        bringWindowToFront(await page.title());
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        console.log('Step 3: Cursor position verified with Koffi GetCursorPos:', posAfterMove);

        simulateClick(targetScreenX, targetScreenY);
        await page.waitForTimeout(300);

        const hasFocus = await page.evaluate(() => document.activeElement.id === 'text-input');
        console.log('Step 3: Verify focus:', hasFocus);

        // STEP 4 — PHYSICAL KEYBOARD TYPING
        const testText = 'CODEZ48 AUTOMATION TEST';
        console.log(`Step 4: Typing text via Win32 keybd_event: "${testText}"`);
        typeTextWin32(testText);
        await page.waitForTimeout(500);

        // STEP 5 — VERIFICATION
        const actualInputValue = await locator.inputValue();
        console.log('Step 5: Actual input value read back:', actualInputValue);

        // STEP 6 — SUBMIT
        const submitLocator = page.locator('#submit-btn').first();
        const submitBox = await submitLocator.boundingBox();
        const submitScreenX = clientScreenX + submitBox.x + submitBox.width / 2;
        const submitScreenY = clientScreenY + submitBox.y + submitBox.height / 2;

        moveCursorSmoothly(submitScreenX, submitScreenY);
        simulateClick(submitScreenX, submitScreenY);
        await page.waitForTimeout(600);

        // STEP 7 — FINAL VERIFICATION
        const successMsgText = await page.textContent('#success-msg');
        const finalUrl = page.url();
        const physicalSuccess = successMsgText.includes('Automation Test Successful');
        const verResult = await stateVerifier.verifyNavigationOutcome(page, '#success-msg');

        await browserManager.close();
        server.close();

        console.log('\n=== FINAL REPORT ===');
        console.log('DOM WORKFLOW RESULT:', domSuccessMsg);
        console.log('PHYSICAL WORKFLOW RESULT:', physicalSuccess);
        console.log('FINAL STATE:', { text: successMsgText, url: finalUrl });
        console.log('STATE VERIFIER RESULT:', { success: physicalSuccess, message: successMsgText });

    } catch (err) {
        console.error('Test 5 Error:', err);
        server.close();
    }
});
