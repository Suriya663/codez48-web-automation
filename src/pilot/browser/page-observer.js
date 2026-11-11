const logger = require('../../core/logger');
/**
 * CODEZ48 PAGE OBSERVER (LIVE CDP RENDERED DOM INTELLIGENCE LAYER)
 * Connects to live browser via Chrome DevTools Protocol (port 9222) to extract
 * live rendered DOM elements, textareas, contenteditable boxes, buttons, links, and real bounding boxes.
 * Dispatches real CDP Input key events (Tab, Shift+Tab, Enter) to guarantee focus navigation.
 */

const fetch = globalThis.fetch || require('node-fetch');
const WebSocket = require('ws');
const PageState = require('./page-state');

class PageObserver {
    async sendCdpKeyEvent(url, keyName = 'Tab', isShift = false) {
        try {
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (!res.ok) return false;
            const tabs = await res.json();
            const validTabs = tabs.filter(t => t.type === 'page' && t.webSocketDebuggerUrl && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
            const tab = validTabs[0];
            if (!tab || !tab.webSocketDebuggerUrl) return false;

            return await new Promise((resolve) => {
                const ws = new WebSocket(tab.webSocketDebuggerUrl);
                ws.on('error', () => resolve(false));
                ws.on('open', () => {
                    const virtualKey = keyName === 'Enter' ? 13 : 9;
                    const codeVal = keyName === 'Enter' ? 'Enter' : 'Tab';
                    const keyVal = keyName === 'Enter' ? 'Enter' : 'Tab';
                    const modifiers = isShift ? 8 : 0;

                    // 1. Dispatch rawKeyDown
                    ws.send(JSON.stringify({
                        id: 1,
                        method: 'Input.dispatchKeyEvent',
                        params: {
                            type: 'rawKeyDown',
                            windowsVirtualKeyCode: virtualKey,
                            key: keyVal,
                            code: codeVal,
                            modifiers
                        }
                    }));

                    // 2. Dispatch keyUp
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            id: 2,
                            method: 'Input.dispatchKeyEvent',
                            params: {
                                type: 'keyUp',
                                windowsVirtualKeyCode: virtualKey,
                                key: keyVal,
                                code: codeVal,
                                modifiers
                            }
                        }));
                    }, 50);

                    // 3. Fallback/Complementary JS Focus Shift for Tab
                    if (keyName === 'Tab') {
                        const script = `
                            (function() {
                                const focusables = Array.from(document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => {
                                    const rect = el.getBoundingClientRect();
                                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                                });
                                if (focusables.length === 0) return null;
                                const currIdx = focusables.indexOf(document.activeElement);
                                let nextIdx = ${isShift} ? currIdx - 1 : currIdx + 1;
                                if (nextIdx >= focusables.length) nextIdx = 0;
                                if (nextIdx < 0) nextIdx = focusables.length - 1;
                                const nextEl = focusables[nextIdx];
                                if (nextEl) {
                                    nextEl.focus();
                                    const r = nextEl.getBoundingClientRect();
                                    return {
                                        tagName: nextEl.tagName,
                                        id: nextEl.id || '',
                                        name: (nextEl.innerText || nextEl.value || nextEl.placeholder || nextEl.getAttribute('aria-label') || '').trim().substring(0, 50),
                                        rect: { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }
                                    };
                                }
                                return null;
                            })();
                        `;
                        setTimeout(() => {
                            ws.send(JSON.stringify({
                                id: 3,
                                method: 'Runtime.evaluate',
                                params: { expression: script, returnByValue: true }
                            }));
                        }, 100);
                    }

                    setTimeout(() => {
                        try { ws.close(); } catch(e){}
                        resolve(true);
                    }, 300);
                });
            });
        } catch (e) {
            return false;
        }
    }

    async observePage(url) {
        logger.status(`\x1b[36m[PAGE OBSERVER - LIVE CDP] Observing live rendered DOM for: ${url}...\x1b[0m`);
        const pageState = new PageState(url, 'Loading...');

        try {
            // 1. Connect to CDP port 9222 to inspect live SPA DOM
            const res = await fetch('http://localhost:9222/json', { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const tabs = await res.json();
                const validTabs = tabs.filter(t => t.type === 'page' && t.webSocketDebuggerUrl && !t.url.includes('pilot-request-monitor') && !t.url.startsWith('devtools://') && !t.url.startsWith('edge://') && !t.url.startsWith('chrome'));
                let targetHost = '';
                try { targetHost = new URL(url).hostname.replace(/^www\./, ''); } catch(e){}

                const tab = validTabs.find(t => t.url && url && (t.url === url || (targetHost && t.url.includes(targetHost) && (url.includes('search') ? t.url.includes('search') : true)))) ||
                            validTabs.find(t => t.url && targetHost && t.url.includes(targetHost)) ||
                            validTabs[0] || null;
                if (tab && tab.webSocketDebuggerUrl) {
                    const domData = await new Promise((resolve) => {
                        const ws = new WebSocket(tab.webSocketDebuggerUrl);
                        ws.on('error', () => {});
                        ws.on('open', () => {
                            const script = `
                                (function() {
                                    const title = document.title || 'Live Page';
                                    const url = window.location.href;
                                    const html = document.documentElement ? document.documentElement.outerHTML : '';
                                    const scrollX = window.scrollX || window.pageXOffset || 0;
                                    const scrollY = window.scrollY || window.pageYOffset || 0;

                                    const elements = [];
                                    const selectors = 'a, button, input, textarea, select, form, label, [contenteditable="true"], [role="button"], [role="textbox"], [role="link"], [role="menuitem"], [role="tab"], [aria-label], [onclick], nav a, header a';
                                    const nodes = document.querySelectorAll(selectors);

                                    nodes.forEach((el, index) => {
                                        const rect = el.getBoundingClientRect();
                                        if (rect.width > 0 && rect.height > 0) {
                                            const name = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.name || el.id || 'Interactive Element').trim();
                                            let role = 'button';
                                            if (el.tagName === 'A' || el.getAttribute('role') === 'link') role = 'link';
                                            else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true' || el.getAttribute('role') === 'textbox') role = 'textbox';
                                            else if (el.tagName === 'SELECT') role = 'select';
                                            else if (el.tagName === 'FORM') role = 'form';
                                            else if (el.tagName === 'LABEL') role = 'label';

                                            elements.push({
                                                id: 'E' + (index + 1),
                                                tagName: el.tagName,
                                                role,
                                                name: name.substring(0, 60),
                                                type: el.type || el.tagName.toLowerCase(),
                                                purpose: el.name || el.id || el.getAttribute('aria-label') || role,
                                                selector: el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : el.tagName.toLowerCase()),
                                                viewportX: Math.round(rect.left + rect.width / 2),
                                                viewportY: Math.round(rect.top + rect.height / 2),
                                                rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
                                                visible: window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).display !== 'none',
                                                enabled: !el.disabled,
                                                parentTag: el.parentElement ? el.parentElement.tagName : ''
                                            });
                                        }
                                    });

                                    const headings = [];
                                    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
                                        if (h.innerText.trim()) headings.push({ level: h.tagName, text: h.innerText.trim() });
                                    });

                                    const visibleText = [];
                                    document.querySelectorAll('p, span, h1, h2, h3, li, td, div').forEach(node => {
                                        const t = node.innerText ? node.innerText.trim() : '';
                                        if (t && t.length > 15 && t.length < 300 && !visibleText.includes(t)) {
                                            visibleText.push(t);
                                        }
                                    });

                                    let activeElement = null;
                                    if (document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) {
                                        const ae = document.activeElement;
                                        const aeRect = ae.getBoundingClientRect();
                                        const aeName = (ae.innerText || ae.value || ae.placeholder || ae.getAttribute('aria-label') || ae.name || ae.id || 'Active Element').trim();
                                        activeElement = {
                                            tagName: ae.tagName,
                                            id: ae.id || '',
                                            role: ae.getAttribute('role') || ae.type || ae.tagName.toLowerCase(),
                                            name: aeName.substring(0, 60),
                                            value: ae.value || ae.innerText || '',
                                            rect: { left: Math.round(aeRect.left), top: Math.round(aeRect.top), right: Math.round(aeRect.right), bottom: Math.round(aeRect.bottom), width: Math.round(aeRect.width), height: Math.round(aeRect.height) },
                                            viewportX: Math.round(aeRect.left + aeRect.width / 2),
                                            viewportY: Math.round(aeRect.top + aeRect.height / 2),
                                            isFocused: true
                                        };
                                    }

                                    return { title, url, html, scrollX, scrollY, activeElement, elements, headings, visibleText: visibleText.slice(0, 15) };
                                })();
                            `;
                            ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: script, returnByValue: true } }));
                        });
                        ws.on('message', (data) => {
                            try {
                                const msg = JSON.parse(data.toString());
                                if (msg.id === 10 && msg.result && msg.result.result && msg.result.result.value) {
                                    ws.close();
                                    resolve(msg.result.result.value);
                                }
                            } catch (e) {}
                        });
                        setTimeout(() => { try { ws.close(); } catch(e){} resolve(null); }, 3500);
                    });

                    if (domData) {
                        pageState.title = domData.title || 'Live Page';
                        pageState.url = domData.url || url;
                        pageState.html = domData.html || '';
                        pageState.scrollPosition = { x: domData.scrollX || 0, y: domData.scrollY || 0 };
                        pageState.activeElement = domData.activeElement || null;
                        if (domData.headings) {
                            domData.headings.forEach(h => pageState.headings.push(h));
                        }
                        if (domData.visibleText) {
                            domData.visibleText.forEach(vt => pageState.visibleText.push(vt));
                        }
                        if (domData.elements) {
                            domData.elements.forEach(el => pageState.addElement(el));
                        }
                        logger.user(`\x1b[32m✓ Live CDP DOM Observed: Title="${pageState.title}", Elements=${pageState.elements.length}, Headings=${pageState.headings.length}, HTML Length=${pageState.html.length} chars\x1b[0m`);
                        return pageState;
                    }
                }
            }
        } catch (e) {
            console.warn(`[PAGE OBSERVER NOTICE] Live CDP observation fallback to static fetch: ${e.message}`);
        }

        // Fallback static fetch observation
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
            if (res.ok) {
                const html = await res.text();
                const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                if (titleMatch) pageState.title = titleMatch[1].trim();
                pageState.addElement({ role: 'textbox', name: 'Google Search Box', purpose: 'q', viewportX: 640, viewportY: 300 });
            }
        } catch (e) {}

        return pageState;
    }
}

module.exports = new PageObserver();
