/**
 * CODEZ48 PYTHON / FLASK / FASTAPI / DJANGO ADAPTER
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class PythonProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('python');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        const keywords = ['python', 'flask', 'fastapi', 'django', 'pip', 'py'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
                fs.existsSync(path.join(projectPath, 'app.py')) ||
                fs.existsSync(path.join(projectPath, 'main.py'))) {
                return true;
            }
        }

        return false;
    }

    getRequiredTools() {
        return ['python', 'pip'];
    }

    detectDependencies(projectPath) {
        if (!projectPath || !fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
            return { installed: [], missing: [] };
        }

        try {
            const reqs = fs.readFileSync(path.join(projectPath, 'requirements.txt'), 'utf8')
                .split('\n')
                .map(line => line.split('#')[0].trim())
                .filter(Boolean);

            return { installed: [], missing: reqs };
        } catch (e) {
            return { installed: [], missing: [] };
        }
    }

    getInstallCommand(dependencies) {
        if (dependencies && dependencies.length > 0) {
            return `pip install ${dependencies.join(' ')}`;
        }
        return 'pip install -r requirements.txt';
    }

    getBuildCommand(projectPath) {
        return null;
    }

    getRunCommand(projectPath) {
        const entry = this.getEntryPoint(projectPath);
        return `python ${entry}`;
    }

    getEntryPoint(projectPath) {
        const candidates = ['app.py', 'main.py', 'server.py', 'manage.py'];
        for (const cand of candidates) {
            if (projectPath && fs.existsSync(path.join(projectPath, cand))) return cand;
        }
        return 'app.py';
    }

    getOutputType() {
        return 'web';
    }
}

module.exports = new PythonProjectAdapter();
