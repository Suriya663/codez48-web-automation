const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

class FilesystemController {
    resolveBasePath(locationName = 'Desktop') {
        if (!locationName) return path.join(os.homedir(), 'Desktop');
        if (path.isAbsolute(locationName)) return locationName;

        const home = os.homedir();
        const lower = locationName.toLowerCase();
        if (lower.includes('download')) return path.join(home, 'Downloads');
        if (lower.includes('document')) return path.join(home, 'Documents');
        if (lower.includes('temp') || lower.includes('tmp')) return os.tmpdir();
        return path.join(home, 'Desktop');
    }

    createFolder(baseLocation, folderName) {
        const base = this.resolveBasePath(baseLocation);
        const targetPath = path.isAbsolute(folderName) ? folderName : path.join(base, folderName);

        console.log(`[FILESYSTEM] BEFORE STATE: Checking folder presence at "${targetPath}"...`);
        const existsBefore = fs.existsSync(targetPath);

        if (!existsBefore) {
            console.log(`[FILESYSTEM] ACTION: Creating directory "${targetPath}"...`);
            fs.mkdirSync(targetPath, { recursive: true });
        }

        const existsAfter = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory();
        if (existsAfter) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Folder verified at "${targetPath}"`);
            return { success: true, path: targetPath };
        } else {
            return { success: false, error: 'FOLDER_CREATION_FAILED' };
        }
    }

    createTextFile(folderPath, fileName, content = '', options = { overwrite: true, openInNotepad: true }) {
        const filePath = path.isAbsolute(fileName) ? fileName : path.join(folderPath, fileName);

        console.log(`[FILESYSTEM] BEFORE STATE: Checking file presence at "${filePath}"...`);
        const existsBefore = fs.existsSync(filePath);

        if (existsBefore && !options.overwrite) {
            return { success: false, error: 'FILE_ALREADY_EXISTS_OVERWRITE_PROTECTED', path: filePath };
        }

        console.log(`[FILESYSTEM] ACTION: Writing content to file "${filePath}"...`);
        const parentDir = path.dirname(filePath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');

        const existsAfter = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        if (existsAfter) {
            console.log(`[FILESYSTEM VERIFICATION PASS] File created and verified at "${filePath}"`);

            let notepadPid = '0';
            if (options.openInNotepad && process.platform === 'win32') {
                try {
                    const child = spawn('notepad.exe', [filePath], { detached: true, stdio: 'ignore', windowsHide: false });
                    child.unref();
                    const psCheck = `powershell -NoProfile -NonInteractive -Command "$p = Get-Process notepad -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { Write-Output \\"$($p.Id)\\" } else { Write-Output \\"0\\" }"`;
                    notepadPid = execSync(psCheck, { encoding: 'utf8', windowsHide: true }).trim();
                    console.log(`[TEXT FILE NOTEPAD LAUNCH] Opened text file in Notepad window (PID: ${notepadPid})`);
                } catch (npErr) {}
            }

            return { success: true, path: filePath, notepadPid, contentWritten: content };
        } else {
            return { success: false, error: 'FILE_CREATION_FAILED' };
        }
    }

    createGravityStoryFile(outputDir = null) {
        console.log(`[FILESYSTEM] Generating original story "The Day Gravity Took a Break"...`);
        const workspaceDir = path.resolve(__dirname, '../pilot-workspace/stories');
        const targetDir = outputDir || workspaceDir;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, 'The_Day_Gravity_Took_a_Break.txt');
        const storyText = `Title: The Day Gravity Took a Break

It was a quiet Tuesday morning in Oakridge when gravity decided to take an unexpected hiatus.

At precisely 8:15 AM, Mr. Henderson poured his morning coffee, only to watch the dark liquid drift upward from his mug in floating, shimmering spheres. Outside, newspapers fluttered effortlessly into the treetops, sleeping tabbies levitated two inches above porch stairs, and bicycles bobbed gently alongside garden fences.

For six hours, the town lived in a state of weightless wonder. Neighbors pushed off rooftops with gentle kicks, children executed effortless quintuple flips above lawns, and lost kites floated down to earth in reverse.

By 2:15 PM, with a soft hum that vibrated through every floorboard, gravity returned. Everything settled back down with gentle thuds, leaving Oakridge with unforgettably light memories and the world's most carefully poured cups of coffee.
`;

        fs.writeFileSync(filePath, storyText, 'utf8');

        // Automatically launch Notepad to display the story content on screen for user inspection
        let notepadPid = '0';
        try {
            if (process.platform === 'win32') {
                const child = spawn('notepad.exe', [filePath], { detached: true, stdio: 'ignore', windowsHide: false });
                child.unref();
                const psCheck = `powershell -NoProfile -NonInteractive -Command "$p = Get-Process notepad -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { Write-Output \\"$($p.Id)\\" } else { Write-Output \\"0\\" }"`;
                notepadPid = execSync(psCheck, { encoding: 'utf8', windowsHide: true }).trim();
                console.log(`[TEXT FILE NOTEPAD LAUNCH] Opened story file in Notepad window (PID: ${notepadPid})`);
            }
        } catch (npErr) {
            console.warn('[TEXT FILE NOTEPAD LAUNCH WARN]:', npErr.message);
        }

        const readBack = this.readFile(filePath);
        if (readBack.success && readBack.content.includes('The Day Gravity Took a Break')) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Story file created, displayed in Notepad (PID: ${notepadPid}), and verified at "${filePath}"`);
            return {
                success: true,
                filePath,
                notepadPid,
                title: 'The Day Gravity Took a Break',
                storyContent: readBack.content
            };
        } else {
            return { success: false, error: 'STORY_FILE_VERIFICATION_FAILED' };
        }
    }

    createCsvReport(folderPath = null, fileName = 'Fan_Automation_Report.csv', headers = null, rows = null) {
        console.log(`[FILESYSTEM] Generating CSV report "${fileName}"...`);
        const workspaceDir = path.resolve(__dirname, '../pilot-workspace/reports');
        const targetDir = folderPath || workspaceDir;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, fileName);

        const defaultHeaders = ['Item_ID', 'Device_Name', 'Status', 'Temperature_C', 'Power_Watts'];
        const defaultRows = [
            ['DEV_001', 'HVAC_Primary_Blower', 'OPERATIONAL', '24.5', '350.0'],
            ['DEV_002', 'Server_Rack_Exhaust_Fan', 'OPERATIONAL', '28.1', '120.5'],
            ['DEV_003', 'Condenser_Cooling_Fan', 'BOOST_MODE', '32.4', '480.0'],
            ['DEV_004', 'Auxiliary_Vent_Fan', 'STANDBY', '21.0', '15.0']
        ];

        const csvHeaders = headers || defaultHeaders;
        const csvRows = rows || defaultRows;

        const headerLine = csvHeaders.join(',');
        const rowLines = csvRows.map(r => r.join(','));
        const csvContent = [headerLine, ...rowLines].join('\n') + '\n';

        fs.writeFileSync(filePath, csvContent, 'utf8');

        const readBack = this.readFile(filePath);
        if (readBack.success) {
            const lines = readBack.content.trim().split('\n');
            const verifiedHeader = lines[0] === headerLine;
            const verifiedRows = lines.length - 1 === csvRows.length;

            if (verifiedHeader && verifiedRows) {
                console.log(`[FILESYSTEM VERIFICATION PASS] CSV report verified at "${filePath}" (${csvRows.length} data rows)`);
                return {
                    success: true,
                    filePath,
                    headerCount: csvHeaders.length,
                    rowCount: csvRows.length,
                    content: readBack.content
                };
            }
        }

        return { success: false, error: 'CSV_VERIFICATION_FAILED' };
    }

    readFile(filePath) {
        console.log(`[FILESYSTEM] BEFORE STATE: Verifying file existence for read: "${filePath}"...`);
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return { success: false, error: 'FILE_NOT_FOUND', path: filePath };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`[FILESYSTEM VERIFICATION PASS] Read ${content.length} characters from "${filePath}"`);
        return { success: true, path: filePath, content };
    }

    editFile(filePath, appendContent = '') {
        console.log(`[FILESYSTEM] ACTION: Editing file "${filePath}"...`);
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'FILE_NOT_FOUND', path: filePath };
        }

        fs.appendFileSync(filePath, appendContent, 'utf8');
        const readBack = fs.readFileSync(filePath, 'utf8');

        if (readBack.includes(appendContent)) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Edited content verified in "${filePath}"`);
            return { success: true, path: filePath, fullContent: readBack };
        } else {
            return { success: false, error: 'FILE_EDIT_VERIFICATION_FAILED' };
        }
    }

    renameFile(folderPath, oldName, newName) {
        const oldPath = path.isAbsolute(oldName) ? oldName : path.join(folderPath, oldName);
        const newPath = path.isAbsolute(newName) ? newName : path.join(folderPath, newName);

        console.log(`[FILESYSTEM] BEFORE STATE: Verifying old file "${oldPath}"...`);
        if (!fs.existsSync(oldPath)) {
            return { success: false, error: 'SOURCE_FILE_NOT_FOUND', path: oldPath };
        }

        console.log(`[FILESYSTEM] ACTION: Renaming "${oldPath}" to "${newPath}"...`);
        fs.renameSync(oldPath, newPath);

        const oldRemoved = !fs.existsSync(oldPath);
        const newCreated = fs.existsSync(newPath);

        if (oldRemoved && newCreated) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Renamed successfully to "${newPath}"`);
            return { success: true, oldPath, newPath };
        } else {
            return { success: false, error: 'RENAME_VERIFICATION_FAILED' };
        }
    }

    moveFile(sourcePath, targetFolderPath) {
        console.log(`[FILESYSTEM] BEFORE STATE: Checking source file "${sourcePath}"...`);
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: 'SOURCE_NOT_FOUND', path: sourcePath };
        }

        if (!fs.existsSync(targetFolderPath)) {
            fs.mkdirSync(targetFolderPath, { recursive: true });
        }

        const fileName = path.basename(sourcePath);
        const destPath = path.join(targetFolderPath, fileName);

        console.log(`[FILESYSTEM] ACTION: Moving "${sourcePath}" to "${destPath}"...`);
        fs.renameSync(sourcePath, destPath);

        if (!fs.existsSync(sourcePath) && fs.existsSync(destPath)) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Moved successfully to "${destPath}"`);
            return { success: true, sourcePath, destPath };
        } else {
            return { success: false, error: 'MOVE_VERIFICATION_FAILED' };
        }
    }

    listDirectory(dirPath) {
        console.log(`[FILESYSTEM] Listing directory contents for "${dirPath}"...`);
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
            return { success: false, error: 'DIRECTORY_NOT_FOUND', path: dirPath };
        }

        const items = fs.readdirSync(dirPath).map(name => {
            const itemPath = path.join(dirPath, name);
            const stat = fs.statSync(itemPath);
            return {
                name,
                path: itemPath,
                isFile: stat.isFile(),
                isDirectory: stat.isDirectory(),
                sizeBytes: stat.size
            };
        });

        console.log(`[FILESYSTEM VERIFICATION PASS] Directory listed: ${items.length} items found.`);
        return { success: true, path: dirPath, itemsCount: items.length, items };
    }

    copyFile(sourcePath, targetPath) {
        console.log(`[FILESYSTEM] ACTION: Copying "${sourcePath}" to "${targetPath}"...`);
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: 'SOURCE_NOT_FOUND', path: sourcePath };
        }

        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, targetPath);

        if (fs.existsSync(targetPath)) {
            console.log(`[FILESYSTEM VERIFICATION PASS] Copied successfully to "${targetPath}"`);
            return { success: true, sourcePath, targetPath };
        } else {
            return { success: false, error: 'COPY_VERIFICATION_FAILED' };
        }
    }

    cleanup(targetPath) {
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            console.log(`[FILESYSTEM] Cleaned up path: "${targetPath}"`);
            return !fs.existsSync(targetPath);
        }
        return true;
    }
}

module.exports = new FilesystemController();
