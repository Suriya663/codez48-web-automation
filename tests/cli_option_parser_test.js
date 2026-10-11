const assert = require('assert');

function parseCliArgs(rawArgs) {
    let answer = null;
    let debug = false;
    let remember = false;
    let disableDismiss = false;
    let testSafetyLoop = false;
    let goalTokens = [];

    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg === 'pilot' || arg === 'cli') continue;
        if (arg === '--answer') {
            if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--')) {
                answer = rawArgs[++i];
            }
        } else if (arg.startsWith('--answer=')) {
            answer = arg.split('=')[1];
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg === '--remember') {
            remember = true;
        } else if (arg === '--disable-dismiss') {
            disableDismiss = true;
        } else if (arg === '--visible-safety-test') {
            testSafetyLoop = true;
        } else {
            goalTokens.push(arg);
        }
    }

    const rawGoalStr = goalTokens.join(' ').replace(/^["']|["']$/g, '').trim();
    const goal = rawGoalStr || 'Open https://codez48.netlify.app/';

    const goalTextNoUrl = goal.replace(/https?:\/\/[^\s]+/gi, '');
    let expectedHref = null;
    if (/\bcli\b/i.test(goalTextNoUrl)) {
        expectedHref = '/cli';
    } else if (/\bpricing\b/i.test(goalTextNoUrl)) {
        expectedHref = '#pricing';
    } else if (/\bclick\b/i.test(goalTextNoUrl)) {
        const match = goalTextNoUrl.match(/click\s+(?:the\s+)?([a-zA-Z0-9_\-\/#]+)/i);
        if (match) {
            expectedHref = match[1];
        }
    }

    return { answer, debug, remember, disableDismiss, testSafetyLoop, goal, expectedHref };
}

function runTests() {
    console.log('=== CLI OPTION PARSER TEST SUITE ===');

    // Test 1: Valid --answer with space
    const res1 = parseCliArgs(['pilot', '--answer', 'English', 'Open https://codez48.netlify.app/ and click the CLI navigation']);
    assert.strictEqual(res1.answer, 'English');
    assert.strictEqual(res1.goal, 'Open https://codez48.netlify.app/ and click the CLI navigation');
    assert.strictEqual(res1.expectedHref, '/cli');
    console.log('[TEST 1 PASSED] Standard --answer flag parsing');

    // Test 2: Valid --answer=Value format
    const res2 = parseCliArgs(['pilot', '--answer=Spanish', 'Open https://codez48.netlify.app/ and click pricing']);
    assert.strictEqual(res2.answer, 'Spanish');
    assert.strictEqual(res2.expectedHref, '#pricing');
    console.log('[TEST 2 PASSED] --answer=Value syntax parsing');

    // Test 3: Missing value for trailing --answer
    const res3 = parseCliArgs(['pilot', 'Open https://codez48.netlify.app/', '--answer']);
    assert.strictEqual(res3.answer, null);
    assert.strictEqual(res3.goal, 'Open https://codez48.netlify.app/');
    console.log('[TEST 3 PASSED] Trailing --answer without value handled cleanly');

    // Test 4: Different option ordering
    const res4 = parseCliArgs(['pilot', '--debug', '--disable-dismiss', '--answer', 'German', 'Open https://codez48.netlify.app/']);
    assert.strictEqual(res4.debug, true);
    assert.strictEqual(res4.disableDismiss, true);
    assert.strictEqual(res4.answer, 'German');
    assert.strictEqual(res4.goal, 'Open https://codez48.netlify.app/');
    console.log('[TEST 4 PASSED] Mixed option flag ordering');

    // Test 5: Goal containing URLs with embedded 'cli' (e.g. netlify.app)
    const res5 = parseCliArgs(['pilot', 'Open https://codez48.netlify.app/ and click NonExistentTarget']);
    assert.strictEqual(res5.expectedHref, 'NonExistentTarget');
    console.log('[TEST 5 PASSED] URL domain substring collision prevented (netlify != cli)');

    // Test 6: Goal text containing flag-like words inside task prompt
    const res6 = parseCliArgs(['pilot', 'click the debug button on https://codez48.netlify.app/']);
    assert.strictEqual(res6.expectedHref, 'debug');
    console.log('[TEST 6 PASSED] Embedded task words handled cleanly without flag pollution');

    console.log('ALL CLI OPTION PARSER TESTS PASSED SUCCESSFULLY.');
}

try {
    runTests();
} catch (err) {
    console.error('CLI OPTION PARSER TEST FAILED:', err.message);
    process.exit(1);
}
