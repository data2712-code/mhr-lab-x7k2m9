/* ===================================================================
   MHR DECK LAB — binders.js (v7.06, Tahap B: binder kartu 3×3)
   ===================================================================
   Servis Supabase TANPA DOM (pola sama dengan decks.js / events.js).
   Koneksi dipinjam dari auth.js (window.MHRAuth.client).
   Skema & RLS: mhr_decklab_v706_binders.sql (folder internal).

   Tabel public.binders hanya bisa dibaca PEMILIKNYA (dan admin). Binder
   yang dibagikan dibuka lewat RPC mhr_binder_get(kode) — link-only,
   tidak ada daftar binder publik (keputusan pemilik 23 Okt 2026).
   Laporan (report) lewat RPC mhr_binder_report; antrean & tindakan admin
   lewat mhr_admin_binder_reports / mhr_admin_binder_moderate.
   =================================================================== */
(function(){
  'use strict';
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  async function uid(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const s = await window.MHRAuth.getSession();
    return (s && s.user) ? s.user.id : null;
  }
  const COLS = 'id,share_code,name,kind,is_public,pages,slots,show_prices,contact_wa,contact_ig,location,note,hidden,hidden_reason,created_at,updated_at';
  const off = { message:'offline' };
  /* tabel/fungsi belum ada = migrasi v7.06 belum dijalankan */
  const miss = e => e ? (/PGRST205|42P01|PGRST202|42883/.test(`${e.code||''} ${e.message||''}`) ? {...e, missing:true} : e) : null;
  /* kode dari RAISE EXCEPTION (mis. OWN_BINDER) */
  const rpcErr = e => { if(!e) return null; const m = /([A-Z_]{5,})/.exec(e.message||''); return {...miss(e), code: m ? m[1] : (e.code||'ERROR')}; };
  const EDITABLE = ['name','kind','is_public','pages','slots','show_prices','contact_wa','contact_ig','location','note'];
  const pick = row => { const o = {}; EDITABLE.forEach(k=>{ if(row[k] !== undefined) o[k] = row[k]; }); return o; };

  window.MHRBinders = {
    get ready(){ return !!client(); },
    async listMine(){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:null };
      try{
        const { data, error } = await c.from('binders').select(COLS).eq('owner_id', u).order('updated_at', { ascending:false });
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async create(row){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const { data, error } = await c.from('binders').insert({ ...pick(row), owner_id:u }).select(COLS).single();
        return { data, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async save(id, row){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const { data, error } = await c.from('binders').update(pick(row)).eq('id', id).select(COLS).single();
        return { data, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async remove(id){
      const c = client(); if(!c) return { error:off };
      try{ const { error } = await c.from('binders').delete().eq('id', id); return { error:miss(error) }; }
      catch(e){ return { error:off }; }
    },
    async getShared(code){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const { data, error } = await c.rpc('mhr_binder_get', { p_code:String(code||'') });
        return { data:data||null, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async report(code, reason, note){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const { data, error } = await c.rpc('mhr_binder_report', { p_code:code, p_reason:reason, p_note:note||'' });
        return { data, error:rpcErr(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async adminReports(){
      const c = client(); if(!c) return { data:[], error:off };
      try{
        const { data, error } = await c.rpc('mhr_admin_binder_reports');
        return { data:data||[], error:rpcErr(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async adminModerate(id, action){
      const c = client(); if(!c) return { error:off };
      try{
        const { error } = await c.rpc('mhr_admin_binder_moderate', { p_binder:id, p_action:action });
        return { error:rpcErr(error) };
      }catch(e){ return { error:off }; }
    },
  };
})();
