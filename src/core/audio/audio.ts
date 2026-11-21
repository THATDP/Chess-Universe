// Áudio 100% sintetizado com Web Audio API (sem arquivos externos, funciona offline).
export type SoundName =
  | "move"
  | "capture"
  | "castle"
  | "check"
  | "checkmate"
  | "promote"
  | "win"
  | "lose"
  | "draw"
  | "click"
  | "error"
  | "success"
  | "start"
  | "notify";

type Bus = "sfx" | "ui";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<Bus | "music", GainNode>;
  private noise!: AudioBuffer;
  private vol = { master: 0.8, sfx: 0.9, ui: 0.5, music: 0.35, muted: false };
  private musicWanted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicNodes: AudioNode | null = null;
  private unlocked = false;

  constructor() {
    if (typeof window !== "undefined") {
      const unlock = () => {
        this.ensure();
        this.unlocked = true;
        if (this.musicWanted) this.startMusic();
      };
      window.addEventListener("pointerdown", unlock, { once: true, capture: true });
      window.addEventListener("keydown", unlock, { once: true, capture: true });
    }
  }

  private ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.buses = { sfx: ctx.createGain(), ui: ctx.createGain(), music: ctx.createGain() };
    (Object.keys(this.buses) as (Bus | "music")[]).forEach((k) => this.buses[k].connect(this.master));
    const len = ctx.sampleRate * 0.5;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    return ctx;
  }

  configure(v: { master: number; sfx: number; ui: number; music: number; muted: boolean }) {
    this.vol = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.vol.muted ? 0 : this.vol.master;
    this.master.gain.setTargetAtTime(m, t, 0.02);
    this.buses.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.buses.ui.gain.setTargetAtTime(this.vol.ui, t, 0.02);
    this.buses.music.gain.setTargetAtTime(this.vol.music * 0.6, t, 0.05);
  }

  /* ---------- primitivas ---------- */
  private tone(bus: Bus | "music", freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number } = {}) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type ?? "sine";
    o.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const a = opts.attack ?? 0.004;
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + a);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(this.buses[bus]);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  private click(bus: Bus, start: number, freq: number, dur: number, gain: number, q = 1.2) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.buses[bus]);
    src.start(start, Math.random() * 0.3);
    src.stop(start + dur + 0.02);
  }

  private woodMove(t: number, strength = 1) {
    this.click("sfx", t, 1500, 0.05, 0.9 * strength, 1.5);
    this.tone("sfx", 170, t, 0.11, { type: "sine", gain: 0.55 * strength, slideTo: 90 });
  }

  /* ---------- efeitos ---------- */
  play(name: SoundName) {
    if (this.vol.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case "move":
        this.woodMove(t);
        break;
      case "capture":
        this.woodMove(t, 1.25);
        this.click("sfx", t + 0.02, 700, 0.12, 0.8, 0.8);
        this.tone("sfx", 110, t, 0.16, { type: "triangle", gain: 0.5, slideTo: 60 });
        break;
      case "castle":
        this.woodMove(t, 0.9);
        this.woodMove(t + 0.12, 1.1);
        break;
      case "promote":
        this.woodMove(t);
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone("sfx", f, t + 0.08 + i * 0.07, 0.25, { type: "triangle", gain: 0.22 }));
        break;
      case "check":
        this.woodMove(t, 0.8);
        this.tone("sfx", 880, t + 0.05, 0.18, { type: "square", gain: 0.1 });
        this.tone("sfx", 660, t + 0.17, 0.25, { type: "square", gain: 0.1 });
        break;
      case "checkmate":
        this.woodMove(t, 1.3);
        [440, 349.23, 293.66, 220].forEach((f, i) => this.tone("sfx", f, t + 0.1 + i * 0.14, 0.7, { type: "sawtooth", gain: 0.09 }));
        this.tone("sfx", 55, t + 0.1, 1.2, { type: "sine", gain: 0.5 });
        break;
      case "win":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
          this.tone("sfx", f, t + i * 0.11, 0.55, { type: "triangle", gain: 0.25 });
          this.tone("sfx", f / 2, t + i * 0.11, 0.55, { type: "sine", gain: 0.15 });
        });
        break;
      case "lose":
        [392, 349.23, 311.13, 261.63].forEach((f, i) => this.tone("sfx", f, t + i * 0.2, 0.7, { type: "triangle", gain: 0.22 }));
        break;
      case "draw":
        [392, 587.33].forEach((f, i) => this.tone("sfx", f, t + i * 0.15, 0.8, { type: "sine", gain: 0.25 }));
        break;
      case "click":
        this.tone("ui", 1400, t, 0.04, { type: "sine", gain: 0.25 });
        break;
      case "notify":
        this.tone("ui", 988, t, 0.12, { type: "sine", gain: 0.25 });
        this.tone("ui", 1319, t + 0.09, 0.18, { type: "sine", gain: 0.25 });
        break;
      case "error":
        this.tone("ui", 160, t, 0.22, { type: "sawtooth", gain: 0.18, slideTo: 110 });
        break;
      case "success":
        [659.25, 987.77].forEach((f, i) => this.tone("ui", f, t + i * 0.09, 0.3, { type: "sine", gain: 0.3 }));
        break;
      case "start":
        [392, 523.25].forEach((f, i) => this.tone("ui", f, t + i * 0.1, 0.25, { type: "triangle", gain: 0.2 }));
        break;
    }
  }

  /** Som apropriado para um lance */
  playMove(m: { san: string; flags: string; captured?: string; promotion?: string }, mate: boolean) {
    if (mate) return this.play("checkmate");
    if (m.san.includes("+")) return this.play("check");
    if (m.promotion) return this.play("promote");
    if (m.flags.includes("k") || m.flags.includes("q")) return this.play("castle");
    if (m.captured) return this.play("capture");
    return this.play("move");
  }

  /* ---------- música ambiente generativa ---------- */
  setMusic(on: boolean) {
    this.musicWanted = on;
    if (on) {
      if (this.unlocked) this.startMusic();
    } else this.stopMusic();
  }

  private startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    const chords = [
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [48, 55, 60, 64], // C
      [55, 59, 62, 66], // G(add#11)
    ];
    const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
    const out = ctx.createGain();
    out.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.45;
    const fb = ctx.createGain();
    fb.gain.value = 0.4;
    delay.connect(fb);
    fb.connect(delay);
    out.connect(lp);
    lp.connect(this.buses.music);
    lp.connect(delay);
    delay.connect(this.buses.music);
    this.musicNodes = out;

    const bar = () => {
      if (!this.ctx || !this.musicNodes) return;
      const t = this.ctx.currentTime + 0.05;
      const ch = chords[this.musicStep % chords.length];
      this.musicStep++;
      ch.forEach((n, i) => {
        for (const det of [-4, 4]) {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.type = i === 0 ? "triangle" : "sine";
          o.frequency.value = mtof(n - (i === 0 ? 12 : 0));
          o.detune.value = det;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.07, t + 2.5);
          g.gain.linearRampToValueAtTime(0.0001, t + 8.5);
          o.connect(g);
          g.connect(out);
          o.start(t);
          o.stop(t + 9);
        }
      });
      // notas de sino pentatônicas
      const pent = [72, 74, 76, 79, 81, 84];
      for (let i = 0; i < 3; i++) {
        const n = pent[Math.floor(Math.random() * pent.length)];
        const when = t + 1 + i * 2.3 + Math.random();
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "sine";
        o.frequency.value = mtof(n);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(0.05, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 2.5);
        o.connect(g);
        g.connect(out);
        o.start(when);
        o.stop(when + 2.6);
      }
    };
    bar();
    this.musicTimer = window.setInterval(bar, 8000);
  }

  private stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicNodes) {
      const n = this.musicNodes as GainNode;
      if (this.ctx) n.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      const old = n;
      window.setTimeout(() => old.disconnect(), 3000);
      this.musicNodes = null;
    }
  }
}

export const audio = new AudioEngine();
