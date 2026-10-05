# Core Playwright Rules & Compliance Mapping

1. **Structure**: Browser -> context (persistent profile) -> page. One page per task step. New tabs and popups arrive as new pages on the context.
   - *Code Mapping*: `playwright-worker/browser-manager.js` -> `BrowserManager.getPage()`
2. **Auto-waiting and actionability**: Playwright's click/fill wait until the element is attached, visible, stable, enabled and receiving events. A timeout is a FAILURE to report, never ignored.
   - *Code Mapping*: `cli.js` & `playwright-worker/pilot-navigator.js` -> `page.click()` / `page.goto()`
3. **Locators are lazy and re-resolved at every action**: Never store element handles across navigations.
   - *Code Mapping*: `playwright-worker/intent-ranker.js` -> `IntentRanker.rankCandidates()`
4. **Locator priority**: getByRole(name) > getByLabel > getByPlaceholder > getByText > test id/stable attribute > CSS last. Never build selectors from raw words of the user's sentence.
   - *Code Mapping*: `playwright-worker/intent-ranker.js` -> `IntentRanker.rankCandidates()`
5. **Strict mode**: A locator matching several elements is an error. Do not take .first() silently. Filter to visible, rank by evidence, and ask when two are equal.
   - *Code Mapping*: `playwright-worker/intent-ranker.js` -> `IntentRanker.rankCandidates()`
6. **Navigation lifecycle**: goto resolves at 'domcontentloaded' by default. Waiting for the page to be usable needs more: load state, DOM stability (no major mutations for about 500 ms), and spinner/splash elements gone. 'networkidle' alone is unreliable.
   - *Code Mapping*: `playwright-worker/state-verifier.js` -> `StateVerifier.verifyNavigationOutcome()`
7. **Single-page apps and hash links**: A click may change only the hash or DOM without a page load. Verify with waitForURL or an element wait derived from target, not a load event.
   - *Code Mapping*: `playwright-worker/state-verifier.js` -> `StateVerifier.verifyNavigationOutcome()`
8. **Events must be listened for BEFORE the action**: new tab (`context.waitForEvent('page')`), download (`page.waitForEvent('download')`), dialog (`page.on('dialog')`), popup.
   - *Code Mapping*: `scratch/run_browser_acceptance_tests.js` / Playwright worker event handlers.
9. **Frames**: Elements inside iframes need frameLocator or frame object. Open shadow DOM is pierced by Playwright locators. Closed shadow DOM and cross-origin iframes: report clearly.
   - *Code Mapping*: `playwright-worker/native-app-automation.js` / Playwright frame locators.
10. **Overlays and covered elements**: An overlay intercepting pointer events is a blocked click. Observe, follow overlay rules (never choose for user, never remove with injected scripts, never force-click).
    - *Code Mapping*: `cli.js` -> overlay detection and dismissal rules.
11. **Web-first verification**: After every state-changing action wait for an expected outcome derived from target (URL path/hash, element appearing, new tab, file downloaded) with timeout. No fixed sleeps.
    - *Code Mapping*: `playwright-worker/state-verifier.js` -> `StateVerifier.verifyNavigationOutcome()`
12. **Timeouts**: Set explicit action/navigation timeouts in config. Retries only for transient errors, bounded, logged with reason.
    - *Code Mapping*: `cli.js` & `playwright-worker/browser-manager.js` timeout configurations.
13. **Evidence**: Playwright tracing, screenshots and existing debug folder on failures and in debug mode. No secrets in traces.
    - *Code Mapping*: `cli.js` -> debug artifact writing.
