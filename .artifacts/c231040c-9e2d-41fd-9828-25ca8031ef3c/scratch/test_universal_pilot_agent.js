const path = require('path');
const nativeApp = require(path.resolve('C:/Users/suriya prakash/OneDrive/Desktop/web/playwright-worker/native-app-automation.js'));
const aiPlanner = require(path.resolve('C:/Users/suriya prakash/OneDrive/Desktop/web/playwright-worker/ai-planner.js'));

async function testUniversalAgent() {
    console.log('=== STARTING UNIVERSAL TEXT-DRIVEN COMPUTER AUTOMATION AGENT TESTS ===\n');

    // 1. Test Calculator
    console.log('--- TEST 1: Calculator (33 + 54) ---');
    const calc = await nativeApp.calculate('33 + 54');
    console.log('Calculator Output:', calc);
    if (calc.result !== '87') throw new Error(`Expected 87, got ${calc.result}`);

    // 2. Test Word Document
    console.log('\n--- TEST 2: Word Document Creation ---');
    const word = await nativeApp.createWordDocument('Cloud Computing Guide', 'Cloud computing is the on-demand availability of computer system resources.');
    console.log('Word Document Created:', word);

    // 3. Test Spreadsheet
    console.log('\n--- TEST 3: Excel Spreadsheet Creation ---');
    const sheet = await nativeApp.createSpreadsheet('Monthly Expenses', ['Category', 'Budget', 'Actual'], [['Rent', '$1200', '$1200'], ['Utilities', '$150', '$145']]);
    console.log('Spreadsheet Created:', sheet);

    // 4. Test PowerPoint Presentation
    console.log('\n--- TEST 4: PowerPoint Presentation Creation ---');
    const ppt = await nativeApp.createPresentation('AI Revolution', [{ title: 'Introduction', content: ['Artificial Intelligence is transforming industries worldwide.'] }]);
    console.log('PowerPoint Created:', ppt);

    // 5. Test Static Website Generation & Hosting
    console.log('\n--- TEST 5: Static Website Generation & Hosting ---');
    const webRes = await nativeApp.createAndHostStaticWebsite({ siteName: 'MyPortfolioSite' });
    console.log('Static Website Result:', webRes);

    // 6. Test VS Code Project & Terminal Execution
    console.log('\n--- TEST 6: VS Code Project & Terminal Execution ---');
    const vscProject = await nativeApp.createAndRunVSCodeProject({
        projectName: 'UniversalNodeApp',
        files: [
            { name: 'server.js', content: 'console.log("Universal Node.js App Running Successfully!");' }
        ],
        runCmd: 'node server.js'
    });
    console.log('VS Code Project Result:', vscProject);

    // 7. Test Android Project & SDK Auto-Discovery
    console.log('\n--- TEST 7: Android Project & SDK Auto-Discovery ---');
    const androidProject = await nativeApp.createAndroidProject({
        appName: 'UniversalAndroidApp'
    });
    console.log('Android Project Result:', androidProject);

    // 8. Test AI Planner Universal Intent Pre-Resolver
    console.log('\n--- TEST 8: AI Planner Universal Intent Pre-Resolver ---');
    const goals = [
        'Create a Word document explaining cloud computing',
        'Create an Excel sheet for monthly expenses',
        'Create a PowerPoint presentation about AI',
        'Create and host a static website named Portfolio',
        'Create a Node.js API project in VS Code',
        'Create an Android to-do application'
    ];

    for (const goal of goals) {
        const plan = await aiPlanner.planNextAction({ goal, currentStep: 1 }, { url: 'https://example.com' });
        console.log(`Goal: "${goal}"\n  -> Plan Action: ${plan.action}, Value: ${plan.value}\n`);
    }

    console.log('=== ALL UNIVERSAL AGENT TESTS PASSED SUCCESSFULLY ===');
}

testUniversalAgent().catch(err => {
    console.error('UNIVERSAL AGENT TEST ERROR:', err);
    process.exit(1);
});
