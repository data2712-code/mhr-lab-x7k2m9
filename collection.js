/* ===================================================================
   MHR DECK LAB — collection.js (koleksi kartu pribadi, Phase 4)
   ===================================================================
   Berkas BARU (Phase 4 — "Koleksi Kartu Saya" di halaman Dashboard). Sama
   seperti decks.js/social.js, berkas ini TIDAK menyentuh DOM sama sekali —
   cuma menyediakan API di window.MHRCollection. TIDAK membuat koneksi
   Supabase sendiri — dipinjam dari auth.js lewat window.MHRAuth.client.

   Tabel `public.collection` (kolom: user_id — PRIMARY KEY sekaligus FK ke
   auth.users, cards jsonb default '{}', created_at/updated_at dengan
   trigger collection_set_updated_at) SUDAH DIBUAT sejak Phase 0 (12
   September) dan RLS-nya (cuma pemilik sendiri yang boleh
   insert/select/update baris miliknya) SUDAH DIKONFIRMASI lengkap saat
   scoping Phase 2 dan Phase 3 — Phase 4 ini TIDAK perlu migrasi SQL baru
   sama sekali, cuma memakai apa yang sudah ada.

   Format `cards`: objek datar {[nomor kartu]: jumlah salinan dimiliki},
   mis. {"BP01-001": 2, "TB03-014": 3}. Kartu yang jumlahnya 0 SENGAJA tidak
   disimpan sebagai key sama sekali (bukan disimpan sebagai 0) — supaya
   ukuran JSON tidak membengkak seiring database kartu terus bertambah
   (sudah 200+ kartu per Phase 3, akan terus tumbuh). Jumlah dibatasi 0-3 di
   sisi UI (lihat renderCollectionGrid() di index.html) karena itu batas
   salinan maksimum yang berarti untuk keperluan deck builder (aturan
   101.1.d) — kalau ada pemain yang secara fisik punya lebih dari 3 salinan
   kartu yang sama, kelebihannya memang tidak tercatat, tapi itu tidak
   pernah relevan untuk fitur "kartu apa yang belum kupunya".

   Desain baca/tulis: get() mengembalikan SELURUH map sekali (satu baris
   per akun, bukan satu baris per kartu — jauh lebih murah), UI menyimpannya
   di memori dan memanggil save() dengan map LENGKAP tiap kali satu angka
   diubah (upsert menimpa seluruh kolom `cards`). Tidak ada penguncian/
   penggabungan kalau dua tab dibuka bersamaan dan diubah nyaris berbarengan
   (tab yang menyimpan belakangan menang) — batasan yang diterima sadar,
   sama seperti keterbatasan `store.cloudLink` di decks.js, karena kasus
   nyatanya sangat jarang (satu orang jarang buka dua tab dashboard sekaligus
   sambil menandai kartu di keduanya). */

(function(){
  function client(){
    return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  }

  async function currentUserId(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const session = await window.MHRAuth.getSession();
    return (session && session.user) ? session.user.id : null;
  }

  window.MHRCollection = {
    ready: true,

    /* Ambil peta koleksi akun yang sedang login. Balasan kosong {} (bukan
       error) kalau belum login ATAU akun belum pernah menyimpan apa pun —
       sama seperti listMine() di decks.js, pemanggil yang memutuskan mau
       menampilkan hint "silakan masuk" berdasarkan status login itu
       sendiri, bukan berdasar isi balasan ini. */
    async get(){
      const c = client();
      if(!c) return { data:{}, error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { data:{}, error:null };
      try{
        const { data, error } = await c
          .from('collection')
          .select('cards')
          .eq('user_id', uid)
          .maybeSingle();
        if(error) return { data:{}, error };
        return { data: (data && data.cards) || {}, error:null };
      }catch(e){
        return { data:{}, error:{ message:'GET_FAILED' } };
      }
    },

    /* Simpan SELURUH peta koleksi sekaligus (lihat catatan desain di atas).
       upsert supaya baris pertama untuk akun ini otomatis dibuat (tabel
       TIDAK punya default row per user — beda dari `decks`, di sini
       memang cuma ada nol atau satu baris per akun). */
    async save(cardsMap){
      const c = client();
      if(!c) return { error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { error:{ message:'NOT_LOGGED_IN' } };
      try{
        const { error } = await c
          .from('collection')
          .upsert({ user_id: uid, cards: cardsMap || {} }, { onConflict:'user_id' });
        return { error };
      }catch(e){
        return { error:{ message:'SAVE_FAILED' } };
      }
    },
  };
})();
