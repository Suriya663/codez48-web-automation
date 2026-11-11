const logger = require('../../core/logger');
/**
 * CODEZ48 PYTHON LOCAL AUTOMATION ADAPTER
 * Invokes the local Python helper bridge for screenshot capture and local input simulation when required.
 */

const { spawnSync } = require('child_process');
const path = require('path');

class PythonLocalAdapter {
    constructor() {
        this.bridgePath = path.join(__dirname, '../../../python/codez48_automation/bridge.py');
    }

    captureScreen() {
        try {
            const res = spawnSync('python', [this.bridgePath], {
                input: JSON.stringify({ command: 'capture' }),
                encoding: 'utf8',
                timeout: 5000
            });
            if (res.stdout) {
                const parsed = JSON.parse(res.stdout.trim());
                if (parsed.success) return parsed;
            }
        } catch (e) {}
        return null;
    }

    executeInput(actionData) {
        try {
            const res = spawnSync('python', [this.bridgePath], {
                input: JSON.stringify({ command: 'input', data: actionData }),
                encoding: 'utf8',
                timeout: 5000
            });
            if (res.stdout) {
                return JSON.parse(res.stdout.trim());
            }
        } catch (e) {}
        return { success: false, error: 'Python execution failed' };
    }
}

module.exports = new PythonLocalAdapter();
