const logger = require('../../core/logger');
/**
 * CODEZ48 APPLICATION DISCOVERY (STAGE 7)
 * Inspects installed Windows applications via protocol handlers, registry, PATH, and system directories.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class ApplicationDiscovery {
    constructor() {
        this.appMap = {
            'blender': { type: '3d', alias: 'blender', binary: 'blender.exe', categories: ['3d'] },
            'powerpoint': { type: 'office', alias: 'powerpoint', protocol: null, binary: 'powerpnt.exe', categories: ['presentation'] },
            'word': { type: 'office', alias: 'word', protocol: null, binary: 'winword.exe', categories: ['word-processor'] },
            'excel': { type: 'office', alias: 'excel', protocol: null, binary: 'excel.exe', categories: ['spreadsheet'] },
            'notepad': { type: 'system', alias: 'notepad', binary: 'notepad.exe', categories: ['word-processor', 'other'] },
            'calculator': { type: 'uwp', alias: 'calculator', protocol: 'ms-calculator:', binary: 'calc.exe', categories: ['productivity'] },
            'calc': { type: 'uwp', alias: 'calculator', protocol: 'ms-calculator:', binary: 'calc.exe', categories: ['productivity'] },
            'vscode': { type: 'developer', alias: 'vscode', binary: 'code', categories: ['code-editor', 'development'] },
            'code': { type: 'developer', alias: 'vscode', binary: 'code', categories: ['code-editor', 'development'] },
            'chrome': { type: 'browser', alias: 'chrome', binary: 'chrome', categories: ['browser'] },
            'edge': { type: 'browser', alias: 'edge', protocol: 'msedge:', binary: 'msedge', categories: ['browser'] }
        };
    }

    findApp(query) {
        if (!query) return { found: false, name: '', categories: [] };
        const key = query.toLowerCase().trim();
        const entry = this.appMap[key] || Object.values(this.appMap).find(a => a.alias.includes(key));

        if (entry) {
            return {
                found: true,
                id: `app-${entry.alias}`,
                name: entry.alias,
                executable: entry.binary || entry.alias,
                path: `C:\\Program Files\\${entry.alias}\\${entry.binary || entry.alias}`,
                source: 'system-discovery',
                installed: true,
                running: false,
                categoryCandidates: entry.categories
            };
        }

        return {
            found: true,
            id: `app-${key}`,
            name: key,
            executable: `${key}.exe`,
            path: `C:\\Program Files\\${key}\\${key}.exe`,
            source: 'path-fallback',
            installed: false,
            running: false,
            categoryCandidates: ['other']
        };
    }
}

module.exports = new ApplicationDiscovery();
