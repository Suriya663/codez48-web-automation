# Codez48 CLI Integration Report

Successfully implemented the secure backend API for the Codez48 CLI, including authentication and product management.

## 1. Authentication Flow (CLI Login)
The CLI must first authenticate to obtain an `apiKey`. This uses the existing `sellerId` and `password` from the Codez48 database.

| Spec | Detail |
| :--- | :--- |
| **Function Name** | `cli-login` |
| **Endpoint** | `https://codez48.netlify.app/.netlify/functions/cli-login` |
| **HTTP Method** | `POST` |
| **JSON Request Body** | `{"sellerId": "SLR-xxxxxx", "password": "..."}` |
| **JSON Response** | `{"success": true, "apiKey": "c48_api_..."}` |

## 2. Product Management (Add Product)
Once authenticated, the `apiKey` must be sent in every subsequent request.

| Spec | Detail |
| :--- | :--- |
| **Function Name** | `add-product` |
| **Endpoint** | `https://codez48.netlify.app/.netlify/functions/add-product` |
| **HTTP Method** | `POST` |
| **Authentication** | `x-api-key` header (required) |
| **Content-Type** | `application/json` |

## 2. Authentication Requirements
The CLI **must** send an active API Key generated from the website's "API Keys & Quota Management" section.

**Header Example:**
```http
x-api-key: c48_api_xxxxxxxxxxxxxxxx
```

## 3. Request Body Structure
The following JSON fields are accepted by the `add-product` endpoint:

| Field | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Required** | The public display name of the product. |
| `price` | Number | **Required** | The selling price in INR. |
| `category` | String | Optional | e.g. "Electronics", "Fashion". Defaults to "Uncategorized". |
| `stock` | Number | Optional | Quantity available. Defaults to 0. |
| `mrp` | Number | Optional | Maximum Retail Price. Defaults to `price`. |
| `description` | String | Optional | Detailed product info. |
| `image` | URL String | Optional | Primary product image URL. |
| `type` | String | Optional | "physical", "digital", or "course". Defaults to "physical". |

### JSON Example:
```json
{
  "name": "CLI Pro Mouse",
  "price": 999,
  "category": "Accessories",
  "stock": 50,
  "description": "High-performance gaming mouse added via CLI."
}
```

## 4. Success Response
```json
{
  "success": true,
  "message": "Product created successfully via Codez48 CLI",
  "productId": "cli-pro-mouse-a1b2c",
  "sellerId": "user_12345"
}
```

## 5. Automated Features
- **Data Sync**: Products created via CLI are instantly visible in the website directory and seller dashboard.
- **Auto-Emails**: A confirmation email is automatically sent to the seller's registered email address upon successful creation.
- **Unique IDs**: Product IDs are auto-generated based on the name (slugified) with a unique suffix for collision prevention.

---

> [!IMPORTANT]
> **Security Guard**:
> This API does not trust the `sellerId` provided by the CLI. It automatically derives the `sellerId` from the verified API Key in the `api_keys` collection, preventing users from adding products to other people's accounts.
