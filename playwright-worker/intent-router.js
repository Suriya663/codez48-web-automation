class IntentRouter {
    validateUrl(urlString) {
        if (!urlString) return null;
        try {
            const parsed = new URL(urlString);
            if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)) {
                if (process.env.NODE_ENV !== 'test' && !process.env.ALLOW_LOCAL_TARGETS) {
                     console.warn(`[SECURITY WARN] Blocked local/private network target: ${parsed.hostname}`);
                     return null;
                }
            }
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return null;
            }
            return parsed.href;
        } catch (e) {
            return null;
        }
    }

    classifyIntent(goal) {
        const lowerGoal = goal.toLowerCase();

        let rawUrl = null;
        const urlMatch = goal.match(/(https?:\/\/[^\s]+)/i);
        if (urlMatch) {
            rawUrl = urlMatch[1].replace(/[,;.'"\]\)]+$/g, '');
        } else if (/\blablab\b/i.test(lowerGoal)) {
            rawUrl = 'https://lablab.ai/tech/text-generation-webui';
        } else if (/\bcodez48\b/i.test(lowerGoal)) {
            rawUrl = 'https://codez48.netlify.app/';
        }

        const url = this.validateUrl(rawUrl);
        const containsUrl = url !== null;

        let intent = 'UNKNOWN';

        // 1. Local File Edit / Local Web Intent
        if (/\b(file_edit|local_web)\b/i.test(lowerGoal) || (/\b(open|update|edit|modify|change)\b/i.test(lowerGoal) && (/[a-z]:\\[^\s]+/i.test(goal) || /\b(index\.html|style\.css|script\.js|app\.js|server\.js)\b/i.test(lowerGoal)))) {
            intent = lowerGoal.includes('local_web') ? 'local_web' : 'file_edit';
        }
        // 2. Website Creation Intent
        else if (/\b(website_creation|create\s+(?:a\s+)?(?:responsive\s+)?(?:business\s+)?website|build\s+(?:a\s+)?website|make\s+(?:a\s+)?website|generate\s+(?:a\s+)?website)\b/i.test(lowerGoal)) {
            intent = 'website_creation';
        }
        // 3. Scraping / Website Code Reconstruction Intent
        else if (/\b(scraping|scrape|reconstruct|recreate|clone\s+website|copy\s+site|fetch\s+site\s+code|get\s+site\s+code)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'scraping';
        }
        // 4. Website Analysis Intent
        else if (/\b(website_analysis|analyze|explain\s+layout|inspect\s+layout|explain\s+design|audit\s+site)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'website_analysis';
        }
        // 5. Automation Intent
        else if (/\b(automation|automate|run\s+automation|click|press|fill|submit|log\s+in)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'automation';
        }
        // 6. Simple Browser Navigation Intent
        else if (/\b(browser_navigation|open\s+this\s+url\s+in\s+(?:the\s+)?browser|go\s+to\s+url|visit\s+site|browse\s+url|open\s+https?:\/\/)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'browser_navigation';
        }
        // Native General Automation Intent Keywords
        else if (lowerGoal.includes('vs code') || lowerGoal.includes('vscode') || lowerGoal.includes('coding task')) {
            intent = 'website_creation';
        } else if (lowerGoal.includes('calculator') || lowerGoal.includes('calc')) {
            intent = 'GENERAL_AUTOMATION_CALC';
        } else if (lowerGoal.includes('powerpoint') || lowerGoal.includes('presentation')) {
            intent = 'GENERAL_AUTOMATION_PPTX';
        } else if (lowerGoal.includes('word document') || lowerGoal.includes('word doc')) {
            intent = 'GENERAL_AUTOMATION_DOCX';
        } else if (lowerGoal.includes('story') && lowerGoal.includes('gravity')) {
            intent = 'GENERAL_AUTOMATION_STORY';
        } else if (lowerGoal.includes('csv') && lowerGoal.includes('report')) {
            intent = 'GENERAL_AUTOMATION_CSV';
        } else if (lowerGoal.includes('metatrader') || lowerGoal.includes('mt5')) {
            intent = 'GENERAL_AUTOMATION_MT5';
        } else if (lowerGoal.includes('backtest') || lowerGoal.includes('strategy')) {
            intent = 'GENERAL_AUTOMATION_BACKTEST';
        } else if (lowerGoal.includes('folder') || lowerGoal.includes('directory') || lowerGoal.includes('file') || lowerGoal.includes('rename') || lowerGoal.includes('edit')) {
            intent = 'GENERAL_AUTOMATION_FS';
        } else if (lowerGoal.includes('notepad')) {
            intent = 'GENERAL_AUTOMATION_NOTEPAD';
        }

        if (intent === 'UNKNOWN' && containsUrl) {
            intent = 'UNKNOWN'; // Force user to clarify
        }

        return { intent, url, originalGoal: goal, lowerGoal };
    }
}
module.exports = new IntentRouter();
