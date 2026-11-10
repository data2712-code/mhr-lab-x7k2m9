/* ===================================================================
   MHR BATTLE SIM — EDITOR POSISI SANDBOX (sim-sandbox.js)   Tahap 1c · v0.7
   Semua teks yang tampil di layar berbahasa Inggris (riwayat #14).
   ===================================================================
   Menyusun posisi kedua pihak secara manual (kartu dari Deck masing-masing
   dipindah ke HAND, BATTLE, BASE, RETREAT, VOID, atau dipasang ke kartu lain),
   lalu memulai permainan dari Action Phase pemain giliran. Aturan & validasi
   tetap di sim.js (validatePosition / createGame({position})); berkas ini
   hanya mengubah objek posisi. Kode posisi: MHRPOS1.…
   =================================================================== */
(function () {
  'use strict';
  const S = window.MHRSim;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const COLOR = { Merah: '#E4442E', Kuning: '#F2B01E', Biru: '#3B87E8', Hijau: '#33A45C', Orange: '#E8821E', Purple: '#8B5CF6' };
  const ZN = { hand: 'HAND', ret: 'RETREAT', void: 'VOID', deck: 'Deck', base: 'BASE' };

  const E = { pos: null, sel: null, fromGame: false, src: ['sd01', 'sd01'], code: ['', ''], msg: '', err: '' };

  /* ---------------- membuka editor ---------------- */
  function open(pos, fromGame) {
    E.fromGame = !!fromGame; E.sel = null; E.msg = ''; E.err = '';
    if (pos) { E.pos = JSON.parse(JSON.stringify(pos)); normalize(E.pos); }
    else if (!E.pos) E.pos = S.emptyPosition([S.testDeckSD01(), S.testDeckSD01()], (Math.random() * 1e9) >>> 0, ['Player 1', 'Player 2']);
    if (E.pos.lostThisTurn) E.msg = 'Effects that applied only "this turn" in the game are not kept in a position.';
    delete E.pos.lostThisTurn;
    document.querySelector('.wrap').style.display = '';
    $('setup').style.display = 'none';
    $('sandbox').style.display = 'block';
    render();
    window.scrollTo(0, 0);
  }
  function close() {
    $('sandbox').style.display = 'none';
    if (E.fromGame && window.MHRSimUI.resumeGame()) return;
    $('setup').style.display = 'block';
  }
  function normalize(pos) {
    pos.v = 1; pos.names = pos.names || ['Player 1', 'Player 2'];
    pos.pl.forEach(pl => {
      ['deck', 'hand', 'ret', 'void', 'base'].forEach(z => { pl[z] = pl[z] || []; });
      pl.bat = pl.bat || {}; S.SLOTS.forEach(s => { pl.bat[s] = pl.bat[s] || null; });
      pl.rp = pl.rp | 0;
    });
  }

  /* ---------------- mengambil & menaruh kartu ---------------- */
  // sel = { p, z: 'deck'|'hand'|'ret'|'void'|'bat'|'base'|'att', i, h?: {z, i} (pemilik kartu terpasang) }
  function entryAt(pl, z, i) { return z === 'bat' ? pl.bat[i] : pl.base[i]; }
  function peek(sel) {
    const pl = E.pos.pl[sel.p];
    if (sel.z === 'att') return { no: entryAt(pl, sel.h.z, sel.h.i).att[sel.i] };
    if (sel.z === 'bat' || sel.z === 'base') return entryAt(pl, sel.z, sel.i);
    return { no: pl[sel.z][sel.i] };
  }
  function take(sel) {
    const pl = E.pos.pl[sel.p];
    if (sel.z === 'att') { const host = entryAt(pl, sel.h.z, sel.h.i); const no = host.att.splice(sel.i, 1)[0]; if (!host.att.length) delete host.att; return { no }; }
    if (sel.z === 'bat') { const e = pl.bat[sel.i]; pl.bat[sel.i] = null; return e; }
    if (sel.z === 'base') return pl.base.splice(sel.i, 1)[0];
    return { no: pl[sel.z].splice(sel.i, 1)[0] };
  }
  // Kartu terpasang ikut pindah hanya ke area FIELD lain; selain itu kembali ke bawah Deck.
  function dropAtt(pl, e) { (e.att || []).forEach(no => pl.deck.push(no)); delete e.att; }
  function hosts(p) {
    const pl = E.pos.pl[p], out = [];
    S.SLOTS.forEach(s => { const e = pl.bat[s]; if (e) out.push({ z: 'bat', i: s, e, lab: S.SLOT_NAME[s] }); });
    pl.base.forEach((e, i) => { if (!e.fd) out.push({ z: 'base', i, e, lab: 'BASE ' + (i + 1) }); });
    return out;
  }
  function sameSel(a, b) { return a && b && a.p === b.p && a.z === b.z && String(a.i) === String(b.i) && JSON.stringify(a.h || null) === JSON.stringify(b.h || null); }
  function moveTo(dest) {
    const sel = E.sel; if (!sel) return;
    const p = sel.p, pl = E.pos.pl[p];
    const src = peek(sel);
    // tujuan FIELD: periksa dulu sebelum mengambil kartu
    if (/^(F|W1|W2|B)$/.test(dest) && pl.bat[dest] && !(sel.z === 'bat' && sel.i === dest)) { E.err = S.SLOT_NAME[dest] + ' is already occupied. Remove that card first.'; return render(); }
    if ((dest === 'baseUp' || dest === 'baseDown') && sel.z !== 'base' && pl.base.length >= S.BASE_MAX) { E.err = 'The BASE already holds 6 cards (302.6.a).'; return render(); }
    let hostRef = null;
    if (dest.startsWith('att:')) {
      const [, hz, hi] = dest.split(':');
      hostRef = { z: hz, i: hz === 'base' ? +hi : hi };
      if (sel.z === hz && String(sel.i) === String(hostRef.i)) { E.err = 'A card cannot be attached to itself.'; return render(); }
    }
    const hostEntry = hostRef ? entryAt(pl, hostRef.z, hostRef.i) : null;
    const e = take(sel);
    const entry = { no: e.no };
    if (e.att && e.att.length) entry.att = e.att.slice();
    if (e.n) entry.n = 1;
    switch (dest) {
      case 'hand': case 'ret': case 'void': dropAtt(pl, entry); pl[dest].push(entry.no); break;
      case 'deckTop': dropAtt(pl, entry); pl.deck.unshift(entry.no); break;
      case 'deckBottom': dropAtt(pl, entry); pl.deck.push(entry.no); break;
      case 'baseUp': pl.base.push(entry); break;
      case 'baseDown': dropAtt(pl, entry); entry.fd = 1; pl.base.push(entry); break;
      default:
        if (hostEntry) { dropAtt(pl, entry); (hostEntry.att = hostEntry.att || []).push(entry.no); }
        else pl.bat[dest] = entry;               // area BATTLE: selalu terbuka (301.21.a)
    }
    E.sel = null; E.err = '';
    render();
  }

  /* ---------------- tampilan ---------------- */
  function chip(no, sel, extra, opts) {
    opts = opts || {};
    const c = S.card(no);
    const nm = c ? S.nameEn(c) : no;
    const on = sameSel(E.sel, sel);
    return '<span class="sbc' + (on ? ' on' : '') + (opts.fd ? ' fd' : '') + '" data-sb="sel" data-sel="' + esc(JSON.stringify(sel)) + '" data-no="' + esc(no) + '" title="' + esc(no + ' · ' + nm) + '">' +
      '<i style="background:' + (c && COLOR[c.c] || '#888') + '"></i>' + (c ? '<b>Lv' + c.l + '</b> ' : '') + esc(nm) + ' <small>' + esc(no) + '</small>' +
      (opts.fd ? ' <em>face-down</em>' : '') + (opts.n ? ' <em class="nw">new</em>' : '') + (extra || '') + '</span>';
  }
  function entryHTML(p, z, i, e) {
    if (!e) return '<span class="muted small">empty</span>';
    const sel = { p, z, i };
    const tools = (z === 'base' ? '<button class="sm" data-sb="fd" data-sel="' + esc(JSON.stringify(sel)) + '" title="Face-up / face-down">' + (e.fd ? 'Turn face-up' : 'Face-down') + '</button>' : '') +
      '<button class="sm" data-sb="new" data-sel="' + esc(JSON.stringify(sel)) + '" title="Placed on the FIELD this turn: cannot use BATTLE-BASE MOVE (303.2.a.3.1.3.3)">' + (e.n ? 'Not new' : 'New this turn') + '</button>' +
      '<button class="sm" data-sb="back" data-sel="' + esc(JSON.stringify(sel)) + '" title="Return to the bottom of the Deck">✕</button>';
    const att = (e.att || []).map((no, k) => chip(no, { p, z: 'att', i: k, h: { z, i } }, '<button class="sm x" data-sb="back" data-sel="' + esc(JSON.stringify({ p, z: 'att', i: k, h: { z, i } })) + '" title="Return to the bottom of the Deck">✕</button>')).join('');
    return '<div class="sbe">' + chip(e.no, sel, '', { fd: e.fd, n: e.n }) + '<span class="sbt">' + tools + '</span>' +
      (att ? '<div class="sbatt"><span class="muted small">Attached:</span> ' + att + '</div>' : '') + '</div>';
  }
  function listHTML(p, z) {
    const pl = E.pos.pl[p], arr = pl[z];
    if (!arr.length) return '<span class="muted small">empty</span>';
    return arr.map((no, i) => chip(no, { p, z, i }, z === 'deck' ? '' : '<button class="sm x" data-sb="back" data-sel="' + esc(JSON.stringify({ p, z, i })) + '" title="Return to the bottom of the Deck">✕</button>')).join('');
  }
  function destHTML(p) {
    if (!E.sel || E.sel.p !== p) return '<div class="sbdest muted small">Click a card (in the Deck or any zone) to choose where it goes.</div>';
    const pl = E.pos.pl[p], cur = peek(E.sel), c = S.card(cur.no);
    const b = (d, label, dis) => '<button data-sb="to" data-to="' + d + '"' + (dis ? ' disabled' : '') + '>' + label + '</button>';
    const fromBase = E.sel.z === 'base';
    let h = '<div class="sbdest"><div class="small"><b>' + esc(c ? S.nameEn(c) : cur.no) + '</b> → choose a destination:</div><div class="row">' +
      b('hand', 'HAND') +
      S.SLOTS.map(s => b(s, S.SLOT_NAME[s], !!pl.bat[s] && !(E.sel.z === 'bat' && E.sel.i === s))).join('') +
      b('baseUp', 'BASE face-up', !fromBase && pl.base.length >= S.BASE_MAX) +
      b('baseDown', 'BASE face-down', !fromBase && pl.base.length >= S.BASE_MAX) +
      b('ret', 'RETREAT') + b('void', 'VOID') + b('deckTop', 'Deck top') + b('deckBottom', 'Deck bottom') +
      '<button data-sb="cancel">Cancel</button></div>';
    const hs = hosts(p).filter(x => !(E.sel.z === x.z && String(E.sel.i) === String(x.i)));
    if (hs.length) h += '<div class="row"><span class="small muted">Attach to:</span>' + hs.map(x => b('att:' + x.z + ':' + x.i, esc(x.lab + ' · ' + S.nameEn(S.card(x.e.no))))).join('') + '</div>';
    if (E.sel.z === 'bat' || E.sel.z === 'base') {
      const e = entryAt(pl, E.sel.z, E.sel.i);
      if (e && e.att && e.att.length) h += '<div class="small muted">Its attached cards move with it to another FIELD area; anywhere else they go back to the bottom of the Deck.</div>';
    }
    return h + '</div>';
  }
  function playerHTML(p) {
    const pl = E.pos.pl[p];
    const count = pl.deck.length + pl.hand.length + pl.ret.length + pl.void.length +
      S.SLOTS.reduce((n, s) => n + (pl.bat[s] ? 1 + (pl.bat[s].att || []).length : 0), 0) + pl.base.reduce((n, e) => n + 1 + (e.att || []).length, 0);
    const rp = Array.from({ length: 9 }, (_, k) => '<option value="' + k + '"' + (pl.rp === k ? ' selected' : '') + '>' + k + '</option>').join('');
    // BATTLE disusun seperti papan: FRONT di atas, WING 1 & WING 2 di antara FRONT dan BACK, BACK di bawah
    const slot = s => '<div class="sbslot" data-s="' + s + '"><div class="zl">' + S.SLOT_NAME[s] + '</div>' + entryHTML(p, 'bat', s, pl.bat[s]) + '</div>';
    return '<div class="box sbp">' +
      '<h3>' + esc(E.pos.names[p]) + (E.pos.tp === p ? ' <span class="badge gold">turn player</span>' : '') + ' <span class="badge">' + count + ' cards</span></h3>' +
      '<div class="row"><label>Card pool</label><select data-sbf="src" data-p="' + p + '">' + ['sd01', 'sd02', 'sd03', 'sd04', 'bp01r', 'bp01y', 'bp01b', 'bp01g', 's4r', 's4y', 's4b', 's4g', 'spr', 'spy', 'spb', 'spg'].map(v => '<option value="' + v + '"' + (E.src[p] === v ? ' selected' : '') + '>' + (/^s4/.test(v) ? 'Stage 4 ' + ({ r: 'Red', y: 'Yellow', b: 'Blue', g: 'Green' })[v[2]] : /^sp/.test(v) ? 'SP01 ' + ({ r: 'Red', y: 'Yellow', b: 'Blue', g: 'Green' })[v[2]] : v.toUpperCase()) + ' test deck</option>').join('') + '<option value="code"' + (E.src[p] === 'code' ? ' selected' : '') + '>Deck code…</option></select>' +
      '<button data-sb="loadDeck" data-p="' + p + '" title="Puts every card of this deck back in the Deck (shuffled with the seed)">Reset to this deck</button></div>' +
      (E.src[p] === 'code' ? '<textarea data-sbf="code" data-p="' + p + '" placeholder="Paste a deck link/code from the mhrdecklab Deck Builder">' + esc(E.code[p]) + '</textarea>' : '') +
      '<div class="row"><label>Rush Points</label><select data-sbf="rp" data-p="' + p + '">' + rp + '</select>' +
      '<input data-sbf="add" data-p="' + p + '" placeholder="Card number, e.g. BP01-035" style="width:190px"><button data-sb="add" data-p="' + p + '">Add to Deck</button>' +
      '<button data-sb="shuffle" data-p="' + p + '">Shuffle Deck</button></div>' +
      destHTML(p) +
      '<div class="sbz"><div class="zl">HAND (' + pl.hand.length + ')</div><div class="sbl">' + listHTML(p, 'hand') + '</div></div>' +
      '<div class="sbz"><div class="zl">BATTLE</div><div class="sbbat">' + slot('F') + slot('W1') + slot('W2') + slot('B') + '</div></div>' +
      '<div class="sbz"><div class="zl">BASE (' + pl.base.length + '/6)</div><div class="sbl col">' + (pl.base.length ? pl.base.map((e, i) => entryHTML(p, 'base', i, e)).join('') : '<span class="muted small">empty</span>') + '</div></div>' +
      '<div class="sbz"><div class="zl">RETREAT (' + pl.ret.length + ')</div><div class="sbl">' + listHTML(p, 'ret') + '</div></div>' +
      '<div class="sbz"><div class="zl">VOID (' + pl.void.length + ')</div><div class="sbl">' + listHTML(p, 'void') + '</div></div>' +
      '<div class="sbz"><div class="zl">Deck, top → bottom (' + pl.deck.length + ')</div><div class="sbl deck">' + listHTML(p, 'deck') + '</div></div>' +
      '</div>';
  }
  function render() {
    const pos = E.pos;
    const errs = S.validatePosition(pos);
    const opt = (v, cur, lab) => '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>';
    const cnt = pos.cnt || { call: 0, deploy: 0 };
    $('sandbox').innerHTML =
      '<h1>Sandbox <span class="badge gold">LOCAL · Stage 1c</span></h1>' +
      '<p class="muted small">Build any position for both players, then play it from the start of the turn player\'s Action Phase (the Draw Phase is already done). Every card is visible and you control both players. Undo has no limit. The log code of a Sandbox game stores this position, so replays and bug reports play back exactly.</p>' +
      '<div class="box"><div class="row">' +
      '<label>Player 1 name</label><input data-sbf="name" data-p="0" value="' + esc(pos.names[0]) + '" style="width:140px">' +
      '<label>Player 2 name</label><input data-sbf="name" data-p="1" value="' + esc(pos.names[1]) + '" style="width:140px"></div>' +
      '<div class="row"><label>Turn player</label><select data-sbf="tp">' + opt(0, pos.tp, pos.names[0]) + opt(1, pos.tp, pos.names[1]) + '</select>' +
      '<label>Turn number</label><input data-sbf="turn" type="number" min="1" value="' + (pos.turn | 0) + '" style="width:80px">' +
      '<span class="small muted">Turn 1 = the first player\'s first turn (only 1 CALL that turn).</span></div>' +
      '<div class="row"><label>Card effects</label><span class="small muted" style="min-width:150px">Always on (one game mode)</span>' +
      '<label>Seed</label><input data-sbf="seed" value="' + (pos.seed >>> 0) + '" style="width:130px"><span class="small muted">Used by shuffles during the game.</span></div>' +
      '<div class="row"><label>Already used</label>CALL <input data-sbf="cc" type="number" min="0" max="2" value="' + (cnt.call | 0) + '" style="width:60px"> Base Deployment <input data-sbf="cd" type="number" min="0" max="1" value="' + (cnt.deploy | 0) + '" style="width:60px"><span class="small muted">this turn, before the position starts.</span></div>' +
      (E.msg ? '<p class="small" style="color:#ffe3a1">' + esc(E.msg) + '</p>' : '') +
      (E.err ? '<p class="err">' + esc(E.err) + '</p>' : '') +
      (errs.length ? '<div class="err">The position cannot start yet:\n- ' + errs.map(esc).join('\n- ') + '</div>' : '<p class="small" style="color:#9fe0b2">Position is valid.</p>') +
      '<div class="row"><button class="pri" data-sb="start"' + (errs.length ? ' disabled' : '') + '>Start from this position</button>' +
      '<button data-sb="copy">Copy position code</button>' +
      '<button data-sb="close">' + (E.fromGame ? 'Back to the game' : 'Back to the menu') + '</button></div>' +
      '<div class="row"><input id="sbCode" placeholder="Paste a MHRPOS1.… position code" style="flex:1;min-width:220px"><button data-sb="loadCode">Load position code</button></div>' +
      '</div>' +
      '<div class="sbgrid">' + playerHTML(0) + playerHTML(1) + '</div>';
  }

  /* ---------------- input ---------------- */
  function parseSel(t) { try { return JSON.parse(t.dataset.sel); } catch (e) { return null; } }
  function deckList(p) {
    if (/^(sd0[1-4]|bp01[rybg]|s4[rybg]|sp[rybg])$/.test(E.src[p])) return { list: S.testDeck(E.src[p].toUpperCase()) };
    const d = S.decodeDeckCode(E.code[p]);
    if (!d) return { err: E.pos.names[p] + ': the deck code could not be read.' };
    return d;
  }
  function onClick(ev) {
    const t = ev.target.closest('[data-sb]');
    if (!t || !$('sandbox').contains(t)) return;
    const a = t.dataset.sb, pos = E.pos;
    E.err = '';
    switch (a) {
      case 'sel': {
        if (ev.target.closest('button')) return;
        const s = parseSel(t);
        E.sel = sameSel(E.sel, s) ? null : s; render(); return;
      }
      case 'to': moveTo(t.dataset.to); return;
      case 'cancel': E.sel = null; render(); return;
      case 'back': { E.sel = parseSel(t); moveTo('deckBottom'); return; }
      case 'fd': {
        const s = parseSel(t), pl = pos.pl[s.p], e = pl.base[s.i];
        if (e.fd) delete e.fd; else { dropAtt(pl, e); e.fd = 1; }
        E.sel = null; render(); return;
      }
      case 'new': {
        const s = parseSel(t), e = entryAt(pos.pl[s.p], s.z, s.i);
        if (e.n) delete e.n; else e.n = 1;
        render(); return;
      }
      case 'shuffle': {
        const p = +t.dataset.p, d = pos.pl[p].deck;
        let r = (pos.seed >>> 0) ^ (d.length * 2654435761);
        for (let i = d.length - 1; i > 0; i--) { r = (Math.imul(r ^ (r >>> 15), 2246822507) + 0x9e3779b9) >>> 0; const j = r % (i + 1); [d[i], d[j]] = [d[j], d[i]]; }
        E.sel = null; render(); return;
      }
      case 'loadDeck': {
        const p = +t.dataset.p, d = deckList(p);
        if (d.err) { E.err = d.err; render(); return; }
        const fresh = S.emptyPosition([d.list, d.list], pos.seed, pos.names).pl[p];
        fresh.rp = pos.pl[p].rp;
        pos.pl[p] = fresh;
        E.msg = E.pos.names[p] + ': every card of the deck is back in the Deck' + (d.unknown ? ' (' + d.unknown + ' unknown card code(s) skipped)' : '') + (d.hidden ? ' (' + d.hidden + ' SD05/SD06/PB02 card(s) skipped: not released in Indonesia yet)' : '') + '.';
        E.sel = null; render(); return;
      }
      case 'add': {
        const p = +t.dataset.p, inp = document.querySelector('#sandbox [data-sbf="add"][data-p="' + p + '"]');
        const no = String(inp.value || '').trim().toUpperCase();
        if (!S.card(no)) { E.err = S.isHiddenNo(no) ? S.HIDDEN_MSG + ': ' + no + '.' : 'Unknown card number: ' + (no || '(empty)') + '.'; render(); return; }
        pos.pl[p].deck.push(no); E.msg = S.nameEn(S.card(no)) + ' (' + no + ') added to the bottom of ' + pos.names[p] + "'s Deck."; render(); return;
      }
      case 'start': {
        const errs = window.MHRSimUI.startSandbox(JSON.parse(JSON.stringify(pos)));
        if (errs.length) { E.err = errs.join('\n'); render(); return; }
        $('sandbox').style.display = 'none';
        return;
      }
      case 'copy': {
        const code = S.exportPosition(pos);
        const box = $('sbCode');
        const done = () => { E.msg = 'Position code copied.'; render(); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => { box.value = code; box.select(); });
        else { box.value = code; box.select(); }
        return;
      }
      case 'loadCode': {
        const o = S.parsePosition($('sbCode').value);
        if (!o || !Array.isArray(o.pl) || o.pl.length !== 2) { E.err = 'Position code could not be read (it must start with MHRPOS1.).'; render(); return; }
        normalize(o); delete o.lostThisTurn;
        E.pos = o; E.sel = null; E.msg = 'Position code loaded.'; render(); return;
      }
      case 'close': close(); return;
    }
  }
  function onChange(ev) {
    const t = ev.target.closest('[data-sbf]');
    if (!t || !$('sandbox').contains(t)) return;
    const f = t.dataset.sbf, p = +t.dataset.p, pos = E.pos;
    switch (f) {
      case 'name': pos.names[p] = t.value || 'Player ' + (p + 1); break;
      case 'tp': pos.tp = +t.value; break;
      case 'turn': pos.turn = Math.max(1, parseInt(t.value, 10) || 1); break;
      case 'x': pos.x = +t.value; break;
      case 'seed': { const v = t.value.trim(); pos.seed = /^\d+$/.test(v) ? (+v >>> 0) : S.seedFromString(v); break; }
      case 'cc': pos.cnt = Object.assign({ call: 0, deploy: 0 }, pos.cnt, { call: Math.max(0, parseInt(t.value, 10) || 0) }); break;
      case 'cd': pos.cnt = Object.assign({ call: 0, deploy: 0 }, pos.cnt, { deploy: Math.max(0, Math.min(1, parseInt(t.value, 10) || 0)) }); break;
      case 'rp': pos.pl[p].rp = +t.value; break;
      case 'src': E.src[p] = t.value; break;
      case 'code': E.code[p] = t.value; return;   // jangan gambar ulang saat mengetik
      case 'add': return;
    }
    render();
  }

  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  window.MHRSandbox = { open, state: () => E };
})();
