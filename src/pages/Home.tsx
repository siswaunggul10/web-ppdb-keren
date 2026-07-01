import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Trophy, ChevronRight, CheckCircle2, Calendar, FileText, CheckSquare, AlertCircle, Clock } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { getScheduledStatus } from '../services/api';

export default function Home() {
  const { settings } = useSettings();
  const scheduled = getScheduledStatus(settings);
  const isAdminSession = sessionStorage.getItem('isAdmin') === 'true';
  const isClosed = scheduled.status === 'Tutup' && !isAdminSession;
  const displayYear = settings?.tahunPendaftaran || new Date().getFullYear().toString();

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    const targetDateStr = settings?.tanggalPembukaanPendaftaran || "2026-06-29T08:00";
    const target = new Date(targetDateStr);

    const updateTimer = () => {
      const now = new Date();
      const difference = target.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s, expired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings?.tanggalPembukaanPendaftaran]);

  // Split info text for nicer display
  const infoParts = scheduled.info.includes('Pendaftaran belum dibuka. Pendaftaran akan')
    ? ['Pendaftaran Belum Dibuka', scheduled.info.substring(scheduled.info.indexOf('Pendaftaran akan'))]
    : scheduled.info.split('. ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-32">
        <div 
          className={`absolute inset-0 bg-cover bg-center ${settings?.gambarHeaderBeranda ? 'opacity-30' : 'opacity-5'}`}
          style={{ backgroundImage: `url('${settings?.gambarHeaderBeranda || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop'}')` }}
        ></div>
        <div className={`absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/80 to-green-50/90 ${settings?.gambarHeaderBeranda ? '' : 'backdrop-blur-sm'}`}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {isAdminSession && (
            <div className="max-w-3xl mx-auto mb-8 bg-blue-50 border border-blue-200 text-blue-900 rounded-3xl p-5 flex items-start gap-4 shadow-sm text-left">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
                <Clock size={20} className="stroke-[2.5]" />
              </div>
              <div className="text-sm">
                <p className="font-extrabold text-blue-800">Mode Uji Coba Admin (Landing Page Bypass)</p>
                <p className="text-blue-700 mt-1 leading-relaxed font-semibold">Meskipun pendaftaran untuk umum saat ini sedang ditutup / dalam jadwal yang ditentukan, Anda masuk sebagai Admin sehingga dapat melihat dan menavigasi ke formulir pendaftaran secara bebas untuk mengetes/mengisi data tanpa ada batasan.</p>
              </div>
            </div>
          )}
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-2.5 mb-8 max-w-2xl mx-auto"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-sm border ${isClosed ? 'bg-amber-100/90 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {!isClosed && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isClosed ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                </span>
                <span>{infoParts[0]}</span>
              </div>
              {infoParts[1] && (
                <p className="text-sm text-amber-850 bg-amber-50/40 px-4 py-2 rounded-2xl border border-amber-200/60 font-medium leading-relaxed max-w-lg text-center shadow-xs">
                  {infoParts[1]}
                </p>
              )}
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6"
            >
              Selamat Datang di <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                SPMB SDN Citapen
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-600 mb-6 leading-relaxed"
            >
              Bergabunglah bersama {settings?.namaSekolah || 'SDN Citapen'}. Kami berkomitmen memberikan pendidikan dasar terbaik dengan fasilitas modern dan tenaga pendidik profesional.
            </motion.p>
            
            {/* Hitung Mundur Pembukaan Pendaftaran */}
            {!timeLeft.expired && isClosed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="max-w-xl mx-auto my-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl border border-slate-700/50 relative overflow-hidden"
              >
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00BCD4] mb-4 select-none">
                    <Clock size={16} className="animate-pulse text-[#00BCD4]" />
                    HITUNG MUNDUR PEMBUKAAN PENDAFTARAN
                  </div>

                  <div className="flex justify-center items-center gap-4 sm:gap-6">
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800/80 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-3xl font-extrabold text-white border border-slate-700 shadow-inner">
                        {String(timeLeft.days).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 tracking-wider uppercase">Hari</span>
                    </div>

                    {/* Separator */}
                    <div className="text-xl sm:text-2xl font-bold text-slate-600 mb-6">:</div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800/80 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-3xl font-extrabold text-white border border-slate-700 shadow-inner">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 tracking-wider uppercase">Jam</span>
                    </div>

                    {/* Separator */}
                    <div className="text-xl sm:text-2xl font-bold text-slate-600 mb-6">:</div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800/80 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-3xl font-extrabold text-white border border-slate-700 shadow-inner">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 tracking-wider uppercase">Menit</span>
                    </div>

                    {/* Separator */}
                    <div className="text-xl sm:text-2xl font-bold text-slate-600 mb-6">:</div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800/80 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl flex items-center justify-center font-mono text-xl sm:text-3xl font-extrabold text-amber-400 border border-slate-700 shadow-inner">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 tracking-wider uppercase">Detik</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isClosed ? (
                <button
                  disabled
                  className="inline-flex justify-center items-center gap-2 bg-slate-400 text-white px-8 py-4 rounded-full text-lg font-semibold cursor-not-allowed shadow-sm"
                >
                  <AlertCircle size={20} /> Pendaftaran Belum di Buka
                </button>
              ) : (
                <Link
                  to="/daftar"
                  className="inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Daftar Sekarang <ChevronRight size={20} />
                </Link>
              )}
              <a
                href="#alur"
                className="inline-flex justify-center items-center gap-2 bg-white hover:bg-slate-55 text-slate-700 border border-slate-200 px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Lihat Alur SPMB
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Profil Sekolah / Features */}
      <section className="py-24 bg-slate-50 relative -mt-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <BookOpen className="text-blue-500" size={32} />,
                title: "Kurikulum Modern",
                desc: "Menerapkan kurikulum merdeka belajar yang adaptif dengan perkembangan zaman dan teknologi."
              },
              {
                icon: <Users className="text-green-500" size={32} />,
                title: "Guru Profesional",
                desc: "Dididik oleh tenaga pengajar tersertifikasi, berpengalaman, dan berdedikasi tinggi pada pendidikan."
              },
              {
                icon: <Trophy className="text-amber-500" size={32} />,
                title: "Fasilitas Lengkap",
                desc: "Ruang kelas nyaman, dan fasilitas olahraga yang memadai."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Jadwal Penting SPMB Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-slate-100 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Jadwal Penting SPMB</h2>
            <p className="text-slate-600 mt-2">Catat tanggal dan waktu pelaksanaan Seleksi Penerimaan Siswa Baru berikut:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
              <div className="text-sm font-bold text-blue-600 uppercase mb-2">1. Masa Pendaftaran</div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">29 - 30 Juni 2026</h3>
              <p className="text-blue-600 font-semibold text-sm mb-4">Pukul 08.00 - 12.00 WIB</p>
              <p className="text-slate-600 text-sm leading-relaxed">Pendaftaran berkas dilakukan secara mandiri secara mengisi formulir online di website resmi ini.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
              <div className="text-sm font-bold text-indigo-600 uppercase mb-2">2. Pengumuman Penerimaan</div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">02 Juli 2026</h3>
              <p className="text-indigo-600 font-semibold text-sm mb-4">Hari Kamis secara online</p>
              <p className="text-slate-600 text-sm leading-relaxed">Hasil seleksi calon peserta didik diumumkan di portal ini. Silakan masukkan Nomor Pendaftaran Anda.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
              <div className="text-sm font-bold text-emerald-600 uppercase mb-2">3. Daftar Ulang</div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">06 Juli 2026</h3>
              <p className="text-emerald-600 font-semibold text-sm mb-4">Hari Senin secara offline</p>
              <p className="text-slate-600 text-sm leading-relaxed">Bagi peserta yang dinyatakan diterima seleksi, WAJIB membawa dokumen & persyaratan daftar ulang ke sekolah.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sambutan & Visi Misi */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Sambutan Kepala Sekolah
              </h2>
              <div className="prose prose-lg text-slate-600">
                {settings?.sambutanKepalaSekolah?.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4">
                    {paragraph}
                  </p>
                ))}
                <div className="flex items-center gap-4 mt-8">
                  <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                    <img src={settings?.fotoKepalaSekolah || "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&auto=format&fit=crop"} alt="Kepala Sekolah" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{settings?.namaKepalaSekolah || 'Kepala Sekolah'}</h4>
                    <p className="text-sm text-slate-500">Kepala Sekolah {settings?.namaSekolah}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-slate-50 rounded-3xl p-8 md:p-10 border border-slate-100"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg"><Trophy size={24} /></span>
                Visi & Misi
              </h3>
              
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Visi</h4>
                <p className="text-slate-600 italic bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  "{settings?.visiSekolah || 'Visi sekolah belum diatur.'}"
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Misi</h4>
                <ul className="space-y-3">
                  {(settings?.misiSekolah ? settings.misiSekolah.split('\n') : []).map((misi, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-600">
                      <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={20} />
                      <span>{misi.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Alur SPMB */}
      <section id="alur" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2064&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Alur Pendaftaran SPMB</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Ikuti langkah-langkah mudah berikut untuk mendaftarkan putra/putri Anda di {settings?.namaSekolah || 'SDN Citapen'}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>
            
            {[
              {
                step: "01",
                icon: <FileText size={28} />,
                title: "Isi Formulir",
                desc: "Lengkapi data diri calon siswa dan orang tua secara online."
              },
              {
                step: "02",
                icon: <BookOpen size={28} />,
                title: "Upload Berkas",
                desc: "Unggah dokumen persyaratan."
              },
              {
                step: "03",
                icon: <CheckSquare size={28} />,
                title: "Verifikasi",
                desc: "Panitia akan memverifikasi data dan dokumen yang diunggah."
              },
              {
                step: "04",
                icon: <Calendar size={28} />,
                title: "Pengumuman",
                desc: "Cek status penerimaan dan cetak bukti pendaftaran."
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6 shadow-xl relative group hover:bg-blue-600 transition-colors duration-300">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm border-4 border-slate-900">
                    {item.step}
                  </div>
                  <div className="text-slate-300 group-hover:text-white transition-colors">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center">
            {isClosed ? (
              <button
                disabled
                className="inline-flex justify-center items-center gap-2 bg-slate-700 text-slate-400 px-8 py-4 rounded-full text-lg font-bold cursor-not-allowed shadow-lg"
              >
                <AlertCircle size={20} /> Pendaftaran Belum di Buka
              </button>
            ) : (
              <Link
                to="/daftar"
                className="inline-flex justify-center items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                Mulai Pendaftaran <ChevronRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
