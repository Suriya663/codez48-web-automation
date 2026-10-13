const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class CliProjectGenerator {
    constructor() {
        this.baseDir = path.resolve(__dirname, '../pilot-workspace/projects');
    }

    async generateProject(aiPlan) {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }

        const projectName = `project_${Date.now()}`;
        const projectDir = path.join(this.baseDir, projectName);
        fs.mkdirSync(projectDir, { recursive: true });

        console.log(`Generating Project Files in ${projectDir}...`);

        for (const file of aiPlan.files || []) {
            const filePath = path.join(projectDir, file.path);
            const dirName = path.dirname(filePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            fs.writeFileSync(filePath, file.content, 'utf8');
        }

        if (aiPlan.dependencies && aiPlan.dependencies.length > 0) {
            console.log(`Installing Dependencies...`);
            this.installDependencies(projectDir, aiPlan.dependencies);
        }

        console.log(`Opening Project in VS Code...`);
        this.openVsCode(projectDir);

        return {
            projectDir,
            startCommand: aiPlan.startCommand || null
        };
    }

    installDependencies(projectDir, dependencies) {
        if (dependencies.length === 0) return;

        try {
            // Check if it's a node project (package.json should exist, or we can just init)
            if (!fs.existsSync(path.join(projectDir, 'package.json'))) {
                execSync('npm init -y', { cwd: projectDir, stdio: 'ignore' });
            }

            const depString = dependencies.join(' ');
            console.log(`Running npm install ${depString}`);
            execSync(`npm install ${depString}`, { cwd: projectDir, stdio: 'inherit' });
        } catch (error) {
            console.error(`Dependency installation failed: ${error.message}`);
            throw error;
        }
    }

    openVsCode(projectDir) {
        try {
            execSync(`code "${projectDir}"`, { stdio: 'ignore' });
        } catch (e) {
            console.log('[WARN] VS Code not available or failed to open.');
        }
    }

    async startApplication(projectDir, startCommand) {
        if (!startCommand) return null;

        console.log(`Starting Application... (${startCommand})`);
        const [cmd, ...args] = startCommand.split(' ');

        const child = spawn(cmd, args, {
            cwd: projectDir,
            shell: true,
            detached: true,
            stdio: 'ignore' // or pipe to logs
        });

        child.unref();

        // Wait a little for server to start
        await new Promise(r => setTimeout(r, 2000));

        return child;
    }
}

module.exports = new CliProjectGenerator();