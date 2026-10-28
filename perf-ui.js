/* ===================================================================
   MHR DECK LAB — perf-ui.js (v7.13, Performance Analytics Tahap 1; v7.14 Tahap 2)
   ===================================================================
   Tampilan tab "📈 Performance" di My Dashboard (#perfWrap):
     • Catat match (Bo1/Bo3): deck sendiri, deck lawan (daftar kurasi admin
       atau "Other" + warna), casual / store / tournament, hasil per game,
       siapa jalan duluan (1st/2nd) per game, cara game berakhir, nama lawan
       (pribadi), catatan, tanggal.
     • Statistik (dihitung di browser, data per akun kecil): jumlah match,
       win rate match & game, win rate jalan 1st vs 2nd, streak, insight,
       per deck, tabel matchup, cara game berakhir, match terakhir (edit/hapus),
       export CSV.
     • Admin: kelola daftar archetype (match_archetypes).
   Servis data: perf.js (window.MHRPerf). Skema: mhr_decklab_v713_performance.sql.
   Global index.html (DB, artFile, imgFallback, escHtml, mxOpen, mxClose,
   isAccountAdmin, decodeDeck, deckStats, previewCards, CMAP, CORDER, t) baru
   dipakai SAAT JALAN, jadi berkas ini aman dimuat sebelum skrip inline utama.
   Keputusan pemilik (27 Okt 2026): daftar archetype kurasi admin + "Other";
   Tahap 1 = inti (log + statistik); Tournament runs, import Events, share
   gambar & grafik tren = Tahap 2; data komunitas opt-in & anonim = Tahap 3.
   v7.14 (Tahap 2): Tournament runs (match_runs: nama, tanggal, tempat, pemain, Bo,
   deck, placement, bye; ronde = match_logs dengan run_id/round_no/is_top), import
   hasil dari Events (event_players milik akun ini; giliran & cara berakhir tidak
   diketahui → f:null / e:'unk'), share run sebagai gambar Story 9:16 / Post 4:5
   (canvas, pola sama dengan binders-ui.js v7.07), grafik tren win rate (rata-rata
   10 match terakhir), detail matchup (klik baris tabel Matchups).
   v7.15 (Tahap 3): data matchup komunitas OPT-IN & ANONIM (kartu "🌐 Community matchups":
   matriks win rate antar jenis deck, meta share, win rate jalan duluan — angka gabungan dari
   RPC mhr_community_meta, sel baru tampil kalau >= 20 game dari >= 3 akun); jenis deck sendiri
   (my_archetype) ditentukan otomatis dari isi deck (classifyDeck); detail deck + statistik per
   VERSI deck (isi deck yang dicatat per match, label dari riwayat versi deck v6.97).
   =================================================================== */
(function(){
  'use strict';
  const API = () => window.MHRPerf;
  const q1 = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COLS6 = ['Merah','Kuning','Biru','Hijau','Orange','Purple'];
  const colName = c => (typeof t === 'function' ? t(c) : c);
  const CTX = {
    casual:     { icon:'🎲', label:'Casual',              short:'Casual' },
    store:      { icon:'🏪', label:'Store / Weekly Rush', short:'Store' },
    tournament: { icon:'🏆', label:'Tournament',          short:'Tour.' },
  };
  const END = { rp:'9 Rush Points', eff:'Card effect', deck:'Deck out', con:'Concede', time:'Time', unk:'Not recorded' };
  const END_COL = { rp:'#3987e5', eff:'#d95926', deck:'#199e70', con:'#c98500', time:'#6b7684', unk:'#3a4350' };
  const PLACES = ['1st','2nd','3rd','4th','Top 4','Top 8','Top 16','Top 32','Swiss only','Dropped'];
  const LAST_KEY = 'mhr_perf_last', FILT_KEY = 'mhr_perf_filter';
  const MIN_N = 5;          // matchup dengan < 5 match dianggap belum bisa dipercaya
  const RECENT = 10;
  const ERR = {
    NOT_LOGGED_IN:'Please log in first.', BAD_GAMES:'Please fill in the result of every game.',
    BAD_DATE:'Please pick a date that isn\'t in the future.', '42501':'You have reached the limit (5,000 matches / 500 runs).',
    '23505':'This event has already been imported.',
  };
  const errMsg = e => e ? (e.missing ? 'Performance isn\'t switched on yet on this site.' : (ERR[e.code] || ERR[e.message] || ('Something went wrong: ' + (e.message || e.code || 'error')))) : '';

  const S = { uid:null, logs:null, arch:null, decks:null, err:null, sort:'n', all:false, runs:null, runsOff:false, entries:null, runsAll:false,
    share:null, comm:null, commOff:false, backfilled:false, commF:{ days:'90', scope:'all' },
    f:{ deck:'', per:'90', ctx:'' } };
  try{ const f = JSON.parse(localStorage.getItem(FILT_KEY) || 'null'); if(f && typeof f === 'object') S.f = { ...S.f, per:f.per || '90', ctx:f.ctx || '' }; }catch(e){}
  try{ const c = JSON.parse(localStorage.getItem('mhr_perf_comm') || 'null'); if(c && typeof c === 'object') S.commF = { days: ['30','90','0'].includes(c.days) ? c.days : '90', scope: c.scope === 'competitive' ? 'competitive' : 'all' }; }catch(e){}
  const saveFilt = () => { try{ localStorage.setItem(FILT_KEY, JSON.stringify({ per:S.f.per, ctx:S.f.ctx })); }catch(e){} };
  const lastPrefs = () => { try{ return JSON.parse(localStorage.getItem(LAST_KEY) || '{}') || {}; }catch(e){ return {}; } };
  const saveLast = o => { try{ localStorage.setItem(LAST_KEY, JSON.stringify(o)); }catch(e){} };

  /* ---------- helper data ---------- */
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDate = iso => { if(!iso) return ''; const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  const pv = v => v == null ? '–' : v + '%';
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const rec = s => `${s.W}-${s.L}${s.D ? '-' + s.D : ''}`;
  const dots = cols => `<span class="pf-dots">${(cols||[]).map(c=>`<i style="background:${CMAP[c] || '#666'}" title="${E(colName(c))}"></i>`).join('')}</span>`;
  const colsText = cols => (cols||[]).map(colName).join(' / ');
  function deckInfo(code){
    const r = code ? decodeDeck(code) : null; const deck = (r && r.deck) || {};
    const st = deckStats(deck); const cover = previewCards(deck, 1)[0] || null;
    return { cols:st.warna, cover: cover ? cover.no : '', tot:st.tot };
  }
  const thumb = (no, cls) => no ? `<img class="${cls||'pf-th'}" alt="" loading="lazy" data-ext="0" src="${artFile(no)}" onerror="imgFallback(this,'${E(no)}')">` : `<span class="${cls||'pf-th'} pf-th-x">?</span>`;
  const archById = id => (S.arch || []).find(a=>a.id === id) || null;
  /* kunci & tampilan deck sendiri / deck lawan */
  const myKey = l => l.deck_id || ('n:' + (l.deck_name || '').toLowerCase());
  function myDeck(l){
    const d = l.deck_id && (S.decks || []).find(x=>x.id === l.deck_id);
    if(d) return { name:d.name, cols:d.cols, cover:d.cover };
    const i = deckInfo(l.deck_code); return { name:l.deck_name || 'Unnamed deck', cols:i.cols, cover:i.cover };
  }
  const oppKey = l => l.opp_archetype || ('x:' + [...(l.opp_colors||[])].sort((a,b)=>CORDER[a]-CORDER[b]).join('/') + ':' + (l.opp_label||'').toLowerCase());
  function oppDeck(l){
    const a = l.opp_archetype && archById(l.opp_archetype);
    if(a) return { name:a.name, cols:a.colors || [], cover:a.key_card || '', other:false };
    return { name:l.opp_label || (l.opp_colors && l.opp_colors.length ? colsText(l.opp_colors) + ' (other)' : 'Other deck'), cols:l.opp_colors || [], cover:'', other:true };
  }

  /* ---------- statistik ---------- */
  function stats(list){
    const s = { n:list.length, W:0, L:0, D:0, gW:0, gN:0, fW:0, fN:0, sW:0, sN:0 };
    list.forEach(m=>{
      s[m.result] = (s[m.result] || 0) + 1;
      (m.games || []).forEach(g=>{ s.gN++; if(g.r === 'W') s.gW++; if(g.f === true){ s.fN++; if(g.r === 'W') s.fW++; } else if(g.f === false){ s.sN++; if(g.r === 'W') s.sW++; } });
    });
    s.wr = pct(s.W, s.n); s.gwr = pct(s.gW, s.gN); s.fwr = pct(s.fW, s.fN); s.swr = pct(s.sW, s.sN);
    return s;
  }
  const chrono = list => list.slice().sort((a,b)=> a.played_on < b.played_on ? -1 : a.played_on > b.played_on ? 1 : (a.created_at < b.created_at ? -1 : 1));
  function streak(list){
    const c = chrono(list); if(!c.length) return '–';
    const r = c[c.length-1].result; let n = 0;
    for(let i = c.length - 1; i >= 0 && c[i].result === r; i--) n++;
    return r + n;
  }
  function filtered(){
    const lim = S.f.per === 'all' ? null : (()=>{ const d = new Date(); d.setDate(d.getDate() - (+S.f.per)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })();
    return (S.logs || []).filter(l=>{
      if(S.f.deck && myKey(l) !== S.f.deck) return false;
      if(S.f.ctx && l.context !== S.f.ctx) return false;
      if(lim && l.played_on < lim) return false;
      return true;
    });
  }
  function groupBy(list, keyFn){ const m = new Map(); list.forEach(l=>{ const k = keyFn(l); if(!m.has(k)) m.set(k, []); m.get(k).push(l); }); return m; }

  /* ---------- data ---------- */
  async function ensureUser(){
    const ss = (window.MHRAuth && window.MHRAuth.ready) ? await window.MHRAuth.getSession() : null;
    const u = (ss && ss.user) ? ss.user.id : null;
    if(u !== S.uid){ S.uid = u; S.logs = null; S.decks = null; S.err = null; S.f.deck = ''; S.all = false; S.runs = null; S.entries = null; S.share = null; S.comm = null; S.backfilled = false; }
    return u;
  }
  async function loadDecks(){
    if(!window.MHRDecks || !window.MHRDecks.ready){ S.decks = []; return; }
    const { data, error } = await window.MHRDecks.listMine();
    S.decks = error ? (S.decks || []) : (data || []).map(r=>({ id:r.id, name:r.name, code:r.deck_code || '', ...deckInfo(r.deck_code) }));
  }
  async function refresh(){
    await ensureUser();
    if(!API() || !API().ready) return;
    const [l, a, r, en, st] = await Promise.all([API().listMine(), API().archetypes(), API().listRuns ? API().listRuns() : { data:[], error:{ missing:true } }, API().myEventEntries ? API().myEventEntries() : { data:[] },
      API().settings ? API().settings() : { data:null, error:{ missing:true } }, loadDecks()]);
    S.logs = l.error ? (S.logs || []) : l.data; S.err = l.error || a.error || null;
    if(!a.error) S.arch = a.data;
    /* migrasi v7.14 belum dijalankan → fitur run disembunyikan, Tahap 1 tetap jalan */
    S.runsOff = !!(API().runsMissing || (r.error && r.error.missing));
    S.runs = r.error ? (S.runs || []) : r.data;
    S.entries = en.error ? (S.entries || []) : (en.data || []);
    /* migrasi v7.15 belum dijalankan → kartu komunitas disembunyikan */
    S.commOff = !!((st.error && st.error.missing) || API().myArchMissing);
    if(!st.error && st.data) S.share = !!st.data.share_community;
    updateTile();
    if(S.share) backfillMyArch().catch(()=>{});
  }
  function updateTile(){
    const v = q1('#dtPerfV'), s = q1('#dtPerfS'); if(!S.logs) return;
    const st = stats(S.logs);
    if(v) v.textContent = st.n ? st.wr + '%' : '–';
    if(s) s.textContent = st.n ? `win rate · ${st.n} match${st.n === 1 ? '' : 'es'}` : 'log your first match';
  }

  /* =================== TAB DASHBOARD =================== */
  async function renderTab(){
    const w = q1('#perfWrap'); if(!w) return;
    if(!API() || !API().ready){ w.innerHTML = '<p class="auth-note">Performance needs an account connection. Please reload the page.</p>'; return; }
    const before = S.uid; await ensureUser();
    if(!S.logs || before !== S.uid){ w.innerHTML = '<p class="auth-note">Loading your matches…</p>'; await refresh(); }
    render();
  }
  function render(){
    const w = q1('#perfWrap'); if(!w) return;
    if(S.err && S.err.missing){ w.innerHTML = `<p class="auth-note">${E(errMsg(S.err))}</p>`; return; }
    const logs = S.logs || [];
    if(!logs.length){
      w.innerHTML = `<div class="pf-empty"><h3>📈 Track how your decks really perform</h3>
        <p>Log each match you play, from casual games with friends to big tournaments: your deck, your opponent's deck, who went first and how each game ended.
        MHR Deck Lab turns it into your win rate, your best and worst matchups, and whether you do better going first or second.</p>
        <div class="bd-btns" style="justify-content:center"><button type="button" class="btn2 main" data-pfact="log">＋ Log your first match</button>
          ${S.runsOff ? '' : '<button type="button" class="btn2" data-pfact="newrun">🏆 Log a tournament run</button>'}</div>
        <p class="bd-mut">Your matches are private. Only you can see them.</p></div>${importBanner()}${communityShell()}${adminHTML()}`;
      wireAdmin(); loadCommunity(); return;
    }
    const list = filtered(); const s = stats(list);
    /* pilihan deck untuk filter: deck yang pernah dicatat */
    const dk = [...groupBy(logs, myKey).entries()].map(([k, l])=>({ k, d:myDeck(l[0]), n:l.length })).sort((a,b)=>b.n - a.n);
    if(S.f.deck && !dk.some(x=>x.k === S.f.deck)) S.f.deck = '';
    w.innerHTML = `
      <div class="pf-tool">
        <select id="pfDeck" aria-label="Deck"><option value="">All my decks</option>${dk.map(x=>`<option value="${E(x.k)}" ${S.f.deck === x.k ? 'selected' : ''}>${E(x.d.name)}</option>`).join('')}</select>
        <select id="pfPer" aria-label="Period">${[['30','Last 30 days'],['90','Last 90 days'],['all','All time']].map(([v,t])=>`<option value="${v}" ${S.f.per === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <div class="pf-chips">${[['', 'All']].concat(Object.entries(CTX).map(([k,c])=>[k, c.icon + ' ' + c.label])).map(([k,t])=>`<button type="button" class="dk-chip" data-pfctx="${k}" aria-pressed="${S.f.ctx === k}">${E(t)}</button>`).join('')}</div>
        <span class="bd-sp"></span>
        <button type="button" class="btn2" data-pfact="csv" title="Download the matches in this filter as a CSV file">⬇ CSV</button>
        ${S.runsOff ? '' : '<button type="button" class="btn2" data-pfact="newrun" title="A tournament or store event with several rounds">🏆 New run</button>'}
        <button type="button" class="btn2 main" data-pfact="log">＋ Log match</button>
      </div>
      ${importBanner()}
      ${list.length ? statsHTML(list, s) : '<div class="pf-card"><p class="bd-mut">No matches in this filter yet.</p></div>'}
      ${runsHTML()}
      ${communityShell()}
      ${recentHTML(list)}
      ${adminHTML()}`;
    wireAdmin(); wireTrend(list); loadCommunity();
  }
  function statsHTML(list, s){
    return `<div class="pf-kpis">
        <div class="pf-kpi"><span class="k">Matches</span><b>${s.n}</b><small><b>${s.W}</b> W · <b>${s.L}</b> L · <b>${s.D}</b> D</small></div>
        <div class="pf-kpi"><span class="k">Match win rate</span><b>${pv(s.wr)}</b><small>wins ÷ matches</small></div>
        <div class="pf-kpi"><span class="k">Game win rate</span><b>${pv(s.gwr)}</b><small><b>${s.gW}</b> of ${s.gN} games</small></div>
        <div class="pf-kpi pf-split"><span class="k">Turn order</span><div><b>${pv(s.fwr)}</b><small>going 1st · ${s.fN}g</small></div><div><b>${pv(s.swr)}</b><small>going 2nd · ${s.sN}g</small></div></div>
        <div class="pf-kpi"><span class="k">Current streak</span><b>${streak(list)}</b><small>last match ${E(fmtDate(chrono(list).pop().played_on))}</small></div>
      </div>
      ${insightsHTML(list, s)}
      ${trendHTML(list)}
      <div class="pf-grid2">
        <div class="pf-card"><h4>My decks <span class="bd-sp"></span><small>match win rate</small></h4>${decksHTML(list)}</div>
        <div class="pf-card"><h4>How games end</h4>${endsHTML(list)}</div>
      </div>
      <div class="pf-card"><h4>Matchups</h4>
        <p class="bd-mut">Your record against each opponent deck. Tap a row for details. Rows with fewer than ${MIN_N} matches are faded: too few to trust yet.</p>
        <div class="pf-tblwrap"><table class="pf-tbl">${matchupsHTML(list)}</table></div>
        <div class="pf-legend"><span><i style="background:var(--pf-fav)"></i>Favoured (60%+)</span><span><i style="background:var(--pf-mid)"></i>Even</span><span><i style="background:var(--pf-unf)"></i>Unfavoured (40% or less)</span><span>1st / 2nd = game win rate when you went first / second</span></div>
      </div>`;
  }
  function insightsHTML(list, s){
    const rows = [...groupBy(list, oppKey).values()].map(l=>({ d:oppDeck(l[0]), s:stats(l) })).filter(r=>r.s.n >= MIN_N);
    const out = [];
    if(rows.length >= 2){
      const best = rows.slice().sort((a,b)=>b.s.wr - a.s.wr || b.s.n - a.s.n)[0];
      const worst = rows.slice().sort((a,b)=>a.s.wr - b.s.wr || b.s.n - a.s.n)[0];
      out.push(`<div class="pf-ins"><span>Best matchup</span><b>${E(best.d.name)}</b>: ${best.s.wr}% over ${best.s.n} matches (${rec(best.s)}).</div>`);
      if(worst !== best) out.push(`<div class="pf-ins bad"><span>Needs work</span><b>${E(worst.d.name)}</b>: ${worst.s.wr}% over ${worst.s.n} matches (${rec(worst.s)}).</div>`);
    }
    if(s.fN >= 10 && s.sN >= 10){
      const d = s.swr - s.fwr, a = Math.abs(d);
      const tip = a < 8 ? 'Turn order barely changes your results.' : d > 0 ? 'If you win the roll, think about letting your opponent go first.' : 'If you win the roll, going first looks right for you.';
      out.push(`<div class="pf-ins info"><span>Turn order</span>You win <b>${s.fwr}%</b> of games going first and <b>${s.swr}%</b> going second. ${tip}</div>`);
    }
    if(!out.length) out.push(`<div class="pf-ins"><span>Keep logging</span>Insights show up once you have ${MIN_N}+ matches against at least two opponent decks, or 10+ games going first and second.</div>`);
    return `<div class="pf-insights">${out.join('')}</div>`;
  }
  function decksHTML(list){
    const rows = [...groupBy(list, myKey).entries()].map(([k, l])=>({ k, d:myDeck(l[0]), s:stats(l) })).sort((a,b)=>b.s.n - a.s.n);
    return rows.map(r=>`<div class="pf-drow pf-dclick" data-pfdeck="${E(r.k)}" tabindex="0" title="Deck details & versions">${thumb(r.d.cover)}<div class="pf-dn"><b>${E(r.d.name)}</b> ${dots(r.d.cols)}
        <small>${r.s.n} match${r.s.n === 1 ? '' : 'es'} · ${rec(r.s)} · 1st ${pv(r.s.fwr)} · 2nd ${pv(r.s.swr)}</small></div>
        <span class="pf-bar" title="${pv(r.s.wr)}"><i style="width:${r.s.wr || 0}%"></i></span><b class="pf-wr">${pv(r.s.wr)}</b></div>`).join('');
  }
  function endsHTML(list){
    const w = {}, l = {}; let nw = 0, nl = 0;
    list.forEach(m=>(m.games || []).forEach(g=>{ if(g.r === 'W'){ w[g.e] = (w[g.e] || 0) + 1; nw++; } else if(g.r === 'L'){ l[g.e] = (l[g.e] || 0) + 1; nl++; } }));
    const keys = Object.keys(END);
    const bar = (lab, o, n) => `<div class="pf-end"><span>${lab}</span><div>${n ? keys.filter(k=>o[k]).map(k=>`<i style="flex:${o[k]};background:${END_COL[k]}" title="${END[k]}: ${o[k]} of ${n} (${pct(o[k], n)}%)">${pct(o[k], n) >= 9 ? pct(o[k], n) + '%' : ''}</i>`).join('') : '<em>no games</em>'}</div></div>`;
    const used = keys.filter(k=>w[k] || l[k]);
    return bar('My wins', w, nw) + bar('My losses', l, nl) +
      `<div class="pf-legend">${used.map(k=>`<span><i style="background:${END_COL[k]}"></i>${END[k]}</span>`).join('')}</div>`;
  }
  const cellBg = wr => wr == null ? 'transparent' : wr >= 60 ? `rgba(57,135,229,${(0.25 + Math.min(1, (wr - 60) / 30) * 0.45).toFixed(2)})` : wr <= 40 ? `rgba(230,103,103,${(0.25 + Math.min(1, (40 - wr) / 30) * 0.45).toFixed(2)})` : 'var(--pf-mid)';
  function matchupsHTML(list){
    let rows = [...groupBy(list, oppKey).entries()].map(([k, l])=>({ k, d:oppDeck(l[0]), s:stats(l) }));
    if(S.sort === 'wr') rows.sort((a,b)=>b.s.wr - a.s.wr || b.s.n - a.s.n);
    else if(S.sort === 'wr-') rows.sort((a,b)=>a.s.wr - b.s.wr || b.s.n - a.s.n);
    else rows.sort((a,b)=>b.s.n - a.s.n || b.s.wr - a.s.wr);
    const arrow = k => S.sort === k ? ' ▾' : S.sort === 'wr-' && k === 'wr' ? ' ▴' : '';
    return `<tr><th>Opponent deck</th><th class="r"><button type="button" data-pfsort="n">Matches${arrow('n')}</button></th><th class="r">W-L-D</th>
      <th class="r"><button type="button" data-pfsort="${S.sort === 'wr' ? 'wr-' : 'wr'}">Win rate${arrow('wr')}</button></th><th class="r hm">1st</th><th class="r hm">2nd</th><th class="r hm">Games</th></tr>` +
      rows.map(r=>{ const low = r.s.n < MIN_N;
        return `<tr class="pf-murow${low ? ' low' : ''}" data-pfmu="${E(r.k)}" tabindex="0" title="Details"><td><div class="pf-arch">${thumb(r.d.cover)}<div><b>${E(r.d.name)}</b>${low ? '<em class="pf-few">few</em>' : ''}<small>${dots(r.d.cols)} <span class="pf-cn">${E(colsText(r.d.cols)) || 'colours not set'}</span></small></div></div></td>
          <td class="r">${r.s.n}</td><td class="r">${rec(r.s)}</td><td class="r"><span class="pf-cell" style="background:${cellBg(low ? null : r.s.wr)}">${pv(r.s.wr)}</span></td>
          <td class="r hm">${pv(r.s.fwr)}</td><td class="r hm">${pv(r.s.swr)}</td><td class="r hm">${r.s.gW}/${r.s.gN}</td></tr>`; }).join('');
  }
  function matchRow(l){
    const o = oppDeck(l), d = myDeck(l), c = CTX[l.context] || CTX.casual;
    const g = l.games || [];
    const sup = f => f === true ? '¹' : f === false ? '²' : '';
    const pips = l.best_of === 3 ? `<span class="pf-pips">${g.map(x=>`<i class="${x.r}">${x.r}${sup(x.f)}</i>`).join('')}</span>` : '';
    const turn = f => f === true ? 'went 1st' : f === false ? 'went 2nd' : 'turn order not set';
    const how = l.best_of === 3 ? 'Bo3' : (g[0] ? [turn(g[0].f), g[0].e === 'unk' ? '' : END[g[0].e]].filter(Boolean).join(' · ') : '');
    const run = l.run_id && (S.runs || []).find(r=>r.id === l.run_id);
    const ctxTag = run ? `<button type="button" class="pf-tag pf-rtag" data-pfrun="${E(run.id)}" title="Open run">🏆 ${E(roundLabel(l))} · ${E(run.name)}</button>` : `<span class="pf-tag">${c.icon} ${E(c.short)}</span>`;
    return `<div class="pf-mrow" data-pfid="${E(l.id)}"><span class="pf-res ${l.result}">${l.result}</span>${thumb(o.cover)}
      <div class="pf-mm"><div><b>${E(o.name)}</b>${pips}${ctxTag}${needsDeck(l) ? '<em class="pf-few">set deck</em>' : ''}</div>
        <small>${E(d.name)} · ${E(how)}${l.opp_name ? ' · vs ' + E(l.opp_name) : ''}</small>
        ${l.notes ? `<small class="pf-note">📝 ${E(l.notes)}</small>` : ''}</div>
      <span class="pf-date">${E(fmtDate(l.played_on))}</span>
      <span class="pf-ma"><button type="button" class="btn2" data-pfedit="${E(l.id)}" title="Edit match" aria-label="Edit match">✏️</button><button type="button" class="btn2 danger" data-pfdel="${E(l.id)}" title="Delete match" aria-label="Delete match">🗑</button></span></div>`;
  }
  function recentHTML(list){
    if(!list.length) return '';
    const c = chrono(list).reverse(); const shown = S.all ? c : c.slice(0, RECENT);
    return `<div class="pf-card"><h4>${S.all ? 'All matches' : 'Recent matches'} <span class="bd-sp"></span><small>${list.length} in this filter</small></h4>
      ${shown.map(matchRow).join('')}
      ${c.length > RECENT ? `<div class="pf-more"><button type="button" class="btn2" data-pfact="all">${S.all ? 'Show fewer ▴' : `Show all ${c.length} matches ▾`}</button></div>` : ''}</div>`;
  }

  /* ---------- klik di tab ---------- */
  document.addEventListener('click', async e=>{
    const w = q1('#perfWrap'); if(!w || !w.contains(e.target)) return;
    const a = e.target.closest('[data-pfact]');
    if(a){
      const act = a.dataset.pfact;
      if(act === 'log') openLog();
      else if(act === 'csv') exportCsv();
      else if(act === 'all'){ S.all = !S.all; render(); }
      else if(act === 'newrun') openRunForm(null);
      else if(act === 'runsall'){ S.runsAll = !S.runsAll; render(); }
      else if(act === 'import') openImport();
      return;
    }
    const rn = e.target.closest('[data-pfrun]'); if(rn){ openRun(rn.dataset.pfrun); return; }
    const dk = e.target.closest('[data-pfdeck]'); if(dk){ openDeck(dk.dataset.pfdeck); return; }
    const mu = e.target.closest('[data-pfmu]'); if(mu && !e.target.closest('[data-pfsort]')){ openMu(mu.dataset.pfmu); return; }
    const cx = e.target.closest('[data-pfctx]'); if(cx){ S.f.ctx = cx.dataset.pfctx; saveFilt(); render(); return; }
    const so = e.target.closest('[data-pfsort]'); if(so){ S.sort = so.dataset.pfsort; render(); return; }
    const ed = e.target.closest('[data-pfedit]'); if(ed){ const l = (S.logs || []).find(x=>x.id === ed.dataset.pfedit); if(l) openLog({ edit:l }); return; }
    const del = e.target.closest('[data-pfdel]');
    if(del){
      const l = (S.logs || []).find(x=>x.id === del.dataset.pfdel); if(!l) return;
      if(!confirm(`Delete this match (${l.result} vs ${oppDeck(l).name}, ${fmtDate(l.played_on)})? This can't be undone.`)) return;
      del.disabled = true;
      const { error } = await API().remove(l.id);
      if(error){ del.disabled = false; alert(errMsg(error)); return; }
      S.logs = S.logs.filter(x=>x.id !== l.id); updateTile(); render();
    }
  });
  document.addEventListener('keydown', e=>{
    if(e.key !== 'Enter') return;
    const mu = e.target.closest && e.target.closest('#perfWrap [data-pfmu]'); if(mu) openMu(mu.dataset.pfmu);
    const dk = e.target.closest && e.target.closest('#perfWrap [data-pfdeck]'); if(dk) openDeck(dk.dataset.pfdeck);
  });
  document.addEventListener('change', e=>{
    if(e.target.id === 'pfDeck'){ S.f.deck = e.target.value; render(); }
    else if(e.target.id === 'pfPer'){ S.f.per = e.target.value; saveFilt(); render(); }
  });

  /* =================== CATAT / EDIT MATCH =================== */
  const L = {};
  function g3needed(){ return L.bo === 3 && L.games.length >= 2 && !(L.games[0].r === L.games[1].r && L.games[0].r !== 'D'); }
  function gamesToSave(){ return L.bo === 1 ? L.games.slice(0, 1) : (g3needed() ? L.games.slice(0, 3) : L.games.slice(0, 2)); }
  function recentOpps(){
    const seen = [];
    chrono(S.logs || []).reverse().forEach(l=>{ if(l.opp_archetype && !seen.includes(l.opp_archetype)) seen.push(l.opp_archetype); });
    const act = (S.arch || []).filter(a=>a.active || a.id === L.opp);
    return seen.filter(id=>act.some(a=>a.id === id)).concat(act.map(a=>a.id).filter(id=>!seen.includes(id)));
  }
  async function openLog(preset){
    preset = preset || {};
    if(!API() || !API().ready) return;
    await ensureUser();
    if(!S.logs || !S.decks || !S.arch){ await refresh(); }
    const last = lastPrefs(); const ed = preset.edit || null;
    const run = preset.run || (ed && ed.run_id && (S.runs || []).find(r=>r.id === ed.run_id)) || null;
    const decks = S.decks || [];
    let deckSel = '';
    if(ed) deckSel = ed.deck_id && decks.some(d=>d.id === ed.deck_id) ? ed.deck_id : '__other';
    else if(preset.deckId && decks.some(d=>d.id === preset.deckId)) deckSel = preset.deckId;
    else if(last.deck && decks.some(d=>d.id === last.deck)) deckSel = last.deck;
    else deckSel = decks.length ? decks[0].id : '__other';
    Object.assign(L, {
      id: ed ? ed.id : null,
      deck: deckSel, deckName: ed && deckSel === '__other' ? ed.deck_name : (last.deckName || ''),
      ctx: ed ? ed.context : (CTX[last.ctx] ? last.ctx : 'casual'),
      bo: ed ? ed.best_of : (last.bo === 3 ? 3 : 1),
      opp: ed ? (ed.opp_archetype || '__other') : (preset.opp || ''),
      oCols: ed && !ed.opp_archetype ? [...(ed.opp_colors || [])] : [], oLabel: ed && !ed.opp_archetype ? (ed.opp_label || '') : '',
      date: ed ? ed.played_on : todayISO(),
      name: ed ? (ed.opp_name || '') : '', notes: ed ? (ed.notes || '') : '', q:'', err:'', busy:false,
      games: ed ? (ed.games || []).map(g=>({ r:g.r, f: g.f === true || g.f === false ? g.f : null, e:g.e || 'rp', ft:true })) : [{ r:'W', f:true, e:'rp' }],
      run: run ? run.id : null, back: preset.back || null,
      round: ed ? (ed.round_no || '') : (run ? nextRound(run) : ''), top: ed ? !!ed.is_top : false,
    });
    if(run && !ed){ L.bo = run.best_of === 3 ? 3 : 1; L.date = run.played_on; L.ctx = run.context;
      L.deck = run.deck_id && decks.some(d=>d.id === run.deck_id) ? run.deck_id : '__other'; L.deckName = run.deck_name || ''; }
    if(ed && ed.opp_archetype && !archById(ed.opp_archetype)){ L.opp = '__other'; L.oCols = [...(ed.opp_colors || [])]; L.oLabel = ed.opp_label || ''; }
    if(!L.opp){ const r = recentOpps(); L.opp = ''; if(r.length === 0) L.opp = '__other'; }
    normGames();
    const m = mxOpen(`<h3>${L.id ? (run ? '✏️ Edit round' : '✏️ Edit match') : (run ? '＋ Add a round' : '＋ Log a match')}</h3><div id="pfLog"></div>`, 'pf-mx');
    drawLog();
    m.querySelector('#pfLog').addEventListener('click', onLogClick);
    m.querySelector('#pfLog').addEventListener('input', onLogInput);
    m.querySelector('#pfLog').addEventListener('change', onLogInput);
  }
  function normGames(){
    if(L.bo === 1) L.games = L.games.slice(0, 1);
    else{
      while(L.games.length < 3){
        const p = L.games[L.games.length - 1];
        /* yang kalah di game sebelumnya biasanya memilih jalan duluan */
        L.games.push({ r: L.games.length === 1 ? p.r : 'W', f: p.r !== 'W', e:'rp' });
      }
    }
  }
  function oppTiles(){
    const q = L.q.trim().toLowerCase();
    const ids = recentOpps().filter(id=>{ const a = archById(id); if(!q) return true;
      return a.name.toLowerCase().includes(q) || (a.aliases || '').toLowerCase().includes(q) || (a.colors || []).some(c=>colName(c).toLowerCase().includes(q) || c.toLowerCase().includes(q)); });
    return ids.map(id=>{ const a = archById(id);
      return `<button type="button" class="pf-opp" data-opp="${E(id)}" aria-pressed="${L.opp === id}">${thumb(a.key_card, 'pf-oimg')}<span><b>${E(a.name)}</b>${dots(a.colors)}</span></button>`; }).join('') +
      `<button type="button" class="pf-opp" data-opp="__other" aria-pressed="${L.opp === '__other'}"><span class="pf-oimg pf-th-x">?</span><span><b>Other</b><small>pick colours</small></span></button>`;
  }
  function gamesHTML(){
    const shown = gamesToSave();
    return shown.map((g, i)=>`<div class="pf-game"><span class="pf-gl">${L.bo === 3 ? 'Game ' + (i + 1) : 'Game'}</span>
      <div class="pf-seg res" data-g="${i}" data-gf="r">${[['W','Win'],['L','Loss'],['D','Draw']].map(([v,t])=>`<button type="button" data-v="${v}" aria-pressed="${g.r === v}">${t}</button>`).join('')}</div>
      <div class="pf-seg" data-g="${i}" data-gf="f" title="Who took the first turn?"><button type="button" data-v="1" aria-pressed="${g.f === true}">1st</button><button type="button" data-v="0" aria-pressed="${g.f === false}">2nd</button>${g.f === null ? '<button type="button" data-v="" aria-pressed="true" title="Not recorded">?</button>' : ''}</div>
      <select data-g="${i}" data-gf="e" aria-label="How game ${i + 1} ended">${Object.entries(END).map(([k,t])=>`<option value="${k}" ${g.e === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('') +
      (L.bo === 3 && !g3needed() ? '<p class="bd-mut pf-hint">Game 3 is hidden because the match ended 2-0.</p>' : '');
  }
  function drawLog(){
    const box = q1('#pfLog'); if(!box) return;
    const decks = S.decks || [];
    const run = L.run && (S.runs || []).find(r=>r.id === L.run);
    box.innerHTML = `<div class="pf-form">
      ${run ? `<div class="pf-runbar">🏆 <b>${E(run.name)}</b> · ${E(fmtDate(run.played_on))} · ${E(myDeck(run).name)} · Bo${L.bo}</div>
      <div class="pf-row2"><label class="bd-f"><span>Round</span><input type="number" data-lf="round" min="1" max="30" value="${E(L.round)}"></label>
        <label class="bd-chk pf-topchk"><input type="checkbox" data-lf="top" ${L.top ? 'checked' : ''}> Top cut round</label></div>` : `
      <div class="pf-row2">
        <label class="bd-f"><span>My deck</span><select data-lf="deck">${decks.map(d=>`<option value="${E(d.id)}" ${L.deck === d.id ? 'selected' : ''}>${E(d.name)}</option>`).join('')}
          <option value="__other" ${L.deck === '__other' ? 'selected' : ''}>${decks.length ? 'A deck not saved on my account…' : 'Type the deck name…'}</option></select>
          ${L.deck === '__other' ? `<input type="text" data-lf="deckName" maxlength="60" placeholder="Deck name, e.g. Red Blue Aggro" value="${E(L.deckName)}">` : ''}</label>
        <label class="bd-f"><span>Date</span><input type="date" data-lf="date" value="${E(L.date)}" max="${todayISO()}"></label>
      </div>
      <div class="bd-f"><span>Where</span><div class="pf-seg wide" data-lseg="ctx">${Object.entries(CTX).map(([k,c])=>`<button type="button" data-v="${k}" aria-pressed="${L.ctx === k}">${c.icon} ${E(c.label)}</button>`).join('')}</div></div>`}
      <div class="bd-f"><span>Opponent's deck</span>
        ${(S.arch || []).length > 8 ? `<input type="search" data-lf="q" placeholder="Search deck or colour…" value="${E(L.q)}">` : ''}
        <div class="pf-opps" id="pfOpps">${oppTiles()}</div>
        ${L.opp === '__other' ? `<div class="pf-other"><div class="pf-cpick">${COLS6.map(c=>`<button type="button" data-ocol="${c}" aria-pressed="${L.oCols.includes(c)}"><i style="background:${CMAP[c]}"></i>${E(colName(c))}</button>`).join('')}</div>
          <input type="text" data-lf="oLabel" maxlength="40" placeholder="Deck name (optional), e.g. Blue Hawkeye" value="${E(L.oLabel)}">
          <p class="bd-mut pf-hint">Pick up to 2 colours. If you see a new deck a lot, tell us and we'll add it to the list.</p></div>` : ''}
      </div>
      <div class="pf-row2">
        ${run ? '' : `<div class="bd-f"><span>Format</span><div class="pf-seg" data-lseg="bo"><button type="button" data-v="1" aria-pressed="${L.bo === 1}">Best of 1</button><button type="button" data-v="3" aria-pressed="${L.bo === 3}">Best of 3</button></div></div>`}
        <label class="bd-f"><span>Opponent's name <em>(optional, only you see it)</em></span><input type="text" data-lf="name" maxlength="40" value="${E(L.name)}" placeholder="e.g. Raka"></label>
      </div>
      <div class="bd-f"><span>Result</span><div id="pfGames">${gamesHTML()}</div>
        <p class="bd-mut pf-hint">1st / 2nd = who took the first turn. The first player has only 1 CALL and no Battle Phase on their first turn, so it's tracked for every game.</p></div>
      <label class="bd-f"><span>Notes <em>(optional)</em></span><textarea data-lf="notes" rows="2" maxlength="500" placeholder="e.g. Kept a hand without Lv1, bricked on turn 2">${E(L.notes)}</textarea></label>
      ${L.err ? `<p class="pf-err">${E(L.err)}</p>` : ''}
      <div class="bd-btns"><span class="bd-mut bd-sp">Your matches are private. Only you can see them.</span>
        ${L.back ? '<button type="button" class="btn2" data-lact="back">Back</button>' : '<button type="button" class="btn2" data-mxclose>Cancel</button>'}
        <button type="button" class="btn2 main" data-lact="save" ${L.busy ? 'disabled' : ''}>${L.busy ? 'Saving…' : L.id ? 'Save changes' : 'Save match'}</button></div>
    </div>`;
  }
  function onLogInput(e){
    const f = e.target.dataset.lf;
    if(f){
      if(f === 'deck'){ L.deck = e.target.value; drawLog(); return; }
      if(f === 'top'){ L.top = e.target.checked; return; }
      L[f] = e.target.value;
      if(f === 'q'){ const o = q1('#pfOpps'); if(o) o.innerHTML = oppTiles(); }
      return;
    }
    const gf = e.target.dataset.gf;
    if(gf === 'e' && e.type === 'change'){ L.games[+e.target.dataset.g].e = e.target.value; }
  }
  function onLogClick(e){
    const op = e.target.closest('[data-opp]'); if(op){ L.opp = op.dataset.opp; L.err = ''; drawLog(); return; }
    const oc = e.target.closest('[data-ocol]');
    if(oc){ const c = oc.dataset.ocol; if(L.oCols.includes(c)) L.oCols = L.oCols.filter(x=>x !== c); else { L.oCols.push(c); if(L.oCols.length > 2) L.oCols.shift(); } drawLog(); return; }
    const sb = e.target.closest('[data-lseg] button');
    if(sb){ const k = sb.parentElement.dataset.lseg; if(k === 'bo'){ L.bo = +sb.dataset.v; normGames(); } else L.ctx = sb.dataset.v; drawLog(); return; }
    const gb = e.target.closest('[data-gf] button');
    if(gb){
      const p = gb.parentElement, i = +p.dataset.g, g = L.games[i];
      if(p.dataset.gf === 'r'){
        g.r = gb.dataset.v;
        /* default giliran game berikutnya: yang kalah biasanya memilih jalan duluan (kecuali sudah diatur manual) */
        const nx = L.games[i + 1];
        if(nx && !nx.ft && g.r !== 'D') nx.f = g.r === 'L';
      } else { g.f = gb.dataset.v === '' ? null : gb.dataset.v === '1'; g.ft = true; }
      const box = q1('#pfGames'); if(box) box.innerHTML = gamesHTML(); return;
    }
    if(e.target.closest('[data-lact="save"]')) saveLog();
    if(e.target.closest('[data-lact="back"]')) openRun(L.back);
  }
  async function saveLog(){
    if(L.busy) return;
    L.err = '';
    const deck = (S.decks || []).find(d=>d.id === L.deck);
    if(!deck && !L.deckName.trim()) L.err = 'Choose your deck, or type its name.';
    else if(!L.opp) L.err = 'Choose your opponent\'s deck.';
    else if(L.opp === '__other' && !L.oCols.length && !L.oLabel.trim()) L.err = 'Pick the colours of your opponent\'s deck (or type its name).';
    else if(!L.date || L.date > todayISO()) L.err = 'Please pick a date that isn\'t in the future.';
    else if(L.run && !(+L.round >= 1 && +L.round <= 30)) L.err = 'Round must be a number from 1 to 30.';
    if(L.err){ drawLog(); return; }
    const other = L.opp === '__other';
    const cols = [...L.oCols].sort((a,b)=>CORDER[a]-CORDER[b]);
    const row = {
      id: L.id || undefined, played_on:L.date, context:L.ctx, best_of:L.bo,
      deck_id: deck ? deck.id : null, deck_name: deck ? deck.name : L.deckName.trim(), deck_code: deck ? deck.code : '',
      opp_archetype: other ? null : L.opp,
      opp_label: other ? (L.oLabel.trim() || (cols.length ? colsText(cols) + ' (other)' : 'Other deck')) : '',
      opp_colors: other ? cols : ((archById(L.opp) || {}).colors || []),
      opp_name: L.name.trim(), notes: L.notes.trim(),
      games: gamesToSave().map(g=>({ r:g.r, f: g.f === true || g.f === false ? g.f : null, e:g.e })),
    };
    /* v7.15 — jenis deck sendiri untuk data komunitas (dihitung ulang setelah kolom deck run diisi) */
    const fixArch = () => { row.my_archetype = classifyDeck(row.deck_code) || null; };
    if(L.run){ const run = (S.runs || []).find(r=>r.id === L.run); row.run_id = L.run; row.round_no = +L.round; row.is_top = !!L.top;
      if(run){ row.played_on = run.played_on; row.context = run.context; row.deck_id = run.deck_id || null; row.deck_name = run.deck_name; row.deck_code = run.deck_code; } }
    /* saat edit, deck_code lama dipertahankan kalau deck tidak diganti (riwayat versi deck tetap utuh) */
    if(L.id){ const old = (S.logs || []).find(x=>x.id === L.id); if(old && old.deck_id && deck && old.deck_id === deck.id) row.deck_code = old.deck_code; }
    fixArch();
    L.busy = true; drawLog();
    const { data, error } = await API().save(row);
    L.busy = false;
    if(error || !data){ L.err = errMsg(error) || 'Could not save. Please try again.'; drawLog(); return; }
    if(!L.run) saveLast({ deck: deck ? deck.id : '', deckName: deck ? '' : row.deck_name, ctx:L.ctx, bo:L.bo });
    S.logs = S.logs || [];
    const i = S.logs.findIndex(x=>x.id === data.id);
    if(i >= 0) S.logs[i] = data; else S.logs.unshift(data);
    if(L.back) openRun(L.back); else mxClose();
    updateTile();
    if(q1('#dashPanelPerf') && !q1('#dashPanelPerf').hidden) render();
    toast(`${L.id ? (L.run ? 'Round updated' : 'Match updated') : (L.run ? 'Round saved' : 'Match saved')} ✓ ${data.result} vs ${oppDeck(data).name}`);
  }
  function toast(msg){
    let t = q1('#pfToast');
    if(!t){ t = document.createElement('div'); t.id = 'pfToast'; t.className = 'pf-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t._tm); t._tm = setTimeout(()=>{ t.hidden = true; }, 2600);
  }

  /* =================== CSV =================== */
  function exportCsv(){
    const list = chrono(filtered()).reverse();
    const esc = v => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['date','where','best_of','my_deck','opponent_deck','opponent_colours','opponent_name','result','games','went_first_game1','tournament_run','round','notes'];
    const ft = f => f === true ? '1st' : f === false ? '2nd' : '?';
    const rows = list.map(l=>[l.played_on, (CTX[l.context] || {}).label, 'Bo' + l.best_of, myDeck(l).name, oppDeck(l).name,
      (l.opp_colors || []).map(c=>WARNA_EN_SAFE(c)).join(' / '), l.opp_name, l.result,
      (l.games || []).map(g=>`${g.r} ${ft(g.f)} ${END[g.e] || ''}`).join(' | '), l.games && l.games[0] ? (l.games[0].f === true ? 'yes' : l.games[0].f === false ? 'no' : '') : '',
      ((S.runs || []).find(r=>r.id === l.run_id) || {}).name || '', l.run_id ? roundLabel(l) : '', l.notes]);
    const csv = '﻿' + [head].concat(rows).map(r=>r.map(esc).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    a.download = `mhr-matches-${todayISO()}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const WARNA_EN_SAFE = c => (typeof WARNA_EN !== 'undefined' && WARNA_EN[c]) || c;

  /* =================== ADMIN: daftar archetype =================== */
  function adminHTML(){
    if(typeof isAccountAdmin === 'undefined' || !isAccountAdmin) return '';
    const list = S.arch || [];
    const colSel = (v, n) => `<select data-af="c${n}"><option value="">–</option>${COLS6.map(c=>`<option value="${c}" ${v === c ? 'selected' : ''}>${E(colName(c))}</option>`).join('')}</select>`;
    const row = a => `<tr data-aid="${E(a.id || '')}">
      <td>${a.id ? `<code>${E(a.id)}</code>` : '<input data-af="id" placeholder="auto" maxlength="40">'}</td>
      <td><input data-af="name" value="${E(a.name || '')}" maxlength="40" placeholder="e.g. Red Blue Aggro"></td>
      <td class="pf-acol">${colSel((a.colors || [])[0], 0)}${colSel((a.colors || [])[1], 1)}</td>
      <td><input data-af="key_card" value="${E(a.key_card || '')}" maxlength="24" placeholder="BP01-001"></td>
      <td><input data-af="aliases" value="${E(a.aliases || '')}" maxlength="200" placeholder="other names, for search"></td>
      <td><input data-af="sort" type="number" min="0" max="10000" value="${a.sort == null ? 100 : a.sort}" style="width:70px"></td>
      <td><input data-af="active" type="checkbox" ${a.active === false ? '' : 'checked'} aria-label="Shown to players"></td>
      <td class="pf-aact"><button type="button" class="btn2 main" data-aact="save">${a.id ? 'Save' : 'Add'}</button>${a.id ? '<button type="button" class="btn2 danger" data-aact="del">Delete</button>' : ''}</td></tr>`;
    return `<div class="bd-admin pf-admin" id="pfAdmin"><b>🛡 Opponent deck list (admin)</b>
      <p class="bd-mut">The decks players pick from when they log a match. Turn off "shown" to hide an old deck without breaking past logs.
        Deleting a deck keeps its name in players' past logs. Key card = card number used as the picture.</p>
      <div class="pf-tblwrap"><table class="pf-atbl"><tr><th>ID</th><th>Name</th><th>Colours</th><th>Key card</th><th>Aliases</th><th>Order</th><th>Shown</th><th></th></tr>
        ${list.map(row).join('')}${row({})}</table></div><p class="bd-mut" id="pfAdminMsg"></p></div>`;
  }
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  function wireAdmin(){
    const box = q1('#pfAdmin'); if(!box || box._wired) return; box._wired = true;
    box.addEventListener('click', async e=>{
      const b = e.target.closest('[data-aact]'); if(!b) return;
      const tr = b.closest('tr'); const id0 = tr.dataset.aid; const msg = q1('#pfAdminMsg');
      const v = k => { const el = tr.querySelector(`[data-af="${k}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
      if(b.dataset.aact === 'del'){
        if(!confirm(`Delete "${v('name')}" from the list? Players' past logs keep the name, but it can't be picked any more.`)) return;
        const { error } = await API().removeArchetype(id0);
        if(error){ msg.textContent = errMsg(error); return; }
        S.arch = S.arch.filter(a=>a.id !== id0); render(); return;
      }
      const cols = [v('c0'), v('c1')].filter(Boolean).filter((c, i, arr)=>arr.indexOf(c) === i);
      const row = { id: id0 || slug(v('id') || v('name')), name:String(v('name') || '').trim(), colors:cols, key_card:String(v('key_card') || '').trim().toUpperCase(),
        aliases:String(v('aliases') || '').trim(), sort: Math.max(0, Math.min(10000, parseInt(v('sort'), 10) || 0)), active: !!v('active') };
      if(!row.name){ msg.textContent = 'Give the deck a name.'; return; }
      if(!/^[a-z0-9][a-z0-9-]{1,39}$/.test(row.id)){ msg.textContent = 'The ID needs 2–40 letters, numbers or dashes.'; return; }
      if(row.key_card && !DB.some(c=>c.no === row.key_card)){ msg.textContent = `Card ${row.key_card} isn't in the database.`; return; }
      b.disabled = true;
      const { data, error } = await API().saveArchetype(row, !id0);
      b.disabled = false;
      if(error || !data){ msg.textContent = error && /duplicate|23505/.test(`${error.code} ${error.message}`) ? 'That ID is already used.' : errMsg(error); return; }
      const i = S.arch.findIndex(a=>a.id === data.id); if(i >= 0) S.arch[i] = data; else S.arch.push(data);
      S.arch.sort((a,b)=>a.sort - b.sort || a.name.localeCompare(b.name));
      render(); const m2 = q1('#pfAdminMsg'); if(m2) m2.textContent = `Saved “${data.name}” ✓`;
    });
  }

  /* =================== v7.14 — TOURNAMENT RUNS =================== */
  const runRounds = id => (S.logs || []).filter(l=>l.run_id === id)
    .sort((a,b)=> (a.is_top ? 1 : 0) - (b.is_top ? 1 : 0) || (a.round_no || 99) - (b.round_no || 99) || (a.created_at < b.created_at ? -1 : 1));
  const nextRound = run => { const r = runRounds(run.id); return r.length ? Math.min(30, Math.max(...r.map(x=>x.round_no || 0)) + 1) : 1; };
  const needsDeck = l => !l.opp_archetype && !(l.opp_colors || []).length;
  /* label ronde: R1, R2 … ; Top cut dihitung dari belakang: Final, Semifinal, Quarterfinal, Top 16 */
  function roundLabel(l){
    if(!l.is_top) return 'R' + (l.round_no || '?');
    const tops = runRounds(l.run_id).filter(x=>x.is_top).map(x=>x.round_no || 0);
    const uniq = [...new Set(tops)].sort((a,b)=>a-b);
    const k = uniq.length - 1 - uniq.indexOf(l.round_no || 0);
    return ['Final', 'Semifinal', 'Quarterfinal', 'Top 16', 'Top 32'][k] || 'Top cut';
  }
  function runStats(run){
    const rs = runRounds(run.id);
    return { rounds:rs, swiss:stats(rs.filter(l=>!l.is_top)), top:stats(rs.filter(l=>l.is_top)), need:rs.filter(needsDeck).length };
  }
  const runRec = st => st.swiss.n || !st.top.n ? rec(st.swiss) : rec(st.top);
  function importable(){
    if(S.runsOff || !S.entries) return [];
    return S.entries.filter(x=>x.event && x.player && !(S.runs || []).some(r=>r.event_id === x.event.id));
  }
  function importBanner(){
    const all = importable(); const fin = all.filter(x=>x.event.status === 'finished');
    if(!fin.length) return '';
    return `<div class="pf-import">🏟 <span>You played <b>${fin.length === 1 ? E(fin[0].event.name) : fin.length + ' events'}</b> on Events with this account.
      Import ${fin.length === 1 ? 'it' : 'them'} as a tournament run: rounds, results and placement are filled in, you only add your opponents' decks.</span>
      <button type="button" class="btn2 main" data-pfact="import">Import</button></div>`;
  }
  function runRowHTML(run){
    const st = runStats(run); const d = myDeck(run);
    const meta = [fmtDate(run.played_on), run.players ? run.players + ' players' : '', 'Bo' + run.best_of, d.name].filter(Boolean).map(E).join(' · ');
    return `<div class="pf-trow" data-pfrun="${E(run.id)}" tabindex="0">${thumb(d.cover)}
      <div class="pf-mm"><b>${E(run.name)}</b>${run.event_id ? '<span class="pf-tag pf-ev">from Events</span>' : ''}${st.need ? `<em class="pf-few">${st.need} to fill in</em>` : ''}<small>${meta}</small></div>
      <b class="pf-rrec">${st.rounds.length ? runRec(st) : '–'}</b>${run.placement ? `<span class="pf-place">${E(run.placement)}</span>` : '<span></span>'}</div>`;
  }
  function runsHTML(){
    if(S.runsOff) return '';
    const runs = (S.runs || []).slice().sort((a,b)=> a.played_on < b.played_on ? 1 : a.played_on > b.played_on ? -1 : 0);
    const shown = S.runsAll ? runs : runs.slice(0, 5);
    return `<div class="pf-card"><h4>🏆 Tournament runs <span class="bd-sp"></span><button type="button" class="btn2 pf-h4btn" data-pfact="newrun">＋ New run</button></h4>
      ${runs.length ? shown.map(runRowHTML).join('') : '<p class="bd-mut">Group the rounds you play at one event into a run: your Swiss record, your placement and an image you can share.</p>'}
      ${runs.length > 5 ? `<div class="pf-more"><button type="button" class="btn2" data-pfact="runsall">${S.runsAll ? 'Show fewer ▴' : `Show all ${runs.length} runs ▾`}</button></div>` : ''}</div>`;
  }

  function openRun(id){
    const run = (S.runs || []).find(r=>r.id === id); if(!run){ mxClose(); return; }
    const st = runStats(run); const d = myDeck(run); const c = CTX[run.context] || CTX.store;
    const info = [fmtDate(run.played_on), run.venue, run.players ? run.players + ' players' : '', 'Best of ' + run.best_of, c.label].filter(Boolean).map(E).join(' · ');
    const sup = f => f === true ? '1st' : f === false ? '2nd' : 'turn ?';
    const rows = st.rounds.map(l=>{ const o = oppDeck(l); const g = l.games || [];
      return `<div class="pf-rd${l.is_top ? ' top' : ''}"><span class="pf-rn">${E(roundLabel(l))}</span>${thumb(o.cover)}
        <div class="pf-mm"><b>${needsDeck(l) ? '<span class="pf-need">Opponent deck not set</span>' : E(o.name)}</b> ${dots(o.cols)}
          <small>${g.map((x, i)=>`G${i + 1} ${x.r} (${sup(x.f)}${x.e && x.e !== 'unk' ? ', ' + E(END[x.e]) : ''})`).join(' · ')}${l.opp_name ? ' · vs ' + E(l.opp_name) : ''}</small>
          ${l.notes ? `<small class="pf-note">📝 ${E(l.notes)}</small>` : ''}</div>
        <span class="pf-res ${l.result}">${l.result}</span>
        <span class="pf-ma"><button type="button" class="btn2" data-rdedit="${E(l.id)}" aria-label="Edit round">✏️</button><button type="button" class="btn2 danger" data-rddel="${E(l.id)}" aria-label="Delete round">🗑</button></span></div>`; }).join('');
    const m = mxOpen(`<h3>🏆 ${E(run.name)}</h3>
      <div class="pf-rhead">${thumb(d.cover, 'pf-rimg')}<div class="pf-mm"><b>${E(d.name)}</b> ${dots(d.cols)}<small>${info}</small>
        ${run.event_id ? '<small><span class="pf-tag pf-ev" style="margin-left:0">imported from Events</span></small>' : ''}</div>
        <div class="pf-rrecbox"><b>${st.rounds.length ? rec(st.swiss) : '–'}</b><small>Swiss record${run.byes ? ` + ${run.byes} bye${run.byes > 1 ? 's' : ''}` : ''}${st.top.n ? ` · Top cut ${rec(st.top)}` : ''}</small></div>
        ${run.placement ? `<span class="pf-place big">${E(run.placement)}</span>` : ''}</div>
      <div class="bd-btns pf-racts"><button type="button" class="btn2 main" data-ract="add">＋ Add round</button>
        <button type="button" class="btn2" data-ract="share" ${st.rounds.length ? '' : 'disabled'}>📤 Share as image</button>
        <button type="button" class="btn2" data-ract="edit">✏️ Edit run</button><button type="button" class="btn2 danger" data-ract="del">🗑 Delete run</button></div>
      ${st.need ? `<p class="pf-hint pf-needhint">${st.need} round${st.need > 1 ? 's' : ''} still need${st.need > 1 ? '' : 's'} your opponent's deck. Tap ✏️ to set it (and who went first, if you remember).</p>` : ''}
      <div class="pf-rounds">${rows || '<p class="bd-mut">No rounds yet. Add each round you played, in order.</p>'}</div>
      ${run.notes ? `<p class="pf-note pf-rnotes">📝 ${E(run.notes)}</p>` : ''}`, 'pf-mx pf-mxw');
    m.querySelector('.mx-box').addEventListener('click', async e=>{
      const a = e.target.closest('[data-ract]');
      if(a){
        const act = a.dataset.ract;
        if(act === 'add') openLog({ run, back:run.id });
        else if(act === 'share') openShare(run);
        else if(act === 'edit') openRunForm(run);
        else if(act === 'del'){
          const n = runRounds(run.id).length;
          if(!confirm(`Delete “${run.name}”${n ? ` and its ${n} round${n > 1 ? 's' : ''}` : ''}? This can't be undone.`)) return;
          a.disabled = true;
          const { error } = await API().removeRun(run.id);
          if(error){ a.disabled = false; alert(errMsg(error)); return; }
          S.runs = S.runs.filter(r=>r.id !== run.id); S.logs = (S.logs || []).filter(l=>l.run_id !== run.id);
          mxClose(); updateTile(); render(); toast('Run deleted');
        }
        return;
      }
      const ed = e.target.closest('[data-rdedit]');
      if(ed){ const l = (S.logs || []).find(x=>x.id === ed.dataset.rdedit); if(l) openLog({ edit:l, back:run.id }); return; }
      const del = e.target.closest('[data-rddel]');
      if(del){
        const l = (S.logs || []).find(x=>x.id === del.dataset.rddel); if(!l) return;
        if(!confirm(`Delete ${roundLabel(l)} (${l.result} vs ${oppDeck(l).name})?`)) return;
        const { error } = await API().remove(l.id);
        if(error){ alert(errMsg(error)); return; }
        S.logs = S.logs.filter(x=>x.id !== l.id); updateTile(); render(); openRun(run.id);
      }
    });
  }

  /* ---------- buat / ubah run ---------- */
  function openRunForm(run){
    const decks = S.decks || []; const last = lastPrefs();
    const deckSel = run ? (run.deck_id && decks.some(d=>d.id === run.deck_id) ? run.deck_id : '__other')
      : (last.deck && decks.some(d=>d.id === last.deck) ? last.deck : (decks.length ? decks[0].id : '__other'));
    const R = { ctx: run ? run.context : 'store', bo: run ? run.best_of : 1 };
    const lgs = (window.LGS || []).map(x=>x && x.nm).filter(Boolean);
    const m = mxOpen(`<h3>${run ? '✏️ Edit run' : '🏆 New tournament run'}</h3>
      <div class="pf-form" id="pfRunForm">
        <label class="bd-f"><span>Event name</span><input type="text" data-rf="name" maxlength="80" value="${E(run ? run.name : '')}" placeholder="e.g. Weekly Rush at Midgard Games"></label>
        <div class="pf-row2">
          <label class="bd-f"><span>Date</span><input type="date" data-rf="date" value="${E(run ? run.played_on : todayISO())}" max="${todayISO()}"></label>
          <label class="bd-f"><span>Store / venue <em>(optional)</em></span><input type="text" data-rf="venue" maxlength="60" list="pfLgsList" value="${E(run ? run.venue : '')}" placeholder="e.g. Ogre Gandaria Neverland">
            <datalist id="pfLgsList">${lgs.map(n=>`<option value="${E(n)}">`).join('')}</datalist></label>
        </div>
        <div class="bd-f"><span>Type</span><div class="pf-seg wide" data-rseg="ctx">${['store','tournament','casual'].map(k=>`<button type="button" data-v="${k}" aria-pressed="${R.ctx === k}">${CTX[k].icon} ${E(CTX[k].label)}</button>`).join('')}</div></div>
        <div class="pf-row2">
          <label class="bd-f"><span>My deck</span><select data-rf="deck">${decks.map(d=>`<option value="${E(d.id)}" ${deckSel === d.id ? 'selected' : ''}>${E(d.name)}</option>`).join('')}
            <option value="__other" ${deckSel === '__other' ? 'selected' : ''}>${decks.length ? 'A deck not saved on my account…' : 'Type the deck name…'}</option></select>
            <input type="text" data-rf="deckName" maxlength="60" placeholder="Deck name" value="${E(run && deckSel === '__other' ? run.deck_name : '')}" ${deckSel === '__other' ? '' : 'hidden'}></label>
          <div class="bd-f"><span>Format</span><div class="pf-seg" data-rseg="bo"><button type="button" data-v="1" aria-pressed="${R.bo === 1}">Best of 1</button><button type="button" data-v="3" aria-pressed="${R.bo === 3}">Best of 3</button></div>
            ${run && runRounds(run.id).length ? '<small class="bd-mut">Rounds already logged keep their own format.</small>' : ''}</div>
        </div>
        <div class="pf-row3">
          <label class="bd-f"><span>Players</span><input type="number" data-rf="players" min="2" max="2048" value="${E(run && run.players ? run.players : '')}" placeholder="e.g. 16"></label>
          <label class="bd-f"><span>Final placement</span><input type="text" data-rf="placement" maxlength="24" list="pfPlaceList" value="${E(run ? run.placement : '')}" placeholder="e.g. Top 8">
            <datalist id="pfPlaceList">${PLACES.map(p=>`<option value="${E(p)}">`).join('')}</datalist></label>
          <label class="bd-f"><span>Byes</span><input type="number" data-rf="byes" min="0" max="15" value="${E(run ? run.byes : 0)}"></label>
        </div>
        <label class="bd-f"><span>Notes <em>(optional)</em></span><textarea data-rf="notes" rows="2" maxlength="500" placeholder="What did you learn?">${E(run ? run.notes : '')}</textarea></label>
        <p class="pf-err" id="pfRunErr"></p>
        <div class="bd-btns"><span class="bd-sp"></span>${run ? '<button type="button" class="btn2" data-rfact="back">Back</button>' : '<button type="button" class="btn2" data-mxclose>Cancel</button>'}
          <button type="button" class="btn2 main" data-rfact="save">${run ? 'Save changes' : 'Create run'}</button></div>
      </div>`, 'pf-mx');
    const box = m.querySelector('#pfRunForm');
    const val = k => { const el = box.querySelector(`[data-rf="${k}"]`); return el ? el.value : ''; };
    box.addEventListener('change', e=>{ if(e.target.dataset.rf === 'deck'){ const inp = box.querySelector('[data-rf="deckName"]'); inp.hidden = e.target.value !== '__other'; } });
    box.addEventListener('click', async e=>{
      const sb = e.target.closest('[data-rseg] button');
      if(sb){ const k = sb.parentElement.dataset.rseg; R[k] = k === 'bo' ? +sb.dataset.v : sb.dataset.v; sb.parentElement.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', String(b === sb))); return; }
      const a = e.target.closest('[data-rfact]'); if(!a) return;
      if(a.dataset.rfact === 'back'){ openRun(run.id); return; }
      const err = box.querySelector('#pfRunErr'); err.textContent = '';
      const deck = decks.find(d=>d.id === val('deck'));
      const name = val('name').trim(), date = val('date'), players = parseInt(val('players'), 10), byes = parseInt(val('byes'), 10) || 0;
      if(!name){ err.textContent = 'Give the event a name.'; return; }
      if(!date || date > todayISO()){ err.textContent = 'Please pick a date that isn\'t in the future.'; return; }
      if(!deck && !val('deckName').trim()){ err.textContent = 'Choose your deck, or type its name.'; return; }
      if(val('players') && !(players >= 2 && players <= 2048)){ err.textContent = 'Players must be a number from 2 to 2048.'; return; }
      if(byes < 0 || byes > 15){ err.textContent = 'Byes must be a number from 0 to 15.'; return; }
      const row = { id: run ? run.id : undefined, name, played_on:date, context:R.ctx, best_of:R.bo,
        deck_id: deck ? deck.id : null, deck_name: deck ? deck.name : val('deckName').trim(),
        deck_code: deck ? (run && run.deck_id === deck.id ? run.deck_code : deck.code) : '',
        players: val('players') ? players : null, placement: val('placement').trim(), venue: val('venue').trim(), byes, notes: val('notes').trim() };
      a.disabled = true; a.textContent = 'Saving…';
      const { data, error } = await API().saveRun(row);
      if(error || !data){ a.disabled = false; a.textContent = run ? 'Save changes' : 'Create run'; err.textContent = errMsg(error) || 'Could not save. Please try again.'; return; }
      const i = (S.runs || []).findIndex(r=>r.id === data.id);
      S.runs = S.runs || []; if(i >= 0) S.runs[i] = data; else S.runs.unshift(data);
      /* trigger match_runs_sync sudah memperbarui ronde di server — samakan salinan lokal */
      (S.logs || []).forEach(l=>{ if(l.run_id === data.id){ l.played_on = data.played_on; l.context = data.context; l.deck_id = data.deck_id; l.deck_name = data.deck_name; l.deck_code = data.deck_code; } });
      /* v7.15 — deck run berganti → jenis deck ronde-rondenya ikut */
      if(run && run.deck_code !== data.deck_code && API().setMyArchetypes && !S.commOff){
        const a = classifyDeck(data.deck_code) || '';
        const rows = (S.logs || []).filter(l=>l.run_id === data.id && (l.my_archetype || '') !== a).map(l=>({ id:l.id, a }));
        if(rows.length){ const r2 = await API().setMyArchetypes(rows); if(!r2.error) rows.forEach(x=>{ const l = S.logs.find(y=>y.id === x.id); if(l) l.my_archetype = x.a || null; }); }
      }
      render(); openRun(data.id); toast(run ? 'Run updated ✓' : 'Run created ✓ Now add your rounds');
    });
  }

  /* ---------- import dari Events ---------- */
  const COLOR_WORDS = { red:'Merah', merah:'Merah', yellow:'Kuning', kuning:'Kuning', blue:'Biru', biru:'Biru', green:'Hijau', hijau:'Hijau', orange:'Orange', oranye:'Orange', jingga:'Orange', purple:'Purple', ungu:'Purple' };
  function guessArch(name){
    const n = String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if(!n) return null;
    const act = (S.arch || []).filter(a=>a.active !== false);
    const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const exact = act.find(a=>norm(a.name) === n || (a.aliases || '').split(',').map(norm).filter(Boolean).includes(n));
    if(exact) return { id:exact.id };
    const inside = act.filter(a=>norm(a.name) && (' ' + n + ' ').includes(' ' + norm(a.name) + ' ')).sort((a,b)=>norm(b.name).length - norm(a.name).length)[0];
    if(inside) return { id:inside.id };
    const cols = [...new Set(n.split(' ').map(w=>COLOR_WORDS[w]).filter(Boolean))].sort((a,b)=>CORDER[a]-CORDER[b]).slice(0, 2);
    if(!cols.length) return null;
    const same = act.filter(a=>(a.colors || []).length === cols.length && cols.every(c=>a.colors.includes(c))).sort((a,b)=>a.sort - b.sort)[0];
    return same ? { id:same.id } : { colors:cols };
  }
  function sameCards(codeA, codeB){
    const a = codeA ? decodeDeck(codeA) : null, b = codeB ? decodeDeck(codeB) : null;
    if(!a || !b) return false;
    const ka = Object.entries(a.deck || {}).sort().join(), kb = Object.entries(b.deck || {}).sort().join();
    return ka.length > 0 && ka === kb;
  }
  function openImport(){
    const all = importable().sort((a,b)=> a.event.event_date < b.event.event_date ? 1 : -1);
    const row = x => { const ev = x.event, fin = ev.status === 'finished';
      return `<div class="pf-trow pf-improw"><span class="pf-th pf-th-x">🏟</span><div class="pf-mm"><b>${E(ev.name)}</b>
        <small>${[fmtDate(ev.event_date), ev.lgs_name || ev.location, 'Bo' + ev.best_of, 'you: ' + x.player.display_name + (x.player.deck_name ? ' · ' + x.player.deck_name : '')].filter(Boolean).map(E).join(' · ')}</small></div>
        ${fin ? `<button type="button" class="btn2 main" data-imp="${E(ev.id)}">Import</button>` : '<span class="bd-mut">still running</span>'}</div>`; };
    const m = mxOpen(`<h3>🏟 Import from Events</h3>
      <p class="bd-mut">Events you joined with this account. Importing creates a tournament run with every round, its result, the game score,
        your placement and your opponents' names. Turn order and how each game ended aren't recorded on Events, so they stay empty: you can add them per round.</p>
      <div class="pf-imp">${all.map(row).join('') || '<p class="bd-mut">Nothing to import.</p>'}</div><p class="pf-err" id="pfImpErr"></p>`, 'pf-mx');
    m.querySelector('.mx-box').addEventListener('click', async e=>{
      const b = e.target.closest('[data-imp]'); if(!b) return;
      const x = all.find(y=>y.event.id === b.dataset.imp); if(!x) return;
      b.disabled = true; b.textContent = 'Importing…';
      const res = await importEvent(x);
      if(res.error){ b.disabled = false; b.textContent = 'Import'; m.querySelector('#pfImpErr').textContent = res.error; return; }
      render(); openRun(res.run.id); toast(`Imported ✓ ${res.n} round${res.n === 1 ? '' : 's'}`);
    });
  }
  async function importEvent(x){
    if(!window.MHREvents || !window.MHREvents.get) return { error:'Events isn\'t available on this page. Please reload.' };
    const ev = x.event, me = x.player;
    const got = await window.MHREvents.get(ev.id);
    if(got.error || !got.data) return { error:'Could not read this event. Please try again.' };
    const { players, matches } = got.data;
    const mine = matches.filter(m=>m.result && (m.player1 === me.id || m.player2 === me.id));
    const byes = Math.min(15, mine.filter(m=>m.result === 'bye' || !m.player2).length);
    let code = '';
    if(window.MHREvents.decklists){ try{ const dl = await window.MHREvents.decklists(ev.id); const r = (dl.data || []).find(d=>d.player_id === me.id); if(r) code = r.deck_code || ''; }catch(e){} }
    const acct = code ? (S.decks || []).find(d=>sameCards(d.code, code)) : null;
    let placement = '';
    try{
      const meRow = players.find(p=>p.id === me.id);
      if(meRow && meRow.dropped) placement = 'Dropped';
      else if(window.MHRSwiss){ const pl = window.MHRSwiss.finalPlacements(players, matches, { bestOf:ev.best_of }); const f = pl.find(p=>p.id === me.id); if(f) placement = f.label; }
    }catch(e){}
    const date = ev.event_date > todayISO() ? todayISO() : ev.event_date;
    const runRow = { name: String(ev.name || 'Event').slice(0, 80), played_on:date, context:'store', best_of: ev.best_of === 3 ? 3 : 1,
      deck_id: acct ? acct.id : null, deck_name: (acct ? acct.name : (me.deck_name || 'Event deck')).slice(0, 60), deck_code: code,
      players: players.length >= 2 ? Math.min(2048, players.length) : null, placement, venue: String(ev.lgs_name || ev.location || '').slice(0, 60), byes, notes:'', event_id: ev.id };
    const { data:run, error } = await API().saveRun(runRow);
    if(error || !run) return { error: errMsg(error) || 'Could not create the run.' };
    const rows = mine.filter(m=>!(m.result === 'bye' || !m.player2)).map(m=>{
      const p1 = m.player1 === me.id; const opp = players.find(p=>p.id === (p1 ? m.player2 : m.player1)) || {};
      const my = p1 ? m.p1_games|0 : m.p2_games|0, th = p1 ? m.p2_games|0 : m.p1_games|0;
      const win = (m.result === 'p1' && p1) || (m.result === 'p2' && !p1);
      let games = [];
      if(run.best_of === 1){ games = [{ r: m.result === 'draw' ? 'D' : win ? 'W' : 'L' }]; }
      else{
        for(let i = 0; i < my; i++) games.push({ r:'W' });
        for(let i = 0; i < th; i++) games.push({ r:'L' });
        games = games.slice(0, 3);
        const w = games.filter(g=>g.r === 'W').length, l = games.filter(g=>g.r === 'L').length;
        const want = m.result === 'draw' ? 'D' : m.result === 'dl' ? 'L' : win ? 'W' : 'L';
        const got2 = w > l ? 'W' : l > w ? 'L' : 'D';
        if(!games.length || got2 !== want) games = [{ r: want }];
      }
      if(m.result === 'dl') games = [{ r:'L' }];
      const g = guessArch(opp.deck_name);
      const a = g && g.id ? archById(g.id) : null;
      return { run_id:run.id, round_no:m.round, is_top: m.stage === 'top', played_on:date, context:'store', best_of:run.best_of,
        deck_id:run.deck_id, deck_name:run.deck_name, deck_code:run.deck_code,
        opp_archetype: a ? a.id : null, opp_label: a ? a.name : (opp.deck_name || '').slice(0, 40), opp_colors: a ? (a.colors || []) : (g && g.colors ? g.colors : []),
        opp_name: String(opp.display_name || '').slice(0, 40), notes:'', games: games.map(x=>({ r:x.r, f:null, e:'unk' })),
        my_archetype: classifyDeck(run.deck_code) || null };
    });
    const ins = await API().saveMany(rows);
    if(ins.error){ await API().removeRun(run.id); return { error: errMsg(ins.error) || 'Could not import the rounds.' }; }
    S.runs = S.runs || []; S.runs.unshift(run); S.logs = (S.logs || []).concat(ins.data || []); updateTile();
    return { run, n:(ins.data || []).length };
  }

  /* =================== GRAFIK TREN =================== */
  let TR = null;
  function trendHTML(list){
    const c = chrono(list); const pts = [];
    for(let i = 0; i < c.length; i++){ const win = c.slice(Math.max(0, i - 9), i + 1); if(win.length < 5) continue; pts.push({ i, v: Math.round(win.filter(m=>m.result === 'W').length / win.length * 100), m:c[i], n:win.length }); }
    if(pts.length < 2){ TR = null; return ''; }
    /* lebar SVG = lebar kartu sebenarnya, supaya teks sumbu tetap ukuran normal di layar lebar maupun HP */
    const wrapW = (q1('#perfWrap') && q1('#perfWrap').clientWidth) || 640;
    const W = Math.max(300, Math.min(1180, wrapW - 30)), H = W < 560 ? 170 : 200, pl = 36, pr = 12, pt = 14, pb = 24;
    const x = i => pl + (i - pts[0].i) / ((pts[pts.length - 1].i - pts[0].i) || 1) * (W - pl - pr);
    const y = v => pt + (100 - v) / 100 * (H - pt - pb);
    TR = { pts, x, y, W, H };
    let grid = '';
    [0, 25, 50, 75, 100].forEach(v=>{ grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? '#566274' : '#232b36'}" stroke-width="1"${v === 50 ? ' stroke-dasharray="4 4"' : ''}/><text x="${pl - 6}" y="${y(v) + 4}" fill="#8B96A5" font-size="10" text-anchor="end">${v}%</text>`; });
    const months = new Map(); pts.forEach(p=>{ const k = p.m.played_on.slice(0, 7); if(!months.has(k)) months.set(k, p); });
    const mx = [...months.values()].map(p=>`<text x="${x(p.i)}" y="${H - 7}" fill="#8B96A5" font-size="10" text-anchor="middle">${new Date(p.m.played_on + 'T12:00:00').toLocaleDateString('en-GB', { month:'short' })}</text>`).join('');
    const path = pts.map((p, j)=>(j ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<div class="pf-card"><h4>Win rate over time <span class="bd-sp"></span><small>average of your last 10 matches</small></h4>
      <div class="pf-trend" id="pfTrend"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Win rate over time, now ${last.v}%">${grid}${mx}
        <path d="${path}" fill="none" stroke="#3987e5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(last.i)}" cy="${y(last.v)}" r="4.5" fill="#3987e5" stroke="#171D24" stroke-width="2"/>
        <text x="${x(last.i) - 8}" y="${Math.max(12, y(last.v) - 10)}" fill="#EDE7DA" font-size="11" font-weight="700" text-anchor="end">${last.v}% now</text>
        <line class="pf-xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="#8B96A5" stroke-width="1" opacity="0"/>
        <circle class="pf-xd" r="5" fill="#3987e5" stroke="#171D24" stroke-width="2" opacity="0"/>
        <rect class="pf-hit" x="${pl}" y="0" width="${W - pl - pr}" height="${H}" fill="transparent"/></svg><div class="pf-tip" hidden></div></div></div>`;
  }
  function wireTrend(){
    const box = q1('#pfTrend'); if(!box || !TR) return;
    const svg = box.querySelector('svg'), hit = box.querySelector('.pf-hit'), xh = box.querySelector('.pf-xh'), xd = box.querySelector('.pf-xd'), tip = box.querySelector('.pf-tip');
    const move = ev=>{
      const r = svg.getBoundingClientRect(); const cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width * TR.W;
      let best = TR.pts[0]; TR.pts.forEach(p=>{ if(Math.abs(TR.x(p.i) - cx) < Math.abs(TR.x(best.i) - cx)) best = p; });
      const bx = TR.x(best.i), by = TR.y(best.v);
      xh.setAttribute('x1', bx); xh.setAttribute('x2', bx); xh.setAttribute('opacity', 1);
      xd.setAttribute('cx', bx); xd.setAttribute('cy', by); xd.setAttribute('opacity', 1);
      const m = best.m; tip.hidden = false;
      tip.innerHTML = `<b>${best.v}% · last ${best.n} matches</b>${E(fmtDate(m.played_on))} · ${E(myDeck(m).name)} vs ${E(oppDeck(m).name)} · ${m.result}`;
      const px = bx / TR.W * r.width; tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, px - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, by / TR.H * r.height - 56) + 'px';
    };
    const leave = ()=>{ tip.hidden = true; xh.setAttribute('opacity', 0); xd.setAttribute('opacity', 0); };
    hit.addEventListener('mousemove', move); hit.addEventListener('touchstart', move, { passive:true }); hit.addEventListener('touchmove', move, { passive:true });
    hit.addEventListener('mouseleave', leave); hit.addEventListener('touchend', leave);
  }

  /* =================== DETAIL MATCHUP =================== */
  function openMu(key){
    const list = filtered().filter(l=>oppKey(l) === key); if(!list.length) return;
    const d = oppDeck(list[0]); const s = stats(list);
    const arch = key.startsWith('x:') ? null : archById(key);
    const c = chrono(list).reverse();
    const m = mxOpen(`<h3 class="pf-muh">${thumb(d.cover)} vs ${E(d.name)} ${dots(d.cols)}</h3>
      <p class="bd-mut">In the current filter (${E(S.f.per === 'all' ? 'all time' : 'last ' + S.f.per + ' days')}${S.f.ctx ? ', ' + E(CTX[S.f.ctx].label) : ''}).</p>
      <div class="pf-kpis pf-kpis4">
        <div class="pf-kpi"><span class="k">Record</span><b>${rec(s)}</b><small>${s.n} match${s.n === 1 ? '' : 'es'}</small></div>
        <div class="pf-kpi"><span class="k">Match win rate</span><b>${pv(s.wr)}</b><small>games ${s.gW}/${s.gN}</small></div>
        <div class="pf-kpi"><span class="k">Going 1st</span><b>${pv(s.fwr)}</b><small>${s.fN} games</small></div>
        <div class="pf-kpi"><span class="k">Going 2nd</span><b>${pv(s.swr)}</b><small>${s.sN} games</small></div></div>
      <div class="pf-grid2"><div class="pf-card"><h4>By my deck</h4>${decksHTML(list)}</div><div class="pf-card"><h4>How games end</h4>${endsHTML(list)}</div></div>
      <div class="pf-card"><h4>Matches <span class="bd-sp"></span><small>${list.length}</small></h4>${c.slice(0, 30).map(l=>matchRow(l)).join('')}${c.length > 30 ? `<p class="bd-mut">+ ${c.length - 30} older matches (see Recent matches → Show all).</p>` : ''}</div>
      ${arch && arch.active !== false ? `<div class="bd-btns"><span class="bd-sp"></span><button type="button" class="btn2 main" data-muact="log">＋ Log a match vs ${E(d.name)}</button></div>` : ''}`, 'pf-mx pf-mxw');
    m.querySelector('.mx-box').addEventListener('click', async e=>{
      if(e.target.closest('[data-muact="log"]')){ openLog({ opp:key }); return; }
      const rn = e.target.closest('[data-pfrun]'); if(rn){ openRun(rn.dataset.pfrun); return; }
      const dk = e.target.closest('[data-pfdeck]'); if(dk){ openDeck(dk.dataset.pfdeck); return; }
      const ed = e.target.closest('[data-pfedit]'); if(ed){ const l = (S.logs || []).find(x=>x.id === ed.dataset.pfedit); if(l) openLog({ edit:l }); return; }
      const del = e.target.closest('[data-pfdel]');
      if(del){
        const l = (S.logs || []).find(x=>x.id === del.dataset.pfdel); if(!l) return;
        if(!confirm(`Delete this match (${l.result} vs ${oppDeck(l).name}, ${fmtDate(l.played_on)})? This can't be undone.`)) return;
        const { error } = await API().remove(l.id); if(error){ alert(errMsg(error)); return; }
        S.logs = S.logs.filter(x=>x.id !== l.id); updateTile(); render();
        if(filtered().some(x=>oppKey(x) === key)) openMu(key); else mxClose();
      }
    });
  }

  /* =================== SHARE RUN SEBAGAI GAMBAR =================== */
  const RUN_FMT = {
    story: { W:1080, H:1920, top:150, bottom:175, pad:72, title:66, label:'Story 9:16 (1080×1920)' },
    post:  { W:1080, H:1350, top:74,  bottom:65,  pad:72, title:54, label:'Post 4:5 (1080×1350)' },
  };
  const imgCache = new Map();
  function loadImg(src){
    if(!src) return Promise.resolve(null);
    if(!imgCache.has(src)) imgCache.set(src, new Promise(res=>{ const im = new Image(); im.decoding = 'async'; im.onload = () => res(im.naturalWidth ? im : null); im.onerror = () => res(null); im.src = src; }));
    return imgCache.get(src);
  }
  async function cardImg(no){
    if(!no) return null;
    const tries = [artFile(no)]; if(typeof altArtFile === 'function'){ const a = altArtFile(no); if(a) tries.push(a); }
    for(const s of tries){ const im = await loadImg(s); if(im) return im; }
    return null;
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fitText(ctx, text, maxW){ text = String(text); if(ctx.measureText(text).width <= maxW) return text; let s = text; while(s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }
  function wrapLines(ctx, text, maxW){ const words = String(text).split(/\s+/); const out = []; let cur = ''; words.forEach(w=>{ const t2 = cur ? cur + ' ' + w : w; if(ctx.measureText(t2).width > maxW && cur){ out.push(cur); cur = w; } else cur = t2; }); if(cur) out.push(cur); return out; }
  function drawCover(ctx, im, x, y, w, h, r){
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
    if(im){ const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) ; const sw = w / s, sh = h / s; const sx = (im.naturalWidth - sw) / 2, sy = Math.max(0, (im.naturalHeight - sh) * 0.18); ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h); }
    else { ctx.fillStyle = '#1F2731'; ctx.fillRect(x, y, w, h); }
    ctx.restore(); ctx.strokeStyle = '#2C3644'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, r); ctx.stroke();
  }
  async function renderRunImage(run, fmtKey, opt){
    const F = RUN_FMT[fmtKey] || RUN_FMT.story; const { W, H, pad } = F;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const body = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const disp = (getComputedStyle(document.documentElement).getPropertyValue('--disp') || '').trim() || body;
    const mono = (getComputedStyle(document.documentElement).getPropertyValue('--mono') || '').trim() || 'monospace';
    const st = runStats(run); const d = myDeck(run);
    ctx.fillStyle = '#0B0E12'; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, 900); g.addColorStop(0, col + '30'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    glow(W, 0, '#F2B01E'); glow(0, H, '#E4442E');
    /* header */
    let y = F.top;
    const logo = await loadImg('icons/logo-header.png?v=7.03');
    if(logo){ const lh = 55, lw = lh * logo.naturalWidth / logo.naturalHeight; ctx.drawImage(logo, pad, y, lw, lh); }
    else { ctx.fillStyle = '#fff'; ctx.font = `800 40px ${disp}`; ctx.textBaseline = 'middle'; ctx.fillText('MHR DECK LAB', pad, y + 28); }
    ctx.textBaseline = 'middle'; ctx.font = `800 24px ${body}`;
    const chip = (run.placement || 'Tournament run').toUpperCase();
    const chipW = ctx.measureText(chip).width + 36;
    ctx.fillStyle = '#F2B01E'; rr(ctx, W - pad - chipW, y + 6, chipW, 44, 8); ctx.fill();
    ctx.fillStyle = '#1A1200'; ctx.textAlign = 'center'; ctx.fillText(chip, W - pad - chipW / 2, y + 29); ctx.textAlign = 'left';
    y += 55;
    /* tinggi isi dihitung dulu supaya blok isi berada di tengah ruang antara header dan footer */
    const story = fmtKey === 'story';
    const footTop = H - F.bottom - 92;
    const nR = Math.max(1, st.rounds.length), gap = 10;
    ctx.font = `800 ${F.title}px ${disp}`;
    let ts = F.title, lines = wrapLines(ctx, run.name.toUpperCase(), W - 2 * pad);
    if(lines.length > 1){ ts = Math.round(F.title * 0.84); ctx.font = `800 ${ts}px ${disp}`; lines = wrapLines(ctx, run.name.toUpperCase(), W - 2 * pad).slice(0, 2); }
    const rs = story ? 112 : 88, bh = story ? 132 : 104;
    const headH = 26 + lines.length * ts * 1.04 + (story ? 34 : 22) + rs * 0.8 + (story ? 40 : 26) + (opt.deck ? bh + 20 : 0);
    let rh = Math.min(story ? 104 : 78, Math.floor((footTop - 20 - (y + 34) - headH - gap * (nR - 1)) / nR));
    rh = Math.max(34, rh);
    const used = headH + nR * rh + gap * (nR - 1);
    y += Math.max(34, Math.min(story ? 220 : 150, (footTop - 20 - y - used) / 2));
    /* eyebrow + judul */
    ctx.textBaseline = 'alphabetic';
    const eyebrow = [fmtDate(run.played_on) + ' ' + run.played_on.slice(0, 4), run.players ? run.players + ' players' : '', run.venue].filter(Boolean).join(' · ').toUpperCase();
    ctx.font = `600 26px ${body}`; ctx.fillStyle = '#8A94A3'; y += 26; ctx.fillText(fitText(ctx, eyebrow, W - 2 * pad), pad, y);
    ctx.font = `800 ${ts}px ${disp}`;
    ctx.fillStyle = '#FFFFFF'; lines.forEach(l=>{ y += ts * 1.04; ctx.fillText(fitText(ctx, l, W - 2 * pad), pad, y); });
    /* rekor */
    y += fmtKey === 'story' ? 34 : 22;
    const recTxt = st.rounds.length ? rec(st.swiss) : '–';
    ctx.font = `800 ${rs}px ${disp}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(recTxt, pad, y + rs * 0.8);
    const rw = ctx.measureText(recTxt).width;
    ctx.font = `600 ${fmtKey === 'story' ? 28 : 24}px ${body}`; ctx.fillStyle = '#C0C8D2';
    const sub1 = 'Swiss record' + (run.byes ? ` + ${run.byes} bye${run.byes > 1 ? 's' : ''}` : ''), sub2 = st.top.n ? `Top cut ${rec(st.top)}` : ('Best of ' + run.best_of);
    ctx.fillText(sub1, pad + rw + 28, y + rs * 0.42); ctx.fillText(sub2, pad + rw + 28, y + rs * 0.42 + (fmtKey === 'story' ? 38 : 32));
    y += rs * 0.8 + (fmtKey === 'story' ? 40 : 26);
    /* kotak deck */
    if(opt.deck){
      ctx.fillStyle = 'rgba(255,255,255,.04)'; rr(ctx, pad, y, W - 2 * pad, bh, 18); ctx.fill(); ctx.strokeStyle = '#262C36'; ctx.lineWidth = 2; ctx.stroke();
      drawCover(ctx, await cardImg(d.cover), pad + 14, y + 14, bh - 28, bh - 28, 12);
      const tx = pad + bh + 6;
      ctx.font = `800 ${fmtKey === 'story' ? 40 : 34}px ${disp}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(fitText(ctx, d.name, W - pad - tx - 20), tx, y + bh * 0.47);
      ctx.font = `500 ${fmtKey === 'story' ? 25 : 22}px ${body}`; ctx.fillStyle = '#8A94A3';
      const cols = (d.cols || []).map(c=>WARNA_EN_SAFE(c)).join(' / ');
      let cx = tx; (d.cols || []).forEach(c=>{ ctx.fillStyle = (window.HEXC || {})[c] || (typeof HEXC !== 'undefined' ? HEXC[c] : '#888'); ctx.beginPath(); ctx.arc(cx + 9, y + bh * 0.72, 9, 0, Math.PI * 2); ctx.fill(); cx += 24; });
      ctx.fillStyle = '#8A94A3'; ctx.fillText(fitText(ctx, [cols, 'Best of ' + run.best_of].filter(Boolean).join(' · '), W - pad - cx - 20), cx + 6, y + bh * 0.72 + 9);
      y += bh + 20;
    }
    /* daftar ronde */
    const fs = Math.round(rh * 0.36);
    const imgs = await Promise.all(st.rounds.map(l=>cardImg(oppDeck(l).cover)));
    for(let i = 0; i < st.rounds.length; i++){
      const l = st.rounds[i]; const o = oppDeck(l); const yy = y + i * (rh + gap);
      if(yy + rh > footTop - 6) break;
      ctx.fillStyle = '#12161C'; rr(ctx, pad, yy, W - 2 * pad, rh, 12); ctx.fill(); ctx.strokeStyle = l.is_top ? '#6b5212' : '#262C36'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `700 ${Math.round(fs * 0.9)}px ${mono}`; ctx.fillStyle = '#8A94A3'; ctx.textBaseline = 'middle';
      const lab = roundLabel(l).replace('Semifinal', 'Semi').replace('Quarterfinal', 'Quarter');
      ctx.fillText(fitText(ctx, lab, 120), pad + 18, yy + rh / 2);
      const ix = pad + (story ? 150 : 136), isz = rh - 16;
      if(imgs[i]) drawCover(ctx, imgs[i], ix, yy + 8, isz, isz, 8);
      else { let dx = ix + 6; (o.cols || []).forEach(c=>{ ctx.fillStyle = (typeof HEXC !== 'undefined' && HEXC[c]) || '#888'; ctx.beginPath(); ctx.arc(dx + 9, yy + rh / 2, 9, 0, Math.PI * 2); ctx.fill(); dx += 22; }); }
      const g = l.games || []; const w = g.filter(x=>x.r === 'W').length, lo = g.filter(x=>x.r === 'L').length;
      const res = l.result + (l.best_of === 3 && g.length > 1 ? `  ${w}-${lo}` : '');
      ctx.font = `800 ${Math.round(fs * 1.15)}px ${disp}`; ctx.textAlign = 'right';
      ctx.fillStyle = l.result === 'W' ? '#9cc6f5' : l.result === 'L' ? '#f1a3a3' : '#C3C8CF'; ctx.fillText(res, W - pad - 20, yy + rh / 2);
      const resW = ctx.measureText(res).width; ctx.textAlign = 'left';
      const nx = ix + isz + 18; const name = needsDeck(l) ? (opt.names && l.opp_name ? 'vs ' + l.opp_name : 'Opponent') : o.name + (opt.names && l.opp_name ? '  ·  ' + l.opp_name : '');
      ctx.font = `700 ${fs}px ${body}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText(fitText(ctx, name, W - pad - 20 - resW - 24 - nx), nx, yy + rh / 2);
    }
    ctx.textBaseline = 'alphabetic';
    /* footer */
    let fy = footTop + 36;
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 ${fmtKey === 'story' ? 30 : 27}px ${body}`; ctx.fillText('Tracked with MHR Deck Lab', pad, fy);
    ctx.textAlign = 'right'; ctx.fillText('mhrdecklab.com', W - pad, fy); ctx.textAlign = 'left';
    fy += 36; ctx.fillStyle = '#8A94A3'; ctx.font = `500 ${fmtKey === 'story' ? 21 : 19}px ${body}`;
    ctx.fillText(fitText(ctx, 'Card art © MARVEL © JASON · fan-made content, unofficial', W - 2 * pad), pad, fy);
    return cv;
  }
  const toBlob = cv => new Promise(res => cv.toBlob(b => res(b), 'image/png'));
  function downloadBlob(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function openShare(run){
    const m = mxOpen(`<h3>📤 Share your run</h3>
      <p class="bd-mut">An image of “${E(run.name)}” for an Instagram / TikTok story or post, or to send on WhatsApp.</p>
      <div class="bd-form">
        <div class="bd-f"><span>Format</span><div class="pf-seg" id="pfShFmt">${Object.entries(RUN_FMT).map(([k, f], i)=>`<button type="button" data-shfmt="${k}" aria-pressed="${i === 0}">${E(f.label)}</button>`).join('')}</div></div>
        <label class="bd-chk"><input type="checkbox" id="pfShDeck" checked> Show my deck</label>
        <label class="bd-chk"><input type="checkbox" id="pfShNames"> Show opponents' names</label>
        <div class="bd-btns"><button type="button" class="btn2 main" id="pfShGo">Create image</button><button type="button" class="btn2" data-shact="back">Back</button></div>
        <p class="pf-err" id="pfShErr"></p><div class="pf-shout" id="pfShOut"></div></div>`, 'pf-mx');
    const box = m.querySelector('.mx-box'); let fmt = 'story', made = null;
    box.addEventListener('click', async e=>{
      const f = e.target.closest('[data-shfmt]'); if(f){ fmt = f.dataset.shfmt; box.querySelectorAll('[data-shfmt]').forEach(x=>x.setAttribute('aria-pressed', String(x === f))); return; }
      if(e.target.closest('[data-shact="back"]')){ openRun(run.id); return; }
      if(e.target.closest('[data-shdl]')){ if(made) downloadBlob(made.blob, made.name); return; }
      if(e.target.closest('[data-shshare]')){ if(made){ try{ await navigator.share({ files:[new File([made.blob], made.name, { type:'image/png' })], title:run.name, text:`${run.name} · mhrdecklab.com` }); }catch(er){} } return; }
      if(e.target.id !== 'pfShGo') return;
      const btn = e.target; btn.disabled = true; btn.textContent = 'Creating…';
      const out = box.querySelector('#pfShOut'), err = box.querySelector('#pfShErr'); err.textContent = '';
      try{
        const cv = await renderRunImage(run, fmt, { deck: box.querySelector('#pfShDeck').checked, names: box.querySelector('#pfShNames').checked });
        const blob = await toBlob(cv); if(!blob) throw new Error('blob');
        if(made) URL.revokeObjectURL(made.url);
        made = { blob, url: URL.createObjectURL(blob), name: `${slug(run.name) || 'run'}-${fmt}.png` };
        const canShare = !!(navigator.canShare && navigator.canShare({ files:[new File([blob], made.name, { type:'image/png' })] }));
        out.innerHTML = `<div class="bd-btns">${canShare ? '<button type="button" class="btn2 main" data-shshare="1">📤 Share to Instagram / WhatsApp…</button>' : ''}<button type="button" class="btn2${canShare ? '' : ' main'}" data-shdl="1">⬇ Download</button></div>
          <img class="pf-shimg ${fmt}" src="${made.url}" alt="Run image preview">`;
      }catch(er){ err.textContent = 'Couldn\'t create the image on this browser. Please try again, or use another browser.'; }
      btn.disabled = false; btn.textContent = 'Create image again';
    });
  }

  /* =================== v7.15 — JENIS DECK SENDIRI =================== */
  /* deck → archetype: warna harus sama persis; kalau ada beberapa, yang kartu kuncinya ada di deck menang; seri → urutan terkecil */
  function classifyDeck(code){
    if(!code || !S.arch) return null;
    const r = decodeDeck(code); const deck = (r && r.deck) || {};
    if(!Object.keys(deck).length) return null;
    const cols = deckStats(deck).warna;
    const cand = S.arch.filter(a=>a.active !== false && (a.colors || []).length === cols.length && cols.every(c=>a.colors.includes(c)));
    if(!cand.length) return null;
    const keyed = cand.filter(a=>a.key_card && deck[a.key_card]);
    return (keyed.length ? keyed : cand).slice().sort((a,b)=>(a.sort ?? 100) - (b.sort ?? 100) || a.name.localeCompare(b.name))[0].id;
  }
  /* isi my_archetype catatan lama yang masih kosong (hanya saat berbagi aktif; sekali per sesi + saat opt-in) */
  async function backfillMyArch(force){
    if(S.commOff || !S.share || (S.backfilled && !force) || !S.logs || !API().setMyArchetypes) return;
    S.backfilled = true;
    const rows = []; S.logs.forEach(l=>{ if(!l.my_archetype && l.deck_code){ const a = classifyDeck(l.deck_code); if(a) rows.push({ id:l.id, a }); } });
    if(!rows.length) return;
    const { error } = await API().setMyArchetypes(rows);
    if(!error) rows.forEach(r=>{ const l = S.logs.find(x=>x.id === r.id); if(l) l.my_archetype = r.a; });
  }

  /* =================== DATA KOMUNITAS =================== */
  const commKey = () => S.commF.days + '|' + S.commF.scope;
  function communityShell(){
    if(S.commOff) return '';
    return `<div class="pf-card" id="pfComm">${communityInner()}</div>`;
  }
  function optInHTML(){
    if(S.share) return `<p class="pf-share-on">✓ You're adding your games to community data anonymously. <button type="button" class="pf-link" data-cmact="off">Stop sharing</button></p>`;
    return `<div class="pf-optin"><div><b>Add your games to community data?</b>
      <p>Only your deck type, your opponent's deck type, who went first and the results are counted, added together with other players'.
      Your name, your opponents' names, your notes and your deck list are never shared. You can stop at any time and your games stop counting right away.</p></div>
      <button type="button" class="btn2 main" data-cmact="on">Share my games anonymously</button></div>`;
  }
  function communityInner(){
    const tools = `<select data-cmf="days" aria-label="Period">${[['30','Last 30 days'],['90','Last 90 days'],['0','All time']].map(([v,t])=>`<option value="${v}" ${S.commF.days === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select data-cmf="scope" aria-label="Games">${[['all','All games'],['competitive','Store & tournament only']].map(([v,t])=>`<option value="${v}" ${S.commF.scope === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const head = `<h4>🌐 Community matchups <span class="bd-sp"></span><span class="pf-cmtools">${tools}</span></h4>`;
    const d = S.comm && S.comm[commKey()];
    let body;
    if(!d) body = '<p class="bd-mut">Loading community data…</p>';
    else if(d.error) body = `<p class="bd-mut">${E(errMsg(d.error))}</p>`;
    else if(!d.data.enough) body = `<p class="bd-mut pf-cmempty">Not enough shared games yet: <b>${d.data.players}</b> player${d.data.players === 1 ? '' : 's'} sharing <b>${d.data.logs}</b> match${d.data.logs === 1 ? '' : 'es'} in this period.
      Community numbers appear once at least ${d.data.min_players} players share their games${S.share ? '' : ', so yours would help'}.</p>`;
    else body = communityData(d.data);
    return head + optInHTML() + body;
  }
  function communityData(c){
    const cells = c.cells || []; const by = new Map(cells.map(x=>[x.a + '|' + x.b, x]));
    const tot = new Map(); cells.forEach(x=>{ tot.set(x.a, (tot.get(x.a) || 0) + x.games); });
    const metaN = new Map((c.meta || []).map(m=>[m.arch, m.logs]));
    const ids = [...tot.keys()].filter(id=>archById(id)).sort((a,b)=>(metaN.get(b) || 0) - (metaN.get(a) || 0) || tot.get(b) - tot.get(a)).slice(0, 10);
    const short = a => a.name.length > 12 ? a.name.slice(0, 11) + '…' : a.name;
    const head = ids.map(id=>{ const a = archById(id); return `<th title="${E(a.name)}">${thumb(a.key_card, 'pf-cmth')}<span>${E(short(a))}</span></th>`; }).join('');
    const rows = ids.map(r=>{ const ra = archById(r);
      return `<tr><th class="pf-cmrh">${E(ra.name)} ${thumb(ra.key_card, 'pf-cmth')}</th>${ids.map(col=>{
        const x = by.get(r + '|' + col); const ca = archById(col);
        if(r === col) return `<td class="pf-cmmir" title="Mirror match">mirror</td>`;
        if(!x) return `<td class="pf-cmna" title="No games yet">–<small>0 games</small></td>`;
        if(x.wins == null) return `<td class="pf-cmna" title="${E(ra.name)} vs ${E(ca.name)}: not enough games yet">–<small>${x.games} game${x.games === 1 ? '' : 's'}</small></td>`;
        const wr = Math.round(x.wins / x.games * 100);
        return `<td style="background:${cellBg(wr)}" title="${E(ra.name)} vs ${E(ca.name)}: ${wr}% of ${x.games} games">${wr}%<small>${x.games} games</small></td>`; }).join('')}</tr>`; }).join('');
    const mt = c.meta_total || 0;
    const meta = (c.meta || []).filter(m=>archById(m.arch)).slice(0, 8).map(m=>{ const a = archById(m.arch); const p = mt ? Math.round(m.logs / mt * 100) : 0;
      return `<div class="pf-mshare">${thumb(a.key_card, 'pf-cmth')}<span class="pf-mn">${E(a.name)} ${dots(a.colors)}</span><span class="pf-bar"><i style="width:${p}%"></i></span><b>${p}%</b></div>`; }).join('');
    const f = c.first ? Math.round(c.first.wins / c.first.games * 100) : null;
    return `<p class="bd-mut">Game win rate of the deck on the left against the deck on top, from <b>${c.players}</b> players who share their games (${c.logs} matches since ${E(fmtDate(c.since))}).
      A cell needs at least ${c.min_games} games from ${c.min_players} different players before it shows a number.</p>
      ${ids.length ? `<div class="pf-tblwrap"><table class="pf-cm"><tr><th></th>${head}</tr>${rows}</table></div>
      <div class="pf-legend"><span><i style="background:var(--pf-fav)"></i>Left deck favoured</span><span><i style="background:var(--pf-mid)"></i>Even</span><span><i style="background:var(--pf-unf)"></i>Left deck unfavoured</span><span>– = not enough games yet</span></div>` : '<p class="bd-mut">No matchups with known deck types yet.</p>'}
      <div class="pf-grid2 pf-cmgrid"><div><h4>Most played decks <span class="bd-sp"></span><small>share of opponents faced</small></h4>${meta || '<p class="bd-mut">Not enough data yet.</p>'}</div>
        <div><h4>Going first</h4>${f == null ? '<p class="bd-mut">Not enough games with turn order yet.</p>' : `<div class="pf-cmfirst"><b>${f}%</b><span>of games are won by the player who goes first (${c.first.games} games).</span></div>`}</div></div>`;
  }
  async function loadCommunity(force){
    if(S.commOff || !API().community) return;
    const key = commKey(); S.comm = S.comm || {};
    if(S.comm[key] && !force){ paintCommunity(); return; }
    const { data, error } = await API().community(+S.commF.days, S.commF.scope);
    if(error && error.missing){ S.commOff = true; const el = q1('#pfComm'); if(el) el.remove(); return; }
    S.comm[key] = error ? { error } : { data };
    paintCommunity();
  }
  function paintCommunity(){ const el = q1('#pfComm'); if(el) el.innerHTML = communityInner(); }
  document.addEventListener('change', e=>{
    const f = e.target.dataset && e.target.dataset.cmf; if(!f || !e.target.closest('#pfComm')) return;
    S.commF[f] = e.target.value; try{ localStorage.setItem('mhr_perf_comm', JSON.stringify(S.commF)); }catch(er){}
    paintCommunity(); loadCommunity();
  });
  document.addEventListener('click', async e=>{
    const b = e.target.closest('#pfComm [data-cmact]'); if(!b) return;
    const on = b.dataset.cmact === 'on';
    if(!on && !confirm('Stop adding your games to community data? They stop counting right away. You can turn it back on at any time.')) return;
    b.disabled = true;
    const { data, error } = await API().setShare(on);
    b.disabled = false;
    if(error || !data){ alert(errMsg(error) || 'Could not save. Please try again.'); return; }
    S.share = !!data.share_community;
    if(S.share) await backfillMyArch(true);
    S.comm = {}; paintCommunity(); loadCommunity(true);
    toast(S.share ? 'Thanks! Your games now count in community data ✓' : 'You stopped sharing. Your games no longer count.');
  });

  /* =================== DETAIL DECK & VERSI =================== */
  const sigOf = code => { const r = code ? decodeDeck(code) : null; const d = (r && r.deck) || {}; const k = Object.keys(d).sort(); return k.length ? k.map(n=>n + 'x' + d[n]).join(',') : ''; };
  function diffDecks(codeA, codeB){
    const a = ((codeA && decodeDeck(codeA)) || {}).deck || {}, b = ((codeB && decodeDeck(codeB)) || {}).deck || {};
    const out = []; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(no=>{ const d = (b[no] || 0) - (a[no] || 0); if(d) out.push({ no, d }); });
    const nm = no => { const c = DB.find(x=>x.no === no); return c ? (typeof cardName === 'function' ? cardName(c) : (c.nm_en || c.nm)) : no; };
    out.sort((x, y)=>y.d - x.d);
    return { add: out.filter(x=>x.d > 0).reduce((s, x)=>s + x.d, 0), rem: out.filter(x=>x.d < 0).reduce((s, x)=>s - x.d, 0),
      txt: out.map(x=>`${x.d > 0 ? '+' : '−'}${Math.abs(x.d)} ${nm(x.no)}`) };
  }
  async function openDeck(key){
    const list = filtered().filter(l=>myKey(l) === key); if(!list.length) return;
    const d = myDeck(list[0]); const s = stats(list);
    const deckId = list[0].deck_id; const cur = deckId && (S.decks || []).find(x=>x.id === deckId);
    /* versi = isi deck yang sama persis; urut dari pertama dimainkan */
    const groups = new Map();
    chrono(list).forEach(l=>{ const k = sigOf(l.deck_code) || '?'; if(!groups.has(k)) groups.set(k, { k, code:l.deck_code, logs:[] }); groups.get(k).logs.push(l); });
    const vers = [...groups.values()];
    let labels = new Map();
    const verRows = () => {
      let prev = null; let num = 0;
      return vers.map(v=>{ const st = stats(v.logs); const first = v.logs[0].played_on, last = v.logs[v.logs.length - 1].played_on;
        const known = v.k !== '?'; if(known) num++;
        const df = known && prev ? diffDecks(prev.code, v.code) : null; if(known) prev = v;
        const isCur = cur && known && sigOf(cur.code) === v.k;
        const name = !known ? 'List not saved' : (labels.get(v.k) || `Version ${num}`);
        return `<div class="pf-ver"><div class="pf-mm"><b>${E(name)}</b>${isCur ? '<span class="pf-tag pf-ev">current list</span>' : ''}
            <small>${E(fmtDate(first))}${first !== last ? ' – ' + E(fmtDate(last)) : ''} · ${st.n} match${st.n === 1 ? '' : 'es'} · ${rec(st)} · 1st ${pv(st.fwr)} · 2nd ${pv(st.swr)}</small>
            ${df ? `<small class="pf-diff" title="${E(df.txt.join(', '))}">vs previous: <b>+${df.add}</b> / <b>−${df.rem}</b> cards${df.txt.length ? ' · ' + E(df.txt.slice(0, 6).join(', ')) + (df.txt.length > 6 ? ' …' : '') : ''}</small>` : ''}</div>
          <span class="pf-bar" title="${pv(st.wr)}"><i style="width:${st.wr || 0}%"></i></span><b class="pf-wr">${pv(st.wr)}</b></div>`; }).join('');
    };
    const mu = [...groupBy(list, oppKey).entries()].map(([k, l])=>({ k, d:oppDeck(l[0]), s:stats(l) })).sort((a,b)=>b.s.n - a.s.n);
    const myType = (()=>{ const code = (cur && cur.code) || list[list.length - 1].deck_code; const id = classifyDeck(code); const a = id && archById(id); return a ? a.name : ''; })();
    const m = mxOpen(`<h3 class="pf-muh">${thumb(d.cover)} ${E(d.name)} ${dots(d.cols)}</h3>
      <p class="bd-mut">In the current filter (${E(S.f.per === 'all' ? 'all time' : 'last ' + S.f.per + ' days')}${S.f.ctx ? ', ' + E(CTX[S.f.ctx].label) : ''})${myType ? ` · counts as <b>${E(myType)}</b> in community data` : ''}.</p>
      <div class="pf-kpis pf-kpis4">
        <div class="pf-kpi"><span class="k">Record</span><b>${rec(s)}</b><small>${s.n} match${s.n === 1 ? '' : 'es'}</small></div>
        <div class="pf-kpi"><span class="k">Match win rate</span><b>${pv(s.wr)}</b><small>games ${s.gW}/${s.gN}</small></div>
        <div class="pf-kpi"><span class="k">Going 1st</span><b>${pv(s.fwr)}</b><small>${s.fN} games</small></div>
        <div class="pf-kpi"><span class="k">Going 2nd</span><b>${pv(s.swr)}</b><small>${s.sN} games</small></div></div>
      <div class="pf-card"><h4>Versions <span class="bd-sp"></span><small>${vers.filter(v=>v.k !== '?').length} different list${vers.filter(v=>v.k !== '?').length === 1 ? '' : 's'}</small></h4>
        <p class="bd-mut">Each time you change the cards, the next matches count for a new version, so you can see if a change helped.</p>
        <div id="pfVers">${verRows()}</div></div>
      <div class="pf-card"><h4>Matchups with this deck</h4><div class="pf-tblwrap"><table class="pf-tbl"><tr><th>Opponent deck</th><th class="r">Matches</th><th class="r">W-L-D</th><th class="r">Win rate</th><th class="r hm">1st</th><th class="r hm">2nd</th></tr>
        ${mu.map(r=>`<tr class="${r.s.n < MIN_N ? 'low' : ''}"><td><div class="pf-arch">${thumb(r.d.cover)}<div><b>${E(r.d.name)}</b><small>${dots(r.d.cols)}</small></div></div></td><td class="r">${r.s.n}</td><td class="r">${rec(r.s)}</td>
          <td class="r"><span class="pf-cell" style="background:${cellBg(r.s.n < MIN_N ? null : r.s.wr)}">${pv(r.s.wr)}</span></td><td class="r hm">${pv(r.s.fwr)}</td><td class="r hm">${pv(r.s.swr)}</td></tr>`).join('')}</table></div></div>`, 'pf-mx pf-mxw');
    /* label versi yang disimpan manual di riwayat versi deck (v6.97) */
    if(deckId && window.MHRDecks && window.MHRDecks.listVersions){
      try{
        const { data } = await window.MHRDecks.listVersions(deckId);
        (data || []).forEach(v=>{ if(v.label){ const k = sigOf(v.deck_code); if(k && !labels.has(k)) labels.set(k, v.label); } });
        const box = m.querySelector('#pfVers'); if(box && labels.size) box.innerHTML = verRows();
      }catch(er){}
    }
  }
  if(window.MHRAuth && window.MHRAuth.ready && window.MHRAuth.onAuthChange){
    window.MHRAuth.onAuthChange(()=>{ S.logs = null; S.decks = null; S.runs = null; S.entries = null; S.share = null; S.comm = null; S.backfilled = false; });
  }
  window.MHRPerfUI = {
    renderTab, refresh, openLog, openRun, openRunForm, openDeck, classifyDeck,
    reset(){ S.logs = null; S.decks = null; S.err = null; S.runs = null; S.entries = null; },
    _state: S, _stats: stats, _renderRunImage: renderRunImage,
  };
})();
