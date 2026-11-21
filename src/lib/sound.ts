// Sistema de áudio sintetizado com Web Audio API (sem arquivos externos).
type SoundName =
  | "move"
  | "capture"
  | "check"
  | "mate"
  | "castle"
  | "promote"
  | "win"
  | "lose"
  | "draw"
  | "click"
  | "transition"
  | "error"
  | "correct"
  | "start";

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
const vols = { sfx: 0.7, music: 0.25, muted: false };
let musicTimer: number | null = null;
let musicOn = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.connect(ctx.destination);
    musicGain.connect(ctx.destination);
    applyVolumes();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function applyVolumes() {
  if (!sfxGain || !musicGain || !ctx) return;
  sfxGain.gain.setTargetAtTime(vols.muted ? 0 : vols.sfx, ctx.currentTime, 0.02);
  musicGain.gain.setTargetAtTime(vols.muted ? 0 : vols.music * 0.35, ctx.currentTime, 0.2);
}

export function setVolumes(sfx: number, music: number, muted: boolean) {
  vols.sfx = sfx;
  vols.music = music;
  vols.muted = muted;
  applyVolumes();
  if (music > 0 && !muted) startMusic();
  else stopMusic();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number, dest?: AudioNode) {
  const c = ensure();
  if (!c || !sfxGain) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest ?? sfxGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, freq: number, gain: number, delay = 0, q = 1) {
  const c = ensure();
  if (!c || !sfxGain) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start(t);
}

export function play(name: SoundName) {
  if (vols.muted || vols.sfx <= 0) return;
  if (!ensure()) return;
  switch (name) {
    case "move":
      noise(0.07, 1400, 0.9);
      tone(190 + Math.random() * 20, 0.09, "sine", 0.35, 0, 90);
      break;
    case "capture":
      noise(0.14, 2400, 1.2);
      tone(150, 0.14, "triangle", 0.45, 0, 60);
      tone(900, 0.04, "square", 0.05);
      break;
    case "castle":
      noise(0.07, 1400, 0.8);
      tone(180, 0.09, "sine", 0.35, 0, 90);
      noise(0.07, 1200, 0.8, 0.13);
      tone(160, 0.09, "sine", 0.35, 0.13, 80);
      break;
    case "check":
      noise(0.08, 1800, 0.8);
      tone(740, 0.16, "triangle", 0.22, 0.02);
      tone(988, 0.22, "triangle", 0.2, 0.1);
      break;
    case "mate":
      noise(0.16, 1800, 1);
      [392, 311, 261, 196].forEach((f, i) => tone(f, 0.5, "triangle", 0.22, i * 0.13));
      tone(98, 1.1, "sine", 0.3, 0.3);
      break;
    case "promote":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.2, i * 0.07));
      break;
    case "win":
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, "triangle", 0.2, i * 0.11));
      tone(262, 1, "sine", 0.2, 0.4);
      break;
    case "lose":
      [392, 349, 311, 262].forEach((f, i) => tone(f, 0.45, "sine", 0.22, i * 0.17));
      break;
    case "draw":
      tone(440, 0.4, "sine", 0.2);
      tone(440, 0.5, "sine", 0.18, 0.25);
      break;
    case "click":
      tone(1300, 0.04, "sine", 0.12);
      break;
    case "transition":
      noise(0.28, 700, 0.18, 0, 4);
      tone(300, 0.2, "sine", 0.05, 0, 520);
      break;
    case "error":
      tone(160, 0.18, "sawtooth", 0.1, 0, 110);
      break;
    case "correct":
      tone(784, 0.12, "triangle", 0.2);
      tone(1175, 0.2, "triangle", 0.18, 0.09);
      break;
    case "start":
      tone(330, 0.15, "triangle", 0.18);
      tone(494, 0.2, "triangle", 0.18, 0.1);
      break;
  }
}

// Música ambiente generativa: pads suaves em progressão de acordes lenta.
const CHORDS = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
  [164.81, 207.65, 246.94],
];
function padChord(freqs: number[], start: number, dur: number) {
  if (!ctx || !musicGain) return;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  lp.connect(musicGain);
  freqs.forEach((f, i) => {
    [f, f * 2.003].forEach((ff, j) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = j ? "sine" : "triangle";
      o.frequency.value = ff / (i === 0 ? 2 : 1);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(j ? 0.04 : 0.09, start + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, start + dur + 1.5);
      o.connect(g);
      g.connect(lp);
      o.start(start);
      o.stop(start + dur + 1.6);
    });
  });
}
export function startMusic() {
  if (musicOn) return;
  const c = ensure();
  if (!c) return;
  musicOn = true;
  let i = 0;
  const step = () => {
    if (!ctx) return;
    padChord(CHORDS[i % CHORDS.length], ctx.currentTime + 0.05, 7);
    i++;
  };
  step();
  musicTimer = window.setInterval(step, 7000);
}
export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
export function unlockAudio() {
  ensure();
  if (vols.music > 0 && !vols.muted) startMusic();
}

export function playMoveSound(m: { san: string; flags: string; captured?: string; promotion?: string }, over?: boolean) {
  if (m.san.includes("#") || over === true) return play("mate");
  if (m.san.includes("+")) return play("check");
  if (m.promotion) return play("promote");
  if (m.flags.includes("k") || m.flags.includes("q")) return play("castle");
  if (m.captured) return play("capture");
  return play("move");
}
