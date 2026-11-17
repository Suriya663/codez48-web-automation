/**
 * CODEZ48 PILOT MOBILE CLIENT (Exact Kimi-style Visual Architecture)
 * Integrates:
 * - Left Drawer Navigation & History
 * - Bottom Action Sheet (+) with Camera, Photos, Local Files, Plugins, Skills
 * - Laptop Pilot Realtime Remote Execution & AI Chat
 * - Wireless Trackpad & Gyroscope Air-Mouse
 * - WhatsApp Automation Connector (+91 8248482844)
 * - Email OTP Verification
 */

const API_BASE = 'https://codez48.netlify.app/.netlify/functions';
let defaultLaptopIp = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? '10.30.23.18' : '127.0.0.1';
let savedIp = (typeof localStorage !== 'undefined' && localStorage.getItem('codez48_laptop_ip')) || defaultLaptopIp;
let LAPTOP_BRIDGE_URL = 'http://' + savedIp + ':4849';
let ws = null;
let currentUser = null;
let isPilotOnline = false;

// Mouse & Gyro State
let gyroActive = false;
let lastBeta = null;
let lastGamma = null;
let lastTouchX = null;
let lastTouchY = null;
let touchCount = 0;
let waStep = 1;

document.addEventListener('DOMContentLoaded', () => {
    initDrawer();
    initAttachSheet();
    initChat();
    initTouchpad();
    initGyro();
    loadSavedUser();
    checkLaptopStatus();
    setInterval(checkLaptopStatus, 6000);
});

// --- DRAWER NAVIGATION (Image 2) ---
function initDrawer() {
    const openBtn = document.getElementById('openDrawerBtn');
    const drawer = document.getElementById('sideDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const newChatBtn = document.getElementById('newChatDrawerBtn');

    openBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        backdrop.classList.add('active');
    });

    backdrop.addEventListener('click', closeDrawer);

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            closeDrawer();
            resetToHero();
        });
    }
}

function closeDrawer() {
    document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('drawerBackdrop').classList.remove('active');
}

// --- ATTACH ACTION SHEET (Image 3) ---
function initAttachSheet() {
    const openBtn = document.getElementById('openAttachSheetBtn');
    const sheet = document.getElementById('attachSheet');
    const backdrop = document.getElementById('sheetBackdrop');

    openBtn.addEventListener('click', () => {
        sheet.classList.add('open');
        backdrop.classList.add('active');
    });

    backdrop.addEventListener('click', closeAttachSheet);
}

function closeAttachSheet() {
    document.getElementById('attachSheet').classList.remove('open');
    document.getElementById('sheetBackdrop').classList.remove('active');
}

// --- CHAT & PROMPT EXECUTION ---
function initChat() {
    const input = document.getElementById('promptInput');
    const voiceBtn = document.getElementById('voiceBtn');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendPrompt();
        }
    });

    voiceBtn.addEventListener('click', () => {
        if (window.AndroidBridge) {
            window.AndroidBridge.showToast('Listening for voice prompt...');
            window.AndroidBridge.vibrate(30);
        } else {
            alert('Voice input active. Speak your command.');
        }
    });
}

function applyPrompt(promptText) {
    closeDrawer();
    closeAttachSheet();
    const input = document.getElementById('promptInput');
    input.value = promptText;
    handleSendPrompt();
}

async function handleSendPrompt() {
    const input = document.getElementById('promptInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Transition from Hero to Chat Stream
    document.getElementById('heroSection').style.display = 'none';
    const chatStream = document.getElementById('chatMessages');
    chatStream.style.display = 'flex';

    appendBubble('user', text);
    const pendingId = appendBubble('assistant', 'Thinking...');

    try {
        let answer = '';
        if (isPilotOnline) {
            const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: text, email: currentUser?.email })
            });
            const data = await res.json();
            answer = data.answer || data.message || 'Execution completed on laptop.';
        } else {
            const res = await fetch(`${API_BASE}/cli-ai-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, email: currentUser?.email })
            });
            const data = await res.json();
            answer = data.reply || data.answer || "⚠️ Laptop Pilot is offline. Run `codez48 pilot` in your terminal to execute desktop actions.";
        }

        updateBubble(pendingId, formatText(answer));
        if (window.AndroidBridge) window.AndroidBridge.vibrate(25);
    } catch (err) {
        updateBubble(pendingId, `⚠️ Error: ${err.message}. Ensure laptop pilot is running.`);
    }
}

function appendBubble(sender, text) {
    const stream = document.getElementById('chatMessages');
    const id = 'bubble_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `chat-bubble ${sender}`;
    div.innerHTML = formatText(text);
    stream.appendChild(div);
    const scroll = document.getElementById('mainScroll');
    scroll.scrollTop = scroll.scrollHeight;
    return id;
}

function updateBubble(id, formattedHtml) {
    const div = document.getElementById(id);
    if (div) {
        div.innerHTML = formattedHtml;
        const scroll = document.getElementById('mainScroll');
        scroll.scrollTop = scroll.scrollHeight;
    }
}

function formatText(t) {
    if (!t) return '';
    return t
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function resetToHero() {
    document.getElementById('chatMessages').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('heroSection').style.display = 'flex';
}

// --- TOUCHPAD & AIR-MOUSE MODAL ---
function openRemoteModal() {
    updateRemoteModalIp();
    closeDrawer();
    document.getElementById('remoteModal').classList.add('active');
}

function closeRemoteModal() {
    document.getElementById('remoteModal').classList.remove('active');
}

function initTouchpad() {
    const pad = document.getElementById('touchpadSurface');
    const leftBtn = document.getElementById('leftClickBtn');
    const rightBtn = document.getElementById('rightClickBtn');

    pad.addEventListener('touchstart', (e) => {
        touchCount = e.touches.length;
        if (touchCount === 1) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    pad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouchX !== null) {
            const dx = e.touches[0].clientX - lastTouchX;
            const dy = e.touches[0].clientY - lastTouchY;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            sendMouse({ action: 'move', dx, dy });
        } else if (e.touches.length === 2 && lastTouchY !== null) {
            const dy = e.touches[0].clientY - lastTouchY;
            lastTouchY = e.touches[0].clientY;
            sendMouse({ action: 'scroll', dy });
        }
    });

    pad.addEventListener('touchend', (e) => {
        if (touchCount === 1 && e.touches.length === 0) {
            sendMouse({ action: 'click' });
            if (window.AndroidBridge) window.AndroidBridge.vibrate(15);
        }
        lastTouchX = null;
        lastTouchY = null;
        touchCount = 0;
    });

    leftBtn.addEventListener('click', () => {
        sendMouse({ action: 'click' });
        if (window.AndroidBridge) window.AndroidBridge.vibrate(20);
    });

    rightBtn.addEventListener('click', () => {
        sendMouse({ action: 'right_click' });
        if (window.AndroidBridge) window.AndroidBridge.vibrate(30);
    });
}

function sendMouse(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'MOUSE', ...payload }));
        return;
    }
    fetch(`${LAPTOP_BRIDGE_URL}/api/mouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

// --- GYROSCOPE ---
function initGyro() {
    const toggle = document.getElementById('gyroToggle');
    const bgToggle = document.getElementById('bgToggle');

    toggle.addEventListener('change', () => {
        gyroActive = toggle.checked;
        if (gyroActive) {
            window.addEventListener('deviceorientation', handleOrientation);
            if (window.AndroidBridge) window.AndroidBridge.showToast('Gyroscope Active');
        } else {
            window.removeEventListener('deviceorientation', handleOrientation);
            lastBeta = null;
            lastGamma = null;
        }
    });

    bgToggle.addEventListener('change', () => {
        if (bgToggle.checked) {
            if (window.AndroidBridge) {
                const ip = LAPTOP_BRIDGE_URL.replace('http://', '').split(':')[0];
                window.AndroidBridge.startBackgroundGyro(ip, 4849);
            }
        } else {
            if (window.AndroidBridge) window.AndroidBridge.stopBackgroundGyro();
        }
    });
}

function handleOrientation(e) {
    if (!gyroActive) return;
    const beta = e.beta;
    const gamma = e.gamma;
    if (lastBeta !== null && lastGamma !== null) {
        const pitchDelta = beta - lastBeta;
        const rollDelta = gamma - lastGamma;
        if (Math.abs(pitchDelta) > 0.08 || Math.abs(rollDelta) > 0.08) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'GYRO', pitchDelta, rollDelta, sensitivity: 2.8 }));
            }
        }
    }
    lastBeta = beta;
    lastGamma = gamma;
}

// --- CONNECTORS (WhatsApp Automation) ---
function openConnectorsModal() {
    closeDrawer();
    document.getElementById('connectorsModal').classList.add('active');
}

function closeConnectorsModal() {
    document.getElementById('connectorsModal').classList.remove('active');
}

function nextConnectorStep() {
    waStep++;
    if (waStep > 3) waStep = 1;
    document.querySelectorAll('.stepper-step').forEach((s, idx) => {
        if (idx + 1 <= waStep) s.classList.add('active');
        else s.classList.remove('active');
    });
}

function sendWhatsAppConnect() {
    const number = '8248482844';
    const message = 'I am connected this automation tool';
    if (window.AndroidBridge) {
        window.AndroidBridge.launchWhatsApp(number, message);
        window.AndroidBridge.showToast('Opening WhatsApp...');
    } else {
        window.open(`https://wa.me/91${number}?text=${encodeURIComponent(message)}`, '_blank');
    }
}

// --- LAPTOP STATUS ---
async function checkLaptopStatus() {
    try {
        const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/status`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            isPilotOnline = true;
            document.querySelector('.model-mode').innerText = 'Online';
            const tag = document.getElementById('bridgeStatusTag');
            if (tag) { tag.innerText = 'ONLINE'; tag.style.background = '#dcfce7'; tag.style.color = '#15803d'; }
            document.querySelector('.model-mode').style.color = '#10b981';
            connectWs();
            return;
        }
    } catch (_) {}
    isPilotOnline = false;
    document.querySelector('.model-mode').innerText = 'High';
            const tag = document.getElementById('bridgeStatusTag');
            if (tag) { tag.innerText = 'OFFLINE'; tag.style.background = '#fee2e2'; tag.style.color = '#b91c1c'; }
    document.querySelector('.model-mode').style.color = '#9ca3af';
}

function connectWs() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    try {
        ws = new WebSocket(LAPTOP_BRIDGE_URL.replace('http', 'ws'));
    } catch (_) {}
}

// --- USER & OTP ---
function loadSavedUser() {
    const stored = localStorage.getItem('codez48_user_profile');
    if (stored) {
        try {
            currentUser = JSON.parse(stored);
            const name = currentUser.brand || currentUser.email.split('@')[0];
            document.getElementById('heroUserName').innerText = name;
            document.getElementById('drawerUserName').innerText = name;
            return;
        } catch (_) {}
    }
    document.getElementById('authModal').classList.add('active');
}

async function requestOtp() {
    const email = document.getElementById('authEmail').value.trim();
    if (!email || !email.includes('@')) return alert('Valid email required');

    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEND_OTP', email })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('otpStep').style.display = 'block';
            if (data.debugOtp) {
                const boxes = document.querySelectorAll('.otp-box');
                const str = String(data.debugOtp);
                boxes.forEach((b, i) => b.value = str[i] || '');
            }
        } else {
            alert(data.error || 'Failed to send code');
        }
    } catch (_) {
        alert('Authentication service error');
    }
}

async function verifyOtp() {
    const email = document.getElementById('authEmail').value.trim();
    let otp = '';
    document.querySelectorAll('.otp-box').forEach(b => otp += b.value);
    if (otp.length !== 6) return alert('Enter 6 digits');

    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'VERIFY_OTP', email, otp })
        });
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem('codez48_user_profile', JSON.stringify(data.user));
            const name = currentUser.brand || currentUser.email.split('@')[0];
            document.getElementById('heroUserName').innerText = name;
            document.getElementById('drawerUserName').innerText = name;
            document.getElementById('authModal').classList.remove('active');
            if (window.AndroidBridge) window.AndroidBridge.showToast('Verified Successfully!');
        } else {
            alert(data.error || 'Invalid OTP');
        }
    } catch (_) {
        alert('Verification error');
    }
}

// --- ATTACHMENT HANDLERS ---
function startCameraScan() {
    closeAttachSheet();
    applyPrompt('Open live camera OCR scanner');
}

function handleFileSelected(e) {
    closeAttachSheet();
    const file = e.target.files[0];
    if (file) {
        applyPrompt(`Analyze uploaded file: ${file.name}`);
    }
}

function openPlansModal() {
    closeDrawer();
    window.open('https://codez48.netlify.app/checkout?plan=PRO_499', '_blank');
}

function openTasksModal() {
    closeDrawer();
    applyPrompt('Show my active scheduled tasks');
}

function toggleWebSearch() {
    closeAttachSheet();
    if (window.AndroidBridge) window.AndroidBridge.showToast('Web Search: Auto Mode');
}

function saveLaptopIp() {
    const input = document.getElementById('laptopIpInput');
    if (!input) return;
    let ip = input.value.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    if (!ip) ip = '10.30.23.18';
    localStorage.setItem('codez48_laptop_ip', ip);
    LAPTOP_BRIDGE_URL = 'http://' + ip + ':4849';
    const tag = document.getElementById('bridgeStatusTag');
    if (tag) {
        tag.innerText = 'CONNECTING...';
        tag.style.background = '#fef3c7';
        tag.style.color = '#b45309';
    }
    checkLaptopStatus();
}

function updateRemoteModalIp() {
    const input = document.getElementById('laptopIpInput');
    if (input) {
        const curIp = (localStorage.getItem('codez48_laptop_ip') || defaultLaptopIp);
        input.value = curIp;
    }
}
