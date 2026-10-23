/* ===================================================================
   MHR DECK LAB — events-ui.js (v6.98, Tahap 3: halaman Events)
   ===================================================================
   Rute:
     #event          daftar event (live, pendaftaran dibuka, draft milik
                     organizer, selesai) + kotak admin "Organizers"
     #event/<uuid>   satu event: info, pendaftaran, Players, Pairings,
                     Standings, dan kontrol organizer
   Data & aturan: events.js (window.MHREvents = servis Supabase,
   window.MHRSwiss = mesin Swiss/Top cut). Skema: mhr_decklab_v698_events.sql.
   Dipanggil dari setPage('event') di index.html. Semua global index.html
   ($, t, DB, decodeDeck, encodeDeck, store, state, openDeckView, mxOpen,
   deckStats, CORDER, CMAP, isAccountAdmin) baru dipakai SAAT JALAN, jadi
   berkas ini aman dimuat sebelum skrip inline utama.
   Keputusan pemilik (16 Okt 2026): penyelenggara = admin + Organizer LGS;
   daftar online (akun) + walk-in; hasil match diisi organizer; decklist
   wajib & rahasia sampai event selesai, lalu deck Top-cut dipublikasikan
   ke Tournament Decks.
   v7.01 (19 Okt 2026): pendaftaran tamu tanpa akun (opsi per event,
   allow_guests), pengaturan decklist per event (decklist_mode: required /
   optional / none), dan cek legalitas decklist (50 kartu, maks. 2 warna,
   maks. 3 per nama karakter, semua kartu ada di database) — pemain ditolak,
   organizer diberi peringatan + tanda "Not legal" di tab Players.
   v7.05 (23 Okt 2026): SEMUA akun login boleh membuat event (rem: maks. 10
   event belum selesai per akun, lihat mhr_decklab_v705_open_events.sql).
   V.organizer kini berarti "organizer terverifikasi": tanpa batas event dan
   satu-satunya (selain admin) yang boleh publish ke Tournament Decks.
   =================================================================== */
(function(){
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q = s => document.querySelector(s);
  const S = () => window.MHRSwiss;
  const API = () => window.MHREvents;
  const BULAN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const tgl = s => { if(!s) return ''; const [y,m,d] = String(s).slice(0,10).split('-'); return `${+d} ${BULAN[+m-1]} ${y}`; };
  const pct = x => (x*100).toFixed(1) + '%';
  const STATUS = { draft:'Draft', registration:'Registration open', running:'Live', finished:'Finished' };
  const ERR = {
    NOT_LOGGED_IN:'Please log in first.', REGISTRATION_CLOSED:'Registration for this event is closed.',
    ALREADY_REGISTERED:'You are already registered for this event.', EVENT_FULL:'This event is full.',
    DECKLIST_REQUIRED:'A decklist is required.', NOT_REGISTERED:'You are not registered for this event.',
    EVENT_NOT_FINISHED:'Finish the event before publishing.', NOT_ALLOWED:'You are not allowed to do this.',
    NO_DECKLISTS:'None of the selected players has a decklist.', USER_NOT_FOUND:'No account with that username.',
    NAME_TAKEN:'That player name is already used in this event. Please add your initial or surname.',
    NAME_REQUIRED:'Please enter a player name.', GUESTS_NOT_ALLOWED:'This event only accepts registrations from MHR Deck Lab accounts.',
    BAD_DECKLIST:'That deck link / code isn\'t valid.', BAD_TOKEN:'This registration was not made on this device.',
    NOT_VERIFIED:'Publishing to Tournament Decks is only for verified organizers. Message @deteprtm on Instagram or TikTok to get your store verified.',
    '42501':'You already have 10 events that aren\'t finished yet. Finish or delete one before creating a new event.',
  };
  const errMsg = e => e ? (e.missing ? 'Events aren\'t switched on yet on this site.' : (ERR[e.code] || ERR[e.message] || ('Something went wrong: ' + (e.message || e.code || 'error')))) : '';

  const V = {                  // state halaman
    id: null, data: null, decks: {}, tab: null, round: null,
    me: null, myName: '', organizer: false, list: null, timer: null, busy: false,
    guest: null,               // v7.01 — pendaftaran tamu dari browser ini {player_id, display_name, deck_code, token}
  };
  const isAdmin = () => (typeof isAccountAdmin !== 'undefined' && !!isAccountAdmin);
  const canManage = ev => !!ev && (isAdmin() || (V.me && ev.organizer_id === V.me));

  async function whoAmI(){
    V.me = API() ? await API().me() : null;
    V.organizer = V.me ? (isAdmin() || await API().isOrganizer()) : false;
    if(V.me && !V.myName){
      try{ const s = await window.MHRAuth.getSession(); V.myName = await window.MHRAuth.getUsername(s) || ''; }catch(e){}
    }
  }

  /* ---------- deck helpers ---------- */
  function deckFromInput(sel, paste){
    const raw = (paste || '').trim();
    if(raw){
      const kode = (typeof cariKodeDeckDibagikan === 'function' && cariKodeDeckDibagikan(raw)) || raw.replace(/^.*#d=/, '');
      const r = kode ? decodeDeck(decodeURIComponent(kode)) : null;
      return r && (Object.keys(r.deck).length || r.unknown) ? { deck:r.deck, name:r.nama, unknown:r.unknown||0 } : { bad:true };
    }
    if(sel && store.decks[sel] && Object.keys(store.decks[sel]).length) return { deck: sel === store.active ? state.deck : store.decks[sel], name: sel, unknown:0 };
    return null;
  }
  /* v7.01 — legalitas decklist (Comprehensive Rules 101.1.b–d) + semua kartu harus ada
     di database kartu situs (kartu yang belum rilis / kode rusak = tidak legal) */
  function deckIssues(deck, unknown){
    const out = [];
    const tot = deckTotal(deck);
    if(unknown) out.push(`it contains ${unknown} card entr${unknown>1?'ies':'y'} that aren't in the card database (unreleased or invalid cards)`);
    if(tot !== 50) out.push(`it has ${tot} cards — a deck must have exactly 50 (rule 101.1.b)`);
    const cols = new Set(), per = {};
    for(const [no,q] of Object.entries(deck||{})){
      const c = DB.find(d=>d.no===no); if(!c) continue;
      cols.add(c.c); per[c.nm] = (per[c.nm]||0) + q;
    }
    /* v7.02 — kartu dari set yang belum rilis di Indonesia (SETS.rilis.id di data.js belum
       lewat, mis. SD05/SD06/PB02 sebelum 14 Nov 2026) belum legal di turnamen */
    const pre = {};
    for(const no of Object.keys(deck||{})){
      const c = DB.find(d=>d.no===no); const tg = c && typeof setBelumRilis === 'function' ? setBelumRilis(c.s) : '';
      if(tg) (pre[tg] = pre[tg] || new Set()).add(c.s);
    }
    Object.entries(pre).forEach(([tg, ss])=>out.push(`it uses ${[...ss].join('/')} cards, which aren't released in Indonesia until ${typeof tglRilis === 'function' ? tglRilis(tg) : tg}`));
    if(cols.size > 2) out.push(`it uses ${cols.size} colours (${[...cols].map(x=>t(x)).join(', ')}) — max 2 (rule 101.1.c)`);
    const over = Object.entries(per).filter(([,q])=>q > 3).map(([nm,q])=>{ const c = DB.find(d=>d.nm===nm); return `${c ? cardName(c) : nm} ×${q}`; });
    if(over.length) out.push(`more than 3 cards with the same character name: ${over.join(', ')} (rule 101.1.d)`);
    return out;
  }
  function codeIssues(code){ const r = code ? decodeDeck(code) : null; return r ? deckIssues(r.deck, r.unknown) : ['the decklist code is unreadable']; }
  const issuesText = list => list.map(x=>'• ' + x).join('\n');
  /* baca input decklist pada form. Hasil: {code:''} (tanpa decklist), {code, issues} atau {err} */
  function readDecklist(prefix, mode){
    if(mode === 'none') return { code:'' };
    const d = deckFromInput(q('#'+prefix+'Sel') && q('#'+prefix+'Sel').value, q('#'+prefix+'Paste') && q('#'+prefix+'Paste').value);
    if(d && d.bad) return { err:'That deck link / code couldn\'t be read. Copy the link again from the Deck Builder (Share).' };
    if(!d) return mode === 'required' ? { err:'A decklist is required: choose one of your decks or paste a deck link / code.' } : { code:'' };
    return { code: encodeDeck(d.deck, d.name), issues: deckIssues(d.deck, d.unknown) };
  }
  /* pemain: decklist tidak legal ditolak. organizer: boleh lanjut setelah konfirmasi */
  function legalOk(r, who){
    if(!r.issues || !r.issues.length) return true;
    if(who === 'organizer') return confirm(`This decklist is not legal:\n${issuesText(r.issues)}\n\nSave it anyway? It will be marked "Not legal" in the player list.`);
    alert(`This decklist can't be registered because:\n${issuesText(r.issues)}\n\nFix it in the Deck Builder, then try again.`);
    return false;
  }
  const deckTotal = d => Object.values(d||{}).reduce((s,x)=>s+x, 0);
  function archetype(deck){
    const s = deckStats(deck);
    return s.warna.map(c => t(c)).join(' - ') || 'Deck';
  }
  function myDeckOptions(){
    return Object.keys(store.decks).map(n=>{
      const d = n === store.active ? state.deck : store.decks[n];
      const tot = deckTotal(d);
      return tot ? `<option value="${E(n)}"${n===store.active?' selected':''}>${E(n)} · ${tot} cards</option>` : '';
    }).join('');
  }
  function deckPicker(prefix, mode){
    if(mode === 'none') return '';
    let opts = myDeckOptions();
    const opt = mode === 'optional';
    if(opt) opts = `<option value="" selected>— No decklist —</option>` + opts.replace(' selected', '');
    return `<div class="ev-deckpick">
      <label class="ev-f"><span>Decklist${opt ? ' (optional)' : ''}</span>
        <select id="${prefix}Sel">${opts || '<option value="">— no decks with cards —</option>'}</select></label>
      <label class="ev-f"><span>…or paste a deck link / code</span>
        <input id="${prefix}Paste" type="text" placeholder="https://mhrdecklab.com/#d=1.…"></label>
    </div>`;
  }

  /* ================= daftar event ================= */
  async function renderList(w){
    document.title = 'Events — MHR Deck Lab';
    w.innerHTML = `<div class="ev-head"><h2 class="nw-title">Events</h2>
      <p class="nw-lead">Swiss tournaments run by local game stores. Register online, follow pairings and standings live, and the Top-cut decks go straight to Tournament Decks.</p></div>
      <div class="ev-empty">Loading events…</div>`;
    if(!API() || !API().ready){ w.querySelector('.ev-empty').textContent = 'Events need an internet connection.'; return; }
    await whoAmI();
    const { data, error } = await API().list();
    if(state.page !== 'event' || V.id) return;
    if(error){ w.querySelector('.ev-empty').textContent = errMsg(error); return; }
    V.list = data;
    const grp = s => data.filter(e=>e.status === s);
    const mine = data.filter(e=>e.status === 'draft');
    const card = e => `<a class="ev-card st-${e.status}" href="#event/${E(e.id)}">
        <div class="ev-card-top"><span class="ev-badge b-${e.status}">${STATUS[e.status]}</span><span class="ev-date">${E(tgl(e.event_date))}${e.start_time?` · ${E(e.start_time)}`:''}</span></div>
        <b>${E(e.name)}</b>
        <span class="ev-muted">${E([e.lgs_name, e.location].filter(Boolean).join(' · ') || '—')}</span>
        <span class="ev-chips"><i>Bo${e.best_of}</i><i>${e.top_cut ? 'Top ' + e.top_cut : 'Swiss only'}</i>${e.rounds?`<i>${e.rounds} rounds</i>`:''}<i>👥 ${e.player_count||0}${e.max_players?` / ${e.max_players}`:''}</i>${e.allow_guests && e.status === 'registration' ? '<i>No account needed</i>' : ''}</span>
      </a>`;
    const sec = (title, arr, note) => arr.length ? `<section class="ev-sec"><div class="hm-sec-h"><h2>${title}</h2>${note||''}</div><div class="ev-grid">${arr.map(card).join('')}</div></section>` : '';
    w.innerHTML = `<div class="ev-head"><h2 class="nw-title">Events</h2>
      <p class="nw-lead">Swiss tournaments run by local game stores and players. Register online and follow pairings and standings live. Anyone with an account can create an event.</p>
      <div class="ev-actions">${V.me ? `<button class="nw-btn ev-main" data-ev="new">＋ New event</button>` : `<button class="nw-btn ev-main" data-ev="login">👤 Log in to create an event</button>`}</div></div>
      ${isAdmin() ? `<div class="ev-admin" id="evAdmin"><b>🛡 Verified organizers</b> <span class="ev-muted">Every account can create events (max 10 unfinished). Verified organizers have no limit and can publish Top-cut decks to Tournament Decks.</span><div id="evOrgList" class="ev-muted">Loading…</div>
        <div class="ev-row"><input id="evOrgUser" placeholder="Username"><input id="evOrgLgs" placeholder="Store name (LGS)"><button class="btn2" data-ev="orgAdd">Add organizer</button></div></div>` : ''}
      ${sec('🔴 Live now', grp('running'))}
      ${sec('📣 Registration open', grp('registration'))}
      ${sec('📝 Drafts', mine, '<span class="ev-muted">Only you can see these</span>')}
      ${sec('🏁 Finished', grp('finished'))}
      ${data.length ? '' : `<div class="ev-empty">No events yet.${V.me ? ' Create the first one with “＋ New event”.' : ' Check back soon, or log in to create the first one.'}</div>`}`;
    if(isAdmin()) renderOrganizers();
  }
  async function renderOrganizers(){
    const box = q('#evOrgList'); if(!box) return;
    const { data, error } = await API().listOrganizers();
    if(error){ box.textContent = errMsg(error); return; }
    box.innerHTML = data.length ? data.map(o=>`<div class="ev-org"><span><b>${E(o.username)}</b>${o.lgs_name?` · ${E(o.lgs_name)}`:''}</span><button class="btn2" data-ev="orgDel" data-uid="${E(o.user_id)}">Remove</button></div>`).join('') : 'No organizers yet.';
  }

  /* ================= form event (baru / edit) ================= */
  function openEventForm(ev){
    const e = ev || { name:'', event_date:new Date().toISOString().slice(0,10), start_time:'', location:'', lgs_name:'', notes:'', best_of:1, rounds:0, top_cut:0, max_players:null, decklist_mode:'required', allow_guests:false };
    const m = mxOpen(`<h3>${ev ? '✏️ Edit event' : '＋ New event'}</h3>
      <div class="ev-form">
        <label class="ev-f full"><span>Event name *</span><input id="efName" maxlength="120" value="${E(e.name)}" placeholder="Weekly Rush — Ogre Neverland"></label>
        <label class="ev-f"><span>Date *</span><input id="efDate" type="date" value="${E(e.event_date)}"></label>
        <label class="ev-f"><span>Start time</span><input id="efTime" maxlength="20" value="${E(e.start_time)}" placeholder="13:00"></label>
        <label class="ev-f"><span>Store (LGS)</span><input id="efLgs" maxlength="80" value="${E(e.lgs_name)}"></label>
        <label class="ev-f"><span>Location</span><input id="efLoc" maxlength="120" value="${E(e.location)}" placeholder="City / address"></label>
        <label class="ev-f"><span>Match format</span><select id="efBo"><option value="1"${e.best_of==1?' selected':''}>Best of 1</option><option value="3"${e.best_of==3?' selected':''}>Best of 3</option></select></label>
        <label class="ev-f"><span>Swiss rounds</span><select id="efRounds"><option value="0">Auto (by player count)</option>${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}"${e.rounds==n?' selected':''}>${n}</option>`).join('')}</select></label>
        <label class="ev-f"><span>Top cut</span><select id="efTop">${[0,2,4,8,16].map(n=>`<option value="${n}"${e.top_cut==n?' selected':''}>${n?'Top '+n:'None (Swiss only)'}</option>`).join('')}</select></label>
        <label class="ev-f"><span>Max players</span><input id="efMax" type="number" min="2" max="512" value="${e.max_players||''}" placeholder="No limit"></label>
        <label class="ev-f"><span>Decklist</span><select id="efDeck">${[['required','Required — legal 50-card deck'],['optional','Optional'],['none','Not used']].map(([v,l])=>`<option value="${v}"${(e.decklist_mode||'required')===v?' selected':''}>${l}</option>`).join('')}</select></label>
        <label class="ev-f ev-chk"><input type="checkbox" id="efGuests"${e.allow_guests?' checked':''}><span>Allow registration without an account (guests)</span></label>
        <label class="ev-f full"><span>Notes (entry fee, prizes, rules…)</span><textarea id="efNotes" rows="3" maxlength="1000">${E(e.notes)}</textarea></label>
      </div>
      <div class="mx-btns"><button class="btn2 main" data-ef="save">${ev ? 'Save changes' : 'Create as draft'}</button></div>
      <p class="mx-note">New events start as a draft that only you can see. Open registration when you're ready.
        A required decklist must be legal: exactly 50 cards, max 2 colours, max 3 cards with the same character name, cards released in Indonesia only.
        Guests register with just a name (and decklist if needed) and are marked "Guest" in your player list.</p>`);
    m.querySelector('[data-ef="save"]').addEventListener('click', async b=>{
      const btn = b.currentTarget;
      const row = { name:q('#efName').value.trim(), event_date:q('#efDate').value, start_time:q('#efTime').value.trim(),
        lgs_name:q('#efLgs').value.trim(), location:q('#efLoc').value.trim(), best_of:+q('#efBo').value,
        rounds:+q('#efRounds').value, top_cut:+q('#efTop').value, max_players: q('#efMax').value ? +q('#efMax').value : null,
        decklist_mode:q('#efDeck').value, allow_guests:q('#efGuests').checked,
        notes:q('#efNotes').value.trim() };
      if(!row.name || !row.event_date){ alert('Please fill in the event name and date.'); return; }
      if(ev) row.id = ev.id;
      btn.disabled = true;
      const { data, error } = await API().saveEvent(row);
      btn.disabled = false;
      if(error || !data){ alert(errMsg(error)); return; }
      mxClose();
      location.hash = '#event/' + data.id;
      if(ev) loadEvent(data.id);
    });
  }

  /* ================= satu event ================= */
  async function loadEvent(id, quiet){
    V.id = id;
    if(!quiet){ const w = q('#eventWrap'); if(w) w.innerHTML = `<a class="nw-back" href="#event">← All events</a><div class="ev-empty">Loading event…</div>`; }
    await whoAmI();
    const { data, error } = await API().get(id);
    if(V.id !== id || state.page !== 'event') return;
    const w = q('#eventWrap'); if(!w) return;
    if(error){ w.innerHTML = `<a class="nw-back" href="#event">← All events</a><div class="ev-empty">${E(errMsg(error))}</div>`; return; }
    if(!data){ w.innerHTML = `<a class="nw-back" href="#event">← All events</a><div class="ev-empty">Event not found.</div>`; return; }
    V.data = data;
    V.decks = {};
    const mgr = canManage(data.event);
    const mine = V.me && data.players.find(p=>p.user_id === V.me);
    if(mgr || mine){
      const r = await API().decklists(id);
      (r.data||[]).forEach(d=>{ V.decks[d.player_id] = d.deck_code; });
    }
    /* v7.01 — pendaftaran tamu dari browser ini */
    V.guest = null;
    if(API().guestOf && API().guestOf(id)){
      const g = await API().guestGet(id);
      if(g.data && data.players.some(p=>p.id === g.data.player_id)){
        V.guest = g.data;
        if(g.data.deck_code) V.decks[g.data.player_id] = g.data.deck_code;
      }
      if(V.id !== id) return;
    }
    if(!V.tab) V.tab = data.event.status === 'finished' ? 'standings' : data.event.status === 'running' ? 'pairings' : 'players';
    renderEvent();
    schedule();
  }
  function schedule(){
    clearTimeout(V.timer);
    const ev = V.data && V.data.event;
    if(ev && ev.status === 'running' && state.page === 'event')
      V.timer = setTimeout(()=>{
        /* jangan menimpa form yang sedang diisi (walk-in, dsb.) atau modal yang terbuka */
        const sibuk = [...document.querySelectorAll('#eventWrap input, #eventWrap textarea')].some(i=>i.value || document.activeElement === i);
        const modal = q('#mxModal'); const modalBuka = modal && !modal.hidden;
        if(document.visibilityState === 'visible' && !V.busy && !sibuk && !modalBuka) loadEvent(V.id, true); else schedule();
      }, 20000);
  }

  const pmap = () => new Map(V.data.players.map(p=>[p.id, p]));
  function rounds(){
    const m = V.data.matches;
    return [...new Set(m.map(x=>x.round))].sort((a,b)=>a-b).map(r=>({ r, stage: (m.find(x=>x.round===r)||{}).stage, ms: m.filter(x=>x.round===r).sort((a,b)=>a.table_no-b.table_no) }));
  }
  function roundLabel(R){
    if(R.stage !== 'top') return 'Round ' + R.r;
    const n = R.ms.length * 2;
    return n === 2 ? 'Final' : n === 4 ? 'Semifinals' : n === 8 ? 'Quarterfinals' : 'Top ' + n;
  }
  const opt = () => ({ bestOf: V.data.event.best_of });
  /* pemain milik pengunjung ini: lewat akun, atau lewat pendaftaran tamu di browser ini */
  function myPlayer(){
    if(!V.data) return null;
    return (V.me && V.data.players.find(p=>p.user_id === V.me)) || (V.guest && V.data.players.find(p=>p.id === V.guest.player_id)) || null;
  }
  const deckMode = ev => ev.decklist_mode || 'required';
  function plannedRounds(ev){ return ev.rounds || S().recommendedRounds(V.data.players.filter(p=>!p.dropped).length); }

  function renderEvent(){
    const w = q('#eventWrap'); if(!w || !V.data) return;
    const { event:ev, players } = V.data;
    const mgr = canManage(ev);
    const mine = myPlayer();
    document.title = `${ev.name} — Events — MHR Deck Lab`;
    const R = rounds();
    const active = players.filter(p=>!p.dropped).length;
    w.innerHTML = `<a class="nw-back" href="#event">← All events</a>
      <div class="ev-hero">
        <div class="ev-card-top"><span class="ev-badge b-${ev.status}">${STATUS[ev.status]}${ev.status==='running' && R.length?` · ${E(roundLabel(R[R.length-1]))}`:''}</span></div>
        <h1>${E(ev.name)}</h1>
        <div class="ev-muted">${E([tgl(ev.event_date) + (ev.start_time?` · ${ev.start_time}`:''), ev.lgs_name, ev.location].filter(Boolean).join(' · '))}</div>
        <div class="ev-chips"><i>Best of ${ev.best_of}</i><i>${ev.rounds ? ev.rounds + ' Swiss rounds' : 'Swiss rounds: auto'}</i><i>${ev.top_cut ? 'Top ' + ev.top_cut + ' cut' : 'No top cut'}</i><i>👥 ${players.length}${ev.max_players?` / ${ev.max_players}`:''} players</i><i>${deckMode(ev)==='required'?'Decklist required':deckMode(ev)==='optional'?'Decklist optional':'No decklists'}</i>${ev.allow_guests?'<i>No account needed</i>':''}</div>
        ${ev.notes ? `<p class="ev-notes">${E(ev.notes)}</p>` : ''}
        ${ev.tournament_id ? `<div class="ev-pub">✓ Top-cut decks are published on <a href="#tourney">Tournament Decks</a>.</div>` : ''}
        ${ev.status !== 'draft' || mgr ? `<div class="ev-row"><button class="btn2" data-ev="qr">📱 QR code</button><button class="btn2" data-ev="link">🔗 Copy link</button></div>` : ''}
      </div>
      ${mgr ? orgBar(ev, R, active) : ''}
      ${playerBox(ev, mine)}
      <div class="ev-tabs" role="tablist">
        ${[['players',`Players (${players.length})`],['pairings','Pairings'],['standings','Standings']].map(([k,l])=>`<button role="tab" data-evtab="${k}" aria-selected="${V.tab===k}">${l}</button>`).join('')}
      </div>
      <div class="ev-tabbody">${V.tab === 'players' ? playersTab(ev, mgr) : V.tab === 'pairings' ? pairingsTab(ev, mgr, mine, R) : standingsTab(ev)}</div>`;
  }

  /* ---------- kontrol organizer ---------- */
  function orgBar(ev, R, active){
    const last = R[R.length-1];
    const pending = last ? last.ms.filter(m=>!m.result).length : 0;
    const anyResult = last ? last.ms.some(m=>m.result && m.result !== 'bye') : false;
    const btn = (k, label, cls) => `<button class="btn2 ${cls||''}" data-ev="${k}">${label}</button>`;
    let main = '', info = '';
    if(ev.status === 'draft') main = btn('open', '📣 Open registration', 'main');
    else if(ev.status === 'registration'){
      main = btn('start', `▶ Start event (${active} players)`, 'main') + btn('close', 'Back to draft');
    } else if(ev.status === 'running'){
      if(pending) info = `Waiting for ${pending} result${pending>1?'s':''} in ${E(roundLabel(last))}.`;
      else if(ev.phase === 'swiss'){
        const planned = plannedRounds(ev);
        if(ev.current_round < planned) main = btn('next', `▶ Pair round ${ev.current_round + 1} of ${planned}`, 'main');
        else if(ev.top_cut) main = btn('top', `🏆 Start Top ${ev.top_cut}`, 'main');
        else main = btn('finish', '🏁 Finish event', 'main');
        if(ev.current_round < planned) main += btn('finish', '🏁 Finish now');
      } else {
        if(S().topComplete(V.data.matches)) main = btn('finish', '🏁 Finish event', 'main');
        else main = btn('topnext', '▶ Pair next top-cut round', 'main');
      }
      if(last && !anyResult) main += btn('repair', `↺ Re-pair ${E(roundLabel(last))}`);
      if(last) main += btn('undo', `Undo ${E(roundLabel(last))}`);
      main += btn('copy', '📋 Copy pairings');
    } else if(ev.status === 'finished'){
      /* v7.05 — membuat event terbuka untuk semua akun; publish ke Tournament Decks tetap organizer terverifikasi + admin */
      if(deckMode(ev) !== 'none' && V.organizer) main = btn('publish', ev.tournament_id ? '📤 Update Tournament Decks' : '📤 Publish Top decks to Tournament Decks', 'main');
      else if(deckMode(ev) !== 'none') info = 'Want the Top-cut decks on Tournament Decks? Only verified organizers can publish there. Message @deteprtm on Instagram or TikTok to get your store verified.';
      main += btn('reopen', 'Reopen event');
    }
    const edit = ev.status !== 'finished' ? btn('edit', '✏️ Edit') : '';
    const del = (ev.status === 'draft' || ev.status === 'registration' || ev.status === 'finished') ? btn('del', '🗑 Delete') : '';
    return `<div class="ev-org-bar"><div class="ev-org-t">🛠 Organizer</div><div class="ev-row">${main}${edit}${del}</div>${info?`<div class="ev-muted">${info}</div>`:''}</div>`;
  }

  /* ---------- kotak pemain (daftar / status) ---------- */
  function playerBox(ev, mine){
    const mode = deckMode(ev);
    const privacy = mode === 'none' ? '' : `<p class="ev-muted">Your decklist stays private — only the organizer can see it until the event is over.${mode === 'required' ? ' It must be legal: exactly 50 cards, max 2 colours, max 3 cards with the same character name, cards released in Indonesia only.' : ''}</p>`;
    if(ev.status === 'registration'){
      if(!mine && !V.me){
        if(!ev.allow_guests) return `<div class="ev-box">📝 Registration is open. <a href="#" data-ev="login">Log in</a> to register${mode === 'none' ? '' : ' with your decklist'}.</div>`;
        return `<div class="ev-box"><b>📝 Register for this event</b> <span class="ev-muted">— no account needed</span>
          <div class="ev-form">
            <label class="ev-f"><span>Player name</span><input id="egName" maxlength="40" placeholder="Name the organizer will call out"></label>
          </div>${deckPicker('eg', mode)}
          <div class="mx-btns"><button class="btn2 main" data-ev="guestReg">Register</button></div>
          ${privacy}<p class="ev-muted">Registering as a guest keeps your registration on this device only. Have an account? <a href="#" data-ev="login">Log in</a> instead to manage it from anywhere.</p></div>`;
      }
      if(!mine) return `<div class="ev-box"><b>📝 Register for this event</b>
        <div class="ev-form">
          <label class="ev-f"><span>Player name</span><input id="erName" maxlength="40" value="${E(V.myName)}"></label>
        </div>${deckPicker('er', mode)}
        <div class="mx-btns"><button class="btn2 main" data-ev="register">Register</button></div>
        ${privacy}</div>`;
      const code = V.decks[mine.id]; const d = code ? (decodeDeck(code)||{deck:{}}).deck : null;
      const deckTxt = mode === 'none' ? '' : (d ? ` · decklist: ${deckTotal(d)} cards` : ' · <span class="ev-muted">no decklist</span>');
      const isGuest = !mine.user_id;
      return `<div class="ev-box ok"><b>✓ You're registered as ${E(mine.display_name)}</b>${isGuest ? ' <span class="ev-tag">Guest</span>' : ''}${deckTxt}
        <div class="ev-row">${d ? `<button class="btn2" data-ev="myview">👁 View my decklist</button>` : ''}<button class="btn2" data-ev="myedit">${mode === 'none' ? 'Change name' : 'Change name / decklist'}</button><button class="btn2" data-ev="withdraw">Withdraw</button></div>
        ${isGuest ? `<p class="ev-muted">Guest registration: use this same device and browser to see your table or make changes. Not ${E(mine.display_name)}? <a href="#" data-ev="guestForget">Register someone else on this device</a>.</p>` : ''}</div>`;
    }
    if(ev.status === 'running' && mine){
      const R = rounds(); const last = R[R.length-1];
      const m = last && last.ms.find(x=>x.player1 === mine.id || x.player2 === mine.id);
      if(mine.dropped) return `<div class="ev-box">You have dropped from this event.</div>`;
      if(!m) return `<div class="ev-box">You're playing as <b>${E(mine.display_name)}</b>. Waiting for the next pairings…</div>`;
      const P = pmap(); const opp = m.player1 === mine.id ? m.player2 : m.player1;
      return `<div class="ev-box ok"><b>${E(roundLabel(last))} · Table ${m.table_no}</b> — ${opp ? `you vs <b>${E(P.get(opp)?.display_name||'?')}</b>` : '<b>bye</b> (counts as a win)'}${m.result && m.result!=='bye' ? ` · result entered` : ''}</div>`;
    }
    return '';
  }

  /* ---------- tab Players ---------- */
  function deckCell(p){
    const code = V.decks[p.id];
    if(!code) return deckMode(V.data.event) === 'required' ? '<span class="ev-warn">missing</span>' : '<span class="ev-muted">—</span>';
    const iss = codeIssues(code);
    const n = deckTotal((decodeDeck(code)||{deck:{}}).deck);
    return iss.length ? `<button class="ev-illegal" data-pl="why" data-id="${p.id}" title="${E(iss.join(' · '))}">⚠ Not legal</button> <span class="ev-muted">${n}</span>` : `✓ ${n}`;
  }
  function playersTab(ev, mgr){
    const ps = V.data.players;
    const mode = deckMode(ev), showDeck = mode !== 'none';
    const rows = ps.map((p,i)=>`<tr class="${p.dropped?'drop':''}">
      <td>${i+1}</td><td><b>${E(p.display_name)}</b>${p.is_guest?' <span class="ev-tag">Guest</span>':p.user_id?'':' <span class="ev-muted">(walk-in)</span>'}${p.dropped?` <span class="ev-warn">dropped${p.dropped_after?' after R'+p.dropped_after:''}</span>`:''}</td>
      ${mgr && showDeck ? `<td>${deckCell(p)}</td>` : ''}
      ${mgr ? `<td class="ev-acts">${V.decks[p.id]?`<button class="btn2" data-pl="view" data-id="${p.id}">👁 Deck</button>`:''}${showDeck?`<button class="btn2" data-pl="deck" data-id="${p.id}">Set deck</button>`:''}<button class="btn2" data-pl="rename" data-id="${p.id}">Rename</button>
        ${ev.status === 'running' ? `<button class="btn2" data-pl="${p.dropped?'undrop':'drop'}" data-id="${p.id}">${p.dropped?'Undrop':'Drop'}</button>` : ''}
        ${ev.status !== 'running' && ev.status !== 'finished' ? `<button class="btn2" data-pl="remove" data-id="${p.id}">🗑</button>` : ''}</td>` : ''}
    </tr>`).join('');
    const illegal = mgr && showDeck ? ps.filter(p=>V.decks[p.id] && codeIssues(V.decks[p.id]).length).length : 0;
    const add = mgr && ev.status !== 'finished' ? `<div class="ev-box"><b>＋ Add a walk-in player</b>
      <div class="ev-form"><label class="ev-f"><span>Player name</span><input id="ewName" maxlength="40"></label></div>${deckPicker('ew', mode)}
      <div class="mx-btns"><button class="btn2 main" data-ev="walkin">Add player</button></div></div>` : '';
    const warn = illegal ? `<div class="ev-box ev-box-warn">⚠ ${illegal} decklist${illegal>1?'s are':' is'} not legal. Tap “Not legal” to see why, then use “Set deck” to fix ${illegal>1?'them':'it'}.</div>` : '';
    return `${warn}${ps.length ? `<div class="ev-tblwrap"><table class="ev-tbl"><tr><th>#</th><th>Player</th>${mgr && showDeck?'<th>Decklist</th>':''}${mgr?'<th></th>':''}</tr>${rows}</table></div>` : '<div class="ev-empty">No players yet.</div>'}${add}`;
  }

  /* ---------- tab Pairings ---------- */
  function pairingsTab(ev, mgr, mine, R){
    if(!R.length) return `<div class="ev-empty">Pairings appear here once the event starts.</div>`;
    if(V.round == null || !R.find(x=>x.r === V.round)) V.round = R[R.length-1].r;
    const cur = R.find(x=>x.r === V.round), latest = R[R.length-1].r === V.round;
    const P = pmap();
    const st = S().standings(V.data.players, V.data.matches.filter(m=>m.stage === 'top' || m.round < V.round), opt());
    const pts = id => { const s = st.find(x=>x.id===id); return s ? s.mp : 0; };
    const nm = id => id ? E(P.get(id)?.display_name || '?') : '';
    const bo3 = ev.best_of === 3, top = cur.stage === 'top';
    const resBtns = m => {
      if(m.result === 'bye' || !m.player2) return '<span class="ev-muted">Bye</span>';
      if(!mgr || !latest || ev.status !== 'running') return resText(m);
      const opts = bo3 ? [['p1',2,0,'2-0'],['p1',2,1,'2-1'],...(top?[]:[['draw',1,1,'1-1']]),['p2',1,2,'1-2'],['p2',0,2,'0-2']]
                       : [['p1',1,0,'P1 wins'],...(top?[]:[['draw',0,0,'Draw']]),['p2',0,1,'P2 wins']];
      return `<span class="ev-res">${opts.map(([r,a,b,l])=>`<button data-res="${r}" data-g1="${a}" data-g2="${b}" data-mid="${m.id}" aria-pressed="${m.result===r && (!bo3 || (m.p1_games===a && m.p2_games===b))}">${l}</button>`).join('')}${top?'':`<button data-res="dl" data-g1="0" data-g2="0" data-mid="${m.id}" aria-pressed="${m.result==='dl'}" title="Double loss">DL</button>`}${m.result?`<button data-res="" data-mid="${m.id}" title="Clear result">✕</button>`:''}</span>`;
    };
    const rows = cur.ms.map(m=>{
      const me = mine && (m.player1 === mine.id || m.player2 === mine.id);
      const w1 = m.result === 'p1' || m.result === 'bye', w2 = m.result === 'p2';
      return `<tr class="${me?'me':''}"><td class="tn">${m.table_no}</td>
        <td class="${w1?'win':''}">${nm(m.player1)} <span class="ev-pts">${top?'':pts(m.player1)}</span></td>
        <td class="vs">${m.player2 ? 'vs' : ''}</td>
        <td class="${w2?'win':''}">${m.player2 ? `${nm(m.player2)} <span class="ev-pts">${top?'':pts(m.player2)}</span>` : '<span class="ev-muted">—</span>'}</td>
        <td>${resBtns(m)}</td></tr>`;
    }).join('');
    return `<div class="ev-rounds">${R.map(x=>`<button data-evround="${x.r}" aria-pressed="${x.r===V.round}">${E(roundLabel(x))}</button>`).join('')}</div>
      <div class="ev-tblwrap"><table class="ev-tbl ev-pair"><tr><th>Table</th><th>Player 1</th><th></th><th>Player 2</th><th>Result</th></tr>${rows}</table></div>
      ${top?'':'<p class="ev-muted">Points shown are before this round. Win 3 · Draw 1 · Loss 0 · Bye = win.</p>'}`;
  }
  function resText(m){
    if(!m.result) return '<span class="ev-muted">pending</span>';
    if(m.result === 'draw') return 'Draw' + (m.p1_games||m.p2_games ? ` ${m.p1_games}-${m.p2_games}` : '');
    if(m.result === 'dl') return 'Double loss';
    const g = (m.p1_games||m.p2_games) && V.data.event.best_of === 3 ? ` ${m.p1_games}-${m.p2_games}` : '';
    return (m.result === 'p1' ? 'P1 wins' : 'P2 wins') + g;
  }

  /* ---------- tab Standings ---------- */
  function standingsTab(ev){
    const { players, matches } = V.data;
    if(!matches.length) return `<div class="ev-empty">Standings appear after the first round.</div>`;
    const st = S().standings(players, matches, opt());
    const fin = ev.status === 'finished' || S().topComplete(matches);
    const pl = fin ? S().finalPlacements(players, matches, opt()) : null;
    const order = pl ? pl.map(x=>({ s:st.find(s=>s.id===x.id), place:x.label })) : st.map(s=>({ s, place:s.rank }));
    const rows = order.filter(x=>x.s).map(({s, place})=>`<tr class="${s.dropped?'drop':''}"><td class="tn">${E(place)}</td><td><b>${E(s.name)}</b>${s.dropped?' <span class="ev-warn">dropped</span>':''}</td>
      <td><b>${s.mp}</b></td><td>${s.w}-${s.l}-${s.d}</td><td>${pct(s.omw)}</td><td>${pct(s.gw)}</td><td>${pct(s.ogw)}</td></tr>`).join('');
    return `<div class="ev-tblwrap"><table class="ev-tbl"><tr><th>${fin?'Place':'Rank'}</th><th>Player</th><th>Pts</th><th>W-L-D</th><th>OMW%</th><th>GW%</th><th>OGW%</th></tr>${rows}</table></div>
      <details class="ev-help"><summary>ⓘ How are the tiebreakers calculated?</summary>
        <p>Players are ranked by <b>match points</b> (win 3 · draw 1 · loss 0 · bye 3). Players on the same points are separated, in this order, by:</p>
        <ol>
          <li><b>OMW% — opponents' match-win %.</b> For each opponent you played: their match points ÷ (3 × rounds they played), with a minimum of 33%. OMW% is the average over all your opponents. A tougher schedule = higher OMW%.</li>
          <li><b>GW% — your game-win %.</b> Your game points (3 per game won, 1 per drawn game) ÷ (3 × games played), minimum 33%. In Best of 1 every match is one game; a bye counts as ${ev.best_of===3?'a 2-0 win':'a 1-0 win'}.</li>
          <li><b>OGW% — opponents' game-win %.</b> The average of your opponents' GW%.</li>
        </ol>
        <p>Byes are not opponents, so they don't affect OMW% or OGW%. These are the standard tiebreakers used by most TCG organised play (e.g. Magic: The Gathering Tournament Rules, Appendix C).${ev.top_cut?' After the Swiss rounds, final places come from the top-cut bracket.':''}</p>
      </details>`;
  }

  /* ================= aksi ================= */
  async function act(fn){
    if(V.busy) return; V.busy = true;
    try{ await fn(); } finally { V.busy = false; }
    await loadEvent(V.id, true);
  }
  async function setStatus(patch){
    const { error } = await API().saveEvent({ id:V.data.event.id, ...patch });
    if(error){ alert(errMsg(error)); return false; }
    return true;
  }
  async function insertRound(rows){
    const { error } = await API().insertMatches(V.data.event.id, rows.map(r=>({ round:r.round, stage:r.stage, table_no:r.table_no, player1:r.player1, player2:r.player2||null, result:r.result||null, p1_games:0, p2_games:0 })));
    if(error){ alert(errMsg(error)); return false; }
    return true;
  }

  /* ================= v6.99 — QR code event =================
     Pustaka qrcode-generator (Kazuhiko Arase, MIT) disimpan lokal di qrcode.js
     dan baru dimuat saat tombol QR pertama kali ditekan. Kartu QR digambar di
     canvas (1080×1350, latar putih supaya mudah dipindai & dicetak), bisa
     diunduh PNG, dicetak, atau ditampilkan di layar/meja toko. */
  const eventUrl = ev => `${location.origin}/#event/${ev.id}`;
  let qrLoading = null;
  function loadQr(){
    if(window.qrcode) return Promise.resolve();
    if(!qrLoading) qrLoading = new Promise((ok, fail)=>{
      const sc = document.createElement('script'); sc.src = 'qrcode.js?v=6.99';
      sc.onload = ok; sc.onerror = ()=>{ qrLoading = null; fail(new Error('QR library failed to load')); };
      document.head.appendChild(sc);
    });
    return qrLoading;
  }
  function wrapText(ctx, text, maxW){
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    words.forEach(w=>{ const t2 = cur ? cur + ' ' + w : w; if(ctx.measureText(t2).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t2; });
    if(cur) lines.push(cur); return lines;
  }
  function qrCard(ev){
    const url = eventUrl(ev);
    const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    const n = qr.getModuleCount();
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#0E1216'; c.fillRect(0, 0, W, 150);
    c.fillStyle = '#F2B01E'; c.font = `800 46px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('SCAN FOR LIVE PAIRINGS & STANDINGS', W/2, 75);
    c.fillStyle = '#0E1216'; c.font = `800 54px ${font}`;
    const titleLines = wrapText(c, ev.name, W - 140).slice(0, 2);
    titleLines.forEach((l,i)=>c.fillText(l, W/2, 225 + i*64));
    c.fillStyle = '#4a5260'; c.font = `500 32px ${font}`;
    const meta = [tgl(ev.event_date) + (ev.start_time ? ` · ${ev.start_time}` : ''), ev.lgs_name].filter(Boolean).join(' · ');
    c.fillText(meta, W/2, 225 + titleLines.length*64 + 4);
    const size = 760, top = 380, cell = Math.floor(size / (n + 8)), real = cell * (n + 8), x0 = (W - real)/2 + cell*4, y0 = top + cell*4;
    c.fillStyle = '#000000';
    for(let r=0; r<n; r++) for(let k=0; k<n; k++) if(qr.isDark(r, k)) c.fillRect(x0 + k*cell, y0 + r*cell, cell, cell);
    c.fillStyle = '#4a5260'; c.font = `500 26px ${font}`;
    c.fillText(url.replace(/^https?:\/\//, ''), W/2, top + real + 40);
    c.fillStyle = '#0E1216'; c.font = `700 30px ${font}`;
    c.fillText('Register · Your table · Pairings · Standings', W/2, top + real + 100);
    c.fillStyle = '#8A94A3'; c.font = `500 26px ${font}`;
    c.fillText('mhrdecklab.com — fan-made Marvel Hero Rush tools', W/2, H - 48);
    return cv;
  }
  async function openQr(){
    const ev = V.data && V.data.event; if(!ev) return;
    try{ await loadQr(); }catch(e){ alert('Couldn\'t load the QR code generator. Please check your connection and try again.'); return; }
    const png = qrCard(ev).toDataURL('image/png');
    const fname = 'MHR_Event_QR_' + ev.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) + '.png';
    const m = mxOpen(`<h3>📱 QR code</h3>
      <div class="mx-sub">Players scan this to open the live pairings, standings and registration for <b>${E(ev.name)}</b>. Show it on a screen or print it for the tables.</div>
      <div class="ev-qr"><img src="${png}" alt="QR code for ${E(ev.name)}"></div>
      <div class="mx-btns">
        <a class="btn2 main" download="${E(fname)}" href="${png}">⬇ Download PNG</a>
        <button class="btn2" data-x="print">🖨 Print</button>
        <button class="btn2" data-x="link">🔗 Copy link</button>
      </div>`);
    m.querySelector('[data-x="print"]').addEventListener('click', ()=>{
      const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      document.body.appendChild(fr);
      const d = fr.contentWindow.document;
      d.open(); d.write(`<!doctype html><html><head><title>${E(ev.name)}</title><style>@page{margin:12mm}html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100vh}</style></head><body><img src="${png}"></body></html>`); d.close();
      fr.onload = ()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){} setTimeout(()=>fr.remove(), 60000); };
    });
    m.querySelector('[data-x="link"]').addEventListener('click', e=>copyLink(e.currentTarget));
  }
  function copyLink(btn){
    const url = eventUrl(V.data.event);
    if(typeof salinTeks === 'function') salinTeks(url, btn); else prompt('Copy:', url);
  }

  const handlers = {
    async qr(){ openQr(); },
    async link(b){ copyLink(b); },
    async new(){ openEventForm(null); },
    async edit(){ openEventForm(V.data.event); },
    async open(){ await act(()=>setStatus({ status:'registration' })); },
    async close(){ await act(()=>setStatus({ status:'draft' })); },
    async reopen(){ if(confirm('Reopen this event? You can then correct results and finish it again.')) await act(()=>setStatus({ status:'running' })); },
    async del(){
      if(!confirm('Delete this event with all players, pairings and decklists? This can\'t be undone. (Decks already published to Tournament Decks stay there.)')) return;
      const { error } = await API().removeEvent(V.data.event.id);
      if(error){ alert(errMsg(error)); return; }
      location.hash = '#event';
    },
    async start(){
      const ev = V.data.event; const act_ = V.data.players.filter(p=>!p.dropped);
      if(act_.length < 2){ alert('You need at least 2 players to start.'); return; }
      if(deckMode(ev) === 'required'){
        const missing = act_.filter(p=>!V.decks[p.id]).length;
        const illegal = act_.filter(p=>V.decks[p.id] && codeIssues(V.decks[p.id]).length).length;
        const parts = [missing ? `${missing} player(s) have no decklist` : '', illegal ? `${illegal} decklist(s) are not legal` : ''].filter(Boolean);
        if(parts.length && !confirm(`${parts.join(' and ')}. Start anyway?`)) return;
      }
      const planned = ev.rounds || S().recommendedRounds(act_.length);
      if(!confirm(`Start "${ev.name}" with ${act_.length} players, ${planned} Swiss round${planned>1?'s':''}${ev.top_cut?` and a Top ${ev.top_cut} cut`:''}? Registration will close.`)) return;
      await act(async()=>{
        const rows = S().pairSwiss(V.data.players, [], 1, opt());
        if(await insertRound(rows)) await setStatus({ status:'running', phase:'swiss', current_round:1, rounds:planned });
        V.tab = 'pairings'; V.round = null;
      });
    },
    async next(){
      const ev = V.data.event; const r = ev.current_round + 1;
      V.tab = 'pairings'; V.round = null;
      await act(async()=>{ if(await insertRound(S().pairSwiss(V.data.players, V.data.matches, r, opt()))) await setStatus({ current_round:r }); });
    },
    async top(){
      const ev = V.data.event; const r = ev.current_round + 1;
      V.tab = 'pairings'; V.round = null;
      const rows = S().pairTopFirst(V.data.players, V.data.matches, ev.top_cut, r, opt());
      if(!rows){ alert(`Not enough active players for a Top ${ev.top_cut}.`); return; }
      await act(async()=>{ if(await insertRound(rows)) await setStatus({ phase:'top', current_round:r }); });
    },
    async topnext(){
      const ev = V.data.event; const r = ev.current_round + 1;
      V.tab = 'pairings'; V.round = null;
      const rows = S().pairTopNext(V.data.matches, r);
      if(!rows){ alert('Enter every top-cut result first.'); return; }
      await act(async()=>{ if(await insertRound(rows)) await setStatus({ current_round:r }); });
    },
    async repair(){
      const R = rounds(); const last = R[R.length-1]; if(!last) return;
      if(!confirm(`Delete and re-pair ${roundLabel(last)}?`)) return;
      await act(async()=>{
        const { error } = await API().deleteRound(V.data.event.id, last.r); if(error){ alert(errMsg(error)); return; }
        const rest = V.data.matches.filter(m=>m.round !== last.r);
        const rows = last.stage === 'top'
          ? (S().topRounds(rest).length ? S().pairTopNext(rest, last.r) : S().pairTopFirst(V.data.players, rest, V.data.event.top_cut, last.r, opt()))
          : S().pairSwiss(V.data.players, rest, last.r, opt());
        if(rows) await insertRound(rows);
      });
    },
    async undo(){
      const R = rounds(); const last = R[R.length-1]; if(!last) return;
      if(!confirm(`Undo ${roundLabel(last)}? Its pairings and results will be deleted.`)) return;
      await act(async()=>{
        const { error } = await API().deleteRound(V.data.event.id, last.r); if(error){ alert(errMsg(error)); return; }
        const prev = R[R.length-2];
        await setStatus(prev ? { current_round:prev.r, phase: prev.stage === 'top' ? 'top' : 'swiss' } : { current_round:0, phase:'swiss', status:'registration' });
      });
    },
    async finish(){ if(confirm('Finish the event? Standings will be final.')){ V.tab = 'standings'; await act(()=>setStatus({ status:'finished' })); } },
    async copy(){
      const R = rounds(); const last = R[R.length-1]; if(!last) return;
      const P = pmap();
      const txt = `${V.data.event.name} — ${roundLabel(last)}\n` + last.ms.map(m=>`Table ${m.table_no}: ${P.get(m.player1)?.display_name||'?'} vs ${m.player2 ? (P.get(m.player2)?.display_name||'?') : 'BYE'}`).join('\n') + `\n\nLive pairings: ${location.origin}/#event/${V.data.event.id}`;
      if(typeof salinTeks === 'function') salinTeks(txt, q('[data-ev="copy"]')); else prompt('Copy:', txt);
    },
    async publish(){
      const { event:ev, players, matches } = V.data;
      const pl = S().finalPlacements(players, matches, opt());
      const n = ev.top_cut || (players.length >= 16 ? 8 : 4);
      const top = pl.slice(0, n).filter(x=>V.decks[x.id]).map(x=>({ player_id:x.id, pk:x.label, nm:archetype((decodeDeck(V.decks[x.id])||{deck:{}}).deck) }));
      if(!top.length){ alert(ERR.NO_DECKLISTS); return; }
      if(!confirm(`Publish the top ${top.length} decks of "${ev.name}" to Tournament Decks? Their decklists become public.`)) return;
      await act(async()=>{
        const { error } = await API().publish(ev.id, top);
        if(error){ alert(errMsg(error)); return; }
        if(typeof loadTournaments === 'function') loadTournaments(true);
        alert('Published! The decks are now on Tournament Decks.');
      });
    },
    async login(){ const b = q('#btnAccount'); if(b) b.click(); },
    async register(){
      const ev = V.data.event;
      const name = (q('#erName').value || '').trim();
      if(!name){ alert('Please enter your player name.'); return; }
      const r = readDecklist('er', deckMode(ev));
      if(r.err){ alert(r.err); return; }
      if(!legalOk(r, 'player')) return;
      await act(async()=>{ const { error } = await API().register(ev.id, name, '', r.code); if(error) alert(errMsg(error)); });
    },
    async guestReg(){
      const ev = V.data.event;
      const name = (q('#egName').value || '').trim();
      if(!name){ alert('Please enter your player name.'); return; }
      const r = readDecklist('eg', deckMode(ev));
      if(r.err){ alert(r.err); return; }
      if(!legalOk(r, 'player')) return;
      await act(async()=>{ const { error } = await API().registerGuest(ev.id, name, r.code); if(error) alert(errMsg(error)); });
    },
    async guestForget(){
      const me = myPlayer(); if(!me) return;
      if(!confirm(`This device will forget ${me.display_name}'s registration so someone else can register here. ${me.display_name} stays registered, but can only change or withdraw through the organizer. Continue?`)) return;
      API().forgetGuest(V.data.event.id); V.guest = null; renderEvent();
    },
    async myview(){ const me = myPlayer(); const c = me && V.decks[me.id]; if(c) openDeckView({...decodeDeck(c).deck}, `My decklist — ${V.data.event.name}`); },
    async myedit(){
      const me = myPlayer(); if(!me) return;
      const ev = V.data.event, mode = deckMode(ev), guest = !me.user_id;
      const m = mxOpen(`<h3>${mode === 'none' ? 'Change name' : 'Change name / decklist'}</h3><div class="ev-form"><label class="ev-f"><span>Player name</span><input id="eeName" maxlength="40" value="${E(me.display_name)}"></label></div>${deckPicker('ee', mode)}
        ${mode !== 'none' && V.decks[me.id] ? '<p class="mx-note">Leave the paste box empty and pick a deck to replace your decklist' + (mode === 'optional' ? ', or choose “No decklist” to remove it.' : '.') + '</p>' : ''}
        <div class="mx-btns"><button class="btn2 main" data-x="save">Save</button></div>`);
      m.querySelector('[data-x="save"]').addEventListener('click', async ()=>{
        const name = q('#eeName').value.trim();
        if(!name){ alert('Please enter your player name.'); return; }
        const r = readDecklist('ee', mode);
        if(r.err){ alert(r.err); return; }
        if(!legalOk(r, 'player')) return;
        const { error } = guest ? await API().guestUpdate(ev.id, name, r.code) : await API().updateRegistration(ev.id, name, '', r.code);
        if(error){ alert(errMsg(error)); return; }
        mxClose(); loadEvent(V.id, true);
      });
    },
    async withdraw(){
      const me = myPlayer(); if(!me || !confirm('Withdraw from this event?')) return;
      await act(async()=>{ const { error } = me.user_id ? await API().withdraw(V.data.event.id) : await API().guestWithdraw(V.data.event.id); if(error) alert(errMsg(error)); });
    },
    async walkin(){
      const ev = V.data.event;
      const name = (q('#ewName').value || '').trim();
      if(!name){ alert('Please enter the player name.'); return; }
      if(V.data.players.some(p=>p.display_name.trim().toLowerCase() === name.toLowerCase()) && !confirm(`There is already a player called "${name}". Add another one with the same name?`)) return;
      const r = readDecklist('ew', deckMode(ev));
      if(r.err){ alert(r.err); return; }
      if(!legalOk(r, 'organizer')) return;
      await act(async()=>{ const { error } = await API().addWalkIn(ev.id, name, '', r.code); if(error) alert(errMsg(error)); });
    },
    async orgAdd(){
      const u = q('#evOrgUser').value.trim(); if(!u) return;
      const { error } = await API().addOrganizer(u, q('#evOrgLgs').value.trim());
      if(error){ alert(errMsg(error)); return; }
      q('#evOrgUser').value = ''; q('#evOrgLgs').value = ''; renderOrganizers();
    },
    async orgDel(b){ if(confirm('Remove this organizer? Their existing events stay.')){ const { error } = await API().removeOrganizer(b.dataset.uid); if(error) alert(errMsg(error)); renderOrganizers(); } },
  };
  const playerActs = {
    why(p){ const c = V.decks[p.id]; if(c) alert(`${p.display_name}'s decklist is not legal:\n${issuesText(codeIssues(c))}`); },
    view(p){ const c = V.decks[p.id]; if(c) openDeckView({...decodeDeck(c).deck}, `${p.display_name} — ${V.data.event.name}`); },
    async deck(p){
      const ev = V.data.event, mode = deckMode(ev);
      const cur = V.decks[p.id], iss = cur ? codeIssues(cur) : [];
      const m = mxOpen(`<h3>Decklist for ${E(p.display_name)}</h3>
        ${iss.length ? `<div class="ev-box ev-box-warn">⚠ The current decklist is not legal:<br>${iss.map(x=>'• ' + E(x)).join('<br>')}</div>` : ''}
        ${deckPicker('ed', mode)}<div class="mx-btns"><button class="btn2 main" data-x="save">Save decklist</button>${cur && mode === 'optional' ? '<button class="btn2" data-x="rm">Remove decklist</button>' : ''}</div>`);
      m.querySelector('[data-x="save"]').addEventListener('click', async ()=>{
        const r = readDecklist('ed', 'required');
        if(r.err){ alert(r.err); return; }
        if(!legalOk(r, 'organizer')) return;
        const d = decodeDeck(r.code);
        const { error } = await API().setDecklist(ev.id, p.id, encodeDeck(d.deck, p.display_name));
        if(error){ alert(errMsg(error)); return; }
        mxClose(); loadEvent(V.id, true);
      });
      const rm = m.querySelector('[data-x="rm"]');
      if(rm) rm.addEventListener('click', async ()=>{
        if(!confirm(`Remove ${p.display_name}'s decklist?`)) return;
        const { error } = await API().removeDecklist(p.id);
        if(error){ alert(errMsg(error)); return; }
        mxClose(); loadEvent(V.id, true);
      });
    },
    async rename(p){ const n = prompt('Player name:', p.display_name); if(n && n.trim()) await act(async()=>{ const { error } = await API().updatePlayer(p.id, { display_name:n.trim().slice(0,40) }); if(error) alert(errMsg(error)); }); },
    async drop(p){ if(confirm(`Drop ${p.display_name}? They won't be paired in later rounds.`)) await act(async()=>{ const { error } = await API().updatePlayer(p.id, { dropped:true, dropped_after:V.data.event.current_round||null }); if(error) alert(errMsg(error)); }); },
    async undrop(p){ await act(async()=>{ const { error } = await API().updatePlayer(p.id, { dropped:false, dropped_after:null }); if(error) alert(errMsg(error)); }); },
    async remove(p){ if(confirm(`Remove ${p.display_name} from the event?`)) await act(async()=>{ const { error } = await API().removePlayer(p.id); if(error) alert(errMsg(error)); }); },
  };

  document.addEventListener('click', async e=>{
    if(!e.target.closest('#eventPage')) return;
    const b = e.target.closest('[data-ev]');
    if(b){ e.preventDefault(); const h = handlers[b.dataset.ev]; if(h) h(b); return; }
    const tab = e.target.closest('[data-evtab]');
    if(tab){ V.tab = tab.dataset.evtab; renderEvent(); return; }
    const rb = e.target.closest('[data-evround]');
    if(rb){ V.round = +rb.dataset.evround; renderEvent(); return; }
    const pl = e.target.closest('[data-pl]');
    if(pl){ const p = V.data.players.find(x=>x.id === pl.dataset.id); if(p && playerActs[pl.dataset.pl]) playerActs[pl.dataset.pl](p); return; }
    const res = e.target.closest('[data-res]');
    if(res){
      const r = res.dataset.res || null;
      res.closest('.ev-res').querySelectorAll('button').forEach(x=>x.disabled = true);
      await act(async()=>{ const { error } = await API().setResult(res.dataset.mid, r, +res.dataset.g1||0, +res.dataset.g2||0); if(error) alert(errMsg(error)); });
    }
  });

  window.renderEvents = function(sub){
    const w = q('#eventWrap'); if(!w) return;
    clearTimeout(V.timer);
    if(sub){ if(sub !== V.id){ V.tab = null; V.round = null; V.data = null; } loadEvent(sub); }
    else { V.id = null; V.data = null; renderList(w); }
  };
  window.eventIdFromHash = h => { const m = /^#event\/([0-9a-f-]{36})$/i.exec(h||''); return m ? m[1].toLowerCase() : null; };
  /* login/logout saat halaman Events terbuka → gambar ulang */
  setTimeout(()=>{ if(window.MHRAuth && window.MHRAuth.onAuthChange) window.MHRAuth.onAuthChange(()=>{ V.myName = ''; if(state.page === 'event') window.renderEvents(V.id); }); }, 0);
})();
