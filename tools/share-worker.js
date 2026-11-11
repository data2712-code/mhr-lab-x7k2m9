/* ===================================================================
   MHR DECK LAB — Cloudflare Worker "mhr-share-preview" (v7.32)
   ===================================================================
   Dipasang PEMILIK di Cloudflare (Workers & Pages), BUKAN bagian dari
   GitHub Pages. Rute yang dipakai (hanya dua ini, jalur lain tidak lewat sini):
       mhrdecklab.com/b/*      → link binder   /b/<share_code>
       mhrdecklab.com/d/*      → link deck     /d/<kode deck>[?i=<id deck_shares>]
   Panduan pasang: "Panduan Pasang Cloudflare Worker - Thumbnail Share v7.32.md"
   di folder internal.

   Yang dilakukan: membalas HTML kecil berisi og:title / og:description /
   og:image yang sesuai (dibaca crawler WhatsApp, Facebook, Telegram, X,
   Discord, dst.), lalu JavaScript langsung mengalihkan pengunjung manusia ke
   link hash lama (/#binder/<kode> atau /#d=<kode>) yang dibuka situs.
   /b/__ping membalas {"mhr":"share"} — dipakai share-preview.js untuk tahu
   Worker sudah terpasang (sebelum itu situs tetap membagikan link hash lama).

   Data dibaca dengan anon key Supabase (memang publik, sama dengan auth.js):
     - binder: RPC mhr_binder_get (hanya binder publik & tidak disembunyikan)
     - deck:   RPC mhr_deck_share_get (pemilik link) — hanya kalau ?i= ada
     - gambar: Storage publik share-previews/{binder,deck}/<kode>.jpg
   Kalau gambar belum ada / Supabase lambat → og-image.jpg umum.
   =================================================================== */
const SITE = 'https://mhrdecklab.com';
const SB = 'https://kdtohyluvkucscuwnyde.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdG9oeWx1dmt1Y3NjdXdueWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjgyODAsImV4cCI6MjEwNDgwNDI4MH0.0oO2jpX6iTsxDFxdprXAltUTxq5wGTEJAPwifiimmnM';
const BUCKET = 'share-previews';
const GENERIC = { url: `${SITE}/og-image.jpg?v=7.03`, w: 1200, h: 630 };
const KIND = { collection: 'Collection binder', trade: 'For sale / trade', wishlist: 'Wishlist' };
const COL = { Merah: 'Red', Kuning: 'Yellow', Biru: 'Blue', Hijau: 'Green', Orange: 'Orange', Purple: 'Purple' };

const RE_BINDER = /^[A-Za-z0-9]{6,32}$/;
const RE_DECK = /^1\.[A-Za-z0-9_-]{0,400}\.[A-Za-z0-9]{0,1000}$/;
const RE_ID = /^[A-Za-z0-9]{6,32}$/;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

async function rpc(name, args) {
  const r = await fetch(`${SB}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(3500),
  });
  if (!r.ok) return null;
  return r.json();
}
/* gambar di Storage ada? → URL dengan ?v=<etag> supaya WhatsApp mengambil versi terbaru */
async function image(path) {
  const url = `${SB}/storage/v1/object/public/${BUCKET}/${path}`;
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const v = (r.headers.get('etag') || r.headers.get('last-modified') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
    return { url: v ? `${url}?v=${v}` : url, w: 1200, h: 630 };
  } catch (e) { return null; }
}
function b64name(seg) {
  try {
    let s = seg.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) { return ''; }
}

function page({ url, target, title, desc, img, alt }) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MHR Deck Lab">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img.url)}">
<meta property="og:image:secure_url" content="${esc(img.url)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${img.w}">
<meta property="og:image:height" content="${img.h}">
<meta property="og:image:alt" content="${esc(alt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img.url)}">
<script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')});</script>
</head><body style="margin:0;background:#0B0E12;color:#C0C8D2;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh">
<p><a href="${esc(target)}" style="color:#F2B01E">Open “${esc(cut(title, 80))}” on MHR Deck Lab →</a></p>
</body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-mhr-share': '1' } });
}

async function binder(code, url) {
  const target = `${SITE}/#binder/${code}`;
  const [b, img] = await Promise.all([rpc('mhr_binder_get', { p_code: code }).catch(() => null), image(`binder/${code}.jpg`)]);
  if (!b || !b.name) {
    return page({ url, target, title: 'Binder — MHR Deck Lab', desc: 'A Marvel Hero Rush card binder on MHR Deck Lab.', img: GENERIC });
  }
  const slots = Array.isArray(b.slots) ? b.slots.filter(s => s && typeof s === 'object') : [];
  const copies = slots.reduce((a, s) => a + (s.sold ? 0 : (+s.q || 1)), 0);
  const kind = KIND[b.kind] || 'Binder';
  const desc = [`${kind} by @${b.owner || 'Player'}`, `${copies} card${copies === 1 ? '' : 's'}`, b.location ? `📍 ${b.location}` : '']
    .filter(Boolean).join(' · ') + (b.kind === 'trade' ? '. Prices and contact on the binder page.' : '. Marvel Hero Rush binder on MHR Deck Lab.');
  return page({ url, target, title: `${cut(b.name, 70)} — ${kind}`, desc: cut(desc, 200), img: img || GENERIC, alt: `Page from the binder ${b.name}` });
}

async function deck(code, id, url) {
  const target = `${SITE}/#d=${code}`;
  const seg = code.split('.');
  const name = cut(b64name(seg[1] || ''), 70) || 'Shared deck';
  const body = seg[2] || ''; let total = 0;
  for (let i = 0; i + 5 <= body.length; i += 5) total += parseInt(body[i + 4], 36) || 0;
  let owner = '', img = null;
  if (id && RE_ID.test(id)) {
    const [row, im] = await Promise.all([rpc('mhr_deck_share_get', { p_id: id }).catch(() => null), image(`deck/${id}.jpg`)]);
    if (row && row.code === code) { owner = row.owner || ''; img = im; }   // gambar hanya dipakai kalau id memang milik kode ini
  }
  const desc = `${total}-card Marvel Hero Rush deck${owner ? ` by @${owner}` : ''}. Open it on MHR Deck Lab to see the full list, copy it or build your own.`;
  return page({ url, target, title: `${name} — MHR Deck Lab deck`, desc, img: img || GENERIC, alt: `Deck preview: ${name}` });
}

export default {
  async fetch(req) {
    const u = new URL(req.url);
    const m = u.pathname.match(/^\/([bd])\/([^/]+)\/?$/);
    if (!m || (req.method !== 'GET' && req.method !== 'HEAD')) return fetch(req);
    let seg = m[2]; try { seg = decodeURIComponent(seg); } catch (e) {}
    if (seg === '__ping') return new Response('{"mhr":"share","v":1}', { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    const self = `${SITE}${u.pathname}${u.search}`;
    try {
      if (m[1] === 'b' && RE_BINDER.test(seg)) return await binder(seg, self);
      if (m[1] === 'd' && RE_DECK.test(seg)) return await deck(seg, u.searchParams.get('i'), self);
    } catch (e) {
      return Response.redirect(m[1] === 'b' ? `${SITE}/#binder/${seg}` : `${SITE}/#d=${seg}`, 302);
    }
    return Response.redirect(`${SITE}/`, 302);
  },
};
