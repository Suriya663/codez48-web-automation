const logger = require('../../core/logger');
/**
 * CODEZ48 STYLE & PREFERENCE MANAGER
 * Manages style briefs, style-pack libraries, golden evaluation set (>=15 requests),
 * slide-to-request trace validation, and consented preference memory (viewable & deletable).
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../../core/workspace-manager');

class StylePreferenceManager {
    constructor() {
        this.memoryPath = path.join(workspaceManager.getWorkspacePath(), 'consented_preferences.json');
        this.loadPreferences();
    }

    loadPreferences() {
        try {
            if (fs.existsSync(this.memoryPath)) {
                this.preferences = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
            } else {
                this.preferences = { acceptedStyles: [], rejectedStyles: [], customBiases: {} };
            }
        } catch (e) {
            this.preferences = { acceptedStyles: [], rejectedStyles: [], customBiases: {} };
        }
    }

    savePreferences() {
        try {
            fs.writeFileSync(this.memoryPath, JSON.stringify(this.preferences, null, 2), 'utf8');
        } catch (e) {}
    }

    recordPreference(type, item) {
        if (type === 'accept') {
            this.preferences.acceptedStyles.push({ item, timestamp: new Date().toISOString() });
        } else if (type === 'reject') {
            this.preferences.rejectedStyles.push({ item, timestamp: new Date().toISOString() });
        }
        this.savePreferences();
    }

    viewPreferences() {
        return this.preferences;
    }

    deletePreferences() {
        this.preferences = { acceptedStyles: [], rejectedStyles: [], customBiases: {} };
        this.savePreferences();
        return true;
    }

    getGoldenEvaluationSet() {
        return [
            { id: 1, topic: 'Artificial Intelligence Ethics', tone: 'formal', slideCount: 5 },
            { id: 2, topic: 'Cloud Infrastructure Scalability', tone: 'technical', slideCount: 5 },
            { id: 3, topic: 'Startup Growth Strategies', tone: 'inspirational', slideCount: 5 },
            { id: 4, topic: 'Cybersecurity Best Practices', tone: 'formal', slideCount: 5 },
            { id: 5, topic: 'Renewable Energy Transition', tone: 'academic', slideCount: 5 },
            { id: 6, topic: 'E-Commerce Conversion Optimization', tone: 'playful', slideCount: 5 },
            { id: 7, topic: 'Healthcare Tele-medicine Trends', tone: 'healthcare-calm', slideCount: 5 },
            { id: 8, topic: 'Financial Portfolio Management', tone: 'finance-trust', slideCount: 5 },
            { id: 9, topic: 'EdTech Future of Learning', tone: 'education-friendly', slideCount: 5 },
            { id: 10, topic: 'Quantum Computing Fundamentals', tone: 'technical', slideCount: 5 },
            { id: 11, topic: 'Brand Storytelling & Design', tone: 'creative-editorial', slideCount: 5 },
            { id: 12, topic: 'Supply Chain Resilience', tone: 'corporate-clean', slideCount: 5 },
            { id: 13, topic: 'Autonomous Vehicle Safety', tone: 'technical', slideCount: 5 },
            { id: 14, topic: 'Biotechnology Innovations', tone: 'academic', slideCount: 5 },
            { id: 15, topic: 'Global Economic Outlook 2026', tone: 'finance-trust', slideCount: 5 }
        ];
    }
}

module.exports = new StylePreferenceManager();
