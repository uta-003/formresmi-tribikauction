/**
 * gsheet_backend.gs  —  Backend Google Apps Script untuk "Form Tribik Auction"
 * Menerima POST JSON dari portal.html, menuliskan ke spreadsheet Tribik Auction:
 *   https://docs.google.com/spreadsheets/d/1ym6u8evb9PhLvbo6YH3aVFDScGow7KjToj4C7TNO9IM/edit#gid=0
 *
 * Cara deploy (agar tombol "Kirim ke Database / Google Sheets" berfungsi):
 *  1) Buka spreadsheet di atas -> Ekstensi -> Apps Script -> tempel script ini -> Save.
 *  2) Deploy -> "Sebagai aplikasi web":
 *        - Eksekusi sebagai : Saya
 *        - Akses            : Siapa saja  (atau akun Google Anda)
 *  3) Salin URL "Web app" -> tempel ke konstan SHEET_ENDPOINT di portal.html.
 *     (Aplikasi web Google sudah mendukung CORS; klien di port 8000 boleh POST.)
 */
const SHEET_ID = '1ym6u8evb9PhLvbo6YH3aVFDScGow7KjToj4C7TNO9IM';
const SHEET_TAB = 'Pengajuan';

const HEADERS = [
  'Timestamp', 'Kategori', 'No. Dokumen', 'Tanggal', 'Nama Lengkap',
  'NIK / SIM / ID', 'Nama Perusahaan', 'Foto KTP / ID Card',
  'Daftar Barang / Unit', 'Tanda Tangan', 'Status'
];

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(SHEET_TAB);
    if (!sh) sh = ss.insertSheet(SHEET_TAB);

    // header otomatis + lebar kolom rapi
    const hdr = sh.getRange(1, 1, 1, HEADERS.length);
    if (hdr.getDisplayValues()[0].join('').trim() === '') {
      hdr.setValues([HEADERS]);
      hdr.setFontWeight('bold');
      sh.getRange(1, 1, 1, HEADERS.length).setHorizontalAlignment('center');
    }
    const colW = [95, 115, 120, 110, 160, 150, 170, 160, 380, 130, 120];
    for (let i = 0; i < colW.length; i++) sh.setColumnWidth(i + 1, colW[i]);
    sh.getRange(2, 1, 1, HEADERS.length).setVerticalAlignment('top');

    const raw = (e.postData && e.postData.contents) ? e.postData.contents : '';
    const d = raw ? JSON.parse(raw) : {};

    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const tgl = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss');

    // foto KTP / tanda tangan -> file Drive -> rumus =IMAGE() di sel
    function imageFormula(dataUrl, name, w, h) {
      if (!dataUrl || dataUrl.indexOf('base64,') === -1) return '-';
      const b64 = dataUrl.split('base64,')[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', name);
      const f = DriveApp.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const url = 'https://drive.google.com/uc?export=view&id=' + f.getId();
      return h ? ('=IMAGE("' + url + '",4,' + w + ',' + h + ')') : '=IMAGE("' + url + '")';
    }

    const ktpImg = imageFormula(d.ktp, (d.ktpName || 'ktp.png'), 130, 90);
    const sigImg = imageFormula(d.signature, 'signature.png');

    const row = [
      tgl, d.catName || d.cat, d.docNo, d.date,
      d.nama, d.nik, d.perusahaan,
      ktpImg, d.rows, sigImg,
      'Menunggu verifikasi'
    ];

    const n = sh.getLastRow() + 1;
    sh.getRange(n, 1, 1, row.length).setValues([row]);
    sh.getRange(n, 8).setVerticalAlignment('middle');   // kolom Foto KTP
    sh.getRange(n, 9).setVerticalAlignment('top');       // kolom Daftar (teks panjang)

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, row: n, ktpFormula: ktpImg, sigFormula: sigImg }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ready: true, sheetId: SHEET_ID }))
    .setMimeType(ContentService.MimeType.JSON);
}
