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

                const viewport = {
                    width: window.innerWidth,
                    height: window.innerHeight
                };

                const scroll = {
                    x: window.scrollX,
                    y: window.scrollY
                };

                const active = document.activeElement;
                const activeElement = active ? {
                    tagName: active.tagName,
                    id: active.id || '',
                    className: active.className || '',
                    text: (active.innerText || active.value || '').substring(0, 50)
                } : null;

                const fullHtml = document.documentElement.outerHTML.substring(0, 100000);

                // Layout Section Classification
                const layoutSections = [];
                document.querySelectorAll('header, nav, section, main, footer, div.hero, .card-grid, .features').forEach((s, idx) => {
                    if (isVisible(s) && layoutSections.length < 10) {
                        const tag = s.tagName.toLowerCase();
                        const heading = s.querySelector('h1, h2, h3')?.innerText?.trim() || '';
                        const textSnippet = s.innerText?.substring(0, 100)?.replace(/\s+/g, ' ')?.trim() || '';
                        const rect = s.getBoundingClientRect();
                        if (textSnippet.length > 5) {
                            layoutSections.push({
                                index: idx,
                                tag,
                                heading: heading || tag.toUpperCase(),
                                snippet: textSnippet,
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
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
                        const rect = b.getBoundingClientRect();
                        if (name && name.length < 80) {
                            buttons.push({
                                index: idx,
                                role: b.getAttribute('role') || 'button',
                                name: name,
                                disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
                                id: b.id || '',
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
                            });
                        }
                    }
                });

                const inputs = [];
                document.querySelectorAll('input, textarea, select, div[contenteditable="true"], [role="textbox"]').forEach((i, idx) => {
                    if (isVisible(i)) {
                        const tag = i.tagName.toLowerCase();
                        const isEditable = tag === 'div' || i.getAttribute('contenteditable') === 'true' || i.getAttribute('role') === 'textbox';
                        const type = i.getAttribute('type') || (tag === 'textarea' ? 'textarea' : isEditable ? 'contenteditable' : 'text');
                        const isSecret = /password|otp|secret|token|apikey/i.test(i.name || i.id || i.getAttribute('placeholder') || i.getAttribute('aria-label') || '');
                        const val = isEditable ? (i.innerText || i.textContent || '') : (i.value || '');
                        const rect = i.getBoundingClientRect();
                        inputs.push({
                            index: idx,
                            type,
                            id: i.id || '',
                            name: i.name || '',
                            placeholder: i.getAttribute('placeholder') || i.getAttribute('aria-placeholder') || '',
                            label: i.getAttribute('aria-label') || i.labels?.[0]?.innerText?.trim() || i.getAttribute('title') || '',
                            value: isSecret ? '****' : val,
                            disabled: i.disabled || i.getAttribute('aria-disabled') === 'true',
                            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
                        });
                    }
                });

                const links = [];
                document.querySelectorAll('a[href]').forEach((a, idx) => {
                    if (isVisible(a) && links.length < 15) {
                        const text = a.innerText.trim() || a.getAttribute('aria-label') || '';
                        const rect = a.getBoundingClientRect();
                        if (text && text.length < 60) {
                            links.push({
                                index: idx,
                                text,
                                href: a.getAttribute('href'),
                                rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
                            });
                        }
                    }
                });

                return {
                    viewport,
                    scroll,
                    activeElement,
                    fullHtml,
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
                viewport: pageData.viewport,
                scroll: pageData.scroll,
                activeElement: pageData.activeElement,
                fullHtml: pageData.fullHtml,
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
