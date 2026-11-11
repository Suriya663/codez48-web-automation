/**
 * CODEZ48 APP DISCOVERY & SYSTEM APPLICATION ENUMERATOR
 * Dynamically discovers, enumerates, lists, and launches ALL installed Windows applications
 * using Get-StartApps, Windows Registry Uninstall paths, and standard PATH binaries.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');
const logger = require('../core/logger');

class AppDiscovery {
    constructor() {
        this.discoveredAppsCache = null;
        this.cacheTimestamp = 0;

        // Static quick-lookup map for common applications & protocol handlers
        this.appMap = {
            'powerpoint': { type: 'office', alias: 'powerpoint', protocol: null, binary: 'powerpnt.exe', webUrl: 'https://powerpoint.office.com' },
            'word': { type: 'office', alias: 'word', protocol: null, binary: 'winword.exe', webUrl: 'https://word.office.com' },
            'excel': { type: 'office', alias: 'excel', protocol: null, binary: 'excel.exe', webUrl: 'https://excel.office.com' },
            'whatsapp': { type: 'messaging', alias: 'whatsapp', protocol: 'whatsapp:', binary: 'WhatsApp.exe', webUrl: 'https://web.whatsapp.com' },
            'teams': { type: 'collaboration', alias: 'teams', protocol: 'ms-teams:', binary: 'Teams.exe', webUrl: 'https://teams.microsoft.com' },
            'spotify': { type: 'media', alias: 'spotify', protocol: 'spotify:', binary: 'Spotify.exe', webUrl: 'https://open.spotify.com' },
            'discord': { type: 'messaging', alias: 'discord', protocol: 'discord:', binary: 'Discord.exe', webUrl: 'https://discord.com/app' },
            'zoom': { type: 'meeting', alias: 'zoom', protocol: 'zoommtg:', binary: 'Zoom.exe', webUrl: 'https://zoom.us' },
            'notepad': { type: 'system', alias: 'notepad', binary: 'notepad.exe', webUrl: null },
            'calculator': { type: 'uwp', alias: 'calculator', protocol: 'ms-calculator:', binary: 'calc.exe', webUrl: null },
            'calc': { type: 'uwp', alias: 'calculator', protocol: 'ms-calculator:', binary: 'calc.exe', webUrl: null },
            'vscode': { type: 'developer', alias: 'vscode', binary: 'code', webUrl: 'https://vscode.dev' },
            'code': { type: 'developer', alias: 'vscode', binary: 'code', webUrl: 'https://vscode.dev' },
            'chrome': { type: 'browser', alias: 'chrome', binary: 'chrome', webUrl: 'https://www.google.com' },
            'google': { type: 'browser', alias: 'google', binary: 'chrome.exe', webUrl: 'https://www.google.com' },
            'google chrome': { type: 'browser', alias: 'google chrome', binary: 'chrome.exe', webUrl: 'https://www.google.com' },
            'edge': { type: 'browser', alias: 'edge', protocol: 'msedge:', binary: 'msedge', webUrl: null },
            'settings': { type: 'system', alias: 'settings', protocol: 'ms-settings:', webUrl: null },
            'clock': { type: 'uwp', alias: 'clock', protocol: 'ms-clock:', webUrl: null },
            'paint': { type: 'system', alias: 'paint', binary: 'mspaint.exe', webUrl: null },
            'mspaint': { type: 'system', alias: 'paint', binary: 'mspaint.exe', webUrl: null },
            'terminal': { type: 'system', alias: 'terminal', binary: 'wt.exe', webUrl: null },
            'cmd': { type: 'system', alias: 'cmd', binary: 'cmd.exe', webUrl: null },
            'powershell': { type: 'system', alias: 'powershell', binary: 'powershell.exe', webUrl: null },
            'explorer': { type: 'system', alias: 'explorer', binary: 'explorer.exe', webUrl: null },
            'taskmgr': { type: 'system', alias: 'taskmgr', binary: 'taskmgr.exe', webUrl: null },
            'camera': { type: 'uwp', alias: 'camera', protocol: 'microsoft.windows.camera:', webUrl: null },
            'photos': { type: 'uwp', alias: 'photos', protocol: 'ms-photos:', webUrl: null },
            'vlc': { type: 'media', alias: 'vlc', binary: 'vlc.exe', webUrl: null },
            'slack': { type: 'collaboration', alias: 'slack', binary: 'slack.exe', protocol: 'slack:', webUrl: 'https://app.slack.com' },
            'telegram': { type: 'messaging', alias: 'telegram', binary: 'Telegram.exe', protocol: 'tg:', webUrl: 'https://web.telegram.org' },
            'blender': { type: 'media', alias: 'blender', binary: 'blender.exe', webUrl: null },
            'android studio': { type: 'developer', alias: 'android studio', binary: 'studio64.exe', webUrl: null },
            'canva': { type: 'media', alias: 'canva', protocol: 'canva:', binary: 'Canva.exe', webUrl: 'https://www.canva.com' },
            'notion': { type: 'productivity', alias: 'notion', protocol: 'notion:', binary: 'Notion.exe', webUrl: 'https://www.notion.so' },
            'figma': { type: 'design', alias: 'figma', protocol: 'figma:', binary: 'Figma.exe', webUrl: 'https://www.figma.com' },
            'github': { type: 'developer', alias: 'github', protocol: 'github-desktop:', binary: 'GitHubDesktop.exe', webUrl: 'https://github.com' },
            'github desktop': { type: 'developer', alias: 'github desktop', protocol: 'github-desktop:', binary: 'GitHubDesktop.exe', webUrl: 'https://github.com' },
            'netflix': { type: 'media', alias: 'netflix', protocol: 'netflix:', webUrl: 'https://www.netflix.com' },
            'youtube': { type: 'media', alias: 'youtube', webUrl: 'https://www.youtube.com' },
            'claude': { type: 'developer', alias: 'claude', webUrl: 'https://claude.ai' }
        };
    }

    /**
     * Quick check if a native application is installed on this laptop
     */
    hasNativeApp(query) {
        const res = this.findApp(query);
        return Boolean(res && res.found);
    }

    /**
     * Enumerate ALL installed desktop and UWP applications on this laptop
     */
    listInstalledApps(forceRefresh = false) {
        if (!forceRefresh && this.discoveredAppsCache && (Date.now() - this.cacheTimestamp < 60000)) {
            return this.discoveredAppsCache;
        }

        if (process.platform !== 'win32') {
            return Object.keys(this.appMap).map(k => ({ name: k, category: 'General' }));
        }

        try {
            const psScript = `
                [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                $ErrorActionPreference = 'SilentlyContinue'

                $startApps = Get-StartApps | Where-Object { $_.Name -and $_.Name -notmatch '^ms-resource' }

                $regKeys = @(
                    'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
                    'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
                    'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
                )
                $regApps = Get-ItemProperty -Path $regKeys | Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 }

                $all = @{}

                foreach ($a in $startApps) {
                    $n = $a.Name.Trim()
                    if (-not $all.ContainsKey($n)) {
                        $all[$n] = @{
                            name = $n
                            appId = $a.AppID
                            source = 'StartApp'
                        }
                    }
                }

                foreach ($r in $regApps) {
                    $n = $r.DisplayName.Trim()
                    if (-not $all.ContainsKey($n)) {
                        $all[$n] = @{
                            name = $n
                            appId = if ($r.DisplayIcon) { $r.DisplayIcon } else { $r.InstallLocation }
                            source = 'Registry'
                            version = $r.DisplayVersion
                        }
                    }
                }

                $list = @($all.Values | Sort-Object name)
                $list | ConvertTo-Json -Compress
            `;

            const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
            const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', b64], {
                encoding: 'utf8',
                maxBuffer: 15 * 1024 * 1024,
                timeout: 8000
            });

            if (res.stdout) {
                const parsed = JSON.parse(res.stdout);
                const rawList = Array.isArray(parsed) ? parsed : [parsed];

                // Filter out drivers, internal runtimes, and helpers
                const filtered = rawList.filter(app => {
                    if (!app || !app.name) return false;
                    const n = app.name.toLowerCase();
                    if (n.startsWith('microsoft visual c++') || n.includes('redistributable') || n.includes('update assistant')) return false;
                    if (n.includes('graphics driver') || n.includes('audio driver') || n.includes('physx') || n.includes('driver')) return false;
                    if (n.includes('installer') || n.includes('setup') || n.includes('framework') || n.includes('sdk tools')) return false;
                    if (n === 'run' || n === 'on-screen keyboard' || n === 'step recorder') return false;
                    return true;
                });

                // Categorize applications
                const categorized = filtered.map(app => {
                    const n = app.name.toLowerCase();
                    let category = 'System & Utilities';

                    if (n.includes('code') || n.includes('studio') || n.includes('antigravity') || n.includes('git') || n.includes('terminal') || n.includes('claude') || n.includes('node') || n.includes('python')) {
                        category = 'Developer & Engineering';
                    } else if (n.includes('powerpoint') || n.includes('word') || n.includes('excel') || n.includes('calc') || n.includes('note') || n.includes('clock') || n.includes('calendar') || n.includes('office')) {
                        category = 'Productivity & Office';
                    } else if (n.includes('blender') || n.includes('canva') || n.includes('paint') || n.includes('photo') || n.includes('camera') || n.includes('vlc') || n.includes('spotify') || n.includes('media')) {
                        category = 'Design, 3D & Media';
                    } else if (n.includes('chrome') || n.includes('edge') || n.includes('firefox') || n.includes('brave') || n.includes('browser')) {
                        category = 'Web Browsers';
                    } else if (n.includes('whatsapp') || n.includes('teams') || n.includes('discord') || n.includes('slack') || n.includes('zoom') || n.includes('telegram')) {
                        category = 'Communication & Messaging';
                    }

                    return {
                        name: app.name,
                        appId: app.appId,
                        source: app.source,
                        category
                    };
                });

                this.discoveredAppsCache = categorized;
                this.cacheTimestamp = Date.now();
                return categorized;
            }
        } catch (e) {
            logger.debug(`[APP DISCOVERY ERROR] ${e.message}`);
        }

        return Object.keys(this.appMap).map(k => ({ name: k, category: 'General' }));
    }

    /**
     * Formats the list of installed applications into a clean executive overview
     */
    formatInstalledAppsForDisplay() {
        const apps = this.listInstalledApps();
        const grouped = {};

        apps.forEach(app => {
            if (!grouped[app.category]) grouped[app.category] = [];
            grouped[app.category].push(app.name);
        });

        let output = `\n\x1b[36m========================================================================================\x1b[0m\n`;
        output += `\x1b[1m\x1b[33m💻 INSTALLED DESKTOP APPLICATIONS ON THIS LAPTOP (${apps.length} Total Applications)\x1b[0m\n`;
        output += `\x1b[36m========================================================================================\x1b[0m\n`;

        for (const [category, appNames] of Object.entries(grouped)) {
            output += `\n\x1b[35m[${category.toUpperCase()}] (${appNames.length})\x1b[0m\n`;
            // Format into 2 columns
            for (let i = 0; i < appNames.length; i += 2) {
                const col1 = `• ${appNames[i]}`.padEnd(42);
                const col2 = appNames[i + 1] ? `• ${appNames[i + 1]}` : '';
                output += `  ${col1} ${col2}\n`;
            }
        }

        output += `\n\x1b[36m========================================================================================\x1b[0m\n`;
        output += `\x1b[32m💡 You can automate any application above by telling Copilot: "open [App Name] and [Task]"\x1b[0m\n`;
        output += `\x1b[36m========================================================================================\x1b[0m\n`;

        return { text: output, count: apps.length, apps };
    }

    /**
     * Locate an application on the laptop by name or fuzzy keyword
     */
    findApp(query) {
        if (!query) return { found: false, webFallbackUrl: null };
        const key = query.toLowerCase().trim();

        // 0. Dedicated Office Binary Verification to prevent broken shell/DDE protocol associations
        const isOfficeApp = (
            key.includes('powerpoint') || key.includes('power point') || key.includes('ppt') || key.includes('presentation') ||
            key.includes('winword') || key.includes('word') ||
            key.includes('excel') || key.includes('spreadsheet') ||
            key === 'office' || key.includes('ms office') || key.includes('microsoft office')
        );
        if (isOfficeApp) {
            try {
                const officeLauncher = require('./drivers/office-launcher');
                let targetType = 'powerpoint';
                if (key.includes('word') || key.includes('winword') || key.includes('doc')) targetType = 'word';
                else if (key.includes('excel') || key.includes('spreadsheet') || key.includes('csv')) targetType = 'excel';
                else targetType = 'powerpoint';

                const officeBin = officeLauncher.findOfficeBinary(targetType);
                const entry = this.appMap[targetType] || Object.values(this.appMap).find(e => e.alias === targetType);
                if (officeBin) {
                    return {
                        found: true,
                        name: entry ? entry.alias : key,
                        type: 'office',
                        target: officeBin,
                        webFallbackUrl: entry ? entry.webUrl : null
                    };
                }
            } catch (_) {}
        }

        // 1. Query dynamically discovered system apps (matches installed Windows StartApps & Registry first)
        const systemApps = this.listInstalledApps();
        const matched = systemApps.find(a => {
            const aLow = a.name.toLowerCase();
            return aLow === key || aLow.includes(key) || key.includes(aLow);
        });

        if (matched) {
            const entry = this.appMap[key] || Object.values(this.appMap).find(e => e.alias === key || matched.name.toLowerCase().includes(e.alias));
            return {
                found: true,
                name: matched.name,
                type: matched.category,
                target: matched.appId || (entry ? (entry.binary || entry.protocol) : null),
                isStartApp: matched.source === 'StartApp',
                webFallbackUrl: entry ? entry.webUrl : null
            };
        }

        // 2. Static app map quick lookup
        let entry = this.appMap[key];
        if (!entry) {
            for (const [name, candidate] of Object.entries(this.appMap)) {
                if (key.includes(name) || name.includes(key)) {
                    entry = candidate;
                    break;
                }
            }
        }

        if (entry) {
            const isInstalled = this.verifyInstalled(entry);
            return {
                found: isInstalled,
                name: entry.alias,
                type: entry.type,
                target: isInstalled ? (entry.binary || entry.protocol) : null,
                webFallbackUrl: entry.webUrl || null
            };
        }

        // 3. System PATH fallback check
        try {
            const isWin = process.platform === 'win32';
            const cmd = isWin ? `where ${key}` : `which ${key}`;
            const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 2000 }).trim();
            if (out) {
                return { found: true, name: key, type: 'system', target: key, webFallbackUrl: null };
            }
        } catch (_) {}

        return { found: false, name: key, webFallbackUrl: null };
    }

    verifyInstalled(entry) {
        if (!entry) return false;
        if (['notepad.exe', 'calc.exe', 'mspaint.exe', 'cmd.exe', 'powershell.exe', 'explorer.exe', 'ms-settings:', 'ms-clock:', 'ms-calculator:'].includes(entry.binary || entry.protocol)) {
            return true;
        }

        if (process.platform === 'win32') {
            const binName = entry.binary || entry.alias;
            const exeName = binName.endsWith('.exe') ? binName : `${binName}.exe`;

            try {
                const regCmd = `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exeName}" /ve`;
                const out = execSync(regCmd, { stdio: 'pipe', encoding: 'utf8', timeout: 1500 });
                if (out && out.includes('.exe')) return true;
            } catch (_) {}

            try {
                const regCmd2 = `reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exeName}" /ve`;
                const out2 = execSync(regCmd2, { stdio: 'pipe', encoding: 'utf8', timeout: 1500 });
                if (out2 && out2.includes('.exe')) return true;
            } catch (_) {}

            try {
                const cmd = `where ${entry.binary || entry.alias}`;
                execSync(cmd, { stdio: 'ignore', timeout: 1500 });
                return true;
            } catch (_) {}
        }

        return false;
    }
}

module.exports = new AppDiscovery();
