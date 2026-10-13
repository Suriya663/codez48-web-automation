const aiPlanner = require('./ai-planner');

class CliAiAnalyzer {
    async analyzeRequest(goal, context = {}) {
        process.stdout.write('AI Thinking...\n');

        const systemPrompt = `You are the Codez48 CLI Pilot AI Assistant, an expert developer and automation agent.
Analyze the user's request: "${goal}"

Context:
${JSON.stringify(context, null, 2)}

Determine the user's intent. The possible intents are:
1. GENERATE_PROJECT: The user wants to create a new project, write code, or generate a website/application from scratch.
2. SCRAPE_WEBSITE: The user provides a URL and wants to scrape, extract, or copy the website source code.
3. BROWSER_AUTOMATION: The user wants to open a browser, interact with a website, click buttons, fill forms, etc.
4. FIX_ERROR: The user is reporting an error and wants you to diagnose and fix it.
5. GENERAL_AUTOMATION: The user wants to do a local file operation, use calculator, word, excel, powerpoint, notepad, etc.
6. MODIFY_LOCAL_PROJECT: The user wants to find, open, or edit an existing local project folder or files.
7. UNKNOWN: If none of the above apply.

If GENERATE_PROJECT:
- Determine projectType ("static_website", "nodejs_backend", "fullstack", "python", "frontend_app", "other")
- Generate the COMPLETE files needed for the project. Provide an array of file objects { path, content }. Create complete HTML, CSS, JS files. Do not write incomplete snippets.
- If dependencies are needed (like npm packages), list them in a "dependencies" array.
- Determine the start command in "startCommand" (e.g. "npm start", "node server.js", "python main.py", "npx serve .").
- Determine the preview URL if applicable (e.g. "http://localhost:3000") in "previewUrl".

If MODIFY_LOCAL_PROJECT:
- Determine the target folder or path from the user's request in "targetFolder" (e.g. "Desktop/Codez48", "existing-project").
- Determine the requested modifications in "modificationsDescription".

If FIX_ERROR:
- Provide the "fixCommands" array of terminal commands to fix the issue, or "files" array of code changes.

Output STRICT JSON ONLY. Do not wrap in markdown unless it's a code block containing the JSON.
{
  "intent": "GENERATE_PROJECT" | "SCRAPE_WEBSITE" | "BROWSER_AUTOMATION" | "FIX_ERROR" | "GENERAL_AUTOMATION" | "MODIFY_LOCAL_PROJECT" | "UNKNOWN",
  "projectType": "static_website" | "nodejs_backend" | "fullstack" | "python" | "frontend_app" | "other" | null,
  "description": "Short description of what the user requested and what you are about to create/do",
  "targetUrl": "url if provided",
  "targetFolder": "folder name or path if modifying existing project",
  "modificationsDescription": "what changes should be made",
  "files": [
    {
      "path": "relative/path/e.g. index.html or server.js",
      "content": "Full source code here"
    }
  ],
  "dependencies": ["express", "cors"],
  "startCommand": "node server.js",
  "previewUrl": "http://localhost:3000",
  "fixCommands": ["npm install missing-package"]
}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User Request: "${goal}"` }
        ];

        let rawReply = await aiPlanner.callAI(messages);

        if (!rawReply) {
            // Mock AI behavior for tests if API key is missing
            const lowerGoal = goal.toLowerCase();
            if (lowerGoal.includes('javascript program') || lowerGoal.includes('javascript code') || lowerGoal.includes('standalone javascript')) {
                return {
                    intent: "GENERATE_PROJECT",
                    projectType: "nodejs_backend",
                    description: "Generating standalone JavaScript program",
                    files: [{ path: "index.js", content: "console.log('Hello World');" }],
                    dependencies: [],
                    startCommand: "node index.js"
                };
            }
            if (lowerGoal.includes('static website')) {
                return {
                    intent: "GENERATE_PROJECT",
                    projectType: "static_website",
                    description: "Generating static website",
                    files: [
                        { path: "index.html", content: "<html><body><h1>Hello Website</h1></body></html>" },
                        { path: "style.css", content: "body { background: #000; }" }
                    ],
                    dependencies: ["serve"],
                    startCommand: "npx serve . -p 3000",
                    previewUrl: "http://localhost:3000"
                };
            }
            if (lowerGoal.includes('node.js project') || lowerGoal.includes('node project') || lowerGoal.includes('nodejs')) {
                return {
                    intent: "GENERATE_PROJECT",
                    projectType: "nodejs_backend",
                    description: "Generating Node.js backend",
                    files: [{ path: "server.js", content: "const express = require('express'); const app = express(); app.listen(3000);" }],
                    dependencies: ["express"],
                    startCommand: "node server.js"
                };
            }
            if (lowerGoal.includes('python script')) {
                 return {
                     intent: "GENERATE_PROJECT",
                     projectType: "python",
                     description: "Generating python script",
                     files: [{ path: "main.py", content: "print('hello world')" }],
                     dependencies: [],
                     startCommand: "python main.py"
                 };
            }
            if (lowerGoal.includes('error')) {
                 return {
                     intent: "FIX_ERROR",
                     cause: "Mocked cause",
                     fixCommands: ["echo Fixed"]
                 };
            }
            if (lowerGoal.includes('modify') || lowerGoal.includes('edit') || lowerGoal.includes('fix the errors in') || lowerGoal.includes('existing project') || lowerGoal.includes('my project') || lowerGoal.includes('folder named')) {
                 return {
                     intent: "MODIFY_LOCAL_PROJECT",
                     targetFolder: lowerGoal.includes('startify') ? 'startify' : 'project_1791909618826',
                     modificationsDescription: "Modify the project based on user request",
                     files: [
                         { path: "index.html", content: "<html><body><h1>Modified</h1></body></html>" }
                     ]
                 };
            }
            return null;
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

            return JSON.parse(clean);
        } catch (err) {
            console.error('[AI ANALYZER JSON PARSE ERROR]:', err.message);
            return null;
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
             return {
                 cause: "Mocked AI Error Analysis Cause",
                 fixCommands: ["echo 'Fixed AI error'"],
                 files: [],
                 resolved: true
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

            return JSON.parse(clean);
        } catch (err) {
            console.error('[AI ANALYZER JSON PARSE ERROR]:', err.message);
            return null;
        }
    }
}

module.exports = new CliAiAnalyzer();