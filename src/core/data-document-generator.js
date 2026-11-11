/**
 * CODEZ48 DATA & DOCUMENT GENERATOR
 * Generates professional native Excel (.xlsx) spreadsheets (via Office Open XML SpreadsheetML in a ZIP container),
 * clean JSON files, structured text files, and comprehensive documentation reports without external dependencies.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('./logger');

class SimpleZipWriter {
    constructor() {
        this.entries = [];
        this.crcTable = SimpleZipWriter.makeCrcTable();
    }

    static makeCrcTable() {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        return table;
    }

    crc32(buf) {
        if (typeof zlib.crc32 === 'function') {
            return zlib.crc32(buf);
        }
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ this.crcTable[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    addFile(relativePath, buffer) {
        const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer, 'utf8');
        const compressed = zlib.deflateRawSync(data);
        const crc = this.crc32(data);

        this.entries.push({
            filename: cleanPath,
            uncompressedSize: data.length,
            compressedSize: compressed.length,
            crc: crc,
            compressedData: compressed,
            offset: 0
        });
    }

    toBuffer() {
        const localHeaders = [];
        const centralDirectory = [];
        let offset = 0;

        const now = new Date();
        const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
        const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

        for (const entry of this.entries) {
            entry.offset = offset;
            const filenameBytes = Buffer.from(entry.filename, 'utf8');

            const localHeader = Buffer.alloc(30 + filenameBytes.length);
            localHeader.writeUInt32LE(0x04034b50, 0);
            localHeader.writeUInt16LE(20, 4);
            localHeader.writeUInt16LE(0, 6);
            localHeader.writeUInt16LE(8, 8);
            localHeader.writeUInt16LE(dosTime, 10);
            localHeader.writeUInt16LE(dosDate, 12);
            localHeader.writeUInt32LE(entry.crc, 14);
            localHeader.writeUInt32LE(entry.compressedSize, 18);
            localHeader.writeUInt32LE(entry.uncompressedSize, 22);
            localHeader.writeUInt16LE(filenameBytes.length, 26);
            localHeader.writeUInt16LE(0, 28);
            filenameBytes.copy(localHeader, 30);

            localHeaders.push(localHeader);
            localHeaders.push(entry.compressedData);

            offset += localHeader.length + entry.compressedData.length;

            const cdHeader = Buffer.alloc(46 + filenameBytes.length);
            cdHeader.writeUInt32LE(0x02014b50, 0);
            cdHeader.writeUInt16LE(20, 4);
            cdHeader.writeUInt16LE(20, 6);
            cdHeader.writeUInt16LE(0, 8);
            cdHeader.writeUInt16LE(8, 10);
            cdHeader.writeUInt16LE(dosTime, 12);
            cdHeader.writeUInt16LE(dosDate, 14);
            cdHeader.writeUInt32LE(entry.crc, 16);
            cdHeader.writeUInt32LE(entry.compressedSize, 20);
            cdHeader.writeUInt32LE(entry.uncompressedSize, 24);
            cdHeader.writeUInt16LE(filenameBytes.length, 28);
            cdHeader.writeUInt16LE(0, 30);
            cdHeader.writeUInt16LE(0, 32);
            cdHeader.writeUInt16LE(0, 34);
            cdHeader.writeUInt16LE(0, 36);
            cdHeader.writeUInt32LE(0x20, 38);
            cdHeader.writeUInt32LE(entry.offset, 42);
            filenameBytes.copy(cdHeader, 46);

            centralDirectory.push(cdHeader);
        }

        const cdStartOffset = offset;
        let cdSize = 0;
        for (const cd of centralDirectory) {
            cdSize += cd.length;
        }

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(this.entries.length, 8);
        eocd.writeUInt16LE(this.entries.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStartOffset, 16);
        eocd.writeUInt16LE(0, 20);

        return Buffer.concat([...localHeaders, ...centralDirectory, eocd]);
    }
}

class DataDocumentGenerator {
    constructor() {}

    escapeXml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    columnLetter(colIndex) {
        let letter = '';
        let temp = colIndex + 1;
        while (temp > 0) {
            let remainder = (temp - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            temp = Math.floor((temp - 1) / 26);
        }
        return letter;
    }

    generateExcel(filePath, dataRows, sheetName = 'Sheet1') {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const rows = Array.isArray(dataRows) ? dataRows : [];

        // Build sheet XML
        let sheetDataXml = '';
        rows.forEach((row, rowIndex) => {
            const r = rowIndex + 1;
            sheetDataXml += `  <row r="${r}">\n`;
            const cells = Array.isArray(row) ? row : Object.values(row);
            cells.forEach((cellVal, colIndex) => {
                const colLetter = this.columnLetter(colIndex);
                const cellRef = `${colLetter}${r}`;
                const escaped = this.escapeXml(cellVal);
                // Check if numeric
                if (typeof cellVal === 'number' || (!isNaN(cellVal) && cellVal !== '')) {
                    sheetDataXml += `    <c r="${cellRef}"><v>${cellVal}</v></c>\n`;
                } else {
                    sheetDataXml += `    <c r="${cellRef}" t="inlineStr"><is><t>${escaped}</t></is></c>\n`;
                }
            });
            sheetDataXml += `  </row>\n`;
        });

        const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${this.escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

        const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

        const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

        const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.workbook+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

        const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${sheetDataXml}  </sheetData>
</worksheet>`;

        const zip = new SimpleZipWriter();
        zip.addFile('[Content_Types].xml', contentTypesXml);
        zip.addFile('_rels/.rels', relsXml);
        zip.addFile('xl/workbook.xml', workbookXml);
        zip.addFile('xl/_rels/workbook.xml.rels', workbookRelsXml);
        zip.addFile('xl/worksheets/sheet1.xml', worksheetXml);

        const buffer = zip.toBuffer();
        fs.writeFileSync(resolvedPath, buffer);
        logger.user(`\x1b[32m[EXCEL GENERATOR] Successfully created Excel spreadsheet: ${resolvedPath}\x1b[0m`);
        return { success: true, path: resolvedPath };
    }

    generateJson(filePath, data) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const jsonStr = JSON.stringify(data, null, 2);
        fs.writeFileSync(resolvedPath, jsonStr, 'utf8');
        logger.user(`\x1b[32m[JSON GENERATOR] Successfully created JSON file: ${resolvedPath}\x1b[0m`);
        return { success: true, path: resolvedPath };
    }

    generateText(filePath, textContent) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(resolvedPath, textContent, 'utf8');
        logger.user(`\x1b[32m[TEXT GENERATOR] Successfully created text file: ${resolvedPath}\x1b[0m`);
        return { success: true, path: resolvedPath };
    }

    generateDocumentation(filePath, title, sections = []) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        let md = `# ${title}\n\n*Generated by Codez48 AI Data Agent at ${new Date().toISOString()}*\n\n`;
        for (const sec of sections) {
            md += `## ${sec.heading}\n\n${sec.content}\n\n`;
        }

        fs.writeFileSync(resolvedPath, md, 'utf8');
        logger.user(`\x1b[32m[DOCS GENERATOR] Successfully created documentation report: ${resolvedPath}\x1b[0m`);
        return { success: true, path: resolvedPath };
    }

    /**
     * Native OpenXML Word Document (.docx) Generator
     * Generates genuine, beautifully styled .docx files without requiring Word COM or external libraries.
     */
    generateWordDocx(filePath, title, subtitle = '', sections = []) {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const escapeXml = (str) => this.escapeXml(str);

        let bodyXml = '';

        // 1. Title Paragraph
        const safeTitle = escapeXml(title || 'Document');
        bodyXml += '  <w:p>\n    <w:pPr>\n      <w:jc w:val="left"/>\n      <w:spacing w:before="200" w:after="100"/>\n    </w:pPr>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Segoe UI Semibold" w:hAnsi="Segoe UI Semibold"/>\n        <w:b/>\n        <w:sz w:val="48"/>\n        <w:color w:val="0F2043"/>\n      </w:rPr>\n      <w:t>' + safeTitle + '</w:t>\n    </w:r>\n  </w:p>\n';

        // 2. Subtitle Paragraph
        if (subtitle) {
            bodyXml += '  <w:p>\n    <w:pPr>\n      <w:spacing w:after="300"/>\n    </w:pPr>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>\n        <w:i/>\n        <w:sz w:val="24"/>\n        <w:color w:val="475569"/>\n      </w:rPr>\n      <w:t>' + escapeXml(subtitle) + '</w:t>\n    </w:r>\n  </w:p>\n';
        }

        // 3. Sections
        (sections || []).forEach((sec, idx) => {
            const heading = escapeXml(sec.heading || ('Section ' + (idx + 1)));
            bodyXml += '  <w:p>\n    <w:pPr>\n      <w:spacing w:before="280" w:after="120"/>\n    </w:pPr>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Segoe UI Semibold" w:hAnsi="Segoe UI Semibold"/>\n        <w:b/>\n        <w:sz w:val="30"/>\n        <w:color w:val="0078D4"/>\n      </w:rPr>\n      <w:t>' + heading + '</w:t>\n    </w:r>\n  </w:p>\n';

            if (sec.body) {
                const paragraphs = String(sec.body).split(/\n\n+/);
                paragraphs.forEach(para => {
                    const trimmed = para.trim();
                    if (!trimmed) return;
                    bodyXml += '  <w:p>\n    <w:pPr>\n      <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>\n    </w:pPr>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>\n        <w:sz w:val="22"/>\n        <w:color w:val="1E293B"/>\n      </w:rPr>\n      <w:t xml:space="preserve">' + escapeXml(trimmed) + '</w:t>\n    </w:r>\n  </w:p>\n';
                });
            }

            if (sec.bullets && Array.isArray(sec.bullets)) {
                sec.bullets.forEach(b => {
                    bodyXml += '  <w:p>\n    <w:pPr>\n      <w:ind w:left="420" w:hanging="240"/>\n      <w:spacing w:after="80"/>\n    </w:pPr>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>\n        <w:sz w:val="22"/>\n        <w:color w:val="0078D4"/>\n        <w:b/>\n      </w:rPr>\n      <w:t>•  </w:t>\n    </w:r>\n    <w:r>\n      <w:rPr>\n        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>\n        <w:sz w:val="22"/>\n        <w:color w:val="334155"/>\n      </w:rPr>\n      <w:t xml:space="preserve">' + escapeXml(b) + '</w:t>\n    </w:r>\n  </w:p>\n';
                });
            }
        });

        bodyXml += '  <w:sectPr>\n    <w:pgSz w:w="12240" w:h="15840"/>\n    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>\n  </w:sectPr>\n';

        const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <w:body>\n' + bodyXml + '  </w:body>\n</w:document>';

        const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n</Types>';

        const relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>\n</Relationships>';

        const zip = new SimpleZipWriter();
        zip.addFile('[Content_Types].xml', contentTypesXml);
        zip.addFile('_rels/.rels', relsXml);
        zip.addFile('word/document.xml', documentXml);

        const buffer = zip.toBuffer();
        fs.writeFileSync(resolvedPath, buffer);
        logger.user('\x1b[32m[WORD GENERATOR] Successfully created Word (.docx) document: ' + resolvedPath + '\x1b[0m');
        return { success: true, path: resolvedPath, size: buffer.length };
    }
}

module.exports = new DataDocumentGenerator();
