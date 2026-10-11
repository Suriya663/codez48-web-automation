const http = require('http');
const crypto = require('crypto');

class Test8Server {
    constructor(port = 4870) {
        this.port = port;
        this.server = null;
        this.versionCounter = 1;
        this.dropLog = [];
        this.muted = false; // For negative control (b): mutated server does nothing

        // Server state: cards and their assigned columns
        this.state = {
            cards: {
                'Card Alpha': 'Backlog',
                'Card Beta': 'In Progress',
                'Card Gamma': 'Backlog'
            },
            columns: ['Backlog', 'In Progress', 'Approved', 'Restricted']
        };
    }

    start(layoutSeed = 101) {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://127.0.0.1:${this.port}`);

                if (url.pathname === '/api/state') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ version: this.versionCounter, state: this.state }));
                }

                if (url.pathname === '/api/droplog') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify(this.dropLog));
                }

                if (url.pathname === '/api/drop' && req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        const payload = JSON.parse(body || '{}');
                        const { card, targetColumn } = payload;

                        if (this.muted) {
                            // Mutated fixture mode: do nothing
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: false, message: 'MUTATED_FIXTURE_NO_OP' }));
                        }

                        if (targetColumn === 'Restricted') {
                            // Column rejects cards with 409
                            res.writeHead(409, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ error: 'COLUMN_REJECTED', message: 'Restricted column rejects cards.' }));
                        }

                        if (this.state.cards[card]) {
                            this.state.cards[card] = targetColumn;
                            this.versionCounter++;
                            const logEntry = { id: crypto.randomUUID(), card, targetColumn, timestamp: Date.now(), version: this.versionCounter };
                            this.dropLog.push(logEntry);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ success: true, logEntry, version: this.versionCounter }));
                        }

                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'INVALID_CARD' }));
                    });
                    return;
                }

                if (url.pathname === '/') {
                    // Serve dynamic HTML board with layout seed randomization
                    const html = this.renderHTML(layoutSeed);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    return res.end(html);
                }

                res.writeHead(404);
                res.end('Not Found');
            });

            this.server.listen(this.port, '127.0.0.1', () => {
                console.log(`[TEST8 SERVER] Running on http://127.0.0.1:${this.port} (seed: ${layoutSeed})`);
                resolve();
            });
        });
    }

    renderHTML(seed) {
        // Randomized IDs and styling offsets derived from layout seed
        const idPrefix = `id_${seed}_${Math.floor(Math.sin(seed) * 10000)}`;
        const colPadding = 20 + (seed % 15);
        const cardMargin = 10 + (seed % 10);

        return `<!DOCTYPE html>
<html>
<head>
    <title>Test 8 Kanban Board</title>
    <style>
        body { font-family: sans-serif; padding: ${colPadding}px; background: #f4f5f7; }
        .board { display: flex; gap: 20px; }
        .column { background: #ebecf0; border-radius: 8px; width: 220px; padding: 15px; min-height: 300px; }
        .card { background: white; padding: 12px; margin-bottom: ${cardMargin}px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); cursor: grab; }
        .column-header { font-weight: bold; margin-bottom: 12px; }
    </style>
</head>
<body>
    <h1>Kanban Board (Seed: ${seed})</h1>
    <div class="board" id="${idPrefix}_board">
        ${this.state.columns.map(col => `
            <div class="column" id="${idPrefix}_col_${col.replace(/\s+/g, '')}" data-column="${col}">
                <div class="column-header">${col}</div>
                ${Object.entries(this.state.cards).filter(([_, cCol]) => cCol === col).map(([cardName, _]) => `
                    <div class="card" id="${idPrefix}_card_${cardName.replace(/\s+/g, '')}" draggable="true" data-card="${cardName}">
                        ${cardName}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
    <script>
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', card.getAttribute('data-card'));
            });
        });
        document.querySelectorAll('.column').forEach(col => {
            col.addEventListener('dragover', e => e.preventDefault());
            col.addEventListener('drop', async e => {
                e.preventDefault();
                const card = e.dataTransfer.getData('text/plain');
                const targetColumn = col.getAttribute('data-column');
                const res = await fetch('/api/drop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ card, targetColumn })
                });
                if (res.ok) {
                    location.reload();
                } else {
                    alert('Drop rejected');
                }
            });
        });
    </script>
</body>
</html>`;
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[TEST8 SERVER] Stopped.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Test8Server;
