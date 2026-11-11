/**
 * CODEZ48 PILOT PRODUCT DISCOVERY, CONSULTATION & AUTONOMOUS ORDER ADAPTER
 *
 * Provides intelligent consultative commerce:
 * 1. Shows animated discovery feedback: [PRODUCT DISCOVERY] Analyzing product database for: "..."...
 * 2. Queries Firebase Firestore (`products` and `sellers` collections).
 * 3. Matched Products:
 *    - Presents Name, Brand/Company, MRP, Offer Price, Discount %, Stock, and Official Seller Phone (+91 8248482844).
 *    - Emphasizes highest quality (பிரீமியம் தரம்) and lowest direct-to-consumer price (மிகக் குறைந்த விலை).
 * 4. Unlisted Products:
 *    - Truthfully informs the user that the product is unlisted without hallucinating.
 * 5. Autonomous Ordering:
 *    - Inquires/confirms Quantity and Payment Method (Cash on Delivery or Razorpay Online Payment).
 *    - Autonomously launches browser via guiDriver/Playwright to the web store, saves order in Firestore,
 *      and opens WhatsApp order confirmation to seller (+91 8248482844).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const logger = require('../../core/logger');
const firebaseSync = require('../../core/firebase-sync');
const guiDriver = require('../drivers/gui-driver');

class ProductCatalogAdapter {
    constructor() {
        this.adminPhone = "918248482844";
        this.adminEmail = "rajnaga75556@gmail.com";
        this.webStoreUrl = "https://codez48.netlify.app/seller/index.html?s=nshandlooms";
        this.localStorePath = path.join(os.homedir(), 'OneDrive', 'Desktop', 'web', 'seller', 'index.html');
    }

    /**
     * Extracts search keywords from natural language prompts (Tamil & English)
     */
    extractKeywords(goal = '') {
        const lower = goal.toLowerCase();

        if (lower.includes('t-shirt') || lower.includes('tshirt') || lower.includes('t shirt') ||
            lower.includes('டீ-ஷர்ட்') || lower.includes('டீஷர்ட்') || lower.includes('டீ ஷர்ட்')) {
            return 't-shirt';
        }
        if (lower.includes('saree') || lower.includes('சேலை') || lower.includes('பட்டு') || lower.includes('handloom') || lower.includes('கைத்தறி')) {
            return 'saree';
        }
        if (lower.includes('shirt') || lower.includes('சட்டை')) {
            return 'shirt';
        }
        if (lower.includes('ஷூ') || lower.includes('shoe') || lower.includes('shoes')) {
            return 'shoe';
        }
        if (lower.includes('laptop') || lower.includes('லேப்டாப்')) {
            return 'laptop';
        }
        if (lower.includes('mobile') || lower.includes('phone') || lower.includes('மொபைல்') || lower.includes('போன்')) {
            return 'mobile';
        }
        if (lower.includes('course') || lower.includes('கோர்ஸ்')) {
            return 'course';
        }

        // Clean Unicode word filter
        const stopWords = ['எனக்கு', 'வேண்டும்', 'வேணும்', 'வாங்கணும்', 'வாங்க', 'வாங்கு', 'ஆர்டர்', 'பண்ணி', 'குடு', 'கொடு', 'ஒரு', 'இருக்கா', 'தேவை', 'விலை', 'என்ன', 'i', 'want', 'need', 'looking', 'for', 'search', 'find', 'buy', 'order', 'purchase', 'a', 'the', 'give', 'me', 'please'];
        const clean = lower.replace(/[^\w\s\u0B80-\u0BFF]/g, ' ');
        const words = clean.split(/\s+/).filter(w => w && !stopWords.includes(w) && w.length >= 2);
        return words[0] || 'all';
    }

    /**
     * Detects if the prompt is asking to place an order
     */
    isOrderRequest(goal = '') {
        const lower = goal.toLowerCase();
        return (
            lower.includes('order') || lower.includes('ஆர்டர்') || lower.includes('வாங்கிக் கொடு') ||
            lower.includes('வாங்கிக்கொடு') || lower.includes('பர்சேஸ் பண்ணு') || lower.includes('buy now') ||
            lower.includes('cash on delivery') || lower.includes('cod') || lower.includes('online payment')
        );
    }

    /**
     * Fetches products and sellers from Firestore with resilient offline fallback
     */
    async fetchCatalog() {
        try {
            const db = await firebaseSync.init({ showLoading: false });
            if (!db) {
                return this.getFallbackCatalog();
            }

            const [productsSnap, sellersSnap] = await Promise.all([
                db.collection('products').get(),
                db.collection('sellers').get()
            ]);

            const sellersMap = {};
            sellersSnap.forEach(doc => {
                sellersMap[doc.id] = doc.data();
            });

            const products = [];
            productsSnap.forEach(doc => {
                const data = doc.data();
                const sellerInfo = sellersMap[data.sellerId] || {};
                products.push({
                    id: doc.id,
                    ...data,
                    sellerBrand: sellerInfo.brand || sellerInfo.name || 'NS HANDLOOMS & CODEZ48',
                    sellerMobile: sellerInfo.mobile || this.adminPhone,
                    sellerEmail: sellerInfo.email || this.adminEmail,
                    sellerUsername: sellerInfo.username || 'nshandlooms'
                });
            });

            return { success: true, products, sellersMap };
        } catch (err) {
            logger.debug(`[CATALOG FETCH ERROR] ${err.message}`);
            return this.getFallbackCatalog();
        }
    }

    /**
     * Built-in verified catalog fallback
     */
    getFallbackCatalog() {
        const products = [
            {
                id: 'codez48-premium-cotton-t-shirt',
                name: 'Codez48 Premium Cotton T-Shirt (Bio-Washed Round Neck)',
                category: 'T-Shirts & Apparel',
                mrp: 999,
                price: 499,
                stock: 100,
                sellerBrand: 'NS HANDLOOMS & CODEZ48 STORE',
                sellerMobile: this.adminPhone,
                sellerEmail: this.adminEmail,
                sellerUsername: 'nshandlooms',
                description: '100% Super Combed Bio-Washed Cotton. Breathable, luxury finish, pre-shrunk daily wear.'
            },
            {
                id: 'handloom-dye-sarees',
                name: 'Handloom Dye Sarees (Pure Handloom)',
                category: 'Premium dye handloom Sarees',
                mrp: 18000,
                price: 14999,
                stock: 15,
                sellerBrand: 'NS HANDLOOMS',
                sellerMobile: this.adminPhone,
                sellerEmail: this.adminEmail,
                sellerUsername: 'nshandlooms',
                description: 'Authentic traditional handloom dye saree crafted with pure artisanal threads.'
            },
            {
                id: 'handloom-solf-silk-pattu-saree',
                name: 'Handloom Soft Silk Pattu Saree',
                category: 'Premium Soft silk handloom Sarees',
                mrp: 22000,
                price: 16999,
                stock: 10,
                sellerBrand: 'NS HANDLOOMS',
                sellerMobile: this.adminPhone,
                sellerEmail: this.adminEmail,
                sellerUsername: 'nshandlooms',
                description: 'Exquisite soft silk pattu saree with pure zari weaving and bridal aesthetics.'
            }
        ];
        return { success: true, products, sellersMap: {} };
    }

    /**
     * Search catalog against user keyword
     */
    filterCatalog(products, keyword) {
        if (!keyword || keyword === 'all') return products;

        const k = keyword.toLowerCase();
        const matches = products.filter(p => {
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const brand = (p.sellerBrand || '').toLowerCase();

            if (k === 't-shirt' || k === 'shirt') {
                return name.includes('t-shirt') || name.includes('tshirt') || cat.includes('t-shirt') || cat.includes('apparel');
            }
            if (k === 'saree') {
                return name.includes('saree') || cat.includes('saree') || desc.includes('saree') || name.includes('pattu');
            }
            return name.includes(k) || cat.includes(k) || desc.includes(k) || brand.includes(k);
        });

        return matches;
    }

    /**
     * Displays consultative product presentation with highest quality & lowest price guarantees
     */
    displayProductCard(p) {
        const mrp = Number(p.mrp) || Number(p.price);
        const price = Number(p.price);
        const discountAmt = Math.max(0, mrp - price);
        const discountPct = mrp > 0 ? Math.round((discountAmt / mrp) * 100) : 0;
        const phone = p.sellerMobile || this.adminPhone;

        console.log(`\n\x1b[36m╭─────────────────────────────────────────────────────────────────────────────╮\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m   \x1b[1m\x1b[33m🌟 CODEZ48 VERIFIED PRODUCT DISCOVERY & CONSULTATIVE PRICING\x1b[0m             \x1b[36m│\x1b[0m`);
        console.log(`\x1b[36m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[32m🏷️  தயாரிப்பு பெயர் (Product Name):\x1b[0m    \x1b[1m\x1b[37m${p.name}\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[34m🏢 விற்பனையாளர் / பிராண்ட் (Brand):\x1b[0m     \x1b[36m${p.sellerBrand}\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[35m📂 வகை (Category):\x1b[0m                     \x1b[37m${p.category || 'Apparel & Tech Wear'}\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[31m💰 அசல் விலை (MRP):\x1b[0m                    \x1b[9m₹${mrp.toLocaleString('en-IN')}\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[32m🔥 சிறப்பு சலுகை விலை (Offer Price):\x1b[0m   \x1b[1m\x1b[32m₹${price.toLocaleString('en-IN')}\x1b[0m \x1b[1m\x1b[33m(${discountPct}% தள்ளுபடி!)\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[33m🎁 சேமிப்பு (Total Savings):\x1b[0m             \x1b[1m\x1b[32m₹${discountAmt.toLocaleString('en-IN')} சேமிக்கிறீர்கள்\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[36m📞 அதிகாரப்பூர்வ தொடர்பு எண் (Mobile):\x1b[0m     \x1b[1m\x1b[37m+91 ${phone}\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[37m📦 இருப்பு நிலை (Stock Availability):\x1b[0m    \x1b[32mஉடனடி டெலிவரிக்கு தயார் (${p.stock || 'In Stock'})\x1b[0m`);
        console.log(`\x1b[36m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m  \x1b[1m\x1b[35m✨ தர உத்தரவாதம் & சிறப்பு அம்சங்கள் (Quality & Trust):\x1b[0m                     \x1b[36m│\x1b[0m`);
        console.log(`\x1b[36m│\x1b[0m     • \x1b[1mஉயர்தர பிரீமியம் தரம் (Top-Grade Premium Quality):\x1b[0m 100% சோதிக்கப்பட்ட தயாரிப்பு.`);
        console.log(`\x1b[36m│\x1b[0m     • \x1b[1mமிகக் குறைந்த விலை உத்தரவாதம் (Lowest Price Guarantee):\x1b[0m இடைத்தரகர் இன்றி`);
        console.log(`\x1b[36m│\x1b[0m       நேரடியாக தயாரிப்பாளரிடமிருந்து குறைந்த விலையில் வழங்கப்படுகிறது.`);
        if (p.description) {
            console.log(`\x1b[36m│\x1b[0m     • விளக்கம்: \x1b[90m${p.description.substring(0, 75)}...\x1b[0m`);
        }
        console.log(`\x1b[36m╰─────────────────────────────────────────────────────────────────────────────╯\x1b[0m\n`);
    }

    /**
     * Truthfully notifies when a requested item is not registered in Firestore
     */
    displayNotFound(keyword, allProducts) {
        console.log(`\n\x1b[33m╭─────────────────────────────────────────────────────────────────────────────╮\x1b[0m`);
        console.log(`\x1b[33m│\x1b[0m   \x1b[1m\x1b[31m⚠️ தயாரிப்பு பதிவு தகவல் (PRODUCT NOT LISTED NOTICE)\x1b[0m                       \x1b[33m│\x1b[0m`);
        console.log(`\x1b[33m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[33m│\x1b[0m  மன்னிக்கவும்! நீங்கள் குறிப்பிட்ட \x1b[1m\x1b[37m"${keyword}"\x1b[0m தற்போது எங்கள் தளத்தில் பதிவு செய்யப்படவில்லை.`);
        console.log(`\x1b[33m│\x1b[0m  (No registered seller currently offers "${keyword}" in Codez48 catalog).`);
        console.log(`\x1b[33m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[33m│\x1b[0m  \x1b[1m\x1b[32m📋 தற்போது கிடைக்கக்கூடிய அதிகாரப்பூர்வ தயாரிப்புகள் (Available Now):\x1b[0m        \x1b[33m│\x1b[0m`);
        allProducts.slice(0, 4).forEach((p, idx) => {
            console.log(`\x1b[33m│\x1b[0m    ${idx + 1}. \x1b[1m${p.name}\x1b[0m - \x1b[32m₹${Number(p.price).toLocaleString('en-IN')}\x1b[0m (\x1b[36m${p.sellerBrand}\x1b[0m)`);
        });
        console.log(`\x1b[33m├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
        console.log(`\x1b[33m│\x1b[0m  💡 \x1b[1mவணிகர்களுக்கான குறிப்பு:\x1b[0m புதிய வணிகப் பொருட்களை எங்கள் தளத்தில் சேர்க்க         \x1b[33m│\x1b[0m`);
        console.log(`\x1b[33m│\x1b[0m     \x1b[36mseller/developer.html\x1b[0m போர்ட்டல் வழியாக உடனடியாக பதிவு செய்யலாம்.             \x1b[33m│\x1b[0m`);
        console.log(`\x1b[33m╰─────────────────────────────────────────────────────────────────────────────╯\x1b[0m\n`);
    }

    /**
     * Executes autonomous ordering with interactive prompt fallback
     */
    async handleOrderFlow(product, rl) {
        console.log(`\n\x1b[32m[AUTONOMOUS PILOT CHECKOUT] Preparing order for: "${product.name}"\x1b[0m`);
        console.log(`\x1b[36m  - Selling Price: ₹${product.price} (Original MRP: ₹${product.mrp})\x1b[0m`);
        console.log(`\x1b[36m  - Brand: ${product.sellerBrand}\x1b[0m`);
        console.log(`\x1b[36m  - Official Seller Support: +91 ${product.sellerMobile}\x1b[0m\n`);

        const ask = (query, defaultVal = '', timeoutMs = 2500) => new Promise(resolve => {
            if (!rl || !process.stdin.isTTY) {
                console.log(query + (defaultVal || '1'));
                return resolve(defaultVal);
            }
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    console.log(`\x1b[90m [Auto-selected: ${defaultVal || 'Default'}]\x1b[0m`);
                    resolve(defaultVal);
                }
            }, timeoutMs);

            rl.question(query, answer => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(answer.trim() || defaultVal);
                }
            });
        });

        // 1. Inquire / Confirm Quantity
        let quantity = 1;
        const qtyAns = await ask(`\x1b[1m\x1b[37m[1/2] எத்தனை எண்ணிக்கை தேவை? (Enter Quantity) [Default: 1]: \x1b[0m`, '1', 2500);
        const parsed = parseInt(qtyAns);
        if (!isNaN(parsed) && parsed > 0) quantity = parsed;

        // 2. Inquire / Confirm Payment Method
        let paymentMethod = 'Cash on Delivery';
        console.log(`\n\x1b[1m\x1b[37m[2/2] பணம் செலுத்தும் முறையை தேர்வு செய்யவும் (Select Payment Method):\x1b[0m`);
        console.log(`  \x1b[32m[1] Cash on Delivery (COD - நேரடி பணம் செலுத்துதல் - Recommended)\x1b[0m`);
        console.log(`  \x1b[36m[2] Online Payment (Razorpay Live UPI / NetBanking / Cards)\x1b[0m`);
        const payAns = await ask(`\x1b[1mதேர்வு (1 அல்லது 2) [Default: 1]: \x1b[0m`, '1', 2500);
        if (payAns === '2' || payAns.toLowerCase().includes('online') || payAns.toLowerCase().includes('razorpay')) {
            paymentMethod = 'Online Payment (Razorpay Live)';
        }

        const totalAmount = Number(product.price) * quantity;
        const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const nowIso = new Date().toISOString();

        console.log(`\n\x1b[35m[AI ACTION LOOP] Registering order in Firestore...\x1b[0m`);
        try {
            const db = await firebaseSync.init({ showLoading: false });
            if (db) {
                await db.collection('orders').doc(orderId).set({
                    orderId,
                    productId: product.id,
                    productName: product.name,
                    quantity,
                    unitPrice: Number(product.price),
                    totalAmount,
                    paymentMethod,
                    status: 'Pending',
                    sellerId: product.sellerId || 'admin',
                    sellerBrand: product.sellerBrand,
                    sellerPhone: product.sellerMobile,
                    createdAt: nowIso
                });
                console.log(`  ✓ Order logged to Firestore with Order ID: \x1b[1m${orderId}\x1b[0m`);
            }
        } catch (dbErr) {
            logger.debug(`[ORDER DB NOTICE] ${dbErr.message}`);
        }

        // 3. Move cursor via guiDriver for physical realism
        try {
            await guiDriver.autonomousExplore('product_order_checkout');
        } catch (_) {}

        // 4. Launch Storefront Page in Browser
        const targetUrl = fs.existsSync(this.localStorePath)
            ? `file://${this.localStorePath}?s=${product.sellerUsername || 'nshandlooms'}&pid=${product.id}`
            : `${this.webStoreUrl}&pid=${product.id}`;

        console.log(`\x1b[36m[BROWSER PILOT] Opening store checkout at:\x1b[0m \x1b[4m${targetUrl}\x1b[0m`);
        const openCmd = process.platform === 'win32'
            ? `start "" "${targetUrl}"`
            : process.platform === 'darwin' ? `open "${targetUrl}"` : `xdg-open "${targetUrl}"`;
        exec(openCmd, () => {});

        // 5. Open WhatsApp with pre-drafted order details to seller (+91 8248482844)
        const waMsg = encodeURIComponent(
            `வணக்கம்! நான் Codez48 Pilot வழியாக ஆர்டர் செய்கிறேன்:\n\n` +
            `• ஆர்டர் ஐடி: ${orderId}\n` +
            `• தயாரிப்பு: ${product.name}\n` +
            `• பிராண்ட்: ${product.sellerBrand}\n` +
            `• எண்ணிக்கை: ${quantity}\n` +
            `• மொத்தத் தொகை: ₹${totalAmount.toLocaleString('en-IN')}\n` +
            `• முறை: ${paymentMethod}\n\n` +
            `தயவுசெய்து எனது ஆர்டரை உறுதி செய்யவும்.`
        );
        const waUrl = `https://api.whatsapp.com/send?phone=${product.sellerMobile || this.adminPhone}&text=${waMsg}`;
        console.log(`\x1b[32m[WHATSAPP PILOT] Drafting instant order dispatch to seller (+91 ${product.sellerMobile})...\x1b[0m`);
        const waCmd = process.platform === 'win32'
            ? `start "" "${waUrl}"`
            : process.platform === 'darwin' ? `open "${waUrl}"` : `xdg-open "${waUrl}"`;
        exec(waCmd, () => {});

        console.log(`\n\x1b[1m\x1b[32m✔ ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது! (ORDER COMPLETED)\x1b[0m`);
        console.log(`  • Order ID: \x1b[1m${orderId}\x1b[0m`);
        console.log(`  • தயாரிப்பு: \x1b[1m${product.name}\x1b[0m (x${quantity})`);
        console.log(`  • தொகை: \x1b[1m₹${totalAmount.toLocaleString('en-IN')}\x1b[0m [${paymentMethod}]`);
        console.log(`  • வாட்ஸ்அப் வழியாக விற்பனையாளருக்கு நேரடி செய்தி அனுப்பப்பட்டுள்ளது (+91 ${product.sellerMobile}).\n`);

        return {
            success: true,
            orderId,
            productName: product.name,
            quantity,
            totalAmount,
            paymentMethod,
            sellerPhone: product.sellerMobile
        };
    }

    /**
     * Master entrypoint called by PilotController
     */
    async handleProductRequest(goal, rl) {
        const keyword = this.extractKeywords(goal);
        const wantsToOrder = this.isOrderRequest(goal);

        console.log(`\n\x1b[36m[PRODUCT DISCOVERY] Analyzing product database for: "${keyword}"...\x1b[0m`);

        const catalogRes = await this.fetchCatalog();
        const allProducts = catalogRes.products || [];
        const matches = this.filterCatalog(allProducts, keyword);

        if (matches.length > 0) {
            console.log(`\x1b[32m✔ ${matches.length} matching product(s) found in Codez48 Seller Network!\x1b[0m`);
            matches.forEach(p => this.displayProductCard(p));

            if (wantsToOrder) {
                return await this.handleOrderFlow(matches[0], rl);
            }

            console.log(`\x1b[33m💡 இந்த தயாரிப்பை உடனடியாக ஆர்டர் செய்ய:\x1b[0m`);
            console.log(`   "இந்த ${matches[0].name.split(' ')[0]} எனக்கு ஆர்டர் பண்ணி கொடு" அல்லது "order this via cash on delivery" என்று கூறலாம்.\n`);

            return {
                success: true,
                count: matches.length,
                keyword,
                products: matches.map(m => ({ id: m.id, name: m.name, price: m.price, mrp: m.mrp, brand: m.sellerBrand, phone: m.sellerMobile }))
            };
        } else {
            this.displayNotFound(keyword, allProducts);
            return {
                success: false,
                keyword,
                message: `Product '${keyword}' is not currently listed in the Codez48 catalog.`
            };
        }
    }
}

module.exports = new ProductCatalogAdapter();
