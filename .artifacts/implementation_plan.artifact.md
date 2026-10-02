# Real Android Project & SDK Tool Auto-Discovery Implementation Plan

This implementation plan addresses the environment tool issue (`Missing required tools: Android Platform Tools (adb)` & `gradle not found`) when creating Real Android applications. It equips the AI Pilot with automatic Android SDK/ADB/Gradle path resolution and full Real Android Application project generation workflows.

---

## User Review Required

> [!IMPORTANT]
> **Android SDK Auto-Discovery & Embedded Gradle Wrapper Fallback**:
> 1. The system will automatically search local Android SDK paths (e.g. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`) if `adb` is not in the global system `PATH`.
> 2. For Gradle building, the system will automatically utilize the embedded Gradle wrapper (`gradlew.bat` / `./gradlew`) shipped within the Android template (`android_webview_template`), eliminating global `gradle` dependency requirements.

---

## Proposed Changes

### Component 1: Android Environment Auto-Discovery & Real Android App Builder

#### [MODIFY] [native-app-automation.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/native-app-automation.js)
- Adds `checkAndResolveAndroidEnvironment()`:
  - Scans `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`, `%ANDROID_HOME%`, and standard Android Studio paths.
  - Dynamically injects resolved platform-tools into `process.env.PATH`.
- Adds `createAndroidProject({ appName, packageName, url, files })`:
  - Minimizes open desktop windows.
  - Creates project directory in `C:\Users\<user>\Documents\<AppName>`.
  - Seeds full Android project structure using `android_webview_template` (`build.gradle`, `AndroidManifest.xml`, `MainActivity.java`, Gradle wrappers).
  - Opens project in VS Code (`code <projectDir>`).
  - Executes Gradle build (`gradlew.bat assembleDebug`).
  - Automatically installs/deploys the generated APK using ADB (`adb install -r`) when an Android device or emulator is detected.

---

### Component 2: AI Planner Intent Integration

#### [MODIFY] [ai-planner.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/ai-planner.js)
- Updates `planNextAction(run, pageState)` pre-resolver to detect requests for Real Android applications (e.g., "create Android app", "real android application", "generate apk"):
  - Automatically maps to `action: 'native_app'`, `value: 'android:<AppName>'`.

---

## Verification Plan

### Automated Tests
- Run `scratch/test_android_automation.js` to verify:
  1. Auto-discovery of local Android SDK / ADB at `AppData\Local\Android\Sdk\platform-tools\adb.exe`.
  2. Generation of a Real Android Application project under `Documents\<AppName>`.
  3. Execution of `./gradlew assembleDebug` build check.
  4. Automatic opening in VS Code.

### Manual Verification
- Test creating a Real Android application via Pilot prompt to confirm project creation, Gradle build, and ADB resolution without `MISSING RUNTIME/SDK` errors.
