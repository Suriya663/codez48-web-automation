class PageInspector {
    async inspectPage(page) {
        if (!page || page.isClosed()) {
            return { error: 'Page is closed or unavailable' };
        }

        try {
            await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});

            const url = page.url();
            let title = '';
            try { title = await page.title(); } catch (e) {}

            // Execute evaluation in target page context
            const pageData = await page.evaluate(() => {
                const isVisible = (elem) => {
                    if (!elem) return false;
                    const style = window.getComputedStyle(elem);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && elem.offsetWidth > 0 && elem.offsetHeight > 0;
                };

                // YouTube Channel Specific Extraction
                let ytChannelData = null;
                if (window.location.hostname.includes('youtube.com')) {
                    const subCountEl = document.querySelector('#subscriber-count, yt-formatted-string#subscriber-count, [aria-label*="subscribers"]');
                    const channelNameEl = document.querySelector('yt-formatted-string#text, #channel-name, h1.ytd-channel-name');
                    const videoCountEl = document.querySelector('#videos-count, [aria-label*="videos"]');
                    const channelBioEl = document.querySelector('#description-container, #about-container, #channel-tagline');

                    ytChannelData = {
                        channelName: channelNameEl?.innerText?.trim() || document.title.replace(' - YouTube', ''),
                        subscriberCount: subCountEl?.innerText?.trim() || 'N/A',
                        videoCount: videoCountEl?.innerText?.trim() || 'N/A',
                        bio: channelBioEl?.innerText?.substring(0, 300)?.trim() || 'N/A'
                    };
                }

                // Layout Section Classification
                const layoutSections = [];
                document.querySelectorAll('header, nav, section, main, footer, div.hero, .card-grid, .features').forEach((s, idx) => {
                    if (isVisible(s) && layoutSections.length < 10) {
                        const tag = s.tagName.toLowerCase();
                        const heading = s.querySelector('h1, h2, h3')?.innerText?.trim() || '';
                        const textSnippet = s.innerText?.substring(0, 100)?.replace(/\s+/g, ' ')?.trim() || '';
                        if (textSnippet.length > 5) {
                            layoutSections.push({
                                index: idx,
                                tag,
                                heading: heading || tag.toUpperCase(),
                                snippet: textSnippet
                            });
                        }
                    }
                });

                const headings = [];
                document.querySelectorAll('h1, h2, h3').forEach(h => {
                    if (isVisible(h)) {
                        const t = h.innerText.trim();
                        if (t && t.length < 100) headings.push(t);
                    }
                });

                const buttons = [];
                document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, [role="button"]').forEach((b, idx) => {
                    if (isVisible(b)) {
                        const name = b.getAttribute('aria-label') || b.innerText.trim() || b.getAttribute('value') || b.getAttribute('title') || '';
                        if (name && name.length < 80) {
                            buttons.push({
                                index: idx,
                                role: b.getAttribute('role') || 'button',
                                name: name,
                                disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
                                id: b.id || ''
                            });
                        }
                    }
                });

                const inputs = [];
                document.querySelectorAll('input, textarea, select').forEach((i, idx) => {
                    if (isVisible(i)) {
                        const type = i.getAttribute('type') || (i.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'text');
                        const isSecret = /password|otp|secret|token|apikey/i.test(i.name || i.id || i.getAttribute('placeholder') || '');
                        inputs.push({
                            index: idx,
                            type,
                            id: i.id || '',
                            name: i.name || '',
                            placeholder: i.getAttribute('placeholder') || '',
                            label: i.getAttribute('aria-label') || i.labels?.[0]?.innerText?.trim() || '',
                            value: isSecret ? '****' : (i.value || ''),
                            disabled: i.disabled
                        });
                    }
                });

                const links = [];
                document.querySelectorAll('a[href]').forEach((a, idx) => {
                    if (isVisible(a) && links.length < 15) {
                        const text = a.innerText.trim() || a.getAttribute('aria-label') || '';
                        if (text && text.length < 60) {
                            links.push({
                                index: idx,
                                text,
                                href: a.getAttribute('href')
                            });
                        }
                    }
                });

                return {
                    ytChannelData,
                    layoutSections,
                    headings: headings.slice(0, 10),
                    buttons: buttons.slice(0, 20),
                    inputs: inputs.slice(0, 15),
                    links: links.slice(0, 10)
                };
            });

            return {
                url,
                title,
                ytChannelData: pageData.ytChannelData,
                layoutSections: pageData.layoutSections,
                headings: pageData.headings,
                buttons: pageData.buttons,
                inputs: pageData.inputs,
                links: pageData.links
            };

        } catch (err) {
            console.error('[PAGE INSPECTOR ERROR]:', err.message);
            return {
                url: page.url(),
                title: 'Error Inspecting Page',
                error: err.message,
                buttons: [],
                inputs: []
            };
        }
    }
}

module.exports = new PageInspector();
