/* ===================================================================
   MHR BATTLE SIM — RULES (sim-rules.js)                    o2.35 · riwayat #114
   ===================================================================
   Tab "Rules" di menu Battle Sim (permintaan pemilik 19 Nov 2026, contoh tampilan: rushdee.app/rules). Isi = ruling yang
   dipakai simulator, ditulis ulang untuk pemain dari mhr-simulator\ruling-simulator.md (sumber internal tetap di sana),
   dalam Inggris + Indonesia mengikuti bahasa aktif. Tanpa catatan internal (nomor riwayat, kode K-xx, versi mesin).
   Label sumber:
     cr    = langsung dari Comprehensive Rules (aturan resmi)
     hj    = pernyataan Head Judge Marvel Hero Rush Indonesia yang disetujui pemilik (nama tidak ditulis)
     owner = keputusan MHR Deck Lab untuk simulator; bukan ruling resmi, bisa berubah bila ada sumber resmi
   Nomor RS-xxx sama dengan ruling-simulator.md supaya mudah dicocokkan. GB-xx = dasar permainan (ringkasan CR).
   Tautan langsung: mhrdecklab.com/#sim/rules/RS-023 (hash di iframe: #rules/RS-023).
   Bila ruling-simulator.md berubah, perbarui entri yang sama di sini.
   =================================================================== */
(function () {
  'use strict';
  const SRC = {
    cr: ['Official rules', 'Aturan resmi'],
    hj: ['Head Judge', 'Head Judge'],
    owner: ['MHR Deck Lab ruling', 'Ruling MHR Deck Lab']
  };
  const CATS = [
    ['basic', 'A. Game basics', 'A. Dasar permainan'],
    ['call', 'B. CALL, cost and BASE', 'B. CALL, biaya, dan BASE'],
    ['battle', 'C. Attacks and battles', 'C. Serangan dan pertarungan'],
    ['counter', 'D. Counter Step and Counter Phase', 'D. Counter Step dan Counter Phase'],
    ['trig', 'E. Effects and triggers', 'E. Efek dan trigger'],
    ['terms', 'F. Card terms and areas', 'F. Istilah kartu dan area'],
    ['cards', 'G. Rulings for specific cards', 'G. Ruling untuk kartu tertentu']
  ];
  // r(id, kategori, sumber, kartu, [judul EN, poin EN...], [judul ID, poin ID...])
  const L = [];
  const r = (id, c, s, cards, en, ind) => L.push({ id, c, s, cards, en, id_: ind });

  /* ---------- A. Dasar permainan (ringkasan CR; nomor pasal di ruling-simulator.md / sim.js) ---------- */
  r('GB-01', 'basic', 'cr', [], [
    'How to win',
    'You win when you have 9 Rush Points in your Timeline.',
    'You also win when your opponent\'s Deck has 0 cards. This is checked at once, even in the middle of drawing.',
    'If both Decks reach 0 cards at the same moment, the game is a draw.'
  ], [
    'Cara menang',
    'Anda menang bila Timeline Anda berisi 9 Rush Point.',
    'Anda juga menang bila Deck lawan tinggal 0 kartu. Ini langsung dicek, bahkan di tengah mengambil kartu.',
    'Bila kedua Deck menjadi 0 kartu pada saat yang sama, permainan seri.'
  ]);
  r('GB-02', 'basic', 'cr', [], [
    'Starting the game',
    'Both Decks are shuffled and the first player is decided. Each player draws 6 cards.',
    'Starting with the first player, each player may adjust their starting HAND once: put any number of cards on the bottom of the Deck, draw the same number, then shuffle the Deck.'
  ], [
    'Memulai permainan',
    'Kedua Deck dikocok dan pemain pertama ditentukan. Setiap pemain mengambil 6 kartu.',
    'Dimulai dari pemain pertama, setiap pemain boleh mengganti HAND awal satu kali: taruh kartu berapa pun ke bawah Deck, ambil kartu sebanyak itu, lalu kocok Deck.'
  ]);
  r('GB-03', 'basic', 'cr', [], [
    'Turn order',
    'Start of turn → Draw Phase (draw 2 cards, every turn, also on the first turn) → Action Phase → Battle Phase → Counter Phase → End Phase.',
    'The first player skips only the Battle Phase of their first turn. The Counter Phase still happens.',
    'In the End Phase, effects that last "this turn" end, then a player with more than 9 cards in HAND discards down to 9.'
  ], [
    'Urutan giliran',
    'Awal giliran → Draw Phase (ambil 2 kartu, setiap giliran, juga di giliran pertama) → Action Phase → Battle Phase → Counter Phase → End Phase.',
    'Pemain pertama hanya melewati Battle Phase di giliran pertamanya. Counter Phase tetap terjadi.',
    'Di End Phase, efek "this turn" berakhir, lalu pemain dengan lebih dari 9 kartu di HAND membuang kartu sampai tersisa 9.'
  ]);
  r('GB-04', 'basic', 'cr', [], [
    'The areas of the FIELD',
    'BATTLE has 4 areas: FRONT, WING 1, WING 2 and BACK. Your Characters attack from here.',
    'BASE holds up to 6 cards, Face-Down Cards included. Face-down cards there are your "set" cards and can pay CALL costs.',
    'RETREAT is the discard area. VOID is for pruned (removed) cards. The Timeline holds your Rush Points.',
    'An empty BATTLE area is called a Weakness.'
  ], [
    'Area di FIELD',
    'BATTLE punya 4 area: FRONT, WING 1, WING 2, dan BACK. Karakter Anda menyerang dari sini.',
    'BASE memuat maksimal 6 kartu, termasuk Face-Down Card. Kartu tertutup di sana adalah kartu "set" Anda dan bisa dipakai membayar biaya CALL.',
    'RETREAT adalah tempat buangan. VOID untuk kartu yang di-prune (dikeluarkan). Timeline berisi Rush Point Anda.',
    'Area BATTLE yang kosong disebut Weakness.'
  ]);
  r('GB-05', 'basic', 'cr', [], [
    'Actions in the Action Phase',
    'Base Deployment: once per turn, place 1 card from your HAND face-down into your BASE, then draw 1 card.',
    'CALL: put a Character from your HAND onto the FIELD (an empty BATTLE area or the BASE). Up to 3 CALLs per turn; only 1 on the first player\'s first turn.',
    'BATTLE-BASE MOVE: once per turn per Character, move it between BATTLE and BASE. A Character placed onto the FIELD this turn cannot do this.',
    'Use ACTI effects of your cards, as their text allows.'
  ], [
    'Aksi di Action Phase',
    'Base Deployment: satu kali per giliran, taruh 1 kartu dari HAND secara tertutup ke BASE, lalu ambil 1 kartu.',
    'CALL: taruh Karakter dari HAND ke FIELD (area BATTLE yang kosong atau BASE). Maksimal 3 CALL per giliran; hanya 1 di giliran pertama pemain pertama.',
    'BATTLE-BASE MOVE: satu kali per giliran untuk setiap Karakter, pindahkan antara BATTLE dan BASE. Karakter yang baru masuk FIELD giliran ini tidak bisa.',
    'Gunakan efek ACTI kartu Anda sesuai teksnya.'
  ]);
  r('GB-06', 'basic', 'cr', [], [
    'Range (R) and who can be attacked',
    'R is how far a Character can attack. From your FRONT: the opponent\'s FRONT is distance 1, a WING is 2, the BACK is 3.',
    'From a WING add 1, from your BACK add 2. A target is reachable when R is at least the distance.',
    'A Character with R 0 cannot attack.'
  ], [
    'Jarak (R) dan siapa yang bisa diserang',
    'R adalah seberapa jauh Karakter bisa menyerang. Dari FRONT Anda: FRONT lawan berjarak 1, WING 2, BACK 3.',
    'Dari WING tambah 1, dari BACK tambah 2. Target bisa dijangkau bila R paling sedikit sama dengan jaraknya.',
    'Karakter dengan R 0 tidak bisa menyerang.'
  ]);
  r('GB-07', 'basic', 'cr', [], [
    'The Battle Phase',
    'Before attacking, you may rearrange your Characters in BATTLE as you like. This is not a move.',
    'Characters attack in order: FRONT, then the WINGS, then BACK. Each one gets one chance to attack, and attacking is optional.',
    'Every attack opens a Counter Step before the battle is resolved.'
  ], [
    'Battle Phase',
    'Sebelum menyerang, Anda boleh menyusun ulang Karakter di BATTLE sesuka Anda. Ini bukan "move".',
    'Karakter menyerang berurutan: FRONT, lalu WING, lalu BACK. Masing-masing punya satu kesempatan menyerang, dan menyerang itu pilihan.',
    'Setiap serangan membuka Counter Step sebelum pertarungan ditentukan.'
  ]);
  r('GB-08', 'basic', 'cr', [], [
    'Resolving an attack',
    'Attacking a Weakness (an empty area): you get 1 Rush Point.',
    'Attacking a Character: compare Power. Higher Power wins the fight and the loser retreats. Equal Power is BOTH LOSE: both retreat.',
    'A Character whose Power drops to 0 retreats at once.'
  ], [
    'Hasil serangan',
    'Menyerang Weakness (area kosong): Anda mendapat 1 Rush Point.',
    'Menyerang Karakter: bandingkan Power. Power lebih tinggi menang bertarung dan yang kalah di-retreat. Power sama = BOTH LOSE: keduanya di-retreat.',
    'Karakter yang Power-nya turun ke 0 langsung di-retreat.'
  ]);

  /* ---------- B. CALL, biaya, BASE ---------- */
  r('GB-09', 'call', 'cr', [], [
    'CALL cost for Lv4 and higher',
    'A Lv1–3 Character is called without a cost.',
    'A Lv4+ Character needs a cost: retreat cards from your FIELD (BATTLE or BASE) whose total Lv is exactly the Lv of the Character you call. Each Face-Down Card counts as Lv1.',
    'The new Character may go into the area that a cost card just left.'
  ], [
    'Biaya CALL untuk Lv4 ke atas',
    'Karakter Lv1–3 di-CALL tanpa biaya.',
    'Karakter Lv4+ butuh biaya: retreat kartu dari FIELD Anda (BATTLE atau BASE) yang total Lv-nya tepat sama dengan Lv Karakter yang di-CALL. Setiap Face-Down Card dihitung Lv1.',
    'Karakter baru boleh menempati area yang baru saja ditinggalkan kartu biaya.'
  ]);
  r('RS-012', 'call', 'owner', [], [
    'Attached Cards are not Characters',
    'An Attached Card cannot be retreated to pay a CALL cost. Only Characters and Face-Down Cards can.',
    'It does not count as a Character in BATTLE.',
    'It follows its Character when that Character leaves the FIELD, and it keeps all its own effects while their conditions are met.'
  ], [
    'Kartu terpasang (Attached Card) bukan Karakter',
    'Attached Card tidak bisa di-retreat untuk membayar biaya CALL. Hanya Karakter dan Face-Down Card yang bisa.',
    'Ia tidak dihitung sebagai Karakter di BATTLE.',
    'Ia ikut Karakternya saat Karakter itu meninggalkan FIELD, dan tetap memiliki semua efeknya selama syaratnya terpenuhi.'
  ]);
  r('RS-015', 'call', 'cr', [], [
    'A retreated Face-Down Card does not use its own trigger',
    'A Face-Down Card leaves the FIELD still treated as face-down, with no effects.',
    'Example: a face-down 「Cosmic Legacy」Silver Surfer retreated as a CALL cost does not trigger.'
  ], [
    'Face-Down Card yang di-retreat tidak memakai trigger-nya sendiri',
    'Face-Down Card meninggalkan FIELD tetap sebagai kartu tertutup, tanpa efek.',
    'Contoh: 「Cosmic Legacy」Silver Surfer tertutup yang di-retreat sebagai biaya CALL tidak terpicu.'
  ]);
  r('RS-029', 'call', 'hj', [], [
    'UNIQUE',
    'Two copies of a UNIQUE card can never be on the FIELD together. If one is there, another copy cannot enter by any means.',
    'A face-down copy that would be flipped stays face-down and is only revealed.',
    'You may retreat the copy already on the FIELD as the cost to CALL another copy, because the cost is paid before the new card is placed.',
    'UNIQUE cannot be lost, even to Anti-Venom. It is an AUTO effect, so a UNIQUE Character counts as having 【AUTO】.'
  ], [
    'UNIQUE',
    'Dua salinan kartu UNIQUE tidak pernah boleh ada di FIELD bersamaan. Bila satu sudah ada, salinan lain tidak bisa masuk dengan cara apa pun.',
    'Salinan tertutup yang seharusnya dibuka tetap tertutup dan hanya diperlihatkan.',
    'Anda boleh me-retreat salinan yang sudah ada di FIELD sebagai biaya CALL salinan lain, karena biaya dibayar sebelum kartu baru ditaruh.',
    'UNIQUE tidak bisa hilang, bahkan oleh Anti-Venom. UNIQUE adalah efek AUTO, jadi Karakter UNIQUE dihitung memiliki 【AUTO】.'
  ]);
  r('RS-028', 'call', 'hj', [], [
    'Flipping a Face-Down Card face-up is not placing it onto the FIELD',
    '"When placed onto / enters the FIELD" effects do not trigger when a card is flipped face-up.',
    'The flipped Character was not placed this turn, so it may still use BATTLE-BASE MOVE.'
  ], [
    'Membuka Face-Down Card bukan menaruhnya ke FIELD',
    'Efek "saat ditaruh / masuk ke FIELD" tidak terpicu saat kartu dibuka.',
    'Karakter yang dibuka tidak dianggap baru ditaruh giliran ini, jadi masih boleh BATTLE-BASE MOVE.'
  ]);
  r('RS-038', 'call', 'owner', [], [
    '"When ... enters the field" counts every face-up arrival',
    'CALL, COUNTER CALL, placement by an effect, and a swap from RETREAT all count. Flipping a card face-up does not.',
    '"By calling" counts only CALL and COUNTER CALL.',
    'A Lv named in such a condition is the Character\'s current Lv.'
  ], [
    '"Saat ... masuk ke field" menghitung setiap kedatangan terbuka',
    'CALL, COUNTER CALL, ditaruh oleh efek, dan swap dari RETREAT semuanya dihitung. Membuka kartu tertutup tidak.',
    '"By calling" hanya menghitung CALL dan COUNTER CALL.',
    'Lv yang disebut dalam syarat seperti ini adalah Lv Karakter saat itu.'
  ]);
  r('RS-035', 'call', 'owner', [], [
    'A BATTLE-BASE MOVE made by an effect ignores the action\'s limits',
    'It works even for a Character placed this turn or one that already moved, and it does not use up that Character\'s own BATTLE-BASE MOVE.',
    'The destination must still have room. It counts as "takes BATTLE-BASE Move" for other triggers.'
  ], [
    'BATTLE-BASE MOVE oleh efek tidak terikat batas aksinya',
    'Tetap bisa untuk Karakter yang baru ditaruh giliran ini atau yang sudah bergerak, dan tidak memakai jatah BATTLE-BASE MOVE Karakter itu.',
    'Tujuannya tetap harus ada tempat. Ini dihitung sebagai "takes BATTLE-BASE Move" untuk trigger lain.'
  ]);

  /* ---------- C. Serangan ---------- */
  r('RS-006', 'battle', 'owner', [], [
    'A Character called this turn can attack this turn',
    'Only BATTLE-BASE MOVE is forbidden for a Character placed this turn.',
    'A Character called with COUNTER CALL during your own Battle Phase can also attack.'
  ], [
    'Karakter yang di-CALL giliran ini bisa menyerang giliran ini',
    'Yang dilarang untuk Karakter yang baru ditaruh hanya BATTLE-BASE MOVE.',
    'Karakter yang di-COUNTER CALL di Battle Phase Anda sendiri juga bisa menyerang.'
  ]);
  r('RS-007', 'battle', 'owner', [], [
    'Any empty BATTLE area within R is a valid Weakness target',
    'Nothing blocks a Weakness by itself. Only [BLOCK] or an effect that changes the target (such as 「Hostile Focus」Winter Soldier) can redirect the attack.'
  ], [
    'Area BATTLE kosong mana pun dalam jangkauan R bisa diserang sebagai Weakness',
    'Tidak ada yang menghalangi Weakness dengan sendirinya. Hanya [BLOCK] atau efek pengubah target (seperti 「Hostile Focus」Winter Soldier) yang bisa mengalihkan serangan.'
  ]);
  r('RS-011', 'battle', 'owner', [], [
    'Choosing a new target after a COUNTER CALL or another change',
    'If the original Attack Target becomes invalid (for example a COUNTER CALL fills the attacked empty area, or the attacker\'s R drops), the attacker picks a new valid target within R and cannot cancel the attack.',
    'A new Counter Step then begins. If no valid target is left, the battle ends.',
    'A COUNTER CALL that does not change the original target causes no new target choice.'
  ], [
    'Memilih target baru setelah COUNTER CALL atau perubahan lain',
    'Bila Attack Target awal tidak lagi sah (misalnya COUNTER CALL mengisi area kosong yang diserang, atau R penyerang turun), penyerang memilih target sah baru dalam jangkauan R dan tidak bisa membatalkan serangan.',
    'Lalu Counter Step baru dimulai. Bila tidak ada target sah, pertarungan berakhir.',
    'COUNTER CALL yang tidak mengubah target awal tidak menyebabkan pemilihan target baru.'
  ]);
  r('RS-024', 'battle', 'hj', [], [
    '"When attacking" effects do not trigger again on a new target',
    'They trigger when the attacker is declared. A new target choice only repeats the target selection.',
    'Example: a Character gives -2000 when it attacks. Its target retreats and it picks a new target; the -2000 does not happen again.'
  ], [
    'Efek "saat menyerang" tidak terpicu lagi saat target diganti',
    'Efek itu terpicu saat penyerang dideklarasikan. Memilih target baru hanya mengulang pemilihan target.',
    'Contoh: Karakter memberi -2000 saat menyerang. Targetnya di-retreat dan ia memilih target baru; -2000 tidak terjadi lagi.'
  ]);
  r('RS-025', 'battle', 'hj', [], [
    'If the attacker itself is replaced, the attack starts over',
    'The first attack fizzles and the new Character declares a new attack from the start, so its own "when attacking" effects can trigger.',
    'A swap is different: the swapped-in card continues the attack (RS-032).'
  ], [
    'Bila penyerangnya sendiri diganti, serangan dimulai ulang',
    'Serangan pertama batal dan Karakter baru mendeklarasikan serangan baru dari awal, jadi efek "saat menyerang" miliknya bisa terpicu.',
    'Swap berbeda: kartu yang masuk lewat swap melanjutkan serangan (RS-032).'
  ]);
  r('RS-026', 'battle', 'hj', [], [
    'AIR STRIKE',
    'A Character with AIR STRIKE may attack the opponent\'s Weakness directly, ignoring the Character in that area. It may also attack a Character instead.',
    'An AIR STRIKE attack can still be redirected by [BLOCK] or by an effect such as 「Hostile Focus」Winter Soldier. The attacker then follows the new target.'
  ], [
    'AIR STRIKE',
    'Karakter dengan AIR STRIKE boleh langsung menyerang Weakness lawan, mengabaikan Karakter di area itu. Ia juga boleh menyerang Karakter.',
    'Serangan AIR STRIKE tetap bisa dialihkan oleh [BLOCK] atau efek seperti 「Hostile Focus」Winter Soldier. Penyerang lalu mengikuti target baru.'
  ]);
  r('RS-027', 'battle', 'hj', [], [
    'A Character that declared an attack has attacked, even if the attack failed',
    'An attack that was countered, lost its target, or ended because R dropped to 0 still counts.',
    'Only a Character that never declared an attack "did not attack".'
  ], [
    'Karakter yang sudah mendeklarasikan serangan dianggap sudah menyerang, walau serangannya gagal',
    'Serangan yang digagalkan counter, kehilangan target, atau berakhir karena R turun ke 0 tetap dihitung.',
    'Hanya Karakter yang tidak pernah mendeklarasikan serangan yang "tidak menyerang".'
  ]);
  r('RS-034', 'battle', 'owner', [], [
    'BOTH LOSE counts as losing the fight for both Characters',
    '"Loses the fight" and "enters RETREAT by losing the fight" effects trigger on BOTH LOSE. Nobody "wins the fight", so "wins the fight" effects (and [ASSAULT]) do not trigger.',
    'A Character that is not retreated by BOTH LOSE (for example by its own effect) still lost the fight.'
  ], [
    'BOTH LOSE dihitung kalah bertarung untuk kedua Karakter',
    'Efek "kalah bertarung" dan "masuk RETREAT karena kalah bertarung" terpicu pada BOTH LOSE. Tidak ada yang "menang bertarung", jadi efek "menang bertarung" (dan [ASSAULT]) tidak terpicu.',
    'Karakter yang tidak di-retreat oleh BOTH LOSE (misalnya karena efeknya sendiri) tetap kalah bertarung.'
  ]);
  r('RS-032', 'battle', 'hj', [], [
    'Swap exchanges the cards but keeps the attack',
    'The swapped-in card takes the other card\'s position and current state: whether it has attacked, whether it is the Attack Target, and the buffs and debuffs given to it by effects.',
    'The Attack Target does not change, so no new target is chosen.',
    'A bonus from a card\'s own AUTO effect stays with that card.'
  ], [
    'Swap menukar kartu tetapi serangan tetap berjalan',
    'Kartu yang masuk mengambil posisi dan keadaan kartu lain: sudah menyerang atau belum, sedang jadi Attack Target atau tidak, serta buff dan debuff dari efek.',
    'Attack Target tidak berubah, jadi tidak ada pemilihan target baru.',
    'Bonus dari efek AUTO milik kartu itu sendiri tetap ikut kartu itu.'
  ]);
  r('RS-064', 'battle', 'owner', ['SD05-003', 'SD06-001'], [
    'QUICK ATTACK and ONSLAUGHT',
    'QUICK ATTACK: in its controller\'s turn, the card in BATTLE is not retreated by BOTH LOSE.',
    'ONSLAUGHT: when its attack hits a Weakness, you get 1 more Rush Point, unless you already have 9.'
  ], [
    'QUICK ATTACK dan ONSLAUGHT',
    'QUICK ATTACK: di giliran pengendalinya, kartu di BATTLE tidak di-retreat oleh BOTH LOSE.',
    'ONSLAUGHT: saat serangannya mengenai Weakness, Anda mendapat 1 Rush Point tambahan, kecuali sudah 9.'
  ]);

  /* ---------- D. Counter ---------- */
  r('RS-017', 'counter', 'owner', [], [
    'Counter Step and Counter Phase: players alternate until both pass',
    'Players take 1 action at a time, starting with the opponent of the turn player. A player may act more than once in the same window.',
    'The window ends only when both players pass in a row.',
    'COUNTER CALL is limited to once per player per turn in Counter Steps, and once more in the Counter Phase.',
    'The Head Judge agrees: "A attacks, B passes, A counters, B passes, A counters, B counters … A passes, B passes, then the battle resolves."'
  ], [
    'Counter Step dan Counter Phase: pemain bergantian sampai keduanya pass',
    'Pemain mengambil 1 aksi bergantian, dimulai dari lawan pemain giliran. Seorang pemain boleh beraksi lebih dari sekali di jendela yang sama.',
    'Jendela berakhir hanya bila kedua pemain pass berturut-turut.',
    'COUNTER CALL dibatasi satu kali per pemain per giliran di Counter Step, dan satu kali lagi di Counter Phase.',
    'Head Judge setuju: "A menyerang, B pass, A counter, B pass, A counter, B counter … A pass, B pass, lalu pertarungan ditentukan."'
  ]);
  r('RS-005', 'counter', 'owner', ['SD01-002', 'SD01-016'], [
    'Hulk Buster can move to another Character',
    'While attached, Hulk Buster can use its COUNTER·ACTI to attach to another of your Characters, also during a Counter Step. Once per turn.',
    'It cannot move to the Character it is already attached to.'
  ], [
    'Hulk Buster bisa pindah ke Karakter lain',
    'Saat terpasang, Hulk Buster bisa memakai COUNTER·ACTI-nya untuk terpasang ke Karakter Anda yang lain, juga di Counter Step. Satu kali per giliran.',
    'Ia tidak bisa pindah ke Karakter yang sedang ia tempeli.'
  ]);
  r('RS-047', 'counter', 'owner', ['BP01-067'], [
    '「Hostile Focus」Winter Soldier changes the Attack Target',
    'Its owner picks any other area the attacker can reach within R, including an empty area (a Weakness).',
    'This is not a new target choice by the attacker: "when attacking" effects do not trigger again and the Counter Step goes on.'
  ], [
    '「Hostile Focus」Winter Soldier mengubah Attack Target',
    'Pemiliknya memilih area lain yang bisa dijangkau penyerang dalam R, termasuk area kosong (Weakness).',
    'Ini bukan pemilihan target baru oleh penyerang: efek "saat menyerang" tidak terpicu lagi dan Counter Step berlanjut.'
  ]);

  /* ---------- E. Efek dan trigger ---------- */
  r('RS-013', 'trig', 'owner', [], [
    'Win conditions are checked after each action or effect has finished',
    'Example: 「Cosmic Legacy」Silver Surfer moves the top card of the Deck, then puts itself on the bottom. The Deck is not treated as empty in between.',
    'Drawing is the exception: the check happens after each card drawn.'
  ], [
    'Kondisi menang dicek setelah setiap aksi atau efek selesai',
    'Contoh: 「Cosmic Legacy」Silver Surfer memindahkan kartu teratas Deck, lalu menaruh dirinya di bawah Deck. Deck tidak dianggap kosong di tengahnya.',
    'Pengecualian: saat mengambil kartu, pengecekan terjadi setelah setiap kartu diambil.'
  ]);
  r('RS-014', 'trig', 'owner', [], [
    'An optional trigger with nothing it can do is skipped without asking',
    'This applies only when no part of the effect can be done. If the first part can be done, the effect can still be used (RS-022).',
    'The Head Judge agrees: "do as much as you can".'
  ], [
    'Trigger opsional yang tidak bisa melakukan apa pun dilewati tanpa ditanya',
    'Ini hanya berlaku bila tidak ada bagian efek yang bisa dilakukan. Bila bagian pertama bisa, efek tetap boleh dipakai (RS-022).',
    'Head Judge setuju: "lakukan sebanyak yang bisa".'
  ]);
  r('RS-022', 'trig', 'hj', ['SD01-006', 'SP01-026', 'SP01-006'], [
    'An effect can be used even if its result has no valid target',
    'If the first part of an effect (for example "discard / prune / swap this card") can be done, you may use the effect even when the "If you do" part has no valid target. The first part happens; the result does nothing.',
    'Example: discarding 「Hourglass Bite」Black Widow from HAND when the opponent has no Lv5-or-lower Character in BATTLE.',
    '"If you do" happens only if everything before it was done in full.'
  ], [
    'Efek bisa dipakai walaupun hasilnya tidak punya target sah',
    'Bila bagian pertama efek (misalnya "buang / prune / swap kartu ini") bisa dilakukan, Anda boleh memakai efeknya walaupun bagian "If you do" tidak punya target sah. Bagian pertama terjadi; hasilnya tidak berbuat apa-apa.',
    'Contoh: membuang 「Hourglass Bite」Black Widow dari HAND saat lawan tidak punya Karakter Lv5 ke bawah di BATTLE.',
    '"If you do" hanya terjadi bila semua yang sebelumnya dilakukan sepenuhnya.'
  ]);
  r('RS-036', 'trig', 'owner', ['SD02-006', 'SD02-005', 'SD03-006'], [
    'An effect does as much as it can when it asks for more cards than are available',
    'Example: 「Powered Armor」Iron Man attaches 2 Lv1 [Machine] Characters from RETREAT, or 1 if only 1 is there. "Place the top N cards face-down into your BASE" places as many as the BASE has room for.',
    'Exception: a cost before "If you do" must be possible. 「The Drone Surge」Ultron needs at least 3 cards in the Deck, 「Traction Arrow」Hawkeye at least 2.'
  ], [
    'Efek melakukan sebanyak yang bisa bila meminta kartu lebih banyak dari yang ada',
    'Contoh: 「Powered Armor」Iron Man memasang 2 Karakter Lv1 [Machine] dari RETREAT, atau 1 bila hanya ada 1. "Taruh N kartu teratas tertutup ke BASE" menaruh sebanyak tempat yang tersisa di BASE.',
    'Pengecualian: biaya sebelum "If you do" harus bisa dilakukan. 「The Drone Surge」Ultron butuh minimal 3 kartu di Deck, 「Traction Arrow」Hawkeye minimal 2.'
  ]);
  r('RS-002', 'trig', 'owner', [], [
    'Declining an optional "once per turn" trigger does not use it up',
    'With [may] you choose whether the effect triggers at all, so a declined effect has not triggered and can still trigger later that turn.'
  ], [
    'Menolak trigger opsional "once per turn" tidak menghabiskan jatahnya',
    'Dengan [may] Anda memilih apakah efek terpicu sama sekali, jadi efek yang ditolak belum terpicu dan masih bisa terpicu nanti di giliran itu.'
  ]);
  r('RS-016', 'trig', 'hj', [], [
    'A trigger created while an effect is resolving resolves right after that effect',
    'Such triggers resolve before effects that were already waiting for other players.',
    'Within each new group of simultaneous triggers, the turn player\'s effects go first, and each player orders their own.',
    'The new triggers of one player form one group. If that player still has an earlier trigger waiting, they choose whether it resolves before or after the whole new group, never in the middle of it.'
  ], [
    'Trigger yang muncul saat sebuah efek berjalan diselesaikan tepat setelah efek itu',
    'Trigger seperti itu diselesaikan sebelum efek milik pemain lain yang sudah menunggu.',
    'Dalam setiap kelompok trigger baru yang bersamaan, efek pemain giliran lebih dulu, dan setiap pemain mengurutkan efeknya sendiri.',
    'Trigger baru milik satu pemain membentuk satu kelompok. Bila pemain itu masih punya trigger lama yang menunggu, ia memilih apakah trigger lama itu diselesaikan sebelum atau sesudah seluruh kelompok baru, tidak pernah di tengahnya.'
  ]);
  r('RS-019', 'trig', 'owner', ['BP01-063'], [
    'A card that enters the HAND during a timing still triggers at that timing',
    'Example: a card effect draws 「Time Abduction」Loki while effects of that timing are still resolving; Loki can still trigger for it.'
  ], [
    'Kartu yang masuk HAND di tengah sebuah timing tetap terpicu di timing itu',
    'Contoh: efek kartu mengambil 「Time Abduction」Loki saat efek dari timing itu masih berjalan; Loki tetap bisa terpicu.'
  ]);
  r('RS-020', 'trig', 'owner', ['SP01-067', 'SD01-001'], [
    '"Loses its effects" is checked after the event',
    'A card that loses its effects (for example from Anti-Venom) has no TRIG, AUTO or ACTI. A trigger whose event happens as the effects are lost does not trigger.',
    'Example: attaching Anti-Venom to 「Self-Destruct Program」Iron Man does not trigger Iron Man\'s "when this card is attached".',
    'UNIQUE is kept. Granted abilities are lost too.'
  ], [
    '"Kehilangan efek" dicek setelah kejadiannya',
    'Kartu yang kehilangan efek (misalnya karena Anti-Venom) tidak punya TRIG, AUTO, atau ACTI. Trigger yang kejadiannya terjadi bersamaan dengan hilangnya efek tidak terpicu.',
    'Contoh: memasang Anti-Venom ke 「Self-Destruct Program」Iron Man tidak memicu "saat kartu ini dipasangi" milik Iron Man.',
    'UNIQUE tetap ada. Kemampuan yang diberikan efek lain juga hilang.'
  ]);
  r('RS-021', 'trig', 'owner', [], [
    'One effect moving several cards moves them one at a time',
    'The player whose effect is resolving chooses the order.'
  ], [
    'Satu efek yang memindahkan beberapa kartu memindahkannya satu per satu',
    'Pemain pemilik efek yang sedang berjalan memilih urutannya.'
  ]);
  r('RS-044', 'trig', 'cr', ['BP01-038'], [
    'Start-of-turn triggers resolve before the Draw Phase',
    'Example: 「Buzzer Beater」Wasp swaps at the start of the opponent\'s turn, before they draw.'
  ], [
    'Trigger awal giliran diselesaikan sebelum Draw Phase',
    'Contoh: 「Buzzer Beater」Wasp melakukan swap di awal giliran lawan, sebelum lawan mengambil kartu.'
  ]);
  r('RS-033', 'trig', 'owner', ['SD04-008', 'SD04-009', 'SD04-014'], [
    '"Enters RETREAT by discarding of effect" counts discards from the HAND and from the Deck',
    'These cards trigger when an effect discards them from the HAND or from the top of the Deck (for example 「Traction Arrow」Hawkeye).',
    'The HAND-limit discard in the End Phase is a game rule, so it does not trigger them.'
  ], [
    '"Masuk RETREAT karena dibuang oleh efek" menghitung buangan dari HAND dan dari Deck',
    'Kartu-kartu ini terpicu bila efek membuangnya dari HAND atau dari atas Deck (misalnya 「Traction Arrow」Hawkeye).',
    'Buangan karena batas HAND di End Phase adalah aturan permainan, jadi tidak memicunya.'
  ]);

  /* ---------- F. Istilah kartu dan area ---------- */
  r('RS-030', 'terms', 'hj', [], [
    'RETREAT (area) vs retreat (action)',
    'RETREAT in capitals is the area; "retreat" is the action. Only cards on the FIELD can be retreated. Moving a card from the HAND or Deck to RETREAT is a discard.',
    '"Number of cards you retreat" counts only the cards you retreated, not the Attached Cards that follow them. "Number of cards sent to RETREAT" counts every card, Attached Cards included.'
  ], [
    'RETREAT (area) vs retreat (aksi)',
    'RETREAT huruf besar adalah area; "retreat" adalah aksinya. Hanya kartu di FIELD yang bisa di-retreat. Memindahkan kartu dari HAND atau Deck ke RETREAT disebut membuang (discard).',
    '"Jumlah kartu yang Anda retreat" hanya menghitung kartu yang Anda retreat, bukan Attached Card yang ikut. "Jumlah kartu yang masuk RETREAT" menghitung semua kartu, termasuk Attached Card.'
  ]);
  r('RS-031', 'terms', 'hj', ['BP01-066'], [
    'A Character retreated by a card attached to it is retreated by its own side\'s effect',
    'Example: the opponent attaches Riot to your Character and Riot\'s effect retreats it. Riot is now on your side, so 「Turn The Tide」Captain America (which needs "your opponent\'s effect") cannot be used.'
  ], [
    'Karakter yang di-retreat oleh kartu yang terpasang padanya dianggap di-retreat efek pihaknya sendiri',
    'Contoh: lawan memasang Riot ke Karakter Anda dan efek Riot me-retreat-nya. Riot sekarang ada di pihak Anda, jadi 「Turn The Tide」Captain America (yang butuh "efek lawan") tidak bisa dipakai.'
  ]);
  r('RS-041', 'terms', 'owner', ['BP01-028', 'PB01-010', 'SP01-042'], [
    'A card on the opponent\'s FIELD: owner and controller',
    'A card you place onto the opponent\'s FIELD is still owned by you, but the opponent controls it. "You" in its text is the controller.',
    'When it leaves the FIELD it goes to its owner\'s area (RETREAT, VOID, HAND or Deck).',
    'Example: 「Behind Enemy Lines」Black Widow placed in the opponent\'s BASE: its "enters the field" belongs to the opponent, and "chosen by your opponent" means you choose.'
  ], [
    'Kartu di FIELD lawan: pemilik dan pengendali',
    'Kartu yang Anda taruh ke FIELD lawan tetap milik Anda, tetapi dikendalikan lawan. "You" di teksnya adalah pengendalinya.',
    'Saat meninggalkan FIELD, kartu itu masuk ke area pemiliknya (RETREAT, VOID, HAND, atau Deck).',
    'Contoh: 「Behind Enemy Lines」Black Widow yang ditaruh di BASE lawan: "saat masuk field"-nya milik lawan, dan "dipilih oleh lawanmu" berarti Anda yang memilih.'
  ]);
  r('RS-060', 'terms', 'owner', [], [
    'Attaching from outside the FIELD is placing; attaching from the FIELD is moving',
    'A Character attached from the HAND, RETREAT, VOID or Deck is placed onto the FIELD, so every "enters the field" effect triggers, including its own.',
    'A card attached from another place on the FIELD only moves. Detaching and swapping two cards on the FIELD are moves too.'
  ], [
    'Memasang dari luar FIELD = menaruh; memasang dari FIELD = memindahkan',
    'Karakter yang dipasang dari HAND, RETREAT, VOID, atau Deck dianggap ditaruh ke FIELD, jadi semua efek "masuk field" terpicu, termasuk miliknya sendiri.',
    'Kartu yang dipasang dari tempat lain di FIELD hanya berpindah. Melepas pasangan dan swap dua kartu di FIELD juga perpindahan.'
  ]);
  r('RS-061', 'terms', 'owner', ['SP01-026', 'SP01-064', 'SP01-022'], [
    'Swapping a Character with one of its Attached Cards',
    'The Attached Card takes the Character\'s position, state and other Attached Cards; the Character becomes an Attached Card under it. Both only move, so nothing "enters the field".',
    'The card that just became attached counts as attached for "when you attach this card" triggers.'
  ], [
    'Swap Karakter dengan salah satu Attached Card-nya',
    'Attached Card mengambil posisi, keadaan, dan Attached Card lain milik Karakter; Karakter menjadi Attached Card di bawahnya. Keduanya hanya berpindah, jadi tidak ada yang "masuk field".',
    'Kartu yang baru menjadi Attached Card dihitung "dipasang" untuk trigger "saat kartu ini dipasang".'
  ]);
  r('RS-062', 'terms', 'owner', ['BP01-061', 'BP01-069', 'SP01-022', 'SP01-026'], [
    'A card in the HAND swapped onto the FIELD is placed',
    'The card from the HAND enters the FIELD and "enters the field" effects trigger. The card from the FIELD moves to the HAND.'
  ], [
    'Kartu di HAND yang di-swap ke FIELD dianggap ditaruh',
    'Kartu dari HAND masuk ke FIELD dan efek "masuk field" terpicu. Kartu dari FIELD pindah ke HAND.'
  ]);
  r('RS-059', 'terms', 'owner', ['SP01-070', 'SP01-021', 'SP01-032'], [
    '"Enters VOID"',
    '"Your character with 【Web】 enters VOID" counts a card you own from any area (FIELD, HAND, RETREAT, Deck).',
    '"By your effect" = an effect you control. A card pruned as a cost or by a game rule is not pruned "by an effect".'
  ], [
    '"Masuk VOID"',
    '"Karaktermu dengan 【Web】 masuk VOID" menghitung kartu milik Anda dari area mana pun (FIELD, HAND, RETREAT, Deck).',
    '"Oleh efekmu" = efek yang Anda kendalikan. Kartu yang di-prune sebagai biaya atau oleh aturan permainan bukan "oleh efek".'
  ]);
  r('RS-018', 'terms', 'owner', [], [
    'Which card text the simulator follows',
    'The English card text is the reference for Battle Sim. The Chinese text is used only to settle unclear wording. Indonesian text is shown in the card viewer when available.'
  ], [
    'Teks kartu yang diikuti simulator',
    'Teks kartu bahasa Inggris menjadi acuan Battle Sim. Teks Mandarin hanya dipakai untuk memperjelas kalimat yang kurang jelas. Teks Indonesia ditampilkan di penampil kartu bila tersedia.'
  ]);

  /* ---------- G. Kartu tertentu ---------- */
  r('RS-003', 'cards', 'owner', ['SD01-003'], [
    '「Fire Support」War Machine triggers when the R or Power of ANY of your Characters increases',
    'This includes War Machine itself. Once per turn, and War Machine must be in BATTLE. The Head Judge agrees with the English "your character".'
  ], [
    '「Fire Support」War Machine terpicu saat R atau Power Karakter Anda MANA PUN naik',
    'Termasuk War Machine sendiri. Satu kali per giliran, dan War Machine harus di BATTLE. Head Judge setuju dengan teks Inggris "your character".'
  ]);
  r('RS-004', 'cards', 'owner', ['SD01-009'], [
    '「MK44 - The Pulse」Hulk Buster places as many as possible',
    'With fewer than 2 matching Characters in RETREAT, or fewer than 2 free spaces in BASE, place as many as possible. The Pulse itself can be chosen.'
  ], [
    '「MK44 - The Pulse」Hulk Buster menaruh sebanyak mungkin',
    'Bila Karakter yang cocok di RETREAT kurang dari 2, atau tempat kosong di BASE kurang dari 2, taruh sebanyak mungkin. The Pulse sendiri boleh dipilih.'
  ]);
  r('RS-009', 'cards', 'owner', ['SD01-005'], [
    '「Hero Call」Thor needs exactly 2 cards in BASE',
    'With fewer it cannot be used. Retreat 2 BASE cards; draw 2 only if both are red. Face-down cards are face-up in RETREAT, so their color is known.'
  ], [
    '「Hero Call」Thor butuh tepat 2 kartu di BASE',
    'Bila kurang, tidak bisa dipakai. Retreat 2 kartu BASE; ambil 2 kartu hanya bila keduanya merah. Kartu tertutup terbuka di RETREAT, jadi warnanya terlihat.'
  ]);
  r('RS-010', 'cards', 'owner', ['SD01-001'], [
    '「Self-Destruct Program」Iron Man',
    '"When this card is attached" means when another card becomes attached to this Iron Man.',
    '"In the field" includes the opponent\'s face-up Characters in the BASE. X is the combined current Lv of the attached cards that were retreated.'
  ], [
    '「Self-Destruct Program」Iron Man',
    '"Saat kartu ini dipasangi" berarti saat kartu lain terpasang ke Iron Man ini.',
    '"Di field" termasuk Karakter terbuka lawan di BASE. X = total Lv saat ini dari kartu terpasang yang di-retreat.'
  ]);
  r('RS-023', 'cards', 'hj', ['BP01-066', 'EB01-012'], [
    '「Turn The Tide」Captain America and Power reduced to 0',
    'A Character that retreated because an opponent\'s effect reduced its Power to 0 counts for Turn The Tide, even though the retreat itself is a game rule.',
    'It also counts losing the fight (BOTH LOSE included). It does not count effects of a card attached to your own Character (RS-031).'
  ], [
    '「Turn The Tide」Captain America dan Power yang turun ke 0',
    'Karakter yang di-retreat karena efek lawan menurunkan Power-nya ke 0 dihitung untuk Turn The Tide, walaupun retreat-nya sendiri terjadi karena aturan.',
    'Kalah bertarung (termasuk BOTH LOSE) juga dihitung. Efek kartu yang terpasang pada Karakter Anda sendiri tidak dihitung (RS-031).'
  ]);
  r('RS-001', 'cards', 'owner', ['BP01-063'], [
    'What counts as "Power decreased" (「Time Abduction」Loki)',
    'Counts: a one-time minus effect, an opponent\'s aura that newly applies, a Character entering the FIELD under a reducing aura, and a decrease that makes it retreat.',
    'Does not count: your own buff ending. The Head Judge agrees.'
  ], [
    'Apa yang dihitung "Power berkurang" (「Time Abduction」Loki)',
    'Dihitung: efek minus sekali jalan, aura lawan yang baru berlaku, Karakter yang masuk FIELD di bawah aura pengurang, dan penurunan yang membuatnya di-retreat.',
    'Tidak dihitung: buff Anda sendiri yang berakhir. Head Judge setuju.'
  ]);
  r('RS-037', 'cards', 'owner', ['SD02-011'], [
    '「Thunder Resonance」Thor compares printed Lv',
    'The shown face-down card\'s printed Lv is compared with the losing Character\'s printed Lv. A match is flipped face-up (not "placed").'
  ], [
    '「Thunder Resonance」Thor membandingkan Lv cetak',
    'Lv cetak kartu tertutup yang diperlihatkan dibandingkan dengan Lv cetak Karakter yang kalah. Bila sama, kartu dibuka (bukan "ditaruh").'
  ]);
  r('RS-039', 'cards', 'owner', ['SD03-009', 'SD02-002', 'SD03-018', 'SD03-003', 'SD04-003', 'SD03-015'], [
    'Small readings for SD02–SD04 cards',
    '「Fire Cover」Phil Coulson: "your character" is another of your Characters; a defending Character that wins also counts.',
    '「Phase-Driven」Vision does not trigger for itself. 「Void Banish」Scarlet Witch triggers at the end of every turn, both players\'.',
    '「Urgent Call」Nick Fury needs an empty BATTLE area. 「Quantum Rewind」Ant-Man: with a tie for highest or lowest Lv, the Ant-Man player chooses.',
    '「Martyrdom」Captain America: the attacker must be exactly Lv3; totals use the current Lv of Characters in BATTLE.'
  ], [
    'Bacaan kecil untuk kartu SD02–SD04',
    '「Fire Cover」Phil Coulson: "your character" adalah Karakter Anda yang lain; Karakter bertahan yang menang juga dihitung.',
    '「Phase-Driven」Vision tidak terpicu untuk dirinya sendiri. 「Void Banish」Scarlet Witch terpicu di akhir setiap giliran, milik kedua pemain.',
    '「Urgent Call」Nick Fury butuh area BATTLE yang kosong. 「Quantum Rewind」Ant-Man: bila Lv tertinggi atau terendah seri, pemain Ant-Man yang memilih.',
    '「Martyrdom」Captain America: penyerang harus tepat Lv3; totalnya memakai Lv saat ini dari Karakter di BATTLE.'
  ]);
  r('RS-042', 'cards', 'owner', ['BP01-054', 'SP01-043'], [
    '"【Ultron】 / 【Archenemy】 in their features" is read as the name',
    'No card has these features, so the text means the card name: Ultron cards for 「Ultron-Spawn Rebuild」Ultron, and "Spider-Archenemy" cards for Kingpin.'
  ], [
    '"【Ultron】 / 【Archenemy】 dalam fitur" dibaca sebagai nama',
    'Tidak ada kartu dengan fitur ini, jadi maksudnya nama kartu: kartu Ultron untuk 「Ultron-Spawn Rebuild」Ultron, dan kartu "Spider-Archenemy" untuk Kingpin.'
  ]);
  r('RS-043', 'cards', 'owner', ['BP01-050', 'BP01-047', 'BP01-035', 'BP01-048', 'BP01-022'], [
    'Small readings for BP01 red and yellow cards',
    '「Superconductive Charge」Thor "can not move": no BATTLE-BASE MOVE and no move by effect; rearranging before attacks is still allowed.',
    '「Central Control System」Iron Man: the detached Hulk Buster moves to an empty BATTLE area; it does not "enter the field".',
    '「MK44-The Commander」Hulk Buster: "BATTLE Move" goes to an empty BATTLE area, not a swap.',
    '「Top Agent」Black Widow: "【AUTO】 in their effects" includes UNIQUE and COUNTER.'
  ], [
    'Bacaan kecil untuk kartu BP01 merah dan kuning',
    '「Superconductive Charge」Thor "tidak bisa bergerak": tidak ada BATTLE-BASE MOVE dan tidak ada perpindahan oleh efek; menyusun ulang sebelum menyerang tetap boleh.',
    '「Central Control System」Iron Man: Hulk Buster yang dilepas pindah ke area BATTLE kosong; ia tidak "masuk field".',
    '「MK44-The Commander」Hulk Buster: "BATTLE Move" ke area BATTLE kosong, bukan swap.',
    '「Top Agent」Black Widow: "【AUTO】 dalam efeknya" termasuk UNIQUE dan COUNTER.'
  ]);
  r('RS-046', 'cards', 'owner', ['BP01-062'], [
    '「Freedom Will」Captain America in BASE',
    'While face-up in the BASE, effects of cards whose current Lv is 4 or lower cannot choose it or change it, including auras and effects from the HAND, and including its owner\'s own cards. Lv5+ cards and game rules still apply.'
  ], [
    '「Freedom Will」Captain America di BASE',
    'Selama terbuka di BASE, efek kartu dengan Lv saat ini 4 ke bawah tidak bisa memilih atau mengubahnya, termasuk aura dan efek dari HAND, dan termasuk kartu milik pemiliknya sendiri. Kartu Lv5+ dan aturan permainan tetap berlaku.'
  ]);
  r('RS-048', 'cards', 'owner', ['BP01-072', 'BP01-101', 'BP01-064', 'BP01-090', 'BP01-094', 'BP01-098', 'BP01-073'], [
    'Small readings for BP01 blue and green cards',
    '「Force Field」 and 「MIRV Arrow」 ("your weakness is attacked") also count an AIR STRIKE on an occupied area.',
    '「Quantum Core」 "In Battle Phase" means either player\'s Battle Phase.',
    '「Freedom Decision」: X is the total Power of your BATTLE Characters when the effect resolves. 「God Of Story」: X counts your BATTLE Characters that never declared an attack this turn.',
    '「Chaos Clairvoyance」: the Character it is attached to can attack only a Lv6 Character, not a Weakness. 「Fantastic Perfusion」: Attached Cards count.'
  ], [
    'Bacaan kecil untuk kartu BP01 biru dan hijau',
    '「Force Field」 dan 「MIRV Arrow」 ("weakness-mu diserang") juga menghitung AIR STRIKE ke area yang berisi.',
    '「Quantum Core」 "In Battle Phase" berarti Battle Phase pemain mana pun.',
    '「Freedom Decision」: X = total Power Karakter BATTLE Anda saat efek dijalankan. 「God Of Story」: X menghitung Karakter BATTLE Anda yang belum pernah mendeklarasikan serangan giliran ini.',
    '「Chaos Clairvoyance」: Karakter yang ditempelinya hanya bisa menyerang Karakter Lv6, bukan Weakness. 「Fantastic Perfusion」: Attached Card ikut dihitung.'
  ]);
  r('RS-049', 'cards', 'owner', ['TB01-001'], [
    '「Lord of Battleworld」Doctor Doom: "cards with Lv2 or below in the field"',
    'Only face-up cards count; a Face-Down Card has no Lv. Attached Cards count.'
  ], [
    '「Lord of Battleworld」Doctor Doom: "kartu Lv2 ke bawah di field"',
    'Hanya kartu terbuka yang dihitung; Face-Down Card tidak punya Lv. Attached Card ikut dihitung.'
  ]);
  r('RS-050', 'cards', 'owner', ['PB01-002'], [
    '「My Rabbit」Rocket Raccoon: "if its target was attacked before in this turn"',
    'The target had already been an Attack Target earlier this turn (declared attack, new target, [BLOCK] or a target-changing effect), whatever the result. A Weakness is not a Character, so nothing retreats.'
  ], [
    '「My Rabbit」Rocket Raccoon: "bila targetnya sudah diserang sebelumnya giliran ini"',
    'Target itu sudah pernah menjadi Attack Target sebelumnya di giliran ini (serangan, target baru, [BLOCK], atau efek pengubah target), apa pun hasilnya. Weakness bukan Karakter, jadi tidak ada yang di-retreat.'
  ]);
  r('RS-051', 'cards', 'owner', ['PB01-003'], [
    '「Galaxy Dancer」Star-Lord: "when your opponent\'s character enters the field by effect"',
    'Counts an opponent\'s Character placed by an effect or swapped in from RETREAT. Not CALL or COUNTER CALL. Star-Lord must be face-up in your BASE.'
  ], [
    '「Galaxy Dancer」Star-Lord: "saat Karakter lawan masuk field oleh efek"',
    'Menghitung Karakter lawan yang ditaruh oleh efek atau masuk lewat swap dari RETREAT. Bukan CALL atau COUNTER CALL. Star-Lord harus terbuka di BASE Anda.'
  ]);
  r('RS-052', 'cards', 'owner', ['PB01-008'], [
    '「Thunder Teleportation」Thor: "if you have only yellow characters in BATTLE"',
    'You need at least 1 Character in BATTLE and all of them yellow. Checked when the COUNTER CALL is made.'
  ], [
    '「Thunder Teleportation」Thor: "bila Karakter di BATTLE-mu hanya yang kuning"',
    'Harus ada minimal 1 Karakter di BATTLE dan semuanya kuning. Dicek saat COUNTER CALL dilakukan.'
  ]);
  r('RS-054', 'cards', 'owner', ['PB01-009', 'PB01-011', 'EB01-007', 'EB01-008'], [
    'Small readings for PB01 and EB01 cards',
    '「Heaven Sent Troops」Hulk: the cost is all 6 cards of a full BASE, face-down cards included.',
    '「Astral Visitor」Doctor Strange: ACTI from VOID, once per turn; "Lv4 or above" in RETREAT = printed Lv.',
    '「Spiritual Resonance」Vision: the retreated Lv3 [Avengers] Character can be Vision itself or a face-up Character in your BASE.'
  ], [
    'Bacaan kecil untuk kartu PB01 dan EB01',
    '「Heaven Sent Troops」Hulk: biayanya seluruh 6 kartu BASE yang penuh, termasuk kartu tertutup.',
    '「Astral Visitor」Doctor Strange: ACTI dari VOID, satu kali per giliran; "Lv4 ke atas" di RETREAT = Lv cetak.',
    '「Spiritual Resonance」Vision: Karakter Lv3 [Avengers] yang di-retreat boleh Vision sendiri atau Karakter terbuka di BASE Anda.'
  ]);
  r('RS-055', 'cards', 'owner', ['SP01-052', 'SP01-013'], [
    'Scream and Tony Stark change Power reductions',
    'Scream: each reduction to Scream is doubled. Tony Stark in BACK: each reduction to your BATTLE Characters is 500 smaller per Lv6 Character on your field.',
    'With both: Tony first, then Scream. Example: -1000 with 1 Lv6 → (-1000 + 500) × 2 = -1000. A reduction never becomes an increase.'
  ], [
    'Scream dan Tony Stark mengubah pengurangan Power',
    'Scream: setiap pengurangan pada Scream menjadi dua kali lipat. Tony Stark di BACK: setiap pengurangan pada Karakter BATTLE Anda berkurang 500 per Karakter Lv6 di field Anda.',
    'Bila keduanya: Tony dulu, lalu Scream. Contoh: -1000 dengan 1 Lv6 → (-1000 + 500) × 2 = -1000. Pengurangan tidak pernah berubah menjadi penambahan.'
  ]);
  r('RS-058', 'cards', 'owner', ['SP01-047'], [
    'Knull: "gets the effects of 1 of its attached cards this turn"',
    'Knull gets that card\'s TRIG, ACTI, AUTO and abilities until the End Phase or until Knull leaves the FIELD. "This card" in the borrowed text means Knull.',
    'An Attached Card keeps using its own effects as long as their conditions are met; a borrowed effect is not counted twice.'
  ], [
    'Knull: "mendapat efek 1 kartu yang terpasang padanya giliran ini"',
    'Knull mendapat TRIG, ACTI, AUTO, dan kemampuan kartu itu sampai End Phase atau sampai Knull meninggalkan FIELD. "Kartu ini" di teks pinjaman berarti Knull.',
    'Attached Card tetap memakai efeknya sendiri selama syaratnya terpenuhi; efek yang dipinjam tidak dihitung dua kali.'
  ]);
  r('RS-063', 'cards', 'owner', ['SP01-038', 'SP01-054', 'SP01-018', 'SP01-004', 'SP01-061', 'SP01-068'], [
    'Small readings for SP01 cards',
    'Boomerang and Lasher: a Character whose Power reaches 0 from their -1000 retreats at once inside the effect, so "retreated by this effect" is checked right away.',
    'Kraven: "In Battle Phase" = either player\'s Battle Phase; abilities counted are UNIQUE, COUNTER, BLOCK, DOUBLE ATTACK, ASSAULT and AIR STRIKE.',
    'Elektra "enters RETREAT from the field by an effect": retreated by an effect or by Power 0 from an effect; not a CALL cost or a lost fight.',
    'Mr. Negative "if you did not call a character" = no CALL and no COUNTER CALL by you this turn.',
    'Superior Spider-Man covers only after its BATTLE-BASE Move to BASE, and only if another [Machine] card is on the field.'
  ], [
    'Bacaan kecil untuk kartu SP01',
    'Boomerang dan Lasher: Karakter yang Power-nya menjadi 0 karena -1000 mereka langsung di-retreat di dalam efek, jadi "di-retreat oleh efek ini" langsung dicek.',
    'Kraven: "In Battle Phase" = Battle Phase pemain mana pun; kemampuan yang dihitung: UNIQUE, COUNTER, BLOCK, DOUBLE ATTACK, ASSAULT, dan AIR STRIKE.',
    'Elektra "masuk RETREAT dari field oleh efek": di-retreat oleh efek atau Power 0 karena efek; bukan biaya CALL atau kalah bertarung.',
    'Mr. Negative "bila kamu tidak meng-CALL Karakter" = tidak ada CALL dan COUNTER CALL dari Anda giliran ini.',
    'Superior Spider-Man menutup hanya setelah BATTLE-BASE Move ke BASE, dan hanya bila ada kartu [Machine] lain di field.'
  ]);
  r('RS-065', 'cards', 'owner', ['SD06-002'], [
    '"Damaged character" (Corvus Glaive)',
    'A Character whose current Power is lower than its printed Power because of a minus effect, from either player.'
  ], [
    '"Karakter yang rusak" (Corvus Glaive)',
    'Karakter yang Power-nya saat ini lebih rendah dari Power cetaknya karena efek minus, dari pemain mana pun.'
  ]);
  r('RS-066', 'cards', 'owner', ['PB02-004'], [
    'Gamora: "total Power is 6500"',
    'Read literally: the ACTI from the HAND is offered only when the total Power of your BATTLE Characters is exactly 6500.'
  ], [
    'Gamora: "total Power 6500"',
    'Dibaca apa adanya: ACTI dari HAND hanya ditawarkan bila total Power Karakter BATTLE Anda tepat 6500.'
  ]);
  r('RS-067', 'cards', 'owner', ['SD05-007', 'PB02-007', 'PB02-018', 'SD05-001', 'SD05-017', 'SD05-018'], [
    'Small readings for SD05, SD06 and PB02 cards',
    'The Lv of a card in HAND, RETREAT or VOID is its printed Lv.',
    '"Can not attack / can not move" also blocks rearranging that Character before the Battle Phase.',
    'Yondu: the extra activation happens only once per turn. Odin: the draw happens when the Power-X brings that Character to 0.',
    'Hela: "discarded" = sent to RETREAT from HAND or Deck by an effect.'
  ], [
    'Bacaan kecil untuk kartu SD05, SD06, dan PB02',
    'Lv kartu di HAND, RETREAT, atau VOID adalah Lv cetaknya.',
    '"Tidak bisa menyerang / tidak bisa bergerak" juga melarang Karakter itu disusun ulang sebelum Battle Phase.',
    'Yondu: aktivasi tambahan hanya satu kali per giliran. Odin: ambil kartu terjadi saat Power-X membuat Karakter itu menjadi 0.',
    'Hela: "dibuang" = dikirim ke RETREAT dari HAND atau Deck oleh efek.'
  ]);

  /* ===================== tampilan ===================== */
  const S = () => window.MHRSim;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ID = () => !!(window.MHRSimI18N && window.MHRSimI18N.lang === 'id');
  const T = (en, ind) => ID() ? ind : en;
  const st = { q: '', cat: 'all', src: 'all', open: null };
  const txt = x => ID() ? x.id_ : x.en;
  const nameOf = no => { try { const c = S().card(no); return c ? S().nameEn(c) : ''; } catch (e) { return ''; } };
  const hay = x => (x.id + ' ' + x.en.join(' ') + ' ' + x.id_.join(' ') + ' ' + x.cards.join(' ') + ' ' + x.cards.map(nameOf).join(' ')).toLowerCase();

  function itemHTML(x) {
    const t = txt(x), s = SRC[x.s];
    const cards = x.cards.map(no => '<button class="rlcard" data-rlcard="' + esc(no) + '">' + esc(no) + (nameOf(no) ? ' · ' + esc(nameOf(no)) : '') + '</button>').join('');
    return '<article class="rlitem" id="rl-' + esc(x.id) + '"' + (st.open === x.id ? ' data-hit="1"' : '') + '><div class="rlhd"><span class="rlid">' + esc(x.id) + '</span>' +
      '<span class="rlsrc s-' + esc(x.s) + '">' + esc(s[ID() ? 1 : 0]) + '</span>' +
      '<button class="rlcopy" data-rlcopy="' + esc(x.id) + '" title="' + esc(T('Copy link', 'Salin tautan')) + '">🔗</button></div>' +
      '<h3>' + esc(t[0]) + '</h3><ul>' + t.slice(1).map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>' +
      (cards ? '<div class="rlcards">' + cards + '</div>' : '') + '</article>';
  }
  function introHTML() {
    return '<details class="rlhow"><summary>' + esc(T('How we decide a ruling', 'Cara kami menentukan ruling')) + '</summary><ol class="small">' +
      '<li>' + esc(T('The official Comprehensive Rules come first.', 'Comprehensive Rules resmi menjadi acuan pertama.')) + '</li>' +
      '<li>' + esc(T('Then the English card text. The Chinese text is used only when the English wording is unclear.', 'Lalu teks kartu bahasa Inggris. Teks Mandarin hanya dipakai bila kalimat bahasa Inggris kurang jelas.')) + '</li>' +
      '<li>' + esc(T('Statements by the Head Judge of Marvel Hero Rush Indonesia, once we have checked them.', 'Pernyataan Head Judge Marvel Hero Rush Indonesia, setelah kami periksa.')) + '</li>' +
      '<li>' + esc(T('Where none of these answers a case, MHR Deck Lab decides how Battle Sim plays it. These are marked "MHR Deck Lab ruling": they are not official and may change when an official answer appears.', 'Bila semua itu belum menjawab sebuah kasus, MHR Deck Lab memutuskan cara Battle Sim memainkannya. Ruling ini diberi label "Ruling MHR Deck Lab": bukan ruling resmi dan bisa berubah bila ada jawaban resmi.')) + '</li>' +
      '</ol><p class="small muted">' + esc(T('Found a case that plays differently from your table? Send it with Feedback; include the log code if you can.', 'Menemukan kasus yang dimainkan berbeda dari meja Anda? Kirim lewat Feedback; sertakan kode log bila bisa.')) + '</p></details>';
  }
  function render(el) {
    if (!el) return;
    const q = st.q.trim().toLowerCase();
    const list = L.filter(x => (st.cat === 'all' || x.c === st.cat) && (st.src === 'all' || x.s === st.src) && (!q || hay(x).includes(q)));
    const n = k => L.filter(x => x.s === k).length;
    let h = '<div class="hd"><h2>Rules</h2></div><div class="rlpage" data-noi18n>' +
      '<p class="small muted">' + esc(T('How Battle Sim rules each case, and where every ruling comes from. Tap 🔗 to copy a direct link.', 'Cara Battle Sim memutuskan setiap kasus, beserta sumber setiap ruling. Ketuk 🔗 untuk menyalin tautan langsung.')) + '</p>' +
      introHTML() +
      '<div class="rlbar"><input id="rlQ" type="search" placeholder="' + esc(T('Search rulings, cards, keywords…', 'Cari ruling, kartu, kata kunci…')) + '" value="' + esc(st.q) + '"></div>' +
      '<div class="rlchips">' + [['all', T('All', 'Semua') + ' (' + L.length + ')']].concat(Object.keys(SRC).map(k => [k, SRC[k][ID() ? 1 : 0] + ' (' + n(k) + ')'])).map(([k, l]) => '<button data-rlsrc="' + k + '"' + (st.src === k ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>' +
      '<div class="rlchips cats">' + [['all', T('All topics', 'Semua topik')]].concat(CATS.map(c => [c[0], ID() ? c[2] : c[1]])).map(([k, l]) => '<button data-rlcat="' + k + '"' + (st.cat === k ? ' class="on"' : '') + '>' + esc(l) + '</button>').join('') + '</div>';
    if (!list.length) h += '<div class="box small muted">' + esc(T('No ruling matches your search.', 'Tidak ada ruling yang cocok dengan pencarian Anda.')) + '</div>';
    CATS.forEach(c => {
      const part = list.filter(x => x.c === c[0]); if (!part.length) return;
      h += '<h4 class="rlcat">' + esc(ID() ? c[2] : c[1]) + '</h4>' + part.map(itemHTML).join('');
    });
    h += '</div>';
    el.innerHTML = h;
    const inp = el.querySelector('#rlQ');
    if (inp) inp.oninput = () => { st.q = inp.value; const pos = inp.selectionStart; render(el); const i2 = el.querySelector('#rlQ'); if (i2) { i2.focus(); try { i2.setSelectionRange(pos, pos); } catch (e) { /* abaikan */ } } };
    el.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rlsrc) { st.src = b.dataset.rlsrc; render(el); return; }
      if (b.dataset.rlcat) { st.cat = b.dataset.rlcat; render(el); return; }
      if (b.dataset.rlcopy) { copyLink(b.dataset.rlcopy, b); return; }
      if (b.dataset.rlcard) { cardPop(b.dataset.rlcard); return; }
    };
    if (st.open) { const t = el.querySelector('#rl-' + CSS.escape(st.open)); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60); st.open = null; }
  }
  function copyLink(id, btn) {
    const url = 'https://mhrdecklab.com/#sim/rules/' + id;
    const done = () => { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '🔗'; }, 1500); };
    try { navigator.clipboard.writeText(url).then(done, () => prompt('Link', url)); } catch (e) { prompt('Link', url); }
  }
  function cardPop(no) {
    const c = S() && S().card(no); if (!c) return;
    const base = window.MHRSIM_BASE || '../';
    const ov = document.createElement('div');
    ov.className = 'rlpop';
    ov.innerHTML = '<div class="rlpopin"><img src="' + esc(base + 'images/' + (ID() ? '' : 'en/') + no + '.jpg') + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(base + 'images/' + no + '.jpg') + '\'">' +
      '<div><b>' + esc(no) + ' · ' + esc(S().nameEn(c)) + '</b><p class="small">' + esc(ID() && c.e ? c.e : S().textEn(c)) + '</p><button class="pri">' + esc(T('Close', 'Tutup')) + '</button></div></div>';
    ov.onclick = e => { if (e.target === ov || e.target.closest('button')) ov.remove(); };
    document.body.appendChild(ov);
  }
  // tautan langsung: #rules/RS-023 → buka tab Rules dan gulir ke ruling itu
  function focus(id) { if (id && L.some(x => x.id === id)) { st.open = id; st.cat = 'all'; st.src = 'all'; st.q = ''; } }

  window.MHRSimRules = { render, focus, list: L, CATS, SRC };
})();
