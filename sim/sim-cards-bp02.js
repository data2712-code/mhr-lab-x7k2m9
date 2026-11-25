/* ===================================================================
   MHR BATTLE SIM — RESOLVER BP02 Doomsday (sim-cards-bp02.js)      v0.14 · riwayat #133 (cicilan 1)
   ===================================================================
   STATUS: DISIMPAN. BP02 ada di HIDDEN_SETS (sim.js), jadi kartu-kartu ini belum dimuat di Battle Sim. Berkas ini
   dicicil sampai semua kartu BP02 punya efek, lalu set dibuka (keputusan pemilik 24 Nov 2026; rilis Indonesia 16 Des 2026).
   Dibuat dari TEKS INGGRIS (e_en) di cards.js situs: teks Inggris resmi bila sudah ada (fan:1), selain itu terjemahan
   tidak resmi spoiler China (fan:2: BP02-008…010, 018…020, 084…088). Teks fan:2 bisa berubah saat teks resmi terbit —
   cek ulang resolvernya bila cards.js berubah.
   Cicilan 1 (24 Nov 2026) — 13 kartu:
     BP02-007 Ultron, 019 Sentinel, 030 H.E.R.B.I.E., 036 Doombot, 037 New Black Panther, 040 M'Baku, 065 Cyclops,
     066 Gambit, 067 X-23, 068 Mystique, 088 Iceman, 098 Captain Marvel, 100 Agatha Harkness.
   Bacaan yang dipakai (belum ruling resmi, tandai bila pemilik memutuskan lain):
     - "Weakness" lawan (X-23) = area BATTLE lawan yang kosong.
     - "If you do" (Gambit "top 2 cards"): hanya bisa diaktifkan bila 2 kartu bisa ditaruh (Deck ≥ 2, BASE muat 2).
     - Efek AUTO kartu terpasang (Ultron, H.E.R.B.I.E.) berlaku untuk Karakter yang ditempeli selama kartu itu di FIELD.
   Format sama dengan sim-cards-t6.js.
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;

  const traits = (A, i) => A.trait(i).split('/').map(x => x.trim());
  const hasTrait = (A, i, t) => traits(A, i).includes(t);
  const charName = (A, i) => A.name(i).replace(/^「[^」]*」\s*/, '');
  const nameHas = (A, i, n) => charName(A, i).includes(n);
  const ev = A => (A.job && A.job.ev) || {};
  const oppBattle = A => A.battleChars(A.opp(A.p));
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const attackSelf = (e, self) => e.k === 'ATTACK' && e.a === self;
  const isMachine = (A, i) => hasTrait(A, i, 'Machine');
  const isHuman = (A, i) => hasTrait(A, i, 'Human');
  const isFF = (A, i) => hasTrait(A, i, 'Fantastic Four');
  const isWakanda = (A, i) => hasTrait(A, i, 'Wakanda');
  const slotOf = (A, i) => A.slot(i);

  const DEFS = {
    /* ============================ MERAH ============================ */
    /* 「Overload Processor」Ultron — UNIQUE; terpasang: Karakter yang ditempeli Power+X000 (X = Karakter 【Ultron】 Anda di BATTLE). */
    'BP02-007': {
      unique: true,
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => {
        if (A.host(src) !== tgt) return 0;
        return 1000 * A.battleChars(A.ctrl(src)).filter(i => nameHas(A, i, 'Ultron')).length;
      } }],
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Attach this card to 1 of your [Machine] Characters on the FIELD',
        can: A => A.chars(A.p).some(i => isMachine(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your [Machine] Characters on the FIELD to attach this card to', from: A.chars(A.p).filter(i => isMachine(A, i)), prefer: 'high' });
          if (h.length) A.attach(A.self, h[0]);
        }
      }]
    },

    /* ============================ KUNING ============================ */
    /* 「Power Sharing」Sentinel — AUTO【BATTLE】: Karakter Lv4+ 【Machine】 Anda di BATTLE R+X (X = jumlah Karakter Anda di BATTLE). */
    'BP02-019': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => {
        const p = A.ctrl(src);
        if (A.ctrl(tgt) !== p || slotOf(A, tgt) == null || A.isFd(tgt) || !isMachine(A, tgt) || A.lv(tgt) < 4) return 0;
        return A.battleChars(p).length;
      } }]
    },

    /* ============================ BIRU ============================ */
    /* 「Fantastic Bot」H.E.R.B.I.E. — terpasang: Lv+4 untuk yang ditempeli; COUNTER·ACTI: perlihatkan 1 kartu HAND, bila
       【Fantastic Four】 pindahkan tempelan kartu ini ke 1 Karakter Anda di FIELD. */
    'BP02-030': {
      auto: [{ stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => (A.host(src) === tgt ? 4 : 0) }],
      acti: [{
        id: 'move', zone: 'FIELD', counter: true, once: true, label: 'Show 1 card in your HAND: if it is [Fantastic Four], attach this card to 1 of your Characters',
        can: A => A.hand(A.p).length > 0 && A.chars(A.p).some(i => i !== A.self && i !== A.host(A.self)),
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 card in your HAND to show', from: A.hand(A.p), prefer: 'high' });
          const ok = s.length && isFF(A, s[0]);
          const h = ok ? A.ask('h', { text: 'Choose 1 of your Characters on the FIELD to attach H.E.R.B.I.E. to', from: A.chars(A.p).filter(i => i !== A.self && i !== A.host(A.self)), prefer: 'high' }) : [];
          if (!s.length) return;
          A.reveal(s[0]);
          if (!ok) { A.log('Fantastic Bot: the shown card is not [Fantastic Four], so nothing else happens.'); return; }
          if (h.length) A.attach(A.self, h[0]);
        }
      }]
    },

    /* ============================ HIJAU ============================ */
    /* 「Cluster Burst」Doombot */
    'BP02-036': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Cluster Burst',
        text: "Place the top card of your Deck face-down into your BASE (1 opponent Character in BATTLE gets Power-2000 this turn)?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.p) > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-2000)", from: oppBattle(A), prefer: 'high' });
          const got = A.setTop(A.p, 1, 'Cluster Burst');
          if (got.length) t.forEach(i => { if (A.loc(i)) A.mod(i, 'p', -2000, 'Cluster Burst'); });
        }
      }]
    },
    /* 「Ancestral Totem」New Black Panther — AUTO【WING】 FRONT Anda +1000; AUTO【BACK】 semua WING Anda +500. */
    'BP02-037': {
      auto: [
        { stat: 'p', zone: 'WING', value: (A, src, tgt) => (A.ctrl(tgt) === A.ctrl(src) && slotOf(A, tgt) === 'F' && !A.isFd(tgt) ? 1000 : 0) },
        { stat: 'p', zone: 'BACK', value: (A, src, tgt) => (A.ctrl(tgt) === A.ctrl(src) && (slotOf(A, tgt) === 'W1' || slotOf(A, tgt) === 'W2') && !A.isFd(tgt) ? 500 : 0) }
      ]
    },
    /* 「Totemic Possession」M'Baku */
    'BP02-040': {
      acti: [{
        id: 'attach', zone: 'FIELD', once: true, label: 'Attach 1 [Wakanda] Character from your HAND to 1 of your Characters (it gets Power+1000)',
        can: A => A.hand(A.p).some(i => isWakanda(A, i)) && A.chars(A.p).length > 0,
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Wakanda] Character in your HAND to attach', from: A.hand(A.p).filter(i => isWakanda(A, i)), prefer: 'low' });
          const h = A.ask('h', { text: 'Choose 1 of your Characters on the FIELD (gets Power+1000 this turn)', from: A.chars(A.p), prefer: 'high' });
          if (!c.length || !h.length) return;
          A.attach(c[0], h[0]);
          if (A.loc(h[0])) A.mod(h[0], 'p', 1000, 'Totemic Possession');
        }
      }]
    },

    /* ============================ ORANGE ============================ */
    /* 「Barrier Annihilation」Cyclops */
    'BP02-065': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Barrier Annihilation',
        text: "Discard the top card of your Deck to retreat 1 opponent Character with Lv4 or lower and R0 in BATTLE?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv4-or-lower R0 Characters in BATTLE to retreat", from: oppBattle(A).filter(i => A.lv(i) <= 4 && A.r(i) === 0), prefer: 'high' });
          const got = A.mill(A.p, 1, 'Barrier Annihilation');
          if (got.length) t.forEach(i => { if (A.loc(i)) A.retreat(i, 'Barrier Annihilation'); });
        }
      }]
    },
    /* 「Sleight of Hand」Gambit */
    'BP02-066': {
      acti: [{
        id: 'set', zone: 'FIELD', once: true, label: 'Place the top 2 cards of your Deck face-down into your BASE, then return this card to your HAND',
        can: A => A.deck(A.p).length >= 2 && A.baseRoom(A.p) >= 2,
        run: A => {
          const got = A.setTop(A.p, 2, 'Sleight of Hand');
          if (got.length === 2 && A.loc(A.self)) A.toHand(A.self, 'Sleight of Hand');
        }
      }]
    },
    /* 「Guerrilla Strike」X-23 — UNIQUE, DOUBLE ATTACK; Power+2000 bila lawan punya Weakness (area BATTLE kosong). */
    'BP02-067': {
      unique: true, double: true,
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => (tgt === src && A.emptySlots(A.opp(A.ctrl(src))).length > 0 ? 2000 : 0) }]
    },
    /* 「Combat Mimicry」Mystique */
    'BP02-068': {
      trig: [{
        id: 'atk', zone: 'BATTLE', optional: true, label: 'Combat Mimicry',
        text: 'Discard 1 Lv3-or-lower Character from your HAND (this card gets Power+X this turn, X = its Power)?',
        when: attackSelf,
        can: A => A.hand(A.p).some(i => A.origLv(i) <= 3),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 Lv3-or-lower Character in your HAND to discard', from: A.hand(A.p).filter(i => A.origLv(i) <= 3), prefer: 'high' });
          if (!d.length) return;
          const X = A.origP(d[0]) || 0;
          if (A.discard(d[0], 'Combat Mimicry') && A.loc(A.self) && X) A.mod(A.self, 'p', X, 'Combat Mimicry');
        }
      }]
    },

    /* ============================ PURPLE ============================ */
    /* BP02-084..088: 5 kartu X-Men terjemahan penggemar disembunyikan di situs v7.60 (nomor resmi belum diketahui; 084 = Storm,
       086 = Jean Grey resmi). Resolver 「Absolute Zero」Iceman (dulu 'BP02-088') ada di riwayat git (#133); pasang lagi dengan nomor resminya. */
    /* 「Flight in Space」Captain Marvel */
    'BP02-098': {
      trig: [{
        id: 'atk', zone: 'BATTLE', once: true, optional: true, label: 'Flight in Space',
        text: "Prune 1 Character in your RETREAT (1 opponent Character in BATTLE gets Power-X this turn, X = this card's Power)?",
        when: attackSelf,
        can: A => A.ret(A.p).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const pr = A.ask('pr', { text: 'Choose 1 Character in your RETREAT to Prune', from: A.ret(A.p), prefer: 'low' });
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-X)", from: oppBattle(A), prefer: 'high' });
          if (!pr.length) return;
          const X = A.loc(A.self) ? A.pw(A.self) : 0;
          if (A.prune(pr[0], 'Flight in Space') !== false) t.forEach(i => { if (A.loc(i) && X) A.mod(i, 'p', -X, 'Flight in Space'); });
        }
      }]
    },
    /* 「Wail of Death」Agatha Harkness — AUTO【BACK】: BACK lawan Power-500 per Karakter 【Human】 di RETREAT Anda. */
    'BP02-100': {
      auto: [{ stat: 'p', zone: 'BACK', value: (A, src, tgt) => {
        if (A.ctrl(tgt) !== A.opp(A.ctrl(src)) || slotOf(A, tgt) !== 'B' || A.isFd(tgt)) return 0;
        return -500 * A.ret(A.ctrl(src)).filter(i => isHuman(A, i)).length;
      } }]
    }
  };

  S.registerCards(DEFS);
  if (isNode) module.exports = DEFS;
  else root.MHRCardDefsBP02 = DEFS;
})(typeof window !== 'undefined' ? window : this);
