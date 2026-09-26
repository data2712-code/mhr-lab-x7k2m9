/* ===================================================================
   MHR DECK LAB — news-ui.js (tampilan halaman Berita, v6.62)
   ===================================================================
   Bagian DOM dari fitur Berita. Servis data + renderer Markdown ada di
   news.js (window.MHRNews / window.NewsMD). Berkas ini dimuat SEBELUM blok
   <script> inline di index.html, tapi fungsinya baru DIPANGGIL dari sana
   (setPage('berita'), hashchange) — jadi global dari blok inline ($, DB,
   escHtml, cardName, artFile, HEXC, openLightbox, isAccountAdmin, state)
   sudah ada saat fungsi di sini jalan.

   Rute:
     #berita            daftar berita (+ filter kategori)
     #berita/<slug>     satu artikel
   Editor (khusus akun admin) berupa panel layar penuh #nwEditor.
   =================================================================== */

(function(){
  const SITE = 'https://mhrdecklab.com/';
  const st = { list:null, loading:false, error:null, cat:'', slug:null, article:null, articleSlug:null };
  const $q = s => document.querySelector(s);
  const E = s => window.NewsMD.esc(s);
  const CATS = () => window.MHRNews.CATEGORIES;

  function catBadge(k){
    const c = CATS()[k] || {label:k, color:'#8B96A5'};
    return `<span class="nw-cat" style="--c:${c.color}">${E(c.label)}</span>`;
  }
  function fmtDate(iso){
    if(!iso) return 'Draft';
    try{ return new Date(iso).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}); }
    catch(e){ return iso.slice(0,10); }
  }
  function isAdm(){ return typeof isAccountAdmin !== 'undefined' && isAccountAdmin; }
  function coverHTML(a, cls){
    return a.cover_url
      ? `<div class="${cls}"><img src="${E(a.cover_url)}" alt="" loading="lazy"></div>`
      : `<div class="${cls} nw-noimg" style="--c:${(CATS()[a.category]||{}).color||'#8B96A5'}"><span>${E((CATS()[a.category]||{label:'News'}).label)}</span><i>MHR DECK LAB</i></div>`;
  }

  /* info kartu untuk tag [[SP01-012]] di artikel */
  function cardInfo(no, rar){
    const c = (typeof DB !== 'undefined') ? DB.find(d=>d.no===no) : null;
    if(!c) return null;
    const r = (rar && c.ra.includes(rar)) ? rar : c.ra[0];
    return { name: cardName(c), img: artFile(no, r), color: HEXC[c.c] || '#8B96A5' };
  }
  const md = s => window.NewsMD.render(s, {cardInfo});

  /* ---------------- data ---------------- */
  async function loadList(force){
    if(st.loading) return;
    if(st.list && !force) return;
    st.loading = true; st.error = null;
    const { data, error } = await window.MHRNews.list({limit:60, includeDrafts:isAdm()});
    st.loading = false;
    if(error){ st.error = error.message || 'Failed to load'; st.list = st.list || []; }
    else st.list = data;
    const n = st.list.filter(a=>a.status==='published').length;
    const cnt = $q('#navBerita'); if(cnt) cnt.textContent = n;
  }

  /* ---------------- daftar ---------------- */
  function cardHTML(a, big){
    return `<a class="nw-card${big?' nw-hero':''}" href="#berita/${E(a.slug)}" data-slug="${E(a.slug)}">
      ${coverHTML(a, 'nw-cover')}
      <div class="nw-cbody">
        <div class="nw-meta">${catBadge(a.category)}${a.pinned?'<span class="nw-pin">📌 Pinned</span>':''}${a.status!=='published'?'<span class="nw-draft">DRAFT</span>':''}</div>
        <h3>${E(a.title)}</h3>
        ${a.excerpt?`<p>${E(a.excerpt)}</p>`:''}
        <div class="nw-date">${fmtDate(a.published_at)}${a.author_name?` · ${E(a.author_name)}`:''}</div>
      </div>
    </a>`;
  }

  function renderListView(w){
    const cats = CATS();
    const all = st.list || [];
    const shown = st.cat ? all.filter(a=>a.category===st.cat) : all;
    const chips = [`<button data-nwcat="" aria-pressed="${st.cat===''}">All</button>`]
      .concat(Object.entries(cats).filter(([k])=>all.some(a=>a.category===k))
        .map(([k,c])=>`<button data-nwcat="${k}" aria-pressed="${st.cat===k}" style="--c:${c.color}">${E(c.label)}</button>`))
      .join('');
    let body;
    if(st.loading && !st.list){
      body = `<div class="nw-grid">${'<div class="nw-card nw-skel"><div class="nw-cover"></div><div class="nw-cbody"><i></i><i></i><i></i></div></div>'.repeat(3)}</div>`;
    } else if(st.error && !all.length){
      body = `<div class="nw-empty">News couldn't be loaded (${E(st.error)}). Try reloading the page.</div>`;
    } else if(!shown.length){
      body = `<div class="nw-empty">No news yet${st.cat?' in this category':''}.</div>`;
    } else {
      const [first, ...rest] = shown;
      body = cardHTML(first, true) + (rest.length ? `<div class="nw-grid">${rest.map(a=>cardHTML(a)).join('')}</div>` : '');
    }
    w.innerHTML = `
      <div class="nw-head">
        <div>
          <h2 class="nw-title">Marvel Hero Rush News</h2>
          <p class="nw-lead">Set releases, card spoilers, rule changes, tournament results, and LGS events — summarized here.</p>
        </div>
        <div class="nw-actions">
          <a class="nw-rss" href="rss.xml" target="_blank" rel="noopener" title="Subscribe via RSS">RSS</a>
          ${isAdm()?'<button class="nw-btn nw-btn-pri" data-nwact="new">＋ Write News</button>':''}
        </div>
      </div>
      <div class="nw-filter">${chips}</div>
      ${body}`;
  }

  /* ---------------- artikel ---------------- */
  async function renderArticleView(w, slug){
    if(st.articleSlug !== slug){
      st.article = null; st.articleSlug = slug;
      w.innerHTML = `<div class="nw-art"><a class="nw-back" href="#berita">← All news</a><div class="nw-empty">Loading…</div></div>`;
      const { data, error } = await window.MHRNews.getBySlug(slug);
      if(st.articleSlug !== slug) return;              // sudah pindah halaman
      st.article = data || null;
      if(error) st.article = {__err: error.message};
    }
    const a = st.article;
    if(!a || a.__err){
      w.innerHTML = `<div class="nw-art"><a class="nw-back" href="#berita">← All news</a>
        <div class="nw-empty">${a&&a.__err?"Article couldn't be loaded. Try reloading the page.":'Article not found, or not published yet.'}</div></div>`;
      return;
    }
    document.title = `${a.title} — MHR Deck Lab`;
    const others = (st.list||[]).filter(x=>x.slug!==a.slug && x.status==='published').slice(0,3);
    const shareUrl = `${SITE}news/${a.slug}.html`;
    w.innerHTML = `
      <article class="nw-art">
        <a class="nw-back" href="#berita">← All news</a>
        <div class="nw-meta">${catBadge(a.category)}${a.status!=='published'?'<span class="nw-draft">DRAFT — only visible to admins</span>':''}</div>
        <h1>${E(a.title)}</h1>
        <div class="nw-byline">${fmtDate(a.published_at)} · ${window.NewsMD.readMinutes(a.body)} min read${a.author_name?` · by <b>${E(a.author_name)}</b>`:''}</div>
        ${a.cover_url?`<figure class="nw-artcover"><img src="${E(a.cover_url)}" alt=""></figure>`:''}
        ${a.excerpt?`<p class="nw-excerpt">${E(a.excerpt)}</p>`:''}
        <div class="nw-body">${md(a.body)}</div>
        ${a.source_url?`<div class="nw-source">Source: <a href="${E(a.source_url)}" target="_blank" rel="noopener">${E(a.source_name||a.source_url)}</a></div>`:''}
        <div class="nw-share">
          <span>Share:</span>
          <a class="nw-btn" href="https://wa.me/?text=${encodeURIComponent(a.title+' '+shareUrl)}" target="_blank" rel="noopener">WhatsApp</a>
          <button class="nw-btn" data-nwact="copy" data-url="${E(shareUrl)}">Copy link</button>
          ${isAdm()?`<span class="nw-sp"></span><button class="nw-btn" data-nwact="edit">✎ Edit</button><button class="nw-btn nw-btn-del" data-nwact="del">Delete</button>`:''}
        </div>
        ${others.length?`<div class="nw-more"><h3>More news</h3><div class="nw-grid">${others.map(x=>cardHTML(x)).join('')}</div></div>`:''}
      </article>`;
  }

  /* ---------------- entri dari setPage / hash ---------------- */
  async function renderBerita(slug){
    const w = $q('#beritaWrap'); if(!w) return;
    if(slug !== undefined) st.slug = slug || null;
    if(!window.MHRNews || !window.MHRNews.ready){
      w.innerHTML = `<div class="nw-empty">News requires an internet connection.</div>`; return;
    }
    if(!st.slug) document.title = 'Marvel Hero Rush News — MHR Deck Lab';
    if(st.slug){
      const slugNow = st.slug;
      await renderArticleView(w, slugNow);
      /* daftar dimuat belakangan untuk kotak "Berita lainnya" */
      if(!st.list){ await loadList(); if(st.slug === slugNow && state.page === 'berita') renderArticleView(w, slugNow); }
      return;
    }
    renderListView(w);
    await loadList();
    if(!st.slug && state.page === 'berita') renderListView(w);
  }
  function refreshBerita(){ st.list = null; st.articleSlug = null; if(state.page==='berita') renderBerita(); }
  window.renderBerita = renderBerita;
  window.refreshBerita = refreshBerita;
  window.beritaSlugFromHash = h => { const m = /^#berita\/([a-z0-9-]+)$/.exec(h||''); return m ? m[1] : null; };

  /* ---------------- klik di halaman berita ---------------- */
  document.addEventListener('click', e=>{
    const page = e.target.closest('#beritaPage, #nwEditor'); if(!page) return;
    const chip = e.target.closest('[data-card]');
    if(chip && typeof openLightbox === 'function' && DB.some(d=>d.no===chip.dataset.card)){
      e.preventDefault(); openLightbox(chip.dataset.card); return;
    }
    const cat = e.target.closest('[data-nwcat]');
    if(cat){ st.cat = cat.dataset.nwcat; renderListView($q('#beritaWrap')); return; }
    const act = e.target.closest('[data-nwact]'); if(!act) return;
    const a = act.dataset.nwact;
    if(a === 'new') openEditor(null);
    if(a === 'edit') openEditor(st.article);
    if(a === 'copy'){
      navigator.clipboard.writeText(act.dataset.url).then(()=>{ act.textContent = '✓ Copied'; setTimeout(()=>act.textContent='Copy link',1600); });
    }
    if(a === 'del' && st.article){
      if(!confirm(`Delete news "${st.article.title}"? This cannot be undone.`)) return;
      window.MHRNews.remove(st.article.id).then(({error})=>{
        if(error){ alert('Failed to delete: '+error.message); return; }
        st.list = null; location.hash = '#berita';
      });
    }
  });

  /* pratinjau gambar kartu saat hover chip (desktop) */
  let tip = null;
  document.addEventListener('mouseover', e=>{
    const chip = e.target.closest && e.target.closest('.nw-chip[data-card]');
    if(!chip){ if(tip) tip.hidden = true; return; }
    const info = cardInfo(chip.dataset.card); if(!info) return;
    if(!tip){ tip = document.createElement('img'); tip.className = 'nw-tip'; document.body.appendChild(tip); }
    tip.src = info.img; tip.hidden = false;
    const r = chip.getBoundingClientRect();
    const left = Math.min(innerWidth - 190, Math.max(8, r.left));
    const top = r.bottom + 260 > innerHeight ? r.top - 258 : r.bottom + 6;
    tip.style.left = left+'px'; tip.style.top = top+'px';
  });

  /* ================= EDITOR (admin) ================= */
  let ed = null;   // artikel yang sedang diedit
  let slugTouched = false;

  function openEditor(a){
    if(!isAdm()) return;
    ed = a ? {...a} : {title:'', slug:'', category:'rilis', excerpt:'', body:'', cover_url:'', source_name:'', source_url:'', pinned:false, status:'draft', author_name:''};
    slugTouched = !!(a && a.slug);
    let box = $q('#nwEditor');
    if(!box){ box = document.createElement('div'); box.id = 'nwEditor'; document.body.appendChild(box); }
    const cats = Object.entries(CATS()).map(([k,c])=>`<option value="${k}"${ed.category===k?' selected':''}>${E(c.label)}</option>`).join('');
    box.innerHTML = `
      <div class="ne-bar">
        <b>${a?'Edit news':'Write new article'}</b>
        <div class="ne-tabs"><button data-netab="form" aria-pressed="true">Write</button><button data-netab="prev" aria-pressed="false">Preview</button></div>
        <span class="ne-status" id="neStatus"></span>
        <button class="nw-btn" data-neact="close">Cancel</button>
        <button class="nw-btn" data-neact="draft">Save draft</button>
        <button class="nw-btn nw-btn-pri" data-neact="publish">${ed.status==='published'?'Save & keep published':'Publish'}</button>
      </div>
      <div class="ne-main">
        <form class="ne-form" onsubmit="return false">
          <label>Title<input id="neTitle" maxlength="140" value="${E(ed.title)}" placeholder="e.g. New Orange & Purple colours: SD05 & SD06 preview"></label>
          <div class="ne-row">
            <label>Category<select id="neCat">${cats}</select></label>
            <label>Slug (URL)<input id="neSlug" maxlength="80" value="${E(ed.slug)}" placeholder="auto-from-title"></label>
          </div>
          <label>Summary <small>(shown on cards & WhatsApp preview, max 300)</small><textarea id="neExcerpt" rows="2" maxlength="300">${E(ed.excerpt||'')}</textarea></label>
          <label>Cover image
            <div class="ne-row ne-inl"><input id="neCover" value="${E(ed.cover_url||'')}" placeholder="https://… or images/news/…">
            <label class="nw-btn ne-up">Upload<input type="file" accept="image/jpeg,image/png,image/webp" data-up="cover" hidden></label></div>
          </label>
          <label>Article body
            <div class="ne-tools">
              <button type="button" data-ins="**|**" title="Bold"><b>B</b></button>
              <button type="button" data-ins="*|*" title="Italic"><i>I</i></button>
              <button type="button" data-ins="\n## |\n" title="Section heading">H2</button>
              <button type="button" data-ins="\n- |" title="List">• List</button>
              <button type="button" data-ins="[|](https://)" title="Link">Link</button>
              <button type="button" data-ins="[[|SP01-001]]" title="Card chip from the database">Card</button>
              <label class="ne-up" title="Upload an image into the article">Image<input type="file" accept="image/jpeg,image/png,image/webp" data-up="body" hidden></label>
            </div>
            <textarea id="neBody" rows="18" placeholder="Write using simple Markdown. [[SP01-012]] = a card from the database.">${E(ed.body||'')}</textarea>
          </label>
          <div class="ne-row">
            <label>Source name<input id="neSrcName" maxlength="80" value="${E(ed.source_name||'')}" placeholder="e.g. Official Marvel Hero Rush site"></label>
            <label>Source link<input id="neSrcUrl" value="${E(ed.source_url||'')}" placeholder="https://…"></label>
          </div>
          <div class="ne-row">
            <label>Author<input id="neAuthor" maxlength="40" value="${E(ed.author_name||'')}" placeholder="e.g. MHR Deck Lab Team"></label>
            <label class="ne-chk"><input type="checkbox" id="nePin"${ed.pinned?' checked':''}> Pin to top</label>
          </div>
          <details class="ne-help"><summary>Formatting guide</summary>
            <pre>## Section heading   ### Subheading
**bold**  *italic*  [text](https://link)
- list               1. numbered list
> quote              ---  (rule)
![caption](image-url)
[[SP01-012]]                     card chip (click = open card)
[[SP01-012 SP01-013 SP01-014]]   a line with only tags = card gallery
{{img:url|caption}} {{img:url|caption}}   free-form image gallery</pre>
          </details>
        </form>
        <div class="ne-prev" id="nePrev"></div>
      </div>`;
    box.hidden = false;
    document.body.classList.add('nw-lock');
    wireEditor(box);
    preview();
  }

  function readForm(){
    return { ...ed,
      title: $q('#neTitle').value.trim(),
      slug: $q('#neSlug').value.trim(),
      category: $q('#neCat').value,
      excerpt: $q('#neExcerpt').value.trim(),
      cover_url: $q('#neCover').value.trim(),
      body: $q('#neBody').value,
      source_name: $q('#neSrcName').value.trim(),
      source_url: $q('#neSrcUrl').value.trim(),
      author_name: $q('#neAuthor').value.trim(),
      pinned: $q('#nePin').checked };
  }

  function preview(){
    const a = readForm();
    $q('#nePrev').innerHTML = `<div class="nw-art nw-art-prev">
      <div class="nw-meta">${catBadge(a.category)}</div>
      <h1>${E(a.title||'Article title')}</h1>
      <div class="nw-byline">${fmtDate(a.published_at||new Date().toISOString())} · ${window.NewsMD.readMinutes(a.body)} min read${a.author_name?` · by <b>${E(a.author_name)}</b>`:''}</div>
      ${a.cover_url?`<figure class="nw-artcover"><img src="${E(a.cover_url)}" alt=""></figure>`:''}
      ${a.excerpt?`<p class="nw-excerpt">${E(a.excerpt)}</p>`:''}
      <div class="nw-body">${md(a.body)}</div>
      ${a.source_url?`<div class="nw-source">Source: <a href="${E(a.source_url)}" target="_blank" rel="noopener">${E(a.source_name||a.source_url)}</a></div>`:''}
    </div>`;
  }

  function insertAt(ta, tpl){
    const [pre, post] = tpl.replace(/\\n/g,'\n').split('|');
    const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s,e);
    const mid = sel || (tpl.startsWith('[[') ? post.replace(']]','') : '');
    const after = tpl.startsWith('[[') ? ']]' : post;
    ta.setRangeText(pre + mid + after, s, e, 'end');
    ta.focus(); preview();
  }

  let pvTimer = 0;
  function wireEditor(box){
    const title = $q('#neTitle'), slug = $q('#neSlug');
    title.addEventListener('input', ()=>{ if(!slugTouched) slug.value = window.NewsMD.slugify(title.value); });
    slug.addEventListener('input', ()=>{ slugTouched = true; });
    box.querySelector('.ne-form').addEventListener('input', ()=>{ clearTimeout(pvTimer); pvTimer = setTimeout(preview, 150); });
    box.onclick = async e=>{
      const tab = e.target.closest('[data-netab]');
      if(tab){ box.dataset.view = tab.dataset.netab;
        box.querySelectorAll('[data-netab]').forEach(b=>b.setAttribute('aria-pressed', String(b===tab))); return; }
      const ins = e.target.closest('[data-ins]');
      if(ins){ insertAt($q('#neBody'), ins.dataset.ins); return; }
      const act = e.target.closest('[data-neact]'); if(!act) return;
      if(act.dataset.neact === 'close'){ closeEditor(); return; }
      await save(act.dataset.neact === 'publish' ? 'published' : 'draft');
    };
    box.onchange = async e=>{
      const inp = e.target.closest('input[type=file][data-up]'); if(!inp || !inp.files[0]) return;
      setStatus('Uploading image…');
      const { url, error } = await window.MHRNews.uploadImage(inp.files[0]);
      inp.value = '';
      if(error){ setStatus('Upload failed: '+error.message, true); return; }
      setStatus('Image uploaded ✓');
      if(inp.dataset.up === 'cover') $q('#neCover').value = url;
      else insertAt($q('#neBody'), `\n![|](${url})\n`);
      preview();
    };
  }

  function setStatus(msg, bad){ const s = $q('#neStatus'); if(s){ s.textContent = msg; s.classList.toggle('bad', !!bad); } }

  async function save(status){
    const a = readForm(); a.status = status;
    if(!a.slug) a.slug = window.NewsMD.slugify(a.title);
    if(a.title.length < 3){ setStatus('Title must be at least 3 characters', true); return; }
    if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)){ setStatus('Slug can only contain lowercase letters, numbers, and "-"', true); return; }
    if(a.cover_url && !/^(https:\/\/|images\/)/.test(a.cover_url)){ setStatus('Cover link must start with https:// or images/', true); return; }
    if(a.source_url && !/^https:\/\//.test(a.source_url)){ setStatus('Source link must start with https://', true); return; }
    setStatus('Saving…');
    const { data, error } = await window.MHRNews.save(a);
    if(error){
      setStatus(/duplicate|unique/i.test(error.message) ? 'That slug is already used by another article — change the slug' : 'Failed: '+error.message, true);
      return;
    }
    ed = data;
    setStatus(status==='published' ? 'Published ✓' : 'Draft saved ✓');
    st.list = null; st.articleSlug = null;
    closeEditor();
    const h = '#berita/' + data.slug;
    if(location.hash === h) renderBerita(data.slug); else location.hash = h;
  }

  function closeEditor(){
    const box = $q('#nwEditor'); if(box){ box.hidden = true; box.innerHTML = ''; }
    document.body.classList.remove('nw-lock');
  }
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && $q('#nwEditor') && !$q('#nwEditor').hidden &&
       confirm('Close the editor? Unsaved changes will be lost.')) closeEditor();
  });
})();
