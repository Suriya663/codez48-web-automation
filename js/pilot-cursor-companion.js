/**
 * CODEZ48 PILOT CURSOR COMPANION (AUTONOMOUS PLAYWRIGHT EDITION)
 * 3D Circular AI Avatar with Cursor Following & Live Animations:
 * - Single Instance Enforcement: Only one instance on screen
 * - Eye-Originating Loading Transformation:
 *     - Natural blinking across ALL states
 *     - In 'loading' / 'thinking' states, pupils smoothly transform into a rotating loading symbol
 *     - When loaded, pupils smoothly transform back into normal eyes with specular catchlights
 * - "Thinking / Doing / Next" Status Badge:
 *     - Displays what the AI is thinking, what it is currently doing, and what it plans to do next
 *     - Auto-wrapping, line-height 1.45, zero clipping
 * - Auto-lowering when near top of viewport (Y < 180)
 * - Remains active throughout task execution until user closes (Ctrl+C)
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
            this.statusTitle = 'Autonomous Playwright Active';
            this.currentDoing = 'Analyzing screen elements...';
            this.currentNext = 'Formulating next action sequence';
            this.rafId = null;

            this.init();
        }

        init() {
            // Strict singleton: if already initialized, avoid duplicating DOM
            if (document.getElementById('pilot-companion-root')) {
                this.container = document.getElementById('pilot-companion-root');
                return;
            }

            const style = document.createElement('style');
            style.textContent = `
                #pilot-companion-root {
                    position: fixed;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    z-index: 2147483647; /* Highest z-index */
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    opacity: 0;
                    transform: scale(0.6);
                    will-change: transform, left, top;
                }

                #pilot-companion-root.active {
                    opacity: 1;
                    transform: scale(1);
                }

                /* 3D Circular AI Avatar Sphere - Scaled Down */
                .pilot-3d-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    position: relative;
                    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #dbeafe 30%, #38bdf8 70%, #0284c7 100%);
                    box-shadow: 
                        inset 0 1.5px 3px rgba(255, 255, 255, 0.9),
                        inset 0 -3px 6px rgba(15, 23, 42, 0.6),
                        0 0 18px rgba(0, 229, 255, 0.6),
                        0 6px 14px rgba(0, 0, 0, 0.5);
                    animation: pilotAvatarPulse 3.2s infinite ease-in-out;
                    pointer-events: auto;
                    cursor: grab;
                    flex-shrink: 0;
                }

                /* Outer Rotating Halo */
                .pilot-orbit-ring {
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    border: 1.5px dashed rgba(0, 229, 255, 0.85);
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

                /* EYES WITH NATURAL BLINKING ACROSS ALL STATES */
                .pilot-eye {
                    position: absolute;
                    width: 8px;
                    height: 11px;
                    background: radial-gradient(circle at 35% 35%, #ffffff 0%, #70e1ff 35%, #00b4d8 75%, #0077fe 100%);
                    border-radius: 50%;
                    top: 10px;
                    box-shadow: 0 0 8px #00f0ff;
                    animation: pilotEyeBlink 3.4s infinite;
                    transform-origin: center;
                    overflow: visible;
                }

                .pilot-eye.left { left: 9px; }
                .pilot-eye.right { right: 9px; }

                /* NORMAL PUPIL WITH CATCHLIGHTS */
                .pilot-pupil-normal {
                    position: absolute;
                    width: 4px;
                    height: 5px;
                    background: #051428;
                    border-radius: 50%;
                    top: 3px;
                    left: 2px;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 1;
                    transform: scale(1);
                }

                .pilot-catchlight-1 {
                    position: absolute;
                    width: 2.2px;
                    height: 2.2px;
                    background: #ffffff;
                    border-radius: 50%;
                    top: 1px;
                    left: 1px;
                    box-shadow: 0 0 3px #ffffff;
                }

                .pilot-catchlight-2 {
                    position: absolute;
                    width: 1.2px;
                    height: 1.2px;
                    background: #ffffff;
                    border-radius: 50%;
                    bottom: 1.2px;
                    right: 1.2px;
                }

                /* LOADING SPINNER INSIDE PUPIL */
                .pilot-pupil-loading {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    top: 1.5px;
                    left: -0.5px;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 0;
                    transform: scale(0.2) rotate(0deg);
                    pointer-events: none;
                }

                .pilot-loading-svg {
                    width: 100%;
                    height: 100%;
                    display: block;
                    filter: drop-shadow(0 0 4px #00f5ff);
                }

                /* IN LOADING / THINKING STATE: Pupils transform into spinning loading symbol! */
                #pilot-companion-root.loading .pilot-pupil-normal,
                #pilot-companion-root.thinking .pilot-pupil-normal {
                    opacity: 0;
                    transform: scale(0.15);
                }

                #pilot-companion-root.loading .pilot-pupil-loading,
                #pilot-companion-root.thinking .pilot-pupil-loading {
                    opacity: 1;
                    transform: scale(1);
                    animation: pupilSpinnerRotation 1.1s linear infinite;
                }

                @keyframes pupilSpinnerRotation {
                    from { transform: scale(1) rotate(0deg); }
                    to { transform: scale(1) rotate(360deg); }
                }

                /* Eye Concentric Pulse Ripples */
                .pilot-eye-ripple {
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    border: 1.5px solid #00f5ff;
                    border-radius: 50%;
                    top: 13.5px;
                    pointer-events: none;
                    opacity: 0;
                    box-shadow: 0 0 8px #00f5ff;
                }
                .pilot-eye-ripple.left { left: 9.5px; }
                .pilot-eye-ripple.right { right: 9.5px; }

                #pilot-companion-root.thinking .pilot-eye-ripple,
                #pilot-companion-root.loading .pilot-eye-ripple {
                    animation: pilotEyeRipplePulse 1.3s infinite ease-out;
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

                #pilot-companion-root.generating .pilot-mouth,
                #pilot-companion-root.acting .pilot-mouth,
                #pilot-companion-root.smile .pilot-mouth,
                #pilot-companion-root.success .pilot-mouth {
                    height: 12px;
                    border-radius: 0 0 16px 16px;
                    border-bottom-width: 3px;
                }

                /* Snug Glassmorphic Status Card (Autonomous Playwright Action) - Scaled Down */
                .pilot-status-badge {
                    background: linear-gradient(135deg, rgba(8, 20, 52, 0.96), rgba(4, 12, 34, 0.96));
                    border: 1.2px solid rgba(0, 229, 255, 0.65);
                    border-radius: 12px;
                    padding: 6px 11px 7px 11px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 229, 255, 0.3);
                    backdrop-filter: blur(10px);
                    color: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 290px;
                    min-width: 210px;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    transition: top 0.25s ease;
                }

                .pilot-badge-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                    border-bottom: 1px solid rgba(0, 229, 255, 0.18);
                    padding-bottom: 2px;
                }

                .pilot-badge-tag-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .pilot-badge-tag {
                    font-size: 8.5px;
                    font-weight: 900;
                    letter-spacing: 0.6px;
                    text-transform: uppercase;
                    color: #00e5ff;
                }

                /* Moving Animated Dots (• • •) */
                .pilot-moving-dots {
                    display: inline-flex;
                    gap: 3px;
                    align-items: center;
                }

                .pilot-dot {
                    width: 3.5px;
                    height: 3.5px;
                    background: #ffffff;
                    box-shadow: 0 0 5px #00e5ff;
                    border-radius: 50%;
                    opacity: 0.3;
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

                .pilot-title-text {
                    font-size: 10px;
                    font-weight: 700;
                    color: #ffffff;
                    margin-top: 1px;
                }

                /* CURRENT DOING & NEXT PLANNING ROWS (Full Thought Visibility) */
                .pilot-activity-block {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    margin-top: 1px;
                }

                .pilot-doing-row, .pilot-next-row {
                    font-size: 9.5px;
                    line-height: 1.35;
                    white-space: normal;
                    word-break: break-word;
                }

                .pilot-doing-row {
                    color: #e2f4ff;
                    font-weight: 500;
                }

                .pilot-doing-row strong {
                    color: #00f5ff;
                    font-weight: 700;
                    margin-right: 3px;
                }

                .pilot-next-row {
                    color: #94a3b8;
                    font-weight: 400;
                    font-size: 9px;
                }

                .pilot-next-row strong {
                    color: #7dd3fc;
                    font-weight: 600;
                    margin-right: 3px;
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
                    50% { transform: scale(1.03); filter: drop-shadow(0 0 18px rgba(0, 229, 255, 0.9)); }
                }

                @keyframes pilotRotateRing {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes pilotDotBounce {
                    0%, 100% { opacity: 0.3; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-2.5px); }
                }
            `;
            document.head.appendChild(style);

            const root = document.createElement('div');
            root.id = 'pilot-companion-root';
            root.innerHTML = `
                <div class="pilot-3d-avatar">
                    <div class="pilot-orbit-ring"></div>
                    <div class="pilot-face">
                        <!-- Left Eye -->
                        <div class="pilot-eye left">
                            <div class="pilot-pupil-normal">
                                <div class="pilot-catchlight-1"></div>
                                <div class="pilot-catchlight-2"></div>
                            </div>
                            <div class="pilot-pupil-loading">
                                <svg viewBox="0 0 24 24" class="pilot-loading-svg">
                                    <circle cx="12" cy="12" r="9" stroke="rgba(0,229,255,0.25)" stroke-width="2.5" fill="none"/>
                                    <path d="M 12,3 A 9,9 0 0 1 21,12" stroke="#00f5ff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                                </svg>
                            </div>
                        </div>
                        <div class="pilot-eye-ripple left"></div>

                        <!-- Right Eye -->
                        <div class="pilot-eye right">
                            <div class="pilot-pupil-normal">
                                <div class="pilot-catchlight-1"></div>
                                <div class="pilot-catchlight-2"></div>
                            </div>
                            <div class="pilot-pupil-loading">
                                <svg viewBox="0 0 24 24" class="pilot-loading-svg">
                                    <circle cx="12" cy="12" r="9" stroke="rgba(0,229,255,0.25)" stroke-width="2.5" fill="none"/>
                                    <path d="M 12,3 A 9,9 0 0 1 21,12" stroke="#00f5ff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                                </svg>
                            </div>
                        </div>
                        <div class="pilot-eye-ripple right"></div>

                        <div class="pilot-mouth"></div>
                    </div>
                </div>

                <div class="pilot-status-badge">
                    <div class="pilot-badge-header">
                        <div class="pilot-badge-tag-group">
                            <span class="pilot-badge-tag" id="pilot-badge-state">THINKING</span>
                            <div class="pilot-moving-dots">
                                <span class="pilot-dot"></span>
                                <span class="pilot-dot"></span>
                                <span class="pilot-dot"></span>
                            </div>
                        </div>
                    </div>

                    <div class="pilot-title-text" id="pilot-badge-title">Autonomous Playwright Active</div>

                    <div class="pilot-activity-block">
                        <div class="pilot-doing-row">
                            <strong>Doing:</strong><span id="pilot-doing-text">Analyzing screen elements and planning next step...</span>
                        </div>
                        <div class="pilot-next-row" id="pilot-next-container">
                            <strong>Next:</strong><span id="pilot-next-text">Formulating next browser action sequence</span>
                        </div>
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

                // Dynamic auto-lowering: If cursor is near top of screen (mouseY < 140), drop down slightly
                if (this.mouseY < 140) {
                    this.targetY = this.mouseY + 30;
                } else {
                    this.targetY = this.mouseY + 6;
                }

                // Prevent overflowing right viewport boundary
                const maxRight = window.innerWidth - 310;
                if (this.targetX > maxRight) {
                    this.targetX = this.mouseX - 290;
                }
            }, { passive: true });
        }

        startLoop() {
            const update = () => {
                this.currentX += (this.targetX - this.currentX) * 0.22;
                this.currentY += (this.targetY - this.currentY) * 0.22;

                if (this.container) {
                    this.container.style.transform = `translate3d(${Math.round(this.currentX)}px, ${Math.round(this.currentY)}px, 0)`;
                }

                this.rafId = requestAnimationFrame(update);
            };
            this.rafId = requestAnimationFrame(update);
        }

        show(state = 'thinking', title = 'Autonomous Playwright Active') {
            if (!this.container) this.init();
            if (!this.container) return;

            this.isActive = true;
            this.setState(state, title);
            this.container.classList.add('active');
        }

        hide() {
            if (!this.container) return;
            this.isActive = false;
            this.container.classList.remove('active');
        }

        setAutonomousState(state, title, doing, nextAction) {
            if (!this.container) this.init();
            if (!this.container) return;

            this.state = state;
            this.container.classList.add('active');
            this.container.classList.remove('idle', 'thinking', 'loading', 'generating', 'acting', 'smile', 'success');
            this.container.classList.add(state);

            const stateEl = document.getElementById('pilot-badge-state');
            const titleEl = document.getElementById('pilot-badge-title');
            const doingEl = document.getElementById('pilot-doing-text');
            const nextEl = document.getElementById('pilot-next-text');
            const nextContainer = document.getElementById('pilot-next-container');

            if (titleEl && title) titleEl.textContent = title;
            if (doingEl && doing) doingEl.textContent = doing;
            if (nextEl && nextAction) {
                nextEl.textContent = nextAction;
                if (nextContainer) nextContainer.style.display = 'block';
            } else if (nextContainer && !nextAction) {
                nextContainer.style.display = 'none';
            }

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
                        stateEl.textContent = 'AUTONOMOUS PLAYWRIGHT';
                        stateEl.style.color = '#38bdf8';
                        break;
                }
            }
        }

        setState(state, text) {
            this.setAutonomousState(state, 'Autonomous Playwright Active', text, null);
        }
    }

    const companion = new PilotCursorCompanion();
    window.PilotCursorCompanion = companion;
    window.activatePilotCompanion = (state, text) => companion.show(state, text);
    window.deactivatePilotCompanion = () => companion.hide();
    window.setPilotCompanionState = (state, text) => companion.setState(state, text);
    window.setPilotAutonomousState = (state, title, doing, nextAction) => companion.setAutonomousState(state, title, doing, nextAction);
})();
