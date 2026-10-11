const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let items = [
    { id: 1, name: 'Smart Fan Controller', status: 'ACTIVE', temp: '24.5°C' },
    { id: 2, name: 'Exhaust Sensor V2', status: 'ACTIVE', temp: '28.1°C' }
];

app.get('/api/items', (req, res) => {
    res.json({ success: true, count: items.length, data: items });
});

app.post('/api/items', (req, res) => {
    const newItem = {
        id: items.length + 1,
        name: req.body.name || `Device_${Date.now()}`,
        status: req.body.status || 'ACTIVE',
        temp: req.body.temp || '25.0°C'
    };
    items.push(newItem);
    res.status(201).json({ success: true, message: 'Item added successfully', data: newItem });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[DYNAMIC EXPRESS APP] Live at http://localhost:${PORT}`);
    });
}

module.exports = app;