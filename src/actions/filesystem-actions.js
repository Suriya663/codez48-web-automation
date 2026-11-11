/**
 * CODEZ48 FILESYSTEM ACTIONS
 * Safe file/folder operations for the local software agent.
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../core/workspace-manager');

class FilesystemActions {
    createProjectFolder(folderName) {
        const fullPath = workspaceManager.setActiveProject(folderName);
        console.log(`\x1b[32m✓ Project Workspace: ${fullPath}\x1b[0m`);
        return { success: true, path: fullPath };
    }

    createFile(relativePath, content) {
        const fullPath = workspaceManager.resolvePath(relativePath);

        if (!workspaceManager.isPathSafe(fullPath)) {
            console.error(`\x1b[31m[SECURITY BLOCKED] Path outside allowed workspace: ${relativePath}\x1b[0m`);
            return { success: false, error: 'Path traversal blocked' };
        }

        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        const displayRel = path.relative(workspaceManager.getActiveProject(), fullPath).replace(/\\/g, '/');
        console.log(`\x1b[32m  ✓ ${displayRel}\x1b[0m`);
        return { success: true, path: fullPath, displayRel };
    }

    updateFile(relativePath, content) {
        const fullPath = workspaceManager.resolvePath(relativePath);
        if (fs.existsSync(fullPath)) {
            const backupPath = fullPath + '.bak';
            try {
                fs.copyFileSync(fullPath, backupPath);
            } catch (e) {}
        }
        return this.createFile(relativePath, content);
    }

    readFile(relativePath) {
        const fullPath = workspaceManager.resolvePath(relativePath);

        if (!workspaceManager.isPathSafe(fullPath) || !fs.existsSync(fullPath)) {
            return { success: false, error: 'File not found or access denied' };
        }

        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            return { success: true, content, path: fullPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    checkFileExists(relativePath) {
        const fullPath = workspaceManager.resolvePath(relativePath);
        const exists = fs.existsSync(fullPath);
        return { exists, path: fullPath };
    }

    listProjectFiles(subDir = '') {
        const root = workspaceManager.resolvePath(subDir);
        const results = [];

        const walk = (dir) => {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__' || item === 'build' || item === 'dist') {
                    continue;
                }
                const fullPath = path.join(dir, item);
                const rel = path.relative(workspaceManager.getActiveProject(), fullPath);
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isDirectory()) {
                        walk(fullPath);
                    } else {
                        results.push(rel.replace(/\\/g, '/'));
                    }
                } catch (e) {}
            }
        };

        walk(root);
        return results;
    }
}

module.exports = new FilesystemActions();
