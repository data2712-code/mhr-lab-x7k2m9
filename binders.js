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

   v7.10 — FOTO KARTU (hanya untuk binder): bucket Storage publik
   "binder-photos", berkas di folder <user_id>/ (<id>.webp + <id>_t.webp
   untuk thumbnail; .jpg kalau browser tidak bisa membuat WebP). Maks 1 MB
   per berkas & maks 20 foto per akun ditegakkan oleh kebijakan Storage di
   mhr_decklab_v710_binder_photos.sql. Foto dikecilkan di browser sebelum
   diunggah (binders-ui.js), jadi pengguna tidak perlu mengonversi apa pun.

   v7.23 — WARNA BINDER: kolom binders.color (black | red | orange | yellow | green | teal |
   blue | purple | pink | grey; default 'black'), lihat mhr_decklab_v723_binder_color.sql.
   Kalau migrasinya belum dijalankan, kolom color otomatis tidak dipakai (colorMissing = true):
   binder tetap bisa dibuka & disimpan, semua tampil hitam, dan pilihan warna disembunyikan.
   =================================================================== */
(function(){
  'use strict';
  const client = () => (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  async function uid(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const s = await window.MHRAuth.getSession();
    return (s && s.user) ? s.user.id : null;
  }
  const COLS0 = 'id,share_code,name,kind,is_public,pages,slots,show_prices,contact_wa,contact_ig,location,note,hidden,hidden_reason,created_at,updated_at';
  const COLS1 = COLS0 + ',color';
  let colorOff = false;                                  // v7.23 — kolom color belum ada di database
  const cols = () => colorOff ? COLS0 : COLS1;
  /* kolom tidak dikenal (migrasi v7.23 belum jalan): 42703 dari Postgres atau PGRST204 dari PostgREST */
  const colErr = e => !!e && (/42703|PGRST204/.test(String(e.code || '')) || /color/i.test(String(e.message || '')) && /column/i.test(String(e.message || '')));
  /* jalankan query; kalau gagal karena kolom color, ulangi sekali tanpa kolom itu */
  async function withColor(run){
    let r = await run();
    if(!colorOff && r && colErr(r.error)){ colorOff = true; window.MHRBinders.colorMissing = true; r = await run(); }
    return r;
  }
  const off = { message:'offline' };
  /* tabel/fungsi belum ada = migrasi v7.06 belum dijalankan */
  const miss = e => e ? (/PGRST205|42P01|PGRST202|42883/.test(`${e.code||''} ${e.message||''}`) ? {...e, missing:true} : e) : null;
  /* kode dari RAISE EXCEPTION (mis. OWN_BINDER) */
  const rpcErr = e => { if(!e) return null; const m = /([A-Z_]{5,})/.exec(e.message||''); return {...miss(e), code: m ? m[1] : (e.code||'ERROR')}; };
  const EDITABLE = ['name','kind','is_public','pages','slots','show_prices','contact_wa','contact_ig','location','note'];
  const pick = row => { const o = {}; EDITABLE.forEach(k=>{ if(row[k] !== undefined) o[k] = row[k]; }); if(!colorOff && row.color) o.color = row.color; return o; };
  const BUCKET = 'binder-photos';
  const store = () => { const c = client(); return c && c.storage ? c.storage.from(BUCKET) : null; };

  window.MHRBinders = {
    get ready(){ return !!client(); },
    colorMissing: false,
    async listMine(){
      const c = client(); if(!c) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:null };
      try{
        const { data, error } = await withColor(()=>c.from('binders').select(cols()).eq('owner_id', u).order('updated_at', { ascending:false }));
        return { data:data||[], error:miss(error) };
      }catch(e){ return { data:[], error:off }; }
    },
    async create(row){
      const c = client(); if(!c) return { data:null, error:off };
      const u = await uid(); if(!u) return { data:null, error:{ code:'NOT_LOGGED_IN' } };
      try{
        const { data, error } = await withColor(()=>c.from('binders').insert({ ...pick(row), owner_id:u }).select(cols()).single());
        return { data, error:miss(error) };
      }catch(e){ return { data:null, error:off }; }
    },
    async save(id, row){
      const c = client(); if(!c) return { data:null, error:off };
      try{
        const { data, error } = await withColor(()=>c.from('binders').update(pick(row)).eq('id', id).select(cols()).single());
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
    /* ---------- v7.10 foto kartu binder ---------- */
    async me(){ return uid(); },
    photoUrl(path){
      const st = store(); if(!st || !path) return '';
      try{ return st.getPublicUrl(String(path)).data.publicUrl || ''; }catch(e){ return ''; }
    },
    /* semua berkas di folder akun ini: [{ path, name, created_at, size }] */
    async photoList(){
      const st = store(); if(!st) return { data:[], error:off };
      const u = await uid(); if(!u) return { data:[], error:{ code:'NOT_LOGGED_IN' } };
      try{
        const { data, error } = await st.list(u, { limit:200, sortBy:{ column:'created_at', order:'asc' } });
        return { data:(data||[]).filter(f=>f && f.name && f.id !== null).map(f=>({ path:`${u}/${f.name}`, name:f.name, created_at:f.created_at, size:(f.metadata && f.metadata.size) || 0 })), error };
      }catch(e){ return { data:[], error:off }; }
    },
    async photoUpload(path, blob, type){
      const st = store(); if(!st) return { error:off };
      try{
        const { error } = await st.upload(path, blob, { contentType:type, upsert:false, cacheControl:'31536000' });
        return { error };
      }catch(e){ return { error:off }; }
    },
    async photoRemove(paths){
      const st = store(); const list = (paths||[]).filter(Boolean);
      if(!st || !list.length) return { error: st ? null : off };
      try{ const { error } = await st.remove(list); return { error }; }
      catch(e){ return { error:off }; }
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
