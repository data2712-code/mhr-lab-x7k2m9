/* ===================================================================
   MHR DECK LAB — auth.js (login / signup / logout + status admin)
   ===================================================================
   Tipis di atas Supabase JS SDK (dimuat lewat <script> CDN di index.html
   SEBELUM berkas ini). Berkas ini TIDAK menyentuh DOM sama sekali — cuma
   menyediakan API di window.MHRAuth yang dipanggil dari blok <script>
   inline di index.html (pola sama seperti cards.js/data.js: data/servis
   terpisah dari markup+wiring).

   PENTING kalau site ini dipindah/di-fork: dua nilai di bawah ini AMAN
   ditaruh di kode sisi klien (anon key Supabase memang didesain publik —
   akses sesungguhnya diatur lewat Row Level Security di database, bukan
   dengan menyembunyikan key ini). JANGAN PERNAH taruh service_role key di
   sini atau di berkas manapun yang dikirim ke browser.

   v6.31 — login Google DICABUT (pemilik memilih email/password saja, tidak
   mau mengurus proses OAuth consent Google). isAdmin() ditambahkan: cek
   tabel admin_users di Supabase — tabel itu TIDAK punya kebijakan insert/
   update/delete untuk peran manapun, jadi status admin cuma bisa diberikan
   lewat SQL Editor Supabase langsung oleh pemilik, tidak pernah lewat situs
   ini sendiri (mencegah siapa pun menaikkan hak aksesnya sendiri).

   v6.32 — kolom `display_name` di tabel profiles diganti jadi `username`
   (unik, case-insensitive, 3-20 karakter huruf/angka/underscore — lihat
   USERNAME_RE) supaya orang bisa dikenali dengan nama pilihan sendiri,
   bukan cuma nama tampilan bebas yang boleh sama antar akun. Dicek
   ketersediaannya sebelum signUp() asli dipanggil.

   v6.33 — login sekarang pakai USERNAME + kata sandi, bukan email lagi.
   Supabase Auth sendiri cuma bisa login pakai email, jadi signIn() di
   bawah menerjemahkan username -> email dulu lewat fungsi database
   `verify_login` (lihat mhr_decklab_username_login_migration.sql) SEBELUM
   memanggil signInWithPassword asli. Fungsi itu sengaja HANYA
   mengembalikan email kalau kata sandinya juga benar (dicek di database
   pakai hash bcrypt yang sama seperti Supabase sendiri, lewat pgcrypto) —
   supaya orang tidak bisa "memanen" alamat email cuma dengan menebak-nebak
   username satu per satu. Kalau salah (username ATAU kata sandi), pesan
   errornya sama-sama generik.

   v6.34 — fitur "Lupa kata sandi?". Ini SATU-SATUNYA tempat di seluruh
   sistem akun yang tetap minta EMAIL (bukan username) — karena itu memang
   cara resetPasswordForEmail() Supabase bekerja (mengirim link ke email),
   dan berbeda dari signIn/verify_login di atas, di sini TIDAK ada password
   yang bisa dipakai untuk "menjaga" apakah suatu email/username terdaftar,
   jadi kita sengaja TIDAK membuat fungsi "cari email dari username" untuk
   fitur ini (itu akan jadi celah panen-email tanpa penjagaan password sama
   sekali). Supabase sendiri juga tidak membocorkan apakah suatu email
   terdaftar atau tidak lewat resetPasswordForEmail() — pesan yang
   ditampilkan ke pengguna sama saja di kedua kasus. Setelah pengguna
   mengklik link di email itu, Supabase mengarahkan balik ke situs ini
   dengan sesi "pemulihan" sementara (event PASSWORD_RECOVERY) — lihat
   onPasswordRecovery() di bawah — lalu updatePassword() dipanggil untuk
   menyimpan kata sandi baru.
   =================================================================== */

(function(){
  const SUPABASE_URL = 'https://kdtohyluvkucscuwnyde.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkdG9oeWx1dmt1Y3NjdXdueWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjgyODAsImV4cCI6MjEwNDgwNDI4MH0.0oO2jpX6iTsxDFxdprXAltUTxq5wGTEJAPwifiimmnM';

  if(typeof window.supabase === 'undefined' || !window.supabase.createClient){
    console.error('[MHR Deck Lab] Supabase SDK tidak termuat — cek urutan <script> di index.html (harus sebelum auth.js).');
    window.MHRAuth = {
      ready: false,
      getSession: async ()=>null,
      onAuthChange: ()=>{},
      onPasswordRecovery: ()=>{},
      signUp: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      signIn: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      signOut: async ()=>{},
      resetPassword: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      updatePassword: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      isAdmin: async ()=>false,
    };
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* daftar listener UI yang mau tahu tiap kali status login berubah
     (dipanggil dengan (session) — null kalau logout) */
  const listeners = [];

  /* v6.34 — daftar listener terpisah, khusus event PASSWORD_RECOVERY (klik
     link "lupa kata sandi" dari email). Dipisah dari `listeners` di atas
     supaya index.html bisa membedakan "orang baru saja login biasa" dari
     "orang baru saja klik link reset kata sandi", tanpa mengubah bentuk
     callback (session) yang sudah dipakai onAuthChange() sejak v6.30. */
  const recoveryListeners = [];

  client.auth.onAuthStateChange((event, session)=>{
    if(event === 'PASSWORD_RECOVERY'){
      recoveryListeners.forEach(fn=>{ try{ fn(session); }catch(e){ console.error(e); } });
    }
    listeners.forEach(fn=>{ try{ fn(session); }catch(e){ console.error(e); } });
  });

  const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

  async function getUsername(userId, fallback){
    try{
      const { data, error } = await client
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      if(error || !data) return fallback;
      return data.username || fallback;
    }catch(e){
      return fallback;
    }
  }

  window.MHRAuth = {
    ready: true,
    client, // diekspos kalau fase berikutnya (deck sharing, tracker) perlu query langsung

    /* Sesi yang sedang aktif (atau null). Dipanggil sekali saat halaman dimuat. */
    async getSession(){
      const { data, error } = await client.auth.getSession();
      if(error) return null;
      return data.session || null;
    },

    /* username pengguna yang sedang login (dari tabel profiles),
       fallback ke bagian sebelum @ di email kalau profil belum sempat kebaca */
    async getUsername(session){
      if(!session || !session.user) return null;
      const fallback = (session.user.email || '').split('@')[0] || 'Player';
      return getUsername(session.user.id, fallback);
    },

    /* daftarkan callback yang dipanggil tiap kali status auth berubah */
    onAuthChange(fn){ listeners.push(fn); },

    /* v6.34 — daftarkan callback yang HANYA dipanggil saat orang mendarat di
       situs ini lewat link reset kata sandi dari email (lihat komentar
       v6.34 di atas berkas ini). index.html memakainya untuk otomatis
       membuka form "simpan kata sandi baru". */
    onPasswordRecovery(fn){ recoveryListeners.push(fn); },

    /* v6.32 — username WAJIB unik (3-20 karakter, huruf/angka/underscore).
       Dicek dulu ke tabel profiles (public-read, jadi anon key boleh baca)
       SEBELUM signUp asli dipanggil, supaya orang dapat pesan error yang jelas
       ("username sudah dipakai") alih-alih error database yang generik.
       Race condition (dua orang daftar username sama nyaris bersamaan) tetap
       aman lewat unique index case-insensitive di database — kalau sampai
       lolos pengecekan ini tapi tetap bentrok, signUp asli di bawah akan
       gagal dan pesannya dipetakan lagi di index.html. */
    async signUp(email, password, username){
      const uname = (username || '').trim();
      if(!USERNAME_RE.test(uname)){
        return { data:null, error:{ message:'INVALID_USERNAME' } };
      }
      try{
        const { data: existing, error: checkErr } = await client
          .from('profiles')
          .select('id')
          .ilike('username', uname)
          .maybeSingle();
        if(!checkErr && existing){
          return { data:null, error:{ message:'USERNAME_TAKEN' } };
        }
      }catch(e){ /* cek gagal (mis. offline) — lanjut saja, constraint di
                    database tetap jadi jaring pengaman terakhir */ }
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { data: { username: uname } }
      });
      return { data, error };
    },

    /* v6.33 — login pakai username, bukan email. `verify_login` di database
       yang menerjemahkan username -> email (HANYA kalau kata sandinya juga
       cocok — lihat komentar v6.33 di atas). Sesudah dapat email itu,
       signInWithPassword ASLI tetap yang menentukan sesi login (jadi kata
       sandi tetap diverifikasi ganda oleh Supabase Auth sendiri, bukan cuma
       oleh fungsi database ini). */
    async signIn(username, password){
      const uname = (username || '').trim();
      if(!uname) return { data:null, error:{ message:'INVALID_LOGIN' } };
      try{
        const { data: email, error: rpcErr } = await client.rpc('verify_login', {
          p_username: uname,
          p_password: password,
        });
        if(rpcErr || !email){
          return { data:null, error:{ message:'INVALID_LOGIN' } };
        }
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        return { data, error };
      }catch(e){
        return { data:null, error:{ message:'INVALID_LOGIN' } };
      }
    },

    async signOut(){
      const { error } = await client.auth.signOut();
      return { error };
    },

    /* v6.34 — kirim link reset kata sandi ke EMAIL (bukan username — lihat
       komentar v6.34 di atas berkas ini untuk alasannya). redirectTo
       diarahkan balik ke halaman ini sendiri (origin + path saat ini),
       supaya sesudah diklik, pengguna kembali ke situs ini juga (bukan ke
       domain lama data2712-code.github.io kalau kebetulan itu yang lagi
       dibuka). */
    async resetPassword(email){
      const addr = (email || '').trim();
      if(!addr) return { error:{ message:'INVALID_EMAIL' } };
      try{
        const { error } = await client.auth.resetPasswordForEmail(addr, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        return { error };
      }catch(e){
        return { error:{ message:'RESET_FAILED' } };
      }
    },

    /* v6.34 — simpan kata sandi baru. HANYA berhasil kalau sesi saat ini
       adalah sesi "pemulihan" dari link reset (event PASSWORD_RECOVERY) —
       itu aturan Supabase Auth sendiri, bukan sesuatu yang perlu dicek lagi
       di sini. Dipanggil dari form yang muncul lewat onPasswordRecovery(). */
    async updatePassword(newPassword){
      try{
        const { data, error } = await client.auth.updateUser({ password: newPassword });
        return { data, error };
      }catch(e){
        return { data:null, error:{ message:'UPDATE_FAILED' } };
      }
    },

    /* true kalau akun yang sedang login ada di tabel admin_users. Tabel itu
       cuma punya kebijakan SELECT "auth.uid() = user_id" (baca status diri
       sendiri) — tidak ada insert/update/delete untuk peran manapun, jadi
       ini murni membaca, tidak pernah bisa dipakai untuk menaikkan hak
       akses. Dipanggil dari refreshAccountUI() di index.html tiap kali
       status login berubah. */
    async isAdmin(session){
      if(!session || !session.user) return false;
      try{
        const { data, error } = await client
          .from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if(error || !data) return false;
        return true;
      }catch(e){
        return false;
      }
    },
  };
})();
