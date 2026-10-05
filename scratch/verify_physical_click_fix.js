const { spawnSync } = require('child_process');
const path = require('path');
const pilotNavigator = require('../playwright-worker/pilot-navigator.js');
const { getCursor, moveCursorSmoothly } = require('../playwright-worker/win32-cursor.js');

async function runFixVerification() {
    console.log('=== TEST A: node cli.js doctor ===');
    const doc = spawnSync('node', ['cli.js', 'doctor'], { encoding: 'utf8', windowsHide: true });
    console.log(doc.stdout.trim());
    console.log(`Doctor Exit Code: ${doc.status}`);

    console.log('\n=== TEST B: Existing DOM navigation test (Expected /cli) ===');
    const domRes = await pilotNavigator.navigateAndInteract('https://codez48.netlify.app/', '/cli', { forcePhysical: false });
    console.log('DOM Navigation Result:', domRes);

    console.log('\n=== TEST C: Physical cursor movement test ===');
    const start = getCursor();
    const moved = moveCursorSmoothly(500, 300);
    console.log('Start:', start, 'Moved (Koffi verified):', moved);

    console.log('\n=== TEST D: Physical click test (Expected navigate to /cli & state-verifier confirms) ===');
    const physicalRes = await pilotNavigator.navigateAndInteract('https://codez48.netlify.app/', '/cli', { forcePhysical: true });
    console.log('Physical Click Result:', physicalRes);
}

runFixVerification();
