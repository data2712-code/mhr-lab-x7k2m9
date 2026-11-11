/* ===================================================================
   MHR BATTLE SIM — MENU MODE (sim-modes.js)                         riwayat #50–#51
   ===================================================================
   Menu awal mobile-first: lanjutkan permainan tersimpan, Latihan lawan Bot, Main dengan teman (satu perangkat,
   jam fleksibel), mode online (O2: room privat lewat sim-online.js bila dibuka di Battle Sim situs; selain itu penjelasan
   saja), Riwayat pertandingan offline + online, alat uji
   (permainan kustom, Sandbox, kode log). Teks di sini berbahasa Inggris; terjemahan Indonesia lewat sim-i18n.js.
   Penyimpanan di perangkat memakai API MHRSimUI (permainan tersimpan & riwayat) dan kunci 'mhrsim.prefs.v1'.
   =================================================================== */
(function () {
  'use strict';
  const S = window.MHRSim, U = () => window.MHRSimUI;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const KEY_PREF = 'mhrsim.prefs.v1';
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(KEY_PREF) || '{}') || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(KEY_PREF, JSON.stringify(prefs)); } catch (e) { /* abaikan */ } };
  const VIEWS = { home: 'home', practice: 'panelPractice', history: 'panelHistory', online: 'panelOnline', find: 'panelOnline', custom: 'panelCustom', tools: 'panelCustom' };
  let histTab = 'offline';
  const MODE_LABEL = { practice: 'Practice vs Bot', friend: 'Friend · same device', custom: 'Custom game', sandbox: 'Sandbox' };
  const LEVEL_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  const CLOCK_LABEL = { off: 'No clock', standard: 'Standard 2:00 / 0:30', relaxed: 'Relaxed 5:00 / 1:00', long: 'Long 10:00 / 2:00', match30: 'Match 30:00' };
  let view = 'home';

  function ago(ts) {
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 48) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  function fmtDate(iso) { try { const d = new Date(iso); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }
  function deckOptions(withCode) {
    const src = $('dk0'); if (!src) return '';
    const tmp = src.cloneNode(true);
    if (!withCode) { const o = tmp.querySelector('option[value="code"]'); if (o) o.remove(); }
    return tmp.innerHTML;
  }
  /* #80 (keputusan pemilik 12 Nov 2026): "Your deck" di Battle Sim situs = deck yang disimpan pemain ke akunnya + tempel
     link/kode (sim-online.js). Deck uji tetap untuk deck bot. Dibuka lokal tanpa situs (app\ untuk uji) = daftar lama. */
  const OL = () => window.MHRSimOnline;
  function yourDeckOptions() {
    if (!onlineReady()) return deckOptions(true);
    return OL().deckOptionsHTML();
  }
  function yourDeckNote() { return onlineReady() && !OL().myDecks().length ? '<div class="small muted" style="margin-top:4px" data-yournote>' + esc(OL().noDecksText) + '</div>' : ''; }
  // Muat deck akun lalu perbarui menu "Your deck" yang sedang tampil (tanpa menggambar ulang layar).
  function refreshYourDecks() {
    if (!onlineReady()) return;
    OL().loadDecks().then(() => ['hubDeck', 'prDeck'].forEach(id => {
      const x = $(id); if (!x) return;
      const pp = prefs.practice || {}, want = pp.deck === 'code' && pp.code ? 'code' : pp.deck;
      x.innerHTML = OL().deckOptionsHTML();
      x.value = want || ''; if (!x.value) x.selectedIndex = 0;   // deck akun pertama, atau "Paste…" bila belum ada
      const note = x.parentNode.querySelector('[data-yournote]'); if (note) note.remove();
      if (!OL().myDecks().length) x.insertAdjacentHTML('afterend', yourDeckNote());
      if (id === 'prDeck' && $('prCodeWrap')) $('prCodeWrap').style.display = x.value === 'code' ? '' : 'none';
      if (window.MHRSimI18N) window.MHRSimI18N.apply();
    }));
  }
  function testDeckValues() {
    const src = $('dk0'); if (!src) return ['sd01'];
    return Array.from(src.querySelectorAll('option')).map(o => o.value).filter(v => v !== 'code');
  }

  /* ---------------- tampilan ---------------- */
  function show(v) {
    view = VIEWS[v] ? v : 'home';
    $('home').style.display = view === 'home' ? '' : 'none';
    ['panelPractice', 'panelHistory', 'panelOnline', 'panelCustom'].forEach(id => $(id).classList.toggle('on', VIEWS[view] === id));
    renderResume();
    if (view === 'home') renderHome();
    if (view === 'practice') renderPractice();
    if (view === 'history') renderHistory();
    if (view === 'find' && onlineReady()) window.MHRSimOnline.renderFind();
    else if (view === 'online' && onlineReady()) window.MHRSimOnline.renderPanel();
    else if (view === 'online' || view === 'find') renderOnline();
    if (view === 'custom' || view === 'tools') {
      const friend = view === 'custom';
      $('customTitle').textContent = friend ? 'Play with a friend · same device' : 'Custom game & test tools';
      if (friend) { $('ct0').value = 'human'; $('ct1').value = 'human'; }
    }
    try { if (location.hash.slice(1) !== view) history.replaceState(null, '', view === 'home' ? location.pathname + location.search : '#' + view); } catch (e) { /* file:// tanpa history API */ }
    window.scrollTo(0, 0);
    if (window.MHRSimI18N) window.MHRSimI18N.apply();
  }

  // Kartu "Permainan belum selesai" tampil di semua layar menu (mis. HP dibuka lagi di layar Latihan).
  function renderResume() {
    const ui = U(), sv = ui && ui.savedGame();
    let h = '';
    if (sv) {
      h += '<div class="resume"><div class="tx"><b>▶ Unfinished game</b><div class="small muted">' + esc(MODE_LABEL[sv.gmode] || 'Game') + ' · ' +
        esc((sv.names || []).join(' vs ')) + ' · turn ' + (sv.turn || 0) + ' · saved ' + esc(ago(sv.at || Date.now())) + '</div></div>' +
        '<button class="pri" data-m="resume" style="min-height:44px">Resume</button><button data-m="discard" style="min-height:44px">Discard</button></div>';
    }
    let on = null; try { on = JSON.parse(localStorage.getItem('mhrsim.online.v1') || 'null'); } catch (e) { on = null; }
    if (on && on.room && !on.over && view !== 'online' && onlineReady()) {
      h += '<div class="resume"><div class="tx"><b>▶ Online game in progress</b><div class="small muted">Room ' + esc(on.room) + ' · your seat is kept for 2 minutes after you leave</div></div>' +
        '<button class="pri" data-mode="online" style="min-height:44px">Back to the game</button></div>';
    }
    $('resumeBox').innerHTML = h;
  }
  // O2: main online tersedia bila simulator dibuka di dalam Battle Sim situs (ada MHRSimHost di halaman induk).
  function onlineReady() { return !!(window.MHRSimOnline && window.MHRSimOnline.host()); }
  /* Menu "hub" (riwayat #76, permintaan pemilik 11 Nov 2026): satu layar seperti lobi game — spanduk + tag BETA, baris
     mode yang membuka di tempat (mulai cepat tanpa pindah layar), ubin pintasan, kotak beta (lapor bug / feedback) dan
     permainan terakhir. Rujukan susunan: beranda rushdee.app dan lobi game kartu lain; teks, warna dan isi milik sendiri. */
  const BETA = { from: '2026-11-11', to: '2026-11-18', label: '11–18 Nov 2026' };      // keputusan pemilik: beta 1 minggu
  const BETA_END = new Date(BETA.to + 'T23:59:59+07:00').getTime();
  // #82 (pemilik 12 Nov 2026: beta berakhir 18 Nov): sesudah tanggal itu tag BETA dan kotak beta hilang sendiri,
  // tombol lapor bug / feedback tetap ada. Kelas html.beta-over juga menyembunyikan tag BETA di judul (index.html).
  const betaOn = () => Date.now() <= BETA_END;
  try { if (!betaOn()) document.documentElement.classList.add('beta-over'); } catch (e) { /* bukan peramban */ }
  function betaLeft() {
    const end = BETA_END, d = Math.ceil((end - Date.now()) / 86400000);
    return d > 1 ? d + ' days left' : d === 1 ? 'last day' : '';
  }
  /* ---------------- Menu v7 · A "Play Blade" (riwayat #81, pilihan pemilik 12 Nov 2026) ----------------
     Menggantikan menu "hub" #76 yang susunannya terlalu mirip rushdee.app. Pola panel Play di sisi kanan (MTG Arena /
     Legends of Runeterra): MODE (4 ubin) → YOUR DECK (ubin deck akun + tempel kode) → pilihan mode → tombol PLAY.
     Kiri: spanduk, pintasan (History, Sandbox, Tools, Feedback), permainan terakhir, kotak beta. Di HP panel Play tampil
     tepat di bawah spanduk. Layar lama (More options, room online, Find a match, satu perangkat) tetap menjadi langkah kedua. */
  const PB_MODES = [['practice', '🤖', 'Practice', 'vs Bot'], ['find', '⚔️', 'Find a match', 'Standard clock'], ['online', '🔗', 'Friend online', 'Room link'], ['custom', '👥', 'Same device', 'Pass-and-play']];
  let pbMode = PB_MODES.some(m => m[0] === prefs.pbMode) ? prefs.pbMode : 'practice';
  let pbDeck = null, pbCode = null, pbPicked = false;   // pilihan deck di panel (my:i atau code); pbPicked = dipilih pemain
  const COLOR_DOT = { Merah: 'r', Kuning: 'y', Biru: 'b', Hijau: 'g', Orange: 'o', Purple: 'p' };
  function deckLook(code) {
    const d = S.decodeDeckCode(code || ''); if (!d || !d.list.length) return { n: 0, cols: [], key: null };
    const cnt = {}; d.list.forEach(no => { cnt[no] = (cnt[no] || 0) + 1; });
    const cols = {}; d.list.forEach(no => { const c = S.card(no); if (c) cols[c.c] = (cols[c.c] || 0) + 1; });
    const key = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || ((S.card(b) || {}).l || 0) - ((S.card(a) || {}).l || 0))[0];
    return { n: d.list.length, cols: Object.keys(cols).sort((a, b) => cols[b] - cols[a]), key };
  }
  function pbImg(no) {
    const base = window.MHRSIM_BASE || '../../mhr-lab-x7k2m9/';
    return '<img alt="" draggable="false" src="' + base + 'images/en/' + no + '.jpg" data-no="' + no + '" data-i="0" onerror="window.__simImgErr && window.__simImgErr(this)">';
  }
  function pbDecksHTML() {
    if (!onlineReady()) {     // dibuka lokal (app\ untuk uji): daftar lama
      return '<div class="f"><select id="hubDeck">' + deckOptions(false) + '<option value="code">Deck link or code…</option></select></div>';
    }
    const list = OL().myDecks(), p = practicePrefs();
    if (!pbPicked || pbDeck == null || (/^my:/.test(pbDeck) && !list[+pbDeck.slice(3)])) pbDeck = list.length ? (/^my:\d+$/.test(p.deck) && list[+p.deck.slice(3)] ? p.deck : 'my:0') : 'code';
    let h = '<div class="pbdecks">';
    list.slice(0, 11).forEach((d, i) => {
      const lk = deckLook(d.code), v = 'my:' + i;
      h += '<button class="pbdk' + (pbDeck === v ? ' on' : '') + '" data-pbdeck="' + v + '" title="' + esc(d.name) + '"><span class="art">' + (lk.key ? pbImg(lk.key) : '') + '</span>' +
        '<span class="t"><b>' + esc(d.name) + '</b><span class="dots">' + lk.cols.map(c => '<i class="' + (COLOR_DOT[c] || '') + '"></i>').join('') + '</span> <small>' + lk.n + '</small></span></button>';
    });
    h += '<button class="pbdk paste' + (pbDeck === 'code' ? ' on' : '') + '" data-pbdeck="code"><span>＋ Paste a deck link / code</span></button></div>';
    if (pbDeck === 'code') h += '<textarea id="pbCode" class="pbcode" placeholder="Paste a deck link/code from the mhrdecklab Deck Builder">' + esc(pbCode != null ? pbCode : (p.code || '')) + '</textarea>';
    if (!list.length) h += '<p class="small muted">' + esc(OL().noDecksText) + '</p>';
    return h;
  }
  function pbBody() {
    const on = onlineReady(), p = practicePrefs();
    const offline = '<p class="small muted">Online play runs inside Battle Sim on mhrdecklab.com. Open mhrdecklab.com, log in, and choose Battle Sim in the menu.</p>';
    let h = '';
    if (pbMode === 'practice') {
      h += '<div class="pblbl">YOUR DECK' + (on ? ' · SAVED TO YOUR ACCOUNT' : '') + '</div>' + pbDecksHTML() +
        '<div class="pblbl">BOT LEVEL</div>' + seg('hublevel', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], p.level) +
        '<div id="hubErr" class="err"></div><button class="pbplay" data-hub="play">PLAY</button><button class="pbmore" data-mode="practice">More options (name, bot deck, clock, first player)</button>';
    } else if (pbMode === 'find') {
      h += on ? '<div class="pblbl">YOUR DECK · SAVED TO YOUR ACCOUNT</div>' + pbDecksHTML() +
        '<p class="small muted">You are matched with the next player who is searching: Standard clock 2:00 / 0:30, random first player. After 45 seconds you can play the bot while you keep searching; a bot is always shown as a bot.</p>' +
        '<div id="hubErr" class="err"></div><button class="pbplay" data-hub="play">FIND A MATCH</button>'
        : offline + '<button class="pbmore" data-mode="find">Details</button>';
    } else if (pbMode === 'online') {
      h += on ? '<p class="small">Create a private room and send the link (WhatsApp works well), or enter a room code from a friend. You choose your deck and the turn clock on the next screen.</p>' +
        '<button class="pbplay" data-mode="online">CREATE OR JOIN A ROOM</button>'
        : offline + '<button class="pbmore" data-mode="online">Details</button>';
    } else {
      h += '<p class="small">Two players take turns on one device, with a handover screen between them. Flexible turn clock or a 30-minute match clock.</p>' +
        '<button class="pbplay" data-mode="custom">SET UP THE GAME</button>';
    }
    return h;
  }
  function drawBlade() {
    const el = $('pbBody'); if (!el) return;
    document.querySelectorAll('#home [data-pbmode]').forEach(b => b.classList.toggle('on', b.dataset.pbmode === pbMode));
    el.innerHTML = pbBody();
    const hd = $('hubDeck'); if (hd) { const p = practicePrefs(); hd.value = p.deck === 'code' ? 'code' : p.deck; if (!hd.value) hd.selectedIndex = 0; }
    if (window.MHRSimI18N) window.MHRSimI18N.apply();
  }
  function renderHome() {
    const ui = U(), hist = ui ? ui.history() : [];
    const mine = hist.filter(r => r.me != null && r.winner != null);
    const W = mine.filter(r => r.winner === r.me).length, L = mine.filter(r => r.winner >= 0 && r.winner !== r.me).length;
    const left = betaLeft();
    let h = '<nav class="pbnav"><button class="on" data-mode="home">Play</button><button data-mode="history">History</button><button data-hub="sandbox">Sandbox</button>' +
      '<button data-mode="tools">Tools</button><button data-rep="open" data-v="feedback">Feedback</button></nav>';
    h += '<section class="pbhero"><div class="kick"><span>MARVEL HERO RUSH · MATCH SIMULATOR</span>' + (betaOn() ? '<span class="betatag">BETA</span>' : '') + '</div>' +
      '<h2>CALL. ATTACK.<br><em>RUSH.</em></h2><p>Every rule and card effect is handled for you. Pick a mode, pick your deck, press PLAY.</p>' +
      '<div class="hstats">' + (mine.length ? '<span><b>' + mine.length + '</b> <i>games</i></span><span class="w"><b>' + W + '</b> <i>wins</i></span><span class="l"><b>' + L + '</b> <i>losses</i></span>' : '<span><i>No games yet: start with the bot</i></span>') +
      '<span class="e"><i>Engine</i> <b>v' + esc(S.VERSION) + '</b></span></div><div class="fan"><i></i><i></i><i></i></div></section>';
    h += '<aside class="pblade"><div class="pblbl">MODE</div><div class="pbmodes">' +
      PB_MODES.map(([k, ic, t, s]) => '<button data-pbmode="' + k + '"' + (k === pbMode ? ' class="on"' : '') + '><b><i class="pbic">' + ic + '</i>' + esc(t) + '</b><span>' + esc(s) + '</span></button>').join('') +
      '</div><div id="pbBody"></div></aside>';
    h += '<section class="pbmore2"><div class="recent"><div class="rh"><b>RECENT GAMES</b><button class="sm" data-mode="history">All →</button></div>';
    if (!hist.length) h += '<p class="small muted">Games you finish on this device appear here, with a replay.</p>';
    hist.slice(0, 4).forEach(r => {
      const me = r.me, res = r.winner < 0 ? 'd' : me == null ? null : r.winner === me ? 'w' : 'l';
      const who = me == null ? (r.names || []).join(' vs ') : 'vs ' + (r.names[1 - me] || '');
      h += '<div class="rrow"><span class="res ' + (res || 'd') + '">' + (res === 'w' ? 'WIN' : res === 'l' ? 'LOSS' : res === 'd' ? 'DRAW' : '—') + '</span><div class="tx"><b>' + esc(who) + '</b>' +
        '<div class="small muted">' + esc(MODE_LABEL[r.mode] || 'Game') + ' · ' + r.turns + ' turns · ' + esc(ago(new Date(r.at).getTime() || Date.now())) + '</div></div>' +
        '<button class="sm" data-h="replay" data-id="' + r.id + '">Replay</button></div>';
    });
    h += '</div><div class="betabox">' + (betaOn() ? '<div class="bh"><span class="betatag">BETA</span><b>' + esc(BETA.label) + '</b>' + (left ? '<i>' + esc(left) + '</i>' : '') + '</div>' +
      '<p>Battle Sim is in a one-week beta. It may end earlier if no bugs are reported and player feedback is positive.</p>' : '<div class="bh"><b>Help us improve</b></div>') +
      '<p class="small">Something wrong with a rule or a card effect? Is anything confusing on your phone? Your report goes straight to the developer.</p>' +
      '<div class="mgo"><button class="pri" data-rep="open" data-v="bug">🐞 Report a bug</button><button data-rep="open" data-v="feedback">💬 Send feedback</button></div></div></section>';
    $('home').innerHTML = h;
    drawBlade();
    if (onlineReady()) OL().loadDecks().then(() => { if (view === 'home') drawBlade(); });
  }
  function pbDeckChoice() {
    const hd = $('hubDeck');
    if (hd) return { deck: hd.value, code: hd.value === 'code' ? (practicePrefs().code || '') : '' };
    const c = $('pbCode');
    return { deck: pbDeck || 'code', code: c ? c.value : '' };
  }
  function pbPlay() {
    const ch = pbDeckChoice(), err = $('hubErr');
    if (pbMode === 'find') {
      if (ch.deck === 'code' && !ch.code.trim()) { if (err) err.textContent = 'Paste a deck link / code first.'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
      OL().findWith(ch.deck, ch.code); return;
    }
    const p = practicePrefs();
    if (ch.deck === 'code' && !ch.code.trim() && !$('hubDeck')) { if (err) err.textContent = 'Paste a deck link / code first.'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
    if ($('hubDeck') && ch.deck === 'code' && !p.code) { show('practice'); $('prDeck').value = 'code'; $('prCodeWrap').style.display = ''; return; }
    launchPractice(Object.assign(p, { deck: ch.deck, code: ch.code || p.code || '', level: segVal('hublevel') || p.level }), err);
  }
  function practicePrefs() { return Object.assign({ name: 'Player', deck: 'spr', bot: 'random', level: 'normal', first: 'random', clock: 'off' }, prefs.practice || {}); }
  function seg(id, opts, cur) {
    return '<div class="seg" data-seg="' + id + '">' + opts.map(([v, l]) => '<button data-v="' + v + '"' + (v === cur ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>';
  }
  function renderPractice() {
    const p = practicePrefs();
    $('panelPractice').innerHTML = '<div class="hd"><button data-mode="home">← Menu</button><h2>Practice vs Bot</h2></div>' +
      '<div class="box"><div class="form">' +
      '<div class="f"><label>Your name</label><input id="prName" maxlength="20" value="' + esc(p.name) + '"></div>' +
      '<div class="f"><label>Your deck</label><select id="prDeck">' + yourDeckOptions() + '</select>' + yourDeckNote() + '</div>' +
      '<div class="f full" id="prCodeWrap" style="display:none"><label>Deck link or code</label><textarea id="prCode" placeholder="Paste a deck link/code from the mhrdecklab Deck Builder">' + esc(p.code || '') + '</textarea></div>' +
      '<div class="f"><label>Bot deck</label><select id="prBot"><option value="random">Random test deck</option>' + deckOptions(false) + '</select></div>' +
      '<div class="f"><label>Bot level</label>' + seg('level', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], p.level) + '</div>' +
      '<div class="f"><label>Who goes first</label>' + seg('first', [['random', 'Random'], ['you', 'You'], ['bot', 'Bot']], p.first) + '</div>' +
      '<div class="f"><label>Turn clock</label>' + seg('clock', [['off', 'No clock'], ['standard', 'Standard'], ['relaxed', 'Relaxed'], ['match30', 'Match 30:00']], p.clock) + '</div>' +
      '</div><p class="small muted">The bot is a training opponent: Easy picks random legal moves, Normal plays greedy moves, Hard tries its options ahead before choosing (it never sees your HAND or the Deck order). Match 30:00 simulates an official match: one shared 30-minute clock and no per-turn limit; when time runs out, most Rush Points wins, then most cards left in the Deck, then rock-paper-scissors. Undo is always allowed in practice. Finished games are saved in Match history (offline).</p>' +
      '<div id="prErr" class="err"></div><div class="startbar"><button class="pri" id="prStart">▶ Start practice</button></div></div>';
    $('prDeck').value = p.deck; if (!$('prDeck').value) $('prDeck').selectedIndex = 0;
    $('prBot').value = p.bot; if (!$('prBot').value) $('prBot').value = 'random';
    $('prCodeWrap').style.display = $('prDeck').value === 'code' ? '' : 'none';
    $('prDeck').onchange = () => { $('prCodeWrap').style.display = $('prDeck').value === 'code' ? '' : 'none'; };
    $('prStart').onclick = startPractice;
    refreshYourDecks();
  }
  function segVal(id) { const b = document.querySelector('[data-seg="' + id + '"] button.on'); return b ? b.dataset.v : null; }
  function startPractice() {
    launchPractice({ name: ($('prName').value || 'Player').trim().slice(0, 20) || 'Player', deck: $('prDeck').value, code: $('prCode').value, bot: $('prBot').value,
      level: segVal('level') || 'normal', first: segVal('first') || 'random', clock: segVal('clock') || 'off' }, $('prErr'));
  }
  function launchPractice(o, errEl) {
    const ui = U();
    const name = o.name || 'Player', level = o.level, first = o.first, clock = o.clock;
    const my = /^my:(\d+)$/.exec(o.deck || ''), saved = my && onlineReady() ? OL().myDecks()[+my[1]] : null;   // #80: deck akun
    if (my && !saved) { errEl.textContent = 'Choose one of your saved decks, or paste a deck link / code.'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
    const mine = saved ? Object.assign(ui.deckFrom('code', saved.code, 'Your'), { name: saved.name }) : ui.deckFrom(o.deck, o.code || '', 'Your');
    let botV = o.bot || 'random';
    if (botV === 'random') { const vals = testDeckValues().filter(v => !/^cd:/.test(v)); botV = vals[Math.floor(Math.random() * vals.length)]; }
    const bot = ui.deckFrom(botV, '', "The bot's");
    const errs = [];
    [[mine, 'Your deck'], [bot, "Bot's deck"]].forEach(([d, who]) => {
      if (d.err) { errs.push(d.err); return; }
      if (d.hidden) errs.push(who + ': ' + d.hidden + ' card(s) from SD05, SD06 or PB02. ' + S.HIDDEN_MSG + '.');
      const v = S.validateDeck(d.list); if (v.length) errs.push(who + ' (' + d.name + '):\n- ' + v.join('\n- '));
    });
    if (errs.length) { errEl.textContent = errs.join('\n\n'); if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
    prefs.practice = { name, deck: o.deck, code: o.code || '', bot: o.bot || 'random', level, first, clock }; savePrefs();
    ui.launch({ decks: [mine.list, bot.list], names: [name, 'Bot · ' + LEVEL_LABEL[level]], ctrl: ['human', 'bot'],
      first: first === 'you' ? 0 : first === 'bot' ? 1 : 'random', timer: clock, botLevel: level, gmode: 'practice',
      deckNames: [mine.name || 'Deck', bot.name || 'Deck'], youIdx: 0 });
  }

  function renderHistory() {
    const ui = U(), list = ui.history();
    const prac = list.filter(r => r.me != null && r.winner != null);
    const W = prac.filter(r => r.winner === r.me).length, L = prac.filter(r => r.winner >= 0 && r.winner !== r.me).length, D = prac.filter(r => r.winner < 0).length;
    let h = '<div class="hd"><button data-mode="home">← Menu</button><h2>Match history</h2></div>';
    if (onlineReady()) {
      h += '<div class="seg" style="margin:0 0 10px" data-histtab>' + [['offline', 'Offline (this device)'], ['online', 'Online (account)']].map(([v, l]) => '<button data-ht="' + v + '"' + (v === histTab ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>';
      if (histTab === 'online') { $('panelHistory').innerHTML = h + '<div id="histOnline"></div>'; window.MHRSimOnline.renderHistory($('histOnline')); return; }
    }
    h += '<p class="small muted"><span class="badge">SIMULATOR · OFFLINE</span> Games played on this device (practice, same-device, custom). In Performance, simulator games form their own group; offline and online games are never combined in one statistic, and never mixed with tournament records. Up to 100 games are kept.</p>';
    if (prac.length) h += '<div class="stats"><span class="badge">Your games: ' + prac.length + '</span><span class="badge" style="color:#7fd79d">W ' + W + '</span><span class="badge" style="color:#ff9d8f">L ' + L + '</span>' + (D ? '<span class="badge">D ' + D + '</span>' : '') +
      '<span class="badge">Win rate ' + Math.round(W / Math.max(1, W + L + D) * 100) + '%</span></div>';
    if (!list.length) h += '<div class="box small muted">No games yet. Finish a game and it appears here.</div>';
    list.forEach(r => {
      const me = r.me, res = r.winner < 0 ? 'd' : me == null ? null : r.winner === me ? 'w' : 'l';
      const resTxt = res === 'w' ? 'WIN' : res === 'l' ? 'LOSS' : res === 'd' ? 'DRAW' : '—';
      const end = { rp: '9 Rush Points', deck: 'Deck out', time: 'Time up', draw: 'Draw', other: 'Other' }[r.end] || '';
      const mode = (MODE_LABEL[r.mode] || 'Game') + (r.mode === 'practice' && r.botLevel ? ' (' + LEVEL_LABEL[r.botLevel] + ')' : '');
      const who = me == null ? (r.winner < 0 ? 'Draw' : (r.names[r.winner] || '') + ' won') : 'vs ' + (r.names[1 - me] || '');
      h += '<div class="hrow"><span class="res ' + (res || 'd') + '">' + resTxt + '</span><div class="tx"><b>' + esc(mode) + '</b> · ' + esc(who) +
        '<div class="small muted">' + esc((r.names || []).map((n, i) => n + ': ' + ((r.decks || [])[i] || 'Deck')).join(' · ')) + '</div>' +
        '<div class="small muted">' + esc(fmtDate(r.at)) + ' · ' + r.turns + ' turns · ' + esc(end) + (r.first != null ? ' · ' + esc(r.names[r.first] || '') + ' went first' : '') + '</div></div>' +
        '<button class="sm" data-h="replay" data-id="' + r.id + '">Replay</button><button class="sm" data-h="copy" data-id="' + r.id + '">Log code</button><button class="sm warn" data-h="del" data-id="' + r.id + '">Delete</button></div>';
    });
    if (list.length) h += '<div class="startbar"><button data-h="export">Export (JSON)</button><button class="warn" data-h="clear">Delete all</button></div>';
    $('panelHistory').innerHTML = h;
  }
  function renderOnline() {
    $('panelOnline').innerHTML = '<div class="hd"><button data-mode="home">← Menu</button><h2>Online play</h2></div>' +
      '<div class="box"><p><b>Not available yet.</b> Online play arrives with the online version on mhrdecklab.com, after all testing is finished.</p>' +
      '<ul class="small" style="color:#c9d2de;margin:6px 0 0 18px;padding:0">' +
      '<li><b>Find a match</b>: play someone online. If nobody is found within 45 seconds, you are offered a game against a bot (Easy, Normal or Hard) while you keep waiting; a bot is always shown as a bot.</li>' +
      '<li><b>Private room with a link</b>: create a room, send the link to a friend, and pick a clock: Standard, Relaxed, Long, no clock, or Match 30:00 (official-match simulation).</li>' +
      '<li>If your phone switches app or tab, your seat is kept for a short time and the simulator reconnects you to the game when you come back.</li>' +
      '<li>Online games are saved in your account and shown in Performance under the Simulator group, with online and offline statistics kept separate.</li></ul></div>';
  }

  /* ---------------- aksi ---------------- */
  function download(name, text) {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { /* abaikan */ }
  }
  function onClick(ev) {
    const t = ev.target.closest('[data-mode],[data-m],[data-h],[data-ht],[data-seg] button,[data-lang],[data-hub],[data-pbmode],[data-pbdeck]');
    if (!t || !$('setup').contains(t)) return;
    const ui = U();
    if (t.dataset.hub === 'play') { pbPlay(); return; }
    if (t.dataset.pbmode) { pbMode = t.dataset.pbmode; prefs.pbMode = pbMode; savePrefs(); drawBlade(); return; }
    if (t.dataset.pbdeck) { const c = $('pbCode'); if (c) pbCode = c.value; pbDeck = t.dataset.pbdeck; pbPicked = true; drawBlade(); if (pbDeck === 'code' && $('pbCode')) $('pbCode').focus(); return; }
    if (t.dataset.hub === 'sandbox') { const b = $('btnSandbox'); if (b) b.click(); return; }
    if (t.dataset.ht) { histTab = t.dataset.ht; renderHistory(); if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
    if (t.dataset.lang) { if (window.MHRSimI18N) window.MHRSimI18N.set(t.dataset.lang); return; }
    if (t.closest('[data-seg]') && t.dataset.v) { t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); return; }
    if (t.dataset.mode) { show(t.dataset.mode); return; }
    if (t.dataset.m === 'resume') { if (!ui.resumeSaved()) { ui.clearSaved(); renderResume(); } return; }
    if (t.dataset.m === 'discard') { if (confirm('Discard the unfinished game? It is not saved to Match history.')) { ui.clearSaved(); renderResume(); if (window.MHRSimI18N) window.MHRSimI18N.apply(); } return; }
    const id = t.dataset.id, rec = id ? ui.history().find(r => r.id === id) : null;
    switch (t.dataset.h) {
      case 'replay': if (rec) ui.replayCode(rec.code); return;
      case 'copy': if (rec) { const done = () => { t.textContent = 'Copied'; }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(rec.code).then(done, () => prompt('Log code', rec.code)); else prompt('Log code', rec.code); } return;
      case 'del': if (rec && confirm('Delete this game from Match history?')) { ui.histDel(id); renderHistory(); if (window.MHRSimI18N) window.MHRSimI18N.apply(); } return;
      case 'clear': if (confirm('Delete all offline games from Match history on this device?')) { ui.histSet([]); renderHistory(); if (window.MHRSimI18N) window.MHRSimI18N.apply(); } return;
      case 'export': download('mhr-battle-sim-history.json', JSON.stringify({ app: 'MHR Battle Sim', kind: 'offline-history', exported: new Date().toISOString(), games: ui.history() }, null, 1)); return;
    }
  }

  function init() {
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', () => { const v = (location.hash || '').slice(1) || 'home'; if (VIEWS[v] && v !== view && !document.getElementById('game').classList.contains('on')) show(v); });
    const h = (location.hash || '').slice(1);
    show(VIEWS[h] ? h : 'home');
  }
  window.MHRSimModes = { show, renderHome, renderResume, view: () => view };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
