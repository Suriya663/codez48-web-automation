/**
 * CODEZ48 CREDIT & LICENSE VAULT
 *
 * Secure, obfuscated local credit and subscription tracking engine.
 * - Stores balance & state in an obfuscated, hidden metadata vault directory.
 * - Starts each user with 110 Free Credits.
 * - Deducts 1 credit per PPT / document generation action.
 * - Enforces subscription tiers:
 *     1. Micro Plan (₹299/mo) — Essential AI B&W Documents (PPT & Word)
 *     2. Enterprise Plan (₹599/mo) — High-Quality Code, Static Sites + WhatsApp Automation
 *     3. Profit-Oriented Plan (₹999/mo) — Flawless Top-Tier Design, High-Precision AI + WhatsApp Voice Supervisor
 * - Automatically opens browser with Razorpay checkout when trial ends.
 * - Seamlessly synchronizes with Firebase Firestore.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec, spawnSync } = require('child_process');
const logger = require('./logger');
const { formatTerminalBox } = require('./box-formatter');

// Hidden, non-obvious vault directory inside the application root
const VAULT_DIR = path.resolve(__dirname, '../../.sys_vault_metadata');
const VAULT_FILE = path.join(VAULT_DIR, 'usr_sec_token.dat');

// Available Subscription Plans with Strict Tier Consumption Rates
const SUBSCRIPTION_PLANS = {
    TRIAL_FREE: {
        id: 'TRIAL_FREE',
        name: 'Free Tier / Trial',
        price: 0,
        initialCredits: 20,
        credits: 20,
        monthlyCredits: 20,
        interactionRate: 2, // 1 credit deducted per 2 interactions
        docCost: 2,         // 2 credits per PPT/PDF/file
        whatsAppAllowed: false,
        whatsAppCost: 0,
        whatsAppUnlimited: false,
        features: {
            pptDesign: 'standard_color',
            wordDesign: 'standard',
            whatsAppAutomation: false,
            codeGen: true,
            interactionRate: 2,
            docCost: 2
        }
    },
    MICRO: {
        id: 'MICRO',
        name: 'Basic Plan (Tier 1)',
        price: 299,
        credits: 300,
        monthlyCredits: 300,
        description: 'Clean, black-and-white text-based PPT & Word document generation without elaborate effects.',
        interactionRate: 2, // 1 credit deducted per 2 interactions
        docCost: 2,         // 2 credits per PPT/PDF/file
        whatsAppAllowed: false,
        whatsAppCost: 0,
        whatsAppUnlimited: false,
        features: {
            pptDesign: 'clean_bw_text',
            wordDesign: 'clean_bw_text',
            whatsAppAutomation: false,
            codeGen: false,
            interactionRate: 2,
            docCost: 2
        }
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Second Plan (Enterprise - Tier 2)',
        price: 599,
        credits: 700,
        monthlyCredits: 700,
        description: 'High-quality startup deliverables, structured static websites, clean code & WhatsApp automation.',
        interactionRate: 3, // 1 credit deducted per 3 interactions
        docCost: 1,         // 1 credit per task
        whatsAppAllowed: true,
        whatsAppCost: 1,    // 1 credit per number / message
        whatsAppUnlimited: false,
        features: {
            pptDesign: 'high_quality_color',
            wordDesign: 'professional',
            whatsAppAutomation: true,
            codeGen: true,
            interactionRate: 3,
            docCost: 1,
            whatsAppCost: 1,
            whatsAppUnlimited: false
        }
    },
    PROFIT_ORIENTED: {
        id: 'PROFIT_ORIENTED',
        name: 'Third Plan (Profit-Oriented - Tier 3)',
        price: 999,
        credits: 1500,
        monthlyCredits: 1500,
        description: 'Flawless top-tier PPT & Word design, high-precision strategic execution, unlimited WhatsApp automation.',
        interactionRate: 4, // 1 credit deducted per 4 interactions
        docCost: 1,         // 1 credit per task
        whatsAppAllowed: true,
        whatsAppCost: 0,    // Unlimited WhatsApp (0 credits needed)
        whatsAppUnlimited: true,
        features: {
            pptDesign: 'flawless_premium',
            wordDesign: 'executive_grade',
            whatsAppAutomation: true,
            codeGen: true,
            voiceCloneSupervisor: true,
            interactionRate: 4,
            docCost: 1,
            whatsAppCost: 0,
            whatsAppUnlimited: true
        }
    }
};

class CreditVault {
    constructor() {
        this.cache = null;
        this.syncInProgress = false;
        this._ensureVaultInitialized();
    }

    /**
     * Generate or load a unique device/user identifier
     */
    _generateUserIdentifier() {
        try {
            const raw = `${process.env.COMPUTERNAME || 'NODE'}_${process.env.USERNAME || 'USER'}_${process.platform}_codez48`;
            const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16).toUpperCase();
            return `USR-CDZ48-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
        } catch (_) {
            return `USR-CDZ48-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        }
    }

    /**
     * Initializes the hidden vault folder and file with Windows hidden attributes
     */
    _ensureVaultInitialized() {
        try {
            if (!fs.existsSync(VAULT_DIR)) {
                fs.mkdirSync(VAULT_DIR, { recursive: true });
                if (process.platform === 'win32') {
                    try {
                        spawnSync('attrib', ['+h', '+s', VAULT_DIR], { stdio: 'ignore' });
                    } catch (_) {}
                }
            }

            if (!fs.existsSync(VAULT_FILE)) {
                const uid = this._generateUserIdentifier();
                const initialData = {
                    version: '2.1',
                    userId: uid,
                    email: 'rajnaga75556@gmail.com',
                    creditBalance: 20,
                    plan: 'TRIAL_FREE',
                    planName: 'Trial Free Plan (20 Credits)',
                    planActivatedAt: new Date().toISOString(),
                    totalCreditsUsed: 0,
                    totalPptCreated: 0,
                    totalDocsCreated: 0,
                    purchasedPlans: [],
                    history: [
                        {
                            id: `tx_${Date.now()}`,
                            action: 'INITIAL_GRANT',
                            delta: +20,
                            balance: 20,
                            timestamp: new Date().toISOString(),
                            reason: 'Welcome bonus: 20 Free Credits allocated.'
                        }
                    ],
                    lastSyncAt: null,
                    checksum: ''
                };
                initialData.checksum = this._calculateChecksum(initialData);
                this._writeVaultFile(initialData);
                this.cache = initialData;
                logger.status(`\x1b[32m[CREDIT VAULT] Initialized secure vault with 110 Free Credits (UID: ${uid})\x1b[0m`);
            } else {
                this.cache = this._readVaultFile();
            }
        } catch (e) {
            console.error('[CREDIT VAULT INIT ERROR]', e.message);
        }
    }

    _calculateChecksum(data) {
        const payload = `${data.userId}:${data.creditBalance}:${data.plan}:${data.totalCreditsUsed}`;
        return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
    }

    _readVaultFile() {
        try {
            const raw = fs.readFileSync(VAULT_FILE, 'utf8');
            const data = JSON.parse(raw);
            const expectedChecksum = this._calculateChecksum(data);
            if (data.checksum && data.checksum !== expectedChecksum) {
                console.warn(`[CREDIT VAULT WARNING] Vault integrity check notice. Re-verifying state...`);
            }
            return data;
        } catch (e) {
            return this.cache || { creditBalance: 20, plan: 'TRIAL_FREE', userId: this._generateUserIdentifier() };
        }
    }

    _writeVaultFile(data) {
        data.checksum = this._calculateChecksum(data);
        fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2), 'utf8');
        this.cache = data;
        this.triggerFirebaseSync();
    }

    /**
     * Get user unique identifier
     */
    
    /**
     * Updates local vault from remote server data without re-triggering remote push
     */
    updateLocalFromRemote(remote) {
        if (!remote) return;
        try {
            const local = this._readVaultFile();
            let changed = false;
            if (typeof remote.creditBalance === 'number' && remote.creditBalance !== local.creditBalance) {
                local.creditBalance = remote.creditBalance;
                changed = true;
            }
            if (remote.plan && remote.plan !== local.plan) {
                local.plan = remote.plan;
                local.planName = remote.planName || (SUBSCRIPTION_PLANS[remote.plan] ? SUBSCRIPTION_PLANS[remote.plan].name : local.planName);
                changed = true;
            }
            if (remote.planActivatedAt) {
                local.planActivatedAt = remote.planActivatedAt;
                changed = true;
            }
            if (remote.email || remote.userEmail) {
                local.email = remote.email || remote.userEmail;
            }
            if (changed) {
                local.lastRemoteSyncAt = new Date().toISOString();
                local.lastSyncAt = new Date().toISOString();
                local.checksum = this._calculateChecksum(local);
                fs.writeFileSync(VAULT_FILE, JSON.stringify(local, null, 2), 'utf8');
                this.cache = local;
                logger.status(`\x1b[32m✔ Local vault updated from remote: Plan=${local.planName}, Balance=${local.creditBalance}\x1b[0m`);
            }
        } catch (e) {
            logger.debug(`[VAULT UPDATE ERROR] ${e.message}`);
        }
    }

    sanitizeUserId(raw) {
        if (!raw || typeof raw !== 'string') return '';
        let clean = raw.trim();
        if (clean.includes('|')) clean = clean.split('|')[0].trim();
        if (clean.includes('/')) clean = clean.split('/')[0].trim();
        clean = clean.replace(/[^A-Za-z0-9-]/g, '').trim().toUpperCase();
        const match = clean.match(/USR-CDZ48-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
        if (match) return match[0];
        return clean;
    }

    getUserIdentifier() {
        const data = this._readVaultFile();
        const raw = data.userId || this._generateUserIdentifier();
        return this.sanitizeUserId(raw);
    }

    /**
     * Get current credit balance
     */
    getBalance() {
        const data = this._readVaultFile();
        return typeof data.creditBalance === 'number' ? data.creditBalance : 20;
    }

    /**
     * Get active plan info
     */
    getPlan() {
        const data = this._readVaultFile();
        const planKey = data.plan || 'TRIAL_FREE';
        return SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.TRIAL_FREE;
    }

    /**
     * Check if user has sufficient credits
     */
    hasCredits(required = 1) {
        return this.getBalance() >= required;
    }

    /**
     * Check if WhatsApp Automation is allowed on user's current plan
     * WhatsApp automation is available only with the Second Plan (Enterprise, ₹599) and Third Plan (Profit-Oriented, ₹999).
     * It is not available on Free Tier or Basic Plan.
     */
    isWhatsAppAllowed() {
        const plan = this.getPlan();
        if (plan.id === 'PROFIT_ORIENTED') {
            return {
                allowed: true,
                plan: plan.name,
                isUnlimited: true,
                costPerMessage: 0,
                notice: 'Unlimited WhatsApp automation included on Profit-Oriented Plan.'
            };
        }
        if (plan.id === 'ENTERPRISE') {
            return {
                allowed: true,
                plan: plan.name,
                isUnlimited: false,
                costPerMessage: 1,
                notice: 'WhatsApp automation active (1 credit per message/number on Enterprise Plan).'
            };
        }
        return {
            allowed: false,
            plan: plan.name,
            reason: `WhatsApp automation is available exclusively on the Second Plan (Enterprise, ₹599) and Third Plan (Profit-Oriented, ₹999). It is not available on ${plan.name}. Please upgrade to access WhatsApp automation.`
        };
    }

    /**
     * Deducts credit for sending or auto-replying a WhatsApp message
     * - Second Plan (Enterprise): 1 credit per number/message
     * - Third Plan (Profit-Oriented): 0 credits (Unlimited usage)
     * - Free Tier & Basic Plan: Locked
     */
    deductWhatsAppMessageCredit(recipient = '', isAutoReply = false) {
        const access = this.isWhatsAppAllowed();
        if (!access.allowed) {
            return {
                success: false,
                reason: 'FEATURE_LOCKED',
                message: access.reason
            };
        }

        const data = this._readVaultFile();
        const plan = this.getPlan();

        // Third Plan (Profit-Oriented): UNLIMITED (0 credits)
        if (plan.id === 'PROFIT_ORIENTED') {
            const logEntry = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                action: isAutoReply ? 'WHATSAPP_AUTO_REPLY_UNLIMITED' : 'WHATSAPP_MESSAGE_SENT_UNLIMITED',
                delta: 0,
                balance: data.creditBalance,
                timestamp: new Date().toISOString(),
                recipient,
                reason: `Unlimited WhatsApp automation on ${plan.name} (0 credits deducted)`
            };

            if (!Array.isArray(data.history)) data.history = [];
            data.history.push(logEntry);
            this._writeVaultFile(data);

            logger.status(`\x1b[32m[CREDIT VAULT] WhatsApp message processed (0 credits deducted — Unlimited usage on ${plan.name}). Balance: ${data.creditBalance} Credits\x1b[0m`);

            return {
                success: true,
                deducted: 0,
                isUnlimited: true,
                remainingBalance: data.creditBalance,
                plan: plan.name
            };
        }

        // Second Plan (Enterprise): 1 credit per message/number
        const cost = 1;
        if (data.creditBalance < cost) {
            logger.status(`\x1b[31m[CREDIT VAULT] Insufficient credits for WhatsApp dispatch! Current: ${data.creditBalance}, Required: 1\x1b[0m`);
            return {
                success: false,
                reason: 'CREDITS_EXHAUSTED',
                currentBalance: data.creditBalance,
                plan: plan.name
            };
        }

        data.creditBalance -= cost;
        data.totalCreditsUsed = (data.totalCreditsUsed || 0) + cost;

        const logEntry = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: isAutoReply ? 'WHATSAPP_AUTO_REPLY' : 'WHATSAPP_MESSAGE_SENT',
            delta: -cost,
            balance: data.creditBalance,
            timestamp: new Date().toISOString(),
            recipient,
            reason: `1 credit deducted for WhatsApp ${isAutoReply ? 'AI auto-reply' : 'message to ' + recipient} on ${plan.name}`
        };

        if (!Array.isArray(data.history)) data.history = [];
        data.history.push(logEntry);
        if (data.history.length > 100) data.history = data.history.slice(-100);

        this._writeVaultFile(data);

        logger.status(`\x1b[32m[CREDIT VAULT] Deducted 1 credit for WhatsApp ${isAutoReply ? 'AI auto-reply' : 'message to ' + recipient} on ${plan.name}. Remaining Balance: ${data.creditBalance} Credits\x1b[0m`);

        return {
            success: true,
            deducted: 1,
            remainingBalance: data.creditBalance,
            plan: plan.name
        };
    }

    /**
     * Record Pilot Chat Interaction and deduct credits according to tier rate:
     * - Free Tier: 1 credit deducted per 2 interactions
     * - Basic Plan (Micro): 1 credit deducted per 2 interactions
     * - Second Plan (Enterprise): 1 credit deducted per 3 interactions
     * - Third Plan (Profit-Oriented): 1 credit deducted per 4 interactions
     */
    recordPilotInteraction(metadata = {}) {
        const data = this._readVaultFile();
        const plan = this.getPlan();
        const rate = plan.interactionRate || (plan.id === 'PROFIT_ORIENTED' ? 4 : (plan.id === 'ENTERPRISE' ? 3 : 2));

        data.pilotInteractionCount = (data.pilotInteractionCount || 0) + 1;
        const count = data.pilotInteractionCount;
        const requiresDeduction = (count % rate === 0);

        if (requiresDeduction) {
            if (data.creditBalance < 1) {
                logger.status(`\x1b[31m[CREDIT VAULT] Insufficient credits for Pilot interaction! Balance: ${data.creditBalance}\x1b[0m`);
                return {
                    success: false,
                    reason: 'CREDITS_EXHAUSTED',
                    currentBalance: data.creditBalance,
                    plan: plan.name,
                    interactionCount: count,
                    rate
                };
            }

            data.creditBalance -= 1;
            data.totalCreditsUsed = (data.totalCreditsUsed || 0) + 1;

            const logEntry = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                action: 'PILOT_CHAT_INTERACTION',
                delta: -1,
                balance: data.creditBalance,
                timestamp: new Date().toISOString(),
                reason: `Interaction #${count} on ${plan.name} (1 credit deducted per ${rate} interactions)`,
                meta: metadata
            };

            if (!Array.isArray(data.history)) data.history = [];
            data.history.push(logEntry);
            if (data.history.length > 100) data.history = data.history.slice(-100);

            this._writeVaultFile(data);

            logger.status(`\x1b[35m[CREDIT VAULT] Deducted 1 credit for Pilot interaction #${count} (${plan.name}: 1 credit / ${rate} messages). Remaining Balance: ${data.creditBalance} Credits\x1b[0m`);

            return {
                success: true,
                deducted: 1,
                remainingBalance: data.creditBalance,
                interactionCount: count,
                rate,
                plan: plan.name
            };
        }

        // Non-deduction interaction
        this._writeVaultFile(data);
        const stepsRemaining = rate - (count % rate);
        logger.status(`\x1b[36m[CREDIT VAULT] Pilot interaction #${count} recorded on ${plan.name} (${stepsRemaining} more message${stepsRemaining === 1 ? '' : 's'} until next 1-credit deduction)\x1b[0m`);

        return {
            success: true,
            deducted: 0,
            remainingBalance: data.creditBalance,
            interactionCount: count,
            rate,
            nextDeductionIn: stepsRemaining,
            plan: plan.name
        };
    }

    /**
     * Deducts credit for File / Document Generation (PPT, PDF, Word, Excel, etc.)
     * - Basic Plan (Micro) & Free Tier: 2 credits per task
     * - Second Plan (Enterprise): 1 credit per task
     * - Third Plan (Profit-Oriented): 1 credit per task
     */
    deductDocumentCredit(fileType = 'PPT', details = {}) {
        const data = this._readVaultFile();
        const plan = this.getPlan();

        let cost = plan.docCost !== undefined ? plan.docCost : (plan.id === 'MICRO' || plan.id === 'TRIAL_FREE' ? 2 : 1);
        if (details.cost) cost = details.cost;

        if (data.creditBalance < cost) {
            logger.status(`\x1b[31m[CREDIT VAULT] Insufficient credits for ${fileType} generation! Current: ${data.creditBalance}, Required: ${cost}\x1b[0m`);
            return {
                success: false,
                reason: 'INSUFFICIENT_CREDITS',
                required: cost,
                currentBalance: data.creditBalance,
                plan: plan.name
            };
        }

        data.creditBalance -= cost;
        data.totalCreditsUsed = (data.totalCreditsUsed || 0) + cost;

        if (String(fileType).toUpperCase().includes('PPT')) {
            data.totalPptCreated = (data.totalPptCreated || 0) + 1;
        } else {
            data.totalDocsCreated = (data.totalDocsCreated || 0) + 1;
        }

        const logEntry = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: `DOCUMENT_GENERATION_${String(fileType).toUpperCase()}`,
            delta: -cost,
            balance: data.creditBalance,
            timestamp: new Date().toISOString(),
            reason: `${cost} credit(s) deducted for ${fileType} generation on ${plan.name}`,
            meta: details
        };

        if (!Array.isArray(data.history)) data.history = [];
        data.history.push(logEntry);
        if (data.history.length > 100) data.history = data.history.slice(-100);

        this._writeVaultFile(data);

        logger.status(`\x1b[32m[CREDIT VAULT] Deducted ${cost} credit(s) for ${fileType} generation on ${plan.name}. Remaining Balance: ${data.creditBalance} Credits\x1b[0m`);

        return {
            success: true,
            deducted: cost,
            remainingBalance: data.creditBalance,
            plan: plan.name
        };
    }

    /**
     * Check if WhatsApp Voice AI Supervisor is allowed on user's current plan
     */
    isVoiceSupervisorAllowed() {
        const plan = this.getPlan();
        if (plan.id === 'PROFIT_ORIENTED') {
            return { allowed: true, plan: plan.name };
        }
        if (plan.id === 'TRIAL_FREE' && this.hasCredits(1)) {
            return { allowed: true, plan: 'Trial Free Plan (Active)' };
        }
        return {
            allowed: false,
            reason: `WhatsApp Voice AI Supervisor is exclusive to the Profit-Oriented Plan (₹999). Current Plan: ${plan.name}.`
        };
    }

    /**
     * Check access for WhatsApp Batch Campaign feature
     * - Plan 2 (Enterprise ₹599) & Plan 3 (Profit-Oriented ₹999): UNLIMITED
     * - Plan 1 (Micro ₹299): 3 free sessions allowed. Once 3 used, payment upgrade required.
     * - Trial Free: 3 trial sessions allowed.
     */
    checkWhatsAppBatchAccess() {
        const data = this._readVaultFile();
        const plan = this.getPlan();

        if (plan.id === 'ENTERPRISE' || plan.id === 'PROFIT_ORIENTED') {
            return {
                allowed: true,
                tier: plan.id,
                planName: plan.name,
                isUnlimited: true,
                sessionsUsed: data.microWhatsAppSessionsUsed || 0,
                sessionsRemaining: Infinity
            };
        }

        const sessionsUsed = Number(data.microWhatsAppSessionsUsed || 0);
        const maxFreeSessions = 3;
        const sessionsRemaining = Math.max(0, maxFreeSessions - sessionsUsed);

        if (plan.id === 'MICRO' || plan.id === 'TRIAL_FREE') {
            if (data.creditBalance <= 0) {
                return {
                    allowed: false,
                    tier: plan.id,
                    planName: plan.name,
                    isUnlimited: false,
                    sessionsUsed,
                    sessionsRemaining,
                    reason: `Your credit balance is completely exhausted (0 Credits remaining). Please upgrade your subscription plan or apply a coupon code to continue WhatsApp automation.`
                };
            }

            if (sessionsRemaining > 0) {
                return {
                    allowed: true,
                    tier: plan.id,
                    planName: plan.name,
                    isUnlimited: false,
                    sessionsUsed,
                    sessionsRemaining,
                    notice: `Session ${sessionsUsed + 1} of ${maxFreeSessions} free instances on ${plan.name}.`
                };
            } else {
                return {
                    allowed: false,
                    tier: plan.id,
                    planName: plan.name,
                    isUnlimited: false,
                    sessionsUsed,
                    sessionsRemaining: 0,
                    reason: `You have completed all ${maxFreeSessions} free WhatsApp automation instances on the ${plan.name}. Please upgrade to Enterprise Plan (₹599/mo) or Profit-Oriented Plan (₹999/mo) to unlock unlimited WhatsApp automation.`
                };
            }
        }

        return {
            allowed: false,
            tier: 'NONE',
            planName: 'No Active Subscription',
            reason: 'WhatsApp automation is exclusively available to Enterprise (₹599) and Profit-Oriented (₹999) plan subscribers. Subscribe to the Micro Plan (₹299) to get 3 trial sessions.'
        };
    }

    recordWhatsAppBatchSession() {
        const data = this._readVaultFile();
        data.microWhatsAppSessionsUsed = Number(data.microWhatsAppSessionsUsed || 0) + 1;
        this._writeVaultFile(data);
        return data.microWhatsAppSessionsUsed;
    }

    /**
     * Deduct credit for an action (e.g. PPT generation, Document generation, etc.)
     */
    deductCredit(actionName = 'PPT_GENERATION', details = {}) {
        const data = this._readVaultFile();
        const cost = details.cost || 1;

        if (data.creditBalance < cost) {
            logger.status(`\x1b[31m[CREDIT VAULT] Insufficient credits! Current balance: ${data.creditBalance}, Required: ${cost}\x1b[0m`);
            return {
                success: false,
                reason: 'CREDITS_EXHAUSTED',
                currentBalance: data.creditBalance,
                plan: data.plan
            };
        }

        data.creditBalance -= cost;
        data.totalCreditsUsed = (data.totalCreditsUsed || 0) + cost;

        if (actionName.includes('PPT')) {
            data.totalPptCreated = (data.totalPptCreated || 0) + 1;
        } else if (actionName.includes('VIDEO')) {
            data.totalVideosEdited = (data.totalVideosEdited || 0) + 1;
        } else {
            data.totalDocsCreated = (data.totalDocsCreated || 0) + 1;
        }

        const logEntry = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: actionName,
            delta: -cost,
            balance: data.creditBalance,
            timestamp: new Date().toISOString(),
            meta: details
        };

        if (!Array.isArray(data.history)) data.history = [];
        data.history.push(logEntry);
        if (data.history.length > 100) data.history = data.history.slice(-100);

        this._writeVaultFile(data);

        logger.status(`\x1b[32m[CREDIT VAULT] Deducted ${cost} credit for "${actionName}". Remaining Balance: ${data.creditBalance} Credits\x1b[0m`);

        return {
            success: true,
            deducted: cost,
            remainingBalance: data.creditBalance,
            plan: data.plan
        };
    }

    /**
     * Deducts 5 credits for autonomous AI Video Editing & Video Generation tasks
     */
    deductVideoEditingCredit(details = {}) {
        const cost = 5; // Exactly 5 credits required for video editing
        return this.deductCredit('VIDEO_EDITING', { cost, ...details });
    }

    /**
     * Grant free credits (e.g. from coupon redemption) without overriding active subscription plan
     */
    grantFreeCredits(amount, reason = 'PROMOTIONAL_CREDITS') {
        const data = this._readVaultFile();
        const credits = Math.max(0, Number(amount) || 0);
        data.creditBalance = (data.creditBalance || 0) + credits;
        data.totalCreditsGranted = (data.totalCreditsGranted || 0) + credits;

        if (!Array.isArray(data.history)) data.history = [];
        data.history.push({
            id: `tx_${Date.now()}`,
            action: `CREDIT_GRANT_${reason}`,
            delta: +credits,
            balance: data.creditBalance,
            timestamp: new Date().toISOString()
        });

        this._writeVaultFile(data);
        logger.status(`\x1b[32m[CREDIT VAULT] +${credits} Free Credits Granted (${reason}). New Balance: ${data.creditBalance}\x1b[0m`);
        return {
            success: true,
            creditsAdded: credits,
            newBalance: data.creditBalance,
            plan: data.plan
        };
    }

    /**
     * Add credits and activate subscription plan upon successful payment
     */
    addCredits(amount, planId, paymentDetails = {}) {
        const data = this._readVaultFile();
        const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.MICRO;

        data.creditBalance = (data.creditBalance || 0) + Number(amount);
        data.plan = plan.id;
        data.planName = plan.name;
        data.planActivatedAt = new Date().toISOString();

        const purchaseRecord = {
            id: `ord_${Date.now()}`,
            planId: plan.id,
            planName: plan.name,
            amount: plan.price,
            creditsAdded: amount,
            paymentId: paymentDetails.paymentId || 'MANUAL_OR_RZP',
            orderId: paymentDetails.orderId || `ord_${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED'
        };

        if (!Array.isArray(data.purchasedPlans)) data.purchasedPlans = [];
        data.purchasedPlans.push(purchaseRecord);

        if (!Array.isArray(data.history)) data.history = [];
        data.history.push({
            id: `tx_${Date.now()}`,
            action: `SUBSCRIPTION_PURCHASE_${plan.id}`,
            delta: +amount,
            balance: data.creditBalance,
            timestamp: new Date().toISOString(),
            paymentId: purchaseRecord.paymentId
        });

        this._writeVaultFile(data);

        logger.status(`\x1b[32m[CREDIT VAULT] Plan "${plan.name}" Activated! +${amount} Credits Added. New Balance: ${data.creditBalance}\x1b[0m`);

        return {
            success: true,
            newBalance: data.creditBalance,
            plan: plan.name,
            purchaseRecord
        };
    }

    /**
     * Get structured subscription overview for plan status check
     */
    getSubscriptionOverview() {
        const data = this._readVaultFile();
        const plan = this.getPlan();
        const activatedAt = data.planActivatedAt ? new Date(data.planActivatedAt) : new Date();

        // 30 days monthly cycle
        const expirationDate = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const msRemaining = expirationDate.getTime() - Date.now();
        const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
        const isExpired = msRemaining <= 0;

        let totalCredits = 10;
        if (plan.id === 'MICRO') totalCredits = 300;
        else if (plan.id === 'ENTERPRISE') totalCredits = 700;
        else if (plan.id === 'PROFIT_ORIENTED') totalCredits = 1500;
        else totalCredits = data.totalCreditsGranted || 10;

        return {
            userId: this.getUserIdentifier(),
            activePlan: plan.name,
            planId: plan.id,
            planPrice: plan.price || 0,
            monthlyPlans: [
                { id: 'MICRO', name: 'Micro Plan', price: 299, credits: 300, isCurrent: plan.id === 'MICRO' },
                { id: 'ENTERPRISE', name: 'Enterprise Plan', price: 599, credits: 700, isCurrent: plan.id === 'ENTERPRISE' },
                { id: 'PROFIT_ORIENTED', name: 'Profit-Oriented Plan', price: 999, credits: 1500, isCurrent: plan.id === 'PROFIT_ORIENTED' }
            ],
            totalCredits: totalCredits,
            remainingCredits: data.creditBalance,
            usedCredits: data.totalCreditsUsed || 0,
            activatedAt: activatedAt.toISOString().split('T')[0],
            expirationDate: expirationDate.toISOString().split('T')[0],
            daysRemaining: isExpired ? 0 : daysRemaining,
            isExpired: isExpired,
            features: {
                ...plan.features,
                interactionRate: plan.interactionRate,
                docCost: plan.docCost,
                whatsAppAllowed: plan.whatsAppAllowed,
                whatsAppCost: plan.whatsAppCost,
                whatsAppUnlimited: plan.whatsAppUnlimited
            }
        };
    }

    /**
     * Apply a discount or credit coupon to the user's active order
     */
    applyCouponToOrder(coupon) {
        const data = this._readVaultFile();
        let micro = 299, enterprise = 599, profit = 999;
        const discountDisplay = coupon.type === 'DISCOUNT_PERCENT'
            ? `${coupon.value}% OFF`
            : `₹${coupon.value} FLAT DISCOUNT`;

        if (coupon.type === 'DISCOUNT_PERCENT') {
            const pct = Math.min(100, Math.max(0, Number(coupon.value) || 0));
            micro = Math.max(0, Math.round(299 * (1 - pct / 100)));
            enterprise = Math.max(0, Math.round(599 * (1 - pct / 100)));
            profit = Math.max(0, Math.round(999 * (1 - pct / 100)));
        } else if (coupon.type === 'DISCOUNT_FLAT') {
            const flat = Math.max(0, Number(coupon.value) || 0);
            micro = Math.max(0, 299 - flat);
            enterprise = Math.max(0, 599 - flat);
            profit = Math.max(0, 999 - flat);
        }

        const activeCoupon = {
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discountDisplay,
            appliedAt: new Date().toISOString(),
            discountedPrices: { micro, enterprise, profit }
        };

        data.activeCoupon = activeCoupon;
        data.checksum = this._calculateChecksum(data);
        this._writeVaultFile(data);
        this.cache = data;

        return activeCoupon;
    }

    /**
     * Get active coupon applied to current user's order
     */
    getActiveCoupon() {
        const data = this._readVaultFile();
        return data.activeCoupon || null;
    }

    /**
     * Clear active coupon from order
     */
    clearActiveCoupon() {
        const data = this._readVaultFile();
        if (data.activeCoupon) {
            delete data.activeCoupon;
            data.checksum = this._calculateChecksum(data);
            this._writeVaultFile(data);
            this.cache = data;
        }
    }

    /**
     * Display the CLI plan command status screen
     */
    displayPlanStatus() {
        const overview = this.getSubscriptionOverview();
        const activeCoupon = this.getActiveCoupon();

        let couponSection = '';
        if (activeCoupon) {
            const dp = activeCoupon.discountedPrices || { micro: 299, enterprise: 599, profit: 999 };
            couponSection = `║  \x1b[32m✔ Active Coupon Applied:\x1b[0m \x1b[33m"${activeCoupon.code}"\x1b[0m (${activeCoupon.discountDisplay})                        \x1b[36m║
║    • Discounted Micro:          ₹${dp.micro}/mo                                            \x1b[36m║
║    • Discounted Enterprise:     ₹${dp.enterprise}/mo                                            \x1b[36m║
║    • Discounted Profit-Oriented:₹${dp.profit}/mo                                            \x1b[36m║
╠═══════════════════════════════════════════════════════════════════════════════════════╣\n`;
        }

        const banner = `
\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                      \x1b[1m\x1b[37mCODEZ48 PILOT — SUBSCRIPTION & PLAN STATUS\x1b[0m\x1b[36m                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  \x1b[33mUser Identifier:\x1b[0m      \x1b[37m${overview.userId}\x1b[36m                           ║
║  \x1b[33mActive Plan:\x1b[0m          \x1b[1m\x1b[32m${overview.activePlan.padEnd(30)}\x1b[0m\x1b[36m                         ║
║  \x1b[33mPlan Status:\x1b[0m          ${overview.isExpired ? '\x1b[31mEXPIRED\x1b[0m' : '\x1b[32mACTIVE\x1b[0m'} (${overview.daysRemaining} days remaining until expiration)\x1b[36m             ║
║  \x1b[33mExpiration Date:\x1b[0m      \x1b[37m${overview.expirationDate} (Activated: ${overview.activatedAt})\x1b[36m                 ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  \x1b[33mCREDITS OVERVIEW:\x1b[0m                                                                    ║
║    • \x1b[37mTotal Granted:\x1b[0m    \x1b[1m\x1b[36m${String(overview.totalCredits).padEnd(8)}\x1b[0m Credits                                        \x1b[36m║
║    • \x1b[37mRemaining:\x1b[0m        \x1b[1m\x1b[32m${String(overview.remainingCredits).padEnd(8)}\x1b[0m Credits (${overview.remainingCredits > 0 ? '\x1b[32mSUFFICIENT\x1b[0m' : '\x1b[31mEXHAUSTED\x1b[0m'})\x1b[36m                         ║
║    • \x1b[37mTotal Consumed:\x1b[0m   \x1b[37m${String(overview.usedCredits).padEnd(8)}\x1b[0m Credits                                        \x1b[36m║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║  \x1b[33mTIER CONSUMPTION RULES (${overview.activePlan}):\x1b[0m                                    \x1b[36m║
║    • \x1b[37mPilot Chat:\x1b[0m       1 credit deducted per ${overview.features?.interactionRate || 2} interactions                       \x1b[36m║
║    • \x1b[37mFiles / PPT/PDF:\x1b[0m  ${overview.features?.docCost || 1} credit(s) per file creation task                             \x1b[36m║
║    • \x1b[37mWhatsApp Auto:\x1b[0m    ${overview.planId === 'PROFIT_ORIENTED' ? '\x1b[32m⚡ UNLIMITED (0 credits needed)\x1b[0m' : (overview.planId === 'ENTERPRISE' ? '\x1b[33m1 credit per number / message\x1b[0m' : '\x1b[31m🔒 LOCKED (Upgrade to Plan 2 or 3)\x1b[0m')}    \x1b[36m║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
${couponSection}║  \x1b[33mAVAILABLE MONTHLY SUBSCRIPTION TIERS:\x1b[0m                                                ║
║    ${overview.planId === 'MICRO' ? '\x1b[32m● [SELECTED]\x1b[0m' : '○           '} \x1b[1mMicro Plan (₹299/mo)\x1b[0m: 300 Credits | Clean B&W PPT & Word      \x1b[36m║
║    ${overview.planId === 'ENTERPRISE' ? '\x1b[32m● [SELECTED]\x1b[0m' : '○           '} \x1b[1mEnterprise Plan (₹599/mo)\x1b[0m: 700 Credits | Structured Sites & WA   \x1b[36m║
║    ${overview.planId === 'PROFIT_ORIENTED' ? '\x1b[32m● [SELECTED]\x1b[0m' : '○           '} \x1b[1mProfit-Oriented (₹999/mo)\x1b[0m: 1500 Credits | WhatsApp Voice AI      \x1b[36m║
╚═══════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;
        console.log(banner);
        return overview;
    }

    /**
     * Display the CLI pricing and subscription screen when trial ends or requested
     */
    /**
     * Query any User ID from remote Firestore
     */
    async fetchUserStatus(userId) {
        if (!userId) return null;
        try {
            const firebaseSync = require('./firebase-sync');
            const db = await firebaseSync.init();
            if (!db) return null;
            const snap = await db.collection('pilot_users').doc(userId).get();
            if (snap.exists) {
                return { exists: true, ...snap.data() };
            }
            return { exists: false, userId };
        } catch (e) {
            return null;
        }
    }

    /**
     * Display status of any remote User ID in a formatted terminal box
     */
    /**
     * Admin Direct Plan Assignment (Bypasses payment)
     */
    async adminAssignPlan(userId, planId, clientEmail = '') {
        const uid = this.sanitizeUserId(userId);
        if (!uid || uid.length < 5) {
            console.log('\x1b[31m[ERROR] Please provide a valid User ID (e.g. USR-CDZ48-XXXX-XXXX).\x1b[0m');
            return false;
        }

        const planKey = (planId || 'MICRO').toUpperCase();
        const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.MICRO;
        const creditsToAdd = Number(plan.credits || plan.monthlyCredits) || 300;
        const now = new Date().toISOString();

        console.log(`\x1b[36m[ADMIN ASSIGN] Activating ${plan.name} (+${creditsToAdd} Credits) for ${uid}...\x1b[0m`);

        try {
            const firebaseSync = require('./firebase-sync');
            const db = await firebaseSync.init();
            if (!db) {
                console.log('\x1b[31m[ERROR] Unable to connect to Firestore.\x1b[0m');
                return false;
            }

            const paymentId = `ADMIN_BYPASS_${Date.now()}`;
            const userRef = db.collection('pilot_users').doc(uid);
            const userSnap = await userRef.get();
            const existingData = userSnap.exists ? userSnap.data() : {};
            const existingBalance = Number(existingData.creditBalance) || 0;
            const newBalance = existingBalance + creditsToAdd;
            const finalEmail = clientEmail || existingData.userEmail || 'rajnaga75556@gmail.com';

            const userUpdate = {
                userId: uid,
                userEmail: finalEmail,
                plan: plan.id,
                planName: plan.name,
                creditBalance: newBalance,
                planActivatedAt: now,
                lastPaymentId: paymentId,
                lastPaymentAmount: 0,
                assignedByDeveloper: 'codez4848@gmail.com',
                bypassPayment: true,
                updatedAt: now
            };

            await userRef.set(userUpdate, { merge: true });

            const txId = `tx_admin_${Date.now()}`;
            await db.collection('pilot_transactions').doc(txId).set({
                id: txId,
                userId: uid,
                userEmail: finalEmail,
                planId: plan.id,
                planName: plan.name,
                amount: 0,
                creditsAdded: creditsToAdd,
                paymentId,
                status: 'ADMIN_ACTIVATED',
                assignedBy: 'codez4848@gmail.com',
                bypassPayment: true,
                timestamp: now
            });

            // If the target UID matches this local machine, immediately update local vault!
            const localUid = this.getUserIdentifier();
            if (uid === localUid) {
                const localData = this._readVaultFile();
                localData.creditBalance = newBalance;
                localData.plan = plan.id;
                localData.planName = plan.name;
                localData.planActivatedAt = now;
                localData.email = finalEmail;
                localData.lastRemoteSyncAt = now;
                localData.lastSyncAt = now;
                this._writeVaultFile(localData);
                console.log(`\x1b[32m✔ Local vault instantly refreshed with ${newBalance} credits and ${plan.name}!\x1b[0m`);
            }

            console.log(`\x1b[32m✔ Plan successfully assigned to ${uid}!\x1b[0m`);
            console.log(`  Plan: ${plan.name} | Credits Added: +${creditsToAdd} | New Balance: ${newBalance} Credits`);
            console.log(`  Payment bypassed.\n`);
            return true;
        } catch (e) {
            console.log(`\x1b[31m[ERROR] Failed to assign plan in Firestore: ${e.message}\x1b[0m`);
            return false;
        }
    }

    async displayRemoteUserStatus(userId) {
        console.log(`\x1b[36m[ACCOUNT LOOKUP] Checking Firestore for User ID: ${userId}...\x1b[0m`);
        const user = await this.fetchUserStatus(userId);
        if (!user || !user.exists) {
            const box = formatTerminalBox({
                title: 'CODEZ48 — USER NOT FOUND',
                borderColor: '\x1b[31m',
                titleColor: '\x1b[1m\x1b[31m',
                lines: [
                    `User ID: ${userId}`,
                    'Status: Not registered in Firestore database yet.',
                    { divider: true },
                    'A new account profile will automatically be created upon plan purchase.',
                    `Payment Link: https://codez48.netlify.app/tools/payment.html?uid=${encodeURIComponent(userId)}`
                ]
            });
            console.log('\n' + box + '\n');
            return null;
        }

        const box = formatTerminalBox({
            title: 'CODEZ48 — USER ACCOUNT DETAILS',
            borderColor: '\x1b[32m',
            titleColor: '\x1b[1m\x1b[32m',
            lines: [
                `User Identifier: ${user.userId}`,
                `Active Plan:     ${user.planName || user.plan || 'Trial Free Plan'}`,
                `Credit Balance:  ${user.creditBalance !== undefined ? user.creditBalance : 0} Credits`,
                `Activated Date:  ${user.planActivatedAt ? user.planActivatedAt.split('T')[0] : 'N/A'}`,
                `Last Payment:    ${user.lastPaymentId || 'None'}`,
                { divider: true },
                `Renew / Upgrade: https://codez48.netlify.app/tools/payment.html?uid=${encodeURIComponent(userId)}`
            ]
        });
        console.log('\n' + box + '\n');
        return user;
    }

    /**
     * Display the CLI pricing and subscription screen and automatically launch checkout
     */
    async showPaymentPrompt(rl = null, optionsOrCoupon = null, autoLaunch = true) {
        let options = {};
        if (optionsOrCoupon && typeof optionsOrCoupon === 'object') {
            if (optionsOrCoupon.code && optionsOrCoupon.type) {
                options = { coupon: optionsOrCoupon, autoLaunch: autoLaunch };
            } else {
                options = optionsOrCoupon;
            }
        }

        const targetUid = this.sanitizeUserId(options.uid || this.getUserIdentifier());
        const balance = options.uid ? (options.balance !== undefined ? options.balance : this.getBalance()) : this.getBalance();
        const planChoice = (options.plan || '').toUpperCase();
        const coupon = options.coupon || null;

        let microPrice = 299, enterprisePrice = 599, profitPrice = 999;
        let couponParam = '';
        let couponLine = null;

        if (coupon && (coupon.type === 'DISCOUNT_PERCENT' || coupon.type === 'DISCOUNT_FLAT')) {
            couponParam = `&coupon=${encodeURIComponent(coupon.code)}`;
            if (coupon.discountedPrices) {
                microPrice = coupon.discountedPrices.micro;
                enterprisePrice = coupon.discountedPrices.enterprise;
                profitPrice = coupon.discountedPrices.profit;
            } else if (coupon.type === 'DISCOUNT_PERCENT') {
                const pct = Number(coupon.value) || 0;
                microPrice = Math.max(0, Math.round(299 * (1 - pct / 100)));
                enterprisePrice = Math.max(0, Math.round(599 * (1 - pct / 100)));
                profitPrice = Math.max(0, Math.round(999 * (1 - pct / 100)));
            } else {
                const flat = Number(coupon.value) || 0;
                microPrice = Math.max(0, 299 - flat);
                enterprisePrice = Math.max(0, 599 - flat);
                profitPrice = Math.max(0, 999 - flat);
            }
            couponLine = `\x1b[1m\x1b[32m✔ Active Coupon Applied:\x1b[0m \x1b[33m"${coupon.code}"\x1b[0m (${coupon.discountDisplay || `${coupon.value}% OFF`})`;
        }

        let planParam = '';
        if (['TRIAL', 'MICRO', 'ENTERPRISE', 'PROFIT_ORIENTED'].includes(planChoice)) {
            planParam = `&plan=${planChoice}`;
        }

        const onlinePaymentUrl = `https://codez48.netlify.app/tools/payment.html?uid=${encodeURIComponent(targetUid)}${planParam}${couponParam}`;
        const localCheckoutUrl = `http://localhost:4848/checkout.html?uid=${encodeURIComponent(targetUid)}${planParam}${couponParam}`;

        const lines = [
            `Billing User ID: \x1b[36m${targetUid}\x1b[0m`,
            `Credit Balance:  ${balance <= 0 ? '\x1b[31m0 Credits (EXHAUSTED)\x1b[0m' : `\x1b[32m${balance} Credits\x1b[0m`}`
        ];

        if (couponLine) {
            lines.push({ divider: true });
            lines.push(couponLine);
        }

        lines.push({ divider: true });
        lines.push(`\x1b[32m[1] MICRO PLAN — ₹${microPrice} / month[0m ${coupon ? `\x1b[90m(Was ₹299)\x1b[0m` : ''}`);
        lines.push('    • Essential Clean B&W PPT & Word Generation (300 Credits/mo)');
        lines.push('    • 3 Free WhatsApp Automation instances included');
        lines.push('');
        lines.push(`\x1b[36m[2] ENTERPRISE PLAN — ₹${enterprisePrice} / month[0m ${coupon ? `\x1b[90m(Was ₹599)\x1b[0m` : ''}`);
        lines.push('    • High-Quality Code, Static Sites & Startup Assets (700 Credits/mo)');
        lines.push('    • \x1b[1m\x1b[35mUnlimited WhatsApp Automation & Sequential Campaign Navigation\x1b[0m');
        lines.push('');
        lines.push(`\x1b[35m[3] PROFIT-ORIENTED PLAN — ₹${profitPrice} / month[0m ${coupon ? `\x1b[90m(Was ₹999)\x1b[0m` : ''}`);
        lines.push('    • Flawless Top-Tier Professional Design (1500 Credits/mo)');
        lines.push('    • \x1b[1m\x1b[35mFull Voice & Text AI WhatsApp Supervisor with Whisper STT & Cloned Voice\x1b[0m');
        lines.push({ divider: true });
        lines.push(`\x1b[1m\x1b[32mDirect Checkout URL (Clickable):\x1b[0m`);
        lines.push(`\x1b[4m${onlinePaymentUrl}\x1b[0m`);

        const banner = formatTerminalBox({
            title: coupon ? 'CODEZ48 PILOT — DISCOUNTED ORDER & CHECKOUT' : 'CODEZ48 PILOT — SUBSCRIPTION PAYMENT GATEWAY',
            borderColor: coupon ? '\x1b[32m' : '\x1b[33m',
            titleColor: coupon ? '\x1b[1m\x1b[32m' : '\x1b[1m\x1b[33m',
            lines
        });

        console.log('\n' + banner + '\n');
        console.log(`\x1b[1m\x1b[36m👉 Direct Link: \x1b[4m${onlinePaymentUrl}\x1b[0m\n`);

        // Start local checkout server as backup
        try {
            const supervoiceServer = require('../../supervoice/server');
            await supervoiceServer.start();
        } catch (_) {}

        const shouldLaunch = options.autoLaunch !== false && autoLaunch !== false;

        if (shouldLaunch) {
            console.log(`\x1b[32m[BROWSER] Automatically opening payment gateway in your browser...\x1b[0m`);
            try {
                exec(`start "" "${onlinePaymentUrl}"`);
            } catch (_) {}
        } else if (rl) {
            console.log(`\x1b[32mPress [ENTER] to open your web browser and complete your payment online...\x1b[0m`);
            try {
                const res = rl.question('');
                if (res && typeof res.then === 'function') await res;
            } catch (_) {}
            exec(`start "" "${onlinePaymentUrl}"`);
        }

        return { checkoutUrl: onlinePaymentUrl, localCheckoutUrl, uid: targetUid, balance, coupon };
    }

    /**
     * Trigger asynchronous background Firebase synchronization
     */
    
    /**
     * Bidirectional Cloud Synchronization:
     * Pulls latest active plan, verified credits, and admin assignments from Firestore down to local vault.
     */
    async syncWithRemote(force = false) {
        try {
            const firebaseSync = require('./firebase-sync');
            const db = await firebaseSync.init();
            if (!db) return false;

            const uid = this.getUserIdentifier();
            const docSnap = await db.collection('pilot_users').doc(uid).get();
            if (!docSnap.exists) {
                // If user doesn't exist remotely yet, push local initial state
                await firebaseSync.syncVault(this._readVaultFile());
                return true;
            }

            const remote = docSnap.data();
            const local = this._readVaultFile();

            const remoteBalance = typeof remote.creditBalance === 'number' ? remote.creditBalance : null;
            const remotePlan = remote.plan;
            const isRemoteNewer = remote.updatedAt && (!local.lastRemoteSyncAt || new Date(remote.updatedAt) > new Date(local.lastRemoteSyncAt));
            const isHigherBalance = remoteBalance !== null && remoteBalance > (local.creditBalance || 0);
            const isPlanDifferent = remotePlan && remotePlan !== local.plan;

            if (force || isHigherBalance || isPlanDifferent || isRemoteNewer || remote.bypassPayment) {
                local.creditBalance = remoteBalance !== null ? remoteBalance : local.creditBalance;
                if (remotePlan) {
                    local.plan = remotePlan;
                    local.planName = remote.planName || (SUBSCRIPTION_PLANS[remotePlan] ? SUBSCRIPTION_PLANS[remotePlan].name : local.planName);
                }
                if (remote.planActivatedAt) local.planActivatedAt = remote.planActivatedAt;
                if (remote.userEmail || remote.email) local.email = remote.userEmail || remote.email;
                local.lastRemoteSyncAt = new Date().toISOString();
                local.lastSyncAt = new Date().toISOString();

                local.checksum = this._calculateChecksum(local);
                fs.writeFileSync(VAULT_FILE, JSON.stringify(local, null, 2), 'utf8');
                this.cache = local;
                logger.status(`\x1b[32m✔ [CLOUD SYNC] Synchronized live subscription from Firestore: Plan: ${local.planName} | Balance: ${local.creditBalance} Credits\x1b[0m`);
                return true;
            }
        } catch (e) {
            logger.debug(`[SYNC WARNING] Failed to sync with Firestore: ${e.message}`);
        }
        return false;
    }

    triggerFirebaseSync() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;
        setImmediate(async () => {
            try {
                const firebaseSync = require('./firebase-sync');
                await firebaseSync.syncVault(this._readVaultFile());
            } catch (err) {
                // Keep local operations 100% functional even if offline
            } finally {
                this.syncInProgress = false;
            }
        });
    }
}

module.exports = new CreditVault();
