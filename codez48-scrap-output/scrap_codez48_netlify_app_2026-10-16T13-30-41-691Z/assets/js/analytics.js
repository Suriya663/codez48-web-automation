import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

/**
 * Get or create unique visitor ID
 */
const getVisitorId = () => {
    let id = localStorage.getItem('codez48_visitor_id');
    if (!id) {
        id = 'VIS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('codez48_visitor_id', id);
    }
    return id;
};

/**
 * Track a custom event
 */
export const trackEvent = async (eventName, metadata = {}) => {
    try {
        const visitorId = getVisitorId();
        const lang = localStorage.getItem('codez48_lang') || 'en';
        const userId = window.currentUser ? window.currentUser.uid : null;

        const eventData = {
            eventName,
            visitorId,
            userId,
            language: lang,
            page: window.location.hash || 'landing',
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,
            ...metadata
        };

        await addDoc(collection(db, "analytics_events"), eventData);
        console.log(`[Analytics] Tracked: ${eventName}`, metadata);

        // Also update conversion stats if applicable
        updateFunnelStat(eventName);
    } catch (e) {
        console.error("[Analytics] Error tracking event:", e);
    }
};

/**
 * Helper to update aggregate funnel stats for the admin dashboard
 */
const updateFunnelStat = async (eventName) => {
    const funnelEvents = [
        'landing_page_visit',
        'onboarding_started',
        'onboarding_completed',
        'cta_create_clicked',
        'registration_started',
        'registration_completed',
        'profile_created',
        'checkout_started',
        'payment_completed'
    ];

    if (funnelEvents.includes(eventName)) {
        const statsRef = doc(db, "analytics_summary", "funnel");
        await setDoc(statsRef, {
            [eventName]: increment(1),
            lastUpdated: serverTimestamp()
        }, { merge: true });
    }
};

/**
 * Track unique visitor
 */
export const trackVisitor = async () => {
    const visitorId = getVisitorId();
    const lastVisit = localStorage.getItem('codez48_last_visit');
    const today = new Date().toISOString().split('T')[0];

    if (lastVisit !== today) {
        localStorage.setItem('codez48_last_visit', today);

        // Track as event
        await trackEvent('landing_page_visit');

        // Update unique visitor count in summary
        const summaryRef = doc(db, "analytics_summary", "visitors");
        await setDoc(summaryRef, {
            totalVisits: increment(1),
            uniqueVisitors: lastVisit ? increment(0) : increment(1),
            lastUpdated: serverTimestamp()
        }, { merge: true });
    }
};

// Global Exposure
window.trackEvent = trackEvent;
window.trackVisitor = trackVisitor;
