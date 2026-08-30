/**
 * CODEZ48 Website Tracker - Service Worker V2.6
 * Handles background push notifications and click events.
 */

importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBJK-7By6I9xps518HCYc2Kow44vp9fDpY",
    authDomain: "nshandlooms-a19be.firebaseapp.com",
    projectId: "nshandlooms-a19be",
    messagingSenderId: "711669261779",
    appId: "1:711669261779:web:d323a1e50b5404ec10fb26"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[CODEZ48 SW] Background Message:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.data?.image || '/img/logo.png',
        data: {
            url: payload.data?.url || '/',
            campaignId: payload.data?.campaignId,
            siteId: payload.data?.siteId
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
