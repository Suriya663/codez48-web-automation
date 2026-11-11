/**
 * CODEZ48 INSTALLER HELPER
 * Searches Windows Package Manager (winget) packages and enforces strict explicit y/yes approval before installing.
 */

const { execSync } = require('child_process');

class InstallerHelper {
    searchPackage(appName) {
        if (!appName || process.platform !== 'win32') return null;

        try {
            console.log(`\x1b[36m[WINGET SEARCH] Inspecting package identity for: ${appName}...\x1b[0m`);
            const out = execSync(`winget search "${appName}"`, { stdio: 'pipe', encoding: 'utf8', timeout: 5000 });

            const lines = out.split('\n');
            for (const line of lines) {
                if (line.toLowerCase().includes(appName.toLowerCase())) {
                    const parts = line.split(/\s{2,}/);
                    if (parts.length >= 2) {
                        return { name: parts[0].trim(), id: parts[1].trim() };
                    }
                }
            }
        } catch (e) {}

        return null;
    }

    async promptAndInstall(appName, rl) {
        if (!appName) return { success: false, reason: 'No app name provided' };

        const pkgInfo = this.searchPackage(appName);
        const pkgId = pkgInfo ? pkgInfo.id : appName;

        console.log(`\n\x1b[33m[SOFTWARE INSTALLATION REQUESTED]\x1b[0m`);
        console.log(`App Name:   ${appName}`);
        console.log(`Package ID: ${pkgId}`);

        // Strict Approval Prompt: Empty Enter / 'n' / 'no' strictly declines
        const answer = await rl.question(`\nInstall package '${pkgId}' using winget? (y/n): `);
        const normAns = (answer || '').trim().toLowerCase();

        if (normAns !== 'y' && normAns !== 'yes') {
            console.log(`\x1b[33m[DECLINED] Software installation skipped by user.\x1b[0m\n`);
            return { success: false, declined: true };
        }

        console.log(`\x1b[36m[INSTALLING PACKAGE] Running winget install ${pkgId}...\x1b[0m`);

        try {
            const installCmd = `winget install --id "${pkgId}" --silent --accept-package-agreements --accept-source-agreements`;
            execSync(installCmd, { stdio: 'inherit', timeout: 120000 });
            console.log(`\x1b[32m✓ Package '${pkgId}' installed successfully!\x1b[0m\n`);
            return { success: true, packageId: pkgId };
        } catch (e) {
            console.error(`\x1b[31m[INSTALLATION FAILED] ${e.message}\x1b[0m\n`);
            return { success: false, error: e.message };
        }
    }
}

module.exports = new InstallerHelper();
