/* ===================================================================
   MHR BATTLE SIM — RESOLVER TAHAP 6: SD05, SD06, PB02 (sim-cards-t6.js)      v0.14 · riwayat #82
   ===================================================================
   Dibuat dari TEKS INGGRIS (e_en) di cards.js — untuk tiga set ini teks itu masih TERJEMAHAN PRA-RILIS (fan:2), bukan teks
   resmi. Keputusan pemilik 12 Nov 2026: kerjakan dengan terjemahan yang ada, tampilkan di Battle Sim; ganti bila teks resmi
   Indonesia/Inggris terbit (rilis SD05 & SD06 di Indonesia 14 Nov 2026).
   - 57 kartu: SD05-001…018 (Orange), SD06-001…018 (Purple), PB02-001…021.
   - Kemampuan baru dari CR 1.05 (belum resmi di Indonesia): QUICK STRIKE (305.7, SD05-003) dan RAMPAGE (305.8, SD06-001).
   - Ruling (ruling-simulator.md, RS-064…RS-067; K-48/K-49/K-50 dijawab pemilik 12 Nov): "damaged character" (SD06-002) = Power di bawah
     Power cetak karena efek minus (siapa pun); Gamora PB02-004 "total Power ... is 6500" dibaca persis 6500; Lv di HAND/RETREAT/VOID = Lv cetak.
   Format sama dengan sim-cards-sp01.js. Hook mesin baru (sim.js v0.14.0): restrict (tidak bisa menyerang/bergerak),
   noCall, auraAbil, auraCounter, bothLoseImmune berupa fungsi, rampage, gr.lose ("loses its effects in this turn").
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;

  const ORANGE = 'Orange', PURPLE = 'Purple';
  const traits = (A, i) => A.trait(i).split('/').map(x => x.trim());
  const hasTrait = (A, i, t) => traits(A, i).includes(t);
  const charName = (A, i) => A.name(i).replace(/^「[^」]*」\s*/, '');
  const nameHas = (A, i, n) => charName(A, i).includes(n);
  const ev = A => (A.job && A.job.ev) || {};
  const slotOpts = (A, spots) => spots.map(v => ({ v, label: A.spotLabel(v) }));
  const oppBattle = A => A.battleChars(A.opp(A.p));
  const inBattle = (A, i) => { const L = A.loc(i); return !!L && L.zone === 'bat'; };
  const inField = (A, i) => { const L = A.loc(i); return !!L && (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att'); };
  const baseChars = (A, p) => A.chars(p).filter(i => A.loc(i).zone === 'base');
  const rpOf = (A, p) => A.st.P[p].rp;
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const calledEnter = (e, self) => e.k === 'ENTER' && e.c === self && (e.how === 'call' || e.how === 'ccall');
  const oppEnters = (e, self, A) => e.k === 'ENTER' && e.p === A.opp(A.ctrl(self));
  const isGotg = (A, i) => hasTrait(A, i, 'GOTG');
  const isCabal = (A, i) => hasTrait(A, i, 'Cabal');
  const isBlackOrder = (A, i) => hasTrait(A, i, 'Black Order');
  const isAsgard = (A, i) => hasTrait(A, i, 'Asgard');
  const isHuman = (A, i) => hasTrait(A, i, 'Human');
  // "you prune 1 of your purple characters in RETREAT. If you do, …" — dipakai tujuh kartu SD06.
  const purpleRet = A => A.ret(A.p).filter(i => A.color(i) === PURPLE);
  const cabalRet = A => A.ret(A.p).filter(i => isCabal(A, i));
  const askPrune = (A, from, what) => A.ask('pr', { text: 'Choose 1 ' + what + ' in your RETREAT to Prune', from, prefer: 'low' });
  const lvIn = (A, i) => (inField(A, i) ? A.lv(i) : A.origLv(i));          // Lv di luar FIELD = Lv cetak
  // Jumlah Power semua Karakter Anda di BATTLE.
  const battlePower = (A, p) => A.battleChars(p).reduce((s, i) => s + A.pw(i), 0);
  // "damaged" (SD06-002), keputusan pemilik 12 Nov 2026 (K-48, RS-065, dikoreksi #84): Power saat ini di bawah Power cetak
  // karena efek minus — dari pemain mana pun, termasuk efek pemiliknya sendiri.
  const damaged = (A, i) => {
    if (!(A.pw(i) < A.origP(i))) return false;
    const b = S.statBreakdown(A.st, i, 'p');
    return b.rows.some(r => r.on && (r.d < 0 || (r.set != null && r.set < b.base)));
  };
  // Pemicu "masuk RETREAT karena dibuang oleh efek" (HAND atau Deck, 301.15).
  const discardedSelf = (e, self) => e.k === 'RETREATED' && e.c === self && e.cause === 'discard' && e.eff;
  // "enters VOID from RETREAT by your effect"
  const voidByYou = (e, self, A) => e.k === 'VOIDED' && e.c === self && e.from === 'ret' && e.jp === A.owner(self);
  // RS-023 / RS-034 (sama dengan BP01-066): kalah bertarung (termasuk BOTH LOSE) atau efek lawan.
  const lostOrOpp = (A, e) => e.k === 'RETREATED' && e.from === 'field' && e.fromZone === 'bat' && !e.fd &&
    (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE' || e.by === A.opp(e.ctrl));

  const DEFS = {
    /* ============================ SD05 · ORANGE ============================ */
    /* 「Guardian of the Nine Realms」Odin */
    'SD05-001': {
      unique: true,
      trig: [{
        id: 'end', zone: 'BACK', label: 'Guardian of the Nine Realms',
        when: (e, self, A) => e.k === 'TURN_END' && e.p === A.ctrl(self),
        can: A => baseChars(A, A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in the BASE (Power-X, X = Odin's Power)", from: baseChars(A, A.opp(A.p)), prefer: 'high' });
          const X = A.pw(A.self);
          t.forEach(i => {
            A.mod(i, 'p', -X, 'Guardian of the Nine Realms');
            if (A.origP(i) > 0 && A.pw(i) === 0) { A.log('Odin: that Character drops to Power 0 and is retreated, so you draw 1 card extra.'); A.draw(A.p, 1); }
          });
        }
      }]
    },
    /* 「Interstellar Guardian」Captain Marvel */
    'SD05-002': {
      unique: true,
      acti: [{
        id: 'both', zone: 'BATTLE', counter: true, once: true, label: "Prune this card and 1 opponent's Character with Power X or lower",
        can: A => A.allChars().some(i => A.ctrl(i) === A.opp(A.p) && A.pw(i) <= A.pw(A.self)),
        run: A => {
          const X = A.pw(A.self);
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters on the FIELD with Power " + X + ' or lower to Prune', from: A.chars(A.opp(A.p)).filter(i => A.pw(i) <= X), prefer: 'high' });
          A.prune(A.self, 'Interstellar Guardian');
          t.forEach(i => A.prune(i, 'Interstellar Guardian'));
        }
      }]
    },
    /* 「Guardian of Earth」Ancient One — QUICK STRIKE (305.7) */
    'SD05-003': {
      unique: true,
      bothLoseImmune: (A, self) => inBattle(A, self) && A.tp === A.ctrl(self),
      trig: [{
        id: 'oppenter', zone: 'FIELD', once: true, optional: true, label: 'Guardian of Earth',
        text: "Discard 2 cards from your HAND to place 1 of your orange Characters with the same Lv as that opponent's Character from RETREAT into your BATTLE?",
        when: oppEnters,
        can: A => {
          const c = ev(A).c; if (!c || !A.loc(c)) return false;
          const X = A.lv(c);
          return A.hand(A.p).length >= 2 && A.emptySlots(A.p).length > 0 && A.ret(A.p).some(i => A.color(i) === ORANGE && A.origLv(i) === X && A.canPlace(i, A.p));
        },
        run: A => {
          const X = A.lv(ev(A).c);
          const c = A.ask('c', { text: 'Choose 1 orange Lv' + X + ' Character in your RETREAT to place into your BATTLE', from: A.ret(A.p).filter(i => A.color(i) === ORANGE && A.origLv(i) === X && A.canPlace(i, A.p)), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 2 cards in your HAND to discard', from: A.hand(A.p), min: 2, max: 2 });
          const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.emptySlots(A.p)));
          let n = 0; d.forEach(i => { if (A.discard(i, 'Guardian of Earth')) n++; });
          if (n === 2 && c.length && to && A.zone(c[0]) === 'RETREAT') A.place(c[0], to, 'Guardian of Earth');
        }
      }]
    },
    /* 「Soul Return Spell」Doctor Strange */
    'SD05-004': {
      unique: true,
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Soul Return Spell',
        text: 'Discard the top card of your Deck to place 1 orange Lv3-or-lower [Human] Character from RETREAT into your FIELD (then retreat this card)?',
        when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => { const got = A.mill(A.p, 1, 'Soul Return Spell'); if (got.length) A.job.step2 = true; },
        after: A => {
          const cand = A.ret(A.p).filter(i => A.color(i) === ORANGE && A.origLv(i) <= 3 && isHuman(A, i) && A.canPlace(i, A.p));
          const c = A.ask('c', { text: 'Choose 1 orange Lv3-or-lower [Human] Character in your RETREAT to place into your FIELD', from: cand, prefer: 'high' });
          const to = c.length ? A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p))) : null;
          if (c.length && to) A.place(c[0], to, 'Soul Return Spell');
          if (inField(A, A.self)) A.retreat(A.self, 'Soul Return Spell');
        }
      }]
    },
    /* 「Einherjar Revival」New Valkyrie */
    'SD05-005': {
      unique: true,
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Einherjar Revival', when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p).slice(0, 3);
          top.forEach(i => A.reveal(i));
          const cand = top.filter(i => A.color(i) === ORANGE && A.origLv(i) === 3 && (isHuman(A, i) || isAsgard(A, i)) && A.canPlace(i, A.p));
          const c = A.ask('c', { text: 'Choose 1 orange Lv3 [Human]/[Asgard] Character among the revealed cards to place into your FIELD', from: cand, prefer: 'high' });
          const to = c.length ? A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p))) : null;
          if (c.length && to) A.place(c[0], to, 'Einherjar Revival');
          const rest = top.filter(i => A.zone(i) === 'DECK').length;
          if (rest) A.mill(A.p, rest, 'Einherjar Revival');
          else A.mark();
        }
      }]
    },
    /* 「Guide of the Einherjar」Valkyrie */
    'SD05-006': {
      acti: [{
        id: 'hand', zone: 'HAND', label: 'Discard this card: return an orange Lv3 [Human]/[Asgard] Character from RETREAT to your HAND',
        can: A => A.ret(A.p).some(i => A.color(i) === ORANGE && A.origLv(i) === 3 && (isHuman(A, i) || isAsgard(A, i))),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 orange Lv3 [Human]/[Asgard] Character in your RETREAT to return to your HAND', from: A.ret(A.p).filter(i => A.color(i) === ORANGE && A.origLv(i) === 3 && (isHuman(A, i) || isAsgard(A, i))), prefer: 'high' });
          if (A.discard(A.self, 'Guide of the Einherjar')) c.forEach(i => A.toHand(i, 'Guide of the Einherjar'));
        }
      }]
    },
    /* 「Graceful Choice」Doctor Strange — tidak bisa menyerang, kecuali kehilangan efeknya */
    'SD05-007': {
      restrict: (A, src, tgt) => (tgt === src && inBattle(A, src) ? { atk: true } : null),
      acti: [{
        id: 'lose', zone: 'BATTLE', once: true, label: 'Discard 1 card: this card loses its effects this turn (it can attack)',
        can: A => A.hand(A.p).length > 0,
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          if (d.length && A.discard(d[0], 'Graceful Choice')) A.setFlag(A.self, 'lose', 'Graceful Choice', 'loses its effects');
        }
      }]
    },
    /* 「Secret Realm Guardian」Doctor Strange */
    'SD05-008': {
      trig: [{
        id: 'orange', zone: 'FIELD', once: true, optional: true, label: 'Secret Realm Guardian',
        text: 'Put 1 [Human] Character from your RETREAT on the bottom of your Deck?',
        when: (e, self, A) => e.k === 'ENTER' && e.p === A.ctrl(self) && A.color(e.c) === ORANGE,
        can: A => A.ret(A.p).some(i => isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Human] Character in your RETREAT to put on the bottom of your Deck', from: A.ret(A.p).filter(i => isHuman(A, i)) });
          c.forEach(i => A.toDeckBottom(i, 'Secret Realm Guardian'));
        }
      }]
    },
    /* 「Arcane Backflow」Wong */
    'SD05-009': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Arcane Backflow (discard top card)',
        text: 'Discard the top card of your Deck?', when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => { A.mill(A.p, 1, 'Arcane Backflow'); }
      }, {
        id: 'oppend', zone: 'FIELD', optional: true, label: 'Arcane Backflow (retreat)',
        text: "Retreat this card to retreat 1 of your opponent's Lv3 Characters in BATTLE?",
        when: (e, self, A) => e.k === 'TURN_END' && e.p === A.opp(A.ctrl(self)),
        can: A => oppBattle(A).some(i => A.lv(i) === 3),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3 Characters in BATTLE to retreat", from: oppBattle(A).filter(i => A.lv(i) === 3), prefer: 'high' });
          if (A.retreat(A.self, 'Arcane Backflow')) t.forEach(i => A.retreat(i, 'Arcane Backflow'));
        }
      }]
    },
    /* 「Judgment of Exile」Sif */
    'SD05-010': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Judgment of Exile',
        text: "Discard the top card of your Deck to move 1 of your opponent's Lv3-or-lower Characters from BATTLE to their BASE?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.opp(A.p)) > 0 && oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3-or-lower Characters in BATTLE to move to their BASE", from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          if (A.mill(A.p, 1, 'Judgment of Exile').length) t.forEach(i => A.bbm(i, 'BASE', 'Judgment of Exile'));
        }
      }]
    },
    /* 「Judgment of Broken Wings」Sif */
    'SD05-011': {
      counter: true,
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Judgment of Broken Wings',
        text: "Discard 1 card from your HAND to move 1 of your opponent's Characters from WING to their BASE?",
        when: enterSelf,
        can: A => A.hand(A.p).length > 0 && A.baseRoom(A.opp(A.p)) > 0 && A.wings(A.opp(A.p)).some(i => !A.isFd(i)),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in WING to move to their BASE", from: A.wings(A.opp(A.p)).filter(i => !A.isFd(i)), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          if (d.length && A.discard(d[0], 'Judgment of Broken Wings')) t.forEach(i => A.bbm(i, 'BASE', 'Judgment of Broken Wings'));
        }
      }]
    },
    /* 「Shield of Asgard」Sif — BLOCK, tidak bisa di-CALL */
    'SD05-012': {
      block: true, noCall: true,
      acti: [{
        id: 'top', zone: 'HAND', label: 'Reveal this card and put it on top of your Deck',
        can: () => true,
        run: A => { A.reveal(A.self); A.toDeckTop(A.self, 'Shield of Asgard'); }
      }]
    },
    /* 「Blessing of the Einherjar」New Valkyrie */
    'SD05-013': {
      acti: [{
        id: 'bless', zone: 'BATTLE', once: true, label: 'Discard 1 card: 1 of your Characters gets R+1 and Power+1000 (+1000 more if [Asgard])',
        can: A => A.hand(A.p).length > 0 && A.chars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters on the FIELD (R+1, Power+1000; +1000 more if [Asgard])', from: A.chars(A.p), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          if (d.length && A.discard(d[0], 'Blessing of the Einherjar')) t.forEach(i => { A.mod(i, 'r', 1, 'Blessing of the Einherjar'); A.mod(i, 'p', isAsgard(A, i) ? 2000 : 1000, 'Blessing of the Einherjar'); });
        }
      }]
    },
    /* 「Rainbow Light of Exile」Heimdall */
    'SD05-014': {
      acti: [{
        id: 'exile', zone: 'BATTLE', once: true, label: "Discard 1 card: move 1 opponent's Character with Power X or lower from BATTLE to their BASE",
        can: A => A.hand(A.p).length > 0 && A.baseRoom(A.opp(A.p)) > 0 && oppBattle(A).some(i => A.pw(i) <= A.pw(A.self)),
        run: A => {
          const X = A.pw(A.self);
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE with Power " + X + ' or lower to move to their BASE', from: oppBattle(A).filter(i => A.pw(i) <= X), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          if (d.length && A.discard(d[0], 'Rainbow Light of Exile')) t.forEach(i => A.bbm(i, 'BASE', 'Rainbow Light of Exile'));
        }
      }]
    },
    /* 「Rainbow Light of Annihilation」Heimdall */
    'SD05-015': {
      acti: [{
        id: 'ann', zone: 'BATTLE', once: true, label: "Discard 1 card: 1 opponent's Character in BATTLE gets Power-1000",
        can: A => A.hand(A.p).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000)", from: oppBattle(A), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          if (d.length && A.discard(d[0], 'Rainbow Light of Annihilation')) t.forEach(i => A.mod(i, 'p', -1000, 'Rainbow Light of Annihilation'));
        }
      }]
    },
    /* 「Execution of the Nine Realms」Hela */
    'SD05-016': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src && A.tp === A.ctrl(src) && A.attached(src).length === 1 ? 2000 : 0 }],
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Execution of the Nine Realms',
        text: 'Discard the top card of your Deck to attach 1 [Asgard] Character from your RETREAT to this card?',
        when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => { if (A.mill(A.p, 1, 'Execution of the Nine Realms').length) A.job.step2 = true; },
        after: A => {
          const c = A.ask('c', { text: 'Choose 1 [Asgard] Character in your RETREAT to attach to Hela', from: A.ret(A.p).filter(i => isAsgard(A, i)), prefer: 'high' });
          if (c.length && inField(A, A.self)) A.attach(c[0], A.self);
        }
      }]
    },
    /* 「Jailbreak Rebirth」Hela */
    'SD05-017': {
      trig: [{
        id: 'ret', zone: 'RETREAT', optional: true, label: 'Jailbreak Rebirth',
        text: 'Place 1 Character with [Hela] in its name from your RETREAT into your FIELD?',
        when: discardedSelf,
        can: A => A.spots(A.p).length > 0 && A.ret(A.p).some(i => nameHas(A, i, 'Hela') && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Character with [Hela] in its name in your RETREAT to place into your FIELD', from: A.ret(A.p).filter(i => nameHas(A, i, 'Hela') && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Jailbreak Rebirth');
        }
      }]
    },
    /* 「Summoning of the Dead」Hela */
    'SD05-018': {
      trig: [{
        id: 'ret', zone: 'RETREAT', optional: true, label: 'Summoning of the Dead',
        text: 'Place 1 [Asgard] Character from your RETREAT into your FIELD?',
        when: discardedSelf,
        can: A => A.spots(A.p).length > 0 && A.ret(A.p).some(i => isAsgard(A, i) && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Asgard] Character in your RETREAT to place into your FIELD', from: A.ret(A.p).filter(i => isAsgard(A, i) && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose where to place it', slotOpts(A, A.spots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Summoning of the Dead');
        }
      }]
    },

    /* ============================ SD06 · PURPLE ============================ */
    /* 「Curse of Wisdom」Thanos — RAMPAGE (305.8) */
    'SD06-001': {
      unique: true, rampage: true,
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Curse of Wisdom',
        text: "Prune 1 purple Character from your RETREAT to retreat 1 of your opponent's Lv4-or-lower Characters in BATTLE?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0 && oppBattle(A).some(i => A.lv(i) <= 4),
        run: A => {
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv4-or-lower Characters in BATTLE to retreat", from: oppBattle(A).filter(i => A.lv(i) <= 4), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Curse of Wisdom')) t.forEach(i => A.retreat(i, 'Curse of Wisdom'));
        }
      }]
    },
    /* 「Peerless Blade」Corvus Glaive */
    'SD06-002': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Peerless Blade',
        text: "Prune 1 purple Character from your RETREAT (if this card is in FRONT: retreat 1 of your opponent's damaged Lv5-or-lower Characters in BATTLE)?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0,
        run: A => {
          const front = A.slot(A.self) === 'F';
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const t = front ? A.ask('t', { text: "Choose 1 of your opponent's damaged (Power lowered by an effect) Lv5-or-lower Characters in BATTLE to retreat", from: oppBattle(A).filter(i => A.lv(i) <= 5 && damaged(A, i)), prefer: 'high' }) : [];
          if (pr.length && A.prune(pr[0], 'Peerless Blade') && A.slot(A.self) === 'F') t.forEach(i => A.retreat(i, 'Peerless Blade'));
        }
      }]
    },
    /* 「Peerless Spear」Proxima Midnight */
    'SD06-003': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Peerless Spear',
        text: "Prune 1 purple Character from your RETREAT (if this card is in FRONT: retreat 1 of your opponent's R0 Characters in BATTLE)?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0,
        run: A => {
          const front = A.slot(A.self) === 'F';
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const t = front ? A.ask('t', { text: "Choose 1 of your opponent's R0 Characters in BATTLE to retreat", from: oppBattle(A).filter(i => A.r(i) === 0), prefer: 'high' }) : [];
          if (pr.length && A.prune(pr[0], 'Peerless Spear') && A.slot(A.self) === 'F') t.forEach(i => A.retreat(i, 'Peerless Spear'));
        }
      }]
    },
    /* 「Black Tongue Schemer」Ebony Maw */
    'SD06-004': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Black Tongue Schemer',
        text: "Prune 1 purple Character from your RETREAT: 1 of your opponent's Characters in BATTLE gets Power-1000 (-3000 if this card is in FRONT)?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000, or -3000 if Ebony Maw is in FRONT)", from: oppBattle(A), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Black Tongue Schemer')) t.forEach(i => A.mod(i, 'p', A.slot(A.self) === 'F' ? -3000 : -1000, 'Black Tongue Schemer'));
        }
      }]
    },
    /* 「Cosmic Convergence」Supergiant */
    'SD06-005': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Cosmic Convergence',
        text: 'Prune 1 purple Character from your RETREAT: this card gets Power+X (Power of 1 of your Characters in BATTLE; in FRONT, the total Power of your BATTLE)?',
        when: calledEnter,
        can: A => purpleRet(A).length > 0,
        run: A => {
          const front = A.slot(A.self) === 'F';
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const c = front ? [] : A.ask('c', { text: 'Choose 1 of your Characters in BATTLE (this card gets Power+ its Power)', from: A.battleChars(A.p), prefer: 'high' });
          const X = front ? battlePower(A, A.p) : (c.length ? A.pw(c[0]) : 0);
          if (pr.length && A.prune(pr[0], 'Cosmic Convergence') && X > 0 && inField(A, A.self)) A.mod(A.self, 'p', X, 'Cosmic Convergence');
        }
      }]
    },
    /* 「Shaping Battle Axe」Black Dwarf */
    'SD06-006': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Shaping Battle Axe',
        text: "Prune 1 purple Character from your RETREAT: 1 of your opponent's Characters in BATTLE gets R-1 (R-3 if this card is in FRONT)?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const pr = askPrune(A, purpleRet(A), 'purple Character');
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (R-1, or R-3 if Black Dwarf is in FRONT)", from: oppBattle(A), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Shaping Battle Axe')) t.forEach(i => A.mod(i, 'r', A.slot(A.self) === 'F' ? -3 : -1, 'Shaping Battle Axe'));
        }
      }]
    },
    /* 「Hunt of Powerful Foes」Corvus Glaive */
    'SD06-007': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Hunt of Powerful Foes',
        text: "Prune 1 [Cabal] Character from your RETREAT to Prune 1 Character in your opponent's RETREAT?",
        when: calledEnter,
        can: A => cabalRet(A).length > 0 && A.ret(A.opp(A.p)).length > 0,
        run: A => {
          const pr = askPrune(A, cabalRet(A), '[Cabal] Character');
          const t = A.ask('t', { text: "Choose 1 Character in your opponent's RETREAT to Prune", from: A.ret(A.opp(A.p)), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Hunt of Powerful Foes')) t.forEach(i => A.prune(i, 'Hunt of Powerful Foes'));
        }
      }]
    },
    /* 「Telekinetic Spike」Ebony Maw */
    'SD06-008': {
      acti: [{
        id: 'spike', zone: 'BATTLE', once: true, label: "Prune 1 [Cabal] Character from RETREAT: 1 opponent's Character in BATTLE gets Power-500",
        can: A => cabalRet(A).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const pr = askPrune(A, cabalRet(A), '[Cabal] Character');
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-500)", from: oppBattle(A), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Telekinetic Spike')) t.forEach(i => A.mod(i, 'p', -500, 'Telekinetic Spike'));
        }
      }]
    },
    /* 「Cosmic Siphon」Supergiant */
    'SD06-009': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Cosmic Siphon',
        text: 'Prune 1 [Cabal] Character from your RETREAT to draw 1 card?',
        when: calledEnter,
        can: A => cabalRet(A).length > 0,
        run: A => { const pr = askPrune(A, cabalRet(A), '[Cabal] Character'); if (pr.length && A.prune(pr[0], 'Cosmic Siphon')) A.draw(A.p, 1); }
      }]
    },
    /* 「Red-Eyed Witch」Black Swan */
    'SD06-010': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Red-Eyed Witch',
        text: 'Prune 1 [Cabal] Character from your RETREAT to return 1 [Black Order] Character with a different name from your RETREAT to your HAND?',
        when: calledEnter,
        can: A => cabalRet(A).length > 0 && A.ret(A.p).some(i => isBlackOrder(A, i) && charName(A, i) !== charName(A, A.self)),
        run: A => {
          const pr = askPrune(A, cabalRet(A), '[Cabal] Character');
          const c = A.ask('c', { text: 'Choose 1 [Black Order] Character (not Black Swan) in your RETREAT to return to your HAND', from: A.ret(A.p).filter(i => !pr.includes(i) && isBlackOrder(A, i) && charName(A, i) !== charName(A, A.self)), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Red-Eyed Witch')) c.forEach(i => A.toHand(i, 'Red-Eyed Witch'));
        }
      }]
    },
    /* 「Swarm Assault」Chitauri Soldier */
    'SD06-011': {
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Swarm Assault',
        text: "Discard the top card of your Deck: 1 of your opponent's Characters in BATTLE gets Power-1000?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000)", from: oppBattle(A), prefer: 'high' });
          if (A.mill(A.p, 1, 'Swarm Assault').length) t.forEach(i => A.mod(i, 'p', -1000, 'Swarm Assault'));
        }
      }]
    },
    /* 「Colossal Ram」Leviathan */
    'SD06-012': {
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Colossal Ram',
        text: "Discard the top card of your Deck to move 1 of your opponent's Lv3-or-lower Characters from BATTLE to their BASE?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.opp(A.p)) > 0 && oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3-or-lower Characters in BATTLE to move to their BASE", from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          if (A.mill(A.p, 1, 'Colossal Ram').length) t.forEach(i => A.bbm(i, 'BASE', 'Colossal Ram'));
        }
      }]
    },
    /* 「Interstellar Crossing」War Envoy */
    'SD06-013': {
      auraCounter: (A, src, tgt) => inBattle(A, src) && A.tp !== A.ctrl(src) && A.owner(tgt) === A.ctrl(src) && A.zone(tgt) === 'HAND' && A.origLv(tgt) === 4 && isBlackOrder(A, tgt),
      auto: [{ stat: 'r', zone: 'BASE', value: (A, src, tgt) => A.ctrl(tgt) === A.ctrl(src) && A.slot(tgt) === 'F' ? 1 : 0 }]
    },
    /* 「Costly Reinforcement」Chitauri Chariot */
    'SD06-014': {
      trig: [{
        id: 'void', zone: 'VOID', label: 'Costly Reinforcement', when: voidByYou,
        can: A => A.deck(A.p).length > 0,
        run: A => { if (A.draw(A.p, 1).length) A.job.step2 = true; },
        after: A => { const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) }); d.forEach(i => A.discard(i, 'Costly Reinforcement')); }
      }]
    },
    /* 「Energy Reversal」Silver Surfer */
    'SD06-015': {
      trig: [{
        id: 'void', zone: 'VOID', label: 'Energy Reversal', when: voidByYou,
        can: A => oppBattle(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000)", from: oppBattle(A), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -1000, 'Energy Reversal'));
          if (t.length && A.zone(A.self) === 'VOID') A.toDeckBottom(A.self, 'Energy Reversal');
        }
      }]
    },
    /* 「Starship Command」Ronan */
    'SD06-016': {
      trig: [{
        id: 'void', zone: 'VOID', optional: true, label: 'Starship Command',
        text: 'Place 1 Lv2-or-lower [Cabal] Character from your VOID into your BATTLE?',
        when: voidByYou,
        can: A => A.emptySlots(A.p).length > 0 && A.voidOf(A.p).some(i => i !== A.self && A.origLv(i) <= 2 && isCabal(A, i) && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Lv2-or-lower [Cabal] Character in your VOID to place into your BATTLE', from: A.voidOf(A.p).filter(i => i !== A.self && A.origLv(i) <= 2 && isCabal(A, i) && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.emptySlots(A.p)));
          if (c.length && to) A.place(c[0], to, 'Starship Command');
        }
      }]
    },
    /* 「Quest for Allies」Adam Warlock */
    'SD06-017': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Quest for Allies',
        text: 'Discard the top card of your Deck (then you may return 1 [Cabal] Character from RETREAT to your HAND)?',
        when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => { if (A.mill(A.p, 1, 'Quest for Allies').length) A.job.step2 = true; },
        after: A => {
          const c = A.ask('c', { text: 'You may choose 1 [Cabal] Character in your RETREAT to return to your HAND', from: A.ret(A.p).filter(i => isCabal(A, i)), min: 0, max: 1, prefer: 'high' });
          c.forEach(i => A.toHand(i, 'Quest for Allies'));
        }
      }]
    },
    /* 「Unsealed Magic Burst」Adam Warlock */
    'SD06-018': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Unsealed Magic Burst',
        text: "Discard the top card of your Deck to retreat 1 of your opponent's Lv3-or-lower Characters with [ACTI] in BATTLE?",
        when: enterSelf,
        can: A => A.deck(A.p).length > 0 && oppBattle(A).some(i => A.lv(i) <= 3 && /ACTI/.test(A.text(i))),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3-or-lower Characters with [ACTI] in BATTLE to retreat", from: oppBattle(A).filter(i => A.lv(i) <= 3 && /ACTI/.test(A.text(i))), prefer: 'high' });
          if (A.mill(A.p, 1, 'Unsealed Magic Burst').length) t.forEach(i => A.retreat(i, 'Unsealed Magic Burst'));
        }
      }]
    },

    /* ============================ PB02 ============================ */
    /* 「Forced Regrowth」Groot */
    'PB02-001': {
      unique: true,
      acti: [{
        id: 'att', zone: 'FIELD', counter: true, once: true, label: 'Attach 1 [GOTG] Character from your RETREAT to this card',
        can: A => A.ret(A.p).some(i => isGotg(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [GOTG] Character in your RETREAT to attach to Groot', from: A.ret(A.p).filter(i => isGotg(A, i)), prefer: 'high' });
          c.forEach(i => A.attach(i, A.self));
        }
      }],
      trig: [{
        id: 'grow', zone: 'FIELD', once: true, optional: true, label: 'Forced Regrowth',
        text: "Discard 1 card from your HAND to put 1 of this card's Attached Cards into your BATTLE?",
        when: (e, self) => e.k === 'ATTACHED' && e.host === self,
        can: A => A.attached(A.self).length >= 2 && A.hand(A.p).length > 0 && A.emptySlots(A.p).length > 0,
        run: A => {
          const a = A.ask('a', { text: "Choose 1 of Groot's Attached Cards to put into your BATTLE", from: A.attached(A.self), prefer: 'high' });
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.emptySlots(A.p)));
          if (d.length && A.discard(d[0], 'Forced Regrowth') && a.length && to) A.detachToBattle(a[0], to, 'Forced Regrowth');
        }
      }]
    },
    /* 「Sweet and Obedient」Goose */
    'PB02-002': {
      unique: true,
      counter: (A, self) => A.voidOf(A.owner(self)).some(i => nameHas(A, i, 'Nick Fury') || nameHas(A, i, 'Captain Marvel')),
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Sweet and Obedient',
        text: "Attach 1 of your opponent's Lv3-or-lower Characters in BATTLE to this card?",
        when: enterSelf,
        can: A => rpOf(A, A.p) < rpOf(A, A.opp(A.p)) && oppBattle(A).some(i => A.lv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3-or-lower Characters in BATTLE to attach to Goose", from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' });
          if (inField(A, A.self)) t.forEach(i => A.attach(i, A.self));
        }
      }]
    },
    /* 「Ace Rescue」The Milano */
    'PB02-003': {
      unique: true,
      auto: [
        { stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.attached(src).reduce((s, a) => s + A.origLv(a), 0) : 0 },
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? 1000 * A.attached(src).reduce((s, a) => s + A.origLv(a), 0) : 0 }
      ],
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Ace Rescue',
        text: 'Place this card from your HAND into your FIELD and attach that [GOTG] Character to it?',
        when: (e, self, A) => e.ctrl === A.owner(self) && lostOrOpp(A, e) && isGotg(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && A.zone(ev(A).c) === 'RETREAT' && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose where to place The Milano', slotOpts(A, A.spots(A.p)));
          if (to && A.place(A.self, to, 'Ace Rescue') && A.zone(ev(A).c) === 'RETREAT') A.attach(ev(A).c, A.self);
        }
      }]
    },
    /* 「Count Me In」Gamora — tidak bisa di-CALL */
    'PB02-004': {
      noCall: true,
      acti: [{
        id: 'hand', zone: 'HAND', label: 'Total Power in your BATTLE is 6500: place this card into your BATTLE',
        can: A => battlePower(A, A.p) === 6500 && A.emptySlots(A.p).length > 0 && A.canPlace(A.self, A.p),
        run: A => { const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.emptySlots(A.p))); if (to) A.place(A.self, to, 'Count Me In'); }
      }]
    },
    /* 「Weakness Analysis」Nebula */
    'PB02-005': {
      auraAbil: (A, src, tgt) => (A.slot(src) === 'B' && A.ctrl(tgt) === A.ctrl(src) && A.slot(tgt) === 'F' && isGotg(A, tgt) ? ['air'] : [])
    },
    /* 「Star-Vein Sensing」Rocket Raccoon */
    'PB02-006': {
      acti: [{
        id: 'top', zone: 'BASE', once: true, label: 'Reveal the top card of your Deck (Lv2 [GOTG] → HAND, otherwise discard it)',
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const i = A.deck(A.p)[0]; A.reveal(i);
          if (A.origLv(i) === 2 && isGotg(A, i)) A.toHand(i, 'Star-Vein Sensing'); else A.mill(A.p, 1, 'Star-Vein Sensing');
        }
      }]
    },
    /* 「Dance of Distraction」Star-Lord */
    'PB02-007': {
      unique: true,
      restrict: (A, src, tgt) => {
        if (!inBattle(A, src)) return null;
        if (tgt === src) return { move: true };
        const p = A.ctrl(src);
        if (A.ctrl(tgt) !== p && A.slot(tgt) === 'B' && A.battleChars(p).some(i => i !== src && isGotg(A, i))) return { atk: true, move: true };
        return null;
      }
    },
    /* 「Bond of Life and Death」Rocket Raccoon */
    'PB02-008': {
      trig: [{
        id: 'enter', zone: 'FIELD', optional: true, label: 'Bond of Life and Death',
        text: 'Discard the top 3 cards of your Deck to return 1 [GOTG] Character with a different name from your RETREAT to your HAND?',
        when: enterSelf,
        can: A => A.deck(A.p).length >= 3,
        run: A => { if (A.mill(A.p, 3, 'Bond of Life and Death').length === 3) A.job.step2 = true; },
        after: A => {
          const c = A.ask('c', { text: 'Choose 1 [GOTG] Character (not Rocket Raccoon) in your RETREAT to return to your HAND', from: A.ret(A.p).filter(i => isGotg(A, i) && charName(A, i) !== charName(A, A.self)), prefer: 'high' });
          c.forEach(i => A.toHand(i, 'Bond of Life and Death'));
        }
      }]
    },
    /* 「Soulshatter Frenzy」Drax */
    'PB02-009': {
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Soulshatter Frenzy',
        text: "Prune 1 Character from your opponent's RETREAT: 1 of their Characters in BATTLE gets Power-X (X = the pruned card's Power)?",
        when: enterSelf,
        can: A => A.ret(A.opp(A.p)).length > 0 && oppBattle(A).length > 0,
        run: A => {
          const pr = A.ask('pr', { text: "Choose 1 Character in your opponent's RETREAT to Prune", from: A.ret(A.opp(A.p)), prefer: 'high' });
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power- the pruned card's Power)", from: oppBattle(A), prefer: 'high' });
          const X = pr.length ? A.origP(pr[0]) : 0;
          if (pr.length && A.prune(pr[0], 'Soulshatter Frenzy') && X > 0) t.forEach(i => A.mod(i, 'p', -X, 'Soulshatter Frenzy'));
        }
      }]
    },
    /* 「Emotional Control」Mantis */
    'PB02-010': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => {
        const p = A.ctrl(src);
        if (A.ctrl(tgt) === p || A.slot(tgt) !== 'F') return 0;
        return A.chars(p).some(i => nameHas(A, i, 'Star-Lord')) ? 1 : -1;
      } }]
    },
    /* 「Power of the Stones」Thanos */
    'PB02-011': {
      unique: true,
      trig: [{
        id: 'oppenter', zone: 'FIELD', once: true, optional: true, label: 'Power of the Stones',
        text: "Prune 3 Characters from your RETREAT to Prune 1 of your opponent's Characters in BATTLE?",
        when: (e, self, A) => oppEnters(e, self, A) && A.tp === A.ctrl(self),
        can: A => rpOf(A, A.p) >= 6 && A.ret(A.p).length >= 3 && oppBattle(A).length > 0,
        run: A => {
          const pr = A.ask('pr', { text: 'Choose 3 Characters in your RETREAT to Prune', from: A.ret(A.p), min: 3, max: 3, prefer: 'low' });
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE to Prune", from: oppBattle(A), prefer: 'high' });
          let n = 0; pr.forEach(i => { if (A.prune(i, 'Power of the Stones')) n++; });
          if (n === 3) t.forEach(i => A.prune(i, 'Power of the Stones'));
        }
      }]
    },
    /* 「Photon Burst」Captain Marvel */
    'PB02-012': {
      trig: [{
        id: 'atk', zone: 'BATTLE', once: true, optional: true, label: 'Photon Burst',
        text: 'Prune 1 Character from your RETREAT: the Attack Target gets Power-2000?',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => A.ret(A.p).length > 0 && !!A.cur() && !!A.cur().tg,
        run: A => {
          const pr = askPrune(A, A.ret(A.p), 'Character');
          const c = A.cur(), tg = c && c.tg;
          if (pr.length && A.prune(pr[0], 'Photon Burst') && tg && inBattle(A, tg)) A.mod(tg, 'p', -2000, 'Photon Burst');
        }
      }]
    },
    /* 「Binary Burst」Captain Marvel */
    'PB02-013': {
      borrows: true,
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src ? 1000 * A.ret(A.ctrl(src)).filter(i => nameHas(A, i, 'Captain Marvel')).length : 0 }],
      acti: [{
        id: 'borrow', zone: 'BATTLE', once: true, label: 'Gain the effects of 1 [Captain Marvel] in your RETREAT this turn',
        can: A => A.ret(A.p).some(i => nameHas(A, i, 'Captain Marvel') && A.no(i) !== A.no(A.self)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Character with [Captain Marvel] in its name in your RETREAT', from: A.ret(A.p).filter(i => nameHas(A, i, 'Captain Marvel') && A.no(i) !== A.no(A.self)), prefer: 'high' });
          c.forEach(i => A.borrow(A.self, A.no(i), 'Binary Burst'));
        }
      }]
    },
    /* 「The Accuser」Ronan */
    'PB02-014': {
      auto: [
        { stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => { if (tgt !== src) return 0; const n = A.base(A.ctrl(src)).length; return n <= 2 ? n : 0; } },
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => { if (tgt !== src) return 0; const n = A.base(A.ctrl(src)).length; return n > 2 ? n * 1000 : 0; } }
      ]
    },
    /* 「Reverse Metabolism」High Evolutionary */
    'PB02-015': {
      acti: [{
        id: 'lv', zone: 'FIELD', once: true, label: 'Prune 1 Character from your RETREAT: 1 Character on the FIELD gets Lv-1',
        can: A => A.ret(A.p).length > 0 && A.allChars().length > 0,
        run: A => {
          const pr = askPrune(A, A.ret(A.p), 'Character');
          const t = A.ask('t', { text: 'Choose 1 Character on the FIELD (Lv-1 this turn)', from: A.allChars(), prefer: 'high' });
          if (pr.length && A.prune(pr[0], 'Reverse Metabolism')) t.forEach(i => A.mod(i, 'lv', -1, 'Reverse Metabolism'));
        }
      }]
    },
    /* 「Power Combo」Captain Marvel */
    'PB02-016': {
      trig: [{
        id: 'atk', zone: 'BATTLE', once: true, optional: true, label: 'Power Combo',
        text: 'Prune 1 Character from your RETREAT: this card gets [DOUBLE ATTACK] this turn?',
        when: (e, self) => e.k === 'ATTACK' && e.a === self,
        can: A => A.ret(A.p).length > 0,
        run: A => { const pr = askPrune(A, A.ret(A.p), 'Character'); if (pr.length && A.prune(pr[0], 'Power Combo') && inBattle(A, A.self)) A.grant(A.self, 'double', '[DOUBLE ATTACK]'); }
      }]
    },
    /* 「Iron-Fisted Rule」Thanos */
    'PB02-017': {
      unique: true, counter: true,
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Iron-Fisted Rule',
        text: "Prune 1 purple Character from your RETREAT: all of your opponent's Characters in BATTLE get Power-500?",
        when: calledEnter,
        can: A => purpleRet(A).length > 0 && oppBattle(A).length > 0,
        run: A => { const pr = askPrune(A, purpleRet(A), 'purple Character'); if (pr.length && A.prune(pr[0], 'Iron-Fisted Rule')) oppBattle(A).forEach(i => A.mod(i, 'p', -500, 'Iron-Fisted Rule')); }
      }]
    },
    /* 「Mind Resonance」Yondu — sekali per giliran, +1 kali bila Lv sama */
    'PB02-018': {
      acti: [{
        id: 'mind', zone: 'BATTLE', label: "Prune 1 Character from RETREAT: Prune 1 of your opponent's set cards in the BASE at random",
        can: A => {
          const g = A.st.inst[A.self].gr || {};
          const used = g.yonduT === A.turn ? g.yonduN || 0 : 0, extra = g.yonduX === A.turn;
          return (used === 0 || (used === 1 && extra)) && A.ret(A.p).length > 0 && A.set(A.opp(A.p)).length > 0;
        },
        run: A => {
          const pr = askPrune(A, A.ret(A.p), 'Character');
          if (!pr.length) return;
          const lv = A.origLv(pr[0]);
          const x = A.st.inst[A.self];
          if (!A.prune(pr[0], 'Mind Resonance')) return;
          x.gr = x.gr || {};
          const first = x.gr.yonduT !== A.turn;
          x.gr.yonduN = (x.gr.yonduT === A.turn ? x.gr.yonduN || 0 : 0) + 1; x.gr.yonduT = A.turn;
          const sets = A.set(A.opp(A.p)); if (!sets.length) return;
          const t = sets[A.rand(sets.length)];
          A.log('Mind Resonance: a random set card is Pruned: ' + A.name(t) + ' (Lv' + A.origLv(t) + ').');
          const same = A.origLv(t) === lv;
          A.prune(t, 'Mind Resonance');
          if (first && same) { x.gr.yonduX = A.turn; A.log('Mind Resonance: same Lv (' + lv + '), the effect can be activated 1 more time this turn.'); }
        }
      }]
    },
    /* 「Grunt Turned Godslayer」Yondu */
    'PB02-019': {
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Grunt Turned Godslayer',
        text: "Prune 1 Character from your RETREAT (if this is the only card in your BATTLE: retreat all of your opponent's Lv1 Characters on the FIELD)?",
        when: enterSelf,
        can: A => A.ret(A.p).length > 0,
        run: A => {
          const pr = askPrune(A, A.ret(A.p), 'Character');
          if (pr.length && A.prune(pr[0], 'Grunt Turned Godslayer') && A.battle(A.p).length === 1 && inBattle(A, A.self))
            A.chars(A.opp(A.p)).filter(i => A.lv(i) === 1).forEach(i => A.retreat(i, 'Grunt Turned Godslayer'));
        }
      }]
    },
    /* 「Indecision」Adam Warlock */
    'PB02-020': {
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Indecision', when: enterSelf,
        can: A => A.battleChars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in BATTLE (R+1, Power+1000)', from: A.battleChars(A.p), prefer: 'high' });
          t.forEach(i => { A.mod(i, 'r', 1, 'Indecision'); A.mod(i, 'p', 1000, 'Indecision'); });
        }
      }]
    },
    /* 「Dream Bubble」Mary Jane Watson */
    'PB02-021': {
      unique: true, counter: true,
      auto: [{ stat: 'p', zone: 'BACK', value: (A, src, tgt) => A.tp !== A.ctrl(src) && A.ctrl(tgt) === A.ctrl(src) && A.slot(tgt) === 'F' && hasTrait(A, tgt, 'Web') ? 1000 : 0 }],
      acti: [{
        id: 'prune', zone: 'BASE', once: true, label: 'Prune 1 [Human] Character from your RETREAT',
        can: A => A.ret(A.p).some(i => isHuman(A, i)),
        run: A => { const pr = askPrune(A, A.ret(A.p).filter(i => isHuman(A, i)), '[Human] Character'); pr.forEach(i => A.prune(i, 'Dream Bubble')); }
      }]
    }
  };

  S.registerCards(DEFS);
  if (isNode) module.exports = DEFS;
  else root.MHRCardDefsT6 = DEFS;
})(typeof window !== 'undefined' ? window : this);
