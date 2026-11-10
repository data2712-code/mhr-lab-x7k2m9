/* ===================================================================
   MHR BATTLE SIM — MAIN ONLINE (sim-online.js)                        O2 · riwayat #63
   ===================================================================
   Room privat dengan link (O-3): buat room → kirim link mhrdecklab.com/#sim/room/KODE → teman gabung → main.
   - Wajib login situs (O-2). Selama uji O2 server hanya menerima akun admin. Token login diambil dari halaman situs
     induk (window.parent.MHRSimHost, lihat index.html situs); simulator sendiri tidak pernah menyimpan kata sandi.
   - Deck: Deck Saya (akun), Tournament Decks, deck komunitas, deck uji, atau kode deck. Server memeriksa ulang deck.
   - Koneksi WebSocket ke server (Cloudflare Durable Object). Kursi + token disimpan di perangkat ('mhrsim.online.v1'),
     jadi HP yang berganti aplikasi / halaman yang dimuat ulang tersambung kembali otomatis ("Kembali ke permainan").
   - Papan memakai sim-ui.js (MHRSimUI.online): status bayangan dari tampilan server, aksi dikirim ke server.
   - Riwayat online: tabel Supabase sim_matches (hanya pertandingan sendiri, RLS); replay dari kode log lengkap.
   =================================================================== */
(function () {
  'use strict';
  const S = window.MHRSim, U = () => window.MHRSimUI;
  const API = (window.MHRSIM_ONLINE_API || 'https://mhr-battle-sim-test.dataanggi2712.workers.dev').replace(/\/$/, '');
  const KEY = 'mhrsim.online.v1', KEY_PREF = 'mhrsim.onlinePrefs.v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tr = () => { if (window.MHRSimI18N) window.MHRSimI18N.apply(); };
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };
  const CLOCK_LABEL = { standard: 'Standard 2:00 / 0:30', relaxed: 'Relaxed 5:00 / 1:00', long: 'Long 10:00 / 2:00', off: 'No clock', match30: 'Match 30:00' };
  const TEST_LABEL = { sd01: 'SD01', sd02: 'SD02', sd03: 'SD03', sd04: 'SD04', bp01r: 'BP01R', bp01y: 'BP01Y', bp01b: 'BP01B', bp01g: 'BP01G', s4r: 'S4R', s4y: 'S4Y', s4b: 'S4B', s4g: 'S4G', spr: 'SPR', spy: 'SPY', spb: 'SPB', spg: 'SPG' };

  /* ---------- situs induk (iframe Battle Sim di mhrdecklab.com) ---------- */
  function host() {
    try { if (window.parent !== window && window.parent.MHRSimHost) return window.parent.MHRSimHost; } catch (e) { /* lain asal */ }
    return window.MHRSimHost || null;
  }
  async function session() { const h = host(); if (!h) return null; try { return await h.session(); } catch (e) { return null; } }
  async function apiFetch(path, opts) {
    const o = Object.assign({ headers: {} }, opts || {});
    o.headers = Object.assign({ 'content-type': 'application/json' }, o.headers);
    if (o.auth) { const s = await session(); if (s && s.token) o.headers.Authorization = 'Bearer ' + s.token; delete o.auth; }
    try {
      const r = await fetch(API + path, o);
      const j = await r.json().catch(() => ({}));
      if (!r.ok && !j.error) j.error = 'Server error (' + r.status + ').';
      return j;
    } catch (e) { return { error: 'Cannot reach the Battle Sim server. Check your internet connection.' }; }
  }

  /* ---------- kursi yang tersimpan di perangkat ---------- */
  const seatGet = () => { const s = ls.get(KEY); return s && s.room && s.token ? s : null; };
  const seatSet = s => ls.set(KEY, Object.assign({ at: Date.now() }, s));
  const seatDel = () => ls.del(KEY);

  /* ---------- koneksi ---------- */
  const conn = { ws: null, info: null, retry: 0, closed: true, rt: null, ping: null, inGame: false, waiting: null };
  function status(t) { const el = $('netStatus'); if (!el) return; el.textContent = t || ''; el.classList.toggle('on', !!t); }
  function send(o) { if (conn.ws && conn.ws.readyState === 1) { conn.ws.send(JSON.stringify(o)); return true; } status('⚠ Reconnecting… your move was not sent'); return false; }
  function connect(info) {
    disconnect(true);
    conn.info = info; conn.closed = false; conn.inGame = false; conn.retry = 0;
    open();
    clearInterval(conn.ping); conn.ping = setInterval(() => send({ type: 'ping' }), 25000);
  }
  function open() {
    if (conn.closed || !conn.info) return;
    const i = conn.info;
    let ws;
    try { ws = new WebSocket(API.replace(/^http/, 'ws') + '/ws/' + i.room + '?seat=' + i.seat + '&token=' + encodeURIComponent(i.token)); } catch (e) { retry(); return; }
    conn.ws = ws;
    ws.onopen = () => { conn.retry = 0; status(''); };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    ws.onclose = ev => { if (conn.ws === ws) { conn.ws = null; if (!conn.closed) { status('⚠ Connection lost · reconnecting…'); retry(); } } };
    ws.onerror = () => { /* onclose menyusul */ };
  }
  function retry() { clearTimeout(conn.rt); const d = Math.min(8000, 500 * Math.pow(2, conn.retry++)); conn.rt = setTimeout(open, d); }
  function disconnect(silent) {
    conn.closed = true; clearTimeout(conn.rt); clearInterval(conn.ping);
    if (conn.ws) { const w = conn.ws; conn.ws = null; try { w.onclose = null; w.close(); } catch (e) { /* abaikan */ } }
    if (!silent) status('');
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !conn.closed && !conn.ws) { clearTimeout(conn.rt); conn.retry = 0; open(); } });
  window.addEventListener('online', () => { if (!conn.closed && !conn.ws) { clearTimeout(conn.rt); open(); } });

  function onMsg(m) {
    const ui = U(); if (!ui) return;
    switch (m.type) {
      case 'waiting': conn.waiting = m; if (!conn.inGame) renderWaiting(); return;
      case 'state': {
        if (!conn.inGame) {
          conn.inGame = true;
          ui.online.enter({ seat: conn.info.seat, send, clock: conn.info.clock || (m.clock && m.clock.mode) || 'standard' });
        }
        ui.online.state(m);
        if ((m.view && m.view.result) || m.ended) { const s = seatGet(); if (s && s.room === conn.info.room) seatSet(Object.assign(s, { over: true })); }
        return;
      }
      case 'undo_ask': ui.online.undoAsk(m); return;
      case 'undo_result': ui.online.undoResult(m); return;
      case 'saved': ui.online.saved(m.matchId); return;
      case 'error': if (conn.inGame) ui.online.error(m.msg); else { const e = $('onErr'); if (e) { e.textContent = m.msg; tr(); } } return;
    }
  }
  // Dari papan: tombol Menu (permainan tetap berjalan, kursi ditahan 2 menit) atau akhir permainan.
  function leaveGame(final, noMenu) {
    disconnect(); conn.inGame = false;
    if (final) seatDel();
    if (!noMenu) { U().toMenu(); if (window.MHRSimModes) window.MHRSimModes.show('online'); }
  }

  /* ---------- pilihan deck ---------- */
  let decks = { mine: [], tn: [] };
  async function loadDecks() {
    const h = host(); decks = { mine: [], tn: [] };
    if (!h) return;
    try { decks.mine = (await h.myDecks()) || []; } catch (e) { decks.mine = []; }
    try { decks.tn = (await h.tourneyDecks()) || []; } catch (e) { decks.tn = []; }
  }
  function deckSelect(id, cur) {
    const cds = Array.isArray(window.DECK_KOMUNITAS) ? window.DECK_KOMUNITAS : [];
    let h = '<select id="' + id + '">';
    if (decks.mine.length) h += '<optgroup label="My Decks">' + decks.mine.map((d, i) => '<option value="my:' + i + '">' + esc(d.name) + '</option>').join('') + '</optgroup>';
    if (decks.tn.length) h += '<optgroup label="Tournament Decks">' + decks.tn.map((d, i) => '<option value="tn:' + i + '">' + esc(d.name) + '</option>').join('') + '</optgroup>';
    const cv = cds.map((d, i) => ({ d, i })).filter(o => o.d && o.d.cd && !/</.test(o.d.cd));
    if (cv.length) h += '<optgroup label="Community decks">' + cv.map(o => '<option value="cd:' + o.i + '">' + esc(o.d.nm) + '</option>').join('') + '</optgroup>';
    h += '<optgroup label="Test decks">' + Object.keys(TEST_LABEL).map(k => '<option value="' + k + '">' + TEST_LABEL[k] + ' test deck</option>').join('') + '</optgroup>';
    h += '<option value="code">Paste a deck link / code…</option></select>';
    return h;
  }
  // Nilai pilihan → { body: {test}|{code,name}, err }
  function readDeck(v, codeText) {
    if (TEST_LABEL[v]) return { body: { test: TEST_LABEL[v] }, name: TEST_LABEL[v] + ' test deck' };
    let code = null, name = 'Deck';
    const m = /^(my|tn|cd):(\d+)$/.exec(v || '');
    if (m && m[1] === 'my' && decks.mine[+m[2]]) { code = decks.mine[+m[2]].code; name = decks.mine[+m[2]].name; }
    else if (m && m[1] === 'tn' && decks.tn[+m[2]]) { code = decks.tn[+m[2]].code; name = decks.tn[+m[2]].name; }
    else if (m && m[1] === 'cd' && window.DECK_KOMUNITAS && window.DECK_KOMUNITAS[+m[2]]) { code = window.DECK_KOMUNITAS[+m[2]].cd; name = window.DECK_KOMUNITAS[+m[2]].nm; }
    else if (v === 'code') { code = codeText; name = 'Deck'; }
    const d = S.decodeDeckCode(code || '');
    if (!d) return { err: 'The deck code could not be read. Paste a link or a "1.xxx.xxx" code from the Deck Builder.' };
    if (d.hidden) return { err: 'This deck has ' + d.hidden + ' card(s) from SD05, SD06 or PB02. ' + S.HIDDEN_MSG + '.' };
    if (d.unknown) return { err: 'This deck has ' + d.unknown + ' unknown card code(s).' };
    const errs = S.validateDeck(d.list);
    if (errs.length) return { err: '"' + name + '" is not a legal deck:\n- ' + errs.join('\n- ') };
    return { body: { code, name: String(name).slice(0, 30) }, name };
  }
  function seg(id, opts, cur) { return '<div class="seg" data-seg="' + id + '">' + opts.map(([v, l]) => '<button data-v="' + v + '"' + (v === cur ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>'; }
  function segVal(id) { const b = document.querySelector('[data-seg="' + id + '"] button.on'); return b ? b.dataset.v : null; }

  /* ---------- panel "Main online" ---------- */
  let pendingJoin = null;
  const head = '<div class="hd"><button data-mode="home">← Menu</button><h2>Online · private room</h2></div>';
  async function renderPanel() {
    const el = $('panelOnline'); if (!el) return;
    if (!host()) {
      el.innerHTML = head + '<div class="box"><p><b>Online play runs inside Battle Sim on mhrdecklab.com.</b></p><p class="small muted">Open mhrdecklab.com, log in, and choose Battle Sim in the menu.</p></div>';
      tr(); return;
    }
    el.innerHTML = head + '<div class="box small muted">Loading…</div>'; tr();
    const s = await session();
    if (!s) {
      el.innerHTML = head + '<div class="box"><p><b>Log in to play online.</b></p><p class="small muted">Online games need a mhrdecklab.com account so your games and replays are saved to it. Practice vs Bot and same-device games work without logging in.</p><div class="startbar"><button class="pri" data-on="login">Log in</button></div></div>';
      tr(); return;
    }
    await loadDecks();
    const pref = Object.assign({ deck: decks.mine.length ? 'my:0' : 'spr', clock: 'standard', first: 'random' }, ls.get(KEY_PREF) || {});
    const sv = seatGet();
    let h = head;
    if (sv && !sv.over) {
      h += '<div class="resume"><div class="tx"><b>▶ Online game in progress</b><div class="small muted">Room ' + esc(sv.room) + ' · ' + esc(CLOCK_LABEL[sv.clock] || '') + ' · your seat is kept for 2 minutes after you leave</div></div>' +
        '<button class="pri" data-on="back" style="min-height:44px">Back to the game</button><button data-on="forget" style="min-height:44px">Forget</button></div>';
    }
    h += '<p class="small muted" style="margin:0 2px 10px">Playing as <b>' + esc(s.username || 'Player') + '</b>' + (s.admin ? ' · admin (closed testing)' : '') + '</p>';
    // Gabung (dari link / kode)
    h += '<div class="box"><h3 style="margin:0 0 8px">Join a room</h3><div class="form">' +
      '<div class="f"><label>Room code</label><input id="onJoinCode" maxlength="6" autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700" value="' + esc(pendingJoin || '') + '" placeholder="e.g. 7KQ2MX"></div>' +
      '<div class="f"><label>Your deck</label>' + deckSelect('onJoinDeck') + '</div>' +
      '<div class="f full" id="onJoinCodeWrap" style="display:none"><label>Deck link or code</label><textarea id="onJoinDeckCode" placeholder="Paste a deck link/code from the mhrdecklab Deck Builder"></textarea></div>' +
      '</div><div id="onJoinInfo" class="small muted"></div><div class="startbar"><button class="pri" data-on="join">Join room</button></div></div>';
    // Buat room
    h += '<div class="box"><h3 style="margin:0 0 8px">Create a room</h3><div class="form">' +
      '<div class="f"><label>Your deck</label>' + deckSelect('onDeck') + '</div>' +
      '<div class="f full" id="onCodeWrap" style="display:none"><label>Deck link or code</label><textarea id="onDeckCode" placeholder="Paste a deck link/code from the mhrdecklab Deck Builder">' + esc(pref.code || '') + '</textarea></div>' +
      '<div class="f"><label>Clock</label>' + seg('onClock', [['standard', 'Standard'], ['relaxed', 'Relaxed'], ['long', 'Long'], ['off', 'No clock'], ['match30', 'Match 30:00']], pref.clock) + '</div>' +
      '<div class="f"><label>Who goes first</label>' + seg('onFirst', [['random', 'Random'], ['host', 'Me'], ['guest', 'My friend']], pref.first) + '</div>' +
      '</div><p class="small muted">Standard 2:00 per turn / 0:30 per response, Relaxed 5:00 / 1:00, Long 10:00 / 2:00. The 3rd timeout loses the game. Match 30:00 = one shared 30-minute clock (most Rush Points, then most cards left in the Deck, then rock-paper-scissors). Undo needs your opponent\'s permission, at most 3 per player. If someone disconnects, their seat is kept for 2 minutes and the clock keeps running.</p>' +
      '<div class="startbar"><button class="pri" data-on="create">Create room & get the link</button></div></div>';
    h += '<div id="onErr" class="err"></div>';
    el.innerHTML = h;
    const pick = (id, v) => { const x = $(id); x.value = v; if (!x.value) x.selectedIndex = 0; };
    pick('onDeck', pref.deck); pick('onJoinDeck', pref.joinDeck || pref.deck);
    const wire = (sel, wrap) => { const f = () => { $(wrap).style.display = $(sel).value === 'code' ? '' : 'none'; }; $(sel).onchange = f; f(); };
    wire('onDeck', 'onCodeWrap'); wire('onJoinDeck', 'onJoinCodeWrap');
    $('onJoinCode').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (e.target.value.length === 6) roomInfo(e.target.value); };
    if (pendingJoin) roomInfo(pendingJoin);
    tr();
  }
  async function roomInfo(code) {
    const el = $('onJoinInfo'); if (!el) return;
    el.textContent = 'Checking room ' + code + '…';
    const r = await apiFetch('/api/rooms/' + code);
    if (!$('onJoinInfo')) return;
    if (r.error) { el.textContent = r.error; tr(); return; }
    el.innerHTML = r.started ? 'Room ' + esc(code) + ' has already started.' : r.expired ? 'Room ' + esc(code) + ' has expired.' :
      'Room <b>' + esc(code) + '</b> · host <b>' + esc(r.names[0]) + '</b> (' + esc(r.decks[0] || 'Deck') + ') · clock ' + esc(CLOCK_LABEL[r.clock] || r.clock) + ' · first: ' + esc(r.first === 0 ? r.names[0] : r.first === 1 ? 'you' : 'random');
    tr();
  }
  function shareUrl(code) { const h = host(); try { if (h && h.shareUrl) return h.shareUrl(code); } catch (e) { /* abaikan */ } return 'https://mhrdecklab.com/#sim/room/' + code; }
  function renderWaiting() {
    const sv = seatGet(), el = $('panelOnline'); if (!el || !sv) return;
    if (window.MHRSimModes && window.MHRSimModes.view() !== 'online') window.MHRSimModes.show('online');
    const url = shareUrl(sv.room);
    el.innerHTML = '<div class="hd"><button data-on="cancel">← Cancel</button><h2>Waiting for your friend</h2></div>' +
      '<div class="box" style="text-align:center"><p class="small muted" style="margin:0">Room code</p><div class="roomcode">' + esc(sv.room) + '</div>' +
      '<p class="small" style="word-break:break-all"><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></p>' +
      '<div class="startbar" style="justify-content:center"><button class="pri" data-on="share">Share link</button><button data-on="copy">Copy link</button></div>' +
      '<p class="small muted">Send the link to your friend (e.g. WhatsApp). They open it, log in, choose a deck and join. The game starts automatically. The room expires if nobody joins within 30 minutes.</p>' +
      '<p class="small muted">Clock: ' + esc(CLOCK_LABEL[sv.clock] || '') + ' · your deck: ' + esc(sv.deckName || 'Deck') + '</p><div class="spin"></div></div><div id="onErr" class="err"></div>';
    tr();
  }
  async function create() {
    $('onErr').textContent = '';
    const d = readDeck($('onDeck').value, $('onDeckCode').value);
    if (d.err) { $('onErr').textContent = d.err; tr(); return; }
    const clock = segVal('onClock') || 'standard', first = segVal('onFirst') || 'random';
    ls.set(KEY_PREF, Object.assign(ls.get(KEY_PREF) || {}, { deck: $('onDeck').value, code: $('onDeckCode').value, clock, first }));
    busy(true);
    const r = await apiFetch('/api/rooms', { method: 'POST', auth: true, body: JSON.stringify({ deck: d.body, clock, first }) });
    busy(false);
    if (r.error) { $('onErr').textContent = r.error; tr(); return; }
    seatSet({ room: r.room, seat: 0, token: r.token, clock: r.clock, deckName: d.name, host: true });
    renderWaiting();
    connect({ room: r.room, seat: 0, token: r.token, clock: r.clock });
  }
  async function join() {
    $('onErr').textContent = '';
    const code = ($('onJoinCode').value || '').toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { $('onErr').textContent = 'Enter the 6-character room code from your friend\'s link.'; tr(); return; }
    const d = readDeck($('onJoinDeck').value, $('onJoinDeckCode').value);
    if (d.err) { $('onErr').textContent = d.err; tr(); return; }
    ls.set(KEY_PREF, Object.assign(ls.get(KEY_PREF) || {}, { joinDeck: $('onJoinDeck').value }));
    busy(true);
    const r = await apiFetch('/api/rooms/' + code + '/join', { method: 'POST', auth: true, body: JSON.stringify({ deck: d.body }) });
    busy(false);
    if (r.error) { $('onErr').textContent = r.error; tr(); return; }
    pendingJoin = null;
    seatSet({ room: r.room, seat: 1, token: r.token, clock: r.clock, deckName: d.name });
    connect({ room: r.room, seat: 1, token: r.token, clock: r.clock });
  }
  function busy(on) { document.querySelectorAll('#panelOnline [data-on="create"],#panelOnline [data-on="join"]').forEach(b => { b.disabled = on; }); }
  function back() {
    const sv = seatGet(); if (!sv) return;
    status('Connecting…');
    if (sv.host && !sv.started) renderWaiting();
    connect({ room: sv.room, seat: sv.seat, token: sv.token, clock: sv.clock });
  }
  function copyText(t, btn) {
    const done = () => { if (btn) { btn.textContent = 'Copied'; tr(); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => prompt('Copy', t)); else prompt('Copy', t);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-on]'); if (!t || !$('setup').contains(t)) return;
    switch (t.dataset.on) {
      case 'login': { const h = host(); if (h && h.openLogin) h.openLogin(); return; }
      case 'create': create(); return;
      case 'join': join(); return;
      case 'back': back(); return;
      case 'forget': if (confirm('Forget this online game on this device? If it is still running, your seat is lost after 2 minutes.')) { seatDel(); renderPanel(); } return;
      case 'cancel': disconnect(); seatDel(); renderPanel(); return;
      case 'copy': { const sv = seatGet(); if (sv) copyText(shareUrl(sv.room), t); return; }
      case 'share': {
        const sv = seatGet(); if (!sv) return;
        const url = shareUrl(sv.room), text = 'Play MHR Battle Sim with me! Room ' + sv.room;
        if (navigator.share) navigator.share({ title: 'MHR Battle Sim', text, url }).catch(() => { /* dibatalkan */ }); else copyText(url, t);
        return;
      }
      case 'hrep': { const code = t.dataset.code; if (code) U().replayCode(code); return; }
      case 'hcopy': copyText(t.dataset.code || '', t); return;
    }
  });

  /* ---------- riwayat online (Supabase sim_matches, RLS: hanya milik sendiri) ---------- */
  const END = { rp: '9 Rush Points', deck: 'Deck out', time: 'Time up', timeouts: '3 timeouts', claim: 'Opponent left', draw: 'Draw', other: 'Other' };
  async function renderHistory(el) {
    const h = host();
    if (!h) { el.innerHTML = '<div class="box small muted">Online games are saved to your mhrdecklab.com account. Open Battle Sim on the site to see them.</div>'; tr(); return; }
    const s = await session();
    if (!s) { el.innerHTML = '<div class="box small muted">Log in on mhrdecklab.com to see your online games.</div>'; tr(); return; }
    el.innerHTML = '<div class="box small muted">Loading…</div>';
    let rows = [], err = null;
    try {
      const c = h.client();
      const q = await c.from('sim_matches').select('id,room,p1,p2,names,deck_names,clock,first,winner,end_cause,cause,turns,rp,timeouts,log_code,engine,ended_at').order('ended_at', { ascending: false }).limit(100);
      rows = q.data || []; err = q.error;
    } catch (e) { err = e; }
    if (err) { el.innerHTML = '<div class="box small err">Online history could not be loaded: ' + esc(err.message || err) + '</div>'; tr(); return; }
    const me = r => (r.p1 === s.userId && r.p2 === s.userId) ? null : r.p1 === s.userId ? 0 : r.p2 === s.userId ? 1 : null;
    const mine = rows.filter(r => me(r) != null && r.winner != null);
    const W = mine.filter(r => r.winner === me(r)).length, D = mine.filter(r => r.winner < 0).length, L = mine.length - W - D;
    let out = '<p class="small muted"><span class="badge">SIMULATOR · ONLINE</span> Games played online with your account. Online and offline statistics are kept separate (O-15).</p>';
    if (mine.length) out += '<div class="stats"><span class="badge">Online games: ' + mine.length + '</span><span class="badge" style="color:#7fd79d">W ' + W + '</span><span class="badge" style="color:#ff9d8f">L ' + L + '</span>' + (D ? '<span class="badge">D ' + D + '</span>' : '') + '<span class="badge">Win rate ' + Math.round(W / Math.max(1, mine.length) * 100) + '%</span></div>';
    if (!rows.length) out += '<div class="box small muted">No online games yet.</div>';
    rows.forEach(r => {
      const m = me(r), res = r.winner == null ? null : r.winner < 0 ? 'd' : m == null ? null : r.winner === m ? 'w' : 'l';
      const resTxt = res === 'w' ? 'WIN' : res === 'l' ? 'LOSS' : res === 'd' ? 'DRAW' : '—';
      const names = r.names || [], dn = r.deck_names || [];
      const who = m == null ? (r.winner >= 0 ? (names[r.winner] || '') + ' won' : 'Draw') : 'vs ' + (names[1 - m] || '');
      let when = r.ended_at; try { const d = new Date(r.ended_at); when = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { /* abaikan */ }
      out += '<div class="hrow"><span class="res ' + (res || 'd') + '">' + resTxt + '</span><div class="tx"><b>Online · private room</b> · ' + esc(who) +
        '<div class="small muted">' + esc(names.map((n, i) => n + ': ' + (dn[i] || 'Deck')).join(' · ')) + '</div>' +
        '<div class="small muted">' + esc(when) + ' · ' + (r.turns || 0) + ' turns · ' + esc(END[r.end_cause] || '') + ' · ' + esc(CLOCK_LABEL[r.clock] || '') + '</div></div>' +
        (r.log_code ? '<button class="sm" data-on="hrep" data-code="' + esc(r.log_code) + '">Replay</button><button class="sm" data-on="hcopy" data-code="' + esc(r.log_code) + '">Log code</button>' : '') + '</div>';
    });
    el.innerHTML = out; tr();
  }

  /* ---------- laporan bug dari permainan online: lewat server (lampirkan log lengkap server) ---------- */
  function reportContext() {
    const ui = U(), on = !!(ui && ui.online.active()), info = conn.info;
    return { online: on, room: on && info ? info.room : null, seat: on && info ? info.seat : null, token: on && info ? info.token : null, host: !!host() };
  }
  async function sendReport(r) {
    const ctx = reportContext();
    if (ctx.online) {
      return apiFetch('/api/report', { method: 'POST', auth: true, body: JSON.stringify({ room: ctx.room, seat: ctx.seat, token: ctx.token, kind: r.kind, message: r.msg, contact: r.contact, log: r.code, meta: { engine: r.engine, mode: 'online', device: r.view + ' ' + r.screen, lang: r.lang } }) });
    }
    const h = host(); if (!h) return { error: 'offline' };
    const s = await session(); if (!s) return { error: 'login' };
    try {
      const { error } = await h.client().from('sim_feedback').insert({ kind: r.kind, message: r.msg, contact: r.contact || null, log_code: r.code || null, engine: r.engine, mode: r.mode, device: (r.view + ' ' + r.screen + ' ' + r.ua).slice(0, 300), lang: r.lang });
      return error ? { error: error.message } : { ok: true };
    } catch (e) { return { error: String(e.message || e) }; }
  }

  /* ---------- awal ---------- */
  // Link undangan: situs membuka iframe dengan #room=KODE (dibaca sekarang, sebelum menu mengganti hash).
  const HASH0 = location.hash || '';
  function init() {
    const m = /^#room=([A-Z0-9]{6})$/i.exec(HASH0);
    const sv = seatGet();
    if (m) {
      const code = m[1].toUpperCase();
      if (sv && sv.room === code && !sv.over) { if (window.MHRSimModes) window.MHRSimModes.show('online'); back(); return; }
      pendingJoin = code;
      if (window.MHRSimModes) window.MHRSimModes.show('online');
      return;
    }
    // Permainan online yang belum selesai: langsung tersambung lagi (rencana 10e).
    if (sv && !sv.over && Date.now() - (sv.at || 0) < 24 * 3600 * 1000 && host()) back();
  }
  window.MHRSimOnline = { renderPanel, renderHistory, leaveGame, sendReport, reportContext, host, api: API, joinRoom: code => { pendingJoin = code; if (window.MHRSimModes) window.MHRSimModes.show('online'); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
