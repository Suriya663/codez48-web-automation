class DynamicAppGenerator {
    generateExpressApp(projectName = 'dynamic_express_app', port = 3000) {
        return [
            {
                name: 'server.js',
                content: `const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || ${port};

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let items = [
    { id: 1, name: 'Smart Fan Controller', status: 'ACTIVE', temp: '24.5°C' },
    { id: 2, name: 'Exhaust Sensor V2', status: 'ACTIVE', temp: '28.1°C' }
];

app.get('/api/items', (req, res) => {
    res.json({ success: true, count: items.length, data: items });
});

app.post('/api/items', (req, res) => {
    const newItem = {
        id: items.length + 1,
        name: req.body.name || \`Device_\${Date.now()}\`,
        status: req.body.status || 'ACTIVE',
        temp: req.body.temp || '25.0°C'
    };
    items.push(newItem);
    res.status(201).json({ success: true, message: 'Item added successfully', data: newItem });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(\`[DYNAMIC EXPRESS APP] Live at http://localhost:\${PORT}\`);
    });
}

module.exports = app;`
            },
            {
                name: 'public/index.html',
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Express Telemetry Portal</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="card">
        <h1>🚀 Codez48 Dynamic Telemetry Portal</h1>
        <p>Live Express REST API & Dynamic Frontend</p>
        <div class="counter-display">
            Active Devices: <span id="counter-val">0</span>
        </div>
        <div id="device-list" class="device-list">Loading live devices...</div>
        <button id="interact-btn" class="btn">Add Dynamic Device</button>
        <div id="status-msg" class="status">Connected to REST API</div>
    </div>
    <script src="app.js"></script>
</body>
</html>`
            },
            {
                name: 'public/style.css',
                content: `body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
.card { background: #1e293b; padding: 35px; border-radius: 16px; border: 1px solid #334155; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 420px; }
h1 { color: #38bdf8; font-size: 22px; margin-bottom: 8px; }
p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
.counter-display { background: #0f172a; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 18px; color: #38bdf8; margin-bottom: 15px; }
.device-list { text-align: left; background: #0f172a; padding: 12px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin-bottom: 20px; max-height: 140px; overflow-y: auto; }
.device-item { padding: 6px 0; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; }
.btn { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; transition: background 0.2s; width: 100%; }
.btn:hover { background: #0369a1; }
.status { margin-top: 15px; font-size: 13px; color: #10b981; }`
            },
            {
                name: 'public/app.js',
                content: `const counterEl = document.getElementById('counter-val');
const listEl = document.getElementById('device-list');
const btnEl = document.getElementById('interact-btn');
const statusEl = document.getElementById('status-msg');

async function fetchDevices() {
    try {
        const res = await fetch('/api/items');
        const data = await res.json();
        if (data.success) {
            counterEl.textContent = data.count;
            listEl.innerHTML = data.data.map(d => \`<div class="device-item"><span>\${d.name}</span><span style="color:#38bdf8">\${d.temp}</span></div>\`).join('');
            statusEl.textContent = \`Live REST API connected (\${data.count} items)\`;
        }
    } catch (e) {
        statusEl.textContent = 'API connection error';
    }
}

btnEl.addEventListener('click', async () => {
    try {
        const nextId = parseInt(counterEl.textContent, 10) + 1;
        const res = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: \`Smart Node \${nextId}\`, temp: \`\${(24 + nextId).toFixed(1)}°C\` })
        });
        const data = await res.json();
        if (data.success) {
            await fetchDevices();
            console.log('[API LOG] Device added via REST POST request');
        }
    } catch (e) {
        statusEl.textContent = 'POST request failed';
    }
});

fetchDevices();`
            },
            {
                name: 'package.json',
                content: JSON.stringify({
                    name: projectName.toLowerCase(),
                    version: '1.0.0',
                    description: 'Dynamic Express REST API generated and verified by Codez48 Pilot',
                    main: 'server.js',
                    scripts: {
                        start: 'node server.js'
                    },
                    dependencies: {
                        express: '^4.19.2',
                        cors: '^2.8.5'
                    }
                }, null, 2)
            }
        ];
    }
}

module.exports = new DynamicAppGenerator();
