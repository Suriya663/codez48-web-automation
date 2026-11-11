const fs = require('fs');
const path = require('path');
const agentController = require('./core/agent-controller');
const workspaceManager = require('./core/workspace-manager');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mockApiCall = async (endpoint, method, body) => {
    return {
        success: true,
        answer: "Project generation request processed.",
        actions: []
    };
};

async function runTests() {
    console.log('=== PART 1 ACCEPTANCE TESTS ===\n');

    // TEST A: Simple Static Website
    console.log('[TEST A] Goal: "create a simple static website"');
    const resA = await agentController.processGoal("create a simple static website", [], mockApiCall, rl);
    const activeDirA = workspaceManager.getActiveProject();
    console.log(`[TEST A] Active Project Dir: ${activeDirA}`);
    const hasIndexA = fs.existsSync(path.join(activeDirA, 'index.html'));
    const hasCssA = fs.existsSync(path.join(activeDirA, 'style.css'));
    const hasJsA = fs.existsSync(path.join(activeDirA, 'script.js'));
    console.log(`[TEST A RESULTS] index.html: ${hasIndexA}, style.css: ${hasCssA}, script.js: ${hasJsA}`);

    // TEST B: Responsive Portfolio Website
    console.log('\n[TEST B] Goal: "create a responsive portfolio website with navigation, hero, about, projects, and contact sections"');
    const resB = await agentController.processGoal("create a responsive portfolio website with navigation, hero, about, projects, and contact sections", [], mockApiCall, rl);
    const activeDirB = workspaceManager.getActiveProject();
    console.log(`[TEST B] Active Project Dir: ${activeDirB}`);
    const hasIndexB = fs.existsSync(path.join(activeDirB, 'index.html'));
    const contentB = hasIndexB ? fs.readFileSync(path.join(activeDirB, 'index.html'), 'utf8') : '';
    const hasSectionsB = contentB.includes('hero') && contentB.includes('about') && contentB.includes('projects') && contentB.includes('contact');
    console.log(`[TEST B RESULTS] index.html: ${hasIndexB}, sections present: ${hasSectionsB}`);

    // TEST C: Node JS Hello World Project
    console.log('\n[TEST C] Goal: "create a node js hello world project"');
    const resC = await agentController.processGoal("create a node js hello world project", [], mockApiCall, rl);
    const activeDirC = workspaceManager.getActiveProject();
    console.log(`[TEST C] Active Project Dir: ${activeDirC}`);
    const hasPkgC = fs.existsSync(path.join(activeDirC, 'package.json'));
    const hasIndexC = fs.existsSync(path.join(activeDirC, 'index.js'));
    console.log(`[TEST C RESULTS] package.json: ${hasPkgC}, index.js: ${hasIndexC}`);

    rl.close();
    process.exit(0);
}

runTests().catch(err => {
    console.error('Test Error:', err);
    rl.close();
    process.exit(1);
});
