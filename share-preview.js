/* ===================================================================
   MHR DECK LAB — share-preview.js (v7.32)
   ===================================================================
   Thumbnail WhatsApp / Facebook / Telegram untuk link binder & link deck.

   Masalahnya: crawler WhatsApp TIDAK menjalankan JavaScript dan TIDAK melihat
   bagian "#..." dari URL, jadi link lama (mhrdecklab.com/#binder/<kode> dan
   mhrdecklab.com/#d=<kode deck>) selalu tampil dengan og-image.jpg umum.

   Solusinya (keputusan pemilik 11 Nov 2026):
   - Link baru berbentuk PATH:  https://mhrdecklab.com/b/<kode binder>
                                https://mhrdecklab.com/d/<kode deck>[?i=<id>]
   - Cloudflare Worker (tools/share-worker.js, dipasang pemilik di Cloudflare)
     melayani dua path itu: HTML kecil berisi og:title / og:description /
     og:image yang sesuai, lalu langsung mengalihkan pengunjung ke link hash
     lama (#binder/<kode> / #d=<kode>). Tanpa Worker, 404.html melakukan
     pengalihan yang sama (tanpa thumbnail).
   - Gambar pratinjau (1200×630 JPEG) digambar di browser lalu diunggah ke
     bucket Storage publik "share-previews":
       binder/<share_code>.jpg  — oleh PEMILIK binder, saat binder dibagikan
       deck/<id>.jpg            — oleh akun yang login, saat "Copy deck link"
     <id> berasal dari tabel deck_shares (RPC mhr_deck_share_make).
     Guest tetap dapat judul & deskripsi deck yang benar, tapi gambar umum.
     Skema & kebijakan: mhr_decklab_v732_share_previews.sql (folder internal).
   - Situs hanya memakai link path kalau Worker terbukti terpasang
     (GET /b/__ping membalas {"mhr":"share"}). Kalau belum, semua link tetap
     format hash lama — jadi aman di-deploy sebelum Worker dipasang.

   Kode deck tetap utuh di dalam link baru, jadi semua tempat yang membaca
   link/kode deck (Import, Events, Tournament admin, Battle Sim) tetap bisa
   menemukan "1.xxx.yyy" di dalamnya.
   =================================================================== */
(function(){
  'use strict';
  const SITE = 'https://mhrdecklab.com/';
  const BUCKET = 'share-previews';
  const W = 1200, H = 630;
  const onSite = /(^|\.)mhrdecklab\.com$/.test(location.hostname);
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  const ls = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} },
    del(k){ try{ localStorage.removeItem(k); }catch(e){} },
  };
  const timeout = (p, ms) => Promise.race([p, new Promise((_, no)=>setTimeout(()=>no(new Error('timeout')), ms))]);

  /* ---------- apakah Worker sudah terpasang? ---------- */
  let ok = null;
  /* v7.32b — hanya hasil POSITIF yang diingat per tab. Dulu hasil negatif juga disimpan, jadi tab yang dibuka
     sebelum Worker dipasang tetap membagikan link hash lama walau halaman sudah dimuat ulang. */
  try{ if(sessionStorage.getItem('mhr_sp_ok') === '1') ok = true; }catch(e){}
  const probe = (async ()=>{
    if(ok !== null) return ok;
    if(!onSite){ ok = false; return ok; }
    try{
      const r = await timeout(fetch('/b/__ping', { cache:'no-store' }), 4000);
      const j = r.ok && /json/.test(r.headers.get('content-type') || '') ? await r.json() : null;
      ok = !!(j && j.mhr === 'share');
    }catch(e){ ok = false; }
    try{ if(ok) sessionStorage.setItem('mhr_sp_ok', '1'); else sessionStorage.removeItem('mhr_sp_ok'); }catch(e){}
    return ok;
  })();

  /* ---------- gambar ---------- */
  const imgCache = new Map();
  function loadImg(src, cors){
    const key = (cors ? 'c:' : '') + src;
    if(!imgCache.has(key)) imgCache.set(key, new Promise(res=>{
      const im = new Image(); if(cors) im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = () => res(im.naturalWidth ? im : null); im.onerror = () => res(null); im.src = src;
    }));
    return imgCache.get(key);
  }
  function rr(ctx, x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW){
    const words = String(text).split(/\s+/); const out = []; let cur = '';
    words.forEach(w=>{ const t = cur ? cur + ' ' + w : w; if(ctx.measureText(t).width > maxW && cur){ out.push(cur); cur = w; } else cur = t; });
    if(cur) out.push(cur); return out;
  }
  function fit(ctx, text, maxW){
    if(ctx.measureText(text).width <= maxW) return text;
    let s = text; while(s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function fonts(){
    const body = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const disp = (getComputedStyle(document.documentElement).getPropertyValue('--disp') || '').trim() || body;
    return { body, disp };
  }
  /* latar + 2 cahaya + logo + chip emas (dipakai binder & deck) */
  async function frame(ctx, chip, glowA, glowB){
    ctx.fillStyle = '#0B0E12'; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, 760); g.addColorStop(0, col + '33'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    glow(W, 0, glowA); glow(0, H, glowB);
    const F = fonts();
    const logo = await loadImg('icons/logo-header.png?v=7.03');
    if(logo){ const lh = 44; ctx.drawImage(logo, 56, 44, lh * logo.naturalWidth / logo.naturalHeight, lh); }
    else { ctx.fillStyle = '#fff'; ctx.font = `800 32px ${F.disp}`; ctx.textBaseline = 'middle'; ctx.fillText('MHR DECK LAB', 56, 66); }
    ctx.textBaseline = 'middle'; ctx.font = `800 19px ${F.body}`;
    const t = chip.toUpperCase(), cw = ctx.measureText(t).width + 28;
    ctx.fillStyle = '#F2B01E'; rr(ctx, 56, 112, cw, 34, 7); ctx.fill();
    ctx.fillStyle = '#1A1200'; ctx.fillText(t, 70, 130);
    ctx.textBaseline = 'alphabetic';
    return F;
  }
  /* judul besar (maks. 3 baris) mulai y, lebar maxW → y baris terakhir */
  function title(ctx, F, text, y, maxW){
    let size = 54; ctx.font = `800 ${size}px ${F.disp}`;
    let lines = wrap(ctx, text, maxW);
    if(lines.length > 2){ size = 44; ctx.font = `800 ${size}px ${F.disp}`; lines = wrap(ctx, text, maxW); }
    lines = lines.slice(0, 3);
    ctx.fillStyle = '#FFFFFF';
    lines.forEach(l=>{ y += size * 1.06; ctx.fillText(fit(ctx, l, maxW), 56, y); });
    return y;
  }
  function footer(ctx, F, line){
    ctx.font = `800 24px ${F.body}`; ctx.fillStyle = '#FFFFFF'; ctx.fillText('mhrdecklab.com', 56, H - 74);
    ctx.font = `500 19px ${F.body}`; ctx.fillStyle = '#8A94A3'; ctx.fillText(fit(ctx, line, 400), 56, H - 46);
  }
  /* satu kartu berbingkai gelap + lencana ×N */
  function drawCard(ctx, F, im, x, y, w, h, q, label){
    const rad = Math.round(w * 0.06);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#050608'; rr(ctx, x, y, w, h, rad); ctx.fill(); ctx.restore();
    const bw = 4;
    ctx.save(); rr(ctx, x + bw, y + bw, w - 2 * bw, h - 2 * bw, rad - 2); ctx.clip();
    if(im) ctx.drawImage(im, x + bw, y + bw, w - 2 * bw, h - 2 * bw);
    else { ctx.fillStyle = '#1F2731'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#8A94A3'; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(w * 0.11)}px ${F.body}`; ctx.fillText(label || '', x + w / 2, y + h / 2); ctx.textAlign = 'left'; }
    ctx.restore();
    if(q > 1){
      const t = `×${q}`, fs = Math.round(w * 0.14);
      ctx.font = `800 ${fs}px ${F.body}`; const tw = ctx.measureText(t).width + fs * 0.7, th = fs * 1.45;
      ctx.fillStyle = '#FFFFFF'; rr(ctx, x + w - tw - 8, y + h - th - 8, tw, th, 7); ctx.fill();
      ctx.fillStyle = '#0B0E12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, x + w - tw / 2 - 8, y + h - th / 2 - 7); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  }

  const COL = { Merah:['Red','#E4442E'], Kuning:['Yellow','#F2B01E'], Biru:['Blue','#3B87E8'], Hijau:['Green','#33A45C'], Orange:['Orange','#E8821E'], Purple:['Purple','#9B6BFF'] };
  /* gambar pratinjau deck 1200×630 */
  async function deckCanvas(deck, name, owner){
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const DBX = (typeof DB !== 'undefined' && Array.isArray(DB)) ? DB : (window.CARDS || []);
    const rows = Object.entries(deck || {}).map(([no, q])=>({ c: DBX.find(d=>d.no === no), no, q })).filter(r=>r.c && r.q > 0);
    const total = rows.reduce((a, r)=>a + r.q, 0);
    const byCol = {}; rows.forEach(r=>{ byCol[r.c.c] = (byCol[r.c.c] || 0) + r.q; });
    const cols = Object.entries(byCol).sort((a, b)=>b[1] - a[1]);
    const hex = k => (COL[k] || [k, '#8A94A3'])[1];
    const F = await frame(ctx, 'Marvel Hero Rush deck', hex(cols[0] ? cols[0][0] : 'Merah'), hex(cols[1] ? cols[1][0] : (cols[0] ? cols[0][0] : 'Biru')));
    /* kiri: nama, jumlah, warna, kurva level */
    let y = title(ctx, F, name || 'Deck', 160, 400);
    ctx.font = `600 24px ${F.body}`; ctx.fillStyle = '#C0C8D2';
    y += 42; ctx.fillText(`${total} cards${owner ? ` · by @${owner}` : ''}`, 56, y);
    y += 22; let x = 56;
    ctx.font = `700 20px ${F.body}`; ctx.textBaseline = 'middle';
    cols.slice(0, 4).forEach(([k, n])=>{
      const t = `${(COL[k] || [k])[0]} ${n}`, w = ctx.measureText(t).width + 40;
      if(x + w > 460) return;
      ctx.fillStyle = '#171B22'; rr(ctx, x, y, w, 36, 18); ctx.fill(); ctx.strokeStyle = '#262C36'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = hex(k); ctx.beginPath(); ctx.arc(x + 17, y + 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(t, x + 30, y + 19); x += w + 8;
    });
    ctx.textBaseline = 'alphabetic';
    /* kurva level */
    const lv = {}; rows.forEach(r=>{ lv[r.c.l] = (lv[r.c.l] || 0) + r.q; });
    const lvKeys = Object.keys(lv).map(Number).sort((a, b)=>a - b);
    const top = y + 56, bottom = H - 120, barH = Math.max(30, bottom - top - 22);
    if(lvKeys.length && barH >= 30){
      const maxN = Math.max(...Object.values(lv)), n = lvKeys.length, bw = Math.min(40, Math.floor((400 - (n - 1) * 8) / n));
      lvKeys.forEach((l, i)=>{
        const bx = 56 + i * (bw + 8), h = Math.max(4, Math.round(barH * lv[l] / maxN));
        ctx.fillStyle = '#3B87E8'; rr(ctx, bx, top + barH - h, bw, h, 4); ctx.fill();
        ctx.fillStyle = '#8A94A3'; ctx.font = `600 15px ${F.body}`; ctx.textAlign = 'center';
        ctx.fillText(`Lv${l}`, bx + bw / 2, top + barH + 18); ctx.textAlign = 'left';
      });
    }
    footer(ctx, F, 'Open, copy or test this deck');
    /* kanan: 8 kartu kunci (jumlah terbanyak, lalu level tertinggi) */
    const pick = rows.slice().sort((a, b)=>b.q - a.q || b.c.l - a.c.l || a.no.localeCompare(b.no)).slice(0, 8);
    const gap = 12, areaX = 500, areaW = W - 56 - areaX, perRow = 4;
    const cw = Math.floor((areaW - (perRow - 1) * gap) / perRow), ch = Math.round(cw * 88 / 63);
    const nRows = Math.ceil(pick.length / perRow) || 1;
    const gy = Math.round((H - (nRows * ch + (nRows - 1) * gap)) / 2);
    const imgs = await Promise.all(pick.map(r=>(typeof loadCardImgAny === 'function' ? loadCardImgAny(r.no) : loadImg(`images/${r.no}.jpg`)).catch(()=>null)));
    pick.forEach((r, i)=>{
      const row = Math.floor(i / perRow), inRow = Math.min(perRow, pick.length - row * perRow);
      const rx = areaX + Math.round((areaW - (inRow * cw + (inRow - 1) * gap)) / 2);
      drawCard(ctx, F, imgs[i], rx + (i % perRow) * (cw + gap), gy + row * (ch + gap), cw, ch, r.q, r.no);
    });
    return cv;
  }

  /* canvas → JPEG ≤ 380 KB */
  async function jpeg(cv){
    for(const q of [0.84, 0.74, 0.64, 0.52]){
      const b = await new Promise(res=>cv.toBlob(res, 'image/jpeg', q));
      if(b && b.size <= 380 * 1024) return b;
    }
    return null;
  }
  async function upload(path, cv){
    const c = client(); if(!c || !c.storage) return false;
    const blob = await jpeg(cv); if(!blob) return false;
    const { error } = await c.storage.from(BUCKET).upload(path, blob, { upsert:true, contentType:'image/jpeg', cacheControl:'300' });
    return !error;
  }
  async function session(){
    try{ return (window.MHRAuth && window.MHRAuth.ready) ? await window.MHRAuth.getSession() : null; }catch(e){ return null; }
  }
  async function username(s){
    try{ return (s && window.MHRAuth.getUsername) ? (await window.MHRAuth.getUsername(s)) || '' : ''; }catch(e){ return ''; }
  }
  /* tanda tangan sederhana supaya gambar yang sama tidak diunggah ulang */
  const sig = v => { const s = JSON.stringify(v); let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

  const pending = {};
  window.MHRSharePreview = {
    ready: () => probe,
    get enabled(){ return ok === true; },
    binderUrl: code => ok === true ? `${SITE}b/${code}` : `${SITE}#binder/${code}`,

    /* link deck untuk "Copy deck link". Login → /d/<kode>?i=<id> + gambar pratinjau;
       guest → /d/<kode>; Worker belum terpasang → #d=<kode> seperti dulu. */
    async deckUrl(deck, name){
      const code = encodeDeck(deck, name);
      if(!(await probe)) return `${SITE}#d=${code}`;
      const base = `${SITE}d/${code}`;
      const s = await session(); const c = client();
      if(!s || !c) return base;
      try{
        const { data:id, error } = await timeout(c.rpc('mhr_deck_share_make', { p_code:code }), 5000);
        if(error || !id) return base;
        const key = 'mhr_sp_d_' + id;
        if(!ls.get(key)){
          const job = pending[key] || (pending[key] = (async ()=>{
            const cv = await deckCanvas(deck, name, await username(s));
            if(await upload(`deck/${id}.jpg`, cv)) ls.set(key, '1');
          })().catch(()=>{}).finally(()=>{ delete pending[key]; }));
          await timeout(job, 7000).catch(()=>{});   // lanjut di latar belakang kalau lambat
        }
        return `${base}?i=${id}`;
      }catch(e){ return base; }
    },

    /* binder: dipanggil binders-ui.js saat binder dibagikan / disimpan.
       draw = async () => canvas (binders-ui.js, window.MHRBinderOg). force = abaikan tanda tangan. */
    async binderPreview(b, draw, force){
      if(!(await probe) || !b || !b.is_public || !b.share_code) return false;
      const key = 'mhr_sp_b_' + b.share_code;
      const s = sig([b.name, b.kind, b.color, b.location, b.show_prices, b.pages, (b.slots || []).slice(0, 27)]);
      if(!force && ls.get(key) === s) return true;
      if(pending[key]) return pending[key];
      return (pending[key] = (async ()=>{
        const cv = await draw();
        const done = cv && await upload(`binder/${b.share_code}.jpg`, cv);
        if(done) ls.set(key, s);
        return !!done;
      })().catch(()=>false).finally(()=>{ delete pending[key]; }));
    },
    hasBinder: code => !!ls.get('mhr_sp_b_' + code),
    async removeBinder(code){
      ls.del('mhr_sp_b_' + code);
      const c = client(); if(!c || !c.storage || !code) return;
      try{ await c.storage.from(BUCKET).remove([`binder/${code}.jpg`]); }catch(e){}
    },
    /* dipakai binders-ui.js untuk menggambar pratinjau binder dengan gaya yang sama */
    _kit: { W, H, frame, title, footer, drawCard, rr, fit, wrap, loadImg },
    _deckCanvas: deckCanvas,
  };
})();
