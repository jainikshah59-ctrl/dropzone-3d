/* DropZone 3D — tiny WebAudio synth for game SFX. No audio files needed. */
(function () {
  let ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("dz_muted") === "1"; } catch (e) {}

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = lowpass || 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    } catch (e) {}
  }

  const sfx = {
    unlock() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); },
    click()  { tone(620, 0.07, "triangle", 0.18); },
    bounce(streak) {
      const base = 300 + Math.min(streak, 12) * 28;
      tone(base, 0.09, "sine", 0.22, base * 1.6);
    },
    pass(streak) {
      const base = 520 + Math.min(streak, 15) * 30;
      tone(base, 0.1, "triangle", 0.2, base * 1.35);
    },
    shatter() { noise(0.18, 0.28, 2400); tone(180, 0.12, "square", 0.1, 90); },
    fire()   { noise(0.35, 0.2, 3000); tone(220, 0.3, "sawtooth", 0.12, 660); },
    death()  { tone(320, 0.5, "sawtooth", 0.22, 70); noise(0.3, 0.2, 700); },
    revive() { tone(440, 0.12, "triangle", 0.2, 880); setTimeout(() => tone(660, 0.15, "triangle", 0.2, 990), 110); },
    best()   { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.22), i * 95)); },
    pro()    { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.22), i * 85)); }
  };

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("dz_muted", muted ? "1" : "0"); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.5;
  }
  function isMuted() { return muted; }

  DZ.audio = { sfx, setMuted, isMuted, unlock: sfx.unlock };
})();
