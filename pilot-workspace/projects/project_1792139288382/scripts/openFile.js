// scripts/openFile.js
// Updated to use the cross‑platform 'open' npm package instead of spawning the OS‑specific 'open' command.

const open = require('open');

/**
 * Opens a file or URL with the default application for the current platform.
 * @param {string} target - Path to the file or URL to open.
 * @param {object} [options] - Optional options passed to the 'open' package.
 */
async function openTarget(target, options = {}) {
  try {
    await open(target, options);
    console.log(`Successfully opened: ${target}`);
  } catch (err) {
    console.error('Failed to open target:', err);
    process.exit(1);
  }
}

// Example usage (you can replace this with your own logic)
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node openFile.js <path-or-url>');
    process.exit(1);
  }
  openTarget(target);
}

module.exports = { openTarget };
