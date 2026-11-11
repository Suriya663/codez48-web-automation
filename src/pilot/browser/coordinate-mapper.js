const logger = require('../../core/logger');
/**
 * CODEZ48 COORDINATE MAPPING LAYER (STAGE 6)
 * Explicitly maps screenshot pixel coordinates -> normalized coordinates -> physical display -> Windows mouse coordinates.
 * Supports multi-monitor metadata and DPI/display scaling.
 */

const { execSync } = require('child_process');

class CoordinateMapper {
    getDisplays() {
        if (process.platform !== 'win32') {
            return [{ id: 'primary', bounds: { left: 0, top: 0, width: 1536, height: 864 }, scaleFactor: 1.0, primary: true }];
        }
        try {
            const psScript = `
                Add-Type -AssemblyName System.Windows.Forms;
                $screens = [System.Windows.Forms.Screen]::AllScreens;
                $res = @();
                foreach ($s in $screens) {
                    $res += [PSCustomObject]@{
                        DeviceName = $s.DeviceName;
                        Bounds = @{ Left = $s.Bounds.Left; Top = $s.Bounds.Top; Width = $s.Bounds.Width; Height = $s.Bounds.Height };
                        Primary = $s.Primary;
                    };
                }
                $res | ConvertTo-Json -Compress;
            `;
            const buffer = Buffer.from(psScript, 'utf16le');
            const base64Cmd = buffer.toString('base64');
            const stdout = execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${base64Cmd}`, {
                timeout: 3000,
                encoding: 'utf8'
            }).toString();
            const jsonMatch = stdout.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const list = Array.isArray(parsed) ? parsed : [parsed];
                return list.map((s, i) => ({
                    id: s.DeviceName || `display-${i+1}`,
                    bounds: s.Bounds,
                    scaleFactor: 1.0,
                    primary: s.Primary
                }));
            }
        } catch (e) {}
        return [{ id: 'primary', bounds: { Left: 0, Top: 0, Width: 1536, Height: 864 }, scaleFactor: 1.0, Primary: true }];
    }

    mapScreenshotToScreen(screenshotX, screenshotY, metadata) {
        if (!metadata || !metadata.screenshotWidth || !metadata.screenshotHeight) {
            return { screenX: screenshotX, screenY: screenshotY };
        }

        const screenW = metadata.screenWidth || metadata.screenshotWidth;
        const screenH = metadata.screenHeight || metadata.screenshotHeight;

        const scaleX = screenW / metadata.screenshotWidth;
        const scaleY = screenH / metadata.screenshotHeight;

        const normalizedX = screenshotX / metadata.screenshotWidth;
        const normalizedY = screenshotY / metadata.screenshotHeight;

        const physicalX = Math.round(screenshotX * scaleX);
        const physicalY = Math.round(screenshotY * scaleY);

        const dpr = metadata.devicePixelRatio || 1.0;
        const scaling = metadata.scaling || 1.0;
        const screenX = Math.round((physicalX / dpr) * scaling);
        const screenY = Math.round((physicalY / dpr) * scaling);

        logger.status(`\x1b[35m[COORDINATE MAPPING] Screenshot (${screenshotX}, ${screenshotY}) -> Normalized (${normalizedX.toFixed(2)}, ${normalizedY.toFixed(2)}) -> Physical (${physicalX}, ${physicalY}) -> Windows Mouse (${screenX}, ${screenY}) [DPR: ${dpr}, Scaling: ${scaling}]\x1b[0m`);

        return {
            normalizedX,
            normalizedY,
            physicalX,
            physicalY,
            screenX,
            screenY,
            displays: this.getDisplays()
        };
    }
}

module.exports = new CoordinateMapper();
