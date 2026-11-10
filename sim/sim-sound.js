/* ===================================================================
   MHR BATTLE SIM — EFEK SUARA (sim-sound.js)            UI v3 · v0.8
   Permintaan pemilik 6 Nov 2026: "tambahkan efek suara untuk setiap action yang terjadi sebagai
   penanda, gunakan beberapa jenis suara untuk membedakan action apa yang sedang terjadi".
   Semua suara dibuat langsung dengan Web Audio (tanpa berkas audio, tanpa internet).
   Pilihan nyala/mati & volume disimpan di localStorage browser ini saja.
   =================================================================== */
(function () {
  'use strict';
  let ctx = null, master = null;
  const st = { on: true, vol: 0.6 };
  try { const v = JSON.parse(localStorage.getItem('mhrsim.sound') || 'null'); if (v) { st.on = v.on !== false; st.vol = +v.vol || 0.6; } } catch (e) { /* abaikan */ }
  function save() { try { localStorage.setItem('mhrsim.sound', JSON.stringify(st)); } catch (e) { /* abaikan */ } }
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = st.vol; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // Satu nada: frekuensi (bisa meluncur ke f2), bentuk gelombang, mulai (detik dari sekarang), durasi, volume.
  function tone(f, o) {
    o = o || {};
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (o.at || 0), d = o.d || 0.12;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.w || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    const v = o.v == null ? 0.35 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(0.012, d / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + d + 0.02);
  }
  // Desis pendek (kertas, sapuan, hantaman), disaring band-pass.
  function noise(o) {
    o = o || {};
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (o.at || 0), d = o.d || 0.15;
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * d)), c.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) bp.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    bp.Q.value = o.q || 1;
    const g = c.createGain(), v = o.v == null ? 0.3 : o.v;
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + d + 0.02);
  }
  /* Satu suara per jenis kejadian. Nama jenis = kategori yang dipakai sim-ui.js. */
  const SFX = {
    call:    () => { tone(523, { d: .09, w: 'triangle' }); tone(784, { at: .07, d: .16, w: 'triangle' }); },            // naik dua nada
    ccall:   () => { tone(880, { d: .07, w: 'square', v: .18 }); tone(660, { at: .08, d: .07, w: 'square', v: .18 }); tone(988, { at: .16, d: .16, w: 'square', v: .2 }); },
    deploy:  () => { tone(180, { f2: 110, d: .14, w: 'sine', v: .45 }); noise({ f: 500, d: .06, v: .12 }); },          // kartu tertutup ke BASE
    move:    () => noise({ f: 600, f2: 2400, d: .18, q: .8, v: .22 }),                                             // sapuan
    draw:    () => noise({ f: 3000, f2: 1500, d: .07, q: 2, v: .16 }),                                             // kertas
    attack:  () => { tone(900, { f2: 220, d: .2, w: 'sawtooth', v: .2 }); noise({ f: 1800, d: .08, v: .12 }); },     // tebasan
    win:     () => { [523, 659, 784].forEach((f, i) => tone(f, { at: i * .07, d: .14, w: 'triangle', v: .3 })); },
    lose:    () => { [392, 330, 262].forEach((f, i) => tone(f, { at: i * .08, d: .16, w: 'triangle', v: .28 })); },
    both:    () => { tone(311, { d: .3, w: 'sawtooth', v: .14 }); tone(330, { d: .3, w: 'sawtooth', v: .14 }); },          // sumbang
    retreat: () => { tone(140, { f2: 70, d: .2, w: 'sine', v: .5 }); },                                           // hantaman rendah
    prune:   () => { tone(400, { f2: 60, d: .35, w: 'sawtooth', v: .15 }); noise({ f: 400, f2: 100, d: .3, v: .15 }); },
    rp:      () => { [659, 880, 1175, 1568].forEach((f, i) => tone(f, { at: i * .08, d: i === 3 ? .35 : .12, w: 'square', v: .16 })); },
    eff:     () => { [1568, 2093, 2637].forEach((f, i) => tone(f, { at: i * .045, d: .09, w: 'sine', v: .18 })); },   // kilau
    mod:     () => { tone(1200, { f2: 1600, d: .1, w: 'sine', v: .15 }); },
    pass:    () => tone(700, { d: .05, w: 'sine', v: .15 }),
    turn:    () => { tone(392, { d: .5, w: 'sine', v: .3 }); tone(588, { at: .02, d: .45, w: 'sine', v: .15 }); },       // lonceng giliran
    phase:   () => tone(1046, { d: .04, w: 'sine', v: .1 }),
    tick:    () => tone(1400, { d: .03, w: 'square', v: .08 }),
    timeout: () => { tone(220, { d: .35, w: 'square', v: .18 }); tone(233, { d: .35, w: 'square', v: .18 }); },
    over:    () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * .12, d: i === 3 ? .6 : .14, w: 'triangle', v: .3 })); },
    ui:      () => tone(1800, { d: .025, w: 'sine', v: .06 }),
    error:   () => { tone(200, { d: .12, w: 'square', v: .12 }); }
  };
  let last = {};
  function play(kind) {
    if (!st.on || !SFX[kind]) return;
    const now = Date.now();
    if (last[kind] && now - last[kind] < 70) return;           // jangan menumpuk suara yang sama
    last[kind] = now;
    try { SFX[kind](); } catch (e) { /* audio tidak tersedia */ }
  }
  // Beberapa kejadian sekaligus: diputar berurutan dengan jeda kecil (maks. 4 supaya tidak riuh).
  function playSeq(kinds) {
    const k = [];
    kinds.forEach(x => { if (x && !k.includes(x)) k.push(x); });
    k.slice(0, 4).forEach((x, i) => setTimeout(() => play(x), i * 140));
  }
  window.MHRSound = {
    play, playSeq, kinds: Object.keys(SFX),
    get on() { return st.on; },
    toggle() { st.on = !st.on; save(); if (st.on) { ac(); play('ui'); } return st.on; },
    setVol(v) { st.vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = st.vol; save(); },
    get vol() { return st.vol; }
  };
})();
