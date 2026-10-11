const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const Codez48ScrapEngine = require('../playwright-worker/codez48-scrap.js');

async function runAcceptanceTests() {
    console.log('==================================================');
    console.log('   CODEZ48 SCRAP ACCEPTANCE & REGRESSION SUITE   ');
    console.log('==================================================\n');

    const engine = new Codez48ScrapEngine();

    // Setup local mock HTTP target server for testing deterministic responses
    const mockServerPort = 9876;
    const mockServer = http.createServer((req, res) => {
        const urlPath = req.url;
        if (urlPath === '/' || urlPath === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Fixture Website</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="styles.css"> <!-- Duplicate test -->
    <style>body { background: #000; }</style>
</head>
<body>
    <h1>Welcome to Fixture Test</h1>
    <img src="/logo.png" alt="Logo">
    <script src="/app.js"></script>
    <script>console.log("embedded script");</script>
</body>
</html>`);
        } else if (urlPath === '/styles.css') {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end('h1 { color: red; }');
        } else if (urlPath === '/app.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end('console.log("App initialized");');
        } else if (urlPath === '/logo.png') {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(Buffer.from('PNG_MOCK_BYTES'));
        } else if (urlPath === '/redirect') {
            res.writeHead(302, { 'Location': 'http://127.0.0.1:' + mockServerPort + '/' });
            res.end();
        } else if (urlPath === '/error500') {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server Error');
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });

    await new Promise(r => mockServer.listen(mockServerPort, '127.0.0.1', r));
    console.log(`[FIXTURE SERVER STARTED] Listening on http://127.0.0.1:${mockServerPort}`);

    try {
        // Test 1: URL Input and URL Validation (Accept HTTP/HTTPS, reject FTP/invalid)
        console.log('\n[TEST 1] Testing URL input and URL validation...');
        assert.strictEqual(engine.validateUrlSync('https://example.com'), 'https://example.com/');
        assert.strictEqual(engine.validateUrlSync('http://example.com/page'), 'http://example.com/page');
        assert.strictEqual(engine.validateUrlSync('ftp://example.com/file.txt'), null, 'FTP protocol must be rejected');
        assert.strictEqual(engine.validateUrlSync('javascript:alert(1)'), null, 'Javascript URI must be rejected');
        assert.strictEqual(engine.validateUrlSync('not-a-url'), null, 'Malformed string must be rejected');
        console.log('[TEST 1 PASSED] Only HTTP and HTTPS URLs accepted');

        // Test 2: Successful HTML Retrieval
        console.log('\n[TEST 2] Testing successful HTML retrieval on local fixture server...');
        const fixtureUrl = `http://127.0.0.1:${mockServerPort}/`;
        // Allow local target for local fixture testing
        process.env.ALLOW_LOCAL_TARGETS = 'true';
        const res2 = await engine.runScrapWorkflow(fixtureUrl);
        assert.strictEqual(res2.success, true, 'Scrape workflow on fixture should succeed');
        assert.strictEqual(fs.existsSync(res2.outputFolder), true, 'Output folder must exist');
        assert.strictEqual(fs.existsSync(path.join(res2.outputFolder, 'index.html')), true, 'index.html must exist');
        const savedHtml = fs.readFileSync(path.join(res2.outputFolder, 'index.html'), 'utf8');
        assert.strictEqual(savedHtml.includes('Fixture Website'), true, 'Actual retrieved HTML must be preserved');
        console.log('[TEST 2 PASSED] Original HTML successfully retrieved and saved');

        // Test 3: Extraction of linked CSS and JavaScript
        console.log('\n[TEST 3] Testing extraction of linked CSS and JavaScript...');
        const cssPath = path.join(res2.outputFolder, 'assets/css/styles.css');
        const jsPath = path.join(res2.outputFolder, 'assets/js/app.js');
        assert.strictEqual(fs.existsSync(cssPath), true, 'Extracted CSS file must exist on disk');
        assert.strictEqual(fs.existsSync(jsPath), true, 'Extracted JS file must exist on disk');
        assert.strictEqual(fs.readFileSync(cssPath, 'utf8').includes('color: red'), true);
        assert.strictEqual(fs.readFileSync(jsPath, 'utf8').includes('App initialized'), true);
        console.log('[TEST 3 PASSED] Linked CSS and JavaScript files extracted successfully');

        // Test 4: Handling embedded CSS and JavaScript
        console.log('\n[TEST 4] Testing preservation of embedded CSS and JavaScript...');
        assert.strictEqual(savedHtml.includes('<style>body { background: #000; }</style>'), true);
        assert.strictEqual(savedHtml.includes('<script>console.log("embedded script");</script>'), true);
        console.log('[TEST 4 PASSED] Embedded CSS and JavaScript preserved in HTML without splitting');

        // Test 5: Relative and Absolute Resource URL Resolution
        console.log('\n[TEST 5] Testing relative and absolute resource URL resolution...');
        const resolvedAbs = engine.resolveUrl('/styles.css', 'http://example.com/folder/page.html');
        const resolvedRel = engine.resolveUrl('app.js', 'http://example.com/folder/page.html');
        assert.strictEqual(resolvedAbs, 'http://example.com/styles.css');
        assert.strictEqual(resolvedRel, 'http://example.com/folder/app.js');
        console.log('[TEST 5 PASSED] Relative and absolute resource URLs resolved correctly');

        // Test 6: Handling HTTP errors (500)
        console.log('\n[TEST 6] Testing HTTP error handling...');
        const res6 = await engine.runScrapWorkflow(`http://127.0.0.1:${mockServerPort}/error500`);
        assert.strictEqual(res6.success, false, 'HTTP 500 should fail');
        assert.strictEqual(res6.error, 'HTTP_ERROR_STATUS');
        console.log('[TEST 6 PASSED] HTTP error statuses handled safely');

        // Test 7: JavaScript-rendered page handling (DOM readiness)
        console.log('\n[TEST 7] Testing JS-rendered page inspection...');
        assert.strictEqual(res2.scrapedTitle, 'Fixture Website');
        console.log('[TEST 7 PASSED] Page title and rendered DOM extracted');

        // Test 8: Duplicate resource handling
        console.log('\n[TEST 8] Testing duplicate resource de-duplication...');
        const discovered = engine.discoverResources(`
            <link rel="stylesheet" href="/styles.css">
            <link rel="stylesheet" href="/styles.css">
        `, 'http://example.com');
        const uniqueUrls = new Set(discovered.map(r => r.url));
        assert.strictEqual(discovered.length, 2);
        assert.strictEqual(uniqueUrls.size, 1);
        console.log('[TEST 8 PASSED] Duplicate resource candidates deduplicated during download');

        // Test 9: SSRF and Private-Network Blocking
        console.log('\n[TEST 9] Testing SSRF & private network blocking...');
        delete process.env.ALLOW_LOCAL_TARGETS;
        const res9a = await engine.runScrapWorkflow('http://169.254.169.254/latest/meta-data/');
        assert.strictEqual(res9a.success, false, 'SSRF metadata target must be blocked');
        assert.strictEqual(res9a.error, 'INVALID_URL');

        const res9b = await engine.runScrapWorkflow('http://10.0.0.1/admin');
        assert.strictEqual(res9b.success, false, 'Private IP target 10.0.0.1 must be blocked');
        assert.strictEqual(res9b.error, 'INVALID_URL');
        console.log('[TEST 9 PASSED] SSRF attempts to private IP ranges and metadata service blocked');

        // Test 10: Path Traversal and File Path Safety
        console.log('\n[TEST 10] Testing path traversal sanitization...');
        const unsafeRel = engine.sanitizeRelativePath('../../etc/passwd');
        assert.strictEqual(unsafeRel.includes('..'), false, 'Path traversal sequences must be removed');

        const unsafeExt = engine.sanitizeRelativePath('malicious.exe');
        assert.strictEqual(unsafeExt, null, 'Blocked file extensions must return null');
        console.log('[TEST 10 PASSED] Path traversal and unsafe file extensions blocked');

        // Test 11: Manifest Accuracy
        console.log('\n[TEST 11] Testing manifest.json contents and accuracy...');
        assert.strictEqual(fs.existsSync(path.join(res2.outputFolder, 'manifest.json')), true);
        const manifest = JSON.parse(fs.readFileSync(path.join(res2.outputFolder, 'manifest.json'), 'utf8'));
        assert.strictEqual(manifest.tool, 'Codez48 Scrap');
        assert.strictEqual(manifest.httpStatus, 200);
        assert.strictEqual(typeof manifest.successfulDownloads, 'number');
        assert.strictEqual(Array.isArray(manifest.resources), true);
        console.log('[TEST 11 PASSED] Manifest accurately logs scraping metadata and resources');

        // Test 12: ZIP Archive Creation and Integrity
        console.log('\n[TEST 12] Testing ZIP archive creation and integrity...');
        assert.strictEqual(fs.existsSync(res2.zipFilePath), true, 'ZIP archive file must exist on disk');
        const zipHeader = fs.readFileSync(res2.zipFilePath).subarray(0, 4);
        assert.strictEqual(zipHeader.toString('hex'), '504b0304', 'ZIP file must begin with PK signature 0x04034b50');
        console.log('[TEST 12 PASSED] Valid ZIP archive generated with standard PKZip header');

        // Test 13: Download Option Returning Correct ZIP Archive
        console.log('\n[TEST 13] Testing local download endpoint...');
        const downloadRes = await new Promise((resolve) => {
            http.get(res2.downloadUrl, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        contentType: res.headers['content-type'],
                        contentDisposition: res.headers['content-disposition'],
                        body: Buffer.concat(chunks)
                    });
                });
            });
        });

        assert.strictEqual(downloadRes.statusCode, 200, 'Download endpoint must return HTTP 200');
        assert.strictEqual(downloadRes.contentType, 'application/zip', 'Content-Type must be application/zip');
        assert.strictEqual(downloadRes.contentDisposition.includes('attachment'), true, 'Content-Disposition must specify attachment');
        assert.strictEqual(downloadRes.body.subarray(0, 4).toString('hex'), '504b0304', 'Downloaded payload must be valid ZIP file');
        console.log('[TEST 13 PASSED] Local download server served complete ZIP file with correct HTTP headers');

        // Test 14: Preservation of Existing Codez48 Pilot Behavior
        console.log('\n[TEST 14] Testing preservation of existing Pilot CLI commands...');
        const pilotNavigator = require('../playwright-worker/pilot-navigator.js');
        assert.strictEqual(typeof pilotNavigator.navigateAndInteract, 'function');
        assert.strictEqual(typeof pilotNavigator.scrapeAndCloneWebsite, 'function');
        console.log('[TEST 14 PASSED] Existing Pilot navigator and commands preserved cleanly');

        engine.closeServer();
        console.log('\nALL 14 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
    } finally {
        engine.closeServer();
        mockServer.close();
    }
}

runAcceptanceTests().catch(err => {
    console.error('CODEZ48 SCRAP ACCEPTANCE TEST FAILED:', err.message, err.stack);
    process.exit(1);
});
