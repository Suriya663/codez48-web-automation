const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn, spawnSync } = require('child_process');

const testDir = path.resolve('pilot-workspace/test_env');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({ name: 'test-env', version: '1.0.0' }, null, 2));

const calcDir = path.resolve('pilot-workspace/calculator_app');

const tgzPath = path.resolve('codez48-cli-1.3.3.tgz');
console.log('Installing package from:', tgzPath);
execSync(`npm install "${tgzPath}"`, { cwd: testDir, stdio: 'inherit', shell: true });

function runTest(name, cmd, args, options = {}) {
    console.log(`\n--- Testing ${name} ---`);
    const syncRes = spawnSync(cmd, args, { cwd: testDir, stdio: 'inherit', shell: true, ...options });
    if (syncRes.status !== 0) {
        console.error(`[TEST FAILED] ${name} exited with status ${syncRes.status}`);
        process.exit(syncRes.status || 1);
    }
    console.log(`[TEST PASSED] ${name}`);
}

function runFailTest(name, cmd, args, options = {}) {
    console.log(`\n--- Testing Negative Case: ${name} ---`);
    const syncRes = spawnSync(cmd, args, { cwd: testDir, stdio: 'pipe', shell: true, ...options });
    if (syncRes.status === 0) {
        console.error(`[TEST FAILED] Negative test "${name}" unexpectedly passed with status 0`);
        process.exit(1);
    }
    console.log(`[TEST PASSED] Negative Case ${name} correctly failed with status ${syncRes.status}`);
}

runTest('codez48 --help', 'npx', ['codez48', '--help']);
runTest('codez48 --version', 'npx', ['codez48', '--version']);

// Test open command & safety guards
runTest('codez48 open (current dir)', 'npx', ['codez48', 'open']);
runTest('codez48 open <testDir>', 'npx', ['codez48', 'open', `"${testDir}"`]);
runFailTest('codez48 open <nonexistent>', 'npx', ['codez48', 'open', 'nonexistent_folder_xyz']);
runFailTest('codez48 open <homedir (guard)>', 'npx', ['codez48', 'open', os.homedir()]);

runTest('codez48 ai Explain Node.js', 'npx', ['codez48', 'ai', 'Explain Node.js']);
runTest('codez48 pilot Hello', 'npx', ['codez48', 'pilot', 'Hello']);

console.log('\n--- Testing codez48 dev workflow (Modification) ---');
runTest('codez48 dev task on test_env', 'npx', ['codez48', 'dev', 'Create index.js with a greeting function', '--path', `"${testDir}"`]);

console.log('\n--- Testing codez48 dev workflow (Greenfield Generation) ---');
runTest('codez48 dev greenfield calculator app', 'npx', ['codez48', 'dev', 'Create a simple calculator website with index.html and script.js', '--path', `"${calcDir}"`]);

console.log('\n--- Testing codez48 interactive pilot mode with timed sequential inputs ---');

const child = spawn('npx', ['codez48', 'pilot'], {
    cwd: testDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
});

let stdoutData = '';
let stderrData = '';

child.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdoutData += chunk;
    process.stdout.write(chunk);
});

child.stderr.on('data', (data) => {
    const chunk = data.toString();
    stderrData += chunk;
    process.stderr.write(chunk);
});

setTimeout(() => {
    console.log('\n[TEST INPUT] Sending "Hi"');
    child.stdin.write('Hi\n');
}, 3000);

setTimeout(() => {
    console.log('\n[TEST INPUT] Sending "Explain Node.js"');
    child.stdin.write('Explain Node.js\n');
}, 12000);

setTimeout(() => {
    console.log('\n[TEST INPUT] Sending "exit"');
    child.stdin.write('exit\n');
}, 24000);

child.on('close', (code) => {
    console.log(`\nInteractive Process Closed with Code: ${code}`);
    console.log('=== CAPTURED STDOUT ===\n', stdoutData);
    console.log('=== CAPTURED STDERR ===\n', stderrData);

    if (code !== 0) {
        console.error(`[TEST FAILED] Interactive Pilot mode exited with status ${code}`);
        process.exit(1);
    }

    if (!stdoutData.includes('You:') || !stdoutData.includes('Hello') || !stdoutData.includes('Node.js')) {
        console.error('[TEST FAILED] Captured stdout did not contain expected conversational responses or prompts.');
        process.exit(1);
    }

    console.log('[TEST PASSED] Interactive Pilot mode with timed sequential inputs verified successfully.');
    console.log('\nALL PACKAGED TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
});
