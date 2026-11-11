const logger = require('../../core/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const Codez48ScrapEngine = require('../../scrap/scrap-engine');

class WebsiteExtractionWorkflow {
    async executeWorkflow(goal, apiCall, rl) {
        logger.status('\n==================================================');
        logger.status('   CODEZ48 PILOT: WEBSITE CODE EXTRACTION & AI REPAIR   ');
        logger.status('==================================================\n');

        // 1. Extract URL or Domain from Goal
        let targetUrl = null;
        const urlMatch = goal.match(/(https?:\/\/[^\s"']+)/i);
        if (urlMatch) {
            targetUrl = urlMatch[1].replace(/[,;.'"\x5D\)]+$/g, '');
        } else {
            const domainMatch = goal.match(/\b([a-zA-Z0-9\-]+\.(?:com|org|net|app|io|dev|ai|tv|co|in|netlify\.app))\b/i);
            if (domainMatch) {
                targetUrl = 'https://' + domainMatch[1];
            } else if (goal.toLowerCase().includes('aistudio') || goal.toLowerCase().includes('ai studio')) {
                targetUrl = 'https://aistudio.google.com/';
            } else if (goal.toLowerCase().includes('codez48')) {
                targetUrl = 'https://codez48.netlify.app/';
            }
        }

        if (!targetUrl) {
            return {
                success: false,
                error: 'MISSING_URL',
                failureReason: 'No valid website URL or domain found in goal prompt.'
            };
        }
        logger.status(`[WORKFLOW] Extracted target URL: "${targetUrl}"`);

        // 2. Run Scrap Engine
        const scrapEngine = new Codez48ScrapEngine();
        const scrapResult = await scrapEngine.runScrapWorkflow(targetUrl, { allowOfficial: true });

        if (!scrapResult.success) {
            logger.error(`[WORKFLOW ERROR] Scraping failed: ${scrapResult.failureReason}`);
            return {
                success: false,
                error: scrapResult.error || 'SCRAP_FAILED',
                failureReason: scrapResult.failureReason
            };
        }

        // 3. Verify ZIP Integrity
        const zipPath = scrapResult.zipFilePath;
        if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
            return {
                success: false,
                error: 'INVALID_ZIP',
                failureReason: `Generated ZIP archive is missing or empty at: ${zipPath}`
            };
        }

        const fd = fs.openSync(zipPath, 'r');
        const magicBuf = Buffer.alloc(4);
        fs.readSync(fd, magicBuf, 0, 4, 0);
        fs.closeSync(fd);

        if (magicBuf[0] !== 0x50 || magicBuf[1] !== 0x4b || magicBuf[2] !== 0x03 || magicBuf[3] !== 0x04) {
            return {
                success: false,
                error: 'INVALID_ZIP_SIGNATURE',
                failureReason: 'Generated ZIP archive does not have valid PKZip magic bytes.'
            };
        }
        logger.status(`[ZIP VERIFIED] PKZip archive signature verified successfully (${fs.statSync(zipPath).size} bytes).`);

        // 4. Copy to Unique Workspace Project Folder
        const parsedUrl = new URL(targetUrl);
        const domainSlug = parsedUrl.hostname.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const workspaceDir = path.join(os.homedir(), 'Desktop', 'Codez48 Preview', `extracted_${domainSlug}_${timestamp}`);

        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
        }

        const copyFolderRecursive = (src, dest) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);
                if (entry.isDirectory()) {
                    copyFolderRecursive(srcPath, destPath);
                } else if (entry.isFile()) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        };

        copyFolderRecursive(scrapResult.outputFolder, workspaceDir);
        logger.status(`[WORKSPACE] Project files successfully extracted to unique folder: ${workspaceDir}`);

        // 5. Open in Visual Studio Code
        let vsCodeOpened = false;
        try {
            exec(`code "${workspaceDir}"`, (err) => {
                if (!err) logger.status(`[VS CODE] Successfully opened project directory in Visual Studio Code.`);
            });
            vsCodeOpened = true;
        } catch (e) {
            console.warn(`[VS CODE WARNING] Could not launch VS Code automatically: ${e.message}`);
        }

        // 6. AI-Assisted Missing JavaScript Detection & Repair
        let aiRepairPerformed = false;
        let repairedFiles = [];
        try {
            const indexPath = path.join(workspaceDir, 'index.html');
            if (fs.existsSync(indexPath) && apiCall) {
                const htmlContent = fs.readFileSync(indexPath, 'utf8');
                const scriptMatches = Array.from(htmlContent.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)).map(m => m[1]);

                logger.status(`[AI ANALYSIS] Inspected index.html. Referenced scripts: ${scriptMatches.join(', ') || 'None'}`);

                // Check for missing or empty local scripts
                for (const scriptSrc of scriptMatches) {
                    if (!scriptSrc.startsWith('http://') && !scriptSrc.startsWith('https://')) {
                        const localScriptPath = path.join(workspaceDir, scriptSrc);
                        const scriptDir = path.dirname(localScriptPath);
                        if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });

                        const isMissingOrEmpty = !fs.existsSync(localScriptPath) || fs.statSync(localScriptPath).size < 10;
                        if (isMissingOrEmpty) {
                            logger.status(`[AI REPAIR] Script "${scriptSrc}" is missing or empty. Requesting AI-assisted JavaScript repair...`);

                            const aiPrompt = `We extracted a website from ${targetUrl}. The HTML references script "${scriptSrc}" which was inaccessible or missing. Please write clean, compatible, self-contained JavaScript code to implement standard interactive behavior (such as UI handlers, navigation events, and DOM initialization) for this script. Return only valid JavaScript code.`;

                            const aiData = await apiCall('cli-ai-chat', 'POST', {
                                messages: [{ role: 'user', content: aiPrompt }]
                            }, false);

                            const aiCode = aiData?.answer || aiData?.content || aiData?.code;
                            if (aiCode && typeof aiCode === 'string' && aiCode.length > 20) {
                                if (fs.existsSync(localScriptPath)) {
                                    fs.copyFileSync(localScriptPath, `${localScriptPath}.bak`);
                                }
                                fs.writeFileSync(localScriptPath, aiCode, 'utf8');
                                repairedFiles.push(scriptSrc);
                                aiRepairPerformed = true;
                                logger.status(`\x1b[32m[AI REPAIR SUCCESS] Repaired/Generated JavaScript for "${scriptSrc}"\x1b[0m`);
                            }
                        }
                    }
                }
            }
        } catch (aiErr) {
            console.warn(`[AI REPAIR NOTICE] AI repair step skipped or unavailable: ${aiErr.message}`);
        }

        logger.status('\n==================================================');
        logger.user('   WEBSITE EXTRACTION & REPAIR COMPLETED SUCCESSFUL ');
        logger.status('==================================================');
        logger.status(` Target URL:      ${targetUrl}`);
        logger.status(` Project Folder:  ${workspaceDir}`);
        logger.status(` ZIP Archive:     ${zipPath}`);
        logger.status(` VS Code Status:  ${vsCodeOpened ? 'Launched' : 'Skipped/Unavailable'}`);
        logger.status(` AI JS Repairs:   ${repairedFiles.length > 0 ? repairedFiles.join(', ') : 'None required'}`);
        logger.status('==================================================\n');

        return {
            success: true,
            targetUrl,
            outputFolder: workspaceDir,
            zipFilePath: zipPath,
            vsCodeOpened,
            aiRepairPerformed,
            repairedFiles,
            successfulCount: scrapResult.successfulCount,
            failedCount: scrapResult.failedCount
        };
    }
}

module.exports = new WebsiteExtractionWorkflow();
