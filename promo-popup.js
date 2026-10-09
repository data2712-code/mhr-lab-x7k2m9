/* ===================================================================
   MHR DECK LAB — promo-popup.js (v6.89)
   Pop-up iklan berbentuk carousel (3 slide) untuk kampanye di Beranda/semua
   halaman aplikasi. Seluruh teks pop-up berbahasa Inggris (UI situs satu
   bahasa saja). Mengganti kampanye = ubah objek PROMO di bawah, lalu naikkan
   PROMO.id supaya pengunjung yang pernah memilih "Don't show this again"
   untuk kampanye lama tetap melihat kampanye baru.

   ATURAN TAMPIL (disepakati dengan pemilik situs):
   - Hanya SEKALI saat pengunjung baru masuk ke situs (di halaman mana pun).
     sessionStorage menandai sesi tab ini sudah dievaluasi, jadi berpindah
     halaman di dalam situs (hash-routing) tidak memunculkannya lagi.
   - Jeda minimum antar-tampil = PROMO.minGapHours (sejak v6.89: 0 = setiap
     pengunjung masuk ke situs / membuka tab baru; isi 24 untuk kembali ke
     aturan sekali per 24 jam). Memuat ulang tab yang sama tidak mengulang.
   - "Don't show this again" -> tidak muncul lagi untuk kampanye ini.
   - Hanya selama jendela kampanye: PROMO.startsAt .. PROMO.endsAt (14 hari).
     Setelah endsAt pop-up berhenti sendiri walau kodenya belum dihapus.
   - Dilewati (tidak dihitung tampil) kalau lightbox kartu / tampilan deck /
     modal lain sedang terbuka.
   - Pratinjau untuk pemilik: buka mhrdecklab.com/?promo=preview
     (mengabaikan jendela tanggal dan penyimpanan; tidak menyimpan apa pun).

   Semua akses storage dibungkus try/catch (private mode / diblokir).
   Gambar baru diunduh saat pop-up benar-benar tampil.
   =================================================================== */
(function(){
  'use strict';

  const PROMO = {
    id: 'eos-asia-peak-2026-10',
    /* jendela kampanye: 14 hari sejak naik ke situs (WIB, UTC+7) */
    startsAt: '2026-10-09T00:00:00+07:00',
    endsAt:   '2026-10-23T23:59:59+07:00',
    minGapHours: 0,   /* v6.89: 0 = tampil tiap kali pengunjung masuk (sekali per sesi tab); 24 = maks. sekali/hari */
    delayMs: 2000,
    autoMs: 6000,
    slides: [
      {
        img: 'images/promo/promo-sp01.webp',
        alt: 'Marvel Hero Rush Era of Spiders (SP01) booster box and packs, now available',
        kicker: 'New set',
        title: 'Era of Spiders (SP01) Is Here',
        text: 'The Spider-Verse set launched in Indonesia on October 3, 2026, with Spider-Man variants from across the multiverse and all-foil cards. Browse the SP01 cards.',
        cta: 'Browse SP01',
        href: '#set/SP01'
      },
      {
        img: 'images/promo/promo-champions.webp',
        alt: 'The Champions Go to ASCC: the four Indonesian qualifier winners with the MHR Indonesia team',
        kicker: 'Asia Peak Invitational',
        title: 'The Champions Go to ASCC',
        text: 'Radian, Edwin, Yogie and Luthfi won the Indonesian qualifiers and are flying to Macao for the Asia Peak Invitational on October 11. Read the story.',
        cta: 'Read the story',
        href: '#berita/era-of-spiders-arrives-in-indonesia-champions-head-to-macao'
      },
      {
        img: 'images/promo/promo-keyart.webp',
        alt: 'Marvel Hero Rush Trading Card Game key art',
        kicker: 'MHR Deck Lab',
        title: 'Build Your Marvel Hero Rush Deck',
        text: 'Search the full card list, build and share decks, and follow tournament results and news — free and fan-made.',
        cta: 'Start Building',
        href: '#build'
      }
    ],
    credit: 'Images courtesy of MHR Indonesia. © Marvel © Jason. MHR Deck Lab is an unofficial fan site.'
  };

  const KEY_STORE = 'mhr_promo_' + PROMO.id;
  const KEY_SESSION = 'mhr_promo_seen_' + PROMO.id;

  /* ---------- storage aman ---------- */
  function lsGet(){
    try{ return JSON.parse(localStorage.getItem(KEY_STORE) || '{}') || {}; }catch(e){ return {}; }
  }
  function lsSet(o){
    try{ localStorage.setItem(KEY_STORE, JSON.stringify(o)); }catch(e){}
  }
  function ssHas(){
    try{ return sessionStorage.getItem(KEY_SESSION) === '1'; }catch(e){ return false; }
  }
  function ssMark(){
    try{ sessionStorage.setItem(KEY_SESSION, '1'); }catch(e){}
  }

  /* ---------- keputusan tampil ---------- */
  const preview = /[?&]promo=preview\b/.test(location.search);

  function modalTerbuka(){
    return !!document.querySelector('.lb:not([hidden]), .dview:not([hidden])');
  }

  function putuskan(){
    if(preview) return true;
    const now = Date.now();
    const t0 = Date.parse(PROMO.startsAt), t1 = Date.parse(PROMO.endsAt);
    if(!(now >= t0 && now < t1)) return false;      // di luar jendela kampanye
    if(ssHas()) return false;                        // sesi ini sudah dievaluasi
    ssMark();
    const st = lsGet();
    if(st.never) return false;                       // "Don't show this again"
    if(st.last && now - st.last < PROMO.minGapHours * 3600 * 1000) return false;
    return true;
  }

  /* ---------- CSS (disuntik saat pertama tampil) ---------- */
  const CSS = `
  .promo{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(6,8,11,.82);opacity:0;transition:opacity .25s}
  .promo.in{opacity:1}
  .promo-box{position:relative;width:min(100%,560px);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);
    overflow-y:auto;background:var(--panel,#171D24);border:1px solid var(--accent,#F2B01E);
    border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);color:var(--paper,#EDE7DA);outline:none}
  .promo-x{position:absolute;top:8px;right:8px;z-index:3;width:36px;height:36px;border-radius:50%;
    border:1px solid rgba(255,255,255,.35);background:rgba(14,18,22,.78);color:#fff;font-size:20px;
    line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .promo-x:hover{background:var(--accent,#F2B01E);color:#1A1206}
  .promo button:focus-visible,.promo a:focus-visible,.promo input:focus-visible{outline:2px solid var(--accent,#F2B01E);outline-offset:2px}
  .promo-view{overflow:hidden;border-radius:14px 14px 0 0;touch-action:pan-y;background:#0E1216}
  .promo-track{display:flex;transition:transform .35s ease;will-change:transform}
  .promo-slide{flex:0 0 100%;min-width:0}
  .promo-img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#0E1216;-webkit-user-drag:none;user-select:none}
  .promo-body{padding:14px 18px 6px}
  .promo-kicker{font-family:var(--mono,monospace);font-size:11.5px;font-weight:800;letter-spacing:.08em;
    text-transform:uppercase;color:var(--accent,#F2B01E)}
  .promo-title{font-family:var(--disp,Impact,sans-serif);font-size:25px;line-height:1.15;margin:4px 0 8px}
  .promo-text{font-size:14.5px;line-height:1.55;color:#C9D0DA}
  .promo-cta{display:inline-block;margin-top:14px;padding:11px 20px;border-radius:999px;background:var(--accent,#F2B01E);
    color:#1A1206;font-weight:800;font-size:14px;text-decoration:none}
  .promo-cta:hover{filter:brightness(1.08)}
  .promo-nav{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px 18px 4px}
  .promo-arrow{width:34px;height:34px;border-radius:50%;border:1px solid var(--line,#2C3644);background:var(--panel2,#1F2731);
    color:var(--paper,#EDE7DA);font-size:16px;cursor:pointer}
  .promo-arrow:hover{border-color:var(--accent,#F2B01E);color:var(--accent,#F2B01E)}
  .promo-dots{display:flex;gap:8px}
  .promo-dot{width:10px;height:10px;padding:0;border-radius:50%;border:0;background:#4A5666;cursor:pointer}
  .promo-dot[aria-current="true"]{background:var(--accent,#F2B01E);transform:scale(1.25)}
  .promo-foot{padding:8px 18px 14px;display:flex;flex-direction:column;gap:8px}
  .promo-never{display:flex;align-items:center;gap:8px;font-size:13px;color:#C9D0DA;cursor:pointer}
  .promo-never input{width:16px;height:16px;accent-color:var(--accent,#F2B01E)}
  .promo-credit{font-size:11px;line-height:1.45;color:var(--muted,#8B96A5)}
  @media (max-width:520px){
    .promo{padding:12px;align-items:center}
    .promo-title{font-size:22px}
    .promo-cta{display:block;text-align:center}
  }
  @media (prefers-reduced-motion:reduce){
    .promo,.promo-track{transition:none}
  }`;

  /* ---------- tampilan ---------- */
  function esc(s){
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function show(){
    if(!preview && modalTerbuka()) return;           // dilewati, tidak dihitung tampil
    if(document.getElementById('promoPop')) return;

    if(!document.getElementById('promoCss')){
      const st = document.createElement('style');
      st.id = 'promoCss'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    if(!preview){
      const o = lsGet(); o.last = Date.now(); lsSet(o);
    }

    const slides = PROMO.slides;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    let idx = 0, timer = null, stopped = false;

    const root = document.createElement('div');
    root.className = 'promo'; root.id = 'promoPop';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Announcements');
    root.innerHTML =
      '<div class="promo-box" tabindex="-1">' +
        '<button type="button" class="promo-x" aria-label="Close">×</button>' +
        '<div class="promo-view"><div class="promo-track">' +
        slides.map((s, i) =>
          '<div class="promo-slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + slides.length + '">' +
            '<img class="promo-img" width="1280" height="720" decoding="async" draggable="false" alt="' + esc(s.alt) + '" data-src="' + esc(s.img) + '">' +
            '<div class="promo-body">' +
              '<div class="promo-kicker">' + esc(s.kicker) + '</div>' +
              '<div class="promo-title" role="heading" aria-level="2">' + esc(s.title) + '</div>' +
              '<p class="promo-text">' + esc(s.text) + '</p>' +
              '<a class="promo-cta" href="' + esc(s.href) + '">' + esc(s.cta) + '</a>' +
            '</div>' +
          '</div>').join('') +
        '</div></div>' +
        '<div class="promo-nav">' +
          '<button type="button" class="promo-arrow" data-d="-1" aria-label="Previous slide">‹</button>' +
          '<div class="promo-dots">' +
            slides.map((s, i) => '<button type="button" class="promo-dot" data-i="' + i + '" aria-label="Go to slide ' + (i + 1) + '"></button>').join('') +
          '</div>' +
          '<button type="button" class="promo-arrow" data-d="1" aria-label="Next slide">›</button>' +
        '</div>' +
        '<div class="promo-foot">' +
          '<label class="promo-never"><input type="checkbox" id="promoNever"> Don\'t show this again</label>' +
          '<div class="promo-credit">' + esc(PROMO.credit) + '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';

    const box = root.querySelector('.promo-box');
    const track = root.querySelector('.promo-track');
    const view = root.querySelector('.promo-view');
    const imgs = [...root.querySelectorAll('.promo-img')];
    const dots = [...root.querySelectorAll('.promo-dot')];
    const slideEls = [...root.querySelectorAll('.promo-slide')];

    /* gambar: slide 1 dulu, sisanya menyusul (hanya diunduh bila pop-up tampil) */
    imgs.forEach((im, i) => setTimeout(() => { im.src = im.dataset.src; }, i === 0 ? 0 : 150));

    function go(n){
      idx = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * idx) + '%)';
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === idx)));
      slideEls.forEach((el, i) => { if(i === idx) el.removeAttribute('inert'); else el.setAttribute('inert', ''); });
    }
    function stop(){ stopped = true; if(timer){ clearInterval(timer); timer = null; } }
    function pause(){ if(timer){ clearInterval(timer); timer = null; } }
    function resume(){ if(!stopped && !reduce && !timer) timer = setInterval(() => go(idx + 1), PROMO.autoMs); }

    function close(){
      const never = root.querySelector('#promoNever').checked;
      if(never && !preview){ const o = lsGet(); o.never = true; lsSet(o); }
      stop();
      document.removeEventListener('keydown', onKey, true);
      root.classList.remove('in');
      document.body.style.overflow = prevOverflow;
      setTimeout(() => root.remove(), reduce ? 0 : 250);
      try{ if(prevFocus && prevFocus.focus) prevFocus.focus({preventScroll:true}); }catch(e){}
    }

    function onKey(e){
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
      if(e.key === 'ArrowLeft'){ stop(); go(idx - 1); return; }
      if(e.key === 'ArrowRight'){ stop(); go(idx + 1); return; }
      if(e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button, a[href], input')].filter(el => !el.closest('[inert]') && !el.disabled);
      if(!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if(e.shiftKey && (document.activeElement === first || document.activeElement === box)){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);

    root.addEventListener('click', e => {
      if(e.target === root){ close(); return; }                       // klik di luar kotak
      if(e.target.closest('.promo-x')){ close(); return; }
      const ar = e.target.closest('.promo-arrow');
      if(ar){ stop(); go(idx + Number(ar.dataset.d)); return; }
      const dt = e.target.closest('.promo-dot');
      if(dt){ stop(); go(Number(dt.dataset.i)); return; }
      if(e.target.closest('.promo-cta')){ close(); }                  // biarkan hash-link berjalan
    });

    /* geser jari/mouse */
    let x0 = null;
    view.addEventListener('pointerdown', e => { x0 = e.clientX; });
    view.addEventListener('pointerup', e => {
      if(x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if(Math.abs(dx) > 40){ stop(); go(idx + (dx < 0 ? 1 : -1)); }
    });
    view.addEventListener('pointercancel', () => { x0 = null; });

    /* fokus awal ke kotak dialog DULU, baru pasang pendengar fokus (kalau terbalik,
       focusin dari fokus awal langsung menghentikan autoplay) */
    box.focus({preventScroll:true});

    /* autoplay: berhenti saat disentuh/difokus; tidak jalan jika reduced-motion */
    box.addEventListener('mouseenter', pause);
    box.addEventListener('mouseleave', resume);
    box.addEventListener('focusin', pause);
    box.addEventListener('focusout', resume);

    go(0);
    requestAnimationFrame(() => root.classList.add('in'));
    resume();
  }

  /* ---------- mulai ---------- */
  function mulai(){
    if(!putuskan()) return;
    setTimeout(show, preview ? 300 : PROMO.delayMs);
  }
  if(document.readyState === 'complete') mulai();
  else window.addEventListener('load', mulai, {once:true});
})();
