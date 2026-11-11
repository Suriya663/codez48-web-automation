/**
 * CODEZ48 CLIENT-SIDE ZERO-INSTALL BROWSER RUNNER
 * Lightweight, in-DOM JavaScript agent executed entirely in the client browser.
 * Zero installation, zero executables, 100% antivirus safe.
 */

(function() {
    if (window.__CDZ48_REMOTE_CLIENT_ACTIVE__) {
        console.log('[CODEZ48] Client Runner already active.');
        return;
    }
    window.__CDZ48_REMOTE_CLIENT_ACTIVE__ = true;

    console.log('[CODEZ48] In-Browser Automation Runner Initialized.');

    // Create a compact floating HUD widget on the client's page
    const container = document.createElement('div');
    container.id = 'cdz48-client-hud';
    container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        background: #131b2e;
        border: 1px solid #10b981;
        border-radius: 12px;
        padding: 14px 18px;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 300px;
    `;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; color: #10b981; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                Codez48 Client Runner
            </div>
            <button id="cdz48-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
            Safe in-browser mode active. Actions execute directly inside this tab without downloading any files or executables.
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="cdz48-capture-dom" style="flex: 1; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 6px; border-radius: 6px; font-size: 11px; cursor: pointer;">
                Inspect Page
            </button>
            <button id="cdz48-auto-fill" style="flex: 1; background: #10b981; border: none; color: #000; font-weight: 700; padding: 6px; border-radius: 6px; font-size: 11px; cursor: pointer;">
                Auto-Fill Forms
            </button>
        </div>
    `;

    document.body.appendChild(container);

    document.getElementById('cdz48-close-btn').onclick = () => {
        container.remove();
        window.__CDZ48_REMOTE_CLIENT_ACTIVE__ = false;
    };

    document.getElementById('cdz48-capture-dom').onclick = () => {
        const title = document.title;
        const inputs = Array.from(document.querySelectorAll('input, button, a')).length;
        alert(`Page: "${title}"\nInteractive Elements Detected: ${inputs}`);
    };

    document.getElementById('cdz48-auto-fill').onclick = () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
        let filled = 0;
        inputs.forEach(input => {
            if (!input.value) {
                if (input.type === 'email' || input.name.includes('email')) {
                    input.value = 'user@codez48.com';
                    filled++;
                }
            }
        });
        alert(`Auto-filled ${filled} input fields safely.`);
    };
})();
