let count = 0;
const counterEl = document.getElementById('counter-val');
const btnEl = document.getElementById('interact-btn');
const statusEl = document.getElementById('status-msg');

btnEl.addEventListener('click', () => {
    count++;
    counterEl.textContent = count;
    statusEl.textContent = `Button clicked successfully! Count is now ${count}`;
    console.log(`[APP LOG] Counter updated to ${count}`);
});