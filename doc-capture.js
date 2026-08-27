/* ============================================================================
 * doc-capture.js  —  Document Auto Capture Component (reusable)
 * ----------------------------------------------------------------------------
 * Mengubah kamera menjadi pemindai dokumen otomatis:
 *   • Deteksi tepi dokumen (KTP/ID Card/SIM) secara real-time di frame video.
 *   • Menampilkan bingkai panduan + penanda sudut hijau saat dokumen terdeteksi
 *     dan sejajar dalam bingkai.
 *   • AUTO-CAPTURE saat dokumen stabil (tidak bergetar) & memenuhi bingkai,
 *     lalu menghasilkan foto ter-crop presisi rasio ID-1.
 *   • Disediakan juga tombol manual (capture()) sebagai cadangan.
 *
 * Pemakaian:  new DocumentAutoCapture({ video, overlay, ...opts }).start()
 * ==========================================================================*/
(function (global) {
  'use strict';

  var DEFAULT_RATIO = 85.60 / 53.98; // ID-1 (KTP/SIM/kartu)

  function DocumentAutoCapture(opts) {
    opts = opts || {};
    this.video      = opts.video;                       // <video>
    this.overlay    = opts.overlay;                     // <canvas> overlay
    this.docType    = opts.docType || 'ktp';            // 'ktp'|'idcard'|'sim'
    this.label      = opts.label || 'DOKUMEN';
    this.ratio      = opts.ratio || DEFAULT_RATIO;
    this.onCapture  = opts.onCapture || function () {}; // (dataURL, info) => void
    this.onStatus   = opts.onStatus || function () {};  // (statusText, isGood) => void
    this.auto       = opts.auto !== false;              // auto-capture on/off
    this.snd        = opts.sound || function () {};     // sound hook

    this.stream     = null;
    this.running    = false;
    this.work       = null;   // offscreen detection buffer
    this.wctx       = null;
    this.stableRun  = 0;
    this.lastBox    = null;
    this.outW       = 720;
    this.outH       = Math.round(720 / this.ratio);

    this._raf = 0;
    this._boundLoop = this._loop.bind(this);
    this._boundResize = this._resize.bind(this);
  }

  DocumentAutoCapture.prototype._resize = function () {
    if (this.overlay) { this.overlay.width = this.overlay.offsetWidth; this.overlay.height = this.overlay.offsetHeight; }
  };

  DocumentAutoCapture.prototype._bufSize = function () {
    var W = 128;
    var OW = this.overlay.offsetWidth || 300, OH = this.overlay.offsetHeight || 200;
    var H = Math.max(64, Math.round(W * OH / Math.max(1, OW)));
    return [W, H];
  };

  /* --- mulai kamera + loop deteksi --- */
  DocumentAutoCapture.prototype.start = function () {
    var self = this;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatus('Kamera tidak didukung browser', false);
      return Promise.reject(new Error('getUserMedia tidak tersedia'));
    }
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(function (stream) {
        self.stream = stream;
        self.video.srcObject = stream;
        return self.video.play();
      })
      .then(function () {
        self.running = true;
        self._resize();
        self.work = document.createElement('canvas');
        var s = self._bufSize(); self.work.width = s[0]; self.work.height = s[1];
        self.wctx = self.work.getContext('2d', { willReadFrequently: true });
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
  };

  /* --- analisa satu frame: deteksi persegi dokumen --- */
  DocumentAutoCapture.prototype._detect = function () {
    var W = this.work.width, H = this.work.height;
    this.wctx.drawImage(this.video, 0, 0, W, H);
    var img = this.wctx.getImageData(0, 0, W, H).data;
    var lum = new Float32Array(W * H), i, j, sum = 0;
    for (i = 0; i < W * H; i++) {
      j = i * 4;
      var l = 0.299 * img[j] + 0.587 * img[j + 1] + 0.114 * img[j + 2];
      lum[i] = l; sum += l;
    }
    var mean = sum / (W * H);
    var thr = mean + 6;                 // asumsikan dokumen lebih terang dari latar
    var minX = W, minY = H, maxX = -1, maxY = -1, doc = 0, x, y;
    for (i = 0; i < W * H; i++) {
      if (lum[i] >= thr) {
        doc++;
        x = i % W; y = (i / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (doc < 0.05 * W * H) return null;
    var bw = maxX - minX, bh = maxY - minY;
    if (bw < 0.2 * W || bh < 0.2 * H) return null;
    var bboxArea = bw * bh, frameFrac = bboxArea / (W * H);
    if (frameFrac < 0.18 || frameFrac > 0.96) return null;
    var fill = doc / bboxArea;
    if (fill < 0.5) return null;
    var ccx = (minX + maxX) / 2, ccy = (minY + maxY) / 2;
    if (Math.abs(ccx - W / 2) > 0.28 * W || Math.abs(ccy - H / 2) > 0.28 * H) return null;
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  };

  /* --- gambar overlay: panduan + sudut deteksi --- */
  DocumentAutoCapture.prototype._drawOverlay = function (box, good) {
    var cv = this.overlay, ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(2,6,23,0.42)';
    ctx.fillRect(0, 0, W, H);
    var cw = W * 0.86, ch = cw / this.ratio;
    if (ch > H * 0.9) { ch = H * 0.9; cw = ch * this.ratio; }
    var cx = (W - cw) / 2, cy = (H - ch) / 2;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(cx, cy, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([5, 6]);
    ctx.strokeRect(cx, cy, cw, ch); ctx.setLineDash([]);
    var color = good ? '#22c55e' : '#ffffff', L = 16, lw = good ? 4 : 2.2;
    function corners(x, y, w, h) {
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    }
    if (box) {
      var bx = box.minX / this.work.width * W, by = box.minY / this.work.height * H;
      var bx2 = box.maxX / this.work.width * W, by2 = box.maxY / this.work.height * H;
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([2, 3]);
      ctx.strokeRect(bx, by, bx2 - bx, by2 - by); ctx.setLineDash([]);
      corners(bx, by, bx2 - bx, by2 - by);
    }
    corners(cx, cy, cw, ch);
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Poppins, Segoe UI, sans-serif';
    ctx.fillStyle = good ? '#22c55e' : '#fff';
    ctx.fillText(good ? '● ' + this.label + ' TERDETEKSI — MENGAMBIL…' : 'POSISIKAN ' + this.label + ' DI DALAM BINGKAI', W / 2, cy - 12);
  };


  /* --- loop deteksi + auto-capture --- */
  DocumentAutoCapture.prototype._loop = function () {
    if (!this.running) return;
    var self = this;
    if (this.video && this.video.readyState >= 2 && this.video.videoWidth) {
      var box = this._detect();
      var good = !!box;
      var STABLE = 5;   // jumlah frame stabil sebelum auto-capture
      if (good) {
        if (this.lastBox && Math.abs(this.lastBox.minX - box.minX) < 2 &&
            Math.abs(this.lastBox.minY - box.minY) < 2 &&
            Math.abs(this.lastBox.maxX - box.maxX) < 2 &&
            Math.abs(this.lastBox.maxY - box.maxY) < 2) {
          this.stableRun++;
        } else {
          this.stableRun = 1;
        }
        this.lastBox = box;
      } else {
        this.stableRun = 0; this.lastBox = null;
      }
      this._drawOverlay(good ? box : null, good && this.stableRun >= 2);
      if (this.auto && good && this.stableRun >= STABLE) {
        this.capture();
        return;
      }
      this.onStatus(good ? (this.stableRun >= 2 ? 'Dokumen terdeteksi — jaga tetap diam…' : 'Dokumen terdeteksi') : 'Cari dokumen…', good);
    }
    this._raf = requestAnimationFrame(this._boundLoop);
  };

  /* --- ambil foto (manual atau auto), crop ke rasio ID-1 --- */
  DocumentAutoCapture.prototype.capture = function () {
    var self = this;
    if (!this.video || !this.video.videoWidth) return;
    this.snd('shutter');
    var vw = this.video.videoWidth, vh = this.video.videoHeight;
    var cx, cy, cw, ch;
    if (this.lastBox) {
      var bx = this.lastBox.minX / this.work.width * vw, by = this.lastBox.minY / this.work.height * vh;
      var bx2 = this.lastBox.maxX / this.work.width * vw, by2 = this.lastBox.maxY / this.work.height * vh;
      cw = (bx2 - bx) * 1.15; ch = (by2 - by) * 1.15;
      cx = bx - (cw - (bx2 - bx)) / 2; cy = by - (ch - (by2 - by)) / 2;
    } else {
      cw = vw; ch = vw / this.ratio; if (ch > vh) { ch = vh; cw = vh * this.ratio; }
      cx = (vw - cw) / 2; cy = (vh - ch) / 2;
    }
    if (cx < 0) cx = 0; if (cy < 0) cy = 0;
    if (cx + cw > vw) cw = vw - cx; if (cy + ch > vh) ch = vh - cy;
    var out = document.createElement('canvas');
    out.width = this.outW; out.height = this.outH;
    var oc = out.getContext('2d');
    oc.drawImage(this.video, cx, cy, cw, ch, 0, 0, this.outW, this.outH);
    var dataURL = out.toDataURL('image/jpeg', 0.92);
    this.stop();
    this.onStatus('Foto ' + this.label + ' terambil (auto-capture)', true);
    this.onCapture(dataURL, { docType: this.docType, label: this.label });
  };

  global.DocumentAutoCapture = DocumentAutoCapture;
})(window);

