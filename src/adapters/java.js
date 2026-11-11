/**
 * CODEZ48 JAVA / MAVEN / GRADLE ADAPTER
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class JavaProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('java');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        const keywords = ['java', 'maven', 'spring', 'jar'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            if (fs.existsSync(path.join(projectPath, 'pom.xml')) ||
                fs.existsSync(path.join(projectPath, 'Main.java')) ||
                fs.existsSync(path.join(projectPath, 'src/Main.java'))) {
                return true;
            }
        }

        return false;
    }

    getRequiredTools() {
        return ['java', 'javac'];
    }

    detectDependencies(projectPath) {
        return { installed: [], missing: [] };
    }

    getInstallCommand(dependencies) {
        return null;
    }

    getBuildCommand(projectPath) {
        if (projectPath && fs.existsSync(path.join(projectPath, 'pom.xml'))) {
            return 'mvn compile';
        }
        return 'javac Main.java';
    }

    getRunCommand(projectPath) {
        if (projectPath && fs.existsSync(path.join(projectPath, 'pom.xml'))) {
            return 'mvn exec:java';
        }
        return 'java Main';
    }

    getEntryPoint(projectPath) {
        return 'Main.java';
    }

    getOutputType() {
        return 'cli';
    }
}

module.exports = new JavaProjectAdapter();
