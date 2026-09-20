# Codez48 CLI Complete Technical Specification

This report provides the full technical specifications for integrating your Node.js CLI tool with the Codez48 backend. All endpoints are secured and synchronized with your existing Firebase/Firestore setup.

## 1. Core Authentication (`cli-login`)
Before running any product commands, the CLI must authenticate to obtain a session API Key.

| Spec | Detail |
| :--- | :--- |
| **Endpoint** | `https://codez48.netlify.app/.netlify/functions/cli-login` |
| **Method** | `POST` |
| **Body** | `{"sellerId": "SLR-xxxxxx", "password": "..."}` |
| **CLI Question 1** | "Enter your Seller ID (e.g. SLR-123456):" |
| **CLI Question 2** | "Enter your Password:" |

## 2. Product Management Endpoints
All these endpoints require the `x-api-key` header obtained from the login step.

### A. List Products (`cli-list-products`)
- **Endpoint**: `https://codez48.netlify.app/.netlify/functions/cli-list-products`
- **Method**: `GET`
- **Response**: `{"success": true, "count": 5, "products": [...]}`

### B. Add Product (`add-product`)
- **Endpoint**: `https://codez48.netlify.app/.netlify/functions/add-product`
- **Method**: `POST`
- **Required Fields**: `name`, `price`
- **CLI Questions**:
    1.  "Product Name? (Required):"
    2.  "Selling Price in INR? (Required):"
    3.  "Category? (Optional, default: Uncategorized):"
    4.  "Stock Quantity? (Optional, default: 0):"
    5.  "MRP in INR? (Optional, default: same as price):"
    6.  "Product Description? (Optional):"
    7.  "Image URL? (Optional):"

### C. Update Product (`cli-update-product`)
- **Endpoint**: `https://codez48.netlify.app/.netlify/functions/cli-update-product`
- **Method**: `POST`
- **Logic**: Performs a partial update. Only send the fields you want to change.
- **CLI Flow**:
    1.  List products to let the user pick an `ID`.
    2.  Ask: "Enter the Product ID to update:"
    3.  Ask: "Which field would you like to change? (name/price/stock/etc):"
    4.  Ask: "Enter the new value:"

### D. Delete Product (`cli-delete-product`)
- **Endpoint**: `https://codez48.netlify.app/.netlify/functions/cli-delete-product`
- **Method**: `POST`
- **Body**: `{"productId": "..."}`
- **CLI Flow**:
    1.  Ask: "Enter the Product ID to delete:"
    2.  Ask: "Are you sure? (y/n):"

---

## 3. Product Schema (Detected from Website)
The backend enforces this exact schema to ensure CLI products show up perfectly in your storefront:

```json
{
  "name": "String",
  "category": "String",
  "price": "Number (INR)",
  "mrp": "Number (INR)",
  "stock": "Number",
  "description": "String",
  "image": "URL String",
  "type": "physical | digital | course",
  "sellerId": "Auto-filled from API Key",
  "isDynamic": true,
  "lastUpdated": "ISO Timestamp"
}
```

## 4. Automated Workflows
Successful commands trigger the following:
- **Add/Update/Delete**: Dispatches automated email notifications via your existing SMTP system.
- **Data Sync**: Changes are instantly reflected on the live website storefront and developer dashboard.

---

> [!IMPORTANT]
> **Security Guard**:
> The `sellerId` is **derived server-side** from the API key. A CLI user can only manage products that belong to their own account. Administrative secrets (Firebase keys) are never sent to the CLI.

> [!TIP]
> **Node.js Integration**:
> Use the `axios` or `node-fetch` library in your CLI. Always store the `apiKey` in a hidden file like `.codez48cfg` in the user's home directory after a successful login.
