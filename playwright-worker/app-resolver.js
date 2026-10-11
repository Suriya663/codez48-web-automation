const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class AppResolver {
    constructor() {
        this.appDefinitions = {
            notepad: {
                name: 'Notepad',
                executables: ['notepad.exe'],
                candidatePaths: ['C:\\Windows\\System32\\notepad.exe', 'C:\\Windows\\notepad.exe']
            },
            calculator: {
                name: 'Calculator',
                executables: ['calc.exe', 'CalculatorApp.exe'],
                candidatePaths: ['C:\\Windows\\System32\\calc.exe']
            },
            word: {
                name: 'Microsoft Word',
                executables: ['WINWORD.EXE'],
                candidatePaths: [
                    'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
                    'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE'
                ]
            },
            excel: {
                name: 'Microsoft Excel',
                executables: ['EXCEL.EXE'],
                candidatePaths: [
                    'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE',
                    'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\EXCEL.EXE'
                ]
            },
            powerpoint: {
                name: 'Microsoft PowerPoint',
                executables: ['POWERPNT.EXE'],
                candidatePaths: [
                    'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
                    'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE'
                ]
            },
            vscode: {
                name: 'Visual Studio Code',
                executables: ['Code.exe', 'code.cmd'],
                candidatePaths: [
                    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'Code.exe'),
                    'C:\\Program Files\\Microsoft VS Code\\Code.exe'
                ]
            },
            explorer: {
                name: 'File Explorer',
                executables: ['explorer.exe'],
                candidatePaths: ['C:\\Windows\\explorer.exe']
            },
            chrome: {
                name: 'Google Chrome',
                executables: ['chrome.exe'],
                candidatePaths: [
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                ]
            },
            edge: {
                name: 'Microsoft Edge',
                executables: ['msedge.exe'],
                candidatePaths: ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']
            },
            metatrader: {
                name: 'MetaTrader 5',
                executables: ['terminal64.exe', 'terminal.exe'],
                candidatePaths: [
                    'C:\\Program Files\\MetaTrader 5\\terminal64.exe',
                    'C:\\Program Files\\Vantage FX MetaTrader 5\\terminal64.exe'
                ]
            }
        };
    }

    resolveApp(appNameOrKey) {
        const query = (appNameOrKey || '').toLowerCase().trim();
        let matchedKey = null;

        for (const [key, def] of Object.entries(this.appDefinitions)) {
            if (query.includes(key) || query.includes(def.name.toLowerCase())) {
                matchedKey = key;
                break;
            }
        }

        if (!matchedKey) {
            return {
                query,
                matched: false,
                installed: false,
                isRunning: false,
                error: `Unknown application query "${appNameOrKey}". App not recognized in registry.`
            };
        }

        const def = this.appDefinitions[matchedKey];
        let executablePath = null;

        for (const cand of def.candidatePaths) {
            if (fs.existsSync(cand)) {
                executablePath = cand;
                break;
            }
        }

        if (!executablePath) {
            for (const exe of def.executables) {
                try {
                    const whichCmd = process.platform === 'win32' ? `where ${exe}` : `which ${exe}`;
                    const res = execSync(whichCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\r\n')[0];
                    if (res && fs.existsSync(res)) {
                        executablePath = res;
                        break;
                    }
                } catch (e) {}
            }
        }

        const installed = executablePath !== null;
        const runningInfo = this.checkRunningState(def.executables);

        return {
            query,
            appKey: matchedKey,
            name: def.name,
            matched: true,
            installed,
            executablePath: executablePath || 'Not Found',
            isRunning: runningInfo.isRunning,
            processes: runningInfo.processes
        };
    }

    checkRunningState(executables) {
        let isRunning = false;
        let processes = [];

        if (process.platform === 'win32') {
            for (const exe of executables) {
                const procName = exe.replace(/\.exe$/i, '');
                try {
                    const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name '${procName}' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json"`;
                    const out = execSync(psCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                    if (out) {
                        const parsed = JSON.parse(out);
                        const list = Array.isArray(parsed) ? parsed : [parsed];
                        if (list.length > 0) {
                            isRunning = true;
                            processes.push(...list.map(p => ({ pid: p.Id, name: p.ProcessName, title: p.MainWindowTitle })));
                        }
                    }
                } catch (e) {}
            }
        }

        return { isRunning, processes };
    }

    listAllApps() {
        const results = {};
        for (const key of Object.keys(this.appDefinitions)) {
            results[key] = this.resolveApp(key);
        }
        return results;
    }
}

module.exports = new AppResolver();
