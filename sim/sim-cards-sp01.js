/* ===================================================================
   MHR BATTLE SIM — RESOLVER TAHAP 5: SP01 Era of Spiders (sim-cards-sp01.js)      v0.12
   ===================================================================
   Dibuat dari TEKS INGGRIS (e_en) di cards.js, format sama dengan sim-cards.js / sim-cards-bp01.js.
   - 80 kartu SP01-001…080. SP01-065 = EB01-014 (K-36, resolver di sim-cards-s4.js).
   - Text Differences situs diikuti: TD-03 (Shocker: hanya "by calling"), TD-07 (Iron Man: "Buster"), TD-08 (Kingpin:
     "Archenemy"), TD-09 (Kraven: jumlah kemampuan), TD-10 (Boomerang: ONCE PER TURN, draw tidak opsional); errata
     E-13 (Vigil: "1 of your card"), E-14 (Mr. Negative: semua kartu BASE dibalik, karakter ditutup dulu).
   - Ruling komunitas yang dipakai: FAQ-02…07, FAQ-11 (Anti-Venom, Black Panther, Lasher/Shocker, Vigil, Black Cat).
   Bacaan yang belum pasti ditandai "RS-055…" (ruling-simulator.md, sementara) dan ditanyakan sebagai K-37…
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;
  if (isNode) require('./sim-cards-s4.js');                       // SP01-065 = EB01-014

  const RED = 'Merah', YELLOW = 'Kuning';
  const traits = (A, i) => A.trait(i).split('/').map(x => x.trim());
  const hasTrait = (A, i, t) => traits(A, i).includes(t);
  const isHuman = (A, i) => hasTrait(A, i, 'Human');
  const isWeb = (A, i) => hasTrait(A, i, 'Web');
  const isMachine = (A, i) => hasTrait(A, i, 'Machine');
  const isSymbiote = (A, i) => hasTrait(A, i, 'Symbiote');
  const isMultiverse = (A, i) => hasTrait(A, i, 'Multiverse');
  const charName = (A, i) => A.name(i).replace(/^「[^」]*」\s*/, '');
  const nameHas = (A, i, n) => charName(A, i).includes(n);
  const fullNameHas = (A, i, n) => A.name(i).includes(n);              // "Spider-Archenemy" ada di julukan 「…」
  const isArchenemy = (A, i) => fullNameHas(A, i, 'Archenemy');
  const ev = A => (A.job && A.job.ev) || {};
  const slotOpts = (A, spots) => spots.map(v => ({ v, label: A.spotLabel(v) }));
  const SL = ['F', 'W1', 'W2', 'B'];
  const ordSlots = list => SL.filter(s => list.includes(s)).concat(list.includes('BASE') ? ['BASE'] : []);
  const oppBattle = A => A.battleChars(A.opp(A.p));
  const oppChars = A => A.chars(A.opp(A.p));
  const inField = (A, i) => { const L = A.loc(i); return !!L && (L.zone === 'bat' || L.zone === 'base' || L.zone === 'att'); };
  const inBattle = (A, i) => { const L = A.loc(i); return !!L && L.zone === 'bat'; };
  const host = A => A.host(A.self);
  const weak = A => A.emptySlots(A.p).length > 0;                       // "If you have any Weaknesses" (CR 301.20)
  // Karakter terbuka + semua kartu terpasang di FIELD pemain p.
  const fieldAll = (A, p) => { const out = []; A.chars(p).forEach(i => { out.push(i); A.attached(i).forEach(a => out.push(a)); }); return out; };
  const attachedOn = (A, p) => { const out = []; A.chars(p).forEach(i => A.attached(i).forEach(a => out.push(a))); return out; };
  const machineOnField = (A, except) => fieldAll(A, 0).concat(fieldAll(A, 1)).some(i => i !== except && isMachine(A, i));
  const pruneTop = (A, p, n, why) => { let k = 0; A.deck(p).slice(0, n).forEach(i => { if (A.prune(i, why)) k++; }); return k; };
  // Event pemicu umum.
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const calledEnter = (e, self) => e.k === 'ENTER' && e.c === self && (e.how === 'call' || e.how === 'ccall');   // "enters the field by calling"
  const attachedSelf = (e, self) => e.k === 'ATTACHED' && e.c === self;
  const hostAttacks = (e, self, A) => e.k === 'ATTACK' && !!A.host(self) && e.a === A.host(self);
  const followRet = (e, self) => e.k === 'RETREATED' && e.c === self && e.cause === 'follow';            // "follows … and enters RETREAT"
  const lostFightRet = (e, self) => e.k === 'RETREATED' && e.c === self && e.fromZone === 'bat' && (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE');   // RS-034
  const bbmSelf = (e, self) => e.k === 'BBMOVE' && e.c === self;
  const voidSelf = (e, self) => e.k === 'VOIDED' && e.c === self;
  // Tempat untuk "place … onto your BATTLE": area kosong + area yang dikosongkan oleh biaya efek yang sama.
  const battleSpots = (A, freed) => ordSlots(A.emptySlots(A.p).concat((freed || []).filter(Boolean)));
  const fieldSpots = (A, freed, freedBase) => {
    const out = A.emptySlots(A.p).concat((freed || []).filter(Boolean));
    if (A.baseRoom(A.p) > 0 || freedBase) out.push('BASE');
    return ordSlots(out);
  };
  // UNIQUE saja (tempat bisa dikosongkan oleh biaya efek yang sama).
  const uniqOk = A => !S.uniqueBlocked(A.st, A.self, A.p);
  const lvMod = (A, i, X, why) => { A.mod(i, 'lv', X, why); A.mod(i, 'r', X, why); A.mod(i, 'p', X * 1000, why); };

  const DEFS = {
    /* ============================ MERAH (001–020) ============================ */
    /* 「Spider-Archenemy」Carnage */
    'SP01-001': {
      unique: true,
      trig: [{
        id: 'ret', zone: 'RETREAT', optional: true, label: 'Carnage (RETREAT)',
        text: 'Discard 1 card from your HAND to attach Carnage from RETREAT to 1 of your Characters with original Lv5 or below and [Human]?',
        when: (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field',
        can: A => A.hand(A.p).length > 0 && A.chars(A.p).some(i => A.origLv(i) <= 5 && isHuman(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p), prefer: 'low' });
          const h = A.ask('h', { text: 'Choose 1 of your Characters with original Lv5 or below and [Human] to attach Carnage to', from: A.chars(A.p).filter(i => A.origLv(i) <= 5 && isHuman(A, i)), prefer: 'high' });
          if (A.discard(d[0], 'Carnage') && A.zone(A.self) === 'RETREAT' && h.length && inField(A, h[0])) A.attach(A.self, h[0]);
        }
      }, {
        id: 'att', zone: 'BATTLE', label: 'Carnage',
        when: (e, self, A) => attachedSelf(e, self) && inBattle(A, e.host),
        can: A => oppBattle(A).length > 0,
        run: A => {
          const low = Math.min.apply(null, oppBattle(A).map(i => A.pw(i)));
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters with the lowest Power in BATTLE (Power-2000 this turn)", from: oppBattle(A).filter(i => A.pw(i) === low) });
          t.forEach(i => A.mod(i, 'p', -2000, 'Carnage'));
        }
      }]
    },
    /* 「Spider-Archenemy」Mysterio — "would have a card attached" = saat dipasangi (FAQ-04). */
    'SP01-002': {
      unique: true,
      trig: [{
        id: 'att', zone: 'BATTLE', once: true, label: 'Mysterio',
        when: (e, self) => e.k === 'ATTACHED' && e.host === self,
        can: A => A.hand(A.p).some(i => A.color(i) === RED),
        run: A => {
          const c = A.ask('c', { text: 'Reveal 1 red Character in your HAND (placed into BATTLE if it has the same Lv as Mysterio)', from: A.hand(A.p).filter(i => A.color(i) === RED), prefer: 'high' });
          const same = c.length && A.lv(c[0]) === A.lv(A.self) && inBattle(A, A.self);
          const to = same ? A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A))) : null;
          c.forEach(i => A.reveal(i));
          if (same && to) A.place(c[0], to, 'Mysterio');
        }
      }]
    },
    /* 「Phoenix Host」Jean Grey */
    'SP01-003': {
      unique: true,
      acti: [{
        id: 'phoenix', zone: 'RETREAT', label: 'Retreat 1 of your Lv6 Characters in BATTLE: place this card from RETREAT onto your FIELD',
        can: A => A.battleChars(A.p).length < oppBattle(A).length && A.battleChars(A.p).some(i => A.lv(i) === 6) && uniqOk(A),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Lv6 Characters in BATTLE to Retreat', from: A.battleChars(A.p).filter(i => A.lv(i) === 6) });
          const to = A.pick('to', 'Choose where to place 「Phoenix Host」Jean Grey', slotOpts(A, fieldSpots(A, [A.slot(c[0])])));
          if (A.retreat(c[0], 'Phoenix Host') && to) A.place(A.self, to, 'Phoenix Host');
        }
      }],
      trig: [{
        id: 'enter', zone: 'BATTLE', label: 'Phoenix Host',
        when: (e, self) => enterSelf(e, self) && e.from === 'ret',
        can: A => oppBattle(A).some(i => A.lv(i) === 6),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv6 Characters in BATTLE to Retreat", from: oppBattle(A).filter(i => A.lv(i) === 6), prefer: 'high' });
          const h = A.ask('h', { text: 'Choose 1 card in your HAND to put on the bottom of your Deck', from: A.hand(A.p), prefer: 'low' });
          if (t.length && A.retreat(t[0], 'Phoenix Host')) {
            h.forEach(i => A.toDeckBottom(i, 'Phoenix Host'));
            A.setNoCost(A.self, 'Phoenix Host');
          }
        }
      }]
    },
    /* 「Supreme Assassin」Elektra — Trigger Hand. */
    'SP01-004': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Supreme Assassin',
        text: 'Place Elektra from your HAND onto your BATTLE?',
        when: (e, self, A) => e.k === 'ENTER' && e.p === A.opp(A.p) && A.lv(e.c) <= 3 && isHuman(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && weak(A) && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          const c = ev(A).c;
          if (to && A.place(A.self, to, 'Supreme Assassin') && A.chars(A.p).some(i => nameHas(A, i, 'Daredevil')) && inField(A, c)) A.prune(c, 'Supreme Assassin');
        }
      }, {
        id: 'ret', zone: 'RETREAT', label: 'Supreme Assassin (RETREAT)',
        when: (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field' && e.by != null,
        can: A => A.chars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in the field (R+1 this turn)', from: A.chars(A.p), prefer: 'high' });
          t.forEach(i => A.mod(i, 'r', 1, 'Supreme Assassin'));
        }
      }]
    },
    /* 「Endgame Battle」Iron Man — TD-07: "Buster" di nama. */
    'SP01-005': {
      unique: true,
      acti: [{
        id: 'endgame', zone: 'HAND', counter: true, label: 'Retreat all your [Buster] cards in the field: place this card from HAND onto your BATTLE',
        can: A => weak(A) && fieldAll(A, A.p).some(i => nameHas(A, i, 'Buster')) && A.canPlace(A.self, A.p),
        run: A => {
          const b = fieldAll(A, A.p).filter(i => nameHas(A, i, 'Buster'));
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A, b.map(i => A.slot(i)))));
          let n = 0; b.forEach(i => { if (!inField(A, i) || A.retreat(i, 'Endgame Battle')) n++; });
          if (n === b.length && to) A.place(A.self, to, 'Endgame Battle');
        }
      }],
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.ret(A.p).filter(i => nameHas(A, i, 'Buster')).length * 1000 : 0 }]
    },
    /* 「Spider-Archenemy」Red Goblin — F-30: boleh dipakai walau lawan tidak punya LvX. */
    'SP01-006': {
      acti: [{
        id: 'goblin', zone: 'BATTLE', once: true, label: 'Prune this card and 1 other card on your field: Prune 1 opponent Character with Lv X in BATTLE',
        can: A => fieldAll(A, A.p).some(i => i !== A.self),
        run: A => {
          const o = A.ask('o', { text: 'Choose 1 other Character or attached card on your field to Prune', from: fieldAll(A, A.p).filter(i => i !== A.self), prefer: 'low' });
          const X = A.lv(A.self) + A.lv(o[0]);
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters with Lv" + X + ' in BATTLE to Prune', from: oppBattle(A).filter(i => A.lv(i) === X), prefer: 'high' });
          // Kalau kartu lain itu induk Red Goblin (Red Goblin terpasang), Red Goblin di-prune dulu supaya tidak ikut ke VOID.
          const first = A.host(A.self) === o[0] ? [A.self, o[0]] : [o[0], A.self];
          const ok1 = A.prune(first[0], 'Red Goblin'), ok2 = A.prune(first[1], 'Red Goblin');
          if (ok1 && ok2) t.forEach(i => A.prune(i, 'Red Goblin'));
        }
      }]
    },
    /* 「Spider-Companion」Spinneret */
    'SP01-007': {
      hostAbil: () => ['assault'],
      auto: [{ stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt && isWeb(A, tgt) ? 1 : 0 }],
      acti: [{
        id: 'boost', zone: 'FIELD', counter: true, once: true, label: '1 of your Characters gets Power+2000: then this card Retreats',
        can: A => A.chars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in the field (Power+2000 this turn)', from: A.chars(A.p), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', 2000, 'Spinneret'));
          if (t.length) A.retreat(A.self, 'Spinneret');
        }
      }]
    },
    /* 「Spider-Companion」Silver Sablinova */
    'SP01-008': {
      unique: true,
      trig: [{
        id: 'ret', zone: 'FIELD', once: true, optional: true, label: 'Silver Sablinova',
        text: 'Retreat 1 of your cards in BASE to draw 1 card?',
        when: (e, self, A) => e.k === 'RETREATED' && e.from === 'field' && e.fromZone !== 'att' && !e.fd && e.ctrl === A.p && isHuman(A, e.c),
        can: A => A.base(A.p).length > 0,
        run: A => {
          const b = A.ask('b', { text: 'Choose 1 of your cards in BASE to Retreat', from: A.base(A.p), prefer: 'low' });
          if (A.retreat(b[0], 'Silver Sablinova')) A.draw(A.p, 1);
        }
      }]
    },
    /* 「Spider-Ally」Black Panther — FAQ-04/05: TRIG = "dipasangi oleh efeknya sendiri". */
    'SP01-009': {
      acti: [{
        id: 'move', zone: 'BATTLE', once: true, label: 'Attach 1 attached card to this card, or 1 of its attached cards to another Character in your BATTLE',
        can: A => attachedOn(A, A.p).some(a => A.host(a) !== A.self) || (A.attached(A.self).length > 0 && A.battleChars(A.p).some(i => i !== A.self)),
        run: A => {
          const opts = [];
          if (attachedOn(A, A.p).some(a => A.host(a) !== A.self)) opts.push({ v: 'in', label: 'Attach 1 of your attached cards to this card' });
          if (A.attached(A.self).length && A.battleChars(A.p).some(i => i !== A.self)) opts.push({ v: 'out', label: "Attach 1 of this card's attached cards to another Character in your BATTLE" });
          const m = A.pick('m', 'Choose one', opts);
          if (m === 'in') {
            const c = A.ask('c', { text: 'Choose 1 of your attached cards to attach to Black Panther', from: attachedOn(A, A.p).filter(a => A.host(a) !== A.self), prefer: 'high' });
            c.forEach(i => A.attach(i, A.self));
          } else if (m === 'out') {
            const c = A.ask('c', { text: "Choose 1 of Black Panther's attached cards", from: A.attached(A.self) });
            const h = A.ask('h', { text: 'Choose 1 other Character in your BATTLE to attach it to', from: A.battleChars(A.p).filter(i => i !== A.self), prefer: 'high' });
            if (c.length && h.length) A.attach(c[0], h[0]);
          }
        }
      }],
      trig: [{
        id: 'mill', zone: 'BATTLE', label: 'Spider-Ally Black Panther',
        when: (e, self) => e.k === 'ATTACHED' && e.host === self && e.jsrc === self,
        can: A => A.deck(A.opp(A.p)).length > 0,
        run: A => A.mill(A.opp(A.p), 2, 'Black Panther')
      }]
    },
    /* 「Spider-Ally」Jessica Jones — kartu acak: diambil setelah semua pertanyaan (run), pilihan sesudahnya di after(). */
    'SP01-010': {
      unique: true,
      acti: [{
        id: 'reveal', zone: 'BATTLE', once: true, label: "Reveal 1 random card in your opponent's HAND: place 1 Character with the same Lv from RETREAT face-down into your BASE",
        can: A => A.handCount(A.opp(A.p)) > 0,
        run: (A, job) => {
          const h = A.hand(A.opp(A.p));
          job.rv = h[A.rand(h.length)];
          A.reveal(job.rv);
          job.step2 = true;
        },
        after: (A, job) => {
          const lv = A.origLv(job.rv);
          if (A.baseRoom(A.p) <= 0) return;
          const c = A.ask('c', { text: 'Choose 1 of your Lv' + lv + ' Characters in RETREAT to place face-down into your BASE', from: A.ret(A.p).filter(i => A.origLv(i) === lv) });
          c.forEach(i => A.toBaseFd(i, 'RETREAT'));
        }
      }]
    },
    /* 「Rage Release」Hulk */
    'SP01-011': {
      acti: [{
        id: 'rage', zone: 'BATTLE', once: true, label: 'Discard X cards (X = opponent Characters in BATTLE): Lv+X, R+X, Power+X000',
        can: A => { const X = oppBattle(A).length; return X > 0 && A.hand(A.p).length >= X; },
        run: A => {
          const X = oppBattle(A).length;
          const d = A.ask('d', { text: 'Choose ' + X + ' card(s) in your HAND to discard', from: A.hand(A.p), min: X, max: X, prefer: 'low' });
          let n = 0; d.forEach(i => { if (A.discard(i, 'Rage Release')) n++; });
          if (n === X) lvMod(A, A.self, X, 'Rage Release');
        }
      }]
    },
    /* 「Spider-Ally」Magik */
    'SP01-012': {
      unique: true,
      acti: [{
        id: 'magik', zone: 'BATTLE', once: true, label: 'Retreat 1 of your [Human] Characters in BATTLE: if you have fewer Characters in BATTLE, Prune 1 opponent Lv3 or lower',
        can: A => A.battleChars(A.p).some(i => isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your [Human] Characters in BATTLE to Retreat', from: A.battleChars(A.p).filter(i => isHuman(A, i)), prefer: 'low' });
          const fewer = A.battleChars(A.p).length - 1 < oppBattle(A).length;
          const t = fewer ? A.ask('t', { text: "Choose 1 of your opponent's Lv3 or lower Characters in BATTLE to Prune", from: oppBattle(A).filter(i => A.lv(i) <= 3), prefer: 'high' }) : [];
          if (A.retreat(c[0], 'Magik') && A.battleChars(A.p).length < oppBattle(A).length) t.forEach(i => A.prune(i, 'Magik'));
        }
      }]
    },
    /* 「Spider-Ally」Tony Stark — per Karakter Lv6 di FIELD Anda, setiap pengurangan Power dikurangi 500 (RS-055). */
    'SP01-013': {
      redCut: { zone: 'BACK', value: A => 500 * A.chars(A.p).filter(i => A.lv(i) === 6).length }
    },
    /* 「Shadow Rescue」Spider-Girl */
    'SP01-014': {
      trig: [{
        id: 'follow', zone: 'RETREAT', label: 'Shadow Rescue',
        when: followRet,
        can: A => A.baseRoom(A.p) > 0 && A.ret(A.p).concat(A.voidOf(A.p)).some(i => i !== A.self && A.origLv(i) <= 3 && isWeb(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Lv3 or lower [Web] Characters in RETREAT or VOID to place into your BASE', from: A.ret(A.p).concat(A.voidOf(A.p)).filter(i => i !== A.self && A.origLv(i) <= 3 && isWeb(A, i)), prefer: 'high' });
          c.forEach(i => A.place(i, 'BASE', 'Shadow Rescue'));
        }
      }],
      acti: [{
        id: 'rescue', zone: 'HAND', label: 'Discard this card: return 1 of your set cards in BASE to your HAND',
        can: () => true,                                             // RS-022
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your set cards (Face-Down Cards) in BASE to return to your HAND', from: A.set(A.p) });
          if (A.discard(A.self, 'Shadow Rescue')) s.forEach(i => A.setToHand(i, 'Shadow Rescue'));
        }
      }]
    },
    /* 「Thread of Fate」Annie Parker */
    'SP01-015': {
      unique: true,
      trig: [{
        id: 'atk', zone: 'BATTLE', optional: true, label: 'Thread of Fate', text: "Prune the top card of each player's Deck?",
        when: hostAttacks,
        run: A => { pruneTop(A, A.p, 1, 'Thread of Fate'); pruneTop(A, A.opp(A.p), 1, 'Thread of Fate'); }
      }, {
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Thread of Fate (enter)', text: "Prune the top 3 cards of each player's Deck?",
        when: (e, self, A) => e.k === 'ENTER' && e.c === self && !!e.jsrc && isWeb(A, e.jsrc),
        run: A => { pruneTop(A, A.p, 3, 'Thread of Fate'); pruneTop(A, A.opp(A.p), 3, 'Thread of Fate'); }
      }]
    },
    /* 「Spider-Ally」Luke Cage */
    'SP01-016': {
      trig: [{
        id: 'base', zone: 'BATTLE', once: true, label: 'Spider-Ally Luke Cage',
        when: (e, self, A) => e.k === 'BASE_UP' && e.p === A.p,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in the field (Power-500 this turn)", from: oppChars(A), prefer: 'high' });
          A.mod(A.self, 'r', 1, 'Luke Cage');
          t.forEach(i => A.mod(i, 'p', -500, 'Luke Cage'));
        }
      }]
    },
    /* 「Spider-Archenemy」Sandman — tanpa efek */
    'SP01-017': {},
    /* 「Spider-Archenemy」Kraven the Hunter — TD-09: jumlah kemampuan Karakter lawan di BATTLE. "In Battle Phase" = Battle Phase siapa pun. */
    'SP01-018': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src && A.phase === 'battle' ? A.battleChars(A.opp(A.p)).reduce((s, i) => s + A.abilities(i), 0) * 1000 : 0 }]
    },
    /* 「Spider-Companion」Silver Sable */
    'SP01-019': {
      acti: [{
        id: 'sable', zone: 'WING', once: true, label: 'Retreat this card and 1 other R2+ Character on your WING: Retreat 1 opponent Lv5 or lower on WING or BACK',
        can: A => A.wings(A.p).some(i => i !== A.self && !A.isFd(i) && A.r(i) >= 2),
        run: A => {
          const o = A.ask('o', { text: 'Choose 1 other Character with R2 or above on your WING to Retreat', from: A.wings(A.p).filter(i => i !== A.self && A.r(i) >= 2) });
          const op = A.opp(A.p);
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv5 or lower Characters on WING or BACK to Retreat", from: A.wings(op).concat([A.at(op, 'B')]).filter(i => i && A.lv(i) <= 5), prefer: 'high' });
          const a = A.retreat(A.self, 'Silver Sable'), b = A.retreat(o[0], 'Silver Sable');
          if (a && b) t.forEach(i => A.retreat(i, 'Silver Sable'));
        }
      }]
    },
    /* 「Spider-Archenemy」Tarantula */
    'SP01-020': {
      acti: [{
        id: 'cover', zone: 'BASE', once: true, label: 'Turn 1 opponent [Human] LvX or lower in BASE face-down: then this card too',
        can: A => A.base(A.opp(A.p)).some(i => !A.isFd(i) && isHuman(A, i) && A.lv(i) <= A.lv(A.self)),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's [Human] Characters with Lv" + A.lv(A.self) + ' or lower in BASE to turn face-down', from: A.base(A.opp(A.p)).filter(i => !A.isFd(i) && isHuman(A, i) && A.lv(i) <= A.lv(A.self)), prefer: 'high' });
          if (A.cover(t[0], 'Tarantula')) A.cover(A.self, 'Tarantula');
        }
      }]
    },

    /* ============================ KUNING (021–040) ============================ */
    /* 「The Web of Destiny」Spider-Man */
    'SP01-021': {
      unique: true,
      trig: [{
        id: 'base', zone: 'BASE', once: true, optional: true, label: 'The Web of Destiny',
        text: 'Attach 1 [Web] Character from your HAND to 1 Character in the field?',
        when: (e, self, A) => e.k === 'ENTER' && e.p === A.p && isWeb(A, e.c),
        can: A => A.hand(A.p).some(i => isWeb(A, i)) && A.allChars().length > 0,
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Web] Character in your HAND to attach', from: A.hand(A.p).filter(i => isWeb(A, i)), prefer: 'high' });
          const h = A.ask('h', { text: 'Choose 1 Character in the field to attach it to', from: A.allChars(), prefer: 'high' });
          if (c.length && h.length) A.attach(c[0], h[0]);
        }
      }, {
        id: 'void', zone: 'VOID', optional: true, label: 'The Web of Destiny (VOID)', text: 'Place this card from VOID into your BASE?',
        when: (e, self, A) => voidSelf(e, self) && e.jp === A.p,
        can: A => A.baseRoom(A.p) > 0 && A.canPlace(A.self, A.p),
        run: A => A.place(A.self, 'BASE', 'The Web of Destiny')
      }]
    },
    /* 「Phantom Strike」Ghost-Spider */
    'SP01-022': {
      trig: [{
        id: 'att', zone: 'FIELD', label: 'Phantom Strike', when: attachedSelf,
        can: A => !!host(A),
        run: A => { const h = host(A); if (h) A.grant(h, 'double', '[DOUBLE ATTACK]'); }
      }, {
        id: 'hand', zone: 'HAND', optional: true, label: 'Phantom Strike (HAND)',
        text: 'Swap this card in your HAND with that Character (this card gets [DOUBLE ATTACK] this turn)?',
        when: (e, self, A) => e.k === 'FIGHT_WON' && e.attacker && A.ctrl(e.c) === A.p && isWeb(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && inBattle(A, ev(A).c),
        run: A => { if (A.swapHand(A.self, ev(A).c, 'Phantom Strike')) A.grant(A.self, 'double', '[DOUBLE ATTACK]'); }
      }]
    },
    /* 「Spider-Archenemy」Venom */
    'SP01-023': {
      block: true,
      trig: [{
        id: 'knull', zone: 'FIELD', label: 'Spider-Archenemy Venom',
        when: (e, self, A) => attachedSelf(e, self) && nameHas(A, e.host, 'Knull'),
        can: A => !!host(A),
        run: A => { const h = host(A); if (h) A.retreat(h, 'Venom'); }
      }],
      acti: [{
        id: 'feed', zone: 'BATTLE', counter: true, once: true, label: 'Prune 1 of your Lv3 or lower [Human] in BATTLE: this card gets Power+X',
        can: A => A.battleChars(A.p).some(i => i !== A.self && A.lv(i) <= 3 && isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Lv3 or lower [Human] Characters in BATTLE to Prune', from: A.battleChars(A.p).filter(i => i !== A.self && A.lv(i) <= 3 && isHuman(A, i)), prefer: 'high' });
          const X = A.pw(c[0]);
          if (A.prune(c[0], 'Venom') && X > 0) A.mod(A.self, 'p', X, 'Venom');
        }
      }]
    },
    /* 「Driving Mecha」Peni Parker */
    'SP01-024': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt && isMachine(A, tgt) ? -1000 : 0 }],
      trig: [{
        id: 'follow', zone: 'RETREAT', optional: true, label: 'Driving Mecha', text: 'Place Peni Parker from RETREAT onto your BATTLE?',
        when: followRet,
        can: A => weak(A) && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          const m = A.ask('m', { text: 'Choose 1 [Machine] Character in your RETREAT to attach to Peni Parker', from: A.ret(A.p).filter(i => i !== A.self && isMachine(A, i)), prefer: 'high' });
          if (to && A.place(A.self, to, 'Driving Mecha')) m.forEach(i => A.attach(i, A.self));
        }
      }]
    },
    /* 「Gunfire Negotiation」Spider-Man Noir */
    'SP01-025': {
      trig: [{
        id: 'atk', zone: 'BATTLE', label: 'Gunfire Negotiation', when: hostAttacks,
        can: A => A.deck(A.p).length > 0,
        run: A => pruneTop(A, A.p, 1, 'Gunfire Negotiation')
      }, {
        id: 'called', zone: 'FIELD', label: 'Gunfire Negotiation (CALL)', when: calledEnter,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p).slice(0, 3);
          const c = A.ask('c', { text: 'Top 3 cards of your Deck: choose 1 [Web] card to add to your HAND (the rest are Pruned)', from: top.filter(i => isWeb(A, i)), reveal: true, prefer: 'high' });
          top.forEach(i => A.reveal(i));
          c.forEach(i => A.toHand(i, 'Gunfire Negotiation'));
          top.filter(i => !c.includes(i)).forEach(i => A.prune(i, 'Gunfire Negotiation'));
        }
      }]
    },
    /* 「Vigil of Love」Amazing Spider-Man — errata V.2 (E-13): "1 of your card" (kartu terpasang ikut). */
    'SP01-026': {
      unique: true,
      acti: [{
        id: 'swap', zone: 'FIELD', once: true, label: 'Swap this card with the [Human] Character it is attached to',
        can: A => !!host(A) && isHuman(A, host(A)),
        run: A => A.swapAtt(A.self, host(A), 'Vigil of Love')
      }, {
        id: 'gwen', zone: 'HAND', counter: true, label: 'Swap this card in HAND with your Ghost-Spider / Gwen card in the field: 1 opponent Character in BATTLE gets Power-1000',
        can: A => fieldAll(A, A.p).some(i => nameHas(A, i, 'Ghost-Spider') || nameHas(A, i, 'Gwen')),
        run: A => {
          const f = A.ask('f', { text: 'Choose 1 of your cards named Ghost-Spider or Gwen in the field', from: fieldAll(A, A.p).filter(i => nameHas(A, i, 'Ghost-Spider') || nameHas(A, i, 'Gwen')), prefer: 'high' });
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000 this turn)", from: oppBattle(A), prefer: 'high' });
          if (A.swapHand(A.self, f[0], 'Vigil of Love')) t.forEach(i => A.mod(i, 'p', -1000, 'Vigil of Love'));
        }
      }]
    },
    /* 「Symbiotic Suit」Spider-Man */
    'SP01-027': {
      unique: true,
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.voidOf(A.p).filter(i => isWeb(A, i) && A.name(i) !== A.name(src)).length * 500 : 0 }],
      trig: [{
        id: 'att', zone: 'FIELD', optional: true, label: 'Symbiotic Suit', text: 'Move this card from under that Character to an empty area in your BATTLE?',
        when: (e, self, A) => attachedSelf(e, self) && isWeb(A, e.host),
        can: A => !!host(A) && A.emptySlots(A.ctrl(A.self)).length > 0,
        run: A => {
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, A.emptySlots(A.ctrl(A.self))));
          if (to) A.detachToBattle(A.self, to, 'Symbiotic Suit');
        }
      }]
    },
    /* 「The Successor」Ultimate Spider-Man */
    'SP01-028': {
      auto: [{ stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? -1 : 0 }],
      trig: [{
        id: 'follow', zone: 'RETREAT', optional: true, label: 'The Successor', text: 'Place this card from RETREAT onto your BATTLE?',
        when: followRet,
        can: A => weak(A) && A.canPlace(A.self, A.p),
        run: A => { const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A))); if (to) A.place(A.self, to, 'The Successor'); }
      }]
    },
    /* 「Spider-Mech」SP//dr */
    'SP01-029': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt && A.lv(tgt) === 4 && A.attached(tgt).length === 1 ? 3000 : 0 }],
      acti: [{
        id: 'mech', zone: 'BASE', once: true, label: 'Attach this card from BASE to 1 of your Characters (R+1 this turn)',
        can: A => A.chars(A.p).some(i => i !== A.self),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Characters to attach SP//dr to', from: A.chars(A.p).filter(i => i !== A.self), prefer: 'high' });
          A.attach(A.self, h[0]);
          A.mod(h[0], 'r', 1, 'SP//dr');
        }
      }]
    },
    /* 「Invitation of Multiverse」Spider-Ham */
    'SP01-030': {
      trig: [{
        id: 'att', zone: 'FIELD', optional: true, label: 'Invitation of Multiverse', text: 'Prune this card and 1 [Web] Character in your RETREAT to draw 2 cards?',
        when: attachedSelf,
        can: A => A.ret(A.p).some(i => isWeb(A, i)),
        run: A => {
          const r = A.ask('r', { text: 'Choose 1 [Web] Character in your RETREAT to Prune', from: A.ret(A.p).filter(i => isWeb(A, i)) });
          const a = A.prune(A.self, 'Spider-Ham'), b = A.prune(r[0], 'Spider-Ham');
          if (a && b) A.draw(A.p, 2);
        }
      }],
      acti: [{
        id: 'ham', zone: 'BATTLE', once: true, label: 'Prune 1 [Web] Character in your HAND: draw 1 card',
        can: A => A.hand(A.p).some(i => isWeb(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Web] Character in your HAND to Prune', from: A.hand(A.p).filter(i => isWeb(A, i)) });
          if (A.prune(c[0], 'Spider-Ham')) A.draw(A.p, 1);
        }
      }]
    },
    /* 「Straight and Narrow」Uncle Ben — RS-034: BOTH LOSE ikut. */
    'SP01-031': {
      unique: true, block: true,
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Straight and Narrow', when: lostFightRet,
        can: A => A.deck(A.p).length >= 3,
        run: (A, job) => { job.n = pruneTop(A, A.p, 3, 'Straight and Narrow'); job.step2 = job.n === 3; },
        after: A => {
          const web = A.voidOf(A.p).filter(i => isWeb(A, i));
          if (!web.length || !weak(A)) return;
          const low = Math.min.apply(null, web.map(i => A.origLv(i)));
          const c = A.ask('c', { text: 'Choose 1 of your lowest-Lv [Web] Characters in VOID to place onto your BATTLE', from: web.filter(i => A.origLv(i) === low), prefer: 'high' });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          if (c.length && to) A.place(c[0], to, 'Straight and Narrow');
        }
      }]
    },
    /* 「Alliance Leader」Spider-Man 2099 */
    'SP01-032': {
      unique: true,
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.ctrl(tgt) === A.opp(A.ctrl(src)) && inField(A, tgt) && !A.host(tgt) && !A.isFd(tgt) ? -1000 * A.attached(tgt).filter(i => isWeb(A, i)).length : 0 }],
      trig: [{
        id: 'void', zone: 'VOID', optional: true, label: 'Alliance Leader', text: 'Prune the top 3 cards of your Deck to draw 1 card?',
        when: (e, self, A) => voidSelf(e, self) && !!e.jsrc && isWeb(A, e.jsrc),
        can: A => A.deck(A.p).length >= 3,
        run: A => { if (pruneTop(A, A.p, 3, 'Alliance Leader') === 3) A.draw(A.p, 1); }
      }]
    },
    /* 「Spider-Mentor」Spider-Man */
    'SP01-033': {
      unique: true,
      auto: [
        { stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1 : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1000 : 0 },
        { stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => mentor(A, src, tgt) ? 1 : 0 },
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => mentor(A, src, tgt) ? 1000 : 0 }
      ]
    },
    /* 「Ultimate Mode」Spider Suit */
    'SP01-034': {
      trig: [{
        id: 'att', zone: 'FIELD', label: 'Ultimate Mode', when: attachedSelf,
        can: A => !!host(A) && A.attached(host(A)).some(i => i !== A.self),
        run: A => { A.attached(host(A)).filter(i => i !== A.self).forEach(i => A.retreat(i, 'Ultimate Mode')); }
      }],
      acti: [{
        id: 'suit', zone: 'FIELD', counter: true, once: true, label: 'Prune 1 [Web] Character in your RETREAT: the Character this card is attached to gets Power+1000',
        can: A => !!host(A) && A.ret(A.p).some(i => isWeb(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Web] Character in your RETREAT to Prune', from: A.ret(A.p).filter(i => isWeb(A, i)) });
          if (A.prune(c[0], 'Ultimate Mode') && host(A)) A.mod(host(A), 'p', 1000, 'Ultimate Mode');
        }
      }]
    },
    /* 「Mirror Fate」Prowler */
    'SP01-035': {
      trig: [{
        id: 'lost', zone: 'BATTLE', optional: true, label: 'Mirror Fate', text: 'Prune Prowler to place 1 Lv3 Spider-Man from VOID onto your field?',
        when: (e, self, A) => e.k === 'RETREATED' && e.c !== self && e.fromZone === 'bat' && e.ctrl === A.p && (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE') && isHuman(A, e.c),
        can: A => A.voidOf(A.p).some(i => A.origLv(i) === 3 && nameHas(A, i, 'Spider-Man')),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Lv3 Spider-Man in your VOID to place onto your field', from: A.voidOf(A.p).filter(i => A.origLv(i) === 3 && nameHas(A, i, 'Spider-Man')), prefer: 'high' });
          const to = A.pick('to', 'Choose where to place it', slotOpts(A, fieldSpots(A, [A.slot(A.self)])));
          if (A.prune(A.self, 'Mirror Fate') && to) A.place(c[0], to, 'Mirror Fate');
        }
      }]
    },
    /* 「Spider-Sense」Spiderling */
    'SP01-036': {
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1000 : 0 }],
      acti: [{
        id: 'sense', zone: 'FIELD', counter: true, once: true, label: 'Prune this card: return 1 of your yellow [Human] Characters in the field to your HAND',
        can: A => A.chars(A.p).some(i => i !== A.self && A.color(i) === YELLOW && isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your yellow [Human] Characters in the field to return to your HAND', from: A.chars(A.p).filter(i => i !== A.self && A.color(i) === YELLOW && isHuman(A, i)), prefer: 'high' });
          if (A.prune(A.self, 'Spider-Sense') && inField(A, c[0])) A.toHand(c[0], 'Spider-Sense');
        }
      }]
    },
    /* 「Spider-Mentor」Spider-Woman */
    'SP01-037': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => A.host(src) === tgt ? 2 : 0 }],
      trig: [{
        id: 'follow', zone: 'RETREAT', optional: true, label: 'Spider-Mentor Spider-Woman', text: 'Place this card from RETREAT into your BASE?',
        when: followRet,
        can: A => A.baseRoom(A.p) > 0 && A.canPlace(A.self, A.p),
        run: A => A.place(A.self, 'BASE', 'Spider-Woman')
      }]
    },
    /* 「Spider-Archenemy」Boomerang — TD-10: ONCE PER TURN, draw tidak opsional. Retreat karena Power 0 dijalankan langsung. */
    'SP01-038': {
      acti: [{
        id: 'boom', zone: 'BATTLE', once: true, label: 'Retreat this card: 1 opponent Character gets Power-1000 (draw 1 if it retreats)',
        can: () => true,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in the field (Power-1000 this turn)", from: oppChars(A), prefer: 'low' });
          if (!A.retreat(A.self, 'Boomerang')) return;
          t.forEach(i => {
            A.mod(i, 'p', -1000, 'Boomerang');
            if (inField(A, i) && A.origP(i) > 0 && A.pw(i) === 0 && A.retreat(i, 'Attack Power reduced to 0 by an effect, 301.16.a.1')) A.draw(A.p, 1);
          });
        }
      }]
    },
    /* 「Spore of Consciousness」Ultron */
    'SP01-039': {
      trig: [{
        id: 'enter', zone: 'BATTLE', label: 'Spore of Consciousness',
        when: (e, self) => enterSelf(e, self) && e.from === 'ret',
        can: A => A.base(A.p).length <= 3 && weak(A) && A.ret(A.p).some(i => nameHas(A, i, 'Ultron')),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 Ultron in your RETREAT to place onto your BATTLE', from: A.ret(A.p).filter(i => nameHas(A, i, 'Ultron')), prefer: 'high' });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          if (c.length && to && A.place(c[0], to, 'Spore of Consciousness')) {
            A.hand(A.p).forEach(i => { if (A.baseRoom(A.p) > 0) A.toBaseFd(i, 'HAND'); });
          }
        }
      }]
    },
    /* 「Suppression Device」Bruce Banner */
    'SP01-040': {
      auto: [{ stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => tgt === src ? { set: A.r(src) } : 0 }],
      acti: [{
        id: 'banner', zone: 'HAND', label: 'Prune 1 of your Hulk in BATTLE: place this card onto your BATTLE (1 opponent LvX gets Power-X000)',
        can: A => A.battleChars(A.p).some(i => nameHas(A, i, 'Hulk')) && uniqOk(A),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Hulk Characters in BATTLE to Prune', from: A.battleChars(A.p).filter(i => nameHas(A, i, 'Hulk')), prefer: 'high' });
          const X = A.lv(c[0]);
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A, [A.slot(c[0])])));
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv" + X + ' Characters in BATTLE (Power-' + X + '000 this turn)', from: oppBattle(A).filter(i => A.lv(i) === X), prefer: 'high' });
          if (A.prune(c[0], 'Suppression Device') && to && A.place(A.self, to, 'Suppression Device')) t.forEach(i => A.mod(i, 'p', -X * 1000, 'Suppression Device'));
        }
      }]
    },

    /* ============================ BIRU (041–060) ============================ */
    /* 「Spider-Archenemy」Doctor Octopus */
    'SP01-041': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => A.ctrl(tgt) === A.opp(A.ctrl(src)) && A.slot(tgt) === 'F' ? -A.attached(src).length : 0 }],
      trig: [{
        id: 'won', zone: 'BATTLE', label: 'Doctor Octopus', when: (e, self) => e.k === 'FIGHT_WON' && e.c === self,
        can: A => oppBattle(A).some(i => A.pw(i) <= 4000 && A.bbmDests(i).includes('BASE')),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters with Power 4000 or lower in BATTLE: it moves to their BASE", from: oppBattle(A).filter(i => A.pw(i) <= 4000 && A.bbmDests(i).includes('BASE')), prefer: 'high' });
          if (A.bbm(t[0], 'BASE', 'Doctor Octopus') && machineOnField(A, null)) A.prune(t[0], 'Doctor Octopus');
        }
      }]
    },
    /* 「Spider-Archenemy」Green Goblin — pindah ke BASE lawan: lawan menjadi pengendali (RS-056). */
    'SP01-042': {
      acti: [{
        id: 'goblin', zone: 'BATTLE', once: true, label: "Prune the top card of your Deck: draw 2, then move this card to your opponent's BASE",
        can: A => A.deck(A.p).length > 0,
        run: A => {
          if (pruneTop(A, A.p, 1, 'Green Goblin') !== 1) return;
          A.draw(A.p, 2);
          if (A.baseRoom(A.opp(A.p)) > 0) A.moveTo(A.self, A.opp(A.p), 'BASE', 'Green Goblin');
          else A.log("Green Goblin stays: your opponent's BASE is full.");
        }
      }],
      trig: [{
        id: 'start', zone: 'FIELD', once: true, label: 'Green Goblin (turn start)',
        when: (e, self, A) => e.k === 'TURN_START' && e.p === A.p && A.owner(self) !== A.p,
        can: A => A.deck(A.p).length > 0,
        run: A => { A.deck(A.p).slice(-3).reverse().forEach(i => A.prune(i, 'Green Goblin')); }
      }]
    },
    /* 「Spider-Archenemy」Kingpin — TD-08 (ikuti teks Inggris): "Archenemy" dibaca di nama kartu (RS-057). */
    'SP01-043': {
      acti: [{
        id: 'kingpin', zone: 'BACK', counter: true, once: true, label: 'Discard 1 card: you may place 1 Archenemy from HAND onto your BATTLE',
        can: A => A.hand(A.p).length > 0,
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p), prefer: 'low' });
          const c = weak(A) ? A.ask('c', { text: 'You may choose 1 Archenemy Character in your HAND to place onto your BATTLE', from: A.hand(A.p).filter(i => i !== d[0] && isArchenemy(A, i)), min: 0, max: 1, prefer: 'high' }) : [];
          const to = c.length ? A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A))) : null;
          if (A.discard(d[0], 'Kingpin') && c.length && to) A.place(c[0], to, 'Kingpin');
        }
      }]
    },
    /* 「Spider-Archenemy」Electro — kartu Karakter di BASE pemain mana pun. */
    'SP01-044': {
      trig: [{
        id: 'enter', zone: 'BATTLE', optional: true, label: 'Electro', text: 'Turn 1 Character with original Lv3 or below in a BASE face-down (Electro gets R+3 and Power+3000)?',
        when: enterSelf,
        can: A => A.base(0).concat(A.base(1)).some(i => !A.isFd(i) && A.origLv(i) <= 3),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 Character with original Lv3 or below in a BASE to turn face-down', from: A.base(A.opp(A.p)).concat(A.base(A.p)).filter(i => !A.isFd(i) && A.origLv(i) <= 3), prefer: 'high' });
          if (A.cover(t[0], 'Electro')) { A.mod(A.self, 'r', 3, 'Electro'); A.mod(A.self, 'p', 3000, 'Electro'); }
        }
      }]
    },
    /* 「Time Control」Loki */
    'SP01-045': {
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => A.ctrl(tgt) === A.ctrl(src) && inBattle(A, tgt) ? { set: A.battleChars(A.ctrl(src)).filter(i => A.origP(i) === 500).length } : 0 }]
    },
    /* 「Chaos Surge」Scarlet Witch */
    'SP01-046': {
      unique: true,
      trig: [{
        id: 'enter', zone: 'BATTLE', label: 'Chaos Surge', when: enterSelf,
        can: A => { const X = A.setCount(A.p); return A.base(A.opp(A.p)).some(i => !A.isFd(i) && A.lv(i) <= X); },
        run: A => {
          const X = A.setCount(A.p);
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters with Lv" + X + ' or lower in BASE to Prune', from: A.base(A.opp(A.p)).filter(i => !A.isFd(i) && A.lv(i) <= X), prefer: 'high' });
          if (A.prune(t[0], 'Chaos Surge')) { A.mod(A.self, 'r', X, 'Chaos Surge'); A.mod(A.self, 'p', X * 1000, 'Chaos Surge'); }
        }
      }]
    },
    /* 「God of Symbiotes」Knull — "gets the effects of 1 of its attached cards" (RS-058). */
    'SP01-047': {
      unique: true, borrows: true,
      auto: [
        { stat: 'r', zone: 'FIELD', value: (A, src, tgt) => tgt === src ? A.attached(src).length : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => tgt === src ? A.attached(src).length * 1000 : 0 }
      ],
      acti: [{
        id: 'knull', zone: 'HAND', label: 'Place this card onto your BATTLE (4+ [Symbiote] in RETREAT) and attach [Symbiote] Characters from RETREAT',
        can: A => A.ret(A.p).filter(i => isSymbiote(A, i)).length >= 4 && weak(A) && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          const seen = new Set(), pool = A.ret(A.p).filter(i => isSymbiote(A, i) && !seen.has(A.name(i)) && seen.add(A.name(i)));
          const c = A.ask('c', { text: 'Choose any [Symbiote] Characters with different names in your RETREAT to attach to Knull', from: pool, min: 0, max: pool.length, prefer: 'high' });
          if (to && A.place(A.self, to, 'God of Symbiotes')) c.forEach(i => A.attach(i, A.self));
        }
      }, {
        id: 'borrow', zone: 'BATTLE', counter: true, once: true, label: 'This card gets the effects of 1 of its attached cards this turn',
        can: A => A.attached(A.self).some(i => S.hasResolver(A.no(i))),
        run: A => {
          const c = A.ask('c', { text: "Choose 1 of Knull's attached cards: Knull gets its effects this turn", from: A.attached(A.self).filter(i => S.hasResolver(A.no(i))), prefer: 'high' });
          A.borrow(A.self, A.no(c[0]), 'God of Symbiotes');
        }
      }]
    },
    /* 「Spider-Ally」Daredevil */
    'SP01-048': {
      unique: true,
      acti: [{
        id: 'dd', zone: 'BASE', counter: true, once: true, label: 'Retreat 1 of your [Human] Characters in the field: draw 1 card',
        can: A => A.chars(A.p).some(i => isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your [Human] Characters in the field to Retreat', from: A.chars(A.p).filter(i => isHuman(A, i)), prefer: 'low' });
          if (A.retreat(c[0], 'Daredevil')) A.draw(A.p, 1);
        }
      }]
    },
    /* 「Spider-Ally」Harry Osborn */
    'SP01-049': {
      acti: [{
        id: 'harry', zone: 'BATTLE', once: true, label: 'The player with fewer Characters in BATTLE draws 1 card, then discards the bottom card of their Deck',
        can: A => A.battleChars(0).length !== A.battleChars(1).length,
        run: A => {
          const q = A.battleChars(0).length < A.battleChars(1).length ? 0 : 1;
          if (A.draw(q, 1).length) A.millBottom(q, 1, 'Harry Osborn');
        }
      }]
    },
    /* 「Spider-Archenemy」Phage */
    'SP01-050': {
      shield: (A, a, src) => !A.isFd(src) && A.lv(src) === 1,
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Spider-Archenemy Phage',
        text: "Place 1 of your opponent's Lv3 [Human] Characters from their RETREAT onto your BATTLE and attach Phage to it?",
        when: calledEnter,
        can: A => weak(A) && A.ret(A.opp(A.p)).some(i => A.origLv(i) === 3 && isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: "Choose 1 of your opponent's Lv3 [Human] Characters in their RETREAT", from: A.ret(A.opp(A.p)).filter(i => A.origLv(i) === 3 && isHuman(A, i)), prefer: 'high' });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          if (to && A.placeOnto(c[0], to, A.p, 'Phage') && inField(A, A.self)) A.attach(A.self, c[0]);
        }
      }]
    },
    /* 「Spider-Archenemy」Agony */
    'SP01-051': {
      abil: (A, self) => {
        const op = A.opp(A.ctrl(self)), out = [];
        if (A.chars(op).some(i => A.lv(i) === 1)) out.push('double');
        if (A.battleChars(op).some(i => A.lv(i) === 6)) out.push('assault');
        return out;
      }
    },
    /* 「Spider-Archenemy」Scream — [AIR STRIKE]; pengurangan Power dilipatgandakan (RS-055). */
    'SP01-052': { air: true, redMul: { zone: 'BATTLE', n: 2 } },
    /* 「Spider-Archenemy」Riot */
    'SP01-053': {
      block: true,
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Spider-Archenemy Riot',
        text: 'Discard the bottom 3 cards of your Deck to attach Riot from your HAND to the attacking Character?',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.opp(A.p) && isHuman(A, e.a) && A.origP(e.a) <= 3000,
        can: A => A.zone(A.self) === 'HAND' && A.deck(A.p).length >= 3 && inBattle(A, ev(A).a),
        run: A => { if (A.millBottom(A.p, 3, 'Riot').length === 3 && inBattle(A, ev(A).a)) A.attach(A.self, ev(A).a); }
      }],
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt && isHuman(A, tgt) ? -1000 * A.origR(tgt) : 0 }]
    },
    /* 「Spider-Archenemy」Lasher — FAQ-06: BATTLE-BASE MOVE oleh efek ikut. Retreat karena Power 0 dijalankan langsung. */
    'SP01-054': {
      trig: [{
        id: 'bbm', zone: 'BATTLE', label: 'Lasher',
        when: (e, self, A) => e.k === 'BBMOVE' && A.ctrl(e.c) === A.opp(A.p),
        can: A => inField(A, ev(A).c),
        run: A => {
          const c = ev(A).c;
          A.mod(c, 'p', -1000, 'Lasher');
          if (inField(A, c) && A.origP(c) > 0 && A.pw(c) === 0 && A.retreat(c, 'Attack Power reduced to 0 by an effect, 301.16.a.1')) A.prune(c, 'Lasher');
        }
      }]
    },
    /* 「Spider-Archenemy」Vulture */
    'SP01-055': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, optional: true, label: 'Vulture', text: 'Discard 3 cards to attach 1 [Machine] Character from your RETREAT to Vulture?',
        when: bbmSelf,
        can: A => A.hand(A.p).length >= 3 && A.ret(A.p).some(i => isMachine(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 3 cards in your HAND to discard', from: A.hand(A.p), min: 3, max: 3, prefer: 'low' });
          const m = A.ask('m', { text: 'Choose 1 [Machine] Character in your RETREAT to attach to Vulture', from: A.ret(A.p).filter(i => isMachine(A, i)), prefer: 'high' });
          let n = 0; d.forEach(i => { if (A.discard(i, 'Vulture')) n++; });
          if (n === 3 && inField(A, A.self)) m.forEach(i => A.attach(i, A.self));
        }
      }]
    },
    /* 「Spider-Archenemy」Rhino */
    'SP01-056': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, label: 'Rhino', when: bbmSelf,
        can: A => A.setCount(A.opp(A.p)) > 0,
        run: A => { const s = A.set(A.opp(A.p)); A.retreat(s[A.rand(s.length)], 'Rhino (random)'); }
      }]
    },
    /* 「Pillage & Plunder」Crowds of The Hand — FAQ-11. */
    'SP01-057': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Pillage & Plunder', text: 'Discard this card to retreat that Character?',
        when: (e, self, A) => e.k === 'ENTER' && e.p === A.opp(A.p) && A.lv(e.c) === 2 && isHuman(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && inField(A, ev(A).c),
        run: A => { if (A.discard(A.self, 'Pillage & Plunder') && inField(A, ev(A).c)) A.retreat(ev(A).c, 'Pillage & Plunder'); }
      }]
    },
    /* 「Spider-Archenemy」Tombstone */
    'SP01-058': {
      acti: [{
        id: 'tomb', zone: 'FRONT', once: true, label: "Discard the bottom X cards of each player's Deck (X = opponent Characters on WING): R+X",
        can: A => A.wings(A.opp(A.p)).some(i => !A.isFd(i)),
        run: A => {
          const X = A.wings(A.opp(A.p)).length;
          A.millBottom(A.p, X, 'Tombstone'); A.millBottom(A.opp(A.p), X, 'Tombstone');
          A.mod(A.self, 'r', X, 'Tombstone');
        }
      }]
    },
    /* 「Genetic Reversal」Man-Spider — "your turn" = giliran pengendali kartu ini (RS-056). */
    'SP01-059': {
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Attach this card to 1 [Human] Character in the field (Power+1000 this turn)',
        can: A => A.allChars().some(i => isHuman(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 [Human] Character in the field (either player) to attach Man-Spider to', from: A.allChars().filter(i => isHuman(A, i)), prefer: 'high' });
          A.attach(A.self, h[0]);
          A.mod(h[0], 'p', 1000, 'Genetic Reversal');
        }
      }],
      trig: [{
        id: 'end', zone: 'BATTLE', label: 'Genetic Reversal',
        when: (e, self, A) => e.k === 'TURN_END' && e.p === A.p && !!A.host(self) && !A.attackedThisTurn(A.host(self)),
        can: A => !!host(A),
        run: A => A.prune(host(A), 'Genetic Reversal')
      }]
    },
    /* 「Spider-Archenemy」Lizard */
    'SP01-060': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, label: 'Lizard', when: bbmSelf,
        can: A => A.setCount(A.p) > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your set cards in BASE to reveal', from: A.set(A.p) });
          const lv = A.origLv(s[0]);
          const c = A.baseRoom(A.p) > 0 ? A.ask('c', { text: 'Choose 1 of your Lv' + lv + ' Characters in RETREAT to place face-down into your BASE', from: A.ret(A.p).filter(i => A.origLv(i) === lv) }) : [];
          A.reveal(s[0]);
          c.forEach(i => A.toBaseFd(i, 'RETREAT'));
        }
      }]
    },

    /* ============================ HIJAU (061–080) ============================ */
    /* 「Spider-Archenemy」Mr. Negative — E-14 / F-11: karakter di BASE ditutup dulu, lalu kartu tertutup dibuka. */
    'SP01-061': {
      acti: [{
        id: 'negative', zone: 'HAND', label: 'Place this card onto your WING and flip all your cards in BASE',
        can: A => A.tp === A.p && A.callsMade(A.p) === 0 && A.setCount(A.p) === A.base(A.p).filter(i => !A.isFd(i)).length &&
          A.emptySlots(A.p).some(s => s === 'W1' || s === 'W2') && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose an empty WING', slotOpts(A, A.emptySlots(A.p).filter(s => s === 'W1' || s === 'W2')));
          const up = A.base(A.p).filter(i => !A.isFd(i)), down = A.set(A.p);
          if (to && A.place(A.self, to, 'Mr. Negative')) {
            up.forEach(i => A.cover(i, 'Mr. Negative'));
            down.forEach(i => A.flip(i, 'Mr. Negative'));
          }
        }
      }],
      trig: [{
        id: 'enter', zone: 'BATTLE', label: 'Mr. Negative', when: enterSelf,
        run: A => A.noCost5(A.p, 'Mr. Negative')
      }]
    },
    /* 「King of Hell」Mephisto */
    'SP01-062': {
      unique: true,
      acti: [{
        id: 'hell', zone: 'BASE', once: true, label: 'Prune 1 [Human] in your HAND: draw 1, then you may place 1 LvX Character with no effects from HAND onto BATTLE',
        can: A => A.hand(A.p).some(i => isHuman(A, i)),
        run: (A, job) => {
          const c = A.ask('c', { text: 'Choose 1 [Human] Character in your HAND to Prune', from: A.hand(A.p).filter(i => isHuman(A, i)) });
          job.X = A.origLv(c[0]);
          if (A.prune(c[0], 'King of Hell')) { A.draw(A.p, 1); job.step2 = true; }
        },
        after: (A, job) => {
          if (!weak(A)) return;
          const h = A.ask('h', { text: 'You may choose 1 Lv' + job.X + ' Character with no effects in your HAND to place onto your BATTLE', from: A.hand(A.p).filter(i => A.origLv(i) === job.X && A.noEffectText(i)), min: 0, max: 1, prefer: 'high' });
          const to = h.length ? A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A))) : null;
          if (h.length && to) A.place(h[0], to, 'King of Hell');
        }
      }]
    },
    /* 「Spider-Companion」Black Cat — FAQ-11. */
    'SP01-063': {
      unique: true,
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Spider-Companion Black Cat', text: 'Place Black Cat from your HAND onto your field?',
        when: (e, self, A) => e.k === 'ENTER' && e.c !== self && e.p === A.p && isWeb(A, e.c),
        can: A => A.zone(A.self) === 'HAND' && A.spots(A.p).length > 0 && A.canPlace(A.self, A.p),
        run: A => { const to = A.pick('to', 'Choose where to place Black Cat', slotOpts(A, ordSlots(A.spots(A.p)))); if (to) A.place(A.self, to, 'Black Cat'); }
      }, {
        id: 'enter', zone: 'FIELD', label: 'Black Cat', when: enterSelf,
        can: A => A.handCount(A.opp(A.p)) > 0 && A.baseRoom(A.opp(A.p)) > 0,
        run: A => { const h = A.hand(A.opp(A.p)); A.toBaseFd(h[A.rand(h.length)], 'HAND'); }
      }]
    },
    /* 「Dual Destiny」Scarlet Spider */
    'SP01-064': {
      acti: [{
        id: 'swap', zone: 'FIELD', once: true, label: 'Swap this card with the [Web] Character it is attached to ([AIR STRIKE] this turn)',
        can: A => !!host(A) && isWeb(A, host(A)),
        run: A => { if (A.swapAtt(A.self, host(A), 'Dual Destiny')) A.grant(A.self, 'air', '[AIR STRIKE]'); }
      }],
      trig: [{
        id: 'start', zone: 'FIELD', once: true, label: 'Dual Destiny',
        when: (e, self, A) => e.k === 'TURN_START' && e.p === A.opp(A.p),
        can: A => !host(A) && A.attached(A.self).some(i => isWeb(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Web] card attached to Scarlet Spider to swap with it', from: A.attached(A.self).filter(i => isWeb(A, i)), prefer: 'high' });
          if (A.swapAtt(c[0], A.self, 'Dual Destiny')) A.grant(c[0], 'block', '[BLOCK]');
        }
      }]
    },
    /* 「Restoration of Multiverse」Doctor Strange */
    'SP01-066': {
      unique: true,
      acti: [{
        id: 'restore', zone: 'BATTLE', once: true, label: 'Discard 1 card: place 1 [Multiverse] Character from VOID onto your BATTLE',
        can: A => A.hand(A.p).length > 0 && weak(A) && A.voidOf(A.p).some(i => isMultiverse(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p), prefer: 'low' });
          const c = A.ask('c', { text: 'Choose 1 [Multiverse] Character in your VOID to place onto your BATTLE', from: A.voidOf(A.p).filter(i => isMultiverse(A, i)), prefer: 'high' });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A)));
          const x = A.origLv(c[0]) >= 4 ? A.ask('x', { text: 'That Character is Lv4 or above: choose 1 more card in your HAND to discard', from: A.hand(A.p).filter(i => i !== d[0]), prefer: 'low' }) : [];
          if (A.discard(d[0], 'Restoration of Multiverse') && to && A.place(c[0], to, 'Restoration of Multiverse')) x.forEach(i => A.discard(i, 'Restoration of Multiverse'));
        }
      }]
    },
    /* 「Spider-Ally」Anti-Venom — "loses its effects" (RS-020, FAQ-02/03/05/13). */
    'SP01-067': {
      strip: true,
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Spider-Ally Anti-Venom', text: 'Attach Anti-Venom from BATTLE to 1 Character in the field?',
        when: calledEnter,
        can: A => A.allChars().some(i => i !== A.self),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 Character in the field (either player) to attach Anti-Venom to', from: A.allChars().filter(i => i !== A.self), prefer: 'high' });
          if (inBattle(A, A.self)) A.attach(A.self, h[0]);
        }
      }]
    },
    /* 「The Legacy」Superior Spider-Man */
    'SP01-068': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'The Legacy', when: lostFightRet,
        can: A => oppBattle(A).length > 0,
        run: A => {
          const h = A.ask('h', { text: "Choose 1 of your opponent's Characters in BATTLE to attach Superior Spider-Man to", from: oppBattle(A), prefer: 'high' });
          A.attach(A.self, h[0]);
        }
      }, {
        id: 'att', zone: 'BATTLE', label: 'The Legacy (attached)',
        when: (e, self, A) => attachedSelf(e, self) && inBattle(A, e.host),
        can: A => !!host(A) && A.pw(host(A)) <= 4000 && A.bbmDests(host(A)).includes('BASE'),
        run: A => {
          const h = host(A);
          if (A.bbm(h, 'BASE', 'The Legacy') && machineOnField(A, A.self)) A.cover(h, 'The Legacy');
        }
      }]
    },
    /* 「Spider-Companion」Mary Jane Watson */
    'SP01-069': {
      acti: [{
        id: 'mj', zone: 'BASE', counter: true, once: true, label: '1 of your [Web] Characters gets R+1 and Power+500: then this card turns face-down',
        can: A => A.chars(A.p).some(i => isWeb(A, i)),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your [Web] Characters in the field (R+1 and Power+500 this turn)', from: A.chars(A.p).filter(i => isWeb(A, i)), prefer: 'high' });
          t.forEach(i => { A.mod(i, 'r', 1, 'Mary Jane'); A.mod(i, 'p', 500, 'Mary Jane'); });
          if (t.length) A.cover(A.self, 'Mary Jane');
        }
      }]
    },
    /* 「Sense of Multiverse」Silk — FAQ-09/10: "your character with [Web] enters VOID" dari zona mana pun (RS-059). */
    'SP01-070': {
      trig: [{
        id: 'att', zone: 'FIELD', label: 'Sense of Multiverse', when: attachedSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => A.mill(A.p, 3, 'Sense of Multiverse')
      }, {
        id: 'void', zone: 'FIELD', optional: true, label: 'Sense of Multiverse (VOID)', text: 'Prune Silk to place that Character from VOID onto your BATTLE?',
        when: (e, self, A) => e.k === 'VOIDED' && e.c !== self && A.owner(e.c) === A.p && isWeb(A, e.c),
        can: A => { const s = A.slot(A.self); return (weak(A) || !!s) && A.zone(ev(A).c) === 'VOID'; },
        run: A => {
          const c = ev(A).c;
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A, [A.slot(A.self)])));
          const x = A.origLv(c) >= 4 ? A.ask('x', { text: 'That Character is Lv4 or above: choose 1 card in your HAND to discard', from: A.hand(A.p), prefer: 'low' }) : [];
          if (A.prune(A.self, 'Sense of Multiverse') && to && A.zone(c) === 'VOID' && A.place(c, to, 'Sense of Multiverse')) x.forEach(i => A.discard(i, 'Sense of Multiverse'));
        }
      }]
    },
    /* 「Spider-Archenemy」Venom 2099 */
    'SP01-071': {
      unique: true,
      trig: [{
        id: 'down', zone: 'BATTLE', label: 'Venom 2099',
        when: (e, self, A) => e.k === 'STAT_DOWN' && e.byOpp && !!A.host(self) && e.c === A.host(self),
        can: A => !!host(A) && oppChars(A).length > 0,
        run: A => {
          const X = A.pw(host(A));
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in the field (Power-" + X + ' this turn)', from: oppChars(A), prefer: 'high' });
          if (X > 0) t.forEach(i => A.mod(i, 'p', -X, 'Venom 2099'));
        }
      }],
      acti: [{
        id: 'attach', zone: 'HAND', counter: true, label: 'Attach this card to 1 of your [Human] Characters: 1 opponent Character in BATTLE gets Lv-3',
        can: A => A.chars(A.p).some(i => isHuman(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your [Human] Characters to attach Venom 2099 to', from: A.chars(A.p).filter(i => isHuman(A, i)), prefer: 'high' });
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Lv-3 this turn)", from: oppBattle(A), prefer: 'high' });
          A.attach(A.self, h[0]);
          t.forEach(i => A.mod(i, 'lv', -3, 'Venom 2099'));
        }
      }]
    },
    /* 「The Biggest Hater」J. Jonah Jameson */
    'SP01-072': {
      acti: [{
        id: 'jjj', zone: 'BATTLE', once: true, label: 'Move 1 of your [Web] or Archenemy Characters in BATTLE to your BASE: draw 1 card',
        can: A => A.battleChars(A.p).some(i => (isWeb(A, i) || isArchenemy(A, i)) && A.bbmDests(i).includes('BASE')),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your [Web] or Archenemy Characters in BATTLE to take BATTLE-BASE MOVE', from: A.battleChars(A.p).filter(i => (isWeb(A, i) || isArchenemy(A, i)) && A.bbmDests(i).includes('BASE')), prefer: 'high' });
          if (A.bbm(c[0], 'BASE', 'The Biggest Hater')) A.draw(A.p, 1);
        }
      }]
    },
    /* 「Spider-Archenemy」Scorpion */
    'SP01-073': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src && A.battleChars(A.opp(A.p)).some(i => isWeb(A, i)) ? -3000 : 0 }]
    },
    /* 「Endgame Blip」Spider-Man */
    'SP01-074': {
      trig: [{
        id: 'att', zone: 'FIELD', label: 'Endgame Blip', when: attachedSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => A.mill(A.p, 2, 'Endgame Blip')
      }],
      acti: [{
        id: 'blip', zone: 'BATTLE', once: true, label: "Discard 1 [Web] Character: retreat 1 of your opponent's set cards at random",
        can: A => A.hand(A.p).some(i => isWeb(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 [Web] Character in your HAND to discard', from: A.hand(A.p).filter(i => isWeb(A, i)) });
          if (!A.discard(d[0], 'Endgame Blip')) return;
          const s = A.set(A.opp(A.p));
          if (s.length) A.retreat(s[A.rand(s.length)], 'Endgame Blip (random)');
        }
      }]
    },
    /* 「Spider-Archenemy」Jackal */
    'SP01-075': {
      acti: [{
        id: 'jackal', zone: 'BACK', once: true, label: 'Prune 1 [Human] in your HAND: you may place 1 Character with the same name from HAND or RETREAT onto your field',
        can: A => A.hand(A.p).some(i => isHuman(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Human] Character in your HAND to Prune', from: A.hand(A.p).filter(i => isHuman(A, i)) });
          const nm = A.name(c[0]);
          const h = A.spots(A.p).length ? A.ask('h', { text: 'You may choose 1 ' + nm + ' in your HAND or RETREAT to place onto your field', from: A.hand(A.p).filter(i => i !== c[0]).concat(A.ret(A.p)).filter(i => A.name(i) === nm), min: 0, max: 1, prefer: 'high' }) : [];
          const to = h.length ? A.pick('to', 'Choose where to place it', slotOpts(A, ordSlots(A.spots(A.p)))) : null;
          if (A.prune(c[0], 'Jackal') && h.length && to) A.place(h[0], to, 'Jackal');
        }
      }]
    },
    /* 「Spider-Archenemy」Morbius */
    'SP01-076': {
      acti: [{
        id: 'morbius', zone: 'RETREAT', label: 'Retreat 1 of your [Human] cards in BATTLE: place this card from RETREAT onto your BATTLE',
        can: A => A.battleChars(A.p).concat(attachedOn(A, A.p).filter(i => inBattle(A, A.host(i)))).some(i => isHuman(A, i)) && uniqOk(A),
        run: A => {
          const pool = A.battleChars(A.p).concat(attachedOn(A, A.p).filter(i => inBattle(A, A.host(i)))).filter(i => isHuman(A, i));
          const c = A.ask('c', { text: 'Choose 1 of your [Human] cards in BATTLE (Character or attached card) to Retreat', from: pool, prefer: 'low' });
          const to = A.pick('to', 'Choose an empty area in your BATTLE', slotOpts(A, battleSpots(A, [A.slot(c[0])])));
          if (A.retreat(c[0], 'Morbius') && to) A.place(A.self, to, 'Morbius');
        }
      }],
      trig: [{
        id: 'atk', zone: 'BATTLE', label: 'Morbius', when: (e, self) => e.k === 'ATTACK' && e.tg === self,
        run: A => { const a = ev(A).a; if (inBattle(A, a)) A.grant(a, 'assault', '[ASSAULT]'); }
      }]
    },
    /* 「Reversal of Multiverse」Spider-Punk */
    'SP01-077': {
      atkLimit: (A, self, attacker, tg, slot) => slot === 'F',
      acti: [{
        id: 'punk', zone: 'HAND', counter: true, label: 'Discard this card: Prune all [Web] in your RETREAT, or put all [Web] from VOID into RETREAT',
        can: () => true,
        run: A => {
          const m = A.pick('m', 'Choose one', [{ v: 'prune', label: 'Prune all your [Web] Characters in RETREAT' }, { v: 'back', label: 'Put all your [Web] Characters from VOID into RETREAT' }]);
          if (!A.discard(A.self, 'Reversal of Multiverse')) return;
          if (m === 'prune') A.ret(A.p).filter(i => isWeb(A, i)).forEach(i => A.prune(i, 'Reversal of Multiverse'));
          else A.voidOf(A.p).filter(i => isWeb(A, i)).forEach(i => A.toRet(i, 'Reversal of Multiverse'));
        }
      }]
    },
    /* 「Heart's Haven」Aunt May */
    'SP01-078': {
      acti: [{
        id: 'may', zone: 'BASE', once: true, label: 'Place 1 [Web] from RETREAT face-down into your BASE: then this card turns face-down',
        can: A => A.baseRoom(A.p) > 0 && A.ret(A.p).some(i => isWeb(A, i)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Web] Character in your RETREAT to place face-down into your BASE', from: A.ret(A.p).filter(i => isWeb(A, i)), prefer: 'high' });
          A.toBaseFd(c[0], 'RETREAT');
          A.cover(A.self, "Heart's Haven");
        }
      }]
    },
    /* 「Spider-Companion」Gwen Stacy */
    'SP01-079': {
      noCostHost: (A, a, h) => A.lv(h) <= 3,
      trig: [{
        id: 'void', zone: 'VOID', label: 'Spider-Companion Gwen Stacy', when: voidSelf,
        can: A => oppBattle(A).length > 0,
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Characters in BATTLE (Power-1000 this turn)", from: oppBattle(A), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -1000, 'Gwen Stacy'));
        }
      }]
    },
    /* 「Spider-Archenemy」Shocker — TD-03: hanya saat di-CALL. FAQ-06: perpindahan = BATTLE-BASE MOVE. */
    'SP01-080': {
      trig: [{
        id: 'bat', zone: 'BATTLE', optional: true, label: 'Shocker', text: "Move 1 of your opponent's Lv3 or lower Characters from BATTLE to their BASE?",
        when: calledEnter,
        can: A => oppBattle(A).some(i => A.lv(i) <= 3 && A.bbmDests(i).includes('BASE')),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3 or lower Characters in BATTLE to move to their BASE", from: oppBattle(A).filter(i => A.lv(i) <= 3 && A.bbmDests(i).includes('BASE')), prefer: 'high' });
          A.bbm(t[0], 'BASE', 'Shocker');
        }
      }, {
        id: 'base', zone: 'BASE', optional: true, label: 'Shocker (BASE)', text: "Move 1 of your opponent's Lv3 or lower Characters from BASE to their BATTLE?",
        when: calledEnter,
        can: A => A.base(A.opp(A.p)).some(i => !A.isFd(i) && A.lv(i) <= 3 && A.bbmDests(i).length > 0),
        run: A => {
          const t = A.ask('t', { text: "Choose 1 of your opponent's Lv3 or lower Characters in BASE to move to their BATTLE", from: A.base(A.opp(A.p)).filter(i => !A.isFd(i) && A.lv(i) <= 3 && A.bbmDests(i).length > 0), prefer: 'high' });
          const to = A.pick('to', "Choose an empty area in your opponent's BATTLE", slotOpts(A, A.bbmDests(t[0])));
          if (to) A.bbm(t[0], to, 'Shocker');
        }
      }]
    }
  };

  // 「Spider-Mentor」Spider-Man AUTO【BATTLE】: di giliran Anda, bila jumlah Karakter di kedua BATTLE sama.
  function mentor(A, src, tgt) {
    const p = A.ctrl(src);
    if (A.tp !== p || A.ctrl(tgt) !== p || !inBattle(A, tgt) || !isWeb(A, tgt)) return false;
    return A.battleChars(p).length === A.battleChars(A.opp(p)).length;
  }

  S.registerCards(DEFS);
  if (isNode) module.exports = DEFS;
  else root.MHRCardDefsSP01 = DEFS;
})(typeof window !== 'undefined' ? window : this);
