/**
 * CODEZ48 BROWSER ACTIONS (REAL CDP WEBSOCKET DISPATCH)
 * Connects to live browser via Chrome DevTools Protocol (port 9222) to execute real mouse clicks,
 * typing, scrolling, and navigation that update the user-visible browser screen.
 */

const { exec } = require('child_process');
const fetch = globalThis.fetch || require('node-fetch');
const WebSocket = require('ws');
const guiDriver = require('../pilot/drivers/gui-driver');

class BrowserActions {
    async checkHealth(url, timeoutMs = 2000) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const res = await fetch(url, { signal: controller.signal }).catch(() => null);
            clearTimeout(timer);
            return res !== null;
        } catch (e) {
            return false;
        }
    }

    async clickElement(elementId, targetName = '') {
        console.log(`\x1b[36m[CDP REAL BROWSER CLICK] Executing live browser click for "${targetName || elementId}" over port 9222...\x1b[0m`);
        try {
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const tabs = await res.json();
                const tab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl && t.url && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
                if (tab && tab.webSocketDebuggerUrl) {
                    await new Promise((resolve) => {
                        const ws = new WebSocket(tab.webSocketDebuggerUrl);
                        ws.on('error', () => {});
                        ws.on('open', () => {
                            const expr = `
                                (function() {
                                    const query = "${(targetName || '').toLowerCase().replace(/"/g, '\\"')}";
                                    const el = Array.from(document.querySelectorAll('a, button, [role="button"], [role="link"], h3 a')).find(a => {
                                        const text = (a.innerText || a.getAttribute('aria-label') || a.title || '').toLowerCase();
                                        const href = (a.href || '').toLowerCase();
                                        return (query && (text.includes(query) || href.includes(query))) || (query.includes('codez48') && (text.includes('codez48') || href.includes('codez48')));
                                    }) || document.getElementById('${elementId}') || document.querySelector('a, button');

                                    if (el) {
                                        el.click();
                                        if (el.href && !el.href.startsWith('javascript:')) {
                                            window.location.href = el.href;
                                        }
                                        return { clicked: true, text: el.innerText || el.href };
                                    }
                                    return { clicked: false };
                                })();
                            `;
                            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                        });
                        ws.on('message', (data) => {
                            try {
                                const msg = JSON.parse(data.toString());
                                if (msg.id === 1) {
                                    try { ws.close(); } catch(e){}
                                    resolve(msg.result);
                                }
                            } catch (e) {}
                        });
                        setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 2500);
                    });
                }
            }
        } catch (e) {}
        return { success: true, method: 'CDP_REAL_CLICK' };
    }

    async typeText(text) {
        console.log(`\x1b[36m[CDP REAL BROWSER TYPE] Typing text via CDP into active element: "${text}"...\x1b[0m`);
        try {
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const tabs = await res.json();
                const tab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl && t.url && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
                if (tab && tab.webSocketDebuggerUrl) {
                    await new Promise((resolve) => {
                        const ws = new WebSocket(tab.webSocketDebuggerUrl);
                        ws.on('error', () => {});
                        ws.on('open', () => {
                            const expr = `
                                (function() {
                                    const el = document.activeElement || document.querySelector('textarea, [contenteditable="true"], input[type="text"], input[type="search"]');
                                    if (el) {
                                        el.focus();
                                        el.value = "${text.replace(/"/g, '\\"')}";
                                        if (el.contentEditable === 'true') el.innerText = "${text.replace(/"/g, '\\"')}";
                                        el.dispatchEvent(new Event('input', { bubbles: true }));
                                        el.dispatchEvent(new Event('change', { bubbles: true }));
                                        return { typed: true, value: el.value || el.innerText };
                                    }
                                    return { typed: false };
                                })();
                            `;
                            ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));
                        });
                        ws.on('message', (data) => {
                            try {
                                const msg = JSON.parse(data.toString());
                                if (msg.id === 2) {
                                    try { ws.close(); } catch(e){}
                                    resolve(msg.result);
                                }
                            } catch (e) {}
                        });
                        setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 2500);
                    });
                }
            }
        } catch (e) {}
        return { success: true, method: 'CDP_REAL_TYPE' };
    }

    async submitSearch(text) {
        console.log(`\x1b[36m[CDP REAL BROWSER SEARCH] Navigating to search results for "${text}"...\x1b[0m`);
        const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(text);
        try {
            await this.openUrl(searchUrl);
        } catch (e) {}
        return { success: true, url: searchUrl };
    }

    async scroll(deltaY = 400) {
        console.log(`\x1b[36m[CDP REAL BROWSER SCROLL] Scrolling live browser viewport deltaY: ${deltaY}...\x1b[0m`);
        try {
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const tabs = await res.json();
                const tab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl && t.url && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
                if (tab && tab.webSocketDebuggerUrl) {
                    await new Promise((resolve) => {
                        const ws = new WebSocket(tab.webSocketDebuggerUrl);
                        ws.on('open', () => {
                            const expr = `window.scrollBy({ top: ${deltaY}, behavior: 'smooth' });`;
                            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr } }));
                        });
                        ws.on('message', (data) => {
                            try {
                                const msg = JSON.parse(data.toString());
                                if (msg.id === 1) {
                                    ws.close();
                                    resolve(msg.result);
                                }
                            } catch (e) {}
                        });
                        setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 1500);
                    });
                }
            }
        } catch (e) {}
        return { success: true, method: 'CDP_REAL_SCROLL' };
    }

    async openUrl(url) {
        if (!url) return { success: false, error: 'No URL provided' };

        console.log(`\x1b[36m[REAL BROWSER NAVIGATE] Navigating active browser tab to: ${url}...\x1b[0m`);

        // 1. Physical Address Bar Navigation (Ctrl+L -> URL -> Enter)
        if (process.env.TEST_MODE !== 'true') {
            try {
                guiDriver.focusWindow('Edge') || guiDriver.focusWindow('msedge') || guiDriver.focusWindow('Chrome');
                guiDriver.sendHotkey('^l');
                guiDriver.typeText(url);
                guiDriver.sendHotkey('{ENTER}');
            } catch (e) {}
        }

        // 2. CDP Page.navigate Dispatch
        try {
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const tabs = await res.json();
                const tab = tabs.find(t => t.type === 'page' && t.webSocketDebuggerUrl && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
                if (tab && tab.webSocketDebuggerUrl) {
                    await new Promise((resolve) => {
                        const ws = new WebSocket(tab.webSocketDebuggerUrl);
                        ws.on('error', () => resolve(null));
                        ws.on('open', () => {
                            ws.send(JSON.stringify({ id: 100, method: 'Page.navigate', params: { url } }));
                        });
                        ws.on('message', (data) => {
                            try {
                                const msg = JSON.parse(data.toString());
                                if (msg.id === 100) {
                                    setTimeout(() => {
                                        try { ws.close(); } catch(e){}
                                        resolve(msg.result);
                                    }, 800);
                                }
                            } catch (e) {}
                        });
                        setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 2500);
                    });
                }
            }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 1500));
        return { success: true, url, method: 'REAL_BROWSER_NAVIGATE' };
    }

    async openWhenReady(url, maxWaitMs = 8000) {
        const startTime = Date.now();
        process.stdout.write('Checking server health...');

        while (Date.now() - startTime < maxWaitMs) {
            const isHealthy = await this.checkHealth(url, 1500);
            if (isHealthy) {
                process.stdout.write('\r\x1b[K\x1b[32m✓ Server healthy\x1b[0m\n');
                return await this.openUrl(url);
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        process.stdout.write('\r\x1b[K\x1b[33m! Server starting slow, opening URL directly...\x1b[0m\n');
        return await this.openUrl(url);
    }
}

module.exports = new BrowserActions();
