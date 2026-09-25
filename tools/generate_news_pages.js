#!/usr/bin/env node
/* =====================================================================
   generate_news_pages.js — MHR Deck Lab v6.62
   =====================================================================
   Kenapa ada: halaman Berita di index.html adalah SPA (#berita/<slug>),
   jadi Google dan preview link WhatsApp/Telegram tidak bisa membaca isinya
   (mereka tidak menjalankan JavaScript dan tidak mengirim #... ke server).
   Skrip ini mengambil semua berita yang SUDAH TERBIT dari Supabase lalu
   menulis:
     news/<slug>.html   halaman artikel statis lengkap (bisa dibaca penuh,
                        meta og:* sendiri → preview WhatsApp benar)
     news/index.html    daftar semua artikel (untuk Google)
     rss.xml            feed RSS 20 artikel terbaru
     news-sitemap.xml   sitemap khusus berita (sitemap.xml kartu TIDAK disentuh)
   Artikel yang dihapus/di-draft-kan lagi → halaman statisnya ikut dihapus.

   Renderer Markdown-nya DIAMBIL LANGSUNG dari news.js (bukan salinan),
   jadi tampilan artikel statis selalu sama dengan di situs.

   Dijalankan otomatis oleh GitHub Actions (.github/workflows/news-pages.yml)
   tiap 3 jam + bisa dijalankan manual dari tab Actions → "Run workflow".
   Manual di komputer:  node tools/generate_news_pages.js   (Node 18+)
   Uji tanpa Supabase:  node tools/generate_news_pages.js --from contoh.json
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://mhrdecklab.com/';
const SUPABASE_URL = 'https://kdtohyluvkucscuwnyde.supabase.co';

/* anon key publik yang sama dengan auth.js (dibaca dari sana supaya tidak dobel) */
function anonKey(){
  const m = fs.readFileSync(path.join(ROOT,'auth.js'),'utf8').match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
  if(!m) throw new Error('SUPABASE_ANON_KEY tidak ketemu di auth.js');
  return m[1];
}

/* muat news.js + cards.js dalam sandbox mirip browser */
function loadLibs(){
  const sandbox = { window:{}, console };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'cards.js'),'utf8'), sandbox);
  vm.runInContext('var window = this.window;' + fs.readFileSync(path.join(ROOT,'news.js'),'utf8'), sandbox);
  const w = sandbox.window;
  const db = w.CARDS || w.DB || sandbox.CARDS || sandbox.DB || [];
  return { NewsMD: w.NewsMD, CATS: w.MHRNews.CATEGORIES, DB: db };
}

const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const abs = u => !u ? '' : /^https?:\/\//.test(u) ? u : SITE + u.replace(/^\.?\//,'');
const fmtDate = iso => new Date(iso).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric', timeZone:'Asia/Jakarta'});

async function fetchNews(){
  const from = process.argv.indexOf('--from');
  if(from > -1) return JSON.parse(fs.readFileSync(process.argv[from+1],'utf8'));
  const key = anonKey();
  const url = `${SUPABASE_URL}/rest/v1/news?select=*&status=eq.published&order=published_at.desc&limit=500`;
  const res = await fetch(url, { headers:{ apikey:key, Authorization:`Bearer ${key}` } });
  if(!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()).filter(a => new Date(a.published_at) <= new Date());
}

const STYLE = `
  :root{--ink:#0E1216;--panel:#171D24;--panel2:#1F2731;--line:#2C3644;--paper:#EDE7DA;--muted:#8B96A5;--accent:#F2B01E;
    --disp:'Arial Narrow','Helvetica Neue Condensed','Roboto Condensed',Impact,sans-serif;
    --body:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;--mono:'Consolas','SF Mono','Roboto Mono',monospace}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--ink);color:var(--paper);font-family:var(--body);font-size:15px}
  header{border-bottom:2px solid var(--line);padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  header img{height:40px;display:block}
  .open{background:var(--accent);color:#1A1206;text-decoration:none;font-weight:800;font-size:13px;border-radius:999px;padding:9px 16px;white-space:nowrap}
  main{max-width:760px;margin:0 auto;padding:26px 18px 60px}
  .back{color:var(--muted);text-decoration:none;font-size:13px}
  .cat{display:inline-block;font-family:var(--disp);font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    color:var(--c);border:1px solid var(--c);border-radius:5px;padding:3px 7px;margin-top:16px}
  h1{font-family:var(--disp);font-size:clamp(26px,5vw,36px);line-height:1.15;margin:10px 0 8px}
  .by{color:var(--muted);font-size:13px}
  .cover{margin:18px 0 4px;border-radius:14px;overflow:hidden;border:1px solid var(--line)} .cover img{display:block;width:100%}
  .ex{font-size:16px;line-height:1.65;color:#D5DAE1;margin:18px 0 4px;padding-left:14px;border-left:3px solid var(--accent)}
  .body{line-height:1.75;color:#D5DAE1} .body>*{margin-top:14px}
  .body h2{font-family:var(--disp);font-size:23px;line-height:1.25;color:var(--paper);margin-top:30px}
  .body h3{font-family:var(--disp);font-size:18px;color:var(--paper);margin-top:22px}
  .body a{color:var(--accent)} .body strong{color:var(--paper)} .body ul,.body ol{padding-left:22px}
  .body blockquote{border-left:3px solid var(--line);padding:4px 0 4px 14px;color:#AEB6C2;font-style:italic}
  .body hr{border:none;border-top:1px solid var(--line);margin:26px 0}
  .nw-fig img{display:block;max-width:100%;border-radius:10px;margin:0 auto} .nw-fig figcaption{color:var(--muted);font-size:12px;text-align:center;margin-top:6px}
  .nw-chip{display:inline-flex;gap:5px;text-decoration:none;color:var(--paper);background:var(--panel2);border:1px solid var(--line);
    border-left:3px solid var(--cc);border-radius:6px;padding:1px 7px;font-size:.92em;white-space:nowrap}
  .nw-chip b{font-family:var(--mono);font-size:.82em;color:var(--muted);font-weight:600}
  .nw-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:18px}
  .nw-gcard{display:flex;flex-direction:column;gap:6px;text-decoration:none;color:var(--paper);margin:0}
  .nw-gcard img{width:100%;aspect-ratio:568/793;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
  .nw-gcard span{font-size:12px;line-height:1.4;color:#AEB6C2;text-align:center}
  .src{margin-top:26px;font-size:13px;color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 13px}
  .src a{color:var(--accent)}
  .list a.item{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-top:12px;text-decoration:none;color:inherit}
  .list h2{font-family:var(--disp);font-size:19px;margin:6px 0} .list p{color:#AEB6C2;font-size:13.5px;line-height:1.55}
  footer{color:#5A6673;font-size:11.5px;text-align:center;padding:24px 18px 34px;border-top:1px solid var(--line);line-height:1.6}
  @media (max-width:600px){.nw-gallery{grid-template-columns:repeat(2,minmax(0,1fr))} header img{height:32px}}
`;

function shell({title, desc, url, image, type, body, jsonld}){
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="MHR Deck Lab">
<meta property="og:title" content="${esc(title.replace(/ — MHR Deck Lab$/,''))}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" type="application/rss+xml" title="Berita MHR Deck Lab" href="${SITE}rss.xml">
<link rel="icon" href="${SITE}icons/favicon-32.png" sizes="32x32" type="image/png">
<meta name="theme-color" content="#0E1216">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g,'\\u003c')}</script>` : ''}
<style>${STYLE}</style>
</head>
<body>
<header><a href="${SITE}"><img src="${SITE}icons/logo-header.png" alt="MHR Deck Lab" width="759" height="220" style="width:auto"></a>
<a class="open" href="${SITE}#berita">Buka MHR Deck Lab →</a></header>
${body}
<footer>MHR Deck Lab — situs fan-made, tidak berafiliasi resmi dengan Marvel atau Jason.<br>Gambar kartu © MARVEL © JASON, ditampilkan dengan tanda SAMPLE.</footer>
</body>
</html>
`;
}

function articlePage(a, lib){
  const cat = lib.CATS[a.category] || {label:a.category, color:'#8B96A5'};
  const cardInfo = (no, rar)=>{
    const c = lib.DB.find(d=>d.no===no); if(!c) return null;
    const r = (rar && c.ra.includes(rar)) ? rar : c.ra[0];
    return { name: c.nm || c.nm_en || no, img: `${SITE}images/${no}${r===c.ra[0]?'':'_'+r}.jpg`, color: '#F2B01E' };
  };
  /* tautan relatif (#c=, images/…) di isi artikel → absolut ke situs utama */
  const html = lib.NewsMD.render(a.body, {cardInfo})
    .replace(/href="#/g, `href="${SITE}#`)
    .replace(/src="images\//g, `src="${SITE}images/`);
  const url = `${SITE}news/${a.slug}.html`;
  const desc = a.excerpt || a.title;
  const image = abs(a.cover_url) || `${SITE}og-image.jpg`;
  const body = `<main>
  <a class="back" href="${SITE}news/">← Semua berita</a><br>
  <span class="cat" style="--c:${cat.color}">${esc(cat.label)}</span>
  <h1>${esc(a.title)}</h1>
  <div class="by">${fmtDate(a.published_at)} · ${lib.NewsMD.readMinutes(a.body)} menit baca${a.author_name?` · oleh <b>${esc(a.author_name)}</b>`:''}</div>
  ${a.cover_url?`<figure class="cover"><img src="${esc(image)}" alt=""></figure>`:''}
  ${a.excerpt?`<p class="ex">${esc(a.excerpt)}</p>`:''}
  <div class="body">${html}</div>
  ${a.source_url?`<div class="src">Sumber: <a href="${esc(a.source_url)}" rel="noopener">${esc(a.source_name||a.source_url)}</a></div>`:''}
</main>`;
  const jsonld = { '@context':'https://schema.org', '@type':'NewsArticle', headline:a.title, description:desc,
    image:[image], datePublished:a.published_at, dateModified:a.updated_at||a.published_at, mainEntityOfPage:url,
    author:{'@type':'Organization', name:a.author_name||'MHR Deck Lab'}, publisher:{'@type':'Organization', name:'MHR Deck Lab'} };
  return shell({title:`${a.title} — MHR Deck Lab`, desc, url, image, type:'article', body, jsonld});
}

function indexPage(list, lib){
  const items = list.map(a=>{
    const cat = lib.CATS[a.category] || {label:a.category, color:'#8B96A5'};
    return `<a class="item" href="${SITE}news/${a.slug}.html"><span class="cat" style="--c:${cat.color};margin-top:0">${esc(cat.label)}</span>
      <h2>${esc(a.title)}</h2>${a.excerpt?`<p>${esc(a.excerpt)}</p>`:''}<div class="by" style="margin-top:6px">${fmtDate(a.published_at)}</div></a>`;
  }).join('\n');
  return shell({ title:'Berita Marvel Hero Rush — MHR Deck Lab',
    desc:'Berita terbaru Marvel Hero Rush TCG dalam Bahasa Indonesia: rilis set, spoiler, aturan, turnamen, dan event LGS.',
    url:`${SITE}news/`, image:`${SITE}og-image.jpg`, type:'website',
    body:`<main class="list"><h1>Berita Marvel Hero Rush</h1>${items || '<p>Belum ada berita.</p>'}</main>` });
}

function rss(list){
  const items = list.slice(0,20).map(a=>`  <item>
    <title>${esc(a.title)}</title>
    <link>${SITE}news/${a.slug}.html</link>
    <guid isPermaLink="true">${SITE}news/${a.slug}.html</guid>
    <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
    <category>${esc(a.category)}</category>
    <description>${esc(a.excerpt||a.title)}</description>${a.cover_url?`
    <enclosure url="${esc(abs(a.cover_url))}" type="image/jpeg" length="0"/>`:''}
  </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Berita MHR Deck Lab</title>
  <link>${SITE}#berita</link>
  <atom:link href="${SITE}rss.xml" rel="self" type="application/rss+xml"/>
  <description>Berita Marvel Hero Rush TCG dalam Bahasa Indonesia</description>
  <language>id</language>
${items}
</channel>
</rss>
`;
}

function sitemap(list){
  const urls = [`  <url><loc>${SITE}news/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`]
    .concat(list.map(a=>`  <url><loc>${SITE}news/${a.slug}.html</loc><lastmod>${(a.updated_at||a.published_at).slice(0,10)}</lastmod><priority>0.7</priority></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/* tulis hanya kalau isinya berubah → commit otomatis tidak nyampah */
function put(file, content){
  const p = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(p), {recursive:true});
  if(fs.existsSync(p) && fs.readFileSync(p,'utf8') === content) return false;
  fs.writeFileSync(p, content); return true;
}

(async ()=>{
  const lib = loadLibs();
  const list = await fetchNews();
  const valid = list.filter(a => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug||''));
  let changed = 0;
  for(const a of valid) changed += put(`news/${a.slug}.html`, articlePage(a, lib));
  changed += put('news/index.html', indexPage(valid, lib));
  changed += put('rss.xml', rss(valid));
  changed += put('news-sitemap.xml', sitemap(valid));
  /* hapus halaman artikel yang sudah tidak terbit */
  const keep = new Set(valid.map(a=>`${a.slug}.html`).concat(['index.html']));
  for(const f of fs.readdirSync(path.join(ROOT,'news')))
    if(f.endsWith('.html') && !keep.has(f)){ fs.unlinkSync(path.join(ROOT,'news',f)); changed++; }
  console.log(`${valid.length} artikel terbit · ${changed} berkas berubah`);
})().catch(e=>{ console.error(e.message || e); process.exit(1); });
