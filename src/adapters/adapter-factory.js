/**
 * CODEZ48 PROJECT ADAPTER FACTORY
 * Registers adapters and resolves the best matching driver for a given goal or project directory.
 */

const fs = require('fs');
const staticWebAdapter = require('./static-web');
const nodeAdapter = require('./node');
const pythonAdapter = require('./python');
const javaAdapter = require('./java');
const androidAdapter = require('./android');
const dotnetAdapter = require('./dotnet');
const flutterAdapter = require('./flutter');

class AdapterFactory {
    constructor() {
        this.adapters = [
            nodeAdapter,
            pythonAdapter,
            staticWebAdapter,
            javaAdapter,
            androidAdapter,
            dotnetAdapter,
            flutterAdapter
        ];
    }

    getAdapter(goal = '', projectPath = null) {
        const lowerGoal = (goal || '').toLowerCase();

        // 1. Check if user goal text explicitly specifies static web
        const isExplicitStatic = (lowerGoal.includes('html') || lowerGoal.includes('css') || lowerGoal.includes('static') || lowerGoal.includes('portfolio') || lowerGoal.includes('landing page')) &&
            !lowerGoal.includes('node') && !lowerGoal.includes('express') && !lowerGoal.includes('react') && !lowerGoal.includes('next') && !lowerGoal.includes('vite') && !lowerGoal.includes('python') && !lowerGoal.includes('flask') && !lowerGoal.includes('django');

        if (isExplicitStatic) {
            return staticWebAdapter;
        }

        // 2. Check user goal text for other explicit framework adapters
        if (goal) {
            for (const adapter of [pythonAdapter, javaAdapter, androidAdapter, dotnetAdapter, flutterAdapter, nodeAdapter, staticWebAdapter]) {
                if (adapter.detect(goal, null)) {
                    return adapter;
                }
            }
        }

        // 3. Check if project directory files match a specific adapter (only inside child project path)
        if (projectPath && fs.existsSync(projectPath)) {
            for (const adapter of [staticWebAdapter, nodeAdapter, pythonAdapter, javaAdapter, androidAdapter, dotnetAdapter, flutterAdapter]) {
                if (adapter.detect('', projectPath)) {
                    return adapter;
                }
            }
        }

        // Default to Static Web if goal mentions website/portfolio, otherwise Node
        if (lowerGoal.includes('website') || lowerGoal.includes('page')) {
            return staticWebAdapter;
        }

        return nodeAdapter;
    }
}

module.exports = new AdapterFactory();
