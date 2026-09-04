# MHR Deck Lab

**Versi saat ini: v6.27** · 4 September 2026

Deck builder web untuk **Marvel Hero Rush TCG** — versi Indonesia.
Dibuat karena belum ada deck builder resmi untuk game ini.

🔗 **Live:** https://mhrdecklab.com/ *(domain kustom, aktif sejak 2 September 2026 —
URL GitHub Pages lama `https://data2712-code.github.io/mhr-lab-x7k2m9/` otomatis
redirect ke domain ini, dikonfirmasi)*
📱 **TikTok:** [@deteprtm](https://www.tiktok.com/@deteprtm)

> Fan-made, tidak berafiliasi dengan atau disponsori oleh Marvel maupun penerbit
> Marvel Hero Rush. Seluruh nama kartu, teks efek, dan artwork adalah milik
> pemegang haknya masing-masing. Gambar kartu menggunakan versi ber-watermark SAMPLE.

**Catatan izin (internal, tidak ditampilkan di situs).** Penggunaan gambar kartu
telah mendapat izin **dengan syarat setiap gambar diberi watermark SAMPLE** —
syarat ini wajib dipatuhi untuk semua batch gambar di masa depan, termasuk set baru.
Donasi juga diperbolehkan **sebatas biaya pengembangan** untuk membantu komunitas
menyusun deck dan mempermudah pemain baru. Di luar itu (iklan berbayar, fitur
berlangganan, penjualan gambar) belum tercakup dan perlu izin terpisah.
Simpan bukti tertulis izinnya beserta nama pemberi dan tanggalnya.

---

## Struktur file

```
mhr-lab-x7k2m9/
├── index.html        ← seluruh aplikasi (HTML + CSS + JS)
├── cards.js           ← database 208 kartu — diganti tiap ada set kartu baru
├── data.js             ← deck komunitas, hasil turnamen (sejak v6.26), jadwal LGS, dukungan — diedit sendiri pemilik
├── manifest.json    ← PWA: nama, ikon, warna tema (sejak v6.6)
├── sw.js                 ← PWA: service worker, cache offline (sejak v6.6)
├── icons/               ← ikon PWA berbagai ukuran (sejak v6.6)
├── og-image.jpg      ← gambar preview saat link dibagikan
├── CNAME                 ← domain kustom GitHub Pages, isi: mhrdecklab.com (sejak 2 September 2026)
├── sitemap.xml           ← SEO: sitemap untuk Google Search Console (sejak v6.21)
├── robots.txt            ← SEO: izinkan semua crawler + rujuk ke sitemap.xml (sejak v6.21)
└── images/ · images/en/  ← gambar kartu, nama = nomor kartu (BP01-001.jpg)
```

Aplikasi ini sepenuhnya statis — tanpa server, tanpa database, tanpa akun.
Semua data deck tersimpan di browser pengguna (localStorage).

## Cara update

1. Edit / ganti `index.html`
2. Repository → **Add file → Upload files** → drop file → **Commit changes**
3. Tunggu 1–2 menit, buka situs dengan `?v=` angka baru untuk melewati cache
4. Perbarui bagian **Riwayat Update** di README ini

> **Aturan tetap proyek ini — berlaku untuk sesi Claude mana pun, kapan pun:**
> **setiap** perubahan atau pembaruan, sekecil apa pun — baik `index.html`, `cards.js`,
> `data.js` saja, atau cuma teks — **wajib** dicatat sebagai entri baru di § **Riwayat
> Update** di bawah, lengkap dengan tanggal dan apa yang berubah. Ini supaya kalau
> percakapan dipindah ke sesi/obrolan baru (tanpa akses ke riwayat chat sebelumnya),
> Claude di sesi itu tetap bisa membaca **seluruh riwayat perubahan proyek ini cukup
> dari file ini saja**. Jangan pernah melewatkan langkah ini walau perubahannya terasa
> kecil atau "tidak penting dicatat".

### Cara menambah set kartu baru

Sejak v5.2 data kartu ada di `cards.js`, terpisah dari aplikasi. Untuk menambah set:
ganti `cards.js` saja — `index.html` tidak perlu disentuh. Format tiap entri
dijelaskan di komentar kepala berkas itu.

### Dukungan sukarela (Saweria / Trakteer / Ko-fi)

Tambahkan satu baris ini di `data.js` — bukan di `index.html`:

```javascript
window.DUKUNG = {
  url:   'https://saweria.co/data2712',
  label: 'Saweria',
  teks: {
    id: 'Kalimat ajakan dalam Bahasa Indonesia…',
    en: 'The English version of the message…'
  }
};
```

Field `teks` opsional. Kalau dikosongkan, dipakai kalimat bawaan. Boleh juga
berupa teks biasa (satu bahasa saja).

Tombol "☕ Dukung" akan muncul di header dan keterangan di footer. Kalau baris ini
tidak ada atau URL-nya bukan `https://`, tombolnya tidak ditampilkan sama sekali —
jadi aman dibiarkan kosong sampai akunnya siap.

Untuk mematikan sementara, cukup beri komentar pada barisnya (`// window.DUKUNG = ...`).

### Backup & Restore

Tombol **💾 Backup** di panel deck mengunduh berkas
`mhr-deck-lab-backup-YYYY-MM-DD.json` berisi semua deck, pilihan varian artwork,
dan pengaturan. **📂 Restore** memulihkannya di perangkat mana pun.

Perlu diketahui: ini **menyalin, bukan menyinkronkan**. Setelah restore, kedua
perangkat berjalan terpisah — perubahan di satu sisi tidak otomatis kembali ke sisi
lain. Sinkronisasi dua arah butuh backend.

### Versi bahasa Inggris (untuk Singapura / Malaysia / Thailand)

Sejak v6.2 seluruh antarmuka yang dilihat pengunjung sudah dua bahasa penuh.

**Cara bahasa ditentukan**, berurutan:

1. Parameter **`?lang=en`** atau **`?lang=id`** di alamat — pilihan ini ikut tersimpan
2. Pilihan yang pernah ditekan pengguna di perangkat itu (tombol 🌐 di header)
3. **Bahasa browser** — kalau bukan Bahasa Indonesia, situs langsung tampil Inggris

Link untuk dibagikan ke komunitas berbahasa Inggris:

```
https://data2712-code.github.io/mhr-lab-x7k2m9/?lang=en
```

Bisa juga digabung dengan hash halaman, mis. `?lang=en#build` untuk langsung membuka
Deck Builder. Untuk link di bio TikTok, pakai versi `?lang=en` kalau audiens yang dituju
pemain luar negeri.

**Mode Inggris sengaja dibuat sederhana: hanya dua menu — Cards dan Deck Builder.**

| Hal | Perilaku |
|---|---|
| Menu | hanya **Cards** dan **Deck Builder**. Tab **Community Deck**, **Tournaments** (sejak v6.26), dan **Hero Base** tidak ditampilkan, karena isinya konten komunitas Indonesia (nama deck berbahasa Indonesia, label peringkat turnamen, jadwal LGS Indonesia) |
| Alamat `#meta` / `#tourney` / `#lgs` | otomatis dialihkan ke halaman Cards, jadi tidak ada halaman kosong |
| Database | 192 kartu — 16 kartu promo (PB01/EB01/TB01) disembunyikan karena versi Inggrisnya belum terbit |
| Gambar | dari `images/en/`, otomatis jatuh ke `images/` kalau berkasnya belum ada |
| Link deck yang dibagikan | tetap berfungsi penuh — langsung membuka Deck Builder beserta kotak "Save as my deck" |
| Judul tab & preview link | `<title>` dan meta description ikut bahasa aktif |
| Decklist PDF | seluruh label ikut bahasa aktif |

**Mode admin dikecualikan:** dengan `?admin=1`, tab Community Deck tetap terlihat walau
bahasanya Inggris — supaya pembuat kode deck tidak terkunci. Kalau nanti Community Deck
ingin dibuka untuk pengunjung Inggris, cukup ubah satu baris di `applyLang`
(objek `sembunyi`), dan siapkan nama deck versi Inggris kalau perlu. Tab **Tournaments**
(sejak v6.26) **tidak** punya pengecualian admin ini — halaman itu tidak punya panel
admin/generator kode sama sekali (isinya cuma ditempel manual pemilik ke `data.js`,
sama seperti Hero Base), jadi selalu ikut aturan yang sama dengan Hero Base.

**Yang sengaja tetap Bahasa Indonesia:** panel mode admin (pembuat kode deck komunitas
dan cetak kartu proxy), serta halaman Community Deck, Tournaments, dan Hero Base —
keempatnya memang hanya tampil di mode Indonesia (Community Deck: kecuali mode admin).

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

### Ekspor lembar decklist (PDF teks)

Tombol **📄 Decklist PDF** di panel deck — **untuk semua pengguna**, bukan admin saja.
Menghasilkan berkas `decklist-<nama deck>.pdf` berisi teks saja (tanpa gambar), jadi
ukurannya hanya beberapa KB dan enak dicetak di printer hitam-putih.

Isi lembarnya, mengikuti gaya lembar decklist turnamen:

1. Kop **MHR DECK LAB** beserta tanggal cetak
2. Nama deck + ringkasan: total kartu, komposisi warna, rata-rata Lv, dan status
   terhadap target ukuran deck
3. Kotak **Kode Deck** — kode dari fitur "Salin link deck", jadi decknya bisa dibuka
   ulang di Deck Lab hanya dari lembar cetaknya
4. Blok **Data Pemain** yang kosong untuk diisi tulisan tangan: Nama Pemain, Tanggal,
   Kontak / WhatsApp, Nama Event, LGS / Tempat, dan Tanda Tangan
5. Tabel kartu **dikelompokkan per warna** dengan kolom Nama Kartu · Seri · Nomor · Lv ·
   Jumlah, ditutup **Subtotal** tiap warna dan **Total** keseluruhan
Kaki halaman sengaja dibiarkan bersih. Nomor halaman hanya ditulis kalau lembarnya
lebih dari satu, supaya urutannya tidak tertukar saat dicetak.

Deck 50 kartu dengan ~21 jenis kartu masih muat satu halaman A4; kalau kartunya lebih
banyak, tabelnya otomatis lanjut ke halaman berikutnya dengan nama deck dan kepala
kolom yang diulang.

Isinya mengikuti **bahasa aktif** (ID/EN), termasuk nama kartu. Karena PDF memakai font
standar, karakter di luar Latin-1 diganti otomatis — mis. nama Inggris `「Top Agent」Black
Widow` dicetak `"Top Agent" Black Widow`, dan emoji pada nama deck dibuang.

Sama seperti cetak proxy, library **jsPDF** dimuat dari CDN hanya saat tombolnya diklik.

> Tombol **Salin daftar** dihapus di v5.8 — **Salin tabel** sudah mencakup kebutuhannya,
> dan untuk versi cetak kini ada Decklist PDF.

### Cetak kartu proxy (khusus mode admin)

Fitur ini **hanya ada di mode admin** — pengunjung biasa tidak melihat tombol
maupun panelnya. **Ini keputusan bisnis pemilik yang disengaja, bukan batasan
teknis sementara** (dikonfirmasi ulang 3 September 2026): membuka akses cetak
proxy ke semua pengunjung berisiko membuat orang berhenti membeli booster pack
Marvel Hero Rush resmi, yang bisa jadi sentimen negatif ke distributor. Pemilik
bilang suatu saat mungkin dibuka ke publik, tapi belum tahu kapan — jangan
diusulkan atau didorong sebagai "pekerjaan tertunda" kecuali pemilik sendiri
yang mengangkat topiknya lagi.

1. Buka situs dengan `?admin=1`, misal
   `https://data2712-code.github.io/mhr-lab-x7k2m9/?admin=1`
2. Susun deck di tab **🛠 Deck Builder** seperti biasa
3. Di **panel deck**, paling bawah (di bawah tombol Backup/Restore), muncul kotak
   **Mode admin — cetak kartu proxy** → klik **🖨 Cetak kartu proxy (PDF)**
4. Daftar cetak otomatis terisi dari deck aktif. Bisa disesuaikan: **+ / − / ✕** per
   kartu, cari kartu lain di kolom pencarian, atau **↺ Muat dari deck aktif**
5. Klik **⬇ Buat PDF** → berkas `proxy-<nama deck>.pdf` terunduh

Spesifikasi hasil cetak:

| Hal | Nilai |
|---|---|
| Kertas | A4 210 × 297 mm, potret |
| Ukuran kartu | 63 × 88 mm (ukuran standar TCG, pas masuk sleeve) |
| Per halaman | 9 kartu (grid 3 × 3), otomatis terpusat |
| Margin | 8,5 mm samping · 14,5 mm atas–bawah (pada jarak antar kartu 2 mm) |

Empat opsi sebelum PDF dibuat:

- **Garis potong** — tanda potong tipis di area margin saja, tidak menimpa gambar kartu
- **Jarak antar kartu** — 0 / 2 / 4 mm; makin lega makin mudah dipotong
- **Kartu tanpa gambar dicetak sebagai kartu teks** — berisi nama, level, jarak, power,
  trait, dan teks efek, jadi tetap bisa dipakai bermain. Kalau dimatikan, kartu itu
  dilewati dan jumlahnya dilaporkan
- **Catatan kecil di kaki halaman** — keterangan "proxy SAMPLE (bukan kartu resmi)",
  nama deck, dan nomor halaman

**Sumber gambar** mengikuti bahasa aktif dan pilihan varian artwork, dengan urutan
cadangan: varian pilihan → versi utama bahasa aktif → versi Indonesia → `.png`/`.webp`.
Jadi kalau gambar Inggris atau variannya belum ada, yang dipakai gambar Indonesia versi
utama, bukan kartu teks.

**Penting saat mencetak:** di dialog print pilih skala **100% / "Ukuran asli"**, jangan
"Fit to page" — kalau tidak, ukurannya menyusut beberapa milimeter dan tidak lagi pas
dengan kartu asli. Pengingat ini juga tertulis di dalam panelnya.

Catatan teknis: pembuat PDF memakai library **jsPDF** dari CDN
(`cdnjs.cloudflare.com`), dimuat **hanya saat tombol Buat PDF diklik** — pengunjung biasa
tidak pernah mengunduhnya, jadi kecepatan muat halaman tidak berubah. Konsekuensinya:
fitur ini butuh koneksi internet saat dipakai.

Seperti panel admin lain, `?admin=1` hanya **menyembunyikan dari tampilan**, bukan
pengamanan. Itu memadai: panel ini tidak punya kuasa apa pun atas situs — dia hanya
menyusun PDF dari gambar yang memang sudah publik di folder `images/`.

### Cara menambah deck komunitas

1. Susun deck di aplikasi seperti biasa
2. Buka situs dengan `?admin=1` di belakang alamat, misal
   `https://data2712-code.github.io/mhr-lab-x7k2m9/?admin=1`
   (simpan sebagai bookmark agar tidak perlu mengetik ulang)
3. Buka tab **🏆 Community Deck** → panel admin muncul di atas galeri deck
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

**Kalau kode datang dari pengunjung (fitur submission, sejak v6.18):** tab
🏆 Community Deck punya kotak "Kirim deck kamu" yang terlihat untuk semua
pengunjung. Kotak itu memvalidasi deck (harus pas 50 kartu, aturan warna/salinan
terpenuhi) dan mewajibkan nama pembuat, lalu menghasilkan kode dengan format
**persis sama** seperti langkah 4–6 di atas. Pengunjung mengirim kode itu lewat
DM TikTok [@deteprtm](https://tiktok.com/@deteprtm) **atau email ke
`dataanggi2712@yahoo.co.id`** (kanal email ditambahkan di v6.19 — link `mailto:`
di kotak submission sudah otomatis mengisi subjek & placeholder isi pesan) — dari
situ alurnya sama seperti deck buatan sendiri: tinjau, lalu tempel manual ke
`DECK_KOMUNITAS` lewat langkah 5–6. Tidak ada jalur otomatis yang langsung
mengubah `data.js` — validasi di kotak submission cuma memastikan formatnya
benar, bukan menggantikan peninjauan pemilik.

### Cara menambah hasil turnamen (Tournaments, sejak v6.26)

Beda dengan Community Deck, tab **🥇 Tournaments** **tidak punya panel admin atau
kotak submission** — isinya turnamen resmi saja, jadi selalu ditempel manual oleh
pemilik ke `window.TOURNAMENTS` di `data.js`.

1. Susun tiap deck Top-N di aplikasi seperti biasa (mode `?admin=1` untuk membuat
   kodenya lewat tab Community Deck — langkah "Buat kode dari deck aktif" yang
   sama seperti menambah deck komunitas di atas, kodenya format persis sama)
2. Di GitHub: buka `data.js` → ikon **pensil** (Edit)
3. Kalau turnamennya baru (belum ada event-nya), tambah satu objek baru di dalam
   `window.TOURNAMENTS`; kalau menambah deck ke turnamen yang sudah ada, cukup
   sisipkan entri baru di dalam `top[]`-nya

Format satu event turnamen:

```javascript
{
  nama: 'Nama Turnamen',
  tanggal: '30 Agustus 2026',
  lokasi: 'Kota / tempat venue',
  penyelenggara: 'Nama panitia/toko/komunitas penyelenggara',
  sumber: 'https://...',   // link postingan resmi hasil turnamen (opsional)
  top: [
    { pk:'Juara 1', nm:'Merah - Hijau', cr:'', ds:'', cd:'1.<kode dari link deck>' },
    { pk:'Juara 2', nm:'Kuning - Biru', cr:'', ds:'', cd:'1.<kode dari link deck>' },
  ]
}
```

`pk` = label peringkat yang tampil sebagai lencana kecil di kartu deck — teks
bebas ("Juara 1", "Runner-up", "Semifinalis", dst). `cr` = nama pemain/pembuat
**kalau** diketahui dari sumber resmi — kosongkan (`''`) kalau tidak ada
datanya, jangan ditebak. `sumber` boleh dikosongkan (`''` atau dihapus
barisnya) kalau tidak ada link post resmi — link "Sumber" otomatis tidak
ditampilkan.

Menghapus satu deck: hapus entrinya di dalam `top[]`. Menghapus satu turnamen:
hapus satu objek event-nya. Commit changes seperti biasa.

### Cara mengubah jadwal Weekly Rush LGS

Semua jadwal ada di **`data.js`** (bukan `index.html`), jadi aman saat aplikasi
diperbarui. Format tiap toko:

```javascript
  { nm:'Nama Toko', kota:'Batam', tz:'WIB',
    map:'https://maps.app.goo.gl/xxxx',
    hp:'628xxxxxxxxxx',                     // opsional — nomor WhatsApp toko
    wa:'https://chat.whatsapp.com/xxxx',    // opsional — link grup WhatsApp
    jd:[ {h:1, w:'19.30 - Selesai'} ] },
```

| Field | Keterangan |
|---|---|
| `nm` | nama toko |
| `kota` | kota tempat toko berada — dipakai untuk lencana kota dan baris filter |
| `tz` | zona waktu: `WIB` (UTC+7), `WITA` (UTC+8), atau `WIT` (UTC+9) |
| `map` | tautan Google Maps (`maps.app.goo.gl` atau `share.google` sama saja) |
| `hp`, `wa` | opsional — tombol "Chat toko" dan "Grup WA" muncul kalau diisi |
| `jd` | daftar jadwal; `h` = hari, `w` = jam main |

`h` adalah hari: 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu, 7 Minggu.
Satu toko boleh punya beberapa jadwal — tambahkan objek lain di dalam `jd`.

**Zona waktu tidak perlu diketik di `w`.** Cukup tulis jamnya (`'19.30 - Selesai'`);
aplikasi menyisipkan sendiri kode zonanya dari field `tz` sehingga tampil menjadi
`19.30 WIB - Selesai`. Teks tanpa angka jam (mis. `'On Demand'`) dibiarkan apa adanya.

**Filter kota muncul otomatis** begitu ada lebih dari satu kota di daftar. Kalau semua
toko berada di satu kota, baris filternya tidak ditampilkan sama sekali.

Jangan lupa ubah `LGS_UPDATE` ke tanggal terakhir jadwal dicek, karena tanggal itu
ditampilkan ke pengunjung sebagai penanda seberapa baru datanya.

Jadwal saat ini — **18 toko, 24 sesi/minggu, 8 kota**:

| Hari | LGS | Kota | Jam |
|---|---|---|---|
| Senin | Ogre Gandaria Neverland | Jakarta | 19.00 WIB – Selesai |
| Senin | Royal Knight Bekasi | Bekasi | 19.30 WIB – Selesai |
| Senin | Gattchaa One Batam Mall | Batam | 19.30 WIB – Selesai |
| Selasa | Papa Roger | Bekasi | 19.30 WIB – Selesai |
| Selasa | Monopolis | Bekasi | 19.00 WIB – Selesai |
| Selasa | Exordium TCG | Medan | 19.00 WIB – Selesai |
| Rabu | Global Hobiz Store | Jakarta | 19.30 WIB – Selesai |
| Rabu | House of Cards | Batam | 19.00 WIB – Selesai |
| Kamis | TwoStompas | Jakarta | 19.00 WIB – Selesai |
| Kamis | Invaders Board Game Station | Tangerang | 19.00 WIB – Selesai |
| Jumat | Ogre Gandaria Neverland | Jakarta | 19.00 WIB – Selesai |
| Jumat | Sultan Pokebab | Jakarta | 19.30 WIB – Selesai |
| Jumat | Alex Hobby Shop | Tangerang | 20.00 WIB – Selesai |
| Jumat | Gale Force Games | Batam | 19.00 WIB – Selesai |
| Jumat | Savepoint | Depok | 19.30 WIB – Selesai |
| Sabtu | Global Hobiz Store | Jakarta | 13.00 WIB – Selesai |
| Sabtu | TwoStompas | Jakarta | 15.00 WIB – Selesai |
| Sabtu | Gattchaa Mega Mall Batam Center | Batam | 17.30 WIB – Selesai |
| Minggu | ONIC TCG Viridian Vault | Jakarta | 15.00 WIB – Selesai |
| Minggu | Catnie Hobbies & Games | Tangerang Selatan | 14.00 WIB – Selesai |
| Minggu | Savepoint | Depok | 16.00 WIB – Selesai |
| Minggu | Exordium TCG | Medan | 14.00 WIB – Selesai |
| Minggu | Gale Force Games | Batam | 16.00 WIB – Selesai |
| Minggu | Arnando Garage | Bali | 18.00 WITA – Selesai |

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
| Nama file kiriman | `mhr_deck_lab_public_v6.19.html` |
| Komentar di baris awal file | buka file dengan editor teks, atau `Ctrl+U` (view source) di browser |
| `<meta name="version">` | di dalam `<head>` |
| Pojok bawah situs | teks kecil `v6.19` di bawah disclaimer footer |

Kalau teks versi di footer tidak diinginkan, hapus baris `<div ...>v6.19</div>`
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
| Aturan deck | 50 kartu, maksimal 3 salinan **per nama karakter**, maksimal 2 warna (101.1) |
| Rush Deck | 9 Rush Card, tanpa batasan pilihan (101.2) — tidak dikelola di Deck Lab |
| Warna yang ada | Merah, Kuning, Biru, Hijau, **Orange, Purple** (201.5.b) — dua terakhir belum terbit |
| Aturan draw awal | 6 kartu; mulligan = kembalikan ke bawah deck, ambil sejumlah sama dari atas, lalu kocok ulang. Resmi maks 1×, simulator dibebaskan berulang |
| Penyimpanan deck | localStorage, per browser per perangkat |
| Format link deck | `#d=1.<nama-base64url>.<kode kartu>` — versi 1 |
| Navigasi halaman | `#cards` (utama), `#build`, `#meta`, `#tourney` (sejak v6.26), `#lgs`, `#panduan`. `#d=` selalu diperiksa lebih dulu agar link deck lama tidak rusak |
| Batas GitHub Pages | Situs 1 GB, bandwidth 100 GB/bulan (soft limit) |
| Rem darurat | Settings → Pages → **Unpublish site** (reversibel) |
| Nama repository | diacak (`mhr-lab-x7k2m9`) — sisa dari fase uji coba awal, sekarang cuma kosmetik karena `robots.txt` sudah dihapus (situs boleh diindeks penuh, lihat § Riwayat Update 2 September 2026) |

**Kode link deck:** 1 huruf seri + 3 digit nomor + jumlah (basis36).
Seri: `A`=BP01, `B`=PB01, `C`=EB01, `D`=TB01, `E`=SD01, `F`=SD02, `G`=SD03, `H`=SD04.
Angka versi di depan wajib dipertahankan — kalau format berubah, naikkan ke 2
dan tetap dukung pembacaan versi 1 agar link lama tidak rusak.

---

## Riwayat Update

### v6.27 — analisis "Kartu paling sering dipakai" di halaman Tournaments — 4 September 2026
Permintaan pemilik: tampilkan analisis persentase kartu apa saja yang paling
sering/banyak dipakai dari deck-deck Top turnamen, ditampilkan langsung di
bagian turnamen terkait.

- **Dihitung otomatis, BUKAN data yang ditulis manual.** Fungsi baru
  `tourneyCardUsage(ev)` menghitung ulang setiap kali `renderTourney()` jalan:
  untuk tiap event, semua deck di `ev.top` di-decode lewat `decodeDeck()` yang
  sama (tidak ada parser baru), lalu dihitung `deckCount` (berapa deck yang
  memakai kartu itu) dan `copies` (total salinan dijumlah semua deck). Karena
  ini turunan murni dari `event.top[].cd` yang sudah ada, **pemilik tidak
  perlu menulis apa pun tambahan** ke `data.js` — kalau suatu saat menambah
  atau mengurangi deck Top di satu event, angka analisisnya otomatis ikut
  berubah di kunjungan berikutnya, tidak perlu dihitung ulang manual.
- **Tampilan**: kartu panel baru (`.tny-analysis`) muncul di bawah grid deck
  tiap event, judul "📊 Kartu paling sering dipakai", berisi sampai 10 baris
  teratas — tiap baris: peringkat, thumbnail kecil kartu, nama kartu, bar
  persentase (warna sesuai warna kartu), dan teks "X/Y deck (Z%) · N salinan".
  Diurutkan: paling banyak deck memakainya dulu, lalu paling banyak salinan,
  lalu abjad. Kalau suatu event cuma punya kurang dari 2 deck valid, panel ini
  otomatis disembunyikan (persentase dari 1 deck tidak bermakna).
- **Untuk turnamen Multiverse Battle** (4 deck Top 4): 5 kartu teratas
  sama-sama dipakai di 3 dari 4 deck (75%) — 「Thunder Speed」Thor,
  「Covert Ops」Black Widow, 「Antimatter」Iron Man, 「Top Agent」Black Widow,
  「Disintegration Ray」Vision — tidak ada satu pun kartu yang dipakai di
  keempat deck sekaligus (0% pada 4/4), mencerminkan variasi warna deck Top 4
  yang cukup beragam (Merah-Hijau, Kuning-Biru, Merah-Biru).
- Fallback gambar khusus `tnyUsageImgFallback()` ditambahkan (beda dari
  `metaImgFallback()` yang ada) karena elemen pengganti saat gambar gagal
  dimuat bukan flex-item di dalam `.meta-strip`, jadi butuh ukuran tetap
  sendiri (32×32px, kelas `.tny-usage-thumb`).
- i18n baru: `tourneyUsageHead`/`tourneyUsageSub`/`tourneyUsageDeck`/
  `tourneyUsageCopy` di kamus `T` (ID & EN, walau halaman Tournaments sendiri
  tetap selalu disembunyikan di mode EN — ditambahkan untuk konsistensi
  dengan pola i18n yang sudah ada di seluruh kamus).
- **Verifikasi**: `node --check` pada blok `<script>` inline (lolos) + tes
  fungsional Playwright (render panel, 10 baris, persentase & jumlah salinan
  dicocokkan manual lewat perhitungan Python independen — hasilnya sama
  persis, nol console error asli).

### Revisi kecil Tournaments + insiden cache Cloudflare #2 — 4 September 2026 *(hanya `data.js`, tanpa naik versi kode)*
Tepat setelah v6.26 di-push pemilik:

- Pemilik minta field `penyelenggara` event Multiverse Battle disederhanakan
  dari "AZLN x CARDFUN x Marvel Hero Rush Indonesia" jadi cukup **"Marvel
  Hero Rush Indonesia"** — diubah langsung di `data.js`.
- Pemilik lapor menu Tournaments kosong ("belum muncul konten") di situs
  live. Diagnosis: `index.html` sudah benar v6.26 (menu Tournaments muncul),
  tapi `data.js` di edge Cloudflare masih versi lama (Edge TTL 4 jam) —
  fetch dengan cache-buster ke URL yang sama membuktikan datanya sudah benar
  di origin. Ini insiden cache Cloudflare basi **kedua** dengan pola persis
  sama seperti kejadian Arnando Garage (lihat entri "Tambahan jadwal — 4
  September 2026" di bawah) — bukan bug kode, bukan berarti push gagal.
  **Diperbaiki** dengan purge cache Cloudflare manual (teknik yang sama,
  lewat browser bawaan Claude dengan izin eksplisit pemilik) untuk `/`,
  `/index.html`, `/data.js`, `/cards.js`, `/manifest.json` — dikonfirmasi
  fixed lewat tes langsung di situs live (menu Tournaments menampilkan 1
  event, 4 deck, badge hitung "4", semua benar).

### v6.26 — menu baru Tournaments + Deck Komunitas berganti nama jadi Community Deck — 4 September 2026
Dua permintaan pemilik sekaligus:

1. **Rename menu "Deck Komunitas" → "Community Deck"** — label tab navigasi,
   judul halaman (`<h2>`), dan teks kotak submission diganti ke nama baru,
   dipakai identik di ID maupun EN (pola yang sama dengan branding **Hero
   Base** — nama tetap Inggris di kedua bahasa, bukan diterjemahkan berbeda).
   Variabel data `DECK_KOMUNITAS` di `data.js`/`index.html`, komentar kode,
   dan panel admin (Bahasa Indonesia, `?admin=1` saja) **sengaja tidak
   disentuh** — itu detail teknis internal, bukan nama yang tampil ke
   pengunjung, dan mengubahnya menambah risiko tanpa manfaat tampilan.

2. **Menu baru "Tournaments"** — halaman baru yang menampilkan deck-deck dari
   babak Top-N turnamen **resmi** Marvel Hero Rush (beda dengan Community
   Deck yang isinya deck buatan komunitas biasa). Tab baru ditaruh di antara
   Community Deck dan Hero Base di navigasi.
   - **Sumber data**: `window.TOURNAMENTS` array baru di `data.js` (pola
     persis sama dengan `DECK_KOMUNITAS`/`LGS` — dikelola manual oleh pemilik
     lewat editor GitHub, bukan lewat submission publik). Satu event turnamen
     berisi `nama`/`tanggal`/`lokasi`/`penyelenggara`/`sumber` (link post
     resmi) + daftar `top[]`, tiap deck di dalamnya punya `pk` (label
     peringkat, mis. "Juara 1"/"Semifinalis" — teks bebas), `nm`/`cr`/`ds`,
     dan `cd` (kode deck — format **persis sama** dengan tombol "Salin link
     deck" yang sudah dipakai Community Deck, jadi dipakai ulang
     `encodeDeck()`/`decodeDeck()` yang sama, tidak ada parser baru).
   - **Tampilan**: memakai ulang gaya kartu `.meta-*` (Community Deck) supaya
     visual konsisten se-situs — cuma menambah pembungkus per-event (nama
     turnamen, tanggal, lokasi, penyelenggara, link sumber) dan lencana kecil
     peringkat (`.tny-rank`) di tiap kartu deck. Tombol "Muat ke Deck
     Builder" dan "Lihat visual" bekerja sama persis dengan Community Deck
     (deck aktif yang sedang disusun pengunjung tidak pernah tertimpa).
   - **Dwibahasa**: halaman ini **selalu disembunyikan di mode EN** (tidak
     ada pengecualian admin seperti Community Deck), karena isinya konten
     komunitas Indonesia sepenuhnya (nama deck, label peringkat) dan tidak
     ada panel admin/submission di halaman ini yang perlu tetap bisa dibuka
     saat bahasanya Inggris — pola yang sama dengan Hero Base.
   - **Isi pertama**: turnamen **Multiverse Battle** (AZLN x CARDFUN x Marvel
     Hero Rush Indonesia, Gramedia Matraman, 30 Agustus 2026) dengan 4 deck
     Top 4 — Juara 1 (Merah-Hijau), Juara 2 (Kuning-Biru), dan dua Semifinalis
     (Merah-Biru, Merah-Hijau). Decklist ditranskripsi dari postingan
     Instagram resmi `@marvelherorush.id`, setiap kartu dicocokkan satu-per-
     satu ke `cards.js` (nama, kode cetak, level, rarity, power) — bukan
     tebakan OCR — dan tiap deck diverifikasi tepat 50 kartu tanpa pelanggaran
     maks-3-salinan. Detail metodologi lengkap + tabel per-kartu ada di
     project doc `2026-09-04-analisis-top4-gramedia-matraman-30-agustus-2026.md`
     (bukan bagian repo situs, cuma catatan riset). Dua nama kartu
     (`[MK44-The Brawler] Hulk Buster`, `[Freedom Watch/Watcher] New Captain
     America`) punya dua cetakan berstat identik di database — cetakan
     persisnya tidak bisa dipastikan dari foto sumber, dipilih salah satu
     yang stat-nya sama persis (tidak memengaruhi cara main deck).
   - **Verifikasi**: diuji headless (Playwright Chromium, harness yang sama
     dipakai sesi-sesi sebelumnya) — 4 kartu deck tampil dengan lencana
     peringkat & total 50 kartu benar, tombol "Muat ke Deck Builder" dan
     "Lihat visual" bekerja dan menampilkan isi deck yang cocok persis dengan
     decklist sumber, tab Tournaments+Community Deck+Hero Base sama-sama
     tersembunyi di mode EN, halaman Community Deck yang sudah ada (18 deck)
     tidak terpengaruh. Console bersih dari error JS (404 gambar kartu di
     lingkungan uji lokal itu wajar — folder `images/` tidak ikut diuji,
     bukan indikasi bug).

### Tambahan jadwal — 4 September 2026 *(hanya `data.js`)*
- **Arnando Garage** (Bali) masuk daftar — Minggu 18.00 WITA – Selesai. Ini toko
  LGS **pertama di luar zona WIB** yang terdaftar, jadi field `tz:'WITA'`
  dipakai untuk toko ini (field ini sudah ada sejak awal di skema `LGS`, tinggal
  dipakai — tidak perlu perubahan kode)
- Total kini **18 toko · 24 sesi per minggu · 8 kota**
- Kota baru (**Bali**) otomatis masuk grup **Luar Jabodetabek** di dropdown filter
  (tidak perlu ubah `index.html` — `wilayahKota()` sudah menangani kota di luar
  Jabodetabek secara default sejak v6.16, cukup nama kotanya belum terdaftar di
  grup Jabodetabek)
- `index.html` **tidak berubah** (tetap v6.25) — cukup unggah ulang `data.js`

### v6.25 — Panduan Bermain diperkaya dari studi lengkap Comprehensive Rules 1.03 — 3 September 2026
Permintaan pemilik: pelajari dan simpan Comprehensive Rules 1.03 secara menyeluruh
(bukan cuma § 103 seperti v6.24) sebagai acuan proyek ke depan, lalu cek apakah ada
konten Panduan Bermain yang bisa ditambah/diperbarui supaya pemain baru maupun lama
bisa memahami Marvel Hero Rush lebih dalam. Seluruh 15 halaman dokumen dibaca
section-by-section langsung dari Google Docs (bukan cuma dari catatan lama 26
Agustus) — catatan lengkapnya disimpan sebagai project doc terpisah
(`rulebook-1.03-lengkap.md`) supaya sesi mendatang tidak perlu mengulang.

**Enam penambahan/perbaikan diterapkan ke halaman Panduan Bermain (ID & EN),
semuanya melengkapi/memperjelas, tidak ada yang bertentangan dengan konten yang
sudah ada:**
1. **Klarifikasi mulligan** (§ Yang Perlu Disiapkan) — kalimat lama ("taruh kartu
   yang ditukar ke bawah deck") berpotensi dibaca sebagai mulligan sebagian
   (pilih-pilih kartu). Rulebook 1.03 (303.1.e) menegaskan ini **all-or-nothing**:
   seluruh 6 kartu tangan awal ditaruh ke bawah deck, bukan sebagian. Kalimat
   diperjelas ("seluruh 6 kartu di tangan ... bukan pilih-pilih sebagian").
2. **Efek "boleh" = opsional** (§ Jenis Efek) — ditambahkan penjelasan: kalau teks
   efek Trigger mengandung kata "boleh" setelah kalimat kapan efek aktif, efek itu
   opsional (304.1.a — istilah rulebook: "[May]"), bukan wajib otomatis.
3. **Retreat otomatis saat power 0** (§ Istilah Penting) — entri baru: kartu yang
   power-nya turun jadi 0 atau kurang akibat efek langsung di-retreat otomatis,
   tanpa perlu bertarung (301.16.a.1, 301.16.b).
4. **Transparansi jumlah kartu Deck** (§ Area Permainan, entri "Deck") — ditambah:
   jumlah kartu di Deck manapun (sendiri/lawan) boleh dikonfirmasi kapan saja
   (302.11.d) — relevan langsung dengan kondisi menang #2 (v6.24) karena pemain
   bisa memantau seberapa dekat lawan dengan kondisi deck habis. Kalimat lama di
   entri ini ("kalau habis saat menarik, Anda kalah") juga disamakan dengan
   kalimat state-based v6.24.
5. **Kesempatan menyerang hilang kalau dilewati** (§ Battle Phase) — ditambahkan:
   begitu urutan serang bergeser ke slot berikutnya (FRONT→WING→WING→BACK),
   kesempatan menyerang karakter yang dilewati hilang untuk giliran itu, tidak
   bisa kembali lagi belakangan (303.2.a.4.7–4.10).
6. **Serangan yang sudah dideklarasikan terkunci** (§ Battle Phase) — ditambahkan
   satu kalimat: begitu serangan dideklarasikan, prosesnya terkunci sampai selesai
   (303.2.a.4.5).

**Dua temuan LAIN yang SENGAJA belum diterapkan** — dicatat sebagai pertanyaan
terbuka di `rulebook-1.03-lengkap.md` § "Pertanyaan terbuka", menunggu konfirmasi
pemilik karena berpotensi bersinggungan dengan istilah/poster resmi yang sudah
mapan di Deck Lab:
- **BBM (BATTLE↔BASE move)** — rulebook 1.03 ternyata cuma mencantumkan
  "Battle-Zone Movement" (301.23, reposisi ANTAR slot BATTLE saja) sebagai aksi
  resmi Action Phase, TIDAK ada "Base Movement" (301.24, BATTLE↔BASE) sebagai aksi
  tersendiri — padahal istilah "BBM" yang dipakai Deck Lab justru cocok dengan
  301.24. Karena BBM adalah istilah komunitas/observasi meja langsung (bukan dari
  rulebook terjemahan tidak resmi ini), tidak diubah sepihak.
- **Struktur giliran 6 vs 7 fase** — rulebook menempatkan "Adjustment" sebagai
  step di dalam Battle Phase, bukan fase tersendiri seperti di halaman Deck Lab
  saat ini (7 fase). Kemungkinan besar cuma beda cara penyajian (bukan beda
  mekanik), jadi tidak diubah tanpa konfirmasi poster resmi CARDFUN.

### v6.24 — kondisi menang dikoreksi jadi state-based + ditambah kondisi #3 (efek kartu) — 3 September 2026
Permintaan pemilik: baca ulang langsung § **103. Winning the Game** di
**Comprehensive Rules 1.03** (Google Docs yang dibuka pemilik di browser Claude) untuk
verifikasi kalimat "Cara Menang" yang baru direvisi di v6.23. Teks rulebook persis:

> 103.1. If a player satisfies any one of the following conditions, that player wins
> the game and the game ends immediately.
> 103.1.a. There are 9 Rush Point Cards in the player's Timeline.
> 103.1.b. The opposing player's main deck has 0 cards.
> 103.1.c. As the result of resolving a card effect, a player is declared the winner
> of the game.

**Dua temuan dari pembacaan langsung ini:**
1. **103.1.b bersifat state-based (dicek terus-menerus), BUKAN dipicu oleh aksi
   menarik kartu.** Kalimat v6.23 ("saat lawan **mengambil kartu** dan ternyata
   deck-nya sudah habis") menyiratkan pemicunya adalah aksi menariknya — padahal
   rulebook cuma bilang "deck lawan punya 0 kartu", tanpa syarat harus ada usaha
   menarik. Begitu deck lawan mencapai 0 kartu — baik karena kartu terakhirnya baru
   ditarik, ATAU dikosongkan lewat efek kartu tanpa proses menarik sama sekali —
   game langsung berakhir saat itu juga.
2. **103.1.c adalah kondisi menang ketiga yang belum pernah tercatat** di README
   atau halaman Cara Menang sebelumnya: seorang pemain bisa dinyatakan menang
   langsung sebagai efek dari sebuah kartu.

Dikonfirmasi ke pemilik lewat pertanyaan eksplisit sebelum diterapkan (bukan
rulebook 1.03 langsung dipakai mentah-mentah, mengingat konvensi proyek: poster
resmi CARDFUN > rulebook 1.03 kalau bertentangan) — pemilik memilih memakai framing
state-based sesuai rulebook, dan menambahkan kondisi #3 ke tampilan publik.

**Perubahan (ID & EN, `index.html` § `pd-menang`, sekarang "tiga cara menang"):**
- ID poin 2: → "Deck utama lawan habis (0 kartu tersisa) — begitu kondisi ini
  terjadi, apa pun penyebabnya (kartu terakhir ditarik, atau deck dikosongkan lewat
  efek kartu), lawan langsung dinyatakan kalah saat itu juga."
- ID poin 3 (baru): "Efek sebuah kartu langsung menyatakan seorang pemain sebagai
  pemenang."
- EN setara untuk kedua poin.

Juga diperbarui: bagian "Aturan resmi Marvel Hero Rush" § Konstruksi deck di README
ini (baris syarat menang, sekarang mencantumkan ketiga kondisi + rujukan sumber),
dan tabel "Riwayat pembaruan aturan" di bagian bawah README.

### v6.23 — klarifikasi teks aturan: kondisi menang saat deck lawan habis — 3 September 2026
Permintaan pemilik: di halaman Panduan Bermain § "Cara Menang", poin nomor 2 (deck
utama lawan habis) sebelumnya cuma berbunyi "(tidak bisa menarik kartu lagi saat
harus menarik)" — tidak eksplisit menyebut bahwa itu berarti **lawan langsung
dinyatakan kalah saat itu juga**. Bukan perubahan aturan, cuma memperjelas kalimat
supaya tidak ambigu buat pembaca baru.

**Perubahan (ID & EN, `index.html` § `pd-menang`):**
- ID: "Deck utama lawan habis (tidak bisa menarik kartu lagi saat harus menarik)."
  → "Deck utama lawan habis — saat lawan mengambil kartu dan ternyata deck-nya
  sudah habis/tidak ada kartu tersisa sama sekali, ia langsung dinyatakan kalah."
  (kalimat direvisi sekali lagi atas masukan pemilik supaya urutannya pas: yang
  memicu kekalahan adalah momen lawan mengambil kartu dan mendapati deck-nya
  kosong, bukan cuma "diharuskan menarik".)
- EN: setara, "Your opponent's main deck runs out (they can't draw when required
  to)." → "...when your opponent draws a card and their deck turns out to have no
  cards left at all, they are immediately declared the loser."

**Sekalian dikoreksi** di bagian "Aturan resmi Marvel Hero Rush" § Konstruksi deck
di README ini: baris syarat menang tertulis "9 kartu Rush Point berhasil ditaruh di
TIMELINE **lawan**" — ini typo, seharusnya TIMELINE **sendiri** (Rush Point didapat
ke timeline milik pemain yang menyerang, bukan timeline lawan; teks Panduan Bermain
sendiri sudah benar dari awal, cuma ringkasan di README yang salah ketik). Dicatat
juga di tabel "Riwayat pembaruan aturan" di bagian bawah README.

### v6.22 — perbaikan bug: default bahasa mobile masuk EN, seharusnya ID — 3 September 2026
Laporan lapangan dari pemilik: beberapa pengunjung yang mengakses
`mhrdecklab.com` lewat mobile device malah masuk ke versi **EN** duluan,
padahal versi EN cuma dimaksudkan sebagai alternatif opsional untuk saat
ini — semua pengunjung, apa pun bahasa/region perangkatnya, seharusnya
default masuk ke versi **ID**.

**Penyebab:** fungsi `tentukanBahasa()` (dieksekusi sekali saat halaman
dimuat) punya tiga tingkat penentuan bahasa: (1) parameter URL `?lang=`,
(2) preferensi yang pernah disimpan pengguna di perangkat itu, (3) — ini
biang masalahnya — kalau dua di atas tidak ada, situs mendeteksi bahasa
browser (`navigator.language`) dan otomatis menampilkan EN kalau bahasa
perangkat bukan Indonesia. Banyak HP dengan region/bahasa sistem bukan
"Indonesia" (walau penggunanya orang Indonesia) jadi otomatis kena EN di
kunjungan pertama.

**Perbaikan:** langkah deteksi bahasa browser (poin 3 di atas) dihapus
total. Sekarang kalau tidak ada `?lang=` di URL dan belum ada preferensi
tersimpan di perangkat, situs **selalu** default ke ID — tidak peduli
bahasa/region browser atau perangkat. Dua jalur lain tetap dipertahankan
apa adanya:
- Link berbagi eksplisit `?lang=en` (untuk komunitas berbahasa Inggris di
  Singapura, Malaysia, Thailand dll) tetap berfungsi seperti biasa.
- Kalau pengguna sendiri pernah memilih EN di perangkatnya sebelumnya,
  pilihan itu tetap diingat (tidak dipaksa balik ke ID).

Perubahan hanya di satu fungsi (`tentukanBahasa()`), tidak menyentuh logika
render/terjemahan lain yang sudah bergantung pada `state.lang`.

### v6.21 — infrastruktur Cloudflare + SEO — 3 September 2026
Lanjutan permintaan eksplisit pemilik ("infrastruktur cloudflare" + "SEO").

**Cloudflare — Cache Rules (selesai, aktif):** aset statis (`/images/*`, `cards.js`,
`data.js`) sekarang dicache di edge Cloudflare dengan Edge TTL 4 jam (dipilih
konservatif, bukan lebih lama, karena berkas-berkas ini kadang ditimpa langsung
oleh pemilik tanpa parameter cache-busting). Dikonfirmasi live lewat dashboard
(Caching → Cache Rules → 1 active).

**Cloudflare — Auto Minify + Brotli (tidak perlu tindakan, sudah dicek langsung
lewat API):**
- **Brotli**: dicek lewat `zones/settings/brotli` — nilainya sudah `"on"` secara
  default, tidak ada yang perlu diaktifkan.
- **Auto Minify**: toggle-nya sudah hilang dari dashboard Speed → Optimization
  (halaman itu sekarang cuma menampilkan Speed Brain, Cloudflare Fonts, Early
  Hints, Rocket Loader, dll — tidak ada Auto Minify sama sekali). Dicoba langsung
  lewat API `PATCH zones/settings/minify` untuk memastikan: request-nya sukses
  (`200 success:true`) tapi nilainya **tidak benar-benar berubah** (`modified_on`
  tetap `null`, tetap `{css:off,html:off,js:off}`) — jadi API-nya juga sudah
  dinonaktifkan diam-diam. Sejalan dengan pengumuman resmi Cloudflare yang
  men-deprecate Auto Minify (Agustus 2024, komunitas Cloudflare) tanpa pengganti
  langsung. Kesimpulan: fitur ini memang sudah tidak bisa dikonfigurasi lagi,
  bukan kesalahan konfigurasi — tidak perlu dicoba lagi ke depannya.

**Cloudflare — Bot Fight Mode (tidak tersedia lagi untuk zone ini, dicek langsung
lewat API):** kartu pengaturannya di Security → Settings tidak pernah selesai
render di dashboard (lazy-load kosong terus). Dicek langsung lewat API
`GET zones/settings/bot_fight_mode` → error `"Undefined zone setting:
bot_fight_mode"` (code 1003) — settingan ini memang sudah tidak ada lagi di
skema zone Cloudflare untuk akun ini. Sama seperti Auto Minify, ini bukan
sesuatu yang bisa/perlu diperbaiki lagi lewat cara lama.

**Cloudflare — MX/SPF/DKIM/DMARC (belum dikerjakan, perlu keputusan pemilik):**
dicek lewat DNS records — domain ini saat ini **tidak punya email sama sekali**
(tidak ada MX record). Menambahkan SPF/DMARC tanpa penyedia email yang jelas
tidak ada gunanya. Kalau ke depannya pemilik ingin pakai email @mhrdecklab.com
(lewat Google Workspace, Zoho, dll), kabari dulu penyedianya baru catatan DNS-nya
bisa disiapkan.

**SEO — structured data, sitemap, robots.txt (selesai):**
- JSON-LD `WebApplication` ditambahkan di `<head>` `index.html` (nama, deskripsi,
  kategori, bahasa `id`, gratis, dengan penegasan "fan-made, tidak berafiliasi
  resmi" supaya tidak menyesatkan soal status resmi)
- `sitemap.xml` dan `robots.txt` baru dibuat di root repo (situs cuma satu
  halaman, jadi sitemap-nya cuma berisi `https://mhrdecklab.com/`)

**SEO — Google Search Console (selesai — ⚠️ butuh satu langkah manual dari
pemilik, lihat catatan penting di bawah):**
- `mhrdecklab.com` didaftarkan sebagai Domain property di akun
  `dataanggi2712@gmail.com` (akun Google yang sama dipakai untuk Cloudflare)
- Diverifikasi lewat DNS TXT record (`google-site-verification=...`) yang
  ditambahkan langsung ke DNS Cloudflare — **status: Ownership verified** ✅.
  Sengaja pakai cara TXT record manual, BUKAN opsi "authorize Google to access
  your DNS account on Cloudflare.com" yang ditawarkan Search Console (itu
  memberi akses API penuh ke akun Cloudflare, di luar izin yang diminta)
- Percobaan submit `sitemap.xml` ke Search Console sempat gagal ("Invalid
  sitemap address") karena `git push`-nya belum dilakukan pemilik saat itu.
  **Update: sudah dikonfirmasi beres.** Pemilik sudah `git push`, v6.21
  (termasuk `sitemap.xml` dan `robots.txt`) sudah terkonfirmasi live di
  `mhrdecklab.com` (dicek langsung lewat fetch tanpa cache). Sempat ada
  `sitemap.xml` masih 404 walau sudah live di origin — ternyata Cloudflare
  edge cache masih menyimpan respons 404 lama; sudah diperbaiki dengan purge
  cache lewat API (`POST zones/{zone}/purge_cache`) untuk `sitemap.xml` dan
  `robots.txt`, dan dikonfirmasi 200 + isi XML benar sesudahnya. Submit ulang
  manual ke Search Console masih gagal ("Invalid sitemap address") walau file
  sudah terbukti live — kemungkinan cache/negative-result di sisi Google,
  di luar kendali sesi ini. Tidak fatal: `robots.txt` sudah merujuk ke
  sitemap, jadi Google akan menemukannya sendiri lewat crawling normal;
  boleh dicoba submit manual lagi beberapa hari ke depan kalau masih mau.

### v6.20 — branding Hero Base + perbaikan performa (CLS/INP/render kartu) — 3 September 2026
Permintaan eksplisit pemilik: terapkan nama branding yang sudah dikonfirmasi
sebelumnya, dan kerjakan tiga item performa yang sempat ditunda dari laporan
Cloudflare Agustus (`analitik-agustus-2026.md`).

- **Branding "Hero Base"** diterapkan ke judul tab navigasi & judul halaman (H2)
  Weekly Rush LGS — cuma nama/label halaman, teks isi (body paragraf) sengaja TIDAK
  diubah sesuai instruksi eksplisit pemilik ("cuma nama halaman, teks isi tetap apa
  adanya")
- **Fix CLS `#deckList`** (penyumbang CLS terbesar yang tersisa, sengaja ditunda dari
  v6.17): placeholder statis "Deck masih kosong" sekarang diberi `visibility:hidden`
  sejak HTML awal (ruang tetap dipesan, sama polanya dengan fix `#btnDukung`/
  `#footDukung` di v6.17), dan `renderDeck()` cuma menampakkannya (`visibility:visible`)
  di render PERTAMA kali halaman dibuka (flag `renderPertamaDeckList`) — render
  berikutnya (tiap kartu ditambah/dikurangi, yang jalan hampir di setiap edit) TIDAK
  dibalut teknik ini lagi supaya tetap terasa instan, sesuai opsi (b) yang sudah
  dianalisis sebelumnya di `analitik-agustus-2026.md`. Diverifikasi Playwright untuk
  kasus deck kosong (pengunjung baru) maupun deck tersimpan di localStorage
  (pengunjung lama, kasus yang sebenarnya memicu pergeseran) — keduanya tampil benar,
  nol error console
- **Fix INP `#navTabs>button` (424ms) dan `#metaGrid` tombol "muat deck" (360ms)**:
  `requestAnimationFrame` (dipakai sejak v6.4, terbukti tidak cukup menurunkan angka
  di laporan Agustus) diganti `setTimeout(fn, 0)` — rAF berjalan TEPAT sebelum browser
  mengecat, jadi kalau isi callback-nya berat ia tetap menahan cat yang sama; `setTimeout(0)`
  memberi browser kesempatan nyata mengecat dulu sebelum kerja berat (render halaman/
  deck) jalan di giliran berikutnya. Ditambah: highlight tab aktif (`aria-current`)
  sekarang dipindah SEGERA saat diklik (sebelum kerja berat ditunda), jadi ada umpan
  balik visual instan
- **Mitigasi Safari iOS lebih lambat dari Chrome Mobile (±68% gap, `decoding="async"`
  di v6.4 terbukti tidak cukup)**: root cause paling mungkin yang ditemukan — `renderCards()`
  sebelumnya membangun sampai 208 elemen kartu sekaligus lewat satu `innerHTML`, satu
  "long task" yang menahan thread utama (WebKit/Safari dikenal lebih berat untuk reflow
  besar dibanding Chromium). Sekarang dicicil: 24 kartu pertama (cukup mengisi 2 layar
  HP) digambar segera, sisanya per 40 kartu lewat `requestAnimationFrame` supaya browser
  sempat bernapas di antara batch — dilindungi token render supaya render lama otomatis
  berhenti kalau filter diganti sebelum selesai. **Belum dikerjakan**: ukuran file
  gambar kartu asli (±80-90KB, didekode penuh walau ditampilkan sebagai thumbnail
  78×109px di tampilan daftar) — butuh pipeline resize terpisah untuk ~250 gambar
  kartu, ditunda ke sesi lain karena risikonya lebih besar dan efeknya baru bisa
  dikonfirmasi dari laporan Cloudflare berikutnya, bukan dari tes di sesi ini (tidak
  ada mesin render Safari asli yang bisa dipakai untuk verifikasi langsung)
- Diverifikasi menyeluruh lewat Playwright (server tes lokal + viewport mobile
  390×844): sintaks JS bersih (`node --check`), branding "Hero Base" tampil di tab
  nav & H2, `#deckList` ter-reveal dengan benar untuk deck kosong maupun deck terisi
  (3 baris kartu, localStorage), render 208→192 kartu (mode EN) tuntas dalam ~1 detik
  lewat batching, klik tab memperbarui `aria-current` seketika — nol error JavaScript
  halaman, console error yang muncul cuma 404 aset gambar yang memang sengaja tidak
  ikut disalin ke server tes

### DNSSEC + proxy Cloudflare (CDN/DDoS) diaktifkan — 2 September 2026 *(pengaturan Cloudflare, tidak ada perubahan kode)*
Permintaan eksplisit pemilik setelah pengecekan ulang menyeluruh (lihat entri di
bawah) menemukan dua item opsional ini belum aktif.

- **DNSSEC** diaktifkan lewat `Domain Registration → Settings` — status "Pending",
  aktif penuh dalam ±24 jam (Cloudflare otomatis pasang DS record karena registrar
  & DNS-nya sama-sama Cloudflare, tidak ada langkah manual tambahan)
- **Proxy Cloudflare** (awan oranye) diaktifkan untuk **kelima** DNS record (4× A +
  1× CNAME `www`) — sebelumnya semua "DNS only". Cek mode SSL/TLS zone dulu sebelum
  mengaktifkan: ternyata **sudah "Full"** (bukan "Flexible"), jadi aman diaktifkan
  langsung tanpa risiko redirect loop
- **Diverifikasi langsung setelah aktivasi**: `https://mhrdecklab.com`,
  `http://mhrdecklab.com` (redirect ke https tetap jalan), dan
  `https://www.mhrdecklab.com` semuanya memuat situs dengan benar, header response
  sekarang menunjukkan `server: cloudflare` + `cf-ray` (traffic resmi lewat edge
  Cloudflare Singapura), nol error console
- Efeknya buat pengunjung: proteksi DDoS otomatis di level edge Cloudflare, caching
  tambahan (berpotensi mempercepat loading terutama untuk pengunjung Indonesia),
  alamat IP asli GitHub Pages jadi tersembunyi dari publik. Pola cache-busting
  `?v=angka` yang situs ini pakai untuk update tetap berfungsi normal lewat proxy
- Tidak ada perubahan `index.html`/kode — murni pengaturan akun Cloudflare

### Pengecekan ulang menyeluruh Cloudflare + GitHub Pages — 2 September 2026 *(cuma komentar dokumentasi di `index.html`, tidak ada perubahan fungsi)*
Diminta pemilik ("cek ulang lagi semua setting... agar semua fitur berjalan dengan
baik dan bisa optimize") sesaat setelah domain live. Seluruh konfigurasi diperiksa
ulang satu per satu langsung di dashboard:

- **DNS Cloudflare**: dikonfirmasi 5/5 record benar — 4× A (`108`/`109`/`110`/
  `111.153`) + 1× CNAME `www`, semuanya masih "DNS only" sesuai rencana
- **GitHub Pages**: custom domain `mhrdecklab.com`, "DNS check successful", "Enforce
  HTTPS" tercentang — situs terkonfirmasi live
- **Redirect URL lama** — dites langsung: `https://data2712-code.github.io/mhr-lab-x7k2m9/`
  ternyata **otomatis redirect (301)** ke `https://mhrdecklab.com/`, bukan cuma
  "tetap jalan berdampingan" seperti dugaan awal — jadi tidak ada risiko duplicate
  content untuk SEO, satu URL kanonik saja yang terindeks
- **Redirect http→https** — sudah berfungsi penuh (`http://mhrdecklab.com` otomatis
  ke `https://`), kekhawatiran sebelumnya soal propagasi sudah tidak relevan
- **Meta tag `og:url`/`canonical`** — dicek langsung ke kode: **tidak pernah ada**
  tag itu di `index.html` sejak awal (dugaan sebelumnya salah), jadi tidak ada yang
  perlu diperbaiki di situ. `og:image` pakai path relatif (`og-image.jpg`) sehingga
  otomatis ikut resolve ke domain baru saat link dibagikan
- **PWA** (`manifest.json`, `sw.js`) — `start_url`/`scope` dan seluruh
  `STATIC_ASSETS` sudah pakai path relatif dari awal, tidak ada hardcode domain,
  jadi tidak perlu perubahan apa pun untuk domain baru
- **Cloudflare Web Analytics** — beacon script + token masih terpasang dan termuat
  tanpa error di domain baru
- Satu komentar dokumentasi di baris atas `index.html` (bukan kode fungsional,
  cuma penanda "Live: ...") masih menunjuk URL GitHub Pages lama — diperbarui ke
  `mhrdecklab.com`
- **Console browser**: nol error di halaman live

**Dua temuan untuk perhatian pemilik (bukan bug, tapi perlu keputusan/tindakan
pemilik sendiri karena masuk kategori "ubah pengaturan akun"):**
1. ⚠️ **Auto-renew domain OFF** di Cloudflare Registrar (expired: 2 September 2027).
   Kalau tidak diaktifkan/diingat manual, domain bisa hilang setelah masa aktifnya
   habis. Disarankan pemilik aktifkan sendiri lewat toggle di halaman
   `Domain Registration → Registrations`
2. DNSSEC belum diaktifkan untuk zone `mhrdecklab.com` — opsional, pengaman
   tambahan terhadap DNS spoofing, satu klik "Enable DNSSEC" di
   `mhrdecklab.com → Settings` (bukan zone DNS biasa, tapi halaman Domain
   Registration → Settings)

### Domain kustom `mhrdecklab.com` resmi LIVE — 2 September 2026 *(hanya `README.md`, tidak ada perubahan kode)*
Migrasi domain tuntas di hari yang sama dengan pembelian. Pemilik membuka Cloudflare
dan GitHub sekaligus di browser lalu minta bantuan langsung mengeksekusi sisa
langkahnya.

- 4 **A record** (`@` → `185.199.108.153`/`.109.153`/`.110.153`/`.111.153`) dan 1
  **CNAME record** (`www` → `data2712-code.github.io`) ditambahkan di dashboard DNS
  Cloudflare, semuanya mode **DNS only** (bukan proxied) supaya GitHub bisa
  menerbitkan sertifikatnya sendiri
- DNS check di `Settings → Pages` GitHub langsung sukses (propagasi Cloudflare
  cepat), sertifikat HTTPS terbit tidak lama setelahnya — **"Enforce HTTPS"**
  diaktifkan di hari yang sama, tidak perlu menunggu sampai 24 jam seperti perkiraan
  awal
- Diverifikasi langsung: `http://mhrdecklab.com` dan `https://mhrdecklab.com`
  keduanya memuat situs dengan benar, gembok HTTPS valid
- Baris "🔗 Live:" di atas diperbarui ke `https://mhrdecklab.com/` — URL GitHub Pages
  lama tetap jalan sebagai alias, tidak ada tindakan tambahan yang diperlukan untuk
  itu
- Redirect otomatis `http://` → `https://` (efek dari "Enforce HTTPS") mungkin perlu
  beberapa saat untuk mulai berlaku sepenuhnya di sisi GitHub — bukan tanda ada yang
  salah kalau belum langsung redirect di menit-menit pertama
- Tidak ada perubahan `index.html` — jadi tidak ada kenaikan nomor versi untuk entri
  ini. Rujukan URL lama di meta tag (`og:url` dsb.) di `index.html` **belum dicek/
  diperbarui** — jadi item terpisah untuk sesi berikutnya kalau relevan

### Persiapan domain kustom `mhrdecklab.com` — 2 September 2026 *(hanya berkas `CNAME` baru, tidak ada perubahan kode)*
Pemilik sudah menyelesaikan pembelian domain `mhrdecklab.com` di Cloudflare Registrar.
Langkah pertama migrasi: menyiapkan sisi GitHub Pages-nya.

- Berkas baru **`CNAME`** ditambahkan di root repo, isinya cuma `mhrdecklab.com` —
  ini berkas standar yang dibaca GitHub Pages untuk tahu domain kustom yang dipakai.
  Biasanya berkas ini otomatis dibuat kalau domain diisi lewat kolom "Custom domain"
  di `Settings → Pages` GitHub, tapi di sini dibuat langsung sebagai berkas supaya
  konsisten dengan alur kerja proyek ini (semua perubahan lewat folder klon, bukan
  lewat website GitHub)
- **Belum live** — domain baru akan benar-benar berfungsi setelah DNS-nya diarahkan
  ke GitHub Pages di dashboard Cloudflare (4 A record + opsional CNAME `www`) dan
  GitHub selesai menerbitkan sertifikat HTTPS untuk domain tersebut. Langkah detail
  ada di `riset-preseden-fan-tcg-dan-rekomendasi-domain-2-september-2026.md` §
  "Panduan teknis"
- URL lama `https://data2712-code.github.io/mhr-lab-x7k2m9/` tetap akan berfungsi
  sebagai alias/redirect ke domain baru begitu semuanya aktif — perilaku standar
  GitHub Pages, tidak perlu tindakan tambahan
- Tidak ada perubahan `index.html` — jadi tidak ada kenaikan nomor versi untuk entri ini

### `robots.txt` dihapus agar indexing tidak dibatasi — 2 September 2026 *(hanya `robots.txt`, tidak ada perubahan kode)*
Permintaan pemilik, menjelang rencana domain kustom `mhrdecklab.com` mulai dipakai:
buka akses crawler mesin pencari yang sebelumnya sengaja diblokir total sejak fase
uji coba awal proyek.

- Awalnya isi `robots.txt` diubah dari `User-agent: * / Disallow: /` (blokir semua
  crawler) menjadi `User-agent: * / Allow: /` (izinkan semua) lewat sesi Claude —
  device yang terhubung ke sesi tidak punya kemampuan hapus berkas. Pemilik lalu
  **menghapus berkasnya secara langsung** di folder klon (File Explorer + commit
  lewat GitHub Desktop), jadi kondisi akhirnya: **`robots.txt` tidak ada lagi di
  repo**. Efeknya sama seperti `Allow: /` — GitHub Pages mengembalikan 404 untuk
  `/robots.txt`, dan semua mesin pencari memperlakukan robots.txt yang hilang/404
  persis sama seperti "izinkan semua"
- Keputusan disengaja karena strategi obscurity (nama repo acak + robots.txt blokir
  total) sudah tidak relevan lagi begitu domain sendiri dipakai; lihat
  `evaluasi-obscurity-2-september-2026.md` untuk analisis lengkapnya
- Catatan penting: repo ini satu-satunya sumber yang melayani baik URL GitHub Pages
  lama (`data2712-code.github.io/mhr-lab-x7k2m9`) maupun domain baru nanti — jadi
  perubahan ini otomatis berlaku untuk **keduanya** sejak commit ini, bukan menunggu
  domain baru live
- Tidak ada perubahan `index.html` — jadi tidak ada kenaikan nomor versi untuk entri ini
- Dicek: disclaimer non-afiliasi yang tadinya dikira belum ada (lihat riset preseden
  fan-TCG) ternyata **sudah ada** di footer sejak sebelumnya (`data-i18n="footDisc"`,
  ID & EN lengkap, mengarah ke sumber data resmi & janji diturunkan jika diminta
  pemegang hak) — jadi tidak perlu perubahan tambahan untuk itu

### Koreksi efek SD03-003 EN — 2 September 2026 *(hanya `cards.js` + `images/en/SD03-003.jpg`)*
Permintaan pemilik: kartu 「Urgent Call」Nick Fury (SD03-003) versi Inggris kena
perubahan efek resmi — teks yang selama ini tampil di situs (dan tercetak di gambar
kartu versi Inggris) sudah usang.

- `cards.js` — field `e_en` diperbarui: `"...from HAND **into** your BATTLE. If you
  do, **when the turn ends,** you retreat this card."` → `"...from HAND **onto** your
  BATTLE. If you do, you retreat this card."` (klausa "pada akhir giliran" untuk
  RETREAT-nya dihapus — bukan cuma ganti kata, ini perubahan waktu efek beneran).
  Field `e` (Bahasa Indonesia) **sengaja tidak diubah** — pemilik sedang menunggu
  daftar errata terbaru khusus Bahasa Indonesia dari sumber resmi; begitu daftar itu
  ada, field `e` untuk SD03-003 (dan kartu lain yang kena errata yang sama) perlu
  ditinjau ulang. **Pending** — lihat `status-terkini.md` untuk pengingatnya
- `images/en/SD03-003.jpg` — awalnya dicoba perbaikan manual (hapus teks lama lewat
  inpainting OpenCV, tulis ulang teks baru pakai font pengganti), tapi pemilik lalu
  memberikan gambar kartu resmi versi terbaru langsung (sumber asli, bukan hasil edit)
  — jadi pendekatannya diganti: gambar itu diproses (dikomposit dari kanal alpha
  transparan ke latar hitam standar situs, resize ke lebar 450px konsisten dengan
  gambar lain) dan dipakai apa adanya sebagai pengganti, BUKAN hasil tulis-ulang teks
  manual. Ini lebih akurat karena bersumber dari cetakan resmi, bukan rekonstruksi font
- Diverifikasi dengan Playwright: `DB.find` mengembalikan `e_en` yang baru, popup
  kartu (lightbox) menampilkan teks & gambar yang sudah diperbarui, kartu terkait
  tetap muncul normal, nol error konsol/halaman
- Tidak ada perubahan `index.html` — jadi tidak ada kenaikan nomor versi untuk entri ini

### v6.19 — 2 September 2026 · kanal email di kotak submission deck komunitas
Permintaan pemilik: tambahkan alamat email sebagai kanal alternatif pengiriman kode
submission, selain DM TikTok yang sudah ada.

- Kotak submission (tab 🏆 Deck Komunitas) sekarang menyebut **dua** kanal pengiriman:
  DM TikTok [@deteprtm](https://tiktok.com/@deteprtm) (seperti sebelumnya) ATAU email
  ke **dataanggi2712@yahoo.co.id** — link email pakai `mailto:` dengan subjek dan
  placeholder isi pesan sudah terisi otomatis ("Tempel kode deck yang sudah disalin di
  sini:"), supaya pengunjung tinggal klik lalu tempel kode yang sudah disalin
- Pesan konfirmasi setelah kode berhasil dibuat (`subOk`) diperbarui jadi "...kirim
  lewat TikTok atau email untuk ditinjau" (ID & EN)
- Alur moderasinya **tidak berubah** — dua kanal ini cuma tempat pengunjung mengirim
  kode yang sudah lolos validasi di browser; pemilik tetap yang meninjau dan menempel
  manual ke `DECK_KOMUNITAS`, tidak ada jalur otomatis baru ke `data.js`
- Diverifikasi dengan Playwright di HP & desktop: link email & TikTok tampil
  bersamaan, teks ID & EN benar (dicek langsung lewat pemanggilan `renderSubmitBox()`
  di mode EN, karena halaman Deck Komunitas sendiri memang sengaja disembunyikan dari
  pengunjung mode EN — lihat catatan lama soal ini), alur generate/copy kode tidak
  regresi. Regresi penuh v6.18 (kartu terkait, duplikat deck, filter kemampuan kunci,
  taksonomi warna) juga dicek ulang — nol error konsol/halaman

### v6.18 — 2 September 2026 · kartu terkait di popup, duplikat deck, filter kemampuan kunci, submission deck komunitas
Enam item diminta pemilik sekaligus. Dua di antaranya ternyata **sudah selesai**
di versi sebelumnya (dikonfirmasi lewat baca kode + tes Playwright langsung,
bukan cuma percaya dokumen roadmap yang ternyata sudah usang) — jadi pekerjaan
difokuskan ke bagian yang benar-benar belum ada:

- ✅ **Sudah ada sebelumnya, dikonfirmasi lewat tes** — navigasi ◀ ▶ dan panah
  keyboard di popup kartu, serta filter bar yang bisa dilipat di HP (`#btnFilter`).
  Roadmap lama (bagian di bawah) belum sempat ditandai selesai
- 🆕 **Kartu terkait di popup** — bagian baru di bawah detail kartu (`.lb-related`),
  menampilkan sampai 10 kartu lain dengan nama karakter sama (rekan seri) memakai
  `relatedCards()`/`relatedHTML()`. Klik salah satu kartu terkait langsung
  berpindah ke popup kartu itu (pakai jalur render yang sama dengan navigasi ◀ ▶)
- 🆕 **Duplikat deck** — tombol `⧉` di sebelah nama deck aktif. Menyalin seluruh
  isi deck ke deck baru bernama `<nama asli> (salinan)` (angka bertambah kalau
  nama sudah dipakai), lalu langsung berpindah ke deck salinan itu — berguna
  untuk mencoba variasi tanpa kehilangan deck asli
- 🆕 **Filter kemampuan kunci** — dropdown baru `#fKeyAbil` (BLOCK, DOUBLE ATTACK,
  ASSAULT, AIR STRIKE, UNIQUE) yang mencocokkan token berkurung di teks efek kartu
  (mis. `[UNIQUE]`), lengkap dengan hitungan jumlah kartu di tiap opsi seperti
  dropdown filter lain. Sekalian ditambahkan statistik **biaya Summon** (jumlah
  kartu Lv1–3 gratis vs Lv4+ berbayar) di panel ringkasan deck — dua item roadmap
  yang saling terkait (301.19) dikerjakan sekaligus
- 🆕 **Persiapan warna Orange & Purple** — taksonomi warna dirombak dari 4 warna
  hardcode (`Merah`/`Kuning`/`Biru`/`Hijau`) jadi `COLORS` yang dihitung otomatis
  dari warna yang benar-benar ada di `cards.js` (pola yang sama dengan
  pengelompokan kota LGS). Begitu set kartu dengan warna Orange/Purple terbit dan
  ditambahkan ke `cards.js`, tombol warna dan filter di halaman deck builder ikut
  muncul **tanpa perlu ubah kode apa pun**. Sekalian ditemukan dan diperbaiki
  potensi bug `NaN` di 3 tempat yang sebelumnya mengasumsikan cuma ada 4 warna
- 🆕 **Submission deck dari komunitas, dengan batasan moderasi** — kotak baru di
  tab **🏆 Deck Komunitas** (terlihat untuk semua pengunjung, bukan cuma mode
  admin) yang memvalidasi deck aktif (harus pas 50 kartu, sesuai aturan
  warna/salinan) dan nama pembuat (wajib diisi), lalu menghasilkan kode
  siap-tempel dengan format **persis sama** dengan generator admin yang sudah
  ada. Situs ini statis tanpa backend, jadi "submission" diarahkan ke
  satu-satunya kanal kontak publik yang sudah ada (DM TikTok
  [@deteprtm](https://tiktok.com/@deteprtm)) — bukan kanal baru. Moderasinya
  sepenuhnya manual: pemilik meninjau kode yang dikirim lalu menempelkannya
  sendiri ke `data.js` seperti biasa (lihat **Cara menambah deck komunitas** di
  bawah); tidak ada jalur kode apa pun yang memberi pengunjung akses tulis
  langsung ke data situs
- 🛡️ Perbaikan pencegahan (belum jadi masalah nyata, tapi jadi relevan sekarang
  karena `DECK_KOMUNITAS` bisa diisi dari saran publik yang tidak selalu dibaca
  teliti): nama/kreator/deskripsi deck komunitas di `renderMeta()` sekarang
  di-escape (`escHtml()`) sebelum ditampilkan, supaya karakter `<`/`>` di
  input tidak bisa disisipi markup
- Diverifikasi dengan Playwright di HP dan desktop untuk tiap fitur di atas
  (termasuk kasus deck kosong dan nama kreator kosong pada fitur submission,
  yang harus ditolak dengan pesan, bukan menghasilkan kode), plus regresi penuh
  fitur v6.17 (tombol Dukung, lencana errata/Counter, pratinjau hover kartu di
  deck list) — nol error konsol/halaman di kedua ukuran layar
- Nama branding Weekly Rush LGS ("Assemble Night" untuk acara, "Hero Base"
  untuk toko peserta) dikonfirmasi final oleh pemilik — belum diterapkan ke
  kode/`data.js`, menunggu perintah eksplisit kapan dipakai

### Dokumentasi — 2 September 2026 *(hanya `README.md`, tidak ada perubahan kode/data)*
- Ditambahkan aturan tetap proyek: **setiap** perubahan, sekecil apa pun, wajib
  dicatat sebagai entri baru di bagian ini — supaya sesi Claude baru (tanpa akses ke
  riwayat percakapan sebelumnya) tetap bisa membaca riwayat lengkap cukup dari file
  ini
- Bagian **"Catatan dari rulebook resmi (Comprehensive Rules 1.00)"** yang sudah usang
  diganti total dengan **"Aturan resmi Marvel Hero Rush (rujukan lengkap untuk Deck
  Lab)"** — konsolidasi seluruh aturan permainan yang sudah dipelajari sejauh ini dari
  Comprehensive Rules 1.00 → 1.03, poster cetak resmi CARDFUN/Jason Entertainment, dan
  taksonomi Counter dari penjelasan pemilik. Mencakup: konstruksi deck, struktur
  giliran & battlefield, biaya Summon, pemetaan istilah kemampuan kunci, dua jenis
  Counter, errata resmi, field yang belum diimplementasikan (Environment, rarity
  GR/R), dan tabel "Riwayat pembaruan aturan" tersendiri untuk melacak kapan tiap
  temuan aturan masuk. Bagian ini akan terus diperbarui setiap kali ada rulebook
  resmi baru, errata baru, atau set kartu dengan mekanik baru
- Daftar "Rencana / ide berikutnya": item "Impor deck dari teks" ditandai selesai
  (sudah dikerjakan di v6.16)

### v6.17 — 2 September 2026 · perbaikan CLS lanjutan (dari laporan Cloudflare Agustus)
Laporan Cloudflare bulan penuh (1–31 Agustus) mencatat CLS memburuk dari 7% "poor"
(sebelum v6.4) jadi **11% "poor"**, dengan elemen bermasalah yang sama persis
dengan sebelum v6.4: `header>div.hdr-stats` dan `#hoverPrev`. Diselidiki dengan
Playwright + throttling jaringan/CPU realistis dan pustaka pengukuran resmi
`web-vitals`, bukan cuma baca kode — akar masalahnya ditemukan dan bukan yang
diduga semula:

- ⚡ **Tombol "☕ Dukung" di header dan catatan di footer, akar masalah utama.**
  Keduanya memakai atribut `hidden` lalu dimunculkan JavaScript setelah render
  pertama — ini membuat browser menyisipkan elemen baru ke tata letak yang sudah
  tampil, mendorong tombol bahasa dan link TikTok di header (tercatat sebagai
  `hdr-stats`, penyumbang CLS terbesar, nilai 0.3784 di simulasi "before").
  Diganti jadi pola: ruang kosongnya **sudah dipesan dari awal** lewat
  `visibility:hidden` + teks placeholder sepanjang teks asli, dan JavaScript
  cuma mengganti `visibility` jadi `visible` (bukan menyisipkan elemen baru).
  Kalau `window.DUKUNG` tidak diisi di `data.js`, elemen tetap tersembunyi
  seperti sebelumnya — perilaku "boleh dikosongkan" tidak berubah
- ⚡ **`#hoverPrev` (pratinjau kartu melayang) — nuansa yang terlewat di v6.4.**
  Perbaikan v6.4 memindah posisinya ke `transform` supaya tidak memicu reflow,
  tapi ternyata Layout Instability API tetap menghitung pergeseran posisi
  elemen yang sudah tampil sebagai layout shift, apa pun properti CSS yang
  dipakai untuk menggesernya — dan `mousemove`/hover tidak dapat pengecualian
  `hadRecentInput` (hanya klik/tap/keyboard yang dapat). Sekarang, saat kursor
  berpindah ke kartu lain yang berbeda, pratinjau **disembunyikan dulu,
  direposisi saat tersembunyi, baru dimunculkan lagi di frame berikutnya** —
  elemen yang tidak tampil di frame sebelumnya dihitung "baru muncul", bukan
  "berpindah", jadi tidak disertakan ke skor CLS. Gerakan kursor kecil di baris
  yang sama (mengikuti kursor terus-menerus) sengaja dibiarkan seperti semula
  supaya terasa responsif — dampaknya ke CLS kecil dibanding lompatan antar-kartu
- Diverifikasi dengan Playwright: elemen `hdr-stats`/`#hoverPrev` yang tadinya
  jadi sumber shift di simulasi "before" **hilang total** di simulasi "after",
  dan regresi fungsional (versi, lencana errata/counter, tombol bahasa, dropdown
  kota LGS, impor deck dari teks) tetap bersih di HP maupun desktop
- **Belum diperbaiki, sengaja ditunda:** `#deckList` (daftar kartu di deck) juga
  tercatat sebagai penyumbang CLS — placeholder "Deck masih kosong" diganti
  konten asli begitu pemain dengan deck tersimpan membuka situs. Perbaikan yang
  benar butuh mengubah urutan pemuatan skrip (`cards.js`/`data.js` dipindah lebih
  awal) atau membatasi jeda sembunyi/tampilkan hanya ke render pertama kali,
  bukan ke setiap kali deck diedit (yang terjadi hampir tiap interaksi) — supaya
  tidak malah bikin edit deck terasa nge-lag. Butuh sesi terpisah yang lebih
  hati-hati; belum berdampak ke pengalaman inti (isi deck tetap benar, cuma
  waktu render pertamanya yang tercatat sebagai shift)
- Konfirmasi nyata baru akan terlihat di laporan Cloudflare berikutnya
  (±akhir September) — perbaikan ini diverifikasi lewat simulasi, bukan data
  lapangan langsung

### Tambahan jadwal — 1 September 2026 *(hanya `data.js`)*
- **Savepoint** (Depok) masuk daftar — Jumat 19.30 WIB & Minggu 16.00 WIB.
  Total kini **17 toko · 23 sesi per minggu · 7 kota**
- Kota baru otomatis masuk grup **Jabodetabek** di dropdown filter (tidak perlu ubah
  `index.html` — `wilayahKota()` sudah mengenali "Depok" sejak v6.16)
- `index.html` **tidak berubah** (tetap v6.16) — cukup unggah ulang `data.js`

### v6.16 — 31 Agustus 2026 · filter kota LGS jadi dropdown + impor deck dari teks
Dua item berikutnya dari roadmap pengembangan:

- **Filter kota di halaman LGS Weekly Rush diganti dari baris chip
  scroll-horizontal jadi dropdown `<select>` yang dikelompokkan per wilayah**
  (Jabodetabek / Luar Jabodetabek, dihitung otomatis dari nama kota — tidak
  perlu ubah skema `data.js` tiap kali toko baru ditambah). Tiap opsi
  menampilkan jumlah toko di kota itu, dan "Semua kota" menampilkan totalnya.
  Ini menggantikan pendekatan chip yang makin sulit dibaca begitu jumlah kota
  bertambah (sekarang 6 kota, 16 toko).
- **Impor deck dari teks**: tombol baru "📋 Impor dari teks" di panel deck
  membuka kotak tempel bebas format. Mendukung tiga bentuk sekaligus: (1)
  link atau kode deck yang dibagikan (pakai ulang `decodeDeck()` yang sudah
  teruji), (2) hasil "Salin tabel" apa adanya, dan (3) teks bebas/casual
  (mis. hasil copy-paste dari WhatsApp yang whitespace-nya sudah berantakan)
  selama masih memuat nomor kartu resmi (`BP01-004`) dengan penanda jumlah
  di dekatnya (`3x BP01-004` atau `BP01-004 x3`). Setelah diproses, pengguna
  memilih **Ganti deck aktif** atau **Gabung ke deck aktif**; kartu dengan
  nomor yang tidak dikenali (typo, dari game lain, dll.) dilaporkan terpisah
  dan diabaikan, bukan bikin proses gagal total.

Diverifikasi (Chromium headless, mobile 390×844 & desktop 1280×900):
dropdown kota menampilkan 2 grup dengan jumlah toko per kota yang benar,
filter per kota maupun reset ke "Semua kota" bekerja; import diuji dengan
teks campuran bebas, output "Salin tabel", dan pesan casual berisi link
deck yang dibagikan — ketiganya terbaca benar. Regresi gabungan kedua fitur
plus badge Counter/errata dan tombol bahasa: console & page error nihil di
kedua ukuran layar (di mobile, panel deck perlu dibuka dulu lewat pegangan
"▲ DECK SAYA" sebelum tombol impor bisa diklik — ini perilaku panel deck
yang sudah ada sejak dulu, bukan hal baru).

### v6.15 — 31 Agustus 2026 · pecah filter "Counter" + tuntaskan sisa i18n
Dua item dari roadmap pengembangan yang paling murah biaya-vs-dampak karena
sudah punya spesifikasi lengkap (lihat riset taksonomi Counter dari pemilik):

- **Filter mekanik "Counter" dipecah jadi dua**: sebelumnya satu filter
  mencampur dua hal berbeda (23 kartu total). Sekarang **Counter call**
  (9 kartu ber-`[COUNTER]`/`[UNIQUE COUNTER]` — dipanggil ke BATTLE, badge
  menunjukkan gratis di Lv1–3 atau bayar RETREAT di Lv6) dan **Counter efek**
  (14 kartu ber-`[COUNTER-ACTI]` — efek diaktifkan dari HAND/FIELD/BACK/BATTLE,
  badge menunjukkan zonanya). Lencana baru ini tampil di daftar, grid, dan
  lightbox kartu; statistik panel deck juga menghitung keduanya terpisah.
  Sekalian ketemu: regex filter lama (`/\[COUNTER/i`) melewatkan TB01-001
  karena tag-nya `[UNIQUE COUNTER]` (bukan `[COUNTER]` polos) — sekarang ikut
  terhitung dengan benar sebagai Counter call.
- **Sisa kebocoran nama Indonesia di mode EN**: tiga dari empat titik yang
  pernah dicatat (simulasi draw, lightbox, sort "Nama") ternyata sudah
  keburu diperbaiki di rilis-rilis sebelumnya. Satu yang masih tertinggal:
  kartu tanpa gambar di halaman "Lihat deck" (ekspor HD) menuliskan nama
  placeholder-nya pakai nama Indonesia (`c.nm`) walau lagi mode EN — sudah
  diganti ke `cardName(c)` supaya ikut bahasa aktif.

Diverifikasi (Chromium headless, `cards.js` asli): jumlah kartu per filter
cocok persis dengan audit database (9 call / 14 efek / 0 tumpang tindih),
sebaran zona Counter efek cocok (HAND 3 · FIELD 7 · BACK 1 · BATTLE 3), badge
tampil di 23 kartu di ketiga tampilan, console bersih di mobile & desktop.

### v6.14 — 28 Agustus 2026 · fix: tombol ganti bahasa ID/EN hilang di HP
Laporan dari komunitas: tombol ganti bahasa (🌐 ID/EN) di header sulit
ditemukan atau tidak muncul sama sekali. Penyebabnya: tombol ini memakai
class yang sama (`.pill`) dengan tiga penghitung statistik di sebelahnya
(Total kartu / Ditampilkan / Deck), dan ada aturan CSS yang sengaja
menyembunyikan semua `.pill` di layar sempit (≤920px, cakupan hampir semua
HP) karena penghitungnya sudah ditampilkan ulang di navigasi bawah — tapi
aturan itu ikut menyembunyikan tombol bahasa juga, padahal tombol bahasa
tidak punya cara akses lain.

- Tombol bahasa dipisah ke class baru (`.langbtn`), jadi tidak lagi ikut
  aturan penyembunyian `.pill` di HP — sekarang selalu tampil
- Sekalian dibuat lebih jelas kelihatan bisa diklik: bingkai warna aksen +
  latar berbeda dari penghitung statistik di sebelahnya (sebelumnya cuma teks
  abu-abu polos, mirip penghitung, bukan seperti tombol)
- Diverifikasi (Chromium headless, termasuk lebar layar HP): tombol tampil
  dan berfungsi di lebar layar berapa pun, penghitung statistik lain tidak
  terpengaruh

### v6.13 — 28 Agustus 2026 · teks di gambar 12 kartu errata V.1 ikut diperbaiki
Lanjutan dari v6.12: setelah teks efek di database (`cards.js`) diperbaiki sesuai
errata V.1, teks yang tercetak di **gambar kartunya sendiri** (bahasa Indonesia)
kini juga diedit supaya sama-sama menampilkan versi setelah-errata — jadi gambar
dan database tidak lagi berbeda redaksi.

Kartu yang gambarnya diedit: `BP01-002`, `BP01-026`, `BP01-037`, `BP01-043`,
`BP01-046` (kedua versi artwork/`_MR`), `BP01-052`, `BP01-090`, `SD01-007`,
`SD01-018`, `SD04-002`, `SD04-003`, `SD04-005` — total 13 file gambar untuk
12 kartu.

- Untuk kartu berkotak teks polos (5 kartu), teks lama dihapus dan teks baru
  ditulis ulang dengan font sejenis, rapi menyatu dengan kotak aslinya
- Untuk kartu yang teksnya menempel langsung di atas artwork tanpa kotak polos
  (7 kartu + 1 versi artwork tambahan), teks lama dihapus dengan teknik
  rekonstruksi latar (inpainting) sebelum teks baru ditulis ulang di atasnya —
  gaya lebih sulit disamakan persis dibanding kartu berkotak polos, tapi tetap
  diusahakan serapi mungkin
- Lencana kecil, ikon kemampuan ([TRIG], [COUNTER-ACTI], dst.), border warna,
  dan sisa desain kartu (artwork, watermark SAMPLE, nomor R-x/Power) tidak
  disentuh sama sekali — cuma paragraf teks efeknya yang diganti
- Teks bahasa Inggris pada gambar (folder `images/en`) **tidak diubah** —
  sama seperti di database, versi Inggrisnya sudah lebih dulu cocok dengan
  bunyi setelah-errata
- Diverifikasi dengan membandingkan setiap kartu hasil edit terhadap teks
  "Setelah Errata" resmi dan terhadap gambar aslinya (memastikan tidak ada
  sisa teks lama yang tertinggal maupun bagian desain lain yang berubah)

### v6.12 — 28 Agustus 2026 · errata resmi V.1 dari tim MHR Indonesia + lencana Errata
Tim MHR Indonesia merilis daftar errata resmi pertama (V.1) untuk 10 kartu — teks
efek bahasa Indonesia sejumlah kartu diperbaiki karena tidak lagi cocok dengan
maksud aslinya. Kartu `SD01-018` (cetak ulang `BP01-026` dengan teks efek identik)
ikut diperbaiki juga atas konfirmasi pemilik, meski tidak disebut namanya di
dokumen errata resmi. Teks bahasa Inggris (`e_en`) tidak ada yang diubah — sudah
lebih dulu cocok dengan versi "Setelah Errata".

Kartu yang direvisi: `BP01-002`, `BP01-026`, `SD01-018`, `BP01-037`, `BP01-043`,
`BP01-046`, `BP01-052`, `BP01-090`, `SD01-007`, `SD04-002`, `SD04-003`, `SD04-005`.

- `cards.js`: field baru `er` (mis. `"V.1"`) ditambahkan ke 12 kartu di atas —
  cuma diisi kalau kartu itu pernah direvisi resmi, dirancang supaya errata
  berikutnya (V.2, dst — pemilik bilang akan ada lagi ke depannya) tinggal
  menimpa nilai field ini
- Halaman Kartu: lencana kecil **"Errata"** muncul di kartu yang punya field
  `er` — tampil di tampilan daftar, grid, dan popup gambar (lightbox), dengan
  tooltip yang menyebutkan nomor versi errata-nya
- Diverifikasi (Chromium headless): ke-12 kartu di atas menampilkan lencana +
  tooltip yang benar di ID & EN, di ketiga tampilan (daftar/grid/lightbox),
  tidak ada error konsol

### v6.11 — 28 Agustus 2026 · nama aksi "Penempatan BASE" diganti (rawan salah paham)
Masukan dari pemilik atas screenshot bagian Action Phase di v6.10: nama
"Penempatan BASE" berisiko disalahpahami — seolah menaruh kartu apa pun ke
BASE dibatasi 1× per giliran, padahal batas 1× itu khusus untuk kartu
tertutup/set card. Memanggil karakter ke BASE (poin di bawahnya) punya batas
sendiri (3×), bukan bagian dari batas ini.

- Nama aksi diganti jadi **"Pasang Kartu Tertutup / Set Card"** (ID) /
  **"Set a Card Face-Down"** (EN) — lebih spesifik, tidak menyebut "BASE" di
  namanya supaya tidak tertukar dengan pemanggilan karakter ke BASE
- Ditambahkan catatan silang singkat di kedua poin ("beda dengan memanggil
  karakter ke BASE — itu tidak termasuk batas 1× ini") supaya hubungan
  keduanya jelas dari awal
- Diverifikasi ulang (Chromium headless): nama aksi baru tampil benar di ID &
  EN, istilah lama tidak tersisa di mana pun, tidak ada error konsol

### v6.10 — 28 Agustus 2026 · koreksi Action Phase (dari pemilik) + istilah FIELD/BBM
Enam koreksi/tambahan langsung dari pemilik soal Action Phase di halaman Panduan:

- **Panggil Karakter** boleh diletakkan di slot BATTLE **atau** BASE, bukan cuma BATTLE — batas 3
  pemanggilan per giliran tetap berlaku terlepas dari mana kartunya diletakkan
- Ditambahkan istilah yang biasa dipakai pemain untuk membayar biaya panggilan Level 4+:
  **"bayar cost/biaya"** dan **"sacrifice"**, berdampingan dengan istilah resmi "retreat"
- **BATTLE-BASE move** kini disingkat **BBM** di seluruh Panduan (istilah yang lebih umum dipakai
  pemain) — dan ditambahkan aturan yang sebelumnya belum tercatat: karakter yang **baru dipanggil di
  giliran yang sama belum bisa BBM**, harus menunggu giliran berikutnya, kecuali ada efek kartu lain
  yang secara khusus mengizinkannya lebih awal
- **FIELD** kini didefinisikan eksplisit sebagai gabungan BATTLE + BASE (sebelumnya ditulis lebih
  longgar sebagai "area permainan") — ditambahkan sebagai istilah baru di daftar Istilah Penting,
  bersama BBM
- Penempatan BASE (set card + tarik 1 kartu) dikonfirmasi tetap sama seperti sebelumnya
- Diverifikasi ulang (Chromium headless): teks FIELD/BBM/sacrifice tampil benar di ID & EN, tidak
  ada error konsol

### v6.9 — 28 Agustus 2026 · bagian baru: Aturan Pertandingan &amp; Turnamen
Ditambah section baru di halaman Panduan (dwibahasa ID/EN) soal pelaksanaan
pertandingan — bukan aturan permainan inti, dan sebagian belum diatur resmi
oleh pihak MHR, jadi ditulis sesuai info dari pemilik/konvensi komunitas saat
ini, dengan catatan jelas kalau ini bisa berubah:

- **Penentuan first/second**: coin toss atau lempar dadu, tergantung
  kesepakatan kedua pemain
- **Batas waktu pertandingan**: belum ada aturan resmi dari pihak MHR. Kalau
  LGS/turnamen menetapkan sendiri, urutan penentuan pemenang saat waktu habis:
  (1) Rush Point terbanyak di TIMELINE, (2) kalau seri, kartu tersisa di Main
  Deck terbanyak, (3) kalau masih seri, coin toss/lempar dadu
- **Format pertandingan**: saat ini Best of 1 untuk turnamen LGS maupun
  turnamen resmi, dengan catatan berpotensi berubah di babak-babak tertentu
  turnamen resmi ke depannya (penyisihan vs. Top 32/16/8/4) — belum ada
  ketetapan pasti
- Bagian ini diberi kotak catatan eksplisit bahwa isinya konvensi
  komunitas/LGS saat ini, bukan aturan tertulis resmi — supaya tidak dikira
  seolah-olah sudah baku
- Diverifikasi ulang (Chromium headless): section baru `pd-turnamen` tampil
  benar di ID & EN, tautan TOC cocok, tidak ada error konsol

### v6.8 — 28 Agustus 2026 · koreksi aturan di halaman Panduan (dari pemilik)
Empat koreksi langsung dari pemilik/pemain, hasil baca ulang v6.7:

- 🆕 **Adjustment Phase** ditambah sebagai fase tersendiri (antara Action Phase
  dan Battle Phase) — sebelumnya "reposisi hingga 4 karakter" tertulis sebagai
  langkah pertama Battle Phase, padahal itu fase terpisah. Alur giliran di
  Panduan sekarang 7 fase: Start → Draw → Action → **Adjustment** → Battle →
  Counter → End. Diagram area permainan & Battle Phase disesuaikan
- **Diperbaiki:** penjelasan RETREAT sebelumnya menyiratkan kartu yang *sudah*
  ada di area RETREAT itulah yang "ditarik kembali" untuk membayar panggilan
  Level 4+ — kebalik. Yang benar: biaya Level 4+ adalah *memindahkan* kartu
  dari BATTLE ke RETREAT (aksi retreat), bukan memakai kartu yang sudah lebih
  dulu ada di sana. Kartu yang sudah di RETREAT normalnya tidak aktif, kecuali
  ada efek kartu lain yang membawanya balik ke tangan/FIELD/deck
- **Diperjelas:** kartu di VOID juga bisa kembali ke FIELD kalau ada efek kartu
  yang mendukungnya — sebelumnya kesan "di-prune" ditulis seolah selalu permanen
- **Diperjelas:** catatan giliran pertama sekarang menyebutkan detail penuh —
  pemain pertama hanya boleh menaruh 1 kartu tertutup di BASE, memanggil 1
  karakter (bukan sampai 3), dan tidak bisa menyerang BATTLE lawan sama sekali
- Diverifikasi ulang (Chromium headless): 12 bagian dengan `pd-adjust` di
  posisi baru, seluruh tautan TOC cocok, teks koreksi tampil benar di ID & EN,
  tidak ada error konsol

### v6.7 — 28 Agustus 2026 · halaman Panduan Bermain untuk pemain baru
Permintaan: panduan dan peraturan lengkap untuk pemain yang belum paham aturan
Marvel Hero Rush, ditampilkan langsung di situs.

- 🆕 **Tab navigasi baru "Panduan"** (dwibahasa ID/EN, tampil di kedua bahasa —
  beda dari Deck Komunitas & Weekly Rush LGS yang sengaja disembunyikan di mode
  Inggris). Isinya: cara menang, apa yang perlu disiapkan (Main Deck 50 + Rush
  Point Deck 9), anatomi kartu, diagram area permainan (FRONT/WING/WING/BACK +
  BASE/RETREAT/VOID/DECK/RUSH DECK/TIMELINE), alur 6 fase satu giliran, detail
  Action Phase (Penempatan BASE, Panggil Karakter, syarat Level 4+, BATTLE-BASE
  move), detail Battle Phase (urutan serang, Target Phase, mini-Counter Phase,
  Langkah Keputusan), enam Kemampuan Kunci (Counter/Block/Double-Attack/Assault/
  Air Strike/Unique), empat Jenis Efek (Trigger/Automatic/Activate/
  Counter-Activate), istilah penting lain, dan ringkasan aturan menyusun deck
- Konten dirangkum dari dua poster rulebook resmi terbitan PT. Jason
  Entertainment Indonesia (CARDFUN) — "Area Permainan" dan "Tata Cara Bermain" —
  dicocokkan silang dengan `cards.js` dan aturan yang sudah divalidasi Deck
  Builder. Istilah kemampuan kunci sengaja memakai penamaan resmi Indonesia
  (Counter/Block/Double-Attack/Assault/Air Strike/Unique) yang cocok dengan kode
  di teks kartu — bukan istilah dari terjemahan rulebook tidak resmi lain yang
  mungkin beredar dengan penamaan berbeda
- Verifikasi (Chromium headless): tab muncul dan berfungsi di kedua bahasa,
  konten berganti penuh saat toggle ID/EN, halaman Deck Komunitas & Weekly Rush
  LGS tetap tersembunyi seperti biasa di mode Inggris, tampilan mobile (5 tab di
  navigasi bawah) rapi, tidak ada regresi di halaman lain

### Tambahan deck komunitas — 27 Agustus 2026 *(hanya `data.js`)*
- **7 deck baru dari China** masuk galeri Deck Komunitas: Merah Kuning - Ultron,
  Merah Biru - F4, Biru Hijau - BBM, Biru Hijau - Loki, Merah Hijau - Thunder Ally,
  Biru Hijau - BBM Control, Merah Biru - Aggro. Total kini **18 deck komunitas**
- Setiap kode sudah diverifikasi lebih dulu (headless, `decodeDeck` + `cards.js`
  asli): tepat 50 kartu, maksimal 2 warna, tidak ada yang melebihi 3 salinan per
  nama karakter, dan tidak ada nomor kartu yang tidak dikenali — semuanya lolos
- `index.html` **tidak berubah** (tetap v6.6) — cukup unggah ulang `data.js`

### v6.6 — 27 Agustus 2026 · bisa dipasang & jalan offline (PWA), navigasi popup, sisa i18n
Masih lanjutan sesi yang sama. Dua permintaan: "beres-beres kecil dulu" dan
"PWA / bisa dipakai offline" dari daftar rekomendasi yang saya berikan.

- 🆕 **Situsnya sekarang bisa "Add to Home Screen"** di HP (Android & iOS) dan
  **tetap jalan tanpa internet** — termasuk 208 kartu dan gambarnya, kalau sudah
  pernah dibuka sekali sebelumnya. Tiga berkas baru: `manifest.json` (nama,
  ikon, warna tema), `sw.js` (service worker — logikanya ada di komentar
  berkasnya sendiri), dan folder `icons/`
- **Strategi cache sengaja network-first untuk `index.html`/`cards.js`/`data.js`**
  (bukan cache-first) — begitu online, versi terbaru dari server SELALU diambil
  duluan dan cache-nya diperbarui diam-diam; cache cuma dipakai kalau benar-benar
  offline. Ini supaya update situs & perubahan jadwal LGS di `data.js` langsung
  kepakai, bukan mengulang masalah "kok masih versi lama" yang pernah terjadi
  gara-gara cache browser biasa. Gambar kartu (`images/`) sebaliknya cache-first
  karena praktis tidak pernah berubah — ini yang bikin mode offline & hemat
  bandwidth kepakai
  Sudah diuji: matikan koneksi lewat Playwright setelah kunjungan pertama →
  situs tetap memuat 208 kartu dengan benar
- **Ikon PWA dibuat dari palet situs sendiri** (huruf "M" warna accent di atas
  warna ink) — bukan turunan `og-image.jpg`. Tinggal timpa berkas di `icons/`
  kalau mau motif lain, ukurannya (16/32/180/192/512 px) jangan diubah
- 🆕 **Navigasi ◀ ▶ di popup kartu** — tombol di kiri-kanan gambar, atau panah
  kiri/kanan di keyboard, untuk pindah ke kartu tetangga dalam daftar yang
  sedang tampil (menghormati filter aktif) tanpa perlu menutup popup dulu
- 🔧 **Sisa kecil-kecil:** urut "Nama" di halaman Cards sekarang ikut bahasa
  aktif (sebelumnya tetap urut nama Indonesia walau mode Inggris); placeholder
  gambar di popup kartu (saat gambar gagal dimuat) ikut bahasa aktif; label
  "Sebaran level"/"Warna" di panel simulasi draw ikut kamus dua bahasa; tombol
  "Tutup" di popup kartu disamakan dengan tombol Tutup lain (sebelumnya satu-
  satunya yang belum pakai kamus)

### v6.5 — 27 Agustus 2026 · sisa i18n, filter kota, dan panel deck di Safari iOS
Lanjutan dari sesi yang sama dengan v6.4 — membereskan beberapa item tertunda
di catatan serah-terima sesi.

- 🔧 **Sisa kebocoran i18n dibereskan:** tombol "Salin link" di Deck Builder yang
  masih menampilkan "Deck masih kosong." walau mode Inggris aktif; filter warna di
  galeri Deck Komunitas ("Semua" belum ikut bahasa aktif); dan nama deck komunitas
  yang tetap Indonesia ("Merah - Hijau") saat dimuat/dipratinjau di mode Inggris —
  sekarang ikut diterjemahkan ("Red - Green") seperti yang sudah berlaku di kartu
  galerinya. Ketiganya hanya kelihatan kalau situs dibuka dengan `?lang=en` (dan,
  untuk galeri Deck Komunitas, `?admin=1` juga)
- **Baris filter kota kini bisa digulir ke samping**, bukan turun berbaris-baris,
  begitu jumlah kota bertambah (sekarang 6 kota + "Semua kota" = 7 chip). Diuji di
  lebar 375px: baris tetap satu baris dan bisa digeser
- 🔧 **Panel deck (sidebar & drawer HP) pakai `100dvh`** kalau browsernya mendukung,
  dengan `100vh` sebagai cadangan. Di Safari iOS, `100vh` terikat ke tinggi viewport
  saat address bar disembunyikan, jadi panelnya kelihatan "lompat"/kepotong tiap kali
  address bar muncul-hilang saat scroll — ini salah satu kandidat penyebab isu
  "Safari iOS ±70% lebih lambat" yang dicatat di sesi sebelumnya. Perbaikan ini
  berdasarkan audit kode (pola `100vh` + `position:fixed`/`sticky` yang dikenal
  bermasalah di WebKit), **belum diverifikasi dengan perangkat Safari iOS asli** —
  laporan Cloudflare berikutnya (±akhir September) akan jadi konfirmasi sebenarnya
- Tabel jadwal di bagian "Cara mengubah jadwal Weekly Rush LGS" disamakan dengan
  `data.js`: 10 → **15 toko, 13 → 20 sesi/minggu, 3 → 6 kota**

### v6.4 — 27 Agustus 2026 · perbaikan performa + ganti nama menu
Berdasarkan laporan Cloudflare 28 Juli – 27 Agustus (5.240 kunjungan, 76% dari HP).
Yang diperbaiki adalah elemen yang persis disebut di Debug View laporan itu.

- **Menu "Turnamen" jadi "Weekly Rush LGS"** (di HP: "Rush LGS"), termasuk judul
  halaman. Istilah "turnamen" diganti "sesi" di catatan bawah, karena main mingguan
  di LGS sifatnya santai — bukan turnamen berhadiah besar
- ⚡ **Pencarian diberi jeda 150 ms.** Sebelumnya tiap ketukan tombol membangun ulang
  HTML 208 kartu (INP 312 ms di `#q`). Mengetik "hulk" kini menggambar ulang **1×**,
  bukan 4×
- ⚡ **Render berat ditunda satu frame** pada tombol "Muat ke Deck Builder" (392 ms,
  110 kejadian — interaksi paling sering) dan tab navigasi (sampai 504 ms), sehingga
  tombolnya merespons lebih dulu sebelum 208 kartu digambar ulang
- ⚡ **Pratinjau melayang dipindah ke `transform`.** Menggeser elemen lewat `left`/`top`
  dihitung browser sebagai layout shift — ini penyumbang CLS terbesar kedua
  (`#hoverPrev`, 50 kejadian). Terukur turun dari ±1 menjadi **0**
- ⚡ **Lebar angka di pill header dan lencana tab dipesan** (`min-width` + angka
  tabular), plus nilai awalnya disamakan dengan nilai akhir. Ini menghapus penyumbang
  CLS terbesar (`div.hdr-stats`, 90 kejadian) yang muncul saat JavaScript mengisi angka
- ⚡ **Di layar Lihat deck, gambar kini ditumpuk di atas placeholder** alih-alih
  menggantikannya, jadi tinggi kartu tidak pernah berubah saat gambar selesai dimuat
  (`#dvGrid>div.dv-card`, 40 kejadian) — terukur **0** pergeseran
- ⚡ **`decoding="async"` pada gambar kartu** di daftar, popup, dan simulasi — membantu
  Safari iOS yang di laporan tercatat paling lambat (P75 2.067 ms vs 1.237 ms Chrome
  Mobile)

### v6.3 — 26 Agustus 2026
- **Mode Inggris disederhanakan: hanya menu Cards dan Deck Builder.** Tab
  **Deck Komunitas** ikut disembunyikan (sebelumnya hanya Turnamen), karena isinya
  konten komunitas Indonesia. Fokusnya sekarang murni ke deck builder
- Alamat `#meta` dan `#lgs` di mode Inggris otomatis dialihkan ke halaman Cards
- **Mode admin dikecualikan** — dengan `?admin=1`, tab Deck Komunitas tetap terlihat
  walau bahasanya Inggris, supaya pembuat kode deck tidak terkunci
- Link deck yang dibagikan tetap berfungsi penuh di mode Inggris

### v6.2 — 26 Agustus 2026 · versi bahasa Inggris dituntaskan
Ditujukan agar pemain di Singapura, Malaysia, dan Thailand yang memakai kartu versi
Inggris bisa memakai Deck Lab sepenuhnya.
- **Deteksi bahasa otomatis** — pengunjung baru yang browsernya bukan Bahasa Indonesia
  langsung mendapat tampilan Inggris. Pilihan manual tetap menimpa dan tersimpan
- **Link `?lang=en` / `?lang=id`** untuk dibagikan langsung ke grup komunitas luar negeri
- **Judul tab dan deskripsi preview link** ikut bahasa aktif, jadi pratinjau di
  WhatsApp/Discord tidak berbahasa Indonesia bagi mereka
- **Tab Turnamen tidak ditampilkan di mode Inggris** (isinya jadwal LGS Indonesia);
  alamat `#lgs` otomatis dialihkan ke halaman Kartu
- **±25 teks yang sebelumnya masih Indonesia** kini ikut bahasa aktif: panel simulasi
  draw beserta seluruh peringatannya, layar Lihat deck dan tip WhatsApp, pilihan
  resolusi unduhan, pesan ekspor HD, kotak "deck yang dibagikan", tombol di galeri
  Deck Komunitas, pesan pemilih varian artwork, catatan panel deck, dan footer
- **Nama warna diterjemahkan di seluruh tampilan** — komposisi warna di panel deck,
  layar Lihat deck, gambar HD, dan nama deck komunitas ("Merah - Hijau" → "Red - Green")
- Nama kartu di panel simulasi dan placeholder Lihat deck kini ikut bahasa aktif
  (sebelumnya selalu Indonesia)
- 🔧 **Fix:** tombol navigasi yang disembunyikan tetap tampil karena atribut `hidden`
  kalah dari `display:flex` di CSS

### Tambahan jadwal — 26 Agustus 2026 *(hanya `data.js`)*
- **Catnie Hobbies & Games** (Tangerang Selatan) masuk daftar — Minggu 14.00 WIB.
  Total kini **10 toko · 13 sesi per minggu · 3 kota**
- Filter kota otomatis bertambah jadi tiga: Jakarta 5 · Tangerang Selatan 1 · Batam 4
- `index.html` **tidak berubah** (tetap v6.1) — cukup unggah ulang `data.js`

### v6.1 — 26 Agustus 2026
- **Jadwal turnamen diperbarui: 4 toko baru di Batam** — Gattchaa One Batam Mall (Senin
  19.30), House of Cards (Rabu 19.00), Gale Force Games (Jumat 19.00 & Minggu 16.00),
  dan Gattchaa Mega Mall Batam Center (Sabtu 17.30). Jadwal Jakarta tetap berjalan,
  jadi totalnya kini **9 toko · 12 sesi per minggu**
- **Keterangan kota** pada setiap toko — tampil sebagai lencana kecil di panel "Hari ini",
  kartu per hari, dan daftar toko, sehingga jelas jadwal itu di kota mana
- **Filter kota** di atas jadwal (Semua kota · Jakarta · Batam) lengkap dengan jumlah
  tokonya. Filter ini menyaring panel "Hari ini", kartu per hari, dan daftar toko
  sekaligus, dan **muncul otomatis hanya kalau ada lebih dari satu kota**
- **Zona waktu ditampilkan di setiap jam main** (`19.30 WIB - Selesai`), diambil dari
  field `tz` per toko — siap untuk WITA dan WIT saat ada toko di zona lain. Ditambah
  keterangan di catatan bawah bahwa jam mengikuti zona kota tokonya, bukan zona perangkat
- 🔧 **Fix:** ikon peta di panel "Hari ini" tampil sangat besar karena belum diberi
  ukuran di CSS. Ikon pada tombol "Lokasi" juga dirapikan
- Format `data.js` bertambah dua field: `kota` dan `tz`. Toko lama tanpa kedua field itu
  tetap tampil normal — lencana dan zona waktunya saja yang tidak muncul

### v6.0 — 20 Agustus 2026
- **Decklist PDF dirapikan** sesuai masukan: tulisan "LEMBAR DECKLIST" di kop dihapus
  (kini hanya "MHR DECK LAB" dan tanggal cetak), dan seluruh kaki halaman — keterangan
  fan-made serta alamat situs — dihilangkan
- Nomor halaman **hanya muncul kalau PDF-nya lebih dari satu halaman**, jadi lembar
  decklist satu halaman benar-benar bersih di bagian bawah
- Halaman lanjutan kini berkepala **nama deck** saja (sebelumnya "LEMBAR DECKLIST · nama deck")
- Kunci bahasa yang tidak terpakai lagi (`dlSheet`, `dlNote`) dihapus dari kamus

> Penomoran: setelah v5.9, langkah kecil berikutnya akan tertulis v5.10 yang mudah
> tertukar dengan v5.1 — jadi dinaikkan ke v6.0. Kalau lebih suka pola lain, tinggal
> ubah angkanya di tiga tempat (komentar kepala berkas, `<meta name="version">`, footer).

### v5.9 — 20 Agustus 2026
- **Statistik "Kartu unik" dihilangkan** dari panel Deck Builder, dari ringkasan
  Decklist PDF, dan dari kartu deck di galeri Deck Komunitas. Alasannya: angka itu
  dihitung **per nomor kartu**, sementara batas 3 salinan dihitung **per nama karakter**
  (aturan 101.1.d) — dua cara hitung yang berbeda dengan nama yang mirip, jadi lebih
  berpotensi membingungkan daripada membantu
- Pill di header yang tulisannya juga "Kartu unik" diganti menjadi **"Total kartu"**
  (EN: "Total cards"). Angkanya tidak berubah — itu memang jumlah kartu di database
  (208 di mode Indonesia, 192 di mode Inggris), bukan statistik deck
- Baris statistik deck yang jumlahnya kini ganjil otomatis melebar penuh, jadi tidak
  ada kolom menggantung di panel

### v5.8 — 20 Agustus 2026
- **Cetak kartu proxy dipindah ke Deck Builder.** Tombolnya sekarang di bagian bawah
  panel deck, bukan lagi di tab Deck Komunitas — lebih dekat dengan alur menyusun deck.
  Batas aksesnya tidak berubah: tetap hanya muncul dengan `?admin=1`
- **Tombol "Salin daftar" dihapus.** "Salin tabel" sudah mencakup kebutuhannya
- **Fitur baru: 📄 Decklist PDF** (untuk semua pengguna) — lembar decklist berisi teks
  saja: kop, ringkasan deck, kotak Kode Deck, blok data pemain untuk diisi tangan
  (nama, kontak, event, tanggal, LGS, tanda tangan), lalu tabel kartu per warna dengan
  kolom Nama · Seri · Nomor · Lv · Jumlah, subtotal tiap warna, dan total keseluruhan
  - Berkasnya hanya beberapa KB karena tanpa gambar — enak dicetak hitam-putih
  - Deck 50 kartu (~21 kartu unik) muat satu halaman A4; lebih dari itu otomatis
    berlanjut dengan kepala kolom yang diulang
  - Mengikuti bahasa aktif, termasuk nama kartu
  - Karakter di luar Latin-1 diganti otomatis agar tidak jadi karakter aneh di PDF:
    `「Top Agent」Black Widow` → `"Top Agent" Black Widow`, emoji di nama deck dibuang

### v5.7 — 20 Agustus 2026
- **Fitur cetak kartu proxy dipasang — khusus mode admin.** Tombol
  **🖨 Cetak kartu proxy (PDF)** ada di dalam kotak Mode admin pada tab
  **Deck Komunitas**, jadi hanya muncul saat situs dibuka dengan `?admin=1`
- Output **PDF A4**, kartu **63 × 88 mm**, **9 kartu per halaman**, otomatis terpusat.
  Terverifikasi lewat pengukuran berkas PDF-nya, bukan hanya tampilan layar
- Daftar cetak terisi otomatis dari deck aktif dan bisa disesuaikan per kartu, ditambah
  kartu lain lewat pencarian (nama Indonesia maupun Inggris), atau dimuat ulang dari deck
- Opsi: garis potong di area margin, jarak antar kartu (0 / 2 / 4 mm), kartu teks untuk
  kartu yang belum ada berkas gambarnya, dan catatan kecil di kaki halaman
- Gambar mengikuti **bahasa aktif** dan **pilihan varian artwork**, dengan rantai cadangan
  ke versi Indonesia kalau berkas Inggris/variannya belum ada
- **jsPDF dimuat dari CDN hanya saat tombol Buat PDF diklik**, jadi tidak menambah beban
  muat halaman bagi pengunjung biasa
- Ringkasan menampilkan jumlah kartu, jumlah halaman A4, dan sisa slot kosong di halaman
  terakhir; kartu tanpa berkas gambar ditandai di daftar sebelum PDF dibuat
- 🔧 **Fix:** fungsi `dvImgFallback` sudah tidak ada di berkas sejak refactor, padahal
  masih dipanggil dari layar **Lihat deck**. Akibatnya setiap gambar yang gagal dimuat
  memicu error di Console dan rantai cadangan `.jpg → .png → .webp` tidak pernah jalan.
  Fungsinya dipasang kembali, sekaligus ikut mencoba versi Indonesia kalau berkas
  bahasa aktif tidak ada
- 🔧 **Fix:** nama kartu di layar **Lihat deck** (kartu tanpa gambar) masih memakai nama
  Indonesia walau situs sedang berbahasa Inggris
- 🔧 Blok pesan "cards.js gagal dimuat" yang tertulis dua kali di bagian inisialisasi
  dirapikan jadi satu — versi kedua memanggil elemen tanpa pengaman dan menimpa
  pesan yang lebih informatif
- Catatan: entri `v5.2` yang tertulis dua kali di README ini juga dirapikan

### v5.6 — 20 Agustus 2026
- Tombol **Salin tabel** di panel deck: format teks berkategori warna berisi
  jumlah, nomor kartu, level, dan nama kartu, plus ringkasan komposisi dan
  rata-rata level. Cocok ditempel ke WhatsApp, Discord, atau lembar kerja.
  Format lama ("Salin daftar") tetap ada

### v5.5 — 18 Agustus 2026
- Dukungan sukarela **aktif**: Saweria `saweria.co/data2712`
- Kalimat ajakan dukungan kini bisa diatur dari `data.js` lewat field `teks`
  (mendukung `{id, en}` agar mengikuti bahasa aktif), jadi bisa diubah kapan saja
  tanpa menyentuh `index.html`

### v5.4 — 18 Agustus 2026
- 🔧 **Fix tampilan HP:** pada tampilan daftar, tombol "+ Deck" yang melayang di
  pojok kanan atas menutupi judul kartu yang panjang. Kini tombol turun ke bawah
  kartu di layar sempit, jadi tidak ada teks yang tertimpa. Tampilan grid dan
  desktop tidak berubah
- **Dukungan sukarela (opsional).** Tombol "☕ Dukung" di header dan keterangan di
  footer, muncul **hanya kalau** `window.DUKUNG` diisi di `data.js`. Tautan wajib
  `https://`; selain itu diabaikan demi keamanan. Teks ikut bahasa aktif

### v5.3 — 18 Agustus 2026
- 🔧 Batas kewajaran pada berkas backup: salinan per kartu dipangkas maksimal 99
  dan jumlah deck maksimal 200. Sebelumnya berkas yang rusak atau diedit manual
  bisa memuat angka ekstrem (mis. 999 salinan) yang membuat tampilan deck
  menggambar ratusan kartu dan berpotensi menyendat browser

### v5.2 — 18 Agustus 2026
- **Database kartu dipisah ke `cards.js`.** `index.html` turun dari 214 KB ke 131 KB.
  Menambah set baru kini cukup mengganti `cards.js` — berkas aplikasi tidak disentuh.
  Kalau `cards.js` gagal dimuat, muncul pesan jelas alih-alih halaman kosong
- **Backup & Restore deck.** Tombol di panel deck menyimpan seluruh deck, pilihan
  varian artwork, dan pengaturan ke satu berkas JSON, lalu memulihkannya di
  perangkat lain. Tidak ada server — berkas berpindah lewat penyimpanan Anda sendiri
  - Saat restore, **tanggal pembuatan berkas ditampilkan** beserta keterangan apakah
    lebih baru atau lebih lama dari data di perangkat itu
  - Default **gabung**: deck lama tetap utuh, nama yang bentrok diberi akhiran.
    Opsi timpa tersedia dengan konfirmasi
  - Kartu yang tidak dikenal dilewati dan dilaporkan, bukan menolak seluruh berkas
  - Berkas asing atau rusak ditolak tanpa mengubah data apa pun
  - Pengingat halus muncul kalau deck belum pernah dicadangkan
- **Jadwal turnamen diperbarui**: Ogre Gandaria Neverland kini Jumat 19.00 (sebelumnya
  On Demand), dan Global Hobiz Store menambah sesi Rabu 19.30. Total 7 sesi/minggu

### v5.1 — 17 Agustus 2026 · penyesuaian dengan rulebook resmi
Berdasarkan Comprehensive Rules 1.00 (16 Juni 2026).
- 🔧 **Fix aturan penting:** batas 3 salinan ternyata dihitung **per nama karakter**,
  bukan per nomor kartu (aturan 101.1.d). 19 nama karakter dicetak ulang di seri SD
  dengan nomor berbeda — sebelumnya Deck Lab mengizinkan 3× BP01-018 **dan**
  3× SD01-014 sekaligus (6 salinan nama sama), padahal itu deck tidak sah
- Tombol "+ Deck" otomatis nonaktif dan berubah jadi "Kuota penuh" saat kuota
  nama sudah terpakai, apa pun nomor kartunya
- Penanda **⇄** pada kartu yang namanya dicetak ulang di seri lain, agar pemain
  tahu kuota salinannya digabung
- Keempat deck komunitas sudah diperiksa: semuanya tetap sah

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

## Aturan resmi Marvel Hero Rush (rujukan lengkap untuk Deck Lab)

> Bagian ini kumpulan **seluruh** aturan permainan yang sudah dipelajari dari sumber
> resmi maupun penjelasan pemilik, supaya sesi Claude mana pun — termasuk percakapan
> yang benar-benar baru, tanpa riwayat chat sebelumnya — bisa langsung paham konteks
> aturan cukup dari membaca README ini. **Wajib diperbarui** setiap kali ada rulebook
> resmi baru, errata baru, set kartu dengan mekanik baru, atau temuan baru dari
> pemilik — catat perubahannya di tabel "Riwayat pembaruan aturan" di bagian paling
> bawah bagian ini, jangan cuma menimpa isi tanpa jejak.

### Sumber & tingkat keotoritatifan

1. **Poster cetak resmi CARDFUN / PT. Jason Entertainment Indonesia** — dua poster A3
   Bahasa Indonesia ("Area Permainan Marvel Hero Rush" & "Tata Cara Bermain Marvel
   Hero Rush") yang menyertai produk fisik yang beredar di Indonesia. **Paling
   otoritatif** untuk istilah dan aturan yang dipakai di pasar Indonesia.
2. **Comprehensive Rules 1.03 (Inggris, tidak resmi)** — terjemahan pihak ketiga dari
   rulebook Tiongkok (Google Drive, `kokoh.masyarakat@gmail.com`, update 2026-08-12).
   Riwayat revisi: 1.00 (16 Jun 2026) → 1.01 (24 Jun) → 1.02 (23 Jul) → 1.03 (12 Agu).
   Lebih rinci secara nomor pasal, tapi sebagian nama kemampuannya (lihat tabel di
   bawah) **tidak cocok** dengan poster resmi maupun teks kartu — kalau bertentangan,
   poster resmi dan teks kartu yang menang.
3. **Teks kartu itu sendiri** (`cards.js`) — untuk kebutuhan filter/mekanik di kode,
   selalu cocokkan ke **teks kartu**, bukan ke nama pasal rulebook manapun. Kartu ID
   memakai kurung siku biasa (`[COUNTER]`, `[UNIQUE]`), kartu EN memakai 【】.
4. **Penjelasan pemilik dari pengalaman meja langsung** — menutup celah yang tidak
   dijelaskan rulebook (mis. urutan detail COUNTER STEP, taksonomi Counter call vs
   Counter efek).

### Konstruksi deck

- Main deck **tepat 50 kartu** karakter
- Maksimal **2 warna** per deck
- Maksimal **3 kartu dengan nama karakter yang sama** (per nama, bukan per nomor
  kartu — varian artwork beda nomor tapi nama sama tetap terhitung satu kelompok)
- Rush Point Deck: **9 kartu**, tanpa batasan pemilihan — bukan keputusan deck-building
- 6 warna menurut rulebook: Merah, Kuning, Biru, Hijau, **Orange, Purple** (dua
  terakhir belum terbit produknya — database baru mendukung 4)
- Rarity yang **beredar dan terverifikasi ada di database**: UR, MR, SEC, GR, SR, R,
  ER, PR, TR. Rulebook 1.03 menyebut daftar berbeda (C, SR, UR, MR, SEC, HR, LR, PR,
  ER, TR) — **GR/R vs C/HR/LR masih pertanyaan terbuka**, kemungkinan istilah cetakan
  Indonesia berbeda dari rulebook internasional; jangan asumsikan salah satu benar
  sebelum dicek langsung ke kartu fisik atau API resmi
- Menang saat (rujukan: poster resmi + Comprehensive Rules 1.03 § 103): **(1)** 9
  kartu Rush Point berhasil dikumpulkan di **TIMELINE Anda sendiri** (didapat tiap
  kali karakter Anda berhasil menyerang Weakness lawan), **(2)** deck utama lawan
  mencapai **0 kartu** — kondisi ini bersifat langsung (state-based) begitu deck
  lawan 0 kartu, apa pun penyebabnya (kartu terakhir ditarik ATAU deck dikosongkan
  lewat efek kartu, bukan cuma dipicu saat lawan mencoba menarik), ia langsung
  dinyatakan kalah saat itu juga, **(3)** efek sebuah kartu langsung menyatakan
  seorang pemain sebagai pemenang (belum ada kartu di database yang memakai efek
  ini per 3 September 2026, tapi kondisinya tercantum eksplisit di rulebook)

### Struktur giliran & battlefield

- Tangan awal **6 kartu**; mulligan = kembalikan semua ke **bawah** deck, ambil ulang
  sejumlah sama, kocok deck. Aturan resmi maksimal 1× mulligan; simulator draw di
  Deck Lab sengaja membiarkan berulang untuk eksplorasi
- Tiap giliran: **tarik 2 kartu**; batas tangan **9 kartu**
- **Base Deployment**: taruh 1 kartu tertutup ke BASE lalu tarik 1 kartu, maksimal
  **1× per giliran**
- **Action Summon**: maksimal **3× per giliran**; **giliran pertama pemain pertama
  hanya 1× Action Summon**, dan **Battle Phase dilewati total** di giliran itu
  (temuan dari poster resmi — tidak pernah tercatat di Comprehensive Rules)
- **BASE menampung maksimal 6 kartu** (temuan poster resmi — gabungan karakter +
  kartu set/tertutup, bukan dua kuota terpisah)
- **BATTLE**: FRONT (maks 1) + BACK (maks 1) + 2×WING (maks 1 masing-masing) →
  **maksimal 4 karakter** di BATTLE sekaligus
- Kalau nilai serangan **R = 0, atau tidak ada target sah dalam jangkauan R**,
  karakter itu tidak bisa menyerang (direvisi di rulebook 1.03 — sebelumnya cuma
  disebut "R=0")

### Biaya Summon (kurva level)

- **Level 1–3**: Summon langsung, tanpa biaya tambahan
- **Level 4+**: harus me-RETREAT (buang) kartu di FIELD sendiri yang **total
  Level-nya sama persis** dengan Level kartu yang dipanggil
- Kartu tertutup (Set Card) di BASE dihitung sebagai **Level 1** saat dipakai untuk
  membayar biaya Summon Lv4+
- Ini alasan kurva level penting saat menyusun deck — kartu Lv rendah berfungsi
  sebagai "mata uang" untuk memanggil kartu Lv tinggi (rasio Lv1–3 : Lv4–6 di
  database saat ini: 128 : 80)

### Kemampuan kunci — pemetaan istilah (kode SELALU ikut teks kartu, bukan tabel ini)

Poster resmi CARDFUN memakai istilah **yang sama persis dengan teks kartu**. Rulebook
1.03 (terjemahan tidak resmi) memakai nama lain untuk sebagian kemampuan — tabel ini
cuma referensi silang, jangan dipakai untuk filter/UI:

| Istilah kartu / poster resmi | Rulebook 1.03 (tidak resmi) | Pasal | Definisi ringkas | Jumlah kartu (ID/EN) |
|---|---|---|---|---|
| `[COUNTER]` | Respond | 305.1 | Efek berkelanjutan (HAND): kartu boleh **dipanggil** dari tangan saat jendela counter | 23 total (lihat pecahan di bawah) |
| `[BLOCK]` | Intercept | 305.2 | Respond-Activated (BATTLE, 1×/giliran): alihkan target serangan lawan ke kartu ini | 1/1 |
| `[DOUBLE ATTACK]` | Combo | 305.3 | Kartu ini punya kesempatan serang kedua | 2/2 |
| `ASSAULT` | Assault (sama) | 305.4 | Kalau menang bertarung saat menyerang, dianggap berhasil menyerang Weakness | 2/2 |
| `AIR STRIKE` | Air Raid | 305.5 | Boleh menyerang BATTLE berisi karakter seolah itu Weakness | 1/1 |
| `UNIQUE` | Unique (sama) | 305.6 | Tidak boleh ada kartu bernama sama di FIELD sendiri; efek ini tidak bisa hilang | 6/4 |

Kemampuan lain berdasar jenis trigger (bukan kemampuan kunci di atas), dihitung dari
208 kartu (ID/EN): **TRIG 120/111 · AUTO 65/61 · ACTI 42/37**.

### Counter — dua jenis berbeda (jangan disamakan)

Filter "Counter" lama sempat menghitung total 23 kartu yang sebenarnya dua mekanik
berbeda (sudah dipecah di UI sejak v6.15):

- **Counter call (9 kartu)** — kartu ber-`[COUNTER]`, **dipanggil** ke BATTLE saat
  jendela counter, ikut aturan biaya Summon biasa (Lv1–3 gratis / Lv4+ RETREAT
  setara). Batas **1× per pemain per jendela**. Bimodal: Lv1/Lv3 gratis (5 kartu),
  Lv6 bayar RETREAT total Lv6 (4 kartu) — tidak ada Lv4/Lv5.
- **Counter efek / `[COUNTER-ACTI]` (14 kartu)** — yang bekerja efeknya, bukan
  pemanggilan kartu. Zona sumber efek menentukan syaratnya: dari **HAND** (3 kartu,
  bisa dipakai walau papan kosong), **FIELD** (7, sekali per giliran), **BACK** (1),
  atau **BATTLE** (3, sekali per giliran — salah satunya `[BLOCK]`).
- Tidak ada kartu yang punya keduanya sekaligus (0 tumpang tindih)
- Ada 3 kartu yang masuk BATTLE **tanpa** membayar biaya Summon biasa karena
  mekanismenya "tukar" (Replace/Exchange, pasal 301.18) bukan Summon: `BP01-061`
  (tukar dari tangan dengan karakter biru Lv4+ di BATTLE, biaya 2 kartu tertutup
  RETREAT), `SD04-001` (dipasang/attach ke karakter [Human], tidak masuk sebagai
  karakter terpisah), `BP01-096` (tukar dirinya dari FIELD dengan kartu di tangan)

**Urutan COUNTER STEP** (dalam satu deklarasi serangan):

1. Penyerang (A) mendeklarasikan serangan dari FRONT/WING/BACK
2. A mendeklarasikan target ke FRONT/WING/BACK milik lawan (B), sepanjang jarak R
   terpenuhi
3. Masuk COUNTER STEP — **B lebih dulu**, baru A. Masing-masing maksimal 1 counter
   call di jendela ini
4. Tidak ada counter → pertarungan resolve sesuai efek/hasil
5. Ada counter dan target jadi tidak sah → **kembali ke langkah 2**, A deklarasi
   target ulang (aturan ini ditambahkan resmi di rulebook versi 1.02, 23 Juli 2026)

`[BLOCK]` bekerja di jendela ini dengan **mengalihkan** target, bukan membatalkan
serangan sepenuhnya. Ada juga **COUNTER PHASE** — fase terpisah setelah Battle Phase,
sebelum Turn End, beda dari COUNTER STEP yang di dalam pertarungan; teks kartu yang
menyebut "COUNTER PHASE atau COUNTER STEP" memang merujuk ke dua jendela berbeda ini.

### Errata resmi

- **Errata V.1** dari tim MHR Indonesia (diterapkan v6.12–v6.13): 12 kartu bernama +
  reprint `SD01-018` (13 file gambar total, `BP01-046` punya 2 varian art) direvisi
  teksnya — baik di database (`cards.js`, field `er:"V.1"`) maupun di **gambar
  kartunya sendiri** (teks tercetak di gambar ikut diedit ulang, bukan cuma metadata).
  Ditandai badge "Errata" di UI. Gambar versi Inggris tidak diubah (errata bersumber
  Bahasa Indonesia).

### Field yang belum diimplementasikan / masih terbuka

- **Environment (pasal 201.8)** — kode format `S+angka` di kiri bawah kartu, dipakai
  untuk rotasi/legalitas format turnamen. `cards.js` **belum** menyimpan field ini
  sama sekali. Kalau penerbit mulai memberlakukan rotasi, perlu tambah field `env` +
  filter/validasi di Deck Lab.
- **Rarity GR/R vs C/HR/LR** — lihat bagian "Konstruksi deck" di atas, belum
  diverifikasi ke sumber otoritatif.
- **Dropdown "Kemampuan kunci"** — filter gabungan untuk Block/Double Attack/Assault/
  Air Strike/Unique (masing-masing cuma 1–6 kartu, terlalu sedikit untuk tombol
  sendiri-sendiri) — sudah diusulkan, belum dibangun.

### Riwayat pembaruan aturan (tabel ini sendiri — beda dari § Riwayat Update di atas
yang mencatat perubahan kode/data)

| Tanggal | Sumber | Yang berubah/ditemukan |
|---|---|---|
| 17 Agustus 2026 | Comprehensive Rules 1.00 | Baseline pertama: 50 kartu, 2 warna, 3/nama, kurva level, dll. (diterapkan v5.1) |
| 26 Agustus 2026 | Comprehensive Rules 1.03 (tidak resmi) | Nama kemampuan kunci berganti (Respond/Intercept/Combo/dst.), field Environment baru, revisi aturan target R=0, rarity resmi beda dari database (belum sinkron) |
| 26 Agustus 2026 | Penjelasan pemilik + `cards.js` | Taksonomi Counter call (9) vs Counter efek (14), urutan detail COUNTER STEP |
| 28 Agustus 2026 | Poster cetak resmi CARDFUN/Jason Entertainment | Istilah kemampuan **kartu & poster cocok**, rulebook 1.03 yang menyimpang — kode tetap ikut teks kartu; ditemukan BASE maks 6 kartu, syarat menang eksplisit, Battle Phase dilewati di giliran pertama pemain pertama |
| 2 September 2026 | Konsolidasi (bukan sumber baru) | Bagian ini pertama kali disusun dari seluruh temuan di atas jadi satu rujukan tunggal di README, supaya sesi baru tidak perlu membaca ulang riwayat percakapan |
| 3 September 2026 (v6.23) | Klarifikasi pemilik (bukan aturan baru, cuma perjelas teks) | Halaman Panduan Bermain § "Cara Menang" (ID & EN) dan bagian "Konstruksi deck" di atas diperjelas: kondisi menang #2 (deck utama lawan habis) sekarang eksplisit menyebut lawan **langsung dinyatakan kalah** saat itu juga, bukan cuma "tidak bisa menarik kartu". Sekalian dikoreksi typo di README: baris "9 kartu Rush Point ditaruh di TIMELINE **lawan**" seharusnya TIMELINE **sendiri** (sudah benar di teks Panduan Bermain, README yang salah ketik) |
| 3 September 2026 (v6.24) | Comprehensive Rules 1.03 § 103 "Winning the Game" (dibaca langsung dari Google Docs, bukan cuma diingat dari riset 26 Agustus) | Kondisi menang #2 dikoreksi jadi **state-based** — rulebook cuma bilang "deck lawan punya 0 kartu", bukan "dipicu saat lawan mencoba menarik" seperti kalimat v6.23 sebelumnya; berlaku baik kartu terakhir baru ditarik maupun deck dikosongkan via efek kartu. Ditambahkan **kondisi menang #3**: efek kartu bisa langsung menyatakan pemenang (103.1.c) — belum ada kartu di database yang memakainya per hari ini, tapi kondisinya tercantum eksplisit di rulebook. Pemilik dikonfirmasi lebih dulu sebelum diterapkan (poster resmi tetap lebih otoritatif dari rulebook 1.03 kalau suatu saat bertentangan) |

> **Untuk pemilik:** kalau ada pembaruan resmi dari MHR Indonesia/CARDFUN (rulebook
> versi baru, errata baru, set kartu baru dengan mekanik baru), cukup kasih tahu di
> sesi Claude mana pun — bagian ini akan diperbarui, dicatat di tabel riwayat di
> atas, dan (kalau berdampak ke kode) tercermin juga di § Riwayat Update seperti biasa.

## Rencana / ide berikutnya

- [x] ~~Cetak kartu proxy (PDF A4, khusus mode admin)~~ — selesai di v5.7
- [x] ~~Impor deck dari teks (pasangan dari "Salin daftar deck")~~ — selesai di v6.16
- [x] ~~Navigasi ◀ ▶ / panah keyboard di dalam popup kartu~~ — sudah ada sebelum
  v6.18 (baru dikonfirmasi lewat tes); kartu terkait di popup ditambahkan di v6.18
- [x] ~~Duplikat deck untuk mencoba variasi~~ — selesai di v6.18
- [x] ~~Filter mekanik untuk kemampuan kunci rulebook (BLOCK, ASSAULT, AIR STRIKE, UNIQUE)~~
  — selesai di v6.18, sekalian statistik biaya Summon di panel ringkasan deck
- [x] ~~Siapkan warna Orange & Purple saat setnya terbit~~ — taksonomi warna
  otomatis selesai di v6.18; tinggal tambah kartunya sendiri ke `cards.js` nanti
- [x] ~~Filter bar bisa dilipat di HP~~ — sudah ada sebelum v6.18 (dikonfirmasi
  lewat tes), tidak tercatat di daftar ini sebelumnya
- [x] ~~Submission deck dari komunitas dengan batasan moderasi~~ — selesai di v6.18
- [ ] Gambar kartu resolusi lebih tinggi (>450 px) untuk hasil unduhan lebih tajam
- [ ] Pelacakan koleksi kartu yang dimiliki (pekerjaan besar, perlu dipikirkan matang)
- [ ] Update database saat set kartu baru rilis
- [ ] Pertimbangkan Cloudflare Pages jika bandwidth mendekati batas
