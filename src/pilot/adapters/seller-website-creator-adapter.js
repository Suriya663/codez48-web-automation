/**
 * CODEZ48 PILOT SELLER ONBOARDING & WEBSITE CREATOR ADAPTER
 *
 * Autonomously handles user requests to create their own website & upload their own products:
 * 1. Collects all business & product details directly via the CLI.
 * 2. Generates unique Seller ID (SLR-XXXXXX) and secure Password (CDZ-XXXXXX).
 * 3. Saves the seller profile and product into Firebase Firestore collections (`sellers`, `products`).
 * 4. Activates the public storefront website: https://codez48.netlify.app/seller/index.html?s=${username}
 * 5. Launches the live browser to showcase the new storefront on screen.
 * 6. Dispatches credentials & website link to the seller's email and admin (rajnaga75556@gmail.com).
 * 7. Prominently prints the Seller ID and Seller Password in the CLI console for immediate use.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const logger = require('../../core/logger');
const firebaseSync = require('../../core/firebase-sync');
const guiDriver = require('../drivers/gui-driver');

class SellerWebsiteCreatorAdapter {
    constructor() {
        this.adminEmail = "rajnaga75556@gmail.com";
        this.adminPhone = "918248482844";
        this.defaultImage = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
        this.localStorePath = path.join(os.homedir(), 'OneDrive', 'Desktop', 'web', 'seller', 'index.html');
    }

    slugify(text) {
        return (text || '')
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+|-+$/g, '') || 'shop-' + Math.random().toString(36).substring(2, 6);
    }

    generateSellerId() {
        return 'SLR-' + Math.floor(100000 + Math.random() * 900000);
    }

    generatePassword() {
        return 'CDZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async ask(rl, query, defaultVal = '') {
        if (!rl || !process.stdin.isTTY) {
            console.log(query + (defaultVal || ''));
            return defaultVal;
        }
        try {
            const res = rl.question(query);
            if (res && typeof res.then === 'function') {
                const answer = await res;
                return (answer || '').trim() || defaultVal;
            }
            return await new Promise(resolve => {
                rl.question(query, answer => {
                    resolve((answer || '').trim() || defaultVal);
                });
            });
        } catch (_) {
            return defaultVal;
        }
    }

    /**
     * Master onboarding handler called by PilotController
     */
    async handleSellerOnboarding(goal, rl) {
        console.log(`\n\x1b[36m╭─────────────────────────────────────────────────────────────────────────────╮\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m   \x1b[1m\x1b[33m🌐 CODEZ48 AUTONOMOUS WEBSITE & PRODUCT ONBOARDING PROTOCOL\x1b[0m               \x1b[36m│\x1b[0m`);
        console.log(`\x1b[36m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  Create your dedicated online storefront and list your first product live!  \x1b[36m│\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  We will generate your credentials, configure Firestore, and launch site.   \x1b[36m│\x1b[0m`);
        console.log(`\x1b[36m╰─────────────────────────────────────────────────────────────────────────────╯\x1b[0m\n`);

        // 1. Gather Business Details
        const brandName = await this.ask(rl, '\x1b[1m\x1b[37m[1/8] Business / Brand Name (வணிகப் பெயர்) [Default: Codez48 Enterprise]: \x1b[0m', 'Codez48 Enterprise');
        const ownerName = await this.ask(rl, '\x1b[1m\x1b[37m[2/8] Owner / Contact Name (உரிமையாளர் பெயர்) [Default: Merchant]: \x1b[0m', 'Merchant');
        const mobile = await this.ask(rl, '\x1b[1m\x1b[37m[3/8] Official WhatsApp / Mobile (+91...) [Default: 8248482844]: \x1b[0m', '8248482844');
        const email = await this.ask(rl, '\x1b[1m\x1b[37m[4/8] Email Address (மின்னஞ்சல்) [Default: rajnaga75556@gmail.com]: \x1b[0m', 'rajnaga75556@gmail.com');

        // 2. Gather First Product Details
        const productName = await this.ask(rl, '\x1b[1m\x1b[37m[5/8] First Product Name (தயாரிப்பு பெயர்) [Default: Premium Tech Wear]: \x1b[0m', 'Premium Tech Wear');
        const category = await this.ask(rl, '\x1b[1m\x1b[37m[6/8] Category (வகை) [Default: Apparel & Tech]: \x1b[0m', 'Apparel & Tech');
        const priceStr = await this.ask(rl, '\x1b[1m\x1b[37m[7/8] Selling Price in ₹ (விற்பனை விலை) [Default: 799]: \x1b[0m', '799');
        const mrpStr = await this.ask(rl, '\x1b[1m\x1b[37m[8/8] Original MRP in ₹ (அசல் விலை) [Default: 1499]: \x1b[0m', '1499');

        const price = Number(priceStr) || 799;
        const mrp = Number(mrpStr) || 1499;

        // 3. Generate Credentials & URLs
        const sellerId = this.generateSellerId();
        const sellerPass = this.generatePassword();
        const username = this.slugify(brandName);
        const pid = `${this.slugify(productName)}-${Math.random().toString(36).substring(2, 6)}`;
        const nowIso = new Date().toISOString();

        const publicStoreUrl = `https://codez48.netlify.app/seller/index.html?s=${username}`;
        const localStoreUrl = `file://${this.localStorePath}?s=${username}`;
        const developerConsoleUrl = `https://codez48.netlify.app/seller/developer.html`;

        console.log(`\n\x1b[35m[AI ENGINE] Storing Seller & Product Records in Firebase Firestore...\x1b[0m`);

        // 4. Save to Firestore
        try {
            const db = await firebaseSync.init({ showLoading: false });
            if (db) {
                // Save Seller Document
                await db.collection('sellers').doc(sellerId).set({
                    sellerId: sellerId,
                    brand: brandName,
                    name: ownerName,
                    mobile: mobile,
                    email: email,
                    username: username,
                    customUrl: username,
                    password: sellerPass,
                    category: category,
                    description: `Official store of ${brandName}. Featuring ${productName} with direct manufacturer pricing and fast delivery.`,
                    profileImage: this.defaultImage,
                    tier: 'premium',
                    aiAssistantEnabled: true,
                    aiVoiceName: 'Assistant',
                    aiPrimaryLang: 'multilingual',
                    aiCustomInstructions: `You are the AI Salesman for ${brandName}. Welcome customers politely, explain product ${productName} (₹${price}, MRP ₹${mrp}), and guide them to order.`,
                    status: 'ACTIVE',
                    createdAt: nowIso,
                    lastUpdated: nowIso
                });

                // Save Product Document
                await db.collection('products').doc(pid).set({
                    name: productName,
                    category: category,
                    price: price,
                    mrp: mrp,
                    stock: 50,
                    shippingCharge: 0,
                    purchaseCount: 0,
                    description: `High-quality ${productName} offered exclusively by ${brandName}. Verified premium finish.`,
                    image: this.defaultImage,
                    images: [this.defaultImage],
                    sellerId: sellerId,
                    isDynamic: true,
                    type: 'physical',
                    lastUpdated: nowIso
                });

                console.log(`  ✓ Seller document created: \x1b[1m${sellerId}\x1b[0m`);
                console.log(`  ✓ Product document created: \x1b[1m${pid}\x1b[0m`);
            }
        } catch (dbErr) {
            console.warn(`[FIRESTORE SAVE NOTICE]: ${dbErr.message}`);
        }

        // 5. Send Welcome Email Notification
        console.log(`\x1b[36m[EMAIL DISPATCH] Sending credentials & website links to ${email}...\x1b[0m`);
        try {
            const emailPayload = {
                action: 'SELLER_CREDENTIALS',
                siteId: sellerId,
                brand: brandName,
                username: username,
                email: email,
                password: sellerPass,
                mobile: mobile,
                productName: productName,
                productPrice: price,
                storeUrl: publicStoreUrl,
                consoleUrl: developerConsoleUrl,
                timestamp: nowIso
            };

            await fetch('https://codez48.netlify.app/.netlify/functions/send-login-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailPayload)
            });
            console.log(`  ✓ Notification email dispatched to ${email} & admin cc (${this.adminEmail})`);
        } catch (mailErr) {
            logger.debug(`[EMAIL NOTIFICATION NOTICE] ${mailErr.message}`);
        }

        // 6. Launch Browser Live on Screen
        try {
            await guiDriver.autonomousExplore('seller_storefront_launch');
        } catch (_) {}

        const targetLaunchUrl = fs.existsSync(this.localStorePath) ? localStoreUrl : publicStoreUrl;
        console.log(`\x1b[32m[BROWSER PILOT] Opening your live website:\x1b[0m \x1b[4m${targetLaunchUrl}\x1b[0m`);
        const openCmd = process.platform === 'win32'
            ? `start "" "${targetLaunchUrl}"`
            : process.platform === 'darwin' ? `open "${targetLaunchUrl}"` : `xdg-open "${targetLaunchUrl}"`;
        exec(openCmd, () => {});

        // 7. Prominently Output Credentials & Links
        console.log(`\n\x1b[32m╔═════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m   \x1b[1m\x1b[33m🎉 உங்கள் புதிய வணிக இணையதளம் & தயாரிப்பு வெற்றிகரமாக உருவாக்கப்பட்டது!\x1b[0m  \x1b[32m║\x1b[0m`);
        console.log(`\x1b[32m╠═════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🔑 செல்லர் ஐடி (Seller ID):\x1b[0m         \x1b[1m\x1b[32m${sellerId}\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🔒 செல்லர் பாஸ்வேர்ட் (Password):\x1b[0m     \x1b[1m\x1b[33m${sellerPass}\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🏢 பிராண்ட் பெயர் (Brand):\x1b[0m            \x1b[1m\x1b[37m${brandName}\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🏷️ முதல் தயாரிப்பு:\x1b[0m                 \x1b[1m\x1b[37m${productName} (₹${price} | MRP: ₹${mrp})\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🌐 நேரடி இணையதள முகவரி (Store):\x1b[0m   \x1b[1m\x1b[34m${publicStoreUrl}\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[1m\x1b[36m🛠️ மேலாண்மை போர்ட்டல் (Console):\x1b[0m    \x1b[1m\x1b[35m${developerConsoleUrl}\x1b[0m`);
        console.log(`\x1b[32m╠═════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[90mஇந்த Seller ID மற்றும் Password மூலம் எப்போது வேண்டுமானாலும் உங்கள்       ║\x1b[0m`);
        console.log(`\x1b[32m║\x1b[0m  \x1b[90mஸ்டோரில் கூடுதல் தயாரிப்புகள், கூப்பன்கள் & AI அமைப்புகளை நிர்வகிக்கலாம்.     ║\x1b[0m`);
        console.log(`\x1b[32m╚═════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        return {
            success: true,
            sellerId,
            sellerPass,
            brandName,
            productName,
            price,
            publicStoreUrl,
            developerConsoleUrl
        };
    }
}

module.exports = new SellerWebsiteCreatorAdapter();
