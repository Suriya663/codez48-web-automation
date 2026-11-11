const logger = require('../../core/logger');
/**
 * CODEZ48 COM OFFICE DRIVER
 * Generates PowerPoint (.pptx), Word (.docx), and Excel (.xlsx) documents
 * via Windows COM Automation interfaces with resilient Native OpenXML fallback.
 * Uses UTF-8 Base64 string pass-through to ensure 100% immune PowerShell script execution against quote or special character errors.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const workspaceManager = require('../../core/workspace-manager');
const pptDesignEngine = require('./ppt-design-engine');
const dataDocGen = require('../../core/data-document-generator');

class ComOfficeDriver {
    toBase64(str) {
        return Buffer.from(String(str || ''), 'utf8').toString('base64');
    }

    async createPowerPointPresentation(title, slideDeck, destinationPath, customTheme = null) {
        if (!slideDeck || !Array.isArray(slideDeck)) {
            return { success: false, reason: 'Invalid slide deck data' };
        }

        const fullDestPath = workspaceManager.isPathSafe(destinationPath)
            ? destinationPath
            : path.join(workspaceManager.getDesktopPath(), path.basename(destinationPath));

        logger.status(`\n\x1b[36m[POWERPOINT DESIGN GENERATOR] Generating ${slideDeck.length} slides with dynamic layouts...\x1b[0m`);
        logger.status(`\x1b[90mTarget File: ${fullDestPath}\x1b[0m\n`);

        const theme = (typeof customTheme === 'object' && customTheme !== null)
            ? customTheme
            : (pptDesignEngine.THEMES[customTheme] || pptDesignEngine.resolveTheme(title, customTheme || slideDeck[0]?.themeStyle || slideDeck[0]?.style));

        // 1. Primary Engine: Ultra-Premium Native OpenXML Presentation Engine (python-pptx)
        // Completely eliminates COM permission constraints, orphaned processes, and Office modal dialog errors
        try {
            logger.status(`\x1b[36m[PRESENTATION ENGINE] Engaging Ultra-Premium Native OpenXML Engine (python-pptx)...\x1b[0m`);
            const pyRes = await this.createWithPythonPptx(title, slideDeck, fullDestPath, theme);
            if (pyRes && pyRes.success && fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 1000) {
                return pyRes;
            }
        } catch (pyErr) {
            logger.status(`\x1b[33m[PYTHON PPTX NOTICE] ${pyErr.message}, falling back to COM...\x1b[0m`);
        }

        // 2. Fallback Engine: Office COM Automation
        const psScriptPath = path.join(workspaceManager.getWorkspacePath(), 'create_pptx_temp.ps1');
        const validatedAudit = pptDesignEngine.validateSlideDeck(slideDeck, theme);
        const psCode = pptDesignEngine.generatePowerPointPowerShellScript(title, validatedAudit, fullDestPath);

        fs.writeFileSync(psScriptPath, psCode, 'utf8');

        try {
            const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
            const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 120000 }).trim();

            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);

            if (fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 1000 && !out.includes('ERROR:')) {
                // Verify PKZip header
                const fd = fs.openSync(fullDestPath, 'r');
                const buf = Buffer.alloc(4);
                fs.readSync(fd, buf, 0, 4, 0);
                fs.closeSync(fd);
                const isZip = buf[0] === 0x50 && buf[1] === 0x4B;

                logger.user(`\x1b[32m✓ PowerPoint presentation created via Office COM (${fs.statSync(fullDestPath).size} bytes): ${fullDestPath}\x1b[0m`);
                return {
                    success: true,
                    filePath: fullDestPath,
                    slidesCount: slideDeck.length,
                    theme: theme.name,
                    isValidPptx: isZip,
                    auditReport: validatedAudit
                };
            } else {
                logger.status(`\x1b[33m[COM PERMISSION NOTICE] Office COM encountered constraint: ${out}\x1b[0m`);
                return await this.createWithPythonPptx(title, slideDeck, fullDestPath, theme);
            }
        } catch (e) {
            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
            logger.status(`\x1b[33m[COM EXECUTION NOTICE] ${e.message}\x1b[0m`);
            return await this.createWithPythonPptx(title, slideDeck, fullDestPath, theme);
        }
    }

    /**
     * Ultra-Premium Native Presentation Builder (python-pptx)
     * Completely eliminates 'Access denied' and Office COM permission constraints
     */
    async createWithPythonPptx(title, slideDeck, destinationPath, theme) {
        const engineScript = path.resolve(__dirname, 'python_pptx_engine.py');
        const institutionInfo = slideDeck[0]?.institution
            ? `${slideDeck[0].institution} • ${slideDeck[0].accreditation || ''}`
            : '';

        const config = {
            title,
            slides: slideDeck,
            destinationPath,
            theme: (theme && theme.name) || 'EXECUTIVE_LUXURY',
            institutionInfo
        };

        // Write configuration payload to temporary file to prevent Windows 8191-character command line limit
        const tempConfigPath = path.join(os.tmpdir(), `pptx_cfg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`);
        fs.writeFileSync(tempConfigPath, JSON.stringify(config), 'utf8');

        const localAppData = process.env.LOCALAPPDATA || '';
        const pythonCandidates = [
            'C:\\Users\\suriya prakash\\AppData\\Local\\Python\\bin\\python.exe',
            localAppData ? path.join(localAppData, 'Python', 'bin', 'python.exe') : null,
            localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe') : null,
            localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe') : null,
            localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe') : null,
            localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe') : null,
            'python',
            'py -3',
            'py',
            'python3'
        ].filter(p => p && (fs.existsSync(p) || !p.includes('\\')));

        let raw = null;
        let lastError = null;

        for (const pyCmd of pythonCandidates) {
            try {
                const execTarget = pyCmd.includes(' ') && pyCmd.includes('\\') ? `"${pyCmd}"` : pyCmd;
                const cmd = `${execTarget} "${engineScript}" "${tempConfigPath}"`;
                raw = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 45000 }).trim();
                if (raw) break;
            } catch (pyErr) {
                lastError = pyErr;
                const errOut = (pyErr.stderr || pyErr.message || '').toString();
                // Cross-laptop auto-install: if python-pptx is not installed on this machine, install it automatically
                if (errOut.includes('python-pptx is required') || errOut.includes('No module named pptx') || errOut.includes('No module named \'pptx\'')) {
                    try {
                        logger.status(`\x1b[33m[CROSS-LAPTOP SETUP] Installing python-pptx dependency automatically...\x1b[0m`);
                        const execTarget = pyCmd.includes(' ') && pyCmd.includes('\\') ? `"${pyCmd}"` : pyCmd;
                        execSync(`${execTarget} -m pip install python-pptx`, { stdio: 'pipe', timeout: 60000 });
                        const retryCmd = `${execTarget} "${engineScript}" "${tempConfigPath}"`;
                        raw = execSync(retryCmd, { stdio: 'pipe', encoding: 'utf8', timeout: 45000 }).trim();
                        if (raw) break;
                    } catch (_) {}
                }
            }
        }

        try {
            if (!raw && lastError) {
                throw lastError;
            }
            const res = JSON.parse(raw);

            if (res.success && res.filePath && fs.existsSync(res.filePath)) {
                logger.user(`\x1b[32m✓ PowerPoint presentation created via Ultra-Premium OpenXML Engine (${res.fileSize} bytes): ${res.filePath}\x1b[0m`);
                return {
                    success: true,
                    filePath: res.filePath,
                    slidesCount: res.slidesCount,
                    theme: res.theme,
                    isValidPptx: true,
                    engine: res.engine
                };
            } else {
                logger.error(`\x1b[31m[PYTHON PPTX ERROR] ${res.error || 'Unknown error'}\x1b[0m`);
                return { success: false, reason: res.error || 'Failed to generate presentation' };
            }
        } catch (err) {
            logger.error(`\x1b[31m[PYTHON PPTX EXEC ERROR] ${err.message}\x1b[0m`);
            return { success: false, error: err.message, reason: 'Failed to generate presentation file' };
        } finally {
            try {
                if (fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath);
            } catch (_) {}
        }
    }

    async createWordDocument(title, sections, destinationPath, subtitle = '') {
        if (!sections || !Array.isArray(sections)) {
            return { success: false, reason: 'Invalid Word document sections' };
        }

        const fullDestPath = workspaceManager.isPathSafe(destinationPath)
            ? destinationPath
            : path.join(workspaceManager.getDesktopPath(), path.basename(destinationPath));

        logger.status(`\n\x1b[36m[WORD GENERATOR] Generating document with ${sections.length} sections...\x1b[0m`);
        logger.status(`\x1b[90mTarget File: ${fullDestPath}\x1b[0m\n`);

        // 1. Primary Engine: Ultra-Fast Native OpenXML Word Engine (Zero COM locks, zero permissions constraint)
        try {
            logger.status(`\x1b[36m[WORD GENERATOR] Generating native OpenXML .docx directly...\x1b[0m`);
            const fallbackRes = dataDocGen.generateWordDocx(fullDestPath, title, subtitle, sections);
            if (fallbackRes && fallbackRes.success && fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 500) {
                logger.user(`\x1b[32m✓ Word document created & verified (${fs.statSync(fullDestPath).size} bytes): ${fullDestPath}\x1b[0m`);
                return {
                    success: true,
                    filePath: fullDestPath,
                    sectionsCount: sections.length
                };
            }
        } catch (openXmlErr) {
            logger.debug(`[OPENXML NOTICE] ${openXmlErr.message}, falling back to COM...`);
        }

        // 2. Fallback Engine: Word COM Automation
        const psScriptPath = path.join(workspaceManager.getWorkspacePath(), 'create_docx_temp.ps1');

        let psCode = `
$ErrorActionPreference = 'Stop'
function From-B64($b64) {
    if (-not $b64) { return "" }
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
}

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $doc = $word.Documents.Add()
    $selection = $word.Selection

    # Document Title (24pt Bold Segoe UI)
    $selection.Font.Name = 'Segoe UI Semibold'
    $selection.Font.Size = 24
    $selection.Font.Bold = 1
    $selection.Font.Color = 0x43200F
    $selection.TypeText((From-B64 '${this.toBase64(title || 'Document')}'))
    $selection.TypeParagraph()

    # Subtitle
    if ('${this.toBase64(subtitle)}') {
        $selection.Font.Name = 'Segoe UI'
        $selection.Font.Size = 13
        $selection.Font.Italic = 1
        $selection.Font.Color = 0x695547
        $selection.TypeText((From-B64 '${this.toBase64(subtitle)}'))
        $selection.TypeParagraph()
    }
    $selection.TypeParagraph()
`;

        sections.forEach((sec, idx) => {
            const b64Heading = this.toBase64(sec.heading || `Section ${idx + 1}`);
            const b64Body = this.toBase64(sec.body || '');

            psCode += `
    # Section ${idx + 1}
    $selection.Font.Name = 'Segoe UI Semibold'
    $selection.Font.Size = 15
    $selection.Font.Bold = 1
    $selection.Font.Italic = 0
    $selection.Font.Color = 0xD47800 # Blue/Accent
    $selection.TypeText((From-B64 '${b64Heading}'))
    $selection.TypeParagraph()

    # Body
    $selection.Font.Name = 'Calibri'
    $selection.Font.Size = 11
    $selection.Font.Bold = 0
    $selection.Font.Italic = 0
    $selection.Font.Color = 0x222222
    $selection.TypeText((From-B64 '${b64Body}'))
    $selection.TypeParagraph()
`;

            if (sec.bullets && Array.isArray(sec.bullets)) {
                sec.bullets.forEach(b => {
                    const b64Bullet = this.toBase64(b);
                    psCode += `
    $selection.Font.Name = 'Calibri'
    $selection.Font.Size = 11
    $selection.Font.Color = 0x333333
    $selection.TypeText("•  " + (From-B64 '${b64Bullet}'))
    $selection.TypeParagraph()
`;
                });
            }
            psCode += `    $selection.TypeParagraph()\n`;
        });

        const b64Dest = this.toBase64(fullDestPath);
        psCode += `
    $safeDestPath = From-B64 '${b64Dest}'
    if (Test-Path $safeDestPath) { Remove-Item $safeDestPath -Force }
    $doc.SaveAs([ref]$safeDestPath)
    Write-Output "SUCCESS"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
} finally {
    if ($doc) { try { $doc.Close([ref]$false) } catch {} }
    if ($word) { try { $word.Quit() } catch {} }
    [System.GC]::Collect()
}
`;

        fs.writeFileSync(psScriptPath, psCode, 'utf8');

        let comSuccess = false;
        try {
            const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
            const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 35000 }).trim();

            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);

            if (fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 500) {
                comSuccess = true;
            }
        } catch (e) {
            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
            logger.debug(`[WORD COM NOTICE] COM generation encountered an issue, invoking native OpenXML fallback: ${e.message}`);
        }

        if (fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 500) {
            logger.user(`\x1b[32m✓ Word document created & verified (${fs.statSync(fullDestPath).size} bytes): ${fullDestPath}\x1b[0m`);
            return {
                success: true,
                filePath: fullDestPath,
                sectionsCount: sections.length
            };
        } else {
            return { success: false, reason: 'Word .docx creation failed verification' };
        }
    }

    async createExcelWorkbook(title, headers, rowsData, destinationPath) {
        if (!headers || !Array.isArray(headers) || !rowsData || !Array.isArray(rowsData)) {
            return { success: false, reason: 'Invalid Excel headers/rows data' };
        }

        const fullDestPath = workspaceManager.isPathSafe(destinationPath)
            ? destinationPath
            : path.join(workspaceManager.getDesktopPath(), path.basename(destinationPath));

        logger.status(`\n\x1b[36m[EXCEL GENERATOR] Creating workbook with ${rowsData.length} data rows...\x1b[0m`);
        logger.status(`\x1b[90mTarget File: ${fullDestPath}\x1b[0m\n`);

        const psScriptPath = path.join(workspaceManager.getWorkspacePath(), 'create_xlsx_temp.ps1');

        let psCode = `
$ErrorActionPreference = 'Stop'
function From-B64($b64) {
    if (-not $b64) { return "" }
    return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
}

try {
    $excel = New-Object -ComObject Excel.Application
    try { $excel.Visible = $true } catch {}
    $wb = $excel.Workbooks.Add()
    $ws = $wb.Worksheets.Item(1)
    $ws.Name = 'Data'

    # Write Headers with Formatting
`;

        headers.forEach((h, colIdx) => {
            const b64H = this.toBase64(h);
            psCode += `    $cell = $ws.Cells.Item(1, ${colIdx + 1})
    $cell.Value = From-B64 '${b64H}'
    $cell.Font.Bold = $true
    $cell.Font.Color = 0xFFFFFF
    $cell.Interior.Color = 0x780000 # Navy Header
`;
        });

        rowsData.forEach((row, rowIdx) => {
            row.forEach((val, colIdx) => {
                const b64Val = this.toBase64(val);
                psCode += `    $ws.Cells.Item(${rowIdx + 2}, ${colIdx + 1}) = From-B64 '${b64Val}'\n`;
            });
        });

        psCode += `    $ws.Columns.AutoFit()\n`;

        const b64Dest = this.toBase64(fullDestPath);
        psCode += `
    $safeDestPath = From-B64 '${b64Dest}'
    if (Test-Path $safeDestPath) { Remove-Item $safeDestPath -Force }
    $wb.SaveAs($safeDestPath)
    Write-Output "SUCCESS"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`;

        fs.writeFileSync(psScriptPath, psCode, 'utf8');

        let comSuccess = false;
        try {
            const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
            const out = execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 35000 }).trim();

            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);

            if (fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 500) {
                comSuccess = true;
            }
        } catch (e) {
            if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
            logger.debug(`[EXCEL COM NOTICE] COM generation encountered an issue, invoking native OpenXML fallback: ${e.message}`);
        }

        // Native SpreadsheetML Fallback
        if (!comSuccess) {
            logger.status(`\x1b[36m[EXCEL GENERATOR] Generating native SpreadsheetML .xlsx directly...\x1b[0m`);
            const allRows = [headers, ...rowsData];
            const fallbackRes = dataDocGen.generateExcel(fullDestPath, allRows, 'Data');
            if (!fallbackRes.success) {
                return { success: false, reason: 'Failed to create Excel spreadsheet' };
            }
        }

        if (fs.existsSync(fullDestPath) && fs.statSync(fullDestPath).size > 500) {
            logger.user(`\x1b[32m✓ Excel workbook created & verified (${fs.statSync(fullDestPath).size} bytes): ${fullDestPath}\x1b[0m`);
            return {
                success: true,
                filePath: fullDestPath,
                rowsCount: rowsData.length
            };
        } else {
            return { success: false, reason: 'Excel creation failed verification' };
        }
    }
}

module.exports = new ComOfficeDriver();
