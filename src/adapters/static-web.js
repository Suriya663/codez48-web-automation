/**
 * CODEZ48 STATIC WEB PROJECT ADAPTER
 * Handles HTML, CSS, JavaScript static websites.
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class StaticWebAdapter extends BaseProjectAdapter {
    constructor() {
        super('static-web');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        if (lowerGoal.includes('html') || lowerGoal.includes('css') || lowerGoal.includes('static website') || lowerGoal.includes('portfolio') || lowerGoal.includes('landing page')) {
            return true;
        }

        if (projectPath && fs.existsSync(projectPath)) {
            const hasIndexHtml = fs.existsSync(path.join(projectPath, 'index.html'));
            const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
            if (hasIndexHtml && !hasPackageJson) return true;
        }

        return false;
    }

    getRequiredTools() {
        return [];
    }

    detectDependencies(projectPath) {
        return { installed: [], missing: [] };
    }

    getInstallCommand(dependencies) {
        return null;
    }

    getBuildCommand(projectPath) {
        return null;
    }

    getRunCommand(projectPath) {
        // Static web projects use public preview URL, not a local Node server
        return null;
    }

    startBuiltInServer(projectPath) {
        const http = require('http');
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.json': 'application/json'
        };

        return new Promise((resolve) => {
            const tryPort = (port) => {
                const instance = http.createServer((req, res) => {
                    let reqPath = req.url.split('?')[0];
                    if (reqPath === '/') reqPath = '/index.html';

                    const filePath = path.join(projectPath, reqPath);
                    const ext = path.extname(filePath).toLowerCase();
                    const contentType = mimeTypes[ext] || 'text/plain';

                    // Check if requested file exists
                    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
                        const data = fs.readFileSync(filePath);
                        res.writeHead(200, { 'Content-Type': contentType });
                        res.end(data);
                        return;
                    }

                    // If root index.html requested but missing in root, check subdirectories
                    if (reqPath === '/index.html' || reqPath === '/') {
                        try {
                            const subdirs = fs.readdirSync(projectPath).filter(f => {
                                try { return fs.statSync(path.join(projectPath, f)).isDirectory(); } catch (_) { return false; }
                            });
                            for (const sub of subdirs) {
                                const subIdx = path.join(projectPath, sub, 'index.html');
                                if (fs.existsSync(subIdx)) {
                                    const data = fs.readFileSync(subIdx);
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end(data);
                                    return;
                                }
                            }
                        } catch (_) {}

                        // No index.html anywhere: Render rich dynamic Deliverables & Preview Hub
                        const hubHtml = this.generateDeliverablesHubHTML(projectPath, port);
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(hubHtml);
                        return;
                    }

                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                });

                instance.once('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        tryPort(port + 1);
                    } else {
                        resolve(null);
                    }
                });

                instance.listen(port, () => {
                    console.log(`\x1b[32m[STATIC SERVER] Built-in preview server active at http://localhost:${port}\x1b[0m`);
                    resolve({ server: instance, port, url: `http://localhost:${port}` });
                });
            };

            tryPort(3000);
        });
    }

    
    generateDeliverablesHubHTML(projectPath, port) {
        const path = require('path');
        const fs = require('fs');
        const projectName = path.basename(projectPath);
        let files = [];
        try {
            files = fs.readdirSync(projectPath).map(f => {
                const stat = fs.statSync(path.join(projectPath, f));
                return { name: f, isDir: stat.isDirectory(), size: stat.size };
            });
        } catch (_) {}

        let desktopPptx = [];
        try {
            const desktop = path.join(require('os').homedir(), 'OneDrive/Desktop');
            if (fs.existsSync(desktop)) {
                desktopPptx = fs.readdirSync(desktop)
                    .filter(f => f.endsWith('.pptx'))
                    .map(f => ({ name: f, size: fs.statSync(path.join(desktop, f)).size }));
            }
        } catch (_) {}

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Codez48 Pilot // Local Deliverables &amp; Preview Hub</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background: #0B132B; color: #E2E8F0; font-family: 'Segoe UI', system-ui, sans-serif; }
    .glass-card { background: rgba(22, 30, 49, 0.85); backdrop-filter: blur(16px); border: 1px solid rgba(75, 85, 120, 0.4); }
  </style>
</head>
<body class="min-h-screen p-6 md:p-12">
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="glass-card p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-amber-400">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <span class="bg-amber-400/20 text-amber-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/30">
            <i class="fa-solid fa-crown mr-1"></i> Profit-Oriented // Third-Tier Plan
          </span>
          <span class="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
            <i class="fa-solid fa-circle text-[8px] mr-1 text-emerald-400 animate-pulse"></i> Active Local Hub
          </span>
        </div>
        <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight">Codez48 Pilot Project &amp; Deliverables Hub</h1>
        <p class="text-xs text-slate-400 mt-1">Project Directory: <span class="font-mono text-cyan-400 font-bold">${projectName}</span> &bull; Serving at: <span class="font-mono text-emerald-400">http://localhost:${port}</span></p>
      </div>
      <div class="flex items-center gap-3">
        <a href="https://codez48.netlify.app" target="_blank" class="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition">
          <i class="fa-solid fa-globe mr-1.5"></i> Web App
        </a>
      </div>
    </div>

    <div class="glass-card p-8 rounded-3xl shadow-xl space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <i class="fa-solid fa-folder-open text-cyan-400"></i> Project Deliverables (${files.length} items)
        </h2>
        <span class="text-[10px] text-slate-400 font-mono">Local Path: ${projectPath}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        ${files.map(f => `
          <a href="/${f.name}" target="_blank" class="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-400/50 transition flex items-center justify-between group">
            <div class="flex items-center gap-3 truncate">
              <i class="fa-solid ${f.isDir ? 'fa-folder text-amber-400' : (f.name.endsWith('.html') ? 'fa-code text-cyan-400' : (f.name.endsWith('.css') ? 'fa-palette text-blue-400' : (f.name.endsWith('.js') ? 'fa-brands fa-js text-yellow-400' : 'fa-file-lines text-slate-400')))} text-lg"></i>
              <div class="truncate">
                <p class="text-xs font-bold text-white group-hover:text-cyan-300 truncate">${f.name}</p>
                <p class="text-[10px] text-slate-500 font-mono">${f.isDir ? 'Directory' : Math.round(f.size / 1024) + ' KB'}</p>
              </div>
            </div>
            <i class="fa-solid fa-arrow-up-right-from-square text-xs text-slate-600 group-hover:text-cyan-400 transition"></i>
          </a>
        `).join('')}
      </div>
    </div>

    ${desktopPptx.length > 0 ? `
    <div class="glass-card p-8 rounded-3xl shadow-xl space-y-4 border-l-4 border-amber-500">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <i class="fa-solid fa-file-powerpoint text-amber-400"></i> Generated Executive Presentations on Desktop
        </h2>
        <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Executive Luxury Tier</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${desktopPptx.map(p => `
          <div class="p-5 rounded-2xl bg-slate-800/80 border border-amber-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3.5 truncate">
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg font-black shrink-0 border border-amber-500/20">
                <i class="fa-solid fa-file-powerpoint"></i>
              </div>
              <div class="truncate">
                <p class="text-xs font-black text-white truncate">${p.name}</p>
                <p class="text-[10px] text-slate-400 font-mono">Size: ${Math.round(p.size / 1024)} KB &bull; Verified .pptx Deck</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
    }

    getEntryPoint(projectPath) {
        return 'index.html';
    }

    getOutputType() {
        return 'web';
    }
}

module.exports = new StaticWebAdapter();
