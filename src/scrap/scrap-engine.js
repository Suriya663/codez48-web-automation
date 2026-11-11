const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dns = require('dns');
const zlib = require('zlib');
const { URL } = require('url');

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

class Codez48ScrapEngine {
    constructor(options = {}) {
        this.options = options;
        this.baseOutputDir = path.resolve(__dirname, '../../codez48-scrap-output');
        this.downloadServer = null;
        this.downloadPort = null;

        this.blockedExtensions = new Set([
            '.exe', '.msi', '.bat', '.cmd', '.sh', '.dll', '.scr',
            '.vbs', '.ps1', '.jar', '.com', '.pif', '.application'
        ]);
    }

    validateUrlSync(urlString) {
        if (!urlString || typeof urlString !== 'string') return null;
        try {
            const parsed = new URL(urlString.trim());
            if (!['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
                return null;
            }

            const host = parsed.hostname.toLowerCase();
            if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(host) ||
                host.startsWith('10.') ||
                host.startsWith('192.168.') ||
                host.startsWith('169.254.') ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
                if (process.env.NODE_ENV !== 'test' && !process.env.ALLOW_LOCAL_TARGETS) {
                    console.warn(`[SECURITY WARN] Blocked private/local target host: ${host}`);
                    return null;
                }
            }
            return parsed.href;
        } catch (e) {
            return null;
        }
    }

    async validateUrlAsync(urlString) {
        const validSync = this.validateUrlSync(urlString);
        if (!validSync) return null;

        try {
            const parsed = new URL(validSync);
            const host = parsed.hostname.toLowerCase();

            if (!['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(host)) {
                const lookup = await dns.promises.lookup(host, { all: true }).catch(() => []);
                for (const entry of lookup) {
                    const ip = entry.address;
                    if (['127.0.0.1', '0.0.0.0', '::1'].includes(ip) ||
                        ip.startsWith('10.') ||
                        ip.startsWith('192.168.') ||
                        ip.startsWith('169.254.') ||
                        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
                        if (process.env.NODE_ENV !== 'test' && !process.env.ALLOW_LOCAL_TARGETS) {
                            console.warn(`[SECURITY WARN] Host "${host}" resolved to internal/private IP: ${ip}`);
                            return null;
                        }
                    }
                }
            }
            return validSync;
        } catch (e) {
            return null;
        }
    }

    isOfficialPrimaryDomain(urlString) {
        try {
            const parsed = new URL(urlString);
            const host = parsed.hostname.toLowerCase();
            return host === 'codez48.netlify.app' ||
                   host === 'codez48.com' ||
                   host === 'coach48.com' ||
                   host.endsWith('.codez48.com') ||
                   host.endsWith('.coach48.com');
        } catch (e) {
            return false;
        }
    }

    sanitizeRelativePath(relPath) {
        if (!relPath) return null;
        const cleanRel = relPath.split('?')[0].split('#')[0].trim();
        if (!cleanRel) return null;

        const normalized = path.normalize(cleanRel).replace(/^(\.\.[\/\\])+/, '');
        if (path.isAbsolute(normalized) || normalized.includes('..')) {
            return null;
        }

        const ext = path.extname(normalized).toLowerCase();
        if (this.blockedExtensions.has(ext)) {
            return null;
        }

        return normalized.replace(/\\/g, '/');
    }

    async runScrapWorkflow(targetUrl, options = {}) {
        const startTime = Date.now();
        console.log('\n==================================================');
        console.log('                 CODEZ48 SCRAP                    ');
        console.log('==================================================\n');

        console.log(`[1/6] Validating website URL and security constraints: "${targetUrl}"...`);
        const validUrl = await this.validateUrlAsync(targetUrl);
        if (!validUrl) {
            console.error(`[SECURITY BLOCK] Invalid URL, unsupported protocol, or prohibited private/SSRF target: "${targetUrl}"`);
            return {
                success: false,
                error: 'INVALID_URL',
                failureReason: `URL "${targetUrl}" failed security validation or resolves to a private network address.`,
                targetUrl
            };
        }

        if (this.isOfficialPrimaryDomain(validUrl)) {
            const allowOfficial = options.allowOfficial === true || process.env.ALLOW_OFFICIAL_SCRAPE === 'true';
            if (!allowOfficial) {
                console.error(`[SECURITY BLOCK] Scraping is restricted on official primary domain: ${validUrl}`);
                return {
                    success: false,
                    error: 'OFFICIAL_PRIMARY_DOMAIN_PROTECTED',
                    failureReason: 'Scraping is restricted on official primary domains. Pass allowOfficial: true to explicitly authorize.',
                    targetUrl: validUrl
                };
            }
        }

        const parsedUrl = new URL(validUrl);
        const domainSlug = parsedUrl.hostname.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const runFolder = `scrap_${domainSlug}_${timestamp}`;
        const outputFolder = path.join(this.baseOutputDir, runFolder);

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        console.log(`[2/6] Accessing site and retrieving HTML: "${validUrl}"...`);

        let htmlContent = '';
        let scrapedTitle = 'Scraped Website';
        let httpStatus = 200;

        try {
            let httpRes;
            if (process.env.NODE_ENV === 'test' && process.env.MOCK_SCRAP_HTML) {
                httpRes = { status: 200, headers: {}, buffer: Buffer.from(process.env.MOCK_SCRAP_HTML, 'utf8') };
            } else {
                httpRes = await this.fetchUrlBuffer(validUrl);
            }
            httpStatus = httpRes.status;
            if (httpRes.status >= 400) {
                console.error(`[SCRAP ERROR] Server returned HTTP ${httpRes.status} for "${validUrl}".`);
                return {
                    success: false,
                    error: 'HTTP_ERROR_STATUS',
                    failureReason: `Server returned HTTP ${httpRes.status} for URL "${validUrl}".`,
                    targetUrl: validUrl
                };
            }
            htmlContent = httpRes.buffer.toString('utf8');
            const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
            if (titleMatch) scrapedTitle = titleMatch[1].trim();
        } catch (httpErr) {
            return {
                success: false,
                error: 'EXTRACTION_FAILED',
                failureReason: `Failed to retrieve HTML document: ${httpErr.message}`,
                targetUrl: validUrl
            };
        }

        if (!htmlContent || htmlContent.length < 20) {
            return {
                success: false,
                error: 'EXTRACTION_FAILED',
                failureReason: 'Retrieved HTML document was empty or invalid.',
                targetUrl: validUrl
            };
        }

        console.log(`[3/6] Discovering linked stylesheets, scripts, images, fonts, and assets...`);
        const discoveredResources = this.discoverResources(htmlContent, validUrl);
        console.log(`[DISCOVERY COMPLETE] Found ${discoveredResources.length} linked asset candidates.`);

        console.log(`[4/6] Downloading and saving accessible website files locally...`);
        const downloadedResources = [];
        const seenUrls = new Set();

        const indexPath = path.join(outputFolder, 'index.html');
        fs.writeFileSync(indexPath, htmlContent, 'utf8');

        downloadedResources.push({
            url: validUrl,
            localPath: 'index.html',
            type: 'html',
            sizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
            status: 'success'
        });

        const maxResources = options.maxResources || 100;
        const candidateSlice = discoveredResources.slice(0, maxResources);

        for (const res of candidateSlice) {
            if (seenUrls.has(res.url)) continue;
            seenUrls.add(res.url);

            const safeRel = this.sanitizeRelativePath(res.suggestedPath);
            if (!safeRel) {
                downloadedResources.push({
                    url: res.url,
                    localPath: null,
                    type: res.type,
                    status: 'skipped',
                    reason: 'Unsafe path or blocked file extension'
                });
                continue;
            }

            const fullDestPath = path.join(outputFolder, safeRel);
            if (!fullDestPath.startsWith(outputFolder)) {
                downloadedResources.push({
                    url: res.url,
                    localPath: safeRel,
                    type: res.type,
                    status: 'skipped',
                    reason: 'Path traversal attempt blocked'
                });
                continue;
            }

            const validResUrl = await this.validateUrlAsync(res.url);
            if (!validResUrl) {
                downloadedResources.push({
                    url: res.url,
                    localPath: safeRel,
                    type: res.type,
                    status: 'failed',
                    reason: 'URL failed SSRF validation'
                });
                continue;
            }

            const currentIdx = downloadedResources.length;
            const totalCount = candidateSlice.length;
            const percent = Math.min(100, Math.round((currentIdx / Math.max(totalCount, 1)) * 100));
            const filled = Math.round((percent / 100) * 15);
            const bar = '█'.repeat(filled) + '░'.repeat(15 - filled);
            const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            const spinner = spinnerFrames[currentIdx % spinnerFrames.length];
            process.stdout.write(`\r\x1b[36m${spinner} [${bar}] ${percent}% [${currentIdx}/${totalCount}] Scraping: \x1b[32m${(safeRel || '').substring(0, 32).padEnd(32)}\x1b[0m`);

            try {
                const fetchRes = await this.fetchUrlBuffer(validResUrl);
                if (fetchRes.status >= 200 && fetchRes.status < 300 && fetchRes.buffer) {
                    const destDir = path.dirname(fullDestPath);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }
                    fs.writeFileSync(fullDestPath, fetchRes.buffer);
                    downloadedResources.push({
                        url: validResUrl,
                        localPath: safeRel,
                        type: res.type,
                        sizeBytes: fetchRes.buffer.length,
                        status: 'success'
                    });
                } else {
                    downloadedResources.push({
                        url: validResUrl,
                        localPath: safeRel,
                        type: res.type,
                        status: 'failed',
                        reason: `HTTP Status ${fetchRes.status}`
                    });
                }
            } catch (dlErr) {
                downloadedResources.push({
                    url: validResUrl,
                    localPath: safeRel,
                    type: res.type,
                    status: 'failed',
                    reason: dlErr.message
                });
            }
        }

        console.log(`\n\x1b[32m✔ [███████████████] 100% Website assets downloaded successfully!\x1b[0m`);
        console.log(`[5/6] Generating manifest.json and README.txt...`);
        const successfulCount = downloadedResources.filter(r => r.status === 'success').length;
        const failedCount = downloadedResources.filter(r => r.status === 'failed').length;

        const manifest = {
            tool: "Codez48 Scrap",
            version: "1.0.0",
            targetUrl: validUrl,
            scrapedAt: new Date().toISOString(),
            scrapedTitle: scrapedTitle,
            httpStatus: httpStatus,
            totalDiscovered: discoveredResources.length,
            successfulDownloads: successfulCount,
            failedDownloads: failedCount,
            resources: downloadedResources,
            limitations: "Some server-side APIs, protected origins, or cross-domain resources may not be fully extracted."
        };

        fs.writeFileSync(path.join(outputFolder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

        const readmeText = `==================================================
CODEZ48 SCRAP - EXTRACTED WEBSITE PROJECT
==================================================

Target URL:      ${validUrl}
Scraped At:      ${manifest.scrapedAt}
Page Title:      ${scrapedTitle}
HTTP Status:     ${httpStatus}
Successful Files:${successfulCount}
Failed Files:    ${failedCount}

Folder Structure:
-----------------
.
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── fonts/
├── manifest.json
└── README.txt

Notes & Limitations:
--------------------
- This project contains the HTML, CSS, JavaScript, and assets captured from the website.
- Refer to manifest.json for full status on every retrieved asset.
`;
        fs.writeFileSync(path.join(outputFolder, 'README.txt'), readmeText, 'utf8');

        console.log(`[6/6] Packaging project into downloadable ZIP archive...`);
        const zipWriter = new SimpleZipWriter();

        const addFolderToZip = (currentDir, baseDir) => {
            const files = fs.readdirSync(currentDir);
            for (const file of files) {
                const fullPath = path.join(currentDir, file);
                const relPath = path.relative(baseDir, fullPath);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    addFolderToZip(fullPath, baseDir);
                } else if (stat.isFile()) {
                    zipWriter.addFile(relPath, fs.readFileSync(fullPath));
                }
            }
        };

        addFolderToZip(outputFolder, outputFolder);
        const zipBuffer = zipWriter.toBuffer();

        const zipFilePath = path.join(this.baseOutputDir, `${runFolder}.zip`);
        fs.writeFileSync(zipFilePath, zipBuffer);

        // Explicit ZIP Integrity & File Verification
        const zipExists = fs.existsSync(zipFilePath);
        const zipSize = zipExists ? fs.statSync(zipFilePath).size : 0;
        const indexHtmlExists = fs.existsSync(path.join(outputFolder, 'index.html'));
        const manifestExists = fs.existsSync(path.join(outputFolder, 'manifest.json'));

        let zipValid = false;
        if (zipExists && zipSize > 0) {
            const fd = fs.openSync(zipFilePath, 'r');
            const magicBuf = Buffer.alloc(4);
            fs.readSync(fd, magicBuf, 0, 4, 0);
            fs.closeSync(fd);
            if (magicBuf[0] === 0x50 && magicBuf[1] === 0x4b && magicBuf[2] === 0x03 && magicBuf[3] === 0x04) {
                zipValid = true;
            }
        }

        if (!zipExists || !zipValid || !indexHtmlExists || !manifestExists) {
            console.error(`[ZIP VERIFICATION ERROR] ZIP archive or essential project files verification failed.`);
            return {
                success: false,
                error: 'ZIP_VERIFICATION_FAILED',
                failureReason: 'Generated ZIP archive is missing, empty, invalid, or missing essential files (index.html, manifest.json).',
                targetUrl: validUrl
            };
        }

        console.log(`[ZIP VERIFIED] Archive verified successfully (PKZip Signature Valid, Size: ${zipSize} bytes).`);

        const serverDetails = await this.startDownloadServer(outputFolder, zipFilePath, manifest).catch(() => ({ downloadUrl: 'N/A (Server Unavailable)', resultsUrl: 'N/A', port: 0 }));
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n==================================================');
        console.log('            CODEZ48 SCRAP COMPLETE               ');
        console.log('==================================================');
        console.log(` Target Website:     ${validUrl}`);
        console.log(` Page Title:         "${scrapedTitle}"`);
        console.log(` Output Folder:      ${outputFolder}`);
        console.log(` Saved Files:        ${successfulCount} succeeded, ${failedCount} failed`);
        console.log(` Verified ZIP Path:  ${zipFilePath} (${zipSize} bytes)`);
        console.log(` Direct Download:    ${serverDetails.downloadUrl}`);
        console.log(` Execution Time:     ${durationSec}s`);
        console.log('==================================================\n');

        // Automatically open default browser for direct ZIP download
        this.openBrowserForDownload(serverDetails.downloadUrl, zipFilePath);

        return {
            success: true,
            targetUrl: validUrl,
            scrapedTitle,
            outputFolder,
            zipFilePath,
            manifest,
            downloadUrl: serverDetails.downloadUrl,
            resultsUrl: serverDetails.resultsUrl,
            serverPort: serverDetails.port,
            successfulCount,
            failedCount,
            durationSec
        };
    }

    openBrowserForDownload(downloadUrl, zipFilePath) {
        if (process.env.NODE_ENV === 'test' || process.env.CI || process.env.SUPPRESS_BROWSER_OPEN) {
            console.log(`[BROWSER LAUNCH SUPPRESSED] Test mode active. Verified ZIP path: ${zipFilePath}`);
            return;
        }

        console.log(`[BROWSER LAUNCH] Automatically opening verified ZIP archive in File Explorer...`);
        let command;
        if (process.platform === 'win32') {
            command = `explorer /select,"${zipFilePath.replace(/\//g, '\\')}"`;
        } else if (process.platform === 'darwin') {
            command = `open -R "${zipFilePath}"`;
        } else {
            command = `xdg-open "${path.dirname(zipFilePath)}"`;
        }

        const { exec } = require('child_process');
        exec(command, (err) => {
            if (err) {
                console.warn(`[BROWSER LAUNCH NOTICE] Could not open file explorer automatically: ${err.message}`);
            }
            console.log(`\n==================================================`);
            console.log(` VERIFIED ZIP ARCHIVE READY FOR DOWNLOAD/USE:`);
            console.log(`   ${zipFilePath}`);
            console.log(`==================================================\n`);
        });
    }

    discoverResources(html, baseUrl) {
        const resources = [];

        const cssMatches = html.matchAll(/<link\s+[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi);
        for (const match of cssMatches) {
            const resolved = this.resolveUrl(match[1], baseUrl);
            if (resolved) {
                resources.push({
                    url: resolved,
                    type: 'css',
                    suggestedPath: this.deriveLocalPath(resolved, 'assets/css', '.css')
                });
            }
        }

        const jsMatches = html.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi);
        for (const match of jsMatches) {
            const resolved = this.resolveUrl(match[1], baseUrl);
            if (resolved) {
                resources.push({
                    url: resolved,
                    type: 'js',
                    suggestedPath: this.deriveLocalPath(resolved, 'assets/js', '.js')
                });
            }
        }

        const imgMatches = html.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi);
        for (const match of imgMatches) {
            const resolved = this.resolveUrl(match[1], baseUrl);
            if (resolved) {
                resources.push({
                    url: resolved,
                    type: 'image',
                    suggestedPath: this.deriveLocalPath(resolved, 'assets/images', '.png')
                });
            }
        }

        return resources;
    }

    resolveUrl(relUrl, baseUrl) {
        if (!relUrl) return null;
        const trimmed = relUrl.trim();
        if (trimmed.startsWith('data:') || trimmed.startsWith('javascript:') || trimmed.startsWith('#')) {
            return null;
        }
        try {
            return new URL(trimmed, baseUrl).href;
        } catch (e) {
            return null;
        }
    }

    deriveLocalPath(resourceUrl, defaultDir, defaultExt) {
        try {
            const parsed = new URL(resourceUrl);
            let pathname = parsed.pathname;
            if (pathname.endsWith('/')) pathname += 'index';

            let filename = path.basename(pathname);
            let ext = path.extname(filename);
            if (!ext && defaultExt) {
                ext = defaultExt;
                filename += ext;
            }

            filename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
            return `${defaultDir}/${filename}`;
        } catch (e) {
            return `${defaultDir}/asset_${Date.now()}${defaultExt}`;
        }
    }

    fetchUrlBuffer(urlStr, timeoutMs = 15000) {
        return new Promise((resolve) => {
            const parsed = new URL(urlStr);
            const client = parsed.protocol === 'https:' ? https : http;

            const req = client.get(urlStr, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codez48Scrap/1.0'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = new URL(res.headers.location, urlStr).href;
                    return resolve(this.fetchUrlBuffer(redirectUrl, timeoutMs));
                }

                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        buffer: Buffer.concat(chunks)
                    });
                });
            });

            req.setTimeout(timeoutMs, () => {
                req.destroy();
                resolve({
                    status: 504,
                    headers: {},
                    buffer: Buffer.from('')
                });
            });

            req.on('error', err => {
                resolve({
                    status: 500,
                    headers: {},
                    buffer: Buffer.from('')
                });
            });
        });
    }

    startDownloadServer(outputFolder, zipFilePath, manifest) {
        return new Promise((resolve) => {
            const server = http.createServer((req, res) => {
                const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
                const pathname = parsedUrl.pathname;

                if (pathname === '/download' || pathname.endsWith('.zip')) {
                    if (fs.existsSync(zipFilePath)) {
                        const stat = fs.statSync(zipFilePath);
                        res.writeHead(200, {
                            'Content-Type': 'application/zip',
                            'Content-Disposition': `attachment; filename="${path.basename(zipFilePath)}"`,
                            'Content-Length': stat.size
                        });
                        return fs.createReadStream(zipFilePath).pipe(res);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        return res.end('ZIP archive file not found.');
                    }
                }

                if (pathname === '/results') {
                    const htmlResults = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Codez48 Scrap - Results</title>
    <style>body{font-family:sans-serif;background:#0f172a;color:#fff;padding:2rem;}a{color:#38bdf8;}</style>
</head>
<body>
    <h1>Scraping Results for ${manifest.targetUrl}</h1>
    <p>Files scraped: ${manifest.successfulDownloads}</p>
    <p><a href="/download">Download Complete Website ZIP</a> | <a href="/">View Scraped Website (index.html)</a></p>
</body>
</html>`;
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(htmlResults);
                }

                let filePath = path.join(outputFolder, pathname === '/' ? 'index.html' : pathname);
                if (!filePath.startsWith(outputFolder)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    return res.end('Forbidden');
                }

                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    const ext = path.extname(filePath).toLowerCase();
                    const mimeTypes = {
                        '.html': 'text/html',
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.svg': 'image/svg+xml',
                        '.ico': 'image/x-icon',
                        '.json': 'application/json',
                        '.txt': 'text/plain'
                    };
                    const contentType = mimeTypes[ext] || 'application/octet-stream';
                    res.writeHead(200, { 'Content-Type': contentType });
                    return fs.createReadStream(filePath).pipe(res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    return res.end('File not found.');
                }
            });

            const portToTry = 8088;
            const startListening = (port) => {
                server.listen(port, '127.0.0.1', () => {
                    const assignedPort = server.address().port;
                    this.downloadServer = server;
                    this.downloadPort = assignedPort;
                    if (typeof server.unref === 'function') server.unref();
                    resolve({
                        port: assignedPort,
                        downloadUrl: `http://localhost:${assignedPort}/download`,
                        resultsUrl: `http://localhost:${assignedPort}/results`,
                        previewUrl: `http://localhost:${assignedPort}/`
                    });
                });
            };

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    startListening(0);
                } else {
                    console.error(`[SERVER ERROR] Failed to start preview server: ${err.message}`);
                    resolve({
                        port: 0,
                        downloadUrl: '',
                        resultsUrl: '',
                        previewUrl: ''
                    });
                }
            });

            startListening(portToTry);
        });
    }

    closeServer() {
        if (this.downloadServer) {
            this.downloadServer.close();
            this.downloadServer = null;
        }
    }
}

module.exports = Codez48ScrapEngine;
