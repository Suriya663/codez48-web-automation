const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pilotNavigator = require('../playwright-worker/pilot-navigator.js');
const { getCursor, setCursor, moveCursorSmoothly } = require('../playwright-worker/win32-cursor.js');

async function verifyHybridSystem() {
    console.log('=== 1. DOCTOR DIAGNOSTICS ===');
    const doctor = spawnSync('node', ['cli.js', 'doctor'], { encoding: 'utf8', windowsHide: true });
    console.log(doctor.stdout.trim());
    console.log(`Doctor Exit Code: ${doctor.status}`);

    console.log('\n=== 2. DOM AUTOMATION PREFERENCE TEST (Confirms Playwright DOM preferred when reliable) ===');
    const domRes = await pilotNavigator.navigateAndInteract('https://codez48.netlify.app/', '/cli', { forcePhysical: false });
    console.log('DOM Result:', domRes);

    console.log('\n=== 3. PHYSICAL CURSOR MOVEMENT TEST ===');
    const startPos = getCursor();
    const movedPos = moveCursorSmoothly(600, 400);
    console.log('Start Pos:', startPos, 'Moved Pos (Verified via Koffi GetCursorPos):', movedPos);

    console.log('\n=== 4. PHYSICAL CLICK & STATE VERIFICATION TEST ===');
    const physicalRes = await pilotNavigator.navigateAndInteract('https://codez48.netlify.app/', '/cli', { forcePhysical: true });
    console.log('Physical Fallback Result:', physicalRes);
}

verifyHybridSystem();
