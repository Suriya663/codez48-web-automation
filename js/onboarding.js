import { t, getCurrentLanguage } from './translations.js';
import { trackEvent } from './analytics.js';
import { allSellers } from './search.js';

let currentStep = 0;
const totalSteps = 5; // Screen 1 to 5

let sessionSelectedLogos = null;

/**
 * Get the current session's selected logos
 */
export const getSessionLogos = () => {
    if (!sessionSelectedLogos || sessionSelectedLogos.length === 0) {
        const sellersWithLogos = (allSellers || []).filter(s => s.logo && s.logo.startsWith('data:image'));
        const shuffled = [...sellersWithLogos].sort(() => 0.5 - Math.random());
        const selectedLogos = shuffled.slice(0, 3).map(s => s.logo);

        const placeholders = [
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
            "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
            "https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        ];

        sessionSelectedLogos = selectedLogos.length >= 3 ? selectedLogos : [...selectedLogos, ...placeholders.slice(0, 3 - selectedLogos.length)];
    }
    return sessionSelectedLogos;
};

/**
 * Initialize Onboarding
 */
export const initOnboarding = () => {
    const isCompleted = localStorage.getItem('codez48_onboarding_done');
    const hasLang = localStorage.getItem('codez48_lang');

    if (isCompleted) {
        document.body.classList.remove('overflow-hidden');
        return;
    }

    document.body.classList.add('overflow-hidden');

    if (!hasLang) {
        showLanguageSelection();
    } else {
        startOnboarding();
    }
};

/**
 * Show Language Selection Screen
 */
export const showLanguageSelection = () => {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    document.body.classList.add('overflow-hidden');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
        <div class="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div class="mb-12">
                <span class="text-3xl font-black tracking-tighter text-black uppercase">CODEZ<span class="text-royal">48</span></span>
            </div>
            <h2 class="text-2xl font-black mb-8 uppercase tracking-tight">${t('select_language')}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                <button onclick="window.selectLanguage('en')" class="p-6 rounded-3xl bg-slate-50 border-2 border-transparent hover:border-royal hover:bg-white transition-all group">
                    <span class="text-lg font-bold group-hover:text-royal">English</span>
                </button>
                <button onclick="window.selectLanguage('ta')" class="p-6 rounded-3xl bg-slate-50 border-2 border-transparent hover:border-royal hover:bg-white transition-all group">
                    <span class="text-lg font-bold group-hover:text-royal">தமிழ் (Tamil)</span>
                </button>
                <button onclick="window.selectLanguage('hi')" class="p-6 rounded-3xl bg-slate-50 border-2 border-transparent hover:border-royal hover:bg-white transition-all group">
                    <span class="text-lg font-bold group-hover:text-royal">हिन्दी (Hindi)</span>
                </button>
                <button onclick="window.selectLanguage('ml')" class="p-6 rounded-3xl bg-slate-50 border-2 border-transparent hover:border-royal hover:bg-white transition-all group">
                    <span class="text-lg font-bold group-hover:text-royal">മലയാളം (Malayalam)</span>
                </button>
                <button onclick="window.selectLanguage('te')" class="p-6 rounded-3xl bg-slate-50 border-2 border-transparent hover:border-royal hover:bg-white transition-all group col-span-full md:col-span-1">
                    <span class="text-lg font-bold group-hover:text-royal">తెలుగు (Telugu)</span>
                </button>
            </div>
        </div>
    `;

    trackEvent('language_selection_viewed');
};

/**
 * Handle Language Selection
 */
window.selectLanguage = (lang) => {
    localStorage.setItem('codez48_lang', lang);
    trackEvent('language_selected', { language: lang });
    startOnboarding();
};

/**
 * Start Onboarding Flow
 */
export const startOnboarding = () => {
    currentStep = 1;
    renderOnboardingStep();
    trackEvent('onboarding_started');
};

/**
 * Render Specific Onboarding Step
 */
const renderOnboardingStep = () => {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');

    let content = '';
    switch(currentStep) {
        case 1:
            // STEP 1: Dedicated #1 Industry First Feature - Black & White Minimalist Theme (Fully Translated)
            content = `
                <div class="max-w-xl mx-auto my-4 p-8 md:p-12 bg-black text-white rounded-[3rem] border-2 border-white shadow-2xl space-y-6 text-center relative overflow-hidden">
                    <div class="flex justify-center items-center gap-2 flex-wrap">
                        <span class="px-4 py-1.5 bg-white text-black font-black text-[10px] rounded-full uppercase tracking-widest border border-white flex items-center gap-2 shadow-md">
                            <i class="fa-solid fa-crown text-black text-xs"></i> ${t('onboarding_rental_badge')}
                        </span>
                        <span class="text-xs font-black uppercase text-white bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700">⚡ ₹83 / Day</span>
                    </div>

                    <div class="space-y-3">
                        <h2 class="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">${t('onboarding_rental_title')}</h2>
                        <p class="text-xs md:text-sm text-slate-300 font-medium leading-relaxed max-w-lg mx-auto">${t('onboarding_rental_desc')}</p>
                    </div>

                    <div class="pt-2 flex justify-center">
                        <button onclick="window.closeOnboarding(); openRegisterWizard(); selectRegPlan('starter');" class="px-8 py-4 bg-white text-black hover:bg-slate-200 font-black rounded-2xl text-[11px] uppercase tracking-widest transition shadow-xl flex items-center gap-2 transform hover:scale-105">
                            <i class="fa-solid fa-rocket text-sm"></i> ${t('onboarding_rental_btn')}
                        </button>
                    </div>
                </div>
            `;
            break;

        case 2:
            content = `
                <div class="relative mb-6 md:mb-12">
                    <div class="absolute inset-0 bg-royal/20 blur-[60px] rounded-full scale-150 animate-pulse"></div>
                    <div class="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-slate-100 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
                        <i class="fa-solid fa-bolt-lightning text-4xl md:text-5xl text-royal"></i>
                    </div>
                    <div class="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 w-12 h-12 md:w-16 md:h-16 bg-black rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl transform rotate-12">
                        <i class="fa-solid fa-clock text-white text-lg md:text-xl"></i>
                    </div>
                </div>
                <h2 class="text-xl md:text-5xl font-black mb-4 md:mb-6 uppercase tracking-tightest leading-tight md:leading-none px-4 break-words w-full">${t('onboarding_1_title')}</h2>
                <p class="text-sm md:text-lg text-slate-500 font-medium mb-6 md:mb-10 max-w-md mx-auto px-6 break-words w-full">${t('onboarding_1_desc')}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left max-w-lg mx-auto mb-6 md:mb-12 px-6 w-full">
                    ${t('onboarding_1_features').map((f, i) => `
                        <div class="flex items-center gap-2 md:gap-3 bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-royal/10 transition-colors">
                                <i class="fa-solid fa-check text-royal text-[8px] md:text-xs"></i>
                            </div>
                            <span class="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 truncate flex-1">${f}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;

        case 3:
            content = `
                <div class="relative mb-6 md:mb-12 py-6 md:py-10 w-full max-w-sm md:max-w-lg mx-auto">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-full bg-slate-100 rounded-[2.5rem] md:rounded-[3rem] transform -rotate-3 scale-95 opacity-50"></div>
                    <div class="relative bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-1 shadow-2xl border border-slate-100 overflow-hidden">
                        <div class="p-6 md:p-10 space-y-4 md:space-y-6">
                            <div class="aspect-[4/3] bg-slate-50 rounded-2xl md:rounded-3xl overflow-hidden relative group">
                                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover">
                            </div>
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div class="text-left">
                                    <p class="text-[8px] md:text-[10px] font-black text-royal uppercase tracking-widest">Premium Inventory</p>
                                    <h4 class="text-lg md:text-2xl font-black text-black truncate max-w-[150px] md:max-w-none">Modern Collection</h4>
                                </div>
                                <span class="text-xl md:text-3xl font-black text-royal">₹4,000</span>
                            </div>
                        </div>
                    </div>
                </div>
                <h2 class="text-2xl md:text-4xl font-black mb-3 md:mb-4 uppercase tracking-tighter">${t('onboarding_2_title')}</h2>
                <p class="text-slate-500 font-medium mb-6 md:mb-8 max-w-md mx-auto text-xs md:text-base">${t('onboarding_2_desc')}</p>
            `;
            break;

        case 4:
            content = `
                <div class="relative mb-6 md:mb-12 pt-6 md:pt-10">
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 bg-royal/10 rounded-full blur-3xl"></div>
                    <div class="relative w-[220px] h-[440px] md:w-[280px] md:h-[560px] bg-black rounded-[2.5rem] md:rounded-[3.5rem] border-[6px] md:border-[8px] border-slate-900 shadow-2xl mx-auto overflow-hidden">
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 md:w-28 md:h-7 bg-black rounded-b-2xl md:rounded-b-3xl z-30"></div>
                        <div class="absolute inset-0 bg-white pt-10 md:pt-12 pb-8 md:pb-10 px-3 md:px-4 flex flex-col items-center justify-center">
                            <i class="fa-solid fa-mobile-screen text-4xl md:text-6xl text-royal mb-4"></i>
                            <h4 class="text-sm md:text-lg font-black text-black uppercase">Android App</h4>
                            <p class="text-[9px] text-slate-400 font-bold uppercase mt-1">Manage Business On The Go</p>
                        </div>
                    </div>
                </div>
                <h2 class="text-2xl md:text-3xl font-black mb-3 md:mb-4 uppercase tracking-tighter">${t('onboarding_3_title')}</h2>
                <p class="text-slate-500 font-medium mb-6 md:mb-8 max-w-md mx-auto text-xs md:text-base">${t('onboarding_3_desc')}</p>
            `;
            break;

        case 5:
            const featsList = Array.isArray(t('features_list')) ? t('features_list') : ["AI Salesman", "Verified Profile", "1-Day Pay-As-You-Go Plan", "Lead Management"];
            content = `
                <div class="relative mb-8 md:mb-16 py-6 md:py-10">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-lg mx-auto relative z-10 px-4">
                        ${featsList.map((f, i) => `
                            <div class="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col items-center text-center gap-2 md:gap-4 group hover:-translate-y-1 transition-transform duration-500 overflow-hidden">
                                <div class="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-royal group-hover:text-white transition-all duration-500">
                                    <i class="fa-solid ${['fa-robot', 'fa-shield-check', 'fa-rocket', 'fa-users-gear'][i]} text-lg md:text-2xl"></i>
                                </div>
                                <span class="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-800 line-clamp-1 w-full px-2">${f}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <h2 class="text-2xl md:text-4xl font-black mb-3 md:mb-4 uppercase tracking-tighter">${t('onboarding_4_title')}</h2>
                <p class="text-slate-500 font-medium mb-6 md:mb-8 max-w-md mx-auto text-xs md:text-base">${t('onboarding_4_desc')}</p>
            `;
            break;
    }

    overlay.innerHTML = `
        <div class="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-500 h-full w-full overflow-x-hidden">
            <!-- Header -->
            <div class="flex justify-between items-center p-4 md:p-6 shrink-0 bg-white/80 backdrop-blur z-10 w-full">
                <span class="text-base md:text-lg font-black tracking-tighter text-black uppercase">CODEZ<span class="text-royal">48</span></span>
                <button onclick="window.skipOnboarding()" class="text-[9px] md:text-[10px] font-black text-slate-400 hover:text-black uppercase tracking-widest transition">${t('skip')}</button>
            </div>

            <!-- Content Area (Scrollable) -->
            <div class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center p-4 md:p-6 text-center w-full">
                <div class="w-full max-w-full py-4">
                    ${content}
                </div>
            </div>

            <!-- Footer (Fixed at bottom) -->
            <div class="p-4 md:p-8 bg-white border-t border-slate-100 shrink-0 w-full">
                <div class="flex items-center justify-between max-w-md mx-auto gap-4 w-full">
                    <button onclick="window.prevStep()" class="${currentStep === 1 ? 'invisible' : ''} px-6 md:px-8 py-2 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition shrink-0">
                        ${t('back')}
                    </button>

                    <!-- Progress Dots -->
                    <div class="flex gap-2 shrink-0">
                        ${[1,2,3,4,5].map(i => `<div class="w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-royal w-4' : 'bg-slate-200'}"></div>`).join('')}
                    </div>

                    <button onclick="window.nextStep()" class="btn-black px-8 md:px-10 py-3 md:py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shrink-0">
                        ${currentStep === totalSteps ? t('finish') : t('next')}
                    </button>
                </div>
            </div>
        </div>
    `;

    trackEvent('onboarding_screen_viewed', { step: currentStep });
};

/**
 * Navigation Handlers
 */
window.nextStep = () => {
    if (currentStep < totalSteps) {
        currentStep++;
        renderOnboardingStep();
        trackEvent('next_clicked', { from_step: currentStep - 1 });
    } else {
        finishOnboarding();
    }
};

window.prevStep = () => {
    if (currentStep > 1) {
        currentStep--;
        renderOnboardingStep();
    }
};

window.skipOnboarding = () => {
    trackEvent('skip_clicked', { step: currentStep });
    finishOnboarding();
};

export const closeOnboarding = () => {
    finishOnboarding();
};
window.closeOnboarding = closeOnboarding;
window.showLanguageSelection = showLanguageSelection;
window.startOnboarding = startOnboarding;

const finishOnboarding = () => {
    localStorage.setItem('codez48_onboarding_done', 'true');
    document.body.classList.remove('overflow-hidden');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.add('animate-out', 'fade-out', 'duration-500');
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }
    trackEvent('onboarding_completed');

    // Refresh CTAs on homepage
    if (window.refreshConversionCTAs) window.refreshConversionCTAs();
};

export const refreshConversionCTAs = () => {
    const homeCta = document.getElementById('home-conversion-cta');
    if (homeCta) {
        const finalLogos = getSessionLogos();

        homeCta.innerHTML = `
            <div class="relative group mx-auto max-w-full overflow-hidden">
                <div class="absolute inset-0 bg-white blur-[120px] rounded-full scale-150 opacity-60"></div>
                <div class="relative bg-white rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-20 text-center border border-slate-100 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-royal/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    <div class="absolute bottom-0 left-0 w-64 h-64 bg-royal/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

                    <div class="inline-flex items-center gap-2 bg-royal/5 text-royal px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 border border-royal/10">
                        Launch Your Business
                    </div>

                    <h3 class="text-3xl md:text-6xl font-black text-black mb-6 uppercase tracking-tightest leading-tight md:leading-none break-words px-2">${t('home_cta_title')}</h3>
                </div>
            </div>
        `;
    }
};
