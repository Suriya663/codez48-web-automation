/**
 * CODEZ48 FIREBASE SYNCHRONIZER
 *
 * Connects Codez48 Pilot to Firebase Firestore using FIREBASE_SERVICE_ACCOUNT.
 * - Stores & tracks the seller's profile, unique user identifier, credit balance,
 *   active subscription plan, plan switches, and complete purchase history.
 * - Systematic Firestore schema:
 *     - pilot_users/{userId}: Core identity, live credit balance, current plan.
 *     - seller_profiles/{userId}: Comprehensive seller profile & plan tier.
 *     - pilot_transactions/{txId}: Granular credit deduction & payment history.
 * - Resilient offline fallback: never blocks execution if network is temporarily offline.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class FirebaseSync {
    constructor() {
        this.db = null;
        this.initialized = false;
        this._initPromise = null;
        this._spinnerInterval = null;
    }

    startSpinner(message = 'Syncing account database...') {
        if (!process.stdout.isTTY) return;
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;
        process.stdout.write(`\x1b[?25l`); // Hide cursor
        this._spinnerInterval = setInterval(() => {
            process.stdout.write(`\r\x1b[36m${frames[i++ % frames.length]}\x1b[0m \x1b[90m${message}\x1b[0m`);
        }, 80);
    }

    stopSpinner() {
        if (this._spinnerInterval) {
            clearInterval(this._spinnerInterval);
            this._spinnerInterval = null;
            if (process.stdout.isTTY) {
                process.stdout.write(`\r\x1b[K\x1b[?25h`); // Clear line and restore cursor
            }
        }
    }

    async init(options = {}) {
        if (this.initialized) return this.db;
        if (this._initPromise) return this._initPromise;

        const showLoading = options.showLoading !== false && process.stdout.isTTY;
        if (showLoading) {
            this.startSpinner('Loading database credentials...');
        }

        this._initPromise = (async () => {
            try {
                // Check FIREBASE_SERVICE_ACCOUNT from process.env or fallback to Desktop/web/.env
                let saString = process.env.FIREBASE_SERVICE_ACCOUNT;
                if (!saString) {
                    const fallbackEnvPath = 'C:/Users/suriya prakash/OneDrive/Desktop/web/.env';
                    if (fs.existsSync(fallbackEnvPath)) {
                        const content = fs.readFileSync(fallbackEnvPath, 'utf8');
                        const m = content.match(/FIREBASE_SERVICE_ACCOUNT='([\s\S]*?)'/);
                        if (m) saString = m[1];
                    }
                }

                if (!saString) {
                    this.stopSpinner();
                    logger.debug(`[FIREBASE NOTICE] No FIREBASE_SERVICE_ACCOUNT found.`);
                    return null;
                }

                let serviceAccount = null;
                try {
                    serviceAccount = typeof saString === 'object' ? saString : JSON.parse(saString.trim());
                    if (serviceAccount.private_key) {
                        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                    }
                } catch (pe) {
                    this.stopSpinner();
                    logger.error(`[FIREBASE CONFIG ERROR] Failed to parse service account JSON: ${pe.message}`);
                    return null;
                }

                let initializeApp, cert, getApps, getFirestore;
                try {
                    const appModule = require('firebase-admin/app');
                    const fsModule = require('firebase-admin/firestore');
                    initializeApp = appModule.initializeApp;
                    cert = appModule.cert;
                    getApps = appModule.getApps;
                    getFirestore = fsModule.getFirestore;
                } catch (_) {
                    try {
                        const appModule = require('C:/Users/suriya prakash/OneDrive/Desktop/web/functions/node_modules/firebase-admin/app');
                        const fsModule = require('C:/Users/suriya prakash/OneDrive/Desktop/web/functions/node_modules/firebase-admin/firestore');
                        initializeApp = appModule.initializeApp;
                        cert = appModule.cert;
                        getApps = appModule.getApps;
                        getFirestore = fsModule.getFirestore;
                    } catch (modErr) {
                        this.stopSpinner();
                        logger.debug(`[FIREBASE NOTICE] firebase-admin/app module unavailable: ${modErr.message}`);
                        return null;
                    }
                }

                if (getApps().length === 0) {
                    initializeApp({
                        credential: cert(serviceAccount),
                        projectId: serviceAccount.project_id || 'nshandlooms-a19be'
                    });
                }

                this.db = getFirestore();
                this.initialized = true;
                this.stopSpinner();
                logger.debug(`[FIREBASE SYNC] Connected to Firebase Project: ${serviceAccount.project_id}`);
                return this.db;
            } catch (err) {
                this.stopSpinner();
                logger.debug(`[FIREBASE INIT WARNING] ${err.message}`);
                return null;
            }
        })();

        return this._initPromise;
    }

    /**
     * Synchronize local credit vault data to Firestore
     */
    async syncVault(vaultData) {
        if (!vaultData || !vaultData.userId) return false;

        const db = await this.init();
        if (!db) return false;

        try {
            const uid = vaultData.userId;
            const now = new Date().toISOString();

            // 1. Sync to pilot_users collection with remote-protection
            const userRef = db.collection('pilot_users').doc(uid);
            let finalBalance = vaultData.creditBalance;
            let finalPlan = vaultData.plan || 'TRIAL_FREE';
            let finalPlanName = vaultData.planName || 'Trial Free Plan';
            let finalPlanActivatedAt = vaultData.planActivatedAt || now;

            try {
                const existingSnap = await userRef.get();
                if (existingSnap.exists) {
                    const remote = existingSnap.data();
                    
                    // Remote balance only overrides local if an external online payment or web coupon occurred after last sync
                    const remoteHasNewerPayment = (remote.lastPaymentAt && new Date(remote.lastPaymentAt) > new Date(vaultData.lastSyncAt || 0));
                    const remoteHasNewerCoupon = (remote.lastCouponAt && new Date(remote.lastCouponAt) > new Date(vaultData.lastSyncAt || 0));
                    
                    if ((remoteHasNewerPayment || remoteHasNewerCoupon) && typeof remote.creditBalance === 'number' && remote.creditBalance > finalBalance) {
                        finalBalance = remote.creditBalance;
                    }

                    // Remote plan upgrade takes precedence if assigned by admin or purchased online
                    if (remote.plan && remote.plan !== 'TRIAL_FREE' && (finalPlan === 'TRIAL_FREE' || remote.bypassPayment || (remote.updatedAt && new Date(remote.updatedAt) > new Date(vaultData.lastSyncAt || 0)))) {
                        finalPlan = remote.plan;
                        finalPlanName = remote.planName || finalPlanName;
                        finalPlanActivatedAt = remote.planActivatedAt || finalPlanActivatedAt;
                    }

                    // Update local vault if remote had a newer payment or plan upgrade
                    if (finalBalance !== vaultData.creditBalance || finalPlan !== vaultData.plan) {
                        try {
                            const creditVault = require('./credit-vault');
                            if (typeof creditVault.updateLocalFromRemote === 'function') {
                                creditVault.updateLocalFromRemote({
                                    creditBalance: finalBalance,
                                    plan: finalPlan,
                                    planName: finalPlanName,
                                    planActivatedAt: finalPlanActivatedAt
                                });
                            }
                        } catch (_) {}
                    }
                }
            } catch (readErr) {
                logger.debug(`[SYNC WARNING] Failed to read remote before set: ${readErr.message}`);
            }

            await userRef.set({
                userId: uid,
                email: vaultData.email || 'rajnaga75556@gmail.com',
                creditBalance: finalBalance,
                plan: finalPlan,
                planName: finalPlanName,
                planActivatedAt: finalPlanActivatedAt,
                totalCreditsUsed: vaultData.totalCreditsUsed || 0,
                totalPptCreated: vaultData.totalPptCreated || 0,
                totalDocsCreated: vaultData.totalDocsCreated || 0,
                lastSyncAt: now,
                systemPlatform: process.platform,
                updatedAt: now
            }, { merge: true });

            // 2. Sync to seller_profiles collection for complete purchase & plan tracking
            const sellerRef = db.collection('seller_profiles').doc(uid);
            await sellerRef.set({
                sellerId: uid,
                userKey: uid,
                email: vaultData.email || 'rajnaga75556@gmail.com',
                currentCredits: vaultData.creditBalance,
                activePlan: vaultData.plan || 'TRIAL_FREE',
                activePlanName: vaultData.planName || 'Trial Free Plan',
                purchasedPlans: vaultData.purchasedPlans || [],
                lastActivity: now
            }, { merge: true });

            // 3. Sync latest transaction entry if present
            if (Array.isArray(vaultData.history) && vaultData.history.length > 0) {
                const latestTx = vaultData.history[vaultData.history.length - 1];
                if (latestTx && latestTx.id) {
                    await db.collection('pilot_transactions').doc(latestTx.id).set({
                        ...latestTx,
                        userId: uid,
                        recordedAt: now
                    }, { merge: true });
                }
            }

            logger.status(`\x1b[32m[FIREBASE SYNC] Remote state synchronized for ${uid} (Balance: ${vaultData.creditBalance}, Plan: ${vaultData.plan})\x1b[0m`);
            return true;
        } catch (syncErr) {
            logger.debug(`[FIREBASE SYNC WARNING] ${syncErr.message}`);
            return false;
        }
    }

    /**
     * Retrieve remote user record from Firestore
     */
    async getUserRecord(userId) {
        const db = await this.init();
        if (!db || !userId) return null;

        try {
            const snap = await db.collection('pilot_users').doc(userId).get();
            if (snap.exists) return snap.data();
        } catch (e) {
            logger.debug(`[FIREBASE GET USER WARNING] ${e.message}`);
        }
        return null;
    }
}

module.exports = new FirebaseSync();
