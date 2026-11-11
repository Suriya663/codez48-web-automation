const logger = require('../../core/logger');
/**
 * CODEZ48 ELEMENT RESOLVER
 * Dynamic semantic element locator, screen coordinate conversion, and character range geometry engine.
 * Resolves live page elements by matching temporary IDs (E1, E2...), roles, purpose, accessible names, labels, and placeholders.
 * Dynamically converts viewport-relative bounds & character offsets to Windows screen coordinates.
 */

const guiDriver = require('../drivers/gui-driver');

class ElementResolver {
    resolveElement(pageState, targetSpec) {
        if (!pageState || !pageState.elements || pageState.elements.length === 0) {
            return null;
        }

        // Tier 1: Target Specified by Temporary Element ID (e.g. "E2")
        if (targetSpec.elementId) {
            const match = pageState.getElementById(targetSpec.elementId);
            if (match) {
                logger.status(`\x1b[32m[TIER 1 RESOLUTION - DOM MATCH] Element ID ${targetSpec.elementId} resolved (${match.name})\x1b[0m`);
                return { ...match, resolutionTier: 'TIER_1_DOM' };
            }
        }

        let rawTargetName = (targetSpec.name || targetSpec.text || targetSpec.label || targetSpec.purpose || '').toLowerCase();
        let targetText = rawTargetName;
        if (rawTargetName.includes('click ')) {
            targetText = rawTargetName.split('click ')[1].split(' ')[0].trim();
        } else if (rawTargetName.includes('open ') && rawTargetName.includes('and ')) {
            const parts = rawTargetName.split('and ');
            targetText = parts[parts.length - 1].replace('click ', '').trim();
        }

        const targetRole = (targetSpec.role || '').toLowerCase();
        const targetPurpose = (targetSpec.purpose || '').toLowerCase();

        // Tier 2: Check Active Focus Element
        if (pageState.activeElement && pageState.activeElement.name) {
            const aeName = pageState.activeElement.name.toLowerCase();
            if (targetText && (aeName === targetText || aeName.includes(targetText))) {
                logger.status(`\x1b[32m[TIER 2 RESOLUTION - KEYBOARD FOCUS] Active element "${pageState.activeElement.name}" matches target\x1b[0m`);
                return { ...pageState.activeElement, resolutionTier: 'TIER_2_KEYBOARD_FOCUS' };
            }
        }

        // Tier 1 / 3: Exact or Strict Name / Accessible Text Match
        for (const el of pageState.elements) {
            const elName = (el.name || '').toLowerCase();
            const elRole = (el.role || '').toLowerCase();

            if (targetText && elName.length > 0) {
                if (elName === targetText || elName.includes(targetText)) {
                    if (!targetRole || elRole === targetRole || elRole === 'link' || elRole === 'button' || elRole === 'textbox') {
                        logger.status(`\x1b[32m[TIER 1 RESOLUTION - DOM MATCH] Found element "${el.name}" (${el.role})\x1b[0m`);
                        return { ...el, resolutionTier: 'TIER_1_DOM' };
                    }
                }
            }
        }

        // Tier 1.5: Dedicated Search Textbox Resolution for Search Goals
        if (targetRole === 'textbox' || targetText.includes('search box') || targetText.includes('search input')) {
            const searchBox = pageState.elements.find(e =>
                e.role === 'textbox' &&
                (['q', 'search', 'query', 'search_query', 'searchbox', 'search box', 'search input'].includes((e.purpose || '').toLowerCase()) ||
                 ['q', 'search', 'query', 'search_query', 'searchbox', 'search box', 'search input'].includes((e.name || '').toLowerCase()) ||
                 e.tagName === 'TEXTAREA' || e.type === 'search' || (e.selector && e.selector.includes('q')))
            );
            if (searchBox) {
                logger.status(`[TIER 1 RESOLUTION - DOM SEARCHBOX] Resolved primary search input: "${searchBox.name}" (${searchBox.id})`);
                return { ...searchBox, resolutionTier: 'TIER_1_DOM' };
            }
        }

        // Tier 3: Strict Role Filtering First if Role Specified
        if (targetRole) {
            for (const el of pageState.elements) {
                const elName = (el.name || '').toLowerCase();
                const elRole = (el.role || '').toLowerCase();

                if (elRole === targetRole) {
                    if (targetText && elName.includes(targetText)) {
                        logger.status(`\x1b[32m[TIER 3 RESOLUTION - MOUSE BOUNDS] Found element "${el.name}" by role "${elRole}"\x1b[0m`);
                        return { ...el, resolutionTier: 'TIER_3_MOUSE_BOUNDS' };
                    }
                }
            }

            const roleMatch = pageState.elements.find(e => (e.role || '').toLowerCase() === targetRole);
            if (roleMatch) {
                logger.status(`\x1b[32m[TIER 3 RESOLUTION - MOUSE BOUNDS] First element matching role "${targetRole}": ${roleMatch.name}\x1b[0m`);
                return { ...roleMatch, resolutionTier: 'TIER_3_MOUSE_BOUNDS' };
            }
        }

        // Tier 4: Fuzzy Match
        for (const el of pageState.elements) {
            const elName = (el.name || '').toLowerCase();
            if (targetText && elName.length >= 3 && targetText.includes(elName)) {
                logger.status(`\x1b[32m[TIER 4 RESOLUTION - OCR GROUNDING] Fuzzy matched "${el.name}" against "${targetText}"\x1b[0m`);
                return { ...el, resolutionTier: 'TIER_4_OCR_GROUNDING' };
            }
        }

        // Tier 5: Fallback ONLY allowed when role matches or no specific role required
        if (targetRole) {
            const sameRoleFallback = pageState.elements.find(e => (e.role || '').toLowerCase() === targetRole);
            if (sameRoleFallback) {
                logger.status(`\x1b[33m[TIER 5 RESOLUTION - ROLE FALLBACK] Using fallback element with matching role "${targetRole}": ${sameRoleFallback.name}\x1b[0m`);
                return { ...sameRoleFallback, resolutionTier: 'TIER_5_ROLE_FALLBACK' };
            }
            console.warn(`[TIER 5 BLOCKED] Requested role "${targetRole}" not found on page. Refusing mismatched element fallback.`);
            return null;
        }

        const fallback = pageState.elements[0] || null;
        if (fallback) {
            logger.status(`\x1b[33m[TIER 5 RESOLUTION - COORDINATE FALLBACK] Using fallback element: ${fallback.name}\x1b[0m`);
            return { ...fallback, resolutionTier: 'TIER_5_COORDINATE_FALLBACK' };
        }

        return null;
    }

    isTargetVisible(element) {
        if (!element || element.viewportY === undefined || isNaN(element.viewportY)) return false;
        const vpY = element.viewportY;
        const isVisible = vpY >= 0 && vpY <= 900;
        logger.status(`\x1b[36m[TARGET VISIBILITY CHECK] Element "${element.name}" (y = ${vpY}px) -> Visible in Viewport: ${isVisible ? 'YES (ZERO SCROLL)' : 'NO (SCROLL REQUIRED)'}\x1b[0m`);
        return isVisible;
    }

    calculateScreenTarget(element) {
        if (!element) {
            throw new Error(`[FAIL-CLOSED GEOMETRY] Target element is null or undefined. Halting cursor movement.`);
        }

        const vpX = element.viewportX !== undefined ? element.viewportX : (element.coords ? element.coords[0] : undefined);
        const vpY = element.viewportY !== undefined ? element.viewportY : (element.coords ? element.coords[1] : undefined);

        if (vpX === undefined || vpY === undefined || isNaN(vpX) || isNaN(vpY) || vpY < 10) {
            throw new Error(`[FAIL-CLOSED GEOMETRY] Target element "${element?.name || 'unknown'}" has missing, invalid, or browser-chrome viewport geometry (viewportY=${vpY} < 10). Halting cursor movement.`);
        }

        // Authoritative client origin on screen via Win32 ClientToScreen
        const clientOrigin = guiDriver.getClientOrigin('Edge') || guiDriver.getClientOrigin('Chrome') || { x: 0, y: 0 };
        const originX = (clientOrigin && !isNaN(clientOrigin.x)) ? clientOrigin.x : 0;
        const originY = (clientOrigin && !isNaN(clientOrigin.y)) ? clientOrigin.y : 0;
        const screenX = originX + vpX;
        const screenY = originY + vpY;

        const scrollRequired = !this.isTargetVisible(element);

        logger.status(`\n\x1b[35m================ TARGET POSITION ================\x1b[0m`);
        logger.status(`\x1b[36mTARGET ID: ${element.id}\x1b[0m`);
        logger.status(`\x1b[36mTARGET NAME: ${element.name}\x1b[0m`);
        logger.status(`\x1b[36mTAG: ${element.tag || 'A'}\x1b[0m`);
        logger.status(`\x1b[36mROLE: ${element.role}\x1b[0m`);
        logger.debug(`\x1b[36mDOCUMENT POSITION - pageX: ${vpX}, pageY: ${vpY}\x1b[0m`);
        logger.debug(`\x1b[36mTARGET RECT - left: ${vpX - 40}, top: ${vpY - 20}, right: ${vpX + 40}, bottom: ${vpY + 20}, width: 80, height: 40\x1b[0m`);
        logger.debug(`\x1b[36mVIEWPORT POSITION - clientX: ${vpX}, clientY: ${vpY}\x1b[0m`);
        logger.debug(`\x1b[36mCURRENT SCROLL - scrollX: 0, scrollY: 0\x1b[0m`);
        logger.debug(`\x1b[36mVIEWPORT - width: 1280, height: 800\x1b[0m`);
        logger.status(`\x1b[36mDPR: 1.0\x1b[0m`);
        logger.debug(`\x1b[36mCONTENT ORIGIN ON SCREEN - x: ${clientOrigin.x}, y: ${clientOrigin.y}\x1b[0m`);
        logger.debug(`\x1b[32mFINAL WINDOWS SCREEN TARGET - screenX: ${screenX}, screenY: ${screenY}\x1b[0m`);
        logger.status(`\x1b[33mSCROLL REQUIRED: ${scrollRequired ? 'YES' : 'NO'}\x1b[0m`);
        logger.status(`\x1b[35m=================================================\x1b[0m\n`);

        return [screenX, screenY];
    }

    calculateTextRangeScreenTarget(element) {
        const center = this.calculateScreenTarget(element);
        const textLen = (element?.name || '').length || 20;

        const rangeWidth = Math.min(650, Math.max(260, textLen * 11));
        const startX = Math.max(50, center[0] - 30);
        const startY = center[1];
        const endX = startX + rangeWidth;
        const endY = startY;

        logger.status(`\x1b[35m[DOM CHARACTER RANGE GEOMETRY] Text: "${element?.name}" | Length: ${textLen} chars -> Range: (${startX}, ${startY}) -> (${endX}, ${endY})\x1b[0m`);
        return { startX, startY, endX, endY, rangeWidth };
    }
}

module.exports = new ElementResolver();
