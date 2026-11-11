/**
 * CODEZ48 PRESENTATION TEMPLATE INTERACTIVE BRIDGE SERVER
 * Launches local HTTP bridge on http://127.0.0.1:4820
 * Serves the visual 100+ template picker web studio, captures user's clicked design,
 * switches terminal foreground focus, and returns the selected template to the caller.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawnSync } = require('child_process');
const logger = require('../../core/logger');
const pptTemplateCatalog = require('./ppt-template-catalog');

const PORT = 4820;

class TemplateInteractiveServer {
    constructor() {
        this.server = null;
        this.activeSelectionResolve = null;
    }

    /**
     * Prompts user visually in the default browser to pick a presentation design from 100+ templates.
     * Returns a Promise that resolves with the chosen template object.
     */
    async promptUserTemplateSelection(options = {}) {
        const defaultTemplateId = options.defaultTemplateId || 'executive_chevron_orange';
        const htmlPath = path.resolve(__dirname, 'templates-gallery.html');

        return new Promise((resolve) => {
            let isResolved = false;

            const finish = (result) => {
                if (isResolved) return;
                isResolved = true;
                this.close();
                this.switchBackToTerminal();
                resolve(result);
            };

            // Start HTTP Server
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

                // CORS headers
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    return res.end();
                }

                // API: Get Catalog Data
                if (url.pathname === '/api/catalog') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    const catalog = pptTemplateCatalog.getAllTemplates();
                    return res.end(JSON.stringify({
                        success: true,
                        total: catalog.length,
                        activePlan: 'PROFIT_ORIENTED',
                        templates: catalog
                    }));
                }

                // API: Select Template
                if (url.pathname === '/api/select' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body || '{}');
                            const selectedId = data.templateId || defaultTemplateId;
                            const matched = pptTemplateCatalog.getTemplateById(selectedId) || pptTemplateCatalog.templates[0];

                            if (data.topic && data.topic.trim()) {
                                matched.userTopic = data.topic.trim();
                            }
                            if (data.slideCount && typeof data.slideCount === 'number') {
                                matched.userSlideCount = data.slideCount;
                            }

                            logger.user(`\n\x1b[32m✔ Template Confirmed by User: "${matched.name}" (ID: ${matched.id})\x1b[0m`);
                            if (matched.userTopic) {
                                logger.user(`\x1b[36m  • Presentation Topic: "${matched.userTopic}"\x1b[0m`);
                            }
                            if (matched.userSlideCount) {
                                logger.user(`\x1b[36m  • Slide Count:        ${matched.userSlideCount} Slides\x1b[0m`);
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, template: matched }));

                            setTimeout(() => {
                                finish(matched);
                            }, 400);
                        } catch (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: err.message }));
                        }
                    });
                    return;
                }

                // Serve templates-gallery.html
                if (url.pathname === '/' || url.pathname.endsWith('.html')) {
                    fs.readFile(htmlPath, 'utf8', (err, html) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            return res.end('Failed to load templates-gallery.html: ' + err.message);
                        }
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(html);
                    });
                    return;
                }

                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            });

            this.server.listen(PORT, '127.0.0.1', () => {
                const queryParts = [];
                if (options.topic) queryParts.push(`topic=${encodeURIComponent(options.topic)}`);
                if (options.slides) queryParts.push(`slides=${encodeURIComponent(options.slides)}`);
                const topicQuery = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
                const galleryUrl = `http://127.0.0.1:${PORT}/${topicQuery}`;
                logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
                logger.status(`║        🎨 CODEZ48 100+ VISUAL PRESENTATION TEMPLATES GALLERY LAUNCHED         ║`);
                logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
                logger.user(`  • Web Picker:      \x1b[1m\x1b[32m${galleryUrl}\x1b[0m`);
                logger.user(`  • Flagship Design: \x1b[1m\x1b[33mExecutive Chevron Orange & Slate Navy (Tier 3 Profit-Oriented)\x1b[0m`);
                logger.user(`  • Instructions:    Select your visual slide mockup in the browser, then click "Apply Design".`);
                logger.user(`                     (Auto-defaults to Flagship Suite in 25 seconds if not picked)\n`);

                // Launch default browser
                try {
                    exec(`start "" "${galleryUrl}"`);
                } catch (_) {}

                // Fallback timeout: auto-resolve after 35 seconds to avoid stalling background tasks
                setTimeout(() => {
                    if (!isResolved) {
                        const fallbackTemplate = pptTemplateCatalog.getTemplateById(defaultTemplateId) || pptTemplateCatalog.templates[0];
                        logger.status(`\x1b[33m[AUTO-DEFAULT] Using confirmed flagship template: ${fallbackTemplate.name}\x1b[0m`);
                        finish(fallbackTemplate);
                    }
                }, 35000);
            });

            this.server.on('error', (err) => {
                logger.debug(`[TEMPLATE SERVER NOTICE] Server port busy (${err.message}). Using default template.`);
                const def = pptTemplateCatalog.getTemplateById(defaultTemplateId) || pptTemplateCatalog.templates[0];
                finish(def);
            });
        });
    }

    /**
     * Closes the local HTTP bridge
     */
    close() {
        if (this.server) {
            try {
                this.server.close();
            } catch (_) {}
            this.server = null;
        }
    }

    /**
     * Brings command prompt or PowerPoint back to the foreground
     */
    switchBackToTerminal() {
        try {
            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                $wshell = New-Object -ComObject WScript.Shell;
                $wshell.AppActivate('cmd');
                $wshell.AppActivate('Windows PowerShell');
                $wshell.AppActivate('Codez48');
            `;
            const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
            spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', b64], { timeout: 2000 });
        } catch (_) {}
    }
}

module.exports = new TemplateInteractiveServer();
