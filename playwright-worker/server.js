const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const browserManager = require('./browser-manager');
const { RunManager, RunState } = require('./run-manager');
const pageManager = require('./page-manager');
const pageInspector = require('./page-inspector');
const aiPlanner = require('./ai-planner');
const actionExecutor = require('./action-executor');
const actionVerifier = require('./action-verifier');
const realtimeServer = require('./realtime-server');
const watchdog = require('./watchdog');
const cleanup = require('./cleanup');

const app = express();
app.use(cors());
app.use(express.json());

// SERVE STATIC PROJECT FILES FOR LOCAL DEVELOPMENT
app.use(express.static(path.join(__dirname, '..')));
app.use('/tools', express.static(path.join(__dirname, '../tools')));
app.use('/js', express.static(path.join(__dirname, '../js')));

// 0. ROOT DASHBOARD ENDPOINT
app.get('/', async (req, res) => {
    const health = await browserManager.healthCheck();
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Codez48 Playwright Worker</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
                .card { background: #1e293b; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #10b981; color: white; }
                .endpoint { background: #0f172a; padding: 10px 15px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #38bdf8; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>⚡ Codez48 Playwright Worker Service</h2>
                <p>Status: <span class="badge">${health.status.toUpperCase()}</span></p>
                <p>Browser Connected: <strong>${health.browserConnected ? 'YES (Chromium Active)' : 'NO'}</strong></p>
                <p>Active Automation Runs: <strong>${RunManager.runs.size}</strong></p>
                <hr style="border-color: #334155; margin: 20px 0;">
                <h3>Available Endpoints:</h3>
                <div class="endpoint">GET /health</div>
                <div class="endpoint">POST /api/runs</div>
                <div class="endpoint">WS /ws</div>
                <div class="endpoint">GET /api/runs/:runId/screenshot</div>
            </div>
        </body>
        </html>
    `);
});

// 1. HEALTH CHECK ENDPOINT
app.get('/health', async (req, res) => {
    const health = await browserManager.healthCheck();
    res.json({
        service: 'Codez48 Playwright Worker',
        status: health.status,
        browserConnected: health.browserConnected,
        activeRunsCount: RunManager.runs.size,
        timestamp: new Date().toISOString()
    });
});

// GET /api/runs INFORMATIONAL ROUTE
app.get('/api/runs', async (req, res) => {
    const activeRuns = Array.from(RunManager.runs.values()).map(r => RunManager.getSafeRunMetadata(r));
    res.json({
        endpoint: '/api/runs',
        usage: 'Send HTTP POST request to /api/runs with JSON payload to start a new Playwright automation run.',
        activeRunsCount: activeRuns.length,
        activeRuns: activeRuns
    });
});

// 2. CREATE & START AUTOMATION RUN
app.post('/api/runs', async (req, res) => {
    try {
        const { runId, userId = 'guest', goal, targetUrl, payload } = req.body;
        if (!runId || !goal || !targetUrl) {
            return res.status(400).json({ error: 'Missing runId, goal, or targetUrl' });
        }

        console.log(`[SERVER] Received start run request: ${runId} (${goal})`);

        // Create Run Instance
        const run = RunManager.createRun(runId, userId, goal, targetUrl, payload);
        RunManager.updateRunStatus(runId, RunState.STARTING_BROWSER, 'Launching isolated Playwright browser context...');

        // Start Background Worker Loop
        startWorkerAgentLoop(runId).catch(err => {
            console.error(`[WORKER LOOP ERROR] Run ${runId}:`, err.message);
        });

        res.json({
            success: true,
            runId: run.runId,
            status: run.status,
            message: 'Playwright Browser Worker launched successfully.'
        });

    } catch (err) {
        console.error('[SERVER START RUN ERROR]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. RESUME RUN AFTER USER OTP / INPUT
app.post('/api/runs/:runId/resume', async (req, res) => {
    try {
        const { runId } = req.params;
        const { userId = 'guest', userResponse } = req.body;

        const run = RunManager.getRunForUser(runId, userId);
        if (!run) {
            return res.status(404).json({ error: 'Run not found or unauthorized' });
        }

        console.log(`[SERVER] Resuming run: ${runId} with user response...`);
        RunManager.updateRunStatus(runId, RunState.RUNNING, 'User input provided. Resuming agent loop...', userResponse);

        // Resume background worker loop
        startWorkerAgentLoop(runId).catch(err => {
            console.error(`[RESUME LOOP ERROR] Run ${runId}:`, err.message);
        });

        res.json({ success: true, runId, status: run.status });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. STOP / CANCEL RUN
app.post('/api/runs/:runId/stop', async (req, res) => {
    try {
        const { runId } = req.params;
        const { userId = 'guest' } = req.body;

        const run = RunManager.getRunForUser(runId, userId);
        if (run) {
            await cleanup.cleanupRun(runId);
        }
        res.json({ success: true, message: 'Run terminated and resources released.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. LIVE SCREENSHOT FRAME ENDPOINT
app.get('/api/runs/:runId/screenshot', async (req, res) => {
    try {
        const { runId } = req.params;
        const run = RunManager.getRun(runId);
        if (!run || !run.activePage || run.activePage.isClosed()) {
            return res.status(404).json({ error: 'Active page not found or closed' });
        }

        const screenshotBuf = await run.activePage.screenshot({
            type: 'jpeg',
            quality: 60
        });

        res.set('Content-Type', 'image/jpeg');
        res.send(screenshotBuf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CONTINUOUS WORKER AGENT LOOP
async function startWorkerAgentLoop(runId) {
    const run = RunManager.getRun(runId);
    if (!run) return;

    try {
        // Step 1: Obtain isolated BrowserContext for User
        const context = await browserManager.getOrCreateContext(run.userId);
        run.browserContext = context;

        // Register Page Listeners for popups/new tabs (Module 5)
        await pageManager.setupContextPageListeners(context, run, realtimeServer);

        // Step 2: Create Main Target Page
        RunManager.updateRunStatus(runId, RunState.OPENING_PAGE, `Opening target URL: ${run.targetUrl}`);
        const page = await context.newPage();
        await pageManager.registerPage(run, page, false, realtimeServer);

        // Navigate to Target URL
        await page.goto(run.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        RunManager.updateRunStatus(runId, RunState.RUNNING, 'Target page loaded. Starting continuous Playwright agent loop...');
        watchdog.startRunWatchdog(run, realtimeServer);

        let stepCount = 0;
        const maxSteps = 15;

        // CONTINUOUS AGENT LOOP (Module 8)
        while (run.status === RunState.RUNNING && stepCount < maxSteps) {
            stepCount++;
            run.currentStep = stepCount;

            const activePage = run.activePage;
            if (!activePage || activePage.isClosed()) {
                console.warn(`[WORKER LOOP] Active page closed or missing for run ${runId}.`);
                break;
            }

            // 1. Inspect live Playwright Page (Module 7)
            const pageState = await pageInspector.inspectPage(activePage);

            // Emit Screenshot Frame event to Viewer (Module 35)
            try {
                const screenshotBuf = await activePage.screenshot({ type: 'jpeg', quality: 50 });
                const base64Img = screenshotBuf.toString('base64');
                realtimeServer.emitRunEvent(runId, 'PAGE_SCREENSHOT', { image: `data:image/jpeg;base64,${base64Img}` });
            } catch (sErr) {}

            // 2. Ask AI Action Planner for ONE next step (Module 8)
            const actionPlan = await aiPlanner.planNextAction(run, pageState);

            // 3. Handle USER INPUT / OTP PAUSE (Module 25)
            if (actionPlan.action === 'ask_user' || actionPlan.action === 'wait_for_user') {
                RunManager.updateRunStatus(runId, RunState.WAITING_FOR_USER, actionPlan.statusText || 'User input required...');
                run.waitingReason = actionPlan.value || 'OTP or CAPTCHA required';
                realtimeServer.emitRunEvent(runId, 'WAITING_FOR_USER', { reason: run.waitingReason, statusText: run.lastAction });
                console.log(`[WORKER LOOP] Run ${runId} paused for user input: ${run.waitingReason}`);
                break;
            }

            // 4. Handle Task Completion (Module 44)
            if (actionPlan.action === 'finish') {
                RunManager.updateRunStatus(runId, RunState.COMPLETED, actionPlan.statusText || 'Task completed successfully!', actionPlan.value);
                run.collectedData = actionPlan.value;
                realtimeServer.emitRunEvent(runId, 'RUN_COMPLETED', {
                    finalResult: actionPlan.value,
                    statusText: run.lastAction
                });
                console.log(`[WORKER LOOP] Run ${runId} COMPLETED.`);
                break;
            }

            // 5. Execute Real Playwright Action & Calculate Real Element Bounding Box (Module 10 & 11)
            RunManager.updateRunStatus(runId, RunState.VERIFYING, actionPlan.statusText || `Executing ${actionPlan.action}...`);

            const executionResult = await actionExecutor.executeAction(activePage, actionPlan, realtimeServer, runId);

            // 6. Action Verification (Module 22)
            const verification = await actionVerifier.verifyAction(activePage, actionPlan, executionResult);

            RunManager.updateRunStatus(
                runId,
                RunState.RUNNING,
                verification.verified ? `Verified: ${actionPlan.action}` : `Executed: ${actionPlan.action}`,
                verification.reason
            );

            realtimeServer.emitRunEvent(runId, 'ACTION_COMPLETED', {
                step: stepCount,
                action: actionPlan.action,
                verified: verification.verified,
                reason: verification.reason
            });

            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (err) {
        console.error(`[WORKER AGENT LOOP CRITICAL ERROR] Run ${runId}:`, err.message);
        RunManager.updateRunStatus(runId, RunState.FAILED, `Execution error: ${err.message}`);
        realtimeServer.emitRunEvent(runId, 'RUN_FAILED', { error: err.message });
    }
}

// START SERVER
const server = http.createServer(app);
realtimeServer.attachWebSocketServer(server);

server.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`[PLAYWRIGHT WORKER SERVICE ONLINE] Listening on port: ${config.PORT}`);
    console.log(`====================================================`);
});
