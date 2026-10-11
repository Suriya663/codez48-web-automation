/**
 * Long-Running Task State Machine
 * Preserves task state across multi-step mixed-environment workflows.
 */
class TaskStateMachine {
    constructor(objective) {
        this.state = {
            objective,
            currentEnvironment: 'DESKTOP',
            currentApplication: 'File Explorer',
            currentBrowser: null,
            currentTab: 0,
            currentWindow: null,
            completedSteps: [],
            currentStep: 1,
            pendingSteps: [],
            expectedState: '',
            actualState: '',
            recoveryAttempts: 0,
            userInputRequests: [],
            connectionState: 'HEALTHY'
        };
    }

    transition(stepDescription, environment, application) {
        this.state.completedSteps.push({ step: this.state.currentStep, description: stepDescription, timestamp: Date.now() });
        this.state.currentStep++;
        this.state.currentEnvironment = environment || this.state.currentEnvironment;
        this.state.currentApplication = application || this.state.currentApplication;
    }

    getState() {
        return { ...this.state };
    }
}

module.exports = TaskStateMachine;
