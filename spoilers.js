/* ===================================================================
   MHR DECK LAB — spoilers.js (v6.64; v6.93: SD05 & SD06 lengkap 18+18 kartu)
   ===================================================================
   Kartu yang SUDAH diungkap tapi BELUM rilis / belum masuk cards.js.
   Dipakai halaman Set (#set/SD05 dst.) — TIDAK masuk deck builder.
   Teks = terjemahan fan dari lembar produk Tionghoa (belum resmi).
   Begitu kartunya rilis resmi: pindahkan ke cards.js (format cards.js),
   hapus dari sini, dan ubah status set-nya di data.js (window.SETS).

   Field: no, ra (rarity cetakan ini), c (warna, nama seperti cards.js),
   l (Lv), r (Range), p (Power), nm (nama), f (trait), e (daftar efek),
   img (gambar ber-watermark SAMPLE).
   v6.93 (16 Okt 2026): SD05/SD06/PB02 sudah rilis di China, belum di Indonesia.
   Semua 36 nomor SD05/SD06 + SEC Thanos + 21 PB02 = 58 cetakan.
   Audit 19 Okt 2026 vs daftar kartu resmi marvelherorush.com/cn: +3 cetakan
   (SD05-001 UR & SEC, SD06-001 MR) → 61. PB02-002 & PB02-004 diganti ke versi
   final (teks/Power berubah dari spoiler). Kartu RUSH POINT (SD05-019, SD06-019)
   sengaja tidak dimasukkan. Catatan: teks di database situs resmi utk SD05-001
   MR/SEC ("抽2/3张") dan SD06-001 MR/SEC ("Lv5/Lv6") TIDAK sesuai gambar kartunya
   (semua tertulis 抽1张 / Lv4) — yang dipakai di sini teks pada gambar. Gambar dari
   images/news/sd05-sd06-pb02/, .../sd05-sd06-new-spoilers/ dan
   .../sd05-sd06-china-release-all-cards/ (semua ber-watermark SAMPLE).
   =================================================================== */
window.SPOILERS = [
 {
  "no": "PB02-001",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 0,
  "p": 3500,
  "nm": "[Forced Regrowth] Groot",
  "f": "GOTG",
  "e": [
   "UNIQUE",
   "COUNTER·ACTI【FIELD/ONCE PER TURN】: You attach 1 of your characters with 【GOTG】 in their features from RETREAT to this card.",
   "TRIG【FIELD/ONCE PER TURN】: When a card is attached to this card, if this card has 2 or more attaching cards, you may discard 1 of your cards in HAND. If you do, you detach 1 of the attaching cards of this card in the field to your BATTLE."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-001.jpg"
 },
 {
  "no": "PB02-002",
  "ra": "PR",
  "c": "Orange",
  "l": 3,
  "r": 2,
  "p": 2000,
  "nm": "[Sweet and Obedient] Goose",
  "f": "Flerken",
  "e": [
   "UNIQUE",
   "AUTO【HAND】: If you have characters with 【Nick Fury】 or 【Captain Marvel】 in their names in VOID, this card gets the ability 【COUNTER】.",
   "TRIG【BATTLE】: When this card enters the field, if you have fewer Rush Points in your Timeline than your opponent, you may attach 1 of your opponent's characters with Lv3 or below in BATTLE to this card."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/PB02-002.jpg"
 },
 {
  "no": "PB02-003",
  "ra": "PR",
  "c": "Orange",
  "l": 4,
  "r": 0,
  "p": 500,
  "nm": "[Ace Rescue] The Milano",
  "f": "Machine/GOTG",
  "e": [
   "UNIQUE",
   "AUTO【BATTLE】: This card gets R+X and Power+X000. X is the total Lv of the attaching cards of this card.",
   "TRIG【HAND】: When your character with 【GOTG】 in its features in BATTLE enters RETREAT by losing the fight or by your opponent's effect, you may place this card from HAND into your field. If you do, you attach that character to this card."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-003.jpg"
 },
 {
  "no": "PB02-004",
  "ra": "PR",
  "c": "Orange",
  "l": 6,
  "r": 2,
  "p": 6500,
  "nm": "[Count Me In] Gamora",
  "f": "GOTG",
  "e": [
   "AUTO【HAND】: This card can not be called.",
   "ACTI【HAND】: If the total Power of your characters in BATTLE is 6500, you place this card from HAND into your BATTLE."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/PB02-004.jpg"
 },
 {
  "no": "PB02-005",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 4,
  "p": 1000,
  "nm": "[Weakness Analysis] Nebula",
  "f": "GOTG",
  "e": [
   "AUTO【BACK】: Your characters with 【GOTG】 in their features in FRONT get the ability 【AIR STRIKE】."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-005.jpg"
 },
 {
  "no": "PB02-006",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 3,
  "p": 500,
  "nm": "[Star-Vein Sensing] Rocket Raccoon",
  "f": "GOTG",
  "e": [
   "ACTI【BASE/ONCE PER TURN】: You show the top card of your deck. If that card is a Lv2 character with 【GOTG】 in its features, you add it to your HAND. Otherwise, you discard it."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-006.jpg"
 },
 {
  "no": "PB02-007",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 0,
  "p": 4500,
  "nm": "[Dance of Distraction] Star-Lord",
  "f": "GOTG",
  "e": [
   "UNIQUE",
   "AUTO【BATTLE】: This card can not move.",
   "AUTO【BATTLE】: If you have characters with 【GOTG】 in their features in BATTLE except this card, your opponent's character in BACK can not attack or move."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-007.jpg"
 },
 {
  "no": "PB02-008",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 2,
  "p": 1000,
  "nm": "[Bond of Life and Death] Rocket Raccoon",
  "f": "GOTG",
  "e": [
   "TRIG【FIELD】: When this card enters the field, you may discard the top 3 cards of your deck. If you do, you move 1 of your characters with 【GOTG】 in their features and a different name from this card from RETREAT back to your HAND."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-008.jpg"
 },
 {
  "no": "PB02-009",
  "ra": "PR",
  "c": "Orange",
  "l": 6,
  "r": 1,
  "p": 3000,
  "nm": "[Soulshatter Frenzy] Drax",
  "f": "GOTG",
  "e": [
   "TRIG【BATTLE】: When this card enters the field, you may prune 1 of your opponent's characters in RETREAT. If you do, 1 of your opponent's characters in BATTLE gets Power-X in this turn. X is the Power of the character pruned by this effect."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-009.jpg"
 },
 {
  "no": "PB02-010",
  "ra": "PR",
  "c": "Orange",
  "l": 2,
  "r": 0,
  "p": 2000,
  "nm": "[Emotional Control] Mantis",
  "f": "GOTG",
  "e": [
   "AUTO【BATTLE】: If you have characters with 【Star-Lord】 in their names in the field, your opponent's character in FRONT gets R+1. Otherwise, your opponent's character in FRONT gets R-1."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-010.jpg"
 },
 {
  "no": "PB02-011",
  "ra": "PR",
  "c": "Purple",
  "l": 6,
  "r": 3,
  "p": 4000,
  "nm": "[Power of the Stones] Thanos",
  "f": "Eternal Titan",
  "e": [
   "UNIQUE",
   "TRIG【FIELD/ONCE PER TURN】: In your turn, when your opponent's character enters the field, if you have 6 or more Rush Points in your Timeline, you may prune 3 of your characters in RETREAT. If you do, you prune 1 of your opponent's characters in BATTLE."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-011.jpg"
 },
 {
  "no": "PB02-012",
  "ra": "PR",
  "c": "Purple",
  "l": 3,
  "r": 1,
  "p": 4500,
  "nm": "[Photon Burst] Captain Marvel",
  "f": "Human/Avengers/The Marvels",
  "e": [
   "TRIG【BATTLE/ONCE PER TURN】: When this card attacks, you may prune 1 of your characters in RETREAT. If you do, the attack target of this card gets Power-2000 in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-012.jpg"
 },
 {
  "no": "PB02-013",
  "ra": "PR",
  "c": "Purple",
  "l": 2,
  "r": 2,
  "p": 1500,
  "nm": "[Binary Burst] Captain Marvel",
  "f": "Human/Avengers/The Marvels",
  "e": [
   "AUTO【FIELD】: This card gets Power+X000. X is the number of your characters with 【Captain Marvel】 in their names in RETREAT.",
   "ACTI【BATTLE/ONCE PER TURN】: This card gains the effects of 1 of your characters with 【Captain Marvel】 in their names in RETREAT in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-013.jpg"
 },
 {
  "no": "PB02-014",
  "ra": "PR",
  "c": "Purple",
  "l": 4,
  "r": 1,
  "p": 1000,
  "nm": "[The Accuser] Ronan",
  "f": "Kree Empire/Cabal",
  "e": [
   "AUTO【BATTLE】: If you have 2 or fewer cards in BASE, this card gets R+X. Otherwise, this card gets Power+X000. X is the number of your cards in BASE."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-014.jpg"
 },
 {
  "no": "PB02-015",
  "ra": "PR",
  "c": "Purple",
  "l": 3,
  "r": 1,
  "p": 4000,
  "nm": "[Reverse Metabolism] High Evolutionary",
  "f": "Knights of Wundagore/Cabal",
  "e": [
   "ACTI【FIELD/ONCE PER TURN】: You prune 1 of your characters in RETREAT. If you do, 1 character in the field gets Lv-1 in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-015.jpg"
 },
 {
  "no": "PB02-016",
  "ra": "PR",
  "c": "Purple",
  "l": 1,
  "r": 3,
  "p": 500,
  "nm": "[Power Combo] Captain Marvel",
  "f": "Human/Avengers/The Marvels",
  "e": [
   "TRIG【BATTLE/ONCE PER TURN】: When this card attacks, you may prune 1 of your characters in RETREAT. If you do, this card gets the ability 【DOUBLE ATTACK】 in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-016.jpg"
 },
 {
  "no": "PB02-017",
  "ra": "PR",
  "c": "Purple",
  "l": 5,
  "r": 2,
  "p": 2500,
  "nm": "[Iron-Fisted Rule] Thanos",
  "f": "Eternal Titan",
  "e": [
   "UNIQUE, COUNTER",
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do, all of your opponent's characters in BATTLE get Power-500 in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-017.jpg"
 },
 {
  "no": "PB02-018",
  "ra": "PR",
  "c": "Purple",
  "l": 6,
  "r": 2,
  "p": 1000,
  "nm": "[Mind Resonance] Yondu",
  "f": "GOTG",
  "e": [
   "ACTI【BATTLE/ONCE PER TURN】: You prune 1 of your characters in RETREAT. If you do, you randomly prune 1 of your opponent's set cards in BASE. If the set card pruned by this effect has the same Lv as that character, this effect can be activated 1 more time in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-018.jpg"
 },
 {
  "no": "PB02-019",
  "ra": "PR",
  "c": "Purple",
  "l": 2,
  "r": 2,
  "p": 1000,
  "nm": "[Grunt Turned Godslayer] Yondu",
  "f": "Ravagers",
  "e": [
   "TRIG【BATTLE】: When this card enters the field, you may prune 1 of your characters in RETREAT. If you do and you have only this card in BATTLE, you retreat all of your opponent's Lv1 cards in the field."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-019.jpg"
 },
 {
  "no": "PB02-020",
  "ra": "PR",
  "c": "Purple",
  "l": 2,
  "r": 2,
  "p": 1500,
  "nm": "[Indecision] Adam Warlock",
  "f": "GOTG/Cabal",
  "e": [
   "TRIG【FIELD】: When this card enters the field, 1 of your characters in BATTLE gets R+1 and Power+1000 in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-020.jpg"
 },
 {
  "no": "PB02-021",
  "ra": "PR",
  "c": "Kuning",
  "l": 1,
  "r": 0,
  "p": 2500,
  "nm": "[Dream Bubble] Mary Jane Watson",
  "f": "Multiverse/Human/Web",
  "e": [
   "UNIQUE, COUNTER",
   "AUTO【BACK】: In your opponent's turn, your characters with 【Web】 in their features in FRONT get Power+1000.",
   "ACTI【BASE/ONCE PER TURN】: You prune 1 of your characters with 【Human】 in their features in RETREAT."
  ],
  "img": "images/news/sd05-sd06-pb02/PB02-021.jpg"
 },
 {
  "no": "SD05-001",
  "ra": "UR",
  "c": "Orange",
  "l": 6,
  "r": 2,
  "p": 4000,
  "nm": "[Guardian of the Nine Realms] Odin",
  "f": "Asgard",
  "e": [
   "UNIQUE",
   "TRIG【BACK】: When your turn ends, 1 of your opponent's characters in BASE gets Power-X in this turn. X is the Power of this card. If that character retreats because of this effect, you draw 1 more card."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-001_UR.jpg"
 },
 {
  "no": "SD05-001",
  "ra": "MR",
  "c": "Orange",
  "l": 6,
  "r": 2,
  "p": 4000,
  "nm": "[Guardian of the Nine Realms] Odin",
  "f": "Asgard",
  "e": [
   "Alternate art of SD05-001 — same text as the UR version above."
  ],
  "img": "images/news/sd05-sd06-pb02/SD05-001.jpg"
 },
 {
  "no": "SD05-001",
  "ra": "SEC",
  "c": "Orange",
  "l": 6,
  "r": 2,
  "p": 4000,
  "nm": "[Guardian of the Nine Realms] Odin",
  "f": "Asgard",
  "e": [
   "Alternate art of SD05-001 — same text as the UR version above."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-001_SEC.jpg"
 },
 {
  "no": "SD05-002",
  "ra": "GR",
  "c": "Orange",
  "l": 6,
  "r": 1,
  "p": 6000,
  "nm": "[Interstellar Guardian] Captain Marvel",
  "f": "Human/Avengers/The Marvels",
  "e": [
   "UNIQUE",
   "COUNTER·ACTI【BATTLE/ONCE PER TURN】: You prune this card in BATTLE and 1 of your opponent's characters with Power X or lower in the field. X is the Power of this card."
  ],
  "img": "images/news/sd05-sd06-pb02/SD05-002.jpg"
 },
 {
  "no": "SD05-003",
  "ra": "GR",
  "c": "Orange",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Guardian of Earth] Ancient One",
  "f": "Human/Kamar-Taj",
  "e": [
   "UNIQUE, QUICK STRIKE* (AUTO【BATTLE】: In your turn, this card does not retreat by BOTH LOSE.)",
   "TRIG【FIELD/ONCE PER TURN】: When your opponent's character enters the field, you may discard 2 of your cards in HAND. If you do, you place 1 of your orange characters with LvX from RETREAT into your BATTLE. X is the Lv of that opponent's character."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-003.jpg"
 },
 {
  "no": "SD05-004",
  "ra": "SR",
  "c": "Orange",
  "l": 3,
  "r": 2,
  "p": 2000,
  "nm": "[Soul Return Spell] Doctor Strange",
  "f": "Human/Avengers/Kamar-Taj",
  "e": [
   "UNIQUE",
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck. If you do, you place 1 of your orange characters with Lv3 or below and 【Human】 in their features from RETREAT into your field, and you retreat this card."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-004.jpg"
 },
 {
  "no": "SD05-005",
  "ra": "SR",
  "c": "Orange",
  "l": 3,
  "r": 2,
  "p": 1500,
  "nm": "[Einherjar Revival] New Valkyrie",
  "f": "Asgard",
  "e": [
   "UNIQUE",
   "TRIG【FIELD】: When this card enters the field, you show the top 3 cards of your deck, place 1 of your orange characters with Lv3 and 【Human】 or 【Asgard】 in their features among them into your field, and discard the remaining cards."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-005.jpg"
 },
 {
  "no": "SD05-006",
  "ra": "SR",
  "c": "Orange",
  "l": 5,
  "r": 1,
  "p": 5500,
  "nm": "[Guide of the Einherjar] Valkyrie",
  "f": "Asgard",
  "e": [
   "ACTI【HAND】: You discard this card in HAND. If you do, you move 1 of your orange characters with Lv3 and 【Human】 or 【Asgard】 in their features from RETREAT back to your HAND."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-006.jpg"
 },
 {
  "no": "SD05-007",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 3,
  "p": 4000,
  "nm": "[Graceful Choice] Doctor Strange",
  "f": "Human/Avengers/Kamar-Taj",
  "e": [
   "AUTO【BATTLE】: This card can not attack.",
   "ACTI【BATTLE/ONCE PER TURN】: You discard 1 of your cards in HAND. If you do, this card loses its effects in this turn."
  ],
  "img": "images/news/sd05-sd06-pb02/SD05-007.jpg"
 },
 {
  "no": "SD05-008",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 3,
  "p": 2000,
  "nm": "[Secret Realm Guardian] Doctor Strange",
  "f": "Human/Avengers/Kamar-Taj",
  "e": [
   "TRIG【FIELD/ONCE PER TURN】: When 1 of your orange characters enters the field, you may move 1 of your characters with 【Human】 in their features from RETREAT back to the bottom of your deck."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-008.jpg"
 },
 {
  "no": "SD05-009",
  "ra": "R",
  "c": "Orange",
  "l": 1,
  "r": 1,
  "p": 1000,
  "nm": "[Arcane Backflow] Wong",
  "f": "Human/Avengers/Kamar-Taj",
  "e": [
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck.",
   "TRIG【FIELD】: At the end of your opponent's turn, you may retreat this card in the field. If you do, you retreat 1 of your opponent's characters with Lv3 in BATTLE."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-009.jpg"
 },
 {
  "no": "SD05-010",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Judgment of Exile] Sif",
  "f": "Asgard/Avengers",
  "e": [
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck. If you do, you move 1 of your opponent's characters with Lv3 or below from BATTLE to your opponent's BASE."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-010.jpg"
 },
 {
  "no": "SD05-011",
  "ra": "R",
  "c": "Orange",
  "l": 2,
  "r": 0,
  "p": 2000,
  "nm": "[Judgment of Broken Wings] Sif",
  "f": "Asgard/Avengers",
  "e": [
   "COUNTER",
   "TRIG【FIELD】: When this card enters the field, you may discard 1 of your cards in HAND. If you do, you move 1 of your opponent's characters from WING to your opponent's BASE."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-011.jpg"
 },
 {
  "no": "SD05-012",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 0,
  "p": 6000,
  "nm": "[Shield of Asgard] Sif",
  "f": "Asgard/Avengers",
  "e": [
   "BLOCK",
   "AUTO【HAND】: This card can not be called.",
   "ACTI【HAND】: You show this card in HAND. If you do, you move this card from HAND back to the top of your deck."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-012.jpg"
 },
 {
  "no": "SD05-013",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 1,
  "p": 2000,
  "nm": "[Blessing of the Einherjar] New Valkyrie",
  "f": "Asgard",
  "e": [
   "ACTI【BATTLE/ONCE PER TURN】: You discard 1 of your cards in HAND. If you do, 1 of your characters in the field gets R+1 and Power+1000 in this turn. If that character has 【Asgard】 in its features, it gets Power+1000 extra."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-013.jpg"
 },
 {
  "no": "SD05-014",
  "ra": "R",
  "c": "Orange",
  "l": 4,
  "r": 1,
  "p": 4000,
  "nm": "[Rainbow Light of Exile] Heimdall",
  "f": "Asgard",
  "e": [
   "ACTI【BATTLE/ONCE PER TURN】: You discard 1 of your cards in HAND. If you do, you move 1 of your opponent's characters with Power X or lower from BATTLE to your opponent's BASE. X is the Power of this card."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-014.jpg"
 },
 {
  "no": "SD05-015",
  "ra": "R",
  "c": "Orange",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Rainbow Light of Annihilation] Heimdall",
  "f": "Asgard",
  "e": [
   "ACTI【BATTLE/ONCE PER TURN】: You discard 1 of your cards in HAND. If you do, 1 of your opponent's characters in BATTLE gets Power-1000 in this turn."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD05-015.jpg"
 },
 {
  "no": "SD05-016",
  "ra": "R",
  "c": "Orange",
  "l": 6,
  "r": 1,
  "p": 4000,
  "nm": "[Execution of the Nine Realms] Hela",
  "f": "Niflheim",
  "e": [
   "AUTO【BATTLE】: In your turn, if this card has only 1 attaching card, this card gets Power+2000.",
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck. If you do, you attach 1 of your characters with 【Asgard】 in their features from RETREAT to this card."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-016.jpg"
 },
 {
  "no": "SD05-017",
  "ra": "R",
  "c": "Orange",
  "l": 6,
  "r": 2,
  "p": 3000,
  "nm": "[Jailbreak Rebirth] Hela",
  "f": "Niflheim",
  "e": [
   "TRIG【RETREAT】: When this card enters RETREAT by discarding of effect, you may place 1 of your characters with 【Hela】 in their names from RETREAT into your field."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-017.jpg"
 },
 {
  "no": "SD05-018",
  "ra": "R",
  "c": "Orange",
  "l": 6,
  "r": 3,
  "p": 2500,
  "nm": "[Summoning of the Dead] Hela",
  "f": "Niflheim",
  "e": [
   "TRIG【RETREAT】: When this card enters RETREAT by discarding of effect, you may place 1 of your characters with 【Asgard】 in their features from RETREAT into your field."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD05-018.jpg"
 },
 {
  "no": "SD06-001",
  "ra": "UR",
  "c": "Purple",
  "l": 6,
  "r": 1,
  "p": 5500,
  "nm": "[Curse of Wisdom] Thanos",
  "f": "Eternal Titan",
  "e": [
   "UNIQUE, RAMPAGE* (AUTO【BATTLE】: If this card is determined to have successfully attacked the weakness, the number of cards placed into your Timeline +1.)",
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do, you retreat 1 of your opponent's characters with Lv4 or below in BATTLE."
  ],
  "img": "images/news/sd05-sd06-pb02/SD06-001.jpg"
 },
 {
  "no": "SD06-001",
  "ra": "MR",
  "c": "Purple",
  "l": 6,
  "r": 1,
  "p": 5500,
  "nm": "[Curse of Wisdom] Thanos",
  "f": "Eternal Titan",
  "e": [
   "Alternate art of SD06-001 — same text as the UR version above."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-001_MR.jpg"
 },
 {
  "no": "SD06-001",
  "ra": "SEC",
  "c": "Purple",
  "l": 6,
  "r": 1,
  "p": 5500,
  "nm": "[Curse of Wisdom] Thanos",
  "f": "Eternal Titan",
  "e": [
   "Alternate art of SD06-001 — same text as the UR version above."
  ],
  "img": "images/news/sd05-sd06-pb02/SD06-001_SEC.jpg"
 },
 {
  "no": "SD06-002",
  "ra": "GR",
  "c": "Purple",
  "l": 4,
  "r": 1,
  "p": 4000,
  "nm": "[Peerless Blade] Corvus Glaive",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do and this card is in FRONT, you retreat 1 of your opponent's damaged characters with Lv5 or below in BATTLE."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-002.jpg"
 },
 {
  "no": "SD06-003",
  "ra": "GR",
  "c": "Purple",
  "l": 4,
  "r": 2,
  "p": 2500,
  "nm": "[Peerless Spear] Proxima Midnight",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do and this card is in FRONT, you retreat 1 of your opponent's characters with R-0 in BATTLE."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-003.jpg"
 },
 {
  "no": "SD06-004",
  "ra": "SR",
  "c": "Purple",
  "l": 4,
  "r": 3,
  "p": 1500,
  "nm": "[Black Tongue Schemer] Ebony Maw",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do, 1 of your opponent's characters in BATTLE gets Power-1000 in this turn. If this card is in FRONT, the amount of Power reduced by this effect is increased by 2000."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-004.jpg"
 },
 {
  "no": "SD06-005",
  "ra": "SR",
  "c": "Purple",
  "l": 4,
  "r": 1,
  "p": 1000,
  "nm": "[Cosmic Convergence] Supergiant",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do, this card gets Power+X in this turn. X is the Power of 1 of your characters in BATTLE. If this card is in FRONT, X becomes the total Power of your characters in BATTLE instead."
  ],
  "img": "images/news/sd05-sd06-pb02/SD06-005.jpg"
 },
 {
  "no": "SD06-006",
  "ra": "SR",
  "c": "Purple",
  "l": 4,
  "r": 1,
  "p": 4500,
  "nm": "[Shaping Battle Axe] Black Dwarf",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your purple characters in RETREAT. If you do, 1 of your opponent's characters in BATTLE gets R-1 in this turn. If this card is in FRONT, the amount of R reduced by this effect is increased by 2."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-006.jpg"
 },
 {
  "no": "SD06-007",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Hunt of Powerful Foes] Corvus Glaive",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your characters with 【Cabal】 in their features from RETREAT. If you do, you prune 1 of your opponent's characters from RETREAT."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-007.jpg"
 },
 {
  "no": "SD06-008",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 3,
  "p": 2000,
  "nm": "[Telekinetic Spike] Ebony Maw",
  "f": "Black Order",
  "e": [
   "ACTI【BATTLE/ONCE PER TURN】: You prune 1 of your characters with 【Cabal】 in their features from RETREAT. If you do, 1 of your opponent's characters in BATTLE gets Power-500 in this turn."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-008.jpg"
 },
 {
  "no": "SD06-009",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 2,
  "p": 2000,
  "nm": "[Cosmic Siphon] Supergiant",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your characters with 【Cabal】 in their features from RETREAT. If you do, you draw 1 card."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-009.jpg"
 },
 {
  "no": "SD06-010",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Red-Eyed Witch] Black Swan",
  "f": "Black Order",
  "e": [
   "TRIG【BATTLE】: When this card enters the field by calling, you may prune 1 of your characters with 【Cabal】 in their features from RETREAT. If you do, you move 1 of your characters with a different name from this card and 【Black Order】 in their features from RETREAT back to your HAND."
  ],
  "img": "images/news/sd05-sd06-china-release-all-cards/SD06-010.jpg"
 },
 {
  "no": "SD06-011",
  "ra": "R",
  "c": "Purple",
  "l": 2,
  "r": 2,
  "p": 2000,
  "nm": "[Swarm Assault] Chitauri Soldier",
  "f": "Chitauri/Cabal",
  "e": [
   "TRIG【BATTLE】: When this card enters the field, you may discard the top card of your deck. If you do, 1 of your opponent's characters in BATTLE gets Power-1000 in this turn."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-011.jpg"
 },
 {
  "no": "SD06-012",
  "ra": "R",
  "c": "Purple",
  "l": 2,
  "r": 1,
  "p": 3000,
  "nm": "[Colossal Ram] Leviathan",
  "f": "Chitauri/Cabal",
  "e": [
   "TRIG【BATTLE】: When this card enters the field, you may discard the top card of your deck. If you do, you move 1 of your opponent's characters with Lv3 or below from BATTLE to your opponent's BASE."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-012.jpg"
 },
 {
  "no": "SD06-013",
  "ra": "R",
  "c": "Purple",
  "l": 1,
  "r": 0,
  "p": 1500,
  "nm": "[Interstellar Crossing] War Envoy",
  "f": "Chitauri/Cabal",
  "e": [
   "AUTO【BATTLE】: In your opponent's turn, all of your characters with Lv4 and 【Black Order】 in their features in HAND get the ability 【COUNTER】.",
   "AUTO【BASE】: Your characters in FRONT get R+1."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-013.jpg"
 },
 {
  "no": "SD06-014",
  "ra": "R",
  "c": "Purple",
  "l": 2,
  "r": 3,
  "p": 2000,
  "nm": "[Costly Reinforcement] Chitauri Chariot",
  "f": "Chitauri/Cabal",
  "e": [
   "TRIG【VOID】: When this card enters VOID from RETREAT by your effect, you draw 1 card and discard 1 of your cards in HAND."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-014.jpg"
 },
 {
  "no": "SD06-015",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 2,
  "p": 2000,
  "nm": "[Energy Reversal] Silver Surfer",
  "f": "Zenn-La/Cabal",
  "e": [
   "TRIG【VOID】: When this card enters VOID from RETREAT by your effect, 1 of your opponent's characters in BATTLE gets Power-1000 in this turn. If you do, you move this card from VOID back to the bottom of your deck."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-015.jpg"
 },
 {
  "no": "SD06-016",
  "ra": "R",
  "c": "Purple",
  "l": 3,
  "r": 1,
  "p": 3500,
  "nm": "[Starship Command] Ronan",
  "f": "Kree Empire/Cabal",
  "e": [
   "TRIG【VOID】: When this card enters VOID from RETREAT by your effect, you may place 1 of your characters with Lv2 or below and 【Cabal】 in their features from VOID into your BATTLE."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-016.jpg"
 },
 {
  "no": "SD06-017",
  "ra": "R",
  "c": "Purple",
  "l": 2,
  "r": 2,
  "p": 2000,
  "nm": "[Quest for Allies] Adam Warlock",
  "f": "Cabal",
  "e": [
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck. If you do, you may move 1 of your characters with 【Cabal】 in their features from RETREAT back to your HAND."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-017.jpg"
 },
 {
  "no": "SD06-018",
  "ra": "R",
  "c": "Purple",
  "l": 5,
  "r": 1,
  "p": 4000,
  "nm": "[Unsealed Magic Burst] Adam Warlock",
  "f": "Cabal",
  "e": [
   "TRIG【FIELD】: When this card enters the field, you may discard the top card of your deck. If you do, you retreat 1 of your opponent's characters with Lv3 or below and 【ACTI】 in their effects in BATTLE."
  ],
  "img": "images/news/sd05-sd06-new-spoilers/SD06-018.jpg"
 }
];
