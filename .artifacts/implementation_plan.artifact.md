# Implementation Plan: Codez48 Hybrid Automation Layer (Revised with Corrections)

This implementation plan incorporates the user's 10 mandatory corrections:
1. **Viewport-to-Screen Coordinate Mapping**: Account for browser window position, client-area offset, DPI scaling, and multi-monitor positioning rather than assuming raw boundingBox = screen coordinates.
2. **DOM Preference**: DOM automation remains default/preferred; physical Win32 automation used only when DOM is unsuitable, unreachable, or outside page UI.
3. **Pre-Click Validation**: Validate coordinate inside target bounds, move cursor, verify via Koffi `GetCursorPos`, then click.
4. **Post-Action State Verification**: Use `state-verifier.js` after every action.
5. **Bounded Retries**: No random coordinate retries.
6. **No Security Bypass**: Zero anti-bot or CAPTCHA bypass.
7. **Strict Locators**: Preserve existing locator hierarchy and strict-mode behavior.
8. **Doctor & Regression Preservation**: Ensure doctor and regression tests pass unchanged.
9. **Incremental Implementation**: Smallest necessary changes per file.
10. **Post-Implementation Verification**: Run doctor, DOM tests, cursor tests, physical click tests, and DOM-preference tests.

---

## Verification Plan

### Automated Execution
- Run `node cli.js doctor` and hybrid action verification tests.
