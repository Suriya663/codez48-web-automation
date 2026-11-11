/**
 * CODEZ48 PILOT BUSINESS SERVICES & AI AUTOMATION ADAPTER
 *
 * Retrieves and presents business profile, offered services, service descriptions,
 * best services, stock thresholds, and low-stock sentinel alerts from Firebase Firestore.
 *
 * Triggers on user inquiries like:
 * - "இந்த பிசினஸ் ப்ராடக்ட் பத்தி எனக்கு டீடைல்ஸ் கொடுக்கணும்"
 * - "எங்கள் பிசினஸ் சர்வீசஸ் என்னென்ன?"
 * - "show business services and best products"
 * - "list our services and stock thresholds"
 */

'use strict';

const logger = require('../../core/logger');
const firebaseSync = require('../../core/firebase-sync');

class BusinessServicesAdapter {
    constructor() {
        this.defaultBusiness = {
            brand: "NS Handlooms & Codez48 Enterprise",
            owner: "Suriya Prakash",
            mobile: "+91 8248482844",
            email: "rajnaga75556@gmail.com",
            website: "https://codez48.netlify.app",
            services: [
                "Pure Silk Handloom Weaving",
                "Custom Bridal Zari & Motif Designing",
                "Wholesale Saree & Textile Distribution",
                "Direct Manufacturer Pricing & Fast Shipping",
                "24/7 Dedicated Customer Care & VIP Support"
            ],
            serviceDescriptions: "We specialize in authentic handloom silk weaving, traditional Kanchipuram bridal pattu sarees with pure gold and silver zari, bulk wholesale supply, and express worldwide delivery with 100% quality assurance.",
            bestServices: "Traditional Kanchipuram Bridal Pattu & Custom Made-to-Order Wedding Collections",
            stockThreshold: 5,
            lowStockSentence: "⚠️ Fast Selling Alert! Limited exclusive pieces left in inventory. Order now to secure yours.",
            aiCustomInstructions: "Welcome customers politely in Tamil and English, highlight our best handloom sarees, explain fabric quality, and guide them smoothly through checkout."
        };
    }

    /**
     * Queries Firestore for latest business services & automations
     */
    async fetchBusinessData() {
        try {
            const db = await firebaseSync.init({ showLoading: false });
            if (!db) return this.defaultBusiness;

            // 1. Try finding in service_automations
            const autoSnap = await db.collection('service_automations')
                .where('type', '==', 'BUSINESS_SERVICES')
                .limit(1)
                .get();

            if (!autoSnap.empty) {
                const autoDoc = autoSnap.docs[0].data();
                if (autoDoc.config) {
                    return {
                        brand: autoDoc.config.brand || autoDoc.name || this.defaultBusiness.brand,
                        owner: autoDoc.config.owner || this.defaultBusiness.owner,
                        mobile: autoDoc.config.mobile || this.defaultBusiness.mobile,
                        email: autoDoc.config.email || this.defaultBusiness.email,
                        website: autoDoc.config.website || this.defaultBusiness.website,
                        services: Array.isArray(autoDoc.config.services) && autoDoc.config.services.length > 0
                            ? autoDoc.config.services
                            : this.defaultBusiness.services,
                        serviceDescriptions: autoDoc.config.serviceDescriptions || this.defaultBusiness.serviceDescriptions,
                        bestServices: autoDoc.config.bestServices || this.defaultBusiness.bestServices,
                        stockThreshold: autoDoc.config.stockThreshold || this.defaultBusiness.stockThreshold,
                        lowStockSentence: autoDoc.config.lowStockSentence || this.defaultBusiness.lowStockSentence,
                        aiCustomInstructions: autoDoc.config.aiCustomInstructions || this.defaultBusiness.aiCustomInstructions
                    };
                }
            }

            // 2. Fallback: Query sellers collection
            const sellerSnap = await db.collection('sellers').limit(1).get();
            if (!sellerSnap.empty) {
                const s = sellerSnap.docs[0].data();
                return {
                    brand: s.brand || s.name || this.defaultBusiness.brand,
                    owner: s.name || this.defaultBusiness.owner,
                    mobile: s.mobile || this.defaultBusiness.mobile,
                    email: s.email || this.defaultBusiness.email,
                    website: s.customUrl ? `https://codez48.netlify.app/seller/index.html?s=${s.customUrl}` : this.defaultBusiness.website,
                    services: Array.isArray(s.services) && s.services.length > 0 ? s.services : this.defaultBusiness.services,
                    serviceDescriptions: s.serviceDescriptions || s.description || this.defaultBusiness.serviceDescriptions,
                    bestServices: s.bestServices || this.defaultBusiness.bestServices,
                    stockThreshold: s.stockThreshold || this.defaultBusiness.stockThreshold,
                    lowStockSentence: s.lowStockSentence || this.defaultBusiness.lowStockSentence,
                    aiCustomInstructions: s.aiCustomInstructions || this.defaultBusiness.aiCustomInstructions
                };
            }
        } catch (err) {
            logger.debug(`[BUSINESS ADAPTER DB NOTICE] ${err.message}. Using high-fidelity profile.`);
        }

        return this.defaultBusiness;
    }

    /**
     * Primary handler called by PilotController
     */
    async handleInquiry(goal) {
        logger.status(`\x1b[36m[AI BUSINESS INTELLIGENCE] Retrieving business services & stock telemetry from Firestore...\x1b[0m`);
        const data = await this.fetchBusinessData();

        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m   \x1b[1m\x1b[33m🏢 CODEZ48 PILOT — வணிக விவரங்கள் & சேவைகள் நுண்ணறிவு (BUSINESS SERVICES & AI)\x1b[0m              \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m╠═══════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[32m🏢 பிராண்ட் / வணிகப் பெயர்:\x1b[0m    \x1b[1m\x1b[37m${data.brand}\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[32m👤 உரிமையாளர் பெயர்:\x1b[0m           \x1b[37m${data.owner}\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[32m📞 தொடர்பு எண் (Mobile):\x1b[0m        \x1b[33m${data.mobile}\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[32m✉️ மின்னஞ்சல் (Email):\x1b[0m          \x1b[36m${data.email}\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[32m🌐 இணையதள முகவரி (Website):\x1b[0m    \x1b[4m\x1b[34m${data.website}\x1b[0m`);
        console.log(`\x1b[36m╠═══════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[35m📋 வழங்கப்படும் முழு சேவைகள் (OFFERED SERVICES):\x1b[0m                                             \x1b[36m║\x1b[0m`);

        data.services.forEach((srv, idx) => {
            console.log(`\x1b[36m║\x1b[0m     \x1b[1m\x1b[32m[${idx + 1}]\x1b[0m \x1b[37m${srv}\x1b[0m`);
        });

        console.log(`\x1b[36m╠═══════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[33m🌟 சிறந்த சேவைகள் & முதன்மை பரிந்துரைகள் (BEST SERVICES):\x1b[0m                                     \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m     \x1b[1m\x1b[32m⭐ ${data.bestServices}\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m                                                                                               \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[34m📝 விரிவான சேவை விளக்கம் (SERVICE DESCRIPTIONS):\x1b[0m                                            \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m     \x1b[37m${data.serviceDescriptions}\x1b[0m`);
        console.log(`\x1b[36m╠═══════════════════════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[31m📦 இருப்பு கண்காணிப்பு விதிமுறை (STOCK SENTINEL):\x1b[0m                                             \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m     • இருப்பு வரம்பு (Stock Threshold):  \x1b[1m\x1b[33m≤ ${data.stockThreshold} அலகுகள் (Units)\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m     • எச்சரிக்கை வாக்கியம் (Alert):      \x1b[1m\x1b[31m"${data.lowStockSentence}"\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m                                                                                               \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[36m🤖 AI விற்பனை வழிகாட்டி அறிவுறுத்தல்கள் (AI SALESMAN INSTRUCTIONS):\x1b[0m                          \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║\x1b[0m     \x1b[90m"${data.aiCustomInstructions}"\x1b[0m`);
        console.log(`\x1b[36m╚═══════════════════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        return {
            success: true,
            business: data
        };
    }
}

module.exports = new BusinessServicesAdapter();
