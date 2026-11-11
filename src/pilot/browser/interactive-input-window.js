/**
 * CODEZ48 INTERACTIVE INPUT WINDOW
 * Opens a small, separate browser-like window containing prompt, input field(s), and submit button.
 * Used for Human-In-The-Loop authentication, OTP verification, email inputs, and credentials.
 * Automatically resolves user input and closes cleanly upon submission.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../core/logger');

class InteractiveInputWindow {
    /**
     * Prompts the user with a small dedicated floating browser window.
     * @param {Object} options
     * @param {string} options.title - Window and card title (e.g. "Google AI Studio Login")
     * @param {string} options.prompt - Prompt instruction message
     * @param {string} options.placeholder - Placeholder text for input
     * @param {string} options.defaultValue - Optional pre-filled value
     * @param {boolean} options.isPassword - Whether to mask the input
     * @param {Array} options.fields - Optional multi-field configuration [{ name, label, placeholder, type }]
     * @param {number} options.timeoutMs - Timeout in milliseconds (default: 180000ms = 3 mins)
     */
    async promptUserInput(options = {}) {
        // Fast-path test runner / non-interactive simulation
        if (process.env.CODEZ48_TEST_AUTO_INPUT) {
            try {
                return JSON.parse(process.env.CODEZ48_TEST_AUTO_INPUT);
            } catch (_) {
                return process.env.CODEZ48_TEST_AUTO_INPUT;
            }
        }

        const title = options.title || 'Authentication & Verification Required';
        const prompt = options.prompt || 'Please enter the required information to continue:';
        const placeholder = options.placeholder || 'Type your response here...';
        const defaultValue = options.defaultValue || '';
        const isPassword = !!options.isPassword;
        const fields = options.fields || null;
        const timeoutMs = options.timeoutMs || 180000;

        logger.status(`\n\x1b[33m[INTERACTIVE PROMPT] Opening floating input window: "${title}"...\x1b[0m`);

        const tempDir = os.tmpdir();
        const htmlFile = path.join(tempDir, `cdz48_prompt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.html`);

        // Screenshot Preview Integration
        let screenshotHtml = '';
        if (options.screenshotPath && fs.existsSync(options.screenshotPath)) {
            try {
                const imgData = fs.readFileSync(options.screenshotPath).toString('base64');
                screenshotHtml = `
                    <div style="margin-bottom: 14px; text-align: center; border-radius: 8px; overflow: hidden; border: 1px solid #334155; max-height: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); background: #000;">
                        <img src="data:image/png;base64,${imgData}" alt="Captured Site Screenshot" style="width: 100%; height: auto; max-height: 220px; display: block; object-fit: contain;" />
                    </div>
                `;
            } catch (_) {}
        } else if (options.imageBase64) {
            screenshotHtml = `
                <div style="margin-bottom: 14px; text-align: center; border-radius: 8px; overflow: hidden; border: 1px solid #334155; max-height: 220px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); background: #000;">
                    <img src="${options.imageBase64.startsWith('data:') ? options.imageBase64 : 'data:image/png;base64,' + options.imageBase64}" alt="Captured Site Screenshot" style="width: 100%; height: auto; max-height: 220px; display: block; object-fit: contain;" />
                </div>
            `;
        }

        // Generate Field HTML
        let fieldsHtml = '';
        if (fields && Array.isArray(fields) && fields.length > 0) {
            fieldsHtml = fields.map((f, idx) => `
                <div class="field-group">
                    <label class="field-label">${f.label || f.name}</label>
                    <input type="${f.type || 'text'}" id="field_${f.name}" class="input-box" placeholder="${f.placeholder || ''}" value="${f.defaultValue || ''}" ${idx === 0 ? 'autofocus' : ''} />
                </div>
            `).join('');
        } else {
            fieldsHtml = `
                <div class="field-group">
                    <input type="${isPassword ? 'password' : 'text'}" id="singleInput" class="input-box" placeholder="${placeholder}" value="${defaultValue}" autofocus />
                </div>
            `;
        }

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #0A0F1D;
            color: #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 22px;
            user-select: none;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            border-bottom: 1px solid #1E293B;
            padding-bottom: 10px;
        }
        .header-icon {
            font-size: 20px;
        }
        .header-text {
            font-size: 13px;
            font-weight: 700;
            color: #E5B80B;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .prompt-text {
            font-size: 13px;
            color: #CBD5E1;
            line-height: 1.45;
            margin-bottom: 18px;
        }
        .field-group {
            margin-bottom: 14px;
        }
        .field-label {
            display: block;
            font-size: 12px;
            color: #94A3B8;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .input-box {
            width: 100%;
            background: #161E31;
            border: 1px solid #3F4C6B;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 14px;
            color: #FFFFFF;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-box:focus {
            border-color: #E5B80B;
            box-shadow: 0 0 10px rgba(229, 184, 11, 0.35);
        }
        .footer {
            margin-top: auto;
            display: flex;
            gap: 10px;
        }
        .btn-submit {
            flex: 1;
            background: linear-gradient(135deg, #E5B80B 0%, #B8860B 100%);
            color: #0A0F1D;
            font-weight: 700;
            font-size: 13px;
            padding: 11px 18px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            letter-spacing: 0.5px;
            transition: filter 0.15s, transform 0.1s;
        }
        .btn-submit:hover {
            filter: brightness(1.12);
        }
        .btn-submit:active {
            transform: scale(0.98);
        }
        .status-badge {
            font-size: 11px;
            color: #64748B;
            text-align: center;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-icon">🔐</span>
        <span class="header-text">${title}</span>
    </div>
    <div class="prompt-text">${prompt}</div>
    ${screenshotHtml}
    ${fieldsHtml}
    <div class="footer">
        <button class="btn-submit" id="submitBtn">Submit &amp; Proceed</button>
    </div>
    <div class="status-badge">Codez48 Pilot // Autonomous Security Gateway</div>

    <script>
        const btn = document.getElementById('submitBtn');
        const isMulti = ${fields && fields.length > 0 ? 'true' : 'false'};

        function getPayload() {
            if (!isMulti) {
                const single = document.getElementById('singleInput');
                return single ? single.value.trim() : '';
            }
            const data = {};
            ${fields && fields.length > 0 ? fields.map(f => `
                const el_${f.name} = document.getElementById('field_${f.name}');
                if (el_${f.name}) data['${f.name}'] = el_${f.name}.value.trim();
            `).join('') : ''}
            return data;
        }

        function doSubmit() {
            const payload = getPayload();
            btn.innerText = 'Submitting...';
            btn.disabled = true;
            if (window.__cdzSubmit) {
                window.__cdzSubmit(payload);
            }
        }

        btn.addEventListener('click', doSubmit);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSubmit();
        });

        // Autofocus first input field
        setTimeout(() => {
            const first = document.querySelector('input');
            if (first) first.focus();
        }, 150);
    </script>
</body>
</html>`;

        fs.writeFileSync(htmlFile, htmlContent, 'utf8');

        let submittedValue = null;
        let promptBrowser = null;

        try {
            const pw = require('playwright');
            const fileUri = `file://${htmlFile.replace(/\\/g, '/')}`;

            const winWidth = screenshotHtml ? 540 : 480;
            const winHeight = screenshotHtml ? 600 : 380;

            const launchArgs = [
                `--app=${fileUri}`,
                `--window-size=${winWidth},${winHeight}`,
                '--window-position=540,180',
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled'
            ];

            try {
                promptBrowser = await pw.chromium.launch({
                    channel: 'chrome',
                    headless: false,
                    args: launchArgs,
                    ignoreDefaultArgs: ['--enable-automation']
                });
            } catch (_) {
                try {
                    promptBrowser = await pw.chromium.launch({
                        channel: 'msedge',
                        headless: false,
                        args: launchArgs,
                        ignoreDefaultArgs: ['--enable-automation']
                    });
                } catch (__fallbackErr) {
                    promptBrowser = await pw.chromium.launch({
                        headless: false,
                        args: launchArgs,
                        ignoreDefaultArgs: ['--enable-automation']
                    });
                }
            }

            const page = await promptBrowser.newPage();
            await page.setViewportSize({ width: 460, height: 340 });

            await page.exposeFunction('__cdzSubmit', async (val) => {
                submittedValue = val;
                logger.status(`\x1b[32m✓ User input captured from floating window.\x1b[0m`);
                try {
                    await promptBrowser.close();
                } catch (_) {}
            });

            await page.goto(fileUri);

            // Wait for user submission or timeout
            const startTime = Date.now();
            while (submittedValue === null && (Date.now() - startTime < timeoutMs)) {
                if (!promptBrowser.isConnected()) {
                    // User manually closed the window
                    break;
                }
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (err) {
            logger.debug(`[PROMPT WINDOW FALLBACK] ${err.message}`);
        } finally {
            if (promptBrowser && promptBrowser.isConnected()) {
                await promptBrowser.close().catch(() => {});
            }
            if (fs.existsSync(htmlFile)) {
                try { fs.unlinkSync(htmlFile); } catch (_) {}
            }
        }

        return submittedValue;
    }
}

module.exports = new InteractiveInputWindow();
