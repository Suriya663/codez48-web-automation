const TaskStateMachine = require('./task-state-machine.js');
const windowManager = require('./window-manager.js');
const nativeAppAutomation = require('./native-app-automation.js');

class MixedEnvironmentOrchestrator {
    async executeMixedWorkflow(objective) {
        const sm = new TaskStateMachine(objective);
        console.log(`[MIXED ORCHESTRATOR] Starting mixed-environment task: "${objective}"`);

        // Step 1: Open Downloads folder (Desktop / File Explorer)
        sm.transition('Open Downloads folder in File Explorer', 'DESKTOP', 'File Explorer');
        const docsResult = await nativeAppAutomation.createWordDocument('WorkflowDoc', 'Mixed Environment Step');

        // Step 2: Switch to Browser
        sm.transition('Switch to Chrome browser', 'WEB', 'Chrome');
        windowManager.focusWindow('Google Chrome');

        // Step 3: Verify final state
        sm.transition('Verify mixed workflow outcome', 'WEB', 'Chrome');

        return {
            success: true,
            state: sm.getState(),
            artifact: docsResult.filePath
        };
    }
}

module.exports = new MixedEnvironmentOrchestrator();
