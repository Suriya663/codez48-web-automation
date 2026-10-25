/**
 * CODEZ48 USER BUSINESS DETAILS MANAGER
 *
 * Manages persistent user business profiles for WhatsApp campaigns:
 *   - Business Name
 *   - Nature of Business (e.g. Retail, Real Estate, Consulting, Healthcare)
 *   - Purpose of Operations / Campaign (e.g. Lead Generation, Announcement, Follow-up)
 *   - Products / Offerings
 *   - Website / Portfolio Link
 *   - Call to Action (CTA)
 *   - Default Message Template
 *
 * Full CRUD capabilities:
 *   - View saved profiles
 *   - Create new profile
 *   - Update existing profile
 *   - Delete profile
 *   - Interactive selector for WhatsApp automation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class UserDetailsManager {
    constructor() {
        this.storageDir = path.resolve(__dirname, '../.codez48_user_details');
        this.storageFile = path.join(this.storageDir, 'business_profiles.json');
        this._ensureStorage();
    }

    _ensureStorage() {
        try {
            if (!fs.existsSync(this.storageDir)) {
                fs.mkdirSync(this.storageDir, { recursive: true });
            }
            if (!fs.existsSync(this.storageFile)) {
                fs.writeFileSync(this.storageFile, JSON.stringify([], null, 2), 'utf8');
            }
        } catch (_) {}
    }

    /**
     * Ask a question on readline interface
     */
    async _ask(query, rl = null) {
        if (rl) {
            try {
                const res = rl.question(query);
                if (res && typeof res.then === 'function') {
                    return (await res);
                }
                return await new Promise(resolve => rl.question(query, resolve));
            } catch (_) {
                return '';
            }
        }

        const localRl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            localRl.question(query, answer => {
                localRl.close();
                resolve(answer);
            });
        });
    }

    /**
     * Get all saved profiles
     */
    getProfiles() {
        this._ensureStorage();
        try {
            const raw = fs.readFileSync(this.storageFile, 'utf8');
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    }

    /**
     * Get a specific profile by ID
     */
    getProfileById(id) {
        if (!id) return null;
        const profiles = this.getProfiles();
        return profiles.find(p => p.id === id) || null;
    }

    /**
     * Save all profiles to disk
     */
    saveProfiles(profiles) {
        this._ensureStorage();
        try {
            fs.writeFileSync(this.storageFile, JSON.stringify(profiles, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error(`[DETAILS MANAGER ERROR] Failed to save profiles: ${e.message}`);
            return false;
        }
    }

    /**
     * Create a new business profile
     */
    createProfile(data) {
        const profiles = this.getProfiles();
        const now = new Date().toISOString();
        const profile = {
            id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            businessName: (data.businessName || 'My Business').trim(),
            natureOfBusiness: (data.natureOfBusiness || 'Commercial Services').trim(),
            purposeOfOperations: (data.purposeOfOperations || 'Customer Outreach').trim(),
            productsOrServices: (data.productsOrServices || data.whatYouDo || '').trim(),
            link: (data.link || data.websiteUrl || 'https://codez48.netlify.app').trim(),
            cta: (data.cta || 'Reply to this message for details.').trim(),
            customTemplate: (data.customTemplate || '').trim(),
            createdAt: now,
            updatedAt: now
        };

        profiles.push(profile);
        this.saveProfiles(profiles);
        return profile;
    }

    /**
     * Update an existing profile
     */
    updateProfile(id, updatedFields) {
        const profiles = this.getProfiles();
        const idx = profiles.findIndex(p => p.id === id);
        if (idx === -1) return null;

        profiles[idx] = {
            ...profiles[idx],
            ...updatedFields,
            updatedAt: new Date().toISOString()
        };

        this.saveProfiles(profiles);
        return profiles[idx];
    }

    /**
     * Delete a profile by ID
     */
    deleteProfile(id) {
        let profiles = this.getProfiles();
        const before = profiles.length;
        profiles = profiles.filter(p => p.id !== id);
        this.saveProfiles(profiles);
        return profiles.length < before;
    }

    /**
     * Display all saved profiles in terminal
     */
    displayProfilesList(profiles = null) {
        const list = profiles || this.getProfiles();
        if (list.length === 0) {
            console.log('\n\x1b[33mNo saved business profiles found.\x1b[0m');
            return;
        }

        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║                   SAVED USER BUSINESS DETAILS & PROFILES                     ║`);
        console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
        list.forEach((p, i) => {
            console.log(`║  \x1b[1m\x1b[32m[${i + 1}] ${p.businessName}\x1b[0m`);
            console.log(`║      • Nature of Business:    \x1b[33m${p.natureOfBusiness}\x1b[0m`);
            console.log(`║      • Purpose of Operations: \x1b[35m${p.purposeOfOperations}\x1b[0m`);
            if (p.productsOrServices) {
                console.log(`║      • Products / Offerings:  ${p.productsOrServices}`);
            }
            console.log(`║      • Link / Website:        \x1b[4m${p.link}\x1b[0m`);
            console.log(`║      • Call to Action (CTA):  ${p.cta}`);
            if (i < list.length - 1) {
                console.log(`║  ─────────────────────────────────────────────────────────────────────────────`);
            }
        });
        console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);
    }

    /**
     * Interactive profile selection or first-time collection wizard
     * Returns: { businessName, natureOfBusiness, purposeOfOperations, whatYouDo, link, cta }
     */
    async selectOrCollectProfile(goalText = '', rl = null) {
        const profiles = this.getProfiles();

        // SCENARIO 1: Existing profiles found -> Let user select or manage
        if (profiles.length > 0) {
            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║             CODEZ48 PILOT — BUSINESS PROFILE SELECTOR                         ║`);
            console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
            console.log(`║ Choose which business details to use for this WhatsApp campaign:             ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

            profiles.forEach((p, idx) => {
                console.log(`  \x1b[32m[${idx + 1}]\x1b[0m \x1b[1m${p.businessName}\x1b[0m — ${p.natureOfBusiness} (\x1b[35m${p.purposeOfOperations}\x1b[0m)`);
            });
            console.log(`  \x1b[33m[n]\x1b[0m Create a new business profile`);
            console.log(`  \x1b[33m[m]\x1b[0m Manage existing profiles (update / delete)`);

            const choice = (await this._ask(`\nSelect profile (1-${profiles.length}, 'n' for new, 'm' to manage) [Default 1]: `, rl)).trim().toLowerCase();

            if (choice === 'm') {
                await this.interactiveManageProfiles(rl);
                return await this.selectOrCollectProfile(goalText, rl);
            } else if (choice === 'n') {
                return await this._collectNewProfileInteractively(rl);
            } else {
                let selectedIdx = parseInt(choice, 10) - 1;
                if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= profiles.length) {
                    selectedIdx = 0;
                }
                const selected = profiles[selectedIdx];
                console.log(`\n\x1b[32m✔ Selected Profile:\x1b[0m \x1b[1m${selected.businessName}\x1b[0m (${selected.natureOfBusiness})`);
                return {
                    businessName: selected.businessName,
                    natureOfBusiness: selected.natureOfBusiness,
                    purposeOfOperations: selected.purposeOfOperations,
                    whatYouDo: selected.productsOrServices,
                    link: selected.link,
                    cta: selected.cta,
                    profileId: selected.id
                };
            }
        }

        // SCENARIO 2: First-Time User -> Prompt and save profile automatically
        console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║        FIRST-TIME SETUP: REGISTER YOUR BUSINESS PROFILE                       ║`);
        console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
        console.log(`║ Welcome to WhatsApp Automation! Since this is your first time, please enter   ║`);
        console.log(`║ your business details. They will be saved so you can reuse or update later:   ║`);
        console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n`);

        return await this._collectNewProfileInteractively(rl);
    }

    /**
     * Collect a new profile interactively and save it
     */
    async _collectNewProfileInteractively(rl = null) {
        console.log(`\x1b[33mPlease enter your business details:\x1b[0m`);

        let businessName = (await this._ask(`1. Business / Brand Name: `, rl)).trim();
        while (!businessName) {
            console.log(`\x1b[31mBusiness name is required.\x1b[0m`);
            businessName = (await this._ask(`1. Business / Brand Name: `, rl)).trim();
        }

        let natureOfBusiness = (await this._ask(`2. Nature of Business (e.g. Retail, Real Estate, IT, Coaching): `, rl)).trim();
        if (!natureOfBusiness) natureOfBusiness = 'Commercial Enterprise';

        let purposeOfOperations = (await this._ask(`3. Purpose of Operations / Campaign (e.g. Sales Promotion, Customer Outreach): `, rl)).trim();
        if (!purposeOfOperations) purposeOfOperations = 'Customer Outreach & Engagement';

        let productsOrServices = (await this._ask(`4. Products / Core Offerings: `, rl)).trim();
        if (!productsOrServices) productsOrServices = 'Products & Services';

        let link = (await this._ask(`5. Website / Product URL [Default: https://codez48.netlify.app]: `, rl)).trim();
        if (!link) link = 'https://codez48.netlify.app';

        let cta = (await this._ask(`6. Call to Action (CTA) [Default: Reply to this message for details]: `, rl)).trim();
        if (!cta) cta = 'Reply to this message for details.';

        const profile = this.createProfile({
            businessName,
            natureOfBusiness,
            purposeOfOperations,
            productsOrServices,
            link,
            cta
        });

        console.log(`\n\x1b[32m✔ Business details successfully registered and saved!\x1b[0m`);
        console.log(`You can view or update these details anytime using \x1b[36mnode cli.js details\x1b[0m.\n`);

        return {
            businessName: profile.businessName,
            natureOfBusiness: profile.natureOfBusiness,
            purposeOfOperations: profile.purposeOfOperations,
            whatYouDo: profile.productsOrServices,
            link: profile.link,
            cta: profile.cta,
            profileId: profile.id
        };
    }

    /**
     * Standalone interactive management menu (List, Add, Edit, Delete)
     */
    async interactiveManageProfiles(rl = null) {
        while (true) {
            const profiles = this.getProfiles();
            console.log(`\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════════════╗`);
            console.log(`║                   MANAGE BUSINESS PROFILES & DETAILS                          ║`);
            console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`);
            console.log(`║  [1] View All Saved Profiles (${profiles.length} registered)                                ║`);
            console.log(`║  [2] Add New Business Profile                                                 ║`);
            console.log(`║  [3] Update / Edit Existing Profile                                           ║`);
            console.log(`║  [4] Delete a Profile                                                         ║`);
            console.log(`║  [q] Return / Exit                                                            ║`);
            console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

            const choice = (await this._ask(`Select option (1-4 or q): `, rl)).trim().toLowerCase();

            if (choice === '1') {
                this.displayProfilesList(profiles);
            } else if (choice === '2') {
                await this._collectNewProfileInteractively(rl);
            } else if (choice === '3') {
                if (profiles.length === 0) {
                    console.log(`\x1b[33mNo profiles available to update.\x1b[0m`);
                    continue;
                }
                this.displayProfilesList(profiles);
                const pickStr = (await this._ask(`Enter profile number to edit (1-${profiles.length}) [or c to cancel]: `, rl)).trim();
                const pick = parseInt(pickStr, 10) - 1;
                if (!isNaN(pick) && pick >= 0 && pick < profiles.length) {
                    const target = profiles[pick];
                    console.log(`\nEditing profile: \x1b[1m${target.businessName}\x1b[0m (Press Enter to keep current value)`);

                    const newName = (await this._ask(`Business Name [${target.businessName}]: `, rl)).trim();
                    const newNature = (await this._ask(`Nature of Business [${target.natureOfBusiness}]: `, rl)).trim();
                    const newPurpose = (await this._ask(`Purpose of Operations [${target.purposeOfOperations}]: `, rl)).trim();
                    const newProducts = (await this._ask(`Products/Services [${target.productsOrServices || 'N/A'}]: `, rl)).trim();
                    const newLink = (await this._ask(`Website URL [${target.link}]: `, rl)).trim();
                    const newCta = (await this._ask(`CTA [${target.cta}]: `, rl)).trim();

                    const updates = {};
                    if (newName) updates.businessName = newName;
                    if (newNature) updates.natureOfBusiness = newNature;
                    if (newPurpose) updates.purposeOfOperations = newPurpose;
                    if (newProducts) updates.productsOrServices = newProducts;
                    if (newLink) updates.link = newLink;
                    if (newCta) updates.cta = newCta;

                    this.updateProfile(target.id, updates);
                    console.log(`\x1b[32m✔ Profile successfully updated!\x1b[0m`);
                }
            } else if (choice === '4') {
                if (profiles.length === 0) {
                    console.log(`\x1b[33mNo profiles available to delete.\x1b[0m`);
                    continue;
                }
                this.displayProfilesList(profiles);
                const pickStr = (await this._ask(`Enter profile number to delete (1-${profiles.length}) [or c to cancel]: `, rl)).trim();
                const pick = parseInt(pickStr, 10) - 1;
                if (!isNaN(pick) && pick >= 0 && pick < profiles.length) {
                    const target = profiles[pick];
                    const confirm = (await this._ask(`Are you sure you want to delete "${target.businessName}"? (y/N): `, rl)).trim().toLowerCase();
                    if (confirm === 'y' || confirm === 'yes') {
                        this.deleteProfile(target.id);
                        console.log(`\x1b[32m✔ Profile "${target.businessName}" deleted.\x1b[0m`);
                    } else {
                        console.log(`Deletion cancelled.`);
                    }
                }
            } else if (choice === 'q' || choice === 'exit' || choice === 'quit') {
                break;
            }
        }
    }
}

module.exports = new UserDetailsManager();
