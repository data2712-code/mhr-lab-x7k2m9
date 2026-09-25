/* ===================================================================
   MHR DECK LAB — home-ui.js (halaman Beranda, v6.63)
   ===================================================================
   Halaman pembuka situs (#beranda). Isinya dirangkai dari data yang SUDAH
   ada — tidak ada tabel/SQL baru:
     - berita utama + 3 berita terbaru   → window.MHRNews (tabel news)
     - hitung mundur rilis berikutnya    → window.RILIS di data.js
     - Weekly Rush LGS hari ini          → window.LGS di data.js
     - juara turnamen terbaru            → window.TOURNAMENTS di data.js
     - deck komunitas terpopuler         → MHRDecks.listPublic + MHRSocial.engagementFor
       (like 7 hari terakhir; kalau belum ada like, deck publik terbaru)
     - jelajah per seri                  → DB (cards.js)

   Dimuat SEBELUM blok <script> inline di index.html; fungsinya baru
   dipanggil dari setPage('beranda'), jadi global dari blok inline ($, DB,
   LGS, TOURNAMENTS, DECK_KOMUNITAS, decodeDeck, deckStats, previewCards,
   artFile, hariIni, jamTz, escHtml, state, setPage) sudah ada saat jalan.
   Tiap bagian dirender sendiri-sendiri & aman gagal: kalau satu sumber
   data error/kosong, bagian itu disembunyikan, bukan merusak halaman.
   =================================================================== */

(function(){
  const E = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $q = s => document.querySelector(s);
  const HARI = ['','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const fmtTgl = d => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  let cdTimer = 0;
  let cache = { news:null, popular:null };

  /* ---------------- rilis berikutnya (data.js → window.RILIS) ---------------- */
  function nextRelease(){
    const list = Array.isArray(window.RILIS) ? window.RILIS : [];
    const now = Date.now();
    return list.map(r=>({...r, t: Date.parse(r.tanggal + 'T00:00:00' + (r.zona || '+07:00'))}))
      .filter(r=>!isNaN(r.t) && r.t > now).sort((a,b)=>a.t-b.t)[0] || null;
  }
  function countdownHTML(r){
    const link = r.berita ? `#berita/${E(r.berita)}` : (r.link || '');
    return `<div class="hm-cd">
      <div class="hm-cd-l">
        <span class="hm-kicker">Rilis berikutnya${r.wilayah?` · ${E(r.wilayah)}`:''}</span>
        <b>${E(r.nama)}</b>
        <span class="hm-cd-date">${(([y,m,d])=>`${+d} ${BULAN[+m-1]} ${y}`)(r.tanggal.split('-'))}</span>
      </div>
      <div class="hm-cd-t" data-t="${r.t}">${cdUnits(r.t)}</div>
      ${link?`<a class="hm-cd-go" href="${E(link)}">Lihat detail →</a>`:''}
    </div>`;
  }
  function cdUnits(t){
    let s = Math.max(0, Math.floor((t - Date.now())/1000));
    const d = Math.floor(s/86400); s -= d*86400;
    const h = Math.floor(s/3600);  s -= h*3600;
    const m = Math.floor(s/60);
    const u = (n,l)=>`<span><b>${String(n).padStart(2,'0')}</b><i>${l}</i></span>`;
    return u(d,'hari') + u(h,'jam') + u(m,'menit');
  }
  function tickCountdown(){
    const el = $q('.hm-cd-t'); if(!el){ clearInterval(cdTimer); cdTimer = 0; return; }
    el.innerHTML = cdUnits(+el.dataset.t);
  }

  /* ---------------- LGS hari ini ---------------- */
  function lgsTodayHTML(){
    const L = (typeof LGS !== 'undefined' && Array.isArray(LGS)) ? LGS : [];
    if(!L.length) return '';
    const hi = typeof hariIni === 'function' ? hariIni() : ((new Date().getDay()+6)%7)+1;
    const rows = [];
    L.forEach(t=>t.jd.forEach(j=>{ if(j.h === hi) rows.push({nm:t.nm, kota:t.kota, map:t.map, w: typeof jamTz==='function' ? jamTz(j.w, t.tz) : j.w}); }));
    rows.sort((a,b)=>a.w.localeCompare(b.w));
    const body = rows.length
      ? `<ul class="hm-lgs">${rows.slice(0,5).map(r=>`<li><a href="${E(r.map)}" target="_blank" rel="noopener"><b>${E(r.nm)}</b></a><span>${E(r.kota)} · ${E(r.w)}</span></li>`).join('')}</ul>
         ${rows.length>5?`<div class="hm-more-n">+${rows.length-5} toko lain</div>`:''}`
      : `<p class="hm-muted">Tidak ada jadwal Weekly Rush hari ini.</p>`;
    return `<section class="hm-box">
      <div class="hm-box-h"><h3>📅 Weekly Rush hari ini</h3><span class="hm-muted">${HARI[hi]}</span></div>
      ${body}
      <a class="hm-link" href="#lgs">Semua jadwal LGS →</a>
    </section>`;
  }

  /* ---------------- juara turnamen terbaru ---------------- */
  function champHTML(){
    const T = (typeof TOURNAMENTS !== 'undefined' && Array.isArray(TOURNAMENTS)) ? TOURNAMENTS : [];
    const ev = T[0]; if(!ev || !ev.top || !ev.top.length) return '';
    const d = ev.top[0];
    const r = typeof decodeDeck === 'function' ? decodeDeck(d.cd) : null;
    const strip = (r && typeof previewCards === 'function') ? previewCards(r.deck, 4).map(c=>
      `<img src="${E(artFile(c.no))}" alt="" loading="lazy">`).join('') : '';
    return `<section class="hm-box">
      <div class="hm-box-h"><h3>🥇 Juara turnamen terbaru</h3></div>
      <div class="hm-champ">
        <div class="hm-strip">${strip}</div>
        <div><span class="hm-badge">${E(d.pk||'Juara 1')}</span> <b>${E(d.nm)}</b>
        <div class="hm-muted">${E(ev.nama)} · ${E(ev.tanggal||'')}${ev.lokasi?` · ${E(ev.lokasi)}`:''}</div></div>
      </div>
      <div class="hm-row"><a class="hm-link" href="#d=${encodeURIComponent(d.cd)}">Buka deck →</a><a class="hm-link" href="#tourney">Semua hasil →</a></div>
    </section>`;
  }

  /* ---------------- jelajah per seri ---------------- */
  const SERI_NAMA = {SD:'Starter Deck', BP:'Booster Pack', SP:'Special Pack', EB:'Extra Booster', PB:'Promo Pack', TB:'Theme Booster', PR:'Promo'};
  function seriesHTML(){
    if(typeof DB === 'undefined') return '';
    const cnt = {};
    DB.forEach(c=>{ cnt[c.s] = (cnt[c.s]||0)+1; });
    const keys = Object.keys(cnt).sort();
    return `<section class="hm-sec">
      <div class="hm-sec-h"><h2>Jelajahi kartu per seri</h2><a class="hm-link" href="#cards">Semua ${DB.length} kartu →</a></div>
      <div class="hm-series">${keys.map(k=>{
        const c = DB.find(d=>d.s===k && d.l>=5) || DB.find(d=>d.s===k);
        return `<button class="hm-ser" data-seri="${E(k)}">
          <img src="${E(artFile(c.no))}" alt="" loading="lazy">
          <span><b>${E(k)}</b><i>${E(SERI_NAMA[k.slice(0,2)]||'Seri')} · ${cnt[k]} kartu</i></span>
        </button>`; }).join('')}</div>
    </section>`;
  }

  /* ---------------- deck komunitas populer ---------------- */
  async function loadPopular(){
    if(cache.popular) return cache.popular;
    if(!window.MHRDecks || !window.MHRDecks.listPublic) return [];
    const { data } = await window.MHRDecks.listPublic(60);
    let decks = data || [];
    if(!decks.length) return (cache.popular = []);
    let likes7 = {}, likesAll = {};
    try{
      const c = window.MHRAuth && window.MHRAuth.client;
      if(c){
        const since = new Date(Date.now() - 7*864e5).toISOString();
        const { data: rows } = await c.from('deck_likes').select('deck_id,created_at').in('deck_id', decks.map(d=>d.id));
        (rows||[]).forEach(r=>{ likesAll[r.deck_id]=(likesAll[r.deck_id]||0)+1; if(r.created_at >= since) likes7[r.deck_id]=(likes7[r.deck_id]||0)+1; });
      }
    }catch(e){}
    decks = decks.map(d=>({...d, l7: likes7[d.id]||0, la: likesAll[d.id]||0}))
      .sort((a,b)=> b.l7-a.l7 || b.la-a.la || String(b.published_at||b.created_at).localeCompare(String(a.published_at||a.created_at)));
    return (cache.popular = decks.slice(0,4));
  }
  function popularHTML(list){
    if(!list || !list.length) return '';
    const cards = list.map(d=>{
      const r = decodeDeck(d.deck_code); if(!r) return '';
      const s = deckStats(r.deck);
      const strip = previewCards(r.deck, 3).map(c=>`<img src="${E(artFile(c.no))}" alt="" loading="lazy">`).join('');
      const bar = Object.entries(s.col).map(([c,n])=>`<i style="width:${n/s.tot*100}%;background:${HEXC[c]||'#888'}"></i>`).join('');
      return `<a class="hm-deck" href="#d=${encodeURIComponent(d.deck_code)}">
        <div class="hm-strip">${strip}</div>
        <div class="hm-deck-b">
          <b>${E(d.name)}</b>
          <span class="hm-muted">${d.username?`oleh ${E(d.username)} · `:''}❤ ${d.la}</span>
          <div class="hm-bar">${bar}</div>
        </div>
      </a>`;
    }).join('');
    return `<div class="hm-sec-h"><h2>Deck komunitas populer</h2><a class="hm-link" href="#meta">Lihat semua →</a></div>
      <div class="hm-decks">${cards}</div>`;
  }

  /* ---------------- berita ---------------- */
  async function loadNews(){
    if(cache.news) return cache.news;
    if(!window.MHRNews || !window.MHRNews.ready) return [];
    const { data } = await window.MHRNews.list({limit:5});
    return (cache.news = data || []);
  }
  function catBadge(k){
    const c = (window.MHRNews && window.MHRNews.CATEGORIES[k]) || {label:k, color:'#8B96A5'};
    return `<span class="nw-cat" style="--c:${c.color}">${E(c.label)}</span>`;
  }
  function newsHTML(list){
    if(!list.length) return '';
    const [top, ...rest] = list;
    const date = iso => iso ? fmtTgl(new Date(iso)) : '';
    return `<section class="hm-news">
      <a class="hm-lead" href="#berita/${E(top.slug)}">
        <div class="hm-lead-img">${top.cover_url?`<img src="${E(top.cover_url)}" alt="">`:''}</div>
        <div class="hm-lead-b">${catBadge(top.category)}<h2>${E(top.title)}</h2>${top.excerpt?`<p>${E(top.excerpt)}</p>`:''}<span class="hm-muted">${date(top.published_at)}</span></div>
      </a>
      <div class="hm-side">
        <div class="hm-box-h"><h3>Berita terbaru</h3><a class="hm-link" href="#berita">Semua →</a></div>
        ${rest.slice(0,3).map(a=>`<a class="hm-item" href="#berita/${E(a.slug)}">
          ${catBadge(a.category)}<b>${E(a.title)}</b><span class="hm-muted">${date(a.published_at)}</span></a>`).join('') || '<p class="hm-muted">Belum ada berita lain.</p>'}
      </div>
    </section>`;
  }

  /* ---------------- render ---------------- */
  function quickHTML(){
    const nDeck = (typeof DECK_KOMUNITAS !== 'undefined') ? DECK_KOMUNITAS.length : 0;
    const q = (href, ico, t, s) => `<a class="hm-q" href="${href}"><span class="hm-q-i">${ico}</span><span><b>${t}</b><i>${s}</i></span></a>`;
    return `<section class="hm-quick">
      ${q('#cards','🃏','Cari Kartu', `${typeof DB!=='undefined'?DB.length:''} kartu, filter lengkap`)}
      ${q('#build','🛠','Buat Deck','Susun, cek kurva, bagikan')}
      ${q('#meta','🏆','Community Deck', `${nDeck} deck siap pakai`)}
      ${q('#panduan','📘','Baru main?','Panduan aturan resmi 1.03')}
    </section>`;
  }

  async function renderBeranda(){
    const w = $q('#berandaWrap'); if(!w) return;
    document.title = 'MHR Deck Lab — Berita, Kartu & Deck Builder Marvel Hero Rush';
    const rel = nextRelease();
    w.innerHTML = `
      <div id="hmNews">${cache.news ? newsHTML(cache.news) : '<div class="hm-news hm-skel"><div class="hm-lead"></div><div class="hm-side"></div></div>'}</div>
      ${rel ? countdownHTML(rel) : ''}
      ${quickHTML()}
      <div class="hm-cols">${lgsTodayHTML()}${champHTML()}</div>
      <section class="hm-sec" id="hmPopular">${cache.popular ? popularHTML(cache.popular) : ''}</section>
      ${seriesHTML()}`;
    if(rel && !cdTimer) cdTimer = setInterval(tickCountdown, 30000);
    const [news, pop] = await Promise.all([loadNews().catch(()=>[]), loadPopular().catch(()=>[])]);
    if(state.page !== 'beranda') return;
    const n = $q('#hmNews'); if(n) n.innerHTML = newsHTML(news);
    const p = $q('#hmPopular'); if(p) p.innerHTML = popularHTML(pop);
  }
  window.renderBeranda = renderBeranda;
  window.refreshBeranda = ()=>{ cache = {news:null, popular:null}; if(typeof state!=='undefined' && state.page==='beranda') renderBeranda(); };

  /* klik kartu seri → halaman Kartu dengan filter seri */
  document.addEventListener('click', e=>{
    const b = e.target.closest('#berandaPage [data-seri]'); if(!b) return;
    const pre = b.dataset.seri;
    const opt = [...document.querySelectorAll('#fSeries option')].find(o=>o.value === pre);
    setPage('cards');
    const sel = document.querySelector('#fSeries');
    if(sel && opt){ sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
  });
})();
