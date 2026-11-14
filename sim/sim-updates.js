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
