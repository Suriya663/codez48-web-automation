# AI Assistant "Ultimate" 1000% Accuracy Fix

This plan addresses the critical bugs reported: the `InvalidStateError` in the mic guard, the missing visual "Virtual Mouse", and the AI's inability to list multiple products or perform multi-step clicks correctly.

## User Review Required

> [!IMPORTANT]
> I will implement a robust "Click-Sync" system. This ensures that the Virtual Mouse and the actual page actions are perfectly synchronized. I will also fix the Speech Recognition bug that causes it to crash when trying to restart.

## Proposed Changes

### 1. Fix Speech Recognition `InvalidStateError`
- **Logic**: Update `safeStartRecognition` to use `isRecognitionActive` more strictly.
- **Auto-Recovery**: If a "recognition has already started" error occurs, catch it and reset the internal flag to keep the system in sync.

### 2. Fix Virtual Mouse Visibility & Animation
- **Visibility**: Ensure the `#virtual-mouse` element has its `display` and `opacity` properties correctly toggled in `aiMoveAndClick`.
- **Coordination**: Update the animation to account for the page's current scroll position so the mouse lands exactly on the button.
- **Visual Design**: Enhance the mouse design with a high-contrast ripple effect to make it clearly visible to the user.

### 3. Implement Multi-Step UI Chaining (Mobile/Laptop)
- **Mobile Chaining**: Explicitly implement the "Click Hamburger -> Wait -> Click Link" logic for all navigation commands in `aiMoveAndClick`.
- **Selector Robustness**: Update selectors to be more broad (e.g., matching by text content if necessary) to ensure the AI never "misses" a button.

### 4. Overhaul Product Learning & Sharing
- **Multi-Product Logic**: Update the `CHAT` intent in the system prompt to explicitly command the AI to list at least 5 different products with their specific quality details from the catalog.
- **Deep Knowledge**: Provide the full description of every product to the AI model so it can sell effectively.

## Verification Plan

### Manual Verification
1.  **Automation Check**: Say "Add the first product to cart".
    - Verify the Virtual Mouse appears, moves to the product, and clicks.
2.  **Mobile Navigation**: In mobile view, say "Track order".
    - Verify AI clicks the Hamburger Menu first, then the Track Order link.
3.  **Product List**: Ask "What sarees do you have?".
    - Verify AI lists multiple sarees (not just one) with prices and quality details.
4.  **Error Check**: Verify the browser console is free of `InvalidStateError` after long conversations.
