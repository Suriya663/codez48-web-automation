#!/usr/bin/env node

/**
 * CODEZ48 CLI - Official Client v1.1.0
 * Deployed Base: https://codez48.netlify.app
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline/promise');
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
        process.exit(1);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (useAuth) headers['x-api-key'] = key;

    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server Request Failed');
        return data;
    } catch (e) {
        console.error(`\n[API ERROR] ${e.message}`);
        return null;
    }
};

// --- AUTH COMMANDS ---

const login = async () => {
    console.log('\n--- Codez48 Secure Login ---');
    const sellerId = await rl.question('Seller ID (SLR-xxxxxx): ');
    const password = await rl.question('Password: ');

    const data = await apiCall('cli-login', 'POST', { sellerId, password }, false);
    if (data && data.success) {
        saveKey(data.apiKey);
        console.log(`\n[SUCCESS] Login successful!`);
        console.log(`Welcome back, ${data.brand}. Your CLI is now authenticated.\n`);
    } else {
        console.log('\n[FAIL] Incorrect credentials.');
        console.log('Register at: https://codez48.netlify.app\n');
    }
};

// --- PRODUCT COMMANDS ---

const addProduct = async () => {
    console.log('\n--- Add New Product ---');
    const name = await rl.question('Product Name (Required): ');
    if (!name) return console.log('[ERROR] Name is required.');

    const priceInput = await rl.question('Selling Price (INR, Required): ');
    const price = parseInt(priceInput);
    if (isNaN(price)) return console.log('[ERROR] Price must be a number.');

    const category = await rl.question('Category (Optional, default: General): ') || 'General';
    const stock = parseInt(await rl.question('Initial Stock (Optional, default: 0): ')) || 0;
    const mrp = parseInt(await rl.question(`MRP (Optional, default: ₹${price}): `)) || price;
    const description = await rl.question('Description (Optional): ');
    const image = await rl.question('Image URL (Optional): ');
    const type = await rl.question('Type (physical/digital/course, default: physical): ') || 'physical';

    const payload = { name, category, price, mrp, stock, description, image, type };
    const data = await apiCall('add-product', 'POST', payload);

    if (data && data.success) {
        console.log(`\n[SUCCESS] Product created successfully!`);
        console.log(`Product ID: ${data.productId}\n`);
    }
};

const listProducts = async () => {
    console.log('\n--- Your Registered Products ---');
    const data = await apiCall('cli-list-products');
    if (data && data.success) {
        if (data.count === 0) return console.log('No products found.\n');

        console.table(data.products.map(p => ({
            ID: p.id,
            Name: p.name,
            Price: `₹${p.price}`,
            Stock: p.stock,
            Category: p.category
        })));
        console.log(`Total: ${data.count} items.\n`);
        return data.products;
    }
};

const updateProduct = async () => {
    const products = await listProducts();
    if (!products) return;

    const productId = await rl.question('Enter the Product ID to update: ');
    const product = products.find(p => p.id === productId);
    if (!product) return console.log('[ERROR] Product not found in your list.');

    console.log('\nLeave blank to keep existing value:');
    const name = await rl.question(`New Name [${product.name}]: `) || undefined;
    const price = await rl.question(`New Price [₹${product.price}]: `) || undefined;
    const stock = await rl.question(`New Stock [${product.stock}]: `) || undefined;
    const category = await rl.question(`New Category [${product.category}]: `) || undefined;

    const payload = { productId };
    if (name) payload.name = name;
    if (price) payload.price = parseInt(price);
    if (stock) payload.stock = parseInt(stock);
    if (category) payload.category = category;

    const data = await apiCall('cli-update-product', 'POST', payload);
    if (data && data.success) {
        console.log(`\n[SUCCESS] Product updated instantly.\n`);
    }
};

const deleteProduct = async () => {
    const products = await listProducts();
    if (!products) return;

    const productId = await rl.question('Enter the Product ID to PERMANENTLY DELETE: ');
    const confirm = await rl.question(`Are you sure you want to delete ${productId}? (y/n): `);

    if (confirm.toLowerCase() === 'y') {
        const data = await apiCall('cli-delete-product', 'POST', { productId });
        if (data && data.success) {
            console.log(`\n[SUCCESS] Product removed from database.\n`);
        }
    } else {
        console.log('\nDeletion cancelled.\n');
    }
};

// --- AUTOMATION COMMANDS ---

const listAutomations = async () => {
    console.log('\n--- Your Active Business Rules ---');
    const data = await apiCall('cli-automation-manager', 'POST', { action: 'LIST' });
    if (data && data.success) {
        if (data.automations.length === 0) return console.log('No automations configured.\n');

        console.table(data.automations.map(a => ({
            ID: a.id,
            Name: a.name,
            Type: a.type,
            Status: a.status,
            'Last Run': a.lastRunAt ? new Date(a.lastRunAt).toLocaleString() : 'Never'
        })));
        return data.automations;
    }
};

const createAutomation = async () => {
    console.log('\n--- Create New Automation Rule ---');
    console.log('1. Low Stock Sentinel (LOW_STOCK)');
    console.log('2. Uptime Guardian (UPTIME_CHECK)');
    console.log('3. Daily Business Report (DAILY_REPORT)');

    const choice = await rl.question('\nSelect automation type (1-3): ');
    let type = '', config = {};

    if (choice === '1') {
        type = 'LOW_STOCK';
        config.threshold = parseInt(await rl.question('Stock Threshold (default 5): ')) || 5;
    } else if (choice === '2') {
        type = 'UPTIME_CHECK';
        config.url = await rl.question('Website URL to monitor: ');
        if (!config.url) return console.log('[ERROR] URL required.');
    } else if (choice === '3') {
        type = 'DAILY_REPORT';
    } else {
        return console.log('[ERROR] Invalid choice.');
    }

    const name = await rl.question('Give this rule a name: ');
    if (!name) return console.log('[ERROR] Name required.');

    const data = await apiCall('cli-automation-manager', 'POST', { action: 'CREATE', type, name, config });
    if (data && data.success) {
        console.log(`\n[SUCCESS] Automation created: ${data.automationId}\n`);
    }
};

const runAutomation = async (id) => {
    let autoId = id;
    if (!autoId) {
        const autos = await listAutomations();
        if (!autos) return;
        autoId = await rl.question('Enter Automation ID to run: ');
    }

    console.log(`\n[SYS] Executing ${autoId}...`);
    const data = await apiCall('cli-automation-manager', 'POST', { action: 'RUN', automationId: autoId });
    if (data && data.success) {
        console.log(`\n[RESULT] ${data.result}\n`);
    }
};

const toggleAutomation = async (id, status) => {
    let autoId = id;
    if (!autoId) {
        const autos = await listAutomations();
        if (!autos) return;
        autoId = await rl.question(`Enter Automation ID to ${status.toLowerCase()}: `);
    }

    const data = await apiCall('cli-automation-manager', 'POST', { action: 'TOGGLE', automationId: autoId, status });
    if (data && data.success) {
        console.log(`\n[SUCCESS] Automation ${status.toLowerCase()}d successfully.\n`);
    }
};

const viewLogs = async (id) => {
    let autoId = id;
    if (!autoId) {
        const autos = await listAutomations();
        if (!autos) return;
        autoId = await rl.question('Enter Automation ID to view logs: ');
    }

    const data = await apiCall('cli-automation-manager', 'POST', { action: 'LOGS', automationId: autoId });
    if (data && data.success) {
        if (data.logs.length === 0) return console.log('No logs found for this automation.\n');
        console.table(data.logs.map(l => ({
            Time: new Date(l.timestamp).toLocaleString(),
            Status: l.status,
            Details: l.details
        })));
    }
};

const logout = () => {
    clearKey();
    console.log('\n[SUCCESS] Logged out. Local API key removed.\n');
};

// --- MAIN CLI ENTRY POINT ---

const main = async () => {
    const args = process.argv.slice(2);
    const cmd = args[0];
    const subCmd = args[1];
    const targetId = args[2];

    if (cmd === 'automation') {
        switch (subCmd) {
            case 'list': await listAutomations(); break;
            case 'create': await createAutomation(); break;
            case 'run': await runAutomation(targetId); break;
            case 'enable': await toggleAutomation(targetId, 'ACTIVE'); break;
            case 'disable': await toggleAutomation(targetId, 'PAUSED'); break;
            case 'logs': await viewLogs(targetId); break;
            default:
                console.log('\nUsage: codez48 automation <command> [id]');
                console.log('Commands: list, create, run, enable, disable, logs\n');
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
                console.log('\nUsage: codez48 <command>');
                console.log('Core Commands: login, add-product, list-products, update-product, delete-product, logout');
                console.log('Automation: codez48 automation\n');
        }
    }
    rl.close();
};

main();
