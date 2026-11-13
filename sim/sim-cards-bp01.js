/* ===================================================================
   MHR BATTLE SIM — RESOLVER BP01 The Avengers (sim-cards-bp01.js)      Tahap 3 · v0.10
   ===================================================================
   Dibuat dari TEKS INGGRIS (e_en) di cards.js, format sama dengan sim-cards.js.
   - 17 kartu BP01 adalah cetak ulang kartu SD01–SD04 dengan teks Inggris identik: resolvernya dipakai ulang.
   - Tahap 3a (riwayat #34): MERAH BP01-001…030 dan KUNING BP01-031…060.
   - Tahap 3b (riwayat #35): BIRU BP01-061…090 dan HIJAU BP01-091…120.
   Bacaan yang belum pasti ditandai "RS-04x" (ruling-simulator.md, status sementara) dan ditanyakan sebagai K-xx.
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;
  const SD = isNode ? require('./sim-cards.js') : root.MHRCardDefs;

  const RED = 'Merah', YELLOW = 'Kuning';
  const traits = (A, i) => A.trait(i).split('/').map(x => x.trim());
  const hasTrait = (A, i, t) => traits(A, i).includes(t);
  const isHuman = (A, i) => hasTrait(A, i, 'Human');
  const isMachine = (A, i) => hasTrait(A, i, 'Machine');
  const isAvengers = (A, i) => hasTrait(A, i, 'Avengers');
  const charName = (A, i) => A.name(i).replace(/^「[^」]*」\s*/, '');            // "「Antimatter」Iron Man" → "Iron Man"
  const nameHas = (A, i, n) => charName(A, i).includes(n);
  const ev = A => (A.job && A.job.ev) || {};
  const calledSelf = (e, self) => e.k === 'CALLED' && e.c === self;
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const slotOpts = (A, spots) => spots.map(v => ({ v, label: A.spotLabel(v) }));
  const oppBattle = A => A.battleChars(A.opp(A.p));
  const oppChars = A => A.chars(A.opp(A.p));
  // "show the top 3 cards of your deck, add 1 of them with X to your HAND and discard the rest"
  function lookAdd(A, test, label) {
    const top = A.deck(A.p).slice(0, 3);
    const c = A.ask('c', { text: 'Top 3 cards of your Deck: choose 1 to add to your HAND', from: top.filter(i => test(i)), reveal: true, prefer: 'high' });
    top.forEach(i => A.reveal(i));
    c.forEach(i => A.toHand(i, label));
    const rest = top.length - c.length;
    if (rest > 0) A.mill(A.p, rest, label);
  }

  const DEFS = {
    /* ============================ MERAH ============================ */
    /* 「Antimatter」Iron Man — X = jumlah kartu yang di-retreat sebagai biaya CALL kartu ini (RS-030). */
    'BP01-001': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Antimatter', when: calledSelf,
        can: A => oppChars(A).some(i => A.lv(i) <= (ev(A).cost || 0)),
        run: A => {
          const X = ev(A).cost || 0;
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv' + X + ' or lower in the field to Prune', from: oppChars(A).filter(i => A.lv(i) <= X), prefer: 'high' });
          t.forEach(i => A.prune(i, 'Antimatter'));
        }
      }]
    },
    /* 「Covert Ops」Black Widow */
    'BP01-002': {
      acti: [{
        id: 'ops', zone: 'HAND', counter: true, label: 'Discard this card: 1 opponent Character in BATTLE gets Power-2000',
        can: () => true,                                             // RS-022: membuang tetap boleh walau tanpa target
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-2000 this turn)', from: oppBattle(A), prefer: 'high' });
          A.discard(A.self, 'Covert Ops');
          t.forEach(i => A.mod(i, 'p', -2000, 'Covert Ops'));
        }
      }]
    },
    /* 「Thunder Ally」Thor */
    'BP01-003': {
      trig: [{
        id: 'end', zone: 'WING', label: 'Thunder Ally',
        when: (e, self, A) => e.k === 'TURN_END' && e.p === A.p && !A.attackedThisTurn(self),
        can: A => oppBattle(A).length > 0,
        run: A => {
          const X = A.pw(A.self);
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-' + X + ' this turn)', from: oppBattle(A), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -X, 'Thunder Ally'));
        }
      }]
    },
    /* 「Never Back Down」Hulk */
    'BP01-004': {
      auto: [
        { stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => tgt === src && A.chars(A.ctrl(src)).every(i => A.color(i) === RED) ? A.battleChars(A.opp(A.ctrl(src))).length : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src && A.chars(A.ctrl(src)).every(i => A.color(i) === RED) ? A.battleChars(A.opp(A.ctrl(src))).length * 1000 : 0 }
      ]
    },
    /* 「Red Room Experiment Subject」Black Widow — Trigger Hand (Siaga) */
    'BP01-005': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Red Room Experiment Subject',
        text: 'Discard this card from your HAND: 1 of your red Characters in BATTLE gets Power+3000 this turn?',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.p && A.color(e.a) === RED,
        can: A => A.zone(A.self) === 'HAND',
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your red Characters in BATTLE (Power+3000 this turn)', from: A.battleChars(A.p).filter(i => A.color(i) === RED), prefer: 'high' });
          A.discard(A.self, 'Red Room Experiment Subject');
          t.forEach(i => A.mod(i, 'p', 3000, 'Red Room Experiment Subject'));
        }
      }]
    },
    /* 「Silent Hunter」Black Panther */
    'BP01-006': {
      auto: [
        { stat: 'r', zone: 'FIELD', value: (A, src, tgt) => tgt === src && A.handCount(A.ctrl(src)) % 2 === 1 ? 2 : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src && A.handCount(A.ctrl(src)) % 2 === 0 ? 5500 : 0 }
      ]
    },
    /* 「Void Reforge」Vision — TRIG【VOID】 */
    'BP01-007': {
      trig: [{
        id: 'void', zone: 'VOID', optional: true, label: 'Void Reforge',
        text: "Discard 2 cards from your HAND to place this card from VOID onto your FIELD (and your opponent's Character in FRONT gets Power-1000)?",
        when: (e, self) => e.k === 'PRUNED' && e.c === self && e.from === 'ret',
        can: A => A.hand(A.p).length >= 2 && A.canPlace(A.self, A.p),
        run: A => {
          const d = A.ask('d', { text: 'Choose 2 cards in your HAND to discard', from: A.hand(A.p), min: 2, max: 2 });
          const to = A.pick('to', 'Choose where to place 「Void Reforge」Vision', slotOpts(A, A.spots(A.p)));
          d.forEach(i => A.discard(i, 'Void Reforge'));
          if (to && A.place(A.self, to, 'Void Reforge')) { const f = A.at(A.opp(A.p), 'F'); if (f) A.mod(f, 'p', -1000, 'Void Reforge'); }
        }
      }]
    },
    /* 「Pulse Uninstall」War Machine */
    'BP01-008': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Pulse Uninstall',
        text: 'Prune ALL cards attached to Characters on both FIELDs?',
        when: enterSelf,
        can: A => A.allChars().some(i => A.attached(i).length),
        run: A => { A.allChars().forEach(i => A.attached(i).forEach(a => A.prune(a, 'Pulse Uninstall'))); }
      }]
    },
    /* 「Pulse Assembler」Iron Man */
    'BP01-009': {
      acti: [{
        id: 'pulse', zone: 'BATTLE', once: true, label: 'Prune 1 red Lv5+ Character from RETREAT: 1 opponent Character in BATTLE gets Power-1000',
        can: A => A.base(A.p).length === 0 && A.ret(A.p).some(i => A.color(i) === RED && A.lv(i) >= 5),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 red Lv5+ Character in your RETREAT to Prune', from: A.ret(A.p).filter(i => A.color(i) === RED && A.lv(i) >= 5) });
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-1000 this turn)', from: oppBattle(A), prefer: 'high' });
          A.prune(c[0], 'Pulse Assembler');
          t.forEach(i => A.mod(i, 'p', -1000, 'Pulse Assembler'));
        }
      }]
    },
    /* 「Evolution Protocol」Ultron */
    'BP01-010': {
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Attach this card to 1 of your Lv4+ [Machine] Characters',
        can: A => A.chars(A.p).some(i => A.lv(i) >= 4 && isMachine(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Lv4+ [Machine] Characters to attach this card to', from: A.chars(A.p).filter(i => A.lv(i) >= 4 && isMachine(A, i)), prefer: 'high' });
          A.attach(A.self, h[0]);
        }
      }, {
        id: 'show', zone: 'BACK', once: true, label: 'Show 1 face-down card in BASE: a Lv1 [Machine] returns to HAND',
        can: A => A.set(A.p).length > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your face-down cards in BASE to show', from: A.set(A.p) });
          A.reveal(s[0]);
          if (A.plv(s[0]) === 1 && isMachine(A, s[0])) A.setToHand(s[0], 'Evolution Protocol');
          else A.log('Evolution Protocol: the shown card is not a Lv1 [Machine], so it stays face-down.');
        }
      }]
    },
    /* 「Thunder Speed」Thor — kesempatan kedua hanya untuk menyerang Karakter (RS-026). */
    'BP01-011': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Thunder Speed', when: calledSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const got = A.draw(A.p, 1);
          if (got.length) A.setFlag(A.self, 'dblChar', 'Thunder Speed', 'gets a second chance to attack (Characters only)');
        }
      }]
    },
    /* 「Thunder Charge」Thor */
    'BP01-012': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Thunder Charge',
        text: 'Place the top 2 cards of your Deck face-down into your BASE?',
        when: calledSelf,
        can: A => A.base(A.p).some(i => !A.isFd(i) && A.color(i) === RED) && A.baseRoom(A.p) > 0 && A.deck(A.p).length > 0,
        run: A => { A.setTop(A.p, 2, 'Thunder Charge'); }
      }]
    },
    /* 「Wakanda Forever」Black Panther */
    'BP01-013': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Wakanda Forever', when: calledSelf,
        can: A => A.baseRoom(A.opp(A.p)) > 0 && oppBattle(A).some(i => isHuman(A, i) && A.pw(i) >= 5000),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 opponent [Human] Character with Power 5000+ in BATTLE to move to your opponent's BASE", from: oppBattle(A).filter(i => isHuman(A, i) && A.pw(i) >= 5000), prefer: 'high' });
          t.forEach(i => { if (A.bbm(i, 'BASE', 'Wakanda Forever')) A.cover(i, 'Wakanda Forever'); });
        }
      }]
    },
    /* 「Defense Program」Ultron */
    'BP01-014': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Defense Program',
        text: 'Retreat 1 opponent Character with Lv3 or lower in BATTLE?',
        when: calledSelf,
        can: A => A.chars(A.p).some(i => i !== A.self && nameHas(A, i, 'Ultron')) && oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv3 or lower in BATTLE to Retreat', from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          t.forEach(i => A.retreat(i, 'Defense Program'));
        }
      }]
    },
    /* 「Disintegration Ray」Vision */
    'BP01-015': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Disintegration Ray',
        text: 'Prune 1 opponent Character with Power 4000 or lower in BATTLE?',
        when: calledSelf,
        can: A => oppBattle(A).some(i => A.pw(i) <= 4000),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Power 4000 or lower in BATTLE to Prune', from: oppBattle(A).filter(i => A.pw(i) <= 4000), prefer: 'high' });
          t.forEach(i => A.prune(i, 'Disintegration Ray'));
        }
      }]
    },
    /* 「Dimension Piercer」Iron Man */
    'BP01-016': {
      trig: [{
        id: 'big', zone: 'BATTLE', once: true, optional: true, label: 'Dimension Piercer',
        text: "Move 1 opponent Character with Lv3 or lower from BATTLE to your opponent's BASE?",
        when: (e, self, A) => e.k === 'CALLED' && A.ctrl(e.c) === A.p && A.lv(e.c) >= 4,
        can: A => A.baseRoom(A.opp(A.p)) > 0 && oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 opponent Character with Lv3 or lower in BATTLE to move to your opponent's BASE", from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          t.forEach(i => A.bbm(i, 'BASE', 'Dimension Piercer'));
        }
      }]
    },
    /* 「Avenge Wrath」Hulk */
    'BP01-017': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Avenge Wrath',
        text: "Prune 1 Character in your opponent's RETREAT (this card gets Power+1000 this turn)?",
        when: calledSelf,
        can: A => A.ret(A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 Character in your opponent's RETREAT to Prune", from: A.ret(A.opp(A.p)), reveal: true, prefer: 'high' });
          t.forEach(i => A.prune(i, 'Avenge Wrath'));
          if (A.loc(A.self)) A.mod(A.self, 'p', 1000, 'Avenge Wrath');
        }
      }]
    },
    /* 「Vibranium Mining」Black Panther */
    'BP01-019': {
      trig: [{
        id: 'atk', zone: 'BATTLE', once: true, optional: true, label: 'Vibranium Mining',
        text: 'Discard the top card of your Deck (this card gets Power+2000 this turn)?',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => A.deck(A.p).length > 0,
        run: A => { const g = A.mill(A.p, 1, 'Vibranium Mining'); if (g.length && A.loc(A.self)) A.mod(A.self, 'p', 2000, 'Vibranium Mining'); }
      }]
    },
    /* 「Thunder Caller」Thor */
    'BP01-021': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Thunder Caller', when: calledSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => lookAdd(A, i => isHuman(A, i), 'Thunder Caller')
      }]
    },
    /* 「Top Agent」Black Widow — "【AUTO】 in their effects": teks memuat AUTO, termasuk UNIQUE & COUNTER (RS-029). */
    'BP01-022': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Top Agent',
        text: 'Retreat 1 opponent Character with Lv3 or lower that has [AUTO] in its effects?',
        when: calledSelf,
        can: A => A.chars(A.p).some(i => i !== A.self && isAvengers(A, i)) && oppChars(A).some(i => A.lv(i) <= 3 && /AUTO/.test(A.text(i))),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character (Lv3 or lower, with [AUTO]) in the field to Retreat', from: oppChars(A).filter(i => A.lv(i) <= 3 && /AUTO/.test(A.text(i))), prefer: 'high' });
          t.forEach(i => A.retreat(i, 'Top Agent'));
        }
      }]
    },
    /* 「Synchronize Targeting」War Machine — "changes to 2" (CR 301.41) */
    'BP01-024': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => A.ctrl(tgt) === A.ctrl(src) && A.slot(tgt) && nameHas(A, tgt, 'Iron Man') ? { set: 2 } : 0 }]
    },
    /* 「Combined Operations」Iron Man */
    'BP01-027': {
      auto: [{
        stat: 'p', zone: 'BATTLE',
        value: (A, src, tgt) => { const p = A.ctrl(src), w = A.wings(p); return w.length === 2 && A.origLv(w[0]) === A.origLv(w[1]) && tgt === A.at(A.opp(p), 'F') ? -1000 : 0; }
      }]
    },
    /* 「Behind Enemy Lines」Black Widow — masuk ke BASE lawan (RS-041, sementara). */
    'BP01-028': {
      acti: [{
        id: 'infiltrate', zone: 'HAND', label: "Place this card into your opponent's BASE",
        can: A => { const op = A.opp(A.p); return A.base(op).some(i => !A.isFd(i)) && A.baseRoom(op) > 0; },
        run: A => { A.placeOnto(A.self, 'BASE', A.opp(A.p), 'Behind Enemy Lines'); }
      }],
      trig: [{
        // Pengendali = pemain yang FIELD-nya ditempati kartu ini; "your opponent" (pemilik kartu) yang memilih.
        id: 'enter', zone: 'FIELD', label: 'Behind Enemy Lines', when: enterSelf,
        can: A => A.base(A.p).some(i => i !== A.self && !A.isFd(i) && A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 Character with Lv3 or lower in your opponent\'s BASE: it Retreats', from: A.base(A.p).filter(i => i !== A.self && !A.isFd(i) && A.lv(i) <= 3), p: A.opp(A.p), prefer: 'high' });
          t.forEach(i => A.retreat(i, 'Behind Enemy Lines'));
        }
      }]
    },
    /* 「Cover Operations」War Machine */
    'BP01-029': {
      auto: [{
        stat: 'r', zone: 'FIELD',
        value: (A, src, tgt) => { const p = A.ctrl(src), w = A.wings(p); return w.length === 2 && A.origLv(w[0]) === A.origLv(w[1]) && w.includes(tgt) ? { set: 2 } : 0; }
      }]
    },
    /* 「Leverage Up」Hulk Buster */
    'BP01-030': {
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Attach this card to 1 of your red Lv1 Characters (its Lv changes to 6)',
        can: A => A.chars(A.p).some(i => A.color(i) === RED && A.lv(i) === 1),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your red Lv1 Characters to attach this card to', from: A.chars(A.p).filter(i => A.color(i) === RED && A.lv(i) === 1) });
          A.attach(A.self, h[0]);
        }
      }],
      auto: [{ stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? { set: 6 } : 0 }]
    },

    /* ============================ KUNING ============================ */
    /* 「Genius Burden」Ultron */
    'BP01-031': {
      auto: [
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => A.ctrl(tgt) === A.ctrl(src) && A.wings(A.ctrl(src)).includes(tgt) && isMachine(A, tgt) ? 1000 : 0 },
        { stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => A.ctrl(tgt) === A.ctrl(src) && A.wings(A.ctrl(src)).includes(tgt) && isMachine(A, tgt) && nameHas(A, tgt, 'Ultron') ? 1 : 0 }
      ]
    },
    /* 「Multiple Hits」Black Panther — Trigger Hand (Siaga) */
    'BP01-032': {
      unique: true,
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Multiple Hits',
        text: "Place this card from your HAND into your BATTLE (1 opponent Character in BATTLE gets Power-1000 this turn)?",
        when: (e, self, A) => e.k === 'BOTH_LOSE' && [e.a, e.d].some(i => A.owner(i) === A.p && A.color(i) === YELLOW),
        can: A => A.zone(A.self) === 'HAND' && A.emptySlots(A.p).length > 0 && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose a BATTLE area for 「Multiple Hits」Black Panther', slotOpts(A, A.emptySlots(A.p)));
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-1000 this turn)', from: oppBattle(A), prefer: 'high' });
          if (to && A.place(A.self, to, 'Multiple Hits')) t.forEach(i => { if (A.loc(i)) A.mod(i, 'p', -1000, 'Multiple Hits'); });
        }
      }]
    },
    /* 「Covering Fire」War Machine */
    'BP01-033': {
      trig: [{
        id: 'atk', zone: 'BACK', label: 'Covering Fire',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.p && isAvengers(A, e.a),
        can: A => oppBattle(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-500 this turn)', from: oppBattle(A), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -500, 'Covering Fire'));
        }
      }]
    },
    /* 「Genius Burden」Iron Man */
    'BP01-034': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Genius Burden', when: calledSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => lookAdd(A, i => isMachine(A, i), 'Genius Burden')
      }]
    },
    /* 「MK44-The Commander」Hulk Buster — "BATTLE Move" = antar area BATTLE (CR 301.23, keputusan pemilik riwayat #27). */
    'BP01-035': {
      acti: [{
        id: 'attach', zone: 'FIELD', counter: true, once: true, label: 'Attach to a Character (retreat its other attached cards)',
        can: A => A.chars(A.p).some(i => i !== A.self && i !== A.host(A.self)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Characters to attach this card to', from: A.chars(A.p).filter(i => i !== A.self && i !== A.host(A.self)), prefer: 'high' });
          const others = A.attached(h[0]).filter(i => i !== A.self);
          A.attach(A.self, h[0]);
          others.forEach(i => A.retreat(i, 'MK44-The Commander'));
        }
      }],
      trig: [{
        id: 'move', zone: 'FIELD', optional: true, label: 'MK44-The Commander',
        text: 'The Character this card attached to may take BATTLE MOVE once (to an empty BATTLE area)?',
        when: (e, self, A) => e.k === 'ATTACHED' && e.c === self && !!A.slot(e.host),
        can: A => { const h = ev(A).host; return !!A.slot(h) && A.emptySlots(A.ctrl(h)).length > 0; },
        run: A => {
          const h = ev(A).host;
          const to = A.pick('to', 'Choose an empty BATTLE area for ' + A.name(h), slotOpts(A, A.emptySlots(A.ctrl(h))));
          if (to) A.battleMove(h, to, 'MK44-The Commander');
        }
      }]
    },
    /* 「You Are Not Alone」Hulk */
    'BP01-036': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.battleChars(A.ctrl(src)).filter(i => i !== src && A.color(i) === YELLOW).length * 1000 : 0 }]
    },
    /* 「Ultron Army」Ultron */
    'BP01-037': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Ultron Army',
        text: 'Place 1 of your Lv2-or-lower "Ultron" Characters from RETREAT onto your FIELD?',
        when: calledSelf,
        can: A => A.spots(A.p).length > 0 && A.ret(A.p).some(i => A.lv(i) <= 2 && nameHas(A, i, 'Ultron') && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Lv2-or-lower "Ultron" Character in your RETREAT', from: A.ret(A.p).filter(i => A.lv(i) <= 2 && nameHas(A, i, 'Ultron') && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Ultron Army');
        }
      }]
    },
    /* 「Buzzer Beater」Wasp */
    'BP01-038': {
      trig: [{
        id: 'start', zone: 'BATTLE', optional: true, label: 'Buzzer Beater',
        text: 'Swap this card with your yellow Character in FRONT (this card gets Power+2500 this turn)?',
        when: (e, self, A) => e.k === 'TURN_START' && e.p === A.opp(A.p),
        can: A => { const f = A.at(A.p, 'F'); return !!f && f !== A.self && !A.isFd(f) && A.color(f) === YELLOW && !nameHas(A, f, 'Wasp'); },
        run: A => { const f = A.at(A.p, 'F'); if (A.swap(A.self, f, 'Buzzer Beater')) A.mod(A.self, 'p', 2500, 'Buzzer Beater'); }
      }]
    },
    /* 「Stray Current」Thor */
    'BP01-039': {
      acti: [{
        id: 'place', zone: 'HAND', label: 'Place this card from HAND into your BATTLE',
        can: A => A.battleChars(A.p).filter(i => A.color(i) === YELLOW).length >= 3 && A.emptySlots(A.p).length > 0 && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose a BATTLE area for 「Stray Current」Thor', slotOpts(A, A.emptySlots(A.p)));
          if (to) A.place(A.self, to, 'Stray Current');
        }
      }]
    },
    /* 「Death And Rebirth」Ultron */
    'BP01-040': {
      acti: [{
        id: 'rebirth', zone: 'HAND', label: 'Prune 3 differently named [Machine] Characters from RETREAT: place this card onto your FIELD',
        can: A => new Set(A.ret(A.p).filter(i => isMachine(A, i)).map(i => A.name(i))).size >= 3 && A.canPlace(A.self, A.p),
        run: A => {
          const pool = A.ret(A.p).filter(i => isMachine(A, i));
          const c = A.ask('c', { text: 'Choose 3 [Machine] Characters with different names in your RETREAT to Prune', from: pool, min: 3, max: 3, prefer: 'low' });
          const to = A.pick('to', 'Choose where to place 「Death And Rebirth」Ultron', slotOpts(A, A.spots(A.p)));
          if (new Set(c.map(i => A.name(i))).size < 3) { A.log('Death And Rebirth: the 3 Characters must have different names; nothing happens.'); return; }
          c.forEach(i => A.prune(i, 'Death And Rebirth'));
          if (to) A.place(A.self, to, 'Death And Rebirth');
        }
      }]
    },
    /* 「Shadow Dance」Black Panther */
    'BP01-041': {
      trig: [{
        id: 'weak', zone: 'BATTLE', label: 'Shadow Dance',
        when: (e, self) => e.k === 'WEAK_HIT' && e.a === self,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const got = A.draw(A.p, 1);
          if (!got.length) return;
          // pilihan dibuang diajukan sesudah draw: job dilanjutkan sebagai langkah kedua
          A.job.step2 = true;
        },
        after: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          d.forEach(i => A.discard(i, 'Shadow Dance'));
        }
      }]
    },
    /* 「Red Room Legacy」Black Widow */
    'BP01-042': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Red Room Legacy', when: calledSelf,
        can: A => A.emptySlots(A.p).length > 0 && A.ret(A.p).some(i => A.color(i) === YELLOW && A.lv(i) <= 2 && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 yellow Lv2-or-lower Character in your RETREAT to place into your BATTLE', from: A.ret(A.p).filter(i => A.color(i) === YELLOW && A.lv(i) <= 2 && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.emptySlots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Red Room Legacy');
        }
      }]
    },
    /* 「Reinstall」Vision */
    'BP01-043': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Reinstall', when: calledSelf,
        can: A => A.chars(A.p).some(i => nameHas(A, i, 'Ultron')),
        run: A => {
          const r = A.ask('r', { text: 'Choose 1 of your "Ultron" Characters in the field to Retreat', from: A.chars(A.p).filter(i => nameHas(A, i, 'Ultron')) });
          if (!r.length) return;
          A.retreat(r[0], 'Reinstall');
          const got = A.draw(A.p, 1);
          if (got.length) A.job.step2 = true;
        },
        after: A => {
          const pool = A.hand(A.p).filter(i => A.lv(i) <= 3 && isMachine(A, i) && A.canPlace(i, A.p));
          if (!pool.length || !A.spots(A.p).length) return;
          if (!A.yes('y', 'Reinstall: place 1 of your Lv3-or-lower [Machine] Characters from HAND onto your FIELD?')) return;
          const c = A.ask('c', { text: 'Choose 1 Lv3-or-lower [Machine] Character in your HAND', from: pool, prefer: 'high' });
          const to = A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Reinstall');
        }
      }]
    },
    /* 「Break Cover」War Machine */
    'BP01-044': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Break Cover',
        text: 'Retreat this card (then you may swap 1 of your Lv4-or-lower "Iron Man" Characters with your Character in FRONT)?',
        when: (e, self, A) => e.k === 'ENTER' && A.tp === A.p && A.ctrl(e.c) === A.opp(A.p),
        can: () => true,
        run: A => {
          const f = A.at(A.p, 'F');
          const pool = A.chars(A.p).filter(i => i !== A.self && i !== f && A.lv(i) <= 4 && nameHas(A, i, 'Iron Man'));
          const c = f && pool.length ? A.ask('c', { text: 'Swap with your FRONT Character: choose 1 Lv4-or-lower "Iron Man" Character (or none)', from: pool, min: 0, max: 1, prefer: 'high' }) : [];
          A.retreat(A.self, 'Break Cover');
          if (c.length && A.at(A.p, 'F')) A.swap(c[0], A.at(A.p, 'F'), 'Break Cover');
        }
      }]
    },
    /* 「Psycho-Projection」Vision */
    'BP01-045': {
      trig: [{
        id: 'up', zone: 'BATTLE', once: true, label: 'Psycho-Projection',
        when: (e, self) => e.k === 'STAT_UP' && e.c === self && e.dp > 0,
        can: A => A.battleChars(A.p).some(i => i !== A.self && isMachine(A, i)),
        run: A => {
          const X = ev(A).dp;
          const t = A.ask('t', { text: 'Choose 1 of your other [Machine] Characters in BATTLE (Power+' + X + ' this turn)', from: A.battleChars(A.p).filter(i => i !== A.self && isMachine(A, i)), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', X, 'Psycho-Projection'));
        }
      }]
    },
    /* 「Banner Assimilation」Hulk — AUTO【HAND】 */
    'BP01-046': {
      auto: [{ stat: 'lv', zone: 'HAND', value: (A, src, tgt) => tgt === src ? -A.chars(A.owner(src)).filter(i => isAvengers(A, i)).length : 0 }]
    },
    /* 「Central Control System」Iron Man */
    'BP01-047': {
      acti: [{
        id: 'release', zone: 'FIELD', counter: true, once: true, label: 'Move 1 attached "Hulk Buster" to your BATTLE (Power+1000 this turn)',
        can: A => A.emptySlots(A.p).length > 0 && A.chars(A.p).some(h => A.attached(h).some(i => nameHas(A, i, 'Hulk Buster'))),
        run: A => {
          const pool = [];
          A.chars(A.p).forEach(h => A.attached(h).forEach(i => { if (nameHas(A, i, 'Hulk Buster')) pool.push(i); }));
          const c = A.ask('c', { text: 'Choose 1 attached "Hulk Buster" card', from: pool });
          const to = A.pick('to', 'Choose an empty BATTLE area', slotOpts(A, A.emptySlots(A.p)));
          if (c.length && to && A.detachToBattle(c[0], to, 'Central Control System')) A.mod(c[0], 'p', 1000, 'Central Control System');
        }
      }]
    },
    /* 「Agent's Premonition」Black Widow */
    'BP01-048': {
      acti: [{
        id: 'look', zone: 'BATTLE', once: true, label: 'Look at the top 3 cards of your Deck and reorder them',
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p).slice(0, 3);
          const keep = A.ask('k', { text: 'Top 3 cards: choose the cards to put back ON TOP, in order (first = top card). The rest go to the bottom.', from: top, min: 0, max: top.length, reveal: true, prefer: 'high', p: A.p });
          const rest = top.filter(i => !keep.includes(i));
          const bot = rest.length > 1 ? A.ask('b', { text: 'Order the cards going to the BOTTOM (first chosen = higher)', from: rest, min: rest.length, max: rest.length, reveal: true }) : rest;
          A.reorderTop(A.p, keep, bot, "Agent's Premonition");
        }
      }]
    },
    /* 「Personal Grudge」Hulk — jarak ke BACK lawan menjadi 1 di giliran sendiri */
    'BP01-049': {
      dist: (A, self, slot) => slot === 'B' && A.tp === A.ctrl(self) ? 1 : null
    },
    /* 「Superconductive Charge」Thor */
    'BP01-050': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Superconductive Charge', when: calledSelf,
        can: A => oppChars(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in the field: it cannot move this turn', from: oppChars(A), prefer: 'high' });
          t.forEach(i => A.setFlag(i, 'nomove', 'Superconductive Charge', 'cannot move'));
        }
      }]
    },
    /* 「Aid Attack」Black Widow */
    'BP01-051': {
      trig: [{
        id: 'cost', zone: 'RETREAT', label: 'Aid Attack',
        when: (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field' && e.cause === 'CALL cost',
        can: A => A.chars(A.p).some(i => A.color(i) === YELLOW),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your yellow Characters in the field (Power+2000 this turn)', from: A.chars(A.p).filter(i => A.color(i) === YELLOW), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', 2000, 'Aid Attack'));
        }
      }]
    },
    /* 「Nemesis」Hulk Buster — Trigger Hand (Siaga) */
    'BP01-052': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Nemesis',
        text: 'Place this card from your HAND onto your FIELD?',
        when: (e, self, A) => e.k === 'ENTER' && A.ctrl(e.c) === A.p && A.lv(e.c) >= 4 && isMachine(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && !A.chars(A.p).some(i => nameHas(A, i, 'Hulk Buster')) && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose where to place 「Nemesis」Hulk Buster', slotOpts(A, A.spots(A.p)));
          if (to) A.place(A.self, to, 'Nemesis');
        }
      }]
    },
    /* 「Ultron-Spawn Rebuild」Ultron — "【Ultron】 in their features" dibaca sebagai NAMA (RS-042, sementara, K-25). */
    'BP01-054': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Ultron-Spawn Rebuild',
        text: 'Discard 1 [Machine] Character from your HAND to return 1 Lv4+ "Ultron" Character from RETREAT to your HAND?',
        when: calledSelf,
        can: A => A.hand(A.p).some(i => isMachine(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 [Machine] Character in your HAND to discard', from: A.hand(A.p).filter(i => isMachine(A, i)) });
          A.discard(d[0], 'Ultron-Spawn Rebuild');
          A.job.step2 = true;
        },
        after: A => {
          const c = A.ask('c', { text: 'Choose 1 Lv4+ "Ultron" Character in your RETREAT to return to your HAND', from: A.ret(A.p).filter(i => A.lv(i) >= 4 && nameHas(A, i, 'Ultron')), prefer: 'high' });
          c.forEach(i => A.toHand(i, 'Ultron-Spawn Rebuild'));
        }
      }]
    },
    /* 「Break New Ground」Wasp */
    'BP01-055': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => { if (tgt !== src) return 0; const f = A.at(A.opp(A.ctrl(src)), 'F'); return f && !A.isFd(f) ? Math.floor(A.pw(f) / 3000) : 0; } }]
    },
    /* 「Overclock Loading」Iron Man */
    'BP01-058': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src && A.battleChars(A.opp(A.ctrl(src))).reduce((s, i) => s + A.r(i), 0) >= 3 ? 3500 : 0 }]
    }
  };


  /* ============================ BIRU (Tahap 3b) ============================ */
  const BLUE = 'Biru', GREEN = 'Hijau';
  const fromFieldToRet = (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field' && !e.fd;
  const lostFight = (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field' && (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE');
  const discardedByEffect = (e, self) => e.k === 'RETREATED' && e.c === self && (e.from === 'hand' || e.from === 'deck') && e.cause === 'discard' && e.eff;
  const bbmSelf = (e, self) => e.k === 'BBMOVE' && e.c === self;
  const isFF = (A, i) => hasTrait(A, i, 'Fantastic Four');
  const handLv = (A, p, lv) => A.hand(p).filter(i => A.lv(i) === lv);
  Object.assign(DEFS, {
    /* 「Follow Shadow」New Black Panther — swap HAND ↔ BATTLE (RS-045, diubah K-44: kartu dari HAND ditempatkan) */
    'BP01-061': {
      acti: [{
        id: 'shadow', zone: 'HAND', counter: true, label: 'Retreat 2 BASE cards: swap this card with a blue Lv4+ Character in BATTLE',
        can: A => A.base(A.p).length >= 2 && A.battleChars(A.p).some(i => A.color(i) === BLUE && A.lv(i) >= 4 && A.name(i) !== A.name(A.self)),
        run: A => {
          const b = A.ask('b', { text: 'Choose 2 of your cards in BASE to Retreat', from: A.base(A.p), min: 2, max: 2 });
          const t = A.ask('t', { text: 'Choose 1 of your blue Lv4+ Characters in BATTLE (different name) to swap with this card', from: A.battleChars(A.p).filter(i => A.color(i) === BLUE && A.lv(i) >= 4 && A.name(i) !== A.name(A.self)), prefer: 'high' });
          b.forEach(i => A.retreat(i, 'Follow Shadow'));
          if (t.length && A.loc(t[0])) A.swapHand(A.self, t[0], 'Follow Shadow');
        }
      }]
    },
    /* 「Freedom Will」Captain America — kebal efek karakter Lv4- selama di BASE (RS-046) */
    'BP01-062': {
      acti: [{
        id: 'will', zone: 'FIELD', counter: true, once: true, label: 'BATTLE-BASE MOVE this card: 1 of your Characters in BATTLE gets Power+1000',
        can: A => A.bbmDests(A.self).length > 0,
        run: A => {
          const to = A.pick('to', 'Move 「Freedom Will」Captain America to', slotOpts(A, A.bbmDests(A.self)));
          if (!to || !A.bbm(A.self, to, 'Freedom Will')) return;
          A.job.step2 = true;
        },
        after: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in BATTLE (Power+1000 this turn)', from: A.battleChars(A.p), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', 1000, 'Freedom Will'));
        }
      }],
      immune: (A, self, src) => A.zone(self) === 'BASE' && !A.isFd(src) && A.lv(src) <= 4 && ['BATTLE', 'BASE', 'ATTACHED', 'HAND', 'RETREAT', 'VOID'].includes(A.zone(src))
    },
    /* 「Time Abduction」Loki — Trigger Hand (Siaga), RS-001 */
    'BP01-063': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Time Abduction',
        text: "Prune this card from your HAND to prune 1 opponent Character with Power 3500 or lower in BATTLE?",
        when: (e, self, A) => e.k === 'STAT_DOWN' && e.p === A.p,
        can: A => A.zone(A.self) === 'HAND',
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Power 3500 or lower in BATTLE to Prune', from: oppBattle(A).filter(i => A.pw(i) <= 3500), prefer: 'high' });
          A.prune(A.self, 'Time Abduction');
          t.forEach(i => A.prune(i, 'Time Abduction'));
        }
      }]
    },
    /* 「Quantum Core」Ant-Man */
    'BP01-064': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src && A.phase === 'battle' && A.battleChars(A.ctrl(src)).some(i => i !== src && A.color(i) === BLUE) ? 2500 : 0 }]
    },
    /* 「Material Reload」Falcon — BOTH LOSE juga kalah bertarung (RS-034) */
    'BP01-065': {
      trig: [{
        id: 'lost', zone: 'RETREAT', label: 'Material Reload', when: lostFight,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.p) > 0,
        run: A => { A.setTop(A.p, 2, 'Material Reload'); }
      }]
    },
    /* 「Turn The Tide」Captain America — Trigger Hand (Siaga), RS-023, RS-031, RS-034 */
    'BP01-066': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Turn The Tide',
        text: 'Prune this card from your HAND to place that Character from RETREAT onto your FIELD?',
        when: (e, self, A) => e.k === 'RETREATED' && e.from === 'field' && e.fromZone === 'bat' && e.ctrl === A.p && !e.fd && e.lv <= 4 && isHuman(A, e.c) &&
          (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE' || e.by === A.opp(A.p)),
        can: A => A.zone(A.self) === 'HAND' && A.zone(ev(A).c) === 'RETREAT' && A.canPlace(ev(A).c, A.p),
        run: A => {
          const to = A.pick('to', 'Choose where to place ' + A.name(ev(A).c), slotOpts(A, A.spots(A.p)));
          A.prune(A.self, 'Turn The Tide');
          if (to) A.place(ev(A).c, to, 'Turn The Tide');
        }
      }]
    },
    /* 「Hostile Focus」Winter Soldier — pengalih serangan (rencana Tahap 3, RS-007) */
    'BP01-067': {
      trig: [{
        id: 'focus', zone: 'FIELD', once: true, optional: true, label: 'Hostile Focus',
        text: "Change the attacking Character's target to another target it can attack (you choose)?",
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.opp(A.p),
        can: A => { const c = A.cur(); return !!c && c.a === ev(A).a && A.targetsOf(c.a).some(t => t.slot !== c.slot); },
        run: A => {
          const c = A.cur();
          const opts = A.targetsOf(c.a).filter(t => t.slot !== c.slot).map(t => ({ v: t.slot, label: A.spotLabel(t.slot) + (t.iid ? ' · ' + A.name(t.iid) : ' · Weakness') }));
          const s = A.pick('s', 'Hostile Focus: choose the new Attack Target', opts);
          if (s) A.redirectSlot(s, 'Hostile Focus');
        }
      }]
    },
    /* 「Wakanda Forever」New Black Panther */
    'BP01-068': {
      trig: [{
        id: 'lost', zone: 'RETREAT', label: 'Wakanda Forever',
        when: (e, self) => e.k === 'RETREATED' && e.c === self && e.cause === 'lost the fight' && !!e.vs,
        can: A => { const w = ev(A).vs; return !!A.loc(w) && ['BATTLE', 'BASE'].includes(A.zone(w)) && isHuman(A, w); },
        run: A => A.retreat(ev(A).vs, 'Wakanda Forever')
      }]
    },
    /* 「Fantastic Calling」Human Torch */
    'BP01-069': {
      acti: [{
        id: 'call', zone: 'FIELD', once: true, label: 'Swap a Lv(X+1) Character in HAND with your Lv X Character in BATTLE, draw 1, this card to Deck bottom',
        can: A => A.battleChars(A.p).some(i => i !== A.self && handLv(A, A.p, A.lv(i) + 1).length),
        run: A => {
          const f = A.ask('f', { text: 'Choose 1 of your Characters in BATTLE (not this card)', from: A.battleChars(A.p).filter(i => i !== A.self && handLv(A, A.p, A.lv(i) + 1).length), prefer: 'high' });
          const h = A.ask('h', { text: 'Choose 1 Character in your HAND with Lv' + (A.lv(f[0]) + 1), from: handLv(A, A.p, A.lv(f[0]) + 1), prefer: 'high' });
          if (!A.swapHand(h[0], f[0], 'Fantastic Calling')) return;
          A.draw(A.p, 1);
          if (A.loc(A.self) && ['BATTLE', 'BASE', 'ATTACHED'].includes(A.zone(A.self))) A.toDeckBottom(A.self, 'Fantastic Calling');
        }
      }]
    },
    /* 「Time Guide」Loki */
    'BP01-070': {
      trig: [{
        id: 'blue', zone: 'FIELD', once: true, optional: true, label: 'Time Guide',
        text: 'Place the top card of your Deck face-down into your BASE?',
        when: (e, self, A) => e.k === 'ENTER' && A.ctrl(e.c) === A.p && A.color(e.c) === BLUE,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.p) > 0,
        run: A => { A.setTop(A.p, 1, 'Time Guide'); }
      }]
    },
    /* 「Shift」New Black Panther */
    'BP01-071': {
      auto: [
        { stat: 'p', zone: 'FRONT', value: (A, src, tgt) => tgt === src ? 1000 : 0 },
        { stat: 'r', zone: 'WING', value: (A, src, tgt) => tgt === src ? 2 : 0 }
      ]
    },
    /* 「Force Field」Invisible Woman — Trigger Hand (Siaga) */
    'BP01-072': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Force Field',
        text: 'Prune this card from your HAND: 1 Character from your RETREAT to the bottom of your Deck, and the attacker side gets R-2?',
        when: (e, self, A) => e.k === 'ATTACK' && (!e.tg || e.air) && A.ctrl(e.a) === A.opp(A.p),   // Weakness diserang (termasuk AIR STRIKE)
        can: A => A.zone(A.self) === 'HAND',
        run: A => {
          const r = A.ask('r', { text: 'Choose 1 Character (not "Invisible Woman") in your RETREAT to put on the bottom of your Deck', from: A.ret(A.p).filter(i => !nameHas(A, i, 'Invisible Woman')), prefer: 'high' });
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (R-2 this turn)', from: oppBattle(A), prefer: 'high' });
          A.prune(A.self, 'Force Field');
          r.forEach(i => A.toDeckBottom(i, 'Force Field'));
          t.forEach(i => A.mod(i, 'r', -2, 'Force Field'));
        }
      }]
    },
    /* 「Fantastic Perfusion」Human Torch */
    'BP01-073': {
      trig: [{
        id: 'bottom', zone: 'FIELD', once: true, label: 'Fantastic Perfusion',
        when: (e, self, A) => e.k === 'DECK_BOTTOM' && e.p === A.p,
        run: A => {
          const X = A.chars(A.p).concat([].concat.apply([], A.chars(A.p).map(i => A.attached(i)))).filter(i => isFF(A, i)).length;
          A.mod(A.self, 'r', 1, 'Fantastic Perfusion');
          if (X) A.mod(A.self, 'p', X * 1000, 'Fantastic Perfusion');
        }
      }]
    },
    /* 「Genius Burden」Mr.Fantastic */
    'BP01-074': {
      acti: [{
        id: 'genius', zone: 'BACK', counter: true, once: true, label: 'HAND 4: place a Lv4 from HAND; otherwise 1 Character from RETREAT to Deck bottom',
        can: A => A.hand(A.p).length === 4 ? A.hand(A.p).some(i => A.lv(i) === 4 && A.canPlace(i, A.p)) : A.ret(A.p).length > 0,
        run: A => {
          if (A.hand(A.p).length === 4) {
            const c = A.ask('c', { text: 'Choose 1 Lv4 Character in your HAND to place onto your FIELD', from: A.hand(A.p).filter(i => A.lv(i) === 4 && A.canPlace(i, A.p)), prefer: 'high' });
            const to = A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p)));
            if (c.length && to) A.place(c[0], to, 'Genius Burden');
          } else {
            const r = A.ask('r', { text: 'Choose 1 Character in your RETREAT to put on the bottom of your Deck', from: A.ret(A.p), prefer: 'high' });
            r.forEach(i => A.toDeckBottom(i, 'Genius Burden'));
          }
        }
      }]
    },
    /* 「Power Support」The Thing */
    'BP01-075': {
      auto: [{ stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => A.owner(tgt) === A.ctrl(src) && A.zone(tgt) === 'HAND' && isFF(A, tgt) ? -1 : 0 }]
    },
    /* 「The End Of Time」Loki */
    'BP01-076': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src ? A.ret(A.owner(src)).filter(i => nameHas(A, i, 'Loki')).length * 1000 : 0 }]
    },
    /* 「I Need You」Captain America */
    'BP01-077': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'I Need You', when: calledSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => { const g = A.draw(A.p, 1); if (g.length) A.setTop(A.p, 1, 'I Need You'); }
      }]
    },
    /* 「Deadly Airdrop」Falcon */
    'BP01-078': {
      trig: [{
        id: 'lost', zone: 'RETREAT', optional: true, label: 'Deadly Airdrop',
        text: 'Show the top card of your Deck (a blue Lv4 Character is placed into your BASE, otherwise it is discarded)?',
        when: lostFight,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p)[0];
          A.reveal(top);
          if (A.color(top) === BLUE && A.plv(top) === 4 && A.baseRoom(A.p) > 0 && A.canPlace(top, A.p)) A.place(top, 'BASE', 'Deadly Airdrop');
          else A.mill(A.p, 1, 'Deadly Airdrop');
        }
      }]
    },
    /* 「Eagle's Gaze」Hawkeye */
    'BP01-079': {
      auto: [{ stat: 'r', zone: 'FIELD', value: (A, src, tgt) => { const p = A.ctrl(src); return tgt === A.at(p, 'B') && A.chars(A.opp(p)).some(i => A.pw(i) >= 5000) ? 1 : 0; } }]
    },
    /* 「Sensory Deprivation」Daredevil */
    'BP01-082': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === A.at(A.opp(A.ctrl(src)), 'F') && isHuman(A, tgt) ? -500 : 0 }]
    },
    /* 「Freedom View」New Captain America */
    'BP01-084': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => { const p = A.ctrl(src); return tgt === A.at(p, 'F') && A.battle(p).length === A.battle(A.opp(p)).length ? 1 : 0; } }]
    },
    /* 「Tactical Instruction」Daredevil */
    'BP01-086': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === A.at(A.ctrl(src), 'F') && isHuman(A, tgt) ? 500 : 0 }]
    },
    /* 「Radar Sense」Daredevil */
    'BP01-088': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => tgt === src && A.battleChars(A.opp(A.ctrl(src))).some(i => A.pw(i) >= 5000) ? 3 : 0 }]
    },
    /* 「Quantum Realm」Ant-Man */
    'BP01-089': {
      auto: [{
        stat: 'r', zone: 'BATTLE',
        value: (A, src, tgt) => {
          const six = A.battleChars(A.opp(A.ctrl(src))).filter(i => A.lv(i) === 6);
          if (six.length !== 1) return 0;
          return tgt === src ? 1 : tgt === six[0] ? -1 : 0;
        }
      }]
    },
    /* 「Freedom Decision」Captain America */
    'BP01-090': {
      acti: [{
        id: 'decide', zone: 'HAND', label: 'Prune this card: skip your Battle Phase, 1 opponent Character in BATTLE gets Power-X',
        can: A => A.tp === A.p,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-X, X = total Power of your Characters in BATTLE)', from: oppBattle(A), prefer: 'high' });
          const X = A.battleChars(A.p).reduce((s, i) => s + A.pw(i), 0);
          A.prune(A.self, 'Freedom Decision');
          A.skipBattle('Freedom Decision');
          t.forEach(i => A.mod(i, 'p', -X, 'Freedom Decision'));
        }
      }]
    },

    /* ============================ HIJAU (Tahap 3b) ============================ */
    /* 「Hacker Arrow」Hawkeye */
    'BP01-091': {
      trig: [{
        id: 'set', zone: 'FIELD', once: true, optional: true, label: 'Hacker Arrow',
        text: "Discard 1 card from your HAND to retreat 2 of your opponent's face-down cards in BASE?",
        when: (e, self, A) => e.k === 'SET_UP' && e.p === A.opp(A.p),
        can: A => A.chars(A.p).every(i => A.color(i) === GREEN) && A.hand(A.p).length > 0 && A.set(A.opp(A.p)).length > 0,
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          const t = A.ask('t', { text: "Choose 2 of your opponent's face-down cards in BASE to Retreat", from: A.set(A.opp(A.p)), min: 2, max: 2 });
          A.discard(d[0], 'Hacker Arrow');
          t.forEach(i => A.retreat(i, 'Hacker Arrow'));
        }
      }]
    },
    /* 「Quantum Superposition」Ant-Man */
    'BP01-092': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Superposition', when: fromFieldToRet,
        run: A => { if (A.prune(A.self, 'Quantum Superposition') && A.base(A.p).length >= 4) A.job.step2 = true; },
        after: A => {
          const pool = A.hand(A.p).filter(i => isAvengers(A, i) && A.canPlace(i, A.p));
          if (!pool.length || A.baseRoom(A.p) <= 0) return;
          if (!A.yes('y', 'Quantum Superposition: place 1 [Avengers] Character from your HAND into your BASE?')) return;
          const c = A.ask('c', { text: 'Choose 1 [Avengers] Character in your HAND', from: pool, prefer: 'high' });
          c.forEach(i => A.place(i, 'BASE', 'Quantum Superposition'));
        }
      }]
    },
    /* 「Thunder Ally」Mighty Thor */
    'BP01-093': {
      trig: [{
        id: 'atk', zone: 'WING', label: 'Thunder Ally',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => A.wings(A.p).some(i => i !== A.self && A.pw(i) <= 4000 && !A.attackedThisTurn(i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your other WING Characters with Power 4000 or lower that did not attack', from: A.wings(A.p).filter(i => i !== A.self && A.pw(i) <= 4000 && !A.attackedThisTurn(i)), prefer: 'high' });
          const X = A.pw(c[0]);
          A.mod(A.self, 'p', X, 'Thunder Ally');
          A.setFlag(c[0], 'noatk', 'Thunder Ally', 'cannot attack');
        }
      }]
    },
    /* 「God Of Story」Loki — X = Karakter Anda di BATTLE yang tidak menyerang (RS-027) */
    'BP01-094': {
      trig: [{
        id: 'end', zone: 'FIELD', optional: true, label: 'God Of Story',
        text: "Retreat 1 opponent Character with Lv X, or X of your opponent's face-down cards (X = your Characters in BATTLE that did not attack)?",
        when: (e, self, A) => e.k === 'TURN_END' && e.p === A.p,
        can: A => { const X = A.battleChars(A.p).filter(i => !A.attackedThisTurn(i)).length; return X > 0 && (oppChars(A).some(i => A.lv(i) === X) || A.set(A.opp(A.p)).length >= X); },
        run: A => {
          const op = A.opp(A.p), X = A.battleChars(A.p).filter(i => !A.attackedThisTurn(i)).length;
          const opts = [];
          if (oppChars(A).some(i => A.lv(i) === X)) opts.push({ v: 'char', label: '1 Character with Lv' + X });
          if (A.set(op).length >= X) opts.push({ v: 'set', label: X + ' face-down card(s)' });
          const m = A.pick('m', 'God Of Story: retreat which?', opts);
          const t = m === 'char'
            ? A.ask('t', { text: 'Choose 1 opponent Character with Lv' + X + ' in the field to Retreat', from: oppChars(A).filter(i => A.lv(i) === X), prefer: 'high' })
            : A.ask('s', { text: 'Choose ' + X + " of your opponent's face-down cards to Retreat", from: A.set(op), min: X, max: X });
          t.forEach(i => A.retreat(i, 'God Of Story'));
        }
      }]
    },
    /* 「Sacrifice For Justice」Captain America */
    'BP01-095': {
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'Sacrifice For Justice',
        text: "Prune this card from RETREAT to move 1 opponent Character with Lv3 or lower from BATTLE to your opponent's BASE?",
        when: discardedByEffect,
        can: () => true,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 opponent Character with Lv3 or lower in BATTLE to move to your opponent's BASE", from: oppBattle(A).filter(i => A.lv(i) <= 3 && A.bbmDests(i).includes('BASE')), prefer: 'high' });
          A.prune(A.self, 'Sacrifice For Justice');
          t.forEach(i => A.bbm(i, 'BASE', 'Sacrifice For Justice'));
        }
      }]
    },
    /* 「I Am The Shield」New Captain America */
    'BP01-096': {
      acti: [{
        id: 'shield', zone: 'FIELD', counter: true, once: true, label: 'Discard 1: swap this card with your "Captain America" in BATTLE',
        can: A => A.hand(A.p).length > 0 && A.battleChars(A.p).some(i => i !== A.self && nameHas(A, i, 'Captain America')),
        run: A => {
          const t = A.ask('t', { text: 'Choose your "Captain America" Character in BATTLE to swap with', from: A.battleChars(A.p).filter(i => i !== A.self && nameHas(A, i, 'Captain America')), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          A.discard(d[0], 'I Am The Shield');
          if (A.loc(t[0])) A.swap(A.self, t[0], 'I Am The Shield');
        }
      }]
    },
    /* 「Original Mutant」Namor */
    'BP01-097': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => tgt === A.at(A.ctrl(src), 'F') ? { set: 3 } : 0 }]
    },
    /* 「Chaos Clairvoyance」Scarlet Witch — host hanya boleh menyerang Karakter Lv6 */
    'BP01-098': {
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'Chaos Clairvoyance',
        text: "Attach this card from RETREAT to 1 opponent Character (it can attack only Lv6 Characters)?",
        when: discardedByEffect,
        can: A => oppChars(A).length > 0,
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 opponent Character in the field to attach this card to', from: oppChars(A), prefer: 'high' });
          const others = A.attached(h[0]);
          A.attach(A.self, h[0]);
          others.forEach(i => A.retreat(i, 'Chaos Clairvoyance'));
        }
      }],
      atkLimit: (A, self, attacker, tg) => !!tg && A.lv(tg) === 6
    },
    /* 「Pym Arrow」Hawkeye */
    'BP01-099': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, single: true, label: 'Pym Arrow',
        text: "Discard 2 cards from your HAND to prune this card and 1 opponent Character in the field?",
        when: (e, self, A) => e.k === 'ENTER' && A.ctrl(e.c) === A.opp(A.p) && A.lv(e.c) >= 4,
        can: A => A.hand(A.p).length >= 2,
        run: A => {
          const d = A.ask('d', { text: 'Choose 2 cards in your HAND to discard', from: A.hand(A.p), min: 2, max: 2 });
          const t = A.ask('t', { text: 'Choose 1 opponent Character in the field to Prune', from: oppChars(A), prefer: 'high' });
          d.forEach(i => A.discard(i, 'Pym Arrow'));
          A.prune(A.self, 'Pym Arrow');
          t.forEach(i => A.prune(i, 'Pym Arrow'));
        }
      }]
    },
    /* 「Hearing Disarm」Daredevil */
    'BP01-100': {
      counter: true,
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Hearing Disarm', when: enterSelf,
        can: A => oppChars(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in the field (R-1 this turn)', from: oppChars(A), prefer: 'high' });
          t.forEach(i => A.mod(i, 'r', -1, 'Hearing Disarm'));
        }
      }]
    },
    /* 「MIRV Arrow」Hawkeye */
    'BP01-101': {
      trig: [{
        id: 'weak', zone: 'FIELD', once: true, optional: true, label: 'MIRV Arrow',
        text: 'Retreat up to 3 of your face-down cards in BASE, then place a Character with that original Lv from HAND into your BATTLE?',
        when: (e, self, A) => e.k === 'ATTACK' && (!e.tg || e.air) && A.ctrl(e.a) === A.opp(A.p),   // Weakness diserang (termasuk AIR STRIKE)
        can: A => A.set(A.p).length > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1–3 of your face-down cards in BASE to Retreat', from: A.set(A.p), min: 1, max: 3 });
          const X = s.length;
          const empty = A.emptySlots(A.p);
          const pool = A.hand(A.p).filter(i => A.origLv(i) === X && A.canPlace(i, A.p));
          const c = pool.length && empty.length ? A.ask('c', { text: 'Choose 1 Character with original Lv' + X + ' in your HAND to place into your BATTLE (or none)', from: pool, min: 0, max: 1, prefer: 'high' }) : [];
          const to = c.length ? A.pick('to', 'Choose a BATTLE area', slotOpts(A, empty)) : null;
          s.forEach(i => A.retreat(i, 'MIRV Arrow'));
          if (c.length && to) A.place(c[0], to, 'MIRV Arrow');
        }
      }]
    },
    /* 「Quantum Collapse」Ant-Man */
    'BP01-102': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Collapse', when: fromFieldToRet,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 opponent Character with Lv3 or lower in BASE to Prune", from: A.base(A.opp(A.p)).filter(i => !A.isFd(i) && A.lv(i) <= 3), prefer: 'high' });
          if (A.prune(A.self, 'Quantum Collapse')) t.forEach(i => A.prune(i, 'Quantum Collapse'));
        }
      }]
    },
    /* 「Tactical Intimidation」Winter Soldier */
    'BP01-103': {
      trig: [{
        id: 'bbm', zone: 'FIELD', optional: true, label: 'Tactical Intimidation',
        text: "Move your opponent's Character from FRONT to their BACK?",
        when: bbmSelf,
        can: A => { const op = A.opp(A.p); return !!A.at(op, 'F') && !A.at(op, 'B'); },
        run: A => { const f = A.at(A.opp(A.p), 'F'); if (f) A.battleMove(f, 'B', 'Tactical Intimidation'); }
      }]
    },
    /* 「Time Reversal」Scarlet Witch */
    'BP01-104': {
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'Time Reversal',
        text: "Put 1 of your Characters and 1 opponent Character with the same Lv from BATTLE on top of their owners' Decks?",
        when: discardedByEffect,
        can: A => A.battleChars(A.p).some(i => oppBattle(A).some(j => A.lv(j) === A.lv(i))),
        run: A => {
          const m = A.ask('m', { text: 'Choose 1 of your Characters in BATTLE', from: A.battleChars(A.p).filter(i => oppBattle(A).some(j => A.lv(j) === A.lv(i))) });
          const o = A.ask('o', { text: 'Choose 1 opponent Character in BATTLE with Lv' + A.lv(m[0]), from: oppBattle(A).filter(j => A.lv(j) === A.lv(m[0])), prefer: 'high' });
          A.toDeckTop(m[0], 'Time Reversal');
          o.forEach(i => A.toDeckTop(i, 'Time Reversal'));
        }
      }],
      acti: [{
        id: 'bottom', zone: 'BATTLE', once: true, label: '1 Character from your RETREAT to the bottom of your Deck',
        can: A => A.ret(A.p).length > 0,
        run: A => {
          const r = A.ask('r', { text: 'Choose 1 Character in your RETREAT', from: A.ret(A.p), prefer: 'high' });
          r.forEach(i => A.toDeckBottom(i, 'Time Reversal'));
        }
      }]
    },
    /* 「Mental Synchronization」New Black Panther */
    'BP01-105': {
      trig: [{
        id: 'atk', zone: 'FIELD', once: true, label: 'Mental Synchronization',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.p && !!e.tg && A.pw(e.tg) >= 5000,
        can: A => !!A.loc(ev(A).a),
        run: A => A.mod(ev(A).a, 'p', 1000, 'Mental Synchronization')
      }]
    },
    /* 「Search For Comrade」Falcon */
    'BP01-106': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Search For Comrade',
        text: 'Discard 1 green Character from your HAND to draw 2 cards?',
        when: calledSelf,
        can: A => A.hand(A.p).some(i => A.color(i) === GREEN),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 green Character in your HAND to discard', from: A.hand(A.p).filter(i => A.color(i) === GREEN) });
          A.discard(d[0], 'Search For Comrade');
          A.draw(A.p, 2);
        }
      }]
    },
    /* 「Freedom Radiance」Captain America */
    'BP01-107': {
      auto: [{
        stat: 'p', zone: 'BATTLE',
        value: (A, src, tgt) => { const p = A.ctrl(src); return A.ctrl(tgt) === A.opp(p) && !!A.slot(tgt) && A.lv(tgt) <= 4 && A.battleChars(p).some(i => A.color(i) === GREEN && A.pw(i) >= 4000) ? -500 : 0; }
      }],
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'Freedom Radiance',
        text: 'Place this card from RETREAT face-down into your BASE?',
        when: discardedByEffect,
        can: A => A.baseRoom(A.p) > 0,
        run: A => A.toBaseFd(A.self, 'RETREAT')
      }]
    },
    /* 「Airbag Arrow」Hawkeye */
    'BP01-108': {
      acti: [{
        id: 'airbag', zone: 'FIELD', once: true, label: 'Discard 1 [Avengers] Character: top 2 cards of your Deck face-down into your BASE',
        can: A => A.hand(A.p).some(i => isAvengers(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 [Avengers] Character in your HAND to discard', from: A.hand(A.p).filter(i => isAvengers(A, i)) });
          A.discard(d[0], 'Airbag Arrow');
          A.setTop(A.p, 2, 'Airbag Arrow');
        }
      }]
    },
    /* 「Hearing position」Daredevil — lawan memilih kartu dari HAND-nya sendiri */
    'BP01-109': {
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Hearing position', when: enterSelf,
        can: A => A.hand(A.opp(A.p)).length > 0 && A.baseRoom(A.opp(A.p)) > 0,
        run: A => {
          const op = A.opp(A.p);
          const c = A.ask('c', { text: 'Hearing position: choose 1 card in your HAND to place face-down into your BASE', from: A.hand(op), p: op, prefer: 'low' });
          c.forEach(i => A.toBaseFd(i, 'HAND'));
        }
      }]
    },
    /* 「God of Lies」Loki */
    'BP01-110': {
      auto: [{ stat: 'lv', zone: 'BASE', value: (A, src, tgt) => tgt === src && A.battle(A.ctrl(src)).length === 0 ? { set: 5 } : 0 }]
    },
    /* 「Darkness Surrounds」Daredevil */
    'BP01-112': {
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Darkness Surrounds', when: enterSelf,
        can: A => A.set(A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's face-down cards in BASE to Retreat", from: A.set(A.opp(A.p)) });
          t.forEach(i => A.retreat(i, 'Darkness Surrounds'));
        }
      }]
    },
    /* 「Suddenly」Falcon */
    'BP01-113': {
      trig: [{
        id: 'back', zone: 'FIELD', once: true, optional: true, label: 'Suddenly',
        text: 'This card takes BATTLE-BASE MOVE once?',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.opp(A.p) && A.slot(e.a) === 'B',
        can: A => A.bbmDests(A.self).length > 0,
        run: A => { const to = A.pick('to', 'Move 「Suddenly」Falcon to', slotOpts(A, A.bbmDests(A.self))); if (to) A.bbm(A.self, to, 'Suddenly'); }
      }]
    },
    /* 「Rearguard Retreat」Falcon */
    'BP01-116': {
      trig: [{
        id: 'wing', zone: 'FIELD', optional: true, label: 'Rearguard Retreat',
        text: 'Move 1 of your Characters from BATTLE to your BASE, then this card takes BATTLE-BASE MOVE once?',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.opp(A.p) && ['W1', 'W2'].includes(A.slot(e.a)),
        can: A => A.baseRoom(A.p) > 0 && A.battleChars(A.p).some(i => A.bbmDests(i).includes('BASE')),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Characters in BATTLE to move to your BASE', from: A.battleChars(A.p).filter(i => A.bbmDests(i).includes('BASE')) });
          if (!A.bbm(c[0], 'BASE', 'Rearguard Retreat')) return;
          A.job.step2 = true;
        },
        after: A => {
          const d = A.bbmDests(A.self);
          const to = A.pick('to', 'Move 「Rearguard Retreat」Falcon to', slotOpts(A, d));
          if (to) A.bbm(A.self, to, 'Rearguard Retreat');
        }
      }]
    },
    /* 「Ancestral Blessing」New Black Panther */
    'BP01-117': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => { const p = A.ctrl(src), f = A.at(A.opp(p), 'F'); return tgt === A.at(p, 'F') && f && !A.isFd(f) && A.color(f) !== A.color(src) ? 1 : 0; } }]
    },
    /* 「Quantum Tunneling」Ant-Man */
    'BP01-120': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Tunneling', when: fromFieldToRet,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 Lv3 Character (not "Ant-Man") in your VOID to put on top of your Deck', from: A.voidOf(A.p).filter(i => A.lv(i) === 3 && !nameHas(A, i, 'Ant-Man')), prefer: 'high' });
          if (A.prune(A.self, 'Quantum Tunneling')) t.forEach(i => A.toDeckTop(i, 'Quantum Tunneling'));
        }
      }]
    }
  });

  // Cetak ulang dengan teks Inggris identik → resolver yang sama (dicek 6 Nov 2026, riwayat #34).
  const REPRINT = {
    'BP01-018': 'SD01-014', 'BP01-020': 'SD01-015', 'BP01-023': 'SD01-016', 'BP01-025': 'SD01-017', 'BP01-026': 'SD01-018',
    'BP01-053': 'SD02-014', 'BP01-056': 'SD02-018', 'BP01-057': 'SD02-015', 'BP01-059': 'SD02-016', 'BP01-060': 'SD02-017',
    'BP01-080': 'SD03-015', 'BP01-081': 'SD03-016', 'BP01-085': 'SD03-018', 'BP01-087': 'SD03-017',
    'BP01-111': 'SD04-015', 'BP01-115': 'SD04-016', 'BP01-119': 'SD04-014',
    'BP01-083': 'SD01-011', 'BP01-114': 'SD04-017', 'BP01-118': 'SD04-018'    // teks identik, nama berbeda (dicek 6 Nov 2026)
  };
  Object.keys(REPRINT).forEach(k => { if (SD && SD[REPRINT[k]]) DEFS[k] = SD[REPRINT[k]]; });

  S.registerCards(DEFS);
  if (isNode) module.exports = DEFS;
  else root.MHRCardDefsBP01 = DEFS;
})(typeof window !== 'undefined' ? window : this);
