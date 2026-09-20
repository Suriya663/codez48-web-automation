# Complete Codez48 CLI Support Plan

Implementation plan for the full suite of CLI commands: login, add, list, update, and delete products, using the existing Firebase seller/password system and secure Netlify Functions.

## 1. CLI Authentication (Reused System)
- **Login Function**: Reusing `cli-login.js` which verifies `sellerId` and `password` and returns an API Key.
- **Session Key**: All other functions will require the `x-api-key` header to authenticate and identify the seller.

## 2. Technical API Endpoints

### [NEW] `cli-list-products`
- **Method**: GET
- **Logic**: Fetch all documents from the `products` collection where `sellerId` matches the authenticated user.
- **Output**: JSON array of products for the CLI to display.

### [NEW] `cli-update-product`
- **Method**: POST
- **Logic**:
  - Validate the `productId` belongs to the authenticated `sellerId`.
  - Perform a partial update using the existing `updateDoc` schema from `developer.html`.
  - Trigger the `SELLER_PRODUCT_UPDATED` notification email.

### [NEW] `cli-delete-product`
- **Method**: POST (or DELETE)
- **Logic**:
  - Verify ownership of the `productId`.
  - Remove the document from Firestore.
  - Trigger the `SELLER_PRODUCT_DELETED` notification email.

## 3. Product Schema Discovery
Based on `seller/developer.html`, the CLI will support these fields:

| Field | CLI Question | Required? |
| :--- | :--- | :--- |
| `name` | What is the product name? | **Yes** |
| `price` | Enter selling price (INR): | **Yes** |
| `mrp` | Enter MRP (INR): | No (Defaults to Price) |
| `category` | Enter category (e.g. Electronics): | No (Defaults to General) |
| `stock` | Enter initial stock quantity: | No (Defaults to 0) |
| `description` | Enter product description: | No |
| `image` | Enter primary image URL: | No |
| `type` | Product type (physical/digital/course): | No (Defaults to physical) |

## 4. Secure Backend Functions
- **[NEW] [cli-list-products.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-list-products.js)**
- **[NEW] [cli-update-product.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-update-product.js)**
- **[NEW] [cli-delete-product.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/netlify/functions/cli-delete-product.js)**

---

## User Review Required

> [!IMPORTANT]
> **API Key Persistence**:
> - After the CLI user logs in via `cli-login`, your separate CLI tool must store the returned `apiKey` locally (e.g., in a `.codez48cfg` file).
> - Every subsequent request must include: `x-api-key: YOUR_KEY`.

> [!CAUTION]
> **Data Isolation**:
> - My implementation ensures that a user with a valid API key **cannot** list, update, or delete products belonging to another `sellerId`.

## Verification Plan

### Manual Tests
1. **List Test**: Call `/cli-list-products` with a valid key. Verify it only returns YOUR products.
2. **Update Test**: Update a product price via the API and check the website storefront instantly.
3. **Delete Test**: Delete a test product via CLI and verify it disappears from `developer.html` dashboard.
