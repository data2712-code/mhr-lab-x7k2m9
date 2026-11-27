/* ===================================================================
   MHR DECK LAB — sim-meta.js (v7.61, 🗼 Control Tower → 🎮 Battle Sim stats)
   ===================================================================
   Permintaan pemilik 25 Nov 2026: halaman statistik SEMUA permainan Battle Sim untuk analisa (super-admin saja,
   keputusan pemilik). Sumber: tabel sim_matches (semua pertandingan ONLINE: Find a match + room privat; latihan lawan
   bot & 1 perangkat tidak tersimpan di server). Tanpa SQL baru: super-admin sudah boleh membaca semua baris (RLS).
   Semua dihitung di browser admin:
     - kolom sim_matches → hasil, mode, jam, durasi (ended_at − started_at), giliran, cara berakhir, Rush Point, timeout
     - kode log (MHRSim.parseLog) → daftar deck kedua pemain (warna, kartu), mulligan, aksi per kartu. Pemetaan iid → nomor
       kartu: createGame() dengan seed yang sama (seperti sim-stats.js), TANPA memutar ulang pertandingan. Mesin dimuat
       dari sim/sim.js saat tab ini dibuka.
   Parameter (dipilih pemilik): meta warna & deck · hasil & durasi · keseimbangan & aturan · kartu. + ekspor CSV.
   Warna deck: warna dengan ≥ 4 kartu (warna "percikan" < 4 kartu diabaikan), sama dengan sim-stats.js.
   Win rate dihitung per deck (tiap pertandingan = 2 deck); seri tidak dihitung dalam win rate.
   v7.64: semua kelas CSS memakai awalan sm- (dulu .lb / .n bentrok dengan lightbox & kelas situs → halaman tampak kosong).
   =================================================================== */
(function(){
  'use strict';
  const q = s => document.querySelector(s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  const SIM_JS = 'sim/sim.js?v=o2.66';
  const COLS = 'id,room,p1,p2,names,deck_names,clock,first,winner,end_cause,cause,turns,rp,timeouts,undo_used,log_code,engine,started_at,ended_at,mode';
  const COL = { Merah:['Red','#E4442E'], Kuning:['Yellow','#F2B01E'], Biru:['Blue','#3B87E8'], Hijau:['Green','#33A45C'], Orange:['Orange','#E8821E'], Purple:['Purple','#9B5DE5'] };
  const COL_ORDER = ['Merah','Kuning','Biru','Hijau','Orange','Purple'];
  const END = { rp:'9 Rush Points', deck:'Deck out', time:'Time up', timeouts:'3 timeouts', claim:'Opponent left (seat claimed)', conceded:'Conceded', other:'Other' };
  const MODE = { queue:'Find a match', room:'Private room', other:'Other' };
  const CLOCK = { standard:'Standard', match30:'30-minute match', relaxed:'Relaxed', off:'No clock' };

  const D = { rows:null, err:null, at:0, loading:null, S:null, simErr:null, games:null };
  const F = { per:'30', mode:'all', minCard:10, cardSort:'deck', minMull:10 };
  try{ const v = JSON.parse(localStorage.getItem('mhr_ct_simmeta') || 'null'); if(v){ ['per','mode','cardSort'].forEach(k=>{ if(v[k]) F[k] = v[k]; }); if(v.minCard) F.minCard = +v.minCard || 10; if(v.minMull) F.minMull = +v.minMull || 10; } }catch(e){}
  const saveF = () => { try{ localStorage.setItem('mhr_ct_simmeta', JSON.stringify(F)); }catch(e){} };

  /* ---------------- mesin (sim/sim.js) ---------------- */
  function loadSim(){
    if(D.S) return Promise.resolve(D.S);
    if(window.MHRSim && window.MHRSim.createGame){ D.S = window.MHRSim; D.S.init(window.CARDS); return Promise.resolve(D.S); }
    return new Promise(res=>{
      const s = document.createElement('script'); s.src = SIM_JS;
      s.onload = ()=>{ try{ D.S = window.MHRSim; D.S.init(window.CARDS); }catch(e){ D.simErr = e; D.S = null; } res(D.S); };
      s.onerror = ()=>{ D.simErr = new Error('sim.js could not be loaded'); res(null); };
      document.head.appendChild(s);
    });
  }
  let CARD_IX = null;
  const card = no => { if(!CARD_IX){ CARD_IX = {}; (window.CARDS || []).forEach(c=>{ CARD_IX[c.no] = c; }); } return CARD_IX[no] || null; };
  const colorsOf = list => {
    const n = {}; (list || []).forEach(no=>{ const c = card(no); if(c && COL[c.c]) n[c.c] = (n[c.c] || 0) + 1; });
    return COL_ORDER.filter(k=>n[k] >= 4 || (n[k] && Object.keys(n).length === 1));
  };
  const pairKey = cols => cols.length ? cols.join('/') : '?';
  const pairLabel = k => k === '?' ? 'Unknown' : k.split('/').map(c=>COL[c] ? COL[c][0] : c).join(' / ');
  const dots = k => '<span class="sm-dots">' + (k === '?' ? '<i></i>' : k.split('/').map(c=>'<i style="background:' + (COL[c] ? COL[c][1] : '#555') + '"></i>').join('')) + '</span>';

  /* ---------------- data ---------------- */
  async function load(force){
    if(!force && D.rows && Date.now() - D.at < 5 * 60000) return;
    if(D.loading) return D.loading;
    D.loading = (async ()=>{
      D.err = null;
      try{
        const c = client(); if(!c) throw new Error('Not connected.');
        const rows = [];
        for(let from = 0; from < 50000; from += 1000){
          const r = await c.from('sim_matches').select(COLS).order('ended_at', { ascending:false }).range(from, from + 999);
          if(r.error) throw r.error;
          rows.push(...(r.data || []));
          if(!r.data || r.data.length < 1000) break;
        }
        await loadSim();
        D.rows = rows; D.games = rows.map(digest).filter(Boolean); D.at = Date.now();
      }catch(e){ D.err = e; }
      finally{ D.loading = null; }
    })();
    return D.loading;
  }
  /* satu baris → objek analisa */
  function digest(r){
    if(r.winner == null) return null;
    const S = D.S;
    let end = r.end_cause || 'other'; if(/ conceded$/.test(r.cause || '')) end = 'conceded'; if(!END[end]) end = 'other';
    const t0 = Date.parse(r.started_at) || 0, t1 = Date.parse(r.ended_at) || 0;
    const dur = t0 && t1 && t1 > t0 && t1 - t0 < 4 * 3600e3 ? (t1 - t0) / 60000 : null;   // menit; > 4 jam dianggap data rusak
    const g = { id:r.id, room:r.room, t:t1, mode:r.mode === 'queue' || r.mode === 'room' ? r.mode : 'other', clock:r.clock || '', engine:r.engine || '',
      winner:r.winner, first:r.first, turns:r.turns || 0, end, dur, rp:Array.isArray(r.rp) ? r.rp : null,
      to:Array.isArray(r.timeouts) ? r.timeouts : [0, 0], undo:Array.isArray(r.undo_used) ? r.undo_used.some(Boolean) : !!r.undo_used,
      names:r.names || ['', ''], pid:[r.p1, r.p2], deckNames:r.deck_names || ['', ''], lists:[null, null], cols:[[], []], mull:[null, null], keep:[null, null], acts:null };
    const o = S && r.log_code ? S.parseLog(r.log_code) : null;
    if(o && Array.isArray(o.d) && o.d[0] && o.d[1]){
      g.lists = [o.d[0], o.d[1]]; g.cols = [colorsOf(o.d[0]), colorsOf(o.d[1])];
      if(!o.q && Array.isArray(o.a)) try{
        const st = S.createGame({ decks:o.d, seed:o.s, first:o.f, names:o.n, vanilla:!o.x, siaga:!!o.g, confirm:!!o.k, opaque:!!o.o, toLimit:o.t || 0 });
        // Mulligan: dua aksi pertama, pemain pertama memutuskan dulu (CR 103.3).
        const fp = st.first != null ? st.first : (g.first != null ? g.first : 0);
        // v7.61 (pemilik): kartu yang disimpan / dikembalikan saat mulligan — tangan awal 6 kartu dari createGame (sebelum aksi apa pun).
        const hand0 = [0, 1].map(p=>(st.P[p].hand || []).slice());
        let k = 0;
        for(const a of o.a){
          if(!a || a.t !== 'mulligan') break;
          const p = k === 0 ? fp : 1 - fp, back = a.cards || [];
          g.mull[p] = back.length;
          g.keep[p] = { kept:hand0[p].filter(i=>!back.includes(i)).map(i=>st.inst[i] && st.inst[i].no).filter(Boolean), back:back.map(i=>st.inst[i] && st.inst[i].no).filter(Boolean) };
          k++; if(k === 2) break;
        }
        const acts = [{}, {}];
        const add = (p, no, key)=>{ const m = acts[p][no] || (acts[p][no] = { call:0, acti:0, atk:0, dep:0 }); m[key]++; };
        o.a.forEach(a=>{
          if(!a || !a.t) return;
          const key = a.t === 'call' || a.t === 'ccall' ? 'call' : a.t === 'attack' ? 'atk' : a.t === 'acti' ? 'acti' : a.t === 'deploy' ? 'dep' : null;
          if(!key) return;
          const ins = st.inst[a.t === 'attack' ? a.a : a.c]; if(!ins || ins.owner == null) return;
          add(ins.owner, ins.no, key);
        });
        g.acts = acts;
      }catch(e){ /* log tidak bisa dipetakan: lewati statistik aksi */ }
    }
    return g;
  }
  function filtered(){
    const now = Date.now();
    return (D.games || []).filter(g=>(F.per === 'all' || g.t >= now - (+F.per) * 864e5) && (F.mode === 'all' || g.mode === F.mode));
  }

  /* ---------------- hitungan ---------------- */
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
  const fmtPct = v => v == null ? '—' : (Math.round(v * 10) / 10) + '%';
  const res = (g, p) => g.winner === p ? 'w' : g.winner === 1 - p ? 'l' : 'd';
  const median = arr => { if(!arr.length) return null; const s = arr.slice().sort((a, b)=>a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const avg = arr => arr.length ? arr.reduce((a, b)=>a + b, 0) / arr.length : null;
  const r1 = v => v == null ? '—' : (Math.round(v * 10) / 10).toString();
  const wrOf = (w, l) => w + l ? w / (w + l) * 100 : null;
  function deckRows(games){            // satu baris per deck (2 per pertandingan)
    const out = [];
    games.forEach(g=>[0, 1].forEach(p=>out.push({ g, p, r:res(g, p), cols:g.cols[p], key:pairKey(g.cols[p]), opp:pairKey(g.cols[1 - p]), list:g.lists[p], first:g.first === p, mull:g.mull[p], acts:g.acts ? g.acts[p] : null })));
    return out;
  }
  function wl(list){ let w = 0, l = 0, d = 0; list.forEach(x=>{ if(x.r === 'w') w++; else if(x.r === 'l') l++; else d++; }); return { n:list.length, w, l, d, wr:wrOf(w, l) }; }

  /* ---------------- tampilan ---------------- */
  function css(){
    if(q('#smCss')) return;
    const st = document.createElement('style'); st.id = 'smCss';
    st.textContent = `
    .sm-filt{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
    .sm-filt select,.sm-filt input{background:var(--ink);color:var(--paper);border:1px solid var(--line);border-radius:8px;padding:7px 9px;font:inherit;font-size:13px}
    .sm-filt button{background:var(--panel2);color:var(--paper);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font:inherit;font-size:13px;cursor:pointer}
    .sm-filt button:hover{border-color:var(--accent)}
    .sm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:12px}
    .sm-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:12px}
    .sm-tile{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:11px 13px}
    .sm-tile b{display:block;font-family:var(--disp);font-size:24px;letter-spacing:.02em;color:var(--paper)}
    .sm-tile span{font-size:12px;color:var(--muted)}
    .sm-bars{display:flex;flex-direction:column;gap:7px}
    .sm-bar{display:grid;grid-template-columns:minmax(90px,150px) 1fr 62px;gap:8px;align-items:center;font-size:12.5px}
    .sm-bar .sm-lb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#C9CFD8}
    .sm-bar .sm-trk{height:14px;background:var(--ink);border-radius:4px;position:relative;overflow:hidden}
    .sm-bar .sm-trk i{position:absolute;left:0;top:0;bottom:0;border-radius:0 4px 4px 0;background:var(--accent)}
    .sm-bar .sm-val{text-align:right;font-family:var(--mono);font-size:12px;color:var(--paper)}
    .sm-bar .sm-trk .sm-mid{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--paper);opacity:.85}
    .sm-dots{display:inline-flex;gap:2px;vertical-align:middle;margin-right:5px}
    .sm-dots i{width:9px;height:9px;border-radius:50%;display:inline-block;background:#555}
    .sm-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
    .sm-tbl th{color:var(--muted);font-weight:600;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
    .sm-tbl td{padding:5px 6px;border-bottom:1px solid #222a34;color:#D6DBE2;white-space:nowrap}
    .sm-tbl td.sm-n,.sm-tbl th.sm-n{text-align:right;font-family:var(--mono)}
    .sm-scroll{overflow-x:auto}
    .sm-mx td.sm-c{text-align:center;font-family:var(--mono);font-size:11.5px;min-width:46px;border:2px solid var(--panel);border-radius:4px}
    .sm-cols{display:flex;align-items:flex-end;gap:2px;height:120px;padding-top:6px}
    .sm-cols div{flex:1;background:var(--accent);border-radius:3px 3px 0 0;min-height:1px;opacity:.9}
    .sm-cols div:hover{opacity:1;outline:1px solid var(--paper)}
    .sm-axis{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:3px}
    .sm-note{font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.5}
    .sm-card{display:inline-flex;align-items:center;gap:6px}
    .sm-card img{width:22px;height:31px;object-fit:cover;border-radius:3px}
    .sm-sec{margin:18px 0 8px;font-family:var(--disp);font-size:18px;letter-spacing:.04em;text-transform:uppercase;color:var(--paper)}`;
    document.head.appendChild(st);
  }
  const box = (title, sub, inner) => `<div class="ct-box"><div class="ct-bh"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${inner}</div>`;
  function bars(items, opt){        // items: [{label(html), v, max?, tip, color?, val(text)}]
    opt = opt || {};
    const max = opt.max || Math.max(1, ...items.map(i=>i.v || 0));
    return '<div class="sm-bars">' + items.map(i=>`<div class="sm-bar" title="${E(i.tip || '')}"><span class="sm-lb">${i.label}</span><span class="sm-trk"><i style="width:${Math.max(0, Math.min(100, (i.v || 0) / max * 100))}%;${i.color ? 'background:' + i.color : ''}"></i>${opt.mid ? '<span class="sm-mid"></span>' : ''}</span><span class="sm-val">${i.val}</span></div>`).join('') + '</div>';
  }
  function tile(v, l){ return `<div class="sm-tile"><b>${v}</b><span>${l}</span></div>`; }

  async function render(el){
    css();
    el.innerHTML = '<p class="ct-mut">Loading all Battle Sim matches…</p>';
    await load();
    draw(el);
  }
  function draw(el){
    if(D.err){ el.innerHTML = '<p class="ct-mut">Matches could not be loaded: ' + E(D.err.message || D.err) + '</p>'; return; }
    if(!D.games){ el.innerHTML = '<p class="ct-mut">Loading…</p>'; return; }
    const G = filtered(), R = deckRows(G);
    let h = `<div class="sm-filt">
      <select data-smf="per">${[['7','Last 7 days'],['14','Last 14 days'],['30','Last 30 days'],['90','Last 90 days'],['all','All time']].map(([v, l])=>`<option value="${v}"${F.per === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <select data-smf="mode">${[['all','All online modes'],['queue','Find a match only'],['room','Private rooms only']].map(([v, l])=>`<option value="${v}"${F.mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" data-sm="reload">↻ Reload</button><button type="button" data-sm="csv">⬇ CSV (per game)</button>
      <span class="ct-mut">${G.length} match(es) · ${(D.games || []).length} in total · loaded ${new Date(D.at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span></div>`;
    if(D.simErr) h += '<p class="ct-mut">⚠ The simulator engine could not be loaded, so decks, colours and cards are missing.</p>';
    if(!G.length){ el.innerHTML = h + '<p class="ct-mut">No matches in this period.</p>'; return; }
    h += secSummary(G, R);
    h += '<h3 class="sm-sec">Colours & decks</h3><div class="sm-grid">' + secColours(R) + '</div><div class="sm-grid" style="margin-top:12px">' + secPairs(R) + secTrend(R) + '</div><div style="margin-top:12px">' + secMatrix(R) + '</div>';
    h += '<h3 class="sm-sec">Results & duration</h3><div class="sm-grid">' + secActivity(G) + secHours(G) + secEnds(G) + secDuration(G) + '</div>';
    h += '<h3 class="sm-sec">Balance & rules</h3><div class="sm-grid">' + secBalance(G, R) + secModes(G) + '</div>';
    h += '<h3 class="sm-sec">Cards</h3>' + secCards(R) + secMulligan(G);
    h += '<h3 class="sm-sec">Players</h3>' + secPlayers(G);
    h += '<p class="sm-note">Source: all ONLINE Battle Sim matches saved on the server (Find a match + private rooms). Practice vs bot and pass-and-play games are not saved, so they are not here. Deck colours = colours with 4 or more cards in the deck. Win rate is counted per deck (each match has two decks); draws are left out of win rates. Small samples (fewer than 10 decks) are marked with *.</p>';
    el.innerHTML = h;
  }
  const star = n => n < 10 ? '*' : '';

  function secSummary(G, R){
    const durs = G.map(g=>g.dur).filter(v=>v != null), turns = G.map(g=>g.turns).filter(Boolean);
    const players = new Set(); G.forEach(g=>g.pid.forEach(p=>p && players.add(p)));
    const days = Math.max(1, (Math.max(...G.map(g=>g.t)) - Math.min(...G.map(g=>g.t))) / 864e5);
    const fp = G.filter(g=>g.first === 0 || g.first === 1), fw = fp.filter(g=>g.winner === g.first).length, fl = fp.filter(g=>g.winner === 1 - g.first).length;
    const draws = G.filter(g=>g.winner !== 0 && g.winner !== 1).length;
    return '<div class="sm-tiles">' +
      tile(G.length, 'matches') + tile(players.size, 'different players') + tile(r1(G.length / days), 'matches per day') +
      tile(durs.length ? r1(avg(durs)) + 'm' : '—', 'average length (median ' + (durs.length ? r1(median(durs)) : '—') + 'm)') +
      tile(turns.length ? r1(avg(turns)) : '—', 'average turns (median ' + (turns.length ? r1(median(turns)) : '—') + ')') +
      tile(fmtPct(wrOf(fw, fl)), 'win rate going first') +
      tile(fmtPct(pct(G.filter(g=>g.end === 'conceded').length, G.length)), 'matches ended by concede') +
      tile(draws, 'draws') + '</div>';
  }
  function secColours(R){
    const known = R.filter(x=>x.key !== '?');
    const items = COL_ORDER.map(c=>{
      const rows = known.filter(x=>x.cols.includes(c)), s = wl(rows);
      return { c, n:rows.length, share:pct(rows.length, known.length), s };
    }).sort((a, b)=>b.n - a.n);
    const use = bars(items.map(i=>({ label:dots(i.c) + E(COL[i.c][0]), v:i.share || 0, max:100, color:COL[i.c][1], val:fmtPct(i.share), tip:`${COL[i.c][0]}: in ${i.n} of ${known.length} decks` })));
    const wr = bars(items.map(i=>({ label:dots(i.c) + E(COL[i.c][0]) + star(i.s.w + i.s.l), v:i.s.wr || 0, max:100, color:COL[i.c][1], val:fmtPct(i.s.wr), tip:`${COL[i.c][0]}: ${i.s.w}W ${i.s.l}L ${i.s.d}D` })), { mid:true });
    return box('Colour usage', '% of decks that play the colour (a 2-colour deck counts for both)', use) +
      box('Win rate by colour', 'Line = 50%', wr);
  }
  function pairStats(R){
    const m = {};
    R.forEach(x=>{ (m[x.key] || (m[x.key] = [])).push(x); });
    return Object.entries(m).map(([k, rows])=>({ k, n:rows.length, s:wl(rows) })).sort((a, b)=>b.n - a.n);
  }
  function secPairs(R){
    const P = pairStats(R), tot = R.length;
    const rows = P.slice(0, 15).map(p=>`<tr><td>${dots(p.k)}${E(pairLabel(p.k))}</td><td class="sm-n">${p.n}</td><td class="sm-n">${fmtPct(pct(p.n, tot))}</td><td class="sm-n">${p.s.w}-${p.s.l}${p.s.d ? '-' + p.s.d : ''}</td><td class="sm-n">${fmtPct(p.s.wr)}${star(p.s.w + p.s.l)}</td></tr>`).join('');
    return box('Colour combinations', 'Most played deck colours', `<div class="sm-scroll"><table class="sm-tbl"><tr><th>Deck colours</th><th class="sm-n">Decks</th><th class="sm-n">Share</th><th class="sm-n">W-L</th><th class="sm-n">Win rate</th></tr>${rows}</table></div>`);
  }
  function secMatrix(R){
    const P = pairStats(R).filter(p=>p.k !== '?').slice(0, 8), keys = P.map(p=>p.k);
    if(keys.length < 2) return '';
    const cell = (a, b)=>{
      if(a === b) return '<td class="sm-c" style="color:var(--muted)">mirror</td>';
      const rows = R.filter(x=>x.key === a && x.opp === b), s = wl(rows);
      if(!s.w && !s.l) return '<td class="sm-c" style="color:#4a5563">·</td>';
      const d = (s.wr - 50) / 50, a2 = Math.min(.55, Math.abs(d) * .8 + .08);
      const bg = d >= 0 ? `rgba(59,135,232,${a2})` : `rgba(228,68,46,${a2})`;
      return `<td class="sm-c" style="background:${bg}" title="${E(pairLabel(a))} vs ${E(pairLabel(b))}: ${s.w}W ${s.l}L">${Math.round(s.wr)}%${star(s.w + s.l)}<br><span style="color:var(--muted);font-size:10px">${s.w + s.l}</span></td>`;
    };
    return box('Matchups', 'Win rate of the ROW deck against the COLUMN deck (top 8 colour combinations). Blue = row wins more, red = row loses more; small number = games',
      `<div class="sm-scroll"><table class="sm-tbl sm-mx"><tr><th></th>${keys.map(k=>`<th title="${E(pairLabel(k))}">${dots(k)}</th>`).join('')}</tr>${keys.map(a=>`<tr><td>${dots(a)}${E(pairLabel(a))}</td>${keys.map(b=>cell(a, b)).join('')}</tr>`).join('')}</table></div>`);
  }
  function secTrend(R){
    const wk = t => { const d = new Date(t); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime(); };
    const known = R.filter(x=>x.key !== '?'), W = {};
    known.forEach(x=>{ const k = wk(x.g.t); (W[k] || (W[k] = [])).push(x); });
    const weeks = Object.keys(W).map(Number).sort((a, b)=>a - b).slice(-8);
    if(weeks.length < 2) return '';
    const lab = t => new Date(t).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const rows = COL_ORDER.map(c=>`<tr><td>${dots(c)}${COL[c][0]}</td>${weeks.map(w=>{ const n = W[w].filter(x=>x.cols.includes(c)).length; return `<td class="sm-n" title="${n} of ${W[w].length} decks">${fmtPct(pct(n, W[w].length))}</td>`; }).join('')}</tr>`).join('');
    return box('Colour usage by week', 'Share of decks per week (week starts Monday)', `<div class="sm-scroll"><table class="sm-tbl"><tr><th>Colour</th>${weeks.map(w=>`<th class="sm-n">${lab(w)}<br><span style="font-weight:400">${W[w].length / 2 | 0} games</span></th>`).join('')}</tr>${rows}</table></div>`);
  }
  function secActivity(G){
    const day = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const last = day(Date.now()), n = F.per === 'all' ? Math.min(60, Math.ceil((last - Math.min(...G.map(g=>g.t))) / 864e5) + 1) : Math.min(60, +F.per);
    const cnt = {}; G.forEach(g=>{ const k = day(g.t); cnt[k] = (cnt[k] || 0) + 1; });
    const days = Array.from({ length:n }, (_, i)=>last - (n - 1 - i) * 864e5);
    const max = Math.max(1, ...days.map(d=>cnt[d] || 0));
    const lab = t => new Date(t).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    return box('Matches per day', `Last ${n} days · busiest ${max}`, `<div class="sm-cols">${days.map(d=>`<div style="height:${(cnt[d] || 0) / max * 100}%" title="${lab(d)}: ${cnt[d] || 0} match(es)"></div>`).join('')}</div><div class="sm-axis"><span>${lab(days[0])}</span><span>${lab(days[days.length - 1])}</span></div>`);
  }
  function secHours(G){
    const h = Array(24).fill(0); G.forEach(g=>{ h[new Date(g.t).getHours()]++; });
    const max = Math.max(1, ...h);
    let tz = ''; try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){}
    return box('Busy hours', 'Matches by the hour they ended (' + E(tz || 'this device') + ')', `<div class="sm-cols">${h.map((v, i)=>`<div style="height:${v / max * 100}%" title="${String(i).padStart(2, '0')}:00–${String(i).padStart(2, '0')}:59: ${v} match(es)"></div>`).join('')}</div><div class="sm-axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>`);
  }
  function secEnds(G){
    const c = {}; G.forEach(g=>{ c[g.end] = (c[g.end] || 0) + 1; });
    const items = Object.entries(c).sort((a, b)=>b[1] - a[1]).map(([k, v])=>({ label:E(END[k] || k), v:pct(v, G.length), max:100, val:fmtPct(pct(v, G.length)), tip:`${END[k] || k}: ${v} match(es)` }));
    return box('How matches end', '', bars(items, { max:100 }));
  }
  function secDuration(G){
    const buckets = [[0, 10, '< 10 min'], [10, 20, '10–20 min'], [20, 30, '20–30 min'], [30, 45, '30–45 min'], [45, 60, '45–60 min'], [60, 1e9, '60+ min']];
    const durs = G.map(g=>g.dur).filter(v=>v != null);
    const items = buckets.map(([a, b, l])=>{ const n = durs.filter(v=>v >= a && v < b).length; return { label:l, v:pct(n, durs.length), max:100, val:fmtPct(pct(n, durs.length)), tip:`${l}: ${n} match(es)` }; });
    const byEnd = {}; G.forEach(g=>{ if(g.dur != null) (byEnd[g.end] || (byEnd[g.end] = [])).push(g.dur); });
    const t = Object.entries(byEnd).sort((a, b)=>b[1].length - a[1].length).map(([k, v])=>`<tr><td>${E(END[k] || k)}</td><td class="sm-n">${v.length}</td><td class="sm-n">${r1(avg(v))}</td><td class="sm-n">${r1(median(v))}</td></tr>`).join('');
    const turnsW = G.filter(g=>g.end === 'rp').map(g=>g.turns);
    return box('Match length', `${durs.length} match(es) with start & end time · 9-RP wins take ${turnsW.length ? r1(avg(turnsW)) : '—'} turns on average`,
      bars(items, { max:100 }) + `<div class="sm-scroll" style="margin-top:10px"><table class="sm-tbl"><tr><th>Ended by</th><th class="sm-n">Matches</th><th class="sm-n">Avg min</th><th class="sm-n">Median min</th></tr>${t}</table></div>`);
  }
  function secBalance(G, R){
    const fp = G.filter(g=>g.first === 0 || g.first === 1);
    const s1 = wl(R.filter(x=>x.g.first === 0 || x.g.first === 1).filter(x=>x.first)), s2 = wl(R.filter(x=>x.g.first === 0 || x.g.first === 1).filter(x=>!x.first));
    const mk = R.filter(x=>x.mull != null), m0 = wl(mk.filter(x=>x.mull === 0)), m1 = wl(mk.filter(x=>x.mull > 0));
    const mAvg = avg(mk.filter(x=>x.mull > 0).map(x=>x.mull));
    const rpM = G.filter(g=>g.rp && (g.winner === 0 || g.winner === 1)).map(g=>(g.rp[g.winner] | 0) - (g.rp[1 - g.winner] | 0));
    const to = G.filter(g=>(g.to[0] | 0) + (g.to[1] | 0) > 0).length;
    const undo = G.filter(g=>g.undo).length;
    const row = (l, s) => `<tr><td>${l}</td><td class="sm-n">${s.n}</td><td class="sm-n">${s.w}-${s.l}</td><td class="sm-n">${fmtPct(s.wr)}${star(s.w + s.l)}</td></tr>`;
    return box('First player & mulligan', `${fp.length} match(es) with a recorded first player`,
      `<div class="sm-scroll"><table class="sm-tbl"><tr><th></th><th class="sm-n">Decks</th><th class="sm-n">W-L</th><th class="sm-n">Win rate</th></tr>${row('Going first', s1)}${row('Going second', s2)}${row('Kept the starting hand', m0)}${row('Mulliganed (avg ' + r1(mAvg) + ' card(s))', m1)}</table></div>
      <p class="sm-note">Mulligan rate: ${fmtPct(pct(mk.filter(x=>x.mull > 0).length, mk.length))} of ${mk.length} decks. Winner's Rush Point lead: ${r1(avg(rpM))} on average. Matches with at least one timeout: ${fmtPct(pct(to, G.length))}. Matches where undo was used: ${fmtPct(pct(undo, G.length))}.</p>`);
  }
  function secModes(G){
    const R = deckRows(G);
    const by = (fn, lab) => { const m = {}; G.forEach(g=>{ const k = fn(g); (m[k] || (m[k] = [])).push(g); }); return Object.entries(m).sort((a, b)=>b[1].length - a[1].length).map(([k, gs])=>{
      const durs = gs.map(g=>g.dur).filter(v=>v != null), fp = gs.filter(g=>g.first === 0 || g.first === 1);
      const fw = fp.filter(g=>g.winner === g.first).length, fl = fp.filter(g=>g.winner === 1 - g.first).length;
      return `<tr><td>${E(lab(k))}</td><td class="sm-n">${gs.length}</td><td class="sm-n">${durs.length ? r1(avg(durs)) : '—'}</td><td class="sm-n">${r1(avg(gs.map(g=>g.turns)))}</td><td class="sm-n">${fmtPct(wrOf(fw, fl))}</td><td class="sm-n">${fmtPct(pct(gs.filter(g=>g.end === 'conceded' || g.end === 'claim').length, gs.length))}</td></tr>`; }).join(''); };
    const head = '<tr><th></th><th class="sm-n">Matches</th><th class="sm-n">Avg min</th><th class="sm-n">Avg turns</th><th class="sm-n">1st-player WR</th><th class="sm-n">Left / conceded</th></tr>';
    const eng = {}; G.forEach(g=>{ eng[g.engine || '?'] = (eng[g.engine || '?'] || 0) + 1; });
    return box('By mode & clock', '', `<div class="sm-scroll"><table class="sm-tbl">${head}${by(g=>g.mode, k=>MODE[k] || k)}<tr><td colspan="6" style="color:var(--muted);padding-top:10px">Clock</td></tr>${by(g=>g.clock || '?', k=>CLOCK[k] || k)}</table></div>
      <p class="sm-note">Engine versions: ${Object.entries(eng).sort((a, b)=>b[1] - a[1]).map(([k, v])=>E(k) + ' (' + v + ')').join(', ')}.</p>`);
  }
  function secCards(R){
    const withList = R.filter(x=>x.list), N = withList.length;
    if(!N) return '<p class="ct-mut">No deck lists in the logs.</p>';
    const C = {};
    withList.forEach(x=>{
      const cnt = {}; x.list.forEach(no=>{ cnt[no] = (cnt[no] || 0) + 1; });
      Object.entries(cnt).forEach(([no, k])=>{
        const m = C[no] || (C[no] = { no, decks:0, copies:0, w:0, l:0, call:0, acti:0, atk:0, actGames:0 });
        m.decks++; m.copies += k; if(x.r === 'w') m.w++; else if(x.r === 'l') m.l++;
        if(x.acts){ m.actGames++; const a = x.acts[no]; if(a){ m.call += a.call; m.acti += a.acti; m.atk += a.atk; } }
      });
    });
    const base = wl(withList).wr;
    let list = Object.values(C).filter(m=>m.decks >= F.minCard);
    const sorters = { deck:(a, b)=>b.decks - a.decks, wr:(a, b)=>(wrOf(b.w, b.l) || 0) - (wrOf(a.w, a.l) || 0), call:(a, b)=>b.call / Math.max(1, b.actGames) - a.call / Math.max(1, a.actGames), acti:(a, b)=>b.acti / Math.max(1, b.actGames) - a.acti / Math.max(1, a.actGames) };
    list.sort(sorters[F.cardSort] || sorters.deck);
    const nm = no => { const c = card(no); return c ? (c.nm_en || c.nm || no).replace(/^「[^」]*」\s*/, '') : no; };
    const title = no => { const c = card(no); return c ? (c.nm_en || c.nm) : no; };
    const rows = list.slice(0, 60).map(m=>{
      const wr = wrOf(m.w, m.l), c = card(m.no), d = wr == null ? 0 : wr - base;
      return `<tr><td><span class="sm-card" title="${E(title(m.no))}"><img loading="lazy" src="images/${E(m.no)}.jpg" alt="">${dots(c && COL[c.c] ? c.c : '?')}${E(m.no)} · ${E(nm(m.no))}</span></td>
        <td class="sm-n">${fmtPct(pct(m.decks, N))}</td><td class="sm-n">${r1(m.copies / m.decks)}</td><td class="sm-n">${m.w}-${m.l}</td>
        <td class="sm-n" style="color:${wr == null ? 'inherit' : d >= 3 ? '#7FB8FF' : d <= -3 ? '#FF9A8A' : 'inherit'}">${fmtPct(wr)}</td>
        <td class="sm-n">${m.actGames ? r1(m.call / m.actGames) : '—'}</td><td class="sm-n">${m.actGames ? r1(m.acti / m.actGames) : '—'}</td><td class="sm-n">${m.actGames ? r1(m.atk / m.actGames) : '—'}</td></tr>`;
    }).join('');
    const ctl = `<div class="sm-filt" style="margin:0 0 8px">
      <label class="ct-mut">Sort <select data-smf="cardSort">${[['deck','Most played'],['wr','Highest win rate'],['call','Most called per game'],['acti','Most activated per game']].map(([v, l])=>`<option value="${v}"${F.cardSort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="ct-mut">Min. decks <input data-smf="minCard" type="number" min="1" max="500" value="${F.minCard}" style="width:70px"></label>
      <span class="ct-mut">${list.length} card(s) · ${N} decks · average deck win rate ${fmtPct(base)}</span></div>`;
    return box('Cards', 'Play rate = % of decks with the card · Copies = average copies in those decks · Win rate = decks with the card (blue/red = 3+ points above/below average) · Called / Activated / Attacks = per game in which the deck had the card',
      ctl + `<div class="sm-scroll"><table class="sm-tbl"><tr><th>Card</th><th class="sm-n">Play rate</th><th class="sm-n">Copies</th><th class="sm-n">W-L</th><th class="sm-n">Win rate</th><th class="sm-n">Called</th><th class="sm-n">Activated</th><th class="sm-n">Attacks</th></tr>${rows}</table></div>` +
      (list.length > 60 ? '<p class="sm-note">Showing the top 60. Use the CSV for the full data.</p>' : ''));
  }
  /* v7.61 (permintaan pemilik): kartu yang paling sering DISIMPAN saat mulligan, terpisah untuk pemain yang jalan pertama (1st turn)
     dan kedua (2nd turn). Dasar: tangan awal 6 kartu; "disimpan" = tidak dikembalikan saat mulligan (termasuk tidak mulligan). */
  function secMulligan(G){
    const nm = no => { const c = card(no); return c ? (c.nm_en || c.nm || no).replace(/^「[^」]*」\s*/, '') : no; };
    const title = no => { const c = card(no); return c ? (c.nm_en || c.nm) : no; };
    const side = first => {
      const M = {}; let hands = 0, mulls = 0;
      G.forEach(g=>{ if(g.first !== 0 && g.first !== 1) return; const p = first ? g.first : 1 - g.first, k = g.keep[p]; if(!k) return;
        hands++; if(k.back.length) mulls++;
        k.kept.forEach(no=>{ const m = M[no] || (M[no] = { no, n:0, kept:0 }); m.n++; m.kept++; });
        k.back.forEach(no=>{ const m = M[no] || (M[no] = { no, n:0, kept:0 }); m.n++; }); });
      const list = Object.values(M).filter(m=>m.n >= F.minMull);
      const top = list.slice().sort((a, b)=>b.kept / b.n - a.kept / a.n || b.n - a.n).slice(0, 15);
      const low = list.slice().sort((a, b)=>a.kept / a.n - b.kept / b.n || b.n - a.n).slice(0, 8);
      const row = m => { const c = card(m.no); return `<tr><td><span class="sm-card" title="${E(title(m.no))}"><img loading="lazy" src="images/${E(m.no)}.jpg" alt="">${dots(c && COL[c.c] ? c.c : '?')}${E(m.no)} · ${E(nm(m.no))}</span></td><td class="sm-n">${m.n}</td><td class="sm-n">${m.kept}</td><td class="sm-n">${fmtPct(pct(m.kept, m.n))}</td></tr>`; };
      const head = '<tr><th>Card</th><th class="sm-n">In opening hand</th><th class="sm-n">Kept</th><th class="sm-n">Keep rate</th></tr>';
      return box(first ? 'Mulligan — going first (1st turn)' : 'Mulligan — going second (2nd turn)',
        `${hands} opening hand(s) · ${fmtPct(pct(mulls, hands))} mulliganed`,
        list.length ? `<div class="sm-scroll"><table class="sm-tbl">${head}${top.map(row).join('')}</table></div>
          <p class="sm-note" style="margin:10px 0 4px"><b>Most often sent back</b></p><div class="sm-scroll"><table class="sm-tbl">${head}${low.map(row).join('')}</table></div>`
          : '<p class="ct-mut">Not enough data (min. ' + F.minMull + ' opening hands per card).</p>');
    };
    return '<div class="sm-filt" style="margin:14px 0 8px"><b style="font-size:14px">Mulligan: cards players keep</b><label class="ct-mut">Min. opening hands per card <input data-smf="minMull" type="number" min="1" max="500" value="' + F.minMull + '" style="width:70px"></label></div>' +
      '<div class="sm-grid">' + side(true) + side(false) + '</div>' +
      '<p class="sm-note">Opening hand = the 6 cards drawn at the start. Kept = not sent back in the mulligan (a player who keeps the whole hand keeps all 6). Keep rate = kept ÷ times the card was in an opening hand.</p>';
  }
  function secPlayers(G){
    const P = {};
    G.forEach(g=>[0, 1].forEach(p=>{ const id = g.pid[p] || g.names[p]; if(!id) return; const m = P[id] || (P[id] = { name:g.names[p], n:0, w:0, l:0, last:0, cols:{} }); m.n++; const r = res(g, p); if(r === 'w') m.w++; else if(r === 'l') m.l++; if(g.t > m.last){ m.last = g.t; m.name = g.names[p] || m.name; } const k = pairKey(g.cols[p]); m.cols[k] = (m.cols[k] || 0) + 1; }));
    const list = Object.values(P).sort((a, b)=>b.n - a.n).slice(0, 20);
    const rows = list.map(m=>{ const top = Object.entries(m.cols).sort((a, b)=>b[1] - a[1])[0]; return `<tr><td>${E(m.name || '?')}</td><td class="sm-n">${m.n}</td><td class="sm-n">${m.w}-${m.l}</td><td class="sm-n">${fmtPct(wrOf(m.w, m.l))}</td><td>${top ? dots(top[0]) + E(pairLabel(top[0])) : ''}</td><td class="sm-n">${new Date(m.last).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</td></tr>`; }).join('');
    return box('Most active players', `${Object.keys(P).length} player(s) in this period · top 20 (admin only)`, `<div class="sm-scroll"><table class="sm-tbl"><tr><th>Player</th><th class="sm-n">Matches</th><th class="sm-n">W-L</th><th class="sm-n">Win rate</th><th>Main colours</th><th class="sm-n">Last match</th></tr>${rows}</table></div>`);
  }

  /* ---------------- CSV ---------------- */
  function csv(){
    const G = filtered();
    const head = ['match_id','ended_at','mode','clock','engine','room','player_1','player_2','deck_1_colours','deck_2_colours','first_seat','winner_seat','end','turns','minutes','rp_1','rp_2','timeouts_1','timeouts_2','mulligan_1','mulligan_2','undo_used'];
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [head.join(',')].concat(G.map(g=>[g.id, new Date(g.t).toISOString(), g.mode, g.clock, g.engine, g.room, g.names[0], g.names[1], pairLabel(pairKey(g.cols[0])), pairLabel(pairKey(g.cols[1])),
      g.first == null ? '' : g.first + 1, g.winner === 0 || g.winner === 1 ? g.winner + 1 : 'draw', g.end, g.turns, g.dur == null ? '' : Math.round(g.dur * 10) / 10,
      g.rp ? g.rp[0] : '', g.rp ? g.rp[1] : '', g.to[0] | 0, g.to[1] | 0, g.mull[0] == null ? '' : g.mull[0], g.mull[1] == null ? '' : g.mull[1], g.undo ? 1 : 0].map(cell).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'battle-sim-matches-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------------- interaksi ---------------- */
  let host = null;
  document.addEventListener('change', e=>{
    const t = e.target.closest && e.target.closest('[data-smf]'); if(!t || !host) return;
    const k = t.dataset.smf; F[k] = k === 'minCard' || k === 'minMull' ? Math.max(1, +t.value || 1) : t.value; saveF(); draw(host);
  });
  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-sm]'); if(!t || !host) return;
    if(t.dataset.sm === 'reload'){ host.innerHTML = '<p class="ct-mut">Loading all Battle Sim matches…</p>'; load(true).then(()=>draw(host)); }
    else if(t.dataset.sm === 'csv') csv();
  });

  window.MHRSimMeta = { render(el){ host = el; return render(el); } };
})();
