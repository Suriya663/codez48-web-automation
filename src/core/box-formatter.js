/**
 * CODEZ48 TERMINAL BOX FORMATTER
 *
 * Formats multi-line terminal banners, notices, and error alerts with:
 * - Accurate visible-length calculation (stripping ANSI color codes for width math)
 * - Automatic word wrapping so text NEVER overflows terminal boundaries
 * - Perfectly aligned border frames (╔ ═ ╗ ║ ╠ ═ ╣ ╚ ═ ╝)
 */

'use strict';

// Strip ANSI escape codes to compute real printable character length
function stripAnsi(str) {
    if (typeof str !== 'string') return '';
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Word-wraps a string into lines that do not exceed maxWidth characters in visible length.
 */
function wrapLine(line, maxWidth) {
    if (!line) return [''];
    const visibleLen = stripAnsi(line).length;
    if (visibleLen <= maxWidth) return [line];

    const words = line.split(' ');
    const wrapped = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (stripAnsi(testLine).length <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) wrapped.push(currentLine);
            // If a single word itself exceeds maxWidth, force-split it
            if (stripAnsi(word).length > maxWidth) {
                let remainder = word;
                while (stripAnsi(remainder).length > maxWidth) {
                    wrapped.push(remainder.slice(0, maxWidth));
                    remainder = remainder.slice(maxWidth);
                }
                currentLine = remainder;
            } else {
                currentLine = word;
            }
        }
    }
    if (currentLine) wrapped.push(currentLine);
    return wrapped;
}

/**
 * Creates a beautifully bordered terminal box.
 * @param {Object} options
 * @param {string} options.title - Header title
 * @param {Array<string|{text: string, divider?: boolean}>} options.lines - Content lines
 * @param {number} [options.width=87] - Outer total width including borders
 * @param {string} [options.borderColor='\x1b[36m'] - ANSI color for border (default cyan)
 * @param {string} [options.titleColor='\x1b[1m\x1b[37m'] - ANSI color for title
 * @returns {string} The formatted terminal box string
 */
function formatTerminalBox({
    title = '',
    lines = [],
    width = 87,
    borderColor = '\x1b[36m',
    titleColor = '\x1b[1m\x1b[37m'
}) {
    const innerWidth = width - 4; // 2 chars for '║ ', 2 chars for ' ║'
    const reset = '\x1b[0m';

    const topBorder = `${borderColor}╔${'═'.repeat(width - 2)}╗${reset}`;
    const divider = `${borderColor}╠${'═'.repeat(width - 2)}╣${reset}`;
    const bottomBorder = `${borderColor}╚${'═'.repeat(width - 2)}╝${reset}`;

    const output = [];
    output.push(topBorder);

    // Render Title
    if (title) {
        const cleanTitle = stripAnsi(title);
        const padTotal = Math.max(0, width - 2 - cleanTitle.length);
        const padLeft = Math.floor(padTotal / 2);
        const padRight = padTotal - padLeft;
        output.push(`${borderColor}║${' '.repeat(padLeft)}${titleColor}${title}${reset}${' '.repeat(padRight)}${borderColor}║${reset}`);
        output.push(divider);
    }

    // Render Lines
    for (const item of lines) {
        if (!item) {
            output.push(`${borderColor}║ ${' '.repeat(innerWidth)} ║${reset}`);
            continue;
        }

        if (typeof item === 'object' && item.divider) {
            output.push(divider);
            continue;
        }

        const rawText = typeof item === 'object' ? item.text : String(item);
        const wrappedLines = wrapLine(rawText, innerWidth);

        for (const wLine of wrappedLines) {
            const vLen = stripAnsi(wLine).length;
            const padLen = Math.max(0, innerWidth - vLen);
            output.push(`${borderColor}║ ${reset}${wLine}${reset}${' '.repeat(padLen)} ${borderColor}║${reset}`);
        }
    }

    output.push(bottomBorder);
    return output.join('\n');
}

module.exports = {
    stripAnsi,
    wrapLine,
    formatTerminalBox
};
