# Implementation Plan - Referral Flow Refinement & Code Security

Optimizing the referral landing experience to be less intrusive and enhancing the security/privacy of the Developer Program source code.

## User Review Required

> [!IMPORTANT]
> - Referral links will now land on the **Homepage** without any automatic popups.
> - Source code for the Developer Program will be moved to a separate file and "obfuscated" (minified/comments removed) to prevent easy reading in the browser inspector.

## Proposed Changes

### [index.html](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/index.html)
- Remove the `setTimeout` that automatically triggers the registration wizard.
- Keep background referral code capture.

### [NEW] [js/dev-program.js](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/js/dev-program.js)
- Extract the logic from `developer-program.html`.
- Minify/Obfuscate: Remove comments, strip whitespace, and simplify variable names to reduce readability in the browser inspector ("encryption degree").

### [developer-program.html](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/developer-program.html)
- Remove the large inline `<script>` block.
- Reference the new `js/dev-program.js` file instead.

### [js/auth.js](file:///C:/Users/suriya prakash/OneDrive/Desktop/web/js/auth.js)
- Ensure the registration process correctly consumes the stored referral ID even if the wizard is opened manually later.

## Verification Plan

### Manual Verification
1.  **Referral Landing**: Click a referral link. Verify you land on the homepage and **no popup** appears.
2.  **Manual Register**: Click "Register Now" on the homepage. Complete registration and verify the referral is still tracked in the dashboard.
3.  **Code Inspection**: Open `developer-program.html` in the browser inspector. Verify the script is no longer inline and the external file is difficult to read.
