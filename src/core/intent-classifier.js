const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');
const logger = require('./logger');

class IntentClassifier {
    constructor() {
        this.endpoint = 'https://codez48.netlify.app/.netlify/functions/cli-ai-chat';
    }

    /**
     * High-precision local heuristic check for coupons and promo codes
     * Recognizes exact codes, common misspellings (coupen, cupon), and natural phrasing.
     */
    isCouponIntent(goal) {
        if (!goal || typeof goal !== 'string') return false;
        const trimmed = goal.trim();
        const lower = trimmed.toLowerCase();

        // 1. Misspellings and variations of coupon / voucher
        if (/\b(coupon|coupen|cupon|copon|copun|copons|coupens|cupons|voucher|vouchers|promo|promos|promocode|discount\s*code|credit\s*code)\b/i.test(lower)) {
            return true;
        }

        // 2. Direct standalone alphanumeric coupon code (e.g. DIWALI50, WELCOME100, SAVE50, TESTLIMIT_B4PY)
        // Must contain both letters and numbers, length 4-20, no spaces
        if (/^[A-Za-z0-9_-]{4,20}$/.test(trimmed) && /[0-9]/.test(trimmed) && /[A-Za-z]/.test(trimmed) && !lower.includes(' ')) {
            return true;
        }

        // 3. Phrasing like "DIWALI50 add this", "use DIWALI50", "apply code DIWALI50"
        if (/^[A-Za-z0-9_-]{4,20}\s+(?:add|apply|use|redeem|enter|claim|please)/i.test(trimmed) ||
            /(?:add|apply|use|redeem|enter|claim)\s+(?:this\s+)?(?:code\s+)?([A-Za-z0-9_-]{4,20})/i.test(trimmed)) {
            return true;
        }

        return false;
    }

    isWhatsAppIntent(goal) {
        if (!goal) return false;
        const lower = String(goal).toLowerCase().trim();
        return lower.includes('whatsapp') ||
               lower.includes('whats app') ||
               lower.includes('whats-app') ||
               lower.includes('வாட்ஸ்அப்') ||
               lower.includes('வாட்சப்') ||
               lower.includes('supervoice') ||
               (lower.includes('supervisor') && (lower.includes('voice') || lower.includes('reply') || lower.includes('message') || lower.includes('automation') || lower.includes('wa'))) ||
               lower.includes('generate voice note') ||
               lower.includes('send voice note') ||
               (/(?:send|sending|sent|dispatch|broadcast|outreach|deliver)\s+.*?(?:messages?|broadcast|sms|note)/i.test(lower) && /(?:numbers?|mobile|phone|contact|excel|word|docx?|xlsx?|csv|recipients?|client)/i.test(lower)) ||
               (/(?:send|tell|type|deliver)\s+.*?to\s+(?:(?:\+?\d{10,13})|(?:contact|this contact|user|recipient|number))/i.test(lower)) ||
               (lower.includes('campaign') && (lower.includes('whatsapp') || lower.includes('mobile') || lower.includes('number') || lower.includes('contact'))) ||
               (lower.includes('incoming') && (lower.includes('message') || lower.includes('reply') || lower.includes('replier') || lower.includes('chat'))) ||
               (lower.includes('monitor') && (lower.includes('screen') || lower.includes('message') || lower.includes('chat')));
    }

    heuristicClassify(goal) {
        const lower = (goal || '').toLowerCase().trim();
        const hasFanWord = /(?:fan|ஃபேன்|பேன்|ஃபேன|பேன)/i.test(lower);

        let intent = 'UNKNOWN_OR_AMBIGUOUS';
        let sub_intent = '';
        let workflow = 'UNKNOWN';
        let keywords = [];

        // 0. Plan Status & Credit Balance Query Intent
        const isPlanStatusIntent = /\b(?:what\s+(?:is\s+)?(?:my\s+)?(?:plan|balance|tier)|check\s+(?:my\s+)?(?:plan|balance|credits?)|how\s+many\s+credits|show\s+(?:my\s+)?(?:plan|balance|credits?)|my\s+(?:plan|credits?|balance)|credit\s+balance|active\s+plan|plan\s+status|subscription\s+status|pilot\s+ticket|ticket)\b/i.test(lower) ||
                                   lower === 'plan' || lower === 'balance' || lower === 'credits' || lower === 'my plan' || lower === 'my credits' || lower === 'my balance' || lower === 'ticket';
        if (isPlanStatusIntent) {
            return {
                intent: 'PLAN_STATUS_QUERY',
                sub_intent: 'CHECK_PLAN_AND_CREDITS',
                keywords: ['plan', 'credits', 'balance', 'subscription'],
                user_goal: goal,
                target: 'User Subscription & Credit Vault',
                output_format: 'ACCOUNT_STATUS_CARD',
                workflow: 'CREDIT_VAULT',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic User Plan & Credit Balance Query'
            };
        }

        // 0.04 Full Stack Online Course & Registration Intent (Tamil & English)
        const isFullStackCourseIntent = (
            lower.includes('full stack') || lower.includes('fullstack') || lower.includes('full-stack') ||
            lower.includes('ஃபுல் ஸ்டாக்') || lower.includes('ஃபுல்ஸ்டாக்') ||
            lower.includes('வெபினார்') || lower.includes('டுடோரியல்') || lower.includes('webinar') || lower.includes('tutorial') ||
            ((lower.includes('course') || lower.includes('கோர்ஸ்') || lower.includes('படிக்க') || lower.includes('class') || lower.includes('படிப்பு')) &&
             (lower.includes('online') || lower.includes('web') || lower.includes('2 month') || lower.includes('இரண்டு மாதம்') || lower.includes('நவம்பர்') || lower.includes('nov 15') || lower.includes('develop') || lower.includes('python') || lower.includes('django'))) ||
            lower.includes('official registration link') || lower.includes('registration link for the full stack')
        );
        if (isFullStackCourseIntent) {
            return {
                intent: 'FULL_STACK_COURSE',
                sub_intent: 'COURSE_INQUIRY_AND_ENROLL',
                keywords: ['fullstack', 'online_course', '2_months', 'scholarship', 'codz48fsd'],
                user_goal: goal,
                target: 'Codez48 Full Stack Web Development Academy',
                output_format: 'INTERACTIVE_COURSE_ENROLLMENT',
                workflow: 'PILOT_COURSE_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Full Stack Online Course inquiry & registration intent'
            };
        }

                // Guard against hardware/system queries misclassifying as business or product
        const isHardwareOrSystemQuery = /\b(?:battery|charging|power|wifi|wi-fi|volume|sound|brightness|screen|storage|disk|hard\s*disk|free\s*space|drive\s*space|ram|memory|system\s+info|hardware|specs?)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('ஸ்டோரேஜ்') || lower.includes('பேட்டரி') || lower.includes('சார்ஜ்') ||
                lower.includes('வைஃபை') || lower.includes('சவுண்ட்') || lower.includes('வால்யூம்') ||
                lower.includes('பிரைட்னஸ்') || lower.includes('வெளிச்சம்') || lower.includes('டிஸ்க்') ||
                lower.includes('டிரைவ்') || lower.includes('இடம்') || lower.includes('ஹார்ட்')
            ));

        // 0.045 Business Services, Best Offerings & Stock Sentinel Query Intent
        const isBusinessServicesIntent = !isHardwareOrSystemQuery && (
            lower.includes('business services') || lower.includes('best services') ||
            lower.includes('services offered') || lower.includes('our services') ||
            lower.includes('சர்வீசஸ்') || lower.includes('சேவைகள்') || lower.includes('பெஸ்ட் சர்வீசஸ்') ||
            lower.includes('பிசினஸ் ப்ராடக்ட்') || lower.includes('பிசினஸ் சர்வீஸ்') ||
            lower.includes('stock threshold') || lower.includes('low stock sentence') || lower.includes('த்ரெட் ஹோல்ட்') ||
            (lower.includes('service') && (lower.includes('list') || lower.includes('show') || lower.includes('details') || lower.includes('பத்தி')))
        ) && !lower.includes('create storefront') && !lower.includes('own product upload');

        if (isBusinessServicesIntent) {
            return {
                intent: 'BUSINESS_SERVICES',
                sub_intent: 'SHOW_BUSINESS_SERVICES_AND_PRODUCTS',
                keywords: ['business_services', 'best_services', 'stock_threshold', 'low_stock_sentinel'],
                user_goal: goal,
                target: 'Codez48 Pilot Business Services & AI Intelligence',
                output_format: 'BUSINESS_SERVICES_REPORT',
                workflow: 'PILOT_BUSINESS_SERVICES_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Business Services, Stock Sentinel & Product Intelligence Query'
            };
        }

        // 0.046 Seller Onboarding, Own Product Upload & Storefront Creation (Tamil & English)
        const isSellerWebsiteCreationIntent = !isHardwareOrSystemQuery && (
            lower.includes('own product') || lower.includes('ஓன் ப்ராடக்ட்') || lower.includes('ஓன் பிராடக்ட்') ||
            lower.includes('என்னோட ப்ராடக்ட்') || lower.includes('என் ப்ராடக்ட்') ||
            lower.includes('என்னோட ஓன்') || lower.includes('என் தயாரிப்பு') || lower.includes('சொந்த தயாரிப்பு') ||
            lower.includes('business website') || lower.includes('பிசினஸ் வெப்சைட்') ||
            ((lower.includes('website') || lower.includes('வெப்சைட்') || /\b(?:store|storefront)\b/i.test(lower) || lower.includes('கடை') || (lower.includes('ஸ்டோர்') && !lower.includes('ஸ்டோரேஜ்'))) &&
             (lower.includes('create') || lower.includes('கிரியேட்') || lower.includes('வேணும்') || lower.includes('வேண்டும்') || lower.includes('உருவாக்க') || lower.includes('build') || lower.includes('make') || lower.includes('upload') || lower.includes('அப்லோட்') || lower.includes('கொண்டு போக'))) ||
            lower.includes('upload my product') || lower.includes('sell my product') || lower.includes('seller registration') ||
            lower.includes('register my business') || lower.includes('register my shop') || lower.includes('create storefront')
        ) && !lower.includes('course') && !lower.includes('full stack') && !lower.includes('webinar');

        if (isSellerWebsiteCreationIntent) {
            return {
                intent: 'SELLER_WEBSITE_CREATION',
                sub_intent: 'ONBOARD_SELLER_AND_PRODUCT',
                keywords: ['seller_onboarding', 'own_product_upload', 'website_creation', 'storefront'],
                user_goal: goal,
                target: 'Codez48 Seller Network & Storefront Engine',
                output_format: 'STOREFRONT_AND_CREDENTIALS',
                workflow: 'PILOT_SELLER_WEBSITE_CREATOR',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Seller Storefront Creation & Own Product Upload Intent'
            };
        }

        // 0.045 Product Discovery, Search & Autonomous Order Intent (Tamil & English)
        const isProductDiscoveryOrOrderIntent = !isHardwareOrSystemQuery && (
            lower.includes('t-shirt') || lower.includes('tshirt') || lower.includes('t shirt') ||
            lower.includes('டீ-ஷர்ட்') || lower.includes('டீஷர்ட்') || lower.includes('டீ ஷர்ட்') ||
            lower.includes('saree') || lower.includes('சேலை') || lower.includes('பட்டு') || lower.includes('handloom') ||
            lower.includes('ஷூ') || lower.includes('shoe') || lower.includes('shoes') || lower.includes('shirt') ||
            /\b(?:buy\s+(?:a\s+)?laptop|order\s+(?:a\s+)?laptop|purchase\s+laptop|laptop\s+price|buy\s+mobile|order\s+mobile)\b/i.test(lower) ||
            (lower.includes('லேப்டாப்') && (lower.includes('வாங்க') || lower.includes('விலை') || lower.includes('ஆர்டர்') || lower.includes('வாங்கு'))) ||
            lower.includes('வாங்கணும்') || lower.includes('வாங்க வேண்டும்') ||
            lower.includes('பர்சேஸ்') || lower.includes('ஆர்டர்') ||
            /\b(?:buy\s+(?:a\s+)?|order\s+(?:a\s+)?|purchase\s+(?:a\s+)?|search\s+for\s+product|find\s+product|products?\s+catalog|show\s+products?|available\s+products?|cash\s+on\s+delivery)\b/i.test(lower)
        ) && !lower.includes('course') && !lower.includes('full stack') && !lower.includes('webinar') && !lower.includes('class') &&
             !lower.includes('credit') && !lower.includes('subscription') && !lower.includes('plan');

        if (isProductDiscoveryOrOrderIntent) {
            return {
                intent: 'PRODUCT_SEARCH_AND_ORDER',
                sub_intent: 'DISCOVER_OR_ORDER_PRODUCT',
                keywords: ['product_search', 'product_catalog', 'order_flow', 'seller_business'],
                user_goal: goal,
                target: 'Codez48 Product Discovery & Autonomous Checkout',
                output_format: 'PRODUCT_CONSULTATIVE_PRESENTATION',
                workflow: 'PILOT_PRODUCT_CATALOG_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Product Discovery, Consultation & Autonomous Order Intent'
            };
        }

        // 0.05 Family & User Activity Analytics Query Intent (English & Tamil)
        const isFamilyAnalyticsIntent = /\b(?:family\s+analytics|user\s+analytics|how\s+many\s+(?:people|users?)\s+(?:used|have\s+used|are\s+using)|active\s+users?|unique\s+users?|user\s+count|who\s+used|telemetry\s+logs?)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('எத்தனை பேர்') || lower.includes('பயன்படுத்தி') || lower.includes('யூசர்') || lower.includes('ஃபேமிலி') || lower.includes('அனலிட்டிக்ஸ்')
            ));
        if (isFamilyAnalyticsIntent) {
            return {
                intent: 'FAMILY_ANALYTICS_QUERY',
                sub_intent: 'SHOW_USER_STATS',
                keywords: ['family', 'users', 'analytics', 'active_users'],
                user_goal: goal,
                target: 'Codez48 Pilot Family & User Telemetry',
                output_format: 'ANALYTICS_PROFILE_REPORT',
                workflow: 'ACTIVITY_TRACKER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Family & User Activity Analytics query intent'
            };
        }

        // 0.1 Enumerate / List Installed Applications on Laptop Intent
        const isListAppsIntent = !this.isWhatsAppIntent(goal) && !hasFanWord && !lower.includes('calc') && !lower.includes('screenshot') && (
            /\b(?:list|show|display|what|all|get|view|check)\s+(?:all\s+)?(?:my\s+)?(?:installed\s+|desktop\s+|laptop\s+|system\s+)?(?:apps|applications)\b/i.test(lower) ||
            /\b(?:desktop|installed|system|laptop|pc)\s+(?:apps|applications)\b/i.test(lower) ||
            /\bapplications\s+(?:on|in|present\s+on)\s+(?:my\s+|the\s+)?(?:desktop|laptop|pc|computer)\b/i.test(lower) ||
            lower.includes('show my desktop applications') ||
            lower.includes('show desktop applications') ||
            lower.includes('installed applications') ||
            lower.includes('show apps') ||
            lower.includes('list apps') ||
            lower.includes('desktop apps') ||
            lower.includes('show desktop apps')
        );
        if (isListAppsIntent) {
            return {
                intent: 'LIST_INSTALLED_APPS',
                sub_intent: 'ENUMERATE_APPS',
                keywords: ['installed', 'applications', 'laptop', 'desktop'],
                user_goal: goal,
                target: 'Laptop System Applications',
                output_format: 'SYSTEM_APP_LIST',
                workflow: 'APP_DISCOVERY_CONTROLLER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Installed Laptop Applications Enumeration intent'
            };
        }

        // 0.2 Desktop Screen Capture / Screenshot Intent
        const isScreenshotIntent = /\b(?:take\s+(?:a\s+)?screenshot|take\s+a\s+screen\s+shot|capture\s+(?:the\s+)?(?:desktop|screen|my\s+screen)|take\s+desktop\s+screenshot|save\s+screenshot|grab\s+screen)\b/i.test(lower) ||
                                   lower === 'screenshot' || lower === 'screen shot' || lower === 'take screenshot' || lower === 'capture screen' || lower === 'take a screenshot';
        if (isScreenshotIntent) {
            return {
                intent: 'SCREENSHOT_CAPTURE',
                sub_intent: 'CAPTURE_DESKTOP',
                keywords: ['screenshot', 'capture', 'screen', 'desktop'],
                user_goal: goal,
                target: 'Windows Desktop Screen',
                output_format: 'IMAGE_FILE',
                workflow: 'SCREEN_CAPTURE_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Desktop Screen Capture intent'
            };
        }

        // 0.3 Laptop Hardware Fan Control Intent (English & Tamil)
        const isFanControlIntent = /\b(?:turn\s+on\s+(?:the\s+)?(?:laptop\s+)?fan|start\s+(?:the\s+)?(?:laptop\s+)?fan|run\s+(?:the\s+)?(?:laptop\s+)?fan|spin\s+(?:up\s+)?(?:the\s+)?fan|fan\s+on|cooling\s+fan|cool\s+down\s+(?:my\s+)?laptop|laptop\s+fan|control\s+fan|full\s+speed\s+fan|max\s+fan|fan\s+speed)\b/i.test(lower) ||
                                   (lower.includes('fan') && (lower.includes('second') || lower.includes('laptop') || lower.includes('speed') || lower.includes('cool') || lower.includes('turn on') || lower.includes('run') || lower.includes('control') || lower.includes('full') || lower.includes('max') || lower.includes('spin'))) ||
                                   (hasFanWord && /(?:ஆன்|இயக்கு|செகண்ட்|விநாடி|கண்ட்ரோல்|ஓட|சுத்த|சுழல|ஸ்பீட்|ஃபுல்|முழு|வேக|முடியுமா|பாசிபிளா)/i.test(lower));
        if (isFanControlIntent) {
            const secMatch = lower.match(/(\d+)\s*(?:seconds?|secs?|s|செகண்ட்|விநாடி)\b/i) || lower.match(/(\d+)/);
            const durationSec = secMatch ? parseInt(secMatch[1], 10) : 12;
            return {
                intent: 'HARDWARE_FAN_CONTROL',
                sub_intent: 'RUN_LAPTOP_FAN',
                keywords: ['fan', 'hardware', 'laptop', 'cooling', `${durationSec}s`],
                user_goal: goal,
                target: 'Laptop Cooling Fan System',
                output_format: 'HARDWARE_ACTION_RESULT',
                workflow: 'HARDWARE_CONTROLLER',
                required_parameters: { duration: durationSec },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Laptop Fan & Thermal Cooling Control intent'
            };
        }

        // 0.35 Windows Laptop Hardware Control Intent (Battery, Wi-Fi, Volume, Brightness, App Updates)
        const isRemoteContext = /\b(?:remote|bridge|transfer|send|deliverable|another\s+laptop|secondary\s+laptop|other\s+laptops?|safe\s+mode\s+pairing|zero[\s-]install)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (lower.includes('ரிமோட்') || lower.includes('பிரிட்ஜ்') || lower.includes('டிரான்ஸ்பர்') || lower.includes('அனுப்ப')));
        const isHardwareIntent = !isRemoteContext && (/\b(?:battery|charging|power\s+(?:status|percent|level)|wifi|wi-fi|wireless|volume|sound|mute|unmute|brightness|screen\s+light|update\s+(?:apps|applications)|upgrade\s+(?:apps|packages)|hardware\s+(?:status|dashboard)|storage|disk|hard\s*disk|free\s*space|drive\s*space)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('பேட்டரி') || lower.includes('சார்ஜ்') ||
                lower.includes('வைஃபை') || lower.includes('இன்டர்நெட்') ||
                lower.includes('சவுண்ட்') || lower.includes('வால்யூம்') ||
                lower.includes('பிரைட்னஸ்') || lower.includes('வெளிச்சம்') ||
                lower.includes('ஸ்டோரேஜ்') || lower.includes('டிஸ்க்') || lower.includes('டிரைவ்') ||
                lower.includes('அப்டேட்')
            )));
        if (isHardwareIntent) {
            let sub = 'SYSTEM_DASHBOARD';
            if (lower.includes('storage') || lower.includes('disk') || lower.includes('space') || lower.includes('ஸ்டோரேஜ்') || lower.includes('டிஸ்க்') || lower.includes('டிரைவ்')) {
                sub = 'GET_STORAGE';
            } else if (lower.includes('battery') || lower.includes('charge') || lower.includes('பேட்டரி') || lower.includes('சார்ஜ்') || lower.includes('power')) {
                sub = 'GET_BATTERY';
            } else if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('wireless') || lower.includes('வைஃபை')) {
                sub = 'CONTROL_WIFI';
            } else if (lower.includes('volume') || lower.includes('sound') || lower.includes('mute') || lower.includes('சவுண்ட்') || lower.includes('வால்யூம்')) {
                sub = 'CONTROL_VOLUME';
            } else if (lower.includes('brightness') || lower.includes('light') || lower.includes('பிரைட்னஸ்') || lower.includes('வெளிச்சம்')) {
                sub = 'CONTROL_BRIGHTNESS';
            } else if (lower.includes('update') || lower.includes('upgrade') || lower.includes('அப்டேட்')) {
                sub = 'UPDATE_APPS';
            }
            return {
                intent: 'SYSTEM_HARDWARE_CONTROL',
                sub_intent: sub,
                keywords: ['hardware', sub.toLowerCase()],
                user_goal: goal,
                target: 'Windows Laptop Hardware Controller',
                output_format: 'HARDWARE_STATUS_REPORT',
                workflow: 'LAPTOP_HARDWARE_CONTROLLER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Windows Hardware Control intent (${sub})`
            };
        }

        // 0.36 100+ PPT & Word Templates Interactive Gallery / Web Studio Intent (English & Tamil)
        const isTemplateGalleryIntent = /\b(?:templates?|template\s+gallery|100\s+templates?|show\s+templates?|open\s+templates?|choose\s+template|select\s+template|ppt\s+templates?|presentation\s+templates?|template\s+studio)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('டெம்ப்ளேட்') || lower.includes('டெம்ப்லேட்') || lower.includes('டிசைன்ஸ்')
            ));
        if (isTemplateGalleryIntent && !lower.includes('create a presentation') && !lower.includes('make a ppt') && !lower.includes('generate presentation') && !lower.includes('generate ppt')) {
            return {
                intent: 'DOCUMENT_GENERATION',
                sub_intent: 'PPT_TEMPLATE_GALLERY',
                keywords: ['template', 'gallery', 'ppt', 'designs', '100+'],
                user_goal: goal,
                target: 'Codez48 100+ Templates Interactive Web Studio',
                output_format: 'WEB_TEMPLATE_GALLERY',
                workflow: 'TEMPLATE_GALLERY_WORKFLOW',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic 100+ PPT Templates Interactive Web Gallery intent'
            };
        }

        // 0.365 Autonomous AI Video Editing & Video Generation Studio Intent (English & Tamil)
        const hasVideoWord = /\b(?:videos?|reels?|shorts?|clip)\b/i.test(lower) || (/[\u0B80-\u0BFF]/.test(lower) && lower.includes('வீடியோ'));
        const hasVideoAction = /\b(?:edit|editing|create|creating|make|making|generate|generating|subtitles?|captions?|cut|trim|crop|render|need)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('எடிட்') || lower.includes('உருவாக்கு') ||
                lower.includes('சப்டைட்டில்') || lower.includes('மேக்')
            ));

        const isVideoEditingIntent = (hasVideoWord && hasVideoAction) ||
            /\b(?:video\s+editor|video\s+studio|video\s+creation)\b/i.test(lower) ||
            /\b(?:edit\s+(?:a|my|the|this|our|some)?\s*video|need\s+to\s+edit\s+(?:a|my|the|this|our|some)?\s*video)\b/i.test(lower) ||
            lower === 'video' || lower === 'edit video' || lower === 'video edit';

        if (isVideoEditingIntent) {
            const isGenerate = /\b(?:create|generate|make)\s+(?:a\s+)?video\s+(?:for|about|on)\b/i.test(lower) ||
                               lower.includes('brand') || lower.includes('பிராண்ட்') || lower.includes('ஜெனரேட்');

            const pathMatch = goal.match(/["']([a-zA-Z]:[\\\/][^"'\r\n]+?\.(?:mp4|mov|webm|avi|mkv|flv|wmv|m4v))["']/i) ||
                              goal.match(/([a-zA-Z]:[\\\/][^\s"'\r\n]+?\.(?:mp4|mov|webm|avi|mkv|flv|wmv|m4v))/i);
            const fileMatch = goal.match(/([a-zA-Z0-9_\-\s]+\.(?:mp4|mov|webm|avi|mkv|flv|wmv|m4v))/i);

            let extractedPath = pathMatch ? pathMatch[1] : null;
            let extractedName = fileMatch ? fileMatch[1].trim() : null;
            let extractedExt = extractedName ? (path.extname(extractedName).toLowerCase() || '.mp4') : null;

            return {
                intent: 'VIDEO_EDITING',
                sub_intent: isGenerate ? 'GENERATE_VIDEO' : 'EDIT_VIDEO',
                keywords: ['video', 'editing', 'subtitles', 'tanglish', 'keyframes', 'icons', 'studio'],
                user_goal: goal,
                target: 'Codez48 Autonomous AI Video Studio',
                output_format: 'VIDEO_PROJECT_RESULT',
                workflow: 'VIDEO_EDITING_ADAPTER',
                required_parameters: {
                    filePath: extractedPath,
                    fileName: extractedName,
                    fileExtension: extractedExt,
                    isGenerate
                },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Autonomous AI Video Editing intent (${isGenerate ? 'GENERATE_VIDEO' : 'EDIT_VIDEO'})`
            };
        }

        // 0.35 Complete Codebase / Project Purchase & Buyout Intent (₹29,000 INR)
        const isPurchaseCodebaseRequest = /\b(?:purchase|buy|own|buyout)\s+(?:the\s+)?(?:complete\s+|entire\s+|full\s+)?(?:source\s+code|code|project|codez48|cli\s+tool|repo|repository)\b/i.test(lower) ||
            /\b(?:want|need|get)\s+(?:the\s+)?(?:complete\s+|entire\s+|full\s+)(?:source\s+code|code|project\s+code)\b/i.test(lower) ||
            /\b(?:download\s+(?:the\s+)?(?:complete\s+|entire\s+|full\s+)?(?:project\s+code|source\s+code|codebase))\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                (lower.includes('கோடு') || lower.includes('கோட்') || lower.includes('ப்ராஜெக்ட்') || lower.includes('ப்ராஜெக்ட்டுக்கான') || lower.includes('டூல்') || lower.includes('code')) &&
                (lower.includes('பர்சேஸ்') || lower.includes('வாங்க') || lower.includes('வாங்கணும்') || lower.includes('வேணும்') || lower.includes('கம்ப்ளீட்') || lower.includes('டவுன்லோட்'))
            ));

        if (isPurchaseCodebaseRequest) {
            return {
                intent: 'PROJECT_PURCHASE',
                sub_intent: 'PURCHASE_SOURCE_CODE',
                keywords: ['purchase', 'buy', 'code', 'source', 'enterprise', 'download'],
                user_goal: goal,
                target: 'Codez48 Master Enterprise Source Code Package',
                price: 29000,
                currency: 'INR',
                output_format: 'ENTERPRISE_CHECKOUT_WEB',
                workflow: 'ENTERPRISE_CHECKOUT_SERVER',
                required_parameters: { price: 29000 },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Enterprise Master Source Code Purchase Intent (₹29,000 INR)'
            };
        }

        // 0.36 Deterministic Defensive Website Security Vulnerability Audit Intent
        const isSecurityAuditRequest = /\b(?:website\s+security|audit\s+website|site\s+security|security\s+(?:audit|posture|score|check|scan)|how\s+hackers?\s+(?:can\s+)?hack|hack\s+possibilit(?:y|ies)|hacker\s+attack|penetration\s+test|defense\s+audit|web\s+vulnerability)\b/i.test(lower) ||
            /\b(?:audit|scan|check|assess|analyze)\s+(?:the\s+)?(?:website\s+|web\s+|site\s+)?vulnerabilit(?:y|ies)\b/i.test(lower) ||
            /\b(?:website\s+|site\s+)?vulnerabilit(?:y|ies)\s+(?:audit|scan|check|assessment|analysis|report)\b/i.test(lower) ||
            ((lower.includes('vulnerability') || lower.includes('vulnerabilities')) && (lower.includes('audit') || lower.includes('scan') || lower.includes('check') || lower.includes('site') || lower.includes('website') || lower.includes('for') || /(?:https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(lower))) ||
            (lower.includes('security') && (lower.includes('website') || lower.includes('url') || lower.includes('domain') || lower.includes('site') || /(?:https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(lower))) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                (lower.includes('ஹேக்') || lower.includes('ஹேக்கர்') || lower.includes('செக்யூரிட்டி') || lower.includes('பாதுகாப்பு') || lower.includes('vulnerability')) &&
                (lower.includes('வெப்சைட்') || lower.includes('யுஆர்எல்') || lower.includes('சைட்') || lower.includes('வாய்ப்பு') || lower.includes('வழியில்') || lower.includes('செக்') || lower.includes('அனலைஸ்') || lower.includes('சொல்லு'))
            ));

        if (isSecurityAuditRequest) {
            const urlMatch = goal.match(/https?:\/\/[^\s"'<>]+/i) ||
                             goal.match(/\b([a-zA-Z0-9-]+\.(?:com|org|net|app|io|dev|ai|tv|co|in|edu|gov|xyz|me|info)(?:\/[^\s"'<>]*)?)\b/i);
            const targetUrl = urlMatch ? urlMatch[0] : 'https://example.com';
            return {
                intent: 'WEBSITE_SECURITY_AUDIT',
                sub_intent: 'DEFENSIVE_VULNERABILITY_AUDIT',
                keywords: ['security', 'vulnerability', 'audit', 'hackers', 'defense'],
                user_goal: goal,
                target: targetUrl,
                output_format: 'SECURITY_DASHBOARD_WEB',
                workflow: 'WEBSITE_SECURITY_AUDITOR',
                required_parameters: { targetUrl },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Defensive Website Security Vulnerability Audit Intent'
            };
        }

        // 0.37 Deterministic Web URL Automation (Playwright) vs Website Code Extraction/Scraping
        const isWhatsAppWebMention = /\b(?:whatsapp\s+(?:web|website|site|portal)|web\.whatsapp|browser)\b/i.test(lower) ||
                                     lower.includes('whatsapp web') || lower.includes('whatsapp website') || lower.includes('web.whatsapp.com');

        const hasMessagingOrContacts = /(?:send|deliver|dispatch|broadcast|outreach|message|msg|text|saying|excel|csv|\.xlsx|\.xls|docx|\.doc|contacts?|numbers?|recipients?|\d{10})/i.test(lower);

        const hasUrlPattern = /(https?:\/\/[^\s"']+)/i.test(lower) ||
            /\b([a-zA-Z0-9\-]+\.(?:com|org|net|app|io|dev|ai|tv|co|in|netlify\.app))\b/i.test(lower);

        const hasKnownSite = /\b(?:amazon|youtube|flipkart|swiggy|zomato|github|netflix|spotify|reddit|wikipedia|irctc|bookmyshow|netlify|aistudio|chatgpt|claude|stackoverflow|google|twitter|linkedin)\b/i.test(lower) ||
            /(?:website|site|portal|web)\s+["']?([a-zA-Z0-9\-_]+)["']?/i.test(lower);

        const hasKnownSiteOrUrl = hasUrlPattern || hasKnownSite;
        
        const isScrapingOrCodeRequest = /\b(?:scrape|scraping|extract|clone|source\s+code|website\s+code|need\s+coding|give\s+(?:me\s+)?code|download\s+site|scraper)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('ஸ்கிராப்') || lower.includes('கோடு வேணும்') ||
                lower.includes('கோடிங்') || lower.includes('வெப்சைட் ஓட கோடு')
            ));

        const isWebAutomationRequest = /\b(?:automate|automation|playwright|browser|open|launch|click|fill|type|login|visit|browse|run|test)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('ஆட்டோமேட்') || lower.includes('ப்ளேரைட்') ||
                lower.includes('ஓபன் பண்ணி') || lower.includes('பிரவுஸ்') ||
                lower.includes('வெப்சைட் ஓபன்')
            ));

        if (hasKnownSiteOrUrl && isScrapingOrCodeRequest) {
            return {
                intent: 'WEBSITE_SCRAPING',
                sub_intent: 'WEBSITE_CODE_EXTRACTION',
                keywords: ['scrape', 'website', 'code', 'extract', 'playwright'],
                user_goal: goal,
                target: 'Website Code Extraction & Scraping Engine',
                output_format: 'EXTRACTED_PROJECT_FOLDER',
                workflow: 'SCRAPING_WORKFLOW',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Website Code Extraction & Scraping intent from URL or Website Name'
            };
        }

        if (hasKnownSiteOrUrl && (isWebAutomationRequest || lower.includes('http://') || lower.includes('https://'))) {
            // If it's a WhatsApp link, let WhatsApp intent handle it below
            if (!isWhatsAppWebMention && !hasMessagingOrContacts && !lower.includes('claude') && !/(?:கிளா|க்ளா)/i.test(lower)) {
                return {
                    intent: 'BROWSER_AUTOMATION',
                    sub_intent: 'PLAYWRIGHT_AUTOMATION',
                    keywords: ['browser', 'playwright', 'automation', 'web'],
                    user_goal: goal,
                    target: 'Playwright Autonomous Browser Engine (1536x864)',
                    output_format: 'PLAYWRIGHT_ACTION_RESULT',
                    workflow: 'BROWSER_CONTROLLER',
                    required_parameters: {},
                    confidence: 1.0,
                    needs_clarification: false,
                    requires_confirmation: false,
                    reason: 'Deterministic Playwright Browser Automation intent from URL or Website Name'
                };
            }
        }

        // 0.38 Autonomous Movie Ticket Booking via Playwright Intent (English & Tamil)
        const isMovieTicketIntent = /\b(?:book\s+(?:movie\s+)?tickets?|movie\s+tickets?|book\s+seats?|theatre\s+tickets?|cinema\s+tickets?|bookmyshow|ticketnew|watch\s+movie)\b/i.test(lower) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                lower.includes('டிக்கெட்') || lower.includes('படம் பார்க்க') ||
                lower.includes('தியேட்டர்') || lower.includes('சீட் புக்')
            ));
        if (isMovieTicketIntent) {
            return {
                intent: 'MOVIE_TICKET_BOOKING',
                sub_intent: 'BOOK_MOVIE_TICKETS',
                keywords: ['movie', 'tickets', 'theatre', 'playwright', 'seats'],
                user_goal: goal,
                target: 'BookMyShow & Cinema Multiplex Portals',
                output_format: 'BOOKING_SUMMARY_RECEIPT',
                workflow: 'MOVIE_TICKET_BOOKING_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Autonomous Movie Ticket Booking intent'
            };
        }

        // 0.4 WhatsApp Disambiguation: Desktop App vs Website vs Batch Campaign Automation

        const isExplicitOpenWeb = (
            lower === 'open whatsapp web' || lower === 'open whatsapp website' || lower === 'open web.whatsapp.com' ||
            /^(?:open|launch|start|navigate to|go to)\s+(?:the\s+)?whatsapp\s+(?:web|website|site|portal)\b/i.test(lower) ||
            /^(?:open|launch|start|run)\s+(?:web\.whatsapp|https:\/\/web\.whatsapp\.com)\b/i.test(lower)
        ) && !hasMessagingOrContacts;

        const isExplicitOpenApp = (
            lower === 'open whatsapp' || lower === 'open whatsapp application' || lower === 'open whatsapp app' || lower === 'launch whatsapp' ||
            /^(?:open|launch|start|run)\s+(?:the\s+)?whatsapp(?:\s+application|\s+app|\s+desktop)?$/i.test(lower)
        ) && !isWhatsAppWebMention && !hasMessagingOrContacts;

        if (isExplicitOpenApp) {
            return {
                intent: 'APPLICATION_TASK',
                sub_intent: 'LAUNCH_APP',
                keywords: ['whatsapp', 'application', 'desktop'],
                user_goal: goal,
                target: 'whatsapp',
                output_format: 'DESKTOP_UI_ACTION',
                workflow: 'GENERAL_DESKTOP_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic WhatsApp Desktop Application Launch intent'
            };
        }

        if (isExplicitOpenWeb) {
            return {
                intent: 'WHATSAPP_WEB_TASK',
                sub_intent: 'OPEN_WHATSAPP_WEB',
                keywords: ['whatsapp', 'web', 'browser', 'website'],
                user_goal: goal,
                target: 'WhatsApp Web',
                output_format: 'PLAYWRIGHT_WHATSAPP_WEB_ACTION',
                workflow: 'WHATSAPP_WEB_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic WhatsApp Website (web.whatsapp.com) Browser automation intent'
            };
        }

        if (this.isWhatsAppIntent(goal)) {
            const isWeb = isWhatsAppWebMention;
            const isVoiceDirect = lower.includes('voice note') || (lower.includes('voice') && !lower.includes('campaign') && !lower.includes('batch') && !lower.includes('file') && !lower.includes('excel') && !lower.includes('word'));
            const isMonitorDirect = lower.includes('monitor') || lower.includes('incoming') || lower.includes('auto reply') || lower.includes('auto-reply') || lower.includes('check incoming');

            let subIntent = 'WHATSAPP_BATCH';
            if (isVoiceDirect) subIntent = 'WHATSAPP_VOICE';
            else if (isMonitorDirect) subIntent = 'WHATSAPP_MONITOR';

            return {
                intent: isWeb && isMonitorDirect ? 'WHATSAPP_WEB_TASK' : 'SUPERVISOR_AUTOMATION',
                sub_intent: subIntent,
                keywords: ['whatsapp', isWeb ? 'web' : 'desktop', 'automation', subIntent.toLowerCase()],
                user_goal: goal,
                target: isWeb ? 'WhatsApp Web' : 'WhatsApp Desktop / Web Automation',
                output_format: isWeb ? 'PLAYWRIGHT_WHATSAPP_WEB_ACTION' : 'AUTONOMOUS_WHATSAPP_CAMPAIGN',
                workflow: subIntent === 'WHATSAPP_BATCH' ? 'WHATSAPP_BATCH_ENGINE' : (isWeb ? 'WHATSAPP_WEB_ADAPTER' : 'SUPERVISOR_WORKFLOW'),
                required_parameters: { platform: isWeb ? 'WEB' : 'AUTO' },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic WhatsApp ${subIntent} Automation intent (Platform: ${isWeb ? 'WEB' : 'AUTO'})`
            };
        }

        // 0.49 Universal High-Fidelity PDF Conversion & Creation Intent (PRIORITIZED)
        const isPdfConvertIntent = /\b(?:convert\s+(?:.*?\s+)?to\s+pdf|convert\s+(?:.*?\s+)?into\s+pdf|make\s+(?:a\s+)?pdf|generate\s+(?:a\s+)?pdf|create\s+(?:a\s+)?pdf|save\s+(?:.*?\s+)?as\s+pdf|export\s+(?:.*?\s+)?(?:as|to)\s+pdf|into\s+one\s+it\s+must\s+do\s+so\s+correctly)\b/i.test(lower) ||
                                   (lower.includes('pdf') && (lower.includes('convert') || lower.includes('create') || lower.includes('make') || lower.includes('export')));
        if (isPdfConvertIntent) {
            return {
                intent: 'FILE_OPERATIONS',
                sub_intent: 'CONVERT_TO_PDF',
                keywords: ['pdf', 'convert', 'vector', 'export', 'document'],
                user_goal: goal,
                target: 'Universal PDF Conversion Engine',
                output_format: 'PDF_FILE',
                workflow: 'FILE_EDITOR_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Universal PDF Conversion & Generation intent'
            };
        }

        // 0.5 Universal Real-Time In-Place File Edit & Element Removal Intent (PRIORITIZED ABOVE CALCULATOR)
        const hasFilePath = /(?:[a-zA-Z]:[\\\/]|\.{1,2}[\\\/]|~\/|\.docx|\.doc|\.pptx|\.ppt|\.xlsx|\.xls|\.ttf|\.otf|\.pdf|\.js|\.py|\.json|\.txt|\.html|\.css|\.c|\.cpp|\.java|\.ini|\.md)\b/i.test(lower);
        const hasEditKeyword = /(?:change|replace|update|modify|edit|substitute|set|add\s+line|remove\s+line)\b/i.test(lower);
        const isRemoveContentIntent = /\b(?:remove|delete|erase|strip|cut|drop)\s+(?:the\s+)?(?:specific\s+)?(?:element|elements|text|word|string|section|line|point|bullet|slide|page|item)/i.test(lower) ||
                                      /\b(?:remove|delete|erase)\s+['"][^'"]+['"]/i.test(lower) ||
                                      /\b(?:delete|remove)\s+(?:the\s+)?\d+\s*(?:th|st|nd|rd)?\s*(?:point|item|bullet|line|slide|page)/i.test(lower) ||
                                      /\b(?:remove|delete|erase)\s+.*?\s+(?:from|in|inside)\s+(?:the\s+)?(?:file|docx|pptx|ppt|pdf|code|presentation|document)/i.test(lower) ||
                                      lower.includes('remove specific elements') ||
                                      lower.includes('deleting a particular piece of text') ||
                                      lower.includes('perform the requested removal');

        const isFileEditIntent = (hasFilePath && (hasEditKeyword || isRemoveContentIntent)) ||
                                 isRemoveContentIntent ||
                                 /\b(?:make\s+(?:specific\s+)?changes\s+(?:to|in)|apply\s+changes\s+(?:to|in)|modify\s+(?:the\s+)?file|edit\s+(?:the\s+)?file|update\s+(?:the\s+)?file)\b/i.test(lower) ||
                                 /^(?:change|replace|update|modify|edit|remove|delete)\s+.*?\s+(?:in|inside|to|at|from)\s+/i.test(lower) ||
                                 /\b(?:in\s+this\s+file|in\s+the\s+file|in\s+file|to\s+a\s+file|from\s+the\s+file|from\s+file)\b/i.test(lower);
        if (isFileEditIntent) {
            return {
                intent: 'FILE_OPERATIONS',
                sub_intent: isRemoveContentIntent ? 'REMOVE_FILE_CONTENT' : 'EDIT_FILE_IN_PLACE',
                keywords: ['file', isRemoveContentIntent ? 'remove' : 'edit', 'in-place', 'surgical'],
                user_goal: goal,
                target: isRemoveContentIntent ? 'System File Element Removal' : 'System File',
                output_format: 'FILE_MODIFICATION_RESULT',
                workflow: 'FILE_EDITOR_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Real-Time In-Place File ${isRemoveContentIntent ? 'Removal' : 'Editing'} intent (Prioritized)`
            };
        }

        // 0.6 Claude AI Automation & Model Context Protocol (MCP) Skill Creation Intent
        const isClaudeIntent = /\b(?:claude|claude\s+ai|claude\.ai|cloud\s+website|cloud\s+ai|model\s+context\s+protocol|mcp|create\s+mcp|connect\s+(?:a\s+)?(?:new\s+)?mcp|configure\s+skill|create\s+skill|skill\s+file|slash\s+command)\b/i.test(lower) ||
                               (lower.includes('claude') && (lower.includes('automate') || lower.includes('mcp') || lower.includes('prompt') || lower.includes('login') || lower.includes('skill') || lower.includes('verification') || lower.includes('otp') || lower.includes('screenshot'))) ||
                               (lower.includes('cloud') && lower.includes('mcp')) ||
                               (lower.includes('claude') && (lower.includes('input') || lower.includes('box') || lower.includes('message') || lower.includes('send') || lower.includes('open') || lower.includes('chat') || lower.includes('hello'))) ||
                               ((lower.includes('cloud') || /(?:கிளா|க்ளா|கிளவு|claude|cloud|clado)/i.test(lower)) && (lower.includes('input') || lower.includes('box') || lower.includes('message') || lower.includes('send') || lower.includes('chat') || lower.includes('mcp') || lower.includes('இன்புட்') || lower.includes('மெசேஜ்') || lower.includes('பாக்ஸ்') || lower.includes('சொன்னது') || lower.includes('ஓபன்') || lower.includes('பண்ணனும்')));
        if (isClaudeIntent) {
            let sub = 'CLAUDE_AUTOMATION';
            const hasMsgAction = /\b(?:send|message|say|ask|tell|write|type|hello|prompt|wait|result|input|box)\b/i.test(lower) || lower.includes('மெசேஜ்') || lower.includes('இன்புட்') || lower.includes('பாக்ஸ்') || lower.includes('டைப்') || lower.includes('பண்ணனும்');
            if (lower.includes('login') || lower.includes('account') || lower.includes('verification') || lower.includes('otp') || lower.includes('auth')) {
                sub = 'CLAUDE_LOGIN';
            } else if (!hasMsgAction && /^(?:open|launch|start|run|bring\s+up)\s+(?:the\s+)?(?:claude|cloud\s+website)(?:\s+(?:app|desktop|website))?$/i.test(lower)) {
                sub = 'CLAUDE_APP_LAUNCH';
            } else if (/\b(?:create\s+mcp|generate\s+mcp|build\s+mcp|make\s+mcp|new\s+mcp|connect\s+(?:a\s+)?(?:new\s+)?mcp|mcp\s+server|model\s+context\s+protocol)\b/i.test(lower) || lower === 'mcp' || lower.startsWith('mcp ') || lower.includes('new mcp')) {
                sub = 'MCP_CREATION';
            } else if (lower.includes('skill') || lower.includes('slash')) {
                sub = 'SKILL_FILE_CONFIG';
            } else if (hasMsgAction || lower.includes('chat') || lower.includes('ask') || lower.includes('question')) {
                sub = 'CLAUDE_QUERY';
            }

            return {
                intent: 'CLAUDE_TASK',
                sub_intent: sub,
                keywords: ['claude', 'mcp', 'protocol', 'skill', sub.toLowerCase()],
                user_goal: goal,
                target: 'Claude AI Platform & MCP Generator',
                output_format: 'MCP_SKILL_RESULT',
                workflow: 'CLAUDE_AUTOMATION_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Claude AI & MCP Skill Builder intent (${sub})`
            };
        }

        // 0.7 MetaTrader 5 (MT5) & Web Trading Chart Vision Intent
        const isMt5Intent = /\b(?:metatrader|mt5|trading|forex|market\s+watch|strategy\s+tester|new\s+order|buy\s+[a-zA-Z]{3,6}|sell\s+[a-zA-Z]{3,6}|zero\s*loss|breakeven|tradingview|exness|chart\s+(?:vision|diagram|pattern|toolbar|timeframe)|trendline|candlestick|crosshair|fibonacci|horizontal\s+line|vertical\s+line|algo\s+trading)\b/i.test(lower) ||
                            lower.includes('metatrader') || lower.includes('mt5') || lower.includes('terminal64') || (lower.includes('chart') && (lower.includes('diagram') || lower.includes('trend') || lower.includes('vision') || lower.includes('timeframe') || lower.includes('line') || lower.includes('toolbar')));
        if (isMt5Intent) {
            let sub = 'ANALYZE_MARKET';
            if (lower.includes('tradingview') || lower.includes('exness') || lower.includes('web trade') || lower.includes('website trade')) {
                sub = 'WEB_TRADING';
            } else if (lower.includes('diagram') || lower.includes('chart vision')) {
                sub = 'CHART_VISION';
            } else if (lower.includes('existing') || lower.includes('where it bought') || lower.includes('bought or sold') || lower.includes('profit')) {
                sub = 'EXISTING_CHART';
            } else if (lower.includes('timeframe') || /(?:m1|m5|m15|m30|h1|h4|d1|w1|mn)\b/i.test(lower)) {
                sub = 'SWITCH_TIMEFRAME';
            } else if (lower.includes('draw') || /(?:vertical|horizontal|trendline|channel|crosshair|fibonacci|shapes?|text)/i.test(lower)) {
                sub = 'DRAW_CHART_TOOL';
            } else if (/(?:market\s+watch|navigator|toolbox|terminal|tester|order\s+dialog|f9|ctrl\+[mtr]|candlestick|bar\s+chart|line\s+chart|zoom|algo\s+trading|tile\s+windows|toolbar)/i.test(lower)) {
                sub = 'NAVIGATE_GUI';
            } else if (/(?:buy|sell|place\s+order|execute\s+trade|order\s+send)/i.test(lower)) {
                sub = 'EXECUTE_TRADE';
            } else if (/(?:zero\s*loss|breakeven|protect\s+capital|trailing\s+stop)/i.test(lower)) {
                sub = 'PROTECT_CAPITAL';
            } else if (/(?:login|account|balance|equity|server)/i.test(lower)) {
                sub = 'ACCOUNT_STATUS';
            }

            return {
                intent: 'METATRADER_TASK',
                sub_intent: sub,
                keywords: ['metatrader', 'mt5', 'trading', sub.toLowerCase()],
                user_goal: goal,
                target: 'MetaTrader 5 & Web Trading Engine',
                output_format: 'TRADING_ACTION_RESULT',
                workflow: 'MT5_TRADING_ADAPTER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Trading & Chart Vision intent (${sub})`
            };
        }

        // 0.8 Wireless Remote Device Bridge & Zero-Install Device Automation Intent
        const isRemoteDeviceIntent = /\b(?:remote\s+device|another\s+laptop|secondary\s+laptop|other\s+laptops?|wireless\s+(?:device|transfer|automation|bridge)|wifi\s+bridge|connect\s+(?:another|remote|phone|tablet|laptop)|transfer\s+(?:file|files|ppt|presentation|docx|doc|pdf)\s+(?:to|over)\s+(?:another|remote|laptop|phone|wifi|bluetooth)|bluetooth\s+transfer|send\s+(?:file|files|ppt)\s+(?:over|via)\s+(?:bluetooth|wifi|wireless)|zero[\s-]install|antivirus\s+(?:blocking|interfering|stopping)|safe\s+mode\s+pairing|bridge\s+server)\b/i.test(lower) ||
            (lower.includes('remote') && (lower.includes('bridge') || lower.includes('laptop') || lower.includes('transfer') || lower.includes('automation') || lower.includes('wifi') || lower.includes('device'))) ||
            (lower.includes('antivirus') && (lower.includes('laptop') || lower.includes('blocking') || lower.includes('interfering') || lower.includes('machines'))) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (lower.includes('ரிமோட்') || lower.includes('ப்ளூடூத்') || lower.includes('வைஃபை')));
        if (isRemoteDeviceIntent) {
            let sub = 'START_BRIDGE';
            if (lower.includes('bluetooth') || lower.includes('ப்ளூடூத்')) sub = 'BLUETOOTH_TRANSFER';
            else if (lower.includes('zip') || lower.includes('code') || lower.includes('புரோகிராம்') || lower.includes('ஜிப்')) sub = 'ZIP_AND_TRANSFER';
            else if (lower.includes('transfer') || lower.includes('send') || lower.includes('share') || lower.includes('download')) sub = 'TRANSFER_DELIVERABLE';
            else if (lower.includes('status') || lower.includes('check') || lower.includes('pin')) sub = 'BRIDGE_STATUS';

            return {
                intent: 'REMOTE_DEVICE_TASK',
                sub_intent: sub,
                keywords: ['remote', 'wireless', 'bridge', 'wifi', 'device', sub.toLowerCase()],
                user_goal: goal,
                target: 'Wireless Remote Device Bridge',
                output_format: 'REMOTE_BRIDGE_RESULT',
                workflow: 'REMOTE_DEVICE_BRIDGE',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic Wireless Remote Device Bridge intent (${sub})`
            };
        }

        // 0.85 System Virus & Temp Files Cleanup Intent (Dual Mode: Scan/Show vs Clean/Delete)
        const isCleanupIntent = /\b(?:clean\s+(?:virus|temp|temporary|laptop|pc|computer|disk|junk)|virus\s+clean|clean\s+up|clear\s+temp|delete\s+temp|remove\s+virus|antivirus\s+scan|scan\s+virus|show\s+temp|show\s+virus|list\s+temp|view\s+temp)\b/i.test(lower) ||
            (/\b(?:temp|temporary|virus|junk)\b/i.test(lower) && /\b(?:show|list|display|view|check|scan|inspect|clean|delete|remove|clear)\b/i.test(lower)) ||
            (/[\u0B80-\u0BFF]/.test(lower) && (
                (lower.includes('வைர') || lower.includes('டெம்ப்') || lower.includes('டெம்பரரி') || lower.includes('ஜங்க்')) &&
                (lower.includes('கிளீன்') || lower.includes('காட்டு') || lower.includes('காட்ட') || lower.includes('டெலீட்') || lower.includes('அழி') || lower.includes('ரிமூவ்') || lower.includes('செக்') || lower.includes('பார்'))
            ));

        if (isCleanupIntent) {
            const isScanOnly = (/\b(?:show|list|view|display|check|inspect|scan)\b/i.test(lower) && !/\b(?:clean|delete|remove|clear|purge|erase|kill)\b/i.test(lower)) ||
                (/[\u0B80-\u0BFF]/.test(lower) && (lower.includes('காட்ட') || lower.includes('காட்டு') || lower.includes('பார்') || lower.includes('லிஸ்ட்')) && !lower.includes('டெலீட்') && !lower.includes('அழி') && !lower.includes('கிளீன்'));
            const sub = isScanOnly ? 'SCAN_SYSTEM' : 'CLEAN_SYSTEM';

            return {
                intent: 'SYSTEM_CLEANUP',
                sub_intent: sub,
                keywords: ['cleanup', 'temp', 'virus', isScanOnly ? 'scan' : 'clean'],
                user_goal: goal,
                target: 'Windows System Temp & Antivirus Cleaner',
                output_format: 'CLEANUP_REPORT',
                workflow: 'SYSTEM_CLEANUP_ENGINE',
                required_parameters: { mode: isScanOnly ? 'SCAN' : 'CLEAN' },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: `Deterministic system temp & virus cleanup intent (${sub})`
            };
        }

        // 0.8 Calculator Math & Execution Intent (Strictly guards against file editing)
        const hasMathKeywords = /\b(calculate|calculation|multiplication|multiply|division|divide|arithmetic)\b/i.test(lower) ||
                                (/\b(addition|subtraction|subtract)\b/i.test(lower) && /\d+/.test(lower)) ||
                                (/\badd\s+\d+\s+(?:and|to|\+)\s+\d+\b/i.test(lower)) ||
                                (/\d+\s*[\+\-\*\/]\s*\d+/.test(lower));

        const isCalcIntent = !hasFilePath && !lower.includes('file') && !/(?:change|replace|modify|update|edit)\b/i.test(lower) && (
                             lower.includes('calculator') ||
                             lower.includes('calc ') || lower === 'calc' ||
                             hasMathKeywords ||
                             (/open\s+(?:the\s+)?calc(?:ulator)?/i.test(lower))
        );
        if (isCalcIntent) {
            return {
                intent: 'CALCULATOR_TASK',
                sub_intent: 'CALCULATOR_MATH',
                keywords: ['calculator', 'math', 'calculate'],
                user_goal: goal,
                target: 'Calculator',
                output_format: 'DESKTOP_UI_ACTION',
                workflow: 'CALCULATOR_CONTROLLER',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Calculator & Desktop Math Automation intent'
            };
        }

        // B. Screen Vision & Direct Physical Cursor / OS Interaction Intent
        const isVisionCursorIntent = /\b(move\s+cursor|move\s+mouse|click\s+on\s+screen|observe\s+screen|look\s+at\s+screen|screen\s+vision|find\s+on\s+screen|cursor\s+to|click\s+(?:the\s+)?(?:button|icon|text|element))\b/i.test(lower);
        if (isVisionCursorIntent) {
            return {
                intent: 'SCREEN_VISION_TASK',
                sub_intent: 'OBSERVE_AND_CLICK',
                keywords: ['cursor', 'screen', 'vision', 'click'],
                user_goal: goal,
                target: 'Windows Screen UI',
                output_format: 'PHYSICAL_INPUT_ACTION',
                workflow: 'SCREEN_VISION_ENGINE',
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Screen Vision & Cursor Automation intent'
            };
        }

        // B.5 Deterministic Document & Presentation Generation Intent (Must precede generic app launcher)
        const isPptIntent = /\b(?:ppt|pptx|powerpoint|presentation|slide|slides|slide\s+deck)\b/i.test(lower) ||
            (/\b(?:create|make|generate|build|design|prepare)\b/i.test(lower) && /\b(?:presentation|deck|slides?)\b/i.test(lower));
        const isWordIntent = /\b(?:word\s+doc(?:ument)?|docx|word\s+report)\b/i.test(lower) ||
            (/\b(?:create|make|generate|build|write)\b/i.test(lower) && /\b(?:document|doc|notes|study\s+notes|assignment|report)\b/i.test(lower) && !lower.includes('code') && !lower.includes('script'));
        const isSpreadsheetIntent = /\b(?:spreadsheet|excel\s+sheet|xlsx|csv\s+report)\b/i.test(lower) ||
            (/\b(?:create|make|generate|build)\b/i.test(lower) && /\b(?:spreadsheet|excel|sheet)\b/i.test(lower));

        const isOpenOnly = /^(?:open|launch|start|run|bring\s+up|switch\s+to)\s+(?:the\s+)?(?:app(?:lication)?\s+)?(?:powerpoint|word|excel|ms-powerpoint|ms-word|ms-excel)$/i.test(lower.trim());

        if (isPptIntent && !isOpenOnly) {
            return {
                intent: 'DOCUMENT_GENERATION',
                sub_intent: 'POWERPOINT',
                keywords: ['ppt', 'presentation', 'powerpoint', 'slides'],
                user_goal: goal,
                target: 'PowerPoint presentation (PPT/PPTX)',
                output_format: 'PPTX_DOCUMENT',
                workflow: 'PRESENTATION_GENERATOR',
                required_parameters: { topic: goal },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic PowerPoint presentation creation'
            };
        }

        if (isWordIntent && !isOpenOnly) {
            return {
                intent: 'DOCUMENT_GENERATION',
                sub_intent: 'WORD',
                keywords: ['word', 'document', 'docx', 'report'],
                user_goal: goal,
                target: 'Word document (.docx)',
                output_format: 'DOCX_DOCUMENT',
                workflow: 'WORD_GENERATOR',
                required_parameters: { topic: goal },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic Word document creation'
            };
        }

        if (isSpreadsheetIntent && !isOpenOnly) {
            return {
                intent: 'DOCUMENT_GENERATION',
                sub_intent: 'EXCEL',
                keywords: ['spreadsheet', 'excel', 'sheet'],
                user_goal: goal,
                target: 'Excel spreadsheet (.xlsx)',
                output_format: 'XLSX_DOCUMENT',
                workflow: 'EXCEL_GENERATOR',
                required_parameters: { topic: goal },
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic spreadsheet creation'
            };
        }

        // C. Universal Application & Platform Priority Intent (Native Desktop Priority over Web)
        const platformResolver = require('../pilot/platform-resolver');
        const openAppMatch = lower.match(/^(?:open|launch|start|run|bring up|switch to)\s+(?:the\s+)?(?:app(?:lication)?\s+)?([a-zA-Z0-9_\-\.\s]+?)(?:\s+(?:and|to|then)\s+(.+))?$/i);
        const hasCommonAppKeyword = /\b(notepad|paint|calculator|clock|settings|camera|photos|cmd|powershell|terminal|explorer|teams|spotify|discord|zoom|vlc|chrome|edge|browser|vscode|code|slack|telegram|canva|notion|figma)\b/i.test(lower);

        if ((openAppMatch || hasCommonAppKeyword) && !lower.includes('calc') && !lower.includes('full_stack') && !hasFilePath && !lower.includes('.docx') && !lower.includes('.pptx') && !lower.includes('replace text')) {
            const resolution = platformResolver.resolvePlatformAction(goal);
            if (resolution.mode === 'NATIVE_APP') {
                return {
                    intent: 'APPLICATION_TASK',
                    sub_intent: openAppMatch && openAppMatch[2] ? 'EXECUTE_APP_TASK' : 'LAUNCH_APP',
                    keywords: ['app', 'launch', resolution.platform.toLowerCase()],
                    user_goal: goal,
                    target: resolution.platform,
                    output_format: 'DESKTOP_UI_ACTION',
                    workflow: 'GENERAL_DESKTOP_ADAPTER',
                    required_parameters: { appName: resolution.platform, task: resolution.task },
                    confidence: 1.0,
                    needs_clarification: false,
                    requires_confirmation: false,
                    reason: resolution.reason
                };
            } else if (resolution.mode === 'WEB_FALLBACK' || resolution.mode === 'WEB_AUTOMATION') {
                return {
                    intent: 'BROWSER_AUTOMATION',
                    sub_intent: 'NAVIGATE_AND_AUTOMATE',
                    keywords: ['web', 'browser', resolution.platform.toLowerCase()],
                    user_goal: goal,
                    target: resolution.target,
                    output_format: 'PLAYWRIGHT_ACTION',
                    workflow: 'BROWSER_CONTROLLER',
                    required_parameters: { url: resolution.target, task: resolution.task },
                    confidence: 1.0,
                    needs_clarification: false,
                    requires_confirmation: false,
                    reason: resolution.reason
                };
            }
        }

        if (this.isCouponIntent(goal)) {
            intent = 'COUPON_REDEMPTION';
            sub_intent = 'REDEEM';
            workflow = 'COUPON_MANAGER';
            keywords = ['coupon', 'redeem'];
            return {
                intent,
                sub_intent,
                keywords,
                user_goal: goal,
                target: '',
                output_format: '',
                workflow,
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic coupon recognition'
            };
        } else if (lower === 'payment' || lower === 'pay' || lower === 'checkout' || lower.includes('payment') || lower.includes('checkout') || lower.includes('buy plan') || lower.includes('upgrade plan') || lower.includes('purchase credits') || lower.includes('buy credits')) {
            intent = 'PAYMENT_CHECKOUT';
            sub_intent = 'ONLINE_PAYMENT';
            workflow = 'PAYMENT_GATEWAY';
            keywords = ['payment', 'checkout'];
            return {
                intent,
                sub_intent,
                keywords,
                user_goal: goal,
                target: '',
                output_format: '',
                workflow,
                required_parameters: {},
                confidence: 1.0,
                needs_clarification: false,
                requires_confirmation: false,
                reason: 'Deterministic payment checkout recognition'
            };
        } else if (lower.match(/^(hi|hello|hey|explain|what is|how does|why is)/)) {
            intent = 'GENERAL_CHAT';
            workflow = 'AI_CHAT';
        } else if (lower.includes('whatsapp') ||
                   (lower.includes('supervisor') && (lower.includes('voice') || lower.includes('reply') || lower.includes('message') || lower.includes('automation'))) ||
                   lower.includes('generate voice note') || lower.includes('send voice note')) {
            intent = 'SUPERVISOR_AUTOMATION';
            sub_intent = lower.includes('voice') ? 'WHATSAPP_VOICE' : 'WHATSAPP_MESSAGE';
            workflow = 'SUPERVISOR_WORKFLOW';
        } else if (lower.includes('powerpoint') || lower.includes('presentation') || lower.includes('slide')) {
            intent = 'DOCUMENT_GENERATION';
            sub_intent = 'POWERPOINT';
            workflow = 'PRESENTATION_GENERATOR';
        } else if (lower.includes('word document') || lower.includes('docx') || (lower.includes('report') && lower.includes('word'))) {
            intent = 'DOCUMENT_GENERATION';
            sub_intent = 'WORD';
            workflow = 'WORD_GENERATOR';
        } else if (lower.includes('csv') || lower.includes('excel') || lower.includes('spreadsheet') || lower.includes('data')) {
            intent = 'DATA_PROCESSING';
            sub_intent = lower.includes('csv') ? 'CSV_REPORT' : 'EXCEL';
            workflow = 'DATA_PROCESSOR';
        } else if (lower.includes('website code') || lower.includes('scrape') || lower.includes('extract')) {
            // Only route to WEBSITE_SCRAPING for live-scrape tasks (no "create/build/write/generate program" intent)
            const isCodeWritingIntent = lower.includes('python') || lower.includes('program') ||
                lower.includes('create') || lower.includes('build') || lower.includes('write') ||
                lower.includes('generate') || lower.includes('script') || lower.includes('code') ||
                lower.includes('flask') || lower.includes('fastapi') || lower.includes('scraper');
            if (isCodeWritingIntent) {
                intent = 'CODE_GENERATION';
                sub_intent = lower.includes('python') ? 'PYTHON' : 'SCRIPT';
                workflow = 'CODE_GENERATOR';
            } else {
                intent = 'WEBSITE_SCRAPING';
                workflow = 'SCRAPING_WORKFLOW';
            }
        } else if (lower.includes('source') || lower.includes('analyze website')) {
            intent = 'WEBSITE_SOURCE_ANALYSIS';
            workflow = 'SOURCE_ANALYSIS';
        } else if (lower.includes('wordpress')) {
            intent = 'WORDPRESS_TASK';
            workflow = 'WORDPRESS_ADAPTER';
        } else if (lower.includes('browser') || lower.includes('open this website') || lower.includes('fill out')) {
            intent = 'BROWSER_AUTOMATION';
            workflow = 'BROWSER_CONTROLLER';
        } else if (lower.includes('automate') || lower.includes('desktop')) {
            intent = 'GENERAL_AUTOMATION';
            workflow = 'DESKTOP_AUTOMATION';
        } else if (lower.includes('video') || lower.includes('வீடியோ')) {
            intent = 'VIDEO_EDITING';
            sub_intent = 'EDIT_VIDEO';
            workflow = 'VIDEO_EDITING_ADAPTER';
        } else if ((lower.includes('edit') || lower.includes('replace text')) && !lower.includes('video') && !lower.includes('வீடியோ')) {
            intent = 'FILE_OPERATIONS';
            workflow = 'FILE_EDITOR';
        } else if (lower.includes('create') && (lower.includes('website') || lower.includes('app') || lower.includes('project'))) {
            intent = 'PROJECT_GENERATION';
            workflow = 'PROJECT_GENERATOR';
        } else if (lower.includes('function') || lower.includes('code') || lower.includes('script') || lower.includes('javascript') || lower.includes('python')) {
            intent = 'CODE_GENERATION';
            workflow = 'CODE_GENERATOR';
        } else {
            intent = 'UNKNOWN_OR_AMBIGUOUS';
        }

        return {
            intent,
            sub_intent,
            keywords: lower.split(' ').slice(0, 5),
            user_goal: goal,
            target: '',
            output_format: '',
            workflow,
            required_parameters: {},
            confidence: 0.7,
            needs_clarification: intent === 'UNKNOWN_OR_AMBIGUOUS',
            requires_confirmation: false,
            reason: 'Heuristic classification'
        };
    }

    async classify(goal, apiCall) {
        // High-confidence local intent pre-check (Bypasses network delay & eliminates false AI classifications)
        const local = this.heuristicClassify(goal);
        if (local && (
            local.intent === 'PLAN_STATUS_QUERY' ||
            local.intent === 'FAMILY_ANALYTICS_QUERY' ||
            local.intent === 'LIST_INSTALLED_APPS' ||
            local.intent === 'SCREENSHOT_CAPTURE' ||
            local.intent === 'HARDWARE_FAN_CONTROL' ||
            local.intent === 'SYSTEM_HARDWARE_CONTROL' ||
            local.intent === 'MOVIE_TICKET_BOOKING' ||
            local.intent === 'WHATSAPP_WEB_TASK' ||
            local.intent === 'SUPERVISOR_AUTOMATION' ||
            local.intent === 'CALCULATOR_TASK' ||
            local.intent === 'APPLICATION_TASK' ||
            local.intent === 'COUPON_REDEMPTION' ||
            local.intent === 'PAYMENT_CHECKOUT' ||
            local.intent === 'FILE_OPERATIONS' ||
            local.intent === 'CLAUDE_TASK' ||
            local.intent === 'METATRADER_TASK' ||
            local.intent === 'SYSTEM_CLEANUP' ||
            local.intent === 'REMOTE_DEVICE_TASK' ||
            local.intent === 'DOCUMENT_GENERATION' ||
            local.intent === 'VIDEO_EDITING' ||
            local.intent === 'WEBSITE_SECURITY_AUDIT' ||
            local.intent === 'PROJECT_PURCHASE' ||
            local.intent === 'FULL_STACK_COURSE' ||
            local.intent === 'PRODUCT_SEARCH_AND_ORDER' ||
            local.intent === 'SELLER_WEBSITE_CREATION' ||
            local.intent === 'BUSINESS_SERVICES'
        )) {
            return local;
        }

        if (this.isWhatsAppIntent(goal)) {
            return this.heuristicClassify(goal);
        }

        if (this.isCouponIntent(goal)) {
            return this.heuristicClassify(goal);
        }

        const lower = (goal || '').toLowerCase().trim();
        if (lower === 'payment' || lower === 'pay' || lower === 'checkout' || lower === 'buy plan' || lower === 'upgrade plan' || lower === 'purchase credits') {
            return this.heuristicClassify(goal);
        }

        try {
            const prompt = `You are a strict Intent Classifier for the Codez48 CLI.
Classify the following user goal into EXACTLY one of these intents:
GENERAL_CHAT, COUPON_REDEMPTION, PAYMENT_CHECKOUT, CODE_GENERATION, PROJECT_GENERATION, FILE_OPERATIONS, BROWSER_AUTOMATION, WEBSITE_SCRAPING, WEBSITE_SOURCE_ANALYSIS, DOCUMENT_GENERATION, DATA_PROCESSING, WORDPRESS_TASK, GENERAL_AUTOMATION, SUPERVISOR_AUTOMATION, UNKNOWN_OR_AMBIGUOUS.
Return ONLY a valid JSON object with the following keys:
- intent (string)
- sub_intent (string)
- keywords (array of strings)
- user_goal (string)
- target (string)
- output_format (string)
- workflow (string)
- required_parameters (object)
- confidence (number 0-1)
- needs_clarification (boolean)
- requires_confirmation (boolean)
- reason (string)
Do NOT include markdown formatting or any other text. JUST JSON.

Goal: "${goal}"`;

            const res = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an intent classifier.' },
                        { role: 'user', content: prompt }
                    ],
                    projectId: null
                }),
                timeout: 7000
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.answer) {
                    let jsonText = data.answer;
                    if (jsonText.startsWith('```json')) {
                        jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
                    } else if (jsonText.startsWith('```')) {
                        jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
                    }
                    const parsed = JSON.parse(jsonText);
                    if (parsed.intent) {
                        // Override: if goal involves WhatsApp, strictly route to SUPERVISOR_AUTOMATION
                        if (this.isWhatsAppIntent(goal)) {
                            parsed.intent = 'SUPERVISOR_AUTOMATION';
                            parsed.sub_intent = lower.includes('voice') ? 'WHATSAPP_VOICE' : 'WHATSAPP_MESSAGE';
                            parsed.workflow = 'SUPERVISOR_WORKFLOW';
                            parsed.reason = 'Corrected: WhatsApp automation recognized deterministically';
                            return parsed;
                        }

                        // Override: if AI classified as WEBSITE_SCRAPING but goal is code-writing, correct it
                        if (parsed.intent === 'WEBSITE_SCRAPING') {
                            const isCodeWritingIntent = lower.includes('python') || lower.includes('program') ||
                                lower.includes('create') || lower.includes('build') || lower.includes('write') ||
                                lower.includes('generate') || lower.includes('script') ||
                                lower.includes('flask') || lower.includes('fastapi') || lower.includes('scraper');
                            if (isCodeWritingIntent) {
                                parsed.intent = 'CODE_GENERATION';
                                parsed.sub_intent = lower.includes('python') ? 'PYTHON' : 'SCRIPT';
                                parsed.workflow = 'CODE_GENERATOR';
                                parsed.reason = 'Corrected: code-writing goal reclassified from WEBSITE_SCRAPING to CODE_GENERATION';
                            }
                        }
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.warn(`\n[CLASSIFIER WARN] AI Classification failed: ${e.message}. Using heuristic fallback.`);
        }

        // Fallback
        return this.heuristicClassify(goal);
    }

    display(classification) {
        if (logger.currentLevel >= logger.LEVELS.DEBUG) {
            logger.debug(`[INPUT RECEIVED] Intent: ${classification.intent} | Workflow: ${classification.workflow || 'DEFAULT'} | Goal: ${classification.user_goal}`);
            if (classification.sub_intent) logger.debug(`[SUB_INTENT: ${classification.sub_intent}]`);
            if (classification.keywords && classification.keywords.length > 0) logger.debug(`[KEYWORDS: ${classification.keywords.join(', ')}]`);
        } else {
            logger.status('Processing your request...');
        }
    }
}

module.exports = new IntentClassifier();
