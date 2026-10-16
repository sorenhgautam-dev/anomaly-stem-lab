/*
 * Sound effects, synthesised with the Web Audio API so there are no audio
 * files to load and everything works offline. Nothing plays until
 * unlockAudio() runs inside the first user gesture (browser autoplay rules
 * and CLAUDE.md §3.1).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastHitAt = 0;

const MASTER_VOLUME = 0.55;

export function unlockAudio(): void {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
  if (ctx && master) {
    master.gain.setTargetAtTime(value ? 0 : MASTER_VOLUME, ctx.currentTime, 0.03);
  }
}

function ready(): { ctx: AudioContext; out: GainNode } | null {
  if (!ctx || !master || muted || ctx.state !== "running") return null;
  return { ctx, out: master };
}

/** One decaying sine partial. */
function partial(
  audio: { ctx: AudioContext; out: GainNode },
  freq: number,
  gain: number,
  decay: number,
  when: number,
  type: OscillatorType = "sine",
): void {
  const osc = audio.ctx.createOscillator();
  const env = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(gain, when + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  osc.connect(env).connect(audio.out);
  osc.start(when);
  osc.stop(when + decay + 0.05);
}

/** Short burst of filtered noise for the attack of a hit. */
function noiseTick(
  audio: { ctx: AudioContext; out: GainNode },
  gain: number,
  decay: number,
  freq: number,
  when: number,
): void {
  const length = Math.ceil(audio.ctx.sampleRate * decay);
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  const env = audio.ctx.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  env.gain.value = gain;
  src.connect(filter).connect(env).connect(audio.out);
  src.start(when);
}

/** Glass clink. Inharmonic partials, like a struck glass. strength 0..1. */
export function glassClink(strength = 1, pitch = 1): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  if (now - lastHitAt < 0.045) return;
  lastHitAt = now;
  const s = Math.min(1, Math.max(0, strength));
  const f = 1750 * pitch * (0.93 + Math.random() * 0.14);
  const g = 0.05 + s * 0.17;
  partial(audio, f, g, 0.7 + s * 0.5, now);
  partial(audio, f * 2.76, g * 0.45, 0.45, now);
  partial(audio, f * 5.4, g * 0.22, 0.25, now);
  partial(audio, f * 8.93, g * 0.1, 0.14, now);
  noiseTick(audio, g * 0.5, 0.02, 6000, now);
}

/** A heavy steel ball hitting the floor: low body plus a metallic ring. */
export function metalThud(strength = 1): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  const g = 0.12 + Math.min(1, strength) * 0.22;
  const body = audio.ctx.createOscillator();
  const env = audio.ctx.createGain();
  body.frequency.setValueAtTime(140, now);
  body.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  env.gain.setValueAtTime(g, now);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  body.connect(env).connect(audio.out);
  body.start(now);
  body.stop(now + 0.4);
  partial(audio, 620, g * 0.25, 0.9, now);
  partial(audio, 1530, g * 0.12, 0.6, now);
  noiseTick(audio, g * 0.6, 0.03, 900, now);
}

/** Soft low click for button presses. */
export function softClick(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  partial(audio, 190, 0.12, 0.07, now);
  noiseTick(audio, 0.05, 0.012, 2400, now);
}

/** The ANOMALY DETECTED sting: a short detuned digital wobble. */
export function anomalySting(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  for (const [freq, delay] of [
    [880, 0],
    [831, 0.07],
    [440, 0.14],
  ] as const) {
    partial(audio, freq, 0.045, 0.32, now + delay, "square");
  }
  noiseTick(audio, 0.08, 0.12, 3200, now);
}

/** Correct-prediction chime: a bright rising triad. */
export function resolveChime(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  [1046.5, 1318.5, 1568].forEach((freq, i) => partial(audio, freq, 0.09, 0.9, now + i * 0.08));
}
