/**
 * CODEZ48 WORKSPACE MANAGER
 * Single source of truth for Desktop/Workspace paths, canonical project folder resolution,
 * path normalization (preventing double-nesting), and active session state.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class WorkspaceManager {
    constructor() {
        this.activeProjectPath = null;
        this.activeProjectType = null;
        this.activeProcessInfo = null; // { process, pid, port, type, startTime }
        this.activePort = null;
        this.activeOutput = '';
    }

    getDesktopPath() {
        const home = os.homedir();
        const onedrive = path.join(home, 'OneDrive', 'Desktop');
        if (fs.existsSync(onedrive)) return onedrive;
        return path.join(home, 'Desktop');
    }

    getWorkspacePath() {
        const workspace = path.join(this.getDesktopPath(), 'Codez48 Preview');
        if (!fs.existsSync(workspace)) fs.mkdirSync(workspace, { recursive: true });
        return workspace;
    }

    setActiveProject(projectFolder, projectType = 'unknown') {
        if (!projectFolder) return this.getActiveProject();

        let resolved;
        if (path.isAbsolute(projectFolder)) {
            resolved = path.normalize(projectFolder);
        } else {
            const folderName = path.basename(projectFolder);
            resolved = path.normalize(path.join(this.getWorkspacePath(), folderName));
        }

        if (!fs.existsSync(resolved)) {
            fs.mkdirSync(resolved, { recursive: true });
        }

        this.activeProjectPath = resolved;
        this.activeProjectType = projectType;
        console.log(`\x1b[33m[CANONICAL WORKSPACE] ${this.activeProjectPath}\x1b[0m`);
        return this.activeProjectPath;
    }

    getActiveProject() {
        return this.activeProjectPath || this.getWorkspacePath();
    }

    resolvePath(relativePath) {
        if (!relativePath) return this.getActiveProject();

        if (path.isAbsolute(relativePath)) {
            return path.normalize(relativePath);
        }

        let cleanRel = relativePath.replace(/\\/g, '/');

        // Strip leading slashes
        cleanRel = cleanRel.replace(/^\/+/, '');

        // Generic Fix for Double-Nesting:
        // If activeProjectPath is set (e.g. .../Codez48 Preview/express-website)
        // and cleanRel starts with "express-website/", strip the redundant folder prefix!
        if (this.activeProjectPath) {
            const currentFolderName = path.basename(this.activeProjectPath).toLowerCase();
            const lowerRel = cleanRel.toLowerCase();

            if (lowerRel === currentFolderName) {
                cleanRel = '';
            } else if (lowerRel.startsWith(currentFolderName + '/')) {
                cleanRel = cleanRel.substring(currentFolderName.length + 1);
            }
        }

        return path.normalize(path.join(this.getActiveProject(), cleanRel));
    }

    isPathSafe(targetPath) {
        if (!targetPath) return false;
        const normalized = path.isAbsolute(targetPath)
            ? path.normalize(targetPath)
            : this.resolvePath(targetPath);

        const workspace = path.normalize(this.getWorkspacePath());
        const desktop = path.normalize(this.getDesktopPath());

        // Must stay inside Codez48 Preview or Desktop
        return normalized.startsWith(workspace) || normalized.startsWith(desktop);
    }
}

module.exports = new WorkspaceManager();
