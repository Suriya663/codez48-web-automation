const logger = require('../../core/logger');
/**
 * CODEZ48 3D INTENT UNDERSTANDING ENGINE
 * Extracts structured 3D scene specifications from natural language user requests.
 */

class ThreeDIntent {
    extractIntent(goal) {
        if (!goal) return { is3D: false };

        const lower = goal.toLowerCase().trim();

        const keywords3D = ['3d', 'blender', 'mesh', 'model', 'unity', 'unreal', 'low-poly', 'low poly', 'render', 'scene', 'gaming room', 'living room', 'robot', 'car', 'building', 'house', 'bedroom'];
        const is3D = keywords3D.some(k => lower.includes(k));

        if (!is3D) return { is3D: false };

        // 1. Extract preferred app
        let preferredApp = 'blender';
        if (lower.includes('unity')) preferredApp = 'unity';
        else if (lower.includes('unreal')) preferredApp = 'unreal';
        else if (lower.includes('maya')) preferredApp = 'maya';
        else if (lower.includes('3ds max') || lower.includes('3dsmax')) preferredApp = '3dsmax';

        // 2. Extract modeling style
        let style = 'standard';
        if (lower.includes('low-poly') || lower.includes('low poly')) style = 'low-poly';
        else if (lower.includes('realistic') || lower.includes('photorealistic')) style = 'realistic';
        else if (lower.includes('stylized') || lower.includes('cartoon')) style = 'stylized';

        // 3. Extract core subject
        let subject = '3D Model';
        if (lower.includes('robot')) subject = 'futuristic robot';
        else if (lower.includes('living room') || lower.includes('living')) subject = 'modern living room';
        else if (lower.includes('bedroom')) subject = 'futuristic bedroom';
        else if (lower.includes('house') || lower.includes('building')) subject = 'modern house';
        else if (lower.includes('car')) subject = 'detailed sports car';
        else {
            const rawSub = goal.replace(/.*(?:create|build|make|generate|model)\s+(?:a|an)?\s*/i, '')
                              .replace(/(?:in|using|with)\s+(?:blender|3d|unity|unreal|maya|3ds max).*/i, '')
                              .replace(/["']/g, '').trim();
            subject = rawSub.split(/\s+/).slice(0, 3).join(' ') || '3d scene';
        }

        // 4. Extract materials & colors
        const materials = [];
        if (lower.includes('metal') || lower.includes('metallic')) materials.push('metallic');
        if (lower.includes('glass')) materials.push('glass');
        if (lower.includes('wood')) materials.push('wood');
        if (lower.includes('fabric') || lower.includes('sofa')) materials.push('fabric');
        if (lower.includes('emission') || lower.includes('glow')) materials.push('emission');

        const colors = [];
        ['blue', 'red', 'green', 'yellow', 'gold', 'silver', 'white', 'black', 'orange'].forEach(c => {
            if (lower.includes(c)) colors.push(c);
        });

        return {
            is3D: true,
            subject,
            style,
            preferredApp,
            materials,
            colors,
            renderRequired: true,
            originalGoal: goal
        };
    }
}

module.exports = new ThreeDIntent();
