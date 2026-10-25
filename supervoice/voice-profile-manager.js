const fs = require('fs');
const path = require('path');

class VoiceProfileManager {
    constructor() {
        this.voicesDir = path.resolve(__dirname, '../.codez48_voices');
        if (!fs.existsSync(this.voicesDir)) {
            fs.mkdirSync(this.voicesDir, { recursive: true });
        }
        this.metadataFile = path.join(this.voicesDir, 'profiles.json');
        this._initMetadata();
    }

    _initMetadata() {
        if (!fs.existsSync(this.metadataFile)) {
            const defaultProfiles = {
                default: 'voice_1',
                profiles: {
                    voice_1: {
                        name: 'Voice 1 (Primary Tamil)',
                        transcript: 'வணக்கம், நான் கோடஸ்48 சூப்பர்வாய்ஸ் குரல் உதவியாளர்.',
                        audioPath: null,
                        createdAt: new Date().toISOString()
                    },
                    voice_2: {
                        name: 'Voice 2 (Alternative Tamil)',
                        transcript: 'உங்களுக்கு எப்படி உதவ முடியும்?',
                        audioPath: null,
                        createdAt: new Date().toISOString()
                    }
                }
            };
            fs.writeFileSync(this.metadataFile, JSON.stringify(defaultProfiles, null, 2), 'utf8');
        }
    }

    getMetadata() {
        try {
            if (fs.existsSync(this.metadataFile)) {
                return JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
            }
        } catch (e) {}
        return { default: 'voice_1', profiles: {} };
    }

    saveMetadata(data) {
        fs.writeFileSync(this.metadataFile, JSON.stringify(data, null, 2), 'utf8');
    }

    listProfiles() {
        const meta = this.getMetadata();
        const list = [];
        for (const [id, profile] of Object.entries(meta.profiles)) {
            list.push({
                id,
                ...profile,
                isDefault: meta.default === id
            });
        }
        return list;
    }

    getDefaultProfile() {
        const meta = this.getMetadata();
        // Prefer custom user voice profile with uploaded audio if available
        for (const [id, profile] of Object.entries(meta.profiles)) {
            if (profile.audioPath && fs.existsSync(profile.audioPath)) {
                return { id, ...profile };
            }
        }
        const defId = meta.default;
        if (defId && meta.profiles[defId]) {
            return { id: defId, ...meta.profiles[defId] };
        }
        const keys = Object.keys(meta.profiles);
        if (keys.length > 0) {
            return { id: keys[0], ...meta.profiles[keys[0]] };
        }
        return null;
    }

    setDefaultProfile(id) {
        const meta = this.getMetadata();
        if (meta.profiles[id]) {
            meta.default = id;
            this.saveMetadata(meta);
            return true;
        }
        return false;
    }

    createProfile(id, name, transcript, sourceAudioPath) {
        const meta = this.getMetadata();
        const safeId = id.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        let targetAudioPath = null;
        if (sourceAudioPath && fs.existsSync(sourceAudioPath)) {
            targetAudioPath = path.join(this.voicesDir, `${safeId}.wav`);
            fs.copyFileSync(sourceAudioPath, targetAudioPath);
        }

        meta.profiles[safeId] = {
            name: name || safeId,
            transcript: transcript || 'வணக்கம்',
            audioPath: targetAudioPath,
            createdAt: new Date().toISOString()
        };

        if (!meta.default) {
            meta.default = safeId;
        }

        this.saveMetadata(meta);
        return { id: safeId, ...meta.profiles[safeId] };
    }

    /**
     * Get a profile by its ID or Name.
     * @param {string} id - Profile ID or Name
     * @returns {object|null} Profile data with id field, or null
     */
    getProfileById(id) {
        const meta = this.getMetadata();
        if (id && meta.profiles[id]) {
            return { id, ...meta.profiles[id] };
        }
        for (const [key, profile] of Object.entries(meta.profiles)) {
            if (key.toLowerCase() === String(id).toLowerCase() || (profile.name && profile.name.toLowerCase().includes(String(id).toLowerCase()))) {
                return { id: key, ...profile };
            }
        }
        return null;
    }

    getProfile(id) {
        return this.getProfileById(id) || this.getDefaultProfile();
    }

    /**
     * Update an existing profile's fields (e.g., voice_id after ElevenLabs enrollment).
     * @param {string} id - Profile ID to update
     * @param {object} updates - Fields to merge into the profile
     * @returns {object|null} Updated profile, or null if not found
     */
    updateProfile(id, updates) {
        const meta = this.getMetadata();
        if (!meta.profiles[id]) {
            console.warn(`[VOICE PROFILE] Profile '${id}' not found for update.`);
            return null;
        }
        Object.assign(meta.profiles[id], updates);
        meta.profiles[id].updatedAt = new Date().toISOString();
        this.saveMetadata(meta);
        console.log(`[VOICE PROFILE] Updated profile '${id}': ${Object.keys(updates).join(', ')}`);
        return { id, ...meta.profiles[id] };
    }

    /**
     * Find the first profile that has an enrolled ElevenLabs voice_id.
     * @returns {object|null} Profile with voice_id, or null
     */
    getProfileWithVoiceId() {
        const meta = this.getMetadata();
        for (const [id, profile] of Object.entries(meta.profiles)) {
            if (profile.voice_id) {
                return { id, ...profile };
            }
        }
        return null;
    }
}

module.exports = new VoiceProfileManager();
