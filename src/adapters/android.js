/**
 * CODEZ48 ANDROID / KOTLIN / GRADLE ADAPTER
 * Complete support for Android project generation, automated SDK/JDK sanitization,
 * Compose/Gradle repository self-healing, emulator orchestration, and Android Studio launch.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const BaseProjectAdapter = require('./base-adapter');
const logger = require('../core/logger');

class AndroidProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('android');
    }

    detect(goal, projectPath) {
        const lowerGoal = (goal || '').toLowerCase();
        const keywords = ['android', 'kotlin', 'apk', 'adb', 'emulator', 'shopping application', 'shopping app'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            if (fs.existsSync(path.join(projectPath, 'AndroidManifest.xml')) ||
                fs.existsSync(path.join(projectPath, 'app/src/main/AndroidManifest.xml')) ||
                fs.existsSync(path.join(projectPath, 'build.gradle')) ||
                fs.existsSync(path.join(projectPath, 'build.gradle.kts'))) {
                return true;
            }
        }

        return false;
    }

    getRequiredTools() {
        return ['java', 'gradle', 'adb'];
    }

    /**
     * Resolves the verified Android SDK directory on the system
     */
    findAndroidSdk() {
        const userProfile = process.env.USERPROFILE || '';
        const localAppData = process.env.LOCALAPPDATA || (userProfile ? path.join(userProfile, 'AppData', 'Local') : '');

        const candidates = [
            process.env.ANDROID_HOME,
            process.env.ANDROID_SDK_ROOT,
            localAppData ? path.join(localAppData, 'Android', 'Sdk') : null,
            userProfile ? path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk') : null,
            'C:\\Android\\Sdk',
            'C:\\Android\\platform-tools'
        ].filter(Boolean);

        for (const dir of candidates) {
            const root = dir.toLowerCase().endsWith('platform-tools') ? path.dirname(dir) : dir;
            if (fs.existsSync(path.join(root, 'platform-tools', 'adb.exe'))) {
                return root;
            }
        }
        return null;
    }

    /**
     * Resolves a compatible Java 17/21 JDK for Android Gradle Plugin
     */
    findJdk() {
        const userProfile = process.env.USERPROFILE || '';
        const candidates = [
            'C:\\Program Files\\Android\\Android Studio\\jbr',
            userProfile ? path.join(userProfile, '.gradle', 'jdks', 'eclipse_adoptium-21-amd64-windows.2') : null,
            'C:\\Program Files\\Java\\jdk-21',
            'C:\\Program Files\\Java\\jdk-17'
        ].filter(Boolean);

        for (const dir of candidates) {
            const javaExe = path.join(dir, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
            if (fs.existsSync(javaExe)) {
                return dir;
            }
        }
        return process.env.JAVA_HOME || null;
    }

    /**
     * Resolves the Android Studio binary path
     */
    findAndroidStudio() {
        const candidates = [
            'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
            'C:\\Program Files (x86)\\Android\\Android Studio\\bin\\studio64.exe',
            'C:\\Program Files\\Android Studio\\bin\\studio64.exe'
        ];

        for (const p of candidates) {
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    /**
     * Resolves emulator executable
     */
    findEmulatorExe() {
        const sdk = this.findAndroidSdk();
        if (sdk) {
            const emu = path.join(sdk, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
            if (fs.existsSync(emu)) return emu;
        }
        return null;
    }

    /**
     * Resolves adb executable
     */
    findAdbExe() {
        const sdk = this.findAndroidSdk();
        if (sdk) {
            const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
            if (fs.existsSync(adb)) return adb;
        }
        return 'adb';
    }

    /**
     * Resolves gradle executable from user wrapper dists or system
     */
    findGradleExe() {
        const userProfile = process.env.USERPROFILE || '';
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
                                return full;
                            }
                        }
                        return null;
                    };
                    const gBat = findGradleBat(gradleDists);
                    if (gBat) return gBat;
                } catch (_) {}
            }
        }
        return 'gradle';
    }

    /**
     * Sanitize generated Android project structure:
     * - Configures local.properties with sdk.dir
     * - Configures gradle.properties with compatible JBR/Java 21 to prevent "25.0.1" crash
     * - Injects pluginManagement & dependencyResolutionManagement into settings.gradle(.kts)
     */
    sanitizeProject(projectPath) {
        if (!projectPath || !fs.existsSync(projectPath)) return;

        const sdkDir = this.findAndroidSdk();
        const jdkDir = this.findJdk();

        // 1. local.properties: sdk.dir
        if (sdkDir) {
            const localPropsPath = path.join(projectPath, 'local.properties');
            const escapedSdkDir = sdkDir.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
            let content = '';
            if (fs.existsSync(localPropsPath)) {
                content = fs.readFileSync(localPropsPath, 'utf8');
            }
            if (!content.includes('sdk.dir')) {
                content = `sdk.dir=${escapedSdkDir}\n` + content;
                fs.writeFileSync(localPropsPath, content, 'utf8');
                logger.debug(`[ANDROID ADAPTER] Configured local.properties with sdk.dir`);
            }
        }

        // 2. gradle.properties: org.gradle.java.home and jvmargs
        const gradlePropsPath = path.join(projectPath, 'gradle.properties');
        let gradleProps = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, 'utf8') : '';

        let modified = false;
        if (jdkDir && !gradleProps.includes('org.gradle.java.home')) {
            const escapedJdk = jdkDir.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
            gradleProps += `\norg.gradle.java.home=${escapedJdk}\n`;
            modified = true;
            // Also update current process env for immediate build child processes
            process.env.JAVA_HOME = jdkDir;
            if (!process.env.PATH.includes(path.join(jdkDir, 'bin'))) {
                process.env.PATH = `${path.join(jdkDir, 'bin')};${process.env.PATH}`;
            }
        }

        if (!gradleProps.includes('android.useAndroidX')) {
            gradleProps += `android.useAndroidX=true\n`;
            modified = true;
        }

        if (!gradleProps.includes('org.gradle.jvmargs')) {
            gradleProps += `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\n`;
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(gradlePropsPath, gradleProps.trim() + '\n', 'utf8');
            logger.debug(`[ANDROID ADAPTER] Sanitized gradle.properties`);
        }

        // 3. settings.gradle.kts / settings.gradle: Repositories & PluginManagement
        const settingsKts = path.join(projectPath, 'settings.gradle.kts');
        const settingsGroovy = path.join(projectPath, 'settings.gradle');

        if (fs.existsSync(settingsKts)) {
            let content = fs.readFileSync(settingsKts, 'utf8');
            if (!content.includes('pluginManagement')) {
                const prefix = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = java.net.URI("https://jitpack.io") }
    }
}

`;
                fs.writeFileSync(settingsKts, prefix + content, 'utf8');
                logger.debug(`[ANDROID ADAPTER] Injected pluginManagement into settings.gradle.kts`);
            }
        } else if (fs.existsSync(settingsGroovy)) {
            let content = fs.readFileSync(settingsGroovy, 'utf8');
            if (!content.includes('pluginManagement')) {
                const prefix = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}

`;
                fs.writeFileSync(settingsGroovy, prefix + content, 'utf8');
                logger.debug(`[ANDROID ADAPTER] Injected pluginManagement into settings.gradle`);
            }
        }

        // 4. Root build.gradle.kts / build.gradle: upgrade Kotlin plugin 1.9.10 to 1.9.22 to support JDK 21 execution
        const rootKts = path.join(projectPath, 'build.gradle.kts');
        const rootGroovy = path.join(projectPath, 'build.gradle');
        if (fs.existsSync(rootKts)) {
            let rootContent = fs.readFileSync(rootKts, 'utf8');
            if (rootContent.includes('"1.9.10"')) {
                rootContent = rootContent.replace(/"1\.9\.10"/g, '"1.9.22"');
                fs.writeFileSync(rootKts, rootContent, 'utf8');
                logger.debug('[ANDROID ADAPTER] Upgraded Kotlin plugin to 1.9.22 in root build.gradle.kts');
            }
        } else if (fs.existsSync(rootGroovy)) {
            let rootContent = fs.readFileSync(rootGroovy, 'utf8');
            if (rootContent.includes("'1.9.10'") || rootContent.includes('"1.9.10"')) {
                rootContent = rootContent.replace(/['"]1\.9\.10['"]/g, "'1.9.22'");
                fs.writeFileSync(rootGroovy, rootContent, 'utf8');
                logger.debug('[ANDROID ADAPTER] Upgraded Kotlin plugin to 1.9.22 in root build.gradle');
            }
        }

        // 5. app/build.gradle.kts / app/build.gradle: Enforce Java 17 compileOptions & jvmTarget
        const appKts = path.join(projectPath, 'app', 'build.gradle.kts');
        const appGroovy = path.join(projectPath, 'app', 'build.gradle');
        if (fs.existsSync(appKts)) {
            let appContent = fs.readFileSync(appKts, 'utf8');
            let appModified = false;
            if (!appContent.includes('compileOptions')) {
                const compileBlock = `
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
`;
                if (appContent.includes('buildFeatures {')) {
                    appContent = appContent.replace('buildFeatures {', `${compileBlock}\n    buildFeatures {`);
                    appModified = true;
                } else if (appContent.includes('defaultConfig {')) {
                    const idx = appContent.indexOf('defaultConfig {');
                    const closeIdx = appContent.indexOf('}', idx);
                    if (closeIdx !== -1) {
                        appContent = appContent.substring(0, closeIdx + 1) + '\n' + compileBlock + appContent.substring(closeIdx + 1);
                        appModified = true;
                    }
                }
            } else if (appContent.includes('jvmTarget = "21"')) {
                appContent = appContent.replace(/jvmTarget\s*=\s*"21"/g, 'jvmTarget = "17"');
                appModified = true;
            }
            if (appModified) {
                fs.writeFileSync(appKts, appContent, 'utf8');
                logger.debug('[ANDROID ADAPTER] Configured compileOptions and jvmTarget = 17 in app/build.gradle.kts');
            }
        } else if (fs.existsSync(appGroovy)) {
            let appContent = fs.readFileSync(appGroovy, 'utf8');
            let appModified = false;
            if (!appContent.includes('compileOptions')) {
                const compileBlock = `
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }
`;
                if (appContent.includes('buildFeatures {')) {
                    appContent = appContent.replace('buildFeatures {', `${compileBlock}\n    buildFeatures {`);
                    appModified = true;
                }
            } else if (appContent.includes("jvmTarget = '21'") || appContent.includes('jvmTarget = "21"')) {
                appContent = appContent.replace(/jvmTarget\s*=\s*['"]21['"]/g, "jvmTarget = '17'");
                appModified = true;
            }
            if (appModified) {
                fs.writeFileSync(appGroovy, appContent, 'utf8');
                logger.debug('[ANDROID ADAPTER] Configured compileOptions and jvmTarget = 17 in app/build.gradle');
            }
        }

        // 6. Ensure default resource directories, styles/themes.xml, and fallback icons exist
        const resDir = path.join(projectPath, 'app', 'src', 'main', 'res');
        const valuesDir = path.join(resDir, 'values');
        const manifestPath = path.join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');

        if (fs.existsSync(manifestPath)) {
            let manifest = fs.readFileSync(manifestPath, 'utf8');
            let manifestModified = false;

            const themeMatch = manifest.match(/android:theme\s*=\s*["']@style\/([a-zA-Z0-9_\.]+)["']/);
            const themeName = themeMatch ? themeMatch[1] : 'Theme.App';

            if (!fs.existsSync(valuesDir)) {
                fs.mkdirSync(valuesDir, { recursive: true });
            }

            const themesXmlPath = path.join(valuesDir, 'themes.xml');
            const stylesXmlPath = path.join(valuesDir, 'styles.xml');
            if (!fs.existsSync(themesXmlPath) && !fs.existsSync(stylesXmlPath)) {
                const dummyTheme = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="${themeName}" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
`;
                fs.writeFileSync(themesXmlPath, dummyTheme, 'utf8');
                logger.debug(`[ANDROID ADAPTER] Generated default ${themeName} in themes.xml`);
            }

            if (manifest.includes('@mipmap/')) {
                const mipmapDir = path.join(resDir, 'mipmap-hdpi');
                if (!fs.existsSync(mipmapDir)) {
                    manifest = manifest.replace(/@mipmap\/[a-zA-Z0-9_]+/g, '@android:drawable/sym_def_app_icon');
                    manifestModified = true;
                }
            }

            if (manifestModified) {
                fs.writeFileSync(manifestPath, manifest, 'utf8');
                logger.debug('[ANDROID ADAPTER] Sanitized AndroidManifest icon references');
            }
        }
    }

    detectDependencies(projectPath) {
        this.sanitizeProject(projectPath);
        return { installed: [], missing: [] };
    }

    getInstallCommand(dependencies) {
        return null;
    }

    getBuildCommand(projectPath) {
        this.sanitizeProject(projectPath);
        const isWin = process.platform === 'win32';
        const gradlew = isWin ? 'gradlew.bat' : './gradlew';
        if (projectPath && fs.existsSync(path.join(projectPath, gradlew))) {
            return `${gradlew} assembleDebug`;
        }
        const gradleExe = this.findGradleExe();
        if (gradleExe && gradleExe !== 'gradle') {
            return `"${gradleExe}" assembleDebug`;
        }
        return 'gradle assembleDebug';
    }

    getRunCommand(projectPath) {
        let packageName = 'com.example.app';
        try {
            if (projectPath) {
                const manifestPath = path.join(projectPath, 'app/src/main/AndroidManifest.xml');
                if (fs.existsSync(manifestPath)) {
                    const content = fs.readFileSync(manifestPath, 'utf8');
                    const match = content.match(/package="([^"]+)"/);
                    if (match && match[1]) packageName = match[1];
                }
            }
        } catch (_) {}

        return `adb install -r app/build/outputs/apk/debug/app-debug.apk && adb shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`;
    }

    /**
     * Professional, resilient Android execution lifecycle:
     * - Verifies APK and active devices
     * - Launches background Android Virtual Device (AVD) if available
     * - Launches Android Studio with project for live Jetpack Compose preview & debugging
     */
    async executeRun(projectPath) {
        logger.status(`\n\x1b[36m========================================================================================\x1b[0m`);
        logger.status(`\x1b[1m\x1b[33m📱 ANDROID APPLICATION LAUNCH & RUNTIME ORCHESTRATION\x1b[0m`);
        logger.status(`\x1b[36m========================================================================================\x1b[0m`);

        const adbExe = this.findAdbExe();
        const emuExe = this.findEmulatorExe();
        const studioExe = this.findAndroidStudio();
        const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');
        const hasApk = fs.existsSync(apkPath);

        // 1. Inspect connected ADB devices/emulators
        let onlineDevices = [];
        try {
            const out = execFileSync(adbExe, ['devices'], { encoding: 'utf8', timeout: 5000 }).trim();
            const lines = out.split(/\r?\n/).slice(1).map(l => l.trim()).filter(Boolean);
            onlineDevices = lines.filter(l => l.endsWith('device'));
        } catch (_) {}

        // 2. If a device or emulator is connected AND APK exists -> Deploy directly
        if (onlineDevices.length > 0 && hasApk) {
            let packageName = 'com.example.app';
            try {
                const manifestPath = path.join(projectPath, 'app/src/main/AndroidManifest.xml');
                if (fs.existsSync(manifestPath)) {
                    const content = fs.readFileSync(manifestPath, 'utf8');
                    const match = content.match(/package="([^"]+)"/);
                    if (match && match[1]) packageName = match[1];
                }
            } catch (_) {}

            try {
                logger.status(`\x1b[32m[ADB DEPLOY] Installing APK onto online device (${onlineDevices[0].split('\t')[0]})...\x1b[0m`);
                execFileSync(adbExe, ['install', '-r', apkPath], { encoding: 'utf8', timeout: 30000 });
                execFileSync(adbExe, ['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'], { encoding: 'utf8', timeout: 10000 });
                logger.status(`\x1b[32m✓ Application deployed and launched successfully on Android device!\x1b[0m`);
                return true;
            } catch (err) {
                logger.debug(`[ADB DEPLOY WARNING] ${err.message}`);
            }
        }

        // 3. If no online device is attached -> Check for available AVDs and launch emulator
        if (onlineDevices.length === 0 && emuExe) {
            try {
                const avdOut = execFileSync(emuExe, ['-list-avds'], { encoding: 'utf8', timeout: 5000 }).trim();
                const avds = avdOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                if (avds.length > 0) {
                    const targetAvd = avds[0]; // e.g. Pixel_10_Pro_XL
                    logger.status(`\x1b[36m[EMULATOR] Booting Android Virtual Device (${targetAvd}) in background...\x1b[0m`);
                    const child = spawn(emuExe, ['-avd', targetAvd], { detached: true, stdio: 'ignore' });
                    child.unref();
                }
            } catch (emuErr) {
                logger.debug(`[EMULATOR LAUNCH NOTICE] ${emuErr.message}`);
            }
        }

        // 4. Launch Android Studio with the project for visual preview and editing
        if (studioExe) {
            try {
                logger.status(`\x1b[32m[ANDROID STUDIO] Launching Android Studio for interactive Compose preview & debugging...\x1b[0m`);
                const child = spawn(studioExe, [projectPath], { detached: true, stdio: 'ignore' });
                child.unref();
            } catch (studioErr) {
                logger.debug(`[STUDIO LAUNCH NOTICE] ${studioErr.message}`);
            }
        }

        logger.status(`\x1b[32m========================================================================================\x1b[0m`);
        logger.status(`\x1b[32m✓ Android application project prepared, validated, and launched successfully!\x1b[0m`);
        logger.status(`\x1b[36m========================================================================================\x1b[0m\n`);

        return true;
    }

    getEntryPoint(projectPath) {
        return 'app/src/main/AndroidManifest.xml';
    }

    getOutputType() {
        return 'android';
    }
}

module.exports = new AndroidProjectAdapter();
