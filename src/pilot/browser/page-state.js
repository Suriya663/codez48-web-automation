const logger = require('../../core/logger');
/**
 * CODEZ48 BROWSER PAGE STATE
 * Rich, dynamic, structured representation of live rendered webpage state.
 * Assigns temporary element IDs (E1, E2, E3...) for precise AI action contracts.
 */

class PageState {
    constructor(url = '', title = '') {
        this.url = url;
        this.title = title;
        this.html = '';
        this.scrollPosition = { x: 0, y: 0 };
        this.activeElement = null;
        this.headings = [];
        this.visibleText = [];
        this.elements = []; // Array of { id: 'E1', role: 'button', name: 'Register', type: 'input', label: 'Email', selector: '...', coords: [x,y], visible: true, enabled: true }
        this.forms = [];
        this.timestamp = new Date().toISOString();
    }

    addElement(elementObj) {
        const tempId = `E${this.elements.length + 1}`;
        const vpX = elementObj.viewportX !== undefined ? elementObj.viewportX : (elementObj.coords ? elementObj.coords[0] : undefined);
        const vpY = elementObj.viewportY !== undefined ? elementObj.viewportY : (elementObj.coords ? elementObj.coords[1] : undefined);
        const record = {
            id: tempId,
            role: elementObj.role || 'interactive',
            name: elementObj.name || elementObj.text || elementObj.label || 'Element',
            type: elementObj.type || 'control',
            purpose: elementObj.purpose || 'general',
            selector: elementObj.selector || '',
            viewportX: vpX,
            viewportY: vpY,
            coords: [vpX !== undefined ? vpX : 500, vpY !== undefined ? vpY : 300],
            visible: elementObj.visible !== false,
            enabled: elementObj.enabled !== false
        };
        this.elements.push(record);
        return record;
    }

    getElementById(elementId) {
        if (!elementId) return null;
        return this.elements.find(e => e.id.toUpperCase() === elementId.toUpperCase()) || null;
    }

    toAiContext(userGoal = '') {
        const goalLower = (userGoal || '').toLowerCase();

        // 1. Deduplicate visible text
        const uniqueParagraphs = Array.from(new Set(this.visibleText || []));

        // 2. Select relevant headings & paragraphs based on user goal
        let relevantText = uniqueParagraphs;
        if (goalLower.length > 0) {
            const matches = uniqueParagraphs.filter(p => p.toLowerCase().split(/\s+/).some(w => w.length > 3 && goalLower.includes(w)));
            if (matches.length > 0) {
                relevantText = matches;
            }
        }

        // 3. Map active elements with roles, names, purposes, and bounds
        const activeElements = (this.elements || []).map(e => ({
            id: e.id,
            role: e.role,
            name: e.name,
            type: e.type,
            purpose: e.purpose,
            coords: e.coords,
            visible: e.visible,
            enabled: e.enabled
        }));

        return {
            url: this.url,
            title: this.title,
            scrollPosition: this.scrollPosition,
            activeElement: this.activeElement,
            headings: (this.headings || []).slice(0, 15).map(h => `${h.level}: ${h.text}`),
            relevantContent: relevantText.slice(0, 8).join(' \n '),
            interactiveElements: activeElements.slice(0, 25),
            htmlExcerpt: (this.html || '').substring(0, 2500),
            viewportState: {
                scrollX: this.scrollPosition?.x || 0,
                scrollY: this.scrollPosition?.y || 0,
                scrollable: true
            }
        };
    }
}

module.exports = PageState;
