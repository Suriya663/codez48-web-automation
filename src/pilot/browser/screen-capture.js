const logger = require('../../core/logger');
/**
 * CODEZ48 SCREEN CAPTURE UTILITY (STAGE 2)
 * Supports multiple capture modes: 'viewport', 'fullPage', and 'desktopScreen' (default for complete visible Windows screen).
 */

const { spawnSync } = require('child_process');

const CSHARP_SCREEN_CAPTURE = [
    'using System;',
    'using System.Runtime.InteropServices;',
    'using System.Drawing;',
    'public class WinScreen {',
    '    [DllImport("user32.dll")] public static extern IntPtr GetDesktopWindow();',
    '    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);',
    '    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);',
    '    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);',
    '    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);',
    '    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);',
    '    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);',
    '    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);',
    '    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);',
    '    public const int SRCCOPY = 0x00CC0020;',
    '    public static Bitmap Capture(int width, int height) {',
    '        IntPtr hDesk = GetDesktopWindow();',
    '        IntPtr hdcSrc = GetDC(hDesk);',
    '        IntPtr hdcDest = CreateCompatibleDC(hdcSrc);',
    '        IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, width, height);',
    '        IntPtr hOld = SelectObject(hdcDest, hBitmap);',
    '        BitBlt(hdcDest, 0, 0, width, height, hdcSrc, 0, 0, SRCCOPY);',
    '        SelectObject(hdcDest, hOld);',
    '        DeleteDC(hdcDest);',
    '        ReleaseDC(hDesk, hdcSrc);',
    '        Bitmap bmp = Bitmap.FromHbitmap(hBitmap);',
    '        DeleteObject(hBitmap);',
    '        return bmp;',
    '    }',
    '}'
].join(' ');

const B64_CSHARP = Buffer.from(CSHARP_SCREEN_CAPTURE, 'utf8').toString('base64');

class ScreenCapture {
    async captureScreenshotCDP(wsSend, format = 'png', quality = 90) {
        try {
            logger.status(`\x1b[36m[SCREEN CAPTURE] Capturing CDP screenshot...\x1b[0m`);
            const res = await wsSend('Page.captureScreenshot', { format, quality });
            if (res && res.data) {
                return { base64: res.data, width: 1536, height: 864, mode: 'viewport' };
            }
            return null;
        } catch (e) {
            logger.error(`\x1b[31m[SCREEN CAPTURE CDP ERROR] ${e.message}\x1b[0m`);
            return null;
        }
    }

    captureDesktopScreen() {
        if (process.platform !== 'win32') {
            throw new Error('Desktop screen capture currently supported on Windows (win32)');
        }

        try {
            const psScript = `
$ErrorActionPreference = 'SilentlyContinue';
Add-Type -AssemblyName System.Drawing;
Add-Type -AssemblyName System.Windows.Forms;
$width = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width;
$height = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height;
if (-not $width -or $width -le 0) { $width = 1536 };
if (-not $height -or $height -le 0) { $height = 864 };

if (-not ('WinScreen' -as [type])) {
    $code = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${B64_CSHARP}'));
    Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing -ErrorAction SilentlyContinue;
}

$bmp = $null;
try { $bmp = [WinScreen]::Capture($width, $height); } catch {}

if (-not $bmp) {
    try {
        $bmp = New-Object System.Drawing.Bitmap $width, $height;
        $graphics = [System.Drawing.Graphics]::FromImage($bmp);
        $size = New-Object System.Drawing.Size($width, $height);
        $graphics.CopyFromScreen(0, 0, 0, 0, $size);
        $graphics.Dispose();
    } catch {}
}

if (-not $bmp) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height;
}

$ms = New-Object System.IO.MemoryStream;
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg);
$bytes = $ms.ToArray();
$base64 = [System.Convert]::ToBase64String($bytes);
$bmp.Dispose();
$ms.Dispose();

[PSCustomObject]@{ base64 = $base64; width = $width; height = $height } | ConvertTo-Json -Compress;
`;

            const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
            const res = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
                timeout: 10000,
                encoding: 'utf8',
                maxBuffer: 25 * 1024 * 1024
            });

            if (res.error) throw res.error;

            const stdout = (res.stdout || '').trim();
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.base64 && parsed.base64.length > 500) {
                    const fileSize = Math.round(parsed.base64.length * 0.75);
                    return {
                        base64: parsed.base64,
                        screenshotWidth: parsed.width,
                        screenshotHeight: parsed.height,
                        screenWidth: parsed.width,
                        screenHeight: parsed.height,
                        devicePixelRatio: 1.0,
                        dpi: 96,
                        scaling: 1.0,
                        captureMode: 'desktopScreen',
                        imageFormat: 'jpeg',
                        fileSize: fileSize,
                        timestamp: new Date().toISOString()
                    };
                }
            }
            throw new Error(`Invalid or empty output from PowerShell screen capture: ${stdout.substring(0, 100)}`);
        } catch (e) {
            logger.error(`[SCREENSHOT ERROR] ${e.message}`);
            throw e;
        }
    }
}

module.exports = new ScreenCapture();
