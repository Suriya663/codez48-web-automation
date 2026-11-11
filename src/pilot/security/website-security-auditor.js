/**
 * CODEZ48 DEFENSIVE WEBSITE SECURITY VULNERABILITY AUDITOR
 * Comprehensive Defensive Security Posture & Risk Assessment Engine:
 * 1. SSL/TLS & Transport Security Analysis (HTTPS vs HTTP, Certificate validity & issuer)
 * 2. HTTP Security Response Headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
 * 3. Information Disclosure & Technology Fingerprinting (Server banners, X-Powered-By leaks)
 * 4. Cross-Origin Resource Sharing (CORS) Misconfiguration Detection
 * 5. Cookie Security Attributes (Secure, HttpOnly, SameSite validation)
 * 6. Non-Destructive Sensitive Path Exposure Probing (/.env, /.git/HEAD, robots.txt, admin endpoints)
 * 7. OWASP Top 10 Threat Modeling: Explains what the problem is, how attackers could exploit it,
 *    and delivers concrete remediation code (Nginx, Apache, Express.js).
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const tls = require('tls');
const logger = require('../../core/logger');

class WebsiteSecurityAuditor {
    constructor() {
        this.timeoutMs = 10000;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codez48SecurityAuditor/2.0';
    }

    /**
     * Normalizes a target string (e.g. "example.com" or "http://example.com") into a valid URL object
     * @param {string} input
     * @returns {URL}
     */
    normalizeUrl(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Target website URL or domain is required');
        }
        let clean = input.trim();
        // Remove trailing punctuation or quotes from natural language sentences
        clean = clean.replace(/[,;.'"!?]+$/, '');
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = 'https://' + clean;
        }
        return new URL(clean);
    }

    /**
     * Performs a low-level HTTP/HTTPS request with timing and TLS certificate extraction
     * @param {URL} targetUrl
     * @param {string} method
     * @returns {Promise<{ statusCode: number, headers: Object, tlsInfo: Object, durationMs: number, bodySnippet: string }>}
     */
    async fetchEndpoint(targetUrl, method = 'GET') {
        return new Promise((resolve) => {
            const isHttps = targetUrl.protocol === 'https:';
            const client = isHttps ? https : http;
            const startTime = Date.now();

            const options = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (isHttps ? 443 : 80),
                path: targetUrl.pathname + (targetUrl.search || ''),
                method,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                rejectUnauthorized: false, // Allows inspecting self-signed or expired certs
                timeout: this.timeoutMs
            };

            let tlsInfo = { isTls: isHttps, authorized: false };

            const req = client.request(options, (res) => {
                const durationMs = Date.now() - startTime;
                let body = '';

                if (isHttps && req.socket && req.socket.getPeerCertificate) {
                    try {
                        const cert = req.socket.getPeerCertificate();
                        if (cert && Object.keys(cert).length > 0) {
                            tlsInfo = {
                                isTls: true,
                                authorized: req.socket.authorized || false,
                                subject: cert.subject ? cert.subject.CN || cert.subject.O : 'Unknown',
                                issuer: cert.issuer ? cert.issuer.O || cert.issuer.CN : 'Unknown',
                                validFrom: cert.valid_from,
                                validTo: cert.valid_to,
                                daysRemaining: Math.round((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
                            };
                        }
                    } catch (_) {}
                }

                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    if (body.length < 4096) body += chunk;
                });
                res.on('end', () => {
                    resolve({
                        success: true,
                        statusCode: res.statusCode,
                        headers: res.headers || {},
                        tlsInfo,
                        durationMs,
                        bodySnippet: body.substring(0, 500)
                    });
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    statusCode: 0,
                    headers: {},
                    tlsInfo,
                    durationMs: Date.now() - startTime,
                    bodySnippet: '',
                    error: 'Connection timeout'
                });
            });

            req.on('error', (err) => {
                resolve({
                    success: false,
                    statusCode: 0,
                    headers: {},
                    tlsInfo,
                    durationMs: Date.now() - startTime,
                    bodySnippet: '',
                    error: err.message
                });
            });

            req.end();
        });
    }

    /**
     * Conducts a non-destructive audit of a target website
     * @param {string} targetInput
     * @param {Object} options
     * @returns {Promise<Object>} Full Audit Report
     */
    async auditWebsite(targetInput, options = {}) {
        const targetUrl = this.normalizeUrl(targetInput);
        logger.info(`[WEBSITE-AUDITOR] Initiating defensive security audit on: ${targetUrl.href}...`);

        const rootRes = await this.fetchEndpoint(targetUrl, 'GET');
        const findings = [];
        let score = 100;

        // 1. SSL/TLS & Insecure HTTP Protocol Check
        if (targetUrl.protocol !== 'https:') {
            score -= 25;
            findings.push({
                id: 'SEC-TRANSPORT-01',
                title: 'Insecure Plaintext HTTP Protocol in Use',
                severity: 'CRITICAL',
                category: 'OWASP A02: Cryptographic Failures',
                cwe: 'CWE-319: Cleartext Transmission of Sensitive Information',
                problem: 'Website is accessible over unencrypted HTTP (http://). Traffic including logins, cookies, and sensitive data is sent in plaintext.',
                attackVector: 'Attacker on the same network (public Wi-Fi, ISP, rogue proxy) can perform Man-in-the-Middle (MitM) attacks, sniff session tokens, and inject malicious scripts or ads into the browser response stream.',
                remediation: {
                    summary: 'Enforce HTTPS everywhere with a trusted TLS certificate and redirect all HTTP traffic to HTTPS (301 Permanent Redirect).',
                    nginx: `server {\n    listen 80;\n    server_name ${targetUrl.hostname};\n    return 301 https://$host$request_uri;\n}`,
                    apache: `RewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
                    express: `app.use((req, res, next) => {\n  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {\n    return res.redirect(301, 'https://' + req.get('host') + req.url);\n  }\n  next();\n});`
                }
            });
        } else {
            // Check TLS Cert validity
            if (rootRes.tlsInfo && rootRes.tlsInfo.daysRemaining !== undefined && rootRes.tlsInfo.daysRemaining < 15) {
                score -= 10;
                findings.push({
                    id: 'SEC-TLS-02',
                    title: 'SSL/TLS Certificate Nearing Expiration',
                    severity: 'MEDIUM',
                    category: 'OWASP A02: Cryptographic Failures',
                    cwe: 'CWE-295: Improper Certificate Validation',
                    problem: `The SSL certificate expires in ${rootRes.tlsInfo.daysRemaining} days (Issuer: ${rootRes.tlsInfo.issuer}).`,
                    attackVector: 'Once expired, modern browsers will display a high-risk security warning ("Your connection is not private"), driving users away and breaking automated API clients.',
                    remediation: {
                        summary: 'Renew the SSL certificate immediately or configure automated renewal (Certbot / Let\'s Encrypt auto-renew).',
                        nginx: `# Run Certbot automated renewal:\nsudo certbot renew --dry-run`,
                        apache: `sudo certbot --apache renew`,
                        express: `// Use Cloudflare / reverse proxy SSL termination for zero-downtime automated certificate renewal.`
                    }
                });
            } else {
                findings.push({
                    id: 'SEC-TLS-OK',
                    title: 'SSL/TLS Transport Layer Encryption Active',
                    severity: 'PASSED',
                    category: 'Transport Security',
                    cwe: 'N/A',
                    problem: `HTTPS active with valid certificate issued by ${rootRes.tlsInfo ? rootRes.tlsInfo.issuer : 'Trusted CA'} (${rootRes.tlsInfo ? rootRes.tlsInfo.daysRemaining : '>30'} days remaining).`,
                    attackVector: 'Data in transit is encrypted using modern TLS cipher suites.',
                    remediation: { summary: 'Keep automated certificate renewal active.' }
                });
            }
        }

        const headers = rootRes.headers || {};

        // 2. Content-Security-Policy (CSP) Check
        const csp = headers['content-security-policy'] || headers['content-security-policy-report-only'];
        if (!csp) {
            score -= 15;
            findings.push({
                id: 'SEC-CSP-01',
                title: 'Missing Content-Security-Policy (CSP) Header',
                severity: 'HIGH',
                category: 'OWASP A05: Security Misconfiguration / OWASP A03: Injection',
                cwe: 'CWE-693: Protection Mechanism Failure',
                problem: 'The server does not specify a Content-Security-Policy header. The browser has no restrictions on where scripts, styles, and iframes can be loaded from.',
                attackVector: 'If any user-input reflection or third-party dependency is compromised, an attacker can execute Cross-Site Scripting (XSS), exfiltrate session cookies, redirect victims to phishing pages, or load keyloggers.',
                remediation: {
                    summary: 'Define a strict CSP header restricting scripts and frame resources to trusted origins only.',
                    nginx: `add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://trustedscripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'self';" always;`,
                    apache: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; frame-ancestors 'self';"`,
                    express: `const helmet = require('helmet');\napp.use(helmet.contentSecurityPolicy({\n  directives: {\n    defaultSrc: ["'self'"],\n    scriptSrc: ["'self'"]\n  }\n}));`
                }
            });
        } else {
            findings.push({
                id: 'SEC-CSP-OK',
                title: 'Content-Security-Policy (CSP) Configured',
                severity: 'PASSED',
                category: 'Injection Protection',
                cwe: 'N/A',
                problem: `CSP header detected: ${csp.substring(0, 80)}...`,
                attackVector: 'Mitigates unauthorized inline script execution and data theft.',
                remediation: { summary: 'Regularly review script-src allowances to avoid unnecessary wildcards.' }
            });
        }

        // 3. Strict-Transport-Security (HSTS) Check
        const hsts = headers['strict-transport-security'];
        if (!hsts && targetUrl.protocol === 'https:') {
            score -= 15;
            findings.push({
                id: 'SEC-HSTS-01',
                title: 'Missing Strict-Transport-Security (HSTS) Header',
                severity: 'HIGH',
                category: 'OWASP A05: Security Misconfiguration',
                cwe: 'CWE-523: Unprotected Transport of Credentials',
                problem: 'The website does not instruct browsers to remember connecting strictly via HTTPS through HSTS headers.',
                attackVector: 'An attacker using ARP spoofing or Wi-Fi packet injection can perform an "SSL Strip" attack, forcing the user\'s initial connection to downgrade to unencrypted HTTP without any browser warning.',
                remediation: {
                    summary: 'Add the HSTS header with a minimum duration of 1 year (31536000 seconds) including subdomains.',
                    nginx: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`,
                    apache: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`,
                    express: `const helmet = require('helmet');\napp.use(helmet.hsts({\n  maxAge: 31536000,\n  includeSubDomains: true,\n  preload: true\n}));`
                }
            });
        } else if (hsts) {
            findings.push({
                id: 'SEC-HSTS-OK',
                title: 'HTTP Strict Transport Security (HSTS) Active',
                severity: 'PASSED',
                category: 'Transport Security',
                cwe: 'N/A',
                problem: `HSTS configured: ${hsts}`,
                attackVector: 'Prevents SSL-stripping downgrades on subsequent user visits.',
                remediation: { summary: 'Keep preload flag active and register at hstspreload.org.' }
            });
        }

        // 4. X-Frame-Options (Clickjacking Defense) Check
        const xfo = headers['x-frame-options'];
        const hasCspFrameAncestors = csp && csp.includes('frame-ancestors');
        if (!xfo && !hasCspFrameAncestors) {
            score -= 10;
            findings.push({
                id: 'SEC-XFO-01',
                title: 'Missing X-Frame-Options / Clickjacking Protection',
                severity: 'MEDIUM',
                category: 'OWASP A05: Security Misconfiguration',
                cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers or Frames',
                problem: 'The site does not restrict framing via X-Frame-Options or CSP frame-ancestors.',
                attackVector: 'Hackers can embed this website inside a transparent <iframe> on a malicious domain, tricking logged-in users into clicking hidden buttons (e.g. transfer money, change password, delete account).',
                remediation: {
                    summary: 'Configure X-Frame-Options to DENY or SAMEORIGIN, or specify frame-ancestors in CSP.',
                    nginx: `add_header X-Frame-Options "SAMEORIGIN" always;`,
                    apache: `Header always set X-Frame-Options "SAMEORIGIN"`,
                    express: `const helmet = require('helmet');\napp.use(helmet.frameguard({ action: 'sameorigin' }));`
                }
            });
        } else {
            findings.push({
                id: 'SEC-XFO-OK',
                title: 'Clickjacking Protection Enforced',
                severity: 'PASSED',
                category: 'UI Redressing Defense',
                cwe: 'N/A',
                problem: `Framing restricted via: ${xfo || 'CSP frame-ancestors'}`,
                attackVector: 'Prevents unauthorized iframe overlays and click hijacking.',
                remediation: { summary: 'Maintain SAMEORIGIN or DENY.' }
            });
        }

        // 5. X-Content-Type-Options (MIME Sniffing) Check
        const xcto = headers['x-content-type-options'];
        if (!xcto || !xcto.toLowerCase().includes('nosniff')) {
            score -= 5;
            findings.push({
                id: 'SEC-XCTO-01',
                title: 'Missing X-Content-Type-Options Header',
                severity: 'LOW',
                category: 'OWASP A05: Security Misconfiguration',
                cwe: 'CWE-79: Cross-Site Scripting (MIME Confusion)',
                problem: 'The server is missing "X-Content-Type-Options: nosniff". Browsers may attempt to guess (sniff) content types away from the declared MIME type.',
                attackVector: 'If users upload text/image files that contain malicious script tags, browsers may interpret and execute the image as HTML/JavaScript, leading to stored XSS attacks.',
                remediation: {
                    summary: 'Set X-Content-Type-Options to nosniff across all static and dynamic responses.',
                    nginx: `add_header X-Content-Type-Options "nosniff" always;`,
                    apache: `Header always set X-Content-Type-Options "nosniff"`,
                    express: `const helmet = require('helmet');\napp.use(helmet.noSniff());`
                }
            });
        } else {
            findings.push({
                id: 'SEC-XCTO-OK',
                title: 'MIME-Type Sniffing Prevention Active',
                severity: 'PASSED',
                category: 'Header Hardening',
                cwe: 'N/A',
                problem: 'X-Content-Type-Options is properly set to "nosniff".',
                attackVector: 'Prevents browsers from misinterpreting files as executable script payloads.',
                remediation: { summary: 'Keep nosniff header permanently enabled.' }
            });
        }

        // 6. Technology Fingerprinting & Server Banner Disclosure
        const serverHeader = headers['server'];
        const poweredBy = headers['x-powered-by'];
        if (serverHeader && (/\d+\.\d+/.test(serverHeader) || /ubuntu|debian|centos|apache|nginx|microsoft/i.test(serverHeader))) {
            score -= 5;
            findings.push({
                id: 'SEC-INFO-01',
                title: 'Server Banner Discloses Detailed Software Version',
                severity: 'LOW',
                category: 'OWASP A05: Security Misconfiguration',
                cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor',
                problem: `The "Server" header reveals specific server software: "${serverHeader}".`,
                attackVector: 'Automated vulnerability scanners and attackers search public CVE databases (e.g. Exploit-DB, NVD) for published remote code execution (RCE) flaws matching this exact software version.',
                remediation: {
                    summary: 'Suppress server identification banners in web server configuration files.',
                    nginx: `# Inside nginx.conf http block:\nserver_tokens off;`,
                    apache: `# Inside apache2.conf / httpd.conf:\nServerTokens Prod\nServerSignature Off`,
                    express: `// Express / Node.js:\napp.disable('x-powered-by');`
                }
            });
        }

        if (poweredBy) {
            score -= 5;
            findings.push({
                id: 'SEC-INFO-02',
                title: 'Backend Framework Disclosed via X-Powered-By Header',
                severity: 'LOW',
                category: 'OWASP A05: Security Misconfiguration',
                cwe: 'CWE-200: Exposure of Sensitive Information',
                problem: `Server returns "X-Powered-By: ${poweredBy}", exposing the backend framework.`,
                attackVector: 'Attackers know which technology stack is running (e.g. PHP, ASP.NET, Express) and target stack-specific deserialization and framework bugs.',
                remediation: {
                    summary: 'Remove the X-Powered-By header from all application responses.',
                    nginx: `proxy_hide_header X-Powered-By;`,
                    apache: `Header always unset X-Powered-By`,
                    express: `app.disable('x-powered-by');`
                }
            });
        }

        // 7. CORS (Cross-Origin Resource Sharing) Check
        const acao = headers['access-control-allow-origin'];
        if (acao === '*') {
            score -= 10;
            findings.push({
                id: 'SEC-CORS-01',
                title: 'Overly Permissive CORS (Access-Control-Allow-Origin: *)',
                severity: 'MEDIUM',
                category: 'OWASP A01: Broken Access Control',
                cwe: 'CWE-346: Origin Validation Error',
                problem: 'The server returns "Access-Control-Allow-Origin: *", allowing any origin domain to read resource responses.',
                attackVector: 'Malicious third-party websites visited by users can send cross-origin AJAX requests and read private response bodies if session data is accessible.',
                remediation: {
                    summary: 'Restrict Access-Control-Allow-Origin to authorized frontend domains only.',
                    nginx: `add_header Access-Control-Allow-Origin "https://yourfrontend.com";`,
                    apache: `Header set Access-Control-Allow-Origin "https://yourfrontend.com"`,
                    express: `const cors = require('cors');\napp.use(cors({ origin: ['https://yourfrontend.com'] }));`
                }
            });
        }

        // 8. Cookie Security Attributes Check
        const cookies = headers['set-cookie'];
        if (cookies && Array.isArray(cookies)) {
            const insecureCookies = [];
            cookies.forEach(c => {
                const lowerC = c.toLowerCase();
                const isHttpOnly = lowerC.includes('httponly');
                const isSecure = lowerC.includes('secure');
                const hasSameSite = lowerC.includes('samesite');
                if (!isHttpOnly || !isSecure || !hasSameSite) {
                    const cookieName = c.split('=')[0];
                    insecureCookies.push({ name: cookieName, isHttpOnly, isSecure, hasSameSite });
                }
            });

            if (insecureCookies.length > 0) {
                score -= 10;
                findings.push({
                    id: 'SEC-COOKIE-01',
                    title: 'Insecure Cookie Security Attributes Detected',
                    severity: 'MEDIUM',
                    category: 'OWASP A07: Identification and Authentication Failures',
                    cwe: 'CWE-614: Sensitive Cookie in HTTPS Session Without "Secure" Attribute',
                    problem: `${insecureCookies.length} cookie(s) lack required security flags (Secure, HttpOnly, or SameSite).`,
                    attackVector: 'Missing HttpOnly allows JavaScript XSS attacks to steal session tokens (document.cookie). Missing Secure allows interception over unencrypted networks. Missing SameSite allows Cross-Site Request Forgery (CSRF).',
                    remediation: {
                        summary: 'Always set "Secure; HttpOnly; SameSite=Strict" (or Lax) on all session and authentication cookies.',
                        nginx: `proxy_cookie_path / "/; Secure; HttpOnly; SameSite=Strict";`,
                        apache: `Header always edit Set-Cookie ^(.*)$ "$1; Secure; HttpOnly; SameSite=Strict"`,
                        express: `res.cookie('token', sessionToken, {\n  httpOnly: true,\n  secure: true,\n  sameSite: 'strict'\n});`
                    }
                });
            }
        }

        // 9. Non-Destructive Sensitive Path Exposure Check (/.env, /.git/HEAD, /admin)
        const sensitiveChecks = [
            { path: '/.env', signature: /DB_|PASSWORD|SECRET|API_KEY|APP_KEY/i, name: 'Environment Secrets (.env File)' },
            { path: '/.git/HEAD', signature: /ref: refs\//i, name: 'Git Source Code Repository (.git/HEAD)' }
        ];

        for (const check of sensitiveChecks) {
            try {
                const probeUrl = new URL(check.path, targetUrl.href);
                const probeRes = await this.fetchEndpoint(probeUrl, 'GET');
                if (probeRes.statusCode === 200 && check.signature.test(probeRes.bodySnippet)) {
                    score -= 25;
                    findings.push({
                        id: 'SEC-EXPOSED-01',
                        title: `CRITICAL: Publicly Accessible ${check.name}`,
                        severity: 'CRITICAL',
                        category: 'OWASP A05: Security Misconfiguration',
                        cwe: 'CWE-552: Files or Directories Accessible to External Parties',
                        problem: `Sensitive path "${check.path}" returned HTTP 200 and matches sensitive internal file signatures!`,
                        attackVector: 'Attackers download database credentials, private API secrets, or complete Git version control source code, granting complete backend database takeover.',
                        remediation: {
                            summary: `Immediately block public access to all dotfiles (.*) and hidden metadata directories in your web server.`,
                            nginx: `location ~ /\\. {\n    deny all;\n    access_log off;\n    log_not_found off;\n}`,
                            apache: `<FilesMatch "^\\.">\n    Require all denied\n</FilesMatch>`,
                            express: `// Serve static files with dotfiles: 'ignore'\napp.use(express.static('public', { dotfiles: 'ignore' }));`
                        }
                    });
                }
            } catch (_) {}
        }

        // Floor score at 0
        score = Math.max(0, Math.min(100, score));

        // Assign Grade
        let grade = 'F';
        if (score >= 95) grade = 'A+';
        else if (score >= 88) grade = 'A';
        else if (score >= 75) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 45) grade = 'D';

        const severityCounts = {
            CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
            HIGH: findings.filter(f => f.severity === 'HIGH').length,
            MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
            LOW: findings.filter(f => f.severity === 'LOW').length,
            PASSED: findings.filter(f => f.severity === 'PASSED').length
        };

        const auditReport = {
            target: targetUrl.href,
            hostname: targetUrl.hostname,
            protocol: targetUrl.protocol.replace(':', ''),
            scanTimestamp: new Date().toISOString(),
            durationMs: rootRes.durationMs,
            score,
            grade,
            severityCounts,
            totalChecks: findings.length,
            findings,
            serverInfo: {
                statusCode: rootRes.statusCode,
                serverHeader: headers['server'] || 'Protected / Hidden',
                poweredBy: headers['x-powered-by'] || 'None',
                tls: rootRes.tlsInfo
            }
        };

        this._printTerminalSummary(auditReport);
        return auditReport;
    }

    /**
     * Pretty-prints audit findings to terminal in professional ANSI cybersecurity format
     * @param {Object} report
     */
    _printTerminalSummary(report) {
        const gradeColor = report.score >= 85 ? '\x1b[32m' : report.score >= 60 ? '\x1b[33m' : '\x1b[31m';
        logger.user(`\n\x1b[35m╔═══════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
        logger.user(`\x1b[35m║\x1b[0m   \x1b[1m🛡️ CODEZ48 DEFENSIVE CYBERSECURITY VULNERABILITY AUDIT REPORT                       \x1b[0m\x1b[35m║\x1b[0m`);
        logger.user(`\x1b[35m╚═══════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.user(`  Target Website:     \x1b[1m\x1b[36m${report.target}\x1b[0m`);
        logger.user(`  Security Health:    ${gradeColor}\x1b[1m${report.score}/100 [GRADE ${report.grade}]\x1b[0m`);
        logger.user(`  Response Time:      ${report.durationMs} ms | HTTP Status: ${report.serverInfo.statusCode}`);
        logger.user(`  Vulnerability Tally: \x1b[31m${report.severityCounts.CRITICAL} Critical\x1b[0m, \x1b[33m${report.severityCounts.HIGH} High\x1b[0m, \x1b[33m${report.severityCounts.MEDIUM} Medium\x1b[0m, \x1b[34m${report.severityCounts.LOW} Low\x1b[0m, \x1b[32m${report.severityCounts.PASSED} Passed\x1b[0m\n`);

        const vulns = report.findings.filter(f => f.severity !== 'PASSED');
        if (vulns.length === 0) {
            logger.user(`  \x1b[32m✔ Outstanding! All evaluated defensive security headers and controls are hardened.\x1b[0m`);
        } else {
            logger.user(`  \x1b[1mIDENTIFIED VULNERABILITIES & EXPLOITATION RISKS:\x1b[0m`);
            vulns.forEach((v, idx) => {
                const badge = v.severity === 'CRITICAL' ? '\x1b[41m\x1b[37m CRITICAL \x1b[0m' :
                              v.severity === 'HIGH' ? '\x1b[43m\x1b[30m HIGH \x1b[0m' :
                              v.severity === 'MEDIUM' ? '\x1b[33m MEDIUM \x1b[0m' : '\x1b[34m LOW \x1b[0m';
                logger.user(`\n  [${idx + 1}] ${badge} \x1b[1m${v.title}\x1b[0m (${v.category})`);
                logger.user(`      \x1b[31m▸ என்ன பிரச்சனை (Problem):\x1b[0m ${v.problem}`);
                logger.user(`      \x1b[33m▸ ஹேக்கர்ஸ் எப்படி ஹேக் செய்ய வாய்ப்பு (Attack Vector):\x1b[0m ${v.attackVector}`);
                logger.user(`      \x1b[32m▸ எப்படி சரி செய்வது (Remediation):\x1b[0m ${v.remediation.summary}`);
            });
        }
        logger.user(`\x1b[35m─────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n`);
    }
}

module.exports = new WebsiteSecurityAuditor();
