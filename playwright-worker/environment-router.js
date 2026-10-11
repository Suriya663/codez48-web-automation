const path = require('path');
const os = require('os');

class EnvironmentRouter {
    classifyIntent(taskGoal) {
        const goal = (taskGoal || '').trim().toLowerCase();

        console.log(`[ENVIRONMENT ROUTER] Analyzing task intent: "${taskGoal}"`);

        // Check for filesystem / desktop folder / file operations
        const isFilesystemTask =
            goal.includes('desktop') ||
            goal.includes('folder') ||
            goal.includes('text file') ||
            goal.includes('file') ||
            goal.includes('downloads') ||
            goal.includes('documents') ||
            goal.includes('rename') ||
            goal.includes('move') ||
            goal.includes('delete') ||
            goal.includes('save');

        // Check for native applications (Notepad, Calculator, VS Code, etc.)
        const isNativeAppTask =
            goal.includes('notepad') ||
            goal.includes('calculator') ||
            goal.includes('vs code') ||
            goal.includes('code') ||
            goal.includes('file explorer');

        // Check for browser / web tasks
        const isWebTask =
            goal.includes('http://') ||
            goal.includes('https://') ||
            goal.includes('chrome') ||
            goal.includes('browser') ||
            goal.includes('search') ||
            goal.includes('wikipedia') ||
            goal.includes('google') ||
            goal.includes('website') ||
            goal.includes('url') ||
            goal.includes('upload') ||
            goal.includes('download') && !goal.includes('download folder');

        // Mixed environment (e.g. desktop file + web upload/download)
        if ((isFilesystemTask || isNativeAppTask) && isWebTask) {
            console.log('[ENVIRONMENT CLASSIFICATION] MIXED_ENVIRONMENT');
            return { environment: 'MIXED_ENVIRONMENT', requiresBrowser: true, requiresFilesystem: true };
        }

        if (isNativeAppTask && !isFilesystemTask && !isWebTask) {
            console.log('[ENVIRONMENT CLASSIFICATION] NATIVE_APPLICATION');
            return { environment: 'NATIVE_APPLICATION', requiresBrowser: false, requiresFilesystem: false };
        }

        if (isFilesystemTask && !isWebTask) {
            console.log('[ENVIRONMENT CLASSIFICATION] WINDOWS_FILESYSTEM');
            return { environment: 'WINDOWS_FILESYSTEM', requiresBrowser: false, requiresFilesystem: true };
        }

        if (isWebTask) {
            console.log('[ENVIRONMENT CLASSIFICATION] BROWSER');
            return { environment: 'BROWSER', requiresBrowser: true, requiresFilesystem: false };
        }

        // Default heuristic: if contains website URL or search terms -> browser, else filesystem/desktop
        if (goal.includes('open') && (goal.includes('.com') || goal.includes('.org') || goal.includes('http'))) {
            console.log('[ENVIRONMENT CLASSIFICATION] BROWSER (URL detected)');
            return { environment: 'BROWSER', requiresBrowser: true, requiresFilesystem: false };
        }

        console.log('[ENVIRONMENT CLASSIFICATION] WINDOWS_FILESYSTEM (Default fallback for local OS tasks)');
        return { environment: 'WINDOWS_FILESYSTEM', requiresBrowser: false, requiresFilesystem: true };
    }
}

module.exports = new EnvironmentRouter();
