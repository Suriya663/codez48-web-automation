const fs = require('fs');
const path = require('path');

function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('.artifacts') && !filePath.includes('.idea')) {
                scanDirectory(filePath, fileList);
            }
        } else {
            if (filePath.endsWith('.js') || filePath.endsWith('.md')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

function runRepositoryAudit() {
    console.log('=== CODEZ48 REPOSITORY DEEP AUDIT ===\n');
    const files = scanDirectory(process.cwd());
    console.log(`Files scanned: ${files.length}`);

    const patterns = ['canva', 'figma', 'github', 'wikipedia', '.first()', 'force-click', 'codez48.netlify.app'];
    const matches = [];

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            patterns.forEach(pat => {
                if (line.toLowerCase().includes(pat.toLowerCase())) {
                    let classification = 'GENERIC';
                    if (file.includes('scratch') || file.includes('test')) classification = 'TEST FIXTURE';
                    else if (file.includes('docs') || file.includes('README')) classification = 'DOCUMENTATION';
                    else if (line.includes('wikipedia') || line.includes('canva') || line.includes('figma')) {
                        classification = file.includes('cli.js') || file.includes('task-parser.js') ? 'LEGITIMATE EXCEPTION' : 'WEBSITE-SPECIFIC';
                    } else if (pat === '.first()') {
                        classification = 'POTENTIAL DEFECT';
                    }
                    matches.push({ file, lineNum: idx + 1, match: line.trim(), pattern: pat, classification });
                }
            });
        });
    });

    console.log(`Total matches found: ${matches.length}`);
    matches.forEach(m => {
        console.log(`[FILE]: ${m.file} (Line ${m.lineNum}) | [PATTERN]: ${m.pattern} | [CLASS]: ${m.classification}`);
        console.log(`[MATCH]: ${m.match}`);
        console.log('------------------------------------------------------------');
    });
}

runRepositoryAudit();
