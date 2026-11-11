/* ===================================================================
   MHR BATTLE SIM — PILIHAN BAHASA (sim-i18n.js)                     riwayat #50
   ===================================================================
   Pilihan EN / ID untuk tampilan simulator. Kode tampilan tetap menulis teks Inggris; berkas ini menerjemahkan
   teks di layar (menu, baki keputusan, tombol, judul, pengumuman, petunjuk) lewat kamus kalimat utuh + pola.
   Tidak diterjemahkan (versi pertama): Play-by-play / Timeline / isi pengumuman (game log) dan teks pertanyaan efek
   kartu — tetap Inggris dengan istilah resmi. Teks kartu di tab Card memakai teks Indonesia resmi dari cards.js.
   Istilah permainan (CALL, BATTLE, BASE, RETREAT, VOID, HAND, Deck, Rush Point, COUNTER, …) tidak diterjemahkan,
   sama dengan kartu resmi berbahasa Indonesia. Pilihan bahasa disimpan di perangkat (localStorage, bila tersedia).
   =================================================================== */
(function () {
  'use strict';
  const KEY = 'mhrsim.lang.v1';
  let lang = 'en';
  try { const v = localStorage.getItem(KEY); if (v === 'id' || v === 'en') lang = v; } catch (e) { /* abaikan */ }

  /* ---------- kamus kalimat utuh (teks persis, setelah spasi di tepi dibuang) ---------- */
  const EXACT = new Map(Object.entries({
    // menu & mode
    'Resume': 'Lanjutkan', 'Discard': 'Buang', '▶ Unfinished game': '▶ Permainan belum selesai',
    'Practice vs Bot': 'Latihan lawan Bot', 'Play with a friend · same device': 'Main dengan teman · satu perangkat',
    'Find a match': 'Cari lawan', 'Private room with a link': 'Room privat dengan link', 'Match history': 'Riwayat pertandingan',
    'Custom game & test tools': 'Permainan kustom & alat uji', 'Online version': 'Versi online', 'Online play': 'Main online',
    'Train against the bot with your deck. Choose the bot level; clock is optional and undo is free.': 'Berlatih melawan bot dengan deck Anda. Pilih level bot; jam boleh dimatikan dan Undo bebas.',
    'Pass-and-play on one phone or tablet. Choose a flexible turn clock or a 30-minute match clock.': 'Bergantian di satu HP atau tablet. Pilih jam giliran yang fleksibel atau jam pertandingan 30 menit.',
    'Play someone online.': 'Bermain melawan pemain lain secara online.',
    'Create a room and send the link to a friend. Flexible turn clock or 30-minute match clock.': 'Buat room dan kirim link-nya ke teman. Jam giliran fleksibel atau jam pertandingan 30 menit.',
    'Offline games you finish are saved here.': 'Permainan offline yang selesai tersimpan di sini.',
    'Any two decks, human or bot on each side, Sandbox editor, log codes.': 'Dua deck bebas, manusia atau bot di tiap sisi, editor Sandbox, kode log.',
    '← Menu': '← Menu', 'Your name': 'Nama Anda', 'Your deck': 'Deck Anda', 'Deck link or code': 'Link atau kode deck', 'Bot deck': 'Deck bot',
    'Random test deck': 'Deck uji acak', 'Bot level': 'Level bot', 'Easy': 'Mudah', 'Normal': 'Normal', 'Hard': 'Sulit', 'Match 30:00': 'Pertandingan 30:00', 'Who goes first': 'Siapa jalan duluan',
    'Random': 'Acak', 'You': 'Anda', 'Bot': 'Bot', 'Turn clock': 'Jam giliran', 'No clock': 'Tanpa jam', 'Standard': 'Standar', 'Relaxed': 'Santai', 'Long': 'Panjang',
    '▶ Start practice': '▶ Mulai latihan',
    'The bot is a training opponent: Easy picks random legal moves, Normal plays greedy moves, Hard tries its options ahead before choosing (it never sees your HAND or the Deck order). Match 30:00 simulates an official match: one shared 30-minute clock and no per-turn limit; when time runs out, most Rush Points wins, then most cards left in the Deck, then rock-paper-scissors. Undo is always allowed in practice. Finished games are saved in Match history (offline).':
      'Bot adalah lawan latihan: Mudah memilih langkah sah secara acak, Normal memilih langkah yang paling menguntungkan saat itu, Sulit mencoba pilihan-pilihannya lebih dulu sebelum memutuskan (tanpa melihat HAND Anda atau urutan Deck). Pertandingan 30:00 menyimulasikan pertandingan resmi: satu jam bersama 30 menit tanpa batas waktu per giliran; bila waktu habis, Rush Point terbanyak menang, lalu sisa kartu Deck terbanyak, lalu jankenpon. Undo selalu boleh di latihan. Permainan yang selesai tersimpan di Riwayat pertandingan (offline).',
    'Games played on this device (practice, same-device, custom). In Performance, simulator games form their own group; offline and online games are never combined in one statistic, and never mixed with tournament records. Up to 100 games are kept.':
      'Permainan di perangkat ini (latihan, satu perangkat, kustom). Di Performance, permainan simulator punya kelompok sendiri; angka offline dan online tidak pernah digabung dalam satu statistik, dan tidak dicampur dengan catatan turnamen. Maksimal 100 permainan disimpan.',
    'SIMULATOR · OFFLINE': 'SIMULATOR · OFFLINE', 'No games yet. Finish a game and it appears here.': 'Belum ada permainan. Selesaikan satu permainan dan hasilnya muncul di sini.',
    'Replay': 'Putar ulang', 'Log code': 'Kode log', 'Delete': 'Hapus', 'Export (JSON)': 'Ekspor (JSON)', 'Delete all': 'Hapus semua', 'Copied': 'Tersalin',
    'WIN': 'MENANG', 'LOSS': 'KALAH', 'DRAW': 'SERI',
    'Not available yet.': 'Belum tersedia.',
    'Online play arrives with the online version on mhrdecklab.com, after all testing is finished.': 'Main online hadir bersama versi online di mhrdecklab.com, setelah semua pengujian selesai.',
    'Find a match': 'Cari lawan',
    ': play someone online. If nobody is found within 45 seconds, you are offered a game against a bot (Easy, Normal or Hard) while you keep waiting; a bot is always shown as a bot.':
      ': bermain melawan pemain lain secara online. Bila lawan belum ditemukan dalam 45 detik, Anda ditawari main melawan bot (Mudah, Normal, atau Sulit) sambil tetap menunggu; bot selalu ditandai sebagai bot.',
    ': create a room, send the link to a friend, and pick a clock: Standard, Relaxed, Long, no clock, or Match 30:00 (official-match simulation).':
      ': buat room, kirim link-nya ke teman, dan pilih jam: Standar, Santai, Panjang, tanpa jam, atau Pertandingan 30:00 (simulasi pertandingan resmi).',
    'If your phone switches app or tab, your seat is kept for a short time and the simulator reconnects you to the game when you come back.':
      'Bila HP Anda berpindah aplikasi atau tab, kursi Anda ditahan sebentar dan simulator menyambungkan Anda kembali ke permainan saat Anda kembali.',
    'Online games are saved in your account and shown in Performance under the Simulator group, with online and offline statistics kept separate.':
      'Permainan online tersimpan di akun Anda dan tampil di Performance pada kelompok Simulator, dengan statistik online dan offline tetap terpisah.',
    // permainan kustom
    'PLAYER 1': 'PEMAIN 1', 'PLAYER 2': 'PEMAIN 2', 'Name': 'Nama', 'Deck': 'Deck', 'Played by': 'Dimainkan oleh', 'Human': 'Manusia', 'Test bot': 'Bot uji',
    'Paste deck code…': 'Tempel kode deck…', 'GAME MODE · ONE MODE ONLY': 'MODE PERMAINAN · SATU MODE', 'Full automatic': 'Otomatis penuh',
    'Every rule and every card effect is handled by the simulator.': 'Semua aturan dan efek kartu dijalankan simulator.',
    'Only legal choices light up; a choice with a single option still asks you to confirm.': 'Hanya pilihan yang sah yang menyala; pilihan tunggal tetap meminta konfirmasi.',
    'Counter Step and Counter Phase always open for both players (no automatic pass, so a HAND is never revealed).': 'Counter Step dan Counter Phase selalu dibuka untuk kedua pemain (tanpa pass otomatis, supaya isi HAND tidak terbaca).',
    'When time runs out the simulator acts for that player (End Action Phase, no attack, Pass, decline an optional effect). Nobody loses on time.':
      'Saat waktu habis, simulator bertindak untuk pemain itu (akhiri Action Phase, tidak menyerang, Pass, menolak efek opsional). Tidak ada yang kalah karena waktu.',
    'TURN CLOCK': 'JAM GILIRAN', 'Clock': 'Jam', 'First player': 'Pemain pertama', 'Seed (testing)': 'Seed (pengujian)', '▶ Start game': '▶ Mulai permainan',
    'Standard · 2:00 turn / 0:30 response': 'Standar · 2:00 giliran / 0:30 respons', 'Relaxed · 5:00 / 1:00': 'Santai · 5:00 / 1:00', 'Long · 10:00 / 2:00': 'Panjang · 10:00 / 2:00',
    'Match 30:00 · no per-turn limit (official match)': 'Pertandingan 30:00 · tanpa batas per giliran (pertandingan resmi)',
    'SANDBOX · TEST TOOL': 'SANDBOX · ALAT UJI', 'Open Sandbox editor': 'Buka editor Sandbox', 'LOAD LOG CODE · TEST TOOL': 'MUAT KODE LOG · ALAT UJI',
    'Build any position for both players (HAND, BATTLE, BASE, attached cards, RETREAT, VOID, Rush Points, turn), then play it with every card visible and unlimited undo. Useful for testing a ruling or a card effect in one exact situation.':
      'Susun posisi apa pun untuk kedua pemain (HAND, BATTLE, BASE, kartu terpasang, RETREAT, VOID, Rush Point, giliran), lalu mainkan dengan semua kartu terlihat dan Undo tanpa batas. Berguna untuk menguji ruling atau efek kartu dalam satu situasi tertentu.',
    'Resume from log': 'Lanjutkan dari log', 'Watch replay': 'Tonton replay',
    'Community decks (MHR Deck Lab)': 'Deck komunitas (MHR Deck Lab)',
    'Two decks of your choice, each side played by a human or the test bot. With two humans this is pass-and-play on one device, with a handover screen between players. All cards of SD01–SD04, BP01, PB01, EB01, TB01 and SP01 have automatic effects; SD05, SD06 and PB02 are hidden until their official Indonesian release.':
      'Dua deck pilihan Anda, tiap sisi dimainkan manusia atau bot uji. Dengan dua manusia, permainan bergantian di satu perangkat dengan layar serah perangkat. Semua kartu SD01–SD04, BP01, PB01, EB01, TB01, dan SP01 punya efek otomatis; SD05, SD06, dan PB02 disembunyikan sampai rilis resmi Indonesia.',
    'Face-down': 'Tertutup',
    // papan
    'Card': 'Kartu', 'Play-by-play': 'Jalannya permainan', 'Piles': 'Tumpukan', 'Undo': 'Undo', 'Menu': 'Menu', 'Position': 'Posisi', 'Siaga': 'Siaga',
    'Hover or tap a card to read it here: full text, stats and why a stat changed. The attacker and the card you select appear here too.':
      'Arahkan atau ketuk kartu untuk membacanya di sini: teks lengkap, nilai, dan alasan nilainya berubah. Penyerang dan kartu yang Anda pilih juga tampil di sini.',
    'SETUP': 'PERSIAPAN', 'GAME OVER': 'PERMAINAN SELESAI', 'REPLAY': 'REPLAY', 'WAITING': 'MENUNGGU', 'BOT IS ACTING': 'BOT SEDANG BERTINDAK',
    'NOT ALLOWED': 'TIDAK BOLEH', 'CHOOSE THE COST': 'PILIH BIAYA', 'CHOOSE WHERE': 'PILIH TEMPAT', 'STARTING HAND': 'HAND AWAL', 'ACTION PHASE': 'ACTION PHASE',
    'REPOSITION': 'ATUR POSISI', 'CHOOSE TARGET': 'PILIH TARGET', 'CHOOSE ATTACKER': 'PILIH PENYERANG', 'YOUR RESPONSE': 'RESPONS ANDA', 'COUNTER PHASE': 'COUNTER PHASE',
    'OPTIONAL EFFECT': 'EFEK OPSIONAL', 'EFFECT QUESTION': 'PERTANYAAN EFEK', 'ORDER EFFECTS': 'URUTAN EFEK', 'CHOOSE CARDS': 'PILIH KARTU', 'CHOOSE ONE': 'PILIH SATU',
    'NEW TARGET': 'TARGET BARU', 'TIME UP · JANKENPON': 'WAKTU HABIS · JANKENPON', '1ST': '1ST', '2ND': '2ND', 'DISCARD': 'BUANG KARTU', 'DECIDE': 'PUTUSKAN', 
    '★ RUSH POINT': '★ RUSH POINT', 'FIGHT RESULT': 'HASIL PERTARUNGAN', 'TIME RAN OUT': 'WAKTU HABIS', 'TIME UP': 'WAKTU HABIS', 'WHAT HAPPENED': 'YANG TERJADI',
    'End Action Phase': 'Akhiri Action Phase', 'Confirm positions': 'Simpan posisi', 'Skip': 'Lewati', 'Reset': 'Atur ulang', 'No attack': 'Tidak menyerang',
    'Other attacker': 'Penyerang lain', 'Attack!': 'Serang!', 'Change target': 'Ganti target', 'Yes': 'Ya', 'No': 'Tidak', 'Choose cards…': 'Pilih kartu…',
    'Pass': 'Pass', 'Continue': 'Lanjut', 'Cancel': 'Batal', 'Close': 'Tutup', 'Confirm': 'Konfirmasi', 'Next: destination': 'Berikutnya: tujuan',
    'CALL to BASE': 'CALL ke BASE', 'Base Deployment (face-down, draw 1)': 'Base Deployment (tertutup, ambil 1 kartu)', 'Move to BASE': 'Pindah ke BASE', 'Move to BATTLE': 'Pindah ke BATTLE',
    'AIR STRIKE: attack as Weakness': 'AIR STRIKE: serang sebagai Weakness', '✓ Keep this hand': '✓ Pertahankan HAND ini',
    'Copy log code': 'Salin kode log', 'View board': 'Lihat papan', 'Rematch': 'Main lagi', 'Draw': 'Seri',
    'HANDOVER · CLOCKS PAUSED': 'SERAH PERANGKAT · JAM BERHENTI', 'The board is hidden during the handover.': 'Papan disembunyikan selama serah perangkat.',
    'The other player should not look at the screen after the button is pressed. Your side is always shown at the bottom, in blue.':
      'Pemain lain jangan melihat layar setelah tombol ditekan. Sisi Anda selalu tampil di bawah, berwarna biru.',
    'This is the only possible choice. Check it, then press Confirm.': 'Hanya ada satu pilihan. Periksa, lalu tekan Konfirmasi.',
    // riwayat #66 — paket B (petunjuk pendek HP, spanduk giliran, alasan ketukan)
    'This is the only possible choice. It is already selected: press Confirm.': 'Hanya ada satu pilihan dan sudah terpilih: tekan Konfirmasi.',
    'Tap a HAND card to play it · END ACTION when done': 'Ketuk kartu HAND untuk memainkannya · END ACTION bila selesai',
    'Tap a glowing area to place the card.': 'Ketuk area yang menyala untuk menaruh kartu.',
    'Tap a card in your HAND to play it.': 'Ketuk kartu di HAND untuk memainkannya.', 'Press END ACTION when you are done.': 'Tekan END ACTION bila sudah selesai.',
    'Optional: tap two of your areas to swap them, then CONFIRM.': 'Opsional: ketuk dua area Anda untuk menukarnya, lalu CONFIRM.',
    'Tap one of your glowing Characters to attack with it.': 'Ketuk salah satu Karakter Anda yang menyala untuk menyerang.',
    'Tap a glowing target, or pick one from the list.': 'Ketuk target yang menyala, atau pilih dari daftar.',
    'Last chance to play COUNTER cards this turn.': 'Kesempatan terakhir memainkan kartu COUNTER di giliran ini.', 'Play one, or PASS.': 'Mainkan satu, atau PASS.',
    'Play a COUNTER card, or PASS.': 'Mainkan kartu COUNTER, atau PASS.',
    'If nobody responds: you score 1 Rush Point.': 'Bila tidak ada yang merespons: Anda mendapat 1 Rush Point.',
    'If nobody responds: your opponent scores 1 Rush Point.': 'Bila tidak ada yang merespons: lawan mendapat 1 Rush Point.',
    'If nobody responds: you win the Fight and their Character Retreats.': 'Bila tidak ada yang merespons: Anda menang Fight dan Karakter lawan Retreat.',
    'If nobody responds: your Character loses the Fight and Retreats.': 'Bila tidak ada yang merespons: Karakter Anda kalah Fight dan Retreat.',
    'If nobody responds: you win the Fight and their Character Retreats (ASSAULT: +1 Rush Point).': 'Bila tidak ada yang merespons: Anda menang Fight dan Karakter lawan Retreat (ASSAULT: +1 Rush Point).',
    'If nobody responds: your Character loses the Fight and Retreats (ASSAULT: +1 Rush Point).': 'Bila tidak ada yang merespons: Karakter Anda kalah Fight dan Retreat (ASSAULT: +1 Rush Point untuk lawan).',
    'If nobody responds: your attacker loses the Fight and Retreats.': 'Bila tidak ada yang merespons: penyerang Anda kalah Fight dan Retreat.',
    'If nobody responds: the attacker loses the Fight and Retreats.': 'Bila tidak ada yang merespons: penyerang kalah Fight dan Retreat.',
    'If nobody responds: both Characters Retreat.': 'Bila tidak ada yang merespons: kedua Karakter Retreat.',
    'Several effects triggered together.': 'Beberapa efek terpicu bersamaan.', 'Tap the one to resolve first.': 'Ketuk yang diselesaikan lebih dulu.',
    'YOUR TURN': 'GILIRAN ANDA', 'First turn: 1 CALL, no Battle Phase': 'Giliran pertama: 1 CALL, tanpa Battle Phase',
    'Play your cards, then END ACTION': 'Mainkan kartu Anda, lalu END ACTION', 'You can respond when they attack': 'Anda bisa merespons saat lawan menyerang',
    'This card cannot go there. Tap a glowing area.': 'Kartu ini tidak bisa ke sana. Ketuk area yang menyala.',
    "That is your opponent's side. Tap a glowing area on your side.": 'Itu sisi lawan. Ketuk area yang menyala di sisi Anda.',
    'This card cannot move there. Tap a glowing area.': 'Kartu ini tidak bisa pindah ke sana. Ketuk area yang menyala.',
    'This attacker cannot reach that area. Tap a glowing target.': 'Penyerang ini tidak bisa menjangkau area itu. Ketuk target yang menyala.',
    'First tap one of your glowing Characters to choose the attacker.': 'Ketuk dulu salah satu Karakter Anda yang menyala untuk memilih penyerang.',
    'Tap a card in your HAND first, then choose where it goes.': 'Ketuk dulu kartu di HAND, lalu pilih tempatnya.',
    'This Character cannot attack right now. Tap a glowing one.': 'Karakter ini belum bisa menyerang sekarang. Ketuk yang menyala.',
    'Bot is acting': 'Bot sedang bertindak', 'Sandbox · no clock': 'Sandbox · tanpa jam',
    'Replay mode: all cards are visible. Use the slider to step through the game.': 'Mode replay: semua kartu terlihat. Geser slider untuk melihat langkah demi langkah.',
    'Choose a highlighted destination (a BATTLE area or the BASE).': 'Pilih tujuan yang menyala (area BATTLE atau BASE).',
    'Choose a highlighted empty BATTLE area.': 'Pilih area BATTLE kosong yang menyala.',
    'Dropped on the BASE: CALL it face-up into the BASE, or use Base Deployment (face-down, draw 1)?': 'Dilepas di BASE: CALL terbuka ke BASE, atau Base Deployment (tertutup, ambil 1 kartu)?',
    'Move undone.': 'Langkah dibatalkan.', 'There is no move of yours to undo.': 'Tidak ada langkah Anda yang bisa dibatalkan.',
    'All BATTLE areas are occupied.': 'Semua area BATTLE terisi.', 'There is no empty area on your FIELD.': 'Tidak ada area kosong di FIELD Anda.',
    ': last chance this turn for COUNTER cards and COUNTER·ACTI effects': ': kesempatan terakhir giliran ini untuk kartu COUNTER dan efek COUNTER·ACTI',
    'Counter Step': 'Counter Step', 'Counter Phase': 'Counter Phase', 'Order:': 'Urutan:', 'LIVE': 'LIVE',
    '▤ Log': '▤ Log', '🃏 Card': '🃏 Kartu', '☰ Menu': '☰ Menu', '⧉ Log code': '⧉ Kode log', '✎ Position': '✎ Posisi', '⧉ Position': '⧉ Posisi', '↶ Undo': '↶ Undo',
    'Goes first': 'Jalan pertama', 'Goes second': 'Jalan kedua', 'GOING FIRST': 'JALAN PERTAMA', 'ON THE DRAW': 'JALAN KEDUA',
    'TIMELINE': 'TIMELINE', 'All ⤢': 'Semua ⤢', 'NEW': 'BARU', 'EFFECT': 'EFEK', 'FIGHT': 'PERTARUNGAN', 'MOVE': 'PINDAH', 'SWAP': 'TUKAR', 'PLACE': 'TEMPATKAN',
    'REVEAL': 'TUNJUKKAN', 'FLIP': 'BALIK', 'ATTACH': 'PASANG', 'TURN': 'GILIRAN', 'DRAW': 'AMBIL KARTU', 'NO ATTACK': 'TIDAK MENYERANG',
    'TIME': 'WAKTU', 'CALL COST': 'BIAYA CALL',
    'Match time is up': 'Waktu pertandingan habis', 'The simulator acted for the player': 'Simulator bertindak untuk pemain itu',
    '👁 Look at the board': '👁 Lihat papan', '▲ Show choices': '▲ Tampilkan pilihan', 'SET IN BASE': 'SET KE BASE', 'BOTH LOSE': 'SAMA-SAMA KALAH',
    'Tap a HAND card to view/use · drag it onto a glowing area': 'Ketuk kartu HAND untuk melihat/memakai · seret ke area yang menyala',
    'Tap your FIELD cards to Retreat (face-down = Lv1)': 'Ketuk kartu FIELD Anda untuk di-Retreat (tertutup = Lv1)',
    'Choose a zone': 'Pilih area', 'Tap a glowing area': 'Ketuk area yang menyala', 'CALL face-up or set face-down?': 'CALL terbuka atau set tertutup?',
    'Choose in the sheet below': 'Pilih di lembar bawah', 'Reposition (optional)': 'Atur posisi (opsional)', 'Tap two areas to swap, then CONFIRM': 'Ketuk dua area untuk menukar, lalu SIMPAN',
    'Choose an attacker': 'Pilih penyerang', 'Tap a glowing Character': 'Ketuk Karakter yang menyala',
    'Tap a glowing target · an empty area (Weakness) = +1 Rush Point': 'Ketuk target yang menyala · area kosong (Weakness) = +1 Rush Point',
    'Ready to attack': 'Siap menyerang', 'Press ATTACK! or tap another target': 'Tekan SERANG! atau ketuk target lain', 'Choose a new target': 'Pilih target baru',
    'The original Attack Target is gone': 'Attack Target semula sudah tidak ada', 'Last chance for COUNTER cards this turn': 'Kesempatan terakhir untuk kartu COUNTER giliran ini',
    'Time up · jankenpon': 'Waktu habis · jankenpon', 'Choose Rock, Paper or Scissors': 'Pilih Batu, Kertas, atau Gunting', 'HAND limit 9': 'Batas HAND 9',
    'Order the effects': 'Urutkan efek', 'Choose which resolves first': 'Pilih yang diselesaikan lebih dulu',
    'Report a bug / Send feedback': 'Lapor bug / Kirim feedback', '🐞 Bug': '🐞 Bug', '💬 Feedback': '💬 Feedback',
    'What happened? What did you expect instead?': 'Apa yang terjadi? Seharusnya bagaimana?', 'Your feedback or idea': 'Feedback atau ide Anda',
    'Attach this game\'s log code (lets the team replay the game exactly)': 'Lampirkan kode log permainan ini (tim bisa memutar ulang permainan persis sama)',
    'Save & copy report': 'Simpan & salin laporan', 'Download (.txt)': 'Unduh (.txt)', 'Please write a short description first.': 'Tulis penjelasan singkat dulu.',
    '✓ Saved on this device and copied. Paste it in WhatsApp or email to the admin.': '✓ Tersimpan di perangkat ini dan tersalin. Tempel di WhatsApp atau email ke admin.',
    '⧉ Copy log code': '⧉ Salin kode log', '🐞 Report a bug / feedback': '🐞 Lapor bug / feedback', '🐞 Report a bug': '🐞 Lapor bug', '💬 Send feedback': '💬 Kirim feedback', 'Help us improve': 'Bantu kami memperbaiki', 'SD05 test deck (Orange)': 'Deck uji SD05 (Oranye)', 'SD06 test deck (Purple)': 'Deck uji SD06 (Ungu)', '🐞 Report': '🐞 Lapor',
    '✊ Rock': '✊ Batu', '✋ Paper': '✋ Kertas', '✌ Scissors': '✌ Gunting', '⏱ Time up': '⏱ Waktu habis', '⏱ Time up · rock-paper-scissors': '⏱ Waktu habis · jankenpon',
    'Match time is up: moves can no longer be undone.': 'Waktu pertandingan habis: langkah tidak bisa dibatalkan lagi.',
    '9 Rush Points in the Timeline (103.1.a)': '9 Rush Point di Timeline (103.1.a)', "the opposing player's Deck has 0 cards (103.1.b)": 'Deck lawan tersisa 0 kartu (103.1.b)'
  }));
  // Alasan menang (modal akhir & petunjuk): termasuk waktu pertandingan habis (O-14).
  function causeId(c) {
    const ex = { '9 Rush Points in the Timeline (103.1.a)': '9 Rush Point di Timeline (103.1.a)', "the opposing player's Deck has 0 cards (103.1.b)": 'Deck lawan tersisa 0 kartu (103.1.b)' }[c];
    if (ex) return ex;
    let m = c.match(/^match time ran out: more Rush Points \((\d+) vs (\d+)\)$/);
    if (m) return 'waktu pertandingan habis: Rush Point lebih banyak (' + m[1] + ' lawan ' + m[2] + ')';
    m = c.match(/^match time ran out: Rush Points tied, more cards left in the Deck \((\d+) vs (\d+)\)$/);
    if (m) return 'waktu pertandingan habis: Rush Point sama, sisa kartu Deck lebih banyak (' + m[1] + ' lawan ' + m[2] + ')';
    m = c.match(/^match time ran out: Rush Points and Deck tied, won rock-paper-scissors \(round (\d+)\)$/);
    if (m) return 'waktu pertandingan habis: Rush Point dan Deck sama, menang jankenpon (ronde ' + m[1] + ')';
    return c;
  }

  /* ---------- pola kalimat dinamis (berlaku untuk satu text node utuh, pertama yang cocok) ---------- */
  /* ---------- O2 (riwayat #63): main online, riwayat online, laporan langsung ---------- */
  [
    ['Online · private room', 'Online · room privat'], ['Join a room', 'Gabung ke room'], ['Create a room', 'Buat room'], ['Room code', 'Kode room'],
    ['Join room', 'Gabung'], ['Create room & get the link', 'Buat room & dapatkan link'], ['Clock', 'Jam'], ['My friend', 'Teman saya'], ['Me', 'Saya'],
    ['Paste a deck link / code…', 'Tempel link / kode deck…'], ['Play', 'Main'], ['Sandbox', 'Sandbox'], ['MODE', 'MODE'], ['YOUR DECK · SAVED TO YOUR ACCOUNT', 'DECK ANDA · TERSIMPAN DI AKUN'], ['YOUR DECK', 'DECK ANDA'], ['BOT LEVEL', 'LEVEL BOT'], ['PLAY', 'MAIN'], ['Practice', 'Latihan'], ['vs Bot', 'lawan Bot'], ['Standard clock', 'Jam Standar'], ['Friend online', 'Teman online'], ['Room link', 'Link room'], ['Pass-and-play', 'Bergantian'], ['＋ Paste a deck link / code', '＋ Tempel link / kode deck'], ['More options (name, bot deck, clock, first player)', 'Pilihan lain (nama, deck bot, jam, pemain pertama)'], ['FIND A MATCH', 'CARI LAWAN'], ['CREATE OR JOIN A ROOM', 'BUAT ATAU GABUNG ROOM'], ['SET UP THE GAME', 'SIAPKAN PERMAINAN'], ['Every rule and card effect is handled for you. Pick a mode, pick your deck, press PLAY.', 'Semua aturan dan efek kartu diurus untuk Anda. Pilih mode, pilih deck, tekan MAIN.'], ['Paste a deck link / code first.', 'Tempel link / kode deck dulu.'], ['Create a private room and send the link (WhatsApp works well), or enter a room code from a friend. You choose your deck and the turn clock on the next screen.', 'Buat room pribadi dan kirim link-nya (lewat WhatsApp juga bisa), atau masukkan kode room dari teman. Deck dan jam giliran dipilih di layar berikutnya.'], ['You are matched with the next player who is searching: Standard clock 2:00 / 0:30, random first player. After 45 seconds you can play the bot while you keep searching; a bot is always shown as a bot.', 'Anda dipasangkan dengan pemain berikutnya yang sedang mencari: jam Standar 2:00 / 0:30, pemain pertama acak. Setelah 45 detik Anda bisa main lawan bot sambil tetap mencari; bot selalu ditandai sebagai bot.'], ['No saved decks yet. Save a deck to your account in the Deck Builder (☁️ Save active deck to account), or paste a deck link / code.', 'Belum ada deck tersimpan. Simpan deck ke akun Anda di Deck Builder (☁️ Save active deck to account), atau tempel link / kode deck.'], ['Choose one of your saved decks, or paste a deck link / code.', 'Pilih salah satu deck tersimpan Anda, atau tempel link / kode deck.'], ['My Decks', 'Deck Saya'], ['Loading…', 'Memuat…'], ['Log in', 'Masuk'], ['Log in to play online.', 'Masuk untuk main online.'],
    ['Online games need a mhrdecklab.com account so your games and replays are saved to it. Practice vs Bot and same-device games work without logging in.', 'Main online butuh akun mhrdecklab.com supaya permainan dan replay tersimpan di akun Anda. Latihan lawan Bot dan main satu perangkat bisa tanpa masuk.'],
    ['Online play runs inside Battle Sim on mhrdecklab.com.', 'Main online berjalan di dalam Battle Sim di mhrdecklab.com.'],
    ['Open mhrdecklab.com, log in, and choose Battle Sim in the menu.', 'Buka mhrdecklab.com, masuk, lalu pilih Battle Sim di menu.'],
    ['▶ Online game in progress', '▶ Permainan online sedang berjalan'], ['Back to the game', 'Kembali ke permainan'], ['Forget', 'Lupakan'],
    ['Standard 2:00 per turn / 0:30 per response, Relaxed 5:00 / 1:00, Long 10:00 / 2:00. The 3rd timeout loses the game. Match 30:00 = one shared 30-minute clock (most Rush Points, then most cards left in the Deck, then rock-paper-scissors). Undo needs your opponent\'s permission, at most 3 per player. If someone disconnects, their seat is kept for 2 minutes and the clock keeps running.',
      'Standar 2:00 per giliran / 0:30 per respons, Santai 5:00 / 1:00, Panjang 10:00 / 2:00. Timeout ke-3 kalah. Pertandingan 30:00 = satu jam bersama 30 menit (Rush Point terbanyak, lalu sisa kartu Deck terbanyak, lalu jankenpon). Undo perlu izin lawan, maksimal 3 per pemain. Bila koneksi putus, kursi ditahan 2 menit dan jam tetap berjalan.'],
    ['Waiting for your friend', 'Menunggu teman Anda'], ['← Cancel', '← Batal'], ['Share link', 'Bagikan link'], ['Copy link', 'Salin link'],
    ['Send the link to your friend (e.g. WhatsApp). They open it, log in, choose a deck and join. The game starts automatically. The room expires if nobody joins within 30 minutes.', 'Kirim link ke teman Anda (mis. WhatsApp). Teman membuka link, masuk, memilih deck, lalu bergabung. Permainan langsung dimulai. Room kedaluwarsa bila tidak ada yang bergabung dalam 30 menit.'],
    ['Enter the 6-character room code from your friend\'s link.', 'Masukkan kode room 6 karakter dari link teman Anda.'],
    ['Cannot reach the Battle Sim server. Check your internet connection.', 'Server Battle Sim tidak terjangkau. Periksa koneksi internet Anda.'],
    ['Please log in to mhrdecklab.com to play online.', 'Silakan masuk ke mhrdecklab.com untuk main online.'], ['Your login has expired. Please log in again.', 'Sesi masuk Anda habis. Silakan masuk lagi.'],
    ['beta', 'beta'], ['Battle Sim online is in closed testing (admin accounts only).', 'Battle Sim online masih uji tertutup (hanya akun admin).'],
    ['Room not found. Check the code or ask your friend for a new link.', 'Room tidak ditemukan. Periksa kodenya atau minta link baru ke teman Anda.'], ['This room is full.', 'Room ini sudah penuh.'],
    ['This room has expired (not started within 30 minutes).', 'Room ini sudah kedaluwarsa (tidak dimulai dalam 30 menit).'],
    ['Offline (this device)', 'Offline (perangkat ini)'], ['Online (account)', 'Online (akun)'], ['SIMULATOR · ONLINE', 'SIMULATOR · ONLINE'], ['No online games yet.', 'Belum ada permainan online.'],
    ['Games played online with your account. Online and offline statistics are kept separate (O-15).', 'Permainan online dengan akun Anda. Statistik online dan offline tidak digabung (O-15).'],
    ['Log in on mhrdecklab.com to see your online games.', 'Masuk di mhrdecklab.com untuk melihat permainan online Anda.'], ['Coming later', 'Menyusul'],
    ['Undo request', 'Permintaan Undo'], ['Allow', 'Izinkan'], ['Decline', 'Tolak'], ['Claim the win', 'Klaim kemenangan'], ['You win!', 'Anda menang!'],
    ['Each player can undo at most 3 times per game. No answer within 20 seconds counts as "no". The clock is paused while you decide.', 'Tiap pemain boleh Undo maksimal 3 kali per permainan. Tanpa jawaban dalam 20 detik dianggap "tidak". Jam berhenti selama Anda memutuskan.'],
    ['Undo accepted: your last move was taken back.', 'Undo diterima: langkah terakhir Anda dibatalkan.'], ['Your opponent declined the undo.', 'Lawan menolak Undo.'], ['You allowed the undo.', 'Anda mengizinkan Undo.'],
    ['You have used all 3 undos in this game.', 'Jatah 3 Undo Anda di permainan ini sudah habis.'], ['Sending your move…', 'Mengirim langkah Anda…'],
    ['The full log code of an online game is available when the game is over.', 'Kode log lengkap permainan online tersedia setelah permainan selesai.'],
    ['Send report', 'Kirim laporan'], ['Sending…', 'Mengirim…'], ['✓ Sent. Thank you! The MHR Deck Lab team will look at it.', '✓ Terkirim. Terima kasih! Tim MHR Deck Lab akan memeriksanya.'],
    ['The report is sent to the MHR Deck Lab team with your account. A copy is also kept on this device.', 'Laporan dikirim ke tim MHR Deck Lab dengan akun Anda. Salinannya juga disimpan di perangkat ini.'],
    ['The server attaches the full log of this online game, so the team can replay it exactly (your opponent\'s hidden cards are only visible to the admins).', 'Server melampirkan log lengkap permainan online ini supaya tim bisa memutarnya ulang persis (kartu tersembunyi lawan hanya terlihat oleh admin).'],
    ['⚠ Connection lost · reconnecting…', '⚠ Koneksi putus · menyambung ulang…'], ['Connecting…', 'Menyambung…'], ['⚠ Reconnecting… your move was not sent', '⚠ Menyambung ulang… langkah Anda belum terkirim'],
    ['Too many messages, slow down.', 'Terlalu banyak pesan, pelan-pelan.']
  ].forEach(([en, id]) => EXACT.set(en, id));
  // Menu hub + beta (riwayat #76)
  [
    ['MARVEL HERO RUSH · MATCH SIMULATOR', 'MARVEL HERO RUSH · SIMULATOR PERTANDINGAN'],
    ['Practice against the bot, play a friend with a link, or share one device. Every rule and card effect is handled for you.', 'Latihan lawan bot, main dengan teman lewat link, atau bergantian di satu perangkat. Semua aturan dan efek kartu dijalankan simulator.'],
    ['games', 'permainan'], ['wins', 'menang'], ['losses', 'kalah'], ['Engine', 'Mesin'], ['No games yet: start with the bot', 'Belum ada permainan: mulai dari lawan bot'],
    ['Easy · Normal · Hard: starts right away', 'Mudah · Normal · Sulit: langsung mulai'], ['More options', 'Pilihan lain'], ['Deck link or code…', 'Link atau kode deck…'],
    ['Play a friend online', 'Main online dengan teman'], ['Create a room, send the link, pick the clock', 'Buat room, kirim link, pilih jam'],
    ['Create a private room and send the link (WhatsApp works well), or enter a room code from a friend. Turn clock: Standard, Relaxed, Long, none, or Match 30:00.', 'Buat room privat lalu kirim link-nya (lewat WhatsApp misalnya), atau masukkan kode room dari teman. Jam giliran: Standar, Santai, Panjang, tanpa jam, atau Pertandingan 30:00.'],
    ['🔗 Create or join a room', '🔗 Buat atau gabung room'], ['Details', 'Rincian'], ['Queue for an opponent', 'Antre mencari lawan'],
    ['Not open yet. You will queue for an opponent; after 45 seconds you are offered a bot (always shown as a bot) while you keep waiting.', 'Belum dibuka. Anda akan mengantre mencari lawan; setelah 45 detik Anda ditawari main lawan bot (selalu ditandai bot) sambil tetap menunggu.'],
    ['Same device', 'Satu perangkat'], ['Pass-and-play on one phone or tablet', 'Bergantian di satu HP atau tablet'],
    ['Two players take turns on one device, with a handover screen between them. Flexible turn clock or a 30-minute match clock.', 'Dua pemain bergantian di satu perangkat, dengan layar serah perangkat di antaranya. Jam giliran fleksibel atau jam pertandingan 30 menit.'],
    ['👥 Set up the game', '👥 Atur permainan'], ['Build any position', 'Susun posisi apa pun'], ['History', 'Riwayat'], ['Your games', 'Permainan Anda'], ['Tools', 'Alat'],
    ['Custom game, log code', 'Permainan kustom, kode log'], ['Feedback', 'Feedback'], ['Tell us', 'Sampaikan ke kami'],
    ['Battle Sim is in a one-week beta. It may end earlier if no bugs are reported and player feedback is positive.', 'Battle Sim sedang dalam masa beta satu minggu. Beta bisa selesai lebih cepat bila tidak ada laporan bug dan feedback pemain sudah positif.'],
    ['Something wrong with a rule or a card effect? Is anything confusing on your phone? Your report goes straight to the developer.', 'Ada aturan atau efek kartu yang salah? Ada yang membingungkan di HP Anda? Laporan Anda langsung sampai ke pengembang.'],
    ['RECENT GAMES', 'PERMAINAN TERAKHIR'], ['All →', 'Semua →'], ['Games you finish on this device appear here, with a replay.', 'Permainan yang Anda selesaikan di perangkat ini tampil di sini, lengkap dengan replay.'],
    ['last day', 'hari terakhir'], ['🔗 Share replay', '🔗 Bagikan replay'], ['Replay link copied.', 'Link replay disalin.'], ['saving…', 'menyimpan…'],
    ['not saved yet: the server keeps trying, check Match history later', 'belum tersimpan: server terus mencoba, cek Match history nanti']
  ].forEach(([en, id]) => EXACT.set(en, id));
  // Cari lawan (riwayat #77)
  [
    ['Get matched with the next player searching', 'Dipasangkan dengan pemain berikutnya yang mencari'], ['New', 'Baru'],
    ['You are matched with the next player who is searching (Standard clock, random first player). After 45 seconds you can play the bot while you keep searching; a bot is always shown as a bot.', 'Anda dipasangkan dengan pemain berikutnya yang sedang mencari (jam Standar, giliran pertama acak). Setelah 45 detik Anda bisa main lawan bot sambil tetap mencari; bot selalu ditandai bot.'],
    ['⚔️ Find a match', '⚔️ Cari lawan'],
    ['You are matched with the next player who is searching. Clock: Standard 2:00 per turn / 0:30 per response; the 3rd timeout loses the game. Who goes first is random. The game is saved to your account. During the beta there may be few players online: after 45 seconds you can play the bot while you keep searching.', 'Anda dipasangkan dengan pemain berikutnya yang sedang mencari. Jam: Standar 2:00 per giliran / 0:30 per respons; timeout ke-3 kalah. Giliran pertama acak. Permainan tersimpan di akun Anda. Selama beta pemain online mungkin sedikit: setelah 45 detik Anda bisa main lawan bot sambil tetap mencari.'],
    ['player(s) searching now', 'pemain sedang mencari'], ['your deck:', 'deck Anda:'], ['Searching for an opponent…', 'Mencari lawan…'], ['← Cancel', '← Batal'],
    ['No opponent yet.', 'Belum ada lawan.'], ['Play the bot while you keep searching?', 'Main lawan bot sambil tetap mencari?'],
    ['The bot is always shown as a bot and the game is not saved to your online history. When a player is found you are asked whether to switch.', 'Bot selalu ditandai bot dan permainannya tidak masuk riwayat online Anda. Bila pemain ditemukan, Anda ditanya mau pindah atau tidak.'],
    ['🤖 Play the bot while waiting', '🤖 Main lawan bot sambil menunggu'], ['Opponent found', 'Lawan ditemukan'], ['Opponent found:', 'Lawan ditemukan:'],
    ['Answer in the box at the top of the screen.', 'Jawab di kotak di bagian atas layar.'], ['Accept', 'Terima'], ['Waiting for your opponent to accept…', 'Menunggu lawan menerima…'],
    ['Accepting leaves the bot game.', 'Menerima berarti meninggalkan permainan lawan bot.'], ['Still searching for a player…', 'Masih mencari pemain…'], ['Stop searching', 'Berhenti mencari'],
    ['You did not accept in time, so the search stopped.', 'Anda tidak menerima tepat waktu, jadi pencarian berhenti.'],
    ['No opponent was found within 10 minutes. Try again later, or share a private room link with a friend.', 'Tidak ada lawan dalam 10 menit. Coba lagi nanti, atau kirim link room privat ke teman.'],
    ['A new search was started with this account on another device or tab.', 'Pencarian baru dimulai dengan akun ini di perangkat atau tab lain.'],
    ['The search stopped because the connection was lost.', 'Pencarian berhenti karena koneksi terputus.'],
    ['The search stopped (the server restarted). Please search again.', 'Pencarian berhenti (server dimulai ulang). Silakan cari lagi.'],
    ['The search stopped.', 'Pencarian berhenti.'], ['Could not join the queue.', 'Tidak bisa masuk antrean.'], ['The room could not be created. Searching again.', 'Room tidak bisa dibuat. Mencari lagi.']
  ].forEach(([en, id]) => EXACT.set(en, id));
  // Pengaturan konfirmasi window Counter (riwayat #79)
  [
    ['Counter prompts', 'Tanya Counter'],
    ['Counter prompts ON: you are always asked in the Counter Step and Counter Phase.', 'Tanya Counter ON: Anda selalu ditanya di Counter Step dan Counter Phase.'],
    ['Counter prompts AUTO: you pass automatically when you have no COUNTER CALL or ACTI to use.', 'Tanya Counter AUTO: Pass otomatis bila Anda tidak punya COUNTER CALL atau ACTI yang bisa dipakai.'],
    ['Counter prompts OFF: you always pass automatically. Switch back to ON or AUTO to answer attacks.', 'Tanya Counter OFF: Anda selalu Pass otomatis. Kembalikan ke ON atau AUTO untuk menanggapi serangan.']
  ].forEach(([en, id]) => EXACT.set(en, id));
  const RULES = [
    [/^Unfinished game$/, 'Permainan belum selesai'],
    [/^(.+?) · turn (\d+) · saved just now$/, '$1 · giliran $2 · disimpan baru saja'],
    [/^(.+?) · turn (\d+) · saved (\d+) min ago$/, '$1 · giliran $2 · disimpan $3 menit lalu'],
    [/^(.+?) · turn (\d+) · saved (\d+) h ago$/, '$1 · giliran $2 · disimpan $3 jam lalu'],
    [/^(.+?) · turn (\d+) · saved (\d+) days ago$/, '$1 · giliran $2 · disimpan $3 hari lalu'],
    [/^(\d+) offline game\(s\) saved on this device\.$/, '$1 permainan offline tersimpan di perangkat ini.'],
    [/^Your games: (\d+)$/, 'Permainan Anda: $1'], [/^Win rate (\d+)%$/, 'Persentase menang $1%'],
    [/^(.+?) · (\d+) turns · (9 Rush Points|Deck out|Time up|Draw|Other)(.*)$/, (m, a, n, e, rest) => a + ' · ' + n + ' giliran · ' + ({ '9 Rush Points': '9 Rush Point', 'Deck out': 'Deck habis', 'Time up': 'Waktu habis', Draw: 'Seri', Other: 'Lainnya' })[e] + rest.replace(/ · (.+) went first$/, ' · $1 jalan duluan')],
    [/^TURN (\d+) · (.+)$/, 'GILIRAN $1 · $2'],
    [/^Tap your own cards on the FIELD to pay the cost: total Lv (\d+)\/(\d+)\.$/, 'Ketuk kartu Anda di FIELD untuk membayar biaya: total Lv $1/$2.'],
    [/^(.+)'s turn$/, 'Giliran $1'],
    [/^Playing as (.+)$/, 'Bermain sebagai $1'], [/^Online games: (\d+)$/, 'Permainan online: $1'],
    [/^Waiting for (.+) to (.+)…$/, (m, w, x) => { const T = { 'decide on the starting HAND': 'memutuskan HAND awal', 'play the Action Phase': 'memainkan Action Phase', 'play the Battle Phase': 'memainkan Battle Phase', 'choose a new Attack Target': 'memilih Attack Target baru', 'respond in the Counter window': 'merespons di jendela Counter', 'discard cards': 'membuang kartu', 'decide on an effect': 'memutuskan efek', 'answer an effect question': 'menjawab pertanyaan efek', 'choose cards for an effect': 'memilih kartu untuk efek', 'choose an option for an effect': 'memilih opsi efek', 'order effects': 'mengurutkan efek', 'choose rock, paper or scissors': 'memilih jankenpon', continue: 'melanjutkan' }; return T[x] ? 'Menunggu ' + w + ' ' + T[x] + '…' : m; }],
    [/^(.+) asks to undo their last move\. Allow it\?$/, '$1 meminta membatalkan langkah terakhirnya. Izinkan?'],
    [/^Undo request sent · waiting for (.+) to answer…$/, 'Permintaan Undo terkirim · menunggu jawaban $1…'],
    [/^Checking room (\w+)…$/, 'Memeriksa room $1…'],
    [/^(.+)'S BASE · (\d)\/6$/, 'BASE $1 · $2/6'],
    [/^HAND · (.+)$/, 'HAND · $1'],
    [/^CALL (\d)\/(\d) · Deploy (\d)\/1(.*)$/, 'CALL $1/$2 · Deploy $3/1$4'],
    [/^Next → (.+?)'s Action Phase\.$/, 'Berikutnya → Action Phase $1.'],
    [/^Next → (.+?): answer the effect question\.$/, 'Berikutnya → $1: menjawab pertanyaan efek.'],
    [/^Next → (.+?): respond in the (Counter Step|Counter Phase)\.$/, 'Berikutnya → $1: merespons di $2.'],
    [/^Next → (.+?): choose a new Attack Target\.$/, 'Berikutnya → $1: memilih Attack Target baru.'],
    [/^Next → (.+?): Battle Phase, reposition \(optional\)\.$/, 'Berikutnya → $1: Battle Phase, atur posisi (opsional).'],
    [/^Next → (.+?): choose the next attacker \((FRONT|WING|BACK) stage\)\.$/, 'Berikutnya → $1: memilih penyerang berikutnya (tahap $2).'],
    [/^Pass the device to (.+)$/, 'Serahkan perangkat ke $1'],
    [/^I am (.+), show my view$/, 'Saya $1, tampilkan sisi saya'],
    [/^(.+?) will (.+)\.$/, (m, a, b) => a + ' akan ' + ({ 'decide on the starting HAND': 'menentukan HAND awal', 'play the Action Phase': 'memainkan Action Phase', 'play the Battle Phase': 'memainkan Battle Phase', 'choose a new Attack Target': 'memilih Attack Target baru', 'respond in the Counter window': 'merespons di window Counter', 'discard cards': 'membuang kartu', 'decide on an effect': 'memutuskan efek', 'answer an effect question': 'menjawab pertanyaan efek', 'choose cards for an effect': 'memilih kartu untuk efek', 'choose an option for an effect': 'memilih opsi untuk efek', 'order effects': 'mengurutkan efek', 'choose rock, paper or scissors': 'memilih batu, kertas, atau gunting', 'continue': 'melanjutkan' }[b] || b) + '.'],
    [/^(.+?): choose starting HAND cards to put on the bottom of the Deck \(or keep them all\)\.$/, '$1: pilih kartu HAND awal yang dikembalikan ke bawah Deck (atau pertahankan semua).'],
    [/^(.+?) · Action Phase: hold a card and drag it onto an area \(or click it\) to CALL, use Base Deployment, or BATTLE-BASE MOVE; then end the Action Phase\.$/,
      '$1 · Action Phase: tahan kartu lalu seret ke sebuah area (atau ketuk) untuk CALL, Base Deployment, atau BATTLE-BASE MOVE; lalu akhiri Action Phase.'],
    [/^(.+?) · Battle Phase, Reposition: .*$/, '$1 · Battle Phase, atur posisi: tahan Karakter lalu seret ke area BATTLE lain (FRONT, WING, atau BACK) untuk menukar atau memindahkannya — atau ketuk dua area. Ulangi sesuai kebutuhan, lalu Simpan posisi (atau Lewati).'],
    [/^(.+?) · Battle Phase, (FRONT|WING|BACK) stage: click a Character highlighted in yellow \(or drag it onto a target\)\.$/, '$1 · Battle Phase, tahap $2: ketuk Karakter yang menyala kuning (atau seret ke target).'],
    [/^(.+?) · (Counter Step|Counter Phase)$/, '$1 · $2'],
    [/^(.+?) already passed: passing closes the window$/, '$1 sudah pass: pass sekarang menutup window'],
    [/^(.+?) may still respond after you$/, '$1 masih bisa merespons setelah Anda'],
    [/^ ?▸ … · two passes in a row close the window(.*)$/, ' ▸ … · dua pass berturut-turut menutup window$1'],
    [/^ · (.+?) just passed$/, ' · $1 baru saja pass'],
    [/^Test bot \((.+?)\) is thinking…$/, 'Bot ($1) sedang berpikir…'],
    [/^● Waiting for (.+)$/, '● Menunggu $1'],
    [/^● (.+?) \(bot\) is acting(.*)$/, '● $1 (bot) sedang bertindak$2'],
    [/^● (.+?) to act(.*)$/, '● Giliran $1 bertindak$2'],
    [/^(.+?) holds the device$/, '$1 memegang perangkat'],
    [/^⏱ (\d+:\d\d) · (.+?)'s turn$/, '⏱ $1 · giliran $2'], [/^⏸ (\d+:\d\d) · (.+?)'s turn · paused$/, '⏸ $1 · giliran $2 · berhenti'],
    [/^⏱ (\d+:\d\d) · (.+?) responding$/, '⏱ $1 · $2 merespons'], [/^⏸ (\d+:\d\d) · (.+?) responding · paused$/, '⏸ $1 · $2 merespons · berhenti'],
    [/^(.+?): new effects triggered while an earlier effect of yours is still waiting\..*$/, '$1: efek baru terpicu saat efek Anda yang lebih awal masih menunggu. Selesaikan kelompok baru dulu, atau pilih efek yang lebih awal sekarang (304.1.f, RS-016).'],
    [/^(.+?): several effects triggered at the same time\..*$/, '$1: beberapa efek terpicu bersamaan. Pilih yang diselesaikan lebih dulu (304.1.f).'],
    [/^(.+?): discard (\d+) card\(s\) \(HAND limit 9\)\.$/, '$1: buang $2 kartu (batas HAND 9).'],
    [/^: tap the cards you want to put back .*?(You decide first\. First turn: only 1 CALL and no Battle Phase\.|Your opponent goes first\.)$/, (m, b) => ': ketuk kartu yang ingin dikembalikan (ketuk lagi untuk batal), lalu konfirmasi. Kartu itu masuk ke bawah Deck, Anda mengambil jumlah yang sama, lalu Deck dikocok (303.1.e). ' + (/You decide/.test(b) ? 'Anda memutuskan lebih dulu. Giliran pertama: hanya 1 CALL dan tanpa Battle Phase.' : 'Lawan Anda jalan pertama.')],
    [/^(.+?): tap the cards you want to put back .*?(You decide first\. First turn: only 1 CALL and no Battle Phase\.|Your opponent goes first\.)$/, (m, a, b) => a + ': ketuk kartu yang ingin dikembalikan (ketuk lagi untuk batal), lalu konfirmasi. Kartu itu masuk ke bawah Deck, Anda mengambil jumlah yang sama, lalu Deck dikocok (303.1.e). ' + (/You decide/.test(b) ? 'Anda memutuskan lebih dulu. Giliran pertama: hanya 1 CALL dan tanpa Battle Phase.' : 'Lawan Anda jalan duluan.')],
    [/^↻ Put back (\d+) · draw (\d+)$/, '↻ Kembalikan $1 · ambil $2'],
    [/^(.+?) goes 1st · (.+?) goes 2nd$/, '$1 jalan pertama (1st) · $2 jalan kedua (2nd)'],
    [/^Lv(\d+) · Power (\d+) · choose the cost next$/, 'Lv$1 · Power $2 · pilih biaya berikutnya'],
    [/^Choose (\d+) card\(s\)\.$/, 'Pilih $1 kartu.'], [/^Choose (\d+)–(\d+) card\(s\)\.$/, 'Pilih $1–$2 kartu.'],
    [/^Confirm (\d+)$/, 'Konfirmasi $1'],
    [/^(.+?) wins$/, '$1 menang'],
    [/^(\d+) new$/, '$1 baru'], [/^Also included: engine v([\d.]+), screen, language and browser\. Nothing else is collected\.$/, 'Ikut terlampir: mesin v$1, ukuran layar, bahasa, dan browser. Tidak ada data lain yang diambil.'],
    [/^Local version: the report is saved on this device and copied, so you can send it to the MHR Deck Lab admin \(WhatsApp or email\)\. In the online version it will be sent directly\.( (\d+) report\(s\) saved on this device\.)?$/, (m, x, n) => 'Versi lokal: laporan disimpan di perangkat ini dan disalin, supaya bisa Anda kirim ke admin MHR Deck Lab (WhatsApp atau email). Di versi online laporan langsung terkirim.' + (n ? ' ' + n + ' laporan tersimpan di perangkat ini.' : '')], [/^Waiting for (.+)…$/, 'Menunggu $1…'], [/^Your turn · CALL (\d+)\/(\d+)$/, 'Giliran Anda · CALL $1/$2'],
    [/^Pick the cost: total Lv (\d+)\/(\d+)$/, 'Pilih biaya: total Lv $1/$2'], [/^(.+) \((\d+)\) attacks your (FRONT|BACK|WING 1|WING 2)$/, '$1 ($2) menyerang $3 Anda'], [/^(.+) \((\d+)\) attacks their (FRONT|BACK|WING 1|WING 2)$/, '$1 ($2) menyerang $3 lawan'],
    [/^(.+) attacks$/, '$1 menyerang'], [/^If both pass: (.+)$/, 'Bila keduanya pass: $1'], [/^Discard (\d+) card\(s\)$/, 'Buang $1 kartu'],
    [/^(.+) WINS THE FIGHT$/, '$1 MENANG PERTARUNGAN'], [/^SET IN BASE → (.+)$/, 'SET KE BASE → $1'], [/^⏸ (\d+:\d\d) · paused$/, '⏸ $1 · berhenti'], [/^END ACTION$/, 'AKHIRI AKSI'], [/^CONFIRM$/, 'SIMPAN'], [/^NO ATTACK$/, 'TIDAK MENYERANG'], [/^ATTACK!$/, 'SERANG!'], [/^\+(\d+) earlier since your last move$/, '+$1 sebelumnya sejak langkah terakhir Anda'],
    [/^(.+?) wins — (.+)\.$/, (m, a, c) => a + ' menang — ' + causeId(c) + '.'],
    [/^match time ran out: .+\)$/, m => causeId(m)],
    [/^(⏱|⏸) Match (\d+:\d\d)( · paused)?$/, (m, i, t, p) => i + ' Pertandingan ' + t + (p ? ' · berhenti' : '')],
    [/^: match time is up and Rush Points and Deck are tied\. Choose Rock, Paper or Scissors( \(round (\d+)\))?\. Your choice is shown only after both players have chosen\.$/,
      (m, r, n) => ': waktu pertandingan habis dan Rush Point serta Deck sama. Pilih Batu, Kertas, atau Gunting' + (n ? ' (ronde ' + n + ')' : '') + '. Pilihan Anda baru ditampilkan setelah kedua pemain memilih.'],
    [/^(\d+) turns · (\d+) actions · seed (\d+)$/, '$1 giliran · $2 aksi · seed $3'],
    [/^Data: (\d+) Characters from (.+?) \(English card text\) · engine v([\d.]+)\.(.*)$/, (m, n, f, v, rest) => 'Data: ' + n + ' Karakter dari ' + f + ' (teks kartu Inggris) · mesin v' + v + '.' + rest.replace(/ SD05, SD06 and PB02 \((\d+) cards\) are hidden until their official Indonesian release\./, ' SD05, SD06, dan PB02 ($1 kartu) disembunyikan sampai rilis resmi Indonesia.')],
    [/^Concede this game\? You will lose.*$/, 'Menyerah di permainan ini? Anda kalah dan permainan langsung berakhir. Tidak bisa dibatalkan.'],
    [/^Concede this game as (.+?)\? .*$/, 'Menyerah sebagai $1? $1 kalah dan permainan langsung berakhir. Tidak bisa dibatalkan.'],
    [/^([0-9]+) days left$/, '$1 hari lagi'], [/^([0-9]+) saved$/, '$1 tersimpan'],
    [/^(.+) conceded$/, '$1 menyerah'], [/^Concede$/, 'Menyerah'], [/^Conceded$/, 'Menyerah'],
    [/^⚠ No Character can attack from these positions$/, '⚠ Dari posisi ini tidak ada Karakter yang bisa menyerang'],
    [/^⚠ No Character can attack from these positions \(no target.*$/, '⚠ Dari posisi ini tidak ada Karakter yang bisa menyerang (tidak ada target dalam Attack Range): Battle Phase berakhir tanpa serangan.'],
    [/^Back to the menu\?.*$/,'Kembali ke menu? Permainan ini tersimpan di perangkat: pilih "Lanjutkan" di menu untuk meneruskannya.']
  ];
  // Teks atribut (placeholder / title)
  const ATTR = new Map(Object.entries({
    'Goes first': 'Jalan pertama', 'Goes second': 'Jalan kedua',
    'Name / contact (optional)': 'Nama / kontak (opsional)', 'Report a bug or send feedback': 'Lapor bug atau kirim feedback',
    'e.g. I attacked the Weakness with Hulk but no Rush Point was added': 'mis. Hulk menyerang Weakness tetapi Rush Point tidak bertambah',
    'e.g. The hand cards are too small on my phone': 'mis. Kartu HAND terlalu kecil di HP saya',
    'Paste a deck link/code from the mhrdecklab Deck Builder': 'Tempel link/kode deck dari Deck Builder mhrdecklab',
    'Paste a deck link/code from the mhrdecklab Deck Builder (e.g. https://mhrdecklab.com/#d=1.xxx.xxx)': 'Tempel link/kode deck dari Deck Builder mhrdecklab (mis. https://mhrdecklab.com/#d=1.xxx.xxx)',
    'empty = random': 'kosong = acak', 'Back to the menu': 'Kembali ke menu', 'Counter prompts: ON = always ask, AUTO = pass when you have nothing to use, OFF = always pass': 'Tanya Counter: ON = selalu ditanya, AUTO = Pass bila tidak ada yang bisa dipakai, OFF = selalu Pass', 'Concede: you lose and the game ends now': 'Menyerah: Anda kalah dan permainan langsung berakhir', 'Sound effects on/off': 'Efek suara nyala/mati',
    'Undo your last move (local test). In online games the opponent must agree.': 'Batalkan langkah terakhir Anda. Di permainan online lawan harus setuju.',
    'Copy the log code to report a bug or resume later': 'Salin kode log untuk melapor bug atau melanjutkan nanti',
    'Rush Points: the first to 9 wins': 'Rush Point: yang pertama mencapai 9 menang', 'Open RETREAT': 'Buka RETREAT', 'Open VOID': 'Buka VOID'
  }));

  const SKIP = '#log, .annbox ul, .eff, textarea, input, select option[value^="cd:"], [data-noi18n], script, style';
  const saved = new WeakMap();             // text node → teks Inggris asli
  const savedAttr = new WeakMap();         // element → { placeholder, title } asli
  function trCore(core) {
    const ex = EXACT.get(core); if (ex != null) return ex;
    for (const [re, rep] of RULES) if (re.test(core)) return core.replace(re, rep);
    return null;
  }
  function trText(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); if (!m[2]) return null;
    const t = trCore(m[2]); return t == null ? null : m[1] + t + m[3];
  }
  let busy = false;
  function applyNode(root) {
    if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(t => {
      const el = t.parentElement; if (!el || el.closest(SKIP)) return;
      let en = saved.get(t);
      if (en == null || (t.nodeValue !== en && t.nodeValue !== trText(en))) { en = t.nodeValue; saved.set(t, en); }
      const out = lang === 'id' ? (trText(en) || en) : en;
      if (t.nodeValue !== out) t.nodeValue = out;
    });
    (root.querySelectorAll ? root.querySelectorAll('[placeholder],[title]') : []).forEach(el => {
      if (el.closest('[data-noi18n]')) return;
      let o = savedAttr.get(el);
      if (!o) { o = { placeholder: el.getAttribute('placeholder'), title: el.getAttribute('title') }; savedAttr.set(el, o); }
      ['placeholder', 'title'].forEach(a => { const v = o[a]; if (v == null) return; const tr = lang === 'id' ? (ATTR.get(v) || v) : v; if (el.getAttribute(a) !== tr) el.setAttribute(a, tr); });
    });
  }
  function apply() { busy = true; try { applyNode(document.body); } finally { busy = false; } markButtons(); }
  function markButtons() {
    document.querySelectorAll('#langSw [data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    document.documentElement.lang = lang;
  }
  function set(l) {
    lang = l === 'id' ? 'id' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) { /* abaikan */ }
    if (window.MHRSimUI && window.MHRSimUI.state()) window.MHRSimUI.render();   // teks kartu Indonesia di tab Card
    if (window.MHRSimModes) window.MHRSimModes.show(window.MHRSimModes.view());
    apply();
  }
  // Teks yang digambar ulang oleh tampilan diterjemahkan otomatis.
  const mo = new MutationObserver(muts => {
    if (busy || lang === 'en') return;
    busy = true;
    try { muts.forEach(m => { if (m.type === 'childList') m.addedNodes.forEach(nd => { if (nd.nodeType === 1) applyNode(nd); else if (nd.nodeType === 3 && nd.parentElement) applyNode(nd.parentElement); }); else if (m.type === 'characterData' && m.target.parentElement) applyNode(m.target.parentElement); }); }
    finally { busy = false; }
  });
  function start() { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); apply(); }
  window.MHRSimI18N = { get lang() { return lang; }, set, apply, t: s => (lang === 'id' ? (trText(s) || s) : s) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
