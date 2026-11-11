const logger = require('../../core/logger');
/**
 * CODEZ48 APPLICATION ADAPTER REGISTRY (STAGE 7 & 8 & 9)
 * Manages application adapters and enforces the DISCOVERED != SUPPORTED != TESTED security boundary.
 */

class ApplicationAdapterRegistry {
    constructor() {
        this.adapters = new Map();

        // Register default minimal adapters with strict supported/tested flags
        this.register({
            applicationId: 'app-blender',
            applicationName: 'Blender',
            categories: ['3d'],
            capabilities: ['3d-modeling', 'viewport', 'rendering'],
            supported: true,
            tested: false, // Discovered & supported, but not yet tested for automated modeling
            adapter: {
                canHandle: (cat) => cat === '3d',
                getCapabilities: () => ['3d-modeling', 'viewport'],
                launch: () => ({ success: true, mode: 'launch' }),
                isRunning: () => false,
                isReady: () => false
            }
        });

        this.register({
            applicationId: 'app-vscode',
            applicationName: 'Visual Studio Code',
            categories: ['code-editor', 'development'],
            capabilities: ['text-editing', 'syntax-highlighting'],
            supported: true,
            tested: true, // Discovered, supported, and tested
            adapter: {
                canHandle: (cat) => cat === 'code-editor',
                getCapabilities: () => ['text-editing'],
                launch: () => ({ success: true, mode: 'launch' }),
                isRunning: () => true,
                isReady: () => true
            }
        });

        this.register({
            applicationId: 'app-powerpoint',
            applicationName: 'Microsoft PowerPoint',
            categories: ['presentation'],
            capabilities: ['slides', 'editing'],
            supported: true,
            tested: true,
            adapter: {
                canHandle: (cat) => cat === 'presentation',
                getCapabilities: () => ['slides'],
                launch: () => ({ success: true, mode: 'launch' }),
                isRunning: () => false,
                isReady: () => true
            }
        });

        this.register({
            applicationId: 'app-notepad',
            applicationName: 'Notepad',
            categories: ['word-processor', 'system', 'text-editor'],
            capabilities: ['text-editing'],
            supported: true,
            tested: true,
            adapter: {
                canHandle: (cat) => cat === 'word-processor' || cat === 'system' || cat === 'text-editor',
                getCapabilities: () => ['text-editing'],
                launch: () => ({ success: true, mode: 'launch' }),
                isRunning: () => true,
                isReady: () => true
            }
        });
    }

    register(registration) {
        this.adapters.set(registration.applicationId, registration);
    }

    getAdapter(applicationId) {
        return this.adapters.get(applicationId) || null;
    }

    findMatchingAdapter(category, requiredCapabilities = []) {
        for (const [id, reg] of this.adapters.entries()) {
            if (reg.categories.includes(category) && reg.supported && reg.tested) {
                const hasAllCaps = requiredCapabilities.every(cap => reg.capabilities.includes(cap));
                if (hasAllCaps || requiredCapabilities.length === 0) {
                    return reg;
                }
            }
        }
        return null;
    }
}

module.exports = new ApplicationAdapterRegistry();
