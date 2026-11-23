/* ===================================================================
   MHR BATTLE SIM — UPDATES & PATCH NOTES (sim-updates.js)        riwayat #96 · 14 Nov 2026
   ===================================================================
   Isi bagian "Updates" di tab Play: bug/feedback yang sudah diselesaikan, patch Battle Sim, aturan baru, dan kartu yang
   kena ban/batasan di official regulation. Permintaan pemilik 14 Nov 2026.

   Cara menambah entri: taruh di PALING ATAS daftar (terbaru dulu). Teks pemain bahasa Inggris (en) + Indonesia (id).
     { d: 'YYYY-MM-DD', t: 'fix' | 'improve' | 'patch' | 'rules' | 'ban' | 'news', v: 'o2.xx' (opsional),
       en: { h: 'judul', b: ['baris', ...] }, id: { h: 'judul', b: ['baris', ...] },
       cards: ['BP01-001', ...] (opsional, untuk 'ban': tampil sebagai daftar nama kartu),
       reports: [6, 12] (opsional: nomor laporan pemain di sim_feedback) }
   'ban' hanya untuk keputusan resmi yang sudah diumumkan. Catatan: daftar ini hanya pengumuman; deck yang memakai kartu
   ban belum ditolak otomatis oleh mesin (bila perlu, tambahkan pemeriksaan di validateDeck).
   =================================================================== */
(function (root) {
  'use strict';
  const UPDATES = [
    {
      d: '2026-11-23', t: 'fix', v: 'o2.49',
      en: { h: 'Online play without VPN', b: [
        'The online server now runs at sim.mhrdecklab.com. Some Indonesian internet providers blocked the old server address, so a few players needed a VPN or DNS 1.1.1.1 to play online.',
        'Nothing else changes: same queue, rooms, Ranked and match history. If online play still fails, reload the page once.'
      ] },
      id: { h: 'Main online tanpa VPN', b: [
        'Server online sekarang berjalan di sim.mhrdecklab.com. Sebagian provider internet di Indonesia memblokir alamat server lama, sehingga beberapa pemain harus memakai VPN atau DNS 1.1.1.1 untuk main online.',
        'Selain itu tidak ada yang berubah: antrean, room, Ranked, dan riwayat pertandingan tetap sama. Bila main online masih gagal, muat ulang halaman sekali.'
      ] }
    },
    {
      d: '2026-11-23', t: 'improve', v: 'o2.48',
      en: { h: 'Ranked: tiers on top, leaderboard pages, fair fast wins · Stats & History in one tab', b: [
        'Rank tiers now sit at the top of the Ranked tab, side by side from Recruit to Genius Burden (swipe on a phone).',
        'The leaderboard shows 20 players per page: swipe left/right or use the ‹ › buttons. It opens on the page with your name.',
        'A real win before turn 4 (9 Rush Points or deck out) now counts for points. Games that end early by a concede, a leave, time or timeouts still do not count.',
        'Stats and Match history are now one tab, 📈 Stats & History, with two sub-tabs.'
      ] },
      id: { h: 'Ranked: tier di atas, leaderboard per halaman, menang cepat yang sah · Statistik & Riwayat jadi satu tab', b: [
        'Tingkatan rank sekarang di paling atas tab Ranked, berjajar dari Recruit sampai Genius Burden (geser di HP).',
        'Leaderboard menampilkan 20 pemain per halaman: geser kiri/kanan atau pakai tombol ‹ ›. Halaman yang memuat nama Anda dibuka lebih dulu.',
        'Kemenangan sah sebelum giliran ke-4 (9 Rush Point atau deck habis) sekarang dihitung. Pertandingan yang berakhir cepat karena menyerah, keluar, waktu, atau timeout tetap tidak dihitung.',
        'Statistik dan Riwayat pertandingan sekarang satu tab, 📈 Statistik & Riwayat, dengan dua sub-tab.'
      ] }
    },
    {
      d: '2026-11-23', t: 'fix', v: 'o2.47', reports: [51, 52, 53, 54, 55, 56],
      en: { h: 'Fixes: frozen game, Hostile Focus, Multiple Hits, Silk and more', b: [
        'The game no longer freezes when one of your cards is turned face-down in your opponent\'s BASE (for example by 「Spider-Archenemy」Electro).',
        'When several effects trigger together, each one now shows the card it is about (for example which [Web] Character 「Sense of Multiverse」Silk would bring back) and where it comes from.',
        '「Hostile Focus」Winter Soldier: the question shows the current Attack Target, and you can keep the current target after saying Yes. A second Hostile Focus never forces a change.',
        'An attacker that is retreated and then put back (for example by 「Turn The Tide」Captain America) is a new card: its attack ends with no Rush Point.',
        '「Multiple Hits」Black Panther now works at BOTH LOSE even when your BATTLE is full.',
        '「Swarming Assault」Chitauri Infantry can discard the top card even when your opponent has no Character in BATTLE.'
      ] },
      id: { h: 'Perbaikan: permainan macet, Hostile Focus, Multiple Hits, Silk, dan lainnya', b: [
        'Permainan tidak lagi macet saat salah satu kartu Anda ditutup (face-down) di BASE lawan (mis. oleh 「Spider-Archenemy」Electro).',
        'Saat beberapa efek terpicu bersamaan, tiap efek sekarang menyebut kartu yang dimaksud (mis. Karakter [Web] mana yang akan dikembalikan 「Sense of Multiverse」Silk) dan asalnya.',
        '「Hostile Focus」Winter Soldier: pertanyaannya menyebut Attack Target saat ini, dan Anda tetap bisa mempertahankan target setelah menjawab Yes. Hostile Focus kedua tidak pernah memaksa pengalihan.',
        'Penyerang yang di-Retreat lalu dikembalikan (mis. oleh 「Turn The Tide」Captain America) adalah kartu baru: serangannya berakhir tanpa Rush Point.',
        '「Multiple Hits」Black Panther sekarang bisa dipakai saat BOTH LOSE walau BATTLE Anda penuh.',
        '「Swarming Assault」Chitauri Infantry bisa membuang kartu teratas walau lawan tidak punya Karakter di BATTLE.'
      ] }
    },
    {
      d: '2026-11-23', t: 'improve', v: 'o2.46',
      en: { h: 'Ranked: full leaderboard, all rank tiers and a 4th prize', b: [
        'The leaderboard now lists every ranked player, and players still in placement appear at the bottom.',
        'New "Rank tiers" box: all tiers from Recruit to Genius Burden with their point ranges and how many players are in each.',
        'Season 0 prizes now go to the top 4: rank 4 wins 1 Booster Box SP01 Era of Spiders.'
      ] },
      id: { h: 'Ranked: leaderboard lengkap, semua tier rank, dan hadiah ke-4', b: [
        'Leaderboard sekarang menampilkan semua pemain ber-rank, dan pemain yang masih placement tampil di bagian bawah.',
        'Kotak baru "Tingkatan rank": semua tier dari Recruit sampai Genius Burden lengkap dengan rentang poin dan jumlah pemain di tiap tier.',
        'Hadiah Season 0 sekarang untuk 4 besar: peringkat 4 mendapat 1 Booster Box SP01 Era of Spiders.'
      ] }
    },
    {
      d: '2026-11-23', t: 'improve', v: 'o2.45',
      en: { h: 'More time on the Standard clock + a time bank', b: [
        'Standard clock (used by Find a match): 2:30 per turn and 0:45 per response (was 2:00 / 0:30).',
        'New: each player has a 1:00 time bank per game. When your turn or response clock runs out, the bank is used automatically before a timeout counts. It does not refill.',
        'Clearer warnings: the clock turns yellow at 0:30 and red at 0:10, your phone vibrates once at 10 seconds, and a large notice appears near the bottom of the screen when your time is almost up or the bank is running.'] },
      id: { h: 'Waktu jam Standar lebih panjang + cadangan waktu', b: [
        'Jam Standar (dipakai Cari lawan): 2:30 per giliran dan 0:45 per respons (dulu 2:00 / 0:30).',
        'Baru: tiap pemain punya cadangan waktu 1:00 per game. Saat jam giliran atau respons habis, cadangan dipakai otomatis sebelum timeout dihitung. Cadangan tidak terisi ulang.',
        'Peringatan lebih jelas: jam menjadi kuning di 0:30 dan merah di 0:10, HP bergetar sekali di 10 detik, dan muncul pemberitahuan besar di bagian bawah layar saat waktu Anda hampir habis atau cadangan sedang dipakai.'] }
    },
    {
      d: '2026-11-23', t: 'fix', v: 'o2.45', reports: [40, 41, 43, 44, 45, 49],
      en: { h: 'Top Agent, Phage, Hostile Focus, Spider Suit and Rocket Raccoon rulings', b: [
        '「Top Agent」Black Widow: UNIQUE and [COUNTER] count as AUTO effects, so it can now Retreat a UNIQUE Character such as 「Rooted Revival」Groot (Lv3 or lower).',
        '「Spider-Archenemy」Phage: cards with Lv1 cannot affect Phage, also when it is on the field without being attached. Top Agent no longer offers it (or a Character protected by Phage) as a target.',
        '「Hostile Focus」Winter Soldier can now redirect an AIR STRIKE attack, including to the Character in the same area (it becomes a normal attack on that Character).',
        '「Ultimate Mode」Spider Suit: its COUNTER·ACTI can be used even when it is not attached. You still prune 1 [Web] Character from RETREAT; the Power+1000 only applies while it is attached.',
        '「Life-and-Death Bond」Rocket Raccoon: "a different name" means a different card name, so 「Galaxy Scout」Rocket Raccoon can now be returned to your HAND.'] },
      id: { h: 'Ruling Top Agent, Phage, Hostile Focus, Spider Suit, dan Rocket Raccoon', b: [
        '「Top Agent」Black Widow: UNIQUE dan [COUNTER] termasuk efek AUTO, jadi kini bisa me-Retreat Karakter UNIQUE seperti 「Rooted Revival」Groot (Lv3 ke bawah).',
        '「Spider-Archenemy」Phage: kartu Lv1 tidak bisa memengaruhi Phage, juga saat Phage ada di field tanpa terpasang. Top Agent tidak lagi menawarkan Phage (atau Karakter yang dilindungi Phage) sebagai target.',
        '「Hostile Focus」Winter Soldier kini bisa mengalihkan serangan AIR STRIKE, termasuk ke Karakter di area yang sama (menjadi serangan biasa ke Karakter itu).',
        '「Ultimate Mode」Spider Suit: COUNTER·ACTI-nya bisa dipakai walau tidak terpasang. Anda tetap mem-Prune 1 Karakter [Web] dari RETREAT; Power+1000 hanya berlaku saat terpasang.',
        '「Life-and-Death Bond」Rocket Raccoon: "nama berbeda" berarti nama kartu berbeda, jadi 「Galaxy Scout」Rocket Raccoon kini bisa diambil ke HAND.'] }
    },
    {
      d: '2026-11-20', t: 'fix', v: 'o2.44', reports: [37],
      en: { h: 'Online pop-ups, skipping effects, and Turn The Tide on a taken Character', b: [
        'Online games: the RUSH POINT / fight pop-up from an earlier attack no longer appears again after every action (for example during Base Deployment).',
        'When several effects trigger together, optional effects now have a Skip button, so you do not have to choose the effect first and then press No. Effects that have no valid target right now are marked "No valid target now".',
        '「Turn The Tide」Captain America now works on a Character you took from your opponent (for example with 「Spider-Archenemy」Phage): that Character is placed onto YOUR field as the card says. Before, the card was pruned but nothing was placed.'] },
      id: { h: 'Pop-up online, melewati efek, dan Turn The Tide pada Karakter yang diambil', b: [
        'Permainan online: pop-up RUSH POINT / hasil pertarungan dari serangan sebelumnya tidak lagi muncul lagi setiap kali Anda melakukan aksi (misalnya saat Base Deployment).',
        'Saat beberapa efek terpicu bersamaan, efek opsional kini punya tombol Lewati, jadi tidak perlu memilih efeknya dulu lalu menekan Tidak. Efek yang saat ini tidak punya target ditandai "Saat ini tidak ada target".',
        '「Turn The Tide」Captain America kini berfungsi untuk Karakter yang Anda ambil dari lawan (misalnya dengan 「Spider-Archenemy」Phage): Karakter itu ditaruh ke FIELD ANDA sesuai teks kartu. Dulu kartunya di-prune tetapi tidak ada yang ditaruh.'] }
    },
    {
      d: '2026-11-20', t: 'fix', v: 'o2.43',
      en: { h: 'RETREAT / VOID ACTI no longer covers your HAND on phones', b: [
        'On phones, an ACTI you can use from RETREAT or VOID (for example 「Phoenix Host」Jean Grey) no longer opens the decision panel over your HAND in the Action Phase. The RETREAT or VOID pile now glows with ⚡ and the hint line says so: tap the pile, then Activate under the card.',
        'This is not a bot hint: it shows in every mode (Practice, online and ranked) whenever the effect can be used.'] },
      id: { h: 'ACTI dari RETREAT / VOID tidak lagi menutupi HAND di HP', b: [
        'Di HP, ACTI yang bisa dipakai dari RETREAT atau VOID (misalnya 「Phoenix Host」Jean Grey) tidak lagi membuka panel keputusan di atas HAND saat Action Phase. Tumpukan RETREAT atau VOID kini menyala ⚡ dan baris petunjuk menyebutkannya: ketuk tumpukannya, lalu Aktifkan di bawah kartunya.',
        'Ini bukan petunjuk bot: tampil di semua mode (Practice, online, dan ranked) setiap kali efeknya bisa dipakai.'] }
    },
    {
      d: '2026-11-20', t: 'improve', v: 'o2.42',
      en: { h: 'Server update notices', b: [
        'Before an online server update you now see a yellow notice with the time. While the update runs, Find a match and new rooms pause for a few minutes; games already running can always be finished.'] },
      id: { h: 'Pemberitahuan update server', b: [
        'Sebelum server online diperbarui, kini muncul pemberitahuan kuning beserta jamnya. Selama update, Cari lawan dan room baru berhenti beberapa menit; permainan yang sedang berjalan selalu bisa diselesaikan.'] }
    },
    {
      d: '2026-11-20', t: 'news', v: 'o2.42',
      en: { h: 'Season 0 prizes for the top 3', b: [
        'Ranked Season 0 now has prizes for the top 3 players on 31 December 2026, 23:59 WIB: Rank 1 · 1 Booster Box BP02 Doomsday, Rank 2 · Playmat Spider-Man CB01, Rank 3 · Card Sleeves Spider-Man CB01.',
        'Same requirement for all three: at least 20 rated games in Season 0, one account per player. See 🏆 Ranked for the current top 3.'] },
      id: { h: 'Hadiah Season 0 untuk 3 teratas', b: [
        'Ranked Season 0 kini punya hadiah untuk 3 pemain teratas per 31 Desember 2026, 23:59 WIB: Peringkat 1 · 1 Booster Box BP02 Doomsday, Peringkat 2 · Playmat Spider-Man CB01, Peringkat 3 · Card Sleeve Spider-Man CB01.',
        'Syaratnya sama untuk ketiganya: minimal 20 pertandingan berpoin di Season 0, 1 akun per pemain. Lihat 🏆 Ranked untuk 3 teratas saat ini.'] }
    },
    {
      d: '2026-11-20', t: 'rules', v: 'o2.41', reports: [35, 36],
      en: { h: 'The Web of Destiny no longer triggers itself · Gamora «Count Me In» CALL fix', b: [
        'Rules decision (report #35, ruling RS-068): 「The Web of Destiny」Spider-Man only triggers when your OTHER [Web] cards enter the field. CALLing it (or placing it from VOID with its own effect) no longer lets it attach a [Web] card from your HAND right away.',
        'Report #36: 「Count Me In」Gamora (PB02-004) and other cards that "cannot be called" no longer light up in your HAND as if you could CALL them. The CALL button is greyed out with the reason. (The engine already blocked the CALL; only the screen was wrong.)',
        'Replays of games played before this update still play back with the old rule.'] },
      id: { h: 'The Web of Destiny tidak lagi memicu dirinya sendiri · perbaikan CALL Gamora «Count Me In»', b: [
        'Keputusan aturan (laporan #35, ruling RS-068): 「The Web of Destiny」Spider-Man hanya terpicu saat kartu [Web] Anda yang LAIN masuk field. Men-CALL-nya (atau menaruhnya dari VOID dengan efeknya sendiri) tidak lagi langsung memasang kartu [Web] dari HAND.',
        'Laporan #36: 「Count Me In」Gamora (PB02-004) dan kartu lain yang "tidak bisa dipanggil" tidak lagi menyala di HAND seolah bisa di-CALL. Tombol CALL redup beserta alasannya. (Mesin sudah menolak CALL-nya; hanya tampilannya yang salah.)',
        'Replay permainan sebelum pembaruan ini tetap diputar dengan aturan lama.'] }
    },
    {
      d: '2026-11-20', t: 'fix', v: 'o2.40', reports: [32, 33, 34],
      en: { h: 'Clearer effect warnings and ACTI reasons', b: [
        'Before you answer an optional effect, the sim now warns you about surprising results. Example: The Milano «Ace Rescue» cannot attach another The Milano (UNIQUE), and in BATTLE it may Retreat at once when an opponent\'s effect makes its Power 0. The area buttons show the same warning (report #33).',
        'Tap one of your cards: ACTI effects you cannot use right now are shown greyed out, with the reason. Example: «Ultimate Mode» Spider Suit only works while it is attached to a Character, not when it is CALLed into the BASE (report #34).',
        'Rules note (report #32): «Spider-Archenemy» Mr. Negative has no UNIQUE, so two copies on your FIELD are allowed.'] },
      id: { h: 'Peringatan efek dan alasan ACTI lebih jelas', b: [
        'Sebelum menjawab efek opsional, simulator kini memperingatkan akibat yang mengejutkan. Contoh: The Milano «Ace Rescue» tidak bisa memasang The Milano lain (UNIQUE), dan di BATTLE bisa langsung Retreat bila efek lawan membuat Power-nya 0. Tombol pilihan area juga menampilkan peringatan yang sama (laporan #33).',
        'Ketuk kartu Anda: efek ACTI yang tidak bisa dipakai sekarang ditampilkan redup beserta alasannya. Contoh: «Ultimate Mode» Spider Suit hanya berfungsi saat terpasang pada Karakter, tidak saat di-CALL ke BASE (laporan #34).',
        'Catatan aturan (laporan #32): «Spider-Archenemy» Mr. Negative tidak punya UNIQUE, jadi dua kopi di FIELD Anda diperbolehkan.'] }
    },
    {
      d: '2026-11-19', t: 'improve', v: 'o2.39',
      en: { h: 'Bigger cards on desktop and laptop screens', b: [
        'On laptop screens up to 900 px tall (for example 1366×768), the decision panel now sits at the top of the right column, so the board and the cards are about 20–30% bigger.',
        'Choosing a CALL cost also uses that panel. On big screens (1080p and up) the cards grow up to 124 px wide.'] },
      id: { h: 'Kartu lebih besar di desktop dan laptop', b: [
        'Di layar laptop dengan tinggi sampai 900 px (misalnya 1366×768), panel keputusan kini menempel di atas kolom kanan, sehingga papan dan kartu sekitar 20–30% lebih besar.',
        'Memilih biaya CALL juga memakai panel itu. Di layar besar (1080p ke atas) kartu bisa membesar sampai lebar 124 px.'] }
    },
    {
      d: '2026-11-19', t: 'improve', v: 'o2.38',
      en: { h: 'Counter Step and Counter Phase from your HAND', b: [
        'On phones the board stays visible during Counter Step and Counter Phase: one line in the middle tells you what happens if nobody responds, with a big PASS button.',
        'Cards that can respond glow orange: [COUNTER] cards in your HAND and cards with COUNTER·ACTI on your FIELD or in your BASE. Tap one to COUNTER CALL or activate it. "≡ List" still opens the full list.',
        'The attacked area shows a short ⚔ UNDER ATTACK label instead of a text box, and the turn banner no longer covers your Counter decision.',
        'Online, the Counter window still opens even when you have nothing to play, so your opponent cannot tell. Against the bot it is skipped when you have nothing (change it with "Counter prompts").'] },
      id: { h: 'Counter Step dan Counter Phase dari HAND Anda', b: [
        'Di HP papan tetap terlihat selama Counter Step dan Counter Phase: satu baris di tengah menjelaskan akibatnya bila tidak ada yang merespons, dengan tombol PASS besar.',
        'Kartu yang bisa merespons menyala oranye: kartu [COUNTER] di HAND dan kartu dengan COUNTER·ACTI di FIELD atau BASE. Ketuk untuk COUNTER CALL atau mengaktifkannya. "≡ Daftar" tetap membuka daftar lengkap.',
        'Area yang diserang cukup diberi label pendek ⚔ DISERANG, bukan kotak teks, dan banner giliran tidak lagi menutupi keputusan Counter Anda.',
        'Online, jendela Counter tetap terbuka walaupun Anda tidak punya kartu untuk dimainkan, jadi lawan tidak bisa menebak. Melawan bot, jendela dilewati bila Anda tidak punya apa-apa (ubah lewat "Counter prompts").'] }
    },
    {
      d: '2026-11-19', t: 'improve', v: 'o2.37',
      en: { h: 'Cards first: bigger HAND, cleaner board, START BATTLE', b: [
        'Bigger HAND cards, held like a real hand. Drag a card straight up to play it, with no long press.',
        'Playable HAND cards rise and glow: gold = CALL now, purple = CALL with a cost you can pay, blue = ACTI from HAND. Other cards are dimmed.',
        'Lv, Power and R are small badges in the card corners. "Just placed" is a small blue dot, and your own face-down cards stay visible with a small SET label.',
        'The Action Phase button is now ⚔ START BATTLE (END TURN when there is no Battle Phase), and a phase bar shows Draw › Action › Battle › Counter › End.',
        'Choosing an attack target no longer covers the opponent\'s cards: the frame colour and a short WIN / LOSE / +1 ★ RUSH label show the result.',
        'VOID, RETREAT and Deck are card-shaped piles in the order of the official playmat. Tap a card inside RETREAT or VOID to see its details.'] },
      id: { h: 'Kartu jadi fokus: HAND lebih besar, papan lebih bersih, START BATTLE', b: [
        'Kartu HAND lebih besar dan bertumpuk seperti dipegang. Tarik kartu ke atas untuk memainkannya, tanpa menahan lama.',
        'Kartu HAND yang bisa dimainkan naik dan menyala: emas = bisa langsung di-CALL, ungu = CALL dengan biaya yang tersedia, biru = ACTI dari HAND. Kartu lain diredupkan.',
        'Lv, Power, dan R jadi lencana kecil di sudut kartu. "Just placed" jadi titik biru kecil, dan kartu tertutup milik sendiri tetap terlihat dengan label kecil SET.',
        'Tombol Action Phase kini ⚔ START BATTLE (END TURN bila tidak ada Battle Phase), dan bilah fase menampilkan Draw › Action › Battle › Counter › End.',
        'Saat memilih target serangan, kartu lawan tidak lagi tertutup teks: warna bingkai dan label pendek WIN / LOSE / +1 ★ RUSH menunjukkan hasilnya.',
        'VOID, RETREAT, dan Deck jadi tumpukan berbentuk kartu dengan urutan playmat resmi. Ketuk kartu di RETREAT atau VOID untuk melihat detailnya.'] }
    },
    {
      d: '2026-11-19', t: 'news', v: 'o2.36',
      en: { h: 'Season 0 prize: 1 Booster Box BP02 Doomsday', b: [
        'Ranked Season 0 runs from 23 November to 31 December 2026. The player with the most points on 31 December, 23:59 WIB wins 1 Booster Box BP02 Doomsday (20 packs).',
        'To qualify you need at least 20 rated games in Season 0. The Ranked tab shows your progress and marks every player on the leaderboard who qualifies.',
        'One account per player. Same points: most wins, then whoever reached those points first. Winner announced around 2 January 2027; the box ships to an address in Indonesia once BP02 is available.'] },
      id: { h: 'Hadiah Season 0: 1 Booster Box BP02 Doomsday', b: [
        'Ranked Season 0 berlangsung 23 November sampai 31 Desember 2026. Pemain dengan poin tertinggi per 31 Desember, 23:59 WIB mendapat 1 Booster Box BP02 Doomsday (20 pack).',
        'Syaratnya minimal 20 pertandingan berpoin di Season 0. Tab Ranked menampilkan progres Anda dan menandai setiap pemain di leaderboard yang sudah memenuhi syarat.',
        '1 akun per pemain. Poin sama: menang terbanyak, lalu yang lebih dulu mencapai poin itu. Pemenang diumumkan sekitar 2 Januari 2027; box dikirim ke alamat di Indonesia setelah BP02 tersedia.'] }
    },
    {
      d: '2026-11-19', t: 'improve', v: 'o2.35',
      en: { h: 'New: Learn to Play, Rules tab, and a daily limit for Ranked points', b: [
        'Learn to Play (🎓 Learn tab): 5 short lessons with a coach for new players — the board, your first turn, big Characters with a cost, defending with a COUNTER, and finishing the game. You press the real buttons; the coach tells you what to do next.',
        'Rules (📖 Rules tab): every ruling Battle Sim uses, in English and Indonesian, with where it comes from (official rules, Head Judge, or MHR Deck Lab ruling). Search by keyword or card, filter by topic, and copy a direct link to share a ruling.',
        'Ranked daily limit: from Season 0 you can gain at most +200 net points per day (WIB). After that, your games that day count ±5 at most, so players with less time to play are not left behind. Your progress for today shows on the Ranked tab.'] },
      id: { h: 'Baru: Belajar Bermain, tab Aturan, dan batas harian poin Ranked', b: [
        'Belajar Bermain (tab 🎓 Belajar): 5 pelajaran singkat dengan pelatih untuk pemain baru — papan, giliran pertama, Karakter besar dengan biaya, bertahan dengan COUNTER, dan menyelesaikan permainan. Anda menekan tombol sungguhan; pelatih memberi tahu langkah berikutnya.',
        'Aturan (tab 📖 Aturan): semua ruling yang dipakai Battle Sim, dalam bahasa Inggris dan Indonesia, beserta sumbernya (aturan resmi, Head Judge, atau ruling MHR Deck Lab). Cari dengan kata kunci atau nama kartu, saring per topik, dan salin tautan langsung untuk membagikan sebuah ruling.',
        'Batas harian Ranked: mulai Season 0, poin bersih yang bisa didapat paling banyak +200 per hari (WIB). Setelah itu, pertandingan Anda hari itu paling banyak ±5, supaya pemain yang waktunya terbatas tidak tertinggal. Kemajuan hari ini tampil di tab Ranked.'] }
    },
    {
      d: '2026-11-18', t: 'improve', v: 'o2.33',
      en: { h: 'New 📈 Stats tab for your Find a match games', b: [
        'Your win rate, going first vs second, average game length and last 10 results.',
        'My decks: record and win rate for each deck you played. Tap a deck to filter everything else.',
        'Matchups: your record against each opponent colour combination.',
        'Cards: how often you called each card and your win rate when you did, plus the opponent cards that showed up most in your losses.',
        'Match history with filters, ranked points per game, and Replay / Share.',
        'Only Find a match games count. Opponent decks are read from the game log after the game, never during it.'] },
      id: { h: 'Tab baru 📈 Statistik untuk pertandingan Cari lawan', b: [
        'Win rate, jalan pertama vs kedua, rata-rata durasi game, dan 10 hasil terakhir.',
        'Deck saya: rekor dan win rate tiap deck yang Anda pakai. Ketuk satu deck untuk memfilter semua bagian lain.',
        'Matchup: rekor Anda melawan tiap kombinasi warna lawan.',
        'Kartu: seberapa sering tiap kartu Anda panggil dan win rate saat kartu itu dipanggil, plus kartu lawan yang paling sering muncul saat Anda kalah.',
        'Riwayat pertandingan dengan filter, poin ranked per game, serta Replay / Share.',
        'Hanya pertandingan Cari lawan yang dihitung. Deck lawan dibaca dari log setelah pertandingan selesai, tidak pernah selama pertandingan.'] }
    },
    {
      d: '2026-11-18', t: 'fix', v: 'o2.32', reports: [28, 29, 30, 31],
      en: { h: 'Undo requests, CALL cost spots and mid-size screens', b: [
        'Online: if your connection dropped while your opponent was asking for an undo, the Allow / Decline question now comes back when you reconnect. Before, the request could only wait until it ran out.',
        'Online: the player who asked for an undo can now cancel the request with the Cancel button next to "waiting for … to answer".',
        'CALL with a cost: after the cost is paid, the cards you chose to Retreat also glow if the new card can take their spot. Tap one to place the new card there, including the BASE when it is full. To remove a card from the cost, use the chips in the cost panel.',
        'Phone: the "Look at the board" button works again. Since o2.25 it did nothing, so you could not see the board while deciding in the Counter window or other choice panels.',
        'Desktop windows between 821 and 1199 px wide: the board and cards now shrink to fit, and the decision panel wraps its buttons so options like Yes and No are no longer cut off.'] },
      id: { h: 'Permintaan Undo, tempat kartu biaya CALL, dan layar ukuran sedang', b: [
        'Online: bila koneksi Anda terputus saat lawan meminta Undo, pertanyaan Izinkan / Tolak kini muncul lagi setelah tersambung kembali. Sebelumnya permintaan hanya menunggu sampai waktunya habis.',
        'Online: pemain yang meminta Undo kini bisa membatalkan permintaannya dengan tombol Batal di samping "menunggu jawaban …".',
        'CALL dengan biaya: setelah biaya pas, kartu yang dipilih untuk Retreat ikut menyala bila kartu baru bisa menempati tempatnya. Ketuk salah satunya untuk menaruh kartu baru di sana, termasuk BASE yang sedang penuh. Untuk melepas kartu dari biaya, pakai chip di panel biaya.',
        'HP: tombol "Lihat papan" berfungsi lagi. Sejak o2.25 tombol ini tidak bereaksi, sehingga papan tidak bisa dilihat saat memutuskan di jendela Counter atau panel pilihan lain.',
        'Desktop dengan lebar jendela 821–1199 px: papan dan kartu kini mengecil agar muat, dan panel keputusan membungkus tombolnya sehingga pilihan seperti Ya dan Tidak tidak lagi terpotong.'] }
    },
    {
      d: '2026-11-17', t: 'patch', v: 'o2.31',
      en: { h: 'SD05 & SD06 now use the official Indonesian card text and images', b: [
        'With the card language set to Indonesian, 35 SD05 and SD06 cards now show the official Indonesian text and card images from marvelherorush.com.',
        'SD06-018 「Arcane Explosion」Adam Warlock keeps the fan translation until its official Indonesian version is published.',
        'Card effects in Battle Sim still follow the official English text, so nothing changes in how the cards play.'] },
      id: { h: 'SD05 & SD06 kini memakai teks dan gambar kartu resmi Indonesia', b: [
        'Saat bahasa kartu Indonesia dipilih, 35 kartu SD05 dan SD06 kini menampilkan teks dan gambar resmi Indonesia dari marvelherorush.com.',
        'SD06-018 「Arcane Explosion」Adam Warlock masih memakai terjemahan penggemar sampai versi resmi Indonesianya terbit.',
        'Efek kartu di Battle Sim tetap mengikuti teks resmi Inggris, jadi cara kerja kartu tidak berubah.'] }
    },
    {
      d: '2026-11-17', t: 'improve', v: 'o2.30', reports: [27],
      en: { h: 'Choose an area for an effect by tapping the board', b: [
        'When an effect asks where to place a card (for example 「Spider-Archenemy」Morbius from RETREAT), the possible areas now glow on the board and you can tap them, just like a CALL. The buttons in the panel still work.',
        'If an area is still taken by a card that leaves because of the same effect, its button says so (for example "Falcon leaves first").'] },
      id: { h: 'Pilih area untuk efek dengan mengetuk papan', b: [
        'Saat efek menanyakan tempat untuk sebuah kartu (misalnya 「Spider-Archenemy」Morbius dari RETREAT), area yang bisa dipilih kini menyala di papan dan bisa diketuk, sama seperti CALL. Tombol di panel tetap bisa dipakai.',
        'Bila area itu masih terisi kartu yang akan keluar karena efek yang sama, tombolnya menuliskannya (misalnya "Falcon keluar lebih dulu").'] }
    },
    {
      d: '2026-11-17', t: 'improve', v: 'o2.29', reports: [26],
      en: { h: 'Play-by-play replaces the Timeline, and a better layout for short desktop screens', b: [
        'Desktop: the Timeline box on the board is gone. The Play-by-play now shows what each line is (ATTACK, EFFECT, CALL …), marks what happened since your last move as NEW, and shows who is acting and your CALL / Deploy / COUNTER CALL limits at the top.',
        'Short desktop screens (650 px high or less): the decision panel (attack targets, COUNTER responses, effect choices) sits at the top of the right column instead of over the board. All choices are listed, Pass is always visible, and Hide shrinks the panel so you can read the Play-by-play.',
        'Card choice windows shrink their cards to fit short screens, and Confirm stays visible.',
        'Phone layout is unchanged.'] },
      id: { h: 'Play-by-play menggantikan Timeline, dan tata letak lebih baik untuk layar desktop pendek', b: [
        'Desktop: kotak Timeline di papan dihapus. Play-by-play kini menampilkan jenis tiap baris (ATTACK, EFFECT, CALL …), menandai kejadian sejak langkah terakhir Anda sebagai NEW, dan menampilkan siapa yang beraksi serta batas CALL / Deploy / COUNTER CALL Anda di bagian atas.',
        'Layar desktop pendek (tinggi 650 px ke bawah): panel keputusan (target serangan, respons COUNTER, pilihan efek) berada di atas kolom kanan, tidak lagi menutupi papan. Semua pilihan tersusun ke bawah, Pass selalu terlihat, dan tombol Sembunyikan mengecilkan panel supaya Play-by-play bisa dibaca.',
        'Jendela pilihan kartu mengecilkan kartunya di layar pendek, dan tombol Confirm selalu terlihat.',
        'Tampilan HP tidak berubah.'] }
    },
    {
      d: '2026-11-16', t: 'rules', v: 'o2.28',
      en: { h: 'Ranked: how points work and fair-play rules', b: [
        'Ranked Season 0 starts on 23 November 2026. While the community is small, Find a match pairs everyone with everyone, whatever their rank, so meeting the same players often is normal.',
        'Beating a stronger player gives many points (up to about +44); beating a much weaker player gives few (down to +1). Losing to a weaker player costs more. The full table is under Ranked → How ranked works.',
        'Games that end before turn 4 (an early concede or leave) give no points and do not count as a game.',
        'Net points won from the same opponent are limited to +75 per day and +200 per season. Mixed results between regular opponents never reach this limit.',
        'You cannot win more points than your opponent still has. One account per player.'] },
      id: { h: 'Ranked: cara poin dihitung dan aturan main adil', b: [
        'Ranked Season 0 dimulai 23 November 2026. Selama komunitas masih kecil, Cari lawan mempertemukan siapa saja tanpa melihat rank, jadi sering bertemu pemain yang sama itu wajar.',
        'Mengalahkan pemain yang lebih kuat memberi banyak poin (sampai sekitar +44); mengalahkan pemain yang jauh lebih lemah memberi sedikit (sampai +1). Kalah dari pemain yang lebih lemah mengurangi lebih banyak. Tabel lengkapnya ada di Ranked → Cara kerja ranked.',
        'Pertandingan yang berakhir sebelum giliran ke-4 (menyerah atau keluar terlalu cepat) tidak memberi poin dan tidak dihitung sebagai pertandingan.',
        'Poin bersih dari lawan yang sama dibatasi +75 per hari dan +200 per season. Hasil yang saling bergantian antara lawan langganan tidak akan menyentuh batas ini.',
        'Anda tidak bisa mendapat poin lebih banyak dari sisa poin lawan. Satu akun untuk satu pemain.'] }
    },
    {
      d: '2026-11-16', t: 'improve', v: 'o2.27',
      en: { h: 'See all the cards an effect shows from your Deck', b: [
        '「Thunder Caller」Thor, 「Genius Burden」Iron Man, 「Rebirth of Einherjar」 (SD05-005) and the CALL effect of 「Gunfire Negotiation」 (SP01) now show all 3 top cards in the choice window. Cards you cannot take are dimmed, with the reason and where they go.',
        'When none of the cards can be taken, the 3 cards are still shown in a "Revealed" panel. Your opponent sees the same panel, because these effects show the cards to both players.'] },
      id: { h: 'Lihat semua kartu yang diperlihatkan efek dari Deck', b: [
        '「Thunder Caller」Thor, 「Genius Burden」Iron Man, 「Rebirth of Einherjar」 (SD05-005), dan efek CALL 「Gunfire Negotiation」 (SP01) kini menampilkan ketiga kartu teratas di jendela pilihan. Kartu yang tidak bisa diambil diredupkan, lengkap dengan alasan dan tujuannya.',
        'Bila tidak ada kartu yang bisa diambil, ketiga kartu tetap tampil di panel "Revealed". Lawan melihat panel yang sama, karena efek ini memperlihatkan kartunya ke kedua pemain.'] }
    },
    {
      d: '2026-11-16', t: 'rules',
      en: { h: 'Rulings: UNIQUE, ACTI timing and SD05 / SD06 / PB02 cards', b: [
        'UNIQUE checks the full card name, including the title. 「Echo of Fate」Spider-Man and 「The Web of Destiny」Spider-Man have different names, so both may be on your FIELD. Two copies of the same card cannot. (Report #22)',
        'ACTI effects can only be used in your Action Phase. During the Battle Phase you can only use COUNTER effects. (Report #23)',
        'Wounded (for example 「Peerless Blade」Corvus Glaive): a Character is wounded when its Power is below its printed Power because of a Power-minus effect, from either player.',
        '「Count Me In」Gamora: the total Power of your Characters in BATTLE must be exactly 6500.',
        '「Soul Resonance」Yondu: a matching Lv gives only 1 extra activation per turn.',
        'QUICK ATTACK (「Guardian of Earth」Ancient One): in your turn, this card is not retreated by BOTH LOSE. ONSLAUGHT (「Genius Burden」Thanos): when its attack hits a weakness, you place 1 more Rush Point card (up to 9).',
        'The Lv of a card in HAND, RETREAT or VOID is its printed Lv.',
        'A Character that "can not attack" or "can not move" also cannot be repositioned before the Battle Phase.',
        '「Guardian of Nine Realms」Odin: you draw the extra card only when its Power-X brings that Character to 0 and it is retreated.',
        '「Reborn from Hell」Hela: "discarding of effect" means sent to RETREAT from HAND or Deck by an effect. A CALL cost does not count.',
        '"Enters VOID from RETREAT by your effect" (for example 「To The Rescue」Chitauri Flying Chariots): pruned from RETREAT by an effect of that card\'s owner.'] },
      id: { h: 'Ruling: UNIQUE, waktu ACTI, dan kartu SD05 / SD06 / PB02', b: [
        'UNIQUE memeriksa nama kartu lengkap, termasuk judulnya. 「Echo of Fate」Spider-Man dan 「The Web of Destiny」Spider-Man namanya berbeda, jadi keduanya boleh ada di FIELD Anda. Dua kopi kartu yang sama tidak boleh. (Laporan #22)',
        'Efek ACTI hanya bisa dipakai di Action Phase Anda. Saat Battle Phase, hanya efek COUNTER yang bisa dipakai. (Laporan #23)',
        'Wounded (misalnya 「Peerless Blade」Corvus Glaive): Karakter disebut wounded bila Power-nya di bawah Power cetak karena efek pengurang Power, dari pemain mana pun.',
        '「Count Me In」Gamora: total Power Karakter Anda di BATTLE harus tepat 6500.',
        '「Soul Resonance」Yondu: Lv yang sama hanya memberi 1 aktivasi tambahan per giliran.',
        'QUICK ATTACK (「Guardian of Earth」Ancient One): di giliran Anda, kartu ini tidak di-retreat oleh BOTH LOSE. ONSLAUGHT (「Genius Burden」Thanos): bila serangannya mengenai weakness, Anda menaruh 1 kartu Rush Point lagi (maksimal 9).',
        'Lv kartu di HAND, RETREAT, atau VOID adalah Lv cetaknya.',
        'Karakter yang "can not attack" atau "can not move" juga tidak bisa dipindah posisinya sebelum Battle Phase.',
        '「Guardian of Nine Realms」Odin: kartu tambahan hanya didapat bila Power-X membuat Karakter itu menjadi 0 dan ter-retreat.',
        '「Reborn from Hell」Hela: "discarding of effect" artinya masuk RETREAT dari HAND atau Deck karena efek. Biaya CALL tidak dihitung.',
        '"Enters VOID from RETREAT by your effect" (misalnya 「To The Rescue」Chitauri Flying Chariots): di-prune dari RETREAT oleh efek milik pemilik kartu itu.'] }
    },
    {
      d: '2026-11-16', t: 'improve', v: 'o2.25',
      en: { h: 'See attached cards at a glance, and who owns a borrowed card', b: [
        'Tap a Character on the FIELD to see its attached cards as small pictures. Tap one to read its text, then tap "Attached to …" to go back. No need to search the Play-by-play.',
        'A card that sits on the side of the player who does not own it (for example 「Spider-Archenemy」Green Goblin after it moves to the opponent\'s BASE) gets a teal frame and a ⇄ YOURS / OPP\'S label. Its card details show the owner and who controls it.'] },
      id: { h: 'Lihat kartu ter-attach sekilas, dan pemilik kartu yang "dipinjam"', b: [
        'Ketuk Karakter di FIELD untuk melihat kartu yang ter-attach sebagai gambar kecil. Ketuk salah satunya untuk membaca teksnya, lalu ketuk "Ter-attach pada …" untuk kembali. Tidak perlu mencari di Play-by-play.',
        'Kartu yang berada di sisi pemain yang bukan pemiliknya (misalnya 「Spider-Archenemy」Green Goblin setelah pindah ke BASE lawan) diberi bingkai hijau-biru dan label ⇄ MILIKMU / MILIK LAWAN. Detail kartunya menampilkan pemilik dan pengendalinya.'] }
    },
    {
      d: '2026-11-15', t: 'improve', v: 'o2.24', reports: [24],
      en: { h: 'Clearer choices for effects with a discard cost', b: [
        'Effects such as 「Blessing of Einherjar」New Valkyrie now ask for the card to discard first, then the target, in the same order as the card text.',
        'Every card in a choice window shows where it is: HAND, BATTLE, BASE, RETREAT or VOID.'] },
      id: { h: 'Pilihan lebih jelas untuk efek dengan biaya buang kartu', b: [
        'Efek seperti 「Blessing of Einherjar」New Valkyrie kini menanyakan kartu yang dibuang dulu, baru targetnya, sesuai urutan teks kartu.',
        'Setiap kartu di jendela pilihan menampilkan lokasinya: HAND, BATTLE, BASE, RETREAT, atau VOID.'] }
    },
    {
      d: '2026-11-14', t: 'fix', v: 'o2.23', reports: [18, 19, 20, 21],
      en: { h: 'Fixes from your reports: Thor, UNIQUE and new attack targets', b: [
        '「Thunder Speed」Thor (BP01-011): its first attack can hit a Weakness again. Only the second attack is limited to Characters.',
        'UNIQUE: a second copy can no longer join the FIELD by being attached from HAND, RETREAT or VOID, or by moving out from under a Character (for example 「Symbiotic Suit」Spider-Man).',
        'When a COUNTER CALL removes your Attack Target, the game now shows a button for each new target. You can still tap the target on the board.'] },
      id: { h: 'Perbaikan dari laporan Anda: Thor, UNIQUE, dan target serangan baru', b: [
        '「Thunder Speed」Thor (BP01-011): serangan pertamanya kembali bisa mengenai Weakness. Hanya serangan kedua yang dibatasi ke Karakter.',
        'UNIQUE: kopi kedua tidak bisa lagi masuk FIELD dengan dipasang dari HAND, RETREAT, atau VOID, atau dengan keluar dari bawah Karakter (misalnya 「Symbiotic Suit」Spider-Man).',
        'Saat COUNTER CALL membuat target serangan Anda hilang, permainan kini menampilkan tombol untuk tiap target baru. Mengetuk target di papan tetap bisa.'] }
    },
    {
      d: '2026-11-14', t: 'patch', v: 'o2.22',
      en: { h: 'PB02 now uses the official English card text', b: [
        'All 21 PB02 cards use their official English names and text, e.g. 「Rooted Revival」Groot and 「Sweet and Gentle」Chewie.',
        'Ronan (PB02-014), High Evolutionary (PB02-015) and Adam Warlock (PB02-020) now have the official trait 【The Cabal】, so SD06 effects that look for 【The Cabal】 also count them.',
        'Rush Point cards SD05-019 and SD06-019 are now on the official English card list.'] },
      id: { h: 'PB02 kini memakai teks kartu Inggris resmi', b: [
        'Ke-21 kartu PB02 memakai nama dan teks Inggris resmi, misalnya 「Rooted Revival」Groot dan 「Sweet and Gentle」Chewie.',
        'Ronan (PB02-014), High Evolutionary (PB02-015), dan Adam Warlock (PB02-020) kini memiliki trait resmi 【The Cabal】, jadi efek SD06 yang mencari 【The Cabal】 juga menghitung kartu-kartu ini.',
        'Kartu Rush Point SD05-019 dan SD06-019 kini ada di daftar kartu Inggris resmi.'] }
    },
    {
      d: '2026-11-14', t: 'news',
      en: { h: 'Beta extended to 22 November · Ranked Season 0 starts 23 November', b: [
        'The open beta now runs until 22 November 2026.',
        'Ranked Season 0: 23 November – 31 December 2026. Only Find a match games count.',
        'Season 1 starts on 1 January 2027. Its length will be announced once the 2027 set release date is known.'] },
      id: { h: 'Beta diperpanjang sampai 22 November · Ranked Season 0 mulai 23 November', b: [
        'Open beta kini berlangsung sampai 22 November 2026.',
        'Ranked Season 0: 23 November – 31 Desember 2026. Hanya pertandingan Cari lawan yang dihitung.',
        'Season 1 dimulai 1 Januari 2027. Lamanya diumumkan setelah tanggal rilis set 2027 diketahui.'] }
    },
    {
      d: '2026-11-14', t: 'improve', v: 'o2.20',
      en: { h: 'New phone layout, closer to the tabletop flow', b: [
        'Your BASE is now its own row of cards between your FIELD and HAND.',
        'Pay a CALL cost by tapping cards on the board, then tap the glowing area. No more bottom panel covering your cards.',
        'Attack targets are tapped on the board. Counter choices open in a small panel in the middle.',
        'Tap a card to see it full size with its effect text.',
        'The right side now has only Undo and More (log, sound, hints, menu).'] },
      id: { h: 'Tampilan HP baru, lebih dekat dengan alur bermain di meja', b: [
        'BASE Anda kini menjadi baris kartu sendiri di antara FIELD dan HAND.',
        'Bayar biaya CALL dengan mengetuk kartu di papan, lalu ketuk area yang menyala. Tidak ada lagi panel bawah yang menutupi kartu.',
        'Target serangan diketuk di papan. Pilihan Counter muncul di panel kecil di tengah.',
        'Ketuk kartu untuk melihatnya dalam ukuran penuh beserta teks efeknya.',
        'Sisi kanan kini hanya Undo dan More (log, suara, petunjuk, menu).'] }
    },
    {
      d: '2026-11-14', t: 'improve', v: 'o2.18', reports: [15, 17],
      en: { h: 'Stronger Expert bot with tournament-winning decks', b: [
        'Expert now also weighs your counterattack on the next turn.',
        'Unless you pick its deck, Expert plays one of 9 decks that won 1st place at recent tournaments.',
        'When the cost of a CALL is paid, tapping a cost card in BATTLE places the new card in that area.'] },
      id: { h: 'Bot Expert lebih kuat dengan deck juara turnamen', b: [
        'Expert kini juga menimbang serangan balik Anda di giliran berikutnya.',
        'Kecuali Anda memilihkan deck-nya, Expert memakai salah satu dari 9 deck juara 1 turnamen terbaru.',
        'Saat biaya CALL sudah pas, mengetuk kartu biaya di BATTLE menaruh kartu baru di area itu.'] }
    },
    {
      d: '2026-11-13', t: 'improve', v: 'o2.16',
      en: { h: 'Menu tabs, Ranked in Indonesian', b: [
        'Play, Ranked, History and Tools tabs switch in place, without going back to a menu.',
        'Ranked texts are fully translated into Indonesian.'] },
      id: { h: 'Tab menu, Ranked berbahasa Indonesia', b: [
        'Tab Play, Ranked, History, dan Tools berpindah di tempat, tanpa kembali ke menu.',
        'Teks Ranked kini sepenuhnya berbahasa Indonesia.'] }
    },
    {
      d: '2026-11-13', t: 'fix', v: 'o2.14', reports: [6, 9, 12],
      en: { h: 'Card rule fixes from your reports', b: [
        '「Pym Arrow」Hawkeye (BP01-099): its effect now resolves only once per card, even if two Lv4+ Characters enter together.',
        '「Spider-Archenemy」Mr. Negative (SP01-061): cards flipped by its effect may take a BATTLE-BASE MOVE the same turn.',
        'When an Activated Effect cannot be used, the game now tells you why (condition, cost, or once per turn).',
        'Online games use the same rules as offline games again.'] },
      id: { h: 'Perbaikan aturan kartu dari laporan Anda', b: [
        '「Pym Arrow」Hawkeye (BP01-099): efeknya kini hanya terselesaikan sekali per kartu, walau dua karakter Lv4+ masuk bersamaan.',
        '「Spider-Archenemy」Mr. Negative (SP01-061): kartu yang dibalik efeknya boleh BATTLE-BASE MOVE di turn yang sama.',
        'Saat efek ACTI tidak bisa dipakai, permainan kini menjelaskan sebabnya (syarat, biaya, atau sekali per turn).',
        'Pertandingan online kembali memakai aturan yang sama dengan offline.'] }
    },
    {
      d: '2026-11-13', t: 'improve', v: 'o2.14', reports: [2, 3, 4, 5, 7, 8, 10],
      en: { h: 'Faster battles and clearer choices', b: [
        'Bigger BASE on desktop.',
        'The next attacker is picked for you (FRONT, then WING, then BACK); tap a target to attack.',
        'Pass and End are blue, actions are gold.',
        'Hints can be turned off. Activated Effects can be cancelled before they resolve (offline games).',
        'Effect choices show the card text (for example 「Knull」).',
        'New bot level: Expert.'] },
      id: { h: 'Battle lebih cepat dan pilihan lebih jelas', b: [
        'BASE lebih besar di desktop.',
        'Penyerang berikutnya dipilih otomatis (FRONT, lalu WING, lalu BACK); ketuk target untuk menyerang.',
        'Pass dan End berwarna biru, aksi berwarna emas.',
        'Petunjuk bisa dimatikan. Efek ACTI bisa dibatalkan sebelum terselesaikan (permainan offline).',
        'Pilihan efek menampilkan teks kartu (misalnya 「Knull」).',
        'Level bot baru: Expert.'] }
    }
  ];
  const TYPES = {
    fix: ['FIXED', 'DIPERBAIKI'], improve: ['IMPROVED', 'DIPERBARUI'], patch: ['PATCH', 'PATCH'],
    rules: ['RULES', 'ATURAN'], ban: ['BAN / REGULATION', 'BAN / REGULASI'], news: ['NEWS', 'INFO']
  };
  const API = { list: UPDATES, TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MHRSimUpdates = API;
})(typeof window !== 'undefined' ? window : this);
