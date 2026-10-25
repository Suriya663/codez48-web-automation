/**
 * CODEZ48 SUPERVISOR — WHATSAPP SESSION MANAGER
 *
 * Handles:
 *   1. WhatsApp Desktop detection and launch (via URL protocol)
 *   2. WhatsApp Web fallback in existing browser
 *   3. Auth state detection (QR code vs. active session)
 *   4. Message reading from DOM via browser CDP
 *   5. Message/voice-note sending via browser automation
 *
 * Uses existing:
 *   - gui-driver.js  (window focus, foreground detection)
 *   - browser-controller.js  (CDP page access, DOM execution)
 *   - screen-capture.js  (screenshot for state detection)
 *   - Netlify AI endpoint  (screen analysis fallback)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const guiDriver = require('../src/pilot/drivers/gui-driver');
const browserController = require('../src/pilot/browser/browser-controller');
const screenCapture = require('../src/pilot/browser/screen-capture');

const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';
const WHATSAPP_PROTOCOL = 'whatsapp:';
const QR_WAIT_TIMEOUT_MS = 120000; // 2 minutes for user to scan QR
const PAGE_READY_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(level, msg) {
    const icons = { INFO: '💬', WARN: '⚠️', ERROR: '❌', OK: '✅' };
    console.log(`${icons[level] || '•'} [WA_SESSION/${level}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// WhatsApp Desktop Detection
// ---------------------------------------------------------------------------

function isWhatsAppDesktopInstalled() {
    try {
        // Check registry for WhatsApp Desktop installation
        const result = execSync(
            'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WhatsApp.exe" /ve 2>nul',
            { encoding: 'utf8', timeout: 3000 }
        );
        return result && result.includes('REG_SZ');
    } catch (e) {
        // Try the Microsoft Store package
        try {
            const result2 = execSync(
                'powershell -NoProfile -Command "Get-AppxPackage *WhatsApp* | Select-Object -ExpandProperty Name" 2>nul',
                { encoding: 'utf8', timeout: 5000 }
            );
            return result2 && result2.trim().length > 0;
        } catch (e2) {
            return false;
        }
    }
}

function isWhatsAppWindowOpen() {
    try {
        const fg = guiDriver.getForegroundWindow();
        if (fg && fg.title && /whatsapp/i.test(fg.title)) return true;

        // Also check all windows
        const psResult = execSync(
            'powershell -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowTitle -match \'WhatsApp\'} | Select-Object -ExpandProperty MainWindowTitle" 2>nul',
            { encoding: 'utf8', timeout: 5000 }
        );
        return psResult && psResult.trim().length > 0;
    } catch (e) {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Open WhatsApp
// ---------------------------------------------------------------------------

async function openWhatsApp() {
    // Check if already open
    if (isWhatsAppWindowOpen()) {
        log('INFO', 'WhatsApp is already open. Focusing existing window...');
        guiDriver.focusWindow('WhatsApp');
        await sleep(500);
        return { opened: true, method: 'ALREADY_OPEN' };
    }

    // Try WhatsApp Desktop first
    const desktopInstalled = isWhatsAppDesktopInstalled();
    if (desktopInstalled) {
        log('INFO', 'WhatsApp Desktop detected. Launching...');
        return new Promise((resolve) => {
            exec(`start ${WHATSAPP_PROTOCOL}`, (err) => {
                if (err) {
                    log('WARN', `WhatsApp Desktop launch via protocol failed: ${err.message}`);
                    resolve({ opened: false, method: 'DESKTOP_FAILED', fallbackToWeb: true });
                } else {
                    log('OK', 'WhatsApp Desktop launched successfully.');
                    resolve({ opened: true, method: 'DESKTOP' });
                }
            });
        });
    }

    // Fallback: WhatsApp Web
    log('INFO', 'WhatsApp Desktop not found. Opening WhatsApp Web in browser...');
    try {
        await browserController.navigate(WHATSAPP_WEB_URL);
        log('OK', 'WhatsApp Web opened in browser.');
        return { opened: true, method: 'WEB' };
    } catch (e) {
        // Last resort: exec start
        return new Promise((resolve) => {
            exec(`start ${WHATSAPP_WEB_URL}`, (err) => {
                if (err) {
                    log('ERROR', `Could not open WhatsApp Web: ${err.message}`);
                    resolve({ opened: false, method: 'FAILED', error: err.message });
                } else {
                    log('OK', 'WhatsApp Web opened via system browser.');
                    resolve({ opened: true, method: 'WEB_SYSTEM' });
                }
            });
        });
    }
}

// ---------------------------------------------------------------------------
// Auth State Detection
// ---------------------------------------------------------------------------

async function detectAuthState(method) {
    await sleep(3000); // Allow page to load

    if (method === 'DESKTOP' || method === 'ALREADY_OPEN') {
        // Desktop app: take screenshot and check for chat UI
        const screenshot = screenCapture.captureDesktopScreen();
        if (!screenshot || !screenshot.base64) {
            return { authenticated: false, method: 'UNKNOWN', reason: 'Screenshot capture failed' };
        }
        // Check for the WhatsApp chat panel presence — heuristic: window is open and visible
        const fg = guiDriver.getForegroundWindow();
        if (fg && /whatsapp/i.test(fg.title)) {
            log('OK', 'WhatsApp Desktop appears to be active and authenticated.');
            return { authenticated: true, method: 'DESKTOP' };
        }
        return { authenticated: false, method: 'DESKTOP', requiresAuth: true, authMethod: 'QR_CODE' };
    }

    // WhatsApp Web: use CDP to check DOM state
    try {
        const domResult = await browserController.executeScript(`
            (() => {
                // Check for QR code landing page
                const qrCanvas = document.querySelector('canvas[aria-label*="QR"], div[data-ref], [data-testid="qrcode"]');
                const loginBox = document.querySelector('[data-testid="login-phone-number-input"], .landing-main, #app .landing-wrapper');
                const chatPane = document.querySelector('[data-testid="chat-list"], #side, .two._aigs, [aria-label="Chat list"]');
                const phoneInput = document.querySelector('input[type="tel"], input[placeholder*="phone"], input[placeholder*="number"]');
                return {
                    hasQrCode: !!qrCanvas,
                    hasLoginBox: !!loginBox,
                    hasChatPane: !!chatPane,
                    hasPhoneInput: !!phoneInput,
                    title: document.title,
                    url: window.location.href
                };
            })()
        `);

        if (domResult && domResult.hasChatPane) {
            log('OK', 'WhatsApp Web: Chat pane detected — authenticated session active.');
            return { authenticated: true, method: 'WEB' };
        }

        if (domResult && (domResult.hasQrCode || domResult.hasLoginBox)) {
            const authMethod = domResult.hasQrCode ? 'QR_CODE' : (domResult.hasPhoneInput ? 'PHONE_OTP' : 'QR_CODE');
            log('WARN', `WhatsApp Web: Login required (${authMethod}).`);
            return {
                authenticated: false,
                method: 'WEB',
                requiresAuth: true,
                authMethod,
                authInstructions: authMethod === 'QR_CODE'
                    ? 'Please scan the QR code in the WhatsApp Web browser tab to continue.'
                    : 'Please enter your phone number and approve the login in the official WhatsApp interface.'
            };
        }
    } catch (e) {
        log('WARN', `CDP DOM check failed: ${e.message}. Using screenshot fallback.`);
    }

    // Screenshot fallback
    return { authenticated: false, method: 'WEB', requiresAuth: true, authMethod: 'QR_CODE',
        authInstructions: 'WhatsApp authentication status could not be verified. Please check the browser.' };
}

// ---------------------------------------------------------------------------
// Wait for Auth Completion (polling)
// ---------------------------------------------------------------------------

async function waitForAuthCompletion(maxWaitMs = QR_WAIT_TIMEOUT_MS) {
    const deadline = Date.now() + maxWaitMs;
    log('INFO', `Waiting up to ${maxWaitMs / 1000}s for user to complete WhatsApp authentication...`);
    while (Date.now() < deadline) {
        await sleep(4000);
        try {
            const domResult = await browserController.executeScript(`
                (() => {
                    const chatPane = document.querySelector('[data-testid="chat-list"], #side, [aria-label="Chat list"]');
                    return { hasChatPane: !!chatPane };
                })()
            `);
            if (domResult && domResult.hasChatPane) {
                log('OK', 'WhatsApp authentication completed — chat pane detected.');
                return true;
            }
        } catch (e) { /* CDP not ready yet */ }
    }
    log('WARN', 'Authentication wait timeout exceeded.');
    return false;
}

// ---------------------------------------------------------------------------
// Read Latest Message
// ---------------------------------------------------------------------------

async function readLatestMessage(contact) {
    try {
        if (contact) {
            // Search for and open the conversation
            const searchResult = await browserController.executeScript(`
                (() => {
                    // Try to find the search box
                    const searchBox = document.querySelector('[data-testid="chat-list-search"], input[placeholder*="Search"], [aria-label*="Search"]');
                    if (!searchBox) return { found: false, reason: 'Search box not found' };
                    searchBox.focus();
                    // Type the contact name
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(searchBox, ${JSON.stringify(contact)});
                    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                    return { found: true };
                })()
            `);

            await sleep(1500);

            if (searchResult && searchResult.found) {
                // Click first result
                await browserController.executeScript(`
                    (() => {
                        const firstResult = document.querySelector('[data-testid="cell-frame-container"], .copyable-area [role="listitem"]');
                        if (firstResult) firstResult.click();
                    })()
                `);
                await sleep(1000);
            }
        }

        // Read the latest incoming message from the chat pane
        const msgResult = await browserController.executeScript(`
            (() => {
                // Get all message bubbles
                const msgs = document.querySelectorAll('[data-testid="msg-container"], .message-in, [class*="message-in"], div[class*="_akbu"]');
                if (!msgs || msgs.length === 0) return { found: false, reason: 'No messages found in conversation' };

                // Get the last incoming message
                let latestText = '';
                let latestId = '';
                for (let i = msgs.length - 1; i >= 0; i--) {
                    const msg = msgs[i];
                    const textEl = msg.querySelector('[data-testid="msg-text"], .selectable-text, span.copyable-text');
                    if (textEl && textEl.textContent) {
                        latestText = textEl.textContent.trim();
                        latestId = msg.getAttribute('data-id') || msg.id || ('msg_' + i);
                        break;
                    }
                }
                if (!latestText) return { found: false, reason: 'No text content in messages' };
                return { found: true, text: latestText, messageId: latestId };
            })()
        `);

        if (msgResult && msgResult.found) {
            log('OK', `Read message: "${msgResult.text.substring(0, 80)}..."`);
            return { success: true, text: msgResult.text, messageId: msgResult.messageId, contact };
        }

        log('WARN', `Could not read message: ${msgResult ? msgResult.reason : 'unknown'}`);
        return { success: false, message: msgResult ? msgResult.reason : 'No messages found' };

    } catch (e) {
        log('ERROR', `readLatestMessage failed: ${e.message}`);
        return { success: false, message: e.message };
    }
}

// ---------------------------------------------------------------------------
// Send Message or Voice Note
// ---------------------------------------------------------------------------

async function sendMessage(options) {
    const { contact, text, audioPath } = options;

    try {
        if (text && !audioPath) {
            // Send text message via DOM
            const sendResult = await browserController.executeScript(`
                (() => {
                    const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"], [contenteditable="true"][data-tab="10"], footer [contenteditable="true"]');
                    if (!inputBox) return { success: false, reason: 'Message compose box not found' };

                    inputBox.focus();
                    document.execCommand('insertText', false, ${JSON.stringify(text)});
                    inputBox.dispatchEvent(new Event('input', { bubbles: true }));

                    // Find and click send button
                    const sendBtn = document.querySelector('[data-testid="send"], [aria-label="Send"], button[data-tab="11"]');
                    if (sendBtn) {
                        sendBtn.click();
                        return { success: true, method: 'DOM_SEND' };
                    }

                    // Fallback: press Enter
                    inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                    return { success: true, method: 'ENTER_SEND' };
                })()
            `);

            if (sendResult && sendResult.success) {
                log('OK', `Text message sent via ${sendResult.method}.`);
                return { success: true, method: sendResult.method };
            }
            return { success: false, message: sendResult ? sendResult.reason : 'Text send failed' };
        }

        if (audioPath && fs.existsSync(audioPath)) {
            // Voice note: use file attachment flow
            // Note: WhatsApp Web does not natively accept programmatic audio attachment
            // We instruct the user to manually attach since we cannot bypass security
            log('WARN', 'Voice note attachment via automation is not supported on WhatsApp Web without browser extension permissions.');
            log('INFO', `Voice note is ready at: ${audioPath}`);
            log('INFO', 'Please manually attach the audio file in the WhatsApp conversation, or use WhatsApp Desktop file share.');

            // Try to open the file in the system for the user to attach manually
            try {
                const { exec } = require('child_process');
                exec(`explorer /select,"${audioPath}"`);
            } catch (e) { /* non-critical */ }

            return {
                success: false,
                error: 'VOICE_NOTE_MANUAL_REQUIRED',
                message: `Voice note is ready at ${audioPath}. Please attach it manually in WhatsApp. WhatsApp Web does not allow programmatic file injection.`,
                audioPath,
                requiresManualAttach: true
            };
        }

        return { success: false, message: 'No text or audio provided to send.' };

    } catch (e) {
        log('ERROR', `sendMessage failed: ${e.message}`);
        return { success: false, message: e.message };
    }
}

// ---------------------------------------------------------------------------
// Main: Open + Verify (used by SupervisorController)
// ---------------------------------------------------------------------------

async function openAndVerify(contact) {
    const openResult = await openWhatsApp();

    if (!openResult.opened) {
        return {
            success: false,
            error: openResult.error || 'WHATSAPP_OPEN_FAILED',
            message: `Could not open WhatsApp. Error: ${openResult.error || 'Unknown'}. Check that WhatsApp Desktop or a supported browser is installed.`
        };
    }

    await sleep(openResult.method === 'DESKTOP' || openResult.method === 'ALREADY_OPEN' ? 2000 : 4000);

    const authState = await detectAuthState(openResult.method);

    if (authState.requiresAuth) {
        return {
            success: false,
            requiresAuth: true,
            authMethod: authState.authMethod,
            authInstructions: authState.authInstructions,
            message: authState.authInstructions
        };
    }

    if (!authState.authenticated) {
        return {
            success: false,
            error: 'AUTH_STATE_UNKNOWN',
            message: 'WhatsApp authentication state could not be confirmed. Please check the application manually.'
        };
    }

    return { success: true, method: openResult.method, activeContact: contact };
}

module.exports = {
    openAndVerify,
    openWhatsApp,
    detectAuthState,
    waitForAuthCompletion,
    readLatestMessage,
    sendMessage,
    isWhatsAppDesktopInstalled,
    isWhatsAppWindowOpen
};
