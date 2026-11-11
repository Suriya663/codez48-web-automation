const logger = require('../../core/logger');
/**
 * CODEZ48 PARALLEL 10-WORKER TARGET DISCOVERY EXPERIMENT
 * Divides the visible viewport into spatial regions and queries the Codez48 AI backend in parallel
 * to identify semantic targets before local motor movement (Hover Only).
 */

class ParallelWorkerDiscovery {
    async discoverTarget(goal, pageState, apiCall) {
        logger.debug(`\x1b[36m[PARALLEL DISCOVERY] Dividing viewport into spatial regions for goal: "${goal}"...\x1b[0m`);

        const elements = pageState.elements || [];
        if (elements.length === 0) {
            console.warn('[PARALLEL DISCOVERY] No elements in pageState to divide.');
            return null;
        }

        // 1. Divide visible viewport into up to 10 spatial regions (80px vertical bands for 800px viewport)
        const totalRegions = 10;
        const viewportHeight = 864;
        const bandHeight = viewportHeight / totalRegions;

        const regions = Array.from({ length: totalRegions }, (_, i) => ({
            id: `R${i + 1}`,
            minY: i * bandHeight,
            maxY: (i + 1) * bandHeight,
            candidates: []
        }));

        elements.forEach(el => {
            const y = el.viewportY !== undefined ? el.viewportY : (el.coords ? el.coords[1] : 300);
            const regionIndex = Math.min(totalRegions - 1, Math.max(0, Math.floor(y / bandHeight)));
            regions[regionIndex].candidates.push(el);
        });

        // Log region candidate counts
        logger.status(`\n[REGIONS SUMMARY]`);
        regions.forEach(r => {
            if (r.candidates.length > 0) {
                logger.status(`Region ${r.id} (y: ${Math.round(r.minY)}-${Math.round(r.maxY)}px): ${r.candidates.length} candidates -> [${r.candidates.map(c => `${c.id}:${c.name}`).join(', ')}]`);
            }
        });
        logger.status(``);

        // 2. Create parallel worker requests for non-empty regions (bounded concurrency up to 5 for rate safety)
        const activeRegions = regions.filter(r => r.candidates.length > 0);
        logger.status(`\x1b[36m[PARALLEL WORKERS] Launching ${activeRegions.length} parallel semantic AI workers...\x1b[0m`);

        const workerPromises = activeRegions.map(async (region) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            try {
                const promptMsg = `Goal: "${goal}"\nRegion: ${region.id}\nCandidates in Region:\n${JSON.stringify(region.candidates.map(c => ({ id: c.id, role: c.role, name: c.name, purpose: c.purpose })), null, 2)}\n\nIMPORTANT: Return a JSON object with: { "found": true/false, "targetId": "E2" or null, "targetName": "CLI" or null, "confidence": 0.0-1.0 }.`;

                const aiData = await apiCall('cli-ai-chat', 'POST', {
                    messages: [{ role: 'user', content: promptMsg }],
                    projectId: null
                }, false, controller.signal);

                clearTimeout(timeoutId);

                if (aiData && aiData.answer) {
                    const match = aiData.answer.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                    if (match && match[1]) {
                        const parsed = JSON.parse(match[1]);
                        return { region: region.id, ...parsed };
                    }
                }
            } catch (e) {
                clearTimeout(timeoutId);
                console.warn(`[WORKER ${region.id} NOTICE] Worker finished or timed out: ${e.message}`);
            }
            return { region: region.id, found: false, targetId: null, confidence: 0.0 };
        });

        const results = await Promise.all(workerPromises);

        logger.status(`\n[PARALLEL WORKERS RESULTS]`);
        results.forEach(res => {
            logger.status(`Worker ${res.region}: found=${res.found}, targetId=${res.targetId}, confidence=${res.confidence}`);
        });

        // 3. Select valid winner with highest confidence and snapshot validation
        const validResults = results.filter(r => r.found && r.targetId);
        validResults.sort((a, b) => b.confidence - a.confidence);

        if (validResults.length > 0) {
            const winner = validResults[0];
            const matchedElement = pageState.getElementById(winner.targetId);
            if (matchedElement) {
                logger.status(`\n\x1b[32m[WINNER SELECTED] Region: ${winner.region} | Target ID: ${matchedElement.id} | Name: ${matchedElement.name} | Confidence: ${winner.confidence}\x1b[0m\n`);
                return matchedElement;
            }
        }

        console.warn(`[PARALLEL DISCOVERY] No worker winner validated. Falling back to local resolver.`);
        return null;
    }
}

module.exports = new ParallelWorkerDiscovery();
