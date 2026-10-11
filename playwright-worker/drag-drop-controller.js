const { getCursor, setCursor, simulateClick, moveCursorSmoothly } = require('./win32-cursor.js');
const koffi = require('koffi');

let mouse_event = null;
try {
    const user32 = koffi.load('user32.dll');
    mouse_event = user32.func('void mouse_event(uint32 dwFlags, long dx, long dy, uint32 dwData, uint64 dwExtraInfo)');
} catch (e) {}

class DragDropController {
    async dragAndDropPhysical(startX, startY, endX, endY, steps = 30) {
        console.log(`[DRAG DROP] Dragging physically from (${startX}, ${startY}) to (${endX}, ${endY})...`);

        // 1. Move to start position
        moveCursorSmoothly(startX, startY, 10);
        const s = Date.now(); while (Date.now() - s < 100) {}

        // 2. Mouse down (0x0002)
        if (mouse_event) mouse_event(0x0002, 0, 0, 0, 0);
        const s2 = Date.now(); while (Date.now() - s2 < 100) {}

        // 3. Smooth drag to end position while holding mouse down
        moveCursorSmoothly(endX, endY, steps);
        const s3 = Date.now(); while (Date.now() - s3 < 100) {}

        // 4. Mouse up (0x0004)
        if (mouse_event) mouse_event(0x0004, 0, 0, 0, 0);
        console.log(`[DRAG DROP] Physical drag and drop completed.`);

        return { success: true, start: { x: startX, y: startY }, end: { x: endX, y: endY } };
    }
}

module.exports = new DragDropController();
