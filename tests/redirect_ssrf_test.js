const http = require('http');
const assert = require('assert');
const pilotNavigator = require('../playwright-worker/pilot-navigator');

async function testRedirectSsrfProtection() {
    console.log('=== CONTROLLED PUBLIC-TO-PRIVATE REDIRECT SSRF TEST ===');

    // Start a local test server that issues a 302 redirect to a link-local / private address
    const server = http.createServer((req, res) => {
        if (req.url === '/redirect-to-private') {
            console.log('[TEST SERVER] Received request, issuing 302 redirect to http://169.254.169.254/latest/meta-data/');
            res.writeHead(302, { 'Location': 'http://169.254.169.254/latest/meta-data/' });
            return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Safe Test Page</body></html>');
    });

    await new Promise(resolve => server.listen(8089, resolve));
    console.log('[TEST SERVER LIVE] Server running at http://127.0.0.1:8089');

    try {
        process.env.ALLOW_LOCAL_TARGETS = 'true';
        const res = await pilotNavigator.scrapeAndCloneWebsite('http://127.0.0.1:8089/redirect-to-private', 'startify', 8080);
        console.log('[REDIRECT TEST RESULT]:', res);

        assert.strictEqual(res.success, false, 'Redirect to private IP 169.254.169.254 must be blocked');
        assert.strictEqual(res.error === 'REDIRECT_BLOCKED' || res.error === 'EXTRACTION_FAILED', true, 'Redirect must fail closed with REDIRECT_BLOCKED or EXTRACTION_FAILED');
        console.log('[TEST PASSED] Redirect to private IP 169.254.169.254 was intercepted and blocked before access!');
    } finally {
        delete process.env.ALLOW_LOCAL_TARGETS;
        server.close();
        console.log('[TEST SERVER CLOSED] Cleaned up test server.');
    }
}

testRedirectSsrfProtection().catch(err => {
    console.error('REDIRECT SSRF TEST FAILED:', err.message);
    process.exit(1);
});
