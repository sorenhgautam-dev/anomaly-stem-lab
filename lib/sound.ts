/*
 * Sound effects, synthesised with the Web Audio API so there are no audio
 * files to load and everything works offline. Nothing plays until
 * resumeAudio() runs inside the first user gesture (browser autoplay rules
 * and CLAUDE.md §3.1).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastHitAt = 0;

const MASTER_VOLUME = 0.55;

function create(): void {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_VOLUME;
  master.connect(ctx.destination);
}

/**
 * Make the audio context ahead of time, suspended (allowed before any gesture), in idle time after the page
 * loads: starting the audio device can take ~100 ms, which froze the first click. resumeAudio() then only resumes.
 */
export function warmAudio(): void {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
  idle(() => create());
}

export function resumeAudio(): void {
  create();
  if (ctx?.state === "suspended") void ctx.resume();
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

/** A knob's detent: a crisp, dry mechanical tick as it clicks onto a step. */
export function detentClick(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  noiseTick(audio, 0.09, 0.008, 4200, now);
  partial(audio, 1150, 0.035, 0.03, now, "triangle");
  partial(audio, 320, 0.05, 0.05, now);
}

/** A tile flipping over and landing: a soft flap, then a firm clack. */
export function tileClack(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  noiseTick(audio, 0.035, 0.05, 1400, now);
  noiseTick(audio, 0.11, 0.015, 3200, now + 0.17);
  partial(audio, 240, 0.09, 0.09, now + 0.17);
  partial(audio, 760, 0.03, 0.06, now + 0.17, "triangle");
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

/*
 * Beats for the verdict moments and camera moves (DESIGN.md §9.1 "small
 * sounds land exactly on animation beats"). Each takes a delay in seconds so
 * callers can schedule it on the beat of the animation it belongs to.
 */

/** C major pentatonic from C6: the verdict word's letters climb it as they land. */
const PENTATONIC = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637];

/** A soft pluck for one letter of the verdict word, rising with each letter. */
export function letterPluck(index: number, delay = 0): void {
  const audio = ready();
  if (!audio) return;
  const when = audio.ctx.currentTime + delay;
  const f = PENTATONIC[index % PENTATONIC.length] * (index >= PENTATONIC.length ? 2 : 1);
  partial(audio, f, 0.035, 0.28, when, "triangle");
  partial(audio, f * 2, 0.012, 0.16, when);
}

/** ANOMALY: a stuttering digital glitch through the freeze, then a low slam as the word lands. */
export function glitchStutter(slamAt = 0.32): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  [0, 0.055, 0.11, 0.2].forEach((t, i) => {
    noiseTick(audio, 0.07, 0.035, 1800 + i * 900, now + t);
    partial(audio, 220 * (i % 2 ? 1.06 : 1), 0.03, 0.05, now + t, "square");
  });
  // The slam: a falling low body.
  const body = audio.ctx.createOscillator();
  const env = audio.ctx.createGain();
  const at = now + slamAt;
  body.frequency.setValueAtTime(120, at);
  body.frequency.exponentialRampToValueAtTime(42, at + 0.22);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.setValueAtTime(0.2, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
  body.connect(env).connect(audio.out);
  body.start(now);
  body.stop(at + 0.42);
}

/** A soft rising whoosh: filtered noise sweeping up, for dives and fly-throughs. */
export function whoosh(duration = 0.42): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  const length = Math.ceil(audio.ctx.sampleRate * duration);
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  const env = audio.ctx.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(380, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + duration);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.11, now + duration * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(env).connect(audio.out);
  src.start(now);
}

/** Run pressed: a short rising spin-up under the click. */
export function spinUp(): void {
  const audio = ready();
  if (!audio) return;
  const now = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const env = audio.ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.28);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
  osc.connect(env).connect(audio.out);
  osc.start(now);
  osc.stop(now + 0.36);
}

/** Whether sound is muted right now (for the toggle's first render after mount). */
export function isMuted(): boolean {
  return muted;
}
