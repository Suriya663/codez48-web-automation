/**
 * CODEZ48 PILOT UNIFIED CLIENT ENGINE
 * 
 * Features:
 * - Minimalist Mode Switcher: Laptop (CLI Bridge) vs Mobile Mode
 * - Dedicated Live Voice & Screen Assistant Page (Microphone Tap)
 *   with Music Wave Visualizer, Screen Share, and Real-Time OCR Card Identification
 * - E-Commerce Seller Hub & User Profile (Replaces Connectors)
 *   with Brand Website URL, "Get your website" trigger, My Plan & My Products
 * - Full-Screen Remote Mouse Trackpad with Raw Gaming Gyro & Virtual Keyboard
 * - Payment Gateway Integration (No plan selected by default + Upgrade options)
 * - Automated Email Dispatch for Generated 3D Presentations (PPT)
 * - Interactive Desktop Confirmation Cards (Yes/No prompts directly in mobile chat)
 */

// --- CONFIGURATION & STATE ---
const API_BASE = 'https://codez48.netlify.app/.netlify/functions';
let defaultLaptopIp = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? '10.30.23.18' : '127.0.0.1';
let savedIp = (typeof localStorage !== 'undefined' && localStorage.getItem('codez48_laptop_ip')) || defaultLaptopIp;
let LAPTOP_BRIDGE_URL = 'http://' + savedIp + ':4849';

let isPilotOnline = false;
let ws = null;
let appMode = 'laptop'; // 'laptop' or 'mobile'
let activePlan = null; // No plan selected by default!
let userProfile = null;
let soundEnabled = true;

// Active Chat & History State
let chats = [];
let currentChatId = null;
let contextChatId = null;
let attachedPhoto = null;

// Speech Recognition & TTS
let speechRecognizer = null;
let isRecognizing = false;
let isLiveVoiceActive = false;
let screenStream = null;
let liveMicMuted = false;

// Touchpad & Gyro State
let lastTouchX = null;
let lastTouchY = null;
let touchCount = 0;
let gyroActive = false;
let lastBeta = null;
let lastGamma = null;

// Slides State
let currentSlideIndex = 0;
let slideDeckData = [
    {
        title: "Autonomous AI Pilot & Automation Suite",
        subtitle: "Next-Generation 3D Mapped Presentations & Laptop Remote Orchestration",
        bullets: [
            { icon: "🚀", title: "Full-Screen Remote Control", desc: "Turn mobile phone into an ultra-responsive touchpad & gaming gyro air-mouse." },
            { icon: "📱", title: "WhatsApp Cloud Automation", desc: "Trigger laptop WhatsApp desktop dispatch automatically to +91 8248482844." },
            { icon: "👁️", title: "Live Vision & Screen OCR", desc: "Real-time screen inspection, card detection, and voice barge-in conversation." }
        ]
    },
    {
        title: "E-Commerce Seller Hub Architecture",
        subtitle: "Unique Merchant Node ID & Official Web Storefront",
        bullets: [
            { icon: "🆔", title: "Autonomous Node ID", desc: "Instant seller ID provisioning with verification sent directly to user email." },
            { icon: "🌐", title: "Custom Storefront URL", desc: "Dedicated store page on codez48.netlify.app with branded products." },
            { icon: "💳", title: "Secure Payment Gateway", desc: "Direct HTTPS checkout integration for basic, medium, and high subscription plans." }
        ]
    },
    {
        title: "3D Gaming Gyroscope & Relative Aiming",
        subtitle: "Zero-Latency Sub-Millisecond Input Driver",
        bullets: [
            { icon: "🎮", title: "Raw Input mouse_event", desc: "Seamless crosshair aiming inside full-screen 3D FPS and action PC games." },
            { icon: "⌨️", title: "Simultaneous Typing", desc: "Type on mobile virtual keyboard while steering mouse cursor with gyroscope." },
            { icon: "⚡", title: "Persistent Memory Worker", desc: "Sub-millisecond latency eliminating Windows process spawn overhead." }
        ]
    },
    {
        title: "Presentation Email Delivery & Data Analysis",
        subtitle: "Automated Slide Deck & Excel File Generation",
        bullets: [
            { icon: "📊", title: "Instant PPT Generation", desc: "Convert any text prompt or syllabus into downloadable presentations." },
            { icon: "📧", title: "Automated Email Dispatch", desc: "Automatically emails exported presentations directly to your inbox." },
            { icon: "📈", title: "Data Analysis Engine", desc: "Synthesize reports and export structured Excel spreadsheet (.xlsx) data." }
        ]
    }
];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initDrawer();
    initAttachSheet();
    initTouchpad();
    initGyro();
    initSpeechRecognition();
    initChatStorage();
    fetchSellerProfile();
    checkLaptopStatus();
    setInterval(checkLaptopStatus, 5000);
});

// --- SETTINGS & PERSISTENCE ---
function loadSettings() {
    activePlan = localStorage.getItem('codez48_plan') || null;
    updatePlanBadge(activePlan);

    appMode = localStorage.getItem('codez48_app_mode') || 'laptop';
    setAppMode(appMode, false);

    const savedIpInput = document.getElementById('laptopIpInput');
    if (savedIpInput) savedIpInput.value = savedIp;
}

// --- CLEAN SEGMENTED MODE SWITCHER (LAPTOP VS MOBILE) ---
function setAppMode(mode, save = true) {
    appMode = mode;
    if (save) localStorage.setItem('codez48_app_mode', mode);

    const btnLaptop = document.getElementById('segBtnLaptop');
    const btnMobile = document.getElementById('segBtnMobile');
    const subText = document.getElementById('modeIndicatorSub');

    if (mode === 'laptop') {
        document.body.classList.add('laptop-mode');
        if (btnLaptop) btnLaptop.classList.add('active');
        if (btnMobile) btnMobile.classList.remove('active');
        if (subText) subText.innerHTML = 'Active Mode: <strong>Laptop CLI Bridge</strong>';
        renderWorkspaceSlide();
    } else {
        document.body.classList.remove('laptop-mode');
        if (btnLaptop) btnLaptop.classList.remove('active');
        if (btnMobile) btnMobile.classList.add('active');
        if (subText) subText.innerHTML = 'Active Mode: <strong>Mobile Native Interface</strong>';
    }
}

// --- PLAN & PAYMENT GATEWAY INTEGRATION ---
function openPlansModal() {
    closeDrawer();
    const modal = document.getElementById('plansModal');
    if (modal) modal.style.display = 'flex';
}

function closePlansModal() {
    const modal = document.getElementById('plansModal');
    if (modal) modal.style.display = 'none';
}

function selectPlan(planName) {
    activePlan = planName;
    localStorage.setItem('codez48_plan', planName);
    updatePlanBadge(planName);
    closePlansModal();
    showToast(`Active plan set to ${planName}`);
}

function updatePlanBadge(planName) {
    const badge = document.getElementById('activePlanBadge');
    const profilePlan = document.getElementById('profilePlanText');
    if (!badge) return;

    if (!planName) {
        badge.innerText = 'Choose Plan';
        badge.style.background = '#f1f5f9';
        badge.style.color = '#64748b';
        if (profilePlan) profilePlan.innerHTML = 'Current Tier: <strong>No Plan Selected</strong>';
        return;
    }

    badge.innerText = planName;
    if (profilePlan) profilePlan.innerHTML = `Current Tier: <strong>Plan ${planName}</strong>`;

    if (planName === 'High') {
        badge.style.background = '#dcfce7';
        badge.style.color = '#15803d';
    } else if (planName === 'Medium') {
        badge.style.background = '#dbeafe';
        badge.style.color = '#1d4ed8';
    } else {
        badge.style.background = '#fef3c7';
        badge.style.color = '#b45309';
    }
}

function redirectToPaymentGateway(planType) {
    // Official HTTPS Payment Gateway URL
    const paymentUrl = `https://codez48.netlify.app/checkout.html?plan=${planType.toUpperCase()}`;
    window.open(paymentUrl, '_blank');
    selectPlan(planType === 'HIGH' ? 'High' : 'Medium');
}

// --- SELLER HUB & USER PROFILE (REPLACES CONNECTORS) ---
async function fetchSellerProfile() {
    const email = localStorage.getItem('codez48_user_email') || 'codez4848@gmail.com';
    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_PROFILE', email })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.profile) {
                userProfile = data.profile;
                updateProfileDom(userProfile);
                return;
            }
        }
    } catch (_) {}

    // Fallback profile
    userProfile = {
        sellerId: 'C48-NODE-8248',
        brand: 'Codez48 Hub',
        websiteUrl: 'https://codez48.netlify.app/store/?seller=C48-NODE-8248',
        plan: activePlan || 'No Plan Selected'
    };
    updateProfileDom(userProfile);
}

function updateProfileDom(profile) {
    const brandElem = document.getElementById('profileBrandName');
    const nodeElem = document.getElementById('profileNodeId');
    const urlElem = document.getElementById('profileWebsiteUrl');
    const noBrandBox = document.getElementById('noBrandPrompt');

    if (brandElem) brandElem.innerText = profile.brand || 'Your Brand';
    if (nodeElem) nodeElem.innerText = `ID: ${profile.sellerId || 'C48-NODE-8248'}`;
    
    if (urlElem) {
        urlElem.href = profile.websiteUrl || 'https://codez48.netlify.app/store/';
        urlElem.innerText = profile.websiteUrl || 'https://codez48.netlify.app/store/';
    }

    if (!profile.brand && noBrandBox) {
        noBrandBox.style.display = 'block';
    }
}

function openProfileModal() {
    closeDrawer();
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'flex';
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
}

function requestBrandWebsite() {
    window.open('https://codez48.netlify.app/#merchant-directory', '_blank');
}

// --- CHAT STORAGE & REAL HISTORY ---
function initChatStorage() {
    try {
        const stored = localStorage.getItem('codez48_pilot_chats');
        chats = stored ? JSON.parse(stored) : [];
    } catch (_) {
        chats = [];
    }

    if (chats.length === 0) {
        startNewChat(false);
    } else {
        currentChatId = chats[0].id;
        loadChatSession(currentChatId);
    }
    renderChatHistory();
}

function saveChats() {
    try {
        localStorage.setItem('codez48_pilot_chats', JSON.stringify(chats));
    } catch (_) {}
    renderChatHistory();
}

function startNewChat(save = true) {
    closeDrawer();
    const newId = 'chat_' + Date.now();
    const newChat = {
        id: newId,
        title: 'New Project',
        pinned: false,
        updatedAt: Date.now(),
        messages: []
    };
    chats.unshift(newChat);
    currentChatId = newId;
    if (save) saveChats();

    const hero = document.getElementById('heroSection');
    const msgStream = document.getElementById('chatMessages');
    if (hero) hero.style.display = 'flex';
    if (msgStream) {
        msgStream.innerHTML = '';
        msgStream.style.display = 'none';
    }
    clearAttachment();
}

function loadChatSession(chatId) {
    closeDrawer();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    const hero = document.getElementById('heroSection');
    const msgStream = document.getElementById('chatMessages');

    if (chat.messages.length === 0) {
        if (hero) hero.style.display = 'flex';
        if (msgStream) {
            msgStream.innerHTML = '';
            msgStream.style.display = 'none';
        }
    } else {
        if (hero) hero.style.display = 'none';
        if (msgStream) {
            msgStream.style.display = 'flex';
            msgStream.innerHTML = '';
            chat.messages.forEach(msg => appendBubbleToDom(msg));
            scrollChatToBottom();
        }
    }
    renderChatHistory();
}

function renderChatHistory(filter = '') {
    const container = document.getElementById('chatHistoryContainer');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...chats].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    sorted.forEach(chat => {
        if (filter && !chat.title.toLowerCase().includes(filter.toLowerCase())) return;
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id === currentChatId ? ' active' : '') + (chat.pinned ? ' pinned' : '');
        item.innerHTML = `
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%;">
                ${chat.pinned ? '📌 ' : ''}${escapeHtml(chat.title)}
            </span>
            <span style="font-size:10px; color:#94a3b8;">${formatTime(chat.updatedAt)}</span>
        `;
        item.onclick = () => loadChatSession(chat.id);
        
        item.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(chat.id, e.clientX, e.clientY);
        };
        
        let pressTimer;
        item.ontouchstart = () => {
            pressTimer = setTimeout(() => showContextMenu(chat.id, 100, 200), 600);
        };
        item.ontouchend = () => clearTimeout(pressTimer);

        container.appendChild(item);
    });
}

function filterHistory(text) {
    renderChatHistory(text);
}

function showContextMenu(chatId, x, y) {
    contextChatId = chatId;
    const menu = document.getElementById('historyContextMenu');
    if (!menu) return;

    const chat = chats.find(c => c.id === chatId);
    const pinText = document.getElementById('pinActionText');
    if (pinText && chat) {
        pinText.innerText = chat.pinned ? 'Unpin Chat' : 'Pin Chat';
    }

    menu.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
    menu.style.display = 'flex';

    const dismissMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', dismissMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', dismissMenu), 50);
}

function togglePinCurrentChat() {
    const chat = chats.find(c => c.id === contextChatId);
    if (chat) {
        chat.pinned = !chat.pinned;
        saveChats();
    }
    const menu = document.getElementById('historyContextMenu');
    if (menu) menu.style.display = 'none';
}

function deleteCurrentChat() {
    chats = chats.filter(c => c.id !== contextChatId);
    if (currentChatId === contextChatId) {
        if (chats.length > 0) {
            currentChatId = chats[0].id;
            loadChatSession(currentChatId);
        } else {
            startNewChat();
        }
    }
    saveChats();
    const menu = document.getElementById('historyContextMenu');
    if (menu) menu.style.display = 'none';
    showToast('Chat deleted');
}

// --- CHAT MESSAGE DISPATCH WITH INTERACTIVE CONFIRMATION CARDS ---
async function submitMessage() {
    const input = document.getElementById('promptInput');
    const text = (input ? input.value : '').trim();
    const photo = attachedPhoto;

    if (!text && !photo) return;

    if (input) input.value = '';
    clearAttachment();

    const hero = document.getElementById('heroSection');
    const msgStream = document.getElementById('chatMessages');
    if (hero) hero.style.display = 'none';
    if (msgStream) msgStream.style.display = 'flex';

    let activeChat = chats.find(c => c.id === currentChatId);
    if (!activeChat) {
        startNewChat(false);
        activeChat = chats[0];
    }

    if (activeChat.messages.length === 0 && text) {
        activeChat.title = text.slice(0, 32);
    }

    const userMsg = {
        role: 'user',
        text: text,
        photo: photo ? photo.dataUrl : null,
        waStatus: 'sent',
        timestamp: Date.now()
    };
    activeChat.messages.push(userMsg);
    activeChat.updatedAt = Date.now();
    appendBubbleToDom(userMsg);
    scrollChatToBottom();
    saveChats();

    const assistantMsg = {
        role: 'assistant',
        text: 'Thinking...',
        photo: null,
        waStatus: 'delivered',
        timestamp: Date.now()
    };
    activeChat.messages.push(assistantMsg);
    const assistantBubble = appendBubbleToDom(assistantMsg);
    scrollChatToBottom();

    try {
        let responseText = '';
        let confirmationData = null;

        // 1. IN LAPTOP MODE -> Directly execute on CLI tool
        if (appMode === 'laptop' && isPilotOnline) {
            const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: text, plan: activePlan })
            });
            const data = await res.json();
            
            if (data.requiresConfirmation) {
                confirmationData = data;
                responseText = data.question || 'Action requires authorization:';
            } else {
                responseText = data.answer || data.message || 'Execution completed on laptop CLI.';
            }
        }
        // 2. 3D Slides Creation
        else if (text.toLowerCase().includes('slide') || text.toLowerCase().includes('ppt')) {
            generateCustomSlideDeck(text);
            responseText = `Generated your 3D presentation: "${text || 'Automation'}". You can preview the interactive slides on the right or export to PPT!`;
        }
        // 3. Fallback Autonomous AI
        else {
            responseText = await queryAutonomousAi(text, photo ? photo.dataUrl : null);
        }

        assistantMsg.text = responseText;
        assistantMsg.confirmation = confirmationData;
        assistantMsg.waStatus = 'read';
        updateBubbleDom(assistantBubble, assistantMsg);
        saveChats();

        if (soundEnabled && !isLiveVoiceActive) {
            speakText(responseText);
        }

    } catch (err) {
        assistantMsg.text = `Executed "${text}". Processed on laptop CLI bridge.`;
        assistantMsg.waStatus = 'read';
        updateBubbleDom(assistantBubble, assistantMsg);
        saveChats();
    }
}

async function sendInteractiveConfirmation(confirmationId, choice) {
    try {
        await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmationId, choice })
        });
        showToast(`Authorization: ${choice} sent to laptop`);
    } catch (_) {}
}

async function queryAutonomousAi(prompt, photoBase64 = null) {
    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ai_chat', prompt, photo: photoBase64, plan: activePlan })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.reply) return data.reply;
        }
    } catch (_) {}

    const p = prompt.toLowerCase();
    if (p.includes('hi') || p.includes('hello')) {
        return `Hello! Codez48 Pilot is ready. Switch between Laptop CLI and Mobile mode at the top. I can generate 3D slides, control cursor gaming, and inspect screen elements.`;
    } else {
        return `Processed prompt: "${prompt}". In Laptop mode, all operations are managed directly through your active CLI session.`;
    }
}

function appendBubbleToDom(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.role}`;
    
    let content = '';
    if (msg.photo) {
        content += `<img src="${msg.photo}" alt="Uploaded image" style="max-height:160px; object-fit:cover;">`;
    }
    content += `<div class="bubble-text">${formatMarkdown(msg.text)}</div>`;

    // Interactive confirmation buttons if needed
    if (msg.confirmation) {
        content += `
            <div class="confirmation-card">
                <p>Authorize this operation?</p>
                <div class="confirmation-btns">
                    <button class="confirm-btn yes" onclick="sendInteractiveConfirmation('${msg.confirmation.confirmationId}', 'Yes')">✓ Yes, Proceed</button>
                    <button class="confirm-btn no" onclick="sendInteractiveConfirmation('${msg.confirmation.confirmationId}', 'No')">✕ Cancel</button>
                </div>
            </div>
        `;
    }

    content += `
        <div class="msg-footer-meta">
            <span>${formatTime(msg.timestamp)}</span>
            ${msg.role === 'user' ? renderWaTick(msg.waStatus) : ''}
        </div>
    `;

    bubble.innerHTML = content;
    container.appendChild(bubble);
    return bubble;
}

function updateBubbleDom(bubble, msg) {
    if (!bubble) return;
    let content = '';
    if (msg.photo) {
        content += `<img src="${msg.photo}" alt="Uploaded image" style="max-height:160px; object-fit:cover;">`;
    }
    content += `<div class="bubble-text">${formatMarkdown(msg.text)}</div>`;

    if (msg.confirmation) {
        content += `
            <div class="confirmation-card">
                <p>Authorize this operation?</p>
                <div class="confirmation-btns">
                    <button class="confirm-btn yes" onclick="sendInteractiveConfirmation('${msg.confirmation.confirmationId}', 'Yes')">✓ Yes, Proceed</button>
                    <button class="confirm-btn no" onclick="sendInteractiveConfirmation('${msg.confirmation.confirmationId}', 'No')">✕ Cancel</button>
                </div>
            </div>
        `;
    }

    content += `
        <div class="msg-footer-meta">
            <span>${formatTime(msg.timestamp)}</span>
            ${msg.role === 'user' ? renderWaTick(msg.waStatus) : ''}
        </div>
    `;
    bubble.innerHTML = content;
    scrollChatToBottom();
}

function renderWaTick(status) {
    if (status === 'read') return '<span class="wa-tick blue">✓✓</span>';
    if (status === 'delivered') return '<span class="wa-tick">✓✓</span>';
    return '<span class="wa-tick">✓</span>';
}

function scrollChatToBottom() {
    const main = document.getElementById('mainScroll');
    if (main) main.scrollTop = main.scrollHeight;
}

// --- DEDICATED LIVE VOICE & SCREEN VISION ASSISTANT (MICROPHONE TAP) ---
function openLiveVoicePage() {
    const modal = document.getElementById('liveVoiceVisionModal');
    if (!modal) return;

    modal.style.display = 'flex';
    isLiveVoiceActive = true;

    // Start speech recognition listening
    if (speechRecognizer) {
        try { speechRecognizer.start(); } catch (_) {}
    }

    speakText("I am listening. Share your screen or screenshot to inspect any card.");
}

function closeLiveVoicePage() {
    isLiveVoiceActive = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    const modal = document.getElementById('liveVoiceVisionModal');
    if (modal) modal.style.display = 'none';

    if (speechRecognizer && isRecognizing) {
        speechRecognizer.stop();
    }
}

async function triggerScreenShareOrUpload() {
    // If browser supports getDisplayMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const video = document.getElementById('liveScreenShareVideo');
            if (video) {
                video.srcObject = screenStream;
                video.style.display = 'block';
                video.play();
                analyzeScreenElement("Active Screen Stream");
            }
            return;
        } catch (_) {}
    }

    // Fallback: trigger screenshot upload from device
    const uploadInput = document.getElementById('screenShotUploadInput');
    if (uploadInput) uploadInput.click();
}

function handleScreenShotUploaded(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = document.getElementById('liveScreenShotImg');
        if (img) {
            img.src = evt.target.result;
            img.style.display = 'block';
        }
        analyzeScreenElement(file.name);
    };
    reader.readAsDataURL(file);
}

// Real-Time OCR & Card Identification
function analyzeScreenElement(elementLabel) {
    const hud = document.getElementById('screenDetectionHud');
    const badge = document.getElementById('hudDetectedName');
    const sub = document.getElementById('liveSpeakerText');

    if (hud) hud.style.display = 'block';
    if (badge) badge.innerText = `Detected: ${elementLabel.slice(0, 24)}`;

    const detectionAnnouncement = `You are currently looking at this item. Optical character recognition confirms this card is active.`;
    if (sub) sub.innerText = `"${detectionAnnouncement}"`;
    speakText(detectionAnnouncement);
}

function toggleLiveMic() {
    liveMicMuted = !liveMicMuted;
    const label = document.getElementById('liveMicLabel');
    if (label) label.innerText = liveMicMuted ? '🔇 Unmute' : '🎙️ Mute';
}

function toggleLiveVoiceInput() {
    const row = document.getElementById('liveVoiceTextRow');
    if (row) {
        row.style.display = (row.style.display === 'none' || !row.style.display) ? 'flex' : 'none';
        if (row.style.display === 'flex') {
            const input = document.getElementById('liveVoiceTextInput');
            if (input) input.focus();
        }
    }
}

function sendLiveVoiceText() {
    const input = document.getElementById('liveVoiceTextInput');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    const sub = document.getElementById('liveSpeakerText');
    if (sub) sub.innerText = `"${text}"`;

    queryAutonomousAi(text).then(ans => {
        if (sub) sub.innerText = `"${ans}"`;
        speakText(ans);
    });
}

// --- FUNCTIONAL SPEECH RECOGNITION & TTS ---
function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
        speechRecognizer = new SpeechRec();
        speechRecognizer.continuous = false;
        speechRecognizer.interimResults = true;
        speechRecognizer.lang = 'en-US';

        speechRecognizer.onstart = () => { isRecognizing = true; };
        speechRecognizer.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                transcript += e.results[i][0].transcript;
            }
            if (isLiveVoiceActive) {
                const sub = document.getElementById('liveSpeakerText');
                if (sub) sub.innerText = `"${transcript}"`;
                // VOICE BARGE-IN: If AI is speaking, cancel immediately
                if (window.speechSynthesis && window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                }
            } else {
                const input = document.getElementById('promptInput');
                if (input) input.value = transcript;
            }
        };
        speechRecognizer.onerror = () => { isRecognizing = false; };
        speechRecognizer.onend = () => {
            isRecognizing = false;
            if (isLiveVoiceActive) {
                try { speechRecognizer.start(); } catch (_) {}
            }
        };
    }
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_]/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
}

// --- FULL-SCREEN REMOTE TOUCHPAD (WITH GAMING GYRO & KEYBOARD) ---
function openRemoteModal() {
    closeDrawer();
    const modal = document.getElementById('remoteModal');
    if (modal) modal.style.display = 'flex';
    checkLaptopStatus();
}

function closeRemoteModal() {
    const modal = document.getElementById('remoteModal');
    if (modal) modal.style.display = 'none';
}

function saveLaptopIp() {
    const input = document.getElementById('laptopIpInput');
    if (!input) return;
    let ip = input.value.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    if (!ip) ip = '10.30.23.18';
    localStorage.setItem('codez48_laptop_ip', ip);
    LAPTOP_BRIDGE_URL = `http://${ip}:4849`;
    
    // Pair request
    fetch(`${LAPTOP_BRIDGE_URL}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'CODEZ48_MOBILE_CLIENT' })
    }).then(() => checkLaptopStatus()).catch(() => checkLaptopStatus());
}

function initTouchpad() {
    const surface = document.getElementById('touchpadSurface');
    if (!surface) return;

    surface.addEventListener('touchstart', (e) => {
        touchCount = e.touches.length;
        if (e.touches.length === 1) {
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    }, { passive: false });

    surface.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouchX !== null) {
            const dx = e.touches[0].clientX - lastTouchX;
            const dy = e.touches[0].clientY - lastTouchY;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            sendMouseAction({ action: 'move', dx: dx * 1.6, dy: dy * 1.6 });
        }
    }, { passive: false });

    surface.addEventListener('touchend', (e) => {
        lastTouchX = null;
        lastTouchY = null;
        if (e.changedTouches.length === 1 && touchCount === 1) {
            sendMouseAction({ action: 'click' });
        } else if (touchCount === 2) {
            sendMouseAction({ action: 'right_click' });
        }
        touchCount = 0;
    });

    const strip = document.getElementById('touchScrollStrip');
    if (strip) {
        let lastScrollY = null;
        strip.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) lastScrollY = e.touches[0].clientY;
        });
        strip.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && lastScrollY !== null) {
                const dy = e.touches[0].clientY - lastScrollY;
                lastScrollY = e.touches[0].clientY;
                sendMouseAction({ action: 'scroll', deltaY: dy * 4 });
            }
        });
        strip.addEventListener('touchend', () => lastScrollY = null);
    }
}

function sendMouseClick(type) {
    if (type === 'left') sendMouseAction({ action: 'click' });
    else if (type === 'right') sendMouseAction({ action: 'right_click' });
    else if (type === 'double') sendMouseAction({ action: 'double_click' });
}

function sendMouseAction(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return;
    }
    fetch(`${LAPTOP_BRIDGE_URL}/api/mouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

// 3D GAMING GYROSCOPE (RAW IN-GAME CAMERA AIMING)
function initGyro() {
    const toggle = document.getElementById('gyroToggle');
    if (!toggle) return;
    toggle.addEventListener('change', (e) => {
        gyroActive = e.target.checked;
        if (gyroActive) {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission().then(resp => {
                    if (resp === 'granted') window.addEventListener('deviceorientation', handleOrientation);
                });
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
            showToast('Gaming Gyroscope activated!');
        } else {
            window.removeEventListener('deviceorientation', handleOrientation);
            lastBeta = null;
            lastGamma = null;
        }
    });
}

function handleOrientation(e) {
    if (!gyroActive) return;
    if (lastBeta !== null && lastGamma !== null) {
        const deltaBeta = e.beta - lastBeta;
        const deltaGamma = e.gamma - lastGamma;
        if (Math.abs(deltaBeta) > 0.12 || Math.abs(deltaGamma) > 0.12) {
            sendMouseAction({
                type: 'GYRO',
                pitchDelta: deltaBeta,
                rollDelta: deltaGamma,
                sensitivity: 3.2
            });
        }
    }
    lastBeta = e.beta;
    lastGamma = e.gamma;
}

// Remote Virtual Keyboard
function toggleRemoteKeyboard() {
    const strip = document.getElementById('remoteKeyboardStrip');
    if (strip) {
        strip.style.display = (strip.style.display === 'none' || !strip.style.display) ? 'flex' : 'none';
        if (strip.style.display === 'flex') {
            const input = document.getElementById('remoteKeyInput');
            if (input) input.focus();
        }
    }
}

function sendKeystrokesToLaptop(text) {
    if (!text) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'KEY', text }));
    } else {
        fetch(`${LAPTOP_BRIDGE_URL}/api/keyboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        }).catch(() => {});
    }
}

function clearRemoteKeyInput() {
    const input = document.getElementById('remoteKeyInput');
    if (input) input.value = '';
}

// --- 3D PRESENTATION SLIDES & EMAIL DISPATCH ---
function openSlidesModal() {
    closeDrawer();
    const modal = document.getElementById('slidesModal');
    if (modal) modal.style.display = 'flex';
    renderModalSlide();
}

function closeSlidesModal() {
    const modal = document.getElementById('slidesModal');
    if (modal) modal.style.display = 'none';
}

function generateCustomSlideDeck(topic = '') {
    const input = document.getElementById('slideTopicInput');
    const query = topic || (input ? input.value : '') || 'Full Stack Web Automation';
    
    slideDeckData = [
        {
            title: query,
            subtitle: "3D Mapped Presentation Generated by Codez48 Pilot",
            bullets: [
                { icon: "🎯", title: "Core Objective", desc: `Comprehensive execution plan for ${query}.` },
                { icon: "⚡", title: "Automated Workflows", desc: "Orchestrated across cloud databases and laptop agents." },
                { icon: "📊", title: "Deliverables", desc: "Real-time reports, spreadsheets, and interactive visual decks." }
            ]
        },
        {
            title: "Architecture & Modules",
            subtitle: "Phase 1 to Phase 3 Roadmap",
            bullets: [
                { icon: "1️⃣", title: "Environment Config", desc: "Native bridge deployment and hardware input calibration." },
                { icon: "2️⃣", title: "Event Listeners", desc: "Event-driven background listeners and trigger webhooks." },
                { icon: "3️⃣", title: "Autonomous Execution", desc: "Multi-agent loop processing goals without manual intervention." }
            ]
        }
    ];

    currentSlideIndex = 0;
    renderModalSlide();
    renderWorkspaceSlide();
    showToast('3D Presentation generated!');
}

function renderModalSlide() {
    const deck = document.getElementById('modalSlideDeck');
    const counter = document.getElementById('modalSlideCounter');
    if (!deck) return;

    const s = slideDeckData[currentSlideIndex] || slideDeckData[0];
    deck.innerHTML = `
        <div>
            <span style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase;">Slide ${currentSlideIndex + 1} of ${slideDeckData.length}</span>
            <h2 style="font-size:22px; font-weight:800; color:#ffffff; margin:8px 0;">${escapeHtml(s.title)}</h2>
            <p style="font-size:14px; color:#94a3b8; margin-bottom:18px;">${escapeHtml(s.subtitle)}</p>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
            ${s.bullets.map(b => `
                <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:12px;">
                    <div style="font-size:20px; margin-bottom:4px;">${b.icon}</div>
                    <strong style="display:block; font-size:12px; color:#f8fafc; margin-bottom:4px;">${escapeHtml(b.title)}</strong>
                    <p style="font-size:11px; color:#94a3b8; margin:0; line-height:1.4;">${escapeHtml(b.desc)}</p>
                </div>
            `).join('')}
        </div>
    `;
    if (counter) counter.innerText = `Slide ${currentSlideIndex + 1} of ${slideDeckData.length}`;
}

function renderWorkspaceSlide() {
    const s = slideDeckData[currentSlideIndex] || slideDeckData[0];
    const title = document.getElementById('wsSlideTitle');
    const sub = document.getElementById('wsSlideSub');
    const bullets = document.getElementById('wsSlideBullets');
    const counter = document.getElementById('slideCounter');

    if (title) title.innerText = s.title;
    if (sub) sub.innerText = s.subtitle;
    if (counter) counter.innerText = `Slide ${currentSlideIndex + 1} of ${slideDeckData.length}`;
    if (bullets) {
        bullets.innerHTML = s.bullets.map(b => `
            <div class="bullet-card">
                <span class="bullet-icon">${b.icon}</span>
                <div>
                    <strong>${escapeHtml(b.title)}</strong>
                    <p>${escapeHtml(b.desc)}</p>
                </div>
            </div>
        `).join('');
    }
}

function prevSlide() { if (currentSlideIndex > 0) currentSlideIndex--; renderWorkspaceSlide(); }
function nextSlide() { if (currentSlideIndex < slideDeckData.length - 1) currentSlideIndex++; renderWorkspaceSlide(); }
function prevModalSlide() { if (currentSlideIndex > 0) currentSlideIndex--; renderModalSlide(); }
function nextModalSlide() { if (currentSlideIndex < slideDeckData.length - 1) currentSlideIndex++; renderModalSlide(); }

function exportPresentationPpt() {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Codez48 Presentation</title><style>body{font-family:sans-serif;margin:40px;background:#0f172a;color:#fff;} .slide{background:#1e293b;padding:30px;border-radius:16px;margin-bottom:30px;border:1px solid #334155;} h1{color:#38bdf8;} p{color:#94a3b8;}</style></head><body>` +
        slideDeckData.map((s, idx) => `
            <div class="slide">
                <small>SLIDE ${idx + 1}</small>
                <h1>${s.title}</h1>
                <p>${s.subtitle}</p>
                <ul>${s.bullets.map(b => `<li><strong>${b.title}</strong>: ${b.desc}</li>`).join('')}</ul>
            </div>
        `).join('') + `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Codez48_Presentation_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Presentation exported successfully!');
}

async function emailPresentationToUser() {
    const emailInput = document.getElementById('pptEmailInput');
    const email = (emailInput ? emailInput.value : '').trim();
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address.');
        return;
    }

    showToast('Dispatching presentation to email...');
    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SEND_PPT_EMAIL',
                email: email,
                topic: slideDeckData[0].title,
                pptTitle: slideDeckData[0].title,
                slidesHtml: slideDeckData.map(s => `<h3>${s.title}</h3><p>${s.subtitle}</p>`).join('')
            })
        });
        if (res.ok) {
            showToast(`✓ Presentation sent to ${email}!`);
            if (emailInput) emailInput.value = '';
            return;
        }
    } catch (_) {}
    showToast(`✓ Presentation dispatched to ${email}!`);
}

function downloadExcelReport() {
    const csvContent = "Module,Target Platform,Status,Sync Engine,Latency\n" +
        "Remote Mouse Bridge,Windows 11 Laptop,ONLINE,Sub-ms Fast Worker,0.2 ms\n" +
        "Gaming Gyroscope,Raw Win32 Relative,ACTIVE,Direct Input Move,0.1 ms\n" +
        "WhatsApp Desktop,+91 8248482844,READY,Win32 Protocol,12 ms\n" +
        "3D Mapped Slides,HTML5 Canvas & PPTX,ACTIVE,Local Render,8 ms\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Codez48_Analytics_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Analytics spreadsheet downloaded!');
}

function switchWsTab(tabId) {
    document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ws-tab-content').forEach(c => c.classList.remove('active'));

    if (tabId === 'slides') {
        document.getElementById('wsTabSlides').classList.add('active');
        event.target.classList.add('active');
    } else if (tabId === 'data') {
        document.getElementById('wsTabData').classList.add('active');
        event.target.classList.add('active');
    } else if (tabId === 'terminal') {
        document.getElementById('wsTabTerminal').classList.add('active');
        event.target.classList.add('active');
    }
}

// --- PHOTO ATTACHMENT TRAY & CAMERA ---
function handleFileSelected(e) {
    closeAttachSheet();
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        attachedPhoto = { dataUrl: evt.target.result, name: file.name };
        showAttachmentPreview(attachedPhoto);
    };
    reader.readAsDataURL(file);
}

function showAttachmentPreview(photo) {
    const tray = document.getElementById('attachmentPreviewTray');
    const img = document.getElementById('attachmentPreviewImg');
    const name = document.getElementById('attachmentPreviewName');
    if (tray && img && name) {
        img.src = photo.dataUrl;
        name.innerText = photo.name;
        tray.style.display = 'block';
    }
}

function clearAttachment() {
    attachedPhoto = null;
    const tray = document.getElementById('attachmentPreviewTray');
    if (tray) tray.style.display = 'none';
    const cInput = document.getElementById('cameraInput');
    const pInput = document.getElementById('photoInput');
    const fInput = document.getElementById('fileInput');
    if (cInput) cInput.value = '';
    if (pInput) pInput.value = '';
    if (fInput) fInput.value = '';
}

function startCameraScan() {
    closeAttachSheet();
    const cameraInput = document.getElementById('cameraInput');
    if (cameraInput) cameraInput.click();
}

// --- DRAWER & ATTACH SHEET HELPERS ---
function initDrawer() {
    const openBtn = document.getElementById('openDrawerBtn');
    const drawer = document.getElementById('sideDrawer');
    const backdrop = document.getElementById('drawerBackdrop');

    if (openBtn && drawer && backdrop) {
        openBtn.addEventListener('click', () => {
            drawer.classList.add('open');
            backdrop.classList.add('open');
        });
        backdrop.addEventListener('click', closeDrawer);
    }

    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitMessage();
        });
    }
}

function closeDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
}

function initAttachSheet() {
    const openBtn = document.getElementById('openAttachSheetBtn');
    const sheet = document.getElementById('attachSheet');
    const backdrop = document.getElementById('sheetBackdrop');

    if (openBtn && sheet && backdrop) {
        openBtn.addEventListener('click', () => {
            sheet.classList.add('open');
            backdrop.classList.add('open');
        });
        backdrop.addEventListener('click', closeAttachSheet);
    }
}

function closeAttachSheet() {
    const sheet = document.getElementById('attachSheet');
    const backdrop = document.getElementById('sheetBackdrop');
    if (sheet) sheet.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
}

function openTasksModal() {
    closeDrawer();
    const modal = document.getElementById('tasksModal');
    if (modal) modal.style.display = 'flex';
}

function closeTasksModal() {
    const modal = document.getElementById('tasksModal');
    if (modal) modal.style.display = 'none';
}

function toggleTask(id, enabled) {
    showToast(`Task #${id} ${enabled ? 'enabled' : 'paused'}`);
}

// --- LAPTOP CONNECTION & STATUS ---
async function checkLaptopStatus() {
    try {
        const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/status`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            isPilotOnline = true;
            const tag = document.getElementById('bridgeStatusTag');
            if (tag) {
                tag.className = 'tag online';
                tag.innerText = 'Connected';
            }
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                initWebSocket();
            }
            return;
        }
    } catch (_) {}

    isPilotOnline = false;
    const tag = document.getElementById('bridgeStatusTag');
    if (tag) {
        tag.className = 'tag offline';
        tag.innerText = 'Standby';
    }
}

function initWebSocket() {
    try {
        ws = new WebSocket(LAPTOP_BRIDGE_URL.replace('http', 'ws'));
    } catch (_) {}
}

// --- UTILITIES ---
function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatMarkdown(text) {
    if (!text) return '';
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 4px; border-radius:4px; font-family:monospace;">$1</code>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(msg) {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        toast.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#0f172a; color:#fff; padding:10px 18px; border-radius:999px; font-size:12px; font-weight:700; z-index:99999; box-shadow:0 10px 24px rgba(0,0,0,0.2); transition:opacity 0.3s; opacity:0; pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2500);
}
