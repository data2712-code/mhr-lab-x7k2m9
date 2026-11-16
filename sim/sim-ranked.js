/* ===================================================================
   MHR BATTLE SIM — RANKED (sim-ranked.js)                    o2.16 · riwayat #87, #90 · situs v7.37
   ===================================================================
   Poin, tier, dan leaderboard untuk pertandingan Find a match (keputusan pemilik 12 Nov 2026).
   Perhitungan poin TIDAK di sini: trigger Supabase (mhr_decklab_v737_sim_ranked.sql) menghitungnya saat server Battle Sim
   menyimpan hasil ke sim_matches. Berkas ini hanya MEMBACA:
     - sim_ratings     (publik)      → leaderboard + kartu "Your rank"
     - sim_rating_log  (milik akun)  → perubahan poin di layar hasil
   Aturan (sama dengan SQL dan home-ui.js):
     - mulai 1000 poin; Elo K = 48, 5 pertandingan pertama tiap season = placement (K = 96); menang min +1, kalah min -1 (v7.42; dulu ±4); main adil v7.42: lihat NOTE
     - tier: Recruit, Agent, Hero, Avenger, Legend, Myth, Cosmic (divisi III/II/I, 100 poin per divisi; Recruit < 900),
       Genius Burden 2700+ (puncak, tanpa divisi). Ikon: ../images/rank/<tier>.svg (desain orisinal, v7.38)
     - riwayat #96 (pemilik 14 Nov 2026): Season 0 = 23 Nov – 31 Des 2026 (kode 'S00'); Season 1 mulai 1 Jan 2027 (kode 'S01'),
       lamanya ditentukan setelah tanggal rilis set 2027 diketahui. Dulu: Season 1 = 19 Nov – 31 Des (kode '2026-12'), lalu bulanan.
     - season bulanan (WIB), kode 'YYYY-MM'; soft reset ke 1000 + ½ (poin akhir − 1000)
   Antrean tetap tidak memakai poin: saat pemain masih sedikit, semua pemain bisa bertemu siapa saja.
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const $ = id => document.getElementById(id);
  const TIERS = ['Recruit', 'Agent', 'Hero', 'Avenger', 'Legend', 'Myth', 'Cosmic'];          // + puncak 'Genius Burden' (2700+)
  const ALL = ['Recruit', 'Agent', 'Hero', 'Avenger', 'Legend', 'Myth', 'Cosmic', 'Genius Burden'];
  const COLOR = { Recruit: '#9aa5b1', Agent: '#3B87E8', Hero: '#33A45C', Avenger: '#E4442E', Legend: '#F2B01E', Myth: '#E05BD0', Cosmic: '#4FD1E8', 'Genius Burden': '#A47BFF', Unranked: '#6b7785' };
  const ICON_BASE = (window.MHRSIM_BASE || '../') + 'images/rank/';
  const slug = k => k.toLowerCase().replace(/\s+/g, '-');
  const icon = (k, cls) => '<img class="' + (cls || 'rki') + '" src="' + ICON_BASE + slug(k) + '.svg?v=1" alt="" loading="lazy">';
  const PLACEMENT = 5;
  // Ranked aktif SETELAH BETA (keputusan pemilik 12 Nov 2026) — sama dengan mhr_sim_ranked_start() di SQL
  const START = Date.parse('2026-11-23T00:00:00+07:00');   // beta diperpanjang sampai 22 Nov (riwayat #96)
  const live = () => Date.now() >= START;
  const START_TXT = '23 November 2026';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  // o2.16 (permintaan pemilik 13 Nov 2026): terjemahan Indonesia lengkap. Kalimat yang memuat angka/tebal dibuat langsung dalam
  // bahasa yang aktif (kamus kalimat utuh sim-i18n tidak bisa menerjemahkan potongan teks); ganti bahasa = panel digambar ulang.
  const ID = () => !!(window.MHRSimI18N && window.MHRSimI18N.lang === 'id');
  const T = (en, id) => ID() ? id : en;

  function tier(points, games) {
    if ((games || 0) < PLACEMENT) return { key: 'Unranked', name: 'Unranked', next: null };
    if (points >= 2700) return { key: 'Genius Burden', name: 'Genius Burden', next: null };
    const p = Math.max(points, 600) - 600, t = TIERS[Math.min(6, Math.floor(p / 300))], d = Math.floor((p % 300) / 100);
    const nextAt = points < 600 ? 700 : 600 + (Math.floor(p / 100) + 1) * 100;
    return { key: t, name: t + ' ' + ['III', 'II', 'I'][d], next: nextAt };
  }
  // Riwayat #96: Season 0 = 23 Nov – 31 Des 2026 ('S00'); Season 1 mulai 1 Jan 2027 ('S01', akhir belum ditentukan) — sama dengan mhr_sim_season() di SQL.
  const seasonNow = () => Date.now() < Date.parse('2027-01-01T00:00:00+07:00') ? 'S00' : 'S01';
  const seasonLabel = s => {
    if (s === 'S00') return T('Season 0 · 23 Nov – 31 Dec 2026', 'Season 0 · 23 Nov – 31 Des 2026');
    if (s === 'S01') return T('Season 1 · from 1 Jan 2027', 'Season 1 · mulai 1 Jan 2027');
    const m = /^S(\d+)$/.exec(String(s)); if (m) return 'Season ' + (+m[1]);
    const [y, mo] = String(s).split('-'); return ((ID() ? BULAN : MONTHS)[+mo - 1] || s) + ' ' + y;
  };
  const badge = (t, small) => '<span class="rkb' + (small ? ' sm' : '') + '" style="--rk:' + COLOR[t.key] + '">' + icon(t.key) + esc(t.name) + '</span>';
  const fmt = n => Number(n || 0).toLocaleString(ID() ? 'id-ID' : 'en-US');

  function host() { try { return window.MHRSimOnline && window.MHRSimOnline.host(); } catch (e) { return null; } }
  function client() { const h = host(); try { return h && h.client ? h.client() : null; } catch (e) { return null; } }
  async function me() { const h = host(); try { return h ? await h.session() : null; } catch (e) { return null; } }
  const missing = e => e && /PGRST205|42P01|PGRST202|42883|does not exist/.test((e.code || '') + ' ' + (e.message || ''));

  async function board(season) {
    const c = client(); if (!c) return { error: { message: 'offline' } };
    const r = await c.from('sim_ratings').select('user_id,username,points,peak,games,wins,losses,draws,streak,last_match_at')
      .eq('season', season).order('points', { ascending: false }).order('wins', { ascending: false }).order('last_match_at', { ascending: true }).limit(200);
    return { data: r.data || [], error: r.error };
  }
  async function seasons() {
    const c = client(); if (!c) return [seasonNow()];
    try { const r = await c.rpc('mhr_sim_seasons'); const l = (r.data || []).map(x => typeof x === 'string' ? x : x.mhr_sim_seasons).filter(Boolean); if (!l.includes(seasonNow())) l.unshift(seasonNow()); return l; }
    catch (e) { return [seasonNow()]; }
  }

  /* ---------- panel Ranked (menu → 🏆 Ranked) ---------- */
  let curSeason = null;
  async function render(el) {
    if (!el) return;
    const head = '<div class="hd"><button data-mode="home">← Menu</button><h2>Ranked</h2></div>';   // tombol disembunyikan CSS sejak o2.16 (tab selalu tampil)
    if (!live()) {
      el.innerHTML = head + '<div class="box rkme rksoon"><span class="rktag">' + T('COMING SOON', 'SEGERA') + '</span><h3>' + T('Ranked starts on ', 'Ranked dimulai ') + START_TXT + '</h3>' +
        '<p class="small">' + T('Right after the beta, every Find a match game earns or loses points. Climb from Recruit to Genius Burden and race for the top of the leaderboard. Games played during the beta are not counted.',
          'Begitu beta selesai, setiap pertandingan Cari lawan menambah atau mengurangi poin. Naik dari Recruit sampai Genius Burden dan bersainglah di puncak leaderboard. Pertandingan selama beta tidak dihitung.') + '</p>' +
        '<div class="rktiers">' + ALL.map(k => '<span style="--rk:' + COLOR[k] + '">' + icon(k, 'rkti') + '<i>' + k + '</i></span>').join('') + '</div></div>' +
        helpHTML();
      tr(); return;
    }
    el.innerHTML = head + '<div class="box small muted">' + T('Loading…', 'Memuat…') + '</div>'; tr();
    const [s, list] = await Promise.all([me(), seasons()]);
    if (!curSeason) curSeason = seasonNow();
    const r = await board(curSeason);
    if (r.error) {
      el.innerHTML = head + '<div class="box small ' + (missing(r.error) ? 'muted">' + T('Ranked is being set up. Please check again soon.', 'Ranked sedang disiapkan. Coba lagi sebentar lagi.') : 'err">' + T('The leaderboard could not be loaded: ', 'Leaderboard tidak bisa dimuat: ') + esc(r.error.message || r.error)) + '</div>';
      tr(); return;
    }
    const rows = r.data, placed = rows.filter(x => x.games >= PLACEMENT), placing = rows.filter(x => x.games < PLACEMENT);
    const mine = s && rows.find(x => x.user_id === s.userId);
    const pos = mine && mine.games >= PLACEMENT ? placed.indexOf(mine) + 1 : 0;
    const isNow = curSeason === seasonNow();
    let h = head;
    h += '<div class="rkseason"><label>Season</label><select id="rkSeason" data-noi18n>' + list.map(x => '<option value="' + esc(x) + '"' + (x === curSeason ? ' selected' : '') + '>' + esc(seasonLabel(x)) + (x === seasonNow() ? T(' (current)', ' (sekarang)') : '') + '</option>').join('') + '</select></div>';
    // kartu saya
    if (s) {
      if (mine) {
        const t = tier(mine.points, mine.games);
        h += '<div class="box rkme" style="--rk:' + COLOR[t.key] + '"><div class="rkme-t">' + badge(t) +
          (mine.games < PLACEMENT ? '<span class="small muted">Placement ' + mine.games + '/' + PLACEMENT + '</span>' : '<span class="small muted">#' + pos + T(' of ', ' dari ') + placed.length + '</span>') + '</div>' +
          '<div class="rkme-p"><b data-noi18n>' + fmt(mine.points) + '</b> <span>' + T('points', 'poin') + '</span></div>' +
          '<div class="rkme-s small"><span><b>' + mine.wins + '</b> ' + T('W', 'M') + '</span><span><b>' + mine.losses + '</b> ' + T('L', 'K') + '</span>' + (mine.draws ? '<span><b>' + mine.draws + '</b> ' + T('D', 'S') + '</span>' : '') +
          '<span>' + T('Peak', 'Tertinggi') + ' <b data-noi18n>' + fmt(mine.peak) + '</b></span>' + (mine.streak > 1 ? '<span class="hot">🔥 ' + T(mine.streak + ' wins in a row', mine.streak + ' kali menang beruntun') + '</span>' : '') + '</div>' +
          (t.next ? '<div class="rkbar"><i style="width:' + Math.max(4, Math.min(100, 100 - (t.next - mine.points))) + '%"></i></div><div class="small muted">' + T((t.next - mine.points) + ' points to ', (t.next - mine.points) + ' poin lagi ke ') + esc(tier(t.next, PLACEMENT).name) + '</div>' : '') +
          '</div>';
      } else if (isNow) {
        h += '<div class="box rkme"><b>You are not ranked yet this season.</b><p class="small muted">Play 5 games in Find a match to finish your placement and get your rank.</p><div class="startbar"><button class="pri" data-mode="find">⚔️ Find a match</button></div></div>';
      }
    } else {
      h += '<div class="box"><p><b>Log in to play ranked.</b></p><p class="small muted">Ranked games are played in Find a match with your mhrdecklab.com account.</p><div class="startbar"><button class="pri" data-on="login">Log in</button></div></div>';
    }
    // leaderboard
    h += '<div class="rkh"><b>🏆 Leaderboard · ' + esc(seasonLabel(curSeason)) + '</b><span class="small muted">' + T(placed.length + ' ranked · ' + placing.length + ' in placement', placed.length + ' punya rank · ' + placing.length + ' masih placement') + '</span></div>';
    if (!placed.length) h += '<div class="box small muted">' + (isNow ? T('No one has finished placement yet this season. Be the first: play 5 games in Find a match.', 'Belum ada yang menyelesaikan placement di season ini. Jadilah yang pertama: mainkan 5 pertandingan di Cari lawan.') : T('No ranked players in this season.', 'Tidak ada pemain ber-rank di season ini.')) + '</div>';
    else h += '<div class="rklist">' + placed.map((x, i) => {
      const t = tier(x.points, x.games), you = s && x.user_id === s.userId;
      return '<div class="rkrow' + (you ? ' me' : '') + (i < 3 ? ' top' : '') + '"><span class="n">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) + '</span>' +
        '<span class="u"><b data-noi18n>' + esc(x.username || 'Player') + '</b>' + badge(t, true) + '</span>' +
        '<span class="wl small" data-noi18n>' + x.wins + '–' + x.losses + (x.draws ? '–' + x.draws : '') + '</span><span class="p" data-noi18n>' + fmt(x.points) + '</span></div>';
    }).join('') + '</div>';
    if (placing.length) h += '<p class="small muted" style="margin:10px 2px">' + T('In placement: ', 'Masih placement: ') + '<span data-noi18n>' + placing.map(x => esc(x.username || 'Player') + ' (' + x.games + '/' + PLACEMENT + ')').join(', ') + '</span></p>';
    h += helpHTML();
    el.innerHTML = h;
    const sel = $('rkSeason'); if (sel) sel.onchange = () => { curSeason = sel.value; render(el); };
    tr();
  }
  function helpHTML() {
    const li = (en, id) => '<li>' + T(en, id) + '</li>';
    const h4 = (en, id) => '<p class="small" style="margin:10px 0 4px"><b>' + T(en, id) + '</b></p>';
    const row = (en, id, w, l) => '<tr><td>' + T(en, id) + '</td><td data-noi18n style="text-align:right;color:#9fe0b2">' + w + '</td><td data-noi18n style="text-align:right;color:#ffb4a8">' + l + '</td></tr>';
    return '<details class="box rkhelp"' + (live() ? '' : ' open') + '><summary><b>' + T('How ranked works', 'Cara kerja ranked') + '</b></summary>' +
      h4('Who you play', 'Siapa lawan Anda') +
      '<ul class="small">' +
      li('Only <b>Find a match</b> games count. Private rooms and games against the bot are casual.',
         'Hanya pertandingan <b>Cari lawan</b> yang dihitung. Room privat dan pertandingan melawan bot bersifat santai (casual).') +
      li('The community is still small, so the queue matches everyone with everyone, whatever their rank, to keep waiting times short. You will often meet the same players; that is normal.',
         'Komunitas masih kecil, jadi antrean mempertemukan siapa saja tanpa melihat rank supaya waktu tunggu tetap singkat. Bertemu pemain yang sama berkali-kali itu wajar.') +
      '</ul>' +
      h4('How points move', 'Cara poin dihitung') +
      '<ul class="small">' +
      li('Everyone starts at <b>1,000 points</b>. Points depend on the gap between you and your opponent: beating a stronger player gives many points, beating a weaker player gives few, and losing to a weaker player costs more.',
         'Semua pemain mulai dari <b>1.000 poin</b>. Poin bergantung pada selisih poin Anda dengan lawan: mengalahkan pemain yang lebih kuat memberi banyak poin, mengalahkan pemain yang lebih lemah memberi sedikit, dan kalah dari pemain yang lebih lemah mengurangi lebih banyak.') +
      li('Your first <b>5 games</b> each season are placement games: points move twice as fast.',
         '<b>5 pertandingan</b> pertama di setiap season adalah placement: poin naik-turun dua kali lebih cepat.') +
      li('Conceding, leaving or the 3rd timeout counts as a loss.',
         'Menyerah, keluar, atau kehabisan waktu ke-3 kalinya dihitung kalah.') +
      '</ul>' +
      '<table class="small" style="width:100%;border-collapse:collapse;margin:4px 0 6px"><tr><th style="text-align:left">' + T('Your opponent', 'Lawan Anda') + '</th><th style="text-align:right">' + T('Win', 'Menang') + '</th><th style="text-align:right">' + T('Loss', 'Kalah') + '</th></tr>' +
      row('400 points higher', '400 poin di atas Anda', '+44', '−4') +
      row('200 points higher', '200 poin di atas Anda', '+36', '−12') +
      row('Same points', 'Poin sama', '+24', '−24') +
      row('200 points lower', '200 poin di bawah Anda', '+12', '−36') +
      row('400 points lower', '400 poin di bawah Anda', '+4', '−44') +
      '</table><p class="small muted" style="margin:0 0 6px">' + T('After placement. A win always gives at least +1.', 'Setelah placement. Menang selalu memberi minimal +1.') + '</p>' +
      h4('Fair play', 'Main adil') +
      '<ul class="small">' +
      li('A game that ends before <b>turn 4</b> (an early concede or leave) gives no points and does not count as a game.',
         'Pertandingan yang berakhir sebelum <b>giliran ke-4</b> (menyerah atau keluar terlalu cepat) tidak memberi poin dan tidak dihitung sebagai pertandingan.') +
      li('The net points you can win from the <b>same opponent</b> are limited to <b>+75 per day</b> (WIB) and <b>+200 per season</b>. After that, wins against that player give fewer or no points, and their losses cost them fewer or none. Playing each other often with mixed results never reaches the limit.',
         'Poin bersih yang bisa Anda dapat dari <b>lawan yang sama</b> dibatasi <b>+75 per hari</b> (WIB) dan <b>+200 per season</b>. Setelah itu, menang melawan pemain itu memberi poin lebih sedikit atau 0, dan kekalahannya juga mengurangi lebih sedikit atau 0. Sering bertemu dengan hasil yang saling bergantian tidak akan menyentuh batas ini.') +
      li('You cannot win more points than your opponent still has.',
         'Anda tidak bisa mendapat poin lebih banyak dari sisa poin lawan.') +
      li('One account per player. Duplicate accounts or arranged results can lead to disqualification from season rewards.',
         'Satu akun untuk satu pemain. Akun ganda atau hasil yang diatur bisa membuat pemain didiskualifikasi dari hadiah season.') +
      '</ul>' +
      h4('Tiers and seasons', 'Tier dan season') +
      '<ul class="small">' +
      li('Tiers: Recruit · Agent (900) · Hero (1,200) · Avenger (1,500) · Legend (1,800) · Myth (2,100) · Cosmic (2,400), each with divisions III, II and I (100 points each), and the top tier <b>Genius Burden</b> (2,700+).',
         'Tier: Recruit · Agent (900) · Hero (1.200) · Avenger (1.500) · Legend (1.800) · Myth (2.100) · Cosmic (2.400), masing-masing dengan divisi III, II, dan I (100 poin per divisi), dan tier puncak <b>Genius Burden</b> (2.700+).') +
      li('Season 0 runs from 23 November to 31 December 2026. Season 1 starts on 1 January 2027; its length will be announced once the 2027 set release date is known. At each new season your points move halfway back toward 1,000 and you play 5 new placement games.',
         'Season 0 berlangsung 23 November sampai 31 Desember 2026. Season 1 dimulai 1 Januari 2027; lamanya diumumkan setelah tanggal rilis set 2027 diketahui. Di awal season baru, poin Anda bergeser setengah jalan kembali ke 1.000 dan Anda bermain 5 pertandingan placement lagi.') +
      '</ul></details>';
  }

  /* ---------- baris singkat di menu Find a match ---------- */
  async function fillLine(el) {
    if (!el) return;
    if (!live()) { el.innerHTML = '<div class="rkline"><span class="rktag">RANKED</span><span>' + T('Starts ' + START_TXT + ', after the beta', 'Mulai ' + START_TXT + ', setelah beta') + '</span><button class="sm" data-mode="ranked">' + T('Learn more →', 'Selengkapnya →') + '</button></div>'; tr(); return; }
    const s = await me(), c = client(); if (!s || !c) return;
    let row = null;
    try { const r = await c.from('sim_ratings').select('points,games').eq('season', seasonNow()).eq('user_id', s.userId).maybeSingle(); if (r.error) return; row = r.data; } catch (e) { return; }
    if (!el.isConnected) return;
    const t = row ? tier(row.points, row.games) : tier(1000, 0);
    el.innerHTML = '<div class="rkline"><span class="rktag">RANKED</span>' + badge(t, true) +
      (row ? '<span data-noi18n>' + fmt(row.points) + '</span> <span>' + T('pts', 'poin') + '</span>' + (row.games < PLACEMENT ? ' · <span>placement ' + row.games + '/' + PLACEMENT + '</span>' : '') : '<span>' + T('Play 5 games to get your rank', 'Main 5 kali untuk mendapat rank') + '</span>') +
      '<button class="sm" data-mode="ranked">Leaderboard →</button></div>';
    tr();
  }

  /* ---------- perubahan poin di layar hasil online ---------- */
  const resCache = {};
  async function result(matchId) {
    if (!matchId || !live()) return null;
    if (resCache[matchId] !== undefined) return resCache[matchId];
    const s = await me(), c = client(); if (!s || !c) return null;
    resCache[matchId] = null;
    for (let i = 0; i < 4; i++) {       // trigger berjalan di transaksi yang sama, tetapi beri jeda bila koneksi lambat
      try {
        let r = await c.from('sim_rating_log').select('result,before,delta,after,placement,season,note').eq('match_id', matchId).eq('user_id', s.userId).maybeSingle();
        if (r.error && /note/.test(r.error.message || '')) r = await c.from('sim_rating_log').select('result,before,delta,after,placement,season').eq('match_id', matchId).eq('user_id', s.userId).maybeSingle();   // kolom note belum ada (SQL v7.42 belum dijalankan)
        if (r.error) return null;
        if (r.data) {
          const g = await c.from('sim_ratings').select('points,games').eq('season', r.data.season).eq('user_id', s.userId).maybeSingle();
          return (resCache[matchId] = Object.assign({}, r.data, { games: g.data ? g.data.games : PLACEMENT }));
        }
      } catch (e) { return null; }
      await new Promise(ok => setTimeout(ok, 1500));
    }
    return (resCache[matchId] = false);   // bukan pertandingan ranked (room privat)
  }
  /* v7.42 (riwayat #105) main adil: alasan di kolom sim_rating_log.note. 'short' = ±0 dan tidak dihitung; batas pasangan dan
     'zero' = poin dikurangi (bisa sampai 0) tetapi pertandingan tetap dihitung. */
  const NOTE = {
    short: ['Not counted: the game ended before turn 4.', 'Tidak dihitung: pertandingan berakhir sebelum giliran ke-4.'],
    pair_day: ['Limited: you reached today\'s +75 limit against this opponent.', 'Dibatasi: batas +75 poin dari lawan ini hari ini sudah tercapai.'],
    pair_season: ['Limited: you reached this season\'s +200 limit against this opponent.', 'Dibatasi: batas +200 poin dari lawan ini di season ini sudah tercapai.'],
    zero: ['Limited: your opponent had no more points to lose.', 'Dibatasi: poin lawan sudah habis.']
  };
  function resultHTML(x) {
    if (!x) return '';
    const n = x.note ? (NOTE[x.note] || ['Limited by the fair-play rules.', 'Dibatasi aturan main adil.']) : null;
    if (x.note === 'short') return '<div class="rkres"><span class="rktag">RANKED</span><b data-noi18n>±0</b> <span>' + T(n[0], n[1]) + '</span></div>';
    const t = tier(x.after, x.games), up = x.delta > 0;
    return '<div class="rkres' + (up ? ' up' : x.delta < 0 ? ' down' : '') + '"><span class="rktag">RANKED</span><b data-noi18n>' + (up ? '+' : x.delta === 0 ? '±' : '') + x.delta + '</b> <span>' + T('points', 'poin') + '</span> → <b data-noi18n>' + fmt(x.after) + '</b> ' + badge(t, true) +
      (x.games < PLACEMENT ? ' <span class="small">placement ' + x.games + '/' + PLACEMENT + '</span>' : '') +
      (n ? '<div class="small muted">' + T(n[0], n[1]) + '</div>' : '') + '</div>';
  }

  function tr() { if (window.MHRSimI18N) window.MHRSimI18N.apply(); }
  if (window.MHRSimI18N && window.MHRSimI18N.add) window.MHRSimI18N.add({
    'Ranked': 'Ranked', '🏆 Ranked': '🏆 Ranked', 'Season': 'Season', 'points': 'poin', 'pts': 'poin', 'Leaderboard →': 'Leaderboard →',
    'You are not ranked yet this season.': 'Anda belum punya rank di season ini.',
    'Play 5 games in Find a match to finish your placement and get your rank.': 'Mainkan 5 pertandingan di Cari lawan untuk menyelesaikan placement dan mendapat rank.',
    'Log in to play ranked.': 'Masuk untuk bermain ranked.', 'Ranked games are played in Find a match with your mhrdecklab.com account.': 'Pertandingan ranked dimainkan di Cari lawan dengan akun mhrdecklab.com Anda.',
    'How ranked works': 'Cara kerja ranked', 'Play 5 games to get your rank': 'Main 5 kali untuk mendapat rank',
    'No one has finished placement yet this season. Be the first: play 5 games in Find a match.': 'Belum ada yang menyelesaikan placement di season ini. Jadilah yang pertama: mainkan 5 pertandingan di Cari lawan.',
    'Ranked is being set up. Please check again soon.': 'Ranked sedang disiapkan. Coba lagi sebentar lagi.',
    'Ranked starts on 23 November 2026': 'Ranked dimulai 23 November 2026', 'Starts 23 November 2026, after the beta': 'Mulai 23 November 2026, setelah beta', 'Learn more →': 'Selengkapnya →', 'COMING SOON': 'SEGERA'
  });

  window.MHRSimRanked = { tier, seasonNow, seasonLabel, render, fillLine, result, resultHTML, COLOR, PLACEMENT, live, START };
})();
