/* ===================================================================
   MHR DECK LAB — tournaments.js (servis data Turnamen, v6.65)
   ===================================================================
   Pola sama dengan news.js/decks.js: TIDAK menyentuh DOM, cuma
   menyediakan API di window.MHRTournaments. Koneksi Supabase dipinjam
   dari auth.js (window.MHRAuth.client).

   Tabel `public.tournaments` — lihat mhr_decklab_v665_tournaments.sql di
   folder internal. RLS-lah yang menegakkan "publik cuma baca, cuma admin
   yang boleh menulis" — bukan pengecekan di berkas ini.

   Beda dengan Berita: tidak ada status draft/published di sini. Begitu
   admin menyimpan satu turnamen, langsung tayang untuk semua pengunjung
   (datanya sudah final dari sumber resmi saat ditambahkan).

   Field `top` berisi array deck Top-N, format PERSIS SAMA dengan yang
   dipakai Community Deck (`cd` = kode dari encodeDeck()/decodeDeck() di
   index.html): { pk, nm, cr, ds, cd }.
   =================================================================== */

(function(){
  const COLS = 'id,nama,tanggal,lokasi,penyelenggara,sumber,top,created_at,updated_at';

  function client(){
    return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  }

  window.MHRTournaments = {
    ready: !!client(),

    /* daftar turnamen, terbaru dulu (tanggal desc) */
    async list({limit=100}={}){
      const c = client(); if(!c) return {data:[], error:{message:'offline'}};
      const { data, error } = await c.from('tournaments').select(COLS)
        .order('tanggal', {ascending:false}).limit(limit);
      return { data: data || [], error };
    },

    /* simpan (buat baru bila tanpa id). Mengembalikan baris yang tersimpan. */
    async save(row){
      const c = client(); if(!c) return {error:{message:'offline'}};
      const clean = {};
      for(const k of ['nama','tanggal','lokasi','penyelenggara','sumber','top'])
        if(k in row) clean[k] = (row[k] === '' ? null : row[k]);
      if(!Array.isArray(clean.top)) clean.top = [];
      const q = row.id
        ? c.from('tournaments').update(clean).eq('id', row.id)
        : c.from('tournaments').insert(clean);
      const { data, error } = await q.select(COLS).single();
      return { data, error };
    },

    async remove(id){
      const c = client(); if(!c) return {error:{message:'offline'}};
      const { error } = await c.from('tournaments').delete().eq('id', id);
      return { error };
    },
  };
})();
