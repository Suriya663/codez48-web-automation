const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

class Test9Server {
    constructor(port = 4874) {
        this.port = port;
        this.server = null;
        this.uploadDir = path.join(os.tmpdir(), `test9_server_uploads_${Date.now()}`);
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }

        this.uploads = new Map(); // receiptId -> upload info
        this.rejectMode = false;  // Negative control (a): 413 / scan failed
        this.dropMode = false;    // Negative control (b): drop connection at 50%
        this.corruptMode = false; // Negative control (c): corrupt bytes on save
    }

    start() {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://127.0.0.1:${this.port}`);

                if (url.pathname === '/api/uploads') {
                    const list = Array.from(this.uploads.values());
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(list));
                }

                if (url.pathname === '/upload' && req.method === 'POST') {
                    if (this.rejectMode) {
                        res.writeHead(413, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: 'Upload rejected by server security scanner.' }));
                    }

                    const receiptId = `rcpt_${crypto.randomUUID()}`;
                    const fileName = req.headers['x-file-name'] || 'uploaded_file.bin';
                    const savePath = path.join(this.uploadDir, `${receiptId}_${fileName}`);
                    const hashStream = crypto.createHash('sha256');
                    const fileWriteStream = fs.createWriteStream(savePath);

                    let receivedBytes = 0;
                    const totalHeaderBytes = parseInt(req.headers['content-length'] || '0');

                    req.on('data', chunk => {
                        receivedBytes += chunk.length;

                        if (this.dropMode && totalHeaderBytes > 0 && receivedBytes >= totalHeaderBytes / 2) {
                            console.log('[TEST9 SERVER] DROPPING CONNECTION AT 50% FOR NEGATIVE CONTROL (b)');
                            req.destroy(); // Abort socket
                            return;
                        }

                        if (this.corruptMode) {
                            // Corrupt first byte written to disk
                            const corruptedChunk = Buffer.from(chunk);
                            if (corruptedChunk.length > 0) corruptedChunk[0] = (corruptedChunk[0] + 1) % 256;
                            hashStream.update(corruptedChunk);
                            fileWriteStream.write(corruptedChunk);
                        } else {
                            hashStream.update(chunk);
                            fileWriteStream.write(chunk);
                        }
                    });

                    req.on('end', () => {
                        if (this.dropMode) return;

                        fileWriteStream.end();
                        const computedHash = hashStream.digest('hex');

                        const record = {
                            receiptId,
                            name: fileName,
                            size: receivedBytes,
                            sha256: computedHash,
                            savedPath: savePath,
                            status: 'processing',
                            timestamp: Date.now()
                        };

                        this.uploads.set(receiptId, record);

                        // Async processing state simulation (3 seconds)
                        setTimeout(() => {
                            if (this.uploads.has(receiptId)) {
                                this.uploads.get(receiptId).status = 'complete';
                                console.log(`[TEST9 SERVER] Upload ${receiptId} state moved to COMPLETE.`);
                            }
                        }, 3000);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ receiptId, status: 'processing' }));
                    });

                    return;
                }

                if (url.pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Real Upload Test Page</title>
    <style>
        body { font-family: sans-serif; padding: 40px; background: #f9fafb; }
        .upload-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 400px; }
        .styled-btn { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; display: inline-block; }
        #hidden-file-input { display: none; }
        #status-area { margin-top: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="upload-card">
        <h2>Secure File Upload</h2>
        <button class="styled-btn" id="upload-trigger-btn" onclick="document.getElementById('hidden-file-input').click()">
            Choose & Upload File
        </button>
        <input type="file" id="hidden-file-input" name="file" />
        <div id="status-area">Ready</div>
        <div id="receipt-area"></div>
    </div>
    <script>
        document.getElementById('hidden-file-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            document.getElementById('status-area').innerText = 'Uploading...';

            const res = await fetch('/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-File-Name': file.name,
                    'Content-Length': file.size
                },
                body: file
            });

            if (!res.ok) {
                document.getElementById('status-area').innerText = 'Upload Rejected (413)';
                return;
            }

            const data = await res.json();
            const receiptId = data.receiptId;
            document.getElementById('receipt-area').innerText = 'Receipt ID: ' + receiptId;

            // Poll GET /api/uploads until status is complete
            const checkInterval = setInterval(async () => {
                const listRes = await fetch('/api/uploads');
                const list = await listRes.json();
                const item = list.find(i => i.receiptId === receiptId);
                if (item && item.status === 'complete') {
                    document.getElementById('status-area').innerText = 'Processing Complete';
                    clearInterval(checkInterval);
                }
            }, 500);
        });
    </script>
</body>
</html>`);
                }

                res.writeHead(404);
                res.end('Not Found');
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                console.log(`[TEST9 SERVER] Running on http://127.0.0.1:${this.port}`);
                resolve();
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[TEST9 SERVER] Stopped.');
                    try { fs.rmSync(this.uploadDir, { recursive: true, force: true }); } catch (e) {}
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Test9Server;
