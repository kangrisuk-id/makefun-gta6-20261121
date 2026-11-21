// Synthesized WebAudio sounds: engine hum, horns, gunshots, sirens, pickups and a bass loop.
// No audio files. Everything starts only after a user gesture; M toggles mute.
export class SoundBank {
  constructor() { this.ctx = null; this.muted = false; this.musicTimer = 0; this.note = 0; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  }
  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  noise(dur, vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g).connect(this.ctx.destination); src.start();
  }
  shot() { this.noise(0.12, 0.18); this.tone(160, 0.08, 'square', 0.1, -100); }
  punch() { this.noise(0.06, 0.1); }
  horn() { this.tone(340, 0.22, 'sawtooth', 0.05); this.tone(428, 0.22, 'sawtooth', 0.04); }
  pickup() { this.tone(880, 0.07, 'sine', 0.09); setTimeout(() => this.tone(1320, 0.1, 'sine', 0.09), 60); }
  cash() { this.tone(1180, 0.06, 'triangle', 0.1); setTimeout(() => this.tone(1560, 0.12, 'triangle', 0.1), 55); }
  crash() { this.noise(0.25, 0.2); this.tone(90, 0.2, 'square', 0.08, -40); }
  siren(step) { this.tone(step % 2 ? 660 : 880, 0.16, 'triangle', 0.025); }
  engine(speedRatio) { this.tone(55 + speedRatio * 90, 0.09, 'sawtooth', 0.018); }
  update(dt, driving, speedRatio, policeNear) {
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 0.24;
      const bass = [55, 55, 82.4, 55, 65.4, 55, 73.4, 98][this.note++ % 8];
      this.tone(bass, 0.22, 'triangle', 0.035);
      if (policeNear && this.note % 2 === 0) this.siren(this.note);
      if (driving && this.note % 3 === 0) this.engine(speedRatio);
    }
  }
}
