#!/usr/bin/env node
/* =====================================================================
   MHR Deck Lab — generator API data kartu (statis, read-only)
   =====================================================================
   Menghasilkan berkas di folder api/v1/ dari cards.js + data.js:

     api/v1/cards.json   satu baris per VERSI CETAK kartu (per rarity/varian),
                         cocok untuk katalog toko yang menjual kartu single
     api/v1/cards.csv    isi yang sama, untuk impor lewat spreadsheet
     api/v1/sets.json    daftar set yang sudah rilis + jumlah kartu/versi

   Dokumentasi untuk pemakai API ada di api/index.html (ditulis tangan,
   tidak dibuat skrip ini).

   Isi API: HANYA set berstatus "rilis" di window.SETS (data.js). Kartu
   spoiler/belum rilis tidak ikut. Data akun, deck, koleksi, komentar
   (Supabase) tidak pernah disentuh — API ini cuma berkas statis.

   Teks: Bahasa Indonesia saja (nm, e, warna Indonesia), sesuai kebutuhan
   mitra pertama (Ogre Neverland, Oktober 2026). Gambar: printing Indonesia
   (images/), URL absolut.

   ID versi (`id`) = "<no>-<kode varian>", mis. "SP01-021-UR",
   "SP01-021-HR_616". Sengaja tidak bergantung pada urutan `ra` di cards.js,
   jadi tetap stabil walau urutan rarity diubah. JANGAN ganti format ini
   tanpa menaikkan versi API (v2) — mitra memakainya sebagai SKU.

   Berkas hanya ditulis ulang kalau isinya berubah. Tanggal `updated`
   cuma berganti kalau data kartu benar-benar berubah, jadi menjalankan
   skrip berulang kali tidak membuat commit kosong.

   PENTING — jalankan ulang setiap kali cards.js atau window.SETS berubah
   (set baru, errata, perbaikan nama/statistik):
       node tools/generate_api.js
   lalu commit folder api/ bersama perubahan lainnya.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'v1');
const SITE = 'https://mhrdecklab.com';
const EOL = '\r\n';                       // sama dengan berkas lain di repo

global.window = {};
require(path.join(ROOT, 'cards.js'));
require(path.join(ROOT, 'data.js'));
const CARDS = window.CARDS || [];
const RPS = window.RUSH_POINTS || [];
/* v7.02 — set PRE-RELEASE (status 'rilis' tapi rilis.id belum lewat, mis. SD05/SD06/PB02
   sebelum 14 Nov 2026, teksnya masih fan-translation) TIDAK ikut. Jalankan ulang skrip
   ini setelah tanggal rilis Indonesia supaya set itu masuk API. */
const belumRilis = (s) => !!(s.rilis && s.rilis.id && Date.parse(s.rilis.id + 'T00:00:00+07:00') > Date.now());
const SETS = (window.SETS || []).filter((s) => s.status === 'rilis' && !belumRilis(s));
const RELEASED = new Set(SETS.map((s) => s.kode));

/* label varian — sama dengan VARIANT_LABEL / VARIANT_BASE_LABEL di index.html */
const VARIANT_LABEL = { HR_616: 'HR /616', ER_CHAMPION: 'ER Champion', TR_SILVER: 'TR Silver', TR_FULLART: 'TR Full Art' };
const VARIANT_BASE_LABEL = { HR_616: ['HR', 'HR /99'], ER_CHAMPION: ['ER', 'ER Top 4'], TR_SILVER: ['TR', 'TR Gold'] };
const RARITY_NAME = { R: 'Rare', SR: 'Super Rare', GR: 'Grand Rare', UR: 'Ultimate Rare', MR: 'Alternate Art tingkat 1',
  SEC: 'Alternate Art tingkat 2', HR: 'Alternate Art tingkat 3', LR: 'Legendary Alternate Art', PR: 'Promotional Rare',
  ER: 'Event Rare', TR: 'Treasure Rare', C: 'Common' };
const rarBase = (r) => String(r || '').split('_')[0];
function rarLabel(r, ra) {
  if (VARIANT_LABEL[r]) return VARIANT_LABEL[r];
  for (const k of ra) { const b = VARIANT_BASE_LABEL[k]; if (b && b[0] === r) return b[1]; }
  return r;
}
const imgUrl = (no, r, ra) => `${SITE}/images/${r === ra[0] ? no : `${no}_${r}`}.jpg`;

const rows = [];
for (const c of CARDS) {
  if (!RELEASED.has(c.s)) continue;
  c.ra.forEach((r, i) => rows.push({
    id: `${c.no}-${r}`,
    card_no: c.no,
    set: c.s,
    type: 'karakter',
    rarity: rarBase(r),
    variant: r,
    variant_label: rarLabel(r, c.ra),
    is_main: i === 0,
    name: c.nm || '',
    color: c.c || '',
    level: c.l ?? null,
    range: c.r ?? null,
    power: c.p ?? null,
    traits: c.f || '',
    effect: c.e || '',
    errata: c.er || null,
    fan_translation: !!c.fan,
    image: imgUrl(c.no, r, c.ra),
    url: `${SITE}/cards/${c.no}.html`,
  }));
}
for (const rp of RPS) {
  if (!RELEASED.has(rp.s)) continue;
  rp.ra.forEach((r, i) => rows.push({
    id: `${rp.no}-${r}`,
    card_no: rp.no,
    set: rp.s,
    type: 'rush_point',
    rarity: rarBase(r),
    variant: r,
    variant_label: rarLabel(r, rp.ra),
    is_main: i === 0,
    name: 'Rush Point',
    color: '', level: null, range: null, power: null, traits: '', effect: '',
    errata: null,
    fan_translation: false,
    indonesian_print: !!rp.id,
    image: imgUrl(rp.no, r, rp.ra),
    url: `${SITE}/cards/${rp.no}.html`,
  }));
}
rows.sort((a, b) => a.card_no.localeCompare(b.card_no) || (b.is_main - a.is_main) || a.variant.localeCompare(b.variant));

/* duplikat id = bug data, hentikan */
const seen = new Set();
for (const r of rows) { if (seen.has(r.id)) throw new Error('ID ganda: ' + r.id); seen.add(r.id); }

/* tanggal `updated` hanya berubah kalau isi data berubah */
const hash = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16);
const today = new Date().toISOString().slice(0, 10);
let prev = null;
try { prev = JSON.parse(fs.readFileSync(path.join(OUT, 'cards.json'), 'utf8')); } catch (e) { /* belum ada */ }
const updated = prev && prev.data_hash === hash ? prev.updated : today;

const head = {
  api_version: 1,
  updated,
  data_hash: hash,
  source: `${SITE}/api/`,
  terms: `${SITE}/api/#syarat`,
  attribution: 'Data kartu: MHR Deck Lab (mhrdecklab.com). Teks resmi Marvel Hero Rush Indonesia. Card art © MARVEL © JASON.',
  language: 'id',
  count: rows.length,
};

function writeIfChanged(file, content) {
  const p = path.join(OUT, file);
  let old = null; try { old = fs.readFileSync(p, 'utf8'); } catch (e) { /* baru */ }
  if (old === content) { console.log('  tetap  ', file); return; }
  fs.writeFileSync(p, content, 'utf8'); console.log('  tulis  ', file);
}
fs.mkdirSync(OUT, { recursive: true });

/* cards.json — satu versi per baris supaya diff git mudah dibaca */
const json = '{' + EOL +
  Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join(EOL) + EOL +
  '  "cards": [' + EOL + rows.map((r) => '    ' + JSON.stringify(r)).join(',' + EOL) + EOL + '  ]' + EOL + '}' + EOL;
writeIfChanged('cards.json', json);

/* cards.csv — UTF-8 dengan BOM (supaya Excel membaca huruf khusus dengan benar) */
const COLS = ['id', 'card_no', 'set', 'type', 'rarity', 'variant', 'variant_label', 'is_main', 'name', 'color', 'level',
  'range', 'power', 'traits', 'effect', 'errata', 'fan_translation', 'indonesian_print', 'image', 'url'];
const cell = (v) => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = '﻿' + [COLS.join(','), ...rows.map((r) => COLS.map((k) => cell(r[k])).join(','))].join(EOL) + EOL;
writeIfChanged('cards.csv', csv);

/* sets.json */
const sets = SETS.map((s) => {
  const rs = rows.filter((r) => r.set === s.kode);
  return { code: s.kode, name: s.nama || s.namaSementara || '', type: s.tipe || '',
    cards: new Set(rs.map((r) => r.card_no)).size, versions: rs.length };
});
writeIfChanged('sets.json', JSON.stringify({ api_version: 1, updated, sets }, null, 2).replace(/\n/g, EOL) + EOL);

console.log(`Selesai: ${rows.length} versi kartu dari ${sets.length} set (updated ${updated}, hash ${hash}).`);
