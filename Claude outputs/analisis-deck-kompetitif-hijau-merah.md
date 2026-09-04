# Deck kompetitif usulan — Hijau/Merah "Retreat Value" (dari database 208 kartu, 3 September 2026)

> **Metodologi & batasan jujur**: ini disusun dari pembacaan penuh `cards.js` (208
> kartu) + aturan konstruksi deck & struktur giliran yang sudah didokumentasikan di
> README ("Aturan resmi Marvel Hero Rush") dan `rulebook-1.03-lengkap.md` —
> **bukan hasil playtest fisik atau simulasi Deck Lab**. Ini teorycrafting berbasis
> teks kartu & kurva, jadi anggap sebagai **titik awal yang kuat untuk diuji di meja
> sungguhan**, bukan deck yang sudah "dijamin menang". Kartu format Indonesia (`e`)
> dipakai sebagai rujukan; kartu tanpa `nm_en`/`e_en` di database berarti belum ada
> versi Inggris.

## Ringkasan: kenapa Hijau + Merah

Deck construction cuma mengizinkan **maksimal 2 warna** per deck. Empat kemampuan
kunci paling langka di seluruh 208 kartu — `[BLOCK]` (1 kartu), `AIR STRIKE` (1
kartu), `ASSAULT` (2 kartu), `[DOUBLE ATTACK]` (2 kartu) — semuanya berperan
langsung membantu kondisi menang utama (9 Rush Point via menyerang Weakness lawan
berulang kali), tapi tersebar di 3 warna berbeda: `[BLOCK]` & `AIR STRIKE` di
**Hijau**, `ASSAULT` di **Kuning**, `[DOUBLE ATTACK]` di **Merah**. Karena cuma
bisa pilih 2 warna, dan Hijau kebetulan sekaligus punya **paket sinergi
"Quantum" Ant-Man** (banyak kartu yang justru mendapat nilai TAMBAHAN saat masuk
RETREAT — lihat di bawah) yang sangat cocok dipasangkan dengan mekanik biaya
Summon Lv4+ (harus RETREAT kartu sendiri senilai Level yang sama), pasangan
**Hijau + Merah** dipilih karena kombinasi ini paling kohesif secara mekanik:
biaya RETREAT yang biasanya dianggap "kerugian" di game lain, di sini justru jadi
mesin nilai (kartu Ant-Man dapat trigger begitu di-RETREAT, dan `[Antimatter]
Iron Man` di Merah scaling langsung dari jumlah kartu yang di-RETREAT untuk
memanggilnya).

## Filosofi arketipe: "Retreat Value" (semi-kontrol, menang lewat Weakness berulang)

Rencana permainan: isi kurva rendah (Lv1–Lv3) yang murah dipanggil dan tetap
berguna saat harus di-RETREAT untuk membayar biaya kartu Lv6 besar, sambil
menyerang Weakness lawan berulang kali dengan karakter murah bertenaga sedang.
`[Justice Descends] New Captain America` (satu-satunya `[BLOCK]` di database)
melindungi Weakness sendiri dari serangan balik, dan `[Quantum Teleportation]
Ant-Man` (satu-satunya sumber `AIR STRIKE`) jadi kartu penutup pertandingan —
begitu papan lawan penuh di late-game (BATTLE lawan terisi 4 kartu, tidak ada
Weakness kosong tersisa), `AIR STRIKE` tetap membuat 1 karakter Anda bisa
"menyerang seolah itu Weakness" walau slotnya terisi.

## Main Deck — 50 kartu (Hijau 28 · Merah 22)

Dicek: tepat 50 kartu ✓, maksimal 2 warna ✓, tidak ada nama kartu dengan >3
salinan ✓ (nomor kartu ganda seperti `BP01-111`/`SD04-015` untuk nama yang sama
dihitung SATU kelompok nama, sesuai aturan "maksimal 3 kartu dengan nama sama").

### Hijau — paket inti "Quantum" Ant-Man (retreat = nilai, bukan kerugian)

| Jml | Kartu | Lv/R/Power | Efek ringkas |
|---|---|---|---|
| 3× | `[Quantum Teleportation] Ant-Man` (SD04-005) | Lv3 R2 P2000 | Masuk RETREAT → Prune diri sendiri → 1 karakter Lv3 ke bawah dapat `AIR STRIKE` giliran ini. **Penutup pertandingan lewat papan penuh.** |
| 3× | `[Quantum Gate] Ant-Man` (BP01-111/SD04-015) | Lv3 R2 P2500 | Masuk RETREAT → Prune diri sendiri → 1 karakter Anda boleh BBM (BATTLE↔BASE). Fleksibilitas posisi gratis. |
| 2× | `[Quantum Superposition] Ant-Man` (BP01-092) | Lv2 R2 P1500 | Masuk RETREAT → Prune diri sendiri → kalau BASE Anda ≥4 kartu, taruh 1 karakter [Avengers] dari tangan ke BASE (percepat kurva). |
| 2× | `[Quantum Collapse] Ant-Man` (BP01-102) | Lv6 R1 P6000 | Masuk RETREAT → Prune diri sendiri → Prune 1 karakter lawan Lv3 ke bawah dari BASE. Removal besar meski kartu ini sendiri "gugur". |

### Hijau — pertahanan & utilitas awal

| Jml | Kartu | Lv/R/Power | Efek ringkas |
|---|---|---|---|
| 3× | `[Justice Descends] New Captain America` (SD04-004) | Lv3 R1 P3500 | **Satu-satunya `[BLOCK]` di database** — alihkan serangan lawan ke kartu ini (1×/giliran). Pelindung Weakness. |
| 3× | `[Darkness Surrounds] Daredevil` (BP01-112) | Lv1 R1 P2000 | Masuk FIELD → RETREAT 1 kartu tertutup lawan di BASE. Power besar untuk Lv1 + disrupsi kurva lawan. |
| 2× | `[Hearing Disarm] Daredevil` (BP01-100) | Lv1 R1 P500 | `[COUNTER]` — bisa dipanggil saat jendela counter; masuk FIELD → 1 karakter lawan dapat R-1 giliran ini (bikin serangan lawan gagal jangkau). |
| 2× | `[Search For Comrade] Falcon` (BP01-106) | Lv1 R2 P500 | Masuk FIELD → buang 1 karakter hijau dari tangan → tarik 2 kartu. Mesin card advantage murah. |
| 1× | `[HYDRA Commander] Crossbones` (SD04-007) | Lv2 R1 P3000 | 1×/giliran: 1 karakter boleh BBM. Fleksibilitas tambahan. |

### Hijau — top-end (Lv6, penutup & kontrol papan)

| Jml | Kartu | Lv/R/Power | Efek ringkas |
|---|---|---|---|
| 2× | `[God Of Story] Loki` (BP01-094) | Lv6 R1 P6500 | Power tertinggi di deck. Akhir giliran Anda → boleh RETREAT paksa 1 karakter lawan LvX atau X kartu tertutup. |
| 2× | `[Weaver of Lies] Loki` (BP01-115/SD04-016) | Lv6 R1 P6000 | Pasif: semua karakter lawan di BACK dapat Lv -2 (mempersulit lawan memanggil kartu besar ke BACK). |
| 2× | `[True Justice] Captain America` (BP01-119/SD04-014) | Lv6 R1 P6000 | Kalau dibuang ke RETREAT lewat efek kartu → boleh ditukar dengan 1 karakter Lv6 Anda di FIELD. Resiliensi terhadap discard lawan. |
| 1× | `[Lord of Battleworlds] Doctor Doom` (TB01-001) | Lv6 R2 P2500 | `UNIQUE` + `[COUNTER]`. Masuk FIELD → Prune 1 kartu lawan Lv2 ke bawah dari FIELD. Removal instan-speed. |

### Merah — payoff & tekanan

| Jml | Kartu | Lv/R/Power | Efek ringkas |
|---|---|---|---|
| 3× | `[Antimatter] Iron Man` (BP01-001) | Lv6 R1 P6500 | **Bintang deck.** Masuk FIELD → Prune 1 karakter lawan LvX ke bawah dari FIELD, X = jumlah kartu yang di-RETREAT untuk memanggil kartu ini. Bayar dengan banyak kartu Lv1 kecil (bukan sedikit kartu besar) → X makin besar → removal makin luas. |
| 3× | `[The Devastator] Hulk` (BP01-020/SD01-015) | Lv1 R1 P1000 | Masuk FIELD → Prune 1 karakter merah dari RETREAT Anda sendiri → tarik 1 kartu. Sinergi alami begitu ada kartu merah lain sudah masuk RETREAT. |
| 3× | `[The Retaliator] Iron Man` (BP01-018/SD01-014) | Lv3 R1 P2500 | Masuk FIELD, kalau karakter Anda lebih sedikit dari BATTLE lawan → 1 karakter lawan Lv3 ke bawah dapat Power -2000 giliran ini. Comeback tool saat tertinggal papan. |
| 3× | `[Thunder Speed] Thor` (BP01-011) | Lv3 R1 P3000 | Masuk FIELD → tarik 1 kartu → kartu ini dapat 2× kesempatan menyerang giliran ini. **Card advantage + tempo langsung dari satu kartu.** |
| 2× | `[Thunder Wrath] Thor` (BP01-025/SD01-017) | Lv6 R2 P5000 | Kalau satu-satunya kartu di BATTLE Anda → dapat `[DOUBLE ATTACK]`. Finisher kalau lawan sudah kehabisan blocker. |
| 2× | `[Top Agent] Black Widow` (BP01-022) | Lv1 R2 P500 | Masuk FIELD, kalau ada [Avengers] lain → boleh paksa RETREAT 1 karakter [AUTO] lawan Lv3 ke bawah. Removal murah untuk kartu pasif lawan. |
| 3× | `[Covert Ops] Black Widow` (BP01-002) | Lv3 R1 P2000 | `[COUNTER-ACTI]` dari tangan — buang kartu ini → 1 karakter lawan di BATTLE dapat Power -2000 giliran ini. Trik instan-speed murah untuk memenangkan Judgment Step. |
| 2× | `[The Retaliator] Black Panther` (SD01-011) | Lv6 R1 P5000 | `[COUNTER]` — bisa dipanggil langsung ke BATTLE saat jendela counter. Ambush 5000 power. |
| 1× | `[Dimension Piercer] Iron Man` (BP01-016) | Lv3 R1 P3500 | 1×/giliran, saat memanggil karakter Lv4+ → boleh pindahkan 1 karakter lawan Lv3 ke bawah dari BATTLE ke BASE lawan (buka Weakness paksa). |

**Kurva Level (50 kartu)**: Lv1 = 12 · Lv2 = 3 · Lv3 = 19 · Lv6 = 16 (sengaja
kosong di Lv4–5 — bukan masalah, karena biaya Summon Lv4+ dibayar dengan TOTAL
Level yang di-RETREAT, bukan harus kartu ber-Level sama persis).

### Rush Point Deck — 9 kartu

Sesuai catatan proyek sendiri (README & `rulebook-1.03-lengkap.md`): Rush Point
Deck **tidak punya pilihan strategis** — 9 kartu apa pun dari set yang dipakai,
tidak ada teks efek yang membedakan. Tidak perlu dipikirkan lebih lanjut.

## Rencana permainan

**Awal (giliran 1–3)**: mulligan cari campuran kartu Lv1 murah + minimal satu
`[Justice Descends] New Captain America` atau `[Covert Ops] Black Widow` untuk
pertahanan awal. Isi BASE tiap giliran (Base Deployment, 1×/giliran, sekalian
tarik kartu), mulai serang Weakness lawan dengan karakter Lv1/Lv3 murah.

**Tengah (giliran 4–7)**: mulai panggil kartu Lv6 dengan membayar RETREAT
memakai kartu-kartu Ant-Man/Daredevil/Black Widow kecil yang justru untung saat
di-RETREAT (trigger Quantum-nya jalan). `[Antimatter] Iron Man` paling kuat kalau
dipanggil dengan membayar BANYAK kartu kecil (X tinggi) daripada sedikit kartu
besar. Pakai `[Covert Ops] Black Widow` / kartu `[COUNTER]` untuk mencuri
Judgment Step yang harusnya kalah.

**Akhir (papan lawan penuh/bertahan penuh)**: `[Quantum Teleportation] Ant-Man`
jadi kunci penutup — RETREAT-kan dia (lewat biaya Summon kartu lain, atau kalah
battle) untuk memberi `AIR STRIKE` ke 1 karakter, tembus BATTLE lawan yang penuh
sekalipun. `[Thunder Wrath] Thor` sebagai satu-satunya kartu di BATTLE memberi
serangan ganda untuk mempercepat hitungan 9 Rush Point di akhir game.

## Kelemahan yang perlu diwaspadai (jujur, bukan cuma promosi)

- **Lv4–5 kosong total** — kalau ternyata ada kartu Lv4/5 kuat yang lebih baik
  dari opsi Lv3/Lv6 yang dipilih di sini, deck ini melewatkannya. Ini pilihan
  sadar demi konsistensi kurva rendah, bukan karena sudah dicek semua opsi Lv4/5
  satu-per-satu.
  `[Antimatter] Iron Man` idealnya dipanggil dengan retreat BANYAK kartu kecil
  (untuk X besar) — kalau tangan tidak punya cukup fodder kecil saat Iron Man
  ingin dipanggil, dampaknya jauh berkurang (removal cuma X=1–2).
- **Bergantung pada RETREAT sebagai sumber nilai** — kalau lawan punya cara
  MENCEGAH kartu Anda masuk RETREAT (misal efek yang justru mem-Prune langsung
  dari FIELD/BATTLE tanpa lewat RETREAT), sebagian trigger Quantum tidak akan
  sempat jalan.
- **Ini teorycrafting, belum playtest** — rasio 20 nama kartu berbeda untuk 50
  slot (rata-rata 2.5 salinan/nama) dipilih untuk konsistensi, tapi urutan
  gambar kartu di tangan nyata bisa saja janggal (misal dapat banyak Lv6 di
  awal tanpa fodder RETREAT cukup). Disarankan diuji beberapa game sungguhan,
  lalu disesuaikan (tukar 2-3 slot) berdasarkan hasil nyata, bukan dipakai
  mentah-mentah sebagai "resep pasti menang".

## Kandidat swap kalau deck terasa kurang pas di meja

- Kalau kurang lini pertahanan: tambah `[Hearing Disarm] Daredevil` ke 3× (dari
  2×) dan kurangi `[Weaver of Lies] Loki` ke 1×.
- Kalau kurang draw/card advantage: tambah `[Search For Comrade] Falcon` ke 3×,
  kurangi `[The Retaliator] Black Panther` ke 1×.
- Kalau ingin coba jalur `ASSAULT` (Kuning) sebagai ganti `[DOUBLE ATTACK]`
  (Merah), pertimbangkan swap seluruh paket Merah dengan Hijau+Kuning — lihat
  `[Hunting Instinct] Black Panther` (BP01-059/SD02-016, Lv6 R3 P4000, dapat
  `ASSAULT` saat masuk FIELD) sebagai titik awal riset lanjutan; belum
  dieksplorasi mendalam di analisis ini.
