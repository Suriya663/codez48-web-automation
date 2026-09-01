import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { showPublicProfile } from './profile.js';

export let allSellers = [];

/**
 * Fetch Sellers from Firebase Firestore
 */
export const fetchSellers = async () => {
    try {
        const q = query(collection(db, "sellers"), where("status", "==", "active"));
        const snap = await getDocs(q);

        allSellers = [];
        snap.forEach(docSnap => {
            allSellers.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderDirectory();
    } catch (e) {
        console.error("Directory Fetch Error:", e);
    }
};

/**
 * Render Merchant Cards with Overflow-Free Profile Thumbnails Layout
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

        // Overflow-Free Thumbnails Layout (Max 4 circular avatars + "+ N More" button)
        const otherLogos = list.filter(s => s.id !== seller.id && s.logo).map(s => ({ id: s.id, brand: s.brand, logo: s.logo }));
        const visibleLogos = otherLogos.slice(0, 4);
        const extraCount = Math.max(0, otherLogos.length - 4);

        const thumbnailsHtml = visibleLogos.length > 0 ? `
            <div class="flex items-center gap-2 overflow-hidden shrink-0 pt-2">
                <div class="flex -space-x-2 overflow-hidden shrink-0">
                    ${visibleLogos.map(l => `
                        <img onclick="event.stopPropagation(); window.showPublicProfile('${l.id}')" src="${l.logo}" title="${l.brand}" class="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover bg-white cursor-pointer hover:scale-110 transition-transform">
                    `).join('')}
                </div>
                ${extraCount > 0 ? `
                    <button onclick="event.stopPropagation(); window.openAllCollaboratorsModal()" class="h-7 px-2.5 bg-purple-100 text-purple-800 rounded-full text-[8px] font-black uppercase tracking-widest hover:bg-purple-200 transition shrink-0">
                        +${extraCount} More
                    </button>
                ` : ''}
            </div>
        ` : '';

        card.innerHTML = `
            <div class="relative flex-shrink-0">
                <div class="w-32 h-32 md:w-48 md:h-48 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 p-6 transition duration-500 group-hover:scale-105 group-hover:rotate-2 shadow-inner">
                    <img src="${seller.logo || 'https://placehold.co/100x100?text=Brand'}" class="w-full h-full object-contain mix-blend-multiply">
                </div>
                ${isPremium ? '<div class="absolute -top-3 -left-3 w-10 h-10 bg-royal text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white"><i class="fa-solid fa-star text-base"></i></div>' : ''}
            </div>
            <div class="flex-1 flex flex-col justify-center min-w-0 text-center md:text-left">
                <div class="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h4 class="text-2xl md:text-4xl font-black text-black leading-tight truncate uppercase tracking-tighter">${seller.brand || 'Tori Partner'}</h4>
                    ${(seller.paymentId || seller.status === 'active') ? '<i class="fa-solid fa-circle-check text-royal text-sm md:text-xl" title="Verified Merchant"></i>' : ''}
                </div>
                <p class="text-slate-500 text-sm md:text-lg font-medium line-clamp-2 leading-relaxed mb-4 max-w-3xl">${seller.description || 'Verified CODEZ48 Network Merchant.'}</p>
                <div class="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-50">
                    <div class="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <a href="seller/index.html?s=${(seller.tier === 'premium' || seller.tier === 'Premium') ? (seller.customUrl || seller.username) : (seller.username + '.codeez')}" class="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-royal hover:underline flex items-center gap-2">
                            <i class="fa-solid fa-globe"></i> Visit Website
                        </a>
                        <span class="text-[10px] md:text-[12px] font-black uppercase tracking-widest ${isPremium ? 'text-royal' : 'text-slate-400'}">${seller.category || 'Business'}</span>
                    </div>
                    ${thumbnailsHtml}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

/**
 * Open All Collaborators Popup Modal
 */
export const openAllCollaboratorsModal = () => {
    const modal = document.getElementById('all-collaborators-modal');
    const grid = document.getElementById('modal-all-collaborators-grid');
    if (!modal || !grid) return;

    grid.innerHTML = allSellers.map(s => `
        <div onclick="window.closeAllCollaboratorsModal(); window.showPublicProfile('${s.id}')" class="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group">
            <div class="w-10 h-10 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center shrink-0">
                <img src="${s.logo || 'https://placehold.co/100x100?text=Node'}" class="w-full h-full object-contain">
            </div>
            <div class="min-w-0 flex-1">
                <h5 class="text-xs font-black text-slate-900 uppercase truncate group-hover:text-purple-700">${s.brand || 'Merchant'}</h5>
                <p class="text-[9px] text-slate-400 font-bold uppercase truncate">${s.category || 'Business Node'}</p>
            </div>
        </div>
    `).join('');

    modal.classList.remove('hidden');
};

export const closeAllCollaboratorsModal = () => {
    const modal = document.getElementById('all-collaborators-modal');
    if (modal) modal.classList.add('hidden');
};

window.openAllCollaboratorsModal = openAllCollaboratorsModal;
window.closeAllCollaboratorsModal = closeAllCollaboratorsModal;

/**
 * AI-Powered Global Search
 */
let searchTimeout = null;
export const handleGlobalSearch = (val) => {
    const queryText = val.trim().toLowerCase();
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        if (!queryText) { renderDirectory(); return; }

        const filtered = allSellers.filter(s =>
            (s.brand && s.brand.toLowerCase().includes(queryText)) ||
            (s.username && s.username.toLowerCase().includes(queryText)) ||
            (s.description && s.description.toLowerCase().includes(queryText)) ||
            (s.category && s.category.toLowerCase().includes(queryText)) ||
            (s.services && s.services.some(srv => srv.toLowerCase().includes(queryText)))
        );

        renderDirectory(filtered);
    }, 300);
};

window.renderDirectory = renderDirectory;
