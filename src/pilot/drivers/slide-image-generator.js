const logger = require('../../core/logger');
/**
 * CODEZ48 SLIDE IMAGE GENERATOR
 * Generates 16:9 topic visual graphic assets (640x360) on disk in Codez48 Preview/assets/
 * for PowerPoint COM slide picture insertion.
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../../core/workspace-manager');

class SlideImageGenerator {
    getAssetsDir() {
        const assetsDir = path.join(workspaceManager.getWorkspacePath(), 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        return assetsDir;
    }

    /**
     * Creates a 24-bit 16:9 (640x360) BMP image file for a given slide topic
     */
    generateSlideImage(topic, slideIndex = 1) {
        const width = 640;
        const height = 360;
        const cleanTopic = (topic || 'Visual').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const fileName = `img_${cleanTopic}_${slideIndex}.bmp`;
        const filePath = path.join(this.getAssetsDir(), fileName);

        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            return filePath;
        }

        const headerSize = 54;
        const imageSize = width * height * 3;
        const fileSize = headerSize + imageSize;

        const buffer = Buffer.alloc(fileSize);

        // 1. BMP File Header (14 bytes)
        buffer.write('BM', 0); // Signature
        buffer.writeUInt32LE(fileSize, 2); // File Size
        buffer.writeUInt16LE(0, 6); // Reserved 1
        buffer.writeUInt16LE(0, 8); // Reserved 2
        buffer.writeUInt32LE(headerSize, 10); // Offset to pixel data

        // 2. DIB Header (BITMAPINFOHEADER - 40 bytes)
        buffer.writeUInt32LE(40, 14); // Header size
        buffer.writeInt32LE(width, 18); // Width
        buffer.writeInt32LE(height, 22); // Height (bottom-up)
        buffer.writeUInt16LE(1, 26); // Color planes
        buffer.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
        buffer.writeUInt32LE(0, 30); // Compression (0 = None)
        buffer.writeUInt32LE(imageSize, 34); // Image size
        buffer.writeInt32LE(2835, 38); // Horizontal resolution (72 DPI)
        buffer.writeInt32LE(2835, 42); // Vertical resolution (72 DPI)
        buffer.writeUInt32LE(0, 46); // Colors in color table
        buffer.writeUInt32LE(0, 50); // Important colors

        // Color palettes based on slide index
        const colorThemes = [
            { bgR: 15, bgG: 23, bgB: 42, cardR: 56, cardG: 189, cardB: 248 }, // Dark Slate / Sky Blue
            { bgR: 30, bgG: 41, bgB: 59, cardR: 52, cardG: 211, cardB: 153 }, // Slate / Emerald Green
            { bgR: 17, bgG: 24, bgB: 39, cardR: 168, cardG: 85, cardB: 247 }, // Dark Blue / Purple
            { bgR: 24, bgG: 24, bgB: 27, cardR: 251, cardG: 146, cardB: 60 }  // Zinc / Orange
        ];

        const theme = colorThemes[(slideIndex - 1) % colorThemes.length];

        // 3. Pixel Data Generation (BGR format, bottom-up rows)
        let offset = headerSize;
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                let r = theme.bgR;
                let g = theme.bgG;
                let b = theme.bgB;

                // Inner Accent Card Box (Margins: X [60..580], Y [50..310])
                if (x >= 60 && x <= 580 && y >= 50 && y <= 310) {
                    // Border line around card
                    if (x === 60 || x === 580 || y === 50 || y === 310) {
                        r = theme.cardR;
                        g = theme.cardG;
                        b = theme.cardB;
                    } else {
                        // Card interior
                        r = Math.min(255, theme.bgR + 20);
                        g = Math.min(255, theme.bgG + 25);
                        b = Math.min(255, theme.bgB + 30);
                    }
                }

                // Center Diagram Elements (Circles/Nodes)
                const cx1 = 200, cy1 = 180;
                const cx2 = 320, cy2 = 180;
                const cx3 = 440, cy3 = 180;

                const dist1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2);
                const dist2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2);
                const dist3 = Math.sqrt((x - cx3) ** 2 + (y - cy3) ** 2);

                if (dist1 <= 35 || dist2 <= 35 || dist3 <= 35) {
                    r = theme.cardR;
                    g = theme.cardG;
                    b = theme.cardB;
                }

                // Connector Lines between nodes
                if (y >= 178 && y <= 182 && x >= 200 && x <= 440) {
                    r = theme.cardR;
                    g = theme.cardG;
                    b = theme.cardB;
                }

                buffer[offset++] = b; // Blue
                buffer[offset++] = g; // Green
                buffer[offset++] = r; // Red
            }
        }

        fs.writeFileSync(filePath, buffer);
        logger.user(`\x1b[32m✓ Generated 16:9 slide visual asset: ${filePath}\x1b[0m`);
        return filePath;
    }
}

module.exports = new SlideImageGenerator();
