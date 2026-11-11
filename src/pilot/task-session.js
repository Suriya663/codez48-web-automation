/**
 * CODEZ48 TASK SESSION MANAGER
 * Provides task session isolation, CREATE vs EDIT intent detection,
 * active artifact tracking, unique filename auto-incrementing, and project manifest generation.
 */

const fs = require('fs');
const path = require('path');

class TaskSessionManager {
    constructor() {
        this.currentTaskId = null;
        this.currentGoal = null;
        this.currentMode = 'CREATE'; // 'CREATE' | 'EDIT'
        this.activeArtifactPath = null;
        this.activeProjectPath = null;
    }

    startTask(goal) {
        if (!goal) return;

        this.currentTaskId = 'TASK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        this.currentGoal = goal;

        const lower = goal.toLowerCase();

        // Detect EDIT Intent vs CREATE Intent
        const editKeywords = ['edit', 'modify', 'update', 'continue', 'change', 'append', 'fix', 'replace'];
        const isEdit = editKeywords.some(k => lower.includes(k));

        if (isEdit && this.activeArtifactPath && fs.existsSync(this.activeArtifactPath)) {
            this.currentMode = 'EDIT';
        } else {
            this.currentMode = 'CREATE';
            this.activeArtifactPath = null; // Clear old artifact reference for new creation tasks
        }

        console.log(`\x1b[33m[TASK SESSION] ID: ${this.currentTaskId} | Mode: ${this.currentMode}\x1b[0m`);
        return { taskId: this.currentTaskId, mode: this.currentMode };
    }

    getUniqueFilename(dir, baseName = 'notes.txt') {
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);

        let candidate = path.join(dir, baseName);

        // In EDIT mode, return the existing file if it exists
        if (this.currentMode === 'EDIT' && fs.existsSync(candidate)) {
            return candidate;
        }

        // In CREATE mode, generate story-2.txt, story-3.txt if story.txt exists
        let counter = 1;
        while (fs.existsSync(candidate)) {
            counter++;
            candidate = path.join(dir, `${nameWithoutExt}-${counter}${ext}`);
        }

        return candidate;
    }

    writeProjectManifest(projectDir, metadata = {}) {
        if (!projectDir || !fs.existsSync(projectDir)) return null;

        const manifestPath = path.join(projectDir, 'project-manifest.json');
        const manifestData = {
            projectName: path.basename(projectDir),
            taskId: this.currentTaskId,
            creationTime: new Date().toISOString(),
            projectType: metadata.projectType || 'general',
            activeProjectPath: projectDir,
            entryFile: metadata.entryFile || 'index.html',
            filesCreated: metadata.filesCreated || [],
            runMethod: metadata.runMethod || 'open_app',
            ...metadata
        };

        fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
        console.log(`\x1b[32m✓ Project Manifest written to: ${manifestPath}\x1b[0m`);
        return manifestData;
    }

    setActiveArtifact(filePath) {
        if (filePath) {
            this.activeArtifactPath = path.normalize(filePath);
        }
        return this.activeArtifactPath;
    }

    getActiveArtifact() {
        return this.activeArtifactPath;
    }
}

module.exports = new TaskSessionManager();
