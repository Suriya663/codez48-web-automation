/**
 * CODEZ48 BASE PROJECT ADAPTER
 * Interface definition for extensible multi-language / multi-framework project drivers.
 */

class BaseProjectAdapter {
    constructor(name) {
        this.name = name;
    }

    // Returns true if goal or project directory matches this adapter
    detect(goal, projectPath) {
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
        return null;
    }

    getEntryPoint(projectPath) {
        return null;
    }

    getOutputType() {
        return 'web'; // 'web' | 'cli' | 'desktop' | 'android'
    }

    parseError(stdout, stderr) {
        return stderr || stdout || 'Unknown execution error';
    }
}

module.exports = BaseProjectAdapter;
