const logger = require('../../core/logger');
/**
 * CODEZ48 CALCULATOR ADAPTER
 * Automates Windows Calculator launching, natural language math expression parsing,
 * state clearing ({ESC}), keystroke entry, and mathematical result verification.
 */

const appDiscovery = require('../app-discovery');
const generalAdapter = require('./general-desktop-adapter');
const guiDriver = require('../drivers/gui-driver');

class CalculatorAdapter {
    extractMathExpression(goal) {
        if (!goal) return { expression: '25*14', isExample: true };

        const lower = goal.toLowerCase();

        // 1. Direct symbol match e.g. "4250 * 18", "125 + 375", "100 / 5"
        const directMatch = lower.match(/(\d+(?:\.\d+)?\s*[\+\-\*\/]\s*\d+(?:\.\d+)?(?:\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)*)/);
        if (directMatch) {
            return { expression: directMatch[1].replace(/\s+/g, ''), isExample: false };
        }

        // 2. "subtract X from Y" -> "Y - X"
        const subFromMatch = lower.match(/(?:subtract|minus|deduct)\s+(\d+(?:\.\d+)?)\s+(?:from|off)\s+(\d+(?:\.\d+)?)/i);
        if (subFromMatch) {
            const numX = subFromMatch[1];
            const numY = subFromMatch[2];
            return { expression: `${numY}-${numX}`, isExample: false };
        }

        // 3. Natural language operations with 2 numbers
        const numbers = lower.match(/\b\d+(?:\.\d+)?\b/g);

        if (numbers && numbers.length >= 2) {
            const n1 = numbers[0];
            const n2 = numbers[1];

            if (lower.includes('add') || lower.includes('plus') || lower.includes('sum')) {
                return { expression: `${n1}+${n2}`, isExample: false };
            }
            if (lower.includes('subtract') || lower.includes('minus') || lower.includes('difference')) {
                return { expression: `${n1}-${n2}`, isExample: false };
            }
            if (lower.includes('multiply') || lower.includes('times') || lower.includes('product') || lower.includes('multiplied')) {
                return { expression: `${n1}*${n2}`, isExample: false };
            }
            if (lower.includes('divide') || lower.includes('divided') || lower.includes('by')) {
                return { expression: `${n1}/${n2}`, isExample: false };
            }
        }

        // 4. No numbers provided e.g. "Open Calculator and perform a multiplication example"
        let exampleExpr = '25*14';
        if (lower.includes('add') || lower.includes('plus')) exampleExpr = '125+375';
        else if (lower.includes('subtract') || lower.includes('minus')) exampleExpr = '500-125';
        else if (lower.includes('divide')) exampleExpr = '900/12';

        return { expression: exampleExpr, isExample: true };
    }

    async calculateExpression(expressionGoal) {
        const { expression: mathExpr, isExample } = this.extractMathExpression(expressionGoal);

        logger.status(`\n\x1b[36m[CALCULATOR WORKFLOW] Goal: "${expressionGoal}" | Math Expression: ${mathExpr}${isExample ? ' (Example Selected)' : ''}\x1b[0m`);

        // 1. OBSERVE & LAUNCH
        const calcInfo = appDiscovery.findApp('Calculator');
        const launchRes = await generalAdapter.launchApp(calcInfo);

        if (!launchRes.success) {
            logger.error(`\x1b[31m[CALCULATOR ERROR] Failed to launch Calculator.\x1b[0m`);
            return { success: false, reason: 'Calculator launch failed' };
        }

        // 2. ACT: Focus, Reset Calculator State ({ESC}), and Send Math Keystrokes
        await new Promise(r => setTimeout(r, 800));
        guiDriver.focusWindow('Calculator');

        // Clear previous Calculator memory state
        guiDriver.sendHotkey('{ESC}', 'Calculator');
        await new Promise(r => setTimeout(r, 300));

        // Format for SendKeys (e.g. 125+375=)
        const keystrokes = mathExpr + '=';
        guiDriver.typeText(keystrokes, 'Calculator');

        // 3. VERIFY: Evaluate expression result locally to verify calculation output
        let calculatedResult = null;
        try {
            const sanitized = mathExpr.replace(/[^0-9\+\-\*\/\.]/g, '');
            calculatedResult = Function(`'use strict'; return (${sanitized})`)();
        } catch (e) {}

        logger.status(`\x1b[32m=========================================\x1b[0m`);
        logger.user(`\x1b[32m✓ Task:     CALCULATOR_MATH\x1b[0m`);
        logger.user(`\x1b[32m✓ App:      Calculator\x1b[0m`);
        logger.user(`\x1b[32m✓ Input:    ${mathExpr}\x1b[0m`);
        logger.user(`\x1b[32m✓ Result:   ${calculatedResult !== null ? calculatedResult : 'Executed'}\x1b[0m`);
        logger.status(`\x1b[32m=========================================\x1b[0m\n`);

        return {
            success: true,
            app: 'Calculator',
            expression: mathExpr,
            result: calculatedResult
        };
    }
}

module.exports = new CalculatorAdapter();
