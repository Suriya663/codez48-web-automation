/**
 * CODEZ48 SUPERVISOR — SPEECH TO TEXT (STT)
 *
 * Provides two paths:
 *  1. Browser MediaRecorder audio blob (WebM) → write to temp file →
 *     return the blob path to the Supervisor for classification
 *  2. Windows SAPI speech recognition via PowerShell
 *     (For CLI usage when no browser is available)
 *
 * Note: True online speech recognition (Google/Whisper/Azure) is not
 * configured in .env. This module uses the available local SAPI5 recognizer
 * and provides a path for future integration with the existing Groq API.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const OUTPUT_DIR = path.resolve(__dirname, '../.codez48_output');

// ---------------------------------------------------------------------------
// Groq Whisper STT (if GROQ_API_KEYS configured)
// ---------------------------------------------------------------------------

async function transcribeWithGroq(audioPath) {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        try {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            for (const l of lines) {
                const [k, ...vs] = l.split('=');
                if (k && k.trim() && !process.env[k.trim()]) process.env[k.trim()] = vs.join('=').trim();
            }
        } catch (e) {}
    }

    const keys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return null;

    const apiKey = keys[Math.floor(Math.random() * keys.length)];

    // Use Groq Whisper transcription
    // We write a temp Node.js script to do multipart upload (spawnSync compatible)
    const tempScript = path.join(OUTPUT_DIR, `whisper_${Date.now()}.js`);
    const scriptContent = `
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const audioPath = ${JSON.stringify(audioPath)};
const apiKey = ${JSON.stringify(apiKey)};

// Build multipart/form-data manually
const boundary = '----GroqBoundary' + Date.now();
const filename = path.basename(audioPath);
const mimeType = filename.endsWith('.webm') ? 'audio/webm' : 'audio/wav';
const audioData = fs.readFileSync(audioPath);

const partHeader = '--' + boundary + '\\r\\n' +
    'Content-Disposition: form-data; name="file"; filename="' + filename + '"\\r\\n' +
    'Content-Type: ' + mimeType + '\\r\\n\\r\\n';
const modelPart = '--' + boundary + '\\r\\n' +
    'Content-Disposition: form-data; name="model"\\r\\n\\r\\n' +
    'whisper-large-v3\\r\\n';
const endPart = '--' + boundary + '--\\r\\n';

const body = Buffer.concat([
    Buffer.from(modelPart),
    Buffer.from(partHeader),
    audioData,
    Buffer.from('\\r\\n' + endPart)
]);

const req = https.request({
    hostname: 'api.groq.com',
    path: '/openai/v1/audio/transcriptions',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': body.length
    },
    timeout: 30000
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
                process.stdout.write(JSON.stringify({ success: true, text: parsed.text }));
                process.exit(0);
            } else {
                process.stdout.write(JSON.stringify({ success: false, error: data }));
                process.exit(1);
            }
        } catch(e) {
            process.stdout.write(JSON.stringify({ success: false, error: e.message }));
            process.exit(1);
        }
    });
});
req.on('error', e => {
    process.stdout.write(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
});
req.write(body);
req.end();
`;

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(tempScript, scriptContent, 'utf8');

    try {
        const result = spawnSync('node', [tempScript], { encoding: 'utf8', timeout: 40000 });
        try { fs.unlinkSync(tempScript); } catch (e) {}
        if (result.status === 0 && result.stdout) {
            const parsed = JSON.parse(result.stdout);
            if (parsed.success && parsed.text) return parsed.text;
        }
    } catch (e) {
        try { fs.unlinkSync(tempScript); } catch (e2) {}
    }
    return null;
}

// ---------------------------------------------------------------------------
// Windows SAPI5 Speech Recognition (CLI mode)
// ---------------------------------------------------------------------------

function recognizeWithSapi(timeoutSeconds = 8) {
    const psScript = `
Add-Type -AssemblyName System.Speech;
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine;
$recognizer.SetInputToDefaultAudioDevice();
$grammar = New-Object System.Speech.Recognition.DictationGrammar;
$recognizer.LoadGrammar($grammar);
$result = $recognizer.Recognize([TimeSpan]::FromSeconds(${timeoutSeconds}));
if ($result) {
    Write-Output $result.Text
} else {
    Write-Output ""
}
$recognizer.Dispose();
`.trim();

    try {
        const res = spawnSync('powershell', [
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript
        ], { encoding: 'utf8', timeout: (timeoutSeconds + 5) * 1000 });

        if (res.status === 0 && res.stdout && res.stdout.trim()) {
            return { success: true, text: res.stdout.trim(), method: 'SAPI5' };
        }
        return { success: false, reason: 'SAPI5 returned empty result or timed out', method: 'SAPI5' };
    } catch (e) {
        return { success: false, reason: `SAPI5 failed: ${e.message}`, method: 'SAPI5' };
    }
}

// ---------------------------------------------------------------------------
// Save Browser Audio Blob
// ---------------------------------------------------------------------------

function saveAudioBlob(buffer, ext = 'webm') {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const filename = `voice_cmd_${Date.now()}.${ext}`;
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

// ---------------------------------------------------------------------------
// Main transcription router
// ---------------------------------------------------------------------------

async function transcribe(audioBuffer, options = {}) {
    const { ext = 'webm', useSapi = false, timeoutSeconds = 8 } = options;

    // If a buffer was provided (from browser), save it and try Groq Whisper
    if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
        const filePath = saveAudioBlob(audioBuffer, ext);
        console.log(`[STT] Audio saved to: ${filePath} (${audioBuffer.length} bytes)`);

        const groqText = await transcribeWithGroq(filePath);
        if (groqText) {
            console.log(`[STT] Groq Whisper transcript: "${groqText}"`);
            return { success: true, text: groqText, method: 'GROQ_WHISPER', audioPath: filePath };
        }

        console.warn('[STT] Groq Whisper not available. Returning audio path for manual text entry.');
        return { success: false, reason: 'Groq Whisper unavailable — GROQ_API_KEYS not set or API call failed', audioPath: filePath };
    }

    // CLI mode: SAPI5 dictation
    if (useSapi) {
        console.log(`[STT] Starting SAPI5 microphone recognition (${timeoutSeconds}s timeout)...`);
        return recognizeWithSapi(timeoutSeconds);
    }

    return { success: false, reason: 'No audio input provided' };
}

module.exports = { transcribe, saveAudioBlob, transcribeWithGroq, recognizeWithSapi };
