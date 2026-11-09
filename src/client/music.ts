// Generative music: slow wintry pads, glassy bells and a wind that never quite stops, with drums
// when a wave is on and a darker turn for bosses. Nothing is recorded: notes are synthesized and
// scheduled a second or so ahead, one bar at a time, so a change of mood lands on the next bar.
import { audio } from './audio';

export type Mood = 'menu' | 'build' | 'wave' | 'boss';

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface Chord {
  /** Pad voicing (MIDI notes). */
  notes: number[];
  bass: number;
}

// D minor, wandering: Dm9 – Bbmaj7 – Fadd9 – Csus2
const CALM: Chord[] = [
  { notes: [57, 60, 64, 65], bass: 38 },
  { notes: [53, 57, 62, 65], bass: 34 },
  { notes: [53, 57, 60, 67], bass: 41 },
  { notes: [55, 60, 62, 67], bass: 36 },
];

// for bosses: Dm – Eb – Dm – A, the half-step up and the dominant
const DARK: Chord[] = [
  { notes: [53, 57, 62, 65], bass: 38 },
  { notes: [55, 58, 63, 67], bass: 39 },
  { notes: [53, 57, 62, 65], bass: 38 },
  { notes: [52, 57, 61, 64], bass: 33 },
];

/** D minor pentatonic, D5 up to D7: the bells pick from here. */
const BELLS = [74, 77, 79, 81, 84, 86, 89, 91, 93, 96, 98];

const TEMPO: Record<Mood, number> = { menu: 58, build: 62, wave: 74, boss: 70 };
/** Chance of a bell on each eighth note. */
const BELL_CHANCE: Record<Mood, number> = { menu: 0.2, build: 0.16, wave: 0.1, boss: 0.05 };

class Music {
  private mood: Mood = 'menu';
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private verb!: ConvolverNode;
  private echo!: DelayNode;
  private wind!: GainNode;
  private windFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private white!: AudioBuffer;
  private next = 0;
  private bar = 0;
  private seed = 0x2f6b1d;
  private lastBell = 81;

  constructor() {
    if (typeof window === 'undefined') return;
    setInterval(() => this.tick(), 250);
    document.addEventListener('visibilitychange', () => audio.fadeMusic(!document.hidden));
  }

  setMood(m: Mood): void {
    this.mood = m;
  }

  private rand(): number {
    // mulberry32: the same tune every time the page loads, which is fine for music
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private setUp(ctx: AudioContext, out: GainNode): void {
    this.ctx = ctx;
    this.out = out;
    // a long, dark hall: decaying noise as the impulse response
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb = ctx.createConvolver();
    this.verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.verb.connect(wet).connect(out);
    // the bells ring on in an echo that darkens as it fades
    this.echo = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.echo.connect(tone).connect(fb).connect(this.echo);
    tone.connect(this.verb);
    tone.connect(out);
    // wind: looping noise through a wandering band-pass
    const nlen = ctx.sampleRate * 4;
    this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < nlen; i++) {
      // brown-ish noise: softer than white
      b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      nd[i] = b * 3.5;
    }
    this.white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const wd = this.white.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.9;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    src.connect(this.windFilter).connect(this.wind).connect(out);
    src.start();
  }

  private tick(): void {
    const target = audio.musicTarget();
    if (!target) return;
    if (target.ctx !== this.ctx) this.setUp(target.ctx, target.out);
    const ctx = this.ctx!;
    if (ctx.state !== 'running' || document.hidden || !audio.musicAudible) {
      // pick up on a fresh bar when it comes back
      this.next = 0;
      return;
    }
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.15;
    while (this.next < ctx.currentTime + 1.5) this.scheduleBar(this.next);
  }

  private scheduleBar(t0: number): void {
    const mood = this.mood;
    const beat = 60 / TEMPO[mood];
    const barLen = beat * 4;
    const dark = mood === 'boss';
    const prog = dark ? DARK : CALM;
    const chord = prog[Math.floor(this.bar / 2) % prog.length];
    const first = this.bar % 2 === 0;
    const fighting = mood === 'wave' || mood === 'boss';
    this.echo.delayTime.setValueAtTime(beat * 0.75, t0);

    if (first) this.pad(t0, chord, barLen * 2, dark);
    if (fighting) {
      for (const b of [0, 2]) this.bass(t0 + b * beat, chord.bass, beat * 1.7, 0.16);
      if (dark) {
        for (const [at, v] of [[0, 1], [1.5, 0.5], [2, 0.8], [3, 0.6], [3.5, 0.45]] as const) this.drum(t0 + at * beat, v, 52);
      } else {
        this.drum(t0, 0.8, 58);
        this.drum(t0 + 2 * beat, 0.55, 58);
        for (let i = 0; i < 8; i++) this.shaker(t0 + (i * beat) / 2, i % 2 ? 0.012 : 0.02);
      }
    } else if (first) {
      this.bass(t0, chord.bass, barLen * 1.9, 0.09);
    }

    for (let i = 0; i < 8; i++) {
      if (this.rand() >= BELL_CHANCE[mood]) continue;
      // a small step from the last bell, mostly, so the line sings rather than jumps
      const at = BELLS.indexOf(this.lastBell);
      const step = Math.round((this.rand() - 0.5) * 4);
      const note = BELLS[Math.max(0, Math.min(BELLS.length - 1, (at < 0 ? 3 : at) + step))];
      this.lastBell = note;
      this.bell(t0 + (i * beat) / 2 + (this.rand() - 0.5) * 0.02, note, dark ? 0.05 : 0.07);
    }

    // the wind rises and falls; loudest out on the snowfield of the menu
    const gust = (mood === 'menu' ? 0.05 : 0.03) * (0.5 + this.rand());
    this.wind.gain.setTargetAtTime(gust, t0, barLen / 3);
    this.windFilter.frequency.setTargetAtTime(280 + this.rand() * 700, t0, barLen / 2);

    this.next = t0 + barLen;
    this.bar++;
  }

  private pad(t0: number, chord: Chord, dur: number, dark: boolean): void {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.6;
    f.frequency.setValueAtTime(dark ? 500 : 700, t0);
    f.frequency.linearRampToValueAtTime(dark ? 950 : 1500, t0 + dur * 0.45);
    f.frequency.linearRampToValueAtTime(dark ? 450 : 650, t0 + dur + 2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.022, t0 + Math.min(1.8, dur / 3));
    g.gain.setValueAtTime(0.022, t0 + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 2.4);
    f.connect(g);
    g.connect(this.out);
    g.connect(this.verb);
    for (const n of chord.notes) {
      for (const detune of [-8, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(n);
        o.detune.value = detune;
        o.connect(f);
        o.start(t0);
        o.stop(t0 + dur + 2.6);
      }
    }
  }

  private bass(t0: number, note: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(note);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f).connect(g).connect(this.out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private bell(t0: number, note: number, vol: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    g.connect(this.out);
    g.connect(this.echo);
    g.connect(this.verb);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(note);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + 2.7);
    // an inharmonic partial makes it glass rather than flute, and fades first
    const p = ctx.createOscillator();
    p.type = 'sine';
    p.frequency.value = hz(note) * 2.76;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.0001, t0);
    pg.gain.exponentialRampToValueAtTime(vol * 0.35, t0 + 0.005);
    pg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    p.connect(pg).connect(g);
    p.start(t0);
    p.stop(t0 + 0.8);
  }

  private drum(t0: number, vol: number, low: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(low * 2.2, t0);
    o.frequency.exponentialRampToValueAtTime(low, t0 + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.3 * vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g);
    g.connect(this.out);
    g.connect(this.verb);
    o.start(t0);
    o.stop(t0 + 0.65);
    // the skin
    const n = ctx.createBufferSource();
    n.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12 * vol, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    n.connect(f).connect(ng).connect(this.out);
    n.start(t0, this.rand() * 0.8);
    n.stop(t0 + 0.15);
  }

  private shaker(t0: number, vol: number): void {
    const ctx = this.ctx!;
    const n = ctx.createBufferSource();
    n.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 5500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    n.connect(f).connect(g).connect(this.out);
    n.start(t0, this.rand() * 0.8);
    n.stop(t0 + 0.08);
  }
}

export const music = new Music();
