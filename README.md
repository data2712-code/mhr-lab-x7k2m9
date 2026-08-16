# MHR Deck Lab

**Versi saat ini: v5.0** · 17 Agustus 2026

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

### Cara menambah teks / gambar bahasa Inggris

Gambar Inggris disimpan di `images/en/` dengan penamaan sama seperti versi
Indonesia (`BP01-001.jpg`, varian `BP01-001_MR.jpg`).

Untuk 16 kartu promo yang belum punya versi Inggris: begitu terbit, tambahkan
`nm_en` dan `e_en` pada entri kartunya di `index.html`, lalu unggah gambarnya
ke `images/en/`. Kartu itu otomatis ikut tampil di mode Inggris — tidak perlu
mengubah kode lain.

Menambah teks antarmuka baru: tambahkan satu baris di kamus `T` di dalam
`index.html` dengan format `kunci: ['teks Indonesia','English text']`, lalu
pakai `t('kunci')` di JavaScript atau `data-i18n="kunci"` di HTML.

### Cara menambah varian artwork (alternate art)

Kartu yang punya lebih dari satu rarity (33 kartu, butuh 40 berkas varian)
bisa dilengkapi gambar alternate art-nya. Penamaan berkas:

| | Contoh |
|---|---|
| Versi utama (rarity pertama pada daftar `ra`) | `images/BP01-001.jpg` |
| Varian | `images/BP01-001_MR.jpg`, `images/BP01-001_SEC.jpg` |

Akhiran memakai kode rarity persis seperti tertulis di database, huruf besar.
Daftar lengkap 40 berkas ada di `DAFTAR_VARIAN_ARTWORK.md`.

Tidak perlu lengkap sekaligus — unggah berapa pun yang sudah ada. Varian yang
berkasnya belum tersedia otomatis ditandai di aplikasi dan tidak bisa dipilih,
jadi tidak akan muncul gambar rusak.

`index.html` tidak perlu diubah saat menambah varian — cukup unggah gambarnya
ke folder `images/`.

### Cara menambah deck komunitas

1. Susun deck di aplikasi seperti biasa
2. Buka situs dengan `?admin=1` di belakang alamat, misal
   `https://data2712-code.github.io/mhr-lab-x7k2m9/?admin=1`
   (simpan sebagai bookmark agar tidak perlu mengetik ulang)
3. Buka tab **🏆 Deck Komunitas** → panel admin muncul di atas galeri deck
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

### Cara mengubah jadwal turnamen LGS

Buka `index.html` → Edit → `Ctrl+F` cari `const LGS`. Format tiap toko:

```javascript
  { nm:'Nama Toko', map:'https://maps.app.goo.gl/xxxx',
    hp:'628xxxxxxxxxx',                     // opsional — nomor WhatsApp toko
    wa:'https://chat.whatsapp.com/xxxx',    // opsional — link grup WhatsApp
    jd:[ {h:1, w:'19.00 - Selesai'} ] },
```

Field `hp` dan `wa` boleh dikosongkan atau dihapus — tombol "Chat toko" dan
"Grup WA" hanya muncul kalau field-nya ada. Nomor `hp` ditulis tanpa tanda `+`
dan tanpa spasi, contoh `6281234567890`.

`h` adalah hari: 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu, 7 Minggu.
Satu toko boleh punya beberapa jadwal — tambahkan objek lain di dalam `jd`.

Jangan lupa ubah `LGS_UPDATE` ke tanggal terakhir jadwal dicek, karena tanggal itu
ditampilkan ke pengunjung sebagai penanda seberapa baru datanya.

Jadwal saat ini (6 sesi/minggu):

| Hari | LGS | Jam |
|---|---|---|
| Senin | Ogre Gandaria Neverland | 19.00 – Selesai |
| Kamis | Invaders Board Game Station | 19.00 – Selesai |
| Jumat | Ogre Gandaria Neverland | On Demand |
| Sabtu | Global Hobiz Store | 13.00 – Selesai |
| Sabtu | TwoStompas | 15.00 – Selesai |
| Minggu | ONIC TCG Viridian Vault | 15.00 – Selesai |

### Statistik pengunjung (Cloudflare Web Analytics)

**Sudah aktif sejak v2.7.** Lihat datanya di https://dash.cloudflare.com →
**Analytics & Logs → Web Analytics**.

Yang tercatat: jumlah kunjungan, halaman yang dibuka, negara, jenis perangkat,
dan sumber trafik (termasuk berapa yang datang dari TikTok).

Tanpa cookie dan tidak melacak individu, jadi tidak perlu banner persetujuan cookie.

Catatan:
- Data butuh beberapa menit sampai muncul pertama kali
- Karena domainnya `github.io` (dipakai bersama), statistik hanya mencakup
  halaman di bawah path repository ini
- Untuk mematikan: hapus atau beri komentar pada tag `<script>` Cloudflare
  di akhir `index.html`
- GitHub Insights → Traffic **bukan** statistik situs — itu hanya kunjungan
  ke halaman repository

### Cara mengecek versi file

Nomor versi tercatat di tiga tempat, jadi mudah dipastikan file mana yang aktif:

| Lokasi | Cara melihat |
|---|---|
| Nama file kiriman | `mhr_deck_lab_public_v5.0.html` |
| Komentar di baris awal file | buka file dengan editor teks, atau `Ctrl+U` (view source) di browser |
| `<meta name="version">` | di dalam `<head>` |
| Pojok bawah situs | teks kecil `v5.0` di bawah disclaimer footer |

Kalau teks versi di footer tidak diinginkan, hapus baris `<div ...>v5.0</div>`
di dekat akhir `<footer>` — tidak memengaruhi fungsi apa pun.

Menambah gambar kartu: masuk ke folder `images` dulu, baru Upload files.
Nama file harus persis nomor kartu, huruf besar (`BP01-004.jpg`) — GitHub Pages
bersifat case-sensitive.

## Catatan teknis

| Hal | Keterangan |
|---|---|
| Sumber data kartu | API resmi `server.marvelherorush.com/marvel/card/list` (200 kartu) + 8 kartu Hero File SD01–SD04 dari scan kartu = **208 kartu** |
| Ukuran gambar kartu | lebar 450 px, ber-watermark SAMPLE, ±80–90 KB per file |
| Varian artwork | 40 berkas alternate art, penamaan `NOMOR_RARITY.jpg` (mis. `BP01-001_MR.jpg`) |
| Aturan deck | 50 kartu, maksimal 3 salinan per kartu, maksimal 2 warna (bisa diubah di panel) |
| Aturan draw awal | 6 kartu; mulligan = kembalikan ke bawah deck, ambil sejumlah sama dari atas, lalu kocok ulang. Resmi maks 1×, simulator dibebaskan berulang |
| Penyimpanan deck | localStorage, per browser per perangkat |
| Format link deck | `#d=1.<nama-base64url>.<kode kartu>` — versi 1 |
| Navigasi halaman | `#cards` (utama), `#build`, `#meta`, `#lgs`. `#d=` selalu diperiksa lebih dulu agar link deck lama tidak rusak |
| Batas GitHub Pages | Situs 1 GB, bandwidth 100 GB/bulan (soft limit) |
| Rem darurat | Settings → Pages → **Unpublish site** (reversibel) |
| Nama repository | diacak (`mhr-lab-x7k2m9`) agar link tidak mudah ditemukan; `robots.txt` melarang pengindeksan |

**Kode link deck:** 1 huruf seri + 3 digit nomor + jumlah (basis36).
Seri: `A`=BP01, `B`=PB01, `C`=EB01, `D`=TB01, `E`=SD01, `F`=SD02, `G`=SD03, `H`=SD04.
Angka versi di depan wajib dipertahankan — kalau format berubah, naikkan ke 2
dan tetap dukung pembacaan versi 1 agar link lama tidak rusak.

---

## Riwayat Update

### v5.0 — 17 Agustus 2026 · dua bahasa (ID / EN)
- **Pengalih bahasa 🌐 ID / EN** di header. Mengubah antarmuka, nama kartu, teks
  efek, dan gambar kartu sekaligus. Pilihan tersimpan per pengguna
- **Data Inggris resmi** digabungkan dari API (`language=en`): 192 kartu karakter,
  semuanya cocok persis dengan database — tidak ada satu pun selisih level,
  jarak, maupun power
- **192 gambar kartu Inggris + 41 varian artwork** di folder `images/en/`
- **16 kartu promo** (PB01, EB01, TB01) otomatis disembunyikan di mode Inggris
  karena versi Inggrisnya belum terbit. Datanya tetap tersimpan — begitu gambar
  dan teksnya tersedia, tinggal ditampilkan tanpa ubah kode
- **34 kartu RUSH POINT** dari data Inggris sengaja tidak dimasukkan: itu penanda
  skor, bukan kartu yang masuk deck
- BP01-061 kini tercatat punya varian MR (dari data Inggris)
- Pencarian bekerja di kedua bahasa sekaligus — mengetik istilah Indonesia
  maupun Inggris sama-sama menemukan kartunya

### v4.2 — 17 Agustus 2026
- Keterangan di layar simulasi: di permainan resmi mulligan **hanya boleh 1×**,
  sementara di simulator sengaja dibebaskan berulang agar bisa mencoba banyak
  kemungkinan pembukaan. Penanda merah muncul kalau mulligan sudah lebih dari sekali

### v4.1 — 17 Agustus 2026 · simulasi draw awal
- Tombol **🎴 Simulasi draw 6 kartu** di panel deck membuka layar simulasi
  pembukaan permainan dari deck yang sedang disusun
- **Mulligan sesuai aturan MHR**: kartu yang ditandai dikembalikan ke *bawah*
  deck, lalu diambil kartu baru sejumlah sama dari *atas* deck, kemudian deck
  dikocok ulang. Jumlah kartu di tangan selalu tetap 6
- **Tabel peluang** tiap kartu muncul di 6 kartu pembuka, dihitung dengan
  distribusi hipergeometrik — bukan hasil pengambilan acak, jadi angkanya eksak.
  Diverifikasi terhadap 50.000 simulasi acak: selisih di bawah 0,15 poin persen
- Ringkasan isi tangan: sebaran level dan komposisi warna
- Kartu di tangan dan di tabel peluang bisa diklik untuk melihat detailnya
- Peringatan otomatis kalau jumlah kartu deck belum sesuai target

### v4.0 — 17 Agustus 2026 · alat tinjau ulang deck
Ditujukan untuk alur kerja meninjau dan mengganti kartu setelah deck jadi.
- **Klik nama kartu di daftar deck** → popup kartu terbuka lengkap dengan gambar
  besar, stat, dan teks efeknya. Berfungsi di HP maupun laptop
- **Pratinjau melayang**: di perangkat berkursor, menyorot nama kartu di daftar
  deck langsung memunculkan gambar kartunya tanpa perlu klik. Posisinya menyesuaikan
  agar tidak keluar layar
- **Filter "★ Di deck"** — menampilkan hanya kartu yang sudah masuk deck, sehingga
  mudah meninjau ulang isi deck sambil tetap bisa mengatur jumlah salinannya
- **Kartu di layar "Lihat deck" bisa diklik** untuk membuka gambar besar. Layar
  deck tetap terbuka di belakang popup, jadi peninjauan tidak terputus

### v3.9 — 17 Agustus 2026
- 🔧 **Fix kritis:** halaman utama tidak memuat kartu sama sekali sampai pengguna
  membuka tab lain. Penyebabnya deklarasi `const isAdmin` ikut terhapus saat data
  dipindah ke `data.js` di v3.6, sehingga inisialisasi berhenti di tengah jalan
- Ditambah **jaring pengaman inisialisasi**: tiap langkah awal dijalankan terpisah,
  sehingga satu kegagalan tidak lagi membuat seluruh halaman kosong. Kesalahan
  dicatat di Console browser (F12) untuk memudahkan penelusuran
- Seluruh fitur diuji otomatis di lingkungan DOM tiruan sebelum dirilis:
  muat awal, navigasi 4 halaman, tambah kartu, batas 3 salinan, Lihat deck,
  pratinjau deck komunitas, filter, popup kartu, dan pemilih varian artwork

### v3.8 — 17 Agustus 2026
- 🔧 **Fix:** tombol **"Lihat deck"** di Deck Builder selalu memunculkan pesan
  "Deck masih kosong" walau decknya terisi. Penyebabnya regresi dari v3.6:
  fungsi `openDeckView` dipasang langsung sebagai penangan klik, sehingga browser
  meneruskan objek Event sebagai argumen dan objek itu dibaca sebagai isi deck
- Ditambah pengaman di dalam `openDeckView`: argumen yang bukan objek data deck
  biasa akan diabaikan, sehingga kesalahan serupa tidak terulang

### v3.7 — 17 Agustus 2026
- **Filter bisa dilipat di layar HP** (masukan komunitas: bar filter memakan
  terlalu banyak ruang layar). Yang tampil hanya kolom pencarian dan tombol
  **⚙ Filter**; sisanya muncul saat tombol ditekan
- Tombol Filter menampilkan **lencana jumlah filter aktif**, sehingga pengguna
  tetap tahu ada filter yang menyala walau menunya sedang dilipat
- Header lebih ringkas di HP: tiga penghitung (Kartu unik / Ditampilkan / Deck)
  disembunyikan karena informasinya sudah ada di lencana navigasi bawah
- Tampilan desktop tidak berubah sama sekali

### v3.6 — 16 Agustus 2026
- 🔧 **Fix penting:** deck komunitas dan jadwal LGS dipindah ke berkas terpisah
  **`data.js`**. Sebelumnya keduanya ditulis di dalam `index.html`, sehingga setiap
  kali `index.html` diperbarui, deck yang ditambahkan manual ikut hilang.
  Sekarang `data.js` tidak pernah ikut diganti
- 🔧 **Fix penting:** tombol **"Lihat visual"** pada deck komunitas (dan "Lihat saja"
  pada link deck) sebelumnya menimpa deck yang sedang disusun — judul yang tampil
  salah, dan deck pengguna bisa tertimpa isi deck komunitas saat penyimpanan
  otomatis berjalan. Pratinjau kini benar-benar terpisah dari deck aktif
- Nama variabel `DECK_CONTOH` diganti `DECK_KOMUNITAS` agar sesuai nama menunya
- Kalau `data.js` gagal dimuat, aplikasi tetap berjalan dengan daftar kosong

### Varian artwork batch 1 — 16 Agustus 2026
- **40 berkas alternate art** diunggah ke `images/` — melengkapi seluruh varian
  yang tercatat di database (33 versi MR + 7 versi SEC)
- Nama berkas ditentukan dari nomor kartu yang tercetak di tiap gambar, bukan dari
  urutan berkas asal, sehingga tidak ada risiko tertukar
- Gambar asal beresolusi 1559×2150 diseragamkan ke lebar 450 px agar konsisten
  dengan gambar kartu lain, lalu diberi watermark SAMPLE
- `index.html` tidak berubah — cukup unggah gambarnya

### v3.5 — 11 Agustus 2026
- **Dukungan varian artwork (alternate art)** — kartu dengan lebih dari satu
  rarity kini bisa dipilih versi gambarnya lewat popup kartu. Versi yang dipilih
  dipakai di seluruh halaman: daftar kartu, tampilan deck, dan unduhan gambar HD
- Pilihan tersimpan per pengguna di browser (`store.art`), jadi tiap orang bisa
  menampilkan versi yang mereka miliki sendiri
- **Aturan deck tidak terpengaruh** — varian tidak dihitung terpisah, batas
  3 salinan tetap berlaku per nomor kartu apa pun versinya
- **Format link deck tidak diubah** — link yang sudah tersebar di komunitas tetap
  berfungsi. Pilihan artwork bersifat preferensi tampilan pribadi, tidak ikut di link
- Tombol varian yang berkas gambarnya belum ada otomatis ditandai tidak tersedia,
  sehingga gambar rusak tidak menyebar ke tampilan atau unduhan deck

### v3.4 — 11 Agustus 2026
- Menu **Deck Meta** diganti namanya menjadi **Deck Komunitas** (di HP: "Komunitas"),
  termasuk judul halaman dan teks pendukungnya. Ikon 🏆 tetap
- Nama teknis tidak diubah: `#meta`, `data-page="meta"`, `id="metaPage"`,
  `renderMeta`, dan sejenisnya tetap sama, jadi bookmark `#meta` tetap berfungsi

### Perbaikan data gambar — 10 Agustus 2026
- 🔧 **Fix:** file `images/EB01-007.jpg` dan `images/EB01-009.jpg` tertukar
  (EB01-007 = Spiritual Resonance Vision, EB01-009 = Take on Two Winter Soldier).
  Hanya file gambarnya yang salah nama — data kartu di database sudah benar
- Audit menyeluruh 200 gambar dilakukan dengan membaca nomor tercetak di pojok
  tiap kartu: tidak ada pasangan lain yang tertukar

> Catatan: tanggal pada versi v1.0–v3.0 adalah perkiraan dari urutan pengerjaan,
> bukan catatan waktu yang tercatat otomatis. Silakan koreksi kalau ada yang keliru.

### v3.3 — 10 Agustus 2026
- Keterangan di halaman Turnamen: imbauan **menghubungi toko langsung** untuk
  konfirmasi jadwal, format, dan biaya ikut, serta anjuran **gabung grup WhatsApp
  komunitas tiap toko** karena pengumuman biasanya lewat sana lebih dulu
- Field opsional **`hp`** (nomor WhatsApp toko) dan **`wa`** (link grup WhatsApp)
  pada data LGS — tombol "Chat toko" dan "Grup WA" otomatis muncul kalau diisi,
  dan tidak ditampilkan kalau dikosongkan

### v3.2 — 10 Agustus 2026
- **Tab baru 📅 Turnamen** — jadwal weekly tournament Marvel Hero Rush di 5 Local
  Game Shop area Jakarta (6 sesi per minggu), dengan tautan Google Maps tiap toko
- Panel **"Hari ini"** otomatis menyorot jadwal sesuai hari saat halaman dibuka;
  kalau hari itu kosong, diberi keterangan dan diarahkan ke daftar hari lain
- Kartu per hari diurutkan mulai dari hari ini, hanya menampilkan hari yang ada
  jadwalnya. Ditambah daftar ringkas per toko
- Label navigasi memakai versi pendek di layar HP agar empat tab tetap nyaman
- Catatan tanggal pembaruan jadwal dan imbauan konfirmasi ke toko sebelum datang

### v3.1 — 10 Agustus 2026
- **8 kartu baru** dari Starter Deck: seri Hero File nomor 012 dan 013 di
  SD01–SD04. Total database kini **208 kartu**
  - SD01-012 Iron Man (Lv6 R-2 6000) · SD01-013 Hulk (Lv3 R-1 4500)
  - SD02-012 Thor (Lv3 R-4 2500) · SD02-013 Vision (Lv2 R-3 2500)
  - SD03-012 Captain America (Lv4 R-1 5500) · SD03-013 Falcon (Lv3 R-2 3500)
  - SD04-012 Ant-Man (Lv3 R-0 5500) · SD04-013 Hawkeye (Lv5 R-5 3500)
- Semuanya kartu tanpa teks efek (vanilla)
- Grafik sebaran jarak serangan di panel deck diperluas ke **R-5**, karena
  Hero File Hawkeye memperkenalkan jarak baru yang sebelumnya belum ada

### v3.0 — 7 Agustus 2026 · restrukturisasi navigasi
- **Tiga halaman terpisah** dengan navigasi tab (di HP menjadi bilah bawah):
  - 🃏 **Kartu** — halaman utama, database kartu tanpa panel deck sehingga grid
    memakai seluruh lebar layar dan gambar kartu tampil lebih besar
  - 🛠 **Deck Builder** — daftar kartu + panel deck bersebelahan seperti sebelumnya
  - 🏆 **Deck Meta** — galeri deck komunitas
- **Halaman Deck Meta** menggantikan tombol ★: kartu deck lebih besar dengan strip
  pratinjau 4 kartu Lv tertinggi, bar komposisi warna, statistik, kredit pembuat,
  dan filter berdasarkan kombinasi warna
- Navigasi lewat hash (`#cards`, `#build`, `#meta`) sehingga tiap halaman bisa
  di-bookmark, dan tombol maju/mundur browser berfungsi
- **Link deck lama tetap aman** — `#d=` diperiksa lebih dulu sebelum navigasi
  halaman diproses, lalu otomatis membuka Deck Builder
- Panel admin pembuat kode deck meta dipindah ke halaman Deck Meta
- Penghitung jumlah kartu hasil filter dan jumlah kartu di deck tampil di tab

### v2.7 — 7 Agustus 2026
- **Cloudflare Web Analytics aktif** — statistik pengunjung mulai tercatat,
  tanpa cookie dan tanpa pelacakan individu

### v2.6 — 7 Agustus 2026
- Blok **Cloudflare Web Analytics** disiapkan di akhir `index.html`, masih
  dinonaktifkan (dikomentari). Tinggal tempel token dan buang tanda komentar
  untuk mengaktifkan — lihat bagian "Statistik pengunjung" di bawah

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
