# MHR Deck Lab

**Versi saat ini: v2.5** · 7 Agustus 2026

Deck builder web untuk **Marvel Hero Rush TCG** — versi Indonesia.
Dibuat karena belum ada deck builder resmi untuk game ini.

🔗 **Live:** https://data2712-code.github.io/mhr-lab-x7k2m9/
📱 **TikTok:** [@deteprtm](https://www.tiktok.com/@deteprtm)

> Fan-made, tidak berafiliasi dengan atau disponsori oleh Marvel maupun penerbit
> Marvel Hero Rush. Seluruh nama kartu, teks efek, dan artwork adalah milik
> pemegang haknya masing-masing. Gambar kartu menggunakan versi ber-watermark SAMPLE.

---

## Struktur file

```
mhr-lab-x7k2m9/
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
4. Perbarui bagian **Riwayat Update** di README ini

### Cara menambah deck contoh

1. Susun deck di aplikasi seperti biasa
2. Buka situs dengan `?admin=1` di belakang alamat, misal
   `https://data2712-code.github.io/mhr-lab-x7k2m9/?admin=1`
   (simpan sebagai bookmark agar tidak perlu mengetik ulang)
3. Klik tombol **★** di panel deck → panel admin muncul di atas daftar deck contoh
4. Isi nama dan deskripsi singkat → **Buat kode dari deck aktif** → **Salin**
5. Di GitHub: buka `index.html` → ikon **pensil** (Edit) → `Ctrl+F` cari `DECK_CONTOH`
6. Tempel kode yang disalin ke dalam daftar → **Commit changes**

Format satu entri (field `cr` opsional):

```javascript
  { nm:'Nama Deck', cr:'Nama Pembuat',
    ds:'',
    cd:'1.<kode dari link deck>' },
```

Field `ds` bisa dibiarkan kosong (`ds:''`) — blok deskripsinya otomatis tidak
ditampilkan. Isi kalau suatu saat ingin menjelaskan gaya main decknya.

Menghapus deck contoh: hapus barisnya. Mengubah urutan: pindahkan barisnya.
Panel admin tidak terlihat oleh pengunjung biasa. Ini hanya menyembunyikan dari
tampilan, bukan pengamanan — tapi tombol itu memang tidak punya kuasa apa pun,
karena satu-satunya cara mengubah daftar adalah commit ke repository ini.

### Cara mengecek versi file

Nomor versi tercatat di tiga tempat, jadi mudah dipastikan file mana yang aktif:

| Lokasi | Cara melihat |
|---|---|
| Nama file kiriman | `mhr_deck_lab_public_v2.5.html` |
| Komentar di baris awal file | buka file dengan editor teks, atau `Ctrl+U` (view source) di browser |
| `<meta name="version">` | di dalam `<head>` |
| Pojok bawah situs | teks kecil `v2.5` di bawah disclaimer footer |

Kalau teks versi di footer tidak diinginkan, hapus baris `<div ...>v2.5</div>`
di dekat akhir `<footer>` — tidak memengaruhi fungsi apa pun.

Menambah gambar kartu: masuk ke folder `images` dulu, baru Upload files.
Nama file harus persis nomor kartu, huruf besar (`BP01-004.jpg`) — GitHub Pages
bersifat case-sensitive.

## Catatan teknis

| Hal | Keterangan |
|---|---|
| Sumber data kartu | API resmi `server.marvelherorush.com/marvel/card/list` (200 kartu unik) |
| Ukuran gambar kartu | 450 × 620 px, ber-watermark SAMPLE, ±80 KB per file |
| Aturan deck | 50 kartu, maksimal 3 salinan per kartu, maksimal 2 warna (bisa diubah di panel) |
| Penyimpanan deck | localStorage, per browser per perangkat |
| Format link deck | `#d=1.<nama-base64url>.<kode kartu>` — versi 1 |
| Batas GitHub Pages | Situs 1 GB, bandwidth 100 GB/bulan (soft limit) |
| Rem darurat | Settings → Pages → **Unpublish site** (reversibel) |
| Nama repository | diacak (`mhr-lab-x7k2m9`) agar link tidak mudah ditemukan; `robots.txt` melarang pengindeksan |

**Kode link deck:** 1 huruf seri + 3 digit nomor + jumlah (basis36).
Seri: `A`=BP01, `B`=PB01, `C`=EB01, `D`=TB01, `E`=SD01, `F`=SD02, `G`=SD03, `H`=SD04.
Angka versi di depan wajib dipertahankan — kalau format berubah, naikkan ke 2
dan tetap dukung pembacaan versi 1 agar link lama tidak rusak.

---

## Riwayat Update

### v2.5 — 7 Agustus 2026
- Deskripsi deck contoh dikosongkan — tiap deck kini hanya menampilkan nama,
  kredit pembuat, komposisi warna, jumlah kartu, dan rata-rata level
- Blok deskripsi otomatis disembunyikan kalau `ds` kosong, jadi tidak ada ruang
  menggantung di kartu deck

### v2.4 — 7 Agustus 2026
- Deck contoh keempat: **Merah – Kuning** oleh Katalio — mesin [Machine]/[Ultron]
  dengan 20 kartu Lv1 sebagai fondasi
- Deskripsi keempat deck contoh dilengkapi (sebelumnya sempat berisi teks sementara)
- URL repository di komentar kepala file diperbarui ke nama repo yang sekarang

### v2.3 — 7 Agustus 2026
- Deck contoh diganti dengan **tiga deck yang sedang banyak dipakai di komunitas**
  (Merah–Hijau, Merah–Biru, Biru–Hijau) — semuanya karya Fadhel
- Kredit pembuat deck ditampilkan pada tiap deck contoh (field `cr`)
- Pembuat kode di mode admin kini punya kolom kredit pembuat

### v2.2 — 7 Agustus 2026
- **Deck contoh bawaan** — tombol ★ di panel deck membuka daftar deck contoh
  (Ultron Engine, Quantum Tempo, Prune Aggro) lengkap dengan komposisi warna,
  rata-rata level, dan penjelasan gaya main. Bisa disimpan sebagai deck sendiri
  atau dilihat isinya dulu; deck yang sedang disusun tidak tertimpa
- **Mode admin** (`?admin=1`) — pembuat kode deck contoh yang hanya tampil untuk
  pemilik situs, menghasilkan potongan kode siap tempel ke `DECK_CONTOH`
- Daftar deck contoh hanya bisa diubah oleh pemilik repository — tidak ada jalur
  bagi pengguna untuk mengirim deck ke situs, jadi tidak perlu moderasi

### v2.1 — 7 Agustus 2026
- **Validasi aturan deck** di panel: memperingatkan kalau deck memakai lebih dari
  2 warna, ada kartu melebihi batas salinan, atau jumlah kartu melewati target.
  Menampilkan konfirmasi hijau kalau deck sudah sah
- **Filter trait**: dropdown 16 trait (Avengers, Machine, GOTG, Asgard, Wakanda,
  Hydra, Mutant, Fantastic Four, S.H.I.E.L.D., dll)
- **Filter mekanik**: 8 tombol cepat berdasarkan pola pada teks efek kartu —
  Prune (30 kartu), Counter (22), BATTLE-BASE move (18), Pasang (15),
  Kartu tertutup (24), Trigger RETREAT (28), Tarik kartu (16), Turunkan Power (14).
  Bisa dikombinasikan dengan filter lain
- **Statistik deck diperluas**: rata-rata Level, rata-rata Power, total Power,
  jumlah kartu unik, sebaran jarak serangan (R-0 s/d R-4), dan 8 trait terbanyak

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
- [ ] Impor deck dari teks (pasangan dari "Salin daftar deck")
- [ ] Navigasi ◀ ▶ / panah keyboard di dalam popup kartu
- [ ] Duplikat deck untuk mencoba variasi
- [ ] Filter bar yang bisa dilipat di layar HP
- [ ] Gambar kartu resolusi lebih tinggi (>450 px) untuk hasil unduhan lebih tajam
- [ ] Pelacakan koleksi kartu yang dimiliki (pekerjaan besar, perlu dipikirkan matang)
- [ ] Update database saat set kartu baru rilis
- [ ] Pertimbangkan Cloudflare Pages jika bandwidth mendekati batas
