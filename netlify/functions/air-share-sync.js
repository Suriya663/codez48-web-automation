const admin = require('firebase-admin');

let isInitialized = false;
let db = null;

const initAdmin = () => {
    if (isInitialized && db) return true;
    try {
        const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
        let serviceAccount = null;

        if (saVar) {
            try {
                let rawData = saVar.trim();
                if ((rawData.startsWith('"') && rawData.endsWith('"')) || (rawData.startsWith("'") && rawData.endsWith("'"))) {
                    rawData = rawData.substring(1, rawData.length - 1);
                }
                serviceAccount = JSON.parse(rawData);
            } catch (_) {}
        }

        if (serviceAccount && serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            if (admin.apps.length === 0) {
                admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            }
            db = admin.firestore();
            isInitialized = true;
            return true;
        }

        if (admin.apps.length === 0) {
            admin.initializeApp();
        }
        db = admin.firestore();
        isInitialized = true;
        return true;
    } catch (e) {
        console.error('Firebase Admin Init Failure in air-share-sync:', e.message);
        return false;
    }
};

const jsonResponse = (statusCode, data) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-device-id",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
    },
    body: JSON.stringify(data)
});

// Haversine formula to compute distance between two GPS coordinates in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
    const R = 6371e3; // Earth radius in meters
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

// In-memory memory fallback cache in case Firebase Firestore is temporarily unreachable
const MEMORY_BEACONS = new Map();

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, x-device-id",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
            }
        };
    }

    if (event.httpMethod !== "POST") {
        return jsonResponse(405, { success: false, error: "Method Not Allowed" });
    }

    initAdmin();

    try {
        const body = JSON.parse(event.body || '{}');
        const { action, beaconId, senderEmail, receiverEmail, lat, lng, gyro, chatData } = body;

        // Clean up expired in-memory beacons (> 3 minutes)
        const now = Date.now();
        for (const [id, b] of MEMORY_BEACONS.entries()) {
            if (now - b.createdAt > 180000) {
                MEMORY_BEACONS.delete(id);
            }
        }

        // 1. BROADCAST_BEACON: Sender creates a discovery beacon
        if (action === 'BROADCAST_BEACON') {
            const id = beaconId || `AIR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            const beaconDoc = {
                beaconId: id,
                senderEmail: senderEmail || 'pilot.user@codez48.com',
                lat: typeof lat === 'number' ? lat : null,
                lng: typeof lng === 'number' ? lng : null,
                gyro: gyro || { alpha: 0, beta: 0, gamma: 0 },
                chatData: chatData || null,
                status: 'WAITING_BUMP',
                createdAt: now,
                expiresAt: now + 180000 // 3 minutes
            };

            MEMORY_BEACONS.set(id, beaconDoc);

            if (db) {
                try {
                    await db.collection('air_share_beacons').doc(id).set(beaconDoc);
                } catch (e) {
                    console.warn('[AIR-SHARE] Firestore set beacon fallback:', e.message);
                }
            }

            return jsonResponse(200, {
                success: true,
                beaconId: id,
                message: 'Air Share Beacon active. Ready for phone bump & proximity sync.'
            });
        }

        // 2. SCAN_NEARBY: Receiver checks for beacons in physical proximity
        if (action === 'SCAN_NEARBY') {
            const matches = [];

            // Read from Firestore if available
            if (db) {
                try {
                    const snap = await db.collection('air_share_beacons')
                        .where('status', '==', 'WAITING_BUMP')
                        .where('createdAt', '>=', now - 180000)
                        .limit(10)
                        .get();

                    snap.forEach(doc => {
                        const b = doc.data();
                        const dist = calculateDistanceMeters(lat, lng, b.lat, b.lng);
                        matches.push({
                            beaconId: b.beaconId,
                            senderEmail: b.senderEmail,
                            distanceMeters: dist,
                            gyro: b.gyro,
                            hasChat: Boolean(b.chatData),
                            chatTitle: b.chatData && b.chatData.title ? b.chatData.title : 'Shared Chat Session',
                            messageCount: b.chatData && b.chatData.messages ? b.chatData.messages.length : 0,
                            createdAt: b.createdAt
                        });
                    });
                } catch (e) {
                    console.warn('[AIR-SHARE] Firestore query failed, falling back to memory:', e.message);
                }
            }

            // Fallback / merge with memory store
            if (matches.length === 0) {
                for (const [id, b] of MEMORY_BEACONS.entries()) {
                    if (b.status === 'WAITING_BUMP' && (now - b.createdAt <= 180000)) {
                        const dist = calculateDistanceMeters(lat, lng, b.lat, b.lng);
                        matches.push({
                            beaconId: b.beaconId,
                            senderEmail: b.senderEmail,
                            distanceMeters: dist,
                            gyro: b.gyro,
                            hasChat: Boolean(b.chatData),
                            chatTitle: b.chatData && b.chatData.title ? b.chatData.title : 'Shared Chat Session',
                            messageCount: b.chatData && b.chatData.messages ? b.chatData.messages.length : 0,
                            createdAt: b.createdAt
                        });
                    }
                }
            }

            // Sort by proximity (closest device first)
            matches.sort((a, b) => a.distanceMeters - b.distanceMeters);

            return jsonResponse(200, {
                success: true,
                beacons: matches,
                count: matches.length
            });
        }

        // 3. CLAIM_BEACON: Receiver claims and downloads the chat
        if (action === 'CLAIM_BEACON') {
            if (!beaconId) {
                return jsonResponse(400, { success: false, error: 'beaconId required.' });
            }

            let found = MEMORY_BEACONS.get(beaconId);

            if (!found && db) {
                try {
                    const doc = await db.collection('air_share_beacons').doc(beaconId).get();
                    if (doc.exists) {
                        found = doc.data();
                    }
                } catch (e) {
                    console.warn('[AIR-SHARE] Firestore claim error:', e.message);
                }
            }

            if (!found || !found.chatData) {
                return jsonResponse(404, { success: false, error: 'Beacon not found or transfer expired.' });
            }

            // Mark as claimed
            found.status = 'TRANSFERRED';
            found.claimedBy = receiverEmail || 'receiver@codez48.com';
            MEMORY_BEACONS.set(beaconId, found);

            if (db) {
                try {
                    await db.collection('air_share_beacons').doc(beaconId).update({
                        status: 'TRANSFERRED',
                        claimedBy: receiverEmail || 'receiver@codez48.com',
                        claimedAt: now
                    });
                } catch (_) {}
            }

            return jsonResponse(200, {
                success: true,
                chatData: found.chatData,
                senderEmail: found.senderEmail,
                beaconId: found.beaconId
            });
        }

        // 4. CANCEL_BEACON
        if (action === 'CANCEL_BEACON') {
            if (beaconId) {
                MEMORY_BEACONS.delete(beaconId);
                if (db) {
                    try {
                        await db.collection('air_share_beacons').doc(beaconId).delete();
                    } catch (_) {}
                }
            }
            return jsonResponse(200, { success: true });
        }

        return jsonResponse(400, { success: false, error: 'Invalid action.' });

    } catch (err) {
        console.error('[AIR-SHARE] Error:', err.message);
        return jsonResponse(500, { success: false, error: err.message });
    }
};
