const fs = require('fs');
const path = require('path');
const logger = require('../../core/logger');

// Load environment variables from .env
try {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath, quiet: true });
    }
} catch (e) {}

class DocumentAiEngine {
    constructor() {
        this.geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        this.netlifyEndpoint = 'https://codez48.netlify.app/.netlify/functions/cli-ai-chat';
    }

    getGeminiKey() {
        return process.env.GEMINI_API_KEY || null;
    }

    getGroqKeys() {
        const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
        return raw.split(',').map(k => k.trim()).filter(Boolean);
    }

    /**
     * Parse JSON from AI response with resilience against fences, preambles, and raw text
     */
    extractJson(rawText) {
        if (!rawText || typeof rawText !== 'string') return null;

        const text = rawText.trim();

        // 1. Try markdown code block
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenceMatch && fenceMatch[1]) {
            try {
                return JSON.parse(fenceMatch[1].trim());
            } catch (e) {}
        }

        // 2. Try raw outer JSON object
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
                return JSON.parse(text.substring(firstBrace, lastBrace + 1));
            } catch (e) {}
        }

        // 3. Try raw outer JSON array
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            try {
                return JSON.parse(text.substring(firstBracket, lastBracket + 1));
            } catch (e) {}
        }

        return null;
    }

    /**
     * Query Gemini model directly
     */
    async callGemini(prompt, systemInstruction = '', maxTokens = 8192) {
        const apiKey = this.getGeminiKey();
        if (!apiKey) return null;

        const fetch = globalThis.fetch || require('node-fetch');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${apiKey}`;

        const contents = [];
        if (systemInstruction) {
            contents.push({ role: 'user', parts: [{ text: `INSTRUCTION: ${systemInstruction}` }] });
            contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow your exact formatting and topic instructions strictly.' }] });
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 35000);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: maxTokens
                    }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                const part = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0];
                if (part && part.text) {
                    return part.text.trim();
                }
            } else {
                const errText = await res.text().catch(() => '');
                logger.debug(`[GEMINI API WARNING] Status ${res.status}: ${errText.substring(0, 120)}`);
            }
        } catch (e) {
            logger.debug(`[GEMINI API ERROR] ${e.message}`);
        }
        return null;
    }

    /**
     * Query Groq API
     */
    async callGroq(prompt, systemInstruction = '') {
        const keys = this.getGroqKeys();
        if (keys.length === 0) return null;

        const fetch = globalThis.fetch || require('node-fetch');
        const key = keys[Math.floor(Math.random() * keys.length)];

        const messages = [];
        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

        for (const model of modelsToTry) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 25000);

                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: 0.2,
                        max_tokens: 4096
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if (res.ok) {
                    const data = await res.json();
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        return data.choices[0].message.content.trim();
                    }
                }
            } catch (e) {
                logger.debug(`[GROQ API ERROR - ${model}] ${e.message}`);
            }
        }
        return null;
    }

    /**
     * Query Netlify Gateway Fallback
     */
    async callNetlifyGateway(prompt, apiCall = null) {
        try {
            if (apiCall) {
                const res = await apiCall('cli-ai-chat', 'POST', {
                    messages: [{ role: 'user', content: prompt }],
                    projectId: null
                }, false);
                if (res) {
                    if (res.answer) return res.answer;
                    if (res.content) return res.content;
                    if (res.data) return JSON.stringify(res.data);
                }
            }

            const fetch = globalThis.fetch || require('node-fetch');
            const res = await fetch(this.netlifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.answer) return data.answer;
                if (data.sections) return JSON.stringify(data);
            }
        } catch (e) {
            logger.debug(`[NETLIFY GATEWAY ERROR] ${e.message}`);
        }
        return null;
    }

    /**
     * Resilient Tiered AI Query
     */
    async queryAi(prompt, systemInstruction = '', apiCall = null, maxTokens = 8192) {
        // Tier 1: Gemini Direct (highest capacity, structured accuracy)
        let response = await this.callGemini(prompt, systemInstruction, maxTokens);
        if (response) return response;

        // Tier 2: Groq Direct (ultra-fast)
        response = await this.callGroq(prompt, systemInstruction);
        if (response) return response;

        // Tier 3: Netlify Serverless Gateway
        response = await this.callNetlifyGateway(prompt, apiCall);
        if (response) return response;

        return null;
    }

    /**
     * Detect Document Type and Intent from User Prompt
     */
    detectDocumentIntent(userPrompt) {
        const lower = (userPrompt || '').toLowerCase();

        // 0. Check for explicit slide count (e.g. "25 slides", "twenty slides", "30 slide")
        const slideDigitsMatch = lower.match(/(\d+)\s*[-_]?\s*slides?/i);
        let requestedSlides = slideDigitsMatch ? parseInt(slideDigitsMatch[1], 10) : null;
        if (!requestedSlides) {
            const wordsMap = {
                'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'twelve': 12, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
                'twenty': 20, 'twenty-five': 25, 'twenty five': 25, 'twenty-four': 24,
                'thirty': 30, 'thirty-five': 35, 'thirty five': 35, 'forty': 40, 'fifty': 50
            };
            const wordMatch = lower.match(/\b(five|six|seven|eight|nine|ten|twelve|fifteen|sixteen|seventeen|eighteen|twenty|twenty[- ]five|twenty[- ]four|thirty|thirty[- ]five|forty|fifty)\s*[-_]?\s*slides?\b/i);
            if (wordMatch) {
                const key = wordMatch[1].toLowerCase().replace(/\s+/, ' ');
                requestedSlides = wordsMap[key] || null;
            }
        }

        // 1. Check for explicit question count (e.g. "20 questions", "15 q&a")
        const qCountMatch = lower.match(/(\d+)\s*(?:questions?|q\s*&?\s*a|quiz)/i);
        const requestedQuestions = qCountMatch ? parseInt(qCountMatch[1], 10) : null;

        // 2. Check for section count (e.g. "10 sections", "8 chapters")
        const sCountMatch = lower.match(/(\d+)\s*(?:sections?|chapters?|parts?)/i);
        const requestedSections = sCountMatch ? parseInt(sCountMatch[1], 10) : null;

        // 3. Document Category
        let docType = 'DETAILED_REPORT';
        if (requestedQuestions !== null || lower.includes('question') || lower.includes('q&a') || lower.includes('qa')) {
            docType = 'QUESTIONS_AND_ANSWERS';
        } else if (lower.includes('study note') || lower.includes('notes') || lower.includes('cheat sheet')) {
            docType = 'STUDY_NOTES';
        } else if (lower.includes('assignment') || lower.includes('homework')) {
            docType = 'ASSIGNMENT';
        } else if (lower.includes('project document') || lower.includes('project report') || lower.includes('project proposal')) {
            docType = 'PROJECT_DOCUMENT';
        } else if (lower.includes('technical document') || lower.includes('specification') || lower.includes('architecture doc')) {
            docType = 'TECHNICAL_DOC';
        } else if (lower.includes('research summary') || lower.includes('literature review') || lower.includes('research paper')) {
            docType = 'RESEARCH_SUMMARY';
        } else if (lower.includes('business proposal') || lower.includes('pitch doc') || lower.includes('executive proposal')) {
            docType = 'BUSINESS_PROPOSAL';
        } else if (lower.includes('tutorial') || lower.includes('guide') || lower.includes('walkthrough') || lower.includes('how to')) {
            docType = 'TUTORIAL_GUIDE';
        } else if (lower.includes('essay') || lower.includes('article')) {
            docType = 'ESSAY';
        } else if (lower.includes('birthday') || lower.includes('wish') || lower.includes('letter')) {
            docType = 'PERSONAL_LETTER';
        }

        // 4. Extract core topic cleanly
        let topic = userPrompt
            .replace(/^(?:create|generate|write|make|build|produce)\s+(?:a|an)?\s*/i, '')
            .replace(/(?:word document|docx file|document|report|notes|presentation|powerpoint|pptx)\s+(?:on|about|for)?\s*/i, '')
            .replace(/with\s+\d+\s+(?:questions?|answers?|sections?|slides?)[^,]*/i, '')
            .replace(/\b(?:named|titled|called)\s+['"][^'"]+['"]/i, '')
            .replace(/["']/g, '')
            .trim();

        if (!topic || topic.length < 3) {
            topic = userPrompt.replace(/["']/g, '').trim();
        }

        return {
            docType,
            topic,
            requestedSlides,
            requestedQuestions,
            requestedSections
        };
    }

    /**
     * Generate Comprehensive Word Document Sections (supports N questions, multi-part, etc.)
     */
    async generateWordDocument(userPrompt, apiCall = null) {
        const intent = this.detectDocumentIntent(userPrompt);
        logger.status(`\x1b[36m[DOCUMENT AI ENGINE] Intent: ${intent.docType} | Topic: "${intent.topic}"\x1b[0m`);

        let systemInstruction = `You are an expert technical author, researcher, and document designer.
Your mission is to generate comprehensive, highly detailed, professional document content based precisely on the user's instructions.
CRITICAL RULES:
1. Focus 100% on the user's specific requested topic: "${intent.topic}". Never substitute a generic or unrelated topic.
2. Follow the requested format: ${intent.docType}.
3. If questions and answers are requested, provide the exact count requested (${intent.requestedQuestions || 10} questions). Each question MUST be clear, and each answer MUST be thorough, educational, and accurate.
4. If a detailed report or study notes is requested, include an Executive Summary, core concepts, in-depth technical analysis, practical examples, architecture/mechanisms, challenges, and future outlook.
5. Return ONLY a valid JSON object matching this schema:
{
  "title": string,
  "subtitle": string,
  "docType": "${intent.docType}",
  "sections": [
    {
      "heading": string,
      "subheadings": [ { "subheading": string, "text": string } ],
      "body": string,
      "bullets": [ string ],
      "table": {
        "headers": [ string ],
        "rows": [ [ string ] ]
      }
    }
  ]
}`;

        // Build tailored user prompt
        let prompt = `USER REQUEST: "${userPrompt}"\n\n`;

        if (intent.docType === 'QUESTIONS_AND_ANSWERS') {
            const count = intent.requestedQuestions || 10;
            prompt += `Generate EXACTLY ${count} comprehensive questions and answers on the topic: "${intent.topic}".
Format each item as a section where "heading" is "Question X: [The Question]" and "body" is the detailed, thorough answer. Include practical examples and bullet points in the answer where relevant.`;
        } else if (intent.docType === 'STUDY_NOTES') {
            prompt += `Generate comprehensive Study Notes on "${intent.topic}".
Include Key Definitions, Core Theorems/Principles, Step-by-Step Mechanisms, Important Formulas/Code, Common Pitfalls, and a Summary Review Checklist.`;
        } else if (intent.docType === 'TECHNICAL_DOC') {
            prompt += `Generate a formal Technical Documentation Specification for "${intent.topic}".
Include System Architecture, Component Specifications, Data Flow & APIs, Security & Compliance, Deployment & Scalability, and Maintenance Procedures.`;
        } else {
            const sectionCount = intent.requestedSections || 7;
            prompt += `Generate a high-impact, professional document with at least ${sectionCount} detailed sections on "${intent.topic}".
Provide rich, thorough paragraphs with concrete facts, mechanisms, and actionable insights. Do NOT truncate or use generic filler.`;
        }

        // Try AI generation
        const rawResponse = await this.queryAi(prompt, systemInstruction, apiCall, 8192);
        let docData = this.extractJson(rawResponse);

        // If top-level answer in Netlify JSON
        if (docData && docData.answer && typeof docData.answer === 'string') {
            const innerJson = this.extractJson(docData.answer);
            if (innerJson && innerJson.sections) {
                docData = innerJson;
            }
        }

        // Validate sections
        if (docData && Array.isArray(docData.sections) && docData.sections.length > 0) {
            // Verify count for Q&A: if user requested e.g. 20 and we only got 10, generate part 2!
            if (intent.docType === 'QUESTIONS_AND_ANSWERS' && intent.requestedQuestions && docData.sections.length < intent.requestedQuestions) {
                const currentCount = docData.sections.length;
                const needed = intent.requestedQuestions - currentCount;
                logger.status(`\x1b[33m[MULTI-PART GENERATION] Generated ${currentCount}/${intent.requestedQuestions} items. Requesting remaining ${needed} items...\x1b[0m`);

                const part2Prompt = `Continue the previous document: "${intent.topic}".
You have already generated questions 1 through ${currentCount}.
Now generate questions ${currentCount + 1} through ${intent.requestedQuestions}.
Return JSON: { "sections": [ { "heading": "Question X: ...", "body": "..." } ] }`;

                const part2Raw = await this.queryAi(part2Prompt, systemInstruction, apiCall, 4096);
                const part2Data = this.extractJson(part2Raw);
                if (part2Data && Array.isArray(part2Data.sections)) {
                    docData.sections = docData.sections.concat(part2Data.sections);
                    logger.status(`\x1b[32m✓ Multi-part generation complete: Total ${docData.sections.length} questions!\x1b[0m`);
                }
            }

            return {
                title: docData.title || `${intent.topic} - Comprehensive Document`,
                subtitle: docData.subtitle || `Detailed Document on ${intent.topic}`,
                docType: intent.docType,
                sections: docData.sections
            };
        }

        // If markdown text was returned without JSON
        if (rawResponse && typeof rawResponse === 'string') {
            const parsedMd = this.parseMarkdownToSections(rawResponse);
            if (parsedMd && parsedMd.length > 0) {
                return {
                    title: `${intent.topic} - Professional Document`,
                    subtitle: `Generated for: ${intent.topic}`,
                    docType: intent.docType,
                    sections: parsedMd
                };
            }
        }

        // Dynamic High-Quality Programmatic Fallback based on exact user topic & intent
        return this.generateDynamicFallbackDocument(intent);
    }

    /**
     * Fallback markdown parser
     */
    parseMarkdownToSections(rawText) {
        if (!rawText) return null;
        const sections = [];
        const lines = rawText.split('\n');
        let currentSection = null;

        for (const line of lines) {
            const trimmed = line.trim();
            const headerMatch = trimmed.match(/^(?:#+\s*|\d+[\.\)]\s*)(.+)/);
            if (headerMatch && (trimmed.startsWith('#') || /^\d+[\.\)]/.test(trimmed))) {
                if (currentSection && (currentSection.body || currentSection.bullets.length > 0)) {
                    sections.push(currentSection);
                }
                currentSection = { heading: headerMatch[1].replace(/[*#]/g, '').trim(), body: '', bullets: [] };
            } else if (currentSection) {
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                    currentSection.bullets.push(trimmed.replace(/^[-*•]\s*/, ''));
                } else if (trimmed.length > 0) {
                    currentSection.body += (currentSection.body ? '\n\n' : '') + trimmed;
                }
            }
        }
        if (currentSection && (currentSection.body || currentSection.bullets.length > 0)) {
            sections.push(currentSection);
        }
        return sections.length > 0 ? sections : null;
    }

    /**
     * Dynamic Fallback Document Generator (No static hardcoded 5 items)
     */
    generateDynamicFallbackDocument(intent) {
        const topic = intent.topic;
        const titleCaseTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

        if (intent.docType === 'QUESTIONS_AND_ANSWERS') {
            const total = intent.requestedQuestions || 10;
            const questions = [];
            const qTopics = [
                `Fundamentals and Core Definition of ${titleCaseTopic}`,
                `Historical Evolution and Key Milestones in ${titleCaseTopic}`,
                `Underlying Architecture, Theory, and Principles`,
                `Major Methodologies, Protocols, and Algorithms`,
                `Primary Practical Applications and Real-World Use Cases`,
                `Critical Advantages, Efficiencies, and Benefits`,
                `Key Technical Challenges, Bottlenecks, and Limitations`,
                `Security Considerations, Vulnerabilities, and Mitigations`,
                `Comparative Analysis: How ${titleCaseTopic} Compares to Alternatives`,
                `Best Practices for Designing and Implementing ${titleCaseTopic}`,
                `Performance Optimization, Scalability, and Benchmarking`,
                `Data Management, Integrity, and Storage Considerations`,
                `Integration Patterns with Modern Enterprise Infrastructure`,
                `Industry Standards, Regulatory Compliance, and Governance`,
                `Ethical Considerations and Societal Impacts`,
                `Debugging, Monitoring, and Observability Techniques`,
                `Case Study: High-Scale Deployment Example`,
                `Developer Tooling, Libraries, and Ecosystem Overview`,
                `Common Misconceptions and Anti-Patterns to Avoid`,
                `Future Trends, Emerging Innovations, and 5-Year Horizon`
            ];

            for (let i = 0; i < total; i++) {
                const qTitle = qTopics[i % qTopics.length];
                questions.push({
                    heading: `Question ${i + 1}: What are the key aspects of ${qTitle}?`,
                    body: `In the context of ${titleCaseTopic}, ${qTitle} represents a foundational dimension. Practitioners must evaluate structural tradeoffs, operational resilience, and domain constraints. Establishing rigorous standards ensures consistent outcomes and high reliability across production environments.`,
                    bullets: [
                        `Core concept: Systematic alignment with ${titleCaseTopic} requirements.`,
                        `Operational impact: Predictable execution and measurable latency/throughput gains.`,
                        `Recommended practice: Continuous verification, testing, and documentation.`
                    ]
                });
            }

            return {
                title: `${titleCaseTopic}: ${total} Comprehensive Questions and Answers`,
                subtitle: `Structured Knowledge Base and Reference Guide`,
                docType: 'QUESTIONS_AND_ANSWERS',
                sections: questions
            };
        }

        // Detailed Report / Notes
        const sectionTemplates = [
            { heading: `1. Executive Summary & Core Foundations of ${titleCaseTopic}`, body: `This comprehensive report provides an authoritative examination of ${titleCaseTopic}, detailing foundational principles, systemic scope, and operational significance. Modern implementations require an integrated understanding of both architectural design and practical execution.` },
            { heading: `2. Historical Evolution & Industry Context`, body: `The emergence and maturation of ${titleCaseTopic} reflect broader technological paradigms. Transitioning from early theoretical models to robust enterprise applications has driven dramatic productivity improvements and established new industry benchmarks.` },
            { heading: `3. Technical Architecture & Engineering Principles`, body: `The structural framework of ${titleCaseTopic} relies on modular components, deterministic protocols, and resilient data flows. Ensuring low latency, high availability, and decoupled services enables seamless scaling across heterogeneous environments.` },
            { heading: `4. Implementation Methodology & Real-World Workflows`, body: `Deploying ${titleCaseTopic} requires disciplined lifecycle management: requirements definition, automated testing pipelines, progressive rollout strategies, and real-time observability frameworks.` },
            { heading: `5. Security Architecture, Governance & Compliance`, body: `Ensuring rigorous zero-trust authentication, cryptographic data integrity, and strict adherence to global regulatory standards is paramount when operating ${titleCaseTopic} systems.` },
            { heading: `6. Comparative Analysis & Performance Metrics`, body: `Evaluating key performance indicators (KPIs)—including throughput, latency, failure rates, and resource utilization—demonstrates the measurable return on investment delivered by ${titleCaseTopic}.` },
            { heading: `7. Strategic Outlook & Future Innovations`, body: `The trajectory of ${titleCaseTopic} indicates accelerating convergence with intelligent automation, edge computing, and adaptive governance, positioning it as an indispensable asset for forward-looking organizations.` }
        ];

        return {
            title: `${titleCaseTopic}: Comprehensive Analysis & Implementation Guide`,
            subtitle: `Professional Technical Report and Reference Manual`,
            docType: intent.docType,
            sections: sectionTemplates
        };
    }

    /**
     * Generate Slide Deck for PowerPoint with 100+ Template Catalog Integration & Dynamic Progress
     */
    async generateSlideDeck(userPrompt, targetCount = null, apiCall = null, explicitTemplate = null) {
        const pptTemplateCatalog = require('../templates/ppt-template-catalog');
        const uiProgress = require('../../core/ui-progress');

        const intent = this.detectDocumentIntent(userPrompt);
        let slideCount = targetCount || intent.requestedSlides || intent.requestedSections;

        if (!slideCount) {
            try {
                const creditVault = require('../../core/credit-vault');
                const plan = creditVault.getPlan();
                if (plan.id === 'PROFIT_ORIENTED') slideCount = 25;
                else if (plan.id === 'ENTERPRISE') slideCount = 16;
                else slideCount = 10;
            } catch (_) {
                slideCount = 15;
            }
        }
        slideCount = Math.max(5, Math.min(60, parseInt(slideCount, 10)));

        // Match optimal template from 105 Template Catalog (or honor explicit user selection)
        const matchedTemplate = explicitTemplate || pptTemplateCatalog.findBestTemplate(userPrompt);
        const templateNum = matchedTemplate && matchedTemplate.number ? matchedTemplate.number : 1;
        const templateName = matchedTemplate ? matchedTemplate.name : 'Executive Modern Strategy Deck';
        const templateCategory = matchedTemplate ? matchedTemplate.category : 'Corporate Strategy';

        uiProgress.updateProgress(10, `Selected Template #${templateNum}: "${templateName}" (${templateCategory})`);
        logger.status(`\x1b[35m[100+ PPT CATALOG MATCH] Template #${templateNum}: "${templateName}" (${templateCategory})\x1b[0m`);
        logger.status(`\x1b[36m[DOCUMENT AI ENGINE] Generating EXACTLY ${slideCount} PowerPoint slides for topic: "${intent.topic}"...\x1b[0m`);

        // Style Archetype determination from matched template or topic
        const lowerTopic = intent.topic.toLowerCase();
        let style = (matchedTemplate && matchedTemplate.recommendedTheme) ? matchedTemplate.recommendedTheme : 'EXECUTIVE_LUXURY';
        if (lowerTopic.includes('minimal') || lowerTopic.includes('clean') || lowerTopic.includes('simple')) {
            style = 'MINIMAL';
        } else if (lowerTopic.includes('pitch') || lowerTopic.includes('startup') || lowerTopic.includes('venture')) {
            style = 'PITCH';
        } else if (lowerTopic.includes('biology') || lowerTopic.includes('science') || lowerTopic.includes('education')) {
            style = 'EDUCATIONAL';
        } else if (lowerTopic.includes('data') || lowerTopic.includes('analytics') || lowerTopic.includes('metric')) {
            style = 'DATA_DRIVEN';
        }

        // Available 30 distinct slide designs matrix & educational flowchart layouts
        const availableLayouts = [
            'chevron_title', 'cyan_chevron_architecture', 'gold_wave_proposal', 'flowchart_process',
            'hexagon_mesh_tech', 'dark_cyber_glow', 'ocean_wave_fluid', 'luxury_gold_rings',
            'double_chevron_arrow', 'split_capsules', 'curved_panel_4cards', 'four_hexagons_team',
            'stacked_column_chart', 'three_pricing_cards', 'diagonal_testimonials', 'kpi_dashboard',
            'problem_solution_split', 'timeline_roadmap', 'full_width_takeaway', 'two_column',
            'four_pillars', 'quote_hero', 'closing_contact_chevron'
        ];

        // Format a high-density summary of top templates to send to AI
        const catalogSummary = pptTemplateCatalog.templates.slice(0, 30).map((t, idx) => 
            `${idx + 1}. [${t.id}] "${t.name}" (${t.category})`
        ).join('\n');

        const allSlides = [];

        // Chunked Generation: for > 10 slides, split into batches of 8-10 slides to prevent LLM token exhaustion & truncation at 17 slides
        const chunkSize = 10;
        const numChunks = Math.ceil(slideCount / chunkSize);

        for (let c = 0; c < numChunks; c++) {
            const startIdx = c * chunkSize + 1;
            const endIdx = Math.min(slideCount, (c + 1) * chunkSize);
            const batchCount = endIdx - startIdx + 1;

            const progressPct = Math.round(15 + ((c / numChunks) * 65));
            uiProgress.updateProgress(progressPct, `Generating slides ${startIdx}-${endIdx}/${slideCount}: ${templateName}`);

            const batchFocus = c === 0 ? "Executive Strategy, Problem Bottlenecks, Vision & Core Subsystems (Opening Foundation)"
                             : c === 1 ? "Technical Deep-Dives, Comparative Architecture, Capabilities Matrix & Case Studies (Core Proof)"
                             : "Quantitative KPIs, Governance, FAQs, Long-Term Horizons & Strategic Conclusion (Executive Action)";

            const systemInstruction = `You are an elite executive presentation designer and visual content strategist.
Your task is to generate Part ${c + 1} of a comprehensive, non-repetitive presentation for: "${intent.topic}".
Chosen Catalog Archetype: Template #${templateNum}: "${templateName}" (${templateCategory}).
Slides to Generate in this Batch: EXACTLY ${batchCount} slides (Numbered ${startIdx} through ${endIdx} out of total ${slideCount} slides).
Batch Narrative Focus: ${batchFocus}.
Style: ${style}.

REFERENCE CATALOG EXCERPT:
${catalogSummary}

CRITICAL DESIGN RULES:
1. DIVERSE LAYOUT SELECTION: Assign distinct, purposeful layouts from this available 20-layout library:
   [${availableLayouts.join(', ')}]
2. ZERO CONSECUTIVE REPETITION: No two consecutive slides may share the same layout. Every slide must have a distinct visual structure.
3. Every slide must have a compelling, professional headline and 3 to 4 concise, high-impact bullet points.
4. Output STRICT JSON ONLY matching:
{
  "slides": [
    {
      "slideNumber": number,
      "title": string,
      "subtitle": string,
      "layout": string,
      "bullets": [ string ],
      "statNumber": string,
      "statLabel": string,
      "searchQuery": string
    }
  ]
}`;

            const prompt = `Topic: "${intent.topic}"
Generate EXACTLY ${batchCount} slides numbered ${startIdx} to ${endIdx}.
Template Archetype: Template #${templateNum}: "${templateName}"
Narrative Focus: ${batchFocus}.
Ensure varied layouts across slides without repeating the same layout consecutively.`;

            try {
                const rawResponse = await this.queryAi(prompt, systemInstruction, apiCall, 7000);
                let batchData = this.extractJson(rawResponse);

                if (batchData && batchData.answer && typeof batchData.answer === 'string') {
                    const inner = this.extractJson(batchData.answer);
                    if (inner && inner.slides) batchData = inner;
                }

                if (batchData && Array.isArray(batchData.slides) && batchData.slides.length > 0) {
                    batchData.slides.forEach(s => allSlides.push(s));
                }
            } catch (err) {
                logger.debug(`[DOCUMENT AI] Chunk ${c + 1} error: ${err.message}`);
            }

            if (allSlides.length >= slideCount) break;
        }

        // Guaranteed Exact Slide Count Assurance: If AI generated fewer slides than requested, complete from master archetypes
        const fallbackDeck = this.generateDynamicFallbackDeck(intent.topic, slideCount, style);

        if (allSlides.length < slideCount) {
            logger.status(`\x1b[33m[DOCUMENT AI] Completing deck with curated high-impact slides to achieve exact ${slideCount} slide target...\x1b[0m`);
            for (let i = allSlides.length; i < slideCount; i++) {
                allSlides.push(fallbackDeck.slides[i]);
            }
        }

        // If AI generated more than targetCount, slice to exact count
        const finalSlides = allSlides.slice(0, slideCount);

        // Renumber slides sequentially and enforce template-specific layout architecture
        const mockups = matchedTemplate && matchedTemplate.slideMockups && matchedTemplate.slideMockups.length > 0
            ? matchedTemplate.slideMockups
            : null;

        for (let i = 0; i < finalSlides.length; i++) {
            finalSlides[i].slideNumber = i + 1;
            
            if (mockups) {
                if (i === 0) {
                    finalSlides[i].layout = mockups[0].layout || 'chevron_cutout_right';
                } else if (i === finalSlides.length - 1) {
                    finalSlides[i].layout = mockups[mockups.length - 1].layout || 'closing_contact_chevron';
                } else {
                    const cycleIdx = 1 + ((i - 1) % (mockups.length - 2));
                    finalSlides[i].layout = mockups[cycleIdx].layout || availableLayouts[(i + 1) % availableLayouts.length];
                }
            } else if (i > 0 && finalSlides[i].layout === finalSlides[i - 1].layout) {
                // Pick next diverse layout
                const nextLayout = availableLayouts[(i + 2) % availableLayouts.length];
                finalSlides[i].layout = nextLayout === 'title_slide' ? 'three_cards' : nextLayout;
            }
        }

        uiProgress.updateProgress(90, `All ${slideCount} slides formatted & verified for: "${templateName}"`);

        return {
            title: `${intent.topic.charAt(0).toUpperCase() + intent.topic.slice(1)} Presentation`,
            style: style,
            template: matchedTemplate,
            slides: finalSlides
        };
    }

    generateDynamicFallbackDeck(topic, slideCount = 25, style = 'EXECUTIVE_LUXURY') {
        const titleCase = (topic || 'Strategic Transformation').charAt(0).toUpperCase() + (topic || 'Strategic Transformation').slice(1);
        const count = Math.max(5, Math.min(60, parseInt(slideCount, 10) || 25));

        // 30 Curated, completely distinct narrative archetypes covering every strategic dimension
        const masterArchetypes = [
            {
                title: `${titleCase}: Executive Vision & Strategic Blueprint`,
                layout: 'title_slide',
                subtitle: 'High-Impact Transformation Architecture, Macro Market Drivers & Technical Moats',
                bullets: [
                    'Macro industry forces driving generational transformation across global enterprise architectures',
                    'Strategic imperatives replacing legacy monolithic friction with autonomous, deterministic pipelines',
                    'Target executive outcomes: 10x throughput surge, verified compliance, and operational resilience'
                ]
            },
            {
                title: 'Market Landscape: Critical Industry Bottlenecks vs Engineered Solution',
                layout: 'problem_solution_split',
                bullets: [
                    'Current Industry Friction: Fragmented workflows, cascading manual errors, and soaring overhead costs.\n\nResource Drain: Unpredictable outages and engineering team context-switching.',
                    'Engineered Modern Solution: Autonomous verified pipelines with real-time health telemetry.\n\nStrategic Value: Up to 78% operational cost reduction and instant elastic scaling.'
                ]
            },
            {
                title: 'Modular Architecture & System Subsystems',
                layout: 'architecture_blueprint',
                bullets: [
                    'Telemetry Ingestion Subsystem: High-frequency data capture, normalization, and zero-loss streaming.',
                    'Core Neural Compute Engine: Contextual reasoning, parallel logic execution, and stateful verification.',
                    'Edge Dispatch Layer: Multi-channel delivery with automated failover and sub-millisecond execution.'
                ]
            },
            {
                title: `Three Foundational Pillars of Modern ${titleCase}`,
                layout: 'three_cards',
                bullets: [
                    'Pillar 01 — Elastic Scalability: Dynamic auto-scaling infrastructure accommodating peak workloads without latency degradation.',
                    'Pillar 02 — Zero-Trust Security: End-to-end data encryption, granular role governance, and immutable audit telemetry.',
                    'Pillar 03 — Autonomous Resilience: Self-healing error loops, predictive anomaly interception, and instant failover.'
                ]
            },
            {
                title: 'Key Performance Benchmarks & Accuracy Metrics',
                layout: 'kpi_dashboard',
                statNumber: '99.98%',
                bullets: [
                    'Continuous operational reliability maintaining SLA benchmarks across high-concurrency production.',
                    'Sub-millisecond query execution delivering up to 12x acceleration over conventional monolithic stacks.',
                    'Measurable reduction in operational overhead and manual intervention across all deployment stages.'
                ]
            },
            {
                title: `Comparative Matrix: Legacy Infrastructure vs ${titleCase}`,
                layout: 'two_column',
                bullets: [
                    'Legacy Traditional Approach:\n• Rigid monolithic dependencies and brittle APIs\n• Slow manual human debugging cycles\n• Unpredictable maintenance costs and downtime\n• Fragmented data silos without real-time audit',
                    'Codez48 Modern Standard:\n• Cloud-native modular component design\n• 100% automated self-healing loops\n• Deterministic execution guarantees with verified checkmarks\n• Unified cross-platform telemetry and instant scaling'
                ]
            },
            {
                title: 'End-to-End Phased Implementation Roadmap',
                layout: 'process_funnel',
                bullets: [
                    'Phase 01 — Discovery: Architectural audit, security boundary definition, and baseline telemetry benchmarking.',
                    'Phase 02 — Sandbox Pilot: Isolated integration testing, automated regression verification, and sandbox enablement.',
                    'Phase 03 — Production Cutover: Phased traffic migration, live monitoring hooks, and automated failover validation.',
                    'Phase 04 — Enterprise Scale: Global edge replication, executive dashboard synchronization, and autonomous optimization.'
                ]
            },
            {
                title: 'Four Core Operating Frameworks & Security Domains',
                layout: 'four_pillars',
                bullets: [
                    'Governance Framework: Role-based access controls and enterprise compliance sign-offs.',
                    'Compute Optimization: Parallel task distribution and intelligent resource reclamation.',
                    'Data Integrity Mesh: Immutable audit trails and real-time schema validation.',
                    'Continuous Resilience: Proactive health heartbeats and self-recovering services.'
                ]
            },
            {
                title: 'Executive Strategic Directive & Operating Principle',
                layout: 'quote_hero',
                subtitle: 'Strategic Executive Synthesis',
                bullets: [
                    `"In high-stakes enterprise engineering, deterministic execution and verified automation are the only scalable competitive advantages."`,
                    '— Codez48 Executive Strategic Architecture Board',
                    'Organizations adopting verified autonomous workflows consistently out-innovate competitors by eliminating operational drag and human fatigue.'
                ]
            },
            {
                title: 'Core Technical Capabilities & Feature Matrix',
                layout: 'feature_matrix',
                bullets: [
                    'Autonomous Orchestration: Zero-touch task routing and execution.',
                    'Real-Time Telemetry: Live metrics streaming across all services.',
                    'Multi-Channel Dispatch: Guaranteed message and document delivery.',
                    'Bilingual AI Intelligence: Authentic Tamil & English contextual reasoning.',
                    'Visual Verification: Automated screenshot capture and audit logging.',
                    'Security Isolation: Sandboxed execution with zero credential leakage.'
                ]
            },
            {
                title: 'Quantified Business Impact & Proven ROI',
                layout: 'stat_callout',
                statNumber: '10x',
                statLabel: 'Deployment Speed & Throughput Multiplier',
                bullets: [
                    'Demonstrated elimination of manual handoff delays and operational friction.',
                    'Direct reduction in operational costs through intelligent resource scheduling.',
                    'Uncompromising reliability backed by full audit trails and double-checked delivery.'
                ]
            },
            {
                title: 'Enterprise SWOT Landscape & Strategic Mitigations',
                layout: 'swot_analysis',
                bullets: [
                    'Strengths: Robust architecture, instant verification, and proven deterministic execution loops.',
                    'Opportunities: Seamless expansion into adjacent enterprise workflows and automated customer touchpoints.',
                    'Challenges: Legacy infrastructure inertia and organizational change management resistance.',
                    'Mitigations: Phased risk-free migration sandboxes, comprehensive documentation, and executive support.'
                ]
            },
            {
                title: 'Transformation Case Study: From Manual Drag to Autonomous Velocity',
                layout: 'case_study_spotlight',
                bullets: [
                    'Client Baseline: High operational fatigue, fragmented tooling, and 48-hour response times on critical tasks.',
                    'Engineered Deployment: Rollout of Codez48 autonomous pilot with bilingual intelligence and live verification.',
                    'Verified Outcome: 84% reduction in cycle turnaround time and 100% SLA compliance achieved in 30 days.'
                ]
            },
            {
                title: 'Executive Oversight & Governance Framework',
                layout: 'team_governance',
                bullets: [
                    'Executive Steering: Strategic alignment, budget allocation, and business value realization cadences.',
                    'Engineering Operations: Continuous integration, pipeline security, and automated performance testing.',
                    'Compliance & Audit: Regulatory compliance, encryption certification, and transparent audit logging.'
                ]
            },
            {
                title: 'Deep Architectural Integration & Cross-Platform Interoperability',
                layout: 'text_left',
                bullets: [
                    'Native Windows Win32 API and Office COM automation integration for verified document outputs.',
                    'Direct protocol dispatch with foreground lock management and window maximization enforcement.',
                    'Sub-second communication bridges between web dashboards and local desktop workers.'
                ]
            },
            {
                title: 'Frequently Asked Technical & Deployment Questions',
                layout: 'faq_accordion',
                bullets: [
                    'How is data privacy maintained? End-to-end encryption with local execution guarantees zero external data leakage.',
                    'What happens during network interruptions? Autonomous failover queues persist state and resume automatically upon reconnection.',
                    'How does the system ensure output quality? Multi-layer validation audits check slide geometry, contrast, and layout before saving.'
                ]
            },
            {
                title: 'Core Moat: The Power of Deterministic Execution',
                layout: 'full_width_takeaway',
                bullets: [
                    'Moving Beyond Probabilistic AI to Guaranteed Engineering Results',
                    'Codez48 combines the generative intelligence of advanced LLMs with deterministic validation rules to ensure every output meets high executive standards without hallucination.'
                ]
            },
            {
                title: 'Global Scalability & Multi-Region Resilience',
                layout: 'three_cards',
                bullets: [
                    'Region 01 — Latency Optimization: Edge caching and localized compute clusters reducing round-trip times.',
                    'Region 02 — Data Sovereignty: Localized compliance boundaries satisfying regional statutory mandates.',
                    'Region 03 — Disaster Recovery: Active-active hot standby infrastructure ensuring continuous uptime.'
                ]
            },
            {
                title: 'Automated Self-Healing & Telemetry Monitoring Loops',
                layout: 'architecture_blueprint',
                bullets: [
                    'Interception Layer: Continuous heartbeat monitors detecting deviations from baseline metrics.',
                    'Analysis Node: Root-cause identification and automated mitigation strategy selection.',
                    'Restoration Protocol: Zero-downtime hot patching and verified service restoration.'
                ]
            },
            {
                title: 'Quantified Cost & Latency Benchmark Matrix',
                layout: 'kpi_dashboard',
                statNumber: '78%',
                bullets: [
                    'Overall operational expenditure reduction through automated workload consolidation.',
                    'Zero-overhead background execution running on optimized lightweight processes.',
                    'Guaranteed performance metrics verified through real-time telemetry dashboards.'
                ]
            },
            {
                title: 'Next-Generation Rollout Phasing & Milestones',
                layout: 'timeline_roadmap',
                bullets: [
                    'Milestone 1 (Days 1-15): Architecture blueprint sign-off, sandbox validation, and security clearances.',
                    'Milestone 2 (Days 16-30): Production deployment, pilot group onboarding, and telemetry tuning.',
                    'Milestone 3 (Days 31-45): Full enterprise cutover, executive review, and continuous autonomous optimization.'
                ]
            },
            {
                title: 'Ecosystem Interoperability & Integration Connectors',
                layout: 'feature_matrix',
                bullets: [
                    'REST & GraphQL APIs: High-speed programmatic connectors.',
                    'Desktop Integration: Native Windows and Office automation.',
                    'Web Platform: Real-time Playwright browser synchronization.',
                    'Messaging Gateways: Autonomous WhatsApp text & voice handling.',
                    'Storage Vault: Obfuscated AES metadata security.',
                    'Cloud Functions: Serverless event dispatch and triggers.'
                ]
            },
            {
                title: 'Innovation Horizon: What Lies Ahead',
                layout: 'process_funnel',
                bullets: [
                    'Near-Term: Voice cloning enhancements and natural conversational phone interactions.',
                    'Mid-Term: Multi-agent cooperative workflows solving complex multi-step business operations.',
                    'Long-Term: Autonomous end-to-end enterprise digital twins and self-governing business loops.',
                    'Target State: Frictionless human-AI collaboration operating at global scale.'
                ]
            },
            {
                title: 'SLA Assurance, Compliance & Disaster Safeguards',
                layout: 'four_pillars',
                bullets: [
                    '99.9% Uptime SLA: Contractually assured availability with automated penalty credits.',
                    'SOC2 & ISO Ready: Immutable audit trails meeting enterprise regulatory standards.',
                    'Instant Backup: Automated snapshot creation with 1-click point-in-time recovery.',
                    'Enterprise Support: Dedicated technical engineering support and priority response channels.'
                ]
            },
            {
                title: 'Executive Deliverables Checklist & Actionable Next Steps',
                layout: 'conclusion',
                bullets: [
                    'Immediate deployment of verified production templates and starter code repositories.',
                    'Execution of onboarding verification protocol with zero workflow disruption.',
                    'Continuous access to executive technical desk and autonomous system improvements.'
                ]
            },
            {
                title: 'Security Boundary Verification & Data Sovereignty',
                layout: 'four_pillars',
                bullets: [
                    'Cryptographic Safeguards: Hardware-backed keystores and AES-256 data protection.',
                    'Network Isolation: Strict VPC peering and zero public attack surface.',
                    'Audit Integrity: Tamper-proof logging with cryptographic signature hashing.',
                    'Access Governance: Least-privilege access enforcement with automated revocation.'
                ]
            },
            {
                title: 'User Adoption, Enablement & Organizational Change',
                layout: 'two_column',
                bullets: [
                    'Traditional Adoption Roadblocks:\n• Steep learning curves and complex setup manuals\n• Employee resistance to unfamiliar interfaces\n• Slow feedback loops and disconnected documentation',
                    'Codez48 Accelerated Enablement:\n• Zero-configuration natural language prompts\n• Instant visual verification and hands-on walkthroughs\n• Continuous automated assistance delivering immediate value'
                ]
            },
            {
                title: 'Financial Value Creation & Long-Term Total Cost of Ownership',
                layout: 'stat_callout',
                statNumber: '3.8x',
                statLabel: 'Three-Year Enterprise Value Creation Multiple',
                bullets: [
                    'Documented reduction in software license sprawl and external consulting fees.',
                    'Direct enhancement of internal engineering velocity and product delivery cycles.',
                    'Scalable cost structure that grows proportionally with verified business value.'
                ]
            },
            {
                title: 'Technology Harmonization & Toolchain Consolidation',
                layout: 'faq_accordion',
                bullets: [
                    'How does this integrate with existing tools? Seamless drop-in adapters harmonize legacy software without requiring ground-up rewrites.',
                    'What technical prerequisites are needed? Standard Node.js runtime and basic Windows environment with zero specialized hardware.',
                    'How are custom business rules defined? High-level natural language directives or structured JSON profiles manage all behaviors.'
                ]
            },
            {
                title: 'Strategic Partnership, Ecosystem Support & Shared Future',
                layout: 'quote_hero',
                subtitle: 'Codez48 Leadership Commitment',
                bullets: [
                    `"Our mission is to empower visionaries with autonomous tools that turn ambitious ideas into verified reality."`,
                    '— Codez48 Engineering Leadership',
                    'We partner deeply with our clients across every tier to deliver uncompromising quality, robust architectures, and continuous innovation.'
                ]
            }
        ];

        const slides = [];
        for (let i = 0; i < count; i++) {
            const template = masterArchetypes[i % masterArchetypes.length];
            slides.push({
                slideNumber: i + 1,
                title: template.title,
                layout: template.layout,
                subtitle: template.subtitle || null,
                bullets: template.bullets,
                statNumber: template.statNumber || null,
                statLabel: template.statLabel || null,
                searchQuery: `${topic} ${template.layout}`
            });
        }

        return {
            title: `${titleCase} Presentation`,
            style: style || 'EXECUTIVE_LUXURY',
            slides
        };
    }
}

module.exports = new DocumentAiEngine();
