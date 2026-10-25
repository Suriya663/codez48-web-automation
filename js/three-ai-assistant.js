/**
 * Codez48 - 3D Floating AI Assistant Avatar
 * Genuine 3D WebGL implementation using Three.js
 * 
 * Features:
 * - Glossy pearl-white helmet with PBR physical materials
 * - Dark curved visor with dynamic 60 FPS animated procedural canvas face
 * - Expressive glowing cyan eyes (open, blinking, cute curved sleeping/thinking, happy sparkles)
 * - Animated smiling mouth
 * - Top antenna with glowing cyan orb and side headphone pods
 * - Glowing 3D circular neon halo with orbiting loading arc
 * - Animation states:
 *    1. Idle: subtle floating bob, natural blinking, gentle smile
 *    2. Thinking: closed eyes (︶ ︶), spinning circular loading ring
 *    3. Generating: smooth continuous 3D rotation around Y-axis, orbiting particle ring
 *    4. Completed: smooth de-rotation back to front view, happy smile, message bubble
 * - Snug cursor-following mode with immediate proximity (no distant drift)
 * - Message bubble with customizable text and clear action options
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
        console.error('[ThreeAiAssistant] THREE is not loaded. Please include three.min.js.');
        return null;
    }

    class ThreeAiAssistant {
        constructor(options = {}) {
            this.options = Object.assign({
                container: null,
                size: 96,                 // avatar diameter in pixels
                initialState: 'idle',     // 'idle' | 'thinking' | 'generating' | 'completed'
                initialMessage: 'AI Ready',
                cursorFollow: false,      // follow mouse cursor
                cursorOffset: { x: 8, y: 6 }, // snug cursor offset (immediately adjacent)
                floating: true,           // subtle floating bobbing animation
                autoHideMessageMs: 0,     // 0 = keep open until changed
                onActionClick: null       // callback when content/action options are clicked
            }, options);

            this.state = this.options.initialState;
            this.targetRotationY = 0;
            this.currentRotationY = 0;
            this.rotationSpeedY = 0.055;
            this.blinkTimer = 0;
            this.blinkProgress = 0; // 0 = open, 1 = closed
            this.clock = new THREE.Clock();
            this.time = 0;

            // Positioning
            this.cursorX = window.innerWidth / 2;
            this.cursorY = window.innerHeight / 2;
            this.currentX = this.cursorX;
            this.currentY = this.cursorY;
            this.isCursorFollowing = this.options.cursorFollow;

            this.initDOM();
            this.initThree();
            this.initEvents();
            this.setState(this.state, this.options.initialMessage);
            this.animate();
        }

        initDOM() {
            // Main container wrapper
            this.wrapper = document.createElement('div');
            this.wrapper.className = 'three-ai-assistant-wrapper';
            this.wrapper.style.cssText = `
                position: fixed;
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
            `;

            // Canvas container
            this.canvasContainer = document.createElement('div');
            this.canvasContainer.style.cssText = `
                width: 100%;
                height: 100%;
                position: relative;
                pointer-events: auto;
                cursor: grab;
                filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.45));
            `;
            this.wrapper.appendChild(this.canvasContainer);

            // Message Bubble Element (Compact, sleek, glassmorphic pill immediately beside avatar)
            this.messageBubble = document.createElement('div');
            this.messageBubble.className = 'three-ai-assistant-bubble';
            this.messageBubble.style.cssText = `
                position: absolute;
                left: ${this.options.size - 6}px;
                top: 2px;
                background: rgba(10, 17, 40, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(0, 229, 255, 0.5);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 229, 255, 0.3);
                border-radius: 14px;
                padding: 6px 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11.5px;
                font-weight: 500;
                color: #e0f7ff;
                white-space: nowrap;
                pointer-events: auto;
                opacity: 0;
                transform: scale(0.85) translate3d(0, 4px, 0);
                transform-origin: left center;
                transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                align-items: center;
                gap: 8px;
                max-width: 260px;
                z-index: 10;
            `;

            this.bubbleText = document.createElement('span');
            this.bubbleText.textContent = this.options.initialMessage || 'AI Ready';
            this.messageBubble.appendChild(this.bubbleText);

            // Quick Content / Action Option Container (for clear visibility near cursor)
            this.optionsContainer = document.createElement('div');
            this.optionsContainer.className = 'three-ai-assistant-options';
            this.optionsContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                margin-left: 2px;
            `;
            this.messageBubble.appendChild(this.optionsContainer);

            this.wrapper.appendChild(this.messageBubble);

            const targetParent = this.options.container || document.body;
            targetParent.appendChild(this.wrapper);

            // Position initially
            if (!this.options.cursorFollow) {
                this.wrapper.style.right = '24px';
                this.wrapper.style.bottom = '24px';
                this.wrapper.style.left = 'auto';
                this.wrapper.style.top = 'auto';
            }
        }

        initThree() {
            const width = this.options.size;
            const height = this.options.size;

            // Scene & Camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
            this.camera.position.set(0, 0, 4.2);

            // WebGL Renderer
            this.renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.15;
            this.canvasContainer.appendChild(this.renderer.domElement);

            // Lighting
            const ambient = new THREE.AmbientLight(0x2c4a75, 1.3);
            this.scene.add(ambient);

            const dirLight = new THREE.DirectionalLight(0xe0f7ff, 2.0);
            dirLight.position.set(2.5, 4.0, 3.5);
            this.scene.add(dirLight);

            this.cyanRimLight = new THREE.PointLight(0x00e5ff, 2.6, 9);
            this.cyanRimLight.position.set(0, 0.2, -1.6);
            this.scene.add(this.cyanRimLight);

            const frontFill = new THREE.PointLight(0x38bdf8, 1.4, 6);
            frontFill.position.set(-2, -1, 2.5);
            this.scene.add(frontFill);

            // Root Avatar Group
            this.avatarGroup = new THREE.Group();
            this.scene.add(this.avatarGroup);

            // 1. Glossy White Helmet / Head
            const headGeo = new THREE.SphereGeometry(1.0, 48, 48);
            headGeo.scale(1.08, 0.98, 1.0); // Cute proportions

            this.helmetMaterial = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.12,
                metalness: 0.04,
                clearcoat: 1.0,
                clearcoatRoughness: 0.08,
                reflectivity: 0.92
            });

            this.helmet = new THREE.Mesh(headGeo, this.helmetMaterial);
            this.avatarGroup.add(this.helmet);

            // 2. Visor Screen with Dynamic Canvas Texture Face
            this.initFaceCanvas();

            const visorGeo = new THREE.SphereGeometry(0.86, 36, 36);
            visorGeo.scale(1.02, 0.88, 0.65);
            visorGeo.translate(0, -0.04, 0.44);

            this.visorMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x050814,
                roughness: 0.08,
                metalness: 0.2,
                clearcoat: 1.0,
                map: this.faceTexture,
                emissiveMap: this.faceTexture,
                emissive: 0xffffff,
                emissiveIntensity: 1.2
            });

            this.visor = new THREE.Mesh(visorGeo, this.visorMaterial);
            this.avatarGroup.add(this.visor);

            // 3. Side Ear-Pods (Left and Right)
            this.earGroup = new THREE.Group();
            const earGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 32);
            earGeo.rotateZ(Math.PI / 2);

            const earMat = new THREE.MeshPhysicalMaterial({
                color: 0xf5f8ff,
                roughness: 0.15,
                metalness: 0.1,
                clearcoat: 1.0
            });

            const earRingMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 1.6
            });

            // Left Ear
            const leftEar = new THREE.Mesh(earGeo, earMat);
            leftEar.position.set(-1.12, 0.02, 0.04);
            const leftEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 16, 32), earRingMat);
            leftEarRing.rotation.y = Math.PI / 2;
            leftEarRing.position.set(-1.21, 0.02, 0.04);
            this.earGroup.add(leftEar);
            this.earGroup.add(leftEarRing);

            // Right Ear
            const rightEar = new THREE.Mesh(earGeo, earMat);
            rightEar.position.set(1.12, 0.02, 0.04);
            const rightEarRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 16, 32), earRingMat);
            rightEarRing.rotation.y = Math.PI / 2;
            rightEarRing.position.set(1.21, 0.02, 0.04);
            this.earGroup.add(rightEar);
            this.earGroup.add(rightEarRing);

            this.avatarGroup.add(this.earGroup);

            // 4. Top Antenna with Glowing Tip
            const stemGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.32, 16);
            stemGeo.translate(0, 1.12, 0);
            const stem = new THREE.Mesh(stemGeo, earMat);
            this.avatarGroup.add(stem);

            const tipGeo = new THREE.SphereGeometry(0.13, 24, 24);
            tipGeo.translate(0, 1.32, 0);
            this.tipMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 2.2
            });
            this.tipOrb = new THREE.Mesh(tipGeo, this.tipMat);
            this.avatarGroup.add(this.tipOrb);

            // 5. Outer 3D Halo Ring & Rotating Loading Arc
            this.haloGroup = new THREE.Group();
            this.scene.add(this.haloGroup);

            // Base Halo Ring
            const haloGeo = new THREE.TorusGeometry(1.48, 0.042, 16, 120);
            this.haloMat = new THREE.MeshStandardMaterial({
                color: 0x00e5ff,
                emissive: 0x00b4d8,
                emissiveIntensity: 1.4,
                transparent: true,
                opacity: 0.85
            });
            this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
            this.haloGroup.add(this.haloMesh);

            // Spinning Loading Arc (Visible in Thinking & Generating states)
            const arcGeo = new THREE.TorusGeometry(1.58, 0.065, 16, 60, Math.PI * 0.9);
            this.arcMat = new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 2.8,
                transparent: true,
                opacity: 0
            });
            this.arcMesh = new THREE.Mesh(arcGeo, this.arcMat);
            this.haloGroup.add(this.arcMesh);

            // Secondary Orbiting Arc for Generating state
            const arc2Geo = new THREE.TorusGeometry(1.68, 0.04, 16, 40, Math.PI * 0.5);
            arc2Geo.rotateX(Math.PI / 4);
            this.arc2Mesh = new THREE.Mesh(arc2Geo, this.arcMat);
            this.arc2Mesh.visible = false;
            this.haloGroup.add(this.arc2Mesh);
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

            // Clear black visor canvas
            ctx.fillStyle = '#060a16';
            ctx.fillRect(0, 0, w, h);

            // Subtle dark cyan gradient backdrop
            const bgGrad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, 220);
            bgGrad.addColorStop(0, 'rgba(0, 180, 255, 0.15)');
            bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.translate(w / 2, h / 2 - 10);

            // Eye Parameters
            const eyeDistance = 90;
            const eyeY = -15;
            const eyeRadiusX = 32;
            const eyeRadiusY = 44;

            // State specific facial rendering
            if (this.state === 'thinking') {
                // Closed Cute Curved Eyes (︶ ︶)
                ctx.strokeStyle = '#00f5ff';
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 24;

                // Left curved eye
                ctx.beginPath();
                ctx.arc(-eyeDistance, eyeY + 12, 28, Math.PI * 0.15, Math.PI * 0.85, false);
                ctx.stroke();

                // Right curved eye
                ctx.beginPath();
                ctx.arc(eyeDistance, eyeY + 12, 28, Math.PI * 0.15, Math.PI * 0.85, false);
                ctx.stroke();

                // Gentle calm smile
                ctx.beginPath();
                ctx.arc(0, 52, 24, Math.PI * 0.18, Math.PI * 0.82, false);
                ctx.stroke();

            } else {
                // Open Expressive Eyes (Idle, Generating, Completed)
                const blinkScale = 1 - this.blinkProgress * 0.92;

                const drawEye = (x, y) => {
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.scale(1, blinkScale);

                    // Outer Eye Cyan Glow
                    ctx.shadowColor = '#00f5ff';
                    ctx.shadowBlur = 28;

                    // Eye Outer Shape
                    const eyeGrad = ctx.createRadialGradient(-6, -8, 4, 0, 0, eyeRadiusY);
                    eyeGrad.addColorStop(0, '#ffffff');
                    eyeGrad.addColorStop(0.35, '#5cedff');
                    eyeGrad.addColorStop(0.85, '#00b4d8');
                    eyeGrad.addColorStop(1, '#0077b6');

                    ctx.fillStyle = eyeGrad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Pupil (Deep Cyan)
                    ctx.fillStyle = '#06182c';
                    ctx.beginPath();
                    ctx.ellipse(2, 4, eyeRadiusX * 0.52, eyeRadiusY * 0.56, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Glossy Specular Highlights (Double White Catchlights)
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 10;

                    // Main catchlight
                    ctx.beginPath();
                    ctx.arc(-8, -14, 9, 0, Math.PI * 2);
                    ctx.fill();

                    // Secondary catchlight
                    ctx.beginPath();
                    ctx.arc(8, 10, 4.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                };

                drawEye(-eyeDistance, eyeY);
                drawEye(eyeDistance, eyeY);

                // Cute Smiling Mouth
                ctx.strokeStyle = '#00f5ff';
                ctx.lineWidth = 12;
                ctx.lineCap = 'round';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 20;

                ctx.beginPath();
                if (this.state === 'completed') {
                    // Wider cheerful smile
                    ctx.arc(0, 48, 36, Math.PI * 0.12, Math.PI * 0.88, false);
                } else {
                    // Regular sweet smile
                    ctx.arc(0, 52, 28, Math.PI * 0.15, Math.PI * 0.85, false);
                }
                ctx.stroke();
            }

            ctx.restore();
            this.faceTexture.needsUpdate = true;
        }

        initEvents() {
            // Mouse tracking for snug cursor following mode
            window.addEventListener('mousemove', (e) => {
                this.cursorX = e.clientX + this.options.cursorOffset.x;
                this.cursorY = e.clientY + this.options.cursorOffset.y;

                // Keep inside screen bounds with tight edge margins
                const maxRight = window.innerWidth - this.options.size - 10;
                const maxBottom = window.innerHeight - this.options.size - 10;

                if (this.cursorX > maxRight) {
                    this.cursorX = e.clientX - this.options.size - 4;
                    // Position message bubble to left if on right edge
                    this.messageBubble.style.left = 'auto';
                    this.messageBubble.style.right = `${this.options.size - 6}px`;
                    this.messageBubble.style.transformOrigin = 'right center';
                } else {
                    this.messageBubble.style.right = 'auto';
                    this.messageBubble.style.left = `${this.options.size - 6}px`;
                    this.messageBubble.style.transformOrigin = 'left center';
                }

                if (this.cursorY > maxBottom) {
                    this.cursorY = e.clientY - this.options.size - 4;
                }
            }, { passive: true });

            // Interactive click on avatar toggles message bubble or triggers action
            this.canvasContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.messageBubble.style.opacity === '1') {
                    this.hideMessage();
                } else {
                    this.showMessage(this.currentMessage || 'Ready to assist!');
                }
            });
        }

        setState(newState, message = null) {
            this.state = newState;
            const t = this.time;

            switch (newState) {
                case 'idle':
                    this.targetRotationY = 0;
                    this.arcMat.opacity = 0;
                    this.arc2Mesh.visible = false;
                    this.haloMat.emissiveIntensity = 1.4;
                    this.tipMat.emissiveIntensity = 2.0;
                    this.showMessage(message || 'AI Ready');
                    break;

                case 'thinking':
                    this.targetRotationY = 0;
                    this.arcMat.opacity = 1;
                    this.arc2Mesh.visible = false;
                    this.haloMat.emissiveIntensity = 2.4;
                    this.tipMat.emissiveIntensity = 3.0;
                    this.showMessage(message || 'Thinking • • •');
                    break;

                case 'generating':
                    this.arcMat.opacity = 0.95;
                    this.arc2Mesh.visible = true;
                    this.haloMat.emissiveIntensity = 2.8;
                    this.tipMat.emissiveIntensity = 3.5;
                    this.showMessage(message || 'Generating solution...');
                    break;

                case 'completed':
                    // De-rotate back to zero front view smoothly
                    this.targetRotationY = Math.round(this.currentRotationY / (Math.PI * 2)) * (Math.PI * 2);
                    this.arcMat.opacity = 0;
                    this.arc2Mesh.visible = false;
                    this.haloMat.emissiveIntensity = 2.0;
                    this.tipMat.emissiveIntensity = 2.6;
                    this.showMessage(message || 'Task Completed! ✨', 5000);
                    break;
            }

            this.renderFaceTexture();
        }

        showMessage(text, autoHideMs = 0) {
            this.currentMessage = text;
            this.bubbleText.textContent = text;
            this.messageBubble.style.opacity = '1';
            this.messageBubble.style.transform = 'scale(1) translate3d(0, 0, 0)';

            if (this.hideTimeout) clearTimeout(this.hideTimeout);

            const duration = autoHideMs || this.options.autoHideMessageMs;
            if (duration > 0) {
                this.hideTimeout = setTimeout(() => {
                    this.hideMessage();
                }, duration);
            }
        }

        hideMessage() {
            this.messageBubble.style.opacity = '0';
            this.messageBubble.style.transform = 'scale(0.85) translate3d(0, 4px, 0)';
        }

        /**
         * Sets content / canteen option buttons inside the message bubble right next to the cursor
         * @param {Array<{ label: string, actionId: string, primary?: boolean }>} optionsList
         */
        setContentOptions(optionsList = []) {
            this.optionsContainer.innerHTML = '';
            if (!optionsList || optionsList.length === 0) return;

            optionsList.forEach(opt => {
                const btn = document.createElement('button');
                btn.textContent = opt.label;
                btn.style.cssText = `
                    background: ${opt.primary ? 'linear-gradient(135deg, #00d2ff, #0077fe)' : 'rgba(255, 255, 255, 0.12)'};
                    color: #ffffff;
                    border: 1px solid ${opt.primary ? '#70e1ff' : 'rgba(255, 255, 255, 0.25)'};
                    border-radius: 8px;
                    padding: 3px 8px;
                    font-size: 10.5px;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.18s ease;
                    outline: none;
                `;
                btn.onmouseenter = () => {
                    btn.style.transform = 'scale(1.05)';
                    btn.style.boxShadow = '0 0 8px rgba(0, 229, 255, 0.6)';
                };
                btn.onmouseleave = () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.boxShadow = 'none';
                };
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof this.options.onActionClick === 'function') {
                        this.options.onActionClick(opt.actionId || opt.label, opt);
                    }
                };
                this.optionsContainer.appendChild(btn);
            });

            this.messageBubble.style.opacity = '1';
            this.messageBubble.style.transform = 'scale(1) translate3d(0, 0, 0)';
        }

        setCursorFollow(enabled, offset = null) {
            this.isCursorFollowing = enabled;
            if (offset) this.options.cursorOffset = offset;

            if (!enabled) {
                this.wrapper.style.right = '24px';
                this.wrapper.style.bottom = '24px';
                this.wrapper.style.left = 'auto';
                this.wrapper.style.top = 'auto';
            }
        }

        setPosition(x, y) {
            this.currentX = x;
            this.currentY = y;
            this.wrapper.style.left = `${x}px`;
            this.wrapper.style.top = `${y}px`;
            this.wrapper.style.right = 'auto';
            this.wrapper.style.bottom = 'auto';
        }

        animate() {
            requestAnimationFrame(() => this.animate());

            const delta = this.clock.getDelta();
            this.time += delta;

            // 1. Natural Blinking Loop (every 3.6s)
            this.blinkTimer += delta;
            if (this.blinkTimer > 3.6) {
                const phase = this.blinkTimer - 3.6;
                if (phase < 0.14) {
                    this.blinkProgress = Math.sin((phase / 0.14) * Math.PI);
                    this.renderFaceTexture();
                } else {
                    this.blinkProgress = 0;
                    this.blinkTimer = 0;
                    this.renderFaceTexture();
                }
            }

            // 2. 3D Floating Bobbing Physics
            if (this.options.floating) {
                const bobOffset = Math.sin(this.time * 2.2) * 0.08;
                this.avatarGroup.position.y = bobOffset;
                this.haloGroup.position.y = bobOffset;
            }

            // 3. State Rotation & Loading Arc Animation
            if (this.state === 'generating') {
                // Continuous 3D rotation around Y-axis
                this.currentRotationY += this.rotationSpeedY;
                this.avatarGroup.rotation.y = this.currentRotationY;

                // Subtle dynamic pitch and roll tilt for realism
                this.avatarGroup.rotation.x = Math.sin(this.time * 1.8) * 0.06;
                this.avatarGroup.rotation.z = Math.cos(this.time * 1.8) * 0.04;

                // Rapid spinning halo loading arcs
                this.arcMesh.rotation.z -= 0.08;
                this.arc2Mesh.rotation.y += 0.06;

            } else if (this.state === 'thinking') {
                // Gentle swaying curious tilt
                this.avatarGroup.rotation.y = Math.sin(this.time * 2.5) * 0.15;
                this.avatarGroup.rotation.x = 0.08;
                this.avatarGroup.rotation.z = Math.sin(this.time * 2.0) * 0.05;

                // Spinning circular loading ring
                this.arcMesh.rotation.z -= 0.11;

            } else if (this.state === 'completed') {
                // Smoothly de-rotate back to front view (0 degrees)
                this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.14;
                this.avatarGroup.rotation.y = this.currentRotationY;
                this.avatarGroup.rotation.x *= 0.88;
                this.avatarGroup.rotation.z *= 0.88;

            } else {
                // Idle state: smooth return to front facing with gentle breathing
                this.currentRotationY += (0 - this.currentRotationY) * 0.12;
                this.avatarGroup.rotation.y = this.currentRotationY;
                this.avatarGroup.rotation.x = Math.sin(this.time * 1.4) * 0.03;
                this.avatarGroup.rotation.z = 0;

                // Very slow ambient halo shimmer
                this.haloMesh.rotation.z += 0.005;
            }

            // 4. Snug Cursor Spring Physics
            if (this.isCursorFollowing) {
                this.currentX += (this.cursorX - this.currentX) * 0.22;
                this.currentY += (this.cursorY - this.currentY) * 0.22;

                this.wrapper.style.left = `${this.currentX}px`;
                this.wrapper.style.top = `${this.currentY}px`;
                this.wrapper.style.right = 'auto';
                this.wrapper.style.bottom = 'auto';
            }

            // Render 3D Frame
            this.renderer.render(this.scene, this.camera);
        }

        destroy() {
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
