const fs = require('fs');
const path = require('path');
const agentController = require('./core/agent-controller');
const workspaceManager = require('./core/workspace-manager');
const readline = require('readline');
const { spawnSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mockApi = async () => ({
    success: true,
    answer: 'Node project generated.',
    actions: [
        {
            type: 'create_file',
            path: 'package.json',
            content: JSON.stringify({
                name: 'suriya-node-app',
                version: '1.0.0',
                main: 'index.js',
                scripts: { start: 'node index.js' }
            }, null, 2)
        },
        {
            type: 'create_file',
            path: 'index.js',
            content: 'console.log("my name i suriya");\n'
        }
    ]
});

async function runSuriyaPromptTest() {
    console.log('=== DESKTOP PILOT VERIFICATION: SURIYA PROMPT ===\n');
    const prompt = 'Create a node js project program display my name i suriya this text show';
    console.log(`[USER PROMPT] "${prompt}"`);

    await agentController.processGoal(prompt, [], mockApi, rl);

    const activeDir = workspaceManager.getActiveProject();
    console.log(`\n[VERIFICATION] Active Project Directory: ${activeDir}`);

    const pkgPath = path.join(activeDir, 'package.json');
    const indexPath = path.join(activeDir, 'index.js');

    const pkgExists = fs.existsSync(pkgPath);
    const indexExists = fs.existsSync(indexPath);

    console.log(`[FILE CHECK] package.json exists: ${pkgExists}`);
    console.log(`[FILE CHECK] index.js exists: ${indexExists}`);

    // node --check syntax check
    const syntaxCheck = spawnSync('node', ['--check', indexPath], { encoding: 'utf8' });
    const syntaxValid = syntaxCheck.status === 0;
    console.log(`[SYNTAX CHECK] node --check index.js: ${syntaxValid ? 'PASS' : 'FAIL'}`);

    // Execute application
    const runExec = spawnSync('node', [indexPath], { encoding: 'utf8' });
    const outputText = runExec.stdout.trim();
    console.log(`[EXECUTION OUTPUT] "${outputText}"`);

    const textMatched = outputText.includes('my name i suriya');
    console.log(`[TEXT MATCH] Contains "my name i suriya": ${textMatched ? 'PASS' : 'FAIL'}`);

    console.log(`\n[FINAL STATUS] Desktop Pilot Verification: ${pkgExists && indexExists && syntaxValid && textMatched ? 'PASS' : 'FAIL'}`);

    rl.close();
    process.exit(0);
}

runSuriyaPromptTest().catch(err => {
    console.error('Test Error:', err);
    rl.close();
    process.exit(1);
});
