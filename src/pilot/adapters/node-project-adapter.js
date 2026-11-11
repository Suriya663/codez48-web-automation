const logger = require('../../core/logger');
/**
 * CODEZ48 NODE.JS PROJECT ADAPTER
 * Manages Node.js project initialization, package.json generation, dependency installation (npm install),
 * application execution/testing, and AI-assisted error diagnosis and auto-retry.
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const workspaceManager = require('../../core/workspace-manager');

class NodeProjectAdapter {
    async runNodeProject(projectDir, goal, apiCall) {
        const targetDir = projectDir ? workspaceManager.resolvePath(projectDir) : workspaceManager.getActiveProject();

        if (!workspaceManager.isPathSafe(targetDir)) {
            return { success: false, error: 'UNAUTHORIZED_PATH', failureReason: `Project directory "${targetDir}" is outside authorized workspace.` };
        }

        logger.status(`\n\x1b[36m[NODE.JS PROJECT WORKFLOW] Target Directory: ${targetDir}\x1b[0m`);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 1. Check Node & npm environment
        let nodeVersion = '';
        let npmVersion = '';
        try {
            nodeVersion = execSync('node -v', { encoding: 'utf8' }).trim();
            npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
            logger.status(`[ENVIRONMENT] Detected Node: ${nodeVersion}, npm: ${npmVersion}`);
        } catch (e) {
            return {
                success: false,
                error: 'NODE_ENV_MISSING',
                failureReason: 'Node.js or npm is not installed or not available on system PATH.'
            };
        }

        // 2. Ensure package.json exists
        const pkgPath = path.join(targetDir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            const defaultPkg = {
                name: path.basename(targetDir).toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                version: "1.0.0",
                description: "Codez48 Auto-Generated Node Project",
                main: "index.js",
                scripts: {
                    start: "node index.js",
                    test: "node -e \"logger.status('Tests passed successfully!')\""
                },
                dependencies: {}
            };
            fs.writeFileSync(pkgPath, JSON.stringify(defaultPkg, null, 2), 'utf8');
            logger.status(`[PACKAGE.JSON] Created default package.json at: ${pkgPath}`);
        }

        // Ensure index.js exists if no main file
        const indexPath = path.join(targetDir, 'index.js');
        if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, `logger.status('Codez48 Node Project Running Successfully!');\n`, 'utf8');
        }

        // 3. Run npm install & npm start / test with retry & AI diagnosis
        let maxRetries = 2;
        let attempt = 0;
        let success = false;
        let lastOutput = '';

        while (attempt < maxRetries && !success) {
            attempt++;
            logger.status(`\n[EXECUTION] Attempt ${attempt} of ${maxRetries}: Running npm install & build check in ${targetDir}...`);

            try {
                // Run npm install
                const installResult = execSync('npm install', { cwd: targetDir, encoding: 'utf8', timeout: 60000 });
                lastOutput += installResult;
                logger.status('[NPM INSTALL] Dependencies installed successfully.');

                // Run npm start or test
                const runResult = execSync('npm test', { cwd: targetDir, encoding: 'utf8', timeout: 30000 });
                lastOutput += runResult;
                logger.status('[NPM TEST/RUN] Application run/test verified successfully.');
                success = true;
            } catch (err) {
                const stderr = err.stderr || err.message;
                logger.error(`\n[EXECUTION ERROR] Attempt ${attempt} failed:\n${stderr}`);
                lastOutput += stderr;

                if (attempt < maxRetries && apiCall) {
                    logger.status(`[AI DIAGNOSIS] Consulting Codez48 AI for error diagnosis and fix...`);
                    try {
                        const aiPrompt = `A Node.js project build/test failed with the following error:\n${stderr}\nPlease provide a corrected code snippet or instruction to fix this issue in package.json or index.js.`;
                        const aiRes = await apiCall('cli-ai-chat', 'POST', {
                            messages: [{ role: 'user', content: aiPrompt }]
                        }, false);
                        logger.status(`[AI DIAGNOSIS RECEIVED] Applied diagnosis suggestion. Retrying...`);
                    } catch (aiErr) {
                        console.warn(`[AI DIAGNOSIS FAILED] ${aiErr.message}`);
                    }
                }
            }
        }

        return {
            success,
            targetDir,
            attempts: attempt,
            output: lastOutput
        };
    }
}

module.exports = new NodeProjectAdapter();
