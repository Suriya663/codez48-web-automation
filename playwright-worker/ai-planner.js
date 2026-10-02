const fetch = require('node-fetch');
const config = require('./config');

class AIPlanner {
    async callAI(promptMessages) {
        const rawGroqKeys = config.GROQ_API_KEY;
        const groqKeys = rawGroqKeys
            ? Array.from(new Set(rawGroqKeys.split(',').map(k => k.trim()).filter(Boolean)))
            : [];

        // Randomize Groq keys for automatic load balancing and key rotation
        const shuffledKeys = [...groqKeys].sort(() => 0.5 - Math.random());

        for (const apiKey of shuffledKeys) {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "openai/gpt-oss-120b",
                        messages: promptMessages,
                        temperature: 0.2,
                        max_tokens: 1500
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.choices[0].message.content;
                }
            } catch (e) {
                console.warn('[AI PLANNER] Groq API key rotation retry:', e.message);
            }
        }

        return null;
    }

    async planNextAction(run, pageState) {
        const goalLower = (run.goal || '').toLowerCase();
        const currentStep = run.currentStep || 1;

        // 1. POWERPOINT / PPT PRE-RESOLVER
        if ((goalLower.includes('powerpoint') || goalLower.includes('ppt') || goalLower.includes('presentation') || goalLower.includes('slide')) && currentStep === 1) {
            let title = run.goal.replace(/^(?:create|generate|make|build)?\s*(?:a|an)?\s*(?:powerpoint|ppt|presentation|slides?)\s*(?:deck|file)?\s*(?:on|about|for|titled|named)?\s*/i, '').trim() || 'Automated_Presentation';
            console.log(`[PRE-RESOLVER] Detected PowerPoint intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `powerpoint:${title}`,
                successCondition: 'PowerPoint presentation deck generated',
                statusText: `Generating PowerPoint presentation deck: "${title}"...`
            };
        }

        // 1b. WORD / DOCUMENT PRE-RESOLVER
        if ((goalLower.includes('word') || goalLower.includes('document') || goalLower.includes('report') || goalLower.includes('notes')) && currentStep === 1) {
            let title = run.goal.replace(/^(?:create|generate|make|build)?\s*(?:a|an)?\s*(?:word)?\s*(?:document|report|notes|file)?\s*(?:on|about|for|titled|named)?\s*/i, '').trim() || 'Business_Report';
            console.log(`[PRE-RESOLVER] Detected Word Document intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `word:${title}`,
                successCondition: 'Word document generated',
                statusText: `Generating Word document: "${title}"...`
            };
        }

        // 1c. EXCEL / SPREADSHEET PRE-RESOLVER
        if ((goalLower.includes('excel') || goalLower.includes('spreadsheet') || goalLower.includes('sheet') || goalLower.includes('expenses')) && currentStep === 1) {
            let title = run.goal.replace(/^(?:create|generate|make|build)?\s*(?:a|an)?\s*(?:excel|spreadsheet|sheet)?\s*(?:for|on|about|titled|named)?\s*/i, '').trim() || 'Monthly_Expenses';
            console.log(`[PRE-RESOLVER] Detected Spreadsheet intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `spreadsheet:${title}`,
                successCondition: 'Excel spreadsheet generated',
                statusText: `Generating spreadsheet: "${title}"...`
            };
        }

        // 1d. STATIC WEBSITE & HOSTING PRE-RESOLVER
        if ((goalLower.includes('website') || goalLower.includes('static site') || goalLower.includes('host') || goalLower.includes('create a site')) && currentStep === 1) {
            let siteName = 'StaticWebsite';
            const match = run.goal.match(/(?:website|site)\s+(?:named|titled|called)\s+([a-zA-Z0-9_-]+)/i);
            if (match) siteName = match[1];
            console.log(`[PRE-RESOLVER] Detected Static Website & Hosting intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `website:${siteName}`,
                successCondition: 'Static website created, opened in VS Code, new terminal window opened, and hosted successfully',
                statusText: `Creating static website "${siteName}", opening in VS Code, launching terminal window, and hosting locally...`
            };
        }

        // 2. CALCULATOR PRE-RESOLVER
        if ((goalLower.includes('calculator') || goalLower.includes('calc') || goalLower.includes('calculate') || goalLower.includes('math')) && currentStep === 1) {
            const mathMatch = run.goal.match(/(?:calculate|calc|math|calculator)\s*:?\s*([0-9+\-*/().\s]+)/i);
            const expr = mathMatch?.[1]?.trim() || run.goal.replace(/[^0-9+\-*/().\s]/g, '') || '2+2';
            console.log(`[PRE-RESOLVER] Detected Calculator intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `calculator:${expr}`,
                successCondition: 'Calculator opened and result evaluated',
                statusText: `Opening calculator and evaluating expression: ${expr}...`
            };
        }

        // 3. VS CODE / PROGRAM CREATION PRE-RESOLVER
        if ((goalLower.includes('program') || goalLower.includes('code') || goalLower.includes('vscode') || goalLower.includes('write a program') || goalLower.includes('create project')) && currentStep === 1) {
            let projName = 'AutomatedProgram';
            const match = run.goal.match(/(?:project|program|app)\s+(?:named|titled|called)\s+([a-zA-Z0-9_-]+)/i);
            if (match) projName = match[1];
            console.log(`[PRE-RESOLVER] Detected VS Code Program Creation intent for goal: "${run.goal}"`);
            return {
                action: 'native_app',
                target: null,
                value: `vscode:${projName}`,
                successCondition: 'Minimized open apps, created project in Documents, opened VS Code, and executed in terminal',
                statusText: `Minimizing open windows, creating project "${projName}" in Documents, opening VS Code, and running in terminal...`
            };
        }

        // 4. SEARCH & LINK EXTRACTION PRE-RESOLVER
        if ((goalLower.includes('search') || goalLower.includes('amazon') || goalLower.includes('find on') || goalLower.includes('locate link')) && currentStep === 1) {
            let query = run.goal.replace(/^(?:go to|visit|open)?\s*(?:amazon|google|ebay)?\s*(?:and)?\s*(?:search|find|locate)\s*(?:for|on)?\s*/i, '').replace(/\s*(?:and|to)?\s*(?:extract|get|find|retrieve)\s*(?:the)?\s*(?:link|url|details).*/i, '').trim() || run.goal;
            console.log(`[PRE-RESOLVER] Detected Search & Link Extraction intent for goal: "${run.goal}"`);
            return {
                action: 'search_and_extract',
                target: null,
                value: query,
                successCondition: 'Navigated to search site and extracted product links directly from DOM',
                statusText: `Searching and extracting direct product links for: "${query}"...`
            };
        }

        // 5. INPUT FIELD VERIFICATION PRE-RESOLVER
        if ((goalLower.includes('input box') || goalLower.includes('verify field') || goalLower.includes('check input')) && currentStep === 1) {
            console.log(`[PRE-RESOLVER] Detected Input Field Verification intent for goal: "${run.goal}"`);
            return {
                action: 'verify_inputs',
                target: null,
                value: 'request verification',
                successCondition: 'Captured annotated screenshot of input boxes and sent verification request via Firebase',
                statusText: 'Capturing annotated screenshot of input fields for user verification...'
            };
        }

        // 6. POPUP CREDENTIAL COLLECTION PRE-RESOLVER
        if ((goalLower.includes('personal details') || goalLower.includes('credentials') || goalLower.includes('login details') || goalLower.includes('popup input')) && currentStep === 1) {
            console.log(`[PRE-RESOLVER] Detected Popup Credential Collection intent for goal: "${run.goal}"`);
            return {
                action: 'popup_input',
                target: null,
                value: 'Enter requested personal/login details:',
                successCondition: 'Opened 200px popup window connected to Firebase',
                statusText: 'Opening dedicated 200px height input popup window...'
            };
        }

        const systemPrompt = `You are the Stateful Codez48 Playwright AI Action Planner.
Given the ORIGINAL USER REQUIREMENT: "${run.goal}" and live inspected page state at "${pageState.url}", choose the SINGLE NEXT Playwright action.

NAVIGATION GUIDELINES:
- Keyboard Tab navigation ("tab" / "shift-tab") is a FIRST-CLASS navigation method. Use "tab" when traversing headers, navigation bars, search inputs, login controls, or form controls sequentially.
- When an element receives keyboard focus ("activeElement"), check if it matches the target. If it matches, use "press" with value "Enter" or "Space" to activate.
- Otherwise use "click", "fill", "type", "scroll", "hover", "wait", "finish".

ACTIONS:
- navigate (value: "URL")
- tab (value: "next focus step")
- shift-tab (value: "previous focus step")
- click (target: { role, name, id, selector })
- fill (target: { label, placeholder, id, name, selector }, value: "text")
- type (target: { selector, id }, value: "text")
- press (value: "Enter"|"Tab"|"Space"|"Escape")
- select (target: { selector, id }, value: "optionValue")
- check (target: { label, id, selector })
- scroll (value: "down"|"up")
- hover (target: { selector, text })
- wait (value: milliseconds e.g. 2000)
- ask_user (value: "reason e.g. OTP or CAPTCHA required")
- extract (target: { selector, name }, value: "fieldLabel")
- native_app (value: "minimize"|"calculator:EXPR"|"powerpoint:TITLE"|"vscode:PROJECT_NAME")
- search_and_extract (value: "search query")
- verify_inputs (value: "request input field screenshot verification")
- popup_input (value: "prompt label")
- finish (value: "completion summary message")

OUTPUT STRICT JSON ONLY:
{
  "action": "tab|shift-tab|click|fill|type|press|select|check|scroll|hover|wait|ask_user|extract|native_app|search_and_extract|verify_inputs|popup_input|finish",
  "target": { "role": "button", "name": "Name", "label": "Label", "placeholder": "P", "id": "id", "selector": "sel" },
  "value": "text or parameter value",
  "successCondition": "Expected DOM or URL state change",
  "statusText": "Short user-safe status message"
}`;

        const userContext = JSON.stringify({
            originalUserRequirement: run.goal,
            currentUrl: pageState.url,
            pageTitle: pageState.title,
            viewport: pageState.viewport,
            scroll: pageState.scroll,
            activeElement: pageState.activeElement,
            headerNavElements: pageState.headerNavElements,
            headings: pageState.headings,
            buttons: pageState.buttons,
            inputs: pageState.inputs,
            links: pageState.links,
            layoutSections: pageState.layoutSections,
            previousAction: run.lastAction,
            previousResult: run.lastResult,
            collectedData: run.collectedData
        });

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContext }
        ];

        const rawReply = await this.callAI(messages);
        if (!rawReply) {
            console.warn('[AI PLANNER] AI provider unavailable, returning safe scroll discovery step.');
            return {
                action: 'scroll',
                target: null,
                value: 'down',
                successCondition: 'New elements visible',
                statusText: 'AI provider standby. Scrolling page to inspect additional elements...'
            };
        }

        try {
            let clean = rawReply.trim();
            if (clean.includes('```')) {
                const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) clean = match[1];
            }
            const first = clean.indexOf('{');
            const last = clean.lastIndexOf('}');
            if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);

            const planned = JSON.parse(clean);
            if (!planned.action) throw new Error('Missing action property');

            console.log(`[AI PLANNER] Groq AI planned action [${planned.action}] for run: ${run.runId}`);
            return planned;
        } catch (err) {
            console.error('[AI PLANNER JSON PARSE ERROR]:', err.message, 'Raw reply:', rawReply);
            return {
                action: 'scroll',
                target: null,
                value: 'down',
                successCondition: 'New content visible',
                statusText: 'Scrolling page to discover interactive elements...'
            };
        }
    }
}

module.exports = new AIPlanner();
