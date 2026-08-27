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
import re
import sys
import json
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
    <link rel="icon" href="./logo.png?v=6" type="image/png">
    <link rel="icon" href="./favicon.svg?v=6" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tribik Auction - Lelang Mobil</title>
<style>
  :root { --primary:#ff5252; --secondary:#a70000; --bg:#0b1020; --card:rgba(255,255,255,.06); --tint:255,82,82; --glowA:#2a1015; --glowB:#050810; --hA:#ffbaba; --hB:#ff7b7b; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:'Segoe UI', system-ui, -apple-system, sans-serif;
    background:radial-gradient(1200px 800px at 15% 10%, var(--glowA) 0%, var(--bg) 55%, var(--glowB) 100%);
    color:#e2e8f0; padding:24px;
  }
  .wrap { max-width:920px; width:100%; text-align:center; }
    .logo { width:96px; margin:0 auto 8px; display:block; }
  .logo img { width:100%; height:auto; display:block; filter:drop-shadow(0 4px 14px rgba(var(--tint),.45)); }
  h1 { font-size:30px; margin:10px 0 6px; background:linear-gradient(90deg,var(--hA),var(--hB));
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
  /* ====== Tema Warna ====== */
  html[data-color="biru"]{--primary:#38bdf8;--secondary:#1d4ed8;--bg:#081121;--tint:56,189,248;--glowA:#0b1a33;--glowB:#04070f;--hA:#bae6fd;--hB:#7dd3fc}
  html[data-color="hijau"]{--primary:#34d399;--secondary:#047857;--bg:#071510;--tint:52,211,153;--glowA:#0a2418;--glowB:#040a08;--hA:#a7f3d0;--hB:#6ee7b7}
  html[data-color="ungu"]{--primary:#a78bfa;--secondary:#6d28d9;--bg:#100b21;--tint:167,139,250;--glowA:#1d1233;--glowB:#07040f;--hA:#ddd6fe;--hB:#c4b5fd}
  html[data-color="oranye"]{--primary:#fb923c;--secondary:#c2410c;--bg:#170f08;--tint:251,146,60;--glowA:#2a1708;--glowB:#0d0704;--hA:#fed7aa;--hB:#fdba74}
  html[data-color="tosca"]{--primary:#2dd4bf;--secondary:#0f766e;--bg:#061413;--tint:45,212,191;--glowA:#0a2420;--glowB:#040a09;--hA:#99f6e4;--hB:#5eead4}
  .cdots{display:flex;gap:9px;justify-content:center;margin:0 auto 12px;flex-wrap:wrap}
  .cdots button{width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.85);cursor:pointer;padding:0;box-shadow:0 0 0 1px rgba(0,0,0,.25);transition:transform .15s, box-shadow .15s}
  .cdots button:hover{transform:scale(1.2)}
  .cdots button.active{box-shadow:0 0 0 3px rgba(var(--tint),.45)}
</style>
</head>
<body>
  <div class="wrap">
        <div class="logo"><img src="./logo.png?v=6" alt="Tribik Auction"></div>
    <div class="cdots" id="cdots"></div>
    <h1>Tribik Auction - Pelelangan Mobil</h1>
    <p class="tagline">Pilih form pengajuan yang diperlukan</p>
    <div class="grid">
      __CARDS__
    </div>
    <div class="footer">Server lokal aktif • data dikirim langsung ke WhatsApp • <code>localhost</code></div>
  </div>
  <script>(function(){var ck="tb_color",cv="merah";try{var v=localStorage.getItem(ck);if(v)cv=v}catch(e){}document.documentElement.setAttribute("data-color",cv);var D=[["merah","#ff5252","Merah Tribik"],["biru","#38bdf8","Biru Samudra"],["hijau","#34d399","Hijau Zamrud"],["ungu","#a78bfa","Ungu Nebula"],["oranye","#fb923c","Oranye Senja"],["tosca","#2dd4bf","Tosca Segar"]];document.addEventListener("DOMContentLoaded",function(){var box=document.getElementById("cdots");if(!box)return;for(var i=0;i<D.length;i++){(function(d){var b=document.createElement("button");b.type="button";b.style.background=d[1];b.title=d[2];if(d[0]===cv)b.className="active";b.setAttribute("aria-label","Tema "+d[2]);b.addEventListener("click",function(){cv=d[0];document.documentElement.setAttribute("data-color",d[0]);try{localStorage.setItem(ck,d[0])}catch(e){}var a=box.querySelectorAll("button");for(var j=0;j<a.length;j++)a[j].className="";b.className="active"});box.appendChild(b)})(D[i])}});})();</script>
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

    def _send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/sheet-proxy":
            return self._sheet_proxy()
        if route != "/api/fix-endpoint":
            self._send_json(404, {"ok": False, "error": "rute tidak dikenal"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        raw = self.rfile.read(length).decode("utf-8", "replace") if length else ""
        try:
            data = json.loads(raw or "{}")
        except Exception:
            data = {}
        ep = str(data.get("endpoint", "")).strip()
        if not (ep.startswith("https://script.google.com/macros/s/") and ep.endswith("/exec") and len(ep) < 300):
            self._send_json(400, {"ok": False,
                "error": "URL tidak valid — bentuk yang benar: https://script.google.com/macros/s/…/exec"})
            return
        updated, errors = [], []
        # portal.html (kutip tunggal)
        try:
            pp = os.path.join(BASE_DIR, "portal.html")
            s = open(pp, encoding="utf-8").read()
            s2, n = re.subn(r"const SHEET_ENDPOINT = 'https://script\.google\.com/macros/s/[^']*/exec';",
                            "const SHEET_ENDPOINT = '" + ep + "';", s, count=1)
            if n:
                open(pp, "w", encoding="utf-8", newline="").write(s2)
                updated.append("portal.html")
            else:
                errors.append("portal.html: konstanta SHEET_ENDPOINT tidak ditemukan")
        except Exception as e:
            errors.append("portal.html: " + str(e))
        self._send_json(200, {"ok": not errors, "updated": updated, "errors": errors, "endpoint": ep})

    def _sheet_proxy(self):
        """Jembatan tanpa-CORS: portal -> server lokal -> Apps Script -> balasan JSON ke portal."""
        import urllib.request
        import urllib.error
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        raw = self.rfile.read(length).decode("utf-8", "replace") if length else ""
        try:
            data = json.loads(raw or "{}")
        except Exception:
            data = {}
        ep = str(data.get("endpoint", "")).strip()
        payload = data.get("payload", data if "docNo" in data else {})
        ping = bool(data.get("ping"))
        if not (ep.startswith("https://script.google.com/macros/s/") and ep.endswith("/exec")):
            self._send_json(400, {"ok": False, "error": "endpoint tidak valid"})
            return
        if ping:
            # health-check lewat doGet (tidak menulis baris ke spreadsheet)
            req = urllib.request.Request(ep, method="GET")
        else:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            req = urllib.request.Request(ep, data=body,
                                         headers={"Content-Type": "text/plain;charset=utf-8"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                status = resp.status
                text = resp.read(65536).decode("utf-8", "replace")
        except urllib.error.HTTPError as he:
            try:
                text = he.read(65536).decode("utf-8", "replace")
            except Exception:
                text = ""
            status = he.code
        except Exception as e:
            self._send_json(200, {"ok": False, "status": 0,
                "hint": "Endpoint tidak dapat dihubungi dari server: " + str(e), "body": ""})
            return
        js = {}
        try:
            js = json.loads(text.strip() or "{}")
        except Exception:
            js = None
        if isinstance(js, dict) and js.get("ok") is True:
            self._send_json(200, {"ok": True, "ok_js": True, "status": status, "js": js})
            return
        low = text.lower()
        if "<" in text and "dopost" in low:
            hint = 'Deployment Apps Script masih error "Fungsi skrip tidak ditemukan: doPost" — buka /fix-sheet.html: tempel kode backend lalu Deploy versi baru'
        elif "<" in text and ("sign in" in low or "accounts.google" in low):
            hint = 'Endpoint menuntut login Google — deploy ulang dengan "Who has access: Anyone"'
        elif "<" in text:
            hint = "Endpoint membalas HTML (bukan JSON) — lihat cuplikan"
        else:
            hint = text[:300] or ("HTTP " + str(status))
        self._send_json(200, {"ok": False, "ok_js": False, "status": status, "hint": hint, "body": text[:400]})


    def end_headers(self):
        # Nonaktifkan cache agar perubahan langsung terlihat
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):
        route = self.path.split("?", 1)[0].split("#", 1)[0]

        # Endpoint Sheets aktif (dibaca dari portal.html) — untuk fix-sheet.html
        if route == "/api/sheet-info":
            try:
                s = open(os.path.join(BASE_DIR, "portal.html"), encoding="utf-8").read()
                m = re.search(r"const SHEET_ENDPOINT = '([^']+)'", s)
                self._send_json(200, {"ok": True, "endpoint": m.group(1) if m else ""})
            except Exception as e:
                self._send_json(200, {"ok": False, "error": str(e)})
            return

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

