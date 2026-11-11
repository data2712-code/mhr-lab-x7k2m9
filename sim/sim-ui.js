/* ===================================================================
   MHR BATTLE SIM — PAPAN (sim-ui.js)        Tahap 3 · UI v5 "Broadcast" + Sandbox + Siaga
   UI v5 (riwayat #40–#41) + #52–#54: pelat pemain gaya Tabletop (lawan di atas papan, Anda di bawah di samping HAND,
   avatar dengan cincin jam), kapsul giliran·fase·jam + baki keputusan di tengah papan, Timeline di kanan, popover kartu
   (info + aksi) saat kartu diketuk/diklik, panel kanan hanya Play-by-play, tanpa kotak Continue (kilasan Rush Point
   hilang sendiri). Warna pemain mengikuti sudut pandang (bawah = biru, atas = merah).
   UI v3 (riwayat #32): perencana serangan, rincian stat, panel Counter, log berfilter, drag & drop (tekan-tahan),
   jam giliran/respons, efek suara (sim-sound.js).
   Semua teks yang tampil di layar berbahasa Inggris (keputusan pemilik 29 Okt 2026, riwayat #14).
   ===================================================================
   Papan pass-and-play lokal. Semua aturan ada di sim.js; berkas ini hanya
   menampilkan status, menerjemahkan klik menjadi aksi, dan menjaga
   informasi tersembunyi (tangan & kartu tertutup lawan, layar serah-terima).
   Mode Sandbox (Tahap 1c): satu orang memegang kedua pihak, semua kartu terbuka,
   tanpa layar serah-terima; editor posisinya ada di sim-sandbox.js.
   Mode online (O2, riwayat #63): G = status bayangan dari tampilan server (sim-shadow.js); aksi dikirim ke server
   lewat sim-online.js, server yang memutuskan; jam, Undo dengan izin lawan, dan hasil dari server.
   =================================================================== */
(function () {
  'use strict';
  const S = window.MHRSim, Bot = window.MHRBot, Shadow = window.MHRSimShadow;
  const BASE = window.MHRSIM_BASE || '../../mhr-lab-x7k2m9/';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const COLOR = { Merah: '#E4442E', Kuning: '#F2B01E', Biru: '#3B87E8', Hijau: '#33A45C', Orange: '#E8821E', Purple: '#8B5CF6' };
  const PHASES = [['draw', 'Draw'], ['action', 'Action'], ['battle', 'Battle'], ['counterPhase', 'Counter'], ['end', 'End']];

  let G = null;
  const ui = {
    ctrl: ['human', 'human'], viewer: null, manualCounter: false,
    tab: 'log', sideOn: false, hover: null,  // UI v5: tab panel kanan, panel terbuka di HP, kartu yang disorot
    sel: null, mode: null, callType: 'call', cost: [], arr: null, arrPick: null, atk: null, tg: null, pick: [],
    hist: [], replay: null, botRng: null, botTimer: null, msg: '', mullSel: [], discSel: [], overClosed: false, sandbox: false,
    siagaAsked: null,                       // Siaga: pemain yang sudah ditanya sebelum serah-terima ini
    // UI v3
    timer: 'standard', clk: null,            // jam giliran/respons
    sndN: 0, logPrevN: 0, logF: 'all',       // suara: entri log yang sudah dibunyikan; log: entri baru, filter
    seenN: {}, flashN: null,                 // Timeline: batas kejadian 'baru' per penonton; kilasan Rush Point
    drag: null, justDragged: 0, dropDest: null, bottomP: 0,
    // Riwayat #50: mode (practice | friend | custom), level bot, nama deck, sisi "saya" untuk riwayat, sudah dicatat?
    gmode: 'custom', botLevel: 'normal', deckNames: [], youIdx: null, recorded: false
  };
  /* ---------- penyimpanan di perangkat (riwayat #50): permainan yang sedang berjalan + riwayat pertandingan offline ----------
     localStorage bisa kosong/terlarang (mode privat): semua akses dibungkus try/catch, tampilan tetap jalan tanpanya. */
  const KEY_CUR = 'mhrsim.current.v1', KEY_HIST = 'mhrsim.history.v1', HIST_MAX = 100;
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  function savedGame() { const c = store.get(KEY_CUR); return c && c.code ? c : null; }
  function clearSaved() { store.del(KEY_CUR); }
  function history() { const h = store.get(KEY_HIST); return Array.isArray(h) ? h : []; }
  function histSet(list) { return store.set(KEY_HIST, list.slice(0, HIST_MAX)); }
  function histDel(id) { histSet(history().filter(r => r.id !== id)); }

  /* ---------------- muat data kartu ---------------- */
  function boot() {
    if (window.MHRSIM_CARDS_FAIL || !Array.isArray(window.CARDS)) {
      const e = $('loaderr'); e.style.display = 'block';
      e.innerHTML = '<b>Card data not found.</b>\nThe simulator reads <code>' + esc(BASE) + 'cards.js</code> from the site repo.\n' +
        'Make sure <code>GitHub\\mhr-simulator\\app\\index.html</code> and <code>GitHub\\mhr-lab-x7k2m9\\cards.js</code> are inside the same <code>GitHub</code> folder.';
      $('setup').style.display = 'none';
      return;
    }
    const n = S.init(window.CARDS);
    $('dbinfo').textContent = 'Data: ' + n + ' Characters from ' + BASE + 'cards.js (English card text) · engine v' + S.VERSION + '.' +
      (S.hiddenCount() ? ' SD05, SD06 and PB02 (' + S.hiddenCount() + ' cards) are hidden until their official Indonesian release.' : '');
    ['0', '1'].forEach(k => {
      // Tahap 5: deck komunitas dari data.js situs (nama deck saja) sebagai pilihan tambahan.
      const dk = $('dk' + k), cds = Array.isArray(window.DECK_KOMUNITAS) ? window.DECK_KOMUNITAS : [];
      const valid = cds.map((d, i) => ({ d, i })).filter(o => o.d && o.d.cd && !/</.test(o.d.cd));
      if (valid.length && !dk.querySelector('optgroup[data-cd]')) {
        const og = document.createElement('optgroup'); og.label = 'Community decks (MHR Deck Lab)'; og.setAttribute('data-cd', '1');
        valid.forEach(o => { const op = document.createElement('option'); op.value = 'cd:' + o.i; op.textContent = o.d.nm; og.appendChild(op); });
        dk.insertBefore(og, dk.querySelector('option[value="code"]'));
      }
      $('dk' + k).onchange = () => { $('dc' + k).style.display = $('dk' + k).value === 'code' ? 'block' : 'none'; };
    });
    $('btnStart').onclick = startNew;
    $('btnContinue').onclick = () => loadLog(false);
    $('btnReplay').onclick = () => loadLog(true);
    $('btnCopy').onclick = copyLog;
    $('btnUndo').onclick = undo;
    $('btnMenu').onclick = () => {
      if (net.on) { if (G && G.result || confirm('Leave this online game? Your seat is kept for 2 minutes; open Battle Sim again to return.')) window.MHRSimOnline.leaveGame(); return; }
      const keep = G && !G.result && !ui.replay;
      if (!keep || confirm('Back to the menu? This game is saved on this device: choose "Resume" on the menu to continue.')) toMenu();
    };
    // Tab/aplikasi berganti (mis. HP): simpan segera; jam berhenti selama halaman tersembunyi (clockPaused).
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
    window.addEventListener('pagehide', () => persist());
    $('rpStart').onclick = () => replayTo(0); $('rpEnd').onclick = () => replayTo(ui.replay.max);
    $('rpPrev').onclick = () => replayTo(ui.replay.n - 1); $('rpNext').onclick = () => replayTo(ui.replay.n + 1);
    $('rpRange').oninput = e => replayTo(+e.target.value);
    $('rpPlay').onclick = playFromReplay;
    $('btnEditPos').onclick = editPosition;
    $('btnSiaga').onclick = () => openSiaga(false);
    $('btnCopyPos').onclick = copyPosition;
    $('btnSandbox').onclick = () => window.MHRSandbox && window.MHRSandbox.open(null);
    document.addEventListener('click', onClick);
    $('btnSound').onclick = () => { const on = window.MHRSound && MHRSound.toggle(); $('btnSound').textContent = on ? '🔊' : '🔇'; };
    if (window.MHRSound) $('btnSound').textContent = MHRSound.on ? '🔊' : '🔇';
    initDrag();
    setInterval(tickClock, 250);
    window.addEventListener('resize', () => { if (G) render(); });
    document.addEventListener('keydown', e => {
      if (!G || e.target.closest('input,textarea,select')) return;
      if (e.key === 'Escape') { resetSel(); render(); }
    });
  }

  function readDeck(k) { return deckFrom($('dk' + k).value, $('dc' + k).value, 'Player ' + (+k + 1) + "'s"); }
  // Deck dari nilai pilihan menu (deck uji, deck komunitas, atau kode deck yang ditempel).
  function deckFrom(v, codeText, who) {
    if (/^sd0[1-4]$/.test(v)) return { list: S.testDeck(v.toUpperCase()), name: v.toUpperCase() + ' test deck' };
    if (/^bp01[rybg]$/.test(v)) return { list: S.testDeck(v.toUpperCase()), name: 'BP01 ' + ({ r: 'Red', y: 'Yellow', b: 'Blue', g: 'Green' })[v[4]] + ' test deck' };
    if (/^s4[rybg]$/.test(v)) return { list: S.testDeck(v.toUpperCase()), name: 'Stage 4 ' + ({ r: 'Red', y: 'Yellow', b: 'Blue', g: 'Green' })[v[2]] + ' test deck' };
    if (/^sp[rybg]$/.test(v)) return { list: S.testDeck(v.toUpperCase()), name: 'SP01 ' + ({ r: 'Red', y: 'Yellow', b: 'Blue', g: 'Green' })[v[2]] + ' test deck' };
    // Tahap 5: deck komunitas dari data.js situs (dibaca saja).
    const cm = v.match(/^cd:(\d+)$/);
    if (cm && window.DECK_KOMUNITAS && window.DECK_KOMUNITAS[+cm[1]]) {
      const dd = window.DECK_KOMUNITAS[+cm[1]], d = S.decodeDeckCode(dd.cd);
      if (!d) return { err: 'Community deck "' + dd.nm + '" could not be read.' };
      return { list: d.list, name: dd.nm, unknown: d.unknown, hidden: d.hidden };
    }
    const d = S.decodeDeckCode(codeText);
    if (!d) return { err: (who || 'The') + " deck code could not be read. Paste a link or a \"1.xxx.xxx\" code from the Deck Builder." };
    return d;
  }
  // Satu mode (keputusan pemilik, riwayat #39): efek selalu aktif, jam standar, tanpa pembukaan Counter manual.
  function readSetup() {
    ui.ctrl = [$('ct0').value, $('ct1').value];
    ui.manualCounter = false;
    ui.timer = $('clk') ? $('clk').value : 'standard';
    ui.botLevel = 'normal';
  }
  function startNew() {
    readSetup();
    ui.sandbox = false;
    const errs = [], decks = [];
    ['0', '1'].forEach(k => {
      const d = readDeck(k);
      if (d.err) { errs.push(d.err); return; }
      const v = S.validateDeck(d.list);
      if (v.length) errs.push('Player ' + (+k + 1) + "'s deck (" + d.name + '):\n- ' + v.join('\n- '));
      if (d.hidden) errs.push('Player ' + (+k + 1) + "'s deck has " + d.hidden + ' card(s) from SD05, SD06 or PB02. ' + S.HIDDEN_MSG + '.');
      if (d.unknown) errs.push('Player ' + (+k + 1) + "'s deck: " + d.unknown + ' unknown card code(s).');
      decks.push(d.list);
    });
    if (errs.length) { $('setupErr').textContent = errs.join('\n\n'); return; }
    $('setupErr').textContent = '';
    const sv = $('seed').value.trim();
    const seed = sv === '' ? undefined : (/^\d+$/.test(sv) ? +sv : S.seedFromString(sv));
    const f = $('first').value;
    const both = ui.ctrl[0] === 'human' && ui.ctrl[1] === 'human';
    launch({ decks, seed, first: f === 'random' ? 'random' : +f, names: [$('n0').value || 'Player 1', $('n1').value || 'Player 2'],
      ctrl: ui.ctrl, timer: ui.timer, botLevel: 'normal', gmode: both ? 'friend' : 'custom', deckNames: [0, 1].map(k => readDeck(k).name || 'Deck'),
      youIdx: both ? null : ui.ctrl.indexOf('human') });
  }
  /* Mulai permainan baru dari mode mana pun (riwayat #50). o: { decks, names, ctrl, first, seed, timer, botLevel, gmode,
     deckNames, youIdx }. Mode Siaga hanya di pass-and-play dua orang (kartu di HAND tetap rahasia). */
  function launch(o) {
    clearTimeout(ui.botTimer);
    ui.ctrl = o.ctrl.slice(); ui.manualCounter = false; ui.sandbox = false;
    ui.timer = o.timer || 'standard'; ui.botLevel = o.botLevel || 'normal'; ui.gmode = o.gmode || 'custom';
    ui.deckNames = (o.deckNames || []).slice(); ui.youIdx = o.youIdx == null ? null : o.youIdx; ui.recorded = false;
    ui.mleft = MATCH[ui.timer] || null;
    ui.lastLaunch = Object.assign({}, o, { seed: undefined });
    G = S.createGame({ decks: o.decks, seed: o.seed, first: o.first == null ? 'random' : o.first, names: o.names, vanilla: false,
      siaga: ui.ctrl[0] === 'human' && ui.ctrl[1] === 'human', confirm: true });   // pilihan tunggal tetap ditanyakan
    ui.hist = []; ui.replay = null;
    begin();
    return G;
  }
  // Lanjutkan permainan yang tersimpan otomatis di perangkat (mis. setelah tab/aplikasi berganti di HP).
  function resumeSaved() {
    const c = savedGame(); if (!c) return false;
    const o = S.parseLog(c.code); if (!o) { clearSaved(); return false; }
    clearTimeout(ui.botTimer);
    ui.ctrl = (c.ctrl || ['human', 'human']).slice(); ui.manualCounter = false; ui.sandbox = !!c.sandbox;
    ui.timer = c.timer || 'standard'; ui.botLevel = c.botLevel || 'normal'; ui.gmode = c.gmode || 'custom';
    ui.deckNames = (c.deckNames || []).slice(); ui.youIdx = c.youIdx == null ? null : c.youIdx; ui.recorded = false;
    ui.mleft = MATCH[ui.timer] ? (c.mleft != null ? Math.max(0, +c.mleft) : MATCH[ui.timer]) : null;
    G = S.replay(o);
    if (G.replayError) ui.msg = G.replayError;
    rebuildHist(); ui.replay = null;
    begin();
    return true;
  }
  // Simpan otomatis setelah setiap langkah; saat permainan selesai, catat ke riwayat offline lalu hapus simpanan.
  function persist() {
    if (!G || ui.replay || net.on) return;
    if (G.result) {
      if (!ui.recorded && !ui.sandbox) { const h = history(); h.unshift(matchRecord()); histSet(h); }
      ui.recorded = true; clearSaved(); return;
    }
    store.set(KEY_CUR, { v: 1, code: S.exportLog(G), gmode: ui.sandbox ? 'sandbox' : ui.gmode, ctrl: ui.ctrl, timer: ui.timer, botLevel: ui.botLevel,
      deckNames: ui.deckNames, youIdx: ui.youIdx, sandbox: ui.sandbox, names: G.names, turn: G.turn, mleft: ui.mleft, at: Date.now() });
  }
  // Satu baris riwayat (bentuk dekat dengan match_logs fitur Performance: context, deck, lawan, games[{r,f,e}]).
  function matchRecord() {
    const r = G.result, cause = r.cause || '';
    const end = r.time ? 'time' : r.winner < 0 ? 'draw' : /Rush Points/.test(cause) ? 'rp' : /0 cards/.test(cause) ? 'deck' : 'other';
    return {
      id: 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), at: new Date().toISOString(),
      online: false, context: 'sim_offline', mode: ui.gmode, names: G.names.slice(), ctrl: ui.ctrl.slice(), botLevel: ui.botLevel,
      decks: ui.deckNames.slice(), deckCodes: G.decks.map((d, i) => S.encodeDeckCode(d, ui.deckNames[i] || 'Deck')),
      first: G.first, winner: r.winner, end, cause, turns: G.turn, rp: [G.P[0].rp, G.P[1].rp], me: ui.youIdx, timeouts: G.to || [0, 0],
      clock: ui.timer, timeLeft: MATCH[ui.timer] ? Math.max(0, Math.round(ui.mleft || 0)) : null,
      code: S.exportLog(G), engine: S.VERSION
    };
  }
  function loadLog(asReplay) {
    readSetup();
    ui.mleft = MATCH[ui.timer] || null;
    const o = S.parseLog($('logIn').value);
    if (!o) { $('logErr').textContent = 'Log code could not be read (it must start with MHRSIM1.).'; return; }
    if (o.e && o.e !== S.VERSION) $('logErr').textContent = 'Note: this log was made with engine v' + o.e + '; current engine is v' + S.VERSION + '.';
    else $('logErr').textContent = '';
    ui.sandbox = !!o.q; ui.gmode = 'custom'; ui.youIdx = null; ui.recorded = false; ui.lastLaunch = null;
    if (ui.sandbox) ui.ctrl = ['human', 'human'];   // Sandbox: satu orang memegang kedua pihak
    if (asReplay) { ui.replay = { o, n: 0, max: (o.a || []).length }; G = S.replay(o, 0); ui.hist = []; begin(); replayTo(ui.replay.max); return; }
    G = S.replay(o);
    if (G.replayError) { $('logErr').textContent = G.replayError; }
    rebuildHist();
    ui.replay = null;
    begin();
  }
  function rebuildHist() {
    const o = S.parseLog(S.exportLog(G));
    const st = S.replay(o, 0);                 // titik awal yang sama (permainan biasa atau posisi Sandbox)
    ui.hist = [];
    (o.a || []).forEach(a => {
      const pr = st.prompt;
      const auto = pr.type === 'counter' && a.t === 'pass' && ((st.vanilla && !ui.manualCounter) ||
        (!st.vanilla && ui.ctrl[1 - pr.p] === 'bot' && S.legalActions(st, { limit: 5 }).every(x => x.t === 'pass')));
      ui.hist.push({ p: a.t === 'arm' || a.t === 'timeout' ? a.p : pr.p, auto: auto || a.t === 'timeout' }); S.apply(st, a);
    });
  }
  function begin() {
    $('setup').style.display = 'none'; document.querySelector('.wrap').style.display = 'none'; $('game').classList.add('on');
    ui.viewer = null; ui.overClosed = false; resetSel(); ui.tbKey = null;
    ui.sndN = G.log.length; ui.logPrevN = G.log.length; ui.seenN = {}; ui.flashN = G.log.length; ui.toastN = G.log.length; ui.peek = false; ui.clk = null; ui.mlast = Date.now();
    ui.botRng = Bot.makeRng((G.seed ^ 0x9e3779b9) >>> 0);
    $('replayBar').classList.toggle('on', !!ui.replay);
    $('sbBadge').style.display = ui.sandbox ? '' : 'none';
    $('btnCopyPos').style.display = ui.sandbox ? '' : 'none';
    hostGame(true);
    step();
  }
  // O2: situs induk (iframe Battle Sim) memperbesar bingkai ke layar penuh selama permainan.
  function hostGame(on) { try { const h = window.MHRSimOnline && window.MHRSimOnline.host(); if (h && h.gameMode) h.gameMode(on); } catch (e) { /* abaikan */ } }
  /* ---------------- Sandbox (Tahap 1c) ---------------- */
  function startSandbox(pos) {
    const errs = S.validatePosition(pos);
    if (errs.length) return errs;
    clearTimeout(ui.botTimer);
    ui.ctrl = ['human', 'human']; ui.manualCounter = false; ui.sandbox = true;
    G = S.createGame({ position: pos, names: pos.names, vanilla: false, confirm: true });   // satu mode: efek selalu aktif
    ui.hist = []; ui.replay = null; ui.msg = '';
    begin();
    return [];
  }
  function editPosition() {
    if (!G || ui.replay) return;
    const pos = S.positionFrom(G);
    if (!pos) { ui.msg = 'A position can be taken only at an Action Phase prompt with no effect waiting to resolve.'; render(); return; }
    if (!ui.sandbox && humans().length === 2 && !confirm('The position editor shows every card, including both HANDs and face-down cards. Continue?')) return;
    clearTimeout(ui.botTimer);
    $('game').classList.remove('on'); closePop(); closeOv();
    window.MHRSandbox.open(pos, true);
  }
  // Kembali ke permainan yang sama dari editor (tombol "Back to the game").
  function resumeGame() {
    if (!G) return false;
    $('setup').style.display = 'none'; document.querySelector('.wrap').style.display = 'none'; $('game').classList.add('on');
    step();
    return true;
  }
  function copyPosition() {
    if (!G) return;
    const pos = S.positionFrom(G);
    if (!pos) { ui.msg = 'A position code can be taken only at an Action Phase prompt with no effect waiting to resolve.'; render(); return; }
    const code = S.exportPosition(pos);
    const done = () => { ui.msg = 'Position code copied (MHRPOS1.). Load it in the Sandbox editor to play this position again.' + (pos.lostThisTurn ? ' Note: effects that apply only "this turn" are not stored in a position code.' : ''); render(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => showCode(code, 'Position code'));
    else showCode(code, 'Position code');
  }
  function toMenu() {
    clearTimeout(ui.botTimer);
    net.on = false; hostGame(false);
    G = null; ui.replay = null; ui.sandbox = false; ui.sideOn = false; $('game').classList.remove('sideOn');
    $('game').classList.remove('on'); document.querySelector('.wrap').style.display = ''; $('setup').style.display = 'block'; closePop();
    if ($('sandbox')) $('sandbox').style.display = 'none';
    closeOv();
    if (window.MHRSimModes) window.MHRSimModes.show(window.MHRSimModes.view());   // riwayat #50: kembali ke layar menu terakhir
  }

  /* ---------------- menjalankan aksi ---------------- */
  function resetSel() { ui.sel = null; ui.mode = null; ui.callType = 'call'; ui.pick = []; ui.cost = []; ui.arr = null; ui.arrPick = null; ui.atk = null; ui.tg = null; ui.mullSel = []; ui.discSel = []; ui.dropDest = null; ui.pickTouched = false; }
  function act(a, auto) {
    if (net.on) return netAct(a);
    if (!G || !G.prompt || ui.replay) return false;
    const p = a.t === 'arm' ? a.p : G.prompt.p, vk = annKey(viewer());
    const r = S.apply(G, a);
    if (!r.ok) { ui.msg = r.err; if (window.MHRSound) MHRSound.play('error'); render(); return false; }
    ui.hist.push({ p, auto: !!auto });
    if (!auto) ui.seenN[vk] = G.log.length;          // Timeline: kejadian setelah langkah ini ditandai "baru"
    ui.msg = ''; resetSel(); ui.pickClosed = false;
    step();
    return true;
  }
  // Jalankan pass otomatis (window Counter mode vanilla) & bot, lalu gambar ulang.
  function step() {
    clearTimeout(ui.botTimer);
    if (net.on) { render(); return; }
    let guard = 0;
    while (G && G.prompt && !ui.replay && guard++ < 50) {
      const pr = G.prompt;
      if (pr.type === 'counter' && G.vanilla && !ui.manualCounter && ui.ctrl[pr.p] === 'human') {
        const p = pr.p; S.apply(G, { t: 'pass' }); ui.hist.push({ p, auto: true }); continue;
      }
      // Lawan bot: kalau pemain manusia tidak punya aksi selain pass, pass otomatis (tidak ada
      // informasi yang bocor ke bot). Melawan manusia, window tetap selalu dibuka.
      if (pr.type === 'counter' && !G.vanilla && ui.ctrl[pr.p] === 'human' && ui.ctrl[1 - pr.p] === 'bot' && ui.autoPassBot !== false &&
          S.legalActions(G, { limit: 5 }).every(x => x.t === 'pass')) {
        const p = pr.p; S.apply(G, { t: 'pass' }); ui.hist.push({ p, auto: true }); continue;
      }
      // Jam giliran habis: sisa keputusan pemain giliran pada giliran ini dijalankan dengan aksi bawaan.
      if (ui.clk && ui.clk.hurry === G.turn && pr.p === G.tp && ui.ctrl[pr.p] === 'human' && clockKind(pr) === 'turn') {
        const p = pr.p, a = defaultAction();
        if (a && S.apply(G, a).ok) { ui.hist.push({ p, auto: true }); continue; }
      }
      break;
    }
    render();
    persist();
    if (G && G.prompt && !ui.replay && ui.ctrl[G.prompt.p] === 'bot') {
      ui.botTimer = setTimeout(() => {
        if (!G || !G.prompt || ui.ctrl[G.prompt.p] !== 'bot') return;
        const p = G.prompt.p;
        const a = Bot.choose(G, ui.botLevel === 'easy' ? 'random' : ui.botLevel === 'hard' ? 'hard' : 'greedy', ui.botRng);
        const r = S.apply(G, a);
        if (!r.ok) { ui.msg = 'The test bot made an illegal action (report it to Claude with the log code): ' + r.err; render(); return; }
        ui.hist.push({ p, auto: true });
        step();
      }, window.MHRSIM_BOT_DELAY != null ? window.MHRSIM_BOT_DELAY : (G.prompt.type === 'counter' ? 120 : 450));
    }
  }
  function undo() {
    if (net.on) { netUndo(); return; }
    if (!G || ui.replay) return;
    if (G.tu) { ui.msg = 'Match time is up: moves can no longer be undone.'; render(); return; }
    let i = ui.hist.length - 1;
    while (i >= 0 && (ui.hist[i].auto || ui.ctrl[ui.hist[i].p] !== 'human')) i--;
    if (i < 0) { ui.msg = 'There is no move of yours to undo.'; render(); return; }
    const o = S.parseLog(S.exportLog(G));
    G = S.replay(o, i);
    ui.hist.length = i; ui.clk = null; ui.sndN = G.log.length; ui.seenN = {}; ui.flashN = G.log.length; ui.toastN = G.log.length;
    ui.msg = ui.sandbox || ui.gmode === 'practice' ? 'Move undone.' : 'Move undone (test mode). Undo can reveal hidden information; use it for testing only.';
    resetSel(); step();
  }
  function copyLog() {
    if (!G) return;
    if (net.on && !net.replay) { ui.msg = 'The full log code of an online game is available when the game is over.'; render(); return; }
    const code = net.on ? net.replay : S.exportLog(G);
    const done = () => { ui.msg = 'Log code copied. Paste it in the Claude chat to report a bug, or in "Load log code" on the menu to resume.'; render(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => showCode(code));
    else showCode(code);
  }
  function showCode(code, title) {
    openOv('<h3>' + esc(title || 'Log code') + '</h3><p class="small muted">Copy all of the text below.</p><textarea id="codeBox" style="min-height:140px">' + esc(code) + '</textarea><div class="row"><button data-act="closeov">Close</button></div>');
    const t = $('codeBox'); t.focus(); t.select();
  }

  /* ---------------- mode online (O2, riwayat #63) ----------------
     sim-online.js memegang koneksi; berkas ini hanya menggambar status bayangan dari tampilan server dan mengirim aksi.
     Server yang memeriksa dan menjalankan aksi; check() di sini hanya untuk pesan cepat sebelum terkirim. */
  const net = { on: false, seat: null, send: null, last: null, recvAt: 0, pending: false, replay: null, matchId: null, ask: null, waitUndo: false, clock: 'standard' };
  function netEnter(o) {
    clearTimeout(ui.botTimer);
    Object.assign(net, { on: true, seat: o.seat, send: o.send, last: null, recvAt: 0, pending: false, replay: null, matchId: null, ask: null, waitUndo: false, clock: o.clock || 'standard' });
    ui.ctrl = o.seat === 0 ? ['human', 'remote'] : ['remote', 'human'];
    ui.sandbox = false; ui.replay = null; ui.gmode = 'online'; ui.timer = net.clock; ui.mleft = null; ui.hist = []; ui.recorded = true; ui.lastLaunch = null;
    ui.youIdx = o.seat; ui.deckNames = (o.deckNames || []).slice(); ui.msg = ''; ui.overClosed = false;
    G = null;
  }
  const promptKey = () => G && G.prompt ? G.actions.length + ':' + G.prompt.type + ':' + G.prompt.p : '';
  function netState(msg) {
    if (!net.on) return;
    const first = !G, key = promptKey();
    net.last = msg; net.recvAt = Date.now(); net.pending = false;
    if (msg.replay) net.replay = msg.replay;
    if (!msg.undoPending) { net.ask = null; net.waitUndo = false; }
    G = Shadow.shadow(msg.view);
    if (G.prompt && G.prompt.type === 'rps') G.prompt.p = msg.rps && msg.rps.mine == null ? net.seat : 1 - net.seat;   // jankenpon serentak
    if (msg.ended && !G.result) G.result = msg.ended;                     // klaim kursi kosong: hasil di luar mesin
    if (first) {
      $('setup').style.display = 'none'; document.querySelector('.wrap').style.display = 'none'; $('game').classList.add('on');
      ui.viewer = null; resetSel();
      ui.sndN = G.log.length; ui.logPrevN = G.log.length; ui.seenN = {}; ui.flashN = G.log.length; ui.toastN = G.log.length; ui.peek = false; ui.clk = null;
      $('replayBar').classList.remove('on'); $('sbBadge').style.display = 'none'; $('btnCopyPos').style.display = 'none';
      hostGame(true);
    }
    if (promptKey() !== key) { resetSel(); ui.pickClosed = false; ui.msg = ''; }
    render();
  }
  function netError(m) { net.pending = false; ui.msg = String(m || 'Not allowed.'); if (window.MHRSound) MHRSound.play('error'); if (G) render(); }
  function netAct(a) {
    if (!G || !G.prompt || G.result || net.pending) return false;
    if (a.t !== 'arm' && a.t !== 'rps') {
      let r = null; try { r = S.check(G, a); } catch (e) { r = null; }
      if (r) { netError(r); return false; }
    }
    net.send({ type: 'act', action: a });
    if (a.t !== 'arm') net.pending = true;
    ui.seenN[annKey(viewer())] = G.log.length;
    ui.msg = ''; resetSel(); ui.pickClosed = false;
    render();
    return true;
  }
  function netUndo() {
    const me = net.last && net.last.seats ? net.last.seats[net.seat] : null;
    if (!G || G.result) return;
    if (G.tu) { ui.msg = 'Match time is up: moves can no longer be undone.'; render(); return; }
    if (me && me.undoLeft <= 0) { ui.msg = 'You have used all 3 undos in this game.'; render(); return; }
    net.send({ type: 'undo_request' }); net.waitUndo = true; ui.msg = ''; render();
  }
  function netUndoAsk() {
    if (!G) return;
    net.ask = '<h3>Undo request</h3><p>' + esc(G.names[1 - net.seat]) + ' asks to undo their last move. Allow it?</p>' +
      '<p class="small muted">Each player can undo at most 3 times per game. No answer within 20 seconds counts as "no". The clock is paused while you decide.</p>' +
      '<div class="row"><button class="pri" data-act="undoYes">Allow</button><button data-act="undoNo">Decline</button></div>';
    render();
  }
  function netUndoResult(m) {
    net.ask = null; net.waitUndo = false;
    const mine = m.from === net.seat;
    const t = mine ? (m.accepted ? 'Undo accepted: your last move was taken back.' : 'Your opponent declined the undo.') : (m.accepted ? 'You allowed the undo.' : '');
    net.note = t ? { text: t, at: Date.now() } : null;
    closeOv(); if (G) render();
  }
  function netSaved(id) { net.matchId = id; if (G && G.result) render(); }
  function netChips(p) {
    const s = net.last.seats && net.last.seats[p]; if (!s) return '';
    let h = '<span class="chipc" title="Undos left (opponent must agree)">↶ <b>' + s.undoLeft + '/3</b></span>';
    if (G.toLimit) h += '<span class="chipc' + (s.timeouts ? ' dk' : '') + '" title="Timeouts (the 3rd loses the game)">⏱ <b>' + s.timeouts + '/' + G.toLimit + '</b></span>';
    if (!s.connected) h += '<span class="chipc off" title="Disconnected">⚠ <b>offline</b></span>';
    return h;
  }
  function netBarHTML() {
    const m = net.last; if (!m || G.result) return '';
    const o = 1 - net.seat, so = m.seats && m.seats[o], out = [];
    if (net.note && Date.now() - net.note.at < 6000) out.push(esc(net.note.text));
    if (net.waitUndo || (m.undoPending && m.undoPending.from === net.seat)) out.push('Undo request sent · waiting for ' + esc(G.names[o]) + ' to answer…');
    if (so && !so.connected) {
      const left = Math.max(0, 120 - (so.away || 0));
      out.push('⚠ ' + esc(G.names[o]) + ' is disconnected (' + (so.away || 0) + 's).' + (left > 0 ? ' Their clock keeps running; you can claim the win after 2:00.' : '') +
        (left <= 0 ? ' <button class="pri sm" data-act="claimWin">Claim the win</button>' : ''));
    }
    return out.length ? '<div class="netbar">' + out.join('<br>') + '</div>' : '';
  }
  function netClockView(el, bar) {
    const m = net.last, c = m && m.clock;
    if (!c || !G || G.result) { el.textContent = ''; el.className = 'paused'; bar.style.width = '0'; ring(null, null, false); return; }
    const stop = !!m.undoPending, el2 = stop ? 0 : Math.floor((Date.now() - net.recvAt) / 1000);
    if (c.mode === 'match30') {
      const left = Math.max(0, (c.left || 0) - el2);
      el.textContent = G.tu ? '⏱ Time up' + (G.prompt && G.prompt.type === 'rps' ? ' · rock-paper-scissors' : '') : (stop ? '⏸ ' : '⏱ ') + 'Match ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      el.className = (left <= 300 ? ' warn' : '') + (stop ? ' paused' : '');
      bar.className = stop ? 'paused' : ''; bar.style.width = Math.max(0, Math.min(100, left / 1800 * 100)) + '%';
      ring(G.prompt ? G.prompt.p : null, null, false); return;
    }
    const pre = CLOCK[c.mode];
    if (!pre || c.left == null || !G.prompt) { el.textContent = 'No clock'; el.className = 'paused'; bar.style.width = '0'; ring(G.prompt ? c.p : null, null, false); return; }
    const left = Math.max(0, c.left - el2), kind = c.kind;
    const total = kind === 'turn' ? pre[0] : (G.prompt.type === 'mulligan' ? pre[1] * 2 : pre[1]);
    el.textContent = (stop ? '⏸ ' : '⏱ ') + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + (narrow() ? '' : ' · ' + G.names[c.p] + (kind === 'turn' ? '\'s turn' : ' responding')) + (stop ? ' · paused' : '');
    el.className = (kind === 'resp' ? 'resp' : '') + (left <= 10 ? ' warn' : '') + (stop ? ' paused' : '');
    bar.className = (kind === 'resp' ? 'resp' : '') + (stop ? ' paused' : '');
    bar.style.width = Math.max(0, Math.min(100, left / total * 100)) + '%';
    ring(c.p, left / total, kind === 'resp');
  }

  /* ---------------- replay ---------------- */
  function replayTo(n) {
    if (!ui.replay) return;
    n = Math.max(0, Math.min(ui.replay.max, n));
    ui.replay.n = n;
    G = S.replay(ui.replay.o, n);
    $('rpRange').max = ui.replay.max; $('rpRange').value = n;
    $('rpInfo').textContent = 'Step ' + n + '/' + ui.replay.max;
    render();
  }
  function playFromReplay() {
    if (!ui.replay) return;
    ui.replay = null; $('replayBar').classList.remove('on');
    rebuildHist(); ui.viewer = null; step();
  }

  /* ---------------- sudut pandang ---------------- */
  function humans() { return [0, 1].filter(p => ui.ctrl[p] === 'human'); }
  function viewer() {
    if (ui.replay || ui.sandbox) return 'all';
    const h = humans();
    if (h.length === 0) return 'all';
    if (h.length === 1) return h[0];
    return ui.viewer;
  }
  function needHandover() {
    if (ui.replay || ui.sandbox || !G || !G.prompt) return false;
    const h = humans();
    if (h.length !== 2) return false;
    return ui.viewer !== G.prompt.p;
  }
  function canSee(iid) {
    const v = viewer(); const x = G.inst[iid];
    return v === 'all' || v === x.owner;
  }
  function myTurnPrompt(type) {
    const v = viewer();
    return G && G.prompt && !ui.replay && (v === G.prompt.p || (v === 'all' && ui.sandbox)) && (!type || G.prompt.type === type) && ui.ctrl[G.prompt.p] === 'human';
  }
  // Pemain yang sedang bertindak di sisi bawah papan (Sandbox: siapa pun yang sedang diberi prompt).
  function actor() {
    if (ui.sandbox) return G && G.prompt ? G.prompt.p : (G ? G.tp : 0);
    return viewer();
  }

  /* ---------------- tampilan kartu ---------------- */
  /* Gambar cetakan INGGRIS dulu (images/en/), lalu images/ (kartu yang belum punya cetakan
     Inggris, mis. SD05/SD06/PB02 fan:2), lalu ekstensi lain. Sama dengan artDir() situs. */
  function imgSources(no) {
    const c = S.card(no), out = [];
    const dirs = c && c.fan === 2 ? ['images/'] : ['images/en/', 'images/'];
    ['jpg', 'png', 'webp'].forEach(ext => dirs.forEach(d => out.push(BASE + d + no + '.' + ext)));
    return out;
  }
  function imgTag(no) {
    return '<img alt="" draggable="false" src="' + imgSources(no)[0] + '" data-no="' + no + '" data-i="0" onerror="window.__simImgErr(this)">';
  }
  window.__simImgErr = function (img) {
    const src = imgSources(img.dataset.no), i = (+img.dataset.i) + 1;
    if (i < src.length) { img.dataset.i = i; img.src = src[i]; } else { img.remove(); }
  };
  const COLOR_EN = { Merah: 'Red', Kuning: 'Yellow', Biru: 'Blue', Hijau: 'Green', Orange: 'Orange', Purple: 'Purple' };
  function cardHTML(iid, opts) {
    opts = opts || {};
    const x = G.inst[iid], c = S.card(x.no);
    const cls = ['card'];
    if (opts.cls) cls.push(opts.cls);
    if (ui.sel === iid || ui.atk === iid) cls.push('sel');
    if (ui.cost.includes(iid)) cls.push('cost');
    if (x.fd && !canSee(iid)) {
      return '<div class="' + cls.concat('fd').join(' ') + '" data-iid="' + iid + '"><div class="fdl">Face-down</div></div>';
    }
    let tag = '';
    if (x.fd) tag = '<div class="fdv" aria-label="Face-down"><span>FACE-DOWN</span></div>';   // #65: kartu sendiri yang tertutup digelapkan + label (juga di pelat HP)
    else if (opts.onField && x.enT === G.turn) tag = '<span class="tag new">just placed</span>';
    else if (opts.onField && x.dclT === G.turn) tag = '<span class="tag done">attacked</span>';
    if (!G.vanilla && !S.hasResolver(x.no) && !/no effect text/i.test(S.textEn(c))) cls.push('nores');
    return '<div class="' + cls.concat(x.fd ? ['fd'] : []).join(' ') + '" data-iid="' + iid + '" title="' + esc(S.nameEn(c)) + '">' +
      '<div class="ph">' + esc(S.nameEn(c)) + '</div>' + imgTag(x.no) +
      '<div class="cbar" style="background:' + (COLOR[c.c] || '#888') + '"></div>' + tag +
      (x.att && x.att.length ? '<span class="tag att">+' + x.att.length + ' att</span>' : '') +
      '<div class="st"><b class="' + cmpCls(S.getLv(G, iid), c.l) + '">Lv' + S.getLv(G, iid) + '</b><i class="' + cmpCls(S.getR(G, iid), c.r) + '">R' + S.getR(G, iid) + '</i><span class="' + cmpCls(S.getPower(G, iid), c.p) + '">' + S.getPower(G, iid) + '</span></div></div>';
  }
  function cmpCls(v, base) { return v > base ? 'up' : v < base ? 'down' : ''; }
  function backHTML() { return '<div class="card fd" style="cursor:default"><div class="fdl">MHR</div></div>'; }

  /* ---------------- render (UI v5 · Broadcast) ---------------- */
  const narrow = () => innerWidth <= 820;
  function render() {
    if (!G) return;
    const v = viewer();
    const bottom = ui.sandbox && !ui.replay ? actor() : (v === 'all' || v == null ? 0 : v);
    const top = 1 - bottom;
    ui.bottomP = bottom;
    renderScore(v, bottom, top);
    $('btnUndo').style.display = ui.replay ? 'none' : '';
    $('btnEditPos').style.display = ui.replay || G.result || net.on ? 'none' : '';
    $('btnSiaga').style.display = G.siaga && !ui.replay && !G.result ? '' : 'none';
    playEvents(v);
    if (needHandover()) {
      // Siaga (Trigger Hand): sebelum perangkat diserahkan, pemain yang memegangnya memilih kartu yang disiagakan.
      if (G.siaga && ui.viewer != null && ui.siagaAsked !== ui.viewer && S.handTriggerCards(G, ui.viewer).length) { openSiaga(true); return; }
      parkMid();
      $('board').innerHTML = '<p class="muted" style="text-align:center;padding:40px">The board is hidden during the handover.</p>';
      trayEl().innerHTML = ''; $('handRow').innerHTML = '';
      $('sideBody').innerHTML = ''; closePop();
      showHandover();
      return;
    }
    const both = v === 'all';
    $('game').classList.toggle('both', both);
    // Riwayat #52 (permintaan pemilik): baki keputusan pindah ke tengah papan (di antara FIELD kedua pemain) dan ticker
    // LIVE di atas diganti Timeline gaya Alternatif A (3 kejadian terakhir, di kanan tengah papan).
    const tr = trayEl();
    parkMid();
    $('board').innerHTML = (both ? ohandHTML(top) : '') +
      halfHTML(top, true) + '<div class="midzone" id="midzone"></div>' + halfHTML(bottom, false);
    $('midzone').appendChild(pillEl());
    $('midzone').appendChild(tr);
    $('midzone').insertAdjacentHTML('beforeend', timelineHTML(v));
    tr.className = 'abar' + (ui.msg ? ' err' : '');
    tr.innerHTML = abarHTML();
    if (net.on) { const nb = netBarHTML(); if (nb) tr.insertAdjacentHTML('afterbegin', nb); }
    mobileArena();
    mobileBoard();
    $('handRow').innerHTML = handHTML(bottom);
    renderSide(v);
    fitHand();
    drawArrows();
    placePop();                                      // riwayat #54: info + aksi kartu = popover di semua layar
    flashCheck(v);
    oppToast(v);
    turnBanner(v);
    modals();
    updateClockView();
  }
  /* Riwayat #66 (paket B, masukan pemilik dari HP): spanduk singkat tiap pergantian giliran, supaya jelas kapan giliran kita
     mulai. Tidak menghalangi ketukan (pointer-events:none), hilang sendiri. Tidak tampil di replay / mode dua pemain satu layar. */
  function turnBanner(v) {
    const el = $('turnban'); if (!el) return;
    if (ui.replay || G.result || !G.prompt || G.prompt.type === 'mulligan' || G.prompt.type === 'rps' || v === 'all' || v == null || !(G.turn >= 1)) { el.classList.remove('on'); return; }
    const key = G.turn + ':' + G.tp + ':' + v;
    const busy = ['flash', 'otoast'].some(id => { const x = $(id); return x && x.classList.contains('on'); });   // jangan menumpuk dengan kilasan pertarungan / toast lawan
    if (ui.tbKey === key) { if (busy) el.classList.remove('on'); return; }
    ui.tbKey = key;
    const mine = G.tp === v;
    if (busy) return;
    el.className = 'turnban on ' + (mine ? 'me' : 'opp');
    el.innerHTML = '<b>' + (mine ? 'YOUR TURN' : esc(G.names[G.tp]) + "'s turn") + '</b><span>' + (mine ? (G.turn === 1 ? 'First turn: 1 CALL, no Battle Phase' : 'Play your cards, then END ACTION') : 'You can respond when they attack') + '</span>';
    clearTimeout(ui.tbT); ui.tbT = setTimeout(() => el.classList.remove('on'), 1500);
  }
  /* Riwayat #66: alasan singkat saat mengetuk sesuatu yang tidak bisa dipakai (tanpa menggambar ulang papan). */
  function tip(text) {
    const el = $('tip'); if (!el) return;
    el.textContent = text; el.classList.add('on');
    clearTimeout(ui.tipT); ui.tipT = setTimeout(() => el.classList.remove('on'), 2400);
  }
  // Kalau tangan tidak muat satu baris, kartu ditumpuk sedikit (bukan dibungkus ke baris baru).
  // HP (riwayat #57, studi RushDee): HAND satu baris lurus; kartu dilebarkan semaksimal mungkin tanpa tumpuk (min 44 px),
  // baru ditumpuk bila tetap tidak muat. Desktop: tumpuk sedikit bila tidak muat.
  function fitHand() {
    document.querySelectorAll('#handRow .handcards, #board .ohand .handcards').forEach(hc => {
      const cards = hc.querySelectorAll('.card'); if (!cards.length) return;
      if (narrow() && hc.closest('#handRow')) {
        hc.style.removeProperty('--cw');
        const n = cards.length, max = cards[0].offsetWidth, avail = hc.clientWidth - 4;
        const w = Math.max(44, Math.min(max, Math.floor((avail - (n - 1) * 4) / n)));
        if (w < max) hc.style.setProperty('--cw', w + 'px');
        const gap = n > 1 ? Math.min(4, Math.floor((avail - n * w) / (n - 1))) : 0;
        cards.forEach((c, i) => { c.style.marginRight = i === n - 1 ? '0' : gap + 'px'; c.style.transform = ''; c.style.zIndex = ''; });
        return;
      }
      if (cards.length < 2) return;
      const cw = cards[0].offsetWidth, avail = hc.clientWidth - 10;
      const gap = Math.min(6, Math.floor((avail - cards.length * cw) / (cards.length - 1)));
      cards.forEach((c, i) => { c.style.marginRight = i === cards.length - 1 ? '0' : gap + 'px'; });
    });
  }
  /* ---------- HP · M1 Arena Portrait (riwayat #55, pilihan pemilik) ----------
     Satu tombol utama bulat di zona ibu jari (kanan garis tengah) yang labelnya berganti: END ACTION / PASS / ATTACK! /
     CONFIRM / NO ATTACK. Pilihan lain muncul sebagai lembar pendek dari bawah (menutupi HAND sementara); bila tidak ada
     pilihan lain, lembar tidak muncul. Judul momen (ACTION PHASE, CHOOSE ATTACKER, …) tampil kecil di garis tengah. */
  const FAB_LABEL = { endAction: 'END ACTION', arrSave: 'CONFIRM', doAtk: 'ATTACK!', noAtk: 'NO ATTACK', pass: 'PASS' };
  function mobileArena() {
    const tr = trayEl(), mz = $('midzone'); if (!mz) return;
    mz.insertAdjacentHTML('afterbegin', '<div class="mtitle">' + esc(trayTitle()) + '</div>');
    if (!narrow()) return;
    let b = null;
    for (const k of ['doAtk', 'pass', 'endAction', 'arrSave', 'noAtk']) { b = tr.querySelector('.acts [data-act="' + k + '"]:not([disabled])'); if (b) break; }
    if (b) {
      b.classList.add('infab');
      const attrs = Array.from(b.attributes).filter(x => x.name.startsWith('data-')).map(x => x.name + '="' + esc(x.value) + '"').join(' ');
      mz.insertAdjacentHTML('beforeend', '<button class="fab' + (b.dataset.act === 'noAtk' ? ' warn' : '') + '" id="fab" ' + attrs + '>' + FAB_LABEL[b.dataset.act] + '</button>');
    }
    const others = tr.querySelectorAll('.acts > :not(.infab)').length;
    const sheet = others > 0 || !!ui.msg;
    tr.classList.toggle('sheet', sheet);
    // Riwayat #57 (studi RushDee): "Lihat papan" — lembar disembunyikan sebentar; kembali otomatis saat keputusan berganti.
    const key = G.actions.length + ':' + (G.prompt ? G.prompt.type + G.prompt.p : '');
    if (ui.peekKey !== key) { ui.peekKey = key; ui.peek = false; }
    if (sheet) tr.insertAdjacentHTML('afterbegin', '<button class="peek" data-act="peek">' + (ui.peek ? '▲ Show choices' : '👁 Look at the board') + '</button>');
    tr.classList.toggle('peeked', sheet && !!ui.peek);
  }
  /* HP (riwayat #57, studi RushDee): BASE menjadi satu baris kecil di pelat pemain (lawan di atas, Anda di bawah), jadi
     BATTLE memakai seluruh lebar layar; petunjuk satu kalimat ditulis di area FIELD lawan. */
  function mobileBoard() {
    if (!narrow()) return;
    const ob = document.querySelector('#board .side-opp .basecol'), mb = document.querySelector('#board .side-me .basecol');
    if (ob) $('teamR').appendChild(ob);
    if (mb) $('teamL').appendChild(mb);
    const t = ohintText(), oh = document.querySelector('#board .side-opp');
    if (t && oh) oh.insertAdjacentHTML('beforeend', '<div class="ohint">' + t + '</div>');
  }
  function ohintText() {
    if (!G || G.result || !G.prompt || ui.replay) return '';
    const pr = G.prompt, who = esc(G.names[pr.p]);
    if (ui.ctrl[pr.p] === 'bot' || !myTurnPrompt()) return '<b>Waiting for ' + who + '…</b>';
    if (ui.msg) return '';
    const T = (a, b) => '<b>' + a + '</b>' + (b ? '<span>' + b + '</span>' : '');
    if (ui.mode === 'call-cost') {
      const need = S.getLv(G, ui.sel), have = ui.cost.reduce((n, i) => n + S.costLv(G, i), 0);
      return T('Pick the cost: total Lv ' + have + '/' + need, 'Tap your FIELD cards to Retreat (face-down = Lv1)');
    }
    if (ui.mode === 'call-dest' || ui.mode === 'move-dest') return T('Choose a zone', 'Tap a glowing area');
    if (ui.mode === 'drop-base') return T('CALL face-up or set face-down?', 'Choose in the sheet below');
    switch (pr.type) {
      case 'main': return T('Your turn · CALL ' + G.cnt.call + '/' + S.callLimit(G), 'Tap a HAND card to play it · END ACTION when done');
      case 'arrange': return T('Reposition (optional)', 'Tap two areas to swap, then CONFIRM');
      case 'attack': {
        if (!ui.atk) return T('Choose an attacker', 'Tap a glowing Character');
        if (!ui.tg) return T(esc(S.nameOf(G, ui.atk)) + ' attacks', 'Tap a glowing target · an empty area (Weakness) = +1 Rush Point');
        return T('Ready to attack', 'Press ATTACK! or tap another target');
      }
      case 'retarget': return T('Choose a new target', 'The original Attack Target is gone');
      case 'counter': {
        const b = G.bt && G.bt.cur;
        if (b && pr.kind === 'step') {
          const pl = attackPlan(b.a, true)[b.slot];
          const mineAtk = pr.p === G.tp;
          return T(esc(S.nameOf(G, b.a)) + ' (' + S.getPower(G, b.a) + ') attacks ' + (mineAtk ? 'their ' : 'your ') + S.SLOT_NAME[b.slot], esc(passOutcome(pl, mineAtk)));
        }
        return T('Counter Phase', 'Last chance for COUNTER cards this turn');
      }
      case 'mulligan': return '';
      case 'rps': return T('Time up · jankenpon', 'Choose Rock, Paper or Scissors');
      case 'discard': return T('Discard ' + pr.n + ' card(s)', 'HAND limit 9');
      case 'order': return T('Order the effects', 'Choose which resolves first');
      default: return T(esc(pr.label || 'Effect'), esc(pr.text || ''));
    }
  }
  /* Langkah lawan sebagai toast kecil bergambar kartu (riwayat #57, studi RushDee): tanpa tombol, hilang sendiri. */
  const TOAST_K = { call: 'CALL', move: 'MOVE', deploy: 'SET IN BASE', place: 'PLACE', swap: 'SWAP', attach: 'ATTACH', acti: 'EFFECT', trig: 'EFFECT', eff: 'EFFECT' };
  function findCard(nm, p) {
    let best = null;
    for (const i in G.inst) {
      if (G.inst[i].owner !== p || S.nameOf(G, i) !== nm) continue;
      const L = S.locate(G, i);
      if (L && (L.zone === 'bat' || L.zone === 'base')) return i;
      if (!best) best = i;
    }
    return best;
  }
  function oppToast(v) {
    if (ui.toastN == null || ui.replay || ui.sandbox || v == null || v === 'all') { ui.toastN = G.log.length; return; }
    const opp = 1 - v, on = G.names[opp];
    const ev = S.logFor(G, v).filter(e => e.n >= ui.toastN && TOAST_K[e.k] && (e.txt.startsWith(on + ':') || e.txt.startsWith(on + ' ')));
    ui.toastN = G.log.length;
    if (!ev.length) return;
    // Satu toast per giliran render: langkah utama (CALL, MOVE, SET) didahulukan dari efek yang mengikutinya.
    const PRI = ['call', 'move', 'deploy', 'place', 'swap', 'attach', 'acti', 'trig', 'eff'];
    const e = ev.slice().sort((x, y) => PRI.indexOf(x.k) - PRI.indexOf(y.k) || y.n - x.n)[0], el = $('otoast'); if (!el) return;
    const fl = $('flash'); if (fl && fl.classList.contains('on')) return;      // kilasan Rush Point / pertarungan didahulukan
    const nm = e.k === 'deploy' ? null : (e.txt.match(NAME_RE) || [])[0];
    const iid = nm ? findCard(nm, opp) : null;
    const dm = e.txt.match(/ to (?:the )?(FRONT|BACK|WING 1|WING 2|BASE)\b/);
    el.innerHTML = '<div class="tc">' + (iid ? cardHTML(iid, {}) : backHTML()) + '</div><div class="tt"><small>' + esc(on) + '</small><b>' +
      TOAST_K[e.k] + (dm ? ' → ' + dm[1] : '') + '</b>' + (nm ? '<span>' + esc(nm) + '</span>' : '') + '</div>';
    el.className = 'otoast';
    void el.offsetWidth; el.classList.add('on');
    clearTimeout(ui.toastT); ui.toastT = setTimeout(() => el.classList.remove('on'), 1800);
  }

  /* ---------- papan skor: tim kiri = pemain di sisi bawah (biru), kanan = lawan (merah) ---------- */
  const PHASE_NAME = { mulligan: 'STARTING HAND', start: 'START', draw: 'DRAW', action: 'ACTION', battle: 'BATTLE', counterPhase: 'COUNTER PHASE', end: 'END', rps: 'TIME UP' };
  function teamHTML(p, side) {
    const P = G.P[p], v = viewer();
    const rt = '<span class="rt">' + Array.from({ length: 9 }, (_, k) => '<i class="' + (k < P.rp ? 'on' : '') + '"></i>').join('') + '</span>';
    const acting = G.prompt && !G.result && G.prompt.p === p;
    // Riwayat #50 (permintaan pemilik): urutan jalan 1ST / 2ND selalu terlihat, juga di HP.
    const ord = '<span class="ord' + (G.first === p ? ' f' : '') + '" title="' + (G.first === p ? 'Goes first' : 'Goes second') + '">' + (G.first === p ? '1ST' : '2ND') + '</span>';
    const tags = (v === p ? '<span class="you">YOU</span>' : '') + (ui.ctrl[p] === 'bot' ? '<span class="you" style="background:#5d6876;color:#fff">BOT</span>' : '') + ord + (acting ? '<span class="act" title="Acting now"></span>' : '');
    let chips = rt + '<span class="chipc">✋ <b>' + P.hand.length + '</b></span><span class="chipc dk">Deck <b>' + P.deck.length + '</b></span>';
    if (G.cnt && G.tp === p && !G.result) chips += '<span class="chipc">CALL <b>' + G.cnt.call + '/' + S.callLimit(G) + '</b></span>';
    if (G.cnt && G.win && !G.vanilla) { const k = G.win.kind === 'step' ? 'cc' : 'ccp'; chips += '<span class="chipc">C-CALL <b>' + G.cnt[k][p] + '/1</b></span>'; }
    if (net.on && net.last) chips += netChips(p);
    // Riwayat #54 (Alternatif A · Tabletop): pelat pemain — lawan di atas papan, Anda di bawah (di samping HAND).
    // Avatar bulat dengan cincin jam (sisa waktu pemain yang sedang bertindak).
    const init = (String(G.names[p] || '?').replace(/^Bot · /, '').trim().charAt(0) || '?').toUpperCase();
    return '<div class="avw" data-p="' + p + '"><div class="av">' + esc(init) + '</div></div>' +
      '<div class="info"><div class="nm">' + esc(G.names[p]).toUpperCase() + tags + '</div>' +
      '<div class="sub"><span class="score" title="Rush Points: the first to 9 wins">' + P.rp + '<small>/9</small></span>' + chips + '</div></div>';
  }
  function renderScore(v, bottom, top) {
    $('teamL').innerHTML = teamHTML(bottom, 'l');
    $('teamR').innerHTML = teamHTML(top, 'r');
    $('teamL').classList.toggle('acting', !!(G.prompt && !G.result && G.prompt.p === bottom));
    $('teamR').classList.toggle('acting', !!(G.prompt && !G.result && G.prompt.p === top));
    $('turnInfo').textContent = G.result ? 'GAME OVER' : G.cnt ? ('TURN ' + G.turn + ' · ' + G.names[G.tp].toUpperCase()) : 'SETUP';
    $('stages').innerHTML = stagesHTML();
  }
  // Elemen baki keputusan tetap sama (dipindah ke dalam papan setiap render, bukan dibuat ulang).
  function annKey(v) { return v === 'all' ? 'all' : String(v); }   // kunci per penonton (Timeline)
  // Kapsul & baki tetap elemen yang sama: diparkir di luar papan sebelum papan digambar ulang, supaya tidak pernah lepas dari dokumen.
  function parkMid() { const pk = $('parking'); if (pk) { pk.appendChild(pillEl()); pk.appendChild(trayEl()); } }
  function trayEl() { if (!ui.trayEl) ui.trayEl = $('tray'); return ui.trayEl; }
  // Kapsul giliran · fase · jam (riwayat #54: dari papan skor atas ke tengah papan, di atas baki).
  function pillEl() { if (!ui.pillEl) ui.pillEl = $('pill'); return ui.pillEl; }
  /* ---------- Timeline (riwayat #52, Alternatif A): 3 kejadian terakhir, yang terjadi sejak langkah terakhir Anda
     ditandai baru. Menggantikan ticker LIVE dan kotak "What happened". Teks kejadian = game log (Inggris, O-16). ---------- */
  const TL_SKIP = ['phase', 'step', 'start', 'first', 'siaga'];
  const TL_LABEL = { call: 'CALL', callcost: 'CALL COST', attack: 'ATTACK', judge: 'FIGHT', rp: '★ RUSH POINT', retreat: 'RETREAT', prune: 'RETREAT',
    trig: 'EFFECT', acti: 'EFFECT', eff: 'EFFECT', mod: 'EFFECT', move: 'MOVE', swap: 'SWAP', place: 'PLACE', deploy: 'BASE DEPLOYMENT', timeout: 'TIME',
    timeup: 'TIME UP', rps: 'JANKENPON', reveal: 'REVEAL', flip: 'FLIP', discard: 'DISCARD', battle: 'BATTLE', attach: 'ATTACH', turn: 'TURN', draw: 'DRAW',
    pass: 'PASS', mulligan: 'STARTING HAND', arrange: 'REPOSITION', noattack: 'NO ATTACK', over: 'GAME OVER', manual: 'MANUAL' };
  function timelineHTML(v) {
    const k = annKey(v);
    if (ui.seenN[k] == null) ui.seenN[k] = G.log.length;
    const seen = ui.seenN[k], all = S.logFor(G, v === null ? -1 : v).filter(e => !TL_SKIP.includes(e.k));
    const lg = all.slice(-3), fresh = ui.replay ? 0 : all.filter(e => e.n >= seen).length, more = Math.max(0, fresh - lg.length);
    const wf = waitForText(v), lim = limitsHTML();
    return '<div class="tl" id="timeline" data-act="tab" data-tab="log"><div class="tlh"><b>TIMELINE</b>' + (fresh ? '<span class="nw">' + fresh + ' new</span>' : '') +
      '<button class="sm" data-act="tab" data-tab="log" title="Play-by-play">All ⤢</button></div>' +
      (more ? '<div class="tlm" data-act="tab" data-tab="log">+' + more + ' earlier since your last move</div>' : '') +
      lg.map((e, i) => '<div class="tli ' + povCls(e.txt) + (!ui.replay && e.n >= seen ? ' new' : '') + (i === lg.length - 1 ? ' last' : '') + ' k-' + e.k + '"><span class="lbl">' + (TL_LABEL[e.k] || String(e.k).toUpperCase()) +
        (!ui.replay && e.n >= seen ? '<i class="nwt">NEW</i>' : '') + '</span><span class="tx" data-noi18n>' + esc(e.txt).replace(NAME_RE, m => '<span class="q">' + m + '</span>') + '</span></div>').join('') +
      (wf || lim ? '<div class="tlf"><span id="waitFor">' + wf + '</span> <span id="limits">' + lim + '</span></div>' : '') + '</div>';
  }
  /* ---------- panel kanan: Card / Play-by-play / Piles ---------- */
  function infoHTML(iid, withActs) {
    const x = G.inst[iid], c = S.card(x.no), L = S.locate(G, iid);
    if (!canSee(iid) && (x.fd || (L && L.zone === 'hand'))) return '<div class="nm">Face-Down Card</div><div class="small muted">' + (L ? (L.zone === 'hand' ? 'HAND' : 'BASE') + ' · ' + esc(G.names[L.p]) : '') + '</div>';
    if (withActs) { const h = popHTML(); if (h) return h; }
    const loc = L ? ({ hand: 'HAND', bat: S.SLOT_NAME[L.slot], base: 'BASE', ret: 'RETREAT', void: 'VOID', deck: 'Deck', att: 'attached' })[L.zone] + ' · ' + esc(G.names[L.p]) : '';
    return '<div class="cardinfo"><div class="big">' + cardHTML(iid).replace(/data-iid=/g, 'data-x=') + '</div><div><div class="nm">' + esc(S.nameEn(c)) + '</div><div class="small muted">' + esc(c.no) + ' · ' + loc + '</div>' +
      '<div class="small" style="margin-top:4px">Lv <b>' + S.getLv(G, iid) + '</b> · R <b>' + S.getR(G, iid) + '</b> · Power <b>' + S.getPower(G, iid) + '</b></div><div class="small muted">' + esc(c.f || '') + '</div></div></div>' +
      breakdownHTML(iid) + '<div class="eff">' + esc(cardText(c)) + (c.fan === 2 ? '\n⚠ This English text is a fan translation of the Chinese text (no official English text yet).' : '') +
      (S.textEn(c) && !/no effect text/i.test(S.textEn(c)) && !S.hasResolver(x.no) ? '\n(No resolver yet: this effect is not applied.)' : '') +
      (x.att && x.att.length ? '\nAttached: ' + x.att.map(a => S.nameOf(G, a)).join(', ') : '') + (x.host ? '\nAttached to: ' + S.nameOf(G, x.host) : '') + '</div>' +
      stateHTML(iid);
  }
  // Tahap 5: keadaan yang berasal dari efek lain (kehilangan efek, efek pinjaman, kemampuan, larangan biaya CALL).
  function stateHTML(iid) {
    if (G.vanilla) return '';
    const x = G.inst[iid], L = S.locate(G, iid), out = [];
    if (!L || x.fd) return '';
    if (S.lostEffects(G, iid)) out.push('Loses its effects (an attached card, e.g. Anti-Venom)');
    if (x.gr && x.gr.borrow && x.gr.borrowT === G.turn) out.push('Has the effects of ' + S.nameEn(S.card(x.gr.borrow)) + ' this turn');
    const ab = [['block', 'BLOCK'], ['double', 'DOUBLE ATTACK'], ['assault', 'ASSAULT'], ['air', 'AIR STRIKE']].filter(([k]) => S.hasAbility(G, iid, k)).map(([, n]) => n);
    if (ab.length && (L.zone === 'bat' || L.zone === 'base')) out.push('Abilities now: ' + ab.join(', '));
    if ((L.zone === 'bat' || L.zone === 'base') && S.costBanned(G, iid, L.p)) out.push('Cannot be retreated to call a Character this turn');
    return out.length ? '<div class="small" style="margin-top:6px;color:var(--gold,#E8B931)">' + out.map(t => '• ' + esc(t)).join('<br>') + '</div>' : '';
  }
  // Riwayat #50: tampilan Bahasa Indonesia memakai teks kartu Indonesia resmi (cards.js `e`); efek tetap dijalankan
  // menurut teks Inggris (acuan simulator, riwayat #13).
  function cardText(c) {
    if (!(window.MHRSimI18N && window.MHRSimI18N.lang === 'id' && c.e)) return S.textEn(c);
    return c.e + '\n\n(Teks Indonesia' + (c.fan === 1 ? ' terjemahan penggemar' : ' resmi') + '. Simulator menjalankan efek menurut teks Inggris kartu ini; bila berbeda, lihat Errata & Text Differences di mhrdecklab.com.)';
  }
  /* Riwayat #54 (permintaan pemilik): panel kanan hanya Play-by-play. Info & aksi kartu tampil sebagai popover saat kartu
     diketuk/diklik; isi RETREAT/VOID dibuka dari tumpukan di papan. */
  function renderSide(v) {
    $('game').classList.toggle('sideOn', ui.sideOn);
    if (!$('log') || !document.querySelector('#sideBody .logbar')) $('sideBody').innerHTML = '<div class="lfil" id="logFil"></div><div class="log" id="log"></div>' +
      '<div class="logbar"><button class="sm" data-act="copyLog">⧉ Copy log code</button><button class="sm" data-rep="open" data-v="bug">🐞 Report a bug / feedback</button></div>';
    renderLog(v);
  }

  function ohandHTML(p) {
    return '<div class="ohand"><span class="zl">HAND · ' + esc(G.names[p]).toUpperCase() + '</span><div class="handcards">' + G.P[p].hand.map(i => cardHTML(i)).join('') + '</div></div>';
  }
  function railHTML(p, isTop) {
    const P = G.P[p], hideHand = isTop && viewer() !== 'all';
    return '<div class="rail"><div class="pile"><span class="stk">' + P.deck.length + '</span>DECK</div>' +
      '<div class="pile click" data-act="pile" data-p="' + p + '" data-z="ret" title="Open RETREAT"><span class="stk">' + P.ret.length + '</span>RETREAT</div>' +
      '<div class="pile click" data-act="pile" data-p="' + p + '" data-z="void" title="Open VOID"><span class="stk v">' + P.void.length + '</span>VOID</div>' +
      (hideHand ? '<div class="pile"><span class="stk v">' + P.hand.length + '</span>HAND</div>' : '') + '</div>';
  }

  function halfHTML(p, isTop) {
    const P = G.P[p];
    const atkMode = myTurnPrompt('attack');
    const rtMode = myTurnPrompt('retarget');
    const tgSlots = isTop ? ((atkMode && ui.atk) ? S.targetsFor(G, ui.atk).map(t => t.slot) : rtMode ? S.targetsFor(G, G.prompt.a).map(t => t.slot) : []) : [];
    const destMode = (ui.mode === 'call-dest' || ui.mode === 'move-dest') && !isTop && p === actor();
    const arrMode = myTurnPrompt('arrange') && !isTop && p === actor();
    const bat = arrMode && ui.arr ? ui.arr : P.bat;
    const side = isTop ? 'top' : 'bottom';
    // Perencana serangan (UI v3 #3): hasil setiap area lawan untuk penyerang terpilih.
    const planA = isTop ? (atkMode && ui.atk ? ui.atk : rtMode ? G.prompt.a : null) : null;
    const plan = planA ? attackPlan(planA) : null;
    const cur = G.bt && G.bt.cur && G.win && G.win.kind === 'step' && p !== G.tp ? G.bt.cur : null;
    const slots = S.SLOTS.map(s => {
      const iid = bat[s];
      let cls = 'slot';
      if (tgSlots.includes(s)) cls += ' tg' + (ui.tg === s ? ' pick' : '');
      if (G.bt && G.bt.cur && p !== G.tp && G.bt.cur.slot === s) cls += ' under';
      if (destMode && destOk(s)) cls += ' hl';
      if (plan && plan[s] && plan[s].cls === 'out') cls += ' outr';
      if (arrMode && ui.arrPick === s) cls += ' hl';
      let inner = '';
      if (iid) {
        const can = atkMode && !isTop && S.attackersNow(G).includes(iid);
        const isAtk = (ui.atk === iid) || (G.bt && G.bt.cur && G.bt.cur.a === iid && G.phase === 'battle');
        inner = cardHTML(iid, { onField: true, cls: isAtk ? 'atk' : can ? 'can' : '' });
      } else if (tgSlots.includes(s)) inner = '<div class="weak">WEAKNESS</div>';
      if (plan && plan[s]) inner += '<div class="oc ' + plan[s].cls + '">' + esc(plan[s].a) + '<small>' + esc(plan[s].b) + '</small></div>';
      else if (cur && cur.slot === s) { const pl = attackPlan(cur.a, true)[s]; inner += '<div class="oc under">UNDER ATTACK' + (pl ? '<small>if both pass: ' + esc(pl.a) + '</small>' : '') + '</div>'; }
      return '<div class="' + cls + '" data-slot="' + s + '" data-side="' + side + '"><span class="sl">' + S.SLOT_NAME[s] + '</span>' + inner + '</div>';
    }).join('');
    const baseHl = destMode && destOk('BASE');
    const base = [];
    for (let k = 0; k < S.BASE_MAX; k++) {
      const iid = P.base[k];
      base.push('<div class="slot' + (baseHl && !iid ? ' hl' : '') + '" data-slot="BASE" data-side="' + side + '">' + (iid ? cardHTML(iid, { onField: true }) : '') + '</div>');
    }
    return '<div class="half field side-' + (isTop ? 'opp' : 'me') + ' side ' + (isTop ? 'opp' : 'me') + '">' + railHTML(p, isTop) +
      '<div class="battle">' + slots + '</div>' +
      '<div class="basecol"><div class="zl">' + esc(G.names[p]).toUpperCase() + '\'S BASE · ' + P.base.length + '/' + S.BASE_MAX + '</div><div class="basebox"' + (isTop ? '' : ' data-own="1"') + '>' + base.join('') + '</div></div></div>';
  }

  function handHTML(p) {
    const v = viewer();
    if (v !== 'all' && v !== p) return '';
    return '<span class="zl">HAND · ' + esc(G.names[p]).toUpperCase() + '</span><div class="handcards">' +
      G.P[p].hand.map(i => cardHTML(i, { cls: handCls(i) })).join('') + '</div>';
  }
  function handCls(i) {
    if (!myTurnPrompt('main') || G.inst[i].owner !== G.prompt.p) return '';
    return (!callReason(i) || !deployReason(i) || (!G.vanilla && S.actiOptions(G, G.prompt.p, false).some(o => o.c === i))) ? 'can' : '';
  }

  /* ---------------- bar aksi (petunjuk + tombol utama) ---------------- */
  /* Baki keputusan (UI v5): judul + petunjuk di kiri, semua pilihan berjajar di kanan. */
  function trayTitle() {
    if (ui.msg) return 'NOT ALLOWED';
    if (ui.replay) return 'REPLAY';
    if (G.result) return 'GAME OVER';
    const pr = G.prompt; if (!pr) return '';
    if (ui.ctrl[pr.p] === 'bot') return 'BOT IS ACTING';
    if (!myTurnPrompt()) return 'WAITING';
    if (ui.mode === 'call-cost') return 'CHOOSE THE COST';
    if (ui.mode === 'call-dest' || ui.mode === 'move-dest') return 'CHOOSE WHERE';
    return ({ mulligan: 'STARTING HAND', main: 'ACTION PHASE', arrange: 'REPOSITION', attack: ui.atk ? 'CHOOSE TARGET' : 'CHOOSE ATTACKER',
      counter: pr.kind === 'step' ? 'YOUR RESPONSE' : 'COUNTER PHASE', opt: 'OPTIONAL EFFECT', yesno: 'EFFECT QUESTION', order: 'ORDER EFFECTS',
      choose: 'CHOOSE CARDS', pick: 'CHOOSE ONE', retarget: 'NEW TARGET', discard: 'DISCARD', rps: 'TIME UP · JANKENPON' })[pr.type] || 'DECIDE';
  }
  function abarHTML() {
    const acts = abarActs();
    return '<div class="hint" id="hint"><span class="ttl">' + esc(trayTitle()) + '</span><span>' + (ui.msg ? esc(ui.msg) : ((narrow() && hintShort()) || hintText())) + '</span></div>' +
      '<div class="acts">' + acts + '</div>';
  }
  function abarActs() {
    if (ui.replay || G.result || !G.prompt) return '';
    const pr = G.prompt;
    if (ui.ctrl[pr.p] === 'bot' || !myTurnPrompt()) return '';
    return abarCore(pr);
  }
  function abarCore(pr) {
    switch (pr.type) {
      case 'main':
        return callModeActs() || (pileActis(false) + '<button class="pri" data-act="endAction">End Action Phase</button>');
      case 'arrange':
        return '<button class="pri" data-act="arrSave">Confirm positions</button><button data-act="arrSkip">Skip</button>' + (ui.arr ? '<button data-act="arrReset">Reset</button>' : '');
      case 'attack': {
        if (!ui.atk) return '';
        if (!ui.tg) {
          const pl = attackPlan(ui.atk), order = S.SLOTS.filter(s => pl[s] && pl[s].cls !== 'out').sort((a, b) => pl[a].rank - pl[b].rank);
          const atks0 = S.attackersNow(G);
          return order.map(s => '<button class="' + ({ rush: 'rush', win: 'go', both: '', lose: 'bad' })[pl[s].cls] + '" data-act="pickTg" data-slot="' + s + '">' + (pl[s].rank === 0 ? '★ ' : '') + S.SLOT_NAME[s] + ' · ' + esc(pl[s].a) + '<small>' + esc(pl[s].b) + '</small></button>').join('') +
            '<button class="warn" data-act="noAtk">No attack</button>' + (atks0.length > 1 ? '<button data-act="unpickAtk">Other attacker</button>' : '');
        }
        const atks = S.attackersNow(G);
        const air = airButtons(ui.atk);
        return (ui.tg ? (air || '<button class="pri" data-act="doAtk">Attack!</button>') + '<button data-act="clearTg">Change target</button>' : '') +
          '<button class="warn" data-act="noAtk">No attack</button>' + (atks.length > 1 ? '<button data-act="unpickAtk">Other attacker</button>' : '');
      }
      case 'counter': return callModeActs() || counterActs(pr);
      case 'opt': case 'yesno':
        return '<button class="pri" data-act="yes">Yes</button><button data-act="no">No</button>';
      case 'order':
        return pr.jobs.map(j => '<button data-act="order" data-job="' + j.id + '"' + (j.older ? ' title="Triggered earlier and still waiting (RS-016)"' : '') + '>' + esc(j.label) + (j.older ? ' (earlier)' : '') + '</button>').join('');
      case 'choose':
        return '<button data-act="openPick">Choose cards…</button>';
      case 'pick':
        return pr.options.map(o => '<button data-act="pickOpt" data-v="' + esc(o.v) + '">' + esc(o.label) + '</button>').join('');
      case 'retarget': return airButtons(pr.a);
      case 'rps':
        return [['rock', '✊ Rock'], ['paper', '✋ Paper'], ['scissors', '✌ Scissors']].map(([v, l]) => '<button class="pri rpsb" data-act="rps" data-v="' + v + '">' + l + '</button>').join('');
    }
    return '';
  }
  // Tahap 4 (PB01-011): ACTI dari RETREAT/VOID tidak terlihat di papan, jadi ditawarkan di baki keputusan.
  function pileActis(inC) {
    if (G.vanilla || !G.prompt) return '';
    return S.actiOptions(G, G.prompt.p, inC).filter(o => { const L = S.locate(G, o.c); return L && (L.zone === 'ret' || L.zone === 'void'); })
      .map(o => '<button class="go" data-act="acti" data-c="' + o.c + '" data-eff="' + o.eff + '">' + esc(S.nameOf(G, o.c)) + ' (' + (S.locate(G, o.c).zone === 'ret' ? 'RETREAT' : 'VOID') + ')<small>ACTI: ' + esc(o.label) + '</small></button>').join('');
  }
  // AIR STRIKE (305.5): area lawan yang terisi boleh diserang sebagai Weakness.
  function airButtons(a) {
    if (!ui.tg || !a || !S.hasAbility(G, a, 'air')) return '';
    const d = G.P[1 - G.prompt.p].bat[ui.tg];
    if (!d) return '';
    const t = G.prompt.type === 'retarget' ? 'retarget' : 'attack';
    return '<button class="pri" data-act="airAtk" data-air="0" data-t="' + t + '">Attack ' + esc(S.nameOf(G, d)) + '</button><button class="pri" data-act="airAtk" data-air="1" data-t="' + t + '">AIR STRIKE: attack as Weakness</button>';
  }
  function callModeActs() {
    if (ui.mode === 'drop-base') return '<button class="pri" data-act="dropCallBase">CALL to BASE</button><button data-act="deploy">Base Deployment (face-down, draw 1)</button><button data-act="cancel">Cancel</button>';
    if (ui.mode === 'call-cost') {
      const lv = S.getLv(G, ui.sel), sum = ui.cost.reduce((s, i) => s + S.costLv(G, i), 0);
      return '<span class="badge">Lv ' + sum + '/' + lv + '</span><button class="pri" data-act="costDone" ' + (sum === lv ? '' : 'disabled') + '>' + (ui.dropDest ? 'CALL to ' + esc(S.SLOT_NAME[ui.dropDest]) : 'Next: destination') + '</button><button data-act="cancel">Cancel</button>';
    }
    if (ui.mode === 'call-dest' || ui.mode === 'move-dest') return '<button data-act="cancel">Cancel</button>';
    return '';
  }

  /* ---------------- kartu terpilih: aksi (desktop: tab Card; HP: popover bawah) ---------------- */
  function closePop() { const p = $('pop'); if (p) p.classList.remove('on'); }
  function popHTML() {
    const iid = ui.sel;
    if (!iid || !G.inst[iid] || ui.mode) return '';
    const x = G.inst[iid], L = S.locate(G, iid);
    if (!canSee(iid) && (x.fd || (L && L.zone === 'hand'))) return '';
    let acts = '';
    const mine = L && G.prompt && L.p === G.prompt.p;
    if (!G.vanilla && mine && (myTurnPrompt('main') || myTurnPrompt('counter'))) {
      const inC = myTurnPrompt('counter');
      const att = (x.att || []);
      S.actiOptions(G, G.prompt.p, inC).filter(o => o.c === iid || att.includes(o.c)).forEach(o => {
        acts += '<button class="pri" data-act="acti" data-c="' + o.c + '" data-eff="' + o.eff + '">Activate' + (o.c !== iid ? ' (attached ' + esc(S.nameOf(G, o.c)) + ')' : '') + ': ' + esc(o.label) + '</button>';
      });
      if (inC && L.zone === 'hand' && S.hasCounterAbility(G, iid)) {
        const cr = ccallReason(iid);
        acts += '<button class="pri" data-act="ccall" ' + (cr ? 'disabled' : '') + '>COUNTER CALL' + (S.getLv(G, iid) >= 4 ? ' (choose Lv' + S.getLv(G, iid) + ' cost)' : '') + '</button>' + (cr ? '<div class="reason">' + esc(cr) + '</div>' : '');
      }
    }
    if (myTurnPrompt('main') && L && L.p === G.prompt.p) {
      if (L.zone === 'hand') {
        const cr = callReason(iid), dr = deployReason(iid);
        acts += '<button class="pri" data-act="call" ' + (cr ? 'disabled' : '') + '>CALL' + (S.getLv(G, iid) >= 4 ? ' (choose Lv' + S.getLv(G, iid) + ' cost)' : '') + '</button>' + (cr ? '<div class="reason">' + esc(cr) + '</div>' : '');
        acts += '<button data-act="deploy" ' + (dr ? 'disabled' : '') + '>Base Deployment (face-down, draw 1)</button>' + (dr ? '<div class="reason">' + esc(dr) + '</div>' : '');
      } else if (L.zone === 'bat' || L.zone === 'base') {
        const mr = moveReason(iid);
        acts += '<button data-act="move" ' + (mr ? 'disabled' : '') + '>' + (L.zone === 'bat' ? 'Move to BASE' : 'Move to BATTLE') + '</button>' + (mr ? '<div class="reason">' + esc(mr) + '</div>' : '');
      }
    }
    return infoHTML(iid, false) + (acts ? '<div class="acts">' + acts + '</div>' : '') +
      '<div style="text-align:right;margin-top:6px"><button class="sm" data-act="cancel">Close</button></div>';
  }

  /* ---------------- Siaga (Trigger Hand, pass-and-play) ----------------
     Pemain diam-diam memilih kartu [TRIG](HAND) di HAND-nya yang boleh terpicu. Hanya kartu yang disiagakan
     yang bisa terpicu, jadi jeda tidak pernah membocorkan isi HAND (rencana, "Trigger Hand: mode Siaga"). */
  function openSiaga(handover) {
    if (!G || !G.siaga) return;
    const p = handover ? ui.viewer : (ui.viewer != null ? ui.viewer : G.prompt && G.prompt.p);
    if (p == null) return;
    const cards = S.handTriggerCards(G, p), armed = G.P[p].armed || [];
    ui.pileOpen = true;
    openOv('<h3>Siaga · ' + esc(G.names[p]) + '</h3>' +
      '<p class="small muted">' + (handover ? 'Before you pass the device: ' : '') + 'tick the [TRIG](HAND) cards you want ready. Only ticked cards can trigger during your opponent\'s actions; you will be asked before one is used. Your opponent never sees this list.</p>' +
      (cards.length ? '<div class="handcards">' + cards.map(i => '<label style="text-align:center;cursor:pointer">' + cardHTML(i).replace('data-iid', 'data-x') + '<div class="small"><input type="checkbox" data-siaga="' + i + '"' + (armed.includes(i) ? ' checked' : '') + '> Siaga</div></label>').join('') + '</div>'
        : '<p class="small">You have no [TRIG](HAND) cards in your HAND.</p>') +
      '<div class="row"><button class="pri" data-act="siagaSave" data-p="' + p + '" data-handover="' + (handover ? 1 : 0) + '">' + (handover ? 'Done, pass the device' : 'Save') + '</button>' + (handover ? '' : '<button data-act="closeov">Cancel</button>') + '</div>', handover);
  }

  function placePop() {
    const pop = $('pop'), h = popHTML();
    if (!h) { closePop(); return; }
    pop.innerHTML = h; pop.classList.add('on');
    if (narrow()) { pop.style.left = ''; pop.style.top = ''; return; }    // HP: lembar bawah (CSS)
    const el = document.querySelector('#board .card.sel,#handRow .card.sel');
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2 };
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.right + 10; if (x + pw > innerWidth - 8) x = r.left - pw - 10; if (x < 8) x = Math.max(8, Math.min(innerWidth - pw - 8, r.left));
    let y = r.top; if (y + ph > innerHeight - 8) y = Math.max(8, innerHeight - ph - 8);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  /* ---------------- alasan (pola UX: alasan tertulis) ---------------- */
  function ccallReason(iid) {
    const p = G.prompt.p, lv = S.getLv(G, iid);
    if (S.counterCallUsed(G, p) >= 1) return 'COUNTER CALL was already used this turn here.';
    if (lv >= 4 && !S.costOptions(G, p, lv).length) return 'A Lv' + lv + ' COUNTER CALL needs cards on your FIELD with a combined Lv of exactly ' + lv + '.';
    return null;
  }
  function uniqueReason(iid, p, lv) {
    if (!S.uniqueBlocked(G, iid, p)) return null;
    if (lv >= 4 && S.costOptions(G, p, lv).some(c => !S.uniqueBlocked(G, iid, p, c))) return null;   // RS-029: salinan lama boleh jadi biaya
    return 'Another card with the same name is already on your FIELD (UNIQUE, 305.6.a).';
  }
  function callReason(iid) {
    const p = G.prompt.p, lv = S.getLv(G, iid);
    if (G.cnt.call >= S.callLimit(G)) return 'Action CALL limit reached for this turn (' + G.cnt.call + '/' + S.callLimit(G) + ').';
    const ur = uniqueReason(iid, p, lv); if (ur) return ur;
    if (lv >= 4) {
      const opts = S.costOptions(G, p, lv);
      if (!opts.length) return 'A Lv' + lv + ' CALL needs cards on your FIELD with a combined Lv of exactly ' + lv + ' (each Face-Down Card counts as Lv1); you do not have such a combination yet.';
      return null;
    }
    const P = G.P[p];
    if (S.SLOTS.every(s => P.bat[s]) && P.base.length >= S.BASE_MAX) return 'There is no empty area on your FIELD.';
    return null;
  }
  function deployReason(iid) {
    return S.check(G, { t: 'deploy', c: iid });
  }
  function moveReason(iid) {
    const L = S.locate(G, iid);
    if (L.zone === 'bat') return S.check(G, { t: 'bbmove', c: iid, to: 'BASE' });
    const empty = S.SLOTS.filter(s => !G.P[L.p].bat[s]);
    const r = S.check(G, { t: 'bbmove', c: iid, to: empty[0] || 'F' });
    if (r && !empty.length && !/303|Face-Down/.test(r)) return 'All BATTLE areas are occupied.';
    return r;
  }
  function destOk(dest) {
    if (ui.mode === 'call-dest') return !S.check(G, { t: ui.callType, c: ui.sel, to: dest, cost: ui.cost });
    if (ui.mode === 'move-dest') return !S.check(G, { t: 'bbmove', c: ui.sel, to: dest });
    return false;
  }

  function attackHint(who, pr) {
    if (!ui.atk) return esc(who) + ' · Battle Phase, ' + ({ F: 'FRONT', W: 'WING', B: 'BACK' })[pr.stage] + ' stage: click a Character highlighted in yellow (or drag it onto a target).';
    if (!ui.tg) return '<b>' + esc(S.nameOf(G, ui.atk)) + '</b> (Power ' + S.getPower(G, ui.atk) + ', R' + S.getR(G, ui.atk) + ') — choose a target. Every reachable area shows what would happen; an empty area is a <b>Weakness</b> (+1 Rush Point). Previews use the board as it is now: your opponent can still respond in the Counter Step.' +
      (S.hasAbility(G, ui.atk, 'air') ? ' AIR STRIKE: an occupied area can also be attacked as a Weakness (305.5).' : '');
    let h = '<b>' + esc(S.nameOf(G, ui.atk)) + '</b> (Power ' + S.getPower(G, ui.atk) + ', R' + S.getR(G, ui.atk) + ') — ';
    if (!ui.tg) return h + "choose a red target: an opponent's Character or a Weakness." + (S.hasAbility(G, ui.atk, 'air') ? ' AIR STRIKE: an occupied area can also be attacked as a Weakness (305.5).' : '');
    const d = G.P[1 - pr.p].bat[ui.tg], pa = S.getPower(G, ui.atk);
    if (!d) return h + '<span class="pv"><b class="w">Weakness → +1 Rush Point</b></span>';
    const pd = S.getPower(G, d);
    return h + '<span class="pv">vs ' + esc(S.nameOf(G, d)) + ' (' + pd + '): ' + (pa > pd ? '<b class="w">Win the Fight</b>' : pa < pd ? '<b class="l">Lose the Fight, your attacker Retreats</b>' : '<b class="d">BOTH LOSE</b>') + '</span> · locked in once declared (303.2.a.4.5)';
  }
  function callModeHint() {
    if (ui.mode === 'call-cost') return esc('Choose cards on your FIELD to Retreat for this ' + (ui.callType === 'ccall' ? 'COUNTER CALL' : 'CALL') + ' until the combined Lv is exactly ' + S.getLv(G, ui.sel) + '. Each Face-Down Card counts as Lv1.');
    return esc('Choose a highlighted destination (a BATTLE area or the BASE).');
  }
  /* Riwayat #66 (paket B): di HP petunjuk hanya muat dua baris, jadi kalimat panjang terpotong. Untuk Action Phase dan
     jendela Counter (dua momen yang paling membingungkan menurut pemilik) dipakai satu-dua kalimat tindakan.
     Mengembalikan '' bila tidak ada versi pendek → hintText() biasa. Tiap kalimat = satu simpul teks (untuk terjemahan ID). */
  function hintShort() {
    if (ui.replay || G.result || !G.prompt) return '';
    const pr = G.prompt;
    if (ui.ctrl[pr.p] === 'bot' || !myTurnPrompt() || (net.on && (pr.p !== net.seat || net.pending))) return '';
    const sp = s => '<span>' + esc(s) + '</span>';
    if (ui.mode === 'call-cost') return sp('Tap your own cards on the FIELD to pay the cost: total Lv ' + ui.cost.reduce((n, i) => n + S.costLv(G, i), 0) + '/' + S.getLv(G, ui.sel) + '.');
    if (ui.mode === 'call-dest' || ui.mode === 'move-dest') return sp('Tap a glowing area to place the card.');
    switch (pr.type) {
      case 'main':
        if (ui.mode) return '';
        return sp('Tap a card in your HAND to play it.') + ' ' + sp('Press END ACTION when you are done.');
      case 'arrange': return sp('Optional: tap two of your areas to swap them, then CONFIRM.');
      case 'attack':
        if (!ui.atk) return sp('Tap one of your glowing Characters to attack with it.');
        if (!ui.tg) return sp('Tap a glowing target, or pick one from the list.');
        return '';
      case 'counter': {
        const b = G.bt && G.bt.cur;
        if (!b || pr.kind !== 'step') return sp('Last chance to play COUNTER cards this turn.') + ' ' + sp('Play one, or PASS.');
        const out = passOutcome(attackPlan(b.a, true)[b.slot], pr.p === G.tp);   // siapa menyerang apa sudah tampil di petunjuk atas & penanda UNDER ATTACK
        return (out ? '<b>' + esc(out) + '</b> ' : '') + sp('Play a COUNTER card, or PASS.');
      }
      case 'order': return sp('Several effects triggered together.') + ' ' + sp('Tap the one to resolve first.');
    }
    return '';
  }
  /* Akibat bila tidak ada yang merespons, dari sudut pandang pemain yang melihat (bukan "WIN/LOSE" milik penyerang). */
  function passOutcome(pl, viewerAttacks) {
    if (!pl) return '';
    const x = ({ rush: viewerAttacks ? 'you score 1 Rush Point' : 'your opponent scores 1 Rush Point',
      win: (viewerAttacks ? 'you win the Fight and their Character Retreats' : 'your Character loses the Fight and Retreats') + (/ASSAULT/.test(pl.b || '') ? ' (ASSAULT: +1 Rush Point)' : ''),
      lose: viewerAttacks ? 'your attacker loses the Fight and Retreats' : 'the attacker loses the Fight and Retreats',
      both: 'both Characters Retreat' })[pl.cls];
    return x ? 'If nobody responds: ' + x + '.' : '';
  }
  function hintText() {
    if (ui.replay) return esc('Replay mode: all cards are visible. Use the slider to step through the game.');
    if (G.result) return esc(G.result.winner < 0 ? 'The game is a draw.' : G.names[G.result.winner] + ' wins — ' + G.result.cause + '.');
    const pr = G.prompt; if (!pr) return '';
    const who = G.names[pr.p];
    if (ui.ctrl[pr.p] === 'bot') return esc('Test bot (' + who + ') is thinking…');
    if (net.on && pr.p !== net.seat) return esc('Waiting for ' + who + ' to ' + (WHAT[pr.type] || 'continue') + '…');
    if (net.on && net.pending) return esc('Sending your move…');
    switch (pr.type) {
      case 'mulligan': return esc(who + ': choose starting HAND cards to put on the bottom of the Deck (or keep them all).');
      case 'main':
        if (ui.mode === 'call-cost' || ui.mode === 'call-dest') return callModeHint();
        if (ui.mode === 'move-dest') return esc('Choose a highlighted empty BATTLE area.');
        if (ui.mode === 'drop-base') return esc('Dropped on the BASE: CALL it face-up into the BASE, or use Base Deployment (face-down, draw 1)?');
        return esc(who + ' · Action Phase: hold a card and drag it onto an area (or click it) to CALL, use Base Deployment, or BATTLE-BASE MOVE; then end the Action Phase.');
      case 'arrange': return esc(who + ' · Battle Phase, Reposition: hold a Character and drag it onto another BATTLE area (FRONT, WING or BACK) to swap or move it — or click two areas. Repeat as needed, then Confirm positions (or Skip).');
      case 'attack': return attackHint(who, pr);
      case 'counter': {
        const b = G.bt && G.bt.cur;
        if (ui.mode === 'call-cost' || ui.mode === 'call-dest') return callModeHint();
        const ifPass = b && pr.kind === 'step' ? (attackPlan(b.a, true)[b.slot] || null) : null;
        return '<b>' + esc(who) + ' · ' + (pr.kind === 'step' ? 'Counter Step' : 'Counter Phase') + '</b>' + (b && pr.kind === 'step' ? ': ' + q(S.nameOf(G, b.a)) + ' (Power ' + S.getPower(G, b.a) + ') attacks ' + (b.tg ? q(S.nameOf(G, b.tg)) + ' at ' : 'the Weakness at ') + esc(G.names[1 - G.tp]) + "'s " + S.SLOT_NAME[b.slot] : pr.kind === 'phase' ? ': last chance this turn for COUNTER cards and COUNTER·ACTI effects' : '') +
          (ifPass ? '. If both pass: <b>' + esc(ifPass.a) + '</b> (' + esc(ifPass.b) + ')' : '') + '.' +
          '<span class="ord">Order: <b>' + esc(who) + '</b> ▸ ' + esc(G.names[1 - pr.p]) + ' ▸ … · two passes in a row close the window' + (G.win && G.win.passes ? ' · ' + esc(G.names[1 - pr.p]) + ' just passed' : '') + (G.vanilla ? ' · vanilla mode: only Pass' : '') + '</span>';
      }
      case 'opt': return '<b>' + esc(pr.label) + '</b> · ' + esc(who) + ': ' + esc(pr.text) +
        (pr.hand && G.siaga ? ' <span class="small">(Siaga card. If you decline, your opponent may guess you had a card ready.)</span>' : '');
      case 'yesno': return '<b>' + esc(pr.label) + '</b> · ' + esc(pr.text);
      case 'order': return pr.rs016
        ? esc(who) + ': new effects triggered while an earlier effect of yours is still waiting. Resolve the new group first, or choose the earlier one now (304.1.f, RS-016).'
        : esc(who) + ': several effects triggered at the same time. Choose which resolves first (304.1.f).';
      case 'choose': return '<b>' + esc(pr.label) + '</b> · ' + esc(pr.text) + ' (' + (pr.min === pr.max ? pr.min : pr.min + '–' + pr.max) + ')';
      case 'pick': return '<b>' + esc(pr.label) + '</b> · ' + esc(pr.text);
      case 'retarget': return esc(who) + ': the original Attack Target is no longer valid. Choose a new red target for ' + esc(S.nameOf(G, pr.a)) + ' (303.2.a.4.3.2.2).' + (S.hasAbility(G, pr.a, 'air') ? ' It has AIR STRIKE: an occupied area can be attacked as a Weakness.' : '');
      case 'discard': return esc(who + ': discard ' + pr.n + ' card(s) (HAND limit 9).');
      case 'rps': return '<b>' + esc(who) + '</b>: ' + esc('match time is up and Rush Points and Deck are tied. Choose Rock, Paper or Scissors' + (pr.round > 1 ? ' (round ' + pr.round + ')' : '') + '. Your choice is shown only after both players have chosen.');
    }
    return '';
  }

  const WHAT = { mulligan: 'decide on the starting HAND', main: 'play the Action Phase', arrange: 'play the Battle Phase', attack: 'play the Battle Phase', retarget: 'choose a new Attack Target',
    counter: 'respond in the Counter window', discard: 'discard cards', opt: 'decide on an effect', yesno: 'answer an effect question', choose: 'choose cards for an effect', pick: 'choose an option for an effect', order: 'order effects', rps: 'choose rock, paper or scissors' };
  /* ---------------- modal ---------------- */
  function openOv(html, solid, cls) { $('ovBody').className = 'modal' + (cls ? ' ' + cls : ''); $('ovBody').innerHTML = html; $('ov').classList.add('on'); $('ov').style.background = solid ? '#0E1216' : ''; }
  function closeOv() { $('ov').classList.remove('on'); }
  function showHandover() {
    const p = G.prompt.p;
    const what = WHAT[G.prompt.type] || 'continue';
    openOv('<div class="handover"><p class="muted small" style="letter-spacing:.14em;font-weight:700">HANDOVER · CLOCKS PAUSED</p><h2>Pass the device to ' + esc(G.names[p]) + '</h2><p>' + esc(G.names[p]) + ' will ' + esc(what) + '.</p>' +
      '<p class="small muted">The other player should not look at the screen after the button is pressed. Your side is always shown at the bottom, in blue.</p><button class="pri" data-act="iam" style="font-size:15px;padding:10px 20px">I am ' + esc(G.names[p]) + ', show my view</button></div>', true);
  }
  function modals() {
    const pr = G.prompt;
    if (net.on && net.ask && !G.result) { openOv(net.ask); return; }
    if (net.on && G.result && !ui.overClosed) {
      const w = G.result.winner, me = net.seat;
      openOv('<h2>' + (w < 0 ? 'Draw' : w === me ? 'You win!' : esc(G.names[w]) + ' wins') + '</h2><p>' + esc(G.result.cause) + '</p>' +
        '<p class="small muted">' + G.turn + ' turns · online game' + (net.matchId ? ' · saved to your account' : '') + '</p>' +
        '<div class="row">' + (net.replay ? '<button data-act="netReplay">Replay</button><button data-act="copy">Copy log code</button>' : '') + '<button data-act="closeOverModal">View board</button><button class="pri" data-act="netMenu">Menu</button><button data-rep="open" data-v="bug">🐞 Report a bug</button></div>');
      return;
    }
    if (G.result && !ui.replay && !ui.overClosed) {
      openOv('<h2>' + (G.result.winner < 0 ? 'Draw' : esc(G.names[G.result.winner]) + ' wins') + '</h2><p>' + esc(G.result.cause) + '</p>' +
        '<p class="small muted">' + G.turn + ' turns · ' + G.actions.length + ' actions · seed ' + G.seed + '</p>' +
        '<div class="row"><button class="pri" data-act="copy">Copy log code</button><button data-act="toReplay">Replay</button><button data-act="closeOverModal">View board</button>' + (ui.lastLaunch && !ui.sandbox ? '<button class="pri" data-act="rematch">Rematch</button>' : '') + '<button data-act="menu">Menu</button><button data-rep="open" data-v="bug">🐞 Report a bug</button></div>');
      return;
    }
    if (pr && myTurnPrompt('mulligan')) {
      const P = G.P[pr.p];
      openOv('<div class="orderbig' + (pr.p === G.first ? ' f' : '') + '"><b>' + (pr.p === G.first ? '1ST' : '2ND') + '</b><span>' + (pr.p === G.first ? 'GOING FIRST' : 'ON THE DRAW') + '</span>' +
        '<small>' + esc(G.names[G.first]) + ' goes 1st · ' + esc(G.names[1 - G.first]) + ' goes 2nd</small></div><div class="hintb"><b>' + esc(G.names[pr.p]) + '</b>: tap the cards you want to put back (tap again to keep), then confirm. They go to the bottom of your Deck, you draw the same number and shuffle (303.1.e). ' +
        (pr.p === G.first ? 'You decide first. First turn: only 1 CALL and no Battle Phase.' : 'Your opponent goes first.') + '</div><div class="handcards">' +
        P.hand.map(i => cardHTML(i, { cls: ui.mullSel.includes(i) ? 'cost' : '' }).replace('data-iid', 'data-mull')).join('') + '</div>' +
        '<div class="row"><button class="pri" data-act="mullDone" style="font-size:15px;padding:10px 22px">' + (ui.mullSel.length ? '↻ Put back ' + ui.mullSel.length + ' · draw ' + ui.mullSel.length : '✓ Keep this hand') + '</button></div>', false, 'mull');
      return;
    }
    if (pr && myTurnPrompt('choose') && !ui.pickClosed) {
      const lab = i => { const L = S.locate(G, i); return L ? ({ hand: 'HAND', bat: S.SLOT_NAME[L.slot], base: 'BASE', att: 'attached', ret: 'RETREAT', void: 'VOID', deck: 'Deck' })[L.zone] + (L.p !== pr.p ? ' · opponent' : '') : ''; };
      if (pr.forced && !ui.pick.length && !ui.pickTouched) ui.pick = pr.from.slice();   // satu-satunya pilihan: sudah terisi, tinggal Confirm
      const okN = ui.pick.length >= pr.min && ui.pick.length <= pr.max;
      openOv('<h3>' + esc(pr.label) + '</h3><p class="small">' + esc(pr.text) + '</p><p class="small muted">' + (pr.forced ? 'This is the only possible choice. It is already selected: press Confirm.' : 'Choose ' + (pr.min === pr.max ? pr.min : pr.min + '–' + pr.max) + ' card(s).') + '</p><div class="handcards">' +
        pr.from.map(i => '<div style="text-align:center">' + cardHTML(i, { cls: ui.pick.includes(i) ? 'cost' : '', reveal: true }).replace('data-iid', 'data-pick') + '<div class="small muted">' + esc(lab(i)) + '</div></div>').join('') + '</div>' +
        '<div class="row"><button class="pri" data-act="pickDone" ' + (okN ? '' : 'disabled') + '>Confirm ' + ui.pick.length + '</button><button data-act="pickHide">View board</button></div>');
      return;
    }
    if (pr && myTurnPrompt('discard')) {
      const P = G.P[pr.p];
      openOv('<h3>HAND limit 9</h3><p class="small muted">Choose ' + pr.n + ' card(s) to discard to RETREAT (303.2.a.6.1.3).</p><div class="handcards">' +
        P.hand.map(i => cardHTML(i, { cls: ui.discSel.includes(i) ? 'cost' : '' }).replace('data-iid', 'data-disc')).join('') + '</div>' +
        '<div class="row"><button class="pri" data-act="discDone" ' + (ui.discSel.length === pr.n ? '' : 'disabled') + '>Discard ' + ui.discSel.length + '/' + pr.n + '</button></div>');
      return;
    }
    if (!ui.pileOpen) closeOv();
  }

  /* ---------------- klik ---------------- */
  function onClick(e) {
    if (!G) return;
    if (ui.justDragged && Date.now() - ui.justDragged < 80) { ui.justDragged = 0; return; }
    const lf = e.target.closest('[data-logf]');
    if (lf) { ui.logF = lf.dataset.logf; renderLog(viewer()); return; }
    const t = e.target.closest('[data-act],[data-iid],[data-slot],[data-mull],[data-disc],[data-pick]');
    if (!t) { if (ui.sel && !ui.mode && !e.target.closest('#pop,#drawer')) { ui.sel = null; render(); } return; }
    if (t.dataset.pick) {
      const i = t.dataset.pick, pr = G.prompt;
      ui.pickTouched = true;
      if (ui.pick.includes(i)) ui.pick = ui.pick.filter(x => x !== i);
      else if (ui.pick.length < pr.max) ui.pick = ui.pick.concat(i);
      else if (pr.max === 1) ui.pick = [i];
      render(); return;
    }
    if (t.dataset.mull) { const i = t.dataset.mull; ui.mullSel = ui.mullSel.includes(i) ? ui.mullSel.filter(x => x !== i) : ui.mullSel.concat(i); render(); return; }
    if (t.dataset.disc) {
      const i = t.dataset.disc, n = G.prompt.n;
      if (ui.discSel.includes(i)) ui.discSel = ui.discSel.filter(x => x !== i); else if (ui.discSel.length < n) ui.discSel = ui.discSel.concat(i);
      render(); return;
    }
    const a = t.dataset.act;
    if (a && t.tagName === 'A') e.preventDefault();
    if (a) return onAct(a, t);
    if (t.dataset.iid && !t.closest('#pop,#drawer')) return onCard(t.dataset.iid, e);
    if (t.dataset.slot) return onSlot(t.dataset.slot, t.dataset.side);
  }
  function onAct(a, t) {
    switch (a) {
      case 'iam': ui.viewer = G.prompt.p; ui.siagaAsked = null; closeOv(); render(); return;
      case 'siagaSave': {
        const p = +t.dataset.p, cards = Array.from(document.querySelectorAll('#ovBody input[data-siaga]:checked')).map(x => x.dataset.siaga);
        const handover = t.dataset.handover === '1';
        ui.pileOpen = false;
        if (handover) ui.siagaAsked = p;
        closeOv();
        const same = JSON.stringify((G.P[p].armed || []).filter(i => G.P[p].hand.includes(i)).sort()) === JSON.stringify(cards.slice().sort());
        if (!same) act({ t: 'arm', p, cards }); else render();
        return;
      }
      case 'closeov': ui.pileOpen = false; closeOv(); render(); return;
      case 'closeOverModal': ui.overClosed = true; closeOv(); render(); return;
      case 'undoYes': case 'undoNo': net.ask = null; closeOv(); net.send({ type: 'undo_answer', accept: a === 'undoYes' }); render(); return;
      case 'claimWin': if (confirm('Claim the win? Your opponent has been disconnected for more than 2 minutes.')) net.send({ type: 'claim_win' }); return;
      case 'netMenu': window.MHRSimOnline.leaveGame(true); return;
      case 'netReplay': { const code = net.replay; window.MHRSimOnline.leaveGame(true, true); if (code) window.MHRSimUI.replayCode(code); return; }
      case 'copy': copyLog(); return;
      case 'copyLog': copyLog(); return;
      case 'menu': toMenu(); return;
      case 'rematch': if (ui.lastLaunch) { closeOv(); launch(ui.lastLaunch); } return;
      case 'toReplay': { const o = S.parseLog(S.exportLog(G)); ui.replay = { o, n: 0, max: o.a.length }; $('replayBar').classList.add('on'); closeOv(); replayTo(o.a.length); return; }
      case 'pile': {
        const p = +t.dataset.p, z = t.dataset.z, list = G.P[p][z];
        ui.pileOpen = true;
        openOv('<h3>' + (z === 'ret' ? 'RETREAT · can come back' : 'VOID · gone for good') + ' · ' + esc(G.names[p]) + ' (' + list.length + ')</h3><p class="small muted">Public area, cards are face-up (302.8, 302.9).</p><div class="handcards">' +
          (list.length ? list.map(i => {
            const opts = (myTurnPrompt('main') || myTurnPrompt('counter')) && !G.vanilla ? S.actiOptions(G, G.prompt.p, myTurnPrompt('counter')).filter(o => o.c === i) : [];
            return opts.length ? '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;max-width:120px">' + cardHTML(i).replace('data-iid', 'data-x') + opts.map(o => '<button class="sm pri" data-act="acti" data-c="' + o.c + '" data-eff="' + o.eff + '" title="' + esc(o.label) + '">Activate</button>').join('') + '</div>' : cardHTML(i).replace('data-iid', 'data-x');
          }).join('') : '<p class="small muted">Empty.</p>') + '</div><div class="row"><button data-act="closeov">Close</button></div>');
        return;
      }
      case 'endAction': act({ t: 'endAction' }); return;
      case 'tab': {
        const tb = t.dataset.tab;
        if (narrow()) ui.sideOn = !ui.sideOn;
        ui.tab = 'log';
        render(); return;
      }
      case 'closeSide': ui.sideOn = false; render(); return;
      case 'pickTg': ui.tg = t.dataset.slot; render(); return;
      case 'ccallCard': {
        ui.sel = t.dataset.c; ui.callType = 'ccall'; ui.cost = [];
        ui.mode = S.getLv(G, ui.sel) >= 4 ? 'call-cost' : 'call-dest'; render(); return;
      }
      case 'dropCallBase': act({ t: 'call', c: ui.sel, to: 'BASE', cost: [] }); return;
      case 'cancel': resetSel(); render(); return;
      case 'call': case 'ccall': {
        const lv = S.getLv(G, ui.sel);
        ui.callType = a; ui.cost = []; ui.mode = lv >= 4 ? 'call-cost' : 'call-dest'; render(); return;
      }
      case 'acti': ui.pileOpen = false; closeOv(); act({ t: 'acti', c: t.dataset.c || ui.sel, eff: t.dataset.eff }); return;
      case 'yes': act({ t: G.prompt.type === 'opt' ? 'opt' : 'yesno', yes: true }); return;
      case 'no': act({ t: G.prompt.type === 'opt' ? 'opt' : 'yesno', yes: false }); return;
      case 'order': act({ t: 'order', job: +t.dataset.job }); return;
      case 'openPick': ui.pickClosed = false; render(); return;
      case 'pickHide': ui.pickClosed = true; closeOv(); render(); return;
      case 'pickDone': { const cs = ui.pick.slice(); ui.pick = []; ui.pickTouched = false; ui.pickClosed = false; act({ t: 'choose', cards: cs }); return; }
      case 'costDone':
        if (ui.dropDest && destOkWith(ui.dropDest)) { act({ t: ui.callType, c: ui.sel, to: ui.dropDest, cost: ui.cost.slice() }); return; }
        ui.dropDest = null; ui.mode = 'call-dest'; render(); return;
      case 'deploy': act({ t: 'deploy', c: ui.sel }); return;
      case 'move': {
        const L = S.locate(G, ui.sel);
        if (L.zone === 'bat') act({ t: 'bbmove', c: ui.sel, to: 'BASE' }); else { ui.mode = 'move-dest'; render(); }
        return;
      }
      case 'arrSave': act({ t: 'arrange', map: ui.arr || null }); return;
      case 'arrSkip': act({ t: 'arrange', map: null }); return;
      case 'arrReset': ui.arr = null; ui.arrPick = null; render(); return;
      case 'pickAtk': ui.atk = t.dataset.iid; ui.tg = null; render(); return;
      case 'unpickAtk': ui.atk = null; ui.tg = null; render(); return;
      case 'clearTg': ui.tg = null; render(); return;
      case 'doAtk': act({ t: 'attack', a: ui.atk, tg: ui.tg }); return;
      case 'airAtk': {
        const air = t.dataset.air === '1';
        if (t.dataset.t === 'retarget') act(air ? { t: 'retarget', tg: ui.tg, air: true } : { t: 'retarget', tg: ui.tg });
        else act(air ? { t: 'attack', a: ui.atk, tg: ui.tg, air: true } : { t: 'attack', a: ui.atk, tg: ui.tg });
        return;
      }
      case 'pickOpt': act({ t: 'pick', v: t.dataset.v }); return;
      case 'rps': act({ t: 'rps', v: t.dataset.v }); return;
      case 'peek': ui.peek = !ui.peek; render(); return;
      case 'noAtk': act({ t: 'noAttack', a: ui.atk }); return;
      case 'pass': act({ t: 'pass' }); return;
      case 'mullDone': act({ t: 'mulligan', cards: ui.mullSel.slice() }); return;
      case 'discDone': act({ t: 'discard', cards: ui.discSel.slice() }); return;
    }
  }
  function onCard(iid, e) {
    const L = S.locate(G, iid);
    // mode korban CALL
    if (ui.mode === 'call-cost') {
      if (L && (L.zone === 'bat' || L.zone === 'base') && L.p === G.prompt.p) {
        ui.cost = ui.cost.includes(iid) ? ui.cost.filter(x => x !== iid) : ui.cost.concat(iid);
        render();
      }
      return;
    }
    // klik kartu di dalam slot saat memilih tujuan/target/atur → teruskan ke slot
    const slotEl = e.target.closest('[data-slot]');
    if (slotEl && (ui.mode === 'call-dest' || ui.mode === 'move-dest' || (myTurnPrompt('attack') && ui.atk && slotEl.dataset.side === 'top') || (myTurnPrompt('retarget') && slotEl.dataset.side === 'top') || myTurnPrompt('arrange'))) {
      return onSlot(slotEl.dataset.slot, slotEl.dataset.side);
    }
    if (myTurnPrompt('attack') && S.attackersNow(G).includes(iid)) { ui.atk = iid; ui.tg = null; ui.sel = null; render(); return; }
    if (myTurnPrompt('attack') && !ui.atk && L && L.zone === 'bat' && L.p === G.prompt.p) tip('This Character cannot attack right now. Tap a glowing one.');
    if (!canSee(iid) && (G.inst[iid].fd || (L && L.zone === 'hand'))) return;
    ui.sel = ui.sel === iid ? null : iid; ui.mode = null; ui.cost = [];
    render();
  }
  function onSlot(slot, side) {
    if (ui.mode === 'call-dest' && side === 'bottom') {
      if (destOk(slot)) act({ t: ui.callType, c: ui.sel, to: slot, cost: ui.cost.slice() });
      else tip('This card cannot go there. Tap a glowing area.');
      return;
    }
    if ((ui.mode === 'call-dest' || ui.mode === 'move-dest') && side === 'top') { tip("That is your opponent's side. Tap a glowing area on your side."); return; }
    if (myTurnPrompt('retarget') && side === 'top') {
      if (!S.targetsFor(G, G.prompt.a).some(x => x.slot === slot)) return;
      if (S.hasAbility(G, G.prompt.a, 'air') && G.P[1 - G.prompt.p].bat[slot]) { ui.tg = slot; render(); return; }
      act({ t: 'retarget', tg: slot });
      return;
    }
    if (ui.mode === 'move-dest' && side === 'bottom') {
      if (destOk(slot)) act({ t: 'bbmove', c: ui.sel, to: slot });
      else tip('This card cannot move there. Tap a glowing area.');
      return;
    }
    if (myTurnPrompt('attack') && ui.atk && side === 'top') {
      if (S.targetsFor(G, ui.atk).some(t => t.slot === slot)) { ui.tg = slot; render(); }
      else tip('This attacker cannot reach that area. Tap a glowing target.');
      return;
    }
    if (myTurnPrompt('attack') && !ui.atk && side === 'top') { tip('First tap one of your glowing Characters to choose the attacker.'); return; }
    if (myTurnPrompt('main') && !ui.mode && !ui.sel && side === 'bottom' && slot !== 'BASE' && !G.P[G.prompt.p].bat[slot]) { tip('Tap a card in your HAND first, then choose where it goes.'); return; }
    if (myTurnPrompt('arrange') && side === 'bottom' && slot !== 'BASE') {
      if (!ui.arr) ui.arr = Object.assign({}, G.P[G.prompt.p].bat);
      if (!ui.arrPick) { ui.arrPick = slot; }
      else { const x = ui.arr[ui.arrPick]; ui.arr[ui.arrPick] = ui.arr[slot]; ui.arr[slot] = x; ui.arrPick = null; }
      render();
    }
  }

  /* =====================================================================
     UI v3 (riwayat #32) — bar sekarang, perencana serangan, panel Counter, rincian stat, log,
     suara, jam giliran/respons, drag & drop (pengumuman Continue dihapus di riwayat #54).
     ===================================================================== */
  const q = s => '<span class="q">' + esc(s) + '</span>';
  const kfmt = n => (n >= 1000 && n % 100 === 0 ? (n / 1000) + 'k' : String(n));

  /* ---------- bar sekarang (#1, #2, #10) ---------- */
  function stagesHTML() {
    if (!G) return '';
    if (G.result) return 'GAME OVER';
    let h = esc(PHASE_NAME[G.phase] || String(G.phase).toUpperCase());
    if (G.phase === 'battle' && G.bt) {
      const cur = !G.cnt.arranged ? 'arr' : G.bt.stage;
      const lab = { arr: 'REPOSITION', F: 'FRONT', W: 'WING', B: 'BACK', done: 'DONE' };
      h += ' <i>›</i> ' + (lab[cur] || '');
      if (G.win && G.win.kind === 'step') h += ' <i>›</i> <span class="cs">COUNTER STEP</span>';
    }
    return h;
  }
  function limitsHTML() {
    if (!G.cnt) return '';
    let h = 'CALL ' + G.cnt.call + '/' + S.callLimit(G) + ' · Deploy ' + G.cnt.deploy + '/1';
    if (G.win && !G.vanilla) {
      const k = G.win.kind === 'step' ? 'cc' : 'ccp';
      h += ' · COUNTER CALL (' + (G.win.kind === 'step' ? 'Step' : 'Phase') + ') ' + esc(G.names[0]) + ' ' + G.cnt[k][0] + '/1 · ' + esc(G.names[1]) + ' ' + G.cnt[k][1] + '/1';
    }
    return h;
  }
  function waitForText(v) {
    if (!G || G.result || !G.prompt || ui.replay) return '';
    const p = G.prompt.p, bot = ui.ctrl[p] === 'bot';
    if (needHandover()) return '● Waiting for ' + esc(G.names[p]);
    const dev = humans().length === 2 && !ui.sandbox && v != null && v !== 'all' ? ' · 📱 ' + esc(G.names[v]) + ' holds the device' : '';
    if (bot) return '● ' + esc(G.names[p]) + ' (bot) is acting' + dev + ' ·';
    return '● ' + esc(G.names[p]) + ' to act' + dev + ' ·';
  }

  /* ---------- perencana serangan (#3) ---------- */
  function attackPlan(a, current) {
    const out = {}, L = S.locate(G, a);
    if (!L || L.zone !== 'bat') return out;
    const R = S.getR(G, a), pa = S.getPower(G, a), O = G.P[1 - L.p], me = G.P[L.p];
    const tgs = S.targetsFor(G, a), assault = S.hasAbility(G, a, 'assault'), air = S.hasAbility(G, a, 'air');
    const cur = current && G.bt && G.bt.cur;
    S.SLOTS.forEach(s => {
      const t = tgs.find(x => x.slot === s), d = O.bat[s];
      const rush = { cls: 'rush', a: 'WEAKNESS · +1 RUSH', b: G.names[L.p] + ' ' + me.rp + ' → ' + (me.rp + 1) + '/9', rank: 0 };
      if (!t && !(cur && cur.slot === s)) { out[s] = { cls: 'out', a: 'out of range', b: 'distance ' + S.distance(L.slot, s) + ' > R' + R, rank: 9 }; return; }
      if (!d || (cur && cur.slot === s && cur.air)) { out[s] = rush; return; }
      const pd = S.getPower(G, d), nm = S.nameOf(G, d);
      if (pa > pd) out[s] = { cls: 'win', a: 'WIN · ' + kfmt(pa) + ' vs ' + kfmt(pd), b: nm + ' retreats' + (assault ? ' · ASSAULT +1 Rush' : ''), rank: assault ? 0.5 : 1 };
      else if (pa < pd) out[s] = { cls: 'lose', a: 'LOSE · ' + kfmt(pa) + ' vs ' + kfmt(pd), b: 'the attacker retreats', rank: 3 };
      else out[s] = { cls: 'both', a: 'BOTH LOSE · ' + kfmt(pa), b: 'both retreat (unless an effect says otherwise)', rank: 2 };
      if (air && !current) out[s].b += ' · or AIR STRIKE: +1 Rush';
    });
    return out;
  }

  /* ---------- panel Counter (#6): opsi sah & tidak sah dengan alasan ---------- */
  function counterActs(pr) {
    const p = pr.p, P = G.P[p];
    let h = '';
    if (!G.vanilla) {
      P.hand.filter(i => S.hasCounterAbility(G, i)).forEach(i => {
        const r = ccallReason(i), lv = S.getLv(G, i);
        h += '<button class="go" data-act="ccallCard" data-c="' + i + '"' + (r ? ' disabled' : '') + '>COUNTER CALL ' + esc(S.nameOf(G, i)) + '<small>' + esc(r || ('Lv' + lv + ' · Power ' + S.getPower(G, i) + (lv >= 4 ? ' · choose the cost next' : ' · no cost'))) + '</small></button>';
      });
      S.actiOptions(G, p, true).forEach(o => {
        h += '<button class="go" data-act="acti" data-c="' + o.c + '" data-eff="' + o.eff + '">' + esc(S.nameOf(G, o.c)) + '<small>COUNTER·ACTI: ' + esc(o.label) + '</small></button>';
      });
    }
    const passNote = G.win && G.win.passes ? G.names[1 - p] + ' already passed: passing closes the window' : G.names[1 - p] + ' may still respond after you';
    return h + '<button class="pri" data-act="pass">Pass<small>' + esc(passNote) + '</small></button>';
  }
  function destOkWith(dest) { return !S.check(G, { t: ui.callType, c: ui.sel, to: dest, cost: ui.cost }); }

  /* ---------- rincian stat (#4, CR 301.41) ---------- */
  function srcVisible(src) {
    if (!src || !G.inst[src]) return false;
    const L = S.locate(G, src);
    return canSee(src) || !(G.inst[src].fd || (L && L.zone === 'hand'));
  }
  function breakdownHTML(iid) {
    let h = '';
    [['p', 'Power'], ['r', 'R'], ['lv', 'Lv']].forEach(([st, lab]) => {
      const b = S.statBreakdown(G, iid, st);
      if (!b.rows.length && b.value === b.base) return;
      h += '<table class="bd"><tr><td>Printed ' + lab + '</td><td>' + b.base + '</td></tr>' + b.rows.map(r => {
        const who = r.kind === 'manual' ? 'Manual effect' : r.srcName && srcVisible(r.src) ? r.srcName : 'Effect';
        const how = r.kind === 'auto' ? 'AUTO, while it applies' : 'this turn';
        const val = r.set != null ? '→ ' + r.set : (r.d > 0 ? '+' : '') + r.d;
        return '<tr class="' + (r.on ? '' : 'off') + '" title="' + (r.on ? '' : 'Overridden by a later “changes to” (301.41)') + '"><td>' + esc(who) + ' <span class="muted">(' + how + ')</span></td><td class="' + (r.set != null ? '' : r.d < 0 ? 'neg' : 'pos') + '">' + val + '</td></tr>';
      }).join('') + '<tr class="tot"><td>' + lab + ' now</td><td>' + b.value + '</td></tr></table>';
    });
    return h;
  }

  /* ---------- log (#8): filter, entri baru, nama kartu ---------- */
  // Warna entri mengikuti sudut pandang: pemain di sisi bawah = biru (me), lawan = merah (op).
  function povCls(txt) {
    const me = G.names[ui.bottomP], op = G.names[1 - ui.bottomP];
    return txt.startsWith(me) ? 'me' : txt.startsWith(op) ? 'op' : '';
  }
  const NAME_RE = /「[^」]+」[A-Z][\w'’.\-]*(?: [A-Z][\w'’.\-]*)*/g;
  function renderLog(v) {
    const lg = S.logFor(G, v === null ? -1 : v), f = ui.logF, fresh = ui.logPrevN;
    ui.logPrevN = G.log.length;
    const fil = [['all', 'All'], ['p0', G.names[0]], ['p1', G.names[1]], ['battle', 'Battle'], ['rush', '★ Rush']];
    if (!$('log')) return;
    $('logFil').innerHTML = fil.map(([k, l]) => '<span data-logf="' + k + '" class="' + (f === k ? 'on' : '') + '">' + esc(l) + '</span>').join('');
    const BAT = ['attack', 'judge', 'rp', 'battle', 'step', 'retreat', 'timeout'];
    const keep = e => f === 'all' || e.k === 'turn' || (f === 'p0' && e.txt.startsWith(G.names[0])) || (f === 'p1' && e.txt.startsWith(G.names[1])) ||
      (f === 'battle' && BAT.includes(e.k)) || (f === 'rush' && (e.k === 'rp' || e.k === 'over'));
    $('log').innerHTML = lg.filter(keep).slice(-250).map(e => {
      const pcls = povCls(e.txt);
      return '<div class="k-' + e.k + ' ' + pcls + (e.n >= fresh && fresh > 0 ? ' fresh' : '') + '">' + esc(e.txt).replace(NAME_RE, m => '<span class="q">' + m + '</span>') + '</div>';
    }).join('');
    $('log').scrollTop = 1e9;
  }

  /* ---------- efek suara (permintaan pemilik 6 Nov 2026) ---------- */
  const SND_PRI = ['over', 'rp', 'win', 'lose', 'both', 'timeout', 'ccall', 'attack', 'call', 'prune', 'retreat', 'eff', 'mod', 'deploy', 'move', 'draw', 'turn', 'pass', 'phase'];
  function sndKind(e) {
    switch (e.k) {
      case 'call': return / COUNTER CALL /.test(e.txt) ? 'ccall' : 'call';
      case 'deploy': case 'set': return 'deploy';
      case 'move': case 'swap': case 'arrange': case 'place': case 'attach': return 'move';
      case 'draw': return 'draw';
      case 'attack': return 'attack';
      case 'judge': return /WINS THE FIGHT/.test(e.txt) ? 'win' : /LOSES THE FIGHT/.test(e.txt) ? 'lose' : 'both';
      case 'retreat': case 'discard': case 'callcost': return 'retreat';
      case 'prune': return 'prune';
      case 'rp': return 'rp';
      case 'trig': case 'acti': case 'eff': case 'reveal': case 'flip': case 'manual': return 'eff';
      case 'mod': return 'mod';
      case 'pass': return 'pass';
      case 'turn': return 'turn';
      case 'phase': case 'step': return 'phase';
      case 'timeout': return 'timeout';
      case 'over': return 'over';
    }
    return null;
  }
  function playEvents(v) {
    if (!G) return;
    const from = ui.sndN; ui.sndN = G.log.length;
    if (ui.replay || from >= G.log.length || !window.MHRSound) return;
    const kinds = S.logFor(G, v == null ? -1 : v).filter(e => e.n >= from).map(sndKind).filter(Boolean);
    kinds.sort((a, b) => SND_PRI.indexOf(a) - SND_PRI.indexOf(b));
    MHRSound.playSeq(kinds);
  }

  /* ---------- kilasan Rush Point / waktu habis (riwayat #54: semua kotak Continue dihapus) ----------
     Tidak menghentikan permainan: spanduk singkat di tengah papan yang hilang sendiri (±2,4 dtk); rincian di Timeline. */
  // Kilasan hasil pertarungan "kartu vs kartu" (riwayat #57, studi RushDee): hilang sendiri.
  function fightFlash(e, el) {
    let a, d, pa, pd, res;
    let m = e.txt.match(/^(.+?) \((\d+)\) (WINS|LOSES) THE FIGHT against (.+?) \((\d+)\)\.$/);
    if (m) { a = m[1]; pa = m[2]; res = m[3] === 'WINS' ? 'win' : 'lose'; d = m[4]; pd = m[5]; }
    else if ((m = e.txt.match(/^(.+?) and (.+?) both have (\d+) Attack Power: BOTH LOSE\.$/))) { a = m[1]; d = m[2]; pa = pd = m[3]; res = 'both'; }
    else return;
    const ap = G.tp, ia = findCard(a, ap), id = findCard(d, 1 - ap);
    const side = x => (x === ui.bottomP ? 'me' : 'op');
    const one = (iid, nm, pw, p, lost) => '<div class="fc ' + side(p) + (lost ? ' lost' : '') + '">' + (iid ? cardHTML(iid, {}) : '') + '<small>' + esc(nm) + '</small><b>' + pw + '</b></div>';
    const head = res === 'both' ? 'BOTH LOSE' : (res === 'win' ? G.names[ap] : G.names[1 - ap]).toUpperCase() + ' WINS THE FIGHT';
    el.className = 'flash fight ' + (res === 'both' ? 'to' : side(res === 'win' ? ap : 1 - ap));
    el.innerHTML = '<div class="vs">' + one(ia, a, pa, ap, res !== 'win') + '<i>×</i>' + one(id, d, pd, 1 - ap, res !== 'lose') + '</div><b>' + esc(head) + '</b>';
    void el.offsetWidth; el.classList.add('on');
    clearTimeout(ui.flashT); ui.flashT = setTimeout(() => el.classList.remove('on'), 2400);
  }
  function flashCheck(v) {
    if (ui.flashN == null || ui.replay) { ui.flashN = G.log.length; return; }
    const ev = S.logFor(G, v == null ? -1 : v).filter(e => e.n >= ui.flashN && (e.k === 'rp' || e.k === 'timeout' || e.k === 'timeup' || e.k === 'judge'));
    ui.flashN = G.log.length;
    if (!ev.length) return;
    const e = ev[ev.length - 1], el = $('flash'); if (!el) return;
    if (e.k === 'judge') { fightFlash(e, el); return; }
    const p = e.k === 'rp' ? (e.txt.startsWith(G.names[ui.bottomP]) ? ui.bottomP : 1 - ui.bottomP) : null;
    el.className = 'flash ' + (p == null ? 'to' : p === ui.bottomP ? 'me' : 'op');
    el.innerHTML = e.k === 'rp' ? '<b>★ RUSH POINT</b><small>' + esc(G.names[p]) + ' ' + G.P[p].rp + '/9</small>'
      : '<b>' + (e.k === 'timeup' ? 'TIME UP' : 'TIME RAN OUT') + '</b><small>' + esc(e.k === 'timeup' ? 'Match time is up' : 'The simulator acted for the player') + '</small>';
    void el.offsetWidth; el.classList.add('on');
    clearTimeout(ui.flashT); ui.flashT = setTimeout(() => el.classList.remove('on'), 2400);
  }


  /* ---------- panah serangan ---------- */
  function drawArrows() {
    const bd = $('board'); if (!bd) return;
    let from = null, slot = null, side = null;
    if (myTurnPrompt('attack') && ui.atk && ui.tg) { from = ui.atk; slot = ui.tg; side = 'top'; }
    else if (G.bt && G.bt.cur && G.inst[G.bt.cur.a] && G.phase === 'battle') { from = G.bt.cur.a; slot = G.bt.cur.slot; side = (1 - G.tp) === ui.bottomP ? 'bottom' : 'top'; }
    if (!from) return;
    const a = bd.querySelector('.card[data-iid="' + from + '"]'), b = bd.querySelector('.slot[data-slot="' + slot + '"][data-side="' + side + '"]');
    if (!a || !b) return;
    const box = bd.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - box.left, y1 = ra.top + ra.height / 2 - box.top + bd.scrollTop;
    const x2 = rb.left + rb.width / 2 - box.left, y2 = rb.top + rb.height / 2 - box.top + bd.scrollTop;
    // UI v5: panah kuning melengkung (kuning = aksi yang sedang berlangsung).
    const ang = Math.atan2(y2 - y1, x2 - x1), trim = Math.min(rb.height / 2 - 4, 34);
    const ex = x2 - Math.cos(ang) * trim, ey = y2 - Math.sin(ang) * trim, sx = x1 + Math.cos(ang) * 22, sy = y1 + Math.sin(ang) * 22;
    const mx = (sx + ex) / 2 + Math.sin(ang) * 28, my = (sy + ey) / 2 - Math.cos(ang) * 28, a2 = Math.atan2(ey - my, ex - mx);
    const p1 = [ex - Math.cos(a2 - .42) * 13, ey - Math.sin(a2 - .42) * 13], p2 = [ex - Math.cos(a2 + .42) * 13, ey - Math.sin(a2 + .42) * 13];
    bd.insertAdjacentHTML('beforeend', '<svg class="arrow"><path d="M' + sx + ',' + sy + ' Q' + mx + ',' + my + ' ' + ex + ',' + ey + '" fill="none" stroke="#F2B01E" stroke-width="3.5" stroke-dasharray="8 7" stroke-linecap="round"/><polygon points="' + ex + ',' + ey + ' ' + p1.join(',') + ' ' + p2.join(',') + '" fill="#F2B01E"/></svg>');
  }

  /* ---------- jam giliran & respons (keputusan pemilik 6 Nov 2026: jam giliran + respons; waktu habis =
     simulator bertindak, tanpa kalah) ---------- */
  // Riwayat #50: durasi standar (riwayat #39) + pilihan fleksibel untuk latihan (lawan bot / dengan teman). off = tanpa jam.
  const CLOCK = { standard: [120, 30], relaxed: [300, 60], long: [600, 120], off: null };
  // O-14 (keputusan pemilik 7 Nov 2026): satu jam pertandingan bersama 30 menit, tanpa batas waktu per giliran/respons.
  // Berjalan terus (juga saat bot berpikir); berhenti hanya saat halaman tersembunyi atau layar serah-terima perangkat.
  // Habis → aksi {t:'timeup'} di mesin: Rush Point terbanyak, lalu sisa Deck terbanyak, lalu jankenpon.
  const MATCH = { match30: 1800 };
  function matchActive() { return !!(G && MATCH[ui.timer] && ui.mleft != null && !ui.sandbox && !ui.replay && !G.result && !G.tu && G.prompt); }
  function matchTick() {
    const now = Date.now(), dt = (now - (ui.mlast || now)) / 1000; ui.mlast = now;
    if (!matchActive()) return;
    if (document.hidden || needHandover() || dt >= 5) return;
    const before = Math.ceil(ui.mleft);
    ui.mleft = Math.max(0, ui.mleft - dt);
    const sec = Math.ceil(ui.mleft);
    if (sec !== before && (sec === 300 || sec === 60 || (sec <= 10 && sec > 0)) && window.MHRSound) MHRSound.play('tick');
    if (ui.mleft <= 0) timeUp();
  }
  function timeUp() {
    if (!G || G.result || G.tu) return;
    clearTimeout(ui.botTimer);
    const r = S.apply(G, { t: 'timeup', min: Math.round(MATCH[ui.timer] / 60) });
    if (!r.ok) return;
    ui.hist.push({ p: G.prompt ? G.prompt.p : 0, auto: true });
    ui.mleft = 0; resetSel(); closePop();
    if (ui.pileOpen) { ui.pileOpen = false; closeOv(); }
    step();
  }
  function clockKind(pr) { return pr.type === 'counter' || pr.type === 'mulligan' || pr.p !== G.tp ? 'resp' : 'turn'; }
  function clockActive() {
    return !!(G && CLOCK[ui.timer] && !ui.sandbox && !ui.replay && !G.result && G.prompt && ui.ctrl[G.prompt.p] === 'human');
  }
  function clockPaused() {
    return needHandover() || document.hidden || (ui.pileOpen && G.siaga && $('ov').classList.contains('on') && /Siaga/.test($('ovBody').textContent));
  }
  function clockSync() {
    if (!clockActive()) return null;
    const pr = G.prompt, pre = CLOCK[ui.timer];
    if (!ui.clk) ui.clk = { turnKey: null, turnLeft: 0, respKey: null, respLeft: 0, last: Date.now(), hurry: null, warnS: null };
    const c = ui.clk, tk = G.turn + ':' + G.tp, rk = G.actions.length + ':' + pr.type + ':' + pr.p;
    if (c.turnKey !== tk) { c.turnKey = tk; c.turnLeft = pre[0]; }
    if (c.respKey !== rk) { c.respKey = rk; c.respLeft = pr.type === 'mulligan' ? pre[1] * 2 : pre[1]; }
    return c;
  }
  function tickClock() {
    if (net.on) { updateClockView(); return; }
    if (MATCH[ui.timer]) { matchTick(); updateClockView(); return; }
    const c = clockSync();
    if (!c) { if (ui.clk) ui.clk.last = Date.now(); updateClockView(); return; }
    const now = Date.now(), dt = (now - c.last) / 1000; c.last = now;
    if (!clockPaused() && dt < 5) {
      const kind = clockKind(G.prompt);
      if (kind === 'turn') c.turnLeft -= dt; else c.respLeft -= dt;
      const left = kind === 'turn' ? c.turnLeft : c.respLeft;
      const sec = Math.ceil(left);
      if (sec <= 10 && sec > 0 && c.warnS !== sec) { c.warnS = sec; if (window.MHRSound) MHRSound.play('tick'); }
      if (left <= 0) { timeoutNow(kind); return; }
    }
    updateClockView();
  }
  function updateClockView() {
    const el = $('clock'), bar = $('clockBar'); if (!el) return;
    if (net.on) { netClockView(el, bar); return; }
    if (G && MATCH[ui.timer] && !ui.sandbox && !ui.replay) {
      const total = MATCH[ui.timer], left = Math.max(0, ui.mleft || 0), sec = Math.ceil(left);
      const paused = !G.result && !G.tu && (document.hidden || needHandover());
      el.textContent = G.result && !G.result.time ? '' : G.tu ? '⏱ Time up' + (G.prompt && G.prompt.type === 'rps' ? ' · rock-paper-scissors' : '') :
        (paused ? '⏸ ' : '⏱ ') + 'Match ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + (paused ? ' · paused' : '');
      el.className = (sec <= 300 ? ' warn' : '') + (paused || G.result ? ' paused' : '');
      bar.className = paused ? 'paused' : '';
      bar.style.width = Math.max(0, Math.min(100, left / total * 100)) + '%';
      ring(G.prompt && !G.result ? G.prompt.p : null, null, false);
      return;
    }
    const c = clockActive() ? clockSync() : null;
    if (!c) {
      ring(G && G.prompt && !G.result ? G.prompt.p : null, null, false);
      el.className = 'paused'; bar.style.width = '0';
      el.textContent = !G || G.result ? '' : ui.sandbox ? 'Sandbox · no clock' : ui.replay ? 'Replay' : G.prompt && ui.ctrl[G.prompt.p] === 'bot' ? 'Bot is acting' : !CLOCK[ui.timer] ? 'No clock' : '';
      return;
    }
    const kind = clockKind(G.prompt), left = Math.max(0, kind === 'turn' ? c.turnLeft : c.respLeft), sec = Math.ceil(left);
    const pre = CLOCK[ui.timer] || CLOCK.standard;
    const total = kind === 'turn' ? pre[0] : (G.prompt.type === 'mulligan' ? pre[1] * 2 : pre[1]);
    const paused = clockPaused();
    el.textContent = (paused ? '⏸ ' : '⏱ ') + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + (narrow() ? '' : ' · ' + G.names[G.prompt.p] + (kind === 'turn' ? '\'s turn' : ' responding')) + (paused ? ' · paused' : '');
    el.className = (kind === 'resp' ? 'resp' : '') + (sec <= 10 ? ' warn' : '') + (paused ? ' paused' : '');
    bar.className = (kind === 'resp' ? 'resp' : '') + (paused ? ' paused' : '');
    bar.style.width = Math.max(0, Math.min(100, left / total * 100)) + '%';
    ring(G.prompt.p, left / total, kind === 'resp');
  }
  // Cincin jam di avatar pemain yang sedang bertindak (Alternatif A). frac null = tanpa jam (cincin penuh).
  function ring(p, frac, resp) {
    document.querySelectorAll('.plate .avw').forEach(w => {
      const on = p != null && +w.dataset.p === p;
      w.style.setProperty('--pct', on && frac != null ? Math.max(0, Math.min(100, frac * 100)).toFixed(1) : 100);
      w.classList.toggle('run', on); w.classList.toggle('resp', on && !!resp);
    });
  }
  function defaultAction() {
    const pr = G.prompt; if (!pr) return null;
    switch (pr.type) {
      case 'main': return { t: 'endAction' };
      case 'arrange': return { t: 'arrange', map: null };
      case 'attack': { const a = S.attackersNow(G)[0]; return a ? { t: 'noAttack', a } : null; }
      case 'counter': return { t: 'pass' };
      case 'opt': return { t: 'opt', yes: false };
      case 'mulligan': return { t: 'mulligan', cards: [] };
    }
    const L = S.legalActions(G, { limit: 20 });
    return L && L.length ? L[0] : null;
  }
  function timeoutNow(kind) {
    if (!G || !G.prompt) return;
    const p = G.prompt.p;
    const r = S.apply(G, { t: 'timeout', p, kind });
    if (!r.ok) return;
    ui.hist.push({ p, auto: true });
    if (kind === 'turn') ui.clk.hurry = G.turn;
    resetSel(); closePop();
    if (ui.pileOpen) { ui.pileOpen = false; closeOv(); }
    const a = defaultAction();
    if (a) act(a, true); else render();
  }

  /* ---------- drag & drop (permintaan pemilik 6 Nov 2026): klik/tap lalu tahan, seret ke BATTLE/BASE ---------- */
  function dragSpec(iid) {
    if (!G || !G.prompt || ui.replay || !G.inst[iid]) return null;
    const pr = G.prompt, L = S.locate(G, iid);
    if (!L || L.p !== pr.p || !myTurnPrompt()) return null;
    const lv = S.getLv(G, iid), slots = [], spec = { iid, slots, base: false, side: 'bottom' };
    const callOk = (t, to) => lv >= 4 ? S.costOptions(G, pr.p, lv).some(cost => !S.check(G, { t, c: iid, to, cost })) : !S.check(G, { t, c: iid, to, cost: [] });
    if (pr.type === 'main' && !ui.mode) {
      if (L.zone === 'hand') {
        spec.kind = 'call';
        S.SLOTS.forEach(s => { if (callOk('call', s)) slots.push(s); });
        spec.base = callOk('call', 'BASE') || !deployReason(iid);
      } else if (L.zone === 'bat') { spec.kind = 'move'; spec.base = !S.check(G, { t: 'bbmove', c: iid, to: 'BASE' }); }
      else if (L.zone === 'base') { spec.kind = 'move'; S.SLOTS.forEach(s => { if (!S.check(G, { t: 'bbmove', c: iid, to: s })) slots.push(s); }); }
    } else if (pr.type === 'counter' && !ui.mode && L.zone === 'hand' && !G.vanilla && S.hasCounterAbility(G, iid) && !ccallReason(iid)) {
      spec.kind = 'ccall';
      S.SLOTS.forEach(s => { if (callOk('ccall', s)) slots.push(s); });
      spec.base = callOk('ccall', 'BASE');
    } else if (pr.type === 'arrange' && L.zone === 'bat') {
      // Reposition: posisi yang tampil = susunan sementara (ui.arr) bila sudah ada pertukaran sebelumnya.
      const cur = ui.arr || G.P[pr.p].bat, from = S.SLOTS.find(s => cur[s] === iid);
      if (from) { spec.kind = 'arr'; spec.from = from; S.SLOTS.forEach(s => { if (s !== from) slots.push(s); }); }
    } else if (pr.type === 'attack' && S.attackersNow(G).includes(iid)) {
      spec.kind = 'atk'; spec.side = 'top'; S.targetsFor(G, iid).forEach(t => slots.push(t.slot));
    }
    return spec.kind && (slots.length || spec.base) ? spec : null;
  }
  const CARD_SEL = '#board .card[data-iid],#handRow .card[data-iid],.plate .card[data-iid]';
  function initDrag() {
    document.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !G) return;
      const c = e.target.closest(CARD_SEL);
      if (!c) return;
      const spec = dragSpec(c.dataset.iid);
      if (!spec) return;
      const d = ui.drag = { spec, el: c, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', started: false, over: null };
      d.timer = setTimeout(() => { if (ui.drag === d && !d.started) startDrag(d, d.x, d.y); }, d.touch ? 260 : 200);
    });
    document.addEventListener('pointermove', e => {
      const d = ui.drag; if (!d) return;
      const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (!d.started) {
        if (d.touch && dist > 10) { clearTimeout(d.timer); ui.drag = null; return; }        // gulir layar, bukan seret
        if (!d.touch && dist > 6) startDrag(d, e.clientX, e.clientY); else return;
      }
      e.preventDefault();
      moveDrag(d, e.clientX, e.clientY);
    });
    const end = e => {
      const d = ui.drag; if (!d) return;
      clearTimeout(d.timer); ui.drag = null;
      if (!d.started) return;
      ui.justDragged = Date.now();
      const g = $('dragGhost'); if (g) g.remove();
      document.querySelectorAll('.drop,.drag-src').forEach(x => x.classList.remove('drop', 'over', 'drag-src'));
      if (e.type === 'pointerup' && d.over) doDrop(d.spec, d.over);
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    document.addEventListener('touchmove', e => { if (ui.drag && ui.drag.started) e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', e => { if (e.target.closest(CARD_SEL)) e.preventDefault(); });
    // Gambar kartu jangan memulai drag bawaan browser (memicu pointercancel).
    document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest(CARD_SEL)) e.preventDefault(); });
  }
  function startDrag(d, x, y) {
    d.started = true; closePop();
    const g = d.el.cloneNode(true); g.id = 'dragGhost'; g.classList.remove('sel', 'can');
    g.style.width = d.el.offsetWidth + 'px'; g.style.height = d.el.offsetHeight + 'px';
    document.body.appendChild(g);
    d.el.classList.add('drag-src');
    const sp = d.spec;
    sp.slots.forEach(s => { const el = document.querySelector('#board .slot[data-slot="' + s + '"][data-side="' + sp.side + '"]'); if (el) el.classList.add('drop'); });
    if (sp.base) { const b = document.querySelector('.basebox[data-own="1"]'); if (b) b.classList.add('drop'); }
    if (navigator.vibrate && d.touch) { try { navigator.vibrate(15); } catch (er) { /* abaikan */ } }
    if (window.MHRSound) MHRSound.play('ui');
    moveDrag(d, x, y);
  }
  function moveDrag(d, x, y) {
    const g = $('dragGhost'); if (g) { g.style.left = x + 'px'; g.style.top = y + 'px'; }
    const el = document.elementFromPoint(x, y);
    let over = null;
    const sl = el && el.closest('.slot.drop[data-slot]:not([data-slot=BASE])');
    if (sl) over = { slot: sl.dataset.slot, el: sl };
    else { const b = el && el.closest('.basebox.drop'); if (b) over = { slot: 'BASE', el: b }; }
    if ((d.over && d.over.el) !== (over && over.el)) {
      if (d.over) d.over.el.classList.remove('over');
      if (over) over.el.classList.add('over');
    }
    d.over = over;
  }
  function doDrop(sp, over) {
    const iid = sp.iid, dest = over.slot, keepArr = ui.arr;
    resetSel();
    if (sp.kind === 'arr') ui.arr = keepArr;          // susunan Reposition yang sudah ada jangan hilang
    switch (sp.kind) {
      case 'call': case 'ccall': {
        if (dest === 'BASE' && sp.kind === 'call') {
          const canCall = S.getLv(G, iid) >= 4 ? S.costOptions(G, G.prompt.p, S.getLv(G, iid)).some(cost => !S.check(G, { t: 'call', c: iid, to: 'BASE', cost })) : !S.check(G, { t: 'call', c: iid, to: 'BASE', cost: [] });
          const canDep = !deployReason(iid);
          if (canCall && canDep) { ui.sel = iid; ui.mode = 'drop-base'; render(); return; }
          if (canDep) { act({ t: 'deploy', c: iid }); return; }
        }
        if (S.getLv(G, iid) >= 4) { ui.sel = iid; ui.callType = sp.kind; ui.cost = []; ui.mode = 'call-cost'; ui.dropDest = dest; render(); return; }
        act({ t: sp.kind, c: iid, to: dest, cost: [] }); return;
      }
      case 'move': act({ t: 'bbmove', c: iid, to: dest }); return;
      case 'arr': {
        if (dest === 'BASE') return;
        const arr = Object.assign({}, ui.arr || G.P[G.prompt.p].bat), from = sp.from;
        const x = arr[from]; arr[from] = arr[dest]; arr[dest] = x;
        ui.arr = arr; ui.arrPick = null;
        if (window.MHRSound) MHRSound.play('move');
        render(); return;
      }
      case 'atk': ui.atk = iid; ui.tg = dest; render(); return;
    }
  }

  // Kait untuk uji otomatis Claude (Playwright). Hanya membaca status.
  window.MHRSimUI = { state: () => G, ui: () => ui, startSandbox, resumeGame, timeoutNow, attackPlan: a => attackPlan(a), render: () => render(),
    // Riwayat #50 (mode, simpan otomatis, riwayat offline)
    launch, deckFrom, resumeSaved, savedGame, clearSaved, history, histDel, histSet, toMenu, CLOCK, MATCH, timeUp, act: a => act(a),
    online: { enter: netEnter, state: netState, error: netError, undoAsk: netUndoAsk, undoResult: netUndoResult, saved: netSaved, active: () => net.on, seat: () => net.seat, last: () => net.last },
    replayCode: code => { const o = S.parseLog(code); if (!o) return false; readSetupSafe(o); ui.replay = { o, n: 0, max: (o.a || []).length }; G = S.replay(o, 0); ui.hist = []; begin(); replayTo(ui.replay.max); return true; } };
  function readSetupSafe(o) { ui.ctrl = ['human', 'human']; ui.sandbox = !!o.q; ui.timer = 'off'; }
  boot();
})();
