/**
 * CODEZ48 ENVIRONMENT DETECTOR
 * Inspects installed local runtimes, SDKs, build tools, and package managers.
 * Features automated path resolution for Android SDK (adb, emulator) and Gradle Wrapper.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnvironmentDetector {
    constructor() {
        this.cache = new Map();
        this._autoConfigurePlatformPaths();
    }

    _autoConfigurePlatformPaths() {
        if (process.platform !== 'win32') return;

        const userProfile = process.env.USERPROFILE || '';
        const localAppData = process.env.LOCALAPPDATA || (userProfile ? path.join(userProfile, 'AppData', 'Local') : '');

        // 1. Android Platform Tools & Emulator Auto-Discovery
        const candidateSdkDirs = [
            process.env.ANDROID_HOME,
            process.env.ANDROID_SDK_ROOT,
            localAppData ? path.join(localAppData, 'Android', 'Sdk') : null,
            userProfile ? path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk') : null,
            'C:\\Android\\Sdk',
            'C:\\Android\\platform-tools',
            'C:\\Program Files (x86)\\Android\\android-sdk'
        ].filter(Boolean);

        for (const sdkDir of candidateSdkDirs) {
            const ptDir = sdkDir.toLowerCase().endsWith('platform-tools') ? sdkDir : path.join(sdkDir, 'platform-tools');
            const adbExe = path.join(ptDir, 'adb.exe');
            if (fs.existsSync(adbExe)) {
                const homeDir = sdkDir.toLowerCase().endsWith('platform-tools') ? path.dirname(sdkDir) : sdkDir;
                if (!process.env.ANDROID_HOME) process.env.ANDROID_HOME = homeDir;
                if (!process.env.ANDROID_SDK_ROOT) process.env.ANDROID_SDK_ROOT = homeDir;
                if (!process.env.PATH.includes(ptDir)) {
                    process.env.PATH = `${ptDir};${process.env.PATH}`;
                }
                const emuDir = path.join(homeDir, 'emulator');
                if (fs.existsSync(emuDir) && !process.env.PATH.includes(emuDir)) {
                    process.env.PATH = `${emuDir};${process.env.PATH}`;
                }
                break;
            }
        }

        // 2. Gradle Auto-discovery from local wrapper distributions
        if (userProfile) {
            const gradleDists = path.join(userProfile, '.gradle', 'wrapper', 'dists');
            if (fs.existsSync(gradleDists)) {
                try {
                    const findGradleBat = (dir, depth = 0) => {
                        if (depth > 4) return null;
                        const entries = fs.readdirSync(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            const full = path.join(dir, entry.name);
                            if (entry.isDirectory()) {
                                const found = findGradleBat(full, depth + 1);
                                if (found) return found;
                            } else if (entry.isFile() && entry.name.toLowerCase() === 'gradle.bat') {
                                return path.dirname(full);
                            }
                        }
                        return null;
                    };
                    const gradleBin = findGradleBat(gradleDists);
                    if (gradleBin && !process.env.PATH.includes(gradleBin)) {
                        process.env.PATH = `${gradleBin};${process.env.PATH}`;
                    }
                } catch (_) {}
            }
        }
    }

    checkCommand(cmd) {
        if (this.cache.has(cmd)) return this.cache.get(cmd);

        try {
            const isWin = process.platform === 'win32';
            const options = { timeout: 6000, encoding: 'utf8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] };
            let output = '';
            try {
                output = execSync(cmd, options).toString().trim();
            } catch (err) {
                if (err.stdout && err.stdout.toString().trim()) {
                    output = err.stdout.toString().trim();
                } else if (err.stderr && err.stderr.toString().trim()) {
                    output = err.stderr.toString().trim();
                } else {
                    throw err;
                }
            }

            // Extract readable clean version line
            let version = '';
            const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (cmd.includes('gradle')) {
                const gLine = lines.find(l => /^Gradle\s+[\d\.]+/i.test(l) || /Welcome to Gradle/i.test(l));
                version = gLine || lines[0] || 'installed';
            } else if (cmd.includes('java')) {
                const jLine = lines.find(l => /java (?:version|runtime)|openjdk/i.test(l));
                version = jLine || lines[0] || 'installed';
            } else {
                version = lines[0] || 'installed';
            }

            const result = { installed: true, version };
            this.cache.set(cmd, result);
            return result;
        } catch (e) {
            // Fallback for Windows .cmd scripts if direct call failed
            if (process.platform === 'win32' && !cmd.endsWith('.cmd')) {
                try {
                    const fallbackCmd = cmd.replace(/^([a-z0-9_-]+)/i, '$1.cmd');
                    const output = execSync(fallbackCmd, { timeout: 6000, encoding: 'utf8', shell: true, stdio: ['pipe', 'pipe', 'ignore'] }).trim();
                    const result = { installed: true, version: output.split(/\r?\n/)[0] };
                    this.cache.set(cmd, result);
                    return result;
                } catch (e2) {}
            }

            const result = { installed: false, version: null };
            this.cache.set(cmd, result);
            return result;
        }
    }

    inspectForType(projectType) {
        const report = { projectType, tools: {}, ready: true, missing: [] };

        switch (projectType.toLowerCase()) {
            case 'node':
            case 'express':
            case 'react':
            case 'vite':
            case 'next':
            case 'typescript':
                report.tools.node = this.checkCommand('node -v');
                report.tools.npm = this.checkCommand('npm -v');
                if (!report.tools.node.installed) report.missing.push('Node.js');
                if (!report.tools.npm.installed) report.missing.push('npm');
                break;

            case 'python':
            case 'flask':
            case 'fastapi':
            case 'django':
                report.tools.python = this.checkCommand('python --version');
                if (!report.tools.python.installed) report.tools.python = this.checkCommand('python3 --version');
                report.tools.pip = this.checkCommand('pip --version');
                if (!report.tools.pip.installed) report.tools.pip = this.checkCommand('pip3 --version');

                if (!report.tools.python.installed) report.missing.push('Python 3');
                if (!report.tools.pip.installed) report.missing.push('pip');
                break;

            case 'java':
            case 'maven':
                report.tools.java = this.checkCommand('java -version');
                report.tools.javac = this.checkCommand('javac -version');
                if (!report.tools.java.installed) report.missing.push('Java JDK (java)');
                if (!report.tools.javac.installed) report.missing.push('Java Compiler (javac)');
                break;

            case 'android':
            case 'kotlin':
                report.tools.java = this.checkCommand('java -version');
                report.tools.gradle = this.checkCommand('gradle -v');
                report.tools.adb = this.checkCommand('adb version');

                if (!report.tools.java.installed) report.missing.push('Java JDK');
                if (!report.tools.adb.installed) report.missing.push('Android Platform Tools (adb)');
                break;

            case 'dotnet':
            case 'csharp':
                report.tools.dotnet = this.checkCommand('dotnet --version');
                if (!report.tools.dotnet.installed) report.missing.push('.NET SDK');
                break;

            case 'flutter':
            case 'dart':
                report.tools.flutter = this.checkCommand('flutter --version');
                if (!report.tools.flutter.installed) report.missing.push('Flutter SDK');
                break;

            case 'static-web':
            default:
                // Static web requires no compiler
                break;
        }

        report.ready = report.missing.length === 0;
        return report;
    }
}

module.exports = new EnvironmentDetector();
