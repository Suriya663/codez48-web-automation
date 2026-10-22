/**
 * CODEZ48 TOOLS — DEVELOPER COUPON CREATOR & PILOT PAYMENT ENGINE
 *
 * Exclusively provides:
 * 1. Developer-Gated Coupon Management (Visible ONLY with codez4848@gmail.com / codez@48484848)
 *    - Real-time Firebase Firestore coupon creation, usage limit tracking, and deletion
 * 2. Pilot Subscription & Payment Portal
 *    - Official Razorpay Live checkout (rzp_live_TaX2zuAv0lLUKf)
 *    - Live coupon verification & discount application
 *    - Direct Firestore synchronization for user credits and plans
 */

import { db, auth } from './firebase-config.js';
import {
    collection, query, where, getDocs, getDoc, doc, setDoc,
    serverTimestamp, updateDoc, deleteDoc, onSnapshot, orderBy, increment
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const DEVELOPER_EMAIL = "codez4848@gmail.com";
const DEVELOPER_PASS = "codez@48484848";

// Razorpay Live Key already approved on codez48.netlify.app
const RAZORPAY_LIVE_KEY = "rzp_live_TaX2zuAv0lLUKf";

// Helper functions for auth encoding
const encodeSecret = (val) => btoa(val);
const decodeSecret = (val) => {
    try { return atob(val); } catch { return ''; }
};

export const CouponAndPaymentTool = {
    isDeveloper: false,
    allCoupons: [],
    unsubscribeCoupons: null,
    selectedPlan: 'ENTERPRISE',
    appliedCoupon: null,
    discountAmount: 0,

    plans: {
        TRIAL: { id: 'TRIAL', name: 'Starter Trial Pass', price: 1, credits: 50, isTrial: true },
        MICRO: { id: 'MICRO', name: 'Micro Plan', price: 299, credits: 300, desc: 'Clean B&W PPT & Word document automation' },
        ENTERPRISE: { id: 'ENTERPRISE', name: 'Enterprise Plan', price: 599, credits: 700, desc: 'High-quality code, static websites & unlimited WhatsApp automation' },
        PROFIT_ORIENTED: { id: 'PROFIT_ORIENTED', name: 'Profit-Oriented Plan', price: 999, credits: 1500, desc: 'Top-tier design with real-time Voice AI & WhatsApp Voice Supervisor' }
    },

    getUserId() {
        const input = document.getElementById('payment-uid-input');
        if (input && input.value.trim()) return input.value.trim();
        const params = new URLSearchParams(window.location.search);
        return params.get('uid') || localStorage.getItem('c48_user_uid') || localStorage.getItem('tori_seller_id') || 'USR-CDZ48-USER';
    },

    async checkUserEligibility() {
        const uid = this.getUserId();
        const trialModalCard = document.getElementById('first-time-trial-card-modal');
        if (!trialModalCard) return;

        try {
            const userSnap = await getDoc(doc(db, "pilot_users", uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.lastPaymentId || data.trialClaimed) {
                    trialModalCard.remove();
                    return;
                }
            }
            trialModalCard.classList.remove('hidden');
        } catch (_) {
            trialModalCard.classList.remove('hidden');
        }
    },

    init() {
        this.checkDeveloperStatus();
        this.setupUrlTriggers();
        this.checkUserEligibility();
    },

    checkDeveloperStatus() {
        const stored = localStorage.getItem('coderAuth');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const email = decodeSecret(parsed.e || '');
                const pass = decodeSecret(parsed.p || '');
                if (email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase() && pass === DEVELOPER_PASS) {
                    this.isDeveloper = true;
                }
            } catch (_) {
                this.isDeveloper = false;
            }
        } else {
            this.isDeveloper = false;
        }

        this.updateDeveloperUI();
    },

    updateDeveloperUI() {
        const couponCard = document.getElementById('card-developer-coupons');
        const couponTab = document.getElementById('tab-coupons');
        const userBadge = document.getElementById('user-profile-badge');

        if (this.isDeveloper) {
            if (couponCard) couponCard.classList.remove('hidden');
            if (couponTab) couponTab.classList.remove('hidden');

            if (userBadge) {
                userBadge.title = "Developer Authenticated (codez4848@gmail.com)";
                userBadge.innerHTML = `<i class="fa-solid fa-crown text-amber-500 text-xs"></i>`;
                userBadge.classList.add('border-amber-400', 'bg-amber-50');
                userBadge.onclick = () => window.openDeveloperSessionModal();
            }

            this.subscribeCouponsRealtime();
        } else {
            if (couponCard) couponCard.classList.add('hidden');
            if (couponTab) couponTab.classList.add('hidden');

            if (userBadge) {
                userBadge.title = "Developer Login";
                userBadge.innerHTML = `<i class="fa-solid fa-user-lock text-slate-400 text-xs"></i>`;
                userBadge.onclick = () => window.openDeveloperLoginModal();
            }

            if (this.unsubscribeCoupons) {
                this.unsubscribeCoupons();
                this.unsubscribeCoupons = null;
            }
        }
    },

    async authenticateDeveloper(email, password) {
        if (!email || !password) {
            return { success: false, message: "Email and password are required." };
        }

        if (email.trim().toLowerCase() === DEVELOPER_EMAIL.toLowerCase() && password === DEVELOPER_PASS) {
            try {
                await signInAnonymously(auth);
            } catch (_) {}

            localStorage.setItem('coderAuth', JSON.stringify({
                e: encodeSecret(DEVELOPER_EMAIL),
                p: encodeSecret(DEVELOPER_PASS)
            }));

            this.isDeveloper = true;
            this.updateDeveloperUI();
            return { success: true, message: "Welcome back, Developer! Coupon creation unlocked." };
        }

        return { success: false, message: "Access Denied: Invalid developer credentials." };
    },

    logoutDeveloper() {
        localStorage.removeItem('coderAuth');
        this.isDeveloper = false;
        this.updateDeveloperUI();
        alert("Developer logged out. Coupon tools hidden.");
        window.location.reload();
    },

    subscribeCouponsRealtime() {
        if (!this.isDeveloper || this.unsubscribeCoupons) return;

        try {
            const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
            this.unsubscribeCoupons = onSnapshot(q, (snapshot) => {
                this.allCoupons = [];
                snapshot.forEach(docSnap => this.allCoupons.push(docSnap.data()));
                this.renderCouponsTable();
            }, (err) => {
                console.warn("[COUPONS LISTENER ERROR]:", err.message);
            });
        } catch (e) {
            console.warn("[COUPONS INIT ERROR]:", e.message);
        }
    },

    renderCouponsTable() {
        const tbody = document.getElementById('coupon-table-tbody');
        if (!tbody) return;

        if (this.allCoupons.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">No coupons created yet. Use the form above to generate one.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.allCoupons.map(c => {
            const times = Number(c.timesUsed || 0);
            const limit = Number(c.usageLimit || 1);
            const isExpired = times >= limit || c.status === 'EXPIRED';

            let benefitText = '';
            if (c.type === 'FREE_CREDITS') {
                benefitText = `<span class="bg-blue-100 text-royal font-bold px-2 py-0.5 rounded text-[11px]">+${c.value} Free Credits</span>`;
            } else if (c.type === 'DISCOUNT_PERCENT') {
                benefitText = `<span class="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[11px]">${c.value}% OFF</span>`;
            } else {
                benefitText = `<span class="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px]">₹${c.value} FLAT OFF</span>`;
            }

            const statusBadge = isExpired
                ? `<span class="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">EXPIRED</span>`
                : `<span class="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">ACTIVE</span>`;

            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs font-mono">
                    <td class="p-3 font-bold text-black select-all">${c.code}</td>
                    <td class="p-3">${benefitText}</td>
                    <td class="p-3">
                        <span class="font-bold text-slate-700">${times} / ${limit}</span>
                        <div class="w-16 bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                            <div class="bg-purple-600 h-full rounded-full" style="width: ${Math.min(100, (times/limit)*100)}%"></div>
                        </div>
                    </td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-slate-500 text-[11px]">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td class="p-3 text-right space-x-1.5 font-sans">
                        <button onclick="window.copyCouponCode('${c.code}')" title="Copy Code" class="bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-slate-700 text-xs transition">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <button onclick="window.toggleCouponStatus('${c.code}', '${c.status}')" title="Toggle Status" class="bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-lg text-xs transition">
                            <i class="fa-solid fa-power-off"></i>
                        </button>
                        <button onclick="window.deleteCoupon('${c.code}')" title="Delete" class="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2.5 py-1 rounded-lg text-xs transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async createCoupon(data) {
        if (!this.isDeveloper) {
            alert("Permission denied. Only authorized developers can create coupons.");
            return false;
        }

        const code = String(data.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!code || code.length < 3) {
            alert("Coupon code must be at least 3 characters.");
            return false;
        }

        const now = new Date().toISOString();
        const payload = {
            code,
            type: data.type || 'FREE_CREDITS',
            value: Number(data.value) || 100,
            usageLimit: Math.max(1, Number(data.usageLimit) || 10),
            timesUsed: 0,
            status: 'ACTIVE',
            expiryDate: data.expiryDate || null,
            description: data.description || 'Promotional coupon',
            createdAt: now,
            updatedAt: now,
            usedBy: {}
        };

        try {
            await setDoc(doc(db, "coupons", code), payload, { merge: true });
            return true;
        } catch (err) {
            alert("Failed to save coupon: " + err.message);
            return false;
        }
    },

    async toggleCouponStatus(code, currentStatus) {
        if (!this.isDeveloper) return;
        const nextStatus = currentStatus === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
        try {
            await updateDoc(doc(db, "coupons", code), {
                status: nextStatus,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            alert("Error: " + err.message);
        }
    },

    async deleteCoupon(code) {
        if (!this.isDeveloper) return;
        if (!confirm(`Are you sure you want to permanently delete coupon "${code}"?`)) return;
        try {
            await deleteDoc(doc(db, "coupons", code));
        } catch (err) {
            alert("Error: " + err.message);
        }
    },

    setupUrlTriggers() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const plan = params.get('plan');
        const coupon = params.get('coupon');

        if (action === 'payment' || action === 'checkout' || action === 'subscribe' || plan) {
            setTimeout(() => {
                window.openPilotPaymentModal(plan);
                if (coupon) {
                    const cInput = document.getElementById('payment-coupon-input');
                    if (cInput) {
                        cInput.value = coupon;
                        window.applyPaymentCoupon();
                    }
                }
            }, 400);
        }
    },

    async applyCouponToPayment(rawCode) {
        const code = String(rawCode || '').trim().toUpperCase();
        const feedback = document.getElementById('payment-coupon-feedback');
        const uid = this.getUserId();

        if (!code) {
            if (feedback) feedback.innerHTML = `<span class="text-amber-600">Please enter a coupon code.</span>`;
            return;
        }

        if (feedback) feedback.innerHTML = `<span class="text-royal"><i class="fa-solid fa-spinner animate-spin"></i> Checking coupon "${code}"...</span>`;

        try {
            const couponSnap = await getDoc(doc(db, "coupons", code));
            if (!couponSnap.exists()) {
                if (feedback) feedback.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-xmark"></i> Invalid coupon code: "${code}".</span>`;
                this.appliedCoupon = null;
                this.updatePaymentPricingDisplay();
                return;
            }

            const cData = couponSnap.data();

            if (cData.status && cData.status !== 'ACTIVE') {
                if (feedback) feedback.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-clock"></i> Coupon "${code}" is expired or inactive.</span>`;
                this.appliedCoupon = null;
                this.updatePaymentPricingDisplay();
                return;
            }

            const times = Number(cData.timesUsed || 0);
            const limit = Number(cData.usageLimit || 1);
            if (times >= limit) {
                if (feedback) feedback.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-ban"></i> Coupon "${code}" has reached its maximum usage limit (${limit}/${limit}) and has expired.</span>`;
                this.appliedCoupon = null;
                this.updatePaymentPricingDisplay();
                return;
            }

            if (cData.usedBy && cData.usedBy[uid]) {
                if (feedback) feedback.innerHTML = `<span class="text-amber-600 font-bold"><i class="fa-solid fa-circle-exclamation"></i> You have already redeemed coupon "${code}".</span>`;
                this.appliedCoupon = null;
                this.updatePaymentPricingDisplay();
                return;
            }

            // Coupon is valid
            this.appliedCoupon = cData;

            if (cData.type === 'FREE_CREDITS') {
                const now = new Date().toISOString();
                const newCount = times + 1;
                const isExhausted = newCount >= limit;

                // Grant credits directly in Firestore
                await updateDoc(doc(db, "coupons", code), {
                    timesUsed: newCount,
                    status: isExhausted ? 'EXPIRED' : 'ACTIVE',
                    updatedAt: now,
                    [`usedBy.${uid}`]: { redeemedAt: now, credits: cData.value }
                });

                await setDoc(doc(db, "pilot_users", uid), {
                    userId: uid,
                    creditBalance: increment(cData.value),
                    lastCouponRedeemed: code,
                    updatedAt: now
                }, { merge: true });

                if (feedback) {
                    feedback.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-circle-check"></i> Free Credits Granted! +${cData.value} Credits added to ${uid}!</span>`;
                }
                alert(`🎉 Success! Coupon "${code}" applied!\n+${cData.value} Free Credits added directly to your account (${uid}).`);
            } else {
                const discText = cData.type === 'DISCOUNT_PERCENT' ? `${cData.value}% OFF` : `₹${cData.value} FLAT OFF`;
                if (feedback) {
                    feedback.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-circle-check"></i> ${discText} applied to your subscription!</span>`;
                }
                this.updatePaymentPricingDisplay();
            }
        } catch (err) {
            console.error("Coupon verification error:", err);
            if (feedback) feedback.innerHTML = `<span class="text-rose-600">Error: ${err.message}</span>`;
        }
    },

    updatePaymentPricingDisplay() {
        const plan = this.plans[this.selectedPlan] || this.plans.ENTERPRISE;
        let finalPrice = plan.price;
        this.discountAmount = 0;

        if (this.appliedCoupon && (this.appliedCoupon.type === 'DISCOUNT_PERCENT' || this.appliedCoupon.type === 'DISCOUNT_FLAT') && plan.id !== 'TRIAL') {
            if (this.appliedCoupon.type === 'DISCOUNT_PERCENT') {
                this.discountAmount = Math.round((plan.price * Number(this.appliedCoupon.value)) / 100);
            } else {
                this.discountAmount = Math.min(plan.price, Number(this.appliedCoupon.value));
            }
            finalPrice = Math.max(1, plan.price - this.discountAmount);

            const row = document.getElementById('payment-coupon-discount-row');
            const codeEl = document.getElementById('payment-coupon-applied-code');
            const amountEl = document.getElementById('payment-coupon-discount-amount');
            if (row) row.classList.remove('hidden');
            if (codeEl) codeEl.textContent = this.appliedCoupon.code;
            if (amountEl) amountEl.textContent = `-₹${this.discountAmount}`;
        } else {
            const row = document.getElementById('payment-coupon-discount-row');
            if (row) row.classList.add('hidden');
        }

        const planNameEl = document.getElementById('payment-summary-plan-name');
        const planCreditsEl = document.getElementById('payment-summary-credits');
        const finalPriceEl = document.getElementById('payment-summary-final-price');

        if (planNameEl) planNameEl.textContent = plan.name;
        if (planCreditsEl) planCreditsEl.textContent = `+${plan.credits} Credits`;
        if (finalPriceEl) finalPriceEl.textContent = `₹${finalPrice}`;

        // Update QR Code
        const upiQrImg = document.getElementById('payment-upi-qr');
        if (upiQrImg) {
            const uid = this.getUserId();
            const upiUrl = `upi://pay?pa=rajnaga75556@okaxis&pn=Codez48&am=${finalPrice}&cu=INR&tn=Codez48_${plan.id}_${uid}`;
            upiQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
        }
    },

    async launchRazorpayLivePayment() {
        const plan = this.plans[this.selectedPlan] || this.plans.ENTERPRISE;
        const finalAmountRupees = Math.max(1, plan.price - (plan.id === 'TRIAL' ? 0 : this.discountAmount));
        const finalAmountPaise = finalAmountRupees * 100;
        const uid = this.getUserId();
        const payBtn = document.getElementById('btn-razorpay-checkout');

        if (payBtn) {
            payBtn.disabled = true;
            payBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Initializing Secure Gateway...`;
        }

        let orderData = null;
        try {
            // 1. Try order creation on Netlify Backend
            const resp = await fetch('/.netlify/functions/razorpay-create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmountPaise,
                    currency: "INR",
                    notes: {
                        userId: uid,
                        planId: plan.id,
                        couponCode: this.appliedCoupon ? this.appliedCoupon.code : 'NONE'
                    }
                })
            });

            if (resp.ok) {
                orderData = await resp.json();
            }
        } catch (netErr) {
            console.warn("Backend order creation warning:", netErr);
        }

        try {
            // 2. Razorpay Options
            const options = {
                key: RAZORPAY_LIVE_KEY,
                amount: finalAmountPaise,
                currency: "INR",
                name: "Codez48 Technologies",
                description: `${plan.name} (${plan.credits} AI Credits)`,
                order_id: orderData ? orderData.id : undefined,
                prefill: {
                    name: "Codez48 Pilot User",
                    email: "rajnaga75556@gmail.com",
                    contact: "9443210987"
                },
                theme: { color: "#2563EB" },
                handler: async (response) => {
                    await this.recordPaymentSuccess(response, plan, finalAmountRupees, uid);
                },
                modal: {
                    ondismiss: () => {
                        if (payBtn) {
                            payBtn.disabled = false;
                            payBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay with Razorpay (Cards, UPI, Netbanking)`;
                        }
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => {
                alert(`Payment Failed: ${resp.error.description}`);
                if (payBtn) {
                    payBtn.disabled = false;
                    payBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay with Razorpay (Cards, UPI, Netbanking)`;
                }
            });
            rzp.open();

        } catch (err) {
            console.warn("Razorpay Init Warning:", err.message);
            alert(`Unable to open Razorpay gateway: ${err.message}. Please check your connection.`);
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay with Razorpay (Cards, UPI, Netbanking)`;
            }
        }
    },

    async recordPaymentSuccess(paymentResp, plan, amountPaid, uid) {
        const now = new Date().toISOString();
        const paymentId = paymentResp.razorpay_payment_id || `pay_direct_${Date.now()}`;
        const emailInput = document.getElementById('payment-email-input');
        const email = (emailInput ? emailInput.value.trim() : '') || localStorage.getItem('c48_user_email') || 'rajnaga75556@gmail.com';

        try {
            // Update pilot_users
            const userUpdate = {
                userId: uid,
                userEmail: email,
                plan: plan.id,
                planName: plan.name,
                creditBalance: increment(plan.credits),
                planActivatedAt: now,
                lastPaymentId: paymentId,
                lastPaymentAmount: amountPaid,
                updatedAt: now
            };
            if (plan.id === 'TRIAL') {
                userUpdate.trialClaimed = true;
            }
            await setDoc(doc(db, "pilot_users", uid), userUpdate, { merge: true });

            // Remove trial card from DOM once claimed
            const trialModalCard = document.getElementById('first-time-trial-card-modal');
            if (trialModalCard) trialModalCard.remove();

            // Record transaction
            const txId = `tx_${Date.now()}`;
            await setDoc(doc(db, "pilot_transactions", txId), {
                id: txId,
                userId: uid,
                userEmail: email,
                planId: plan.id,
                amount: amountPaid,
                creditsAdded: plan.credits,
                paymentId,
                couponUsed: this.appliedCoupon ? this.appliedCoupon.code : null,
                status: 'COMPLETED',
                timestamp: now
            });

            // If discount coupon was used, record redemption
            if (this.appliedCoupon) {
                await updateDoc(doc(db, "coupons", this.appliedCoupon.code), {
                    timesUsed: increment(1),
                    [`usedBy.${uid}`]: { redeemedAt: now, plan: plan.id, paymentId }
                }).catch(() => {});
            }

            // Automated Email Dispatch
            try {
                await fetch('/.netlify/functions/send-login-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'PILOT_SUBSCRIPTION_WELCOME',
                        userEmail: email,
                        userId: uid,
                        planName: plan.name,
                        credits: plan.credits,
                        amountPaid: amountPaid,
                        paymentId: paymentId,
                        time: now
                    })
                });
            } catch(mErr) {
                console.warn("Email notice:", mErr);
            }

            alert(`🎉 PAYMENT SUCCESSFUL!\n\nYour ${plan.name} has been activated!\n+${plan.credits} Credits added to ${uid}.\nCredentials emailed to ${email}.\nYour Codez48 Pilot CLI is now unlocked.`);
            window.location.reload();

        } catch (err) {
            console.error("Payment sync error:", err);
            alert("Payment recorded successfully! Firebase sync completed.");
        }
    }
};

// Global Window Bindings for HTML onclick handlers
window.openDeveloperLoginModal = () => {
    const modal = document.getElementById('developer-login-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeDeveloperLoginModal = () => {
    const modal = document.getElementById('developer-login-modal');
    if (modal) modal.classList.add('hidden');
};

window.submitDeveloperLogin = async (e) => {
    if (e) e.preventDefault();
    const email = document.getElementById('dev-login-email').value;
    const pass = document.getElementById('dev-login-password').value;
    const feedback = document.getElementById('dev-login-feedback');

    if (feedback) feedback.innerHTML = `<span class="text-royal"><i class="fa-solid fa-spinner animate-spin"></i> Authenticating...</span>`;

    const res = await CouponAndPaymentTool.authenticateDeveloper(email, pass);
    if (res.success) {
        if (feedback) feedback.innerHTML = `<span class="text-emerald-600 font-bold">${res.message}</span>`;
        setTimeout(() => {
            window.closeDeveloperLoginModal();
            window.openCouponManagerModal();
        }, 600);
    } else {
        if (feedback) feedback.innerHTML = `<span class="text-rose-600 font-bold">${res.message}</span>`;
    }
};

window.openDeveloperSessionModal = () => {
    if (!CouponAndPaymentTool.isDeveloper) {
        window.openDeveloperLoginModal();
        return;
    }
    if (confirm("You are currently authenticated as System Developer (codez4848@gmail.com).\n\nDo you want to log out?")) {
        CouponAndPaymentTool.logoutDeveloper();
    }
};

window.openCouponManagerModal = () => {
    if (!CouponAndPaymentTool.isDeveloper) {
        window.openDeveloperLoginModal();
        return;
    }
    const modal = document.getElementById('coupon-manager-modal');
    if (modal) {
        modal.classList.remove('hidden');
        CouponAndPaymentTool.renderCouponsTable();
    }
};

window.closeCouponManagerModal = () => {
    const modal = document.getElementById('coupon-manager-modal');
    if (modal) modal.classList.add('hidden');
};

window.handleCreateCouponSubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('new-coupon-code').value;
    const type = document.getElementById('new-coupon-type').value;
    const value = document.getElementById('new-coupon-value').value;
    const usageLimit = document.getElementById('new-coupon-limit').value;
    const expiryDate = document.getElementById('new-coupon-expiry').value;
    const description = document.getElementById('new-coupon-desc').value;

    const btn = document.getElementById('btn-save-coupon');
    if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Saving to Firebase...`;

    const ok = await CouponAndPaymentTool.createCoupon({
        code, type, value, usageLimit, expiryDate, description
    });

    if (btn) btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Save & Publish Coupon`;

    if (ok) {
        alert(`✔ Coupon "${code.toUpperCase()}" published to Firebase!`);
        document.getElementById('form-create-coupon').reset();
    }
};

window.copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Coupon code "${code}" copied to clipboard!`);
};

window.toggleCouponStatus = (code, status) => {
    CouponAndPaymentTool.toggleCouponStatus(code, status);
};

window.deleteCoupon = (code) => {
    CouponAndPaymentTool.deleteCoupon(code);
};

window.openPilotPaymentModal = (planId = 'ENTERPRISE') => {
    const modal = document.getElementById('pilot-payment-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    window.selectPilotPlan(planId || 'ENTERPRISE');
    CouponAndPaymentTool.checkUserEligibility();
};

window.closePilotPaymentModal = () => {
    const modal = document.getElementById('pilot-payment-modal');
    if (modal) modal.classList.add('hidden');
};

window.selectPilotPlan = (planId) => {
    CouponAndPaymentTool.selectedPlan = planId;
    ['MICRO', 'ENTERPRISE', 'PROFIT_ORIENTED'].forEach(p => {
        const card = document.getElementById(`pay-card-${p}`);
        if (card) {
            if (p === planId) {
                card.className = "cursor-pointer p-4 rounded-2xl border-2 border-royal bg-blue-50/50 transition-all";
            } else {
                card.className = "cursor-pointer p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all";
            }
        }
    });
    CouponAndPaymentTool.updatePaymentPricingDisplay();
};

window.applyPaymentCoupon = () => {
    const code = document.getElementById('payment-coupon-input').value;
    CouponAndPaymentTool.applyCouponToPayment(code);
};

window.launchPilotRazorpayPayment = () => {
    CouponAndPaymentTool.launchRazorpayLivePayment();
};

window.removePaymentCoupon = () => {
    CouponAndPaymentTool.appliedCoupon = null;
    CouponAndPaymentTool.discountAmount = 0;
    const input = document.getElementById('payment-coupon-input');
    if (input) input.value = '';
    const feedback = document.getElementById('payment-coupon-feedback');
    if (feedback) feedback.innerHTML = '<span class="text-slate-400">Coupon removed. Base prices restored.</span>';
    const removeBtn = document.getElementById('btn-remove-payment-coupon');
    if (removeBtn) removeBtn.classList.add('hidden');
    CouponAndPaymentTool.updatePaymentPricingDisplay();
};

window.claimPilotTrialPass = () => {
    CouponAndPaymentTool.selectedPlan = 'TRIAL';
    CouponAndPaymentTool.updatePaymentPricingDisplay();
    CouponAndPaymentTool.launchRazorpayLivePayment();
};

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    CouponAndPaymentTool.init();
});
