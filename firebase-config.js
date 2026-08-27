/* firebase-config.js - Firebase Web SDK v9 modular (project heinuuu)
   Backend: Realtime Database (node `pengajuan`) + Firebase Storage (foto KTP/ttd)
   Di-load via <script type="module" src="firebase-config.js"> di portal.html.
   Hasil init diekspor ke window.ffc agar kode global di portal tetap dipakai.
*/
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getDatabase, ref, push, set, get, query, orderByChild, limitToLast,
} from "firebase/database";
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL,
} from "firebase/storage";
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from "firebase/auth";

// --- Konfigurasi web app Firebase (proyek heinuuu); databaseURL = RTDB ---
const firebaseConfig = {
  apiKey: "AIzaSyCjVcOgRR6-x8jlSDGC4_vFuhVZdwY8vDU",
  authDomain: "heinuuu.firebaseapp.com",
  databaseURL: "https://heinuuu.firebaseio.com",
  projectId: "heinuuu",
  storageBucket: "heinuuu.firebasestorage.app",
  messagingSenderId: "67694250171",
  appId: "1:67694250171:web:86332428fabde31ddd019e",
  measurementId: "G-WLY8T1197W",
};
let app = null, analytics = null, db = null, storage = null, auth = null;
let _authReady = false, _authUser = null, _initPromise = null;
var DB_PROBE_OK = null;   // true = ada host RTDB merespon; false = semua kandidat 404/tak terjangkau; null = belum dicek

async function resolveDbHost() {
  try {
    var ov = localStorage.getItem("tribi_rtdb_host");
    if (ov && ov.indexOf("http") === 0) return ov;   // override / hasil dicek tersimpan
  } catch (e) { /* localStorage unavailable */ }
  var proj = firebaseConfig.projectId;
  // urutan dicoba: region Asia (umum untuk Indonesia) -> Eropa -> US (lama) -> US klasik
  var cands = [
    "https://" + proj + "-default-rtdb.asia-southeast1.fire.database.app",
    "https://" + proj + "-default-rtdb.europe-west1.fire.database.app",
    "https://" + proj + "-default-rtdb.us-central1.fire.database.app",
    "https://" + proj + "-default-rtdb.firebaseio.com",
    "https://" + proj + ".firebaseio.com"
  ];
  for (var i = 0; i < cands.length; i++) {
    var base = cands[i];
    try {
      var r = await fetch(base + "/pengajuan.json", { method: "GET" });
      // 200/403/401/429 = instance live; 404 = bukan instance
      if (r.status === 404) continue;
      if (r.status >= 200 && r.status < 500) {
        DB_PROBE_OK = true;
        try { localStorage.setItem("tribi_rtdb_host", base); } catch (eh) {}
        return base;
      }
    } catch (e2) { /* DNS/network: try next */ }
  }
  DB_PROBE_OK = false;   // tidak ada satu pun host yang merespon -> RTDB belum ada/belum dibuat
  return cands[0];
}

function initOnce() {
  if (!_initPromise) {
    _initPromise = (async () => {
      var host = await resolveDbHost();
      var cfg = Object.assign({}, firebaseConfig, { databaseURL: host });
      app = initializeApp(cfg);
      try { analytics = typeof window !== "undefined" ? getAnalytics(app) : null; } catch (e) { /* local dev */ }
      db = getDatabase(app, host);        // Realtime Database (mengganti Firestore)
      storage = getStorage(app);
      auth = getAuth(app);
      onAuthStateChanged(auth, (u) => {
        _authReady = !!u; _authUser = u;
        try {
          window.dispatchEvent(new CustomEvent("firebase-ready", {
            detail: { ready: _authReady, uid: u ? u.uid : null },
          }));
        } catch (e3) {}
      });
      signInAnonymously(auth).catch(() => { /* anon optional; RTDB rules terbuka juga oke */ });
    })();
  }
  return _initPromise;
}

async function ensureAuth() {
  await initOnce();
  if (_authReady && auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u || null); });
  });
}

function rowsToText(d) {
  const NL = String.fromCharCode(10);
  return (d.rows || []).map((r, i) => {
    if (d.cat === "barang") return (i+1) + ". " + r.nama + " | Jumlah: " + (r.jml||0) + " " + (r.sat||"") + (r.ket ? " | Keterangan: " + r.ket : "");
    return (i+1) + ". " + r.nopol + " | Merk/Type: " + (r.merk || "-");
  }).join(NL);
}

async function uploadDataURL(path, dataURL) {
  if (!dataURL) return null;
  const r = storageRef(storage, path);
  const snap = await uploadString(r, dataURL, "dataURL");
  return await getDownloadURL(snap.ref);
}

/** Simpan SATU pengajuan ke Realtime Database (node `pengajuan`) + foto KTP/sig ke Storage. */
async function saveToFirebase(d) {
  const _toast = window.toast ? window.toast : null;
  // Gagal cepat bila probing awal menunjukkan RTDB tidak ada (hindari hang tanpa info)
  if (DB_PROBE_OK === false) {
    const msg = "Realtime Database tidak ditemukan pada proyek '" + firebaseConfig.projectId +
      "' — buka Firebase Console → Build → Realtime Database → Create Database, lalu muat ulang halaman ini. Data tetap aman di antrean & Google Sheets.";
    _toast && _toast(msg, "err", 12000);
    return false;
  }
  const work = (async () => {
    const user = await ensureAuth();
    const ts = Date.now();
    const uid = user ? user.uid : null;
    const ktpUrl = d.ktp ? await uploadDataURL("ktp/" + d.docNo + "_" + ts + ".jpg", d.ktp) : null;
    const sigUrl = d.signature ? await uploadDataURL("sig/" + d.docNo + "_" + ts + ".png", d.signature) : null;
    const doc = {
      cat: d.cat, catName: d.catName, docNo: d.docNo, date: d.date, nama: d.nama, nik: d.nik,
      perusahaan: d.perusahaan, ktpName: d.ktpName, ktpUrl: ktpUrl, signatureUrl: sigUrl,
      rows: d.rows || [], rowsText: rowsToText(d), status: "Menunggu verifikasi",
      uid: uid || null, createdAt: ts,            // epoch ms -> orderByChild("createdAt")
    };
    const newDocRef = push(ref(db, "pengajuan"));
    await set(newDocRef, doc);
    return true;
  })();
  const ok = await Promise.race([
    work,
    new Promise((r) => setTimeout(() => r("timeout"), 30000)),
  ]);
  if (ok === "timeout") {
    _toast && _toast("Kirim ke Firebase melebihi 30 dtk (host RTDB tidak merespon) — data masuk antrean otomatis", "warn", 9000);
    try { localStorage.removeItem("tribi_rtdb_host"); } catch (e2) {}   // host mungkin mati -> resolve ulang di percobaan berikutnya
    return false;
  }
  if (ok === true) {
    _toast && _toast("Data tersimpan ke Realtime Database (Firebase) [OK]", "ok");
    return true;
  }
  // ok === false : work() melempar error (sudah ditangani catch di bawah)
  try {
    await work;
  } catch (e) {
    const h = hintFor(e);
    _toast && _toast("Gagal simpan ke Firebase: " + ((e && e.message) || String(e)) + (h ? " | " + h : ""), "err", 10000);
    console.error("[firebase] saveToFirebase error:", e);
    try { localStorage.removeItem("tribi_rtdb_host"); } catch (e2) {}
    return false;
  }
  return false;
}

/** Muat seluruh pengajuan dari node RTDB `pengajuan` (terbaru dulu). */
async function loadFromFirebase() {
  try {
    await ensureAuth();
    const snap = await get(ref(db, "pengajuan"));
    const out = [];
    if (snap && typeof snap.forEach === "function") {
      snap.forEach((child) => {
        const v = child.val();
        out.push({ id: child.key, ...(v || {}) });
      });
    }
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  } catch (e) {
    const _toast = window.toast ? window.toast : null;
    const h = hintFor(e);
    _toast && _toast("Gagal muat dari Firebase: " + ((e && e.message) || String(e)) + (h ? " | " + h : ""), "err", 10000);
    console.error("[firebase] loadFromFirebase error:", e);
    return [];
  }
}

function hintFor(e) {
  const code = ((e && e.code) || "").toLowerCase();
  const msg = ((e && e.message) || "").toLowerCase();
  if (code.indexOf("operation-not-allowed") >= 0 || msg.indexOf("anonymous") >= 0)
    return "Anonymous Auth belum diaktifkan -> Konsol Firebase -> Authentication -> Sign-in method -> aktifkan Anonymous.";
  if (code.indexOf("permission-denied") >= 0)
    return "Aturan keamanan menolak -> publish database.rules.json & storage.rules ke Konsol Firebase.";
  if (code.indexOf("database") >= 0 || code.indexOf("not-found") >= 0)
    return "Realtime Database belum dibuat -> Konsol Firebase -> Build -> Realtime Database -> Create database.";
  if (code.indexOf("storage") >= 0 || code.indexOf("bucket") >= 0)
    return "Storage belum dibuat -> Konsol Firebase -> Build -> Storage -> Get started.";
  return null;
}

/** Diagnostik koneksi Firebase tanpa mengubah data. */
async function testFirebase() {
  const _toast = window.toast ? window.toast : null;
  const out = { ok: false, moduleLoaded: !!window.ffc, projectId: firebaseConfig.projectId, authReady: false, authUid: null, dbRead: false, steps: [] };
  try {
    if (!out.moduleLoaded) { out.steps.push("firebase-config.js tidak termuat. Cek Network di DevTools."); return out; }
    try {
      const u = await Promise.race([ ensureAuth(), new Promise((r) => setTimeout(() => r(null), 4000)) ]);
      out.authReady = !!u && !!u.uid; out.authUid = u ? u.uid : null;
    } catch (ea) { out.steps.push("Anonymous Auth gagal: " + ea.message); }
    try {
      const qSnap = await Promise.race([
        get(query(ref(db, "pengajuan"), limitToLast(1))),
        new Promise((r) => setTimeout(() => r("timeout"), 25000)),
      ]);
      if (qSnap === "timeout") {
        out.dbRead = false;
        out.steps.push("Realtime Database tidak merespon (timeout 25 dtk) — buat/cek Realtime Database di Firebase Console");
        out.ok = false;
        return out;
      }
      out.dbRead = true;
      const cnt = qSnap && typeof qSnap.numChildren === "function" ? qSnap.numChildren() : 0;
      out.steps.push("Realtime Database terbaca [OK] (" + cnt + " node ditemukan)");
    } catch (ef) {
      const h = hintFor(ef);
      out.steps.push("Realtime Database GAGAL: " + ef.message + (h ? " -> " + h : ""));
    }
    out.ok = out.dbRead;
    return out;
  } catch (e) {
    out.steps.push("Error interno: " + e.message);
    return out;
  }
}

// --- Google Sheets (Apps Script) integration ---
const SHEET_DOC_ID = "1ym6u8evb9PhLvbo6YH3aVFDScGow7KjToj4C7TNO9IM";
// Endpoint Apps Script (Terbuka → POST JSON). Sudah diverifikasi AKTIF (HTTP 200).
// Harus SAMA dengan SHEET_ENDPOINT di portal.html.
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUgq1Qld1diz-xk5cfWg0OgOKN5_PA0zT-qeaEDzBJM3KrLJobCAsBVd6fOTFZn4_y/exec";
const SHEET_FALLBACK_NOTE = "Google Apps Script endpoint belum merespon (402/403/timeout); data tetap tersimpan ke Firebase.";

async function saveToSheet(d) {
  try {
    const NL = String.fromCharCode(10);
    const rowsText = (d.rows || []).map((r, i) => {
      if (d.cat === "barang") return (i + 1) + ". " + (r.nama || "-") + " | Jumlah: " + (r.jml || 0) + (r.sat ? " " + r.sat : "") + (r.ket ? " | " + r.ket : "");
      return (i + 1) + ". " + (r.nopol || r.nama || "-") + " | Merk/Type: " + (r.merk || "-");
    }).join(NL);
    const payload = {
      docId: SHEET_DOC_ID, cat: d.cat, catName: d.catName, docNo: d.docNo, date: d.date,
      nama: d.nama, nik: d.nik, perusahaan: d.perusahaan, ktpName: d.ktpName,
      ktp: d.ktp, signature: d.signature, rows: rowsText, status: "Menunggu verifikasi"
    };
    const res = await fetch(SHEET_ENDPOINT, {
      method: "POST", mode: "cors", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    let js = {}; try { js = JSON.parse(raw || "{}"); } catch (e) {}
    const ok = (js.ok === true) || (res.ok && raw.toLowerCase().indexOf("error") === -1);
    if (typeof window !== "undefined" && window.toast) {
      window.toast(ok ? "Data tersimpan ke Google Sheets \u2714" : ("Sheets HTTP " + res.status + ": " + ((js.message) || raw.slice(0, 80))), ok ? "ok" : "err", 7000);
    }
    return ok;
  } catch (e) {
    if (typeof window !== "undefined" && window.toast) window.toast(SHEET_FALLBACK_NOTE + " (" + ((e && e.message) || e) + ")", "err", 9000);
    return false;
  }
}

// Expose ke scope global (portal.html pakai window.ffc)
window.ffc = {
  app, analytics, db, storage, auth, firebaseConfig,
  saveToFirebase, loadFromFirebase, ensureAuth, testFirebase, hintFor, saveToSheet,
  sheetInfo: () => ({ docId: SHEET_DOC_ID, endpoint: SHEET_ENDPOINT }),
  dbProbeOk: () => DB_PROBE_OK,
  ready: () => _authReady, uid: () => (_authUser ? _authUser.uid : null),
};
export { app, analytics, db, storage, auth, firebaseConfig, saveToFirebase, loadFromFirebase, saveToSheet };

