/* ===================================================================
   MHR DECK LAB — set-ui.js (halaman Set & Spoiler, v6.64)
   ===================================================================
   Rute:
     #set          daftar set: "Segera rilis" (spoiler) + "Sudah rilis"
     #set/<KODE>   satu set: info produk, statistik (warna, rarity, level),
                   dan semua kartunya
   Data:
     window.SETS      (data.js)     — info produk, urutan, status, tanggal
     DB               (cards.js)    — kartu yang sudah rilis
     window.SPOILERS  (spoilers.js) — kartu yang baru diungkap (belum rilis)
   Klik kartu rilis → lightbox biasa (openLightbox). Klik kartu spoiler →
   panel spoiler sendiri (gambar + terjemahan fan), karena kartu spoiler
   tidak ada di DB dan tidak bisa dipakai di deck builder.
   Dipanggil dari setPage('set') di index.html (global $, DB, artFile, HEXC,
   CMAP, CORDER, RARITY_ORDER, openLightbox, state sudah ada saat jalan).
   =================================================================== */

(function(){
  const E = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $q = s => document.querySelector(s);
  const BULAN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const tgl = s => { if(!s) return ''; const [y,m,d] = s.split('-'); return `${+d} ${BULAN[+m-1]} ${y}`; };
  const SETS = () => Array.isArray(window.SETS) ? window.SETS : [];
  const SPOIL = () => Array.isArray(window.SPOILERS) ? window.SPOILERS : [];
  const hex = c => (typeof HEXC !== 'undefined' && HEXC[c]) || '#8B96A5';
  const colOrder = c => (typeof CORDER !== 'undefined' && c in CORDER) ? CORDER[c] : 9;
  /* v6.66 — dulu punya peta warna sendiri (WARNA_ID, Indonesia-only, termasuk
     "Ungu" untuk Purple). Situs sekarang satu bahasa (Inggris), jadi label
     warna dipakai bareng dari WARNA_EN yang sudah ada di index.html (const
     top-level di script inline, terlihat di sini lewat lexical scope
     bersama antar tag <script> — bukan lewat window — makanya dicek pakai
     typeof, sama seperti pola hex()/colOrder() di atas). */
  const WARNA_ID = c => (typeof WARNA_EN !== 'undefined' && WARNA_EN[c]) || c;

  /* satu "cetakan" = satu gambar: kartu dasar + tiap varian rarity-nya */
  function setData(s){
    const spoiler = s.status === 'spoiler';
    let prints = [];
    if(spoiler){
      prints = SPOIL().filter(c=>c.no.startsWith(s.kode))
        .map(c=>({no:c.no, ra:c.ra, c:c.c, l:c.l, nm:c.nm, img:c.img, spoiler:true, base: c.ra !== 'SEC'}));
    } else {
      (typeof DB !== 'undefined' ? DB : []).filter(c=>c.no.startsWith(s.kode)).forEach(c=>{
        c.ra.forEach((r,i)=>prints.push({no:c.no, ra:r, c:c.c, l:c.l, nm:(typeof cardName==='function'?cardName(c):c.nm), img:artFile(c.no, r), base:i===0}));
      });
    }
    const uniq = [...new Map(prints.map(p=>[p.no,p])).values()];
    return { prints, uniq, spoiler };
  }
  function title(s){
    return s.nama || s.namaSementara || s.kode;
  }
  function coverImg(d){
    const pick = d.uniq.slice().sort((a,b)=>b.l-a.l)[0];
    return pick ? pick.img : '';
  }
  function daysTo(s){
    const t = s.rilis && (s.rilis.id || s.rilis.cn);
    if(!t) return null;
    const ms = Date.parse(t+'T00:00:00+07:00') - Date.now();
    return ms > 0 ? Math.ceil(ms/864e5) : null;
  }
  function colorBar(uniq){
    const cnt = {}; uniq.forEach(p=>cnt[p.c]=(cnt[p.c]||0)+1);
    const tot = uniq.length || 1;
    return Object.entries(cnt).sort((a,b)=>colOrder(a[0])-colOrder(b[0]))
      .map(([c,n])=>`<i style="width:${n/tot*100}%;background:${hex(c)}" title="${E(WARNA_ID(c)||c)}: ${n}"></i>`).join('');
  }

  /* ---------------- daftar set ---------------- */
  function tile(s){
    const d = setData(s);
    const dd = daysTo(s);
    const rel = s.rilis ? [s.rilis.id?`ID ${tgl(s.rilis.id)}`:'', s.rilis.cn?`China ${tgl(s.rilis.cn)}`:''].filter(Boolean).join(' · ') : '';
    return `<a class="st-tile${d.spoiler?' st-sp':''}" href="#set/${E(s.kode)}">
      <div class="st-img">${coverImg(d)?`<img src="${E(coverImg(d))}" alt="" loading="lazy">`:''}</div>
      <div class="st-b">
        <div class="st-top"><span class="st-code">${E(s.kode)}</span>${d.spoiler?'<span class="st-badge">SPOILER</span>':''}</div>
        <b>${E(title(s))}</b>
        <span class="st-muted">${E(s.tipe||'')} · ${d.spoiler?`${d.uniq.length} cards revealed`:`${d.uniq.length} cards`}</span>
        ${rel?`<span class="st-muted">${E(rel)}${dd?` · <b class="st-dd">${dd} days left</b>`:''}</span>`:''}
        <div class="st-bar">${colorBar(d.uniq)}</div>
      </div>
    </a>`;
  }
  function renderList(w){
    const all = SETS();
    const sp = all.filter(s=>s.status==='spoiler'), rl = all.filter(s=>s.status!=='spoiler');
    w.innerHTML = `
      <div class="st-head">
        <h2 class="nw-title">Set & Spoiler</h2>
        <p class="nw-lead">Every Marvel Hero Rush product: contents, colour & rarity stats, and its card list. Cards from a set that hasn't released yet are marked SPOILER.</p>
      </div>
      ${sp.length?`<section><div class="hm-sec-h"><h2>Coming soon</h2></div><div class="st-grid">${sp.map(tile).join('')}</div></section>`:''}
      <section><div class="hm-sec-h"><h2>Released</h2></div><div class="st-grid">${rl.map(tile).join('')}</div></section>`;
  }

  /* ---------------- satu set ---------------- */
  function rarityChips(prints){
    const cnt = {}; prints.forEach(p=>cnt[p.ra]=(cnt[p.ra]||0)+1);
    const ord = (typeof RARITY_ORDER !== 'undefined') ? RARITY_ORDER : [];
    const idx = r => { const i = ord.indexOf(r); return i<0 ? 99 : i; };
    return Object.entries(cnt).sort((a,b)=>idx(a[0])-idx(b[0]))
      .map(([r,n])=>`<span class="st-chip"><b>${E(r)}</b> ${n}</span>`).join('');
  }
  function levelBars(uniq){
    const cnt = {}; uniq.forEach(p=>cnt[p.l]=(cnt[p.l]||0)+1);
    const lv = Object.keys(cnt).map(Number).sort((a,b)=>a-b);
    const max = Math.max(1, ...Object.values(cnt));
    return `<div class="st-lv">${lv.map(l=>`<div><span style="height:${Math.round(cnt[l]/max*100)}%"></span><b>${cnt[l]}</b><i>Lv${l}</i></div>`).join('')}</div>`;
  }
  function colorLegend(uniq){
    const cnt = {}; uniq.forEach(p=>cnt[p.c]=(cnt[p.c]||0)+1);
    return Object.entries(cnt).sort((a,b)=>colOrder(a[0])-colOrder(b[0]))
      .map(([c,n])=>`<span class="st-leg"><i style="background:${hex(c)}"></i>${E(WARNA_ID(c)||c)} ${n}</span>`).join('');
  }
  function renderDetail(w, kode){
    const s = SETS().find(x=>x.kode===kode);
    if(!s){ w.innerHTML = `<a class="nw-back" href="#set">← All sets</a><div class="nw-empty">Set ${E(kode)} not found.</div>`; return; }
    const d = setData(s);
    const dd = daysTo(s);
    const shown = d.prints.slice().sort((a,b)=>a.no.localeCompare(b.no) || (b.base-a.base));
    const series = !d.spoiler ? [...new Set((DB||[]).filter(c=>c.no.startsWith(kode)).map(c=>c.s))] : [];
    document.title = `${kode} ${title(s)} — Marvel Hero Rush Set — MHR Deck Lab`;
    w.innerHTML = `
      <a class="nw-back" href="#set">← All sets</a>
      <div class="st-hero">
        <div class="st-hero-img">${coverImg(d)?`<img src="${E(coverImg(d))}" alt="">`:''}</div>
        <div class="st-hero-b">
          <div class="st-top"><span class="st-code">${E(s.kode)}</span>${d.spoiler?'<span class="st-badge">SPOILER · NOT YET RELEASED</span>':''}</div>
          <h1>${E(title(s))}</h1>
          ${!s.nama?'<span class="st-muted">Working title — the official product name hasn\'t been announced yet.</span>':''}
          <div class="st-facts">
            <div><i>Type</i><b>${E(s.tipe||'-')}</b></div>
            <div><i>${d.spoiler?'Cards revealed':'Card count'}</i><b>${d.uniq.length}</b></div>
            <div><i>Prints (including variants)</i><b>${d.prints.length}</b></div>
            ${s.rilis&&s.rilis.id?`<div><i>Indonesia release</i><b>${tgl(s.rilis.id)}</b></div>`:''}
            ${s.rilis&&s.rilis.cn?`<div><i>China release</i><b>${tgl(s.rilis.cn)}${dd?` <small>(${dd} days left)</small>`:''}</b></div>`:''}
          </div>
          ${s.deskripsi?`<p class="st-desc">${E(s.deskripsi)}</p>`:''}
          <div class="st-actions">
            ${s.berita?`<a class="nw-btn" href="#berita/${E(s.berita)}">📰 Read the news</a>`:''}
            ${series.length===1?`<button class="nw-btn" data-stseri="${E(series[0])}">🃏 View in Cards page</button>`:''}
          </div>
        </div>
      </div>
      ${d.uniq.length?`<div class="st-stats">
        <div class="hm-box"><h3 class="st-h3">Colour</h3><div class="st-bar st-bar-lg">${colorBar(d.uniq)}</div><div class="st-legs">${colorLegend(d.uniq)}</div></div>
        <div class="hm-box"><h3 class="st-h3">Rarity (all prints)</h3><div class="st-chips">${rarityChips(d.prints)}</div></div>
        <div class="hm-box"><h3 class="st-h3">Level spread</h3>${levelBars(d.uniq)}</div>
      </div>`:''}
      ${d.spoiler?'<div class="st-note">Spoiler card text is a <b>fan translation</b> from Chinese product sheets and may differ from the official version. These cards can\'t be used in the Deck Builder yet.</div>':''}
      <div class="hm-sec-h" style="margin-top:6px"><h2>Card list</h2><span class="st-muted">${shown.length} images</span></div>
      <div class="st-cards">${shown.map(p=>`<button class="st-card" data-${p.spoiler?'spoil':'card'}="${E(p.no)}" data-ra="${E(p.ra)}">
          <img src="${E(p.img)}" alt="${E(p.no+' '+p.nm)}" loading="lazy">
          <span><b>${E(p.no)}</b> ${E(p.ra)}</span>
        </button>`).join('')}</div>`;
  }

  /* ---------------- panel kartu spoiler ---------------- */
  function openSpoiler(no, ra){
    const c = SPOIL().find(x=>x.no===no && x.ra===ra) || SPOIL().find(x=>x.no===no); if(!c) return;
    const base = /Alternate art/.test((c.e||[]).join(' ')) ? SPOIL().find(x=>x.no===no && x!==c) : null;
    const eff = (base||c).e || [];
    let box = $q('#stSpoil');
    if(!box){ box = document.createElement('div'); box.id = 'stSpoil'; document.body.appendChild(box);
      box.addEventListener('click', e=>{ if(e.target===box || e.target.closest('[data-stclose]')) box.hidden = true; }); }
    box.innerHTML = `<div class="st-sp-in" role="dialog" aria-label="${E(c.nm)}">
      <button class="st-sp-x" data-stclose>✕</button>
      <img src="${E(c.img)}" alt="">
      <div class="st-sp-b">
        <span class="st-badge">SPOILER · FAN TRANSLATION</span>
        <h3>${E(c.nm)}</h3>
        <div class="st-muted"><i class="st-dot" style="background:${hex(c.c)}"></i>${E(WARNA_ID(c.c)||c.c)} · ${E(c.no)} ${E(c.ra)} · Lv${c.l} · R-${c.r} · Power ${c.p}</div>
        <div class="st-muted">Trait: ${E(c.f)}</div>
        <div class="st-eff">${eff.map(x=>`<p>${E(x)}</p>`).join('')}</div>
      </div>
    </div>`;
    box.hidden = false;
  }
  document.addEventListener('keydown', e=>{ const b = $q('#stSpoil'); if(e.key==='Escape' && b && !b.hidden) b.hidden = true; });

  document.addEventListener('click', e=>{
    const pg = e.target.closest('#setPage'); if(!pg) return;
    const sp = e.target.closest('[data-spoil]');
    if(sp){ openSpoiler(sp.dataset.spoil, sp.dataset.ra); return; }
    const cd = e.target.closest('[data-card]');
    if(cd && typeof openLightbox === 'function'){ openLightbox(cd.dataset.card); return; }
    const sr = e.target.closest('[data-stseri]');
    if(sr){
      setPage('cards');
      const sel = $q('#fSeries'); if(sel){ sel.value = sr.dataset.stseri; sel.dispatchEvent(new Event('change')); }
    }
  });

  window.renderSet = function(kode){
    const w = $q('#setWrap'); if(!w) return;
    if(kode) renderDetail(w, kode.toUpperCase());
    else { document.title = 'Marvel Hero Rush Set & Spoiler — MHR Deck Lab'; renderList(w); }
  };
  window.setKodeFromHash = h => { const m = /^#set\/([A-Za-z0-9-]+)$/.exec(h||''); return m ? m[1].toUpperCase() : null; };
})();
