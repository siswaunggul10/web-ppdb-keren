import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

class Mutex {
  private promise: Promise<void> = Promise.resolve();

  async runExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
    const nextPromise = this.promise.then(async () => {
      return callback();
    });
    this.promise = nextPromise.then(() => {}).catch(() => {});
    return nextPromise;
  }
}

const regMutex = new Mutex();
const settingsMutex = new Mutex();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support base64 file uploads (KK/Akta can be up to 2MB as base64 string)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");
  const REGISTRATIONS_PATH = path.join(DATA_DIR, "registrations.json");

  // Initial default settings matching SDN Citapen
  const defaultSettings = {
    namaSekolah: "SDN Citapen",
    isMaintenance: false,
    maintenanceMessage: "Maaf, server sedang mengalami overload penonton/pendaftar yang sangat tinggi. Sistem SPMB SDN Citapen sementara sedang mengalami maintenance untuk optimalisasi kuota server agar tidak down. Silakan coba kembali beberapa menit lagi secara berkala.",
    alamat: "Jl. Otto Iskandardinata No.12, Citapen, Kec. Tawang, Kota Tasikmalaya, Jawa Barat 46115",
    telepon: "(0265) 331422",
    email: "info@sdncitapen.sch.id",
    deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas di SDN Citapen Tasikmalaya.",
    statusPendaftaran: "Otomatis",
    persyaratanDaftarUlang: "1. Membawa Bukti Kelulusan / Kelulusan SPMB (dicetak)\n2. Membawa Dokumen Daftar Ulang Resmi yang diunduh dari website (telah diisi dan ditandatangani)\n3. Fotokopi Kartu Keluarga (2 lembar)\n4. Fotokopi Akta Kelahiran (2 lembar)\n5. Pas Foto Calon Siswa berwarna ukuran 3x4 (4 lembar)\n6. Fotokopi KTP Orang Tua/Wali (masing-masing 2 lembar)\n7. Materai Rp 10.000 (1 lembar) untuk Surat Pernyataan",
    tanggalDaftarUlang: "2026-07-06",
    tanggalPengumuman: "2026-07-02",
    logoSekolah: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
    faviconSekolah: "",
    tahunPendaftaran: "2026",
    koordinatSekolah: "-7.3259441, 108.2205556",
    tanggalCutoffUsia: "",
    sambutanKepalaSekolah: "Selamat datang di website resmi SPMB SDN Citapen. Kami berkomitmen untuk memberikan pelayanan pendidikan terbaik bagi putra-putri Anda. Mari bergabung bersama kami untuk mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan berprestasi.",
    fotoKepalaSekolah: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop",
    visiSekolah: "Menjadi sekolah dasar unggulan yang menghasilkan lulusan berakhlak mulia, cerdas, terampil, dan berwawasan lingkungan menuju masa depan gemilang.",
    misiSekolah: "1. Menyelenggarakan pembelajaran yang aktif, inovatif, kreatif, efektif, dan menyenangkan (PAIKEM).\n2. Menanamkan nilai-nilai keagamaan dan budi pekerti luhur dalam kehidupan sehari-hari.\n3. Mengembangkan potensi, bakat, dan minat siswa melalui berbagai kegiatan ekstrakurikuler.\n4. Menciptakan lingkungan belajar yang bersih, sehat, rindang, aman, dan kondusif.",
    formFields: [
      { id: "Nama Lengkap", label: "Nama Lengkap", type: "text", required: true, session: 1 },
      { id: "NIK", label: "NIK", type: "text", required: true, session: 1 },
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

  const loadSettings = async () => {
    if (fs.existsSync(SETTINGS_PATH)) {
      try {
        const content = fs.readFileSync(SETTINGS_PATH, "utf-8");
        if (content.trim()) {
          return JSON.parse(content);
        }
      } catch (e) {
        console.error("Error reading settings.json, trying backup...", e);
        const bakPath = `${SETTINGS_PATH}.bak`;
        if (fs.existsSync(bakPath)) {
          try {
            const contentBak = fs.readFileSync(bakPath, "utf-8");
            if (contentBak.trim()) {
              return JSON.parse(contentBak);
            }
          } catch (ebak) {
            console.error("Error reading settings.json.bak", ebak);
          }
        }
      }
    }
    // Write initial settings
    try {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2));
    } catch (err) {
      console.error("Error writing initial settings.json", err);
    }
    return defaultSettings;
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const tempPath = `${SETTINGS_PATH}.tmp`;
      const bakPath = `${SETTINGS_PATH}.bak`;

      fs.writeFileSync(tempPath, JSON.stringify(newSettings, null, 2));

      if (fs.existsSync(SETTINGS_PATH)) {
        try {
          const currentContent = fs.readFileSync(SETTINGS_PATH, "utf-8");
          if (currentContent.trim()) {
            JSON.parse(currentContent);
            fs.copyFileSync(SETTINGS_PATH, bakPath);
          }
        } catch (eCheck) {
          console.error("Skipping settings backup because settings.json is corrupted", eCheck);
        }
      }

      fs.renameSync(tempPath, SETTINGS_PATH);
    } catch (e) {
      console.error("Error saving atomic settings.json", e);
      try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(newSettings, null, 2));
      } catch (errFallback) {
        console.error("Fallback settings writing failed", errFallback);
      }
    }
  };

  const loadRegistrations = async () => {
    if (fs.existsSync(REGISTRATIONS_PATH)) {
      try {
        const content = fs.readFileSync(REGISTRATIONS_PATH, "utf-8");
        if (content.trim()) {
          return JSON.parse(content);
        }
      } catch (e) {
        console.error("Error reading registrations.json, trying backup...", e);
        const bakPath = `${REGISTRATIONS_PATH}.bak`;
        if (fs.existsSync(bakPath)) {
          try {
            const contentBak = fs.readFileSync(bakPath, "utf-8");
            if (contentBak.trim()) {
              return JSON.parse(contentBak);
            }
          } catch (ebak) {
            console.error("Error reading registrations.json.bak", ebak);
          }
        }
      }
    }
    const initialRegistrations = [
      {
        Timestamp: new Date().toISOString(),
        "No Pendaftaran": "SPMB-2026/2027-H8K3",
        "Nama Lengkap": "Budi Santoso",
        "NIK": "1234567890123456",
        "Tempat Lahir": "Tasikmalaya",
        "Tanggal Lahir": "2019-05-10",
        "Jenis Kelamin": "Laki-laki",
        "Alamat Lengkap": "Jl. Citapen No. 45, Tasikmalaya",
        "Nama Orang Tua": "Agus Santoso",
        "No. WhatsApp Aktif": "081234567890",
        "Jarak ke Sekolah (km)": "0.55",
        Status: "Proses"
      }
    ];
    try {
      fs.writeFileSync(REGISTRATIONS_PATH, JSON.stringify(initialRegistrations, null, 2));
    } catch (err) {
      console.error("Error writing initial registrations file:", err);
    }
    return initialRegistrations;
  };

  const saveRegistrations = async (regs: any[]) => {
    try {
      const tempPath = `${REGISTRATIONS_PATH}.tmp`;
      const bakPath = `${REGISTRATIONS_PATH}.bak`;
      
      // Write to temp file first
      fs.writeFileSync(tempPath, JSON.stringify(regs, null, 2));
      
      // If there is an existing valid file, back it up
      if (fs.existsSync(REGISTRATIONS_PATH)) {
        try {
          const currentContent = fs.readFileSync(REGISTRATIONS_PATH, "utf-8");
          if (currentContent.trim()) {
            // Verify it is parseable JSON before backing up so we don't backup a corrupted file
            JSON.parse(currentContent);
            fs.copyFileSync(REGISTRATIONS_PATH, bakPath);
          }
        } catch (eCheck) {
          console.error("Skipping backup because current registrations.json is corrupted", eCheck);
        }
      }
      
      // Atomically rename temp file to real file (highly robust)
      fs.renameSync(tempPath, REGISTRATIONS_PATH);
    } catch (e) {
      console.error("Error saving atomic registrations.json", e);
      // Fallback
      try {
        fs.writeFileSync(REGISTRATIONS_PATH, JSON.stringify(regs, null, 2));
      } catch (errFallback) {
        console.error("Fallback writing failed", errFallback);
      }
    }
  };

  // API - Get Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await settingsMutex.runExclusive(async () => {
        return await loadSettings();
      });
      res.json({ status: "success", data: settings });
    } catch (error: any) {
      console.error("Error loading settings:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - Update Settings
  app.post("/api/settings", async (req, res) => {
    try {
      const updated = await settingsMutex.runExclusive(async () => {
        const current = await loadSettings();
        const nextSettings = { ...current, ...req.body };
        await saveSettings(nextSettings);
        return nextSettings;
      });
      res.json({ status: "success", data: updated });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - Get Registrations
  app.get("/api/registrations", async (req, res) => {
    try {
      const registrations = await regMutex.runExclusive(async () => {
        return await loadRegistrations();
      });
      res.json({ status: "success", data: registrations });
    } catch (error: any) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - New Registration
  app.post("/api/registrations", async (req, res) => {
    try {
      const result = await regMutex.runExclusive(async () => {
        const settings = await loadSettings();
        const registrations = await loadRegistrations();

        const data = req.body;
        let year = settings.tahunPendaftaran || new Date().getFullYear().toString();

        // Helper to generate a 4-character random alphanumeric string
        const generateRandomCode = (length = 4): string => {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let result = "";
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
          isUnique = !registrations.some((r: any) => r["No Pendaftaran"] === noPendaftaran);
        }

        const getJakartaTimeISO = () => {
          const d = new Date();
          const tzOffset = 7 * 60; // WIB is UTC+7
          const localTime = new Date(d.getTime() + tzOffset * 60 * 1000);
          return localTime.toISOString().replace('Z', '+07:00');
        };

        const newEntry: any = {
          ...data,
          Timestamp: getJakartaTimeISO(),
          "No Pendaftaran": noPendaftaran,
          Status: "Proses"
        };

        registrations.push(newEntry);
        await saveRegistrations(registrations);

        return { status: "success", noPendaftaran };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error creating registration:", error);
      res.status(500).json({ status: "error", message: error.message || "Internal server error" });
    }
  });

  // API - Update Status
  app.post("/api/registrations/status", async (req, res) => {
    try {
      const { noPendaftaran, newStatus, alasan } = req.body;
      const result = await regMutex.runExclusive(async () => {
        const registrations = await loadRegistrations();
        const index = registrations.findIndex((r: any) => r["No Pendaftaran"] === noPendaftaran);

        if (index !== -1) {
          registrations[index].Status = newStatus;
          if (alasan !== undefined) {
            registrations[index]["Alasan Penolakan"] = alasan;
          }
          
          await saveRegistrations(registrations);
          return { status: "success" };
        }
        return { status: "error", message: "Data tidak ditemukan", code: 404 };
      });

      if (result.status === "error") {
        return res.status(result.code || 400).json({ status: "error", message: result.message });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error updating status:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - Delete Registration
  app.delete("/api/registrations/:noPendaftaran", async (req, res) => {
    try {
      const { noPendaftaran } = req.params;
      const result = await regMutex.runExclusive(async () => {
        const registrations = await loadRegistrations();
        const index = registrations.findIndex((r: any) => r["No Pendaftaran"] === noPendaftaran);

        if (index !== -1) {
          registrations.splice(index, 1);
          await saveRegistrations(registrations);
          return { status: "success" };
        }
        return { status: "error", message: "Data tidak ditemukan", code: 404 };
      });

      if (result.status === "error") {
        return res.status(result.code || 400).json({ status: "error", message: result.message });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - Check Status
  app.post("/api/registrations/check", async (req, res) => {
    try {
      const { noPendaftaran } = req.body;
      const result = await regMutex.runExclusive(async () => {
        const registrations = await loadRegistrations();
        const student = registrations.find((r: any) => r["No Pendaftaran"] === noPendaftaran);

        if (student) {
          const namaKey = Object.keys(student).find(k => k.toLowerCase().includes("nama")) || "Nama Lengkap";
          return {
            status: "success",
            data: {
              ...student,
              noPendaftaran: student["No Pendaftaran"],
              namaLengkap: student[namaKey] || "Siswa",
              status: student.Status,
              alasanPenolakan: student["Alasan Penolakan"]
            }
          };
        }
        return { status: "error", message: "Data tidak ditemukan" };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error checking status:", error);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // API - Administrative Login
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "ajayhungkul") {
      res.json({ status: "success" });
    } else {
      res.json({ status: "error", message: "Username atau password salah" });
    }
  });

  // API - Download ZIP safely (to prevent browser preview text corruption)
  app.get("/download-zip", (req, res) => {
    const zipPath = path.join(process.cwd(), "website-siap-upload.zip");
    if (fs.existsSync(zipPath)) {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=website-siap-upload.zip");
      const filestream = fs.createReadStream(zipPath);
      filestream.pipe(res);
    } else {
      res.status(404).send("File website-siap-upload.zip tidak ditemukan di server. Silakan hubungi AI.");
    }
  });

  // Vite Developer middleware or Production build static file server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
