import { db, auth, messaging } from './firebase-config.js';
import { getToken } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * CODEZ48 Push Notification System
 * Manages permission requests, token collection, and secure storage for index.html
 */
export const PushNotificationSystem = {
    VAPID_KEY: "BH-uH8T9_H67_ZJm3W-v8_u7-8-8-8-8-8-8-8-8", // VAPID key would normally go here

    async init() {
        if (!("Notification" in window)) {
            console.warn("[PUSH] Notifications not supported by this browser.");
            return;
        }

        if (Notification.permission === "granted") {
            this.registerToken();
            return;
        }

        if (Notification.permission === "default" && !localStorage.getItem('c48_push_dismissed')) {
            setTimeout(() => this.showPermissionPrompt(), 5000);
        }
    },

    showPermissionPrompt() {
        const prompt = document.createElement('div');
        prompt.id = 'push-permission-bar';
        prompt.className = 'fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[380px] bg-white border border-black shadow-2xl rounded-2xl p-6 z-[200] animate-in slide-in-from-bottom-8 duration-500';
        prompt.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-bell-on text-xl"></i>
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-black text-black uppercase tracking-tight">Stay Connected</h4>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">Enable push notifications to receive real-time business alerts and platform updates.</p>
                    <div class="flex gap-3 mt-4">
                        <button id="btn-push-allow" class="flex-1 bg-black text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition">Allow</button>
                        <button id="btn-push-later" class="flex-1 bg-white text-slate-400 border border-slate-200 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition">Later</button>
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
            console.error("[PUSH] Permission Request Error:", e);
        }
    },

    async registerToken() {
        if (!messaging) return;
        try {
            const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

            // Wait for service worker to be active to avoid "no active Service Worker" error
            await navigator.serviceWorker.ready;

            const token = await getToken(messaging, { serviceWorkerRegistration: reg });

            if (token) {
                const user = auth.currentUser;
                const subscriberId = user ? user.uid : ('ANON_' + token.substring(0, 10));

                await setDoc(doc(db, "main_site_subscribers", token.substring(0, 20)), {
                    fcmToken: token,
                    uid: user ? user.uid : null,
                    platform: navigator.platform,
                    browser: this.getBrowserName(),
                    subscribedAt: serverTimestamp(),
                    lastActiveAt: serverTimestamp(),
                    status: 'active'
                }, { merge: true });

                console.log("[PUSH] Token Registered Successfully.");

                // Optional: Dispatch welcome notification
                const idToken = user ? await user.getIdToken() : null;
                const headers = { 'Content-Type': 'application/json' };
                if (idToken) headers['Authorization'] = 'Bearer ' + idToken;

                fetch('/.netlify/functions/send-notification', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        targetToken: token,
                        welcomeTitle: 'CODEZ48 Notifications Enabled!',
                        welcomeBody: 'You will now receive real-time business signals and updates.'
                    })
                }).catch(() => {});
            }
        } catch (e) {
            console.error("[PUSH] Token Registration Error:", e.message);
        }
    },

    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Generic Browser";
    }
};

PushNotificationSystem.init();
