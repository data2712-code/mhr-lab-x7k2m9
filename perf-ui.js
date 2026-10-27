/* ===================================================================
   MHR DECK LAB — perf-ui.js (v7.13, Performance Analytics Tahap 1)
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
  const END = { rp:'9 Rush Points', eff:'Card effect', deck:'Deck out', con:'Concede', time:'Time' };
  const END_COL = { rp:'#3987e5', eff:'#d95926', deck:'#199e70', con:'#c98500', time:'#6b7684' };
  const LAST_KEY = 'mhr_perf_last', FILT_KEY = 'mhr_perf_filter';
  const MIN_N = 5;          // matchup dengan < 5 match dianggap belum bisa dipercaya
  const RECENT = 10;
  const ERR = {
    NOT_LOGGED_IN:'Please log in first.', BAD_GAMES:'Please fill in the result of every game.',
    BAD_DATE:'Please pick a date that isn\'t in the future.', '42501':'You have reached the limit of 5,000 matches.',
  };
  const errMsg = e => e ? (e.missing ? 'Performance isn\'t switched on yet on this site.' : (ERR[e.code] || ERR[e.message] || ('Something went wrong: ' + (e.message || e.code || 'error')))) : '';

  const S = { uid:null, logs:null, arch:null, decks:null, err:null, sort:'n', all:false,
    f:{ deck:'', per:'90', ctx:'' } };
  try{ const f = JSON.parse(localStorage.getItem(FILT_KEY) || 'null'); if(f && typeof f === 'object') S.f = { ...S.f, per:f.per || '90', ctx:f.ctx || '' }; }catch(e){}
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
      (m.games || []).forEach(g=>{ s.gN++; if(g.r === 'W') s.gW++; if(g.f){ s.fN++; if(g.r === 'W') s.fW++; } else { s.sN++; if(g.r === 'W') s.sW++; } });
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
    if(u !== S.uid){ S.uid = u; S.logs = null; S.decks = null; S.err = null; S.f.deck = ''; S.all = false; }
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
    const [l, a] = await Promise.all([API().listMine(), API().archetypes(), loadDecks()]);
    S.logs = l.error ? (S.logs || []) : l.data; S.err = l.error || a.error || null;
    if(!a.error) S.arch = a.data;
    updateTile();
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
        <button type="button" class="btn2 main" data-pfact="log">＋ Log your first match</button>
        <p class="bd-mut">Your matches are private. Only you can see them.</p></div>${adminHTML()}`;
      wireAdmin(); return;
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
        <button type="button" class="btn2 main" data-pfact="log">＋ Log match</button>
      </div>
      ${list.length ? statsHTML(list, s) : '<div class="pf-card"><p class="bd-mut">No matches in this filter yet.</p></div>'}
      ${recentHTML(list)}
      ${adminHTML()}`;
    wireAdmin();
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
      <div class="pf-grid2">
        <div class="pf-card"><h4>My decks <span class="bd-sp"></span><small>match win rate</small></h4>${decksHTML(list)}</div>
        <div class="pf-card"><h4>How games end</h4>${endsHTML(list)}</div>
      </div>
      <div class="pf-card"><h4>Matchups</h4>
        <p class="bd-mut">Your record against each opponent deck. Rows with fewer than ${MIN_N} matches are faded: too few to trust yet.</p>
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
    const rows = [...groupBy(list, myKey).values()].map(l=>({ d:myDeck(l[0]), s:stats(l) })).sort((a,b)=>b.s.n - a.s.n);
    return rows.map(r=>`<div class="pf-drow">${thumb(r.d.cover)}<div class="pf-dn"><b>${E(r.d.name)}</b> ${dots(r.d.cols)}
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
    let rows = [...groupBy(list, oppKey).values()].map(l=>({ d:oppDeck(l[0]), s:stats(l) }));
    if(S.sort === 'wr') rows.sort((a,b)=>b.s.wr - a.s.wr || b.s.n - a.s.n);
    else if(S.sort === 'wr-') rows.sort((a,b)=>a.s.wr - b.s.wr || b.s.n - a.s.n);
    else rows.sort((a,b)=>b.s.n - a.s.n || b.s.wr - a.s.wr);
    const arrow = k => S.sort === k ? ' ▾' : S.sort === 'wr-' && k === 'wr' ? ' ▴' : '';
    return `<tr><th>Opponent deck</th><th class="r"><button type="button" data-pfsort="n">Matches${arrow('n')}</button></th><th class="r">W-L-D</th>
      <th class="r"><button type="button" data-pfsort="${S.sort === 'wr' ? 'wr-' : 'wr'}">Win rate${arrow('wr')}</button></th><th class="r hm">1st</th><th class="r hm">2nd</th><th class="r hm">Games</th></tr>` +
      rows.map(r=>{ const low = r.s.n < MIN_N;
        return `<tr class="${low ? 'low' : ''}"><td><div class="pf-arch">${thumb(r.d.cover)}<div><b>${E(r.d.name)}</b>${low ? '<em class="pf-few">few</em>' : ''}<small>${dots(r.d.cols)} <span class="pf-cn">${E(colsText(r.d.cols)) || 'colours not set'}</span></small></div></div></td>
          <td class="r">${r.s.n}</td><td class="r">${rec(r.s)}</td><td class="r"><span class="pf-cell" style="background:${cellBg(low ? null : r.s.wr)}">${pv(r.s.wr)}</span></td>
          <td class="r hm">${pv(r.s.fwr)}</td><td class="r hm">${pv(r.s.swr)}</td><td class="r hm">${r.s.gW}/${r.s.gN}</td></tr>`; }).join('');
  }
  function matchRow(l){
    const o = oppDeck(l), d = myDeck(l), c = CTX[l.context] || CTX.casual;
    const g = l.games || [];
    const pips = l.best_of === 3 ? `<span class="pf-pips">${g.map(x=>`<i class="${x.r}">${x.r}${x.f ? '¹' : '²'}</i>`).join('')}</span>` : '';
    const how = l.best_of === 3 ? 'Bo3' : (g[0] ? `went ${g[0].f ? '1st' : '2nd'} · ${END[g[0].e] || ''}` : '');
    return `<div class="pf-mrow" data-pfid="${E(l.id)}"><span class="pf-res ${l.result}">${l.result}</span>${thumb(o.cover)}
      <div class="pf-mm"><div><b>${E(o.name)}</b>${pips}<span class="pf-tag">${c.icon} ${E(c.short)}</span></div>
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
      return;
    }
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
      games: ed ? (ed.games || []).map(g=>({ r:g.r, f:!!g.f, e:g.e || 'rp', ft:true })) : [{ r:'W', f:true, e:'rp' }],
    });
    if(ed && ed.opp_archetype && !archById(ed.opp_archetype)){ L.opp = '__other'; L.oCols = [...(ed.opp_colors || [])]; L.oLabel = ed.opp_label || ''; }
    if(!L.opp){ const r = recentOpps(); L.opp = ''; if(r.length === 0) L.opp = '__other'; }
    normGames();
    const m = mxOpen(`<h3>${L.id ? '✏️ Edit match' : '＋ Log a match'}</h3><div id="pfLog"></div>`, 'pf-mx');
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
      <div class="pf-seg" data-g="${i}" data-gf="f" title="Who took the first turn?"><button type="button" data-v="1" aria-pressed="${g.f}">1st</button><button type="button" data-v="0" aria-pressed="${!g.f}">2nd</button></div>
      <select data-g="${i}" data-gf="e" aria-label="How game ${i + 1} ended">${Object.entries(END).map(([k,t])=>`<option value="${k}" ${g.e === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('') +
      (L.bo === 3 && !g3needed() ? '<p class="bd-mut pf-hint">Game 3 is hidden because the match ended 2-0.</p>' : '');
  }
  function drawLog(){
    const box = q1('#pfLog'); if(!box) return;
    const decks = S.decks || [];
    box.innerHTML = `<div class="pf-form">
      <div class="pf-row2">
        <label class="bd-f"><span>My deck</span><select data-lf="deck">${decks.map(d=>`<option value="${E(d.id)}" ${L.deck === d.id ? 'selected' : ''}>${E(d.name)}</option>`).join('')}
          <option value="__other" ${L.deck === '__other' ? 'selected' : ''}>${decks.length ? 'A deck not saved on my account…' : 'Type the deck name…'}</option></select>
          ${L.deck === '__other' ? `<input type="text" data-lf="deckName" maxlength="60" placeholder="Deck name, e.g. Red Blue Aggro" value="${E(L.deckName)}">` : ''}</label>
        <label class="bd-f"><span>Date</span><input type="date" data-lf="date" value="${E(L.date)}" max="${todayISO()}"></label>
      </div>
      <div class="bd-f"><span>Where</span><div class="pf-seg wide" data-lseg="ctx">${Object.entries(CTX).map(([k,c])=>`<button type="button" data-v="${k}" aria-pressed="${L.ctx === k}">${c.icon} ${E(c.label)}</button>`).join('')}</div></div>
      <div class="bd-f"><span>Opponent's deck</span>
        ${(S.arch || []).length > 8 ? `<input type="search" data-lf="q" placeholder="Search deck or colour…" value="${E(L.q)}">` : ''}
        <div class="pf-opps" id="pfOpps">${oppTiles()}</div>
        ${L.opp === '__other' ? `<div class="pf-other"><div class="pf-cpick">${COLS6.map(c=>`<button type="button" data-ocol="${c}" aria-pressed="${L.oCols.includes(c)}"><i style="background:${CMAP[c]}"></i>${E(colName(c))}</button>`).join('')}</div>
          <input type="text" data-lf="oLabel" maxlength="40" placeholder="Deck name (optional), e.g. Blue Hawkeye" value="${E(L.oLabel)}">
          <p class="bd-mut pf-hint">Pick up to 2 colours. If you see a new deck a lot, tell us and we'll add it to the list.</p></div>` : ''}
      </div>
      <div class="pf-row2">
        <div class="bd-f"><span>Format</span><div class="pf-seg" data-lseg="bo"><button type="button" data-v="1" aria-pressed="${L.bo === 1}">Best of 1</button><button type="button" data-v="3" aria-pressed="${L.bo === 3}">Best of 3</button></div></div>
        <label class="bd-f"><span>Opponent's name <em>(optional, only you see it)</em></span><input type="text" data-lf="name" maxlength="40" value="${E(L.name)}" placeholder="e.g. Raka"></label>
      </div>
      <div class="bd-f"><span>Result</span><div id="pfGames">${gamesHTML()}</div>
        <p class="bd-mut pf-hint">1st / 2nd = who took the first turn. The first player has only 1 CALL and no Battle Phase on their first turn, so it's tracked for every game.</p></div>
      <label class="bd-f"><span>Notes <em>(optional)</em></span><textarea data-lf="notes" rows="2" maxlength="500" placeholder="e.g. Kept a hand without Lv1, bricked on turn 2">${E(L.notes)}</textarea></label>
      ${L.err ? `<p class="pf-err">${E(L.err)}</p>` : ''}
      <div class="bd-btns"><span class="bd-mut bd-sp">Your matches are private. Only you can see them.</span>
        <button type="button" class="btn2" data-mxclose>Cancel</button>
        <button type="button" class="btn2 main" data-lact="save" ${L.busy ? 'disabled' : ''}>${L.busy ? 'Saving…' : L.id ? 'Save changes' : 'Save match'}</button></div>
    </div>`;
  }
  function onLogInput(e){
    const f = e.target.dataset.lf;
    if(f){
      if(f === 'deck'){ L.deck = e.target.value; drawLog(); return; }
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
      } else { g.f = gb.dataset.v === '1'; g.ft = true; }
      const box = q1('#pfGames'); if(box) box.innerHTML = gamesHTML(); return;
    }
    if(e.target.closest('[data-lact="save"]')) saveLog();
  }
  async function saveLog(){
    if(L.busy) return;
    L.err = '';
    const deck = (S.decks || []).find(d=>d.id === L.deck);
    if(!deck && !L.deckName.trim()) L.err = 'Choose your deck, or type its name.';
    else if(!L.opp) L.err = 'Choose your opponent\'s deck.';
    else if(L.opp === '__other' && !L.oCols.length && !L.oLabel.trim()) L.err = 'Pick the colours of your opponent\'s deck (or type its name).';
    else if(!L.date || L.date > todayISO()) L.err = 'Please pick a date that isn\'t in the future.';
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
      games: gamesToSave().map(g=>({ r:g.r, f:!!g.f, e:g.e })),
    };
    /* saat edit, deck_code lama dipertahankan kalau deck tidak diganti (riwayat versi deck tetap utuh) */
    if(L.id){ const old = (S.logs || []).find(x=>x.id === L.id); if(old && old.deck_id && deck && old.deck_id === deck.id) row.deck_code = old.deck_code; }
    L.busy = true; drawLog();
    const { data, error } = await API().save(row);
    L.busy = false;
    if(error || !data){ L.err = errMsg(error) || 'Could not save. Please try again.'; drawLog(); return; }
    saveLast({ deck: deck ? deck.id : '', deckName: deck ? '' : row.deck_name, ctx:L.ctx, bo:L.bo });
    S.logs = S.logs || [];
    const i = S.logs.findIndex(x=>x.id === data.id);
    if(i >= 0) S.logs[i] = data; else S.logs.unshift(data);
    mxClose(); updateTile();
    if(q1('#dashPanelPerf') && !q1('#dashPanelPerf').hidden) render();
    toast(`${L.id ? 'Match updated' : 'Match saved'} ✓ ${data.result} vs ${oppDeck(data).name}`);
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
    const head = ['date','where','best_of','my_deck','opponent_deck','opponent_colours','opponent_name','result','games','went_first_game1','notes'];
    const rows = list.map(l=>[l.played_on, (CTX[l.context] || {}).label, 'Bo' + l.best_of, myDeck(l).name, oppDeck(l).name,
      (l.opp_colors || []).map(c=>WARNA_EN_SAFE(c)).join(' / '), l.opp_name, l.result,
      (l.games || []).map(g=>`${g.r} ${g.f ? '1st' : '2nd'} ${END[g.e] || ''}`).join(' | '), l.games && l.games[0] ? (l.games[0].f ? 'yes' : 'no') : '', l.notes]);
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

  if(window.MHRAuth && window.MHRAuth.ready && window.MHRAuth.onAuthChange){
    window.MHRAuth.onAuthChange(()=>{ S.logs = null; S.decks = null; });
  }
  window.MHRPerfUI = {
    renderTab, refresh, openLog,
    reset(){ S.logs = null; S.decks = null; S.err = null; },
    _state: S, _stats: stats,
  };
})();
