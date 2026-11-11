#!/usr/bin/env node

/**
 * CODEZ48 CLI - Official Standalone Client v1.3.0
 * Features: Complete Product Lifecycle, Business Tools, Interactive AI Chat & Realtime Rooms
 */

process.env.DOTENV_CONFIG_QUIET = 'true';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const readline = require('node:readline/promises');
const os = require('os');
const { exec } = require('child_process');
const WebSocket = require('ws');

const logger = require('./src/core/logger');
const agentController = require('./src/core/agent-controller');
const workspaceManager = require('./src/core/workspace-manager');
const pilotController = require('./src/pilot/pilot-controller');
const guiDriver = require('./src/pilot/drivers/gui-driver');
const screenCapture = require('./src/pilot/browser/screen-capture');

const BASE_URL = 'https://codez48.netlify.app/.netlify/functions';
const REALTIME_URL = 'https://codez48-web-automation-production.up.railway.app';
const CONFIG_FILE = path.join(os.homedir(), '.codez48cfg');

const safeQuestion = async (rlInterface, query) => {
    if (!rlInterface) return '';
    try {
        const res = rlInterface.question(query);
        if (res && typeof res.then === 'function') {
            return await res;
        }
        return await new Promise(resolve => rlInterface.question(query, resolve));
    } catch (_) {
        return '';
    }
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- STATE ---
let activeProjectPath = null;

// --- PATH HELPERS ---

const getDesktopPath = () => {
    const home = os.homedir();
    const onedrive = path.join(home, 'OneDrive', 'Desktop');
    if (fs.existsSync(onedrive)) return onedrive;
    return path.join(home, 'Desktop');
};

const getWorkspacePath = () => {
    const workspace = path.join(getDesktopPath(), 'Codez48 Preview');
    if (!fs.existsSync(workspace)) fs.mkdirSync(workspace, { recursive: true });
    return workspace;
};

// --- HELPER FUNCTIONS ---

const saveKey = (key) => fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey: key }));
const getKey = () => {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE)).apiKey; } catch (e) { return null; }
};
const clearKey = () => { if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE); };

const apiCall = async (endpoint, method = 'GET', body = null, useAuth = true) => {
    const key = getKey();
    if (useAuth && !key) {
        console.error('\n[ERROR] Not logged in. Please run: codez48 login');
        return null;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['x-api-key'] = key;

    try {
        const fetchOptions = { method, headers };
        if (body) fetchOptions.body = JSON.stringify(body);

        const response = await fetch(`${BASE_URL}/${endpoint}`, fetchOptions);
        const contentType = response.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            return { success: false, error: `Server returned non-JSON (${contentType}): ${text.substring(0, 80)}` };
        }

        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.error || 'Request Failed' };
        }
        return data;
    } catch (e) {
        console.error(`\n[NETWORK ERROR] ${e.message}`);
        return null;
    }
};

const secureQuestion = async (query) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(query);
    stdin.setRawMode(true);
    stdin.resume();

    return new Promise((resolve) => {
        let input = '';
        stdin.on('data', function handleChar(char) {
            char = char.toString();
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004':
                    stdin.setRawMode(false);
                    stdin.pause();
                    stdin.removeListener('data', handleChar);
                    stdout.write('\n');
                    resolve(input);
                    break;
                case '\u0003':
                    process.exit();
                    break;
                default:
                    if (char === '\u0008' || char === '\x7f') {
                        if (input.length > 0) {
                            input = input.slice(0, -1);
                            stdout.write('\b \b');
                        }
                    } else {
                        input += char;
                        stdout.write('*');
                    }
                    break;
            }
        });
    });
};

// --- AUTH COMMANDS ---

const login = async () => {
    console.log('\n--- Codez48 Secure Login ---');
    const sellerId = await rl.question('Seller ID (SLR-xxxxxx): ');
    const password = await secureQuestion('Password: ');

    if (!sellerId || !password) return console.log('[ERROR] Both fields are required.');

    const data = await apiCall('cli-login', 'POST', { sellerId, password }, false);
    if (data && data.success && data.apiKey) {
        saveKey(data.apiKey);
        console.log(`\n[SUCCESS] Login successful! Welcome back, ${data.brand}.\n`);
    } else {
        console.log('\n[FAIL] Authentication failed.\n');
    }
};

// --- PRODUCT MANAGEMENT ---

const listProducts = async () => {
    const data = await apiCall('cli-list-products');
    if (data?.success && Array.isArray(data.products)) {
        if (data.products.length === 0) return console.log('No products found.\n');
        console.table(data.products.map(p => ({ ID: p.id, Name: p.name, Price: `₹${p.price}`, Stock: p.stock })));
        return data.products;
    }
};

const addProduct = async () => {
    console.log('\n--- Add New Product ---');
    const name = await rl.question('Product Name: ');
    if (!name) return;
    const price = Number(await rl.question('Price: '));
    const data = await apiCall('add-product', 'POST', { name, price });
    if (data?.success) console.log(`[SUCCESS] Product Created: ${data.productId}\n`);
};

// --- LOCAL APP CONTROL ---

const handleOpen = async (target) => {
    if (!target) return console.log('Usage: codez48 open <app-name-or-url>');

    // 1. URL Handler (HTTP/HTTPS only for safety)
    if (target.startsWith('http://') || target.startsWith('https://')) {
        console.log(`Opening URL: ${target}`);
        const command = process.platform === 'win32'
            ? `start "" "${target.replace(/&/g, '^&')}"` // Escape ampersands for Windows shell
            : (process.platform === 'darwin' ? `open "${target}"` : `xdg-open "${target}"`);

        exec(command, (err) => {
            if (err) console.error(`[ERROR] Failed to open browser: ${err.message}`);
        });
        return;
    }

    // 1.5. Office Documents & Applications (Direct Native Spawning to prevent Office DDE error)
    const ext = path.extname(target).toLowerCase();
    if (['.pptx', '.ppt', '.potx', '.ppsx'].includes(ext)) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.openDocumentSafely(target, 'powerpoint');
    }
    if (['.docx', '.doc', '.dotx'].includes(ext)) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.openDocumentSafely(target, 'word');
    }
    if (['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.openDocumentSafely(target, 'excel');
    }

    const friendlyName = target.toLowerCase();
    if (['powerpoint', 'ppt', 'power point', 'presentation', 'microsoft powerpoint', 'ms powerpoint'].includes(friendlyName) || friendlyName.includes('powerpoint')) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.launchApplicationSafely('powerpoint');
    }
    if (['word', 'winword', 'microsoft word', 'ms word', 'document', 'doc'].includes(friendlyName) || (friendlyName.includes('word') && !friendlyName.includes('wordpress'))) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.launchApplicationSafely('word');
    }
    if (['excel', 'spreadsheet', 'sheet', 'microsoft excel', 'ms excel'].includes(friendlyName) || friendlyName.includes('excel')) {
        const officeLauncher = require('./src/pilot/drivers/office-launcher');
        return officeLauncher.launchApplicationSafely('excel');
    }

    // 2. Windows Modern App (UWP) & Alias Resolver
    const winApps = {
        'calculator': 'ms-calculator:',
        'calc': 'calc',
        'clock': 'ms-clock:',
        'alarms': 'ms-clock:',
        'whatsapp': 'whatsapp:',
        'vscode': 'code',
        'code': 'code',
        'notepad': 'notepad',
        'chrome': 'chrome',
        'edge': 'msedge',
        'store': 'ms-windows-store:',
        'settings': 'ms-settings:',
        'mail': 'mailto:',
        'calendar': 'outlookcal:',
        'maps': 'bingmaps:',
        'photos': 'ms-photos:',
        'camera': 'microsoft.windows.camera:'
    };

    const binary = winApps[friendlyName] || target;

    console.log(`Attempting to launch: ${target}...`);

    let command;
    if (process.platform === 'win32') {
        // Robust start command for Windows
        // Use double quotes for the title argument to avoid interpreting the target as a title
        if (binary.endsWith(':')) {
            command = `start "" "${binary}"`;
        } else if (binary.includes(' ') || binary.includes('\\') || binary.includes('/')) {
            command = `start "" "${binary}"`;
        } else {
            // For simple names like 'calc' or 'notepad', try direct start
            command = `start "" "${binary}"`;
        }
    } else {
        command = process.platform === 'darwin' ? `open -a "${binary}"` : binary;
    }

    exec(command, (err) => {
        if (err) {
            // Fallback for Windows: Try without quotes if it's a simple binary
            if (process.platform === 'win32' && !binary.endsWith(':')) {
                exec(`start ${binary}`, (err2) => {
                    if (err2) console.error(`[ERROR] Application not found or failed to launch: ${target}`);
                });
            } else {
                console.error(`[ERROR] Application not found or failed to launch: ${target}`);
            }
        }
    });
};

// --- LOCAL FILE FINDER ---

const searchFiles = (dir, query, results = []) => {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            try {
                const stats = fs.statSync(fullPath);
                if (file.toLowerCase().includes(query.toLowerCase())) {
                    results.push({ name: file, path: fullPath, isDirectory: stats.isDirectory() });
                }
                if (stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    searchFiles(fullPath, query, results);
                }
            } catch (e) {}
        }
    } catch (e) {}
    return results;
};

const handleFind = async (queryInput) => {
    const query = queryInput || await rl.question('\nSearch: ');
    if (!query) return;

    console.log('Searching...');
    const searchDirs = [getWorkspacePath(), getDesktopPath(), path.join(os.homedir(), 'Documents'), path.join(os.homedir(), 'Downloads')];
    let allResults = [];
    searchDirs.forEach(d => { if (fs.existsSync(d)) allResults = allResults.concat(searchFiles(d, query)); });

    if (allResults.length === 0) return console.log('No matches found.');

    allResults.forEach((r, i) => console.log(`${i + 1}. [${r.isDirectory ? 'DIR' : 'FILE'}] ${r.path}`));

    const choice = await rl.question('\nChoose result (number) or press Enter to skip: ');
    const selected = allResults[parseInt(choice) - 1];
    if (selected) {
        console.log('\n1. Open Location\n2. Open File/Folder\n3. Analyze\n4. Back');
        const action = await rl.question('Action: ');
        if (action === '1') {
            const dir = selected.isDirectory ? selected.path : path.dirname(selected.path);
            exec(`explorer "${dir}"`);
        } else if (action === '2') {
            exec(`start "" "${selected.path}"`);
        } else if (action === '3') {
            await analyzePath(selected.path);
        }
    }
};

const analyzePath = async (targetPath) => {
    console.log(`\nAnalyzing: ${targetPath}...`);
    const stats = fs.statSync(targetPath);
    const basename = path.basename(targetPath);

    const issues = [];
    if (basename.split('.').length > 2) issues.push('Misleading double extension detected.');
    if (basename.endsWith('.exe') && targetPath.includes('Downloads')) issues.push('Executable found in Downloads folder.');
    if (basename.endsWith('.ps1') || basename.endsWith('.bat')) issues.push('Script file requiring review.');

    if (issues.length > 0) {
        console.log('\x1b[33m[POTENTIALLY SUSPICIOUS]\x1b[0m');
        issues.forEach(issue => console.log(`- ${issue}`));
        console.log('\nOptions: 1. Open Location | 2. Remove (Recycle Bin) | 3. Ignore');
        const choice = await rl.question('Choice: ');
        if (choice === '2') {
            const confirm = await rl.question('Move to Recycle Bin? (y/n): ');
            if (confirm.toLowerCase() === 'y') {
                // Simplified "remove" for CLI - on Windows we can use a PowerShell command to move to recycle bin
                const command = `powershell.exe -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${targetPath}', 'OnlyErrorDialogs', 'SendToRecycleBin')"`;
                exec(command, (err) => {
                    if (err) console.error('[ERROR] Failed to remove file.');
                    else console.log('[SUCCESS] Moved to Recycle Bin.');
                });
            }
        }
    } else {
        console.log('\x1b[32m[NO OBVIOUS WARNING FOUND]\x1b[0m');
    }
};

// --- AI CHAT & CODING AGENT ---

const executeLocalActions = async (actions) => {
    for (const action of actions) {
        try {
            switch (action.type) {
                case 'create_file':
                case 'update_file':
                    const workspace = activeProjectPath || getWorkspacePath();
                    const fullPath = path.isAbsolute(action.path) ? action.path : path.join(workspace, action.path);

                    // Security: Ensure within Codez48 Preview or user-approved project
                    if (!fullPath.startsWith(getWorkspacePath()) && !fullPath.startsWith(getDesktopPath())) {
                        console.error(`[SECURITY BLOCKED] Unsafe file path: ${action.path}`);
                        continue;
                    }

                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

                    if (fs.existsSync(fullPath) && action.type === 'create_file') {
                        const overwrite = await rl.question(`File ${action.path} already exists. Overwrite? (y/n): `);
                        if (overwrite.toLowerCase() !== 'y') continue;
                    }

                    await fs.promises.writeFile(fullPath, action.content);
                    console.log(`\x1b[32m[FILE] ${action.type === 'create_file' ? 'Created' : 'Updated'}: ${fullPath}\x1b[0m`);
                    break;

                case 'create_folder':
                    const folderPath = path.join(activeProjectPath || getWorkspacePath(), action.path);
                    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                    console.log(`\x1b[32m[FOLDER] Created: ${folderPath}\x1b[0m`);
                    break;

                case 'open_vscode':
                    const projectDir = activeProjectPath || getWorkspacePath();
                    if (!activeProjectPath) {
                        console.log('\n[INFO] No active coding project found. Opening workspace root.');
                    }
                    console.log(`\x1b[34m[VSCODE] Opening: ${projectDir}\x1b[0m`);
                    exec(`code "${projectDir}"`, (err) => {
                        if (err) console.error('[ERROR] VS Code (code) command not found in PATH.');
                    });
                    break;

                case 'open_app':
                    handleOpen(action.name);
                    break;

                case 'open_url':
                    handleOpen(action.url);
                    break;

                case 'find_file':
                case 'find_folder':
                    await handleFind(action.query);
                    break;
            }
        } catch (e) {
            console.error(`[ACTION ERROR] ${action.type}: ${e.message}`);
        }
    }
};

const handleAiChat = async () => {
    console.log('\n--- Codez48 Autonomous Software Agent ---');
    console.log('Describe your project goal or ask for edits.');
    console.log('Press Ctrl+C to exit.\n');

    const conversationHistory = [];

    process.on('SIGINT', () => {
        console.log('\nCodez48 AI session ended.');
        process.exit(0);
    });

    while (true) {
        let userInput;
        try {
            userInput = await rl.question('\nYou: ');
        } catch (e) {
            if (e.code === 'ERR_USE_AFTER_CLOSE') break;
            throw e;
        }

        if (!userInput || !userInput.trim()) {
            if (!process.stdin.isTTY) break;
            continue;
        }

        await agentController.processGoal(userInput, conversationHistory, apiCall, rl);

        if (!process.stdin.isTTY) {
            break;
        }
    }
};

// --- REALTIME ROOMS (CHAT & SHARE) ---

const connectToRoom = async (roomCode, name, onMessage) => {
    console.log('Connecting to Codez48 Realtime Server...');

    // Pre-flight check
    try {
        const res = await fetch(`${REALTIME_URL}/health`).catch(() => null);
        if (res && res.ok) {
            const health = await res.json();
            console.log(`Server Status: ${health.status} | Uptime: ${Math.floor(health.uptime || 0)}s`);
        } else {
            console.warn('[WARN] Realtime server health check failed or timed out. Attempting socket connection...');
        }
    } catch (e) {
        console.warn(`[WARN] Could not reach health endpoint: ${e.message}`);
    }

    // Use explicit /ws path for maximum compatibility
    const wsUrl = `${REALTIME_URL.replace('https', 'wss').replace('http', 'ws')}/ws`;

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                ws.terminate();
                reject(new Error('Connection timed out. The server might be starting up or under heavy load.'));
            }
        }, 20000);

        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('Realtime link established.');
            ws.send(JSON.stringify({ type: 'JOIN_ROOM', room: roomCode, name }));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'JOINED') {
                    console.log(`\x1b[32m[ROOM ACTIVE] Code: ${roomCode} | Users: ${msg.userCount}\x1b[0m\n`);
                    resolve(ws);
                }
                onMessage(msg);
            } catch (e) {}
        });

        ws.on('error', (err) => {
            clearTimeout(timeout);
            console.error(`\n[CONNECTION ERROR] ${err.message}`);
            if (err.message.includes('404')) {
                console.error(`Root Cause: The server received the request but didn't find the WebSocket handler at this path.`);
                console.error(`Suggestion: Verify that the latest backend (commit b3deddb or later) is successfully deployed on Railway.`);
            } else if (err.message.includes('ECONNREFUSED')) {
                console.error(`Root Cause: Connection refused. The server might be down.`);
            }
            reject(err);
        });

        ws.on('close', (code, reason) => {
            if (code !== 1000 && code !== 1001) {
                console.log(`\n[DISCONNECTED] Session ended unexpectedly (Code: ${code}, Reason: ${reason || 'None'}).`);
            } else {
                console.log(`\n[DISCONNECTED] session ended.`);
            }
        });
    });
};

const handleChat = async () => {
    console.log('\n--- Codez48 Group Chat ---');
    console.log('1. Create New Chat\n2. Join Chat\n3. Exit');
    const choice = await rl.question('\nChoice: ');

    if (choice === '3') return;

    let roomCode = choice === '1' ? Math.floor(10000 + Math.random() * 90000).toString() : await rl.question('Enter Room Code: ');
    const name = await rl.question('Your Name: ') || 'User';

    try {
        const ws = await connectToRoom(roomCode, name, (msg) => {
            if (msg.type === 'CHAT_MESSAGE') {
                process.stdout.write(`\r\x1b[K\x1b[35m${msg.sender}:\x1b[0m ${msg.text}\nYou: `);
            } else if (msg.type === 'ROOM_EVENT') {
                console.log(`\n\x1b[90m[ROOM] ${msg.name} ${msg.action === 'USER_JOINED' ? 'joined' : 'left'}. Total: ${msg.userCount}\x1b[0m`);
                process.stdout.write('You: ');
            }
        });

        while (true) {
            const text = await rl.question('You: ');
            if (text.trim()) ws.send(JSON.stringify({ type: 'CHAT_MESSAGE', text }));
        }
    } catch (e) {
        console.log('Unable to connect to Codez48 Chat server.');
    }
};

const handleShare = async () => {
    console.log('\n--- Codez48 File Share ---');
    console.log('1. Create Room\n2. Join Room\n3. Exit');
    const choice = await rl.question('\nChoice: ');
    if (choice === '3') return;

    let roomCode = choice === '1' ? Math.floor(10000 + Math.random() * 90000).toString() : await rl.question('Enter Room Code: ');
    const name = await rl.question('Your Name: ') || 'User';

    try {
        const ws = await connectToRoom(roomCode, name, async (msg) => {
            if (msg.type === 'FILE_OFFER') {
                process.stdout.write(`\r\x1b[K\x1b[33m[OFFER] ${msg.sender} wants to share: ${msg.file.name} (${(msg.file.size/1024/1024).toFixed(2)} MB)\x1b[0m`);
                const accept = await rl.question('\nReceive this file? (y/n): ');
                if (accept.toLowerCase() === 'y') {
                    console.log(`Downloading ${msg.file.name}...`);
                    const res = await fetch(`${REALTIME_URL}/api/files/download/${msg.file.uploadId}?name=${encodeURIComponent(msg.file.name)}`);
                    if (res.ok) {
                        const destDir = path.join(os.homedir(), 'Downloads');
                        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

                        let dest = path.join(destDir, msg.file.name);

                        // Prevent overwrite
                        if (fs.existsSync(dest)) {
                            const ext = path.extname(msg.file.name);
                            const base = path.basename(msg.file.name, ext);
                            dest = path.join(destDir, `${base}_${Date.now()}${ext}`);
                        }

                        const fileStream = fs.createWriteStream(dest);
                        const buffer = await res.arrayBuffer();
                        fileStream.write(Buffer.from(buffer));
                        fileStream.end();
                        console.log(`\x1b[32m[SUCCESS] Saved to: ${dest}\x1b[0m\nYou: `);
                    } else {
                        console.log('\x1b[31m[ERROR] Download failed or expired.\x1b[0m\nYou: ');
                    }
                } else {
                    process.stdout.write('You: ');
                }
            }
        });

        while (true) {
            const input = await rl.question('You: ');
            if (input.toLowerCase() === 'share') {
                const filePathRaw = await rl.question('Enter file path: ');
                const filePath = filePathRaw.replace(/(^"|"$)/g, '').trim();

                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        console.log('[ERROR] Folders cannot be shared directly. Please ZIP the folder first.');
                        continue;
                    }

                    console.log(`Uploading ${path.basename(filePath)}...`);

                    const fileStream = fs.createReadStream(filePath);
                    const res = await fetch(`${REALTIME_URL}/api/files/upload?name=${encodeURIComponent(path.basename(filePath))}`, {
                        method: 'POST',
                        body: fileStream,
                        duplex: 'half'
                    });

                    const data = await res.json();
                    if (data.success) {
                        ws.send(JSON.stringify({ type: 'FILE_OFFER', file: { name: path.basename(filePath), size: stats.size, uploadId: data.uploadId } }));
                        console.log('\x1b[32m[SHARED] File offer sent to room.\x1b[0m');
                    }
                } else {
                    console.log('[ERROR] File not found.');
                }
            }
        }
    } catch (e) {
        console.log('Unable to connect to Codez48 Share server.');
    }
};

const validateEnvironment = async () => {
    if (logger.currentLevel >= logger.LEVELS.DEBUG) {
        logger.debug('[CLI ENVIRONMENT VALIDATION] Checking system components...');
        logger.debug(`- Node.js Version: ${process.version}`);
        try {
            const fg = guiDriver.getForegroundWindow();
            logger.debug(`- GUI Driver (Win32): ACTIVE (${fg?.title || 'Desktop'})`);
        } catch (e) {
            logger.debug(`- GUI Driver Warning: ${e.message}`);
        }
        try {
            const screenMeta = screenCapture.captureDesktopScreen();
            logger.debug(`- Screen Capture: ${screenMeta?.base64 ? 'READY' : 'FALLBACK_MODE'}`);
        } catch (e) {
            logger.debug(`- Screen Capture Warning: ${e.message}`);
        }
        logger.debug(`- System Ready.`);
    } else {
        logger.status('\x1b[36mInitializing system environment... System Ready.\x1b[0m\n');
    }
};

const Codez48ScrapEngine = require('./src/scrap/scrap-engine');

const handleScrap = async (args = []) => {
    console.log('\n--- Codez48 Scrap ---');

    let targetUrl = null;
    let allowOfficialScrape = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--allow-official-scrape') {
            allowOfficialScrape = true;
        } else if (!arg.startsWith('--') && !targetUrl) {
            targetUrl = arg;
        }
    }

    if (!targetUrl) {
        targetUrl = await rl.question('Enter website URL to scrap: ');
        if (targetUrl) targetUrl = targetUrl.trim();
    }

    if (!targetUrl) {
        console.error('[SCRAP ERROR] URL cannot be empty.');
        return;
    }

    const scrapEngine = new Codez48ScrapEngine();
    const scrapResult = await scrapEngine.runScrapWorkflow(targetUrl, { allowOfficial: allowOfficialScrape });

    if (scrapResult.success) {
        console.log('[SCRAP SUCCESS] Website source code & resources extracted successfully.');
    } else {
        console.error(`[SCRAP ERROR] Scraping process failed: ${scrapResult.failureReason || scrapResult.error}`);
    }
};

const cleanAiAnswerText = (text) => {
    if (!text || typeof text !== 'string') return text;
    let clean = text;
    if (/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i.test(clean)) {
        clean = clean.split(/===\s*CODEZ48\s*AI\s*RESPONSE\s*===/i)[1];
    }
    return clean
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
};

const handlePilot = async () => {
    logger.user('\n--- Codez48 Desktop Pilot ---');

    process.on('SIGINT', () => {
        logger.user('\nCodez48 Pilot session ended.');
        process.exit(0);
    });

    await validateEnvironment();

    // Check if goal argument was passed directly e.g. codez48 pilot "Open https://codez48.netlify.app/ ..."
    const directGoal = process.argv.slice(3).join(' ').trim();
    if (directGoal) {
        logger.status(`Executing Pilot goal: "${directGoal}"\n`);
        const result = await agentController.processGoal(directGoal, [], apiCall, rl);
        if (result && typeof result === 'object' && result.answer) {
            const cleaned = cleanAiAnswerText(result.answer);
            if (cleaned) logger.user(`\nAI: ${cleaned}\n`);
        }
        process.exit(0);
        return;
    }

    logger.user('Describe your desktop task or app automation goal.');
    logger.user('Press Ctrl+C to exit.\n');

    while (true) {
        let userInput;
        try {
            userInput = await rl.question('\nYou: ');
        } catch (e) {
            if (e.code === 'ERR_USE_AFTER_CLOSE') break;
            throw e;
        }

        if (!userInput || !userInput.trim()) {
            if (!process.stdin.isTTY) break; // exit if piped and no input
            continue;
        }

        // Clear require cache for core controllers so live updates on disk take effect immediately without restart
        try {
            delete require.cache[require.resolve('./src/core/agent-controller')];
            delete require.cache[require.resolve('./src/pilot/pilot-controller')];
            delete require.cache[require.resolve('./src/core/intent-classifier')];
            delete require.cache[require.resolve('./src/pilot/adapters/file-editor-adapter')];
            delete require.cache[require.resolve('./src/pilot/adapters/claude-automation-adapter')];
            delete require.cache[require.resolve('./src/pilot/browser/interactive-input-window')];
            delete require.cache[require.resolve('./src/pilot/mcp/mcp-skill-builder')];
            delete require.cache[require.resolve('./src/pilot/adapters/video-editing-adapter')];
            delete require.cache[require.resolve('./src/pilot/video/video-studio-server')];
        } catch (_) {}
        const freshAgentController = require('./src/core/agent-controller');

        const actionStartTime = Date.now();
        const result = await freshAgentController.processGoal(userInput, [], apiCall, rl);
        const actionDuration = Date.now() - actionStartTime;

        let summaryText = 'Goal completed successfully';
        if (result && typeof result === 'string') {
            summaryText = result;
        } else if (result && result.answer) {
            const cleaned = cleanAiAnswerText(result.answer);
            if (cleaned) {
                logger.user(`\nAI: ${cleaned}\n`);
                summaryText = cleaned;
            }
        } else if (result && result.message) {
            summaryText = result.message;
        }

        try {
            const activityTracker = require('./src/core/activity-tracker');
            activityTracker.logAction(userInput, actionDuration, summaryText, result?.success !== false ? 'SUCCESS' : 'FAILED');
        } catch (_) {}

        if (!process.stdin.isTTY) {
            break; // For piped input, we execute one goal and exit.
        }
    }
};

// --- MAIN ROUTER ---

const main = async () => {
    const [cmd, ...args] = process.argv.slice(2);

    if (cmd === 'pilot' && args.includes('--diagnose-runtime')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        console.log(`CODEZ48 PILOT DIAGNOSTIC RUNTIME IDENTITY:`);
        console.log(`Package Name: ${pkg.name} | Version: ${pkg.version}`);
        console.log(`Entry Realpath: ${fs.realpathSync(__filename)}`);
        console.log(`Engine Module: ${fs.realpathSync(path.join(__dirname, 'src/pilot/browser/browser-controller.js'))}`);
        console.log(`HUD Module: ${fs.realpathSync(path.join(__dirname, 'src/pilot/browser/browser-overlay-layer.js'))}`);
        console.log(`Node Version: ${process.version} | CWD: ${process.cwd()} | Platform: ${process.platform}`);
        console.log(`Configured API Key Present: ${getKey() ? 'TRUE [REDACTED]' : 'FALSE'}`);
        rl.close();
        return;
    }

    switch (cmd) {
        case 'login': await login(); break;
        case 'ai': await handleAiChat(); break;
        case 'copilot':
        case 'pilot': await handlePilot(); break;
        case 'open': await handleOpen(args[0]); break;
        case 'chat': await handleChat(); break;
        case 'share': await handleShare(); break;
        case 'key':
        case 'gemini-key':
        case 'apikey': {
            const geminiKeyVault = require('./src/core/gemini-key-vault');
            const keyArg = args[0];
            if (!keyArg) {
                const status = geminiKeyVault.getPoolStatus();
                console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
                console.log(`║                  CODEZ48 GEMINI API KEY POOL STATUS                           ║`);
                console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
                console.log(`  • Primary System Key:   \x1b[32m${status.primaryMasked}\x1b[0m`);
                console.log(`  • Preferred Model:      \x1b[33m${status.preferredModel}\x1b[0m`);
                console.log(`  • User Custom Keys:     \x1b[35m${status.userKeysCount} Key(s) Registered\x1b[0m`);
                status.userKeys.forEach((k, idx) => {
                    console.log(`    [${idx + 1}] ${k.label}: ${k.maskedKey} (${k.status})`);
                });
                console.log(`  • Active Pool Size:     \x1b[1m\x1b[32m${status.activePoolSize} Key(s) Ready for Load Balancing\x1b[0m\n`);
                console.log(`To add your personal Gemini API key: \x1b[36mnode cli.js key AIzaSy...\x1b[0m\n`);
                process.exit(0);
            }
            const res = geminiKeyVault.addUserKey(keyArg, args.slice(1).join(' ') || 'User Key');
            if (res.success) {
                console.log(`\n\x1b[32m✔ Successfully registered custom Gemini API key: ${res.maskedKey}\x1b[0m`);
                console.log(`  Active Key Pool Size: ${res.totalPoolSize} (Auto-rotates & fails over seamlessly)\n`);
            } else {
                console.log(`\n\x1b[31m✖ Failed to save API key: ${res.message}\x1b[0m\n`);
            }
            process.exit(0);
        }
        case 'find': await handleFind(args[0]); break;
        case 'list-products': await listProducts(); break;
        case 'add-product': await addProduct(); break;
        case 'scrap': await handleScrap(args); break;
        case 'supervoice':
            const supervoiceServer = require('./supervoice/server');
            const port = await supervoiceServer.start();
            console.log(`[SUPERVOICE] Codez48 Supervoice Studio is running at http://localhost:${port}`);
            exec(`start http://localhost:${port}`);
            return;
        case 'voices':
            const voiceProfileManager = require('./supervoice/voice-profile-manager');
            console.log(JSON.stringify(voiceProfileManager.listProfiles(), null, 2));
            break;
        case 'voice':
            if (args[0] === 'record') {
                const srv = require('./supervoice/server');
                const p = await srv.start();
                console.log(`[VOICE RECORD] Opening recorder at http://localhost:${p}`);
                exec(`start http://localhost:${p}`);
                return;
            } else if (args[0] === 'preview') {
                const eng = require('./supervoice/supervoice-engine');
                const r = eng.synthesize('வணக்கம், கோடஸ்48 சூப்பர்வாய்ஸ் பரிசோதனை.');
                console.log(`[VOICE PREVIEW] Generated preview WAV at: ${r.outputPath}`);
            }
            break;
        case 'speak':
            const speakText = args.join(' ') || 'வணக்கம் உலகம்';
            const eng = require('./supervoice/supervoice-engine');
            const r = eng.synthesize(speakText);
            console.log(`[SPEAK] Generated speech WAV at: ${r.outputPath} (Engine: ${r.engine})`);
            break;
        case 'details':
        case 'profile':
        case 'profiles': {
            const userDetailsManager = require('./supervoice/user-details-manager');
            await userDetailsManager.interactiveManageProfiles(rl);
            break;
        }
        case 'whatsapp-test, plan': {
            const wa = require('./supervoice/whatsapp-automation');
            await wa.testConnection();
            break;
        }
        case 'supervisor': {
            const supervoiceServer = require('./supervoice/server');
            const supervisorPort = await supervoiceServer.start();
            const supervisorUrl = `http://localhost:${supervisorPort}/supervisor.html`;
            console.log(`\x1b[36m[SUPERVISOR] Codez48 Supervisor is running at ${supervisorUrl}\x1b[0m`);
            console.log('\x1b[32m[SUPERVISOR] Voice-controlled WhatsApp automation ready. Opening browser...\x1b[0m');
            exec(`start ${supervisorUrl}`);
            return;
        }
        case 'whatsapp': {
            const wa = require('./supervoice/whatsapp-automation');
            const subCmd = (args[0] || '').toLowerCase();

            // Interactive Hub Menu when invoked without subcommand
            if (!subCmd) {
                const ask = (query) => safeQuestion(rl, query);
                console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
                console.log(`║                 CODEZ48 PILOT — WHATSAPP AUTOMATION HUB                       ║`);
                console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
                console.log(`  \x1b[33mSelect an action to proceed:\x1b[0m`);
                console.log(`  \x1b[32m[1]\x1b[0m Autonomous WhatsApp Screen Monitor & Auto-Replier (DEFAULT — Automatically checks screen for incoming messages from any user/number & generates AI replies)`);
                console.log(`  \x1b[32m[2]\x1b[0m Outbound WhatsApp Batch Campaign (Excel / Word / CSV / Mobile Numbers)`);
                console.log(`  \x1b[32m[3]\x1b[0m WhatsApp Voice AI Supervisor (Voice Note STT & Reply)`);
                console.log(`  \x1b[32m[4]\x1b[0m Manage User Business Profiles & Details (View/Add/Edit/Delete)`);
                console.log(`  \x1b[32m[5]\x1b[0m Test WhatsApp Desktop Full-Screen Connection & Foreground Lock`);
                console.log(`  \x1b[32m[6]\x1b[0m View WhatsApp Automation Commands & Plan Details\n`);

                const choice = (await ask('Select option (1-6) [Default 1]: ')).trim() || '1';

                if (choice === '1' || choice.toLowerCase() === 'default') {
                    await wa.startMonitoring({ continuous: true, apiCall, defaultMode: true });
                    break;
                } else if (choice === '2') {
                    const batchEngine = require('./supervoice/whatsapp-batch-engine');
                    const detailsCollector = require('./supervoice/details-collector');
                    const config = await detailsCollector.collectMissingDetails('', rl);
                    config.apiCall = apiCall;
                    if (config.mode === 'MONITOR') {
                        await wa.startMonitoring({ continuous: true, apiCall, defaultMode: true });
                    } else {
                        await batchEngine.executeBatchCampaign(config);
                    }
                    break;
                } else if (choice === '3') {
                    await wa.processIncomingVoiceMessage({
                        sender: 'Customer (+91 98765 43210)',
                        apiCall
                    });
                    break;
                } else if (choice === '4') {
                    const userDetailsManager = require('./supervoice/user-details-manager');
                    await userDetailsManager.interactiveManageProfiles(rl);
                    break;
                } else if (choice === '5') {
                    await wa.testConnection();
                    break;
                }
                // Choice 6 or invalid input proceeds to display help below
            }

            if (subCmd === 'default' || subCmd === 'start' || subCmd === 'monitor' || subCmd === 'auto' || subCmd === 'run') {
                await wa.startMonitoring({ continuous: true, apiCall, defaultMode: true });
                break;
            } else if (subCmd === 'test') {
                await wa.testConnection();
                break;
            } else if (subCmd === 'voice') {
                await wa.processIncomingVoiceMessage({
                    sender: args[1] || 'Customer (+91 98765 43210)'
                });
                break;
            } else if (subCmd === 'profiles' || subCmd === 'profile' || subCmd === 'details') {
                const userDetailsManager = require('./supervoice/user-details-manager');
                await userDetailsManager.interactiveManageProfiles(rl);
                break;
            } else if (subCmd === 'send' && args[1]) {
                const targetContact = args[1];
                const textMsg = args.slice(2).join(' ') || 'வணக்கம்! கோடஸ்48 பைலட் தானியங்கி தகவல்.';
                await wa.sendMessageToContact(targetContact, textMsg);
                break;
            } else if (subCmd === 'batch' || subCmd === 'campaign' || subCmd === 'broadcast') {
                const batchEngine = require('./supervoice/whatsapp-batch-engine');
                let filePath = null;
                let recipientsInput = null;
                let messageText = null;
                let contentMode = 'MANUAL';
                let businessDetails = {};

                if (args.includes('--help') || args.includes('-h')) {
                    console.log(`
\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗
║            CODEZ48 PILOT — WHATSAPP BATCH CAMPAIGN AUTOMATION                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m
  \x1b[33mUsage:\x1b[0m
    node cli.js whatsapp batch [options]

  \x1b[32mInteractive Mode:\x1b[0m
    node cli.js whatsapp batch
    (Launches the setup wizard for recipient source and business details)

  \x1b[32mDirect CLI Options:\x1b[0m
    --file, -f <path>       Path to Excel (.xlsx, .xls), Word (.docx, .doc), or CSV (.csv) contacts file
    --numbers, -n <list>    Comma-separated phone numbers or usernames (e.g. "919443210987, 919876543210")
    --msg, -m <text>        Fixed message text to deliver
    --ai                    Enable AI Copywriter (generates personalized intro & context)
    --business <name>       Brand/Business name (for AI mode)
    --what <description>    Offering/Product description (for AI mode)
    --link <url>            Website/Product URL to include in message
    --cta <text>            Custom call to action (for AI mode)

  \x1b[35mExamples:\x1b[0m
    node cli.js whatsapp batch --file "C:\\path\\to\\contacts.xlsx" --ai --business "MyBrand" --what "AI Tools" --link "https://mybrand.com"
    node cli.js whatsapp batch --file "C:\\path\\to\\contacts.docx" --ai
    node cli.js whatsapp batch --numbers "919443210987,919876543210" --msg "Hello from Codez48 Pilot!"
`);
                    break;
                }

                for (let i = 1; i < args.length; i++) {
                    const arg = args[i];
                    if (arg === '--file' || arg === '-f') {
                        filePath = args[++i];
                    } else if (arg === '--numbers' || arg === '-n') {
                        recipientsInput = args[++i];
                    } else if (arg === '--msg' || arg === '-m') {
                        messageText = args[++i];
                    } else if (arg === '--ai') {
                        contentMode = 'AI';
                    } else if (arg === '--business') {
                        businessDetails.businessName = args[++i];
                    } else if (arg === '--what') {
                        businessDetails.whatYouDo = args[++i];
                    } else if (arg === '--link') {
                        businessDetails.link = args[++i];
                    }
                }

                if (!filePath && !recipientsInput) {
                    const detailsCollector = require('./supervoice/details-collector');
                    const config = await detailsCollector.collectMissingDetails('', rl);
                    filePath = config.filePath;
                    recipientsInput = config.recipientsInput;
                    contentMode = config.contentMode;
                    messageText = config.messageText;
                    businessDetails = config.businessDetails || {};
                }

                await batchEngine.executeBatchCampaign({
                    filePath,
                    recipientsInput,
                    messageText,
                    contentMode,
                    businessDetails,
                    apiCall
                });
                break;
            } else {
                console.log(`
\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗
║                      CODEZ48 PILOT — WHATSAPP AUTOMATION                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m
  \x1b[33mUsage:\x1b[0m node cli.js whatsapp <subcommand>  (or codez48 whatsapp <subcommand>)

  \x1b[32mSubcommands:\x1b[0m
    \x1b[1mdefault\x1b[0m / \x1b[1mmonitor\x1b[0m   Autonomous screen monitor & auto-replier (DEFAULT — checks screen for incoming messages & replies)
    \x1b[1mbatch\x1b[0m                 Run automated sequential batch campaign (Excel / Word / CSV / Numbers)
    \x1b[1mtest\x1b[0m                  Test WhatsApp window detection, full-screen lock & focus
    \x1b[1mvoice\x1b[0m                 Test WhatsApp Voice AI Supervisor (Voice Note STT & Reply)
    \x1b[1mprofiles\x1b[0m              Manage user business profiles (nature of business, purpose, link, CTA)
    \x1b[1msend <contact> <msg>\x1b[0m  Send autonomous message to specific contact

  \x1b[35mPlan Requirements:\x1b[0m
    • Micro Plan (₹299/mo)            — 3 Free WhatsApp Automation instances included
    • Enterprise Plan (₹599/mo)       — Unlimited WhatsApp Text Campaigns & Autonomous Navigation
    • Profit-Oriented Plan (₹999/mo)  — Full Voice & Text AI Supervisor with Whisper STT & Cloned Voice
`);
                break;
            }
            break;
        }
        case 'sync':
        case 'pull': {
            const creditVault = require('./src/core/credit-vault');
            console.log('\x1b[36m[SYNC] Pulling latest credits and subscription plan from Firestore...\x1b[0m');
            const synced = await creditVault.syncWithRemote(true);
            if (synced) {
                console.log(`\x1b[32m✔ Successfully synced with cloud!\x1b[0m`);
                console.log(`  Current Balance: ${creditVault.getBalance()} Credits`);
                console.log(`  Active Plan:     ${creditVault.getPlan().name}\n`);
            } else {
                console.log(`\x1b[32m✔ Sync complete. Local vault is up-to-date!\x1b[0m`);
                console.log(`  Current Balance: ${creditVault.getBalance()} Credits`);
                console.log(`  Active Plan:     ${creditVault.getPlan().name}\n`);
            }
            break;
        }
        case 'assign-plan':
        case 'set-plan': {
            const creditVault = require('./src/core/credit-vault');
            let targetUid = (args[0] || '').trim();
            let targetPlan = (args[1] || '').trim();
            let targetEmail = (args[2] || '').trim();
            if (!targetUid) {
                targetUid = (await safeQuestion(rl, 'Enter Target Client User ID: ')).trim();
            }
            if (!targetPlan) {
                console.log('Available plans: [1] MICRO (Basic)  [2] ENTERPRISE (Intermediate)  [3] PROFIT_ORIENTED (Advanced)');
                const choice = (await safeQuestion(rl, 'Enter Plan (1, 2, or 3) [Default 1]: ')).trim() || '1';
                targetPlan = choice === '2' ? 'ENTERPRISE' : (choice === '3' ? 'PROFIT_ORIENTED' : 'MICRO');
            }
            await creditVault.adminAssignPlan(targetUid, targetPlan, targetEmail);
            break;
        }
        case 'plan':
        case 'subscription':
        case 'credits': {
            const creditVault = require('./src/core/credit-vault');
            await creditVault.syncWithRemote().catch(() => {});
            const couponManager = require('./src/core/coupon-manager');

            // 1. If an argument was provided and looks like a User ID, check that user in Firestore!
            const firstArg = (args[0] || '').trim();
            if (firstArg.startsWith('USR-') || firstArg.toLowerCase() === 'check') {
                const targetUid = firstArg.startsWith('USR-') ? firstArg : (args[1] || '').trim();
                if (targetUid) {
                    await creditVault.displayRemoteUserStatus(targetUid);
                    break;
                }
            }

            // 2. Ensure previous coupons are cleared so prices start fresh as requested
            creditVault.clearActiveCoupon();

            // 3. Display current plan overview with clean base prices
            creditVault.displayPlanStatus();

            // 4. Interactive plan purchase prompt with auto-browser opening and clickable link!
            console.log('\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗');
            console.log('║                     PURCHASE OR UPGRADE A MONTHLY PLAN                        ║');
            console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
            console.log('║  [1] Micro Plan (₹299/mo)          — 300 AI Credits | Essential PPT & Word     ║');
            console.log('║  [2] Enterprise Plan (₹599/mo)     — 700 AI Credits | Full WhatsApp Automation ║');
            console.log('║  [3] Profit-Oriented Plan (₹999/mo)— 1500 AI Credits | Voice AI Supervisor     ║');
            console.log('║  [4] Open Official Online Payment Portal in Web Browser                       ║');
            console.log('║  [5] Check Plan & Credits for Another User ID                                 ║');
            console.log('║  [q] Exit                                                                     ║');
            console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m');

            const choice = (await safeQuestion(rl, '\x1b[32mSelect Option (1-5 or press Enter to open Payment Portal): \x1b[0m')).trim();

            if (choice.toLowerCase() === 'q' || choice.toLowerCase() === 'exit') {
                break;
            }

            if (choice === '5') {
                const lookupUid = (await safeQuestion(rl, 'Enter User ID to check (e.g. USR-CDZ48-...): ')).trim();
                if (lookupUid) {
                    await creditVault.displayRemoteUserStatus(lookupUid);
                }
                break;
            }

            let selectedPlan = 'ENTERPRISE';
            if (choice === '1') selectedPlan = 'MICRO';
            else if (choice === '2') selectedPlan = 'ENTERPRISE';
            else if (choice === '3') selectedPlan = 'PROFIT_ORIENTED';

            const defaultUid = creditVault.getUserIdentifier();
            await creditVault.showPaymentPrompt(null, {
                plan: selectedPlan,
                uid: defaultUid,
                autoLaunch: true
            });
            break;
        }
        case 'payment':
        case 'pay':
        case 'checkout': {
            const creditVault = require('./src/core/credit-vault');

            // 1. Automatically retrieve user ID by default from secure vault (no prompt!)
            let targetUid = creditVault.getUserIdentifier();
            let selectedPlan = null;

            // Check if arguments specify plan or explicit UID
            for (const a of args) {
                const val = a.trim();
                if (['trial', '0', 'starter'].includes(val.toLowerCase())) {
                    selectedPlan = 'TRIAL';
                } else if (['micro', '1'].includes(val.toLowerCase())) {
                    selectedPlan = 'MICRO';
                } else if (['enterprise', '2'].includes(val.toLowerCase())) {
                    selectedPlan = 'ENTERPRISE';
                } else if (['profit', 'profit_oriented', 'profit-oriented', '3'].includes(val.toLowerCase())) {
                    selectedPlan = 'PROFIT_ORIENTED';
                } else if (val.startsWith('USR-')) {
                    targetUid = val;
                }
            }

            // 2. If no plan specified, prompt ONLY for the plan tier (1, 2, or 3)
            if (!selectedPlan) {
                console.log('\n\x1b[33mSelect Subscription Tier:\x1b[0m');
                console.log('  0. Starter Trial Pass (₹1 one-time) — 50 Credits [First-Time Users]');
                console.log('  1. Micro Plan (₹299/mo)             — 300 Credits');
                console.log('  2. Enterprise Plan (₹599/mo)        — 700 Credits [Recommended]');
                console.log('  3. Profit-Oriented Plan (₹999/mo)   — 1500 Credits');
                const pChoice = (await safeQuestion(rl, 'Choice (0, 1, 2, or 3) [Default 2]: ')).trim();
                if (pChoice === '0' || pChoice.toLowerCase() === 'trial') selectedPlan = 'TRIAL';
                else if (pChoice === '1') selectedPlan = 'MICRO';
                else if (pChoice === '3') selectedPlan = 'PROFIT_ORIENTED';
                else selectedPlan = 'ENTERPRISE';
            }

            // 3. Immediately launch browser checkout for this selection with target UID pre-filled!
            await creditVault.showPaymentPrompt(null, {
                plan: selectedPlan,
                uid: targetUid,
                autoLaunch: true
            });
            break;
        }
        case 'user':
        case 'check':
        case 'whois': {
            const creditVault = require('./src/core/credit-vault');
            let targetUid = (args[0] || '').trim();
            if (!targetUid) {
                targetUid = (await safeQuestion(rl, 'Enter User ID to check (e.g. USR-CDZ48-...): ')).trim();
            }
            if (!targetUid) {
                targetUid = creditVault.getUserIdentifier();
            }
            await creditVault.displayRemoteUserStatus(targetUid);
            break;
        }
        case 'email':
        case 'send-email':
        case 'send-credentials': {
            const emailDispatcher = require('./src/pilot/email/email-dispatcher');
            const creditVault = require('./src/core/credit-vault');

            let targetEmail = null;
            let targetUid = null;

            for (const a of args) {
                const val = a.trim();
                if (val.includes('@')) {
                    targetEmail = val;
                } else if (val.startsWith('USR-')) {
                    targetUid = val;
                }
            }

            if (!targetEmail) {
                targetEmail = (await safeQuestion(rl, 'Recipient Email Address [Default: rajnaga75556@gmail.com]: ')).trim() || 'rajnaga75556@gmail.com';
            }

            if (!targetUid) {
                targetUid = creditVault.getUserIdentifier();
            }

            const currentPlan = creditVault.getPlan();
            const currentBalance = creditVault.getBalance();
            console.log(`\n\x1b[36m[EMAIL] Sending User Credentials and Subscription Details to: ${targetEmail}...\x1b[0m`);
            await emailDispatcher.sendCredentialsEmail(
                targetEmail,
                targetUid,
                currentPlan.name,
                currentBalance,
                'CLI_TRIGGERED'
            );

            console.log(`\x1b[32m✔ Email successfully sent to ${targetEmail} with User ID: ${targetUid}!\x1b[0m\n`);
            setTimeout(() => process.exit(0), 200);
            return;
        }
        case 'coupon':
        case 'redeem':
        case 'voucher': {
            const couponManager = require('./src/core/coupon-manager');
            const creditVault = require('./src/core/credit-vault');
            const { formatTerminalBox } = require('./src/core/box-formatter');
            let code = (args[0] || '').trim();
            if (!code) {
                code = (await safeQuestion(rl, 'Enter Coupon Code: ')).trim();
            }
            if (!code) {
                console.log('\x1b[31m[ERROR] No coupon code entered.\x1b[0m');
                break;
            }
            console.log(`\x1b[36m[COUPON] Checking coupon "${code}" with Firebase...\x1b[0m`);
            const res = await couponManager.verifyAndRedeemCoupon(code);
            if (res.success) {
                if (res.type === 'DISCOUNT_PERCENT' || res.type === 'DISCOUNT_FLAT') {
                    // Automatically show updated order and launch payment checkout with coupon applied!
                    console.log(`\n\x1b[32m[ORDER] Coupon "${code}" applied to your order! Automatically opening payment checkout...\x1b[0m`);
                    await creditVault.showPaymentPrompt(null, res, true);
                } else {
                    const box = formatTerminalBox({
                        title: 'CODEZ48 — COUPON REDEEMED SUCCESSFULLY',
                        borderColor: '\x1b[32m',
                        titleColor: '\x1b[1m\x1b[32m',
                        lines: [
                            res.message,
                            { divider: true },
                            `Current Balance: ${res.newBalance} Credits`
                        ]
                    });
                    console.log('\n' + box + '\n');
                }
            } else {
                const box = formatTerminalBox({
                    title: 'CODEZ48 — COUPON ERROR',
                    borderColor: '\x1b[31m',
                    titleColor: '\x1b[1m\x1b[31m',
                    lines: [
                        `Coupon: "${code}"`,
                        `Status: ${res.message}`,
                        { divider: true },
                        'Need credits or a subscription plan?',
                        'Visit: https://codez48.netlify.app/tools/payment.html'
                    ]
                });
                console.log('\n' + box + '\n');
            }
            break;
        }
        case 'quiz':
        case 'questions':
        case 'game': {
            const quizPath = path.resolve(__dirname, 'public/interactive-quiz.html');
            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║          🎮 CODEZ48 10-QUESTION INTERACTIVE AI QUIZ STUDIO                    ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
            console.log(`  \x1b[32m✔ Interactive Quiz Studio:\x1b[0m ${quizPath}`);
            console.log(`  \x1b[33m• Features:\x1b[0m 10 Multiple-Choice Questions, Live Score Tracking & Confetti Animation for 10/10!\n`);
            const { exec } = require('child_process');
            exec(`start "" "${quizPath}"`);
            process.exit(0);
        }
        case 'ppt':
        case 'powerpoint':
        case 'presentation': {
            const goal = args.join(' ') || 'Executive Business Presentation';
            const powerPointAdapter = require('./src/pilot/adapters/powerpoint-adapter');
            await powerPointAdapter.createPresentationGoal(goal);
            process.exit(0);
        }
        case 'templates':
        case 'template':
        case 'gallery':
        case 'ppt-studio': {
            const pptCatalog = require('./src/pilot/templates/ppt-template-catalog');
            const wordCatalog = require('./src/pilot/templates/word-template-catalog');
            const sub = (args[0] || '').toLowerCase();

            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║      CODEZ48 PILOT 100+ PPT & 100+ WORD TEMPLATES CATALOG                     ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
            console.log(`  \x1b[32m✓ PowerPoint Presentation Templates Available:\x1b[0m  \x1b[1m${pptCatalog.templates.length} Templates\x1b[0m`);
            console.log(`  \x1b[32m✓ Word (.docx) Document Templates Available:    \x1b[0m  \x1b[1m${wordCatalog.templates.length} Templates\x1b[0m`);
            console.log(`  \x1b[35m✓ Total Professional Catalog Size:              \x1b[0m  \x1b[1m\x1b[33m${pptCatalog.templates.length + wordCatalog.templates.length} Templates\x1b[0m\n`);

            const galleryPath = [
                path.resolve(__dirname, 'src/pilot/templates/templates-gallery.html'),
                path.resolve(__dirname, 'public/templates-gallery.html')
            ].find(p => fs.existsSync(p));
            if (galleryPath && (sub === '' || sub === 'web' || sub === 'gallery' || sub === 'open' || sub === 'studio')) {
                console.log(`  \x1b[36m🚀 Launching 100+ Templates Interactive Web Studio in your browser...\x1b[0m`);
                exec(`start "" "${galleryPath}"`);
                console.log(`  \x1b[32m✔ Web Studio Active: ${galleryPath}\x1b[0m\n`);
            }

            if (sub === 'suggest' || sub === 'ai' || sub === 'recommend') {
                const query = args.slice(1).join(' ') || 'College engineering capstone project presentation in emerald green';
                const pptMatch = pptCatalog.suggestTemplateWithKeywords(query);
                const wordMatch = wordCatalog.suggestTemplateWithKeywords(query);

                console.log(`\x1b[35m[AI TEMPLATE & KEYWORD SUGGESTION ENGINE]: "${query}"\x1b[0m\n`);
                console.log(`\x1b[36m📊 Recommended PowerPoint Template:\x1b[0m`);
                console.log(`  • Template:     \x1b[1m\x1b[32m${pptMatch.templateName}\x1b[0m (${pptMatch.category})`);
                console.log(`  • Color Theme:  \x1b[33m${pptMatch.recommendedTheme}\x1b[0m`);
                console.log(`  • Slide Count:  ${pptMatch.defaultSlideCount} Slides (Aligned layouts)`);
                console.log(`  • AI Keywords:  ${pptMatch.suggestedKeywords.join(' • ')}`);
                console.log(`  • Description:  ${pptMatch.description}\n`);

                console.log(`\x1b[36m📄 Recommended Word Document Template:\x1b[0m`);
                console.log(`  • Template:     \x1b[1m\x1b[32m${wordMatch.templateName}\x1b[0m (${wordMatch.category})`);
                console.log(`  • AI Keywords:  ${wordMatch.suggestedKeywords.join(' • ')}`);
                console.log(`  • Key Sections: ${wordMatch.alignedSections.join(' | ')}\n`);
                process.exit(0);
            } else if (sub === 'word') {
                console.log(`\x1b[36m--- WORD DOCUMENT TEMPLATES (${wordCatalog.templates.length}) ---\x1b[0m`);
                wordCatalog.templates.forEach((t, i) => {
                    console.log(`  [${String(i + 1).padStart(3)}] ${t.name.padEnd(55)} | ${t.category}`);
                });
            } else if (sub === 'ppt') {
                console.log(`\x1b[36m--- POWERPOINT TEMPLATES (${pptCatalog.templates.length}) ---\x1b[0m`);
                pptCatalog.templates.forEach((t, i) => {
                    console.log(`  [${String(i + 1).padStart(3)}] ${t.name.padEnd(55)} | ${t.category}`);
                });
            } else {
                console.log(`  \x1b[33mCategories Covered:\x1b[0m`);
                console.log(`   1. Higher Education, Colleges & Universities (Accreditation, Capstone, Syllabi, etc.)`);
                console.log(`   2. Corporate Governance, Business RFPs, Annual Financials & Strategy`);
                console.log(`   3. Software Architecture, DevOps, Cybersecurity & Technical SRS`);
                console.log(`   4. Legal Contracts, NDAs, Master Service Agreements & HR Handbooks`);
                console.log(`   5. Medical Protocols, Clinical Trials & Scientific Research`);
                console.log(`   6. Academic Publishing, IEEE Manuscripts, HBS Case Studies & Whitepapers`);
                console.log(`\n  Run \x1b[36mnode cli.js templates ppt\x1b[0m or \x1b[36mnode cli.js templates word\x1b[0m to view full listings.\n`);
            }
            break;
        }
        case 'battery': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.getBatteryStatus();
            process.exit(0);
        }
        case 'wifi': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.controlWifi(args[0] || 'status');
            process.exit(0);
        }
        case 'volume':
        case 'sound': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.controlVolume(args[0] || 'up', args[1] ? parseInt(args[1], 10) : null);
            process.exit(0);
        }
        case 'brightness': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.controlBrightness(args[0] || 'get', args[1] ? parseInt(args[1], 10) : null);
            process.exit(0);
        }
        case 'update-apps':
        case 'update': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.updateApps();
            process.exit(0);
        }
        case 'hardware':
        case 'system-dashboard':
        case 'dashboard': {
            const laptopHardwareController = require('./src/pilot/hardware/laptop-hardware-controller');
            await laptopHardwareController.getSystemDashboard();
            process.exit(0);
        }
        case 'movie':
        case 'tickets':
        case 'book-tickets': {
            const movieAdapter = require('./src/pilot/adapters/movie-ticket-booking-adapter');
            const query = args.join(' ') || 'Amaran movie in Chennai for 4 seats in balcony';
            await movieAdapter.bookMovieTickets(query);
            process.exit(0);
        }
        case 'automate':
        case 'playwright':
        case 'web-automate': {
            const websiteAutomationEngine = require('./src/pilot/browser/website-automation-engine');
            const target = args.join(' ') || 'Google AI Studio';
            await websiteAutomationEngine.executeWebsiteAutomation(target, { rl });
            process.exit(0);
        }
        case 'scrape':
        case 'scraper':
        case 'scrape-code': {
            const websiteAutomationEngine = require('./src/pilot/browser/website-automation-engine');
            const target = args.join(' ') || 'Amazon';
            await websiteAutomationEngine.generateScraperCode(target, { rl });
            process.exit(0);
        }
        case 'mt5':
        case 'trading': {
            const mt5Adapter = require('./src/pilot/adapters/mt5-trading-adapter');
            const antiHackerShield = require('./src/core/anti-hacker-shield');
            const sub = (args[0] || '').toLowerCase();
            const symbol = (args[1] || 'EURUSD').toUpperCase();

            if (sub === 'status') {
                await mt5Adapter.ensureLoggedIn(rl);
                process.exit(0);
            } else if (sub === 'report' || sub === 'profit') {
                await mt5Adapter.getComprehensiveTradingReport(symbol);
                process.exit(0);
            } else if (sub === 'draw') {
                const tool = args[1] || 'trendline';
                await mt5Adapter.drawChartTool(tool);
                process.exit(0);
            } else if (sub === 'tf' || sub === 'timeframe') {
                const tf = args[1] || 'M15';
                await mt5Adapter.switchTimeframe(tf);
                process.exit(0);
            } else if (sub === 'existing' || sub === 'chart') {
                await mt5Adapter.analyzeExistingChart(symbol);
                process.exit(0);
            } else if (sub === 'news' || sub === 'toolbox') {
                await mt5Adapter.inspectToolboxAndDailyNews();
                process.exit(0);
            } else if (sub === 'analyze') {
                await mt5Adapter.analyze(symbol);
                process.exit(0);
            } else if (sub === 'trade' || sub === 'buy' || sub === 'sell') {
                const action = sub === 'sell' ? 'SELL' : 'BUY';
                const lotSize = args[2] ? parseFloat(args[2]) : 0.01;
                await mt5Adapter.executeTrade(symbol, action, lotSize);
                process.exit(0);
            } else if (sub === 'cursor-buy' || sub === 'cursor-sell' || sub === 'cursor-trade') {
                const action = (sub === 'cursor-sell' || (args[2] && args[2].toUpperCase() === 'SELL')) ? 'SELL' : 'BUY';
                const lotSize = args[2] && !isNaN(parseFloat(args[2])) ? parseFloat(args[2]) : (args[3] ? parseFloat(args[3]) : 0.01);
                await mt5Adapter.executeTradeWithPhysicalCursor(symbol, action, lotSize);
                process.exit(0);
            } else if (sub === 'auto' || sub === 'monitor' || sub === 'loop') {
                const maxHours = args[2] ? parseFloat(args[2]) : 10;
                const intervalSec = args[3] ? parseInt(args[3]) : 15;
                await mt5Adapter.startPatientAutonomousTradingLoop({
                    symbol,
                    maxHours,
                    checkIntervalSec: intervalSec,
                    targetConfidence: 85,
                    lotSize: 0.01
                });
                process.exit(0);
            } else if (sub === 'protect') {
                await mt5Adapter.enforceZeroLoss();
                process.exit(0);
            } else if (sub === 'shield' || sub === 'security') {
                antiHackerShield.renderShieldBanner();
                process.exit(0);
            } else if (sub === 'nav' || sub === 'gui') {
                const panel = args.slice(1).join(' ') || 'Market Watch';
                await mt5Adapter.navigateGuiPanel(panel);
                process.exit(0);
            } else if (sub === 'toolbar') {
                const btn = args.slice(1).join(' ') || 'candlestick';
                await mt5Adapter.clickToolbarPhysical(btn);
                process.exit(0);
            } else if (sub === 'teach' || sub === 'coach' || sub === 'demo' || sub === 'explain') {
                await mt5Adapter.teachAndDemonstrateTrade(symbol);
                process.exit(0);
            } else {
                console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
                console.log(`║           CODEZ48 METATRADER 5 (MT5) AUTONOMOUS TRADING HUB                   ║`);
                console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
                console.log(`  \x1b[33mUsage:\x1b[0m`);
                console.log(`    node cli.js mt5 status                     - Check account login, server & balance`);
                console.log(`    node cli.js mt5 report [symbol]            - Account profit, floating PnL, open positions & briefing`);
                console.log(`    node cli.js mt5 teach [symbol]             - Interactive AI Coach live demo & trade explanation`);
                console.log(`    node cli.js mt5 existing [symbol]          - Analyze existing chart (where it bought/sold, profit)`);
                console.log(`    node cli.js mt5 draw [tool]                - Draw charting tools (vertical, horizontal, trendline, channel, fib)`);
                console.log(`    node cli.js mt5 toolbar [button]           - Physical cursor click on top toolbar button`);
                console.log(`    node cli.js mt5 tf [M1|M5|M15|H1|D1]       - Switch chart timeframe`);
                console.log(`    node cli.js mt5 news                       - Daily Toolbox news, mailbox, and economic calendar check`);
                console.log(`    node cli.js mt5 analyze [symbol]           - Multi-strategy analysis (EMA, RSI, MACD, BB)`);
                console.log(`    node cli.js mt5 buy [symbol] [lots]        - Execute BUY with Zero-Loss Risk Engine`);
                console.log(`    node cli.js mt5 sell [symbol] [lots]       - Execute SELL with Zero-Loss Risk Engine`);
                console.log(`    node cli.js mt5 cursor-buy [sym] [lots]    - Physical mouse gliding & native click trade`);
                console.log(`    node cli.js mt5 cursor-sell [sym] [lots]   - Physical mouse gliding & native click trade`);
                console.log(`    node cli.js mt5 auto [symbol] [hours]      - Patient Autonomous Vision Loop (1-10 Hours)`);
                console.log(`    node cli.js mt5 shield                     - Anti-Hacker Army Shield & Security Status`);
                console.log(`    node cli.js mt5 protect                    - Shift profitable positions to Breakeven`);
                console.log(`    node cli.js mt5 nav [panel]                - Navigate GUI (Market Watch, Toolbox, F9)\n`);
                process.exit(0);
            }
            break;
        }
        case 'edit-file': {
            const targetPath = args[0];
            const search = args[1];
            const replace = args[2] !== undefined ? args[2] : '';
            if (!targetPath || search === undefined) {
                console.log(`Usage: node cli.js edit-file <filePath> <searchText> <replaceText>`);
                break;
            }
            const fileEditor = require('./src/pilot/adapters/file-editor-adapter');
            await fileEditor.editFileInPlace(targetPath, search, replace);
            break;
        }
        case 'family':
        case 'analytics':
        case 'activity': {
            const activityTracker = require('./src/core/activity-tracker');
            const profile = activityTracker.getFiveDayProfile();
            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║           CODEZ48 PILOT — FAMILY & USER ACTIVITY 5-DAY PROFILER               ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
            console.log(`  \x1b[35mLead Operations & Profile Editor:\x1b[0m \x1b[1m\x1b[33m${profile.leadEditor}\x1b[0m`);
            console.log(`  \x1b[36mReport Window:\x1b[0m                    \x1b[32m${profile.reportWindow}\x1b[0m\n`);
            console.log(`  \x1b[1m\x1b[37mExecutive Summary:\x1b[0m`);
            console.log(`   • Total Unique CLI IDs Created: \x1b[1m\x1b[36m${profile.summary.totalUniqueIdsCreated} IDs\x1b[0m`);
            console.log(`   • Active Users in Last 5 Days:  \x1b[1m\x1b[32m${profile.summary.activeUsersLast5Days} Users\x1b[0m`);
            console.log(`   • Total Actions Tracked:        \x1b[1m\x1b[33m${profile.summary.totalActionsLast5Days} Actions\x1b[0m`);
            console.log(`   • Average AI Response Time:     \x1b[1m\x1b[35m${profile.summary.averageResponseTimeMs} ms\x1b[0m\n`);
            console.log(`  \x1b[1m\x1b[37m5-Day Activity & Latency Breakdown:\x1b[0m`);
            profile.dailyTrend.forEach(day => {
                const bar = '█'.repeat(Math.min(Math.max(day.actions, 1), 30));
                console.log(`   [${day.label}] ${bar} ${day.actions} actions | ${day.activeUsers} users | ${day.avgResponseTimeMs}ms avg`);
            });
            console.log(`\n  \x1b[1m\x1b[37mRecent User Telemetry Logs:\x1b[0m`);
            profile.recentActivityLogs.slice(0, 8).forEach((l, i) => {
                console.log(`   ${i + 1}. [${l.timestampFormatted}] \x1b[36m${l.command}\x1b[0m (${l.responseTimeMs}ms)`);
                console.log(`      AI: ${l.aiOutputSummary.substring(0, 75)}...`);
            });
            console.log(`\n  \x1b[32m✔ Web view available at: https://codez48.netlify.app/tools/family.html\x1b[0m\n`);
            break;
        }
        case 'claude': {
            const claudeAdapter = require('./src/pilot/adapters/claude-automation-adapter');
            const promptText = args.join(' ').trim();
            await claudeAdapter.executeClaudeTask(promptText, { rl, promptUser: !promptText });
            break;
        }
        case 'mcp':
        case 'skill': {
            const mcpBuilder = require('./src/pilot/mcp/mcp-skill-builder');
            const userPrompt = args.join(' ').trim();
            if (userPrompt) {
                await mcpBuilder.generateAutonomousMcp(userPrompt, { rl });
            } else {
                await mcpBuilder.runInteractiveWizard(rl);
            }
            break;
        }
        case 'video':
        case 'video-edit':
        case 'video-editor': {
            const videoAdapter = require('./src/pilot/adapters/video-editing-adapter');
            const promptText = args.join(' ').trim();
            await videoAdapter.handleVideoEditingTask(promptText || 'I need to edit a video', { rl });
            break;
        }
        case 'remote':
        case 'bridge': {
            const remoteBridge = require('./src/pilot/remote/remote-device-bridge');
            const cliRemote = require('./src/pilot/remote/cli-remote-controller');
            const sub = (args[0] || '').toLowerCase();

            if (sub === 'zip' || sub === 'send-code' || sub === 'code') {
                const zipPath = cliRemote.zipProject(args[1]);
                if (args.includes('--bluetooth') || args.includes('-b')) {
                    cliRemote.sendViaBluetooth(zipPath);
                } else {
                    const sInfo = await cliRemote.startCliServer();
                    console.log(`\n\x1b[32m✔ ZIP Archive Ready: ${path.basename(zipPath)}\x1b[0m`);
                    console.log(`👉 On remote device (PC or Phone): visit http://${sInfo.hostIp}:${sInfo.port}/download/${encodeURIComponent(path.basename(zipPath))}`);
                    console.log(`\x1b[33m🔑 Pairing PIN: [ ${sInfo.pin} ]\x1b[0m\nPress Ctrl+C to close.`);
                    await new Promise(() => {});
                }
            } else if (sub === 'send' || sub === 'transfer' || sub === 'ppt') {
                const targetPath = args[1] || path.join(getDesktopPath(), 'ppt_for_full_stack_class_prese.pptx');
                const isBluetooth = args.includes('--bluetooth') || args.includes('-b');
                if (isBluetooth) {
                    cliRemote.sendViaBluetooth(targetPath);
                } else {
                    const sInfo = await cliRemote.startCliServer();
                    console.log(`\n\x1b[32m✔ Direct File Download: http://${sInfo.hostIp}:${sInfo.port}/download/${encodeURIComponent(path.basename(targetPath))}\x1b[0m`);
                    console.log(`\x1b[33m🔑 Safe Mode PIN: [ ${sInfo.pin} ]\x1b[0m`);
                    console.log(`\nPress Ctrl+C to close the bridge.\n`);
                    await new Promise(() => {}); // keep running
                }
            } else if (sub === 'files' || sub === 'list') {
                const files = remoteBridge.listDeliverables();
                console.log(`\n\x1b[36m--- GENERATED DELIVERABLES ON HOST (${files.length}) ---\x1b[0m`);
                files.forEach((f, i) => {
                    console.log(`  [${String(i + 1).padStart(2)}] ${f.filename.padEnd(50)} | ${f.sizeFormatted.padEnd(10)} | ${f.mtimeFormatted}`);
                });
                console.log('');
            } else if (sub === 'web') {
                const res = await remoteBridge.start();
                console.log(`\n\x1b[32m✔ Official HTTPS Website: ${res.websiteUrl}\x1b[0m`);
                console.log(`\x1b[33m🔑 Safe Mode PIN: [ ${res.pin} ]\x1b[0m`);
                console.log(`\nPress Ctrl+C to stop the bridge server.\n`);
                await new Promise(() => {});
            } else {
                // Default: Direct CLI Interactive Controller (No HTML needed)
                await cliRemote.showInteractiveCli(rl);
            }
            break;
        }
        case 'logout': logout(); break;
        default:
            console.log('\nCODEZ48 CLI v1.3.5\nUsage: codez48 <command>\nCommands: login, ai, pilot, open, find, chat, share, list-products, add-product, logout, scrap, supervoice, voices, speak, whatsapp, supervisor, payment, coupon, plan, details, profile, templates, mt5, edit-file, family, claude, mcp, remote, bridge, battery, wifi, volume, brightness, hardware\n');
    }
    rl.close();
    process.exit(0);
};

main().catch(err => { if (err.name !== 'Error [ERR_PROCESS_TERMINATED]') console.error(err); process.exit(1); });
