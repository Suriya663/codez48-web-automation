/**
 * CODEZ48 COUPON & VOUCHER MANAGER
 *
 * Cloud-synchronized coupon validation, generation, and redemption engine.
 * - Stores & verifies coupons directly in Firebase Firestore collection `coupons`.
 * - Supports two distinct coupon models:
 *     1. FREE_CREDITS: Directly adds credits to user's account and updates vault.
 *     2. DISCOUNT: Provides percentage or flat ₹ discount on subscription plans.
 * - Enforces strict usage limits: rejects expired/exhausted coupons once limit is reached.
 * - Prevents multiple redemptions by the same user identifier.
 */

'use strict';

const firebaseSync = require('./firebase-sync');
const creditVault = require('./credit-vault');
const logger = require('./logger');

class CouponManager {
    constructor() {
        this.collectionName = 'coupons';
    }

    /**
     * Get Firestore DB instance
     */
    async _getDb() {
        return await firebaseSync.init();
    }

    /**
     * Clean and normalize coupon code string
     */
    normalizeCode(rawCode) {
        if (!rawCode) return '';
        return String(rawCode)
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
    }

    /**
     * Create a new coupon in Firestore (Admin / Secret Website function)
     * @param {Object} couponData
     * @param {string} couponData.code - Coupon code (e.g. 'CODEZ50', 'FREE100')
     * @param {'FREE_CREDITS'|'DISCOUNT_PERCENT'|'DISCOUNT_FLAT'} couponData.type - Benefit type
     * @param {number} couponData.value - Number of credits or discount amount/percent
     * @param {number} [couponData.usageLimit=1] - Maximum number of redemptions allowed
     * @param {string} [couponData.description=''] - Optional campaign note
     * @param {string} [couponData.expiryDate=null] - Optional ISO expiry date string
     */
    async createCoupon(couponData) {
        const db = await this._getDb();
        if (!db) {
            return { success: false, error: 'Database unavailable. Check Firebase credentials.' };
        }

        const code = this.normalizeCode(couponData.code);
        if (!code || code.length < 3) {
            return { success: false, error: 'Coupon code must be at least 3 characters.' };
        }

        const type = couponData.type || 'FREE_CREDITS';
        const value = Number(couponData.value) || 0;
        if (value <= 0) {
            return { success: false, error: 'Coupon value must be greater than 0.' };
        }

        const usageLimit = Math.max(1, Number(couponData.usageLimit) || 1);
        const now = new Date().toISOString();

        const docRef = db.collection(this.collectionName).doc(code);
        const existing = await docRef.get();

        const payload = {
            code,
            type, // 'FREE_CREDITS' | 'DISCOUNT_PERCENT' | 'DISCOUNT_FLAT'
            value,
            usageLimit,
            timesUsed: existing.exists ? (existing.data().timesUsed || 0) : 0,
            status: 'ACTIVE',
            description: couponData.description || (type === 'FREE_CREDITS' ? `Grant ${value} free credits` : `Grant discount`),
            expiryDate: couponData.expiryDate || null,
            createdAt: existing.exists ? (existing.data().createdAt || now) : now,
            updatedAt: now,
            usedBy: existing.exists ? (existing.data().usedBy || {}) : {}
        };

        await docRef.set(payload, { merge: true });
        logger.status(`\x1b[32m[COUPON] Created coupon "${code}" (${type}: ${value}, Limit: ${usageLimit})\x1b[0m`);

        return { success: true, coupon: payload };
    }

    /**
     * Get coupon metadata from Firestore
     */
    async getCoupon(rawCode) {
        const db = await this._getDb();
        if (!db) return null;

        const code = this.normalizeCode(rawCode);
        if (!code) return null;

        try {
            const snap = await db.collection(this.collectionName).doc(code).get();
            if (snap.exists) {
                return snap.data();
            }
        } catch (e) {
            logger.debug(`[COUPON LOOKUP ERROR] ${e.message}`);
        }
        return null;
    }

    /**
     * List all coupons (for Admin portal)
     */
    async listCoupons() {
        const db = await this._getDb();
        if (!db) return [];

        try {
            const snap = await db.collection(this.collectionName).orderBy('createdAt', 'desc').get();
            const list = [];
            snap.forEach(doc => list.push(doc.data()));
            return list;
        } catch (e) {
            logger.debug(`[COUPON LIST ERROR] ${e.message}`);
            return [];
        }
    }

    /**
     * Delete a coupon
     */
    async deleteCoupon(rawCode) {
        const db = await this._getDb();
        if (!db) return false;

        const code = this.normalizeCode(rawCode);
        if (!code) return false;

        try {
            await db.collection(this.collectionName).doc(code).delete();
            return true;
        } catch (e) {
            logger.debug(`[COUPON DELETE ERROR] ${e.message}`);
            return false;
        }
    }

    /**
     * Verify and redeem a coupon for a user
     * @param {string} rawCode - Coupon code entered by user
     * @param {string} [userId] - Optional user ID (defaults to current machine UID)
     */
    async verifyAndRedeemCoupon(rawCode, userId = null) {
        const code = this.normalizeCode(rawCode);
        if (!code) {
            return {
                success: false,
                reason: 'EMPTY_CODE',
                message: 'No coupon code provided. Please enter a valid coupon code.'
            };
        }

        const uid = userId || creditVault.getUserIdentifier();
        const db = await this._getDb();

        if (!db) {
            return {
                success: false,
                reason: 'OFFLINE',
                message: 'Coupon service is currently offline. Please check your internet connection and try again.'
            };
        }

        try {
            const docRef = db.collection(this.collectionName).doc(code);
            const snap = await docRef.get();

            if (!snap.exists) {
                return {
                    success: false,
                    reason: 'INVALID',
                    message: `Coupon "${code}" is invalid. Please verify the code and try again.`
                };
            }

            const coupon = snap.data();

            const timesUsed = Number(coupon.timesUsed || 0);
            const usageLimit = Number(coupon.usageLimit || 1);

            // Check usage limit & expiration
            if (timesUsed >= usageLimit || coupon.status === 'EXPIRED') {
                if (coupon.status !== 'EXPIRED') {
                    await docRef.update({ status: 'EXPIRED' }).catch(() => {});
                }
                return {
                    success: false,
                    reason: 'LIMIT_EXCEEDED',
                    message: `Coupon "${code}" has reached its maximum usage limit (${usageLimit}/${usageLimit}) and has expired.`
                };
            }

            // Check if status is active
            if (coupon.status && coupon.status !== 'ACTIVE') {
                return {
                    success: false,
                    reason: 'INACTIVE',
                    message: `Coupon "${code}" is no longer active.`
                };
            }

            // Check if this specific user already redeemed it
            const usedBy = coupon.usedBy || {};
            if (usedBy[uid]) {
                return {
                    success: false,
                    reason: 'ALREADY_REDEEMED',
                    message: `You have already redeemed coupon "${code}". This coupon is limited to 1 redemption per account.`
                };
            }

            // Process based on type
            const now = new Date().toISOString();
            const newTimesUsed = timesUsed + 1;
            const isNowExhausted = newTimesUsed >= usageLimit;

            if (coupon.type === 'FREE_CREDITS') {
                const creditsToAdd = Number(coupon.value) || 0;

                // Add credits to local vault without overriding active plan
                const addResult = creditVault.grantFreeCredits(creditsToAdd, `COUPON_${code}`);

                // Update coupon document in Firestore
                await docRef.update({
                    timesUsed: newTimesUsed,
                    status: isNowExhausted ? 'EXPIRED' : 'ACTIVE',
                    updatedAt: now,
                    [`usedBy.${uid}`]: {
                        redeemedAt: now,
                        creditsGranted: creditsToAdd
                    }
                });

                // Sync vault to Firestore user profile
                creditVault.triggerFirebaseSync();

                return {
                    success: true,
                    type: 'FREE_CREDITS',
                    code,
                    creditsAdded: creditsToAdd,
                    newBalance: addResult.newBalance,
                    message: `🎉 Coupon "${code}" successfully redeemed! +${creditsToAdd} Free Credits added to your account. Your new balance is ${addResult.newBalance} credits.`
                };
            }

            if (coupon.type === 'DISCOUNT_PERCENT' || coupon.type === 'DISCOUNT_FLAT') {
                const discountDisplay = coupon.type === 'DISCOUNT_PERCENT'
                    ? `${coupon.value}% OFF`
                    : `₹${coupon.value} FLAT DISCOUNT`;

                // Apply coupon to active order in credit vault (stores discounted pricing in local metadata)
                const activeOrder = creditVault.applyCouponToOrder(coupon);

                const paymentUrl = `https://codez48.netlify.app/tools/payment.html?coupon=${encodeURIComponent(code)}&uid=${encodeURIComponent(uid)}`;

                return {
                    success: true,
                    type: coupon.type,
                    code,
                    discountValue: coupon.value,
                    discountDisplay,
                    paymentUrl,
                    discountedPrices: activeOrder.discountedPrices,
                    message: `🎉 Coupon "${code}" verified & applied to your order! (${discountDisplay} on Codez48 plans)`
                };
            }

            return {
                success: false,
                reason: 'UNKNOWN_TYPE',
                message: `Unknown coupon type for "${code}".`
            };

        } catch (err) {
            logger.error(`[COUPON REDEEM ERROR] ${err.message}`);
            return {
                success: false,
                reason: 'SERVER_ERROR',
                message: `Failed to process coupon: ${err.message}`
            };
        }
    }
}

module.exports = new CouponManager();
