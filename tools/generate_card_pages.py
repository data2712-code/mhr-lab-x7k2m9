#!/usr/bin/env python3
"""
generate_card_pages.py
=======================================================================
MHR Deck Lab — generator halaman statis per kartu.

Kenapa skrip ini ada: situs ini adalah single-page app (satu index.html
untuk semua kartu), jadi crawler link-preview WhatsApp/Telegram/dll (yang
TIDAK menjalankan JavaScript dan TIDAK mengirim fragment #... ke server)
tidak pernah bisa menampilkan gambar/nama kartu yang spesifik saat sebuah
link kartu dibagikan — yang muncul selalu preview generik situs.

Skrip ini membaca cards.js lalu menghasilkan satu halaman statis kecil per
kartu di cards/<NO>.html (rata/flat, BUKAN cards/<NO>/index.html -- sengaja
dipilih flat karena satu-satunya jalur deploy yang berfungsi di lingkungan
ini adalah upload manual lewat halaman GitHub "Upload files" yang ditarget
ke satu folder (github.com/.../upload/main/cards); jalur itu tidak bisa
membuat 288 folder terpisah sekaligus, tapi bisa menerima banyak file rata
langsung ke satu folder). Tiap halaman itu:
  1. Punya tag <meta og:title/og:description/og:image> sendiri-sendiri
     persis untuk kartu itu — supaya preview di WhatsApp dsb. menampilkan
     gambar & nama kartu yang benar.
  2. Langsung redirect (meta refresh + JS) balik ke index.html#c=<NO> agar
     pengunjung asli tetap mendarat di app penuh (lightbox kartu itu
     otomatis terbuka lewat handleCardLink() di index.html).

v6.87 (9 Oktober 2026):
  - Rush Point Card (window.RUSH_POINTS di cards.js) ikut dibuatkan halaman,
    dengan judul "Rush Point (<NO>)" dan deskripsi seri + rarity. Link
    #c=<NO> Rush Point sudah ditangani handleCardLink() sejak v6.86.
  - Halaman ditulis dengan akhir baris CRLF (sama dengan berkas lain di repo)
    dan HANYA ditulis ulang kalau isinya berubah — berkas yang sama persis
    tidak disentuh, jadi riwayat git cuma berisi halaman yang benar-benar
    berubah.
  - sitemap.xml: <lastmod> halaman yang isinya tidak berubah dipertahankan
    dari sitemap lama; halaman baru/berubah dan halaman utama memakai tanggal
    hari ini.

PENTING — WAJIB dijalankan ulang setiap kali cards.js berubah (kartu baru,
nama/trait/statistik diperbaiki, Rush Point baru, dsb). Skrip ini TIDAK
dijalankan otomatis oleh apa pun; kalau lupa, halaman lama akan menampilkan
data kartu yang sudah usang dan kartu baru tidak punya preview share.

Cara pakai:
    python3 tools/generate_card_pages.py
(dijalankan dari root repo, mengharapkan cards.js ada di direktori yang
sama, dan menulis ke ./cards/<NO>.html serta ./sitemap.xml)
"""
import datetime
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_JS = os.path.join(ROOT, 'cards.js')
OUT_DIR = os.path.join(ROOT, 'cards')
SITEMAP = os.path.join(ROOT, 'sitemap.xml')
SITE = 'https://mhrdecklab.com'
NL = '\r\n'   # akhir baris berkas yang ditulis (sama dengan isi repo)

def load_cards():
    """
    cards.js adalah kode JS asli (object literal tanpa quote di key, dst),
    bukan JSON murni -- cara paling andal untuk membacanya adalah benar-benar
    MENJALANKANNYA lewat Node (persis seperti verifikasi manual yang sudah
    dipakai sepanjang proyek ini: `global.window={}; require('./cards.js')`),
    lalu dump hasilnya sebagai JSON asli -- bukan coba tebak sintaksnya lewat
    regex yang gampang salah kalau ada koma/nilai bersarang.
    Mengembalikan (karakter, rush_point).
    """
    node_script = (
        "global.window = {}; "
        f"require({json.dumps(CARDS_JS)}); "
        "const db = window.CARDS || window.DB || []; "
        "const rp = window.RUSH_POINTS || []; "
        "process.stdout.write(JSON.stringify({db, rp}));"
    )
    result = subprocess.run(['node', '-e', node_script], capture_output=True, text=True)
    if result.returncode != 0:
        print('Gagal menjalankan cards.js lewat Node:', result.stderr, file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    return data['db'], data['rp']

def esc(s):
    return html.escape(str(s), quote=True)

def render(no, nm, desc, line2):
    """Kerangka halaman yang sama untuk karakter maupun Rush Point."""
    img_url = f"{SITE}/images/{no}.jpg"
    page_url = f"{SITE}/cards/{no}.html"
    redirect_url = f"{SITE}/#c={no}"
    title = f"{nm} ({no}) — MHR Deck Lab"

    text = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(nm)} ({esc(no)})">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(img_url)}">
<meta property="og:url" content="{esc(page_url)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{esc(page_url)}">
<meta http-equiv="refresh" content="0; url={esc(redirect_url)}">
<style>
  body{{background:#0E1216;color:#eee;font-family:system-ui,-apple-system,sans-serif;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       min-height:100vh;margin:0;padding:24px;text-align:center;gap:14px}}
  img{{width:200px;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.5)}}
  a{{color:#F2B01E;text-decoration:none;font-weight:700}}
</style>
</head>
<body>
  <img src="{esc(img_url)}" alt="{esc(nm)}">
  <div>{esc(nm)} · {esc(no)}</div>
  <div>{esc(line2)}</div>
  <a href="{esc(redirect_url)}">Buka di MHR Deck Lab →</a>
  <script>location.replace({json.dumps(redirect_url)});</script>
</body>
</html>
"""
    return text.replace('\n', NL)

def page_html(c):
    no = c['no']
    nm = c.get('nm') or no
    l = c.get('l', '-')
    r = c.get('r', '-')
    p = c.get('p', '-')
    f = c.get('f', '')
    stats = f"Lv{l} · Range {r} · Power {p}"
    desc = stats + (f" · {f}" if f else "") + " — Marvel Hero Rush TCG (MHR Deck Lab, fan-made)"
    return render(no, nm, desc, stats)

def rp_page_html(r):
    no = r['no']
    rar = ' / '.join(r.get('ra', []))
    line2 = f"Rush Point Card · {r.get('s', '')} · {rar}"
    desc = line2 + " — Marvel Hero Rush TCG (MHR Deck Lab, fan-made)"
    return render(no, 'Rush Point', desc, line2)

def read_text(path):
    try:
        with open(path, encoding='utf-8', newline='') as fh:
            return fh.read()
    except FileNotFoundError:
        return None

def old_lastmods():
    """{loc: lastmod} dari sitemap.xml yang sekarang (kosong kalau belum ada)."""
    s = read_text(SITEMAP) or ''
    return dict(re.findall(r'<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>', s))

def write_sitemap(nos, changed, today):
    """
    Regenerasi sitemap.xml: URL utama situs + satu <url> per halaman kartu
    (karakter dan Rush Point). Sengaja menimpa seluruhnya (bukan menambah)
    supaya tidak ada duplikat kalau skrip ini dijalankan berkali-kali.
    """
    lama = old_lastmods()
    urls = [(f"{SITE}/", "1.0", "weekly", today)]
    for no in sorted(nos):
        loc = f"{SITE}/cards/{no}.html"
        lm = today if (no in changed or loc not in lama) else lama[loc]
        urls.append((loc, "0.5", "monthly", lm))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio, freq, lm in urls:
        lines.append(f"  <url>{NL}    <loc>{esc(loc)}</loc>{NL}    <lastmod>{lm}</lastmod>{NL}"
                     f"    <changefreq>{freq}</changefreq>{NL}    <priority>{prio}</priority>{NL}  </url>")
    lines.append('</urlset>')
    with open(SITEMAP, 'w', encoding='utf-8', newline='') as fh:
        fh.write(NL.join(lines) + NL)
    return len(urls)

def main():
    cards, rps = load_cards()
    print(f"Ditemukan {len(cards)} kartu karakter dan {len(rps)} Rush Point di cards.js")
    os.makedirs(OUT_DIR, exist_ok=True)
    pages = [(c['no'], page_html(c)) for c in cards] + [(r['no'], rp_page_html(r)) for r in rps]
    nos = [no for no, _ in pages]
    if len(set(nos)) != len(nos):
        print('Nomor kartu ganda antara CARDS dan RUSH_POINTS — periksa cards.js', file=sys.stderr)
        sys.exit(1)
    changed, baru = [], []
    for no, text in pages:
        path = os.path.join(OUT_DIR, f"{no}.html")
        lama = read_text(path)
        if lama == text:
            continue
        (baru if lama is None else changed).append(no)
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text)
    print(f"Halaman: {len(pages)} total, {len(baru)} baru, {len(changed)} diperbarui, "
          f"{len(pages) - len(baru) - len(changed)} tidak berubah")
    if baru: print('  baru      :', ' '.join(baru))
    if changed: print('  diperbarui:', ' '.join(changed))

    today = datetime.date.today().isoformat()
    n = write_sitemap(nos, set(baru) | set(changed), today)
    print(f"sitemap.xml diperbarui ({n} URL, lastmod halaman baru/berubah {today})")

if __name__ == '__main__':
    main()
