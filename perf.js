/* ===================================================================
   MHR DECK LAB — perf.js (v7.13, Performance Analytics Tahap 1)
   ===================================================================
   Servis Supabase TANPA DOM (pola sama dengan decks.js / binders.js).
   Koneksi dipinjam dari auth.js (window.MHRAuth.client).
   Skema & RLS: mhr_decklab_v713_performance.sql (folder internal).

   Tabel:
     • public.match_archetypes — daftar deck lawan (kurasi admin), semua
       orang boleh membaca, hanya admin yang boleh menulis (RLS).
     • public.match_logs — catatan match PRIBADI (hanya pemilik yang bisa
       membaca/menulis). Kolom result dihitung trigger dari games.
   Bentuk games: [{ r:'W'|'L'|'D', f:true (kita jalan duluan), e:'rp'|'eff'|'deck'|'con'|'time' }]
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
  const LOG_COLS = 'id,played_on,context,best_of,deck_id,deck_name,deck_code,opp_archetype,opp_label,opp_colors,opp_name,games,result,notes,created_at,updated_at';
  const LOG_EDIT = ['played_on','context','best_of','deck_id','deck_name','deck_code','opp_archetype','opp_label','opp_colors','opp_name','games','notes'];
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
        const { data, error } = await c.from('match_logs').select(LOG_COLS).eq('owner_id', u)
          .order('played_on', { ascending:false }).order('created_at', { ascending:false }).limit(5000);
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async save(row){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const body = pick(row, LOG_EDIT);
        const q = row.id ? c.from('match_logs').update(body).eq('id', row.id)
                         : c.from('match_logs').insert({ ...body, owner_id:u });
        const { data, error } = await q.select(LOG_COLS).single();
        return { data, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async remove(id){
      const c = client(); if(!c) return { error:off };
      try{ const { error } = await c.from('match_logs').delete().eq('id', id); return { error:miss(error) }; }
      catch(e){ return { error:off }; }
    },
  };
})();
