const counterEl = document.getElementById('counter-val');
const listEl = document.getElementById('device-list');
const btnEl = document.getElementById('interact-btn');
const statusEl = document.getElementById('status-msg');

async function fetchDevices() {
    try {
        const res = await fetch('/api/items');
        const data = await res.json();
        if (data.success) {
            counterEl.textContent = data.count;
            listEl.innerHTML = data.data.map(d => `<div class="device-item"><span>${d.name}</span><span style="color:#38bdf8">${d.temp}</span></div>`).join('');
            statusEl.textContent = `Live REST API connected (${data.count} items)`;
        }
    } catch (e) {
        statusEl.textContent = 'API connection error';
    }
}

btnEl.addEventListener('click', async () => {
    try {
        const nextId = parseInt(counterEl.textContent, 10) + 1;
        const res = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `Smart Node ${nextId}`, temp: `${(24 + nextId).toFixed(1)}°C` })
        });
        const data = await res.json();
        if (data.success) {
            await fetchDevices();
            console.log('[API LOG] Device added via REST POST request');
        }
    } catch (e) {
        statusEl.textContent = 'POST request failed';
    }
});

fetchDevices();