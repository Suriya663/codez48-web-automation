# Implementation Plan - Address Bar Tab Navigation Flow

Updating `BrowserController` (`src/pilot/browser/browser-controller.js`) so that instead of passing the URL directly in the browser launch arguments, the agent opens a new tab (`Ctrl+T`), focuses the address bar, types the URL with a trailing space, and presses Enter (`{ENTER}`) to navigate to the target webpage.

## Proposed Changes

### 1. Address Bar Navigation Flow (`src/pilot/browser/browser-controller.js`)
- Update `navigateAndVerifyUrl`:
  - Launch browser to a blank page or default window.
  - Send `Ctrl+T` to open a new tab.
  - Focus address bar or type URL with trailing space and press `{ENTER}`.
  - Observe resulting page state via CDP.

---

## Verification Plan

### Automated & Runtime Tests
1. Run acceptance test verifying address bar typing with trailing space and Enter key navigation.
