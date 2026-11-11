/**
 * CODEZ48 CYBER DEFENSE DASHBOARD HTTP SERVER
 * Launches local HTTP server on http://127.0.0.1:4840
 * Serves the modern dark-mode security audit dashboard, provides live REST endpoints
 * for interactive vulnerability scanning, report caching, and automated browser launching.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../../core/logger');
const websiteSecurityAuditor = require('./website-security-auditor');

const DEFAULT_PORT = 4840;

class SecurityDashboardServer {
    constructor() {
        this.server = null;
        this.port = DEFAULT_PORT;
        this.lastAuditReport = null;
        this.htmlPath = path.join(__dirname, 'security-audit-dashboard.html');
        this.isRunning = false;
    }

    /**
     * Starts the HTTP server if not already running
     * @returns {Promise<number>} Bound Port
     */
    async startServer() {
        if (this.isRunning && this.server) {
            return this.port;
        }

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const parsedUrl = new URL(req.url, `http://127.0.0.1:${this.port}`);
                const pathname = parsedUrl.pathname;

                // Enable CORS
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // Serve Main HTML Dashboard
                if (pathname === '/' || pathname === '/index.html' || pathname === '/dashboard') {
                    if (fs.existsSync(this.htmlPath)) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(fs.readFileSync(this.htmlPath, 'utf8'));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Dashboard HTML file not found');
                    }
                    return;
                }

                // API: Get Last Audit Report
                if (pathname === '/api/last-audit' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.lastAuditReport || { message: 'No audits conducted yet' }));
                    return;
                }

                // API: Trigger Website Audit Live
                if (pathname === '/api/audit' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const payload = JSON.parse(body || '{}');
                            const targetUrl = payload.url;
                            if (!targetUrl) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Target URL is required' }));
                                return;
                            }

                            const report = await websiteSecurityAuditor.auditWebsite(targetUrl);
                            this.lastAuditReport = report;

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(report));
                        } catch (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                    return;
                }

                // 404 Fallback
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            });

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    // Try next port
                    this.port++;
                    this.server.listen(this.port, '127.0.0.1');
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                this.isRunning = true;
                logger.info(`[SECURITY-DASHBOARD] Live cyber defense dashboard online at http://127.0.0.1:${this.port}`);
                resolve(this.port);
            });
        });
    }

    /**
     * Audits a target website and opens the dashboard in the user's browser
     * @param {string|Object} targetOrReport
     * @returns {Promise<Object>}
     */
    async launchDashboard(targetOrReport) {
        let report;
        if (typeof targetOrReport === 'string') {
            report = await websiteSecurityAuditor.auditWebsite(targetOrReport);
        } else {
            report = targetOrReport;
        }

        this.lastAuditReport = report;
        const port = await this.startServer();
        const dashboardUrl = `http://127.0.0.1:${port}/`;

        // Automatically launch the user's browser
        try {
            if (process.platform === 'win32') {
                exec(`start "" "${dashboardUrl}"`);
            } else if (process.platform === 'darwin') {
                exec(`open "${dashboardUrl}"`);
            } else {
                exec(`xdg-open "${dashboardUrl}"`);
            }
        } catch (_) {}

        return {
            success: true,
            dashboardUrl,
            report
        };
    }

    /**
     * Stops the HTTP server
     */
    async stopServer() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isRunning = false;
                    this.server = null;
                    resolve();
                });
            });
        }
    }
}

module.exports = new SecurityDashboardServer();
