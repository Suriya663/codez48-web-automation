/**
 * Task Parser & Intent Planner Module
 * Converts natural-language instructions into a structured operational plan:
 * GOAL → PRECONDITIONS → STEPS → EXPECTED STATE
 */
class TaskParser {
    parseGoal(goalPrompt) {
        const goal = (goalPrompt || '').trim();
        const lower = goal.toLowerCase();

        let intent = 'NAVIGATE_AND_INTERACT';
        let target = '';
        let url = 'https://codez48.netlify.app/';

        if (lower.includes('search')) {
            intent = 'SEARCH';
        } else if (lower.includes('form') || lower.includes('fill') || lower.includes('type')) {
            intent = 'FILL_FORM';
        } else if (lower.includes('download')) {
            intent = 'DOWNLOAD';
        } else if (lower.includes('notepad') || lower.includes('calculator')) {
            intent = 'NATIVE_APP';
        }

        if (lower.includes('http://') || lower.includes('https://')) {
            const match = goal.match(/(https?:\/\/[^\s]+)/);
            if (match) url = match[1];
        }

        return {
            rawGoal: goal,
            intent,
            target,
            url,
            preconditions: ['Browser context initialized', 'Target environment accessible'],
            steps: [
                { step: 1, action: 'OBSERVE', description: 'Inspect current page and discover interactive elements' },
                { step: 2, action: 'PLAN', description: 'Determine semantic target and interaction layer' },
                { step: 3, action: 'ACT', description: 'Execute action via DOM or Physical Windows layer' },
                { step: 4, action: 'VERIFY', description: 'Perform fail-closed state verification (BEFORE → ACTION → AFTER → VERIFY)' }
            ],
            expectedState: 'Target action verified via state-verifier'
        };
    }
}

module.exports = new TaskParser();
