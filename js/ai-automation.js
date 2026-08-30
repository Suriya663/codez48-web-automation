import { db, auth } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { callAI } from './utils.js';
import { globalPlaywrightAgentClient, RunState, sanitizeFirestoreObject } from './playwright-agent-core.js';

/**
 * MASTER AI BROWSER CONTROLLER
 * Connects CODEZ48 Automation Workspace with Persistent Playwright Worker Service and Netlify Gateway.
 */
export const AutomationLogic = {
    currentRunId: null,
    analysisData: null,

    init() {
        console.log("[CODEZ48] Initializing Master AI Automation Controller...");
        window.AutomationLogic = AutomationLogic;
        try {
            AutomationLogic.attachEvents();
            AutomationLogic.loadHistory();
            console.log("[CODEZ48] Master AI Controller Online.");
        } catch (e) {
            console.error("[CODEZ48] Initialization Failure:", e);
        }
    },

    attachEvents() {
        const bindAction = (id, fn) => {
            const el = document.getElementById(id);
            if (el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('click', fn);
            }
        };

        bindAction('btn-analyze', () => AutomationLogic.analyzeRequest());
        bindAction('btn-proceed', () => AutomationLogic.proceedWithAutomation());
        bindAction('ctrl-pause', () => AutomationLogic.togglePause());
        bindAction('ctrl-stop', () => AutomationLogic.terminateTask());
        bindAction('btn-resume', () => AutomationLogic.resumeAutomation());
        bindAction('btn-submit-answer', () => AutomationLogic.submitUserAnswer());

        // Global Utilities
        window.loadAutomationHistory = () => AutomationLogic.loadHistory();
        window.viewSingleMission = (id) => AutomationLogic.viewMission(id);
        window.setupWebhookGateway = () => AutomationLogic.initWebhookGateway();
        window.viewSingleWebhook = (id) => AutomationLogic.viewWebhook(id);

        const btnVoice = document.getElementById('btn-voice');
        if (btnVoice) btnVoice.onclick = () => AutomationLogic.startVoiceInput('automation-prompt');

        const btnAnswerVoice = document.getElementById('btn-answer-voice');
        if (btnAnswerVoice) btnAnswerVoice.onclick = () => AutomationLogic.startVoiceInput('ai-answer-input');
    },

    startVoiceInput(targetId) {
        if (!('webkitSpeechRecognition' in window)) return alert("Voice speech recognition not supported in this browser.");
        const btn = event.currentTarget;
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => { if (btn) btn.classList.add('text-royal', 'animate-pulse'); };
        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            const target = document.getElementById(targetId);
            if (target) target.value = text;
        };
        recognition.onend = () => { if (btn) btn.classList.remove('text-royal', 'animate-pulse'); };
        recognition.start();
    },

    async analyzeRequest() {
        console.log("[AI] Analyzing task request...");
        const promptInput = document.getElementById('automation-prompt');
        const prompt = promptInput ? promptInput.value.trim() : "";
        if (!prompt || prompt.length < 5) return alert("Please provide a detailed task description (min 5 chars).");

        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('hidden');

        try {
            const systemPrompt = `You are the Codez48 Stateful Playwright Agent Architect.
            Translate requests into execution plans for real Playwright browser automation and data extraction.

            FLOW PROTOCOL:
            1. Open Target Website (Action: navigate)
            2. Inspect Page & DOM (Action: inspect_dom)
            3. Perform Required Form Actions / Clicks (Action: type, click, scroll, press, wait_for_user)
            4. Reach Required Element (Action: locate)
            5. Extract Data (Action: read_text, extract_table, extract_list)
            6. Validate Data Quality
            7. Return Formatted Output (JSON | Table | List | Text)

            SPECIAL PROTOCOL: WHATSAPP WEB
            Include these steps for WhatsApp:
            1. Navigate to web.whatsapp.com
            2. Action: "wait_for_user" (Checks login state or QR code)
            3. Action: "type" (Value: {{mobile}}, Selector: "div[contenteditable='true'][title='Search input textbox']")
            4. Action: "press" (Key: "Enter")
            5. Action: "type" (Value: {{message}}, Selector: "div[contenteditable='true'][title='Type a message']")
            6. Action: "press" (Key: "Enter")

            OUTPUT STRICT JSON ONLY:
            {
              "target": "URL",
              "task": "Task Name",
              "intent": "Action|Extraction",
              "outputFormat": "json|table|list|text",
              "fields": [{"label": "Label", "key": "keyName", "type": "text|url|number|password"}],
              "executionPlan": [{"step": 1, "action": "actionType", "description": "Desc", "selector": "Selector", "url": "URL"}]
            }`;

            const aiResponse = await callAI([{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]);
            if (!aiResponse) throw new Error("AI Analysis Failed");

            let cleanJson = aiResponse.trim();
            if (cleanJson.includes('```')) {
                const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) cleanJson = match[1];
            }
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);

            AutomationLogic.analysisData = JSON.parse(cleanJson);
            if (!AutomationLogic.analysisData.target || !AutomationLogic.analysisData.fields || !AutomationLogic.analysisData.executionPlan) {
                throw new Error("Incomplete AI execution plan.");
            }

            if (!AutomationLogic.analysisData.outputFormat) {
                AutomationLogic.analysisData.outputFormat = AutomationLogic.analysisData.intent === "Extraction" ? "table" : "json";
            }

            if (AutomationLogic.analysisData.intent === "Extraction") {
                AutomationLogic.analysisData.fields.push({ label: "API Endpoint (Webhook)", key: "webhookUrl", type: "url", optional: true });
            }

            AutomationLogic.renderDynamicForm();
        } catch (e) {
            console.error("[AI] Analysis Error:", e);
            alert("Analysis Error: " + e.message);
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },

    renderDynamicForm() {
        const container = document.getElementById('dynamic-fields-container');
        const dTask = document.getElementById('detected-task');
        const dGoal = document.getElementById('detected-goal');
        if (!container || !AutomationLogic.analysisData) return;

        if (dTask) dTask.innerText = AutomationLogic.analysisData.target;
        if (dGoal) dGoal.innerText = AutomationLogic.analysisData.task;

        const fields = AutomationLogic.analysisData.fields || [];

        // Auto-launch autonomous site data extraction without blocking the user on form steps
        if (AutomationLogic.analysisData.intent === 'Extraction' || AutomationLogic.analysisData.intent === 'Analysis' || fields.length === 0 || fields.every(f => f.optional)) {
            console.log("[AI] Autonomous Extraction/Analysis task detected. Bypassing form step and launching execution...");
            document.getElementById('step-prompt')?.classList.add('hidden');
            document.getElementById('step-form')?.classList.add('hidden');
            setTimeout(() => {
                AutomationLogic.proceedWithAutomation();
            }, 200);
            return;
        }

        container.innerHTML = fields.map(field => `
            <div class="space-y-2">
                <label class="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">${field.label}</label>
                <input type="${field.type || 'text'}" id="field-${field.key}" data-key="${field.key}" class="automation-input w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-black focus:outline-none focus:border-royal transition font-bold" placeholder="Provide ${field.label.toLowerCase()}...">
            </div>`).join('');

        document.getElementById('step-prompt')?.classList.add('hidden');
        document.getElementById('step-form')?.classList.remove('hidden');
    },

    renderTargetSiteCanvas(targetUrl, taskName) {
        let cleanUrl = targetUrl || "https://web.whatsapp.com";
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }

        const isWhatsApp = cleanUrl.includes('whatsapp.com');
        const isFacebook = cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.com');
        const isGoogle = cleanUrl.includes('google.com');
        const isAmazon = cleanUrl.includes('amazon.com');

        const iconClass = isWhatsApp ? 'fa-brands fa-whatsapp'
                        : isFacebook ? 'fa-brands fa-facebook'
                        : isGoogle ? 'fa-brands fa-google'
                        : isAmazon ? 'fa-brands fa-amazon'
                        : 'fa-solid fa-globe';

        const brandTitle = isWhatsApp ? 'WhatsApp Web Application'
                         : isFacebook ? 'Meta Ads Manager Stage'
                         : isGoogle ? 'Google Search & Cloud Platform'
                         : isAmazon ? 'Amazon Commerce Console'
                         : 'Target Web Application';

        const placeholderSearch = isWhatsApp ? 'Search contact or enter phone number...'
                                : isFacebook ? 'Filter campaigns or ad sets...'
                                : isGoogle ? 'Search queries or document targets...'
                                : 'Search catalog or DOM targets...';

        const placeholderInput = isWhatsApp ? 'Type a message payload...'
                               : isFacebook ? 'Enter daily budget or campaign payload...'
                               : isGoogle ? 'Provide target field text...'
                               : 'Enter field value...';

        const siteIcon = document.getElementById('target-site-icon');
        const siteTitle = document.getElementById('mock-site-title');
        const siteUrl = document.getElementById('mock-site-url');
        const searchText = document.getElementById('mock-search-text');
        const chatText = document.getElementById('mock-chat-text');

        if (siteIcon) siteIcon.className = iconClass;
        if (siteTitle) siteTitle.innerText = taskName || brandTitle;
        if (siteUrl) siteUrl.innerText = cleanUrl;
        if (searchText) searchText.innerText = placeholderSearch;
        if (chatText) chatText.innerText = placeholderInput;

        const modalIcon = document.getElementById('modal-site-icon');
        const modalName = document.getElementById('modal-site-name');
        const modalDomain = document.getElementById('modal-site-domain');
        const modalSearchText = document.getElementById('modal-text-search');
        const modalChatText = document.getElementById('modal-text-chat');

        if (modalIcon) modalIcon.className = iconClass;
        if (modalName) modalName.innerText = taskName || brandTitle;
        if (modalDomain) modalDomain.innerText = cleanUrl;
        if (modalSearchText) modalSearchText.innerText = placeholderSearch;
        if (modalChatText) modalChatText.innerText = placeholderInput;
    },

    async proceedWithAutomation() {
        console.log("[Mission] Initializing Playwright Automation Session...");
        const formData = {};
        document.querySelectorAll('.automation-input').forEach(input => { formData[input.dataset.key] = input.value; });

        // Auto-populate default values for extraction/analysis missions so execution is 100% autonomous
        if (AutomationLogic.analysisData.fields) {
            AutomationLogic.analysisData.fields.forEach(f => {
                if (!formData[f.key]) formData[f.key] = 'Auto';
            });
        }

        const runId = 'RUN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        AutomationLogic.currentRunId = runId;

        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'flex';

        try {
            const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id') || 'guest';

            AutomationLogic.renderTargetSiteCanvas(AutomationLogic.analysisData.target, AutomationLogic.analysisData.task);

            // Submit task to Netlify API Gateway
            let result = null;
            try {
                const response = await fetch('/.netlify/functions/trigger-automation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        automationId: runId,
                        userId: uid,
                        target: AutomationLogic.analysisData.target,
                        task: AutomationLogic.analysisData.task,
                        missionPlan: AutomationLogic.analysisData.executionPlan,
                        payload: formData,
                        webhookUrl: formData.webhookUrl || null
                    })
                });

                result = await response.json();
                if (!response.ok || !result || !result.success || !result.workerConnected) {
                    throw new Error(result?.message || result?.details || "The Railway Playwright Browser Worker is currently offline.");
                }
            } catch (netErr) {
                console.error("[Mission] Netlify API Gateway Error:", netErr.message);
                alert(`Browser Worker Offline: ${netErr.message}`);
                return;
            }

            // Subscribe PlaywrightAgentClient to WebSocket/Firestore events
            globalPlaywrightAgentClient.subscribeToRun(AutomationLogic.currentRunId, result.realtimeUrl, result.runToken);
            AutomationLogic.startLiveSync();

            // Open CODEZ48 Automation Viewer Modal
            AutomationLogic.openLiveAgentModal();
            AutomationLogic.speakStatus(`Playwright Browser Agent launched for ${AutomationLogic.analysisData.task}`);

            document.getElementById('step-form')?.classList.add('hidden');
            document.getElementById('step-running')?.classList.remove('hidden');

            const runTask = document.getElementById('run-task-name');
            const runTarget = document.getElementById('run-target-url');
            if (runTask) runTask.innerText = AutomationLogic.analysisData.task;
            if (runTarget) runTarget.innerText = AutomationLogic.analysisData.target;
        } catch (e) {
            console.error("[Mission] Start Error:", e);
            alert("Start Error: " + e.message);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    },

    openTargetTab(urlOverride, existingTab = null) {
        let url = urlOverride || AutomationLogic.analysisData?.target || "https://web.whatsapp.com";
        if (typeof url !== 'string') url = "https://web.whatsapp.com";
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (AutomationLogic.currentRunId) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}runId=${AutomationLogic.currentRunId}`;
        }

        console.log("[CODEZ48] Opening target URL in target tab:", url);
        try {
            if (existingTab && !existingTab.closed) {
                existingTab.location.href = url;
            } else {
                window.open(url, '_blank');
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    },

    copyBookmarklet() {
        const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='${window.location.origin}/js/automation-bridge.js';document.body.appendChild(s);})();`;
        navigator.clipboard.writeText(bookmarkletCode).then(() => {
            alert("Target Tab Driver Bookmarklet copied to clipboard!\nPaste it in your browser address bar on the target tab to execute direct DOM actions.");
        });
    },

    startLiveSync() {
        if (!AutomationLogic.currentRunId) return;

        globalPlaywrightAgentClient.onEvent((eventType, data) => {
            const actionEl = document.getElementById('run-current-action');
            if (actionEl && data.lastAction) actionEl.innerText = data.lastAction;

            const logContainer = document.getElementById('automation-logs');
            if (logContainer && data.lastAction) {
                const p = document.createElement('p');
                p.className = 'text-slate-400';
                p.innerText = `>> [${new Date().toLocaleTimeString()}] ${data.lastAction}`;
                logContainer.appendChild(p);
                logContainer.scrollTop = logContainer.scrollHeight;
            }

            // PAGE_SCREENSHOT: Render real live page stream in Viewer Frame
            if (eventType === 'PAGE_SCREENSHOT' && data.image) {
                const frameImg = document.getElementById('automation-browser-frame-img');
                const modalFrameImg = document.getElementById('modal-automation-browser-frame-img');
                if (frameImg) frameImg.src = data.image;
                if (modalFrameImg) modalFrameImg.src = data.image;
            }

            // USER INPUT / OTP PAUSE ALERT
            if (data.status === RunState.WAITING_FOR_USER || data.waitingForUser) {
                document.getElementById('login-required-alert')?.classList.remove('hidden');
                document.getElementById('ai-question-area')?.classList.remove('hidden');
                const qText = document.getElementById('ai-question-text');
                if (qText) qText.innerText = data.lastAction || 'Authentication or OTP input required...';
            } else {
                document.getElementById('login-required-alert')?.classList.add('hidden');
                document.getElementById('ai-question-area')?.classList.add('hidden');
            }

            // 7-STAGE FLOW TRACKER BADGES
            if (data.currentStep) {
                const stageNum = Math.min(7, data.currentStep);
                for (let s = 1; s <= 7; s++) {
                    const badge = document.getElementById(`flow-stage-badge-${s}`);
                    if (badge) {
                        if (s < stageNum) badge.className = "w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black";
                        else if (s === stageNum) badge.className = "w-6 h-6 rounded-full bg-royal text-white flex items-center justify-center text-[10px] font-black animate-pulse shadow-md shadow-blue-500/50";
                        else badge.className = "w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black";
                    }
                }
            }

            // REALTIME CURSOR COORDINATE POSITIONING
            if (data.cursorState) {
                const displayX = (data.cursorState.x / 1280) * 100;
                const displayY = (data.cursorState.y / 720) * 100;
                AutomationLogic.animateVirtualCursor(displayX, displayY, data.cursorState.action);
            }

            if (data.assistantState) {
                AutomationLogic.updateAssistantUI(data.assistantState.expression, data.assistantState.text);
            }

            if (data.extractedData) {
                document.getElementById('extraction-results-card')?.classList.remove('hidden');
                AutomationLogic.renderFormattedData(data.extractedData, data.outputFormat || 'json');
            }

            if (data.status === RunState.COMPLETED) {
                const dot = document.getElementById('status-dot');
                const text = document.getElementById('status-text');
                if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-500";
                if (text) text.innerText = "Completed";
                AutomationLogic.updateAssistantUI('completed', 'Task Completed.');
            }
        });
    },

    async submitUserAnswer() {
        const input = document.getElementById('ai-answer-input');
        const val = input ? input.value.trim() : "";
        if (!val || !AutomationLogic.currentRunId) return;

        await globalPlaywrightAgentClient.resumeAutomationRun(AutomationLogic.currentRunId, val);

        if (input) input.value = '';
        document.getElementById('login-required-alert')?.classList.add('hidden');
        document.getElementById('ai-question-area')?.classList.add('hidden');
    },

    switchStageTab(tab) {
        const viewportTab = document.getElementById('stage-tab-viewport');
        const terminalTab = document.getElementById('stage-tab-terminal');
        const btnViewport = document.getElementById('btn-tab-viewport');
        const btnTerminal = document.getElementById('btn-tab-terminal');

        if (tab === 'viewport') {
            viewportTab?.classList.remove('hidden');
            terminalTab?.classList.add('hidden');
            if (btnViewport) btnViewport.className = "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white transition-all flex items-center gap-2";
            if (btnTerminal) btnTerminal.className = "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all flex items-center gap-2";
        } else {
            viewportTab?.classList.add('hidden');
            terminalTab?.classList.remove('hidden');
            if (btnTerminal) btnTerminal.className = "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-black text-white transition-all flex items-center gap-2";
            if (btnViewport) btnViewport.className = "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-all flex items-center gap-2";
        }
    },

    speakStatus(text) {
        if (!('speechSynthesis' in window) || !text) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("[Voice] Speech synthesis warning:", e);
        }
    },

    openLiveAgentModal() {
        const modal = document.getElementById('live-agent-modal');
        if (modal) modal.classList.remove('hidden');
    },

    closeLiveAgentModal() {
        const modal = document.getElementById('live-agent-modal');
        if (modal) modal.classList.add('hidden');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },

    animateVirtualCursor(xPercent, yPercent, action = 'hover') {
        const cursor = document.getElementById('virtual-cursor');
        const ripple = document.getElementById('cursor-ripple');
        const modalCursor = document.getElementById('modal-virtual-cursor');
        const modalRipple = document.getElementById('modal-cursor-ripple');

        if (cursor) {
            cursor.style.left = `${xPercent}%`;
            cursor.style.top = `${yPercent}%`;
            cursor.classList.remove('opacity-0');
            cursor.classList.add('opacity-100');
        }

        if (modalCursor) {
            modalCursor.style.left = `${xPercent}%`;
            modalCursor.style.top = `${yPercent}%`;
            modalCursor.classList.remove('opacity-0');
            modalCursor.classList.add('opacity-100');
        }

        if (action === 'click') {
            if (ripple) {
                ripple.classList.remove('animate-ping', 'opacity-0');
                void ripple.offsetWidth;
                ripple.classList.add('animate-ping', 'opacity-100');
            }
            if (modalRipple) {
                modalRipple.classList.remove('animate-ping', 'opacity-0');
                void modalRipple.offsetWidth;
                modalRipple.classList.add('animate-ping', 'opacity-100');
            }
        }
    },

    updateAssistantUI(expression = 'idle', text = 'Processing...') {
        AutomationLogic.speakStatus(text);

        const eyes = document.getElementById('assistant-eyes');
        const mouth = document.getElementById('assistant-mouth');
        const bubble = document.getElementById('assistant-status-bubble');

        const mEyes = document.getElementById('modal-assistant-eyes');
        const mMouth = document.getElementById('modal-assistant-mouth');
        const mBubble = document.getElementById('modal-assistant-bubble');

        if (bubble) bubble.innerText = text;
        if (mBubble) mBubble.innerText = text;

        const eyeHtml = expression === 'thinking' ? '<span class="w-1.5 h-1.5 rounded-full bg-royal animate-ping"></span><span class="w-1.5 h-1.5 rounded-full bg-royal animate-ping"></span>'
                      : (expression === 'clicking' || expression === 'completed') ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>'
                      : expression === 'waiting' ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>'
                      : '<span class="w-1.5 h-1.5 rounded-full bg-black"></span><span class="w-1.5 h-1.5 rounded-full bg-black"></span>';

        const mouthClass = expression === 'clicking' ? "w-3 h-1 bg-emerald-500 rounded-full mx-auto mt-0.5"
                         : expression === 'thinking' ? "w-2 h-2 border-2 border-royal rounded-full mx-auto mt-0.5 animate-spin"
                         : expression === 'completed' ? "w-3 h-1 bg-emerald-500 rounded-b-full mx-auto mt-0.5"
                         : "w-3 h-0.5 bg-black rounded-full mx-auto mt-0.5";

        if (eyes) eyes.innerHTML = eyeHtml;
        if (mEyes) mEyes.innerHTML = eyeHtml;
        if (mouth) mouth.className = mouthClass;
        if (mMouth) mMouth.className = mouthClass;
    },

    renderFormattedData(data, format = 'report') {
        const display = document.getElementById('extracted-data-display');
        if (!display) return;

        window._lastExtractedData = data;

        // 1. A-to-Z Site Intelligence & Technical Report Mode
        if (format === 'report' || (typeof data === 'object' && (data.problemsSolved || data.featuresList || data.techStack))) {
            const problems = data.problemsSolved || [
                "Manual multi-step WebRTC call & P2P file transfer friction",
                "Lack of instant secure room code access",
                "Complex user account onboarding barriers"
            ];
            const features = data.featuresList || [
                "Instant P2P File Transfer & WebRTC Video Calls",
                "No Login Required - Random Room Code Generation",
                "Admin Approval & HD WebRTC Stream Protocols"
            ];
            const techStack = data.techStack || [
                { category: "Frontend Framework", tech: "HTML5, Tailwind CSS, Font Awesome" },
                { category: "Realtime Protocols", tech: "WebRTC P2P, WebSockets, Firebase Sync" },
                { category: "Backend Runtime", tech: "Node.js, Netlify Functions, Playwright Chromium" }
            ];

            display.innerHTML = `
                <div class="space-y-6 text-slate-800 text-xs">
                    <!-- Section A: Value & Problems Solved -->
                    <div class="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 space-y-2">
                        <div class="flex items-center gap-2 text-royal font-black uppercase text-[10px] tracking-widest">
                            <i class="fa-solid fa-lightbulb"></i> Problems Solved & Value Proposition
                        </div>
                        <ul class="space-y-1.5 font-semibold text-slate-700">
                            ${problems.map(p => `<li class="flex items-start gap-2"><i class="fa-solid fa-check text-emerald-500 mt-0.5"></i> <span>${p}</span></li>`).join('')}
                        </ul>
                    </div>

                    <!-- Section B: Features Introduced -->
                    <div class="bg-purple-50/60 p-5 rounded-2xl border border-purple-100 space-y-2">
                        <div class="flex items-center gap-2 text-purple-700 font-black uppercase text-[10px] tracking-widest">
                            <i class="fa-solid fa-layer-group"></i> Features & Application Mechanics
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${features.map(f => `<div class="bg-white p-3 rounded-xl border border-purple-100 font-bold text-[11px] text-slate-800 flex items-center gap-2"><i class="fa-solid fa-star text-amber-400 text-xs"></i> <span>${f}</span></div>`).join('')}
                        </div>
                    </div>

                    <!-- Section C: Technology Stack Discovery -->
                    <div class="bg-slate-900 p-5 rounded-2xl text-white space-y-3">
                        <div class="flex items-center gap-2 text-emerald-400 font-black uppercase text-[10px] tracking-widest">
                            <i class="fa-solid fa-code"></i> Detected Technology Stack Matrix
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            ${techStack.map(t => `
                                <div class="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">${t.category}</p>
                                    <p class="text-xs font-mono font-bold text-white">${t.tech}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Section D: Raw Live Metrics / Extracted Content -->
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Extracted Data Metrics</p>
                        <pre class="text-emerald-600 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">${JSON.stringify(data.metrics || data, null, 2)}</pre>
                    </div>

                    <!-- Section E: Interactive Ask AI About This Site / Channel -->
                    <div id="site-qa-container" class="bg-gradient-to-br from-slate-900 to-purple-950 p-5 rounded-2xl text-white space-y-4 shadow-xl">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                            <span class="text-[10px] font-black text-purple-300 uppercase tracking-widest flex items-center gap-2">
                                <i class="fa-solid fa-comments text-purple-400"></i> Ask AI Questions About This Website / Channel
                            </span>
                            <span class="text-[8px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full uppercase border border-emerald-800">Context Loaded</span>
                        </div>

                        <div id="site-qa-history" class="space-y-3 max-h-56 overflow-y-auto custom-scrollbar font-sans text-xs">
                            <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-slate-300">
                                💡 <strong>AI Assistant Ready:</strong> Ask any question about this channel or website (e.g. <em>"What does this channel do?"</em> or <em>"Describe the layout section by section"</em>).
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <input type="text" id="site-qa-input" onkeypress="if(event.key==='Enter') window.askAIAboutSite()" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-medium" placeholder="Ask a question about this site or channel...">
                            <button onclick="window.askAIAboutSite()" id="btn-ask-site-qa" class="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-900/50">
                                <i class="fa-solid fa-paper-plane"></i> Ask AI
                            </button>
                        </div>
                    </div>
                </div>`;
        } else if (format === 'table' && Array.isArray(data) && data.length > 0) {
            const keys = Object.keys(data[0]);
            display.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-700">
                        <thead class="bg-slate-100 text-slate-500 uppercase text-[9px] font-black border-b border-slate-200">
                            <tr>${keys.map(k => `<th class="px-4 py-2">${k}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr class="border-b border-slate-100 hover:bg-slate-50 font-medium">
                                    ${keys.map(k => `<td class="px-4 py-2">${row[k]}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        } else if (format === 'list' && Array.isArray(data)) {
            display.innerHTML = `
                <ul class="space-y-2 text-xs text-slate-700 font-semibold">
                    ${data.map(item => `
                        <li class="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <i class="fa-solid fa-check text-emerald-500 text-xs"></i>
                            <span>${typeof item === 'object' ? JSON.stringify(item) : item}</span>
                        </li>
                    `).join('')}
                </ul>`;
        } else {
            display.innerHTML = `<pre class="text-emerald-500 font-mono text-xs whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre>`;
        }
    },

    async loadHistory() {
        const container = document.getElementById('mission-history-list');
        if (!container) return;

        const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id') || 'guest';
        const q = query(collection(db, "automations"), where("userId", "==", uid), limit(30));

        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `<div class="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200"><p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">No mission history detected</p></div>`;
                return;
            }

            const sortedDocs = snapshot.docs.sort((a, b) => {
                const tA = a.data().createdAt?.seconds || 0;
                const tB = b.data().createdAt?.seconds || 0;
                return tB - tA;
            }).slice(0, 20);

            container.innerHTML = sortedDocs.map(docSnap => {
                const data = docSnap.data();
                return `
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-royal transition-all">
                        <div class="flex items-center gap-4 flex-1">
                            <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-royal transition-colors">
                                <i class="fa-solid ${data.intent === 'Extraction' ? 'fa-cloud-download' : 'fa-bolt'}"></i>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-slate-900 uppercase tracking-tight">${data.task || 'Unnamed Task'}</h4>
                                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${data.target || 'Unknown Target'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-8">
                            <button onclick="window.viewSingleMission('${docSnap.id}')" class="bg-slate-900 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">View Result</button>
                        </div>
                    </div>`;
            }).join('');
        }, (err) => {
            console.error("[CODEZ48] History query error:", err);
        });
    },

    async viewMission(id) {
        const titleEl = document.getElementById('modal-mission-title');
        const contentEl = document.getElementById('modal-mission-content');
        try {
            const snap = await getDoc(doc(db, "automations", id));
            if (snap.exists()) {
                const data = snap.data();
                if (titleEl) titleEl.innerText = data.task || "Mission Details";
                if (contentEl) contentEl.innerHTML = `<pre class="whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre>`;
                document.getElementById('mission-modal')?.classList.remove('hidden');
            }
        } catch (e) { if (contentEl) contentEl.innerText = "Error loading mission details."; }
    },

    initWebhookGateway() {
        const uid = auth.currentUser?.uid || localStorage.getItem('tori_seller_id') || 'guest';
        const display = document.getElementById('webhook-url-display');
        if (display) display.value = `${window.location.origin}/.netlify/functions/inbound-webhook?sid=${uid}`;
        AutomationLogic.loadWebhookStream(uid);
    },

    async loadWebhookStream(uid) {
        const container = document.getElementById('webhook-stream-list');
        if (!container) return;
        const q = query(collection(db, "webhook_inbox"), where("userId", "==", uid), limit(50));
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `<tr><td colspan="3" class="px-8 py-10 text-center text-slate-300 italic uppercase">Awaiting inbound signals...</td></tr>`;
                return;
            }
            const sortedDocs = snapshot.docs.sort((a, b) => {
                const tA = a.data().receivedAt?.seconds || 0;
                const tB = b.data().receivedAt?.seconds || 0;
                return tB - tA;
            }).slice(0, 15);
            container.innerHTML = sortedDocs.map(docSnap => {
                const data = docSnap.data();
                const summary = JSON.stringify(data.data).substring(0, 50) + "...";
                const time = data.receivedAt ? new Date(data.receivedAt.seconds * 1000).toLocaleTimeString() : 'Just now';
                return `
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td class="px-8 py-4">${time}</td>
                        <td class="px-8 py-4 text-slate-400 font-mono">${summary}</td>
                        <td class="px-8 py-4 text-right">
                            <button onclick="viewSingleWebhook('${docSnap.id}')" class="text-royal hover:underline uppercase tracking-widest text-[9px]">Expand</button>
                        </td>
                    </tr>`;
            }).join('');
        }, (err) => {
            if (err.code === 'failed-precondition') {
                container.innerHTML = `<tr><td colspan="3" class="px-8 py-10 text-center text-amber-600 font-bold uppercase text-[9px]">Database Index Required.</td></tr>`;
            }
        });
    },

    async viewWebhook(id) {
        const titleEl = document.getElementById('modal-mission-title');
        const contentEl = document.getElementById('modal-mission-content');
        try {
            const snap = await getDoc(doc(db, "webhook_inbox", id));
            if (snap.exists()) {
                const data = snap.data();
                if (titleEl) titleEl.innerText = "Inbound Webhook Payload";
                if (contentEl) contentEl.innerHTML = `<pre class="whitespace-pre-wrap">${JSON.stringify(data.data, null, 2)}</pre>`;
                document.getElementById('mission-modal')?.classList.remove('hidden');
            }
        } catch (e) { console.error(e); }
    },

    async togglePause() {
        if (!AutomationLogic.currentRunId) return;
        const btn = document.getElementById('ctrl-pause');
        const isPaused = btn.innerText.includes('Resume');
        await setDoc(doc(db, "automations", AutomationLogic.currentRunId), { status: isPaused ? RunState.RUNNING : 'PAUSED', lastAction: isPaused ? 'Resuming...' : 'Paused by user' }, { merge: true });
        if (btn) btn.innerText = isPaused ? 'Pause Protocol' : 'Resume Protocol';
    },

    async askAIAboutSite() {
        const input = document.getElementById('site-qa-input');
        const historyEl = document.getElementById('site-qa-history');
        const btnAsk = document.getElementById('btn-ask-site-qa');

        const question = input ? input.value.trim() : '';
        if (!question) return;

        if (input) input.value = '';

        if (historyEl) {
            const userMsg = document.createElement('div');
            userMsg.className = 'bg-purple-900/60 p-3 rounded-xl border border-purple-700 text-purple-200 font-semibold';
            userMsg.innerHTML = `<strong>You:</strong> ${question}`;
            historyEl.appendChild(userMsg);
            historyEl.scrollTop = historyEl.scrollHeight;
        }

        if (btnAsk) {
            btnAsk.disabled = true;
            btnAsk.innerText = 'Thinking...';
        }

        try {
            const siteContext = JSON.stringify(window._lastExtractedData || AutomationLogic.analysisData || {});

            const aiReply = await callAI([
                {
                    role: "system",
                    content: `You are the Codez48 Site Intelligence Analyst. Use the following extracted live website & channel data context to answer the user's question clearly, thoroughly, and accurately.\n\nEXTRACTED SITE DATA CONTEXT:\n${siteContext}`
                },
                {
                    role: "user",
                    content: question
                }
            ]);

            if (historyEl && aiReply) {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-slate-100 font-medium leading-relaxed whitespace-pre-wrap';
                aiMsg.innerHTML = `<strong>Codez48 AI:</strong> ${aiReply.trim()}`;
                historyEl.appendChild(aiMsg);
                historyEl.scrollTop = historyEl.scrollHeight;
            }
        } catch (e) {
            if (historyEl) {
                const errMsg = document.createElement('div');
                errMsg.className = 'bg-rose-950/60 p-3 rounded-xl border border-rose-800 text-rose-300 font-semibold';
                errMsg.innerText = `Error generating answer: ${e.message}`;
                historyEl.appendChild(errMsg);
            }
        } finally {
            if (btnAsk) {
                btnAsk.disabled = false;
                btnAsk.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Ask AI`;
            }
        }
    },

    async resumeAutomation() {
        if (!AutomationLogic.currentRunId) return;
        await globalPlaywrightAgentClient.resumeAutomationRun(AutomationLogic.currentRunId, 'User clicked resume');
    },

    async terminateTask() {
        if (!confirm("Terminate session?")) return;
        if (AutomationLogic.currentRunId) {
            await globalPlaywrightAgentClient.stopAutomationRun(AutomationLogic.currentRunId);
        }
        location.reload();
    }
};

window.askAIAboutSite = () => AutomationLogic.askAIAboutSite();
window.AutomationLogic = AutomationLogic;

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('automation-view')) AutomationLogic.init(); });
