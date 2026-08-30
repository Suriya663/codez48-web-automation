# Implementation Plan - Mobile UI & Layout Refinement

Address reported mobile UI issues including header collapse, button overflow, and font size inconsistencies.

## User Review Required

> [!IMPORTANT]
> **Horizontal Scroll Implementation**: I will convert the profile action bar into a scrollable horizontal carousel on mobile to prevent buttons from wrapping or overlapping.

## Proposed Changes

### 1. Navigation Header Optimization (`index.html`)
- **Header Layout**:
    - Adjust the `nav` container to ensure the brand logo/text and hamburger menu remain strictly on the same row without overlapping.
    - Standardize the search bar positioning on mobile to ensure it drops cleanly below the navigation items with adequate spacing.
- **Mobile Menu Protocol**:
    - Ensure `toggleMobileMenu` correctly toggles visibility and doesn't interfere with the layout flow.

### 2. Profile Action Bar Refactoring (`index.html`)
- **Horizontal Scroll Container**:
    - Wrap the "Back to Directory" button and the `admin-action-container` in a unified flex-row.
    - Apply `overflow-x-auto` and `flex-nowrap` on mobile to allow left-to-right scrolling of action buttons.
    - Add a sleek custom scrollbar (hidden by default) for a clean look.

### 3. Font Scaling & Alignment
- **Typography Adjustments**:
    - Reduce mobile font sizes for:
        - "Product Catalog" header.
        - "Business Network" directory header.
        - Merchant Brand names in profile views.
- **Directory Alignment**:
    - Fix the "Business Network" text positioning to ensure it centers or aligns left correctly within the `container-fluid` padding.

### 4. Search Bar Repositioning
- Increase the top margin (`mt-8` or `mt-10`) for the mobile search bar to ensure it doesn't crowd the brand logo.

## Verification Plan

### Manual Verification
1.  **Header Test**: Inspect the website on a mobile viewport. Verify that "BIG NETWORK" and the hamburger icon are properly spaced.
2.  **Scroll Test**: Navigate to a merchant profile with owner access. Attempt to scroll the action buttons (Share, Settings, Edit, etc.) horizontally.
3.  **Typography Audit**: Verify that "Product Catalog" text fits comfortably on mobile screens without being disproportionately large.
4.  **Directory Check**: Verify that "Business Network" text is aligned correctly with the grid items below it.
