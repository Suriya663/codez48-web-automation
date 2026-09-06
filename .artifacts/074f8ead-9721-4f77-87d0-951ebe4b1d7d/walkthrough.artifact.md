# Campaign Wallet & Manual Credit Recharge UI

Implemented a dedicated manual credit input box inside the **Campaign Wallet & Free Credits** tab, allowing users to enter any custom number of credits to purchase at the rate of **1 Credit = ₹1**, integrated directly with Razorpay checkout.

## Key Changes Made

### 1. Manual Credit Input & Razorpay Checkout (`js/ai-mail-campaign-modal.js`)
- Added an input box (`camp-topup-amount`) inside the Wallet Credits tab where users can specify the exact number of credits they wish to buy.
- Configured Razorpay checkout (`launchWalletTopUp`) to calculate payment at **1 Credit = ₹1** (`amount: credits * 100` paise).
- Upon successful payment, credits are updated atomically in Firestore (`ai_mail_wallets`) and recorded in `wallet_transactions`.

---

## Verification Results

### Code Health
- `analyze_file` executed cleanly on `js/ai-mail-campaign-modal.js` with zero syntax errors.

### Feature Verification
- Verified manual credit input field and ₹1/credit pricing calculation.
- Verified Razorpay payment integration and wallet balance updates.
