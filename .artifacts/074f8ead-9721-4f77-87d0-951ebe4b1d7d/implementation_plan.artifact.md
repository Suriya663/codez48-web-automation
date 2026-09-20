# Codez48 Automation Engine Integration Plan

This plan outlines the implementation of the "Automation" layer for the Codez48 platform, allowing sellers to manage background business rules via the Website UI and CLI.

## 1. Data Architecture (Firestore)

### [NEW] `service_automations` Collection
Stores the configuration for background business rules.
- `ownerId`: String (Seller UID derived from API Key)
- `name`: String
- `type`: `LOW_STOCK` | `UPTIME_CHECK` | `DAILY_REPORT`
- `status`: `ACTIVE` | `PAUSED`
- `config`: Map (e.g., `{ threshold: 5 }` or `{ url: "https://example.com" }`)
- `lastRunAt`: Timestamp
- `lastResult`: String
- `createdAt`, `updatedAt`: Timestamps

### [NEW] `service_automation_logs` Collection
Stores history of execution.
- `automationId`: String
- `ownerId`: String (For security filtering)
- `type`: String
- `timestamp`: Timestamp
- `status`: `SUCCESS` | `WARNING` | `ERROR`
- `details`: String (Detailed message or report summary)

---

## 2. Backend Infrastructure (Netlify Functions)

### [NEW] `cli-automation-manager.js`
A unified endpoint for all CLI automation commands (List, Create, Toggle, Run, Logs).
- **Security**: Validates `x-api-key` and enforces `ownerId` checks for every operation.
- **Actions**:
    - `LIST`: Return user's automations.
    - `CREATE`: Validate schema for specific type and save.
    - `TOGGLE`: Switch status between `ACTIVE` and `PAUSED`.
    - `LOGS`: Fetch recent 10 logs for a specific ID.
    - `RUN`: Trigger the logic immediately and return result.

### [NEW] `service-automation-cron.js` (Scheduled Function)
Runs periodically (e.g., Every 4 hours) to process all `ACTIVE` automations in the background.
- **Low Stock Sentinel**: Queries `products` collection for the seller and sends alerts if thresholds are met.
- **Uptime Guardian**: Performs `fetch` checks on target URLs.
- **Daily Business Report**: Aggregates `orders` and `external_sites` data.

---

## 3. Website Integration

### [MODIFY] [tools/index.html](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/tools/index.html)
- Integrate a new "Automation Engine" card and workspace.
- Provide a dashboard to view active rules, recent logs, and a "Run Now" button.

### [NEW] [js/automation-tool.js](file:///C:/Users/suriya%20prakash/OneDrive/Desktop/web/js/automation-tool.js)
- Handle the UI logic for creating and managing rules.
- Real-time sync with `service_automations` collection.

---

## 4. CLI Extension

### [MODIFY] `cli.js`
- **New Commands**:
    - `codez48 automation`: Help.
    - `codez48 automation list`: Display active rules.
    - `codez48 automation create`: Interactive wizard.
    - `codez48 automation run <id>`: Immediate execution.
    - `codez48 automation enable/disable <id>`: State management.
    - `codez48 automation logs <id>`: History view.

---

## User Review Required

> [!IMPORTANT]
> **Data Scope**: The "Daily Business Report" will strictly use existing data from your `orders` and `external_sites` collections. It will not track data that isn't already being collected.

> [!WARNING]
> **API Key Usage**: All CLI automation commands will consume API credits based on your current plan, as they utilize secure Netlify Function calls.

## Verification Plan
1. **Security Isolation**: Verify that Seller A cannot view or trigger Seller B's automation using a known ID.
2. **Alert Reliability**: Trigger a "Low Stock" event manually and verify that the notification is received.
3. **CLI Sync**: Create an automation via CLI and verify it appears in the Website Tools UI instantly.
4. **Log Integrity**: Verify that logs do not contain sensitive metadata.
