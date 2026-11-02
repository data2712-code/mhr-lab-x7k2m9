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
   Laporan (khusus admin) — kartu "📊 Usage" di My Lab: renderAdmin(el) memanggil
   RPC mhr_usage_report (ditolak server untuk akun non-admin).
   Berkas ini tanpa ketergantungan DOM selain renderAdmin(); dimuat sesudah auth.js.
   =================================================================== */
(function(){
  'use strict';
  const PAGES = ['beranda','berita','cards','set','build','meta','tourney','event','lgs','panduan','dukung','dashboard','binder'];
  const FEATURES = [
    ...PAGES.map(p=>'page_' + p),
    'tab_decks', 'tab_coll', 'tab_bind', 'tab_perf',
    'bld_add', 'bld_full', 'bld_share', 'bld_export',
    'mydecks_sync', 'coll_edit', 'binder_edit', 'perf_log', 'perf_run',
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
      ${chart(data.daily || []) || '<p class="bd-mut">No data yet.</p>'}`;
  }

  window.MHRUsage = { mark, flush, renderAdmin, FEATURES, get off(){ return off || optOut(); } };
})();
