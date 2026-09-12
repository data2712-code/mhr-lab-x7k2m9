/* ===================================================================
   MHR DECK LAB — decks.js (simpan / muat / hapus deck ke akun)
   ===================================================================
   Berkas BARU di v6.35 (Phase 2 — "Deck Saya" tersinkron ke akun). Sama
   seperti auth.js, berkas ini TIDAK menyentuh DOM sama sekali — cuma
   menyediakan API di window.MHRDecks yang dipanggil dari blok <script>
   inline di index.html (pola sama seperti cards.js/data.js/auth.js: data/
   servis terpisah dari markup+wiring).

   TIDAK membuat koneksi Supabase sendiri — dipinjam dari auth.js lewat
   `window.MHRAuth.client` (sudah sengaja diekspos di sana sejak v6.30
   khusus untuk fase ini, lihat komentarnya). auth.js HARUS sudah dimuat
   duluan (lihat urutan <script> di index.html).

   Tabel `public.decks` (kolom: id, owner_id, name, deck_code, playstyle,
   is_public, created_at, updated_at) dan kebijakan RLS-nya (pemilik boleh
   insert/update/delete deck miliknya sendiri; deck dengan is_public=true
   boleh dibaca siapa saja; admin boleh update/delete deck siapa pun untuk
   moderasi) SUDAH DIBUAT sejak Phase 0 (12 September) — Phase 2 ini TIDAK
   perlu migrasi SQL baru sama sekali, cuma memakai apa yang sudah ada.

   `deck_code` memakai format PERSIS SAMA dengan encodeDeck()/decodeDeck()
   di index.html (fungsi itu sudah dipakai lebih dulu untuk "Salin link
   deck" dan daftar DECK_KOMUNITAS di data.js) — sengaja tidak dibuat
   format penyimpanan baru, supaya satu deck yang sama bisa dibaca ulang
   oleh SEMUA jalur yang sudah ada (link berbagi, impor teks, deck
   komunitas, dan sekarang akun) tanpa perlu konversi apa pun. Karena itu
   juga encodeDeck()/decodeDeck() TETAP tinggal di index.html (mereka
   butuh akses ke DB kartu & tabel SER2L yang cuma ada di sana) — decks.js
   cuma menerima string `deckCode` yang sudah jadi, tidak pernah menyusun
   atau membongkarnya sendiri.

   `playstyle` (catatan gaya bermain) dan `is_public` (tampil di galeri
   publik) sudah ada di skema sejak Phase 0 untuk Phase 3 (sharing) —
   Phase 2 ini set keduanya ke default (`''` dan `false`) dan belum
   menyediakan UI untuk mengubahnya; itu menyusul di Phase 3. */

(function(){
  function client(){
    return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  }

  async function currentUserId(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const session = await window.MHRAuth.getSession();
    return (session && session.user) ? session.user.id : null;
  }

  window.MHRDecks = {
    ready: true,

    /* daftar deck milik pengguna yang sedang login, terbaru duluan.
       Balasan kosong (bukan error) kalau belum login — pemanggil (index.html)
       yang memutuskan mau menampilkan hint "silakan masuk" atau daftar
       kosong berdasarkan status login itu sendiri, bukan berdasar ini. */
    async listMine(){
      const c = client();
      if(!c) return { data: [], error: { message: 'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { data: [], error: null };
      const { data, error } = await c
        .from('decks')
        .select('id,name,deck_code,playstyle,is_public,created_at,updated_at')
        .eq('owner_id', uid)
        .order('updated_at', { ascending:false });
      return { data: data || [], error };
    },

    /* Simpan satu deck ke akun. Kalau `id` diisi -> UPDATE deck itu (harus
       milik sendiri, dijamin RLS `users can update own decks`). Kalau `id`
       kosong -> INSERT deck baru, owner_id diisi eksplisit di sini (tabel
       TIDAK punya default untuk kolom ini, beda dari `id`/`created_at`/
       `updated_at` yang otomatis) supaya cocok dengan kebijakan RLS
       `users can insert own decks` (with check: auth.uid() = owner_id).
       `updated_at` TIDAK pernah disentuh dari sini — ada trigger
       `decks_set_updated_at` di database yang mengisinya otomatis tiap
       UPDATE, jadi klien tidak perlu (dan tidak boleh) mengirimnya sendiri. */
    async save({ id, name, deckCode }){
      const c = client();
      if(!c) return { data:null, error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { data:null, error:{ message:'NOT_LOGGED_IN' } };
      const nama = (name || '').trim() || 'Deck';
      try{
        if(id){
          const { data, error } = await c
            .from('decks')
            .update({ name: nama, deck_code: deckCode })
            .eq('id', id)
            .eq('owner_id', uid)
            .select('id,name,deck_code,playstyle,is_public,created_at,updated_at')
            .maybeSingle();
          return { data, error };
        }
        const { data, error } = await c
          .from('decks')
          .insert({ owner_id: uid, name: nama, deck_code: deckCode })
          .select('id,name,deck_code,playstyle,is_public,created_at,updated_at')
          .maybeSingle();
        return { data, error };
      }catch(e){
        return { data:null, error:{ message:'SAVE_FAILED' } };
      }
    },

    /* Impor banyak deck sekaligus (dipakai satu kali oleh alur "impor deck
       dari browser ini ke akun" di index.html) — satu panggilan INSERT
       untuk semua sekaligus, bukan save() dipanggil berulang, supaya lebih
       cepat dan tidak setengah-setengah kalau koneksi putus di tengah
       (baris array insert Supabase tetap satu transaksi). `decks` di sini
       array of {name, deckCode}. */
    async importMany(decks){
      const c = client();
      if(!c) return { data:null, error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { data:null, error:{ message:'NOT_LOGGED_IN' } };
      const rows = (decks||[]).map(d=>({
        owner_id: uid,
        name: (d.name||'').trim() || 'Deck',
        deck_code: d.deckCode,
      }));
      if(!rows.length) return { data:[], error:null };
      try{
        const { data, error } = await c
          .from('decks')
          .insert(rows)
          .select('id,name,deck_code,playstyle,is_public,created_at,updated_at');
        return { data: data || [], error };
      }catch(e){
        return { data:null, error:{ message:'IMPORT_FAILED' } };
      }
    },

    /* Hapus satu deck milik sendiri (RLS `users can delete own decks`
       sudah menjaga supaya tidak bisa menghapus deck orang lain — filter
       owner_id di sini sekadar lapis kedua, bukan satu-satunya penjaga). */
    async remove(id){
      const c = client();
      if(!c) return { error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { error:{ message:'NOT_LOGGED_IN' } };
      try{
        const { error } = await c.from('decks').delete().eq('id', id).eq('owner_id', uid);
        return { error };
      }catch(e){
        return { error:{ message:'DELETE_FAILED' } };
      }
    },
  };
})();
