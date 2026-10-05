
    const { getCursor } = require('./win32-cursor.js');
    class SafetyMonitor {
        constructor() {
            this.topLeftCount = 0;
        }
        checkSafety() {
            const pos = getCursor();
            if (pos.x === 0 && pos.y === 0) {
                this.topLeftCount++;
                if (this.topLeftCount >= 2) {
                    return { aborted: true, reason: "TOP_LEFT_CORNER_HOVER" };
                }
            } else {
                this.topLeftCount = 0;
            }
            return { aborted: false };
        }
    }
    module.exports = new SafetyMonitor();
    