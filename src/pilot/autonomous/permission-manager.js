const logger = require('../../core/logger');
/**
 * CODEZ48 CENTRAL PERMISSION MANAGER
 * Enforces least-privilege capability grants, scope-based permissions, trusted site levels,
 * audit logging, and mandatory confirmation for sensitive actions even in trusted scopes.
 */

const fs = require('fs');
const path = require('path');
const workspaceManager = require('../../core/workspace-manager');

class PermissionManager {
    constructor() {
        this.auditLogPath = path.join(workspaceManager.getWorkspacePath(), 'permission_audit.json');
        this.grantsPath = path.join(workspaceManager.getWorkspacePath(), 'permission_grants.json');
        this.loadGrants();
    }

    loadGrants() {
        try {
            if (fs.existsSync(this.grantsPath)) {
                this.grants = JSON.parse(fs.readFileSync(this.grantsPath, 'utf8'));
            } else {
                this.grants = { trustedSites: [], scopes: {} };
            }
        } catch (e) {
            this.grants = { trustedSites: [], scopes: {} };
        }
    }

    saveGrants() {
        try {
            fs.writeFileSync(this.grantsPath, JSON.stringify(this.grants, null, 2), 'utf8');
        } catch (e) {}
    }

    logAudit(entry) {
        try {
            let logs = [];
            if (fs.existsSync(this.auditLogPath)) {
                logs = JSON.parse(fs.readFileSync(this.auditLogPath, 'utf8'));
            }
            logs.push({ ...entry, timestamp: new Date().toISOString() });
            fs.writeFileSync(this.auditLogPath, JSON.stringify(logs, null, 2), 'utf8');
        } catch (e) {}
    }

    isTrustedSite(origin) {
        return this.grants.trustedSites.includes(origin);
    }

    trustSite(origin) {
        if (!this.grants.trustedSites.includes(origin)) {
            this.grants.trustedSites.push(origin);
            this.saveGrants();
        }
    }

    checkPermission(capability, scope, actionType = '') {
        const sensitiveActions = ['delete', 'overwrite', 'install', 'publish', 'send', 'pay', 'transfer', 'settings', 'credential', 'deletions'];
        const isSensitive = sensitiveActions.some(sa => (actionType || '').toLowerCase().includes(sa));

        // Sensitive actions ALWAYS require confirmation, even in trusted scopes
        if (isSensitive) {
            this.logAudit({ capability, scope, actionType, status: 'NEEDS_CONFIRMATION', reason: 'Sensitive action requires explicit user approval' });
            return { granted: false, needsConfirmation: true, reason: 'Sensitive action requires explicit user confirmation per security policy.' };
        }

        if (capability === 'READ_WEB' || capability === 'CLICK_WEB' || capability === 'TYPE_WEB') {
            if (this.isTrustedSite(scope)) {
                this.logAudit({ capability, scope, actionType, status: 'GRANTED', reason: 'Trusted site scope' });
                return { granted: true, needsConfirmation: false };
            }
        }

        // Check explicit scope grant
        const scopeGrants = this.grants.scopes[scope] || [];
        if (scopeGrants.includes(capability) || scopeGrants.includes('*')) {
            this.logAudit({ capability, scope, actionType, status: 'GRANTED', reason: 'Explicit scope grant' });
            return { granted: true, needsConfirmation: false };
        }

        // Default: requires grant / prompt
        this.logAudit({ capability, scope, actionType, status: 'PROMPT_REQUIRED', reason: 'Capability not previously granted for scope' });
        return { granted: false, needsConfirmation: true, reason: `Permission required for capability "${capability}" on scope "${scope}".` };
    }
}

module.exports = new PermissionManager();
