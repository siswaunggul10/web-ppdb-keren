import { Link, useLocation } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';

export default function Navbar() {
  const location = useLocation();
  const { settings } = useSettings();

  const links = [
    { name: 'Beranda', path: '/' },
    { name: 'Panduan', path: '/panduan' },
    { name: 'Pendaftaran', path: '/daftar' },
    { name: 'Cek Penerimaan', path: '/cek-kelulusan' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 max-w-[70%] sm:max-w-full">
            {settings?.logoSekolah ? (
              <img src={settings.logoSekolah} alt="Logo Sekolah" className="h-9 sm:h-10 w-auto object-contain shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg text-white shrink-0">
                <GraduationCap size={20} className="sm:w-6 sm:h-6" />
              </div>
            )}
            <span className="font-bold text-sm sm:text-base md:text-lg lg:text-xl tracking-tight text-slate-900 truncate">
              {settings?.namaSekolah || 'SDN Citapen'}
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-blue-600 py-1",
                  location.pathname === link.path ? "text-blue-600 border-b-2 border-blue-600 font-semibold" : "text-slate-600"
                )}
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/daftar"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg"
            >
              Daftar Sekarang
            </Link>
          </div>

          {/* Mobile Quick Action Link */}
          <div className="md:hidden">
            <Link
              to="/daftar"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
            >
              Daftar
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Row of Links - Always visible, no hamburger required */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50/50 py-2.5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-2 px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-center",
                    isActive 
                      ? "text-blue-600 bg-blue-50/85 font-extrabold" 
                      : "text-slate-600 hover:text-slate-950"
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
