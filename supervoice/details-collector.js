/**
 * CODEZ48 DETAILS COLLECTOR & PROMPT WIZARD
 *
 * Captures missing business and campaign details when a user gives a high-level
 * or ambiguous WhatsApp automation instruction to the AI.
 *
 * Collects step-by-step:
 *   1. Recipient Source: File location (Excel .xlsx/.xls, Word .docx/.doc, CSV, or TXT)
 *      OR comma-separated numbers
 *   2. User Business Profile: Select saved profile, create new, or update existing via userDetailsManager
 *      (Captures Business Name, Nature of Business, Purpose of Operations, Link, CTA)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const logger = require('../src/core/logger');
const userDetailsManager = require('./user-details-manager');

class DetailsCollector {
    /**
     * Ask a question on readline interface
     */
    async _ask(query, rl = null) {
        if (rl) {
            try {
                const res = rl.question(query);
                if (res && typeof res.then === 'function') {
                    return (await res);
                }
                return await new Promise(resolve => rl.question(query, resolve));
            } catch (_) {
                return '';
            }
        }

        const localRl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            localRl.question(query, answer => {
                localRl.close();
                resolve(answer);
            });
        });
    }

    /**
     * Analyze if the user's natural language goal already contains:
     * - File path (.xlsx, .xls, .docx, .doc, .csv, .txt)
     * - Phone numbers
     * - Business name & offering details
     */
    parseGoalParameters(goalText) {
        if (!goalText) return {};

        const result = {
            hasFilePath: false,
            filePath: null,
            hasNumbers: false,
            numbers: null,
            hasClearContent: false,
            messageText: null
        };

        // 1. Detect file path with extensions: .xlsx, .xls, .docx, .doc, .csv, .txt
        let candidatePath = null;
        const absMatch = goalText.match(/[a-zA-Z]:[\\/][^\r\n"':;]+?\.(?:xlsx|xls|docx|doc|csv|txt)\b/i);
        if (absMatch) {
            candidatePath = absMatch[0].trim().replace(/^["']|["']$/g, '');
        } else {
            const quotedMatch = goalText.match(/["']([^"'\r\n]+?\.(?:xlsx|xls|docx|doc|csv|txt))["']/i);
            if (quotedMatch) {
                candidatePath = quotedMatch[1].trim();
            } else {
                const wordMatch = goalText.match(/\b([^\s"'\r\n]+?\.(?:xlsx|xls|docx|doc|csv|txt))\b/i);
                if (wordMatch) {
                    candidatePath = wordMatch[1].trim();
                }
            }
        }

        if (candidatePath) {
            result.candidatePath = candidatePath;
            if (fs.existsSync(candidatePath)) {
                result.hasFilePath = true;
                result.filePath = candidatePath;
            }
        }

        // 2. Detect sequence of mobile numbers (e.g. 919443210987, 9876543210)
        const digitsMatches = goalText.match(/(?:\+?\d{10,13})/g);
        if (digitsMatches && !result.hasFilePath) {
            const extracted = digitsMatches.map(s => s.trim()).filter(s => s.replace(/\D/g, '').length >= 10);
            if (extracted.length > 0) {
                result.hasNumbers = true;
                result.numbers = extracted.join(', ');
            }
        }

        // 3. Detect if user already specified full explicit message in quotes
        const quotedMsg = goalText.match(/(?:message|msg|text|saying)\s*["':]\s*([^"'\n]+)["']/i);
        if (quotedMsg && quotedMsg[1].length > 15) {
            result.hasClearContent = true;
            result.messageText = quotedMsg[1].trim();
        }

        return result;
    }

    /**
     * Collect full campaign setup details interactively
     */
    async collectMissingDetails(goalText = '', rl = null) {
        const parsed = this.parseGoalParameters(goalText);

        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║           CODEZ48 PILOT — WHATSAPP CAMPAIGN DETAILS ASSISTANT                 ║`);
        console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
        console.log(`║ Setup your contacts source and business profile for automated WhatsApp sending║`);
        console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        let filePath = parsed.filePath;
        let recipientsInput = parsed.numbers;

        // STEP 1: Recipients / File resolution
        if (!filePath && !recipientsInput) {
            console.log(`\x1b[33m[STEP 1/2: AUTOMATION MODE & RECIPIENT SOURCE]\x1b[0m`);
            console.log(`  \x1b[32m[1]\x1b[0m Autonomous WhatsApp Screen Monitor & Replier (DEFAULT — Automatically checks screen for incoming messages from any user/number & generates AI replies)`);
            console.log(`  \x1b[32m[2]\x1b[0m Outbound Campaign: Load recipients from file (Excel .xlsx/.xls, Word .docx, CSV, TXT)`);
            console.log(`  \x1b[32m[3]\x1b[0m Outbound Campaign: Enter mobile numbers manually\n`);

            const modeChoice = (await this._ask(`Select option (1-3) [Default 1]: `, rl)).trim() || '1';

            if (modeChoice === '1' || modeChoice.toLowerCase() === 'default') {
                console.log(`\x1b[32m✔ Selected Autonomous WhatsApp Screen Monitor & Auto-Replier mode (zero phone numbers required).\x1b[0m`);
                return {
                    mode: 'MONITOR',
                    continuous: true,
                    defaultMode: true
                };
            } else if (modeChoice === '3') {
                console.log(`\nEnter recipient mobile numbers (separated by commas):`);
                recipientsInput = (await this._ask(`Mobile Numbers: `, rl)).trim();
            } else {
                console.log(`\nPlease provide the full file location including filename and extension:`);
                console.log(`\x1b[90m(Examples: C:\\Users\\...\\contacts.xlsx  OR  C:\\Users\\...\\recipients.docx)\x1b[0m`);
                let enteredPath = (await this._ask(`File Path: `, rl)).trim().replace(/^["']|["']$/g, '');

                while (enteredPath && !fs.existsSync(enteredPath)) {
                    console.log(`\x1b[31m[ERROR] File not found at: "${enteredPath}". Please verify path and extension.\x1b[0m`);
                    enteredPath = (await this._ask(`Re-enter File Path (or press Enter to enter numbers manually): `, rl)).trim().replace(/^["']|["']$/g, '');
                    if (!enteredPath) break;
                }

                if (enteredPath && fs.existsSync(enteredPath)) {
                    filePath = enteredPath;
                    console.log(`\x1b[32m✔ File verified: ${filePath}\x1b[0m`);
                } else {
                    console.log(`\nEnter recipient mobile numbers (separated by commas):`);
                    recipientsInput = (await this._ask(`Mobile Numbers: `, rl)).trim();
                }
            }
        } else if (filePath) {
            console.log(`\x1b[32m✔ Auto-detected contact file from request:\x1b[0m ${filePath}`);
        } else if (recipientsInput) {
            console.log(`\x1b[32m✔ Auto-detected recipient numbers from request:\x1b[0m ${recipientsInput}`);
        }

        // STEP 2: Business Profile & Content Selection
        let contentMode = 'AI';
        let messageText = parsed.messageText;

        if (parsed.hasClearContent && messageText) {
            console.log(`\n\x1b[32m✔ Custom message content detected in request:\x1b[0m "${messageText}"`);
            contentMode = 'MANUAL';
        }

        console.log(`\n\x1b[33m[STEP 2/2: USER BUSINESS DETAILS & OPERATIONS PROFILE]\x1b[0m`);
        const businessDetails = await userDetailsManager.selectOrCollectProfile(goalText, rl);

        return {
            filePath,
            recipientsInput,
            contentMode,
            messageText,
            businessDetails
        };
    }
}

module.exports = new DetailsCollector();
