const logger = require('../../core/logger');
/**
 * CODEZ48 INTELLIGENT JS IMPLEMENTER ADAPTER
 * Inspects local project HTML structures, extracts element IDs and classes,
 * queries Codez48 AI API for context-aware JavaScript implementation,
 * validates JS syntax, creates .bak backups, and updates target project files.
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../../core/workspace-manager');

class JsImplementerAdapter {
    inspectDom(projectDir) {
        const metadata = { htmlFiles: [], elementIds: new Set(), elementClasses: new Set(), scriptFiles: [] };
        try {
            const files = fs.readdirSync(projectDir);
            for (const file of files) {
                const fullPath = path.join(projectDir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isFile()) {
                    if (file.endsWith('.html')) {
                        metadata.htmlFiles.push(file);
                        const content = fs.readFileSync(fullPath, 'utf8');

                        // Extract element IDs
                        const idMatches = content.matchAll(/id=["']([^"']+)["']/gi);
                        for (const m of idMatches) metadata.elementIds.add(m[1]);

                        // Extract classes
                        const classMatches = content.matchAll(/class=["']([^"']+)["']/gi);
                        for (const m of classMatches) {
                            m[1].split(/\s+/).forEach(cls => { if (cls) metadata.elementClasses.add(cls); });
                        }

                        // Extract script references
                        const scriptMatches = content.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi);
                        for (const m of scriptMatches) metadata.scriptFiles.push(m[1]);
                    }
                }
            }
        } catch (e) {}

        return {
            htmlFiles: metadata.htmlFiles,
            elementIds: Array.from(metadata.elementIds),
            elementClasses: Array.from(metadata.elementClasses),
            scriptFiles: metadata.scriptFiles
        };
    }

    validateJavaScriptSyntax(code) {
        try {
            // Test parsing/compiling code without execution
            new Function(code);
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    }

    async implementFeature(goal, apiCall) {
        const projectDir = workspaceManager.getActiveProject();
        logger.status(`\n\x1b[36m[INTELLIGENT JS WORKFLOW] Target Project: ${projectDir}\x1b[0m`);

        if (!workspaceManager.isPathSafe(projectDir)) {
            return { success: false, error: 'UNAUTHORIZED_PATH', failureReason: 'Project path is outside authorized workspace.' };
        }

        const domInfo = this.inspectDom(projectDir);
        logger.status(`[DOM INSPECTION] HTML Files: ${domInfo.htmlFiles.join(', ') || 'None'}`);
        logger.status(`[DOM INSPECTION] Discovered Element IDs: ${domInfo.elementIds.join(', ') || 'None'}`);
        logger.status(`[DOM INSPECTION] Discovered Classes: ${domInfo.elementClasses.join(', ') || 'None'}`);
        logger.status(`[DOM INSPECTION] Referenced Scripts: ${domInfo.scriptFiles.join(', ') || 'None'}`);

        // Select target JS file (default to app.js or script.js or index.js)
        let targetJsFile = domInfo.scriptFiles.find(s => !s.startsWith('http')) || 'app.js';
        const targetJsPath = path.join(projectDir, targetJsFile);

        if (!apiCall) {
            return { success: false, error: 'MISSING_AI_API', failureReason: 'Codez48 AI API integration is required for intelligent JS implementation.' };
        }

        logger.status(`[AI PROMPTING] Requesting context-aware JavaScript implementation from Codez48 AI...`);
        const aiPrompt = `You are an expert web development agent.
User Goal: "${goal}"
Project HTML files: ${domInfo.htmlFiles.join(', ')}
Discovered HTML Element IDs: ${domInfo.elementIds.join(', ')}
Discovered HTML Classes: ${domInfo.elementClasses.join(', ')}
Existing Script Files: ${domInfo.scriptFiles.join(', ')}

Please generate clean, robust, syntactically valid JavaScript code to implement the requested feature.
Use the actual discovered element IDs and classes where appropriate. Do NOT return a generic alert() placeholder unless explicitly requested. Include proper event listeners and DOM manipulation. Return only the raw JavaScript code.`;

        try {
            const aiRes = await apiCall('cli-ai-chat', 'POST', {
                messages: [{ role: 'user', content: aiPrompt }]
            }, false);

            let generatedCode = aiRes?.answer || aiRes?.content || aiRes?.code || '';
            // Strip markdown code fences if present
            generatedCode = generatedCode.replace(/^```[a-js]*\n?/i, '').replace(/```$/i, '').trim();

            if (!generatedCode || generatedCode.length < 10) {
                return { success: false, error: 'EMPTY_AI_RESPONSE', failureReason: 'AI response was empty or invalid.' };
            }

            // Syntax validation
            const syntaxCheck = this.validateJavaScriptSyntax(generatedCode);
            if (!syntaxCheck.valid) {
                logger.error(`[SYNTAX ERROR] AI-generated JavaScript failed syntax validation: ${syntaxCheck.error}`);
                return { success: false, error: 'SYNTAX_VALIDATION_FAILED', failureReason: `Generated JS has syntax errors: ${syntaxCheck.error}` };
            }
            logger.status(`\x1b[32m[SYNTAX VALID] Generated JavaScript passed Node.js runtime syntax validation.\x1b[0m`);

            // Create backup if target file exists
            if (fs.existsSync(targetJsPath)) {
                const existingContent = fs.readFileSync(targetJsPath, 'utf8');
                fs.writeFileSync(`${targetJsPath}.bak`, existingContent, 'utf8');
                logger.status(`[BACKUP CREATED] Backup saved at: ${targetJsPath}.bak`);
            }

            const dir = path.dirname(targetJsPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(targetJsPath, generatedCode, 'utf8');
            logger.status(`\x1b[32m[FILE UPDATED] Successfully wrote intelligent JavaScript to: ${targetJsPath}\x1b[0m`);

            return {
                success: true,
                projectDir,
                targetJsFile: targetJsPath,
                domInfo,
                codeSize: generatedCode.length
            };
        } catch (e) {
            logger.error(`[JS IMPLEMENTATION ERROR] ${e.message}`);
            return { success: false, error: 'IMPLEMENTATION_FAILED', failureReason: e.message };
        }
    }
}

module.exports = new JsImplementerAdapter();
