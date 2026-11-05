#!/usr/bin/env node
/* =====================================================================
   generate_faq_pages.js — MHR Deck Lab v7.27
   =====================================================================
   Kenapa ada: Rules FAQ & Errata ada di dalam SPA (#faq/en/F-01,
   #errata/E-04). Crawler preview link WhatsApp/Telegram/dll tidak
   menjalankan JavaScript dan tidak mengirim #... ke server, jadi link
   seperti mhrdecklab.com/#faq/F-01 selalu tampil sebagai preview umum
   situs (logo saja). Pola yang sama dengan cards/<NO>.html dan news/.

   Skrip ini membaca isi FAQ & Errata LANGSUNG dari rules-faq.js
   (RF_DATA, RF_FAQ_ID, HIDDEN) lalu menulis satu halaman statis kecil per
   poin, dengan og:title (nomor + pertanyaan), og:description (cuplikan
   jawaban) dan og:image banner:
     faq/<ID>.html       Rules FAQ bahasa Inggris  → #faq/en/<ID>
     faq/<ID>-id.html    Rules FAQ Bahasa Indonesia → #faq/id/<ID>
     errata/<ID>.html    Errata & Text Differences  → #errata/<ID>
   Folder rata (flat), sama seperti cards/, supaya bisa diunggah per folder.
   Setiap halaman berisi pertanyaan + jawaban lengkap (untuk Google / tanpa
   JavaScript) lalu langsung redirect ke poin itu di aplikasi.
   Tombol "Copy link" di rules-faq.js menyalin alamat halaman-halaman ini
   (hanya saat dibuka di mhrdecklab.com).

   Poin di HIDDEN tidak dibuatkan halaman; halaman poin yang dihapus/
   disembunyikan ikut dihapus. Berkas ditulis CRLF dan hanya ditulis ulang
   kalau isinya berubah.

   WAJIB dijalankan ulang setiap kali rules-faq.js berubah:
     node tools/generate_faq_pages.js        (Node 18+, di folder repo)
   Bisa otomatis lewat GitHub Actions bila workflow faq-pages.yml sudah
   dipasang pemilik di .github/workflows/ (lihat README v7.27).
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://mhrdecklab.com/';
const CRLF = s => s.replace(/\r?\n/g, '\r\n');

/* ---------- baca data dari rules-faq.js (tanpa menjalankan DOM) ---------- */
function loadData() {
  const src = fs.readFileSync(path.join(ROOT, 'rules-faq.js'), 'utf8');
  const grab = name => {
    const m = src.match(new RegExp('^const ' + name + ' = (.*);\\s*$', 'm'));
    if (!m) throw new Error(name + ' tidak ketemu di rules-faq.js');
    return vm.runInNewContext('(' + m[1] + ')');
  };
  return { D: grab('RF_DATA'), ID: grab('RF_FAQ_ID'), HIDDEN: grab('HIDDEN') };
}

/* ---------- teks ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}
function plain(html) {
  return decode(String(html || '')
    .replace(/<li[^>]*>/gi, ' • ').replace(/<\/(p|li|ul|ol|div|h\d|tr)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').replace(/^\s*•\s*/, '').trim();
}
function cut(s, n) {
  if (s.length <= n) return s;
  const t = s.slice(0, n - 1), i = t.lastIndexOf(' ');
  return (i > n * 0.6 ? t.slice(0, i) : t).replace(/[\s,;:·•—-]+$/, '') + '…';
}
/* Link internal di jawaban (#c=…, #faq/…) dijadikan absolut supaya tetap jalan di halaman statis. */
const absLinks = html => String(html || '').replace(/href="#/g, 'href="' + SITE + '#');

/* ---------- halaman ---------- */
const STYLE = `
  :root{--ink:#0E1216;--panel:#171D24;--line:#2C3644;--paper:#EDE7DA;--muted:#8B96A5;--accent:#F2B01E}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--ink);color:var(--paper);font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6}
  header{border-bottom:2px solid var(--line);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  header img{height:36px;display:block;max-width:55vw}
  .open{background:var(--accent);color:#1A1206;text-decoration:none;font-weight:800;font-size:13px;border-radius:999px;padding:9px 16px;white-space:nowrap}
  main{max-width:760px;margin:0 auto;padding:24px 16px 60px}
  .kick{color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
  h1{font-size:clamp(22px,4.6vw,30px);line-height:1.25;margin:8px 0 16px}
  h1 .id{color:var(--accent)}
  .ans{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
  .ans p,.ans ul,.ans ol{margin:0 0 10px}.ans ul,.ans ol{padding-left:20px}.ans li{margin:3px 0}
  .ans :last-child{margin-bottom:0}
  a{color:var(--accent)}
  .src{color:var(--muted);font-size:13px;margin-top:12px}
  .nw-chip{display:inline-block;padding:0 6px;border:1px solid var(--line);border-radius:6px;text-decoration:none;font-size:.9em}
  .note{color:var(--muted);font-size:12px;margin-top:22px}`;

function pageHTML(o) {
  return CRLF(`<!DOCTYPE html>
<html lang="${o.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(o.title)} — MHR Deck Lab</title>
<meta name="description" content="${esc(o.desc)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="MHR Deck Lab">
<meta property="og:locale" content="${o.lang === 'id' ? 'id_ID' : 'en_US'}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:image" content="${SITE}${o.image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(o.imageAlt)}">
<meta property="og:url" content="${SITE}${o.file}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${SITE}${o.image}">
<link rel="canonical" href="${SITE}${o.file}">
<link rel="icon" href="${SITE}icons/favicon-32.png">
<meta http-equiv="refresh" content="0; url=${SITE}${o.hash}">
<style>${STYLE}
</style>
</head>
<body>
<header><a href="${SITE}"><img src="${SITE}icons/logo-header.png" alt="MHR Deck Lab"></a><a class="open" href="${SITE}${o.hash}">${esc(o.openLabel)}</a></header>
<main>
  <div class="kick">${esc(o.kicker)}</div>
  <h1><span class="id">${esc(o.id)}</span> · ${o.headHTML}</h1>
  <div class="ans">${o.bodyHTML}</div>
  ${o.srcHTML ? '<div class="src">' + o.srcHTML + '</div>' : ''}
  <p class="note">${esc(o.note)}</p>
</main>
<script>location.replace(${JSON.stringify(SITE + o.hash)});</script>
</body>
</html>
`);
}

const UI = {
  en: { kicker: 'Rules FAQ', open: 'Open in MHR Deck Lab →', src: 'Source', note: 'Community FAQ by MHR Deck Lab, not an official document. If an official ruling says otherwise, the official ruling wins.' },
  id: { kicker: 'Rules FAQ (Bahasa Indonesia)', open: 'Buka di MHR Deck Lab →', src: 'Sumber', note: 'FAQ komunitas buatan MHR Deck Lab, bukan dokumen resmi. Bila ada ruling resmi yang berbeda, ruling resmi yang berlaku.' }
};

function build() {
  const { D, ID, HIDDEN } = loadData();
  const hidden = new Set(HIDDEN || []);
  const out = [];
  // Rules FAQ — EN & ID
  [['en', D.faq, ''], ['id', ID.sections, '-id']].forEach(([lang, secs, suf]) => {
    const u = UI[lang];
    secs.forEach(sec => sec.items.forEach(it => {
      if (hidden.has(it.id)) return;
      const title = it.id + ' · ' + plain(it.q);
      out.push({
        dir: 'faq', file: 'faq/' + it.id + suf + '.html', lang, id: it.id,
        title, desc: cut(plain(it.a), 200), image: 'og-faq.jpg', imageAlt: 'Rules FAQ — MHR Deck Lab',
        hash: '#faq/' + lang + '/' + it.id, kicker: u.kicker + ' · ' + plain(sec.t), openLabel: u.open,
        headHTML: esc(plain(it.q)), bodyHTML: absLinks(it.a),
        srcHTML: it.src ? '<strong>' + u.src + ':</strong> ' + absLinks(it.src) : '', note: u.note
      });
    }));
  });
  // Errata & Text Differences (bahasa Inggris)
  D.err.forEach(part => part.groups.forEach(g => g.items.forEach(it => {
    if (hidden.has(it.id)) return;
    const head = plain(it.t);
    out.push({
      dir: 'errata', file: 'errata/' + it.id + '.html', lang: 'en', id: it.id,
      title: it.id + ' · ' + head, desc: cut(plain(it.a), 200), image: 'og-errata.jpg', imageAlt: 'Errata & Text Differences — MHR Deck Lab',
      hash: '#errata/' + it.id, kicker: 'Errata & Text Differences · ' + plain(g.t), openLabel: UI.en.open,
      headHTML: absLinks(it.t), bodyHTML: absLinks(it.a), srcHTML: '',
      note: 'MHR Deck Lab (fan-made). Card text from the official card lists; errata from the official errata shared by the Marvel Hero Rush Indonesia team.'
    });
  })));
  return out;
}

function main() {
  const pages = build();
  const seen = new Set(pages.map(p => p.file));
  if (seen.size !== pages.length) throw new Error('Nomor poin ganda di rules-faq.js');
  let wrote = 0, same = 0, removed = 0;
  ['faq', 'errata'].forEach(d => fs.mkdirSync(path.join(ROOT, d), { recursive: true }));
  pages.forEach(p => {
    const f = path.join(ROOT, p.file), html = pageHTML(p);
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === html) { same++; return; }
    fs.writeFileSync(f, html); wrote++;
  });
  // hapus halaman poin yang sudah tidak ada / disembunyikan
  ['faq', 'errata'].forEach(d => fs.readdirSync(path.join(ROOT, d)).forEach(n => {
    if (!/^(F|E|TD)-\d+(-id)?\.html$/.test(n)) return;
    if (!seen.has(d + '/' + n)) { fs.unlinkSync(path.join(ROOT, d, n)); removed++; }
  }));
  console.log('FAQ/Errata: ' + pages.length + ' halaman (' + wrote + ' ditulis, ' + same + ' tidak berubah, ' + removed + ' dihapus).');
}
main();
