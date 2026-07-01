/**
 * Google Apps Script Backend for PPDB SMA
 * Deploy as a Web App:
 * 1. Click "Deploy" -> "New deployment"
 * 2. Select type: "Web app"
 * 3. Execute as: "Me"
 * 4. Who has access: "Anyone"
 * 5. Click "Deploy" and copy the Web App URL.
 */

const SHEET_NAME = "Data Pendaftar";
const ADMIN_SHEET_NAME = "Admin";
const SETTINGS_SHEET_NAME = "Pengaturan";
const FOLDER_NAME = "PPDB SD";

const DEFAULT_FORM_FIELDS = [
  { id: "Nama Lengkap", label: "Nama Lengkap", type: "text", required: true },
  { id: "NIK", label: "NIK", type: "text", required: true },
  { id: "Tempat Lahir", label: "Tempat Lahir", type: "text", required: true },
  { id: "Tanggal Lahir", label: "Tanggal Lahir", type: "date", required: true },
  { id: "Jenis Kelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"], required: true },
  { id: "Alamat", label: "Alamat Lengkap", type: "textarea", required: true },
  { id: "Nama Orang Tua", label: "Nama Orang Tua/Wali", type: "text", required: true },
  { id: "No HP", label: "No. WhatsApp Aktif", type: "text", required: true },
  { id: "Foto Siswa", label: "Pas Foto 3x4", type: "file", required: true },
  { id: "Kartu Keluarga", label: "Kartu Keluarga", type: "file", required: true },
  { id: "Akta Kelahiran", label: "Akta Kelahiran", type: "file", required: true }
];

const DEFAULT_SETTINGS = {
  namaSekolah: "SMAN Unggul Pidie Jaya",
  alamat: "Jl. Blang Awe-Rungkom. Kec. Meureudu, Kab. Pidie Jaya, Aceh 24186",
  telepon: "(0821) 6832-1603",
  email: "info@smanunggulpijay.sch.id",
  deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas.",
  statusPendaftaran: "Buka",
  formFields: JSON.stringify(DEFAULT_FORM_FIELDS)
};

function setup() {
  ensureSheetsExist();
}

function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Data Pendaftar Sheet
  let sheet = ss.getSheetByName(SHEET_NAME);
  const defaultHeaders = [
    "Timestamp", "No Pendaftaran", "Status", "Alasan Penolakan", "Jarak ke Sekolah (km)", "Koordinat Lokasi"
  ];
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [...defaultHeaders];
    DEFAULT_FORM_FIELDS.forEach(f => {
      if (headers.indexOf(f.label) === -1) {
        headers.push(f.label);
      }
    });
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
    sheet.setFrozenRows(1);
  } else {
    // Audit and auto-add missing columns to avoid any errors!
    let cols = Math.max(sheet.getLastColumn(), 1);
    let headers = sheet.getRange(1, 1, 1, cols).getValues()[0];
    let updatedHeaders = [...headers];
    let changes = false;
    
    // Core columns that MUST exist
    defaultHeaders.forEach(h => {
      if (updatedHeaders.indexOf(h) === -1) {
        updatedHeaders.push(h);
        changes = true;
      }
    });
    
    // Default form field labels
    DEFAULT_FORM_FIELDS.forEach(f => {
      if (updatedHeaders.indexOf(f.label) === -1) {
        updatedHeaders.push(f.label);
        changes = true;
      }
    });
    
    if (changes) {
      sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
      sheet.getRange(1, 1, 1, updatedHeaders.length).setFontWeight("bold").setBackground("#e0e0e0");
    }
  }

  // 2. Setup Admin Sheet
  let adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(ADMIN_SHEET_NAME);
    adminSheet.appendRow(["Username", "Password"]);
    adminSheet.appendRow(["admin", "ajayhungkul"]); // Default credentials
    adminSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // 3. Setup Settings Sheet
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    settingsSheet.appendRow(["Key", "Value"]);
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      settingsSheet.appendRow([key, DEFAULT_SETTINGS[key]]);
    });
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // 4. Setup Drive Folder
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(FOLDER_NAME);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    ensureSheetsExist();
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === "login") return handleLogin(data.username, data.password);
    if (data.action === "checkStatus") return handleCheckStatus(data.noPendaftaran);
    
    // Acquire a script lock for all database-modifying actions (30s timeout)
    try {
      lock.waitLock(30000);
      hasLock = true;
    } catch (lockError) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Server sedang sibuk karena trafik pendaftaran sangat tinggi. Silakan coba klik tombol kirim lagi."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "updateStatus") return updateStatus(data.noPendaftaran, data.newStatus, data.alasan);
    if (data.action === "deleteRegistration") return deleteRegistration(data.noPendaftaran);
    if (data.action === "updateSettings") return handleUpdateSettings(data.settings);
    
    return handleRegistration(data);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

function doGet(e) {
  try {
    ensureSheetsExist();
    if (e.parameter.action === "getSettings") {
      return handleGetSettings();
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Sheet not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        if (row[index] instanceof Date) {
           obj[header] = row[index].toISOString();
        } else {
           obj[header] = row[index];
        }
      });
      return obj;
    });
    
    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: DEFAULT_SETTINGS
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: settings
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error("Settings sheet not found");

  const data = sheet.getDataRange().getValues();
  
  Object.keys(newSettings).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(
          typeof newSettings[key] === 'object' ? JSON.stringify(newSettings[key]) : newSettings[key]
        );
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, typeof newSettings[key] === 'object' ? JSON.stringify(newSettings[key]) : newSettings[key]]);
    }
  });

  // If formFields is updated, sync headers in "Data Pendaftar" sheet!
  if (newSettings.formFields) {
    let fields = [];
    try {
      fields = typeof newSettings.formFields === 'string' ? JSON.parse(newSettings.formFields) : newSettings.formFields;
    } catch(e) {}
    
    if (Array.isArray(fields)) {
      const mainSheet = ss.getSheetByName(SHEET_NAME);
      if (mainSheet) {
        syncSheetColumns(mainSheet, fields);
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Pengaturan berhasil disimpan"
  })).setMimeType(ContentService.MimeType.JSON);
}

function syncSheetColumns(sheet, newFields) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return; // Empty sheet
  
  // 1. Read existing headers
  const oldHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const oldHeadersMap = {};
  oldHeaders.forEach(function(header) {
    if (header) {
      oldHeadersMap[header] = true;
    }
  });
  
  // 2. Define standard base headers
  const baseHeaders = ["Timestamp", "No Pendaftaran", "Status", "Alasan Penolakan", "Jarak ke Sekolah (km)", "Koordinat Lokasi"];
  const headersToAdd = [];
  
  baseHeaders.forEach(function(hdr) {
    if (!oldHeadersMap[hdr]) {
      headersToAdd.push(hdr);
      oldHeadersMap[hdr] = true;
    }
  });
  
  // 3. Find any active form fields that aren't in the headers yet
  newFields.forEach(function(field) {
    if (field && field.label && !oldHeadersMap[field.label]) {
      headersToAdd.push(field.label);
      oldHeadersMap[field.label] = true;
    }
  });
  
  // 4. Append the missing headers safely to the end of Row 1
  if (headersToAdd.length > 0) {
    const startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, headersToAdd.length).setValues([headersToAdd]);
    // Style the new headers
    sheet.getRange(1, startCol, 1, headersToAdd.length).setFontWeight("bold").setBackground("#e0e0e0");
  }
}

function handleRegistration(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Check if registration is open
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  let isOpen = true;
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === "statusPendaftaran" && settingsData[i][1] === "Tutup") {
        isOpen = false;
        break;
      }
    }
  }

  if (!isOpen) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Pendaftaran sedang ditutup."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Generate No Pendaftaran
  let activeYear = new Date().getFullYear().toString();
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === "tahunPendaftaran" && settingsData[i][1]) {
        activeYear = String(settingsData[i][1]).trim();
        break;
      }
    }
  }

  const lastRow = sheet.getLastRow();
  // Generate secure unique 4-character random alphanumeric code
  function generateRandomCode(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get existing No Pendaftaran
  const noRegIdx = headers.indexOf("No Pendaftaran");
  var existingNo = [];
  if (lastRow > 1 && noRegIdx !== -1) {
    var rawNos = sheet.getRange(2, noRegIdx + 1, lastRow - 1, 1).getValues();
    for (var rIdx = 0; rIdx < rawNos.length; rIdx++) {
      existingNo.push(String(rawNos[rIdx][0]));
    }
  }

  var noPendaftaran = "";
  var isUnique = false;
  var yearFormatted = activeYear;
  if (activeYear.indexOf('/') === -1) {
    var nextActiveYearVal = Number(activeYear);
    var nextActiveYearStr = isNaN(nextActiveYearVal) ? (new Date().getFullYear() + 1).toString() : (nextActiveYearVal + 1).toString();
    yearFormatted = activeYear + "/" + nextActiveYearStr;
  }
  while (!isUnique) {
    var code = generateRandomCode(4);
    noPendaftaran = "SPMB-" + yearFormatted + "-" + code;
    isUnique = existingNo.indexOf(noPendaftaran) === -1;
  }
  
  const folder = getOrCreateFolder(FOLDER_NAME);
  const rowData = new Array(headers.length).fill("");
  
  // Fill known headers
  headers.forEach((header, index) => {
    if (header === "Timestamp") rowData[index] = new Date();
    else if (header === "No Pendaftaran") rowData[index] = noPendaftaran;
    else if (header === "Status") rowData[index] = "Proses";
    else if (data[header] !== undefined) {
      let value = data[header];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${header}`, folder);
      }
      rowData[index] = value;
    }
  });

  // Check for new fields in data that aren't in headers
  Object.keys(data).forEach(key => {
    if (key !== "action" && !headers.includes(key)) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
      
      let value = data[key];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${key}`, folder);
      }
      rowData.push(value);
    }
  });
  
  sheet.appendRow(rowData);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Pendaftaran berhasil",
    noPendaftaran: noPendaftaran
  })).setMimeType(ContentService.MimeType.JSON);
}

// ... (keep handleLogin, handleCheckStatus, updateStatus, getOrCreateFolder, uploadFile, doOptions as they were)

function handleLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!sheet) throw new Error("Sheet Admin tidak ditemukan");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Login berhasil" })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Username atau password salah" })).setMimeType(ContentService.MimeType.JSON);
}

function handleCheckStatus(noPendaftaran) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Database belum siap");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const namaIdx = headers.indexOf("Nama Lengkap");
  const statusIdx = headers.indexOf("Status");
  const alasanIdx = headers.indexOf("Alasan Penolakan");

  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      var studentObj = {};
      headers.forEach(function(header, idx) {
        if (header) {
          studentObj[header] = data[i][idx];
        }
      });
      studentObj["noPendaftaran"] = data[i][noRegIdx];
      studentObj["namaLengkap"] = namaIdx !== -1 ? data[i][namaIdx] : "Siswa";
      studentObj["status"] = statusIdx !== -1 ? data[i][statusIdx] : "Proses";
      studentObj["alasanPenolakan"] = (alasanIdx !== -1 && data[i][alasanIdx]) ? String(data[i][alasanIdx]) : "";

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: studentObj
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Nomor pendaftaran tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
}

function updateStatus(noPendaftaran, newStatus, alasan) {
  ensureSheetsExist();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const statusIdx = headers.indexOf("Status");
  let alasanIdx = headers.indexOf("Alasan Penolakan");
  
  if (alasanIdx === -1 && headers.length > 0) {
    sheet.getRange(1, headers.length + 1).setValue("Alasan Penolakan");
    alasanIdx = headers.length;
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      if (statusIdx !== -1) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
      }
      if (alasanIdx !== -1) {
        sheet.getRange(i + 1, alasanIdx + 1).setValue(alasan || "");
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Status berhasil diupdate" })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
}

function deleteRegistration(noPendaftaran) {
  ensureSheetsExist();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data berhasil dihapus" })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function uploadFile(base64Data, filename, folder) {
  if (!base64Data) return "";
  try {
    const splitBase = base64Data.split(',');
    const type = splitBase[0].split(';')[0].replace('data:', '');
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const blob = Utilities.newBlob(byteCharacters, type, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error uploading file";
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT).setHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  });
}
