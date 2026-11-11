const fs = require('fs');
const path = require('path');
const agentController = require('./core/agent-controller');
const workspaceManager = require('./core/workspace-manager');
const readline = require('readline');
const { spawnSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mockApiWithMultiFile = async (endpoint, method, payload) => {
    const userMsg = payload.messages && payload.messages.length > 0 ? payload.messages[payload.messages.length - 1].content : '';

    if (userMsg.includes('python')) {
        return {
            success: true,
            answer: `Here is the complete Python weather app:

\`\`\`python
# weather_service.py
def fetch_weather(city):
    return { "city": city, "temp": "28°C", "condition": "Sunny" }
\`\`\`

\`\`\`python
# app.py
from weather_service import fetch_weather

if __name__ == "__main__":
    data = fetch_weather("Chennai")
    print(f"City: {data['city']} | Temp: {data['temp']} | Status: {data['condition']}")
\`\`\`
`
        };
    } else if (userMsg.includes('express') || userMsg.includes('node')) {
        return {
            success: true,
            answer: `Here is the complete Express web application:

\`\`\`json
// package.json
{
  "name": "suriya-express-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
\`\`\`

\`\`\`javascript
// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', user: 'i suriya' });
});

app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(\`Server running on http://localhost:\${server.address().port}\`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        app.listen(3099, () => console.log('Server running on http://localhost:3099'));
    }
});
\`\`\`

\`\`\`html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head><title>Express App</title><link rel="stylesheet" href="style.css"></head>
<body>
    <h1>my name i suriya</h1>
    <script src="script.js"></script>
</body>
</html>
\`\`\`

\`\`\`css
/* public/style.css */
body { background: #0f172a; color: #fff; font-family: sans-serif; }
\`\`\`

\`\`\`javascript
// public/script.js
console.log('Client script active');
\`\`\`
`
        };
    } else {
        return {
            success: true,
            answer: `Here is the multi-file static website:

\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head><title>Static Site</title><link rel="stylesheet" href="style.css"></head>
<body><h1>Welcome</h1><script src="script.js"></script></body>
</html>
\`\`\`

\`\`\`css
/* style.css */
body { margin: 0; background: #f0f0f0; }
\`\`\`

\`\`\`javascript
// script.js
console.log("Static site active");
\`\`\`
`
        };
    }
};

async function runPromptGenTests() {
    console.log('=== DESKTOP PILOT ENRICHED PROMPT & MULTI-FILE CODE GENERATION TESTS ===\n');

    // TEST 1: Python Multi-File Project Prompt
    console.log('[TEST 1] Testing prompt: "Create a Python weather app with weather_service.py and app.py"...');
    delete process.env.TEST_MODE;
    await agentController.processGoal('Create a Python weather app with weather_service.py and app.py', [], mockApiWithMultiFile, rl);

    const activeDir1 = workspaceManager.getActiveProject();
    console.log(`[VERIFICATION 1] Active Directory: ${activeDir1}`);
    const pyFile1 = path.join(activeDir1, 'weather_service.py');
    const pyFile2 = path.join(activeDir1, 'app.py');

    const py1Exists = fs.existsSync(pyFile1);
    const py2Exists = fs.existsSync(pyFile2);
    console.log(`[FILE CHECK] weather_service.py: ${py1Exists}`);
    console.log(`[FILE CHECK] app.py: ${py2Exists}`);

    const pyCheck1 = spawnSync('python', ['-m', 'py_compile', pyFile2], { encoding: 'utf8' });
    console.log(`[SYNTAX CHECK] py_compile app.py: ${pyCheck1.status === 0 ? 'PASS' : 'FAIL'}`);

    const passed1 = py1Exists && py2Exists && pyCheck1.status === 0;
    console.log(`[TEST 1] Result: ${passed1 ? 'PASS' : 'FAIL'}\n`);

    // TEST 2: Node.js Express Multi-File Project Prompt
    console.log('[TEST 2] Testing prompt: "Create a Node.js express web app to display my name i suriya"...');
    await agentController.processGoal('Create a Node.js express web app to display my name i suriya', [], mockApiWithMultiFile, rl);

    const activeDir2 = workspaceManager.getActiveProject();
    console.log(`[VERIFICATION 2] Active Directory: ${activeDir2}`);
    const pkgPath = path.join(activeDir2, 'package.json');
    const serverPath = path.join(activeDir2, 'server.js');
    const htmlPath = path.join(activeDir2, 'public', 'index.html');
    const cssPath = path.join(activeDir2, 'public', 'style.css');
    const jsPath = path.join(activeDir2, 'public', 'script.js');

    const pkgExists = fs.existsSync(pkgPath);
    const serverExists = fs.existsSync(serverPath);
    const htmlExists = fs.existsSync(htmlPath);
    const cssExists = fs.existsSync(cssPath);
    const jsExists = fs.existsSync(jsPath);

    console.log(`[FILE CHECK] package.json: ${pkgExists}`);
    console.log(`[FILE CHECK] server.js: ${serverExists}`);
    console.log(`[FILE CHECK] public/index.html: ${htmlExists}`);
    console.log(`[FILE CHECK] public/style.css: ${cssExists}`);
    console.log(`[FILE CHECK] public/script.js: ${jsExists}`);

    const jsCheck = spawnSync('node', ['--check', serverPath], { encoding: 'utf8' });
    console.log(`[SYNTAX CHECK] node --check server.js: ${jsCheck.status === 0 ? 'PASS' : 'FAIL'}`);

    const passed2 = pkgExists && serverExists && htmlExists && cssExists && jsExists && jsCheck.status === 0;
    console.log(`[TEST 2] Result: ${passed2 ? 'PASS' : 'FAIL'}\n`);

    console.log('=== MULTI-FILE AI CODE GENERATION TESTS COMPLETE ===');
    rl.close();
    process.exit(0);
}

runPromptGenTests().catch(err => {
    console.error('Test Error:', err);
    rl.close();
    process.exit(1);
});
