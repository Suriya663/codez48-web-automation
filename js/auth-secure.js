import { auth, db } from './firebase-config.js';
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { doc, getDoc, setDoc, query, collection, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { showView, updateNavUI, navigationState, setWizardStep } from './navigation.js';
import { showPublicProfile } from './profile.js';
import { compressImage, sendFast2SMS } from './utils.js';
import { trackEvent } from './analytics.js';

export let currentUser = null;
export let selectedPlan = null;
export let regPhotoBase64 = null;

export const initAuthListener = (o) => {
    onAuthStateChanged(auth, async u => {
        if (u) {
            let s = await getDoc(doc(db, "sellers", u.uid));
            const st = localStorage.getItem('tori_seller_id');
            if (!s.exists() && st) {
                s = await getDoc(doc(db, "sellers", st));
            }
            if (s.exists()) {
                window.currentUser = { id: s.id, ...s.data(), uid: s.id };
            } else {
                const rI = st || u.uid;
                const r = await getDoc(doc(db, "seller_requests", rI));
                if (r.exists()) {
                    window.currentUser = { ...r.data(), uid: r.id, isPending: true };
                } else {
                    window.currentUser = { uid: u.uid, isAnonymous: true };
                }
            }
        } else {
            try { await signInAnonymously(auth); } catch (e) {}
            window.currentUser = null;
        }
        updateNavUI(window.currentUser);
        if (o) o();
    });
};

export const openRegisterWizard = () => {
    if (navigationState.authMode === 'login') {
        toggleAuthMode();
    }
    showView('auth');
    setWizardStep(1);
    const t = document.getElementById('auth-title');
    if (t) t.innerText = "Request Protocol Registration";
    trackEvent('registration_page_viewed');
};

export const openRecoveryWizard = () => {
    if (navigationState.authMode === 'register') {
        toggleAuthMode();
    }
    showView('auth');
    setWizardStep(1);
    const t = document.getElementById('auth-title');
    if (t) t.innerText = "Identity Recovery";
    trackEvent('recovery_page_viewed');
};

export const selectRegPlan = (p) => {
    selectedPlan = p;
    trackEvent('pricing_plan_viewed', { plan: p });
    document.querySelectorAll('[id*="plan-"]').forEach(e => e.dataset.selected = 'false');
    document.querySelectorAll(`[id*="plan-${p}"]`).forEach(e => e.dataset.selected = 'true');
};

export const toggleBillingCycle = () => {
    const isDaily = document.getElementById('billing-cycle-toggle')?.checked === true;
    const starterVal = document.getElementById('price-starter-val');
    const starterUnit = document.getElementById('price-starter-unit');
    const premiumVal = document.getElementById('price-premium-val');
    const premiumUnit = document.getElementById('price-premium-unit');

    if (isDaily) {
        if (starterVal) starterVal.innerText = '₹83';
        if (starterUnit) starterUnit.innerText = '/Day';
        if (premiumVal) premiumVal.innerText = '₹133';
        if (premiumUnit) premiumUnit.innerText = '/Day';
    } else {
        if (starterVal) starterVal.innerText = '₹2,500';
        if (starterUnit) starterUnit.innerText = '/Month';
        if (premiumVal) premiumVal.innerText = '₹4,000';
        if (premiumUnit) premiumUnit.innerText = '/Month';
    }
};

export const toggleWizardBillingCycle = () => {
    const isDaily = document.getElementById('wizard-billing-cycle-toggle')?.checked === true;
    const starterVal = document.getElementById('wizard-price-starter-val');
    const starterUnit = document.getElementById('wizard-price-starter-unit');
    const premiumVal = document.getElementById('wizard-price-premium-val');
    const premiumUnit = document.getElementById('wizard-price-premium-unit');

    if (isDaily) {
        if (starterVal) starterVal.innerText = '₹83';
        if (starterUnit) starterUnit.innerText = '/Day';
        if (premiumVal) premiumVal.innerText = '₹133';
        if (premiumUnit) premiumUnit.innerText = '/Day';
    } else {
        if (starterVal) starterVal.innerText = '₹2,500';
        if (starterUnit) starterUnit.innerText = '/Month';
        if (premiumVal) premiumVal.innerText = '₹4,000';
        if (premiumUnit) premiumUnit.innerText = '/Month';
    }
};

export const proceedToPayment = () => {
    if (!selectedPlan) return alert("Please select a business plan tier first.");
    trackEvent('checkout_started', { plan: selectedPlan });

    const isDailyWizard = document.getElementById('wizard-billing-cycle-toggle')?.checked === true;
    const isDailyLanding = document.getElementById('billing-cycle-toggle')?.checked === true;
    const isDaily = isDailyWizard || isDailyLanding;

    const amountToPay = isDaily ? (selectedPlan === 'starter' ? 83 : 133) : (selectedPlan === 'starter' ? 2500 : 4000);

    const options = {
        key: atob("cnpwX2xpdmVfVFVKdDhDTHZsWjFYRU4="),
        amount: amountToPay * 100,
        currency: "INR",
        name: "CODEZ48 Network",
        description: `Activation: ${selectedPlan.toUpperCase()} (${isDaily ? 'Pay-As-You-Go Daily' : 'Monthly'})`,
        handler: async function (response) {
            activateNewNode(response.razorpay_payment_id, false, isDaily, amountToPay);
        },
        prefill: {
            email: document.getElementById('auth-email')?.value || '',
            contact: ''
        },
        theme: { color: "#2563EB" }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
};

export const activateNewNode = async (paymentId, isApproved = false, isDaily = false, amountPaid = 2500) => {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');

    const email = document.getElementById('auth-email').value.trim();
    const rawPass = document.getElementById('auth-pass').value.trim();
    const username = document.getElementById('auth-username').value.trim().toLowerCase();
    const brand = document.getElementById('auth-brand').value.trim();
    const prodDesc = document.getElementById('auth-products-desc').value.trim();
    const servDesc = document.getElementById('auth-services-desc').value.trim();

    const sellerId = 'SLR-' + Math.floor(100000 + Math.random() * 900000);
    const assignedPass = isApproved ? rawPass : ('PASS-' + Math.floor(100000 + Math.random() * 900000));
    const refCode = sessionStorage.getItem('dev_referral_code');
    const dailyFee = selectedPlan === 'starter' ? 83 : 133;

    const nodeData = {
        sellerId,
        username,
        brand,
        productDescription: prodDesc,
        servicesDescription: servDesc,
        companyName: '',
        email,
        password: assignedPass,
        logo: regPhotoBase64,
        date: new Date().toISOString(),
        status: 'active',
        tier: selectedPlan,
        activationCycle: isDaily ? 'daily' : 'monthly',
        dailyFee: dailyFee,
        walletBalance: amountPaid,
        lastActivatedAt: new Date().toISOString(),
        paymentId,
        followersCount: 0,
        followingCount: 0,
        followers: [],
        following: [],
        referredBy: refCode || null
    };

    try {
        const targetColl = isApproved ? "sellers" : "seller_requests";
        await setDoc(doc(db, targetColl, sellerId), nodeData);
        localStorage.setItem('tori_seller_id', sellerId);
        window.currentUser = { ...nodeData, uid: sellerId, isPending: !isApproved };
        updateNavUI(window.currentUser);

        // Display credentials on step 3
        const resIdEl = document.getElementById('res-seller-id');
        const resPassEl = document.getElementById('res-seller-pass');
        const resUrlEl = document.getElementById('res-seller-url');

        if (resIdEl) resIdEl.innerText = sellerId;
        if (resPassEl) resPassEl.innerText = `Password: ${assignedPass}`;
        if (resUrlEl) {
            const alias = username || sellerId;
            resUrlEl.innerText = `${window.location.origin}/seller/index.html?s=${alias}${selectedPlan === 'premium' ? '' : '.codeez'}`;
        }

        // Send Credential Email to Seller and Alert to Developer
        await sendCredentialEmail(nodeData, assignedPass, amountPaid);

        if (loader) loader.classList.add('hidden');
        setWizardStep(3);
    } catch (err) {
        if (loader) loader.classList.add('hidden');
        alert("Registry Error: " + err.message);
    }
};

export const sendCredentialEmail = async (d, rP, amountPaid = 2500) => {
    try {
        await fetch('/.netlify/functions/send-login-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SELLER_REGISTRATION_ALERT',
                siteId: d.sellerId,
                sellerEmail: d.email,
                sellerId: d.sellerId,
                sellerPassword: rP,
                planName: d.tier || 'starter',
                brandName: d.brand || d.username || 'Merchant',
                mobileNumber: d.mobile || 'N/A',
                paidAmount: `₹${amountPaid}`,
                paymentId: d.paymentId || 'N/A'
            })
        });
    } catch (err) {
        console.warn("[REGISTRATION EMAIL NOTICE]:", err.message);
    }
};

export const handleAuth = async () => {
    const loginInput = document.getElementById('auth-email').value.trim();
    const passInput = document.getElementById('auth-pass').value.trim();
    const loader = document.getElementById('global-loader');

    if (!loginInput || !passInput) return alert("Credentials required.");

    if (navigationState.authMode === 'register') {
        const username = document.getElementById('auth-username').value.trim().toLowerCase();
        const brand = document.getElementById('auth-brand').value.trim();
        const prodDesc = document.getElementById('auth-products-desc').value.trim();
        const servDesc = document.getElementById('auth-services-desc').value.trim();

        if (!username || !brand || !prodDesc || !servDesc || !regPhotoBase64) {
            return alert("All fields are required.");
        }

        if (loader) loader.classList.remove('hidden');
        try {
            const qS = query(collection(db, "sellers"), where("username", "==", username));
            const qR = query(collection(db, "seller_requests"), where("username", "==", username));
            const [sS, sR] = await Promise.all([getDocs(qS), getDocs(qR)]);

            if (!sS.empty || !sR.empty) {
                if (loader) loader.classList.add('hidden');
                return alert("Username already taken.");
            }

            // Dispatch Registration Request Email explaining payment options
            fetch('/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'REGISTRATION_SUBMIT_REQUEST_ALERT',
                    sellerEmail: loginInput,
                    username: username,
                    brandName: brand,
                    prodDesc: prodDesc,
                    servDesc: servDesc
                })
            }).catch(() => {});

            if (loader) loader.classList.add('hidden');
            trackPotentialLead(); // Record accuracy data
            setWizardStep(2);
        } catch (err) {
            if (loader) loader.classList.add('hidden');
            alert(err.message);
        }
        return;
    }

    // Login Mode
    if (loader) loader.classList.remove('hidden');
    try {
        await signInAnonymously(auth);
        const isSellerId = loginInput.startsWith('SLR-');
        const queryField = isSellerId ? "sellerId" : "email";

        let q = query(collection(db, "sellers"), where(queryField, "==", loginInput));
        let snap = await getDocs(q);
        let folder = 'sellers';

        if (snap.empty) {
            q = query(collection(db, "seller_requests"), where(queryField, "==", loginInput));
            snap = await getDocs(q);
            folder = 'seller_requests';
        }

        if (!snap.empty) {
            const sellerData = snap.docs[0].data();
            if (sellerData.password === passInput) {
                const sId = snap.docs[0].id;
                localStorage.setItem('tori_seller_id', sId);
                window.currentUser = { ...sellerData, uid: sId, id: sId, isPending: folder === 'seller_requests' };
                updateNavUI(window.currentUser);

                // Dispatch quiet login notification email
                fetch('/.netlify/functions/send-login-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'LOGIN_CONFIRMATION_ALERT',
                        siteId: sId,
                        sellerId: sId,
                        brandName: sellerData.brand || sellerData.username || 'Merchant',
                        userEmail: sellerData.email || loginInput
                    })
                }).catch(() => {});

                showPublicProfile(sId, window.currentUser);
            } else {
                alert("Invalid password.");
            }
        } else {
            alert("Merchant identity not found.");
        }
    } catch (err) {
        alert("Auth Error: " + err.message);
    } finally {
        if (loader) loader.classList.add('hidden');
    }
};

export const toggleAuthMode = () => {
    const t = document.getElementById('auth-title');
    const s = document.getElementById('auth-subtitle');
    const bP = document.getElementById('btn-auth-primary');
    const bT = document.getElementById('btn-auth-toggle');
    const rF = document.getElementById('register-fields');

    if (navigationState.authMode === 'login') {
        navigationState.authMode = 'register';
        if (t) t.innerText = "Request Protocol Registration";
        if (s) s.innerText = "Register your business node.";
        if (bP) bP.innerText = "Submit Request";
        if (bT) bT.innerText = "Existing Node? Authenticate";
        if (rF) rF.classList.remove('hidden');
    } else {
        navigationState.authMode = 'login';
        if (t) t.innerText = "Seller Secure Login";
        if (s) s.innerText = "Authenticate to access node.";
        if (bP) bP.innerText = "Access Console";
        if (bT) bT.innerText = "Register Now";
        if (rF) rF.classList.add('hidden');
    }
    setWizardStep(1);
};

export const trackReferralVisit = async (rC, isProfile = false) => {
    if (!rC) return;
    const key = isProfile ? `dev_profile_visit_${rC}` : `dev_visit_${rC}`;
    if (sessionStorage.getItem(key)) return;
    try {
        const q = query(collection(db, "dev_prog_users"), where("referralCode", "==", rC));
        const sn = await getDocs(q);
        if (!sn.empty) {
            const dv = sn.docs[0].data();
            await addDoc(collection(db, "dev_prog_visits"), {
                developerEmail: dv.email,
                timestamp: new Date().toISOString(),
                type: isProfile ? 'profile' : 'landing'
            });
            sessionStorage.setItem(key, 'true');
        }
    } catch (err) {}
};

export const trackPotentialLead = async () => {
    const rC = sessionStorage.getItem('dev_referral_code');
    if (!rC) return;
    try {
        const q = query(collection(db, "dev_prog_users"), where("referralCode", "==", rC));
        const sn = await getDocs(q);
        if (!sn.empty) {
            const dv = sn.docs[0].data();
            const e = document.getElementById('auth-email')?.value.trim() || '';
            const b = document.getElementById('auth-brand')?.value.trim() || '';
            const u = document.getElementById('auth-username')?.value.trim() || '';
            const lI = 'LEAD_START-' + Math.random().toString(36).substring(2, 9).toUpperCase();
            await setDoc(doc(db, "dev_prog_leads", lI), {
                name: b || u || 'Unknown',
                mobile: 'Form Filled',
                email: e,
                paidAmount: 0,
                developerEmail: dv.email,
                status: 'form_filled',
                registeredAt: new Date().toISOString()
            });
        }
    } catch (err) {}
};

window.handleAuth = handleAuth;
window.toggleAuthMode = toggleAuthMode;
window.openRegisterWizard = openRegisterWizard;
window.openRecoveryWizard = openRecoveryWizard;
window.selectRegPlan = selectRegPlan;
window.toggleBillingCycle = toggleBillingCycle;
window.toggleWizardBillingCycle = toggleWizardBillingCycle;
window.proceedToPayment = proceedToPayment;
window.trackReferralVisit = trackReferralVisit;
window.trackPotentialLead = trackPotentialLead;
window.handleAuthPhoto = (i) => {
    if (i.files && i.files[0]) {
        const reader = new FileReader();
        reader.onload = async e => {
            regPhotoBase64 = await compressImage(e.target.result, 400, 400);
            document.getElementById('reg-img-preview').innerHTML = `<img src="${regPhotoBase64}" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(i.files[0]);
    }
};
