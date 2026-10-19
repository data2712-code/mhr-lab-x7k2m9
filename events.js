/* ===================================================================
   MHR DECK LAB — events.js (v6.98, Tahap 3: turnamen LGS)
   ===================================================================
   Dua bagian, keduanya TANPA DOM:
     window.MHRSwiss  — mesin Swiss + Top cut (fungsi murni: klasemen,
                        tiebreaker, pairing, bracket, peringkat akhir).
                        Juga bisa di-require di Node untuk unit test.
     window.MHREvents — servis Supabase (tabel events, event_players,
                        event_decklists, event_matches, organizers + RPC
                        mhr_register_for_event dst.). Koneksi dipinjam dari
                        auth.js (window.MHRAuth.client), sama seperti decks.js.
   Skema & RLS: mhr_decklab_v698_events.sql (folder internal).

   ATURAN SKOR (umum dipakai TCG, dicatat juga di halaman event):
     menang 3 poin · seri 1 · kalah 0 · bye = menang (2-0 di Bo3, 1-0 di Bo1)
     double loss = 0 poin untuk keduanya
   TIEBREAKER berurutan: Match points → OMW% → GW% → OGW%
     MW% = poin / (3 × ronde dimainkan), minimum 33%
     GW% = poin game / (3 × game dimainkan), minimum 33%
     OMW% / OGW% = rata-rata MW% / GW% lawan (bye tidak dihitung sebagai lawan)
   PAIRING Swiss: ronde 1 acak; ronde berikutnya urut klasemen, pasangan
     dicari dari atas ke bawah tanpa rematch (backtracking; rematch hanya
     kalau benar-benar tidak ada pilihan lain). Jumlah pemain ganjil → bye
     ke peringkat terbawah yang belum pernah dapat bye. Pemain drop tidak
     dipasangkan lagi tapi tetap ada di klasemen.
   TOP CUT: N teratas klasemen Swiss (pemain drop dilewati), bracket
     1v8 4v5 2v7 3v6 (Top 8), 1v4 2v3 (Top 4), 1v2 (Top 2); pemenang meja
     berurutan bertemu di ronde berikutnya. Di Top cut tidak ada seri.
   =================================================================== */
(function(root){
  'use strict';
  const FLOOR = 1/3;

  function isFinal(m){ return !!m.result; }

  function gamesOf(m, bestOf){
    /* skor game per match; Bo1 tanpa skor game diisi otomatis */
    let g1 = m.p1_games|0, g2 = m.p2_games|0, gd = 0;
    if(m.result === 'bye'){ return { g1: bestOf === 3 ? 2 : 1, g2: 0, gd: 0 }; }
    if(m.result === 'dl'){ return { g1: 0, g2: 0, gd: 0, dl: true }; }
    if(!g1 && !g2){
      if(m.result === 'p1') g1 = bestOf === 3 ? 2 : 1;
      else if(m.result === 'p2') g2 = bestOf === 3 ? 2 : 1;
      else if(m.result === 'draw') gd = 1;
    } else if(m.result === 'draw' && g1 === g2){ /* 1-1 seri */ }
    return { g1, g2, gd };
  }

  function standings(players, matches, opt){
    const bestOf = (opt && opt.bestOf) || 1;
    const S = new Map();
    players.forEach(p=>S.set(p.id, { id:p.id, name:p.display_name || p.name || '', dropped:!!p.dropped,
      mp:0, w:0, l:0, d:0, byes:0, rounds:0, gp:0, gplayed:0, opps:[] }));
    matches.filter(m=>m.stage !== 'top' && isFinal(m)).forEach(m=>{
      const a = S.get(m.player1), b = m.player2 ? S.get(m.player2) : null;
      if(!a) return;
      const g = gamesOf(m, bestOf);
      if(m.result === 'bye' || !b){
        a.mp += 3; a.w++; a.byes++; a.rounds++;
        a.gp += 3*g.g1; a.gplayed += g.g1;
        return;
      }
      a.rounds++; b.rounds++;
      a.opps.push(b.id); b.opps.push(a.id);
      if(m.result === 'p1'){ a.mp += 3; a.w++; b.l++; }
      else if(m.result === 'p2'){ b.mp += 3; b.w++; a.l++; }
      else if(m.result === 'draw'){ a.mp += 1; b.mp += 1; a.d++; b.d++; }
      else if(m.result === 'dl'){ a.l++; b.l++; }
      const games = g.g1 + g.g2 + g.gd;
      a.gp += 3*g.g1 + g.gd; b.gp += 3*g.g2 + g.gd;
      const played = g.dl ? 1 : games;
      a.gplayed += played; b.gplayed += played;
    });
    const mw = s => s.rounds ? Math.max(FLOOR, s.mp / (3*s.rounds)) : FLOOR;
    const gw = s => s.gplayed ? Math.max(FLOOR, s.gp / (3*s.gplayed)) : FLOOR;
    const list = [...S.values()];
    list.forEach(s=>{ s.mw = mw(s); s.gw = gw(s); });
    list.forEach(s=>{
      const o = s.opps.map(id=>S.get(id)).filter(Boolean);
      s.omw = o.length ? o.reduce((t,x)=>t + x.mw, 0)/o.length : 0;
      s.ogw = o.length ? o.reduce((t,x)=>t + x.gw, 0)/o.length : 0;
    });
    list.sort((x,y)=> y.mp - x.mp || y.omw - x.omw || y.gw - x.gw || y.ogw - x.ogw ||
      String(x.name).localeCompare(String(y.name)));
    list.forEach((s,i)=>{ s.rank = i+1; });
    return list;
  }

  function recommendedRounds(n){
    if(n <= 1) return 0;
    return Math.max(1, Math.ceil(Math.log2(n)));
  }

  /* acak deterministik (mulberry32) supaya bisa diuji; tanpa seed = Math.random */
  function rng(seed){
    if(seed == null) return Math.random;
    let a = seed >>> 0;
    return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand){
    const a = arr.slice();
    for(let i=a.length-1; i>0; i--){ const j = Math.floor(rand()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
    return a;
  }

  function pairSwiss(players, matches, round, opt){
    opt = opt || {};
    const swiss = matches.filter(m=>m.stage !== 'top');
    const active = players.filter(p=>!p.dropped);
    const met = new Set();
    swiss.forEach(m=>{ if(m.player2){ met.add(m.player1+'|'+m.player2); met.add(m.player2+'|'+m.player1); } });
    const hadBye = new Set(swiss.filter(m=>m.result === 'bye' || !m.player2).map(m=>m.player1));
    let order;
    if(round <= 1 || !swiss.length) order = shuffle(active.map(p=>p.id), rng(opt.seed));
    else {
      const st = standings(players, matches, opt).filter(s=>!s.dropped).map(s=>s.id);
      order = st;
    }
    let bye = null;
    if(order.length % 2 === 1){
      for(let i=order.length-1; i>=0; i--){ if(!hadBye.has(order[i])){ bye = order[i]; break; } }
      if(bye == null) bye = order[order.length-1];
      order = order.filter(id=>id !== bye);
    }
    function solve(list, allowRematch){
      if(!list.length) return [];
      const [p, ...rest] = list;
      for(let i=0; i<rest.length; i++){
        const q = rest[i];
        if(!allowRematch && met.has(p+'|'+q)) continue;
        const sub = solve(rest.filter((_,j)=>j!==i), allowRematch);
        if(sub) return [[p,q], ...sub];
      }
      return null;
    }
    let pairs = order.length <= 40 ? solve(order, false) : null;
    if(!pairs){
      /* fallback (rematch tak terhindarkan / pemain sangat banyak): greedy */
      pairs = []; const left = order.slice();
      while(left.length){
        const p = left.shift();
        let k = left.findIndex(q=>!met.has(p+'|'+q)); if(k < 0) k = 0;
        pairs.push([p, left.splice(k,1)[0]]);
      }
    }
    const out = pairs.map(([a,b],i)=>({ round, stage:'swiss', table_no:i+1, player1:a, player2:b, result:null }));
    if(bye != null) out.push({ round, stage:'swiss', table_no:out.length+1, player1:bye, player2:null, result:'bye' });
    return out;
  }

  /* v7.00 — Top 16 ditambahkan. Urutan meja dibuat supaya pemenang meja 1+2, 3+4, … langsung
     bertemu di ronde berikutnya (pairTopNext) dan hasilnya sama dengan bracket Top 8: 1v8 4v5 2v7 3v6. */
  const BRACKET = { 2:[[1,2]], 4:[[1,4],[2,3]], 8:[[1,8],[4,5],[2,7],[3,6]],
    16:[[1,16],[8,9],[4,13],[5,12],[2,15],[7,10],[3,14],[6,11]] };
  function topSeeds(players, matches, n, opt){
    return standings(players, matches, opt).filter(s=>!s.dropped).slice(0, n).map(s=>s.id);
  }
  function pairTopFirst(players, matches, n, round, opt){
    const seeds = topSeeds(players, matches, n, opt);
    if(seeds.length < n) return null;
    return BRACKET[n].map(([x,y],i)=>({ round, stage:'top', table_no:i+1, player1:seeds[x-1], player2:seeds[y-1], result:null }));
  }
  function winnerOf(m){ return m.result === 'p1' ? m.player1 : m.result === 'p2' ? m.player2 : null; }
  function loserOf(m){ return m.result === 'p1' ? m.player2 : m.result === 'p2' ? m.player1 : null; }
  function topRounds(matches){
    const rs = [...new Set(matches.filter(m=>m.stage === 'top').map(m=>m.round))].sort((a,b)=>a-b);
    return rs.map(r=>matches.filter(m=>m.stage === 'top' && m.round === r).sort((a,b)=>a.table_no-b.table_no));
  }
  function pairTopNext(matches, round){
    const rs = topRounds(matches); const last = rs[rs.length-1];
    if(!last || last.length < 2) return null;
    if(last.some(m=>!winnerOf(m))) return null;
    const out = [];
    for(let i=0; i<last.length; i+=2)
      out.push({ round, stage:'top', table_no:i/2+1, player1:winnerOf(last[i]), player2:winnerOf(last[i+1]), result:null });
    return out;
  }
  function topComplete(matches){
    const rs = topRounds(matches); const last = rs[rs.length-1];
    return !!(last && last.length === 1 && winnerOf(last[0]));
  }

  /* peringkat akhir: [{id, place, label}] */
  function finalPlacements(players, matches, opt){
    const st = standings(players, matches, opt);
    const rs = topRounds(matches);
    const placed = new Map();
    if(rs.length && topComplete(matches)){
      const fin = rs[rs.length-1][0];
      placed.set(winnerOf(fin), { place:1, label:'1st' });
      placed.set(loserOf(fin), { place:2, label:'2nd' });
      let place = 3;
      for(let k = rs.length-2; k >= 0; k--){
        const size = rs[k].length * 2;
        const losers = rs[k].map(loserOf).filter(Boolean)
          .sort((a,b)=>st.findIndex(s=>s.id===a) - st.findIndex(s=>s.id===b));
        losers.forEach(id=>placed.set(id, { place, label:'Top ' + size }));
        place += losers.length;
      }
    }
    const out = []; let next = placed.size + 1;
    [...placed.entries()].sort((a,b)=>a[1].place-b[1].place).forEach(([id,v])=>out.push({ id, ...v }));
    st.forEach(s=>{ if(!placed.has(s.id)){ const n = next++; out.push({ id:s.id, place:n, label:ordinal(n) }); } });
    return out;
  }
  function ordinal(n){ const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); }

  const MHRSwiss = { standings, recommendedRounds, pairSwiss, pairTopFirst, pairTopNext, topComplete, topRounds,
    finalPlacements, winnerOf, loserOf, ordinal, BRACKET };
  root.MHRSwiss = MHRSwiss;
  if(typeof module !== 'undefined' && module.exports) module.exports = MHRSwiss;
})(typeof window !== 'undefined' ? window : globalThis);

/* =========================== servis Supabase =========================== */
(function(){
  if(typeof window === 'undefined') return;
  function client(){ return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null; }
  async function uid(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const s = await window.MHRAuth.getSession(); return s && s.user ? s.user.id : null;
  }
  const off = { message:'offline' };
  const GUEST_KEY = 'mhr_event_guest';
  const EV_COLS = 'id,organizer_id,name,event_date,start_time,location,lgs_name,notes,best_of,rounds,top_cut,max_players,allow_guests,decklist_mode,status,phase,current_round,tournament_id,created_at,updated_at';
  /* error tabel belum ada (migrasi v6.98 belum dijalankan) */
  const miss = e => e ? (/PGRST205|42P01|PGRST202|42883/.test(`${e.code||''} ${e.message||''}`) ? {...e, missing:true} : e) : null;
  /* pesan dari RAISE EXCEPTION di RPC (mis. EVENT_FULL) */
  const rpcErr = e => { if(!e) return null; const m = /([A-Z_]{5,})/.exec(e.message||''); return {...miss(e), code: m ? m[1] : (e.code||'ERROR')}; };

  window.MHREvents = {
    get ready(){ return !!client(); },
    async me(){ return uid(); },
    async isOrganizer(){
      const c = client(); const u = await uid(); if(!c || !u) return false;
      const { data } = await c.from('organizers').select('user_id').eq('user_id', u).maybeSingle();
      return !!data;
    },
    async list({limit=60}={}){
      const c = client(); if(!c) return { data:[], error:off };
      const { data, error } = await c.from('events').select(EV_COLS).order('event_date', {ascending:false}).limit(limit);
      if(error) return { data:[], error:miss(error) };
      /* jumlah peserta per event (satu query) */
      const ids = data.map(e=>e.id);
      if(ids.length){
        const { data: ps } = await c.from('event_players').select('event_id').in('event_id', ids);
        const n = {}; (ps||[]).forEach(p=>{ n[p.event_id] = (n[p.event_id]||0) + 1; });
        data.forEach(e=>{ e.player_count = n[e.id] || 0; });
      }
      return { data, error:null };
    },
    async get(id){
      const c = client(); if(!c) return { data:null, error:off };
      const [ev, ps, ms] = await Promise.all([
        c.from('events').select(EV_COLS).eq('id', id).maybeSingle(),
        c.from('event_players').select('id,event_id,user_id,is_guest,display_name,deck_name,dropped,dropped_after,created_at').eq('event_id', id).order('created_at'),
        c.from('event_matches').select('id,event_id,round,stage,table_no,player1,player2,result,p1_games,p2_games').eq('event_id', id).order('round').order('table_no'),
      ]);
      const error = ev.error || ps.error || ms.error;
      if(error) return { data:null, error:miss(error) };
      if(!ev.data) return { data:null, error:null };
      return { data:{ event:ev.data, players:ps.data||[], matches:ms.data||[] }, error:null };
    },
    /* decklist: organizer = semua; pemain = miliknya sendiri (dibatasi RLS) */
    async decklists(eventId){
      const c = client(); if(!c) return { data:[], error:off };
      const { data, error } = await c.from('event_decklists').select('player_id,deck_code').eq('event_id', eventId);
      return { data:data||[], error:miss(error) };
    },
    async saveEvent(row){
      const c = client(); if(!c) return { data:null, error:off };
      const keys = ['name','event_date','start_time','location','lgs_name','notes','best_of','rounds','top_cut','max_players','allow_guests','decklist_mode','status','phase','current_round'];
      const clean = {}; keys.forEach(k=>{ if(k in row) clean[k] = row[k]; });
      const q = row.id ? c.from('events').update(clean).eq('id', row.id) : c.from('events').insert(clean);
      const { data, error } = await q.select(EV_COLS).single();
      return { data, error:miss(error) };
    },
    async removeEvent(id){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('events').delete().eq('id', id); return { error:miss(error) };
    },
    async addWalkIn(eventId, name, deckName, deckCode){
      const c = client(); if(!c) return { data:null, error:off };
      const { data, error } = await c.from('event_players').insert({ event_id:eventId, display_name:name, deck_name:deckName||'' }).select('id').single();
      if(error) return { data:null, error:miss(error) };
      if(!deckCode) return { data, error:null };          /* v7.01 — decklist opsional / tidak dipakai */
      const r2 = await c.from('event_decklists').insert({ player_id:data.id, event_id:eventId, deck_code:deckCode });
      if(r2.error){ await c.from('event_players').delete().eq('id', data.id); return { data:null, error:miss(r2.error) }; }
      return { data, error:null };
    },
    async updatePlayer(id, patch){
      const c = client(); if(!c) return { error:off };
      const clean = {}; ['display_name','deck_name','dropped','dropped_after'].forEach(k=>{ if(k in patch) clean[k] = patch[k]; });
      const { error } = await c.from('event_players').update(clean).eq('id', id); return { error:miss(error) };
    },
    async setDecklist(eventId, playerId, deckCode){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('event_decklists').upsert({ player_id:playerId, event_id:eventId, deck_code:deckCode, updated_at:new Date().toISOString() }, { onConflict:'player_id' });
      return { error:miss(error) };
    },
    async removeDecklist(playerId){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('event_decklists').delete().eq('player_id', playerId); return { error:miss(error) };
    },
    async removePlayer(id){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('event_players').delete().eq('id', id); return { error:miss(error) };
    },
    async insertMatches(eventId, rows){
      const c = client(); if(!c) return { data:null, error:off };
      const { data, error } = await c.from('event_matches').insert(rows.map(r=>({ ...r, event_id:eventId }))).select('id,event_id,round,stage,table_no,player1,player2,result,p1_games,p2_games');
      return { data, error:miss(error) };
    },
    async setResult(id, result, g1, g2){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('event_matches').update({ result, p1_games:g1|0, p2_games:g2|0 }).eq('id', id);
      return { error:miss(error) };
    },
    async deleteRound(eventId, round){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('event_matches').delete().eq('event_id', eventId).eq('round', round);
      return { error:miss(error) };
    },
    async register(eventId, name, deckName, deckCode){
      const c = client(); if(!c) return { error:off };
      const { data, error } = await c.rpc('mhr_register_for_event', { p_event:eventId, p_name:name, p_deck_name:deckName||'', p_deck_code:deckCode });
      return { data, error:rpcErr(error) };
    },
    async updateRegistration(eventId, name, deckName, deckCode){
      const c = client(); if(!c) return { error:off };
      const { data, error } = await c.rpc('mhr_update_registration', { p_event:eventId, p_name:name, p_deck_name:deckName||'', p_deck_code:deckCode });
      return { data, error:rpcErr(error) };
    },
    async withdraw(eventId){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.rpc('mhr_withdraw_from_event', { p_event:eventId });
      return { error:rpcErr(error) };
    },
    /* ---- v7.01 — pendaftaran tamu (tanpa akun) ----
       Kode rahasia tamu hanya disimpan di browser tamu (localStorage), per event.
       Server hanya menyimpan hash-nya (tabel event_guest_tokens). */
    guestOf(eventId){
      try{ const m = JSON.parse(localStorage.getItem(GUEST_KEY) || '{}'); return m[eventId] || null; }catch(e){ return null; }
    },
    _setGuest(eventId, v){
      try{
        const m = JSON.parse(localStorage.getItem(GUEST_KEY) || '{}');
        if(v) m[eventId] = v; else delete m[eventId];
        localStorage.setItem(GUEST_KEY, JSON.stringify(m));
      }catch(e){}
    },
    /* lupakan pendaftaran tamu di browser ini (pemainnya tetap terdaftar) — mis. tablet toko dipakai bergantian */
    forgetGuest(eventId){ this._setGuest(eventId, null); },
    async registerGuest(eventId, name, deckCode){
      const c = client(); if(!c) return { error:off };
      const { data, error } = await c.rpc('mhr_register_guest', { p_event:eventId, p_name:name, p_deck_code:deckCode||'' });
      if(error) return { data:null, error:rpcErr(error) };
      this._setGuest(eventId, { pid:data.player_id, token:data.token });
      return { data, error:null };
    },
    /* data tamu milik browser ini untuk event tsb. (null kalau tidak ada / kode tidak berlaku lagi) */
    async guestGet(eventId){
      const g = this.guestOf(eventId); const c = client(); if(!g || !c) return { data:null, error:null };
      const { data, error } = await c.rpc('mhr_guest_get', { p_player:g.pid, p_token:g.token });
      if(error){ const e = rpcErr(error); if(e.code === 'BAD_TOKEN') this._setGuest(eventId, null); return { data:null, error:e.code === 'BAD_TOKEN' ? null : e }; }
      return { data:{ ...data, token:g.token }, error:null };
    },
    async guestUpdate(eventId, name, deckCode){
      const g = this.guestOf(eventId); const c = client(); if(!c) return { error:off };
      if(!g) return { error:{ code:'NOT_REGISTERED', message:'NOT_REGISTERED' } };
      const { error } = await c.rpc('mhr_guest_update', { p_player:g.pid, p_token:g.token, p_name:name, p_deck_code:deckCode||'' });
      return { error:rpcErr(error) };
    },
    async guestWithdraw(eventId){
      const g = this.guestOf(eventId); const c = client(); if(!c) return { error:off };
      if(!g) return { error:null };
      const { error } = await c.rpc('mhr_guest_withdraw', { p_player:g.pid, p_token:g.token });
      if(!error) this._setGuest(eventId, null);
      return { error:rpcErr(error) };
    },
    async publish(eventId, top){
      const c = client(); if(!c) return { error:off };
      const { data, error } = await c.rpc('mhr_publish_event', { p_event:eventId, p_top:top });
      return { data, error:rpcErr(error) };
    },
    /* admin: daftar & kelola organizer */
    async listOrganizers(){
      const c = client(); if(!c) return { data:[], error:off };
      const { data, error } = await c.from('organizers').select('user_id,lgs_name,created_at').order('created_at');
      if(error) return { data:[], error:miss(error) };
      const ids = data.map(o=>o.user_id);
      if(ids.length){
        const { data: pr } = await c.from('profiles').select('id,username').in('id', ids);
        data.forEach(o=>{ const p = (pr||[]).find(x=>x.id===o.user_id); o.username = p ? p.username : '?'; });
      }
      return { data, error:null };
    },
    async addOrganizer(username, lgsName){
      const c = client(); if(!c) return { error:off };
      const { data: pr, error: e1 } = await c.from('profiles').select('id,username').ilike('username', username.trim()).maybeSingle();
      if(e1) return { error:miss(e1) };
      if(!pr) return { error:{ code:'USER_NOT_FOUND', message:'USER_NOT_FOUND' } };
      const { error } = await c.from('organizers').upsert({ user_id:pr.id, lgs_name:lgsName||'' }, { onConflict:'user_id' });
      return { error:miss(error) };
    },
    async removeOrganizer(userId){
      const c = client(); if(!c) return { error:off };
      const { error } = await c.from('organizers').delete().eq('user_id', userId); return { error:miss(error) };
    },
    async usernames(ids){
      const c = client(); if(!c || !ids.length) return {};
      const { data } = await c.from('profiles').select('id,username').in('id', ids);
      const m = {}; (data||[]).forEach(p=>{ m[p.id] = p.username; }); return m;
    },
  };
})();
