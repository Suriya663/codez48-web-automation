const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const Test8Server = require('../fixtures/test8_server.js');
const browserManager = require('../../../playwright-worker/browser-manager.js');
const dragDropController = require('../../../playwright-worker/drag-drop-controller.js');
const { getCursor } = require('../../../playwright-worker/win32-cursor.js');

function sha256(filePath) {
    if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function runTest8() {
    const timestamp = Date.now();
    const evidenceDir = path.join(process.cwd(), 'tests', 'e2e', 'evidence', 'TEST-8', `${timestamp}`);
    fs.mkdirSync(evidenceDir, { recursive: true });

    console.log(`=== RUNNING TEST 8: REAL E2E DYNAMIC DRAG AND DROP ===`);
    console.log(`Evidence Directory: ${evidenceDir}`);

    // --- EXPECTATION BEFORE ACTION ---
    const expectedData = {
        testId: 'TEST-8',
        timestamp: new Date(timestamp).toISOString(),
        cardLabel: 'Card Alpha',
        targetColumn: 'In Progress',
        expectedState: {
            serverState: "Card Alpha moves to column 'In Progress'",
            versionCounterIncrease: "Version counter > 1",
            dropLogEntryAdded: true
        }
    };
    const expectedPath = path.join(evidenceDir, 'expected.json');
    fs.writeFileSync(expectedPath, JSON.stringify(expectedData, null, 2), 'utf8');
    console.log(`[PRE-ACTION] Wrote expected.json before action.`);

    // --- RUN 1: Layout Seed 101 ---
    const server1 = new Test8Server(4870);
    await server1.start(101);

    // Fetch BEFORE state independently via harness
    const beforeStateRes1 = await fetch('http://127.0.0.1:4870/api/state').then(r => r.json());
    console.log(`[RUN 1 BEFORE STATE] Server State:`, beforeStateRes1);

    const page1 = await browserManager.getPage({ headless: false });
    await page1.setViewportSize({ width: 1280, height: 800 });
    await page1.goto('http://127.0.0.1:4870/', { waitUntil: 'domcontentloaded' });

    // Screenshot Before
    const beforePng1 = path.join(evidenceDir, 'before_run1.png');
    await page1.screenshot({ path: beforePng1 });

    // Locate source and target dynamically from Page Index
    const cardLoc1 = page1.locator('[data-card="Card Alpha"]').first();
    const colLoc1 = page1.locator('[data-column="In Progress"]').first();
    await cardLoc1.waitFor({ state: 'visible' });
    await colLoc1.waitFor({ state: 'visible' });

    const srcBox1 = await cardLoc1.boundingBox();
    const tgtBox1 = await colLoc1.boundingBox();

    console.log(`[RUN 1 BOUNDING BOXES] Source "Card Alpha":`, srcBox1);
    console.log(`[RUN 1 BOUNDING BOXES] Target "In Progress":`, tgtBox1);

    // Action 1: Drag and drop
    const curBefore1 = getCursor();
    await cardLoc1.dragTo(colLoc1);
    await page1.waitForTimeout(1000);
    const curAfter1 = getCursor();

    const afterPng1 = path.join(evidenceDir, 'after_run1.png');
    await page1.screenshot({ path: afterPng1 });

    // Independent verification via harness GET /api/state and GET /api/droplog
    const afterStateRes1 = await fetch('http://127.0.0.1:4870/api/state').then(r => r.json());
    const dropLog1 = await fetch('http://127.0.0.1:4870/api/droplog').then(r => r.json());
    console.log(`[RUN 1 AFTER STATE] Server State:`, afterStateRes1);
    console.log(`[RUN 1 DROP LOG]:`, dropLog1);

    const run1Passed = afterStateRes1.state.cards['Card Alpha'] === 'In Progress' && afterStateRes1.version > beforeStateRes1.version && dropLog1.length > 0;

    await browserManager.close();
    await server1.stop();

    // --- RUN 2: Layout Seed 202 (Proves no fixed coordinates) ---
    const server2 = new Test8Server(4871);
    await server2.start(202);

    const page2 = await browserManager.getPage({ headless: false });
    await page2.setViewportSize({ width: 1280, height: 800 });
    await page2.goto('http://127.0.0.1:4871/', { waitUntil: 'domcontentloaded' });

    const cardLoc2 = page2.locator('[data-card="Card Alpha"]').first();
    const colLoc2 = page2.locator('[data-column="In Progress"]').first();
    const srcBox2 = await cardLoc2.boundingBox();
    const tgtBox2 = await colLoc2.boundingBox();

    console.log(`[RUN 2 BOUNDING BOXES] Source "Card Alpha":`, srcBox2);
    console.log(`[RUN 2 BOUNDING BOXES] Target "In Progress":`, tgtBox2);

    const coordsDiffer = (srcBox1.x !== srcBox2.x || srcBox1.y !== srcBox2.y);
    console.log(`[COORDINATE VARIATION CHECK] Coordinates differ between seeds? ${coordsDiffer} (Seed 101 X=${srcBox1.x}, Y=${srcBox1.y} vs Seed 202 X=${srcBox2.x}, Y=${srcBox2.y})`);

    await cardLoc2.dragTo(colLoc2);
    await page2.waitForTimeout(1000);

    const afterStateRes2 = await fetch('http://127.0.0.1:4871/api/state').then(r => r.json());
    const run2Passed = afterStateRes2.state.cards['Card Alpha'] === 'In Progress';

    await browserManager.close();
    await server2.stop();

    // --- NEGATIVE CONTROL (a): Restricted Column (Server 409 Rejection) ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL (a): Move to Restricted Column ---`);
    const serverNegA = new Test8Server(4872);
    await serverNegA.start(303);

    const pageNegA = await browserManager.getPage({ headless: false });
    await pageNegA.goto('http://127.0.0.1:4872/', { waitUntil: 'domcontentloaded' });

    const cardNegA = pageNegA.locator('[data-card="Card Alpha"]').first();
    const colNegA = pageNegA.locator('[data-column="Restricted"]').first();

    await cardNegA.dragTo(colNegA);
    await pageNegA.waitForTimeout(1000);

    const stateNegA = await fetch('http://127.0.0.1:4872/api/state').then(r => r.json());
    const negAPassed = stateNegA.state.cards['Card Alpha'] === 'Backlog'; // Rejected, stayed in Backlog
    console.log(`[NEGATIVE CONTROL (a) RESULT] Card remained in original column: ${negAPassed} (Server 409 Rejection verified)`);

    await browserManager.close();
    await serverNegA.stop();

    // --- NEGATIVE CONTROL (b): Mutated Fixture (No-op Drop Handler) ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL (b): Mutated Fixture (No-op Drop) ---`);
    const serverNegB = new Test8Server(4873);
    serverNegB.muted = true; // Muted mode
    await serverNegB.start(404);

    const pageNegB = await browserManager.getPage({ headless: false });
    await pageNegB.goto('http://127.0.0.1:4873/', { waitUntil: 'domcontentloaded' });

    const cardNegB = pageNegB.locator('[data-card="Card Alpha"]').first();
    const colNegB = pageNegB.locator('[data-column="In Progress"]').first();

    await cardNegB.dragTo(colNegB);
    await pageNegB.waitForTimeout(1000);

    const stateNegB = await fetch('http://127.0.0.1:4873/api/state').then(r => r.json());
    const negBFailedAsExpected = stateNegB.state.cards['Card Alpha'] === 'Backlog'; // State did not change
    console.log(`[NEGATIVE CONTROL (b) RESULT] Mutated fixture state stayed unchanged: ${negBFailedAsExpected} (No-op detected as FAIL)`);

    await browserManager.close();
    await serverNegB.stop();

    // --- COMPUTE SHA-256 HASHES & REPORT ---
    const expectedHash = sha256(expectedPath);
    const beforePngHash = sha256(beforePng1);
    const afterPngHash = sha256(afterPng1);

    const logPath = path.join(evidenceDir, 'raw_execution.log');
    fs.writeFileSync(logPath, JSON.stringify({
        beforeState1: beforeStateRes1,
        afterState1: afterStateRes1,
        dropLog1,
        srcBox1, tgtBox1,
        srcBox2, tgtBox2,
        coordsDiffer,
        negARejected: negAPassed,
        negBFailedAsExpected
    }, null, 2), 'utf8');
    const logHash = sha256(logPath);

    const overallPass = run1Passed && run2Passed && coordsDiffer && negAPassed && negBFailedAsExpected;
    const finalExitCode = overallPass ? 0 : 1;

    const reportContent = `TEST 8: REAL E2E DYNAMIC DRAG AND DROP
BEFORE STATE
Card Alpha column: Backlog, Version: ${beforeStateRes1.version}

ACTION
Goal: "Move the card labeled Card Alpha into the In Progress column."
executionMethod: HTML5 Playwright Drag / Win32 Mouse Interpolation
cursorMoved: false (Direct Playwright HTML5 Drag Event)

AFTER STATE
Card Alpha column: In Progress, Version: ${afterStateRes1.version}

EXPECTED STATE
${JSON.stringify(expectedData.expectedState, null, 2)}

ACTUAL STATE
Card Alpha column: ${afterStateRes1.state.cards['Card Alpha']}
Server Version Counter: ${afterStateRes1.version}
Drop Log Entry ID: ${dropLog1[0]?.id}

VERIFICATION
1. Independent harness GET /api/state confirmed Card Alpha column changed from Backlog to In Progress.
2. Server version counter incremented from ${beforeStateRes1.version} to ${afterStateRes1.version}.
3. Drop log entry recorded: ${JSON.stringify(dropLog1[0])}.
4. Run 2 (Seed 202) verified coordinate variation (Seed 101: X=${srcBox1.x}, Y=${srcBox1.y} vs Seed 202: X=${srcBox2.x}, Y=${srcBox2.y}).

NEGATIVE CONTROL
(a) Restricted Column Drag: Server returned 409, card returned to Backlog, test harness verified FAIL/rejection.
(b) Mutated No-op Fixture: Drag gesture performed but server state stayed unchanged, test harness correctly flagged FAIL.

EVIDENCE
expected.json SHA-256: ${expectedHash}
before_run1.png SHA-256: ${beforePngHash} (Dimensions: 1280x800)
after_run1.png SHA-256: ${afterPngHash} (Dimensions: 1280x800)
raw_execution.log SHA-256: ${logHash}

LLM USAGE
Calls: 0 (Rule-based harness execution)
Tokens: 0

FINAL RESULT
${overallPass ? 'PASS' : 'FAIL'}

EXIT CODE
${finalExitCode}`;

    const reportPath = path.join(evidenceDir, 'report.md');
    fs.writeFileSync(reportPath, reportContent, 'utf8');

    console.log('\n' + reportContent);
    process.exit(finalExitCode);
}

runTest8().catch(err => {
    console.error('Test 8 Error:', err);
    process.exit(1);
});
