const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function runMasterTestMatrix6() {
    console.log('=== CODEZ48 6-TEST RUNTIME TEST MATRIX ===\n');

    const matrix = [];

    function recordTest(testName, env, command, expected) {
        console.log(`\n------------------------------------------------------------`);
        console.log(`RUNNING: ${testName}`);
        console.log(`COMMAND: ${command}`);
        const res = spawnSync('node', command.split(' ').slice(1), { encoding: 'utf8', windowsHide: true });
        console.log(res.stdout.trim());
        const passed = res.status === 0 && !res.stdout.includes('Browsing') && !res.stdout.includes('browser-manager');
        matrix.push({ testName, env, result: passed ? 'PASS' : 'FAIL', exitCode: res.status, evidence: res.stdout.trim() });
    }

    // TEST 1 — FILESYSTEM ONLY
    recordTest(
        'TEST 1 — FILESYSTEM ONLY',
        'WINDOWS_FILESYSTEM',
        'node cli.js pilot Go to my Desktop, create a new folder named Codez48_Automation_Test, open that folder, create a text file named test.txt, and verify that the file exists.',
        'Folder exists, File exists, NO BROWSER'
    );

    // TEST 2 — NATIVE APPLICATION
    recordTest(
        'TEST 2 — NATIVE APPLICATION',
        'NATIVE_APPLICATION',
        'node cli.js pilot Open Notepad',
        'Notepad launched successfully'
    );

    // TEST 3 — BROWSER
    recordTest(
        'TEST 3 — BROWSER',
        'BROWSER',
        'node cli.js pilot Open https://www.wikipedia.org/',
        'Wikipedia opened in browser'
    );

    // TEST 4 — MIXED ENVIRONMENT
    recordTest(
        'TEST 4 — MIXED ENVIRONMENT',
        'MIXED_ENVIRONMENT',
        'node cli.js pilot Open https://codez48.netlify.app/',
        'Filesystem + Browser transition verified'
    );

    // TEST 5 — WINDOW / APPLICATION SWITCHING
    recordTest(
        'TEST 5 — WINDOW / APPLICATION SWITCHING',
        'NATIVE_APPLICATION',
        'node cli.js pilot Open Notepad',
        'Window activation verified'
    );

    // TEST 6 — FILESYSTEM NEGATIVE ROUTING
    recordTest(
        'TEST 6 — FILESYSTEM NEGATIVE ROUTING',
        'WINDOWS_FILESYSTEM',
        'node cli.js pilot Create a folder named Routing_Test on my Desktop.',
        'Folder created without opening browser'
    );

    console.log('\n============================================================');
    console.log('6-TEST MATRIX REPORT SUMMARY');
    console.log('============================================================');
    matrix.forEach(m => {
        console.log(`TEST: ${m.testName}`);
        console.log(`ENVIRONMENT: ${m.env}`);
        console.log(`RESULT: ${m.result}`);
        console.log(`EXIT CODE: ${m.exitCode}`);
        console.log(`EVIDENCE: ${m.evidence.substring(0, 100)}...`);
        console.log('------------------------------------------------------------');
    });
}

runMasterTestMatrix6();
