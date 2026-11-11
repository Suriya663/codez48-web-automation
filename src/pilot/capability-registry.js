/**
 * CODEZ48 CAPABILITY REGISTRY & INTENT UNDERSTANDING ENGINE
 * Maps high-level goals and intents to application capability drivers,
 * extracting requirements such as target slide/page counts, topic subjects, language, and detail level.
 */

const appDiscovery = require('./app-discovery');

class CapabilityRegistry {
    extractTargetCount(goal) {
        if (!goal) return null;
        const match = goal.match(/(\d+)\s*[-_]?\s*(?:slide|page|section|row)/i);
        return match ? parseInt(match[1], 10) : null;
    }

    extractTopic(goal) {
        if (!goal) return 'General';
        const cleaned = goal.replace(/.*(?:about|on|regarding|for)\s+/i, '')
                            .replace(/(?:in|using|with)\s+(?:powerpoint|word|excel|notepad|vs code|vscode|python|html|css|javascript|browser).*/i, '')
                            .replace(/["']/g, '').trim();
        return cleaned || 'General Topic';
    }

    extractLanguage(goal) {
        if (!goal) return 'English';
        const lower = goal.toLowerCase();
        if (lower.includes('tamil')) return 'Tamil';
        if (lower.includes('hindi')) return 'Hindi';
        if (lower.includes('spanish')) return 'Spanish';
        if (lower.includes('french')) return 'French';
        if (lower.includes('german')) return 'German';
        return 'English';
    }

    extractDetailLevel(goal) {
        if (!goal) return 'standard';
        const lower = goal.toLowerCase();
        if (lower.includes('detailed') || lower.includes('in-depth') || lower.includes('comprehensive')) return 'detailed';
        if (lower.includes('short') || lower.includes('brief') || lower.includes('quick')) return 'brief';
        return 'standard';
    }

    resolveCapability(goal) {
        if (!goal) return { type: 'UNKNOWN', mode: 'CONTENT' };
        const lower = goal.toLowerCase().trim();

        const requirements = {
            targetCount: this.extractTargetCount(goal),
            topic: this.extractTopic(goal),
            language: this.extractLanguage(goal),
            detailLevel: this.extractDetailLevel(goal)
        };

        // 1. Saved Workflow Execution Intent ("start", "start-test", "run workflow")
        if (lower === 'start' || lower === 'start-test' || lower.startsWith('workflow')) {
            const wfName = lower === 'start-test' ? 'start-test' : (lower.split(/\s+/)[1] || 'start');
            return { type: 'WORKFLOW_EXECUTE', mode: 'AGENT', workflowName: wfName, requirements };
        }

        // 1.5 Website Code Extraction / Reconstruction Intent
        const hasUrl = /(https?:\/\/[^\s]+)/i.test(goal) || /\b[a-zA-Z0-9\-]+\.(?:com|org|net|io|dev|app|ai|tv|co|in|uk)\b/i.test(lower);
        const hasSourceCodeKeyword = /\b(website code|source code|website source|html code|css code|javascript code|js code|web page code|website files|website files download|website reconstruction|recreate this website|clone this website|scrape this website|extract website code|download website source|get html css javascript|i need a website|i need website code|give me the code for this website|get the code from this url|build a local copy of this website|scrap|scrape|clone|recreate|extract|reconstruct|source)\b/i.test(lower);

        if (hasUrl && hasSourceCodeKeyword) {
            return { type: 'WEBSITE_CODE_EXTRACTION', mode: 'AGENT', requirements };
        }

        // File Edit Intent
        if (lower.includes('edit file') || lower.includes('modify file') || lower.includes('change text') || lower.includes('replace text') || lower.includes('update file')) {
            return { type: 'FILE_EDIT', mode: 'CONTENT', requirements };
        }

        // Node.js Project Intent
        if (lower.includes('node project') || lower.includes('npm start') || lower.includes('run node') || lower.includes('build node')) {
            return { type: 'NODE_PROJECT', mode: 'AGENT', requirements };
        }

        // Deployment Intent
        if (lower.includes('deploy') || lower.includes('host') || lower.includes('publish')) {
            return { type: 'DEPLOY_PROJECT', mode: 'AGENT', requirements };
        }

        // Intelligent JavaScript Implementation Intent
        if (lower.includes('javascript') || lower.includes('js feature') || lower.includes('add interactivity') || lower.includes('implement feature') || lower.includes('add script') || (lower.includes('make') && lower.includes('work'))) {
            return { type: 'INTELLIGENT_JS_IMPLEMENTATION', mode: 'CONTENT', requirements };
        }

        // Priority 1: Calculator Math Intent (Immediate recognition before web or generic open)
        if (!lower.includes('presentation') && !lower.includes('powerpoint') && !lower.includes('slide') && !lower.includes('document')) {
            if (lower.includes('calculator') || lower.includes('calc') || (/\b(calculate|calculation|multiplication|multiply|division|divide|addition|add|subtraction|subtract)\b/i.test(lower) && /\d+/.test(lower))) {
                return { type: 'CALCULATOR_MATH', mode: 'AGENT', app: appDiscovery.findApp('calculator'), requirements };
            }
        }

        // Priority 2: Direct Application Launch Intent (open <app> on laptop)
        const appLaunchMatch = lower.match(/^(?:open|launch|start|run|bring up)\s+(?:the\s+)?(?:app(?:lication)?\s+)?([a-zA-Z0-9_\-\.\s]+)$/i);
        if (appLaunchMatch && !lower.includes('http') && !lower.includes('www.') && !lower.includes('.com') && !lower.includes('.org') && !lower.includes('.net') && !lower.includes('.app') && !lower.includes('website') && !lower.includes('browser')) {
            const requestedApp = appLaunchMatch[1].trim();
            const found = appDiscovery.findApp(requestedApp);
            if (found.found || found.target) {
                return { type: 'LAUNCH_APP', mode: 'AGENT', app: found, requirements };
            }
        }

        // Priority 3: Screen Vision & Physical Cursor Control Intent
        if (/\b(move\s+cursor|move\s+mouse|click\s+on\s+screen|observe\s+screen|look\s+at\s+screen|screen\s+vision|find\s+on\s+screen|cursor\s+to|click\s+(?:the\s+)?(?:button|icon|text|element))\b/i.test(lower)) {
            return { type: 'SCREEN_VISION', mode: 'AGENT', requirements };
        }

        // 4. Web Automation, Navigation, Auto-Scroll, Website Names, AI Studio, & Domain Sites
        const isWebIntent = lower.includes('http://') || lower.includes('https://') || lower.includes('www.') ||
            lower.includes('scroll') || lower.includes('codez48') || lower.includes('navigation') ||
            lower.includes('google') || lower.includes('youtube') || lower.includes('github') ||
            lower.includes('amazon') || lower.includes('wikipedia') || lower.includes('twitter') ||
            lower.includes('facebook') || lower.includes('instagram') || lower.includes('linkedin') ||
            lower.includes('reddit') || lower.includes('chatgpt') || lower.includes('openai') ||
            lower.includes('netflix') || lower.includes('flipkart') || lower.includes('website') ||
            lower.includes('browser') || lower.includes('open website') || lower.includes('open browser') ||
            lower.includes('go to ') ||
            /\b[a-zA-Z0-9\-]+\.(?:com|org|net|io|dev|app|ai|tv|co|in|uk)\b/i.test(lower);

        if (isWebIntent) {
            return { type: 'WEB_AUTOMATION', mode: 'AGENT', app: appDiscovery.findApp('chrome'), requirements };
        }

        // 2. 3D Model Creation Intent ("3d", "blender", "low-poly", "3d model", "3d scene")
        if (lower.includes('3d') || lower.includes('blender') || lower.includes('mesh') || lower.includes('low-poly') || lower.includes('low poly')) {
            return { type: 'CREATE_3D_MODEL', mode: 'CONTENT', app: appDiscovery.findApp('blender'), requirements };
        }

        // 3. WordPress Draft & Site Article Intent ("wordpress", "wp draft", "blog post", "blog article")
        if (lower.includes('wordpress') || lower.includes('wp draft') || lower.includes('blog post') || lower.includes('blog article') || lower.includes('site article')) {
            return { type: 'WORDPRESS_DRAFT', mode: 'DUAL', requirements };
        }

        // 4. VS Code Project & Live Coding Intent ("vs code", "vscode", "python script", "write code")
        if (lower.includes('vs code') || lower.includes('vscode') || lower.includes('visual studio code') || (lower.includes('write') && (lower.includes('code') || lower.includes('script') || lower.includes('app')))) {
            return { type: 'VSCODE_PROJECT', mode: 'CONTENT', app: appDiscovery.findApp('vscode'), requirements };
        }

        // 5. PowerPoint Presentation Intent
        if (lower.includes('presentation') || lower.includes('powerpoint') || lower.includes('slide') || lower.includes('pptx') || /\bppt\b/i.test(lower)) {
            return { type: 'CREATE_PRESENTATION', mode: 'CONTENT', app: appDiscovery.findApp('powerpoint'), requirements };
        }

        // File Edit Intent
        if (lower.includes('edit file') || lower.includes('modify file') || lower.includes('change text') || lower.includes('replace text') || lower.includes('update file')) {
            return { type: 'FILE_EDIT', mode: 'CONTENT', requirements };
        }

        // Node.js Project Intent
        if (lower.includes('node project') || lower.includes('npm start') || lower.includes('run node') || lower.includes('build node')) {
            return { type: 'NODE_PROJECT', mode: 'AGENT', requirements };
        }

        // Deployment Intent
        if (lower.includes('deploy') || lower.includes('host') || lower.includes('publish')) {
            return { type: 'DEPLOY_PROJECT', mode: 'AGENT', requirements };
        }

        // Intelligent JavaScript Implementation Intent
        if (lower.includes('javascript') || lower.includes('js feature') || lower.includes('add interactivity') || lower.includes('implement feature') || lower.includes('add script') || (lower.includes('make') && lower.includes('work'))) {
            return { type: 'INTELLIGENT_JS_IMPLEMENTATION', mode: 'CONTENT', requirements };
        }

        // 6. Word Document Intent
        if (lower.includes('document') || lower.includes('word') || lower.includes('docx') || lower.includes('report') || lower.includes('birthday')) {
            return { type: 'CREATE_DOCUMENT', mode: 'CONTENT', app: appDiscovery.findApp('word'), requirements };
        }

        // 7. Excel Spreadsheet Intent
        if (lower.includes('spreadsheet') || lower.includes('excel') || lower.includes('xlsx') || lower.includes('csv')) {
            return { type: 'CREATE_SPREADSHEET', mode: 'CONTENT', app: appDiscovery.findApp('excel'), requirements };
        }

        // 8. Pure AI Knowledge Intent (No Local App Requested)
        if ((lower.startsWith('explain') || lower.startsWith('what is') || lower.startsWith('list') || lower.startsWith('tell me') || lower.startsWith('how does')) && !lower.includes('notepad') && !lower.includes('vs code') && !lower.includes('word') && !lower.includes('powerpoint')) {
            return { type: 'PURE_AI_KNOWLEDGE', mode: 'CONTENT', requirements };
        }

        // 9. Calculator Math Intent
        if (!lower.includes('presentation') && !lower.includes('powerpoint') && !lower.includes('slide') && !lower.includes('document')) {
            if (lower.includes('calculator') || lower.includes('calculate') || (lower.match(/\d+/) && (lower.includes('add') || lower.includes('multiply') || lower.includes('subtract') || lower.includes('divide')))) {
                return { type: 'CALCULATOR_MATH', mode: 'AGENT', app: appDiscovery.findApp('calculator'), requirements };
            }
        }

        // 10. Software / Game Installation Intent
        if (lower.includes('install') || lower.includes('download')) {
            const targetName = lower.replace(/.*(?:install|download)\s+/i, '').split(/\s+/)[0];
            return { type: 'INSTALL_APP', mode: 'AGENT', appName: targetName, requirements };
        }

        // 11. Deployment Intent
        if (lower.includes('deploy') || lower.includes('publish')) {
            return { type: 'DEPLOY_NETLIFY', mode: 'AGENT', requirements };
        }

        // 12. Notepad / Text Save Intent
        if (lower.includes('notepad') || (lower.includes('write') && lower.includes('save'))) {
            return { type: 'NOTEPAD_SAVE', mode: 'CONTENT', app: appDiscovery.findApp('notepad'), requirements };
        }

        // 13. Launch App / Web Fallback Intent
        if (lower.includes('open') || lower.includes('launch') || lower.includes('start')) {
            const words = lower.split(/\s+/);
            for (const word of words) {
                const found = appDiscovery.findApp(word);
                if (found.found || found.webFallbackUrl) {
                    return { type: 'LAUNCH_APP', mode: 'AGENT', app: found, requirements };
                }
            }
        }

        return { type: 'GENERAL_DESKTOP_TASK', mode: 'AGENT', requirements };
    }
}

module.exports = new CapabilityRegistry();
