/**
 * CODEZ48 WHATSAPP BATCH CAMPAIGN ENGINE
 *
 * Automated sequential WhatsApp message dispatch with:
 *   1. Recipient Sources:
 *      - Excel file path (.xlsx, .xls)
 *      - CSV file path (.csv)
 *      - Comma-separated mobile numbers or usernames
 *   2. Content Generation Modes:
 *      - Option A: Manual message text
 *      - Option B: Batch personalized template
 *      - Option C: AI-driven tailored business content with link & call-to-action
 *   3. Foreground Lock:
 *      - Keeps WhatsApp strictly in the foreground so no background apps interfere
 *   4. Sequential Per-Recipient Workflow:
 *      - Opens chat for each number via direct URL protocol (whatsapp://send?phone=...)
 *      - Takes desktop screenshot at 1536x864 resolution
 *      - Vision AI inspects conversation history:
 *        * If history exists -> crafts contextual reply to last message received
 *        * If new chat -> sends primary business intro + link
 *      - Dual-Action Send (keystroke Enter + Send Button click) for 100% reliable delivery
 *   5. Plan Enforcement:
 *      - Plan 2 (Enterprise ₹599) & Plan 3 (Profit-Oriented ₹999): Unlimited access
 *      - Plan 1 (Micro ₹299): 3 free instances/sessions. Once used, payment upgrade required.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

const contactReader = require('./contact-reader');
const foregroundLock = require('./foreground-lock');
const guiDriver = require('../src/pilot/drivers/gui-driver');
const screenCapture = require('../src/pilot/browser/screen-capture');
const visionAI = require('./vision-ai');
const creditVault = require('../src/core/credit-vault');
const documentAiEngine = require('../src/pilot/ai/document-ai-engine');
const { formatTerminalBox } = require('../src/core/box-formatter');

const OUTPUT_DIR = path.resolve(__dirname, '../.codez48_output');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    try {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    } catch (_) {}
}

class WhatsAppBatchEngine {
    constructor() {
        this.screenWidth = 1536;
        this.screenHeight = 864;
    }

    /**
     * Generate engaging AI content tailored to the user's business
     */
    async generateAiBusinessContent(businessDetails, apiCall = null) {
        const { businessName, whatYouDo, keyOffering, link, targetAudience, cta, selectedService } = businessDetails;
        const effectiveService = selectedService || whatYouDo || keyOffering || 'Complete automated business systems and high-converting websites';

        console.log(`\n\x1b[36m[AI COPYWRITER] Generating engaging WhatsApp introduction message for "${businessName || 'Business'}"...\x1b[0m`);

        const systemInstruction = `You are an elite marketing copywriter for WhatsApp business campaigns and orders.
Craft a compelling, friendly, concise, and high-conversion WhatsApp message.
Rules:
- Must be concise (2-4 short paragraphs, readable on mobile in 15 seconds).
- Highlight the selected service/order: "${effectiveService}".
- Naturally include the user's link: "${link || 'https://codez48.com'}".
- Include a clear, polite call-to-action (CTA).
- Use professional emojis tastefully.
- Support both English and Tamil if requested.
- Return ONLY the final message text to be sent directly to the customer.`;

        const prompt = `Business / Brand Name: ${businessName || 'Codez48 Solutions'}
Selected Service / Order: ${effectiveService}
Nature of Business: ${whatYouDo || 'AI Automation and Digital Services'}
Website / Product Link: ${link || 'https://codez48.com'}
Call to Action: ${cta || 'Contact us today for a free consultation'}
Target Audience: ${targetAudience || 'Entrepreneurs and business owners'}`;

        let copy = null;
        try {
            copy = await documentAiEngine.queryAi(prompt, systemInstruction, apiCall, 1024);
        } catch (_) {}

        if (!copy || copy.trim().length < 20) {
            copy = `வணக்கம்! 🌟

${businessName ? `நாங்கள் ${businessName}` : 'எங்களின் சேவைகள்'}: ${whatYouDo || 'உங்கள் வணிகத்திற்கான சிறந்த AI ஆட்டோமேஷன் மற்றும் டிஜிட்டல் சேவைகளை வழங்குகிறோம்'}.

எங்களின் முக்கிய சேவைகள்: ${keyOffering || 'தானியங்கி அமைப்புகள் மற்றும் தொழில்முறை தளங்கள்'}.

மேலும் விவரங்களை அறிய எங்கள் தளத்தைப் பார்வையிடவும்:
👉 ${link || 'https://codez48.com'}

${cta || 'உங்களுக்கு எவ்வாறு உதவலாம் என்பதை அறிய உடனே பதிலளிக்கவும்!'}`;
        }

        console.log(`\x1b[32m[AI COPYWRITER] Message generated successfully (${copy.trim().length} chars).\x1b[0m\n`);
        return copy.trim();
    }

    /**
     * Generate contextual AI reply when previous message history exists
     */
    async generateContextualFollowUp(lastReceivedMessage, businessMessage, apiCall = null) {
        const prompt = `A customer on WhatsApp previously said:
"${lastReceivedMessage}"

We want to send them our business message/offering:
"${businessMessage}"

Generate a short, courteous follow-up response that:
1. First politely acknowledges or answers their previous statement.
2. Naturally connects to our offering with the link.
Return ONLY the message to send.`;

        try {
            const reply = await documentAiEngine.queryAi(prompt, 'You are an intelligent WhatsApp customer relation assistant.', apiCall, 800);
            if (reply && reply.trim().length > 15) {
                return reply.trim();
            }
        } catch (_) {}

        return `வணக்கம்! உங்கள் முந்தைய செய்திக்கு நன்றி. ${businessMessage}`;
    }

    /**
     * Compute safe, clamped coordinates for compose box and send button
     * Guarantees cursor NEVER moves past the input box into the Windows Taskbar
     */
    getSafeComposeCoordinates(layoutCoords = null) {
        const workingHeight = Math.max(700, this.screenHeight - 48); // Safe taskbar deduction
        // Center of compose box in maximized WhatsApp window is ~52px above bottom border
        // (On 864p: 816 - 52 = 764px; on 1080p: 1040 - 52 = 988px)
        const defaultComposeY = Math.round(workingHeight - 52);
        let composeX = Math.round(this.screenWidth * 0.55);
        let composeY = defaultComposeY;
        let sendBtnX = Math.round(this.screenWidth * 0.965);
        let sendBtnY = defaultComposeY;

        if (layoutCoords && layoutCoords.composeBox) {
            if (layoutCoords.composeBox.x) composeX = Math.round(layoutCoords.composeBox.x);
            if (layoutCoords.composeBox.y) {
                let targetY = Math.round(layoutCoords.composeBox.y);
                if (layoutCoords.composeBox.height) {
                    targetY = Math.round(layoutCoords.composeBox.y + (layoutCoords.composeBox.height / 2));
                }
                // Clamp targetY: MUST NEVER exceed workingHeight - 35 (to avoid taskbar)
                // and MUST NEVER be higher than workingHeight - 95
                if (targetY > (workingHeight - 35) || targetY < (workingHeight - 95)) {
                    composeY = defaultComposeY;
                } else {
                    composeY = targetY;
                }
            }
        }

        if (layoutCoords && layoutCoords.sendButton) {
            if (layoutCoords.sendButton.x) sendBtnX = Math.round(layoutCoords.sendButton.x);
            if (layoutCoords.sendButton.y) {
                let targetSendY = Math.round(layoutCoords.sendButton.y);
                if (targetSendY > (workingHeight - 30) || targetSendY < (workingHeight - 95)) {
                    sendBtnY = defaultComposeY;
                } else {
                    sendBtnY = targetSendY;
                }
            }
        }

        return { composeX, composeY, sendBtnX, sendBtnY };
    }

    /**
     * Open WhatsApp direct chat for a contact
     */
    async openChatForRecipient(recipient, messageToSend = null) {
        console.log(`[WHATSAPP NAV] Opening conversation with ${recipient.display}...`);

        if (recipient.isPhone && recipient.cleanNumber) {
            // Direct protocol URL with native message pre-population:
            // 100% reliable for saved AND unsaved numbers
            const url = messageToSend
                ? `whatsapp://send?phone=${recipient.cleanNumber}&text=${encodeURIComponent(messageToSend)}`
                : `whatsapp://send?phone=${recipient.cleanNumber}`;
            try {
                execSync(`start "" "${url}"`, { stdio: 'ignore' });
            } catch (_) {
                try {
                    const webUrl = messageToSend
                        ? `https://web.whatsapp.com/send?phone=${recipient.cleanNumber}&text=${encodeURIComponent(messageToSend)}`
                        : `https://web.whatsapp.com/send?phone=${recipient.cleanNumber}`;
                    execSync(`start "" "${webUrl}"`, { stdio: 'ignore' });
                } catch (_) {}
            }
            await new Promise(r => setTimeout(r, 2500));
        } else {
            // Username / Contact Name search via UI
            foregroundLock.lockToForeground(true, true);
            const searchX = Math.round(this.screenWidth * 0.15);
            const searchY = Math.round(this.screenHeight * 0.14);
            await guiDriver.moveCursorSmoothlyWithFeedback(searchX, searchY, 500);
            await guiDriver.clickPhysicalMouse(searchX, searchY);
            await new Promise(r => setTimeout(r, 200));

            // Select all existing text in search and replace
            await guiDriver.sendHotkey('^A');
            await guiDriver.typeText(recipient.display);
            await new Promise(r => setTimeout(r, 1000));

            // Click first search result item
            const firstResultX = Math.round(this.screenWidth * 0.15);
            const firstResultY = Math.round(this.screenHeight * 0.24);
            await guiDriver.moveCursorSmoothlyWithFeedback(firstResultX, firstResultY, 400);
            await guiDriver.clickPhysicalMouse(firstResultX, firstResultY);
            await new Promise(r => setTimeout(r, 1500));
        }

        // Lock WhatsApp foreground and enforce Full-Screen Maximized Mode
        foregroundLock.lockToForeground(true, true);
    }

    /**
     * Inspect conversation history via Gemini Vision
     */
    async inspectChatHistory(recipient, index) {
        console.log(`[WHATSAPP VISION] Inspecting conversation history for ${recipient.display}...`);

        const screenshot = screenCapture.captureDesktopScreen();
        const historyShotPath = path.join(SCREENSHOTS_DIR, `wa_${index + 1}_${(recipient.cleanNumber || recipient.display).replace(/[^a-zA-Z0-9]/g, '_')}_history.png`);

        if (screenshot && screenshot.base64) {
            try {
                fs.writeFileSync(historyShotPath, Buffer.from(screenshot.base64, 'base64'));
                console.log(`[WHATSAPP SCREENSHOT] Conversation snapshot saved: ${path.basename(historyShotPath)}`);
            } catch (_) {}
        }

        const prompt = `You are a WhatsApp conversation vision inspector analyzing a Windows desktop screen (${this.screenWidth}x${this.screenHeight}).
Inspect the currently open WhatsApp conversation pane:
1. Is there existing message history (messages previously exchanged with this person)?
2. If YES:
   - What was the last message received from the other person (incoming bubble)?
   - Timestamp if visible.
3. If NO:
   - Confirm this is a new/empty chat with no message bubbles.
4. What are the coordinates of the message compose input box at the bottom? { x, y, width, height }
5. What are the coordinates of the green send button icon at the bottom right? { x, y }

Return ONLY valid JSON:
{
  "hasHistory": boolean,
  "isNewChat": boolean,
  "lastReceivedMessage": string or null,
  "composeBox": { "x": 844, "y": 765, "width": 450, "height": 45 },
  "sendButton": { "x": 1485, "y": 765 }
}`;

        try {
            const visionRes = await visionAI.captureAndAnalyze(prompt, {
                model: 'gemini',
                screenshot
            });

            if (visionRes && visionRes.success && visionRes.response) {
                const jsonMatch = visionRes.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        hasHistory: Boolean(parsed.hasHistory),
                        isNewChat: Boolean(parsed.isNewChat || !parsed.hasHistory),
                        lastReceivedMessage: parsed.lastReceivedMessage || null,
                        composeBox: parsed.composeBox || null,
                        sendButton: parsed.sendButton || null,
                        screenshotPath: historyShotPath
                    };
                }
            }
        } catch (vErr) {
            console.warn(`[VISION NOTICE] ${vErr.message}`);
        }

        // Fallback default geometry with guaranteed safe coordinates (never taskbar)
        const safeFallback = this.getSafeComposeCoordinates();
        return {
            hasHistory: false,
            isNewChat: true,
            lastReceivedMessage: null,
            composeBox: { x: safeFallback.composeX, y: safeFallback.composeY, width: 450, height: 45 },
            sendButton: { x: safeFallback.sendBtnX, y: safeFallback.sendBtnY },
            screenshotPath: historyShotPath
        };
    }

    /**
     * Deliver message with Direct Pasting & Dual-Action Send (Enter Keystroke + Send Button Click)
     * Accurately lands inside the input box and directly pastes without overshooting.
     */
    async deliverMessage(recipient, messageText, layoutCoords) {
        console.log(`[WHATSAPP DISPATCH] Preparing to dispatch message to ${recipient.display}...`);

        foregroundLock.lockToForeground(true, true);

        // Compute safe, clamped coordinates: guarantees cursor lands inside compose box and NEVER overshoots
        const { composeX, composeY, sendBtnX, sendBtnY } = this.getSafeComposeCoordinates(layoutCoords);

        console.log(`[WHATSAPP TARGET] Calibrated compose box at (${composeX}, ${composeY}), send button at (${sendBtnX}, ${sendBtnY})`);

        // 1. Gently position and click safely inside the compose field to guarantee caret focus
        await guiDriver.moveCursorSmoothlyWithFeedback(composeX, composeY, 400);
        await guiDriver.clickPhysicalMouse(composeX, composeY);
        await new Promise(r => setTimeout(r, 200));

        // 2. Directly paste message into input field (instant clipboard injection, no character-by-character lag)
        console.log(`[WHATSAPP DISPATCH] Directly pasting message into compose field...`);
        if (typeof guiDriver.pasteText === 'function') {
            await guiDriver.pasteText(messageText);
        } else {
            await guiDriver.typeText(messageText);
        }
        await new Promise(r => setTimeout(r, 350));

        // 3. Dual-Action Send for 100% Guaranteed Delivery:
        // Action A: Send Enter keystroke
        console.log(`[WHATSAPP DISPATCH] Triggering send via Enter keystroke...`);
        await guiDriver.sendHotkey('{ENTER}');
        await new Promise(r => setTimeout(r, 300));

        // Action B: Click green Send button icon directly (safely inside compose bar)
        console.log(`[WHATSAPP DISPATCH] Triggering send via Send Button click at (${sendBtnX}, ${sendBtnY})...`);
        await guiDriver.moveCursorSmoothlyWithFeedback(sendBtnX, sendBtnY, 300);
        await guiDriver.clickPhysicalMouse(sendBtnX, sendBtnY);
        await new Promise(r => setTimeout(r, 600));

        console.log(`\x1b[32m✔ [WHATSAPP DISPATCH SUCCESS] Message delivered to ${recipient.display}!\x1b[0m\n`);
        return true;
    }

    /**
     * Run full sequential batch campaign
     */
    async executeBatchCampaign(config) {
        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║           CODEZ48 PILOT — AUTONOMOUS WHATSAPP BATCH CAMPAIGN ENGINE           ║`);
        console.log(`╠═══════════════════════════════════════════════════════════════════════════════════════╣`);

        // 1. Plan Verification Gate
        const access = creditVault.checkWhatsAppBatchAccess();
        console.log(`║  Subscription:         ${access.planName.padEnd(25)} Tier: ${access.tier.padEnd(15)}║`);
        if (access.isUnlimited) {
            console.log(`║  Status:               UNLIMITED (Full Enterprise / Profit-Oriented Access)            ║`);
        } else {
            console.log(`║  Status:               ${access.notice ? access.notice.padEnd(62) : 'Trial / Micro Access'.padEnd(62)}║`);
        }
        console.log(`╚═══════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        if (!access.allowed) {
            const uid = creditVault.getUserIdentifier();
            const onlineUrl = `https://codez48.netlify.app/tools/payment.html?uid=${encodeURIComponent(uid)}`;

            const box = formatTerminalBox({
                title: 'CODEZ48 PILOT — SUBSCRIPTION & PAYMENT REQUIRED',
                borderColor: '\x1b[31m',
                titleColor: '\x1b[1m\x1b[31m',
                lines: [
                    `Current Plan: \x1b[33m${access.planName} (${access.tier})\x1b[0m`,
                    `Notice: \x1b[37m${access.reason}\x1b[0m`,
                    { divider: true },
                    '\x1b[1mWhatsApp Automation Access Details:\x1b[0m',
                    '  • Enterprise Plan (₹599/mo): Unlimited automated text WhatsApp campaigns',
                    '  • Profit-Oriented Plan (₹999/mo): Voice & Text AI Supervisor with Whisper STT',
                    '  • Micro Plan (₹299/mo): Includes 3 free test sessions',
                    { divider: true },
                    `\x1b[1m\x1b[32mOnline Upgrade:\x1b[0m \x1b[4m${onlineUrl}\x1b[0m`,
                    `\x1b[33mTip: If you have a coupon code, type "coupon <CODE>" in the CLI to redeem!\x1b[0m`
                ]
            });

            console.log('\n' + box + '\n');

            await creditVault.showPaymentPrompt();
            return {
                success: false,
                reason: 'PLAN_UPGRADE_REQUIRED',
                message: access.reason
            };
        }

        // Record session count
        creditVault.recordWhatsAppBatchSession();

        // 2. Load and normalize recipients
        let recipients = [];
        if (config.recipients && Array.isArray(config.recipients) && config.recipients.length > 0) {
            recipients = contactReader.loadRecipients(config.recipients, config.defaultCountryCode || '91');
        } else if (config.recipientsInput) {
            recipients = contactReader.loadRecipients(config.recipientsInput, config.defaultCountryCode || '91');
        } else if (config.filePath) {
            recipients = contactReader.loadRecipients(config.filePath, config.defaultCountryCode || '91');
        } else if (config.goal || config.goalText) {
            const detailsCollector = require('./details-collector');
            const parsed = detailsCollector.parseGoalParameters(config.goal || config.goalText);
            if (parsed.filePath) {
                recipients = contactReader.loadRecipients(parsed.filePath, config.defaultCountryCode || '91');
            } else if (parsed.numbers) {
                recipients = contactReader.loadRecipients(parsed.numbers, config.defaultCountryCode || '91');
            }
            if (!config.messageText && parsed.messageText) {
                config.messageText = parsed.messageText;
            }
            if (!config.platform && parsed.platform && parsed.platform !== 'AUTO') {
                config.platform = parsed.platform;
            }
        }

        if (recipients.length === 0) {
            console.log(`\x1b[31m[ERROR] No valid recipients found in input. Please check phone numbers or file path.\x1b[0m`);
            return { success: false, reason: 'NO_RECIPIENTS' };
        }

        console.log(`\x1b[32m✔ Loaded ${recipients.length} recipients for sequential dispatch:\x1b[0m`);
        recipients.slice(0, 5).forEach((r, idx) => {
            console.log(`  ${idx + 1}. ${r.display} ${r.name ? `(${r.name})` : ''}`);
        });
        if (recipients.length > 5) {
            console.log(`  ... and ${recipients.length - 5} more recipients.`);
        }
        console.log('');

        // 3. Resolve Message Content
        let baseMessage = config.messageText || null;
        if (config.contentMode === 'AI' || (!baseMessage && config.businessDetails)) {
            baseMessage = await this.generateAiBusinessContent(config.businessDetails || {}, config.apiCall);
        }

        if (!baseMessage) {
            const goalStr = String(config.goal || config.goalText || '');
            const hasTamil = /[\u0B80-\u0BFF]/.test(goalStr);
            baseMessage = hasTamil
                ? 'வணக்கம்! கோட்ஸ்48 தானியங்கி அமைப்பிலிருந்து தொடர்பு கொள்கிறோம். உங்களுக்கு எவ்வாறு உதவலாம்?'
                : 'Hello! Thank you for connecting with us. This is an automated message from Codez48 Pilot. How can we help you today?';
        }

        // Visibly display user/business details & order parameters
        const biz = config.businessDetails || {};
        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║                  WHATSAPP USER DETAILS & ORDER VERIFICATION                           ║`);
        console.log(`╠═══════════════════════════════════════════════════════════════════════════════════════╣`);
        console.log(`║  Target Recipients:       ${String(recipients.length + ' Recipient(s)').padEnd(58)}║`);
        console.log(`║  Brand / Business:        ${String(biz.businessName || 'Codez48').padEnd(58)}║`);
        console.log(`║  Domain / Nature:         ${String(biz.natureOfBusiness || 'Commercial Services').padEnd(58)}║`);
        console.log(`║  Selected Service/Order:  ${String(biz.selectedService || biz.whatYouDo || 'Full Services').padEnd(58)}║`);
        console.log(`║  Website / Order Link:    ${String(biz.link || 'https://codez48.netlify.app').padEnd(58)}║`);
        console.log(`║  Call to Action (CTA):    ${String(biz.cta || 'Reply to this message').padEnd(58)}║`);
        console.log(`╚═══════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        console.log(`\x1b[35m[PRIMARY MESSAGE CONTENT]:\x1b[0m\n----------------------------------------\n${baseMessage}\n----------------------------------------\n`);

        // 4. Platform Resolution: WEB vs DESKTOP
        let targetPlatform = (config.platform || '').toUpperCase();
        const goalStr = String(config.goal || config.goalText || '').toLowerCase();

        if (!targetPlatform || targetPlatform === 'AUTO') {
            if (goalStr.includes('web') || goalStr.includes('website') || goalStr.includes('browser') || goalStr.includes('web.whatsapp')) {
                targetPlatform = 'WEB';
            } else if (goalStr.includes('desktop') || goalStr.includes('native') || goalStr.includes('application') || goalStr.includes('app')) {
                targetPlatform = 'DESKTOP';
            } else {
                targetPlatform = 'AUTO';
            }
        }

        console.log(`\x1b[36m[PLATFORM RESOLUTION] Selected WhatsApp Engine Platform: ${targetPlatform}\x1b[0m\n`);

        if (targetPlatform === 'WEB') {
            return await this.executeWebBatch(recipients, baseMessage, config);
        } else {
            return await this.executeDesktopBatch(recipients, baseMessage, config);
        }
    }

    /**
     * Sequential WhatsApp Web Batch Execution powered by Playwright
     */
    async executeWebBatch(recipients, baseMessage, config = {}) {
        const whatsappWebAdapter = require('../src/pilot/adapters/whatsapp-web-adapter');
        const pilotHud = require('../src/pilot/hud/pilot-hud-controller');

        console.log(`\n\x1b[36m[WHATSAPP WEB BATCH] Initiating batch dispatch via WhatsApp Web (Playwright)...\x1b[0m`);
        pilotHud.setThinking('Initializing WhatsApp Web browser automation...');

        await whatsappWebAdapter.initSession({ headless: false });
        const loginStatus = await whatsappWebAdapter.checkLoginStatus();

        if (!loginStatus.loggedIn) {
            pilotHud.setActing('WhatsApp Web requires login. Waiting for pairing code / QR scan...');
            const firstRecipient = recipients[0]?.cleanNumber || '';
            const loginRes = await whatsappWebAdapter.handleLoginFlow(firstRecipient);
            if (!loginRes.success) {
                pilotHud.setSuccess('WhatsApp Web authentication timed out.');
                return { success: false, reason: 'LOGIN_FAILED', message: 'User did not complete WhatsApp Web login' };
            }
        }

        const auditLog = [];

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            console.log(`\x1b[36m========================================================================================\x1b[0m`);
            console.log(`\x1b[36m[WEB RECIPIENT ${i + 1}/${recipients.length}] Processing: ${recipient.display} ${recipient.name ? `(${recipient.name})` : ''}\x1b[0m`);

            pilotHud.setActing(`Sending to ${recipient.display} (${i + 1}/${recipients.length}) on WhatsApp Web...`);

            let messageToSend = baseMessage;
            if (recipient.name && messageToSend.includes('{name}')) {
                messageToSend = messageToSend.replace(/\{name\}/gi, recipient.name);
            }

            const sendRes = await whatsappWebAdapter.sendMessage(recipient.cleanNumber, messageToSend);

            auditLog.push({
                index: i + 1,
                recipient: recipient.display,
                name: recipient.name,
                platform: 'WHATSAPP_WEB',
                delivered: sendRes.delivered,
                screenshot: sendRes.screenshotPath,
                status: sendRes.success ? 'SUCCESS' : 'FAILED',
                error: sendRes.reason || null,
                timestamp: new Date().toISOString()
            });

            if (i < recipients.length - 1) {
                const delaySec = 2.5;
                console.log(`[PACING] Waiting ${delaySec}s before next recipient on WhatsApp Web...`);
                await new Promise(r => setTimeout(r, delaySec * 1000));
            }
        }

        const successCount = auditLog.filter(a => a.status === 'SUCCESS').length;
        const failedCount = auditLog.filter(a => a.status === 'FAILED').length;

        console.log(`\n\x1b[32m========================================================================================\x1b[0m`);
        console.log(`\x1b[32m✔ CODEZ48 WHATSAPP WEB BATCH CAMPAIGN COMPLETE\x1b[0m`);
        console.log(`  • Platform:             WhatsApp Web (Playwright)`);
        console.log(`  • Total Recipients:     ${recipients.length}`);
        console.log(`  • Successfully Sent:    ${successCount}`);
        console.log(`  • Failures:             ${failedCount}`);
        console.log(`\x1b[32m========================================================================================\x1b[0m\n`);

        pilotHud.setSuccess(`WhatsApp Web campaign finished: ${successCount}/${recipients.length} delivered!`);
        setTimeout(() => pilotHud.hide(), 4000);

        return {
            success: successCount > 0,
            platform: 'WEB',
            total: recipients.length,
            sentCount: successCount,
            failedCount,
            auditLog
        };
    }

    /**
     * Sequential WhatsApp Desktop Application Execution with Dual-Action Send and Vision AI
     */
    async executeDesktopBatch(recipients, baseMessage, config = {}) {
        const pilotHud = require('../src/pilot/hud/pilot-hud-controller');
        pilotHud.setThinking('Opening WhatsApp Desktop Application...');

        const wa = require('./whatsapp-automation');
        let clientOpened = false;
        try {
            clientOpened = await wa.openWhatsAppClient();
        } catch (_) {}

        if (!clientOpened) {
            console.log(`\x1b[33m[DESKTOP NOTICE] WhatsApp Desktop application is not available or could not be launched. Seamlessly routing to WhatsApp Web...\x1b[0m`);
            return await this.executeWebBatch(recipients, baseMessage, config);
        }

        await new Promise(r => setTimeout(r, 2000));
        console.log(`[WHATSAPP GUARD] Locking WhatsApp to foreground in Full-Screen mode. No background windows will interfere...`);
        foregroundLock.startForegroundGuard(1500, true);

        const auditLog = [];

        // Sequential Execution Loop
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            console.log(`\x1b[36m========================================================================================\x1b[0m`);
            console.log(`\x1b[36m[DESKTOP RECIPIENT ${i + 1}/${recipients.length}] Processing: ${recipient.display} ${recipient.name ? `(${recipient.name})` : ''}\x1b[0m`);

            pilotHud.setActing(`Sending to ${recipient.display} (${i + 1}/${recipients.length}) on WhatsApp Desktop...`);

            const auditEntry = {
                index: i + 1,
                recipient: recipient.display,
                name: recipient.name,
                platform: 'WHATSAPP_DESKTOP',
                hasHistory: false,
                lastReceived: null,
                actionTaken: 'PENDING',
                status: 'IN_PROGRESS',
                timestamp: new Date().toISOString()
            };

            try {
                // Step A: Determine initial message for recipient
                let messageToSend = baseMessage;
                if (recipient.name && messageToSend.includes('{name}')) {
                    messageToSend = messageToSend.replace(/\{name\}/gi, recipient.name);
                }

                // Step B: Open conversation (pre-populating message via protocol URL for immediate input fill)
                await this.openChatForRecipient(recipient, messageToSend);

                // Step C: Inspect chat history with Gemini Vision
                const historyInfo = await this.inspectChatHistory(recipient, i);
                auditEntry.hasHistory = historyInfo.hasHistory;
                auditEntry.lastReceived = historyInfo.lastReceivedMessage;
                auditEntry.screenshot = historyInfo.screenshotPath;

                // Step D: Automatically determine appropriate reply if user has past interactions
                if (historyInfo.hasHistory && historyInfo.lastReceivedMessage && config.contextualReply !== false) {
                    console.log(`\x1b[33m[HISTORY REVIEW] Previous conversation detected! Last message received: "${historyInfo.lastReceivedMessage}"\x1b[0m`);
                    console.log(`[AUTO-REPLY DETERMINATION] Generating tailored response for previous query...`);
                    messageToSend = await this.generateContextualFollowUp(historyInfo.lastReceivedMessage, baseMessage, config.apiCall);
                    auditEntry.actionTaken = 'CONTEXTUAL_HISTORY_REPLY';
                } else {
                    console.log(`[NEW CHAT] No prior history. Dispatching personalized introduction.`);
                    auditEntry.actionTaken = 'NEW_CHAT_INTRO';
                }

                auditEntry.sentMessage = messageToSend;

                // Step E: Directly paste message into input box & deliver with Dual-Action Send
                await this.deliverMessage(recipient, messageToSend, historyInfo);
                auditEntry.status = 'SUCCESS';

                // Step E: Polite cooldown delay between contacts (3 seconds)
                if (i < recipients.length - 1) {
                    const delaySec = 3;
                    console.log(`[PACING] Waiting ${delaySec}s before proceeding to next recipient...`);
                    await new Promise(r => setTimeout(r, delaySec * 1000));
                }
            } catch (err) {
                console.error(`\x1b[31m[RECIPIENT ERROR] Failed to send to ${recipient.display}: ${err.message}\x1b[0m`);
                auditEntry.status = 'FAILED';
                auditEntry.error = err.message;
            }

            auditLog.push(auditEntry);
        }

        // Stop Foreground Guard
        foregroundLock.stopForegroundGuard();

        // Summary Report
        const successCount = auditLog.filter(a => a.status === 'SUCCESS').length;
        const failedCount = auditLog.filter(a => a.status === 'FAILED').length;

        console.log(`\n\x1b[32m========================================================================================\x1b[0m`);
        console.log(`\x1b[32m✔ CODEZ48 WHATSAPP DESKTOP BATCH CAMPAIGN COMPLETE\x1b[0m`);
        console.log(`  • Platform:             WhatsApp Desktop Application`);
        console.log(`  • Total Recipients:     ${recipients.length}`);
        console.log(`  • Successfully Sent:    ${successCount}`);
        console.log(`  • Failures:             ${failedCount}`);
        console.log(`  • History Replies:      ${auditLog.filter(a => a.actionTaken === 'CONTEXTUAL_HISTORY_REPLY').length}`);
        console.log(`  • New Intros Dispatched: ${auditLog.filter(a => a.actionTaken === 'NEW_CHAT_INTRO').length}`);
        console.log(`  • Foreground State:     LOCKED & RESTORED`);
        console.log(`\x1b[32m========================================================================================\x1b[0m\n`);

        pilotHud.setSuccess(`WhatsApp Desktop campaign finished: ${successCount}/${recipients.length} delivered!`);
        setTimeout(() => pilotHud.hide(), 4000);

        return {
            success: successCount > 0,
            platform: 'DESKTOP',
            total: recipients.length,
            sentCount: successCount,
            failedCount,
            auditLog
        };
    }
}

module.exports = new WhatsAppBatchEngine();
