const fs = require('fs');
const path = require('path');

const baseDir = 'codez48cli';
console.log('=== PART 2: ADAPTER FILES CHECK ===');
function findAdapters(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir).forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.artifacts') return;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAdapters(fullPath, results);
        } else if (file.includes('adapter.js')) {
            results.push(fullPath);
        }
    });
    return results;
}
console.log(findAdapters(baseDir));

console.log('=== PART 3: EXECUTE BROWSER TASK GREP ===');
function searchPattern(dir, pattern, results = []) {
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir).forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.artifacts') return;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchPattern(fullPath, pattern, results);
        } else if (file.endsWith('.js')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(pattern)) {
                    results.push(fullPath);
                }
            } catch(e) {}
        }
    });
    return results;
}
console.log('executeBrowserTask matches:', searchPattern(baseDir, 'executeBrowserTask'));

console.log('=== PILOT-CONTROLLER.JS CONTENT ===');
try {
    const pcPath = path.join(baseDir, 'src/pilot/pilot-controller.js');
    console.log(fs.readFileSync(pcPath, 'utf8'));
} catch(e) {
    console.log('Error reading pilot-controller.js:', e.message);
}
