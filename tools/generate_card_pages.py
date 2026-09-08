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

PENTING — WAJIB dijalankan ulang setiap kali cards.js berubah (kartu baru,
rarity diperbaiki, dsb). Skrip ini TIDAK dijalankan otomatis oleh apa pun;
kalau lupa, halaman lama akan menampilkan data kartu yang sudah usang.

Cara pakai:
    python3 tools/generate_card_pages.py
(dijalankan dari root repo, mengharapkan cards.js ada di direktori yang
sama, dan menulis ke ./cards/<NO>.html)
"""
import html
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_JS = os.path.join(ROOT, 'cards.js')
OUT_DIR = os.path.join(ROOT, 'cards')
SITE = 'https://mhrdecklab.com'

def load_cards():
    """
    cards.js adalah kode JS asli (object literal tanpa quote di key, dst),
    bukan JSON murni -- cara paling andal untuk membacanya adalah benar-benar
    MENJALANKANNYA lewat Node (persis seperti verifikasi manual yang sudah
    dipakai sepanjang proyek ini: `global.window={}; require('./cards.js')`),
    lalu dump hasilnya sebagai JSON asli -- bukan coba tebak sintaksnya lewat
    regex yang gampang salah kalau ada koma/nilai bersarang.
    """
    node_script = (
        "global.window = {}; "
        f"require({json.dumps(CARDS_JS)}); "
        "const db = window.CARDS || window.DB || []; "
        "process.stdout.write(JSON.stringify(db));"
    )
    result = subprocess.run(['node', '-e', node_script], capture_output=True, text=True)
    if result.returncode != 0:
        print('Gagal menjalankan cards.js lewat Node:', result.stderr, file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)

def esc(s):
    return html.escape(str(s), quote=True)

def page_html(c):
    no = c['no']
    nm = c.get('nm') or no
    l = c.get('l', '-')
    r = c.get('r', '-')
    p = c.get('p', '-')
    f = c.get('f', '')
    desc = f"Lv{l} · Range {r} · Power {p}" + (f" · {f}" if f else "") + " — Marvel Hero Rush TCG (MHR Deck Lab, fan-made)"
    img_url = f"{SITE}/images/{no}.jpg"
    page_url = f"{SITE}/cards/{no}.html"
    redirect_url = f"{SITE}/#c={no}"
    title = f"{nm} ({no}) — MHR Deck Lab"

    return f"""<!DOCTYPE html>
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
  <div>Lv{esc(l)} · Range {esc(r)} · Power {esc(p)}</div>
  <a href="{esc(redirect_url)}">Buka di MHR Deck Lab →</a>
  <script>location.replace({json.dumps(redirect_url)});</script>
</body>
</html>
"""

def write_sitemap(cards, today):
    """
    Regenerasi sitemap.xml: URL utama situs + satu <url> per halaman kartu.
    Sengaja menimpa seluruhnya (bukan menambah) supaya tidak ada duplikat
    kalau skrip ini dijalankan berkali-kali setelah cards.js berubah.
    """
    urls = [("https://mhrdecklab.com/", "1.0", "weekly")]
    for c in sorted(cards, key=lambda x: x['no']):
        urls.append((f"https://mhrdecklab.com/cards/{c['no']}.html", "0.5", "monthly"))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, prio, freq in urls:
        lines.append(f"  <url>\n    <loc>{esc(loc)}</loc>\n    <lastmod>{today}</lastmod>\n"
                      f"    <changefreq>{freq}</changefreq>\n    <priority>{prio}</priority>\n  </url>")
    lines.append('</urlset>')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

def main():
    cards = load_cards()
    print(f"Ditemukan {len(cards)} kartu di cards.js")
    os.makedirs(OUT_DIR, exist_ok=True)
    written = 0
    for c in cards:
        no = c['no']
        with open(os.path.join(OUT_DIR, f"{no}.html"), 'w', encoding='utf-8') as f:
            f.write(page_html(c))
        written += 1
    print(f"Selesai: {written} halaman ditulis ke {OUT_DIR}/<NO>.html")

    import datetime
    today = datetime.date.today().isoformat()
    write_sitemap(cards, today)
    print(f"sitemap.xml diperbarui ({len(cards)+1} URL, lastmod {today})")

if __name__ == '__main__':
    main()
