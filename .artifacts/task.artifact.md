# Real Android Project & SDK Tool Auto-Discovery Execution Tasks

- [x] Component 1: Android SDK & ADB Environment Auto-Discovery (`playwright-worker/native-app-automation.js`)
  - [x] Implement `checkAndResolveAndroidEnvironment()` to auto-locate `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
  - [x] Implement `createAndroidProject({ appName, packageName, url, files })` with template seeding, `gradlew.bat` assembly, VS Code launch, and ADB installation
- [x] Component 2: AI Planner Android Intent Pre-Resolver (`playwright-worker/ai-planner.js`)
  - [x] Add Android project intent detection to pre-resolver in `planNextAction(run, pageState)`
  - [x] Wire `android:<AppName>` action execution in `action-executor.js`
- [x] Component 3: Integration & End-to-End Verification
  - [x] Run test script `scratch/test_android_automation.js` to verify SDK resolution, Android project creation in `Documents`, Gradle build, and ADB resolution
