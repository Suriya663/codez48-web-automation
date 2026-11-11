/**
 * CODEZ48 UNIVERSAL REAL-TIME IN-PLACE FILE EDITOR ADAPTER
 * Performs surgical, in-place modifications across ANY file format:
 * - Code & Text files (.js, .py, .java, .cpp, .html, .css, .json, .txt, .md, .ini, etc.)
 * - Word documents (.docx) preserving paragraph/run styles, formatting & tables
 * - TrueType / OpenType font files (.ttf, .otf) updating name tables & metadata
 * - PDF documents (.pdf) performing targeted updates
 * Supports arbitrary file paths, automatic .bak backups, diff verification, and instant real-time opening.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const logger = require('../../core/logger');

class FileEditorAdapter {
    /**
     * Resolve arbitrary system paths (supports ~, env vars, forward/backward slashes, surrounding quotes)
     */
    resolveArbitraryPath(rawPath) {
        if (!rawPath) return null;
        let clean = String(rawPath).trim().replace(/^["']|["']$/g, '').trim();
        if (clean.startsWith('~')) {
            const home = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\suriya prakash';
            clean = path.join(home, clean.substring(1));
        }
        clean = clean.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');

        if (path.isAbsolute(clean) && fs.existsSync(clean)) {
            return path.resolve(clean);
        }

        // 1. Check inside active project directory
        const workspaceManager = require('../../core/workspace-manager');
        const activeProj = workspaceManager.getActiveProject();
        if (activeProj && fs.existsSync(path.join(activeProj, clean))) {
            return path.join(activeProj, clean);
        }

        // 2. Check Desktop directory
        const desktopP = workspaceManager.getDesktopPath();
        if (desktopP && fs.existsSync(path.join(desktopP, clean))) {
            return path.join(desktopP, clean);
        }

        // 3. Check preview workspace
        const workspaceP = workspaceManager.getWorkspacePath();
        if (workspaceP && fs.existsSync(path.join(workspaceP, clean))) {
            return path.join(workspaceP, clean);
        }

        // 4. Recursive search inside active project for matching filename
        if (activeProj && fs.existsSync(activeProj)) {
            const targetBase = path.basename(clean).toLowerCase();
            const findInDir = (dir) => {
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const e of entries) {
                        if (e.name === 'node_modules' || e.name === '.git') continue;
                        const full = path.join(dir, e.name);
                        if (e.isFile() && e.name.toLowerCase() === targetBase) return full;
                        if (e.isDirectory()) {
                            const found = findInDir(full);
                            if (found) return found;
                        }
                    }
                } catch (_) {}
                return null;
            };
            const matched = findInDir(activeProj);
            if (matched) return matched;
        }

        return path.resolve(clean);
    }

    /**
     * Terminate headless zombie Office processes or processes locking target document
     */
    safeUnlockFile(filePath) {
        if (process.platform === 'win32') {
            try {
                // 1. Terminate headless zombie Office processes
                const cmdZombie = `powershell -NoProfile -Command "Get-Process WINWORD,EXCEL,POWERPNT -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq '' } | Stop-Process -Force -ErrorAction SilentlyContinue"`;
                execSync(cmdZombie, { stdio: 'ignore', timeout: 5000 });

                if (filePath) {
                    const fileName = path.basename(filePath);
                    // 2. Terminate any WINWORD process that has this exact document open to clear exclusive lock
                    const cmdLock = `powershell -NoProfile -Command "$n='${fileName}'; Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like ('*' + $n + '*') } | Stop-Process -Force -ErrorAction SilentlyContinue"`;
                    execSync(cmdLock, { stdio: 'ignore', timeout: 5000 });

                    // 3. Remove orphaned temporary lock file (~$filename.docx) if present
                    const dir = path.dirname(filePath);
                    const lockFile = path.join(dir, `~$${fileName}`);
                    if (fs.existsSync(lockFile)) {
                        try { fs.unlinkSync(lockFile); } catch (_) {}
                    }
                }
            } catch (_) {}
        }
    }

    /**
     * Open file location in Windows Explorer with file selected
     */
    openFileLocation(filePath) {
        if (!filePath) return;
        try {
            logger.status(`\x1b[36m[FILE EXPLORER] Opening file location in Windows Explorer...\x1b[0m`);
            exec(`explorer.exe /select,"${filePath}"`);
        } catch (e) {
            logger.debug(`Could not open explorer: ${e.message}`);
        }
    }

    /**
     * Surgically edit any file in-place at specified location
     */
    async editFileInPlace(filePath, searchText, replaceText, options = {}) {
        if (!filePath) {
            return { success: false, error: 'MISSING_PATH', failureReason: 'File path is required for editing.' };
        }

        const resolvedPath = this.resolveArbitraryPath(filePath);
        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            logger.error(`\x1b[31m[FILE NOT FOUND] Path does not exist: "${filePath}"\x1b[0m`);
            return {
                success: false,
                error: 'FILE_NOT_FOUND',
                failureReason: `Target file was not found at resolved location: ${resolvedPath || filePath}`
            };
        }

        // Release any zombie headless process locks safely before editing
        this.safeUnlockFile(resolvedPath);

        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║                 UNIVERSAL REAL-TIME IN-PLACE FILE EDITOR                      ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.status(`\x1b[35m[FILE TARGET] Location: ${resolvedPath}\x1b[0m`);
        const operation = options.operation || 'EDIT';
        if (operation === 'REMOVE') {
            logger.status(`\x1b[33m[REMOVAL OPERATION] Surgically deleting target element/text: "${searchText || ('#' + (options.pointNumber || options.lineNumber))}"\x1b[0m`);
        } else if (operation === 'ADD') {
            logger.status(`\x1b[33m[ADD OPERATION] Directly adding Point / Content #${options.pointNumber || options.lineNumber || 'New'}\x1b[0m`);
        } else if (options.pointNumber) {
            logger.status(`\x1b[33m[EDIT OPERATION] Target: Point / Section #${options.pointNumber}\x1b[0m`);
        } else {
            logger.status(`\x1b[33m[EDIT OPERATION] Search: "${searchText}" ➔ Replace: "${replaceText}"\x1b[0m`);
        }

        const pythonScript = path.resolve(__dirname, '../drivers/file_editor_engine.py');
        const config = {
            filePath: resolvedPath,
            searchText: searchText || '',
            replaceText: replaceText !== undefined ? replaceText : '',
            lineNumber: options.lineNumber || null,
            pointNumber: options.pointNumber || null,
            operation: operation
        };

        const b64Config = Buffer.from(JSON.stringify(config)).toString('base64');

        try {
            const cmd = `python "${pythonScript}" "${b64Config}"`;
            const rawOutput = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 30000 }).trim();

            let result = null;
            try {
                result = JSON.parse(rawOutput);
            } catch (pErr) {
                logger.error(`[FILE EDITOR PARSE ERROR] Output: ${rawOutput}`);
                return { success: false, error: 'PARSER_ERROR', rawOutput };
            }

            if (result && result.success) {
                logger.user(`\x1b[32m✓ In-Place Modification Complete: ${path.basename(resolvedPath)}\x1b[0m`);
                logger.user(`\x1b[32m✓ File Type:     ${result.fileType}\x1b[0m`);
                if (result.operation === 'ADD' || operation === 'ADD') {
                    logger.user(`\x1b[32m✓ Added Point:   #${result.modifiedPoint || options.pointNumber}\x1b[0m`);
                } else if (result.modifiedPoint) {
                    logger.user(`\x1b[32m✓ Modified Point: #${result.modifiedPoint}\x1b[0m`);
                } else {
                    logger.user(`\x1b[32m✓ Replacements:  ${result.replacementCount}\x1b[0m`);
                }
                logger.user(`\x1b[32m✓ Backup Created: ${result.backupPath}\x1b[0m`);

                // If user requested opening file location (e.g. "open this file location")
                if (options.openLocation) {
                    this.openFileLocation(resolvedPath);
                }

                // If user requested opening file or default real-time inspection
                if (options.openAfterEdit !== false) {
                    try {
                        logger.status(`\x1b[36m[REAL-TIME OPEN] Opening modified file in associated application...\x1b[0m`);
                        const ext = path.extname(resolvedPath).toLowerCase();
                        if (['.pptx', '.ppt', '.docx', '.doc', '.xlsx', '.xls', '.csv'].includes(ext)) {
                            const officeLauncher = require('../drivers/office-launcher');
                            officeLauncher.openDocumentSafely(resolvedPath);
                        } else {
                            exec(`start "" "${resolvedPath}"`);
                        }
                    } catch (_) {}
                }

                return {
                    success: true,
                    filePath: resolvedPath,
                    fileType: result.fileType,
                    replacementCount: result.replacementCount,
                    modifiedPoint: result.modifiedPoint || null,
                    backupPath: result.backupPath,
                    lineModified: result.lineModified || null,
                    recordsModified: result.recordsModified || null,
                    operation: result.operation || operation
                };
            } else {
                logger.error(`\x1b[31m[FILE EDIT FAILED] ${result.error || 'Unknown error'}\x1b[0m`);
                return {
                    success: false,
                    error: 'EDIT_FAILED',
                    failureReason: result.error || 'File modification could not be completed.'
                };
            }
        } catch (execErr) {
            logger.error(`\x1b[31m[FILE EDITOR EXEC ERROR] ${execErr.message}\x1b[0m`);
            return {
                success: false,
                error: 'EXEC_ERROR',
                failureReason: execErr.message
            };
        }
    }

    /**
     * Surgically remove an element, line, or text passage across Word, PowerPoint, PDF, or Code
     */
    async removeFileContent(filePath, targetElement, options = {}) {
        return this.editFileInPlace(filePath, targetElement, '', {
            ...options,
            operation: 'REMOVE'
        });
    }

    /**
     * High-fidelity vector PDF conversion for Word (.docx), PowerPoint (.pptx), HTML, Markdown, and Code
     */
    async convertToPdf(filePath, outputPdf = null, options = {}) {
        if (!filePath) {
            return { success: false, error: 'MISSING_PATH', failureReason: 'File path is required for PDF conversion.' };
        }

        const resolvedPath = this.resolveArbitraryPath(filePath);
        if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            logger.error(`\x1b[31m[FILE NOT FOUND] Path does not exist: "${filePath}"\x1b[0m`);
            return {
                success: false,
                error: 'FILE_NOT_FOUND',
                failureReason: `Source file for PDF conversion was not found: ${resolvedPath || filePath}`
            };
        }

        const resolvedOutput = outputPdf ? this.resolveArbitraryPath(outputPdf) : null;
        this.safeUnlockFile(resolvedPath);

        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║                 UNIVERSAL HIGH-FIDELITY PDF CONVERSION ENGINE                 ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.status(`\x1b[35m[SOURCE FILE] ${resolvedPath}\x1b[0m`);

        const pythonScript = path.resolve(__dirname, '../drivers/file_editor_engine.py');
        const config = {
            action: 'CONVERT_TO_PDF',
            filePath: resolvedPath,
            outputPdf: resolvedOutput
        };

        const b64Config = Buffer.from(JSON.stringify(config)).toString('base64');

        try {
            const cmd = `python "${pythonScript}" "${b64Config}"`;
            const rawOutput = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 60000 }).trim();

            let result = null;
            try {
                result = JSON.parse(rawOutput);
            } catch (pErr) {
                logger.error(`[PDF CONVERSION PARSE ERROR] Output: ${rawOutput}`);
                return { success: false, error: 'PARSER_ERROR', rawOutput };
            }

            if (result && result.success) {
                logger.user(`\x1b[32m✓ PDF Successfully Created: ${result.outputPdf}\x1b[0m`);
                logger.user(`\x1b[32m✓ Conversion Engine: ${result.method}\x1b[0m`);
                logger.user(`\x1b[32m✓ PDF Size:          ${result.fileSize} bytes\x1b[0m`);

                if (options.openLocation) {
                    this.openFileLocation(result.outputPdf);
                }

                if (options.openAfterConvert !== false) {
                    try {
                        logger.status(`\x1b[36m[REAL-TIME VIEW] Opening exported PDF in default viewer...\x1b[0m`);
                        exec(`start "" "${result.outputPdf}"`);
                    } catch (_) {}
                }

                return {
                    success: true,
                    inputPath: resolvedPath,
                    outputPdf: result.outputPdf,
                    method: result.method,
                    fileSize: result.fileSize
                };
            } else {
                logger.error(`\x1b[31m[PDF CONVERSION FAILED] ${result.error || 'Conversion failed'}\x1b[0m`);
                return {
                    success: false,
                    error: 'CONVERSION_FAILED',
                    failureReason: result.error || 'Failed to convert file to PDF.'
                };
            }
        } catch (execErr) {
            logger.error(`\x1b[31m[PDF CONVERTER EXEC ERROR] ${execErr.message}\x1b[0m`);
            return {
                success: false,
                error: 'EXEC_ERROR',
                failureReason: execErr.message
            };
        }
    }

    // Backwards-compatible project file method
    async editProjectFile(filePath, searchText, replaceText, apiCall) {
        return this.editFileInPlace(filePath, searchText, replaceText);
    }
}

module.exports = new FileEditorAdapter();
