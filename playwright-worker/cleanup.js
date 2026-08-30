const watchdog = require('./watchdog');
const { RunManager } = require('./run-manager');

class Cleanup {
    async cleanupRun(runId) {
        const run = RunManager.getRun(runId);
        if (!run) return;

        console.log(`[CLEANUP] Cleaning up resources for run: ${runId}...`);

        watchdog.stopRunWatchdog(run);

        // Close all page objects associated with this run
        for (const [pageId, page] of run.pagesMap.entries()) {
            try {
                if (!page.isClosed()) {
                    await page.close();
                }
            } catch (e) {}
        }

        run.pagesMap.clear();
        run.activePage = null;

        RunManager.deleteRun(runId);
        console.log(`[CLEANUP] Run ${runId} resources successfully released.`);
    }
}

module.exports = new Cleanup();
