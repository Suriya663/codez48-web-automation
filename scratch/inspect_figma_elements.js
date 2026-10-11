const browserManager = require('../playwright-worker/browser-manager.js');
const environmentObserver = require('../playwright-worker/environment-observer.js');

async function inspectFigma() {
    const page = await browserManager.getPage({ headless: false });
    await page.goto('https://www.figma.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const obs = await environmentObserver.observe(page, browserManager.context);
    console.log('Figma Interactive Elements:', obs.pageIndex.map(e => ({ tag: e.tag, role: e.role, name: e.name, href: e.href })));
    await browserManager.close();
}

inspectFigma();
