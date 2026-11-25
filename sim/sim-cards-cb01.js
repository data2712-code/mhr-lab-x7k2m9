/* ===================================================================
   MHR BATTLE SIM — RESOLVER CB01 Destined Convergence (sim-cards-cb01.js)      v0.14 · riwayat #136
   ===================================================================
   CB01 (kotak koleksi Spider-Man, rilis Indonesia 23 Nov 2026) = 7 cetak ulang dengan ilustrasi lain dari kartu
   SP01 / PB02. Nama, Lv, R, Power, warna, trait, dan efeknya sama dengan kartu aslinya, jadi resolvernya memakai
   definisi kartu asli (objek yang sama). Teks CB01 hanya beda kalimat:
     CB01-002 = SP01-026 (teks CB01 sudah memakai hasil errata V.2: "1 of your cards ... Ghost-Spider/Gwen")
     CB01-004 = SP01-043 (CB01: 【Archenemy】 "in their names"; resolver SP01-043 sudah membaca nama)
     CB01-005 = SP01-023 (beda tata bahasa "its/their")
     CB01-003 = SP01-025 (RS-078 / TD-12: efek kedua hanya saat dipanggil — sudah begitu di SP01-025)
   Aturan nama: kartu CB01 dan kartu aslinya bernama sama, jadi dihitung bersama untuk batas 3 per nama (101.1.d)
   dan UNIQUE (305.6.a) — mesin sudah membandingkan nama Inggris, bukan nomor kartu.
   Harus dimuat SESUDAH sim-cards-sp01.js dan sim-cards-t6.js.
   =================================================================== */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sim.js') : root.MHRSim;
  const SP = isNode ? require('./sim-cards-sp01.js') : root.MHRCardDefsSP01;
  const T6 = isNode ? require('./sim-cards-t6.js') : root.MHRCardDefsT6;

  const SRC = {
    'CB01-001': [SP, 'SP01-027'],   // 「Symbiotic Suit」Spider-Man
    'CB01-002': [SP, 'SP01-026'],   // 「Vigil of Love」Amazing Spider-Man
    'CB01-003': [SP, 'SP01-025'],   // 「Gunfire Negotiation」Spider-Man Noir
    'CB01-004': [SP, 'SP01-043'],   // 「Spider-Archenemy」Kingpin
    'CB01-005': [SP, 'SP01-023'],   // 「Spider-Archenemy」Venom
    'CB01-006': [SP, 'SP01-042'],   // 「Spider-Archenemy」Green Goblin
    'CB01-007': [T6, 'PB02-021']    // 「Fleeting Illusion」Mary Jane Watson
  };
  const DEFS = {};
  Object.keys(SRC).forEach(no => {
    const [set, src] = SRC[no];
    if (!set || !set[src]) throw new Error('sim-cards-cb01: resolver ' + src + ' tidak ditemukan (urutan muat skrip?)');
    DEFS[no] = set[src];
  });
  const SOURCE = Object.fromEntries(Object.keys(SRC).map(k => [k, SRC[k][1]]));   // CB01 → nomor kartu asli

  S.registerCards(DEFS);
  if (isNode) module.exports = { DEFS, SOURCE };
  else { root.MHRCardDefsCB01 = DEFS; root.MHRCB01Source = SOURCE; }
})(typeof window !== 'undefined' ? window : this);
