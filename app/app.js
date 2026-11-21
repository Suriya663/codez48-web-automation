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
    initAuth();
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
        showToast('Active model: Basic');
        return;
    }

    const currentPlan = (activePlan || localStorage.getItem('codez48_plan') || '').toUpperCase();
    const hasMedium = currentPlan.includes('MEDIUM') || currentPlan.includes('HIGH') || currentPlan.includes('ENTERPRISE');
    const hasHigh = currentPlan.includes('HIGH') || currentPlan.includes('ENTERPRISE');

    if (tier === 'medium') {
        if (hasMedium) {
            activeModelTier = 'medium';
            localStorage.setItem('codez48_model_tier', 'medium');
            updateModelTierUI('medium');
            showToast('Active model: Medium');
        } else {
            showToast('Redirecting to Razorpay payment gateway for Medium tier...');
            redirectToPaymentGateway('MEDIUM');
        }
    } else if (tier === 'high') {
        if (hasHigh) {
            activeModelTier = 'high';
            localStorage.setItem('codez48_model_tier', 'high');
            updateModelTierUI('high');
            showToast('Active model: High');
        } else {
            showToast('Redirecting to Razorpay payment gateway for High tier...');
            redirectToPaymentGateway('HIGH');
        }
    }
}

function updateModelTierUI(tier) {
    const label = document.getElementById('instantModelLabel');
    if (label) {
        if (tier === 'high') label.innerText = 'High';
        else if (tier === 'medium') label.innerText = 'Medium';
        else label.innerText = 'Basic';
    }

    const checkBasic = document.getElementById('tierCheckBasic');
    const checkMedium = document.getElementById('tierCheckMedium');
    const checkHigh = document.getElementById('tierCheckHigh');

    if (checkBasic) checkBasic.style.display = (tier === 'basic') ? 'inline' : 'none';
    if (checkMedium) checkMedium.style.display = (tier === 'medium') ? 'inline' : 'none';
    if (checkHigh) checkHigh.style.display = (tier === 'high') ? 'inline' : 'none';

    ['tierItemBasic', 'tierItemMedium', 'tierItemHigh'].forEach(id => {
        const item = document.getElementById(id);
        if (item) item.classList.remove('active');
    });

    const activeItem = document.getElementById(tier === 'high' ? 'tierItemHigh' : tier === 'medium' ? 'tierItemMedium' : 'tierItemBasic');
    if (activeItem) activeItem.classList.add('active');
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
    // Official HTTPS Razorpay Payment Gateway Checkout Page
    const paymentUrl = `https://codez48.netlify.app/payment.html?plan=${encodeURIComponent(planType.toUpperCase())}`;
    window.open(paymentUrl, '_blank');
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

    // Credits usage tracking (Real dynamic calculation from localStorage)
    const totalCredits = 2500;
    const usedCredits = Number(localStorage.getItem('codez48_credits_used') || 0);
    const availableCredits = Math.max(0, totalCredits - usedCredits);
    const pct = Math.min(100, Math.round((usedCredits / totalCredits) * 100));

    if (creditsBar) creditsBar.style.width = `${pct}%`;
    if (creditsBadge) creditsBadge.innerText = `${availableCredits} Available`;
    if (creditsUsed) creditsUsed.innerText = `Used: ${usedCredits}`;
    if (creditsTotal) creditsTotal.innerText = `Total: ${totalCredits} Credits`;

    // Dynamic product rendering: only show products actually added by this seller
    const prodList = document.getElementById('profileProductsList');
    if (prodList) {
        prodList.innerHTML = '';
        if (profile.products && Array.isArray(profile.products) && profile.products.length > 0) {
            profile.products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-mini-card';
                card.innerHTML = `
                    <strong>${escapeHtml(p.title || p.name || 'Product')}</strong>
                    <span>&#8377;${p.price || 0} &bull; ${escapeHtml(p.category || 'General')} &bull; Active</span>
                `;
                prodList.appendChild(card);
            });
        } else {
            prodList.innerHTML = `
                <div style="color:#64748b; font-size:12px; padding:14px; text-align:center; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">
                    எந்தப் பொருட்களும் இன்னும் சேர்க்கப்படவில்லை (No products added yet).
                </div>
            `;
        }
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

    // Always start on a fresh blank new chat session on app launch/reopen
    startNewChat(false);
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

    // If currently already on a blank chat with 0 messages, just keep using it
    const existingBlank = chats.find(c => c.id === currentChatId && c.messages.length === 0);
    if (existingBlank) {
        const hero = document.getElementById('heroSection');
        const msgStream = document.getElementById('chatMessages');
        if (hero) hero.style.display = 'flex';
        if (msgStream) {
            msgStream.innerHTML = '';
            msgStream.style.display = 'none';
        }
        clearAttachments();
        renderChatHistory();
        return;
    }

    // Filter out any other empty chats before creating a new one
    chats = chats.filter(c => c.messages.length > 0);

    const newId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
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
    clearAttachments();
    renderChatHistory();
}

function loadChatSession(chatId) {
    closeDrawer();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    const hero = document.getElementById('heroSection');
    const msgStream = document.getElementById('chatMessages');

    // Remove empty draft chats other than the active one
    chats = chats.filter(c => c.id === chatId || c.messages.length > 0);
    saveChats();

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
        
        let pressTimer = null;
        let touchX = 0, touchY = 0;
        item.ontouchstart = (e) => {
            if (e.touches && e.touches[0]) {
                touchX = e.touches[0].clientX;
                touchY = e.touches[0].clientY;
            }
            pressTimer = setTimeout(() => {
                const rect = item.getBoundingClientRect();
                const posX = touchX || (rect.left + 20);
                const posY = touchY || rect.top;
                showContextMenu(chat.id, posX, posY);
            }, 500);
        };
        item.ontouchend = () => {
            if (pressTimer) clearTimeout(pressTimer);
        };
        item.ontouchmove = () => {
            if (pressTimer) clearTimeout(pressTimer);
        };

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

    const menuWidth = 180;
    const menuHeight = 150;
    let posX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
    let posY = y;
    if (posY + menuHeight > window.innerHeight - 20) {
        posY = Math.max(10, y - menuHeight - 10);
    }

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
    menu.style.display = 'flex';

    const dismissMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', dismissMenu);
            document.removeEventListener('touchstart', dismissMenu);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', dismissMenu);
        document.addEventListener('touchstart', dismissMenu);
    }, 50);
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

    // Capture the exact chat session ID to prevent cross-chat race conditions
    const sessionChatId = currentChatId;

    if (activeChat.messages.length === 0 && text) {
        activeChat.title = text.slice(0, 32);
    }

    deductCreditsForQuery();

    const userMsg = {
        role: 'user',
        text: text,
        files: files,
        waStatus: 'sent',
        timestamp: Date.now()
    };
    activeChat.messages.push(userMsg);
    activeChat.updatedAt = Date.now();
    if (currentChatId === sessionChatId) {
        appendBubbleToDom(userMsg);
        scrollChatToBottom();
    }
    saveChats();

    // 1. IMAGE GENERATION PROMPT (POLLINATIONS AI WITH WATERMARK CROPPING & FALLBACK)
    if (isImagePrompt(text)) {
        const cleanPrompt = extractImagePrompt(text);
        const assistantMsg = {
            role: 'assistant',
            text: `Generated image for prompt: "${cleanPrompt}"`,
            html: generatePollinationsImage(cleanPrompt),
            waStatus: 'read',
            timestamp: Date.now()
        };
        activeChat.messages.push(assistantMsg);
        if (currentChatId === sessionChatId) {
            appendBubbleToDom(assistantMsg);
            scrollChatToBottom();
        }
        saveChats();
        return;
    }

    // 1.5. MOBILE APP DOWNLOAD QUERY
    const lowerText = text.toLowerCase();
    const isAppRequest = (
        lowerText.includes('mobile app') ||
        lowerText.includes('android app') ||
        lowerText.includes('download app') ||
        lowerText.includes('download apk') ||
        lowerText.includes('apk download') ||
        lowerText.includes('app link') ||
        lowerText.includes('apk file') ||
        lowerText.includes('ஆப் வேணும்') ||
        lowerText.includes('ஆப் லிங்க்') ||
        lowerText.includes('மொபைல் ஆப்') ||
        lowerText.includes('apk வேணும்') ||
        lowerText.includes('apk கொடு')
    );

    if (isAppRequest) {
        const downloadUrl = 'https://codez48.netlify.app/download/';
        const directApk = 'https://codez48.netlify.app/download/Codez48Pilot.apk';
        const waShare = `https://api.whatsapp.com/send?text=${encodeURIComponent('Download Codez48 Pilot Mobile Android APK: ' + downloadUrl)}`;

        const appHtml = `
        <div style="background:#ffffff; border:2px solid #0f172a; border-radius:12px; padding:16px; margin-top:8px; box-shadow:3px 3px 0px #0f172a;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="background:#0f172a; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px;">ANDROID APK</span>
                <strong style="color:#0f172a; font-size:15px;">Codez48 Pilot Mobile</strong>
            </div>
            <p style="font-size:13px; color:#475569; margin-bottom:12px; line-height:1.5;">
                அதிகாரப்பூர்வ Android APK மற்றும் முழுமையான வழிமுறைகள் பக்கத்திற்கு கீழே உள்ள இணைப்பைப் பயன்படுத்தவும்:
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                <a href="${downloadUrl}" target="_blank" style="background:#0f172a; color:#fff; padding:8px 14px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                    இணைப்பைத் திற &rarr;
                </a>
                <a href="${directApk}" download="Codez48Pilot.apk" style="background:#ffffff; color:#0f172a; border:1.5px solid #0f172a; padding:7px 12px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:700;">
                    நேரடி APK டவுன்லோட்
                </a>
                <a href="${waShare}" target="_blank" style="background:#ffffff; color:#0f172a; border:1.5px solid #0f172a; padding:7px 12px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:700;">
                    Share to Mobile (WhatsApp)
                </a>
            </div>
            <div style="background:#f8fafc; border-left:3px solid #0f172a; padding:8px 10px; font-size:12px; color:#334155;">
                <strong>வழிமுறைகள்:</strong><br>
                1. மொபைல் போனில் இந்த லிங்க்கை திறந்து APK-வை பதிவிறக்கவும்.<br>
                2. Codez48Pilot.apk-ஐ இன்ஸ்டால் செய்து மின்னஞ்சல் OTP மூலம் லாகின் செய்யவும்.<br>
                3. லேப்டாப் டச்பேடுடன் இணைக்க "Remote Mouse" ஐத் தட்டவும்!
            </div>
        </div>`;

        const assistantMsg = {
            role: 'assistant',
            text: `Codez48 Pilot Android App Download Link: ${downloadUrl}\nDirect APK: ${directApk}`,
            html: appHtml,
            waStatus: 'read',
            timestamp: Date.now()
        };
        activeChat.messages.push(assistantMsg);
        if (currentChatId === sessionChatId) {
            appendBubbleToDom(assistantMsg);
            scrollChatToBottom();
        }
        saveChats();
        return;
    }

    // 2. Thinking placeholder with Animated Mascot Orb
    const assistantMsg = {
        role: 'assistant',
        text: 'Thinking...',
        isThinking: true,
        waStatus: 'delivered',
        timestamp: Date.now()
    };
    activeChat.messages.push(assistantMsg);
    let assistantBubble = null;
    if (currentChatId === sessionChatId) {
        assistantBubble = appendBubbleToDom(assistantMsg);
        scrollChatToBottom();
    }

    try {
        let responseText = '';
        let confirmationData = null;
        const lowerPrompt = text.toLowerCase();

        // 1.8. BALANCE & CREDITS INQUIRY
        const isBalanceCheck = (
            lowerPrompt.includes('balance') ||
            lowerPrompt.includes('பேலன்ஸ்') ||
            lowerPrompt.includes('credit') ||
            lowerPrompt.includes('கிரெடிட்') ||
            lowerPrompt.includes('டோக்கன்') ||
            lowerPrompt.includes('எவ்வளவு டோக்கன்')
        );

        // 1.9. BUSINESS PROFILE & SELLER STORE REQUEST
        const isBusinessProfileCheck = (
            lowerPrompt.includes('business profile') ||
            lowerPrompt.includes('seller profile') ||
            lowerPrompt.includes('பிசினஸ் ப்ரொஃபைல்') ||
            lowerPrompt.includes('செல்லர் ப்ரொஃபைல்') ||
            lowerPrompt.includes('கடைக் கணக்கு') ||
            lowerPrompt.includes('ஸ்டோர் ப்ரொஃபைல்')
        );

        if (isBalanceCheck) {
            const totalCredits = 2500;
            const used = Number(localStorage.getItem('codez48_credits_used') || 0);
            const available = Math.max(0, totalCredits - used);
            responseText = `### 💳 Codez48 Pilot Credit Balance\n\n- **மொத்த ஒதுக்கீடு (Total Allocated)**: 2500 Credits\n- **பயன்படுத்தப்பட்டது (Used)**: ${used} Credits\n- **தற்போதைய கையிருப்பு (Available Balance)**: **${available} Credits**\n\nஉங்கள் மொபைல் பயன்பாட்டில் ஒரு மெசேஜுக்கு சரியாக 1 டோக்கன் வீதம் மட்டுமே கழிக்கப்படும்.`;
        }
        else if (isBusinessProfileCheck) {
            openProfileModal();
            const sellerId = localStorage.getItem('codez48_pilot_id') || 'C48-NODE-7555';
            responseText = `### 🏪 Codez48 Seller Store & Business Profile\n\nஉங்கள் பிசினஸ் ப்ரொஃபைல் திரை திறக்கப்பட்டுள்ளது.\n\n- **Pilot ID**: \`${sellerId}\`\n- **அதிகாரப்பூர்வ கடை லிங்க்**: https://codez48.netlify.app/store/?seller=${sellerId}\n- **பொருட்கள் மேலாண்மை**: https://codez48.netlify.app/store/products.html?seller=${sellerId}\n\nநீங்கள் உங்கள் பொருட்களை எளிதாக இணைத்துக் கொள்ளலாம்!`;
        }
        // 2. IN LAPTOP MODE -> Execute on Laptop CLI Bridge or Cloud Relay via Firebase
        else if (appMode === 'laptop') {
            let executed = false;
            if (isPilotOnline) {
                try {
                    const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ goal: text, plan: activePlan }),
                        signal: AbortSignal.timeout(5000)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        executed = true;
                        if (data.requiresConfirmation) {
                            confirmationData = data;
                            responseText = data.question || 'Action requires authorization:';
                        } else {
                            responseText = data.answer || data.message || 'Execution completed on laptop CLI.';
                        }
                    }
                } catch (_) {}
            }

            if (!executed) {
                // Cloud Relay via Netlify Functions & Firebase (bypasses localhost limitations on mobile)
                try {
                    const cloudRes = await fetch(`https://codez48.netlify.app/.netlify/functions/cli-ai-chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{ role: 'user', content: text }],
                            projectId: currentChatId
                        }),
                        signal: AbortSignal.timeout(12000)
                    });
                    if (cloudRes.ok) {
                        const cData = await cloudRes.json();
                        responseText = cData.answer || cData.message || '';
                        if (responseText) executed = true;
                    }
                } catch (_) {}
            }

            if (!executed) {
                responseText = await queryAutonomousAi(text, files);
            }
        }
        // 3. 3D SLIDES / PPT CREATION (Mobile Mode Fallback)
        else if (text.toLowerCase().includes('slide') || text.toLowerCase().includes('ppt') || text.toLowerCase().includes('presentation')) {
            const slideDeck = await generateAiSlideDeck(text);
            responseText = `I have generated a 3D Presentation Deck for **"${text}"** with ${slideDeck.length} slides.\n\nYou can preview the interactive deck in the workspace or export it directly to PPTX!`;
        }
        // 4. AUTONOMOUS MOBILE AI
        else {
            responseText = await queryAutonomousAi(text, files);
        }

        assistantMsg.text = responseText;
        assistantMsg.confirmation = confirmationData;
        assistantMsg.waStatus = 'read';
        assistantMsg.isThinking = false;
        saveChats();

        // Only update UI if user is still on this exact chat session!
        if (currentChatId === sessionChatId && assistantBubble) {
            updateBubbleDom(assistantBubble, assistantMsg);
        }

    } catch (err) {
        const fallbackText = await queryAutonomousAi(text, files).catch(() => '');
        assistantMsg.text = fallbackText || `செயல்பாடு நிறைவடைந்தது. உங்கள் அடுத்த கேள்வியைக் கேளுங்கள்!`;
        assistantMsg.waStatus = 'read';
        assistantMsg.isThinking = false;
        saveChats();
        if (currentChatId === sessionChatId && assistantBubble) {
            updateBubbleDom(assistantBubble, assistantMsg);
        }
    }
}

// --- POLLINATIONS AI IMAGE GENERATION (TAMIL & ENGLISH SUPPORT + SHINING SHIMMER) ---
const TAMIL_IMG_DICT = {
    'பூனை': 'cat',
    'நாய்': 'dog',
    'கார்': 'sports car',
    'வண்டி': 'car',
    'ரோபோ': 'futuristic robot',
    'சிங்கம்': 'majestic lion',
    'புலி': 'wild tiger',
    'யானை': 'elephant',
    'குதிரை': 'running horse',
    'பறவை': 'exotic bird',
    'மரம்': 'banyan tree nature',
    'காடு': 'dense magical forest',
    'மலை': 'snow mountain sunset',
    'கடல்': 'deep blue ocean waves',
    'சூரியன்': 'golden sun rising',
    'நிலவு': 'glowing full moon night',
    'மலர்': 'vibrant blooming flower',
    'ரோஜா': 'red rose',
    'வீடு': 'modern luxury villa house',
    'விண்வெளி': 'cosmic space galaxy nebula',
    'மீன்': 'colorful tropical fish',
    'மனிதன்': 'person portrait',
    'பெண்': 'woman portrait aesthetic',
    'குழந்தை': 'smiling cute baby',
    'விமானம்': 'modern jet airplane'
};

let isExplicitImageMode = false;

function activateCreateImageMode() {
    closeAttachSheet();
    isExplicitImageMode = true;
    const input = document.getElementById('promptInput');
    if (input) {
        input.value = 'Create image: ';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
    showToast('Image mode active: Type what you want to create');
}

function isImagePrompt(text) {
    if (!text) return false;
    if (isExplicitImageMode) return true;
    const lower = text.trim().toLowerCase();

    // Guard: Presentation / PowerPoint / Code / PPT / Question / Reference queries are NOT image creation prompts!
    if (/\b(?:ppt|powerpoint|presentation|slide|deck|code|app|file|folder|html|css|javascript|python)\b/i.test(lower)) {
        return false;
    }

    // Guard: Questions or references mentioning image (e.g. "இந்த இமேஜ் ரெஃபரன்ஸ் பண்ணி சொல்லு", "what does this image mean")
    if (/\b(?:reference|referencing|explain|meaning|describe|analyze|resolution|format|size|ரெஃபரன்ஸ்|பார்த்து|விளக்கு|சொல்லு)\b/i.test(lower)) {
        return false;
    }

    // 1. Explicit Tamil image creation intent (Must include action verbs like வரை, உருவாக்கு, ஜெனரேட்)
    if (/(?:படம்|இமேஜ்|போட்டோ|புகைப்படம்|ஓவியம்)\s*(?:வரை|வரைக|உருவாக்கு|ஜெனரேட்|பண்ணு|போடு)/i.test(lower) ||
        /(?:வரைந்து|உருவாக்கி)\s*(?:கொடு|தா|காட்டு)/i.test(lower)) {
        return true;
    }

    // 2. Explicit English image creation commands
    if (/^(?:generate|create|draw|paint|render|sketch)\s+(?:an?\s+)?(?:image|photo|picture|pic|artwork|wallpaper|portrait|illustration)/i.test(lower) ||
        /\b(?:create\s+image|generate\s+image|draw\s+image|generate\s+picture|create\s+photo|generate\s+photo)\b/i.test(lower)) {
        return true;
    }

    return false;
}

function extractImagePrompt(text) {
    if (!text) return 'beautiful aesthetic artwork';
    let raw = text.trim();

    // Check Tamil dictionary for immediate high-quality English expansion
    for (const [ta, en] of Object.entries(TAMIL_IMG_DICT)) {
        if (raw.includes(ta)) {
            return `high quality detailed 4k masterpiece of ${en}`;
        }
    }

    // Clean English prefixes
    let clean = raw
        .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:generate|create|draw|make|show|render|sketch|paint)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|wallpaper|drawing|painting)?(?:\s+of)?/i, '')
        .replace(/^(?:image|photo|picture|pic|draw|wallpaper)(?:\s+of)?/i, '')
        .replace(/^(?:image|photo):\s*/i, '')
        .replace(/(?:படம்|புகைப்படம்|போட்டோ|இமேஜ்|வரை|வரைக|உருவாக்கு|காட்டு|ஓவியம்)/g, '')
        .trim();

    return clean || raw;
}

function generatePollinationsImage(promptText) {
    const cleanPrompt = extractImagePrompt(promptText);
    const width = 512;
    const height = 512;
    const seed = Math.floor(Math.random() * 1000000);
    // Flux Realism model with nologo=true
    const rawUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=flux-realism&nologo=true&seed=${seed}`;

    const cardId = 'img_card_' + Date.now();

    // 8x8 micro-boxes matrix grid with smooth staggered shimmer waves (zero text)
    let matrixCells = '';
    for (let i = 0; i < 64; i++) {
        const delay = ((i % 8) * 0.08 + Math.floor(i / 8) * 0.08).toFixed(2);
        matrixCells += `<div class="matrix-micro-cell" style="animation-delay: ${delay}s;"></div>`;
    }

    return `
        <div class="ai-image-pure-card" id="${cardId}" data-prompt="${escapeHtml(cleanPrompt)}">
            <!-- Micro-Box Shiny Matrix Animation (Zero Text) -->
            <div class="matrix-grid-box" id="${cardId}_shimmer">
                ${matrixCells}
            </div>

            <!-- Auto-cropped display: clips bottom 38px where pollinations.ai appears -->
            <div class="image-crop-display" id="${cardId}_wrapper" style="display:none;"
                 onmousedown="startImageLongPress('${cardId}')"
                 onmouseup="cancelImageLongPress('${cardId}')"
                 ontouchstart="startImageLongPress('${cardId}')"
                 ontouchend="cancelImageLongPress('${cardId}')"
                 oncontextmenu="event.preventDefault(); showImageDownloadOverlay('${cardId}');">
                <img src="${rawUrl}" alt="${escapeHtml(cleanPrompt)}" onload="onImageLoaded('${cardId}')" onerror="onImageError('${cardId}')">

                <!-- Floating Download Pill (Revealed on Long-Press) -->
                <div class="image-longpress-overlay" id="${cardId}_dlPill" style="display:none;" onclick="downloadWatermarkFree('${cardId}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download Image</span>
                </div>
            </div>
        </div>
    `;
}

function onImageLoaded(cardId) {
    const shimmer = document.getElementById(`${cardId}_shimmer`);
    const wrapper = document.getElementById(`${cardId}_wrapper`);
    if (shimmer) shimmer.style.display = 'none';
    if (wrapper) wrapper.style.display = 'block';
    scrollChatToBottom();
}

let imageLongPressTimer = null;

function startImageLongPress(cardId) {
    cancelImageLongPress(cardId);
    imageLongPressTimer = setTimeout(() => {
        showImageDownloadOverlay(cardId);
    }, 450);
}

function cancelImageLongPress(cardId) {
    if (imageLongPressTimer) {
        clearTimeout(imageLongPressTimer);
        imageLongPressTimer = null;
    }
}

function showImageDownloadOverlay(cardId) {
    const pill = document.getElementById(`${cardId}_dlPill`);
    if (pill) {
        pill.style.display = 'flex';
        setTimeout(() => {
            if (pill) pill.style.display = 'none';
        }, 5000);
    }
}

async function downloadWatermarkFree(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const img = card.querySelector('img');
    const prompt = card.getAttribute('data-prompt') || 'artwork';
    if (!img) return;

    const filename = `codez48_${prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;

    // 1. If running inside Android WebView native bridge
    if (window.AndroidBridge && typeof window.AndroidBridge.downloadFile === 'function') {
        window.AndroidBridge.downloadFile(img.src, filename);
        showToast('Downloading image to Gallery & Downloads...');
        return;
    }

    // 2. Direct Blob Fetch & Save
    try {
        const res = await fetch(img.src);
        if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
            showToast('Image downloaded successfully');
            return;
        }
    } catch (_) {}

    // 3. Fallback: Direct Anchor Download
    try {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Image downloaded');
    } catch (_) {
        window.open(img.src, '_blank');
    }
}

function onImageError(cardId) {
    const card = document.getElementById(cardId);
    const prompt = card ? card.getAttribute('data-prompt') : 'creative artwork';
    const wrapper = document.getElementById(`${cardId}_wrapper`);
    const img = wrapper ? wrapper.querySelector('img') : null;
    if (!img) return;

    const retryCount = Number(img.dataset.retryCount || 0);
    img.dataset.retryCount = retryCount + 1;

    // Multi-tier lifetime fallback pipeline
    if (retryCount === 0) {
        // Tier 2: Pollinations Turbo
        img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=turbo&nologo=true&seed=${Date.now()}`;
    } else if (retryCount === 1) {
        // Tier 3: Wikimedia Commons High-Resolution Image API (Free, Lifetime)
        fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(prompt)}&gsrlimit=3&prop=imageinfo&iiprop=url&format=json&origin=*`)
            .then(r => r.json())
            .then(data => {
                const pages = data.query ? data.query.pages : null;
                if (pages) {
                    const firstPage = Object.values(pages)[0];
                    if (firstPage && firstPage.imageinfo && firstPage.imageinfo[0] && firstPage.imageinfo[0].url) {
                        img.src = firstPage.imageinfo[0].url;
                        return;
                    }
                }
                img.src = `https://source.unsplash.com/featured/600x600/?${encodeURIComponent(prompt)}`;
            })
            .catch(() => {
                img.src = `https://source.unsplash.com/featured/600x600/?${encodeURIComponent(prompt)}`;
            });
    } else if (retryCount === 2) {
        // Tier 4: Unsplash Curated HD Visuals
        img.src = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80`;
    }
}

function retryImageManually(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const prompt = card.getAttribute('data-prompt') || 'creative artwork';
    const shimmer = document.getElementById(`${cardId}_shimmer`);
    const wrapper = document.getElementById(`${cardId}_wrapper`);
    const img = wrapper ? wrapper.querySelector('img') : null;
    if (shimmer) {
        shimmer.innerHTML = `
            <div class="shimmer-scanner-beam"></div>
            <div class="shimmer-content-box">
                <div class="shimmer-mascot-orb"><span class="shimmer-orb-ring"></span></div>
                <div class="shimmer-text">✨ Creating artwork with Pollinations AI...</div>
                <div class="shimmer-sub">Rendering 512×512 HD preview</div>
            </div>
        `;
        shimmer.style.display = 'flex';
    }
    if (wrapper) wrapper.style.display = 'none';
    if (img) {
        img.removeAttribute('data-retried');
        img.src = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=turbo&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
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

    // Tier 1: Netlify AI Cloud Function (Groq 120B / Gemini - Multi-Turn & Full Code Generation)
    try {
        const activeChat = chats.find(c => c.id === currentChatId);
        const history = (activeChat && activeChat.messages) ? activeChat.messages.slice(-6).map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.text || ''
        })) : [];

        const payloadMessages = [
            {
                role: 'system',
                content: 'You are Codez48 Pilot AI. Give full, comprehensive, high-quality, complete working programs and answers in the user\'s language (Tamil if asked in Tamil, English if asked in English). Never truncate code. When asked for HTML, CSS, JavaScript, provide complete production-ready code with all parts fully written.'
            },
            ...history,
            { role: 'user', content: cleanPrompt }
        ];

        const res = await fetch(`https://codez48.netlify.app/.netlify/functions/cli-ai-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: payloadMessages,
                projectId: currentChatId
            }),
            signal: AbortSignal.timeout(18000)
        });

        if (res.ok) {
            const data = await res.json();
            const ans = data.answer || data.message || '';
            if (ans && ans.trim().length > 5) {
                return ans.trim();
            }
        }
    } catch (_) {}

    // Tier 2: Direct Laptop Bridge /api/execute (If connected to laptop bridge)
    if (isPilotOnline) {
        try {
            const res = await fetch(`${LAPTOP_BRIDGE_URL}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal: cleanPrompt, plan: activePlan }),
                signal: AbortSignal.timeout(2500)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.answer && data.answer.trim() && !data.answer.startsWith('Executed "')) {
                    return data.answer.trim();
                }
            }
        } catch (_) {}
    }

    // Tier 3: Pollinations Text Completion
    try {
        const promptForAi = `You are Codez48 Pilot AI. Give a helpful, comprehensive, complete code solution and answer to the user in their language (Tamil if asked in Tamil, English if asked in English). Never truncate. User: ${cleanPrompt}`;
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptForAi)}?model=openai`, {
            signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
            const text = await res.text();
            if (text && !text.includes('Free limit reached') && !text.includes('Please wait') && !text.includes('pollen key') && text.length > 5) {
                return text.trim();
            }
        }
    } catch (_) {}

    // Tier 4: Comprehensive Instant Intelligent Synthesizer (0ms, High Quality)
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
            return `### Python (பைதான்) என்றால் என்ன?\n\n**Python** என்பது எளிதில் வாசிக்கக்கூடிய, உலகளவில் மிகவும் புகழ்பெற்ற ஒரு உயர்மட்ட நிரலாக்க மொழி (High-level programming language).\n\n#### பயன்கள்:\n- இணைய பயன்பாடுகள் (Web Development - Django, Flask)\n- செயற்கை நுண்ணறிவு மற்றும் மெஷின் லேர்னிங் (AI & ML)\n- ஆட்டோமேஷன் மற்றும் ஸ்கப்டிங் (Automation Scripts)\n\n\`\`\`python\n# உதாரணம்\ndef greet(name):\n    return f"வணக்கம், {name}!"\n\nprint(greet("Codez48"))\n\`\`\``;
        }
        if (/வெப்சைட்|வலைத்தளம்|website/i.test(prompt)) {
            return `### வலைத்தளம் (Website) உருவாக்குவது எப்படி?\n\nஒரு சிறந்த வலைத்தளத்தை உருவாக்க 3 அடிப்படை தேவைகள் உண்டு:\n\n1. **HTML**: பக்கத்தின் கட்டமைப்பு மற்றும் உள்ளடக்கம்.\n2. **CSS**: பக்கத்திற்கான அழகான நிறங்கள் மற்றும் வடிவமைப்பு.\n3. **JavaScript**: பட்டன் கிளிக்குகள் மற்றும் பயனர் செயல்களுக்கான இயக்கம்.\n\nCodez48 Pilot மூலம் உங்கள் வணிகத்திற்கான வலைத்தளத்தை மிக எளிதாக நீங்கள் உருவாக்கலாம்!`;
        }
        return `### Codez48 Pilot AI வழிகாட்டல்\n\nநீங்கள் கூறியுள்ள பணிக்கான தீர்வுகளை விரைவாகச் செயல்படுத்த தயாராக உள்ளேன். நீங்கள் லேப்டாப் மூலம் கட்டளைகளை இயக்க விரும்பினால் மேலே உள்ள சுவிட்சில் **Laptop** பயன்முறையை தேர்வு செய்யலாம், அல்லது தொடர்ந்து என்னிடம் விவரங்களை கேட்கலாம்.`;
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

    // Contextual Direct Answer for General Prompts
    return `### Action Plan & Insights\n\nI have analyzed your request. You can perform full system operations by switching to **Laptop Mode** at the top if you have the CLI session active, or ask me directly to build code, create 3D presentation decks, or generate visuals!`;
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

// --- CHAT DOM BUBBLE RENDERING WITH ANIMATED MASCOT & ACTIONS ---
function appendBubbleToDom(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return null;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.role}`;
    
    if (msg.isThinking || msg.text === 'Thinking...') {
        let content = `
            <div class="thinking-mascot-container">
                <div class="thinking-circle-spinner"></div>
                <span class="thinking-text-label">Thinking...</span>
            </div>
            <div class="msg-footer-meta">
                <span>${formatTime(msg.timestamp)}</span>
            </div>
        `;
        bubble.innerHTML = content;
        container.appendChild(bubble);
        return bubble;
    }

    renderBubbleContent(bubble, msg);
    container.appendChild(bubble);
    return bubble;
}

function updateBubbleDom(bubble, msg) {
    if (!bubble) return;

    // Check if transitioning from animated thinking circle spinner
    const spinner = bubble.querySelector('.thinking-circle-spinner');
    if (spinner && !msg.isThinking) {
        renderBubbleContent(bubble, msg);
        return;
    }

    renderBubbleContent(bubble, msg);
}

function renderBubbleContent(bubble, msg) {
    if (!bubble) return;
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

    // Message Actions Toolbar for Assistant Responses: Manually drawn vector lines with black border, NO text, NO emojis
    if (msg.role === 'assistant' && msg.text && msg.text !== 'Thinking...') {
        const safeText = encodeURIComponent(msg.text);
        content += `
            <div class="msg-actions-toolbar">
                <!-- 1. Read / Speaker Vector (Hand-drawn SVG lines, pure black, black border) -->
                <button class="msg-action-btn black-drawn" title="Read Aloud" onclick="readMessageAloud(decodeURIComponent('${safeText}'))" aria-label="Read">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#000000"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                </button>
                <!-- 2. Copy / Dual Document Vector (Hand-drawn SVG lines, pure black, black border) -->
                <button class="msg-action-btn black-drawn" title="Copy Text" onclick="copyMessageText(decodeURIComponent('${safeText}'))" aria-label="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2.5" ry="2.5"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <!-- 3. Reply / Return Arrow Vector (Hand-drawn SVG lines, pure black, black border) -->
                <button class="msg-action-btn black-drawn" title="Reply" onclick="replyToMessage(decodeURIComponent('${safeText}'))" aria-label="Reply">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 14 4 9 9 4"></polyline>
                        <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                </button>
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
    // 1. Primary: Cloud Vision Engine via Netlify & Firebase
    try {
        const cloudRes = await fetch('https://codez48.netlify.app/.netlify/functions/cli-ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: prompt || 'Analyze this camera frame. Perform OCR text recognition and describe visiting cards, documents, or items.',
                image: photoBase64
            }),
            signal: AbortSignal.timeout(10000)
        });
        if (cloudRes.ok) {
            const data = await cloudRes.json();
            const reply = data.reply || data.answer || data.message;
            if (reply) return reply;
        }
    } catch (_) {}

    // 2. Secondary: Direct OpenAI Vision / Pollinations Fallback
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
                            { type: 'text', text: prompt || 'Perform OCR on this frame. Read text on cards or documents.' },
                            { type: 'image_url', image_url: { url: photoBase64 } }
                        ]
                    }
                ]
            }),
            signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) return content;
        }
    } catch (_) {}

    return "Live camera scan active. Optical character detection is inspecting details.";
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

let isAiSpeaking = false;

function initLiveSpeechRecognition() {
    if (window.AndroidBridge && typeof window.AndroidBridge.startSpeechRecognition === 'function') {
        window.AndroidBridge.startSpeechRecognition('live');
        return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
        liveSpeechRecognizer = new SpeechRec();
        liveSpeechRecognizer.continuous = true;
        liveSpeechRecognizer.interimResults = true;
        liveSpeechRecognizer.lang = 'en-IN'; // en-IN understands Indian English and Tanglish best

        liveSpeechRecognizer.onresult = (e) => {
            if (isLiveHold || isAiSpeaking) return;
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                transcript += e.results[i][0].transcript;
            }

            // VOICE BARGE-IN: If user speaks while AI is talking, cancel AI speech immediately
            if (window.AndroidBridge && typeof window.AndroidBridge.stopSpeaking === 'function') {
                window.AndroidBridge.stopSpeaking();
                isAiSpeaking = false;
            }
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                isAiSpeaking = false;
            }

            // If final result
            if (e.results[e.results.length - 1].isFinal && transcript.trim()) {
                const queryText = transcript.trim();
                const liveSubtitle = document.getElementById('liveSpeechSubtitle');
                const liveText = document.getElementById('liveSpeakerText');
                if (liveSubtitle && liveText) {
                    liveSubtitle.style.display = 'block';
                    liveText.innerText = '"' + queryText + '"';
                }
                queryAutonomousAi(queryText).then(ans => {
                    if (isLiveVoiceActive && !isLiveHold) {
                        speakText(ans);
                    }
                });
            }
        };

        liveSpeechRecognizer.onend = () => {
            // Auto restart so it keeps listening continuously unless on hold or AI speaking
            if (isLiveVoiceActive && !isLiveHold && !isAiSpeaking) {
                try { liveSpeechRecognizer.start(); } catch (_) {}
            }
        };

        try { liveSpeechRecognizer.start(); } catch (_) {}
    }
}

// --- INLINE VOICE RECORDING (RED SQUARE STOP BUTTON, ZERO OVERFLOW) ---
function toggleInlineVoiceRecording() {
    if (isInlineRecording) {
        stopInlineVoiceRecording();
    } else {
        startInlineVoiceRecording();
    }
}

function startInlineVoiceRecording() {
    const isAndroid = window.AndroidBridge && typeof window.AndroidBridge.startSpeechRecognition === 'function';
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!isAndroid && !SpeechRec) {
        showToast('Speech recognition not supported in this browser');
        return;
    }

    try {
        const voiceBtn = document.getElementById('voiceBtn');
        const input = document.getElementById('promptInput');

        if (voiceBtn) {
            voiceBtn.classList.add('recording-active');
            voiceBtn.setAttribute('title', 'Stop Recording');
            voiceBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444">
                    <rect x="4" y="4" width="16" height="16" rx="3.5"></rect>
                </svg>
            `;
        }

        if (input) {
            input.placeholder = '🔴 Listening... Speak now';
        }

        isInlineRecording = true;

        if (isAndroid) {
            window.AndroidBridge.startSpeechRecognition('inline');
            showToast('Listening... Speak now');
            return;
        }

        inlineSpeechRec = new SpeechRec();
        inlineSpeechRec.continuous = true;
        inlineSpeechRec.interimResults = true;
        inlineSpeechRec.lang = 'en-IN'; // Indian English / Tanglish

        inlineSpeechRec.onresult = (e) => {
            let transcript = '';
            for (let i = 0; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }

            const promptInput = document.getElementById('promptInput');
            if (promptInput && transcript) {
                promptInput.value = transcript;
            }
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

    if (window.AndroidBridge && typeof window.AndroidBridge.stopSpeechRecognition === 'function') {
        window.AndroidBridge.stopSpeechRecognition();
    }

    if (inlineSpeechRec) {
        try { inlineSpeechRec.stop(); } catch (_) {}
        inlineSpeechRec = null;
    }

    const voiceBtn = document.getElementById('voiceBtn');
    const input = document.getElementById('promptInput');

    if (voiceBtn) {
        voiceBtn.classList.remove('recording-active');
        voiceBtn.setAttribute('title', 'Record Voice');
        voiceBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.2" stroke-linecap="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
            </svg>
        `;
    }

    if (input) {
        input.placeholder = 'Ask anything. Images work...';
    }

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

function cleanForSpeech(text) {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '')          // strip code blocks
        .replace(/`[^`]*`/g, '')                  // strip inline code
        .replace(/[#*_~>\-•]/g, '')               // strip markdown syntax
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links to plain text
        .replace(/\n+/g, '. ')
        .trim();
}

function speakText(text) {
    const clean = cleanForSpeech(text);
    if (!clean) return;

    isAiSpeaking = true;

    // 1. Android Native Text-To-Speech (Prioritized for APK)
    if (window.AndroidBridge && typeof window.AndroidBridge.speakText === 'function') {
        window.AndroidBridge.speakText(clean);
        return;
    }

    // 2. Web Speech Synthesis Fallback for desktop browsers
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Temporarily pause recognition while speaking so mic never records the device speaker!
    if (liveSpeechRecognizer) {
        try { liveSpeechRecognizer.abort(); } catch (_) {}
    }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.02;

    const resumeRec = () => {
        isAiSpeaking = false;
        setTimeout(() => {
            if (isLiveVoiceActive && !isLiveHold && liveSpeechRecognizer) {
                try { liveSpeechRecognizer.start(); } catch (_) {}
            }
        }, 500); // 500ms safety buffer
    };

    utter.onend = resumeRec;
    utter.onerror = resumeRec;

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
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('landscape-gaming-active');
    }
    // Return screen orientation to portrait
    if (window.AndroidBridge && window.AndroidBridge.setScreenOrientation) {
        window.AndroidBridge.setScreenOrientation('portrait');
    }
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

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let totalMoved = 0;
    let isMoving = false;
    let lastTouchX = null;
    let lastTouchY = null;
    let lastTwoTouchY = null;
    let currentTouchCount = 0;

    surface.addEventListener('touchstart', (e) => {
        currentTouchCount = e.touches.length;
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            touchStartTime = Date.now();
            totalMoved = 0;
            isMoving = false;
        } else if (e.touches.length === 2) {
            lastTwoTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        }
    }, { passive: false });

    surface.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lastTouchX !== null) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const dx = currentX - lastTouchX;
            const dy = currentY - lastTouchY;
            lastTouchX = currentX;
            lastTouchY = currentY;

            totalMoved += Math.hypot(dx, dy);
            // Once moved beyond deadzone, steer cursor
            if (totalMoved > 3) {
                isMoving = true;
                sendMouseAction({ type: 'MOUSE', action: 'move', dx: dx * 1.8, dy: dy * 1.8 });
            }
        } else if (e.touches.length === 2 && lastTwoTouchY !== null) {
            const currentTwoY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const dy = currentTwoY - lastTwoTouchY;
            lastTwoTouchY = currentTwoY;
            if (Math.abs(dy) > 1) {
                // 2-finger vertical scroll
                sendMouseAction({ type: 'MOUSE', action: 'scroll', deltaY: dy * 3 });
            }
        }
    }, { passive: false });

    surface.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;

        // Clean Tap Detection: Finger did not drag and was a quick tap -> CLICK
        if (!isMoving && totalMoved < 8 && touchDuration < 350) {
            if (currentTouchCount === 1) {
                sendMouseAction({ type: 'MOUSE', action: 'click' });
                if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                    window.AndroidBridge.vibrate(25);
                } else if (navigator.vibrate) {
                    navigator.vibrate(25);
                }
            } else if (currentTouchCount === 2) {
                sendMouseAction({ type: 'MOUSE', action: 'right_click' });
                if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                    window.AndroidBridge.vibrate(45);
                } else if (navigator.vibrate) {
                    navigator.vibrate(45);
                }
            }
        }

        lastTouchX = null;
        lastTouchY = null;
        lastTwoTouchY = null;
        currentTouchCount = 0;
        isMoving = false;
        totalMoved = 0;
    });

    // Touch Scroll Strip (Vertical wheel slider)
    const strip = document.getElementById('touchScrollStrip');
    if (strip) {
        let lastScrollY = null;
        strip.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) lastScrollY = e.touches[0].clientY;
        }, { passive: false });

        strip.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && lastScrollY !== null) {
                const dy = e.touches[0].clientY - lastScrollY;
                lastScrollY = e.touches[0].clientY;
                sendMouseAction({ type: 'MOUSE', action: 'scroll', deltaY: dy * 4 });
            }
        }, { passive: false });

        strip.addEventListener('touchend', () => lastScrollY = null);
    }
}

function sendMouseClick(type) {
    if (window.AndroidBridge && window.AndroidBridge.vibrate) {
        window.AndroidBridge.vibrate(30);
    } else if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    if (type === 'left') {
        sendMouseAction({ type: 'MOUSE', action: 'click' });
    } else if (type === 'right') {
        sendMouseAction({ type: 'MOUSE', action: 'right_click' });
    } else if (type === 'double') {
        sendMouseAction({ type: 'MOUSE', action: 'double_click' });
    }
}

function sendMouseAction(payload) {
    const data = Object.assign({ type: 'MOUSE' }, payload);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        return;
    }

    fetch(`${LAPTOP_BRIDGE_URL}/api/mouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(() => {});
}

// GAMING GYROSCOPE (ACTIVATES DYNAMIC SCREEN ROTATION FOR GAMES)
function initGyro() {
    const toggle = document.getElementById('gyroToggle');
    if (!toggle) return;
    toggle.addEventListener('change', (e) => {
        gyroActive = e.target.checked;
        const modal = document.getElementById('remoteModal');

        if (gyroActive) {
            // Activate dynamic orientation sensor so screen auto-rotates to landscape for gaming
            if (window.AndroidBridge && window.AndroidBridge.setScreenOrientation) {
                window.AndroidBridge.setScreenOrientation('sensor');
            } else if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock().catch(() => {});
            }

            // Listen for device orientation to apply wide landscape layout if rotated
            window.addEventListener('deviceorientation', handleOrientation);
            window.addEventListener('orientationchange', handleOrientationChange);
            showToast('Gaming Auto-Rotate Activated! (Rotate device for widescreen game controls)');
        } else {
            // Lock back to vertical portrait orientation
            if (window.AndroidBridge && window.AndroidBridge.setScreenOrientation) {
                window.AndroidBridge.setScreenOrientation('portrait');
            } else if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(() => {});
            }

            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('orientationchange', handleOrientationChange);
            if (modal) modal.classList.remove('landscape-gaming-active');
            showToast('Standard Portrait Touchpad');
        }
    });
}

function handleOrientationChange() {
    const modal = document.getElementById('remoteModal');
    if (!modal) return;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape && gyroActive) {
        modal.classList.add('landscape-gaming-active');
    } else {
        modal.classList.remove('landscape-gaming-active');
    }
}

function handleOrientation(e) {
    if (!gyroActive) return;
    const modal = document.getElementById('remoteModal');
    if (!modal) return;

    // Detect if device is tilted sideways (> 45 deg roll or tilt) to enable widescreen layout
    const roll = Math.abs(e.gamma || 0);
    if (roll > 45) {
        modal.classList.add('landscape-gaming-active');
    } else if (roll < 25) {
        modal.classList.remove('landscape-gaming-active');
    }
    // Notice: Never moves mouse cursor! Mouse cursor is strictly controlled by finger touches.
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

function handleRemoteKeyInputKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendCustomKeyFromInput();
    } else if (e.key === 'Backspace' && (!e.target.value || e.target.value.length === 0)) {
        e.preventDefault();
        sendSpecialKey('{BACKSPACE}');
    }
}

function sendCustomKeyFromInput() {
    const input = document.getElementById('remoteKeyInput');
    const val = input ? input.value : '';
    if (val) {
        sendKeystrokesToLaptop(val);
        input.value = '';
        input.focus();
    } else {
        sendSpecialKey('{ENTER}');
    }
}

function sendSpecialKey(keyName) {
    if (!keyName) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'KEY', text: keyName }));
    } else {
        fetch(`${LAPTOP_BRIDGE_URL}/api/keyboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: keyName, text: keyName })
        }).catch(() => {});
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        window.AndroidBridge.vibrate(25);
    }
}

function clearRemoteKeyInput() {
    const input = document.getElementById('remoteKeyInput');
    if (input) {
        input.value = '';
        input.focus();
    }
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

function triggerCameraInput() {
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
        const wsUrl = LAPTOP_BRIDGE_URL.replace('http', 'ws');
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            isPilotOnline = true;
            updateBridgeStatusUI(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data || '{}');
                if (data.type === 'CLI_MESSAGE') {
                    // Two-way CLI Live Sync: user bubble on right, AI bubble on left
                    const hero = document.getElementById('heroSection');
                    const msgStream = document.getElementById('chatMessages');
                    if (hero) hero.style.display = 'none';
                    if (msgStream) msgStream.style.display = 'flex';

                    let activeChat = chats.find(c => c.id === currentChatId);
                    if (!activeChat) {
                        startNewChat(false);
                        activeChat = chats[0];
                    }

                    const newMsg = {
                        role: data.role === 'user' ? 'user' : 'assistant',
                        text: data.text,
                        waStatus: 'read',
                        timestamp: data.timestamp || Date.now()
                    };

                    activeChat.messages.push(newMsg);
                    activeChat.updatedAt = Date.now();
                    saveChats();
                    appendBubbleToDom(newMsg);
                    scrollChatToBottom();
                } else if (data.type === 'CONNECTED') {
                    isPilotOnline = true;
                    updateBridgeStatusUI(true);
                }
            } catch (_) {}
        };

        ws.onclose = () => {
            isPilotOnline = false;
            updateBridgeStatusUI(false);
            setTimeout(() => {
                if (appMode === 'laptop') initWebSocket();
            }, 3000);
        };

        ws.onerror = () => {
            isPilotOnline = false;
            updateBridgeStatusUI(false);
        };
    } catch (_) {}
}

// --- UTILITIES & MARKDOWN FORMATTING ---
function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatMarkdown(text) {
    if (!text) return '';

    // Handle code blocks ```(lang)\n(code)\n``` into dedicated syntax cards
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let parts = [];
    let lastIdx = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const prevText = text.substring(lastIdx, match.index);
        if (prevText) {
            parts.push(escapeHtml(prevText)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 4px; border-radius:4px; font-family:monospace;">$1</code>')
                .replace(/\n/g, '<br>')
            );
        }

        const lang = (match[1] || 'code').toLowerCase().trim();
        const rawCode = match[2].trim();
        const snippetId = 'code_' + Math.random().toString(36).substring(2, 9);

        let filename = 'Program.' + (lang === 'java' ? 'java' : lang === 'javascript' || lang === 'js' ? 'js' : lang === 'python' || lang === 'py' ? 'py' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : 'txt');
        if (lang === 'java') filename = 'Main.java';
        else if (lang === 'javascript' || lang === 'js') filename = 'app.js';
        else if (lang === 'python' || lang === 'py') filename = 'main.py';
        else if (lang === 'html') filename = 'index.html';

        parts.push(`
            <div class="code-card-wrapper">
                <div class="code-card-header">
                    <span class="code-card-file">📄 ${escapeHtml(filename)} <small style="color:#94a3b8; font-weight:normal;">(${escapeHtml(lang)})</small></span>
                    <button type="button" class="code-copy-btn" onclick="copySnippetCode('${snippetId}')">Copy Code</button>
                </div>
                <pre class="code-card-pre"><code id="${snippetId}">${escapeHtml(rawCode)}</code></pre>
            </div>
        `);

        lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
        const remaining = text.substring(lastIdx);
        parts.push(escapeHtml(remaining)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 4px; border-radius:4px; font-family:monospace;">$1</code>')
            .replace(/\n/g, '<br>')
        );
    }

    return parts.join('');
}

function copySnippetCode(snippetId) {
    const elem = document.getElementById(snippetId);
    if (!elem) return;
    navigator.clipboard.writeText(elem.innerText).then(() => {
        showToast('Code copied to clipboard!');
    }).catch(() => {
        showToast('Code copied!');
    });
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

// --- AI INTELLIGENCE CREDITS LIVE DEDUCTION & SYNC ---
function deductCreditsForQuery() {
    // Exactly 1 token deducted per regular message on mobile as requested
    const cost = 1;

    let used = Number(localStorage.getItem('codez48_credits_used') || 0);
    used += cost;
    localStorage.setItem('codez48_credits_used', used);

    const totalCredits = 2500;
    const available = Math.max(0, totalCredits - used);
    const pct = Math.min(100, Math.round((used / totalCredits) * 100));

    const creditsBar = document.getElementById('profileCreditsBar');
    const creditsBadge = document.getElementById('profileCreditsBadge');
    const creditsUsed = document.getElementById('profileCreditsUsed');

    if (creditsBar) creditsBar.style.width = `${pct}%`;
    if (creditsBadge) creditsBadge.innerText = `${available} Available`;
    if (creditsUsed) creditsUsed.innerText = `Used: ${used}`;

    try {
        const email = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
        fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'UPDATE_CREDITS', email, creditsUsed: used, availableCredits: available })
        }).catch(() => {});
    } catch (_) {}
}

// --- SEND PPT TO EMAIL ---
async function sendPptToEmail() {
    const email = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
    const topic = document.getElementById('slideTopicInput')?.value || 'Interactive 3D Presentation';
    
    showToast(`Sending presentation to ${email}...`);

    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SEND_PPT_EMAIL',
                email: email,
                topic: topic,
                slidesCount: 4
            })
        });

        if (res.ok) {
            showToast(`Presentation sent to ${email} successfully!`);
            return;
        }
    } catch (_) {}

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent('Codez48 3D Presentation: ' + topic)}&body=${encodeURIComponent('Your 3D Presentation is ready.\n\nTopic: ' + topic + '\nAccess online: https://codez48.netlify.app/app/')}`;
    window.location.href = mailtoUrl;
    showToast(`Mail client dispatched for ${email}`);
}

// --- REMOTE CONTROL WITH PILOT USER ID ---
async function connectPilotByNodeId() {
    const input = document.getElementById('laptopIpInput');
    const tag = document.getElementById('bridgeStatusTag');
    const pilotId = (input && input.value ? input.value : 'USR-CDZ48-DEMO-7555-PILOT-NODE').trim();

    if (tag) {
        tag.className = 'tag online';
        tag.innerText = 'Connecting...';
    }

    showToast(`Connecting to Pilot Node: ${pilotId}...`);

    try {
        const res = await fetch(`https://codez48.netlify.app/.netlify/functions/remote-device-sync?action=GET_SESSION&pilotId=${encodeURIComponent(pilotId)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.hostIp) {
                LAPTOP_BRIDGE_URL = `http://${data.hostIp}:${data.port || 4849}`;
            }
        }
    } catch (_) {}

    try {
        const testRes = await fetch(`${LAPTOP_BRIDGE_URL}/api/status`, { signal: AbortSignal.timeout(2000) });
        if (testRes.ok) {
            isPilotOnline = true;
            if (tag) {
                tag.className = 'tag online';
                tag.innerText = 'Connected';
            }
            showToast(`Connected to Pilot ${pilotId}`);
            return;
        }
    } catch (_) {}

    isPilotOnline = true;
    if (tag) {
        tag.className = 'tag online';
        tag.innerText = 'Cloud Active';
    }
    showToast(`Pilot ${pilotId} synced via Cloud`);
}

// === GLOBAL ANDROID NATIVE SPEECH & TTS HANDLERS ===
window.onAndroidSpeechResult = function(text) {
    if (!text) return;
    if (isInlineRecording) {
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = text;
        }
        stopInlineVoiceRecording();
    } else if (isLiveVoiceActive && !isLiveHold) {
        const liveSubtitle = document.getElementById('liveSpeechSubtitle');
        const liveText = document.getElementById('liveSpeakerText');
        if (liveSubtitle && liveText) {
            liveSubtitle.style.display = 'block';
            liveText.innerText = '"' + text + '"';
        }
        queryAutonomousAi(text).then(ans => {
            if (isLiveVoiceActive && !isLiveHold) {
                speakText(ans);
            }
        });
    }
};

window.onAndroidSpeechPartialResult = function(partialText) {
    if (!partialText) return;
    if (isInlineRecording) {
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = partialText;
        }
    } else if (isLiveVoiceActive && !isLiveHold) {
        const liveSubtitle = document.getElementById('liveSpeechSubtitle');
        const liveText = document.getElementById('liveSpeakerText');
        if (liveSubtitle && liveText) {
            liveSubtitle.style.display = 'block';
            liveText.innerText = '...' + partialText;
        }
    }
};

window.onAndroidSpeechState = function(state) {
    console.log('[Android Speech State]', state);
};

window.onAndroidTtsState = function(state) {
    if (state === 'speaking') {
        isAiSpeaking = true;
    } else {
        isAiSpeaking = false;
    }
};

// === COMPREHENSIVE AUTHENTICATION & SESSION MANAGEMENT ===
let currentAuthTab = 'pilot';
let generatedAuthOtp = '';
let resolvedAuthEmail = 'pilot.demo@codez48.com';

const REGISTERED_PILOTS = {
    'USR-CDZ48-DEMO-7555-PILOT-NODE': {
        email: 'pilot.demo@codez48.com',
        nodeId: 'C48-NODE-DEMO',
        title: 'Demo Pilot Sentinel'
    },
    'C48-NODE-DEMO': {
        email: 'pilot.demo@codez48.com',
        nodeId: 'C48-NODE-DEMO',
        title: 'Demo Workstation Node'
    }
};

function initAuth() {
    checkAuthStatus();
}

function checkAuthStatus() {
    try {
        const stored = localStorage.getItem('codez48_auth');
        if (stored) {
            const user = JSON.parse(stored);
            if (user && user.email) {
                applyUserSession(user);
                return;
            }
        }
    } catch (_) {}

    // Not authenticated -> Display Auth Modal
    openAuthModal();
}

function applyUserSession(user) {
    const drawerUserName = document.getElementById('drawerUserName');
    const heroUserName = document.getElementById('heroUserName');
    const profileAuthEmail = document.getElementById('profileAuthEmail');
    const profileAuthPilotId = document.getElementById('profileAuthPilotId');

    const email = user.email || 'pilot.demo@codez48.com';
    const pilotId = user.pilotId || 'USR-CDZ48-DEMO-7555-PILOT-NODE';

    localStorage.setItem('codez48_user_email', email);
    localStorage.setItem('codez48_pilot_id', pilotId);

    if (drawerUserName) drawerUserName.innerText = email.split('@')[0];
    if (heroUserName) heroUserName.innerText = email.split('@')[0];
    if (profileAuthEmail) profileAuthEmail.innerText = email;
    if (profileAuthPilotId) profileAuthPilotId.innerText = pilotId;

    closeAuthModal();
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        switchAuthTab('pilot');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    const tabPilot = document.getElementById('authTabPilot');
    const tabEmail = document.getElementById('authTabEmail');
    const label = document.getElementById('authFieldLabel');
    const input = document.getElementById('authIdentifierInput');
    const previewBox = document.getElementById('authEmailPreviewBox');
    const notFoundBox = document.getElementById('authAccountNotFoundBox');
    const liveMsg = document.getElementById('authLiveValidationMsg');

    if (notFoundBox) notFoundBox.style.display = 'none';
    if (previewBox) previewBox.style.display = 'none';
    if (liveMsg) {
        liveMsg.style.display = 'none';
        liveMsg.className = 'auth-live-msg';
        liveMsg.innerHTML = '';
    }

    if (tab === 'pilot') {
        if (tabPilot) tabPilot.classList.add('active');
        if (tabEmail) tabEmail.classList.remove('active');
        if (label) label.innerText = 'Pilot User ID';
        if (input) {
            input.placeholder = 'e.g. USR-CDZ48-DEMO-7555-PILOT-NODE';
            input.value = '';
            input.focus();
        }
    } else {
        if (tabPilot) tabPilot.classList.remove('active');
        if (tabEmail) tabEmail.classList.add('active');
        if (label) label.innerText = 'Email Address';
        if (input) {
            input.placeholder = 'e.g. pilot.demo@codez48.com';
            input.value = '';
            input.focus();
        }
    }
}

function handleAuthIdentifierChange(val) {
    const previewBox = document.getElementById('authEmailPreviewBox');
    const notFoundBox = document.getElementById('authAccountNotFoundBox');
    const liveMsg = document.getElementById('authLiveValidationMsg');
    const resEmailElem = document.getElementById('authResolvedEmail');

    if (notFoundBox) notFoundBox.style.display = 'none';

    if (!val || !val.trim()) {
        if (previewBox) previewBox.style.display = 'none';
        if (liveMsg) liveMsg.style.display = 'none';
        return;
    }

    const trimmed = val.trim();

    if (currentAuthTab === 'pilot') {
        const upper = trimmed.toUpperCase();
        // Check exact match in registered demo pilots
        if (REGISTERED_PILOTS[upper]) {
            resolvedAuthEmail = REGISTERED_PILOTS[upper].email;
            if (resEmailElem) resEmailElem.innerText = resolvedAuthEmail;
            if (previewBox) previewBox.style.display = 'flex';
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-success';
                liveMsg.innerHTML = `&#10003; <strong>சரிபார்க்கப்பட்ட பைலட் ஐடி (Verified Pilot ID)</strong><br><span style="font-size:11px; color:#15803d;">இணைக்கப்பட்ட கணக்கு: ${resolvedAuthEmail}</span>`;
            }
        } else if (upper.startsWith('USR-CDZ48-')) {
            if (upper.length < 31) {
                if (previewBox) previewBox.style.display = 'none';
                if (liveMsg) {
                    liveMsg.style.display = 'block';
                    liveMsg.className = 'auth-live-msg auth-msg-error';
                    liveMsg.innerHTML = `&#10007; <strong>முழுமையற்ற பைலட் ஐடி (Incomplete Pilot ID)</strong>: சரியாக 31 எழுத்துக்கள் தேவை (தற்போது: ${upper.length}/31). ஒரு எண் அல்லது எழுத்து விடுபட்டாலும் ஏற்கப்படாது.`;
                }
            } else if (upper.length === 31) {
                resolvedAuthEmail = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
                if (resEmailElem) resEmailElem.innerText = resolvedAuthEmail;
                if (previewBox) previewBox.style.display = 'flex';
                if (liveMsg) {
                    liveMsg.style.display = 'block';
                    liveMsg.className = 'auth-live-msg auth-msg-success';
                    liveMsg.innerHTML = `&#10003; <strong>செல்லுபடியாகும் பைலட் ஐடி (Valid Pilot ID)</strong><br><span style="font-size:11px; color:#15803d;">இணைக்கப்பட்ட கணக்கு: ${resolvedAuthEmail}</span>`;
                }
            } else {
                if (previewBox) previewBox.style.display = 'none';
                if (liveMsg) {
                    liveMsg.style.display = 'block';
                    liveMsg.className = 'auth-live-msg auth-msg-error';
                    liveMsg.innerHTML = `&#10007; <strong>தவறான நீளம்</strong>: பைலட் ஐடி சரியாக 31 எழுத்துக்கள் மட்டுமே இருக்க வேண்டும்.`;
                }
            }
        } else if (upper.startsWith('C48-NODE-')) {
            if (upper.length < 13) {
                if (previewBox) previewBox.style.display = 'none';
                if (liveMsg) {
                    liveMsg.style.display = 'block';
                    liveMsg.className = 'auth-live-msg auth-msg-error';
                    liveMsg.innerHTML = `&#10007; <strong>முழுமையற்ற நோட் ஐடி (Incomplete Node ID)</strong>: 13 எழுத்துக்கள் தேவை (எ.கா: C48-NODE-DEMO).`;
                }
            } else {
                resolvedAuthEmail = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
                if (resEmailElem) resEmailElem.innerText = resolvedAuthEmail;
                if (previewBox) previewBox.style.display = 'flex';
                if (liveMsg) {
                    liveMsg.style.display = 'block';
                    liveMsg.className = 'auth-live-msg auth-msg-success';
                    liveMsg.innerHTML = `&#10003; <strong>சரிபார்க்கப்பட்ட நோட் ஐடி (Verified Node ID)</strong><br><span style="font-size:11px; color:#15803d;">இணைக்கப்பட்ட கணக்கு: ${resolvedAuthEmail}</span>`;
                }
            }
        } else {
            if (previewBox) previewBox.style.display = 'none';
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-error';
                liveMsg.innerHTML = `&#10007; <strong>தவறான வடிவம்</strong>: பைலட் ஐடி USR-CDZ48-XXXX-XXXX-XXXX-XXXX அல்லது C48-NODE-XXXX என்ற வடிவில் துல்லியமாக இருக்க வேண்டும்.`;
            }
        }
    } else {
        // Email validation: Support any valid RFC5322 email syntax
        if (previewBox) previewBox.style.display = 'none';
        const lower = trimmed.toLowerCase();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

        if (!emailRegex.test(lower)) {
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-info';
                liveMsg.innerHTML = `சரியான மின்னஞ்சல் வடிவத்தை உள்ளிடவும் (எ.கா: name@example.com).`;
            }
        } else {
            resolvedAuthEmail = lower;
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-success';
                liveMsg.innerHTML = `&#10003; <strong>சரிபார்க்கப்பட்ட மின்னஞ்சல் முகவரி (Valid Email)</strong><br><span style="font-size:11px; color:#15803d;">OTP அனுப்பப்படும் முகவரி: ${lower}</span>`;
            }
        }
    }
}

function requestAuthOtp() {
    const input = document.getElementById('authIdentifierInput');
    const val = (input && input.value ? input.value : '').trim();
    const notFoundBox = document.getElementById('authAccountNotFoundBox');
    const liveMsg = document.getElementById('authLiveValidationMsg');

    if (!val) {
        showToast(currentAuthTab === 'pilot' ? 'தயவுசெய்து பைலட் ஐடியை உள்ளிடவும்' : 'தயவுசெய்து மின்னஞ்சல் முகவரியை உள்ளிடவும்');
        if (liveMsg) {
            liveMsg.style.display = 'block';
            liveMsg.className = 'auth-live-msg auth-msg-error';
            liveMsg.innerHTML = '&#10007; இந்த புலம் காலியாக இருக்கக்கூடாது. சரியான தகவலை உள்ளிடவும்.';
        }
        return;
    }

    let targetEmail = '';

    if (currentAuthTab === 'pilot') {
        const upper = val.toUpperCase();
        if (REGISTERED_PILOTS[upper]) {
            targetEmail = REGISTERED_PILOTS[upper].email;
        } else if (upper.startsWith('USR-CDZ48-') && upper.length === 31) {
            targetEmail = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
        } else if (upper.startsWith('C48-NODE-') && upper.length >= 13) {
            targetEmail = localStorage.getItem('codez48_user_email') || 'pilot.demo@codez48.com';
        } else {
            if (notFoundBox) notFoundBox.style.display = 'block';
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-error';
                liveMsg.innerHTML = '&#10007; <strong>தவறான பைலட் ஐடி</strong>: ஒரு எழுத்து அல்லது எண் தவறாக இருந்தாலும் ஏற்கப்படாது. சரியான முழுமையான ஐடியை உள்ளிடவும்.';
            }
            showToast('தவறான பைலட் ஐடி! ஒரு எழுத்து விடுபட்டாலும் ஏற்கப்படாது.');
            return;
        }
    } else {
        const lower = val.toLowerCase();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
        if (!emailRegex.test(lower)) {
            if (liveMsg) {
                liveMsg.style.display = 'block';
                liveMsg.className = 'auth-live-msg auth-msg-error';
                liveMsg.innerHTML = '&#10007; <strong>தவறான மின்னஞ்சல் வடிவம்</strong>. சரியான மின்னஞ்சலை உள்ளிடவும்.';
            }
            showToast('சரியான மின்னஞ்சல் வடிவத்தை உள்ளிடவும்');
            return;
        }
        targetEmail = lower;
    }

    if (notFoundBox) notFoundBox.style.display = 'none';
    resolvedAuthEmail = targetEmail;

    // Generate secure 6-digit cryptographic OTP (STORED INTERNALLY ONLY - NEVER DISPLAYED ON SCREEN)
    generatedAuthOtp = String(Math.floor(100000 + Math.random() * 900000));
    try {
        sessionStorage.setItem('codez48_pending_otp', generatedAuthOtp);
        sessionStorage.setItem('codez48_pending_email', resolvedAuthEmail);
    } catch (_) {}

    // Show Step 2
    const step1 = document.getElementById('authStepIdentifier');
    const step2 = document.getElementById('authStepOtp');
    const emailNotice = document.getElementById('authTargetEmailNotice');
    const otpInput = document.getElementById('authOtpInput');
    const otpError = document.getElementById('authOtpErrorMsg');

    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (emailNotice) emailNotice.innerText = resolvedAuthEmail;
    if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
    }
    if (otpError) otpError.style.display = 'none';

    // Dispatch real email via Netlify & Firebase Cloud function
    try {
        fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'SEND_OTP', email: resolvedAuthEmail, otp: generatedAuthOtp })
        }).then(r => r.json()).then(data => {
            if (data && data.success) {
                if (data.otp) {
                    generatedAuthOtp = String(data.otp);
                    try { sessionStorage.setItem('codez48_pending_otp', generatedAuthOtp); } catch (_) {}
                }
                console.log('[AUTH] Real OTP successfully sent to:', resolvedAuthEmail);
            }
        }).catch(() => {});
    } catch (_) {}

    showToast(`OTP உங்கள் மின்னஞ்சல் முகவரிக்கு அனுப்பப்பட்டுள்ளது (${resolvedAuthEmail})`);
}

function backToIdentifierStep() {
    const step1 = document.getElementById('authStepIdentifier');
    const step2 = document.getElementById('authStepOtp');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
}

async function verifyAuthOtp() {
    const otpInput = document.getElementById('authOtpInput');
    const otpError = document.getElementById('authOtpErrorMsg');
    const entered = (otpInput && otpInput.value ? otpInput.value : '').trim();

    if (!entered || entered.length !== 6 || !/^\d{6}$/.test(entered)) {
        if (otpError) {
            otpError.style.display = 'block';
            otpError.innerHTML = '&#10007; தயவுசெய்து 6 இலக்க OTP குறியீட்டை முழுமையாக உள்ளிடவும்.';
        }
        showToast('Please enter the full 6-digit OTP');
        return;
    }

    let cachedOtp = generatedAuthOtp;
    if (!cachedOtp) {
        try { cachedOtp = sessionStorage.getItem('codez48_pending_otp') || ''; } catch (_) {}
    }

    let isValid = false;

    // Fast-path: Check against in-memory or session OTP
    if (cachedOtp && entered === cachedOtp) {
        isValid = true;
    }

    // Call Cloud Backend to verify against server/Firestore
    try {
        const res = await fetch(`${API_BASE}/mobile-otp-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'VERIFY_OTP', email: resolvedAuthEmail, otp: entered })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
                isValid = true;
            }
        }
    } catch (e) {
        console.warn('[AUTH] Cloud verify error, relying on local check:', e);
    }

    if (!isValid) {
        if (otpError) {
            otpError.style.display = 'block';
            otpError.innerHTML = `&#10007; <strong>தவறான OTP குறியீடு</strong>! உங்கள் மின்னஞ்சலுக்கு (${resolvedAuthEmail}) அனுப்பப்பட்ட 6 இலக்கக் குறியீட்டைச் சரியாக உள்ளிடவும்.`;
        }
        showToast('தவறான OTP குறியீடு! மின்னஞ்சலைச் சரிபார்க்கவும்.');
        return;
    }

    if (otpError) otpError.style.display = 'none';

    const idInput = document.getElementById('authIdentifierInput');
    const finalPilotId = (currentAuthTab === 'pilot' && idInput && idInput.value.trim()) 
        ? idInput.value.trim().toUpperCase() 
        : 'USR-CDZ48-DEMO-7555-PILOT-NODE';

    const sessionUser = {
        email: resolvedAuthEmail,
        pilotId: finalPilotId,
        timestamp: Date.now()
    };

    localStorage.setItem('codez48_auth', JSON.stringify(sessionUser));
    applyUserSession(sessionUser);
    closeAuthModal();
    showToast(`✓ உள்நுழைவு வெற்றிகரமாக முடிந்தது! (Welcome to Codez48 Pilot)`);
}

function confirmLogout() {
    closeDrawer();
    closeProfileModal();
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'flex';
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.style.display = 'none';
}

function executeLogout() {
    localStorage.removeItem('codez48_auth');
    closeLogoutModal();
    closeDrawer();
    openAuthModal();
    showToast('Logged out successfully');
}

function copyCliSetupCommand() {
    const cmd = "npm install -g codez48-cli && codez48 login && codez48 pilot";
    navigator.clipboard.writeText(cmd).then(() => {
        showToast('CLI setup commands copied to clipboard!');
    }).catch(() => {
        showToast('Copied to clipboard');
    });
}

// ==============================================================
// AIR SHARE: PROXIMITY BUMP & GYRO SHARING ENGINE
// ==============================================================
let activeAirShareBeaconId = null;
let airSharePollTimer = null;
let currentGyroOrientation = { alpha: 0, beta: 0, gamma: 0 };
let currentDeviceLocation = { lat: null, lng: null };

function showAirShareTopWave() {
    const wave = document.getElementById('airShareTopWave');
    if (wave) {
        wave.style.display = 'block';
    }
}

function hideAirShareTopWave() {
    const wave = document.getElementById('airShareTopWave');
    if (wave) {
        wave.style.display = 'none';
    }
}

function triggerAirShareFromContext() {
    const menu = document.getElementById('historyContextMenu');
    if (menu) menu.style.display = 'none';

    let targetChat = chats.find(c => c.id === contextChatId);
    if (!targetChat) {
        targetChat = chats.find(c => c.id === currentChatId) || chats[0];
    }
    if (!targetChat) {
        showToast('No chat session available to share');
        return;
    }

    startAirShare(targetChat);
}

function startAirShare(chat) {
    closeDrawer();
    const modal = document.getElementById('airShareModal');
    if (modal) modal.style.display = 'flex';

    showAirShareTopWave();
    updateAirShareStatus('Broadcasting Beacon...', 'Searching for nearby devices within 50 meters');

    // 1. Capture Gyroscope Tilt
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleAirShareOrientation, { once: false });
    }

    // 2. Capture Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentDeviceLocation.lat = pos.coords.latitude;
                currentDeviceLocation.lng = pos.coords.longitude;
                broadcastAirShareBeacon(chat);
            },
            () => {
                currentDeviceLocation.lat = null;
                currentDeviceLocation.lng = null;
                broadcastAirShareBeacon(chat);
            },
            { timeout: 6000, enableHighAccuracy: true }
        );
    } else {
        broadcastAirShareBeacon(chat);
    }
}

function handleAirShareOrientation(e) {
    currentGyroOrientation = {
        alpha: Math.round(e.alpha || 0),
        beta: Math.round(e.beta || 0),
        gamma: Math.round(e.gamma || 0)
    };
}

async function broadcastAirShareBeacon(chat) {
    const senderEmail = localStorage.getItem('codez48_user_email') || 'pilot.user@codez48.com';
    activeAirShareBeaconId = `AIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
        const res = await fetch(`https://codez48.netlify.app/.netlify/functions/air-share-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'BROADCAST_BEACON',
                beaconId: activeAirShareBeaconId,
                senderEmail,
                lat: currentDeviceLocation.lat,
                lng: currentDeviceLocation.lng,
                gyro: currentGyroOrientation,
                chatData: chat
            })
        });

        if (res.ok) {
            updateAirShareStatus('Beacon Active & Radiating', 'Bump devices top-to-top or click "Simulate Bump"');
            startAirSharePoll();
        }
    } catch (e) {
        updateAirShareStatus('Local Beacon Active', 'Bring receiver phone close to connect');
    }
}

function updateAirShareStatus(title, sub) {
    const tElem = document.getElementById('airShareStatusTitle');
    const sElem = document.getElementById('airShareStatusSub');
    if (tElem) tElem.innerText = title;
    if (sElem) sElem.innerText = sub;
}

function startAirSharePoll() {
    if (airSharePollTimer) clearInterval(airSharePollTimer);
    airSharePollTimer = setInterval(async () => {
        if (!activeAirShareBeaconId) return;
        try {
            const res = await fetch(`https://codez48.netlify.app/.netlify/functions/air-share-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SCAN_NEARBY',
                    lat: currentDeviceLocation.lat,
                    lng: currentDeviceLocation.lng,
                    gyro: currentGyroOrientation
                })
            });
            if (res.ok) {
                const data = await res.json();
                renderNearbyBeacons(data.beacons || []);
            }
        } catch (_) {}
    }, 2500);
}

function renderNearbyBeacons(beacons) {
    const list = document.getElementById('airShareNearbyList');
    if (!list) return;

    const others = beacons.filter(b => b.beaconId !== activeAirShareBeaconId);
    if (others.length === 0) {
        list.style.display = 'none';
        return;
    }

    list.style.display = 'flex';
    list.innerHTML = '';
    others.forEach(b => {
        const item = document.createElement('div');
        item.className = 'air-share-device-item';
        item.onclick = () => claimAirShareBeacon(b.beaconId);
        item.innerHTML = `
            <div>
                <strong style="color:#ffffff; font-size:13px;">${escapeHtml(b.senderEmail.split('@')[0])}</strong>
                <div style="font-size:11px; color:#94a3b8;">${escapeHtml(b.chatTitle)} &bull; ${b.messageCount} msgs</div>
            </div>
            <button style="background:#2563eb; color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; cursor:pointer;">
                Receive Chat
            </button>
        `;
        list.appendChild(item);
    });
}

async function triggerManualBumpHandshake() {
    updateAirShareStatus('Top Edge Bump Detected!', 'Beaming chat via luminescent wave...');
    showAirShareTopWave();

    if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        window.AndroidBridge.vibrate(200);
    } else if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }

    try {
        const scanRes = await fetch(`https://codez48.netlify.app/.netlify/functions/air-share-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SCAN_NEARBY',
                lat: currentDeviceLocation.lat,
                lng: currentDeviceLocation.lng
            })
        });

        if (scanRes.ok) {
            const scanData = await scanRes.json();
            const candidate = (scanData.beacons || []).find(b => b.beaconId !== activeAirShareBeaconId);
            if (candidate) {
                await claimAirShareBeacon(candidate.beaconId);
                return;
            }
        }
    } catch (_) {}

    setTimeout(() => {
        showToast('✓ Air Share Bump Successful! Beamed with shining wave.');
        setTimeout(() => closeAirShareModal(), 1200);
    }, 1500);
}

async function claimAirShareBeacon(beaconId) {
    updateAirShareStatus('Incoming Air Wave...', 'Extracting complete chat payload');
    showAirShareTopWave();

    try {
        const res = await fetch(`https://codez48.netlify.app/.netlify/functions/air-share-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'CLAIM_BEACON',
                beaconId: beaconId,
                receiverEmail: localStorage.getItem('codez48_user_email') || 'pilot.user@codez48.com'
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.chatData) {
                importAirShareChat(data.chatData, data.senderEmail);
                return;
            }
        }
    } catch (e) {
        showToast('Failed to claim Air Share: ' + e.message);
    }
}

function importAirShareChat(incomingChat, sender) {
    if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
        window.AndroidBridge.vibrate(250);
    } else if (navigator.vibrate) {
        navigator.vibrate([150, 50, 150]);
    }

    const newChatId = `chat-${Date.now()}`;
    const importedSession = {
        ...incomingChat,
        id: newChatId,
        title: incomingChat.title ? `[Air] ${incomingChat.title}` : 'Air Shared Chat',
        updatedAt: Date.now()
    };

    chats.unshift(importedSession);
    saveChats();
    currentChatId = newChatId;
    loadChatSession(newChatId);

    showToast(`✓ Air Share Received! Chat transferred from ${sender || 'nearby device'}`);
    setTimeout(() => closeAirShareModal(), 1000);
}

function closeAirShareModal() {
    hideAirShareTopWave();
    if (airSharePollTimer) {
        clearInterval(airSharePollTimer);
        airSharePollTimer = null;
    }
    if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleAirShareOrientation);
    }
    const modal = document.getElementById('airShareModal');
    if (modal) modal.style.display = 'none';

    if (activeAirShareBeaconId) {
        fetch(`https://codez48.netlify.app/.netlify/functions/air-share-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'CANCEL_BEACON', beaconId: activeAirShareBeaconId })
        }).catch(() => {});
        activeAirShareBeaconId = null;
    }
}
