# Panduan Deploy Firebase -- Form Tribik Auction

`portal.html` kini menyimpan (dan memuat) data ke **Firebase Realtime Database
+ Firebase Storage** sebagai pengganti/tambahan Google Sheets. Berkas
konfigurasinya ada di [`firebase-config.js`](./firebase-config.js) (Web SDK v9
modular, CDN).

---

## 1. Web app sudah terdaftar

Web app `heinuuu` sudah ada di konsol Firebase:

- **projectId**       : `heinuuu`
- **storageBucket**   : `heinuuu.firebasestorage.app`
- **measurementId**   : `G-WLY8T1197W`
- **databaseURL**     : SESUAIKAN — lihat catatan di bawah!

> **PENTING (cek dulu!)**: URL `https://heinuuu.firebaseio.com` TIDAK aktif (404 saat dicek).
> Buka **Konsol Firebase → Build → Realtime Database**, buat database-nya, lalu salin URL asli
> yang tampil di data viewer. Polanya salah satu dari:
> - `https://heinuuu-default-rtdb.asia-southeast1.fire.database.app` (region Asia/Singapura)
> - `https://heinuuu-default-rtdb.firebaseio.com`                    (region US)
>
> Kabar baiknya `firebase-config.js` sekarang OTOMATIS mencoba beberapa kandidat host
> (Asia → Eropa → US) setiap load, jadi begitu RTDB dibuat, koneksi langsung jalan tanpa
> ubah kode. Host sukses di-cache di localStorage (`tribi_rtdb_host`) dan cache dibuang
> otomatis kalau ternyata gagal saat menulis.

Jika belum, buat web app baru di konsol -> *Project Settings -> Your apps -> Add app -> Web*.

> Jika Realtime Database Anda memakai instansi regional (mis.
> `https://heinuuu-default-rtdb.firebaseio.com` atau
> `https://<project>-default-rtdb.<region>.firebasedatabase.app`), ganti nilai
> `databaseURL` di `firebase-config.js` agar cocok -- seluruh logika penyimpanan
> sudah memakai `getDatabase(app)` dan akan menyesuaikan.

---

## 2. Aktifkan produk yang dipakai

Buka konsol Firebase -> pilih proyek `heinuuu`, lalu aktifkan:

| Produk | Cara aktif |
|---|---|
| **Realtime Database** | Build -> Realtime Database -> *Create database* (pilih region). |
| **Storage**           | Build -> Storage -> *Get started* (gunakan bucket default `...firebasestorage.app`). |

> **Authentication (Anonymous)** kini OPSIONAL. Rules terbuka (mode berbiar) supaya
> data langsung masuk bahkan tanpa mengaktifkan Anonymous. Anonymous auth tetap
> berguna untuk aturan produksi nanti, jadi tetap OPSIONAL.

---

## 3. Pasang aturan keamanan (Realtime Database + Storage) -- MODE TERBUKA

- **Realtime Database -> Rules** -> tempel isi [`database.rules.json`](./database.rules.json):
  node `pengajuan` boleh dibaca & ditambah siapa saja (mode terbuka) -- supaya data
  langsung masuk tanpa perlu mengaktifkan Anonymous auth.
- **Storage -> Rules** -> tempel isi [`storage.rules`](./storage.rules):
  folder `ktp/` & `sig/` boleh dibaca & ditulis siapa saja (mode publik) -- supaya
  foto KTP `<img>` di preview PDF langsung jalan (bebas login).

Klik **Publish** untuk masing-masing.

> **Peringatan keamanan**: MODE TERBUKA berarti siapa saja boleh menambah data &
> meng-upload foto KTP/ID. Untuk produksi nanti, ketatkan dengan `auth != null`
> di `database.rules.json` & `storage.rules` sebelum go-live. Anonymous auth tetap
> OPSIONAL (bisa diaktifkan kapan pun), tetapi data sudah bisa masuk tanpa itu.

---

## 4. (Opsional) Atur kuota / tag

Untuk menghindari upload berulang jika koneksi lemot, folder Storage dipakai:

```
ktp/{docNo}_{timestamp}.jpg   -> foto KTP / ID Card
sig/{docNo}_{timestamp}.png   -> tanda tangan digital
```

Aturan RTDB + Storage di atas sudah mencakup pola ini.

---

## 5. Cara pakai di portal

- Tombol **Kirim Form PDF ke Database (Firebase) & WhatsApp** akan menyimpan
  **ke Realtime Database + Storage** (lewati `window.ffc.saveToFirebase()`) dan
  **paralel ke Google Sheets** (lewati `saveToSheet(d)` -> `SHEET_ENDPOINT`),
  serta tetap menyimpan **di localStorage**.
- Tombol **Muat dari Firebase** mengambil seluruh node `pengajuan` dari Realtime
  Database, memetakan `ktpUrl` / `signatureUrl` -> field `ktp` / `signature` agar
  `<img>` preview PDF langsung jalan, lalu menambahkannya ke riwayat lokal (hanya
  dokumen yang belum ada).
- Tombol **Test Firebase** menjalankan diagnostik (SDK termuat?, Anonymous auth?,
  Realtime Database terbaca?) dan menampilkan langkah konsol yang masih kurang
  lengkap di dialog pop-up.

> **Sinkronisasi paralel**: hasil submit akan ditulis serentak ke **Firebase** dan
> **Google Sheets**. Jika `SHEET_ENDPOINT` kosong (`''`), `saveToSheet()` hanya
> menampilkan toast peringatan tanpa menggagalkan penyimpanan ke Firebase. Google
> Sheets tidak perlu di-deploy lagi jika sudah terdeploy `gsheet_backend.gs`.

---

## 6. Penyimpanan dokumen (schema node `pengajuan`)

```
cat          : "cek" | "barang" | "unit"
catName      : string
docNo        : string  (mis. "TRB-2026-0001-AB3F" -- unik per device, ada kode device 4 huruf)
date         : string  (dd/mm/yyyy hh:mm:ss)
nama         : string
nik          : string
perusahaan   : string
ktpName      : string
ktpUrl       : string  (downloadURL dari Storage)
signatureUrl : string  (downloadURL) | null
rows         : array   [{nopol,merk} | {nama,jml,sat,ket}]
rowsText     : string  (versi teks kolom Daftar, sama seperti Google Sheets)
status       : "Menunggu verifikasi"
uid          : string  (uid anon user)
createdAt    : number  (epoch ms, untuk pengurutan)
```

---

## 7. Jalankan di lokal

```
python server.py        -> http://localhost:8000
```

Firebase bisa diakses dari `localhost`. Pada browser akan muncul notifikasi
"Data tersimpan ke Realtime Database (Firebase) [OK]" saat submit berhasil.

---

## 8. Troubleshooting

| Gejala | Solusi |
|---|---|
| `Firebase belum siap -- data tetap tersimpan di localStorage` | `firebase-config.js` gagal load (cek konsol Network). Pastikan file ada di folder yang sama dengan `portal.html`. |
| `Gagal simpan ke Firebase: Missing or insufficient permissions` | Pastikan Anonymous auth aktif + rules Realtime Database / Storage sudah *published*. |
| `Realtime Database kosong atau tidak dapat diakses` | Cek rules read; cek koneksi internet; pastikan proyek = `heinuuu` & `databaseURL` benar. |
| Foto KTP tidak muncul di preview | `storage.rules` folder `ktp/`/`sig/` harus `allow read: if true;` (sudah ada di atas). |
