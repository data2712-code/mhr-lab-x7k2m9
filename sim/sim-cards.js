/* ===================================================================
   MHR BATTLE SIM — RESOLVER KARTU (sim-cards.js)       Tahap 2 · v0.7 (SD01–SD04)
   ===================================================================
   Satu entri per kartu, dibuat dari TEKS INGGRIS (e_en) di cards.js.
   Ruling yang dipakai dirujuk dengan nomor RS-xxx (ruling-simulator.md).

   Bentuk entri:
     trig : [{ id, zone, once, optional, label, text, when(ev, self, A), can(A), run(A) }]
     acti : [{ id, zone, counter, once, label, can(A), run(A) }]
     acti : [{ ..., times: 2 }]          (TWICE PER TURN)
     auto : [{ stat:'p'|'r'|'lv', zone, value(A, src, target) }]   (aura kontinu)
            value mengembalikan angka (±X) atau { set: X } ("changes to X", 301.41)
     counter : true                       ([COUNTER], 305.1)
     unique : true                        ([UNIQUE], 305.6)
     bothLoseImmune : 'FRONT'             ("not retreated by Both Lose" di area itu)
     double(A, self) : bool               ([DOUBLE ATTACK], 305.3)
   zone: 'FIELD' (BATTLE/BASE/terpasang), 'BATTLE', 'FRONT', 'WING', 'BACK', 'BASE', 'HAND', 'RETREAT'.
   Event: CALLED, ENTER (masuk FIELD: CALL, COUNTER CALL, PLACE, swap dari RETREAT/HAND, dipasang dari luar FIELD — how 'attach', att:true),
   BBMOVE, ATTACK,
   FIGHT_WON, FIGHT_LOST, BOTH_LOSE, RETREATED (from 'field'|'hand'|'deck', cause, eff), ATTACHED,
   STAT_UP, TURN_END. Di run(), A.job.ev = event pemicu.

   Aturan menulis run(): semua A.ask()/A.yes() diajukan SEBELUM perubahan
   status pertama (retreat, prune, draw, attach, mod, ...).
   =================================================================== */
(function (root) {
  'use strict';
  const S = (typeof module !== 'undefined' && module.exports) ? require('./sim.js') : root.MHRSim;

  const isHuman = (A, i) => /(^|\/)\s*Human\s*(\/|$)/.test(A.trait(i));
  const hasTrait = (A, i, t) => A.trait(i).split('/').map(x => x.trim()).includes(t);
  const isMachine = (A, i) => hasTrait(A, i, 'Machine');
  const isAvengers = (A, i) => hasTrait(A, i, 'Avengers');
  const YELLOW = 'Kuning', BLUE = 'Biru';
  const ev = A => (A.job && A.job.ev) || {};
  const sumLv = (A, list) => list.reduce((s, i) => s + A.lv(i), 0);
  const slotOpts = (A, spots) => spots.map(v => ({ v, label: A.spotLabel(v) }));
  // "takes BATTLE-BASE Move once" oleh efek: pilih karakter yang bisa pindah lalu tujuannya.
  const movable = (A, p) => A.chars(p).filter(i => A.bbmDests(i).length);
  const lv1Machine = (A, list) => list.filter(i => A.lv(i) === 1 && isMachine(A, i));
  const discardedByEffect = (e, self) => e.k === 'RETREATED' && e.c === self && (e.from === 'hand' || e.from === 'deck') && e.cause === 'discard' && e.eff;
  const leftFieldToRet = (e, self) => e.k === 'RETREATED' && e.c === self && e.from === 'field' && !e.fd;
  const bbmSelf = (e, self) => e.k === 'BBMOVE' && e.c === self;
  const enterSelf = (e, self) => e.k === 'ENTER' && e.c === self;
  const calledSelf = (e, self) => e.k === 'CALLED' && e.c === self;
  const ctrl = (A, i) => { const L = A.loc(i); return L ? L.p : A.owner(i); };
  // Karakter sendiri yang bisa dipasangi kartu ini (bukan dirinya, bukan induknya sekarang — 301.25.b).
  const hostsFor = A => A.chars(A.p).filter(i => i !== A.self && i !== A.host(A.self));

  const DEFS = {
    /* 「Self-Destruct Program」Iron Man */
    'SD01-001': {
      trig: [{
        id: 'attached', zone: 'BATTLE', once: true, optional: true, label: 'Self-Destruct Program',
        text: 'Retreat all cards attached to this card, then Prune 1 opponent Character with Lv X or lower from the field (X = total Lv of the retreated cards)?',
        when: (ev, self) => ev.k === 'ATTACHED' && ev.host === self,
        can: A => A.attached(A.self).length > 0 && A.battleChars(A.opp(A.p)).some(i => A.lv(i) >= 5),
        run: A => {
          const att = A.attached(A.self);
          const X = att.reduce((s, i) => s + A.lv(i), 0);
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv' + X + ' or lower in the field to Prune', from: A.chars(A.opp(A.p)).filter(i => A.lv(i) <= X), prefer: 'high' });
          att.forEach(i => A.retreat(i, 'Self-Destruct Program'));
          t.forEach(i => A.prune(i, 'Self-Destruct Program'));
        }
      }]
    },
    /* 「MK44 - The Long Range」Hulk Buster */
    'SD01-002': {
      acti: [{
        id: 'attach', zone: 'FIELD', counter: true, once: true, label: 'Attach to a Character (R+2, Power+2500)',
        can: A => hostsFor(A).length > 0,
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Characters to attach this card to', from: hostsFor(A), prefer: 'high' });
          const others = A.attached(h[0]).filter(i => i !== A.self);
          const r = A.ask('r', { text: 'Choose 1 other card attached to that Character to Retreat', from: others });
          A.attach(A.self, h[0]);                                   // RS-005: boleh pindah dari karakter lain
          r.forEach(i => A.retreat(i, 'MK44 - The Long Range'));
        }
      }],
      auto: [
        { stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 2 : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 2500 : 0 }
      ]
    },
    /* 「Fire Support」War Machine — RS-003 (diubah 30 Okt 2026, ikut teks Inggris): saat R/Power
       KARAKTER MANA PUN milik Anda naik (termasuk kartu ini), sekali per giliran. */
    'SD01-003': {
      trig: [{
        id: 'up', zone: 'BATTLE', once: true, label: 'Fire Support',
        when: (ev, self, A) => ev.k === 'STAT_UP' && !!A.loc(ev.c) && A.loc(ev.c).p === A.p,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE to get Power-1000 this turn', from: A.battleChars(A.opp(A.p)), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -1000, 'Fire Support'));
        }
      }]
    },
    /* 「Ordnance Barrage」War Machine */
    'SD01-004': {
      auto: [{
        stat: 'p', zone: 'BATTLE',
        value: (A, src, tgt) => {
          if (tgt !== src) return 0;
          const me = ctrl(A, src);
          return A.st.tp === A.opp(me) && A.st.phase === 'battle' ? 1000 * A.battleChars(A.opp(me)).length : 0;
        }
      }]
    },
    /* 「Hero Call」Thor */
    'SD01-005': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Hero Call',
        text: 'Retreat 2 of your cards in BASE? If both are red, draw 2 cards.',
        when: (ev, self) => ev.k === 'CALLED' && ev.c === self,
        can: A => A.base(A.p).length >= 2,
        run: A => {
          const b = A.ask('b', { text: 'Choose 2 cards in your BASE to Retreat', from: A.base(A.p), min: 2, max: 2 });
          const red = b.length === 2 && b.every(i => A.color(i) === 'Merah');
          b.forEach(i => A.retreat(i, 'Hero Call'));
          if (red) A.draw(A.p, 2);
          else A.log('Hero Call: the retreated cards are not all red, so no cards are drawn.');
        }
      }]
    },
    /* 「Hourglass Bite」Black Widow */
    'SD01-006': {
      acti: [{
        id: 'bite', zone: 'HAND', label: 'Hourglass Bite (discard this card)',
        can: () => true,
        run: A => {
          const me = A.p, op = A.opp(me);
          const a = A.ask('a', { text: 'Choose 1 of your Characters in BATTLE to Retreat', from: A.battleChars(me) });
          const b = A.ask('b', { text: 'Choose 1 of your cards in BASE to Retreat', from: A.base(me) });
          const c = A.ask('c', { text: 'Choose 1 opponent Character with Lv5 or lower in BATTLE to Retreat', from: A.battleChars(op).filter(i => A.lv(i) <= 5), prefer: 'high' });
          A.discard(A.self, 'Hourglass Bite');
          a.concat(b, c).forEach(i => A.retreat(i, 'Hourglass Bite'));
        }
      }]
    },
    /* 「Ordnance Drop」Iron Man */
    'SD01-007': {
      trig: [{
        id: 'called', zone: 'FIELD', optional: true, label: 'Ordnance Drop',
        text: 'Discard 1 card from your HAND to give 1 opponent Character with Lv5 or lower in BATTLE Power-2000 this turn?',
        when: (ev, self) => ev.k === 'CALLED' && ev.c === self,
        can: A => A.hand(A.p).length > 0,
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 card in your HAND to discard', from: A.hand(A.p) });
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv5 or lower in BATTLE (Power-2000 this turn)', from: A.battleChars(A.opp(A.p)).filter(i => A.lv(i) <= 5), prefer: 'high' });
          A.discard(d[0], 'Ordnance Drop');
          t.forEach(i => A.mod(i, 'p', -2000, 'Ordnance Drop'));
        }
      }]
    },
    /* 「Rage Exhaustion」Hulk */
    'SD01-008': {
      auto: [{
        stat: 'lv', zone: 'HAND',
        value: (A, src, tgt) => (tgt === src && ![0, 1].some(p => A.chars(p).some(i => A.lv(i) >= 4))) ? -2 : 0
      }]
    },
    /* 「MK44 - The Pulse」Hulk Buster */
    'SD01-009': {
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Discard 1 card, attach this card from HAND',
        can: A => A.hand(A.p).length > 1 && A.chars(A.p).length > 0,
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 other card in your HAND to discard', from: A.hand(A.p).filter(i => i !== A.self) });
          const h = A.ask('h', { text: 'Choose 1 of your Characters to attach this card to', from: A.chars(A.p), prefer: 'high' });
          A.discard(d[0], 'MK44 - The Pulse');
          A.attach(A.self, h[0]);
        }
      }],
      trig: [{
        id: 'retreat', zone: 'RETREAT', label: 'The Pulse',
        when: (ev, self) => ev.k === 'RETREATED' && ev.c === self && ev.from === 'field',
        can: A => A.set(A.p).length > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your face-down cards in BASE to show', from: A.set(A.p) });
          const lv = A.lv(s[0]);
          const cands = A.ret(A.p).filter(i => A.lv(i) === lv);
          const n = Math.min(2, A.baseRoom(A.p), cands.length);       // RS-004: sebanyak mungkin
          const c = A.ask('c', { text: 'Choose ' + n + ' Character(s) with Lv' + lv + ' in your RETREAT to place face-down into your BASE', from: cands, min: n, max: n });
          A.reveal(s[0]);
          c.forEach(i => A.toBaseFd(i, 'RETREAT'));
        }
      }]
    },
    /* 「The Red Room Wraith」Black Widow */
    'SD01-010': {
      acti: [{
        id: 'attach', zone: 'HAND', label: 'Attach to a [Human] Character (R+1)',
        can: A => A.chars(A.p).some(i => isHuman(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Characters with [Human] to attach this card to', from: A.chars(A.p).filter(i => isHuman(A, i)), prefer: 'high' });
          A.attach(A.self, h[0]);
        }
      }],
      auto: [{ stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1 : 0 }]
    },
    /* 「The Retaliator」Black Panther */
    'SD01-011': { counter: true },
    /* 「Hero File」Iron Man & Hulk — tanpa efek */
    'SD01-012': {},
    'SD01-013': {},
    /* 「The Retaliator」Iron Man */
    'SD01-014': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'The Retaliator',
        when: (ev, self) => ev.k === 'CALLED' && ev.c === self,
        can: A => A.battleChars(A.p).length < A.battleChars(A.opp(A.p)).length,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character with Lv3 or lower in BATTLE (Power-2000 this turn)', from: A.battleChars(A.opp(A.p)).filter(i => A.lv(i) <= 3), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -2000, 'The Retaliator'));
        }
      }]
    },
    /* 「The Devastator」Hulk */
    'SD01-015': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'The Devastator',
        when: (ev, self) => ev.k === 'CALLED' && ev.c === self,
        can: A => A.ret(A.p).some(i => A.color(i) === 'Merah'),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your red Characters in RETREAT to Prune', from: A.ret(A.p).filter(i => A.color(i) === 'Merah') });
          t.forEach(i => A.prune(i, 'The Devastator'));
          if (t.length) A.draw(A.p, 1);
        }
      }]
    },
    /* 「MK44-The Brawler」Hulk Buster */
    'SD01-016': {
      acti: [{
        id: 'attach', zone: 'FIELD', counter: true, once: true, label: 'Attach to a Character (Power+1000)',
        can: A => hostsFor(A).length > 0,
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 of your Characters to attach this card to', from: hostsFor(A), prefer: 'high' });
          const others = A.attached(h[0]).filter(i => i !== A.self);
          A.attach(A.self, h[0]);                                   // RS-005
          others.forEach(i => A.retreat(i, 'MK44-The Brawler'));
        }
      }],
      auto: [{ stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1000 : 0 }]
    },
    /* 「Thunder Wrath」Thor */
    'SD01-017': {
      double: (A, self) => A.battle(ctrl(A, self)).length === 1
    },
    /* ===================== SD02 MIND (kuning) ===================== */
    /* 「Hive Processor」Ultron */
    'SD02-001': {
      unique: true,
      auto: [
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? 1000 * A.setCount(A.ctrl(src)) : 0 },
        { stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => {
          const me = A.ctrl(src);
          if (tgt === src || A.ctrl(tgt) !== me || !A.slot(tgt)) return 0;
          if (A.ret(me).filter(i => A.color(i) === YELLOW).length < 9) return 0;
          return A.lv(tgt) === 1 && isMachine(A, tgt) ? 1000 * A.setCount(me) : 0;
        } }
      ]
    },
    /* 「Phase-Driven」Vision */
    'SD02-002': {
      unique: true,
      auto: [{ stat: 'r', zone: 'BATTLE', value: (A, src, tgt) => tgt === src ? A.setCount(A.ctrl(src)) : 0 }],
      trig: [{
        id: 'lost', zone: 'BATTLE', label: 'Phase-Driven',
        when: (e, self, A) => e.k === 'RETREATED' && e.fromZone === 'bat' && (e.cause === 'lost the fight' || e.cause === 'BOTH LOSE') && e.ctrl === A.p && e.c !== self && isMachine(A, e.c),   // BOTH LOSE = kalah bertarung (K-17)
        can: A => A.baseRoom(A.p) > 0 && A.zone(ev(A).c) === 'RETREAT',
        run: A => { A.toBaseFd(ev(A).c, 'RETREAT'); }
      }]
    },
    /* 「Kinetic Redirection」Black Panther */
    'SD02-003': {
      bothLoseImmune: 'FRONT',
      auto: [{ stat: 'p', zone: 'BACK', value: (A, src, tgt) => tgt === A.at(A.opp(A.ctrl(src)), 'F') ? -500 : 0 }]
    },
    /* 「Tough Guardian」Hulk */
    'SD02-004': { counter: true },
    /* 「The Drone Surge」Ultron */
    'SD02-005': {
      acti: [{
        id: 'surge', zone: 'BASE', once: true, label: 'Discard the top 3 cards of your Deck, draw 1, turn this card face-down',
        can: A => A.deck(A.p).length >= 3,
        run: A => { A.mill(A.p, 3, 'The Drone Surge'); A.draw(A.p, 1); A.cover(A.self, 'The Drone Surge'); }
      }]
    },
    /* 「Powered Armor」Iron Man */
    'SD02-006': {
      trig: [{
        id: 'called', zone: 'BATTLE', optional: true, label: 'Powered Armor',
        text: 'Attach up to 2 of your Lv1 [Machine] Characters from RETREAT to this card?',
        when: calledSelf,
        can: A => lv1Machine(A, A.ret(A.p)).length > 0,
        run: A => {
          const c = lv1Machine(A, A.ret(A.p)), n = Math.min(2, c.length);      // sebanyak mungkin (seperti RS-004)
          const pick = A.ask('c', { text: 'Choose ' + n + ' Lv1 [Machine] Character(s) in your RETREAT to attach to this card', from: c, min: n, max: n, prefer: 'high' });
          pick.forEach(i => A.attach(i, A.self));
        }
      }],
      acti: [{
        id: 'detach', zone: 'BATTLE', once: true, label: 'Move 1 attached Lv1 card from this card to your BASE',
        can: A => A.baseRoom(A.p) > 0 && A.attached(A.self).some(i => A.lv(i) === 1),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 attached Lv1 card to move to your BASE', from: A.attached(A.self).filter(i => A.lv(i) === 1) });
          d.forEach(i => A.detachToBase(i, 'Powered Armor'));
        }
      }]
    },
    /* 「Unchained Fury」Red Hulk */
    'SD02-007': {
      acti: [{
        id: 'fury', zone: 'HAND', label: 'Place this card from HAND onto your FIELD',
        can: A => { const r = A.ret(A.p); return r.length >= 9 && r.every(i => A.color(i) === YELLOW) && A.canPlace(A.self, A.p); },
        run: A => {
          const to = A.pick('to', 'Choose where to place 「Unchained Fury」Red Hulk', slotOpts(A, A.spots(A.p)));
          if (to) A.place(A.self, to, 'Unchained Fury');
        }
      }]
    },
    /* 「System Anima」Vision */
    'SD02-008': {
      acti: [{
        id: 'anima', zone: 'BASE', once: true, label: '1 of your Characters in BATTLE gets R+1, turn this card face-down',
        can: A => A.battleChars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in BATTLE (R+1 this turn)', from: A.battleChars(A.p), prefer: 'high' });
          t.forEach(i => A.mod(i, 'r', 1, 'System Anima'));
          A.cover(A.self, 'System Anima');
        }
      }]
    },
    /* 「Cataclysm Protocol」Vision */
    'SD02-009': {
      acti: [{
        id: 'protocol', zone: 'BASE', once: true, label: '1 opponent Character in BATTLE gets Power-1000, turn this card face-down',
        can: A => A.battleChars(A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-1000 this turn)', from: A.battleChars(A.opp(A.p)), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -1000, 'Cataclysm Protocol'));
          A.cover(A.self, 'Cataclysm Protocol');
        }
      }]
    },
    /* 「Salvage and Sortie」War Machine */
    'SD02-010': {
      trig: [{
        id: 'called', zone: 'BATTLE', label: 'Salvage and Sortie',
        when: calledSelf,
        can: A => A.baseRoom(A.p) > 0 && lv1Machine(A, A.ret(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 Lv1 [Machine] Character in your RETREAT to place into your BASE', from: lv1Machine(A, A.ret(A.p)), prefer: 'high' });
          t.forEach(i => A.place(i, 'BASE', 'Salvage and Sortie'));
        }
      }]
    },
    /* 「Thunder Resonance」Thor */
    'SD02-011': {
      trig: [{
        id: 'lost', zone: 'BACK', once: true, label: 'Thunder Resonance',
        when: (e, self, A) => e.k === 'FIGHT_LOST' && e.p === A.p && e.plv <= 3,
        can: A => A.setCount(A.p) > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your face-down cards in BASE to show (flipped face-up if its Lv is ' + ev(A).lv + ')', from: A.set(A.p) });
          s.forEach(i => { A.reveal(i); if (A.plv(i) === ev(A).lv) A.flip(i, 'Thunder Resonance'); else A.log('Thunder Resonance: the shown card is not Lv' + ev(A).lv + ', so it stays face-down.'); });
        }
      }]
    },
    'SD02-012': {}, 'SD02-013': {},
    /* 「Giant Killer」Hulk Buster */
    'SD02-014': {
      trig: [{
        id: 'atk', zone: 'BATTLE', label: 'Giant Killer',
        when: (e, self, A) => e.k === 'ATTACK' && e.a === self && !!e.tg && A.lv(e.tg) >= 4,
        run: A => A.mod(A.self, 'p', 1500, 'Giant Killer')
      }]
    },
    /* 「Fractured Recompile」Vision */
    'SD02-015': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Fractured Recompile',
        when: calledSelf,
        can: A => A.baseRoom(A.p) > 0 && lv1Machine(A, A.ret(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 Lv1 [Machine] Character in your RETREAT to place into your BASE', from: lv1Machine(A, A.ret(A.p)), prefer: 'high' });
          t.forEach(i => A.place(i, 'BASE', 'Fractured Recompile'));
        }
      }]
    },
    /* 「Hunting Instinct」Black Panther */
    'SD02-016': {
      trig: [{ id: 'called', zone: 'FIELD', label: 'Hunting Instinct', when: calledSelf, run: A => A.grant(A.self, 'assault', '[ASSAULT]') }]
    },
    /* 「Anti-Tank」War Machine */
    'SD02-017': {
      trig: [{
        id: 'called', zone: 'FIELD', label: 'Anti-Tank', when: calledSelf,
        can: A => !!A.at(A.opp(A.p), 'F'),
        run: A => A.mod(A.at(A.opp(A.p), 'F'), 'p', -1000, 'Anti-Tank')
      }]
    },
    /* 「Melee Combat」Thor */
    'SD02-018': {
      auto: [{ stat: 'p', zone: 'BATTLE', value: (A, src, tgt) => { if (tgt !== src) return 0; const f = A.at(A.opp(A.ctrl(src)), 'F'); return f && A.r(f) === 1 ? 1500 : 0; } }]
    },

    /* ===================== SD03 SPACE (biru) ===================== */
    /* 「Supreme Watcher」Captain America */
    'SD03-001': {
      counter: true,
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Supreme Watcher', when: enterSelf,
        can: A => A.chars(A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in the field: this card gets Power+X (X = its Power) this turn', from: A.chars(A.opp(A.p)), prefer: 'high' });
          t.forEach(i => A.mod(A.self, 'p', A.pw(i), 'Supreme Watcher: Power of ' + A.name(i)));
        }
      }]
    },
    /* 「Wing Gust」Falcon */
    'SD03-002': {
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Wing Gust', when: enterSelf,
        can: A => A.baseRoom(A.opp(A.p)) > 0 && A.wings(A.opp(A.p)).some(i => A.lv(i) <= 4),
        run: A => {
          const op = A.opp(A.p);
          const t = A.ask('t', { text: "Choose 1 opponent Character with Lv4 or lower in a WING to move to your opponent's BASE", from: A.wings(op).filter(i => A.lv(i) <= 4), prefer: 'high' });
          t.forEach(i => { if (A.bbm(i, 'BASE', 'Wing Gust') && A.base(op).length >= 4) A.cover(i, 'Wing Gust'); });
        }
      }]
    },
    /* 「Urgent Call」Nick Fury */
    'SD03-003': {
      trig: [{
        id: 'bbm', zone: 'FIELD', optional: true, label: 'Urgent Call',
        text: 'Place 1 of your [Avengers] Characters from HAND onto your BATTLE, then retreat this card?',
        when: bbmSelf,
        can: A => A.spots(A.p).some(s => s !== 'BASE') && A.hand(A.p).some(i => isAvengers(A, i) && A.canPlace(i, A.p)),
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 [Avengers] Character in your HAND to place onto your BATTLE', from: A.hand(A.p).filter(i => isAvengers(A, i) && A.canPlace(i, A.p)), prefer: 'high' });
          const to = A.pick('to', 'Choose a BATTLE area', slotOpts(A, A.spots(A.p).filter(s => s !== 'BASE')));
          if (c.length && to && A.place(c[0], to, 'Urgent Call')) A.retreat(A.self, 'Urgent Call');
        }
      }]
    },
    /* 「Cold Shadow」New Black Panther */
    'SD03-004': {
      auto: [
        { stat: 'r', zone: 'BACK', value: (A, src, tgt) => tgt === src ? 2 : 0 },
        { stat: 'lv', zone: 'BASE', value: (A, src, tgt) => tgt === src ? 1 : 0 }
      ]
    },
    /* 「Base Regroup」Captain America */
    'SD03-005': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, optional: true, label: 'Base Regroup',
        text: 'Return 1 of your face-down cards in BASE to your HAND?',
        when: bbmSelf, can: A => A.setCount(A.p) > 0,
        run: A => { const s = A.ask('s', { text: 'Choose 1 of your face-down cards in BASE to return to your HAND', from: A.set(A.p) }); s.forEach(i => A.setToHand(i, 'Base Regroup')); }
      }]
    },
    /* 「Traction Arrow」Hawkeye */
    'SD03-006': {
      unique: true,
      acti: [{
        id: 'arrow', zone: 'BATTLE', once: true, label: 'Discard the top 2 cards of your Deck, draw 1',
        can: A => A.deck(A.p).length >= 2,
        run: A => { A.mill(A.p, 2, 'Traction Arrow'); A.draw(A.p, 1); }
      }]
    },
    /* 「Quantum Siphon」Ant-Man */
    'SD03-007': {
      trig: [{
        id: 'bbm', zone: 'FIELD', optional: true, label: 'Quantum Siphon',
        text: 'Prune this card, then place the top 3 cards of your Deck face-down into your BASE?',
        when: bbmSelf,
        run: A => { A.prune(A.self, 'Quantum Siphon'); A.setTop(A.p, 3, 'Quantum Siphon'); }
      }]
    },
    /* 「Freedom Inspirer」New Captain America */
    'SD03-008': {
      acti: [{
        id: 'inspire', zone: 'BATTLE', times: 2, label: 'Retreat 1 face-down card in BASE: 1 of your Characters in BATTLE gets Power+500',
        can: A => A.setCount(A.p) > 0,
        run: A => {
          const s = A.ask('s', { text: 'Choose 1 of your face-down cards in BASE to retreat', from: A.set(A.p) });
          const t = A.ask('t', { text: 'Choose 1 of your Characters in BATTLE (Power+500 this turn)', from: A.battleChars(A.p), prefer: 'high' });
          s.forEach(i => A.retreat(i, 'Freedom Inspirer'));
          t.forEach(i => A.mod(i, 'p', 500, 'Freedom Inspirer'));
        }
      }]
    },
    /* 「Fire Cover」Phil Coulson */
    'SD03-009': {
      trig: [{
        id: 'win', zone: 'FIELD', once: true, optional: true, label: 'Fire Cover',
        text: 'Swap this card with the Character that won the fight?',
        when: (e, self, A) => e.k === 'FIGHT_WON' && e.c !== self && A.ctrl(e.c) === A.p,
        can: A => { const L = A.loc(ev(A).c), M = A.loc(A.self); return !!L && !!M && L.p === A.p && M.p === A.p && /^(bat|base)$/.test(L.zone) && /^(bat|base)$/.test(M.zone); },
        run: A => A.swap(A.self, ev(A).c, 'Fire Cover')
      }]
    },
    /* 「Justice Descends」Captain America — Trigger Hand (Siaga) */
    'SD03-010': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Justice Descends',
        text: 'Place this card from your HAND into your BATTLE?',
        when: (e, self, A) => e.k === 'ENTER' && A.ctrl(e.c) === A.opp(A.p) && A.lv(e.c) === 6,
        can: A => A.zone(A.self) === 'HAND' && A.spots(A.p).some(s => s !== 'BASE') && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose a BATTLE area for 「Justice Descends」Captain America', slotOpts(A, A.spots(A.p).filter(s => s !== 'BASE')));
          if (to) A.place(A.self, to, 'Justice Descends');
        }
      }]
    },
    /* 「Ancestral Plane」New Black Panther */
    'SD03-011': {
      auto: [
        { stat: 'p', zone: 'FRONT', value: (A, src, tgt) => A.wings(A.opp(A.ctrl(src))).includes(tgt) ? -1000 : 0 },
        { stat: 'p', zone: 'WING', value: (A, src, tgt) => tgt === A.at(A.opp(A.ctrl(src)), 'F') ? -500 : 0 }
      ]
    },
    'SD03-012': {}, 'SD03-013': {},
    /* 「Freedom Watcher」New Captain America */
    'SD03-014': { counter: true },
    /* 「Martyrdom」Captain America — Trigger Hand (Siaga) */
    'SD03-015': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Martyrdom',
        text: 'Prune this card from your HAND to retreat the attacking Character?',
        when: (e, self, A) => e.k === 'ATTACK' && A.ctrl(e.a) === A.opp(A.p) && e.lv === 3,
        can: A => {
          const a = ev(A).a, L = A.loc(a);
          return A.zone(A.self) === 'HAND' && !!L && L.zone === 'bat' && sumLv(A, A.battleChars(A.p)) < sumLv(A, A.battleChars(A.opp(A.p)));
        },
        run: A => { A.prune(A.self, 'Martyrdom'); A.retreat(ev(A).a, 'Martyrdom'); }
      }]
    },
    /* 「Quantum Entanglement」Ant-Man — Trigger Hand (Siaga) */
    'SD03-016': {
      trig: [{
        id: 'hand', zone: 'HAND', optional: true, label: 'Quantum Entanglement',
        text: "Attach this card from your HAND to the opponent's attacking Character (its R changes to 1)?",
        when: (e, self, A) => e.k === 'ATTACK' && !!e.tg && A.ctrl(e.tg) === A.p && A.color(e.tg) === BLUE,
        can: A => { const L = A.loc(ev(A).a); return A.zone(A.self) === 'HAND' && !!L && L.zone === 'bat'; },
        run: A => A.attach(A.self, ev(A).a)
      }],
      auto: [{ stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? { set: 1 } : 0 }]
    },
    /* 「Flash Arrow」Hawkeye */
    'SD03-017': {
      acti: [{
        id: 'arrow', zone: 'BATTLE', counter: true, once: true, label: 'Discard 1 [Avengers] Character: 1 opponent Character in BATTLE gets Power-1000',
        can: A => A.hand(A.p).some(i => isAvengers(A, i)),
        run: A => {
          const d = A.ask('d', { text: 'Choose 1 [Avengers] Character in your HAND to discard', from: A.hand(A.p).filter(i => isAvengers(A, i)) });
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-1000 this turn)', from: A.battleChars(A.opp(A.p)), prefer: 'high' });
          A.discard(d[0], 'Flash Arrow');
          t.forEach(i => A.mod(i, 'p', -1000, 'Flash Arrow'));
        }
      }]
    },
    /* 「Void Banish」Scarlet Witch */
    'SD03-018': {
      trig: [{
        id: 'end', zone: 'FIELD', optional: true, label: 'Void Banish',
        text: 'Prune 1 of your cards in RETREAT; then 1 of your Characters takes BATTLE-BASE MOVE?',
        when: e => e.k === 'TURN_END',
        can: A => A.ret(A.p).length > 0,
        run: A => {
          const r = A.ask('r', { text: 'Choose 1 card in your RETREAT to Prune', from: A.ret(A.p) });
          const c = A.ask('c', { text: 'Choose 1 of your Characters to take BATTLE-BASE MOVE', from: movable(A, A.p) });
          const to = c.length ? A.pick('to', 'Move ' + A.name(c[0]) + ' to:', slotOpts(A, A.bbmDests(c[0]))) : null;
          r.forEach(i => A.prune(i, 'Void Banish'));
          if (c.length && to) A.bbm(c[0], to, 'Void Banish');
        }
      }]
    },

    /* ===================== SD04 TIME (hijau) ===================== */
    /* 「God of Trick」Loki */
    'SD04-001': {
      acti: [{
        id: 'attach', zone: 'HAND', counter: true, label: 'Attach this card from HAND to a [Human] Character (R changes to 0, Power+1000)',
        can: A => A.allChars().some(i => isHuman(A, i)),
        run: A => {
          const h = A.ask('h', { text: 'Choose 1 Character with [Human] in the field (either player) to attach this card to', from: A.allChars().filter(i => isHuman(A, i)), prefer: 'high' });
          h.forEach(i => A.attach(A.self, i));
        }
      }],
      auto: [
        { stat: 'r', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? { set: 0 } : 0 },
        { stat: 'p', zone: 'FIELD', value: (A, src, tgt) => A.host(src) === tgt ? 1000 : 0 }
      ]
    },
    /* 「Clustered Arrow」Hawkeye */
    'SD04-002': {
      trig: [{
        id: 'enter', zone: 'FIELD', label: 'Clustered Arrow', when: enterSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p).slice(0, 2), X = top.length === 2 ? top.reduce((s, i) => s + A.plv(i), 0) : 0;
          const t = top.length === 2 ? A.ask('t', { text: 'Discarded: ' + top.map(A.name).join(', ') + ' (total Lv ' + X + '). Choose 1 opponent Character in BATTLE (Power-' + X + '000 this turn)', from: A.battleChars(A.opp(A.p)), prefer: 'high' }) : [];
          const got = A.mill(A.p, 2, 'Clustered Arrow');
          if (got.length === 2) t.forEach(i => A.mod(i, 'p', -1000 * X, 'Clustered Arrow'));
        }
      }]
    },
    /* 「Quantum Rewind」Ant-Man */
    'SD04-003': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Rewind', when: leftFieldToRet,
        run: A => {
          const me = A.p, op = A.opp(me), mine = A.battleChars(me), theirs = A.battleChars(op);
          const hi = mine.length ? Math.max.apply(null, mine.map(A.lv)) : 0, lo = theirs.length ? Math.min.apply(null, theirs.map(A.lv)) : 0;
          const a = A.ask('a', { text: 'Choose 1 of your Characters in BATTLE with the highest Lv (' + hi + ') to return to your HAND', from: mine.filter(i => A.lv(i) === hi) });
          const b = A.ask('b', { text: 'Choose 1 opponent Character in BATTLE with the lowest Lv (' + lo + ') to return to their HAND', from: theirs.filter(i => A.lv(i) === lo), prefer: 'high' });
          if (!A.prune(A.self, 'Quantum Rewind')) return;
          a.concat(b).forEach(i => A.toHand(i, 'Quantum Rewind'));
        }
      }]
    },
    /* 「Justice Descends」New Captain America — [BLOCK] (305.2) */
    'SD04-004': {
      acti: [{
        id: 'block', zone: 'BATTLE', counter: true, once: true, label: '[BLOCK] Change the Attack Target to this card',
        can: A => {
          const c = A.cur(); if (!c || A.ctrl(c.a) !== A.opp(A.p) || c.tg === A.self) return false;
          const s = A.slot(A.self); return !!s && A.targetsOf(c.a).some(t => t.slot === s);
        },
        run: A => A.redirect(A.self, '[BLOCK]')
      }]
    },
    /* 「Quantum Teleportation」Ant-Man */
    'SD04-005': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Teleportation', when: leftFieldToRet,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters with Lv3 or lower in the field to get [AIR STRIKE] this turn', from: A.chars(A.p).filter(i => A.lv(i) <= 3), prefer: 'high' });
          if (!A.prune(A.self, 'Quantum Teleportation')) return;
          t.forEach(i => A.grant(i, 'air', '[AIR STRIKE]'));
        }
      }]
    },
    /* 「Covert Maneuvers」Nick Fury */
    'SD04-006': {
      trig: [{
        id: 'bbm', zone: 'FIELD', once: true, label: 'Covert Maneuvers', when: bbmSelf,
        can: A => A.chars(A.p).some(i => isAvengers(A, i)),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your [Avengers] Characters in the field to return to your HAND', from: A.chars(A.p).filter(i => isAvengers(A, i)) });
          if (t.length && A.toHand(t[0], 'Covert Maneuvers')) A.draw(A.p, 1);
        }
      }]
    },
    /* 「HYDRA Commander」Crossbones */
    'SD04-007': {
      acti: [{
        id: 'move', zone: 'FIELD', once: true, label: '1 of your Characters takes BATTLE-BASE MOVE',
        can: A => movable(A, A.p).length > 0,
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Characters to take BATTLE-BASE MOVE', from: movable(A, A.p) });
          const to = A.pick('to', 'Move ' + A.name(c[0]) + ' to:', slotOpts(A, A.bbmDests(c[0])));
          if (to) A.bbm(c[0], to, 'HYDRA Commander');
        }
      }]
    },
    /* 「Tactical Repositioning」Baron Zemo */
    'SD04-008': {
      trig: [{
        id: 'disc', zone: 'RETREAT', label: 'Tactical Repositioning', when: discardedByEffect,
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.p) > 0,
        run: A => A.setTop(A.p, 2, 'Tactical Repositioning')
      }]
    },
    /* 「Tactical Repositioning」Captain America — FAQ-12: tidak terpicu oleh batas HAND 9 */
    'SD04-009': {
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'Tactical Repositioning',
        text: 'Place this card from RETREAT onto your FIELD? (Your opponent then places the top card of their Deck face-down into their BASE.)',
        when: discardedByEffect,
        can: A => A.zone(A.self) === 'RETREAT' && A.canPlace(A.self, A.p),
        run: A => {
          const to = A.pick('to', 'Choose where to place 「Tactical Repositioning」Captain America', slotOpts(A, A.spots(A.p)));
          if (to && A.place(A.self, to, 'Tactical Repositioning')) A.setTop(A.opp(A.p), 1, 'Tactical Repositioning');
        }
      }]
    },
    /* 「Coiled Strike」Hydra */
    'SD04-010': { counter: true },
    /* 「Subterranean Network」Mole Man */
    'SD04-011': {
      acti: [{
        id: 'net', zone: 'BATTLE', once: true, label: 'The R of 1 of your Characters in BATTLE changes to 2 this turn',
        can: A => A.battleChars(A.p).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Characters in BATTLE (R changes to 2 this turn)', from: A.battleChars(A.p), prefer: 'high' });
          t.forEach(i => A.setStat(i, 'r', 2, 'Subterranean Network'));
        }
      }]
    },
    'SD04-012': {}, 'SD04-013': {},
    /* 「True Justice」Captain America */
    'SD04-014': {
      trig: [{
        id: 'disc', zone: 'RETREAT', optional: true, label: 'True Justice',
        text: 'Swap this card in RETREAT with 1 of your Lv6 Characters in the field?',
        when: discardedByEffect,
        can: A => A.zone(A.self) === 'RETREAT' && A.chars(A.p).some(i => A.lv(i) === 6),
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 of your Lv6 Characters in the field to swap with', from: A.chars(A.p).filter(i => A.lv(i) === 6) });
          t.forEach(i => A.swap(A.self, i, 'True Justice'));
        }
      }]
    },
    /* 「Quantum Gate」Ant-Man */
    'SD04-015': {
      trig: [{
        id: 'ret', zone: 'RETREAT', label: 'Quantum Gate', when: leftFieldToRet,
        run: A => {
          const c = A.ask('c', { text: 'Choose 1 of your Characters to take BATTLE-BASE MOVE', from: movable(A, A.p) });
          const to = c.length ? A.pick('to', 'Move ' + A.name(c[0]) + ' to:', slotOpts(A, A.bbmDests(c[0]))) : null;
          if (!A.prune(A.self, 'Quantum Gate')) return;
          if (c.length && to) A.bbm(c[0], to, 'Quantum Gate');
        }
      }]
    },
    /* 「Weaver of Lies」Loki */
    'SD04-016': {
      auto: [{ stat: 'lv', zone: 'FIELD', value: (A, src, tgt) => tgt === A.at(A.opp(A.ctrl(src)), 'B') ? -2 : 0 }]
    },
    /* 「Hit&Run」Winter Soldier */
    'SD04-017': {
      trig: [{
        id: 'bbm', zone: 'FIELD', label: 'Hit&Run', when: bbmSelf,
        can: A => A.battleChars(A.opp(A.p)).length > 0,
        run: A => {
          const t = A.ask('t', { text: 'Choose 1 opponent Character in BATTLE (Power-1000 this turn)', from: A.battleChars(A.opp(A.p)), prefer: 'high' });
          t.forEach(i => A.mod(i, 'p', -1000, 'Hit&Run'));
        }
      }]
    },
    /* 「Run&Search」Winter Soldier — kartu yang akan ditarik ikut ditawarkan untuk dibuang (draw dulu, lalu buang 1) */
    'SD04-018': {
      trig: [{
        id: 'bbm', zone: 'FIELD', label: 'Run&Search', when: bbmSelf,
        can: A => A.deck(A.p).length > 0,
        run: A => {
          const top = A.deck(A.p)[0];
          const d = A.ask('d', { text: 'You draw ' + A.name(top) + '. Choose 1 card in your HAND (including the drawn card) to discard', from: A.hand(A.p).concat([top]) });
          A.draw(A.p, 1);
          d.forEach(i => A.discard(i, 'Run&Search'));
        }
      }]
    },

    /* 「Cosmic Legacy」Silver Surfer */
    'SD01-018': {
      trig: [{
        id: 'cost', zone: 'RETREAT', optional: true, label: 'Cosmic Legacy',
        text: 'Place the top card of your Deck face-down into your BASE, then put this card on the bottom of your Deck?',
        when: (ev, self) => ev.k === 'RETREATED' && ev.c === self && ev.from === 'field' && ev.cause === 'CALL cost',
        can: A => A.deck(A.p).length > 0 && A.baseRoom(A.p) > 0,
        run: A => {
          A.toBaseFd(A.deck(A.p)[0], 'Deck');
          A.toDeckBottom(A.self);
        }
      }]
    }
  };

  S.registerCards(DEFS);
  if (typeof module !== 'undefined' && module.exports) module.exports = DEFS;
  else root.MHRCardDefs = DEFS;
})(typeof window !== 'undefined' ? window : this);
