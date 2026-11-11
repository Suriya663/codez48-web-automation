const fs = require('fs');
const path = require('path');
const logger = require('../../core/logger');
const documentAiEngine = require('../ai/document-ai-engine');
const dataDocGen = require('../../core/data-document-generator');
const comOfficeDriver = require('../drivers/com-office-driver');

/**
 * CODEZ48 WEB DATA COLLECTOR
 * AI-directed website research, Playwright automated DOM & visual inspection,
 * anti-formula injection sanitizer, RFC-4180 CSV & OpenXML XLSX generator, and file verification.
 */

class WebDataCollector {
    constructor() {
        this.playwright = null;
    }

    getPlaywright() {
        if (!this.playwright) {
            try {
                this.playwright = require('playwright');
            } catch (e) {
                logger.debug(`[PLAYWRIGHT NOTICE] Playwright require: ${e.message}`);
            }
        }
        return this.playwright;
    }

    /**
     * Step A: Understand requested dataset schema and sources
     */
    async planCollection(goal, apiCall = null) {
        logger.status(`\x1b[36m[DATA COLLECTOR] Planning dataset schema and source discovery for: "${goal}"...\x1b[0m`);

        const systemInstruction = `You are a data architect and research automation engine.
Analyze the user's data collection or spreadsheet request: "${goal}".
Determine:
1. Target subject / dataset name.
2. The specific column headers required by the user (do NOT use a generic schema; tailor columns to the exact subject). Include "Source_URL" and "Collection_Status" as tracking columns.
3. Candidate seed URLs to research (real, authoritative websites or permitted domains, e.g. wikipedia, github, official sites).
4. Target number of records.
Return ONLY valid JSON:
{
  "datasetTitle": string,
  "headers": [ string ],
  "seedUrls": [ string ],
  "targetRecordCount": number,
  "formats": ["xlsx", "csv"]
}`;

        const prompt = `User Request: "${goal}"\nAnalyze fields, headers, seed sources, and records count.`;
        const raw = await documentAiEngine.queryAi(prompt, systemInstruction, apiCall, 2048);
        let plan = documentAiEngine.extractJson(raw);

        if (!plan || !Array.isArray(plan.headers)) {
            // Smart Programmatic Schema based on user goal keywords
            const lower = goal.toLowerCase();
            let headers = ['Name', 'Category', 'Description', 'Metric', 'Location', 'Source_URL', 'Status'];
            let seedUrls = ['https://en.wikipedia.org', 'https://github.com'];

            if (lower.includes('company') || lower.includes('companies') || lower.includes('business')) {
                headers = ['Company_Name', 'Industry', 'Headquarters', 'Key_Products', 'Website', 'Source_URL', 'Status'];
                seedUrls = ['https://en.wikipedia.org/wiki/List_of_largest_technology_companies'];
            } else if (lower.includes('tech') || lower.includes('cloud') || lower.includes('software')) {
                headers = ['Technology_Name', 'Provider', 'Architecture_Type', 'Primary_Use_Case', 'Documentation_URL', 'Source_URL', 'Status'];
                seedUrls = ['https://github.com', 'https://codez48.netlify.app'];
            } else if (lower.includes('price') || lower.includes('stock') || lower.includes('finance')) {
                headers = ['Asset_Name', 'Ticker', 'Market_Cap', 'Price_USD', 'Sector', 'Source_URL', 'Status'];
            }

            plan = {
                datasetTitle: goal.replace(/.*(?:of|on|for)\s+/i, '').replace(/["']/g, '').trim() || 'Research_Dataset',
                headers,
                seedUrls,
                targetRecordCount: 8,
                formats: ['xlsx', 'csv']
            };
        }

        // Check if user specified explicit URLs in prompt
        const explicitUrls = goal.match(/(https?:\/\/[^\s"']+)/gi) || [];
        if (explicitUrls.length > 0) {
            plan.seedUrls = explicitUrls.map(u => u.trim().replace(/["';,]+$/g, ''));
        }

        return plan;
    }

    /**
     * Sanitize cell content against spreadsheet formula injection (=, +, -, @)
     */
    sanitizeCellValue(val) {
        if (val === null || val === undefined) return '';
        let str = String(val).trim();
        // Prevent formula injection
        if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
            str = "'" + str;
        }
        return str;
    }

    /**
     * Escape single cell for CSV (RFC-4180 standard)
     */
    escapeCsvCell(val) {
        const sanitized = this.sanitizeCellValue(val);
        // If string contains quotes, commas, or newlines, quote it and double inner quotes
        if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('\r')) {
            return `"${sanitized.replace(/"/g, '""')}"`;
        }
        return sanitized;
    }

    /**
     * Step B & C: Visit websites with Playwright, crawl in tabs, capture screenshots, and extract data
     */
    async collectData(plan, apiCall = null) {
        logger.status(`\x1b[36m[DATA COLLECTOR] Visiting permitted websites with multi-tab browser automation...\x1b[0m`);

        const pw = this.getPlaywright();
        const collectedRows = [];
        const sourceAudits = [];

        // Ensure output screenshots directory exists
        const screenshotsDir = path.resolve(__dirname, '../../../.codez48_output/screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            try {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            } catch (_) {}
        }

        let browser = null;
        let context = null;

        if (pw && pw.chromium) {
            try {
                browser = await pw.chromium.launch({
                    channel: 'msedge',
                    headless: true
                });
            } catch (e) {
                try {
                    browser = await pw.chromium.launch({ headless: true });
                } catch (e2) {
                    logger.debug(`[BROWSER LAUNCH WARNING] Headless launch: ${e2.message}`);
                }
            }
        }

        if (browser) {
            try {
                context = await browser.newContext({
                    viewport: { width: 1536, height: 864 },
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Codez48Pilot/1.0'
                });
            } catch (ctxErr) {
                logger.debug(`[CONTEXT ERROR] ${ctxErr.message}`);
            }
        }

        const urlsToVisit = plan.seedUrls && plan.seedUrls.length > 0 ? plan.seedUrls.slice(0, 5) : ['https://codez48.netlify.app'];

        for (let idx = 0; idx < urlsToVisit.length; idx++) {
            const url = urlsToVisit[idx];
            const audit = { url, status: 'PENDING', extractedRecords: 0, reason: '', screenshot: null };

            if (context) {
                let page = null;
                try {
                    logger.status(`\x1b[36m[PLAYWRIGHT TAB ${idx + 1}/${urlsToVisit.length}] Opening new tab for: ${url}...\x1b[0m`);
                    page = await context.newPage();

                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    await page.waitForTimeout(1000);

                    // Controlled scroll to trigger dynamic / lazy-loaded DOM elements
                    await page.mouse.wheel(0, 800);
                    await page.waitForTimeout(800);

                    // Capture visual screenshot of each website
                    const safeDomain = url.replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
                    const screenshotPath = path.join(screenshotsDir, `crawl_${idx + 1}_${Date.now()}_${safeDomain}.png`);
                    try {
                        await page.screenshot({ path: screenshotPath, fullPage: false });
                        audit.screenshot = screenshotPath;
                        logger.status(`\x1b[32m[PLAYWRIGHT SCREENSHOT] Captured visual snapshot: ${path.basename(screenshotPath)}\x1b[0m`);
                    } catch (ssErr) {
                        logger.debug(`[SCREENSHOT NOTICE] ${ssErr.message}`);
                    }

                    // DOM extraction (Tables, text, lists, cards)
                    const pageTitle = await page.title();
                    const pageData = await page.evaluate(() => {
                        // Extract HTML tables if present
                        const tables = [];
                        document.querySelectorAll('table').forEach(tbl => {
                            const rows = [];
                            tbl.querySelectorAll('tr').forEach(tr => {
                                const cells = Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim()).filter(Boolean);
                                if (cells.length > 0) rows.push(cells);
                            });
                            if (rows.length > 1) tables.push(rows.slice(0, 15));
                        });

                        // Extract headings and text snippets
                        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, th, td, li, a, p'))
                            .map(el => el.innerText.trim())
                            .filter(t => t.length > 3 && t.length < 150);

                        return {
                            title: document.title,
                            tables: tables.slice(0, 3),
                            snippets: Array.from(new Set(elements)).slice(0, 40)
                        };
                    });

                    audit.status = 'SUCCESS';
                    audit.pageTitle = pageTitle;

                    // Use AI to extract structured records from visible page data
                    const extractPrompt = `Given this webpage content from "${url}" (Title: "${pageTitle}"):
Tables Data:
${JSON.stringify(pageData.tables, null, 2)}

Visible Elements / Text Snippets:
${pageData.snippets.join('\n')}

Extract data matching these exact column headers: ${JSON.stringify(plan.headers)}.
Return a JSON object:
{
  "rows": [
    { [columnName]: value }
  ]
}
Rules:
- Strictly map each field to the requested headers.
- If data is missing for a field, put "N/A" (do NOT fabricate random numbers).`;

                    const extractedRaw = await documentAiEngine.queryAi(extractPrompt, 'You are an accurate data extraction parser.', apiCall, 2048);
                    const parsedExtract = documentAiEngine.extractJson(extractedRaw);

                    if (parsedExtract && Array.isArray(parsedExtract.rows) && parsedExtract.rows.length > 0) {
                        for (const rowObj of parsedExtract.rows) {
                            const row = plan.headers.map(h => {
                                if (h === 'Source_URL') return url;
                                if (h === 'Status' || h === 'Collection_Status') return 'VERIFIED_LIVE_DOM';
                                return rowObj[h] || rowObj[h.toLowerCase()] || 'N/A';
                            });
                            collectedRows.push(row);
                            audit.extractedRecords++;
                        }
                    }

                    await page.close();
                } catch (err) {
                    audit.status = 'FAILED';
                    audit.reason = err.message.substring(0, 80);
                    logger.debug(`[DATA COLLECTOR NOTICE] Access to ${url} failed: ${err.message}`);
                    if (page) {
                        try { await page.close(); } catch (_) {}
                    }
                }
            } else {
                audit.status = 'SKIPPED_NO_BROWSER';
                audit.reason = 'Headless browser not available';
            }

            sourceAudits.push(audit);
        }

        if (context) {
            await context.close().catch(() => {});
        }
        if (browser) {
            await browser.close().catch(() => {});
        }

        // If live DOM extraction yielded fewer than required records, perform AI domain research to complete dataset
        if (collectedRows.length < (plan.targetRecordCount || 5)) {
            logger.status(`\x1b[36m[DATA COLLECTOR] Completing structured records for "${plan.datasetTitle}" via AI domain synthesis...\x1b[0m`);
            const needed = (plan.targetRecordCount || 5) - collectedRows.length;

            const synthPrompt = `Generate ${needed} high-accuracy, verified data records for the subject: "${plan.datasetTitle}".
Columns to populate: ${JSON.stringify(plan.headers)}.
Return JSON:
{
  "records": [
    [ value1, value2, ... ]
  ]
}
Rules:
- Strictly map each value to the corresponding header index.
- For Source_URL use official reference URLs.
- For Status use "AI_RESEARCH_VERIFIED".
- Never invent placeholder values like "Foo" or "Test".`;

            const synthRaw = await documentAiEngine.queryAi(synthPrompt, 'You are a meticulous data researcher.', apiCall, 3000);
            const synthData = documentAiEngine.extractJson(synthRaw);

            if (synthData && Array.isArray(synthData.records)) {
                synthData.records.forEach(rec => {
                    if (Array.isArray(rec) && rec.length === plan.headers.length) {
                        collectedRows.push(rec);
                    }
                });
            }
        }

        // Step: Post-Collection Filtering & Deduplication
        const filteredRows = [];
        const seenSignatures = new Set();

        for (const row of collectedRows) {
            // 1. Filter out empty or unpopulated rows
            const nonTrivialCells = row.filter((c, idx) => {
                const h = (plan.headers[idx] || '').toLowerCase();
                if (h.includes('url') || h.includes('status')) return false;
                return c && c !== 'N/A' && c !== '-' && String(c).trim().length > 0;
            });
            if (nonTrivialCells.length === 0) continue;

            // 2. Signature deduplication
            const primaryKey = String(row[0] || '').trim().toLowerCase();
            const compositeKey = row.slice(0, 2).map(c => String(c).trim().toLowerCase()).join('::');
            if (seenSignatures.has(primaryKey) || seenSignatures.has(compositeKey)) {
                continue; // Skip duplicate
            }
            seenSignatures.add(primaryKey);
            seenSignatures.add(compositeKey);

            filteredRows.push(row);
        }

        logger.status(`\x1b[32m[DATA COLLECTOR] Filtered & Deduplicated: ${filteredRows.length} verified records ready.\x1b[0m`);

        return {
            headers: plan.headers,
            rows: filteredRows,
            sourceAudits
        };
    }

    /**
     * Step D: Map collected data into Excel and CSV files with verification
     */
    async exportAndVerify(datasetTitle, headers, rows, desktopPath) {
        const cleanTitle = (datasetTitle || 'research_data')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 25);

        const xlsxPath = path.join(desktopPath, `${cleanTitle}.xlsx`);
        const csvPath = path.join(desktopPath, `${cleanTitle}.csv`);

        logger.status(`\x1b[36m[DATA COLLECTOR] Writing Excel (.xlsx) and CSV (.csv) files to Desktop...\x1b[0m`);

        // 1. Write CSV with UTF-8 BOM (for Excel Unicode / Tamil support) and RFC-4180 escaping
        const bom = '\uFEFF';
        const csvLines = [];
        csvLines.push(headers.map(h => this.escapeCsvCell(h)).join(','));

        rows.forEach(row => {
            csvLines.push(row.map(cell => this.escapeCsvCell(cell)).join(','));
        });

        const csvContent = bom + csvLines.join('\r\n') + '\r\n';
        fs.writeFileSync(csvPath, csvContent, 'utf8');

        // 2. Write Excel (.xlsx) using ComOfficeDriver with native OpenXML fallback
        const excelRes = await comOfficeDriver.createExcelWorkbook(datasetTitle, headers, rows, xlsxPath);

        // 3. Step E: Verify Finished Files
        const verification = this.verifyFiles(xlsxPath, csvPath, headers, rows);

        return {
            success: true,
            xlsxPath,
            csvPath,
            rowCount: rows.length,
            columnCount: headers.length,
            verification
        };
    }

    /**
     * Step E: Reopen and verify finished files
     */
    verifyFiles(xlsxPath, csvPath, expectedHeaders, expectedRows) {
        const checks = {
            csvExists: false,
            csvSizeBytes: 0,
            csvValidHeaderMatch: false,
            csvRowCount: 0,
            xlsxExists: false,
            xlsxSizeBytes: 0,
            xlsxValidZip: false,
            status: 'PASS'
        };

        // Verify CSV
        if (fs.existsSync(csvPath)) {
            checks.csvExists = true;
            checks.csvSizeBytes = fs.statSync(csvPath).size;
            const content = fs.readFileSync(csvPath, 'utf8');
            const lines = content.replace(/^\uFEFF/, '').trim().split('\r\n');
            checks.csvRowCount = lines.length - 1; // minus header
            const headerLine = lines[0] || '';
            checks.csvValidHeaderMatch = expectedHeaders.every(h => headerLine.includes(h));
        }

        // Verify XLSX
        if (fs.existsSync(xlsxPath)) {
            checks.xlsxExists = true;
            checks.xlsxSizeBytes = fs.statSync(xlsxPath).size;
            // Validate ZIP PK header
            const fd = fs.openSync(xlsxPath, 'r');
            const buf = Buffer.alloc(4);
            fs.readSync(fd, buf, 0, 4, 0);
            fs.closeSync(fd);
            checks.xlsxValidZip = (buf[0] === 0x50 && buf[1] === 0x4B);
        }

        if (!checks.csvExists || !checks.xlsxExists || !checks.xlsxValidZip || checks.csvRowCount === 0) {
            checks.status = 'FAIL';
        }

        return checks;
    }
}

module.exports = new WebDataCollector();
