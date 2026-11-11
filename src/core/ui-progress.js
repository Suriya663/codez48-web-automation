/**
 * CODEZ48 TERMINAL PROGRESS & SPINNER ENGINE
 * Renders smooth animated spinners and dynamic 0% -> 100% progress bars
 * in the terminal during AI thinking, PPT/Word generation, and system tasks.
 * Automatically handles TTY, PowerShell, Windows Terminal, and CMD.
 */

class UiProgress {
    constructor() {
        this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.activeTimer = null;
        this.frameIndex = 0;
        this.currentText = '';
        this.isActive = false;
        this.isProgressBar = false;
        this.lastPercent = 0;
    }

    /**
     * Starts an animated spinner with the given message.
     * @param {string} text Status label
     */
    startSpinner(text = 'Thinking...') {
        this.stop();
        this.currentText = text;
        this.isActive = true;
        this.isProgressBar = false;
        this.frameIndex = 0;

        if (process.stdout.isTTY) {
            process.stdout.write('\x1b[?25l'); // Hide cursor
            this.activeTimer = setInterval(() => {
                const frame = this.spinnerFrames[this.frameIndex % this.spinnerFrames.length];
                this.frameIndex++;
                try {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(`\x1b[36m${frame}\x1b[0m \x1b[1m${this.currentText}\x1b[0m`);
                } catch (_) {}
            }, 80);
        } else {
            console.log(`\x1b[36m⏳ ${text}\x1b[0m`);
        }
    }

    /**
     * Updates spinner text without restarting the animation timer.
     * @param {string} newText
     */
    updateSpinnerText(newText) {
        this.currentText = newText;
        if (!process.stdout.isTTY && this.isActive) {
            console.log(`\x1b[36m⏳ ${newText}\x1b[0m`);
        }
    }

    /**
     * Displays a dynamic 0% -> 100% progress bar in the terminal.
     * @param {number} percent 0 to 100
     * @param {string} label Text description
     */
    updateProgress(percent, label = '') {
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        this.lastPercent = p;
        this.currentText = label;
        this.isActive = true;
        this.isProgressBar = true;

        if (this.activeTimer) {
            clearInterval(this.activeTimer);
            this.activeTimer = null;
        }

        const barLength = 24;
        const filledLength = Math.round((barLength * p) / 100);
        const filled = '█'.repeat(filledLength);
        const empty = '░'.repeat(barLength - filledLength);

        const color = p < 50 ? '\x1b[33m' : (p < 100 ? '\x1b[36m' : '\x1b[32m');
        const barStr = `${color}[${filled}${empty}]\x1b[0m \x1b[1m${String(p).padStart(3)}%\x1b[0m ${label ? `| ${label}` : ''}`;

        if (process.stdout.isTTY) {
            try {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(barStr);
            } catch (_) {}
        } else {
            if (p === 0 || p === 25 || p === 50 || p === 75 || p === 100) {
                console.log(barStr);
            }
        }
    }

    /**
     * Smoothly animates progress from current percent to target percent over durationMs
     */
    async animateTo(targetPercent, durationMs = 600, label = '') {
        const start = this.lastPercent;
        const diff = targetPercent - start;
        const steps = Math.max(5, Math.floor(durationMs / 40));
        const stepDelay = Math.floor(durationMs / steps);

        for (let i = 1; i <= steps; i++) {
            const current = Math.round(start + (diff * (i / steps)));
            this.updateProgress(current, label);
            await new Promise(r => setTimeout(r, stepDelay));
        }
    }

    /**
     * Stops the active progress bar or spinner and shows the final completion message.
     * @param {string} finalMessage
     * @param {boolean} isSuccess
     */
    stop(finalMessage = null, isSuccess = true) {
        if (this.activeTimer) {
            clearInterval(this.activeTimer);
            this.activeTimer = null;
        }

        if (process.stdout.isTTY) {
            try {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write('\x1b[?25h'); // Restore cursor
            } catch (_) {}
        }

        if (this.isActive && finalMessage) {
            const icon = isSuccess ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✖\x1b[0m';
            console.log(`${icon} \x1b[1m${finalMessage}\x1b[0m`);
        }

        this.isActive = false;
        this.isProgressBar = false;
        this.currentText = '';
        this.lastPercent = 0;
    }
}

module.exports = new UiProgress();
