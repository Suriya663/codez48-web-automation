/**
 * CODEZ48 CONTACT & EXCEL READER
 *
 * Robust parsing and normalization of recipient data from:
 *   1. Excel files (.xlsx, .xls) via OpenXML & COM automation
 *   2. Word documents (.docx, .doc) via OpenXML & COM
 *   3. CSV files (.csv) via RFC-4180 UTF-8 streaming
 *   4. Text files (.txt) with comma or newline separation
 *   4. Manual comma-separated strings of phone numbers or usernames
 *
 * Automatically detects column headers: 'phone', 'mobile', 'number', 'contact', 'whatsapp', 'username', 'name'.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class ContactReader {
    /**
     * Clean and normalize a phone number or username
     */
    normalizeRecipient(raw, defaultCountryCode = '91') {
        if (!raw) return null;
        const str = String(raw).trim();
        if (str.length === 0) return null;

        // Check if it's primarily numeric (a phone number)
        const digitsOnly = str.replace(/\D/g, '');

        if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            let cleanNumber = digitsOnly;
            // If 10 digits without country code, prefix defaultCountryCode
            if (digitsOnly.length === 10) {
                cleanNumber = `${defaultCountryCode}${digitsOnly}`;
            }

            return {
                raw: str,
                cleanNumber: cleanNumber,
                display: `+${cleanNumber}`,
                isPhone: true,
                name: null
            };
        }

        // Otherwise treat as username or contact name
        return {
            raw: str,
            cleanNumber: null,
            display: str,
            isPhone: false,
            name: str
        };
    }

    /**
     * Parse manual comma-separated string of numbers or usernames
     */
    parseCommaSeparated(inputString, defaultCountryCode = '91') {
        if (!inputString) return [];
        const parts = String(inputString)
            .split(/[,;\n\r]+/)
            .map(s => s.trim())
            .filter(Boolean);

        const recipients = [];
        const seen = new Set();

        for (const part of parts) {
            const norm = this.normalizeRecipient(part, defaultCountryCode);
            if (norm) {
                const key = norm.cleanNumber || norm.display.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    recipients.push(norm);
                }
            }
        }

        return recipients;
    }

    /**
     * Read CSV file and extract contacts
     */
    readCsv(filePath, defaultCountryCode = '91') {
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return [];

        // Parse header line
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        let phoneColIdx = -1;
        let nameColIdx = -1;

        headers.forEach((h, idx) => {
            if (phoneColIdx === -1 && (h.includes('phone') || h.includes('mobile') || h.includes('number') || h.includes('contact') || h.includes('whatsapp') || h.includes('cell'))) {
                phoneColIdx = idx;
            }
            if (nameColIdx === -1 && (h.includes('name') || h.includes('user') || h.includes('client') || h.includes('customer'))) {
                nameColIdx = idx;
            }
        });

        // Default to column 0 if no header recognized
        if (phoneColIdx === -1) phoneColIdx = 0;

        const recipients = [];
        const seen = new Set();

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            const rawVal = row[phoneColIdx] || row[0];
            const nameVal = nameColIdx !== -1 ? row[nameColIdx] : null;

            const norm = this.normalizeRecipient(rawVal, defaultCountryCode);
            if (norm) {
                if (nameVal && !norm.name) norm.name = nameVal;
                const key = norm.cleanNumber || norm.display.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    recipients.push(norm);
                }
            }
        }

        return recipients;
    }

    /**
     * Read Excel (.xlsx, .xls) file using OpenXML ZipArchive and COM fallback
     */
    readExcel(filePath, defaultCountryCode = '91') {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Excel file not found at: ${resolvedPath}`);
        }

        let matrix = null;

        // Method 1: Fast & standard OpenXML ZipArchive extraction (built into .NET, requires no Excel app)
        const psZipScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${resolvedPath.replace(/\\/g, '\\\\')}')
    
    $sharedStrings = @()
    $sstEntry = $zip.GetEntry('xl/sharedStrings.xml')
    if ($sstEntry) {
        $stStream = $sstEntry.Open()
        $stReader = New-Object System.IO.StreamReader($stStream)
        $sstXml = $stReader.ReadToEnd()
        $stReader.Close()
        $stStream.Close()
        
        $matches = [regex]::Matches($sstXml, '(?s)<t[^>]*>(.*?)</t>')
        foreach ($m in $matches) {
            $sharedStrings += $m.Groups[1].Value
        }
    }

    $sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
    if (-not $sheetEntry) {
        $sheetEntry = $zip.Entries | Where-Object { $_.FullName -like "xl/worksheets/sheet*.xml" } | Select-Object -First 1
    }
    
    $shStream = $sheetEntry.Open()
    $shReader = New-Object System.IO.StreamReader($shStream)
    $sheetXml = $shReader.ReadToEnd()
    $shReader.Close()
    $shStream.Close()
    $zip.Dispose()

    $matrix = @()
    $rowMatches = [regex]::Matches($sheetXml, '(?s)<row[^>]*>(.*?)</row>')
    foreach ($rm in $rowMatches) {
        $rContent = $rm.Groups[1].Value
        $cMatches = [regex]::Matches($rContent, '(?s)<c([^>]*)>(.*?)</c>')
        $rowVals = @()
        foreach ($cm in $cMatches) {
            $cAttr = $cm.Groups[1].Value
            $cBody = $cm.Groups[2].Value
            $val = ""
            if ($cAttr -match 't="inlineStr"') {
                $tMatch = [regex]::Match($cBody, '(?s)<t[^>]*>(.*?)</t>')
                if ($tMatch.Success) { $val = $tMatch.Groups[1].Value }
            } elseif ($cAttr -match 't="s"') {
                $vMatch = [regex]::Match($cBody, '(?s)<v>(.*?)</v>')
                if ($vMatch.Success) {
                    $idx = [int]$vMatch.Groups[1].Value
                    if ($idx -ge 0 -and $idx -lt $sharedStrings.Count) {
                        $val = $sharedStrings[$idx]
                    }
                }
            } else {
                $vMatch = [regex]::Match($cBody, '(?s)<v>(.*?)</v>')
                if ($vMatch.Success) { $val = $vMatch.Groups[1].Value }
                else {
                    $tMatch = [regex]::Match($cBody, '(?s)<t[^>]*>(.*?)</t>')
                    if ($tMatch.Success) { $val = $tMatch.Groups[1].Value }
                }
            }
            $rowVals += $val
        }
        $matrix += ,$rowVals
    }
    $matrix | ConvertTo-Json -Compress
} catch {}
`;

        const encodedZip = Buffer.from(psZipScript, 'utf16le').toString('base64');
        const resZip = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encodedZip], {
            encoding: 'utf8',
            timeout: 10000,
            maxBuffer: 10 * 1024 * 1024
        });

        if (resZip.stdout && resZip.stdout.trim().length > 10) {
            try {
                const parsed = JSON.parse(resZip.stdout.trim());
                matrix = parsed.map(item => item.value || item);
            } catch (_) {}
        }

        // Method 2: COM fallback for legacy .xls binary format or complex workbooks
        if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
            const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $wb = $excel.Workbooks.Open('${resolvedPath.replace(/\\/g, '\\\\')}')
    $ws = $wb.Worksheets.Item(1)
    $used = $ws.UsedRange
    $rows = $used.Rows.Count
    $cols = $used.Columns.Count
    $data = @()
    for ($r = 1; $r -le [Math]::Min($rows, 2000); $r++) {
        $row = @()
        for ($c = 1; $c -le $cols; $c++) {
            $row += $ws.Cells.Item($r, $c).Text
        }
        $data += ,$row
    }
    $wb.Close($false)
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    $data | ConvertTo-Json -Compress
} catch {}
`;

            const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
            const res = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
                encoding: 'utf8',
                timeout: 20000,
                maxBuffer: 10 * 1024 * 1024
            });

            if (res.stdout && res.stdout.trim().length > 10) {
                try {
                    const parsed = JSON.parse(res.stdout.trim());
                    matrix = parsed.map(item => item.value || item);
                } catch (_) {}
            }
        }

        // Method 3: SpreadsheetML text fallback
        if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
            try {
                const text = fs.readFileSync(resolvedPath, 'utf8');
                if (text.includes('<Row') || text.includes('<ss:Row')) {
                    const rowMatches = text.match(/<(?:ss:)?Row[\s\S]*?<\/(?:ss:)?Row>/gi) || [];
                    if (rowMatches.length > 0) {
                        matrix = [];
                        for (const rXml of rowMatches) {
                            const cells = (rXml.match(/<(?:ss:)?Data[^>]*>([\s\S]*?)<\/(?:ss:)?Data>/gi) || [])
                                .map(d => d.replace(/<[^>]+>/g, '').trim());
                            if (cells.length > 0) matrix.push(cells);
                        }
                    }
                }
            } catch (_) {}
        }

        if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
            throw new Error(`Failed to extract data from Excel file. Ensure file is not corrupt.`);
        }

        // Header detection
        const headers = (matrix[0] || []).map(h => String(h || '').trim().toLowerCase());
        let phoneColIdx = -1;
        let nameColIdx = -1;

        // Pass 1: Strict name detection
        headers.forEach((h, idx) => {
            if (nameColIdx === -1 && (h === 'name' || h.endsWith('_name') || h.startsWith('name_') || h.includes('contact_name') || h.includes('customer') || h.includes('user'))) {
                nameColIdx = idx;
            }
        });

        // Pass 2: Phone / Mobile detection
        headers.forEach((h, idx) => {
            if (phoneColIdx === -1 && (h.includes('phone') || h.includes('mobile') || h.includes('cell') || h.includes('tel') || h.includes('whatsapp') || (h.includes('number') && !h.includes('serial')))) {
                phoneColIdx = idx;
            }
        });

        // Pass 3: Fallback based on actual cell content in first data row
        if (phoneColIdx === -1 || (matrix[1] && String(matrix[1][phoneColIdx] || '').replace(/\D/g, '').length < 7)) {
            for (let c = 0; c < (matrix[1] || []).length; c++) {
                const sample = String(matrix[1][c] || '').replace(/\D/g, '');
                if (sample.length >= 7) {
                    phoneColIdx = c;
                    break;
                }
            }
        }

        if (nameColIdx === -1) {
            for (let c = 0; c < (matrix[1] || []).length; c++) {
                if (c !== phoneColIdx && isNaN(matrix[1][c])) {
                    nameColIdx = c;
                    break;
                }
            }
        }

        if (phoneColIdx === -1) phoneColIdx = 0;

        const recipients = [];
        const seen = new Set();

        for (let r = 1; r < matrix.length; r++) {
            const row = matrix[r] || [];
            const rawVal = row[phoneColIdx] || row[0];
            const nameVal = nameColIdx !== -1 ? row[nameColIdx] : null;

            const norm = this.normalizeRecipient(rawVal, defaultCountryCode);
            if (norm) {
                if (nameVal && !norm.name) norm.name = String(nameVal).trim();
                const key = norm.cleanNumber || norm.display.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    recipients.push(norm);
                }
            }
        }

        return recipients;
    }

    /**
     * Read Word document (.docx, .doc) and extract contacts and mobile numbers
     */
    readWordDocument(filePath, defaultCountryCode = '91') {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Word document not found at: ${resolvedPath}`);
        }

        let rawText = '';

        // Method 1: Fast OpenXML ZipArchive extraction on word/document.xml with paragraph preservation
        const psZipScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${resolvedPath.replace(/\\/g, '/')}')
    $docEntry = $zip.Entries | Where-Object { ($_.FullName -replace '\\\\','/').ToLower() -eq 'word/document.xml' } | Select-Object -First 1
    if ($docEntry) {
        $stream = $docEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xml = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()

        $pMatches = [regex]::Matches($xml, '(?s)<w:p[^>]*>(.*?)</w:p>')
        $lines = @()
        foreach ($p in $pMatches) {
            $tMatches = [regex]::Matches($p.Groups[1].Value, '(?s)<w:t[^>]*>(.*?)</w:t>')
            $words = @()
            foreach ($t in $tMatches) { $words += $t.Groups[1].Value }
            if ($words.Count -gt 0) {
                $lines += ($words -join ' ')
            }
        }
        Write-Output ($lines -join [Environment]::NewLine)
    }
} catch {}
`;
        const encodedZip = Buffer.from(psZipScript, 'utf16le').toString('base64');
        const resZip = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encodedZip], {
            encoding: 'utf8',
            timeout: 10000,
            maxBuffer: 10 * 1024 * 1024
        });

        if (resZip.stdout && resZip.stdout.trim().length > 0) {
            rawText = resZip.stdout.trim();
        }

        // Method 2: COM Word fallback
        if (!rawText || rawText.length < 5) {
            const psComScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = $false
    $doc = $word.Documents.Open('${resolvedPath.replace(/\\/g, '/')}')
    $text = $doc.Content.Text
    $doc.Close($false)
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Output $text
} catch {}
`;
            const encodedCom = Buffer.from(psComScript, 'utf16le').toString('base64');
            const resCom = spawnSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encodedCom], {
                encoding: 'utf8',
                timeout: 15000,
                maxBuffer: 10 * 1024 * 1024
            });
            if (resCom.stdout && resCom.stdout.trim().length > 0) {
                rawText = resCom.stdout.trim();
            }
        }

        if (!rawText || rawText.length === 0) {
            throw new Error(`Failed to extract text from Word document: ${resolvedPath}`);
        }

        const recipients = [];
        const seen = new Set();

        // 1. Line-by-line inspection (extracting names and numbers)
        const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const phoneMatch = line.match(/(?:\+?\d{1,4}[\s.-]*)?(?:\(?\d{2,5}\)?[\s.-]*){2,4}\d{2,5}/);
            if (phoneMatch) {
                const numStr = phoneMatch[0].replace(/\D/g, '');
                if (numStr.length >= 7 && numStr.length <= 15) {
                    const norm = this.normalizeRecipient(phoneMatch[0], defaultCountryCode);
                    if (norm) {
                        const namePart = line.substring(0, phoneMatch.index).replace(/[:\-–—|,\s]+$/, '').trim();
                        if (namePart.length > 1 && !namePart.match(/^\d+$/)) {
                            norm.name = namePart;
                        }
                        const key = norm.cleanNumber || norm.display.toLowerCase();
                        if (!seen.has(key)) {
                            seen.add(key);
                            recipients.push(norm);
                        }
                    }
                }
            }
        }

        // 2. Global fallback across entire text if line parsing missed any
        const allMatches = rawText.match(/(?:\+?\d{10,13})/g) || [];
        for (const m of allMatches) {
            const norm = this.normalizeRecipient(m, defaultCountryCode);
            if (norm) {
                const key = norm.cleanNumber || norm.display.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    recipients.push(norm);
                }
            }
        }

        return recipients;
    }

    /**
     * Universal loader: accepts a file path (Excel, Word, CSV, TXT) or raw comma-separated string
     */
    loadRecipients(input, defaultCountryCode = '91') {
        if (!input) return [];
        const trimmed = String(input).trim();

        // Check if it's an existing file path
        if (fs.existsSync(trimmed)) {
            const ext = path.extname(trimmed).toLowerCase();
            if (ext === '.xlsx' || ext === '.xls') {
                return this.readExcel(trimmed, defaultCountryCode);
            } else if (ext === '.docx' || ext === '.doc') {
                return this.readWordDocument(trimmed, defaultCountryCode);
            } else if (ext === '.csv') {
                return this.readCsv(trimmed, defaultCountryCode);
            } else {
                // Read text file
                const text = fs.readFileSync(trimmed, 'utf8');
                return this.parseCommaSeparated(text, defaultCountryCode);
            }
        }

        // Otherwise parse directly as comma-separated string
        return this.parseCommaSeparated(trimmed, defaultCountryCode);
    }
}

module.exports = new ContactReader();
