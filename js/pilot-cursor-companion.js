/**
 * CODEZ48 PILOT CURSOR COMPANION (AUTONOMOUS PLAYWRIGHT EDITION)
 * 3D Circular AI Avatar with Cursor Following & Live Animations:
 * - Single Instance Enforcement: Only one instance on screen
 * - Eye-Originating Loading Transformation:
 *     - Natural blinking across idle/generating states
 *     - In 'loading' / 'thinking' states, pupils smoothly transform into a mathematically PERFECT circular loading ring
 *     - When loaded, pupils smoothly transform back into normal eyes with specular catchlights
 * - "Thinking / Doing / Next" Status Badge:
 *     - Displays what the AI is thinking, what it is currently doing, and what it plans to do next
 *     - Auto-wrapping, line-height 1.35, zero clipping
 *     - Scaled down, ultra-compact minimal footprint (28px avatar, 220px card)
 * - Scroll Tracking: Fluidly follows page scroll and user reading position
 * - Auto-lowering when near top of viewport (Y < 140)
 * - Remains active throughout task execution until user closes
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

                /* 3D Circular AI Avatar Sphere - Scaled Down (28px) */
                .pilot-3d-avatar {
                    width: 28px;
                    height: 28px;
                    min-width: 28px;
                    min-height: 28px;
                    max-width: 28px;
                    max-height: 28px;
                    aspect-ratio: 1 / 1;
                    border-radius: 50%;
                    position: relative;
                    background: radial-gradient(circle at 35% 30%, #ffffff 0%, #dbeafe 30%, #38bdf8 70%, #0284c7 100%);
                    box-shadow: 
                        inset 0 1px 2px rgba(255, 255, 255, 0.9),
                        inset 0 -2px 4px rgba(15, 23, 42, 0.6),
                        0 0 12px rgba(0, 229, 255, 0.6),
                        0 4px 10px rgba(0, 0, 0, 0.5);
                    animation: pilotAvatarPulse 3.2s infinite ease-in-out;
                    pointer-events: auto;
                    cursor: grab;
                    flex-shrink: 0;
                    overflow: visible;
                }

                /* Outer Rotating Halo - Strict 1:1 Circle */
                .pilot-orbit-ring {
                    position: absolute;
                    inset: -3px;
                    border-radius: 50%;
                    aspect-ratio: 1 / 1;
                    border: 1px dashed rgba(0, 229, 255, 0.9);
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

                /* EYES - STRICT CIRCULAR GEOMETRY WITH ZERO OVAL DISTORTION */
                .pilot-eye {
                    position: absolute;
                    width: 6.5px;
                    height: 6.5px;
                    aspect-ratio: 1 / 1;
                    min-width: 6.5px;
                    min-height: 6.5px;
                    background: radial-gradient(circle at 35% 35%, #ffffff 0%, #70e1ff 35%, #00b4d8 75%, #0077fe 100%);
                    border-radius: 50%;
                    top: 7px;
                    box-shadow: 0 0 6px #00f0ff;
                    animation: pilotEyeBlink 3.4s infinite;
                    transform-origin: center;
                    overflow: visible;
                }

                .pilot-eye.left { left: 6px; }
                .pilot-eye.right { right: 6px; }

                /* Disable vertical scaleY blink during loading/thinking so circle is never deformed into oval */
                #pilot-companion-root.thinking .pilot-eye,
                #pilot-companion-root.loading .pilot-eye {
                    animation: none !important;
                    transform: none !important;
                }

                /* NORMAL PUPIL WITH CATCHLIGHTS */
                .pilot-pupil-normal {
                    position: absolute;
                    width: 3.2px;
                    height: 3.2px;
                    aspect-ratio: 1 / 1;
                    background: #051428;
                    border-radius: 50%;
                    top: 1.65px;
                    left: 1.65px;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 1;
                    transform: scale(1);
                }

                .pilot-catchlight-1 {
                    position: absolute;
                    width: 1.5px;
                    height: 1.5px;
                    aspect-ratio: 1 / 1;
                    background: #ffffff;
                    border-radius: 50%;
                    top: 0.5px;
                    left: 0.5px;
                    box-shadow: 0 0 2px #ffffff;
                }

                .pilot-catchlight-2 {
                    position: absolute;
                    width: 0.8px;
                    height: 0.8px;
                    aspect-ratio: 1 / 1;
                    background: #ffffff;
                    border-radius: 50%;
                    bottom: 0.5px;
                    right: 0.5px;
                }

                /* LOADING SPINNER - STRICT 1:1 PERFECT CIRCLE */
                .pilot-pupil-loading {
                    position: absolute;
                    width: 9px;
                    height: 9px;
                    min-width: 9px;
                    min-height: 9px;
                    aspect-ratio: 1 / 1;
                    border-radius: 50%;
                    top: -1.25px;
                    left: -1.25px;
                    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
                    opacity: 0;
                    transform: scale(0.2) rotate(0deg);
                    pointer-events: none;
                    transform-origin: 50% 50%;
                }

                .pilot-loading-svg {
                    width: 100%;
                    height: 100%;
                    aspect-ratio: 1 / 1;
                    display: block;
                    filter: drop-shadow(0 0 3px #00f5ff);
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
                    animation: pupilSpinnerRotation 1.1s linear infinite !important;
                }

                @keyframes pupilSpinnerRotation {
                    from { transform: scale(1) rotate(0deg); }
                    to { transform: scale(1) rotate(360deg); }
                }

                /* Eye Concentric Pulse Ripples - Strict 1:1 Circle */
                .pilot-eye-ripple {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    aspect-ratio: 1 / 1;
                    border: 1px solid #00f5ff;
                    border-radius: 50%;
                    top: 4.25px;
                    pointer-events: none;
                    opacity: 0;
                    box-shadow: 0 0 6px #00f5ff;
                }
                .pilot-eye-ripple.left { left: 3.25px; }
                .pilot-eye-ripple.right { right: 3.25px; }

                #pilot-companion-root.thinking .pilot-eye-ripple,
                #pilot-companion-root.loading .pilot-eye-ripple {
                    animation: pilotEyeRipplePulse 1.3s infinite ease-out;
                }

                /* Smiling Mouth */
                .pilot-mouth {
                    position: absolute;
                    bottom: 6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 12px;
                    height: 5px;
                    border-bottom: 2px solid #ffffff;
                    border-radius: 0 0 8px 8px;
                    transition: all 0.3s ease;
                }

                #pilot-companion-root.generating .pilot-mouth,
                #pilot-companion-root.acting .pilot-mouth,
                #pilot-companion-root.smile .pilot-mouth,
                #pilot-companion-root.success .pilot-mouth {
                    height: 7px;
                    border-radius: 0 0 10px 10px;
                    border-bottom-width: 2.2px;
                }

                /* Snug Glassmorphic Status Card - Compact Scaled Down */
                .pilot-status-badge {
                    background: linear-gradient(135deg, rgba(8, 20, 52, 0.96), rgba(4, 12, 34, 0.96));
                    border: 1px solid rgba(0, 229, 255, 0.65);
                    border-radius: 8px;
                    padding: 4px 8px 5px 8px;
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.7), 0 0 12px rgba(0, 229, 255, 0.25);
                    backdrop-filter: blur(8px);
                    color: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 220px;
                    min-width: 170px;
                    pointer-events: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2.5px;
                    transition: top 0.25s ease;
                }

                .pilot-badge-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 5px;
                    border-bottom: 1px solid rgba(0, 229, 255, 0.18);
                    padding-bottom: 2px;
                }

                .pilot-badge-tag-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .pilot-badge-tag {
                    font-size: 7px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    color: #00e5ff;
                }

                /* Moving Animated Dots (• • •) */
                .pilot-moving-dots {
                    display: inline-flex;
                    gap: 2.5px;
                    align-items: center;
                }

                .pilot-dot {
                    width: 3px;
                    height: 3px;
                    background: #ffffff;
                    box-shadow: 0 0 4px #00e5ff;
                    border-radius: 50%;
                    opacity: 0.3;
                }

                .pilot-dot:nth-child(1) { animation: pilotDotBounce 1.4s infinite ease-in-out; }
                .pilot-dot:nth-child(2) { animation: pilotDotBounce 1.4s infinite ease-in-out 0.2s; }
                .pilot-dot:nth-child(3) { animation: pilotDotBounce 1.4s infinite ease-in-out 0.4s; }

                .pilot-title-text {
                    font-size: 8px;
                    font-weight: 600;
                    color: #f8fafc;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .pilot-activity-block {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pilot-doing-row {
                    color: #e2e8f0;
                    font-size: 7.5px;
                    line-height: 1.35;
                    word-break: break-word;
                }

                .pilot-doing-row strong {
                    color: #38bdf8;
                    font-weight: 600;
                    margin-right: 3px;
                }

                .pilot-next-row {
                    color: #94a3b8;
                    font-weight: 400;
                    font-size: 7px;
                    line-height: 1.3;
                    word-break: break-word;
                }

                .pilot-next-row strong {
                    color: #7dd3fc;
                    font-weight: 600;
                    margin-right: 3px;
                }

                @keyframes pilotEyeBlink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    93% { transform: scaleY(0.1); }
                    96% { transform: scaleY(1); }
                }

                @keyframes pilotEyeRipplePulse {
                    0% { transform: scale(0.6); opacity: 0.9; }
                    100% { transform: scale(2.4); opacity: 0; }
                }

                @keyframes pilotAvatarPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(0, 229, 255, 0.6)); }
                    50% { transform: scale(1.02); filter: drop-shadow(0 0 14px rgba(0, 229, 255, 0.85)); }
                }

                @keyframes pilotRotateRing {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes pilotDotBounce {
                    0%, 100% { opacity: 0.3; transform: translateY(0); }
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
                        <!-- Left Eye -->
                        <div class="pilot-eye left">
                            <div class="pilot-pupil-normal">
                                <div class="pilot-catchlight-1"></div>
                                <div class="pilot-catchlight-2"></div>
                            </div>
                            <div class="pilot-pupil-loading">
                                <svg viewBox="0 0 24 24" class="pilot-loading-svg" preserveAspectRatio="xMidYMid meet">
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
                                <svg viewBox="0 0 24 24" class="pilot-loading-svg" preserveAspectRatio="xMidYMid meet">
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
                    this.targetY = this.mouseY + 26;
                } else {
                    this.targetY = this.mouseY + 6;
                }

                // Prevent overflowing right viewport boundary (scaled down width ~235px)
                const maxRight = window.innerWidth - 235;
                if (this.targetX > maxRight) {
                    this.targetX = this.mouseX - 225;
                }
            }, { passive: true });

            // Fluid scroll tracking: smoothly moves companion along with page scroll and content reading
            let lastScrollY = window.scrollY;
            window.addEventListener('scroll', () => {
                const deltaY = window.scrollY - lastScrollY;
                lastScrollY = window.scrollY;
                this.targetY = Math.max(12, Math.min(window.innerHeight - 70, this.targetY - deltaY * 0.35));
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
                        stateEl.textContent = 'THINKING & REASONING';
                        stateEl.style.color = '#00f0ff';
                        break;
                    case 'generating':
                        stateEl.textContent = 'GENERATING RESPONSE';
                        stateEl.style.color = '#a855f7';
                        break;
                    case 'acting':
                        stateEl.textContent = 'EXECUTING ACTION';
                        stateEl.style.color = '#10b981';
                        break;
                    case 'success':
                        stateEl.textContent = 'TASK COMPLETED';
                        stateEl.style.color = '#34d399';
                        break;
                    default:
                        stateEl.textContent = 'AI COPILOT ACTIVE';
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
