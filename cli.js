#!/usr/bin/env node

/**
 * CODEZ48 CLI - Official Client v1.1.0
 * Features: Restored Product Lifecycle & Complete Business Tools Suite
 */

const fs = require('fs');
const path = require('path');
const readline = require('node:readline/promises');
const os = require('os');

const BASE_URL = 'https://codez48.netlify.app/.netlify/functions';
const CONFIG_FILE = path.join(os.homedir(), '.codez48cfg');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
    if (useAuth) headers['x-api-key'] = key;

    try {
        const fetchOptions = {
            method,
            headers
        };
        if (body) fetchOptions.body = JSON.stringify(body);

        const response = await fetch(`${BASE_URL}/${endpoint}`, fetchOptions);
        const data = await response.json();

        if (!response.ok) {
            console.error(`\n[API ERROR] ${data.error || 'Request Failed'}`);
            return null;
        }
        return data;
    } catch (e) {
        console.error(`\n[NETWORK ERROR] ${e.message}`);
        return null;
    }
};

// --- AUTH COMMANDS ---

const login = async () => {
    console.log('\n--- Codez48 Secure Login ---');
    const sellerId = await rl.question('Seller ID (SLR-xxxxxx): ');
    const password = await rl.question('Password: ');

    if (!sellerId || !password) {
        console.log('[ERROR] Both fields are required.');
        return;
    }

    const data = await apiCall('cli-login', 'POST', { sellerId, password }, false);
    if (data && data.success === true && data.apiKey) {
        saveKey(data.apiKey);
        console.log(`\n[SUCCESS] Login successful!`);
        console.log(`Welcome back, ${data.brand}. Session Key stored locally.\n`);
    } else {
        console.log('\n[FAIL] Authentication failed.');
        console.log('Register at: https://codez48.netlify.app\n');
    }
};

// --- PRODUCT MANAGEMENT (RESTORED FULL FLOW) ---

const addProduct = async () => {
    console.log('\n--- Add New Product ---');
    const name = await rl.question('Product Name (Required): ');
    if (!name) return console.log('[ERROR] Name is required.');

    const priceInput = await rl.question('Selling Price (Required): ');
    const price = Number(priceInput);
    if (isNaN(price)) return console.log('[ERROR] Price must be a valid number.');

    const category = await rl.question('Category [General]: ') || 'General';

    const mrpInput = await rl.question(`MRP [₹${price}]: `);
    const mrp = mrpInput ? Number(mrpInput) : price;
    if (isNaN(mrp)) return console.log('[ERROR] MRP must be a valid number.');

    const stockInput = await rl.question('Stock Quantity [0]: ');
    const stock = stockInput ? Number(stockInput) : 0;
    if (isNaN(stock)) return console.log('[ERROR] Stock must be a valid number.');

    const description = await rl.question('Description: ') || '';
    const image = await rl.question('Image URL: ') || '';
    const type = await rl.question('Type (physical/digital/course) [physical]: ') || 'physical';

    const payload = { name, category, price, mrp, stock, description, image, type };
    const data = await apiCall('add-product', 'POST', payload);
    if (data && data.success) {
        console.log(`\n[SUCCESS] Product Created: ${data.productId}\n`);
    }
};

const listProducts = async () => {
    console.log('\n--- Your Registered Products ---');
    const data = await apiCall('cli-list-products');
    if (data && data.success && Array.isArray(data.products)) {
        if (data.products.length === 0) return console.log('No products found.\n');
        console.table(data.products.map(p => ({
            ID: p.id,
            Name: p.name,
            Price: `₹${p.price}`,
            Stock: p.stock,
            Category: p.category
        })));
        return data.products;
    }
};

const updateProduct = async () => {
    const products = await listProducts();
    if (!products) return;

    const productId = await rl.question('Enter the Product ID to update: ');
    const p = products.find(prod => prod.id === productId);
    if (!p) return console.log('[ERROR] Product not found in your catalog.');

    console.log('\n(Leave blank to keep existing value)');
    const name = await rl.question(`New Name [${p.name}]: `);
    const priceInput = await rl.question(`New Price [₹${p.price}]: `);
    const stockInput = await rl.question(`New Stock [${p.stock}]: `);
    const mrpInput = await rl.question(`New MRP [₹${p.mrp || p.price}]: `);
    const category = await rl.question(`New Category [${p.category}]: `);
    const description = await rl.question(`New Description: `);
    const image = await rl.question(`New Image URL: `);
    const type = await rl.question(`New Type [${p.type}]: `);

    const payload = { productId };
    if (name) payload.name = name;
    if (priceInput) payload.price = Number(priceInput);
    if (stockInput) payload.stock = Number(stockInput);
    if (mrpInput) payload.mrp = Number(mrpInput);
    if (category) payload.category = category;
    if (description) payload.description = description;
    if (image) payload.image = image;
    if (type) payload.type = type;

    if (Object.keys(payload).length === 1) {
        console.log('No changes provided.\n');
        return;
    }

    const data = await apiCall('cli-update-product', 'POST', payload);
    if (data && data.success) {
        console.log(`\n[SUCCESS] Product ${productId} updated successfully.\n`);
    }
};

const deleteProduct = async () => {
    const products = await listProducts();
    if (!products) return;

    const productId = await rl.question('Enter the Product ID to PERMANENTLY DELETE: ');
    const p = products.find(prod => prod.id === productId);
    if (!p) return console.log('[ERROR] Product not found in your catalog.');

    const confirm = await rl.question(`Confirm deletion of "${p.name}"? (y/n): `);

    if (confirm.toLowerCase() === 'y') {
        const data = await apiCall('cli-delete-product', 'POST', { productId });
        if (data && data.success) {
            console.log(`\n[SUCCESS] Product ${productId} removed from database.\n`);
        }
    } else {
        console.log('\nDeletion cancelled.\n');
    }
};

// --- TOOLS HUB ---

const handleAutomation = async (subCmd, targetId) => {
    if (subCmd === 'list') {
        const data = await apiCall('cli-automation-manager', 'POST', { action: 'LIST' });
        if (data && data.success && Array.isArray(data.automations)) {
            if (data.automations.length === 0) return console.log('No rules configured.\n');
            console.table(data.automations.map(a => ({
                ID: a.id,
                Name: a.name,
                Type: a.type,
                Status: a.status,
                'Last Result': a.lastResult || 'Idle'
            })));
        }
    } else if (subCmd === 'create') {
        console.log('\nAvailable Rules: 1. LOW_STOCK | 2. UPTIME_CHECK | 3. DAILY_REPORT');
        const choice = await rl.question('Select Type (1-3): ');
        let type = choice === '1' ? 'LOW_STOCK' : (choice === '2' ? 'UPTIME_CHECK' : 'DAILY_REPORT');
        let config = {};
        if (type === 'LOW_STOCK') {
            const threshold = await rl.question('Stock Threshold (default 5): ');
            config.threshold = threshold ? Number(threshold) : 5;
        }
        if (type === 'UPTIME_CHECK') {
            config.url = await rl.question('URL to Monitor (Required): ');
            if (!config.url) return console.log('[ERROR] URL required.');
        }
        const name = await rl.question('Name this rule: ');
        if (!name) return console.log('[ERROR] Name required.');

        const data = await apiCall('cli-automation-manager', 'POST', { action: 'CREATE', type, name, config });
        if (data && data.success) {
            console.log(`[SUCCESS] Automation rule deployed: ${data.automationId}\n`);
        }
    } else if (['run', 'logs', 'enable', 'disable'].includes(subCmd)) {
        const id = targetId || await rl.question('Enter Automation ID: ');
        if (!id) return console.log('[ERROR] ID required.');

        const action = (subCmd === 'enable' || subCmd === 'disable') ? 'TOGGLE' : subCmd.toUpperCase();
        const status = subCmd === 'enable' ? 'ACTIVE' : 'PAUSED';
        const data = await apiCall('cli-automation-manager', 'POST', { action, automationId: id, status });

        if (data && data.success) {
            if (subCmd === 'logs' && Array.isArray(data.logs)) {
                if (data.logs.length === 0) return console.log('No logs found.\n');
                console.table(data.logs.map(l => ({ Time: new Date(l.timestamp).toLocaleString(), Status: l.status, Details: l.details })));
            } else {
                console.log(`[SUCCESS] Action ${subCmd} completed.\n`);
            }
        }
    } else {
        console.log('\nUsage: codez48 tools automation [list, create, run, logs, enable, disable]');
    }
};

const handleTracker = async (subCmd) => {
    if (subCmd === 'list') {
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'tracker', action: 'LIST' });
        if (data && data.success && Array.isArray(data.sites)) {
            if (data.sites.length === 0) return console.log('No tracked sites found.\n');
            console.table(data.sites.map(s => ({ ID: s.id, URL: s.websiteUrl, Status: s.status })));
        }
    } else if (subCmd === 'add') {
        const url = await rl.question('Enter URL to track: ');
        if (!url) return console.log('[ERROR] URL required.');
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'tracker', action: 'ADD', url });
        if (data && data.success) {
            console.log(`[SUCCESS] Site registered: ${data.siteId}\n`);
        }
    } else if (subCmd === 'stats') {
        const id = await rl.question('Enter Site ID: ');
        if (!id) return console.log('[ERROR] ID required.');
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'tracker', action: 'STATS', siteId: id });
        if (data && data.success) {
            console.log(`\nEvents: ${data.eventCount} | Sessions: ${data.sessionCount}`);
            if (Array.isArray(data.recentEvents)) {
                console.log('Recent Activity:');
                console.table(data.recentEvents.map(e => ({ Event: e.eventType, Page: e.page, Time: e.timestamp })));
            }
        }
    } else {
        console.log('\nUsage: codez48 tools tracker [list, add, stats]');
    }
};

const handleNotifications = async (subCmd) => {
    if (subCmd === 'list') {
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'notifications', action: 'LIST' });
        if (data && data.success && Array.isArray(data.campaigns)) {
            if (data.campaigns.length === 0) return console.log('No campaigns found.\n');
            console.table(data.campaigns.map(c => ({ ID: c.id, Title: c.title, Sent: c.sentCount, Status: c.status })));
        }
    } else {
        console.log('\nUsage: codez48 tools notifications [list]');
    }
};

const handleMail = async (subCmd) => {
    if (subCmd === 'status') {
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'mail', action: 'STATUS' });
        if (data && data.success) {
            console.log(`\nMail Automation: ${data.settings?.mailAutomation ? 'ACTIVE' : 'DISABLED'}`);
            console.log(`Primary Recipient: ${data.settings?.notificationEmail || 'Not configured'}\n`);
        }
    } else {
        console.log('\nUsage: codez48 tools mail [status]');
    }
};

const handleWebhook = async (subCmd) => {
    if (subCmd === 'inbox') {
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'webhook', action: 'INBOX' });
        if (data && data.success && Array.isArray(data.messages)) {
            if (data.messages.length === 0) return console.log('Inbox is empty.\n');
            console.table(data.messages.map(m => ({ Received: new Date(m.receivedAt).toLocaleString(), Payload: JSON.stringify(m.data).substring(0, 50) })));
        }
    } else {
        console.log('\nUsage: codez48 tools webhook [inbox]');
    }
};

const handleAiStudio = async (subCmd) => {
    if (subCmd === 'list') {
        const data = await apiCall('cli-tools-manager', 'POST', { tool: 'ai-studio', action: 'LIST' });
        if (data && data.success && Array.isArray(data.workspaces)) {
            if (data.workspaces.length === 0) return console.log('No AI workspaces found.\n');
            console.table(data.workspaces.map(w => ({ ID: w.id, Name: w.name, Model: w.modelId })));
        }
    } else {
        console.log('\nUsage: codez48 tools ai-studio [list]');
    }
};

const logout = () => { clearKey(); console.log('\n[SUCCESS] Session cleared. Please login again for next use.\n'); };

const toolsHelp = () => {
    console.log('\n--- Codez48 Tools Hub ---');
    console.log('Usage: codez48 tools <tool-group> <command>');
    console.log('\nTool Groups:');
    console.log('  automation    - Manage monitors (Low Stock, Uptime, Reports)');
    console.log('  tracker       - Real-time website visitor activity');
    console.log('  mail          - Control automated SMTP alerts');
    console.log('  webhook       - View inbound data stream');
    console.log('  notifications - Push campaign history');
    console.log('  ai-studio     - Custom AI model workspaces');
    console.log('\nExample: codez48 tools automation run SLR-123\n');
};

// --- MAIN CLI ---

const main = async () => {
    const [cmd, group, sub, id] = process.argv.slice(2);

    if (cmd === 'tools') {
        switch (group) {
            case 'automation': await handleAutomation(sub, id); break;
            case 'tracker': await handleTracker(sub); break;
            case 'notifications': await handleNotifications(sub); break;
            case 'mail': await handleMail(sub); break;
            case 'webhook': await handleWebhook(sub); break;
            case 'ai-studio': await handleAiStudio(sub); break;
            default: toolsHelp(); break;
        }
    } else {
        switch (cmd) {
            case 'login': await login(); break;
            case 'add-product': await addProduct(); break;
            case 'list-products': await listProducts(); break;
            case 'update-product': await updateProduct(); break;
            case 'delete-product': await deleteProduct(); break;
            case 'logout': logout(); break;
            default:
                console.log('\nCODEZ48 CLI v1.1.0\nUsage: codez48 <command>\nCommands: login, logout, add-product, list-products, update-product, delete-product, tools\n');
        }
    }
    rl.close();
};

main();
