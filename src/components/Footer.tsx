import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    const nextCount = clickCount + 1;
    if (nextCount >= 3) {
      setClickCount(0);
      navigate('/admin/login');
    } else {
      setClickCount(nextCount);
    }
  };

  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => {
        setClickCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);


  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              {settings?.logoSekolah ? (
                <img src={settings.logoSekolah} alt="Logo Sekolah" className="h-10 w-auto object-contain bg-white p-1 rounded" referrerPolicy="no-referrer" />
              ) : (
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <GraduationCap size={24} />
                </div>
              )}
              <span className="font-bold text-xl tracking-tight text-white">
                {settings?.namaSekolah || 'SDN Citapen'}
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              {settings?.deskripsi || 'Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas.'}
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Tautan Cepat</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition-colors">Beranda</Link></li>
              <li><Link to="/panduan" className="hover:text-blue-400 transition-colors">Panduan Pendaftaran</Link></li>
              <li><Link to="/daftar" className="hover:text-blue-400 transition-colors">Formulir SPMB</Link></li>
              <li><Link to="/cek-kelulusan" className="hover:text-blue-400 transition-colors">Cek Hasil Penerimaan</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Hubungi Kami</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <span>{settings?.alamat || 'Jl. Pendidikan No. 123, Kota Pelajar, Indonesia 12345'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-blue-500 shrink-0" />
                <span>{settings?.telepon || '(021) 1234-5678'}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-500 shrink-0" />
                <span>{settings?.email || 'info@sdnharapanbangsa.sch.id'}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center select-none">
          <p>
            <span 
              onClick={handleSecretClick}
              className="pr-0.5 select-none text-slate-500 cursor-default"
            >
              ©
            </span>{" "}
            {new Date().getFullYear()} {settings?.namaSekolah || 'SDN Citapen'}. Hak Cipta Dilindungi.
          </p>
          <p className="mt-2 md:mt-0">Sistem SPMB Online Terintegrasi</p>
        </div>
      </div>
    </footer>
  );
}
