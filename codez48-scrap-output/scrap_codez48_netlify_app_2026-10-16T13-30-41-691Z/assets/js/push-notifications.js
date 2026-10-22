import { db, auth, messaging } from './firebase-config.js';
import { getToken, deleteToken } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";
import { doc, setDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

/**
 * CODEZ48 Ultra-Reliable Global Push Notification System
 * Handles automated enrollment, cross-device token refresh, and background delivery.
 */
export const PushNotificationSystem = {
    VAPID_KEY: "BCmqkwcfDBay0cDM4ihvgKhb8mwnKnW4Vl-aGuiK4i1gorHKB5HXHpoX0gbECTI2AVEBAV5OFpeUeY9JT1gaEU0",

    async init() {
        if (!("Notification" in window)) {
            console.warn("[PUSH] Notifications not supported.");
            return;
        }

        // Auto-refresh token on every visit if already granted
        if (Notification.permission === "granted") {
            this.registerToken();

            // Refresh token when tab regains focus to ensure delivery
            window.addEventListener('focus', () => this.registerToken());
            return;
        }

        // Show onboarding prompt for new visitors after 5s
        if (Notification.permission === "default" && !localStorage.getItem('c48_push_dismissed')) {
            setTimeout(() => this.showPermissionPrompt(), 5000);
        }
    },

    showPermissionPrompt() {
        if (document.getElementById('push-permission-bar')) return;

        const prompt = document.createElement('div');
        prompt.id = 'push-permission-bar';
        prompt.className = 'fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[380px] bg-white border border-black shadow-2xl rounded-2xl p-6 z-[200] animate-in slide-in-from-bottom-8 duration-500';
        prompt.innerHTML = `
            <div class="flex items-start gap-4 text-left">
                <div class="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-bell-on text-xl"></i>
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-black text-black uppercase tracking-tight">Stay Connected</h4>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Enable push notifications to receive real-time business alerts and platform updates directly on your device.</p>
                    <div class="flex gap-3 mt-4">
                        <button id="btn-push-allow" class="flex-1 bg-black text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg">Allow Notifications</button>
                        <button id="btn-push-later" class="flex-1 bg-white text-slate-400 border border-slate-200 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition">Not Now</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(prompt);

        document.getElementById('btn-push-allow').onclick = () => this.requestPermission();
        document.getElementById('btn-push-later').onclick = () => {
            localStorage.setItem('c48_push_dismissed', 'true');
            prompt.remove();
        };
    },

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                await this.registerToken();
                document.getElementById('push-permission-bar')?.remove();
            } else {
                localStorage.setItem('c48_push_dismissed', 'true');
                document.getElementById('push-permission-bar')?.remove();
            }
        } catch (e) {
            console.error("[PUSH] Request Error:", e);
        }
    },

    async registerToken() {
        if (!messaging) return;
        try {
            // Guarantee valid session
            if (!auth.currentUser) await signInAnonymously(auth);

            // Ensure Service Worker is fully active before token request
            const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            await navigator.serviceWorker.ready;

            const token = await getToken(messaging, {
                serviceWorkerRegistration: reg,
                vapidKey: this.VAPID_KEY
            });

            if (token) {
                const user = auth.currentUser;
                const stableId = token.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '_');

                // Update Firestore global subscriber registry
                await setDoc(doc(db, "main_site_subscribers", stableId), {
                    fcmToken: token,
                    uid: user ? user.uid : null,
                    platform: navigator.platform,
                    browser: this.getBrowserName(),
                    lastActiveAt: serverTimestamp(),
                    status: 'active'
                }, { merge: true });

                console.log("[PUSH] Device Registered Successfully:", stableId);

                // Dispatch "Welcome" test notification to confirm reliability
                const idToken = await user.getIdToken();
                const response = await fetch('/.netlify/functions/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + idToken
                    },
                    body: JSON.stringify({
                        targetToken: token,
                        welcomeTitle: 'CODEZ48: System Connected',
                        welcomeBody: 'Push alerts are now enabled for this device. Laptop & Mobile synchronization active.'
                    })
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    // Self-healing for NotRegistered error
                    if (error.code === 'messaging/registration-token-not-registered' || error.error?.includes('NotRegistered')) {
                        console.warn("[PUSH] Stale token detected. Clearing and retrying...");
                        await deleteToken(messaging);
                        await deleteDoc(doc(db, "main_site_subscribers", stableId));
                        setTimeout(() => this.registerToken(), 3000);
                    }
                }
            }
        } catch (e) {
            console.error("[PUSH] Token Error:", e.message);
        }
    },

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Browser";
    }
};

PushNotificationSystem.init();
