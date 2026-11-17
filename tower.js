/* ===================================================================
   MHR DECK LAB — tower.js (v7.44, 🗼 Control Tower)
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
    ['binders',  '🛡', 'Binder reports'],
    ['org',      '🏟', 'Verified organizers'],
    ['arch',     '📈', 'Opponent deck list'],
    ['roles',    '👑', 'Admin roles'],
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
  document.addEventListener('click', e=>{
    if(!e.target.closest('#towerPage')) return;
    const t = e.target.closest('[data-cttab]'); if(t){ setTab(t.dataset.cttab); return; }
    const g = e.target.closest('[data-ctgo]');
    if(g){ if(g.dataset.ctgo === 'news'){ location.hash = '#berita'; return; } setTab(g.dataset.ctgo); }
  });
})();
