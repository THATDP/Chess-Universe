import { AudioPreferences } from '../types/chess';

export type SoundEventType =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'castle'
  | 'promote'
  | 'victory'
  | 'defeat'
  | 'draw'
  | 'ui'
  | 'illegal';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private prefs: AudioPreferences = {
    muted: false,
    masterVolume: 0.85,
    effectsVolume: 0.9,
    alertsVolume: 0.85,
    ambientMusicEnabled: false,
    ambientVolume: 0.25,
  };
  private ambientInterval: number | null = null;
  private ambientGain: GainNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public updatePreferences(newPrefs: AudioPreferences): void {
    const prevAmbient = this.prefs.ambientMusicEnabled;
    const prevMuted = this.prefs.muted;
    this.prefs = { ...newPrefs };

    if (this.ambientGain && this.ctx) {
      const targetVol = this.prefs.muted || !this.prefs.ambientMusicEnabled
        ? 0
        : this.prefs.masterVolume * this.prefs.ambientVolume * 0.18;
      this.ambientGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
    }

    if (this.prefs.ambientMusicEnabled && !this.prefs.muted) {
      if (!prevAmbient || prevMuted || !this.ambientInterval) {
        this.startAmbientMusic();
      }
    } else {
      this.stopAmbientMusic();
    }
  }

  public getPreferences(): AudioPreferences {
    return this.prefs;
  }

  public play(event: SoundEventType): void {
    if (this.prefs.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const isAlert = ['check', 'checkmate', 'victory', 'defeat', 'draw', 'promote'].includes(event);
    const channelVol = isAlert ? this.prefs.alertsVolume : this.prefs.effectsVolume;
    const vol = Math.max(0, Math.min(1, this.prefs.masterVolume * channelVol));
    if (vol <= 0.005) return;

    switch (event) {
      case 'move':
        this.synthWoodKnock(ctx, now, 155, 0.075, vol * 0.85);
        break;

      case 'capture':
        this.synthCaptureSnap(ctx, now, vol);
        break;

      case 'castle':
        this.synthWoodKnock(ctx, now, 150, 0.07, vol * 0.85);
        this.synthWoodKnock(ctx, now + 0.11, 185, 0.075, vol * 0.8);
        break;

      case 'check':
        this.synthWoodKnock(ctx, now, 170, 0.06, vol * 0.5);
        this.synthTone(ctx, now, 587.33, 0.28, vol * 0.55, 'triangle'); // D5
        this.synthTone(ctx, now + 0.04, 880.0, 0.34, vol * 0.5, 'sine'); // A5
        break;

      case 'promote':
        this.synthTone(ctx, now, 440, 0.18, vol * 0.5, 'triangle');
        this.synthTone(ctx, now + 0.07, 554.37, 0.22, vol * 0.55, 'triangle');
        this.synthTone(ctx, now + 0.14, 659.25, 0.28, vol * 0.6, 'triangle');
        this.synthTone(ctx, now + 0.21, 880, 0.42, vol * 0.65, 'sine');
        break;

      case 'checkmate':
        this.synthCaptureSnap(ctx, now, vol * 0.7);
        this.synthTone(ctx, now + 0.05, 220, 0.65, vol * 0.6, 'sawtooth');
        this.synthTone(ctx, now + 0.12, 329.63, 0.65, vol * 0.55, 'triangle');
        this.synthTone(ctx, now + 0.2, 440, 0.85, vol * 0.65, 'sine');
        break;

      case 'victory': {
        const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
        notes.forEach((freq, idx) => {
          this.synthTone(ctx, now + idx * 0.09, freq, 0.55, vol * 0.5, 'triangle');
        });
        break;
      }

      case 'defeat': {
        const notes = [392.0, 349.23, 311.13, 261.63];
        notes.forEach((freq, idx) => {
          this.synthTone(ctx, now + idx * 0.14, freq, 0.48, vol * 0.48, 'sine');
        });
        break;
      }

      case 'draw': {
        this.synthTone(ctx, now, 329.63, 0.35, vol * 0.45, 'sine');
        this.synthTone(ctx, now + 0.12, 392.0, 0.35, vol * 0.45, 'sine');
        this.synthTone(ctx, now + 0.24, 349.23, 0.5, vol * 0.45, 'triangle');
        break;
      }

      case 'illegal':
        this.synthTone(ctx, now, 130, 0.14, vol * 0.45, 'sawtooth');
        this.synthTone(ctx, now + 0.06, 115, 0.16, vol * 0.45, 'sawtooth');
        break;

      case 'ui':
        this.synthWoodKnock(ctx, now, 420, 0.028, vol * 0.35);
        break;
    }
  }

  private synthWoodKnock(
    ctx: AudioContext,
    startTime: number,
    baseFreq: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.38, startTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  private synthCaptureSnap(ctx: AudioContext, startTime: number, volume: number): void {
    // Low thump
    this.synthWoodKnock(ctx, startTime, 210, 0.085, volume * 0.95);

    // Crisp noise transient simulating piece collision
    const bufferSize = Math.floor(ctx.sampleRate * 0.055);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, startTime);
    filter.Q.setValueAtTime(1.8, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.75, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.055);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
  }

  private synthTone(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public startAmbientMusic(): void {
    this.stopAmbientMusic();
    if (this.prefs.muted || !this.prefs.ambientMusicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    const targetVol = this.prefs.masterVolume * this.prefs.ambientVolume * 0.16;
    masterGain.gain.setValueAtTime(targetVol, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.ambientGain = masterGain;

    // Gentle grandmaster study ambient harmonic progression
    const chords = [
      [130.81, 196.0, 246.94, 293.66], // Cmaj9
      [110.0, 164.81, 220.0, 261.63],  // Am7
      [146.83, 220.0, 261.63, 329.63], // Dm9
      [98.0, 146.83, 196.0, 246.94],   // G6
    ];
    let chordIndex = 0;

    const playAmbientChord = () => {
      if (!this.ctx || this.prefs.muted || !this.prefs.ambientMusicEnabled || !this.ambientGain) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      chord.forEach((freq) => {
        if (!this.ctx || !this.ambientGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.linearRampToValueAtTime(0.22, now + 1.8);
        noteGain.gain.exponentialRampToValueAtTime(0.0005, now + 5.8);

        osc.connect(noteGain);
        noteGain.connect(this.ambientGain);
        osc.start(now);
        osc.stop(now + 6.0);
      });
    };

    playAmbientChord();
    this.ambientInterval = window.setInterval(playAmbientChord, 5500);
  }

  public stopAmbientMusic(): void {
    if (this.ambientInterval !== null) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientGain && this.ctx) {
      try {
        this.ambientGain.disconnect();
      } catch {
        // ignore
      }
      this.ambientGain = null;
    }
  }
}

export const soundEngine = new SoundEngine();
