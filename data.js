/* ===================================================================
   MHR DECK LAB — DATA KOMUNITAS
   ===================================================================
   Berkas ini berisi data yang Anda kelola sendiri: daftar deck komunitas,
   hasil Top-N turnamen resmi (v6.26), dan jadwal main mingguan LGS.

   PENTING: berkas ini TIDAK ikut diganti saat index.html diperbarui.
   Jadi deck dan jadwal yang Anda tambahkan di sini aman, tidak akan hilang
   walau index.html diunggah ulang dengan versi baru.
   =================================================================== */

/* ========== DECK KOMUNITAS ==========
   Tambah deck baru dengan menyisipkan satu entri di dalam daftar:
     { nm:'Nama Deck', cr:'Nama Pembuat',
       ds:'',
       cd:'1.<kode dari tombol Salin link deck>' },
   Kode bisa dibuat lewat mode admin: buka situs dengan ?admin=1,
   lalu masuk ke tab Deck Komunitas.
   Hapus deck: hapus tiga baris entrinya. Ubah urutan: pindahkan entrinya. */
window.DECK_KOMUNITAS = [
  { nm:'Merah - Hijau', cr:'Fadhel',
    ds:'',
    cd:'1.TWVyYWggLSBIaWphdQ.A0023A0222A0113A0272A0012A0033A1003A1063A0973A0993A1073A1083H0033H0103A0933A0943H0013H0022' },
  { nm:'Merah - Biru', cr:'Fadhel',
    ds:'',
    cd:'1.TWVyYWggLSBCaXJ1.A0023A0053A0223A0833A0632A0663A0903E0161A0113A0773G0063A0643A0273G0043A0671A0291A0153A0013G0011A0131A0611' },
  { nm:'Biru - Hijau', cr:'Fadhel',
    ds:'',
    cd:'1.QmlydSAtIEhpamF1.A0773A0833A0632A0622A0663G0012G0043A1003A1063B0063A0973A0993A1073A1083H0103A0942H0013H0023' },
  { nm:'Merah - Kuning', cr:'Katalio',
    ds:'',
    cd:'1.TWVyYWggLSBLdW5pbmc.A0081A0232A0023A0263A0142A0013A0153A0343A0543F0053F0082F0093F0103A0423A0433F0043A0372A0313A0462' },
  { nm:'Merah - Biru', cr:'China',
    ds:'',
    cd:'1.TWVyYWggLSBCaXJ1.A0013A0023A0231A0643A0663A0611A0773A0833G0012G0062G0043A0671A0903A0153A0273A0291A0223A0741G0023G0113A0632' },      
  { nm:'Merah - Hijau', cr:'China',
    ds:'',
    cd:'1.TWVyYWggLSBIaWphdQ.A0113A0222A0272A0023A0012A0943A0993A1083H0023A1003A1073H0103H0123H0013A1063A0973A0911A0032A0932' },
  { nm:'Biru - Kuning', cr:'Fadhel',
    ds:'',
    cd:'1.QmlydSAtIEt1bmluZw.F0032F0043F0123F0132A0612G0012A0643A0663A0332G0062A0622A0773G0022G0043A0702A0833A0632A0903G0113A0741A0721A0671' },
  { nm:'Merah - Hijau', cr:'@deteprtm',
    ds:'',
    cd:'1.TWVyYWggLSBIaWphdQ.A0023A0033A0933A0943A0973A1083A1063E0162H0093H0103H0123A1073A1003A0992A0282B0062H0022A0922A0131H0011' },
  { nm:'Biru - Hijau', cr:'@deteprtm',
    ds:'',
    cd:'1.QmlydSAtIEhpamF1.A0773G0143A0622A0663G0012A1073G0043A0632A1003A1063B0063A0973A0993A1083H0103A0942H0013H0023' },
  { nm:'Budget SD Hijau - Biru', cr:'@deteprtm',
    ds:'',
    cd:'1.QnVkZ2V0IFNEIEhpamF1IC0gQmlydQ.G0011G0022G0043G0063G0083G0113G0143G0153G0163G0173H0011H0022H0032H0053H0073H0103H0113H0173H0183' },
  { nm:'Budget SD Kuning - Biru', cr:'@deteprtm',
    ds:'',
    cd:'1.QnVkZ2V0IFNEIEt1bmluZyAtIEhpamF1.G0011G0022G0043G0063G0083G0102G0113G0123G0143G0153G0173G0163F0133F0123F0143F0173F0043F0032F0161' },
  { nm:'Merah Kuning - Ultron', cr:'China',
    ds:'',
    cd:'1.TWVyYWggS3VuaW5nIC0gVWx0cm9uIChDaGluYSk.A0142A0263A0233A0343A0372A0403A0432A0523A0533A0572F0012F0053F0083F0092F0062A0112A0072A0313A0203A0542' },
  { nm:'Merah Biru - F4', cr:'China',
    ds:'',
    cd:'1.TWVyYWggQmlydSAtIEY0IChDaGluYSk.A0723A0733A0743A0753G0143G0043G0063G0113G0163G0012E0153E0163E0183A0213A0273A0022A0221E0053' },
  { nm:'Biru Hijau - BBM', cr:'China',
    ds:'',
    cd:'1.QmlydSBIaWphdSAtIEJCTSAoQ2hpbmEp.A0773A0833G0172A0952A0963A0982A0992A1043A1072A1063A1082A1183A1192G0012G0063G0023H0023H0072H0093H0102' },
  { nm:'Biru Hijau - Loki', cr:'China',
    ds:'',
    cd:'1.QmlydSBIaWphdSAtIExva2kgKENoaW5hKQ.G0012G0063H0012H0023H0073H0093H0183H0163A1103A1063A1002A0992A0942A0773A0763A0703A0633A0972A0962' },
  { nm:'Merah Hijau - Thunder Ally', cr:'China',
    ds:'',
    cd:'1.TWVyYWggSGlqYXUgLSBUaHVuZGVyIEFsbHkgKENoaW5hKQ.A0032A0203A0933A1082A1183E0053E0183E0163E0043E0073A0193A0213A0273H0103H0093H0023A0992A1002' },
  { nm:'Biru Hijau - BBM Control', cr:'China',
    ds:'',
    cd:'1.QmlydSBIaWphdSAtIEJCTSBDb250cm9sIChDaGluYSk.A0972A0983A0993A1032A1043A1063A1073A1141A1162A1182H0022H0062H0072H0093H0122A0941A0951G0052G0182G0013A0903A0773' },
  { nm:'Merah Biru - Aggro', cr:'China',
    ds:'',
    cd:'1.TWVyYWggQmlydSAtIEFnZ3JvIChDaGluYSk.A0643A0773G0013G0043A0833G0163G0183G0063G0133G0083G0113A0023A0113A0263A0013A0052A0663' },
];

/* ========== TOURNAMENTS (v6.26) ==========
   Deck Top-N dari turnamen RESMI Marvel Hero Rush (bukan deck komunitas biasa —
   ini hasil pertandingan sungguhan, dikelompokkan per event). Beda dengan
   DECK_KOMUNITAS, bagian ini TIDAK punya jalur submission publik — isinya
   murni ditempel manual oleh pemilik dari hasil resmi (mis. postingan
   Instagram panitia), sama seperti LGS di atas.

   Tambah turnamen baru dengan menyisipkan satu objek event baru di dalam
   daftar window.TOURNAMENTS:
     {
       nama: 'Nama Turnamen',
       tanggal: '30 Agustus 2026',
       lokasi: 'Kota / tempat venue',
       penyelenggara: 'Nama panitia/toko/komunitas penyelenggara',
       sumber: 'https://...',   // link postingan resmi hasil turnamen (opsional)
       top: [
         { pk:'Juara 1', nm:'Merah - Hijau', cr:'', ds:'', cd:'1.<kode>' },
         { pk:'Juara 2', nm:'Kuning - Biru', cr:'', ds:'', cd:'1.<kode>' },
         ...
       ]
     }

   Tiap entri deck di dalam `top` memakai format `cd` PERSIS SAMA dengan
   Community Deck di atas (kode dari tombol "Salin link deck" / mode admin) —
   jadi cara menambah deck baru pun sama: susun deck di Deck Builder, salin
   kodenya, tempel ke `cd`. `pk` = label peringkat (bebas teks: "Juara 1",
   "Semifinalis", "Runner-up", dst — tampil sebagai lencana kecil di kartu
   deck). `cr` = nama pemain/pembuat KALAU diketahui dari sumber resmi —
   kosongkan (`''`) kalau tidak ada datanya, JANGAN ditebak/dikarang nama.
   `nm` sengaja ditulis format warna yang sama dengan Community Deck
   ('Merah - Hijau' dst, urutan CORDER) supaya namaDeckLokal() ikut
   menerjemahkan otomatis kalau suatu saat halaman ini dibuka mode admin.

   Hapus turnamen: hapus satu objek event-nya. Hapus satu deck saja: hapus
   satu entri di dalam `top`-nya. Ubah urutan: pindahkan objeknya. */
window.TOURNAMENTS = [
  {
    nama: 'Multiverse Battle',
    tanggal: '30 Agustus 2026',
    lokasi: 'Gramedia Matraman, Jakarta',
    penyelenggara: 'Marvel Hero Rush Indonesia',
    sumber: 'https://www.instagram.com/marvelherorush.id/',
    top: [
      { pk:'Juara 1', nm:'Merah - Hijau', cr:'', ds:'',
        cd:'1.TWVyYWggLSBIaWphdQ.A0221A0022A0052A0113A0271A0941A0293A0131A0011A0151A1002A1041A1063A0973A0993A1073A1081H0013H0032H0093H0103H0123A0931H0023' },
      { pk:'Juara 2', nm:'Kuning - Biru', cr:'', ds:'',
        cd:'1.S3VuaW5nIC0gQmlydQ.F0133F0043F0123A0332F0032G0012A0671A0701A0773A0833A0902G0022G0043G0113G0133A0622A0632A0643A0663G0062A0612' },
      { pk:'Semifinalis', nm:'Merah - Biru', cr:'', ds:'',
        cd:'1.TWVyYWggLSBCaXJ1.A0081A0223A0232A0023A0113G0012E0062A0013A0152A0672A0773A0833G0043G0113G0133A0621A0632A0643A0663G0061A0612' },
      { pk:'Semifinalis', nm:'Merah - Hijau', cr:'', ds:'',
        cd:'1.TWVyYWggLSBIaWphdQ.A0222A0232A0023A0113A0012H0013A0032A0151E0021A1003A1063H0022B0061A0973A0992A1071A1083H0092H0103H0123A0933A0942' },
    ]
  },
];

/* ========== DUKUNGAN SUKARELA ==========
   Tombol "☕ Dukung" di header dan keterangan di footer hanya muncul kalau
   bagian ini ada dan url-nya diawali https://. Untuk mematikannya sementara,
   cukup beri // di depan tiap barisnya.

   teks: kalimat yang tampil di footer — silakan diubah kapan saja.
         id = Bahasa Indonesia, en = English. */
window.DUKUNG = {
  url:   'https://saweria.co/data2712',
  label: 'Saweria',
  teks: {
    id: 'MHR Deck Lab dibuat dan dirawat sendiri untuk komunitas, gratis dan tanpa iklan. ' +
        'Dukungan sukarela Anda akan dipakai untuk biaya pengembangan fitur selanjutnya.',
    en: 'MHR Deck Lab is built and maintained for the community — free and ad-free. ' +
        'Your voluntary support will go toward developing the next features.'
  }
};

/* ========== JADWAL TURNAMEN LGS ==========
   h  = hari: 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu, 7 Minggu
   w  = jam main. Tulis jamnya saja seperti biasa ('19.30 - Selesai') —
        zona waktu TIDAK perlu diketik di sini, aplikasi menyisipkannya sendiri
        dari field tz, jadi tampil menjadi '19.30 WIB - Selesai'.
   kota = kota tempat toko berada. Ini yang dipakai untuk lencana kota dan
        untuk baris filter di atas jadwal (filter otomatis muncul kalau kotanya
        lebih dari satu).
   tz = zona waktu kota tersebut: 'WIB' (UTC+7, Sumatera–Jawa–Kalbar/Kalteng),
        'WITA' (UTC+8, Bali–NTB–NTT–Kalsel/Kaltim/Kaltara–Sulawesi),
        'WIT' (UTC+9, Maluku–Papua).
   Satu toko boleh punya beberapa jadwal — tambahkan objek lain di dalam jd.
   Field hp (nomor WhatsApp toko) dan wa (link grup WhatsApp) opsional —
   tombolnya otomatis tidak tampil kalau dikosongkan.
   Nomor hp tanpa tanda + dan tanpa spasi, contoh: 6281234567890 */
window.LGS_UPDATE = '4 September 2026';
window.LGS = [
  /* ---------- JAKARTA ---------- */
  { nm:'Ogre Gandaria Neverland', kota:'Jakarta', tz:'WIB',
    map:'https://maps.app.goo.gl/7wAqGnKSyeECnt8C6',
    jd:[ {h:1, w:'19.00 - Selesai'}, {h:5, w:'19.00 - Selesai'} ] },
  { nm:'Global Hobiz Store', kota:'Jakarta', tz:'WIB',
    map:'https://maps.app.goo.gl/8BQJ1EZJQXPyrMqh8',
    jd:[ {h:3, w:'19.30 - Selesai'}, {h:6, w:'13.00 - Selesai'} ] },
  { nm:'TwoStompas', kota:'Jakarta', tz:'WIB',
    map:'https://maps.app.goo.gl/ss2chXHcrwmUJAnF9',
    jd:[ {h:4, w:'19.00 - Selesai'}, {h:6, w:'15.00 - Selesai'} ] },
  { nm:'ONIC TCG Viridian Vault', kota:'Jakarta', tz:'WIB',
    map:'https://maps.app.goo.gl/yLw8FSPnj6wMfDGTA',
    jd:[ {h:7, w:'15.00 - Selesai'} ] },
  { nm:'Sultan Pokebab', kota:'Jakarta', tz:'WIB',
    map:'https://maps.app.goo.gl/A9TFGEr9SEhDYsmAA',
    jd:[ {h:5, w:'19.30 - Selesai'} ] },

   /* ---------- BEKASI ---------- */
  { nm:'Royal Knight Bekasi', kota:'Bekasi', tz:'WIB',
    map:'https://maps.app.goo.gl/py2NMFJ678jVDMxc9',
    jd:[ {h:1, w:'19.30 - Selesai'} ] },
  { nm:'Papa Roger', kota:'Bekasi', tz:'WIB',
    map:'https://maps.app.goo.gl/XmiEfHf9U5w5VBuw5',
    jd:[ {h:2, w:'19.30 - Selesai'} ] },
  { nm:'Monopolis', kota:'Bekasi', tz:'WIB',
    map:'https://maps.app.goo.gl/UKdWFpaSB1seyZgU7',
    jd:[ {h:2, w:'19.00 - Selesai'} ] },

  /* ---------- TANGERANG ---------- */
  { nm:'Invaders Board Game Station', kota:'Tangerang', tz:'WIB',
    map:'https://maps.app.goo.gl/pWxvL18uXMr5EGBC7',
    jd:[ {h:4, w:'19.00 - Selesai'} ] },
  { nm:'Alex Hobby Shop', kota:'Tangerang', tz:'WIB',
    map:'https://maps.app.goo.gl/PLSf5L1EnhnhsGQt8',
    jd:[ {h:5, w:'20.00 - Selesai'} ] },

  /* ---------- TANGERANG SELATAN ---------- */
  { nm:'Catnie Hobbies & Games', kota:'Tangerang Selatan', tz:'WIB',
    map:'https://maps.app.goo.gl/MDPiU3MRvqSWybW27',
    jd:[ {h:7, w:'14.00 - Selesai'} ] },

  /* ---------- DEPOK ---------- */
  { nm:'Savepoint', kota:'Depok', tz:'WIB',
    map:'https://maps.app.goo.gl/truvxqDEXS1Wgoo58?g_st=ic',
    jd:[ {h:5, w:'19.30 - Selesai'}, {h:7, w:'16.00 - Selesai'} ] },

   /* ---------- MEDAN ---------- */
  { nm:'Exordium TCG', kota:'Medan', tz:'WIB',
    map:'https://maps.app.goo.gl/cm9fCd7vSbVdSzwo9?g_st=ac',
    jd:[ {h:2, w:'19.00 - Selesai'}, {h:7, w:'14.00 - Selesai'} ] },

  /* ---------- BATAM ---------- */
  { nm:'Gattchaa One Batam Mall', kota:'Batam', tz:'WIB',
    map:'https://share.google/ufGPacTa06OHPWLfi',
    jd:[ {h:1, w:'19.30 - Selesai'} ] },
  { nm:'House of Cards', kota:'Batam', tz:'WIB',
    map:'https://share.google/D1PSrddxbi4iKLpAY',
    jd:[ {h:3, w:'19.00 - Selesai'} ] },
  { nm:'Gale Force Games', kota:'Batam', tz:'WIB',
    map:'https://share.google/aB4TPR379JHjwGvXY',
    jd:[ {h:5, w:'19.00 - Selesai'}, {h:7, w:'16.00 - Selesai'} ] },
  { nm:'Gattchaa Mega Mall Batam Center', kota:'Batam', tz:'WIB',
    map:'https://share.google/iUeCNf1jNzVs8x2yo',
    jd:[ {h:6, w:'17.30 - Selesai'} ] },

  /* ---------- BALI ---------- */
  { nm:'Arnando Garage', kota:'Bali', tz:'WITA',
    map:'https://maps.app.goo.gl/WhqtYPMQoqB6ZdSt8',
    jd:[ {h:7, w:'18.00 - Selesai'} ] },
];
