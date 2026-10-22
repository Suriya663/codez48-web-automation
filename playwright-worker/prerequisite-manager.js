const terminalExecutor = require('./terminal-executor');

class PrerequisiteManager {
    /**
     * Verifies if Node.js is installed
     */
    async checkNode() {
        const result = await terminalExecutor.runCommand('node', ['-v'], process.cwd(), 5000);
        if (result.exitCode !== 0) {
            return { available: false, version: null, error: 'Node.js is not installed or not in PATH.' };
        }
        return { available: true, version: result.stdout.trim(), error: null };
    }

    /**
     * Verifies if NPM is installed
     */
    async checkNpm() {
        const result = await terminalExecutor.runCommand('npm', ['-v'], process.cwd(), 10000);
        if (result.exitCode !== 0) {
            return { available: false, version: null, error: 'npm is not installed or not in PATH.' };
        }
        return { available: true, version: result.stdout.trim(), error: null };
    }

    /**
     * Validates Android requirements (JAVA_HOME, ANDROID_HOME)
     */
    async checkAndroidPrerequisites() {
        const javaHome = process.env.JAVA_HOME;
        const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

        const missing = [];
        if (!javaHome) missing.push('JAVA_HOME');
        if (!androidHome) missing.push('ANDROID_HOME');

        if (missing.length > 0) {
            return { available: false, missing, error: `Missing environment variables: ${missing.join(', ')}` };
        }

        // Verify javac
        const javaCheck = await terminalExecutor.runCommand('javac', ['-version'], process.cwd(), 5000);
        if (javaCheck.exitCode !== 0) {
            return { available: false, missing: ['javac'], error: 'Java compiler (javac) not found in PATH.' };
        }

        return { available: true, missing: [], error: null };
    }

    /**
     * Checks if ADB devices are connected and authorized
     */
    async checkAdbDevices() {
        const result = await terminalExecutor.runCommand('adb', ['devices'], process.cwd(), 5000);
        if (result.exitCode !== 0) {
            return { available: false, devices: [], error: 'adb is not installed or not in PATH.' };
        }

        const lines = result.stdout.split('\n');
        const devices = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const parts = line.split(/\s+/);
                if (parts.length === 2) {
                    devices.push({ id: parts[0], state: parts[1] });
                }
            }
        }

        const authorizedDevices = devices.filter(d => d.state === 'device');

        if (devices.length > 0 && authorizedDevices.length === 0) {
            return {
                available: false,
                devices,
                error: 'Devices found but unauthorized. Please accept the USB debugging prompt on the device.'
            };
        }

        return { available: authorizedDevices.length > 0, devices, error: null };
    }
}

module.exports = new PrerequisiteManager();