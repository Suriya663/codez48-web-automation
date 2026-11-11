/**
 * CODEZ48 NODE.JS / EXPRESS / REACT / VITE / NEXT.JS / TYPESCRIPT ADAPTER
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class NodeProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('node');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        const keywords = ['node', 'express', 'react', 'vite', 'next', 'typescript', 'npm', 'socket.io', 'rest api'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            if (fs.existsSync(path.join(projectPath, 'package.json'))) return true;
        }

        return false;
    }

    getRequiredTools() {
        return ['node', 'npm'];
    }

    detectDependencies(projectPath) {
        if (!projectPath || !fs.existsSync(projectPath)) {
            return { installed: [], missing: [] };
        }

        const missing = new Set();
        const installed = new Set();
        const nodeModules = path.join(projectPath, 'node_modules');

        // 1. Read package.json declared dependencies
        const pkgPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                const declared = { ...pkg.dependencies, ...pkg.devDependencies };
                for (const dep of Object.keys(declared)) {
                    if (fs.existsSync(path.join(nodeModules, dep))) {
                        installed.add(dep);
                    } else {
                        missing.add(dep);
                    }
                }
            } catch (e) {}
        }

        // 2. Scan source files for require() or import statements
        const sourceFiles = ['server.js', 'app.js', 'index.js', 'src/index.js', 'src/main.js', 'src/App.js', 'src/App.jsx', 'src/App.tsx'];
        const coreNodeModules = ['fs', 'path', 'http', 'https', 'os', 'child_process', 'url', 'events', 'stream', 'util', 'crypto', 'readline'];

        for (const file of sourceFiles) {
            const filePath = path.join(projectPath, file);
            if (fs.existsSync(filePath)) {
                try {
                    const code = fs.readFileSync(filePath, 'utf8');
                    // Regex for require('mod') or import ... from 'mod'
                    const reqMatches = code.matchAll(/(?:require\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"])/g);
                    for (const match of reqMatches) {
                        const mod = match[1] || match[2];
                        if (mod && !mod.startsWith('.') && !mod.startsWith('/') && !coreNodeModules.includes(mod)) {
                            const rootModName = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
                            if (fs.existsSync(path.join(nodeModules, rootModName))) {
                                installed.add(rootModName);
                            } else {
                                missing.add(rootModName);
                            }
                        }
                    }
                } catch (e) {}
            }
        }

        return { installed: Array.from(installed), missing: Array.from(missing) };
    }

    isValidNpmPackageName(pkgName) {
        if (!pkgName || typeof pkgName !== 'string') return false;
        const name = pkgName.trim();
        if (name.length === 0) return false;

        // Reject paths, drive letters, slashes, relative dots, or file extensions
        if (name.includes(':\\') || name.includes(':/') || name.startsWith('.') || name.startsWith('/') || name.startsWith('\\')) return false;
        if (/\.(js|json|html|css|ts|py|java|cpp|exe|ps1|bat)$/i.test(name)) return false;

        // Valid npm package name regex (supports @scope/pkg or pkg)
        const npmRegex = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-*~][a-z0-9-*._~]*$/i;
        return npmRegex.test(name);
    }

    getInstallCommand(dependencies) {
        if (!dependencies || !Array.isArray(dependencies) || dependencies.length === 0) {
            return 'npm install';
        }
        const validPackages = dependencies.filter(d => this.isValidNpmPackageName(d));
        if (validPackages.length === 0) return 'npm install';
        return `npm install ${validPackages.join(' ')}`;
    }

    getBuildCommand(projectPath) {
        if (!projectPath || !fs.existsSync(path.join(projectPath, 'package.json'))) return null;
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
            if (pkg.scripts && pkg.scripts.build) {
                return 'npm run build';
            }
        } catch (e) {}
        return null;
    }

    getRunCommand(projectPath) {
        if (projectPath && fs.existsSync(path.join(projectPath, 'package.json'))) {
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
                if (pkg.scripts) {
                    if (pkg.scripts.start) return 'npm start';
                    if (pkg.scripts.dev) return 'npm run dev';
                }
            } catch (e) {}
        }

        const entry = this.getEntryPoint(projectPath);
        return `node ${entry}`;
    }

    getEntryPoint(projectPath) {
        if (projectPath && fs.existsSync(path.join(projectPath, 'package.json'))) {
            try {
                const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
                if (pkg.main && fs.existsSync(path.join(projectPath, pkg.main))) return pkg.main;
            } catch (e) {}
        }

        const candidates = ['server.js', 'app.js', 'index.js', 'src/main.jsx', 'src/main.tsx', 'src/index.js'];
        for (const cand of candidates) {
            if (projectPath && fs.existsSync(path.join(projectPath, cand))) return cand;
        }
        return 'server.js';
    }

    getOutputType() {
        return 'web';
    }
}

module.exports = new NodeProjectAdapter();
