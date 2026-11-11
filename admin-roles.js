/* ===================================================================
   MHR DECK LAB — admin-roles.js (v7.33)
   ===================================================================
   Peran SUPER-ADMIN (tertinggi) + layar "Admin roles" untuk memberi /
   mencabut peran admin akun lain. Permintaan pemilik 11 Nov 2026:
   akun data2712 = super-admin; fiturnya ada di menu My Lab, hanya untuk
   super-admin.

   - Status super-admin dibaca dari tabel super_admins (kebijakan RLS: akun
     hanya bisa membaca barisnya sendiri). Menu "👑 Admin roles" di My Lab
     hanya tampil kalau barisnya ada.
   - Semua perubahan lewat RPC security definer yang memeriksa ulang
     mhr_is_super_admin() di server: mhr_admin_roles_list / _search / _set.
     Jadi menyembunyikan menu hanya soal tampilan — akun lain yang memanggil
     RPC-nya langsung tetap ditolak (NOT_ALLOWED).
   - Super-admin tidak bisa dicabut adminnya dari sini (IS_SUPER_ADMIN), dan
     super-admin baru hanya bisa ditambah lewat SQL Editor Supabase.
   - Skema: mhr_decklab_v733_super_admin.sql (folder internal).
   Dipanggil ulang dari refreshAccountUI() (index.html) lewat
   window.refreshAdminRoles() tiap kali status login berubah.
   =================================================================== */
(function(){
  'use strict';
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = iso => { try{ return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); }catch(e){ return ''; } };
  const ERR = {
    NOT_ALLOWED: 'Only a super-admin can do this.',
    USER_NOT_FOUND: 'No account with that username.',
    USERNAME_AMBIGUOUS: 'More than one account uses that username. Change it in Supabase first.',
    IS_SUPER_ADMIN: 'A super-admin always stays admin. Change super-admins in the Supabase SQL Editor.',
  };
  const errText = e => {
    if(!e) return '';
    const s = `${e.code || ''} ${e.message || ''}`;
    if(/PGRST202|42883|PGRST205|42P01/.test(s)) return 'This feature isn\'t switched on yet: run mhr_decklab_v733_super_admin.sql in Supabase.';
    const m = /([A-Z_]{6,})/.exec(e.message || ''); return (m && ERR[m[1]]) || ('Something went wrong: ' + (e.message || e.code || 'error'));
  };

  let isSuper = false;
  async function check(){
    const c = client(); if(!c) return false;
    try{
      const s = await window.MHRAuth.getSession(); if(!s || !s.user) return false;
      const { data, error } = await c.from('super_admins').select('user_id').eq('user_id', s.user.id).maybeSingle();
      return !error && !!data;
    }catch(e){ return false; }
  }
  /* item menu My Lab (disisipkan sekali, disembunyikan kalau bukan super-admin) */
  function ensureItem(){
    const menu = document.getElementById('labMenu'); if(!menu) return null;
    let box = document.getElementById('labSuper');
    if(!box){
      box = document.createElement('div'); box.id = 'labSuper'; box.className = 'lab-grid lab-super'; box.hidden = true;
      box.innerHTML = `<button type="button" role="menuitem" data-labact="roles"><span class="lab-ic">👑</span><span class="lab-tx"><b>Admin roles</b><small>Super-admin · give or remove admin access</small></span></button>`;
      const foot = document.getElementById('labFoot');
      menu.insertBefore(box, foot || null);
      box.addEventListener('click', e=>{ if(!e.target.closest('[data-labact="roles"]')) return; if(window.closeLabMenu) window.closeLabMenu(); open(); });
    }
    return box;
  }
  window.refreshAdminRoles = async function(){
    isSuper = await check();
    const box = ensureItem(); if(box) box.hidden = !isSuper;
    window.MHRAdminRoles.isSuper = isSuper;
    if(!isSuper){ const m = document.querySelector('#mxModal .ar-mx'); if(m && typeof mxClose === 'function') mxClose(); }
  };

  /* ---------------- layar Admin roles ---------------- */
  const S = { list:null, err:'', q:'', res:null, msg:'', arm:null };
  async function load(){
    const { data, error } = await client().rpc('mhr_admin_roles_list');
    S.err = error ? errText(error) : ''; S.list = error ? null : data; draw();
  }
  async function search(q){
    S.q = q; if(q.trim().length < 2){ S.res = null; draw(); return; }
    const { data, error } = await client().rpc('mhr_admin_roles_search', { p_q:q });
    if(S.q !== q) return;                         // ketikan yang lebih baru sudah jalan
    S.res = error ? [] : (data || []); if(error) S.msg = errText(error); draw();
  }
  async function setRole(username, admin){
    const { data, error } = await client().rpc('mhr_admin_roles_set', { p_username:username, p_admin:admin });
    S.arm = null;
    if(error){ S.msg = '⚠ ' + errText(error); draw(); return; }
    S.msg = admin ? `✓ @${data.username} is now an admin.` : `✓ @${data.username} is no longer an admin.`;
    if(S.res) S.res = S.res.map(r=>r.username === data.username ? { ...r, admin:data.admin } : r);
    await load();
  }
  function rowAdmin(a){
    const key = 'rv:' + a.username;
    const act = a.super ? `<span class="ar-tag sup">Super-admin</span>`
      : `<button type="button" class="btn2 ar-btn${S.arm === key ? ' warn' : ''}" data-ar="revoke" data-u="${E(a.username)}">${S.arm === key ? 'Confirm remove' : 'Remove admin'}</button>`;
    return `<li class="ar-row"><span class="ar-u"><b>@${E(a.username)}</b>${a.me ? ' <small>(you)</small>' : ''}<small>admin since ${E(day(a.since))}</small></span>${act}</li>`;
  }
  function rowResult(r){
    const key = 'gr:' + r.username;
    const act = r.super ? `<span class="ar-tag sup">Super-admin</span>` : r.admin ? `<span class="ar-tag">Admin</span>`
      : `<button type="button" class="btn2 ar-btn main${S.arm === key ? ' warn' : ''}" data-ar="grant" data-u="${E(r.username)}">${S.arm === key ? 'Confirm' : 'Make admin'}</button>`;
    return `<li class="ar-row"><span class="ar-u"><b>@${E(r.username)}</b></span>${act}</li>`;
  }
  function draw(){
    const body = document.getElementById('arBody'); if(!body) return;
    let h = '';
    if(S.err) h += `<p class="ar-err">${E(S.err)}</p>`;
    else if(!S.list) h += `<p class="ar-mut">Loading…</p>`;
    else {
      h += `<h4>Current admins (${S.list.admins.length})</h4><ul class="ar-list">${S.list.admins.map(rowAdmin).join('')}</ul>`;
      h += `<h4>Add an admin</h4><input type="search" id="arQ" class="ar-q" placeholder="Search username (min. 2 letters)" autocomplete="off" value="${E(S.q)}">`;
      if(S.res) h += S.res.length ? `<ul class="ar-list">${S.res.map(rowResult).join('')}</ul>` : `<p class="ar-mut">No account found.</p>`;
      if(S.list.log.length) h += `<details class="ar-log"><summary>Recent changes</summary><ul>${S.list.log.map(l=>`<li>${E(day(l.at))} · @${E(l.actor)} ${l.action === 'grant' ? 'made' : 'removed'} @${E(l.target)} ${l.action === 'grant' ? 'admin' : 'as admin'}</li>`).join('')}</ul></details>`;
    }
    if(S.msg) h += `<p class="ar-msg">${E(S.msg)}</p>`;
    const had = document.activeElement && document.activeElement.id === 'arQ', pos = had ? document.activeElement.selectionStart : 0;
    body.innerHTML = h;
    if(had){ const q = document.getElementById('arQ'); if(q){ q.focus(); try{ q.setSelectionRange(pos, pos); }catch(e){} } }
  }
  let tmr = 0;
  function open(){
    if(!isSuper || typeof mxOpen !== 'function') return;
    Object.assign(S, { list:null, err:'', q:'', res:null, msg:'', arm:null });
    const m = mxOpen(`<h3>👑 Admin roles</h3><p class="ar-mut">Only super-admins see this. Admins can use every admin tool on the site (News, Weekly Rush LGS, tournaments, Battle Sim, usage stats, binder reports). Changes apply the next time that person opens the site.</p><div id="arBody"></div>`, 'ar-mx');
    const box = m.querySelector('.mx-box');
    box.addEventListener('input', e=>{ if(e.target.id !== 'arQ') return; const v = e.target.value; S.arm = null; S.msg = ''; clearTimeout(tmr); tmr = setTimeout(()=>search(v), 250); });
    box.addEventListener('click', e=>{
      const b = e.target.closest('[data-ar]'); if(!b) return;
      const key = (b.dataset.ar === 'grant' ? 'gr:' : 'rv:') + b.dataset.u;
      if(S.arm !== key){ S.arm = key; S.msg = ''; draw(); return; }      // klik pertama = minta konfirmasi
      b.disabled = true; setRole(b.dataset.u, b.dataset.ar === 'grant');
    });
    draw(); load();
  }
  window.MHRAdminRoles = { isSuper:false, open, refresh: () => window.refreshAdminRoles() };
  /* jaga-jaga kalau refreshAccountUI sudah jalan sebelum berkas ini dimuat */
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>window.refreshAdminRoles());
  else window.refreshAdminRoles();
})();
