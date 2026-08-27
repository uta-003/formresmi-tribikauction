# Form Tribik Auction — Panduan Deploy Google Sheets

Portal **`portal.html`** sudah dikirimkan otomatis ke **Google Sheets** setiap kali
formulir disubmit (tombol **Simpan / Simpan &lanjut WA**).
Foto KTP/ID Card **dan** tanda tangan juga disalin ke sel spreadsheet via rumus `=IMAGE()`.

> Tiga form ada di satu halaman saja (ganti kategori):
> **Form Pengajuan Cek Unit · Pengambilan Barang · Pengambilan Unit** — semua sudah ada di `portal.html`.

---

## 1. Buat / siapkan spreadsheet Tribik Auction

Gunakan spreadsheet ini (dibuat khusus proyek ini):

https://docs.google.com/spreadsheets/d/1ym6u8evb9PhLvbo6YH3aVFDScGow7KjToj4C7TNO9IM/edit#gid=0

- Sheet (tab) bernama **`Pengajuan`** (dibuat otomatis oleh script bila belum ada).
- Baris 1 = header (ditulis otomatis pertama kali submit).

## 2. Tempel script backend ke Apps Script

1. Buka spreadsheet di atas → **Ekstensi → Apps Script**.
2. Hapus isi editor, lalu **tempel semua isi** dari
   `gsheet_backend.gs` (file ini berada di folder project ini).
3. Klik **Save**, beri nama proyek mis. `Form Tribik Auction — Backend`.

File backend: [gsheet_backend.gs](/gsheet_backend.gs)

## 3. Deploy sebagai Aplikasi Web (Web App)

Di editor Apps Script → **Deploy → "Sebagai aplikasi web" (New deployment → Web app)**:

| Pilihan | Nilai |
|---|---|
| Execute as | **Saya (Me)** |
| Who has access | **Siapa saja / Anyone** (atau akun Google Anda) |
| Versi | **Simpan & deploy versi baru (head)** |

Setelah deploy, salin **URL "Web app"** (bentuknya `https://script.google.com/macros/s/…/exec`).

## 4. Hubungkan ke portal

Buka `portal.html`, cari konstan di paling atas (sekitar baris 398):

```js
const SHEET_DOC_ID  = '1ym6u8evb9PhLvbo6YH3aVFDScGow7KjToj4C7TNO9IM'; // ID spreadsheet
const SHEET_ENDPOINT = '';   // ← TEMPER UR "Web app" di sini
```

Tempel URL Web app ke `SHEET_ENDPOINT`. Contoh:

```js
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfy.../exec';
```

## 5. Jalankan portal

Ambang batas sudah berubah menjadi nama resmi di seluruh portal ("Form Tribik Auction").

### Kolom di spreadsheet

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Kategori | No. Dokumen | Tanggal | Nama Lengkap | NIK / SIM / ID | Nama Perusahaan | **Foto KTP / ID Card** | Daftar Barang / Unit | **Tanda Tangan** | Status |

- Kolom **H (Foto KTP)** dan **J (Tanda Tangan)** menampilkan gambar otomatis via rumus `=IMAGE()`.
- Kolom **I (Daftar)** lebar & height‑nya **bagus** (380px, vertikal atas) agar teks panjang rapi.
- Kolom **K (Status)** default `Menunggu verifikasi` — ubah sendiri di Sheets.

## 6. Uji

1. Isi portal (Cek Unit / Ambil Barang / Ambil Unit), pilih kamera, ambil KTP, tanda tangani.
2. Klik **Simpan & lanjut WA**.
3. Pada toast: `Data tersimpan ke Google Sheets ✔`.
4. Buka spreadsheet → baris baru muncul lengkap termasuk foto KTP & ttd.

### Pemecahan masalah

| Gejala | Solusi |
|---|---|
| `Google Sheets belum terhubung` | Deploy lagi → isi `SHEET_ENDPOINT`. |
| `Gagal simpan ke Google Sheets` | Pastikan deploy = *Anyone*/**Saya**; cek **Apps Script → Executions** untuk error detail. |
| Foto tidak muncul | Pastikan KTP di‑crop (tombol 📷 → **AmbilFoto**). Apps Script otomatis buat file Drive & share «Anyone with link». |

---

## Troubleshooting

### Error: "Fungsi skrip tidak ditemukan: doPost"
Respons HTML ini berarti **deployment Web app menunjuk ke versi script yang tidak
memiliki fungsi `doPost`** (kode di editor Apps Script kosong/terganti). Perbaiki:

1. Buka spreadsheet -> **Ekstensi > Apps Script**.
2. Pastikan editor berisi **seluruh isi `gsheet_backend.gs`** (copy ulang bila kosong), lalu **Save**.
3. **Deploy > Manage deployments > (pensi) Edit > Version: "New version" > Deploy.**
4. Uji sehat: buka `<URL>/exec` di browser -> harus muncul `{"ok":true,"ready":true,...}` (dari `doGet`).
5. Bila URL deployment berubah, perbarui konstanta `SHEET_ENDPOINT` di **dua tempat**:
   `portal.html` dan `firebase-config.js` (harus sama).

Cek cepat dari terminal (harus JSON, bukan HTML):

```
curl -L -X POST "<URL>/exec" -H "Content-Type: text/plain" -d "{\"docNo\":\"TRB-TEST\"}"
```

### Error: "Attempted to execute myFunction, but it was deleted"
Muncul saat menekan tombol **Run (▶)** di editor Apps Script — dan itu **aman**:
fungsi template bawaan (`myFunction`) memang sudah terganti oleh kode backend.
`doPost` tidak dijalankan lewat tombol Run, melainkan otomatis oleh portal lewat HTTP.
Yang diperlukan hanya: **Deploy > Manage deployments > Edit > Version: New version >
Access: Anyone > Deploy**. Setelah itu uji via `http://localhost:8000/fix-sheet.html`.
