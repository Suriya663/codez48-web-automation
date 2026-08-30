import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { showPublicProfile } from './profile.js';
import { callAI } from './utils.js';
import { refreshConversionCTAs } from './onboarding.js';

export let allSellers = [];

/**
 * Fetch and Listen to Merchants
 */
export const fetchSellers = (callback) => {
    const q = collection(db, "sellers");
    onSnapshot(q, (snapshot) => {
        allSellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDirectory();
        refreshConversionCTAs();
        if (callback) callback();
    });
};

/**
 * Render Merchant Cards
 */
export const renderDirectory = (data = null) => {
    const list = data || allSellers;
    const grid = document.getElementById('directory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const sorted = [...list].sort((a, b) => {
        if (a.tier === 'premium' && b.tier !== 'premium') return -1;
        if (a.tier !== 'premium' && b.tier === 'premium') return 1;
        return 0;
    });

    if (sorted.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center"><p class="text-slate-400 font-bold">No merchants found matching your query.</p></div>`;
        return;
    }

    sorted.forEach((seller, index) => {
        const isPremium = seller.tier === 'premium';
        const card = document.createElement('div');
        card.className = `${isPremium ? 'premium-card' : 'glass-card'} p-8 md:p-12 rounded-[3.5rem] bg-white cursor-pointer group opacity-0 flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-16 w-full`;
        card.style.animation = `fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards ${index * 0.1}s`;
        card.onclick = () => showPublicProfile(seller.id, window.currentUser);

        card.innerHTML = `
            <div class="relative flex-shrink-0">
                <div class="w-32 h-32 md:w-48 md:h-48 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 p-6 transition duration-500 group-hover:scale-105 group-hover:rotate-2 shadow-inner">
                    <img src="${seller.logo || 'https://placehold.co/100x100?text=Brand'}" class="w-full h-full object-contain mix-blend-multiply">
                </div>
                ${isPremium ? '<div class="absolute -top-3 -left-3 w-10 h-10 bg-royal text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white"><i class="fa-solid fa-star text-base"></i></div>' : ''}
            </div>
            <div class="flex-1 flex flex-col justify-center min-w-0 text-center md:text-left">
                <div class="flex items-center justify-center md:justify-start gap-3 mb-4">
                    <h4 class="text-2xl md:text-4xl font-black text-black leading-tight truncate uppercase tracking-tighter">${seller.brand || 'Tori Partner'}</h4>
                    ${(seller.paymentId || seller.status === 'active') ? '<i class="fa-solid fa-circle-check text-royal text-sm md:text-xl" title="Verified Merchant"></i>' : ''}
                </div>
                <p class="text-slate-500 text-sm md:text-lg font-medium line-clamp-2 leading-relaxed mb-8 max-w-3xl">${seller.description || 'Verified CODEZ48 Network Merchant.'}</p>
                <div class="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-50">
                    <div class="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <a href="seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}" class="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-royal hover:underline flex items-center gap-2">
                            <i class="fa-solid fa-globe"></i> Visit Website
                        </a>
                        <span class="text-[10px] md:text-[12px] font-black uppercase tracking-widest ${isPremium ? 'text-royal' : 'text-slate-400'}">${seller.category || 'Business'}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

/**
 * AI-Powered Global Search
 */
let searchTimeout = null;
export const handleGlobalSearch = (val) => {
    const queryText = val.toLowerCase().trim();
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!queryText) { renderDirectory(); return; }

    const exactMatch = allSellers.find(s => s.brand?.toLowerCase() === queryText || s.username?.toLowerCase() === queryText || s.customUrl?.toLowerCase() === queryText);
    if (exactMatch && (exactMatch.tier === 'premium' || exactMatch.tier === 'Premium')) {
        showPublicProfile(exactMatch.id, window.currentUser);
        document.getElementById('global-search').value = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        const grid = document.getElementById('directory-grid');
        if (grid) grid.innerHTML = `<div class="col-span-full py-20 text-center"><p class="text-xs font-black text-royal uppercase tracking-widest animate-pulse">AI analyzing intent...</p></div>`;

        const merchantList = allSellers.map(s => ({
            id: s.id,
            brand: s.brand,
            description: s.description,
            tier: s.tier,
            category: s.category,
            services: s.services || []
        }));

        const systemPrompt = `You are the Search Intelligence Engine for "CODEZ48".
        Your goal is to match user queries with the most relevant merchant nodes based on their brand, category, description, and services.

        SEMANTIC MATCHING RULES:
        - "Coding", "Programming", "App" should match "IT", "Software", "Technology".
        - "Shirts", "Clothes", "Apparel" should match "Handlooms", "Sarees", "Fashion".
        - "Computer", "Laptop", "Hardware" should match "IT Services", "Electronics".

        RANKING RULES:
        - PRIORITY: Premium Tier merchants must be ranked higher if they are relevant.
        - RELEVANCE: Only return merchants that actually match the user's intent.`;

        const userPrompt = `Analyze this search query: "${queryText}".
        Based on these merchants: ${JSON.stringify(merchantList)}

        Return ONLY a raw JSON array of matching merchant IDs.
        NO preamble, NO conversational text, NO explanation.`;

        try {
            const response = await callAI([
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]);

            if (response) {
                // 1. Clean response from markdown blocks and excessive whitespace
                let cleanResponse = response.trim().replace(/^```json/, '').replace(/```$/, '').trim();

                // 2. Locate the first '[' and last ']' to extract the array
                const startIdx = cleanResponse.indexOf('[');
                const endIdx = cleanResponse.lastIndexOf(']');

                if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
                    const jsonString = cleanResponse.substring(startIdx, endIdx + 1);
                    try {
                        const ids = JSON.parse(jsonString);
                        if (Array.isArray(ids)) {
                            renderDirectory(allSellers.filter(s => ids.includes(s.id)));
                            return;
                        }
                    } catch (parseErr) {
                        console.warn("AI JSON Parse Failed, using fallback:", parseErr);
                    }
                }
            }
            fallbackKeywordSearch(queryText);
        } catch (e) {
            console.error("AI Search Error:", e);
            fallbackKeywordSearch(queryText);
        }
    }, 800);
};

const fallbackKeywordSearch = (queryText) => {
    renderDirectory(allSellers.filter(s => s.brand?.toLowerCase().includes(queryText) || s.username?.toLowerCase().includes(queryText) || s.category?.toLowerCase().includes(queryText) || s.description?.toLowerCase().includes(queryText)));
};

/**
 * Simple Tier Filter
 */
export const filterDirectory = (tier) => {
    renderDirectory(tier === 'premium' ? allSellers.filter(s => s.tier === 'premium') : allSellers);
};

// Exposed Globals
window.handleGlobalSearch = handleGlobalSearch;
window.filterDirectory = filterDirectory;
window.renderDirectory = renderDirectory;
