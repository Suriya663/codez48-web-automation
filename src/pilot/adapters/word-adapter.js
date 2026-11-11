const logger = require('../../core/logger');
/**
 * CODEZ48 WORD ADAPTER
 * Dynamic document type understanding (Detailed Reports, Study Notes, Technical Specs, Assignments, Q&A),
 * multi-part generation for long documents (e.g. 20+ questions), and verified .docx file creation on Desktop.
 */

const fs = require('fs');
const path = require('path');
const comOfficeDriver = require('../drivers/com-office-driver');
const workspaceManager = require('../../core/workspace-manager');
const taskSession = require('../task-session');
const documentAiEngine = require('../ai/document-ai-engine');
const brandingManager = require('../templates/branding-manager');
const wordTemplateCatalog = require('../templates/word-template-catalog');
const creditVault = require('../../core/credit-vault');
const { exec } = require('child_process');

class WordAdapter {
    async createDocumentGoal(goal, apiCall = null) {
        const desktopPath = workspaceManager.getDesktopPath();

        // 0. Credit Check & Subscription Gate
        const activePlan = creditVault.getPlan();
        const reqCredits = activePlan.id === 'MICRO' || activePlan.id === 'TRIAL_FREE' ? 2 : 1;
        if (!creditVault.hasCredits(reqCredits)) {
            logger.error(`\n\x1b[31m[CREDIT LIMIT] Insufficient credits (${creditVault.getBalance()} available, ${reqCredits} required for Word document on ${activePlan.name}).\x1b[0m`);
            await creditVault.showPaymentPrompt();
            return {
                success: false,
                reason: 'CREDIT_LIMIT_REACHED',
                error: `Insufficient credits. ${reqCredits} credits required for Word document generation on ${activePlan.name}.`
            };
        }

        logger.status(`\x1b[35m[CREDIT VAULT] Active Plan: ${activePlan.name} | Available Credits: ${creditVault.getBalance()} (Word Cost: ${reqCredits} credits)\x1b[0m`);

        const uiProgress = require('../../core/ui-progress');
        uiProgress.startSpinner(`Analyzing topic and selecting Word template for: "${goal}"...`);

        logger.status(`\n\x1b[36m[WORD ADAPTER] Processing document goal: "${goal}"...\x1b[0m`);

        // Institutional & College Branding Extraction + 100+ Word Template Selection
        const branding = brandingManager.extractBrandingFromPrompt(goal);
        const matchedTemplate = wordTemplateCatalog.findBestTemplate(goal, branding);
        if (matchedTemplate) {
            uiProgress.updateSpinnerText(`Matched Template: "${matchedTemplate.name}"`);
            logger.status(`\x1b[35m[100+ WORD CATALOG MATCH] Selected Template: "${matchedTemplate.name}" (${matchedTemplate.category})\x1b[0m`);
        }

        // 1. Generate comprehensive, topic-specific document via Document AI Engine
        await uiProgress.animateTo(40, 250, 'Generating structured sections & paragraphs...');
        const docData = await documentAiEngine.generateWordDocument(goal, apiCall);

        if (!docData || !docData.sections || docData.sections.length === 0) {
            logger.error(`\x1b[31m[WORD ADAPTER ERROR] Failed to generate document content for "${goal}"\x1b[0m`);
            return { success: false, reason: 'Failed to generate document content' };
        }

        // Inject Institutional / College Branding details into Word Document
        if (branding && branding.isInstitutional) {
            const institutionHeader = `${branding.institutionName} • ${branding.department}`;
            const accreditationLine = branding.accreditation ? `\nAccreditation: ${branding.accreditation}` : '';
            docData.subtitle = docData.subtitle
                ? `${institutionHeader}${accreditationLine}\n${docData.subtitle} | Academic Year: ${branding.academicYear}`
                : `${institutionHeader}${accreditationLine} | Academic Year: ${branding.academicYear}`;
            logger.status(`\x1b[32m✓ College Branding Incorporated into Word Document: "${branding.institutionName}"\x1b[0m`);
        }

        logger.status(`\x1b[32m✓ Content Generation Complete: "${docData.title}" (${docData.sections.length} sections)\x1b[0m`);

        // 2. Derive dynamic topic filename
        const topicClean = (docData.title || goal)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 30) || 'document';

        const baseFileName = `${topicClean}.docx`;
        const destPath = taskSession.getUniqueFilename(desktopPath, baseFileName);
        taskSession.setActiveArtifact(destPath);

        // 3. Create styled .docx file (COM with native OpenXML fallback)
        await uiProgress.animateTo(75, 250, 'Synthesizing native OpenXML document (.docx)...');
        const result = await comOfficeDriver.createWordDocument(
            docData.title,
            docData.sections,
            destPath,
            docData.subtitle || ''
        );

        if (result.success && result.filePath) {
            await uiProgress.animateTo(95, 150, 'Verifying document integrity...');
            const fileSize = fs.existsSync(result.filePath) ? fs.statSync(result.filePath).size : 0;

            // 4. Deduct credit for generated Word document (2 credits on Basic Plan, 1 on Second/Third Plan)
            const deductResult = creditVault.deductDocumentCredit('WORD', {
                title: docData.title,
                sections: docData.sections.length,
                filePath: result.filePath,
                plan: activePlan.id
            });

            logger.status(`\n\x1b[32m=========================================\x1b[0m`);
            logger.user(`\x1b[32m✓ Task:     CREATE_DOCUMENT\x1b[0m`);
            logger.user(`\x1b[32m✓ Title:    ${docData.title}\x1b[0m`);
            logger.user(`\x1b[32m✓ Type:     ${docData.docType || 'DOCUMENT'}\x1b[0m`);
            logger.user(`\x1b[32m✓ Sections: ${docData.sections.length}\x1b[0m`);
            logger.user(`\x1b[32m✓ File:     ${result.filePath}\x1b[0m`);
            logger.user(`\x1b[32m✓ Verified: File exists on Desktop (${fileSize} bytes)\x1b[0m`);
            logger.user(`\x1b[35m✓ Credits:  ${deductResult.deducted} Deducted (Remaining: ${deductResult.remainingBalance !== undefined ? deductResult.remainingBalance : creditVault.getBalance()})\x1b[0m`);
            logger.status(`\x1b[32m=========================================\x1b[0m\n`);

            // 4. Verification Check: Reopen or check file validity
            const isFileValid = fileSize > 500;
            if (!isFileValid) {
                return { success: false, reason: 'Saved document verification failed (file empty)' };
            }

            try {
                await uiProgress.animateTo(100, 200, 'Opening document in Microsoft Word...');
                const officeLauncher = require('../drivers/office-launcher');
                officeLauncher.openDocumentSafely(result.filePath, 'word');
                uiProgress.stop(`Word document created & opened successfully (${path.basename(result.filePath)})!`);
            } catch (e) {
                logger.debug(`[WORD LAUNCH NOTICE] ${e.message}`);
                uiProgress.stop(`Document generated: ${path.basename(result.filePath)}`);
            }

            return {
                success: true,
                filePath: result.filePath,
                title: docData.title,
                docType: docData.docType,
                sectionsCount: docData.sections.length,
                fileSize
            };
        } else {
            logger.error(`\x1b[31m[WORD TASK FAILED] ${result.error || result.reason}\x1b[0m`);
            return result;
        }
    }
}

module.exports = new WordAdapter();
