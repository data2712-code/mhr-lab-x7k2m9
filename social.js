/* ===================================================================
   MHR DECK LAB — social.js (like + komentar untuk galeri publik)
   ===================================================================
   Berkas BARU (revamp galeri "Dari Pengguna" — komentar + like). Sama
   seperti decks.js/auth.js, berkas ini TIDAK menyentuh DOM sama sekali —
   cuma menyediakan API di window.MHRSocial yang dipanggil dari blok
   <script> inline di index.html. TIDAK membuat koneksi Supabase sendiri —
   dipinjam dari auth.js lewat window.MHRAuth.client, sama seperti decks.js.

   Tabel BARU (lihat migrasi di project doc): `public.deck_comments`
   (id, deck_id, user_id, body, created_at) dan `public.deck_likes`
   (deck_id, user_id, created_at — primary key gabungan deck_id+user_id,
   jadi "like" murni insert satu baris dan "batal like" murni delete baris
   itu, tidak perlu kolom penghitung terpisah). RLS kedua tabel: siapa saja
   boleh SELECT baris yang deck_id-nya menunjuk ke deck dengan is_public =
   true (jadi otomatis ikut hilang kalau deck-nya disembunyikan/dihapus);
   INSERT harus login DAN deck tujuannya public; DELETE komentar boleh oleh
   pemilik komentar ATAU admin (moderasi teks kasar/spam TANPA perlu
   menghapus seluruh deck), DELETE like cuma boleh oleh pemilik like-nya
   sendiri (unlike). Login WAJIB untuk like/komentar (keputusan pemilik) —
   RLS-lah yang menegakkan itu, bukan pengecekan di sini.

   Login by username, not email (added v6.33, 13 September) tetap dipakai
   utuh dari auth.js — berkas ini cuma butuh currentUserId(), pola sama
   persis dengan decks.js. */

(function(){
  function client(){
    return (window.MHRAuth && window.MHRAuth.ready) ? window.MHRAuth.client : null;
  }

  async function currentUserId(){
    if(!window.MHRAuth || !window.MHRAuth.ready) return null;
    const session = await window.MHRAuth.getSession();
    return (session && session.user) ? session.user.id : null;
  }

  window.MHRSocial = {
    ready: true,

    /* Ringkasan keterlibatan (jumlah like, jumlah komentar, apakah AKUN
       yang sedang login sudah nge-like) untuk SEKUMPULAN deck sekaligus —
       dipakai renderPubGrid() supaya tidak perlu satu query per kartu.
       Sengaja ambil BARIS mentah (bukan count() bertingkat di server) lalu
       dihitung di sini — skala galeri ini kecil (listPublic() sendiri sudah
       dibatasi 60 deck), jadi lebih sederhana daripada bikin fungsi SQL
       agregat khusus. RLS otomatis membatasi baris yang kebaca cuma milik
       deck yang is_public=true (persis kumpulan deckIds yang dikirim ke
       sini, karena deckIds itu sendiri asalnya dari listPublic()). */
    async engagementFor(deckIds){
      const out = {};
      (deckIds||[]).forEach(id=>{ out[id] = { likes:0, comments:0, likedByMe:false }; });
      if(!deckIds || !deckIds.length) return { data: out, error: null };
      const c = client();
      if(!c) return { data: out, error: { message:'AUTH_NOT_READY' } };
      try{
        const uid = await currentUserId();
        const [likesRes, commentsRes] = await Promise.all([
          c.from('deck_likes').select('deck_id,user_id').in('deck_id', deckIds),
          c.from('deck_comments').select('id,deck_id').in('deck_id', deckIds),
        ]);
        (likesRes.data||[]).forEach(row=>{
          if(!out[row.deck_id]) out[row.deck_id] = { likes:0, comments:0, likedByMe:false };
          out[row.deck_id].likes++;
          if(uid && row.user_id === uid) out[row.deck_id].likedByMe = true;
        });
        (commentsRes.data||[]).forEach(row=>{
          if(!out[row.deck_id]) out[row.deck_id] = { likes:0, comments:0, likedByMe:false };
          out[row.deck_id].comments++;
        });
        return { data: out, error: likesRes.error || commentsRes.error || null };
      }catch(e){
        return { data: out, error: { message:'ENGAGEMENT_FAILED' } };
      }
    },

    /* Toggle like satu deck untuk akun yang sedang login. `currentlyLiked`
       dikirim oleh pemanggil (sudah tahu dari engagementFor() sebelumnya)
       supaya fungsi ini tidak perlu query tambahan cuma untuk tahu insert
       atau delete yang harus dijalankan. */
    async toggleLike(deckId, currentlyLiked){
      const c = client();
      if(!c) return { error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { error:{ message:'NOT_LOGGED_IN' } };
      try{
        if(currentlyLiked){
          const { error } = await c.from('deck_likes').delete().eq('deck_id', deckId).eq('user_id', uid);
          return { error };
        }
        const { error } = await c.from('deck_likes').insert({ deck_id: deckId, user_id: uid });
        return { error };
      }catch(e){
        return { error:{ message:'LIKE_FAILED' } };
      }
    },

    /* Daftar komentar LENGKAP satu deck (dipanggil saat panel komentarnya
       dibuka, bukan di muka untuk semua kartu galeri sekaligus — lihat
       engagementFor() untuk itu). Digabung dengan username pemiliknya lewat
       query kedua ke `profiles`, pola SAMA PERSIS dengan listPublic() di
       decks.js (deck_comments.user_id mengacu ke auth.users, bukan
       public.profiles, jadi tidak bisa di-embed otomatis lewat FK). */
    async listComments(deckId){
      const c = client();
      if(!c) return { data:[], error:{ message:'AUTH_NOT_READY' } };
      try{
        const { data: rows, error } = await c
          .from('deck_comments')
          .select('id,user_id,body,created_at')
          .eq('deck_id', deckId)
          .order('created_at', { ascending:true });
        if(error) return { data:[], error };
        const ids = [...new Set((rows||[]).map(r=>r.user_id))];
        let namesById = {};
        if(ids.length){
          const { data: profs } = await c.from('profiles').select('id,username').in('id', ids);
          (profs||[]).forEach(p=>{ namesById[p.id] = p.username; });
        }
        const withNames = (rows||[]).map(r=>({ ...r, username: namesById[r.user_id] || null }));
        return { data: withNames, error: null };
      }catch(e){
        return { data:[], error:{ message:'LIST_COMMENTS_FAILED' } };
      }
    },

    /* Kirim satu komentar baru — AUTO-POST, langsung tayang begitu
       tersimpan (atas permintaan pemilik, sama seperti model publikasi
       deck: moderasi REAKTIF, admin cuma menghapus SESUDAHNYA kalau perlu,
       bukan antrean review dulu). RLS yang menegakkan syarat login + deck
       tujuannya memang public, bukan pengecekan di sini. */
    async addComment(deckId, body){
      const c = client();
      if(!c) return { data:null, error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { data:null, error:{ message:'NOT_LOGGED_IN' } };
      const teks = (body || '').trim();
      if(!teks) return { data:null, error:{ message:'EMPTY_COMMENT' } };
      try{
        const { data, error } = await c
          .from('deck_comments')
          .insert({ deck_id: deckId, user_id: uid, body: teks })
          .select('id,user_id,body,created_at')
          .maybeSingle();
        return { data, error };
      }catch(e){
        return { data:null, error:{ message:'ADD_COMMENT_FAILED' } };
      }
    },

    /* Hapus satu komentar. TIDAK memfilter owner_id di sini — sama seperti
       remove() di decks.js sejak v6.36 — dipakai baik oleh pemilik komentar
       menghapus komentarnya sendiri MAUPUN admin menghapus komentar orang
       lain untuk moderasi. RLS (`users can delete own comments` OR `admins
       can delete any comment`) yang menjaga siapa benar-benar boleh
       berhasil, filter tambahan di sini cuma akan salah menghalangi admin. */
    async deleteComment(id){
      const c = client();
      if(!c) return { error:{ message:'AUTH_NOT_READY' } };
      const uid = await currentUserId();
      if(!uid) return { error:{ message:'NOT_LOGGED_IN' } };
      try{
        const { error } = await c.from('deck_comments').delete().eq('id', id);
        return { error };
      }catch(e){
        return { error:{ message:'DELETE_COMMENT_FAILED' } };
      }
    },
  };
})();
