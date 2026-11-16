// A microphone recorder that hands back a WAV file, in every
// browser, on purpose: MiniMax's transcription takes wav, mp3,
// ogg, and friends, but NOT the webm container most desktop
// browsers record by default - so the panel captures raw audio
// through WebAudio and encodes a plain 16 kHz mono WAV itself.
// Same input shape everywhere, no container lottery, and the
// door never has to transcode.

const TARGET_RATE = 16000;

function downsample(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.round(buffer.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), buffer.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += buffer[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples, sampleRate) {
  const bytes = 44 + samples.length * 2;
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  const writeText = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  writeText(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Start capturing a MediaStream's audio. Returns a handle whose
 *  stop() resolves to the finished WAV Blob. ScriptProcessor is
 *  the unfashionable, universally-working capture path (Safari
 *  included); the graph is muted end to end, nothing echoes. */
export function createWavRecorder(stream) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const sink = ctx.createGain();
  sink.gain.value = 0;
  const chunks = [];
  let recording = true;
  processor.onaudioprocess = (e) => {
    if (recording) chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(sink);
  sink.connect(ctx.destination);
  return {
    sampleRate: ctx.sampleRate,
    async stop() {
      recording = false;
      try { processor.disconnect(); source.disconnect(); sink.disconnect(); } catch { /* already down */ }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Float32Array(total);
      let at = 0;
      for (const c of chunks) { merged.set(c, at); at += c.length; }
      const small = downsample(merged, ctx.sampleRate, TARGET_RATE);
      try { await ctx.close(); } catch { /* fine */ }
      return encodeWav(small, TARGET_RATE);
    },
  };
}

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
