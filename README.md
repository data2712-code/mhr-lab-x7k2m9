# MHR Deck Lab

Deck builder web untuk **Marvel Hero Rush TCG** — versi Indonesia.
Dibuat karena belum ada deck builder resmi untuk game ini.

🔗 **Live:** https://data2712-code.github.io/MHR-Deck-Lab/
📱 **TikTok:** [@deteprtm](https://www.tiktok.com/@deteprtm)

> Fan-made, tidak berafiliasi dengan atau disponsori oleh Marvel maupun penerbit
> Marvel Hero Rush. Seluruh nama kartu, teks efek, dan artwork adalah milik
> pemegang haknya masing-masing. Gambar kartu menggunakan versi ber-watermark SAMPLE.

---

## Struktur file

```
MHR-Deck-Lab/
├── index.html        ← seluruh aplikasi (HTML + CSS + JS + database 200 kartu)
├── og-image.jpg      ← gambar preview saat link dibagikan
├── robots.txt        ← kontrol pengindeksan mesin pencari
└── images/           ← 200 gambar kartu, nama = nomor kartu (BP01-001.jpg)
```

Aplikasi ini sepenuhnya statis — tanpa server, tanpa database, tanpa akun.
Semua data deck tersimpan di browser pengguna (localStorage).

## Cara update

1. Edit / ganti `index.html`
2. Repository → **Add file → Upload files** → drop file → **Commit changes**
3. Tunggu 1–2 menit, buka situs dengan `?v=` angka baru untuk melewati cache

Menambah gambar kartu: masuk ke folder `images` dulu, baru Upload files.
Nama file harus persis nomor kartu, huruf besar (`BP01-004.jpg`) — GitHub Pages
bersifat case-sensitive.

## Catatan teknis

| Hal | Keterangan |
|---|---|
| Sumber data kartu | API resmi `server.marvelherorush.com/marvel/card/list` (200 kartu unik) |
| Ukuran gambar kartu | 450 × 620 px, ber-watermark SAMPLE, ±80 KB per file |
| Penyimpanan deck | localStorage, per browser per perangkat |
| Format link deck | `#d=1.<nama-base64url>.<kode kartu>` — versi 1 |
| Batas GitHub Pages | Situs 1 GB, bandwidth 100 GB/bulan (soft limit) |
| Rem darurat | Settings → Pages → **Unpublish site** (reversibel) |

**Kode link deck:** 1 huruf seri + 3 digit nomor + jumlah (basis36).
Seri: `A`=BP01, `B`=PB01, `C`=EB01, `D`=TB01, `E`=SD01, `F`=SD02, `G`=SD03, `H`=SD04.
Angka versi di depan wajib dipertahankan — kalau format berubah, naikkan ke 2
dan tetap dukung pembacaan versi 1 agar link lama tidak rusak.

---

## Riwayat Update

### v2.0 — 6 Agustus 2026
- Bagikan deck sebagai **link**: deck disandikan di dalam URL, penerima bisa
  langsung melihat atau menyimpannya sebagai deck sendiri tanpa menimpa deck mereka
- Unduh gambar deck **resolusi tinggi** dengan pilihan skala; resolusi menyesuaikan
  otomatis dengan kemampuan perangkat (Safari iOS punya batas kanvas lebih ketat)
- `og-image.jpg` — preview bergambar saat link dibagikan di WhatsApp / media sosial
- 🔧 **Fix:** gambar kartu kini dimuat bertahap saat di-scroll (lazy loading dengan
  teknik opacity, bukan `display:none`). Bandwidth per kunjungan turun dari ±16 MB
  menjadi ±0,7–3 MB — kapasitas naik 5–20× lipat

### v1.9 — 5 Agustus 2026
- Tampilan **grid**: gambar kartu tampil besar, bisa diganti ke tampilan daftar;
  pilihan tampilan tersimpan otomatis
- **Popup kartu**: klik gambar atau nama kartu → artwork besar + detail lengkap +
  tombol tambah ke deck. Tutup dengan ✕, klik latar, atau Escape
- Tautan TikTok di header dan footer
- Fitur cetak kartu proxy (PDF, 63×88 mm, 9 kartu per A4) **ditunda** —
  kode tersimpan di `backup_dengan_proxy.html`

### v1.8 — 5 Agustus 2026
- Watermark **SAMPLE** pada seluruh 200 gambar kartu
- Koleksi gambar **lengkap 200/200**: BP01, PB01, EB01, SD01–SD04, TB01
- 🔧 **Fix:** empat kesalahan penamaan gambar — PB01-002↔003, PB01-006↔007,
  PB01-010↔011 tertukar, dan `SD02-11` → `SD02-011`
- Fitur unggah gambar oleh pengguna **dihapus** agar tampilan kartu seragam
  untuk semua orang dan tidak bisa diubah pihak lain

### v1.7 — 5 Agustus 2026
- Halaman **tampilan deck untuk dibagikan**: grid kartu dengan badge jumlah salinan
- Unduh tampilan deck sebagai gambar PNG
- Ganti nama deck
- 🔧 **Fix:** gambar dari folder `images` tidak muncul — penyebabnya urutan ekstensi
  (`.png` dicoba lebih dulu padahal file `.jpg`) dan placeholder yang menutupi gambar

### v1.5 — 4 Agustus 2026
- **Versi publik**: deck tersimpan otomatis di browser, bisa menyimpan beberapa
  deck sekaligus
- Dukungan gambar kartu dari folder `images/`
- Tautan ke halaman kartu di situs resmi pada setiap kartu
- Keterangan fan-made dan penghormatan hak cipta di footer

### v1.1 — 4 Agustus 2026
- Ukuran deck default **50 kartu**, maksimal **3 salinan** per kartu (aturan resmi)
- Teks efek kartu selalu tampil tanpa perlu diklik

### v1.0 — 4 Agustus 2026 · versi pertama
- Database **200 kartu**: BP01, PB01, PR, SD01–SD04, lengkap dengan stat dan
  teks efek bahasa Indonesia
- Pencarian nama / efek / trait; filter warna, seri, level, jarak, rarity
- Panel deck dengan kurva level, komposisi warna, penghitung ukuran deck
- Salin daftar deck sebagai teks

---

## Rencana / ide berikutnya

- [ ] Reintegrasi fitur cetak kartu proxy (PDF A4, kode ada di backup)
- [ ] Backup & restore data deck untuk pindah perangkat
- [ ] Gambar kartu resolusi lebih tinggi (>450 px) untuk hasil unduhan lebih tajam
- [ ] Update database saat set kartu baru rilis
- [ ] Pertimbangkan Cloudflare Pages jika bandwidth mendekati batas
