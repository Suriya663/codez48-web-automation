/**
 * CODEZ48 .NET / C# ADAPTER
 */

const fs = require('fs');
const path = require('path');
const BaseProjectAdapter = require('./base-adapter');

class DotNetProjectAdapter extends BaseProjectAdapter {
    constructor() {
        super('dotnet');
    }

    detect(goal, projectPath) {
        const lowerGoal = goal.toLowerCase();
        const keywords = ['dotnet', 'c#', 'csharp', 'asp.net', 'nunit'];
        if (keywords.some(k => lowerGoal.includes(k))) return true;

        if (projectPath && fs.existsSync(projectPath)) {
            const files = fs.readdirSync(projectPath);
            if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln') || f === 'Program.cs')) return true;
        }

        return false;
    }

    getRequiredTools() {
        return ['dotnet'];
    }

    detectDependencies(projectPath) {
        return { installed: [], missing: [] };
    }

    getInstallCommand(dependencies) {
        return 'dotnet restore';
    }

    getBuildCommand(projectPath) {
        return 'dotnet build';
    }

    getRunCommand(projectPath) {
        return 'dotnet run';
    }

    getEntryPoint(projectPath) {
        return 'Program.cs';
    }

    getOutputType() {
        return 'web';
    }
}

module.exports = new DotNetProjectAdapter();
