# Assumptions & Decisions Log (ASSUMPTIONS.md)

Timestamp: 2026-10-03T16:03:42.928Z

1. **Direct Click Priority**: Direct DOM click is prioritized with `cursorMoved: false` when elements are reachable in DOM.
2. **Shadow DOM & Iframes**: Explored recursively via Playwright frame locators and shadow root evaluators.
