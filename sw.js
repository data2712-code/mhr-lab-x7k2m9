/* ===================================================================
   MHR DECK LAB — service worker
   ===================================================================
   Tujuan: (1) bisa di-"Add to Home Screen" dan tetap jalan tanpa internet,
   (2) gambar kartu dilayani dari cache setelah kunjungan pertama (hemat
   bandwidth GitHub Pages).

   PENTING soal strategi cache — ini yang paling sering bikin bingung:
   - index.html, cards.js, data.js, manifest.json  → NETWORK-FIRST.
     Kalau online, SELALU ambil versi terbaru dari server dulu (dan cache-nya
     diperbarui diam-diam). Cache cuma dipakai kalau benar-benar offline.
     Ini supaya update situs (versi baru, jadwal LGS baru di data.js, dst)
     langsung kepakai — tidak mengulang masalah "kok masih versi lama" yang
     pernah terjadi karena cache browser biasa.
   - images/**  → CACHE-FIRST. Gambar kartu praktis tidak pernah berubah
     setelah diunggah, jadi begitu tersimpan di cache, tidak perlu diambil
     ulang dari server tiap kali. Ini yang bikin mode offline kepakai dan
     bandwidth hemat.
   - Berkas dari domain lain (CDN jsPDF/html2canvas, beacon Cloudflare)
     TIDAK disentuh sama sekali — dibiarkan lewat ke jaringan seperti biasa.

   CACHE_VERSION di bawah ini adalah versi SKEMA cache, BUKAN versi aplikasi
   (v6.x di README/footer). Cuma perlu dinaikkan kalau cara kerja cache-nya
   sendiri berubah (mis. daftar STATIC_ASSETS berubah) — bukan di setiap
   rilis. Instal service worker baru otomatis `skipWaiting()` + `clients.claim()`
   supaya versi baru langsung dipakai tanpa perlu semua tab ditutup dulu.
   =================================================================== */

const CACHE_VERSION = 'v1';
const CACHE_STATIC = `mhr-shell-${CACHE_VERSION}`;
const CACHE_IMAGES = `mhr-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './cards.js',
  './data.js',
  './manifest.json',
];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_STATIC && k !== CACHE_IMAGES).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.origin !== location.origin) return; // biarkan CDN/beacon lewat apa adanya

  const isImage = url.pathname.includes('/images/');

  if(isImage){
    e.respondWith((async ()=>{
      const cache = await caches.open(CACHE_IMAGES);
      const hit = await cache.match(req);
      if(hit) return hit;
      try{
        const res = await fetch(req);
        if(res && res.ok) cache.put(req, res.clone());
        return res;
      }catch(err){
        return hit || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async ()=>{
    const cache = await caches.open(CACHE_STATIC);
    try{
      /* cache:'reload' memaksa fetch() ini melewati HTTP cache biasa di
         browser dan benar-benar tanya ke server — soalnya kalau cuma
         mengandalkan urutan network-first di service worker ini tanpa opsi
         ini, fetch() masih bisa "ditangkap" duluan oleh HTTP cache biasa
         (tergantung header Cache-Control dari GitHub Pages), jadi isinya
         bisa saja tetap versi lama walau sudah "coba network dulu". */
      const res = await fetch(req, {cache: 'reload'});
      if(res && res.ok) cache.put(req, res.clone());
      return res;
    }catch(err){
      const hit = await cache.match(req) || await cache.match('./index.html');
      if(hit) return hit;
      throw err;
    }
  })());
});
