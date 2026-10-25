/**
 * CODEZ48 PILOT CURSOR COMPANION (WEB EDITION)
 * 3D-Style Circular AI Interface with Cursor Following & Live Animations:
 * - Single Instance Enforcement: Never spawns if ThreeAiAssistant or another floating companion is active
 * - Circular 3D glowing sphere that follows the mouse cursor with snug proximity (+8px, +6px)
 * - Two blinking eyes with periodic realistic blinks across all states including loading
 * - Eye-originating loading animation (ripples emanating directly from eyes)
 * - Smiling mouth when executing tasks, generating, or completed
 * - "Thinking" state with rotating neon halo and unclipped thought process text
 * - Auto-lowering when near top of screen (mouseY < 180) so thought text is never cut off
 * - "Generating" state with animated moving dots (• • •)
 * - Glassmorphic status badge showing full live task text with text-wrapping
 * - Seamless activation on Pilot trigger, graceful fade-out when deactivated
 */

(function () {
    if (typeof window === 'undefined') return;

    class PilotCursorCompanion {
        constructor() {
            this.container = null;
            this.isActive = false;
            this.mouseX = window.innerWidth / 2;
            this.mouseY = window.innerHeight / 2;
            this.targetX = this.mouseX;
            this.targetY = this.mouseY;
            this.currentX = this.mouseX;
            this.currentY = this.mouseY;
            this.state = 'idle'; // 'idle' | 'thinking' | 'loading' | 'generating' | 'acting' | 'success'
            this.statusText = 'Pilot Ready';
            this.rafId = null;

            this.init();
        }

        init() {
            // Strict singleton: if ThreeAiAssistant or floating avatar already exists, do not duplicate!
            if (window.__CDZ48_ACTIVE_FLOATING_AVATAR__ || document.querySelector('.three-ai-assistant-wrapper[data-floating="true"]')) {
                return;
            }
            if (document.getElementById('pilot-companion-root')) return;

            const style = document.createElement('style');
            style.textContent = `
                #pilot-companion-root {
                    position: fixed;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0;
                    transform: scale(0.6);
                    will-change: transform, left, top;
                }

                #pilot-companion-root.active {
                    opacity: 1;
                    transform: scale(1);
                }

                /* 3D Circular AI Sphere */
                .pilot-3d-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    position: relative;
                    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #dbeafe 30%, #3b82f6 75%, #1d4ed8 100%);
                    box-shadow: 
                        inset 0 2px 4px rgba(255, 255, 255, 0.8),
                        inset 0 -4px 8px rgba(15, 23, 42, 0.6),
                        0 0 20px rgba(0, 229, 255, 0.5),
                        0 8px 16px rgba(0, 0, 0, 0.4);
                    animation: pilotAvatarPulse 3s infinite ease-in-out;
                    pointer-events: auto;
                    cursor: grab;
                }

                /* Outer Rotating Halo */
                .pilot-orbit-ring {
                    position: absolute;
                    inset: -5px;
                    border-radius: 50%;
                    border: 2px dashed rgba(0, 229, 255, 0.7);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                #pilot-companion-root.thinking .pilot-orbit-ring,
                #pilot-companion-root.loading .pilot-orbit-ring,
                #pilot-companion-root.generating .pilot-orbit-ring {
                    opacity: 1;
                    animation: pilotRotateRing 3s linear infinite;
                }

                /* Avatar Face */
                .pilot-face {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Eyes */
                .pilot-eye {
                    position: absolute;
                    width: 9px;
                    height: 13px;
                    background: radial-gradient(circle at 35% 35%, #ffffff 0%, #00f0ff 45%, #0077fe 100%);
                    border-radius: 50%;
                    top: 15px;
                    box-shadow: 0 0 10px #00f0ff;
                    animation: pilotEyeBlink 3.4s infinite;
                    transform-origin: center;
                }

                .pilot-eye::after {
                    content: '';
                    position: absolute;
                    width: 4px;
                    height: 5px;
                    background: #0a1128;
                    border-radius: 50%;
                    top: 3px;
                    left: 2px;
                }

                .pilot-eye.left { left: 13px; }
                .pilot-eye.right { right: 13px; }

                /* Eye Loading Ripples */
                .pilot-eye-ripple {
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    border: 1.5px solid #00f5ff;
                    border-radius: 50%;
                    top: 14px;
                    pointer-events: none;
                    opacity: 0;
                    box-shadow: 0 0 8px #00f5ff;
                }
                .pilot-eye-ripple.left { left: 10.5px; }
                .pilot-eye-ripple.right { right: 10.5px; }

                #pilot-companion-root.thinking .pilot-eye-ripple,
                #pilot-companion-root.loading .pilot-eye-ripple {
                    animation: pilotEyeRipplePulse 1.2s infinite ease-out;
                }

                /* Smiling Mouth */
                .pilot-mouth {
                    position: absolute;
                    bottom: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 18px;
                    height: 8px;
                    border-bottom: 2.5px solid #ffffff;
                    border-radius: 0 0 12px 12px;
                    transition: all 0.3s ease;
                }

                /* Smile on Active / Generating */
                #pilot-companion-root.generating .pilot-mouth,
                #pilot-companion-root.acting .pilot-mouth,
                #pilot-companion-root.smile .pilot-mouth,
                #pilot-companion-root.success .pilot-mouth {
                    height: 12px;
                    border-radius: 0 0 16px 16px;
                    border-bottom-width: 3px;
                }

                /* Glassmorphic Status Pill */
                .pilot-status-badge {
                    background: rgba(8, 16, 40, 0.94);
                    border: 1px solid rgba(0, 229, 255, 0.55);
                    border-radius: 14px;
                    padding: 8px 14px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 18px rgba(0, 229, 255, 0.35);
                    backdrop-filter: blur(10px);
                    color: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 360px;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .pilot-badge-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .pilot-badge-tag {
                    font-size: 9.5px;
                    font-weight: 900;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: #00e5ff;
                }

                /* Moving Animated Dots */
                .pilot-moving-dots {
                    display: inline-flex;
                    gap: 3px;
                    align-items: center;
                }

                .pilot-dot {
                    width: 4px;
                    height: 4px;
                    background: #00e5ff;
                    border-radius: 50%;
                    opacity: 0.2;
                }

                #pilot-companion-root.thinking .pilot-dot:nth-child(1),
                #pilot-companion-root.loading .pilot-dot:nth-child(1),
                #pilot-companion-root.generating .pilot-dot:nth-child(1) {
                    animation: pilotDotBounce 0.8s infinite 0.0s;
                }
                #pilot-companion-root.thinking .pilot-dot:nth-child(2),
                #pilot-companion-root.loading .pilot-dot:nth-child(2),
                #pilot-companion-root.generating .pilot-dot:nth-child(2) {
                    animation: pilotDotBounce 0.8s infinite 0.2s;
                }
                #pilot-companion-root.thinking .pilot-dot:nth-child(3),
                #pilot-companion-root.loading .pilot-dot:nth-child(3),
                #pilot-companion-root.generating .pilot-dot:nth-child(3) {
                    animation: pilotDotBounce 0.8s infinite 0.4s;
                }

                .pilot-badge-text {
                    font-size: 11.5px;
                    font-weight: 500;
                    color: #e2e8f0;
                    white-space: normal;
                    word-break: break-word;
                    line-height: 1.45;
                    max-width: 340px;
                }

                @keyframes pilotEyeBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    93% { transform: scaleY(0.08); }
                    96% { transform: scaleY(1); }
                }

                @keyframes pilotEyeRipplePulse {
                    0% { transform: scale(0.6); opacity: 0.9; }
                    100% { transform: scale(2.4); opacity: 0; }
                }

                @keyframes pilotAvatarPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.6)); }
                    50% { transform: scale(1.03); filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.85)); }
                }

                @keyframes pilotRotateRing {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes pilotDotBounce {
                    0%, 100% { opacity: 0.2; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-2px); }
                }
            `;
            document.head.appendChild(style);

            const root = document.createElement('div');
            root.id = 'pilot-companion-root';
            root.innerHTML = `
                <div class="pilot-3d-avatar">
                    <div class="pilot-orbit-ring"></div>
                    <div class="pilot-face">
                        <div class="pilot-eye left"></div>
                        <div class="pilot-eye-ripple left"></div>
                        <div class="pilot-eye right"></div>
                        <div class="pilot-eye-ripple right"></div>
                        <div class="pilot-mouth"></div>
                    </div>
                </div>
                <div class="pilot-status-badge">
                    <div class="pilot-badge-header">
                        <span class="pilot-badge-tag" id="pilot-badge-state">PILOT</span>
                        <div class="pilot-moving-dots">
                            <span class="pilot-dot"></span>
                            <span class="pilot-dot"></span>
                            <span class="pilot-dot"></span>
                        </div>
                    </div>
                    <div class="pilot-badge-text" id="pilot-badge-detail">Codez48 Pilot Ready</div>
                    <div class="pilot-options-container" style="display:flex; gap:4px; margin-top:3px;">
                        <button style="background:rgba(0,229,255,0.2); border:1px solid rgba(0,229,255,0.6); color:#fff; border-radius:5px; padding:2px 6px; font-size:9px; cursor:pointer;">Standard Dosa</button>
                        <button style="background:rgba(0,229,255,0.2); border:1px solid rgba(0,229,255,0.6); color:#fff; border-radius:5px; padding:2px 6px; font-size:9px; cursor:pointer;">Crisp &amp; Thin</button>
                        <button style="background:#0077fe; border:1px solid #00e5ff; color:#fff; border-radius:5px; padding:2px 6px; font-size:9px; font-weight:bold; cursor:pointer;">Canteen</button>
                    </div>
                </div>
            `;
            document.body.appendChild(root);
            this.container = root;

            this.bindEvents();
            this.startLoop();
        }

        bindEvents() {
            window.addEventListener('mousemove', (e) => {
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;

                // Snug cursor offset (+8px, +6px)
                this.targetX = this.mouseX + 8;

                // Dynamic auto-lowering: if near top of screen (mouseY < 180), drop down lower
                if (this.mouseY < 180) {
                    this.targetY = this.mouseY + 42;
                } else {
                    this.targetY = this.mouseY + 6;
                }

                // Prevent overflowing right/bottom viewport
                const maxRight = window.innerWidth - 380;
                if (this.targetX > maxRight) {
                    this.targetX = this.mouseX - 340;
                }
            }, { passive: true });
        }

        startLoop() {
            const update = () => {
                // Smooth easing towards cursor
                this.currentX += (this.targetX - this.currentX) * 0.22;
                this.currentY += (this.targetY - this.currentY) * 0.22;

                if (this.container) {
                    this.container.style.transform = `translate3d(${Math.round(this.currentX)}px, ${Math.round(this.currentY)}px, 0)`;
                }

                this.rafId = requestAnimationFrame(update);
            };
            this.rafId = requestAnimationFrame(update);
        }

        show(state = 'idle', text = 'Codez48 Pilot Active') {
            if (window.__CDZ48_ACTIVE_FLOATING_AVATAR__ && window.__CDZ48_ACTIVE_FLOATING_AVATAR__ !== this) {
                return;
            }
            if (!this.container) this.init();
            if (!this.container) return;

            this.isActive = true;
            this.setState(state, text);
            this.container.classList.add('active');
        }

        hide() {
            if (!this.container) return;
            this.isActive = false;
            this.container.classList.remove('active');
        }

        setState(state, text) {
            if (!this.container) return;

            this.state = state;
            if (text) this.statusText = text;

            // Remove existing state classes
            this.container.classList.remove('idle', 'thinking', 'loading', 'generating', 'acting', 'smile', 'success');
            this.container.classList.add(state);

            const stateEl = document.getElementById('pilot-badge-state');
            const textEl = document.getElementById('pilot-badge-detail');

            if (textEl && text) textEl.textContent = text;
            if (stateEl) {
                switch (state) {
                    case 'thinking':
                    case 'loading':
                        stateEl.textContent = 'THINKING';
                        stateEl.style.color = '#00f0ff';
                        break;
                    case 'generating':
                        stateEl.textContent = 'GENERATING';
                        stateEl.style.color = '#a855f7';
                        break;
                    case 'acting':
                        stateEl.textContent = 'AUTOMATING';
                        stateEl.style.color = '#10b981';
                        break;
                    case 'success':
                        stateEl.textContent = 'COMPLETED';
                        stateEl.style.color = '#34d399';
                        break;
                    default:
                        stateEl.textContent = 'PILOT';
                        stateEl.style.color = '#38bdf8';
                        break;
                }
            }
        }
    }

    if (!window.__CDZ48_ACTIVE_FLOATING_AVATAR__) {
        const companion = new PilotCursorCompanion();
        window.PilotCursorCompanion = companion;
        window.__CDZ48_ACTIVE_FLOATING_AVATAR__ = companion;
        window.activatePilotCompanion = (state, text) => companion.show(state, text);
        window.deactivatePilotCompanion = () => companion.hide();
        window.setPilotCompanionState = (state, text) => companion.setState(state, text);
    }
})();
