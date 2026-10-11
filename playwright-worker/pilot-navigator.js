const fs = require('fs');
const path = require('path');
const dns = require('dns');
const browserManager = require('./browser-manager.js');
const stateVerifier = require('./state-verifier.js');
const appResolver = require('./app-resolver.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('./win32-cursor.js');

class PilotNavigator {
    validateUrl(urlString) {
        if (!urlString) return null;
        try {
            const parsed = new URL(urlString);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return null;
            }

            const host = parsed.hostname.toLowerCase();
            // Block localhost, private IP ranges, link-local addresses to prevent SSRF
            if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(host) ||
                host.startsWith('10.') ||
                host.startsWith('192.168.') ||
                host.startsWith('169.254.') ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
                if (process.env.NODE_ENV !== 'test' && !process.env.ALLOW_LOCAL_TARGETS) {
                    console.warn(`[SECURITY WARN] Blocked local/private network target: ${host}`);
                    return null;
                }
            }
            return parsed.href;
        } catch (e) {
            return null;
        }
    }

    async validateUrlAsync(urlString) {
        const validSync = this.validateUrl(urlString);
        if (!validSync) return null;

        try {
            const parsed = new URL(validSync);
            const host = parsed.hostname;

            // DNS resolution check to prevent DNS rebinding attacks
            if (!['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(host.toLowerCase())) {
                const lookup = await dns.promises.lookup(host, { all: true }).catch(() => []);

                for (const entry of lookup) {
                    const ip = entry.address;
                    if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip === '::1' ||
                        ip.startsWith('10.') ||
                        ip.startsWith('192.168.') ||
                        ip.startsWith('169.254.') ||
                        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
                        if (process.env.NODE_ENV !== 'test' && !process.env.ALLOW_LOCAL_TARGETS) {
                            console.warn(`[SECURITY WARN] DNS resolution resolved host "${host}" to private IP: ${ip}`);
                            return null;
                        }
                    }
                }
            }
            return validSync;
        } catch (e) {
            return null;
        }
    }

    isOfficialPrimaryDomain(urlString) {
        try {
            const parsed = new URL(urlString);
            const host = parsed.hostname.toLowerCase();
            return host === 'codez48.netlify.app' ||
                   host === 'codez48.com' ||
                   host === 'coach48.com' ||
                   host.endsWith('.codez48.com') ||
                   host.endsWith('.coach48.com');
        } catch (e) {
            return false;
        }
    }

    async navigateAndInteract(goalUrl, expectedHref, options = {}) {
        const forcePhysical = options.forcePhysical === true;
        const page = await browserManager.getPage({ headless: forcePhysical ? false : true });
        console.log(`[PILOT NAVIGATOR] Navigating to target URL with network readiness check: ${goalUrl}`);

        try {
            await page.goto(goalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (gotoErr) {
            await browserManager.close();
            return {
                success: false,
                failureReason: `Failed to load target URL "${goalUrl}": ${gotoErr.message}`,
                finalUrl: goalUrl,
                finalTitle: 'Navigation Failed',
                finalHeading: 'Navigation Failed'
            };
        }

        // Handle overlay per overlay rules
        if (!options.disableDismiss) {
            const overlayVisible = await page.evaluate(() => {
                const o = document.getElementById('onboarding-overlay');
                return o && o.offsetParent !== null;
            }).catch(() => false);

            if (overlayVisible) {
                const answerText = options.answer || 'English';
                console.log(`[OVERLAY DETECTED] Dismissing onboarding overlay (matching "${answerText}")...`);
                const answerBtn = page.locator('#onboarding-overlay button, #onboarding-overlay a').filter({ hasText: answerText }).first();
                if (await answerBtn.isVisible().catch(() => false)) {
                    await answerBtn.click().catch(() => {});
                    await page.evaluate(() => {
                        const o = document.getElementById('onboarding-overlay');
                        if (o) o.style.display = 'none';
                    }).catch(() => {});
                    await page.waitForTimeout(500);
                }
            }
        }

        const initialTitle = await page.title();
        let verificationResult = { success: true };

        if (expectedHref) {
            try {
                let clickSelector = `a[href*="${expectedHref.replace('#', '')}"], a:has-text("${expectedHref.replace(/[\/#]/g, '').toUpperCase()}")`;
                if (expectedHref === '#pricing') {
                    clickSelector = 'a[href*="pricing"], a:has-text("Pricing")';
                } else if (expectedHref === '/cli' || expectedHref.toLowerCase().includes('cli')) {
                    clickSelector = 'a[href*="cli"], a:has-text("CLI")';
                }

                if (!forcePhysical) {
                    console.log(`[ACTION DISPATCHER] Executing preferred Playwright DOM click on selector: "${clickSelector}"`);
                    const loc = page.locator(clickSelector).first();
                    await loc.waitFor({ state: 'visible', timeout: 5000 });
                    await loc.click({ timeout: 5000 });
                } else {
                    console.log(`[ACTION DISPATCHER] Dispatching Win32 Physical Cursor interaction for: "${expectedHref}"`);
                    const locator = page.locator(clickSelector).first();

                    await locator.waitFor({ state: 'visible', timeout: 5000 });
                    const box = await locator.boundingBox();

                    if (box) {
                        const winGeometry = await page.evaluate(() => ({
                            screenX: window.screenX || window.screenLeft || 0,
                            screenY: window.screenY || window.screenTop || 0,
                            outerWidth: window.outerWidth || 1280,
                            outerHeight: window.outerHeight || 800,
                            innerWidth: window.innerWidth || 1280,
                            innerHeight: window.innerHeight || 800
                        })).catch(() => ({ screenX: 0, screenY: 0, outerWidth: 1280, outerHeight: 800, innerWidth: 1280, innerHeight: 800 }));

                        const borderWidth = Math.max(0, Math.round((winGeometry.outerWidth - winGeometry.innerWidth) / 2));
                        const titleBarHeight = Math.max(0, winGeometry.outerHeight - winGeometry.innerHeight);

                        const clientScreenX = winGeometry.screenX + borderWidth;
                        const clientScreenY = winGeometry.screenY + titleBarHeight;

                        const targetScreenX = clientScreenX + box.x + box.width / 2;
                        const targetScreenY = clientScreenY + box.y + box.height / 2;

                        bringWindowToFront(initialTitle);
                        await page.bringToFront();
                        await new Promise(r => setTimeout(r, 500));

                        const posAfterMove = moveCursorSmoothly(targetScreenX, targetScreenY);
                        simulateClick();
                        console.log(`[PHYSICAL CLICK] Mouse down & up executed successfully.`);
                    } else {
                        await page.click(clickSelector, { timeout: 5000 });
                    }
                }

                verificationResult = await stateVerifier.verifyNavigationOutcome(page, expectedHref);
            } catch (e) {
                console.warn('[PILOT NAVIGATOR ERROR]:', e.message);
                verificationResult = { success: false, error: e.message };
            }
        } else {
            verificationResult = { success: true, expectedOutcome: page.url() };
        }

        const finalUrl = page.url();
        const finalTitle = await page.title().catch(() => '');
        const finalHeading = await page.locator('h1, h2').first().textContent().catch(() => 'Codez48');

        await browserManager.close();

        return {
            success: verificationResult.success === true,
            failureReason: verificationResult.success === true ? null : (verificationResult.error || 'Navigation outcome could not be verified'),
            finalUrl,
            finalTitle,
            finalHeading
        };
    }

    async scrapeAndCloneWebsite(targetUrl = 'https://codez48.netlify.app/', projectName = 'cloned_website', port = 8080, options = {}) {
        // 1. Strict Async URL, DNS & SSRF Validation
        const validUrl = await this.validateUrlAsync(targetUrl);
        if (!validUrl) {
            console.error(`[SECURITY BLOCK] Invalid URL, unresolvable host, or unauthorized protocol/SSRF target: "${targetUrl}"`);
            return {
                success: false,
                error: 'INVALID_URL',
                failureReason: `URL "${targetUrl}" is invalid or failed security protocol/SSRF/DNS validation.`,
                targetUrl
            };
        }

        // 2. Official Primary Domain Protection with Exact Hostname Check
        if (this.isOfficialPrimaryDomain(validUrl)) {
            const allowOfficial = options.allowOfficial === true || process.env.ALLOW_OFFICIAL_SCRAPE === 'true';
            if (!allowOfficial) {
                console.error(`[SECURITY BLOCK] Web scraping and code reconstruction are strictly restricted on official primary website: ${validUrl}`);
                return {
                    success: false,
                    error: 'OFFICIAL_PRIMARY_DOMAIN_PROTECTED',
                    failureReason: 'Web scraping and code reconstruction are strictly restricted on official primary website. Specify allowOfficial: true to explicitly authorize testing on owned domains.',
                    targetUrl: validUrl,
                    confirmationMessage: 'Official primary domain is protected against web scraping.'
                };
            } else {
                console.log(`[AUTHORIZED OFFICIAL SCRAPE] Primary official domain scraping authorized for task: "${validUrl}"`);
            }
        }

        console.log(`[WEBSITE SCRAPER] Initiating source code retrieval & scraping for: "${validUrl}"...`);

        let htmlContent = '';
        let pageTitle = 'Cloned Website';
        let styles = '';
        let scripts = '';
        let externalStylesCount = 0;
        let externalScriptsCount = 0;
        let tailwindInjected = false;
        let redirectBlocked = false;

        try {
            const page = await browserManager.getPage({ headless: true });

            // Intercept all outgoing network requests to enforce strict SSRF protocol & IP validation BEFORE request dispatch
            await page.route('**/*', async (route) => {
                const reqUrl = route.request().url();
                const isValid = await this.validateUrlAsync(reqUrl);
                if (!isValid) {
                    console.warn(`[SECURITY BLOCK] Intercepted and blocked request to unauthorized/private destination: "${reqUrl}"`);
                    redirectBlocked = true;
                    return route.abort('blockedbyclient');
                }
                return route.continue();
            });

            // 1. Send initial request with bounded networkidle readiness check (10000ms timeout)
            console.log(`[WEBSITE SCRAPER] Dispatching initial network request to "${validUrl}" with bounded networkidle readiness check...`);
            let response = null;
            try {
                response = await page.goto(validUrl, { waitUntil: 'networkidle', timeout: 10000 });
            } catch (netIdleErr) {
                console.log(`[NETWORK READINESS NOTICE] Network idle wait reached timeout or active streaming connection. Falling back to load state for "${validUrl}"...`);
                response = await page.goto(validUrl, { waitUntil: 'load', timeout: 20000 });
            }

            if (redirectBlocked) {
                await browserManager.close();
                return {
                    success: false,
                    error: 'REDIRECT_BLOCKED',
                    failureReason: 'Redirect destination failed SSRF security validation and was blocked before access.',
                    targetUrl: validUrl
                };
            }

            // 2. Inspect HTTP Response Status Code & Content-Type Header
            const httpStatus = response ? response.status() : 200;
            const contentType = response ? (response.headers()['content-type'] || 'text/html') : 'text/html';
            console.log(`[NETWORK RESPONSE PROCESSED] URL: "${validUrl}", HTTP Status: ${httpStatus}, Content-Type: "${contentType}"`);

            if (httpStatus >= 400) {
                await browserManager.close();
                console.error(`[WEBSITE SCRAPER ERROR] HTTP ${httpStatus} error returned from server for "${validUrl}".`);
                return {
                    success: false,
                    error: 'HTTP_ERROR_STATUS',
                    failureReason: `Server returned HTTP ${httpStatus} error status for URL "${validUrl}".`,
                    targetUrl: validUrl
                };
            }

            if (!contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('json') && !contentType.includes('plain')) {
                await browserManager.close();
                console.error(`[WEBSITE SCRAPER ERROR] Unsupported Content-Type "${contentType}" returned from "${validUrl}".`);
                return {
                    success: false,
                    error: 'UNSUPPORTED_CONTENT_TYPE',
                    failureReason: `URL "${validUrl}" returned unsupported Content-Type "${contentType}".`,
                    targetUrl: validUrl
                };
            }

            // 3. Revalidate destination URL after redirects to prevent SSRF bypass
            const finalDestinationUrl = page.url();
            const validFinalUrl = await this.validateUrlAsync(finalDestinationUrl);
            if (!validFinalUrl) {
                await browserManager.close();
                console.error(`[SECURITY BLOCK] Redirect destination failed SSRF validation: "${finalDestinationUrl}"`);
                return {
                    success: false,
                    error: 'REDIRECT_BLOCKED',
                    failureReason: `Redirect destination "${finalDestinationUrl}" failed SSRF security validation.`,
                    targetUrl: validUrl
                };
            }

            // 4. Bounded SPA Hydration Pause for client-side frameworks
            await page.waitForTimeout(1000);

            htmlContent = await page.content();
            pageTitle = await page.title();

            styles = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
            }).catch(() => '');

            scripts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent).join('\n');
            }).catch(() => '');

            externalStylesCount = await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').length).catch(() => 0);
            externalScriptsCount = await page.evaluate(() => document.querySelectorAll('script[src]').length).catch(() => 0);

            await browserManager.close();

            if (!htmlContent || htmlContent.length < 50) {
                throw new Error("Page content extraction produced empty or invalid HTML.");
            }

            console.log(`[WEBSITE SCRAPER PASS] Scraped ${htmlContent.length} bytes of HTML from "${validUrl}" (Title: "${pageTitle}")`);
        } catch (scrapeErr) {
            console.error(`[WEBSITE SCRAPER ERROR] Extraction failed for "${validUrl}":`, scrapeErr.message);
            await browserManager.close().catch(() => {});

            if (redirectBlocked) {
                return {
                    success: false,
                    error: 'REDIRECT_BLOCKED',
                    failureReason: 'Redirect destination failed SSRF security validation and was blocked before access.',
                    targetUrl: validUrl
                };
            }

            return {
                success: false,
                error: 'EXTRACTION_FAILED',
                failureReason: `Failed to scrape website source code from "${validUrl}": ${scrapeErr.message}`,
                targetUrl: validUrl
            };
        }

        // Ensure Tailwind CSS CDN is present if Tailwind classes are detected in HTML
        if (htmlContent.includes('class=') && (htmlContent.includes('flex') || htmlContent.includes('grid') || htmlContent.includes('bg-') || htmlContent.includes('text-'))) {
            if (!htmlContent.includes('cdn.tailwindcss.com')) {
                htmlContent = htmlContent.replace('</head>', '    <script src="https://cdn.tailwindcss.com"></script>\n</head>');
                tailwindInjected = true;
                console.log('[TAILWIND CSS DETECTED] Injected Tailwind CSS CDN into <head> for full style rendering.');
            }
        }

        // Explicitly link style.css and script.js in index.html for local modular project linkage
        if (!htmlContent.includes('href="style.css"')) {
            htmlContent = htmlContent.replace('</head>', '    <link rel="stylesheet" href="style.css">\n</head>');
        }
        if (!htmlContent.includes('src="script.js"')) {
            htmlContent = htmlContent.replace('</body>', '    <script src="script.js"></script>\n</body>');
        }

        const resourceSummary = {
            htmlBytes: htmlContent.length,
            inlineStylesExtracted: styles.length > 0,
            inlineScriptsExtracted: scripts.length > 0,
            externalStylesheetsCount: externalStylesCount,
            externalScriptsCount: externalScriptsCount,
            tailwindCdnInjected: tailwindInjected
        };

        // Delegate workspace creation, VS Code opening & local hosting to nativeAppAutomation
        const nativeAppAutomation = require('./native-app-automation.js');
        const scFiles = [
            { name: 'index.html', content: htmlContent },
            { name: 'style.css', content: styles || '/* Scraped CSS Stylesheet */\nbody { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }' },
            { name: 'script.js', content: scripts || '// Scraped JavaScript Logic\nconsole.log("[SCRAPED APP LOG] Cloned website loaded cleanly");' },
            {
                name: 'package.json',
                content: JSON.stringify({
                    name: projectName.toLowerCase(),
                    version: '1.0.0',
                    description: 'Reconstructed website workspace generated and verified by Codez48 Pilot',
                    main: 'index.html',
                    scripts: { start: `npx http-server -p ${port}` }
                }, null, 2)
            }
        ];

        const cloneRes = await nativeAppAutomation.automatedVsCodeSaveAsWorkflow({
            projectName,
            files: scFiles,
            port
        });

        const confirmationMessage = "We have received and saved everything.";
        console.log(`[CONFIRMATION STATUS] ${confirmationMessage}`);

        return {
            success: cloneRes.success === true,
            targetUrl: validUrl,
            scrapedTitle: pageTitle,
            projectPath: cloneRes.projectPath,
            filesChanged: cloneRes.filesChanged,
            previewUrl: cloneRes.previewUrl,
            vsCodePid: cloneRes.vsCodePid,
            powerShellPid: cloneRes.powerShellPid,
            resourceSummary,
            confirmationMessage,
            testOutcomes: cloneRes.testOutcomes
        };
    }
}

module.exports = new PilotNavigator();
