"""
Tribik Auction - Local Server
=============================
Menjalankan form-form pelelangan mobil (Tribik Auction) lewat localhost
sehingga fitur kamera (KTP/SIM) & audio dapat berjalan (localhost = secure context).

Cara menjalankan:
    python server.py            # port 8000, browser terbuka otomatis
    python server.py 5500       # port kustom
    python server.py 8000 --no-browser

URL utama:
    http://localhost:8000/              -> halaman index (daftar ketiga form)
"""

import os
import sys
import time
import socket
import webbrowser
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Pastikan stdout pakai UTF-8 agar panah/curly quotes di log & banner tak
# crash di terminal Windows default (cp1252), dan line_buffering supaya
# banner + log request langsung terlihat (tidak ter-tampung di pipa/job).
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Form yang akan ditampilkan di halaman index
FORMS = [
    {
        "file": "form-pengajuan-cek-unit.html",
        "badge": "Form 1",
        "title": "Pengajuan Cek Unit",
        "desc": "Pilih unit mobil lelang & ajukan pengecekan unit.",
        "icon": "\U0001F50D",
    },
    {
        "file": "form-pengambilan-barang.html",
        "badge": "Form 2",
        "title": "Pengambilan Barang",
        "desc": "Pengajuan pengambilan barang/hasil lelang.",
        "icon": "\U0001F4E6",
    },
    {
        "file": "form-pengambilan-unit.html",
        "badge": "Form 3",
        "title": "Pengambilan Unit",
        "desc": "Pengajuan pengambilan unit mobil yang menang lelang.",
        "icon": "\U0001F697",
    },
]

INDEX_HTML = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
    <link rel="icon" href="./logo.png?v=5" type="image/png">
    <link rel="icon" href="./favicon.svg?v=5" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tribik Auction - Lelang Mobil</title>
<style>
  :root { --primary:#6366f1; --secondary:#8b5cf6; --bg:#0f172a; --card:rgba(255,255,255,.06); }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
    background:radial-gradient(1200px 800px at 15% 10%, #1e1b4b 0%, var(--bg) 55%, #020617 100%);
    color:#e2e8f0; padding:24px;
  }
  .wrap { max-width:920px; width:100%; text-align:center; }
    .logo { width:96px; margin:0 auto 8px; display:block; }
  .logo img { width:100%; height:auto; display:block; filter:drop-shadow(0 4px 14px rgba(99,102,241,.45)); }
  h1 { font-size:30px; margin:10px 0 6px; background:linear-gradient(90deg,#a5b4fc,#f0abfc);
       -webkit-background-clip:text; background-clip:text; color:transparent; }
  .tagline { color:#94a3b8; margin-bottom:28px; font-size:14px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; }
  .card {
    background:var(--card); border:1px solid rgba(255,255,255,.08); border-radius:16px;
    padding:26px 22px; text-align:left; text-decoration:none; color:inherit;
    backdrop-filter:blur(12px); transition:transform .18s, border-color .18s, box-shadow .18s;
    display:flex; flex-direction:column; gap:8px;
  }
  .card:hover { transform:translateY(-4px); border-color:var(--primary); box-shadow:0 10px 30px rgba(99,102,241,.25); }
  .card .icon { font-size:34px; }
  .badge { align-self:flex-start; font-size:11px; font-weight:700; letter-spacing:.5px;
           padding:3px 10px; border-radius:999px; background:rgba(99,102,241,.18); color:#c7d2fe; }
  .card h2 { font-size:18px; }
  .card p { font-size:13px; color:#94a3b8; flex:1; }
  .card .go { font-size:13px; color:#a5b4fc; font-weight:600; }
  .footer { margin-top:26px; color:#64748b; font-size:12px; }
  .footer code { background:rgba(255,255,255,.08); padding:2px 6px; border-radius:6px; color:#cbd5e1; }
</style>
</head>
<body>
  <div class="wrap">
        <div class="logo"><img src="./logo.png?v=5" alt="Tribik Auction"></div>
    <h1>Tribik Auction - Pelelangan Mobil</h1>
    <p class="tagline">Pilih form pengajuan yang diperlukan</p>
    <div class="grid">
      __CARDS__
    </div>
    <div class="footer">Server lokal aktif • data dikirim langsung ke WhatsApp • <code>localhost</code></div>
  </div>
</body>
</html>"""



def build_card(form):
    return (
        '<a class="card" href="' + form["file"] + '">\n'
        '      <span class="icon">' + form["icon"] + '</span>\n'
        '      <span class="badge">' + form["badge"] + '</span>\n'
        '      <h2>' + form["title"] + '</h2>\n'
        '      <p>' + form["desc"] + '</p>\n'
        '      <span class="go">Buka Form -></span>\n'
        '    </a>'
    )


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, fmt, *args):
        # Ringkas log: 127.0.0.1 GET /form-...html 200
        print("  -> %s %s" % (self.command, self.path))

    def end_headers(self):
        # Nonaktifkan cache agar perubahan langsung terlihat
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):
        route = self.path.split("?", 1)[0].split("#", 1)[0]

        # Rute utama -> portal aplikasi (portal.html)
        if route == "/" or route == "/index.html" or route == "/portal.html":
            portal_path = os.path.join(BASE_DIR, "portal.html")
            try:
                with open(portal_path, "rb") as fh:
                    body = fh.read()
            except OSError:
                body = b"<!DOCTYPE html><html><body><h1>portal.html belum dibuat</h1></body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Semua rute lain -> file statis di BASE_DIR
        super().do_GET()


class ThreadingHTTPServerV6(ThreadingHTTPServer):
    """Server yang bisa bind ke alamat IPv6 (::1)."""
    address_family = socket.AF_INET6


def _serve(srv):
    srv.serve_forever()


def main():
    port = 8000
    no_browser = False
    for arg in sys.argv[1:]:
        if arg == "--no-browser":
            no_browser = True
        elif arg.isdigit():
            port = int(arg)

    handler = partial(Handler, directory=BASE_DIR)
    servers = []

    # 1) IPv4 loopback  -> 127.0.0.1
    try:
        s4 = ThreadingHTTPServer(("127.0.0.1", port), handler)
        servers.append(("http://127.0.0.1:%d/" % port, s4))
    except OSError as e:
        print("  IPv4 bind gagal: %s" % e)

    # 2) IPv6 loopback  -> ::1 (agar 'localhost' tetap jalan di Windows,
    #    karena browser kadang me-resolve localhost ke ::1 terlebih dahulu)
    try:
        s6 = ThreadingHTTPServerV6(("::1", port), handler)
        servers.append(("http://[::1]:%d/" % port, s6))
    except OSError as e:
        print("  IPv6 bind dilewati: %s" % e)

    if not servers:
        print("  ERROR: tidak ada interface yang berhasil di-bind.")
        print("  Port %d mungkin sudah dipakai program lain." % port)
        sys.exit(1)

    print("=" * 56)
    print("  Tribik Auction - Local Server")
    print("=" * 56)
    print("  Lokasi file : %s" % BASE_DIR)
    for url, _ in servers:
        print("  URL index   : %s" % url)
    print("  Localhost   : http://localhost:%d/" % port)
    for i, f in enumerate(FORMS, 1):
        print("  Form %d      : http://localhost:%d/%s" % (i, port, f["file"]))
    print("-" * 56)
    print("  Tekan Ctrl+C untuk menghentikan server.")
    print("=" * 56)

    if not no_browser:
        threading.Timer(0.6, lambda: webbrowser.open("http://localhost:%d/" % port)).start()

    for _, srv in servers:
        threading.Thread(target=_serve, args=(srv,), daemon=True).start()

    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        print("\n  Server dihentikan.")
        for _, srv in servers:
            srv.server_close()


if __name__ == "__main__":
    main()

