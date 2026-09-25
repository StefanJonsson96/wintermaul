// Procedural sound effects with WebAudio. No audio files: everything is synthesized.

type SoundName =
  | 'click'
  | 'build'
  | 'upgrade'
  | 'sell'
  | 'die'
  | 'leak'
  | 'wave'
  | 'boss'
  | 'lumber'
  | 'error'
  | 'victory'
  | 'defeat'
  | 'impact'
  | 'pulse'
  | 'freeze'
  | 'coin'
  | `shot:${string}`;

const MIN_GAP: Record<string, number> = { die: 0.035, impact: 0.06, pulse: 0.1, coin: 0.05, freeze: 0.1 };

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();
  private voices = 0;
  volume = 0.6;
  muted = false;

  constructor() {
    try {
      const v = localStorage.getItem('winterward.volume');
      if (v !== null) this.volume = Math.max(0, Math.min(1, Number(v)));
      this.muted = localStorage.getItem('winterward.muted') === '1';
    } catch {
      /* no storage */
    }
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    try {
      this.ctx = new AudioContext();
    } catch {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume * 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  setVolume(v: number): void {
    this.volume = v;
    try {
      localStorage.setItem('winterward.volume', String(v));
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : v * 0.5;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('winterward.muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = m ? 0 : this.volume * 0.5;
  }

  /** gain: 0..1 relative loudness (use it for distance attenuation). */
  play(name: SoundName, gain = 1): void {
    if (this.muted || gain <= 0.02 || !this.ensure() || !this.ctx || !this.master) return;
    if (this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const key = name.startsWith('shot:') ? name : name;
    const gap = MIN_GAP[key] ?? (name.startsWith('shot:') ? 0.045 : 0.02);
    const prev = this.last.get(key) ?? -1;
    if (now - prev < gap) return;
    if (this.voices > 28) return;
    this.last.set(key, now);
    const out = this.ctx.createGain();
    out.gain.value = gain;
    out.connect(this.master);
    this.voices++;
    setTimeout(() => {
      this.voices--;
      out.disconnect();
    }, 2500);
    const kind = name.startsWith('shot:') ? name.slice(5) : '';
    switch (name) {
      case 'click':
        this.tone(out, 'sine', 880, 660, 0.05, 0.25);
        break;
      case 'build':
        this.tone(out, 'sine', 180, 70, 0.18, 0.7);
        this.hit(out, 900, 0.08, 0.35, 'lowpass');
        break;
      case 'upgrade':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(out, 'triangle', f, f, 0.16, 0.28, i * 0.06));
        break;
      case 'sell':
      case 'coin':
        this.tone(out, 'triangle', 1568, 1568, 0.08, 0.25);
        this.tone(out, 'triangle', 2093, 2093, 0.12, 0.2, 0.06);
        break;
      case 'die':
        this.tone(out, 'sine', 420, 110, 0.09, 0.28);
        this.hit(out, 2400, 0.05, 0.12, 'bandpass');
        break;
      case 'leak':
        this.tone(out, 'square', 520, 520, 0.12, 0.18);
        this.tone(out, 'square', 390, 390, 0.16, 0.18, 0.14);
        break;
      case 'wave':
        this.horn(out, [196, 247, 294], 1.1, 0.35);
        break;
      case 'boss':
        this.hit(out, 160, 0.9, 0.9, 'lowpass');
        this.horn(out, [98, 117, 147], 1.8, 0.45);
        break;
      case 'lumber':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(out, 'sine', f, f, 0.3, 0.22, i * 0.09));
        break;
      case 'error':
        this.tone(out, 'sawtooth', 160, 120, 0.14, 0.18);
        break;
      case 'victory':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(out, 'triangle', f, f, 0.35, 0.3, i * 0.14));
        break;
      case 'defeat':
        [392, 349, 311, 262].forEach((f, i) => this.tone(out, 'sawtooth', f, f * 0.98, 0.45, 0.18, i * 0.3));
        break;
      case 'impact':
        this.hit(out, 700, 0.3, 0.55, 'lowpass');
        this.tone(out, 'sine', 90, 40, 0.25, 0.5);
        break;
      case 'pulse':
        this.tone(out, 'sine', 120, 45, 0.4, 0.6);
        this.hit(out, 400, 0.3, 0.3, 'lowpass');
        break;
      case 'freeze':
        this.hit(out, 5200, 0.25, 0.25, 'highpass');
        this.tone(out, 'sine', 2400, 3200, 0.2, 0.08);
        break;
      default:
        this.shot(out, kind);
    }
  }

  private shot(out: GainNode, kind: string): void {
    switch (kind) {
      case 'bullet':
        this.hit(out, 3000, 0.05, 0.3, 'highpass');
        this.tone(out, 'square', 220, 90, 0.04, 0.12);
        break;
      case 'arrow':
      case 'thorn':
        this.hit(out, 2600, 0.07, 0.22, 'bandpass');
        break;
      case 'rock':
        this.tone(out, 'sine', 150, 70, 0.1, 0.35);
        break;
      case 'fireball':
      case 'flame':
        this.hit(out, 900, 0.18, 0.28, 'lowpass');
        break;
      case 'meteor':
      case 'missile':
        this.hit(out, 600, 0.28, 0.3, 'lowpass');
        this.tone(out, 'sawtooth', 300, 120, 0.2, 0.08);
        break;
      case 'lightning':
        this.hit(out, 3500, 0.09, 0.3, 'bandpass');
        this.tone(out, 'sawtooth', 1200, 300, 0.06, 0.08);
        break;
      case 'rail':
        this.tone(out, 'sawtooth', 1800, 200, 0.22, 0.2);
        this.hit(out, 4000, 0.15, 0.2, 'highpass');
        break;
      case 'poison':
        this.tone(out, 'sine', 300, 520, 0.08, 0.22);
        break;
      case 'coin':
        this.tone(out, 'triangle', 1760, 1760, 0.06, 0.16);
        break;
      case 'frost':
        this.tone(out, 'sine', 1800, 900, 0.08, 0.18);
        this.hit(out, 6000, 0.05, 0.1, 'highpass');
        break;
      case 'holy':
        this.tone(out, 'triangle', 1320, 1760, 0.1, 0.16);
        break;
      default:
        this.tone(out, 'sine', 900, 420, 0.07, 0.2);
    }
  }

  private tone(out: AudioNode, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private hit(out: AudioNode, freq: number, dur: number, vol: number, type: BiquadFilterType): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = type === 'bandpass' ? 2 : 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  private horn(out: AudioNode, freqs: number[], dur: number, vol: number): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t0);
    f.frequency.linearRampToValueAtTime(1400, t0 + dur * 0.4);
    f.frequency.linearRampToValueAtTime(500, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    f.connect(g).connect(out);
    for (const fr of freqs) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = fr;
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(f);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }
  }
}

export const audio = new Audio();
