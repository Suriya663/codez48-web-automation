# Implementation Plan - Fix PowerShell Syntax Error in GuiDriver

The output error (`WhitespaceBeforeHereStringFooter`) indicates a classic PowerShell syntax issue where the multi-line here-string closing tag (`'@`) has preceding whitespace. PowerShell strictly requires the closing `'@` to be on its own line with exactly zero leading spaces or tabs.

## Proposed Changes

### 1. Fix Here-String Whitespace (`src/pilot/drivers/gui-driver.js`)
- Locate the `clickPhysicalMouse` method inside `src/pilot/drivers/gui-driver.js`.
- Remove all leading spaces before the `'@;` string terminator in the generated PowerShell script.

---

## Verification Plan
1. Send a direct physical click call via `guiDriver.clickPhysicalMouse()` to verify the error is gone.