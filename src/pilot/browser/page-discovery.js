const logger = require('../../core/logger');
/**
 * CODEZ48 PAGE DISCOVERY LAYER (CURL/FETCH PRE-INSPECTION)
 * Pre-inspects target URLs via HTTP fetch/curl to discover static page structure, links,
 * and routes before live browser interaction.
 */

const fetch = globalThis.fetch || require('node-fetch');

class PageDiscovery {
    async discoverUrl(url) {
        logger.status(`\x1b[36m[PAGE DISCOVERY] Pre-inspecting URL structure via fetch: ${url}...\x1b[0m`);
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Codez48Discovery/1.0' },
                timeout: 4000
            });
            if (res.ok) {
                const html = await res.text();
                const links = [];
                const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
                let match;
                while ((match = linkRegex.exec(html)) !== null) {
                    const href = match[1];
                    const text = match[2].replace(/<[^>]+>/g, '').trim();
                    if (href && text) links.push({ href, text });
                }

                logger.user(`\x1b[32m✓ Page Discovery successful: Discovered ${links.length} static links.\x1b[0m`);
                return { success: true, url, links, htmlLength: html.length };
            }
        } catch (e) {
            console.warn(`[PAGE DISCOVERY NOTICE] Pre-inspection fetch skipped: ${e.message}`);
        }
        return { success: false, url, links: [] };
    }
}

module.exports = new PageDiscovery();
