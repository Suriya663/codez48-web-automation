/**
 * CODEZ48 3D FLOATING AI ASSISTANT (WebGL / Three.js)
 * Official Codez48 Specification & Reference Design
 * 
 * Features:
 * - Single Instance Enforcement: Guarantees only one floating avatar instance exists at any time
 * - High-Quality 3D Robot Avatar: Glossy spherical white helmet, antenna with glowing cyan tip,
 *   left/right ear-pod headphones with glowing rings, obsidian visor screen
 * - Eye-Originating Loading Animation: In 'loading' / 'thinking' states, concentric cyan pulse ripples
 *   and rotating energy arcs emanate outward directly from both eye pupils
 * - Continuous Natural Blinking: Eyes blink naturally across all states including loading
 * - Fluid Mouth Animations: Precise quadratic/elliptical smiles and subtle talking movement without awkward angles or distortions
 * - 3D State Rotation: Smooth continuous Y-axis rotation in loading & generating states
 * - Thinking Thought Process Card: Displays full unclipped thought text with auto-wrapping
 * - Dynamic Viewport Collision & Auto-Lowering: If cursor is near top of screen (Y < 180), drops thought card
 *   below the avatar so thoughts are 100% visible and never cut off off-screen
 * - Snug Cursor Proximity (+8px, +6px) with zero distant drift
 * - Docked Upper-Right Message Pill (• • •) matching official reference spec
 * - Autonomous Action Companion & Real-Time Status Flow
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['three'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('three'));
    } else {
        root.ThreeAiAssistant = factory(root.THREE);
    }
}(typeof self !== 'undefined' ? self : this, function (THREE) {
    'use strict';

    if (!THREE) {
        console.error('[ThreeAiAssistant] THREE is not loaded.');
        return null;
    }

    class ThreeAiAssistant {
        constructor(options = {}) {
            this.options = Object.assign({
                container: null,
                size: 104,                    // Avatar diameter in pixels
                initialState: 'idle',         // 'idle' | 'thinking' | 'loading' | 'generating' | 'completed'
                initialMessage: '',
                cursorFollow: false,          // Follow mouse cursor
                cursorOffset: { x: 8, y: 6 }, // Snug cursor offset
                floating: true,               // Subtle floating bob
                showBubble: true,             // Show top-right message pill
                onActionClick: null
            }, options);

            // --- STRICT SINGLETON ENFORCEMENT ---
            // If this is a floating cursor-following assistant, ensure only ONE instance exists!
            if (!this.options.container || this.options.cursorFollow) {
                if (window.__CDZ48_ACTIVE_FLOATING_AVATAR__) {
                    try {
                        window.__CDZ48_ACTIVE_FLOATING_AVATAR__.destroy();
                    } catch (_) {}
                    window.__CDZ48_ACTIVE_FLOATING_AVATAR__ = null;
                }

                // Clean up any duplicate DOM elements
                document.querySelectorAll('.three-ai-assistant-wrapper[data-floating="true"]').forEach(el => el.remove());
                const oldRoot = document.getElementById('pilot-companion-root');
                if (oldRoot) oldRoot.remove();

                window.__CDZ48_ACTIVE_FLOATING_AVATAR__ = this;
            }

            this.state = this.options.initialState;
            this.currentRotationY = 0;
            this.targetRotationY = 0;
            this.rotationSpeedY = 0.046;
            this.blinkTimer = 0;
            this.blinkProgress = 0;
            this.clock = new THREE.Clock();
            this.time = 0;
            this.currentMessage = this.options.initialMessage || '';
            this.thinkingThought = '';

            // Positioning
            this.cursorX = window.innerWidth / 2;
            this.cursorY = window.innerHeight / 2;
            this.currentX = this.cursorX;
            this.currentY = this.cursorY;
            this.isCursorFollowing = this.options.cursorFollow;
            this.rafId = null;

            this.initDOM();
            this.initThree();
            this.initEvents();
            this.setState(this.state, this.options.initialMessage);
            this.animate();
        }

        initDOM() {
            // Wrapper
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'three-ai-assistant-wrapper';
            if (!this.options.container || this.options.cursorFollow) {
                this.wrapper.setAttribute('data-floating', 'true');
            }
            this.wrapper.style.cssText = `
                position: ${this.options.container ? 'relative' : 'fixed'};
                width: ${this.options.size}px;
                height: ${this.options.size}px;
                pointer-events: none;
                z-index: 999999;
                transform: translate3d(0, 0, 0);
                will-change: transform, left, top;
                transition: opacity 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
            `;

            // Canvas Container
            this.canvasContainer = document.createElement('div');
            this.canvasContainer.style.cssText = `
                width: 100%;
                height: 100%;
                position: relative;
                pointer-events: auto;
                cursor: grab;
                filter: drop-shadow(0 0 20px rgba(0, 229, 255, 0.55));
            `;
            this.wrapper.appendChild(this.canvasContainer);

            // Snug Docked Message Bubble (Upper-right pill as in reference image)
            this.messageBubble = document.createElement('div');
            this.messageBubble.className = 'three-ai-bubble-pill';
            this.messageBubble.style.cssText = `
                position: absolute;
                top: 4px;
                right: -12px;
                background: linear-gradient(135deg, rgba(20, 60, 140, 0.95), rgba(10, 30, 80, 0.95));
                border: 1.5px solid rgba(0, 229, 255, 0.85);
                box-shadow: 0 0 16px rgba(0, 229, 255, 0.6), 0 4px 12px rgba(0, 0, 0, 0.7);
                border-radius: 999px;
                padding: 4px 10px;
                display: flex;
                align-items: center;
                gap: 5px;
                z-index: 10;
                pointer-events: auto;
                cursor: pointer;
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, top 0.25s ease;
                transform: scale(1);
                max-width: 320px;
            `;

            // Three glowing dots (• • •)
            this.dotsContainer = document.createElement('div');
            this.dotsContainer.style.cssText = 'display: flex; align-items: center; gap: 4px;';
            this.dotsContainer.innerHTML = `
                <span class="three-bubble-dot" style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 6px #00e5ff; display: inline-block; animation: threeDotPulse 1.4s infinite ease-in-out 0s;"></span>
                <span class="three-bubble-dot" style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 6px #00e5ff; display: inline-block; animation: threeDotPulse 1.4s infinite ease-in-out 0.2s;"></span>
                <span class="three-bubble-dot" style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff; box-shadow: 0 0 6px #00e5ff; display: inline-block; animation: threeDotPulse 1.4s infinite ease-in-out 0.4s;"></span>
            `;
            this.messageBubble.appendChild(this.dotsContainer);

            // Message text label (auto-wrapping, never clipped)
            this.bubbleLabel = document.createElement('span');
            this.bubbleLabel.style.cssText = `
                display: none;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11px;
                font-weight: 700;
                color: #e0f7ff;
                white-space: normal;
                word-break: break-word;
                letter-spacing: 0.3px;
                margin-left: 2px;
                max-width: 280px;
            `;
            this.messageBubble.appendChild(this.bubbleLabel);

            // --- FULL THINKING THOUGHT PROCESS CARD ---
            // Displays the entire thought process text without clipping, and auto-lowers when near top edge
            this.thoughtCard = document.createElement('div');
            this.thoughtCard.className = 'three-ai-thought-card';
            this.thoughtCard.style.cssText = `
                position: absolute;
                top: 4px;
                left: calc(100% + 10px);
                min-width: 220px;
                max-width: 380px;
                background: linear-gradient(135deg, rgba(8, 22, 54, 0.96), rgba(4, 12, 32, 0.96));
                border: 1.5px solid rgba(0, 229, 255, 0.85);
                box-shadow: 0 0 24px rgba(0, 229, 255, 0.45), 0 8px 30px rgba(0, 0, 0, 0.8);
                border-radius: 14px;
                padding: 10px 14px;
                z-index: 20;
                pointer-events: auto;
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, top 0.25s ease;
                display: none;
                flex-direction: column;
                gap: 6px;
                backdrop-filter: blur(12px);
            `;

            const thoughtHeader = document.createElement('div');
            thoughtHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px;';
            thoughtHeader.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 13px;">🧠</span>
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 900; letter-spacing: 0.8px; color: #00f0ff;">THINKING PROCESS</span>
                </div>
                <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: #00e5ff; box-shadow: 0 0 6px #00e5ff; animation: threeDotPulse 1.2s infinite ease-in-out;"></span>
                </div>
            `;
            this.thoughtCard.appendChild(thoughtHeader);

            this.thoughtText = document.createElement('div');
            this.thoughtText.style.cssText = `
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11.5px;
                line-height: 1.45;
                font-weight: 500;
                color: #e2f4ff;
                white-space: normal;
                word-break: break-word;
            `;
            this.thoughtCard.appendChild(this.thoughtText);
            this.wrapper.appendChild(this.thoughtCard);

            // Options container (compact, snug pills directly below the bubble)
            this.optionsRow = document.createElement('div');
            this.optionsRow.className = 'three-ai-options-row';
            this.optionsRow.style.cssText = `
                position: absolute;
                top: 36px;
                right: -16px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                z-index: 10;
                pointer-events: auto;
            `;
            this.wrapper.appendChild(this.optionsRow);
            this.wrapper.appendChild(this.messageBubble);

            const targetParent = this.options.container || document.body;
            targetParent.appendChild(this.wrapper);

            if (!this.options.showBubble) {
                this.messageBubble.style.display = 'none';
            }

            // Default position if not following cursor
            if (!this.options.cursorFollow && !this.options.container) {
                this.wrapper.style.right = '28px';
                this.wrapper.style.bottom = '28px';
                this.wrapper.style.left = 'auto';
                this.wrapper.style.top = 'auto';
            }
        }

        initThree() {
            const width = this.options.size;
            const height = this.options.size;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
            this.camera.position.set(0, 0, 4.3);

            this.renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            this.canvasContainer.appendChild(this.renderer.domElement);

            // Lighting setup for glossy 3D aesthetic
            const ambient = new THREE.AmbientLight(0x28456c, 1.4);
            this.scene.add(ambient);

            // Main key light from top-right
            const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
            dirLight.position.set(2.8, 4.5, 3.8);
            this.scene.add(dirLight);

            // Intense cyan rim backlight
            this.cyanBacklight = new THREE.PointLight(0x00e5ff, 3.2, 10);
            this.cyanBacklight.position.set(0, 0.1, -1.8);
            this.scene.add(this.cyanBacklight);

            // Front fill light
            const frontFill = new THREE.PointLight(0x38bdf8, 1.2, 7);
            frontFill.position.set(-2.2, -1.2, 2.6);
            this.scene.add(frontFill);

            // Root Avatar Group
            this.avatarGroup = new THREE.Group();
            this.scene.add(this.avatarGroup);

            // 1. Glossy White Spherical Robot Helmet
            const helmetGeo = new THREE.SphereGeometry(1.0, 48, 48);
            helmetGeo.scale(1.08, 0.98, 1.0);

            this.helmetMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.14,
                metalness: 0.05,
                clearcoat: 1.0,
                clearcoatRoughness: 0.08,
                reflectivity: 0.95
            });

            this.helmet = new THREE.Mesh(helmetGeo, this.helmetMaterial);
            this.avatarGroup.add(this.helmet);

            // 2. Dark Curved Glossy Visor Screen
            this.initFaceCanvas();

            const visorGeo = new THREE.SphereGeometry(0.86, 36, 36);
            visorGeo.scale(1.02, 0.88, 0.65);
            visorGeo.translate(0, -0.04, 0.44);

            this.visorMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x050a18,
                roughness: 0.08,
                metalness: 0.25,
                clearcoat: 1.0,
                map: this.faceTexture,
                emissiveMap: this.faceTexture,
                emissive: 0xffffff,
                emissiveIntensity: 1.25
            });

            this.visor = new THREE.Mesh(visorGeo, this.visorMaterial);
            this.avatarGroup.add(this.visor);

            // 3. Side Ear-Pods / Headphones (Cylinders with glowing cyan inner rings)
            this.earGroup = new THREE.Group();

            const earMat = new THREE.MeshPhysicalMaterial({
                color: 0xf5f8ff,
                roughness: 0.15,
                metalness: 0.08,
                clearcoat: 1.0
            });

            const earRingMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 2.0
            });

            const earGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.16, 32);
            earGeo.rotateZ(Math.PI / 2);

            // Left Ear-Pod
            const leftEar = new THREE.Mesh(earGeo, earMat);
            leftEar.position.set(-1.12, 0.01, 0.04);
            const leftEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 16, 32), earRingMat);
            leftEarRing.rotation.y = Math.PI / 2;
            leftEarRing.position.set(-1.21, 0.01, 0.04);
            this.earGroup.add(leftEar);
            this.earGroup.add(leftEarRing);

            // Right Ear-Pod
            const rightEar = new THREE.Mesh(earGeo, earMat);
            rightEar.position.set(1.12, 0.01, 0.04);
            const rightEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 16, 32), earRingMat);
            rightEarRing.rotation.y = Math.PI / 2;
            rightEarRing.position.set(1.21, 0.01, 0.04);
            this.earGroup.add(rightEar);
            this.earGroup.add(rightEarRing);

            this.avatarGroup.add(this.earGroup);

            // 4. Centered Top Antenna with Glowing Ball
            const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.30, 16);
            stemGeo.translate(0, 1.12, 0);
            const stem = new THREE.Mesh(stemGeo, earMat);
            this.avatarGroup.add(stem);

            const tipGeo = new THREE.SphereGeometry(0.13, 24, 24);
            tipGeo.translate(0, 1.30, 0);
            this.tipMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 2.6
            });
            this.tipOrb = new THREE.Mesh(tipGeo, this.tipMat);
            this.avatarGroup.add(this.tipOrb);

            // 5. Outer Circular Halo Ring & Spinning Loading Arcs
            this.haloGroup = new THREE.Group();
            this.scene.add(this.haloGroup);

            // Base Full Neon Halo Ring (Active in Idle and Completed)
            const haloGeo = new THREE.TorusGeometry(1.48, 0.045, 16, 120);
            this.haloMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00b4d8,
                emissiveIntensity: 1.8,
                transparent: true,
                opacity: 0.95
            });
            this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
            this.haloGroup.add(this.haloMesh);

            // Spinning Crescent Loading Arc 1 (Top-Right Arc)
            const arc1Geo = new THREE.TorusGeometry(1.54, 0.075, 16, 60, Math.PI * 0.75);
            this.arcMat = new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 3.2,
                transparent: true,
                opacity: 0
            });
            this.arc1Mesh = new THREE.Mesh(arc1Geo, this.arcMat);
            this.haloGroup.add(this.arc1Mesh);

            // Spinning Crescent Loading Arc 2 (Bottom-Left Arc)
            const arc2Geo = new THREE.TorusGeometry(1.54, 0.075, 16, 60, Math.PI * 0.75);
            arc2Geo.rotateZ(Math.PI);
            this.arc2Mesh = new THREE.Mesh(arc2Geo, this.arcMat);
            this.haloGroup.add(this.arc2Mesh);

            // Orbiting Curved Motion Arrow (State Generating)
            const arrowGeo = new THREE.TorusGeometry(1.65, 0.05, 16, 40, Math.PI * 0.65);
            arrowGeo.rotateX(Math.PI / 4.5);
            this.arrowMesh = new THREE.Mesh(arrowGeo, this.arcMat);
            this.arrowMesh.visible = false;
            this.haloGroup.add(this.arrowMesh);
        }

        initFaceCanvas() {
            this.faceCanvas = document.createElement('canvas');
            this.faceCanvas.width = 512;
            this.faceCanvas.height = 512;
            this.faceCtx = this.faceCanvas.getContext('2d');

            this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
            this.faceTexture.generateMipmaps = true;
            this.faceTexture.minFilter = THREE.LinearMipmapLinearFilter;
            this.faceTexture.magFilter = THREE.LinearFilter;

            this.renderFaceTexture();
        }

        renderFaceTexture() {
            const ctx = this.faceCtx;
            const w = 512;
            const h = 512;

            // Deep obsidian visor backdrop
            ctx.fillStyle = '#050a18';
            ctx.fillRect(0, 0, w, h);

            // Soft cyan radial visor glow
            const bgGrad = ctx.createRadialGradient(w / 2, h / 2 - 10, 30, w / 2, h / 2 - 10, 240);
            bgGrad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
            bgGrad.addColorStop(0.7, 'rgba(0, 119, 254, 0.08)');
            bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.translate(w / 2, h / 2 - 10);

            const eyeDist = 90;
            const eyeY = -12;
            const eyeRadius = 36; // Equal radii for a 100% PERFECT geometric circle
            const eyeRadiusX = eyeRadius;
            const eyeRadiusY = eyeRadius;
            const isLoadingState = (this.state === 'thinking' || this.state === 'loading');
            const blinkScale = isLoadingState ? 1 : (1 - this.blinkProgress * 0.92);

            // 1. Eye-Originating Loading Animation
            // Concentric radiant waves and scanner arcs pulse directly outward from both eye pupils!
            if (isLoadingState) {
                const drawEyeLoadingRipples = (cx, cy) => {
                    ctx.save();
                    // 3 expanding concentric radiant waves originating from pupil center
                    for (let i = 0; i < 3; i++) {
                        const phase = ((this.time * 1.6) + i * 0.33) % 1.0;
                        const radius = 18 + phase * 64; // Emanates outward from pupil
                        const alpha = Math.sin(phase * Math.PI) * 0.85; // Fades as it expands
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(0, 245, 255, ${alpha.toFixed(2)})`;
                        ctx.lineWidth = 3.5 * (1 - phase * 0.4);
                        ctx.shadowColor = '#00f5ff';
                        ctx.shadowBlur = 18;
                        ctx.stroke();
                    }

                    // Rotating energy scanner arcs centered at the eye
                    const spinAngle = this.time * 4.2;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 48, spinAngle, spinAngle + Math.PI * 0.8);
                    ctx.strokeStyle = 'rgba(0, 245, 255, 0.75)';
                    ctx.lineWidth = 3.0;
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 14;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(cx, cy, 48, spinAngle + Math.PI, spinAngle + Math.PI * 1.8);
                    ctx.strokeStyle = 'rgba(112, 225, 255, 0.55)';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                    ctx.restore();
                };

                drawEyeLoadingRipples(-eyeDist, eyeY);
                drawEyeLoadingRipples(eyeDist, eyeY);
            }

            // 2. Glowing Eyes with Blinking Across All States
            const drawEye = (x, y) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(1, blinkScale);

                // Eye Cyan Aura
                ctx.shadowColor = '#00f5ff';
                ctx.shadowBlur = 32;

                // Eye Gradient
                const eyeGrad = ctx.createRadialGradient(-6, -10, 4, 0, 0, eyeRadius);
                eyeGrad.addColorStop(0, '#ffffff');
                eyeGrad.addColorStop(0.3, '#70e1ff');
                eyeGrad.addColorStop(0.75, '#00b4d8');
                eyeGrad.addColorStop(1, '#005f99');

                ctx.fillStyle = eyeGrad;
                ctx.beginPath();
                ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
                ctx.fill();

                // Pupil (Deep Cyan) - Perfect Circle
                ctx.fillStyle = '#05182e';
                ctx.beginPath();
                ctx.arc(2, 2, eyeRadius * 0.54, 0, Math.PI * 2);
                ctx.fill();

                // Primary Catchlight (Upper Left)
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(-9, -15, 9.5, 0, Math.PI * 2);
                ctx.fill();

                // Secondary Catchlight (Lower Right)
                ctx.beginPath();
                ctx.arc(9, 11, 4.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            };

            drawEye(-eyeDist, eyeY);
            drawEye(eyeDist, eyeY);

            // 3. Fluid, Perfectly Aligned Mouth Animations (No Awkward Angles or Distortions)
            ctx.save();
            ctx.strokeStyle = '#00f5ff';
            ctx.lineWidth = 13;
            ctx.lineCap = 'round';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 22;

            if (this.state === 'completed') {
                // Wide joyful smile
                ctx.beginPath();
                ctx.arc(0, 48, 38, Math.PI * 0.10, Math.PI * 0.90, false);
                ctx.stroke();
            } else if (isLoadingState) {
                // Focused cute smile
                ctx.beginPath();
                ctx.arc(0, 50, 26, Math.PI * 0.16, Math.PI * 0.84, false);
                ctx.stroke();
            } else if (this.state === 'generating') {
                // Gentle animated talking/calculating movement without distortions
                const mouthMod = Math.sin(this.time * 5.5) * 4;
                ctx.beginPath();
                ctx.arc(0, 50 + mouthMod * 0.3, 28 - mouthMod * 0.2, Math.PI * 0.15, Math.PI * 0.85, false);
                ctx.stroke();
            } else {
                // Idle friendly gentle smile
                ctx.beginPath();
                ctx.arc(0, 50, 30, Math.PI * 0.14, Math.PI * 0.86, false);
                ctx.stroke();
            }
            ctx.restore();

            ctx.restore();
            this.faceTexture.needsUpdate = true;
        }

        initEvents() {
            window.addEventListener('mousemove', (e) => {
                this.cursorX = e.clientX + this.options.cursorOffset.x;
                this.cursorY = e.clientY + this.options.cursorOffset.y;

                // Viewport collision and auto-lowering checks
                this.adjustViewportLayout();
            }, { passive: true });

            // Click avatar toggles bubble message
            this.canvasContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.thoughtCard.style.display === 'flex') {
                    this.thoughtCard.style.display = 'none';
                    this.messageBubble.style.display = 'flex';
                } else if (this.bubbleLabel.style.display === 'inline') {
                    this.bubbleLabel.style.display = 'none';
                    this.dotsContainer.style.display = 'flex';
                } else {
                    this.showMessage(this.currentMessage || 'AI Ready');
                }
            });
        }

        /**
         * Dynamic auto-lowering: If cursor is near top of screen (cursorY < 180),
         * drops the thought card & bubble below the avatar so thought text is 100% visible and never cut off
         */
        adjustViewportLayout() {
            const isNearTop = this.currentY < 180;
            const isNearRight = (this.currentX + this.options.size + 400) > window.innerWidth;

            // Vertical positioning: drop down lower when near top of screen
            if (isNearTop) {
                const lowerTop = (this.options.size + 10) + 'px';
                this.thoughtCard.style.top = lowerTop;
                this.thoughtCard.style.bottom = 'auto';
                this.optionsRow.style.top = lowerTop;
                this.messageBubble.style.top = (this.options.size + 8) + 'px';
            } else {
                this.thoughtCard.style.top = '-6px';
                this.thoughtCard.style.bottom = 'auto';
                this.optionsRow.style.top = '36px';
                this.messageBubble.style.top = '4px';
            }

            // Horizontal positioning: shift to left if near right edge
            if (isNearRight) {
                this.thoughtCard.style.left = 'auto';
                this.thoughtCard.style.right = (this.options.size + 12) + 'px';
                this.messageBubble.style.right = 'auto';
                this.messageBubble.style.left = '-12px';
                this.optionsRow.style.right = 'auto';
                this.optionsRow.style.left = '-16px';
            } else {
                this.thoughtCard.style.right = 'auto';
                this.thoughtCard.style.left = 'calc(100% + 10px)';
                this.messageBubble.style.left = 'auto';
                this.messageBubble.style.right = '-12px';
                this.optionsRow.style.left = 'auto';
                this.optionsRow.style.right = '-16px';
            }
        }

        setState(newState, message = null) {
            this.state = newState;

            switch (newState) {
                case 'idle':
                    this.targetRotationY = 0;
                    this.haloMesh.visible = true;
                    this.arcMat.opacity = 0;
                    this.arrowMesh.visible = false;
                    this.haloMat.emissiveIntensity = 1.8;
                    this.tipMat.emissiveIntensity = 2.4;
                    this.hideThinkingThought();
                    this.showMessage(message || '');
                    break;

                case 'thinking':
                case 'loading':
                    // Eye-originating loading animation & rotation effect
                    this.targetRotationY = 0;
                    this.haloMesh.visible = false;
                    this.arcMat.opacity = 1.0;
                    this.arrowMesh.visible = false;
                    this.haloMat.emissiveIntensity = 2.8;
                    this.tipMat.emissiveIntensity = 3.2;

                    // Display full unclipped thought process text
                    const thought = message || this.currentMessage || 'Analyzing instructions and planning next optimal step...';
                    this.showThinkingThought(thought);
                    break;

                case 'generating':
                    // Continuous 3D rotation, curved motion arrow
                    this.haloMesh.visible = false;
                    this.arcMat.opacity = 0.9;
                    this.arrowMesh.visible = true;
                    this.haloMat.emissiveIntensity = 3.0;
                    this.tipMat.emissiveIntensity = 3.6;
                    this.hideThinkingThought();
                    this.showMessage(message || '');
                    break;

                case 'completed':
                    // De-rotate back to front, restore full glowing halo, display completion message
                    this.targetRotationY = Math.round(this.currentRotationY / (Math.PI * 2)) * (Math.PI * 2);
                    this.haloMesh.visible = true;
                    this.arcMat.opacity = 0;
                    this.arrowMesh.visible = false;
                    this.haloMat.emissiveIntensity = 2.2;
                    this.tipMat.emissiveIntensity = 2.8;
                    this.hideThinkingThought();
                    this.showMessage(message || 'Completed! ✨', 4500);
                    break;
            }

            this.renderFaceTexture();
        }

        /**
         * Displays the complete thought process in the dedicated thought card
         * Guaranteed 100% visible, fully wrapped, never cut off
         */
        showThinkingThought(text) {
            this.thinkingThought = text;
            this.thoughtText.textContent = text;
            this.thoughtCard.style.display = 'flex';
            this.thoughtCard.style.opacity = '1';
            this.messageBubble.style.display = 'none';
            this.adjustViewportLayout();
        }

        hideThinkingThought() {
            this.thoughtCard.style.display = 'none';
            if (this.options.showBubble) {
                this.messageBubble.style.display = 'flex';
            }
        }

        showMessage(text = '', autoHideMs = 0) {
            this.currentMessage = text;

            if (text && text.trim().length > 0) {
                this.bubbleLabel.textContent = text;
                this.bubbleLabel.style.display = 'inline';
                this.dotsContainer.style.display = 'none';
            } else {
                this.bubbleLabel.style.display = 'none';
                this.dotsContainer.style.display = 'flex';
            }

            this.messageBubble.style.opacity = '1';
            this.messageBubble.style.transform = 'scale(1)';

            if (this.hideTimeout) clearTimeout(this.hideTimeout);

            if (autoHideMs > 0) {
                this.hideTimeout = setTimeout(() => {
                    this.bubbleLabel.style.display = 'none';
                    this.dotsContainer.style.display = 'flex';
                }, autoHideMs);
            }

            this.adjustViewportLayout();
        }

        /**
         * Sets snug option pills directly beside the cursor
         */
        setContentOptions(optionsList = []) {
            this.optionsRow.innerHTML = '';
            if (!optionsList || optionsList.length === 0) return;

            optionsList.forEach(opt => {
                const btn = document.createElement('button');
                btn.textContent = opt.label;
                btn.style.cssText = `
                    background: ${opt.primary ? 'linear-gradient(135deg, #00d2ff, #0077fe)' : 'rgba(10, 24, 60, 0.9)'};
                    color: #ffffff;
                    border: 1px solid ${opt.primary ? '#70e1ff' : 'rgba(0, 229, 255, 0.5)'};
                    box-shadow: 0 0 10px rgba(0, 229, 255, 0.35);
                    border-radius: 8px;
                    padding: 3px 8px;
                    font-size: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    outline: none;
                `;
                btn.onmouseenter = () => {
                    btn.style.transform = 'scale(1.06)';
                    btn.style.boxShadow = '0 0 14px rgba(0, 229, 255, 0.7)';
                };
                btn.onmouseleave = () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.35)';
                };
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof this.options.onActionClick === 'function') {
                        this.options.onActionClick(opt.actionId || opt.label, opt);
                    }
                };
                this.optionsRow.appendChild(btn);
            });
        }

        setCursorFollow(enabled, offset = null) {
            this.isCursorFollowing = enabled;
            if (offset) this.options.cursorOffset = offset;

            if (!enabled && !this.options.container) {
                this.wrapper.style.right = '28px';
                this.wrapper.style.bottom = '28px';
                this.wrapper.style.left = 'auto';
                this.wrapper.style.top = 'auto';
            }
        }

        animate() {
            this.rafId = requestAnimationFrame(() => this.animate());

            const delta = this.clock.getDelta();
            this.time += delta;

            // 1. Natural Blinking across ALL states (including loading/thinking)
            this.blinkTimer += delta;
            if (this.blinkTimer > 3.4) {
                const phase = this.blinkTimer - 3.4;
                if (phase < 0.15) {
                    this.blinkProgress = Math.sin((phase / 0.15) * Math.PI);
                    this.renderFaceTexture();
                } else {
                    this.blinkProgress = 0;
                    this.blinkTimer = 0;
                    this.renderFaceTexture();
                }
            }

            // 2. Continual eye ripples & mouth movement in loading/thinking/generating states
            const isLoadingState = (this.state === 'thinking' || this.state === 'loading');
            if (isLoadingState || this.state === 'generating') {
                this.renderFaceTexture();
            }

            // 3. Subtle Floating Bob
            if (this.options.floating) {
                const bobOffset = Math.sin(this.time * 2.2) * 0.08;
                this.avatarGroup.position.y = bobOffset;
                this.haloGroup.position.y = bobOffset;
            }

            // 4. Smooth State Rotation Dynamics
            if (this.state === 'generating') {
                // Continuous 3D vertical Y-axis rotation
                this.currentRotationY += this.rotationSpeedY;
                this.avatarGroup.rotation.y = this.currentRotationY;

                // Subtle realistic 3D pitch/roll
                this.avatarGroup.rotation.x = Math.sin(this.time * 1.8) * 0.05;
                this.avatarGroup.rotation.z = Math.cos(this.time * 1.8) * 0.04;

                // Orbiting motion ring
                this.arrowMesh.rotation.y += 0.07;
                this.arc1Mesh.rotation.z -= 0.08;
                this.arc2Mesh.rotation.z -= 0.08;

            } else if (isLoadingState) {
                // Smooth 3D rotation effect during loading
                this.currentRotationY += 0.038;
                this.avatarGroup.rotation.y = this.currentRotationY;
                this.avatarGroup.rotation.x = Math.sin(this.time * 2.0) * 0.04;
                this.avatarGroup.rotation.z = Math.cos(this.time * 1.6) * 0.03;

                // Spinning outer crescent loading arcs
                this.arc1Mesh.rotation.z -= 0.10;
                this.arc2Mesh.rotation.z -= 0.10;

            } else if (this.state === 'completed') {
                // Smooth de-rotation to front facing
                this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.14;
                this.avatarGroup.rotation.y = this.currentRotationY;
                this.avatarGroup.rotation.x *= 0.88;
                this.avatarGroup.rotation.z *= 0.88;

            } else {
                // Idle: smooth front facing
                this.currentRotationY += (0 - this.currentRotationY) * 0.12;
                this.avatarGroup.rotation.y = this.currentRotationY;
                this.avatarGroup.rotation.x = Math.sin(this.time * 1.4) * 0.03;
                this.avatarGroup.rotation.z = 0;

                this.haloMesh.rotation.z += 0.005;
            }

            // 5. Snug Cursor Follow Physics
            if (this.isCursorFollowing) {
                this.currentX += (this.cursorX - this.currentX) * 0.22;
                this.currentY += (this.cursorY - this.currentY) * 0.22;

                this.wrapper.style.left = `${this.currentX}px`;
                this.wrapper.style.top = `${this.currentY}px`;
                this.wrapper.style.right = 'auto';
                this.wrapper.style.bottom = 'auto';

                this.adjustViewportLayout();
            }

            this.renderer.render(this.scene, this.camera);
        }

        destroy() {
            if (window.__CDZ48_ACTIVE_FLOATING_AVATAR__ === this) {
                window.__CDZ48_ACTIVE_FLOATING_AVATAR__ = null;
            }
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.removeChild(this.wrapper);
            }
            if (this.renderer) {
                this.renderer.dispose();
            }
        }
    }

    return ThreeAiAssistant;
}));
