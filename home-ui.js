/* ===================================================================
   MHR DECK LAB — home-ui.js (halaman Beranda, v6.63 → v7.16)
   ===================================================================
   Halaman pembuka situs (#beranda). Isinya dirangkai dari data yang SUDAH
   ada — tidak ada tabel/SQL baru:
     - 3 berita terbaru                  → window.MHRNews (tabel news)
     - hitung mundur rilis berikutnya    → window.RILIS di data.js
     - Weekly Rush LGS hari ini          → window.LGS di data.js
     - juara turnamen terbaru            → TOURNAMENTS (kalau sudah dimuat)
     - deck komunitas terpopuler         → MHRDecks.listPublic + like 7 hari
     - jelajah per set                   → window.SETS (data.js) + DB → #set/<kode>

   v7.16 (28 Okt 2026) — home baru supaya pengunjung baru langsung paham
   situs ini bisa apa (riset Cardible/Archidekt/Untapped, simulasi A + C
   disetujui pemilik). Tiga tampilan:
     'full'  pengunjung baru: hero + angka + 6 fitur (pratinjau mini) +
             countdown + jalur per peran + berita/LGS + deck populer + set +
             alasan akun gratis & FAQ + CTA penutup.
     'short' pengunjung lama yang belum login (kunjungan ke-3 sesi browser,
             atau klik "hide intro"): perkenalan 1 baris, berita naik ke atas.
     'user'  sudah login: "Welcome back" + pintasan (deck aktif, win rate
             30 hari, koleksi, binder) + saran fitur yang belum dicoba.
   Pratinjau mini di kartu fitur hanya ILUSTRASI (nama pemain/angka contoh).

   Dimuat SEBELUM blok <script> inline di index.html; fungsinya baru
   dipanggil dari setPage('beranda'), jadi global dari blok inline ($, DB,
   LGS, TOURNAMENTS, DECK_KOMUNITAS, decodeDeck, deckStats, previewCards,
   artFile, imgFallback, hariIni, jamTz, state, store, setPage, setDashTab)
   sudah ada saat jalan. Tiap bagian aman gagal: sumber data error/kosong =
   bagian itu disembunyikan, bukan merusak halaman.
   =================================================================== */

(function(){
  const E = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $q = s => document.querySelector(s);
  const HARI = ['','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const BULAN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
        <span class="hm-kicker">Next release${r.wilayah?` · ${E(r.wilayah)}`:''}</span>
        <b>${E(r.nama)}</b>
        <span class="hm-cd-date">${(([y,m,d])=>`${+d} ${BULAN[+m-1]} ${y}`)(r.tanggal.split('-'))}</span>
      </div>
      <div class="hm-cd-t" data-t="${r.t}">${cdUnits(r.t)}</div>
      ${link?`<a class="hm-cd-go" href="${E(link)}">See details →</a>`:''}
    </div>`;
  }
  function cdUnits(t){
    let s = Math.max(0, Math.floor((t - Date.now())/1000));
    const d = Math.floor(s/86400); s -= d*86400;
    const h = Math.floor(s/3600);  s -= h*3600;
    const m = Math.floor(s/60);
    const u = (n,l)=>`<span><b>${String(n).padStart(2,'0')}</b><i>${l}</i></span>`;
    return u(d,'days') + u(h,'hrs') + u(m,'min');
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
         ${rows.length>5?`<div class="hm-more-n">+${rows.length-5} more stores</div>`:''}`
      : `<p class="hm-muted">No Weekly Rush scheduled today.</p>`;
    return `<section class="hm-box">
      <div class="hm-box-h"><h3>📅 Weekly Rush today</h3><span class="hm-muted">${HARI[hi]}</span></div>
      ${body}
      <a class="hm-link" href="#lgs">All LGS schedules →</a>
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
      <div class="hm-box-h"><h3>🥇 Latest tournament champion</h3></div>
      <div class="hm-champ">
        <div class="hm-strip">${strip}</div>
        <div><span class="hm-badge">${E(d.pk||'1st Place')}</span> <b>${E(d.nm)}</b>
        <div class="hm-muted">${E(ev.nama)} · ${E(ev.tanggal||'')}${ev.lokasi?` · ${E(ev.lokasi)}`:''}</div></div>
      </div>
      <div class="hm-row"><a class="hm-link" href="#d=${encodeURIComponent(d.cd)}">Open deck →</a><a class="hm-link" href="#tourney">All results →</a></div>
    </section>`;
  }

  /* ---------------- jelajah per set (v6.64: menuju halaman Set) ---------------- */
  function seriesHTML(){
    const sets = Array.isArray(window.SETS) ? window.SETS.filter(s=>s.status!=='spoiler') : [];
    if(!sets.length || typeof DB === 'undefined') return '';
    return `<section class="hm-sec">
      <div class="hm-sec-h"><h2>Browse by set</h2><a class="hm-link" href="#set">All sets & spoilers →</a></div>
      <div class="hm-series">${sets.map(s=>{
        const cards = DB.filter(d=>d.no.startsWith(s.kode)); if(!cards.length) return '';
        const c = cards.slice().sort((a,b)=>b.l-a.l)[0];
        return `<a class="hm-ser" href="#set/${E(s.kode)}">
          <img src="${E(artFile(c.no))}" alt="" loading="lazy">
          <span><b>${E(s.kode)}</b><i>${E(s.nama||s.tipe||'')} · ${cards.length} cards${typeof setBelumRilis==='function' && setBelumRilis(s.kode) ? ' · pre-release' : ''}</i></span>
        </a>`; }).join('')}</div>
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
          <span class="hm-muted">${d.username?`by ${E(d.username)} · `:''}❤ ${d.la}</span>
          <div class="hm-bar">${bar}</div>
        </div>
      </a>`;
    }).join('');
    return `<div class="hm-sec-h"><h2>Popular community decks</h2><a class="hm-link" href="#meta">See all →</a></div>
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
  /* v7.16 — berita: 3 kartu (pakai cover artikel; tanpa cover = panel warna kategori) */
  const date = iso => iso ? fmtTgl(new Date(iso)) : '';
  function newsCardHTML(a){
    const c = (window.MHRNews && window.MHRNews.CATEGORIES[a.category]) || {label:a.category, color:'#8B96A5'};
    const im = a.cover_url
      ? `<img src="${E(a.cover_url)}" alt="" loading="lazy">`
      : `<span class="nh-ncv" style="--c:${E(c.color)}">${E(c.label)}</span>`;
    return `<a class="nh-n" href="#berita/${E(a.slug)}"><div class="im">${im}</div>
      <div class="bd">${catBadge(a.category)}<b>${E(a.title)}</b><span class="hm-muted">${date(a.published_at)}</span></div></a>`;
  }
  function newsHTML(list){
    const right = lgsTodayHTML() + champHTML();
    if(!list.length && !right) return '';
    return `<section>
      <div class="nh-sec-h"><div><h2>Latest from Marvel Hero Rush</h2></div><a class="hm-link" href="#berita">All news →</a></div>
      <div class="nh-news${right?'':' solo'}">
        <div class="nh-nl">${list.slice(0,3).map(newsCardHTML).join('') || '<p class="hm-muted">No news yet.</p>'}</div>
        ${right ? `<div class="nh-right">${right}</div>` : ''}
      </div>
    </section>`;
  }

  /* =================== v7.16 — bagian perkenalan (pengunjung baru) =================== */
  const COL = {R:'#E4442E',Y:'#F2B01E',B:'#3B87E8',G:'#33A45C',O:'#E8821E',P:'#8B5CF6'};
  const nCards = () => (typeof DB !== 'undefined' && DB.length) || 0;
  const nLGS = () => (typeof LGS !== 'undefined' && Array.isArray(LGS)) ? LGS.length : 0;
  const nDecks = () => (typeof DECK_KOMUNITAS !== 'undefined') ? DECK_KOMUNITAS.length : 0;
  const nSets = () => Array.isArray(window.SETS) ? window.SETS.filter(s=>s.status!=='spoiler').length : 0;
  /* gambar kartu: rarity diminta kalau ada (mis. SEC), kalau tidak cetakan dasar */
  function cardImg(no, rar){
    if(typeof DB === 'undefined') return '';
    const c = DB.find(d=>d.no===no); if(!c) return '';
    const r = rar && c.ra.includes(rar) ? rar : c.ra[0];
    return `<img src="${E(artFile(no, r))}" alt="" loading="lazy" onerror="imgFallback(this,'${E(no)}')">`;
  }
  const HERO_CARDS = [['SD06-001','SEC'],['SD02-001','SEC'],['SD05-001','SEC'],['BP01-001','SEC']];
  const heroFan = () => `<div class="nh-fan" aria-hidden="true">${HERO_CARDS.map(([n,r])=>cardImg(n,r)).join('')}</div>`;

  function heroHTML(){
    return `<section class="nh-hero">
      <div>
        <span class="nh-kick">Free · fan-made · Marvel Hero Rush TCG</span>
        <h2 class="nh-h1">Build, play &amp; track your <em>Marvel Hero Rush</em> decks</h2>
        <p class="lead">Search every card with official English and Indonesian text, build and share decks, find weekly LGS tournaments near you, and keep track of your collection and win rate — all in one place.</p>
        <div class="nh-ctas">
          <a class="nh-btn main" href="#build">🛠 Start building a deck</a>
          <a class="nh-btn" href="#cards">🃏 Browse ${nCards()||'all'} cards</a>
          <button type="button" class="nh-btn ghost" data-hm="login">Create a free account</button>
        </div>
        <div class="nh-trust"><span>No sign-up needed to browse &amp; build</span><span>English &amp; Indonesian card text</span><span>Works on your phone</span></div>
        <button type="button" class="nh-hide" data-hm="hide">I've been here before — hide intro</button>
      </div>
      ${heroFan()}
    </section>`;
  }
  function statsHTML(){
    const s = (b, t) => b ? `<div><b>${b}</b><span>${t}</span></div>` : '';
    return `<section class="nh-stats">
      ${s(nCards(), 'cards with official text')}${s(nSets(), 'sets &amp; spoilers')}${s(nLGS(), 'stores with Weekly Rush')}${s(nDecks() ? nDecks()+'+' : '', 'ready-to-use decks')}${s('EN · ID', 'card text languages')}
    </section>`;
  }
  /* pengunjung lama yang belum login: perkenalan dipersingkat */
  function introShortHTML(){
    return `<section class="nh-short">
      <div><span class="nh-kick">MHR Deck Lab</span>
        <b>Your free companion for Marvel Hero Rush — cards, decks, tournaments &amp; tracking.</b></div>
      <div class="nh-ctas"><a class="nh-btn main" href="#build">🛠 Build a deck</a><a class="nh-btn" href="#cards">🃏 Browse cards</a><button type="button" class="nh-btn ghost" data-hm="show">What can I do here?</button></div>
    </section>`;
  }

  /* --- 6 fitur utama, tiap kartu dengan pratinjau mini (ilustrasi, bukan data asli) --- */
  const bar2 = (a,b,pa) => `<span class="pv-bar"><i style="background:${COL[a]};width:${pa}%"></i><i style="background:${COL[b]};width:${100-pa}%"></i></span>`;
  function ring(pct){
    const r = 40, c = 2*Math.PI*r;
    return `<svg class="pv-ring" viewBox="0 0 104 104"><circle cx="52" cy="52" r="${r}" fill="none" stroke="#1F2731" stroke-width="11"/><circle cx="52" cy="52" r="${r}" fill="none" stroke="#33A45C" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(c*pct/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 52 52)"/><text x="52" y="54" text-anchor="middle" fill="#EDE7DA" font-size="22" font-weight="700">${pct}%</text><text x="52" y="70" text-anchor="middle" fill="#8B96A5" font-size="10">win rate</text></svg>`;
  }
  function featsHTML(title, sub){
    const NEW = '<span class="nh-new">NEW</span>', ACC = '<span class="nh-acc">free account</span>';
    const F = (href, tab, grp, t, d, pv, tag) => `<a class="nh-f" href="${href}"${tab?` data-hm-tab="${tab}"`:''}>
      <div class="nh-pv" aria-hidden="true">${pv}</div>
      <div class="nh-fb"><span class="grp">${grp}</span><b>${t}${tag||''}</b><p>${d}</p><span class="go">Open →</span></div></a>`;
    const binder = ['BP01-001','SD04-001','BP01-063','EB01-014','SP01-026','BP01-067','SD03-001','BP01-069','SP01-001'];
    const price = ['Rp350k','Rp300k','Rp90k','Rp120k','Rp175k','Rp15k','Rp40k','Rp25k','Rp60k'];
    return `<section id="hmFeats">
      <div class="nh-sec-h"><div><h2>${title}</h2><p>${sub}</p></div></div>
      <div class="nh-feats nh-scroll">
        ${F('#cards','','Explore','Card database',`Search and filter every card by colour, level, power and keyword. Official English and Indonesian text, alt arts and set spoilers.`,
          `<div class="pv-search">🔍 &nbsp;Search ${nCards()||''} cards…</div><div class="pv-dots">${'RYBGOP'.split('').map(k=>`<i style="background:${COL[k]}"></i>`).join('')}</div>
           <div class="pv-thumbs">${['BP01-011','BP01-015','SP01-027','BP01-066'].map(n=>cardImg(n)).join('')}</div>`)}
        ${F('#build','','Build','Deck builder','Build a 50-card deck, check the level curve and colour split, compare versions, then share it as a link, image or printable PDF.',
          `<div class="pv-stack">${['SD01-001','BP01-002','BP01-077'].map(n=>cardImg(n)).join('')}</div>
           <div class="pv-curve">${[38,62,80,54,30,16].map(h=>`<i style="height:${h}%"></i>`).join('')}</div><div class="pv-curve-l">${[1,2,3,4,5,6].map(n=>`<span>${n}</span>`).join('')}</div>
           <span class="pv-cnt">50/50</span>`)}
        ${F('#tourney','','Compete','Tournament decks','See what wins: top-cut decklists from Indonesian qualifiers and Asia events, so you can study the meta.',
          `<div class="pv-rows">
             <div class="pv-row"><span class="pl">1st</span><b>Champion</b>${bar2('Y','G',58)}</div>
             <div class="pv-row"><span class="pl">2nd</span><b>Runner-up</b>${bar2('R','B',52)}</div>
             <div class="pv-row"><span class="pl">T4</span><b>Top 4</b>${bar2('R','G',64)}</div>
             <div class="pv-row"><span class="pl">T4</span><b>Top 4</b>${bar2('B','G',46)}</div></div>`)}
        ${F('#event','','Play','Weekly Rush &amp; events',`Find tonight's Weekly Rush${nLGS()?` at ${nLGS()} stores`:''}, and join or run local tournaments with live pairings and standings.`,
          `<span class="pv-live">● ROUND 3 · LIVE</span><div class="pv-rows">
             <div class="pv-row"><span class="pl">1</span><b>Player A</b><b class="pts">9 pts</b></div>
             <div class="pv-row"><span class="pl">2</span><b>Player B</b><b class="pts">6 pts</b></div>
             <div class="pv-row"><span class="pl">3</span><b>Player C</b><b class="pts">6 pts</b></div></div>`, NEW)}
        ${F('#dashboard','coll','Collect','Collection &amp; binders','Tick off the cards you own per set and version, then share a binder of cards for sale or trade.',
          `<div class="pv-binder">${binder.map((n,i)=>`<div>${cardImg(n)}<small>${price[i]}</small></div>`).join('')}</div>
           <div class="pv-prog"><div>BP01<i><u style="width:80%"></u></i></div><div>SP01<i><u style="width:65%"></u></i></div><div>SD05<i><u style="width:100%"></u></i></div></div>`, ACC)}
        ${F('#dashboard','perf','Track','Performance analytics','Log your games in seconds and see your win rate, best and worst matchups, and how your deck does over time.',
          `${ring(62)}<div class="pv-mu">
             <div>vs Red-Blue<b>71%</b><i><u style="width:71%;background:#33A45C"></u></i></div>
             <div>vs Yellow-Green<b>48%</b><i><u style="width:48%;background:#F2B01E"></u></i></div>
             <div>vs Purple<b>33%</b><i><u style="width:33%;background:#E4442E"></u></i></div></div>`, NEW + ACC)}
      </div>
      <span class="nh-swipe">Swipe to see all 6 →</span>
      <div class="nh-more"><a href="#build">⚖ Compare two decks</a><a href="#build">🕘 Deck version history</a><a href="#build">🖼 Export deck image &amp; PDF</a><a href="#set">📰 Set spoilers</a><a href="#panduan">📘 Rules guide</a><a href="#meta">🏆 User decks</a></div>
    </section>`;
  }

  function pathsHTML(){
    const L = (href, t, tab) => `<li><a href="${href}"${tab?` data-hm-tab="${tab}"`:''}${/^https?:/.test(href)?' target="_blank" rel="noopener"':''}>${t}</a></li>`;
    const P = (ic, t, d, links) => `<div class="nh-p"><span class="ic" aria-hidden="true">${ic}</span><b>${t}</b><p>${d}</p><ul>${links.join('')}</ul></div>`;
    return `<section>
      <div class="nh-sec-h"><div><h2>Where do you want to start?</h2><p>Pick what fits you best.</p></div></div>
      <div class="nh-paths nh-scroll">
        ${P('🌱','New to the game','Learn the rules and start with a deck that already works.',[L('#panduan','Read the rules guide'),L('#meta','Copy a ready-to-use deck'),L('#lgs','Find a store near you')])}
        ${P('🏆','Competitive player','Study the meta, test your list and track your results.',[L('#tourney','Tournament decklists'),L('#build','Build &amp; compare decks'),L('#dashboard','Track your matchups','perf')])}
        ${P('📦','Collector &amp; trader','Know what you own and what you still need.',[L('#set','Browse sets &amp; spoilers'),L('#dashboard','Track your collection','coll'),L('#dashboard','Share a sale/trade binder','bind')])}
        ${P('🏪','Store / organizer','Run your LGS tournament and get your store listed.',[L('#event','Run an event with live pairings'),L('#lgs','See the Weekly Rush list'),L('https://www.instagram.com/deteprtm','Get your store listed or verified')])}
      </div>
    </section>`;
  }

  function accountHTML(){
    const st = (n, t, d) => `<div class="nh-step"><i>${n}</i><div><b>${t}</b><span>${d}</span></div></div>`;
    const qa = (q, a, open) => `<details${open?' open':''}><summary>${q}</summary><p>${a}</p></details>`;
    return `<section class="nh-acct">
      <div class="hm-box"><div class="hm-box-h"><h3>Why make a free account?</h3></div>
        <div class="nh-steps">
          ${st(1,'Save your decks to the cloud','With version history, on every device — and publish them to User Decks.')}
          ${st(2,'Track your collection &amp; binders','Per set and per version; share a binder for sale or trade.')}
          ${st(3,'Log matches &amp; see your stats','Win rate, matchups and tournament runs in My Dashboard.')}
        </div>
        <button type="button" class="nh-btn main" data-hm="login">Create a free account</button>
      </div>
      <div class="hm-box nh-faq"><div class="hm-box-h"><h3>Quick answers</h3></div>
        ${qa('Is MHR Deck Lab free?','Yes. Browsing cards and building or sharing decks need no account. A free account only adds saving and tracking.', true)}
        ${qa('Is the card text official?','Card text comes from the official marvelherorush.com database. Pre-release cards that only have a fan translation are clearly marked.')}
        ${qa('Is this the official Marvel Hero Rush site?','No. MHR Deck Lab is a fan-made tool for the community and is not affiliated with Marvel or the publisher.')}
        ${qa('Can I use it on my phone?','Yes. Open mhrdecklab.com in your browser and add it to your home screen to use it like an app.')}
      </div>
    </section>`;
  }
  const finalHTML = () => `<section class="nh-final"><div><h2>Ready to build your next deck?</h2><p>Free for everyone — no sign-up needed to start.</p></div>
    <div class="nh-ctas"><a class="nh-btn main" href="#build">🛠 Start building</a><a class="nh-btn" href="https://www.instagram.com/deteprtm" target="_blank" rel="noopener">Follow @deteprtm</a></div></section>`;

  /* =================== v7.16 — sudah login: "Welcome back" =================== */
  /* hint sinkron dari token Supabase di localStorage (supaya tidak berkedip), dipastikan lagi lewat getSession() */
  function loginHint(){
    try{ for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(/^sb-.+-auth-token$/.test(k)) return true; } }catch(e){}
    return false;
  }
  let me = { uid:null, data:null, loading:null };
  async function loadMe(session){
    const uid = session && session.user && session.user.id;
    if(!uid) return null;
    if(me.uid === uid && me.data) return me.data;
    if(me.uid === uid && me.loading) return me.loading;
    me = { uid, data:null, loading:null };
    const safe = p => Promise.resolve(p).catch(()=>null);
    me.loading = Promise.all([
      safe(window.MHRAuth.getUsername && window.MHRAuth.getUsername(session)),
      safe(window.MHRPerf && window.MHRPerf.listMine()),
      safe(window.MHRCollection && window.MHRCollection.get()),
      safe(window.MHRBinders && window.MHRBinders.listMine())
    ]).then(([name, perf, coll, bind])=>{
      const logs = (perf && !perf.error && perf.data) || [];
      const since = new Date(Date.now() - 30*864e5).toISOString().slice(0,10);
      const tally = rows => { let w = 0, n = 0; rows.forEach(l=>(l.games||[]).forEach(g=>{ if(g && (g.r==='W'||g.r==='L')){ n++; if(g.r==='W') w++; } })); return {w, n}; };
      const recent = tally(logs.filter(l=>String(l.played_on||'') >= since)), all = tally(logs);
      const map = (coll && !coll.error && coll.data) || {};
      const nos = new Set(Object.keys(map).filter(k=>map[k] > 0).map(k=>{ const i = k.indexOf('_'); return i < 0 ? k : k.slice(0, i); }));
      const owned = typeof DB !== 'undefined' ? DB.filter(c=>nos.has(c.no)).length : nos.size;
      const binders = (bind && !bind.error && bind.data) || [];
      return (me.data = { name: name || '', logs: logs.length, recent, all, owned, binders,
        perfOk: !!(perf && !perf.error), collOk: !!(coll && !coll.error), bindOk: !!(bind && !bind.error) });
    });
    return me.loading;
  }

  /* halaman yang pernah dibuka (untuk saran "You haven't tried yet") — dicatat dari kelas body page-* */
  const SEEN_KEY = 'mhr_seen_pages';
  function seenPages(){ try{ return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); }catch(e){ return []; } }
  function markSeen(p){
    if(!p) return; const s = seenPages(); if(s.includes(p)) return;
    s.push(p); try{ localStorage.setItem(SEEN_KEY, JSON.stringify(s.slice(-30))); }catch(e){}
  }
  try{
    const pageOf = () => ((document.body && document.body.className || '').match(/(?:^|\s)page-([a-z]+)/) || [])[1];
    new MutationObserver(()=>markSeen(pageOf())).observe(document.body, { attributes:true, attributeFilter:['class'] });
  }catch(e){}

  function welcomeHTML(d){
    const deck = (typeof state !== 'undefined' && state.deck) || {};
    const tot = Object.values(deck).reduce((a,b)=>a+(+b||0), 0);
    const top = tot && typeof previewCards === 'function' ? previewCards(deck, 1)[0] : null;
    const deckName = (typeof store !== 'undefined' && store && store.active) || 'My deck';
    const sc = (href, tab, vis, small, b, span) => `<a class="nc-s" href="${href}"${tab?` data-hm-tab="${tab}"`:''}>${vis}<div><small>${small}</small><b>${b}</b><span>${span}</span></div></a>`;
    const ic = i => `<span class="ic" aria-hidden="true">${i}</span>`;
    const L = d || {};
    const wr = s => s.n ? Math.round(s.w/s.n*100) + '% win rate' : '';
    const perfB = !d ? '…' : (L.recent && L.recent.n) ? wr(L.recent) : (L.all && L.all.n) ? wr(L.all) : 'Log your first match';
    const perfS = !d ? '' : (L.recent && L.recent.n) ? `${L.recent.n} game${L.recent.n>1?'s':''} · last 30 days` : (L.all && L.all.n) ? `${L.all.n} games · all time` : 'Win rate &amp; matchups';
    const nB = L.binders ? L.binders.length : 0;
    const name = L.name ? `, ${E(L.name)}` : '';
    /* saran fitur yang belum dicoba */
    const seen = seenPages(), tips = [];
    if(d){
      if(d.perfOk && !d.logs) tips.push(['#dashboard','perf','📈 Performance tracking']);
      if(d.bindOk && !nB) tips.push(['#dashboard','bind','🗂 Binders']);
      if(d.collOk && !d.owned) tips.push(['#dashboard','coll','📦 Card collection']);
    }
    if(!seen.includes('event')) tips.push(['#event','','📅 Events &amp; live pairings']);
    if(!seen.includes('tourney')) tips.push(['#tourney','','🥇 Tournament decks']);
    if(!seen.includes('meta')) tips.push(['#meta','','🏆 User decks']);
    return `<section class="nc-wb">
        <div><span class="nh-kick">My Dashboard</span><h2 class="nh-h1">Welcome back${name}</h2><p>Pick up where you left off.</p></div>
        <a class="nh-btn" href="#dashboard">Open My Dashboard →</a>
      </section>
      <section class="nc-sc">
        ${sc('#build','', top ? cardImg(top.no) : ic('🛠'), tot ? 'Continue deck' : 'Deck builder', tot ? E(deckName) : 'Start a new deck', tot ? `${tot}/50 cards` : 'Curve, share, image &amp; PDF')}
        ${sc('#dashboard','perf', ic('📈'), 'Performance', perfB, perfS)}
        ${sc('#dashboard','coll', ic('📦'), 'Collection', !d ? '…' : d.owned ? `${d.owned} / ${nCards()} cards` : 'Start your collection', 'Per set &amp; per version')}
        ${sc('#dashboard','bind', ic('🗂'), 'Binders', !d ? '…' : nB ? `${nB} binder${nB>1?'s':''}` : 'Make a binder', nB ? E(L.binders[0].name || 'Latest binder') : 'Sell or trade cards')}
      </section>
      ${tips.length ? `<div class="nc-disc"><span>✨ <b>You haven't tried yet:</b></span>${tips.slice(0,3).map(([h,t,l])=>`<a href="${h}"${t?` data-hm-tab="${t}"`:''}>${l}</a>`).join('')}</div>` : ''}`;
  }

  /* =================== render =================== */
  const INTRO_KEY = 'mhr_home_intro';   /* 'short' = pengunjung lama (perkenalan dipersingkat) */
  function introMode(){
    try{
      if(localStorage.getItem(INTRO_KEY) === 'short') return 'short';
      /* kunjungan kedua (sesi browser baru) → otomatis dipersingkat */
      if(!sessionStorage.getItem('mhr_home_sess')){
        sessionStorage.setItem('mhr_home_sess', '1');
        const n = (+localStorage.getItem('mhr_home_visits') || 0) + 1;
        localStorage.setItem('mhr_home_visits', String(n));
        if(n >= 3){ localStorage.setItem(INTRO_KEY, 'short'); return 'short'; }
      }
    }catch(e){}
    return 'full';
  }
  let forceFull = false;   // tombol "What can I do here?" → tampilkan perkenalan lengkap sekali ini

  function layout(mode){
    const rel = nextRelease();
    const cd = rel ? countdownHTML(rel) : '';
    const news = `<div id="hmNews">${cache.news ? newsHTML(cache.news) : '<div class="hm-news hm-skel"><div class="hm-lead"></div><div class="hm-side"></div></div>'}</div>`;
    const pop = `<section class="hm-sec" id="hmPopular">${cache.popular ? popularHTML(cache.popular) : ''}</section>`;
    if(mode === 'user') return [`<div id="hmMe">${welcomeHTML(me.data)}</div>`, cd, news, pop,
      featsHTML('Everything on MHR Deck Lab', 'Tools you might not have tried yet.'), seriesHTML()];
    if(mode === 'short') return [introShortHTML(), cd, news, pop,
      featsHTML('What you can do here', 'Everything for Marvel Hero Rush players — from your first deck to your next tournament.'),
      pathsHTML(), seriesHTML(), accountHTML(), finalHTML()];
    return [heroHTML(), statsHTML(),
      featsHTML('What you can do here', 'Everything for Marvel Hero Rush players — from your first deck to your next tournament.'),
      cd, pathsHTML(), news, pop, seriesHTML(), accountHTML(), finalHTML()];
  }

  let curMode = '';
  async function renderBeranda(){
    const w = $q('#berandaWrap'); if(!w) return;
    document.title = 'MHR Deck Lab — Marvel Hero Rush Deck Builder, Cards, Tournaments & Collection';
    const auth = window.MHRAuth && window.MHRAuth.ready;
    let mode = auth && loginHint() ? 'user' : (forceFull ? 'full' : introMode());
    curMode = mode;
    w.innerHTML = layout(mode).filter(Boolean).join('\n');
    w.dataset.mode = mode;
    if(nextRelease() && !cdTimer) cdTimer = setInterval(tickCountdown, 30000);

    /* pastikan status login yang sebenarnya */
    let session = null;
    if(auth){ try{ session = await window.MHRAuth.getSession(); }catch(e){} }
    if(state.page !== 'beranda') return;
    const real = session && session.user ? 'user' : (mode === 'user' ? (forceFull ? 'full' : introMode()) : mode);
    if(real !== mode){ curMode = real; w.innerHTML = layout(real).filter(Boolean).join('\n'); w.dataset.mode = real; }

    const jobs = [loadNews().catch(()=>[]), loadPopular().catch(()=>[])];
    if(real === 'user') jobs.push(loadMe(session).catch(()=>null));
    const [news, pop, d] = await Promise.all(jobs);
    if(state.page !== 'beranda' || curMode !== real) return;
    const n = $q('#hmNews'); if(n) n.innerHTML = newsHTML(news);
    const p = $q('#hmPopular'); if(p) p.innerHTML = popularHTML(pop);
    const m = $q('#hmMe'); if(m && d) m.innerHTML = welcomeHTML(d);
  }

  /* klik: buka modal login, sembunyikan/tampilkan perkenalan, buka tab tertentu di My Dashboard */
  document.addEventListener('click', e=>{
    const w = e.target.closest && e.target.closest('#berandaWrap'); if(!w) return;
    const b = e.target.closest('[data-hm]');
    if(b){
      const act = b.dataset.hm;
      if(act === 'login'){ if(window.MHRUI && window.MHRUI.openAuthModal) window.MHRUI.openAuthModal(); else { const a = $q('#btnAccount'); if(a) a.click(); } }
      if(act === 'hide'){ try{ localStorage.setItem(INTRO_KEY, 'short'); }catch(err){} forceFull = false; renderBeranda(); window.scrollTo({top:0}); }
      if(act === 'show'){ forceFull = true; renderBeranda().then(()=>{ forceFull = false; const f = $q('#hmFeats'); if(f && f.scrollIntoView) f.scrollIntoView({block:'start', behavior:'smooth'}); }); }
      return;
    }
    const a = e.target.closest('a[data-hm-tab]');
    if(a && typeof setDashTab === 'function'){ try{ setDashTab(a.dataset.hmTab); }catch(err){} }
  });

  window.renderBeranda = renderBeranda;
  window.refreshBeranda = ()=>{ cache = {news:null, popular:null}; me = { uid:null, data:null, loading:null }; if(typeof state!=='undefined' && state.page==='beranda') renderBeranda(); };
  /* login/logout → home ikut berubah (Welcome back ↔ perkenalan) */
  let lastUid;   /* hanya render ulang kalau akun berganti (bukan tiap token refresh) */
  if(window.MHRAuth && window.MHRAuth.onAuthChange) window.MHRAuth.onAuthChange(session=>{
    const uid = (session && session.user && session.user.id) || null;
    if(lastUid === undefined){ lastUid = uid; return; }
    if(uid === lastUid) return;
    lastUid = uid; me = { uid:null, data:null, loading:null };
    if(typeof state!=='undefined' && state.page==='beranda') renderBeranda();
  });

})();
