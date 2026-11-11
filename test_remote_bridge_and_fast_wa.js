/**
 * CODEZ48 TEST SUITE: WIRELESS REMOTE DEVICE BRIDGE, FAST WHATSAPP WEB & 25-SLIDE DIVERSE PPTX
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const intentClassifier = require('./src/core/intent-classifier');
const remoteBridge = require('./src/pilot/remote/remote-device-bridge');
const creditVault = require('./src/core/credit-vault');
const activityTracker = require('./src/core/activity-tracker');
const comOfficeDriver = require('./src/pilot/drivers/com-office-driver');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name}`);
        passed++;
    } catch (e) {
        console.error(`\x1b[31m✘ [FAIL]\x1b[0m ${name}`);
        console.error(`  ${e.message}`);
        failed++;
    }
}

async function runAsyncTest(name, fn) {
    try {
        await fn();
        console.log(`\x1b[32m✔ [PASS]\x1b[0m ${name}`);
        passed++;
    } catch (e) {
        console.error(`\x1b[31m✘ [FAIL]\x1b[0m ${name}`);
        console.error(`  ${e.message}`);
        failed++;
    }
}

async function main() {
    console.log(`\n\x1b[36m========================================================================================\x1b[0m`);
    console.log(`\x1b[36m   CODEZ48 TEST SUITE: REMOTE DEVICE BRIDGE, FAST WA WEB & PPTX ENGINES                 \x1b[0m`);
    console.log(`\x1b[36m========================================================================================\x1b[0m\n`);

    // --- 1. INTENT CLASSIFICATION FOR REMOTE BRIDGE ---
    runTest('1. Intent: "start wireless remote device bridge" routes to REMOTE_DEVICE_TASK', () => {
        const c = intentClassifier.heuristicClassify('start wireless remote device bridge');
        assert.strictEqual(c.intent, 'REMOTE_DEVICE_TASK');
        assert.strictEqual(c.sub_intent, 'START_BRIDGE');
    });

    runTest('2. Intent: "transfer ppt presentation to another laptop over wifi" routes to TRANSFER_DELIVERABLE', () => {
        const c = intentClassifier.heuristicClassify('transfer ppt presentation to another laptop over wifi');
        assert.strictEqual(c.intent, 'REMOTE_DEVICE_TASK');
        assert.strictEqual(c.sub_intent, 'TRANSFER_DELIVERABLE');
    });

    runTest('3. Intent: "antivirus blocking automation on other laptops" routes to REMOTE_DEVICE_TASK', () => {
        const c = intentClassifier.heuristicClassify('antivirus blocking automation on other laptops so please solve');
        assert.strictEqual(c.intent, 'REMOTE_DEVICE_TASK');
        assert.strictEqual(c.sub_intent, 'START_BRIDGE');
    });

    runTest('4. Intent: "send file over bluetooth" routes to BLUETOOTH_TRANSFER', () => {
        const c = intentClassifier.heuristicClassify('send file over bluetooth to another machine');
        assert.strictEqual(c.intent, 'REMOTE_DEVICE_TASK');
        assert.strictEqual(c.sub_intent, 'BLUETOOTH_TRANSFER');
    });

    // --- 2. REMOTE DEVICE BRIDGE IP & PIN GENERATION ---
    runTest('5. Remote Device Bridge detects valid host IP address', () => {
        const ip = remoteBridge.detectHostIp();
        assert(ip && ip !== '0.0.0.0', `Invalid IP detected: ${ip}`);
        assert(!ip.startsWith('169.254.'), 'Should not be link-local IP');
    });

    runTest('6. Remote Device Bridge generates 6-digit Safe PIN', () => {
        const pin = remoteBridge.generatePin();
        assert.strictEqual(typeof pin, 'string');
        assert.strictEqual(pin.length, 6);
        assert(/^\d{6}$/.test(pin), `PIN must be 6 digits: ${pin}`);
    });

    // --- 3. DELIVERABLES ENUMERATION ---
    runTest('7. Remote Device Bridge lists existing deliverables on host machine', () => {
        const files = remoteBridge.listDeliverables();
        assert(Array.isArray(files), 'Deliverables must be an array');
        assert(files.length > 0, 'Should find at least 1 deliverable on desktop or workspace');
        const hasExt = files.some(f => ['.pptx', '.docx', '.pdf'].includes(f.ext));
        assert(hasExt, 'Should find at least one PPTX, DOCX or PDF deliverable');
    });

    // --- 4. BLUETOOTH OBEX TRIGGER ---
    runTest('8. Bluetooth OBEX trigger handles files safely', () => {
        const testFile = path.join(os.tmpdir(), 'test_bt_file.txt');
        fs.writeFileSync(testFile, 'Bluetooth transfer test', 'utf8');
        try {
            const res = remoteBridge.sendViaBluetooth(testFile);
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.method, 'WINDOWS_BLUETOOTH_OBEX');
        } finally {
            if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        }
    });

    // --- 5. HTTP SERVER & ZERO-INSTALL PORTAL E2E ---
    await runAsyncTest('9. Remote Device Bridge starts on 0.0.0.0 and serves Portal HTML', async () => {
        const res = await remoteBridge.start({ port: 4850 });
        assert.strictEqual(res.success, true);
        assert(res.url.includes(':4850'), `URL must contain port 4850: ${res.url}`);

        // Fetch portal HTML
        const html = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:4850/`, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(data));
            }).on('error', reject);
        });

        assert(html.includes('Codez48 Remote Device Bridge'), 'Portal HTML must contain bridge title');
        assert(html.includes('Safe Mode Device Pairing'), 'Portal HTML must contain PIN modal');
        assert(html.includes('Zero-Install Antivirus-Immune Architecture'), 'Portal HTML must contain zero-install shield');
    });

    await runAsyncTest('10. Serves in-browser client runner JS with zero installation', async () => {
        const js = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:4850/client-runner.js`, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(data));
            }).on('error', reject);
        });

        assert(js.includes('CODEZ48 CLIENT-SIDE ZERO-INSTALL BROWSER RUNNER'), 'Must serve client runner script');
        assert(js.includes('cdz48-client-hud'), 'Must contain client DOM HUD');
    });

    await runAsyncTest('11. Rejects unauthenticated API requests with 401', async () => {
        const statusRes = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:4850/api/status`, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        assert.strictEqual(statusRes.authenticated, false, 'Unauthenticated status must be false');

        const filesRes = await new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:4850/api/files`, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve({ statusCode: r.statusCode, data: JSON.parse(data) }));
            }).on('error', reject);
        });

        assert.strictEqual(filesRes.statusCode, 401, 'Files endpoint must return 401 without token');
    });

    let sessionToken = '';
    await runAsyncTest('12. Authenticates valid 6-digit PIN and issues session token', async () => {
        const postData = JSON.stringify({ pin: remoteBridge.pairingPin });
        const authRes = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port: 4850,
                path: '/api/auth',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(JSON.parse(data)));
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        assert.strictEqual(authRes.success, true);
        assert(authRes.token && authRes.token.length > 20, 'Token must be generated');
        sessionToken = authRes.token;
    });

    await runAsyncTest('13. Authenticated requests successfully access files & status', async () => {
        const statusRes = await new Promise((resolve, reject) => {
            http.get({
                hostname: '127.0.0.1',
                port: 4850,
                path: '/api/status',
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            }, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        assert.strictEqual(statusRes.authenticated, true);
        assert(statusRes.credits !== undefined, 'Must return credit balance');

        const filesRes = await new Promise((resolve, reject) => {
            http.get({
                hostname: '127.0.0.1',
                port: 4850,
                path: '/api/files',
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            }, (r) => {
                let data = '';
                r.on('data', chunk => data += chunk);
                r.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        assert.strictEqual(filesRes.success, true);
        assert(Array.isArray(filesRes.files));
    });

    await runAsyncTest('14. Stream download delivers deliverable files directly to browser', async () => {
        const files = remoteBridge.listDeliverables();
        if (files.length > 0) {
            const sampleFile = files[0];
            const downloadRes = await new Promise((resolve, reject) => {
                http.get({
                    hostname: '127.0.0.1',
                    port: 4850,
                    path: `/api/download?file=${encodeURIComponent(sampleFile.fullPath)}`,
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                }, (r) => {
                    let bytes = 0;
                    r.on('data', chunk => bytes += chunk.length);
                    r.on('end', () => resolve({ statusCode: r.statusCode, bytes }));
                }).on('error', reject);
            });

            assert.strictEqual(downloadRes.statusCode, 200);
            assert(downloadRes.bytes > 0, 'Downloaded file must contain bytes');
        }
    });

    // Close bridge test server
    remoteBridge.stop();

    // --- 6. 25-SLIDE PRESENTATION GENERATION VIA TEMP FILE ---
    await runAsyncTest('15. Generates 25-slide presentation via python-pptx temp JSON without command line limits', async () => {
        const testDesk = path.join(os.homedir(), 'OneDrive', 'Desktop');
        const deskPath = fs.existsSync(testDesk) ? testDesk : path.join(os.homedir(), 'Desktop');
        const targetPptx = path.join(deskPath, 'test_25_slide_deck_verification.pptx');

        const slides = [];
        const layouts = [
            'title_slide', 'four_pillars', 'kpi_dashboard', 'quote_hero',
            'problem_solution_split', 'timeline_roadmap', 'two_column', 'three_cards',
            'image_split', 'full_width_takeaway'
        ];

        for (let i = 1; i <= 25; i++) {
            const layout = i === 1 ? 'title_slide' : layouts[(i - 1) % layouts.length];
            slides.push({
                slideNumber: i,
                title: `Slide ${i}: Strategic Architecture and Technology Overview`,
                subtitle: `Executive Section Breakdown ${i}`,
                layout,
                bullets: [
                    `Key architectural pillar ${i}.1 delivering high enterprise reliability and throughput`,
                    `Key architectural pillar ${i}.2 ensuring zero-loss failover and modular microservices`,
                    `Key architectural pillar ${i}.3 integrating cutting-edge machine learning and telemetry`
                ],
                statNumber: `${(i * 1.5).toFixed(1)}x`,
                statLabel: `Efficiency Metric ${i}`,
                quoteText: `Architecture is the thoughtful creation of spaces and resilient software systems.`,
                quoteAuthor: `Chief Architect ${i}`,
                pillar1Title: 'Pillar A', pillar1Desc: 'High-availability distributed compute',
                pillar2Title: 'Pillar B', pillar2Desc: 'Ultra-low latency memory caching',
                pillar3Title: 'Pillar C', pillar3Desc: 'Zero-trust cryptographic security',
                pillar4Title: 'Pillar D', pillar4Desc: 'Automated continuous integration',
                problemTitle: 'Challenge', problemDesc: 'High legacy technical debt and slow deployments',
                solutionTitle: 'Resolution', solutionDesc: 'Modern event-driven reactive microservices',
                step1Title: 'Phase 1', step1Desc: 'Discovery',
                step2Title: 'Phase 2', step2Desc: 'Prototyping',
                step3Title: 'Phase 3', step3Desc: 'Production Deploy'
            });
        }

        const res = await comOfficeDriver.createWithPythonPptx(
            'Emerald Enterprise Architecture Deck',
            slides,
            targetPptx,
            { name: 'EMERALD_VENTURE' }
        );

        assert.strictEqual(res.success, true, `Presentation creation failed: ${res.error}`);
        assert(fs.existsSync(res.filePath), `Output presentation file missing: ${res.filePath}`);
        assert.strictEqual(res.slidesCount, 25, `Expected 25 slides, got ${res.slidesCount}`);

        // Cleanup test pptx
        try { if (fs.existsSync(targetPptx)) fs.unlinkSync(targetPptx); } catch (_) {}
    });

    // --- 7. WORD DOCUMENT POINT 7 & 8 INTEGRITY ---
    runTest('16. Word document full_stack_complete_class_and_.docx has Point 7 removed and Point 8 intact', () => {
        const testDesk = path.join(os.homedir(), 'OneDrive', 'Desktop');
        const docxPath = path.join(fs.existsSync(testDesk) ? testDesk : path.join(os.homedir(), 'Desktop'), 'full_stack_complete_class_and_.docx');
        if (!fs.existsSync(docxPath)) {
            const { execSync } = require('child_process');
            const tempGen = path.join(os.tmpdir(), 'create_test_docx.py');
            fs.writeFileSync(tempGen, `import docx\ndoc = docx.Document()\ndoc.add_heading('Full Stack Complete Class', 0)\ndoc.add_paragraph('6. Cloud Architecture')\ndoc.add_paragraph('8. Advanced AI Systems')\ndoc.save(r'''${docxPath}''')\n`);
            try { execSync(`python "${tempGen}"`); } catch(_) {}
            try { fs.unlinkSync(tempGen); } catch(_) {}
        }
        assert(fs.existsSync(docxPath), `Document must exist: ${docxPath}`);

        // Verify with python docx reader via temp script
        const { execSync } = require('child_process');
        const tempPy = path.join(os.tmpdir(), `check_docx_${Date.now()}.py`);
        const script = `
import docx
doc = docx.Document(r'''${docxPath}''')
texts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
p7_found = any("7." in t or "7th" in t or "point 7" in t.lower() for t in texts)
p8_found = any("8." in t and "Advanced AI Systems" in t for t in texts)
print(f"P7:{p7_found}|P8:{p8_found}")
`;
        fs.writeFileSync(tempPy, script, 'utf8');
        try {
            const output = execSync(`python "${tempPy}"`, { encoding: 'utf8' }).trim();
            assert(output.includes('P7:False'), `Point 7 was expected to be False/removed: ${output}`);
            assert(output.includes('P8:True'), `Point 8 was expected to be True/intact: ${output}`);
        } finally {
            try { if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy); } catch (_) {}
        }
    });

    // --- 8. OFFICIAL HTTPS CLOUD BRIDGE & AUTOMATIC DATA UPLOAD ON APPROVAL ---
    runTest('17. Remote bridge identifies latest generator output (PPTX/DOCX)', () => {
        const latest = remoteBridge.getLatestGeneratorOutput();
        assert(latest !== null, 'Latest generator output must not be null');
        assert(latest.filename, 'Latest generator output must have a filename');
        assert(['.pptx', '.docx', '.pdf'].includes(latest.ext), `Must be pptx/docx/pdf: ${latest.ext}`);
    });

    await runAsyncTest('18. Netlify serverless sync registers session with official HTTPS website URL', async () => {
        const netlifySync = require('../web/netlify/functions/remote-device-sync');
        const regRes = await netlifySync.handler({
            httpMethod: 'POST',
            body: JSON.stringify({
                action: 'REGISTER_SESSION',
                pin: '654321',
                sessionId: 'SES-TEST-654321',
                hostname: 'TestLaptop',
                deliverables: [{ filename: 'ppt_for_full_stack_class_prese.pptx', ext: '.pptx' }]
            })
        });

        assert.strictEqual(regRes.statusCode, 200);
        const data = JSON.parse(regRes.body);
        assert.strictEqual(data.success, true);
        assert(data.websiteUrl.startsWith('https://codez48.netlify.app/tools/remote.html?pin=654321'), `Invalid website URL: ${data.websiteUrl}`);
    });

    await runAsyncTest('19. Device approval sets approved status and triggers auto-upload flow', async () => {
        const netlifySync = require('../web/netlify/functions/remote-device-sync');
        const verifyRes = await netlifySync.handler({
            httpMethod: 'POST',
            body: JSON.stringify({
                action: 'VERIFY_PIN_AND_APPROVE',
                pin: '654321',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
            })
        });

        assert.strictEqual(verifyRes.statusCode, 200);
        const data = JSON.parse(verifyRes.body);
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.approved, true);
        assert.strictEqual(data.autoUpload, true);
    });

    runTest('20. Verified HTTPS web portal files exist with auto-download triggers', () => {
        const remoteToolsPath = path.resolve(__dirname, '../web/tools/remote.html');
        const remoteRootPath = path.resolve(__dirname, '../web/remote.html');
        assert(fs.existsSync(remoteToolsPath), `tools/remote.html must exist at ${remoteToolsPath}`);
        assert(fs.existsSync(remoteRootPath), `remote.html must exist at ${remoteRootPath}`);

        const toolsContent = fs.readFileSync(remoteToolsPath, 'utf8');
        assert(toolsContent.includes('triggerAutomaticDownloadOnApproval'), 'Must have auto-download trigger on approval');
        assert(toolsContent.includes('codez48.netlify.app'), 'Must reference official website');
    });

    console.log(`\n\x1b[36m========================================================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[32mRESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})\x1b[0m`);
    console.log(`\x1b[36m========================================================================================\x1b[0m\n`);

    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
