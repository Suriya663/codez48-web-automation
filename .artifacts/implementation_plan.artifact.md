# Implementation Plan: Contenteditable & Role-Textbox Support in Page Inspector for AI Studio Agent

This implementation plan addresses the real-world test failure where modern AI platforms (such as Google AI Studio at `aistudio.google.com`) use `div[contenteditable="true"]` and `[role="textbox"]` instead of standard `<input>` or `<textarea>` elements for message input boxes.

## User Review Required

> [!IMPORTANT]
> This fix enables the AI browser agent to correctly inspect, target, and type into modern rich-text chat prompt boxes (`div[contenteditable="true"]`, `[role="textbox"]`) on Google AI Studio and similar web apps.

## Open Questions

- None. The fix directly extends `PageInspector` to detect `div[contenteditable="true"]` and `[role="textbox"]` elements as interactive inputs.

## Proposed Changes

### Playwright Worker Page Inspector
#### [MODIFY] [page-inspector.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/playwright-worker/page-inspector.js)
- Extend the `inputs` query selector in `PageInspector` to include `div[contenteditable="true"], [role="textbox"], textarea, input, select`.
- Capture placeholder or aria-label/text content for `contenteditable` and `[role="textbox"]` elements so the AI planner can precisely identify the chat message input box.

## Verification Plan

### Automated Tests
- Run validation scripts simulating page inspection on AI Studio DOM structures.

### Manual Verification
- Re-run the Google AI Studio test task: open AI Studio, find the message input box, type "Hi, I'm code 48", press Enter, and verify submission.
