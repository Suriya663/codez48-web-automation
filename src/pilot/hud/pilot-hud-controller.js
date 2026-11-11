/**
 * CODEZ48 PILOT HUD CONTROLLER
 * Controls the on-screen 3D circular AI companion and floating status HUD.
 * - Follows the mouse cursor seamlessly across any screen / application
 * - Renders 3D glowing spherical avatar with blinking eyes and smiling mouth
 * - Shows "THINKING" state with orbiting halo
 * - Shows "GENERATING" state with animated moving dots (• • •)
 * - Shows "AUTOMATING" state with live task action text
 * - Click-through transparency so it never blocks user mouse clicks
 * - Gracefully hides / closes when Pilot finishes or deactivates
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../core/logger');

class PilotHudController {
    constructor() {
        this.process = null;
        this.isActive = false;
        this.currentState = 'idle';
        this.currentText = '';
        this.psScriptPath = path.join(__dirname, 'pilot-companion-overlay.ps1');
    }

    /**
     * Start the on-screen AI companion overlay
     */
    start(initialState = 'thinking', initialText = 'Codez48 Pilot Active...') {
        if (process.platform !== 'win32') return false;
        
        // Strict Singleton: If active process is already running, just update its state
        if (this.isActive && this.process && !this.process.killed) {
            this.setState(initialState, initialText);
            return true;
        }

        if (!fs.existsSync(this.psScriptPath)) {
            logger.debug(`[HUD] Overlay script not found at ${this.psScriptPath}`);
            return false;
        }

        // Clean up any lingering Codez48PilotHUD processes across Windows session before launching
        try {
            const { execSync } = require('child_process');
            execSync('powershell.exe -NoProfile -NonInteractive -Command "Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq \'Codez48PilotHUD\' } | Stop-Process -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore', timeout: 2000 });
        } catch (_) {}

        try {
            this.process = spawn('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy', 'Bypass',
                '-File', this.psScriptPath,
                '-InitialState', initialState,
                '-InitialText', initialText
            ], {
                stdio: ['pipe', 'ignore', 'ignore'],
                windowsHide: false
            });

            this.isActive = true;
            this.currentState = initialState;
            this.currentText = initialText;

            this.process.on('exit', () => {
                this.isActive = false;
                this.process = null;
            });

            this.process.on('error', () => {
                this.isActive = false;
                this.process = null;
            });

            if (this.process.stdin) {
                this.process.stdin.on('error', () => {
                    this.isActive = false;
                });
            }

            logger.status(`\x1b[35m[PILOT COMPANION HUD] Active on screen (Following cursor, 3D animated avatar & live status)\x1b[0m`);
            return true;
        } catch (err) {
            logger.debug(`[HUD ERROR] Failed to start companion: ${err.message}`);
            return false;
        }
    }

    /**
     * Send state update to companion HUD via stdin JSON pipe
     */
    setState(state, text) {
        if (!this.isActive || !this.process || !this.process.stdin || this.process.stdin.destroyed || this.process.stdin.writableEnded || !this.process.stdin.writable) {
            if (!this.isActive) this.start(state, text);
            return;
        }

        try {
            const payload = JSON.stringify({
                action: 'set_state',
                state,
                text: text || this.currentText
            }) + '\n';

            this.process.stdin.write(payload, (err) => {
                if (err) this.isActive = false;
            });
            this.currentState = state;
            if (text) this.currentText = text;
        } catch (_) {}
    }

    /**
     * Set Thinking state (outer ring rotates, curious eyes)
     */
    setThinking(text = 'Analyzing instructions and planning next step...') {
        this.setState('thinking', text);
    }

    /**
     * Set Generating state (animated moving dots, smiling mouth)
     */
    setGenerating(text = 'Generating content with precision...') {
        this.setState('generating', text);
    }

    /**
     * Set Acting / Automating state (performing click / typing)
     */
    setActing(text = 'Executing automated step on active screen...') {
        this.setState('acting', text);
    }

    /**
     * Make the avatar smile (e.g. task milestone reached)
     */
    smile(text = null) {
        this.setState('smile', text);
    }

    /**
     * Set Complete / Success state
     */
    setSuccess(text = 'Task verified and completed successfully!') {
        this.setState('success', text);
    }

    /**
     * Set Idle state
     */
    setIdle(text = 'Codez48 Pilot Ready') {
        this.setState('idle', text);
    }

    /**
     * Hide and gracefully close the HUD
     */
    hide() {
        if (!this.isActive || !this.process) return;

        try {
            if (this.process.stdin && !this.process.stdin.destroyed && !this.process.stdin.writableEnded) {
                this.process.stdin.on('error', () => {});
                this.process.stdin.write(JSON.stringify({ action: 'hide' }) + '\n');
                this.process.stdin.end();
            }
        } catch (_) {}

        setTimeout(() => {
            if (this.process && !this.process.killed) {
                try { this.process.kill(); } catch (_) {}
            }
            this.process = null;
            this.isActive = false;
            logger.status(`\x1b[36m[PILOT COMPANION HUD] Hidden.\x1b[0m`);
        }, 300);
    }

    /**
     * Alias for hide
     */
    stop() {
        this.hide();
    }
}

module.exports = new PilotHudController();
