// All sound, synthesised with the Web Audio API alone: no files, no network request. Everything
// here only listens to the state main.js hands it and plays a sound back; it never changes the
// flight, the campaign or any of their random rolls, so muting it (or a browser that refuses
// autoplay) never changes how the game scores or plays, only how it sounds.
const MASTER_VOLUME = 0.22;

export function createAudio() {
  let context = null;
  let master = null;
  let engineNodes = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
    return context;
  }

  /** Browsers refuse sound before a user gesture; call this from the first click or keydown. */
  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(next) {
    muted = next;
    if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, context.currentTime, 0.05);
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function tone(freq, duration, { type = 'sine', gain = 0.3, delay = 0, attack = 0.01, slideTo = null } = {}) {
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    const t0 = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, t0 + duration);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function noiseBurst(duration, { gain = 0.35, delay = 0, highpass = 400 } = {}) {
    const ctx = ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(master);
    source.start(t0);
    source.stop(t0 + duration + 0.02);
  }

  /** The engine's continuous drone: two detuned saws, pitch and volume riding the throttle. */
  function startEngine() {
    const ctx = ensureContext();
    if (!ctx || engineNodes) return;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscB.detune.value = 9;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscA.start();
    oscB.start();
    engineNodes = { oscA, oscB, gain };
  }

  /** Called every frame while a flight is airborne; throttle 0..1, stalled flags a rough idle. */
  function updateEngine(throttle, stalled) {
    if (!engineNodes) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const freq = 70 + throttle * 150;
    const vol = stalled ? 0.05 : 0.05 + throttle * 0.1;
    const now = ctx.currentTime;
    engineNodes.oscA.frequency.setTargetAtTime(freq, now, 0.08);
    engineNodes.oscB.frequency.setTargetAtTime(freq * 1.01, now, 0.08);
    engineNodes.gain.gain.setTargetAtTime(vol, now, 0.12);
  }

  function stopEngine() {
    if (!engineNodes) return;
    const ctx = ensureContext();
    const now = ctx ? ctx.currentTime : 0;
    engineNodes.gain.gain.setTargetAtTime(0, now, 0.1);
    engineNodes.oscA.stop(now + 0.3);
    engineNodes.oscB.stop(now + 0.3);
    engineNodes = null;
  }

  /** A touchdown's splash: louder and longer the harder the floats hit. */
  function playSplash(intensity) {
    noiseBurst(0.25 + intensity * 0.3, { gain: 0.2 + intensity * 0.3, highpass: 300 });
  }

  function playDeliveryJingle(grade) {
    const notes = grade === 'perfect' ? [660, 880, 1100, 1320] : grade === 'smooth' ? [523, 660, 784] : [440, 523];
    notes.forEach((freq, i) => tone(freq, 0.22, { type: 'triangle', gain: 0.22, delay: i * 0.09 }));
  }

  function playCrashThud() {
    noiseBurst(0.4, { gain: 0.4, highpass: 120 });
    tone(90, 0.4, { type: 'square', gain: 0.18, slideTo: 40 });
  }

  function playWarningBeep() {
    tone(880, 0.12, { type: 'square', gain: 0.14 });
  }

  function playAchievementChime() {
    tone(784, 0.14, { type: 'sine', gain: 0.18 });
    tone(988, 0.18, { type: 'sine', gain: 0.18, delay: 0.1 });
  }

  function playClickTick() {
    tone(320, 0.05, { type: 'square', gain: 0.08 });
  }

  return {
    unlock,
    setMuted,
    toggleMute,
    isMuted: () => muted,
    startEngine,
    updateEngine,
    stopEngine,
    playSplash,
    playDeliveryJingle,
    playCrashThud,
    playWarningBeep,
    playAchievementChime,
    playClickTick,
  };
}
