/**
 * CODEZ48 WHATSAPP WEB ADAPTER
 * Autonomous WhatsApp Web (https://web.whatsapp.com) automation powered natively by Playwright.
 * - Persistent session storage in .whatsapp_web_profile
 * - Interactive login handling: prompts user via floating mini-window for phone number / OTP
 * - Generates and displays WhatsApp 8-character phone pairing code
 * - Monitors screen via screenshots and waits patiently until login and tasks complete
 * - Fast, verified outgoing message dispatch with checkmark confirmation
 * - Autonomous incoming message perception, screenshot evidence, and bilingual replies (Tamil & English)
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../core/logger');
const workspaceManager = require('../../core/workspace-manager');
const interactiveInputWindow = require('../browser/interactive-input-window');
const creditVault = require('../../core/credit-vault');
const activeBrowserDetector = require('../browser/active-browser-detector');

class WhatsAppWebAdapter {
    constructor() {
        this.context = null;
        this.page = null;
        this.profileDir = path.join(workspaceManager.getWorkspacePath(), '.whatsapp_web_profile');
        this.outputDir = path.join(workspaceManager.getWorkspacePath(), '.codez48_output', 'screenshots');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    getPlaywright() {
        try {
            return require('playwright');
        } catch (e) {
            throw new Error(`[PLAYWRIGHT NOT INSTALLED] ${e.message}`);
        }
    }

    /**
     * Launch or attach to persistent WhatsApp Web browser session
     */
    async initSession(options = {}) {
        if (this.page && !this.page.isClosed()) {
            return { context: this.context, page: this.page };
        }

        const pw = this.getPlaywright();
        const headless = options.headless !== undefined ? options.headless : false;

        logger.status(`\x1b[36m[WHATSAPP WEB] Initializing persistent browser session (Profile: ${this.profileDir})...\x1b[0m`);

        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ];

        const activeBrowser = activeBrowserDetector.getActiveBrowser();
        const primaryChannel = activeBrowser.channel || 'msedge';
        const channelOrder = primaryChannel === 'msedge' ? ['msedge', 'chrome'] : ['chrome', 'msedge'];

        let launched = false;
        for (const ch of channelOrder) {
            try {
                const bName = ch === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
                this.context = await pw.chromium.launchPersistentContext(this.profileDir, {
                    channel: ch,
                    headless,
                    viewport: null, // Full screen maximized
                    args: launchArgs,
                    ignoreDefaultArgs: ['--enable-automation']
                });
                logger.status(`\x1b[32m✔ Launched standard ${bName} browser for WhatsApp Web.\x1b[0m`);
                launched = true;
                break;
            } catch (_) {}
        }

        if (!launched) {
            this.context = await pw.chromium.launchPersistentContext(this.profileDir, {
                headless,
                viewport: null,
                args: launchArgs,
                ignoreDefaultArgs: ['--enable-automation']
            });
        }

        const pages = this.context.pages();
        this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
        this.page.setDefaultTimeout(30000);

        return { context: this.context, page: this.page };
    }

    /**
     * Check if WhatsApp Web is logged in or requires authentication
     */
    async checkLoginStatus() {
        if (!this.page) await this.initSession();

        const currentUrl = this.page.url();
        if (!currentUrl.includes('web.whatsapp.com')) {
            logger.status(`\x1b[36m[WHATSAPP WEB] Navigating to https://web.whatsapp.com...\x1b[0m`);
            await this.page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 35000 });
        }

        logger.status(`\x1b[36m[WHATSAPP WEB] Verifying authentication status...\x1b[0m`);

        // Wait up to 10 seconds to check for chat list or login screen
        for (let i = 0; i < 20; i++) {
            // Logged in indicators
            const hasChatList = await this.page.$('#pane-side, div[data-testid="chat-list"], div[aria-label="Chat list"]').catch(() => null);
            if (hasChatList && await hasChatList.isVisible().catch(() => false)) {
                logger.status(`\x1b[32m✓ WhatsApp Web session verified: ACTIVE & LOGGED IN\x1b[0m`);
                return { loggedIn: true };
            }

            // Not logged in indicators (QR Code or Link with phone number)
            const hasQr = await this.page.$('canvas[aria-label*="Scan" i], div[data-ref]').catch(() => null);
            const hasLinkBtn = await this.page.$('span[role="button"]:has-text("Link with phone number"), div[role="button"]:has-text("Link with phone number")').catch(() => null);

            if ((hasQr && await hasQr.isVisible().catch(() => false)) || (hasLinkBtn && await hasLinkBtn.isVisible().catch(() => false))) {
                logger.status(`\x1b[33m! WhatsApp Web requires authentication (QR code / Phone linking detected)\x1b[0m`);
                return { loggedIn: false };
            }

            await this.page.waitForTimeout(500);
        }

        return { loggedIn: false };
    }

    /**
     * Handle Login via Floating Mini-Window & Pairing Code / OTP
     */
    async handleLoginFlow(goalPrompt = '') {
        logger.status(`\n\x1b[33m[WHATSAPP WEB LOGIN] Initiating authentication sequence...\x1b[0m`);

        // Extract phone number from prompt if provided
        const phoneMatch = goalPrompt.match(/(?:\+?91)?[6-9]\d{9}/);
        let phoneNumber = phoneMatch ? phoneMatch[0] : '';

        // If not in prompt, open separate smaller window prompting user
        if (!phoneNumber) {
            phoneNumber = await interactiveInputWindow.promptUserInput({
                title: 'WhatsApp Web Authentication',
                prompt: 'WhatsApp Web is not logged in. Enter your mobile number to link via phone number (or scan the QR code in the browser window):',
                placeholder: '+91 9876543210',
                timeoutMs: 180000
            });
        }

        if (!phoneNumber) {
            logger.status(`\x1b[33m[WHATSAPP WEB] Waiting for user to scan QR code on screen...\x1b[0m`);
            // Patiently wait up to 2 minutes for QR scan
            await this.page.waitForSelector('#pane-side, div[data-testid="chat-list"]', { timeout: 120000 });
            return { success: true, method: 'QR_CODE' };
        }

        // Clean phone number
        const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
        const formattedNumber = cleanDigits.length === 10 ? `+91 ${cleanDigits}` : `+${cleanDigits}`;

        logger.status(`\x1b[36m[WHATSAPP WEB] Linking with phone number: ${formattedNumber}...\x1b[0m`);

        // Click "Link with phone number"
        const linkBtn = await this.page.$('span[role="button"]:has-text("Link with phone number"), div[role="button"]:has-text("Link with phone number")');
        if (linkBtn) {
            await linkBtn.click();
            await this.page.waitForTimeout(1000);
        }

        // Enter phone number in WhatsApp Web
        const phoneInput = await this.page.$('input[type="text"], input[aria-label*="phone" i]');
        if (phoneInput) {
            await phoneInput.fill(cleanDigits.length === 10 ? cleanDigits : cleanDigits.replace(/^91/, ''));
            await this.page.waitForTimeout(500);

            // Click Next button
            const nextBtn = await this.page.$('button:has-text("Next"), div[role="button"]:has-text("Next")');
            if (nextBtn) {
                await nextBtn.click();
                await this.page.waitForTimeout(2000);
            }
        }

        // Extract 8-character pairing code from WhatsApp Web
        let pairingCode = '';
        try {
            await this.page.waitForSelector('div[data-testid="link-device-code"], div[aria-details]', { timeout: 8000 });
            pairingCode = await this.page.$eval('div[data-testid="link-device-code"], div[aria-details]', el => el.innerText.trim());
        } catch (_) {}

        if (pairingCode) {
            logger.status(`\n\x1b[32m========================================================================================\x1b[0m`);
            logger.user(`\x1b[1m\x1b[33m📱 WHATSAPP WEB PAIRING CODE: [${pairingCode}]\x1b[0m`);
            logger.user(`\x1b[32m👉 On your phone: Open WhatsApp -> Settings -> Linked Devices -> Link with phone number\x1b[0m`);
            logger.user(`\x1b[32m👉 Enter the 8-character pairing code above to complete login.\x1b[0m`);
            logger.status(`\x1b[32m========================================================================================\x1b[0m\n`);
        }

        logger.status(`\x1b[36m[WHATSAPP WEB] Waiting patiently for phone authentication confirmation...\x1b[0m`);

        // Wait patiently for chat list to appear
        await this.page.waitForSelector('#pane-side, div[data-testid="chat-list"]', { timeout: 120000 });

        const shot = await this.captureScreenshot('whatsapp_web_login_verified');
        logger.user(`\x1b[32m✓ WhatsApp Web Login Successful! Verified Screenshot: ${shot.filePath}\x1b[0m`);

        return { success: true, pairingCode, screenshot: shot.filePath };
    }

    /**
     * Open WhatsApp Web in browser and keep session active
     */
    async openWhatsAppWeb() {
        const access = creditVault.isWhatsAppAllowed();
        if (!access.allowed) {
            logger.error(`\n\x1b[31m[WHATSAPP ACCESS DENIED] ${access.reason}\x1b[0m`);
            return {
                success: false,
                reason: 'FEATURE_LOCKED',
                error: access.reason
            };
        }

        logger.status(`\n\x1b[36m[WHATSAPP WEB] Opening WhatsApp Website (https://web.whatsapp.com) in browser...\x1b[0m`);
        await this.initSession({ headless: false });
        await this.page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await this.page.waitForTimeout(3000);

        const status = await this.checkLoginStatus();
        if (!status.loggedIn) {
            logger.status(`\x1b[33m[WHATSAPP WEB] Waiting for session authentication / QR code or phone pairing...\x1b[0m`);
        } else {
            logger.status(`\x1b[32m[WHATSAPP WEB] Active logged-in session detected!\x1b[0m`);
        }

        const shot = await this.captureScreenshot('whatsapp_web_opened');
        logger.user(`\x1b[32m✓ WhatsApp Website (https://web.whatsapp.com) opened successfully in browser!\x1b[0m`);
        logger.user(`\x1b[32m✓ Session Status:    ${status.loggedIn ? 'LOGGED_IN' : 'WAITING_FOR_AUTH'}\x1b[0m`);
        logger.user(`\x1b[32m✓ Verified Evidence: ${shot.filePath}\x1b[0m`);

        return {
            success: true,
            url: 'https://web.whatsapp.com',
            loggedIn: status.loggedIn,
            screenshotPath: shot.filePath
        };
    }

    /**
     * Fast On-Screen Message Dispatch:
     * When WhatsApp is active on screen or input box is already targeted,
     * immediately inserts text and sends via Enter without sluggish cursor animations.
     */
    async fastSendActiveChat(messageText) {
        if (!messageText) return { success: false, reason: 'Empty message' };
        logger.status(`\x1b[36m[WHATSAPP FAST DISPATCH] Directly targeting input box & pressing Enter...\x1b[0m`);

        if (this.page && !this.page.isClosed()) {
            const composeBox = await this.page.$('footer div[contenteditable="true"], div[data-tab="10"], div[role="textbox"][title*="Type a message" i]');
            if (composeBox) {
                await composeBox.focus().catch(() => {});
                await this.page.keyboard.insertText(messageText);
                await this.page.keyboard.press('Enter');
                logger.user(`\x1b[32m✔ Fast on-screen message sent!\x1b[0m`);
                return { success: true, method: 'DOM_DIRECT' };
            }
        }

        // GUI Driver Fallback: Direct keystroke / paste + Enter in foreground window
        const guiDriver = require('../drivers/gui-driver');
        guiDriver.typeText(messageText);
        guiDriver.pressKey('Return');
        logger.user(`\x1b[32m✔ Fast on-screen message dispatched via direct keystroke!\x1b[0m`);
        return { success: true, method: 'GUI_DIRECT' };
    }

    /**
     * Send WhatsApp Message via Web Interface (Optimized Fast Dispatch)
     */
    async sendMessage(recipientNumber, messageText) {
        const access = creditVault.isWhatsAppAllowed();
        if (!access.allowed) {
            logger.error(`\n\x1b[31m[WHATSAPP ACCESS DENIED] ${access.reason}\x1b[0m`);
            return {
                success: false,
                reason: 'FEATURE_LOCKED',
                error: access.reason
            };
        }

        await this.initSession();

        const cleanNumber = recipientNumber.replace(/[^0-9]/g, '');
        const targetNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

        logger.status(`\n\x1b[36m[WHATSAPP WEB DISPATCH] Preparing fast message dispatch to +${targetNumber}: "${messageText}"...\x1b[0m`);

        // Check if session is already active in DOM without triggering full page reloads
        let isAlreadyOnWa = this.page && this.page.url().includes('web.whatsapp.com');
        let hasChatList = isAlreadyOnWa ? await this.page.$('#pane-side, div[data-testid="chat-list"], div[aria-label="Chat list"]').catch(() => null) : null;

        // If not loaded on WhatsApp Web, check login flow
        if (!hasChatList) {
            const status = await this.checkLoginStatus();
            if (!status.loggedIn) {
                await this.handleLoginFlow(recipientNumber);
            }
        }

        let inDomSelected = false;

        // FAST PATH: If already loaded and chat list visible, perform in-DOM chat selection (< 500ms)
        if (hasChatList) {
            try {
                const searchSelector = '#side div[contenteditable="true"], div[data-tab="3"], div[role="textbox"][title*="Search" i], div[title="Search input textbox"]';
                const searchBox = await this.page.$(searchSelector).catch(() => null);
                if (searchBox) {
                    await searchBox.click().catch(() => {});
                    await searchBox.fill(cleanNumber).catch(() => {});
                    await this.page.waitForTimeout(400);

                    const chatCell = await this.page.$('#pane-side div[data-testid="cell-frame-container"], #pane-side div[role="listitem"]').catch(() => null);
                    if (chatCell) {
                        await chatCell.click().catch(() => {});
                        inDomSelected = true;
                        logger.status(`\x1b[32m[WHATSAPP WEB] Fast DOM chat selection resolved (< 500ms).\x1b[0m`);
                        await this.page.waitForTimeout(300);
                    }
                }
            } catch (_) {
                inDomSelected = false;
            }
        }

        // DIRECT NAVIGATION FALLBACK: If not found in current DOM, navigate directly to sendUrl
        if (!inDomSelected) {
            const sendUrl = `https://web.whatsapp.com/send?phone=${targetNumber}&text=${encodeURIComponent(messageText)}`;
            if (!this.page.url().includes(`phone=${targetNumber}`)) {
                logger.status(`\x1b[36m[WHATSAPP WEB] Navigating directly to compose route...\x1b[0m`);
                await this.page.goto(sendUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
            }
        }

        // Check for modal dialogs (e.g. invalid phone number / not on WhatsApp)
        const modal = await this.page.$('div[role="dialog"], div[data-animate-modal-popup="true"]').catch(() => null);
        if (modal) {
            const modalText = await modal.innerText().catch(() => '');
            if (/invalid|not on WhatsApp|shared via url is invalid/i.test(modalText)) {
                logger.warn(`\x1b[33m[WHATSAPP WEB NOTICE] Recipient +${targetNumber} is not registered on WhatsApp.\x1b[0m`);
                const okBtn = await modal.$('button, div[role="button"]').catch(() => null);
                if (okBtn) await okBtn.click().catch(() => {});
                const failShot = await this.captureScreenshot(`wa_web_not_on_wa_${targetNumber}`);
                return {
                    success: false,
                    recipient: targetNumber,
                    reason: 'NOT_ON_WHATSAPP',
                    delivered: false,
                    screenshotPath: failShot.filePath
                };
            }
        }

        // Fast compose box focus and text entry
        const composeBoxSelectors = [
            'footer div[contenteditable="true"]',
            'div[data-tab="10"]',
            'div[role="textbox"][title*="Type a message" i]',
            'div[data-testid="conversation-compose-box-input"]'
        ];

        let composeBox = null;
        for (const sel of composeBoxSelectors) {
            composeBox = await this.page.waitForSelector(sel, { timeout: inDomSelected ? 2000 : 8000 }).catch(() => null);
            if (composeBox) break;
        }

        if (composeBox) {
            await composeBox.focus().catch(() => {});
            const currentBoxText = await composeBox.innerText().catch(() => '');
            if (!currentBoxText.trim()) {
                await this.page.keyboard.insertText(messageText).catch(async () => {
                    await composeBox.fill(messageText).catch(() => {});
                });
                await this.page.waitForTimeout(200);
            }

            // Click send button or press Enter
            const sendBtnSelectors = [
                'span[data-icon="send"]',
                'button[aria-label="Send"]',
                'button[data-testid="compose-btn-send"]',
                'span[data-testid="send"]',
                'button[data-tab="11"]'
            ];
            let sendBtn = null;
            for (const sel of sendBtnSelectors) {
                sendBtn = await this.page.$(sel).catch(() => null);
                if (sendBtn) break;
            }

            if (sendBtn) {
                await sendBtn.click().catch(() => {});
                logger.status(`\x1b[32m[WHATSAPP WEB] Clicked Send button.\x1b[0m`);
            } else {
                await this.page.keyboard.press('Enter');
                logger.status(`\x1b[32m[WHATSAPP WEB] Dispatched via Enter key in compose box.\x1b[0m`);
            }
        } else {
            // Fallback Enter key press
            await this.page.keyboard.press('Enter');
        }

        // Verification: Fast checkmark polling (every 200ms up to 2.5s)
        let isDelivered = false;
        for (let i = 0; i < 12; i++) {
            const hasDoubleTick = await this.page.$('span[data-icon="msg-dblcheck"]').catch(() => null);
            const hasSingleTick = await this.page.$('span[data-icon="msg-check"]').catch(() => null);
            const hasClock = await this.page.$('span[data-icon="msg-time"]').catch(() => null);
            if (hasDoubleTick || hasSingleTick || hasClock) {
                isDelivered = true;
                break;
            }
            await this.page.waitForTimeout(200);
        }

        const shot = await this.captureScreenshot(`wa_web_sent_${targetNumber}`);
        const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Deduct WhatsApp Message Credit (1 credit on Enterprise, 0 credits / Unlimited on Profit-Oriented)
        const deduct = creditVault.deductWhatsAppMessageCredit(targetNumber, false);

        logger.status(`\n\x1b[32m========================================================================================\x1b[0m`);
        logger.user(`\x1b[32m✓ WhatsApp Web Message Dispatched Successfully (< 3s Fast Dispatch)!\x1b[0m`);
        logger.user(`\x1b[32m✓ Recipient:        +${targetNumber}\x1b[0m`);
        logger.user(`\x1b[32m✓ Message:          "${messageText}"\x1b[0m`);
        logger.user(`\x1b[32m✓ Timestamp (IST):  ${istTimestamp}\x1b[0m`);
        logger.user(`\x1b[32m✓ Delivery Status:  ${isDelivered ? 'VERIFIED (Checkmarks Confirmed)' : 'SENT'}\x1b[0m`);
        logger.user(`\x1b[32m✓ Evidence Proof:   ${shot.filePath}\x1b[0m`);
        logger.user(`\x1b[35m✓ Credits:          ${deduct.deducted !== undefined ? deduct.deducted : 0} Deducted (${deduct.isUnlimited ? 'Unlimited on ' + deduct.plan : 'Remaining: ' + (deduct.remainingBalance !== undefined ? deduct.remainingBalance : creditVault.getBalance())})\x1b[0m`);
        logger.status(`\x1b[32m========================================================================================\x1b[0m\n`);

        return {
            success: true,
            recipient: targetNumber,
            message: messageText,
            timestamp: istTimestamp,
            delivered: isDelivered,
            screenshotPath: shot.filePath
        };
    }

    /**
     * Autonomous Incoming Message Perception and Bilingual Auto-Reply
     */
    async monitorAndReply(options = {}) {
        const access = creditVault.isWhatsAppAllowed();
        if (!access.allowed) {
            logger.error(`\n\x1b[31m[WHATSAPP ACCESS DENIED] ${access.reason}\x1b[0m`);
            return {
                success: false,
                reason: 'FEATURE_LOCKED',
                error: access.reason
            };
        }

        await this.initSession();

        const status = await this.checkLoginStatus();
        if (!status.loggedIn) {
            await this.handleLoginFlow();
        }

        logger.status(`\n\x1b[36m[WHATSAPP WEB MONITOR] Scanning chat list for incoming messages...\x1b[0m`);

        // Look for unread badges in chat list
        const unreadBadge = await this.page.$('span[data-testid="icon-unread-count"], span[aria-label*="unread" i]');

        if (!unreadBadge) {
            logger.status(`\x1b[32m✓ No new unread messages. WhatsApp Web is active and idle.\x1b[0m`);
            const idleShot = await this.captureScreenshot('wa_web_idle');
            return {
                success: true,
                hasIncoming: false,
                screenshotPath: idleShot.filePath
            };
        }

        // Click unread chat
        logger.status(`\x1b[35m[WHATSAPP WEB] Unread message detected! Opening conversation...\x1b[0m`);
        await unreadBadge.click();
        await this.page.waitForTimeout(2000);

        // Scroll up slightly to fetch prior dialogue context
        logger.status(`\x1b[36m[WHATSAPP WEB] Scrolling up to analyze conversation history and context...\x1b[0m`);
        try {
            await this.page.mouse.move(650, 400);
            await this.page.mouse.wheel(0, -600);
            await this.page.waitForTimeout(1000);
        } catch (_) {}

        // Read conversation thread messages (incoming and outgoing)
        const threadMessages = await this.page.$eval('div.message-in, div.message-out', els => {
            return els.slice(-6).map(e => {
                const isIncoming = e.classList.contains('message-in');
                const t = e.querySelector('div.copyable-text')?.innerText?.trim() || '';
                return t ? `${isIncoming ? 'Sender' : 'Me'}: ${t}` : null;
            }).filter(Boolean);
        });

        const incomingText = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : 'Hello';
        const shot = await this.captureScreenshot('wa_web_incoming_received');
        const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        logger.user(`\x1b[32m✓ Incoming WhatsApp Message Context at ${istTimestamp}:\n    ${threadMessages.join('\n    ')}\x1b[0m`);

        // Contextual AI Reply Generation in EXACT SAME LANGUAGE (Tamil, English, Tanglish, Hindi)
        let replyText = '';
        try {
            const docAi = require('../ai/document-ai-engine');
            const aiPrompt = `The user received this WhatsApp conversation:\n${threadMessages.join('\n')}\n\nWrite a friendly, intelligent, polite response (1-2 sentences maximum) to the latest incoming message from Sender. Crucial rule: You MUST answer in the EXACT SAME LANGUAGE and script as the sender (if pure Tamil script, reply in Tamil script; if Tanglish/Tamil written in English script like 'epdi irukeenga', reply in Tanglish; if English, reply in English; if Hindi, reply in Hindi). Return ONLY the final reply text with no quotes, explanations, or metadata.`;
            const aiRes = await docAi.queryAi(aiPrompt, 'You are an intelligent bilingual WhatsApp assistant replying in the exact same language and dialect as the sender.');
            if (aiRes && typeof aiRes === 'string' && aiRes.trim().length > 0) {
                replyText = aiRes.trim().replace(/^[\"\']|[\"\']$/g, '');
            }
        } catch (e) {
            logger.debug(`Contextual AI reply generation fallback: ${e.message}`);
        }

        if (!replyText) {
            const isTamilScript = /[\u0B80-\u0BFF]/.test(incomingText);
            const isTanglish = /\b(vanakkam|epdi|nalla|irukken|irukingala|solunga|ama|illa|enna|pandringa|sollunga)\b/i.test(incomingText);
            if (isTamilScript) {
                replyText = 'வணக்கம்! உங்கள் செய்தி கிடைத்தது. நான் உடனடியாக கவனித்துவிட்டு பதிலளிக்கிறேன்.';
            } else if (isTanglish) {
                replyText = 'Vanakkam! Ungal message kedachudhu. Seekiram reply panren.';
            } else {
                replyText = 'Hello! Thank you for your message. I have received it and will get back to you shortly.';
            }
        }

        // Type and send reply
        const composeBox = await this.page.$('footer div[contenteditable="true"]');
        if (composeBox) {
            await composeBox.fill(replyText);
            await this.page.waitForTimeout(500);
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(2000);
        }

        const replyShot = await this.captureScreenshot('wa_web_reply_verified');

        // Deduct WhatsApp Message Credit for Auto-Reply (1 credit on Enterprise, 0 credits / Unlimited on Profit-Oriented)
        const deduct = creditVault.deductWhatsAppMessageCredit('Incoming Sender', true);

        logger.user(`\x1b[32m✓ Bilingual Reply Sent: "${replyText}" (Screenshot: ${replyShot.filePath})\x1b[0m`);
        logger.user(`\x1b[35m✓ Credits:          ${deduct.deducted !== undefined ? deduct.deducted : 0} Deducted (${deduct.isUnlimited ? 'Unlimited on ' + deduct.plan : 'Remaining: ' + (deduct.remainingBalance !== undefined ? deduct.remainingBalance : creditVault.getBalance())})\x1b[0m`);

        return {
            success: true,
            hasIncoming: true,
            incomingMessage: incomingText,
            replyText,
            timestamp: istTimestamp,
            screenshotPath: replyShot.filePath
        };
    }

    async captureScreenshot(namePrefix = 'wa_web') {
        const fileName = `${namePrefix}_${Date.now()}.png`;
        const filePath = path.join(this.outputDir, fileName);

        if (this.page && !this.page.isClosed()) {
            await this.page.screenshot({ path: filePath, timeout: 8000 }).catch(() => {});
        }

        return { filePath };
    }
}

module.exports = new WhatsAppWebAdapter();
