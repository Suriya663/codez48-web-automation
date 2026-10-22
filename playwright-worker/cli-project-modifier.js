const fs = require('fs');
const path = require('path');
const os = require('os');
const terminalExecutor = require('./terminal-executor');
const cliAiAnalyzer = require('./cli-ai-analyzer');

class CliProjectModifier {
    constructor() {
        this.searchDirs = [
            process.cwd(),
            path.resolve(__dirname, '../pilot-workspace/projects'),
            path.join(os.homedir(), 'Desktop'),
            path.join(os.homedir(), 'Documents')
        ];
    }

    async modifyProject(aiPlan, originalGoal) {
        console.log(`Searching for local project: ${aiPlan.targetFolder}...`);
        const projectDir = this.findProject(aiPlan.targetFolder);

        if (!projectDir) {
            throw new Error(`Could not find project folder matching: ${aiPlan.targetFolder}`);
        }

        console.log(`Found project at: ${projectDir}`);

        console.log(`[40%] Inspecting local project files at ${projectDir}...`);

        // Phase 1: Read Files
        const fileContents = {};
        if (aiPlan.filesToRead && aiPlan.filesToRead.length > 0) {
            for (const fileRelPath of aiPlan.filesToRead) {
                const absolutePath = path.join(projectDir, fileRelPath);
                if (fs.existsSync(absolutePath)) {
                    fileContents[fileRelPath] = fs.readFileSync(absolutePath, 'utf8');
                } else {
                    console.warn(`[WARN] Requested file to read does not exist: ${absolutePath}`);
                }
            }
        }

        let filesToWrite = aiPlan.files || [];

        // Phase 2: Request Surgical Edits
        if (Object.keys(fileContents).length > 0) {
            const editPlan = await cliAiAnalyzer.generateEdits(originalGoal || aiPlan.modificationsDescription || process.argv.join(' '), fileContents);
            if (editPlan && editPlan.edits) {
                for (const edit of editPlan.edits) {
                    const originalContent = fileContents[edit.path];
                    if (!originalContent) continue;

                    let newContent = originalContent;
                    for (const mod of edit.modifications) {
                        const count = (newContent.match(new RegExp(this.escapeRegExp(mod.targetContent), 'g')) || []).length;

                        if (count === 0) {
                            console.error(`[EDIT FAILED] Target content not found in ${edit.path}: ${mod.targetContent.substring(0, 50)}...`);
                            throw new Error(`Edit validation failed. Target content missing in ${edit.path}`);
                        } else if (count > 1) {
                            console.error(`[EDIT FAILED] Target content is ambiguous (found ${count} times) in ${edit.path}.`);
                            throw new Error(`Edit validation failed. Target content ambiguous in ${edit.path}`);
                        }

                        newContent = newContent.replace(mod.targetContent, mod.replacementContent);
                    }

                    filesToWrite.push({ path: edit.path, content: newContent });
                }
            }
        }

        console.log(`[60%] Applying surgical modifications...`);

        for (const file of filesToWrite) {
            const filePath = path.join(projectDir, file.path);
            const dirName = path.dirname(filePath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }

            // Create .bak before modifying
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, `${filePath}.bak`);
                console.log(`Created backup: ${file.path}.bak`);
            }

            console.log(`Modified: ${file.path}`);
            fs.writeFileSync(filePath, file.content, 'utf8');

            // Disk read-back verification
            const savedContent = fs.readFileSync(filePath, 'utf8');
            if (savedContent !== file.content) {
                throw new Error(`Disk read-back verification failed for ${filePath}`);
            }

            // Syntax check for modified JS files
            if ((file.path.endsWith('.js') || file.path.endsWith('.mjs')) && !file.path.includes('node_modules')) {
                const checkRes = await terminalExecutor.runCommand('node', ['--check', filePath], projectDir);
                if (checkRes.exitCode !== 0) {
                    throw new Error(`Syntax check failed after modification for ${file.path}:\n${checkRes.stderr}`);
                }
            }
        }

        console.log(`[85%] Opening VS Code workspace...`);
        await this.openVsCode(projectDir);

        return { projectDir };
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    findProject(targetFolder) {
        if (!targetFolder) return null;

        if (path.isAbsolute(targetFolder) && fs.existsSync(targetFolder)) {
            return targetFolder;
        }

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
            } catch (e) {}
        }

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

    async openVsCode(projectDir) {
        try {
            const absPath = path.resolve(projectDir);
            if (absPath.toLowerCase() === os.homedir().toLowerCase() || path.parse(absPath).root.toLowerCase() === absPath.toLowerCase()) {
                console.error('[VS CODE ERROR] Refusing to open user home directory or system root.');
                return;
            }

            const checkCmd = os.platform() === 'win32' ? 'where' : 'which';
            const checkStatus = await terminalExecutor.runCommand(checkCmd, ['code'], process.cwd());

            if (checkStatus.exitCode !== 0) {
                 console.error('[VS CODE ERROR] The "code" command was not found in PATH. Ensure Visual Studio Code is installed and in your environment variables.');
                 return;
            }

            console.log(`Opening Modified Project in VS Code (New Window)...`);

            const { spawn } = require('child_process');
            const useShell = os.platform() === 'win32';
            const codeProc = spawn(useShell ? 'code.cmd' : 'code', ['-n', absPath], { stdio: 'ignore', windowsHide: false, detached: true, shell: useShell });

            codeProc.on('error', (err) => {
                if (err.code === 'ENOENT') {
                    console.error('[VS CODE ERROR] Failed to spawn VS Code process.');
                } else {
                    console.error('[VS CODE ERROR]', err.message);
                }
            });
            codeProc.unref();

        } catch (e) {
            console.error('[VS CODE ERROR] Failed to check VS Code:', e.message);
        }
    }
}

module.exports = new CliProjectModifier();