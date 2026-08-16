/* ===================================================================
   MHR DECK LAB — DATA KOMUNITAS
   ===================================================================
   Berkas ini berisi data yang Anda kelola sendiri: daftar deck komunitas
   dan jadwal turnamen LGS.

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
     { nm:'Budget SD Kuning - Hijau', cr:'@deteprtm',
    ds:'',
    cd:'1.QnVkZ2V0IFNEIEt1bmluZyAtIEhpamF1.G0011G0022G0043G0063G0083G0102G0113G0123G0143G0153G0173G0163F0133F0123F0143F0173F0043F0032F0161' },
];

/* ========== JADWAL TURNAMEN LGS ==========
   h = hari: 1 Senin, 2 Selasa, 3 Rabu, 4 Kamis, 5 Jumat, 6 Sabtu, 7 Minggu
   Satu toko boleh punya beberapa jadwal.
   Field hp (nomor WhatsApp toko) dan wa (link grup WhatsApp) opsional —
   tombolnya otomatis tidak tampil kalau dikosongkan.
   Nomor hp tanpa tanda + dan tanpa spasi, contoh: 6281234567890 */
window.LGS_UPDATE = '10 Agustus 2026';
window.LGS = [
  { nm:'Ogre Gandaria Neverland', map:'https://maps.app.goo.gl/7wAqGnKSyeECnt8C6',
    jd:[ {h:1, w:'19.00 - Selesai'}, {h:5, w:'On Demand'} ] },
  { nm:'Invaders Board Game Station', map:'https://maps.app.goo.gl/pWxvL18uXMr5EGBC7',
    jd:[ {h:4, w:'19.00 - Selesai'} ] },
  { nm:'Global Hobiz Store', map:'https://maps.app.goo.gl/8BQJ1EZJQXPyrMqh8',
    jd:[ {h:6, w:'13.00 - Selesai'} ] },
  { nm:'TwoStompas', map:'https://maps.app.goo.gl/ss2chXHcrwmUJAnF9',
    jd:[ {h:6, w:'15.00 - Selesai'} ] },
  { nm:'ONIC TCG Viridian Vault', map:'https://maps.app.goo.gl/yLw8FSPnj6wMfDGTA',
    jd:[ {h:7, w:'15.00 - Selesai'} ] },
];
