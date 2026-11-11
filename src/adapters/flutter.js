/**
 * CODEZ48 FLUTTER / DART ADAPTER
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class FlutterProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('flutter');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        const keywords = ['flutter', 'dart'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            if (fs.existsSync(path.join(projectPath, 'pubspec.yaml'))) return true;
        }

        return false;
    }

    getRequiredTools() {
        return ['flutter'];
    }

    detectDependencies(projectPath) {
        return { installed: [], missing: [] };
    }

    getInstallCommand(dependencies) {
        return 'flutter pub get';
    }

    getBuildCommand(projectPath) {
        return 'flutter build bundle';
    }

    getRunCommand(projectPath) {
        return 'flutter run';
    }

    getEntryPoint(projectPath) {
        return 'lib/main.dart';
    }

    getOutputType() {
        return 'desktop';
    }
}

module.exports = new FlutterProjectAdapter();
