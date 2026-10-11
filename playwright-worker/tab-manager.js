class TabManager {
    async openNewTab(context, url) {
        const page = await context.newPage();
        if (url) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        return page;
    }

    async switchTab(context, index) {
        const pages = context.pages();
        if (pages[index]) {
            await pages[index].bringToFront();
            return pages[index];
        }
        throw new Error(`Tab index ${index} not found.`);
    }

    async closeTab(page) {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}

module.exports = new TabManager();
