/* ===================================================================
   MHR DECK LAB — news.js (halaman Berita, v6.62)
   ===================================================================
   Pola sama dengan decks.js/social.js: TIDAK menyentuh DOM, cuma
   menyediakan API di window.MHRNews. Koneksi Supabase dipinjam dari
   auth.js (window.MHRAuth.client).

   Tabel `public.news` + bucket storage `news-images` — lihat
   mhr_decklab_v662_news.sql di folder internal. RLS-lah yang menegakkan
   "publik cuma lihat yang terbit, cuma admin yang boleh menulis" — bukan
   pengecekan di berkas ini.

   Juga berisi renderer Markdown mini (NewsMD) yang dipakai halaman Berita
   DAN pratinjau editor. Renderer ini SENGAJA ditulis sendiri (bukan
   pustaka CDN) supaya kecil dan aman: semua teks di-escape dulu, baru
   sintaks yang dikenali diubah jadi tag. Salinan logika yang sama ada di
   tools/generate_news_pages.py (halaman statis untuk Google/WhatsApp) —
   kalau sintaksnya diubah di sini, ubah juga di sana.

   Sintaks yang didukung:
     ## Judul, ### Subjudul
     **tebal**, *miring*, [teks](https://tautan)
     - daftar, 1. daftar bernomor, > kutipan, --- garis
     ![keterangan](url-gambar)          gambar satu baris penuh
     [[SP01-012]]                        chip kartu (nama + klik buka kartu)
     [[SP01-012 SP01-013 SP01-014]]      satu baris berisi tag saja = galeri kartu
     {{img:url|keterangan}} berderet     galeri gambar bebas (kartu yang belum
                                         ada di database, mis. spoiler)
   =================================================================== */

(function(){
  const COLS = 'id,slug,title,excerpt,body,category,cover_url,source_url,source_name,author_name,pinned,status,published_at,updated_at';
  const LIST_COLS = 'id,slug,title,excerpt,category,cover_url,author_name,pinned,status,published_at,updated_at';

  function client(){
    return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  }

  const CATEGORIES = {
    rilis:    {label:'Rilis Set',      color:'#F2B01E'},
    spoiler:  {label:'Spoiler',        color:'#8B5CF6'},
    aturan:   {label:'Aturan & Errata',color:'#3B87E8'},
    turnamen: {label:'Turnamen',       color:'#E4442E'},
    event:    {label:'Event LGS',      color:'#33A45C'},
    situs:    {label:'Update Situs',   color:'#8B96A5'},
  };

  /* ---------------- renderer Markdown mini ---------------- */
  const ESC = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>ESC[c]);
  const safeUrl = u => /^(https:\/\/|images\/|#)/.test(u) ? u : '#';
  const CARD_RE = /\[\[([A-Z]{2}\d{2}-\d{3})(?:_([A-Z]{1,4}))?\]\]/g;

  /* opsi: cardInfo(no) -> {name, img, color} | null  (disediakan index.html) */
  function inline(s, opt){
    /* tag kartu diganti placeholder DULU supaya "_MR" dsb. tidak ikut
       dianggap sintaks miring/tebal */
    const keep = [];
    const hold = h => '\u0000' + (keep.push(h)-1) + '\u0000';
    s = esc(s).replace(CARD_RE, (m,no,rar)=>{
      const info = opt && opt.cardInfo ? opt.cardInfo(no, rar) : null;
      if(!info) return hold(`<span class="nw-chip nw-chip-x">${no}</span>`);
      return hold(`<a class="nw-chip" href="#c=${no}" data-card="${no}" style="--cc:${info.color}">`+
             `<b>${no}</b> ${esc(info.name)}</a>`);
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m,t,u)=>{
           const url = safeUrl(u.replace(/&amp;/g,'&'));
           const ext = /^https:/.test(url);
           return `<a href="${url.replace(/"/g,'&quot;')}"${ext?' target="_blank" rel="noopener"':''}>${t}</a>`;
         })
         .replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, '<strong>$1</strong>')
         .replace(/(^|[\s(\-/>])\*([^*\s](?:[^*]*[^*\s])?)\*(?=$|[\s.,;:!?)\-/<])/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, (m,i)=>keep[+i]);
  }

  const NO_RE = /^([A-Z]{2}\d{2}-\d{3})(?:_([A-Z]{1,4}))?$/;
  /* baris yang isinya CUMA tag kartu → daftar [no, rarity], selain itu null.
     Dua bentuk sama-sama boleh: [[SP01-001 SP01-002]] atau [[SP01-001]] [[SP01-002]] */
  function galleryCards(line){
    if(!/^(\s*\[\[[^\]]+\]\]\s*)+$/.test(line)) return null;
    const out = [];
    for(const grp of line.match(/\[\[([^\]]+)\]\]/g)){
      for(const tok of grp.slice(2,-2).trim().split(/[\s,]+/)){
        const m = NO_RE.exec(tok); if(!m) return null;
        out.push([m[1], m[2]]);
      }
    }
    return out.length ? out : null;
  }

  function cardGallery(list, opt){
    const out = list.map(([no,rar])=>{
      const info = opt && opt.cardInfo ? opt.cardInfo(no, rar) : null;
      if(info) return `<a class="nw-gcard" href="#c=${no}" data-card="${no}">`+
        `<img src="${esc(info.img)}" alt="${esc(no+' '+info.name)}" loading="lazy">`+
        `<span>${esc(info.name)}</span></a>`;
      return `<span class="nw-gcard nw-gcard-x">${no}</span>`;
    });
    return `<div class="nw-gallery">${out.join('')}</div>`;
  }

  function imgGallery(line){
    const out = [];
    line.replace(/\{\{img:([^|}]+)(?:\|([^}]*))?\}\}/g, (m,u,cap)=>{
      out.push(`<figure class="nw-gcard"><img src="${esc(safeUrl(u.trim()))}" alt="${esc(cap||'')}" loading="lazy">`+
               (cap?`<span>${inline(cap)}</span>`:'')+`</figure>`);
      return m;
    });
    return `<div class="nw-gallery">${out.join('')}</div>`;
  }

  function render(md, opt){
    const lines = String(md||'').replace(/\r\n?/g,'\n').split('\n');
    const html = [];
    let para = [], list = null;
    const flushP = ()=>{ if(para.length){ html.push('<p>'+inline(para.join(' '),opt)+'</p>'); para=[]; } };
    const flushL = ()=>{ if(list){ html.push(`<${list.t}>`+list.items.map(i=>'<li>'+inline(i,opt)+'</li>').join('')+`</${list.t}>`); list=null; } };
    const flush = ()=>{ flushP(); flushL(); };
    for(const raw of lines){
      const l = raw.trimEnd();
      let m;
      if(!l.trim()){ flush(); continue; }
      if(/^---+$/.test(l.trim())){ flush(); html.push('<hr>'); continue; }
      if((m = l.match(/^(#{2,3})\s+(.+)/))){ flush(); const h = m[1].length; html.push(`<h${h}>${inline(m[2],opt)}</h${h}>`); continue; }
      if((m = l.match(/^>\s?(.*)/))){ flush(); html.push('<blockquote>'+inline(m[1],opt)+'</blockquote>'); continue; }
      if((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))){
        flush(); html.push(`<figure class="nw-fig"><img src="${esc(safeUrl(m[2]))}" alt="${esc(m[1])}" loading="lazy">`+
          (m[1]?`<figcaption>${inline(m[1],opt)}</figcaption>`:'')+'</figure>'); continue; }
      const gal = galleryCards(l);
      if(gal){ flush(); html.push(cardGallery(gal,opt)); continue; }
      if(/^(\s*\{\{img:[^}]+\}\}\s*)+$/.test(l)){ flush(); html.push(imgGallery(l)); continue; }
      if((m = l.match(/^\s*[-*]\s+(.+)/))){ flushP(); if(!list||list.t!=='ul'){ flushL(); list={t:'ul',items:[]}; } list.items.push(m[1]); continue; }
      if((m = l.match(/^\s*\d+[.)]\s+(.+)/))){ flushP(); if(!list||list.t!=='ol'){ flushL(); list={t:'ol',items:[]}; } list.items.push(m[1]); continue; }
      flushL(); para.push(l.trim());
    }
    flush();
    return html.join('\n');
  }

  /* estimasi waktu baca (200 kata/menit) */
  function readMinutes(md){
    const w = String(md||'').replace(/[#*>\[\]{}()!-]/g,' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(w/200));
  }

  function slugify(s){
    return String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
  }

  window.NewsMD = { render, inline, readMinutes, slugify, esc };

  /* ---------------- servis Supabase ---------------- */
  window.MHRNews = {
    ready: !!client(),
    CATEGORIES,

    /* daftar artikel. RLS: publik cuma dapat yang terbit; admin dapat draft juga
       (includeDrafts:false menyaring draft di sisi kueri supaya admin tetap
       melihat halaman seperti pengunjung biasa kalau mau). */
    async list({limit=50, includeDrafts=false}={}){
      const c = client(); if(!c) return {data:[], error:{message:'offline'}};
      let q = c.from('news').select(LIST_COLS)
        .order('pinned', {ascending:false})
        .order('published_at', {ascending:false, nullsFirst:true})
        .limit(limit);
      if(!includeDrafts) q = q.eq('status','published');
      const { data, error } = await q;
      return { data: data || [], error };
    },

    async getBySlug(slug){
      const c = client(); if(!c) return {data:null, error:{message:'offline'}};
      const { data, error } = await c.from('news').select(COLS).eq('slug', slug).maybeSingle();
      return { data, error };
    },

    /* simpan (buat baru bila tanpa id). Mengembalikan baris yang tersimpan. */
    async save(row){
      const c = client(); if(!c) return {error:{message:'offline'}};
      const clean = {};
      for(const k of ['slug','title','excerpt','body','category','cover_url','source_url','source_name','author_name','pinned','status','published_at'])
        if(k in row) clean[k] = (row[k] === '' ? null : row[k]);
      if(clean.body == null) clean.body = '';
      const q = row.id
        ? c.from('news').update(clean).eq('id', row.id)
        : c.from('news').insert(clean);
      const { data, error } = await q.select(COLS).single();
      return { data, error };
    },

    async remove(id){
      const c = client(); if(!c) return {error:{message:'offline'}};
      const { error } = await c.from('news').delete().eq('id', id);
      return { error };
    },

    /* unggah gambar ke bucket news-images, kembalikan URL publiknya */
    async uploadImage(file){
      const c = client(); if(!c) return {error:{message:'offline'}};
      if(file.size > 2*1024*1024) return {error:{message:'Ukuran gambar maksimal 2 MB'}};
      const ext = (file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path = `${new Date().toISOString().slice(0,7)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}.${ext}`;
      const { error } = await c.storage.from('news-images').upload(path, file, {cacheControl:'31536000', upsert:false});
      if(error) return {error};
      const { data } = c.storage.from('news-images').getPublicUrl(path);
      return { url: data.publicUrl };
    },
  };
})();
