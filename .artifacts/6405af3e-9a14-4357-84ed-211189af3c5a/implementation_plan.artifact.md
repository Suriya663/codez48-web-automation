# Implementation Plan - Fix Collapsed Website Tracker Interface

The Website Tracker interface is currently "collapsed" or overlapping, especially when long URLs are present. We will strictly enforce width constraints and ensure content truncation to prevent layout breakage.

## User Review Required

> [!IMPORTANT]
> - The Website Tracker section will be limited to **50% of the screen width on laptops** and **90% on mobile**.
> - Website URLs will be **truncated with an ellipsis (`...`)** to prevent cards from expanding and overlapping.
> - We will use a **single column layout** on laptops if 50% width makes a grid too crowded, or ensure the grid items have `min-width: 0` to allow shrinking.

## Proposed Changes

### Website Tracker Layout

#### [MODIFY] [index.html](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/index.html)
- **Width Constraint**: Ensure `#tracker-view > div` uses `w-[90%] lg:w-[50%] mx-auto`.
- **Grid Layout**: Update `#external-sites-grid` to `grid-cols-1` on laptop if the 50% width is too narrow, or keep `md:grid-cols-2` but add `min-w-0` to prevent overflow. I'll stick to `grid-cols-1` for better clarity in a narrow container.

### Website Tracker Logic

#### [MODIFY] [js/tracker-tool.js](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/js/tracker-tool.js)
- **Card Truncation**:
    - Update `loadUserSites` to wrap the website URL in a div with `min-w-0 w-full overflow-hidden`.
    - Apply `truncate` to the `h5` and ensure it has `display: block`.
    - Add `word-break: break-all` as a fallback.
- **Card Spacing**: Add `gap-4` to the footer of the card to ensure elements don't touch.

### Table & Dashboard Fixes
- Ensure all dashboard tables use `table-fixed` to prevent long pathway names from expanding the container.

## Verification Plan

### Manual Verification
- **Desktop**: Verify the Tracker section is centered and takes 50% of the viewport.
- **URL Check**: Add a very long URL (like the one in the screenshot) and verify it shows `...` and the cards do not overlap.
- **Setup Check**: Verify the "New Website" setup screen respects the width constraints.
