class InputVerifier {
    /**
     * Inspects page for input fields, captures annotated screenshot, and requests user confirmation & field ordering via Firebase
     */
    async requestInputFieldVerification(page, realtimeServer = null, runId = null) {
        if (!page || page.isClosed()) {
            return { success: false, error: 'Target page unavailable' };
        }

        console.log('[INPUT VERIFIER] Inspecting page for input boxes and requesting user confirmation...');

        try {
            // 1. Locate all visible input fields
            const inputElements = await page.evaluate(() => {
                const isVisible = (elem) => {
                    if (!elem) return false;
                    const style = window.getComputedStyle(elem);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && elem.offsetWidth > 0 && elem.offsetHeight > 0;
                };

                const fields = [];
                document.querySelectorAll('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]').forEach((i, idx) => {
                    if (isVisible(i)) {
                        const rect = i.getBoundingClientRect();
                        fields.push({
                            fieldIndex: idx + 1,
                            id: i.id || '',
                            name: i.name || '',
                            type: i.type || 'text',
                            placeholder: i.getAttribute('placeholder') || '',
                            label: i.getAttribute('aria-label') || i.labels?.[0]?.innerText?.trim() || '',
                            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
                        });
                    }
                });
                return fields;
            });

            if (!inputElements || inputElements.length === 0) {
                return { success: true, hasInputs: false, message: 'No input boxes detected on page.' };
            }

            // 2. Capture annotated screenshot with highlighted input boxes
            await page.evaluate((fields) => {
                fields.forEach((f) => {
                    const el = document.querySelectorAll('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]')[f.fieldIndex - 1];
                    if (el) {
                        el.style.outline = '3px solid #ef4444'; // Highlight box in red
                        el.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.8)';
                    }
                });
            }, inputElements);

            const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 65 });
            const base64Img = `data:image/jpeg;base64,${screenshotBuf.toString('base64')}`;

            // Restore styles
            await page.evaluate((fields) => {
                fields.forEach((f) => {
                    const el = document.querySelectorAll('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="searchbox"]')[f.fieldIndex - 1];
                    if (el) {
                        el.style.outline = '';
                        el.style.boxShadow = '';
                    }
                });
            }, inputElements);

            const verificationPayload = {
                runId,
                timestamp: new Date().toISOString(),
                promptText: "Is this indeed an input box? If confirmed, specify the order of the fields (1st, 2nd, 3rd field).",
                annotatedScreenshot: base64Img,
                detectedFields: inputElements,
                status: 'AWAITING_USER_CONFIRMATION'
            };

            // 3. Dispatch to Firebase / Realtime server
            if (realtimeServer && runId) {
                realtimeServer.emitRunEvent(runId, 'INPUT_FIELD_VERIFICATION_REQUEST', verificationPayload);
            }

            return {
                success: true,
                hasInputs: true,
                fieldCount: inputElements.length,
                detectedFields: inputElements,
                annotatedScreenshot: base64Img,
                message: 'Input box screenshot captured. Verification & field ordering request sent via Firebase.'
            };

        } catch (err) {
            console.error('[INPUT VERIFIER ERROR]:', err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new InputVerifier();
