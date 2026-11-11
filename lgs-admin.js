/* ===================================================================
   MHR DECK LAB — lgs-admin.js (jadwal Weekly Rush LGS dari Supabase + editor admin)   v7.31 · 10 November 2026
   ===================================================================
   Permintaan pemilik 10 Nov 2026: admin bisa menambah / mengubah / menghapus jadwal Weekly Rush LGS langsung dari
   halaman #lgs, tanpa mengedit data.js. Jadwal sekarang disimpan di tabel Supabase public.lgs_stores
   (SQL: mhr_decklab_v731_lgs_stores.sql di folder internal; RLS: semua orang membaca, hanya admin_users menulis).

   Cara kerja:
   1. Berkas ini dimuat SETELAH data.js dan SEBELUM blok <script> utama index.html. window.LGS dari data.js adalah
      CADANGAN (dipakai bila Supabase tidak bisa dihubungi atau tabel belum dibuat/kosong).
   2. Saat dimuat: salinan terakhir dari Supabase (localStorage) langsung dipasang ke window.LGS supaya halaman tidak
      berkedip dari data lama ke data baru. Lalu data terbaru diambil dari Supabase dan halaman digambar ulang.
      Array window.LGS diubah DI TEMPAT (index.html & home-ui.js memegang array yang sama).
   3. Admin (isAccountAdmin) melihat bilah "Admin" di atas jadwal (+ Add store) dan tombol Edit di tiap toko.
      Pengunjung lain tidak melihat apa pun yang baru.
   Semua teks dari database dibersihkan (tanpa < > " `) dan tautan divalidasi sebelum ditampilkan, karena renderLgs()
   menulis ke innerHTML. Batas yang sama dipasang sebagai CHECK di tabel.
   =================================================================== */
(function () {
  'use strict';
  const CACHE_KEY = 'mhr.lgs.v1';
  const TZS = ['WIB', 'WITA', 'WIT'];
  const DAYS = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
  const RE_MAP = /^https:\/\/[^\s"<>`]+$/, RE_IG = /^[A-Za-z0-9._]{1,30}$/, RE_HP = /^\d{8,15}$/,
    RE_WA = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9?=&_-]+$/;
  const clean = s => String(s == null ? '' : s).replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const q = s => document.querySelector(s);
  const admin = () => (typeof isAccountAdmin !== 'undefined' && isAccountAdmin);
  const client = () => (window.MHRAuth && window.MHRAuth.ready && window.MHRAuth.client) || null;

  let dbReady = false;      // true setelah Supabase mengembalikan ≥ 1 toko (tabel ada & terisi)
  let dbError = '';         // pesan singkat untuk admin bila tabel belum ada / tidak bisa dihubungi

  /* ---------- baris database → objek LGS (bentuk yang sama dengan data.js) ---------- */
  function normRow(r) {
    if (!r) return null;
    const nm = clean(r.nm).slice(0, 80), map = String(r.map || '');
    if (!nm || !RE_MAP.test(map) || map.length > 300) return null;
    const jd = (Array.isArray(r.jd) ? r.jd : []).map(j => {
      const o = { h: +(j && j.h), w: clean(j && j.w).slice(0, 40) }; const n = clean(j && j.n).slice(0, 40);
      if (n) o.n = n; return o;
    }).filter(j => Number.isInteger(j.h) && j.h >= 1 && j.h <= 7 && j.w);
    if (!jd.length) return null;
    const o = { nm, kota: clean(r.kota).slice(0, 40), tz: TZS.includes(r.tz) ? r.tz : 'WIB', map, jd, _id: r.id, _sort: +r.sort || 0 };
    if (r.ig && RE_IG.test(r.ig)) o.ig = r.ig;
    if (r.hp && RE_HP.test(r.hp)) o.hp = r.hp;
    if (r.wa && RE_WA.test(r.wa) && r.wa.length <= 200) o.wa = r.wa;
    return o;
  }
  const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }); } catch (e) { return ''; } };

  function apply(rows) {
    const list = (rows || []).map(normRow).filter(Boolean);
    if (!list.length || !Array.isArray(window.LGS)) return false;
    window.LGS.length = 0; list.forEach(x => window.LGS.push(x));
    const last = (rows || []).map(r => r.updated_at).filter(Boolean).sort().pop();
    const d = last && fmtDate(last); if (d) window.LGS_UPDATE = d;
    return true;
  }
  function redraw() {
    try {
      if (typeof state === 'undefined') return;
      if (state.page === 'lgs' && typeof window.renderLgs === 'function') window.renderLgs();
      else { const n = q('#navLgs'); if (n) n.textContent = window.LGS.length; }
      if (state.page === 'beranda' && typeof window.renderBeranda === 'function') window.renderBeranda();
    } catch (e) { console.error('[lgs-admin]', e); }
  }

  /* ---------- 1) salinan terakhir dipasang sebelum halaman digambar ---------- */
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Array.isArray(c.rows) && apply(c.rows)) dbReady = true;
  } catch (e) { /* localStorage tidak tersedia / rusak: pakai data.js */ }

  /* ---------- 2) data terbaru dari Supabase ---------- */
  async function load() {
    const c = client(); if (!c) { dbError = 'Supabase is not available.'; return false; }
    try {
      const { data, error } = await c.from('lgs_stores').select('id,nm,kota,tz,map,ig,hp,wa,jd,sort,updated_at').order('sort', { ascending: true }).order('id', { ascending: true });
      if (error) { dbError = /does not exist|schema cache|PGRST205/i.test(error.message || error.code || '') ? 'The lgs_stores table has not been created yet (run the v7.31 SQL).' : (error.message || 'Could not load schedules.'); return false; }
      if (!data || !data.length) { dbError = 'The lgs_stores table is empty (run the v7.31 SQL to import the current schedule).'; dbReady = false; return false; }
      dbError = '';
      if (apply(data)) { dbReady = true; try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), rows: data })); } catch (e) { /* abaikan */ } }
      return true;
    } catch (e) { dbError = 'Could not reach the database.'; return false; }
  }

  /* ---------- 3) tampilan admin ---------- */
  const CSS = `
  #lgsAdminBar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--panel);border:1px dashed var(--accent);border-radius:12px;padding:10px 12px;margin:0 0 12px}
  #lgsAdminBar b{font-family:var(--disp);letter-spacing:.04em;color:var(--accent)}
  #lgsAdminBar small{color:var(--muted);flex:1;min-width:160px}
  #lgsAdminBar button,.lgs-edit{background:var(--panel2);border:1px solid var(--line);color:var(--paper);border-radius:8px;padding:7px 12px;font:inherit;font-size:12.5px;cursor:pointer}
  #lgsAdminBar button:hover,.lgs-edit:hover{border-color:var(--accent);color:var(--accent)}
  #lgsAdminBar button:disabled{opacity:.45;cursor:default}
  .lgsed-ov{position:fixed;inset:0;z-index:1200;background:rgba(6,9,12,.86);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:18px 12px 40px}
  .lgsed{background:var(--panel);border:1px solid var(--line);border-radius:14px;width:100%;max-width:560px;padding:16px}
  .lgsed h3{font-family:var(--disp);font-size:19px;letter-spacing:.03em;margin-bottom:10px}
  .lgsed label{display:block;margin:0 0 10px;font-size:12px;color:var(--muted)}
  .lgsed label span{display:block;margin-bottom:4px}
  .lgsed input,.lgsed select{width:100%;background:var(--ink);border:1px solid var(--line);color:var(--paper);border-radius:8px;padding:9px 10px;font:inherit;font-size:14px}
  .lgsed input:focus,.lgsed select:focus{outline:none;border-color:var(--accent)}
  .lgsed .two{display:grid;grid-template-columns:1fr 130px;gap:10px}
  .lgsed .jd{display:grid;grid-template-columns:120px 1fr 1fr 34px;gap:6px;margin-bottom:6px}
  .lgsed .jd button,.lgsed .add{background:var(--panel2);border:1px solid var(--line);color:var(--paper);border-radius:8px;cursor:pointer;font:inherit}
  .lgsed .add{padding:7px 12px;font-size:12.5px;margin-bottom:12px}
  .lgsed .sec{font-size:12px;color:var(--muted);margin:4px 0 6px}
  .lgsed .err{color:var(--merah);font-size:12.5px;min-height:18px;margin:2px 0 8px}
  .lgsed .acts{display:flex;gap:8px;flex-wrap:wrap}
  .lgsed .acts button{flex:1;min-width:110px;background:var(--panel2);border:1px solid var(--line);color:var(--paper);border-radius:8px;padding:10px;font:inherit;cursor:pointer}
  .lgsed .acts .main{border-color:var(--accent);color:var(--accent);font-weight:700}
  .lgsed .acts .del{flex:none;color:var(--merah)}
  .lgsed .acts button:disabled{opacity:.5;cursor:default}
  @media (max-width:520px){.lgsed .jd{grid-template-columns:1fr 1fr 34px}.lgsed .jd input.n{grid-column:1 / 3}.lgsed .two{grid-template-columns:1fr}}`;
  function ensureCss() { if (q('#lgsAdminCss')) return; const s = document.createElement('style'); s.id = 'lgsAdminCss'; s.textContent = CSS; document.head.appendChild(s); }

  function decorate() {
    const bar = q('#lgsAdminBar');
    if (!admin()) { if (bar) bar.remove(); return; }
    const host = q('#lgsFilter'); if (!host) return;
    ensureCss();
    const html = `<b>ADMIN</b><small>${dbReady ? 'Add, edit or remove Weekly Rush schedules. Changes go live right away.' : esc(dbError || 'Loading schedules from the database…')}</small>` +
      `<button type="button" data-lgs-add${dbReady ? '' : ' disabled'}>＋ Add store</button>`;
    if (bar) { if (bar.dataset.h !== html) { bar.innerHTML = html; bar.dataset.h = html; } }
    else { const b = document.createElement('div'); b.id = 'lgsAdminBar'; b.innerHTML = html; b.dataset.h = html; host.parentNode.insertBefore(b, host); }
    if (!dbReady) return;
    const sel = q('#lgsFilterSel'), kota = sel ? sel.value : '';
    const shown = window.LGS.filter(t => !kota || t.kota === kota);
    document.querySelectorAll('#lgsStores .lgs-store').forEach((el, i) => {
      const t = shown[i]; if (!t || t._id == null || el.querySelector('.lgs-edit')) return;
      const box = el.lastElementChild; if (!box) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'lgs-edit'; b.dataset.lgsEdit = t._id; b.textContent = '✎ Edit';
      box.appendChild(b);
    });
  }

  /* ---------- editor ---------- */
  function jdRow(j) {
    j = j || { h: 1, w: '19:00 - Close' };
    return `<div class="jd"><select class="h" aria-label="Day">${Object.keys(DAYS).map(h => `<option value="${h}"${+h === +j.h ? ' selected' : ''}>${DAYS[h]}</option>`).join('')}</select>` +
      `<input class="w" maxlength="40" value="${esc(j.w)}" placeholder="19:00 - Close" aria-label="Time">` +
      `<input class="n" maxlength="40" value="${esc(j.n || '')}" placeholder="Note (optional)" aria-label="Note">` +
      `<button type="button" data-jd-del title="Remove this schedule" aria-label="Remove this schedule">✕</button></div>`;
  }
  function openEditor(t) {
    closeEditor(); ensureCss();
    const isNew = !t; t = t || { nm: '', kota: '', tz: 'WIB', map: '', jd: [{ h: 1, w: '19:00 - Close' }] };
    const cities = [...new Set(window.LGS.map(x => x.kota).filter(Boolean))];
    const ov = document.createElement('div'); ov.className = 'lgsed-ov'; ov.id = 'lgsEd';
    ov.innerHTML = `<form class="lgsed" novalidate>
      <h3>${isNew ? 'Add store' : 'Edit store'}</h3>
      <label><span>Store name</span><input name="nm" maxlength="80" value="${esc(t.nm)}" required></label>
      <div class="two">
        <label><span>City</span><input name="kota" maxlength="40" list="lgsEdCities" value="${esc(t.kota)}" placeholder="Jakarta" required><datalist id="lgsEdCities">${cities.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label><span>Time zone</span><select name="tz">${TZS.map(z => `<option${z === t.tz ? ' selected' : ''}>${z}</option>`).join('')}</select></label>
      </div>
      <label><span>Google Maps link</span><input name="map" maxlength="300" value="${esc(t.map)}" placeholder="https://maps.app.goo.gl/…" inputmode="url" required></label>
      <label><span>Instagram username (optional)</span><input name="ig" maxlength="80" value="${esc(t.ig || '')}" placeholder="storename"></label>
      <div class="two" style="grid-template-columns:1fr 1fr">
        <label><span>Store WhatsApp number (optional)</span><input name="hp" maxlength="20" value="${esc(t.hp || '')}" placeholder="6281234567890" inputmode="numeric"></label>
        <label><span>WhatsApp group link (optional)</span><input name="wa" maxlength="200" value="${esc(t.wa || '')}" placeholder="https://chat.whatsapp.com/…" inputmode="url"></label>
      </div>
      <div class="sec">Weekly schedule — day, time (the time zone is added automatically), optional note such as "Starter deck only"</div>
      <div id="lgsEdJd">${t.jd.map(jdRow).join('')}</div>
      <button type="button" class="add" data-jd-add>＋ Add another day</button>
      <div class="err" role="alert"></div>
      <div class="acts">
        <button type="submit" class="main">${isNew ? 'Add store' : 'Save changes'}</button>
        <button type="button" data-ed-cancel>Cancel</button>
        ${isNew ? '' : '<button type="button" class="del" data-ed-del>Delete store</button>'}
      </div></form>`;
    ov._store = isNew ? null : t;
    document.body.appendChild(ov);
    const f = ov.querySelector('form');
    f.kota.addEventListener('change', () => { const m = window.LGS.find(x => x.kota.toLowerCase() === f.kota.value.trim().toLowerCase()); if (m) { f.kota.value = m.kota; f.tz.value = m.tz; } });
    f.addEventListener('submit', e => { e.preventDefault(); save(ov); });
    ov.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) { if (e.target === ov) closeEditor(); return; }
      if (b.hasAttribute('data-jd-add')) { const box = q('#lgsEdJd'); if (box.children.length < 14) box.insertAdjacentHTML('beforeend', jdRow()); }
      else if (b.hasAttribute('data-jd-del')) { const box = q('#lgsEdJd'); if (box.children.length > 1) b.closest('.jd').remove(); else setErr(ov, 'A store needs at least one schedule.'); }
      else if (b.hasAttribute('data-ed-cancel')) closeEditor();
      else if (b.hasAttribute('data-ed-del')) {
        if (b.dataset.sure) remove(ov);
        else { b.dataset.sure = '1'; b.textContent = 'Click again to delete'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Delete store'; } }, 4000); }
      }
    });
    f.nm.focus();
  }
  function closeEditor() { const o = q('#lgsEd'); if (o) o.remove(); }
  function setErr(ov, m) { const e = ov.querySelector('.err'); if (e) e.textContent = m || ''; }
  function busy(ov, on) { ov.querySelectorAll('.acts button').forEach(b => { b.disabled = !!on; }); }

  function readForm(ov) {
    const f = ov.querySelector('form');
    const nm = clean(f.nm.value), kota = clean(f.kota.value), tz = f.tz.value, map = f.map.value.trim();
    let ig = f.ig.value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
    let hp = f.hp.value.replace(/[^\d]/g, ''); if (/^0/.test(hp)) hp = '62' + hp.slice(1);
    const wa = f.wa.value.trim();
    if (!nm) return { err: 'Please enter the store name.' };
    if (!kota) return { err: 'Please enter the city.' };
    if (!TZS.includes(tz)) return { err: 'Please choose a time zone.' };
    if (!RE_MAP.test(map)) return { err: 'The Google Maps link must start with https:// and contain no spaces.' };
    if (ig && !RE_IG.test(ig)) return { err: 'Instagram username: letters, numbers, dots and underscores only (no @, no link).' };
    if (hp && !RE_HP.test(hp)) return { err: 'WhatsApp number: digits only, with country code (e.g. 6281234567890).' };
    if (wa && !RE_WA.test(wa)) return { err: 'The WhatsApp group link must look like https://chat.whatsapp.com/…' };
    const jd = [], seen = {};
    for (const r of ov.querySelectorAll('#lgsEdJd .jd')) {
      const h = +r.querySelector('.h').value, w = clean(r.querySelector('.w').value), n = clean(r.querySelector('.n').value);
      if (!w) return { err: 'Please enter a time for every schedule (e.g. 19:00 - Close).' };
      const k = h + '|' + w; if (seen[k]) return { err: 'The same day and time is listed twice.' }; seen[k] = 1;
      const o = { h, w }; if (n) o.n = n; jd.push(o);
    }
    if (!jd.length) return { err: 'A store needs at least one schedule.' };
    jd.sort((a, b) => a.h - b.h);
    return { row: { nm, kota, tz, map, ig: ig || null, hp: hp || null, wa: wa || null, jd } };
  }
  function nextSort(kota) {
    const same = window.LGS.filter(x => x.kota === kota).map(x => x._sort || 0);
    if (same.length) return Math.max.apply(null, same) + 1;      // kota yang sudah ada: tepat sesudah toko terakhir kota itu
    return Math.max.apply(null, [0].concat(window.LGS.map(x => x._sort || 0))) + 10;   // kota baru: paling akhir
  }
  const dbMsg = e => /row-level security|permission denied|42501/i.test((e && (e.message || e.code)) || '') ? 'Only admin accounts can change the schedule. Please log in again.' : ((e && e.message) || 'Could not save. Please try again.');

  async function save(ov) {
    const r = readForm(ov); if (r.err) { setErr(ov, r.err); return; }
    const c = client(); if (!c || !admin()) { setErr(ov, 'Only admin accounts can change the schedule.'); return; }
    setErr(ov, ''); busy(ov, true);
    try {
      const t = ov._store; let res;
      if (t) {
        const row = Object.assign({}, r.row); if (t.kota !== row.kota) row.sort = nextSort(row.kota);
        res = await c.from('lgs_stores').update(row).eq('id', t._id).select('id');
      } else res = await c.from('lgs_stores').insert(Object.assign({ sort: nextSort(r.row.kota) }, r.row)).select('id');
      if (res.error) { setErr(ov, dbMsg(res.error)); busy(ov, false); return; }
      if (!res.data || !res.data.length) { setErr(ov, 'Nothing was saved (the store may have been removed, or this account is not an admin).'); busy(ov, false); return; }
      await load(); closeEditor(); redraw();
    } catch (e) { setErr(ov, 'Could not reach the database. Please try again.'); busy(ov, false); }
  }
  async function remove(ov) {
    const t = ov._store, c = client(); if (!t || !c || !admin()) return;
    if (window.LGS.length <= 1) { setErr(ov, 'The last store cannot be deleted.'); return; }
    setErr(ov, ''); busy(ov, true);
    try {
      const res = await c.from('lgs_stores').delete().eq('id', t._id).select('id');
      if (res.error) { setErr(ov, dbMsg(res.error)); busy(ov, false); return; }
      if (!res.data || !res.data.length) { setErr(ov, 'Nothing was deleted (this account may not be an admin).'); busy(ov, false); return; }
      await load(); closeEditor(); redraw();
    } catch (e) { setErr(ov, 'Could not reach the database. Please try again.'); busy(ov, false); }
  }

  /* ---------- pasang setelah blok <script> utama selesai ---------- */
  function init() {
    if (typeof window.renderLgs === 'function' && !window.renderLgs._lgsAdmin) {
      const orig = window.renderLgs;
      const wrapped = function () { const r = orig.apply(this, arguments); try { decorate(); } catch (e) { console.error('[lgs-admin]', e); } return r; };
      wrapped._lgsAdmin = true; window.renderLgs = wrapped;
    }
    const page = q('#lgsPage');
    if (page) page.addEventListener('click', e => {
      const a = e.target.closest('[data-lgs-add]'), ed = e.target.closest('[data-lgs-edit]');
      if (!admin()) return;
      if (a) openEditor(null);
      else if (ed) { const t = window.LGS.find(x => String(x._id) === ed.dataset.lgsEdit); if (t) openEditor(t); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && q('#lgsEd')) closeEditor(); });
    load().then(() => redraw());
  }
  /* dipanggil index.html (refreshAccountUI) tiap status login / admin berubah */
  window.refreshLgsAdmin = function () { try { if (typeof state !== 'undefined' && state.page === 'lgs') decorate(); if (!admin()) closeEditor(); } catch (e) { /* abaikan */ } };
  window.MHRLgs = { reload: () => load().then(ok => { redraw(); return ok; }) };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
