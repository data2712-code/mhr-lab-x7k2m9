/* ===================================================================
   MHR DECK LAB — auth.js (Phase 1: login / signup / logout)
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
      signUp: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      signIn: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      signInWithGoogle: async ()=>({error:{message:'Supabase SDK tidak termuat'}}),
      signOut: async ()=>{},
    };
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* daftar listener UI yang mau tahu tiap kali status login berubah
     (dipanggil dengan (session) — null kalau logout) */
  const listeners = [];

  client.auth.onAuthStateChange((_event, session)=>{
    listeners.forEach(fn=>{ try{ fn(session); }catch(e){ console.error(e); } });
  });

  async function getDisplayName(userId, fallback){
    try{
      const { data, error } = await client
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      if(error || !data) return fallback;
      return data.display_name || fallback;
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

    /* nama tampilan pengguna yang sedang login (dari tabel profiles),
       fallback ke bagian sebelum @ di email kalau profil belum sempat kebaca */
    async getDisplayName(session){
      if(!session || !session.user) return null;
      const fallback = (session.user.email || '').split('@')[0] || 'Player';
      return getDisplayName(session.user.id, fallback);
    },

    /* daftarkan callback yang dipanggil tiap kali status auth berubah */
    onAuthChange(fn){ listeners.push(fn); },

    async signUp(email, password, displayName){
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { data: { display_name: (displayName || '').trim() || 'Player' } }
      });
      return { data, error };
    },

    async signIn(email, password){
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return { data, error };
    },

    async signInWithGoogle(){
      /* redirect kembali ke halaman yang sama persis (termasuk query/hash asal
         dibuang browser saat redirect OAuth, jadi cukup origin+pathname) */
      const redirectTo = window.location.origin + window.location.pathname;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      return { data, error };
    },

    async signOut(){
      const { error } = await client.auth.signOut();
      return { error };
    },
  };
})();
