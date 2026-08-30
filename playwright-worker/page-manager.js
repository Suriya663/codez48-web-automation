class PageManager {
    constructor() {
        this.pageCounter = 0;
    }

    async setupContextPageListeners(context, run, realtimeServer) {
        context.on('page', async (page) => {
            console.log(`[PAGE MANAGER] New page/tab detected in BrowserContext for run: ${run.runId}`);
            await this.registerPage(run, page, true, realtimeServer);
        });
    }

    async registerPage(run, page, isPopup = false, realtimeServer = null) {
        this.pageCounter++;
        const pageId = `page_${this.pageCounter}_${Math.random().toString(36).substring(2, 6)}`;

        try {
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        } catch (e) {}

        const url = page.url() || run.targetUrl;
        let title = 'Target Page';
        try {
            title = await page.title();
        } catch (e) {}

        // Store real Playwright Page reference in memory map
        run.pagesMap.set(pageId, page);
        run.activePage = page;

        // Store safe UI metadata
        const pageInfo = {
            pageId,
            url,
            title: title || 'New Tab',
            isPopup,
            createdAt: new Date().toISOString(),
            isActive: true
        };

        // Mark existing pages as inactive in metadata
        run.pagesInfo.forEach(p => p.isActive = false);
        run.pagesInfo.push(pageInfo);
        run.activePageInfo = pageInfo;

        console.log(`[PAGE MANAGER] Registered Page [${pageId}] (${url}) as activePage for run ${run.runId}`);

        // Page Navigation Listener
        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                const navUrl = page.url();
                let navTitle = 'Target Page';
                try { navTitle = await page.title(); } catch (e) {}

                pageInfo.url = navUrl;
                pageInfo.title = navTitle;
                run.activePageInfo = pageInfo;

                if (realtimeServer) {
                    realtimeServer.emitRunEvent(run.runId, 'ACTIVE_PAGE_CHANGED', {
                        activePageInfo: pageInfo,
                        url: navUrl,
                        title: navTitle
                    });
                }
            }
        });

        // Page Close Listener
        page.on('close', () => {
            console.log(`[PAGE MANAGER] Page [${pageId}] closed for run ${run.runId}`);
            run.pagesMap.delete(pageId);
            run.pagesInfo = run.pagesInfo.filter(p => p.pageId !== pageId);

            if (run.activePage === page) {
                // Assign next available page as activePage
                const remainingEntries = Array.from(run.pagesMap.entries());
                if (remainingEntries.length > 0) {
                    const [nextPageId, nextPageObj] = remainingEntries[remainingEntries.length - 1];
                    run.activePage = nextPageObj;
                    const nextInfo = run.pagesInfo.find(p => p.pageId === nextPageId);
                    if (nextInfo) {
                        nextInfo.isActive = true;
                        run.activePageInfo = nextInfo;
                    }
                } else {
                    run.activePage = null;
                    run.activePageInfo = null;
                }
            }

            if (realtimeServer) {
                realtimeServer.emitRunEvent(run.runId, 'PAGE_CLOSED', {
                    pageId,
                    activePageInfo: run.activePageInfo
                });
            }
        });

        if (realtimeServer) {
            realtimeServer.emitRunEvent(run.runId, 'PAGE_OPENED', {
                pageId,
                activePageInfo: pageInfo,
                isPopup
            });
        }

        return pageId;
    }

    getActivePage(run) {
        return run ? run.activePage : null;
    }
}

module.exports = new PageManager();
