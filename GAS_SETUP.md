# Panduan Pemasangan Google Apps Script (GAS) untuk PPDB Online

Sistem PPDB Online ini menggunakan Google Apps Script dan Google Sheets sebagai backend (database). Berikut adalah langkah-langkah untuk memasangnya:

## Langkah 1: Buat Google Sheet Baru
1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru.
2. Beri nama spreadsheet tersebut, misalnya "Data PPDB 2024".
3. Buat 2 sheet (tab) di bagian bawah:
   - Sheet 1: Ubah namanya menjadi `Pendaftar`
   - Sheet 2: Ubah namanya menjadi `Pengaturan`
4. Di sheet `Pendaftar`, buat header di baris pertama (A1, B1, C1, dst) sesuai dengan field form Anda, ditambah beberapa field sistem:
   - `Timestamp`
   - `No Pendaftaran`
   - `Status`
   - `Alasan Penolakan`
   - (Tambahkan header lain sesuai form, misal: `Nama Lengkap`, `NIK`, `Jenis Kelamin`, dll)
5. Di sheet `Pengaturan`, buat header di baris pertama:
   - A1: `Key`
   - B1: `Value`
6. Isi data awal di sheet `Pengaturan`:
   - A2: `namaSekolah` | B2: `SDN Harapan Bangsa`
   - A3: `statusPendaftaran` | B3: `Buka`
   - A4: `tahunPendaftaran` | B4: `2024`
   - (Tambahkan pengaturan lain sesuai kebutuhan)

## Langkah 2: Buat Google Apps Script
1. Di Google Sheet yang baru Anda buat, klik menu **Ekstensi** > **Apps Script**.
2. Hapus semua kode yang ada di editor.
3. Salin dan tempel kode berikut ke dalam editor:

```javascript
const SHEET_PENDAFTAR = 'Pendaftar';
const SHEET_PENGATURAN = 'Pengaturan';

// Fungsi pembantu untuk mengunggah dan mendekode berkas Base64 langsung ke Google Drive
function saveFileToDrive(base64Data, fileName) {
  try {
    const splitData = base64Data.split(',');
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const rawData = splitData[1];
    const decoded = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(decoded, contentType, fileName);
    
    let folder;
    const folders = DriveApp.getFoldersByName("PPDB_Uploads");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("PPDB_Uploads");
    }
    
    const file = folder.createFile(blob);
    // Berikan akses baca bagi yang memiliki tautan/link sehingga admin bisa mengklik & melihat di dashboard
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (error) {
    console.error("Gagal menyimpan berkas ke Drive: " + error.toString());
    return null;
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Handle Update Settings
    if (data.action === 'updateSettings') {
      const sheet = ss.getSheetByName(SHEET_PENGATURAN);
      const settings = data.settings;
      
      // Clear existing settings
      sheet.clear();
      sheet.appendRow(['Key', 'Value']);
      
      // Save new settings
      for (const key in settings) {
        let value = settings[key];
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        sheet.appendRow([key, value]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Update Status
    if (data.action === 'updateStatus') {
      const sheet = ss.getSheetByName(SHEET_PENDAFTAR);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const noPendaftaranIdx = headers.indexOf('No Pendaftaran');
      const statusIdx = headers.indexOf('Status');
      const alasanIdx = headers.indexOf('Alasan Penolakan');
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][noPendaftaranIdx] === data.noPendaftaran) {
          sheet.getRange(i + 1, statusIdx + 1).setValue(data.newStatus);
          if (data.alasan !== undefined && alasanIdx !== -1) {
            sheet.getRange(i + 1, alasanIdx + 1).setValue(data.alasan);
          }
          return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Data tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Check Status
    if (data.action === 'checkStatus') {
      const sheet = ss.getSheetByName(SHEET_PENDAFTAR);
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0];
      const noPendaftaranIdx = headers.indexOf('No Pendaftaran');
      let namaIdx = headers.indexOf('Nama Lengkap');
      if (namaIdx === -1) {
        namaIdx = headers.findIndex(h => h.toString().toLowerCase().includes('nama'));
      }
      const statusIdx = headers.indexOf('Status');
      const alasanIdx = headers.indexOf('Alasan Penolakan');
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][noPendaftaranIdx] === data.noPendaftaran) {
          return ContentService.createTextOutput(JSON.stringify({
            status: 'success',
            data: {
              noPendaftaran: rows[i][noPendaftaranIdx],
              namaLengkap: namaIdx !== -1 ? rows[i][namaIdx] : 'Siswa',
              status: rows[i][statusIdx],
              alasanPenolakan: alasanIdx !== -1 ? rows[i][alasanIdx] : ''
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Data tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle New Registration
    const sheet = ss.getSheetByName(SHEET_PENDAFTAR);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Generate No Pendaftaran
    const settingsSheet = ss.getSheetByName(SHEET_PENGATURAN);
    const settingsData = settingsSheet.getDataRange().getValues();
    let tahunPendaftaran = new Date().getFullYear().toString();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === 'tahunPendaftaran') {
        tahunPendaftaran = settingsData[i][1];
        break;
      }
    }
    
    const lastRow = sheet.getLastRow();
    const noPendaftaran = `PPDB-${tahunPendaftaran}-${String(lastRow).padStart(3, '0')}`;
    
    const rowData = headers.map(header => {
      if (header === 'Timestamp') return new Date().toISOString();
      if (header === 'No Pendaftaran') return noPendaftaran;
      if (header === 'Status') return 'Proses';
      
      let val = data[header] || '';
      // Memeriksa jika datanya berupa berkas Base64, unggah ke Google Drive secara aman
      if (typeof val === 'string' && val.indexOf(';base64,') !== -1) {
        const fileUrl = saveFileToDrive(val, `${noPendaftaran}_${header.replace(/\s+/g, '_')}`);
        if (fileUrl) {
          val = fileUrl;
        }
      }
      return val;
    });
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      noPendaftaran: noPendaftaran 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Handle Get Settings
  if (e.parameter.action === 'getSettings') {
    const sheet = ss.getSheetByName(SHEET_PENGATURAN);
    const rows = sheet.getDataRange().getValues();
    const settings = {};
    
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0];
      let value = rows[i][1];
      try {
        // Try to parse JSON for formFields
        value = JSON.parse(value);
      } catch (e) {
        // Keep as string if not JSON
      }
      settings[key] = value;
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: settings
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Handle Get Registrations (Admin)
  const sheet = ss.getSheetByName(SHEET_PENDAFTAR);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = rows[i][j];
    }
    data.push(rowObj);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## Langkah 3: Deploy (Terapkan) sebagai Web App
1. Di editor Apps Script, klik tombol **Terapkan** (Deploy) di sudut kanan atas.
2. Pilih **Deployment baru** (New deployment).
3. Klik ikon roda gigi (Select type) dan pilih **Aplikasi web** (Web app).
4. Isi deskripsi (misal: "Versi 1").
5. Pada bagian **Jalankan sebagai** (Execute as), pilih **Saya** (Me).
6. Pada bagian **Siapa yang memiliki akses** (Who has access), pilih **Siapa saja** (Anyone).
7. Klik **Terapkan** (Deploy).
8. Anda mungkin akan diminta untuk memberikan otorisasi (Review permissions). Ikuti langkah-langkahnya (Pilih akun Google Anda > Lanjutan > Buka proyek).
9. Salin **URL Aplikasi Web** (Web app URL) yang diberikan.

## Langkah 4: Hubungkan URL ke Aplikasi React
1. Buka file `src/services/api.ts` di proyek React Anda.
2. Cari baris kode berikut (di bagian atas file):
   ```typescript
   const GAS_WEB_APP_URL = ""; 
   ```
3. Tempel URL yang Anda salin ke dalam tanda kutip:
   ```typescript
   const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycb.../exec"; 
   ```
4. Simpan file, dan aplikasi Anda sekarang sudah terhubung dengan Google Sheets!
