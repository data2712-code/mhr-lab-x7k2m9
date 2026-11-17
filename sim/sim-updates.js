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
