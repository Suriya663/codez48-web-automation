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
- finish (value: "completion summary message")

OUTPUT STRICT JSON ONLY:
{
  "action": "tab|shift-tab|click|fill|type|press|select|check|scroll|hover|wait|ask_user|extract|finish",
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
