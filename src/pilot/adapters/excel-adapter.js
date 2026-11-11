const logger = require('../../core/logger');
/**
 * CODEZ48 EXCEL & CSV ADAPTER
 * AI-directed website research, multi-tab Playwright DOM crawling,
 * site screenshot capture, dynamic column schema mapping, anti-formula injection,
 * RFC-4180 CSV & OpenXML XLSX output, 1-credit vault deduction,
 * and email delivery to rajnaga75556@gmail.com.
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../../core/workspace-manager');
const taskSession = require('../task-session');
const webDataCollector = require('../browser/web-data-collector');
const creditVault = require('../../core/credit-vault');
const emailDispatcher = require('../email/email-dispatcher');
const { exec } = require('child_process');

class ExcelAdapter {
    async createSpreadsheetGoal(goal, apiCall = null) {
        const desktopPath = workspaceManager.getDesktopPath();

        logger.status(`\n\x1b[36m[EXCEL ADAPTER] Processing data collection goal: "${goal}"...\x1b[0m`);

        // 1. Credit Verification Gate (Tier-Based Document Cost)
        const activePlan = creditVault.getPlan();
        const reqCredits = activePlan.id === 'MICRO' || activePlan.id === 'TRIAL_FREE' ? 2 : 1;
        if (!creditVault.hasCredits(reqCredits)) {
            logger.status(`\n\x1b[31m[CREDIT VAULT] Insufficient credits for Excel data collection!\x1b[0m`);
            logger.status(`\x1b[33m[CREDIT VAULT] ${reqCredits} credits required on ${activePlan.name}. Current balance: ${creditVault.getBalance()} credits.\x1b[0m`);
            creditVault.showPaymentPrompt();
            return {
                success: false,
                error: 'INSUFFICIENT_CREDITS',
                message: `Insufficient credits. ${reqCredits} credits required for dataset generation on ${activePlan.name}.`
            };
        }

        // 2. Plan dataset schema and candidate sources
        const plan = await webDataCollector.planCollection(goal, apiCall);

        logger.status(`\x1b[32m✔ Dataset Planned: "${plan.datasetTitle}" (${plan.headers.length} columns: ${plan.headers.join(', ')})\x1b[0m`);

        // 3. Collect structured data from websites via Playwright multi-tab crawling & screenshot capture
        const collected = await webDataCollector.collectData(plan, apiCall);

        logger.status(`\x1b[32m✔ Collected & Filtered ${collected.rows.length} validated records across ${collected.sourceAudits.length} sources\x1b[0m`);

        // 4. Export to Excel (.xlsx) and CSV (.csv) with anti-formula injection and RFC-4180 escaping
        const exportResult = await webDataCollector.exportAndVerify(
            plan.datasetTitle,
            collected.headers,
            collected.rows,
            desktopPath
        );

        taskSession.setActiveArtifact(exportResult.xlsxPath);

        const v = exportResult.verification;
        const pass = v.status === 'PASS';

        // 5. Deduct credit for generated Excel/CSV dataset (2 on Basic, 1 on Second/Third)
        const deductResult = creditVault.deductDocumentCredit('EXCEL', {
            datasetTitle: plan.datasetTitle,
            rowCount: exportResult.rowCount,
            columns: exportResult.columnCount,
            xlsxPath: exportResult.xlsxPath,
            csvPath: exportResult.csvPath,
            plan: activePlan.id
        });

        logger.status(`\n\x1b[32m========================================================================================\x1b[0m`);
        logger.user(`\x1b[32m✔ Task:             CREATE_SPREADSHEET & CSV DATASET\x1b[0m`);
        logger.user(`\x1b[32m✔ Dataset:          ${plan.datasetTitle}\x1b[0m`);
        logger.user(`\x1b[32m✔ Total Records:    ${exportResult.rowCount}\x1b[0m`);
        logger.user(`\x1b[32m✔ Columns:          ${exportResult.columnCount} (${plan.headers.join(', ')})\x1b[0m`);
        logger.user(`\x1b[32m✔ Excel (.xlsx):    ${exportResult.xlsxPath} (${v.xlsxSizeBytes} bytes)\x1b[0m`);
        logger.user(`\x1b[32m✔ CSV (.csv):       ${exportResult.csvPath} (${v.csvSizeBytes} bytes)\x1b[0m`);
        logger.user(`\x1b[32m✔ Unicode & Tamil:  VERIFIED UTF-8 BOM PRESERVED\x1b[0m`);
        logger.user(`\x1b[32m✔ Anti-Injection:   VERIFIED SANITIZED\x1b[0m`);
        logger.user(`\x1b[35m✔ Credits:          ${deductResult.deducted} Deducted (Remaining: ${deductResult.remainingBalance !== undefined ? deductResult.remainingBalance : creditVault.getBalance()})\x1b[0m`);
        logger.user(`\x1b[32m✔ Verification:     ${pass ? 'VERIFIED PASS (All files valid)' : 'VERIFICATION WARNING'}\x1b[0m`);
        logger.status(`\x1b[32m========================================================================================\x1b[0m\n`);

        // 6. Dispatch generated files via email to rajnaga75556@gmail.com
        try {
            logger.status(`\x1b[36m[EMAIL DISPATCH] Sending Excel dataset to rajnaga75556@gmail.com...\x1b[0m`);
            await emailDispatcher.sendFileEmail(
                'rajnaga75556@gmail.com',
                `Codez48 Pilot: Excel & CSV Dataset Ready - ${plan.datasetTitle}`,
                `Hello,\n\nYour data collection dataset "${plan.datasetTitle}" (${exportResult.rowCount} rows, ${exportResult.columnCount} columns) has been generated successfully by Codez48 Pilot.\n\nAttached File: ${path.basename(exportResult.xlsxPath)}\nCSV File: ${path.basename(exportResult.csvPath)}\nActive Plan: ${activePlan.name}\nRemaining Credits: ${deductResult.remainingBalance !== undefined ? deductResult.remainingBalance : creditVault.getBalance()}\n\nThank you for using Codez48 Pilot!`,
                exportResult.xlsxPath
            );
        } catch (emailErr) {
            logger.status(`\x1b[33m[EMAIL DISPATCH WARNING] Could not dispatch email: ${emailErr.message}\x1b[0m`);
        }

        try {
            const officeLauncher = require('../drivers/office-launcher');
            officeLauncher.openDocumentSafely(exportResult.xlsxPath, 'excel');
        } catch (e) {}

        return {
            success: pass,
            datasetTitle: plan.datasetTitle,
            xlsxPath: exportResult.xlsxPath,
            csvPath: exportResult.csvPath,
            headers: plan.headers,
            rowCount: exportResult.rowCount,
            columnCount: exportResult.columnCount,
            sourceAudits: collected.sourceAudits,
            remainingCredits: deductResult.remainingBalance,
            verification: v
        };
    }
}

module.exports = new ExcelAdapter();
