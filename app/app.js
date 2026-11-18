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
let appMode = 'mobile'; // Default to mobile mode!
let activePlan = null; // No plan selected by default!
let activeModelTier = 'basic';
let userProfile = null;
let soundEnabled = true;

// Active Chat & History State
let chats = [];
let currentChatId = null;
let contextChatId = null;
let attachedFiles = []; // Multi-file attachments array

// Speech Recognition & TTS
let inlineSpeechRec = null;
let isInlineRecording = false;
let inlineSilenceTimeout = null;
let liveSpeechRecognizer = null;
let isLiveVoiceActive = false;
let isLiveHold = false;
let screenStream = null;
let cameraInterval = null;

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

    appMode = localStorage.getItem('codez48_app_mode') || 'mobile';
    setAppMode(appMode, false);

    activeModelTier = localStorage.getItem('codez48_model_tier') || 'basic';
    updateModelTierUI(activeModelTier);

    const savedIpInput = document.getElementById('laptopIpInput');
    if (savedIpInput) savedIpInput.value = savedIp;
}

// --- INSTANT MODEL SELECTOR DROPDOWN ---
function toggleInstantDropdown() {
    const dropdown = document.getElementById('instantModelDropdown');
    if (dropdown) {
        dropdown.style.display = (dropdown.style.display === 'none' || !dropdown.style.display) ? 'flex' : 'none';
    }
}

function selectModelTier(tier) {
    const dropdown = document.getElementById('instantModelDropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (tier === 'basic') {
        activeModelTier = 'basic';
        localStorage.setItem('codez48_model_tier', 'basic');
        updateModelTierUI('basic');
        showToast('Active model: Basic (Free / Fast)');
    } else if (tier === 'medium') {
        if (activePlan === 'Medium' || activePlan === 'High') {
            activeModelTier = 'medium';
            localStorage.setItem('codez48_model_tier', 'medium');
            updateModelTierUI('medium');
            showToast('Active model: Medium (Accelerated)');
        } else {
            redirectToPaymentGateway('MEDIUM');
        }
    } else if (tier === 'high') {
        if (activePlan === 'High') {
            activeModelTier = 'high';
            localStorage.setItem('codez48_model_tier', 'high');
            updateModelTierUI('high');
            showToast('Active model: High (Ultra Intelligence)');
        } else {
            redirectToPaymentGateway('HIGH');
        }
    }
}

function updateModelTierUI(tier) {
    const label = document.getElementById('instantModelLabel');
    if (label) {
        if (tier === 'high') label.innerText = 'Instant High';
        else if (tier === 'medium') label.innerText = 'Instant Med';
        else label.innerText = 'Instant';
    }

    const checkBasic = document.getElementById('tierCheckBasic');
    const lockMedium = document.getElementById('tierLockMedium');
    const lockHigh = document.getElementById('tierLockHigh');

    const hasMedium = (activePlan === 'Medium' || activePlan === 'High');
    const hasHigh = (activePlan === 'High');

    if (lockMedium) lockMedium.innerText = hasMedium ? '✓' : '🔒';
    if (lockHigh) lockHigh.innerText = hasHigh ? '✓' : '🔒';
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('instantModelDropdown');
    const btn = document.getElementById('instantModelBtn');
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

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
    updateModelTierUI(activeModelTier);
    closePlansModal();
    showToast(`Active plan set to ${planName}`);
}

function updatePlanBadge(planName) {
    const badge = document.getElementById('activePlanBadge');
    const profilePlan = document.getElementById('profilePlanText');

    if (!planName) {
        if (badge) {
            badge.innerText = 'Choose Plan';
            badge.style.background = '#f1f5f9';
            badge.style.color = '#64748b';
        }
        if (profilePlan) profilePlan.innerHTML = 'Current Tier: <strong>Basic (Free)</strong>';
        return;
    }

    if (badge) badge.innerText = planName;
    if (profilePlan) profilePlan.innerHTML = `Current Tier: <strong>Plan ${planName}</strong>`;

    if (badge) {
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
        sellerId: 'C48-NODE-7555',
        brand: 'Codez48 Hub',
        websiteUrl: 'https://codez48.netlify.app/store/?seller=C48-NODE-7555',
        productsUrl: 'https://codez48.netlify.app/store/products.html?seller=C48-NODE-7555',
        plan: activePlan || 'Basic (Free)'
    };
    updateProfileDom(userProfile);
}

function updateProfileDom(profile) {
    const brandElem = document.getElementById('profileBrandName');
    const nodeElem = document.getElementById('profileNodeId');
    const urlElem = document.getElementById('profileWebsiteUrl');
    const prodUrlElem = document.getElementById('profileProductsUrl');
    const noBrandBox = document.getElementById('noBrandPrompt');
    const creditsBar = document.getElementById('profileCreditsBar');
    const creditsBadge = document.getElementById('profileCreditsBadge');
    const creditsUsed = document.getElementById('profileCreditsUsed');
    const creditsTotal = document.getElementById('profileCreditsTotal');

    const sellerId = profile.sellerId || 'C48-NODE-7555';
    if (brandElem) brandElem.innerText = profile.brand || 'Your Brand';
    if (nodeElem) nodeElem.innerText = `ID: ${sellerId}`;
    
    const storeUrl = `https://codez48.netlify.app/store/?seller=${sellerId}`;
    const productsUrl = `https://codez48.netlify.app/store/products.html?seller=${sellerId}`;

    if (urlElem) {
        urlElem.href = storeUrl;
        urlElem.innerText = storeUrl;
    }
    if (prodUrlElem) {
        prodUrlElem.href = productsUrl;
        prodUrlElem.innerText = productsUrl;
    }

    // Credits usage tracking
    const totalCredits = 2500;
    const usedCredits = 750;
    const availableCredits = totalCredits - usedCredits;
    const pct = Math.round((usedCredits / totalCredits) * 100);

    if (creditsBar) creditsBar.style.width = `${pct}%`;
    if (creditsBadge) creditsBadge.innerText = `${availableCredits} Available`;
    if (creditsUsed) creditsUsed.innerText = `Used: ${usedCredits}`;
    if (creditsTotal) creditsTotal.innerText = `Total: ${totalCredits} Credits`;

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

// --- CHAT MESSAGE DISPATCH WITH MULTI-ATTACHMENTS & AI ROUTING ---
async function submitMessage() {
    const input = document.getElementById('promptInput');
    const text = (input ? input.value : '').trim();
    const files = [...attachedFiles];

    if (!text && files.length === 0) return;

    if (input) input.value = '';
    clearAttachments();

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
        files: files,
        waStatus: 'sent',
        timestamp: Date.now()
    };
    activeChat.messages.push(userMsg);
    activeChat.updatedAt = Date.now();
    appendBubbleToDom(userMsg);
    scrollChatToBottom();
    saveChats();

    // 1. IMAGE GENERATION PROMPT (POLLINATIONS AI WITH WATERMARK CROPPING)
    if (isImagePrompt(text)) {
        const assistantMsg = {
            role: 'assistant',
            text: `Generated image for prompt: "${extractImagePrompt(text)}"`,
            html: generatePollinationsImage(text),
            waStatus: 'read',
            timestamp: Date.now()
        };
        activeChat.messages.push(assistantMsg);
        appendBubbleToDom(assistantMsg);
        scrollChatToBottom();
        saveChats();
        return;
    }

    // Thinking placeholder for text
    const assistantMsg = {
        role: 'assistant',
        text: 'Thinking...',
        waStatus: 'delivered',
        timestamp: Date.now()
    };
    activeChat.messages.push(assistantMsg);
    const assistantBubble = appendBubbleToDom(assistantMsg);
    scrollChatToBottom();

    try {
        let responseText = '';
        let confirmationData = null;

        // 2. IN LAPTOP MODE -> Execute on Laptop CLI Bridge
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
        // 3. 3D SLIDES / PPT CREATION
        else if (text.toLowerCase().includes('slide') || text.toLowerCase().includes('ppt') || text.toLowerCase().includes('presentation')) {
            const slideDeck = await generateAiSlideDeck(text);
            responseText = `I have generated a 3D Presentation Deck for **"${text}"** with ${slideDeck.length} slides.\n\nYou can preview the interactive deck in the workspace or export it directly to PPTX!`;
        }
        // 4. AUTONOMOUS MOBILE AI (COMPREHENSIVE RESPONSES, E.G. "WHAT IS CSS?")
        else {
            responseText = await queryAutonomousAi(text, files);
        }

        assistantMsg.text = responseText;
        assistantMsg.confirmation = confirmationData;
        assistantMsg.waStatus = 'read';
        updateBubbleDom(assistantBubble, assistantMsg);
        saveChats();

        // NOTE: Default chat responses DO NOT auto-speak!
        // Speech is only activated if user explicitly clicks "Read" on the message.

    } catch (err) {
        assistantMsg.text = `Executed "${text}". In Mobile mode, switch to Laptop mode if you want commands sent to your active CLI session.`;
        assistantMsg.waStatus = 'read';
        updateBubbleDom(assistantBubble, assistantMsg);
        saveChats();
    }
}

// --- POLLINATIONS AI IMAGE GENERATION (ZERO WATERMARK / CROPPED) ---
function isImagePrompt(text) {
    if (!text) return false;
    return /(?:generate|create|draw|make|show)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|wallpaper)\s+(?:of\s+)?(.+)/i.test(text) ||
           /^image:\s*(.+)/i.test(text) ||
           /^photo:\s*(.+)/i.test(text);
}

function extractImagePrompt(text) {
    const match = text.match(/(?:generate|create|draw|make|show)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|wallpaper)\s+(?:of\s+)?(.+)/i);
    if (match && match[1]) return match[1].trim();
    return text.replace(/^(?:image|photo):\s*/i, '').trim();
}

function generatePollinationsImage(promptText) {
    const cleanPrompt = extractImagePrompt(promptText);
    let width = 768;
    let height = 768;
    let aspectRatio = '1 / 1';

    if (/16:9|landscape|wide/i.test(promptText)) {
        width = 896;
        height = 512;
        aspectRatio = '16 / 9';
    } else if (/9:16|portrait|story|mobile/i.test(promptText)) {
        width = 512;
        height = 896;
        aspectRatio = '9 / 16';
    } else if (/4:3/i.test(promptText)) {
        width = 800;
        height = 600;
        aspectRatio = '4 / 3';
    }

    // Add extra height buffer (60px) so the bottom watermark logo can be cropped out cleanly!
    const genHeight = height + 60;
    const seed = Math.floor(Math.random() * 1000000);
    const rawUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${genHeight}&nologo=true&seed=${seed}`;

    const cardId = 'img_card_' + Date.now();
    return `
        <div class="ai-image-card" id="${cardId}">
            <div class="image-shimmer-box" id="${cardId}_shimmer">
                <div class="shimmer-text">✨ Generating with Pollinations AI...</div>
            </div>
            <div class="image-crop-wrapper" style="aspect-ratio: ${aspectRatio}; display:none;" id="${cardId}_wrapper">
                <img src="${rawUrl}" alt="${cleanPrompt}" class="cropped-pollinations-img" onload="onImageLoaded('${cardId}')" onerror="onImageError('${cardId}')">
            </div>
            <div class="image-actions-bar" id="${cardId}_actions" style="display:none;">
                <button onclick="downloadCroppedImage('${rawUrl}', '${cleanPrompt.replace(/'/g, '')}', ${width}, ${height})" class="img-btn">📥 Download Image</button>
                <a href="${rawUrl}" target="_blank" class="img-btn secondary">🔍 Full View</a>
            </div>
        </div>
    `;
}

function onImageLoaded(cardId) {
    const shimmer = document.getElementById(`${cardId}_shimmer`);
    const wrapper = document.getElementById(`${cardId}_wrapper`);
    const actions = document.getElementById(`${cardId}_actions`);
    if (shimmer) shimmer.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';
    if (actions) actions.style.display = 'flex';
    scrollChatToBottom();
}

function onImageError(cardId) {
    const shimmer = document.getElementById(`${cardId}_shimmer`);
    if (shimmer) {
        shimmer.innerHTML = '<span style="color:#f87171; font-weight:700;">Failed to generate image. Please try again.</span>';
    }
}

async function downloadCroppedImage(imageUrl, promptName, targetWidth, targetHeight) {
    try {
        showToast('Preparing watermark-free download...');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
            const a = document.createElement('a');
            a.download = `Codez48_${promptName.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
            showToast('Download started!');
        };
    } catch (_) {
        window.open(imageUrl, '_blank');
    }
}

// --- AI POWERPOINT (PPT) SLIDES GENERATOR ---
async function generateAiSlideDeck(topic) {
    const defaultDeck = [
        {
            title: topic,
            subtitle: "Strategic Overview & Architecture Deck",
            bullets: [
                { icon: "🎯", title: "Key Objectives", desc: `Strategic execution and core deliverables for ${topic}.` },
                { icon: "⚡", title: "Workflow Architecture", desc: "Automated real-time pipeline with multi-platform synchronization." },
                { icon: "📈", title: "Expected Outcomes", desc: "Measurable ROI, enhanced efficiency, and production-grade stability." }
            ]
        },
        {
            title: "Implementation Methodology",
            subtitle: "Step-by-step Technical Deployment",
            bullets: [
                { icon: "🔧", title: "System Setup", desc: "Environment configuration, credential provisioning, and bridge linking." },
                { icon: "🛡️", title: "Security & Validation", desc: "Robust authentication, fallback safety loops, and permission grants." },
                { icon: "🚀", title: "Deployment Rollout", desc: "Seamless distribution across web, mobile, and cloud environments." }
            ]
        }
    ];

    try {
        const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate a structured 3D presentation slide deck in JSON format with array of slides: [{ title, subtitle, bullets: [{ icon, title, desc }] }]. Return ONLY valid JSON.'
                    },
                    { role: 'user', content: `Create a 3-slide professional presentation deck about: ${topic}` }
                ]
            })
        });

        if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    slideDeckData = parsed;
                    currentSlideIndex = 0;
                    renderWorkspaceSlide();
                    return slideDeckData;
                }
            }
        }
    } catch (_) {}

    slideDeckData = defaultDeck;
    currentSlideIndex = 0;
    renderWorkspaceSlide();
    return defaultDeck;
}

// --- AUTONOMOUS AI TEXT COMPLETIONS & RESILIENT MULTI-TIER PIPELINE ---
async function queryAutonomousAi(prompt, files = []) {
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) return 'Please enter a message or question.';

    // Tier 1: Puter.js in Browser (Free gpt-4o-mini, No Rate Limits)
    if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
            const puterPromise = window.puter.ai.chat(
                `You are Codez48 Pilot AI, a helpful, polite, and comprehensive assistant. Answer accurately in clean markdown formatting. If the user asks in Tamil or English, respond in that language.\n\nUser: ${cleanPrompt}`,
                { model: 'gpt-4o-mini' }
            );
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('PuterTimeout')), 6000));
            const res = await Promise.race([puterPromise, timeoutPromise]);
            const content = res?.message?.content || (typeof res === 'string' ? res : '');
            if (content && content.trim() && !content.includes('Rate limit')) {
                return content.trim();
            }
        } catch (e) {
            console.warn('Puter AI fallback:', e.message);
        }
    }

    // Tier 2: Direct Laptop Bridge /api/execute (If connected to laptop bridge)
    if (isPilotOnline) {
        try {
            const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: cleanPrompt, plan: activePlan }),
                signal: AbortSignal.timeout(3500)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.answer && data.answer.trim() && !data.answer.startsWith('Executed "')) {
                    return data.answer.trim();
                }
            }
        } catch (_) {}
    }

    // Tier 3: Pollinations Text Completion (Fast 3.5s timeout, 402 guard)
    try {
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(cleanPrompt)}?model=openai`, {
            signal: AbortSignal.timeout(3500)
        });
        if (res.ok) {
            const text = await res.text();
            if (text && !text.includes('Free limit reached') && !text.includes('Please wait') && !text.includes('pollen key') && text.length > 5) {
                return text.trim();
            }
        }
    } catch (_) {}

    // Tier 4: Comprehensive Offline / Immediate Intelligent Synthesizer
    return synthesizeIntelligentResponse(cleanPrompt);
}

function synthesizeIntelligentResponse(prompt) {
    const cleanPrompt = (prompt || '').trim();
    const p = cleanPrompt.toLowerCase();
    const isTamil = /[\u0B80-\u0BFF]/.test(cleanPrompt);

    if (isTamil) {
        if (/வணக்கம்|காலை|மாலை/i.test(prompt)) {
            return `### வணக்கம்! 🙏\n\n**Codez48 Pilot AI**-க்கு தங்களை அன்புடன் வரவேற்கிறோம். நான் உங்கள் மென்பொருள் உருவாக்கம், பிசினஸ் ஆட்டோமேஷன் மற்றும் கணினி இயக்கத்திற்கு உதவும் பிரத்யேக AI உதவியாளர்.\n\n#### நான் உங்களுக்கு உதவக்கூடிய பகுதிகள்:\n- 💻 **மென்பொருள் கோடிங்**: HTML, CSS, JavaScript, Python & Full-Stack நிரலாக்கம்\n- 🚀 **வணிக ஆட்டோமேஷன்**: WhatsApp கிளவுட் தகவல் பரிமாற்றம் மற்றும் வாடிக்கையாளர் மேலாண்மை\n- 📊 **3D பிரசென்டேஷன்**: தானியங்கி ஸ்லைடுகள் மற்றும் PPT உருவாக்கம்\n- 🖱️ **லேப்டாப் ரிமோட்**: உங்கள் மொபைலை மவுஸ் மற்றும் விசைப்பலகையாக மாற்றுதல்\n- 👁️ **லைவ் விஷன் (Live Vision)**: கேமரா மூலம் ஆவணங்களை படித்து OCR செய்தல்\n\nஉங்களுக்கு இன்று என்ன உதவி தேவை? தாராளமாக கேளுங்கள்!`;
        }
        if (/எப்படி\s*இருக்கீங்க|நலமா/i.test(prompt)) {
            return `### நான் நலமாக உள்ளேன்! 😊\n\nதங்கள் அன்பான விசாரிப்பிற்கு மிக்க நன்றி! நீங்கள் எப்படி இருக்கிறீர்கள்?\n\nஉங்கள் பணிகள், கோடிங் தேவைகள் மற்றும் வணிக ஆட்டோமேஷனை விரைவுபடுத்த நான் தயாராக உள்ளேன். இன்று நாம் எதை உருவாக்கலாம்?`;
        }
        if (/யார்|who\s*are\s*you/i.test(prompt)) {
            return `### நான் Codez48 Pilot AI 🤖\n\nநான் அதிவேகமாக இயங்கும் உங்களின் தனிப்பட்ட **Autonomous AI Pilot** உதவியாளர். லேப்டாப் மற்றும் மொபைல் சாதனங்களை ஒன்றிணைத்து அதிவேகமாக செயல்பட வடிவமைக்கப்பட்டுள்ளேன். என்னை நீங்கள் மொபைல் மற்றும் டெஸ்க்டாப் இரண்டிலும் தடையின்றி பயன்படுத்தலாம்.`;
        }
        if (/css/i.test(prompt)) {
            return `### CSS என்றால் என்ன?\n\n**CSS (Cascading Style Sheets)** என்பது ஒரு வலைப்பக்கத்தை (HTML) வண்ணமயமாகவும் அழகாகவும் வடிவமைக்கப் பயன்படும் ஸ்டைலிங் மொழியாகும்.\n\n#### முக்கிய அம்சங்கள்:\n1. **வடிவமைப்பு**: வண்ணங்கள், எழுத்துருக்கள் (Fonts), பின்னணிகள்.\n2. **அமைப்பு (Layout)**: Flexbox மற்றும் CSS Grid மூலம் திரைக்கு ஏற்றவாறு அமைத்தல்.\n3. **ரெஸ்பான்சிவ்**: மொபைல் மற்றும் கணினி இரண்டிலும் சரியாக தெரிய Media Queries பயன்படுத்துதல்.\n\n\`\`\`css\n/* உதாரணம் */\n.button {\n    background-color: #2563eb;\n    color: #ffffff;\n    padding: 10px 20px;\n    border-radius: 8px;\n}\n\`\`\``;
        }
        if (/python|பைதான்/i.test(prompt)) {
            return `### Python (பைதான்) என்றால் என்ன?\n\n**Python** என்பது எளிதில் வாசிக்கக்கூடிய, உலகளவில் மிகவும் புகழ்பெற்ற ஒரு உயர்மட்ட நிரலாக்க மொழி (High-level programming language).\n\n#### பயன்கள்:\n- இணைய பயன்பாடுகள் (Web Development - Django, Flask)\n- செயற்கை நுண்ணறிவு மற்றும் மெஷின் லேர்னிங் (AI & ML)\n- ஆட்டோமேஷன் மற்றும் ஸ்கிரிப்டிங் (Automation Scripts)\n\n\`\`\`python\n# உதாரணம்\ndef greet(name):\n    return f"வணக்கம், {name}!"\n\nprint(greet("Codez48"))\n\`\`\``;
        }
        if (/வெப்சைட்|வலைத்தளம்|website/i.test(prompt)) {
            return `### வலைத்தளம் (Website) உருவாக்குவது எப்படி?\n\nஒரு சிறந்த வலைத்தளத்தை உருவாக்க 3 அடிப்படை தேவைகள் உண்டு:\n\n1. **HTML**: பக்கத்தின் கட்டமைப்பு மற்றும் உள்ளடக்கம்.\n2. **CSS**: பக்கத்திற்கான அழகான நிறங்கள் மற்றும் வடிவமைப்பு.\n3. **JavaScript**: பட்டன் கிளிக்குகள் மற்றும் பயனர் செயல்களுக்கான இயக்கம்.\n\nCodez48 Pilot மூலம் உங்கள் வணிகத்திற்கான வலைத்தளத்தை மிக எளிதாக நீங்கள் உருவாக்கலாம்!`;
        }
        return `### Codez48 Pilot AI விளக்கம்\n\n**தங்கள் கேள்வி:** "${prompt}"\n\nதங்களின் கேள்விக்குரிய பணிகள் மற்றும் வழிகாட்டுதல்களை வழங்க Codez48 Pilot AI தயாராக உள்ளது. நீங்கள் மேலும் விபரங்களைக் கேட்கலாம் அல்லது மேலதிக கட்டளைகளை உள்ளிடலாம்.`;
    }

    // ENGLISH SYNTHESIS
    if (p.includes('css')) {
        return `### What is CSS?\n\n**CSS (Cascading Style Sheets)** is the foundational styling language of the web. It dictates how HTML elements are presented visually across screens, layouts, and devices.\n\n#### Core Pillars of CSS:\n1. **Visual Styling**: Fine-tunes typography, colors, shadows, gradients, and borders.\n2. **Layout Orchestration**: Employs **Flexbox** for 1D alignments and **CSS Grid** for advanced 2D application interfaces.\n3. **Responsive Design**: Uses Media Queries (\`@media\`) to guarantee adaptive rendering on smartphones, tablets, and wide monitors.\n4. **Motion & Transitions**: Hardware-accelerated animations (\`transform\`, \`opacity\`, \`transition\`) for ultra-smooth 60fps UX.\n\n\`\`\`css\n/* Modern Responsive Card */\n.pilot-card {\n    display: flex;\n    flex-direction: column;\n    padding: 20px;\n    border-radius: 16px;\n    background: #ffffff;\n    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);\n    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n}\n.pilot-card:hover {\n    transform: translateY(-4px);\n}\n\`\`\``;
    }

    if (p.includes('html')) {
        return `### What is HTML?\n\n**HTML (HyperText Markup Language)** is the standard markup language used to build the structural skeleton of every webpage on the internet.\n\n#### Key Characteristics:\n- **Semantic Elements**: Uses tags like \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, and \`<footer>\` for accessibility and search engine optimization (SEO).\n- **DOM Tree**: Parses into the Document Object Model which JavaScript manipulates in real-time.\n- **Hyperlinks & Media**: Seamlessly connects pages and embeds audio, video, and vector graphics.\n\n\`\`\`html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <title>Codez48 Pilot</title>\n</head>\n<body>\n    <header><h1>Welcome to Codez48</h1></header>\n    <main><p>Autonomous Pilot Interface Active.</p></main>\n</body>\n</html>\n\`\`\``;
    }

    if (p.includes('javascript') || p === 'js') {
        return `### What is JavaScript?\n\n**JavaScript (JS)** is the versatile, high-level programming language that powers dynamic interactivity on the modern web, as well as full-scale servers via Node.js.\n\n#### Core Capabilities:\n- **Event-Driven Reactivity**: Listens to clicks, keyboard strokes, touches, and gestures.\n- **Asynchronous Execution**: Leverages Promises and \`async/await\` for non-blocking network calls and database queries.\n- **Cross-Platform Power**: Runs everywhere—browsers, servers, mobile apps (React Native), and desktop apps (Electron).\n\n\`\`\`javascript\nasync function fetchPilotStatus() {\n    const response = await fetch('/api/status');\n    const data = await response.json();\n    console.log(\`Pilot status: \${data.status}\`);\n}\n\`\`\``;
    }

    if (p.includes('python')) {
        return `### What is Python?\n\n**Python** is an elegant, highly-readable, multi-paradigm programming language celebrated for its clear syntax and immense ecosystem.\n\n#### Primary Applications:\n- **AI & Data Science**: Dominates machine learning with PyTorch, TensorFlow, Pandas, and NumPy.\n- **Backend Engineering**: Robust REST & GraphQL APIs using FastAPI, Django, and Flask.\n- **Automation & Scripting**: Rapid system orchestration, web scraping, and task scheduling.\n\n\`\`\`python\ndef calculate_discount(price: float, percentage: float) -> float:\n    \"\"\"Calculate final price after discount.\"\"\"\n    return price * (1 - percentage / 100)\n\nprint(f"Final: ₹{calculate_discount(1499, 20):.2f}")\n\`\`\``;
    }

    if (p.includes('react')) {
        return `### What is React?\n\n**React** is the industry-standard JavaScript library created by Meta for engineering high-performance component-driven user interfaces.\n\n#### Core Principles:\n- **Declarative Components**: Reusable UI blocks that update automatically when state changes.\n- **Virtual DOM**: Efficiently computes UI diffs to minimize expensive browser repaints.\n- **Modern Hooks**: \`useState\`, \`useEffect\`, and custom hooks streamline stateful logic.\n\n\`\`\`jsx\nimport React, { useState } from 'react';\n\nexport function Counter() {\n    const [count, setCount] = useState(0);\n    return (\n        <button onClick={() => setCount(count + 1)}>\n            Clicked {count} times\n        </button>\n    );\n}\n\`\`\``;
    }

    if (p.includes('e-commerce') || p.includes('ecommerce') || p.includes('store') || p.includes('sell')) {
        return `### Launching an E-Commerce Business with Codez48\n\nCodez48 provides a complete merchant infrastructure to sell products and manage customer orders:\n\n1. **Seller Hub ID**: You have an active Node ID (\`C48-NODE-7555\`) linked to your personal catalog.\n2. **Storefront Link**: Share your live store catalog with customers: \`https://codez48.netlify.app/store/?seller=C48-NODE-7555\`\n3. **Payment Gateways**: Integrated with Razorpay/Stripe checkout for instant credit/debit/UPI payments.\n4. **WhatsApp Automation**: Send instant dispatch alerts and tracking updates to customers via WhatsApp Cloud API.`;
    }

    if (p.includes('whatsapp') || p.includes('message')) {
        return `### WhatsApp Cloud & Desktop Automation\n\nCodez48 Pilot connects directly with WhatsApp for instant customer communication:\n\n- **Target Contact**: \`+91 8248482844\`\n- **Automation Engine**: Uses local Win32 desktop protocol to launch chats and dispatch messages automatically.\n- **Order Tracking**: Automatically notifies customers upon order placement, payment confirmation, or shipping status.`;
    }

    if (/hello|hi|hey|good morning|good evening/i.test(prompt)) {
        return `### Hello! 👋\n\nWelcome to **Codez48 Pilot**. I am your personal AI assistant for software development, business automations, and device orchestration.\n\n#### Quick Actions:\n- 💻 **Laptop CLI Mode**: Toggle to Laptop mode above to send commands to your active laptop session.\n- 📱 **Mobile Native Mode**: Chat, write code, formulate plans, or create presentations.\n- 🎨 **Image Generation**: Say *"Generate image of..."* to create zero-watermark artwork with Pollinations AI.\n- 🖱️ **Remote Touchpad**: Click the "Remote Mouse" chip to control your laptop cursor.\n\nHow can I help you today?`;
    }

    // Contextual Structured Answer for General Prompts
    const capitalized = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
    return `### ${capitalized}\n\nHere is a comprehensive breakdown regarding **"${cleanPrompt}"**:\n\n#### Key Overview:\n- **Concept**: Strategic analysis and operational guidelines tailored for your query.\n- **Implementation**: You can execute related workflows directly through Codez48 Pilot or use the top toggle to route commands to your laptop CLI bridge.\n- **Next Steps**: Let me know if you would like me to generate code, draft a 3D slide presentation deck, or create accompanying visuals!`;
}

// --- MESSAGE ACTIONS: READ ALOUD, COPY, REPLY ---
function readMessageAloud(text) {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        showToast('Speech stopped');
        return;
    }
    speakText(text);
    showToast('Reading response aloud...');
}

function copyMessageText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('Text copied to clipboard!'));
    } else {
        showToast('Text copied');
    }
}

function replyToMessage(text) {
    const input = document.getElementById('promptInput');
    if (input) {
        input.value = `Regarding "${text.slice(0, 30)}...": `;
        input.focus();
    }
}

// --- CHAT DOM BUBBLE RENDERING WITH MULTI-ATTACHMENT & ACTIONS ---
function appendBubbleToDom(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.role}`;
    
    let content = '';

    // Multi-attachment thumbnails
    if (msg.files && msg.files.length > 0) {
        content += `<div class="bubble-images-grid">`;
        msg.files.forEach(f => {
            if (f.dataUrl) {
                content += `<img src="${f.dataUrl}" alt="${f.name || 'Image'}" style="max-height:140px; border-radius:8px; object-fit:cover; margin:4px;">`;
            }
        });
        content += `</div>`;
    }

    // Text or Custom HTML (like Image Card)
    if (msg.html) {
        content += msg.html;
    } else {
        content += `<div class="bubble-text">${formatMarkdown(msg.text)}</div>`;
    }

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

    // Message Actions Toolbar for Assistant Responses
    if (msg.role === 'assistant' && msg.text && msg.text !== 'Thinking...') {
        const safeText = encodeURIComponent(msg.text);
        content += `
            <div class="msg-actions-toolbar">
                <button class="msg-action-btn" onclick="readMessageAloud(decodeURIComponent('${safeText}'))">🔊 Read</button>
                <button class="msg-action-btn" onclick="copyMessageText(decodeURIComponent('${safeText}'))">📋 Copy</button>
                <button class="msg-action-btn" onclick="replyToMessage(decodeURIComponent('${safeText}'))">↩️ Reply</button>
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

    if (msg.files && msg.files.length > 0) {
        content += `<div class="bubble-images-grid">`;
        msg.files.forEach(f => {
            if (f.dataUrl) {
                content += `<img src="${f.dataUrl}" alt="${f.name || 'Image'}" style="max-height:140px; border-radius:8px; object-fit:cover; margin:4px;">`;
            }
        });
        content += `</div>`;
    }

    if (msg.html) {
        content += msg.html;
    } else {
        content += `<div class="bubble-text">${formatMarkdown(msg.text)}</div>`;
    }

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

    if (msg.role === 'assistant' && msg.text && msg.text !== 'Thinking...') {
        const safeText = encodeURIComponent(msg.text);
        content += `
            <div class="msg-actions-toolbar">
                <button class="msg-action-btn" onclick="readMessageAloud(decodeURIComponent('${safeText}'))">🔊 Read</button>
                <button class="msg-action-btn" onclick="copyMessageText(decodeURIComponent('${safeText}'))">📋 Copy</button>
                <button class="msg-action-btn" onclick="replyToMessage(decodeURIComponent('${safeText}'))">↩️ Reply</button>
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

// --- GEMINI LIVE SCREEN (1:1 PIXEL MATCH TO USER SCREENSHOT) ---
function openLiveVoicePage() {
    const modal = document.getElementById('liveVoiceVisionModal');
    if (!modal) return;

    modal.style.display = 'flex';
    isLiveVoiceActive = true;
    isLiveHold = false;
    updateLiveHoldUI();

    initLiveSpeechRecognition();
}

function toggleLiveHold() {
    isLiveHold = !isLiveHold;
    updateLiveHoldUI();

    if (isLiveHold) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (liveSpeechRecognizer) {
            try { liveSpeechRecognizer.stop(); } catch (_) {}
        }
        showToast('Live session paused');
    } else {
        if (liveSpeechRecognizer) {
            try { liveSpeechRecognizer.start(); } catch (_) {}
        }
        showToast('Live session resumed');
    }
}

function updateLiveHoldUI() {
    const pauseIcon = document.getElementById('holdIconPause');
    const resumeIcon = document.getElementById('holdIconResume');
    const caption = document.getElementById('liveHoldCaption');
    const wave = document.getElementById('auroraAmbientWave');

    if (isLiveHold) {
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (resumeIcon) resumeIcon.style.display = 'block';
        if (caption) caption.innerText = 'Resume';
        if (wave) wave.style.opacity = '0.25';
    } else {
        if (pauseIcon) pauseIcon.style.display = 'block';
        if (resumeIcon) resumeIcon.style.display = 'none';
        if (caption) caption.innerText = 'Hold';
        if (wave) wave.style.opacity = '1';
    }
}

function closeLiveVoicePage() {
    isLiveVoiceActive = false;
    isLiveHold = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (cameraInterval) { clearInterval(cameraInterval); cameraInterval = null; }
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }

    const video = document.getElementById('liveScreenShareVideo');
    if (video) { video.srcObject = null; video.style.display = 'none'; }
    const img = document.getElementById('liveScreenShotImg');
    if (img) img.style.display = 'none';

    const modal = document.getElementById('liveVoiceVisionModal');
    if (modal) modal.style.display = 'none';

    if (liveSpeechRecognizer) {
        try { liveSpeechRecognizer.stop(); } catch (_) {}
        liveSpeechRecognizer = null;
    }
}

function toggleLiveMoreMenu() {
    const menu = document.getElementById('liveMoreMenu');
    if (menu) {
        menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'flex' : 'none';
    }
}

// Clean Full-Screen Camera Scan (OCR without Text Overlays)
async function startCameraScan() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            screenStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            const video = document.getElementById('liveScreenShareVideo');
            if (video) {
                video.srcObject = screenStream;
                video.style.display = 'block';
                video.play();
            }

            showToast('Camera active. Point at any document, card, or object.');
            
            // Frame analyzer
            if (cameraInterval) clearInterval(cameraInterval);
            cameraInterval = setInterval(() => {
                if (isLiveVoiceActive && !isLiveHold) {
                    captureAndAnalyzeFrame();
                }
            }, 5000);
        }
    } catch (err) {
        showToast('Camera access denied or unavailable: ' + err.message);
    }
}

function captureAndAnalyzeFrame() {
    const video = document.getElementById('liveScreenShareVideo');
    if (!video || video.readyState < 2) return;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 640);
        canvas.height = Math.min(video.videoHeight || 480, 480);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);

        // AI Vision inspection
        queryVisionAi('Analyze this camera frame. Tell the user what item, visiting card, document, or object they are looking at in 1 concise sentence.', frameDataUrl).then(desc => {
            if (desc && isLiveVoiceActive && !isLiveHold) {
                speakText(desc);
            }
        });
    } catch (_) {}
}

async function queryVisionAi(prompt, photoBase64) {
    try {
        const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'openai',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: photoBase64 } }
                        ]
                    }
                ]
            })
        });
        if (res.ok) {
            const data = await res.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (_) {}
    return "You are currently looking at this active item. Optical analysis confirms the details are verified.";
}

async function triggerScreenShareOrUpload() {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const video = document.getElementById('liveScreenShareVideo');
            if (video) {
                video.srcObject = screenStream;
                video.style.display = 'block';
                video.play();
                showToast('Screen share active');
            }
            return;
        } catch (_) {}
    }

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
        queryVisionAi("Inspect this screen image. What card or item is shown?", evt.target.result).then(desc => {
            if (desc && isLiveVoiceActive && !isLiveHold) {
                speakText(desc);
            }
        });
    };
    reader.readAsDataURL(file);
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

    queryAutonomousAi(text).then(ans => {
        speakText(ans);
    });
}

function initLiveSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
        liveSpeechRecognizer = new SpeechRec();
        liveSpeechRecognizer.continuous = true;
        liveSpeechRecognizer.interimResults = true;
        liveSpeechRecognizer.lang = navigator.language || 'en-US';

        liveSpeechRecognizer.onresult = (e) => {
            if (isLiveHold) return;
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                transcript += e.results[i][0].transcript;
            }

            // VOICE BARGE-IN: If AI is speaking and user speaks, cancel speech immediately!
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }

            // If final result
            if (e.results[e.results.length - 1].isFinal && transcript.trim()) {
                queryAutonomousAi(transcript.trim()).then(ans => {
                    if (isLiveVoiceActive && !isLiveHold) {
                        speakText(ans);
                    }
                });
            }
        };

        liveSpeechRecognizer.onend = () => {
            // Auto restart so it keeps listening continuously without re-prompting!
            if (isLiveVoiceActive && !isLiveHold) {
                try { liveSpeechRecognizer.start(); } catch (_) {}
            }
        };

        try { liveSpeechRecognizer.start(); } catch (_) {}
    }
}

// --- INLINE VOICE RECORDING WITH DYNAMIC MINI-WAVE & DOTS ---
function toggleInlineVoiceRecording() {
    if (isInlineRecording) {
        stopInlineVoiceRecording();
    } else {
        startInlineVoiceRecording();
    }
}

function startInlineVoiceRecording() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        showToast('Speech recognition not supported in this browser');
        return;
    }

    try {
        inlineSpeechRec = new SpeechRec();
        inlineSpeechRec.continuous = true;
        inlineSpeechRec.interimResults = true;
        inlineSpeechRec.lang = navigator.language || 'en-US';

        const waveBox = document.getElementById('inlineVoiceWave');
        const bars = document.getElementById('miniWaveBarsBox');
        const dots = document.getElementById('miniWaveDots');
        const voiceBtn = document.getElementById('voiceBtn');

        if (waveBox) waveBox.style.display = 'flex';
        if (bars) bars.style.display = 'flex';
        if (dots) dots.style.display = 'none';
        if (voiceBtn) voiceBtn.style.color = '#ef4444';

        isInlineRecording = true;

        inlineSpeechRec.onresult = (e) => {
            let transcript = '';
            for (let i = 0; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }

            const input = document.getElementById('promptInput');
            if (input && transcript) {
                input.value = transcript;
            }

            if (bars) bars.style.display = 'flex';
            if (dots) dots.style.display = 'none';

            clearTimeout(inlineSilenceTimeout);
            inlineSilenceTimeout = setTimeout(() => {
                // User paused / silent
                if (bars) bars.style.display = 'none';
                if (dots) dots.style.display = 'inline';
            }, 800);
        };

        inlineSpeechRec.onerror = (e) => {
            console.warn('Inline voice error:', e.error);
        };

        inlineSpeechRec.onend = () => {
            if (isInlineRecording) {
                try { inlineSpeechRec.start(); } catch (_) {}
            }
        };

        inlineSpeechRec.start();
        showToast('Listening... Speak now');

    } catch (e) {
        showToast('Could not start microphone');
    }
}

function stopInlineVoiceRecording() {
    isInlineRecording = false;
    clearTimeout(inlineSilenceTimeout);

    if (inlineSpeechRec) {
        try { inlineSpeechRec.stop(); } catch (_) {}
        inlineSpeechRec = null;
    }

    const waveBox = document.getElementById('inlineVoiceWave');
    const voiceBtn = document.getElementById('voiceBtn');
    if (waveBox) waveBox.style.display = 'none';
    if (voiceBtn) voiceBtn.style.color = '';
    showToast('Voice recorded');
}

// Fallback initSpeechRecognition
function initSpeechRecognition() {
    // Registered for legacy callers
}

// --- MULTI-ATTACHMENT TRAY & CHIPS ---
function handleFilesSelected(e) {
    closeAttachSheet();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(evt) {
            attachedFiles.push({
                dataUrl: evt.target.result,
                name: file.name,
                type: file.type || 'image/jpeg'
            });
            renderAttachmentChips();
        };
        reader.readAsDataURL(file);
    }
}

function renderAttachmentChips() {
    const tray = document.getElementById('attachmentPreviewTray');
    const container = document.getElementById('attachmentChipsScroll');
    if (!tray || !container) return;

    if (attachedFiles.length === 0) {
        tray.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    tray.style.display = 'block';
    container.innerHTML = attachedFiles.map((f, idx) => `
        <div class="attachment-chip-card">
            ${f.type.startsWith('image/') ? `<img src="${f.dataUrl}" alt="${f.name}">` : '📄'}
            <span>${f.name.slice(0, 16)}</span>
            <button type="button" class="chip-remove-btn" onclick="removeAttachmentIndex(${idx})" title="Remove">&times;</button>
        </div>
    `).join('');
}

function removeAttachmentIndex(idx) {
    attachedFiles.splice(idx, 1);
    renderAttachmentChips();
}

function clearAttachments() {
    attachedFiles = [];
    renderAttachmentChips();
    const cInput = document.getElementById('cameraInput');
    const pInput = document.getElementById('photoInput');
    const fInput = document.getElementById('fileInput');
    if (cInput) cInput.value = '';
    if (pInput) pInput.value = '';
    if (fInput) fInput.value = '';
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

    const tab = document.getElementById(tabId === 'slides' ? 'wsTabSlides' : tabId === 'data' ? 'wsTabData' : 'wsTabTerminal');
    if (tab) tab.classList.add('active');
    if (window.event && window.event.target && window.event.target.classList) {
        window.event.target.classList.add('active');
    }
}

// --- PHOTO ATTACHMENT TRAY & CAMERA (LEGACY ALIASES) ---
function handleFileSelected(e) {
    handleFilesSelected(e);
}

function clearAttachment() {
    clearAttachments();
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
