const taskParser = require('./task-parser.js');
const environmentRouter = require('./environment-router.js');

class ActionPlanner {
    createPlan(taskGoal) {
        // Parse the initial intent and classify environment
        const classification = environmentRouter.classifyIntent(taskGoal);
        const parsed = taskParser.parseGoal(taskGoal);

        // Convert to dynamic step sequence
        const steps = [];

        if (classification.environment === 'WINDOWS_FILESYSTEM') {
            steps.push({ action: 'RESOLVE_DESKTOP', description: 'Locate target filesystem path' });
            if (taskGoal.toLowerCase().includes('folder')) {
                steps.push({ action: 'CREATE_FOLDER', description: 'Create directory' });
            }
            if (taskGoal.toLowerCase().includes('text file') || taskGoal.toLowerCase().includes('file')) {
                steps.push({ action: 'CREATE_FILE', description: 'Create file inside directory' });
            }
        } else if (classification.environment === 'NATIVE_APPLICATION') {
            steps.push({ action: 'LAUNCH_APP', description: 'Launch native application' });
            steps.push({ action: 'VERIFY_FOREGROUND', description: 'Ensure application is foreground' });
            if (taskGoal.toLowerCase().includes('type') || taskGoal.toLowerCase().includes('enter')) {
                steps.push({ action: 'PHYSICAL_TYPE', description: 'Type text into active application' });
            }
        } else {
            // Browser or Mixed
            steps.push({ action: 'OPEN_BROWSER', description: 'Launch browser context' });
            steps.push({ action: 'NAVIGATE', url: parsed.url, description: `Navigate to ${parsed.url}` });
            steps.push({ action: 'OBSERVE', description: 'Inspect DOM and visual layout' });
            steps.push({ action: 'DISCOVER_TARGETS', description: 'Locate semantic targets for interaction' });
            steps.push({ action: 'ACT', description: 'Perform primary task action' });
        }

        steps.push({ action: 'VERIFY_FINAL_STATE', description: 'Independently verify final expected outcome' });

        return {
            originalGoal: taskGoal,
            environment: classification.environment,
            steps
        };
    }
}

module.exports = new ActionPlanner();
