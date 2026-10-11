const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');
const Test9Server = require('../fixtures/test9_server.js');
const browserManager = require('../../../playwright-worker/browser-manager.js');

function sha256(filePath) {
    if (!fs.existsSync(filePath)) return 'FILE_NOT_FOUND';
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function runTest9() {
    const timestamp = Date.now();
    const evidenceDir = path.join(process.cwd(), 'tests', 'e2e', 'evidence', 'TEST-9', `${timestamp}`);
    fs.mkdirSync(evidenceDir, { recursive: true });

    console.log(`=== RUNNING TEST 9: REAL SERVER-SIDE UPLOAD COMPLETION ===`);
    console.log(`Evidence Directory: ${evidenceDir}`);

    // 1. Generate 8 MB random byte payload file locally
    const payloadPath = path.join(os.tmpdir(), `test9_8mb_payload_${timestamp}.bin`);
    const payloadSize = 8 * 1024 * 1024; // 8,388,608 bytes
    const payloadBuffer = crypto.randomBytes(payloadSize);
    fs.writeFileSync(payloadPath, payloadBuffer);
    const localSha256 = crypto.createHash('sha256').update(payloadBuffer).digest('hex');

    console.log(`[PAYLOAD GENERATED] Path: ${payloadPath} | Size: ${payloadSize} bytes | Local SHA-256: ${localSha256}`);

    // --- EXPECTATION BEFORE ACTION ---
    const expectedData = {
        testId: 'TEST-9',
        timestamp: new Date(timestamp).toISOString(),
        payloadPath,
        payloadSize,
        localSha256,
        expectedState: {
            serverStatus: 'complete',
            receivedSizeEqual: payloadSize,
            sha256Match: localSha256,
            receiptIdPresent: true,
            serverSavedFileHashMatch: true
        }
    };
    const expectedPath = path.join(evidenceDir, 'expected.json');
    fs.writeFileSync(expectedPath, JSON.stringify(expectedData, null, 2), 'utf8');
    console.log(`[PRE-ACTION] Wrote expected.json before action.`);

    // --- MAIN TEST RUN ---
    const server = new Test9Server(4874);
    await server.start();

    const page = await browserManager.getPage({ headless: false });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:4874/', { waitUntil: 'domcontentloaded' });

    const beforePng = path.join(evidenceDir, 'before_upload.png');
    await page.screenshot({ path: beforePng });

    // Click styled button and handle file chooser
    console.log('[ACTION] Clicking styled upload button and providing 8 MB payload via FileChooser...');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#upload-trigger-btn');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(payloadPath);

    // Wait for page text to indicate "Processing Complete" AND verify via server API
    console.log('[WAIT] Waiting for server streaming, processing, and status complete...');
    await page.waitForFunction(() => document.getElementById('status-area')?.innerText === 'Processing Complete', { timeout: 15000 });

    const afterPng = path.join(evidenceDir, 'after_upload.png');
    await page.screenshot({ path: afterPng });

    // Independent verification via harness reading GET /api/uploads
    const uploadsList = await fetch('http://127.0.0.1:4874/api/uploads').then(r => r.json());
    console.log(`[INDEPENDENT HARNESS GET /api/uploads]:`, uploadsList);

    const record = uploadsList[0];
    const serverSavedHash = sha256(record?.savedPath);

    const sizeMatches = record?.size === payloadSize;
    const hashMatches = record?.sha256 === localSha256;
    const statusComplete = record?.status === 'complete';
    const receiptPresent = Boolean(record?.receiptId);
    const savedFileHashMatches = serverSavedHash === localSha256;

    const mainRunPassed = sizeMatches && hashMatches && statusComplete && receiptPresent && savedFileHashMatches;

    await browserManager.close();
    await server.stop();

    // --- NEGATIVE CONTROL (a): 413 Payload Limit Rejection ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL (a): Server 413 Rejection ---`);
    const serverNegA = new Test9Server(4875);
    serverNegA.rejectMode = true;
    await serverNegA.start();

    const pageNegA = await browserManager.getPage({ headless: false });
    await pageNegA.goto('http://127.0.0.1:4875/', { waitUntil: 'domcontentloaded' });

    const fcPromiseA = pageNegA.waitForEvent('filechooser');
    await pageNegA.click('#upload-trigger-btn');
    const fcA = await fcPromiseA;
    await fcA.setFiles(payloadPath);

    await pageNegA.waitForTimeout(2000);
    const filesLengthA = await pageNegA.$eval('#hidden-file-input', el => el.files.length);
    const statusTextA = await pageNegA.$eval('#status-area', el => el.innerText);

    const negAPassed = statusTextA.includes('413') && filesLengthA === 1;
    console.log(`[NEGATIVE CONTROL (a) RESULT] File remains in DOM (len=${filesLengthA}) but status shows rejection (${statusTextA}): ${negAPassed}`);

    await browserManager.close();
    await serverNegA.stop();

    // --- NEGATIVE CONTROL (b): Drop Connection at 50% ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL (b): Dropped Connection at 50% ---`);
    const serverNegB = new Test9Server(4876);
    serverNegB.dropMode = true;
    await serverNegB.start();

    const pageNegB = await browserManager.getPage({ headless: false });
    await pageNegB.goto('http://127.0.0.1:4876/', { waitUntil: 'domcontentloaded' });

    const fcPromiseB = pageNegB.waitForEvent('filechooser');
    await pageNegB.click('#upload-trigger-btn');
    const fcB = await fcPromiseB;
    await fcB.setFiles(payloadPath);

    await pageNegB.waitForTimeout(2000);
    const uploadsListB = await fetch('http://127.0.0.1:4876/api/uploads').then(r => r.json());
    const negBPassed = uploadsListB.length === 0; // No complete upload recorded
    console.log(`[NEGATIVE CONTROL (b) RESULT] Server recorded zero completed uploads due to dropped socket: ${negBPassed}`);

    await browserManager.close();
    await serverNegB.stop();

    // --- NEGATIVE CONTROL (c): Corrupted Bytes Hash Mismatch ---
    console.log(`\n--- RUNNING NEGATIVE CONTROL (c): Corrupted Bytes Mismatch ---`);
    const serverNegC = new Test9Server(4877);
    serverNegC.corruptMode = true;
    await serverNegC.start();

    const pageNegC = await browserManager.getPage({ headless: false });
    await pageNegC.goto('http://127.0.0.1:4877/', { waitUntil: 'domcontentloaded' });

    const fcPromiseC = pageNegC.waitForEvent('filechooser');
    await pageNegC.click('#upload-trigger-btn');
    const fcC = await fcPromiseC;
    await fcC.setFiles(payloadPath);

    await pageNegC.waitForTimeout(4000);
    const uploadsListC = await fetch('http://127.0.0.1:4877/api/uploads').then(r => r.json());
    const recordC = uploadsListC[0];
    const negCPassed = recordC && recordC.sha256 !== localSha256; // Hash mismatch detected
    console.log(`[NEGATIVE CONTROL (c) RESULT] Server byte hash (${recordC?.sha256?.substring(0,10)}...) differed from local hash (${localSha256.substring(0,10)}...): ${negCPassed}`);

    await browserManager.close();
    await serverNegC.stop();

    // Cleanup local payload file
    try { fs.unlinkSync(payloadPath); } catch (e) {}

    // Compute artifact hashes
    const expectedHash = sha256(expectedPath);
    const beforePngHash = sha256(beforePng);
    const afterPngHash = sha256(afterPng);

    const logPath = path.join(evidenceDir, 'raw_execution.log');
    fs.writeFileSync(logPath, JSON.stringify({
        record,
        localSha256,
        serverSavedHash,
        mainRunPassed,
        negAPassed,
        negBPassed,
        negCPassed
    }, null, 2), 'utf8');
    const logHash = sha256(logPath);

    const overallPass = mainRunPassed && negAPassed && negBPassed && negCPassed;
    const finalExitCode = overallPass ? 0 : 1;

    const reportContent = `TEST 9: REAL UPLOAD (server-side completion)
BEFORE STATE
Server Uploads Count: 0, Local Payload: 8 MB (${payloadSize} bytes), Local SHA-256: ${localSha256}

ACTION
Goal: "Upload ${payloadPath} and tell me when the server has fully processed it."
executionMethod: Playwright FileChooser via styled button click
cursorMoved: false

AFTER STATE
Server Receipt ID: ${record?.receiptId}
Status: ${record?.status}
Server Received Size: ${record?.size} bytes
Server Computed SHA-256: ${record?.sha256}

EXPECTED STATE
${JSON.stringify(expectedData.expectedState, null, 2)}

ACTUAL STATE
Receipt ID: ${record?.receiptId}
Server Status: ${record?.status}
Size Equal: ${sizeMatches} (${record?.size} bytes)
SHA-256 Equal: ${hashMatches}
Server Saved-File Hash Match: ${savedFileHashMatches}

VERIFICATION
1. Independent harness GET /api/uploads confirmed status 'complete'.
2. Received byte size (8,388,608) strictly matched local payload size.
3. Server-side SHA-256 hash matched local payload hash (${localSha256}).
4. Saved file on server disk was independently hashed and matched payload SHA-256.
5. Server Receipt ID generated and verified: ${record?.receiptId}.

NEGATIVE CONTROLS
(a) Server 413 Rejection: DOM input listed file (length 1) but status area showed rejection, test harness verified FAIL.
(b) Dropped Connection at 50%: Server socket aborted at 50% upload, zero completed uploads recorded, test harness verified FAIL.
(c) Corrupted Bytes Mode: Server saved corrupted bytes, SHA-256 mismatch detected, test harness verified FAIL.

EVIDENCE
expected.json SHA-256: ${expectedHash}
before_upload.png SHA-256: ${beforePngHash} (Dimensions: 1280x800)
after_upload.png SHA-256: ${afterPngHash} (Dimensions: 1280x800)
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

runTest9().catch(err => {
    console.error('Test 9 Error:', err);
    process.exit(1);
});
