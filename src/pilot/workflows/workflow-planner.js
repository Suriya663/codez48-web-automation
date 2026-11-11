const logger = require('../../core/logger');
/**
 * CODEZ48 WORKFLOW PLANNER (STAGE 9)
 * Converts natural-language user desktop goals into structured, executable multi-step task plans.
 */

class WorkflowPlanner {
    createPlan(goal) {
        if (!goal) throw new Error('Goal is required for workflow planning.');
        const lower = goal.toLowerCase().trim();

        let appIntent = 'browser';
        if (lower.includes('notepad') || lower.includes('text editor')) appIntent = 'word-processor';
        else if (lower.includes('calculator')) appIntent = 'calculator';
        else if (lower.includes('powerpoint') || lower.includes('presentation')) appIntent = 'presentation';
        else if (lower.includes('code') || lower.includes('vs code')) appIntent = 'code-editor';

        const isCreate = lower.includes('create') || lower.includes('new') || lower.includes('type');
        const isEdit = lower.includes('edit') || lower.includes('update');
        const isSave = lower.includes('save') || lower.includes('export');

        const steps = [
            { id: 'step-1', action: 'DISCOVER_APPLICATION', applicationIntent: appIntent },
            { id: 'step-2', action: 'RESOLVE_APPLICATION', applicationIntent: appIntent },
            { id: 'step-3', action: 'LAUNCH_APPLICATION', applicationIntent: appIntent },
            { id: 'step-4', action: 'WAIT_FOR_READY', timeoutMs: 5000 },
            { id: 'step-5', action: 'OBSERVE' }
        ];

        if (lower.includes('type') || lower.includes('hello')) {
            const textMatch = goal.match(/type\s+["']?([^"']+)["']?/i);
            const textToType = textMatch ? textMatch[1] : 'Hello World';
            steps.push(
                { id: 'step-6', action: 'FIND_TARGET', target: { text: 'Document' } },
                { id: 'step-7', action: 'CLICK', target: { text: 'Document' } },
                { id: 'step-8', action: 'TYPE', text: textToType }
            );
        } else if (lower.includes('calculate')) {
            steps.push(
                { id: 'step-6', action: 'FIND_TARGET', target: { text: '2' } },
                { id: 'step-7', action: 'CLICK', target: { text: '2' } }
            );
        }

        if (isSave || lower.includes('save')) {
            steps.push(
                { id: 'step-9', action: 'HOTKEY', keys: ['CTRL', 'S'] },
                { id: 'step-10', action: 'HANDLE_DIALOG', title: 'Save As' }
            );
        }

        steps.push({ id: 'step-final', action: 'VERIFY_OUTPUT', expected: { type: 'TEXT_VISIBLE', text: 'Success' } });

        return {
            workflowId: `WF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            goal,
            applicationIntent: appIntent,
            mode: isCreate ? 'CREATE' : (isEdit ? 'EDIT' : 'EXECUTE'),
            steps,
            createdAt: new Date().toISOString()
        };
    }
}

module.exports = new WorkflowPlanner();
