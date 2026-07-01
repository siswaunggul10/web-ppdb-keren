import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, ArrowLeft, Printer, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { formatRapatTanggal } from '../lib/utils';

export default function RapatDetail() {
  const { settings } = useSettings();

  const judul = settings?.rapatJudul || 'Pemberitahuan Rapat Orang Tua / Wali Calon Siswa Baru';
  const tanggal = settings?.rapatTanggal ? formatRapatTanggal(settings.rapatTanggal) : 'Sabtu, 11 Juli 2026';
  const waktu = settings?.rapatWaktu || '08:00 WIB s.d Selesai';
  const tempat = settings?.rapatTempat || 'Aula Serbaguna SDN Citapen Tasikmalaya';
  const deskripsi = settings?.rapatDeskripsi || 'Diharapkan kehadiran Bapak/Ibu Orang Tua/Wali Calon Siswa Baru yang telah dinyatakan diterima untuk menghadiri rapat pembekalan awal tahun pelajaran baru.';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 print:bg-white print:pt-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back navigation - hidden on print */}
        <div className="mb-6 print:hidden">
          <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Kembali ke Beranda
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none"
        >
          {/* Header Banner - print optimized */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white relative print:bg-none print:text-black print:p-0 print:border-b-2 print:border-slate-850">
            <div className="relative z-10">
              <span className="bg-blue-500/30 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider print:hidden">
                Agenda Penting
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-3 leading-tight print:text-xl print:mt-0 print:text-slate-900">
                {judul}
              </h1>
              <p className="text-blue-100 text-sm mt-2 font-medium print:text-slate-600">
                Resmi dikeluarkan oleh Humas & Komite Sekolah {settings?.namaSekolah || 'SDN Citapen'}
              </p>
            </div>
            
            {/* Ambient decorative background element - hidden on print */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl -mr-16 -mt-16 print:hidden"></div>
          </div>

          <div className="p-8 sm:p-10">
            
            {/* Attention Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8 flex items-start gap-3.5 print:bg-slate-50 print:border-slate-350">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5 print:text-slate-610" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm print:text-slate-900">Sifat Kehadiran: Wajib (Satu Orang Tua/Wali)</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed print:text-slate-700">
                  Untuk kelancaran koordinasi program sosiologi sekolah, tata tertib, dan administrasi seragam sekolah, salah satu orang tua atau wali dari siswa yang lulus wajib menghadiri rapat koordinasi ini tepat waktu.
                </p>
              </div>
            </div>

            {/* Event Specification Details Card */}
            <h2 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2 print:text-sm">
              <FileText className="text-blue-600 print:text-slate-600" size={18} /> Detil Jadwal Kegiatan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Date */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center text-center relative hover:shadow-sm transition-all print:border-slate-300">
                <div className="bg-blue-100 text-blue-700 p-3 rounded-full mb-3 print:bg-none print:text-slate-900 print:p-0">
                  <Calendar size={22} />
                </div>
                <span className="text-xs text-slate-500 font-medium">Hari / Tanggal</span>
                <span className="text-sm font-bold text-slate-900 mt-1">{tanggal}</span>
              </div>

              {/* Time */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center text-center relative hover:shadow-sm transition-all print:border-slate-300">
                <div className="bg-indigo-100 text-indigo-700 p-3 rounded-full mb-3 print:bg-none print:text-slate-900 print:p-0">
                  <Clock size={22} />
                </div>
                <span className="text-xs text-slate-500 font-medium">Waktu Pertemuan</span>
                <span className="text-sm font-bold text-slate-900 mt-1">{waktu}</span>
              </div>

              {/* Venue */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col items-center text-center relative hover:shadow-sm transition-all print:border-slate-300">
                <div className="bg-violet-100 text-violet-700 p-3 rounded-full mb-3 print:bg-none print:text-slate-900 print:p-0">
                  <MapPin size={22} />
                </div>
                <span className="text-xs text-slate-500 font-medium">Tempat Acara</span>
                <span className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">{tempat}</span>
              </div>
            </div>

            {/* Official Announcement Text / Letter body */}
            <div className="prose prose-slate max-w-none text-slate-705 leading-relaxed text-sm mb-10 border-t border-slate-100 pt-6">
              <h3 className="font-bold text-slate-900 text-base mb-3">Deskripsi & Agenda Rapat:</h3>
              <p className="whitespace-pre-line text-slate-600">
                {deskripsi}
              </p>
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mt-6 print:border-slate-350">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Dokumen & Perlengkapan yang Harus Dibawa:
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                  <li>Membawa alat tulis pribadi (pulpen) untuk mengisi daftar hadir dan lembar persetujuan.</li>
                  <li>Membawa Bukti Diterima cetak (yang diunduh dari menu Cek Penerimaan).</li>
                  <li>Mengenakan pakaian bebas, rapi, sopan, dan wajib mematuhi prokes sekolah.</li>
                  <li>Membawa berkas pendaftaran ulang yang belum lengkap (bagi yang memiliki kekurangan berkas).</li>
                </ul>
              </div>
            </div>

            {/* Signatures Area */}
            <div className="border-t border-dashed border-slate-200 pt-8 flex flex-col sm:flex-row justify-between items-center gap-6 text-sm">
              <div className="text-center sm:text-left text-slate-500">
                <p>Sistem Informasi Humas Sekolah</p>
                <p className="font-semibold text-slate-900 mt-1">{settings?.namaSekolah || 'SDN Citapen'}</p>
              </div>

              <div className="text-center sm:text-right print:mt-4">
                <p className="text-slate-500">Panitia PPDB / SPMB,</p>
                <p className="font-bold text-slate-900 mt-12">( Tim Panitia SPMB )</p>
                <p className="text-xs text-slate-400 mt-0.5">Tasikmalaya, Jawa Barat</p>
              </div>
            </div>

            {/* Action buttons area - completely hidden on print */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Printer size={18} /> Cetak Pengumuman Rapat
              </button>
              
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Kembali ke Beranda
              </Link>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
