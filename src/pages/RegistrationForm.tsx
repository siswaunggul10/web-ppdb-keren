import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  AlertCircle, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  MapPin, 
  User, 
  Users, 
  UserCheck, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  FileCheck,
  Building,
  Calendar,
  Check,
  ShieldAlert,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { submitRegistration, RegistrationData, getScheduledStatus } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import jsPDF from 'jspdf';
import MapPicker from '../components/MapPicker';
import { calculateDistance } from '../utils/distance';

const isFileUploaded = (url: any): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

export default function RegistrationForm() {
  const { settings } = useSettings();

  const getFormFieldKey = (field: any) => {
    if (!field) return '';
    const hasCollision = (settings?.formFields || []).some(other => other.id !== field.id && other.label === field.label && other.type !== 'file');
    if (field.type === 'file' && (hasCollision || field.label === 'NISN')) {
      return `${field.label} (Berkas)`;
    }
    return field.label;
  };
  
  const renderVerificationValue = (val: any, field?: any) => {
    const isNisn = field && (String(field.label || '').toUpperCase().includes('NISN') || String(field.id || '').toUpperCase().includes('NISN'));
    if (isNisn) {
      let nisnVal = val;
      if (val === undefined || val === null || val === '') {
        const key = getFormFieldKey(field);
        if (formData && formData[key] !== undefined) {
          nisnVal = formData[key];
        } else {
          const nisnKey = Object.keys(formData || {}).find(k => k.toUpperCase().includes('NISN'));
          if (nisnKey) {
            nisnVal = formData[nisnKey];
          }
        }
      }
      if (nisnVal === undefined || nisnVal === null || nisnVal === '') return '-';
      const stringVal = String(nisnVal).trim();
      
      if (field && field.type === 'file') {
        return isFileUploaded(stringVal) ? 'Berkas Terunggah' : '-';
      }
      
      const digitsOnly = stringVal.replace(/\D/g, '');
      return digitsOnly || '-';
    }

    if (val === undefined || val === null || val === '') return '-';
    
    if (field && field.type === 'file') {
      return 'Berkas Terunggah';
    }
    if (typeof val === 'string' && val.trim().startsWith('data:')) {
      return '-';
    }

    return String(val);
  };
  const scheduledStatus = getScheduledStatus(settings);
  const isAdminSession = sessionStorage.getItem('isAdmin') === 'true';
  const isClosed = scheduledStatus.status === 'Tutup' && !isAdminSession;

  const [deviceRegistered, setDeviceRegistered] = useState(() => {
    return localStorage.getItem('has_registered') === 'true' || document.cookie.includes('has_registered=true');
  });
  const [registeredNo, setRegisteredNo] = useState(() => {
    return localStorage.getItem('registered_no') || '';
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
   const [formData, setFormData] = useState<RegistrationData>(() => {
    if (localStorage.getItem('has_registered') === 'true' || document.cookie.includes('has_registered=true')) {
      return {};
    }
    try {
      const cached = localStorage.getItem('registration_form_data');
      return cached ? (JSON.parse(cached) || {}) : {};
    } catch (e) {
      return {};
    }
  });
  const [previews, setPreviews] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem('registration_form_previews');
      return cached ? (JSON.parse(cached) || {}) : {};
    } catch (e) {
      return {};
    }
  });
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number} | null>(() => {
    const cached = localStorage.getItem('registration_form_location');
    return cached ? JSON.parse(cached) : null;
  });
  const [distance, setDistance] = useState<number | null>(() => {
    const cached = localStorage.getItem('registration_form_distance');
    return cached ? JSON.parse(cached) : null;
  });

  // Drag & drop state for uploads
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  // Error validation states for inline inputs
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Save to localStorage when state changes
  React.useEffect(() => {
    try {
      localStorage.setItem('registration_form_data', JSON.stringify(formData));
    } catch (e) {
      console.warn('Could not save form data to localStorage, quota exceeded.');
    }
  }, [formData]);

  React.useEffect(() => {
    try {
      localStorage.setItem('registration_form_previews', JSON.stringify(previews));
    } catch (e) {
      console.warn('Could not save previews to localStorage, quota exceeded.');
    }
  }, [previews]);

  React.useEffect(() => {
    if (mapLocation) {
      localStorage.setItem('registration_form_location', JSON.stringify(mapLocation));
    } else {
      localStorage.removeItem('registration_form_location');
    }
  }, [mapLocation]);

  React.useEffect(() => {
    if (distance !== null) {
      localStorage.setItem('registration_form_distance', JSON.stringify(distance));
    } else {
      localStorage.removeItem('registration_form_distance');
    }
  }, [distance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    
    // Enforce numeric only for NISN
    if (name.toUpperCase().includes('NISN')) {
      value = value.replace(/\D/g, '');
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear validation error when typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const compressImage = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
      };
    });
  };

  const handleFileProcess = async (file: File, fieldId: string) => {
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Berkas Terlalu Besar',
        text: 'Ukuran maksimal berkas adalah 2MB',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    try {
      let base64String = '';
      if (file.type.startsWith('image/')) {
        base64String = await compressImage(file, 1024);
      } else {
        base64String = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      setFormData(prev => ({ ...prev, [fieldId]: base64String }));
      setPreviews(prev => ({ ...prev, [fieldId]: base64String }));

      if (validationErrors[fieldId]) {
        setValidationErrors(prev => {
          const copy = { ...prev };
          delete copy[fieldId];
          return copy;
        });
      }
    } catch (error) {
      console.error("Error processing file", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileProcess(file, fieldId);
  };

  const handleDrag = (e: React.DragEvent, fieldId: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldId]: active }));
  };

  const handleDrop = async (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fieldId]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFileProcess(file, fieldId);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setMapLocation({ lat, lng });
    setFormData(prev => ({ ...prev, 'Koordinat Lokasi': `${lat}, ${lng}` }));
    
    if (settings?.koordinatSekolah) {
      const [schoolLat, schoolLng] = settings.koordinatSekolah.split(',').map(s => parseFloat(s.trim()));
      if (!isNaN(schoolLat) && !isNaN(schoolLng)) {
        const dist = calculateDistance(lat, lng, schoolLat, schoolLng);
        setDistance(dist);
        setFormData(prev => ({ ...prev, 'Jarak ke Sekolah (km)': dist.toFixed(2) }));
      }
    }
  };

  const printProof = (noPendaftaran: string) => {
    const doc = new jsPDF();
    
    // Header banner
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BUKTI PENDAFTARAN SPMB", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.namaSekolah || "SDN Citapen", 105, 30, { align: "center" });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    const formatDate = (dateString: string) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Filters non-file fields and fields with base64 data to keep PDF neat
    const printableFields = getFieldsForSummary().filter(field => {
      if (field.type === 'file') return false;
      const val = formData[getFormFieldKey(field)];
      if (typeof val === 'string' && val.trim().startsWith('data:')) return false;
      return true;
    });

    const fieldsSiswa = printableFields.filter(f => getFieldSession(f) === 1);
    const fieldsOrangTua = printableFields.filter(f => getFieldSession(f) === 2);
    const fieldsWali = printableFields.filter(f => getFieldSession(f) === 3);

    // Draw Main Header sections
    doc.setFont("helvetica", "bold");
    doc.text("INFORMASI PENDAFTARAN", 15, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 57, 195, 57);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("No. Pendaftaran", 15, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${noPendaftaran}`, 50, 65);

    if (distance !== null) {
      doc.setFont("helvetica", "bold");
      doc.text("Jarak ke Sekolah", 110, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${distance.toFixed(2)} km`, 145, 65);
    }

    const drawSection = (title: string, sectionFields: any[], yStart: number) => {
      if (sectionFields.length === 0) return yStart;
      
      // Page break check (header and line needs at least 20mm)
      if (yStart > 250) {
        doc.addPage();
        yStart = 20;
      }

      // Draw section header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(title, 15, yStart);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yStart + 2, 195, yStart + 2);
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const half = Math.ceil(sectionFields.length / 2);
      const left = sectionFields.slice(0, half);
      const right = sectionFields.slice(half);
      
      let col1Y = yStart + 8;
      left.forEach(field => {
        if (col1Y > 275) {
          doc.addPage();
          col1Y = 20;
        }
        doc.setFont("helvetica", "bold");
        const labelText = field.label;
        const splitLabel = doc.splitTextToSize(labelText, 33);
        doc.text(splitLabel, 15, col1Y);
        
        doc.setFont("helvetica", "normal");
        let value = formData[getFormFieldKey(field)] || '-';
        if (field.type === 'date') {
          value = formatDate(value);
        }
        if (typeof value === 'string' && value.trim().startsWith('data:')) {
          value = 'Berkas Terunggah';
        }
        const splitVal = doc.splitTextToSize(String(value), 52);
        doc.text(splitVal, 50, col1Y);
        
        const maxRows = Math.max(splitLabel.length, splitVal.length);
        col1Y += maxRows * 5.5 + 2;
      });
      
      let col2Y = yStart + 8;
      right.forEach(field => {
        if (col2Y > 275) {
          // Keep alignment clean or draw on new page if it fits
        }
        doc.setFont("helvetica", "bold");
        const labelText = field.label;
        const splitLabel = doc.splitTextToSize(labelText, 33);
        doc.text(splitLabel, 110, col2Y);
        
        doc.setFont("helvetica", "normal");
        let value = formData[getFormFieldKey(field)] || '-';
        if (field.type === 'date') {
          value = formatDate(value);
        }
        if (typeof value === 'string' && value.trim().startsWith('data:')) {
          value = 'Berkas Terunggah';
        }
        const splitVal = doc.splitTextToSize(String(value), 52);
        doc.text(splitVal, 145, col2Y);
        
        const maxRows = Math.max(splitLabel.length, splitVal.length);
        col2Y += maxRows * 5.5 + 2;
      });
      
      return Math.max(col1Y, col2Y) + 5;
    };

    let currentY = 75;
    currentY = drawSection("DATA FORMULIR CALON SISWA", fieldsSiswa, currentY);
    currentY = drawSection("DATA ORANG TUA KANDUNG", fieldsOrangTua, currentY);
    currentY = drawSection("DATA WALI SISWA (OPSIONAL)", fieldsWali, currentY);

    // Dynamic placement of footer
    let bottomY = currentY + 5;
    if (bottomY > 240) {
      doc.addPage();
      bottomY = 20;
    } else {
      bottomY = Math.max(bottomY, 240);
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(15, bottomY, 195, bottomY);
    
    // Barcode area
    const barX = 15;
    const barY = bottomY + 5;
    const barHeight = 12;
    doc.setFillColor(0, 0, 0);
    const linePattern = [1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 2, 2, 1, 3];
    let currentXOffset = 0;
    for (let idx = 0; idx < linePattern.length; idx++) {
      const w = linePattern[idx] * 0.45;
      if (idx % 2 === 0) {
        doc.rect(barX + currentXOffset, barY, w, barHeight, 'F');
      }
      currentXOffset += w + 0.45;
    }
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.text(`*REG-${noPendaftaran}*`, barX, barY + barHeight + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Simpan bukti pendaftaran ini untuk mengecek status penerimaan secara berkala.", 72, bottomY + 10);
    doc.text(`Dicetak secara otomatis pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`, 72, bottomY + 16);
    
    doc.save(`Bukti_Pendaftaran_${noPendaftaran}.pdf`);
  };

  const getFieldSession = (field: any): number => {
    if (field.session !== undefined) {
      return Number(field.session);
    }
    if (field.type === 'file') {
      return 4;
    }
    const idLower = String(field.id || '').toLowerCase();
    const labelLower = String(field.label || '').toLowerCase();
    
    if (idLower.includes('wali') || labelLower.includes('wali')) {
      return 3;
    }
    if (
      idLower.includes('orang tua') || labelLower.includes('orang tua') ||
      idLower.includes('ortu') || labelLower.includes('ortu') ||
      idLower.includes('bapak') || labelLower.includes('bapak') ||
      idLower.includes('ibu') || labelLower.includes('ibu') ||
      idLower.includes('ayah') || labelLower.includes('ayah') ||
      idLower.includes('mama') || labelLower.includes('mama') ||
      idLower.includes('hp') || labelLower.includes('hp') ||
      idLower.includes('telepon') || labelLower.includes('telepon') ||
      idLower.includes('whatsapp') || labelLower.includes('whatsapp')
    ) {
      return 2;
    }
    return 1;
  };

  const getFieldsForStep = (stepNum: number) => {
    return (settings?.formFields || []).filter(field => getFieldSession(field) === stepNum);
  };

  const getFieldsForSummary = () => {
    return settings?.formFields || [];
  };

  const handleNextStep = () => {
    const currentFields = getFieldsForStep(currentStep);
    const errors: Record<string, string> = {};
    
    // Validate current step fields
    currentFields.forEach(f => {
      const key = getFormFieldKey(f);
      if (f.required && !formData[key]) {
        errors[f.label] = `${f.label} tidak boleh kosong`;
      }
    });

    if (currentStep === 1 && !mapLocation) {
      errors['MAP_LOCATION'] = 'Lokasi rumah harus ditandai di peta';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Swal.fire({
        icon: 'warning',
        title: 'Kolom Belum Lengkap',
        text: 'Silakan isi seluruh kolom wajib bertanda bintang (*) sebelum melanjutkan.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Standard advancement
    setValidationErrors({});
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep !== 5) {
      handleNextStep();
      return;
    }

    if (!isAgreed) {
      Swal.fire({
        icon: 'warning',
        title: 'Pernyataan Belum Disetujui',
        text: 'Anda harus menyetujui pernyataan kebenaran data dengan mencontang kotak persetujuan.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Final comprehensive validation
    const allFields = settings?.formFields || [];
    const missingFields = allFields.filter(f => f.required && !formData[getFormFieldKey(f)]);
    
    if (missingFields.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulir Belum Lengkap',
        text: `Mohon lengkapi seluruh dokumen dan data wajib: ${missingFields.map(f => f.label).join(', ')}`,
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitRegistration(formData);
      
      if (response.status === 'success') {
        // Trigger a beautiful, premium, comforting confetti celebration!
        try {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#2563eb', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6']
          });
          
          const duration = 2.5 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 99999 };

          const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
          };

          const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 45 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
          }, 200);
        } catch (confettiErr) {
          console.warn('Confetti effect failed', confettiErr);
        }

        Swal.fire({
          icon: 'success',
          title: 'Pendaftaran Berhasil!',
          html: `Nomor Pendaftaran Utama Anda:<br><b class="text-2xl font-extrabold text-blue-600 tracking-wide">${response.noPendaftaran}</b><br><br>Simpan nomor ini untuk mengecek hasil seleksi pengumuman penerimaan.`,
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Unduh Bukti Pendaftaran (PDF)',
          showCancelButton: true,
          cancelButtonText: 'Kembali',
          allowOutsideClick: false
        }).then((result) => {
          if (result.isConfirmed) {
            printProof(response.noPendaftaran);
          }
          // Enforce 1 device limit
          localStorage.setItem('has_registered', 'true');
          localStorage.setItem('registered_no', response.noPendaftaran);
          document.cookie = "has_registered=true; max-age=31536000; path=/";

          // Clear cache on success
          localStorage.removeItem('registration_form_data');
          localStorage.removeItem('registration_form_previews');
          localStorage.removeItem('registration_form_location');
          localStorage.removeItem('registration_form_distance');
          
          window.location.href = '/';
        });
      } else {
        throw new Error(response.message || 'Terjadi kesalahan sistem');
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Pengiriman Gagal',
        text: error.message || 'Gagal mengirim formulir pendaftaran. Silakan coba sesaat lagi.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (deviceRegistered) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center pt-24">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-center p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 to-yellow-400"></div>
          <div className="w-20 h-20 bg-amber-100/80 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <UserCheck size={38} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-display">Batas Pendaftaran Perangkat</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            Mohon maaf, perangkat Anda sudah terdaftar dalam sistem SPMB online ini. Kami membatasi satu kali pengisian data untuk menjaga keamanan kuota data dan meminimalkan duplikasi data calon siswa.
          </p>
          {registeredNo && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6 text-center shadow-xs">
              <span className="text-xs font-bold text-slate-500 block mb-1 tracking-wider uppercase">Nomor Pendaftaran Terdaftar:</span>
              <span className="text-xl font-extrabold text-blue-600 font-mono block select-all tracking-wide">{registeredNo}</span>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Link
              to="/cek-kelulusan"
              className="inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold transition-all text-sm shadow-md hover:shadow-lg"
            >
              Cek Status Penerimaan
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all text-sm"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center pt-24">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 text-center p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <AlertCircle size={38} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4 font-display">Pendaftaran Ditutup</h2>
          <p className="text-slate-600 mb-8 text-sm leading-relaxed font-medium">
            {scheduledStatus.info}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const renderField = (field: any) => {
    const isError = !!validationErrors[field.label];
    const commonClasses = `w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm flex items-center bg-slate-50/40 text-slate-800 ${
      isError 
        ? 'border-red-500 bg-red-50/30 focus:border-red-500 text-red-950' 
        : 'border-slate-300 focus:border-blue-500 hover:bg-slate-50/10'
    }`;
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.label}
            required={field.required}
            rows={3}
            value={formData[field.label] || ''}
            onChange={handleChange}
            className={`${commonClasses} resize-none`}
            placeholder={`Masukkan ${field.label}...`}
          />
        );
      case 'select':
        return (
          <select
            name={field.label}
            required={field.required}
            value={formData[field.label] || ''}
            onChange={handleChange}
            className={`${commonClasses} bg-white appearance-none cursor-pointer`}
          >
            <option value="">Pilih {field.label}</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        const dateVal = formData[field.label] || '';
        let currentYear = '';
        let currentMonth = '';
        let currentDay = '';
        if (dateVal) {
          const parts = dateVal.split('-');
          if (parts.length === 3) {
            currentYear = parts[0];
            currentMonth = parts[1];
            currentDay = parts[2];
          }
        }
        
        const handleDateChange = (type: 'day' | 'month' | 'year', val: string) => {
          let y = currentYear;
          let m = currentMonth;
          let d = currentDay;
          if (type === 'day') d = val.padStart(2, '0');
          if (type === 'month') m = val.padStart(2, '0');
          if (type === 'year') y = val;
          
          if (y || m || d) {
            const combined = `${y || '2019'}-${m || '01'}-${d || '01'}`;
            // Directly trigger change simulation
            const fakeEvent = {
              target: {
                name: field.label,
                value: combined
              }
            } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
            handleChange(fakeEvent);
          }
        };

        const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
        const years = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - 1 - i)); // e.g. for students/kids, starting from past years
        const monthsList = [
          { value: '01', label: 'Januari' },
          { value: '02', label: 'Februari' },
          { value: '03', label: 'Maret' },
          { value: '04', label: 'April' },
          { value: '05', label: 'Mei' },
          { value: '06', label: 'Juni' },
          { value: '07', label: 'Juli' },
          { value: '08', label: 'Agustus' },
          { value: '09', label: 'September' },
          { value: '10', label: 'Oktober' },
          { value: '11', label: 'November' },
          { value: '12', label: 'Desember' }
        ];

        return (
          <div className="space-y-2 w-full">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={currentDay}
                onChange={(e) => handleDateChange('day', e.target.value)}
                className={`${commonClasses} bg-white appearance-none cursor-pointer`}
                required={field.required}
              >
                <option value="">Hari</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={currentMonth}
                onChange={(e) => handleDateChange('month', e.target.value)}
                className={`${commonClasses} bg-white appearance-none cursor-pointer`}
                required={field.required}
              >
                <option value="">Bulan</option>
                {monthsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>

              <select
                value={currentYear}
                onChange={(e) => handleDateChange('year', e.target.value)}
                className={`${commonClasses} bg-white appearance-none cursor-pointer`}
                required={field.required}
              >
                <option value="">Tahun</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50/70 p-2 rounded-xl border border-amber-100">
              <span className="flex-shrink-0 text-xs">⚠️</span>
              <span><strong>PERHATIAN:</strong> Mohon teliti dalam memasukkan Tanggal Lahir (HARI/BULAN/TAHUN).</span>
            </div>
          </div>
        );
      case 'file':
        const fileKey = getFormFieldKey(field);
        const isDragging = dragActive[fileKey];
        return (
          <div 
            onDragOver={(e) => handleDrag(e, fileKey, true)}
            onDragLeave={(e) => handleDrag(e, fileKey, false)}
            onDrop={(e) => handleDrop(e, fileKey)}
            className={`relative flex-grow border-2 border-dashed rounded-2xl transition-all bg-slate-50/50 group overflow-hidden h-44 flex flex-col justify-center items-center ${
              isDragging 
                ? 'border-blue-600 bg-blue-50' 
                : isError 
                  ? 'border-red-400 bg-red-50/20' 
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              accept="image/jpeg, image/png, application/pdf"
              required={field.required && !formData[fileKey]}
              onChange={(e) => handleFileChange(e, fileKey)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {previews && previews[fileKey] ? (
              <div className="absolute inset-0 z-0">
                {(typeof previews[fileKey] === 'string' && previews[fileKey].startsWith('data:image')) ? (
                  <img src={previews[fileKey]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-blue-50/70">
                    <FileText className="w-12 h-12 text-blue-500 mb-2" />
                    <span className="text-sm text-blue-800 font-bold">File PDF Terpilih</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Upload className="w-8 h-8 text-white mb-1" />
                  <span className="text-white text-xs font-bold">Ganti Dokumen</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center select-none pointer-events-none">
                <div className={`p-3 rounded-full mb-2 ${isError ? 'bg-red-100 text-red-600' : 'bg-blue-100/80 text-blue-600 group-hover:scale-110 group-hover:bg-blue-200 transition-all'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-700">Tarik Berkas ke Sini</span>
                <span className="text-xs text-slate-400 mt-1">atau klik untuk menelusuri</span>
              </div>
            )}
          </div>
        );
      default:
        const isNisn = field.label.toUpperCase().includes('NISN');
        return (
          <input
            type={field.type}
            name={field.label}
            required={field.required}
            value={formData[field.label] || ''}
            onChange={handleChange}
            inputMode={isNisn ? 'numeric' : undefined}
            pattern={isNisn ? '[0-9]*' : undefined}
            className={commonClasses}
            placeholder={`Masukkan ${field.label}...`}
          />
        );
    }
  };

  const steps = [
    { id: 1, title: 'Data Calon Siswa', desc: 'Data Siswa', icon: User, tip: 'Pastikan nama sesuai akta kelahiran.' },
    { id: 2, title: 'Orang Tua Kandung', desc: 'Orang Tua', icon: Users, tip: 'Isikan nomor WhatsApp wali yang aktif.' },
    { id: 3, title: 'Nama Wali Siswa', desc: 'Wali (Opsional)', icon: UserCheck, tip: 'Dapat dilewati jika diasuh orang tua.' },
    { id: 4, title: 'Unggah Berkas', desc: 'Berkas Syarat', icon: Upload, tip: 'Format file JPG/PNG/PDF maks 2MB.' },
    { id: 5, title: 'Kirim Formulir', desc: 'Review & Kirim', icon: FileCheck, tip: 'Periksa kembali kesesuaian data Anda.' }
  ];

  const currentSettingsAppName = settings?.namaSekolah || 'SDN Citapen';

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 pt-28">
      <div className="max-w-6xl mx-auto">
        
        {isAdminSession && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
              <Info size={22} className="stroke-[2.5]" />
            </div>
            <div className="text-sm">
              <p className="font-extrabold text-blue-800">Mode Uji Coba Admin (Bypass Aktif)</p>
              <p className="text-blue-700 mt-1 leading-relaxed font-medium">Sistem menyala dalam bypass khusus karena Anda masuk sebagai Admin. Anda dapat dengan bebas mengisi data pendaftaran dan menguji fungsionalitas formulir tanpa terbuka untuk pendaftar umum.</p>
            </div>
          </div>
        )}

        {/* Banner header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 md:p-8 text-white shadow-lg border border-blue-600 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold tracking-widest uppercase mb-1">
              <Building size={14} />
              PENDAFTARAN ONLINE RESMI ({settings?.tahunPendaftaran || '2026'})
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              Pendaftaran SPMB {currentSettingsAppName}
            </h1>
            <p className="text-blue-100/80 text-sm mt-1 max-w-xl font-medium leading-relaxed">
              Sistem Pendaftaran Siswa Baru Terpusat. Silakan ikuti instruksi pengisian langkah demi langkah di bawah untuk mendaftarkan Calon Peserta Didik Baru dengan aman.
            </p>
          </div>
          <div className="flex md:flex-col items-start md:items-end gap-1.5 p-4 bg-white/10 rounded-2xl border border-white/10 shrink-0">
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest block">Progres Pengisian:</span>
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {Math.min(Math.round(((currentStep - 1) / (steps.length - 1)) * 100), 100)}% Selesai
            </span>
          </div>
        </div>

        {/* Stepper Grid Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Step-by-Step Stepper Indicators for UI on Desktop */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-extrabold text-slate-400 tracking-wider uppercase block">Alur Pengisian Berkas:</h3>
            
            <div className="flex flex-col gap-6 relative">
              {/* Connector border on left */}
              <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-slate-100 z-0" />
              
              {steps.map((step) => {
                const IconComponent = step.icon;
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isCompleted || step.id < currentStep) {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={step.id > currentStep}
                    className={`flex items-start text-left gap-4 relative z-10 group transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold tracking-tight transition-all duration-300 shrink-0 ${
                      isCompleted 
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                        : isActive 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-600/20 scale-105' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {isCompleted ? <Check size={20} className="stroke-3" /> : <IconComponent size={20} />}
                    </div>
                    <div className="space-y-0.5 pt-0.5">
                      <span className={`text-xs font-bold leading-none uppercase tracking-wider block ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        Langkah {step.id}
                      </span>
                      <h4 className={`text-sm font-extrabold transition-colors duration-300 ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal max-w-[200px]">
                        {isActive ? step.tip : isCompleted ? 'Langkah selesai dilakukan.' : 'Menunggu pengerjaan.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-6 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 leading-normal font-medium">
                Data input draf formulir Anda disimpan secara aman di cache perangkat ini demi kenyamanan pengisian tanpa khawatir terputus.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL: Form body card */}
          <div className="lg:col-span-8">
            <motion.div
              layoutId="formCard"
              className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                
                <AnimatePresence mode="wait">
                  {/* Step 1: Data Calon Siswa */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="space-y-6"
                    >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl">
                        <User size={22} className="stroke-2" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-none">Biodata Calon Siswa Baru</h2>
                        <span className="text-xs text-slate-400 block mt-1 font-semibold uppercase">Langkah 1 dari 5</span>
                      </div>
                    </div>
                    
                    {getFieldsForStep(1).length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Tidak ada kolom data calon siswa diatur sekolah.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {getFieldsForStep(1).map(field => {
                          const hasError = !!validationErrors[field.label];
                          return (
                            <div key={field.id} className={field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span>{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</span>
                                {hasError && <span className="text-[10px] text-red-500 lowercase font-medium flex items-center gap-1"><AlertCircle size={10} />{validationErrors[field.label]}</span>}
                              </label>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Geolocation Map Picker */}
                    <div className="border-t border-slate-100 pt-6 mt-6">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        Penandaan Peta Jarak Rumah (Zonasi) *
                      </label>
                      <p className="text-xs text-slate-400 mb-4 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100/60 leading-relaxed font-medium">
                        Info: Klik pada lokasi peta rumah Anda untuk memosisikan titik koordinat lokasi pendaftar. Sistem kami akan memperkirakan jarak tempuh ke bangunan sekolah secara otomatis menggunakan geokalkulasi.
                      </p>
                      
                      <div className="rounded-2xl overflow-hidden border border-slate-200">
                        <MapPicker onLocationSelect={handleLocationSelect} initialLocation={mapLocation || undefined} />
                      </div>
                      
                      {distance !== null ? (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Estimasi Jarak dari Rumah ke Sekolah:
                          </div>
                          <span className="font-extrabold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full text-sm tracking-tight">{distance.toFixed(2)} km</span>
                        </div>
                      ) : (
                        validationErrors['MAP_LOCATION'] && (
                          <div className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            {validationErrors['MAP_LOCATION']}
                          </div>
                        )
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Data Orang Tua Kandung */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl">
                        <Users size={22} className="stroke-2" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-none">Data Orang Tua Kandung / Penanggung Jawab</h2>
                        <span className="text-xs text-slate-400 block mt-1 font-semibold uppercase">Langkah 2 dari 5</span>
                      </div>
                    </div>

                    {getFieldsForStep(2).length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-2xl text-center border">
                        <p className="text-sm text-slate-500 italic">Sesi ini tidak memiliki kolom khusus. Anda dapat langsung melanjutkan ke langkah berikutnya.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {getFieldsForStep(2).map(field => {
                          const hasError = !!validationErrors[field.label];
                          return (
                            <div key={field.id} className={field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span>{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</span>
                                {hasError && <span className="text-[10px] text-red-500 lowercase font-medium flex items-center gap-1"><AlertCircle size={10} />{validationErrors[field.label]}</span>}
                              </label>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Wali Siswa (Opsional) */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl">
                        <UserCheck size={22} className="stroke-2" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-none">Data Wali Siswa (Bila Ada)</h2>
                        <span className="text-xs text-slate-400 block mt-1 font-semibold uppercase">Langkah 3 dari 5 - Opsional</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs text-slate-500 leading-relaxed font-semibold">
                      Harap Diperhatikan: Langkah ini bersifat alternatif atau opsional. Pengisian bagian ini dapat dilewati (klik selanjutnya) jika calon peserta didik diasuh dan tinggal penuh bersama Orang Tua kandung resmi.
                    </div>

                    {getFieldsForStep(3).length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-2xl text-center border">
                        <p className="text-sm text-slate-500 italic">Sesi ini tidak memiliki kolom khusus. Anda dapat langsung melanjutkan ke langkah berikutnya.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {getFieldsForStep(3).map(field => {
                          const hasError = !!validationErrors[field.label];
                          return (
                            <div key={field.id} className={field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span>{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</span>
                                {hasError && <span className="text-[10px] text-red-500 lowercase font-medium flex items-center gap-1"><AlertCircle size={10} />{validationErrors[field.label]}</span>}
                              </label>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Unggah Dokumen Syarat */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl">
                        <Upload size={22} className="stroke-2" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-none">Dokumen Pendukung Kelengkapan</h2>
                        <span className="text-xs text-slate-400 block mt-1 font-semibold uppercase">Langkah 4 dari 5</span>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 leading-relaxed font-semibold flex gap-2.5">
                      <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        Format Berkas yang diterima secara resmi adalah berkas foto Gambar (JPG / PNG) atau dokumen cetak digital PDF. Batas maksimal ukuran untuk masing-masing berkas unggahan adalah 2 megabytes (2MB).
                      </div>
                    </div>

                    {getFieldsForStep(4).length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-2xl text-center border">
                        <p className="text-sm text-slate-500 italic">Sekolah tidak mengaktifkan kolom wajib unggah dokumen. Silakan lanjut ke bagian review data.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getFieldsForStep(4).map(field => {
                          const hasError = !!validationErrors[field.label];
                          return (
                            <div key={field.id} className="flex flex-col">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                <span>{field.label} {field.required && <span className="text-red-500 font-black">*</span>}</span>
                                {hasError && <span className="text-[10px] text-red-500 lowercase font-medium flex items-center gap-1.5"><AlertCircle size={10} />wajib</span>}
                              </label>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 5: REVIEW / PRATINJAU DATA PENDAFTAR (Awesome Premium UX Addition) */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl">
                        <FileCheck size={22} className="stroke-2" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 leading-none">Pratinjau Kelayakan & Verifikasi Data</h2>
                        <span className="text-xs text-slate-400 block mt-1 font-semibold uppercase">Langkah 5 dari 5 - Langkah Akhir</span>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-slate-600 leading-relaxed font-semibold flex gap-2.5 shadow-xs">
                      <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        Harap tinjau kembali ringkasan formulir pendaftaran Anda. Pastikan nama lengkap, identitas orang tua, dan lokasi rumah Anda di peta telah diisi dengan akurat sebelum mengirim data ke sistem database pusat sekolah.
                      </div>
                    </div>

                    {/* Bento grid style detailed tables */}
                    <div className="space-y-4">
                      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b pb-2">
                          <User size={14} />
                          Informasi Calon Murid
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-6 text-sm">
                          {(() => {
                            const siswaFields = getFieldsForSummary().filter(f => getFieldSession(f) === 1 && f.type !== 'file');
                            const hasNisn = siswaFields.some(f => String(f.label || '').toUpperCase().includes('NISN'));
                            if (!hasNisn) {
                              const otherNisnField = getFieldsForSummary().find(f => String(f.label || '').toUpperCase().includes('NISN'));
                              if (otherNisnField) {
                                return [...siswaFields, otherNisnField];
                              }
                            }
                            return siswaFields;
                          })().map(field => (
                            <div key={field.id} className="flex flex-col">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{field.label}</span>
                              <span className="text-slate-800 font-semibold mt-0.5">{renderVerificationValue(formData[getFormFieldKey(field)], field)}</span>
                            </div>
                          ))}
                          {distance !== null && (
                            <div className="flex flex-col">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Jarak Zonasi ke Sekolah</span>
                              <span className="text-emerald-700 font-extrabold mt-0.5">{distance.toFixed(2)} kilometer</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b pb-2">
                          <Users size={14} />
                          Orang Tua & Wali
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-6 text-sm">
                          {getFieldsForSummary().filter(f => (getFieldSession(f) === 2 || getFieldSession(f) === 3) && f.type !== 'file').map(field => (
                            <div key={field.id} className="flex flex-col">
                              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{field.label}</span>
                              <span className="text-slate-800 font-semibold mt-0.5">{renderVerificationValue(formData[getFormFieldKey(field)], field)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* File uploads summary thumbnails */}
                      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
                        <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b pb-2">
                          <Upload size={14} />
                          Berkas Unggahan Terverifikasi
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {getFieldsForSummary().filter(f => f.type === 'file').map(field => {
                            const key = getFormFieldKey(field);
                            const uploaded = formData ? !!formData[key] : false;
                            const preview = previews ? previews[key] : undefined;
                            return (
                              <div key={field.id} className="bg-white p-3 rounded-xl border flex flex-col justify-between items-center text-center h-28 relative overflow-hidden shadow-xs">
                                <span className="text-[10px] font-bold text-slate-500 block leading-tight mb-2 truncate max-w-full">{field.label}</span>
                                {uploaded && preview ? (
                                  (typeof preview === 'string' && preview.startsWith('data:image')) ? (
                                    <img src={preview} alt="Thumb" className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-100" />
                                  ) : (
                                    <FileText className="w-8 h-8 text-blue-500" />
                                  )
                                ) : (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Belum Ada</span>
                                )}
                                <span className="text-[10px] font-black text-emerald-600 mt-2 flex items-center gap-0.5 leading-none">
                                  {uploaded ? <CheckCircle size={10} className="inline" /> : null}
                                  {uploaded ? 'siap kirim' : 'kosong'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Agreement Checkbox built nicely */}
                    <div className="bg-gradient-to-r from-red-50/60 to-amber-50/50 p-6 rounded-3xl border border-amber-200 mt-6 shadow-2xs">
                      <label className="flex items-start gap-3.5 cursor-pointer select-none">
                        <div className="flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                            className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                          <span className="font-extrabold text-slate-800 text-sm block mb-1">Pakta Integritas Pendaftaran SPMB</span>
                          Saya menjamin dengan penuh kesadaran dan tanpa paksaan bahwa seluruh keseluruhan data dokumen berkas isian digital yang tercantum dalam pendaftaran SPMB online ini adalah sah, akurat, dan sesuai kebenaran aslinya. Apabila ditemukan pemalsuan identitas atau data ganda, saya bersedia dicoret dan didiskualifikasi dari daftar seleksi resmi penerimaan sekolah baru ini.
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>

                {/* Navigation and step triggers */}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center gap-4">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-5 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                      Kembali ke Langkah {currentStep - 1}
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-md hover:scale-[1.02] hover:shadow-lg transition-all cursor-pointer"
                    >
                      Lanjut Langkah {currentStep + 1}
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:scale-[1.02] hover:shadow-lg disabled:opacity-70 flex items-center justify-center transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={18} />
                          Mengirim Berkas...
                        </>
                      ) : (
                        <>
                          Kirim Formulir Pendaftaran
                          <CheckCircle className="ml-2 shrink-0" size={18} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
