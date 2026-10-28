/* ===================================================================
   MHR DECK LAB — perf.js (v7.13, Performance Analytics; v7.14 Tahap 2)
   ===================================================================
   Servis Supabase TANPA DOM (pola sama dengan decks.js / binders.js).
   Koneksi dipinjam dari auth.js (window.MHRAuth.client).
   Skema & RLS: mhr_decklab_v713_performance.sql (folder internal).

   Tabel:
     • public.match_archetypes — daftar deck lawan (kurasi admin), semua
       orang boleh membaca, hanya admin yang boleh menulis (RLS).
     • public.match_logs — catatan match PRIBADI (hanya pemilik yang bisa
       membaca/menulis). Kolom result dihitung trigger dari games.
   Bentuk games: [{ r:'W'|'L'|'D', f:true (kita jalan duluan) | false | null (tidak diketahui, v7.14),
                    e:'rp'|'eff'|'deck'|'con'|'time'|'unk' (v7.14: tidak dicatat) }]
   v7.14 (Tahap 2) — public.match_runs (mhr_decklab_v714_performance_runs.sql): satu run = satu
   turnamen/event; ronde = match_logs dengan run_id + round_no + is_top. Import dari Events:
   myEventEntries() membaca event_players milik akun ini + events-nya (RLS Events sudah
   mengizinkan baca event yang bukan draft); detail ronde lewat window.MHREvents.get().
   v7.15 (Tahap 3) — mhr_decklab_v715_performance_community.sql: perf_settings (opt-in
   share_community), match_logs.my_archetype (jenis deck sendiri, diisi browser), RPC
   mhr_set_my_archetypes (isi catatan lama) & mhr_community_meta (angka gabungan komunitas).
   Kolom yang belum ada (migrasi belum jalan) → otomatis memakai kolom versi sebelumnya.
   =================================================================== */
(function(){
  'use strict';
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  async function uid(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const s = await window.MHRAuth.getSession();
    return (s && s.user) ? s.user.id : null;
  }
  const off = { message:'offline' };
  /* tabel belum ada = migrasi v7.13 belum dijalankan */
  const miss = e => e ? (/PGRST205|42P01|PGRST202|42883/.test(`${e.code||''} ${e.message||''}`) ? {...e, missing:true} : e) : null;
  /* kode dari RAISE EXCEPTION (BAD_GAMES, BAD_DATE) */
  const rpcErr = e => { if(!e) return null; const m = /\b(BAD_[A-Z_]+)\b/.exec(e.message||''); return {...miss(e), code: m ? m[1] : (e.code||'ERROR')}; };
  const LOG_COLS = 'id,played_on,context,best_of,deck_id,deck_name,deck_code,opp_archetype,opp_label,opp_colors,opp_name,games,result,notes,run_id,round_no,is_top,my_archetype,created_at,updated_at';
  const LOG_EDIT = ['played_on','context','best_of','deck_id','deck_name','deck_code','opp_archetype','opp_label','opp_colors','opp_name','games','notes','run_id','round_no','is_top','my_archetype'];
  const LOG_COLS_V14 = LOG_COLS.replace(',my_archetype', '');
  const LOG_COLS_V13 = LOG_COLS_V14.replace(',run_id,round_no,is_top', '');
  const P = () => window.MHRPerf || {};
  const logCols = () => P().runsMissing ? LOG_COLS_V13 : P().myArchMissing ? LOG_COLS_V14 : LOG_COLS;
  const colErr = e => e && /42703|PGRST204|column/.test(`${e.code||''} ${e.message||''}`);
  /* buang kolom yang belum ada di database (migrasi belum dijalankan) */
  const logBody = row => { const b = pick(row, LOG_EDIT); if(P().myArchMissing || P().runsMissing) delete b.my_archetype;
    if(P().runsMissing){ delete b.run_id; delete b.round_no; delete b.is_top; } return b; };
  const RUN_COLS = 'id,name,played_on,context,best_of,deck_id,deck_name,deck_code,players,placement,venue,byes,event_id,notes,created_at,updated_at';
  const RUN_EDIT = ['name','played_on','context','best_of','deck_id','deck_name','deck_code','players','placement','venue','byes','notes'];
  const ARCH_COLS = 'id,name,colors,key_card,aliases,active,sort';
  const ARCH_EDIT = ['name','colors','key_card','aliases','active','sort'];
  const pick = (row, keys) => { const o = {}; keys.forEach(k=>{ if(row[k] !== undefined) o[k] = row[k]; }); return o; };

  window.MHRPerf = {
    get ready(){ return !!client(); },
    async me(){ return uid(); },

    /* ---------- daftar archetype ---------- */
    async archetypes(){
      const c = client(); if(!c) return { data:[], error:off };
      try{
        const { data, error } = await c.from('match_archetypes').select(ARCH_COLS).order('sort', { ascending:true }).order('name', { ascending:true });
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async saveArchetype(row, isNew){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const q = isNew ? c.from('match_archetypes').insert({ id:row.id, ...pick(row, ARCH_EDIT) })
                        : c.from('match_archetypes').update(pick(row, ARCH_EDIT)).eq('id', row.id);
        const { data, error } = await q.select(ARCH_COLS).single();
        return { data, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async removeArchetype(id){
      const c = client(); if(!c) return { error:off };
      try{ const { error } = await c.from('match_archetypes').delete().eq('id', id); return { error:miss(error) }; }
      catch(e){ return { error:off }; }
    },

    /* ---------- catatan match milik akun ini ---------- */
    async listMine(){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:null };
      try{
        const q = cols => c.from('match_logs').select(cols).eq('owner_id', u)
          .order('played_on', { ascending:false }).order('created_at', { ascending:false }).limit(5000);
        let { data, error } = await q(LOG_COLS);
        /* migrasi v7.15 belum dijalankan: my_archetype belum ada → kolom v7.14; v7.14 belum → kolom v7.13 */
        if(colErr(error)){
          ({ data, error } = await q(LOG_COLS_V14));
          if(!error) window.MHRPerf.myArchMissing = true;
          else if(colErr(error)){ ({ data, error } = await q(LOG_COLS_V13)); if(!error){ window.MHRPerf.runsMissing = true; window.MHRPerf.myArchMissing = true; } }
        }
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async save(row){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const body = logBody(row);
        const q = row.id ? c.from('match_logs').update(body).eq('id', row.id)
                         : c.from('match_logs').insert({ ...body, owner_id:u });
        const { data, error } = await q.select(logCols()).single();
        return { data, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async remove(id){
      const c = client(); if(!c) return { error:off };
      try{ const { error } = await c.from('match_logs').delete().eq('id', id); return { error:miss(error) }; }
      catch(e){ return { error:off }; }
    },
    /* banyak ronde sekaligus (import Events) */
    async saveMany(rows){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:{ code:'NOT_LOGGED_IN' } };
      if(!rows.length) return { data:[], error:null };
      try{
        const { data, error } = await c.from('match_logs').insert(rows.map(r=>({ ...logBody(r), owner_id:u }))).select(logCols());
        return { data:data||[], error:rpcErr(error) };
      }catch(e){ return { data:[], error:off }; }
    },

    /* ---------- v7.14 tournament runs ---------- */
    async listRuns(){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:null };
      try{
        const { data, error } = await c.from('match_runs').select(RUN_COLS).eq('owner_id', u)
          .order('played_on', { ascending:false }).order('created_at', { ascending:false }).limit(500);
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async saveRun(row){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const body = pick(row, RUN_EDIT);
        const q = row.id ? c.from('match_runs').update(body).eq('id', row.id)
                         : c.from('match_runs').insert({ ...body, owner_id:u, event_id: row.event_id || null });
        const { data, error } = await q.select(RUN_COLS).single();
        return { data, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async removeRun(id){
      const c = client(); if(!c) return { error:off };
      try{ const { error } = await c.from('match_runs').delete().eq('id', id); return { error:miss(error) }; }
      catch(e){ return { error:off }; }
    },
    /* ---------- v7.15 data komunitas ---------- */
    async settings(){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:null };
      try{
        const { data, error } = await c.from('perf_settings').select('share_community,shared_since').eq('user_id', u).maybeSingle();
        return { data: data || { share_community:false, shared_since:null }, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async setShare(on){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const { data, error } = await c.from('perf_settings').upsert({ user_id:u, share_community:!!on }, { onConflict:'user_id' }).select('share_community,shared_since').single();
        return { data, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async setMyArchetypes(rows){
      const c = client(); if(!c) return { data:0, error:off };
      if(!rows.length) return { data:0, error:null };
      try{
        let n = 0;
        for(let i = 0; i < rows.length; i += 1000){
          const { data, error } = await c.rpc('mhr_set_my_archetypes', { p_rows: rows.slice(i, i + 1000) });
          if(error) return { data:n, error:rpcErr(error) };
          n += data || 0;
        }
        return { data:n, error:null };
      }catch(e){ return { data:0, error:off }; }
    },
    async community(days, scope){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const { data, error } = await c.rpc('mhr_community_meta', { p_days: days, p_scope: scope || 'all' });
        return { data, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },

    /* event yang diikuti akun ini lewat Events (pemain terdaftar dengan akun, bukan tamu) */
    async myEventEntries(){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:null };
      try{
        const { data:ps, error } = await c.from('event_players').select('id,event_id,display_name,deck_name').eq('user_id', u);
        if(error || !ps || !ps.length) return { data:[], error:miss(error) };
        const ids = [...new Set(ps.map(p=>p.event_id))];
        const { data:evs, error:e2 } = await c.from('events').select('id,name,event_date,lgs_name,location,best_of,status,top_cut').in('id', ids);
        if(e2) return { data:[], error:miss(e2) };
        return { data:(evs||[]).map(ev=>({ event:ev, player:ps.find(p=>p.event_id === ev.id) })), error:null };
      }catch(e){ return { data:[], error:off }; }
    },
  };
})();
