/* ===================================================================
   MHR BATTLE SIM — STATUS BAYANGAN UNTUK MODE ONLINE (sim-shadow.js)        O2 · riwayat #63
   ===================================================================
   Server online hanya mengirim tampilan per pemain (viewFor, sim.js): HAND & Deck lawan berupa jumlah, kartu tertutup
   lawan tanpa identitas, tanpa seed/RNG. Papan (sim-ui.js) memakai fungsi mesin (getLv, check, targetsFor, ...) pada
   satu objek status G. Berkas ini menyusun "status bayangan" dari tampilan itu: bentuknya sama dengan status mesin,
   kartu yang tidak boleh dilihat diganti kartu pengganti tanpa identitas. Status bayangan hanya untuk menggambar dan
   memberi petunjuk aksi; semua aksi tetap diperiksa server (otoritatif).
   Jalan di browser (window.MHRSimShadow) dan di Node (require) untuk uji.
   =================================================================== */
(function (root) {
  'use strict';
  const BLANK = () => ({ fd: true, hidden: true, no: null, enT: -1, bbm: -1, atkT: -1, atkN: 0, dclT: -1, tgdT: -1, tgdN: 0, att: [], host: null, mods: [], once: {}, tw: {}, gr: {}, zt: 0, lk: '' });
  const DEF = { fd: false, enT: -1, bbm: -1, atkT: -1, atkN: 0, dclT: -1, tgdT: -1, tgdN: 0, att: [], host: null, mods: [], once: {}, tw: {}, gr: {}, zt: 0, lk: '' };

  function shadow(v) {
    const st = JSON.parse(JSON.stringify(v));
    const me = v.viewer;
    st.seed = 0; st.rng = 0; st.opaque = true;
    st.decks = [[], []]; st.decks[me] = (v.deckList || []).slice();
    st.pend = []; st.job = null; st.jid = 0; st.snap = {}; st.bseq = 0; st.curB = 0; st.tick = 0;
    st.actions = new Array(v.nActions || 0).fill(null);
    st.firstOpt = v.first;
    delete st.deckList; delete st.nActions; delete st.pending; delete st.viewer;
    // Kartu terlihat: lengkapi kolom yang mungkin tidak ada; kartu tertutup lawan: kartu pengganti tanpa nomor.
    Object.keys(st.inst).forEach(iid => {
      const x = st.inst[iid];
      if (x.hidden) st.inst[iid] = Object.assign(BLANK(), { iid, owner: x.owner });
      else Object.keys(DEF).forEach(k => { if (x[k] === undefined) x[k] = JSON.parse(JSON.stringify(DEF[k])); });
    });
    const ph = (q, z, n) => Array.from({ length: n }, (_, i) => {
      const iid = 'x' + q + z + i;
      st.inst[iid] = Object.assign(BLANK(), { iid, owner: q });
      return iid;
    });
    st.P.forEach((P, q) => {
      P.deck = ph(q, 'd', typeof P.deck === 'number' ? P.deck : 0);
      if (typeof P.hand === 'number') P.hand = ph(q, 'h', P.hand);
      if (!Array.isArray(P.armed)) P.armed = [];
    });
    st.shadow = { viewer: me };
    return st;
  }
  // Kartu pengganti (tanpa identitas)?
  const isHidden = (st, iid) => !!(st && st.inst[iid] && st.inst[iid].hidden);

  const api = { shadow, isHidden };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MHRSimShadow = api;
})(typeof window !== 'undefined' ? window : this);
