/**
 * CODEZ48 DESKTOP PILOT CONTROLLER
 * Orchestrates general-purpose Windows desktop application tasks,
 * task session isolation, Web fallback routing, GUI mouse/keyboard interactions, Office COM creation, 3D Engine modeling,
 * and AI Browser Control Layer (DOM-first observe-reason-act-verify loop).
 */

const fs = require('fs');
const path = require('path');
const logger = require('../core/logger');
const taskSession = require('./task-session');
const capabilityRegistry = require('./capability-registry');
const powerPointAdapter = require('./adapters/powerpoint-adapter');
const wordAdapter = require('./adapters/word-adapter');
const excelAdapter = require('./adapters/excel-adapter');
const notepadAdapter = require('./adapters/notepad-adapter');
const calculatorAdapter = require('./adapters/calculator-adapter');
const vsCodeAdapter = require('./adapters/vscode-adapter');
const wordPressAdapter = require('./adapters/wordpress-adapter');
const webAutomationAdapter = require('./adapters/web-automation-adapter');
const browserController = require('./browser/browser-controller');
const generalDesktopAdapter = require('./adapters/general-desktop-adapter');
const installerHelper = require('./installer-helper');
const deploymentHelper = require('./deployment-helper');
const workflowSystem = require('./workflow-system');
const websiteExtractionWorkflow = require('./workflows/website-extraction-workflow');
const fileEditorAdapter = require('./adapters/file-editor-adapter');
const nodeProjectAdapter = require('./adapters/node-project-adapter');
const jsImplementerAdapter = require('./adapters/js-implementer-adapter');
const threeDController = require('./3d/three-d-controller');
const guiDriver = require('./drivers/gui-driver');
const intentClassifier = require('../core/intent-classifier');
const pilotHud = require('./hud/pilot-hud-controller');
const appDiscovery = require('./app-discovery');
// Lazy-load agentController to avoid circular dependency
const getAgentController = () => require('../core/agent-controller');

class PilotController {
    constructor() {
        this.activeApp = null;
        this.activeGoal = null;
    }

    extractTargetFilePath(goal) {
        if (!goal) return null;
        const quotedMatch = goal.match(/["']([a-zA-Z]:[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|~[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|\.{1,2}[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|[^"'\r\n]+?\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))["']/i);
        if (quotedMatch) return quotedMatch[1].trim();

        const quotedAbsMatch = goal.match(/["']([a-zA-Z]:[\\\/][^"'\r\n]+)["']/i);
        if (quotedAbsMatch) return quotedAbsMatch[1].trim();

        const unquotedMatch = goal.match(/(?:(?:in|at|file|path|open|edit|from|to|into|transfer|send)\s+)?([a-zA-Z]:[\\\/](?:[^:*?"<>|\r\n]+?)\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))\b/i);
        if (unquotedMatch) return unquotedMatch[1].trim();

        const relMatch = goal.match(/((?:~[\\\/]|\.{1,2}[\\\/]|[\w-]+\/)[^:*?"<>|\r\n\s]+\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))\b/i);
        if (relMatch) return relMatch[1].trim();

        return null;
    }

    async processGoal(goal, apiCall, rl, classification = null) {
        if (!goal || !goal.trim()) return;

        this.activeGoal = goal;
        logger.status(`\x1b[36mProcessing task: "${goal}"...\x1b[0m`);

        // Initialize On-Screen 3D Companion Overlay (Following cursor, blinking eyes, live HUD)
        pilotHud.start('thinking', `Analyzing: "${goal.substring(0, 38)}"...`);

        if (!classification) {
            classification = await intentClassifier.classify(goal, apiCall);
            intentClassifier.display(classification);
        }

        const intent = classification.intent;
        const sub_intent = classification.sub_intent;
        const lower = (goal || '').toLowerCase();

        // 0. User Plan Status & Credit Balance Query (Deterministic Account Ticket)
        if (intent === 'PLAN_STATUS_QUERY' || sub_intent === 'CHECK_PLAN_AND_CREDITS') {
            pilotHud.setGenerating('Retrieving account plan & credit balance...');
            const creditVault = require('../core/credit-vault');
            const uid = creditVault.getUserIdentifier();
            const balance = creditVault.getBalance();
            const plan = creditVault.getPlan();

            let ticket = `\n\x1b[36m========================================================================================\x1b[0m\n`;
            ticket += `\x1b[1m\x1b[32m🎫 CODEZ48 PILOT ACCOUNT & SUBSCRIPTION STATUS\x1b[0m\n`;
            ticket += `\x1b[36m========================================================================================\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mUser ID:\x1b[0m               \x1b[36m${uid}\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mActive Plan:\x1b[0m           \x1b[1m\x1b[33m${plan.name}\x1b[0m (Tier 3 - Profit-Oriented)\n`;
            ticket += `  \x1b[1m\x1b[37mRemaining Credits:\x1b[0m     \x1b[1m\x1b[32m${balance.toLocaleString()} Credits\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mInteraction Rate:\x1b[0m      \x1b[35m1 Credit deducted per ${plan.interactionRate || 4} interactions\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mPPT / Word Design:\x1b[0m     \x1b[35mFlawless Top-Tier Premium (30+ Slides / Modern Executive)\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mWhatsApp Automation:\x1b[0m   \x1b[32mUnlimited Access (Voice Supervisor + Screen Replier included)\x1b[0m\n`;
            ticket += `  \x1b[1m\x1b[37mBrowser Control:\x1b[0m       \x1b[32mAutonomous Playwright Action with Live 3D Companion\x1b[0m\n`;
            ticket += `\x1b[36m========================================================================================\x1b[0m\n`;
            ticket += `\x1b[32m✔ Account is in good standing with verified Tier 3 privileges.\x1b[0m\n`;
            ticket += `\x1b[36m========================================================================================\x1b[0m\n`;

            console.log(ticket);
            pilotHud.setSuccess(`Plan: ${plan.name} | ${balance} Credits`);
            setTimeout(() => pilotHud.hide(), 4000);
            return {
                success: true,
                uid,
                plan: plan.id,
                planName: plan.name,
                creditBalance: balance,
                display: ticket
            };
        }

        // 0.05 Family & User Activity Analytics Query (Deterministic User Count & Telemetry Ticket)
        if (intent === 'FAMILY_ANALYTICS_QUERY' || sub_intent === 'SHOW_USER_STATS') {
            pilotHud.setGenerating('Retrieving family & user analytics profile...');
            const activityTracker = require('../core/activity-tracker');
            const profile = activityTracker.getFiveDayProfile();

            logger.user(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
            logger.user(`\x1b[36m║           👥 CODEZ48 PILOT — FAMILY & USER USAGE TELEMETRY REPORT              ║\x1b[0m`);
            logger.user(`\x1b[36m╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
            logger.user(`  👤 Operations & Profile Editor: \x1b[33m${profile.leadEditor}\x1b[0m`);
            logger.user(`  📅 Report Window:               \x1b[37mLast 5 Days\x1b[0m`);
            logger.user(`  🎯 \x1b[1m\x1b[32mTotal Unique Users Created:  ${profile.summary.totalUniqueIdsCreated} Unique User IDs\x1b[0m`);
            logger.user(`  ⚡ \x1b[1m\x1b[32mActive Users (Last 5 Days):  ${profile.summary.activeUsersLast5Days} Users\x1b[0m`);
            logger.user(`  📊 Total Actions Executed:      \x1b[36m${profile.summary.totalActionsLast5Days} Actions\x1b[0m`);
            logger.user(`  ⏱️ Average Response Latency:    \x1b[35m${profile.summary.averageResponseTimeMs} ms\x1b[0m\n`);

            logger.user(`  \x1b[1mDaily Usage Breakdown:\x1b[0m`);
            profile.dailyTrend.forEach(day => {
                const bar = '█'.repeat(Math.min(30, Math.max(1, Math.round(day.actions / 2))));
                logger.user(`   [${day.label}] \x1b[34m${bar}\x1b[0m ${day.actions} actions | \x1b[32m${day.activeUsers} users\x1b[0m | ${day.avgResponseTimeMs}ms avg`);
            });

            logger.user(`\n  🌐 \x1b[32mWeb Dashboard: https://codez48.netlify.app/family.html\x1b[0m\n`);
            pilotHud.setSuccess(`Found ${profile.activeUsersLast5Days} active users (${profile.totalUniqueIdsCreated} total)`);
            setTimeout(() => pilotHud.hide(), 4000);
            return { success: true, profile };
        }

        // 0.085 Product Discovery, Search & Autonomous Order Dispatch
        if (intent === 'PRODUCT_SEARCH_AND_ORDER' || sub_intent === 'DISCOVER_OR_ORDER_PRODUCT') {
            pilotHud.setGenerating('Analyzing Codez48 Seller Network & Product Database...');
            const productAdapter = require('./adapters/product-catalog-adapter');
            const result = await productAdapter.handleProductRequest(goal, rl);
            pilotHud.setSuccess('Product Consultation & Discovery Ready');
            setTimeout(() => pilotHud.hide(), 4000);
            return result;
        }

        // 0.08 Full Stack Online Course Masterclass Inquiry & Autonomous Registration
        if (intent === 'FULL_STACK_COURSE' || sub_intent === 'COURSE_INQUIRY_AND_ENROLL') {
            pilotHud.setGenerating('Loading Full Stack Masterclass Curriculum & Scholarship...');
            const courseAdapter = require('./adapters/course-registration-adapter');
            const result = await courseAdapter.handleInquiry(goal, rl);
            pilotHud.setSuccess('Full Stack Masterclass Details Ready');
            setTimeout(() => pilotHud.hide(), 4000);
            return result;
        }

        // 0.1 Enumerate and display all installed laptop applications
        if (intent === 'LIST_INSTALLED_APPS' || sub_intent === 'ENUMERATE_APPS') {
            pilotHud.setGenerating('Retrieving all installed desktop applications...');
            const appDiscovery = require('./app-discovery');
            const appOverview = appDiscovery.formatInstalledAppsForDisplay();
            console.log(appOverview.text);
            pilotHud.setSuccess(`${appOverview.count} desktop applications listed.`);
            setTimeout(() => pilotHud.hide(), 4000);
            return {
                success: true,
                count: appOverview.count,
                apps: appOverview.apps,
                display: appOverview.text
            };
        }

        // Security Authorization Gatekeeper Check (Requires explicit user permission before taking over input or executing actions)
        const securityAuthorization = require('../core/security-authorization');
        const actionableIntents = [
            'APPLICATION_TASK', 'BROWSER_AUTOMATION', 'FILE_OPERATIONS',
            'SCREEN_VISION_TASK', 'SUPERVISOR_AUTOMATION', 'GENERAL_AUTOMATION', 'CLAUDE_TASK',
            'METATRADER_TASK', 'HARDWARE_FAN_CONTROL', 'SYSTEM_HARDWARE_CONTROL', 'MOVIE_TICKET_BOOKING', 'WHATSAPP_WEB_TASK', 'REMOTE_DEVICE_TASK',
            'SCREENSHOT_CAPTURE', 'VIDEO_EDITING'
        ];

        const isActionable = actionableIntents.includes(intent) ||
            ['LAUNCH_APP', 'WEB_AUTOMATION', 'FILE_EDIT', 'SCREEN_VISION', 'CALCULATOR_MATH', 'NOTEPAD_SAVE'].includes(intent);

        if (isActionable) {
            const authCheck = await securityAuthorization.requestAuthorization({
                target: classification?.target || goal,
                actionType: intent,
                description: goal,
                goal
            }, rl);

            if (!authCheck.authorized) {
                logger.error(`\x1b[31m[AUTHORIZATION DENIED] Task execution cancelled by user permission guard.\x1b[0m`);
                pilotHud.setActing('Action cancelled by user');
                setTimeout(() => pilotHud.hide(), 3000);
                return {
                    success: false,
                    reason: 'USER_REJECTED',
                    message: authCheck.message || 'Task execution was not authorized by user.'
                };
            }
        }

        // 0.2 Desktop Screen Capture / Screenshot Execution
        if (intent === 'SCREENSHOT_CAPTURE' || sub_intent === 'CAPTURE_DESKTOP') {
            const screenshotAdapter = require('./adapters/screenshot-adapter');
            return await screenshotAdapter.captureDesktopScreenshot(goal);
        }

        // 0.3 Laptop Hardware Cooling Fan Control & Multi-Hardware Unified Execution
        if (intent === 'HARDWARE_FAN_CONTROL' || sub_intent === 'RUN_LAPTOP_FAN' || intent === 'SYSTEM_HARDWARE_CONTROL') {
            const laptopHardwareController = require('./hardware/laptop-hardware-controller');
            
            const hasBrightness = /(?:brightness|light|பிரைட்|வெளிச்சம்)/i.test(lower);
            const hasVolume = /(?:volume|sound|சவுண்ட்|வால்யூம்|mute)/i.test(lower);
            const hasFan = /(?:fan|பேன்|ஃபே|cooling)/i.test(lower) || intent === 'HARDWARE_FAN_CONTROL' || sub_intent === 'RUN_LAPTOP_FAN';

            // Check if user requested multiple hardware adjustments in a single sentence
            const activeActions = [hasBrightness, hasVolume, hasFan].filter(Boolean).length;
            if (activeActions > 1) {
                const multiResults = {};

                if (hasBrightness) {
                    const action = (/(?:down|குறை|low|decrease)/i.test(lower)) ? 'down' : 'up';
                    pilotHud.setActing('Increasing display brightness...');
                    multiResults.brightness = laptopHardwareController.controlBrightness(action);
                }

                if (hasVolume) {
                    const action = lower.includes('mute') ? 'mute' : ((/(?:down|குறை|low|decrease)/i.test(lower)) ? 'down' : 'up');
                    pilotHud.setActing('Increasing system sound volume...');
                    multiResults.volume = laptopHardwareController.controlVolume(action);
                }

                if (hasFan) {
                    const secMatch = goal.match(/(\d+)\s*(?:seconds?|secs?|s|செகண்ட்|விநாடி)\b/i) || goal.match(/(\d+)/);
                    const isFast = /fast|quick|சீக்கிரம்|விரைவாக|ஃபாஸ்ட்டா/i.test(goal || '');
                    const durationSec = secMatch ? parseInt(secMatch[1], 10) : (isFast ? 8 : (classification?.required_parameters?.duration || 10));
                    const isFullSpeed = /full|max|100%|maximum|ஃபுல்|முழு|அதிவேக/i.test(goal || '');
                    pilotHud.setActing('Activating laptop cooling fan at full speed...');
                    multiResults.fan = await laptopHardwareController.runFan(durationSec, { isFullSpeed, goal });
                }

                pilotHud.setSuccess('All requested hardware adjustments completed!');
                setTimeout(() => pilotHud.hide(), 4000);
                return { success: true, multiHardware: true, ...multiResults };
            }

            // Single Fan Request
            if (intent === 'HARDWARE_FAN_CONTROL' || sub_intent === 'RUN_LAPTOP_FAN') {
                const secMatch = goal.match(/(\d+)\s*(?:seconds?|secs?|s|செகண்ட்|விநாடி)\b/i) || goal.match(/(\d+)/);
                const isFast = /fast|quick|சீக்கிரம்|விரைவாக|ஃபாஸ்ட்டா/i.test(goal || '');
                const durationSec = secMatch ? parseInt(secMatch[1], 10) : (isFast ? 8 : (classification?.required_parameters?.duration || 10));
                const isFullSpeed = /full|max|100%|maximum|ஃபுல்|முழு|அதிவேக/i.test(goal || '');
                return await laptopHardwareController.runFan(durationSec, { isFullSpeed, goal });
            }

            // Single Hardware Request
            let res;
            if (sub_intent === 'GET_BATTERY') {
                pilotHud.setActing('Reading battery percentage and power status...');
                res = await laptopHardwareController.getBatteryStatus();
            } else if (sub_intent === 'CONTROL_WIFI') {
                const action = lower.includes('off') ? 'off' : (lower.includes('on') ? 'on' : 'status');
                pilotHud.setActing(`Checking / Controlling Wi-Fi (${action})...`);
                res = await laptopHardwareController.controlWifi(action);
            } else if (sub_intent === 'CONTROL_VOLUME' || hasVolume) {
                const action = lower.includes('mute') ? 'mute' : ((lower.includes('down') || lower.includes('குறை') || lower.includes('low') || lower.includes('decrease')) ? 'down' : 'up');
                const valMatch = goal.match(/(\d+)/);
                pilotHud.setActing(`Controlling system volume (${action})...`);
                res = await laptopHardwareController.controlVolume(action, valMatch ? parseInt(valMatch[1], 10) : null);
            } else if (sub_intent === 'CONTROL_BRIGHTNESS' || hasBrightness) {
                const action = (lower.includes('down') || lower.includes('குறை') || lower.includes('low') || lower.includes('decrease')) ? 'down' : 'up';
                const valMatch = goal.match(/(\d+)/);
                pilotHud.setActing(`Controlling display brightness (${action})...`);
                res = await laptopHardwareController.controlBrightness(action, valMatch ? parseInt(valMatch[1], 10) : null);
            } else if (sub_intent === 'UPDATE_APPS') {
                pilotHud.setActing('Launching Windows App & Package Updates...');
                res = await laptopHardwareController.updateApps();
            } else {
                pilotHud.setActing('Compiling System Hardware Dashboard...');
                res = await laptopHardwareController.getSystemDashboard();
            }
            pilotHud.setSuccess('Hardware control completed.');
            setTimeout(() => pilotHud.hide(), 4000);
            return res;
        }

        // 0.38 Autonomous Movie Ticket Booking via Playwright (Fuzzy spellings, seat selection, checkout)
        if (intent === 'MOVIE_TICKET_BOOKING' || sub_intent === 'BOOK_MOVIE_TICKETS') {
            const movieAdapter = require('./adapters/movie-ticket-booking-adapter');
            return await movieAdapter.bookMovieTickets(goal, { rl });
        }

        // 0.4 MetaTrader 5 (MT5) Automated Trading & GUI Navigation
        if (intent === 'METATRADER_TASK') {
            pilotHud.setActing('Executing MetaTrader 5 operation...');
            const mt5Adapter = require('./adapters/mt5-trading-adapter');
            const tradingVision = require('./trading/trading-vision-engine');
            const symbol = (mt5Adapter.extractTradingSymbol && typeof mt5Adapter.extractTradingSymbol === 'function')
                ? mt5Adapter.extractTradingSymbol(goal)
                : 'EURUSD';
            const goalLower = (goal || '').toLowerCase();
            let res;

            if (goalLower.includes('teach') || goalLower.includes('coach') || goalLower.includes('demo') || goalLower.includes('explain') || goalLower.includes('சொல்லிக் கொடு') || goalLower.includes('சொல்லிக்கொடு') || goalLower.includes('கத்துக்கொடு') || goalLower.includes('விளக்கு')) {
                res = await mt5Adapter.teachAndDemonstrateTrade(symbol);
            } else if (goalLower.includes('existing') || goalLower.includes('ஏற்கனவே') || goalLower.includes('where it bought') || goalLower.includes('எங்க பை')) {
                res = await mt5Adapter.analyzeExistingChart(symbol);
            } else if (goalLower.includes('profit') || goalLower.includes('balance') || goalLower.includes('ப்ராஃபிட்')) {
                res = await mt5Adapter.getComprehensiveTradingReport(symbol);
                if (goalLower.includes('take a trade') || goalLower.includes('trade newly') || goalLower.includes('newly') || goalLower.includes('புதிய')) {
                    const action = /sell/i.test(goal) ? 'SELL' : 'BUY';
                    await mt5Adapter.executeTradeWithPhysicalCursor(symbol, action, 0.01);
                }
            } else if (sub_intent === 'SWITCH_TIMEFRAME' || goalLower.includes('timeframe') || /(?:m1|m5|m15|m30|h1|h4|d1|w1|mn)\b/i.test(goalLower)) {
                const tfMatch = goalLower.match(/\b(m1|m5|m15|m30|h1|h4|d1|w1|mn)\b/i);
                const tf = tfMatch ? tfMatch[1].toUpperCase() : 'M15';
                res = await mt5Adapter.switchTimeframe(tf);
            } else if (goalLower.includes('draw') || goalLower.includes('டிரா') || goalLower.includes('line') || goalLower.includes('லைன்') || sub_intent === 'DRAW_CHART_TOOL') {
                const tool = goalLower.includes('vertical') ? 'vertical'
                    : (goalLower.includes('horizontal') ? 'horizontal'
                    : (goalLower.includes('channel') ? 'channel'
                    : (goalLower.includes('crosshair') ? 'crosshair'
                    : (goalLower.includes('fib') ? 'fibonacci'
                    : (goalLower.includes('shape') || goalLower.includes('box') || goalLower.includes('rect') ? 'shapes'
                    : (goalLower.includes('text') || goalLower.includes('label') ? 'text' : 'trendline'))))));
                res = await mt5Adapter.drawChartTool(tool, { goal });
            } else if (goalLower.includes('toolbar') || goalLower.includes('டூல்பார்')) {
                res = await mt5Adapter.clickToolbarPhysical(goal);
            } else if (goalLower.includes('news') || goalLower.includes('calendar') || goalLower.includes('mailbox') || goalLower.includes('மெயில்') || goalLower.includes('கேலண்டர்')) {
                res = await mt5Adapter.inspectToolboxAndDailyNews();
            } else if (sub_intent === 'WEB_TRADING') {
                res = await tradingVision.executeWebTrade('https://www.tradingview.com/chart', { symbol });
            } else if (sub_intent === 'CHART_VISION') {
                res = await tradingVision.analyzeChartVision({ symbol });
            } else if (sub_intent === 'NAVIGATE_GUI') {
                res = await mt5Adapter.navigateGuiPanel(goal);
            } else if (sub_intent === 'EXECUTE_TRADE' || /buy|sell|take trade/i.test(goal)) {
                const action = /sell/i.test(goal) ? 'SELL' : 'BUY';
                res = await mt5Adapter.executeTradeWithPhysicalCursor(symbol, action, 0.01);
            } else if (sub_intent === 'PROTECT_CAPITAL') {
                res = await mt5Adapter.enforceZeroLoss();
            } else if (sub_intent === 'ACCOUNT_STATUS') {
                res = await mt5Adapter.ensureLoggedIn(rl);
            } else {
                res = await mt5Adapter.analyze(symbol);
            }
            pilotHud.setSuccess('Trading & chart task completed.');
            setTimeout(() => pilotHud.hide(), 4000);
            return res;
        }

        // 0.42 Autonomous AI Video Editing & Video Generation Studio (5 Credits)
        if (intent === 'VIDEO_EDITING' || sub_intent === 'EDIT_VIDEO' || sub_intent === 'GENERATE_VIDEO') {
            pilotHud.setActing('Launching Codez48 AI Video Studio...');
            const videoEditingAdapter = require('./adapters/video-editing-adapter');
            const res = await videoEditingAdapter.handleVideoEditingTask(goal, { classification, rl });
            pilotHud.setSuccess('Video editing studio ready & automated.');
            setTimeout(() => pilotHud.hide(), 4000);
            return res;
        }

        // 0.45 Claude AI Desktop App, Web Automation & Autonomous MCP Protocol Skill Builder
        if (intent === 'CLAUDE_TASK') {
            pilotHud.setActing('Executing Claude AI & MCP Skill Builder...');
            const claudeAdapter = require('./adapters/claude-automation-adapter');
            const mcpBuilder = require('./mcp/mcp-skill-builder');
            const platformResolver = require('./platform-resolver');
            const generalDesktopAdapter = require('./adapters/general-desktop-adapter');
            const activeBrowserDetector = require('./browser/active-browser-detector');

            const hasMessageAction = /\b(?:send|message|say|ask|tell|write|type|hello|prompt|wait|result|input|box)\b/i.test(lower) || lower.includes('மெசேஜ்') || lower.includes('இன்புட்') || lower.includes('பாக்ஸ்') || lower.includes('டைப்') || lower.includes('சொன்னது');
            if (sub_intent === 'SKILL_FILE_CONFIG' || sub_intent === 'MCP_CREATION' || lower.includes('skill') || lower.includes('mcp') || lower.includes('create mcp') || lower.includes('build mcp') || lower.includes('generate mcp') || lower.includes('create skill') || lower.includes('build skill') || lower.includes('mcp server') || lower === 'mcp' || lower.startsWith('mcp ')) {
                const res = await mcpBuilder.generateAutonomousMcp(goal, { rl });

                // If user also requested asking a question or automating on the website, execute Playwright automation
                if (lower.includes('ask') || lower.includes('question') || lower.includes('automate') || lower.includes('input') || lower.includes('query')) {
                    const websiteAutomationEngine = require('./browser/website-automation-engine');
                    const autoRes = await websiteAutomationEngine.executeWebsiteAutomation(goal, { apiCall, rl });
                    res.websiteAutomation = autoRes;
                } else if (lower.includes('open') && (lower.includes('claude') || lower.includes('cloud') || lower.includes('web') || lower.includes('website') || lower.includes('site'))) {
                    const activeBrowser = activeBrowserDetector.getActiveBrowser();
                    await activeBrowserDetector.launchInActiveBrowser('https://claude.ai');
                    res.browserLaunched = true;
                    res.browser = activeBrowser.name;
                }

                pilotHud.setSuccess('Autonomous MCP Skill suite generated & verified!');
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            } else if (!hasMessageAction && (sub_intent === 'CLAUDE_APP_LAUNCH' || /^(?:open|launch|start|run|bring\s+up)\s+(?:the\s+)?(?:claude|cloud)(?:\s+(?:desktop|app|website|site))?$/i.test(lower))) {
                // Priority check: Native Desktop Application vs Web
                const platformChoice = platformResolver.resolvePlatformAction(goal);
                if (platformChoice.mode === 'NATIVE_APP' && platformChoice.appInfo) {
                    pilotHud.setActing(`Launching native desktop application "${platformChoice.platform}"...`);
                    const launchRes = await generalDesktopAdapter.launchApp(platformChoice.appInfo);
                    pilotHud.setSuccess(`Desktop application active: ${platformChoice.platform}`);
                    setTimeout(() => pilotHud.hide(), 4000);
                    return launchRes;
                } else {
                    const activeBrowser = activeBrowserDetector.getActiveBrowser();
                    pilotHud.setActing(`Launching Claude AI in ${activeBrowser.name}...`);
                    await activeBrowserDetector.launchInActiveBrowser('https://claude.ai');
                    pilotHud.setSuccess(`Claude AI active in ${activeBrowser.name} (Everyday Profile).`);
                    setTimeout(() => pilotHud.hide(), 4000);
                    return { success: true, app: 'Claude', type: 'web', browser: activeBrowser.name, url: 'https://claude.ai' };
                }
            } else {
                // Autonomous Claude Task execution with skill injection and artifact extraction
                const res = await claudeAdapter.executeClaudeTask(goal, { rl });
                pilotHud.setSuccess('Claude AI automation task completed.');
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            }
        }

        // 0.48 Wireless Remote Device Bridge & Zero-Install Device Automation
        if (intent === 'REMOTE_DEVICE_TASK') {
            pilotHud.setActing('Launching Wireless Remote Device Bridge...');
            const remoteBridge = require('./remote/remote-device-bridge');
            const cliRemote = require('./remote/cli-remote-controller');

            if (sub_intent === 'BLUETOOTH_TRANSFER') {
                const targetFilePath = this.extractTargetFilePath(goal) || path.join(os.homedir(), 'OneDrive', 'Desktop', 'ppt_for_full_stack_class_prese.pptx');
                const res = remoteBridge.sendViaBluetooth(targetFilePath);
                pilotHud.setSuccess('Bluetooth Transfer Wizard opened!');
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            } else if (sub_intent === 'ZIP_AND_TRANSFER') {
                const zipPath = cliRemote.zipProject();
                const isBt = lower.includes('bluetooth') || lower.includes('ப்ளூடூத்');
                if (isBt) {
                    cliRemote.sendViaBluetooth(zipPath);
                } else {
                    const sInfo = await cliRemote.startCliServer();
                    logger.user(`\x1b[32m✔ ZIP Archive Ready: ${path.basename(zipPath)}\x1b[0m`);
                    logger.user(`👉 On your remote computer or mobile: http://${sInfo.hostIp}:${sInfo.port}/download/${encodeURIComponent(path.basename(zipPath))}`);
                }
                pilotHud.setSuccess('Project ZIP generated and transfer link ready!');
                setTimeout(() => pilotHud.hide(), 4000);
                return { success: true, zipPath };
            } else if (sub_intent === 'BRIDGE_STATUS') {
                const deliverables = remoteBridge.listDeliverables();
                logger.status(`\x1b[32m[BRIDGE STATUS] Host IP: ${remoteBridge.hostIp} | Port: ${remoteBridge.port} | PIN: ${remoteBridge.pairingPin} | Files: ${deliverables.length}\x1b[0m`);
                pilotHud.setSuccess(`Bridge Status: ${remoteBridge.hostIp}:${remoteBridge.port}`);
                setTimeout(() => pilotHud.hide(), 4000);
                return { success: true, hostIp: remoteBridge.hostIp, port: remoteBridge.port, pin: remoteBridge.pairingPin, files: deliverables.length };
            } else {
                // START_BRIDGE or TRANSFER_DELIVERABLE
                const hasPresentationCreation = /\b(?:create|make|generate|build)\b/i.test(lower) && /\b(?:slides?|pptx?|presentation|deck|ஸ்லைடு|பிபிடி|பிரசன்டேஷன்)\b/i.test(lower);
                if (hasPresentationCreation) {
                    logger.status(`\x1b[36m[PILOT COMPOUND TASK] Synthesizing presentation before initiating wireless remote bridge...\x1b[0m`);
                    await powerPointAdapter.createPresentationGoal(goal, apiCall);
                }
                const startRes = await remoteBridge.start();
                const targetPortalUrl = startRes.websiteUrl || `https://codez48.netlify.app/tools/remote.html?pin=${startRes.pin}`;
                try {
                    const { exec } = require('child_process');
                    if (process.platform === 'win32') exec(`start "" "${targetPortalUrl}"`);
                    else if (process.platform === 'darwin') exec(`open "${targetPortalUrl}"`);
                    else exec(`xdg-open "${targetPortalUrl}"`);
                } catch (_) {}
                pilotHud.setSuccess(`Bridge Active: ${startRes.url} (PIN: ${startRes.pin})`);
                setTimeout(() => pilotHud.hide(), 4000);
                return startRes;
            }
        }

        // 0.49 System Virus & Temp Files Cleanup Engine (Dual Mode: Scan/Show vs Clean/Delete)
        if (intent === 'SYSTEM_CLEANUP') {
            const systemCleanupEngine = require('./drivers/system-cleanup-engine');
            const isScanMode = (classification && classification.sub_intent === 'SCAN_SYSTEM') ||
                (/\b(?:show|list|view|display|check|inspect)\b/i.test(lower) && !/\b(?:clean|delete|remove|clear|purge)\b/i.test(lower)) ||
                (/[\u0B80-\u0BFF]/.test(lower) && (lower.includes('காட்ட') || lower.includes('காட்டு') || lower.includes('பார்')) && !lower.includes('டெலீட்') && !lower.includes('அழி') && !lower.includes('கிளீன்'));

            if (isScanMode) {
                pilotHud.setActing('Scanning temporary junk and virus signatures (Read-Only)...');
                const res = await systemCleanupEngine.scanOnly();
                pilotHud.setSuccess(`Scan Complete: ${res.totalFiles} files (${res.totalMb} MB)`);
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            } else {
                pilotHud.setActing('Executing system temp cleanup and security scan...');
                const res = await systemCleanupEngine.cleanAndDelete({ deleteTemp: true, deleteVirus: true });
                pilotHud.setSuccess(`System Cleanup Complete: ${res.totalMbFreed} MB freed`);
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            }
        }

        // 0.48 Defensive Website Security Vulnerability Auditor & Dashboard
        if (intent === 'WEBSITE_SECURITY_AUDIT') {
            pilotHud.setActing('Auditing website security posture & defense vulnerabilities...');
            const websiteSecurityAuditor = require('./security/website-security-auditor');
            const securityDashboardServer = require('./security/security-dashboard-server');

            let targetUrl = classification && classification.target ? classification.target : null;
            if (!targetUrl || targetUrl === 'https://example.com') {
                const urlMatch = goal.match(/https?:\/\/[^\s"'<>]+/i) ||
                                 goal.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|app|io|dev|ai|tv|co|in|edu|gov|xyz|me|info)(?:\/[^\s"'<>]*)?)\b/i);
                if (urlMatch) targetUrl = urlMatch[0];
            }
            if (!targetUrl) targetUrl = 'https://example.com';

            const auditReport = await websiteSecurityAuditor.auditWebsite(targetUrl);
            const launchResult = await securityDashboardServer.launchDashboard(auditReport);

            pilotHud.setSuccess(`Security Audit Complete: Score ${auditReport.score}/100 [Grade ${auditReport.grade}]`);
            setTimeout(() => pilotHud.hide(), 5000);

            return {
                success: true,
                target: auditReport.target,
                score: auditReport.score,
                grade: auditReport.grade,
                severityCounts: auditReport.severityCounts,
                dashboardUrl: launchResult.dashboardUrl,
                report: auditReport
            };
        }

        // 0.47 Complete Enterprise Source Code Purchase & Gated Download (₹29,000 INR)
        if (intent === 'PROJECT_PURCHASE') {
            pilotHud.setActing('Compiling master source code package & opening enterprise checkout...');
            const enterpriseCheckoutServer = require('./licensing/enterprise-checkout-server');
            const sourceCodePackager = require('./licensing/source-code-packager');

            const pkg = sourceCodePackager.getOrBuildPackage();
            const launchRes = await enterpriseCheckoutServer.launchCheckout();

            pilotHud.setSuccess('Enterprise Checkout Active: ₹29,000 INR Buyout');
            setTimeout(() => pilotHud.hide(), 5000);

            logger.user(`\n\x1b[37m========================================================================================\x1b[0m`);
            logger.user(`\x1b[1m\x1b[37m⚡ CODEZ48 ENTERPRISE MASTER SOURCE CODE BUYOUT (₹29,000 INR)\x1b[0m`);
            logger.user(`  ✔ Complete Codebase Archive:   ${pkg.fileName} (${pkg.sizeMb} MB)`);
            logger.user(`  ✔ Commercial Rights:           100% Full Unobfuscated Source Code & Resale Rights`);
            logger.user(`  ✔ Official Netlify Portal:     \x1b[1m\x1b[36m${launchRes.netlifyUrl}\x1b[0m`);
            logger.user(`  ✔ Local Checkout Server:       \x1b[1m\x1b[32m${launchRes.checkoutUrl}\x1b[0m`);
            logger.user(`  ✔ Razorpay Secure Gateway:     Opened in browser for instant payment & unlock`);
            logger.user(`\x1b[37m========================================================================================\x1b[0m\n`);

            return {
                success: true,
                intent: 'PROJECT_PURCHASE',
                price: 29000,
                currency: 'INR',
                package: pkg,
                checkoutUrl: launchRes.checkoutUrl,
                netlifyUrl: launchRes.netlifyUrl
            };
        }

        // 0.1 WhatsApp Desktop Application Launch / Task
        const isWhatsAppAppRequest = (intent === 'APPLICATION_TASK' && classification.target === 'whatsapp') ||
            (/\b(?:open|launch|start|run)\s+(?:the\s+)?whatsapp(?:\s+application|\s+app|\s+desktop)?\b/i.test(lower) && !lower.includes('web') && !lower.includes('website') && !lower.includes('site') && !lower.includes('browser'));

        if (isWhatsAppAppRequest) {
            pilotHud.setActing('Opening WhatsApp Desktop Application full-screen...');
            const appDiscovery = require('./app-discovery');
            const targetApp = appDiscovery.findApp('whatsapp');
            const res = await generalDesktopAdapter.launchApp(targetApp);
            pilotHud.setSuccess('WhatsApp Desktop Application launched!');
            setTimeout(() => pilotHud.hide(), 4000);
            return res;
        }

        // 0.2 WhatsApp Website & Batch Campaign Automation
        if (intent === 'WHATSAPP_WEB_TASK' || intent === 'SUPERVISOR_AUTOMATION' || (intentClassifier.isWhatsAppIntent && intentClassifier.isWhatsAppIntent(goal))) {
            const creditVault = require('../core/credit-vault');
            const waAccess = creditVault.isWhatsAppAllowed();
            if (!waAccess.allowed) {
                logger.error(`\n\x1b[31m[FEATURE LOCKED] ${waAccess.reason}\x1b[0m\n`);
                pilotHud.setActing('WhatsApp is locked on this tier');
                setTimeout(() => pilotHud.hide(), 3000);
                return {
                    success: false,
                    reason: 'FEATURE_LOCKED',
                    message: waAccess.reason
                };
            }

            const whatsappWebAdapter = require('./adapters/whatsapp-web-adapter');
            if (sub_intent === 'OPEN_WHATSAPP_WEB' || (lower.includes('open') && (lower.includes('web') || lower.includes('website')) && !lower.includes('send') && !lower.includes('message') && !lower.includes('excel'))) {
                pilotHud.setActing('Opening WhatsApp Website (https://web.whatsapp.com)...');
                const res = await whatsappWebAdapter.openWhatsAppWeb();
                pilotHud.setSuccess('WhatsApp Website ready in browser.');
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            } else if (sub_intent === 'WHATSAPP_MONITOR' || lower.includes('monitor') || lower.includes('incoming') || lower.includes('auto reply') || lower.includes('auto-reply') || lower.includes('check incoming')) {
                pilotHud.setActing('Scanning WhatsApp Web for incoming messages...');
                const res = await whatsappWebAdapter.monitorAndReply();
                pilotHud.setSuccess('WhatsApp Web monitoring complete.');
                setTimeout(() => pilotHud.hide(), 4000);
                return res;
            } else {
                // Batch campaign / Contact dispatch
                const detailsCollector = require('../../supervoice/details-collector');
                const batchEngine = require('../../supervoice/whatsapp-batch-engine');
                const parsed = detailsCollector.parseGoalParameters(goal);

                const campaignConfig = {
                    filePath: parsed.filePath,
                    recipientsInput: parsed.numbers,
                    contentMode: parsed.hasClearContent ? 'MANUAL' : 'AI',
                    messageText: parsed.messageText,
                    platform: (classification && classification.required_parameters && classification.required_parameters.platform) || parsed.platform || 'AUTO',
                    goal,
                    apiCall
                };

                return await batchEngine.executeBatchCampaign(campaignConfig);
            }
        }

        // Record Pilot Chat Interaction and deduct credits according to active tier rate
        const creditVault = require('../core/credit-vault');
        const interactionRes = creditVault.recordPilotInteraction({ goal });
        if (!interactionRes.success && interactionRes.reason === 'CREDITS_EXHAUSTED') {
            logger.error(`\n\x1b[31m[CREDITS EXHAUSTED] You have 0 credits remaining. Please upgrade your plan or add credits to continue using Pilot.\x1b[0m\n`);
            await creditVault.showPaymentPrompt();
            return {
                success: false,
                reason: 'CREDITS_EXHAUSTED',
                message: 'Credits exhausted. Please upgrade your subscription.'
            };
        }

        // Initialize unique task session & mode (CREATE vs EDIT)
        const session = taskSession.startTask(goal);

        let capabilityType = 'UNKNOWN';
        const lowerGoal = (goal || '').toLowerCase();
        if (intent === 'DOCUMENT_GENERATION') {
            if (sub_intent === 'PPT_TEMPLATE_GALLERY' || lowerGoal.includes('template gallery') || (lowerGoal.includes('template') && !lowerGoal.includes('create') && !lowerGoal.includes('make') && !lowerGoal.includes('generate') && !lowerGoal.includes('presentation') && !lowerGoal.includes('slide'))) capabilityType = 'OPEN_TEMPLATE_GALLERY';
            else if (sub_intent === 'POWERPOINT' || sub_intent === 'PRESENTATION' || (sub_intent && sub_intent.toLowerCase().includes('presentation')) || lowerGoal.includes('powerpoint') || lowerGoal.includes('presentation') || lowerGoal.includes('slide') || /\bppt\b/i.test(lowerGoal) || lowerGoal.includes('pptx')) capabilityType = 'CREATE_PRESENTATION';
            else if (lowerGoal.includes('excel') || lowerGoal.includes('spreadsheet') || lowerGoal.includes('xlsx') || lowerGoal.includes('csv')) capabilityType = 'CREATE_SPREADSHEET';
            else if (lowerGoal.includes('text file') || lowerGoal.includes('notepad') || lowerGoal.includes('.txt') || lowerGoal.includes('notepad note')) capabilityType = 'NOTEPAD_SAVE';
            else capabilityType = 'CREATE_DOCUMENT';
        } else if (intent === 'DATA_PROCESSING') {
            capabilityType = 'CREATE_SPREADSHEET';
        } else if (intent === 'WEBSITE_SCRAPING') {
            capabilityType = 'WEBSITE_CODE_EXTRACTION';
        } else if (intent === 'WEBSITE_SOURCE_ANALYSIS') {
            capabilityType = 'WEBSITE_CODE_EXTRACTION';
        } else if (intent === 'WORDPRESS_TASK') {
            capabilityType = 'WORDPRESS_DRAFT';
        } else if (intent === 'BROWSER_AUTOMATION') {
            capabilityType = 'WEB_AUTOMATION';
        } else if (intent === 'CALCULATOR_TASK' || sub_intent === 'CALCULATOR_MATH' || lowerGoal.includes('calculator') || lowerGoal.includes('calc')) {
            capabilityType = 'CALCULATOR_MATH';
        } else if (intent === 'APPLICATION_TASK' || sub_intent === 'LAUNCH_APP' || sub_intent === 'EXECUTE_APP_TASK') {
            capabilityType = 'LAUNCH_APP';
        } else if (intent === 'SCREEN_VISION_TASK' || sub_intent === 'OBSERVE_AND_CLICK') {
            capabilityType = 'SCREEN_VISION';
        } else if (intent === 'FILE_OPERATIONS') {
            capabilityType = 'FILE_EDIT';
        } else if (intent === 'GENERAL_AUTOMATION') {
            capabilityType = 'GENERAL_DESKTOP_TASK';
        } else if (intent === 'CODE_GENERATION' || intent === 'PROJECT_GENERATION') {
            capabilityType = 'NODE_PROJECT';
        } else if (intent === 'GENERAL_CHAT') {
            capabilityType = 'PURE_AI_KNOWLEDGE';
        } else {
            const resolved = capabilityRegistry.resolveCapability(goal);
            capabilityType = resolved.type;
        }

        const capability = { type: capabilityType, requirements: capabilityRegistry.resolveCapability(goal).requirements, app: capabilityRegistry.resolveCapability(goal).app };
        logger.debug(`Capability Intent Detected: ${capability.type}`);

        let taskResult = null;

        // 1. Saved Workflow Routine Execution ("start", "start-test")
        if (capability.type === 'WORKFLOW_EXECUTE') {
            taskResult = await workflowSystem.executeWorkflow(capability.workflowName, apiCall);
        }
        // 1.2 Interactive 100+ Templates Web Studio
        else if (capability.type === 'OPEN_TEMPLATE_GALLERY' || sub_intent === 'PPT_TEMPLATE_GALLERY') {
            const galleryPath = path.resolve(__dirname, 'templates/templates-gallery.html');
            pilotHud.setSuccess('Opening 100+ Templates Interactive Web Gallery...');
            try {
                const { exec } = require('child_process');
                exec(`start "" "${galleryPath}"`);
            } catch (_) {}
            logger.user(`\n\x1b[32m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            logger.user(`║      🎨 CODEZ48 100+ PRESENTATION TEMPLATES INTERACTIVE WEB STUDIO            ║`);
            logger.user(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
            logger.user(`  • Web App File:    ${galleryPath}`);
            logger.user(`  • Total Catalogs:  105 Professional Archetypes`);
            logger.user(`  • Features:        Live Category Filters, Color Swatches, Slide Count Slider,`);
            logger.user(`                     AI Smart Match & Instant Presentation Preview!\n`);
            return { success: true, galleryPath, totalTemplates: 105 };
        }
        // 1.5 Website Code Extraction & Playwright Scraping Code Generation
        else if (capability.type === 'WEBSITE_CODE_EXTRACTION' || intent === 'WEBSITE_SCRAPING' || sub_intent === 'WEBSITE_CODE_EXTRACTION') {
            const websiteAutomationEngine = require('./browser/website-automation-engine');
            taskResult = await websiteAutomationEngine.generateScraperCode(goal, { apiCall, rl });
        }
        // Universal Real-Time In-Place File Edit, Element Removal, and PDF Conversion Intent
        else if (capability.type === 'FILE_EDIT' || intent === 'FILE_OPERATIONS') {
            const isConvertPdf = sub_intent === 'CONVERT_TO_PDF' ||
                                 /\b(?:convert\s+(?:.*?\s+)?to\s+pdf|convert\s+(?:.*?\s+)?into\s+pdf|make\s+(?:a\s+)?pdf|create\s+(?:a\s+)?pdf|save\s+as\s+pdf|export\s+to\s+pdf)\b/i.test(goal);
            const isRemoval = sub_intent === 'REMOVE_FILE_CONTENT' ||
                              /\b(?:remove|delete|erase|strip|cut)\b/i.test(goal);
            const isAdd = sub_intent === 'ADD_FILE_CONTENT' ||
                          sub_intent === 'APPEND_OR_INSERT_TEXT' ||
                          /\b(?:add|insert|append|put|create\s+(?:a\s+)?point)\b/i.test(goal);

            if (isConvertPdf) {
                pilotHud.setActing('Executing universal vector PDF conversion...');
            } else if (isRemoval) {
                pilotHud.setActing('Surgically removing requested elements/text...');
            } else if (isAdd) {
                pilotHud.setActing('Adding requested point/content to document...');
            } else {
                pilotHud.setActing('Applying real-time in-place file modifications...');
            }
            
            // Robust path extraction supporting quoted paths with spaces, unquoted absolute Windows paths, and relative paths
            let targetFile = null;
            const quotedMatch = goal.match(/["']([a-zA-Z]:[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|~[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|\.{1,2}[\\\/][^"'\r\n]+?\.[a-zA-Z0-9_-]+|[^"'\r\n]+?\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))["']/i);
            if (quotedMatch) {
                targetFile = quotedMatch[1].trim();
            } else {
                const quotedAbsMatch = goal.match(/["']([a-zA-Z]:[\\\/][^"'\r\n]+)["']/i);
                if (quotedAbsMatch) {
                    targetFile = quotedAbsMatch[1].trim();
                } else {
                    const unquotedMatch = goal.match(/(?:(?:in|at|file|path|open|edit|from|to|into)\s+)?([a-zA-Z]:[\\\/](?:[^:*?"<>|\r\n]+?)\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))\b/i);
                    if (unquotedMatch) {
                        targetFile = unquotedMatch[1].trim();
                    } else {
                        const relMatch = goal.match(/((?:~[\\\/]|\.{1,2}[\\\/]|[\w-]+\/)[^:*?"<>|\r\n\s]+\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))\b/i);
                        if (relMatch) {
                            targetFile = relMatch[1].trim();
                        } else {
                            const bareMatch = goal.match(/(\b[\w.-]+\.(?:docx|doc|pptx|ppt|xlsx|xls|pdf|ttf|otf|txt|js|py|json|html|css|cpp|c|java|md|ini))\b/i);
                            if (bareMatch) {
                                targetFile = bareMatch[1].trim();
                            } else {
                                // Default to active desktop document if present
                                const defaultDocx = path.resolve(process.env.USERPROFILE || 'C:\\Users\\suriya prakash', 'OneDrive\\Desktop\\full_stack_complete_class_and_.docx');
                                const defaultPptx = path.resolve(process.env.USERPROFILE || 'C:\\Users\\suriya prakash', 'OneDrive\\Desktop\\ppt_for_full_stack_class_prese.pptx');
                                if (lower.includes('ppt') && fs.existsSync(defaultPptx)) {
                                    targetFile = defaultPptx;
                                } else if (fs.existsSync(defaultDocx)) {
                                    targetFile = defaultDocx;
                                } else {
                                    targetFile = 'index.html';
                                }
                            }
                        }
                    }
                }
            }

            // Detect request to open file location in Explorer
            const openLocation = /open\s+(?:this\s+)?(?:file\s+)?location|show\s+in\s+(?:folder|explorer)|open\s+folder/i.test(goal);

            if (isConvertPdf) {
                // Determine destination PDF path if explicitly mentioned
                let outputPdf = null;
                const pdfMatch = goal.match(/to\s+["']?([^"'\r\n]+\.pdf)["']?/i);
                if (pdfMatch) outputPdf = pdfMatch[1].trim();

                taskResult = await fileEditorAdapter.convertToPdf(targetFile, outputPdf, {
                    openLocation,
                    openAfterConvert: true
                });
                if (taskResult.success) {
                    pilotHud.setSuccess('Vector PDF converted and created successfully!');
                } else {
                    pilotHud.setActing(`PDF conversion error: ${taskResult.error || 'Failed'}`);
                }
                setTimeout(() => pilotHud.hide(), 4000);
            } else {
                let searchText = '';
                let replaceText = '';
                let operation = 'EDIT';
                if (isRemoval) operation = 'REMOVE';
                else if (isAdd) operation = 'ADD';

                if (isRemoval) {
                    const removeQuoteMatch = goal.match(/(?:remove|delete|erase|strip|cut)\s+(?:the\s+)?(?:specific\s+)?(?:element|elements|text|word|string)?\s*['"]([^'"]+)['"]/i);
                    if (removeQuoteMatch) {
                        searchText = removeQuoteMatch[1];
                    } else {
                        const removeFromMatch = goal.match(/(?:remove|delete|erase)\s+([^\s'"]+)\s+from/i);
                        if (removeFromMatch) {
                            searchText = removeFromMatch[1];
                        }
                    }
                } else {
                    const replaceWithMatch = goal.match(/(?:replace|change|update)\s+['"]([^'"]+)['"]\s+(?:with|to)\s+['"]([^'"]+)['"]/i);
                    if (replaceWithMatch) {
                        searchText = replaceWithMatch[1];
                        replaceText = replaceWithMatch[2];
                    } else {
                        const toMatch = goal.match(/(?:change|update|replace)\s+([^\s'"]+)\s+to\s+([^\s'"]+)/i);
                        if (toMatch) {
                            searchText = toMatch[1];
                            replaceText = toMatch[2];
                        }
                    }
                }

                const lineMatch = goal.match(/(?:line|slide|page|on\s+line)\s+(\d+)/i);
                const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : null;

                // Detect Point / Section number (e.g. "edit 7 th point", "point 7", "7th point", "remove 7 th point")
                const pointMatch = goal.match(/(?:point|item|section|bullet)\s*(\d+)|\b(\d+)\s*(?:th|st|nd|rd)\s*(?:point|item|section|bullet)/i);
                const pointNumber = pointMatch ? parseInt(pointMatch[1] || pointMatch[2], 10) : null;

                taskResult = await fileEditorAdapter.editFileInPlace(targetFile, searchText, replaceText, {
                    lineNumber,
                    pointNumber,
                    operation,
                    openLocation,
                    openAfterEdit: true
                });

                if (taskResult.success) {
                    let successMsg = 'File modified successfully in-place!';
                    if (isRemoval) successMsg = 'Element removed successfully from file!';
                    else if (isAdd || taskResult.operation === 'ADD') successMsg = `Point #${taskResult.modifiedPoint || pointNumber || ''} added successfully to document!`;
                    pilotHud.setSuccess(successMsg);
                } else {
                    pilotHud.setActing(`File modification: ${taskResult.error || 'Failed'}`);
                }
                setTimeout(() => pilotHud.hide(), 4000);
            }
        }
        // Node/Code Project Intent — delegate to agentController for full AI generation
        else if (capability.type === 'NODE_PROJECT') {
            // agentController handles AI code generation, adapter detection, file writing, and execution
            taskResult = await getAgentController().processGoal(goal, [], apiCall, rl);
            if (typeof taskResult === 'string') {
                taskResult = { success: true, answer: taskResult };
            }
        }
        // Deployment Intent
        else if (capability.type === 'DEPLOY_PROJECT') {
            taskResult = await deploymentHelper.promptAndDeploy(goal, rl);
        }
        // Intelligent JavaScript Implementation Intent
        else if (capability.type === 'INTELLIGENT_JS_IMPLEMENTATION') {
            taskResult = await jsImplementerAdapter.implementFeature(goal, apiCall);
        }
        // 2. AI-Optimized Playwright Browser Control Layer
        else if (capability.type === 'WEB_AUTOMATION') {
            const websiteAutomationEngine = require('./browser/website-automation-engine');
            taskResult = await websiteAutomationEngine.executeWebsiteAutomation(goal, { apiCall, rl });
        }
        // 3. 3D Model Creation Engine
        else if (capability.type === 'CREATE_3D_MODEL') {
            taskResult = await threeDController.process3DGoal(goal, apiCall);
        }
        // 4. Pure AI Knowledge Query (No local apps)
        else if (capability.type === 'PURE_AI_KNOWLEDGE') {
            if (apiCall) {
                try {
                    const aiData = await apiCall('cli-ai-chat', 'POST', {
                        messages: [{ role: 'user', content: goal }]
                    }, false);
                    let cleanAns = aiData?.answer || aiData?.content || 'AI response received';
                    if (typeof cleanAns === 'string') {
                        if (/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i.test(cleanAns)) {
                            cleanAns = cleanAns.split(/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i)[1];
                        }
                        cleanAns = cleanAns
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
                    taskResult = {
                        success: true,
                        answer: cleanAns,
                        requestId: aiData?.requestId
                    };
                } catch (e) {
                    taskResult = { success: false, error: e.message };
                }
            } else {
                taskResult = { success: true, goal };
            }
        }
        // 5. WordPress Draft Post Creation
        else if (capability.type === 'WORDPRESS_DRAFT') {
            taskResult = await wordPressAdapter.createWordPressDraftGoal(goal, apiCall);
        }
        // 6. Software / Game Installation Helper
        else if (capability.type === 'INSTALL_APP') {
            taskResult = await installerHelper.promptAndInstall(capability.appName, rl);
        }
        // 7. VS Code Fresh Project & Live HTML Creation
        else if (capability.type === 'VSCODE_PROJECT') {
            taskResult = await vsCodeAdapter.createVsCodeProjectGoal(goal, apiCall);
        }
        // 8. Calculator Math Automation
        else if (capability.type === 'CALCULATOR_MATH') {
            taskResult = await calculatorAdapter.calculateExpression(goal);
        }
        // 9. Deployment Helper
        else if (capability.type === 'DEPLOY_NETLIFY') {
            taskResult = await deploymentHelper.promptAndDeploy(goal, rl);
        }
        // 10. PowerPoint Presentation Creation
        else if (capability.type === 'CREATE_PRESENTATION') {
            taskResult = await powerPointAdapter.createPresentationGoal(goal, apiCall);
        }
        // 11. Word Document Creation
        else if (capability.type === 'CREATE_DOCUMENT') {
            taskResult = await wordAdapter.createDocumentGoal(goal, apiCall);
        }
        // 12. Excel Spreadsheet Creation
        else if (capability.type === 'CREATE_SPREADSHEET') {
            taskResult = await excelAdapter.createSpreadsheetGoal(goal, apiCall);
        }
        // 13. Notepad Text & File Save Automation
        else if (capability.type === 'NOTEPAD_SAVE') {
            const fileMatch = goal.match(/(?:as|file|named)\s+['"]?([^'"]+\.txt)['"]?/i) || goal.match(/\b([a-zA-Z0-9_\-]+\.txt)\b/i);
            const fileName = fileMatch ? fileMatch[1] : 'document.txt';

            taskResult = await notepadAdapter.createAndSaveNote(goal, fileName, null, apiCall);
        }
        // 13.5 Screen Vision & Cursor Control Loop
        else if (capability.type === 'SCREEN_VISION') {
            const screenVisionEngine = require('./autonomous/screen-vision-engine');
            taskResult = await screenVisionEngine.executeCommand(goal);
        }
        // 14. Launch Application & Execute Assigned Task in Application
        else if (capability.type === 'LAUNCH_APP' || intent === 'APPLICATION_TASK') {
            const taskMatch = goal.match(/^(?:open|launch|start|run|bring up)\s+([a-zA-Z0-9_\-\.\s]+?)\s+(?:and|to|then)\s+(.+)$/i);
            if (taskMatch) {
                const targetAppName = taskMatch[1].trim();
                const taskInstruction = taskMatch[2].trim();
                taskResult = await generalDesktopAdapter.executeAppTask(targetAppName, taskInstruction, apiCall, rl);
            } else {
                let targetApp = capability.app;
                if (!targetApp || !targetApp.target) {
                    const appMatch = goal.match(/(?:open|launch|start|run|bring up)\s+(?:the\s+)?(?:app(?:lication)?\s+)?([a-zA-Z0-9_\-\.\s]+)/i);
                    const appName = appMatch ? appMatch[1].trim() : (classification?.target || 'notepad');
                    targetApp = appDiscovery.findApp(appName);
                }
                taskResult = await generalDesktopAdapter.launchApp(targetApp);
            }
        }
        // 15. Default General Desktop Action Execution / Pure AI Knowledge Query
        else {
            const lower = goal.toLowerCase();
            if (lower.includes('type') || lower.includes('write')) {
                const textToType = goal.replace(/.*(?:type|write)\s+/i, '').replace(/["']/g, '');
                taskResult = guiDriver.typeText(textToType || 'Codez48 Pilot Test');
            } else if (lower.includes('move cursor') || lower.includes('move mouse') || lower.includes('glide cursor')) {
                const coordMatch = goal.match(/(\d+)\s*,\s*(\d+)/);
                const cx = coordMatch ? parseInt(coordMatch[1], 10) : 500;
                const cy = coordMatch ? parseInt(coordMatch[2], 10) : 400;
                taskResult = await guiDriver.moveCursorSmoothlyWithFeedback(cx, cy, 'Requested Coordinate');
                if (lower.includes('click')) {
                    await guiDriver.clickPhysicalMouse();
                }
            } else if (lower.includes('click')) {
                const coordMatch = goal.match(/(\d+)\s*,\s*(\d+)/);
                if (coordMatch) {
                    taskResult = await guiDriver.moveCursorAndClick(parseInt(coordMatch[1], 10), parseInt(coordMatch[2], 10));
                } else {
                    taskResult = await guiDriver.moveCursorAndClick(500, 400);
                }
            } else if (apiCall) {
                try {
                    const aiData = await apiCall('cli-ai-chat', 'POST', {
                        messages: [{ role: 'user', content: goal }]
                    }, false);
                    taskResult = {
                        success: true,
                        answer: aiData?.answer || aiData?.content || 'AI response received',
                        requestId: aiData?.requestId
                    };
                } catch (e) {
                    taskResult = { success: false, error: e.message };
                }
            } else {
                taskResult = { success: true, goal };
            }
        }

        // Send status acknowledgement to server for Request Monitor tracking
        if (apiCall && taskResult && taskResult.requestId) {
            try {
                const ackStatus = taskResult.success ? 'LOCAL_EXECUTION_COMPLETED' : 'LOCAL_EXECUTION_FAILED';
                await apiCall('cli-ai-chat', 'POST', { ackRequestId: taskResult.requestId, status: ackStatus }, false);
                logger.debug(`Sent Pilot task status acknowledgement (${ackStatus}) for ${taskResult.requestId}`);
            } catch (e) {}
        }

        if (taskResult && taskResult.success) {
            pilotHud.setSuccess('Task completed successfully!');
            setTimeout(() => pilotHud.hide(), 4000);
        } else if (taskResult && !taskResult.success) {
            pilotHud.setActing(taskResult.reason || taskResult.error || 'Execution notice');
            setTimeout(() => pilotHud.hide(), 4000);
        }

        return taskResult;
    }
}

module.exports = new PilotController();
