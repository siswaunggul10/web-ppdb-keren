/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Guide from './pages/Guide';
import RegistrationForm from './pages/RegistrationForm';
import AdminDashboard from './pages/AdminDashboard';
import CheckStatus from './pages/CheckStatus';
import AdminLogin from './pages/AdminLogin';
import MaintenancePage from './pages/MaintenancePage';
import RapatDetail from './pages/RapatDetail';
import { useSettings } from './context/SettingsContext';

function RouteHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home on initial load/reload if not on home or admin pages
    if (location.pathname !== '/' && !location.pathname.startsWith('/admin')) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this only runs once on app mount (reload)

  return null;
}

function AppContent() {
  const { settings } = useSettings();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAdminSession = sessionStorage.getItem('isAdmin') === 'true';

  if (settings?.isMaintenance && !isAdminPage && !isAdminSession) {
    return <MaintenancePage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/panduan" element={<Guide />} />
          <Route path="/daftar" element={<RegistrationForm />} />
          <Route path="/cek-kelulusan" element={<CheckStatus />} />
          <Route path="/rapat-orang-tua" element={<RapatDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const { isLoading } = useSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 font-sans">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Memuat pengaturan aplikasi...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <RouteHandler />
      <AppContent />
    </BrowserRouter>
  );
}

