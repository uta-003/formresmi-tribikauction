# -*- coding: utf-8 -*-
"""Generator untuk tiga form Tribik Auction (Pelelangan Mobil)."""
BASE_DIR = r"C:\Users\User\.cline\data\workspaces\chat\tribik-auction-forms"
WA_NUMBER = '628111454507'

CSS = """
:root {
    --primary: #6366f1; --primary-light: #818cf8; --secondary: #a855f7;
    --background: #f8fafc; --card: #ffffff; --text: #1e293b;
    --muted: #64748b; --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
}
* { box-sizing: border-box; }
body { font-family: 'Poppins', sans-serif; background: var(--background); color: var(--text); margin: 0; padding: 20px; }
.container { max-width: 900px; margin: 0 auto; }
.header { position: relative; text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid var(--primary); }
.header h1 { color: var(--primary); font-size: 24px; font-weight: 600; margin: 0; }
.header p { color: var(--muted); margin: 5px 0 0; font-size: 14px; }
.brand { display: inline-block; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 12px; }
.form-section { margin-bottom: 30px; padding: 20px; background: var(--card); border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.form-section h2 { color: var(--primary); font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }
.form-section h2 .note { color: var(--muted); font-weight: 400; font-size: 12px; font-style: italic; margin-left: 8px; }
.doc-hidden { display: none; } /* blok dokumen yang disembunyikan (KTP & ID Card) */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--text); }
.form-group input, .form-group select, .form-group textarea {
    width: 100%; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px;
    font-size: 14px; font-family: 'Poppins', sans-serif; background: white; transition: border-color .3s, box-shadow .3s;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light);
}
.form-group input[type="date"] { cursor: pointer; }
.form-group small { display: block; margin-top: 4px; font-size: 12px; color: var(--muted); }
.form-group select[multiple] { height: auto; min-height: 130px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.field-row .form-group { margin-bottom: 15px; }
@media (max-width: 600px) { .field-row { grid-template-columns: 1fr; } }
.upload-area { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px 16px; text-align: center; margin: 16px 0; transition: all .3s; cursor: pointer; }
.upload-area:hover { border-color: var(--primary); background: #eef2ff; }
.upload-label { color: var(--muted); font-size: 14px; }
.upload-label strong { color: var(--text); font-weight: 500; }
.file-input { display: none; }
.camera-frame { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 12px 0; background: #f8fafc; min-height: 130px; display: flex; align-items: center; justify-content: center; text-align: center; }
.camera-frame img { max-width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; }
.frame-guide { color: var(--muted); font-size: 12px; }
.btn-submit { width: 100%; padding: 14px 24px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; cursor: pointer; transition: transform .15s, box-shadow .15s; margin-top: 10px; box-shadow: 0 4px 12px rgba(99,102,241,.3); }
.btn-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,.4); }
.btn-cancel { width: 100%; padding: 14px 24px; background: #f1f5f9; color: var(--text); border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all .2s; margin-top: 10px; }
.btn-cancel:hover { background: #e2e8f0; }
.status-notice { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; color: var(--success); font-size: 14px; }
.error-message { color: var(--danger); font-size: 12px; margin-bottom: 10px; text-align: center; }
.signature-box { border: 1px solid #e2e8f0; border-radius: 8px; min-height: 130px; background: #f8fafc; display: flex; align-items: center; justify-content: center; margin: 12px 0; text-align: center; cursor: pointer; }
.signature-box canvas { width: 100%; height: 130px; cursor: crosshair; border-radius: 8px; }
.signature-actions { display: flex; gap: 10px; margin-top: 8px; }
.signature-actions button { flex: 1; padding: 10px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; color: var(--text); }
.signature-actions button:hover { background: #f1f5f9; }

/* Camera / frame overlay */
.camera-upload { margin: 12px 0; }
.camera-preview { position: relative; width: 100%; max-width: 500px; margin: 0 auto; border-radius: 12px; overflow: hidden; background: #000; display: none; }
.camera-preview.active { display: block; }
.camera-feed { width: 100%; height: auto; display: block; }
.frame-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
.camera-controls { display: flex; gap: 10px; margin: 10px 0; justify-content: center; }
.btn-open { flex: 1; padding: 10px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: var(--primary); color: #fff; }
.btn-open:hover { background: var(--secondary); }
.btn-capture { flex: 1; padding: 10px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: var(--secondary); color: #fff; }
.btn-capture:hover { opacity: .85; }
.btn-cancel-cam { flex: 1; padding: 10px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: var(--danger); color: #fff; }
.btn-cancel-cam:hover { opacity: .85; }
.btn-file { width: 100%; padding: 10px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 13px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; color: var(--text); margin-top: 8px; }
.btn-file:hover { background: #f1f5f9; }

/* ==== Modern UI/UX ==== */
html { scroll-behavior: smooth; }
* { transition: border-color .2s, box-shadow .2s, transform .08s; }
.container { background: var(--background); }
.form-section {
    background: rgba(255,255,255,.82);
    backdrop-filter: blur(8px) saturate(180%);
    border: 1px solid rgba(99,102,241,.14);
    box-shadow: 0 8px 32px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.8);
}
.form-section h2 {
    position: relative; padding-bottom: 12px;
}
.form-section h2::after {
    content: ''; position: absolute; bottom: 0; left: 0; width: 40px; height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 2px;
}
.form-group input, .form-group select, .form-group textarea {
    background: rgba(255,255,255,.9);
    border: 1.5px solid #d1d5db;
    transition: border-color .25s ease, box-shadow .25s ease, background .25s;
    border-radius: 8px;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    background: #fff; box-shadow: 0 0 0 3px var(--primary-light);
}
.checkbox-options { gap: 8px; }
.checkbox-option {
    transition: all .2s ease; border: 1.5px solid transparent;
}
.checkbox-option:hover { transform: scale(1.03); }
.camera-preview { border-radius: 14px; overflow: hidden; border: 3px solid #fff; box-shadow: 0 8px 28px rgba(0,0,0,.2); }
.camera-feed { display: block; transform: scale(1); transition: transform .1s; }
#overlay-ktp, #overlay-sim { pointer-events: none; }
.frame-overlay { display: block; }
.btn-open, .btn-capture, .btn-cancel-cam, .btn-file {
    font-weight: 500; position: relative; overflow: hidden;
}
.btn-open { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #fff; border: none; box-shadow: 0 4px 12px rgba(99,102,241,.3); transition: transform .15s, box-shadow .15s; }
.btn-open:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,.4); }
.btn-open:active { transform: translateY(0); }
.btn-submit { font-weight: 600; }
.signature-box { border: 1.5px dashed #cbd5e1; background: rgba(248,250,252,.9); border-radius: 10px; transition: border-color .25s; }
.signature-box canvas { background: rgba(0,0,0,.02); }

/* ==== Dark Mode (auto-detect + tombol toggle 🌙/☀️) ==== */
.theme-toggle { position: absolute; top: 14px; right: 14px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(99,102,241,.35); background: rgba(255,255,255,.55); color: var(--text); font-size: 19px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform .2s, box-shadow .2s, background .2s; backdrop-filter: blur(8px); box-shadow: 0 4px 14px rgba(0,0,0,.08); z-index: 5; }
.theme-toggle:hover { transform: translateY(-2px) rotate(12deg); box-shadow: 0 8px 22px rgba(99,102,241,.3); }
html.dark { --background: #0b1220; --card: #151e33; --text: #e2e8f0; --muted: #94a3b8; color-scheme: dark; }
html.dark body { background: radial-gradient(900px 700px at 12% -8%, rgba(99,102,241,.14), transparent 60%), var(--background); }
html.dark .header { border-bottom-color: rgba(99,102,241,.4); }
html.dark .form-section { background: rgba(21,30,51,.72); border-color: rgba(99,102,241,.22); box-shadow: 0 10px 34px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06); }
html.dark .form-section h2 { border-bottom-color: rgba(99,102,241,.25); }
html.dark .form-group input, html.dark .form-group select, html.dark .form-group textarea { background: rgba(10,15,30,.85); border-color: rgba(255,255,255,.14); color: #e2e8f0; }
html.dark .form-group input:focus, html.dark .form-group select:focus, html.dark .form-group textarea:focus { background: rgba(17,24,44,.95); border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.3); }
html.dark .form-group input::placeholder, html.dark .form-group textarea::placeholder { color: #64748b; }
html.dark select option { background: #151e33; color: #e2e8f0; }
html.dark .upload-area { border-color: rgba(255,255,255,.2); }
html.dark .upload-area:hover { background: rgba(99,102,241,.12); border-color: var(--primary); }
html.dark .checkbox-option { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
html.dark .camera-frame { background: rgba(10,15,30,.6); border-color: rgba(255,255,255,.14); }
html.dark .camera-preview { border-color: #0b1220; }
html.dark .btn-cancel { background: rgba(255,255,255,.06); color: #e2e8f0; border-color: rgba(255,255,255,.16); }
html.dark .btn-cancel:hover { background: rgba(255,255,255,.12); }
html.dark .btn-file { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.16); color: #e2e8f0; }
html.dark .btn-file:hover { background: rgba(255,255,255,.13); }
html.dark .signature-box { background: rgba(10,15,30,.6); border-color: rgba(255,255,255,.2); }
html.dark .signature-box canvas { background: rgba(255,255,255,.02); }
html.dark .signature-actions button { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.16); color: #e2e8f0; }
html.dark .signature-actions button:hover { background: rgba(255,255,255,.13); }
html.dark .status-notice { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.35); }
html.dark .theme-toggle { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.16); }

/* ===== Presisi & Responsif (PC + Mobile) ===== */
.form-section { scroll-margin-top: 16px; }
.camera-frame { scroll-margin-top: 16px; }
.form-group label { line-height: 1.4; }

/* Desktop: ruang lebih lega & rapi, kontrol sejajar */
@media (min-width: 901px){
    body { padding: 26px; }
    .container { max-width: 920px; }
    .form-section { padding: 24px 26px; }
    .form-group input, .form-group select:not([multiple]), .form-group input[type="date"] { min-height: 46px; }
    .form-section h2 { font-size: 18px; }
}

/* Mobile: ramping & sentuh-sentuhan */
@media (max-width: 640px){
    body { padding: 12px; }
    .header { padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; }
    .brand { font-size: 12px; padding: 5px 13px; }
    .theme-toggle { width: 36px; height: 36px; font-size: 16px; top: 9px; right: 9px; }
    .form-section { padding: 16px; border-radius: 14px; }
    .form-section h2 { font-size: 15.5px; margin-bottom: 16px; }
    .field-row { gap: 12px; }
    .form-group input, .form-group select, .form-group textarea { padding: 11px 13px; font-size: 16px; border-radius: 10px; }
    .upload-area { padding: 24px 12px; }
    .camera-controls { flex-direction: column; gap: 8px; }
    .btn-open, .btn-capture, .btn-cancel-cam { min-height: 48px; font-size: 14px; }
    .btn-submit, .btn-cancel { font-size: 15.5px; padding: 13px 20px; border-radius: 11px; }
    .signature-actions { flex-direction: column; }
    .checkbox-options { flex-direction: column; align-items: stretch; gap: 10px; }
    .status-notice { font-size: 13px; padding: 10px 12px; }
    .camera-frame { min-height: 110px; }
    .camera-preview { border-radius: 12px; }
    .signature-box, .signature-box canvas { min-height: 118px; height: 118px; }
    .container { max-width: 100%; }
}
"""


def build_head(title):
    return ('<!DOCTYPE html>\n<html lang="id">\n<head>\n'
            '    <meta charset="UTF-8">\n'
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            '    <link rel="icon" href="logo.png?v=5" type="image/png">\n'
            '    <link rel="icon" href="favicon.svg?v=5" type="image/svg+xml">\n'
            '    <meta name="color-scheme" content="light dark">\n'
            '    <title>' + title + ' - Tribik Auction</title>\n'
            '    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">\n'
            '    <style>' + CSS + '    </style>\n'
            '    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>\n'
            '    <script src="modal.js"></script>\n'
            '    <script>(function(){var k="tb_theme",s;try{s=localStorage.getItem(k)}catch(e){}var on=s?s==="dark":(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);var ap=function(x){document.documentElement.classList.toggle("dark",x);var b=document.getElementById("themeToggle");if(b)b.textContent=x?"☀️":"🌙"};ap(on);document.addEventListener("DOMContentLoaded",function(){var b=document.getElementById("themeToggle");if(!b)return;b.addEventListener("click",function(){var x=!document.documentElement.classList.contains("dark");ap(x);try{localStorage.setItem(k,x?"dark":"light")}catch(e){}})});})();</script>\n'
            '</head>\n<body>\n'
            '    <div class="container">\n'
            '        <div class="header">\n'
            '            <button type="button" class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode" title="Mode gelap / terang">🌙</button>\n'
            '            <div class="brand">Tribik Auction</div>\n'
            '            <h1>' + title + '</h1>\n'
            '            <p>Pelelangan Mobil</p>\n'
            '        </div>\n'
            '        <form id="autoForm">\n')

# --- Common shared sections built as functions ---
def applicant_section():
    return ('''        <div class="form-section">
            <h2>Data Pemohon</h2>
            <div class="field-row">
                <div class="form-group"><label>Nama Lengkap</label><input type="text" name="nama-lengkap" required placeholder="Masukkan nama lengkap"></div>
                <div class="form-group"><label>No. Identitas</label><input type="text" name="no-identitas" placeholder="KTP/Sim/Paspor"></div>
            </div>
            <div class="field-row">
                <div class="form-group"><label>No. Telepon</label><input type="tel" name="no-telepon" required placeholder="Nomor telepon"></div>
                <div class="form-group"><label>Email</label><input type="email" name="email" required placeholder="contoh@email.com"></div>
            </div>
        </div>
''')

def upload_section():
    return ('''        <div class="form-section">
            <h2>Upload Foto Dokumen Identitas <span class="note">(bingkai otomatis seukuran kartu ID-1: 85.6 x 53.98 mm)</span></h2>
            <!-- KTP (disembunyikan via .doc-hidden) -->
            <div class="form-group doc-hidden">
                <label>Dokumen KTP</label>
                <button type="button" class="btn-open" data-doc="ktp"><i class="fas fa-camera"></i> Buka Kamera</button>
                <div class="camera-preview" id="preview-ktp">
                    <video class="camera-feed" id="video-ktp" autoplay playsinline></video>
                    <canvas class="frame-overlay" id="overlay-ktp"></canvas>
                </div>
                <div class="camera-controls" id="controls-ktp" style="display:none;">
                    <button type="button" class="btn-capture" data-doc="ktp"><i class="fas fa-camera-retro"></i> Ambil Foto</button>
                    <button type="button" class="btn-cancel-cam" data-doc="ktp"><i class="fas fa-times"></i> Batal</button>
                </div>
                <input type="hidden" name="foto-ktp" id="foto-ktp">
                <div class="camera-frame" id="ktpFrame"><div class="frame-guide">Foto KTP akan tampil di sini</div></div>
                <label class="btn-file" for="ktpFile"><i class="fas fa-folder-open"></i> Pilih dari Galeri</label>
                <input type="file" name="ktp-document" accept="image/*" class="file-input" id="ktpFile">
            </div>
            <!-- ID Card (disembunyikan via .doc-hidden) -->
            <div class="form-group doc-hidden">
                <label>Dokumen ID Card</label>
                <button type="button" class="btn-open" data-doc="idcard"><i class="fas fa-camera"></i> Buka Kamera</button>
                <div class="camera-preview" id="preview-idcard">
                    <video class="camera-feed" id="video-idcard" autoplay playsinline></video>
                    <canvas class="frame-overlay" id="overlay-idcard"></canvas>
                </div>
                <div class="camera-controls" id="controls-idcard" style="display:none;">
                    <button type="button" class="btn-capture" data-doc="idcard"><i class="fas fa-camera-retro"></i> Ambil Foto</button>
                    <button type="button" class="btn-cancel-cam" data-doc="idcard"><i class="fas fa-times"></i> Batal</button>
                </div>
                <input type="hidden" name="foto-idcard" id="foto-idcard">
                <div class="camera-frame" id="idcardFrame"><div class="frame-guide">Foto ID Card akan tampil di sini</div></div>
                <label class="btn-file" for="idcardFile"><i class="fas fa-folder-open"></i> Pilih dari Galeri</label>
                <input type="file" name="idcard-document" accept="image/*" class="file-input" id="idcardFile">
            </div>
            <!-- SIM -->
            <div class="form-group">
                <label>Dokumen SIM</label>
                <button type="button" class="btn-open" data-doc="sim"><i class="fas fa-camera"></i> Buka Kamera</button>
                <div class="camera-preview" id="preview-sim">
                    <video class="camera-feed" id="video-sim" autoplay playsinline></video>
                    <canvas class="frame-overlay" id="overlay-sim"></canvas>
                </div>
                <div class="camera-controls" id="controls-sim" style="display:none;">
                    <button type="button" class="btn-capture" data-doc="sim"><i class="fas fa-camera-retro"></i> Ambil Foto</button>
                    <button type="button" class="btn-cancel-cam" data-doc="sim"><i class="fas fa-times"></i> Batal</button>
                </div>
                <input type="hidden" name="foto-sim" id="foto-sim">
                <div class="camera-frame" id="simFrame"><div class="frame-guide">SIM akan tampil di sini</div></div>
                <label class="btn-file" for="simFile"><i class="fas fa-folder-open"></i> Pilih dari Galeri</label>
                <input type="file" name="sim-document" accept="image/*" class="file-input" id="simFile">
            </div>
        </div>
''')



def signature_section():
    return ('''        <div class="form-section">
            <h2>Tanda Tangan</h2>
            <div class="signature-box" id="sigBox"><canvas id="sigCanvas"></canvas></div>
            <div class="signature-actions">
                <button type="button" id="sigClear">Bersihkan</button>
                <button type="button" id="sigSave">Simpan Tanda Tangan</button>
            </div>
        </div>
''')

def buttons_section():
    return ('''        <div style="text-align: center; margin-top: 30px;">
            <button type="submit" class="btn-submit"><i class="fas fa-paper-plane"></i> Kirim ke WhatsApp</button>
            <button type="button" class="btn-cancel" onclick="window.history.back()"><i class="fas fa-times"></i> Batal</button>
        </div>
        </form>
''')

def close_container():
    return '</div>\n'

FINAL_CLOSE = '</body>\n</html>\n'


COMMON_JS = '''
    <script>
        // Sound engine (Web Audio API, self-contained, no external files)
        var AudioCtx = (window.AudioContext || window.webkitAudioContext);
        var ctxPool = null;
        function _ac() { if (!ctxPool) ctxPool = new AudioCtx(); return ctxPool; }

        function _tone(type, dur) {
            try {
                var c = _ac();
                var o = c.createOscillator();
                var g = c.createGain();
                o.connect(g); g.connect(c.destination);
                o.type = type.type || 'sine';
                o.frequency.value = type.freq;
                g.gain.setValueAtTime(0.001, c.currentTime);
                g.gain.linearRampToValueAtTime(0.14, c.currentTime + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
                o.start(c.currentTime);
                o.stop(c.currentTime + dur);
            } catch (e) { /* audio disabled */ }
        }
        function playSound(kind) {
            if (!AudioCtx) return;
            switch (kind) {
                case 'shutter': _tone({freq:880}, 0.06); setTimeout(function(){ _tone({freq:440}, 0.08); }, 40); break;
                case 'click':   _tone({freq:1568}, 0.04); break;
                case 'open':    _tone({freq:440}, 0.10); setTimeout(function(){ _tone({freq:660}, 0.10); }, 50); break;
                case 'success': _tone({freq:660}, 0.08); setTimeout(function(){ _tone({freq:880}, 0.08); }, 60); setTimeout(function(){ _tone({freq:1100}, 0.10); }, 120); break;
                case 'error':   _tone({freq:220}, 0.12); setTimeout(function(){ _tone({freq:174}, 0.14); }, 80); break;
            }
        }
        function bindUpload(inputId, frameId) {
            var input = document.getElementById(inputId);
            var frame = document.getElementById(frameId);
            if (!input || !frame) return;
            input.addEventListener('change', function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var docKey = (frameId || '').replace(/Frame$/, '');
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var url = ev.target.result;
                    frame.innerHTML = '<img src="' + url + '" alt="Preview" style="max-width:100%;max-height:150px;object-fit:contain;border-radius:4px;">';
                    capturedPhotos[docKey] = { label: (CARD[docKey] ? CARD[docKey].label : docKey.toUpperCase()), dataURL: url };
                    var hid = document.getElementById('foto-' + docKey);
                    if (hid) hid.value = url;
                };
                reader.readAsDataURL(file);
            });
        }

        // --- Camera capture with KTP/SIM frame overlay ---
        var cameraState = {};
        var sigDrawn = false;

        /* --- Ukuran & state kartu KTP/ID Card/SIM (bingkai presisi rasio ID-1: 85.60 x 53.98 mm) --- */
        var capturedPhotos = {};
        var CARD = {
            ktp:    { ratio: 85.60/53.98, label: 'KTP',     mm: '85.60 x 53.98 mm' },
            idcard: { ratio: 85.60/53.98, label: 'ID CARD', mm: '85.60 x 53.98 mm' },
            sim:    { ratio: 85.60/53.98, label: 'SIM',     mm: '85.60 x 53.98 mm' }
        };
        function capturedDocList() {
            var keys = Object.keys(capturedPhotos);
            if (!keys.length) return '';
            return keys.map(function(k){ return CARD[k] ? CARD[k].label : k; }).join(', ');
        }
        function drawCardFrame(canvas, docType) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var w = canvas.width, h = canvas.height;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, w, h);
            var cw = w * 0.82, ch = cw / (85.60 / 53.98); // ID-1 ratio KTP/SIM (85.60 x 53.98 mm)
            var cx = (w - cw) / 2, cy = (h - ch) / 2;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(cx, cy, cw, ch);
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, cy, cw, ch);
            var dash = 8;
            ctx.setLineDash([dash, dash]);
            var s = 18;
            ctx.beginPath();
            ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy - s); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx - s, cy + s);
            ctx.moveTo(cx + cw + s, cy - s); ctx.lineTo(cx + cw - s, cy - s); ctx.moveTo(cx + cw + s, cy - s); ctx.lineTo(cx + cw + s, cy + s);
            ctx.moveTo(cx - s, cy + ch + s); ctx.lineTo(cx + s, cy + ch + s); ctx.moveTo(cx - s, cy + ch + s); ctx.lineTo(cx - s, cy + ch - s);
            ctx.moveTo(cx + cw + s, cy + ch + s); ctx.lineTo(cx + cw - s, cy + ch + s); ctx.moveTo(cx + cw + s, cy + ch + s); ctx.lineTo(cx + cw + s, cy + ch - s);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = 'bold 13px Poppins, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            var cfg = CARD[docType] || CARD.ktp;
            ctx.fillText('SCAN ' + cfg.label, w / 2, cy - 8);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '600 10px Poppins, sans-serif';
            ctx.fillText(cfg.mm, w / 2, cy + ch + 22);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Poppins, sans-serif';
            ctx.fillText('Letakkan dokumen di dalam bingkai', w / 2, cy + ch + 40);
        }

        function openCamera(doc) {
            var preview = document.getElementById('preview-' + doc);
            var controls = document.getElementById('controls-' + doc);
            var video = document.getElementById('video-' + doc);
            var overlay = document.getElementById('overlay-' + doc);
            if (!preview || !controls) return;
            preview.classList.add('active');
            controls.style.display = 'flex';
            overlay.width = overlay.offsetWidth;
            overlay.height = overlay.offsetHeight;
            drawCardFrame(overlay, doc);
            playSound('open');
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(function(stream){ cameraState[doc] = stream; video.srcObject = stream; })
                .catch(function(err){ Modal.alert('Kamera tidak dapat diakses: ' + err.message, 'Kamera'); });
        }

        function capturePhoto(doc) {
            playSound('shutter');
            var video = document.getElementById('video-' + doc);
            var frame = document.getElementById(doc + 'Frame');
            var preview = document.getElementById('preview-' + doc);
            var controls = document.getElementById('controls-' + doc);
            if (!video || !video.videoWidth) {
                playSound('error');
                Modal.alert('Kamera belum siap, coba ambil foto lagi.', 'Kamera');
                return;
            }
            var cfg = CARD[doc] || CARD.ktp;
            var vw = video.videoWidth, vh = video.videoHeight;
            // Crop presisi ke area kartu (rasio ID-1: 85.60 x 53.98 mm) di tengah frame, tanpa distorsi/gepeng
            var ratio = cfg.ratio;
            var cw = vw, ch = vw / ratio;
            if (ch > vh) { ch = vh; cw = vh * ratio; }
            var sx = (vw - cw) / 2, sy = (vh - ch) / 2;
            var OUT_W = 720, OUT_H = Math.round(OUT_W / ratio);
            var out = document.createElement('canvas'); out.width = OUT_W; out.height = OUT_H;
            var oc = out.getContext('2d');
            oc.drawImage(video, sx, sy, cw, ch, 0, 0, OUT_W, OUT_H);
            var dataURL = out.toDataURL('image/jpeg', 0.92);
            capturedPhotos[doc] = { label: cfg.label, dataURL: dataURL };
            var hid = document.getElementById('foto-' + doc);
            if (hid) hid.value = dataURL;
            if (frame) frame.innerHTML = '<img src="' + dataURL + '" alt="Foto ' + cfg.label + '" style="max-width:100%;max-height:150px;object-fit:contain;border-radius:4px;">';
            if (preview) preview.classList.remove('active');
            if (controls) controls.style.display = 'none';
            if (cameraState[doc]) { cameraState[doc].getTracks().forEach(function(t){ t.stop(); }); cameraState[doc] = null; }
            video.srcObject = null;
        }

        function cancelCamera(doc) {
            playSound('click');
            var preview = document.getElementById('preview-' + doc);
            var controls = document.getElementById('controls-' + doc);
            var video = document.getElementById('video-' + doc);
            preview.classList.remove('active');
            controls.style.display = 'none';
            if (cameraState[doc]) { cameraState[doc].getTracks().forEach(function(t){ t.stop(); }); cameraState[doc] = null; }
            video.srcObject = null;
        }

        document.addEventListener('click', function(e) {
            var target = e.target.closest('button[data-doc]');
            if (!target) return;
            var doc = target.getAttribute('data-doc');
            var cls = target.className || '';
            if (target.classList.contains('btn-open')) { openCamera(doc); }
            else if (target.classList.contains('btn-capture')) { capturePhoto(doc); }
            else if (target.classList.contains('btn-cancel-cam')) { cancelCamera(doc); }
        });

        function initSignature() {
            const canvas = document.getElementById('sigCanvas');
            canvas.width = 560; canvas.height = 140;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
            let drawing = false;
            canvas.addEventListener('mousedown', function(e){ drawing = true; sigDrawn = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
            canvas.addEventListener('mousemove', function(e){ if(drawing){ ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
            canvas.addEventListener('mouseup', function(){ drawing = false; });
            canvas.addEventListener('touchstart', function(e){ e.preventDefault(); drawing = true; sigDrawn = true; ctx.beginPath(); const t = e.touches[0]; ctx.moveTo(t.clientX, t.clientY); });
            canvas.addEventListener('touchmove', function(e){ e.preventDefault(); if(drawing){ const t = e.touches[0]; ctx.lineTo(t.clientX, t.clientY); ctx.stroke(); } });
            canvas.addEventListener('touchend', function(){ drawing = false; });
            document.getElementById('sigClear').addEventListener('click', function(){ ctx.clearRect(0, 0, canvas.width, canvas.height); sigDrawn = false; });
        }

        function showNotice(formEl, msg) {
            const container = document.querySelector('.container');
            const notice = document.createElement('div');
            notice.className = 'status-notice';
            notice.innerHTML = '<i class="fas fa-check-circle"></i> ' + msg;
            container.insertBefore(notice, formEl);
            playSound('success');
            setTimeout(function(){ notice.remove(); }, 4000);
        }
    </script>
'''

def submit_js(form_id, wa_number=WA_NUMBER):
    return ("""    <script>
        document.getElementById('autoForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const name = formData.get('nama-lengkap') || 'Unknown';
            const selected = formData.getAll('select-list') || [];
            let isValid = true;
            if (selected.length === 0) { showError('Mohon pilih minimal satu item'); isValid = false; }
            const requiredFields = ['nama-lengkap', 'no-telepon', 'email'];
            requiredFields.forEach(function(fn){
                const v = formData.get(fn);
                if(!v || v.trim()===''){ showError('Field '+fn+' wajib diisi'); isValid=false; }
            });
            Object.keys(capturedPhotos).forEach(function(k){ formData.set('foto-'+k, capturedPhotos[k].dataURL || ''); });
            if (Object.keys(capturedPhotos).length === 0) { showError('Ambil minimal satu foto dokumen (KTP / ID Card / SIM) sebelum mengirim.'); isValid = false; }
            if (!isValid) return;
            const waUrl = 'https://wa.me/""" + wa_number + """?text=';
            const text = '*""" + form_id + """ - Tribik Auction*\\n*Nama:* '+name+'\\n*Terpilih:* '+(selected.join(', ') || '-')+'\\n*Tanda Tangan:* '+(sigDrawn ? 'sudah ditandatangani' : 'belum ada')+'\\n*Foto Dokumen Identitas:* '+(capturedDocList() || '-')+'\\n*Status:* Form dikirim';
            window.open(waUrl+encodeURIComponent(text), '_blank');
            showNotice(document.getElementById('autoForm'), 'Form berhasil dikirim ke WhatsApp Tribik Auction.');
        });
        function showError(msg) {
            playSound('error');
            const errs = document.querySelectorAll('.error-message');
            errs.forEach(function(el){ el.remove(); });
            const el = document.createElement('div');
            el.className = 'error-message';
            el.innerHTML = '<i class="fas fa-exclamation-circle"></i> '+msg;
            const fg = document.querySelector('form .form-group');
            if (fg) fg.insertBefore(el, fg.firstElementChild); else document.querySelector('form').prepend(el);
        }
    </script>
""")


# --- Form 1: Pengajuan Cek Unit ---
def build_form_cek_unit():
    title = 'FORM PENGAJUAN CEK UNIT'
    select_block = '''        <div class="form-section">
            <h2>Pilih Unit</h2>
            <div class="form-group">
                <label>Pilih Unit (Bisa lebih dari satu):</label>
                <select multiple name="select-list" required size="5">
                    <option value="Unit 001 - Mazda CX-5">Unit 001 - Mazda CX-5</option>
                    <option value="Unit 002 - Toyota Fortuner">Unit 002 - Toyota Fortuner</option>
                    <option value="Unit 003 - Honda Mobilio">Unit 003 - Honda Mobilio</option>
                    <option value="Unit 004 - Suzuki Ertiga">Unit 004 - Suzuki Ertiga</option>
                    <option value="Unit 005 - Daihatsu Xenia">Unit 005 - Daihatsu Xenia</option>
                </select>
            </div>
        </div>
'''
    unit_data = '''        <div class="form-section">
            <h2>Data Unit/Mobil</h2>
            <div class="field-row">
                <div class="form-group"><label>No. RM (Rekening Modal)</label><input type="text" name="no-rm" placeholder="Nomor Rekening Modal"></div>
                <div class="form-group"><label>Tanggal Pelaksanaan</label><input type="date" name="tanggal-pelaksanaan" required></div>
            </div>
            <div class="form-group"><label>Estimasi Harga</label><input type="number" name="estimasi-harga" placeholder="Rp"></div>
        </div>
'''
    html = build_head(title) + select_block + applicant_section() + unit_data + upload_section() + signature_section() + buttons_section() + close_container()
    html += COMMON_JS + '''
    <script>
        document.addEventListener('DOMContentLoaded', function(){
            bindUpload('ktpFile','ktpFrame');
            bindUpload('idcardFile','idcardFrame');
            bindUpload('simFile','simFrame');
            initSignature();
        });
    </script>
''' + submit_js(title) + FINAL_CLOSE
    return html

# --- Form 2: Pengambilan Barang ---
def build_form_pengambilan_barang():
    title = 'FORM PENGAJUAN PENGAMBILAN BARANG'
    select_block = '''        <div class="form-section">
            <h2>Pilih Barang</h2>
            <div class="form-group">
                <label>Pilih Barang (Bisa lebih dari satu):</label>
                <select multiple name="select-list" required size="5">
                    <option value="Barang 001 - Unit Mobil Sedan">Barang 001 - Unit Mobil Sedan</option>
                    <option value="Barang 002 - Unit SUV">Barang 002 - Unit SUV</option>
                    <option value="Barang 003 - Unit Hatchback">Barang 003 - Unit Hatchback</option>
                    <option value="Barang 004 - Unit Pickup">Barang 004 - Unit Pickup</option>
                    <option value="Barang 005 - Unit Minivan">Barang 005 - Unit Minivan</option>
                </select>
            </div>
        </div>
'''
    unit_data = '''        <div class="form-section">
            <h2>Data Unit/Barang</h2>
            <div class="field-row">
                <div class="form-group"><label>No. RM (Rekening Modal)</label><input type="text" name="no-rm" placeholder="Nomor Rekening Modal"></div>
                <div class="form-group"><label>No. Polisi Unit</label><input type="text" name="no-polisi" placeholder="Nomor Polisi"></div>
            </div>
            <div class="field-row">
                <div class="form-group"><label>Tanggal Pengambilan</label><input type="date" name="tanggal-pengambilan" required></div>
                <div class="form-group"><label>Waktu Pengambilan</label><input type="time" name="waktu-pengambilan" required></div>
            </div>
        </div>
'''
    html = build_head(title) + select_block + applicant_section() + unit_data + upload_section() + signature_section() + buttons_section() + close_container()
    html += COMMON_JS + '''
    <script>
        document.addEventListener('DOMContentLoaded', function(){
            bindUpload('ktpFile','ktpFrame');
            bindUpload('idcardFile','idcardFrame');
            bindUpload('simFile','simFrame');
            initSignature();
        });
    </script>
''' + submit_js(title) + FINAL_CLOSE
    return html

# --- Form 3: Pengambilan Unit ---
def build_form_pengambilan_unit():
    title = 'FORM PENGAJUAN PENGAMBILAN UNIT'
    select_block = '''        <div class="form-section">
            <h2>Pilih Unit</h2>
            <div class="form-group">
                <label>Pilih Unit (Bisa lebih dari satu):</label>
                <select multiple name="select-list" required size="5">
                    <option value="Unit 001 - Sedan">Unit 001 - Sedan</option>
                    <option value="Unit 002 - SUV">Unit 002 - SUV</option>
                    <option value="Unit 003 - Hatchback">Unit 003 - Hatchback</option>
                    <option value="Unit 004 - Pickup">Unit 004 - Pickup</option>
                    <option value="Unit 005 - Minivan">Unit 005 - Minivan</option>
                </select>
            </div>
        </div>
'''
    unit_data = '''        <div class="form-section">
            <h2>Data Unit/Mobil</h2>
            <div class="field-row">
                <div class="form-group"><label>No. RM (Rekening Modal)</label><input type="text" name="no-rm" placeholder="Nomor Rekening Modal"></div>
                <div class="form-group"><label>No. Polisi Unit</label><input type="text" name="no-polisi" placeholder="Nomor Polisi"></div>
            </div>
            <div class="field-row">
                <div class="form-group">
                    <label>Tipe Unit</label>
                    <select name="tipe-unit">
                        <option value="" disabled selected>-- Pilih Tipe --</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Minivan">Minivan</option>
                    </select>
                </div>
                <div class="form-group"><label>Tanggal Pengambilan</label><input type="date" name="tanggal-pengambilan" required></div>
            </div>
        </div>
'''
    html = build_head(title) + select_block + applicant_section() + unit_data + upload_section() + signature_section() + buttons_section() + close_container()
    html += COMMON_JS + '''
    <script>
        document.addEventListener('DOMContentLoaded', function(){
            bindUpload('ktpFile','ktpFrame');
            bindUpload('idcardFile','idcardFrame');
            bindUpload('simFile','simFrame');
            initSignature();
        });
    </script>
''' + submit_js(title) + FINAL_CLOSE
    return html


if __name__ == '__main__':
    files = {
        'form-pengajuan-cek-unit.html': build_form_cek_unit(),
        'form-pengambilan-barang.html': build_form_pengambilan_barang(),
        'form-pengambilan-unit.html': build_form_pengambilan_unit(),
    }
    import os
    for name, content in files.items():
        path = os.path.join(BASE_DIR, name)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Wrote', path, len(content), 'bytes')
    print('Selesai: semua form berhasil dibuat.')

