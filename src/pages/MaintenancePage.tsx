import React, { useState } from 'react';
import { Mail, Globe, MapPin, Phone, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const underConstructionImg = new URL('../assets/images/maintenance_illustration_1781146802440.png', import.meta.url).href;

export default function MaintenancePage() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  // Secret admin login handler: requires 3 quick clicks to activate and show login
  const handleSecretClick = () => {
    const nextClickCount = clickCount + 1;
    
    if (nextClickCount >= 3) {
      setClickCount(0);
      navigate('/admin/login');
    } else {
      setClickCount(nextClickCount);
      // Reset clicks after 2 seconds
      const timer = setTimeout(() => {
        setClickCount(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  };

  return (
    <div className="min-h-screen bg-[#DBF0FC] text-[#2C3E50] flex flex-col justify-between font-sans antialiased relative">
      
      {/* Spacer or very thin elegant top strip */}
      <div></div>

      {/* Main Content Area matches the uploaded mockup perfectly */}
      <div className="max-w-4xl mx-auto px-6 py-8 flex-grow flex flex-col justify-center items-center text-center">
        
        {/* Central Illustration - Developer on Browser mockup */}
        <div className="w-full max-w-lg mx-auto mb-8 flex justify-center items-center">
          <img 
            src={underConstructionImg} 
            alt="Sistem Maintenance" 
            className="w-full h-auto object-contain max-h-[340px] select-none transition-transform duration-700 hover:scale-[1.01]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* SITE UNDER MAINTENANCE Custom Title */}
        <h1 className="text-2xl md:text-3.5xl font-extrabold tracking-[0.16em] text-[#255C8F] uppercase mb-4 leading-tight">
          {settings?.maintenanceTitle || "SITE UNDER MAINTENANCE"}
        </h1>

        {/* Sincerely Apologize Custom Subtitle/Message */}
        <p className="max-w-xl mx-auto text-sm md:text-base text-slate-500/90 leading-relaxed font-medium mb-8">
          {settings?.maintenanceMessage || "We sincerely apologize for the inconvenience. Our site is currently undergoing scheduled maintenance and upgrades, but will return shortly. Thank you for your patience"}
        </p>

        {/* Minimalist interactive refresh button to check status */}
        <div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-[#255C8F] hover:bg-[#1C4770] text-white font-bold px-6 py-2.5 rounded-full text-xs tracking-wider transition-all shadow-md active:scale-95 uppercase"
          >
            <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '4s' }} /> Muat Ulang
          </button>
        </div>

        {/* Quick Minimalist Contact Info */}
        <div className="mt-10 flex justify-center items-center gap-4">
          <a 
            href={`mailto:${settings?.email || 'info@sdncitapen.sch.id'}`}
            className="w-8 h-8 rounded-full border border-slate-300/60 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-600 bg-white/50 shadow-sm transition-all"
            title="Hubungi Email"
          >
            <Mail size={14} />
          </a>
          <a 
            href={settings?.alamat ? `https://maps.google.com/?q=${encodeURIComponent(settings.alamat)}` : '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full border border-slate-300/60 flex items-center justify-center text-slate-500 hover:text-red-500 hover:border-red-500 bg-white/50 shadow-sm transition-all"
            title="Peta Lokasi"
          >
            <MapPin size={14} />
          </a>
          <a 
            href={`tel:${settings?.telepon || '0265331422'}`} 
            className="w-8 h-8 rounded-full border border-slate-300/60 flex items-center justify-center text-slate-500 hover:text-green-600 hover:border-green-600 bg-white/50 shadow-sm transition-all"
            title="Hubungi Sekolah"
          >
            <Phone size={14} />
          </a>
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); window.location.reload(); }}
            className="w-8 h-8 rounded-full border border-slate-300/60 flex items-center justify-center text-slate-500 hover:text-blue-500 hover:border-blue-500 bg-white/50 shadow-sm transition-all"
            title="Website Resmi"
          >
            <Globe size={14} />
          </a>
        </div>

      </div>

      {/* Footer Area with completely hidden admin login trigger */}
      <footer className="py-6 text-center text-xs text-slate-400/80 relative z-10 w-full select-none">
        <div className="max-w-2xl mx-auto px-6">
          <p>
            {/* The copyright sign '©' acts as the hidden button to enter administrative panel */}
            <span 
              onClick={handleSecretClick} 
              className="cursor-pointer select-none text-slate-400 hover:text-slate-600 font-bold transition-all"
              style={{ paddingRight: '2px' }}
            >
              ©
            </span>{" "}
            {new Date().getFullYear()} {settings?.namaSekolah || 'SDN Citapen'}. Hak Cipta Dilindungi Tim Panitia SPMB.
          </p>
        </div>
      </footer>

    </div>
  );
}
