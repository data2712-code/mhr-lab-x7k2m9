/* ===================================================================
   MHR BATTLE SIM — BOT (sim-bot.js)          v0.12.1 · Easy/Normal/Hard
   ===================================================================
   Dipakai untuk uji otomatis dan sebagai lawan mode Latihan (riwayat #50–#51). Tiga gaya:
   - 'random' : memilih acak di antara aksi sah (level Easy).
   - 'greedy' : heuristik sederhana (memanggil karakter kuat, menyerang
                Weakness atau target yang lebih lemah) (level Normal).
   - 'hard'   : mencoba kandidat pada salinan yang dikaburkan lalu menilai hasil giliran (level Hard).
   Bot hanya membaca informasi yang boleh dilihat pemainnya sendiri:
   tangan sendiri, FIELD terbuka kedua pihak, jumlah kartu lawan.
   RNG bot terpisah dari RNG pertandingan.
   =================================================================== */
(function (root) {
  'use strict';
  const S = (typeof module !== 'undefined' && module.exports) ? require('./sim.js') : root.MHRSim;

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      let t = (s = (s + 0x6D2B79F5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  function chooseRandom(st, rng) {
    const pr = st.prompt;
    if (pr.type === 'discard') return discardLowest(st, pr);
    if (pr.type === 'choose') {
      const n = pr.min + Math.floor(rng() * (pr.max - pr.min + 1)), from = pr.from.slice();
      for (let i = from.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = from[i]; from[i] = from[j]; from[j] = x; }
      return { t: 'choose', cards: from.slice(0, n) };
    }
    let acts = S.legalActions(st, { limit: 200 });
    if (pr.type === 'main' && acts.length > 1 && rng() < 0.75) acts = acts.filter(a => a.t !== 'endAction');
    return pick(rng, acts);
  }

  function value(st, iid) { return S.getPower(st, iid) + 400 * S.getR(st, iid); }
  function discardLowest(st, pr) {
    const h = st.P[pr.p].hand.slice().sort((a, b) => value(st, a) - value(st, b));
    return { t: 'discard', cards: h.slice(0, pr.n) };
  }

  function chooseGreedy(st, rng) {
    const pr = st.prompt, p = pr.p, P = st.P[p];
    switch (pr.type) {
      case 'mulligan': {
        // Kembalikan kartu Lv6 kalau tangan berisi lebih dari 2.
        const big = P.hand.filter(i => S.getLv(st, i) >= 6);
        return { t: 'mulligan', cards: big.length > 2 ? big.slice(2) : [] };
      }
      case 'main': {
        const acts = S.legalActions(st);
        // 1) CALL terbaik ke BATTLE yang kosong (power tertinggi), korban sesedikit mungkin dari BASE.
        const calls = acts.filter(a => a.t === 'call' && a.to !== 'BASE');
        if (calls.length) {
          const score = a => {
            const lostBattle = (a.cost || []).filter(i => S.locate(st, i).zone === 'bat').reduce((s, i) => s + value(st, i), 0);
            const need = { F: 1, W1: 2, W2: 2, B: 3 }[a.to];          // R minimum agar bisa menjangkau FRONT lawan
            const slotBonus = (S.getR(st, a.c) >= need ? 300 : -3000) + (a.to === 'F' ? 200 : 0);
            return value(st, a.c) - lostBattle - 50 * (a.cost || []).length + slotBonus + rng();
          };
          const best = calls.sort((x, y) => score(y) - score(x))[0];
          if (score(best) > 1500) return best;
        }
        // 2) Pindahkan karakter BASE ke slot BATTLE kosong.
        const moveUp = acts.filter(a => a.t === 'bbmove' && a.to !== 'BASE');
        if (moveUp.length) return moveUp.sort((x, y) => value(st, y.c) - value(st, x.c))[0];
        // 2b) Efek ACTI (pasang Hulk Buster / Black Widow, dsb.) kadang-kadang.
        const actis = acts.filter(a => a.t === 'acti');
        if (actis.length && rng() < 0.45) return pick(rng, actis);
        // 3) Base Deployment kartu paling lemah (menambah bahan korban, tarik 1).
        const dep = acts.filter(a => a.t === 'deploy');
        if (dep.length && P.hand.length > 2) return dep.sort((x, y) => value(st, x.c) - value(st, y.c))[0];
        return { t: 'endAction' };
      }
      case 'arrange': {
        // Isi BACK dengan R>=3, WING dengan R>=2, FRONT dengan karakter terkuat sisanya,
        // supaya sebanyak mungkin karakter bisa menjangkau FRONT lawan.
        const chars = S.SLOTS.map(s => P.bat[s]).filter(Boolean).sort((a, b) => S.getR(st, b) - S.getR(st, a) || S.getPower(st, b) - S.getPower(st, a));
        const map = { F: null, W1: null, W2: null, B: null }, rest = chars.slice();
        const take = min => { const i = rest.findIndex(c => S.getR(st, c) >= min); return i < 0 ? null : rest.splice(i, 1)[0]; };
        map.B = take(3); map.W1 = take(2); map.W2 = take(2);
        rest.sort((a, b) => S.getPower(st, b) - S.getPower(st, a));
        map.F = rest.shift() || null;
        ['W1', 'W2', 'B'].forEach(s => { if (!map[s] && rest.length) map[s] = rest.shift(); });
        return S.check(st, { t: 'arrange', map }) ? { t: 'arrange', map: null } : { t: 'arrange', map };
      }
      case 'attack': {
        const atk = S.attackersNow(st);
        let best = null, bestScore = -Infinity;
        atk.forEach(a => {
          const pa = S.getPower(st, a);
          S.targetsFor(st, a).forEach(tg => {
            let sc;
            let air = false;
            if (!tg.iid) sc = 10000;                                  // Weakness = Rush Point
            else if (S.hasAbility(st, a, 'air')) { sc = 9000; air = true; }   // AIR STRIKE: area terisi = Weakness
            else { const pd = S.getPower(st, tg.iid); sc = pa > pd ? 5000 + pd : pa === pd ? 100 : -1000; }
            sc += rng();
            if (sc > bestScore) { bestScore = sc; best = air ? { t: 'attack', a, tg: tg.slot, air: true } : { t: 'attack', a, tg: tg.slot }; }
          });
        });
        if (best && bestScore > 0) return best;
        return { t: 'noAttack', a: atk[0] };
      }
      case 'counter': {
        if (st.vanilla) return { t: 'pass' };
        const acts = S.legalActions(st);
        const b = st.bt && st.bt.cur;
        // COUNTER CALL ke area yang sedang diserang sebagai Weakness.
        const cc = acts.filter(a => a.t === 'ccall' && b && !b.tg && a.to === b.slot && pr.p !== st.tp);
        if (cc.length) return cc[0];
        const ac = acts.filter(a => a.t === 'acti');
        if (ac.length && rng() < 0.3) return pick(rng, ac);
        return { t: 'pass' };
      }
      case 'discard': return discardLowest(st, pr);
      case 'opt': return { t: 'opt', yes: true };
      case 'yesno': return { t: 'yesno', yes: true };
      case 'order': return { t: 'order', job: pr.jobs[0].id };
      case 'choose': {
        const from = pr.from.slice();
        if (pr.prefer === 'high') from.sort((a, b) => value(st, b) - value(st, a)); else from.sort((a, b) => value(st, a) - value(st, b));
        return { t: 'choose', cards: from.slice(0, pr.max) };
      }
      case 'retarget': {
        const ts = S.targetsFor(st, pr.a);
        const w = ts.find(t => !t.iid);
        return { t: 'retarget', tg: (w || ts.sort((x, y) => S.getPower(st, x.iid) - S.getPower(st, y.iid))[0]).slot };
      }
    }
    return S.legalActions(st)[0];
  }

  /* ---------- 'hard' (keputusan pemilik O-13, 7 Nov 2026: level Easy / Normal / Hard) ----------
     Untuk keputusan penting (aksi utama, serangan, Counter, opsi efek) bot mencoba setiap kandidat pada
     SALINAN permainan, menjalankan sisa giliran dengan gaya greedy, lalu menilai hasilnya.
     Kejujuran informasi: sebelum setiap percobaan, salinan "dikaburkan" — kartu HAND lawan dicampur
     dengan Deck lawan lalu dibagi ulang secara acak, Deck sendiri dikocok, RNG pertandingan diganti, dan
     Siaga lawan dikosongkan. Jadi bot tidak melihat isi HAND lawan, urutan Deck, atau hasil acak berikutnya. */
  const HARD_TYPES = { main: 1, attack: 1, counter: 1, opt: 1, yesno: 1, pick: 1, retarget: 1 };
  const HARD_MAX_CAND = 14, HARD_BUDGET_MS = 260, HARD_SAMPLES = 2;
  function shuffleArr(rng, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function hiddenClone(st, me, rng) {
    const L = st.log, A = st.actions;
    st.log = []; st.actions = [];
    let c;
    try { c = S.clone(st); } finally { st.log = L; st.actions = A; }
    c.log = new Array(L.length); c.actions = [];
    const o = 1 - me, O = c.P[o], hn = O.hand.length;
    const pool = shuffleArr(rng, O.hand.concat(O.deck));
    O.hand = pool.slice(0, hn); O.deck = pool.slice(hn); O.armed = [];
    shuffleArr(rng, c.P[me].deck);
    c.rng = Math.floor(rng() * 4294967296) >>> 0;
    return c;
  }
  function boardScore(st, p) {
    const P = st.P[p];
    let s = 0;
    S.SLOTS.forEach(sl => {
      const i = P.bat[sl];
      if (i) s += 220 + S.getPower(st, i) / 8 + 60 * S.getR(st, i);
      else s -= 320;                                             // Weakness terbuka
    });
    s += 35 * P.base.length + 70 * Math.min(P.hand.length, 7);
    if (P.deck.length < 6) s -= (6 - P.deck.length) * 450;       // 103.1.b: Deck habis = kalah
    return s;
  }
  function evaluate(st, me) {
    if (st.result) return st.result.winner === me ? 1e6 : st.result.winner < 0 ? 0 : -1e6;
    const o = 1 - me;
    return 1300 * (st.P[me].rp - st.P[o].rp) + (st.P[me].rp >= 7 ? 600 : 0) - (st.P[o].rp >= 7 ? 600 : 0) +
      boardScore(st, me) - boardScore(st, o);
  }
  // Jalankan sisa giliran (kedua pihak greedy) sampai giliran berganti atau permainan selesai.
  function rollout(c, rng, turn0) {
    for (let k = 0; k < 160 && !c.result && c.prompt && c.turn === turn0; k++) {
      const a = c.prompt.type === 'rps' ? { t: 'rps', v: 'rock' } : chooseGreedy(c, rng);
      if (!S.apply(c, a).ok) break;
    }
  }
  function chooseHard(st, rng) {
    const pr = st.prompt;
    if (!pr || !HARD_TYPES[pr.type] || st.vanilla && pr.type === 'counter') return chooseGreedy(st, rng);
    let acts = S.legalActions(st, { limit: 200 });
    if (acts.length <= 1) return acts[0] || chooseGreedy(st, rng);
    const g = chooseGreedy(st, rng), gk = JSON.stringify(g);
    // Kandidat: pilihan greedy selalu ikut; sisanya diambil acak bila terlalu banyak.
    const rest = shuffleArr(rng, acts.filter(a => JSON.stringify(a) !== gk));
    const cand = [g].concat(rest.slice(0, HARD_MAX_CAND - 1));
    const me = pr.p, t0 = Date.now();
    let best = g, bestV = -Infinity;
    for (let ci = 0; ci < cand.length; ci++) {
      if (ci > 0 && Date.now() - t0 > HARD_BUDGET_MS) break;
      let v = 0;
      for (let s = 0; s < HARD_SAMPLES; s++) {
        const c = hiddenClone(st, me, rng);
        if (!S.apply(c, cand[ci]).ok) { v = -Infinity; break; }
        rollout(c, rng, st.turn);
        v += evaluate(c, me);
      }
      v = v / HARD_SAMPLES + (ci === 0 ? 40 : 0) + rng();          // seri: condong ke pilihan greedy
      if (v > bestV) { bestV = v; best = cand[ci]; }
    }
    return best;
  }

  // Jankenpon (O-14): pilihan acak murni, tidak melihat pilihan lawan.
  const RPS = ['rock', 'paper', 'scissors'];
  function choose(st, style, rng) {
    if (st.prompt && st.prompt.type === 'rps') return { t: 'rps', v: pick(rng, RPS) };
    return (style === 'random' ? chooseRandom : style === 'hard' ? chooseHard : chooseGreedy)(st, rng);
  }

  const API = { makeRng, choose, chooseRandom, chooseGreedy, chooseHard };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MHRBot = API;
})(typeof window !== 'undefined' ? window : this);
