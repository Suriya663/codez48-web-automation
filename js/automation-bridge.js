/**
 * CODEZ48 MANUAL BOOKMARKLET UTILITY
 * Explicit manual helper script designed for user bookmarklet execution on target tabs.
 * NOTE: Automatic headless browser automation is executed strictly server-side by playwright-worker/.
 */

(function () {
    console.log("[CODEZ48 BOOKMARKLET] Manual Target Tab Helper Initializing...");

    const urlParams = new URLSearchParams(window.location.search);
    const runIdFromUrl = urlParams.get('autoId') || urlParams.get('runId') || urlParams.get('c48_id');
    const runId = runIdFromUrl || localStorage.getItem('codez48_active_auto_id') || window._codez48AutoId;

    if (runId) {
        localStorage.setItem('codez48_active_auto_id', runId);
    }

    // Visual HUD Renderer
    function renderAgentHUD() {
        if (document.getElementById('c48-agent-hud')) return;
        const hud = document.createElement('div');
        hud.id = 'c48-agent-hud';
        hud.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            background: rgba(15, 23, 42, 0.95);
            color: #ffffff;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 16px 20px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 14px;
            max-width: 360px;
            transition: all 0.3s ease;
        `;
        hud.innerHTML = `
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 10px #38bdf8; animation: pulse 1.5s infinite;"></div>
            <div style="flex: 1;">
                <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8; font-size: 10px;">Manual Bookmarklet Helper</div>
                <div id="c48-hud-msg" style="font-weight: 600; color: #f8fafc; margin-top: 2px;">Bookmarklet Active...</div>
            </div>
            <button id="c48-hud-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; font-weight: bold;">✕</button>
        `;
        document.body.appendChild(hud);

        document.getElementById('c48-hud-close')?.addEventListener('click', () => {
            hud.style.display = 'none';
        });
    }

    function updateHUDMessage(msg, isError = false) {
        renderAgentHUD();
        const msgEl = document.getElementById('c48-hud-msg');
        if (msgEl) {
            msgEl.innerText = msg;
            msgEl.style.color = isError ? '#f87171' : '#f8fafc';
        }
    }

    // Native DOM Interaction Drivers
    const DOMDriver = {
        triggerNativeClick(element) {
            if (!element) return false;
            try {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                    const event = new MouseEvent(eventType, {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(event);
                });
                return true;
            } catch (e) {
                console.error("[DOM DRIVER] Native click error:", e);
                return false;
            }
        },

        triggerNativeType(element, text) {
            if (!element) return false;
            try {
                element.focus();
                if (element.isContentEditable) {
                    element.innerHTML = '';
                    document.execCommand('insertText', false, text);
                } else {
                    element.value = text;
                }

                ['keydown', 'keypress', 'input', 'keyup', 'change'].forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true, cancelable: true });
                    element.dispatchEvent(event);
                });
                return true;
            } catch (e) {
                console.error("[DOM DRIVER] Native type error:", e);
                return false;
            }
        },

        triggerKeyPress(element, keyName = 'Enter') {
            if (!element) element = document.activeElement;
            try {
                const keyCode = keyName === 'Enter' ? 13 : 32;
                ['keydown', 'keypress', 'keyup'].forEach(eventType => {
                    const event = new KeyboardEvent(eventType, {
                        key: keyName,
                        code: keyName,
                        keyCode: keyCode,
                        which: keyCode,
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    element.dispatchEvent(event);
                });
                return true;
            } catch (e) {
                console.error("[DOM DRIVER] Keypress error:", e);
                return false;
            }
        },

        querySelectorSmart(selector) {
            if (!selector) return null;
            if (typeof selector === 'string' && (selector.startsWith('#') || selector.startsWith('.'))) {
                return document.querySelector(selector);
            }
            const elements = Array.from(document.querySelectorAll('button, a, input, div, span'));
            return elements.find(el => el.textContent.trim().toLowerCase().includes(selector.toLowerCase())) || document.querySelector(selector);
        }
    };

    window.Codez48Driver = {
        DOMDriver,
        runId,
        updateHUD: updateHUDMessage,

        async executeStep(step) {
            updateHUDMessage(`Executing Step: ${step.description || step.action}`);
            const elem = DOMDriver.querySelectorSmart(step.selector || step.target);

            switch (step.action) {
                case 'click':
                    if (elem) return DOMDriver.triggerNativeClick(elem);
                    break;
                case 'fill':
                case 'type':
                    if (elem) return DOMDriver.triggerNativeType(elem, step.value || step.text);
                    break;
                case 'press':
                    return DOMDriver.triggerKeyPress(elem, step.value || 'Enter');
                case 'scroll':
                    window.scrollBy({ top: step.value === 'up' ? -500 : 500, behavior: 'smooth' });
                    return true;
                case 'extract':
                    if (elem) {
                        const text = elem.innerText || elem.textContent;
                        updateHUDMessage(`Extracted: ${text.substring(0, 30)}...`);
                        return text;
                    }
                    break;
            }
            return false;
        }
    };

    renderAgentHUD();
    updateHUDMessage(runId ? `Bookmarklet Active: ${runId}` : `Codez48 Bookmarklet Helper Ready.`);

})();
