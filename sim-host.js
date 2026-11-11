/* ===================================================================
   MHR DECK LAB — sim-host.js (Battle Sim di dalam situs)            v7.29 · 10 November 2026
   ===================================================================
   Tahap O2 versi online simulator (catatan lengkap: mhr-simulator\rencana-versi-online.md & riwayat #63).
   Battle Sim (menu setelah Tournament Decks, sebelum Events — keputusan pemilik O-9) dibuka sebagai <iframe>
   sim/index.html supaya CSS & skrip simulator terpisah total dari situs. Berkas ini:
   - window.MHRSimHost: jembatan yang dipakai simulator di dalam iframe (asal sama) — sesi login (token Supabase untuk
     server Battle Sim), Deck Saya, deck Tournament Decks, klien Supabase (riwayat online & laporan), buka modal login,
     dan mode layar penuh selama permainan.
   - renderSimPage(sub): isi halaman #sim. Selama uji O2 hanya akun admin (tabel admin_users) yang melihat menu & halaman;
     pengunjung lain mendapat pesan singkat, iframe tidak dimuat.
   - Link undangan room privat: #sim/room/KODE (dibagikan lewat WhatsApp) → iframe dibuka langsung di formulir gabung.
   - Kartu admin "🐞 Battle Sim reports" di My Lab: laporan bug & feedback dari tabel sim_feedback (hanya admin, RLS).
   Bergantung pada variabel global di blok <script> utama index.html (isAccountAdmin, isLoggedIn, state, TOURNAMENTS,
   loadTournaments) — semuanya dibaca saat fungsi dipanggil, bukan saat berkas ini dimuat.
   =================================================================== */
(function () {
  'use strict';
  const SIM_URL = 'sim/index.html?v=o2.3';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const q = s => document.querySelector(s);
  const admin = () => (typeof isAccountAdmin !== 'undefined' && isAccountAdmin);
  const loggedIn = () => (typeof isLoggedIn !== 'undefined' && isLoggedIn);

  /* ---------- jembatan untuk simulator di dalam iframe ---------- */
  window.MHRSimHost = {
    version: 1,
    async session() {
      if (!window.MHRAuth || !window.MHRAuth.ready) return null;
      const s = await window.MHRAuth.getSession();
      if (!s || !s.user) return null;
      return { token: s.access_token, userId: s.user.id, username: await window.MHRAuth.getUsername(s), admin: admin() };
    },
    async myDecks() {
      if (!window.MHRDecks || !window.MHRDecks.ready) return [];
      const r = await window.MHRDecks.listMine();
      return (r.data || []).filter(d => d.deck_code).map(d => ({ name: d.name || 'Deck', code: d.deck_code }));
    },
    async tourneyDecks() {
      try { if (typeof loadTournaments === 'function') await loadTournaments(); } catch (e) { /* abaikan */ }
      const list = (typeof TOURNAMENTS !== 'undefined' && Array.isArray(TOURNAMENTS)) ? TOURNAMENTS : [];
      const out = [];
      list.forEach(ev => (ev.top || []).forEach(d => { if (d && d.cd) out.push({ name: [d.pk, d.nm, d.cr ? 'by ' + d.cr : '', ev.nama].filter(Boolean).join(' · ').slice(0, 60), code: d.cd }); }));
      return out;
    },
    client() { return window.MHRAuth && window.MHRAuth.client; },
    openLogin() { if (window.MHRUI && window.MHRUI.openAuthModal) window.MHRUI.openAuthModal(); },
    gameMode(on) { document.body.classList.toggle('sim-full', !!on); sizeFrame(); },
    shareUrl(code) { return location.origin + '/#sim/room/' + code; }
  };

  /* ---------- halaman #sim ---------- */
  function frame() { return q('#simFrame'); }
  function sizeFrame() {
    const f = frame(); if (!f) return;
    if (document.body.classList.contains('sim-full')) { f.style.height = ''; return; }
    const nav = q('#navTabs'), fixedNav = nav && getComputedStyle(nav).position === 'fixed';
    const top = Math.max(0, f.getBoundingClientRect().top + window.scrollY);
    f.style.height = Math.max(420, innerHeight - top - (fixedNav ? nav.offsetHeight : 0)) + 'px';
  }
  addEventListener('resize', sizeFrame);
  let lastRoom = null;
  window.renderSimPage = function (sub) {
    const wrap = q('#simWrap'); if (!wrap) return;
    const room = sub && /^room\/([A-Z0-9]{6})$/i.test(sub) ? sub.slice(5).toUpperCase() : null;
    if (room) lastRoom = room;
    if (!admin()) {
      if (frame()) wrap.innerHTML = '';
      const authReady = window.MHRAuth && window.MHRAuth.ready;
      wrap.innerHTML = '<div class="sim-gate"><h2>⚔️ Battle Sim</h2>' +
        (!loggedIn() ? '<p>Battle Sim is in closed testing. Log in with a tester account to open it.</p>' + (authReady ? '<p><button class="nw-btn ev-main" id="simLogin">Log in</button></p>' : '') :
          '<p>Battle Sim is in closed testing and not open to everyone yet. Thank you for your patience!</p>') +
        (lastRoom ? '<p class="ev-muted">Room invite: <b>' + esc(lastRoom) + '</b>. Keep this link; it will open the room once you have access.</p>' : '') + '</div>';
      const b = q('#simLogin'); if (b) b.onclick = () => window.MHRSimHost.openLogin();
      return;
    }
    let f = frame();
    if (!f) {
      wrap.innerHTML = '<iframe id="simFrame" title="MHR Battle Sim" src="' + SIM_URL + (lastRoom ? '#room=' + lastRoom : '') + '" allow="clipboard-write; web-share; fullscreen"></iframe>';
      f = frame(); lastRoom = null;
    } else if (room) {
      try { f.contentWindow.MHRSimOnline.joinRoom(room); } catch (e) { f.src = SIM_URL + '#room=' + room; }
      lastRoom = null;
    }
    requestAnimationFrame(sizeFrame);
  };
  // Dipanggil setelah status login/admin berubah (refreshAccountUI di index.html).
  window.refreshSimNav = function () {
    const b = q('#navTabs [data-page="sim"]'); if (b) b.hidden = !admin();
    const rb = q('#simRepBox'); if (rb) { rb.hidden = !admin(); if (!admin()) rb.open = false; }
    if (typeof state !== 'undefined' && state.page === 'sim') window.renderSimPage();
    if (!admin()) document.body.classList.remove('sim-full');
  };

  /* ---------- My Lab: laporan Battle Sim (admin) ---------- */
  const KIND = { bug: '🐞 Bug', feedback: '💬 Feedback' };
  async function renderReports() {
    const w = q('#simRepWrap'), c = window.MHRSimHost.client(); if (!w || !c) return;
    w.innerHTML = '<p class="ev-muted">Loading…</p>';
    const st = (q('#simRepFilter') && q('#simRepFilter').value) || 'open';
    let qq = c.from('sim_feedback').select('id,created_at,user_id,kind,message,contact,log_code,server_log,match_id,room,engine,mode,device,lang,status').order('created_at', { ascending: false }).limit(100);
    if (st === 'open') qq = qq.neq('status', 'closed');
    const { data, error } = await qq;
    if (error) { w.innerHTML = '<p class="ev-warn">Reports could not be loaded: ' + esc(error.message) + '</p>'; return; }
    const ids = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
    let names = {};
    if (ids.length) { const p = await c.from('profiles').select('id,username').in('id', ids); (p.data || []).forEach(x => { names[x.id] = x.username; }); }
    w.innerHTML = '<div class="simrep-head"><select id="simRepFilter"><option value="open">New & triaged</option><option value="all">All</option></select> <span class="ev-muted">' + (data || []).length + ' report(s)</span></div>' +
      ((data || []).map(r => {
        const log = r.server_log || r.log_code;
        return '<div class="simrep" data-id="' + r.id + '"><div class="simrep-top"><b>' + (KIND[r.kind] || r.kind) + '</b> · ' + esc(new Date(r.created_at).toLocaleString()) + ' · ' + esc(names[r.user_id] || (r.user_id ? 'user' : 'guest')) +
          (r.contact ? ' · ' + esc(r.contact) : '') + ' <select data-simrep-st>' + ['new', 'triaged', 'closed'].map(s => '<option' + (s === r.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
          '<div class="simrep-msg">' + esc(r.message) + '</div><div class="ev-muted">' + esc([r.mode, r.room ? 'room ' + r.room : '', r.engine ? 'engine v' + r.engine : '', r.device, r.lang].filter(Boolean).join(' · ')) + '</div>' +
          (log ? '<button class="nw-btn" data-simrep-copy="' + esc(log) + '">Copy ' + (r.server_log ? 'server log (full)' : 'log code') + '</button>' : '') + '</div>';
      }).join('') || '<p class="ev-muted">No reports.</p>');
    q('#simRepFilter').value = st;
    q('#simRepFilter').onchange = renderReports;
  }
  document.addEventListener('click', async e => {
    const cp = e.target.closest('[data-simrep-copy]');
    if (cp) { const t = cp.getAttribute('data-simrep-copy'); try { await navigator.clipboard.writeText(t); cp.textContent = 'Copied'; } catch (er) { prompt('Copy', t); } }
  });
  document.addEventListener('change', async e => {
    const s = e.target.closest('[data-simrep-st]'); if (!s) return;
    const id = s.closest('.simrep').dataset.id, c = window.MHRSimHost.client();
    const { error } = await c.from('sim_feedback').update({ status: s.value }).eq('id', id);
    if (error) alert('Status not saved: ' + error.message);
  });
  document.addEventListener('toggle', e => { if (e.target && e.target.id === 'simRepBox' && e.target.open && admin()) renderReports(); }, true);
})();
