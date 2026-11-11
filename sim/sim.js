/* ===================================================================
   MHR BATTLE SIM — MESIN (sim.js)                      Tahap 1 · v0.5
   ===================================================================
   Mesin murni tanpa DOM: berjalan di browser (window.MHRSim) dan di
   Node (module.exports) supaya Claude bisa menguji otomatis.

   Acuan: Marvel Hero Rush Comprehensive Rules 1.03 (docx) + teks kartu
   INGGRIS (nm_en/e_en). Nomor pasal ditulis di komentar. Rencana &
   riwayat: folder mhr-simulator\. Semua teks yang tampil ke pemain
   berbahasa Inggris (riwayat #14); komentar kode berbahasa Indonesia.

   Dua mode:
   - vanilla (Tahap 0): semua efek & ability diabaikan.
   - efek (Tahap 1): efek kartu dijalankan oleh resolver di sim-cards.js
     (didaftarkan lewat registerCards). Kartu tanpa resolver dimainkan
     vanilla dan diberi tanda.

   Prinsip:
   - Status pertandingan = objek JSON biasa (bisa di-clone/di-hash).
   - Setiap langkah yang butuh keputusan pemain = st.prompt. Input pemain
     = "aksi" yang divalidasi lalu dicatat di st.actions. Seed + daftar
     aksi = kode log; memutar ulang aksi menghasilkan pertandingan yang
     persis sama (replay, undo, laporan bug).
   - Resolver efek ditulis linear: semua pertanyaan (api.ask) diajukan
     SEBELUM perubahan status pertama, sehingga resolver aman diulang dari
     awal setiap kali jawaban baru masuk.
   - Log publik tidak pernah menulis alasan pass.
   =================================================================== */
(function (root) {
  'use strict';

  const VERSION = '0.14.0';
  const SLOTS = ['F', 'W1', 'W2', 'B'];
  const SLOT_NAME = { F: 'FRONT', W1: 'WING 1', W2: 'WING 2', B: 'BACK', BASE: 'BASE' };
  // Posisi pada garis serangan (303.2.a.4.3.1.1): BACK sendiri = 0, WING = 1,
  // FRONT = 2, FRONT lawan = 3, WING lawan = 4, BACK lawan = 5.
  const LINE = { B: 0, W1: 1, W2: 1, F: 2 };
  const BASE_MAX = 6;          // 302.6.a
  const HAND_MAX = 9;          // 303.2.a.6.1.3
  const RP_WIN = 9;            // 103.1.a
  const START_HAND = 6;        // 303.1.d
  const CALL_MAX = 3;          // 303.2.a.3.1.2.2
  const CALL_MAX_FIRST = 1;    // 303.2.a.3.1.2.3
  const COLOR_EN = { Merah: 'Red', Kuning: 'Yellow', Biru: 'Blue', Hijau: 'Green', Orange: 'Orange', Purple: 'Purple' };

  /* ---------------- database kartu & resolver ---------------- */
  let DB = {};
  let DEFS = {};
  /* Set yang DISEMBUNYIKAN (keputusan pemilik 7 Nov 2026, riwayat #48): belum rilis resmi di Indonesia dan teks efeknya
     belum terjemahan resmi. Kartunya tidak dimuat sama sekali: tidak bisa dipakai di deck, kode deck, maupun Sandbox. */
  const HIDDEN_SETS = [];   // riwayat #82 (keputusan pemilik 12 Nov 2026): SD05, SD06, PB02 dibuka dengan terjemahan pra-rilis (Tahap 6). Dulu ['SD05','SD06','PB02'] (#48).
  const isHiddenNo = no => HIDDEN_SETS.includes(String(no || '').slice(0, 4).toUpperCase());
  let hiddenN = 0;
  function init(cards) {
    DB = {}; hiddenN = 0;
    (cards || []).forEach(c => {
      if (!c || !c.no || typeof c.l !== 'number') return;
      if (isHiddenNo(c.no)) { hiddenN++; return; }
      DB[c.no] = c;
    });
    return Object.keys(DB).length;
  }
  function hiddenCount() { return hiddenN; }
  function registerCards(defs) { Object.assign(DEFS, defs || {}); return Object.keys(DEFS).length; }
  function hasResolver(no) { return !!DEFS[no]; }
  function card(no) { return DB[no] || null; }
  /* Acuan simulator = versi INGGRIS (keputusan pemilik 29 Oktober 2026, riwayat #13). */
  function nameEn(c) { return c ? (c.nm_en || c.nm) : ''; }
  function textEn(c) { return c ? (c.e_en || '') : ''; }
  // Kunci "nama karakter sama" (201.7.c–d): nama Inggris tanpa beda spasi/kurung/huruf besar.
  function nameKey(c) { return nameEn(c).replace(/[「【\[]/g, '[').replace(/[」】\]]/g, ']').replace(/\s+/g, '').toLowerCase(); }

  /* ---------------- RNG ber-seed (mulberry32) ---------------- */
  function rngNext(st) {
    let t = (st.rng = (st.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(st, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rngNext(st) * (i + 1));
      const x = arr[i]; arr[i] = arr[j]; arr[j] = x;
    }
    return arr;
  }
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    String(s).split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; });
    return h >>> 0;
  }

  /* ---------------- kode deck mhrdecklab (format versi 1) ---------------- */
  const SER2L = { BP01: 'A', PB01: 'B', EB01: 'C', TB01: 'D', SD01: 'E', SD02: 'F', SD03: 'G', SD04: 'H', SP01: 'I', SD05: 'J', SD06: 'K', PB02: 'L' };
  const L2SER = Object.fromEntries(Object.entries(SER2L).map(([k, v]) => [v, k]));
  function b64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try {
      const bin = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
      return decodeURIComponent(escape(bin));
    } catch (e) { return ''; }
  }
  function decodeDeckCode(text) {
    const t = String(text || '').trim();
    const m = t.match(/#d=([^\s&"'<>]+)/);
    let code = m ? decodeURIComponent(m[1]) : null;
    if (!code) { const b = t.match(/\b1\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9]{4,}\b/); code = b ? b[0] : null; }
    if (!code) return null;
    const seg = code.split('.');
    if (seg[0] !== '1') return null;
    const name = b64urlDecode(seg[1] || '') || 'Deck';
    const body = seg[2] || '';
    const list = []; let unknown = 0, hidden = 0;
    for (let i = 0; i + 5 <= body.length; i += 5) {
      const ser = L2SER[body[i]], num = body.slice(i + 1, i + 4), q = parseInt(body[i + 4], 36);
      const no = ser ? ser + '-' + num : null;
      if (no && DB[no] && q > 0) { for (let k = 0; k < q; k++) list.push(no); }
      else if (no && isHiddenNo(no) && q > 0) hidden += q;      // riwayat #48: set yang disembunyikan
      else unknown++;
    }
    return { name, list, unknown, hidden };
  }

  const HIDDEN_MSG = 'Cards from SD05, SD06 and PB02 are not available in the simulator yet (not released in Indonesia with official text)';
  // Kode deck format situs (versi 1, sama dengan encodeDeck() di index.html situs) — untuk riwayat pertandingan.
  function encodeDeckCode(list, name) {
    const q = {}, order = [];
    (list || []).forEach(no => { if (!(no in q)) { q[no] = 0; order.push(no); } q[no]++; });
    const parts = [];
    order.forEach(no => { const m = no.match(/^([A-Z0-9]+)-(\d{3})$/); const L = m && SER2L[m[1]]; if (L) parts.push(L + m[2] + Math.min(q[no], 35).toString(36)); });
    return '1.' + b64urlEncode(name || 'Deck') + '.' + parts.join('');
  }
  /* Validasi konstruksi deck (101.1). */
  function validateDeck(list) {
    const errs = [];
    if (!Array.isArray(list)) return ['Deck could not be read.'];
    const hid = list.filter(no => !DB[no] && isHiddenNo(no)), miss = list.filter(no => !DB[no] && !isHiddenNo(no));
    if (hid.length) errs.push(HIDDEN_MSG + ' (' + Array.from(new Set(hid)).join(', ') + ')');
    if (miss.length) errs.push('Unknown cards: ' + Array.from(new Set(miss)).join(', '));
    if (list.length !== 50) errs.push('A Deck must contain exactly 50 cards (101.1.b); this one has ' + list.length + '.');
    const colors = new Set(list.filter(no => DB[no]).map(no => DB[no].c));
    if (colors.size > 2) errs.push('A Deck may contain no more than 2 colors (101.1.c); this one has ' + colors.size + ': ' + Array.from(colors).map(c => COLOR_EN[c] || c).join(', ') + '.');
    const byName = {}, label = {};
    list.forEach(no => { const c = DB[no]; if (c) { const k = nameKey(c); byName[k] = (byName[k] || 0) + 1; label[k] = label[k] || nameEn(c); } });
    Object.entries(byName).forEach(([k, q]) => { if (q > 3) errs.push('No more than 3 cards with the same Character name (101.1.d): ' + label[k] + ' ×' + q + '.'); });
    return errs;
  }

  /* Deck uji. BUKAN komposisi produk SD01 resmi: 18 kartu SD01,
     masing-masing 3 lembar kecuali SD01-001 dan SD01-002 (1 lembar) = 50. */
  function testDeckSD01() { return testDeck('SD01'); }
  // Deck uji untuk starter mana pun (SD01–SD04): pola yang sama dengan deck uji SD01.
  function testDeck(set) {
    const out = [];
    // BP01 per warna (Tahap 3): BP01R = 001–030, BP01Y = 031–060, BP01B = 061–090, BP01G = 091–120.
    // 50 kartu: 20 nomor pertama ×2, 10 nomor berikutnya ×1 (maks 3 per nama tetap terpenuhi).
    // Tahap 5: SP01 per warna (SPR = 001–020, SPY = 021–040, SPB = 041–060, SPG = 061–080): 10 nomor pertama ×3, 10 berikutnya ×2.
    const sp = { SPR: 1, SPY: 21, SPB: 41, SPG: 61 }[set];
    if (sp) { for (let k = 0; k < 20; k++) { const no = 'SP01-' + String(sp + k).padStart(3, '0'); for (let j = 0; j < (k < 10 ? 3 : 2); j++) out.push(no); } return out; }
    const bp = { BP01R: 1, BP01Y: 31, BP01B: 61, BP01G: 91, S4R: 1, S4Y: 31, S4B: 61, S4G: 91 }[set];
    if (bp) {
      // Tahap 4: deck uji S4x = 40 kartu pertama deck BP01 warna itu + 10 kartu PB01/EB01/TB01 warna yang sama.
      const s4 = { S4R: [['PB01-001', 3], ['PB01-007', 3], ['EB01-006', 3], ['EB01-010', 1]],
        S4Y: [['PB01-002', 3], ['PB01-008', 3], ['PB01-009', 2], ['EB01-007', 2]],
        S4B: [['PB01-003', 2], ['PB01-004', 3], ['PB01-010', 3], ['EB01-008', 2]],
        S4G: [['PB01-005', 2], ['PB01-006', 3], ['PB01-011', 2], ['EB01-009', 2], ['TB01-001', 1]] }[set];
      for (let k = 0; k < 30; k++) { const no = 'BP01-' + String(bp + k).padStart(3, '0'); if (s4 && k >= 20) continue; out.push(no); if (k < 20) out.push(no); }
      if (s4) s4.forEach(([no, n]) => { for (let j = 0; j < n; j++) out.push(no); });
      return out;
    }
    for (let i = 1; i <= 18; i++) {
      const no = set + '-' + String(i).padStart(3, '0');
      const q = (i === 1 || i === 2) ? 1 : 3;
      for (let k = 0; k < q; k++) out.push(no);
    }
    return out;
  }

  /* ---------------- akses status ---------------- */
  function opp(p) { return 1 - p; }
  function cardOf(st, iid) { return card(st.inst[iid].no); }
  function nameOf(st, iid) { const c = cardOf(st, iid); return c ? nameEn(c) : iid; }
  function plabel(st, p) { return st.names ? st.names[p] : 'P' + (p + 1); }
  /* Tahap 5 (SP01): definisi efektif sebuah kartu.
     - "loses its effects" (SP01-067 Anti-Venom, CR 301.33.a / 520): kartu yang dipasangi kartu ber-def.strip tidak punya
       TRIG/ACTI/AUTO/kemampuan; efek yang didapat sesudahnya juga hilang. [UNIQUE] tidak bisa hilang (isUnique membaca DEFS).
     - "gets the effects of 1 of its attached cards this turn" (SP01-047 Knull): gr.borrow = nomor kartu; id efek pinjaman
       diberi awalan 'b:'. */
  function lostEffects(st, iid) {
    const x = st.inst[iid];
    if (st.vanilla || !x) return false;
    if (x.gr && x.gr.lose === st.turn) return true;                // Tahap 6 (SD05-007): "this card loses its effects in this turn"
    if (!x.att.length) return false;
    return x.att.some(a => { const d = DEFS[st.inst[a].no]; return !!(d && d.strip) && !st.inst[a].fd; });
  }
  const MERGED = new Map();
  function mergeDef(no, bno) {
    const k = no + '|' + bno;
    if (MERGED.has(k)) return MERGED.get(k);
    const base = DEFS[no] || {}, B = DEFS[bno] || {};
    const ren = l => (l || []).map(e => Object.assign({}, e, { id: 'b:' + e.id, label: (e.label || 'Effect') + ' (borrowed)' }));
    const m = Object.assign({}, base);
    m.trig = (base.trig || []).concat(ren(B.trig));
    m.acti = (base.acti || []).concat(ren(B.acti));
    m.auto = (base.auto || []).concat(B.auto || []);
    ['block', 'air', 'assault', 'double', 'abil', 'redMul', 'atkLimit', 'dist'].forEach(f => { if (B[f] && !base[f]) m[f] = B[f]; });
    MERGED.set(k, m);
    return m;
  }
  function defOf(st, iid) {
    if (st.vanilla) return null;
    const x = st.inst[iid], d = DEFS[x.no] || null;
    if (!d && !(x.gr && x.gr.borrow)) return null;
    if (lostEffects(st, iid)) return null;
    if (x.gr && x.gr.borrow && x.gr.borrowT === st.turn) return mergeDef(x.no, x.gr.borrow);
    return d;
  }

  // Lokasi kartu: {p, zone:'deck'|'hand'|'bat'|'base'|'att'|'ret'|'void', slot?, host?}
  function locate(st, iid) {
    for (let p = 0; p < 2; p++) {
      const P = st.P[p];
      for (const s of SLOTS) if (P.bat[s] === iid) return { p, zone: 'bat', slot: s };
      if (P.base.includes(iid)) return { p, zone: 'base' };
      if (P.hand.includes(iid)) return { p, zone: 'hand' };
    }
    for (let p = 0; p < 2; p++) {
      const P = st.P[p];
      if (P.ret.includes(iid)) return { p, zone: 'ret' };
      if (P.void.includes(iid)) return { p, zone: 'void' };
      if (P.deck.includes(iid)) return { p, zone: 'deck' };
    }
    const x = st.inst[iid];
    if (x && x.host) { const H = locate(st, x.host); if (H) return { p: H.p, zone: 'att', host: x.host, hostZone: H.zone, slot: H.slot }; }
    return null;
  }
  // Karakter & kartu tertutup di FIELD (tanpa kartu terpasang).
  function fieldCards(st, p) {
    const P = st.P[p];
    return SLOTS.map(s => P.bat[s]).filter(Boolean).concat(P.base);
  }
  function battleCards(st, p) { return SLOTS.map(s => st.P[p].bat[s]).filter(Boolean); }
  // Karakter terbuka di FIELD (BATTLE + BASE, bukan kartu tertutup, bukan kartu terpasang).
  function charsOnField(st, p) { return fieldCards(st, p).filter(i => !st.inst[i].fd); }
  // Zona efek kartu: 'BATTLE' | 'BASE' | 'ATTACHED' | 'HAND' | 'DECK' | 'RETREAT' | 'VOID'
  function effZone(st, iid) {
    const L = locate(st, iid); if (!L) return null;
    return { bat: 'BATTLE', base: 'BASE', att: 'ATTACHED', hand: 'HAND', deck: 'DECK', ret: 'RETREAT', void: 'VOID' }[L.zone];
  }
  // Apakah kartu berada di zona efek yang ditulis di kartu (FIELD/BATTLE/HAND/RETREAT).
  function inZone(st, iid, z) {
    const x = st.inst[iid], L = locate(st, iid); if (!L) return false;
    if (x.fd) return false;                                     // 301.21.c kartu tertutup kehilangan efek
    if (z === 'FIELD') return L.zone === 'bat' || L.zone === 'base' || L.zone === 'att';   // 301.25.k
    if (z === 'BATTLE') return L.zone === 'bat' || (L.zone === 'att' && L.hostZone === 'bat');
    const slot = L.zone === 'bat' || (L.zone === 'att' && L.hostZone === 'bat') ? L.slot : null;
    if (z === 'FRONT') return slot === 'F';
    if (z === 'WING') return slot === 'W1' || slot === 'W2';
    if (z === 'BACK') return slot === 'B';
    if (z === 'BASE') return L.zone === 'base' || (L.zone === 'att' && L.hostZone === 'base');
    if (z === 'HAND') return L.zone === 'hand';
    if (z === 'RETREAT') return L.zone === 'ret';
    if (z === 'VOID') return L.zone === 'void';
    return false;
  }

  /* ---------------- nilai saat ini (Lv/R/Power) — CR 301.41 ----------------
     Dua jenis perubahan: naik/turun (±X) dan "berubah menjadi X" (change).
     - Setiap perubahan punya cap waktu t. Modifier TRIG/ACTI ("this turn") dicap saat dibuat;
       aura AUTO dicap saat mulai berlaku = max(saat sumber masuk area sekarang, saat target masuk
       area sekarang) — dicatat settle() lewat inst.zt.
     - Nilai = change TERAKHIR (atau nilai cetak bila tidak ada) + semua ± yang dicap SESUDAH change itu
       (301.41.f/h/i/k). ± yang lebih tua dari change tidak berlaku (301.41.a–c, g, j).
     - ± dan change TRIG/ACTI yang tertimpa change baru berakhir selamanya: dihapus di settle()
       (301.41.a/b/c). ± AUTO kembali berlaku bila change-nya berakhir (301.41.g/j), karena dihitung ulang.
     - Dua change: yang terakhir menang; bila berakhir, yang sebelumnya berlaku lagi (301.41.d). */
  const computing = new Set();
  // Daftar kartu yang punya efek AUTO (identitas kartu tidak berubah selama pertandingan).
  const AUTO_CACHE = new WeakMap();
  function autoSources(st) {
    let l = AUTO_CACHE.get(st.inst);
    if (!l) { l = Object.keys(st.inst).filter(i => { const d = DEFS[st.inst[i].no]; return d && (d.auto || d.borrows); }); AUTO_CACHE.set(st.inst, l); }
    return l;
  }
  // Semua perubahan yang berlaku pada stat iid: [{t, set?, d, temp}]
  function statEntries(st, iid, stat) {
    const out = [];
    (st.inst[iid].mods || []).forEach(m => { if (m.s === stat) out.push({ t: m.t || 0, set: m.set, d: m.d || 0, temp: true, src: m.src || null, manual: !!m.manual }); });
    if (st.vanilla) return out;
    const key = iid + ':' + stat;
    if (computing.has(key)) { guardHits++; return out; }        // cegah rekursi aura
    computing.add(key);
    try {
      const tz = st.inst[iid].zt || 0;
      // Sumber AUTO hanya berlaku di FIELD (termasuk terpasang) atau HAND: saring cepat sebelum locate().
      const live = new Set();
      for (let p = 0; p < 2; p++) {
        const P = st.P[p];
        SLOTS.forEach(sl => { const i = P.bat[sl]; if (i) { live.add(i); st.inst[i].att.forEach(a => live.add(a)); } });
        P.base.forEach(i => { live.add(i); st.inst[i].att.forEach(a => live.add(a)); });
        P.hand.forEach(i => live.add(i));
      }
      for (const src of autoSources(st)) {
        if (!live.has(src)) continue;
        const def = defOf(st, src);
        if (!def || !def.auto) continue;
        for (const a of def.auto) {
          if (a.stat !== stat) continue;
          if (!inZone(st, src, a.zone)) continue;
          const A = readApi(st, src);
          if (immuneTo(st, iid, src)) continue;
          const v = a.value(A, src, iid);
          if (!v) continue;
          const t = Math.max(st.inst[src].zt || 0, tz);
          if (typeof v === 'object') out.push({ t, set: v.set, d: v.d || 0, auto: true, src });
          else out.push({ t, d: v, auto: true, src });
        }
      }
    } finally { computing.delete(key); }
    return out;
  }
  /* Tahap 5: pengurangan Power diubah oleh efek lain. SP01-052 Scream "Any Power-reductions to this card are doubled"
     (def.redMul), SP01-013 Tony Stark "any Power-reductions to all your characters on BATTLE are reduced by 500" per Lv6
     (def.redCut di sumber). Urutan (RS-055, keputusan pemilik K-37): dikurangi dulu, lalu dilipatgandakan; tidak pernah menjadi penambahan. */
  function redFn(st, iid) {
    if (st.vanilla) return null;
    const d = defOf(st, iid);
    const mul = d && d.redMul && inZone(st, iid, d.redMul.zone || 'BATTLE') ? d.redMul.n : 1;
    let cut = 0;
    const L = locate(st, iid);
    if (L && L.zone === 'bat') charsOnField(st, L.p).forEach(src => {
      const ds = defOf(st, src);
      if (ds && ds.redCut && inZone(st, src, ds.redCut.zone)) { try { cut += ds.redCut.value(readApi(st, src), src, iid) || 0; } catch (e) { /* abaikan */ } }
    });
    if (mul === 1 && !cut) return null;
    return v => Math.min(0, v + cut) * mul;          // K-37: dikurangi (Tony) dulu, lalu dilipatgandakan (Scream)
  }
  function adjEntries(st, iid, stat) {
    const ents = statEntries(st, iid, stat);
    if (stat !== 'p' || !ents.some(e => e.d < 0 && e.set == null)) return ents;
    const f = redFn(st, iid); if (!f) return ents;
    return ents.map(e => e.d < 0 && e.set == null ? Object.assign({}, e, { d: f(e.d), raw: e.d }) : e);
  }
  function lastSet(ents) {
    let s = null;
    ents.forEach(e => { if (e.set != null && (!s || e.t >= s.t)) s = e; });
    return s;
  }
  /* Cache nilai stat: berlaku selama tidak ada entri log baru, cap waktu baru, atau perubahan modifier
     (setiap perubahan status di mesin selalu diikuti entri log). Hasil yang terkena penjaga rekursi tidak disimpan. */
  let guardHits = 0;
  const STAT_CACHE = new WeakMap();
  function statCache(st) {
    const k = st.log.length + ':' + st.tick + ':' + (st.mver || 0);
    let c = STAT_CACHE.get(st);
    if (!c || c.k !== k) { c = { k, m: new Map() }; STAT_CACHE.set(st, c); }
    return c.m;
  }
  function rawStat(st, iid, stat) {
    const m = statCache(st), ck = iid + ':' + stat;
    if (m.has(ck)) return m.get(ck);
    const g0 = guardHits;
    const c = cardOf(st, iid), base = stat === 'lv' ? c.l : stat === 'r' ? c.r : c.p;
    const ents = adjEntries(st, iid, stat);
    let v = base;
    if (ents.length) {
      const s = lastSet(ents);
      v = s ? s.set : base;
      ents.forEach(e => { if (e.d && (!s || e.t > s.t)) v += e.d; });
    }
    if (guardHits === g0 && computing.size === 0) m.set(ck, v);
    return v;
  }
  // Kartu dipindah/berganti area → cap waktu baru (dipakai untuk urutan aura AUTO, 301.41).
  function stampZones(st) {
    for (const i in st.inst) {
      const L = locate(st, i), x = st.inst[i];
      const k = L ? L.zone + ':' + (L.slot || '') + ':' + (L.host || '') + ':' + (x.fd ? 1 : 0) : '-';
      if (x.lk !== k) { x.lk = k; x.zt = ++st.tick; }
    }
  }
  // 301.41.a–c: ± / change TRIG/ACTI yang tertimpa change yang lebih baru berakhir selamanya.
  function pruneMods(st) {
    for (const i in st.inst) {
      const x = st.inst[i];
      if (!x.mods.length) continue;
      ['p', 'r', 'lv'].forEach(stat => {
        if (!x.mods.some(m => m.s === stat)) return;
        const s = lastSet(statEntries(st, i, stat));
        if (s) { const n = x.mods.length; x.mods = x.mods.filter(m => m.s !== stat || (m.t || 0) >= s.t); if (x.mods.length !== n) st.mver = (st.mver || 0) + 1; }
      });
    }
  }
  /* Rincian stat untuk tampilan (UI v3, rekomendasi #4). Hanya membaca; urutan & aturan sama dengan rawStat():
     change terakhir (atau nilai cetak) + ± yang dicap sesudahnya. Baris yang tertimpa change ditandai off. */
  function statBreakdown(st, iid, stat) {
    const c = cardOf(st, iid), base = stat === 'lv' ? c.l : stat === 'r' ? c.r : c.p;
    const ents = adjEntries(st, iid, stat).slice().sort((a, b) => a.t - b.t);
    const s = lastSet(ents);
    const rows = ents.filter(e => e.set != null || e.d).map(e => ({
      src: e.src || null, srcName: e.src ? nameOf(st, e.src) : null, kind: e.manual ? 'manual' : e.auto ? 'auto' : 'temp',
      set: e.set != null ? e.set : null, d: e.set != null ? 0 : e.d, on: e.set != null ? e === s : (!s || e.t > s.t)
    }));
    const value = stat === 'lv' ? getLv(st, iid) : stat === 'r' ? getR(st, iid) : getPower(st, iid);
    return { base, rows, value };
  }
  function getLv(st, iid) { return Math.max(0, rawStat(st, iid, 'lv')); }
  function getR(st, iid) { return Math.max(0, rawStat(st, iid, 'r')); }
  function getPower(st, iid) { return Math.max(0, rawStat(st, iid, 'p')); }
  function printedLv(st, iid) { return cardOf(st, iid).l; }

  /* ---------------- log ---------------- */
  function log(st, k, txt, extra) {
    const e = Object.assign({ n: st.log.length, turn: st.turn, k, txt }, extra || {});
    st.log.push(e);
    return e;
  }

  /* ---------------- membuat pertandingan (303.1) ---------------- */
  function newInst(iid, no, p) { return { iid, no, owner: p, fd: false, enT: -1, bbm: -1, atkT: -1, atkN: 0, dclT: -1, tgdT: -1, tgdN: 0, att: [], host: null, mods: [], once: {}, tw: {}, gr: {}, zt: 0, lk: '' }; }
  function createGame(opts) {
    opts = opts || {};
    if (opts.position) return createFromPosition(opts);
    const seed = (opts.seed == null ? Math.floor(Math.random() * 4294967296) : opts.seed) >>> 0;
    const st = {
      v: 1, engine: VERSION, seed, rng: seed, vanilla: opts.vanilla !== false,
      names: opts.names || ['P1', 'P2'],
      decks: [opts.decks[0].slice(), opts.decks[1].slice()],
      firstOpt: opts.first == null ? 'random' : opts.first,
      turn: 0, tp: 0, first: 0, phase: 'setup',
      inst: {}, P: [], cnt: null, bt: null, win: null, mull: null,
      pend: [], job: null, jid: 0, snap: {}, bseq: 0, curB: 0, tick: 0, siaga: !!opts.siaga, confirm: !!opts.confirm,
      prompt: null, result: null, log: [], actions: []
    };
    // O0 (riwayat #59): mode online → nomor kartu (iid) diacak dengan seed rahasia server, supaya iid tidak membocorkan
    // posisi kartu di daftar deck. Lokal: urutan daftar deck seperti biasa.
    if (opts.opaque) st.opaque = true;
    if (opts.toLimit) st.toLimit = opts.toLimit | 0;
    for (let p = 0; p < 2; p++) {
      const deck = [], idx = st.decks[p].map((_, i) => i);
      if (st.opaque) shuffle(st, idx);
      idx.forEach((di, k) => {
        const iid = (p === 0 ? 'a' : 'b') + (k + 1);
        st.inst[iid] = newInst(iid, st.decks[p][di], p);
        deck.push(iid);
      });
      st.P.push({ deck, hand: [], bat: { F: null, W1: null, W2: null, B: null }, base: [], ret: [], void: [], rp: 0, rpDeck: 9, armed: [] });
    }
    log(st, 'start', 'Game started (engine v' + VERSION + (st.vanilla ? ', vanilla mode: card effects are ignored' : ', card effects ON (Stage 5: SD01–SD04, BP01, PB01, EB01, TB01, SP01)') + ', seed ' + seed + ').');
    shuffle(st, st.P[0].deck); shuffle(st, st.P[1].deck);              // 303.1.a
    st.first = st.firstOpt === 'random' ? (rngNext(st) < 0.5 ? 0 : 1) : (st.firstOpt | 0);   // 303.1.c
    log(st, 'first', plabel(st, st.first) + ' is the first player.');
    for (let p = 0; p < 2; p++) draw(st, p, START_HAND);                 // 303.1.d
    st.mull = { order: [st.first, opp(st.first)], idx: 0 };              // 303.1.e
    st.phase = 'mulligan';
    advance(st);
    return st;
  }


  /* ---------------- SANDBOX: posisi bebas (Tahap 1c) ----------------
     Posisi = JSON yang menyusun kedua pihak secara manual, lalu permainan dimulai dari awal
     Action Phase pemain giliran (setelah Draw Phase). Bentuk:
       { v:1, x:1|0 (efek), seed, turn, tp, names:[..], cnt?:{call,deploy},
         pl:[{ deck:[no..] (atas → bawah), hand:[no..], ret:[no..], void:[no..], rp:0–8,
               bat:{F|W1|W2|B: null | {no, fd?, n?, att:[no..]}}, base:[{no, fd?, n?, att:[no..]}] } ×2] }
     fd = kartu tertutup (hanya di BASE), n = "ditempatkan ke FIELD giliran ini" (tidak boleh BATTLE-BASE MOVE),
     att = kartu terpasang pada kartu itu (urutan = urutan dipasang, 301.25.m).
     Kode posisi: 'MHRPOS1.' + base64url(JSON). Kode log permainan Sandbox menyimpan posisi ini (field q),
     jadi replay & undo tetap memutar ulang persis sama. */
  function fieldEntries(pl) {
    const out = [];
    SLOTS.forEach(s => { const e = pl.bat && pl.bat[s]; if (e) out.push({ where: s, e }); });
    (pl.base || []).forEach(e => out.push({ where: 'BASE', e }));
    return out;
  }
  function validatePosition(pos) {
    const errs = [];
    if (!pos || typeof pos !== 'object' || !Array.isArray(pos.pl) || pos.pl.length !== 2) return ['Position could not be read.'];
    const turn = pos.turn | 0, tp = pos.tp | 0;
    if (turn < 1) errs.push('Turn number must be 1 or higher.');
    if (tp !== 0 && tp !== 1) errs.push('Turn player must be Player 1 or Player 2.');
    pos.pl.forEach((pl, p) => {
      const who = 'Player ' + (p + 1) + ': ';
      const all = [];
      ['deck', 'hand', 'ret', 'void'].forEach(z => (pl[z] || []).forEach(no => all.push(no)));
      fieldEntries(pl).forEach(({ where, e }) => {
        all.push(e.no); (e.att || []).forEach(no => all.push(no));
        if (e.fd && where !== 'BASE') errs.push(who + 'a face-down card can only be in the BASE (301.21.a).');
        if (e.fd && (e.att || []).length) errs.push(who + 'a Face-Down Card cannot have Attached Cards (301.25.l).');
      });
      const miss = all.filter(no => !DB[no]);
      if (miss.length) errs.push(who + 'unknown card(s): ' + Array.from(new Set(miss)).join(', ') + '.');
      if ((pl.base || []).length > BASE_MAX) errs.push(who + 'BASE holds at most 6 cards, Face-Down Cards included (302.6.a).');
      const rp = pl.rp | 0;
      if (rp < 0 || rp > 8) errs.push(who + 'Rush Points must be 0–8 (9 would already win the game).');
      if (!(pl.deck || []).length) errs.push(who + 'the Deck must have at least 1 card (a Deck with 0 cards loses, 103.1.b).');
      if (all.length === 0) errs.push(who + 'no cards.');
    });
    return errs;
  }
  function createFromPosition(opts) {
    const pos = JSON.parse(JSON.stringify(opts.position));
    const errs = validatePosition(pos);
    if (errs.length) throw new Error('Invalid position: ' + errs.join(' '));
    const seed = ((pos.seed == null ? (opts.seed == null ? 1 : opts.seed) : pos.seed) >>> 0);
    const turn = pos.turn | 0, tp = pos.tp | 0;
    const st = {
      v: 1, engine: VERSION, seed, rng: seed, vanilla: opts.vanilla != null ? opts.vanilla !== false : !pos.x,
      names: opts.names || pos.names || ['P1', 'P2'], decks: [[], []], firstOpt: 'position', pos,
      turn, tp, first: (turn % 2 === 1) ? tp : opp(tp), phase: 'setup',
      inst: {}, P: [], cnt: null, bt: null, win: null, mull: null,
      pend: [], job: null, jid: 0, snap: {}, bseq: 0, curB: 0, tick: 0, siaga: !!opts.siaga, confirm: !!opts.confirm,
      prompt: null, result: null, log: [], actions: []
    };
    for (let p = 0; p < 2; p++) {
      const pl = pos.pl[p], P = { deck: [], hand: [], bat: { F: null, W1: null, W2: null, B: null }, base: [], ret: [], void: [], rp: pl.rp | 0, rpDeck: 9 - (pl.rp | 0), armed: [] };
      let k = 0;
      const mk = no => { const iid = (p === 0 ? 'a' : 'b') + (++k); st.inst[iid] = newInst(iid, no, p); st.decks[p].push(no); return iid; };
      const place = e => {
        const iid = mk(e.no), x = st.inst[iid];
        x.fd = !!e.fd; x.enT = e.n ? turn : -1;
        (e.att || []).forEach(no => { const a = mk(no); st.inst[a].host = iid; st.inst[a].enT = e.n ? turn : -1; x.att.push(a); });
        return iid;
      };
      (pl.deck || []).forEach(no => P.deck.push(mk(no)));
      (pl.hand || []).forEach(no => P.hand.push(mk(no)));
      SLOTS.forEach(s => { if (pl.bat && pl.bat[s]) P.bat[s] = place(pl.bat[s]); });
      (pl.base || []).forEach(e => P.base.push(place(e)));
      (pl.ret || []).forEach(no => P.ret.push(mk(no)));
      (pl.void || []).forEach(no => P.void.push(mk(no)));
      st.P.push(P);
    }
    log(st, 'start', 'Sandbox position loaded (engine v' + VERSION + (st.vanilla ? ', vanilla mode: card effects are ignored' : ', card effects ON (Stage 5: SD01–SD04, BP01, PB01, EB01, TB01, SP01)') + ', seed ' + seed + ').');
    st.cnt = { call: 0, deploy: 0, arranged: false, cc: [0, 0], ccp: [0, 0], noCost5: [false, false] };
    if (pos.cnt) { st.cnt.call = pos.cnt.call | 0; st.cnt.deploy = pos.cnt.deploy | 0; }
    log(st, 'turn', '— Turn ' + turn + ': ' + plabel(st, tp) + ' (Sandbox start: Action Phase) —');
    st.phase = 'action';
    log(st, 'phase', 'Action Phase.');
    settle(st);                                // Power 0, kondisi menang, snapshot statistik awal
    advance(st);
    return st;
  }
  // Posisi dari permainan yang sedang berjalan (hanya di prompt Action Phase tanpa efek tertunda).
  function positionFrom(st) {
    if (!st || st.result || !st.prompt || st.prompt.type !== 'main' || st.job || st.pend.length) return null;
    const ent = iid => {
      const x = st.inst[iid], e = { no: x.no };
      if (x.fd) e.fd = 1;
      if (x.enT === st.turn) e.n = 1;
      if (x.att.length) e.att = x.att.map(a => st.inst[a].no);
      return e;
    };
    const lost = Object.keys(st.inst).some(i => st.inst[i].mods.length);
    return {
      v: 1, x: st.vanilla ? 0 : 1, seed: st.rng >>> 0, turn: st.turn, tp: st.tp, names: st.names.slice(),
      cnt: { call: st.cnt.call, deploy: st.cnt.deploy }, lostThisTurn: lost ? 1 : 0,
      pl: st.P.map(P => ({
        deck: P.deck.map(i => st.inst[i].no), hand: P.hand.map(i => st.inst[i].no),
        ret: P.ret.map(i => st.inst[i].no), void: P.void.map(i => st.inst[i].no), rp: P.rp,
        bat: Object.fromEntries(SLOTS.map(s => [s, P.bat[s] ? ent(P.bat[s]) : null])),
        base: P.base.map(ent)
      }))
    };
  }
  function exportPosition(pos) { return 'MHRPOS1.' + b64urlEncode(JSON.stringify(pos)); }
  function parsePosition(code) {
    const m = String(code || '').trim().match(/MHRPOS1\.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try { return JSON.parse(b64urlDecode(m[1])); } catch (e) { return null; }
  }
  // Susun posisi awal dari dua daftar deck (semua kartu di Deck, diacak dengan seed) — titik awal editor.
  function emptyPosition(decks, seed, names) {
    const st = { rng: (seed >>> 0) || 1 };
    return {
      v: 1, x: 1, seed: (seed >>> 0) || 1, turn: 3, tp: 0, names: names || ['Player 1', 'Player 2'],
      pl: [0, 1].map(p => ({ deck: shuffle(st, decks[p].slice()), hand: [], ret: [], void: [], rp: 0, bat: { F: null, W1: null, W2: null, B: null }, base: [] }))
    };
  }

  /* ---------------- operasi dasar ---------------- */
  function draw(st, p, n) {
    const P = st.P[p], got = [];
    for (let i = 0; i < n; i++) {
      if (!P.deck.length) break;
      const iid = P.deck.shift();
      P.hand.push(iid); got.push(iid);
      if (checkWin(st)) break;   // 103.1.b — deck 0 langsung kalah
    }
    log(st, 'draw', plabel(st, p) + ' draws ' + got.length + (got.length === 1 ? ' card.' : ' cards.'), { pp: p, ptxt: got.map(i => nameOf(st, i)).join(', '), cards: got });
    got.forEach(i => lateHand(st, i));
    return got;
  }
  /* RS-019 (CR 304.1.k): kartu yang masuk HAND saat efek dari satu timing masih diselesaikan, dan punya Trigger HAND yang
     syaratnya cocok dengan event timing itu, ikut terpicu. Mode Siaga: kartu itu belum bisa disiagakan, jadi tidak terpicu. */
  function lateHand(st, iid) {
    if (st.vanilla || !st.tev || !st.tev.length || !(st.job || st.pend.length)) return;
    const def = defOf(st, iid); if (!def || !def.trig) return;
    const L = locate(st, iid); if (!L || L.zone !== 'hand') return;
    if (st.siaga && !st.P[L.p].armed.includes(iid)) return;
    def.trig.forEach(t => {
      if (t.zone !== 'HAND') return;
      const evs = st.tev.slice();
      for (const ev of evs) {
        let ok = false;
        try { ok = t.when(ev, iid, api(st, null, iid)); } catch (e) { ok = false; }
        if (!ok) continue;
        if (t.can) { let c = false; try { c = t.can(api(st, { p: L.p, ev, ans: {} }, iid), { ev }); } catch (e) { c = false; } if (!c) continue; }
        st.pend.push({ id: ++st.jid, c: iid, p: L.p, kind: 'trig', eff: t.id, opt: !!t.optional, ev, ans: {}, born: st.log.length, b: st.curB, late: true });
        log(st, 'eff', plabel(st, L.p) + ': a card that entered the HAND during this timing can still trigger (304.1.k).', { priv: L.p });
        break;
      }
    });
  }
  // Kartu meninggalkan FIELD → status di-refresh, menjadi kartu baru (301.45.b–c).
  function refresh(st, iid) {
    const x = st.inst[iid];
    x.fd = false; x.enT = -1; x.bbm = -1; x.atkT = -1; x.atkN = 0; x.dclT = -1; x.tgdT = -1; x.tgdN = 0; x.att = []; x.host = null; x.mods = []; x.once = {}; x.tw = {}; x.gr = {};
  }
  // Lepas kartu dari tempatnya di FIELD (slot BATTLE, BASE, atau terpasang).
  function detachFromField(st, iid) {
    const L = locate(st, iid);
    if (!L) return null;
    const P = st.P[L.p];
    if (L.zone === 'bat') P.bat[L.slot] = null;
    else if (L.zone === 'base') P.base.splice(P.base.indexOf(iid), 1);
    else if (L.zone === 'att') { const H = st.inst[L.host]; H.att.splice(H.att.indexOf(iid), 1); st.inst[iid].host = null; }
    else return null;
    return L;
  }
  function removeAnywhere(st, iid) {
    const L = locate(st, iid); if (!L) return null;
    if (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att') return detachFromField(st, iid);
    const P = st.P[L.p], arr = P[L.zone];
    arr.splice(arr.indexOf(iid), 1);
    return L;
  }
  /* Kartu meninggalkan FIELD ke RETREAT/VOID/HAND. Kartu terpasang ikut induknya (301.25.c–d, g),
     selalu ke area milik pemiliknya (301.3). */
  function leaveField(st, iid, dest, why, meta) {
    const x = st.inst[iid], wasFd = x.fd, att = x.att.slice();
    const lv0 = wasFd ? 1 : getLv(st, iid), m = meta || {};
    const L = detachFromField(st, iid);
    if (!L) return false;
    refresh(st, iid);
    st.P[x.owner][dest].push(iid);
    const nm = wasFd ? 'Face-Down Card (' + nameOf(st, iid) + ')' : nameOf(st, iid);
    const zn = L.zone === 'bat' ? SLOT_NAME[L.slot] : L.zone === 'base' ? 'BASE' : 'attached';
    if (dest === 'ret') log(st, 'retreat', plabel(st, x.owner) + ': ' + nm + ' Retreats' + (why ? ' (' + why + ')' : '') + '.');
    else if (dest === 'void') log(st, 'prune', plabel(st, x.owner) + ': ' + nm + ' is Pruned to VOID' + (why ? ' (' + why + ')' : '') + '.');
    else log(st, 'move', plabel(st, x.owner) + ': ' + nm + ' returns from the ' + zn + ' to the HAND' + (why ? ' (' + why + ')' : '') + '.');
    // 301.21.h: kartu tertutup pindah sambil tetap "tertutup tanpa efek" → TRIG miliknya sendiri tidak terpicu.
    // Tahap 3: by = pengendali efek penyebab (BP01-066 "your opponent's effect"), vs = pemenang pertarungan (BP01-068), lv = Lv saat keluar.
    if (dest === 'ret') emit(st, { k: 'RETREATED', c: iid, from: 'field', fromZone: L.zone, slot: L.slot || null, cause: why || '', fd: wasFd, ctrl: L.p, by: m.by == null ? null : m.by, vs: m.vs || null, lv: lv0 });
    if (dest === 'void') emit(st, { k: 'VOIDED', c: iid, from: 'field', fromZone: L.zone, fd: wasFd, ctrl: L.p });   // Tahap 5
    att.forEach(a => {                                              // kartu terpasang ikut (301.25.c)
      const ax = st.inst[a];
      ax.host = null; refresh(st, a);
      st.P[ax.owner][dest].push(a);
      log(st, dest === 'ret' ? 'retreat' : dest === 'void' ? 'prune' : 'move', plabel(st, ax.owner) + ': attached ' + nameOf(st, a) + (dest === 'ret' ? ' follows into RETREAT.' : dest === 'void' ? ' follows into VOID.' : ' follows back to the HAND.'));
      if (dest === 'ret') emit(st, { k: 'RETREATED', c: a, from: 'field', fromZone: 'att', cause: 'follow', ctrl: L.p, by: m.by == null ? null : m.by, hostZone: L.zone });
      if (dest === 'void') emit(st, { k: 'VOIDED', c: a, from: 'field', fromZone: 'att', cause: 'follow', ctrl: L.p });
    });
    return true;
  }
  function retreat(st, iid, why, meta) { return leaveField(st, iid, 'ret', why, meta); }
  function prune(st, iid, why) {
    const L = locate(st, iid); if (!L || L.zone === 'void') return false;
    if (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att') return leaveField(st, iid, 'void', why);
    removeAnywhere(st, iid); refresh(st, iid);
    st.P[st.inst[iid].owner].void.push(iid);
    log(st, 'prune', plabel(st, st.inst[iid].owner) + ': ' + nameOf(st, iid) + ' is Pruned from ' + ({ ret: 'RETREAT', hand: 'HAND', deck: 'Deck' })[L.zone] + ' to VOID.');
    emit(st, { k: 'PRUNED', c: iid, from: L.zone });                // Tahap 3: BP01-007 "enters VOID from RETREAT"
    emit(st, { k: 'VOIDED', c: iid, from: L.zone, ctrl: st.inst[iid].owner });   // Tahap 5: masuk VOID dari zona mana pun
    return true;
  }
  function discard(st, iid, why) {                                // 301.15
    const x = st.inst[iid], P = st.P[x.owner];
    if (!P.hand.includes(iid)) return false;
    P.hand.splice(P.hand.indexOf(iid), 1); P.ret.push(iid);
    log(st, 'discard', plabel(st, x.owner) + ' discards ' + nameOf(st, iid) + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'RETREATED', c: iid, from: 'hand', cause: 'discard', eff: true });   // dibuang oleh efek (301.15.a.2)
    return true;
  }
  // Pasang kartu ke karakter (301.25). Sumber: tangan atau FIELD.
  function attach(st, iid, host) {
    const x = st.inst[iid], H = st.inst[host];
    const from = locate(st, iid);
    // 301.25.l: kartu yang terpasang pada kartu ini tidak lagi punya induk karakter → RETREAT.
    x.att.slice().forEach(s => retreat(st, s, 'its Character became an Attached Card, 301.25.l'));
    removeAnywhere(st, iid);
    const keepEn = from && (from.zone === 'bat' || from.zone === 'base' || from.zone === 'att');
    if (from && !keepEn) refresh(st, iid);                       // Tahap 5: dari HAND/RETREAT/VOID/Deck = kartu baru (301.45)
    x.att = []; x.host = host; x.fd = false; if (!keepEn) x.enT = st.turn;
    H.att.push(iid);
    log(st, 'attach', plabel(st, x.owner) + ': ' + nameOf(st, iid) + ' is attached to ' + nameOf(st, host) + (from && !keepEn ? ' (from the ' + ({ hand: 'HAND', ret: 'RETREAT', void: 'VOID', deck: 'Deck' })[from.zone] + ')' : '') + '.');
    emit(st, { k: 'ATTACHED', c: iid, host, from: from ? from.zone : null });
    // K-42 (keputusan pemilik 7 Nov 2026, CR 301.25.a): Karakter yang dipasang dari luar FIELD = DITEMPATKAN ke FIELD,
    // jadi memicu semua efek "enters the field" (termasuk "character enters the field"); dipasang dari FIELD = bergerak.
    if (from && !keepEn) emit(st, { k: 'ENTER', c: iid, p: locate(st, host).p, how: 'attach', from: from.zone, att: true, host });
  }

  /* ---------------- primitif Tahap 2 (SD02–SD04) ---------------- */
  // UNIQUE (305.6.a, RS-029): tidak boleh ada kartu lain bernama sama di FIELD pemain itu.
  function isUnique(st, iid) { const d = DEFS[st.inst[iid].no]; return !st.vanilla && !!(d && d.unique); }
  function faceUpOnField(st, p) {
    const out = [];
    fieldCards(st, p).forEach(i => { if (!st.inst[i].fd) out.push(i); st.inst[i].att.forEach(a => out.push(a)); });
    return out;
  }
  function uniqueBlocked(st, iid, p, ignore) {
    const nk = nameKey(cardOf(st, iid)), ig = ignore || [];
    const same = faceUpOnField(st, p).filter(i => i !== iid && !ig.includes(i) && nameKey(cardOf(st, i)) === nk);
    return same.length > 0 && (isUnique(st, iid) || same.some(i => isUnique(st, i)));
  }
  // Tempat kosong di FIELD pemain p untuk menaruh kartu.
  function placeSpots(st, p) {
    const P = st.P[p], out = SLOTS.filter(s => !P.bat[s]);
    if (P.base.length < BASE_MAX) out.push('BASE');
    return out;
  }
  // PLACE (301.12): taruh kartu terbuka ke area FIELD pemiliknya. Memicu "enters the field".
  function placeCard(st, iid, to, why, onto) {
    const x = st.inst[iid], p = onto == null ? x.owner : onto, P = st.P[p];   // onto: FIELD pemain lain (BP01-028)
    if (to === 'BASE' ? P.base.length >= BASE_MAX : P.bat[to]) return false;
    if (uniqueBlocked(st, iid, p)) { log(st, 'eff', nameOf(st, iid) + ' cannot be placed: another card with the same name is on the FIELD (UNIQUE, 305.6.a).'); return false; }
    const L = locate(st, iid), from = L ? L.zone : null;
    removeAnywhere(st, iid);
    if (from !== 'bat' && from !== 'base' && from !== 'att') refresh(st, iid);
    x.fd = false; x.enT = st.turn;
    if (to === 'BASE') P.base.push(iid); else P.bat[to] = iid;
    log(st, 'place', plabel(st, p) + ': ' + nameOf(st, iid) + ' is placed from the ' + ({ hand: 'HAND', ret: 'RETREAT', void: 'VOID', deck: 'Deck' }[from] || 'FIELD') + ' into the ' + SLOT_NAME[to] + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'ENTER', c: iid, p, how: 'place', from });
    return true;
  }
  // BATTLE-BASE MOVE oleh efek (301.24.b): tidak terikat batas aksi 303.2.a.3.1.3.
  function bbmDests(st, iid) {
    const L = locate(st, iid); if (!L || st.inst[iid].fd) return [];
    if (restricted(st, iid, 'move')) return [];      // BP01-050 "can not move in this turn"; Tahap 6: larangan tetap
    const P = st.P[L.p];
    if (L.zone === 'bat') return P.base.length < BASE_MAX ? ['BASE'] : [];
    if (L.zone === 'base') return SLOTS.filter(s => !P.bat[s]);
    return [];
  }
  function effectBbm(st, iid, to, why) {
    const L = locate(st, iid), P = st.P[L.p];
    if (!bbmDests(st, iid).includes(to)) return false;
    if (L.zone === 'bat') { P.bat[L.slot] = null; P.base.push(iid); } else { P.base.splice(P.base.indexOf(iid), 1); P.bat[to] = iid; }
    log(st, 'move', plabel(st, L.p) + ': ' + nameOf(st, iid) + ' takes BATTLE-BASE MOVE from ' + (L.zone === 'bat' ? SLOT_NAME[L.slot] : 'BASE') + ' to ' + SLOT_NAME[to] + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'BBMOVE', c: iid, by: 'effect' });
    return true;
  }
  // Kembali ke Deck pemiliknya (301.3.c), atas atau bawah; kartu terpasang ikut (301.25). Event DECK_BOTTOM (BP01-073).
  function toDeck(st, iid, where, why) {
    const x = st.inst[iid], L = locate(st, iid); if (!L) return false;
    const att = (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att') ? x.att.slice() : [];
    const wasFd = x.fd;
    removeAnywhere(st, iid); refresh(st, iid);
    const D = st.P[x.owner].deck;
    if (where === 'top') D.unshift(iid); else D.push(iid);
    log(st, 'move', plabel(st, x.owner) + ': ' + (wasFd ? 'a Face-Down Card' : nameOf(st, iid)) + ' goes to the ' + where + ' of the Deck' + (why ? ' (' + why + ')' : '') + '.');
    att.forEach(a => { const ax = st.inst[a]; ax.host = null; refresh(st, a); st.P[ax.owner].deck.push(a); log(st, 'move', plabel(st, ax.owner) + ': attached ' + nameOf(st, a) + ' follows to the Deck.'); });
    if (where === 'bottom') emit(st, { k: 'DECK_BOTTOM', c: iid, p: x.owner });
    return true;
  }
  // Swap HAND ↔ FIELD (BP01-061, BP01-069): kartu dari HAND mengambil posisi, status & kartu terpasang (301.18.b–c);
  // kartu FIELD masuk HAND pemiliknya. Melibatkan HAND, jadi bukan "ditempatkan" (301.18.e) dan tidak memicu "enters the field".
  function swapHandField(st, h, f, why) {
    const Lh = locate(st, h), Lf = locate(st, f), xh = st.inst[h], xf = st.inst[f];
    if (Lh && Lf && Lh.zone === 'hand' && Lf.zone === 'att') return swapHandAttached(st, h, f, why);
    if (!Lh || !Lf || Lh.zone !== 'hand' || (Lf.zone !== 'bat' && Lf.zone !== 'base')) return false;
    if (uniqueBlocked(st, h, Lf.p, [f])) { log(st, 'eff', nameOf(st, h) + ' cannot be swapped in (UNIQUE, 305.6.a).'); return false; }
    const H = st.P[xh.owner].hand; H.splice(H.indexOf(h), 1);
    const P = st.P[Lf.p];
    if (Lf.zone === 'bat') P.bat[Lf.slot] = h; else P.base[P.base.indexOf(f)] = h;
    refresh(st, h);
    SWAP_KEYS.forEach(k => { xh[k] = JSON.parse(JSON.stringify(xf[k])); });
    xh.att = xf.att; xh.att.forEach(i => { st.inst[i].host = h; }); xf.att = [];
    xh.fd = false;
    if (st.bt && st.bt.cur) { const c = st.bt.cur; if (c.a === f) c.a = h; if (c.tg === f) c.tg = h; }
    refresh(st, f);
    st.P[xf.owner].hand.push(f);
    log(st, 'swap', plabel(st, Lf.p) + ': ' + nameOf(st, h) + ' (HAND) swaps with ' + nameOf(st, f) + ' (' + (Lf.zone === 'bat' ? SLOT_NAME[Lf.slot] : 'BASE') + ')' + (why ? ' (' + why + ')' : '') + '.');
    // K-44 (keputusan pemilik 7 Nov 2026, CR 301.18.f): kartu dari HAND "treated as being placed" → masuk FIELD.
    emit(st, { k: 'ENTER', c: h, p: Lf.p, how: 'swap', from: 'hand' });
    return true;
  }
  // Tahap 5 (SP01-026 Vigil, E-13): HAND ↔ kartu terpasang. Kartu dari HAND ditempatkan & dipasang di posisi tumpukan yang sama.
  function swapHandAttached(st, h, f, why) {
    const Lf = locate(st, f), xh = st.inst[h], xf = st.inst[f], host = xf.host, H = st.inst[host];
    if (uniqueBlocked(st, h, Lf.p, [f])) { log(st, 'eff', nameOf(st, h) + ' cannot be swapped in (UNIQUE, 305.6.a).'); return false; }
    const HA = st.P[xh.owner].hand; HA.splice(HA.indexOf(h), 1);
    refresh(st, h);
    SWAP_KEYS.forEach(k => { xh[k] = JSON.parse(JSON.stringify(xf[k])); });
    H.att[H.att.indexOf(f)] = h; xh.host = host; xh.fd = false;
    refresh(st, f);
    st.P[xf.owner].hand.push(f);
    log(st, 'swap', plabel(st, Lf.p) + ': ' + nameOf(st, h) + ' (HAND) swaps with the attached ' + nameOf(st, f) + ' (under ' + nameOf(st, host) + ')' + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'ATTACHED', c: h, host, from: 'hand', swap: true });
    emit(st, { k: 'ENTER', c: h, p: Lf.p, how: 'attach', from: 'hand', att: true, host });
    return true;
  }
  /* Tahap 5 (SP01-026, SP01-064): kartu di FIELD bertukar dengan salah satu kartu yang terpasang padanya (301.18.a–d).
     Kartu terpasang mengambil posisi, status, dan kartu terpasang lain; kartu FIELD menjadi kartu terpasang di posisi
     tumpukan yang sama. Keduanya "bergerak" (301.18.d): tidak ada yang masuk FIELD. Event ATTACHED untuk kartu yang kini terpasang. */
  function swapAttached(st, a, h, why) {
    const xa = st.inst[a], xh = st.inst[h];
    if (!xa || !xh || xa.host !== h) return false;
    const L = locate(st, h); if (!L || (L.zone !== 'bat' && L.zone !== 'base')) return false;
    const P = st.P[L.p];
    const stack = xh.att.map(i => i === a ? h : i);
    if (L.zone === 'bat') P.bat[L.slot] = a; else P.base[P.base.indexOf(h)] = a;
    SWAP_KEYS.forEach(k => { const t = xa[k]; xa[k] = xh[k]; xh[k] = t; });
    xa.host = null; xa.fd = false; xh.att = []; xa.att = stack; stack.forEach(i => { st.inst[i].host = a; });
    if (st.bt && st.bt.cur) { const c = st.bt.cur; if (c.a === h) c.a = a; if (c.tg === h) c.tg = a; }
    log(st, 'swap', plabel(st, L.p) + ': ' + nameOf(st, a) + ' (attached) and ' + nameOf(st, h) + ' (' + (L.zone === 'bat' ? SLOT_NAME[L.slot] : 'BASE') + ') swap places' + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'ATTACHED', c: h, host: a, from: 'field', swap: true });
    return true;
  }
  // Tahap 5 (SP01-042 Green Goblin): pindah ke FIELD pemain lain (tetap di FIELD, status tetap; pengendali berganti).
  function moveToField(st, iid, toP, to, why) {
    const L = locate(st, iid); if (!L || (L.zone !== 'bat' && L.zone !== 'base')) return false;
    const P2 = st.P[toP];
    if (to === 'BASE' ? P2.base.length >= BASE_MAX : (!SLOTS.includes(to) || P2.bat[to])) return false;
    if (uniqueBlocked(st, iid, toP)) { log(st, 'eff', nameOf(st, iid) + ' cannot move there (UNIQUE, 305.6.a).'); return false; }
    const P = st.P[L.p];
    if (L.zone === 'bat') P.bat[L.slot] = null; else P.base.splice(P.base.indexOf(iid), 1);
    if (to === 'BASE') P2.base.push(iid); else P2.bat[to] = iid;
    log(st, 'move', plabel(st, L.p) + ': ' + nameOf(st, iid) + ' moves from ' + (L.zone === 'bat' ? SLOT_NAME[L.slot] : 'BASE') + " to " + plabel(st, toP) + "'s " + SLOT_NAME[to] + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'MOVED_FIELD', c: iid, from: L.p, to: toP });
    return true;
  }
  // Buang kartu terbawah Deck ke RETREAT (SP01-049, SP01-053, SP01-058).
  function millBottom(st, p, n, why) {
    const P = st.P[p], got = [];
    for (let k = 0; k < n && P.deck.length; k++) {
      const iid = P.deck.pop(); P.ret.push(iid); got.push(iid);
      log(st, 'discard', plabel(st, p) + ' discards the bottom card of the Deck: ' + nameOf(st, iid) + (why ? ' (' + why + ')' : '') + '.');
      emit(st, { k: 'RETREATED', c: iid, from: 'deck', cause: 'discard', eff: true, bottom: true });
    }
    checkWin(st);
    return got;
  }
  // BP01-062 Freedom Will: kebal terhadap efek kartu tertentu (mis. "Characters with Lv4 or below") selama di BASE.
  function immuneTo(st, tgt, src) {
    if (st.vanilla || !src || tgt === src || !st.inst[tgt] || !st.inst[src]) return false;
    // Tahap 5 (SP01-050 Phage): kartu terpasang melindungi induknya dan semua kartu yang terpasang pada induk itu.
    const hostI = st.inst[tgt].host || tgt, HX = st.inst[hostI];
    if (HX && HX.att.length && locate(st, hostI)) {
      for (const a of HX.att) {
        const da = DEFS[st.inst[a].no];
        if (da && da.shield && !st.inst[a].fd && !lostEffects(st, hostI) && a !== src) { try { if (da.shield(readApi(st, a), a, src)) return true; } catch (e) { /* abaikan */ } }
      }
    }
    const d = defOf(st, tgt);
    if (!d || !d.immune || st.inst[tgt].fd) return false;
    try { return !!d.immune(readApi(st, tgt), tgt, src); } catch (e) { return false; }
  }
  // BATTLE MOVE oleh efek (301.23.b): pindah ke area BATTLE kosong milik pemain yang sama.
  function battleMove(st, iid, to, why) {
    const L = locate(st, iid); if (!L || L.zone !== 'bat' || !SLOTS.includes(to) || to === L.slot) return false;
    const P = st.P[L.p]; if (P.bat[to]) return false;
    if (restricted(st, iid, 'move')) return false;
    P.bat[L.slot] = null; P.bat[to] = iid;
    log(st, 'move', plabel(st, L.p) + ': ' + nameOf(st, iid) + ' takes BATTLE MOVE from ' + SLOT_NAME[L.slot] + ' to ' + SLOT_NAME[to] + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'BMOVE', c: iid, from: L.slot, to });
    return true;
  }
  // Kartu terpasang dilepas ke area BATTLE kosong pemiliknya (BP01-047). Bukan "masuk FIELD".
  function detachToBattle(st, iid, to, why) {
    const x = st.inst[iid], L = locate(st, iid); if (!L || L.zone !== 'att') return false;
    const P = st.P[L.p]; if (P.bat[to]) return false;
    const H = st.inst[x.host]; H.att.splice(H.att.indexOf(iid), 1); x.host = null;
    P.bat[to] = iid;
    log(st, 'move', plabel(st, L.p) + ': ' + nameOf(st, iid) + ' is detached and moves to ' + SLOT_NAME[to] + (why ? ' (' + why + ')' : '') + '.');
    return true;
  }
  // Atur ulang kartu teratas Deck: top = urutan dari atas, bottom = urutan dari atas di bagian bawah (BP01-048).
  function reorderTop(st, p, top, bottom, why) {
    const P = st.P[p], all = top.concat(bottom);
    all.forEach(i => { const k = P.deck.indexOf(i); if (k >= 0) P.deck.splice(k, 1); });
    P.deck.unshift.apply(P.deck, top); P.deck.push.apply(P.deck, bottom);
    log(st, 'move', plabel(st, p) + ' puts ' + top.length + ' card(s) back on top of the Deck and ' + bottom.length + ' on the bottom' + (why ? ' (' + why + ')' : '') + '.',
      { pp: p, ptxt: 'Top: ' + (top.map(i => nameOf(st, i)).join(', ') || '—') + ' · Bottom: ' + (bottom.map(i => nameOf(st, i)).join(', ') || '—') });
  }
  // Tutup kartu di BASE (301.14): status di-refresh, kartu terpasang → RETREAT (301.25.l).
  function coverCard(st, iid, why) {
    const x = st.inst[iid], L = locate(st, iid);
    if (!L || L.zone !== 'base' || x.fd) return false;
    x.att.slice().forEach(a => retreat(st, a, 'its Character was turned face-down, 301.25.l'));
    const nm = nameOf(st, iid);
    refresh(st, iid); x.fd = true;
    log(st, 'set', plabel(st, L.p) + ': ' + nm + ' is turned face-down in the BASE' + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'SET_UP', p: L.p });
    return true;
  }
  // Buka kartu tertutup di BASE (301.22). Bukan "masuk FIELD" (RS-028). UNIQUE → hanya diperlihatkan (301.22.d).
  function flipCard(st, iid, why) {
    const x = st.inst[iid], L = locate(st, iid);
    if (!L || L.zone !== 'base' || !x.fd) return false;
    if (uniqueBlocked(st, iid, L.p)) { log(st, 'reveal', plabel(st, L.p) + ' reveals ' + nameOf(st, iid) + ' but cannot flip it face-up (UNIQUE, 301.22.d).'); return false; }
    x.fd = false;
    log(st, 'flip', plabel(st, L.p) + ': Face-Down Card flipped face-up: ' + nameOf(st, iid) + (why ? ' (' + why + ')' : '') + '.');
    return true;
  }
  // Buang kartu teratas Deck ke RETREAT (301.15.a.3).
  function millTop(st, p, n, why) {
    const P = st.P[p], got = [];
    for (let k = 0; k < n && P.deck.length; k++) {
      const iid = P.deck.shift(); P.ret.push(iid); got.push(iid);
      log(st, 'discard', plabel(st, p) + ' discards the top card of the Deck: ' + nameOf(st, iid) + (why ? ' (' + why + ')' : '') + '.');
      emit(st, { k: 'RETREATED', c: iid, from: 'deck', cause: 'discard', eff: true });
    }
    checkWin(st);
    return got;
  }
  // Swap (301.18): dua kartu bertukar posisi, status, dan kartu terpasang.
  const SWAP_KEYS = ['mods', 'atkT', 'atkN', 'dclT', 'tgdT', 'tgdN', 'bbm', 'enT', 'gr', 'once', 'tw'];
  function swapCards(st, a, b, why) {
    const La = locate(st, a), Lb = locate(st, b), xa = st.inst[a], xb = st.inst[b];
    if (!La || !Lb) return false;
    const onF = L => L.zone === 'bat' || L.zone === 'base';
    if (onF(La) && onF(Lb) && La.p === Lb.p) {                           // FIELD ↔ FIELD (301.18.d)
      const P = st.P[La.p], ia = P.base.indexOf(a), ib = P.base.indexOf(b);
      if (La.zone === 'bat') P.bat[La.slot] = b; else P.base[ia] = b;
      if (Lb.zone === 'bat') P.bat[Lb.slot] = a; else P.base[ib] = a;
      SWAP_KEYS.forEach(k => { const t = xa[k]; xa[k] = xb[k]; xb[k] = t; });
      const t = xa.att; xa.att = xb.att; xb.att = t;
      xa.att.forEach(i => { st.inst[i].host = a; }); xb.att.forEach(i => { st.inst[i].host = b; });
      if (st.bt && st.bt.cur) {                                       // RS-032: serangan & target ikut berpindah
        const c = st.bt.cur;
        if (c.a === a) c.a = b; else if (c.a === b) c.a = a;
        if (c.tg === a) c.tg = b; else if (c.tg === b) c.tg = a;
      }
      log(st, 'swap', plabel(st, La.p) + ': ' + nameOf(st, a) + ' and ' + nameOf(st, b) + ' swap places (' + (La.zone === 'bat' ? SLOT_NAME[La.slot] : 'BASE') + ' ↔ ' + (Lb.zone === 'bat' ? SLOT_NAME[Lb.slot] : 'BASE') + ')' + (why ? ' (' + why + ')' : '') + '.');
      return true;
    }
    // RETREAT ↔ FIELD: f keluar ke RETREAT, r mengambil posisi & status f (301.18.b–c, e)
    const [r, f, Lf] = La.zone === 'ret' && onF(Lb) ? [a, b, Lb] : Lb.zone === 'ret' && onF(La) ? [b, a, La] : [null, null, null];
    if (!r) return false;
    const xr = st.inst[r], xf = st.inst[f], P = st.P[Lf.p];
    if (uniqueBlocked(st, r, Lf.p, [f])) { log(st, 'eff', nameOf(st, r) + ' cannot be swapped in (UNIQUE, 305.6.a).'); return false; }
    const R = st.P[xr.owner].ret; R.splice(R.indexOf(r), 1);
    if (Lf.zone === 'bat') P.bat[Lf.slot] = r; else P.base[P.base.indexOf(f)] = r;
    refresh(st, r);
    SWAP_KEYS.forEach(k => { xr[k] = JSON.parse(JSON.stringify(xf[k])); });
    xr.att = xf.att; xr.att.forEach(i => { st.inst[i].host = r; }); xf.att = [];
    xr.fd = false;
    if (st.bt && st.bt.cur) { const c = st.bt.cur; if (c.a === f) c.a = r; if (c.tg === f) c.tg = r; }
    refresh(st, f);
    st.P[xf.owner].ret.push(f);
    log(st, 'swap', plabel(st, Lf.p) + ': ' + nameOf(st, r) + ' (RETREAT) swaps with ' + nameOf(st, f) + ' (' + (Lf.zone === 'bat' ? SLOT_NAME[Lf.slot] : 'BASE') + ')' + (why ? ' (' + why + ')' : '') + '.');
    emit(st, { k: 'RETREATED', c: f, from: 'field', fromZone: Lf.zone, slot: Lf.slot || null, cause: 'swap', ctrl: Lf.p });
    emit(st, { k: 'ENTER', c: r, p: Lf.p, how: 'swap', from: 'ret' });
    return true;
  }
  // Kemampuan yang didapat "in this turn" (ASSAULT, AIR STRIKE).
  // Tahap 5: kemampuan dari def.abil (bersyarat, SP01-051), dari kartu terpasang (def.hostAbil, SP01-007), dan
  // 'double' / 'block'. Kartu yang kehilangan efek tidak punya kemampuan apa pun (CR 520).
  function hasAbility(st, iid, ab) {
    const x = st.inst[iid];
    if (st.vanilla || !x || x.fd || lostEffects(st, iid)) return false;
    if (x.gr && x.gr[ab] === st.turn) return true;
    const d = defOf(st, iid);
    if (d && inZone(st, iid, 'BATTLE')) {
      if (d[ab] === true) return true;
      if (d.abil) { try { if ((d.abil(readApi(st, iid), iid) || []).includes(ab)) return true; } catch (e) { /* abaikan */ } }
    }
    for (const a of x.att) {
      const da = defOf(st, a);
      if (da && da.hostAbil && !st.inst[a].fd) { try { if ((da.hostAbil(readApi(st, a), a, iid) || []).includes(ab)) return true; } catch (e) { /* abaikan */ } }
    }
    // Tahap 6: kemampuan dari aura kartu lain (PB02-005 Nebula: [AIR STRIKE] untuk Karakter [GOTG] di FRONT).
    for (let p = 0; p < 2; p++) for (const src of charsOnField(st, p)) {
      if (src === iid) continue;
      const ds = defOf(st, src); if (!ds || !ds.auraAbil) continue;
      try { if ((ds.auraAbil(readApi(st, src), src, iid) || []).includes(ab)) return true; } catch (e) { /* abaikan */ }
    }
    return false;
  }
  // Jumlah kemampuan sebuah Karakter (SP01-018 Kraven, TD-09): UNIQUE, COUNTER, BLOCK, DOUBLE ATTACK, ASSAULT, AIR STRIKE.
  function abilityCount(st, iid) {
    if (st.vanilla || st.inst[iid].fd) return 0;
    let n = 0;
    if (isUnique(st, iid)) n++;
    if (!lostEffects(st, iid) && hasCounterAbility(st, iid)) n++;
    ['block', 'double', 'assault', 'air'].forEach(ab => { if (hasAbility(st, iid, ab)) n++; });
    return n;
  }

  /* ---------------- kondisi menang (103.1) ---------------- */
  function checkWin(st) {
    if (st.result) return true;
    const w = [false, false], why = ['', ''];
    for (let p = 0; p < 2; p++) {
      if (st.P[p].rp >= RP_WIN) { w[p] = true; why[p] = '9 Rush Points in the Timeline (103.1.a)'; }
      if (st.P[opp(p)].deck.length === 0) { w[p] = true; why[p] = why[p] || "the opposing player's Deck has 0 cards (103.1.b)"; }
    }
    if (w[0] && w[1]) {
      st.result = { winner: -1, cause: 'Both players met a win condition at the same time (not covered by CR 1.03; recorded as a draw).' };
    } else if (w[0] || w[1]) {
      const p = w[0] ? 0 : 1;
      st.result = { winner: p, cause: why[p] };
    } else return false;
    st.phase = 'over'; st.prompt = null;
    log(st, 'over', st.result.winner < 0 ? 'The game ends in a DRAW. ' + st.result.cause
      : plabel(st, st.result.winner) + ' WINS — ' + st.result.cause + '.');
    return true;
  }

  /* ---------------- event & trigger (304.1) ---------------- */
  function emit(st, ev) {
    if (st.vanilla) return;
    // Tahap 5: sumber efek yang sedang diselesaikan ("by your effect", "by the effect of a card with [Web]").
    if (ev.jsrc === undefined) { ev.jsrc = st.job ? st.job.c : null; ev.jp = st.job ? st.job.p : null; }
    (st.tev = st.tev || []).push(ev);                                 // RS-019: event pada timing yang sedang diselesaikan
    for (const iid in st.inst) {
      const def = defOf(st, iid); if (!def || !def.trig) continue;
      if (ev.fd && ev.c === iid) continue;                         // 301.21.c/h
      def.trig.forEach(t => {
        if (!inZone(st, iid, t.zone)) return;
        if (t.once && st.inst[iid].once[t.id] === st.turn) return;
        if (t.once && (st.pend.some(j => j.c === iid && j.eff === t.id) || (st.job && st.job.c === iid && st.job.eff === t.id))) return;
        let ok = false;
        try { ok = t.when(ev, iid, api(st, null, iid)); } catch (e) { ok = false; }
        if (!ok) return;
        const L = locate(st, iid);
        if (t.zone === 'HAND') {
          // Trigger di HAND tidak dideklarasikan (304.1.g.2). Mode Siaga (pass-and-play): hanya kartu yang
          // disiagakan pemiliknya yang bisa terpicu; dan hanya kalau ada yang bisa diresolve, diperiksa diam-diam
          // di sini supaya tidak ada log yang membocorkan isi HAND.
          if (st.siaga && !st.P[L.p].armed.includes(iid)) return;
          if (t.can) { let c = false; try { c = t.can(api(st, { p: L.p, ev, ans: {} }, iid), { ev }); } catch (e) { c = false; } if (!c) return; }
        }
        st.pend.push({ id: ++st.jid, c: iid, p: L ? L.p : st.inst[iid].owner, kind: 'trig', eff: t.id, opt: !!t.optional, ev, ans: {}, born: st.log.length, b: st.curB });
      });
    }
  }
  // Pemeriksaan otomatis setelah setiap perubahan: Power 0 karena efek → Retreat (301.16.a.1),
  // kartu terpasang yang induknya bukan karakter lagi → RETREAT (301.25.l), event R/Power naik.
  function settle(st) {
    if (st.vanilla) { checkWin(st); return; }
    stampZones(st); pruneMods(st);
    // RS-001 (BP01-063 Time Abduction): Power "berkurang" = total pengurangan ± yang berlaku bertambah (efek sekali, aura
    // yang baru berlaku, masuk FIELD di bawah aura), termasuk yang membuat Karakter retreat. Buff yang berakhir tidak dihitung.
    const neg = {}, negO = {};
    const srcCtrl = e => { const L = locate(st, e.src); return L ? L.p : st.inst[e.src].owner; };
    for (let p = 0; p < 2; p++) charsOnField(st, p).forEach(i => {
      const ents = adjEntries(st, i, 'p');
      neg[i] = ents.reduce((a, e) => a + (e.d < 0 ? e.d : 0), 0);
      // Tahap 5 (SP01-071): bagian pengurangan yang sumbernya dikendalikan lawan.
      negO[i] = ents.reduce((a, e) => a + (e.d < 0 && e.src && st.inst[e.src] && srcCtrl(e) !== p ? e.d : 0), 0);
      const o = st.negSnap ? st.negSnap[i] : undefined, oo = st.negOSnap ? st.negOSnap[i] : undefined;
      const byOpp = (oo === undefined && negO[i] < 0) || (oo !== undefined && negO[i] < oo);
      if ((o === undefined && neg[i] < 0) || (o !== undefined && neg[i] < o)) emit(st, { k: 'STAT_DOWN', c: i, p, stat: 'p', byOpp });
    });
    st.negSnap = neg; st.negOSnap = negO;
    for (let guard = 0; guard < 20; guard++) {
      let changed = false;
      for (let p = 0; p < 2; p++) {
        charsOnField(st, p).forEach(i => {
          if (cardOf(st, i).p > 0 && getPower(st, i) === 0) {
            // RS-023: siapa yang menurunkan Power ke 0 (sumber pengurangan milik lawan → "your opponent's effect").
            const ents = adjEntries(st, i, 'p').filter(e => e.d < 0 && e.src && st.inst[e.src]);
            const by = ents.some(e => { const L = locate(st, e.src); return (L ? L.p : st.inst[e.src].owner) !== p; }) ? opp(p) : p;
            retreat(st, i, 'Attack Power reduced to 0 by an effect, 301.16.a.1', { by });
            changed = true;
          }
        });
      }
      if (!changed) break;
    }
    // event STAT_UP untuk karakter yang R/Power-nya naik sejak pemeriksaan terakhir
    const snap = {};
    for (let p = 0; p < 2; p++) charsOnField(st, p).forEach(i => { snap[i] = [getR(st, i), getPower(st, i)]; });
    for (const i in snap) {
      const o = st.snap[i];
      if (o && (snap[i][0] > o[0] || snap[i][1] > o[1])) emit(st, { k: 'STAT_UP', c: i, r: snap[i][0] > o[0], p: snap[i][1] > o[1], dp: Math.max(0, snap[i][1] - o[1]), dr: Math.max(0, snap[i][0] - o[0]) });
    }
    st.snap = snap;
    // Tahap 5 (SP01-016 Luke Cage): jumlah kartu di BASE bertambah sejak pemeriksaan terakhir.
    const bn = [st.P[0].base.length, st.P[1].base.length];
    if (st.baseSnap) for (let p = 0; p < 2; p++) if (bn[p] > st.baseSnap[p]) emit(st, { k: 'BASE_UP', p, n: bn[p] - st.baseSnap[p] });
    st.baseSnap = bn;
    checkWin(st);
  }

  /* ---------------- API untuk resolver (sim-cards.js) ---------------- */
  function Ask(spec) { this.spec = spec; }
  // API baca-saja (tanpa job) disimpan per pertandingan & per kartu supaya aura tidak membuat objek baru terus.
  const READ_API = new WeakMap();
  function readApi(st, src) {
    let m = READ_API.get(st); if (!m) { m = new Map(); READ_API.set(st, m); }
    let A = m.get(src); if (!A) { A = api(st, null, src); m.set(src, A); }
    return A;
  }
  function api(st, job, self) {
    const A = {
      st, self, job,
      get p() { return job ? job.p : (locate(st, self) || { p: st.inst[self].owner }).p; },
      opp, get turn() { return st.turn; }, get tp() { return st.tp; }, get phase() { return st.phase; },
      // --- pertanyaan (harus sebelum perubahan pertama) ---
      ask(key, spec) {
        if (!job) throw new Error('ask() di luar job');
        if (key in job.ans) return job.ans[key];
        const from = (spec.from || []).filter(i => !immuneTo(st, i, self));   // BP01-062: kartu kebal tidak bisa dipilih
        const min = Math.min(spec.min == null ? 1 : spec.min, from.length), max = Math.min(spec.max == null ? 1 : spec.max, from.length);
        if (max === 0) { job.ans[key] = []; return []; }
        // Tidak ada pilihan lain. Mode konfirmasi (permintaan pemilik 6 Nov 2026): pemain tetap ditanya dan menekan Confirm
        // (pilihan sudah terisi), kecuali bila efek sudah mulai mengubah status (keamanan resolver lama).
        if (from.length === min && min === max && spec.auto !== false && (!st.confirm || job.mut)) { job.ans[key] = from.slice(); return job.ans[key]; }
        if (job.mut) throw new Error('ask() setelah perubahan status: ' + job.eff);
        throw new Ask({ key, text: spec.text, from, min, max, p: spec.p == null ? job.p : spec.p, prefer: spec.prefer || 'low', reveal: !!spec.reveal, forced: from.length === min && min === max });
      },
      yes(key, text) {
        if (!job) throw new Error('yes() di luar job');
        if (key in job.ans) return job.ans[key];
        if (job.mut) throw new Error('yes() setelah perubahan status: ' + job.eff);
        throw new Ask({ key, yesno: true, text, p: job.p });
      },
      // --- pembacaan ---
      battle: p => battleCards(st, p), base: p => st.P[p].base.slice(), set: p => st.P[p].base.filter(i => st.inst[i].fd),
      chars: p => charsOnField(st, p), battleChars: p => battleCards(st, p).filter(i => !st.inst[i].fd),
      hand: p => st.P[p].hand.slice(), ret: p => st.P[p].ret.slice(), deck: p => st.P[p].deck.slice(),
      lv: i => getLv(st, i), r: i => getR(st, i), pw: i => getPower(st, i), plv: i => printedLv(st, i),
      color: i => cardOf(st, i).c, trait: i => cardOf(st, i).f || '', name: i => nameOf(st, i), no: i => st.inst[i].no,
      isFd: i => st.inst[i].fd, zone: i => effZone(st, i), loc: i => locate(st, i), attached: i => st.inst[i].att.slice(), host: i => st.inst[i].host,
      owner: i => st.inst[i].owner, baseRoom: p => BASE_MAX - st.P[p].base.length,
      isBattlePhaseOf: p => st.tp === p && (st.phase === 'battle'),
      // --- perubahan ---
      mark() { if (job) job.mut = true; },
      retreat(i, why) { A.mark(); if (immuneTo(st, i, self)) return false; return retreat(st, i, why || 'effect', { by: A.p }); },
      prune(i, why) { A.mark(); if (immuneTo(st, i, self)) return false; return prune(st, i, why || 'effect'); },
      discard(i, why) { A.mark(); return discard(st, i, why); },
      draw(p, n) { A.mark(); return draw(st, p, n); },
      attach(i, host) { A.mark(); attach(st, i, host); },
      mod(i, stat, d, why) {                                   // "in this turn"
        A.mark();
        if (immuneTo(st, i, self)) return;
        st.inst[i].mods.push({ s: stat, d, src: self, t: ++st.tick });
        log(st, 'mod', nameOf(st, i) + ' gets ' + ({ p: 'Power', r: 'R', lv: 'Lv' })[stat] + (d >= 0 ? '+' : '') + d + ' this turn' + (why ? ' (' + why + ')' : '') + '.');
      },
      toBaseFd(i, from) {                                        // taruh tertutup ke BASE
        A.mark();
        const x = st.inst[i];
        removeAnywhere(st, i); refresh(st, i);
        x.fd = true; x.enT = st.turn;
        st.P[x.owner].base.push(i);
        log(st, 'set', plabel(st, x.owner) + ': places ' + (from === 'RETREAT' ? nameOf(st, i) + ' from RETREAT' : 'a card from the ' + from) + ' face-down into the BASE.',
          from === 'RETREAT' ? null : { pp: x.owner, ptxt: nameOf(st, i) });
        emit(st, { k: 'SET_UP', p: x.owner });
      },
      toDeckBottom(i, why) { A.mark(); toDeck(st, i, 'bottom', why); },
      toDeckTop(i, why) { A.mark(); toDeck(st, i, 'top', why); },
      swapHand(h, f, why) { A.mark(); return swapHandField(st, h, f, why); },
      redirectSlot(slot, why) {                                   // BP01-067: target serangan pindah ke area lain dalam jangkauan
        A.mark();
        const c = st.bt && st.bt.cur; if (!c) return false;
        const O = st.P[opp(st.tp)];
        c.slot = slot; c.tg = O.bat[slot] || null; c.air = false;
        markTarget(st, c.tg);
        log(st, 'attack', 'The Attack Target of ' + nameOf(st, c.a) + ' changes to ' + (c.tg ? nameOf(st, c.tg) : 'the Weakness') + ' (' + SLOT_NAME[slot] + ')' + (why ? ' (' + why + ')' : '') + '.');
        return true;
      },
      skipBattle(why) { A.mark(); st.cnt.skipBattle = true; log(st, 'eff', plabel(st, st.tp) + ' will skip the Battle Phase this turn' + (why ? ' (' + why + ')' : '') + '.'); },
      immune: i => immuneTo(st, i, self),
      reveal(i) { log(st, 'reveal', plabel(st, st.inst[i].owner) + ' shows ' + nameOf(st, i) + ' (Lv' + printedLv(st, i) + ').'); },
      log(txt) { log(st, 'eff', txt); },
      // --- Tahap 2 ---
      pick(key, text, options, p) {                             // pilihan non-kartu (mis. area tujuan)
        if (!job) throw new Error('pick() di luar job');
        if (key in job.ans) return job.ans[key];
        if (!options.length) { job.ans[key] = null; return null; }
        if (options.length === 1 && (!st.confirm || job.mut)) { job.ans[key] = options[0].v; return options[0].v; }
        if (job.mut) throw new Error('pick() setelah perubahan status: ' + job.eff);
        throw new Ask({ key, pick: true, text, options, p: p == null ? job.p : p });
      },
      ctrl: i => { const L = locate(st, i); return L ? L.p : st.inst[i].owner; },
      slot: i => { const L = locate(st, i); return L && L.zone === 'bat' ? L.slot : null; },
      at: (p, s) => st.P[p].bat[s] || null,
      wings: p => ['W1', 'W2'].map(s => st.P[p].bat[s]).filter(Boolean),
      voidOf: p => st.P[p].void.slice(),
      setCount: p => st.P[p].base.filter(i => st.inst[i].fd).length,
      allChars: () => charsOnField(st, 0).concat(charsOnField(st, 1)),
      spots: p => placeSpots(st, p),
      canPlace: (i, p) => placeSpots(st, p == null ? st.inst[i].owner : p).length > 0 && !uniqueBlocked(st, i, p == null ? st.inst[i].owner : p),
      bbmDests: i => bbmDests(st, i),
      spotLabel: s => SLOT_NAME[s],
      hasAb: (i, ab) => hasAbility(st, i, ab),
      cur: () => (st.bt && st.bt.cur) ? Object.assign({}, st.bt.cur) : null,
      targetsOf: i => targetsFor(st, i),
      place(i, to, why) { A.mark(); return placeCard(st, i, to, why); },
      bbm(i, to, why) { A.mark(); return effectBbm(st, i, to, why); },
      cover(i, why) { A.mark(); return coverCard(st, i, why); },
      flip(i, why) { A.mark(); return flipCard(st, i, why); },
      mill(p, n, why) { A.mark(); return millTop(st, p, n, why); },
      swap(a, b, why) { A.mark(); return swapCards(st, a, b, why); },
      toHand(i, why) {
        A.mark();
        const L = locate(st, i); if (!L) return false;
        if (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att') return leaveField(st, i, 'hand', why);
        const x = st.inst[i]; removeAnywhere(st, i); refresh(st, i); st.P[x.owner].hand.push(i);
        log(st, 'move', plabel(st, x.owner) + ': ' + nameOf(st, i) + ' is put into the HAND' + (why ? ' (' + why + ')' : '') + '.');
        return true;
      },
      setToHand(i, why) {                                         // kartu tertutup BASE → HAND (nama tetap rahasia)
        A.mark();
        const x = st.inst[i]; removeAnywhere(st, i); refresh(st, i); st.P[x.owner].hand.push(i);
        log(st, 'move', plabel(st, x.owner) + ': a Face-Down Card in the BASE returns to the HAND' + (why ? ' (' + why + ')' : '') + '.', { pp: x.owner, ptxt: nameOf(st, i) });
        return true;
      },
      setTop(p, n, why) {                                         // n kartu teratas Deck → BASE tertutup (sebanyak muat)
        const got = [];
        for (let k = 0; k < n && st.P[p].deck.length && st.P[p].base.length < BASE_MAX; k++) { const i = st.P[p].deck[0]; A.toBaseFd(i, 'Deck'); got.push(i); }
        if (got.length < n) log(st, 'eff', (why ? why + ': ' : '') + 'only ' + got.length + ' of ' + n + ' card(s) could be placed (BASE full or Deck empty).');
        return got;
      },
      detachToBase(i, why) {                                      // lepas kartu terpasang ke BASE (301.26)
        A.mark();
        const x = st.inst[i], L = locate(st, i); if (!L || L.zone !== 'att' || st.P[L.p].base.length >= BASE_MAX) return false;
        const H = st.inst[x.host]; H.att.splice(H.att.indexOf(i), 1); x.host = null;
        st.P[L.p].base.push(i);
        log(st, 'move', plabel(st, L.p) + ': ' + nameOf(st, i) + ' is detached and moves to the BASE' + (why ? ' (' + why + ')' : '') + '.');
        return true;
      },
      grant(i, ab, label) {                                        // kemampuan "in this turn"
        A.mark();
        st.inst[i].gr[ab] = st.turn;
        log(st, 'mod', nameOf(st, i) + ' gets the ability ' + label + ' this turn.');
      },
      setStat(i, stat, v, why) {                                  // "changes to X in this turn" (301.41)
        A.mark();
        st.inst[i].mods.push({ s: stat, set: v, d: 0, src: self, t: ++st.tick });
        log(st, 'mod', ({ p: 'Power', r: 'R', lv: 'Lv' })[stat] + ' of ' + nameOf(st, i) + ' changes to ' + v + ' this turn' + (why ? ' (' + why + ')' : '') + '.');
      },
      // --- Tahap 3 (BP01) ---
      battleMove(i, to, why) { A.mark(); return battleMove(st, i, to, why); },
      detachToBattle(i, to, why) { A.mark(); return detachToBattle(st, i, to, why); },
      reorderTop(p, top, bottom, why) { A.mark(); return reorderTop(st, p, top, bottom, why); },
      placeOnto(i, to, p, why) { A.mark(); return placeCard(st, i, to, why, p); },
      emptySlots: p => SLOTS.filter(s => !st.P[p].bat[s]),
      attackedThisTurn: i => st.inst[i].dclT === st.turn,      // RS-027: hanya serangan yang dinyatakan
      timesTargeted: i => st.inst[i] && st.inst[i].tgdT === st.turn ? st.inst[i].tgdN : 0,   // Tahap 4 (PB01-002)
      text: i => textEn(cardOf(st, i)) || '',
      origLv: i => printedLv(st, i),
      handCount: p => st.P[p].hand.length,
      setFlag(i, f, why, label) { A.mark(); st.inst[i].gr[f] = st.turn; if (label) log(st, 'mod', nameOf(st, i) + ' ' + label + ' this turn' + (why ? ' (' + why + ')' : '') + '.'); },
      // --- Tahap 5 (SP01) ---
      rand(n) { A.mark(); return n > 0 ? Math.floor(rngNext(st) * n) : 0; },
      swapAtt(a, h, why) { A.mark(); return swapAttached(st, a, h, why); },
      moveTo(i, p, to, why) { A.mark(); return moveToField(st, i, p, to, why); },
      millBottom(p, n, why) { A.mark(); return millBottom(st, p, n, why); },
      origP: i => cardOf(st, i).p, origR: i => cardOf(st, i).r,
      lost: i => lostEffects(st, i),
      abilities: i => abilityCount(st, i),
      callsMade: p => (st.tp === p ? st.cnt.call : 0) + st.cnt.cc[p] + st.cnt.ccp[p],
      noEffectText: i => { const t = textEn(cardOf(st, i)).trim(); return !t || /has no effect text/i.test(t); },
      setNoCost(i, why) { A.mark(); st.inst[i].gr.nocost = st.turn; log(st, 'mod', nameOf(st, i) + ' cannot be retreated to call a Character this turn' + (why ? ' (' + why + ')' : '') + '.'); },
      noCost5(p, why) { A.mark(); st.cnt.noCost5 = st.cnt.noCost5 || [false, false]; st.cnt.noCost5[p] = true; log(st, 'eff', plabel(st, p) + ' cannot retreat Characters with Lv5 or above to call a Character this turn' + (why ? ' (' + why + ')' : '') + '.'); },
      borrow(i, no, why) { A.mark(); st.inst[i].gr.borrow = no; st.inst[i].gr.borrowT = st.turn; st.mver = (st.mver || 0) + 1; log(st, 'mod', nameOf(st, i) + ' gets the effects of ' + nameEn(card(no)) + ' this turn' + (why ? ' (' + why + ')' : '') + '.'); },
      deckBottom: p => st.P[p].deck.slice(-1)[0] || null,
      toRet(i, why) {                                             // VOID/HAND/Deck → RETREAT pemiliknya (SP01-077)
        A.mark();
        const L = locate(st, i); if (!L || L.zone === 'ret' || L.zone === 'bat' || L.zone === 'base' || L.zone === 'att') return false;
        const x = st.inst[i]; removeAnywhere(st, i); refresh(st, i); st.P[x.owner].ret.push(i);
        log(st, 'move', plabel(st, x.owner) + ': ' + nameOf(st, i) + ' is placed from the ' + ({ void: 'VOID', hand: 'HAND', deck: 'Deck' })[L.zone] + ' into the RETREAT' + (why ? ' (' + why + ')' : '') + '.');
        emit(st, { k: 'RETREATED', c: i, from: L.zone, cause: 'place', eff: true });
        return true;
      },
      evSrc: () => job && job.ev ? job.ev.jsrc : null,
      redirect(i, why) {                                           // ubah Attack Target ke kartu ini (BLOCK, 305.2)
        A.mark();
        const c = st.bt && st.bt.cur, L = locate(st, i); if (!c || !L || L.zone !== 'bat') return false;
        c.slot = L.slot; c.tg = i; c.air = false;
        markTarget(st, i);
        log(st, 'attack', 'The Attack Target of ' + nameOf(st, c.a) + ' changes to ' + nameOf(st, i) + ' (' + SLOT_NAME[L.slot] + ')' + (why ? ' (' + why + ')' : '') + '.');
        return true;
      }
    };
    return A;
  }

  /* ---------------- alur giliran (303.2) ---------------- */
  function startTurn(st, p) {
    st.turn += 1; st.tp = p;
    st.cnt = { call: 0, deploy: 0, arranged: false, cc: [0, 0], ccp: [0, 0], noCost5: [false, false] };
    st.bt = null; st.win = null; st.endStep = null; st.grpSel = null;
    log(st, 'turn', '— Turn ' + st.turn + ': ' + plabel(st, p) + ' —');
    // 303.2.a.1: trigger "saat giliran dimulai" (BP01-038) diselesaikan dulu; Draw Phase sesudahnya (advance, 'start').
    st.phase = 'start';
    emit(st, { k: 'TURN_START', p });
  }
  function drawPhase(st) {
    const p = st.tp;
    st.phase = 'draw';
    draw(st, p, 2);                // 303.2.a.2.1
    if (st.result) return;
    st.phase = 'action';
    log(st, 'phase', 'Action Phase.');
  }
  function isFirstTurnOfFirst(st) { return st.turn === 1; }
  function callLimit(st) { return isFirstTurnOfFirst(st) ? CALL_MAX_FIRST : CALL_MAX; }

  function enterBattle(st) {
    if (st.cnt.skipBattle) {                           // BP01-090 Freedom Decision
      log(st, 'phase', 'Battle Phase skipped (card effect).');
      return enterCounterPhase(st);
    }
    if (isFirstTurnOfFirst(st)) {                      // 303.2.a.4.1
      log(st, 'phase', "Battle Phase skipped (the first player's first turn, 303.2.a.4.1).");
      return enterCounterPhase(st);
    }
    st.phase = 'battle';
    st.bt = { stage: 'F', cur: null };
    log(st, 'phase', 'Battle Phase.');
    if (battleCards(st, st.tp).length === 0) st.cnt.arranged = true;
  }
  function enterCounterPhase(st) {
    st.phase = 'counterPhase';
    st.bt = null;
    st.win = { kind: 'phase', next: opp(st.tp), passes: 0 };   // 303.2.a.5.1
    log(st, 'phase', 'Counter Phase.');
  }
  /* End Phase (303.2.a.6.1), tiga langkah berurutan:
     1. 'trig'  — efek "saat giliran berakhir" terpicu (event TURN_END, dipancarkan SEKALI; efek akhir-giliran
                  yang baru muncul setelahnya tidak terpicu lagi, 303.2.a.6.1.1.1) lalu diselesaikan.
     2. 'mods'  — efek "this turn" berakhir (303.2.a.6.1.2).
     3. 'hand'  — efek "this turn" yang baru muncul saat langkah 2 langsung berakhir (303.2.a.6.1.2.1),
                  lalu batas tangan 9 (303.2.a.6.1.3). */
  function enterEnd(st) {
    st.phase = 'end'; st.win = null; st.endStep = 'trig';
    log(st, 'phase', 'End Phase.');
    emit(st, { k: 'TURN_END', p: st.tp });
  }
  function clearMods(st, why) {
    let any = false;
    for (const i in st.inst) {
      const x = st.inst[i];
      if (x.mods.length) { x.mods = []; any = true; }
      if (x.gr && Object.keys(x.gr).length) { x.gr = {}; any = true; }
    }
    if (any) { log(st, 'phase', why); settle(st); }
    return any;
  }
  function finishTurn(st) {
    log(st, 'phase', plabel(st, st.tp) + "'s turn ends.");
    startTurn(st, opp(st.tp));
  }

  /* ---------------- serangan ---------------- */
  function opportunities(st, iid) {
    const def = defOf(st, iid);
    if (hasAbility(st, iid, 'double')) return 2;                 // Tahap 5: [DOUBLE ATTACK] didapat / bersyarat
    if (def && def.double && inZone(st, iid, 'BATTLE')) { try { if (def.double(api(st, null, iid), iid)) return 2; } catch (e) { /* abaikan */ } }
    const x = st.inst[iid];
    if (x.gr && x.gr.dblChar === st.turn) return 2;               // BP01-011: kesempatan kedua, hanya ke Karakter
    return 1;                                                    // 303.2.a.4.4, [DOUBLE ATTACK] 305.3
  }
  function hasOpportunity(st, iid) {
    const x = st.inst[iid];
    const used = x.atkT === st.turn ? x.atkN : 0;
    return used < opportunities(st, iid);
  }
  function distance(fromSlot, toSlot) { return (5 - LINE[toSlot]) - LINE[fromSlot]; }
  function targetsFor(st, iid) {
    const L = locate(st, iid);
    if (!L || L.zone !== 'bat') return [];
    const R = getR(st, iid);
    if (R <= 0) return [];
    const O = st.P[opp(L.p)], x = st.inst[iid], def = defOf(st, iid);
    // Tahap 3: jarak yang diubah efek (BP01-049 Personal Grudge), serangan kedua hanya ke Karakter (BP01-011),
    // batas target dari kartu terpasang / aura (BP01-098 Chaos Clairvoyance).
    const dist = s => {
      let d = distance(L.slot, s);
      if (def && def.dist && inZone(st, iid, 'BATTLE')) { try { const v = def.dist(readApi(st, iid), iid, s); if (v != null) d = v; } catch (e) { /* abaikan */ } }
      return d;
    };
    const charOnly = x.gr && x.gr.dblChar === st.turn && x.atkT === st.turn && x.atkN >= 1 && !(def && def.double && opportunities(st, iid) === 2 && !x.gr.dblChar);
    const lim = atkLimits(st, iid);
    return SLOTS.filter(s => dist(s) <= R).filter(s => !charOnly || O.bat[s]).filter(s => lim.every(f => f(O.bat[s] || null, s)))
      .map(s => ({ slot: s, iid: O.bat[s] || null, dist: dist(s) }));
  }
  // Batas target serangan dari efek lain (mis. kartu terpasang "can attack the character with Lv6 only").
  function atkLimits(st, iid) {
    const out = [];
    if (st.vanilla) return out;
    st.inst[iid].att.forEach(a => {
      const d = defOf(st, a);
      if (d && d.atkLimit && !st.inst[a].fd) out.push((tg, slot) => { try { return d.atkLimit(readApi(st, a), a, iid, tg, slot); } catch (e) { return true; } });
    });
    return out;
  }
  function canAttack(st, iid) {
    const L = locate(st, iid);
    if (restricted(st, iid, 'atk')) return false;   // BP01-093 "can not attack in this turn"; Tahap 6: larangan tetap
    return !!L && L.zone === 'bat' && L.p === st.tp && !st.inst[iid].fd && hasOpportunity(st, iid) && targetsFor(st, iid).length > 0;  // 303.2.a.4.6
  }
  function stageSlots(stage) { return stage === 'F' ? ['F'] : stage === 'W' ? ['W1', 'W2'] : stage === 'B' ? ['B'] : []; }
  function attackersNow(st) {
    const P = st.P[st.tp];
    return stageSlots(st.bt.stage).map(s => P.bat[s]).filter(i => i && canAttack(st, i));
  }
  function advanceStage(st) {                                     // 303.2.a.4.8–10
    while (st.bt.stage !== 'done' && attackersNow(st).length === 0) {
      st.bt.stage = st.bt.stage === 'F' ? 'W' : st.bt.stage === 'W' ? 'B' : 'done';
    }
  }
  // Riwayat #74: alasan tidak ada Karakter pemain giliran yang bisa menyerang (dipakai log dan petunjuk Reposition).
  // '' bila BATTLE kosong atau masih ada yang bisa menyerang.
  function noAttackWhy(st) {
    const p = st.tp, cs = battleCards(st, p).filter(i => !st.inst[i].fd);
    if (!cs.length || cs.some(i => canAttack(st, i))) return '';
    const parts = cs.map(i => {
      const L = locate(st, i), x = st.inst[i], R = getR(st, i), at = nameOf(st, i) + ' (' + SLOT_NAME[L.slot] + ', R' + R + ')';
      if (x.gr && x.gr.noatk === st.turn) return at + ' cannot attack this turn (card effect)';
      if (R <= 0) return at + ' cannot attack with R 0 (303.2.a.4.6)';
      if (!hasOpportunity(st, i)) return at + ' has no attack opportunity left';
      return at + ' has no target within Attack Range';
    });
    return plabel(st, p) + ' has no Character that can attack: ' + parts.join('; ') + '. Range counts along BACK–WING–FRONT: from FRONT the opponent\'s FRONT is 1 away, from WING 2, from BACK 3.';
  }
  // Target serangan masih sah? (303.2.a.4.3.1.6, 303.2.a.4.3.2.2)
  function targetValid(st) {
    const b = st.bt.cur, O = st.P[opp(st.tp)];
    if (!targetsFor(st, b.a).some(t => t.slot === b.slot)) return false;
    if (b.air) return hasAbility(st, b.a, 'air');                  // AIR STRIKE: area dianggap Weakness (305.5)
    return b.tg ? O.bat[b.slot] === b.tg : !O.bat[b.slot];
  }
  function attackerOk(st) {
    const b = st.bt.cur, L = locate(st, b.a);
    return !!L && L.zone === 'bat' && L.p === st.tp && getR(st, b.a) > 0;
  }
  function weaknessHit(st, a, slot, how) {
    const tp = st.tp;
    st.P[tp].rp += 1; st.P[tp].rpDeck = Math.max(0, st.P[tp].rpDeck - 1);     // 303.2.a.4.3.3.2.1
    log(st, 'rp', plabel(st, tp) + ': ' + nameOf(st, a) + ' successfully attacked a Weakness' + (how || " (opponent's " + SLOT_NAME[slot] + ')') + '. Rush Point → Timeline: ' + st.P[tp].rp + '/9.');
    // Tahap 6: [RAMPAGE] (305.8, CR 1.05 — belum resmi di Indonesia): jumlah kartu yang masuk Timeline +1.
    if (locate(st, a) && hasAbility(st, a, 'rampage') && st.P[tp].rp < RP_WIN) {
      st.P[tp].rp += 1; st.P[tp].rpDeck = Math.max(0, st.P[tp].rpDeck - 1);
      log(st, 'rp', plabel(st, tp) + ': RAMPAGE — 1 more card into the Timeline: ' + st.P[tp].rp + '/9.');
    }
    emit(st, { k: 'WEAK_HIT', a, p: tp });                          // BP01-041 "attacks the weakness successfully"
    checkWin(st);
  }
  // "Not retreated by BOTH LOSE" (SD02-003 di FRONT).
  function bothLoseImmune(st, iid) {
    const d = defOf(st, iid);
    if (d && typeof d.bothLoseImmune === 'function') { try { return !!d.bothLoseImmune(readApi(st, iid), iid); } catch (e) { return false; } }   // Tahap 6: QUICK STRIKE (305.7, CR 1.05)
    return !!(d && d.bothLoseImmune && inZone(st, iid, d.bothLoseImmune));
  }
  /* Tahap 6: larangan tetap "can not attack" / "can not move" (PB02-007 Star-Lord, SD05-007 Doctor Strange). Sumber = kartu
     terbuka di FIELD dengan def.restrict(A, src, tgt) → { atk, move } (termasuk dirinya sendiri), ditambah larangan
     "in this turn" lama (gr.noatk / gr.nomove). */
  function restricted(st, iid, kind) {
    const x = st.inst[iid]; if (!x) return false;
    if (kind === 'atk' && x.gr && x.gr.noatk === st.turn) return true;
    if (kind === 'move' && x.gr && x.gr.nomove === st.turn) return true;
    if (st.vanilla || x.fd) return false;
    for (let p = 0; p < 2; p++) for (const src of charsOnField(st, p)) {
      const d = defOf(st, src); if (!d || !d.restrict) continue;
      try { const r = d.restrict(readApi(st, src), src, iid); if (r && r[kind]) return true; } catch (e) { /* abaikan */ }
    }
    return false;
  }
  function confirmBattle(st) {
    const b = st.bt.cur, tp = st.tp, op = opp(tp);
    const tgNow = st.P[op].bat[b.slot];
    if (!tgNow || b.air) { weaknessHit(st, b.a, b.slot, b.air && tgNow ? ' with AIR STRIKE (the ' + SLOT_NAME[b.slot] + ' counts as a Weakness, 305.5)' : null); return; }
    const pa = getPower(st, b.a), pd = getPower(st, tgNow);          // 303.2.a.4.3.3.1
    const fight = (w, l) => {                                       // Win / Lose the Fight (303.2.a.4.3.3.1.1–2)
      emit(st, { k: 'FIGHT_WON', c: w, vs: l, attacker: w === b.a });
      emit(st, { k: 'FIGHT_LOST', c: l, vs: w, attacker: l === b.a, lv: getLv(st, l), plv: printedLv(st, l), p: locate(st, l).p });
    };
    if (pa > pd) {
      log(st, 'judge', nameOf(st, b.a) + ' (' + pa + ') WINS THE FIGHT against ' + nameOf(st, tgNow) + ' (' + pd + ').');
      fight(b.a, tgNow);
      retreat(st, tgNow, 'lost the fight', { vs: b.a });
      if (hasAbility(st, b.a, 'assault') && locate(st, b.a)) weaknessHit(st, b.a, b.slot, ' (ASSAULT, 305.4)');
    } else if (pa < pd) {
      log(st, 'judge', nameOf(st, b.a) + ' (' + pa + ') LOSES THE FIGHT against ' + nameOf(st, tgNow) + ' (' + pd + ').');
      fight(tgNow, b.a);
      retreat(st, b.a, 'lost the fight', { vs: tgNow });
    } else {
      log(st, 'judge', nameOf(st, b.a) + ' and ' + nameOf(st, tgNow) + ' both have ' + pa + ' Attack Power: BOTH LOSE.');
      emit(st, { k: 'BOTH_LOSE', a: b.a, d: tgNow });
      // K-17 (keputusan pemilik 6 Nov 2026, RS-034): BOTH LOSE dihitung "kalah bertarung" untuk kedua Karakter;
      // tidak ada yang "menang bertarung".
      [[b.a, tgNow], [tgNow, b.a]].forEach(([l, w]) => emit(st, { k: 'FIGHT_LOST', c: l, vs: w, attacker: l === b.a, both: true, lv: getLv(st, l), plv: printedLv(st, l), p: locate(st, l).p }));
      [b.a, tgNow].forEach(i => {
        if (!locate(st, i)) return;
        if (bothLoseImmune(st, i)) log(st, 'eff', nameOf(st, i) + ' is not retreated by BOTH LOSE (its own AUTO effect).');
        else retreat(st, i, 'BOTH LOSE');
      });
    }
  }

  /* ---------------- efek tertunda ---------------- */
  /* [BLOCK] sebagai kemampuan (CR 305.2.a): COUNTER-ACTI (BATTLE / Once per turn). Dipakai untuk kartu ber-def.block,
     BLOCK yang didapat "this turn" (SP01-064) dan efek pinjaman (SP01-047). SD04-004 tetap memakai resolvernya sendiri. */
  const BUILTIN_BLOCK = {
    id: '$block', zone: 'BATTLE', counter: true, once: true, label: '[BLOCK] Change the Attack Target to this card',
    can: A => {
      const c = A.cur(); if (!c || A.ctrl(c.a) !== A.opp(A.p) || c.tg === A.self) return false;
      const s = A.slot(A.self); return !!s && A.targetsOf(c.a).some(t => t.slot === s);
    },
    run: A => A.redirect(A.self, '[BLOCK]')
  };
  function actiDef(st, iid, eff) {
    if (eff === '$block') return BUILTIN_BLOCK;
    const def = defOf(st, iid);
    return def && def.acti ? def.acti.find(e => e.id === eff) || null : null;
  }
  function jobDef(st, job) {
    if (job.kind !== 'trig') return actiDef(st, job.c, job.eff);
    const def = defOf(st, job.c);
    if (!def || !def.trig) return null;
    return def.trig.find(e => e.id === job.eff) || null;
  }
  function jobLabel(st, job) { const e = jobDef(st, job); return nameOf(st, job.c) + (e && e.label ? ' — ' + e.label : ''); }
  // Jalankan job sampai selesai atau sampai butuh jawaban.
  function runJob(st, job) {
    const e = jobDef(st, job);
    job.mut = false;
    st.curB = ++st.bseq;          // efek yang terpicu selama job ini = kelompok baru (RS-016, 304.1.h)
    try {
      // Tahap 3: efek dua langkah — run() boleh menandai job.step2; after() lalu boleh bertanya lagi SESUDAH perubahan
      // langkah pertama (mis. "draw 1, then discard 1"). Saat after() menunggu jawaban, run() tidak diulang.
      if (e && !job.inAfter) e.run(api(st, job, job.c), job);
      if (e && e.after && job.step2) { job.inAfter = true; job.mut = false; e.after(api(st, job, job.c), job); }
      job.done = true;
    } catch (err) {
      if (err instanceof Ask) {
        st.prompt = Object.assign({ type: err.spec.yesno ? 'yesno' : err.spec.pick ? 'pick' : 'choose', job: job.id, label: jobLabel(st, job) }, err.spec);
        return false;
      }
      throw err;
    }
    st.job = null;
    settle(st);
    return true;
  }
  // Pilih efek tertunda berikutnya (304.1.f–h). Mengembalikan true kalau ada prompt.
  function processPending(st) {
    for (let guard = 0; guard < 200; guard++) {
      if (st.result) return false;
      if (st.job) {
        const job = st.job;
        if (job.stage === 'opt') { const jd = jobDef(st, job) || {}; st.prompt = { type: 'opt', p: job.p, job: job.id, label: jobLabel(st, job), text: jd.text || 'Use this effect?', hand: jd.zone === 'HAND' }; return true; }
        if (!runJob(st, job)) return true;
        continue;
      }
      // buang trigger yang sumbernya sudah tidak di zonanya (kecuali trigger saat masuk RETREAT dll. — dicek ulang)
      if (!st.pend.length) { st.tev = []; return false; }
      // RS-016 (304.1.h, keputusan pemilik 30 Okt 2026): kelompok trigger TERBARU diselesaikan dulu,
      // sebelum efek yang sudah menunggu; di dalam satu kelompok turn player dulu (304.1.g).
      const maxB = Math.max.apply(null, st.pend.map(j => j.b || 0));
      const batch = st.pend.filter(j => (j.b || 0) === maxB);
      const mine = batch.filter(j => j.p === st.tp), theirs = batch.filter(j => j.p !== st.tp);
      const group = mine.length ? mine : theirs;                     // turn player dulu (304.1.g)
      const g = group[0].p;
      // RS-016 penyempurnaan (K-12, Head Judge 22 Okt 2026): kelompok baru milik satu pemain tidak boleh
      // disisipi. Kalau pemain yang SAMA masih punya trigger lama yang menunggu, ia memilih trigger lama itu
      // diselesaikan sebelum atau sesudah SELURUH kelompok baru (ditawarkan sebelum kelompok dimulai).
      const gs = st.grpSel;
      const older = (gs && gs.b === maxB && gs.p === g && gs.started) ? [] : st.pend.filter(j => j.p === g && (j.b || 0) < maxB);
      if (group.length > 1 || older.length) {
        st.prompt = { type: 'order', p: g, b: maxB, rs016: older.length > 0,
          jobs: group.map(j => ({ id: j.id, label: jobLabel(st, j) })).concat(older.map(j => ({ id: j.id, label: jobLabel(st, j), older: true }))) };
        return true;
      }
      st.grpSel = { b: maxB, p: g, started: true };
      startJob(st, group[0].id);
    }
    return false;
  }
  function startJob(st, id) {
    const i = st.pend.findIndex(j => j.id === id);
    const job = st.pend.splice(i, 1)[0];
    const e = jobDef(st, job);
    st.job = job;
    const hand = job.kind === 'trig' && e && e.zone === 'HAND';
    if (job.kind === 'trig' && e && e.can && !e.can(api(st, job, job.c), job)) {
      log(st, 'eff', plabel(st, job.p) + ': ' + jobLabel(st, job) + ' — nothing can be resolved.', hand ? { priv: job.p } : null);
      st.job = null; return;
    }
    if (job.kind === 'trig') log(st, 'trig', plabel(st, job.p) + ': ' + jobLabel(st, job) + ' triggers' + (hand ? ' (from the HAND)' : '') + '.', hand && job.opt ? { priv: job.p } : null);
    if (job.opt) { job.stage = 'opt'; return; }
    if (e && e.once) st.inst[job.c].once[e.id] = st.turn;
  }

  /* ---------------- mesin keputusan ---------------- */
  function advance(st) {
    for (let guard = 0; guard < 2000; guard++) {
      if (st.result) { st.phase = 'over'; st.prompt = null; return; }
      if (st.phase !== 'mulligan' && processPending(st)) return;
      if (st.result) continue;
      switch (st.phase) {
        case 'mulligan': {
          if (st.mull.idx >= 2) { st.mull = null; startTurn(st, st.first); continue; }
          st.prompt = { p: st.mull.order[st.mull.idx], type: 'mulligan' };
          return;
        }
        case 'start': drawPhase(st); continue;
        case 'action':
          st.prompt = { p: st.tp, type: 'main' };
          return;
        case 'battle': {
          if (st.bt.cur) {
            if (!attackerOk(st)) {                                   // 303.2.a.4.3.2.6–7
              log(st, 'battle', 'The attacking Character can no longer attack; the battle ends.');
              st.bt.cur = null; st.win = null; continue;
            }
            if (!targetValid(st)) {                                  // 303.2.a.4.3.2.2
              if (targetsFor(st, st.bt.cur.a).length === 0) { log(st, 'battle', 'No valid Attack Target within R; the battle ends.'); st.bt.cur = null; st.win = null; continue; }
              st.prompt = { p: st.tp, type: 'retarget', a: st.bt.cur.a };
              return;
            }
            if (st.win.passes >= 2) {
              log(st, 'step', 'Counter Step ends. Confirmation Step.');
              confirmBattle(st);
              settle(st);
              st.bt.cur = null; st.win = null;
              continue;
            }
            st.prompt = { p: st.win.next, type: 'counter', kind: 'step' };
            return;
          }
          if (!st.cnt.arranged) { st.prompt = { p: st.tp, type: 'arrange' }; return; }
          advanceStage(st);
          if (st.bt.stage === 'done') {
            // Riwayat #74: bila tidak ada satu pun kesempatan menyerang, jelaskan sebabnya (dulu terlewati tanpa keterangan).
            if (!st.bt.had) { const why = noAttackWhy(st); if (why) log(st, 'battle', why); }
            log(st, 'phase', 'Battle Phase ends.'); enterCounterPhase(st); settle(st); continue;
          }
          st.bt.had = true;
          st.prompt = { p: st.tp, type: 'attack', stage: st.bt.stage };
          return;
        }
        case 'counterPhase':
          if (st.win.passes >= 2) { enterEnd(st); continue; }   // 303.2.a.5.3
          st.prompt = { p: st.win.next, type: 'counter', kind: 'phase' };
          return;
        case 'end':
          if (st.endStep === 'trig') { st.endStep = 'mods'; clearMods(st, 'Effects that applied for this turn end (303.2.a.6.1.2).'); continue; }
          if (st.endStep === 'mods') { st.endStep = 'hand'; clearMods(st, 'An effect for this turn that began while effects were ending ends immediately (303.2.a.6.1.2.1).'); continue; }
          if (st.P[st.tp].hand.length > HAND_MAX) {
            st.prompt = { p: st.tp, type: 'discard', n: st.P[st.tp].hand.length - HAND_MAX };
            return;
          }
          finishTurn(st);
          continue;
        default:
          st.prompt = null; return;
      }
    }
    throw new Error('advance(): loop did not terminate');
  }

  /* ---------------- ACTI & COUNTER CALL ---------------- */
  // Daftar efek ACTI yang bisa diaktifkan pemain p sekarang (inCounter = di window Counter).
  function actiOptions(st, p, inCounter) {
    if (st.vanilla) return [];
    const out = [];
    for (const iid in st.inst) {
      const def = defOf(st, iid); if (!def || !def.acti) continue;
      const L = locate(st, iid); if (!L || L.p !== p) continue;
      def.acti.forEach(e => {
        if (inCounter && !e.counter) return;
        if (!inZone(st, iid, e.zone)) return;
        if (e.once && st.inst[iid].once[e.id] === st.turn) return;
        if (e.times) { const w = st.inst[iid].tw[e.id]; if (w && w.t === st.turn && w.n >= e.times) return; }
        let ok = true;
        try { ok = !e.can || e.can(api(st, { p, ans: {}, c: iid }, iid)); } catch (x) { ok = false; }   // 304.2.b
        if (ok) out.push({ c: iid, eff: e.id, label: e.label || 'Activate' });
      });
    }
    // Tahap 5: [BLOCK] sebagai kemampuan (kartu di BATTLE pemain p).
    if (inCounter && st.bt && st.bt.cur) battleCards(st, p).forEach(iid => {
      if (!hasAbility(st, iid, 'block') || st.inst[iid].once.$block === st.turn) return;
      let ok = false; try { ok = BUILTIN_BLOCK.can(api(st, { p, ans: {}, c: iid }, iid)); } catch (x) { ok = false; }
      if (ok) out.push({ c: iid, eff: '$block', label: BUILTIN_BLOCK.label });
    });
    return out;
  }
  // 305.1. Tahap 4: counter boleh berupa fungsi (PB01-008: [COUNTER] hanya bila syaratnya terpenuhi).
  function hasCounterAbility(st, iid) {
    // Tahap 6 (SD06-013 War Envoy): [COUNTER] untuk kartu lain di HAND dari aura di FIELD.
    if (!st.vanilla && !st.inst[iid].fd) for (let p = 0; p < 2; p++) for (const src of charsOnField(st, p)) {
      const ds = defOf(st, src); if (!ds || !ds.auraCounter) continue;
      try { if (ds.auraCounter(readApi(st, src), src, iid)) return true; } catch (e) { /* abaikan */ }
    }
    const d = defOf(st, iid); if (!d || !d.counter) return false;
    if (typeof d.counter !== 'function') return true;
    try { return !!d.counter(readApi(st, iid), iid); } catch (e) { return false; }
  }
  // Tahap 4 (PB01-002): catat setiap kali sebuah Karakter menjadi Attack Target dalam giliran ini.
  function markTarget(st, tg) {
    if (!tg || !st.inst[tg]) return;
    const x = st.inst[tg];
    if (x.tgdT !== st.turn) { x.tgdT = st.turn; x.tgdN = 0; }
    x.tgdN += 1;
  }
  function counterCallUsed(st, p) { return st.win && st.win.kind === 'step' ? st.cnt.cc[p] : st.cnt.ccp[p]; }

  /* ---------------- validasi aksi ---------------- */
  function check(st, a) {
    const pr = st.prompt;
    if (!pr) return st.result ? 'The game is over.' : 'No decision is pending.';
    if (!a || typeof a !== 'object') return 'Unreadable action.';
    const p = pr.p, P = st.P[p];
    switch (pr.type) {
      case 'mulligan': {
        if (a.t !== 'mulligan') return 'Decide whether to adjust your starting HAND first.';
        const cs = a.cards || [];
        if (new Set(cs).size !== cs.length) return 'A card was selected twice.';
        if (!cs.every(i => P.hand.includes(i))) return 'Cards to adjust must come from your own HAND.';
        return null;
      }
      case 'main': return checkMain(st, a, p, P);
      case 'arrange': {
        if (a.t !== 'arrange') return 'Rearrange your BATTLE first (or skip).';
        if (a.map == null) return null;
        const cur = SLOTS.map(s => P.bat[s] || '').sort().join(',');
        const nw = SLOTS.map(s => (a.map[s] || '')).sort().join(',');
        if (cur !== nw) return 'Rearranging may only change the positions of Characters already in your BATTLE.';
        if (SLOTS.some(sl => P.bat[sl] && a.map[sl] !== P.bat[sl] && restricted(st, P.bat[sl], 'move'))) return 'A Character that cannot move must stay where it is (card effect).';
        return null;
      }
      case 'attack': {
        if (a.t === 'noAttack') {
          if (!attackersNow(st).includes(a.a)) return 'This Character is not up in the attack order.';
          return null;
        }
        if (a.t !== 'attack') return 'Choose an attacker or declare no attack.';
        if (!st.inst[a.a]) return 'Choose an attacker.';
        if (!attackersNow(st).includes(a.a)) {
          const L = locate(st, a.a);
          if (!L || L.zone !== 'bat' || L.p !== p) return 'Only Characters in your BATTLE can attack (302.2.b).';
          if (!hasOpportunity(st, a.a)) return 'This Character has already used its attack opportunity.';
          if (getR(st, a.a) <= 0) return "This Character's R is 0, so it cannot attack (303.2.a.4.6).";
          return 'Attack order is FRONT → WING → BACK (303.2.a.4.2.2); it is now the ' + ({ F: 'FRONT', W: 'WING', B: 'BACK' })[st.bt.stage] + "'s turn to attack.";
        }
        if (!targetsFor(st, a.a).some(t => t.slot === a.tg)) return 'Target is outside Attack Range (R ' + getR(st, a.a) + ').';
        if (a.air && !hasAbility(st, a.a, 'air')) return 'This Character does not have AIR STRIKE.';
        return null;
      }
      case 'retarget':
        if (a.t !== 'retarget') return 'Choose a new Attack Target.';
        if (!targetsFor(st, pr.a).some(t => t.slot === a.tg)) return 'Target is outside Attack Range (R ' + getR(st, pr.a) + ').';
        if (a.air && !hasAbility(st, pr.a, 'air')) return 'This Character does not have AIR STRIKE.';
        return null;
      case 'pick':
        return a.t === 'pick' && pr.options.some(o => o.v === a.v) ? null : 'Choose one of the options.';
      case 'rps':
        return a.t === 'rps' && RPS.includes(a.v) ? null : 'Choose Rock, Paper or Scissors.';
      case 'counter': {
        if (a.t === 'pass') return null;
        if (a.t === 'manual') return checkManual(st, a);
        if (st.vanilla) return 'Vanilla mode: no COUNTER CALL or COUNTER-Activated Effects are available; choose pass.';
        if (a.t === 'acti') return actiOptions(st, p, true).some(o => o.c === a.c && o.eff === a.eff) ? null : 'That COUNTER-Activated Effect cannot be activated now.';
        if (a.t === 'ccall') {
          if (counterCallUsed(st, p) >= 1) return 'COUNTER CALL can be performed only once per turn here (303.2.a.4.3.2.3.1.1 / 303.2.a.5.2.1.1).';
          if (!P.hand.includes(a.c) || !hasCounterAbility(st, a.c)) return 'Only a Character with [COUNTER] in your HAND can be called with COUNTER CALL (305.1).';
          return checkCallCore(st, a, p, P);
        }
        return 'Action not available.';
      }
      case 'discard': {
        if (a.t !== 'discard') return 'Discard down to 9 cards in HAND.';
        const cs = a.cards || [];
        if (cs.length !== pr.n) return 'You must discard exactly ' + pr.n + (pr.n === 1 ? ' card.' : ' cards.');
        if (new Set(cs).size !== cs.length || !cs.every(i => P.hand.includes(i))) return 'Choose cards from your own HAND.';
        return null;
      }
      case 'opt':
        return a.t === 'opt' ? null : 'Decide whether to use this effect.';
      case 'yesno':
        return a.t === 'yesno' ? null : 'Answer the effect question.';
      case 'order':
        return a.t === 'order' && pr.jobs.some(j => j.id === a.job) ? null : 'Choose which effect resolves next (304.1.f).';
      case 'choose': {
        if (a.t !== 'choose') return 'Choose cards for the effect.';
        const cs = a.cards || [];
        if (new Set(cs).size !== cs.length) return 'A card was selected twice.';
        if (cs.length < pr.min || cs.length > pr.max) return 'Choose ' + (pr.min === pr.max ? pr.min : pr.min + '–' + pr.max) + ' card(s).';
        if (!cs.every(i => pr.from.includes(i))) return 'That card is not a valid choice.';
        return null;
      }
    }
    return 'Unknown action.';
  }

  function checkMain(st, a, p, P) {
    switch (a.t) {
      case 'endAction': return null;
      case 'deploy': {                                   // 303.2.a.3.1.1
        if (st.cnt.deploy >= 1) return 'Base Deployment can be performed only once per turn (303.2.a.3.1.1.2).';
        if (!P.hand.includes(a.c)) return 'Choose a card from your HAND.';
        if (P.base.length >= BASE_MAX) return 'BASE is full (limit 6 cards).';
        return null;
      }
      case 'call':
        if (st.cnt.call >= callLimit(st)) return 'Action CALL limit reached for this turn (' + st.cnt.call + '/' + callLimit(st) + ').';
        if (!P.hand.includes(a.c)) return 'Choose a Character from your HAND.';
        return checkCallCore(st, a, p, P);
      case 'bbmove': {                                   // 303.2.a.3.1.3
        const x = st.inst[a.c], L = x && locate(st, a.c);
        if (!L || L.p !== p || (L.zone !== 'bat' && L.zone !== 'base')) return 'Choose a Character on your FIELD.';
        if (x.fd) return 'A Face-Down Card is not a Character and cannot perform BATTLE-BASE MOVE.';
        if (x.enT === st.turn) return 'A Character placed onto the FIELD this turn cannot perform BATTLE-BASE MOVE (303.2.a.3.1.3.3).';
        if (x.bbm === st.turn) return 'This Character has already used its BATTLE-BASE MOVE this turn (303.2.a.3.1.3.2).';
        if (restricted(st, a.c, 'move')) return 'This Character cannot move (card effect).';
        if (L.zone === 'bat') {
          if (a.to !== 'BASE') return 'A Character in BATTLE can only move to the BASE.';
          if (P.base.length >= BASE_MAX) return 'BASE is full (limit 6 cards).';
        } else {
          if (!SLOTS.includes(a.to)) return 'A Character in the BASE can only move to a BATTLE area.';
          if (P.bat[a.to]) return SLOT_NAME[a.to] + ' is already occupied.';
        }
        return null;
      }
      case 'acti':
        return actiOptions(st, p, false).some(o => o.c === a.c && o.eff === a.eff) ? null : 'That Activated Effect cannot be activated now (304.2.b).';
      case 'manual': return checkManual(st, a);
    }
    return 'That action is not available in the Action Phase.';
  }

  /* ---------------- TOOLKIT EFEK MANUAL (cadangan, Tahap 1) ----------------
     Untuk kartu yang belum punya resolver atau kasus ruling yang belum jelas: pemain yang sedang
     diberi prompt (Action Phase atau window Counter) menjalankan satu langkah efek sendiri.
     Aksi: { t:'manual', op, c?, p?, n?, s?, d?, host?, src? }  — src = kartu yang efeknya dijalankan (opsional).
     Selalu tercatat di log sebagai "Manual effect". Langkah ini memakai primitif yang sama dengan
     resolver, jadi trigger otomatis (mis. "when retreated") tetap terpicu.
       retreat  : kartu di FIELD → RETREAT (kartu terpasang ikut, 301.25.c)
       prune    : kartu di FIELD / HAND / RETREAT / Deck → VOID
       discard  : kartu di HAND → RETREAT (301.15)
       hand     : kartu di RETREAT / VOID / Deck → HAND
       setBase  : kartu di HAND / RETREAT / VOID / Deck → BASE tertutup
       deckBottom: kartu di HAND / RETREAT / VOID → bawah Deck
       attach   : kartu di HAND / FIELD → dipasang ke karakter terbuka di FIELD (301.25)
       mod      : karakter terbuka di FIELD, s = 'p' | 'r' | 'lv', d ≠ 0, berlaku "this turn"
       draw     : pemain p menarik n kartu (1–5) */
  const MANUAL_OPS = ['retreat', 'prune', 'discard', 'hand', 'setBase', 'deckBottom', 'attach', 'mod', 'draw'];
  function manualOps(st, iid) {
    const L = locate(st, iid); if (!L) return [];
    const x = st.inst[iid], onF = L.zone === 'bat' || L.zone === 'base' || L.zone === 'att';
    const out = [];
    if (onF) out.push('retreat');
    if (onF || L.zone === 'hand' || L.zone === 'ret' || L.zone === 'deck') out.push('prune');
    if (L.zone === 'hand') out.push('discard');
    if (L.zone === 'ret' || L.zone === 'void' || L.zone === 'deck') out.push('hand');
    if (['hand', 'ret', 'void', 'deck'].includes(L.zone) && st.P[x.owner].base.length < BASE_MAX) out.push('setBase');
    if (['hand', 'ret', 'void'].includes(L.zone)) out.push('deckBottom');
    if ((L.zone === 'hand' || onF) && attachHosts(st, iid).length) out.push('attach');
    if ((L.zone === 'bat' || L.zone === 'base') && !x.fd) out.push('mod');
    return out;
  }
  // Induk yang sah: karakter terbuka di FIELD pemilik kartu itu, bukan kartu itu sendiri.
  function attachHosts(st, iid) {
    const x = st.inst[iid];
    return charsOnField(st, x.owner).filter(h => h !== iid && h !== x.host);
  }
  function checkManual(st, a) {
    if (!MANUAL_OPS.includes(a.op)) return 'Unknown manual effect.';
    if (st.job) return 'Finish the effect that is resolving first.';
    if (a.src != null && !st.inst[a.src]) return 'Unknown source card.';
    if (a.op === 'draw') {
      if (a.p !== 0 && a.p !== 1) return 'Choose a player.';
      const n = a.n | 0;
      if (n < 1 || n > 5) return 'Draw 1–5 cards.';
      return null;
    }
    if (!st.inst[a.c]) return 'Choose a card.';
    if (!manualOps(st, a.c).includes(a.op)) return 'That manual effect cannot be used on this card here.';
    if (a.op === 'attach' && !attachHosts(st, a.c).includes(a.host)) return 'Choose a face-up Character on the same player\'s FIELD to attach to.';
    if (a.op === 'mod') {
      if (!['p', 'r', 'lv'].includes(a.s)) return 'Choose Power, R or Lv.';
      const d = a.d | 0;
      if (!d || Math.abs(d) > (a.s === 'p' ? 20000 : 10)) return 'Choose a change other than 0.';
    }
    return null;
  }
  function doManual(st, p, a) {
    const src = a.src != null ? ' of ' + nameOf(st, a.src) : '';
    const what = { retreat: 'Retreat', prune: 'Prune to VOID', discard: 'discard', hand: 'put into HAND', setBase: 'place face-down into the BASE',
      deckBottom: 'put on the bottom of the Deck', attach: 'attach', mod: 'change a stat', draw: 'draw' }[a.op];
    log(st, 'manual', plabel(st, p) + ': Manual effect' + src + ' — ' + what + '.');
    const why = 'manual effect';
    switch (a.op) {
      case 'retreat': retreat(st, a.c, why); break;
      case 'prune': prune(st, a.c, why); break;
      case 'discard': discard(st, a.c, why); break;
      case 'draw': draw(st, a.p, a.n | 0); break;
      case 'attach': attach(st, a.c, a.host); break;
      case 'mod': {
        const d = a.d | 0;
        st.inst[a.c].mods.push({ s: a.s, d, src: null, manual: 1, t: ++st.tick });
        log(st, 'mod', nameOf(st, a.c) + ' gets ' + ({ p: 'Power', r: 'R', lv: 'Lv' })[a.s] + (d >= 0 ? '+' : '') + d + ' this turn (manual effect).');
        break;
      }
      case 'hand': {
        const x = st.inst[a.c], L = locate(st, a.c);
        removeAnywhere(st, a.c); refresh(st, a.c);
        st.P[x.owner].hand.push(a.c);
        log(st, 'move', plabel(st, x.owner) + ': ' + (L.zone === 'deck' ? 'a card from the Deck' : nameOf(st, a.c) + ' from ' + ({ ret: 'RETREAT', void: 'VOID' })[L.zone]) + ' is put into the HAND.',
          L.zone === 'deck' ? { pp: x.owner, ptxt: nameOf(st, a.c) } : null);
        break;
      }
      case 'setBase': {
        const x = st.inst[a.c], L = locate(st, a.c), hidden = L.zone === 'hand' || L.zone === 'deck';
        removeAnywhere(st, a.c); refresh(st, a.c);
        x.fd = true; x.enT = st.turn;
        st.P[x.owner].base.push(a.c);
        log(st, 'set', plabel(st, x.owner) + ': ' + (hidden ? 'a card from the ' + ({ hand: 'HAND', deck: 'Deck' })[L.zone] : nameOf(st, a.c) + ' from ' + ({ ret: 'RETREAT', void: 'VOID' })[L.zone]) + ' is placed face-down into the BASE.',
          hidden ? { pp: x.owner, ptxt: nameOf(st, a.c) } : null);
        break;
      }
      case 'deckBottom': {
        const x = st.inst[a.c], L = locate(st, a.c);
        removeAnywhere(st, a.c); refresh(st, a.c);
        st.P[x.owner].deck.push(a.c);
        log(st, 'move', plabel(st, x.owner) + ': ' + (L.zone === 'hand' ? 'a card from the HAND' : nameOf(st, a.c)) + ' goes to the bottom of the Deck.',
          L.zone === 'hand' ? { pp: x.owner, ptxt: nameOf(st, a.c) } : null);
        break;
      }
    }
    settle(st);
  }

  // Biaya CALL: karakter terbuka atau kartu tertutup di FIELD (kartu terpasang bukan karakter).
  function costLv(st, iid) { return st.inst[iid].fd ? 1 : getLv(st, iid); }   // 301.21.g
  /* Tahap 5: kartu yang tidak boleh di-retreat untuk CALL. SP01-003 Jean Grey (gr.nocost, kartu itu sendiri), SP01-061
     Mr. Negative (st.cnt.noCost5: Karakter Lv5+ pemain itu), SP01-079 Gwen Stacy (def.noCostHost di kartu terpasang). */
  function costBanned(st, iid, p) {
    if (st.vanilla) return false;
    const x = st.inst[iid];
    if (x.gr && x.gr.nocost === st.turn) return true;
    if (!x.fd && st.cnt && st.cnt.noCost5 && st.cnt.noCost5[p] && getLv(st, iid) >= 5) return true;
    return x.att.some(a => { const d = defOf(st, a); if (!d || !d.noCostHost || st.inst[a].fd) return false; try { return !!d.noCostHost(readApi(st, a), a, iid); } catch (e) { return false; } });
  }
  function checkCallCore(st, a, p, P) {                  // 301.19
    if (!P.hand.includes(a.c)) return 'Choose a Character from your HAND.';
    { const d = defOf(st, a.c); if (d && d.noCall) return 'This card can not be called (its own effect).'; }   // Tahap 6: SD05-012, PB02-004
    const lv = getLv(st, a.c), cost = a.cost || [];
    if (new Set(cost).size !== cost.length) return 'A card was chosen twice for the CALL cost.';
    if (lv <= 3) {
      if (cost.length) return 'Lv3 or lower Characters are called without retreating anything (301.19.a).';
    } else {
      if (!cost.length) return 'A Lv' + lv + ' CALL requires retreating cards on your FIELD with a combined Lv of exactly ' + lv + ' (301.19.b).';
      const field = fieldCards(st, p);
      if (!cost.every(i => field.includes(i))) return 'Cards retreated for the CALL must be on your FIELD.';
      if (cost.some(i => costBanned(st, i, p))) return 'That card cannot be retreated to call a Character this turn (card effect).';
      const sum = cost.reduce((s, i) => s + costLv(st, i), 0);
      if (sum !== lv) return 'Combined Lv is ' + sum + '; it must be exactly ' + lv + '.';
    }
    if (uniqueBlocked(st, a.c, p, cost)) return 'Another card with the same name is already on your FIELD (UNIQUE, 305.6.a).';
    const dest = a.to;
    if (dest === 'BASE') {
      const freed = cost.filter(i => P.base.includes(i)).length;
      if (P.base.length - freed >= BASE_MAX) return 'BASE is full (limit 6 cards).';
    } else if (SLOTS.includes(dest)) {
      if (P.bat[dest] && !cost.includes(P.bat[dest])) return SLOT_NAME[dest] + ' is already occupied.';
    } else return 'Choose a destination: a BATTLE area or the BASE.';
    return null;
  }

  function costOptions(st, p, lv) {
    const field = fieldCards(st, p).filter(i => !costBanned(st, i, p)), out = [];
    const n = field.length;
    for (let m = 1; m < (1 << n); m++) {
      let s = 0; const pick = [];
      for (let k = 0; k < n; k++) if (m & (1 << k)) { s += costLv(st, field[k]); pick.push(field[k]); if (s > lv) break; }
      if (s === lv) out.push(pick);
    }
    return out;
  }

  /* ---------------- daftar aksi sah (untuk bot & uji) ---------------- */
  function callActions(st, p, c, t, push) {
    const lv = getLv(st, c);
    const costs = lv <= 3 ? [[]] : costOptions(st, p, lv);
    costs.forEach(cost => {
      SLOTS.forEach(s => push({ t, c, to: s, cost }));
      push({ t, c, to: 'BASE', cost });
    });
  }
  function legalActions(st, opts) {
    const pr = st.prompt; if (!pr) return [];
    const p = pr.p, P = st.P[p], out = [];
    const push = a => { if (!check(st, a)) out.push(a); };
    const lim = (opts && opts.limit) || 3000;
    switch (pr.type) {
      case 'mulligan': {
        const h = P.hand;
        for (let m = 0; m < (1 << h.length); m++) out.push({ t: 'mulligan', cards: h.filter((_, k) => m & (1 << k)) });
        return out;
      }
      case 'main': {
        out.push({ t: 'endAction' });
        if (st.cnt.deploy < 1 && P.base.length < BASE_MAX) P.hand.forEach(c => out.push({ t: 'deploy', c }));
        if (st.cnt.call < callLimit(st)) {
          const seen = new Set();
          P.hand.forEach(c => {
            const key = st.inst[c].no + ':' + getLv(st, c); if (seen.has(key)) return; seen.add(key);
            callActions(st, p, c, 'call', push);
          });
        }
        fieldCards(st, p).forEach(c => {
          const L = locate(st, c);
          if (L.zone === 'bat') push({ t: 'bbmove', c, to: 'BASE' });
          else SLOTS.forEach(s => push({ t: 'bbmove', c, to: s }));
        });
        actiOptions(st, p, false).forEach(o => out.push({ t: 'acti', c: o.c, eff: o.eff }));
        return out;
      }
      case 'arrange': {
        out.push({ t: 'arrange', map: null });
        const cur = SLOTS.map(s => P.bat[s]);
        const seen = new Set([cur.join(',')]);
        permute(cur).forEach(perm => {
          const k = perm.join(','); if (seen.has(k)) return; seen.add(k);
          const map = {}; SLOTS.forEach((s, i) => { map[s] = perm[i]; });
          if (SLOTS.some((sl, i) => cur[i] && perm[i] !== cur[i] && restricted(st, cur[i], 'move'))) return;   // Tahap 6: PB02-007
          out.push({ t: 'arrange', map });
        });
        return out;
      }
      case 'attack':
        attackersNow(st).forEach(a => {
          out.push({ t: 'noAttack', a });
          targetsFor(st, a).forEach(tg => { out.push({ t: 'attack', a, tg: tg.slot }); if (tg.iid && hasAbility(st, a, 'air')) out.push({ t: 'attack', a, tg: tg.slot, air: true }); });
        });
        return out;
      case 'retarget':
        targetsFor(st, pr.a).forEach(tg => { out.push({ t: 'retarget', tg: tg.slot }); if (tg.iid && hasAbility(st, pr.a, 'air')) out.push({ t: 'retarget', tg: tg.slot, air: true }); });
        return out;
      case 'pick': return pr.options.map(o => ({ t: 'pick', v: o.v }));
      case 'rps': return RPS.map(v => ({ t: 'rps', v }));
      case 'counter': {
        out.push({ t: 'pass' });
        if (st.vanilla) return out;
        actiOptions(st, p, true).forEach(o => out.push({ t: 'acti', c: o.c, eff: o.eff }));
        if (counterCallUsed(st, p) < 1) {
          const seen = new Set();
          P.hand.filter(c => hasCounterAbility(st, c)).forEach(c => {
            const key = st.inst[c].no; if (seen.has(key)) return; seen.add(key);
            callActions(st, p, c, 'ccall', push);
          });
        }
        return out;
      }
      case 'discard':
        combos(P.hand, pr.n, lim).forEach(cs => out.push({ t: 'discard', cards: cs }));
        return out;
      case 'opt': return [{ t: 'opt', yes: true }, { t: 'opt', yes: false }];
      case 'yesno': return [{ t: 'yesno', yes: true }, { t: 'yesno', yes: false }];
      case 'order': return pr.jobs.map(j => ({ t: 'order', job: j.id }));
      case 'choose': {
        for (let k = pr.min; k <= pr.max && out.length < lim; k++) combos(pr.from, k, lim - out.length).forEach(cs => out.push({ t: 'choose', cards: cs }));
        return out;
      }
    }
    return out;
  }
  function permute(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => { const rest = arr.slice(0, i).concat(arr.slice(i + 1)); permute(rest).forEach(r => out.push([x].concat(r))); });
    return out;
  }
  function combos(arr, k, lim) {
    const out = [];
    (function rec(start, pick) {
      if (out.length >= lim) return;
      if (pick.length === k) { out.push(pick.slice()); return; }
      for (let i = start; i < arr.length; i++) { pick.push(arr[i]); rec(i + 1, pick); pick.pop(); }
    })(0, []);
    return out;
  }

  /* ---------------- menjalankan aksi ---------------- */
  // Siaga (Trigger Hand, mode pass-and-play): pemain diam-diam memilih kartu [TRIG](HAND) di HAND-nya yang
  // boleh terpicu. Aksi bebas (tidak mengubah prompt), dicatat di log hanya untuk pemain itu.
  function handTriggerCards(st, p) {
    return st.P[p].hand.filter(i => { const d = defOf(st, i); return d && d.trig && d.trig.some(t => t.zone === 'HAND'); });
  }
  function applyArm(st, a) {
    if (st.result) return { ok: false, err: 'The game is over.' };
    if (a.p !== 0 && a.p !== 1) return { ok: false, err: 'Choose a player.' };
    const cs = a.cards || [], ok = handTriggerCards(st, a.p);
    if (new Set(cs).size !== cs.length || !cs.every(i => ok.includes(i))) return { ok: false, err: 'Only [TRIG](HAND) cards in your own HAND can be set to Siaga.' };
    st.actions.push(JSON.parse(JSON.stringify(a)));
    st.P[a.p].armed = cs.slice();
    log(st, 'siaga', plabel(st, a.p) + ' sets Siaga: ' + (cs.length ? cs.map(i => nameOf(st, i)).join(', ') : 'none') + '.', { priv: a.p });
    return { ok: true };
  }
  // Batas waktu (UI v3, keputusan pemilik 6 Nov 2026): jam habis dicatat sebagai aksi bebas (tidak mengubah prompt),
  // lalu tampilan menjalankan aksi bawaan untuk pemain itu. Tidak ada kekalahan karena waktu.
  function applyTimeout(st, a) {
    if (st.result || !st.prompt) return { ok: false, err: 'No decision is pending.' };
    if (a.p !== st.prompt.p) return { ok: false, err: 'Only the player who must act can run out of time.' };
    st.actions.push(JSON.parse(JSON.stringify(a)));
    st.to = st.to || [0, 0]; st.to[a.p] += 1;
    // O-19 (keputusan pemilik 9 Nov 2026): di versi online, timeout ke-n (n = toLimit, 3) = langsung kalah.
    if (st.toLimit && st.to[a.p] >= st.toLimit) {
      log(st, 'timeout', plabel(st, a.p) + ' ran out of ' + (a.kind === 'resp' ? 'response' : 'turn') + ' time (timeout ' + st.to[a.p] + '/' + st.toLimit + ').');
      st.result = { winner: opp(a.p), cause: plabel(st, a.p) + ' reached ' + st.toLimit + ' timeouts (online rule O-19)', timeouts: true };
      st.phase = 'over'; st.prompt = null;
      log(st, 'over', plabel(st, opp(a.p)) + ' WINS — ' + st.result.cause + '.');
      return { ok: true };
    }
    log(st, 'timeout', plabel(st, a.p) + ' ran out of ' + (a.kind === 'resp' ? 'response' : 'turn') + ' time (timeout ' + st.to[a.p] + (st.toLimit ? '/' + st.toLimit : '') + '); the simulator acts for them.');
    return { ok: true };
  }
  /* Menyerah (riwayat #74, permintaan pemilik 11 Nov 2026): aksi bebas {t:'concede', p}; boleh kapan saja selama
     permainan belum selesai, juga di luar giliran. Pemain itu kalah dan permainan berhenti saat itu juga. */
  function applyConcede(st, a) {
    if (st.result) return { ok: false, err: 'The game is over.' };
    if (a.p !== 0 && a.p !== 1) return { ok: false, err: 'Choose a player.' };
    st.actions.push({ t: 'concede', p: a.p });
    log(st, 'concede', plabel(st, a.p) + ' concedes the game.');
    st.result = { winner: opp(a.p), cause: plabel(st, a.p) + ' conceded', concede: true };
    st.phase = 'over'; st.prompt = null;
    log(st, 'over', plabel(st, opp(a.p)) + ' WINS — ' + st.result.cause + '.');
    return { ok: true };
  }
  /* Waktu pertandingan habis (O-14, keputusan pemilik 7 Nov 2026: pilihan 30 menit tanpa batas waktu per pemain,
     simulasi pertandingan resmi). Dicatat sebagai aksi bebas {t:'timeup'}; permainan berhenti saat itu juga.
     Penentu: (1) Rush Point terbanyak di Timeline, (2) sisa kartu Deck terbanyak, (3) jankenpon (diulang bila seri).
     Jankenpon = prompt 'rps' bergiliran P1 lalu P2; pilihan baru diumumkan setelah keduanya memilih. */
  const RPS = ['rock', 'paper', 'scissors'];
  const RPS_NAME = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
  function endByTime(st, w, why) {
    st.result = { winner: w, cause: why, time: true };
    st.phase = 'over'; st.prompt = null;
    log(st, 'over', plabel(st, w) + ' WINS — ' + why + '.');
  }
  function applyTimeup(st, a) {
    if (st.result) return { ok: false, err: 'The game is over.' };
    if (st.tu) return { ok: false, err: 'Match time has already run out.' };
    st.actions.push(JSON.parse(JSON.stringify(a)));
    const r = [st.P[0].rp, st.P[1].rp], d = [st.P[0].deck.length, st.P[1].deck.length];
    st.tu = { round: 1, picks: [null, null], at: { turn: st.turn, tp: st.tp, phase: st.phase } };
    st.job = null; st.pend = []; st.win = null;
    log(st, 'timeup', 'Match time is up' + (a.min ? ' (' + a.min + ' minutes)' : '') + '. The game stops now. Rush Points: ' + plabel(st, 0) + ' ' + r[0] + ', ' +
      plabel(st, 1) + ' ' + r[1] + ' · Deck: ' + plabel(st, 0) + ' ' + d[0] + ', ' + plabel(st, 1) + ' ' + d[1] + '.');
    if (r[0] !== r[1]) { const w = r[0] > r[1] ? 0 : 1; endByTime(st, w, 'match time ran out: more Rush Points (' + r[w] + ' vs ' + r[1 - w] + ')'); return { ok: true }; }
    if (d[0] !== d[1]) { const w = d[0] > d[1] ? 0 : 1; endByTime(st, w, 'match time ran out: Rush Points tied, more cards left in the Deck (' + d[w] + ' vs ' + d[1 - w] + ')'); return { ok: true }; }
    st.phase = 'rps'; st.prompt = { p: 0, type: 'rps', round: 1 };
    log(st, 'rps', 'Rush Points and Deck are tied: rock-paper-scissors (jankenpon) decides the winner.');
    return { ok: true };
  }
  function applyRps(st, a) {
    const pr = st.prompt;
    if (!pr || pr.type !== 'rps') return { ok: false, err: 'No rock-paper-scissors decision is pending.' };
    if (!RPS.includes(a.v)) return { ok: false, err: 'Choose Rock, Paper or Scissors.' };
    st.actions.push(JSON.parse(JSON.stringify(a)));
    st.tu.picks[pr.p] = a.v;
    if (pr.p === 0) { st.prompt = { p: 1, type: 'rps', round: st.tu.round }; return { ok: true }; }
    const [x, y] = st.tu.picks;
    log(st, 'rps', 'Rock-paper-scissors round ' + st.tu.round + ': ' + plabel(st, 0) + ' ' + RPS_NAME[x] + ', ' + plabel(st, 1) + ' ' + RPS_NAME[y] + '.');
    if (x === y) {
      st.tu.round += 1; st.tu.picks = [null, null];
      st.prompt = { p: 0, type: 'rps', round: st.tu.round };
      log(st, 'rps', 'Tie: play again.');
      return { ok: true };
    }
    const w = (RPS.indexOf(x) - RPS.indexOf(y) + 3) % 3 === 1 ? 0 : 1;
    endByTime(st, w, 'match time ran out: Rush Points and Deck tied, won rock-paper-scissors (round ' + st.tu.round + ')');
    return { ok: true };
  }
  function apply(st, a) {
    if (a && a.t === 'arm') return applyArm(st, a);
    if (a && a.t === 'timeout') return applyTimeout(st, a);
    if (a && a.t === 'timeup') return applyTimeup(st, a);
    if (a && a.t === 'concede') return applyConcede(st, a);
    if (a && a.t === 'rps') return applyRps(st, a);
    if (st.prompt && st.prompt.type === 'rps') return { ok: false, err: 'Choose Rock, Paper or Scissors.' };
    const err = check(st, a);
    if (err) return { ok: false, err };
    const pr = st.prompt, p = pr.p, P = st.P[p];
    st.actions.push(JSON.parse(JSON.stringify(a)));
    st.prompt = null;
    st.curB = ++st.bseq;
    switch (pr.type) {
      case 'mulligan': {
        const cs = a.cards || [];
        if (cs.length) {
          cs.forEach(i => { P.hand.splice(P.hand.indexOf(i), 1); P.deck.push(i); });
          const got = [];
          for (let k = 0; k < cs.length; k++) { const i = P.deck.shift(); P.hand.push(i); got.push(i); }
          shuffle(st, P.deck);
          log(st, 'mulligan', plabel(st, p) + ' adjusts the starting HAND: ' + cs.length + ' card(s) to the bottom of the Deck, draws ' + cs.length + ', shuffles the Deck.',
            { pp: p, ptxt: 'Returned: ' + cs.map(i => nameOf(st, i)).join(', ') + ' · Drew: ' + got.map(i => nameOf(st, i)).join(', ') });
        } else log(st, 'mulligan', plabel(st, p) + ' keeps the starting HAND.');
        st.mull.idx += 1;
        break;
      }
      case 'main': doMain(st, a, p, P); break;
      case 'arrange': {
        st.cnt.arranged = true;
        if (a.map) {
          const before = SLOTS.map(s => P.bat[s]);
          SLOTS.forEach(s => { P.bat[s] = a.map[s] || null; });
          const changed = SLOTS.some((s, i) => before[i] !== P.bat[s]);
          log(st, 'arrange', plabel(st, p) + (changed ? ' rearranges BATTLE: ' + SLOTS.map(s => SLOT_NAME[s] + '=' + (P.bat[s] ? nameOf(st, P.bat[s]) : '—')).join(', ') + '.' : ' keeps the BATTLE positions.'));
        } else log(st, 'arrange', plabel(st, p) + ' does not rearrange BATTLE.');
        settle(st);
        break;
      }
      case 'attack': {
        const x = st.inst[a.a];
        if (x.atkT !== st.turn) { x.atkT = st.turn; x.atkN = 0; }
        x.atkN += 1;
        if (a.t === 'attack') x.dclT = st.turn;                     // RS-027: menyatakan serangan = "sudah menyerang"
        if (a.t === 'noAttack') {
          // Kesempatan menyerang hilang (303.2.a.4.7); kesempatan kedua [DOUBLE ATTACK] juga dilepas.
          x.atkN = Math.max(x.atkN, opportunities(st, a.a));
          log(st, 'noattack', plabel(st, p) + ': ' + nameOf(st, a.a) + ' does not attack (attack opportunity lost, 303.2.a.4.7).');
        } else {
          const L = locate(st, a.a), O = st.P[opp(p)], tg0 = O.bat[a.tg], air = !!(a.air && tg0);
          const tg = air ? null : tg0;
          st.bt.cur = { a: a.a, slot: a.tg, tg: tg || null, air };
          markTarget(st, tg);
          log(st, 'attack', plabel(st, p) + ': ' + nameOf(st, a.a) + ' (' + SLOT_NAME[L.slot] + ', Power ' + getPower(st, a.a) + ') attacks ' +
            (air ? "the opponent's " + SLOT_NAME[a.tg] + ' as a Weakness with AIR STRIKE (305.5)' : tg ? nameOf(st, tg) + " (opponent's " + SLOT_NAME[a.tg] + ', Power ' + getPower(st, tg) + ')' : "the Weakness at the opponent's " + SLOT_NAME[a.tg]) + '.');
          st.win = { kind: 'step', next: opp(p), passes: 0 };
          emit(st, { k: 'ATTACK', a: a.a, tg: tg || null, slot: a.tg, air, lv: getLv(st, a.a) });
          log(st, 'step', 'Counter Step.');
        }
        break;
      }
      case 'retarget': {
        const O = st.P[opp(p)], tg0 = O.bat[a.tg], air = !!(a.air && tg0), tg = air ? null : tg0;
        st.bt.cur.slot = a.tg; st.bt.cur.tg = tg || null; st.bt.cur.air = air;
        markTarget(st, tg);
        log(st, 'attack', plabel(st, p) + ': ' + nameOf(st, pr.a) + ' selects a new Attack Target: ' + (air ? "the opponent's " + SLOT_NAME[a.tg] + ' as a Weakness (AIR STRIKE)' : tg ? nameOf(st, tg) : "the Weakness at the opponent's " + SLOT_NAME[a.tg]) + ' (303.2.a.4.3.2.2).');
        st.win = { kind: 'step', next: opp(p), passes: 0 };
        log(st, 'step', 'Counter Step.');
        break;
      }
      case 'counter': {
        if (a.t === 'pass') {
          log(st, 'pass', plabel(st, p) + ': pass.');
          st.win.passes += 1;
          st.win.next = opp(st.win.next);
        } else {
          st.win.passes = 0;
          st.win.next = opp(p);
          if (a.t === 'acti') activate(st, p, a);
          else if (a.t === 'manual') doManual(st, p, a);
          else doCall(st, p, a, true);
        }
        break;
      }
      case 'discard': {
        a.cards.forEach(i => { P.hand.splice(P.hand.indexOf(i), 1); P.ret.push(i); });
        log(st, 'discard', plabel(st, p) + ' discards ' + a.cards.length + ' card(s) to RETREAT (HAND limit 9): ' + a.cards.map(i => nameOf(st, i)).join(', ') + '.');
        finishTurn(st);
        break;
      }
      case 'opt': {
        const job = st.job;
        if (a.yes) {
          const e = jobDef(st, job);
          if (e && e.once) st.inst[job.c].once[e.id] = st.turn;
          job.stage = null;
          log(st, 'eff', plabel(st, p) + ' uses ' + jobLabel(st, job) + '.');
        } else {
          // RS-002 (R-075): menolak efek opsional tidak menghabiskan jatah ONCE PER TURN.
          const hd = (jobDef(st, job) || {}).zone === 'HAND';
          log(st, 'eff', plabel(st, p) + ' does not use ' + jobLabel(st, job) + '.', hd ? { priv: p } : null);
          st.job = null;
        }
        break;
      }
      case 'yesno': st.job.ans[pr.key] = !!a.yes; break;
      case 'pick': st.job.ans[pr.key] = a.v; break;
      case 'choose': {
        st.job.ans[pr.key] = a.cards.slice();
        break;
      }
      case 'order': {
        const j = st.pend.find(x => x.id === a.job);
        // RS-016: memilih anggota kelompok baru = kelompok dimulai (trigger lama menunggu sampai kelompok selesai).
        st.grpSel = { b: pr.b, p: pr.p, started: !!(j && (j.b || 0) === pr.b) };
        if (j && (j.b || 0) !== pr.b) log(st, 'eff', plabel(st, p) + ' resolves the earlier ' + jobLabel(st, j) + ' before the new group of effects (RS-016).');
        startJob(st, a.job);
        break;
      }
    }
    advance(st);
    return { ok: true };
  }

  function doCall(st, p, a, counter) {
    const P = st.P[p], cost = a.cost || [];
    if (cost.length) {
      const sum = cost.reduce((s, i) => s + costLv(st, i), 0);
      log(st, 'callcost', plabel(st, p) + ': Lv' + getLv(st, a.c) + ' CALL cost — Retreat ' + cost.length + ' card(s) (combined Lv ' + sum + ').');
      cost.forEach(i => retreat(st, i, 'CALL cost'));
    }
    const lv = getLv(st, a.c), r0 = getR(st, a.c), p0 = getPower(st, a.c);
    P.hand.splice(P.hand.indexOf(a.c), 1);
    if (a.to === 'BASE') P.base.push(a.c); else P.bat[a.to] = a.c;
    const x = st.inst[a.c]; x.fd = false; x.enT = st.turn;
    if (counter) {
      if (st.win.kind === 'step') st.cnt.cc[p] += 1; else st.cnt.ccp[p] += 1;
      log(st, 'call', plabel(st, p) + ': COUNTER CALL ' + nameOf(st, a.c) + ' (Lv' + lv + ', R' + r0 + ', Power ' + p0 + ') to ' + SLOT_NAME[a.to] + '.');
    } else {
      st.cnt.call += 1;
      log(st, 'call', plabel(st, p) + ': CALL ' + nameOf(st, a.c) + ' (Lv' + lv + ', R' + r0 + ', Power ' + p0 + ') to ' + SLOT_NAME[a.to] + '. [CALL ' + st.cnt.call + '/' + callLimit(st) + ']');
    }
    emit(st, { k: 'CALLED', c: a.c, p, counter: !!counter, cost: cost.length });
    emit(st, { k: 'ENTER', c: a.c, p, how: counter ? 'ccall' : 'call', from: 'hand' });
    settle(st);
  }
  function activate(st, p, a) {
    const e = actiDef(st, a.c, a.eff);
    if (e.once) st.inst[a.c].once[e.id] = st.turn;
    if (e.times) { const x = st.inst[a.c], w = x.tw[e.id]; x.tw[e.id] = { t: st.turn, n: (w && w.t === st.turn ? w.n : 0) + 1 }; }
    const job = { id: ++st.jid, c: a.c, p, kind: 'acti', eff: e.id, opt: false, ans: {}, born: st.log.length };
    log(st, 'acti', plabel(st, p) + ' activates ' + jobLabel(st, job) + '.');
    st.job = job;
  }

  function doMain(st, a, p, P) {
    switch (a.t) {
      case 'endAction':
        log(st, 'phase', plabel(st, p) + ' ends the Action Phase.');
        enterBattle(st);
        settle(st);
        return;
      case 'deploy': {
        P.hand.splice(P.hand.indexOf(a.c), 1);
        P.base.push(a.c);
        const x = st.inst[a.c]; x.fd = true; x.enT = st.turn;
        st.cnt.deploy += 1;
        log(st, 'deploy', plabel(st, p) + ': Base Deployment, 1 card placed face-down into the BASE.', { pp: p, ptxt: nameOf(st, a.c) });
        emit(st, { k: 'SET_UP', p });                                  // BP01-091: kartu set di BASE bertambah
        draw(st, p, 1);
        settle(st);
        return;
      }
      case 'call': doCall(st, p, a, false); return;
      case 'bbmove': {
        const L = locate(st, a.c);
        if (L.zone === 'bat') { P.bat[L.slot] = null; P.base.push(a.c); }
        else { P.base.splice(P.base.indexOf(a.c), 1); P.bat[a.to] = a.c; }
        st.inst[a.c].bbm = st.turn;
        log(st, 'move', plabel(st, p) + ': BATTLE-BASE MOVE ' + nameOf(st, a.c) + ' from ' + (L.zone === 'bat' ? SLOT_NAME[L.slot] : 'BASE') + ' to ' + SLOT_NAME[a.to] + '.');
        emit(st, { k: 'BBMOVE', c: a.c });
        settle(st);
        return;
      }
      case 'acti': activate(st, p, a); return;
      case 'manual': doManual(st, p, a); return;
    }
  }

  /* ---------------- kode log & replay ---------------- */
  function b64urlEncode(str) {
    const bin = unescape(encodeURIComponent(str));
    const b = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function exportLog(st) {
    const o = { v: 1, e: VERSION, s: st.seed, f: st.firstOpt, n: st.names, d: st.decks, x: st.vanilla ? 0 : 1, a: st.actions };
    if (st.pos) o.q = st.pos;                    // permainan Sandbox: posisi awal ikut disimpan
    if (st.siaga) o.g = 1;                       // mode Siaga (pass-and-play dua orang)
    if (st.confirm) o.k = 1;                     // pilihan tunggal tetap ditanyakan (UI v3, 6 Nov 2026)
    if (st.opaque) o.o = 1;                      // O0: iid diacak (online)
    if (st.toLimit) o.t = st.toLimit;            // O0/O-19: batas timeout online (kalah pada timeout ke-n)
    return 'MHRSIM1.' + b64urlEncode(JSON.stringify(o));
  }
  function parseLog(code) {
    const m = String(code || '').trim().match(/MHRSIM1\.([A-Za-z0-9_-]+)/);
    if (!m) return null;
    try { return JSON.parse(b64urlDecode(m[1])); } catch (e) { return null; }
  }
  function replay(o, n) {
    const st = o.q ? createGame({ position: o.q, names: o.n, vanilla: !o.x, siaga: !!o.g, confirm: !!o.k })
      : createGame({ decks: o.d, seed: o.s, first: o.f, names: o.n, vanilla: !o.x, siaga: !!o.g, confirm: !!o.k, opaque: !!o.o, toLimit: o.t || 0 });
    const acts = o.a || [], lim = n == null ? acts.length : Math.min(n, acts.length);
    for (let i = 0; i < lim; i++) {
      const r = apply(st, acts[i]);
      if (!r.ok) { st.replayError = 'Action #' + (i + 1) + ' was rejected: ' + r.err; break; }
    }
    return st;
  }
  function clone(st) { return JSON.parse(JSON.stringify(st)); }

  /* ---------- O0 (riwayat #59): tampilan per pemain untuk versi online ----------
     Server memegang state lengkap; tiap pemain hanya menerima viewFor(st, p). Yang TIDAK pernah dikirim: seed/RNG, daftar
     deck lawan, isi & urutan Deck (milik sendiri pun hanya jumlah), isi HAND lawan (hanya jumlah), identitas kartu
     tertutup lawan di FIELD, Siaga lawan, pilihan jankenpon lawan sebelum keduanya memilih, antrean efek internal, dan
     prompt lawan selain jenisnya. Kartu yang ditawarkan kepada p di prompt-nya sendiri (mis. melihat kartu teratas Deck)
     ikut terlihat oleh p. */
  function visibleTo(st, iid, p) {
    const x = st.inst[iid], L = locate(st, iid);
    if (!x || !L) return false;
    if (L.zone === 'deck') return false;
    if (L.zone === 'hand') return L.p === p;
    if (L.zone === 'ret' || L.zone === 'void' || L.zone === 'att') return true;
    return !x.fd || L.p === p;                                    // FIELD: kartu tertutup hanya untuk pemiliknya
  }
  function iidsIn(o, out) {
    if (typeof o === 'string') { if (/^[ab]\d+$/.test(o)) out.add(o); }
    else if (Array.isArray(o)) o.forEach(v => iidsIn(v, out));
    else if (o && typeof o === 'object') Object.keys(o).forEach(k => iidsIn(o[k], out));
    return out;
  }
  function viewFor(st, p) {
    const cp = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
    const mine = st.prompt && st.prompt.p === p;
    const offered = mine ? iidsIn(st.prompt, new Set()) : new Set();
    const inst = {};
    for (const iid in st.inst) {
      const x = st.inst[iid], L = locate(st, iid);
      // Kartu yang ditawarkan di prompt p sendiri hanya terbuka bila itu kartu Deck (mis. "lihat 3 kartu teratas") atau
      // milik p; kartu tertutup / HAND lawan yang menjadi pilihan target tetap tertutup.
      if (visibleTo(st, iid, p) || (offered.has(iid) && L && (L.zone === 'deck' || x.owner === p))) inst[iid] = cp(x);
      else if (L && (L.zone === 'bat' || L.zone === 'base')) inst[iid] = { iid, owner: x.owner, fd: true, hidden: true };
    }
    const v = {
      v: st.v, engine: st.engine, viewer: p, names: st.names.slice(), vanilla: st.vanilla, siaga: st.siaga, confirm: st.confirm,
      turn: st.turn, tp: st.tp, first: st.first, phase: st.phase, cnt: cp(st.cnt), win: cp(st.win), bt: cp(st.bt),
      mull: st.mull ? { idx: st.mull.idx, order: st.mull.order.slice() } : null,
      result: cp(st.result), to: (st.to || [0, 0]).slice(), toLimit: st.toLimit || 0,
      tu: st.tu ? { round: st.tu.round, mine: st.tu.picks[p] } : null,
      P: st.P.map((P, q) => ({
        deck: P.deck.length, hand: q === p ? P.hand.slice() : P.hand.length, bat: Object.assign({}, P.bat), base: P.base.slice(),
        ret: P.ret.slice(), void: P.void.slice(), rp: P.rp, rpDeck: P.rpDeck, armed: q === p ? P.armed.slice() : []
      })),
      deckList: st.decks[p].slice(),
      inst,
      prompt: !st.prompt ? null : mine ? cp(st.prompt) : { p: st.prompt.p, type: st.prompt.type, kind: st.prompt.kind },
      pending: (st.pend || []).length + (st.job ? 1 : 0),
      log: logFor(st, p).map(e => e.k === 'start' ? Object.assign({}, e, { txt: e.txt.replace(/, seed \d+/, '') }) : e),
      nActions: st.actions.length
    };
    return v;
  }
  function hash(st) {
    const s = JSON.stringify({ P: st.P, inst: st.inst, turn: st.turn, tp: st.tp, phase: st.phase, rng: st.rng, result: st.result });
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16);
  }
  function logFor(st, viewer) {
    return st.log.filter(e => e.priv == null || viewer === 'all' || viewer === e.priv).map(e => {
      let t = e.txt;
      if (e.ptxt && (viewer === 'all' || viewer === e.pp)) t += ' [' + e.ptxt + ']';
      return { n: e.n, turn: e.turn, k: e.k, txt: t };
    });
  }
  // Total kartu milik p di semua zona (untuk uji invarian).
  function countCards(st, p) {
    let n = 0;
    for (const i in st.inst) if (st.inst[i].owner === p && locate(st, i)) n++;
    return n;
  }

  const API = {
    VERSION, SLOTS, SLOT_NAME, BASE_MAX, HAND_MAX, RP_WIN, COLOR_EN,
    init, registerCards, hasResolver, card, nameEn, textEn, nameKey, createGame, check, apply, legalActions, advance,
    locate, fieldCards, battleCards, charsOnField, targetsFor, canAttack, attackersNow, noAttackWhy, distance, actiOptions, hasCounterAbility, counterCallUsed,
    getLv, getR, getPower, statBreakdown, nameOf, costLv, costOptions, callLimit, opportunities, countCards, settle,
    validateDeck, decodeDeckCode, testDeckSD01, seedFromString,
    exportLog, parseLog, replay, clone, hash, logFor, opp,
    validatePosition, positionFrom, exportPosition, parsePosition, emptyPosition,
    manualOps, attachHosts, MANUAL_OPS,
    testDeck, uniqueBlocked, hasAbility, handTriggerCards, placeSpots, bbmDests,
    lostEffects, abilityCount, costBanned,
    HIDDEN_SETS, HIDDEN_MSG, isHiddenNo, hiddenCount, encodeDeckCode,
    viewFor, visibleTo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MHRSim = API;
})(typeof window !== 'undefined' ? window : this);
