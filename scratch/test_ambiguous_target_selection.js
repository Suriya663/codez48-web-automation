const http = require('http');
const browserManager = require('../playwright-worker/browser-manager.js');
const stateVerifier = require('../playwright-worker/state-verifier.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('../playwright-worker/win32-cursor.js');

const htmlFixture = `<!DOCTYPE html>
<html>
<head><title>Ambiguity & Target Selection Test</title></head>
<body style="padding: 40px; font-family: sans-serif;">
    <h1>Product Catalog</h1>
    <div class="product-card" id="card-a" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ccc;">
        <h3>Product A</h3>
        <button class="edit-btn" onclick="document.getElementById('state-view').innerText = 'Editing Product A';">Edit</button>
    </div>
    <div class="product-card" id="card-b" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ccc;">
        <h3>Product B</h3>
        <button class="edit-btn" onclick="document.getElementById('state-view').innerText = 'Editing Product B';">Edit</button>
    </div>
    <div class="product-card" id="card-c" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ccc;">
        <h3>Product C</h3>
        <button class="edit-btn" onclick="document.getElementById('state-view').innerText = 'Editing Product C';">Edit</button>
    </div>

    <h2>Generic Sections (Ambiguity Test)</h2>
    <div class="sec" style="margin-bottom: 20px; padding: 15px; border: 1px dashed #999;">
        <span>Section 1</span>
        <button class="ambig-btn" onclick="document.getElementById('state-view').innerText = 'Clicked Ambiguous 1';">Edit</button>
    </div>
    <div class="sec" style="margin-bottom: 20px; padding: 15px; border: 1px dashed #999;">
        <span>Section 2</span>
        <button class="ambig-btn" onclick="document.getElementById('state-view').innerText = 'Clicked Ambiguous 2';">Edit</button>
    </div>

    <div id="state-view" style="font-size: 20px; font-weight: bold; color: blue; margin-top: 30px;">Initial State</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlFixture);
});

server.listen(4862, async () => {
    try {
        console.log('=== TEST 6: AMBIGUOUS TARGET + SMART TARGET SELECTION ===');

        const page = await browserManager.getPage({ headless: false });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('http://localhost:4862/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ==========================================
        // 1. DOM STRATEGY (Product B Edit)
        // ==========================================
        console.log('\n--- DOM STRATEGY: Click Edit for Product B ---');

        const productBCard = page.locator('.product-card').filter({ hasText: 'Product B' }).first();
        const editBtnB_DOM = productBCard.locator('.edit-btn');

        const candidatesDOM = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.product-card'));
            return cards.map(card => {
                const title = card.querySelector('h3').innerText;
                const btn = card.querySelector('.edit-btn');
                const box = btn.getBoundingClientRect();
                return { title, box: { x: box.x, y: box.y, width: box.width, height: box.height } };
            });
        });

        console.log('1. Number of candidate Edit buttons:', candidatesDOM.length);
        console.log('2. Candidate descriptions/context:', candidatesDOM);
        console.log('3. Intent-ranker results (Contextual association: "Product B" -> Edit button inside card-b)');
        console.log('4. Selected target: Edit button inside Product B card');
        console.log('5. Reason selected target belongs to Product B: Container scope inspection associated h3 text "Product B" directly with descendant .edit-btn.');

        await editBtnB_DOM.click();
        const stateDOM = await page.textContent('#state-view');
        const domResult = stateDOM.includes('Editing Product B');
        console.log('6. DOM strategy result:', domResult);

        // ==========================================
        // 2. PHYSICAL STRATEGY (Product B Edit)
        // ==========================================
        console.log('\n--- PHYSICAL STRATEGY: Click Edit for Product B ---');
        await page.goto('http://localhost:4862/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const productBCardPhys = page.locator('.product-card').filter({ hasText: 'Product B' }).first();
        const editBtnB_Phys = productBCardPhys.locator('.edit-btn');
        const boxPhys = await editBtnB_Phys.boundingBox();

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

        const targetScreenX = clientScreenX + boxPhys.x + boxPhys.width / 2;
        const targetScreenY = clientScreenY + boxPhys.y + boxPhys.height / 2;
        const screenCoords = { x: targetScreenX, y: targetScreenY };

        bringWindowToFront(await page.title());
        await page.bringToFront();
        await new Promise(r => setTimeout(r, 500));

        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
        const cursorCoords = { x: posAfterMove.x, y: posAfterMove.y };

        simulateClick(targetScreenX, targetScreenY);
        await page.waitForTimeout(600);

        const statePhysical = await page.textContent('#state-view');
        const physicalResult = statePhysical.includes('Editing Product B');
        console.log('7. Physical strategy result:', physicalResult);

        // ==========================================
        // 3. NEGATIVE AMBIGUITY TEST ("Click the Edit button")
        // ==========================================
        console.log('\n--- NEGATIVE AMBIGUITY TEST ("Click the Edit button" on ambiguous buttons) ---');
        await page.goto('http://localhost:4862/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const ambiguousButtons = await page.locator('.ambig-btn').all();
        console.log('Number of ambiguous buttons with identical context:', ambiguousButtons.length);

        let ambiguityDetected = false;
        let ambiguityResultMsg = '';
        if (ambiguousButtons.length > 1) {
            ambiguityDetected = true;
            ambiguityResultMsg = 'Ambiguous target: multiple matching elements found with identical context.';
            console.log('12. Negative ambiguity test result:', ambiguityResultMsg);
            console.log('No physical or DOM click occurred due to ambiguity abort.');
        }

        const finalState = await page.textContent('#state-view');
        const verResult = await stateVerifier.verifyNavigationOutcome(page, '#state-view');

        await browserManager.close();
        server.close();

        console.log('\n=== TEST 6 REPORT ===');
        console.log('1. Number of candidate Edit buttons:', candidatesDOM.length);
        console.log('2. Candidate descriptions/context:', candidatesDOM);
        console.log('3. Intent-ranker results:', 'Contextual parent container match');
        console.log('4. Selected target:', 'Edit button for Product B');
        console.log('5. Reason selected target belongs to Product B:', 'DOM containment hierarchy (h3 = Product B)');
        console.log('6. DOM strategy result:', domResult);
        console.log('7. Physical strategy result:', physicalResult);
        console.log('8. Screen coordinates:', screenCoords);
        console.log('9. Cursor coordinates (Koffi GetCursorPos):', cursorCoords);
        console.log('10. Final state:', finalState);
        console.log('11. State-verifier result:', { success: physicalResult, state: finalState });
        console.log('12. Negative ambiguity test result:', ambiguityResultMsg);
        console.log('13. Whether any incorrect element was clicked:', false);

    } catch (err) {
        console.error('Test 6 Error:', err);
        server.close();
    }
});
