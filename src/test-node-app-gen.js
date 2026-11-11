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
    answer: 'Express application generated.',
    actions: [] // Force rich Express web application generator
});

async function runNodeAppGenTest() {
    console.log('=== DESKTOP PILOT VERIFICATION: DYNAMIC NODE.JS EXPRESS APP GENERATION ===\n');
    const prompt = 'Create a node js express web app to display my name i suriya with server endpoints';
    console.log(`[USER PROMPT] "${prompt}"`);

    delete process.env.TEST_MODE;
    await agentController.processGoal(prompt, [], mockApi, rl);

    const activeDir = workspaceManager.getActiveProject();
    console.log(`\n[VERIFICATION] Active Project Directory: ${activeDir}`);

    const pkgPath = path.join(activeDir, 'package.json');
    const serverPath = path.join(activeDir, 'server.js');
    const htmlPath = path.join(activeDir, 'public', 'index.html');
    const cssPath = path.join(activeDir, 'public', 'style.css');
    const jsPath = path.join(activeDir, 'public', 'script.js');
    const handoffPath = path.join(activeDir, 'RUN_AND_DEPLOY.txt');

    const pkgExists = fs.existsSync(pkgPath);
    const serverExists = fs.existsSync(serverPath);
    const htmlExists = fs.existsSync(htmlPath);
    const cssExists = fs.existsSync(cssPath);
    const jsExists = fs.existsSync(jsPath);
    const handoffExists = fs.existsSync(handoffPath);

    console.log(`[FILE CHECK] package.json exists: ${pkgExists}`);
    console.log(`[FILE CHECK] server.js exists: ${serverExists}`);
    console.log(`[FILE CHECK] public/index.html exists: ${htmlExists}`);
    console.log(`[FILE CHECK] public/style.css exists: ${cssExists}`);
    console.log(`[FILE CHECK] public/script.js exists: ${jsExists}`);
    console.log(`[FILE CHECK] RUN_AND_DEPLOY.txt exists: ${handoffExists}`);

    // node --check syntax check
    const syntaxCheck = spawnSync('node', ['--check', serverPath], { encoding: 'utf8' });
    const syntaxValid = syntaxCheck.status === 0;
    console.log(`[SYNTAX CHECK] node --check server.js: ${syntaxValid ? 'PASS' : 'FAIL'}`);

    // Verify index.html content
    const htmlText = fs.readFileSync(htmlPath, 'utf8');
    const textMatched = htmlText.includes('my name i suriya');
    console.log(`[TEXT MATCH] public/index.html contains "my name i suriya": ${textMatched ? 'PASS' : 'FAIL'}`);

    const passed = pkgExists && serverExists && htmlExists && cssExists && jsExists && handoffExists && syntaxValid && textMatched;
    console.log(`\n[FINAL STATUS] Dynamic Node.js Express App Generation: ${passed ? 'PASS' : 'FAIL'}`);

    rl.close();
    process.exit(0);
}

runNodeAppGenTest().catch(err => {
    console.error('Test Error:', err);
    rl.close();
    process.exit(1);
});
