const fs = require('fs');
const path = require('path');

function writeWav(filename, generateSamples, sampleRate = 44100) {
    const samples = generateSamples(sampleRate);
    const dataSize = samples.length * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    
    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
    buffer.writeUInt16LE(1, 22);  // NumChannels
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32);  // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Write samples
    for (let i = 0; i < samples.length; i++) {
        // Clamp and convert to 16-bit PCM
        let sample = Math.max(-1, Math.min(1, samples[i]));
        buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
    }
    
    const outPath = path.join(__dirname, '..', 'media', filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated ${outPath}`);
}

// Success: A quick pleasant double beep (major 3rd)
function generateSuccess(sampleRate) {
    const duration = 0.3; // seconds
    const totalSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(totalSamples);
    
    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        // Two quick notes
        let env = 0;
        if (t < 0.1) {
            env = Math.sin(Math.PI * t / 0.1); // 1st note envelope
        } else if (t > 0.15 && t < 0.3) {
            env = Math.sin(Math.PI * (t - 0.15) / 0.15); // 2nd note envelope
        }
        
        let freq = t < 0.1 ? 523.25 : 659.25; // C5 then E5
        let sine = Math.sin(2 * Math.PI * freq * t);
        
        samples[i] = sine * env * 0.3;
    }
    return samples;
}

// Error: A short lower descending pair of notes (or a single low buzz)
function generateError(sampleRate) {
    const duration = 0.3; // seconds
    const totalSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(totalSamples);
    
    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let env = Math.max(0, 1 - (t / 0.3)); // linear decay
        
        let freq = 200 - (t * 100); // descending from 200Hz to 100Hz
        
        // Sawtooth-ish sound for error
        let phase = (freq * t) % 1;
        let wave = (phase * 2 - 1) * 0.5; 
        
        samples[i] = wave * env * 0.3;
    }
    return samples;
}

writeWav('default-success.wav', generateSuccess);
writeWav('default-error.wav', generateError);
