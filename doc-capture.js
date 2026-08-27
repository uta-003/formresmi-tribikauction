/* ============================================================================
 * doc-capture.js  —  Document Auto Capture Component v4 (reusable)
 * ----------------------------------------------------------------------------
 * BARU v4 (bingkai sesuai ukuran kartu + tombol putar ID Card):
 *   • Bingkai & hasil mengikuti JENIS terpilih secara presisi:
 *       KTP & SIM  -> 85,60 × 53,98 mm (lanskap, standar ID-1).
 *       ID CARD    -> bisa diputar tombol ↻ antara mendatar/tegak.
 *   • Deteksi menyesuaikan rasio bingkai AKTIF — kartu yang orientasinya
 *     menyimpang dari bingkai ditolak, sehingga hasil selalu presisi.
 *
 * BARU v3 (mode per jenis dokumen + hasil presisi):
 *   • Preset KTP / SIM / ID CARD: label, ukuran mm, dan warna aksen sendiri,
 *     tampil sebagai badge jenis kartu di overlay kamera.
 *   • Bingkai overlay memakai rasio PERSIS ID-1 pada AREA VIDEO TERLIHAT
 *     (konsep object-fit: contain) -> tidak ada distorsi antara bingkai &
 *     potongan akhir walau orientasi kamera beda dari layar.
 *   • Hasil crop DIKUNCI rasio ID-1 lalu digambar ke canvas proporsional
 *     (tinggi = lebar / rasio) -> foto KTP/SIM tidak pernah gepeng/melar.
 *
 * PERBAIKAN v2 (anti "langsung motret"):
 *   • Deteksi HANYA saat ada objek berbentuk kartu ID-1 (KTP/SIM/ID Card):
 *       - Otsu threshold, dua polaritas (kartu lebih terang ATAU gelap) dicoba.
 *       - Connected-component: ambil blob kandidat kartu terbesar.
 *       - Validasi rasio kartu (±1.586 landscape / ±0.63 portrait), bentuk isi,
 *         ukuran, posisi tengah, tak terpotong tepi kamera, ADA TEKSTUR
 *         CETAKAN di dalam kartu, dan kontras tonal dengan latarnya.
 *   • AUTO-CAPTURE hanya setelah kartu stabil N frame berurutan DAN kamera
 *     sudah mengarah minimal minHoldMs (default 900 ms) — mustahil motret
 *     sesaat setelah dibuka padahal tidak ada dokumen.
 *   • Indikator progres pindaian (%) di overlay menuju rana.
 *   • Crop hasil memakai pemetaan geometri display yang benar.
 *
 * API tetap seperti v1:  new DocumentAutoCapture({video, overlay, ...}).start()
 * ==========================================================================*/(function (global) {
  'use strict';

  var DEFAULT_RATIO = 85.60 / 53.98; // ID-1 (KTP/SIM/kartu)

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---- Preset jenis dokumen: dimensi kartu (mm), warna aksen, rotasi ---- */
  var MM_CARD_W = 85.60, MM_CARD_H = 53.98;   // standar ID-1 (KTP/SIM/ID Card CR80)
  var PRESETS = {
    ktp:    { label: 'KTP',     mm: { w: MM_CARD_W, h: MM_CARD_H }, color: '#22c55e' },
    sim:    { label: 'SIM',     mm: { w: MM_CARD_W, h: MM_CARD_H }, color: '#38bdf8' },
    idcard: { label: 'ID CARD', mm: { w: MM_CARD_W, h: MM_CARD_H }, color: '#a78bfa', rotatable: true }
  };
  function fmtMm(n) { return n.toFixed(2).replace('.', ','); }
  function resolvePreset(docType, explicitLabel) {
    var key = (docType || 'ktp').toLowerCase();
    var p = PRESETS[key] || PRESETS.ktp;
    return { key: key, label: explicitLabel || p.label, color: p.color, mm: p.mm, rotatable: !!p.rotatable };
  }

  function DocumentAutoCapture(opts) {
    opts = opts || {};
    this.video      = opts.video;
    this.overlay    = opts.overlay;
    this.docType    = opts.docType || 'ktp';
    var _preset     = resolvePreset(this.docType, opts.label);
    this.presetKey  = _preset.key;
    this.label      = _preset.label;
    this.subLabel   = '';
    this.accent     = _preset.color;
    this.ratio      = opts.ratio || DEFAULT_RATIO;
    this.mm         = _preset.mm;
    this.rotatable  = !!_preset.rotatable || opts.rotatable === true;
    this._orient    = (opts.orientation === 'portrait') ? 'portrait' : 'landscape';
    if (!this.rotatable) this._orient = 'landscape';   // hanya jenis rotatable boleh portrait
    this.onCapture  = opts.onCapture || function () {};
    this.onStatus   = opts.onStatus || function () {};
    this.auto       = opts.auto !== false;
    this.snd        = opts.sound || function () {};
    this.stableFrames = Math.max(4, opts.stableFrames || 12);
    this.minHoldMs  = Math.max(250, opts.minHoldMs || 900);

    this.stream = null;
    this.running = false;
    this.work = null; this.wctx = null;
    this.W = 0; this.H = 0;
    this.lum = null;
    this.hist = new Uint32Array(256);
    this.stamp = null;   // visited-mark per scan
    this.q = null;       // BFS queue
    this.scanId = 0;

    this.stableRun = 0;
    this.lastBox = null;
    this.outW = 720;
    this.outH = Math.round(720 / this.ratio);

    this._raf = 0; this._tick = 0; this._t0 = 0; this._syncT = 0;
    this._geom = { fallback: true };
    this._boundLoop = this._loop.bind(this);
    this._boundResize = this._resize.bind(this);
  }

  /* ---------- geometri tampilan: piksel video <-> area terlihat ---------- */
  DocumentAutoCapture.prototype._syncGeom = function () {
    var vw = this.video && this.video.videoWidth, vh = this.video && this.video.videoHeight;
    var dw = this.overlay && this.overlay.clientWidth, dh = this.overlay && this.overlay.clientHeight;
    if (!vw || !vh || !dw || !dh) { this._geom = { fallback: true }; return; }
    var s = Math.min(dw / vw, dh / vh);
    this._geom = {
      fallback: false, k: s,
      drawW: vw * s, drawH: vh * s,
      offX: (dw - vw * s) / 2, offY: (dh - vh * s) / 2
    };
  };

  /* --- gaya overlay sekali pasang: contain (anti distorsi) + badge jenis --- */
  DocumentAutoCapture._cssDone = false;
  DocumentAutoCapture._injectCss = function () {
    if (DocumentAutoCapture._cssDone || typeof document === 'undefined' || !document.head) return;
    DocumentAutoCapture._cssDone = true;
    var st = document.createElement('style');
    st.id = 'doc-capture-css';
    st.textContent =
      '.video-frame video,.camera-preview video,.cam-preview video{' +
      'object-fit:contain!important;object-position:center!important;background:#05070d}' +
      '.doc-cap-badge{position:absolute;left:50%;top:0;transform:translate(-50%,0);' +
      'padding:3px 10px;border-radius:999px;font:bold 10px Poppins,Segoe UI,sans-serif;' +
      'letter-spacing:.6px;color:#0b1220;pointer-events:none;z-index:3;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap}' +
      '.doc-cap-rot{position:absolute;right:12px;top:12px;width:46px;height:46px;' +
      'border-radius:50%;border:none;background:rgba(15,23,42,.75);color:#fff;font-size:21px;' +
      'line-height:1;cursor:pointer;z-index:4;box-shadow:0 3px 12px rgba(0,0,0,.45);' +
      'display:flex;align-items:center;justify-content:center}' +
      '.doc-cap-rot:hover{background:#334155}.doc-cap-rot:active{transform:scale(.92)}';
    document.head.appendChild(st);
  };

  /* --- kotak bingkai di layar: rasio PERSIS mode aktif dalam area video terlihat --- */
  DocumentAutoCapture.prototype._box = function () {
    var FR = this._frameRatio();
    var g = this._geom, cw, ch, cx, cy;
    if (!g.fallback) {
      var maxW = g.drawW * 0.86, maxH = g.drawH * 0.9;
      if (maxW / maxH > FR) { ch = maxH; cw = ch * FR; }
      else { cw = maxW; ch = cw / FR; }
      cx = g.offX + (g.drawW - cw) / 2;
      cy = g.offY + (g.drawH - ch) / 2;
    } else {
      var W = (this.overlay && this.overlay.width) || 300, H = (this.overlay && this.overlay.height) || 200;
      if (W / H > FR) { ch = H * 0.9; cw = ch * FR; }
      else { cw = W * 0.86; ch = cw / FR; }
      cx = (W - cw) / 2; cy = (H - ch) / 2;
    }
    return { x: cx, y: cy, w: cw, h: ch };
  };

  DocumentAutoCapture.prototype._resize = function () {
    DocumentAutoCapture._injectCss();
    if (this.overlay) { this.overlay.width = this.overlay.offsetWidth; this.overlay.height = this.overlay.offsetHeight; }
    this._syncGeom();
    if (this.running) this._makeBuffers();
  };

  DocumentAutoCapture.prototype._makeBuffers = function () {
    var OW = (this.overlay && this.overlay.offsetWidth) || 300;
    var OH = (this.overlay && this.overlay.offsetHeight) || 200;
    var W = 160;
    var H = clamp(Math.round(W * OH / Math.max(1, OW)), 64, 220);
    if (!this.work || this.work.width !== W || this.work.height !== H) {
      this.work = document.createElement('canvas');
      this.work.width = W; this.work.height = H;
      this.wctx = this.work.getContext('2d', { willReadFrequently: true });
      this.lum = new Float32Array(W * H);
      this.stamp = new Int32Array(W * H);
      this.q = new Uint32Array(W * H);
    }
    this.W = W; this.H = H;
  };

  /* --- mulai kamera + loop deteksi --- */
  DocumentAutoCapture.prototype.start = function () {
    var self = this;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatus('Kamera tidak didukung browser', false);
      return Promise.reject(new Error('getUserMedia tidak tersedia'));
    }
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    }).then(function (stream) {
      self.stream = stream;
      self.video.srcObject = stream;
      try { self.video.setAttribute('playsinline', ''); self.video.muted = true; } catch (e) {}
      var p = self.video.play();
      if (p && p.catch) p.catch(function () {});
      return stream;
    }).then(function () {
      self.running = true;
      self._t0 = 0; self._tick = 0; self.stableRun = 0; self.lastBox = null;
      self._resize();
      if (self.rotatable) self._makeRotBtn(); else self._removeRotBtn();
      window.addEventListener('resize', self._boundResize);
      self.onStatus('Arahkan dokumen ke kamera…', false);
      self._raf = requestAnimationFrame(self._boundLoop);
    });
  };

  DocumentAutoCapture.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this.stream) { this.stream.getTracks().forEach(function (t) { t.stop(); }); this.stream = null; }
    if (this.video) this.video.srcObject = null;
    window.removeEventListener('resize', this._boundResize);
    if (this.overlay) { var c = this.overlay.getContext('2d'); if (c) c.clearRect(0, 0, this.overlay.width, this.overlay.height); }
    if (this._badgeEl && this._badgeEl.parentNode) { this._badgeEl.parentNode.removeChild(this._badgeEl); }
    this._badgeEl = null;
    this._removeRotBtn();
  };

  /* ---------- threshold global Otsu dari histogram 256 bin ---------- */
  DocumentAutoCapture.prototype._otsu = function (hist, total) {
    var sum = 0, i;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, maxVar = -1, thr = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i];
      if (!wB) continue;
      var wF = total - wB;
      if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; thr = i; }
    }
    return thr;
  };

  /* ---------- largest connected component utk predikat mask ---------- */
  /* mode: 'bright' -> lum>=t ; 'dark' -> lum<=t */
  DocumentAutoCapture.prototype._largestCC = function (mode, t) {
    var W = this.W, H = this.H, N = W * H;
    var lum = this.lum, stamp = this.stamp, q = this.q;
    var id = ++this.scanId;
    if (this.scanId > 2000000000) { this.scanId = 1; }
    var bright = mode === 'bright';
    var best = null, qi, k, head, tail, cur, x, y, nb;
    for (var start = 0; start < N; start++) {
      if (stamp[start] === id) continue;
      var l0 = lum[start];
      if (bright ? l0 < t : l0 > t) { continue; }
      /* BFS */
      head = tail = 0;
      q[tail++] = start;
      stamp[start] = id;
      var minX = W, minY = H, maxX = -1, maxY = -1, area = 0;
      while (head < tail) {
        cur = q[head++];
        x = cur % W;
        y = (cur / W) | 0;
        area++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        for (k = 0; k < 4; k++) {
          if (k === 0) { if (x === 0) continue; nb = cur - 1; }
          else if (k === 1) { if (x === W - 1) continue; nb = cur + 1; }
          else if (k === 2) { if (y === 0) continue; nb = cur - W; }
          else { if (y === H - 1) continue; nb = cur + W; }
          if (stamp[nb] !== id) {
            var ln = lum[nb];
            if (bright ? ln >= t : ln <= t) { stamp[nb] = id; q[tail++] = nb; }
          }
        }
      }
      if (!best || area > best.area) {
        best = { minX: minX, minY: minY, maxX: maxX, maxY: maxY, area: area };
      }
    }
    void qi; // eslint no-unused
    return best;
  };

  /* ---------- analisa satu frame: cari kartu ID-1 di dalam frame ---------- */
  DocumentAutoCapture.prototype._detect = function () {
    var W = this.W, H = this.H;
    if (!W || !this.video || !this.video.videoWidth) return null;
    try { this.wctx.drawImage(this.video, 0, 0, W, H); } catch (e) { return null; }
    var data;
    try { data = this.wctx.getImageData(0, 0, W, H).data; } catch (e) { return null; }
    var N = W * H, lum = this.lum, hist = this.hist, i, j, l, sum = 0;
    for (i = 0; i < 256; i++) hist[i] = 0;
    for (i = 0; i < N; i++) {
      j = i << 2;
      l = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
      lum[i] = l; sum += l;
      hist[l & 255]++;
    }
    var mean = sum / N;
    var t = this._otsu(hist, N);
    if (!t || Math.abs(t - mean) < 10) t = mean; // scene rata: pakai mean saja

    /* dua polaritas: kartu lebih terang ATAU lebih gelap dari latar */
    var cB = this._evalCard(this._largestCC('bright', t), true);
    var cD = this._evalCard(this._largestCC('dark', t), false);
    if (cB && cD) return cB.score >= cD.score ? cB : cD;
    return cB || cD || null;
  };

  DocumentAutoCapture.prototype._evalCard = function (comp) {
    if (!comp) return null;
    var W = this.W, H = this.H;
    var bw = comp.maxX - comp.minX + 1, bh = comp.maxY - comp.minY + 1;

    /* ukuran kasar */
    var wPct = bw / W, hPct = bh / H;
    if (Math.max(wPct, hPct) < 0.32 || Math.max(wPct, hPct) > 0.98) return null;
    if (Math.min(wPct, hPct) < 0.15) return null;

    /* tak boleh menyentuh tepi frame (kartu terlihat utuh) */
    if (comp.minX <= 1 || comp.minY <= 1 || comp.maxX >= W - 2 || comp.maxY >= H - 2) return null;

    /* rasio mengikuti BINGKAI AKTIF (KTP/SIM lanskap; ID Card ikut orientasi ↻) */
    var R = this._frameRatio(), ar = bw / bh;
    var dAr0 = Math.abs(Math.log(ar / R));
    if (dAr0 > 0.37) return null;   /* melenceng > ±37% dari bingkai -> tolak */

    /* kelengkapan bentuk isi blob */
    var fill = comp.area / (bw * bh);
    if (fill < 0.55) return null;

    /* pusat blob harus dekat tengah bingkai */
    var ccx = (comp.minX + comp.maxX) / 2, ccy = (comp.minY + comp.maxY) / 2;
    if (Math.abs(ccx - W / 2) > 0.34 * W || Math.abs(ccy - H / 2) > 0.34 * H) return null;

    var st = this._regionStats(comp);
    if (!st) return null;

    /* HARUS ada tekstur cetakan/foto di dalam kartu -> dinding/meja polos gugur */
    if (st.sdIn < 9 || st.sdIn > 130) return null;
    if (st.meanIn > 246 || st.meanIn < 8) return null;

    /* kontras tonal kartu vs lingkungannya */
    if (st.contrast < 11) return null;

    var scAr = clamp(1 - dAr0 / 0.5, 0, 1);
    var scFill = clamp((fill - 0.55) / 0.45, 0, 1);
    var scSd = st.sdIn <= 35 ? 1 : clamp((85 - st.sdIn) / 50, 0, 1);
    var scC = clamp(st.contrast / 22, 0, 1);
    var score = 0.40 * scAr + 0.22 * scFill + 0.18 * scSd + 0.20 * scC;
    if (score < 0.52) return null;

    return {
      minX: comp.minX, minY: comp.minY, maxX: comp.maxX, maxY: comp.maxY,
      area: comp.area, score: score, orientation: this._orient
    };
  };

  /* ---------- statistik interior kartu + cincin latar di sekelilingnya ---------- */
  DocumentAutoCapture.prototype._regionStats = function (comp) {
    var W = this.W, H = this.H, lum = this.lum;
    var x0 = comp.minX, y0 = comp.minY, x1 = comp.maxX, y1 = comp.maxY;
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1;

    /* interior: inset 18% agar tepi tak mencemari */
    var ix0 = x0 + Math.round(bw * 0.18), ix1 = x1 - Math.round(bw * 0.18);
    var iy0 = y0 + Math.round(bh * 0.18), iy1 = y1 - Math.round(bh * 0.18);
    if (ix1 - ix0 < 2 || iy1 - iy0 < 2) return null;

    var nIn = 0, sIn = 0, s2In = 0, stepX = Math.max(1, ((ix1 - ix0) / 24) | 0);
    var stepY = Math.max(1, ((iy1 - iy0) / 24) | 0), x, y, v;
    for (y = iy0; y <= iy1; y += stepY) {
      for (x = ix0; x <= ix1; x += stepX) {
        v = lum[y * W + x];
        sIn += v; s2In += v * v; nIn++;
      }
    }
    if (nIn < 12) return null;
    var meanIn = sIn / nIn;
    var sdIn = Math.sqrt(Math.max(0, s2In / nIn - meanIn * meanIn));

    /* ring latar: pita selebar 4 px di luar bbox */
    var rx0 = Math.max(0, x0 - 4), ry0 = Math.max(0, y0 - 4);
    var rx1 = Math.min(W - 1, x1 + 4), ry1 = Math.min(H - 1, y1 + 4);
    var nOut = 0, sOut = 0;
    for (x = rx0; x <= rx1; x++) {
      for (y = ry0; y <= ry1; y++) {
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue; // dalam kartu skip
        sOut += lum[y * W + x]; nOut++;
      }
    }
    var contrast = nOut > 20 ? Math.abs(meanIn - sOut / nOut) : Math.abs(meanIn - 128);
    return { meanIn: meanIn, sdIn: sdIn, contrast: contrast };
  };

  /* ---------- loop: deteksi tiap-2 frame, kestabilan relatif, gate rana ---------- */
  DocumentAutoCapture.prototype._loop = function () {
    if (!this.running) return;
    var self = this;
    var now = (global.performance && performance.now) ? performance.now() : Date.now();
    if (!this._t0) this._t0 = now;

    if (this.video && this.video.readyState >= 2 && this.video.videoWidth) {
      if ((++this._tick & 1) === 1 || !this.lastBox) {          // setiap frame genap
        if ((this._tick % 10) === 0) this._syncGeom();
        var box = this._detect();
        var good = !!box;
        var dTolX = 0.04 * this.W, dTolY = 0.04 * this.H;
        if (good) {
          var lb = this.lastBox, moved = !lb ||
            Math.abs(lb.minX - box.minX) > dTolX || Math.abs(lb.minY - box.minY) > dTolY ||
            Math.abs(lb.maxX - box.maxX) > dTolX || Math.abs(lb.maxY - box.maxY) > dTolY;
          this.stableRun = moved ? 1 : Math.min(this.stableRun + 1, this.stableFrames);
        } else {
          /* toleransi kedip eksposur: jatuh hanya jika gagal berturut-turut */
          this.stableRun = Math.max(0, this.stableRun - 2);
        }
        this.lastBox = good ? box : this.lastBox; // simpan kandidat terakhir utk crop
      }
      var detected = !!this.lastBox && this.stableRun > 0;
      var holdMs = now - this._t0;
      var prog = clamp(this.stableRun / this.stableFrames, 0, 1);
      var ready = holdMs >= this.minHoldMs;
      var locked = this.stableRun >= Math.ceil(this.stableFrames / 2);

      this._drawOverlay(detected ? this.lastBox : null, locked, prog, ready);
      this.onStatus(
        detected ? (locked ? (ready ? 'Dokumen terkunci — mengambil…' : 'Memindai ' + Math.round(prog * 100) + '%') : 'Jaga dokumen tetap diam') :
                   'Posisikan ' + this.label + ' di dalam bingkai', detected
      );

      /* GATE auto-capture: butuh deteksi valid x stabil penuh x waktu minimal */
      if (this.auto && detected && locked && prog >= 1 && ready) {
        this.capture();
        return;
      }
    } else {
      this._drawOverlay(null, false, 0, false);
    }
    this._raf = requestAnimationFrame(self._boundLoop);
  };

  /* ---------- overlay: vignette bingkai (rasio PERSIS ID-1) + sudut deteksi + progress ---------- */
  DocumentAutoCapture.prototype._drawOverlay = function (box, good, prog, ready) {
    var cv = this.overlay;
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(2,6,23,0.42)';
    ctx.fillRect(0, 0, W, H);

    /* bingkai = rasio persis this.ratio pada AREA VIDEO TERLIHAT (bukan area layar) */
    var b = this._box();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([5, 6]);
    ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);

    function corners(x, y, w, h, color, lw) {
      var L = Math.max(12, w * 0.09);
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    }
    if (box) {
      var bx = box.minX / this.W * W, by = box.minY / this.H * H;
      var bx2 = box.maxX / this.W * W, by2 = box.maxY / this.H * H;
      ctx.strokeStyle = good ? 'rgba(34,197,94,.85)' : 'rgba(255,255,255,.75)';
      ctx.lineWidth = good ? 3 : 1.6; ctx.setLineDash([3, 3]);
      ctx.strokeRect(bx, by, bx2 - bx, by2 - by); ctx.setLineDash([]);
      corners(bx, by, bx2 - bx, by2 - by, good ? '#22c55e' : '#ffffff', good ? 4 : 2.2);
    }
    corners(b.x, b.y, b.w, b.h, good ? this.accent : '#ffffff', good ? 4 : 2.2);

    /* teks status di atas bingkai */
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Poppins, Segoe UI, sans-serif';
    ctx.fillStyle = good ? this.accent : '#fff';
    var msg = good
      ? ((prog >= 1 && ready) ? '\u25CF MENGAMBIL ' : 'MEMINDAI\u2026 ') + this.label
      : 'POSISIKAN ' + this.label + ' DI DALAM BINGKAI';
    ctx.fillText(msg, W / 2, Math.max(14, b.y - 12));

    /* badge HTML: jenis + ukuran kartu, mengikuti posisi bingkai */
    this._badge(b.x + b.w / 2, b.y + b.h + 18, this._sizeText(), this.accent);

    /* bar progres persis di bawah bingkai */
    if (good) {
      var pw = b.w * clamp(prog || 0, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(b.x, b.y + b.h + 8, b.w, 5);
      ctx.fillStyle = ready ? this.accent : '#38bdf8';
      ctx.fillRect(b.x, b.y + b.h + 8, pw, 5);
    }
  };

  DocumentAutoCapture.prototype._frameRatio = function () {
    /* rasio bingkai EFEKTIF: lanskap = w/h ; potret (setelah putar) = h/w */
    return this._orient === 'portrait' ? 1 / this.ratio : this.ratio;
  };
  DocumentAutoCapture.prototype._sizeText = function () {
    var mm = this.mm || { w: 85.60, h: 53.98 };
    return this.label + ' \u2022 ' +
      (this._orient === 'portrait'
        ? fmtMm(mm.h) + ' \u00d7 ' + fmtMm(mm.w)
        : fmtMm(mm.w) + ' \u00d7 ' + fmtMm(mm.h)) + ' mm';
  };

  /* tombol putar bingkai (hanya jenis rotatable, mis. ID CARD) */
  DocumentAutoCapture.prototype._makeRotBtn = function () {
    var host = this.overlay && this.overlay.parentElement;
    if (!host) return;
    if (!this._rotBtn) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'doc-cap-rot'; b.innerHTML = '&#8635;';
      b.setAttribute('aria-label', 'Putar bingkai');
      b.title = 'Putar bingkai mendatar/tegak';
      var self = this;
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation(); self.rotateFrame();
      });
      host.appendChild(b);
      this._rotBtn = b;
    }
    this._rotBtn.style.display = 'flex';
  };
  DocumentAutoCapture.prototype._removeRotBtn = function () {
    if (this._rotBtn && this._rotBtn.parentNode) this._rotBtn.parentNode.removeChild(this._rotBtn);
    this._rotBtn = null;
  };
  DocumentAutoCapture.prototype.rotateFrame = function () {
    if (!this.rotatable) return;
    this._orient = this._orient === 'portrait' ? 'landscape' : 'portrait';
    this.snd('click');
    this._resize();
  };

  /* badge jenis dokumen diposisikan ikut geometri overlay tiap frame */
  DocumentAutoCapture.prototype._badge = function (cx, cy, text, color) {
    var host = this.overlay && this.overlay.parentElement;
    if (!host) return;
    if (!this._badgeEl) {
      this._badgeEl = document.createElement('div');
      this._badgeEl.className = 'doc-cap-badge';
      host.appendChild(this._badgeEl);
    }
    var r = this.overlay.getBoundingClientRect();
    var pr = host.getBoundingClientRect();
    this._badgeEl.textContent = text || '';
    this._badgeEl.style.display = text ? 'block' : 'none';
    this._badgeEl.style.background = color || '#22c55e';
    this._badgeEl.style.left = Math.round(r.left - pr.left + cx) + 'px';
    this._badgeEl.style.top = Math.round(r.top - pr.top + cy) + 'px';
  };

  /* ---------- ambil foto: crop area kartu terdeteksi ke rasio ID-1 ---------- */
  DocumentAutoCapture.prototype.capture = function () {
    if (!this.video || !this.video.videoWidth) return;
    var self = this;
    this.snd('shutter');
    var vw = this.video.videoWidth, vh = this.video.videoHeight;
    var cx, cy, cw, ch;

    if (this.lastBox && !this._geom.fallback) {
      /* work-piksel -> piksel video lewat geometri tampilan yang sebenarnya */
      var g = this._geom;
      var ux = g.drawW / this.W, uy = g.drawH / this.H;
      cx = g.offX + this.lastBox.minX * ux;
      cy = g.offY + this.lastBox.minY * uy;
      cw = (this.lastBox.maxX - this.lastBox.minX) * ux;
      ch = (this.lastBox.maxY - this.lastBox.minY) * uy;
      /* margin 12% di keliling kartu */
      var px = cw * 0.12, py = ch * 0.12;
      cx -= px; cy -= py; cw += px * 2; ch += py * 2;
    } else {
      cw = vw; ch = vw / this.ratio;
      if (ch > vh) { ch = vh; cw = vh * this.ratio; }
      cx = (vw - cw) / 2; cy = (vh - ch) / 2;
    }
    /* --- KUNCI RASIO bingkai aktif: crop dipaksa persis FR -> TIDAK gepeng --- */
    var FR = this._frameRatio();
    if (cw / ch > FR) { var nw = ch * FR; cx += (cw - nw) / 2; cw = nw; }
    else              { var nh = cw / FR; cy += (ch - nh) / 2; ch = nh; }
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cx + cw > vw) cw = vw - cx;
    if (cy + ch > vh) ch = vh - cy;
    if (cw < 16 || ch < 16) return;

    /* canvas keluaran proporsional: tinggi = lebar / rasio -> gambar tak melar */
    var outW = Math.min(1000, Math.max(480, Math.round(cw)));
    var outH = Math.round(outW / FR);
    void self;
    var out = document.createElement('canvas');
    out.width = outW; out.height = outH;
    out.getContext('2d').drawImage(this.video, cx | 0, cy | 0, cw | 0, ch | 0, 0, 0, outW, outH);
    var dataURL = out.toDataURL('image/jpeg', 0.92);
    this.stop();
    this.onStatus('Foto ' + this.label + ' terambil' + (this.auto ? ' (auto-capture)' : ''), true);
    this.onCapture(dataURL, { docType: this.docType, label: this.label });
    void self;
  };

  DocumentAutoCapture.VERSION = '4.0';
  global.DocumentAutoCapture = DocumentAutoCapture;
})(window);