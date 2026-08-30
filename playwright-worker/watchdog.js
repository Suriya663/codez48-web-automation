const { RunState } = require('./run-manager');

class Watchdog {
    startRunWatchdog(run, realtimeServer) {
        this.stopRunWatchdog(run);

        run.watchdogTimer = setInterval(async () => {
            if (run.status === RunState.RUNNING || run.status === RunState.VERIFYING) {
                console.log(`[WATCHDOG] Run ${run.runId} heartbeat check...`);

                // Check active page status
                if (!run.activePage || run.activePage.isClosed()) {
                    console.warn(`[WATCHDOG] Active page missing or closed for run ${run.runId}. Attempting recovery...`);

                    const remainingPages = Array.from(run.pagesMap.values()).filter(p => !p.isClosed());
                    if (remainingPages.length > 0) {
                        run.activePage = remainingPages[remainingPages.length - 1];
                        console.log(`[WATCHDOG] Recovered active page for run ${run.runId}: ${run.activePage.url()}`);
                    } else {
                        console.error(`[WATCHDOG UNRECOVERABLE] All pages closed for run ${run.runId}. Setting status FAILED.`);
                        run.status = RunState.FAILED;
                        run.lastAction = 'Unrecoverable error: All target browser pages were closed.';
                        if (realtimeServer) {
                            realtimeServer.emitRunEvent(run.runId, 'RUN_FAILED', {
                                error: 'All browser pages were closed.'
                            });
                        }
                    }
                }
            }
        }, 15000);
    }

    stopRunWatchdog(run) {
        if (run && run.watchdogTimer) {
            clearInterval(run.watchdogTimer);
            run.watchdogTimer = null;
        }
    }
}

module.exports = new Watchdog();
