/* ===================================================================
   MHR DECK LAB — tower.js (v7.44, 🗼 Control Tower; v7.46 + 🔧 Battle Sim server)
   ===================================================================
   Permintaan pemilik 17 Nov 2026: alat super-admin dipisah dari My Lab
   ke menu sendiri. HANYA super-admin (tabel super_admins, dicek di
   admin-roles.js → window.MHRAdminRoles.isSuper). Admin biasa tidak lagi
   melihat Usage / Battle Sim reports / Binder reports / Verified organizers /
   daftar archetype (keputusan pemilik). Keamanan data tetap di server (RLS /
   RPC); berkas ini hanya mengatur tampilan.

   Tab (hash #tower atau #tower/<tab>, tab terakhir diingat di localStorage
   "mhr_ct_tab"):
     overview  — ringkasan angka + pintasan ke alat admin di halaman lain
     usage     — usage.js        MHRUsage.renderAdmin(el)
     simrep    — sim-host.js     MHRSimHost.renderReports()  (#simRepWrap)
     server    — (berkas ini)    v7.46: maintenance server Battle Sim (dulu panel admin di Battle Sim → Online · private room)
     binders   — binders-ui.js   MHRBindersUI.renderAdmin()  (#bdAdmin)
     org       — events-ui.js    MHREventsAdmin.render(el)
     arch      — perf-ui.js      MHRPerfUI.renderAdmin(el)   (#ctArchHost)
     roles     — admin-roles.js  MHRAdminRoles.renderInto(el)
   Dimuat sesudah sim-host.js; variabel global index.html ($, state, setPage)
   hanya dipakai saat jalan.
   =================================================================== */
(function(){
  'use strict';
  const q = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  const isSuper = () => !!(window.MHRAdminRoles && window.MHRAdminRoles.isSuper);
  const TABS = [
    ['overview', '🧭', 'Overview'],
    ['usage',    '📊', 'Usage'],
    ['simrep',   '🐞', 'Battle Sim reports'],
    ['server',   '🔧', 'Battle Sim server'],
    ['binders',  '🛡', 'Binder reports'],
    ['org',      '🏟', 'Verified organizers'],
    ['arch',     '📈', 'Opponent deck list'],
    ['roles',    '👑', 'Admin roles'],
    ['pin',      '🔑', 'PIN accounts'],   // v7.50 — kode pemulihan baru untuk akun username + PIN
  ];
  const KEY = 'mhr_ct_tab';
  let tab = 'overview', checked = false;
  try{ const v = localStorage.getItem(KEY); if(TABS.some(t=>t[0] === v)) tab = v; }catch(e){}

  /* ---------- tombol nav (tersembunyi kecuali super-admin) ---------- */
  function navBtn(){ return q('#navTabs [data-page="tower"]'); }
  window.refreshTower = function(){
    checked = true;
    const b = navBtn(); if(b) b.hidden = !isSuper();
    if(typeof state !== 'undefined' && state.page === 'tower') window.renderTower();
  };
  /* v7.44 — selain super-admin, Control Tower tidak ada sama sekali: tanpa tombol nav, tanpa isi halaman,
     dan #tower dialihkan ke Home begitu status akun sudah dicek (juga saat logout di halaman ini). */
  function leave(){
    const w = q('#towerWrap'); if(w) w.innerHTML = '';
    setTimeout(()=>{ if(typeof state !== 'undefined' && state.page === 'tower' && typeof setPage === 'function') setPage('beranda'); }, 0);
  }

  /* ---------- halaman ---------- */
  window.renderTower = function(sub){
    if(sub && TABS.some(t=>t[0] === sub)) tab = sub;
    const w = q('#towerWrap'); if(!w) return;
    if(!isSuper()){
      w.innerHTML = '';                 // belum dicek → kosong; sudah dicek & bukan super-admin → ke Home
      if(checked) leave();
      return;
    }
    w.innerHTML = head() +
      `<div class="ct-tabs" role="tablist" aria-label="Control Tower">${TABS.map(([k, ic, lb])=>
        `<button type="button" role="tab" class="ct-tab" data-cttab="${k}" aria-selected="${k === tab}"><span aria-hidden="true">${ic}</span> ${lb}<i class="ct-n" id="ctN-${k}"></i></button>`).join('')}</div>` +
      `<div class="ct-panel" id="ctPanel" role="tabpanel"></div>`;
    drawTab();
    counts();
  };
  function head(){
    return `<div class="ct-head"><h2>🗼 Control Tower</h2><p>Super-admin tools in one place: site usage, player reports, moderation and admin access.</p></div>`;
  }
  function setTab(k){
    tab = k;
    try{ localStorage.setItem(KEY, k); }catch(e){}
    document.querySelectorAll('[data-cttab]').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.cttab === k)));
    history.replaceState(null, '', '#tower' + (k === 'overview' ? '' : '/' + k));
    drawTab();
  }
  function box(title, sub, inner){
    return `<div class="ct-box"><div class="ct-bh"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${inner}</div>`;
  }
  function drawTab(){
    const p = q('#ctPanel'); if(!p) return;
    if(tab === 'overview'){ drawOverview(p); return; }
    if(tab === 'usage'){
      p.innerHTML = box('📊 Usage', 'Guests vs logged-in devices per feature', '<div id="usageWrap"><p class="ct-mut">Loading…</p></div>');
      if(window.MHRUsage) window.MHRUsage.renderAdmin(q('#usageWrap'));
      return;
    }
    if(tab === 'simrep'){
      p.innerHTML = box('🐞 Battle Sim reports', 'Bug reports & feedback from the simulator', '<div id="simRepWrap"><p class="ct-mut">Loading…</p></div>');
      if(window.MHRSimHost && window.MHRSimHost.renderReports) window.MHRSimHost.renderReports();
      return;
    }
    if(tab === 'server'){ drawServer(p); return; }
    if(tab === 'pin'){   // v7.50 — pemain akun PIN yang kehilangan kode pemulihan: buat kode baru, berikan ke pemain (DM)
      p.innerHTML = box('🔑 PIN accounts', 'A player who signed up with a PIN and lost both the PIN and the recovery code: make a new recovery code and send it to them privately (after checking it is really them). They then use "Forgot PIN?" with that code.',
        '<div class="ct-sv-act"><input id="ctPinUser" placeholder="username" autocomplete="off" style="flex:1;min-width:160px;padding:9px 10px;border-radius:8px;border:1px solid var(--line);background:var(--ink);color:var(--paper)">' +
        '<button type="button" class="ct-sv-b main" data-pinreset="1">Make new recovery code</button></div><div id="ctPinOut" class="ct-mut" style="margin-top:10px"></div>');
      return;
    }
    if(tab === 'binders'){
      p.innerHTML = '<div class="bd-admin ct-bd" id="bdAdmin"><b>🛡 Binder reports</b> <span class="bd-mut">Loading…</span></div>';
      if(window.MHRBindersUI && window.MHRBindersUI.renderAdmin) window.MHRBindersUI.renderAdmin();
      return;
    }
    if(tab === 'org'){
      p.innerHTML = '<div id="ctOrg"></div>';
      if(window.MHREventsAdmin) window.MHREventsAdmin.render(q('#ctOrg'));
      return;
    }
    if(tab === 'arch'){
      p.innerHTML = '<div id="ctArchHost"><p class="ct-mut">Loading…</p></div>';
      if(window.MHRPerfUI && window.MHRPerfUI.renderAdmin) window.MHRPerfUI.renderAdmin(q('#ctArchHost'));
      return;
    }
    if(tab === 'roles'){
      p.innerHTML = box('👑 Admin roles', 'Admins can use every admin tool on the site (News, Weekly Rush LGS, tournaments, Battle Sim). Changes apply the next time that person opens the site.', '<div class="ct-roles" id="ctRoles"></div>');
      if(window.MHRAdminRoles && window.MHRAdminRoles.renderInto) window.MHRAdminRoles.renderInto(q('#ctRoles'));
    }
  }

  /* ---------- 🔧 Battle Sim server (v7.46, pindahan dari Battle Sim o2.42) ----------
     Server pertandingan menyimpan status maintenance { start, end, msg } di objek antrean. GET /api/queue = status + jumlah
     permainan berjalan & pemain mencari; POST /api/admin/maint (token login, akun admin) = umumkan / mulai / selesai.
     Selama maintenance: Cari lawan, buat room, dan gabung room ditolak; permainan yang sedang berjalan tetap bisa diselesaikan.
     Pemain melihat banner kuning di Battle Sim (sim-online.js). Server staging dipilih per perangkat (localStorage
     mhrsim.server, asal sama dengan iframe sim/) — Battle Sim di perangkat ini memakainya setelah dimuat ulang. */
  const SV_PROD = 'https://mhr-battle-sim-test.dataanggi2712.workers.dev', SV_STG = 'https://mhr-battle-sim-staging.dataanggi2712.workers.dev';
  const svStaging = () => { try { return localStorage.getItem('mhrsim.server') === 'staging'; } catch(e){ return false; } };
  const svApi = () => svStaging() ? SV_STG : SV_PROD;
  const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };
  let SV = { st:null, err:'', busy:false }, svTimer = null;
  async function svFetch(path, opt){
    const o = Object.assign({ headers:{ 'content-type':'application/json' } }, opt || {});
    if(o.auth){
      delete o.auth;
      const s = window.MHRSimHost && window.MHRSimHost.session ? await window.MHRSimHost.session() : null;
      if(!s || !s.token) return { error:'Log in first.' };
      o.headers.Authorization = 'Bearer ' + s.token;
    }
    try{
      const r = await fetch(svApi() + path, o);
      const j = await r.json().catch(()=>({}));
      if(!r.ok && !j.error) j.error = 'Server error (' + r.status + ').';
      return j;
    }catch(e){ return { error:'Cannot reach the Battle Sim server.' }; }
  }
  async function svLoad(){
    const j = await svFetch('/api/queue');
    if(j.error){ SV.err = j.error; } else { SV.st = j; SV.err = ''; }
    if(tab === 'server' && q('#ctSv')) svDraw();
  }
  async function svSet(body){
    SV.busy = true; svDraw();
    const j = await svFetch('/api/admin/maint', { method:'POST', auth:true, body:JSON.stringify(body) });
    SV.busy = false;
    if(j.error) SV.err = j.error; else { SV.st = j; SV.err = ''; }
    svDraw();
  }
  function drawServer(p){
    p.innerHTML = box('🔧 Battle Sim server', 'Maintenance switch for online play (Find a match & private rooms)', '<div id="ctSv"><p class="ct-mut">Loading…</p></div>');
    svLoad();
    clearInterval(svTimer);
    svTimer = setInterval(()=>{ if(tab !== 'server' || !q('#ctSv')){ clearInterval(svTimer); return; } if(document.visibilityState !== 'hidden') svLoad(); }, 30000);
  }
  function svDraw(){
    const el = q('#ctSv'); if(!el) return;
    const st = SV.st || {}, m = st.maint || null, on = !!(m && m.start && Date.now() >= m.start);
    const status = !SV.st ? '…' : !m ? '🟢 Open — online play is running normally'
      : on ? '🔴 MAINTENANCE since ' + hhmm(m.start) + (m.end ? ' · until ~' + hhmm(m.end) : '')
      : '🟡 Scheduled for ' + hhmm(m.start) + (m.end ? ' · until ~' + hhmm(m.end) : '') + ' (players see a yellow notice)';
    const dis = SV.busy ? ' disabled' : '';
    el.innerHTML =
      `<div class="ct-sv-st${on ? ' on' : m ? ' soon' : ''}"><b>${E(status)}</b>${m && m.msg ? `<span>"${E(m.msg)}"</span>` : ''}${m && m.by ? `<small>set by ${E(m.by)}</small>` : ''}</div>` +
      `<div class="ct-sv-live"><span><b>${st.games != null ? st.games : '?'}</b> game(s) running</span><span><b>${st.waiting != null ? st.waiting : '?'}</b> player(s) searching</span>` +
        `<span>Server: <b>${svStaging() ? 'STAGING (this device)' : 'PRODUCTION'}</b></span><button type="button" class="ct-sv-b sm" data-sv="refresh"${dis}>↻ Refresh</button></div>` +
      `<div class="ct-sv-form"><label>Message for players (optional)<input id="ctSvMsg" maxlength="300" value="${E(m && m.msg || '')}" placeholder="e.g. Fixing card rulings, back soon"></label>` +
        `<label>Expected duration<select id="ctSvDur"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="60">60 min</option><option value="120">2 hours</option><option value="0">Unknown</option></select></label></div>` +
      `<div class="ct-sv-act"><button type="button" class="ct-sv-b" data-sv="in" data-n="30"${dis}>Announce: in 30 min</button><button type="button" class="ct-sv-b" data-sv="in" data-n="15"${dis}>In 15 min</button>` +
        `<button type="button" class="ct-sv-b warn" data-sv="in" data-n="0"${dis}>Start now</button>` +
        (m ? `<button type="button" class="ct-sv-b main" data-sv="off"${dis}>End maintenance</button>` : '') + `</div>` +
      (SV.err ? `<p class="ct-sv-err">${E(SV.err)}</p>` : '') +
      `<p class="ct-mut" style="margin:10px 0 0">Running games are never stopped by this switch. To deploy a new server: turn maintenance on, wait until "game(s) running" shows 0, deploy, then press <b>End maintenance</b> once the new server works (the switch stays on after a deploy).</p>` +
      `<div class="ct-sv-act" style="margin-top:10px"><button type="button" class="ct-sv-b" data-sv="server">${svStaging() ? 'Switch this device back to the PRODUCTION server' : 'Test on the STAGING server (this device)'}</button></div>` +
      `<p class="ct-mut" style="margin:6px 0 0">The staging switch only affects Battle Sim on this device (reload Battle Sim after switching).</p>`;
  }

  /* ---------- Overview: angka + pintasan ---------- */
  const C = { sim:null, bind:null, news:null, org:null, admins:null };
  function drawOverview(p){
    const n = v => v == null ? '<span class="ct-dim">…</span>' : v === -1 ? '<span class="ct-dim">–</span>' : v;
    const card = (k, ic, lb, v, hint, warn) =>
      `<button type="button" class="ct-stat${warn ? ' warn' : ''}" data-ctgo="${k}"><span class="ct-sk">${ic} ${lb}</span><span class="ct-sv">${n(v)}</span><span class="ct-ss">${hint}</span></button>`;
    const link = (href, ic, lb, hint) => `<a class="ct-link" href="${href}"><span>${ic}</span><span><b>${lb}</b><small>${hint}</small></span></a>`;
    p.innerHTML =
      `<div class="ct-stats">` +
        card('simrep', '🐞', 'Battle Sim reports', C.sim, 'new or triaged', C.sim > 0) +
        card('binders', '🛡', 'Binder reports', C.bind, 'binders to review', C.bind > 0) +
        card('news', '📰', 'News drafts', C.news, 'not published yet', false) +
        card('org', '🏟', 'Verified organizers', C.org, 'accounts', false) +
        card('roles', '👑', 'Admins', C.admins, 'incl. super-admins', false) +
      `</div>` +
      `<h3 class="ct-h">Admin tools on other pages</h3>` +
      `<div class="ct-links">` +
        link('#berita', '📰', 'News', 'Write, edit and publish articles') +
        link('#lgs', '📅', 'Weekly Rush LGS', 'Add or edit store schedules') +
        link('#tourney', '🥇', 'Tournament Decks', 'Add a tournament result') +
        link('#event', '🏟', 'Events', 'Manage any event') +
        link('#meta', '🏆', 'User Decks', 'Hide published decks & comments') +
        link('#sim', '⚔️', 'Battle Sim', 'Open the simulator') +
      `</div>`;
  }
  async function counts(){
    const c = client(); if(!c || !isSuper()) return;
    const set = (k, v) => { C[k] = v; const el = q('#ctN-' + ({ sim:'simrep', bind:'binders', org:'org', admins:'roles' }[k] || '')); if(el) el.textContent = v > 0 && (k === 'sim' || k === 'bind') ? v : '';
      if(tab === 'overview' && q('#ctPanel')) drawOverview(q('#ctPanel')); };
    const jobs = [
      (async()=>{ const r = await c.from('sim_feedback').select('id', { count:'exact', head:true }).neq('status', 'closed'); set('sim', r.error ? -1 : (r.count || 0)); })(),
      (async()=>{ const r = window.MHRBinders && window.MHRBinders.adminReports ? await window.MHRBinders.adminReports() : { error:true }; set('bind', r.error ? -1 : (r.data || []).length); })(),
      (async()=>{ const r = window.MHRNews ? await window.MHRNews.list({ limit:100, includeDrafts:true }) : { error:true }; set('news', r.error ? -1 : (r.data || []).filter(x=>x.status !== 'published').length); })(),
      (async()=>{ const r = window.MHREvents && window.MHREvents.listOrganizers ? await window.MHREvents.listOrganizers() : { error:true }; set('org', r.error ? -1 : (r.data || []).length); })(),
      (async()=>{ const r = await c.rpc('mhr_admin_roles_list'); set('admins', r.error || !r.data ? -1 : (r.data.admins || []).length); })(),
    ];
    await Promise.all(jobs.map(j=>j.catch(()=>{})));
  }

  /* ---------- interaksi ---------- */
  document.addEventListener('click', async e=>{
    const pr = e.target.closest('[data-pinreset]');
    if(pr){
      const u = (q('#ctPinUser') || {}).value || '', out = q('#ctPinOut'), c = window.MHRAuth && window.MHRAuth.client;
      if(!u.trim() || !c || !out) return;
      pr.disabled = true; out.textContent = 'Working…';
      const { data, error } = await c.rpc('mhr_admin_pin_reset', { p_username: u.trim() });
      pr.disabled = false;
      if(error){ out.textContent = /USER_NOT_FOUND/.test(error.message) ? 'No account with that username.' : /NOT_PIN_ACCOUNT/.test(error.message) ? 'That account uses email or Google, not a PIN.' : 'Failed: ' + error.message; return; }
      out.innerHTML = 'New recovery code for <b>@' + E(u.trim()) + '</b>: <b style="font-size:18px;letter-spacing:.08em;color:var(--paper)">' + E(data) + '</b><br>Send it privately. The old code no longer works.';
      return;
    }
    if(!e.target.closest('#towerPage')) return;
    const t = e.target.closest('[data-cttab]'); if(t){ setTab(t.dataset.cttab); return; }
    const g = e.target.closest('[data-ctgo]');
    if(g){ if(g.dataset.ctgo === 'news'){ location.hash = '#berita'; return; } setTab(g.dataset.ctgo); return; }
    const v = e.target.closest('[data-sv]'); if(!v || v.disabled) return;
    const a = v.dataset.sv;
    if(a === 'refresh'){ svLoad(); return; }
    if(a === 'off'){ svSet({ off:true }); return; }
    if(a === 'in'){
      const n = +v.dataset.n;
      if(n === 0 && !confirm('Start maintenance now? Find a match and new rooms stop immediately (running games continue).')) return;
      svSet({ inMin:n, durMin:+(q('#ctSvDur')||{}).value || 0, msg:(q('#ctSvMsg')||{}).value || '' });
      return;
    }
    if(a === 'server'){
      try{ if(svStaging()) localStorage.removeItem('mhrsim.server'); else localStorage.setItem('mhrsim.server','staging'); }catch(x){}
      SV.st = null; svDraw(); svLoad();
    }
  });
})();
