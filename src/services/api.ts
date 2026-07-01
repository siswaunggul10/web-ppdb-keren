// Service to interact with Google Apps Script Backend

// To use the real backend, replace this URL with your deployed Google Apps Script Web App URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz7X_zY7t3BFd-jIJnq1O9jnfIG7S4X8vEYCwfBUQ4A1p3zKyqCH-Bbx5ZtkY6glJgm/exec"; 

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'textarea';
  options?: string[];
  required: boolean;
  session?: 1 | 2 | 3 | 4;
  _tempKey?: string;
  _rawOptions?: string;
}

export interface PanduanDokumen {
  id: string;
  icon: 'FileDigit' | 'FileBadge' | 'FileImage' | 'FileText' | 'Home' | 'Award' | 'School' | 'UserCheck';
  title: string;
  description: string;
}

export interface AppSettings {
  namaSekolah: string;
  alamat: string;
  telepon: string;
  email: string;
  deskripsi: string;
  statusPendaftaran: 'Buka' | 'Tutup' | 'Otomatis';
  formFields: FormField[];
  persyaratanDaftarUlang?: string;
  tanggalDaftarUlang?: string;
  tanggalPengumuman?: string;
  logoSekolah?: string;
  faviconSekolah?: string;
  kopSurat?: string;
  namaKepalaSekolah?: string;
  tandaTanganKepalaSekolah?: string;
  stempelSekolah?: string;
  tahunPendaftaran?: string;
  nomorSurat?: string;
  tempatSurat?: string;
  tanggalSurat?: string;
  nipKepalaSekolah?: string;
  catatanTambahan?: string;
  gambarHeaderBeranda?: string;
  koordinatSekolah?: string;
  tanggalCutoffUsia?: string;
  sambutanKepalaSekolah?: string;
  fotoKepalaSekolah?: string;
  visiSekolah?: string;
  misiSekolah?: string;
  panduanJudul?: string;
  panduanDeskripsi?: string;
  panduanPeringatan?: string;
  panduanDokumen?: PanduanDokumen[];
  panduanAlur?: string[];
  isMaintenance?: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  googleDriveDaftarUlang?: string;
  isRapatAktif?: boolean;
  rapatJudul?: string;
  rapatTanggal?: string;
  rapatWaktu?: string;
  rapatTempat?: string;
  rapatDeskripsi?: string;
  tanggalPembukaanPendaftaran?: string;
}

export interface RegistrationData {
  [key: string]: any;
}

export interface AdminData extends RegistrationData {
  Timestamp: string;
  'No Pendaftaran': string;
  Status: 'Proses' | 'Lulus' | 'Tidak Lulus';
  'Alasan Penolakan'?: string;
}

// Mock data for preview if GAS URL is not set
export const getInitialMockSettings = (): AppSettings => {
  const defaultSettings: AppSettings = {
    namaSekolah: "SDN Citapen",
    isMaintenance: false,
    maintenanceTitle: "SITE UNDER MAINTENANCE",
    maintenanceMessage: "Kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan ini. Saat ini server sistem pendaftaran online sedang mengalami pemeliharaan terjadwal dan peningkatan performa, tetapi kami akan segera kembali. Terima kasih atas kesabaran Anda.",
    alamat: "Jl. Otto Iskandardinata No.12, Citapen, Kec. Tawang, Kota Tasikmalaya, Jawa Barat 46115",
    telepon: "(0265) 331422",
    email: "info@sdncitapen.sch.id",
    deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas di SDN Citapen Tasikmalaya.",
    statusPendaftaran: "Otomatis",
    persyaratanDaftarUlang: "1. Membawa Bukti Diterima / Penerimaan SPMB (dicetak)\n2. Membawa Dokumen Daftar Ulang Resmi yang diunduh dari website (telah diisi dan ditandatangani)\n3. Fotokopi Kartu Keluarga (2 lembar)\n4. Fotokopi Akta Kelahiran (2 lembar)\n5. Pas Foto Calon Siswa berwarna ukuran 3x4 (4 lembar)\n6. Fotokopi KTP Orang Tua/Wali (masing-masing 2 lembar)\n7. Materai Rp 10.000 (1 lembar) untuk Surat Pernyataan",
    tanggalDaftarUlang: "2026-07-06",
    tanggalPengumuman: "2026-07-02",
    logoSekolah: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Logo_Tut_Wuri_Handayani_Kemendikbud_RI.png",
    faviconSekolah: "",
    tahunPendaftaran: "2026",
    koordinatSekolah: "-7.3259441, 108.2205556", // Real coordinates of SDN Citapen Tasikmalaya
    tanggalCutoffUsia: "", // Tanggal ditetapkan cutoff usia
    sambutanKepalaSekolah: "Selamat datang di website resmi SPMB SDN Citapen." + 
      " Kami berkomitmen untuk memberikan pelayanan pendidikan terbaik bagi putra-putri Anda." + 
      " Mari bergabung bersama kami untuk mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan berprestasi.",
    fotoKepalaSekolah: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop",
    visiSekolah: "Menjadi sekolah dasar unggulan yang menghasilkan lulusan berakhlak mulia, cerdas, terampil, dan berwawasan lingkungan menuju masa depan gemilang.",
    misiSekolah: "1. Menyelenggarakan pembelajaran yang aktif, inovatif, kreatif, efektif, dan menyenangkan (PAIKEM).\n2. Menanamkan nilai-nilai keagamaan dan budi pekerti luhur dalam kehidupan sehari-hari.\n3. Mengembangkan potensi, bakat, dan minat siswa melalui berbagai kegiatan ekstrakurikuler.\n4. Menciptakan lingkungan belajar yang bersih, sehat, rindang, aman, dan kondusif.",
    formFields: [
      { id: "Nama Lengkap", label: "Nama Lengkap", type: "text", required: true, session: 1 },
      { id: "NIK", label: "NIK", type: "text", required: true, session: 1 },
      { id: "No. KK", label: "No. KK", type: "text", required: true, session: 1 },
      { id: "No. Akta Kelahiran", label: "No. Akta Kelahiran", type: "text", required: true, session: 1 },
      { id: "Tempat Lahir", label: "Tempat Lahir", type: "text", required: true, session: 1 },
      { id: "Tanggal Lahir", label: "Tanggal Lahir", type: "date", required: true, session: 1 },
      { id: "Jenis Kelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"], required: true, session: 1 },
      { id: "Alamat", label: "Alamat Lengkap", type: "textarea", required: true, session: 1 },
      { id: "Nama Orang Tua", label: "Nama Orang Tua", type: "text", required: true, session: 2 },
      { id: "No HP", label: "No. WhatsApp Aktif", type: "text", required: true, session: 2 },
      { id: "Nama Wali", label: "Nama Wali Siswa (Opsional)", type: "text", required: false, session: 3 },
      { id: "Foto Siswa", label: "Pas Foto 3x4", type: "file", required: true, session: 4 },
      { id: "Kartu Keluarga", label: "Kartu Keluarga", type: "file", required: true, session: 4 },
      { id: "Akta Kelahiran", label: "Akta Kelahiran", type: "file", required: true, session: 4 }
    ],
    panduanJudul: "Panduan Pendaftaran SPMB",
    panduanDeskripsi: "Persiapkan berkas dokumen pribadi sebelum mulai mengisi formulir pendaftaran SPMB online.",
    panduanPeringatan: "Pastikan semua dokumen di-scan atau difoto dengan jelas dan dapat terbaca. Format file yang disarankan adalah JPG, PNG, atau PDF dengan ukuran maksimal 2MB per file.",
    panduanDokumen: [
      { id: "1", icon: "FileDigit", title: "KK (Kartu Keluarga)", description: "Scan KK Asli. Pastikan NIK dan nama calon siswa tercantum dengan benar." },
      { id: "2", icon: "FileBadge", title: "Akta Kelahiran", description: "Scan Akta Kelahiran Asli. Pastikan data nama dan tanggal lahir terbaca dengan jelas." },
      { id: "3", icon: "Home", title: "Surat Keterangan Domisili (Opsional)", description: "Scan Surat Keterangan Domisili Asli bagi siswa yang mendaftar jalur zonasi jika alamat KK berbeda." },
      { id: "4", icon: "School", title: "Ijazah TK/RA (Opsional)", description: "Scan Ijazah atau Surat Keterangan Lulus (SKL) asli dari TK/RA asal." },
      { id: "5", icon: "FileDigit", title: "NISN (Nomor Induk Siswa Nasional)", description: "Bukti cetak lembar NISN resmi pendaftar dari situs Kemendikbud." },
      { id: "6", icon: "Award", title: "Piagam Prestasi (Opsional)", description: "Scan Piagam Penghargaan atau Sertifikat kejuaraan asli jika mendaftar jalur prestasi." },
      { id: "7", icon: "UserCheck", title: "Surat Mutasi Orang Tua (Opsional)", description: "Scan surat keputusan penugasan mutasi perpindahan tugas orang tua asli dari instansi." }
    ],
    panduanAlur: [
      "Siapkan seluruh dokumen persyaratan dalam bentuk file digital (foto/scan).",
      "Klik tombol 'Mulai Pendaftaran' di bawah atau menu 'Pendaftaran' di navigasi.",
      "Isi seluruh kolom formulir dengan data yang valid dan sesuai dengan dokumen asli.",
      "Tandai lokasi rumah pendaftar di peta yang disediakan untuk perhitungan jarak otomatis.",
      "Unggah berkas dokumen persyaratan pada kolom yang disediakan.",
      "Kirim formulir pendaftaran dan cetak atau simpan Nomor Pendaftaran SPMB Anda."
    ],
    googleDriveDaftarUlang: "https://drive.google.com",
    isRapatAktif: true,
    rapatJudul: "Pengumuman Rapat Orang Tua / Wali Calon Siswa Baru",
    rapatTanggal: "Sabtu, 11 Juli 2026",
    rapatWaktu: "08:00 WIB s.d Selesai",
    rapatTempat: "Aula Serbaguna SDN Citapen Tasikmalaya",
    rapatDeskripsi: "Diharapkan kehadiran Bapak/Ibu Orang Tua/Wali Calon Siswa yang telah dinyatakan Diterima/Lulus untuk menghadiri Rapat Koordinasi Awal Tahun Pelajaran menjelang pelaksanaan Kegiatan Belajar Mengajar (KBM). Kehadiran bersifat penting.",
    tanggalPembukaanPendaftaran: "2026-06-29T08:00"
  };

  const stored = localStorage.getItem('mockSettings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed }; // Merge default settings with parsed local settings
    } catch (e) {
      console.error("Failed to parse mock settings from localStorage", e);
    }
  }
  return defaultSettings;
};

let mockSettings: AppSettings = getInitialMockSettings();

const saveMockSettings = (settings: AppSettings) => {
  mockSettings = settings;
  try {
    localStorage.setItem('mockSettings', JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save mock settings to localStorage", e);
  }
};

const getInitialMockData = (): AdminData[] => {
  const stored = localStorage.getItem('mockData');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse mock data from localStorage", e);
    }
  }
  const getInitialJakartaTimeISO = () => {
    const d = new Date();
    const tzOffset = 7 * 60; // WIB is UTC+7
    const localTime = new Date(d.getTime() + tzOffset * 60 * 1000);
    return localTime.toISOString().replace('Z', '+07:00');
  };
  const defaultMockData: AdminData[] = [
    {
      Timestamp: getInitialJakartaTimeISO(),
      'No Pendaftaran': "SPMB-2026/2027-H8K3",
      'Nama Lengkap': "Budi Santoso",
      'NIK': "1234567890123456",
      'Tempat Lahir': "Tasikmalaya",
      'Tanggal Lahir': "2019-05-10",
      'Jenis Kelamin': "Laki-laki",
      'Alamat': "Jl. Citapen No. 45, Tasikmalaya",
      'Nama Orang Tua': "Agus Santoso",
      'No HP': "081234567890",
      'Jarak ke Sekolah (km)': "0.55",
      Status: "Proses"
    }
  ];
  return defaultMockData;
};

let mockData: AdminData[] = getInitialMockData();

const saveMockData = (data: AdminData[]) => {
  mockData = data;
  try {
    localStorage.setItem('mockData', JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save mock data to localStorage", e);
  }
};

export interface ScheduledStatus {
  status: 'Buka' | 'Tutup';
  info: string;
}

export function getScheduledStatus(settings: AppSettings | null, currentDate: Date = new Date()): ScheduledStatus {
  if (!settings) {
    return { status: 'Tutup', info: 'Memuat data...' };
  }

  // If status is set to manual Buka/Tutup, respect it
  if (settings.statusPendaftaran === 'Buka') {
    return { status: 'Buka', info: 'Pendaftaran SPMB sedang dibuka.' };
  }
  if (settings.statusPendaftaran === 'Tutup') {
    return { status: 'Tutup', info: 'Pendaftaran SPMB saat ini ditutup.' };
  }

  // Otherwise, default/automatic schedule based on settings
  const t = currentDate.getTime(); // System ISO UTC timestamp
  
  // Calculate baseTime from settings or fallback to default June 29, 2026, 08:00 WIB
  let baseTime = Date.UTC(2026, 5, 29, 1, 0, 0); // Default to UTC for June 29, 2026 08:00 WIB (01:00 UTC)
  let formattedDateStr = "29-30 Juni 2026 pukul 08.00 - 12.00 WIB";
  let hasCustomDate = false;

  if (settings.tanggalPembukaanPendaftaran) {
    const d = new Date(settings.tanggalPembukaanPendaftaran);
    if (!isNaN(d.getTime())) {
      baseTime = d.getTime();
      hasCustomDate = true;
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      try {
        formattedDateStr = d.toLocaleDateString('id-ID', options) + " WIB";
      } catch {
        formattedDateStr = d.toLocaleString();
      }
    }
  }

  const msDay1Start = baseTime;
  const msDay1End = baseTime + (4 * 60 * 60 * 1000); // 4 hours duration (08.00 - 12.00)
  const msDay2Start = baseTime + (24 * 60 * 60 * 1000); // Next day same time
  const msDay2End = msDay2Start + (4 * 60 * 60 * 1000); // 4 hours duration (08.00 - 12.00)

  if (t < msDay1Start) {
    return {
      status: 'Tutup',
      info: `Pendaftaran belum dibuka. Pendaftaran akan dibuka secara otomatis pada tanggal ${formattedDateStr}.`
    };
  } else if (t >= msDay1Start && t < msDay1End) {
    return {
      status: 'Buka',
      info: 'Pendaftaran Hari Pertama Sedang Berlangsung (Pukul 08.00 - 12.00 WIB).'
    };
  } else if (t >= msDay1End && t < msDay2Start) {
    return {
      status: 'Tutup',
      info: hasCustomDate 
        ? 'Pendaftaran hari ke-1 selesai. Pendaftaran hari ke-2 akan dibuka esok hari.'
        : 'Pendaftaran dibuka esok hari tanggal 30 Juni pukul 08.00-12.00.'
    };
  } else if (t >= msDay2Start && t < msDay2End) {
    return {
      status: 'Buka',
      info: 'Pendaftaran Hari Kedua Sedang Berlangsung (Pukul 08.00 - 12.00 WIB).'
    };
  } else {
    return {
      status: 'Tutup',
      info: 'Maaf pendaftaran sudah ditutup sampai jumpa tahun depan dan tetap semangat.'
    };
  }
}

function safeParseJSON(val: any, fallback: any) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '[object Object]' || trimmed.includes('[object Object]')) return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.error("Failed to parse JSON string:", val, e);
    return fallback;
  }
}

export const getSettings = async (): Promise<AppSettings> => {
  const defaults = getInitialMockSettings();
  
  // Always query our local/backup Express API first as a very fast and complete data source
  let localData: Partial<AppSettings> | null = null;
  try {
    const response = await fetch("/api/settings");
    const result = await response.json();
    if (result.status === "success" && result.data) {
      localData = result.data;
    }
  } catch (e) {
    console.warn("Failed to fetch settings from Express API (using mock offline fallback instead):", e);
  }

  const baseSettings = { ...defaults, ...(localData || mockSettings) };

  if (!GAS_WEB_APP_URL) {
    return baseSettings;
  }

  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getSettings&t=${Date.now()}`);
    const result = await response.json();
    if (result.status === "success") {
      const data = result.data;
      
      const merged = {
        ...baseSettings,
        ...data,
        formFields: safeParseJSON(data.formFields, data.formFields) || baseSettings.formFields,
        panduanAlur: safeParseJSON(data.panduanAlur, data.panduanAlur) || baseSettings.panduanAlur,
        panduanDokumen: safeParseJSON(data.panduanDokumen, data.panduanDokumen) || baseSettings.panduanDokumen,
      };

      // For any keys that are empty, null, or undefined, fall back to our fast/complete localData or defaults
      for (const key of Object.keys(merged) as Array<keyof AppSettings>) {
        if (data[key] === null || data[key] === undefined || data[key] === "") {
          (merged as any)[key] = (baseSettings as any)[key];
        }
      }

      // Explicitly coerce boolean flags that can come as strings from GAS Web App / Google Sheets
      if (merged.hasOwnProperty('isMaintenance')) {
        merged.isMaintenance = merged.isMaintenance === true || String(merged.isMaintenance).toLowerCase() === 'true';
      }
      if (merged.hasOwnProperty('isRapatAktif')) {
        merged.isRapatAktif = merged.isRapatAktif === true || String(merged.isRapatAktif).toLowerCase() === 'true';
      }

      return merged;
    }
    throw new Error(result.message);
  } catch (error) {
    console.warn("Could not fetch settings from GAS (using local/cached settings fallback):", error);
    return baseSettings;
  }
}

export const updateSettings = async (settings: Partial<AppSettings>) => {
  // Always synchronize changes to local Express API immediately
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
  } catch (e) {
    console.warn("Failed to update settings in Express API background:", e);
  }
  saveMockSettings({ ...mockSettings, ...settings });

  if (!GAS_WEB_APP_URL) {
    return { status: "success" };
  }

  try {
    // Clone and serialize structured collections before sending to Google Sheets / GAS to ensure proper string columns
    const payload = { ...settings };
    if (payload.formFields && typeof payload.formFields !== 'string') {
      payload.formFields = JSON.stringify(payload.formFields) as any;
    }
    if (payload.panduanAlur && typeof payload.panduanAlur !== 'string') {
      payload.panduanAlur = JSON.stringify(payload.panduanAlur) as any;
    }
    if (payload.panduanDokumen && typeof payload.panduanDokumen !== 'string') {
      payload.panduanDokumen = JSON.stringify(payload.panduanDokumen) as any;
    }

    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateSettings",
        settings: payload
      }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error updating settings on GAS backend:", error);
    throw error;
  }
};

export const submitRegistration = async (data: RegistrationData) => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.status === "success") {
        return result;
      }
    } catch (e) {
      console.warn("Failed to submit registration to Express API (using mock fallback):", e);
    }
    
    // In-memory local fallback if Express API is offline or not responsive
    const scheduled = getScheduledStatus(mockSettings);
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if (scheduled.status === 'Tutup' && !isAdmin) {
      return { status: "error", message: scheduled.info };
    }
    let year = mockSettings.tahunPendaftaran || new Date().getFullYear().toString();
    
    // Generate secure unique 4-character random alphanumeric code
    const generateRandomCode = (length = 4): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let noPendaftaran = "";
    let isUnique = false;
    let yearFormatted = year;
    if (!year.includes('/')) {
       const nextYear = isNaN(Number(year)) ? (new Date().getFullYear() + 1).toString() : (Number(year) + 1).toString();
       yearFormatted = `${year}/${nextYear}`;
    }
    while (!isUnique) {
      const code = generateRandomCode(4);
      noPendaftaran = `SPMB-${yearFormatted}-${code}`;
      isUnique = !mockData.some(d => d['No Pendaftaran'] === noPendaftaran);
    }

    // Get current time adjusted to Asia/Jakarta (UTC+7)
    const getJakartaTimeISO = () => {
      const d = new Date();
      const tzOffset = 7 * 60; // WIB is UTC+7
      const localTime = new Date(d.getTime() + tzOffset * 60 * 1000);
      return localTime.toISOString().replace('Z', '+07:00');
    };

    const newEntry: AdminData = {
      ...data,
      Timestamp: getJakartaTimeISO(),
      'No Pendaftaran': noPendaftaran,
      Status: 'Proses'
    };
    saveMockData([...mockData, newEntry]);
    return { status: "success", noPendaftaran: newEntry['No Pendaftaran'] };
  }
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error submitting registration to GAS backend:", error);
    throw error;
  }
};

export const getRegistrations = async (): Promise<AdminData[]> => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch("/api/registrations");
      const result = await response.json();
      if (result.status === "success") {
        return result.data;
      }
    } catch (e) {
      console.warn("Failed to fetch registrations from Express API (using mock fallback):", e);
    }
    return [...mockData];
  }

  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?t=${Date.now()}`);
    const result = await response.json();
    if (result.status === "success") {
      return result.data;
    }
    throw new Error(result.message);
  } catch (error) {
    console.warn("Error fetching registrations from GAS backend:", error);
    throw error;
  }
};

export const updateStatus = async (noPendaftaran: string, newStatus: string, alasan?: string) => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch("/api/registrations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPendaftaran, newStatus, alasan })
      });
      const result = await response.json();
      if (result.status === "success") {
        return result;
      }
    } catch (e) {
      console.warn("Failed to update status in Express API (using mock fallback):", e);
    }
    const index = mockData.findIndex(d => d['No Pendaftaran'] === noPendaftaran);
    if (index !== -1) {
      const newData = [...mockData];
      newData[index] = { ...newData[index], Status: newStatus as any };
      if (alasan !== undefined) {
        newData[index]['Alasan Penolakan'] = alasan;
      }
      saveMockData(newData);
      return { status: "success" };
    }
    throw new Error("Data not found");
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "updateStatus",
        noPendaftaran,
        newStatus,
        alasan
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error updating status on GAS backend:", error);
    throw error;
  }
};

export const checkStatus = async (noPendaftaran: string) => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch("/api/registrations/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPendaftaran })
      });
      const result = await response.json();
      if (result.status === "success") {
        return result;
      }
    } catch (e) {
      console.warn("Failed to check status in Express API (using mock fallback):", e);
    }
    const student = mockData.find(d => d['No Pendaftaran'] === noPendaftaran);
    if (student) {
      const namaKey = Object.keys(student).find(k => k.toLowerCase().includes('nama')) || 'Nama Lengkap';
      return { 
        status: "success", 
        data: {
          ...student,
          noPendaftaran: student['No Pendaftaran'],
          namaLengkap: student[namaKey] || 'Siswa',
          status: student.Status,
          alasanPenolakan: student['Alasan Penolakan']
        }
      };
    }
    return { status: "error", message: "Data tidak ditemukan" };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "checkStatus",
        noPendaftaran
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error checking status on GAS backend:", error);
    throw error;
  }
};

export const loginAdmin = async (username: string, password: string) => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (result.status === "success") {
        return result;
      }
    } catch (e) {
      console.warn("Failed to login in Express API (using mock fallback):", e);
    }
    if (username === 'admin' && password === 'ajayhungkul') {
      return { status: "success" };
    }
    return { status: "error", message: "Username atau password salah" };
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        username,
        password
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error logging in on GAS backend:", error);
    throw error;
  }
};

export const deleteRegistration = async (noPendaftaran: string) => {
  if (!GAS_WEB_APP_URL) {
    try {
      const response = await fetch(`/api/registrations/${encodeURIComponent(noPendaftaran)}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.status === "success") {
        return result;
      }
    } catch (e) {
      console.warn("Failed to delete registration in Express API (using mock fallback):", e);
    }
    const index = mockData.findIndex(d => d['No Pendaftaran'] === noPendaftaran);
    if (index !== -1) {
      const newData = [...mockData];
      newData.splice(index, 1);
      saveMockData(newData);
      return { status: "success" };
    }
    throw new Error("Data tidak ditemukan");
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "deleteRegistration",
        noPendaftaran,
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    return await response.json();
  } catch (error) {
    console.warn("Error deleting registration on GAS backend:", error);
    throw error;
  }
};

