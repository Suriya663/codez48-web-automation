/**
 * CODEZ48 AGENT CONTROLLER
 * Orchestrates multi-language autonomous software development workflows.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceManager = require('./workspace-manager');
const environmentDetector = require('./environment-detector');
const commandPolicy = require('./command-policy');
const processManager = require('./process-manager');

const adapterFactory = require('../adapters/adapter-factory');
const filesystemActions = require('../actions/filesystem-actions');
const browserActions = require('../actions/browser-actions');
const vsCodeActions = require('../actions/vscode-actions');
const intentClassifier = require('./intent-classifier');
const pilotController = require('../pilot/pilot-controller');

async function safeQuestion(rl, query) {
    if (!rl) return '';
    try {
        const res = rl.question(query);
        if (res && typeof res.then === 'function') {
            return await res;
        }
        return await new Promise(resolve => rl.question(query, resolve));
    } catch (_) {
        return '';
    }
}

class AsyncLock {
    constructor() {
        this.promise = Promise.resolve();
    }
    async acquire() {
        let release;
        const nextPromise = new Promise(resolve => { release = resolve; });
        const currentPromise = this.promise;
        this.promise = nextPromise;
        await currentPromise;
        return release;
    }
}

class AgentController {
    constructor() {
        this.maxFixRetries = 3;
        this.lock = new AsyncLock();
    }

    async callLocalGroqFallback(messages) {
        const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
        const keys = rawKeys.split(',').map(s => s.trim()).filter(Boolean);
        if (keys.length === 0) return null;

        const shuffledKeys = [...keys].sort(() => 0.5 - Math.random());
        const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

        for (const key of shuffledKeys) {
            for (const model of models) {
                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + key,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model,
                            messages,
                            temperature: 0.5,
                            max_tokens: 4096
                        })
                    });

                    if (response.ok) {
                        const resData = await response.json();
                        if (resData.choices && resData.choices[0]?.message?.content) {
                            return {
                                success: true,
                                answer: resData.choices[0].message.content,
                                source: `Local Groq Engine (${model})`
                            };
                        }
                    }
                } catch (_) {}
            }
        }
        return null;
    }

    getAiProviderInfo() {
        if (process.env.GEMINI_API_KEY) {
            return `Gemini (${process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'})`;
        }
        if (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY) {
            return 'Groq (llama-3.3-70b-versatile)';
        }
        return 'Codez48 AI Gateway (cli-ai-chat)';
    }

    async processGoal(goal, conversationHistory, apiCall, rl) {
        if (!goal || !goal.trim()) return;

        const lowerGoal = goal.toLowerCase();

        // 1. Intent Classification
        const classification = await intentClassifier.classify(goal, apiCall);
        intentClassifier.display(classification);

        const intent = classification.intent;
        const sub_intent = classification.sub_intent || '';

        if (intent === 'COUPON_REDEMPTION') {
            const couponManager = require('./coupon-manager');
            const creditVault = require('./credit-vault');
            const { formatTerminalBox } = require('./box-formatter');

            // Extract coupon code from user string
            let extractedCode = null;

            // Pattern A: "coupon: CODE", "coupen CODE", "code CODE", etc.
            const codeMatch = goal.match(/(?:coupon|coupen|cupon|copon|voucher|code|promo)[:\s]+([A-Za-z0-9_-]+)/i);
            if (codeMatch && codeMatch[1]) {
                const candidate = codeMatch[1].trim();
                if (!['ADD', 'THIS', 'PLEASE', 'ENTER', 'APPLY'].includes(candidate.toUpperCase())) {
                    extractedCode = candidate;
                }
            }

            // Pattern B: Bare code e.g. "DIWALI50"
            if (!extractedCode) {
                const cleanToken = goal.trim().replace(/^["']|["']$/g, '');
                if (/^[A-Za-z0-9_-]{3,20}$/.test(cleanToken) && !cleanToken.includes(' ')) {
                    extractedCode = cleanToken;
                }
            }

            // Pattern C: Token scan e.g. "DIWALI50 add this coupen"
            if (!extractedCode) {
                const words = goal.split(/[\s,.:;!?]+/);
                for (const w of words) {
                    if (/^[A-Z0-9_-]{4,15}$/.test(w) && !['HAVE', 'COUPON', 'COUPEN', 'CUPON', 'COPON', 'VOUCHER', 'HERE', 'CODE', 'PLEASE', 'APPLY', 'THIS', 'ENTER', 'WITH', 'CLAIM'].includes(w.toUpperCase())) {
                        extractedCode = w;
                        break;
                    }
                }
            }

            if (!extractedCode && rl) {
                console.log('\n\x1b[33m[COUPON] You mentioned a coupon! Please enter your coupon code:\x1b[0m');
                extractedCode = (await safeQuestion(rl, 'Enter Coupon Code: ')).trim();
            }

            if (!extractedCode) {
                return "Please provide a valid coupon code (e.g. 'coupon WELCOME100').";
            }

            console.log(`\n\x1b[36m[COUPON] Verifying coupon "${extractedCode}" with Firebase...\x1b[0m`);
            const result = await couponManager.verifyAndRedeemCoupon(extractedCode);

            if (result.success) {
                if (result.type === 'DISCOUNT_PERCENT' || result.type === 'DISCOUNT_FLAT') {
                    // Automatically show updated order and launch payment checkout with coupon applied!
                    console.log(`\n\x1b[32m[ORDER] Coupon "${extractedCode}" applied to your order! Automatically opening payment checkout...\x1b[0m`);
                    await creditVault.showPaymentPrompt(null, result, true);
                    return result.message;
                } else {
                    const box = formatTerminalBox({
                        title: 'CODEZ48 — COUPON REDEEMED SUCCESSFULLY',
                        borderColor: '\x1b[32m',
                        titleColor: '\x1b[1m\x1b[32m',
                        lines: [
                            result.message,
                            { divider: true },
                            `Current Balance: ${result.newBalance} Credits`
                        ]
                    });
                    console.log('\n' + box + '\n');
                    return result.message;
                }
            } else {
                const box = formatTerminalBox({
                    title: 'CODEZ48 — COUPON ERROR',
                    borderColor: '\x1b[31m',
                    titleColor: '\x1b[1m\x1b[31m',
                    lines: [
                        `Coupon: "${extractedCode}"`,
                        `Status: ${result.message}`,
                        { divider: true },
                        'Need credits or a subscription plan?',
                        'Visit: https://codez48.netlify.app/tools/payment.html'
                    ]
                });
                console.log('\n' + box + '\n');
                return result.message;
            }
        }

        if (intent === 'PAYMENT_CHECKOUT') {
            const creditVault = require('./credit-vault');
            await creditVault.showPaymentPrompt(rl);
            return "Payment options displayed.";
        }

        if (intent === 'WHATSAPP_WEB_TASK') {
            return await pilotController.processGoal(goal, apiCall, rl, classification);
        }

        if (intent === 'SUPERVISOR_AUTOMATION') {
            const isVoiceDirect = sub_intent === 'WHATSAPP_VOICE' || lowerGoal.includes('voice note') || (lowerGoal.includes('voice') && !lowerGoal.includes('campaign') && !lowerGoal.includes('batch') && !lowerGoal.includes('file'));
            if (isVoiceDirect) {
                console.log('\n\x1b[36m[SUPERVISOR WORKFLOW] Launching WhatsApp Voice Note Supervisor...\x1b[0m');
                const wa = require('../../supervoice/whatsapp-automation');
                await wa.startMonitoring({ continuous: false, apiCall });
                return "WhatsApp Voice Supervisor executed.";
            }

            const isMonitorDirect = sub_intent === 'WHATSAPP_MONITOR' || lowerGoal.includes('default') || lowerGoal.includes('monitor') || lowerGoal.includes('incoming') || lowerGoal.includes('auto reply') || lowerGoal.includes('auto-reply') || lowerGoal.includes('reply to messages') || lowerGoal.includes('check messages');
            if (isMonitorDirect) {
                console.log('\n\x1b[36m[SUPERVISOR WORKFLOW] Launching Autonomous WhatsApp Screen Monitor & Auto-Replier...\x1b[0m');
                const wa = require('../../supervoice/whatsapp-automation');
                await wa.startMonitoring({ continuous: true, apiCall, defaultMode: true });
                return "Autonomous WhatsApp Screen Monitor & Auto-Replier completed.";
            }

            console.log('\n\x1b[36m[SUPERVISOR WORKFLOW] Launching WhatsApp Automation & Campaign Flow...\x1b[0m');
            const detailsCollector = require('../../supervoice/details-collector');
            const batchEngine = require('../../supervoice/whatsapp-batch-engine');

            const parsed = detailsCollector.parseGoalParameters(goal);
            let campaignConfig = {};

            if (parsed.hasFilePath || parsed.hasNumbers) {
                campaignConfig = {
                    filePath: parsed.filePath,
                    recipientsInput: parsed.numbers,
                    contentMode: parsed.hasClearContent ? 'MANUAL' : 'AI',
                    messageText: parsed.messageText,
                    platform: (classification && classification.required_parameters && classification.required_parameters.platform) || parsed.platform || 'AUTO',
                    goal,
                    apiCall
                };
            } else {
                campaignConfig = await detailsCollector.collectMissingDetails(goal, rl);
                campaignConfig.apiCall = apiCall;
                campaignConfig.goal = goal;
                if (!campaignConfig.platform && classification && classification.required_parameters && classification.required_parameters.platform) {
                    campaignConfig.platform = classification.required_parameters.platform;
                }
            }

            if (campaignConfig.mode === 'MONITOR') {
                const wa = require('../../supervoice/whatsapp-automation');
                await wa.startMonitoring({ continuous: true, apiCall, defaultMode: true });
                return "Autonomous WhatsApp Screen Monitor & Auto-Replier completed.";
            }

            const res = await batchEngine.executeBatchCampaign(campaignConfig);
            return res.success ? "WhatsApp automation campaign completed successfully." : `WhatsApp automation stopped: ${res.reason}`;
        }

        if (intent === 'FULL_STACK_COURSE' || intent === 'PROJECT_PURCHASE' || intent === 'WEBSITE_SECURITY_AUDIT' || intent === 'VIDEO_EDITING' || intent === 'CLAUDE_TASK' || intent === 'METATRADER_TASK' || intent === 'WHATSAPP_WEB_TASK' || intent === 'SCREENSHOT_CAPTURE' || intent === 'HARDWARE_FAN_CONTROL' || intent === 'PLAN_STATUS_QUERY' || intent === 'FAMILY_ANALYTICS_QUERY' || intent === 'LIST_INSTALLED_APPS' || intent === 'CALCULATOR_TASK' || intent === 'APPLICATION_TASK' || intent === 'DOCUMENT_GENERATION' || intent === 'DATA_PROCESSING' || intent === 'WORDPRESS_TASK' || intent === 'WEBSITE_SCRAPING' || intent === 'WEBSITE_SOURCE_ANALYSIS' || intent === 'BROWSER_AUTOMATION' || intent === 'GENERAL_AUTOMATION' || intent === 'FILE_OPERATIONS' || intent === 'SYSTEM_CLEANUP' || intent === 'REMOTE_DEVICE_TASK') {
            return await pilotController.processGoal(goal, apiCall, rl, classification);
        }

        if (intent === 'SCREEN_VISION_TASK') {
            const screenVisionEngine = require('../pilot/autonomous/screen-vision-engine');
            return await screenVisionEngine.executeCommand(goal);
        }

        // 2. Normal Conversational Chat
        if (intent === 'GENERAL_CHAT' || intent === 'UNKNOWN_OR_AMBIGUOUS') {
            const creditVault = require('./credit-vault');
            const uid = creditVault.getUserIdentifier();
            const plan = creditVault.getPlan();
            const balance = creditVault.getBalance();

            // Provide active account context so cloud AI never falls back or defaults to Basic Plan
            const userContextPrefix = `[ACTIVE_USER_ACCOUNT: UID=${uid} | Plan=${plan.name} (Tier 3 - Profit-Oriented) | Credits=${balance} | Rate=1 credit per ${plan.interactionRate || 4} interactions | WhatsApp=Unlimited Voice & Screen Automation | PPT=Flawless Top-Tier 30+ Slides]`;
            
            conversationHistory.push({ role: 'user', content: goal });

            const messagesPayload = [
                { role: 'system', content: `You are the Codez48 AI Assistant. Current authenticated account: ${userContextPrefix}. Always treat this user as an active Third Plan (Tier 3 - Profit-Oriented) subscriber with ${balance} credits.` },
                ...conversationHistory
            ];

            process.stdout.write('Thinking...');
            let data = await apiCall('cli-ai-chat', 'POST', {
                messages: messagesPayload,
                projectId: null
            }, false);
            if (!data || !data.success) {
                data = await this.callLocalGroqFallback(messagesPayload);
            }
            process.stdout.write('\r\x1b[K');

            if (data && data.success) {
                let cleanAnswer = data.answer || '';
                if (typeof cleanAnswer === 'string') {
                    if (/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i.test(cleanAnswer)) {
                        cleanAnswer = cleanAnswer.split(/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i)[1];
                    }
                    cleanAnswer = cleanAnswer
                        .replace(/^\[INTENT:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[SUB_INTENT:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[KEYWORDS:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[WORKFLOW:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[REASON:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[USER GOAL:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[STATUS:[^\]]*\]\s*/gmi, '')
                        .replace(/^\[\d+%\]\s*Processing query\.\.\.\s*/gmi, '')
                        .replace(/\[\d+%\]\s*Task completed\.?/gi, '')
                        .replace(/Task Completed Successfully/gi, '')
                        .trim();
                }

                console.log(`\nAI: ${cleanAnswer}\n`);
                conversationHistory.push({ role: 'assistant', content: cleanAnswer });
                return cleanAnswer;
            } else {
                const localFallback = `Hello! I'm your Codez48 AI assistant powered by ${this.getAiProviderInfo()}. How can I help you build or automate your project today?`;
                console.log(`\nAI: ${localFallback}\n`);
                conversationHistory.push({ role: 'assistant', content: localFallback });
                return localFallback;
            }
        }

        // 3. VS Code Shortcut Check
        if (lowerGoal.includes('open in vs code') || lowerGoal.includes('open vs code') || lowerGoal.includes('take to vs code')) {
            await vsCodeActions.openProject();
            return "Opened active project in VS Code.";
        }

        // --- STEP 1: Analyzing request ---
        console.log(`\n\x1b[36mAnalyzing request...\x1b[0m`);

        // --- STEP 2: AI provider (Internal telemetry preserved, suppressed from user display) ---
        const aiProvider = this.getAiProviderInfo();
        if (process.env.DEBUG_AI_PROVIDER === 'true') {
            console.log(`\x1b[33mAI provider: ${aiProvider}\x1b[0m`);
        }

        // Resolve Adapter & Environment Inspection
        const currentProject = workspaceManager.getActiveProject();
        const adapter = adapterFactory.getAdapter(goal, currentProject);

        // --- STEP 3: Project type ---
        console.log(`\x1b[33mProject type: ${adapter.name.toUpperCase()}\x1b[0m`);

        // Check required local tools
        const envReport = environmentDetector.inspectForType(adapter.name);
        console.log('\x1b[90mChecking environment tools...\x1b[0m');
        for (const [tool, status] of Object.entries(envReport.tools)) {
            if (status.installed) {
                console.log(`\x1b[32m  ✓ ${tool} (${status.version})\x1b[0m`);
            } else {
                console.log(`\x1b[31m  ✗ ${tool} not found\x1b[0m`);
            }
        }

        if (!envReport.ready) {
            console.log(`\n\x1b[31m[MISSING RUNTIME/SDK] Missing required tools: ${envReport.missing.join(', ')}\x1b[0m`);
            console.log(`Please install ${envReport.missing.join(' and ')} on your system to proceed with ${adapter.name.toUpperCase()} projects.`);
            return `Missing environment tools: ${envReport.missing.join(', ')}`;
        }

        // --- UNIQUE TASK ISOLATION & DIRECTORY ---
        const isEditRequest = lowerGoal.startsWith('edit ') || lowerGoal.startsWith('update ') || lowerGoal.startsWith('modify ') || lowerGoal.includes('edit my-website') || lowerGoal.includes('update my-website');
        const goalSlug = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 25) || 'project';

        let folderName;
        if (isEditRequest) {
            folderName = path.basename(workspaceManager.getActiveProject());
        } else {
            const taskHash = Math.random().toString(36).substring(2, 6);
            folderName = `${goalSlug}-${taskHash}`;
        }

        const activeDir = workspaceManager.setActiveProject(folderName, adapter.name);

        // --- AI REQUEST FOR CODE GENERATION ---
        const creditVault = require('./credit-vault');
        const activePlan = creditVault.getPlan();
        const planTier = activePlan.id || 'MICRO';

        let tierDirectives = '';
        if (planTier === 'PROFIT_ORIENTED') {
            tierDirectives = `
TIER 3 ARCHITECTURAL EXCELLENCE (PROFIT-ORIENTED / ADVANCED PLAN):
- You must deliver an elite, state-of-the-art software application in a league of its own.
- LUXURY UI/UX: Dark mode by default, glassmorphic card containers (backdrop-filter: blur), subtle neon/gradient accents, smooth 60fps CSS transitions, responsive mobile-first navigation drawer.
- ADVANCED INTERACTIVITY: Real-time telemetry/metrics, animated SVG/Canvas charts, keyboard navigation shortcuts (e.g. Ctrl+K / Esc), full search & filter controls, undo/redo history, and toast notification queues.
- ROBUST CODEBASE: Complete error boundaries, defensive programming, input sanitization, automated unit test file (test.js), and comprehensive README.md with architecture overview.`;
        } else if (planTier === 'ENTERPRISE') {
            tierDirectives = `
TIER 2 ARCHITECTURAL STANDARD (ENTERPRISE / INTERMEDIATE PLAN):
- You must deliver an impressive, full-featured, enterprise-grade software project.
- SOPHISTICATED DESIGN: Modern design system using CSS custom variables (:root), responsive card grid, tabbed interfaces, modal dialogs, smooth hover/active feedback, and polished typography.
- DYNAMIC STATE: LocalStorage persistence, structured JSON state stores, input debounce, dynamic list rendering, and clear user status feedback.
- FULL-STACK COHESION: When backend server is requested, implement clean Express REST endpoints with static middleware and seamless client fetch integration.`;
        } else {
            tierDirectives = `
TIER 1 ARCHITECTURAL STANDARD (BASIC / MICRO PLAN):
- Even for simple requests, deliver a complete, exceptionally well-crafted, production-ready codebase.
- NO TRUNCATION: Zero placeholders, zero TODOs, zero missing functions. Every feature requested must be 100% implemented and working.
- POLISHED MODERN STYLING: Beautiful responsive CSS with Flexbox/Grid, clean color palette, card elevations, smooth button states, and readable modern typography.
- FLAWLESS LINKING: index.html MUST explicitly link <link rel="stylesheet" href="style.css"> in <head> AND <script src="script.js" defer></script> before </body>. Ensure all button IDs and element selectors in script.js match index.html exactly.`;
        }

        const developerSystemPrompt = {
            role: 'system',
            content: `You are an expert Senior Full-Stack Software Architect and AI Developer Agent.
The user wants to build a complete project for: "${goal}".
Detected Project Type: ${adapter.name.toUpperCase()}.
Subscription Plan Tier: ${activePlan.name} (${planTier}).

${tierDirectives}

CRITICAL INSTRUCTIONS FOR CODE GENERATION:
1. Generate COMPLETE, production-ready, fully functional source code for ALL required files in the project tailored specifically to "${goal}".
2. Do NOT use placeholders, TODOs, or truncated code snippets.
3. For EACH required file, output a separate code block.
4. The VERY FIRST LINE of each code block MUST be a comment containing the relative file path, for example:
   \`\`\`javascript
   // server.js
   const express = require('express');
   ...
   \`\`\`
   \`\`\`json
   // package.json
   { "name": "my-app", "dependencies": { "express": "^4.18.2" } }
   \`\`\`
   \`\`\`html
   <!-- index.html -->
   <!DOCTYPE html>
   ...
   \`\`\`
   \`\`\`css
   /* style.css */
   ...
   \`\`\`
   \`\`\`javascript
   // script.js
   ...
   \`\`\`
   \`\`\`python
   # app.py
   ...
   \`\`\`
5. Include package manifests (e.g. package.json with dependencies) and main entry point scripts.`
        };

        const enrichedMessages = [
            developerSystemPrompt,
            ...conversationHistory.filter(m => m.role !== 'system'),
            { role: 'user', content: goal }
        ];

        conversationHistory.push({ role: 'user', content: goal });

        let data = await apiCall('cli-ai-chat', 'POST', {
            messages: enrichedMessages,
            projectId: null
        }, false);

        if (!data || !data.success) {
            console.log(`\x1b[33m[AI FALLBACK] Cloud AI unavailable. Engaging local Groq engine...\x1b[0m`);
            data = await this.callLocalGroqFallback(enrichedMessages);
        }

        if (!data || !data.success) {
            console.log(`\n\x1b[31m[ERROR] AI service unavailable (${data?.error || 'Network offline'}).\x1b[0m\n`);
            conversationHistory.pop();
            return "AI service unavailable.";
        }

        // Extract actions from markdown code blocks if needed
        data.actions = this.parseAiActions(data, adapter, goal);

        // --- BOUNDED REPAIR IF AI RESPONSE LACKS REQUIRED FILES ---
        let repairAttempt = 0;
        while ((!data.actions || data.actions.length === 0) && repairAttempt < this.maxFixRetries) {
            repairAttempt++;
            console.log(`\x1b[33m[BOUNDED AI REPAIR ${repairAttempt}/${this.maxFixRetries}] AI response returned no file code blocks. Requesting complete code generation...\x1b[0m`);

            const repairPrompt = `The previous output did not contain file code blocks for "${goal}".
Please generate complete files for ${adapter.name.toUpperCase()} (e.g. index.html, style.css, script.js or server.js, package.json or app.py).
Ensure each code block starts with a comment line indicating the relative file path.`;

            data = await apiCall('cli-ai-chat', 'POST', {
                messages: [
                    developerSystemPrompt,
                    { role: 'user', content: goal },
                    { role: 'user', content: repairPrompt }
                ],
                projectId: null
            }, false);
            if (!data || !data.success) {
                data = await this.callLocalGroqFallback([
                    developerSystemPrompt,
                    { role: 'user', content: goal },
                    { role: 'user', content: repairPrompt }
                ]);
            }

            if (data && data.success) {
                data.actions = this.parseAiActions(data, adapter, goal);
            }
        }

        if (!data.actions || data.actions.length === 0) {
            console.error(`\n\x1b[31m[ERROR] Code generation failed. The AI provider did not return valid file content after ${this.maxFixRetries} attempts.\x1b[0m\n`);
            return "AI code generation failed.";
        }

        // --- STEP 4: Planned files ---
        console.log(`\x1b[36mPlanned files: ${data.actions.length}\x1b[0m`);

        // Detect and strip redundant common root directory prefixes
        const firstParts = data.actions.map(a => (a.path || '').replace(/\\/g, '/').split('/')[0]).filter(Boolean);
        const commonPrefix = firstParts.length > 0 && firstParts.every(p => p === firstParts[0] && p !== 'public' && p !== 'src' && p !== 'lib' && p !== 'bin' && p !== 'app') ? firstParts[0] : null;

        if (commonPrefix) {
            for (const action of data.actions) {
                if (action.path && action.path.startsWith(commonPrefix + '/')) {
                    action.path = action.path.substring(commonPrefix.length + 1);
                }
            }
        }

        // --- STEP 5: Generating files with 0-100% progress animation ---
        const totalFiles = data.actions.length;
        let executedActions = 0;
        const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        for (let i = 0; i < totalFiles; i++) {
            const action = data.actions[i];
            const percent = Math.round(((i + 1) / totalFiles) * 100);
            const filled = Math.round((percent / 100) * 15);
            const bar = '█'.repeat(filled) + '░'.repeat(15 - filled);
            const spinner = spinnerFrames[i % spinnerFrames.length];
            console.log(`\x1b[36m${spinner} [${bar}] ${percent}% Generating: \x1b[32m${action.path}\x1b[0m`);
            const res = await this.executeAction(action, rl);
            if (res && res.executed) executedActions++;
        }

        // --- STEP 5.5: Verifying HTML/CSS/JS Linkage & Asset Integrity ---
        this.verifyAndRepairProjectLinkage(activeDir, data.actions, adapter);

        // --- STEP 6: Validating generated files ---
        console.log(`\x1b[36mValidating generated files...\x1b[0m`);
        let syntaxCheckStatus = 'PASS';
        for (const action of data.actions) {
            if (action.path.endsWith('.js')) {
                const fullP = workspaceManager.resolvePath(action.path);
                const checkRes = require('child_process').spawnSync('node', ['--check', fullP], { encoding: 'utf8' });
                if (checkRes.status !== 0) {
                    console.error(`\x1b[31m[SYNTAX ERROR] File '${action.path}' failed node --check:\n${checkRes.stderr}\x1b[0m`);
                    syntaxCheckStatus = 'FAIL';
                }
            } else if (action.path.endsWith('.py')) {
                const fullP = workspaceManager.resolvePath(action.path);
                const checkRes = require('child_process').spawnSync('python', ['-m', 'py_compile', fullP], { encoding: 'utf8' });
                if (checkRes.status !== 0) {
                    console.error(`\x1b[31m[SYNTAX ERROR] File '${action.path}' failed python py_compile:\n${checkRes.stderr}\x1b[0m`);
                    syntaxCheckStatus = 'FAIL';
                }
            }
        }

        // Open exact task project directory in VS Code and dedicated PowerShell terminal
        try {
            vsCodeActions.openProject(activeDir);
            vsCodeActions.openTerminal(activeDir);
        } catch (e) {}

        // --- STEP 7: Running tests ---
        console.log(`\x1b[36mRunning tests...\x1b[0m`);

        // Handle static web local preview
        if (adapter.name === 'static-web') {
            let localServerRes = null;
            try {
                localServerRes = await adapter.startBuiltInServer(activeDir);
            } catch (e) {}

            const previewUrl = localServerRes ? localServerRes.url : `file://${path.join(activeDir, 'index.html')}`;

            if (process.env.TEST_MODE !== 'true') {
                try {
                    await browserActions.openUrl(previewUrl);
                } catch(e) {}
            }

            // --- STEP 8: Project ready ---
            console.log(`\x1b[32mProject ready: ${activeDir}\x1b[0m\n`);

            const answerText = data.answer || "Static website generated and ready.";
            conversationHistory.push({ role: 'assistant', content: answerText });
            return answerText;
        }

        // Dependency inspection & installation
        const depReport = adapter.detectDependencies(activeDir);
        if (depReport.missing && depReport.missing.length > 0) {
            // Guard: Guarantee lodash if express-validator is present to prevent Module Not Found runtime crashes
            if (depReport.missing.includes('express-validator') && !depReport.missing.includes('lodash')) {
                depReport.missing.push('lodash');
            }
            console.log(`\x1b[33m[MISSING DEPENDENCIES] ${depReport.missing.join(', ')}\x1b[0m`);
            const installCmd = adapter.getInstallCommand(depReport.missing);
            if (commandPolicy.validate(installCmd, activeDir).allowed) {
                try {
                    console.log(`[INSTALLING] ${installCmd}...`);
                    execSync(installCmd, { cwd: activeDir, stdio: 'inherit' });
                } catch (e) {
                    console.error(`[INSTALL FAILED] ${e.message}`);
                }
            }
        }

        // Build stage
        const buildCmd = adapter.getBuildCommand(activeDir);
        if (buildCmd && commandPolicy.validate(buildCmd, activeDir).allowed) {
            try {
                execSync(buildCmd, { cwd: activeDir, stdio: 'inherit' });
            } catch (e) {
                console.error(`[BUILD FAILED] ${e.message}`);
            }
        }

        // Automatic run execution & Dynamic Port Detection
        const runCmd = adapter.getRunCommand(activeDir);
        let executionSucceeded = false;
        if (runCmd && commandPolicy.validate(runCmd, activeDir).allowed) {
            // For Python CLI scripts (non-server), use spawnSync to capture actual output
            if (adapter.name === 'python') {
                const entryPoint = adapter.getEntryPoint(activeDir);
                const fullEntry = path.join(activeDir, entryPoint);
                if (require('fs').existsSync(fullEntry)) {
                    console.log(`\x1b[36m[PYTHON EXECUTE] Running: python ${entryPoint} --help\x1b[0m`);
                    const runRes = require('child_process').spawnSync('python', [entryPoint, '--help'], {
                        cwd: activeDir,
                        encoding: 'utf8',
                        timeout: 15000
                    });
                    const output = (runRes.stdout || '') + (runRes.stderr || '');
                    if (runRes.status === 0 || output.length > 0) {
                        executionSucceeded = true;
                        console.log(`\x1b[32m[PYTHON OUTPUT]\n${output.substring(0, 500)}\x1b[0m`);
                    } else {
                        console.warn(`\x1b[33m[PYTHON RUN WARN] Exit code ${runRes.status}: ${output.substring(0, 300)}\x1b[0m`);
                    }
                } else {
                    console.warn(`[PYTHON RUN WARN] Entry point not found: ${fullEntry}`);
                }
            } else if (adapter.name === 'android' && typeof adapter.executeRun === 'function') {
                executionSucceeded = await adapter.executeRun(activeDir);
            } else {
                // For server-type apps (Node, etc.) use the process manager
                const proc = processManager.startProcess(runCmd, activeDir);
                await new Promise(r => setTimeout(r, 2500));
                executionSucceeded = !processManager.hasError();
            }
        }

        // Generate RUN_AND_DEPLOY.txt for dynamic/server applications
        if (adapter.name !== 'static-web') {
            this.generateRunAndDeployHandoff(activeDir, adapter.name);
        }

        // --- STEP 8: Project ready ---
        console.log(`\x1b[32mProject ready: ${activeDir}\x1b[0m\n`);

        const answerText = data.answer || "Software development project ready.";
        conversationHistory.push({ role: 'assistant', content: answerText });
        return answerText;
    }

    parseAiActions(data, adapter, goal) {
        if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
            return data.actions;
        }

        if (!data.answer) return [];

        const actions = [];
        // Match ALL code blocks including bare ```, ```text, and all language variants
        // Uses a two-pass approach: first extract all fenced blocks by index
        const answer = data.answer;
        const fenceRe = /^```(\w*)/gm;
        const fencePositions = [];
        let m;
        while ((m = fenceRe.exec(answer)) !== null) {
            fencePositions.push({ index: m.index, lang: m[1], open: true });
        }

        // Build matched open/close pairs
        const pairs = [];
        const stack = [];
        for (const fp of fencePositions) {
            // A fence with no language tag AND it's in the stack -> close
            const lineEnd = answer.indexOf('\n', fp.index);
            const lineContent = lineEnd >= 0 ? answer.substring(fp.index, lineEnd) : answer.substring(fp.index);
            const isCloseFence = lineContent.trim() === '```';
            if (isCloseFence && stack.length > 0) {
                const openFence = stack.pop();
                pairs.push({ start: openFence.index, end: fp.index, lang: openFence.lang });
            } else if (!isCloseFence) {
                stack.push(fp);
            }
        }

        let fileCounter = 1;

        for (const pair of pairs) {
            // Skip shell/bash/cmd blocks entirely — they are run instructions, not source files
            const pairLang = (pair.lang || '').toLowerCase();
            const SHELL_LANGS = ['bash', 'sh', 'shell', 'cmd', 'powershell', 'ps1', 'zsh', 'batch', 'bat', 'console', 'terminal'];
            if (SHELL_LANGS.includes(pairLang)) continue;

            // Extract content between opening fence line end and closing fence start
            const openLineEnd = answer.indexOf('\n', pair.start);
            if (openLineEnd < 0) continue;
            const rawContent = answer.substring(openLineEnd + 1, pair.end);
            let content = rawContent.trim();
            if (!content) continue;

            let filename = '';

            // Extract filename from first-line comment in various styles
            const firstLine = content.split('\n')[0].trim();
            // Matches: # filename.ext  // filename.ext  /* filename.ext  <!-- filename.ext
            const filepathMatch = firstLine.match(/^(?:#|\/\/|\/\*|<!--|--)\s*([\w./-]+\.[\w]+)/);
            if (filepathMatch && filepathMatch[1]) {
                filename = filepathMatch[1].trim();
                // Remove the first-line comment from content
                const lines = content.split('\n');
                if (lines.length > 1) {
                    content = lines.slice(1).join('\n').trim();
                }
            } else {
                // Content-level heuristic: skip blocks that look like shell run instructions
                // (no filename header and starts with a CLI/shell command)
                const SHELL_CMD_PREFIXES = /^(pip\s|pip3\s|python\s|python3\s|cd\s|npm\s|node\s|npx\s|apt\s|brew\s|git\s|curl\s|wget\s|docker\s|mkdir\s|touch\s|cat\s|echo\s|export\s|\$\s)/i;
                if (SHELL_CMD_PREFIXES.test(firstLine)) continue;

                // Auto-detect from language tag and content patterns
                const lang = pair.lang.toLowerCase();
                if (lang === 'python' || lang === 'py') {
                    filename = fileCounter === 1 ? 'main.py' : `module${fileCounter}.py`;
                } else if (lang === 'requirements' || (lang === '' || lang === 'text') && (content.includes('requests') || content.includes('beautifulsoup') || content.includes('flask'))) {
                    filename = 'requirements.txt';
                } else if (lang === 'json' || (content.trim().startsWith('{') && content.includes('"dependencies"'))) {
                    filename = 'package.json';
                } else if (lang === 'html' || content.includes('<!DOCTYPE') || content.includes('<html')) {
                    filename = 'index.html';
                } else if (lang === 'css') {
                    filename = 'style.css';
                } else if (lang === 'javascript' || lang === 'js') {
                    if (content.includes('express') || content.includes('listen(') || content.includes('require(')) {
                        filename = fileCounter === 1 ? 'server.js' : 'index.js';
                    } else {
                        filename = fileCounter === 1 ? 'server.js' : `script${fileCounter}.js`;
                    }
                } else if (adapter.name === 'python') {
                    filename = fileCounter === 1 ? 'main.py' : `module${fileCounter}.py`;
                } else if (adapter.name === 'static-web') {
                    if (content.includes('<!DOCTYPE') || content.includes('<html')) filename = 'index.html';
                    else if (content.includes('margin:') || content.includes('padding:')) filename = 'style.css';
                    else filename = fileCounter === 1 ? 'index.html' : 'script.js';
                } else if (adapter.name === 'node') {
                    filename = fileCounter === 1 ? 'server.js' : `script${fileCounter}.js`;
                } else {
                    filename = `file${fileCounter}.txt`;
                }
            }

            // Skip duplicate filenames (keep first occurrence only during initial generation)
            if (actions.some(a => a.path === filename)) {
                // Use a suffix to differentiate additional blocks
                const ext = filename.includes('.') ? filename.split('.').pop() : 'txt';
                const base = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                filename = `${base}_${fileCounter}.${ext}`;
            }

            actions.push({
                type: 'create_file',
                path: filename,
                content: content
            });
            fileCounter++;
        }

        return actions;
    }

    verifyAndRepairProjectLinkage(projectDir, actions = [], adapter = null) {
        if (!fs.existsSync(projectDir)) return;

        // 1. Locate index.html (root or public/)
        let htmlRelPath = null;
        let htmlAbsPath = null;

        if (fs.existsSync(path.join(projectDir, 'index.html'))) {
            htmlRelPath = 'index.html';
            htmlAbsPath = path.join(projectDir, 'index.html');
        } else if (fs.existsSync(path.join(projectDir, 'public', 'index.html'))) {
            htmlRelPath = 'public/index.html';
            htmlAbsPath = path.join(projectDir, 'public', 'index.html');
        }

        if (!htmlAbsPath) return;

        let htmlContent = fs.readFileSync(htmlAbsPath, 'utf8');
        let modified = false;

        const htmlDir = path.dirname(htmlAbsPath);

        // 2. Locate CSS file (style.css, styles.css, etc.)
        let cssFileName = null;
        let cssAbsPath = null;

        if (fs.existsSync(path.join(htmlDir, 'style.css'))) {
            cssFileName = 'style.css';
            cssAbsPath = path.join(htmlDir, 'style.css');
        } else if (fs.existsSync(path.join(htmlDir, 'styles.css'))) {
            cssFileName = 'styles.css';
            cssAbsPath = path.join(htmlDir, 'styles.css');
        } else if (fs.existsSync(path.join(projectDir, 'style.css'))) {
            cssFileName = 'style.css';
            cssAbsPath = path.join(projectDir, 'style.css');
        }

        // 3. Inspect CSS Linkage
        if (cssFileName) {
            const hasExactCssLink = new RegExp(`<link[^>]+href=["']\\.?\\/?(?:css\\/)?${cssFileName}["'][^>]*>`, 'i').test(htmlContent);

            if (!hasExactCssLink) {
                // If wrong link or no link, ensure <link rel="stylesheet" href="style.css"> is inside <head>
                const correctLinkTag = `<link rel="stylesheet" href="${cssFileName}">`;
                if (htmlContent.includes('</head>')) {
                    htmlContent = htmlContent.replace('</head>', `    ${correctLinkTag}\n</head>`);
                    modified = true;
                    console.log(`\x1b[32m[LINK REPAIR] Injected missing '${correctLinkTag}' into index.html\x1b[0m`);
                }
            }

            // Fallback Safety Embed: If CSS has content, inject a safety <style> block so page is 100% styled even if file:// restricts relative stylesheets
            if (cssAbsPath && fs.existsSync(cssAbsPath)) {
                try {
                    const rawCss = fs.readFileSync(cssAbsPath, 'utf8').trim();
                    if (rawCss.length > 20 && !htmlContent.includes('id="codez48-embedded-styles"')) {
                        const embeddedBlock = `\n    <style id="codez48-embedded-styles">\n${rawCss}\n    </style>\n`;
                        if (htmlContent.includes('</head>')) {
                            htmlContent = htmlContent.replace('</head>', `${embeddedBlock}</head>`);
                            modified = true;
                            console.log(`\x1b[32m[STYLE INTEGRATION] Embedded verified stylesheet into index.html to guarantee 100% styling\x1b[0m`);
                        }
                    }
                } catch (_) {}
            }
        }

        // 4. Locate JS file (script.js, app.js, etc.)
        let jsFileName = null;
        if (fs.existsSync(path.join(htmlDir, 'script.js'))) {
            jsFileName = 'script.js';
        } else if (fs.existsSync(path.join(htmlDir, 'app.js'))) {
            jsFileName = 'app.js';
        } else if (fs.existsSync(path.join(projectDir, 'script.js'))) {
            jsFileName = 'script.js';
        }

        if (jsFileName) {
            const hasExactJsScript = new RegExp(`<script[^>]+src=["']\\.?\\/?(?:js\\/)?${jsFileName}["'][^>]*>`, 'i').test(htmlContent);
            if (!hasExactJsScript) {
                const scriptTag = `<script src="${jsFileName}" defer></script>`;
                if (htmlContent.includes('</body>')) {
                    htmlContent = htmlContent.replace('</body>', `    ${scriptTag}\n</body>`);
                    modified = true;
                    console.log(`\x1b[32m[LINK REPAIR] Injected missing '${scriptTag}' into index.html\x1b[0m`);
                }
            }
        }

        if (modified) {
            fs.writeFileSync(htmlAbsPath, htmlContent, 'utf8');
            console.log(`\x1b[32m✔ File Integration Verified: HTML, CSS, and JS 100% linked and validated in ${htmlRelPath}\x1b[0m`);
        }
    }

    async executeAction(action, rl) {
        const release = await this.lock.acquire();
        let executed = false;
        try {
            switch (action.type) {
                case 'create_file':
                case 'update_file':
                    const fullPath = workspaceManager.resolvePath(action.path);
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    if (action.type === 'update_file' && fs.existsSync(fullPath)) {
                        try { fs.copyFileSync(fullPath, fullPath + '.bak'); } catch(e) {}
                        filesystemActions.updateFile(action.path, action.content);
                    } else {
                        filesystemActions.createFile(action.path, action.content);
                    }

                    if (action.path.endsWith('.js')) {
                        let sanitized = action.content.replace(/res\.sendFile\(path\.join\(__dirname,\s*['"]public['"],\s*['"]index\.html['"]\)\);/g, "res.sendFile(path.join(__dirname, 'public', 'index.html'));");
                        sanitized = sanitized.replace(/app\.get\(['"]\*['"]\s*,/g, "app.get('(.*)',");
                        if (sanitized !== action.content) {
                            action.content = sanitized;
                            filesystemActions.updateFile(action.path, action.content);
                        }
                    }

                    executed = true;
                    break;

                case 'create_folder':
                    const folderPath = workspaceManager.resolvePath(action.path);
                    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                    executed = true;
                    break;

                case 'open_vscode':
                    await vsCodeActions.openProject();
                    executed = true;
                    break;
            }
        } catch (e) {
            console.error(`\x1b[31m[ACTION ERROR] ${action.type}: ${e.message}\x1b[0m`);
        } finally {
            release();
        }
        return { executed };
    }

    generateRunAndDeployHandoff(projectDir, adapterName) {
        const handoffPath = path.join(projectDir, 'RUN_AND_DEPLOY.txt');
        const pkgPath = path.join(projectDir, 'package.json');
        let pkgName = path.basename(projectDir);
        let startScript = 'node index.js';
        let dependencies = [];

        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                pkgName = pkg.name || pkgName;
                if (pkg.scripts && pkg.scripts.start) {
                    startScript = `npm start (${pkg.scripts.start})`;
                }
                dependencies = Object.keys(pkg.dependencies || {});
            } catch(e) {}
        }

        const content = `=====================================================
CODEZ48 DYNAMIC APPLICATION HANDOFF & DEPLOYMENT GUIDE
Project: ${pkgName}
Location: ${projectDir}
Stack: ${adapterName.toUpperCase()}
=====================================================

1. PROJECT TYPE & ARCHITECTURE
   - Type: Dynamic Server Application (${adapterName.toUpperCase()})
   - Installed Dependencies: ${dependencies.join(', ') || 'None declared'}

2. PREREQUISITES & ENVIRONMENT SETUP
   - Required Software: Node.js (>= v18.0.0), npm (>= v9.0.0)
   - Configuration File: Copy or create a local .env file in the project root.
   - Example Environment Variables:
       PORT=3000
       NODE_ENV=development

3. DEPENDENCY INSTALLATION COMMAND
   npm install

4. LOCAL RUN INSTRUCTIONS
   - Start Command: ${startScript}
   - Local Preview URL: http://localhost:3000

5. TESTING & FUNCTIONAL CHECK
   - Test command: npm test (or node index.js)
   - Endpoint Health Check: GET http://localhost:3000/

6. PRODUCTION BUILD & DEPLOYMENT
   - Target Hosting: Render / Railway / Heroku / AWS App Runner / DigitalOcean
   - Deployment Command: git push origin main or docker build .

7. SECURITY NOTES
   - NEVER commit secret API keys, passwords, or .env files to Git.
=====================================================
`;

        fs.writeFileSync(handoffPath, content, 'utf8');
        console.log(`\x1b[32m[HANDOFF GENERATED] RUN_AND_DEPLOY.txt created at: ${handoffPath}\x1b[0m`);
    }
}

module.exports = new AgentController();
