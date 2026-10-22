const aiPlanner = require('./ai-planner');

function safeJsonParse(str) {
    if (!str || typeof str !== 'string') return null;

    // Pass 1: Direct native JSON parse (preserves 100% of exact string escapes)
    try {
        return JSON.parse(str);
    } catch (e) {
        // Pass 2: Character-by-character JSON scanner to fix unescaped control codes inside string literals
        try {
            let inString = false;
            let escaped = false;
            let result = '';

            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                const code = str.charCodeAt(i);

                if (inString) {
                    if (escaped) {
                        result += char;
                        escaped = false;
                    } else if (char === '\\') {
                        result += char;
                        escaped = true;
                    } else if (char === '"') {
                        result += char;
                        inString = false;
                    } else if (code < 32) {
                        if (char === '\n') result += '\\n';
                        else if (char === '\r') result += '\\r';
                        else if (char === '\t') result += '\\t';
                        else result += '\\u' + code.toString(16).padStart(4, '0');
                    } else {
                        result += char;
                    }
                } else {
                    if (char === '"') {
                        inString = true;
                    }
                    result += char;
                }
            }

            return JSON.parse(result);
        } catch (e2) {
            return null;
        }
    }
}

class CliAiAnalyzer {
    async analyzeRequest(goal, context = {}) {
        process.stdout.write('AI Thinking...\n');

        const systemPrompt = `You are the Codez48 CLI Pilot AI Assistant, an expert developer and automation agent.
Analyze the user's request: "${goal}"

Context:
${JSON.stringify(context, null, 2)}

Determine the user's intent. Map it to one of these 12 valid intent categories:
1. GENERAL_CHAT: Greetings, normal conversations, questions, and explanations. Provide answer in 'answer'.
2. CODE_GENERATION: Writing, explaining, debugging, or improving code.
3. PROJECT_GENERATION: Creating websites, applications, and complete projects from scratch.
4. FILE_OPERATIONS: Reading, creating, editing, or organizing local files.
5. BROWSER_AUTOMATION: Opening websites, navigating pages, clicking buttons, and interacting with web apps.
6. WEBSITE_SCRAPING: Extracting relevant information or source code from websites.
7. WEBSITE_SOURCE_ANALYSIS: Inspecting accessible HTML, CSS, JavaScript, and public frontend resources.
8. DOCUMENT_GENERATION: Creating Word documents, PDFs, PowerPoint presentations, etc.
9. DATA_PROCESSING: Reading, converting, editing, or analyzing CSV, JSON, and spreadsheet data.
10. WORDPRESS_TASK: Generating WordPress code or performing WP operations.
11. GENERAL_AUTOMATION: Automating general user-requested tasks on the computer.
12. UNKNOWN_OR_AMBIGUOUS: Requests that cannot be classified reliably.

Accept requests written in English, Tamil, Tanglish, or other supported languages natively.

Output STRICT JSON ONLY. Do not wrap in markdown unless it's a code block containing the JSON.
{
  "intent": "GENERAL_CHAT" | "CODE_GENERATION" | "PROJECT_GENERATION" | "FILE_OPERATIONS" | "BROWSER_AUTOMATION" | "WEBSITE_SCRAPING" | "WEBSITE_SOURCE_ANALYSIS" | "DOCUMENT_GENERATION" | "DATA_PROCESSING" | "WORDPRESS_TASK" | "GENERAL_AUTOMATION" | "UNKNOWN_OR_AMBIGUOUS",
  "sub_intent": "string | null",
  "keywords": ["string"],
  "user_goal": "string",
  "target": "string | null",
  "output_format": "string | null",
  "workflow": "string",
  "required_parameters": {},
  "confidence": 0.95,
  "needs_clarification": false,
  "requires_confirmation": false,
  "reason": "string",
  "projectType": "static_website" | "nodejs_backend" | "fullstack" | "python" | "frontend_app" | "other" | null,
  "description": "Short description of what the user requested",
  "targetUrl": "url if provided",
  "targetFolder": "folder name or path if modifying existing project",
  "files": [
    {
      "path": "relative/path",
      "content": "Full source code here"
    }
  ],
  "dependencies": ["express"],
  "startCommand": "node server.js",
  "previewUrl": "http://localhost:3000",
  "fixCommands": [],
  "answer": "conversational response if general chat"
}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User Request: "${goal}"` }
        ];

        let rawReply = await aiPlanner.callAI(messages);

        if (!rawReply) {
             throw new Error('AI Provider unavailable or returned empty response.');
        }

        let parsed = this.parseJsonResponse(rawReply);

        if (!parsed) {
            process.stdout.write('[AI ANALYZER] Initial parse failed. Requesting strict JSON re-format...\n');
            const repairMessages = [
                ...messages,
                { role: 'assistant', content: rawReply },
                { role: 'user', content: 'Your previous response was not valid JSON. Please provide ONLY valid raw JSON matching the required schema.' }
            ];
            const repairReply = await aiPlanner.callAI(repairMessages);
            if (repairReply) {
                parsed = this.parseJsonResponse(repairReply);
            }
        }

        if (parsed && parsed.intent) {
            const supportedIntents = [
                'GENERAL_CHAT', 'CODE_GENERATION', 'PROJECT_GENERATION', 'FILE_OPERATIONS',
                'BROWSER_AUTOMATION', 'WEBSITE_SCRAPING', 'WEBSITE_SOURCE_ANALYSIS',
                'DOCUMENT_GENERATION', 'DATA_PROCESSING', 'WORDPRESS_TASK',
                'GENERAL_AUTOMATION', 'UNKNOWN_OR_AMBIGUOUS',
                'GENERATE_PROJECT', 'CHAT', 'MODIFY_LOCAL_PROJECT', 'SCRAPE_WEBSITE', 'FIX_ERROR', 'UNKNOWN'
            ];
            if (!supportedIntents.includes(parsed.intent)) {
                parsed.intent = 'UNKNOWN_OR_AMBIGUOUS';
            }
            if (parsed.intent === 'CHAT') parsed.intent = 'GENERAL_CHAT';
            if (parsed.intent === 'GENERATE_PROJECT') parsed.intent = 'PROJECT_GENERATION';
            if (parsed.intent === 'UNKNOWN') parsed.intent = 'UNKNOWN_OR_AMBIGUOUS';
            if (parsed.intent === 'SCRAPE_WEBSITE') parsed.intent = 'WEBSITE_SCRAPING';
            if (parsed.intent === 'FIX_ERROR') parsed.intent = 'GENERAL_AUTOMATION';
            if (parsed.intent === 'MODIFY_LOCAL_PROJECT') parsed.intent = 'FILE_OPERATIONS';
            return parsed;
        }

        const isActionPrompt = /\b(create|build|generate|make|modify|edit|fix|debug|scrape|download|automate|write code|program)\b/i.test(goal);
        if (!isActionPrompt) {
            return {
                intent: "CHAT",
                answer: rawReply
            };
        }

        throw new Error(`Failed to parse AI response into a valid task plan for prompt: "${goal}"`);
    }

    parseJsonResponse(str) {
        if (!str || typeof str !== 'string') return null;
        const clean = str.trim();

        // Pass 1: Direct JSON parse
        let parsed = safeJsonParse(clean);
        if (parsed && typeof parsed === 'object') return parsed;

        // Pass 2: Extract code blocks enclosed in ```json or ```
        const fenceMatches = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
        if (fenceMatches) {
            for (const block of fenceMatches) {
                const inner = block.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
                parsed = safeJsonParse(inner);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        }

        // Pass 3: Extract substring between first { and last }
        const first = clean.indexOf('{');
        const last = clean.lastIndexOf('}');
        if (first !== -1 && last > first) {
            const candidate = clean.substring(first, last + 1);
            parsed = safeJsonParse(candidate);
            if (parsed && typeof parsed === 'object') return parsed;
        }

        return null;
    }

    async generateEdits(goal, fileContents) {
        process.stdout.write('AI Generating Surgical Edits...\n');

        const systemPrompt = `You are an expert developer modifying an existing project.
The user requested: "${goal}"

Here is the current content of the requested files:
${JSON.stringify(fileContents, null, 2)}

Provide precise surgical edits to fulfill the request.
For each file, provide an array of modifications.
Each modification must have:
- "targetContent": The EXACT existing string to match and replace. If the target string occurs multiple times, be extremely specific and include enough context (surrounding lines) so it matches EXACTLY ONE occurrence.
- "replacementContent": The new content to replace the target string.

Output STRICT JSON ONLY.
{
  "edits": [
    {
      "path": "relative/path/index.html",
      "modifications": [
        {
          "targetContent": "<button>Login</button>",
          "replacementContent": "<!-- Button removed -->"
        }
      ]
    }
  ]
}`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please provide the edits.` }
        ];

        let rawReply = await aiPlanner.callAI(messages);

        if (!rawReply) {
             throw new Error('AI Provider unavailable or returned empty response.');
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

            return safeJsonParse(clean) || { edits: [] };
        } catch (err) {
            console.error('[AI ANALYZER JSON PARSE ERROR]:', err.message);
            return { edits: [] };
        }
    }

    async analyzeErrorFix(errorOutput, context = {}) {
        const systemPrompt = `You are an AI diagnostic assistant.
Analyze the following error output from terminal execution.
Provide a clear explanation of the cause and the exact commands or code changes needed to fix it.

Error Output:
${errorOutput}

Context:
${JSON.stringify(context, null, 2)}

Output STRICT JSON ONLY:
{
  "cause": "Explanation of the error cause",
  "fixCommands": ["commands", "to", "run"],
  "files": [
     { "path": "file_to_change.js", "content": "full new content of the file" }
  ],
  "resolved": false
}`;
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please fix this error.` }
        ];

        let rawReply = await aiPlanner.callAI(messages);

        if (!rawReply) {
             throw new Error('AI Provider unavailable or returned empty response.');
        }

        try {
            let clean = rawReply.trim();
            if (clean.includes('```')) {
                const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) clean = match[1];
            }
            const first = clean.indexOf('{');
            const last = clean.lastIndexOf('}');
            if (first !== -1 && last !== -1) {
                clean = clean.substring(first, last + 1);
                return JSON.parse(clean);
            }
        } catch (err) {
            console.error('[AI ANALYZER JSON PARSE ERROR]:', err.message);
        }

        // Fallback: If AI returned plain conversational text instead of structured JSON, return CHAT response
        return {
            intent: "CHAT",
            answer: rawReply
        };
    }
}

module.exports = new CliAiAnalyzer();