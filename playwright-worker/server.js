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

// CORS RESTRICTIONS (Module 7 & 18)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://codez48.netlify.app', 'http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS REJECT] Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// WORKER SECRET AUTH MIDDLEWARE
const authenticateWorkerSecret = (req, res, next) => {
    const secret = process.env.PLAYWRIGHT_WORKER_SECRET || 'codez48_secret_worker_token';
    const provided = req.headers['x-worker-secret'] || req.query.secret;
    if (!provided || provided !== secret) {
        console.warn(`[AUTH REJECT] Invalid worker secret provided for ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid worker secret token' });
    }
    next();
};

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

// GET /api/runs PROTECTED INFORMATIONAL ROUTE
app.get('/api/runs', authenticateWorkerSecret, async (req, res) => {
    const activeRuns = Array.from(RunManager.runs.values()).map(r => RunManager.getSafeRunMetadata(r));
    res.json({
        endpoint: '/api/runs',
        activeRunsCount: activeRuns.length,
        activeRuns: activeRuns
    });
});

// 2. CREATE & START AUTOMATION RUN (PROTECTED)
app.post('/api/runs', authenticateWorkerSecret, async (req, res) => {
    try {
        const { runId, userId = 'guest', goal, targetUrl, payload } = req.body;
        if (!runId || !goal || !targetUrl) {
            return res.status(400).json({ error: 'Missing runId, goal, or targetUrl' });
        }

        console.log(`[SERVER] Received start run request: ${runId} (${goal})`);

        // Create Run Instance
        const run = RunManager.createRun(runId, userId, goal, targetUrl, payload);
        RunManager.updateRunStatus(runId, RunState.STARTING_BROWSER, 'Launching isolated Playwright browser context...');

        // Start Background Worker Initialization & Loop
        initializeAndStartRun(runId).catch(err => {
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

// 3. RESUME RUN AFTER USER INPUT (PROTECTED - DOES NOT DUPLICATE PAGE)
app.post('/api/runs/:runId/resume', authenticateWorkerSecret, async (req, res) => {
    try {
        const { runId } = req.params;
        const { userId = 'guest', userResponse } = req.body;

        const run = RunManager.getRunForUser(runId, userId);
        if (!run) {
            return res.status(404).json({ error: 'Run not found or unauthorized' });
        }

        console.log(`[SERVER] Resuming run: ${runId} with user response...`);
        RunManager.updateRunStatus(runId, RunState.RUNNING, 'User input provided. Resuming agent loop...', userResponse);

        // Resume existing active page without creating new page or re-navigating
        resumeRunLoop(runId).catch(err => {
            console.error(`[RESUME LOOP ERROR] Run ${runId}:`, err.message);
        });

        res.json({ success: true, runId, status: run.status });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. STOP / CANCEL RUN (PROTECTED)
app.post('/api/runs/:runId/stop', authenticateWorkerSecret, async (req, res) => {
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

// 5. LIVE SCREENSHOT FRAME ENDPOINT (PROTECTED)
app.get('/api/runs/:runId/screenshot', authenticateWorkerSecret, async (req, res) => {
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

// INITIALIZE RUN (ONCE ON START)
async function initializeAndStartRun(runId) {
    const run = RunManager.getRun(runId);
    if (!run) return;

    try {
        // Step 1: Obtain isolated BrowserContext for User
        const context = await browserManager.getOrCreateContext(run.userId);
        run.browserContext = context;

        // Register Page Listeners for popups/new tabs (Module 5 & 10)
        await pageManager.setupContextPageListeners(context, run, realtimeServer);

        // Step 2: Create Main Target Page (Idempotent registration)
        RunManager.updateRunStatus(runId, RunState.OPENING_PAGE, `Opening target URL: ${run.targetUrl}`);
        const page = await context.newPage();
        await pageManager.registerPage(run, page, realtimeServer);

        // Navigate to Target URL
        await page.goto(run.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        RunManager.updateRunStatus(runId, RunState.RUNNING, 'Target page loaded. Starting continuous Playwright agent loop...');
        watchdog.startRunWatchdog(run, realtimeServer);

        await runAgentLoop(runId);

    } catch (err) {
        console.error(`[INITIALIZE RUN ERROR] Run ${runId}:`, err.message);
        RunManager.updateRunStatus(runId, RunState.FAILED, `Initialization error: ${err.message}`);
        realtimeServer.emitRunEvent(runId, 'RUN_FAILED', { error: err.message });
    }
}

// RESUME RUN LOOP (DOES NOT CREATE NEW PAGE OR NAVIGATE)
async function resumeRunLoop(runId) {
    const run = RunManager.getRun(runId);
    if (!run) return;

    if (!run.activePage || run.activePage.isClosed()) {
        console.warn(`[RESUME] Active page closed or missing for run ${runId}.`);
        RunManager.updateRunStatus(runId, RunState.FAILED, 'Active page closed or unavailable.');
        return;
    }

    await runAgentLoop(runId);
}

// CONTINUOUS WORKER AGENT LOOP (WITH RUN LOCK)
async function runAgentLoop(runId) {
    const run = RunManager.getRun(runId);
    if (!run) return;

    // Prevent duplicate agent loops running concurrently on the same page (Module 14)
    if (run.loopRunning) {
        console.log(`[AGENT LOOP] Loop already active for run ${runId}. Skipping duplicate start.`);
        return;
    }

    run.loopRunning = true;

    try {
        let stepCount = run.currentStep || 0;
        const maxSteps = 15;

        // CONTINUOUS AGENT LOOP (Inspect -> Decide -> Act -> Verify -> Reinspect)
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

            // Emit Screenshot Frame event to Viewer (Module 30 & 31)
            try {
                const screenshotBuf = await activePage.screenshot({ type: 'jpeg', quality: 50 });
                const base64Img = screenshotBuf.toString('base64');
                realtimeServer.emitRunEvent(runId, 'PAGE_SCREENSHOT', { image: `data:image/jpeg;base64,${base64Img}` });
            } catch (sErr) {}

            // 2. Ask AI Action Planner for ONE next step (Module 8)
            const actionPlan = await aiPlanner.planNextAction(run, pageState);

            // 3. Handle USER INPUT / OTP PAUSE (Module 12)
            if (actionPlan.action === 'ask_user' || actionPlan.action === 'wait_for_user') {
                RunManager.updateRunStatus(runId, RunState.WAITING_FOR_USER, actionPlan.statusText || 'User input required...');
                run.waitingReason = actionPlan.value || 'OTP or CAPTCHA required';
                realtimeServer.emitRunEvent(runId, 'WAITING_FOR_USER', { reason: run.waitingReason, statusText: run.lastAction });
                console.log(`[WORKER LOOP] Run ${runId} paused for user input: ${run.waitingReason}`);
                break;
            }

            // 4. Handle Task Completion (Module 26)
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

            // 5. Execute Real Playwright Action & Calculate Real Element Bounding Box (Module 4 & 7)
            RunManager.updateRunStatus(runId, RunState.VERIFYING, actionPlan.statusText || `Executing ${actionPlan.action}...`);

            const executionResult = await actionExecutor.executeAction(activePage, actionPlan, realtimeServer, runId);

            // 6. Action Verification (Module 6 & 25)
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

        if (stepCount >= maxSteps && run.status === RunState.RUNNING) {
            RunManager.updateRunStatus(runId, RunState.FAILED, 'Max steps reached without verified completion.');
            realtimeServer.emitRunEvent(runId, 'RUN_FAILED', { error: 'MAX_STEPS_REACHED' });
        }

    } catch (err) {
        console.error(`[WORKER AGENT LOOP CRITICAL ERROR] Run ${runId}:`, err.message);
        RunManager.updateRunStatus(runId, RunState.FAILED, `Execution error: ${err.message}`);
        realtimeServer.emitRunEvent(runId, 'RUN_FAILED', { error: err.message });
    } finally {
        run.loopRunning = false;
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
