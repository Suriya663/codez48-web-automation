class IntentRouter {
    validateUrl(urlString) {
        if (!urlString) return null;
        try {
            const parsed = new URL(urlString);
            if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)) {
                // To prevent SSRF/unauthorized access unless specifically overriding for testing
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

        if (/\b(scrape|extract\s+data|get\s+data|fetch\s+data|pull\s+data)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'WEB_SCRAPE';
        } else if (/\b(reconstruct|recreate|clone\s+website|local\s+project|copy\s+site)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'WEBSITE_CODE_RECONSTRUCTION';
        } else if (/\b(analyze|explain|inspect)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'WEBSITE_ANALYSIS';
        } else if (/\b(automate|fill|submit|log\s+in)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'WEB_AUTOMATION';
        } else if (/\b(test|verify\s+form|check)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'WEBSITE_TESTING';
        } else if (/\b(open|navigate|go\s+to|visit|browse|show\s+me)\b/i.test(lowerGoal) && containsUrl) {
            intent = 'BROWSE_WEBSITE';
        } else if (lowerGoal.includes('vs code') || lowerGoal.includes('vscode') || lowerGoal.includes('coding task')) {
            intent = 'GENERATE_OR_MODIFY_LOCAL_PROJECT';
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
            if (/\b(code|fetch|get|build|site|copy|source)\b/i.test(lowerGoal)) {
                 intent = 'WEBSITE_CODE_RECONSTRUCTION';
            } else {
                 const goalTextNoUrl = goal.replace(/(https?:\/\/[^\s]+)/i, '').trim();
                 if (goalTextNoUrl.length < 5) {
                     intent = 'BROWSE_WEBSITE';
                 }
            }
        }

        return { intent, url, originalGoal: goal, lowerGoal };
    }
}
module.exports = new IntentRouter();
