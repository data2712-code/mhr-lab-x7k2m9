/* ===================================================================
   MHR DECK LAB — binders-ui.js (v7.06, Tahap B: binder kartu 3×3)
   ===================================================================
   Tampilan:
     • Tab "📒 Binders" di My Dashboard (#bindWrap): rak binder, buat binder
       (kosong / dari satu set / dari kartu spare), editor halaman 3×3
       (desktop 2 halaman berdampingan, HP 1 halaman), pilih kartu per kantong
       (versi, jumlah, harga + nego, kondisi, catatan, terjual), pengaturan
       (link berbagi, harga, kontak WhatsApp/Instagram, lokasi), bagikan
       (salin link, salin daftar untuk WhatsApp). Admin: antrean laporan.
     • Halaman publik #binder/<kode> (#binderWrap): binder read-only + kontak
       penjual + disclaimer penjualan + tombol laporan (akun login saja).
   Servis data: binders.js (window.MHRBinders). Skema:
   mhr_decklab_v706_binders.sql. Semua global index.html (DB, artFile,
   imgFallback, cardName, rarLabel, escHtml, mxOpen, mxClose, openLightbox,
   salinTeks, collMap, collQtyV, collTotal, collSetList, collSetName,
   COLL_SPARE_KEEP, isAccountAdmin, setPage) baru dipakai SAAT JALAN, jadi
   berkas ini aman dimuat sebelum skrip inline utama.
   v7.07 (Tahap C): simpan halaman binder sebagai gambar (Story 9:16 / Post 4:5) — openImages().
   Keputusan pemilik (23 Okt 2026): link-only, kontak = WA/IG isian pemilik,
   harga boleh tampil + opsi nego, disclaimer wajib di binder jual-beli,
   report hanya akun login, sembunyi otomatis setelah 3 laporan.
   =================================================================== */
(function(){
  'use strict';
  const API = () => window.MHRBinders;
  const q1 = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PER = 9, MAX_PAGES = 50, MAX_BINDERS = 20;
  const SITE = 'https://mhrdecklab.com/';
  const linkOf = code => `${SITE}#binder/${code}`;
  const KIND = {
    collection: { label:'My collection', icon:'🗂', bg:'linear-gradient(135deg,#8a2a2a,#431414)' },
    trade:      { label:'For sale / trade', icon:'🏷', bg:'linear-gradient(135deg,#1f6f43,#0f3d25)' },
    wishlist:   { label:'Wishlist', icon:'⭐', bg:'linear-gradient(135deg,#5b3fb0,#2a1c5a)' },
  };
  const COND = { NM:'Near mint', LP:'Lightly played', MP:'Played', DMG:'Damaged' };
  const REASONS = [
    ['scam', 'Scam or suspicious payment request'],
    ['fake', 'Fake or counterfeit cards'],
    ['offensive', 'Offensive or inappropriate content'],
    ['other', 'Something else'],
  ];
  const ERR = {
    NOT_LOGGED_IN:'Please log in first.', BINDER_NOT_FOUND:'This binder isn\'t available any more.',
    OWN_BINDER:'You can\'t report your own binder.', TOO_MANY_REPORTS:'You have sent a lot of reports today. Please try again tomorrow.',
    NOT_ALLOWED:'You are not allowed to do this.', '42501':`You can have up to ${MAX_BINDERS} binders. Delete one to make a new one.`,
  };
  const errMsg = e => e ? (e.missing ? 'Binders aren\'t switched on yet on this site.' : (ERR[e.code] || ERR[e.message] || ('Something went wrong: ' + (e.message || e.code || 'error')))) : '';
  /* disclaimer penjualan (wajib tampil di binder jual-beli) */
  const DISCLAIMER = `<b>MHR Deck Lab is only a place to record collections and promote cards that players want to sell.</b>
    We are not part of, and are not responsible for, any deal or transaction between users. Prices, payment, shipping and
    card condition are agreed between buyer and seller. Check the card in person or by video call before you pay, and be
    careful with payment requests that don't match the seller. If something looks like a scam, report the binder.`;

  const S = {
    list:null, err:null, cur:null, edit:false, page:0, saveTmr:null, status:'', reports:null,
    pub:null, pubCode:null, pubPage:0, pubView:'binder', hideSold:false,
  };
  let cardMap = null;
  const card = no => { if(!cardMap){ cardMap = new Map(); DB.forEach(c=>cardMap.set(c.no, c)); } return cardMap.get(no) || null; };
  const perSpread = () => (window.innerWidth >= 761 ? 2 : 1);
  const fmtRp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const shortRp = n => n >= 1e6 ? 'Rp' + (Math.round(n / 1e5) / 10).toString() + 'M' : n >= 1000 ? 'Rp' + (Math.round(n / 100) / 10).toString() + 'k' : 'Rp' + n;
  const vOf = (c, s) => (s && s.v) ? s.v : c.ra[0];
  const vLabel = (c, v) => rarLabel(v || c.ra[0], c);
  const tglPendek = iso => { const d = new Date(iso); if(isNaN(d)) return ''; return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`; };
  const loggedIn = async () => { const s = window.MHRAuth && window.MHRAuth.ready ? await window.MHRAuth.getSession() : null; return !!(s && s.user); };

  /* gambar kantong: versi yang dipilih, kalau berkasnya tidak ada → versi utama → fallback biasa */
  window.mhrBinderImgErr = function(img, no){
    const c = card(no);
    if(c && !img.dataset.base){ img.dataset.base = '1'; img.dataset.ext = '0'; img.src = artFile(no, c.ra[0]); return; }
    imgFallback(img, no);
  };
  const imgTag = (c, v, cls) => `<img ${cls?`class="${cls}"`:''} alt="" loading="lazy" decoding="async" data-ext="0" src="${artFile(c.no, v || c.ra[0])}" onerror="mhrBinderImgErr(this,'${c.no}')">`;

  function norm(b){
    const n = Math.max(1, Math.min(MAX_PAGES, b.pages|0 || 1));
    const slots = Array.isArray(b.slots) ? b.slots.slice(0, n * PER) : [];
    while(slots.length < n * PER) slots.push(null);
    return { ...b, pages:n, slots: slots.map(s => (s && s.no && card(s.no)) ? s : null) };
  }
  const filled = b => b.slots.filter(Boolean);
  const liveCopies = b => filled(b).filter(s=>!s.sold).reduce((a,s)=>a + (s.q||1), 0);

  /* ---------- kartu spare dari koleksi (salinan di atas 3, simpan versi paling langka) ---------- */
  function spareSlots(){
    if(typeof collMap === 'undefined') return [];
    const out = [];
    DB.filter(cardVisible).forEach(c=>{
      if(collTotal(c) <= COLL_SPARE_KEEP) return;
      let keep = COLL_SPARE_KEEP;
      [...c.ra].reverse().forEach(r=>{
        const qv = collQtyV(c, r); const k = Math.min(keep, qv); keep -= k;
        const sp = qv - k;
        if(sp > 0) out.push({ no:c.no, v: r === c.ra[0] ? '' : r, q:sp, price:null, nego:true, cond:'NM', note:'', sold:false });
      });
    });
    return out;
  }
  function spareOf(c, v){
    let keep = COLL_SPARE_KEEP, res = 0;
    [...c.ra].reverse().forEach(r=>{ const qv = collQtyV(c, r); const k = Math.min(keep, qv); keep -= k; if(r === v) res = qv - k; });
    return res;
  }

  /* ---------- simpan ---------- */
  function setStatus(t){ S.status = t; const el = q1('#bdStatus'); if(el) el.textContent = t; }
  function queueSave(){
    if(!S.cur) return;
    setStatus('Saving…');
    clearTimeout(S.saveTmr);
    S.saveTmr = setTimeout(saveNow, 700);
  }
  async function saveNow(){
    clearTimeout(S.saveTmr); S.saveTmr = null;
    const b = S.cur; if(!b) return;
    const row = { ...b, slots: trimSlots(b.slots) };
    const { data, error } = await API().save(b.id, row);
    if(error){ setStatus('⚠ Couldn\'t save. ' + errMsg(error)); return; }
    if(S.cur && S.cur.id === data.id){ S.cur.updated_at = data.updated_at; S.cur.hidden = data.hidden; S.cur.hidden_reason = data.hidden_reason; }
    if(S.list){ const i = S.list.findIndex(x=>x.id === data.id); if(i >= 0) S.list[i] = data; }
    setStatus('Saved ✓'); updateTile();
  }
  /* buang null di ekor supaya json tetap kecil (panjang array boleh < pages × 9) */
  function trimSlots(slots){ let n = slots.length; while(n && !slots[n-1]) n--; return slots.slice(0, n); }

  /* ---------- kotak ringkasan di tab ---------- */
  function updateTile(){
    const v = q1('#dtBindV'), s = q1('#dtBindS');
    if(!S.list){ return; }
    const trade = S.list.filter(b=>b.kind === 'trade').reduce((a,b)=>a + liveCopies(norm(b)), 0);
    if(v) v.textContent = S.list.length;
    if(s) s.textContent = `binders · ${trade} copies for trade`;
  }

  /* ganti akun = buang data binder akun sebelumnya */
  async function ensureUser(){
    const ss = (window.MHRAuth && window.MHRAuth.ready) ? await window.MHRAuth.getSession() : null;
    const u = (ss && ss.user) ? ss.user.id : null;
    if(u !== S.uid){ S.uid = u; S.list = null; S.cur = null; S.edit = false; S.err = null; S.reports = null; }
    return u;
  }
  async function refresh(){
    await ensureUser();
    if(!API() || !API().ready) return { data:[], error:{ message:'offline' } };
    const { data, error } = await API().listMine();
    S.list = error ? (S.list || []) : data; S.err = error;
    updateTile();
    return { data, error };
  }

  /* =================== TAB DASHBOARD =================== */
  async function renderTab(){
    const w = q1('#bindWrap'); if(!w) return;
    if(!API() || !API().ready){ w.innerHTML = '<p class="auth-note">Binders need an account connection. Please reload the page.</p>'; return; }
    await ensureUser();
    if(S.cur){ renderEditor(); return; }
    if(!S.list){ w.innerHTML = '<p class="auth-note">Loading binders…</p>'; await refresh(); }
    if(S.cur){ renderEditor(); return; }   // editor dibuka sementara daftar dimuat
    renderShelf();
  }

  function bookHTML(b){
    const k = KIND[b.kind] || KIND.collection; const nb = norm(b);
    const peek = filled(nb).slice(0, 3).map(s=>{ const c = card(s.no); return c ? imgTag(c, s.v) : ''; }).join('');
    const st = b.hidden ? '⚠ hidden' : b.is_public ? '🔗 shared' : '🔒 private';
    return `<button type="button" class="bd-book" data-bopen="${E(b.id)}" style="background:${k.bg}">
      <span class="bd-kind">${k.icon} ${E(k.label)} · ${st}</span><span class="bd-ttl">${E(b.name)}</span>
      <span class="bd-peek">${peek}</span>
      <span class="bd-inf">${filled(nb).length} cards · ${nb.pages} page${nb.pages>1?'s':''}</span></button>`;
  }
  function renderShelf(){
    const w = q1('#bindWrap'); if(!w) return;
    if(S.err && S.err.missing){ w.innerHTML = `<p class="auth-note">${errMsg(S.err)}</p>`; return; }
    const list = S.list || [];
    w.innerHTML = `<div class="bd-intro"><span>A binder is your own card page with 9 pockets per page, like a real 3×3 binder. Keep it private,
        share a link to show off your collection, or list your spare cards for sale or trade.</span>
        ${list.length < MAX_BINDERS ? '<button type="button" class="btn2 main" data-bact="new">＋ New binder</button>' : ''}</div>
      ${S.err ? `<p class="auth-note" style="color:var(--merah)">${E(errMsg(S.err))}</p>` : ''}
      <div class="bd-shelf">${list.map(bookHTML).join('')}
        ${list.length < MAX_BINDERS ? `<button type="button" class="bd-book bd-new" data-bact="new">＋ New binder<small>Blank, a whole set, or your spare cards</small></button>` : ''}</div>
      ${list.length >= MAX_BINDERS ? `<p class="auth-note">You have reached the limit of ${MAX_BINDERS} binders.</p>` : ''}
      ${isAccountAdmin ? '<div class="bd-admin" id="bdAdmin"><b>🛡 Binder reports</b> <span class="bd-mut">Loading…</span></div>' : ''}`;
    if(isAccountAdmin) renderAdmin();
  }

  /* ---------- buat binder ---------- */
  function openCreate(){
    const sets = collSetList();
    const spares = spareSlots();
    const m = mxOpen(`<h3>📒 New binder</h3>
      <div class="bd-form">
        <label class="bd-f"><span>Name</span><input id="bnName" maxlength="60" placeholder="e.g. Spider-Verse master set, Spare cards for sale"></label>
        <div class="bd-f"><span>Type</span><div class="bd-kinds">${Object.entries(KIND).map(([k, v], i)=>`<label class="bd-kopt"><input type="radio" name="bnKind" value="${k}"${i===0?' checked':''}><b>${v.icon} ${E(v.label)}</b><small>${
          k === 'collection' ? 'Show off cards you own' : k === 'trade' ? 'Cards you want to sell or swap, with prices' : 'Cards you are looking for'}</small></label>`).join('')}</div></div>
        <div class="bd-f"><span>Start with</span>
          <label class="bd-ropt"><input type="radio" name="bnStart" value="blank" checked> Empty pages <select id="bnPages">${[1,2,3,4,6,8,10].map(n=>`<option value="${n}"${n===2?' selected':''}>${n} page${n>1?'s':''} (${n*PER} pockets)</option>`).join('')}</select></label>
          <label class="bd-ropt"><input type="radio" name="bnStart" value="set"> Every card of a set <select id="bnSet">${sets.map(s=>`<option value="${s.kode}">${E(s.kode)}${collSetName(s) ? ' · ' + E(collSetName(s)) : ''}</option>`).join('')}</select></label>
          <label class="bd-ropt${spares.length ? '' : ' off'}"><input type="radio" name="bnStart" value="spares"${spares.length ? '' : ' disabled'}> My spare cards ${spares.length ? `<span class="bd-mut">(${spares.reduce((a,s)=>a+s.q,0)} copies above ${COLL_SPARE_KEEP} in your Card Collection)</span>` : '<span class="bd-mut">(none yet — record your cards in Card Collection first)</span>'}</label>
        </div>
        <p class="bd-err" id="bnErr"></p>
        <div class="bd-btns"><button type="button" class="btn2 main" id="bnGo">Create binder</button><button type="button" class="btn2" data-mxclose>Cancel</button></div>
      </div>`, 'bd-mx');
    const box = m.querySelector('.mx-box');
    let startTouched = false;
    box.addEventListener('change', e=>{
      if(e.target.name === 'bnStart' || e.target.tagName === 'SELECT') startTouched = true;
      if(e.target.name === 'bnKind' && e.target.value === 'trade' && !startTouched){
        const sp = box.querySelector('input[name="bnStart"][value="spares"]'); if(sp && !sp.disabled) sp.checked = true;
      }
      if(e.target.id === 'bnPages') box.querySelector('input[value="blank"]').checked = true;
      if(e.target.id === 'bnSet') box.querySelector('input[value="set"]').checked = true;
    });
    box.querySelector('#bnGo').addEventListener('click', async ev=>{
      const kind = box.querySelector('input[name="bnKind"]:checked').value;
      const start = box.querySelector('input[name="bnStart"]:checked').value;
      let name = box.querySelector('#bnName').value.trim();
      let slots = [], pages = 2;
      if(start === 'blank') pages = parseInt(box.querySelector('#bnPages').value, 10) || 2;
      else if(start === 'set'){
        const code = box.querySelector('#bnSet').value;
        slots = DB.filter(c=>cardVisible(c) && c.s === code).sort((a,b)=>a.no.localeCompare(b.no)).map(c=>({ no:c.no, v:'', q:1 }));
        if(!name){ const so = sets.find(s=>s.kode === code); name = `${code}${so && collSetName(so) ? ' ' + collSetName(so) : ''} set`; }
      } else if(start === 'spares'){
        slots = spareSlots();
        if(!name) name = 'Spare cards';
      }
      if(slots.length > MAX_PAGES * PER) slots = slots.slice(0, MAX_PAGES * PER);
      if(slots.length) pages = Math.max(1, Math.ceil(slots.length / PER));
      if(!name) name = kind === 'trade' ? 'For sale / trade' : kind === 'wishlist' ? 'Wishlist' : 'My binder';
      ev.target.disabled = true;
      const { data, error } = await API().create({ name, kind, pages, slots, is_public:false, show_prices:true });
      if(error){ ev.target.disabled = false; box.querySelector('#bnErr').textContent = errMsg(error); return; }
      mxClose();
      S.list = [data, ...(S.list || [])]; updateTile();
      openBinder(data.id, true);
    });
    setTimeout(()=>{ const n = box.querySelector('#bnName'); if(n) n.focus(); }, 30);
  }

  /* =================== EDITOR =================== */
  function openBinder(id, edit){
    const b = (S.list || []).find(x=>x.id === id); if(!b) return;
    S.cur = norm(b); S.edit = !!edit; S.page = 0; S.status = '';
    renderEditor();
    const w = q1('#bindWrap'); if(w && w.scrollIntoView) w.scrollIntoView({block:'start'});
  }
  async function closeBinder(){
    if(S.saveTmr) await saveNow();
    S.cur = null; S.edit = false;
    renderShelf();
  }

  function pocketHTML(s, i, mode, b){
    const own = mode === 'own';
    if(!s) return `<div class="bp-pocket empty${own && S.edit ? ' add' : ''}" data-bslot="${i}">${own && S.edit ? '＋' : ''}</div>`;
    const c = card(s.no);
    const v = vOf(c, s);
    const trade = b.kind === 'trade';
    const miss = own && b.kind === 'collection' && collQtyV(c, v) <= 0;
    let bar = '';
    const vl = (s.v && s.v !== c.ra[0]) ? `<i class="bp-r bp-r-${E(String(s.v).split('_')[0].toLowerCase())}">${E(vLabel(c, s.v))}</i>` : '';
    if(trade){
      const hasPrice = s.price != null && s.price !== '' && b.show_prices !== false;
      const txt = hasPrice ? shortRp(+s.price) : (s.nego ? 'Make offer' : (b.show_prices === false ? 'Ask' : ''));
      bar = `<span class="bp-bar">${vl}${txt ? `<b class="${hasPrice ? '' : 'mut'}">${E(txt)}</b>` : ''}${hasPrice && s.nego ? '<i class="bp-n">NEGO</i>' : ''}</span>`;
    } else if(vl) bar = `<span class="bp-bar">${vl}</span>`;
    return `<div class="bp-pocket${s.sold ? ' sold' : ''}${miss ? ' miss' : ''}" data-bslot="${i}"${own && S.edit ? ' draggable="true"' : ''} title="${E(cardName(c))} · ${E(c.no)} · ${E(vLabel(c, v))}${miss ? ' · not in your Card Collection yet' : ''}">
      ${imgTag(c, v)}${(s.q||1) > 1 ? `<span class="bp-q">×${s.q}</span>` : ''}${bar}${s.sold ? '<span class="bp-sold">SOLD</span>' : ''}</div>`;
  }
  function spreadHTML(b, start, mode){
    const per = perSpread();
    const vis = Math.min(per, b.pages);   // binder 1 halaman: tampil satu halaman di tengah
    const pg = p => p >= b.pages ? '' : `<div class="bp-page">${Array.from({length:PER}, (_, k)=>pocketHTML(b.slots[p*PER + k] || null, p*PER + k, mode, b)).join('')}<div class="bp-no">Page ${p+1}</div></div>`;
    const pages = []; for(let p = start; p < start + per; p++) pages.push(pg(p));
    const nSp = Math.ceil(b.pages / per), cur = Math.floor(start / per);
    const a = start + 1, z = Math.min(b.pages, start + per);
    return `<div class="bp-spread bp-per${vis}">${pages.join('')}</div>
      <div class="bp-pager"><button type="button" data-bpg="-1" ${cur<=0?'disabled':''} aria-label="Previous pages">‹</button>
        <span class="bp-dots">${nSp <= 12 ? Array.from({length:nSp}, (_, i)=>`<i class="${i===cur?'on':''}" data-bpgto="${i}"></i>`).join('') : ''}</span>
        <button type="button" data-bpg="1" ${cur>=nSp-1?'disabled':''} aria-label="Next pages">›</button>
        <span class="bd-mut">Page${a===z?'':'s'} ${a}${a===z?'':'–'+z} of ${b.pages}</span></div>`;
  }
  function tableHTML(b, mode){
    const rows = b.slots.map((s, i)=>({s, i})).filter(x=>x.s && (!(mode === 'pub' && S.hideSold) || !x.s.sold));
    if(!rows.length) return '';
    const trade = b.kind === 'trade';
    return `<table class="bd-tbl"><tr><th>#</th><th>Card</th><th class="hm">No.</th><th>Version</th><th>Qty</th>${trade ? `<th class="hm">Condition</th><th class="r">Price</th>` : ''}</tr>
      ${rows.map(({s, i})=>{ const c = card(s.no);
        const price = !trade ? '' : (s.price != null && s.price !== '' && b.show_prices !== false) ? fmtRp(+s.price) + (s.nego ? ' · nego' : '') : (s.nego ? 'Make offer' : '–');
        return `<tr class="${s.sold ? 'sold' : ''}" data-bzoom="${E(s.no)}"><td class="m">${i+1}</td><td>${E(cardName(c))}${s.note ? `<small>${E(s.note)}</small>` : ''}</td><td class="m hm">${E(s.no)}</td><td class="m">${E(vLabel(c, s.v))}</td><td class="m">${s.q||1}</td>${trade ? `<td class="hm">${E(COND[s.cond] || '')}</td><td class="m r">${s.sold ? 'SOLD' : E(price)}</td>` : ''}</tr>`; }).join('')}</table>`;
  }
  function statusTag(b){
    if(b.hidden) return '<span class="bd-tag warn">⚠ Hidden</span>';
    return b.is_public ? '<span class="bd-tag">🔗 Shared link on</span>' : '<span class="bd-tag">🔒 Private</span>';
  }
  function renderEditor(){
    const w = q1('#bindWrap'); const b = S.cur; if(!w || !b) return;
    const k = KIND[b.kind] || KIND.collection;
    const f = filled(b);
    const sold = f.filter(s=>s.sold).length;
    const value = f.filter(s=>!s.sold && s.price != null && s.price !== '').reduce((a,s)=>a + (+s.price)*(s.q||1), 0);
    const per = perSpread();
    if(S.page >= b.pages) S.page = Math.max(0, Math.floor((b.pages - 1) / per) * per);
    const lastEmpty = b.slots.slice((b.pages-1)*PER).every(s=>!s);
    w.innerHTML = `<div class="bd-top"><button type="button" class="bd-back" data-bact="back">‹ All binders</button>
        <h3>${E(b.name)}</h3><span class="bd-tag" style="background:${k.bg};border-color:transparent;color:#fff">${k.icon} ${E(k.label)}</span>${statusTag(b)}
        <span class="bd-sp"></span>
        <button type="button" class="btn2 ${S.edit ? 'main' : ''}" data-bact="edit">${S.edit ? '✓ Done' : '✏️ Edit'}</button>
        <button type="button" class="btn2" data-bact="settings">⚙ Settings</button>
        <button type="button" class="btn2 bd-ghost" data-bact="share">🔗 Share</button></div>
      ${b.hidden ? `<div class="bd-warn">⚠ ${E(b.hidden_reason || 'This binder is hidden.')} Other people can't open the link until our team reviews it. You can still edit it.</div>` : ''}
      ${S.edit ? `<div class="bd-editbar"><b>Edit mode</b><span>Tap an empty pocket to add a card, tap a card to change it${per > 1 ? ', drag to move it' : ''}.</span><span class="bd-sp"></span>
        ${b.pages < MAX_PAGES ? '<button type="button" class="btn2" data-bact="addpage">＋ Add page</button>' : ''}
        ${b.pages > 1 && lastEmpty ? '<button type="button" class="btn2" data-bact="delpage">− Remove last page</button>' : ''}
        ${b.kind === 'trade' ? '<button type="button" class="btn2" data-bact="fillspares">⤓ Add my spare cards</button>' : ''}</div>` : ''}
      <div class="bd-layout"><div class="bd-main">${spreadHTML(b, S.page, 'own')}
          ${!S.edit && !f.length ? '<p class="auth-note" style="text-align:center">This binder is empty. Press ✏️ Edit, then tap a pocket to add a card.</p>' : ''}
          ${tableHTML(b, 'own')}</div>
        <aside class="bd-side"><h4>Summary</h4>
          <div class="bd-row"><span>Cards</span><b>${f.length}</b></div>
          <div class="bd-row"><span>Copies${b.kind === 'trade' ? ' (unsold)' : ''}</span><b>${liveCopies(b)}</b></div>
          ${b.kind === 'trade' ? `<div class="bd-row"><span>Sold</span><b>${sold}</b></div><div class="bd-row"><span>Listed value</span><b>${value ? fmtRp(value) : '–'}</b></div>` : ''}
          <div class="bd-row"><span>Pages</span><b>${b.pages}</b></div>
          <h4>Sharing</h4>
          <p class="bd-mut">${b.is_public ? 'Anyone with the link can view this binder.' : 'Private: only you can see it.'}${b.kind === 'trade' && b.is_public && !b.contact_wa && !b.contact_ig ? ' Add your WhatsApp or Instagram in Settings so buyers can reach you.' : ''}</p>
          <div class="bd-stack"><button type="button" class="btn2" data-bact="share">🔗 ${b.is_public ? 'Copy link / share' : 'Turn on shared link'}</button>
            <button type="button" class="btn2" data-bact="copylist">📋 Copy list for WhatsApp</button>
            <button type="button" class="btn2" data-bact="image">🖼 Save pages as image</button>
            ${b.is_public ? `<a class="btn2" href="#binder/${E(b.share_code)}">👁 View public page</a>` : ''}</div>
          <p class="bd-status" id="bdStatus">${E(S.status)}</p>
        </aside></div>`;
  }

  /* ---------- kantong: pilih / ubah kartu ---------- */
  function openSlot(i){
    const b = S.cur; if(!b) return;
    const s = b.slots[i];
    const P = { i, step: s ? 'form' : 'pick', q:'', set:'ALL', src: (typeof collMap !== 'undefined' && Object.keys(collMap).length) ? (b.kind === 'trade' ? 'spare' : b.kind === 'wishlist' ? 'all' : 'own') : 'all',
      d: s ? { ...s } : null };
    const m = mxOpen('<div id="bsBody"></div>', 'bd-mx bd-mx-wide');
    const box = m.querySelector('.mx-box');
    const body = box.querySelector('#bsBody');
    const pageNo = Math.floor(i / PER) + 1, pos = i % PER + 1;
    const results = () => {
      const q = P.q.trim().toLowerCase();
      let arr = DB.filter(c=>cardVisible(c) && (P.set === 'ALL' || c.s === P.set));
      if(P.src === 'own') arr = arr.filter(c=>collTotal(c) > 0);
      if(P.src === 'spare') arr = arr.filter(c=>collTotal(c) > COLL_SPARE_KEEP);
      if(q) arr = arr.filter(c=>c.no.toLowerCase().includes(q) || cardName(c).toLowerCase().includes(q));
      const more = arr.length > 60; arr = arr.slice(0, 60);
      return arr.length ? arr.map(c=>{ const t = collTotal(c); return `<button type="button" class="bs-card" data-bspick="${c.no}">${imgTag(c, c.ra[0])}${t ? `<span class="bp-q">×${t}</span>` : ''}<b>${E(cardName(c))}</b><small>${E(c.no)}</small></button>`; }).join('') + (more ? '<p class="bd-mut bs-more">Showing the first 60 — type to narrow it down.</p>' : '')
        : `<p class="bd-mut bs-more">${P.src === 'all' ? 'No cards found.' : P.src === 'spare' ? 'No spare cards found. Choose “All cards” to pick any card.' : 'No cards from your collection found. Choose “All cards” to pick any card.'}</p>`;
    };
    const pickHTML = () => `<h3>Add a card · page ${pageNo}, pocket ${pos}</h3>
      <div class="bs-tool"><input type="text" id="bsQ" placeholder="Search card name or number…" value="${E(P.q)}" autocomplete="off">
        <select id="bsSrc"><option value="own"${P.src==='own'?' selected':''}>Cards I own</option><option value="spare"${P.src==='spare'?' selected':''}>My spare cards</option><option value="all"${P.src==='all'?' selected':''}>All cards</option></select></div>
      <div class="bs-sets"><button type="button" data-bsset="ALL" aria-pressed="${P.set==='ALL'}">All sets</button>${collSetList().map(x=>`<button type="button" data-bsset="${x.kode}" aria-pressed="${P.set===x.kode}">${E(x.kode)}</button>`).join('')}</div>
      <div class="bs-res" id="bsRes">${results()}</div>`;
    const formHTML = () => {
      const d = P.d, c = card(d.no), trade = b.kind === 'trade';
      const v = vOf(c, d);
      const vers = c.ra.map(r=>{ const own = collQtyV(c, r); return `<option value="${E(r === c.ra[0] ? '' : r)}"${r === v ? ' selected' : ''}>${E(rarLabel(r, c))}${own ? ` · you own ${own}` : ''}</option>`; }).join('');
      const own = collQtyV(c, v), sp = spareOf(c, v);
      return `<h3>${s ? 'Edit pocket' : 'Add a card'} · page ${pageNo}, pocket ${pos}</h3>
        <div class="bs-form"><div class="bs-prev" data-bszoom="${c.no}">${imgTag(c, v)}</div>
          <div class="bs-fields"><b class="bs-nm">${E(cardName(c))}</b><span class="bd-mut">${E(c.no)} · L${c.l}</span>
            <div class="bs-grid">
              <label class="bd-f"><span>Version</span><select id="bsV">${vers}</select></label>
              <label class="bd-f"><span>${trade ? 'Copies for sale' : 'Copies'}</span><input id="bsQty" type="number" min="1" max="99" inputmode="numeric" value="${d.q||1}"></label>
              ${trade ? `<label class="bd-f"><span>Price (Rp, optional)</span><input id="bsPrice" inputmode="numeric" placeholder="e.g. 150000" value="${d.price != null && d.price !== '' ? d.price : ''}"></label>
              <label class="bd-f"><span>Condition</span><select id="bsCond">${Object.entries(COND).map(([k2, l])=>`<option value="${k2}"${(d.cond||'NM')===k2?' selected':''}>${l}</option>`).join('')}</select></label>
              <label class="bd-chk"><input type="checkbox" id="bsNego"${d.nego ? ' checked' : ''}> Open to offers (nego)</label>
              <label class="bd-chk"><input type="checkbox" id="bsSold"${d.sold ? ' checked' : ''}> Sold</label>` : ''}
              <label class="bd-f bs-wide"><span>Note (optional)</span><input id="bsNote" maxlength="80" value="${E(d.note||'')}" placeholder="${trade ? 'e.g. sleeved since opening, tiny edge wear' : 'e.g. signed, from my first booster box'}"></label>
            </div>
            <p class="bd-mut" id="bsOwn">Card Collection: you own ${own} of this version${trade && sp ? ` (${sp} spare)` : ''}.${trade ? ' Leave the price empty and tick “Open to offers” to show “Make offer”.' : ''}</p>
            <div class="bd-btns"><button type="button" class="btn2 main" data-bs="save">${s ? 'Save' : 'Put in pocket'}</button>
              <button type="button" class="btn2" data-bs="change">Change card</button>
              ${s ? `<button type="button" class="btn2" data-bs="left" ${i<=0?'disabled':''}>◀ Move</button><button type="button" class="btn2" data-bs="right" ${i>=b.pages*PER-1?'disabled':''}>Move ▶</button><button type="button" class="btn2 bd-red" data-bs="remove">Remove</button>` : ''}</div>
          </div></div>`;
    };
    const draw = () => { body.innerHTML = P.step === 'pick' ? pickHTML() : formHTML(); if(P.step === 'pick'){ const qi = body.querySelector('#bsQ'); if(qi) qi.focus(); } };
    draw();
    box.addEventListener('input', e=>{
      if(e.target.id === 'bsQ'){ P.q = e.target.value; body.querySelector('#bsRes').innerHTML = results(); }
    });
    box.addEventListener('change', e=>{
      if(e.target.id === 'bsSrc'){ P.src = e.target.value; body.querySelector('#bsRes').innerHTML = results(); }
      if(e.target.id === 'bsV' && P.d){
        P.d.v = e.target.value;
        const c = card(P.d.no), v = vOf(c, P.d);
        const prev = body.querySelector('.bs-prev'); if(prev) prev.innerHTML = imgTag(c, v);
        const o = body.querySelector('#bsOwn'); if(o){ const sp = spareOf(c, v); o.textContent = `Card Collection: you own ${collQtyV(c, v)} of this version${b.kind === 'trade' && sp ? ` (${sp} spare)` : ''}.`; }
      }
    });
    box.addEventListener('click', e=>{
      const st = e.target.closest('[data-bsset]'); if(st){ P.set = st.dataset.bsset; draw(); return; }
      const pk = e.target.closest('[data-bspick]');
      if(pk){
        const c = card(pk.dataset.bspick);
        let v = '';
        if(P.src === 'spare'){ const r = [...c.ra].reverse().find(r=>spareOf(c, r) > 0); if(r) v = r === c.ra[0] ? '' : r; }
        else if(P.src === 'own'){ const r = c.ra.find(r=>collQtyV(c, r) > 0); if(r) v = r === c.ra[0] ? '' : r; }
        const sp = spareOf(c, v || c.ra[0]);
        P.d = { ...(P.d || {}), no:c.no, v, q: b.kind === 'trade' && sp ? sp : (P.d && P.d.q) || 1, cond:(P.d && P.d.cond) || 'NM', nego: P.d ? !!P.d.nego : b.kind === 'trade', price: P.d ? P.d.price : null, note: P.d ? P.d.note : '', sold:false };
        P.step = 'form'; draw(); return;
      }
      const z = e.target.closest('[data-bszoom]'); if(z){ openLightbox(z.dataset.bszoom); return; }
      const a = e.target.closest('[data-bs]'); if(!a) return;
      const act = a.dataset.bs;
      if(act === 'change'){ P.step = 'pick'; draw(); return; }
      if(act === 'remove'){ b.slots[i] = null; mxClose(); queueSave(); renderEditor(); return; }
      if(act === 'left' || act === 'right'){
        const j = act === 'left' ? i - 1 : i + 1;
        [b.slots[i], b.slots[j]] = [b.slots[j], b.slots[i]];
        mxClose(); queueSave(); if(Math.floor(j / PER) < S.page || Math.floor(j / PER) >= S.page + perSpread()) S.page = Math.floor(Math.floor(j / PER) / perSpread()) * perSpread();
        renderEditor(); return;
      }
      if(act === 'save'){
        const val = id => { const el = body.querySelector(id); return el ? el.value : ''; };
        const chk = id => { const el = body.querySelector(id); return !!(el && el.checked); };
        const d = P.d;
        const out = { no:d.no, v: val('#bsV'), q: Math.max(1, Math.min(99, parseInt(val('#bsQty'), 10) || 1)) };
        if(b.kind === 'trade'){
          const raw = val('#bsPrice').replace(/[^\d]/g, '');
          out.price = raw ? Math.min(1e9, parseInt(raw, 10)) : null;
          out.nego = chk('#bsNego'); out.cond = val('#bsCond') || 'NM'; out.sold = chk('#bsSold');
        }
        const note = val('#bsNote').trim().slice(0, 80); if(note) out.note = note;
        b.slots[i] = out;
        mxClose(); queueSave(); renderEditor();
      }
    });
  }

  /* ---------- pengaturan ---------- */
  function cleanWa(v){
    let d = String(v||'').replace(/[^\d]/g, '');
    if(d.startsWith('0')) d = '62' + d.slice(1);
    else if(d.startsWith('8')) d = '62' + d;
    return d.slice(0, 15);
  }
  function cleanIg(v){
    let s = String(v||'').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#\s]/)[0];
    return s.replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);
  }
  function openSettings(){
    const b = S.cur; if(!b) return;
    const m = mxOpen(`<h3>⚙ Binder settings</h3><div class="bd-form">
      <label class="bd-f"><span>Name</span><input id="bgName" maxlength="60" value="${E(b.name)}"></label>
      <label class="bd-f"><span>Type</span><select id="bgKind">${Object.entries(KIND).map(([k, v])=>`<option value="${k}"${b.kind===k?' selected':''}>${v.icon} ${E(v.label)}</option>`).join('')}</select></label>
      <label class="bd-chk"><input type="checkbox" id="bgPub"${b.is_public ? ' checked' : ''}> Shared link on — anyone with the link can view this binder</label>
      <div id="bgTrade"${b.kind === 'trade' ? '' : ' hidden'}>
        <label class="bd-chk"><input type="checkbox" id="bgPrices"${b.show_prices !== false ? ' checked' : ''}> Show prices on the shared page</label>
        <div class="bs-grid">
          <label class="bd-f"><span>WhatsApp number</span><input id="bgWa" inputmode="tel" maxlength="20" placeholder="e.g. 0812xxxxxxx" value="${E(b.contact_wa)}"></label>
          <label class="bd-f"><span>Instagram</span><input id="bgIg" maxlength="40" placeholder="@yourname" value="${E(b.contact_ig ? '@' + b.contact_ig : '')}"></label>
        </div>
        <p class="bd-mut">Your WhatsApp number and Instagram are shown on the shared page so buyers can contact you. Leave them empty to hide them.</p>
        <div class="bd-disc">${DISCLAIMER}</div>
      </div>
      <label class="bd-f"><span>City / area (optional)</span><input id="bgLoc" maxlength="60" placeholder="e.g. Jakarta Selatan · COD at Weekly Rush" value="${E(b.location)}"></label>
      <label class="bd-f"><span>Note for visitors (optional)</span><textarea id="bgNote" maxlength="300" rows="2" placeholder="${b.kind === 'trade' ? 'e.g. Shipping from Jakarta, COD at Ogre Neverland on Saturdays' : 'e.g. My Spider-Verse master set, still missing 3 SECs'}">${E(b.note)}</textarea></label>
      <p class="bd-err" id="bgErr"></p>
      <div class="bd-btns"><button type="button" class="btn2 main" id="bgSave">Save settings</button><button type="button" class="btn2" data-mxclose>Cancel</button><span class="bd-sp"></span><button type="button" class="btn2 bd-red" id="bgDel">🗑 Delete binder</button></div>
    </div>`, 'bd-mx');
    const box = m.querySelector('.mx-box');
    box.querySelector('#bgKind').addEventListener('change', e=>{ box.querySelector('#bgTrade').hidden = e.target.value !== 'trade'; });
    box.querySelector('#bgSave').addEventListener('click', async ()=>{
      const wa = cleanWa(box.querySelector('#bgWa').value), ig = cleanIg(box.querySelector('#bgIg').value);
      if(wa && (wa.length < 10 || wa.length > 15)){ box.querySelector('#bgErr').textContent = 'That WhatsApp number doesn\'t look right. Use the full number, e.g. 0812 3456 7890.'; return; }
      b.name = box.querySelector('#bgName').value.trim().slice(0, 60) || b.name;
      b.kind = box.querySelector('#bgKind').value;
      b.is_public = box.querySelector('#bgPub').checked;
      b.show_prices = box.querySelector('#bgPrices').checked;
      b.contact_wa = wa; b.contact_ig = ig;
      b.location = box.querySelector('#bgLoc').value.trim().slice(0, 60);
      b.note = box.querySelector('#bgNote').value.trim().slice(0, 300);
      mxClose(); renderEditor(); await saveNow(); renderEditor();
    });
    box.querySelector('#bgDel').addEventListener('click', async ()=>{
      if(!confirm(`Delete “${b.name}”? The binder and its shared link are removed for good. Your Card Collection is not changed.`)) return;
      const { error } = await API().remove(b.id);
      if(error){ box.querySelector('#bgErr').textContent = errMsg(error); return; }
      mxClose(); clearTimeout(S.saveTmr); S.saveTmr = null;
      S.list = (S.list || []).filter(x=>x.id !== b.id); S.cur = null; updateTile(); renderShelf();
    });
  }

  /* ---------- bagikan ---------- */
  function listText(b, owner){
    const k = KIND[b.kind] || KIND.collection;
    const rows = filled(b).filter(s=>!s.sold).map(s=>{
      const c = card(s.no); const vl = (s.v && s.v !== c.ra[0]) ? ` (${vLabel(c, s.v)})` : '';
      let price = '';
      if(b.kind === 'trade'){
        if(s.price != null && s.price !== '' && b.show_prices !== false) price = ` — ${fmtRp(+s.price)}${s.nego ? ' (nego)' : ''}`;
        else if(s.nego) price = ' — make an offer';
      }
      return `• ${s.no} ${cardName(c)}${vl} ×${s.q||1}${price}`;
    });
    const head = `📒 ${b.name} — ${k.label}${owner ? ` by @${owner}` : ''}`;
    const tail = [];
    if(b.is_public !== false && b.share_code) tail.push(`See the binder: ${linkOf(b.share_code || b.code)}`);
    if(b.kind === 'trade') tail.push('Listed on MHR Deck Lab. Deals are made directly between buyer and seller.');
    return [head, ...rows, rows.length ? '' : '(empty)', ...tail].join('\n').replace(/\n\n+/g, '\n\n');
  }
  function openShare(){
    const b = S.cur; if(!b) return;
    const draw = () => b.is_public
      ? `<h3>🔗 Share this binder</h3><p class="bd-mut">Anyone with this link can view the binder (no account needed). It doesn't appear in any public list.</p>
        <div class="bd-link"><input readonly id="bhLink" value="${E(linkOf(b.share_code))}"><button type="button" class="btn2 main" data-bh="copy">Copy link</button></div>
        <div class="bd-btns"><button type="button" class="btn2" data-bh="list">📋 Copy list for WhatsApp</button>
          <button type="button" class="btn2" data-bh="image">🖼 Save as image (IG story)</button>
          ${navigator.share ? '<button type="button" class="btn2" data-bh="native">📤 Share…</button>' : ''}
          <a class="btn2" href="#binder/${E(b.share_code)}" data-mxclose>👁 View public page</a>
          <button type="button" class="btn2" data-bh="off">Turn off shared link</button></div>
        ${b.kind === 'trade' && !b.contact_wa && !b.contact_ig ? '<p class="bd-warn">Tip: add your WhatsApp or Instagram in ⚙ Settings so buyers can contact you from the shared page.</p>' : ''}
        ${b.hidden ? '<p class="bd-warn">This binder is hidden after reports, so the link won\'t open for other people until it is reviewed.</p>' : ''}`
      : `<h3>🔗 Share this binder</h3><p class="bd-mut">This binder is private. Turn on the shared link to get a link you can send on WhatsApp or post on Instagram. Only people with the link can see it.</p>
        <div class="bd-btns"><button type="button" class="btn2 main" data-bh="on">Turn on shared link</button><button type="button" class="btn2" data-bh="list">📋 Copy list for WhatsApp</button><button type="button" class="btn2" data-bh="image">🖼 Save as image</button></div>`;
    const m = mxOpen(`<div id="bhBody">${draw()}</div>`, 'bd-mx');
    const box = m.querySelector('.mx-box');
    box.addEventListener('click', async e=>{
      const a = e.target.closest('[data-bh]'); if(!a) return;
      const act = a.dataset.bh;
      if(act === 'image'){ openImages(); return; }
      if(act === 'copy') salinTeks(linkOf(b.share_code), a);
      else if(act === 'list') salinTeks(listText(b), a);
      else if(act === 'native'){ try{ await navigator.share({ title:b.name, text:`${b.name} — MHR Deck Lab binder`, url:linkOf(b.share_code) }); }catch(err){} }
      else if(act === 'on' || act === 'off'){
        b.is_public = act === 'on'; box.querySelector('#bhBody').innerHTML = draw(); renderEditor(); await saveNow(); renderEditor();
      }
    });
  }

  async function fillSpares(){
    const b = S.cur; if(!b) return;
    const have = new Set(filled(b).map(s=>s.no + '|' + (s.v||'')));
    const add = spareSlots().filter(s=>!have.has(s.no + '|' + (s.v||'')));
    if(!add.length){ alert('No new spare cards to add. Spare cards are copies above 3 in your Card Collection that aren\'t in this binder yet.'); return; }
    let j = 0;
    for(let i = 0; i < b.slots.length && j < add.length; i++) if(!b.slots[i]) b.slots[i] = add[j++];
    while(j < add.length && b.pages < MAX_PAGES){ b.pages++; for(let k = 0; k < PER; k++) b.slots.push(j < add.length ? add[j++] : null); }
    queueSave(); renderEditor();
    setStatus(`Added ${j} spare card${j>1?'s':''}. Set prices by tapping each card.`);
  }

  /* ---------- admin ---------- */
  async function renderAdmin(){
    const box = q1('#bdAdmin'); if(!box) return;
    const { data, error } = await API().adminReports();
    if(error){ box.innerHTML = `<b>🛡 Binder reports</b> <span class="bd-mut">${E(errMsg(error))}</span>`; return; }
    S.reports = data;
    box.innerHTML = `<b>🛡 Binder reports</b> <span class="bd-mut">${data.length ? `${data.length} binder${data.length>1?'s':''} to review` : 'Nothing to review.'}</span>` +
      data.map(r=>`<div class="bd-rep"><div class="bd-rep-h"><a href="#binder/${E(r.code)}"><b>${E(r.name)}</b></a> <span class="bd-mut">by @${E(r.owner)} · ${E((KIND[r.kind]||KIND.collection).label)} · ${r.open} open report${r.open==1?'':'s'}</span>${r.hidden ? ` <span class="bd-tag warn">Hidden</span>` : ''}</div>
        <ul>${(r.reports||[]).slice(0, 6).map(x=>`<li><b>${E((REASONS.find(z=>z[0]===x.reason)||['',x.reason])[1])}</b> · @${E(x.by)} · ${E(tglPendek(x.at))} · ${E(x.status)}${x.note ? ` — “${E(x.note)}”` : ''}</li>`).join('')}</ul>
        <div class="bd-btns">${r.hidden ? `<button type="button" class="btn2" data-badm="unhide" data-bid="${E(r.id)}">Show again (reports were wrong)</button>` : `<button type="button" class="btn2 bd-red" data-badm="hide" data-bid="${E(r.id)}">Hide binder</button><button type="button" class="btn2" data-badm="dismiss" data-bid="${E(r.id)}">Dismiss reports</button>`}</div></div>`).join('');
  }

  /* ---------- event dashboard ---------- */
  document.addEventListener('click', e=>{
    const w = q1('#bindWrap'); if(!w || !w.contains(e.target)) return;
    const op = e.target.closest('[data-bopen]'); if(op){ openBinder(op.dataset.bopen, false); return; }
    const adm = e.target.closest('[data-badm]');
    if(adm){ (async ()=>{ adm.disabled = true; const { error } = await API().adminModerate(adm.dataset.bid, adm.dataset.badm); if(error) alert(errMsg(error)); renderAdmin(); })(); return; }
    const pg = e.target.closest('[data-bpg]'); const pgto = e.target.closest('[data-bpgto]');
    if((pg || pgto) && S.cur){
      const per = perSpread(); const nSp = Math.ceil(S.cur.pages / per);
      let cur = Math.floor(S.page / per); cur = pgto ? +pgto.dataset.bpgto : cur + (+pg.dataset.bpg);
      S.page = Math.max(0, Math.min(nSp - 1, cur)) * per; renderEditor(); return;
    }
    const z = e.target.closest('[data-bzoom]'); if(z){ openLightbox(z.dataset.bzoom); return; }
    const slot = e.target.closest('[data-bslot]');
    if(slot && S.cur){
      const i = +slot.dataset.bslot;
      if(S.edit) openSlot(i);
      else if(S.cur.slots[i]) openLightbox(S.cur.slots[i].no);
      return;
    }
    const a = e.target.closest('[data-bact]'); if(!a) return;
    const act = a.dataset.bact;
    if(act === 'new') openCreate();
    else if(act === 'back') closeBinder();
    else if(act === 'edit'){ S.edit = !S.edit; if(!S.edit && S.saveTmr) saveNow(); renderEditor(); }
    else if(act === 'settings') openSettings();
    else if(act === 'share') openShare();
    else if(act === 'copylist') salinTeks(listText(S.cur), a);
    else if(act === 'image') openImages();
    else if(act === 'addpage' && S.cur.pages < MAX_PAGES){
      S.cur.pages++; for(let k = 0; k < PER; k++) S.cur.slots.push(null);
      S.page = Math.floor((S.cur.pages - 1) / perSpread()) * perSpread(); queueSave(); renderEditor();
    }
    else if(act === 'delpage' && S.cur.pages > 1){ S.cur.pages--; S.cur.slots = S.cur.slots.slice(0, S.cur.pages * PER); queueSave(); renderEditor(); }
    else if(act === 'fillspares') fillSpares();
  });
  /* seret-lepas antarkantong (desktop, mode edit) */
  let dragFrom = null;
  document.addEventListener('dragstart', e=>{ const p = e.target.closest && e.target.closest('#bindWrap [data-bslot][draggable]'); if(!p) return; dragFrom = +p.dataset.bslot; e.dataTransfer.effectAllowed = 'move'; try{ e.dataTransfer.setData('text/plain', String(dragFrom)); }catch(err){} });
  document.addEventListener('dragover', e=>{ if(dragFrom == null) return; const p = e.target.closest && e.target.closest('#bindWrap [data-bslot]'); if(p){ e.preventDefault(); p.classList.add('drop'); } });
  document.addEventListener('dragleave', e=>{ const p = e.target.closest && e.target.closest('#bindWrap [data-bslot]'); if(p) p.classList.remove('drop'); });
  document.addEventListener('drop', e=>{
    if(dragFrom == null || !S.cur) return;
    const p = e.target.closest && e.target.closest('#bindWrap [data-bslot]'); if(!p) return;
    e.preventDefault(); const j = +p.dataset.bslot, i = dragFrom; dragFrom = null;
    if(i === j) { renderEditor(); return; }
    [S.cur.slots[i], S.cur.slots[j]] = [S.cur.slots[j], S.cur.slots[i]];
    queueSave(); renderEditor();
  });
  document.addEventListener('dragend', ()=>{ dragFrom = null; });
  /* ganti jumlah halaman per tampilan saat lebar layar melewati 761px */
  let lastPer = null;
  window.addEventListener('resize', ()=>{
    const p = perSpread(); if(p === lastPer) return; lastPer = p;
    if(S.cur && q1('#bindWrap') && !q1('#dashPanelBind').hidden){ S.page = Math.floor(S.page / p) * p; renderEditor(); }
    if(S.pub && typeof state !== 'undefined' && state.page === 'binder'){ S.pubPage = Math.floor(S.pubPage / p) * p; drawPublic(); }
  });
  /* simpan yang tertunda sebelum tab ditutup */
  window.addEventListener('pagehide', ()=>{ if(S.saveTmr) saveNow(); });

  /* =================== HALAMAN PUBLIK #binder/<kode> =================== */
  async function renderPage(code){
    const w = q1('#binderWrap'); if(!w) return;
    S.pubCode = code; S.pub = null; S.pubPage = 0; S.pubView = 'binder'; S.hideSold = false;
    w.innerHTML = '<p class="auth-note">Loading binder…</p>';
    if(!API() || !API().ready){ w.innerHTML = '<div class="bdp-empty">This binder can\'t be loaded right now. Please reload the page.</div>'; return; }
    const { data, error } = await API().getShared(code);
    if(S.pubCode !== code) return;
    if(error){ w.innerHTML = `<div class="bdp-empty">${E(errMsg(error))}</div>`; return; }
    if(!data){ w.innerHTML = `<div class="bdp-empty"><h2>📒 Binder not available</h2><p>The link may be wrong, the owner may have made it private, or it is hidden while our team reviews it.</p><a class="btn2" href="#beranda">Go to MHR Deck Lab</a></div>`; return; }
    S.pub = norm({ ...data, share_code:data.code });
    document.title = `${data.name} · MHR Deck Lab binder`;
    drawPublic();
  }
  function drawPublic(){
    const w = q1('#binderWrap'); const b = S.pub; if(!w || !b) return;
    const k = KIND[b.kind] || KIND.collection;
    const f = filled(b);
    const trade = b.kind === 'trade';
    const per = perSpread();
    if(S.pubPage >= b.pages) S.pubPage = 0;
    const waMsg = encodeURIComponent(`Hi @${b.owner}, I saw your binder “${b.name}” on MHR Deck Lab: ${linkOf(b.share_code)}`);
    const acts = [
      trade && b.contact_wa ? `<a class="btn2 bdp-wa" href="https://wa.me/${E(b.contact_wa)}?text=${waMsg}" target="_blank" rel="noopener nofollow">💬 Chat on WhatsApp</a>` : '',
      trade && b.contact_ig ? `<a class="btn2 bdp-ig" href="https://www.instagram.com/${E(b.contact_ig)}/" target="_blank" rel="noopener nofollow">📷 @${E(b.contact_ig)}</a>` : '',
      `<button type="button" class="btn2" data-bpub="list">📋 Copy list</button>`,
      `<button type="button" class="btn2" data-bpub="link">🔗 ${navigator.share ? 'Share' : 'Copy link'}</button>`,
    ].join('');
    const spread = (start) => {
      const mode = 'pub';
      const pg = p => p >= b.pages ? '' : `<div class="bp-page">${Array.from({length:PER}, (_, kk)=>{ const s = b.slots[p*PER + kk] || null; return pocketHTML(s && S.hideSold && s.sold ? null : s, p*PER + kk, mode, b); }).join('')}<div class="bp-no">Page ${p+1}</div></div>`;
      const pages = []; for(let p = start; p < start + per; p++) pages.push(pg(p));
      const nSp = Math.ceil(b.pages / per), cur = Math.floor(start / per);
      const a = start + 1, z = Math.min(b.pages, start + per);
      return `<div class="bp-spread bp-per${Math.min(per, b.pages)}">${pages.join('')}</div>
        <div class="bp-pager"><button type="button" data-bppg="-1" ${cur<=0?'disabled':''} aria-label="Previous pages">‹</button>
        <span class="bp-dots">${nSp <= 12 ? Array.from({length:nSp}, (_, i)=>`<i class="${i===cur?'on':''}" data-bppgto="${i}"></i>`).join('') : ''}</span>
        <button type="button" data-bppg="1" ${cur>=nSp-1?'disabled':''} aria-label="Next pages">›</button>
        <span class="bd-mut">Page${a===z?'':'s'} ${a}${a===z?'':'–'+z} of ${b.pages}</span></div>`;
    };
    w.innerHTML = `${b.is_owner ? `<div class="bdp-own">This is your binder${b.is_public ? '' : ' (private: only you can see it)'}${b.hidden ? '. It is hidden from other people while our team reviews reports' : ''}. <a href="#dashboard" data-bpub="edit">Edit it in My Dashboard → Binders</a></div>` : ''}
      <div class="bdp-top"><div class="bdp-ico" style="background:${k.bg}">${k.icon}</div>
        <div class="bdp-h"><span class="bd-mut">Shared binder · ${E(k.label)}</span><h2>${E(b.name)}</h2>
          <span class="bd-mut">by <b>@${E(b.owner)}</b>${b.location ? ` · 📍 ${E(b.location)}` : ''} · updated ${E(tglPendek(b.updated_at))} · ${f.length} card${f.length===1?'':'s'}</span></div>
        <div class="bdp-acts">${acts}</div></div>
      ${b.note ? `<p class="bdp-note">${E(b.note)}</p>` : ''}
      ${trade ? `<div class="bd-disc">⚠️ ${DISCLAIMER}</div>` : ''}
      <div class="bdp-tool"><div class="bs-sets"><button type="button" data-bpview="binder" aria-pressed="${S.pubView==='binder'}">📒 Binder view</button><button type="button" data-bpview="list" aria-pressed="${S.pubView==='list'}">☰ List view</button>
        ${trade && f.some(s=>s.sold) ? `<button type="button" data-bpub="sold" aria-pressed="${S.hideSold}">Hide sold</button>` : ''}</div></div>
      ${S.pubView === 'binder' ? spread(S.pubPage) : (tableHTML(b, 'pub') || '<p class="bd-mut">This binder is empty.</p>')}
      ${f.length && S.pubView === 'binder' ? '<p class="bd-mut bdp-tip">Tap a card to see its details.</p>' : ''}
      <div class="bdp-foot">${trade ? '' : '<span class="bd-mut">Shared from MHR Deck Lab, a fan-made Marvel Hero Rush deck builder and collection tracker.</span>'}
        ${b.is_owner ? '' : '<button type="button" class="bdp-report" data-bpub="report">🚩 Report this binder</button>'}</div>`;
  }
  function openReport(){
    const b = S.pub; if(!b) return;
    (async ()=>{
      if(!(await loggedIn())){
        const m = mxOpen(`<h3>🚩 Report this binder</h3><p class="bd-mut">Please log in to send a report. Reports come from accounts so our team can follow up and stop fake reports.</p>
          <div class="bd-btns"><button type="button" class="btn2 main" id="brLogin">👤 Log in / Sign up</button><button type="button" class="btn2" data-mxclose>Cancel</button></div>`, 'bd-mx');
        m.querySelector('#brLogin').addEventListener('click', ()=>{ mxClose(); const btn = q1('#btnAccount'); if(btn) btn.click(); });
        return;
      }
      const m = mxOpen(`<h3>🚩 Report this binder</h3><p class="bd-mut">Tell us what's wrong with “${E(b.name)}”. The owner won't see who reported it.</p>
        <div class="bd-form">${REASONS.map(([k2, l], i)=>`<label class="bd-ropt"><input type="radio" name="brWhy" value="${k2}"${i===0?' checked':''}> ${E(l)}</label>`).join('')}
        <label class="bd-f"><span>Details (optional)</span><textarea id="brNote" maxlength="500" rows="3" placeholder="e.g. asked me to transfer to a different name, then blocked me"></textarea></label>
        <p class="bd-err" id="brErr"></p>
        <div class="bd-btns"><button type="button" class="btn2 main" id="brSend">Send report</button><button type="button" class="btn2" data-mxclose>Cancel</button></div></div>`, 'bd-mx');
      const box = m.querySelector('.mx-box');
      box.querySelector('#brSend').addEventListener('click', async ev=>{
        ev.target.disabled = true;
        const why = box.querySelector('input[name="brWhy"]:checked').value;
        const { error } = await API().report(b.share_code, why, box.querySelector('#brNote').value.trim());
        if(error){ ev.target.disabled = false; box.querySelector('#brErr').textContent = errMsg(error); return; }
        box.innerHTML = `<button class="mx-x" data-mxclose aria-label="Close">✕</button><h3>✓ Thanks for the report</h3><p class="bd-mut">Our team will review this binder. If you were asked to pay, stop and don't send money until you've checked the seller.</p><div class="bd-btns"><button type="button" class="btn2 main" data-mxclose>Close</button></div>`;
      });
    })();
  }
  document.addEventListener('click', e=>{
    const w = q1('#binderWrap'); if(!w || !w.contains(e.target) || !S.pub) return;
    const b = S.pub, per = perSpread();
    const pg = e.target.closest('[data-bppg]'), pgto = e.target.closest('[data-bppgto]');
    if(pg || pgto){ const nSp = Math.ceil(b.pages / per); let cur = Math.floor(S.pubPage / per); cur = pgto ? +pgto.dataset.bppgto : cur + (+pg.dataset.bppg); S.pubPage = Math.max(0, Math.min(nSp - 1, cur)) * per; drawPublic(); return; }
    const vw = e.target.closest('[data-bpview]'); if(vw){ S.pubView = vw.dataset.bpview; drawPublic(); return; }
    const z = e.target.closest('[data-bzoom]'); if(z){ openLightbox(z.dataset.bzoom); return; }
    const slot = e.target.closest('[data-bslot]'); if(slot){ const s = b.slots[+slot.dataset.bslot]; if(s) openLightbox(s.no); return; }
    const a = e.target.closest('[data-bpub]'); if(!a) return;
    const act = a.dataset.bpub;
    if(act === 'list') salinTeks(listText(b, b.owner), a);
    else if(act === 'link'){
      if(navigator.share){ navigator.share({ title:b.name, text:`${b.name} — MHR Deck Lab binder`, url:linkOf(b.share_code) }).catch(()=>{}); }
      else salinTeks(linkOf(b.share_code), a);
    }
    else if(act === 'sold'){ S.hideSold = !S.hideSold; drawPublic(); }
    else if(act === 'report') openReport();
    else if(act === 'edit'){ e.preventDefault(); try{ localStorage.setItem('mhr_dash_tab', 'bind'); }catch(err){} if(typeof dashTab !== 'undefined') dashTab = 'bind';
      const id = b.id; S.list = null; setPage('dashboard'); refresh().then(()=>{ const x = (S.list||[]).find(r=>r.id === id); if(x){ openBinder(id, true); } }); }
  });


  /* =================== v7.07 — SIMPAN HALAMAN BINDER SEBAGAI GAMBAR (Tahap C) ===================
     Digambar langsung di <canvas> (tanpa html2canvas) supaya hasilnya tajam dan konsisten:
     Story 9:16 (1080×1920, aman untuk zona tombol IG/TikTok: 150 px atas, 175 px bawah) atau
     Post 4:5 (1080×1350). Gaya mengikuti template konten sosmed MHR Deck Lab: latar #0B0E12,
     dua cahaya lembut, logo kiri + chip emas kanan + nomor halaman, kartu berbingkai gelap.
     Satu gambar = satu halaman binder (9 kantong). Gambar kartu dari images/ (origin yang sama,
     canvas tidak "tainted"). QR code (qrcode.js, dimuat saat dibutuhkan) mengarah ke link binder
     kalau link berbagi aktif. Hasil: pratinjau + unduh PNG per halaman / semua, atau Share
     (Web Share API dengan berkas) di HP supaya bisa langsung ke Instagram / WhatsApp. */
  const IMG_FMT = {
    story: { W:1080, H:1920, top:150, bottom:175, pad:72, title:64, sub:30, gap:18, foot:130, label:'Story 9:16 (1080×1920)' },
    post:  { W:1080, H:1350, top:74,  bottom:65,  pad:72, title:52, sub:27, gap:16, foot:112, label:'Post 4:5 (1080×1350)' },
  };
  const KIND_GLOW = { collection:'#E4442E', trade:'#33A45C', wishlist:'#8B5CF6' };
  let qrLoading = null;
  function loadQr(){
    if(window.qrcode) return Promise.resolve();
    if(!qrLoading) qrLoading = new Promise((ok, fail)=>{
      const sc = document.createElement('script'); sc.src = 'qrcode.js?v=6.99';
      sc.onload = ok; sc.onerror = ()=>{ qrLoading = null; fail(new Error('qr')); };
      document.head.appendChild(sc);
    });
    return qrLoading;
  }
  const imgCache = new Map();
  function loadImg(src){
    if(!imgCache.has(src)) imgCache.set(src, new Promise(res=>{
      const im = new Image(); im.decoding = 'async';
      im.onload = () => res(im.naturalWidth ? im : null); im.onerror = () => res(null); im.src = src;
    }));
    return imgCache.get(src);
  }
  async function cardImage(c, v){
    const tries = [artFile(c.no, v || c.ra[0])];
    if(v && v !== c.ra[0]) tries.push(artFile(c.no, c.ra[0]));
    if(typeof altArtFile === 'function'){ const alt = altArtFile(c.no); if(alt) tries.push(alt); }
    for(const src of tries){ const im = await loadImg(src); if(im) return im; }
    return null;
  }
  function rr(ctx, x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapLines(ctx, text, maxW){
    const words = String(text).split(/\s+/); const out = []; let cur = '';
    words.forEach(w=>{ const t2 = cur ? cur + ' ' + w : w; if(ctx.measureText(t2).width > maxW && cur){ out.push(cur); cur = w; } else cur = t2; });
    if(cur) out.push(cur); return out;
  }
  function fitText(ctx, text, maxW){
    if(ctx.measureText(text).width <= maxW) return text;
    let s = text; while(s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  const prettyWa = d => d ? '+' + d.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2 $3 $4') : '';

  /* satu halaman binder → canvas */
  async function renderPageImage(b, pageIdx, fmtKey, opt){
    const F = IMG_FMT[fmtKey] || IMG_FMT.story;
    const { W, H, pad } = F;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const bodyFont = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const dispFont = (getComputedStyle(document.documentElement).getPropertyValue('--disp') || '').trim() || bodyFont;
    const monoFont = (getComputedStyle(document.documentElement).getPropertyValue('--mono') || '').trim() || 'monospace';
    const k = KIND[b.kind] || KIND.collection;
    const trade = b.kind === 'trade';
    /* latar + cahaya */
    ctx.fillStyle = '#0B0E12'; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, 900); g.addColorStop(0, col + '30'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    glow(W, 0, '#F2B01E'); glow(0, H, KIND_GLOW[b.kind] || '#E4442E');
    /* header: logo + chip + nomor halaman */
    let y = F.top;
    const logo = await loadImg('icons/logo-header.png?v=7.03');
    if(logo){ const lh = 55, lw = lh * logo.naturalWidth / logo.naturalHeight; ctx.drawImage(logo, pad, y, lw, lh); }
    else { ctx.fillStyle = '#fff'; ctx.font = `800 40px ${dispFont}`; ctx.textBaseline = 'middle'; ctx.fillText('MHR DECK LAB', pad, y + 28); }
    ctx.textBaseline = 'middle';
    ctx.font = `600 28px ${bodyFont}`; ctx.fillStyle = '#8A94A3';
    const counter = `${pageIdx + 1}/${b.pages}`;
    const cw0 = ctx.measureText(counter).width;
    ctx.textAlign = 'right'; ctx.fillText(counter, W - pad, y + 28);
    ctx.font = `800 24px ${bodyFont}`;
    const chipTxt = k.label.toUpperCase();
    const chipW = ctx.measureText(chipTxt).width + 36;
    const chipX = W - pad - cw0 - 18 - chipW;
    ctx.fillStyle = '#F2B01E'; rr(ctx, chipX, y + 6, chipW, 44, 8); ctx.fill();
    ctx.fillStyle = '#1A1200'; ctx.textAlign = 'center'; ctx.fillText(chipTxt, chipX + chipW / 2, y + 29);
    ctx.textAlign = 'left';
    y += 55;
    /* judul + baris pemilik */
    ctx.textBaseline = 'alphabetic';
    let ts = F.title; ctx.font = `800 ${ts}px ${dispFont}`;
    let lines = wrapLines(ctx, b.name, W - 2 * pad);
    if(lines.length > 1){ ts = Math.round(F.title * 0.82); ctx.font = `800 ${ts}px ${dispFont}`; lines = wrapLines(ctx, b.name, W - 2 * pad).slice(0, 2); }
    ctx.fillStyle = '#FFFFFF';
    lines.forEach(l=>{ y += ts * 1.08; ctx.fillText(fitText(ctx, l, W - 2 * pad), pad, y); });
    const sub = [`by @${opt.owner || 'me'}`, b.location ? `📍 ${b.location}` : ''].filter(Boolean).join('   ');
    ctx.font = `500 ${F.sub}px ${bodyFont}`; ctx.fillStyle = '#C0C8D2';
    y += F.sub * 1.45; ctx.fillText(fitText(ctx, sub, W - 2 * pad), pad, y);
    /* area grid */
    const gridTop = y + 30;
    const footTop = H - F.bottom - F.foot;
    const gridH = footTop - gridTop - 24;
    const gap = F.gap;
    let cw = (W - 2 * pad - 2 * gap) / 3, ch = cw * 88 / 63;
    if(3 * ch + 2 * gap > gridH){ ch = (gridH - 2 * gap) / 3; cw = ch * 63 / 88; }
    cw = Math.floor(cw); ch = Math.floor(ch);
    const gx = Math.round((W - (3 * cw + 2 * gap)) / 2);
    const gy = Math.round(gridTop + (gridH - (3 * ch + 2 * gap)) / 2);
    const slots = b.slots.slice(pageIdx * PER, pageIdx * PER + PER);
    const imgs = await Promise.all(slots.map(s=>{ if(!s || (opt.hideSold && s.sold)) return null; const c = card(s.no); return c ? cardImage(c, vOf(c, s)) : null; }));
    const rad = Math.round(cw * 0.05);
    for(let i = 0; i < PER; i++){
      const s = slots[i] && !(opt.hideSold && slots[i].sold) ? slots[i] : null;
      const x = gx + (i % 3) * (cw + gap), yy = gy + Math.floor(i / 3) * (ch + gap);
      if(!s){
        ctx.save(); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = '#2C3644'; rr(ctx, x + 2, yy + 2, cw - 4, ch - 4, rad); ctx.stroke(); ctx.restore();
        continue;
      }
      const c = card(s.no);
      /* bingkai + bayangan */
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#050608'; rr(ctx, x, yy, cw, ch, rad); ctx.fill(); ctx.restore();
      const bw = Math.max(4, Math.round(cw * 0.02));
      ctx.save(); rr(ctx, x + bw, yy + bw, cw - 2 * bw, ch - 2 * bw, rad - 2); ctx.clip();
      if(s.sold) ctx.filter = 'grayscale(1) brightness(.5)';
      if(imgs[i]) ctx.drawImage(imgs[i], x + bw, yy + bw, cw - 2 * bw, ch - 2 * bw);
      else { ctx.fillStyle = '#1F2731'; ctx.fillRect(x, yy, cw, ch); ctx.fillStyle = '#8A94A3'; ctx.font = `700 ${Math.round(cw*0.08)}px ${bodyFont}`; ctx.textAlign = 'center'; ctx.fillText(s.no, x + cw/2, yy + ch/2); ctx.textAlign = 'left'; }
      ctx.filter = 'none';
      /* bar bawah: versi + harga */
      const vl = (s.v && s.v !== c.ra[0]) ? vLabel(c, s.v) : '';
      let price = '', nego = false, muted = false;
      if(trade){
        const has = s.price != null && s.price !== '' && opt.prices;
        if(has){ price = shortRp(+s.price); nego = !!s.nego; }
        else if(s.nego){ price = 'Make offer'; muted = true; }
      }
      if(vl || price){
        const bh = Math.round(ch * 0.13);
        ctx.fillStyle = 'rgba(11,14,18,.9)'; ctx.fillRect(x, yy + ch - bh, cw, bh);
        const fs = Math.round(bh * 0.5), cy = yy + ch - bh / 2;
        ctx.textBaseline = 'middle';
        const parts = [];
        ctx.font = `800 ${Math.round(fs*0.72)}px ${bodyFont}`; const vw = vl ? ctx.measureText(vl).width + fs * 0.6 : 0;
        ctx.font = `800 ${fs}px ${muted ? bodyFont : monoFont}`; const pw = price ? ctx.measureText(price).width : 0;
        ctx.font = `800 ${Math.round(fs*0.58)}px ${bodyFont}`; const nw = nego ? ctx.measureText('NEGO').width : 0;
        const total = vw + (vl && price ? fs * 0.35 : 0) + pw + (nego ? fs * 0.3 + nw : 0);
        let cx = x + (cw - total) / 2;
        if(vl){
          const sec = /^(SEC|HR|TR)/.test(rarBase(s.v));
          if(sec){ const g = ctx.createLinearGradient(cx, 0, cx + vw, 0); g.addColorStop(0, '#f9d976'); g.addColorStop(.5, '#e0a3ff'); g.addColorStop(1, '#7fd3ff'); ctx.fillStyle = g; }
          else ctx.fillStyle = /^(MR|ER)/.test(rarBase(s.v)) ? '#c9cfd8' : '#F2B01E';
          rr(ctx, cx, cy - fs * 0.48, vw, fs * 0.96, 5); ctx.fill();
          ctx.fillStyle = '#111'; ctx.font = `800 ${Math.round(fs*0.72)}px ${bodyFont}`; ctx.textAlign = 'center'; ctx.fillText(vl, cx + vw / 2, cy + 1); ctx.textAlign = 'left';
          cx += vw + (price ? fs * 0.35 : 0);
        }
        if(price){ ctx.font = `800 ${fs}px ${muted ? bodyFont : monoFont}`; ctx.fillStyle = muted ? '#C0C8D2' : '#F2B01E'; ctx.fillText(price, cx, cy + 1); cx += pw; }
        if(nego){ cx += fs * 0.3; ctx.font = `800 ${Math.round(fs*0.58)}px ${bodyFont}`; ctx.fillStyle = '#33A45C'; ctx.fillText('NEGO', cx, cy + 1); }
        ctx.textBaseline = 'alphabetic';
      }
      /* jumlah */
      if((s.q || 1) > 1){
        const t = `×${s.q}`, fs = Math.round(cw * 0.085);
        ctx.font = `800 ${fs}px ${monoFont}`; const tw = ctx.measureText(t).width + fs * 0.7;
        ctx.fillStyle = 'rgba(11,14,18,.9)'; rr(ctx, x + cw - tw - bw - 6, yy + bw + 6, tw, fs * 1.5, 7); ctx.fill();
        ctx.strokeStyle = '#2C3644'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(t, x + cw - tw / 2 - bw - 6, yy + bw + 6 + fs * 0.77); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
      if(s.sold){
        ctx.save(); ctx.translate(x + cw / 2, yy + ch * 0.45); ctx.rotate(-14 * Math.PI / 180);
        const bh2 = ch * 0.12; ctx.fillStyle = 'rgba(228,68,46,.92)'; ctx.fillRect(-cw * 0.62, -bh2 / 2, cw * 1.24, bh2);
        ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(bh2 * 0.62)}px ${dispFont}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SOLD', 0, 2);
        ctx.restore();
      }
    }
    /* footer: link + kontak + QR */
    const qrS = F.foot - 6;
    let left = pad, maxTxt = W - 2 * pad;
    if(opt.qr && b.is_public && window.qrcode){
      const url = linkOf(b.share_code);
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      const n = qr.getModuleCount(), cell = Math.floor((qrS - 16) / n), real = cell * n, qx = W - pad - qrS, qy = footTop + 2;
      ctx.fillStyle = '#FFFFFF'; rr(ctx, qx, qy, qrS, qrS, 12); ctx.fill();
      ctx.fillStyle = '#0B0E12';
      const ox = qx + (qrS - real) / 2, oy = qy + (qrS - real) / 2;
      for(let r = 0; r < n; r++) for(let c2 = 0; c2 < n; c2++) if(qr.isDark(r, c2)) ctx.fillRect(ox + c2 * cell, oy + r * cell, cell, cell);
      maxTxt -= qrS + 24;
    }
    ctx.textBaseline = 'alphabetic';
    let fy = footTop + 34;
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 ${fmtKey === 'story' ? 30 : 27}px ${bodyFont}`;
    ctx.fillText(fitText(ctx, b.is_public ? `mhrdecklab.com/#binder/${b.share_code}` : 'mhrdecklab.com', maxTxt), left, fy);
    const contact = trade ? [b.contact_wa ? `WA ${prettyWa(b.contact_wa)}` : '', b.contact_ig ? `IG @${b.contact_ig}` : ''].filter(Boolean).join('  ·  ') : '';
    if(contact){ fy += 38; ctx.fillStyle = '#F2B01E'; ctx.font = `700 ${fmtKey === 'story' ? 26 : 24}px ${bodyFont}`; ctx.fillText(fitText(ctx, contact, maxTxt), left, fy); }
    fy += contact ? 34 : 38;
    ctx.fillStyle = '#8A94A3'; ctx.font = `500 ${fmtKey === 'story' ? 21 : 19}px ${bodyFont}`;
    ctx.fillText(fitText(ctx, trade ? 'Deals are made directly between buyer and seller.' : 'Made with MHR Deck Lab binders.', maxTxt), left, fy);
    fy += 28;
    ctx.fillText(fitText(ctx, 'Card art © MARVEL © JASON · fan-made content, unofficial', maxTxt), left, fy);
    return cv;
  }
  const slug = s => String(s || 'binder').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'binder';
  const toBlob = cv => new Promise(res => cv.toBlob(b => res(b), 'image/png'));

  function openImages(){
    const b = S.cur; if(!b) return;
    const nonEmpty = []; for(let p = 0; p < b.pages; p++) if(b.slots.slice(p * PER, p * PER + PER).some(Boolean)) nonEmpty.push(p);
    const curPage = S.page;
    const trade = b.kind === 'trade';
    const m = mxOpen(`<h3>🖼 Save pages as image</h3>
      <p class="bd-mut">One image per binder page, ready for an Instagram / TikTok story or post, or to send on WhatsApp.</p>
      <div class="bd-form">
        <div class="bd-f"><span>Format</span><div class="bs-sets" id="biFmt">${Object.entries(IMG_FMT).map(([key, f], i)=>`<button type="button" data-bifmt="${key}" aria-pressed="${i===0}">${E(f.label)}</button>`).join('')}</div></div>
        <div class="bd-f"><span>Pages</span><div class="bs-sets" id="biPages">
          <button type="button" data-bipg="all" aria-pressed="true">All pages with cards (${nonEmpty.length})</button>
          <button type="button" data-bipg="cur" aria-pressed="false">Page ${curPage + 1} only</button></div></div>
        ${trade ? `<label class="bd-chk"><input type="checkbox" id="biPrice"${b.show_prices !== false ? ' checked' : ''}> Show prices</label>
          <label class="bd-chk"><input type="checkbox" id="biSold" checked> Leave out sold cards</label>` : ''}
        <label class="bd-chk${b.is_public ? '' : ' off'}"><input type="checkbox" id="biQr"${b.is_public ? ' checked' : ' disabled'}> Add a QR code to the binder link${b.is_public ? '' : ' (turn on the shared link first)'}</label>
        <div class="bd-btns"><button type="button" class="btn2 main" id="biGo">Create images</button><button type="button" class="btn2" data-mxclose>Close</button></div>
        <p class="bd-err" id="biErr"></p>
        <div class="bi-out" id="biOut"></div>
      </div>`, 'bd-mx bd-mx-wide');
    const box = m.querySelector('.mx-box');
    let fmt = 'story', which = 'all', made = [];
    box.addEventListener('click', async e=>{
      const f = e.target.closest('[data-bifmt]');
      if(f){ fmt = f.dataset.bifmt; box.querySelectorAll('[data-bifmt]').forEach(x=>x.setAttribute('aria-pressed', String(x === f))); return; }
      const pg = e.target.closest('[data-bipg]');
      if(pg){ which = pg.dataset.bipg; box.querySelectorAll('[data-bipg]').forEach(x=>x.setAttribute('aria-pressed', String(x === pg))); return; }
      const dl = e.target.closest('[data-bidl]');
      if(dl){ const it = made[+dl.dataset.bidl]; if(it) downloadBlob(it.blob, it.name); return; }
      if(e.target.closest('[data-biall]')){ for(const it of made){ downloadBlob(it.blob, it.name); await new Promise(r=>setTimeout(r, 450)); } return; }
      if(e.target.closest('[data-bishare]')){
        const files = made.map(it => new File([it.blob], it.name, { type:'image/png' }));
        try{ await navigator.share({ files, title:b.name, text: b.is_public ? linkOf(b.share_code) : b.name }); }catch(err){}
        return;
      }
      if(e.target.id !== 'biGo') return;
      const btn = e.target; btn.disabled = true; btn.textContent = 'Creating…';
      const out = box.querySelector('#biOut'); out.innerHTML = '';
      const err = box.querySelector('#biErr'); err.textContent = '';
      const chk = id => { const el = box.querySelector(id); return !!(el && el.checked && !el.disabled); };
      const opt = { prices: trade ? chk('#biPrice') : false, hideSold: trade ? chk('#biSold') : false, qr: chk('#biQr'), owner: S.username || '' };
      if(!opt.owner && window.MHRAuth && window.MHRAuth.getUsername){ try{ const ss = await window.MHRAuth.getSession(); opt.owner = S.username = (await window.MHRAuth.getUsername(ss)) || ''; }catch(er){} }
      if(opt.qr){ try{ await loadQr(); }catch(er){ opt.qr = false; } }
      const pages = which === 'cur' ? [curPage] : (nonEmpty.length ? nonEmpty : [0]);
      made.forEach(it => URL.revokeObjectURL(it.url)); made = [];
      try{
        for(const p of pages){
          const cv = await renderPageImage(b, p, fmt, opt);
          const blob = await toBlob(cv);
          if(!blob) throw new Error('blob');
          const name = `${slug(b.name)}-page${p + 1}-${fmt}.png`;
          made.push({ blob, name, url: URL.createObjectURL(blob), p });
        }
      }catch(er){ err.textContent = 'Couldn\'t create the images on this browser. Please try again, or use another browser.'; }
      btn.disabled = false; btn.textContent = 'Create images again';
      const canShare = !!(navigator.canShare && made.length && navigator.canShare({ files:[new File([made[0].blob], made[0].name, { type:'image/png' })] }));
      out.innerHTML = made.length ? `<div class="bd-btns">${canShare ? '<button type="button" class="btn2 main" data-bishare="1">📤 Share to Instagram / WhatsApp…</button>' : ''}
          ${made.length > 1 ? `<button type="button" class="btn2${canShare ? '' : ' main'}" data-biall="1">⬇ Download all (${made.length})</button>` : ''}</div>
        <div class="bi-grid bi-${fmt}">${made.map((it, i)=>`<figure><img src="${it.url}" alt="Page ${it.p + 1}"><figcaption>Page ${it.p + 1} <button type="button" class="btn2" data-bidl="${i}">⬇ Download</button></figcaption></figure>`).join('')}</div>` : '';
    });
  }
  function downloadBlob(blob, name){
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  if(window.MHRAuth && window.MHRAuth.ready && window.MHRAuth.onAuthChange){
    window.MHRAuth.onAuthChange(()=>{ if(typeof state !== 'undefined' && state.page === 'binder' && S.pubCode) renderPage(S.pubCode); });
  }
  window.binderCodeFromHash = h => { const m = /^#binder\/([A-Za-z0-9]{6,32})$/.exec(h || ''); return m ? m[1] : null; };
  window.MHRBindersUI = {
    renderTab, refresh, renderPage,
    reset(){ S.list = null; S.cur = null; S.edit = false; S.err = null; },
    _state: S, _renderPageImage: renderPageImage,
  };
})();
