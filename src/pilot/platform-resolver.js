/**
 * CODEZ48 PLATFORM RESOLVER & DESKTOP APP PRIORITY ENGINE
 * Determines whether a user's request should be handled via a Native Desktop Application
 * or seamlessly fall back to Website Automation.
 *
 * Core Rule: If there is an installed desktop application for that platform, Codez48 Pilot
 * prioritizes and automates the native desktop application directly.
 * If not installed, it falls back to the official website via standard browser (Chrome/Edge).
 */

const logger = require('../core/logger');
const appDiscovery = require('./app-discovery');

class PlatformResolver {
    constructor() {
        // Platform domain-to-app mapping dictionary
        this.domainAppMap = {
            'whatsapp.com': 'whatsapp',
            'spotify.com': 'spotify',
            'discord.com': 'discord',
            'slack.com': 'slack',
            'teams.microsoft.com': 'teams',
            'zoom.us': 'zoom',
            'telegram.org': 'telegram',
            'notion.so': 'notion',
            'canva.com': 'canva',
            'figma.com': 'figma',
            'skype.com': 'skype',
            'github.com': 'github',
            'vscode.dev': 'vscode',
            'netflix.com': 'netflix',
            'office.com': 'office',
            'youtube.com': 'youtube',
            'claude.ai': 'claude',
            'anthropic.com': 'claude'
        };
    }

    /**
     * Extracts platform identifier and sub-task from natural language goal
     */
    extractPlatformAndTask(goal) {
        if (!goal) return { platform: null, task: null, rawUrl: null };
        const clean = goal.trim();
        const lower = clean.toLowerCase();

        // 1. Direct URL detection
        const urlMatch = clean.match(/(https?:\/\/[^\s"']+)/i) || clean.match(/\b([a-zA-Z0-9\-]+\.(?:com|org|net|io|dev|app|ai|tv|co|in|uk)[^\s]*)/i);
        let rawUrl = null;
        if (urlMatch) {
            rawUrl = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`;
            // Check if domain maps to known desktop application
            for (const [domain, app] of Object.entries(this.domainAppMap)) {
                if (rawUrl.toLowerCase().includes(domain)) {
                    return { platform: app, task: clean, rawUrl };
                }
            }
        }

        // 2. Pattern: "open [Platform] and [Task]" or "launch [Platform] to [Task]"
        const openAndMatch = clean.match(/^(?:open|launch|start|run|bring up)\s+(?:the\s+)?([a-zA-Z0-9_\-\.\s]+?)\s+(?:and|to|then)\s+(.+)$/i);
        if (openAndMatch) {
            const platform = openAndMatch[1].replace(/^(?:the|app(?:lication)?)\s+/i, '').trim();
            const task = openAndMatch[2].trim();
            return { platform, task, rawUrl };
        }

        // 3. Pattern: "open [Platform]" (Single command)
        const openMatch = clean.match(/^(?:open|launch|start|run|bring up)\s+(?:the\s+)?(?:app(?:lication)?\s+)?([a-zA-Z0-9_\-\.\s]+)$/i);
        if (openMatch) {
            const platform = openMatch[1].trim();
            return { platform, task: null, rawUrl };
        }

        // 4. Keyword scan for major platforms
        const platforms = [
            'whatsapp', 'spotify', 'discord', 'slack', 'teams', 'zoom', 'telegram',
            'notepad', 'calculator', 'calc', 'paint', 'mspaint', 'clock', 'settings',
            'word', 'powerpoint', 'excel', 'vscode', 'code', 'chrome', 'edge',
            'terminal', 'powershell', 'cmd', 'camera', 'photos', 'vlc', 'canva', 'notion', 'figma', 'claude'
        ];

        for (const p of platforms) {
            const regex = new RegExp(`\\b${p}\\b`, 'i');
            if (regex.test(lower)) {
                return { platform: p, task: clean, rawUrl };
            }
        }

        return { platform: null, task: clean, rawUrl };
    }

    /**
     * Checks if the user strictly insisted on Web/Browser only (e.g. "on website only", "in browser only")
     */
    isExplicitWebOnly(goal) {
        const lower = (goal || '').toLowerCase();
        return /\b(?:on\s+(?:the\s+)?website\s+only|in\s+browser\s+only|do\s+not\s+open\s+app|web\s+version\s+only|browser\s+tab\s+only)\b/i.test(lower);
    }

    /**
     * Resolves whether to launch the Native Desktop Application or fall back to Website
     */
    resolvePlatformAction(goal) {
        const { platform, task, rawUrl } = this.extractPlatformAndTask(goal);
        const lower = (goal || '').toLowerCase();

        // If no recognizable platform found and it's a generic web URL or browsing task
        if (!platform) {
            if (rawUrl || lower.includes('http') || lower.includes('.com') || lower.includes('website') || lower.includes('browser')) {
                return {
                    mode: 'WEB_AUTOMATION',
                    platform: 'Web Browser',
                    target: rawUrl || 'https://www.google.com',
                    task: task || goal,
                    reason: 'Generic web URL or browsing intent without associated desktop application'
                };
            }
            return {
                mode: 'GENERAL_DESKTOP',
                platform: 'Desktop',
                target: null,
                task: goal,
                reason: 'General desktop or AI task'
            };
        }

        // Check if user specifically requested web only
        if (this.isExplicitWebOnly(goal)) {
            const appInfo = appDiscovery.findApp(platform);
            const targetUrl = rawUrl || (appInfo && appInfo.webFallbackUrl) || `https://www.${platform}.com`;
            logger.status(`\x1b[33m[PLATFORM RESOLVER] User explicitly requested Web only. Bypassing native app.\x1b[0m`);
            return {
                mode: 'WEB_AUTOMATION',
                platform,
                target: targetUrl,
                task: task || goal,
                reason: 'User explicitly requested Web/Browser execution'
            };
        }

        // PRIORITY CHECK: Is the native desktop application installed?
        const appInfo = appDiscovery.findApp(platform);

        if (appInfo && appInfo.found) {
            logger.status(`\x1b[32m[PLATFORM RESOLVER] Native desktop application "${appInfo.name}" found on laptop. Prioritizing native application over website!\x1b[0m`);
            return {
                mode: 'NATIVE_APP',
                platform: appInfo.name,
                appInfo,
                target: appInfo.target,
                task: task || goal,
                isStartApp: appInfo.isStartApp,
                reason: `Native desktop application "${appInfo.name}" is installed. Prioritizing native application over website.`
            };
        }

        // Native app not installed -> Fall back to official website
        const fallbackUrl = rawUrl || (appInfo && appInfo.webFallbackUrl) || `https://www.${platform}.com`;
        logger.status(`\x1b[33m[PLATFORM RESOLVER] Native application "${platform}" is not installed. Seamlessly falling back to verified official website: ${fallbackUrl}\x1b[0m`);
        return {
            mode: 'WEB_FALLBACK',
            platform,
            target: fallbackUrl,
            task: task || goal,
            reason: `Native application "${platform}" is not installed. Falling back to official website.`
        };
    }
}

module.exports = new PlatformResolver();
