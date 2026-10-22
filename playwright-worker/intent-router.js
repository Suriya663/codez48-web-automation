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

        let isUrlOnly = false;
        if (containsUrl && rawUrl && rawUrl.trim() === goal.trim()) {
            isUrlOnly = true;
        }

        const detectedKeywords = [];

        // Predefined Keyword Detection Categories with Strict Word Boundaries
        if (/\b(create program|write code|implement|fix bug|modify file|node\.js|javascript|python|java|c\+\+|api|backend|frontend|fullstack|ezhudhu|code)\b/i.test(lowerGoal)) {
            detectedKeywords.push('PROGRAMMING_AND_CODE_GENERATION');
        }

        if (/\b(create website|build website|landing page|portfolio|business website|html|css|static website)\b/i.test(lowerGoal) && !/\b(deploy|publish)\b/i.test(lowerGoal)) {
            detectedKeywords.push('STATIC_WEBSITE_CREATION');
        }

        if (/\b(publish website|deploy website|host website|make website live|upload website|deploy to netlify)\b/i.test(lowerGoal)) {
            detectedKeywords.push('WEBSITE_PUBLISHING');
        }

        if (/\b(get website source code|download website|inspect website|scrape website|extract website content|download js|download css)\b/i.test(lowerGoal)) {
            detectedKeywords.push('WEBSITE_SOURCE_CODE_RETRIEVAL');
        }

        if (/\b(automate website|browser automation|click button|fill form|sign in|test website|automate workflow|extract data from website)\b/i.test(lowerGoal)) {
            detectedKeywords.push('WEBSITE_AUTOMATION');
        }

        if (/\b(create ppt|create powerpoint|presentation|slides|slide deck)\b/i.test(lowerGoal)) {
            detectedKeywords.push('PPT_CREATION');
        }

        if (/\b(create text file|write notes|create document|generate report|save content|create pdf|create word document)\b/i.test(lowerGoal)) {
            detectedKeywords.push('DOCUMENT_CREATION');
        }

        if (/\b(run command|install package|execute program|automate task|open terminal|run npm|build project|test project)\b/i.test(lowerGoal)) {
            detectedKeywords.push('GENERAL_CLI_AUTOMATION');
        }

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
        // Native General Automation Intent Keywords
        else if (/\b(vs code|vscode|coding task)\b/i.test(lowerGoal)) {
            intent = 'website_creation';
        } else if (/\b(calculator|calc)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_CALC';
        } else if (/\b(powerpoint|presentation|ppt)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_PPTX';
        } else if (/\b(word document|word doc)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_DOCX';
        } else if (/\bstory\b/i.test(lowerGoal) && /\bgravity\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_STORY';
        } else if (/\bcsv\b/i.test(lowerGoal) && /\breport\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_CSV';
        } else if (/\b(metatrader|mt5)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_MT5';
        } else if (/\b(backtest|strategy)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_BACKTEST';
        } else if (/\b(folder|directory|file|rename|edit)\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_FS';
        } else if (/\bnotepad\b/i.test(lowerGoal)) {
            intent = 'GENERAL_AUTOMATION_NOTEPAD';
        }

        return { intent, url, originalGoal: goal, lowerGoal, detectedKeywords, isUrlOnly };
    }
}
module.exports = new IntentRouter();
