/* ===================================================================
   MHR BATTLE SIM — LEARN TO PLAY (sim-learn.js)            o2.35 · riwayat #114
   ===================================================================
   Mode "Learn To Play Marvel Hero Rush" untuk pemula (permintaan pemilik 19 Nov 2026, bentuk: tutorial interaktif
   bertahap). Setiap pelajaran = posisi Sandbox kecil dengan kartu tanpa teks efek (Hero File) dan kartu [COUNTER] saja,
   lawan yang langkahnya diatur skrip (opp), pembatas aksi (allow) supaya pemain tetap di jalur, dan panel pelatih (#coach)
   yang menyalakan bagian papan yang sedang dibahas. Mesin & aturan tetap sim.js; tidak ada yang disimpan ke riwayat.
   Teks dibuat dalam bahasa aktif (EN/ID). Kemajuan (pelajaran selesai) di localStorage 'mhrsim.learn.v1' (hanya perangkat ini).
   Kait di sim-ui.js: startLesson(pos, lesson), ui.lesson.opp / allow, render() → MHRSimLearn.after(G, ui).
   =================================================================== */
(function () {
  'use strict';
  const S = () => window.MHRSim, UI = () => window.MHRSimUI;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ID = () => !!(window.MHRSimI18N && window.MHRSimI18N.lang === 'id');
  const T = (en, ind) => ID() ? ind : en;
  const KEY = 'mhrsim.learn.v1';
  const done = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  const saveDone = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* abaikan */ } };

  // Kartu pelajaran: tanpa teks efek, kecuali Tough Guardian (hanya [COUNTER]).
  const C = {
    hulk: 'SD01-013',      // 「Hero File」Hulk        Lv3 · Power 4500 · R1
    thor: 'SD02-012',      // 「Hero File」Thor        Lv3 · Power 2500 · R4
    vision: 'SD02-013',    // 「Hero File」Vision      Lv2 · Power 2500 · R3
    iron: 'SD01-012',      // 「Hero File」Iron Man    Lv6 · Power 6000 · R2
    guard: 'SD02-004',     // 「Tough Guardian」Hulk   Lv3 · Power 3000 · R1 · [COUNTER]
    falcon: 'SD03-013',    // 「Hero File」Falcon      Lv3 · Power 3500 · R2
    cap: 'SD03-012',       // 「Hero File」Captain America Lv4 · Power 5500 · R1
    ant: 'SD04-012',       // 「Hero File」Ant-Man     Lv3 · Power 5500 · R0
    hawk: 'SD04-013'       // 「Hero File」Hawkeye     Lv5 · Power 3500 · R5
  };
  const filler = n => { const a = [], pool = [C.hulk, C.thor, C.vision, C.falcon, C.cap, C.ant]; for (let i = 0; i < n; i++) a.push(pool[i % pool.length]); return a; };
  const fd = no => ({ no, fd: 1 });
  const pl = o => Object.assign({ deck: filler(20), hand: [], ret: [], void: [], rp: 0, bat: { F: null, W1: null, W2: null, B: null }, base: [] }, o);
  const names = () => [T('You', 'Anda'), T('Rival', 'Lawan')];

  /* ---------- bantuan untuk syarat & pembatas ---------- */
  // Kartu pengisi Deck memakai nomor yang sama, jadi yang dicek selalu salinan di BATTLE.
  const inBat = (G, no, p, slots) => { const P = G.P[p]; return S().SLOTS.some(sl => P.bat[sl] && G.inst[P.bat[sl]].no === no && (!slots || slots.includes(sl))); };
  const gone = (G, no, p) => !inBat(G, no, p);
  const pr = G => G && G.prompt;
  const mine = (G, type) => !!(pr(G) && pr(G).p === 0 && (!type || pr(G).type === type));
  const slotName = s => ({ F: 'FRONT', W1: 'WING 1', W2: 'WING 2', B: 'BACK' })[s] || s;
  // lawan default: tidak melakukan apa-apa (End Action, tidak menyerang, pass)
  function oppDefault(G) {
    const p = pr(G); if (!p) return null;
    switch (p.type) {
      case 'main': return { t: 'endAction' };
      case 'arrange': return { t: 'arrange', map: null };
      case 'attack': { const a = S().attackersNow(G)[0]; return a ? { t: 'noAttack', a } : null; }
      case 'counter': return { t: 'pass' };
      case 'opt': return { t: 'opt', yes: false };
    }
    const L = S().legalActions(G, { limit: 20 }); return L && L.length ? L[0] : null;
  }
  // pesan umum saat pemain di jendela Counter tetapi pelajaran tidak membutuhkan apa-apa
  const passOnly = (G, a) => (mine(G, 'counter') && a.t !== 'pass') ? T('Nothing to do here in this lesson: tap Pass.', 'Di pelajaran ini tidak ada yang perlu dilakukan di sini: ketuk Pass.') : null;

  /* ---------- pelajaran ---------- */
  const LESSONS = [
    {
      key: 'board', icon: '🗺️', t: ['The board and how to win', 'Papan dan cara menang'],
      d: ['A short tour of the playing field.', 'Tur singkat area permainan.'],
      pos: () => ({ v: 1, x: 1, seed: 11, turn: 3, tp: 0, names: names(), pl: [
        pl({ hand: [C.thor, C.guard, C.iron], rp: 2, bat: { F: { no: C.hulk }, W1: { no: C.vision }, W2: null, B: null }, base: [fd(C.thor), fd(C.cap)] }),
        pl({ hand: [C.hulk, C.ant, C.vision], rp: 1, bat: { F: { no: C.falcon }, W1: null, W2: null, B: { no: C.hawk } }, base: [fd(C.thor), fd(C.ant)] })] }),
      allow: () => T('Finish the tour first: tap Next in the coach panel.', 'Selesaikan tur dulu: ketuk Lanjut di panel pelatih.'),
      steps: [
        { next: 1, t: ['Welcome to Marvel Hero Rush! Two players battle with Characters. You win when you collect <b>9 Rush Points</b>, or when your opponent\'s Deck runs out of cards.',
          'Selamat datang di Marvel Hero Rush! Dua pemain bertarung dengan Karakter. Anda menang bila mengumpulkan <b>9 Rush Point</b>, atau bila Deck lawan habis.'] },
        { next: 1, hl: '.side-me .battle', t: ['This is your <b>BATTLE</b>: 4 areas — FRONT, two WINGS and BACK. Your Characters attack from here.',
          'Ini <b>BATTLE</b> Anda: 4 area — FRONT, dua WING, dan BACK. Karakter Anda menyerang dari sini.'] },
        { next: 1, hl: '.side-me [data-slot="F"] .card', t: ['Every Character shows <b>Lv</b> (level), <b>Power</b> (strength in a fight) and <b>R</b> (range: how far it can attack). This Hulk: Lv3, Power 4500, R1. Tap a card any time to read it.',
          'Setiap Karakter punya <b>Lv</b> (level), <b>Power</b> (kekuatan saat bertarung), dan <b>R</b> (jangkauan serangan). Hulk ini: Lv3, Power 4500, R1. Ketuk kartu kapan saja untuk membacanya.'] },
        { next: 1, hl: '.side-me .basebox', t: ['Your <b>BASE</b> holds up to 6 cards. Face-down cards here are your "set" cards: later you can retreat them to pay for big Characters (each counts as Lv1).',
          '<b>BASE</b> Anda memuat sampai 6 kartu. Kartu tertutup di sini adalah kartu "set": nanti bisa di-retreat untuk membayar Karakter besar (masing-masing dihitung Lv1).'] },
        { next: 1, hl: '#handRow', t: ['Your <b>HAND</b>. You draw 2 cards at the start of every turn.', '<b>HAND</b> Anda. Anda mengambil 2 kartu di awal setiap giliran.'] },
        { next: 1, hl: '.side-me .rail', t: ['Your <b>Deck</b>, <b>RETREAT</b> (defeated and used cards) and <b>VOID</b> (removed cards). If your Deck reaches 0 cards, you lose.',
          '<b>Deck</b>, <b>RETREAT</b> (kartu yang kalah dan terpakai), dan <b>VOID</b> (kartu yang dikeluarkan) Anda. Bila Deck Anda tinggal 0 kartu, Anda kalah.'] },
        { next: 1, hl: '#teamL', t: ['Your <b>Rush Points</b>. You get one each time a Character attacks an <b>empty</b> area of your opponent (a Weakness). 9 wins the game.',
          '<b>Rush Point</b> Anda. Anda mendapat satu setiap kali Karakter menyerang area lawan yang <b>kosong</b> (Weakness). 9 = menang.'] },
        { next: 1, hl: '.side-opp .battle', t: ['Your opponent\'s side. Their empty WINGS are Weaknesses you can attack for Rush Points — if your Characters can reach them.',
          'Sisi lawan. WING mereka yang kosong adalah Weakness yang bisa Anda serang untuk Rush Point — bila Karakter Anda bisa menjangkaunya.'] },
        { next: 1, t: ['A turn goes: <b>Draw 2</b> → <b>Action Phase</b> (set a card in BASE, CALL Characters) → <b>Battle Phase</b> (attack) → <b>Counter Phase</b> → <b>End</b>. The next lessons let you play each part.',
          'Satu giliran: <b>Ambil 2</b> → <b>Action Phase</b> (set kartu di BASE, CALL Karakter) → <b>Battle Phase</b> (menyerang) → <b>Counter Phase</b> → <b>End</b>. Pelajaran berikutnya mengajak Anda memainkan setiap bagian.'] }
      ]
    },
    {
      key: 'turn', icon: '⚔️', t: ['Your first turn: set, CALL, attack', 'Giliran pertama: set, CALL, serang'],
      d: ['Place a card in BASE, call two Characters and attack.', 'Taruh kartu di BASE, CALL dua Karakter, lalu menyerang.'],
      pos: () => ({ v: 1, x: 1, seed: 22, turn: 2, tp: 0, names: names(), pl: [
        pl({ hand: [C.hulk, C.thor, C.vision, C.cap] }),
        pl({ hand: [], bat: { F: { no: C.falcon }, W1: null, W2: null, B: null }, base: [fd(C.ant)] })] }),
      steps: [
        { hl: '#handRow', t: ['<b>Base Deployment</b>: once per turn you may place 1 card from your HAND face-down into your BASE, then draw 1. Tap <b>Captain America</b> in your HAND → <b>Base Deployment</b>.',
          '<b>Base Deployment</b>: satu kali per giliran Anda boleh menaruh 1 kartu dari HAND secara tertutup ke BASE, lalu mengambil 1 kartu. Ketuk <b>Captain America</b> di HAND → <b>Base Deployment</b>.'],
          done: G => G.cnt && G.cnt.deploy >= 1,
          allow: (G, a) => a.t === 'deploy' ? null : T('First set a card in your BASE: tap Captain America → Base Deployment.', 'Set dulu satu kartu di BASE: ketuk Captain America → Base Deployment.') },
        { hl: '.side-me [data-slot="F"]', t: ['Now <b>CALL</b> a Character. Lv1–3 Characters cost nothing. Tap <b>Hulk</b> (Power 4500, R1) → <b>CALL</b> → put it in your <b>FRONT</b>.',
          'Sekarang <b>CALL</b> Karakter. Karakter Lv1–3 tidak perlu biaya. Ketuk <b>Hulk</b> (Power 4500, R1) → <b>CALL</b> → taruh di <b>FRONT</b> Anda.'],
          done: G => inBat(G, C.hulk, 0, ['F']),
          allow: (G, a) => a.t === 'call' && G.inst[a.c] && G.inst[a.c].no === C.hulk && a.to === 'F' ? null : T('CALL Hulk into your FRONT.', 'CALL Hulk ke FRONT Anda.') },
        { hl: '.side-me [data-slot="W1"], .side-me [data-slot="W2"]', t: ['CALL <b>Thor</b> (Power 2500, R4) into a <b>WING</b>. With R4 he can reach any area of your opponent.',
          'CALL <b>Thor</b> (Power 2500, R4) ke salah satu <b>WING</b>. Dengan R4 ia bisa menjangkau area lawan mana pun.'],
          done: G => inBat(G, C.thor, 0, ['W1', 'W2']),
          allow: (G, a) => a.t === 'call' && G.inst[a.c] && G.inst[a.c].no === C.thor && (a.to === 'W1' || a.to === 'W2') ? null : T('CALL Thor into one of your WINGS.', 'CALL Thor ke salah satu WING Anda.') },
        { hl: '#tray, #fab', t: ['Done with the Action Phase. Tap <b>End Action Phase</b> to go to the Battle Phase.', 'Action Phase selesai. Ketuk <b>End Action Phase</b> untuk masuk ke Battle Phase.'],
          done: G => G.phase === 'battle',
          allow: (G, a) => a.t === 'endAction' ? null : T('Tap End Action Phase.', 'Ketuk End Action Phase.') },
        { hl: '#tray, #fab', t: ['Before attacking you may rearrange your Characters. They are fine where they are: tap <b>Skip</b>.', 'Sebelum menyerang Anda boleh menyusun ulang Karakter. Posisinya sudah pas: ketuk <b>Skip</b>.'],
          done: G => !(pr(G) && pr(G).type === 'arrange'),
          allow: (G, a) => a.t === 'arrange' ? null : null },
        { hl: '.side-opp [data-slot="F"]', t: ['Characters attack in order: FRONT, then WINGS, then BACK. Hulk is first. His R1 reaches only the opponent\'s FRONT: attack <b>Falcon</b>. Power 4500 beats 3500, so Falcon is retreated. Tap Hulk, then tap Falcon.',
          'Karakter menyerang berurutan: FRONT, lalu WING, lalu BACK. Hulk duluan. R1-nya hanya menjangkau FRONT lawan: serang <b>Falcon</b>. Power 4500 mengalahkan 3500, jadi Falcon di-retreat. Ketuk Hulk, lalu ketuk Falcon.'],
          done: G => gone(G, C.falcon, 1),
          allow: (G, a) => passOnly(G, a) || (a.t === 'noAttack' ? T('Attack Falcon with Hulk.', 'Serang Falcon dengan Hulk.') : null) },
        { hl: '.side-opp .battle', t: ['Now Thor. Every area of your opponent is empty: each one is a <b>Weakness</b>. Attack any of them to earn a <b>Rush Point</b>.',
          'Sekarang Thor. Semua area lawan kosong: masing-masing adalah <b>Weakness</b>. Serang salah satunya untuk mendapat <b>Rush Point</b>.'],
          done: G => G.P[0].rp >= 1,
          allow: (G, a) => passOnly(G, a) || (a.t === 'noAttack' ? T('Attack an empty area with Thor.', 'Serang area kosong dengan Thor.') : null) }
      ],
      end: ['You set a card, called two Characters, won a fight and scored your first Rush Point!', 'Anda menaruh kartu set, meng-CALL dua Karakter, memenangkan pertarungan, dan mencetak Rush Point pertama!']
    },
    {
      key: 'big', icon: '💪', t: ['Big Characters: CALL with a cost', 'Karakter besar: CALL dengan biaya'],
      d: ['Pay for a Lv6 Character with cards from your FIELD.', 'Bayar Karakter Lv6 dengan kartu dari FIELD Anda.'],
      pos: () => ({ v: 1, x: 1, seed: 33, turn: 4, tp: 0, names: names(), cnt: { deploy: 1 }, pl: [
        pl({ hand: [C.iron, C.vision], bat: { F: null, W1: { no: C.thor }, W2: null, B: null }, base: [fd(C.hulk), fd(C.vision), fd(C.falcon)] }),
        pl({ hand: [], bat: { F: { no: C.cap }, W1: null, W2: null, B: null }, base: [fd(C.ant)] })] }),
      steps: [
        { hl: '#handRow', t: ['Lv4 and higher Characters need a <b>cost</b>: retreat cards from your FIELD whose Lv adds up to <b>exactly</b> the new Character\'s Lv. Each face-down card counts as Lv1. Tap <b>Iron Man</b> (Lv6, Power 6000) → <b>CALL</b>.',
          'Karakter Lv4 ke atas butuh <b>biaya</b>: retreat kartu dari FIELD Anda yang total Lv-nya <b>tepat</b> sama dengan Lv Karakter baru. Setiap kartu tertutup dihitung Lv1. Ketuk <b>Iron Man</b> (Lv6, Power 6000) → <b>CALL</b>.'],
          done: G => { const u = UI().ui(); return (u.mode === 'call-cost' || u.mode === 'call-dest') && G.inst[u.sel] && G.inst[u.sel].no === C.iron || inBat(G, C.iron, 0); },
          allow: (G, a) => T('Tap Iron Man in your HAND, then CALL.', 'Ketuk Iron Man di HAND, lalu CALL.') },
        { hl: '.side-me .basebox, .side-me [data-slot="W1"]', t: ['Choose the cost: <b>Thor (Lv3) + the 3 face-down cards (Lv1 each) = 6</b>. Tap them, then put Iron Man into your <b>FRONT</b>.',
          'Pilih biayanya: <b>Thor (Lv3) + 3 kartu tertutup (masing-masing Lv1) = 6</b>. Ketuk semuanya, lalu taruh Iron Man di <b>FRONT</b> Anda.'],
          done: G => inBat(G, C.iron, 0, ['F']),
          allow: (G, a) => a.t === 'call' && G.inst[a.c] && G.inst[a.c].no === C.iron && a.to === 'F' ? null : T('Put Iron Man into your FRONT (pay exactly Lv6).', 'Taruh Iron Man di FRONT Anda (bayar tepat Lv6).') },
        { hl: '#tray, #fab', t: ['Tap <b>End Action Phase</b>, then <b>Skip</b> the rearranging.', 'Ketuk <b>End Action Phase</b>, lalu <b>Skip</b> penyusunan ulang.'],
          done: G => mine(G, 'attack'),
          allow: (G, a) => a.t === 'endAction' || a.t === 'arrange' ? null : T('Tap End Action Phase.', 'Ketuk End Action Phase.') },
        { hl: '.side-opp [data-slot="F"]', t: ['Iron Man attacks <b>Captain America</b>: Power 6000 against 5500. Tap Iron Man, then Captain America.',
          'Iron Man menyerang <b>Captain America</b>: Power 6000 lawan 5500. Ketuk Iron Man, lalu Captain America.'],
          done: G => gone(G, C.cap, 1),
          allow: (G, a) => passOnly(G, a) || (a.t === 'noAttack' ? T('Attack Captain America with Iron Man.', 'Serang Captain America dengan Iron Man.') : null) }
      ],
      end: ['Big Characters win big fights. Remember: the cost must match the Lv exactly.', 'Karakter besar memenangkan pertarungan besar. Ingat: biayanya harus tepat sama dengan Lv.']
    },
    {
      key: 'counter', icon: '🛡️', t: ['Defend with a COUNTER', 'Bertahan dengan COUNTER'],
      d: ['Stop an attack in your opponent\'s turn.', 'Hentikan serangan di giliran lawan.'],
      pos: () => ({ v: 1, x: 1, seed: 44, turn: 5, tp: 1, names: names(), cnt: { deploy: 1 }, pl: [
        pl({ hand: [C.guard], rp: 3, bat: { F: null, W1: { no: C.hulk }, W2: { no: C.iron }, B: null }, base: [fd(C.thor), fd(C.cap)] }),
        pl({ hand: [], rp: 3, bat: { F: null, W1: { no: C.vision }, W2: null, B: null }, base: [fd(C.ant)] })] }),
      opp: G => {
        const p = pr(G); if (!p) return null;
        if (p.type === 'attack') { const a = S().attackersNow(G)[0]; return a ? { t: 'attack', a, tg: 'F' } : null; }
        if (p.type === 'retarget') return { t: 'retarget', tg: 'F' };
        return oppDefault(G);
      },
      steps: [
        { hl: '.side-opp [data-slot="W1"]', t: ['It is your opponent\'s turn. Their Vision (Power 2500, R3) is attacking your empty <b>FRONT</b> — a Weakness. If the attack hits, they get a Rush Point…',
          'Sekarang giliran lawan. Vision mereka (Power 2500, R3) menyerang <b>FRONT</b> Anda yang kosong — sebuah Weakness. Bila serangan itu kena, mereka mendapat Rush Point…'],
          done: G => mine(G, 'counter') && G.bt && G.bt.cur },
        { hl: '#handRow', t: ['<b>Counter Step!</b> Every attack gives both players a chance to respond. <b>Tough Guardian</b> has [COUNTER]: it can be called right now. Tap it → <b>COUNTER CALL</b> → into the attacked <b>FRONT</b>.',
          '<b>Counter Step!</b> Setiap serangan memberi kedua pemain kesempatan merespons. <b>Tough Guardian</b> punya [COUNTER]: ia bisa di-CALL sekarang. Ketuk → <b>COUNTER CALL</b> → ke <b>FRONT</b> yang diserang.'],
          done: G => inBat(G, C.guard, 0, ['F']),
          allow: (G, a) => a.t === 'ccall' && G.inst[a.c] && G.inst[a.c].no === C.guard && a.to === 'F' ? null : T('COUNTER CALL Tough Guardian into your FRONT.', 'COUNTER CALL Tough Guardian ke FRONT Anda.') },
        { hl: '.side-me [data-slot="F"]', t: ['The FRONT is no longer empty, so the attacker must pick a new target: your Tough Guardian (3000) is stronger than Vision (2500). Tap <b>Pass</b> when asked and watch the fight.',
          'FRONT tidak lagi kosong, jadi penyerang harus memilih target baru: Tough Guardian Anda (3000) lebih kuat dari Vision (2500). Ketuk <b>Pass</b> bila ditanya dan lihat pertarungannya.'],
          done: G => gone(G, C.vision, 1),
          allow: (G, a) => a.t === 'pass' ? null : T('Tap Pass.', 'Ketuk Pass.') }
      ],
      end: ['You blocked a Rush Point and defeated the attacker. Keep a [COUNTER] card in HAND for your opponent\'s turn!', 'Anda mencegah Rush Point dan mengalahkan penyerang. Simpan kartu [COUNTER] di HAND untuk giliran lawan!']
    },
    {
      key: 'win', icon: '🏆', t: ['Finish the game', 'Selesaikan permainan'],
      d: ['You have 8 Rush Points. Find the last one!', 'Anda punya 8 Rush Point. Cari yang terakhir!'],
      pos: () => ({ v: 1, x: 1, seed: 55, turn: 8, tp: 0, names: names(), cnt: { deploy: 1, call: 0 }, pl: [
        pl({ hand: [C.vision], rp: 8, bat: { F: { no: C.hulk }, W1: { no: C.thor }, W2: null, B: null }, base: [fd(C.cap), fd(C.falcon)] }),
        pl({ hand: [], rp: 7, bat: { F: { no: C.falcon }, W1: { no: C.ant }, W2: null, B: null }, base: [fd(C.ant), fd(C.hulk)] })] }),
      steps: [
        { hl: '#tray, #fab', t: ['You have <b>8 Rush Points</b>: one more wins. Tap <b>End Action Phase</b>, then <b>Skip</b>.', 'Anda punya <b>8 Rush Point</b>: satu lagi menang. Ketuk <b>End Action Phase</b>, lalu <b>Skip</b>.'],
          done: G => mine(G, 'attack') || G.result,
          allow: (G, a) => a.t === 'endAction' || a.t === 'arrange' ? null : T('Tap End Action Phase.', 'Ketuk End Action Phase.') },
        { hl: '.side-opp [data-slot="F"]', t: ['Hulk (R1) can only reach the FRONT. Clear the way: attack <b>Falcon</b> (4500 against 3500).', 'Hulk (R1) hanya menjangkau FRONT. Buka jalan: serang <b>Falcon</b> (4500 lawan 3500).'],
          done: G => gone(G, C.falcon, 1) || !!G.result,
          allow: (G, a) => passOnly(G, a) || (a.t === 'noAttack' ? T('Attack Falcon with Hulk.', 'Serang Falcon dengan Hulk.') : null) },
        { hl: '.side-opp .battle', t: ['Thor (R4) is next. Ant-Man has Power 5500, too strong for Thor. Attack an <b>empty area</b> instead for the 9th Rush Point!', 'Giliran Thor (R4). Ant-Man punya Power 5500, terlalu kuat untuk Thor. Serang <b>area kosong</b> saja untuk Rush Point ke-9!'],
          done: G => !!G.result,
          allow: (G, a) => passOnly(G, a) || (a.t === 'attack' && G.P[1].bat[a.tg] ? T('Ant-Man is too strong. Choose an empty area.', 'Ant-Man terlalu kuat. Pilih area kosong.') : a.t === 'noAttack' ? T('Attack an empty area with Thor.', 'Serang area kosong dengan Thor.') : null) }
      ],
      end: ['9 Rush Points: you win! You know the basics of Marvel Hero Rush.', '9 Rush Point: Anda menang! Anda sudah tahu dasar Marvel Hero Rush.']
    }
  ];

  /* ---------- menjalankan pelajaran ---------- */
  let cur = null;      // { L, i, finished }
  function start(k) {
    const L = LESSONS[k]; if (!L) return;
    cur = { k, L, i: 0, finished: false };
    const lesson = {
      key: L.key,
      opp: G => (L.opp ? L.opp(G) : oppDefault(G)),
      allow: (G, a) => {
        if (!cur || cur.finished) return null;
        const st = L.steps[cur.i];
        if (st && st.allow) return st.allow(G, a);
        if (L.allow) return L.allow(G, a);
        return null;
      }
    };
    const errs = UI().startLesson(L.pos(), lesson);
    if (errs && errs.length) { alert('Lesson could not start: ' + errs.join(' ')); cur = null; }
  }
  function after(G, ui) {
    let el = $('coach');
    if (!G || !ui || !ui.lesson || !cur) { if (el) el.remove(); clearHl(); return; }
    const L = cur.L;
    let guard = 0;
    while (!cur.finished && guard++ < 20) {
      const st = L.steps[cur.i];
      if (!st) { cur.finished = true; break; }
      if (st.next || !st.done || !st.done(G)) break;
      cur.i++;
    }
    if (cur.i >= L.steps.length) cur.finished = true;
    if (cur.finished && !done[L.key]) { done[L.key] = Date.now(); saveDone(); }
    if (!el) { el = document.createElement('div'); el.id = 'coach'; el.setAttribute('data-noi18n', ''); document.body.appendChild(el); el.onclick = onCoach; }
    const dots = L.steps.map((_, k) => '<i class="' + (k < cur.i || cur.finished ? 'ok' : k === cur.i ? 'on' : '') + '"></i>').join('');
    const head = '<div class="ch-h"><span>' + L.icon + ' ' + esc(T('LEARN TO PLAY', 'BELAJAR BERMAIN')) + ' · ' + (cur.k + 1) + '/' + LESSONS.length + '</span><div class="ch-dots">' + dots + '</div><button class="ch-x" data-ch="min" title="' + esc(T('Hide / show the coach', 'Sembunyikan / tampilkan pelatih')) + '">' + (cur.min ? '▴' : '▾') + '</button><button class="ch-x" data-ch="exit" title="' + esc(T('Leave the lesson', 'Keluar dari pelajaran')) + '">✕</button></div>';
    if (cur.finished) {
      const nx = LESSONS[cur.k + 1];
      el.className = 'fin';
      el.innerHTML = head + '<div class="ch-b"><b>🎉 ' + esc(T('Lesson complete!', 'Pelajaran selesai!')) + '</b><p>' + esc(L.end ? T(L.end[0], L.end[1]) : T('Well done.', 'Bagus sekali.')) + '</p></div>' +
        '<div class="ch-a">' + (nx ? '<button class="pri" data-ch="next">' + esc(T('Next lesson: ', 'Pelajaran berikutnya: ') + T(nx.t[0], nx.t[1])) + ' →</button>' : '<button class="pri" data-ch="practice">' + esc(T('Play a full game vs the bot →', 'Main penuh melawan bot →')) + '</button>') +
        '<button data-ch="again">' + esc(T('Play again', 'Ulangi')) + '</button><button data-ch="exit">' + esc(T('All lessons', 'Semua pelajaran')) + '</button></div>';
      clearHl();
      return;
    }
    const st = L.steps[cur.i];
    // HP: panel kartu (#pop) terbuka → pelatih diperkecil supaya tombol aksi kartu tidak tertutup
    const popOn = !!document.querySelector('#pop.on') && innerWidth <= 820;
    // HP: pelatih di atas, kecuali saat yang dibahas sisi lawan (atas) → pindah ke bawah
    el.className = (cur.min || popOn ? 'mini ' : '') + (st.hl && /side-opp/.test(st.hl) ? 'low' : '');
    el.innerHTML = head + '<div class="ch-b"><b class="ch-t">' + esc(T(L.t[0], L.t[1])) + '</b><p>' + T(st.t[0], st.t[1]) + '</p></div>' +
      (st.next ? '<div class="ch-a"><button class="pri" data-ch="step">' + esc(cur.i === L.steps.length - 1 ? T('Finish', 'Selesai') : T('Next', 'Lanjut')) + ' →</button></div>' : '');
    clearHl();
    if (st.hl) document.querySelectorAll(st.hl).forEach(e => e.classList.add('coachhl'));
  }
  function clearHl() { document.querySelectorAll('.coachhl').forEach(e => e.classList.remove('coachhl')); }
  function onCoach(e) {
    const b = e.target.closest('[data-ch]'); if (!b || !cur) return;
    const a = b.dataset.ch, G = UI().state(), ui = UI().ui();
    if (a === 'step') { cur.i++; after(G, ui); return; }
    if (a === 'min') { cur.min = !cur.min; after(G, ui); return; }
    if (a === 'next') { start(cur.k + 1); return; }
    if (a === 'again') { start(cur.k); return; }
    if (a === 'practice') { cur = null; window.MHRSimUI.toMenu(); if (window.MHRSimModes) window.MHRSimModes.show('practice'); return; }
    if (a === 'exit') { cur = null; window.MHRSimUI.toMenu(); if (window.MHRSimModes) window.MHRSimModes.show('learn'); }
  }

  /* ---------- layar menu: Learn to Play ---------- */
  function render(el) {
    if (!el) return;
    const n = LESSONS.filter(L => done[L.key]).length;
    el.innerHTML = '<div class="hd"><h2>Learn to Play</h2></div><div data-noi18n>' +
      '<div class="box lnhero"><span class="lntag">' + esc(T('NEW TO MARVEL HERO RUSH?', 'BARU DI MARVEL HERO RUSH?')) + '</span><h3>' + esc(T('Learn to play in 5 short lessons', 'Belajar bermain dalam 5 pelajaran singkat')) + '</h3>' +
      '<p class="small">' + esc(T('Each lesson is a small game with a coach: you press the real buttons and the coach tells you what to do next. About 10 minutes in total.', 'Setiap pelajaran adalah permainan kecil dengan pelatih: Anda menekan tombol sungguhan dan pelatih memberi tahu langkah berikutnya. Sekitar 10 menit untuk semuanya.')) + '</p>' +
      '<div class="lnprog"><i style="width:' + Math.round(n / LESSONS.length * 100) + '%"></i></div><div class="small muted">' + esc(T(n + ' of ' + LESSONS.length + ' lessons completed', n + ' dari ' + LESSONS.length + ' pelajaran selesai')) + '</div></div>' +
      '<div class="lnlist">' + LESSONS.map((L, k) => '<button class="lnitem' + (done[L.key] ? ' ok' : '') + '" data-ln="' + k + '"><span class="ic">' + L.icon + '</span><span class="tx"><b>' + (k + 1) + '. ' + esc(T(L.t[0], L.t[1])) + '</b><small>' + esc(T(L.d[0], L.d[1])) + '</small></span><span class="st">' + (done[L.key] ? '✓' : '▶') + '</span></button>').join('') +
      '<button class="lnitem" data-ln="practice"><span class="ic">🤖</span><span class="tx"><b>6. ' + esc(T('Play a full game', 'Main satu permainan penuh')) + '</b><small>' + esc(T('Practice vs the bot (Easy) with hints ON.', 'Latihan melawan bot (Easy) dengan Hints ON.')) + '</small></span><span class="st">▶</span></button>' +
      '<button class="lnitem" data-mode="rules"><span class="ic">📖</span><span class="tx"><b>' + esc(T('Rules & rulings', 'Aturan & ruling')) + '</b><small>' + esc(T('Look up any rule or card ruling.', 'Cari aturan atau ruling kartu.')) + '</small></span><span class="st">→</span></button></div></div>';
    el.onclick = e => {
      const b = e.target.closest('[data-ln]'); if (!b) return;
      if (b.dataset.ln === 'practice') { if (window.MHRSimModes) window.MHRSimModes.show('practice'); return; }
      start(+b.dataset.ln);
    };
  }

  window.MHRSimLearn = { render, start, after, lessons: LESSONS, cards: C };
})();
