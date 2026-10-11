const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function runRoutingTestsAF() {
    console.log('=== CODEZ48 ENVIRONMENT ROUTING REGRESSION MATRIX (TESTS A-F) ===\n');

    const tests = [
        {
            id: 'TEST A',
            task: 'Open the installed MetaTrader 5 desktop application.',
            expectedEnv: 'NATIVE_APPLICATION',
            cmd: 'node cli.js pilot "Open the installed MetaTrader 5 desktop application."'
        },
        {
            id: 'TEST B',
            task: 'Open https://news.ycombinator.com/',
            expectedEnv: 'BROWSER',
            cmd: 'node cli.js pilot "Open https://news.ycombinator.com/"'
        },
        {
            id: 'TEST C',
            task: 'Create a folder named Codez48Test on the desktop.',
            expectedEnv: 'WINDOWS_FILESYSTEM',
            cmd: 'node cli.js pilot "Create a folder named Codez48Test on the desktop."'
        },
        {
            id: 'TEST D',
            task: 'Open File Explorer.',
            expectedEnv: 'FILE_EXPLORER',
            cmd: 'node cli.js pilot "Open File Explorer."'
        },
        {
            id: 'TEST E',
            task: 'Open Microsoft Word desktop application.',
            expectedEnv: 'NATIVE_APPLICATION',
            cmd: 'node cli.js pilot "Open Microsoft Word desktop application."'
        },
        {
            id: 'TEST F',
            task: 'Go to Gmail.',
            expectedEnv: 'BROWSER',
            cmd: 'node cli.js pilot "Go to Gmail."'
        }
    ];

    const results = [];

    for (const t of tests) {
        console.log(`\n------------------------------------------------------------`);
        console.log(`[EXECUTING ${t.id}] Task: "${t.task}"`);
        console.log(`Expected Environment: ${t.expectedEnv}`);

        const args = t.cmd.split(' ').slice(1);
        const res = spawnSync('node', args, { encoding: 'utf8', windowsHide: true });
        const output = res.stdout.trim();

        const envMatch = output.match(/\[ENVIRONMENT CLASSIFICATION\]\s+([A-Z_]+)/);
        const selectedEnv = envMatch ? envMatch[1] : 'UNKNOWN';
        const browserOpened = output.includes('Initializing browser worker connection') || output.includes('Launch persistent context');

        const envCorrect = selectedEnv === t.expectedEnv || (t.expectedEnv === 'FILE_EXPLORER' && selectedEnv === 'WINDOWS_FILESYSTEM');
        const browserPolicyCorrect = t.expectedEnv === 'BROWSER' ? browserOpened : !browserOpened;

        const pass = res.status === 0 && envCorrect && browserPolicyCorrect;

        results.push({
            id: t.id,
            task: t.task,
            expectedEnv: t.expectedEnv,
            selectedEnv,
            browserOpened: browserOpened ? 'YES' : 'NO',
            exitCode: res.status,
            result: pass ? 'PASS' : 'FAIL',
            output: output.substring(0, 150)
        });

        console.log(`Selected Environment: ${selectedEnv}`);
        console.log(`Browser Opened: ${browserOpened ? 'YES' : 'NO'}`);
        console.log(`Exit Code: ${res.status}`);
        console.log(`Result: ${pass ? 'PASS' : 'FAIL'}`);
    }

    console.log('\n============================================================');
    console.log('ENVIRONMENT ROUTING REGRESSION REPORT');
    console.log('============================================================\n');

    console.log('TEST | USER INTENT | CLASSIFIED ENVIRONMENT | BROWSER OPENED | EXIT CODE | RESULT');
    console.log('------------------------------------------------------------');
    results.forEach(r => {
        console.log(`${r.id} | ${r.task} | ${r.selectedEnv} | ${r.browserOpened} | ${r.exitCode} | ${r.result}`);
    });
}

runRoutingTestsAF();
