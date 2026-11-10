/* ===================================================================
   MHR BATTLE SIM — RESOLVER TAHAP 4: PB01, EB01, TB01 (sim-cards-s4.js)      v0.11
   ===================================================================
   Dibuat dari TEKS INGGRIS (e_en) di cards.js, format sama dengan sim-cards.js / sim-cards-bp01.js.
   - PB01-001…011 (promo Guardians of the Galaxy + Avengers), EB01-006…014, TB01-001.
   - 4 kartu EB01 adalah cetak ulang dengan teks Inggris sama: EB01-010 (= BP01-016), EB01-011 (= SD02-004,
     teks "[COUNTER]" = kemampuan COUNTER yang sama), EB01-012 (= BP01-066), EB01-013 (= BP01-005).
   Bacaan yang belum pasti ditandai "RS-049…" (ruling-simulator.md, sementara) dan ditanyakan sebagai K-32…
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;
  const SD = isNode ? require('./sim-cards.js') : root.MHRCardDefs;
  const BP = isNode ? require('./sim-cards-bp01.js') : root.MHRCardDefsBP01;

  const YELLOW = 'Kuning';
  const traits = (A, i) => A.trait(i).split('/').map(x => x.trim());
  const hasTrait = (A, i, t) => traits(A, i).includes(t);
  const isGotg = (A, i) => hasTrait(A, i, 'GOTG');
  const isAvengers = (A, i) => hasTrait(A, i, 'Avengers');
  const isWeb = (A, i) => hasTrait(A, i, 'Web');
  const ev = A => (A.job && A.job.ev) || {};
  const calledSelf = (e, self) => e.k === 'CALLED' && e.c === self;
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const wonSelf = (e, self) => e.k === 'FIGHT_WON' && e.c === self;
  const slotOpts = (A, spots) => spots.map(v => ({ v, label: A.spotLabel(v) }));
  const oppBattle = A => A.battleChars(A.opp(A.p));
  const oppChars = A => A.chars(A.opp(A.p));
  const inField = (A, i) => { const L = A.loc(i); return !!L && (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att'); };
  // Kartu terbuka di FIELD lawan, termasuk kartu terpasang (RS-049: kartu tertutup tidak punya Lv, CR 301.21.e).
  const oppFieldCards = A => { const out = []; oppChars(A).forEach(i => { out.push(i); A.attached(i).forEach(a => out.push(a)); }); return out.filter(i => !A.isFd(i)); };

  const DEFS = {
    /* ============================ PB01 ============================ */
    /* 「Destroyer」Drax */
    'PB01-001': {
      trig: [{
        id: 'won', zone: 'BATTLE', label: 'Destroyer', when: wonSelf,
        can: A => A.battleChars(A.p).some(i => i !== A.self && isGotg(A, i)),
        run: A => { A.battleChars(A.p).filter(i => i !== A.self && isGotg(A, i)).forEach(i => A.mod(i, 'r', 1, 'Destroyer')); }
      }]
    },
    /* 「My Rabbit」Rocket Raccoon — "attacked before in this turn" = sudah pernah jadi Attack Target giliran ini (RS-050). */
    'PB01-002': {
      trig: [{
        id: 'atk', zone: 'BATTLE', label: 'My Rabbit',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => { const c = A.cur(); return !!(c && c.a === A.self && c.tg && A.timesTargeted(c.tg) >= 2); },
        run: A => { const c = A.cur(); if (c && c.tg) A.retreat(c.tg, 'My Rabbit'); }
      }]
    },
    /* 「Galaxy Dancer」Star-Lord — "enters the field by effect" = ditempatkan oleh efek, swap dari RETREAT/HAND, atau dipasang
       dari luar FIELD (RS-038, RS-051; K-42 & K-44, riwayat #45). */
    'PB01-003': {
      unique: true,
      trig: [{
        id: 'base', zone: 'BASE', optional: true, label: 'Galaxy Dancer',
        text: "Prune this card in your BASE to put that Character on the bottom of your opponent's Deck?",
        when: (e, self, A) => e.k === 'ENTER' && (e.how === 'place' || e.how === 'swap' || e.how === 'attach') && A.ctrl(e.c) === A.opp(A.p),
        can: A => { const c = ev(A).c; return !!c && inField(A, c) && A.ctrl(c) === A.opp(A.p); },
        run: A => { const c = ev(A).c; if (A.prune(A.self, 'Galaxy Dancer') && inField(A, c)) A.toDeckBottom(c, 'Galaxy Dancer'); }
      }]
    },
    /* 「Dangerous Sisters」Nebula */
    'PB01-004': {
      auto: [
        { stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.battleChars(A.ctrl(src)).filter(i => i !== src && isGotg(A, i)).length : 0 },
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.battleChars(A.ctrl(src)).filter(i => i !== src && isGotg(A, i)).length * 1000 : 0 }
      ]
    },
    /* 「Dangerous Sisters」Gamora */
    'PB01-005': {
      acti: [{
        id: 'place', zone: 'HAND', label: 'Place this card from HAND onto your FIELD (2+ [GOTG] in BATTLE)',
        can: A => A.battleChars(A.p).filter(i => isGotg(A, i)).length >= 2 && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose where to place 「Dangerous Sisters」Gamora', slotOpts(A, A.spots(A.p)));
          if (to) A.place(A.self, to, 'Dangerous Sisters');
        }
      }]
    },
    /* 「I Am Groot」Groot */
    'PB01-006': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? -A.handCount(A.ctrl(src)) * 1000 : 0 }]
    },
    /* 「Preemptive Strike」Iron Man — dibandingkan saat efek diselesaikan. */
    'PB01-007': {
      trig: [{
        id: 'atk', zone: 'BATTLE', label: 'Preemptive Strike',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => { const c = A.cur(); return !!(c && c.a === A.self && c.tg && A.pw(c.tg) > A.pw(A.self)); },
        run: A => { const c = A.cur(); if (c && c.tg) A.mod(c.tg, 'p', -2000, 'Preemptive Strike'); }
      }]
    },
    /* 「Thunder Teleportation」Thor — [COUNTER] hanya bila BATTLE Anda berisi Karakter kuning saja (minimal 1, RS-052). */
    'PB01-008': {
      counter: A => { const b = A.battleChars(A.p); return b.length > 0 && b.every(i => A.color(i) === YELLOW); }
    },
    /* 「Heaven Sent Troops」Hulk — biaya: tepat 6 kartu di BASE (BASE maksimal 6). */
    'PB01-009': {
      acti: [{
        id: 'troops', zone: 'HAND', label: 'Retreat 6 cards in your BASE: place this card onto your FIELD',
        can: A => A.base(A.p).length >= 6,
        run: A => {
          const opts = A.emptySlots(A.p).concat(['BASE']);   // BASE kosong setelah biaya dibayar
          const to = A.pick('to', 'Choose where to place 「Heaven Sent Troops」Hulk', slotOpts(A, opts));
          const b = A.base(A.p).slice(0, 6);
          let n = 0; b.forEach(i => { if (A.retreat(i, 'Heaven Sent Troops')) n++; });
          if (n === 6 && to) A.place(A.self, to, 'Heaven Sent Troops');
          else A.log('Heaven Sent Troops: the cost could not be paid in full, so the card stays in the HAND.');
        }
      }]
    },
    /* 「Blade In The Back」Captain America — masuk BATTLE lawan; lawan menjadi pengendali (RS-041, RS-053). */
    'PB01-010': {
      acti: [{
        id: 'blade', zone: 'HAND', label: "Place this card into your opponent's BATTLE",
        can: A => { const op = A.opp(A.p); return A.setCount(A.p) > A.setCount(op) && A.emptySlots(op).length > 0 && A.canPlace(A.self, op); },
        run: A => {
          const op = A.opp(A.p);
          const to = A.pick('to', "Choose an empty area in your opponent's BATTLE", slotOpts(A, A.emptySlots(op)));
          if (to) A.placeOnto(A.self, to, op, 'Blade In The Back');
        }
      }],
      trig: [{
        // "you" = pengendali (pemain yang BATTLE-nya ditempati kartu ini).
        id: 'enter', zone: 'BATTLE', label: 'Blade In The Back', when: enterSelf,
        can: A => A.battleChars(A.p).some(i => A.pw(i) <= 4500),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters with Power 4500 or lower in BATTLE: it Retreats', from: A.battleChars(A.p).filter(i => A.pw(i) <= 4500), prefer: 'low' });
          t.forEach(i => A.retreat(i, 'Blade In The Back'));
        }
      }]
    },
    /* 「Astral Visitor」Doctor Strange — ACTI dari VOID. */
    'PB01-011': {
      acti: [{
        id: 'astral', zone: 'VOID', once: true, label: 'Prune 1 Lv4+ Character in your RETREAT: place this card from VOID onto your FIELD',
        can: A => A.ret(A.p).some(i => A.lv(i) >= 4) && A.canPlace(A.self, A.p),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Lv4+ Characters in RETREAT to Prune', from: A.ret(A.p).filter(i => A.lv(i) >= 4) });
          const to = A.pick('to', 'Choose where to place 「Astral Visitor」Doctor Strange', slotOpts(A, A.spots(A.p)));
          if (c.length && A.prune(c[0], 'Astral Visitor') && to) A.place(A.self, to, 'Astral Visitor');
        }
      }]
    },

    /* ============================ EB01 ============================ */
    /* 「Super Strike」Hulk — "Lv6" = Lv saat ini (RS-038). */
    'EB01-006': {
      trig: [{
        id: 'six', zone: 'BATTLE', label: 'Super Strike',
        when: (e, self, A) => e.k === 'ENTER' && A.ctrl(e.c) === A.opp(A.p) && A.lv(e.c) === 6,
        can: A => { const c = ev(A).c; return !!c && inField(A, c); },
        run: A => {
          const c = ev(A).c;
          A.mod(A.self, 'p', -1000, 'Super Strike');
          if (inField(A, c)) A.mod(c, 'p', -1000, 'Super Strike');
        }
      }]
    },
    /* 「Spiritual Resonance」Vision — biaya boleh kartu ini sendiri (Lv3 [Avengers]), RS-054. */
    'EB01-007': {
      acti: [{
        id: 'reso', zone: 'BATTLE', once: true, label: 'Retreat 1 Lv3 [Avengers] Character: you may place 1 Lv3 [Avengers] from HAND into BATTLE',
        can: A => A.chars(A.p).some(i => A.lv(i) === 3 && isAvengers(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Lv3 [Avengers] Characters in the field to Retreat', from: A.chars(A.p).filter(i => A.lv(i) === 3 && isAvengers(A, i)) });
          const freed = c.length && A.slot(c[0]) ? [A.slot(c[0])] : [];
          const slots = A.emptySlots(A.p).concat(freed);
          const h = slots.length ? A.ask('h', { text: 'You may choose 1 Lv3 [Avengers] Character in your HAND to place into your BATTLE', from: A.hand(A.p).filter(i => A.lv(i) === 3 && isAvengers(A, i)), min: 0, max: 1 }) : [];
          const to = h.length ? A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, ['F', 'W1', 'W2', 'B'].filter(s => slots.includes(s)))) : null;
          if (c.length && A.retreat(c[0], 'Spiritual Resonance') && h.length && to) A.place(h[0], to, 'Spiritual Resonance');
        }
      }]
    },
    /* 「Chaos Origin」Scarlet Witch — BATTLE-BASE MOVE sebagai aksi maupun oleh efek (RS-054). */
    'EB01-008': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, label: 'Chaos Origin',
        when: (e, self) => e.k === 'BBMOVE' && e.c === self,
        can: A => A.voidOf(A.p).length > 0,
        run: A => { A.mod(A.self, 'p', A.voidOf(A.p).length * 1000, 'Chaos Origin'); }
      }]
    },
    /* 「Take on Two」Winter Soldier */
    'EB01-009': {
      trig: [{
        id: 'won', zone: 'BATTLE', optional: true, label: 'Take on Two',
        text: 'Retreat this card and 1 opponent Character with Lv3 or lower in BATTLE?',
        when: wonSelf,
        can: A => oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv3 or lower in BATTLE: it Retreats', from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          A.retreat(A.self, 'Take on Two');
          t.forEach(i => A.retreat(i, 'Take on Two'));
        }
      }]
    },
    /* 「Echo of Fate」Spider-Man (EB01-014) — teks cetak EB01-014 = SP01-065 (dicek pemilik & gambar, K-36, riwayat #43). */
    'EB01-014': {
      unique: true,
      trig: [{
        id: 'att', zone: 'FIELD', label: 'Echo of Fate',
        when: (e, self) => e.k === 'ATTACHED' && e.c === self,
        can: A => A.ret(A.p).concat(A.voidOf(A.p)).some(i => isWeb(A, i)),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your [Web] Characters in RETREAT or VOID to put into your HAND', from: A.ret(A.p).concat(A.voidOf(A.p)).filter(i => isWeb(A, i)), prefer: 'high' });
          t.forEach(i => A.toHand(i, 'Echo of Fate'));
        }
      }],
      acti: [{
        id: 'echo', zone: 'HAND', label: 'Prune 5 [Web] Characters in RETREAT: place this card into BATTLE and retreat 1 opponent Character',
        can: A => A.emptySlots(A.p).length > 0 && A.ret(A.p).filter(i => isWeb(A, i)).length >= 5 && A.canPlace(A.self, A.p),
        run: A => {
          const c = A.ask('c', { text: 'Choose 5 [Web] Characters in your RETREAT to Prune', from: A.ret(A.p).filter(i => isWeb(A, i)), min: 5, max: 5 });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, A.emptySlots(A.p)));
          const t = A.ask('t', { text: 'Choose 1 opponent Character in the field: it Retreats', from: oppChars(A), prefer: 'high' });
          let n = 0; c.forEach(i => { if (A.prune(i, 'Echo of Fate')) n++; });
          if (n === 5 && to && A.place(A.self, to, 'Echo of Fate')) t.forEach(i => A.retreat(i, 'Echo of Fate'));
        }
      }]
    },

    /* ============================ TB01 ============================ */
    /* 「Lord of Battleworld」Doctor Doom — "cards with Lv2 or below in the field": kartu terbuka, termasuk kartu
       terpasang; kartu tertutup tidak punya Lv (CR 301.21.e), RS-049. */
    'TB01-001': {
      unique: true,
      counter: true,
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Lord of Battleworld',
        text: "Prune 1 of your opponent's cards with Lv2 or lower in the field?",
        when: calledSelf,
        can: A => oppFieldCards(A).some(i => A.lv(i) <= 2),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's cards with Lv2 or lower in the field to Prune", from: oppFieldCards(A).filter(i => A.lv(i) <= 2), prefer: 'high' });
          t.forEach(i => A.prune(i, 'Lord of Battleworld'));
        }
      }]
    }
  };

  // Cetak ulang dengan teks Inggris sama → resolver yang sama (dicek 6 Nov 2026, riwayat #42).
  const REPRINT = { 'EB01-010': 'BP01-016', 'EB01-011': 'SD02-004', 'EB01-012': 'BP01-066', 'EB01-013': 'BP01-005' };
  Object.keys(REPRINT).forEach(k => { const src = (BP && BP[REPRINT[k]]) || (SD && SD[REPRINT[k]]); if (src) DEFS[k] = src; });
  // SP01-065 dicetak dengan teks yang sama dengan EB01-014 (K-36). e_en SP01-065 di cards.js sudah diperbaiki (riwayat #44).
  DEFS['SP01-065'] = DEFS['EB01-014'];

  S.registerCards(DEFS);
  if (isNode) module.exports = DEFS;
  else root.MHRCardDefsS4 = DEFS;
})(typeof window !== 'undefined' ? window : this);
