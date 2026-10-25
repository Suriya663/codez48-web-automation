/**
 * CODEZ48 PILOT CURSOR COMPANION (WEB EDITION)
 * 3D-Style Circular AI Interface with Cursor Following & Live Animations:
 * - Circular 3D glowing sphere that follows the mouse cursor
 * - Two blinking eyes with periodic realistic blinks
 * - Smiling mouth when executing tasks or generating
 * - "Thinking" state with rotating neon halo
 * - "Generating" state with animated moving dots (• • •)
 * - Glassmorphic status badge showing live task text
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
            this.state = 'idle'; // 'idle' | 'thinking' | 'generating' | 'acting' | 'success'
            this.statusText = 'Pilot Ready';
            this.rafId = null;

            this.init();
        }

        init() {
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
                    gap: 12px;
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
                    background: radial-gradient(circle at 32% 28%, #ffffff 0%, #70e1ff 20%, #0088ff 52%, #141c6d 85%, #0a0e27 100%);
                    box-shadow: 0 0 25px rgba(0, 229, 255, 0.75), inset 0 0 12px rgba(255, 255, 255, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pilotAvatarPulse 2.4s ease-in-out infinite;
                }

                /* Rotating Halo for Thinking State */
                .pilot-orbit-ring {
                    position: absolute;
                    inset: -5px;
                    border-radius: 50%;
                    border: 2px dashed rgba(0, 240, 255, 0.85);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    animation: pilotRotateRing 3s linear infinite;
                }

                #pilot-companion-root.thinking .pilot-orbit-ring {
                    opacity: 1;
                }

                /* Face Container */
                .pilot-face {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }

                /* Eyes */
                .pilot-eye {
                    position: absolute;
                    width: 8px;
                    height: 11px;
                    background: #ffffff;
                    border-radius: 50%;
                    top: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                    animation: pilotEyeBlink 3.6s infinite;
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

                .pilot-eye.left { left: 14px; }
                .pilot-eye.right { right: 14px; }

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
                #pilot-companion-root.smile .pilot-mouth {
                    height: 12px;
                    border-radius: 0 0 16px 16px;
                    border-bottom-width: 3px;
                }

                /* Glassmorphic Status Pill */
                .pilot-status-badge {
                    background: rgba(10, 16, 38, 0.88);
                    border: 1px solid rgba(0, 229, 255, 0.45);
                    border-radius: 20px;
                    padding: 6px 14px 7px 14px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 229, 255, 0.2);
                    backdrop-filter: blur(8px);
                    color: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 290px;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pilot-badge-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .pilot-badge-tag {
                    font-size: 9px;
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
                #pilot-companion-root.generating .pilot-dot:nth-child(1) {
                    animation: pilotDotBounce 0.8s infinite 0.0s;
                }
                #pilot-companion-root.thinking .pilot-dot:nth-child(2),
                #pilot-companion-root.generating .pilot-dot:nth-child(2) {
                    animation: pilotDotBounce 0.8s infinite 0.2s;
                }
                #pilot-companion-root.thinking .pilot-dot:nth-child(3),
                #pilot-companion-root.generating .pilot-dot:nth-child(3) {
                    animation: pilotDotBounce 0.8s infinite 0.4s;
                }

                .pilot-badge-text {
                    font-size: 11px;
                    font-weight: 600;
                    color: #e2e8f0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                @keyframes pilotEyeBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    93% { transform: scaleY(0.08); }
                    96% { transform: scaleY(1); }
                }

                @keyframes pilotAvatarPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(0, 229, 255, 0.6)); }
                    50% { transform: scale(1.04); filter: drop-shadow(0 0 18px rgba(0, 229, 255, 0.9)); }
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
                        <div class="pilot-eye right"></div>
                        <div class="pilot-mouth"></div>
                    </div>
                </div>
                <div class="pilot-status-badge">
                    <div class="pilot-badge-header">
                        <span class="pilot-badge-tag" id="pilot-badge-state">PILOT</span>
                        <div class="pilot-moving-dots" id="pilot-dots-container">
                            <span class="pilot-dot"></span>
                            <span class="pilot-dot"></span>
                            <span class="pilot-dot"></span>
                        </div>
                    </div>
                    <span class="pilot-badge-text" id="pilot-badge-detail">Codez48 Autonomous Pilot</span>
                </div>
            `;
            document.body.appendChild(root);
            this.container = root;

            window.addEventListener('mousemove', (e) => {
                this.targetX = e.clientX + 20;
                this.targetY = e.clientY + 18;

                // Edge collision handling
                if (this.targetX + 320 > window.innerWidth) {
                    this.targetX = e.clientX - 320;
                }
                if (this.targetY + 60 > window.innerHeight) {
                    this.targetY = e.clientY - 60;
                }
            }, { passive: true });

            this.animatePosition();
        }

        animatePosition() {
            // Smooth cursor spring physics
            this.currentX += (this.targetX - this.currentX) * 0.18;
            this.currentY += (this.targetY - this.currentY) * 0.18;

            if (this.container) {
                this.container.style.left = `${this.currentX}px`;
                this.container.style.top = `${this.currentY}px`;
            }

            requestAnimationFrame(() => this.animatePosition());
        }

        show(state = 'thinking', text = 'Codez48 Pilot Active') {
            this.isActive = true;
            this.setState(state, text);
            if (this.container) {
                this.container.classList.add('active');
            }
        }

        hide() {
            this.isActive = false;
            if (this.container) {
                this.container.classList.remove('active');
            }
        }

        setState(state, text) {
            this.state = state;
            if (text) this.statusText = text;

            if (!this.container) return;

            this.container.className = this.isActive ? `active ${state}` : state;

            const stateEl = document.getElementById('pilot-badge-state');
            const textEl = document.getElementById('pilot-badge-detail');

            if (textEl && text) textEl.textContent = text;
            if (stateEl) {
                switch (state) {
                    case 'thinking':
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

    const companion = new PilotCursorCompanion();
    window.PilotCursorCompanion = companion;
    window.activatePilotCompanion = (state, text) => companion.show(state, text);
    window.deactivatePilotCompanion = () => companion.hide();
    window.setPilotCompanionState = (state, text) => companion.setState(state, text);
})();
