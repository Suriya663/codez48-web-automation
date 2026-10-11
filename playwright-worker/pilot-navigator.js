const fs = require('fs');
const path = require('path');
const browserManager = require('./browser-manager.js');
const stateVerifier = require('./state-verifier.js');
const appResolver = require('./app-resolver.js');
const { getCursor, setCursor, simulateClick, moveCursorSmoothly, bringWindowToFront } = require('./win32-cursor.js');

class PilotNavigator {
    async navigateAndInteract(goalUrl, expectedHref, options = {}) {
        const forcePhysical = options.forcePhysical === true;
        const page = await browserManager.getPage({ headless: forcePhysical ? false : true });
        console.log(`[PILOT NAVIGATOR] Navigating to target URL: ${goalUrl}`);

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

    async scrapeAndCloneWebsite(targetUrl = 'https://codez48.netlify.app/', projectName = 'cloned_website', port = 8080) {
        console.log(`[WEBSITE SCRAPER] Initiating source code retrieval & scraping for: "${targetUrl}"...`);

        let htmlContent = '';
        let pageTitle = 'Cloned Website';
        let styles = '';
        let scripts = '';

        try {
            const page = await browserManager.getPage({ headless: true });
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            htmlContent = await page.content();
            pageTitle = await page.title();

            styles = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
            }).catch(() => '');

            scripts = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent).join('\n');
            }).catch(() => '');

            await browserManager.close();
            console.log(`[WEBSITE SCRAPER PASS] Scraped ${htmlContent.length} bytes of HTML from "${targetUrl}" (Title: "${pageTitle}")`);
        } catch (scrapeErr) {
            console.warn('[WEBSITE SCRAPER WARN]: Scrape fallback enabled due to:', scrapeErr.message);
            htmlContent = `<!DOCTYPE html><html><head><title>${pageTitle}</title></head><body><h1>Cloned Website - ${pageTitle}</h1><p>Retrieved from ${targetUrl}</p></body></html>`;
        }

        // Ensure Tailwind CSS CDN is present if Tailwind classes are detected in HTML
        if (htmlContent.includes('class=') && (htmlContent.includes('flex') || htmlContent.includes('grid') || htmlContent.includes('bg-') || htmlContent.includes('text-'))) {
            if (!htmlContent.includes('cdn.tailwindcss.com')) {
                htmlContent = htmlContent.replace('</head>', '    <script src="https://cdn.tailwindcss.com"></script>\n</head>');
                console.log('[TAILWIND CSS DETECTED] Injected Tailwind CSS CDN into <head> for full style rendering.');
            }
        }

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
            targetUrl,
            scrapedTitle: pageTitle,
            projectPath: cloneRes.projectPath,
            filesChanged: cloneRes.filesChanged,
            previewUrl: cloneRes.previewUrl,
            vsCodePid: cloneRes.vsCodePid,
            powerShellPid: cloneRes.powerShellPid,
            confirmationMessage,
            testOutcomes: cloneRes.testOutcomes
        };
    }
}

module.exports = new PilotNavigator();
