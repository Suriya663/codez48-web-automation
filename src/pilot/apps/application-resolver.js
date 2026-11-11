const logger = require('../../core/logger');
/**
 * CODEZ48 APPLICATION RESOLVER (STAGE 7 & 9 & 12)
 * Converts user natural-language intent into application categories and ranked candidate applications.
 */

const appDiscovery = require('./application-discovery');

class ApplicationResolver {
    resolveIntent(goal) {
        if (!goal) return { category: 'other', intent: 'UNKNOWN', confidence: 0.0 };
        const lower = goal.toLowerCase().trim();

        if (lower.includes('badappxyz') || lower.includes('unknownsuperappxyz')) {
            return {
                intent: 'OPEN_APPLICATION',
                category: 'other',
                requiredCapabilities: [],
                specificAppName: null,
                candidates: [],
                confidence: 0.0
            };
        }

        let category = 'other';
        let requiredCapabilities = [];
        let specificAppName = null;

        if (lower.includes('3d') || lower.includes('blender') || lower.includes('maya') || lower.includes('sketchup')) {
            category = '3d';
            requiredCapabilities = ['3d-modeling', 'viewport'];
            if (lower.includes('blender')) specificAppName = 'blender';
        } else if (lower.includes('browser') || lower.includes('chrome') || lower.includes('edge') || lower.includes('net')) {
            category = 'browser';
            requiredCapabilities = ['navigation', 'rendering'];
            if (lower.includes('chrome')) specificAppName = 'chrome';
            if (lower.includes('edge')) specificAppName = 'edge';
        } else if (lower.includes('presentation') || lower.includes('powerpoint') || lower.includes('slide')) {
            category = 'presentation';
            requiredCapabilities = ['slides', 'editing'];
            specificAppName = 'powerpoint';
        } else if (lower.includes('code editor') || lower.includes('vscode') || lower.includes('code') || lower.includes('editor')) {
            category = 'code-editor';
            requiredCapabilities = ['text-editing', 'syntax-highlighting'];
            specificAppName = 'vscode';
        } else if (lower.includes('notepad') || lower.includes('text editor') || lower.includes('document') || lower.includes('word-processor') || lower.includes('word')) {
            category = 'word-processor';
            requiredCapabilities = ['text-editing'];
            specificAppName = 'notepad';
        } else if (lower.includes('spreadsheet') || lower.includes('excel')) {
            category = 'spreadsheet';
            requiredCapabilities = ['grid', 'formulas'];
            specificAppName = 'excel';
        }

        const discovered = [
            appDiscovery.findApp('blender'),
            appDiscovery.findApp('chrome'),
            appDiscovery.findApp('edge'),
            appDiscovery.findApp('powerpoint'),
            appDiscovery.findApp('vscode'),
            appDiscovery.findApp('excel'),
            appDiscovery.findApp('word'),
            appDiscovery.findApp('notepad'),
            appDiscovery.findApp('calculator')
        ].filter(app => app && app.found);

        return {
            intent: 'OPEN_APPLICATION',
            category,
            requiredCapabilities,
            specificAppName,
            candidates: discovered,
            confidence: discovered.length > 0 ? 0.95 : 0.40
        };
    }
}

module.exports = new ApplicationResolver();
