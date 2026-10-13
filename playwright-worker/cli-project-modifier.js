const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class CliProjectModifier {
    constructor() {
        this.searchDirs = [
            process.cwd(),
            path.resolve(__dirname, '../pilot-workspace/projects'),
            path.join(os.homedir(), 'Desktop'),
            path.join(os.homedir(), 'Documents')
        ];
    }

    async modifyProject(aiPlan) {
        console.log(`Searching for local project: ${aiPlan.targetFolder}...`);
        const projectDir = this.findProject(aiPlan.targetFolder);

        if (!projectDir) {
            throw new Error(`Could not find project folder matching: ${aiPlan.targetFolder}`);
        }

        console.log(`Found project at: ${projectDir}`);
        console.log(`Applying modifications: ${aiPlan.modificationsDescription}`);

        for (const file of aiPlan.files || []) {
            const filePath = path.join(projectDir, file.path);
            const dirName = path.dirname(filePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            console.log(`Modifying file: ${filePath}`);
            fs.writeFileSync(filePath, file.content, 'utf8');
        }

        if (aiPlan.dependencies && aiPlan.dependencies.length > 0) {
            console.log(`Installing New Dependencies...`);
            const depString = aiPlan.dependencies.join(' ');
            execSync(`npm install ${depString}`, { cwd: projectDir, stdio: 'inherit' });
        }

        console.log(`Opening Modified Project in VS Code...`);
        this.openVsCode(projectDir);

        return { projectDir };
    }

    findProject(targetFolder) {
        if (!targetFolder) return null;

        // If it's an absolute path and exists
        if (path.isAbsolute(targetFolder) && fs.existsSync(targetFolder)) {
            return targetFolder;
        }

        // Search in common directories
        for (const searchDir of this.searchDirs) {
            if (!fs.existsSync(searchDir)) continue;

            try {
                const entries = fs.readdirSync(searchDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        if (entry.name.toLowerCase() === targetFolder.toLowerCase() || entry.name.toLowerCase().includes(targetFolder.toLowerCase())) {
                            return path.join(searchDir, entry.name);
                        }
                    }
                }
            } catch (e) {
                // Ignore read errors (permissions etc.)
            }
        }

        // Deep search 1 level down in pilot-workspace
        const pilotProjects = path.resolve(__dirname, '../pilot-workspace/projects');
        if (fs.existsSync(pilotProjects)) {
             const entries = fs.readdirSync(pilotProjects, { withFileTypes: true });
             for (const entry of entries) {
                 if (entry.isDirectory()) {
                     if (entry.name.toLowerCase() === targetFolder.toLowerCase() || entry.name.toLowerCase().includes(targetFolder.toLowerCase())) {
                         return path.join(pilotProjects, entry.name);
                     }
                 }
             }
        }

        return null;
    }

    openVsCode(projectDir) {
        try {
            execSync(`code "${projectDir}"`, { stdio: 'ignore' });
        } catch (e) {
            console.log('[WARN] VS Code not available or failed to open.');
        }
    }
}

module.exports = new CliProjectModifier();