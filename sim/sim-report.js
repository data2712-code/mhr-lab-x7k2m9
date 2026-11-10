/* ===================================================================
   MHR BATTLE SIM — LAPOR BUG & FEEDBACK (sim-report.js)           riwayat #59
   ===================================================================
   Permintaan pemilik 9 Nov 2026: fitur melaporkan bug dan memberi feedback.
   Versi lokal (sekarang): formulir → laporan disimpan di perangkat (maks. 50) dan disalin / diunduh sebagai teks,
   supaya bisa dikirim ke admin (WhatsApp / email). Versi online (tahap O2): laporan yang sama dikirim langsung ke
   tabel Supabase `sim_feedback` (lihat rencana-versi-online.md bagian 10h); laporan yang tersimpan di perangkat
   bisa dikirim ulang dari sana.
   Yang ikut otomatis: versi mesin, tampilan (HP/desktop), ukuran layar, bahasa, browser, mode permainan, dan — bila
   dicentang — kode log permainan yang sedang berjalan/selesai (kode log sudah berisi seed & semua langkah).
   Tidak ada data pribadi yang diambil otomatis; kontak hanya bila pemain mengisinya sendiri.
   O2 (riwayat #63): di Battle Sim situs laporan dikirim langsung — dari permainan online lewat server (server ikut
   melampirkan kode log lengkapnya, termasuk kartu tersembunyi), selain itu ke tabel sim_feedback dengan akun yang login.
   Bila gagal / belum login, laporan tetap disimpan di perangkat dan disalin seperti versi lokal.
   =================================================================== */
(function () {
  'use strict';
  const KEY = 'mhrsim.reports.v1', MAX = 50;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } };
  const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); return true; } catch (e) { return false; } };
  let kind = 'bug';

  const online = () => window.MHRSimOnline && window.MHRSimOnline.host() ? window.MHRSimOnline : null;
  function gameInfo() {
    const U = window.MHRSimUI, S = window.MHRSim;
    const G = U && U.state ? U.state() : null, ui = U && U.ui ? U.ui() : null;
    const inGame = !!(G && $('game') && $('game').classList.contains('on'));
    return {
      inGame, code: inGame && !(ui && ui.online && ui.online.active()) ? S.exportLog(G) : '',
      mode: inGame && ui ? (ui.sandbox ? 'sandbox' : ui.replay ? 'replay' : ui.gmode || 'custom') : 'menu',
      turn: inGame ? G.turn : null, over: inGame ? !!G.result : null, engine: S ? S.VERSION : '?'
    };
  }
  function env() {
    return {
      view: innerWidth <= 820 ? 'phone' : 'desktop', screen: innerWidth + '×' + innerHeight,
      lang: (window.MHRSimI18N && window.MHRSimI18N.lang) || 'en', ua: navigator.userAgent
    };
  }
  function open(k) {
    kind = k === 'feedback' ? 'feedback' : 'bug';
    const gi = gameInfo(), n = load().length;
    const html = '<div class="rep"><h2>Report a bug / Send feedback</h2>' +
      '<div class="seg" data-repseg>' + [['bug', '🐞 Bug'], ['feedback', '💬 Feedback']].map(([v, l]) => '<button data-rep="kind" data-v="' + v + '"' + (v === kind ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div>' +
      '<label class="small muted" for="repMsg" id="repLbl">' + (kind === 'bug' ? 'What happened? What did you expect instead?' : 'Your feedback or idea') + '</label>' +
      '<textarea id="repMsg" rows="5" maxlength="4000" placeholder="' + (kind === 'bug' ? 'e.g. I attacked the Weakness with Hulk but no Rush Point was added' : 'e.g. The hand cards are too small on my phone') + '"></textarea>' +
      '<input id="repContact" maxlength="80" placeholder="Name / contact (optional)">' +
      (gi.inGame && gi.mode !== 'online' ? '<label class="small"><input type="checkbox" id="repLog" checked> Attach this game\'s log code (lets the team replay the game exactly)</label>' : '') +
      (gi.mode === 'online' ? '<p class="small muted">The server attaches the full log of this online game, so the team can replay it exactly (your opponent\'s hidden cards are only visible to the admins).</p>' : '') +
      '<p class="small muted">Also included: engine v' + esc(gi.engine) + ', screen, language and browser. Nothing else is collected.</p>' +
      (online() ? '<p class="small muted">The report is sent to the MHR Deck Lab team with your account. A copy is also kept on this device.' : '<p class="small muted">Local version: the report is saved on this device and copied, so you can send it to the MHR Deck Lab admin (WhatsApp or email). On mhrdecklab.com (Battle Sim) it is sent directly.') +
      (n ? ' ' + n + ' report(s) saved on this device.' : '') + '</p>' +
      '<div id="repErr" class="err"></div>' +
      '<div class="row"><button class="pri" data-rep="send">' + (online() ? 'Send report' : 'Save & copy report') + '</button><button data-rep="dl">Download (.txt)</button><button data-rep="close">Close</button></div></div>';
    $('ovBody').className = 'modal'; $('ovBody').innerHTML = html; $('ov').classList.add('on'); $('ov').style.background = '';
    if (window.MHRSimI18N) window.MHRSimI18N.apply();
    setTimeout(() => { const t = $('repMsg'); if (t) t.focus(); }, 50);
  }
  function build() {
    const msg = ($('repMsg').value || '').trim();
    if (!msg) { $('repErr').textContent = 'Please write a short description first.'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); return null; }
    const gi = gameInfo(), en = env(), withLog = !!($('repLog') && $('repLog').checked);
    const r = { id: 'r' + Date.now().toString(36), at: new Date().toISOString(), kind, msg, contact: ($('repContact').value || '').trim(),
      engine: gi.engine, mode: gi.mode, turn: gi.turn, over: gi.over, code: withLog ? gi.code : '', view: en.view, screen: en.screen, lang: en.lang, ua: en.ua, sent: false };
    return r;
  }
  function text(r) {
    return ['MHR Battle Sim — ' + (r.kind === 'bug' ? 'BUG REPORT' : 'FEEDBACK'), 'Date: ' + r.at, '', r.msg, '',
      r.contact ? 'Contact: ' + r.contact : 'Contact: -',
      'Engine: v' + r.engine + ' · Mode: ' + r.mode + (r.turn != null ? ' · Turn ' + r.turn + (r.over ? ' (game over)' : '') : ''),
      'View: ' + r.view + ' · Screen: ' + r.screen + ' · Language: ' + r.lang, 'Browser: ' + r.ua,
      r.code ? 'Log code: ' + r.code : 'Log code: -'].join('\n');
  }
  function copy(t, done) {
    const fb = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* abaikan */ } ta.remove(); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
  }
  function store(r) { const l = load(); if (!l.some(x => x.id === r.id)) l.unshift(r); save(l); }
  function onClick(e) {
    const t = e.target.closest('[data-rep]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    switch (t.dataset.rep) {
      case 'open': open(t.dataset.v); return;
      case 'kind': {
        kind = t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t));
        $('repLbl').textContent = kind === 'bug' ? 'What happened? What did you expect instead?' : 'Your feedback or idea';
        if (window.MHRSimI18N) window.MHRSimI18N.apply(); return;
      }
      case 'send': {
        const r = build(); if (!r) return; store(r);
        if (online()) {
          t.disabled = true; t.textContent = 'Sending…';
          online().sendReport(r).then(res => {
            if (res && res.ok) {
              r.sent = true; const l = load(); const x = l.find(y => y.id === r.id); if (x) x.sent = true; save(l);
              $('ovBody').querySelector('.row').innerHTML = '<p class="small" style="color:var(--gold);margin:0;flex:1 1 100%">✓ Sent. Thank you! The MHR Deck Lab team will look at it.</p><button data-rep="close">Close</button>';
              if (window.MHRSimI18N) window.MHRSimI18N.apply(); return;
            }
            const why = res && res.error === 'login' ? 'Log in on mhrdecklab.com to send reports directly.' : 'The report could not be sent' + (res && res.error && res.error !== 'offline' ? ' (' + res.error + ')' : '') + '.';
            copy(text(r), () => { $('ovBody').querySelector('.row').innerHTML = '<p class="small" style="color:var(--gold);margin:0;flex:1 1 100%">' + esc(why) + ' It is saved on this device and copied: paste it in WhatsApp or email to the admin.</p><button data-rep="close">Close</button>'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); });
          });
          return;
        }
        copy(text(r), () => { $('ovBody').querySelector('.row').innerHTML = '<p class="small" style="color:var(--gold);margin:0;flex:1 1 100%">✓ Saved on this device and copied. Paste it in WhatsApp or email to the admin.</p><button data-rep="close">Close</button>'; if (window.MHRSimI18N) window.MHRSimI18N.apply(); });
        return;
      }
      case 'dl': {
        const r = build(); if (!r) return; store(r);
        try {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([text(r)], { type: 'text/plain' }));
          a.download = 'mhr-battle-sim-' + r.kind + '-' + r.at.slice(0, 19).replace(/[:T]/g, '-') + '.txt';
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        } catch (er) { /* abaikan */ }
        return;
      }
      case 'close': $('ov').classList.remove('on'); return;
    }
  }
  document.addEventListener('click', onClick, true);
  window.MHRSimReport = { open, reports: load, text };
})();
