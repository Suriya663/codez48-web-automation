import { db, auth } from './firebase-config.js';
import {
    collection, query, where, getDocs, getDoc, doc, setDoc,
    serverTimestamp, onSnapshot, orderBy, limit, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { showView } from './navigation.js';
import { formatRelativeTime } from './utils.js';

let currentTrackerSiteId = localStorage.getItem('c48_last_site_id');
let currentSiteFeatures = null;
let dashboardUnsubscribers = [];
let queryRecycler = null;

/**
 * Switch tool sections
 */
export const showTrackerSection = (sectionName) => {
    const list = document.getElementById('tracker-section-list');
    const setup = document.getElementById('tracker-section-setup');
    const dashboard = document.getElementById('tracker-section-dashboard');
    const btnAdd = document.getElementById('btn-add-site');
    const btnBack = document.getElementById('btn-back-to-sites');

    [list, setup, dashboard].forEach(el => el.classList.add('hidden'));
    btnAdd.classList.add('hidden');
    btnBack.classList.remove('hidden');

    if (sectionName === 'list') {
        list.classList.remove('hidden');
        btnAdd.classList.remove('hidden');
        btnBack.classList.add('hidden');
        loadUserSites();
        stopDashboardListeners();
    } else if (sectionName === 'setup') {
        setup.classList.remove('hidden');
        document.getElementById('setup-step-1').classList.remove('hidden');
        document.getElementById('setup-step-2').classList.add('hidden');
    } else if (sectionName === 'dashboard') {
        dashboard.classList.remove('hidden');
        initTrackerDashboard();
        if (dashboard.getAttribute('data-initial-tab') === 'push') {
            switchTrackerDashboardTab('push');
            dashboard.removeAttribute('data-initial-tab');
        } else {
            switchTrackerDashboardTab('analytics');
        }
    }
};

/**
 * Load user's tracked sites
 */
const loadUserSites = async () => {
    if (!window.currentUser) return;
    const grid = document.getElementById('external-sites-grid');
    grid.innerHTML = '<div class="col-span-full py-10 text-center animate-pulse text-slate-400 font-bold uppercase text-[10px] tracking-widest">Accessing Node Registry...</div>';

    try {
        const q = query(collection(db, "external_sites"), where("ownerId", "==", window.currentUser.uid));
        const snap = await getDocs(q);

        if (snap.empty) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200"><p class="text-slate-400 text-sm font-medium mb-8">No sites found.</p><button onclick="showTrackerSection(\'setup\')" class="btn-royal px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Register New Site</button></div>';
            return;
        }

        grid.innerHTML = '';
        snap.forEach(docSnap => {
            const site = docSnap.data();
            const id = docSnap.id;
            const active = site.status === 'active';
            const regDate = site.createdAt ? site.createdAt.toDate().toLocaleString() : '---';

            const card = document.createElement('div');
            card.className = "glass-card p-8 rounded-[2.5rem] bg-white space-y-6 group cursor-pointer border border-transparent hover:border-royal transition-all relative min-w-0 w-full overflow-hidden flex flex-col";

            card.innerHTML = '<div class="flex justify-between items-start w-full">' +
                '<div onclick="window.handleSiteClick(\'' + id + '\', ' + active + ')" class="w-12 h-12 ' + (active ? 'bg-royal/10 text-royal' : 'bg-slate-50 text-slate-300') + ' rounded-2xl flex items-center justify-center shrink-0"><i class="fa-solid fa-globe text-xl"></i></div>' +
                '<div class="flex flex-col items-end gap-2 shrink-0">' +
                '<span class="' + (active ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500') + ' px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">' + (active ? 'Active' : 'Pending') + '</span>' +
                '<button onclick="window.deleteExternalSite(\'' + id + '\')" class="text-slate-200 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can text-[10px]"></i></button></div></div>' +
                '<div onclick="window.handleSiteClick(\'' + id + '\', ' + active + ')" class="min-w-0 w-full overflow-hidden"><h5 class="text-lg font-black text-black truncate block w-full" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">' + site.websiteUrl.replace(/https?:\/\//, '') + '</h5><p class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">ID: ' + id + '</p></div>' +
                '<div class="pt-4 border-t border-slate-50 flex justify-between items-center gap-4 w-full"><div><p class="text-[7px] font-black text-slate-300 uppercase">Registered</p><p class="text-[9px] font-bold text-slate-500 whitespace-nowrap">' + regDate + '</p></div>' +
                (active ? '<button onclick="window.handleSiteClick(\'' + id + '\', true, \'push\')" class="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black transition-all shrink-0"><i class="fa-solid fa-bell"></i> Push</button>' : '') + '</div>';
            grid.appendChild(card);
        });
    } catch (e) { console.error(e); }
};

window.handleSiteClick = (id, active, initialTab = 'analytics') => {
    currentTrackerSiteId = id;
    localStorage.setItem('c48_last_site_id', id);
    if (active) {
        document.getElementById('tracker-section-dashboard').setAttribute('data-initial-tab', initialTab);
        showTrackerSection('dashboard');
    } else {
        getDoc(doc(db, "external_sites", id)).then(s => {
            if (s.exists() && s.data().ownerId === window.currentUser.uid) {
                showSiteSetupStep2(id, s.data().websiteUrl);
            } else {
                alert("Access denied.");
            }
        });
    }
};

window.handleToolAction = (tool) => {
    showView('tracker');
    if (tool === 'push') {
        const lastSiteId = currentTrackerSiteId || localStorage.getItem('c48_last_site_id');
        if (lastSiteId) {
            window.handleSiteClick(lastSiteId, true, 'push');
        } else {
            showTrackerSection('list');
        }
    }
};

window.deleteExternalSite = async (id) => {
    if (!confirm("Are you sure you want to delete this website and ALL tracking data?")) return;
    const loader = document.getElementById('global-loader');
    loader.style.display = 'flex';
    try {
        const siteRef = doc(db, "external_sites", id);
        const siteSnap = await getDoc(siteRef);
        if (siteSnap.data().ownerId !== window.currentUser.uid) throw new Error("Unauthorized");

        const batch = writeBatch(db);
        const subcollections = ['sessions', 'events', 'subscribers', 'campaigns'];
        for (const sub of subcollections) {
            const q = query(collection(db, "external_sites", id, sub), limit(500));
            const snap = await getDocs(q);
            snap.forEach(d => batch.delete(d.ref));
        }
        batch.delete(siteRef);
        await batch.commit();
        loadUserSites();
    } catch (e) { alert("Delete error: " + e.message); }
    finally { loader.style.display = 'none'; }
};

export const generateTrackingCode = async () => {
    if (!window.currentUser) return alert("Login required.");
    const url = document.getElementById('tracker-url-input').value.trim();
    if (!url.startsWith('http')) return alert("Enter valid URL.");

    const features = {
        visitors: document.getElementById('feat-visitors').checked,
        live: document.getElementById('feat-live').checked,
        scroll: document.getElementById('feat-scroll').checked,
        clicks: document.getElementById('feat-clicks').checked,
        duration: document.getElementById('feat-duration').checked
    };

    try {
        const siteId = 'SITE_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        await setDoc(doc(db, "external_sites", siteId), {
            ownerId: window.currentUser.uid,
            websiteUrl: url,
            status: 'waiting_for_installation',
            createdAt: serverTimestamp(),
            features: features
        });
        currentTrackerSiteId = siteId;
        showSiteSetupStep2(siteId, url, features);
    } catch (e) { alert(e.message); }
};

const showSiteSetupStep2 = (siteId, url, features = null) => {
    showTrackerSection('setup');
    document.getElementById('setup-step-1').classList.add('hidden');
    document.getElementById('setup-step-2').classList.remove('hidden');
    const projectId = 'nshandlooms-a19be';

    if (!features) {
        features = { visitors: true, live: true, scroll: true, clicks: true, duration: true };
    }

    let logic = '';
    if (features.visitors) logic += '    track("page_view");\n';
    if (features.live || features.duration) logic += '    pulse();\n    setInterval(pulse, 12000);\n';
    if (features.clicks) {
        logic += '\n    document.addEventListener("mousedown", (e) => {\n        const t = e.target.closest("button, a");\n        if (t) track("click", { text: t.innerText.trim().substring(0, 30), tag: t.tagName.toLowerCase() });\n    });';
    }

    const scriptBody = `(function() {
    const SID = "${siteId}";
    const PROJECT = "${projectId}";
    const API = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/external_sites/" + SID;
    const hostname = window.location.hostname;
    const startTime = Date.now();
    let sessId = sessionStorage.getItem("c48_sid") || ("S_" + Math.random().toString(36).substr(2, 9).toUpperCase());
    sessionStorage.setItem("c48_sid", sessId);
    let visId = localStorage.getItem("c48_vid") || ("V_" + Math.random().toString(36).substr(2, 9).toUpperCase());
    localStorage.setItem("c48_vid", visId);

    const track = async (t, m = {}) => {
        const body = { fields: { siteId: { stringValue: SID }, sessionId: { stringValue: sessId }, visitorId: { stringValue: visId }, eventType: { stringValue: t }, page: { stringValue: window.location.pathname }, hostname: { stringValue: hostname }, timestamp: { timestampValue: new Date().toISOString() }, metadata: { mapValue: { fields: Object.keys(m).reduce((a, k) => { a[k] = { stringValue: String(m[k]) }; return a; }, {}) } } } };
        try { fetch(API + "/events", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), mode: "cors" }); } catch(e) {}
    };

    const pulse = async (s = "active") => {
        const body = { fields: { siteId: { stringValue: SID }, lastSeen: { timestampValue: new Date().toISOString() }, visitorId: { stringValue: visId }, page: { stringValue: window.location.pathname }, hostname: { stringValue: hostname }, env: { stringValue: navigator.platform + " (" + (navigator.userAgent.split(' ').pop()) + ")" }, lang: { stringValue: navigator.language || "en" }, screen: { stringValue: window.innerWidth + "x" + window.innerHeight }, duration: { integerValue: String(Math.round((Date.now() - startTime) / 1000)) }, status: { stringValue: s } } };
        const mask = "updateMask.fieldPaths=lastSeen&updateMask.fieldPaths=page&updateMask.fieldPaths=duration&updateMask.fieldPaths=status&updateMask.fieldPaths=env&updateMask.fieldPaths=lang&updateMask.fieldPaths=screen&updateMask.fieldPaths=siteId&updateMask.fieldPaths=visitorId&updateMask.fieldPaths=hostname";
        try {
            const r = await fetch(API + "/sessions/" + sessId + "?" + mask + "&currentDocument.exists=true", { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), mode: "cors" });
            if (r.status === 404) fetch(API + "/sessions?documentId=" + sessId, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), mode: "cors" });
        } catch(e) {}
    };

    const registerSubscriber = async () => {
        if ("serviceWorker" in navigator) {
            try {
                if (!window.firebase) {
                    await Promise.all([
                        new Promise((r, j) => { const s = document.createElement("script"); s.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"; s.onload = r; s.onerror = j; document.head.appendChild(s); }),
                        new Promise((r, j) => { const s = document.createElement("script"); s.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"; s.onload = r; s.onerror = j; document.head.appendChild(s); })
                    ]);
                }
                const app = firebase.initializeApp({ apiKey: "AIzaSyBJK-7By6I9xps518HCYc2Kow44vp9fDpY", authDomain: "nshandlooms-a19be.firebaseapp.com", projectId: "nshandlooms-a19be", messagingSenderId: "711669261779", appId: "1:711669261779:web:d323a1e50b5404ec10fb26" }, "push-helper-" + Date.now());
                const messaging = firebase.messaging(app);
                const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
                const token = await messaging.getToken({ serviceWorkerRegistration: reg });
                if (token) {
                    const b = { fields: { siteId: { stringValue: SID }, visitorId: { stringValue: visId }, fcmToken: { stringValue: token }, hostname: { stringValue: hostname }, browser: { stringValue: (navigator.userAgent.indexOf("Chrome") > -1 ? "Chrome" : "Browser") }, operatingSystem: { stringValue: navigator.platform }, deviceType: { stringValue: (navigator.userAgent.includes("Mobile") ? "mobile" : "desktop") }, language: { stringValue: navigator.language }, subscribedAt: { timestampValue: new Date().toISOString() }, lastActiveAt: { timestampValue: new Date().toISOString() }, permissionState: { stringValue: "granted" } } };
                    fetch(API + "/subscribers/" + visId, { method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify(b), mode: "cors" });

                    fetch('https://codez48.netlify.app/.netlify/functions/send-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            targetToken: token,
                            welcomeTitle: 'Welcome to ' + hostname + '!',
                            welcomeBody: 'Thank you for enabling notifications. We will keep you updated!'
                        }),
                        mode: 'cors'
                    }).catch(() => {});
                }
            } catch (e) { console.error("[CODEZ48] Push Error:", e.message); }
        }
    };

    const initPush = () => {
        if (!("Notification" in window) || Notification.permission === "granted" || localStorage.getItem("c48_push_denied")) {
             if (Notification.permission === "granted") registerSubscriber();
             return;
        }
        setTimeout(() => {
            const p = document.createElement("div");
            p.style = "position:fixed;bottom:20px;left:20px;right:20px;background:white;padding:20px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1);z-index:10000;display:flex;flex-direction:column;gap:15px;border:1px solid #eee;max-width:400px;margin:auto;font-family:sans-serif;";
            p.innerHTML = '<div style="font-size:14px;font-weight:bold;color:#111;">Get updates from ' + hostname + '</div><div style="font-size:12px;color:#666;">Stay informed about latest trends.</div><div style="display:flex;gap:10px;"><button id="c48-allow" style="flex:1;background:#2563EB;color:white;border:none;padding:12px;border-radius:12px;font-size:12px;font-weight:bold;cursor:pointer;">Allow</button><button id="c48-deny" style="flex:1;background:#f1f5f9;color:#666;border:none;padding:12px;border-radius:12px;font-size:12px;font-weight:bold;cursor:pointer;">Not Now</button></div>';
            document.body.appendChild(p);
            document.getElementById("c48-allow").onclick = () => { Notification.requestPermission().then(perm => { if (perm === "granted") registerSubscriber(); else localStorage.setItem("c48_push_denied", "true"); p.remove(); }); };
            document.getElementById("c48-deny").onclick = () => { localStorage.setItem("c48_push_denied", "true"); p.remove(); };
        }, 8000);
    };

    track("tracker_initialized", { title: document.title, referrer: document.referrer || "Direct" });
    initPush();
${logic}
})();`;

    const charCodes = [];
    for (let i = 0; i < scriptBody.length; i++) {
        charCodes.push(scriptBody.charCodeAt(i));
    }

    const encryptedCode = '<script>\n' +
'eval(String.fromCharCode(' + charCodes.join(',') + '));\n' +
'</script>';

    const instructionEl = document.getElementById('push-setup-instruction');
    if (instructionEl) {
        instructionEl.innerHTML = '<div style="background:#eff6ff; padding:20px; border-radius:24px; border:1px solid #dbeafe; margin-bottom:15px; font-family:sans-serif;">' +
            '<p style="margin:0; font-size:11px; font-weight:900; color:#1e40af; text-transform:uppercase; letter-spacing:0.1em;">Important Setup Step</p>' +
            '<p style="margin:8px 0 0; font-size:10px; color:#3b82f6; line-height:1.6; font-weight:600;">To enable push notifications, you must upload <b>firebase-messaging-sw.js</b> to the root directory of your website: <b>' + url + '</b></p>' +
            '</div>';
    }

    document.getElementById('tracking-code-block').innerText = encryptedCode;
};

export const initTrackerDashboard = async () => {
    stopDashboardListeners();
    const siteDoc = await getDoc(doc(db, "external_sites", currentTrackerSiteId));
    if (!siteDoc.exists()) {
        console.error("[CODEZ48] Site not found");
        showTrackerSection('list');
        return;
    }
    const siteData = siteDoc.data();
    currentSiteFeatures = siteData.features || { visitors: true, live: true, scroll: true, clicks: true, duration: true };
    startRealTimeSync(currentSiteFeatures);
    queryRecycler = setInterval(() => {
        dashboardUnsubscribers.forEach(u => u());
        dashboardUnsubscribers = [];
        startRealTimeSync(currentSiteFeatures);
    }, 30000);
};

const startRealTimeSync = (features) => {
    const liveCard = document.getElementById('tracker-live-visitors').parentElement;
    if (!features.live) {
        liveCard.classList.add('opacity-40', 'pointer-events-none');
        document.getElementById('tracker-live-visitors').innerText = "---";
    } else {
        liveCard.classList.remove('opacity-40', 'pointer-events-none');
        const qLive = query(collection(db, "external_sites", currentTrackerSiteId, "sessions"),
            where("lastSeen", ">", new Date(Date.now() - 300000))
        );
        const unsubLive = onSnapshot(qLive, (snap) => {
            let online = 0;
            const list = document.getElementById('tracker-live-visitors-list');
            list.innerHTML = '';
            snap.forEach(d => {
                const s = d.data();
                const lastSeenDate = s.lastSeen ? s.lastSeen.toDate() : new Date();
                const diff = Date.now() - lastSeenDate.getTime();
                let color = 'emerald-500', txt = 'Online';
                if (diff > 45000) { color = 'amber-500'; txt = 'Away'; }
                if (diff > 300000) { color = 'slate-300'; txt = 'Offline'; }
                if (diff <= 45000) online++;
                const row = document.createElement('tr');
                row.className = "border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer";
                row.onclick = () => showVisitorJourney(s.visitorId || s.sessionId);
                row.innerHTML = '<td class="px-8 py-6 text-center"><span class="flex items-center justify-center gap-2"><span class="w-2 h-2 rounded-full bg-' + color + ' ' + (txt === 'Online' ? 'animate-pulse' : '') + '"></span><span class="text-[8px] font-black uppercase text-slate-400">' + txt + '</span></span></td>' +
                    '<td class="px-8 py-6 text-black truncate">' + (s.page || '/') + '</td>' +
                    '<td class="px-8 py-6 text-slate-400 truncate">' + (s.env || 'Unknown') + '</td>' +
                    '<td class="px-8 py-6 text-slate-400 truncate">' + (s.lang || 'Global') + '</td>' +
                    '<td class="px-8 py-6 text-right text-royal font-black uppercase text-[9px] tracking-widest">' + formatRelativeTime(diff) + '</td>';
                list.appendChild(row);
            });
            document.getElementById('tracker-live-visitors').innerText = online;
            document.getElementById('live-visitor-count-badge').innerText = online + " Online";
        }, (err) => handleDashboardError(err));
        dashboardUnsubscribers.push(unsubLive);
    }

    const qEvents = query(collection(db, "external_sites", currentTrackerSiteId, "events"), orderBy("timestamp", "desc"), limit(15));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
        const feed = document.getElementById('tracker-activity-feed');
        feed.innerHTML = '';
        snap.forEach(d => {
            const e = d.data();
            const type = e.eventType || 'event';
            if (type.includes('click') && !features.clicks) return;
            if (type.includes('scroll') && !features.scroll) return;

            const item = document.createElement('div');
            item.className = "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300";
            let icon = 'fa-eye';
            if (type.includes('click')) icon = 'fa-arrow-pointer';
            else if (type.includes('scroll')) icon = 'fa-scroll';
            else if (type.includes('initialized')) icon = 'fa-power-off';

            let motionText = type.replace('_', ' ');
            let badgeHtml = '';
            if (type === 'scroll_direction') {
                const isBottom = e.metadata && e.metadata.dir === 'BOTTOM';
                motionText = isBottom ? "Scrolling DOWN" : "Scrolling UP";
                icon = isBottom ? 'fa-arrow-down' : 'fa-arrow-up';
                badgeHtml = '<span class="motion-badge ' + (isBottom ? 'scroll-bottom' : 'scroll-top') + '">' + (isBottom ? 'DOWN' : 'UP') + '</span>';
            }

            const eventDate = e.timestamp ? e.timestamp.toDate() : new Date();
            const diff = Date.now() - eventDate.getTime();
            const timeAgo = formatRelativeTime(diff);

            item.innerHTML = '<div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-400"><i class="fa-solid ' + icon + ' text-xs"></i></div>' +
                '<div class="flex-1 min-w-0 text-left overflow-hidden">' +
                    '<div class="flex items-center justify-between gap-2">' +
                        '<div class="flex items-center gap-2 overflow-hidden">' +
                            '<p class="text-[10px] font-black text-black uppercase truncate">' + motionText + '</p>' +
                            badgeHtml +
                        '</div>' +
                        '<span class="text-[8px] font-bold text-slate-300 whitespace-nowrap">' + timeAgo + '</span>' +
                    '</div>' +
                    '<p class="text-[9px] text-slate-400 truncate w-full">' + e.page + ' ' + (e.metadata && e.metadata.text ? '• "' + e.metadata.text + '"' : '') + '</p>' +
                '</div>';
            feed.appendChild(item);
        });
        updateAggregatedStats();
    }, (err) => handleDashboardError(err));
    dashboardUnsubscribers.push(unsubEvents);
};

const updateAggregatedStats = async () => {
    if (!currentTrackerSiteId) return;
    const features = currentSiteFeatures || { visitors: true, live: true, scroll: true, clicks: true, duration: true };
    try {
        const timeRangeEl = document.getElementById('tracker-time-range');
        const timeRange = timeRangeEl ? timeRangeEl.value : 'today';
        let range = 86400000;
        if (timeRange === '7days') range = 86400000 * 7;
        else if (timeRange === '30days') range = 86400000 * 30;
        else if (timeRange === 'yesterday') range = 86400000 * 2;
        const startTime = new Date(Date.now() - range);

        const [snap, snapSessions, allSessions] = await Promise.all([
            getDocs(query(collection(db, "external_sites", currentTrackerSiteId, "events"), where("timestamp", ">", startTime))),
            getDocs(query(collection(db, "external_sites", currentTrackerSiteId, "sessions"), where("lastSeen", ">", startTime))),
            getDocs(collection(db, "external_sites", currentTrackerSiteId, "sessions"))
        ]);

        const uniqueVisitors = new Set();
        let totalDuration = 0;
        const pages = {}, elms = {}, referrers = {};

        snapSessions.forEach(d => {
            const s = d.data();
            if (s.visitorId) uniqueVisitors.add(s.visitorId);
            if (features.duration) totalDuration += Number(s.duration || 0);
        });

        snap.forEach(d => {
            const e = d.data();
            const vId = e.visitorId || e.sessionId;
            if (vId) uniqueVisitors.add(vId);
            if (e.page) pages[e.page] = (pages[e.page] || 0) + 1;
            if (e.eventType && e.eventType.includes('click') && e.metadata && e.metadata.text) {
                elms[e.metadata.text] = (elms[e.metadata.text] || 0) + 1;
            }
            if (e.eventType === 'tracker_initialized' && e.metadata && e.metadata.referrer) {
                const r = e.metadata.referrer.replace('www.', '').split('/')[0] || 'Direct';
                referrers[r] = (referrers[r] || 0) + 1;
            }
        });

        document.getElementById('tracker-total-visits').innerText = features.visitors ? uniqueVisitors.size : "---";
        const totalVisitsEl = document.getElementById('tracker-all-time-visits');
        if (totalVisitsEl) {
            const allUniqueVisitors = new Set();
            allSessions.forEach(d => { if (d.data().visitorId) allUniqueVisitors.add(d.data().visitorId); });
            totalVisitsEl.innerText = allUniqueVisitors.size;
        }
        document.getElementById('tracker-total-events').innerText = snap.size;
        document.getElementById('tracker-total-sessions').innerText = snapSessions.size;

        if (features.duration) {
            const avg = snapSessions.size > 0 ? Math.round(totalDuration / snapSessions.size) : 0;
            document.getElementById('tracker-avg-duration').innerText = avg + 's';
            document.getElementById('tracker-avg-duration').parentElement.classList.remove('opacity-40');
        } else {
            document.getElementById('tracker-avg-duration').innerText = "---";
            document.getElementById('tracker-avg-duration').parentElement.classList.add('opacity-40');
        }
        renderRankedTable('tracker-top-pages', pages);
        renderRankedTable('tracker-top-elements', features.clicks ? elms : {});
        renderRankedTable('tracker-top-referrers', referrers);
    } catch (e) { console.error("Aggregation Error:", e); }
};

window.switchTrackerDashboardTab = (tab) => {
    const analyticsBtn = document.getElementById('tracker-tab-analytics');
    const pushBtn = document.getElementById('tracker-tab-push');
    const analyticsView = document.getElementById('tracker-dashboard-analytics-view');
    const pushView = document.getElementById('tracker-dashboard-push-view');
    if (tab === 'analytics') {
        analyticsBtn.className = "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-black text-white shadow-lg transition-all";
        pushBtn.className = "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-black transition-all";
        analyticsView.classList.remove('hidden');
        pushView.classList.add('hidden');
        updateAggregatedStats();
    } else {
        pushBtn.className = "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-black text-white shadow-lg transition-all";
        analyticsBtn.className = "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 hover:text-black transition-all";
        pushView.classList.remove('hidden');
        analyticsView.classList.add('hidden');
        loadPushDashboard();
    }
};

const loadPushDashboard = async () => {
    if (!currentTrackerSiteId) return;
    const unsubSubscribers = onSnapshot(collection(db, "external_sites", currentTrackerSiteId, "subscribers"), (snap) => {
        document.getElementById('push-total-subscribers').innerText = snap.size;
        let active = 0;
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        snap.forEach(d => { if (d.data().lastActiveAt && d.data().lastActiveAt.toDate().getTime() > thirtyDaysAgo) active++; });
        document.getElementById('push-active-subscribers').innerText = active;
        renderSubscriberList(snap);
    });
    dashboardUnsubscribers.push(unsubSubscribers);

    const qCampaigns = query(collection(db, "external_sites", currentTrackerSiteId, "campaigns"), orderBy("createdAt", "desc"));
    const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
        const list = document.getElementById('push-campaign-list');
        list.innerHTML = '';
        let totalSent = 0, totalClicks = 0;
        snap.forEach(d => {
            const c = d.data();
            totalSent += (c.sentCount || 0);
            totalClicks += (c.clickCount || 0);
            const row = document.createElement('tr');
            row.className = "border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer";
            row.innerHTML = '<td class="py-4 px-4"><p class="text-black uppercase">' + c.title + '</p><p class="text-[8px] text-slate-400">' + (c.createdAt ? c.createdAt.toDate().toLocaleString() : '---') + '</p></td><td class="py-4 px-4 text-slate-500 uppercase text-[8px]">' + c.audience + '</td><td class="py-4 px-4 text-slate-500">' + (c.sentCount || 0) + '</td><td class="py-4 px-4 text-slate-500">' + (c.clickCount || 0) + '</td><td class="py-4 px-4 text-royal font-black">' + (c.ctr || '0%') + '</td><td class="py-4 px-4 text-right"><span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-500 text-[7px] uppercase font-black">' + (c.status || 'Sent') + '</span></td>';
            list.appendChild(row);
        });
        const avgCtr = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : 0;
        document.getElementById('push-avg-ctr').innerText = avgCtr + '%';
    });
    dashboardUnsubscribers.push(unsubCampaigns);

    const titleIn = document.getElementById('push-title');
    const descIn = document.getElementById('push-desc');
    const prevTitle = document.getElementById('preview-push-title');
    const prevDesc = document.getElementById('preview-push-desc');
    titleIn.oninput = () => prevTitle.innerText = titleIn.value || "Notification Title";
    descIn.oninput = () => prevDesc.innerText = descIn.value || "Your message will appear here on the user's device.";
};

const renderSubscriberList = (snap) => {
    const list = document.getElementById('push-subscriber-list');
    list.innerHTML = snap.empty ? '<tr><td colspan="4" class="py-10 text-center text-slate-300 italic">No subscribers yet.</td></tr>' : '';
    snap.forEach(d => {
        const s = d.data();
        const date = s.subscribedAt ? s.subscribedAt.toDate().toLocaleDateString() : 'N/A';
        const row = document.createElement('tr');
        row.className = "border-b border-slate-50 hover:bg-slate-50 transition";
        row.innerHTML = '<td class="py-4 px-4"><p class="text-black font-bold uppercase text-[9px]">' + (s.deviceType || 'Unknown') + '</p><p class="text-[7px] text-slate-400 uppercase font-black">' + (s.operatingSystem || 'Unknown OS') + '</p></td><td class="py-4 px-4 text-slate-500 uppercase text-[8px]">' + (s.browser || 'Unknown') + '</td><td class="py-4 px-4 text-slate-500">' + date + '</td><td class="py-4 px-4 text-right"><button onclick="window.deleteSubscriber(\'' + d.id + '\')" class="text-slate-200 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash-can"></i></button></td>';
        list.appendChild(row);
    });
};

window.deleteSubscriber = async (id) => {
    if(!confirm("Remove this subscriber?")) return;
    try { await deleteDoc(doc(db, "external_sites", currentTrackerSiteId, "subscribers", id)); } catch (e) { alert(e.message); }
};

window.publishCampaign = async () => {
    if (!auth.currentUser) return;
    const title = document.getElementById('push-title').value.trim();
    const desc = document.getElementById('push-desc').value.trim();
    const image = document.getElementById('push-image').value.trim();
    const url = document.getElementById('push-url').value.trim();
    const audience = document.getElementById('push-audience').value;
    if (!title || !desc || !url) return alert("Please fill Title, Description and Target URL.");
    const loader = document.getElementById('global-loader');
    loader.style.display = 'flex';
    try {
        const campaignId = 'CAMP_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const campaignRef = doc(db, "external_sites", currentTrackerSiteId, "campaigns", campaignId);
        await setDoc(campaignRef, { title: title, description: desc, image: image || null, targetUrl: url, audience: audience, status: 'Preparing', createdAt: serverTimestamp(), sentCount: 0, clickCount: 0, ctr: '0%' });
        const idToken = await auth.currentUser.getIdToken();
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const functionUrl = isLocal ? 'https://codez48.netlify.app/.netlify/functions/send-notification' : '/.netlify/functions/send-notification';
        const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken }, body: JSON.stringify({ siteId: currentTrackerSiteId, campaignId: campaignId }) });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[CODEZ48] Notification API Error:", response.status, errorText);

            let errorMessage = "Notification Error (" + response.status + ")";
            try {
                const errJson = JSON.parse(errorText);
                errorMessage = errJson.error || errorMessage;
            } catch (e) {
                if(errorText.includes("502")) errorMessage = "Backend crashed (502). Re-check FIREBASE_SERVICE_ACCOUNT formatting.";
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        alert(`Campaign published! Sent to ${result.sentCount} devices.`);
        document.getElementById('push-title').value = '';
        document.getElementById('push-desc').value = '';
        document.getElementById('push-image').value = '';
        document.getElementById('push-url').value = '';
    } catch (e) { alert("Publishing error: " + e.message); }
    finally { loader.style.display = 'none'; }
};

const renderRankedTable = (id, data) => {
    const el = document.getElementById(id);
    const sorted = Object.entries(data).sort((a,b) => b[1] - a[1]).slice(0, 5);
    el.innerHTML = sorted.length ? sorted.map(([k, c]) => '<div class="flex justify-between items-center text-[10px] font-bold py-2 border-b border-slate-50 last:border-0 min-w-0 w-full overflow-hidden"><span class="text-slate-500 truncate pr-4 min-w-0 flex-1" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">' + k + '</span><span class="text-black font-black shrink-0">' + c + '</span></div>').join('') : '<p class="text-[9px] text-slate-300 font-bold uppercase text-center py-4">No data</p>';
};

const handleDashboardError = (err) => {
    if (err.code === 'failed-precondition') {
        const urlMatch = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
        const url = urlMatch ? urlMatch[0] : null;
        if (url && !document.getElementById('idx-alert')) {
            const alertEl = document.createElement('div');
            alertEl.id = 'idx-alert'; alertEl.className = "bg-red-50 border-l-4 border-red-500 p-6 mb-10 rounded-2xl";
            alertEl.innerHTML = `<h5 class="text-sm font-black text-red-900 uppercase mb-2">Firestore Index Required</h5><a href="${url}" target="_blank" class="bg-red-600 text-white px-6 py-2.5 rounded-full text-[9px] font-black uppercase shadow-lg">Fix Real-time Sync</a>`;
            document.getElementById('tracker-section-dashboard').prepend(alertEl);
        }
    }
};

const stopDashboardListeners = () => {
    dashboardUnsubscribers.forEach(u => u());
    dashboardUnsubscribers = [];
    if(queryRecycler) clearInterval(queryRecycler);
    queryRecycler = null;
};

window.showVisitorJourney = async (visitorId) => {
    const modal = document.getElementById('visitor-journey-modal');
    const timeline = document.getElementById('journey-timeline');
    const idLabel = document.getElementById('journey-visitor-id');
    if (!modal || !timeline || !idLabel) {
        console.error("[CODEZ48] Journey modal elements missing from DOM");
        return;
    }
    modal.classList.remove('hidden');
    idLabel.innerText = "ID: " + visitorId;
    timeline.innerHTML = '<div class="py-10 text-center animate-pulse text-slate-300">Loading Journey...</div>';
    try {
        const q = query(collection(db, "external_sites", currentTrackerSiteId, "events"), where("visitorId", "==", visitorId), orderBy("timestamp", "asc"), limit(100));
        const snap = await getDocs(q);
        timeline.innerHTML = snap.empty ? '<p class="text-center py-10 text-slate-400">No event data.</p>' : '';
        snap.forEach(d => {
            const e = d.data();
            const diff = e.timestamp ? (Date.now() - e.timestamp.toDate().getTime()) : 0;
            const item = document.createElement('div');
            item.className = "relative pl-8 border-l-2 border-slate-100 pb-6 last:pb-0";
            item.innerHTML = `<div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-royal"></div><div class="flex justify-between items-start mb-1"><p class="text-[10px] font-black text-black uppercase">${e.eventType.replace('_', ' ')}</p><span class="text-[8px] font-bold text-slate-400">${formatRelativeTime(diff)}</span></div><p class="text-[10px] text-slate-500 font-medium">${e.page}</p>${e.metadata && e.metadata.text ? `<p class="text-[9px] text-royal font-black mt-1 uppercase italic">"${e.metadata.text}"</p>` : ''}`;
            timeline.appendChild(item);
        });
    } catch (e) { timeline.innerHTML = '<p class="text-center text-red-500">Error loading timeline.</p>'; }
};

window.closeVisitorJourney = () => {
    const modal = document.getElementById('visitor-journey-modal');
    if (modal) modal.classList.add('hidden');
};
window.showTrackerSection = showTrackerSection;
window.generateTrackingCode = generateTrackingCode;
window.updateTrackerDashboard = updateAggregatedStats;
window.toggleAllFeatures = (e) => ['feat-visitors', 'feat-live', 'feat-scroll', 'feat-clicks', 'feat-duration'].forEach(id => document.getElementById(id).checked = e);
window.verifyWebsiteInstallation = async () => {
    const statusEl = document.getElementById('verification-status');
    const btn = document.getElementById('btn-verify-site');
    statusEl.classList.remove('hidden');
    statusEl.innerText = "Listening for Node Signal...";
    statusEl.className = "text-center text-[10px] font-black uppercase text-royal animate-pulse";
    btn.disabled = true;
    try {
        const siteDoc = await getDoc(doc(db, "external_sites", currentTrackerSiteId));
        const targetHostname = new URL(siteDoc.data().websiteUrl).hostname.replace('www.', '');
        const q = query(collection(db, "external_sites", currentTrackerSiteId, "events"), where("eventType", "==", "tracker_initialized"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const signalHostname = snap.docs[0].data().hostname ? snap.docs[0].data().hostname.replace('www.', '') : null;
            if (signalHostname && signalHostname.includes(targetHostname)) {
                await setDoc(doc(db, "external_sites", currentTrackerSiteId), { status: 'active', verifiedAt: serverTimestamp() }, { merge: true });
                statusEl.innerText = "VERIFIED ✓";
                statusEl.className = "text-center text-[10px] font-black uppercase text-emerald-500";
                setTimeout(() => showTrackerSection('dashboard'), 1500);
            } else {
                statusEl.innerText = "WRONG DOMAIN SIGNAL";
                statusEl.className = "text-center text-[10px] font-black uppercase text-red-500";
            }
        } else {
            statusEl.innerHTML = '<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-4 text-left"><p class="text-black mb-2 text-xs font-black">NO SIGNAL DETECTED</p><ol class="list-decimal ml-4 space-y-1 text-slate-500 text-[10px] normal-case font-medium"><li>Paste code in &lt;head&gt;</li><li>Visit your site</li><li>Wait 5s and click Verify</li></ol></div>';
            statusEl.className = "text-[10px] font-black uppercase text-amber-500";
        }
    } catch (e) { statusEl.innerText = "FIRESTORE ERROR"; }
    finally { btn.disabled = false; }
};
window.deleteExternalSite = deleteExternalSite;
window.copyTrackingCode = (e) => {
    const code = document.getElementById('tracking-code-block').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const b = e.target; const old = b.innerText; b.innerText = 'COPIED!';
        setTimeout(() => b.innerText = old, 2000);
    });
};
window.bypassVerification = async () => {
    if(!confirm("Bypass?")) return;
    await setDoc(doc(db, "external_sites", currentTrackerSiteId), { status: 'active', verifiedAt: serverTimestamp() }, { merge: true });
    showTrackerSection('dashboard');
};
