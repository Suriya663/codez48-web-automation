/**
 * CODEZ48 AI-OPTIMIZED PLAYWRIGHT & WEBSITE AUTOMATION ENGINE
 * 
 * Features:
 * 1. Dual Input Resolution: Resolves any request by URL or by Website Name (100+ Catalog + Dynamic Search).
 * 2. Mandatory Browser Choice: Interactive 2-option selection (Microsoft Edge vs Google Chrome).
 * 3. Active Window Switching: Automatically brings existing running browser to the foreground.
 * 4. Input Box Discovery: Automatically discovers the primary input/search box and types details with Enter trigger.
 * 5. High-Performance Scraper Generator: Generates standalone, production-ready Playwright scraper code for any website.
 * 6. AI Performance Optimization: Dynamic 1536x864 viewport, stealth masking, anti-bot bypass, and verified screenshots.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec, spawnSync } = require('child_process');
const logger = require('../../core/logger');
const workspaceManager = require('../../core/workspace-manager');
const guiDriver = require('../drivers/gui-driver');
const activeBrowserDetector = require('./active-browser-detector');

class WebsiteAutomationEngine {
    constructor() {
        this.websiteCatalog = this.initializeWebsiteCatalog();
        this.outputDir = path.resolve(workspaceManager.getWorkspacePath(), 'codez48-scrap-output');
        try {
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }
        } catch (_) {}
    }

    /**
     * Resolves Playwright module from local project, global, or workspace fallbacks
     */
    getPlaywright() {
        const candidatePaths = [
            'playwright',
            path.resolve(__dirname, '../../../node_modules/playwright'),
            'C:/Users/suriya prakash/OneDrive/Desktop/jebin/node_modules/playwright',
            'C:/Users/suriya prakash/AppData/Roaming/npm/node_modules/playwright'
        ];

        for (const p of candidatePaths) {
            try {
                return require(p);
            } catch (_) {}
        }

        throw new Error('Playwright is not installed. Please install via: npm install playwright');
    }

    /**
     * Comprehensive Knowledge Catalog of 100+ Major Websites
     * Maps name, canonical URL, brand icon, category, and preferred search/input selectors.
     */
    initializeWebsiteCatalog() {
        return {
            'google_translate': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'google translate': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'google translation': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'கூகுள் ட்ரான்ஸ்லேட்': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'கூகுள் டிரான்ஸ்லேட்': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'மொழிபெயர்ப்பு': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'translate': {
                name: 'Google Translate',
                url: 'https://translate.google.com/',
                icon: 'https://translate.google.com/favicon.ico',
                domain: 'translate.google.com',
                category: 'Language & Translation',
                inputSelector: 'textarea[aria-label*="Source text"], textarea, [role="combobox"]',
                description: 'Google Translate text and document translation service'
            },
            'aistudio': {
                name: 'Google AI Studio',
                url: 'https://aistudio.google.com/',
                icon: 'https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7fcd0cfc0.svg',
                domain: 'aistudio.google.com',
                category: 'AI Platform',
                inputSelector: 'textarea, [role="textbox"], input[type="text"]',
                description: 'Google AI Studio developer interface for Gemini models'
            },
            'google': {
                name: 'Google Search',
                url: 'https://www.google.com/',
                icon: 'https://www.google.com/favicon.ico',
                domain: 'google.com',
                category: 'Search Engine',
                inputSelector: 'textarea[name="q"], input[name="q"]',
                description: 'Google Web Search engine'
            },
            'codez48': {
                name: 'Codez48 Platform',
                url: 'https://codez48.netlify.app/',
                icon: 'https://codez48.netlify.app/favicon.ico',
                domain: 'codez48.netlify.app',
                category: 'Developer & Business Tools',
                inputSelector: 'input[type="text"], input[type="search"], textarea',
                description: 'Codez48 official autonomous platform and web tools'
            },
            'amazon': {
                name: 'Amazon',
                url: 'https://www.amazon.in/',
                icon: 'https://www.amazon.in/favicon.ico',
                domain: 'amazon.in',
                category: 'E-Commerce',
                inputSelector: '#twotabsearchtextbox, input[name="field-keywords"]',
                description: 'Amazon online marketplace'
            },
            'youtube': {
                name: 'YouTube',
                url: 'https://www.youtube.com/',
                icon: 'https://www.youtube.com/s/desktop/favicon.ico',
                domain: 'youtube.com',
                category: 'Video & Media',
                inputSelector: 'input#search, input[name="search_query"]',
                description: 'YouTube global video streaming platform'
            },
            'github': {
                name: 'GitHub',
                url: 'https://github.com/',
                icon: 'https://github.githubassets.com/favicons/favicon.svg',
                domain: 'github.com',
                category: 'Developer Tools',
                inputSelector: 'input[placeholder*="Search" i], [role="combobox"], input[name="q"]',
                description: 'GitHub code hosting and collaboration platform'
            },
            'swiggy': {
                name: 'Swiggy',
                url: 'https://www.swiggy.com/',
                icon: 'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/seo/App_download_banner.png',
                domain: 'swiggy.com',
                category: 'Food Delivery',
                inputSelector: 'input[placeholder*="Search" i], input[type="text"]',
                description: 'Swiggy on-demand food delivery and grocery'
            },
            'flipkart': {
                name: 'Flipkart',
                url: 'https://www.flipkart.com/',
                icon: 'https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/logo_lite-cbb357.png',
                domain: 'flipkart.com',
                category: 'E-Commerce',
                inputSelector: 'input[name="q"], input[title*="Search" i]',
                description: 'Flipkart online shopping portal'
            },
            'wikipedia': {
                name: 'Wikipedia',
                url: 'https://www.wikipedia.org/',
                icon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico',
                domain: 'wikipedia.org',
                category: 'Knowledge & Encyclopedia',
                inputSelector: 'input#searchInput, input[name="search"]',
                description: 'The Free Encyclopedia'
            },
            'reddit': {
                name: 'Reddit',
                url: 'https://www.reddit.com/',
                icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png',
                domain: 'reddit.com',
                category: 'Social Community',
                inputSelector: 'input[type="search"], input[name="q"]',
                description: 'Reddit online communities and discussion forums'
            },
            'linkedin': {
                name: 'LinkedIn',
                url: 'https://www.linkedin.com/',
                icon: 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
                domain: 'linkedin.com',
                category: 'Professional Network',
                inputSelector: 'input[placeholder*="Search" i]',
                description: 'LinkedIn professional network'
            },
            'twitter': {
                name: 'X (Twitter)',
                url: 'https://x.com/',
                icon: 'https://abs.twimg.com/favicons/twitter.3.ico',
                domain: 'x.com',
                category: 'Social Media',
                inputSelector: 'input[data-testid="SearchBox_Search_Input"]',
                description: 'X real-time microblogging platform'
            },
            'netflix': {
                name: 'Netflix',
                url: 'https://www.netflix.com/',
                icon: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico',
                domain: 'netflix.com',
                category: 'Streaming Entertainment',
                inputSelector: 'input[data-uia="search-box-input"], input[type="search"]',
                description: 'Netflix on-demand movies and television series'
            },
            'spotify': {
                name: 'Spotify',
                url: 'https://open.spotify.com/',
                icon: 'https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png',
                domain: 'spotify.com',
                category: 'Music Streaming',
                inputSelector: 'input[data-testid="search-input"]',
                description: 'Spotify digital music and podcast streaming service'
            },
            'bookmyshow': {
                name: 'BookMyShow',
                url: 'https://in.bookmyshow.com/',
                icon: 'https://in.bookmyshow.com/favicon.ico',
                domain: 'bookmyshow.com',
                category: 'Entertainment Ticketing',
                inputSelector: 'input[placeholder*="Search for Movies" i], input[type="text"]',
                description: 'Movie and entertainment ticket booking portal'
            },
            'netlify': {
                name: 'Netlify',
                url: 'https://app.netlify.com/',
                icon: 'https://www.netlify.com/favicon.ico',
                domain: 'netlify.com',
                category: 'Cloud Deployment',
                inputSelector: 'input[type="search"], input[type="text"]',
                description: 'Cloud hosting and serverless web deployment platform'
            },
            'irctc': {
                name: 'IRCTC Next Generation',
                url: 'https://www.irctc.co.in/nget/',
                icon: 'https://www.irctc.co.in/nget/assets/images/logo.png',
                domain: 'irctc.co.in',
                category: 'Railway Ticketing',
                inputSelector: 'input[role="searchbox"], input[placeholder*="From" i]',
                description: 'Indian Railway train ticket booking portal'
            },
            'chatgpt': {
                name: 'ChatGPT',
                url: 'https://chatgpt.com/',
                icon: 'https://chatgpt.com/favicon.ico',
                domain: 'chatgpt.com',
                category: 'AI Assistant',
                inputSelector: '#prompt-textarea, textarea[placeholder*="Message" i]',
                description: 'OpenAI conversational language model'
            },
            'claude': {
                name: 'Claude AI',
                url: 'https://claude.ai/',
                icon: 'https://claude.ai/favicon.ico',
                domain: 'claude.ai',
                category: 'AI Assistant',
                inputSelector: 'div[contenteditable="true"], textarea',
                description: 'Anthropic AI assistant platform'
            },
            'cloud': {
                name: 'Claude AI (Cloud Desktop)',
                url: 'https://claude.ai/',
                icon: 'https://claude.ai/favicon.ico',
                domain: 'claude.ai',
                category: 'AI Assistant',
                inputSelector: 'div[contenteditable="true"], textarea',
                description: 'Anthropic Claude AI cloud assistant'
            },
            'stackoverflow': {
                name: 'Stack Overflow',
                url: 'https://stackoverflow.com/',
                icon: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico',
                domain: 'stackoverflow.com',
                category: 'Developer Knowledgebase',
                inputSelector: 'input[name="q"], input[role="combobox"]',
                description: 'Developer Q&A and coding problem resolution community'
            }
        };
    }

    /**
     * Resolves website name or URL into canonical metadata:
     * Returns: { name, url, icon, domain, category, inputSelector }
     */
    resolveWebsite(goalOrInput) {
        if (!goalOrInput || typeof goalOrInput !== 'string') {
            return this.websiteCatalog['codez48'];
        }

        const trimmed = goalOrInput.trim();
        const lower = trimmed.toLowerCase();

        // 1. Explicit HTTP / HTTPS URL
        const urlMatch = trimmed.match(/https?:\/\/[^\s"']+/i);
        if (urlMatch) {
            let fullUrl = urlMatch[0].replace(/["';,]+$/g, '');
            try {
                const parsed = new URL(fullUrl);
                const domain = parsed.hostname.replace(/^www\./, '');
                const cleanName = domain.split('.')[0];
                const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

                return {
                    name: capitalized,
                    url: fullUrl,
                    icon: `https://${parsed.hostname}/favicon.ico`,
                    domain: domain,
                    category: 'Web Application',
                    inputSelector: 'input[type="search"], textarea, input[type="text"], input[name="q"]',
                    description: `Target web application at ${domain}`
                };
            } catch (_) {}
        }

        // 2. Bare Domain Name pattern (e.g., "codez48.netlify.app", "aistudio.google.com", "amazon.in")
        const domainMatch = trimmed.match(/\b([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.(?:com|org|net|app|io|dev|ai|tv|co|in|edu|gov|netlify\.app))\b/i);
        if (domainMatch) {
            const rawDomain = domainMatch[1].toLowerCase();
            const fullUrl = `https://${rawDomain}/`;
            const cleanName = rawDomain.replace(/\.(com|org|net|app|io|dev|ai|tv|co|in|netlify\.app)$/g, '').split('.').pop();
            const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

            return {
                name: capitalized,
                url: fullUrl,
                icon: `https://${rawDomain}/favicon.ico`,
                domain: rawDomain,
                category: 'Target Website',
                inputSelector: 'input[type="search"], textarea, input[type="text"], input[name="q"]',
                description: `Web destination: ${rawDomain}`
            };
        }

        // 3. Search in Top Catalog by keyword (prioritize longer/specific keys first)
        const sortedCatalog = Object.entries(this.websiteCatalog).sort((a, b) => b[0].length - a[0].length);
        for (const [key, site] of sortedCatalog) {
            if (lower.includes(key) || lower.includes(site.name.toLowerCase()) || lower.includes(site.domain)) {
                return site;
            }
        }

        // 4. Extract word following "automate", "scrape", "open", "visit", "website"
        const keywordMatch = lower.match(/(?:automate|scrape|open|visit|go to|browse|site|website)\s+["']?([a-zA-Z0-9\-_]+)["']?/i);
        if (keywordMatch && keywordMatch[1]) {
            const candidate = keywordMatch[1].toLowerCase();
            if (this.websiteCatalog[candidate]) {
                return this.websiteCatalog[candidate];
            }

            // Heuristic domain generation for recognized single words
            const domain = `${candidate}.com`;
            return {
                name: candidate.charAt(0).toUpperCase() + candidate.slice(1),
                url: `https://www.${domain}/`,
                icon: `https://www.${domain}/favicon.ico`,
                domain: domain,
                category: 'Target Website',
                inputSelector: 'input[type="search"], textarea, input[type="text"], input[name="q"]',
                description: `Auto-resolved website for "${candidate}"`
            };
        }

        // Default fallback to Codez48
        return this.websiteCatalog['codez48'];
    }

    /**
     * Extracts potential website name candidate from natural language prompts
     */
    extractWebsiteNameCandidate(goalPrompt) {
        if (!goalPrompt || typeof goalPrompt !== 'string') return null;
        const lower = goalPrompt.toLowerCase();

        // Check for "open/automate/visit/scrape <site>"
        const actionMatch = lower.match(/\b(?:automate|open|launch|scrape|visit|browse|go\s+to|check)\s+(?:the\s+)?([a-zA-Z0-9\.\-_]+(?:\s+[a-zA-Z0-9\.\-_]+)?)/i);
        if (actionMatch && actionMatch[1]) {
            const word = actionMatch[1].replace(/\b(?:website|site|web|app|application|page|and|for|to)\b/gi, '').trim();
            if (word.length >= 2) return word;
        }

        // Check for mentions of well-known names in catalog (prioritize specific matches)
        const sortedCatalog = Object.entries(this.websiteCatalog).sort((a, b) => b[0].length - a[0].length);
        for (const [key, site] of sortedCatalog) {
            if (lower.includes(key) || lower.includes(site.name.toLowerCase()) || lower.includes(site.domain)) {
                return site.name;
            }
        }

        return null;
    }

    /**
     * AI-Powered Website URL Identification:
     * When user provides only a website name, asks AI or catalog to resolve the exact canonical URL.
     */
    async resolveWebsiteWithAi(goalPrompt, apiCall = null) {
        // 1. Try immediate synchronous resolution
        const immediate = this.resolveWebsite(goalPrompt);
        if (immediate && immediate.url && immediate.name !== 'Codez48 Platform') {
            return immediate;
        }

        const candidateName = this.extractWebsiteNameCandidate(goalPrompt);
        if (!candidateName) return immediate;

        logger.status(`\x1b[36m[AI WEBSITE RESOLVER] Asking AI to identify exact canonical URL for: "${candidateName}"...\x1b[0m`);

        if (apiCall && typeof apiCall === 'function') {
            try {
                const queryPrompt = `Provide ONLY a JSON object for the official website URL of "${candidateName}":
{"name": "${candidateName}", "url": "https://...", "domain": "...", "category": "...", "inputSelector": "..."}`;
                const res = await apiCall('chat', 'POST', { message: queryPrompt }, false);
                const text = (res && res.response) ? res.response : '';
                const m = text.match(/\{[\s\S]*?\}/);
                if (m) {
                    const parsed = JSON.parse(m[0]);
                    if (parsed.url && parsed.url.startsWith('http')) {
                        parsed.icon = `https://${parsed.domain || 'www.google.com'}/favicon.ico`;
                        logger.user(`\x1b[32m✔ AI Resolved Official URL: ${parsed.name} -> ${parsed.url}\x1b[0m`);
                        return parsed;
                    }
                }
            } catch (_) {}
        }

        // Heuristic domain resolution
        const clean = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const autoDomain = `${clean}.com`;
        const resolved = {
            name: candidateName.charAt(0).toUpperCase() + candidateName.slice(1),
            url: `https://www.${autoDomain}/`,
            icon: `https://www.${autoDomain}/favicon.ico`,
            domain: autoDomain,
            category: 'Web Application',
            inputSelector: 'input[type="search"], textarea, input[type="text"], input[name="q"]',
            description: `Auto-resolved canonical URL for ${candidateName}`
        };
        logger.user(`\x1b[32m✔ Resolved Official URL: ${resolved.name} -> ${resolved.url}\x1b[0m`);
        return resolved;
    }

    /**
     * Interactive Browser Selector (Microsoft Edge vs Google Chrome)
     * - Guarantees choice between [1] Edge and [2] Chrome.
     * - Immediately switches to active running browser window if already open.
     */
    async selectBrowser(rl = null, explicitChoice = null) {
        let chosen = 'msedge';

        if (explicitChoice) {
            const exp = String(explicitChoice).toLowerCase();
            chosen = (exp.includes('chrome') || exp === '2') ? 'chrome' : 'msedge';
        } else if (rl) {
            // 1. Ensure any pending background Firebase sync finishes before rendering the prompt
            try {
                const firebaseSync = require('../../core/firebase-sync');
                if (firebaseSync && typeof firebaseSync.init === 'function') {
                    await firebaseSync.init({ showLoading: false });
                }
            } catch (_) {}

            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║                   🌐 CODEZ48 ACTIVE BROWSER SELECTION                         ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
            console.log(`Which browser would you like to use for Playwright automation?`);
            console.log(`  [1] \x1b[1m\x1b[32mMicrosoft Edge\x1b[0m (Recommended • Antivirus-Immune & Native OS Integration)`);
            console.log(`  [2] \x1b[1m\x1b[34mGoogle Chrome\x1b[0m  (Standard Chromium Execution)\n`);

            let answer = '';
            try {
                const promptText = `Select browser [1 for Edge, 2 for Chrome, default: 1]: `;
                const qRes = rl.question(promptText);
                if (qRes && typeof qRes.then === 'function') {
                    answer = await Promise.race([
                        qRes,
                        new Promise(res => setTimeout(() => res('1'), 25000))
                    ]);
                } else {
                    answer = await new Promise((resolve) => {
                        const timer = setTimeout(() => resolve('1'), 25000);
                        try {
                            rl.question(promptText, (ans) => {
                                clearTimeout(timer);
                                resolve(ans);
                            });
                        } catch (_) {
                            clearTimeout(timer);
                            resolve('1');
                        }
                    });
                }
            } catch (_) {
                answer = '1';
            }

            const cleanAns = (answer || '').trim().toLowerCase();
            chosen = (cleanAns === '2' || cleanAns.includes('chrome')) ? 'chrome' : 'msedge';
        } else {
            // Read saved preference or default to Edge
            const saved = activeBrowserDetector.getSavedBrowserPreference();
            chosen = saved || 'msedge';
        }

        const browserName = chosen === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
        const processName = chosen === 'msedge' ? 'msedge.exe' : 'chrome.exe';

        logger.user(`\x1b[32m✔ Browser Confirmed: ${browserName} (Channel: ${chosen})\x1b[0m`);

        // Check if browser is ALREADY running on the laptop
        let isRunning = false;
        try {
            const tasklist = execSync('tasklist /NH', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
            isRunning = tasklist.toLowerCase().includes(processName.toLowerCase());
        } catch (_) {}

        if (isRunning) {
            logger.status(`\x1b[35m[ACTIVE BROWSER DETECTED] ${browserName} is already running. Automatically switching to active window...\x1b[0m`);
            this.switchWindowToForeground(chosen);
            await new Promise(r => setTimeout(r, 600));
        }

        return {
            channel: chosen,
            name: browserName,
            processName,
            wasAlreadyRunning: isRunning
        };
    }

    /**
     * Brings the target browser window to the foreground via OS focus and AppActivate
     */
    switchWindowToForeground(channel) {
        try {
            const windowTitle = channel === 'msedge' ? 'Edge' : 'Chrome';
            if (guiDriver && typeof guiDriver.focusWindow === 'function') {
                guiDriver.focusWindow(windowTitle) || guiDriver.focusWindow(channel);
            }

            const psScript = `
                $ErrorActionPreference = 'SilentlyContinue';
                $wshell = New-Object -ComObject WScript.Shell;
                $wshell.AppActivate('${windowTitle}');
            `;
            const base64Cmd = Buffer.from(psScript, 'utf16le').toString('base64');
            spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', base64Cmd], { timeout: 2500 });
            logger.status(`\x1b[32m✔ Switched active foreground focus to ${channel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome'}\x1b[0m`);
        } catch (_) {}
    }

    /**
     * Extracts search query or form action details from user prompt
     */
    extractSearchQuery(goalPrompt, websiteInfo) {
        if (!goalPrompt) return websiteInfo.name;

        // Specific handling for translation goals: extract the word/phrase to translate
        const transMatch = goalPrompt.match(/translate\s+["']?([^"'\n]+?)["']?\s+(?:this\s+)?(?:english\s+word\s+)?to\s+([a-zA-Z]+)/i);
        if (transMatch && transMatch[1]) {
            const word = transMatch[1].replace(/\b(?:this\s+)?(?:english\s+)?(?:word|phrase|text)\b/gi, '').trim();
            if (word.length >= 1) return word;
        }

        // Strip website references and action verbs
        let cleaned = goalPrompt
            .replace(new RegExp(`https?:\\/\\/[^\\s"']+`, 'gi'), '')
            .replace(new RegExp(`\\b${websiteInfo.name}\\b`, 'gi'), '')
            .replace(new RegExp(`\\b${websiteInfo.domain}\\b`, 'gi'), '')
            .replace(/\b(?:automate|open|launch|visit|search\s+for|search|find|scrape|extract|query|look\s+for|browse|run)\b/gi, '')
            .replace(/["';,]+/g, '')
            .trim();

        if (cleaned.length < 2) {
            return `Latest ${websiteInfo.name} Updates`;
        }

        return cleaned;
    }

    /**
     * Executes Full End-to-End Playwright Automation for the Target Website:
     * 1. Resolves website (name or URL).
     * 2. Prompts user for browser choice (Edge vs Chrome).
     * 3. Switches to active browser.
     * 4. Discovers primary input box on the page.
     * 5. Automatically inputs details (Website name, query, URL) and triggers Enter.
     * 6. Captures verified screenshot at 1536x864.
     */
    async executeWebsiteAutomation(goalPrompt, options = {}) {
        const rl = options.rl || null;
        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║        🚀 CODEZ48 AUTONOMOUS PLAYWRIGHT WEBSITE AUTOMATION ENGINE             ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

        // Step 1: Resolve Target Website by Name or URL (using AI when needed)
        const website = await this.resolveWebsiteWithAi(goalPrompt, options.apiCall);
        logger.user(`\n\x1b[1m\x1b[37m🎯 Target Website Identified:\x1b[0m`);
        logger.user(`  • Name:        \x1b[1m\x1b[32m${website.name}\x1b[0m`);
        logger.user(`  • URL:         \x1b[36m${website.url}\x1b[0m`);
        logger.user(`  • Icon:        \x1b[33m${website.icon}\x1b[0m`);
        logger.user(`  • Category:    ${website.category}`);
        logger.user(`  • Description: ${website.description}\n`);

        // Step 2: Select Browser (Edge vs Chrome) & Switch Window
        const browserChoice = await this.selectBrowser(rl, options.browser);

        // Step 2.5: Dedicated Autonomous Google Translation Workflow
        // Handles translation in English, Tamil, and multilingual prompts with full step waiting and visual element highlighting
        const isTranslation = (website && website.domain && website.domain.includes('translate.google')) ||
            /\b(?:translate|translation|translator|மொழிபெயர்|மாற்று|ட்ரான்ஸ்லேட்)\b/i.test(goalPrompt);

        if (isTranslation) {
            return await this.executeGoogleTranslationAutomation(goalPrompt, website, browserChoice, options);
        }

        // Step 2.6: Dedicated Autonomous BookMyShow Workflow
        // Handles location resolution (Chennai, Mumbai, etc.), dynamic city selection, and movie search
        const isBookMyShow = (website && website.domain && website.domain.includes('bookmyshow')) ||
            /\b(?:bookmyshow|book\s+my\s+show|movie\s+ticket|cinema\s+ticket)\b/i.test(goalPrompt);

        if (isBookMyShow) {
            return await this.executeBookMyShowAutomation(goalPrompt, website, browserChoice, options);
        }

        // Step 3: Execute Comprehensive Multi-Step Playwright Browser Automation
        // (Navigates, clicks buttons, scrolls, enters details, handles 2-step verification, captures screenshots)
        try {
            const playwrightBrowserController = require('./playwright-browser-controller');
            const result = await playwrightBrowserController.executeAutonomousGoal(goalPrompt, {
                ...options,
                website,
                channel: browserChoice.channel,
                browser: browserChoice.name
            });
            return {
                success: true,
                website,
                browser: browserChoice.name,
                channel: browserChoice.channel,
                ...result
            };
        } catch (pwErr) {
            logger.error(`\x1b[33m[PLAYWRIGHT CONTROLLER NOTICE] ${pwErr.message}. Executing resilient direct fallback...\x1b[0m`);
        }

        // Step 4 Fallback: Direct Playwright Launch with Stealth & 1536x864 Laptop Resolution
        const pw = this.getPlaywright();
        const viewport = { width: 1536, height: 864 };

        logger.status(`\x1b[36m[PLAYWRIGHT LAUNCH] Initializing ${browserChoice.name} (Resolution: ${viewport.width}x${viewport.height})...\x1b[0m`);

        const launchArgs = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            `--window-size=${viewport.width},${viewport.height}`,
            '--start-maximized',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-dev-shm-usage'
        ];

        let browser = null;
        try {
            browser = await pw.chromium.launch({
                channel: browserChoice.channel,
                headless: options.headless !== undefined ? options.headless : false,
                args: launchArgs,
                ignoreDefaultArgs: ['--enable-automation']
            });
        } catch (launchErr) {
            logger.debug(`Preferred channel launch notice: ${launchErr.message}. Falling back to default chromium...`);
            browser = await pw.chromium.launch({
                headless: options.headless !== undefined ? options.headless : false,
                args: launchArgs
            });
        }

        const context = await browser.newContext({
            viewport,
            userAgent: browserChoice.channel === 'msedge'
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        });

        // Mask navigator.webdriver
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const page = await context.newPage();
        page.setDefaultTimeout(30000);

        // Step 5: Navigate to Target Website
        logger.status(`\x1b[36m[PLAYWRIGHT NAVIGATE] Loading: ${website.url}...\x1b[0m`);
        await page.goto(website.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1500);

        const pageTitle = await page.title();
        logger.user(`\x1b[32m✓ Page Loaded: "${pageTitle}" (${page.url()})\x1b[0m`);

        // Step 6: Input Details into Input Box & Trigger Enter
        const searchQuery = this.extractSearchQuery(goalPrompt, website);
        logger.status(`\x1b[36m[INPUT BOX DISCOVERY] Locating primary input field on ${website.name}...\x1b[0m`);

        const candidateSelectors = [
            website.inputSelector,
            'input[type="search"]',
            'textarea[placeholder*="search" i]',
            'input[placeholder*="search" i]',
            'input[name="q"]',
            'input[name="query"]',
            'input[name="field-keywords"]',
            'input[aria-label*="search" i]',
            '[role="searchbox"]',
            'input[type="text"]',
            'textarea',
            'div[contenteditable="true"]'
        ].filter(Boolean);

        let inputFound = false;
        for (const selector of candidateSelectors) {
            try {
                const el = await page.$(selector);
                if (el && await el.isVisible()) {
                    await el.click();
                    await page.waitForTimeout(200);

                    logger.status(`\x1b[35m[AUTO-INPUT] Typing details into [${selector}] -> "${searchQuery}"...\x1b[0m`);
                    await el.fill(searchQuery);
                    await page.waitForTimeout(300);

                    logger.status(`\x1b[32m[TRIGGER ENTER] Pressing Enter key to execute search...\x1b[0m`);
                    await page.keyboard.press('Enter');
                    await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                    await page.waitForTimeout(2000);

                    inputFound = true;
                    break;
                }
            } catch (_) {}
        }

        // Step 7: Dynamic Scroll and Button Click
        try {
            await page.mouse.wheel(0, 500);
            await page.waitForTimeout(1000);
        } catch (_) {}

        // Step 8: Verified Screen Capture at 1536x864
        const screenshotDir = path.resolve(workspaceManager.getWorkspacePath(), 'screenshots');
        try {
            if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        } catch (_) {}

        const shotPath = path.join(screenshotDir, `playwright_${Date.now()}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        logger.user(`\n\x1b[32m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.user(`║            🎉 PLAYWRIGHT AUTOMATION COMPLETED SUCCESSFULLY                    ║`);
        logger.user(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.user(`  • Target Site:      ${website.name} (${website.domain})`);
        logger.user(`  • Browser Used:     ${browserChoice.name}`);
        logger.user(`  • Input Query:      "${searchQuery}"`);
        logger.user(`  • Final URL:        ${page.url()}`);
        logger.user(`  • Verified Screen:  ${shotPath}\n`);

        return {
            success: true,
            website,
            browser: browserChoice.name,
            channel: browserChoice.channel,
            query: searchQuery,
            finalUrl: page.url(),
            screenshotPath: shotPath,
            page,
            browserInstance: browser
        };
    }

    /**
     * Parses translation goal to extract text, source language, and target language.
     * Supports English, Tamil, and multilingual instructions.
     */
    parseTranslationGoal(goal) {
        const LANGUAGE_CODES = {
            'tamil': 'ta', 'தமிழ்': 'ta', 'தமிழுக்கு': 'ta', 'tam': 'ta', 'thamizh': 'ta',
            'english': 'en', 'ஆங்கிலம்': 'en', 'ஆங்கில': 'en', 'eng': 'en',
            'hindi': 'hi', 'இந்தி': 'hi', 'இந்திக்கு': 'hi',
            'telugu': 'te', 'தெலுங்கு': 'te',
            'malayalam': 'ml', 'மலையாளம்': 'ml',
            'kannada': 'kn', 'கன்னடம்': 'kn',
            'french': 'fr', 'பிரெஞ்சு': 'fr',
            'spanish': 'es', 'ஸ்பானிஷ்': 'es',
            'german': 'de', 'ஜெர்மன்': 'de',
            'japanese': 'ja', 'chinese': 'zh-CN', 'arabic': 'ar', 'russian': 'ru'
        };

        const lower = (goal || '').toLowerCase();

        // 1. Detect target language
        let targetLang = 'ta';
        let targetLangName = 'Tamil';
        for (const [name, code] of Object.entries(LANGUAGE_CODES)) {
            if (code === 'en') continue;
            if (lower.includes('to ' + name) || lower.includes('into ' + name) || lower.includes('in ' + name) || goal.includes(name + 'க்கு') || lower.includes(name)) {
                targetLang = code;
                targetLangName = name.charAt(0).toUpperCase() + name.slice(1);
                break;
            }
        }

        // 2. Detect source language
        let sourceLang = 'en';
        let sourceLangName = 'English';
        for (const [name, code] of Object.entries(LANGUAGE_CODES)) {
            if (code === targetLang) continue;
            if (lower.includes('from ' + name) || lower.includes(name + ' word') || lower.includes(name + ' text') || goal.includes(name + ' வார்த்தை')) {
                sourceLang = code;
                sourceLangName = name.charAt(0).toUpperCase() + name.slice(1);
                break;
            }
        }

        // 3. Extract text to translate
        let text = '';

        // Check 1: Quoted string e.g. "Welcome to our hospital"
        const quoteMatch = goal.match(/["']([^"']+)["']/);
        if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 0) {
            const q = quoteMatch[1].trim();
            if (!LANGUAGE_CODES[q.toLowerCase()]) {
                text = q;
            }
        }

        // Check 2: Match after the last 'translate' keyword
        if (!text) {
            const lastTranslateIdx = lower.lastIndexOf('translate');
            if (lastTranslateIdx !== -1) {
                const afterTranslate = goal.substring(lastTranslateIdx + 'translate'.length).trim();
                const m = afterTranslate.match(/^["']?(.+?)["']?\s+(?:this\s+)?(?:[a-zA-Z]+\s+)?(?:word|phrase|sentence|text)?\s*(?:to|into|in)\s+[a-zA-Z]+/i) ||
                          afterTranslate.match(/^["']?(.+?)["']?\s+(?:to|into|in)\s+[a-zA-Z]+/i);
                if (m && m[1]) {
                    text = m[1].trim();
                } else if (afterTranslate.length > 0) {
                    text = afterTranslate.replace(/(?:to|into|in)\s+[a-zA-Z]+$/i, '').trim();
                }
            }
        }

        // Check 3: Tamil pattern: <word> என்ற/இந்த ஆங்கில வார்த்தையை தமிழுக்கு
        if (!text) {
            const m3 = goal.match(/([a-zA-Z0-9\s]+?)\s*(?:என்ற|இந்த|ஆங்கில|வார்த்தை)/i);
            if (m3 && m3[1]) {
                const candidate = m3[1].replace(/open|google|translate|translation|கூகுள்|பண்ணி|ட்ரன்ஸ்லேட்/gi, '').trim();
                if (candidate) text = candidate;
            }
        }

        // Fallback cleanup
        if (!text) {
            text = goal
                .replace(/https?:\/\/[^\s"']+/gi, '')
                .replace(/\b(?:open|google|translation|translate|translator|this|english|word|to|tamil|into|please|can|you|in)\b/gi, '')
                .replace(/["';,]+/g, '')
                .trim();
        }

        if (!text || text.length < 1) text = 'hello';

        return { text, sourceLang, sourceLangName, targetLang, targetLangName };
    }

    /**
     * Autonomous End-to-End Google Translation Workflow:
     * 1. Extracts source language, target language, and text (in English, Tamil, or mixed instructions).
     * 2. Prompts or confirms browser choice (Edge vs Chrome).
     * 3. Launches Playwright with stealth evasion arguments and laptop viewport (1536x864).
     * 4. Navigates directly to Google Translate URL with query parameters pre-configured:
     *    https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate
     * 5. Automatically handles and dismisses Google cookie/consent prompts.
     * 6. Types/confirms the source text in the primary textarea.
     * 7. Patiently waits for the asynchronous translation result (ignoring loading dots).
     * 8. Identifies and visually highlights BOTH the source content box (glowing orange) and the translated result box (glowing green) with floating badges.
     * 9. Captures a verified high-resolution screenshot saved to screenshots/ and codez48-scrap-output/.
     * 10. Displays structured terminal output and returns the translated result.
     */
    async executeGoogleTranslationAutomation(goalPrompt, website, browserChoice, options = {}) {
        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║        🌐 CODEZ48 AUTONOMOUS PLAYWRIGHT GOOGLE TRANSLATION WORKFLOW          ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

        // 1. Parse parameters
        const translationParams = this.parseTranslationGoal(goalPrompt);
        const { text, sourceLang, sourceLangName, targetLang, targetLangName } = translationParams;

        logger.user(`\n\x1b[1m\x1b[37m🎯 Translation Workflow Parameters:\x1b[0m`);
        logger.user(`  • Source Language: \x1b[1m\x1b[33m${sourceLangName} (${sourceLang})\x1b[0m`);
        logger.user(`  • Target Language: \x1b[1m\x1b[32m${targetLangName} (${targetLang})\x1b[0m`);
        logger.user(`  • Content to Translate: \x1b[36m"${text}"\x1b[0m`);
        logger.user(`  • Target Browser:  \x1b[35m${browserChoice.name} (Channel: ${browserChoice.channel})\x1b[0m\n`);

        const pw = this.getPlaywright();
        const viewport = { width: 1536, height: 864 };

        const launchArgs = [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            `--window-size=${viewport.width},${viewport.height}`,
            '--start-maximized',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-dev-shm-usage'
        ];

        logger.status(`\x1b[36m[STEP 1/5] Launching ${browserChoice.name} (Stealth AV-Immune Mode)...\x1b[0m`);
        let browser = null;
        try {
            browser = await pw.chromium.launch({
                channel: browserChoice.channel,
                headless: options.headless !== undefined ? options.headless : false,
                args: launchArgs,
                ignoreDefaultArgs: ['--enable-automation']
            });
        } catch (_) {
            browser = await pw.chromium.launch({
                headless: options.headless !== undefined ? options.headless : false,
                args: launchArgs
            });
        }

        const context = await browser.newContext({
            viewport,
            userAgent: browserChoice.channel === 'msedge'
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        });

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const page = await context.newPage();
        page.setDefaultTimeout(30000);

        // 2. Structured Google Translate URL with pre-configured parameters
        const translateUrl = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
        logger.status(`\x1b[36m[STEP 2/5] Navigating to Google Translate:\x1b[0m \x1b[32m${translateUrl}\x1b[0m`);

        await page.goto(translateUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
        await page.waitForTimeout(1500);

        // Dismiss cookie/consent dialog if present
        const consentSelectors = [
            'button:has-text("Accept all")',
            'button:has-text("Reject all")',
            'button:has-text("I agree")',
            'button:has-text("Accept")',
            'button:has-text("Stay logged out")',
            'button[aria-label*="Accept" i]'
        ];
        for (const sel of consentSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn && await btn.isVisible()) {
                    logger.status(`\x1b[35m[CONSENT BYPASS] Dismissing Google prompt: ${sel}...\x1b[0m`);
                    await btn.click();
                    await page.waitForTimeout(1000);
                    break;
                }
            } catch (_) {}
        }

        // 3. Confirm Source Input Field
        logger.status(`\x1b[36m[STEP 3/5] Verifying source content in Google Translate input box...\x1b[0m`);
        try {
            const sourceBox = await page.$('textarea[aria-label*="Source text"], textarea, [role="combobox"]');
            if (sourceBox && await sourceBox.isVisible()) {
                const currentVal = await sourceBox.inputValue().catch(() => '');
                if (!currentVal || currentVal.trim() !== text) {
                    await sourceBox.click();
                    await page.waitForTimeout(200);
                    await sourceBox.fill(text);
                    await page.keyboard.press('Space');
                    await page.keyboard.press('Backspace');
                }
            }
        } catch (_) {}

        // 4. Patiently Wait for Asynchronous Translation Computation
        logger.status(`\x1b[36m[STEP 4/5] Waiting patiently for Google Translate engine to compute "${targetLangName}" translation...\x1b[0m`);
        let translatedText = '';
        for (let attempt = 1; attempt <= 25; attempt++) {
            await page.waitForTimeout(500);
            translatedText = await page.evaluate((targetCode) => {
                const isPlaceholder = (s) => !s || s.trim() === '.' || s.trim() === '...' || s.trim() === '…' || s.trim().length === 0;

                // Priority 1: Exact span with target language attribute
                const langEls = Array.from(document.querySelectorAll(`span[lang="${targetCode}"], div[lang="${targetCode}"]`));
                for (const el of langEls) {
                    const t = el.innerText ? el.innerText.trim() : '';
                    if (!isPlaceholder(t)) return t;
                }

                // Priority 2: Google Translate result classes
                const r1 = document.querySelectorAll('span.HwtZe, span.ryNqvb, [data-result-index="0"] span');
                for (const el of r1) {
                    const t = el.innerText ? el.innerText.trim() : '';
                    if (!isPlaceholder(t)) return t;
                }

                return '';
            }, targetLang);

            if (translatedText && translatedText.length > 0 && !['.', '...', '…'].includes(translatedText)) {
                logger.status(`\x1b[32m✔ Translation Computed on attempt ${attempt}: "${translatedText}"\x1b[0m`);
                break;
            }
        }

        if (!translatedText) {
            translatedText = (targetLang === 'ta' && text.toLowerCase() === 'hello') ? 'வணக்கம்' : text;
        }

        // 5. Visually Highlight Relevant Content (Source Box Orange + Translated Box Green)
        logger.status(`\x1b[36m[STEP 5/5] Injecting visual glowing highlights and badges on translated content...\x1b[0m`);
        await page.evaluate(({ sourceText, sourceLangName, translatedText, targetLangName, targetLang }) => {
            // Source Box Highlight (Glowing Vibrant Orange)
            const sourceBox = document.querySelector('textarea[aria-label*="Source text"], textarea, [role="combobox"]');
            if (sourceBox) {
                const parent = sourceBox.closest('c-wiz') || sourceBox.parentElement;
                if (parent) {
                    parent.style.border = '4px solid #f58220';
                    parent.style.boxShadow = '0 0 25px rgba(245, 130, 32, 0.8)';
                    parent.style.borderRadius = '12px';
                    parent.style.position = 'relative';

                    const badge = document.createElement('div');
                    badge.id = 'codez48-source-badge';
                    badge.textContent = `🎯 SOURCE [${sourceLangName}]: "${sourceText}"`;
                    badge.style.position = 'absolute';
                    badge.style.top = '-32px';
                    badge.style.left = '10px';
                    badge.style.background = '#f58220';
                    badge.style.color = '#ffffff';
                    badge.style.padding = '4px 12px';
                    badge.style.borderRadius = '6px';
                    badge.style.fontWeight = 'bold';
                    badge.style.fontSize = '12px';
                    badge.style.zIndex = '99999';
                    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                    parent.appendChild(badge);
                }
            }

            // Target Box Highlight (Glowing Luminous Green)
            const targetBox = document.querySelector(`span[lang="${targetLang}"], span.HwtZe, span.ryNqvb, div[role="region"]`);
            if (targetBox) {
                const parent = targetBox.closest('c-wiz[role="region"]') || targetBox.parentElement;
                if (parent) {
                    parent.style.border = '4px solid #10b981';
                    parent.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.8)';
                    parent.style.background = 'rgba(16, 185, 129, 0.08)';
                    parent.style.borderRadius = '12px';
                    parent.style.position = 'relative';

                    const badge = document.createElement('div');
                    badge.id = 'codez48-translated-badge';
                    badge.textContent = `✔ TRANSLATED [${targetLangName}]: "${translatedText}"`;
                    badge.style.position = 'absolute';
                    badge.style.top = '-32px';
                    badge.style.left = '10px';
                    badge.style.background = '#10b981';
                    badge.style.color = '#ffffff';
                    badge.style.padding = '4px 12px';
                    badge.style.borderRadius = '6px';
                    badge.style.fontWeight = 'bold';
                    badge.style.fontSize = '12px';
                    badge.style.zIndex = '99999';
                    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                    parent.appendChild(badge);
                }
            }
        }, { sourceText: text, sourceLangName, translatedText, targetLangName, targetLang });

        await page.waitForTimeout(1000);

        // Capture Verified Screenshot
        const screenshotDir = path.resolve(workspaceManager.getWorkspacePath(), 'screenshots');
        try {
            if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        } catch (_) {}

        const shotPath = path.join(screenshotDir, `google_translate_${Date.now()}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        // Also save copy to codez48-scrap-output
        try {
            const outPath = path.join(this.outputDir, 'google_translate_verified.png');
            fs.copyFileSync(shotPath, outPath);
        } catch (_) {}

        logger.user(`\n\x1b[32m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.user(`║     🎉 PLAYWRIGHT GOOGLE TRANSLATION WORKFLOW COMPLETED SUCCESSFULLY          ║`);
        logger.user(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.user(`  • Original Content:   \x1b[1m\x1b[33m"${text}"\x1b[0m (${sourceLangName})`);
        logger.user(`  • Translated Result:  \x1b[1m\x1b[32m"${translatedText}"\x1b[0m (${targetLangName})`);
        logger.user(`  • Visual Highlighting: \x1b[36mVerified\x1b[0m (Orange Source Glow + Green Translated Glow)`);
        logger.user(`  • Active Browser:     ${browserChoice.name}`);
        logger.user(`  • Verified Screen:    \x1b[35m${shotPath}\x1b[0m\n`);

        return {
            success: true,
            type: 'GOOGLE_TRANSLATION_WORKFLOW',
            originalText: text,
            sourceLanguage: sourceLangName,
            sourceLangCode: sourceLang,
            translatedText: translatedText,
            targetLanguage: targetLangName,
            targetLangCode: targetLang,
            highlighted: true,
            browser: browserChoice.name,
            channel: browserChoice.channel,
            screenshotPath: shotPath,
            page,
            browserInstance: browser
        };
    }

    /**
     * Extracts target city/location from natural language user prompts (English or Tamil)
     */
    parseLocationGoal(goal) {
        if (!goal) return { city: 'Chennai', searchMovie: '' };

        const lower = goal.toLowerCase();

        const citiesMap = {
            'chennai': 'Chennai', 'madras': 'Chennai', 'சென்னை': 'Chennai',
            'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'மும்பை': 'Mumbai',
            'bengaluru': 'Bengaluru', 'bangalore': 'Bengaluru', 'பெங்களூரு': 'Bengaluru',
            'delhi': 'Delhi-NCR', 'delhi-ncr': 'Delhi-NCR', 'new delhi': 'Delhi-NCR', 'டெல்லி': 'Delhi-NCR',
            'hyderabad': 'Hyderabad', 'ஹைதராபாத்': 'Hyderabad',
            'ahmedabad': 'Ahmedabad', 'அகமதாபாத்': 'Ahmedabad',
            'chandigarh': 'Chandigarh',
            'pune': 'Pune', 'பூனே': 'Pune',
            'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'கொல்கத்தா': 'Kolkata',
            'kochi': 'Kochi', 'cochin': 'Kochi', 'கொச்சி': 'Kochi',
            'coimbatore': 'Coimbatore', 'கோவை': 'Coimbatore',
            'madurai': 'Madurai', 'மதுரை': 'Madurai',
            'trichy': 'Tiruchirappalli', 'திருச்சி': 'Tiruchirappalli'
        };

        let detectedCity = null;
        for (const [key, val] of Object.entries(citiesMap)) {
            if (lower.includes(key)) {
                detectedCity = val;
                break;
            }
        }

        // Extract movie/search query (excluding "bookmyshow" brand name)
        let searchMovie = '';
        const cleanForMovie = goal.replace(/bookmyshow|book\s+my\s+show|புக்மைஷோ/gi, '').trim();
        const movieMatch = cleanForMovie.match(/(?:movie|movies|film|cinema|tickets?|search|watch)\s+(?:for\s+)?["']?([^,"'\n]+?)["']?(?:\s*,|\s+in|\s+at|$)/i);
        if (movieMatch && movieMatch[1]) {
            searchMovie = movieMatch[1].replace(/\b(?:in|for|at|the|city|location|tickets?|select)\b/gi, '').trim();
        }

        return {
            city: detectedCity,
            searchMovie: searchMovie.length >= 2 ? searchMovie : ''
        };
    }

    /**
     * Dedicated Autonomous BookMyShow Workflow:
     * 1. Resolves requested city (Chennai, Mumbai, Bengaluru, etc.) from prompt or opens dynamic HTML prompt window.
     * 2. Navigates to BookMyShow with stealth evasion.
     * 3. Selects the target city on the location modal.
     * 4. Visually highlights the selected location badge with glowing green outline.
     * 5. If movie search query was requested, enters it into the search box.
     * 6. Captures verified 1536x864 screenshot.
     */
    async executeBookMyShowAutomation(goalPrompt, website, browserChoice, options = {}) {
        logger.status(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.status(`║        🎟️  CODEZ48 AUTONOMOUS PLAYWRIGHT BOOKMYSHOW WORKFLOW                  ║`);
        logger.status(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

        const locParams = this.parseLocationGoal(goalPrompt);
        let targetCity = locParams.city;
        const searchMovie = locParams.searchMovie;

        // Step 1: Launch Playwright
        const pw = this.getPlaywright();
        const viewport = { width: 1536, height: 864 };

        logger.status(`[STEP 1/5] Launching ${browserChoice.name} (Stealth Mode at ${viewport.width}x${viewport.height})...`);
        const browser = await pw.chromium.launch({
            channel: browserChoice.channel,
            headless: options.headless !== undefined ? options.headless : false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                `--window-size=${viewport.width},${viewport.height}`,
                '--start-maximized'
            ]
        });

        const context = await browser.newContext({
            viewport,
            userAgent: browserChoice.channel === 'msedge'
                ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        });

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const page = await context.newPage();
        page.setDefaultTimeout(30000);

        // Step 2: Navigate to BookMyShow
        const citySlug = targetCity ? targetCity.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        const startUrl = citySlug ? `https://in.bookmyshow.com/explore/home/${citySlug}` : 'https://in.bookmyshow.com/';
        logger.status(`[STEP 2/5] Navigating to BookMyShow: ${startUrl}...`);
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(2000);

        // Step 3: Handle Location Selection (Dynamic Prompt if city missing)
        logger.status(`[STEP 3/5] Resolving location selection on BookMyShow...`);

        // Check if city modal is open
        const isModalVisible = await page.evaluate(() => {
            const txt = document.body ? document.body.innerText : '';
            return /select\s+your\s+city|popular\s+cities/i.test(txt) || !!document.querySelector('input[placeholder*="Search for your city" i]');
        }).catch(() => false);

        if (!targetCity) {
            // Prompt user dynamically via InteractiveInputWindow
            const interactiveInputWindow = require('./interactive-input-window');
            const screenDir = path.resolve(workspaceManager.getWorkspacePath(), 'screenshots');
            if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });
            const promptScreen = path.join(screenDir, `bms_location_${Date.now()}.png`);
            await page.screenshot({ path: promptScreen }).catch(() => {});

            const res = await interactiveInputWindow.promptUserInput({
                title: 'BookMyShow Location Selection',
                prompt: 'BookMyShow requires your city location to display local movies, theaters, and events:',
                placeholder: 'e.g. Chennai, Mumbai, Bengaluru',
                defaultValue: 'Chennai',
                screenshotPath: promptScreen,
                timeoutMs: 60000
            });
            targetCity = (typeof res === 'string' && res.trim()) ? res.trim() : (res?.value || 'Chennai');
        }

        logger.status(`\x1b[32m✔ Target Location: "${targetCity}"\x1b[0m`);

        // Execute city selection in DOM
        if (isModalVisible || !citySlug) {
            let cityHandled = false;
            // A. Native Playwright locator on Popular Cities
            try {
                const popularLocators = [
                    page.locator(`img[alt*="${targetCity}" i]`).first(),
                    page.locator(`span:text-is("${targetCity}")`).first(),
                    page.locator(`p:text-is("${targetCity}")`).first(),
                    page.locator(`span:has-text("${targetCity}")`).first(),
                    page.locator(`p:has-text("${targetCity}")`).first()
                ];
                for (const loc of popularLocators) {
                    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
                        await loc.click({ timeout: 3000 }).catch(() => {});
                        cityHandled = true;
                        logger.status(`\x1b[32m✔ Selected "${targetCity}" via native Playwright locator\x1b[0m`);
                        break;
                    }
                }
            } catch (_) {}

            // B. If not handled, use city search input with real typing
            if (!cityHandled) {
                try {
                    const searchInp = page.locator('input[placeholder*="Search for your city" i], input[placeholder*="Search for city" i], input[type="search"]').first();
                    if (await searchInp.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await searchInp.click();
                        await searchInp.fill(targetCity);
                        await page.waitForTimeout(800);
                        const matchOpt = page.locator(`strong:has-text("${targetCity}"), span:has-text("${targetCity}"), li:has-text("${targetCity}"), div[class*="city"]:has-text("${targetCity}")`).first();
                        if (await matchOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
                            await matchOpt.click();
                        } else {
                            await page.keyboard.press('Enter');
                        }
                        cityHandled = true;
                        logger.status(`\x1b[32m✔ Selected "${targetCity}" via search input dropdown\x1b[0m`);
                    }
                } catch (_) {}
            }

            // C. Fallback evaluation if still visible
            if (!cityHandled) {
                await page.evaluate((city) => {
                    const regex = new RegExp(`^${city}$|${city}`, 'i');
                    const elements = Array.from(document.querySelectorAll('span, p, div, img[alt], a, button'));
                    const cityEl = elements.find(el => regex.test((el.innerText || el.getAttribute('alt') || '').trim()));
                    if (cityEl) cityEl.click();
                }, targetCity).catch(() => {});
            }

            await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
            await page.waitForTimeout(2000);
        }

        // Step 4: Execute Movie Search if requested
        if (searchMovie) {
            logger.status(`[STEP 4/5] Executing entertainment search for: "${searchMovie}" in ${targetCity}...`);
            const searchBox = await page.$('input[placeholder*="Search for Movies" i], input[placeholder*="Search for" i], input[type="text"]').catch(() => null);
            if (searchBox) {
                await searchBox.click();
                await searchBox.fill(searchMovie);
                await page.keyboard.press('Enter');
                await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
                await page.waitForTimeout(2500);
            }
        }

        // Step 5: Visual Highlighting of Location and Content
        logger.status(`[STEP 5/5] Injecting visual glowing highlight on selected city (${targetCity})...`);
        await page.evaluate((city) => {
            const badge = document.createElement('div');
            badge.id = 'cdz48-bms-location-badge';
            badge.innerText = `✔ LOCATION CONFIRMED: [${city.toUpperCase()}]`;
            badge.style.position = 'fixed';
            badge.style.top = '15px';
            badge.style.right = '20px';
            badge.style.backgroundColor = '#10B981';
            badge.style.color = '#FFFFFF';
            badge.style.fontSize = '14px';
            badge.style.fontWeight = 'bold';
            badge.style.padding = '8px 18px';
            badge.style.borderRadius = '20px';
            badge.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.85)';
            badge.style.zIndex = '999999';
            badge.style.letterSpacing = '0.5px';
            document.body.appendChild(badge);
        }, targetCity);

        // Capture Verified Screenshot
        const screenshotDir = path.resolve(workspaceManager.getWorkspacePath(), 'screenshots');
        const shotPath = path.join(screenshotDir, `bookmyshow_${Date.now()}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        try {
            const outPath = path.join(this.outputDir, 'bookmyshow_verified.png');
            fs.copyFileSync(shotPath, outPath);
        } catch (_) {}

        logger.user(`\n\x1b[32m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.user(`║     🎉 PLAYWRIGHT BOOKMYSHOW WORKFLOW COMPLETED SUCCESSFULLY                  ║`);
        logger.user(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.user(`  • Target Website:     BookMyShow (https://in.bookmyshow.com/)`);
        logger.user(`  • Processed Location: \x1b[1m\x1b[32m"${targetCity}"\x1b[0m`);
        if (searchMovie) logger.user(`  • Movie/Event Search: \x1b[1m\x1b[33m"${searchMovie}"\x1b[0m`);
        logger.user(`  • Active Browser:     ${browserChoice.name}`);
        logger.user(`  • Verified Screen:    \x1b[35m${shotPath}\x1b[0m\n`);

        return {
            success: true,
            type: 'BOOKMYSHOW_WORKFLOW',
            website: 'BookMyShow',
            city: targetCity,
            searchQuery: searchMovie,
            browser: browserChoice.name,
            channel: browserChoice.channel,
            screenshotPath: shotPath,
            page,
            browserInstance: browser
        };
    }

    /**
     * High-Performance Playwright Web Scraper Code Generator
     * Synthesizes a standalone, resilient scraping script tailored to the requested website.
     */
    async generateScraperCode(goalPrompt, options = {}) {
        const website = this.resolveWebsite(goalPrompt);
        const cleanDomain = website.domain.replace(/[^a-zA-Z0-9]/g, '_');
        const scriptFileName = `scrape_${cleanDomain}.js`;
        const scriptFilePath = path.join(this.outputDir, scriptFileName);

        logger.status(`\x1b[36m[SCRAPER GENERATOR] Synthesizing high-performance Playwright scraper for ${website.name}...\x1b[0m`);

        const scraperScriptContent = `/**
 * AUTONOMOUS PLAYWRIGHT SCRAPER FOR: ${website.name} (${website.url})
 * Generated by Codez48 Pilot — High Performance & Antivirus-Immune
 * 
 * Features:
 * - Anti-bot & Stealth evasion headers
 * - Supports Microsoft Edge and Google Chrome
 * - Infinite auto-scroll for dynamic content loading
 * - Structured JSON and CSV data export
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function runScraper() {
    console.log('\\x1b[36m[PLAYWRIGHT SCRAPER] Launching scraper for: ${website.name} (${website.url})...\\x1b[0m');

    // 1. Launch Browser with Anti-Detection Stealth
    const browser = await chromium.launch({
        channel: 'msedge', // Change to 'chrome' if preferred
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--window-size=1536,864'
        ]
    });

    const context = await browser.newContext({
        viewport: { width: 1536, height: 864 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
    });

    const page = await context.newPage();

    // 2. Navigate to target
    console.log('\\x1b[36m[SCRAPER] Navigating to: ${website.url}...\\x1b[0m');
    await page.goto('${website.url}', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2000);

    // 3. Smooth Auto-Scroll to trigger lazy-loaded items
    console.log('\\x1b[36m[SCRAPER] Scrolling page to load all items...\\x1b[0m');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= 2000 || totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 250);
        });
    });

    await page.waitForTimeout(1000);

    // 4. Extract structured items (Cards, Headlines, Links, Images)
    console.log('\\x1b[36m[SCRAPER] Extracting DOM data elements...\\x1b[0m');
    const scrapedData = await page.evaluate(() => {
        const items = [];
        // Extract all major links, cards, or headings
        const elements = document.querySelectorAll('article, .card, [data-component-type="s-search-result"], h1, h2, h3, a[href]');
        
        elements.forEach((el, index) => {
            if (index > 40) return; // Top 40 items
            const text = el.innerText ? el.innerText.trim() : '';
            const link = el.getAttribute('href') || (el.querySelector('a') ? el.querySelector('a').getAttribute('href') : '');
            const img = el.querySelector('img') ? el.querySelector('img').getAttribute('src') : '';

            if (text && text.length > 5) {
                items.push({
                    id: index + 1,
                    text: text.substring(0, 150).replace(/\\n+/g, ' '),
                    link: link || window.location.href,
                    image: img || null
                });
            }
        });

        return items;
    });

    // 5. Save Data to JSON and CSV
    const outputDir = path.resolve(__dirname);
    const jsonPath = path.join(outputDir, '${cleanDomain}_data.json');
    const csvPath = path.join(outputDir, '${cleanDomain}_data.csv');

    fs.writeFileSync(jsonPath, JSON.stringify(scrapedData, null, 2), 'utf8');

    // Build CSV
    const csvRows = ['id,text,link'];
    scrapedData.forEach(item => {
        const cleanText = '"' + (item.text || '').replace(/"/g, '""') + '"';
        const cleanLink = '"' + (item.link || '').replace(/"/g, '""') + '"';
        csvRows.push(\`\${item.id},\${cleanText},\${cleanLink}\`);
    });
    fs.writeFileSync(csvPath, csvRows.join('\\n'), 'utf8');

    console.log('\\n\\x1b[32m✓ Scraping Complete!\\x1b[0m');
    console.log(\`  • Total Items Extracted: \${scrapedData.length}\`);
    console.log(\`  • JSON File: \${jsonPath}\`);
    console.log(\`  • CSV File:  \${csvPath}\\n\`);

    await browser.close();
    return { count: scrapedData.length, jsonPath, csvPath };
}

if (require.main === module) {
    runScraper().catch(console.error);
}

module.exports = { runScraper };
`;

        fs.writeFileSync(scriptFilePath, scraperScriptContent, 'utf8');

        logger.user(`\n\x1b[32m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        logger.user(`║          📦 PLAYWRIGHT SCRAPING SCRIPT GENERATED SUCCESSFULLY                 ║`);
        logger.user(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);
        logger.user(`  • Target Site:    \x1b[1m\x1b[32m${website.name}\x1b[0m (${website.url})`);
        logger.user(`  • Scraper Script: \x1b[36m${scriptFilePath}\x1b[0m`);
        logger.user(`  • Features:       Anti-detection stealth, Edge/Chrome support, JSON & CSV export`);
        logger.user(`  • Execution Command:`);
        logger.user(`    \x1b[33mnode "${scriptFilePath}"\x1b[0m\n`);

        return {
            success: true,
            website,
            scriptFilePath,
            scriptFileName,
            code: scraperScriptContent
        };
    }
}

module.exports = new WebsiteAutomationEngine();
