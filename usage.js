/* ===================================================================
   MHR DECK LAB — usage.js (v7.25, statistik pemakaian fitur yang anonim)
   ===================================================================
   Tujuan (permintaan pemilik 2 Nov 2026): tahu berapa GUEST dan berapa USER
   LOGIN yang memakai tiap fitur (Deck Builder, My Decks, Collection, Binders,
   Performance, halaman lain) per hari / 7 hari / 30 hari.

   Cara kerja:
     • ID perangkat ANONIM: UUID acak di localStorage ("mhr_dev"). Tidak terhubung
       ke akun, email, atau IP; tidak memakai cookie. Satu browser = satu perangkat.
     • mark('<fitur>') dicatat paling banyak SEKALI per fitur per hari per perangkat
       per status (guest / login) — catatan "sudah dikirim hari ini" di localStorage
       ("mhr_usage_sent"). Antrean dikirim sebagai satu paket ±3 detik kemudian
       (dan saat tab disembunyikan) lewat RPC mhr_track — bukan per klik.
     • Status guest / login DITENTUKAN SERVER dari sesi Supabase (auth.uid()).
     • Browser dengan Global Privacy Control / Do Not Track tidak dicatat sama sekali.
     • Daftar fitur di bawah HARUS sama dengan mhr_usage_features() di
       mhr_decklab_v725_usage.sql; nama di luar daftar diabaikan (klien & server).
     • Kalau migrasi v7.25 belum dijalankan (RPC belum ada), pencatatan berhenti
       diam-diam untuk sesi ini — situs tidak terganggu.
   Laporan (khusus admin) — v7.44: tab "📊 Usage" di 🗼 Control Tower (tower.js, super-admin); v7.45: + bagian Battle Sim
   (renderSim, RPC mhr_sim_usage_report). renderAdmin(el) memanggil
   RPC mhr_usage_report (ditolak server untuk akun non-admin).
   Berkas ini tanpa ketergantungan DOM selain renderAdmin(); dimuat sesudah auth.js.
   =================================================================== */
(function(){
  'use strict';
  const PAGES = ['beranda','berita','cards','set','build','meta','tourney','event','lgs','panduan','dukung','dashboard','binder','sim'];   // v7.45: + sim
  const FEATURES = [
    ...PAGES.map(p=>'page_' + p),
    'tab_decks', 'tab_coll', 'tab_bind', 'tab_perf',
    'bld_add', 'bld_full', 'bld_share', 'bld_export',
    'mydecks_sync', 'coll_edit', 'binder_edit', 'perf_log', 'perf_run',
    // v7.45 — Battle Sim (dikirim simulator di iframe lewat MHRSimHost.mark, lihat sim-host.js)
    'sim_practice', 'sim_friend', 'sim_custom', 'sim_sandbox', 'sim_online', 'sim_finish', 'sim_replay',
  ];
  const DEV_KEY = 'mhr_dev', SENT_KEY = 'mhr_usage_sent';
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  const optOut = () => { try{ return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1'; }catch(e){ return false; } };
  const day = () => new Date().toISOString().slice(0, 10);          // tanggal UTC, sama dengan current_date server
  let queue = new Set(), tmr = 0, off = false, flushing = null;

  function device(){
    try{
      let d = localStorage.getItem(DEV_KEY);
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(d || '')){
        d = (crypto && crypto.randomUUID) ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{ const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
        localStorage.setItem(DEV_KEY, d);
      }
      return d;
    }catch(e){ return null; }
  }
  function sent(){
    try{ const s = JSON.parse(localStorage.getItem(SENT_KEY) || 'null'); if(s && s.d === day() && Array.isArray(s.k)) return s; }catch(e){}
    return { d: day(), k: [] };
  }
  async function role(){
    try{ const s = window.MHRAuth && window.MHRAuth.ready ? await window.MHRAuth.getSession() : null; return s && s.user ? 'u' : 'g'; }catch(e){ return 'g'; }
  }
  function mark(f){
    if(off || optOut() || !FEATURES.includes(f)) return;
    queue.add(f);
    clearTimeout(tmr); tmr = setTimeout(flush, 3000);
  }
  async function flush(){
    clearTimeout(tmr); tmr = 0;
    if(flushing) return flushing;
    flushing = (async ()=>{
      if(off || !queue.size) return;
      const c = client(), dev = device(); if(!c || !dev){ queue.clear(); return; }
      const r = await role(), s = sent();
      const list = [...queue].filter(f=>!s.k.includes(r + ':' + f)); queue.clear();
      if(!list.length) return;
      try{
        const { error } = await c.rpc('mhr_track', { p_device: dev, p_features: list });
        if(error){
          if(/PGRST202|42883|Could not find the function/i.test(`${error.code || ''} ${error.message || ''}`)) off = true;   // migrasi v7.25 belum jalan
          return;
        }
        const s2 = sent(); s2.k = [...new Set([...s2.k, ...list.map(f=>r + ':' + f)])];
        try{ localStorage.setItem(SENT_KEY, JSON.stringify(s2)); }catch(e){}
      }catch(e){}
    })();
    try{ await flushing; } finally { flushing = null; }
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden' && queue.size) flush(); });
  window.addEventListener('pagehide', ()=>{ if(queue.size) flush(); });

  /* =================== laporan admin =================== */
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const GROUPS = [
    ['🛠 Deck Builder', [['page_build','Opened Deck Builder'],['bld_add','Added cards to a deck'],['bld_full','Reached a 50-card deck'],['bld_export','Exported PDF / image'],['bld_share','Copied deck link / table']]],
    ['☁️ My Decks', [['tab_decks','Opened My Decks'],['mydecks_sync','Deck saved to account']]],
    ['🎴 Card Collection', [['tab_coll','Opened Collection'],['coll_edit','Changed collection']]],
    ['📒 Binders', [['tab_bind','Opened Binders'],['binder_edit','Edited a binder'],['page_binder','Viewed a shared binder']]],
    ['📈 Performance', [['tab_perf','Opened Performance'],['perf_log','Logged a match / round'],['perf_run','Saved a tournament run']]],
    ['⚔️ Battle Sim', [['page_sim','Opened Battle Sim'],['sim_practice','Started Practice vs Bot'],['sim_online','Played online (Find a match / room)'],['sim_friend','Started pass-and-play'],['sim_custom','Started a custom game'],['sim_sandbox','Started Sandbox'],['sim_finish','Finished an offline game'],['sim_replay','Watched a replay']]],
    ['🧭 Other pages', [['page_beranda','Home'],['page_cards','Cards'],['page_set','Set'],['page_meta','User Decks'],['page_tourney','Tournament Decks'],['page_event','Events'],['page_lgs','Weekly Rush LGS'],['page_berita','News'],['page_panduan','Guide'],['page_dashboard','My Lab'],['page_dukung','Support']]],
  ];
  function chart(daily){
    if(!daily.length) return '';
    const W = 640, H = 150, P = 26, max = Math.max(1, ...daily.map(d=>Math.max(d.g, d.u)));
    const x = i => P + (daily.length === 1 ? (W - P*2) / 2 : i * (W - P*2) / (daily.length - 1));
    const y = v => H - 18 - v / max * (H - 34);
    const line = (k, col) => `<polyline fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" points="${daily.map((d, i)=>`${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ')}"/>` +
      daily.map((d, i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(d[k]).toFixed(1)}" r="2.6" fill="${col}"><title>${E(d.day)} · ${k === 'g' ? 'guest' : 'login'}: ${d[k]}</title></circle>`).join('');
    return `<svg class="us-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Devices per day">
      <line x1="${P}" x2="${W - P}" y1="${H - 18}" y2="${H - 18}" stroke="#2C3644"/>
      <text x="${P}" y="12" fill="#8B96A5" font-size="10">${max}</text>
      <text x="${P}" y="${H - 4}" fill="#8B96A5" font-size="10">${E(daily[0].day.slice(5))}</text>
      <text x="${W - P}" y="${H - 4}" fill="#8B96A5" font-size="10" text-anchor="end">${E(daily[daily.length - 1].day.slice(5))}</text>
      ${line('g', '#F2B01E')}${line('u', '#3B87E8')}</svg>`;
  }
  async function renderAdmin(el){
    if(!el) return;
    const c = client(); if(!c){ el.innerHTML = '<p class="bd-mut">Not connected.</p>'; return; }
    el.innerHTML = '<p class="bd-mut">Loading usage…</p>';
    const { data, error } = await c.rpc('mhr_usage_report', { p_days: 30 });
    if(error){
      el.innerHTML = /PGRST202|42883|Could not find the function/i.test(`${error.code || ''} ${error.message || ''}`)
        ? '<p class="bd-mut">Usage tracking isn\'t switched on yet (run mhr_decklab_v725_usage.sql in Supabase).</p>'
        : `<p class="bd-mut">Couldn't load usage: ${E(error.message || error.code || 'error')}</p>`;
      return;
    }
    const F = {}; (data.features || []).forEach(r=>{ F[r.f] = r; });
    const n = (r, k) => r && r[k] ? r[k] : 0;
    const cell = (r, k) => `<td class="${n(r, k) ? '' : 'z'}">${n(r, k)}</td>`;
    const A = data.any || {};
    el.innerHTML = `<p class="bd-mut">Devices that used each feature (one browser = one device). Guest = not logged in. Counting started ${E(data.first_day || 'today')} · server day ${E(data.today)} (UTC).</p>
      <div class="us-scroll"><table class="us-tbl">
        <tr><th rowspan="2">Feature</th><th colspan="3" class="g">Guest</th><th colspan="3" class="u">Logged in</th></tr>
        <tr><th class="g">Today</th><th class="g">7 days</th><th class="g">30 days</th><th class="u">Today</th><th class="u">7 days</th><th class="u">30 days</th></tr>
        <tr class="tot"><td>All of the site</td>${cell(A,'g1')}${cell(A,'g7')}${cell(A,'g30')}${cell(A,'u1')}${cell(A,'u7')}${cell(A,'u30')}</tr>
        ${GROUPS.map(([g, rows])=>`<tr class="grp"><td colspan="7">${E(g)}</td></tr>` + rows.map(([k, l])=>{ const r = F[k];
          return `<tr><td>${E(l)}</td>${cell(r,'g1')}${cell(r,'g7')}${cell(r,'g30')}${cell(r,'u1')}${cell(r,'u7')}${cell(r,'u30')}</tr>`; }).join('')).join('')}
      </table></div>
      <h4 class="us-h">Devices per day (last 30 days)</h4>
      <div class="us-leg"><span><i style="background:#F2B01E"></i>Guest</span><span><i style="background:#3B87E8"></i>Logged in</span></div>
      ${chart(data.daily || []) || '<p class="bd-mut">No data yet.</p>'}
      <div id="usSim"><h4 class="us-h">⚔️ Battle Sim — online games</h4><p class="bd-mut">Loading…</p></div>`;
    renderSim(el.querySelector('#usSim'));
  }

  /* v7.45 — laporan Battle Sim (super-admin): RPC mhr_sim_usage_report (mhr_decklab_v745_sim_usage.sql).
     Angka gabungan dari sim_matches (pertandingan online yang disimpan server); hari = WIB. Pemakaian offline
     (Practice, Sandbox, dll.) ada di tabel atas, grup ⚔️ Battle Sim. */
  const END = { rp:'9 Rush Points', deck:'Deck out', time:'Time up', timeouts:'3 timeouts', claim:'Opponent left', conceded:'Conceded', draw:'Draw', other:'Other' };
  function simChart(daily){
    if(!daily.length) return '';
    const W = 640, H = 150, P = 26, n = daily.length, bw = (W - P*2) / n;
    const max = Math.max(1, ...daily.map(d=>Math.max(d.q + d.r, d.p)));
    const y = v => H - 18 - v / max * (H - 34);
    const bars = daily.map((d, i)=>{ const x = P + i * bw + bw * 0.15, w = Math.max(1, bw * 0.7);
      return `<rect x="${x.toFixed(1)}" y="${y(d.q).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - 18 - y(d.q)).toFixed(1)}" fill="#F2B01E"><title>${E(d.day)} · Find a match: ${d.q}</title></rect>` +
        `<rect x="${x.toFixed(1)}" y="${y(d.q + d.r).toFixed(1)}" width="${w.toFixed(1)}" height="${(y(d.q) - y(d.q + d.r)).toFixed(1)}" fill="#3B87E8"><title>${E(d.day)} · private room: ${d.r}</title></rect>`; }).join('');
    const line = `<polyline fill="none" stroke="#39D66C" stroke-width="2.5" stroke-linejoin="round" points="${daily.map((d, i)=>`${(P + (i + .5) * bw).toFixed(1)},${y(d.p).toFixed(1)}`).join(' ')}"/>` +
      daily.map((d, i)=>`<circle cx="${(P + (i + .5) * bw).toFixed(1)}" cy="${y(d.p).toFixed(1)}" r="2.4" fill="#39D66C"><title>${E(d.day)} · players: ${d.p}</title></circle>`).join('');
    return `<svg class="us-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Online games and players per day">
      <line x1="${P}" x2="${W - P}" y1="${H - 18}" y2="${H - 18}" stroke="#2C3644"/>
      <text x="${P}" y="12" fill="#8B96A5" font-size="10">${max}</text>
      <text x="${P}" y="${H - 4}" fill="#8B96A5" font-size="10">${E(String(daily[0].day).slice(5))}</text>
      <text x="${W - P}" y="${H - 4}" fill="#8B96A5" font-size="10" text-anchor="end">${E(String(daily[n - 1].day).slice(5))}</text>
      ${bars}${line}</svg>`;
  }
  async function renderSim(box){
    if(!box) return;
    const c = client(); if(!c) return;
    const { data, error } = await c.rpc('mhr_sim_usage_report', { p_days: 30 });
    const h = '<h4 class="us-h">⚔️ Battle Sim — online games</h4>';
    if(error){
      box.innerHTML = h + (/PGRST202|42883|Could not find the function/i.test(`${error.code || ''} ${error.message || ''}`)
        ? '<p class="bd-mut">Battle Sim report isn\'t switched on yet (run mhr_decklab_v745_sim_usage.sql in Supabase).</p>'
        : `<p class="bd-mut">Couldn't load the Battle Sim report: ${E(error.message || error.code || 'error')}</p>`);
      return;
    }
    const g = data.games || {}, p = data.players || {}, num = v => v == null ? '–' : v;
    const ends = Object.entries(data.ends || {}).sort((a, b)=>b[1] - a[1]);
    const endsN = ends.reduce((s, x)=>s + x[1], 0);
    const rk = data.ranked;
    box.innerHTML = h + `<p class="bd-mut">Online games saved by the Battle Sim server (Find a match + private rooms). Days in WIB · today ${E(data.today)} · first game ${E(data.first_day || '–')}. Offline play (Practice, Sandbox…) is in the ⚔️ Battle Sim rows of the table above.</p>
      <div class="us-kpis">
        <div><span>Games today</span><b>${num((g.q1 || 0) + (g.r1 || 0))}</b><small>${num(g.q1)} Find a match · ${num(g.r1)} room</small></div>
        <div><span>Games · 7 days</span><b>${num((g.q7 || 0) + (g.r7 || 0))}</b><small>${num(g.q7)} Find a match · ${num(g.r7)} room</small></div>
        <div><span>Games · 30 days</span><b>${num((g.qn || 0) + (g.rn || 0))}</b><small>${num(g.qn)} Find a match · ${num(g.rn)} room</small></div>
        <div><span>Players today</span><b>${num(p.p1)}</b><small>accounts that played online</small></div>
        <div><span>Players · 7 days</span><b>${num(p.p7)}</b><small>${num(p.q7)} in Find a match · ${num(p.new7)} new</small></div>
        <div><span>Players · 30 days</span><b>${num(p.pn)}</b><small>${num(p.newn)} played their first game</small></div>
        <div><span>Average game</span><b>${num(data.avg_turns)}</b><small>turns · ${data.avg_min == null ? '–' : E(data.avg_min) + ' min'}</small></div>
        ${rk ? `<div><span>Ranked ${E(rk.season)}</span><b>${num(rk.placed)}</b><small>ranked · ${num((rk.rated || 0) - (rk.placed || 0))} in placement</small></div>` : ''}
        ${data.reports_open != null ? `<div><span>Open reports</span><b>${num(data.reports_open)}</b><small>new or triaged</small></div>` : ''}
      </div>
      <h4 class="us-h">Games & players per day (last 30 days)</h4>
      <div class="us-leg"><span><i style="background:#F2B01E"></i>Find a match</span><span><i style="background:#3B87E8"></i>Private room</span><span><i style="background:#39D66C"></i>Players</span></div>
      ${simChart(data.daily || []) || '<p class="bd-mut">No online games yet.</p>'}
      <div class="us-two">
        <div><h4 class="us-h">How games end (30 days)</h4>${endsN ? `<table class="us-tbl us-sm">${ends.map(([k, v])=>`<tr><td>${E(END[k] || k)}</td><td>${v}</td><td class="z">${Math.round(v / endsN * 100)}%</td></tr>`).join('')}</table>` : '<p class="bd-mut">–</p>'}</div>
        <div><h4 class="us-h">Most active players (30 days)</h4>${(data.top || []).length ? `<table class="us-tbl us-sm"><tr><th>Player</th><th>Games</th><th>Wins</th><th>Find a match</th></tr>${data.top.map(t=>`<tr><td>@${E(t.u)}</td><td>${t.g}</td><td>${t.w}</td><td>${t.q}</td></tr>`).join('')}</table>` : '<p class="bd-mut">–</p>'}</div>
      </div>`;
  }

  window.MHRUsage = { mark, flush, renderAdmin, FEATURES, get off(){ return off || optOut(); } };
})();
