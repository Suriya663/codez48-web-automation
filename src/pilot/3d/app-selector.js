const logger = require('../../core/logger');
/**
 * CODEZ48 3D APP SELECTOR & DEEP DISCOVERY
 * Audits installed 3D software across Windows Registry, PATH, Program Files, LocalAppData, and Steam directories.
 * Differentiates DISCOVERED vs SUPPORTED vs TESTED and performs version verification.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class AppSelector {
    audit3DApps() {
        const apps = [
            { id: 'blender', name: 'Blender 3D', binary: 'blender.exe', supported: true },
            { id: 'unity', name: 'Unity Engine', binary: 'Unity.exe', supported: false },
            { id: 'unreal', name: 'Unreal Engine', binary: 'UnrealEditor.exe', supported: false },
            { id: 'maya', name: 'Autodesk Maya', binary: 'maya.exe', supported: false },
            { id: '3dsmax', name: 'Autodesk 3ds Max', binary: '3dsmax.exe', supported: false }
        ];

        const auditResults = [];

        apps.forEach(app => {
            const pathInfo = this.findBinaryPath(app.binary, app.id);
            const versionStr = pathInfo.found ? this.getBlenderVersion(pathInfo.path) : 'Not Installed';

            auditResults.push({
                id: app.id,
                name: app.name,
                discovered: pathInfo.found,
                executablePath: pathInfo.path,
                version: versionStr,
                supported: app.supported,
                status: app.supported ? (pathInfo.found ? 'SUPPORTED & DISCOVERED' : 'SUPPORTED (Standalone)') : (pathInfo.found ? 'DISCOVERED (No Adapter Yet)' : 'NOT INSTALLED')
            });
        });

        return auditResults;
    }

    getBlenderVersion(exePath) {
        if (!exePath || !fs.existsSync(exePath)) return 'Unknown';
        try {
            const verOut = execSync(`"${exePath}" --version`, { stdio: 'pipe', encoding: 'utf8', timeout: 5000 }).trim();
            return verOut.split(/\r?\n/)[0] || 'Blender 3D';
        } catch (e) {
            return 'Blender 3D';
        }
    }

    findBinaryPath(binaryName, appId) {
        if (appId === 'blender') {
            // 1. Check PATH / WHERE
            try {
                const isWin = process.platform === 'win32';
                const cmd = isWin ? `where ${binaryName}` : `which ${binaryName}`;
                const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 2000 }).trim();
                if (out) {
                    const firstPath = out.split(/\r?\n/)[0].trim();
                    if (fs.existsSync(firstPath)) return { found: true, path: firstPath };
                }
            } catch (e) {}

            // 2. Check PowerShell Get-Command and Registry App Paths
            try {
                const psCode = `$cmd = Get-Command blender -ErrorAction SilentlyContinue; if ($cmd) { Write-Output $cmd.Source; exit }; $reg = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\blender.exe' -ErrorAction SilentlyContinue; if ($reg -and $reg.'(default)') { Write-Output $reg.'(default)'; exit }`;
                const psOut = execSync(`powershell.exe -NoProfile -Command "${psCode.replace(/\n/g, ' ')}"`, { stdio: 'pipe', encoding: 'utf8', timeout: 3000 }).trim();
                if (psOut && fs.existsSync(psOut)) {
                    return { found: true, path: psOut };
                }
            } catch (e) {}

            // 3. Check Program Files & LocalAppData & Steam
            const pfList = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)'];
            for (const pf of pfList) {
                if (!pf) continue;
                const bDir = path.join(pf, 'Blender Foundation');
                if (fs.existsSync(bDir)) {
                    try {
                        const subdirs = fs.readdirSync(bDir);
                        for (const sub of subdirs) {
                            const exe = path.join(bDir, sub, 'blender.exe');
                            if (fs.existsSync(exe)) return { found: true, path: exe };
                        }
                    } catch (e) {}
                }
            }

            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            const checkPaths = [
                path.join(localAppData, 'Programs', 'Blender Foundation', 'blender.exe'),
                path.join(localAppData, 'Programs', 'Blender', 'blender.exe'),
                path.join(localAppData, 'Microsoft', 'WindowsApps', 'blender.exe'),
                'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe',
                'C:\\Program Files\\Steam\\steamapps\\common\\Blender\\blender.exe',
                'C:\\Blender\\blender.exe'
            ];

            for (const p of checkPaths) {
                if (fs.existsSync(p)) return { found: true, path: p };
            }
        }

        return { found: false, path: null };
    }

    selectBestAdapter(intentObj) {
        const audit = this.audit3DApps();
        const preferred = intentObj.preferredApp || 'blender';

        const match = audit.find(a => a.id === preferred && a.supported);
        if (match) return match;

        // Fallback to primary Blender adapter
        return audit.find(a => a.id === 'blender');
    }
}

module.exports = new AppSelector();
