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
    if (view === 'online' && onlineReady()) window.MHRSimOnline.renderPanel();
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
  function renderHome() {
    const ui = U(), hist = ui ? ui.history() : [];
    let h = '';
    h += tile('practice', '🤖', 'Practice vs Bot', 'Train against the bot with your deck. Choose the bot level; clock is optional and undo is free.', true);
    h += tile('custom', '👥', 'Play with a friend · same device', 'Pass-and-play on one phone or tablet. Choose a flexible turn clock or a 30-minute match clock.', true);
    if (onlineReady()) h += tile('online', '🔗', 'Private room with a link', 'Create a room and send the link to a friend. Flexible turn clock or 30-minute match clock.', true);
    h += tile('find', '🌐', 'Find a match', 'Play someone online.', false, onlineReady() ? 'Coming later' : 'Online version');
    if (!onlineReady()) h += tile('online', '🔗', 'Private room with a link', 'Create a room and send the link to a friend. Flexible turn clock or 30-minute match clock.', false, 'Online version');
    h += tile('history', '📜', 'Match history', hist.length ? hist.length + ' offline game(s) saved on this device.' : 'Offline games you finish are saved here.', false);
    h += tile('tools', '🛠', 'Custom game & test tools', 'Any two decks, human or bot on each side, Sandbox editor, log codes.', false);
    h += '<div class="repline"><button data-rep="open" data-v="bug">🐞 Report a bug</button><button data-rep="open" data-v="feedback">💬 Send feedback</button></div>';
    $('home').innerHTML = h;
  }
  function tile(v, ic, title, sub, main, tag) {
    return '<button class="tile' + (main ? ' main' : '') + (tag ? ' soon' : '') + '" data-mode="' + v + '"><span class="ic">' + ic + '</span><span><b>' + esc(title) + '</b><span>' + esc(sub) + '</span>' +
      (tag ? '<span class="tag">' + esc(tag) + '</span>' : '') + '</span></button>';
  }

  function seg(id, opts, cur) {
    return '<div class="seg" data-seg="' + id + '">' + opts.map(([v, l]) => '<button data-v="' + v + '"' + (v === cur ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>';
  }
  function renderPractice() {
    const p = Object.assign({ name: 'Player', deck: 'spr', bot: 'random', level: 'normal', first: 'random', clock: 'off' }, prefs.practice || {});
    $('panelPractice').innerHTML = '<div class="hd"><button data-mode="home">← Menu</button><h2>Practice vs Bot</h2></div>' +
      '<div class="box"><div class="form">' +
      '<div class="f"><label>Your name</label><input id="prName" maxlength="20" value="' + esc(p.name) + '"></div>' +
      '<div class="f"><label>Your deck</label><select id="prDeck">' + deckOptions(true) + '</select></div>' +
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
  }
  function segVal(id) { const b = document.querySelector('[data-seg="' + id + '"] button.on'); return b ? b.dataset.v : null; }
  function startPractice() {
    const ui = U();
    const name = ($('prName').value || 'Player').trim().slice(0, 20) || 'Player';
    const level = segVal('level') || 'normal', first = segVal('first') || 'random', clock = segVal('clock') || 'off';
    const mine = ui.deckFrom($('prDeck').value, $('prCode').value, 'Your');
    let botV = $('prBot').value;
    if (botV === 'random') { const vals = testDeckValues().filter(v => !/^cd:/.test(v)); botV = vals[Math.floor(Math.random() * vals.length)]; }
    const bot = ui.deckFrom(botV, '', "The bot's");
    const errs = [];
    [[mine, 'Your deck'], [bot, "Bot's deck"]].forEach(([d, who]) => {
      if (d.err) { errs.push(d.err); return; }
      if (d.hidden) errs.push(who + ': ' + d.hidden + ' card(s) from SD05, SD06 or PB02. ' + S.HIDDEN_MSG + '.');
      const v = S.validateDeck(d.list); if (v.length) errs.push(who + ' (' + d.name + '):\n- ' + v.join('\n- '));
    });
    if (errs.length) { $('prErr').textContent = errs.join('\n\n'); if (window.MHRSimI18N) window.MHRSimI18N.apply(); return; }
    prefs.practice = { name, deck: $('prDeck').value, code: $('prCode').value, bot: $('prBot').value, level, first, clock }; savePrefs();
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
    const t = ev.target.closest('[data-mode],[data-m],[data-h],[data-ht],[data-seg] button,[data-lang]');
    if (!t || !$('setup').contains(t)) return;
    const ui = U();
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
