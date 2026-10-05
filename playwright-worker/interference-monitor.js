
    class InterferenceMonitor {
        checkInterference(initialPos, currentPos) {
            const dx = Math.abs(currentPos.x - initialPos.x);
            const dy = Math.abs(currentPos.y - initialPos.y);
            if (dx > 50 || dy > 50) {
                return { paused: true, message: "[PAUSE] Manual mouse interference detected. Continue? (y/n)" };
            }
            return { paused: false };
        }
    }
    module.exports = new InterferenceMonitor();
    