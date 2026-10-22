// utils/openFile.js
// Cross‑platform helper to open a file/URL in the default application.
// Replaces the previous implementation that directly spawned the macOS `open` command.

const { spawn } = require('cross-spawn');

/**
 * Opens the given path (file or URL) using the default system handler.
 * Works on macOS, Linux and Windows.
 *
 * @param {string} target - The file path or URL to open.
 * @returns {Promise<void>} Resolves when the command is successfully started.
 */
function open(target) {
  return new Promise((resolve, reject) => {
    if (!target) {
      return reject(new Error('No target provided to open()'));
    }

    // Determine the appropriate command based on the platform.
    let command;
    let args = [];
    switch (process.platform) {
      case 'darwin': // macOS
        command = 'open';
        args = [target];
        break;
      case 'win32': // Windows
        command = 'cmd';
        args = ['/c', 'start', '""', target];
        break;
      default: // Linux and other Unix‑like OSes
        command = 'xdg-open';
        args = [target];
        break;
    }

    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', reject);
    // Detach the child so the parent can exit without waiting.
    child.unref();
    resolve();
  });
}

module.exports = { open };
