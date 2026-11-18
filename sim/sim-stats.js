/* ===================================================================
   MHR BATTLE SIM — STATS (sim-stats.js)                    o2.33 · riwayat #112
   ===================================================================
   Permintaan pemilik 18 Nov 2026: tab 📈 Stats supaya pemain bisa menganalisa permainan mereka.
   Keputusan pemilik: HANYA pertandingan online dari Find a match (sim_matches.mode = 'queue') milik akun ini;
   pertandingan offline tetap di My Lab → Performance di situs. Tidak ada tabel atau SQL baru:
     - sim_matches     (RLS: hanya pertandingan sendiri) → hasil, giliran, jalan pertama, cara berakhir, kode log
     - sim_rating_log  (opsional, milik akun)            → perubahan poin ranked per pertandingan
   Dari kode log (MHRSim.parseLog) dibaca daftar deck KEDUA pemain (warna deck lawan, statistik kartu). Statistik kartu
   tidak memutar ulang pertandingan: createGame() dengan seed yang sama memberi pemetaan iid → nomor kartu (juga untuk
   iid acak online), lalu aksi 'call' / 'ccall' / 'attack' / 'acti' / 'deploy' dihitung. Semua dihitung di perangkat pemain.
   Isi tab: filter (periode, deck saya, warna lawan) · ringkasan · deck saya · matchup · cara game berakhir ·
   kartu (deck saya & ancaman lawan) · riwayat dengan filter (Replay / Share / Log code memakai tombol sim-online.js).
   Teks Inggris + Indonesia lewat T() (bahasa aktif; ganti bahasa = panel digambar ulang oleh MHRSimModes.show).
   =================================================================== */
(function () {
  'use strict';
  const S = window.MHRSim;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ID = () => !!(window.MHRSimI18N && window.MHRSimI18N.lang === 'id');
  const T = (en, id) => ID() ? id : en;
  const BASE = window.MHRSIM_BASE || '../';
  const COL = { Merah: ['Red', 'Merah', '#E4442E'], Kuning: ['Yellow', 'Kuning', '#F2B01E'], Biru: ['Blue', 'Biru', '#3B87E8'], Hijau: ['Green', 'Hijau', '#33A45C'], Orange: ['Orange', 'Orange', '#E8821E'], Purple: ['Purple', 'Ungu', '#8B5CF6'] };
  const COL_ORDER = ['Merah', 'Kuning', 'Biru', 'Hijau', 'Orange', 'Purple'];
  const END = { rp: ['9 Rush Points', '9 Rush Point'], deck: ['Deck out', 'Deck habis'], time: ['Time up', 'Waktu habis'], timeouts: ['3 timeouts', '3 kali timeout'], claim: ['Opponent left', 'Lawan keluar'], conceded: ['Conceded', 'Menyerah'], draw: ['Draw', 'Seri'], other: ['Other', 'Lainnya'] };
  const COLS = 'id,p1,p2,names,deck_names,first,winner,end_cause,cause,turns,rp,log_code,ended_at,mode';
  const MIN_N = 3;                         // di bawah ini win rate diberi tanda "sedikit data"

  function host() { try { return window.MHRSimOnline && window.MHRSimOnline.host(); } catch (e) { return null; } }
  async function me() { const h = host(); try { return h ? await h.session() : null; } catch (e) { return null; } }
  function tr() { if (window.MHRSimI18N) window.MHRSimI18N.apply(); }
  if (window.MHRSimI18N && window.MHRSimI18N.add) window.MHRSimI18N.add({ '📈 Stats': '📈 Statistik' });   // label tab di bilah menu

  /* ---------------- data ---------------- */
  const D = { uid: null, games: null, err: null, at: 0, loading: null };
  const F = { per: 'all', deck: '', opp: '', res: '', more: 0 };
  try { const v = JSON.parse(localStorage.getItem('mhrsim.stats.v1') || 'null'); if (v && typeof v === 'object') { if (['all', '7', '30'].includes(v.per)) F.per = v.per; } } catch (e) { /* abaikan */ }
  const saveF = () => { try { localStorage.setItem('mhrsim.stats.v1', JSON.stringify({ per: F.per })); } catch (e) { /* abaikan */ } };

  const colorsOf = list => {
    const n = {}; (list || []).forEach(no => { const c = S.card(no); if (c && COL[c.c]) n[c.c] = (n[c.c] || 0) + 1; });
    return COL_ORDER.filter(k => n[k] >= 4 || (n[k] && Object.keys(n).length === 1));   // warna "percikan" < 4 kartu diabaikan
  };
  const sig = list => (list || []).slice().sort().join(',');
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  /* satu baris sim_matches → objek analisa */
  function digest(r, uid) {
    const seat = r.p1 === uid && r.p2 !== uid ? 0 : r.p2 === uid && r.p1 !== uid ? 1 : null;
    if (seat == null || r.winner == null) return null;
    const res = r.winner < 0 ? 'd' : r.winner === seat ? 'w' : 'l';
    const names = r.names || [], dn = r.deck_names || [];
    let end = r.end_cause || 'other'; if (/ conceded$/.test(r.cause || '')) end = 'conceded';
    const g = { id: r.id, at: r.ended_at, t: Date.parse(r.ended_at) || 0, res, seat, first: r.first == null ? null : r.first === seat, turns: r.turns || 0, end,
      opp: names[1 - seat] || '', myDeckName: dn[seat] || 'Deck', oppDeckName: dn[1 - seat] || '', rp: Array.isArray(r.rp) ? [r.rp[seat] | 0, r.rp[1 - seat] | 0] : null,
      code: r.log_code || '', myList: null, oppList: null, myCols: [], oppCols: [], deckKey: 'n:' + (dn[seat] || 'Deck'), cards: null, delta: null };
    const o = g.code ? S.parseLog(g.code) : null;
    if (o && Array.isArray(o.d) && o.d[seat] && o.d[1 - seat]) {
      g.myList = o.d[seat]; g.oppList = o.d[1 - seat];
      g.myCols = colorsOf(g.myList); g.oppCols = colorsOf(g.oppList);
      g.deckKey = 'd:' + hashStr(sig(g.myList));
      g._o = o;
    }
    return g;
  }
  /* statistik kartu satu pertandingan: tanpa memutar ulang, cukup pemetaan iid → nomor dari createGame (seed sama) */
  function cardsOf(g) {
    if (g.cards !== null) return g.cards;
    g.cards = false;
    const o = g._o; if (!o || o.q || !Array.isArray(o.a)) return false;
    try {
      const st = S.createGame({ decks: o.d, seed: o.s, first: o.f, names: o.n, vanilla: !o.x, siaga: !!o.g, confirm: !!o.k, opaque: !!o.o, toLimit: o.t || 0 });
      const mine = {}, theirs = {};
      const add = (who, no, k) => { const m = who[no] || (who[no] = { call: 0, atk: 0, acti: 0, dep: 0 }); m[k]++; };
      o.a.forEach(a => {
        if (!a || !a.t) return;
        const iid = a.t === 'attack' ? a.a : a.c; const ins = iid != null ? st.inst[iid] : null; if (!ins) return;
        const k = a.t === 'call' || a.t === 'ccall' ? 'call' : a.t === 'attack' ? 'atk' : a.t === 'acti' ? 'acti' : a.t === 'deploy' ? 'dep' : null;   // ccall = COUNTER CALL
        if (!k) return;
        add(ins.owner === g.seat ? mine : theirs, ins.no, k);
      });
      g.cards = { mine, theirs };
    } catch (e) { g.cards = false; }
    return g.cards;
  }

  async function load(force) {
    const s = await me(); const h = host();
    if (!h || !s) { D.uid = null; D.games = null; return; }
    if (!force && D.uid === s.userId && D.games && Date.now() - D.at < 120000) return;
    if (D.loading) return D.loading;
    D.loading = (async () => {
      D.err = null;
      try {
        const c = h.client();
        let q = await c.from('sim_matches').select(COLS).eq('mode', 'queue').order('ended_at', { ascending: false }).limit(300);
        if (q.error) { D.err = q.error; D.games = null; return; }
        const games = (q.data || []).map(r => digest(r, s.userId)).filter(Boolean);
        try {   // perubahan poin ranked (opsional; tabel bisa belum ada / kosong sebelum ranked dibuka)
          const ids = games.map(g => g.id);
          if (ids.length) {
            const rl = await c.from('sim_rating_log').select('match_id,delta,note').eq('user_id', s.userId).in('match_id', ids.slice(0, 300));
            if (!rl.error) { const m = {}; (rl.data || []).forEach(x => { m[x.match_id] = x; }); games.forEach(g => { const x = m[g.id]; if (x) { g.delta = x.delta; g.note = x.note || null; } }); }
          }
        } catch (e) { /* abaikan */ }
        D.uid = s.userId; D.games = games; D.at = Date.now();
      } catch (e) { D.err = e; D.games = null; }
      finally { D.loading = null; }
    })();
    return D.loading;
  }

  /* ---------------- hitungan ---------------- */
  function rec(list) {
    const w = list.filter(g => g.res === 'w').length, l = list.filter(g => g.res === 'l').length, d = list.length - w - l;
    return { n: list.length, w, l, d, wr: list.length ? Math.round(w / list.length * 100) : null };
  }
  const colName = k => COL[k] ? T(COL[k][0], COL[k][1]) : k;
  const colsKey = cols => cols.length ? cols.join('/') : '?';
  const colsLabel = cols => cols.length ? cols.map(colName).join(' / ') : T('Unknown colours', 'Warna tidak diketahui');
  const dots = cols => '<span class="ststdot">' + (cols.length ? cols.map(k => '<i style="background:' + COL[k][2] + '"></i>').join('') : '<i></i>') + '</span>';
  function inPeriod(g) { if (F.per === 'all') return true; return g.t >= Date.now() - (+F.per) * 864e5; }
  function filtered(opt) {
    opt = opt || {};
    return (D.games || []).filter(g => inPeriod(g) && (opt.noDeck || !F.deck || g.deckKey === F.deck) && (opt.noOpp || !F.opp || colsKey(g.oppCols) === F.opp) && (opt.noRes || !F.res || g.res === F.res));
  }
  function decksAll() {
    const m = new Map();
    (D.games || []).filter(inPeriod).forEach(g => {
      let x = m.get(g.deckKey); if (!x) { x = { key: g.deckKey, name: g.myDeckName, cols: g.myCols, games: [], last: 0 }; m.set(g.deckKey, x); }
      x.games.push(g); if (g.t > x.last) { x.last = g.t; x.name = g.myDeckName; }
    });
    return [...m.values()].sort((a, b) => b.games.length - a.games.length || b.last - a.last);
  }

  /* ---------------- tampilan ---------------- */
  const pct = v => v == null ? '–' : v + '%';
  const bar = (wr, n) => '<span class="stbar' + (n < MIN_N ? ' few' : '') + '"><i style="width:' + (wr == null ? 0 : wr) + '%"></i></span>';
  const lab = t => '<em class="stl">' + t + ' </em>';   // label kolom, hanya tampil di HP (judul tabel disembunyikan)
  const wl = r => '<span data-noi18n>' + r.w + '–' + r.l + (r.d ? '–' + r.d : '') + '</span>';
  function img(no) {
    const c = S.card(no), dir = c && c.fan === 2 ? 'images/' : 'images/en/';
    return '<img class="stimg" alt="" loading="lazy" src="' + BASE + dir + no + '.jpg" data-no="' + esc(no) + '" data-i="0" onerror="window.__simImgErr&&window.__simImgErr(this)">';
  }
  const cname = no => { const c = S.card(no); return c ? (c.nm_en || c.nm) : no; };
  function fmtDate(t) { try { const d = new Date(t); return d.toLocaleDateString(ID() ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function head() { return '<div class="hd"><button data-mode="home">← Menu</button><h2>' + T('Stats', 'Statistik') + '</h2></div>'; }
  async function render(el) {
    el = el || $('panelStats'); if (!el) return;
    const h = host();
    if (!h) { el.innerHTML = head() + '<div class="box small muted">' + T('Stats use the Find a match games saved to your mhrdecklab.com account. Open Battle Sim on mhrdecklab.com to see them.', 'Statistik memakai pertandingan Cari lawan yang tersimpan di akun mhrdecklab.com Anda. Buka Battle Sim di mhrdecklab.com untuk melihatnya.') + '</div>'; tr(); return; }
    const s = await me();
    if (!s) { el.innerHTML = head() + '<div class="box"><p><b>' + T('Log in to see your stats.', 'Masuk untuk melihat statistik Anda.') + '</b></p><p class="small muted">' + T('Stats are built from your Find a match games, saved to your mhrdecklab.com account.', 'Statistik dibuat dari pertandingan Cari lawan yang tersimpan di akun mhrdecklab.com Anda.') + '</p><div class="startbar"><button class="pri" data-on="login">' + T('Log in', 'Masuk') + '</button></div></div>'; tr(); return; }
    if (!D.games || D.uid !== s.userId) { el.innerHTML = head() + '<div class="box small muted">' + T('Loading your games…', 'Memuat pertandingan Anda…') + '</div>'; tr(); }
    await load(false);
    if (D.err) { el.innerHTML = head() + '<div class="box small err">' + T('Your games could not be loaded: ', 'Pertandingan Anda tidak bisa dimuat: ') + esc(D.err.message || D.err) + '</div>'; tr(); return; }
    draw(el);
  }

  function draw(el) {
    el = el || $('panelStats'); if (!el || !D.games) return;
    const all = D.games;
    let o = head();
    o += '<p class="small muted"><span class="badge">' + T('FIND A MATCH · ONLINE', 'CARI LAWAN · ONLINE') + '</span> ' +
      T('Your Find a match games on this account. Private rooms and offline games are not counted here (offline games are in My Lab → Performance on mhrdecklab.com).',
        'Pertandingan Cari lawan di akun ini. Room privat dan pertandingan offline tidak dihitung di sini (pertandingan offline ada di My Lab → Performance di mhrdecklab.com).') + '</p>';
    if (!all.length) {
      el.innerHTML = o + '<div class="box"><p><b>' + T('No Find a match games yet.', 'Belum ada pertandingan Cari lawan.') + '</b></p><p class="small muted">' + T('Play a few games in Find a match and your deck stats, matchups, card stats and match history appear here.', 'Mainkan beberapa pertandingan di Cari lawan, lalu statistik deck, matchup, statistik kartu, dan riwayat pertandingan Anda muncul di sini.') + '</p><div class="startbar"><button class="pri" data-mode="find">⚔️ ' + T('Find a match', 'Cari lawan') + '</button></div></div>';
      tr(); return;
    }
    const decks = decksAll();
    if (F.deck && !decks.some(d => d.key === F.deck)) F.deck = '';
    const oppSet = [...new Set(filtered({ noOpp: true, noRes: true }).map(g => colsKey(g.oppCols)))];
    if (F.opp && !oppSet.includes(F.opp)) F.opp = '';
    // filter
    o += '<div class="stfil">' +
      '<label><span>' + T('Period', 'Periode') + '</span><select data-stf="per">' + [['all', T('All time', 'Semua')], ['30', T('Last 30 days', '30 hari terakhir')], ['7', T('Last 7 days', '7 hari terakhir')]].map(([v, l]) => '<option value="' + v + '"' + (F.per === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      '<label><span>' + T('My deck', 'Deck saya') + '</span><select data-stf="deck" data-noi18n><option value="">' + T('All decks', 'Semua deck') + '</option>' + decks.map(d => '<option value="' + esc(d.key) + '"' + (F.deck === d.key ? ' selected' : '') + '>' + esc(d.name) + ' (' + d.games.length + ')</option>').join('') + '</select></label>' +
      '<label><span>' + T('Opponent colours', 'Warna lawan') + '</span><select data-stf="opp" data-noi18n><option value="">' + T('All', 'Semua') + '</option>' + oppSet.map(k => '<option value="' + esc(k) + '"' + (F.opp === k ? ' selected' : '') + '>' + esc(colsLabel(k === '?' ? [] : k.split('/'))) + '</option>').join('') + '</select></label>' +
      ((F.deck || F.opp || F.per !== 'all') ? '<button class="sm" data-st="clear">' + T('Clear filters', 'Hapus filter') + '</button>' : '') + '</div>';
    const list = filtered({ noRes: true });
    if (!list.length) { el.innerHTML = o + '<div class="box small muted">' + T('No games match these filters.', 'Tidak ada pertandingan yang cocok dengan filter ini.') + '</div>'; tr(); return; }
    const r = rec(list);
    const f1 = rec(list.filter(g => g.first === true)), f2 = rec(list.filter(g => g.first === false));
    const avgT = Math.round(list.reduce((a, g) => a + g.turns, 0) / list.length * 10) / 10;
    const last = list.slice(0, 10);
    let streak = 0, sk = list[0] ? list[0].res : null; for (const g of list) { if (g.res === sk && sk !== 'd') streak++; else break; }
    const pts = list.filter(g => g.delta != null).reduce((a, g) => a + g.delta, 0), hasPts = list.some(g => g.delta != null);
    // ringkasan
    o += '<div class="stsum">' +
      '<div class="stk"><span>' + T('Games', 'Pertandingan') + '</span><b data-noi18n>' + r.n + '</b><small>' + wl(r) + ' · ' + T('W–L', 'M–K') + (r.d ? T('–D', '–S') : '') + '</small></div>' +
      '<div class="stk"><span>' + T('Win rate', 'Win rate') + '</span><b data-noi18n>' + pct(r.wr) + '</b>' + bar(r.wr, r.n) + '</div>' +
      '<div class="stk"><span>' + T('Going first', 'Jalan pertama') + '</span><b data-noi18n>' + pct(f1.wr) + '</b><small>' + f1.n + ' ' + T('games', 'game') + '</small></div>' +
      '<div class="stk"><span>' + T('Going second', 'Jalan kedua') + '</span><b data-noi18n>' + pct(f2.wr) + '</b><small>' + f2.n + ' ' + T('games', 'game') + '</small></div>' +
      '<div class="stk"><span>' + T('Average length', 'Rata-rata durasi') + '</span><b data-noi18n>' + avgT + '</b><small>' + T('turns', 'giliran') + '</small></div>' +
      (hasPts ? '<div class="stk"><span>' + T('Ranked points', 'Poin ranked') + '</span><b data-noi18n class="' + (pts > 0 ? 'up' : pts < 0 ? 'down' : '') + '">' + (pts > 0 ? '+' : '') + pts + '</b><small>' + T('in these games', 'dari game ini') + '</small></div>' : '') +
      '</div>' +
      '<div class="stform"><span class="small muted">' + T('Last ', 'Terakhir ') + last.length + ':</span>' + last.slice().reverse().map(g => '<i class="' + g.res + '" title="' + esc(g.opp) + '">' + (g.res === 'w' ? T('W', 'M') : g.res === 'l' ? T('L', 'K') : T('D', 'S')) + '</i>').join('') +
      (streak > 1 ? '<span class="small ' + (sk === 'w' ? 'hot' : 'cold') + '">' + (sk === 'w' ? '🔥 ' + T(streak + ' wins in a row', streak + ' kali menang beruntun') : T(streak + ' losses in a row', streak + ' kali kalah beruntun')) + '</span>' : '') + '</div>';
    if (r.n < 10) o += '<p class="small muted">' + T('Few games so far: percentages will become more reliable after 10–20 games.', 'Pertandingan masih sedikit: persentase akan lebih bisa diandalkan setelah 10–20 game.') + '</p>';

    // deck saya
    const dl = decksAll().map(d => ({ d, g: d.games.filter(g => (!F.opp || colsKey(g.oppCols) === F.opp)) })).filter(x => x.g.length);
    o += sec(T('My decks', 'Deck saya'), T('Tap a deck to filter everything below.', 'Ketuk deck untuk memfilter semua di bawah.'),
      '<div class="sttbl"><div class="sth"><span>' + T('Deck', 'Deck') + '</span><span>' + T('Games', 'Game') + '</span><span>' + T('W–L', 'M–K') + '</span><span>' + T('Win rate', 'Win rate') + '</span><span>' + T('1st / 2nd', 'Ke-1 / Ke-2') + '</span><span>' + T('Turns', 'Giliran') + '</span></div>' +
      dl.map(({ d, g }) => {
        const x = rec(g), a = rec(g.filter(z => z.first === true)), b = rec(g.filter(z => z.first === false));
        return '<button class="str' + (F.deck === d.key ? ' on' : '') + '" data-st="deck" data-k="' + esc(d.key) + '"><span class="stn">' + dots(d.cols) + '<b data-noi18n>' + esc(d.name) + '</b></span><span data-noi18n>' + x.n + '</span><span>' + lab(T('W–L', 'M–K')) + wl(x) + '</span><span class="stwr">' + bar(x.wr, x.n) + '<b data-noi18n>' + pct(x.wr) + '</b></span><span>' + lab(T('1st / 2nd', 'Ke-1 / Ke-2')) + '<span data-noi18n>' + pct(a.wr) + ' / ' + pct(b.wr) + '</span></span><span data-noi18n>' + Math.round(g.reduce((s2, z) => s2 + z.turns, 0) / g.length) + '</span></button>';
      }).join('') + '</div>');

    // matchup
    const mm = new Map(); list.forEach(g => { const k = colsKey(g.oppCols); (mm.get(k) || mm.set(k, []).get(k)).push(g); });
    const mrows = [...mm.entries()].map(([k, g]) => ({ k, cols: k === '?' ? [] : k.split('/'), r: rec(g), names: [...new Set(g.map(z => z.oppDeckName).filter(Boolean))].slice(0, 3) })).sort((a, b) => b.r.n - a.r.n);
    const best = mrows.filter(m => m.r.n >= MIN_N).sort((a, b) => b.r.wr - a.r.wr);
    o += sec(T('Matchups', 'Matchup'), T('Your record against each opponent colour combination (read from the game logs).', 'Rekor Anda melawan tiap kombinasi warna lawan (dibaca dari log pertandingan).'),
      (best.length >= 2 ? '<div class="stnote small">' + T('Best: ', 'Terbaik: ') + '<b>' + esc(colsLabel(best[0].cols)) + '</b> ' + pct(best[0].r.wr) + ' · ' + T('Hardest: ', 'Tersulit: ') + '<b>' + esc(colsLabel(best[best.length - 1].cols)) + '</b> ' + pct(best[best.length - 1].r.wr) + '</div>' : '') +
      '<div class="stmu">' + mrows.map(m => '<button class="stm' + (F.opp === m.k ? ' on' : '') + '" data-st="opp" data-k="' + esc(m.k) + '"><span class="stn">' + dots(m.cols) + '<b>' + esc(colsLabel(m.cols)) + '</b></span>' +
        '<span class="stwr">' + bar(m.r.wr, m.r.n) + '<b data-noi18n>' + pct(m.r.wr) + '</b></span><span class="small muted">' + wl(m.r) + ' · ' + m.r.n + ' ' + T('games', 'game') + (m.names.length ? ' · <span data-noi18n>' + esc(m.names.join(', ')) + '</span>' : '') + '</span></button>').join('') + '</div>');

    // cara berakhir
    const ends = res => { const m = {}; list.filter(g => g.res === res).forEach(g => { m[g.end] = (m[g.end] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const endRow = (res, lbl) => { const e = ends(res), n = e.reduce((a, x) => a + x[1], 0); return '<div class="stend"><b>' + lbl + '</b>' + (n ? e.map(([k, v]) => '<span class="badge">' + esc(T((END[k] || END.other)[0], (END[k] || END.other)[1])) + ' <b data-noi18n>' + v + '</b></span>').join('') : '<span class="small muted">–</span>') + '</div>'; };
    o += sec(T('How your games end', 'Cara pertandingan berakhir'), '', endRow('w', T('Wins', 'Menang')) + endRow('l', T('Losses', 'Kalah')));

    // kartu
    o += sec(T('Cards', 'Kartu'), F.deck ? T('Your cards in this deck, from the game logs. "Win rate when called" compares games where you called the card at least once with games where you did not.', 'Kartu Anda di deck ini, dari log pertandingan. "Win rate saat dipanggil" membandingkan game saat kartu itu dipanggil minimal sekali dengan game saat tidak dipanggil.')
      : T('Pick one deck above for the most useful card stats. Opponent threats: the cards opponents called most in games you lost.', 'Pilih satu deck di atas agar statistik kartu paling berguna. Ancaman lawan: kartu yang paling sering dipanggil lawan di game yang Anda kalah.'),
      '<div id="stCards"><div class="small muted">' + T('Counting…', 'Menghitung…') + '</div></div>');

    // riwayat
    const hl = filtered();
    const show = hl.slice(0, 20 + F.more);
    o += sec(T('Match history', 'Riwayat pertandingan'), '',
      '<div class="seg stres">' + [['', T('All', 'Semua')], ['w', T('Wins', 'Menang')], ['l', T('Losses', 'Kalah')]].map(([v, l]) => '<button data-st="res" data-k="' + v + '"' + (F.res === v ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      show.map(g => {
        const resTxt = g.res === 'w' ? T('WIN', 'MENANG') : g.res === 'l' ? T('LOSS', 'KALAH') : T('DRAW', 'SERI');
        return '<div class="hrow"><span class="res ' + g.res + '">' + resTxt + '</span><div class="tx"><b>vs <span data-noi18n>' + esc(g.opp) + '</span></b> ' + dots(g.oppCols) +
          (g.delta != null ? ' <span class="stpts ' + (g.delta > 0 ? 'up' : g.delta < 0 ? 'down' : '') + '" data-noi18n>' + (g.delta > 0 ? '+' : g.delta === 0 ? '±' : '') + g.delta + '</span>' : '') +
          '<div class="small muted"><span data-noi18n>' + esc(g.myDeckName) + '</span> ' + dots(g.myCols) + ' → <span data-noi18n>' + esc(g.oppDeckName || colsLabel(g.oppCols)) + '</span></div>' +
          '<div class="small muted"><span data-noi18n>' + esc(fmtDate(g.t)) + '</span> · ' + g.turns + ' ' + T('turns', 'giliran') + ' · ' + esc(T((END[g.end] || END.other)[0], (END[g.end] || END.other)[1])) + (g.first != null ? ' · ' + (g.first ? T('went first', 'jalan pertama') : T('went second', 'jalan kedua')) : '') + (g.rp ? ' · RP <span data-noi18n>' + g.rp[0] + '–' + g.rp[1] + '</span>' : '') + '</div></div>' +
          (g.code ? '<button class="sm" data-on="hrep" data-code="' + esc(g.code) + '">Replay</button><button class="sm" data-on="hshare" data-code="' + esc(g.code) + '">Share</button>' : '') + '</div>';
      }).join('') +
      (hl.length > show.length ? '<div class="startbar" style="justify-content:center"><button data-st="more">' + T('Show more', 'Tampilkan lagi') + ' (' + (hl.length - show.length) + ')</button></div>' : '') +
      (!hl.length ? '<div class="box small muted">' + T('No games match these filters.', 'Tidak ada pertandingan yang cocok dengan filter ini.') + '</div>' : ''));
    o += '<p class="small muted" style="margin:14px 2px 0">' + T('Up to your last 300 Find a match games. Opponent decks are read from the game log after the game; they are never shown during a game.', 'Sampai 300 pertandingan Cari lawan terakhir. Deck lawan dibaca dari log setelah pertandingan selesai; tidak pernah ditampilkan selama pertandingan.') + '</p>';
    el.innerHTML = o; tr();
    drawCards(list);
  }
  function sec(title, sub, body) { return '<section class="stsec"><div class="rkh"><b>' + title + '</b></div>' + (sub ? '<p class="small muted" style="margin:-4px 2px 8px">' + sub + '</p>' : '') + body + '</section>'; }

  /* statistik kartu dihitung bertahap supaya layar tidak tersendat (300 game) */
  let cardJob = 0;
  function drawCards(list) {
    const job = ++cardJob, box = $('stCards'); if (!box) return;
    let i = 0;
    const step = () => {
      if (job !== cardJob) return;
      const t0 = Date.now();
      while (i < list.length && Date.now() - t0 < 25) cardsOf(list[i++]);
      if (i < list.length) { setTimeout(step, 0); return; }
      const b = $('stCards'); if (!b || job !== cardJob) return;
      b.innerHTML = cardsHTML(list); tr();
    };
    step();
  }
  function cardsHTML(list) {
    const ok = list.filter(g => g.cards);
    if (!ok.length) return '<div class="small muted">' + T('No card data in these games.', 'Tidak ada data kartu di game ini.') + '</div>';
    let h = '';
    if (F.deck) {
      const n = ok.length, inDeck = {}, m = {};
      ok.forEach(g => {
        new Set(g.myList || []).forEach(no => { inDeck[no] = (inDeck[no] || 0) + 1; });
        Object.entries(g.cards.mine).forEach(([no, s]) => { const x = m[no] || (m[no] = { no, games: 0, call: 0, atk: 0, acti: 0, wCalled: 0, nCalled: 0 }); x.call += s.call; x.atk += s.atk; x.acti += s.acti; if (s.call) { x.nCalled++; if (g.res === 'w') x.wCalled++; } });
      });
      const rows = Object.values(m).filter(x => x.nCalled).sort((a, b) => b.nCalled - a.nCalled || b.call - a.call);
      const totW = ok.filter(g => g.res === 'w').length;
      h += '<div class="sttbl stc"><div class="sth"><span>' + T('Card', 'Kartu') + '</span><span>' + T('Called in', 'Dipanggil di') + '</span><span>' + T('Calls', 'Panggilan') + '</span><span>' + T('Attacks', 'Serangan') + '</span><span>' + T('Win rate when called', 'Win rate saat dipanggil') + '</span><span>' + T('…when not', '…saat tidak') + '</span></div>' +
        rows.slice(0, 25).map(x => {
          const wr = Math.round(x.wCalled / x.nCalled * 100), nn = n - x.nCalled, wn = totW - x.wCalled, wr2 = nn ? Math.round(wn / nn * 100) : null;
          const diff = wr2 == null ? 0 : wr - wr2;
          return '<div class="str"><span class="stn">' + img(x.no) + '<span><b data-noi18n>' + esc(cname(x.no)) + '</b><small data-noi18n>' + esc(x.no) + '</small></span></span><span>' + lab(T('Called in', 'Dipanggil di')) + '<span data-noi18n>' + x.nCalled + '/' + n + '</span></span><span>' + lab(T('Calls', 'Panggilan')) + '<span data-noi18n>' + x.call + '</span></span><span>' + lab(T('Attacks', 'Serangan')) + '<span data-noi18n>' + x.atk + '</span></span>' +
            '<span class="stwr">' + lab(T('Called', 'Dipanggil')) + bar(wr, x.nCalled) + '<b data-noi18n class="' + (x.nCalled >= MIN_N && nn >= MIN_N ? (diff >= 15 ? 'up' : diff <= -15 ? 'down' : '') : '') + '">' + wr + '%</b></span><span>' + lab(T('Not called', 'Tidak dipanggil')) + '<span data-noi18n>' + pct(wr2) + (nn && nn < MIN_N ? ' <small class="muted">(' + nn + ')</small>' : '') + '</span></span></div>';
        }).join('') + '</div>' +
        '<p class="small muted" style="margin:6px 2px 0">' + T('Green / red: at least 15 points better / worse than when the card was not called (3+ games each). Cards never called are not listed.', 'Hijau / merah: minimal 15 poin lebih baik / lebih buruk dibanding saat kartu tidak dipanggil (masing-masing 3+ game). Kartu yang tidak pernah dipanggil tidak ditampilkan.') + '</p>';
    } else {
      // tanpa deck dipilih: kartu yang paling sering Anda panggil (semua deck)
      const m = {};
      ok.forEach(g => Object.entries(g.cards.mine).forEach(([no, s]) => { if (!s.call) return; const x = m[no] || (m[no] = { no, n: 0, w: 0, call: 0 }); x.n++; x.call += s.call; if (g.res === 'w') x.w++; }));
      const rows = Object.values(m).sort((a, b) => b.n - a.n || b.call - a.call).slice(0, 10);
      h += '<div class="stsub">' + T('Your most-called cards', 'Kartu yang paling sering Anda panggil') + '</div><div class="stcards">' + rows.map(x => cardTile(x.no, x.n + ' ' + T('games', 'game'), Math.round(x.w / x.n * 100) + '% ' + T('win', 'menang'))).join('') + '</div>';
    }
    // ancaman lawan (game yang kalah)
    const lost = ok.filter(g => g.res === 'l');
    if (lost.length) {
      const m = {};
      lost.forEach(g => Object.entries(g.cards.theirs).forEach(([no, s]) => { if (!s.call && !s.atk) return; const x = m[no] || (m[no] = { no, n: 0, call: 0, atk: 0 }); x.n++; x.call += s.call; x.atk += s.atk; }));
      const rows = Object.values(m).sort((a, b) => b.n - a.n || b.atk - a.atk).slice(0, 10);
      h += '<div class="stsub">' + T('Opponent threats in your losses', 'Ancaman lawan saat Anda kalah') + ' <span class="small muted">(' + lost.length + ' ' + T('losses', 'kekalahan') + ')</span></div><div class="stcards">' +
        rows.map(x => cardTile(x.no, T('in ', 'di ') + x.n + ' ' + T('losses', 'kekalahan'), x.atk + ' ' + T('attacks', 'serangan'))).join('') + '</div>';
    }
    return h;
  }
  const cardTile = (no, a, b) => '<div class="stct">' + img(no) + '<b data-noi18n>' + esc(cname(no)) + '</b><small>' + a + '</small><small>' + b + '</small></div>';

  /* ---------------- interaksi ---------------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-st]'); if (!t || !t.closest('#panelStats')) return;
    const k = t.dataset.k;
    switch (t.dataset.st) {
      case 'deck': F.deck = F.deck === k ? '' : k; break;
      case 'opp': F.opp = F.opp === k ? '' : k; break;
      case 'res': F.res = k || ''; break;
      case 'more': F.more += 20; break;
      case 'clear': F.deck = ''; F.opp = ''; F.per = 'all'; F.res = ''; saveF(); break;
      default: return;
    }
    if (t.dataset.st !== 'more') F.more = 0;
    draw();
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('#panelStats [data-stf]'); if (!s) return;
    F[s.dataset.stf] = s.value; F.more = 0; if (s.dataset.stf === 'per') saveF();
    draw();
  });

  window.MHRSimStats = { render, reload: () => { D.at = 0; }, _digest: digest, _cards: cardsOf, _state: () => D };
})();
