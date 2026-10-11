const fs = require('fs');
const path = require('path');
const nativeAppAutomation = require('./native-app-automation.js');

class DocumentAutomation {
    async createDocument(type, name, content = '', targetFolder = null) {
        const lowerType = (type || '').toLowerCase();
        const baseFolder = targetFolder || nativeAppAutomation.resolveDocPath('Documents');

        console.log(`[DOCUMENT AUTOMATION] Creating real document of type "${type}" named "${name}"...`);

        if (lowerType === 'pptx' || lowerType === 'presentation') {
            return await nativeAppAutomation.createPresentation(name, [{ title: name, content: [content || 'Product Demo Content'] }]);
        }

        if (lowerType === 'docx' || lowerType === 'doc' || lowerType === 'word') {
            return await nativeAppAutomation.createWordDocument(name, content || 'Document Body Content');
        }

        if (lowerType === 'csv') {
            const csvPath = path.join(baseFolder, name.endsWith('.csv') ? name : `${name}.csv`);
            const csvContent = `Header1,Header2,Header3\nValue1,Value2,Value3\n${content}`;
            fs.writeFileSync(csvPath, csvContent, 'utf8');
            const exists = fs.existsSync(csvPath) && fs.statSync(csvPath).isFile();
            return { success: exists, filePath: csvPath, message: `CSV created at ${csvPath}` };
        }

        // Default TXT
        const txtPath = path.join(baseFolder, name.endsWith('.txt') ? name : `${name}.txt`);
        fs.writeFileSync(txtPath, content || 'Text Document Content', 'utf8');
        const exists = fs.existsSync(txtPath) && fs.statSync(txtPath).isFile();
        return { success: exists, filePath: txtPath, message: `TXT created at ${txtPath}` };
    }
}

module.exports = new DocumentAutomation();
