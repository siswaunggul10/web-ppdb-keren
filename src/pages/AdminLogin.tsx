import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { loginAdmin } from '../services/api';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await loginAdmin(username, password);
      if (response.status === 'success') {
        sessionStorage.setItem('isAdmin', 'true');
        navigate('/admin');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: response.message || 'Username atau password salah',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan saat menghubungi server',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Kembali ke Beranda
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-8 text-white text-center">
            <div className="mx-auto w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-blue-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Login Admin</h2>
            <p className="text-slate-300 text-sm">Masuk untuk mengelola data pendaftaran SPMB.</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Masukkan password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
