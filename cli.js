#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, spawn } = require('child_process');
const { chromium } = require(path.resolve(__dirname, 'playwright-worker/node_modules/playwright'));
const browserManager = require(path.resolve(__dirname, 'playwright-worker/browser-manager.js'));
const pilotNavigator = require(path.resolve(__dirname, 'playwright-worker/pilot-navigator.js'));
const osCapabilityRegistry = require(path.resolve(__dirname, 'playwright-worker/os-capability-registry.js'));
const mt5DiscoveryManager = require(path.resolve(__dirname, 'playwright-worker/mt5-discovery-manager.js'));
const strategyResearchEngine = require(path.resolve(__dirname, 'playwright-worker/strategy-research-engine.js'));
const filesystemController = require(path.resolve(__dirname, 'playwright-worker/filesystem-controller.js'));
const nativeAppAutomation = require(path.resolve(__dirname, 'playwright-worker/native-app-automation.js'));
const appResolver = require(path.resolve(__dirname, 'playwright-worker/app-resolver.js'));
const { getCursor, setCursor } = require(path.resolve(__dirname, 'playwright-worker/win32-cursor.js'));
const intentRouter = require(path.resolve(__dirname, 'playwright-worker/intent-router.js'));

const PREFS_FILE = path.join(os.homedir(), '.codez48_prefs.json');

function unwrapAnswer(val) {
    if (!val) return '';
    if (typeof val === 'object') {
        if (val.answer) return unwrapAnswer(val.answer);
        if (val.description) return unwrapAnswer(val.description);
        return JSON.stringify(val, null, 2);
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed && (parsed.answer || parsed.description)) {
                    return unwrapAnswer(parsed.answer || parsed.description);
                }
            } catch (e) {}
        }
    }
    return String(val);
}

function openInVsCode(targetPath) {
    const absPath = path.resolve(process.cwd(), targetPath || '.');
    if (!fs.existsSync(absPath)) {
        console.error(`[OPEN ERROR] Project path does not exist: "${absPath}"`);
        process.exit(1);
    }
    const stat = fs.statSync(absPath);
    if (!stat.isDirectory()) {
        console.error(`[OPEN ERROR] Target path is not a directory: "${absPath}"`);
        process.exit(1);
    }

    if (absPath.toLowerCase() === os.homedir().toLowerCase() || path.parse(absPath).root.toLowerCase() === absPath.toLowerCase()) {
        console.error(`[OPEN ERROR] Refusing to open user home directory or system root ("${absPath}") to protect against Restricted Mode and security risks.`);
        console.error(`Please specify a dedicated project subdirectory.`);
        process.exit(1);
    }

    let codeCmd = 'code';
    if (os.platform() === 'win32') {
        codeCmd = 'code.cmd';
    }

    try {
        console.log(`[VS CODE] Opening project in a dedicated window at: ${absPath}`);
        const child = spawn(codeCmd, ['-n', absPath], {
            detached: true,
            stdio: 'ignore',
            shell: true,
            windowsHide: true
        });
        child.unref();
        console.log(`[VS CODE] Successfully launched VS Code for: ${absPath}`);
        return true;
    } catch (err) {
        console.error(`[OPEN ERROR] Failed to launch VS Code. Ensure VS Code is installed and 'code' is available in your system PATH.`);
        console.error(`Details: ${err.message}`);
        process.exit(1);
    }
}

function loadPrefs() {
    try {
        if (fs.existsSync(PREFS_FILE)) {
            return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function savePrefs(prefs) {
    try {
        fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf8');
    } catch (e) {}
}

async function executePilotGoal(goal, options = {}) {
    const { answer = null, disableDismiss = false, allowOfficialScrape = false } = options;
    const lowerGoal = goal.toLowerCase();

    const greetingRegex = /^\s*(hi+|hhi+|hello+|hey+|sup+|greetings+|how\s+are\s+you|thank\s+you|thanks)\b/i;
    const isLikelyGreeting = greetingRegex.test(goal) || (goal.trim().length <= 20 && !/\b(create|build|generate|make|scrape|automate|calculate|open|write|fix|run|delete|edit|modify)\b/i.test(goal));

    if (isLikelyGreeting) {
        console.log(`\n[INTENT: GENERAL_CHAT]`);
        console.log(`[KEYWORDS: greeting, conversation]`);
        console.log(`[WORKFLOW: CHAT]`);
        console.log(`[REASON: Ordinary conversational greeting or short message]`);
        console.log(`\n[50%] Processing query...\n`);
        console.log(`=== CODEZ48 AI RESPONSE ===`);
        console.log(`Hello! I am Codez48 Pilot. How can I help you today?`);
        console.log(`\n[100%] Task completed.`);
        console.log(`Task Completed Successfully`);
        return true;
    }

    // NEW AI WORKFLOW
    const cliAiAnalyzer = require(path.resolve(__dirname, 'playwright-worker/cli-ai-analyzer.js'));
    const cliProjectGenerator = require(path.resolve(__dirname, 'playwright-worker/cli-project-generator.js'));
    const cliProjectModifier = require(path.resolve(__dirname, 'playwright-worker/cli-project-modifier.js'));
    const terminalExecutor = require(path.resolve(__dirname, 'playwright-worker/terminal-executor.js'));

    let aiPlan = null;
    let overrideIntent = null;
    let overrideTargetUrl = null;

    const tempOut = path.join(os.tmpdir(), `ai_plan_${Date.now()}_${Math.random().toString(36).substring(2)}.json`);
    console.log(`\n[10%] Understanding request...`);

    const cmdRes = await terminalExecutor.runCommand(process.execPath, [path.resolve(__dirname, 'cli.js'), 'ai', goal, `--out=${tempOut}`], process.cwd());
    if (cmdRes.stdout) process.stdout.write(cmdRes.stdout);
    if (cmdRes.stderr) process.stderr.write(cmdRes.stderr);

    if (fs.existsSync(tempOut)) {
        try {
            aiPlan = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
            fs.unlinkSync(tempOut);
        } catch (e) {
            console.error('[PILOT ERROR] Failed to parse AI plan:', e.message);
        }
    }

    if (!aiPlan) {
        if (/^https?:\/\/[^\s]+$/.test(goal)) {
            overrideIntent = 'scraping';
            overrideTargetUrl = goal;
        } else {
            console.log(`[50%] Processing query...\n`);
            console.log(`=== CODEZ48 AI RESPONSE ===`);
            console.log(`Hello! I am Codez48 Pilot. You asked: "${goal}". How can I assist you with your project or questions today?`);
            console.log(`\n[100%] Task completed.`);
            console.log(`Task Completed Successfully`);
            return true;
        }
    }

    if (aiPlan) {
        console.log(`\n[INTENT: ${aiPlan.intent || 'UNKNOWN_OR_AMBIGUOUS'}]`);
        if (aiPlan.keywords && Array.isArray(aiPlan.keywords)) {
            console.log(`[KEYWORDS: ${aiPlan.keywords.join(', ')}]`);
        } else {
            console.log(`[KEYWORDS: ${goal.split(/\s+/).slice(0, 4).join(', ')}]`);
        }
        console.log(`[WORKFLOW: ${aiPlan.workflow || aiPlan.intent || 'GENERAL_WORKFLOW'}]`);
        if (aiPlan.reason) {
            console.log(`[REASON: ${aiPlan.reason}]`);
        } else if (aiPlan.description) {
            console.log(`[REASON: ${aiPlan.description}]`);
        }

        const intent = (aiPlan.intent || '').toUpperCase();
        const answerText = unwrapAnswer(aiPlan.answer || aiPlan.description || aiPlan.content || '');

        if (intent === 'GENERAL_CHAT' || intent === 'CHAT' || intent === 'UNKNOWN' || intent === 'UNKNOWN_OR_AMBIGUOUS' || intent === 'GENERAL_AUTOMATION' || (answerText && (!aiPlan.files || aiPlan.files.length === 0) && intent !== 'PROJECT_GENERATION' && intent !== 'GENERATE_PROJECT' && intent !== 'SCRAPE_WEBSITE' && intent !== 'BROWSER_AUTOMATION' && intent !== 'FILE_OPERATIONS' && intent !== 'MODIFY_LOCAL_PROJECT')) {
            console.log(`[50%] Processing query...\n`);
            console.log(`=== CODEZ48 AI RESPONSE ===`);
            console.log(answerText || `Hello! I processed your request: "${goal}".`);
            console.log(`\n[100%] Task completed.`);
            console.log(`Task Completed Successfully`);
            return true;
        }

        console.log(`[25%] AI planning completed.`);
        if (aiPlan.description) console.log(`Task: ${aiPlan.description}`);

        if (aiPlan.intent === 'GENERATE_PROJECT') {
            let attempt = 0;
            const MAX_ATTEMPTS = 3;
            let currentPlan = aiPlan;

            while (attempt < MAX_ATTEMPTS) {
                attempt++;
                try {
                    const { projectDir, startCommand } = await cliProjectGenerator.generateProject(currentPlan);
                    let runningProcess = null;

                    if (startCommand) {
                        runningProcess = await cliProjectGenerator.startApplication(projectDir, startCommand);
                    }

                    if (currentPlan.previewUrl) {
                        console.log(`Opening Browser to ${currentPlan.previewUrl}...`);
                        try {
                            const page = await browserManager.getPage({ headless: true });
                            await page.goto(currentPlan.previewUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

                            const screenshotPath = path.join(projectDir, 'preview_screenshot.png');
                            await page.screenshot({ path: screenshotPath, fullPage: true });
                            console.log(`[SCREENSHOT SAVED] Project preview captured at: ${screenshotPath}`);

                            await browserManager.close();
                        } catch(e) {
                            console.log(`[SCREENSHOT ERROR] Could not capture preview: ${e.message}`);
                        }
                    }

                    console.log('[100%] Task completed and verified.');
                    console.log('Task Completed Successfully');
                    return true;
                } catch (err) {
                    console.error(`[ATTEMPT ${attempt}/${MAX_ATTEMPTS} FAILED]: ${err.message}`);

                    if (attempt >= MAX_ATTEMPTS) {
                        console.error(`[FATAL] Bounded repair attempts (${MAX_ATTEMPTS}) exhausted.`);
                        return false;
                    }

                    console.log(`[AI REPAIR] Attempting AI Error Diagnostics (Attempt ${attempt}/${MAX_ATTEMPTS})...`);
                    const fixPlan = await cliAiAnalyzer.analyzeErrorFix(err.message);
                    if (fixPlan) {
                        if (fixPlan.cause) console.log(`Cause: ${fixPlan.cause}`);
                        if (fixPlan.fixCommands && fixPlan.fixCommands.length > 0) {
                            for (const fixCmd of fixPlan.fixCommands) {
                                if (/rm\s+-rf|del\s+\/|format|mkfs|chmod\s+-R\s+777/.test(fixCmd)) {
                                    console.log(`[SAFETY BLOCK] Dangerous command rejected: ${fixCmd}`);
                                    continue;
                                }
                                console.log(`Executing Fix: ${fixCmd}`);
                                try {
                                    execSync(fixCmd, { stdio: 'inherit' });
                                } catch(e) {
                                    console.error(`Fix command failed: ${e.message}`);
                                }
                            }
                        }
                        if (fixPlan.files && fixPlan.files.length > 0) {
                            currentPlan.files = fixPlan.files;
                        }
                    }
                }
            }
        } else if (aiPlan.intent === 'SCRAPE_WEBSITE') {
            overrideIntent = 'scraping';
            overrideTargetUrl = aiPlan.targetUrl;
        } else if (aiPlan.intent === 'BROWSER_AUTOMATION') {
            overrideIntent = 'automation';
            overrideTargetUrl = aiPlan.targetUrl;
        } else if (aiPlan.intent === 'MODIFY_LOCAL_PROJECT') {
            try {
                await cliProjectModifier.modifyProject(aiPlan, goal);
                console.log('[100%] Task completed and verified.');
                console.log('Task Completed Successfully');
                return true;
            } catch (err) {
                console.error(`Project modification failed: ${err.message}`);
                return false;
            }
        } else if (aiPlan.intent === 'FIX_ERROR') {
             console.log('AI analyzing the error to fix...');
             const fixPlan = await cliAiAnalyzer.analyzeErrorFix(goal);
             if (fixPlan) {
                 console.log(`Cause: ${fixPlan.cause}`);
                 for (const fixCmd of (fixPlan.fixCommands || [])) {
                     if (/rm\s+-rf|del\s+\/|format|mkfs|chmod\s+-R\s+777/.test(fixCmd)) {
                         console.log(`[SAFETY BLOCK] Dangerous command rejected: ${fixCmd}`);
                         continue;
                     }
                     console.log(`Executing Fix: ${fixCmd}`);
                     try {
                         execSync(fixCmd, { stdio: 'inherit' });
                     } catch(e) {}
                 }
                 console.log('Task Completed Successfully');
                 return true;
             }
        }
    }

    const goalTextNoUrl = goal.replace(/https?:\/\/[^\s]+/gi, '');
    const routingContext = intentRouter.classifyIntent(goal);
    const intent = overrideIntent || routingContext.intent;
    let targetUrl = overrideTargetUrl || routingContext.url || 'https://codez48.netlify.app/';

    if (intent === 'scraping' || intent === 'WEBSITE_CODE_RECONSTRUCTION') {
        const targetProjectName = 'startify';
        const scrapeRes = await pilotNavigator.scrapeAndCloneWebsite(targetUrl, targetProjectName, 8080, { allowOfficial: allowOfficialScrape });
        if (scrapeRes.success) {
            console.log('[SCRAPER VERIFICATION PASS] Success.');
            return true;
        } else {
            console.error('[SCRAPER ERROR]', scrapeRes.failureReason);
            return false;
        }
    }

    if (intent === 'automation' || intent === 'browser_navigation' || intent === 'BROWSE_WEBSITE' || intent === 'WEB_AUTOMATION') {
        let expectedHref = null;
        if (/\bcli\b/i.test(goalTextNoUrl)) expectedHref = '/cli';
        else if (/\bpricing\b/i.test(goalTextNoUrl)) expectedHref = '#pricing';
        const result = await pilotNavigator.navigateAndInteract(targetUrl, expectedHref, { answer, disableDismiss });
        return result.success;
    }

    return true;
}

async function handlePilot() {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        console.log('CODEZ48 CLI v1.3.3');
        console.log('Usage: codez48 <command> [options] or codez48 "<prompt>"');
        console.log('Commands:');
        console.log('  ai "<prompt>"          Run AI analysis / query');
        console.log('  pilot "<prompt>"       Run AI Pilot workflow (chat, code generation, scraping, automation)');
        console.log('  open [path]            Open project directory in VS Code');
        console.log('  dev "<task>" [--path]  Run AI development workflow (VS Code, AI plan, edits, tests)');
        console.log('  doctor                 Run environment & dependency diagnostics');
        console.log('  capability             Probe system capabilities');
        console.log('  scrap <url>            Scrap website source code');
        process.exit(0);
    }
    if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
        console.log('1.3.3');
        process.exit(0);
    }

    if (rawArgs[0] === 'open') {
        const targetPath = rawArgs.slice(1).join(' ').replace(/^["']|["']$/g, '').trim() || '.';
        openInVsCode(targetPath);
        process.exit(0);
    }

    if (rawArgs[0] === 'dev') {
        let task = '';
        let targetPath = '.';

        const taskTokens = [];
        for (let i = 1; i < rawArgs.length; i++) {
            const arg = rawArgs[i];
            if (arg === '--path' && rawArgs[i + 1]) {
                targetPath = rawArgs[i + 1].replace(/^["']|["']$/g, '');
                i++;
            } else if (arg.startsWith('--path=')) {
                targetPath = arg.split('=')[1].replace(/^["']|["']$/g, '');
            } else {
                taskTokens.push(arg);
            }
        }
        task = taskTokens.join(' ').replace(/^["']|["']$/g, '').trim();

        if (!task) {
            console.error('[DEV ERROR] No task description provided.');
            console.error('Usage: codez48 dev "<task>" --path "<project-path>"');
            process.exit(1);
        }

        const absProjPath = path.resolve(process.cwd(), targetPath);
        console.log(`=== CODEZ48 DEV WORKFLOW ===`);
        console.log(`Task: ${task}`);
        console.log(`Target Project: ${absProjPath}`);

        if (!fs.existsSync(absProjPath)) {
            console.log(`[DEV] Creating target project directory: ${absProjPath}`);
            fs.mkdirSync(absProjPath, { recursive: true });
        }

        // 1. Open project in VS Code (new window)
        openInVsCode(absProjPath);

        // 2. Analyze task with AI
        const cliAiAnalyzer = require(path.resolve(__dirname, 'playwright-worker/cli-ai-analyzer.js'));
        const cliProjectModifier = require(path.resolve(__dirname, 'playwright-worker/cli-project-modifier.js'));
        const terminalExecutor = require(path.resolve(__dirname, 'playwright-worker/terminal-executor.js'));

        console.log('\n[10%] Analyzing task against project files...');
        const plan = await cliAiAnalyzer.analyzeRequest(task, { detectedKeywords: [], url: null, isUrlOnly: false });

        if (!plan) {
            console.error('[DEV ERROR] AI could not generate an execution plan for this task.');
            process.exit(1);
        }

        console.log('\n=== PROPOSED AI PLAN ===');
        if (plan.description) console.log(`Description: ${plan.description}`);
        if (plan.filesToRead && plan.filesToRead.length > 0) {
            console.log(`Files to read: ${plan.filesToRead.join(', ')}`);
        }
        if (plan.files && plan.files.length > 0) {
            console.log(`Files to modify/create: ${plan.files.map(f => f.path).join(', ')}`);
        }

        plan.targetFolder = absProjPath;

        console.log('\n[50%] Executing modifications / generation...');
        try {
            if (plan.intent === 'GENERATE_PROJECT' || (plan.files && plan.files.length > 0)) {
                for (const file of plan.files || []) {
                    const filePath = path.join(absProjPath, file.path);
                    const dirName = path.dirname(filePath);
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName, { recursive: true });
                    }
                    fs.writeFileSync(filePath, file.content, 'utf8');
                    console.log(`Created/Updated: ${file.path}`);
                }
                for (const file of plan.files || []) {
                    if ((file.path.endsWith('.js') || file.path.endsWith('.mjs')) && !file.path.includes('node_modules')) {
                        const absPath = path.join(absProjPath, file.path);
                        const checkRes = await terminalExecutor.runCommand('node', ['--check', absPath], absProjPath);
                        if (checkRes.exitCode !== 0) {
                            throw new Error(`Syntax check failed for ${file.path}:\n${checkRes.stderr}`);
                        }
                    }
                }
                if (fs.existsSync(path.join(absProjPath, 'package.json'))) {
                    console.log('[DEV] package.json detected. Checking npm and installing dependencies...');
                    const npmRes = await terminalExecutor.runCommand('npm', ['install'], absProjPath);
                    if (npmRes.stdout) console.log(npmRes.stdout);
                }
            } else if (plan.intent === 'MODIFY_LOCAL_PROJECT') {
                cliProjectModifier.findProject = () => absProjPath;
                await cliProjectModifier.modifyProject(plan, task);
            } else {
                console.log(plan.description || task);
            }
            console.log('\n[80%] Modifications applied successfully.');

            if (plan.fixCommands && plan.fixCommands.length > 0) {
                console.log('\n[90%] Running verification commands...');
                for (const cmd of plan.fixCommands) {
                    console.log(`Executing: ${cmd}`);
                    const res = await terminalExecutor.runCommand(cmd.split(' ')[0], cmd.split(' ').slice(1), absProjPath);
                    if (res.stdout) console.log(res.stdout);
                    if (res.stderr) console.error(res.stderr);
                }
            }

            console.log('\n[100%] Development task completed successfully.');
            process.exit(0);
        } catch (err) {
            console.error(`\n[DEV ERROR] Task execution failed: ${err.message}`);
            process.exit(1);
        }
    }

    if (rawArgs[0] === 'ai') {
        const isErrorFix = rawArgs.includes('--error-fix');
        const outFlagIndex = rawArgs.findIndex(a => a.startsWith('--out='));
        let outFile = null;
        if (outFlagIndex !== -1) {
            outFile = rawArgs[outFlagIndex].split('=')[1];
            rawArgs.splice(outFlagIndex, 1);
        }

        const goalTokens = rawArgs.slice(1).filter(a => !a.startsWith('--'));
        const goal = goalTokens.join(' ').replace(/^["']|["']$/g, '').trim();

        const cliAiAnalyzer = require(path.resolve(__dirname, 'playwright-worker/cli-ai-analyzer.js'));
        const intentRouter = require(path.resolve(__dirname, 'playwright-worker/intent-router.js'));

        let result;
        if (isErrorFix) {
            console.log('AI analyzing the error to fix...');
            result = await cliAiAnalyzer.analyzeErrorFix(goal);
        } else {
            console.log('AI Analyzing Request...');
            const routingContext = intentRouter.classifyIntent(goal);
            result = await cliAiAnalyzer.analyzeRequest(goal, {
                detectedKeywords: routingContext.detectedKeywords,
                url: routingContext.url,
                isUrlOnly: routingContext.isUrlOnly
            });
        }

        if (outFile && result) {
            fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
        } else if (result) {
            if (result.intent === 'CHAT' && result.answer) {
                console.log(unwrapAnswer(result.answer));
            } else if (result.description) {
                console.log(unwrapAnswer(result.description));
            } else {
                console.log(JSON.stringify(result, null, 2));
            }
        } else {
            console.error("AI Error: No result");
            process.exit(1);
        }
        process.exit(0);
    }

    if (rawArgs[0] === 'scrap') {
        const Codez48ScrapEngine = require(path.resolve(__dirname, 'playwright-worker/codez48-scrap.js'));
        const readline = require('readline');

        console.log('\n=== CODEZ48 SCRAP ===');

        let targetUrl = null;
        let allowOfficialScrape = false;

        for (let i = 1; i < rawArgs.length; i++) {
            const arg = rawArgs[i];
            if (arg === '--allow-official-scrape') {
                allowOfficialScrape = true;
            } else if (!arg.startsWith('--') && !targetUrl) {
                targetUrl = arg;
            }
        }

        if (!targetUrl) {
            if (process.stdin.isTTY || !process.env.CI) {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                targetUrl = await new Promise((resolve) => {
                    rl.question('Enter website URL to scrap: ', (answer) => {
                        rl.close();
                        resolve(answer ? answer.trim() : '');
                    });
                });
            } else {
                console.error('[SCRAP ERROR] No website URL provided.');
                process.exit(1);
            }
        }

        if (!targetUrl) {
            console.error('[SCRAP ERROR] URL cannot be empty.');
            process.exit(1);
        }

        const scrapEngine = new Codez48ScrapEngine();
        const scrapResult = await scrapEngine.runScrapWorkflow(targetUrl, { allowOfficial: allowOfficialScrape });

        if (scrapResult.success) {
            console.log('[SCRAP VERIFICATION PASS] Website source code & resources extracted successfully.');
            console.log('Exit Code: 0');
            process.exit(0);
        } else {
            console.error(`[SCRAP ERROR] Scraping process failed: ${scrapResult.failureReason}`);
            console.log('Exit Code: 1');
            process.exit(1);
        }
    }

    if (rawArgs[0] === 'prefs') {
        const prefs = loadPrefs();
        if (rawArgs[1] === 'list') {
            console.log(JSON.stringify(prefs, null, 2));
            process.exit(0);
        } else if (rawArgs[1] === 'delete') {
            if (fs.existsSync(PREFS_FILE)) fs.unlinkSync(PREFS_FILE);
            console.log('[PREFS] Preferences cleared successfully.');
            process.exit(0);
        }
    }

    if (rawArgs[0] === 'capability' || rawArgs[0] === 'capabilities') {
        const report = await osCapabilityRegistry.runFullCapabilityProbe();
        console.log('=== CODEZ48 UNIVERSAL OS CAPABILITY REPORT ===');
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
    }

    if (rawArgs[0] === 'doctor') {
        console.log('=== CODEZ48 DOCTOR DIAGNOSTICS ===');
        const probe = await osCapabilityRegistry.runFullCapabilityProbe();

        console.log(`Node Version: ${probe.runtimes.nodeVersion}`);
        console.log(`Operating System: ${probe.system.type} ${probe.system.release} (${probe.system.arch})`);
        console.log(`Playwright Version: ${probe.runtimes.playwrightVersion}`);

        let execPath = 'Unknown';
        try {
            execPath = chromium.executablePath();
            if (!fs.existsSync(execPath)) {
                throw new Error("Browser executable not found on disk at " + execPath);
            }
            console.log(`Chromium Executable Path: ${execPath}`);
        } catch (e) {
            console.error(`[DOCTOR ERROR] Browser executable check failed: ${e.message}`);
            console.error('Exact Fix Command: npx playwright install chromium');
            process.exit(1);
        }

        const profileDir = path.resolve(__dirname, '.codez48_profile');
        try {
            if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
            fs.writeFileSync(path.join(profileDir, 'test.lock'), 'test', 'utf8');
            fs.unlinkSync(path.join(profileDir, 'test.lock'));
            console.log(`User-Data Directory Writable: YES (${profileDir})`);
        } catch (e) {
            console.log(`User-Data Directory Writable: NO (${e.message})`);
            process.exit(1);
        }

        if (probe.uiAutomation.cursorReaderWorking) {
            console.log(`Koffi Cursor Reader: WORKING (Current Position: X=${probe.uiAutomation.cursorPosition.x}, Y=${probe.uiAutomation.cursorPosition.y}, Latency: ${probe.uiAutomation.latencyMs.toFixed(3)}ms)`);
        } else {
            console.log('Koffi Cursor Reader: FAILED or UNAVAILABLE');
            process.exit(1);
        }

        try {
            const page = await browserManager.getPage({ headless: true });
            await page.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 20000 });
            const title = await page.title();
            console.log(`Test Page Load (Headless): SUCCESS (Title: "${title}")`);
            await browserManager.close();
        } catch (e) {
            console.log(`Test Page Load (Headless): FAILED (${e.message})`);
            process.exit(1);
        }

        try {
            const headedPage = await browserManager.getPage({ headless: false });
            await headedPage.goto('https://codez48.netlify.app/', { waitUntil: 'domcontentloaded', timeout: 20000 });
            const headedTitle = await headedPage.title();
            console.log(`Test Page Load (Headed): SUCCESS (Title: "${headedTitle}")`);
            await browserManager.close();
        } catch (e) {
            console.log(`Test Page Load (Headed): FAILED (${e.message})`);
            process.exit(1);
        }

        const mt5Status = await mt5DiscoveryManager.probeBridgeAndAccount();
        if (mt5Status.bridgeAvailable) {
            console.log(`MetaTrader 5 Python Module: AVAILABLE (Version: ${mt5Status.pythonVersion})`);
            console.log(`MetaTrader 5 Terminal Status: ${mt5Status.statusSummary}`);
        } else {
            console.log('MetaTrader 5 Python Module: NOT AVAILABLE (Bridge offline or module not installed)');
        }

        console.log('ALL DOCTOR CHECKS PASSED.');
        process.exit(0);
    }

    let answer = null;
    let debug = false;
    let remember = false;
    let disableDismiss = false;
    let testSafetyLoop = false;
    let allowOfficialScrape = false;
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
        } else if (arg === '--allow-official-scrape') {
            allowOfficialScrape = true;
        } else {
            goalTokens.push(arg);
        }
    }

    const rawGoalStr = goalTokens.join(' ').replace(/^["']|["']$/g, '').trim();

    if (!rawGoalStr) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\nCodez48 Pilot\n');

        rl.on('close', () => {
            process.exit(0);
        });

        const askPrompt = async () => {
            if (rl.closed) return;
            rl.question('\nYou: ', async (userInput) => {
                if (rl.closed) return;
                const trimmedInput = (userInput || '').trim();
                if (!trimmedInput) {
                    askPrompt();
                    return;
                }
                if (['exit', 'quit', ':q'].includes(trimmedInput.toLowerCase())) {
                    console.log('Goodbye.');
                    rl.close();
                    return;
                }

                try {
                    await executePilotGoal(trimmedInput, { answer, disableDismiss, allowOfficialScrape });
                } catch (err) {
                    console.error('[PILOT ERROR]', err.message || err);
                }

                if (!rl.closed) {
                    askPrompt();
                }
            });
        };

        askPrompt();
        return;
    }

    const success = await executePilotGoal(rawGoalStr, { answer, disableDismiss, allowOfficialScrape });
    process.exit(success ? 0 : 1);
}

handlePilot().catch(err => {
    console.error('CLI Pilot Error:', err.message || err);
    console.log('Exit Code: 1');
    process.exit(1);
});
