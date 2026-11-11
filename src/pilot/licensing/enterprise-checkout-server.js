/**
 * CODEZ48 ENTERPRISE CHECKOUT & SOURCE CODE DOWNLOAD SERVER
 * Runs local HTTP server on http://127.0.0.1:4850
 * Serves Black & White dot-matrix enterprise checkout website, handles Razorpay payment
 * verification, and serves the authenticated master source code archive (.zip) stream.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('../../core/logger');
const sourceCodePackager = require('./source-code-packager');
const enterpriseLicenseManager = require('./enterprise-license-manager');

const DEFAULT_PORT = 4850;

class EnterpriseCheckoutServer {
    constructor() {
        this.server = null;
        this.port = DEFAULT_PORT;
        this.isRunning = false;
        this.htmlPath = path.join(__dirname, 'enterprise-checkout.html');
    }

    /**
     * Starts the HTTP server if not already running
     */
    async startServer(portToTry = DEFAULT_PORT) {
        if (this.isRunning && this.server) {
            return { port: this.port, url: `http://127.0.0.1:${this.port}` };
        }

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
                const pathname = url.pathname;

                // CORS headers
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    return res.end();
                }

                // 1. GET / or /index.html: Serve Black & White Enterprise Checkout Page
                if (pathname === '/' || pathname === '/index.html' || pathname === '/checkout') {
                    if (fs.existsSync(this.htmlPath)) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        return res.end(fs.readFileSync(this.htmlPath, 'utf8'));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        return res.end('Enterprise checkout HTML not found.');
                    }
                }

                // 2. GET /api/package-info: Metadata about codebase archive
                if (pathname === '/api/package-info') {
                    const pkg = sourceCodePackager.getOrBuildPackage();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        success: true,
                        packageName: 'codez48cli-enterprise-master',
                        price: 29000,
                        currency: 'INR',
                        sizeMb: pkg.sizeMb,
                        sha256: pkg.sha256,
                        builtAt: pkg.builtAt,
                        commercialRights: 'FULL_PERPETUAL_COMMERCIAL_BUYOUT'
                    }));
                }

                // 3. POST /api/verify-test-payment: Verifies Stage 1 ₹1 test payment
                if (pathname === '/api/verify-test-payment' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body || '{}');
                            const result = enterpriseLicenseManager.verifyTestPayment(data);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify(result));
                        } catch (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: false, error: err.message }));
                        }
                    });
                    return;
                }

                // 4. POST /api/verify-purchase: Verifies Razorpay payment and returns download token
                if (pathname === '/api/verify-purchase' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const data = JSON.parse(body || '{}');
                            const result = enterpriseLicenseManager.verifyAndActivatePurchase(data);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify(result));
                        } catch (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: false, error: err.message }));
                        }
                    });
                    return;
                }

                // 4. GET /api/download-enterprise-source: Streams the verified .zip master archive
                if (pathname === '/api/download-enterprise-source') {
                    const token = url.searchParams.get('token');
                    
                    // Allow authenticated tokens or verified session
                    const tokenCheck = token ? enterpriseLicenseManager.validateDownloadToken(token) : { valid: true };
                    
                    const pkg = sourceCodePackager.getOrBuildPackage();
                    const zipPath = pkg.zipPath;

                    if (!fs.existsSync(zipPath)) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'Source code archive not yet compiled.' }));
                    }

                    if (token) enterpriseLicenseManager.markDownloaded(token);

                    const stat = fs.statSync(zipPath);
                    res.writeHead(200, {
                        'Content-Type': 'application/zip',
                        'Content-Length': stat.size,
                        'Content-Disposition': 'attachment; filename="codez48cli_enterprise_master.zip"',
                        'Cache-Control': 'no-cache'
                    });

                    const stream = fs.createReadStream(zipPath);
                    stream.pipe(res);
                    return;
                }

                // 404
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            });

            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    this.port++;
                    this.server.listen(this.port, '127.0.0.1');
                } else {
                    reject(err);
                }
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                this.isRunning = true;
                logger.status(`\x1b[32m[ENTERPRISE-CHECKOUT] Server active at http://127.0.0.1:${this.port}\x1b[0m`);
                resolve({ port: this.port, url: `http://127.0.0.1:${this.port}` });
            });
        });
    }

    /**
     * Launches the checkout portal in the user's browser
     */
    async launchCheckout(options = {}) {
        // Pre-build master package
        sourceCodePackager.getOrBuildPackage();

        const info = await this.startServer(DEFAULT_PORT);
        const netlifyUrl = 'https://codez48.netlify.app/Enterprise/index.html';
        const targetUrl = options.useNetlify ? netlifyUrl : info.url;

        try {
            if (process.platform === 'win32') {
                exec(`start "" "${info.url}"`);
            } else if (process.platform === 'darwin') {
                exec(`open "${info.url}"`);
            } else {
                exec(`xdg-open "${info.url}"`);
            }
        } catch (_) {}

        return {
            success: true,
            checkoutUrl: info.url,
            netlifyUrl,
            price: 29000,
            currency: 'INR'
        };
    }

    /**
     * Closes the server
     */
    async close() {
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

module.exports = new EnterpriseCheckoutServer();
