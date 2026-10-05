const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const intentRanker = require('../playwright-worker/intent-ranker.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');
const koffi = require('koffi');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Keyboard Test</title></head>
<body style="padding: 40px;">
    <h1>Windows-Level Keyboard Automation Test</h1>
    <div style="margin-top: 30px;">
        <label for="text-input">Test Input Field:</label><br/>
        <input type="text" id="text-input" style="width: 300px; padding: 8px; font-size: 16px;" />
    </div>
    <div style="margin-top: 20px;">
        <button id="submit-btn" onclick="document.getElementById('form-result').innerText = 'Submitted Value: ' + document.getElementById('text-input').value;">Submit Form</button>
    </div>
    <div id="form-result" style="margin-top: 20px; font-weight: bold;">Not Submitted</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4858, async () => {
    try {
        console.log('=== TEST 4: WINDOWS-LEVEL PHYSICAL KEYBOARD AUTOMATION ===');

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

        // --- EQUIVALENT DOM TYPING TEST (Comparison) ---
        console.log('\n--- EQUIVALENT DOM TYPING TEST ---');
        const pageDOM = await browserManager.getPage({ headless: true });
        await pageDOM.goto('http://localhost:4858/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const inputLocatorDOM = pageDOM.locator('#text-input').first();
        await inputLocatorDOM.fill('CODEZ48 TEST 123');
        const domInputValue = await inputLocatorDOM.inputValue();
        await pageDOM.click('#submit-btn');
        const domResultText = await pageDOM.textContent('#form-result');
        console.log('DOM Typing Result:', { inputValue: domInputValue, resultText: domResultText });
        await browserManager.close();

        // --- PHYSICAL KEYBOARD AUTOMATION TEST ---
        console.log('\n--- PHYSICAL KEYBOARD AUTOMATION TEST ---');
        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4858/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const targetName = 'Test Input Field';
        const inputLocator = page.locator('#text-input').first();
        await inputLocator.waitFor({ state: 'visible', timeout: 5000 });

        const box = await inputLocator.boundingBox();
        const initialVisibility = box !== null;

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
        const screenCoords = { x: targetScreenX, y: targetScreenY };

        const initialTitle = await page.title();
        bringWindowToFront(initialTitle);
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        // Move physical Windows cursor to input & verify position with Koffi GetCursorPos
        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        const cursorCoords = { x: posAfterMove.x, y: posAfterMove.y };

        // Physically click the input
        simulateClick(targetScreenX, targetScreenY);
        await new Promise(r => setTimeout(r, 300));

        // Verify input has focus
        const hasFocus = await page.evaluate(() => document.activeElement.id === 'text-input');
        console.log('Physical Focus Result:', hasFocus);

        // Type text using Windows-level keyboard input (keybd_event)
        const testText = 'CODEZ48 TEST 123';
        console.log(`Typing text via Win32 keybd_event: "${testText}"`);
        typeTextWin32(testText);
        await new Promise(r => setTimeout(r, 500));

        // Read actual input value from page
        const actualInputValue = await inputLocator.inputValue();
        console.log('Actual input value after typing:', actualInputValue);

        // Submit button identification & physical click
        const submitLocator = page.locator('#submit-btn').first();
        const submitBox = await submitLocator.boundingBox();
        const submitScreenX = clientScreenX + submitBox.x + submitBox.width / 2;
        const submitScreenY = clientScreenY + submitBox.y + submitBox.height / 2;

        moveCursorSmoothly(submitScreenX, submitScreenY);
        simulateClick(submitScreenX, submitScreenY);
        await new Promise(r => setTimeout(r, 500));

        const submitResultText = await page.textContent('#form-result');
        const finalState = { text: submitResultText, url: page.url() };
        const verResult = await stateVerifier.verifyNavigationOutcome(page, '#form-result');

        await browserManager.close();
        server.close();

        console.log('\n=== TEST 4 REPORT ===');
        console.log('Input Target:', targetName);
        console.log('Initial Visibility:', initialVisibility);
        console.log('Bounding Box:', box);
        console.log('Screen Coordinates:', screenCoords);
        console.log('Cursor Coordinates (Koffi GetCursorPos):', cursorCoords);
        console.log('Browser Foreground Status:', initialTitle);
        console.log('Physical Focus Result:', hasFocus);
        console.log('Keyboard API Used:', 'Win32 user32.keybd_event (Koffi FFI)');
        console.log('Characters/Input Sent:', testText);
        console.log('Actual Input Value After Typing:', actualInputValue);
        console.log('DOM Typing Result:', domResultText);
        console.log('Physical Typing Result:', actualInputValue === testText);
        console.log('Submit Result:', submitResultText);
        console.log('Final State:', finalState);
        console.log('State-Verifier Result:', { success: actualInputValue === testText && submitResultText.includes(testText) });

    } catch (err) {
        console.error('Test 4 Error:', err);
        server.close();
    }
});
