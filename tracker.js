/**
 * CODEZ48 Website Tracker - Production V2.6.2 (Hardened Edition)
 */
(function() {
    const script = document.currentScript;
    const siteId = script.getAttribute('data-site-id');
    const projectId = 'nshandlooms-a19be';

    if (!siteId) return console.error('[CODEZ48] Missing data-site-id.');

    const API_BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/external_sites/${siteId}`;
    const hostname = window.location.hostname;
    const startTime = Date.now();

    let sid = sessionStorage.getItem('c48_sid') || ('S_' + Math.random().toString(36).substr(2, 9).toUpperCase());
    sessionStorage.setItem('c48_sid', sid);
    let vid = localStorage.getItem('c48_vid') || ('V_' + Math.random().toString(36).substr(2, 9).toUpperCase());
    localStorage.setItem('c48_vid', vid);

    const track = async (type, meta = {}) => {
        const payload = { fields: {
            siteId: { stringValue: siteId }, sessionId: { stringValue: sid }, visitorId: { stringValue: vid },
            eventType: { stringValue: type }, page: { stringValue: window.location.pathname },
            hostname: { stringValue: hostname }, timestamp: { timestampValue: new Date().toISOString() },
            metadata: { mapValue: { fields: Object.keys(meta).reduce((acc, k) => {
                acc[k] = { stringValue: String(meta[k]) }; return acc;
            }, {}) } }
        }};
        fetch(`${API_BASE}/events`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), mode: 'cors'
        }).catch(() => {});
    };

    const pulse = async (status = "active") => {
        const body = { fields: {
            siteId: { stringValue: siteId }, visitorId: { stringValue: vid },
            lastSeen: { timestampValue: new Date().toISOString() },
            page: { stringValue: window.location.pathname }, hostname: { stringValue: hostname },
            env: { stringValue: navigator.platform + " (" + getBrowser() + ")" },
            lang: { stringValue: navigator.language || "en" },
            screen: { stringValue: window.innerWidth + 'x' + window.innerHeight },
            duration: { integerValue: String(Math.round((Date.now() - startTime) / 1000)) },
            status: { stringValue: status }
        }};
        const mask = "updateMask.fieldPaths=lastSeen&updateMask.fieldPaths=page&updateMask.fieldPaths=duration&updateMask.fieldPaths=status&updateMask.fieldPaths=env&updateMask.fieldPaths=lang&updateMask.fieldPaths=screen&updateMask.fieldPaths=siteId&updateMask.fieldPaths=visitorId&updateMask.fieldPaths=hostname";
        fetch(`${API_BASE}/sessions/${sid}?${mask}&currentDocument.exists=true`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), mode: 'cors'
        }).then(res => {
            if (res.status === 404) {
                fetch(`${API_BASE}/sessions?documentId=${sid}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body), mode: 'cors'
                });
            }
        }).catch(() => {});

        if (Notification.permission === 'granted') {
            fetch(`${API_BASE}/subscribers/${vid}?updateMask.fieldPaths=lastActiveAt&currentDocument.exists=true`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: { lastActiveAt: { timestampValue: new Date().toISOString() } } }), mode: 'cors'
            }).catch(() => {});
        }
    };

    const getBrowser = () => {
        const ua = navigator.userAgent;
        if (ua.indexOf("Chrome") > -1) return "Chrome";
        if (ua.indexOf("Safari") > -1) return "Safari";
        if (ua.indexOf("Firefox") > -1) return "Firefox";
        return "Browser";
    };

    const registerSubscriber = async () => {
        if ('serviceWorker' in navigator) {
            console.log('[CODEZ48] Starting Push Registration...');
            try {
                if (!window.firebase) {
                    await Promise.all([
                        loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js'),
                        loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')
                    ]);
                }

                const app = firebase.initializeApp({
                    apiKey: "AIzaSyBJK-7By6I9xps518HCYc2Kow44vp9fDpY",
                    authDomain: "nshandlooms-a19be.firebaseapp.com",
                    projectId: "nshandlooms-a19be",
                    messagingSenderId: "711669261779",
                    appId: "1:711669261779:web:d323a1e50b5404ec10fb26"
                }, 'push-helper');

                const messaging = firebase.messaging(app);

                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('[CODEZ48] Service Worker Registered');

                const token = await messaging.getToken({ serviceWorkerRegistration: registration });

                if (token) {
                    const subData = { fields: {
                        siteId: { stringValue: siteId }, visitorId: { stringValue: vid },
                        fcmToken: { stringValue: token }, hostname: { stringValue: hostname },
                        browser: { stringValue: getBrowser() }, operatingSystem: { stringValue: navigator.platform },
                        deviceType: { stringValue: (navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop') },
                        language: { stringValue: navigator.language }, subscribedAt: { timestampValue: new Date().toISOString() },
                        lastActiveAt: { timestampValue: new Date().toISOString() }, permissionState: { stringValue: 'granted' }
                    }};

                    const res = await fetch(`${API_BASE}/subscribers/${vid}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subData), mode: 'cors'
                    });

                    if (res.status === 404) {
                        await fetch(`${API_BASE}/subscribers?documentId=${vid}`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(subData), mode: 'cors'
                        });
                        console.log('[CODEZ48] Subscriber Created');
                    } else {
                        console.log('[CODEZ48] Subscriber Updated:', res.status);
                    }

                    // Send Automatic Welcome Notification
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
            } catch (e) {
                console.warn('[CODEZ48] Local Push failed, attempting Proxy...');
                registerViaProxy();
            }
        }
    };

    const registerViaProxy = () => {
        const proxyUrl = 'https://codez48.netlify.app/push-helper.html';
        let iframe = document.getElementById('c48-push-proxy');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'c48-push-proxy';
            iframe.src = proxyUrl;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        const handleMessage = async (event) => {
            if (event.origin !== 'https://codez48.netlify.app') return;
            if (event.data.type === 'C48_PUSH_TOKEN') {
                const token = event.data.token;
                console.log('[CODEZ48] Token received via Proxy');

                const subData = { fields: {
                    siteId: { stringValue: siteId }, visitorId: { stringValue: vid },
                    fcmToken: { stringValue: token }, hostname: { stringValue: hostname },
                    browser: { stringValue: getBrowser() }, operatingSystem: { stringValue: navigator.platform },
                    deviceType: { stringValue: (navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop') },
                    language: { stringValue: navigator.language }, subscribedAt: { timestampValue: new Date().toISOString() },
                    lastActiveAt: { timestampValue: new Date().toISOString() }, permissionState: { stringValue: 'granted' }
                }};

                fetch(`${API_BASE}/subscribers/${vid}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subData), mode: 'cors'
                }).then(res => {
                    if (res.status === 404) {
                        fetch(`${API_BASE}/subscribers?documentId=${vid}`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(subData), mode: 'cors'
                        });
                    }
                });
                window.removeEventListener('message', handleMessage);
            }
        };

        window.addEventListener('message', handleMessage);
        iframe.onload = () => iframe.contentWindow.postMessage('GET_TOKEN', '*');
    };

    const loadScript = (url) => new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = url; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });

    const initPush = () => {
        if (!('Notification' in window) || localStorage.getItem('c48_push_denied')) return;

        if (Notification.permission === 'granted') {
            // Already allowed, but let's make sure the token is synced to Firestore
            registerSubscriber();
            return;
        }

        setTimeout(() => {
            const p = document.createElement('div');
            p.style = "position:fixed;bottom:20px;left:20px;right:20px;background:white;padding:20px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1);z-index:10000;display:flex;flex-direction:column;gap:15px;border:1px solid #eee;max-width:400px;margin:auto;font-family:sans-serif;";
            p.innerHTML = `<div style="font-size:14px;font-weight:bold;color:#111;">Get updates from ${hostname}</div><div style="font-size:12px;color:#666;">Stay informed about latest trends.</div><div style="display:flex;gap:10px;"><button id="c48-allow" style="flex:1;background:#2563EB;color:white;border:none;padding:12px;border-radius:12px;font-size:12px;font-weight:bold;cursor:pointer;">Allow</button><button id="c48-deny" style="flex:1;background:#f1f5f9;color:#666;border:none;padding:12px;border-radius:12px;font-size:12px;font-weight:bold;cursor:pointer;">Not Now</button></div>`;
            document.body.appendChild(p);
            document.getElementById('c48-allow').onclick = () => { Notification.requestPermission().then(perm => { if (perm === 'granted') registerSubscriber(); else localStorage.setItem('c48_push_denied', 'true'); p.remove(); }); };
            document.getElementById('c48-deny').onclick = () => { localStorage.setItem('c48_push_denied', 'true'); p.remove(); };
        }, 8000);
    };

    track('tracker_initialized', { title: document.title, referrer: document.referrer || 'Direct' });
    pulse();
    initPush();
    setInterval(pulse, 12000);

    let lastScroll = Date.now();
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScroll < 3000) return; // Throttled to 3s
        const currentY = window.scrollY;
        if (Math.abs(currentY - lastY) < 100) return;
        const dir = currentY > lastY ? 'BOTTOM' : 'TOP';
        track('scroll_direction', { dir: dir });
        lastScroll = now;
        lastY = currentY;
    }, { passive: true });

    document.addEventListener('mousedown', (e) => {
        const t = e.target.closest('button, a');
        if (t) track('click', { text: t.innerText.trim().substring(0, 30), tag: t.tagName.toLowerCase() });
    });
})();
