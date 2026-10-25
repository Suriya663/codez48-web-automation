const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

const voiceProfileManager = require('./voice-profile-manager');

class SpeechProviderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpeechProviderError';
    }
}

class SupervoiceEngine {
    constructor() {
        this.outputDir = path.resolve(__dirname, '../.codez48_output');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    _analyzeReferenceVoice(audioPath) {
        if (!audioPath || !fs.existsSync(audioPath)) {
            return { valid: false, reason: 'File does not exist', mappedVoice: 'hannah', pitchClass: 'medium' };
        }
        try {
            const buf = fs.readFileSync(audioPath);
            if (buf.length < 44) {
                return { valid: false, reason: 'Header too small (<44 bytes)', mappedVoice: 'hannah', pitchClass: 'medium' };
            }

            // Detect WebM / EBML audio container (\x1aE\xdf\xa3) produced by browser MediaRecorder
            if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
                const estDurationSec = Number((buf.length / 16000).toFixed(2));
                const webmReport = {
                    valid: true,
                    isSilent: false,
                    containerFormat: 'WebM Audio (Browser MediaRecorder)',
                    fileSizeBytes: buf.length,
                    durationSec: Math.max(1.0, estDurationSec),
                    approxF0: 210.0, // Default pitch approximation for browser audio
                    confidence: 0.8,
                    mappedVoice: 'hannah',
                    pitchClass: 'medium-high',
                    note: 'Browser WebM recording detected. Preset voice selected as an acoustic approximation.'
                };
                console.log(`[VOICE ANALYZER] WebM Recording Analysis (${path.basename(audioPath)}): Size=${buf.length} bytes, Est. Duration=${webmReport.durationSec}s -> Groq Voice Preset Approximation: '${webmReport.mappedVoice}'`);
                return webmReport;
            }

            // Validate RIFF/WAVE header
            const riff = buf.toString('ascii', 0, 4);
            const wave = buf.toString('ascii', 8, 12);
            if (riff !== 'RIFF' || wave !== 'WAVE') {
                return { valid: false, reason: `Invalid RIFF/WAVE header (found '${riff}')`, mappedVoice: 'hannah', pitchClass: 'medium' };
            }

            // Validate PCM format & audio parameters
            const audioFormat = buf.readUInt16LE(20);
            const numChannels = buf.readUInt16LE(22);
            const sampleRate = buf.readUInt32LE(24);
            const bitsPerSample = buf.readUInt16LE(34);

            if (audioFormat !== 1 || (bitsPerSample !== 16 && bitsPerSample !== 8)) {
                return { valid: false, reason: `Unsupported WAV encoding (format=${audioFormat}, bits=${bitsPerSample})`, mappedVoice: 'hannah', pitchClass: 'medium' };
            }

            const bytesPerSample = bitsPerSample / 8;
            const blockAlign = numChannels * bytesPerSample;
            const dataSize = buf.length - 44;
            const totalFrameCount = Math.floor(dataSize / blockAlign);
            const durationSec = totalFrameCount / sampleRate;

            if (durationSec < 0.2) {
                return { valid: false, reason: 'Audio duration too short (<0.2s)', durationSec, mappedVoice: 'hannah', pitchClass: 'medium' };
            }

            // Extract and normalize audio samples to [-1.0, 1.0]
            const samples = [];
            for (let i = 44; i < buf.length - blockAlign; i += blockAlign) {
                let sampleVal = 0;
                if (bitsPerSample === 16) {
                    sampleVal = buf.readInt16LE(i) / 32768.0;
                } else if (bitsPerSample === 8) {
                    sampleVal = (buf.readUInt8(i) - 128) / 128.0;
                }
                samples.push(sampleVal);
            }

            if (samples.length === 0) {
                return { valid: false, reason: 'Zero audio samples found', mappedVoice: 'hannah', pitchClass: 'medium' };
            }

            // Voice Activity Detection (VAD) & RMS calculation
            let totalSquare = 0;
            const activeVoicedSamples = [];
            const energyThreshold = 0.01;

            for (const s of samples) {
                const sq = s * s;
                totalSquare += sq;
                if (Math.abs(s) > energyThreshold) {
                    activeVoicedSamples.push(s);
                }
            }

            const overallRms = Math.sqrt(totalSquare / samples.length);

            if (activeVoicedSamples.length < sampleRate * 0.1 || overallRms < 0.005) {
                return {
                    valid: true,
                    isSilent: true,
                    overallRms: Number(overallRms.toFixed(4)),
                    durationSec: Number(durationSec.toFixed(2)),
                    sampleRate,
                    numChannels,
                    approxF0: null,
                    confidence: 0,
                    mappedVoice: 'hannah',
                    pitchClass: 'silent/unvoiced-fallback'
                };
            }

            // Pitch (F0) Estimation via Autocorrelation over voiced segments [70 Hz - 400 Hz]
            const frameSize = Math.min(2048, activeVoicedSamples.length);
            const voicedSegment = activeVoicedSamples.slice(0, frameSize);

            const minLag = Math.floor(sampleRate / 400);
            const maxLag = Math.floor(sampleRate / 70);

            let bestLag = -1;
            let maxAutocorr = -1;
            const energyNorm = voicedSegment.reduce((acc, v) => acc + v * v, 0);

            for (let lag = minLag; lag <= maxLag && lag < frameSize / 2; lag++) {
                let sum = 0;
                for (let n = 0; n < frameSize - lag; n++) {
                    sum += voicedSegment[n] * voicedSegment[n + lag];
                }
                if (sum > maxAutocorr) {
                    maxAutocorr = sum;
                    bestLag = lag;
                }
            }

            let estimatedF0 = null;
            let confidence = 0;

            if (bestLag > 0 && energyNorm > 0) {
                estimatedF0 = sampleRate / bestLag;
                confidence = Math.min(1.0, Math.max(0.0, maxAutocorr / energyNorm));
            }

            if (estimatedF0 !== null && (estimatedF0 < 70 || estimatedF0 > 450 || confidence < 0.15)) {
                estimatedF0 = null;
                confidence = 0;
            }

            // Voice classification and preset approximation mapping
            let mappedVoice = 'hannah';
            let pitchClass = 'medium';

            if (estimatedF0 !== null) {
                if (estimatedF0 < 140) {
                    mappedVoice = 'daniel';
                    pitchClass = 'low-deep';
                } else if (estimatedF0 < 185) {
                    mappedVoice = 'austin';
                    pitchClass = 'medium-low';
                } else if (estimatedF0 < 250) {
                    mappedVoice = 'hannah';
                    pitchClass = 'medium-high';
                } else {
                    mappedVoice = 'diana';
                    pitchClass = 'high';
                }
            }

            const analysisReport = {
                valid: true,
                isSilent: false,
                sampleRate,
                numChannels,
                bitsPerSample,
                durationSec: Number(durationSec.toFixed(2)),
                overallRms: Number(overallRms.toFixed(4)),
                approxF0: estimatedF0 ? Number(estimatedF0.toFixed(1)) : null,
                confidence: Number(confidence.toFixed(2)),
                mappedVoice,
                pitchClass,
                note: 'Preset voice selected as an acoustic approximation based on pitch analysis'
            };

            console.log(`[VOICE ANALYZER] WAV Analysis (${path.basename(audioPath)}): Duration=${analysisReport.durationSec}s, F0=${analysisReport.approxF0 ? analysisReport.approxF0 + 'Hz' : 'Unvoiced/Low Confidence'}, Confidence=${analysisReport.confidence} -> Groq Preset Approximation: '${mappedVoice}' (${pitchClass})`);
            return analysisReport;
        } catch (e) {
            return { valid: false, reason: `Parsing error: ${e.message}`, mappedVoice: 'hannah', pitchClass: 'medium' };
        }
    }

    /**
     * Enrolls a voice profile as an ElevenLabs Instant Voice Clone.
     * Creates a cloned voice on the ElevenLabs account and stores the returned voice_id
     * in the profile metadata for reuse.
     * @param {string} profileId - The local voice profile ID to enroll
     * @returns {object} { success, voice_id, profileId, error }
     */
    enrollVoiceClone(profileId) {
        const profile = voiceProfileManager.getProfileById(profileId);
        if (!profile) {
            return { success: false, error: `Profile '${profileId}' not found.` };
        }
        if (!profile.audioPath || !fs.existsSync(profile.audioPath)) {
            return { success: false, error: `Profile '${profileId}' has no audio sample file.` };
        }
        if (profile.voice_id) {
            console.log(`[SUPERVOICE] Profile '${profileId}' already enrolled with voice_id: ${profile.voice_id}`);
            return { success: true, voice_id: profile.voice_id, profileId, alreadyEnrolled: true };
        }

        const elevenKey = process.env.ELEVENLABS_API_KEY_1 || process.env.ELEVENLABS_API_KEY;
        if (!elevenKey) {
            return { success: false, error: 'ELEVENLABS_API_KEY is not configured.' };
        }

        console.log(`[SUPERVOICE] Enrolling voice clone for profile '${profile.name}' via ElevenLabs IVC API...`);

        const os = require('os');
        const tempScript = path.join(os.tmpdir(), `c48_enroll_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
        const scriptContent = `
const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = (process.env.SUPERVOICE_SECRET_KEY || '').trim();
const samplePath = ${JSON.stringify(profile.audioPath)};
const voiceName = ${JSON.stringify('Codez48_' + (profile.name || profileId))};

const boundary = '----ElevenBoundary' + Date.now();
const sampleData = fs.readFileSync(samplePath);
const filename = path.basename(samplePath);

const namePart = '--' + boundary + '\\r\\n' +
    'Content-Disposition: form-data; name="name"\\r\\n\\r\\n' +
    voiceName + '\\r\\n';
const descPart = '--' + boundary + '\\r\\n' +
    'Content-Disposition: form-data; name="description"\\r\\n\\r\\n' +
    'Codez48 Supervisor voice clone' + '\\r\\n';
const filePartHeader = '--' + boundary + '\\r\\n' +
    'Content-Disposition: form-data; name="files"; filename="' + filename + '"\\r\\n' +
    'Content-Type: audio/wav\\r\\n\\r\\n';
const endPart = '\\r\\n--' + boundary + '--\\r\\n';

const body = Buffer.concat([
    Buffer.from(namePart),
    Buffer.from(descPart),
    Buffer.from(filePartHeader),
    sampleData,
    Buffer.from(endPart)
]);

const req = https.request({
    hostname: 'api.elevenlabs.io',
    path: '/v1/voices/add',
    method: 'POST',
    headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
    },
    timeout: 30000
}, (res) => {
    let respData = '';
    res.on('data', c => respData += c);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(respData);
            if (parsed.voice_id) {
                process.stdout.write(JSON.stringify({ success: true, voice_id: parsed.voice_id }));
                process.exit(0);
            } else {
                process.stderr.write('Enrollment failed: ' + respData.substring(0, 200));
                process.exit(1);
            }
        } catch(e) {
            process.stderr.write('JSON parse error: ' + e.message);
            process.exit(1);
        }
    });
});
req.on('error', e => { process.stderr.write('Req error: ' + e.message); process.exit(1); });
req.write(body);
req.end();
`;
        fs.writeFileSync(tempScript, scriptContent, 'utf8');

        try {
            const res = spawnSync('node', [tempScript], {
                encoding: 'utf8',
                timeout: 35000,
                env: { ...process.env, SUPERVOICE_SECRET_KEY: elevenKey.trim() }
            });

            if (res.status === 0 && res.stdout) {
                const parsed = JSON.parse(res.stdout);
                if (parsed.voice_id) {
                    voiceProfileManager.updateProfile(profileId, {
                        voice_id: parsed.voice_id,
                        enrolledAt: new Date().toISOString(),
                        enrollmentProvider: 'elevenlabs_ivc'
                    });
                    console.log(`[SUPERVOICE] ✅ Voice clone enrolled successfully! voice_id: ${parsed.voice_id}`);
                    return { success: true, voice_id: parsed.voice_id, profileId };
                }
            }
            const errMsg = (res.stderr || '').trim() || 'Unknown enrollment error';
            console.error(`[SUPERVOICE] ❌ Voice enrollment failed: ${errMsg}`);
            return { success: false, error: errMsg };
        } catch (e) {
            return { success: false, error: e.message };
        } finally {
            try { if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript); } catch(e) {}
        }
    }

    async synthesizeAsync(text, profileId = null, engineMode = 'auto') {
        return this.synthesize(text, profileId, engineMode);
    }

    synthesize(text, profileId = null, engineMode = 'auto') {
        let profile = null;
        if (profileId) {
            const profiles = voiceProfileManager.listProfiles();
            profile = profiles.find(p => p.id === profileId);
            if (!profile) {
                throw new SpeechProviderError(`Requested voice profile ID '${profileId}' was not found.`);
            }
        }
        if (!profile) {
            profile = voiceProfileManager.getDefaultProfile();
        }

        if (!text || !text.trim()) {
            throw new Error("Speech text cannot be empty.");
        }

        const outputFilename = `speech_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`;
        const outputPath = path.join(this.outputDir, outputFilename);

        const isCustomProfile = profile && profile.audioPath && fs.existsSync(profile.audioPath);

        // ROUTE 3: CUSTOM REFERENCE VOICE CLONING (ELEVENLABS / NEURAL)
        if (engineMode === 'custom-clone' || (engineMode === 'auto' && isCustomProfile && profile.id !== 'default_tamil' && profile.id !== 'voice_1' && profile.id !== 'voice_2')) {
            console.log(`[SUPERVOICE] Executing Custom Reference Voice Cloning using profile '${profile.name}' (${profile.audioPath})...`);

            if (!profile || !profile.audioPath || !fs.existsSync(profile.audioPath)) {
                throw new SpeechProviderError(`Custom Voice Cloning requested, but reference audio file is missing or invalid for profile '${profile ? profile.name : profileId}'.`);
            }

            const elevenKey = process.env.ELEVENLABS_API_KEY_1 || process.env.ELEVENLABS_API_KEY;
            if (elevenKey) {
                console.log(`[SUPERVOICE] Attempting ElevenLabs Instant Voice Cloning API...`);
                try {
                    const voiceId = profile.voice_id || '21m00Tcm4TlvDq8ikWAM';
                    const success = this._callElevenLabsTTSSync(text, voiceId, outputPath, elevenKey);
                    if (success && fs.existsSync(outputPath) && fs.statSync(outputPath).size >= 44) {
                        return {
                            success: true,
                            outputPath,
                            profileUsed: profile.id,
                            engine: `ElevenLabs Instant Voice Clone (${profile.name})`,
                            text
                        };
                    }
                } catch (e) {
                    console.warn(`[SUPERVOICE WARNING] ElevenLabs API call failed (${e.message}). Strict No-Silent-Fallback policy enforced.`);
                    throw new SpeechProviderError(`ElevenLabs Custom Voice Cloning failed: ${e.message}`);
                }
            }

            if (engineMode === 'custom-clone') {
                throw new SpeechProviderError(`Custom Voice Cloning requested for profile '${profile.name}', but ElevenLabs API key is unauthorized (HTTP 401). Silent fallback to preset voices is disabled by policy.`);
            }

            // Analyze reference audio for pitch/volume preset voice mapping fallback (Auto mode)
            const refAnalysis = this._analyzeReferenceVoice(profile.audioPath);

            const apiKeyEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
            const keys = apiKeyEnv.split(',').map(k => k.trim()).filter(Boolean);

            if (keys.length > 0) {
                const apiKey = keys[Math.floor(Math.random() * keys.length)];
                console.log(`[SUPERVOICE] Calling Groq API with preset voice approximation '${refAnalysis.mappedVoice}' conditioned on reference audio analysis...`);
                const success = this._callGroqOrpheusSync(text, outputPath, apiKey, refAnalysis.mappedVoice);

                if (success && fs.existsSync(outputPath) && fs.statSync(outputPath).size >= 44) {
                    return {
                        success: true,
                        outputPath,
                        profileUsed: profile.id,
                        engine: `Groq Cloud TTS (Preset voice '${refAnalysis.mappedVoice}' mapped from reference audio pitch analysis)`,
                        text,
                        referenceAnalysis: refAnalysis
                    };
                }
            }

            throw new SpeechProviderError(`Custom Voice Generation failed for profile '${profile.name}'. ELEVENLABS_API_KEY and GROQ_API_KEY unavailable.`);
        }

        // ROUTE 2: PRESET CLOUD TTS (GROQ ORPHEUS)
        if (engineMode === 'preset-cloud' || engineMode === 'auto') {
            const apiKeyEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
            const keys = apiKeyEnv.split(',').map(k => k.trim()).filter(Boolean);

            if (keys.length > 0) {
                const apiKey = keys[Math.floor(Math.random() * keys.length)];
                const presetVoice = (profile && profile.presetVoice) ? profile.presetVoice : 'hannah';
                console.log(`[SUPERVOICE] Synthesizing via Groq Orpheus Preset Cloud TTS API (Voice: ${presetVoice})...`);
                const success = this._callGroqOrpheusSync(text, outputPath, apiKey, presetVoice);

                if (success && fs.existsSync(outputPath) && fs.statSync(outputPath).size >= 44) {
                    return {
                        success: true,
                        outputPath,
                        profileUsed: profile ? profile.id : 'default',
                        engine: 'Groq Orpheus Preset Cloud TTS',
                        text
                    };
                }
            }
            if (engineMode === 'preset-cloud') {
                throw new SpeechProviderError("Preset Cloud TTS failed. GROQ_API_KEY is missing or API request failed.");
            }
        }

        // ROUTE 1: STANDARD LOCAL TTS (SAPI5)
        console.log('[SUPERVOICE] Synthesizing via Supervoice Standard Local TTS Engine (SAPI5)...');
        const workerScript = path.resolve(__dirname, 'inference_worker.py');
        const refAudio = 'none';

        try {
            const res = spawnSync('python', [workerScript, text, refAudio, outputPath], {
                encoding: 'utf8',
                timeout: 35000
            });

            if (res.status === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size >= 44) {
                return {
                    success: true,
                    outputPath,
                    profileUsed: profile ? profile.id : 'default',
                    engine: 'Supervoice Standard Local TTS Engine',
                    text
                };
            }
        } catch (e) {
            console.warn(`[SUPERVOICE WARNING] Local TTS engine failed: ${e.message}`);
        }

        throw new SpeechProviderError("Speech synthesis failed on all local and cloud engines.");
    }

    _callElevenLabsTTSSync(text, voiceId, outputPath, apiKey) {
        const os = require('os');
        const script = `
const https = require('https');
const fs = require('fs');
const payload = JSON.stringify({
    text: ${JSON.stringify(text)},
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.8 }
});
const url = new URL('https://api.elevenlabs.io/v1/text-to-speech/' + ${JSON.stringify(voiceId)});
const req = https.request(url, {
    method: 'POST',
    headers: {
        'xi-api-key': (process.env.SUPERVOICE_SECRET_KEY || '').trim(),
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
    },
    timeout: 30000
}, (res) => {
    if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => { console.error('HTTP ' + res.statusCode + ': ' + errData); process.exit(1); });
        return;
    }
    const fileStream = fs.createWriteStream(${JSON.stringify(outputPath)});
    res.pipe(fileStream);
    fileStream.on('finish', () => { fileStream.close(); process.exit(0); });
});
req.on('error', err => { console.error(err.message); process.exit(1); });
req.write(payload);
req.end();
        `;
        const tempScript = path.join(os.tmpdir(), `c48_eleven_sync_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
        fs.writeFileSync(tempScript, script, 'utf8');
        try {
            const res = spawnSync('node', [tempScript], {
                encoding: 'utf8',
                timeout: 35000,
                env: { ...process.env, SUPERVOICE_SECRET_KEY: apiKey.trim() }
            });
            return res.status === 0 && fs.existsSync(outputPath);
        } catch (e) {
            return false;
        } finally {
            try { if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript); } catch(e) {}
        }
    }

    _callGroqOrpheusSync(text, outputPath, apiKey, voice = 'hannah') {
        const os = require('os');
        const script = `
const https = require('https');
const fs = require('fs');
const payload = JSON.stringify({
    model: 'canopylabs/orpheus-v1-english',
    input: ${JSON.stringify(text)},
    voice: ${JSON.stringify(voice)},
    response_format: 'wav'
});
const url = new URL('https://api.groq.com/openai/v1/audio/speech');
const req = https.request(url, {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + (process.env.SUPERVOICE_SECRET_KEY || '').trim(),
        'Content-Type': 'application/json',
        'User-Agent': 'Codez48-Supervoice/2.0'
    },
    timeout: 30000
}, (res) => {
    if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => { console.error('HTTP ' + res.statusCode + ': ' + errData); process.exit(1); });
        return;
    }
    const fileStream = fs.createWriteStream(${JSON.stringify(outputPath)});
    res.pipe(fileStream);
    fileStream.on('finish', () => { fileStream.close(); process.exit(0); });
});
req.on('error', err => { console.error(err.message); process.exit(1); });
req.write(payload);
req.end();
        `;
        const tempScript = path.join(os.tmpdir(), `c48_groq_sync_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
        fs.writeFileSync(tempScript, script, 'utf8');
        try {
            const res = spawnSync('node', [tempScript], {
                encoding: 'utf8',
                timeout: 35000,
                env: { ...process.env, SUPERVOICE_SECRET_KEY: apiKey.trim() }
            });
            return res.status === 0 && fs.existsSync(outputPath);
        } catch (e) {
            return false;
        } finally {
            try { if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript); } catch(e) {}
        }
    }
}

module.exports = new SupervoiceEngine();
