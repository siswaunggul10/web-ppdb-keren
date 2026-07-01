import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Download, Printer, CheckCircle, XCircle, Clock, FileText, Moon, Sun, Loader2, LogOut, Eye, EyeOff, X, Settings, LayoutDashboard, RefreshCw, ArrowUp, ArrowDown, Trash } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRegistrations, updateStatus, AdminData, updateSettings, getSettings, deleteRegistration } from '../services/api';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { calculateDistance } from '../utils/distance';

const compressImage = (
  file: File,
  maxWidth = 800,
  quality = 0.55,
  forceFormat?: 'image/jpeg' | 'image/png',
  maxBase64Length = 49000
): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let currentWidth = img.width;
        let currentHeight = img.height;

        // Initial dimension calculation
        if (currentWidth > maxWidth) {
          currentHeight = Math.round((currentHeight * maxWidth) / currentWidth);
          currentWidth = maxWidth;
        }

        const type = forceFormat || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        let currentQuality = quality;
        let dataUrl = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const canvas = document.createElement('canvas');
          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            if (type === 'image/jpeg') {
              // Fill with white to avoid black background on transparent images converted to JPEG
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, currentWidth, currentHeight);
            }
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
          }

          dataUrl = canvas.toDataURL(type, type === 'image/png' ? undefined : currentQuality);

          // If it fits within the safe Google Sheets/Firestore character limits, we can resolve
          if (dataUrl.length <= maxBase64Length) {
            break;
          }

          // Otherwise, downscale width and lower quality progressively
          attempts++;
          currentWidth = Math.round(currentWidth * 0.85);
          currentHeight = Math.round(currentHeight * 0.85);
          if (type === 'image/jpeg') {
            currentQuality = Math.max(0.1, currentQuality - 0.1);
          }
        }

        resolve(dataUrl);
      };
    };
  });
};

const formatDate = (dateString: any) => {
  if (!dateString) return '-';
  if (typeof dateString !== 'string') {
    try {
      return JSON.stringify(dateString);
    } catch (e) {
      return String(dateString);
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const calculateAge = (dateString: any, cutoffDateString?: any) => {
  if (!dateString) return '-';
  const strVal = typeof dateString === 'string' ? dateString : String(dateString);
  const birthDate = new Date(strVal);
  if (isNaN(birthDate.getTime())) return '-';
  
  let today = new Date();
  if (cutoffDateString) {
    const cutStrVal = typeof cutoffDateString === 'string' ? cutoffDateString : String(cutoffDateString);
    const cutoff = new Date(cutStrVal);
    if (!isNaN(cutoff.getTime())) {
      today = cutoff;
    }
  }
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} Tahun ${months} Bulan ${days} Hari`;
};

const renderValue = (val: any) => {
  if (val === undefined || val === null) return '-';
  if (typeof val === 'string' && val.trim().startsWith('data:')) {
    return 'Berkas Terunggah';
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }
  if (typeof val === 'boolean') {
    return val ? 'Ya' : 'Tidak';
  }
  return String(val);
};

const isFileUploaded = (url: any): boolean => {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

const formatJakartaTimestamp = (timestampString: any) => {
  if (!timestampString) return '-';
  try {
    const date = new Date(timestampString);
    if (isNaN(date.getTime())) return String(timestampString);
    
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const partMap: any = {};
    parts.forEach(p => {
      partMap[p.type] = p.value;
    });
    
    return `${partMap.day}/${partMap.month}/${partMap.year} ${partMap.hour}:${partMap.minute}:${partMap.second} WIB`;
  } catch (e) {
    return String(timestampString);
  }
};

const enrichFields = (fields: any[]): any[] => {
  return (fields || []).map((field, idx) => {
    let session = field.session;
    
    if (session === undefined || session === null) {
      if (field.type === 'file') {
        session = 4;
      } else {
        const idLower = String(field.id || '').toLowerCase();
        const labelLower = String(field.label || '').toLowerCase();
        if (idLower.includes('wali') || labelLower.includes('wali')) {
          session = 3;
        } else if (
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
          session = 2;
        } else {
          session = 1;
        }
      }
    }
    return {
      ...field,
      session: Number(session) as 1 | 2 | 3 | 4,
      _tempKey: field._tempKey || `stable_key_${idx}_${Math.random().toString(36).substr(2, 9)}`,
      _rawOptions: field._rawOptions !== undefined ? field._rawOptions : (field.options?.join(', ') || '')
    };
  });
};

export default function AdminDashboard() {
  const { settings, refreshSettings } = useSettings();
  const [data, setData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'school' | 'form' | 'surat' | 'daftar-ulang' | 'kepala-sekolah' | 'panduan'>('school');
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const getSafeDistance = (student: any) => {
    if (!student) return '-';
    let distVal = student['Jarak ke Sekolah (km)'];
    const isCorrupt = !distVal || 
                      String(distVal).includes('T') || 
                      String(distVal).includes('-') || 
                      isNaN(Number(distVal));
                      
    if (isCorrupt && student['Koordinat Lokasi'] && settings?.koordinatSekolah) {
      try {
        const [lat1, lon1] = student['Koordinat Lokasi'].split(',').map((s: string) => parseFloat(s.trim()));
        const [lat2, lon2] = settings.koordinatSekolah.split(',').map((s: string) => parseFloat(s.trim()));
        if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
          const calculated = calculateDistance(lat1, lon1, lat2, lon2);
          return calculated.toFixed(2);
        }
      } catch (e) {
        console.error("Failed to dynamically heal distance:", e);
      }
    }
    return distVal || '-';
  };

  const [showTrendChart, setShowTrendChart] = useState<boolean>(() => {
    return localStorage.getItem('show_trend_chart') !== 'false';
  });

  const toggleTrendChart = () => {
    const newValue = !showTrendChart;
    setShowTrendChart(newValue);
    localStorage.setItem('show_trend_chart', String(newValue));
  };

  // Settings State
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>(() => {
    if (settings) {
      return {
        ...settings,
        formFields: enrichFields(settings.formFields)
      };
    }
    return null;
  });

  const chartData = useMemo(() => {
    const dailyCounts: { [isoDate: string]: number } = {};
    
    data.forEach(item => {
      if (!item.Timestamp) return;
      try {
        const date = new Date(item.Timestamp);
        if (isNaN(date.getTime())) return;
        
        // Formatter in Asia/Jakarta timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const day = parts.find(p => p.type === 'day')?.value || '';
        const isoDate = `${year}-${month}-${day}`;
        
        dailyCounts[isoDate] = (dailyCounts[isoDate] || 0) + 1;
      } catch (e) {
        console.error("Error formatting date for chart:", e);
      }
    });

    // Sort ISO dates
    const sortedIsoDates = Object.keys(dailyCounts).sort();

    // Map to formatted readable dates
    return sortedIsoDates.map(isoStr => {
      const parts = isoStr.split('-');
      let displayLabel = isoStr;
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const dayVal = parseInt(parts[2], 10);
        const monVal = parseInt(parts[1], 10) - 1;
        displayLabel = `${dayVal} ${months[monVal]}`;
      }
      return {
        tanggal: displayLabel,
        'Pendaftar': dailyCounts[isoStr]
      };
    });
  }, [data]);

  const getFieldValue = (item: any, fieldId: string) => {
    if (!item) return '';
    const field = settings?.formFields?.find(f => f.id === fieldId);
    
    let val = undefined;
    if (field) {
      const hasCollision = settings?.formFields?.some(other => other.id !== field.id && other.label === field.label && other.type !== 'file');
      if (field.type === 'file' && (hasCollision || field.label === 'NISN')) {
        const berkasKey = `${field.label} (Berkas)`;
        if (item[berkasKey] !== undefined) {
          val = item[berkasKey];
        }
      }
    }
    
    if (val === undefined) {
      val = (field && item[field.label] !== undefined) ? item[field.label] : item[fieldId];
    }
    
    // Cleanup NISN value to show only numbers only if it is not a file field
    const isNisn = String(fieldId).toUpperCase().includes('NISN') || (field && String(field.label || '').toUpperCase().includes('NISN'));
    if (isNisn) {
      if (field && field.type === 'file') {
        if (val !== undefined && val !== null && !isFileUploaded(val)) {
          const berkasKey = `${field.label} (Berkas)`;
          if (item[berkasKey] && isFileUploaded(item[berkasKey])) {
            val = item[berkasKey];
          } else {
            const foundKey = Object.keys(item || {}).find(k => k.toUpperCase().includes('NISN') && k.toUpperCase().includes('BERKAS'));
            if (foundKey && isFileUploaded(item[foundKey])) {
              val = item[foundKey];
            } else {
              val = '';
            }
          }
        }
      } else {
        if (val === undefined || val === null || val === '') {
          const nisnKey = Object.keys(item || {}).find(k => k.toUpperCase().includes('NISN') && !k.toUpperCase().includes('BERKAS'));
          if (nisnKey) {
            val = item[nisnKey];
          }
        }
        if (val !== undefined && val !== null) {
          const stringVal = String(val).trim();
          if (stringVal.startsWith('data:') || stringVal.startsWith('http') || stringVal.includes('/') || stringVal.includes(':') || stringVal.includes('\\')) {
            return ''; // empty Google Drive links, file paths or base64 data
          }
          return stringVal.replace(/\D/g, ''); // leave only digits
        }
      }
    }
    
    return val;
  };

  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings({
        ...settings,
        formFields: enrichFields(settings.formFields)
      });
    }
  }, [settings, localSettings]);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getRegistrations();
      setData(result);
    } catch (error) {
      Swal.fire('Error', 'Gagal mengambil data dari server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar?',
      text: "Anda akan keluar dari sesi admin.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        sessionStorage.removeItem('isAdmin');
        navigate('/admin/login');
      }
    });
  };

  const moveField = (fieldTempKey: string, sessionId: number, direction: 'up' | 'down') => {
    if (!localSettings?.formFields) return;
    const fields = [...localSettings.formFields];
    
    // Get all step fields for this step exactly as they are filtered in the UI
    const stepFields = fields.filter(f => {
      if (f.session !== undefined) {
        return Number(f.session) === sessionId;
      }
      if (f.type === 'file') {
        return sessionId === 4;
      }
      const idLower = String(f.id || '').toLowerCase();
      const labelLower = String(f.label || '').toLowerCase();
      if (idLower.includes('wali') || labelLower.includes('wali')) {
        return sessionId === 3;
      }
      if (
        idLower.includes('orang tua') || labelLower.includes('orang tua') ||
        idLower.includes('ortu') || labelLower.includes('ortu') ||
        idLower.includes('bapak') || labelLower.includes('bapak') ||
        idLower.includes('ibu') || labelLower.includes('ibu') ||
        idLower.includes('hp') || labelLower.includes('hp') ||
        idLower.includes('telepon') || labelLower.includes('telepon') ||
        idLower.includes('whatsapp') || labelLower.includes('whatsapp')
      ) {
        return sessionId === 2;
      }
      return sessionId === 1;
    });

    const indexInSession = stepFields.findIndex(f => {
      const fKey = f._tempKey || f.id || f.label;
      return fKey === fieldTempKey;
    });
    if (indexInSession === -1) return;

    if (direction === 'up') {
      if (indexInSession === 0) return; // Already first
      const currentField = stepFields[indexInSession];
      const targetField = stepFields[indexInSession - 1];
      
      const currentIndexInMain = fields.findIndex(f => {
        const fKey = f._tempKey || f.id || f.label;
        const curKey = currentField._tempKey || currentField.id || currentField.label;
        return fKey === curKey;
      });
      const targetIndexInMain = fields.findIndex(f => {
        const fKey = f._tempKey || f.id || f.label;
        const tarKey = targetField._tempKey || targetField.id || targetField.label;
        return fKey === tarKey;
      });
      
      if (currentIndexInMain !== -1 && targetIndexInMain !== -1) {
        // Swap
        fields[currentIndexInMain] = targetField;
        fields[targetIndexInMain] = currentField;
      }
    } else {
      if (indexInSession === stepFields.length - 1) return; // Already last
      const currentField = stepFields[indexInSession];
      const targetField = stepFields[indexInSession + 1];
      
      const currentIndexInMain = fields.findIndex(f => {
        const fKey = f._tempKey || f.id || f.label;
        const curKey = currentField._tempKey || currentField.id || currentField.label;
        return fKey === curKey;
      });
      const targetIndexInMain = fields.findIndex(f => {
        const fKey = f._tempKey || f.id || f.label;
        const tarKey = targetField._tempKey || targetField.id || targetField.label;
        return fKey === tarKey;
      });
      
      if (currentIndexInMain !== -1 && targetIndexInMain !== -1) {
        // Swap
        fields[currentIndexInMain] = targetField;
        fields[targetIndexInMain] = currentField;
      }
    }

    setLocalSettings({ ...localSettings, formFields: fields });
  };

  const handleUpdateStatus = async (noPendaftaran: string, newStatus: string) => {
    try {
      let alasan = undefined;
      
      if (newStatus === 'Tidak Lulus') {
        const { value: text, isConfirmed } = await Swal.fire({
          title: 'Alasan Tidak Lulus',
          input: 'textarea',
          inputLabel: 'Berikan alasan mengapa pendaftar tidak lulus',
          inputPlaceholder: 'Contoh: Usia belum mencukupi...',
          showCancelButton: true,
          confirmButtonText: 'Simpan',
          cancelButtonText: 'Batal',
          inputValidator: (value) => {
            if (!value) {
              return 'Alasan harus diisi!';
            }
          }
        });
        
        if (!isConfirmed) return;
        alasan = text;
      }

      Swal.fire({
        title: 'Memproses...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await updateStatus(noPendaftaran, newStatus, alasan);
      
      setData(prev => prev.map(item => 
        item['No Pendaftaran'] === noPendaftaran ? { ...item, Status: newStatus as any, 'Alasan Penolakan': alasan } : item
      ));

      if (selectedStudent && selectedStudent['No Pendaftaran'] === noPendaftaran) {
        setSelectedStudent(prev => prev ? { ...prev, Status: newStatus as any, 'Alasan Penolakan': alasan } : null);
      }

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Status berhasil diubah menjadi ${newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'Gagal mengupdate status', 'error');
    }
  };

  const handleDeleteRegistration = async (noPendaftaran: string, name: string) => {
    Swal.fire({
      title: 'Hapus Data Siswa?',
      text: `Apakah Anda yakin ingin menghapus data pendaftaran untuk ${name} (${noPendaftaran})? Tindakan ini tidak dapat dibatalkan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Menghapus...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        
        try {
          await deleteRegistration(noPendaftaran);
          
          setData(prev => prev.filter(item => item['No Pendaftaran'] !== noPendaftaran));
          
          if (selectedStudent && selectedStudent['No Pendaftaran'] === noPendaftaran) {
            setSelectedStudent(null);
          }
          
          Swal.fire({
            icon: 'success',
            title: 'Terhapus',
            text: 'Data pendaftaran siswa berhasil dihapus.',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error) {
          Swal.fire('Error', 'Gagal menghapus data siswa', 'error');
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    setIsSavingSettings(true);
    try {
      // Clean up empty options in select fields and strip underscore properties before saving
      const cleanedFormFields = (localSettings.formFields || []).map(field => {
        const { _tempKey, _rawOptions, ...rest } = field;
        if (rest.type === 'select' && rest.options) {
          return {
            ...rest,
            options: rest.options.map(o => o.trim()).filter(Boolean)
          };
        }
        return rest;
      });

      const settingsToSave = {
        ...localSettings,
        formFields: cleanedFormFields
      };

      await updateSettings(settingsToSave);
      setLocalSettings({ ...localSettings });
      await refreshSettings(settingsToSave);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Pengaturan berhasil disimpan',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const exportToExcel = () => {
    const exportData = data.map(item => {
      const formattedItem: any = {};
      
      // 1. Core fields first
      formattedItem['No Pendaftaran'] = item['No Pendaftaran'] || '-';
      formattedItem['Waktu Pendaftaran (WIB)'] = formatJakartaTimestamp(item.Timestamp || item.timestamp);
      formattedItem['Status Penerimaan'] = item.Status || 'Proses';
      
      const enriched = enrichFields(settings?.formFields || []);
      
      // 2. Identitas Siswa (Session 1)
      enriched.filter((f: any) => f.session === 1 && f.type !== 'file').forEach((field: any) => {
        const value = getFieldValue(item, field.id);
        if (field.id === 'Tanggal Lahir' || field.label === 'Tanggal Lahir') {
          formattedItem[field.label] = formatDate(value);
          formattedItem['Usia'] = calculateAge(value, settings?.tanggalCutoffUsia);
        } else {
          formattedItem[field.label] = renderValue(value);
        }
      });
      
      // 3. Jarak & Lokasi Siswa
      formattedItem['Jarak ke Sekolah (km)'] = getSafeDistance(item);
      if (item['Koordinat Lokasi']) {
        formattedItem['Koordinat Lokasi'] = item['Koordinat Lokasi'];
        formattedItem['Link Maps'] = `https://www.google.com/maps/search/?api=1&query=${item['Koordinat Lokasi']}`;
      }
      
      // 4. Identitas Orang Tua (Session 2)
      enriched.filter((f: any) => f.session === 2 && f.type !== 'file').forEach((field: any) => {
        const value = getFieldValue(item, field.id);
        formattedItem[field.label] = renderValue(value);
      });
      
      // 5. Identitas Wali (Session 3)
      enriched.filter((f: any) => f.session === 3 && f.type !== 'file').forEach((field: any) => {
        const value = getFieldValue(item, field.id);
        formattedItem[field.label] = renderValue(value);
      });
      
      // 6. Upload Berkas (Session 4 or any type 'file')
      enriched.filter((f: any) => f.session === 4 || f.type === 'file').forEach((field: any) => {
        const value = getFieldValue(item, field.id);
        const hasCollision = enriched.some((other: any) => other.id !== field.id && other.label === field.label && other.type !== 'file');
        const headerName = (hasCollision || field.label === 'NISN') 
          ? `${field.label} (Berkas)` 
          : field.label;
        formattedItem[headerName] = isFileUploaded(value) ? value : 'Tidak Ada';
      });
      
      // 7. Alasan Penolakan
      formattedItem['Alasan Penolakan'] = item['Alasan Penolakan'] || '-';
      
      return formattedItem;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Pendaftar");
    XLSX.writeFile(wb, `Data_SPMB_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printCard = (student: AdminData) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("KARTU PENDAFTARAN SPMB", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.namaSekolah || "Sekolah Dasar", 105, 30, { align: "center" });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    const enriched = enrichFields(settings?.formFields || []);
    const printableFields = enriched.filter(field => field.type !== 'file');
    
    const fieldsSiswa = printableFields.filter(f => f.session === 1);
    const fieldsOrangTua = printableFields.filter(f => f.session === 2);
    const fieldsWali = printableFields.filter(f => f.session === 3);

    // Draw Main Header sections
    doc.setFont("helvetica", "bold");
    doc.text("INFORMASI STATUS", 15, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 57, 195, 57);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("No. Pendaftaran", 15, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${student['No Pendaftaran']}`, 50, 65);

    doc.setFont("helvetica", "bold");
    doc.text("Status Penerimaan", 110, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${student.Status}`, 145, 65);

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
        let value = getFieldValue(student, field.id) || '-';
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
        doc.setFont("helvetica", "bold");
        const labelText = field.label;
        const splitLabel = doc.splitTextToSize(labelText, 33);
        doc.text(splitLabel, 110, col2Y);
        
        doc.setFont("helvetica", "normal");
        let value = getFieldValue(student, field.id) || '-';
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
    doc.text(`*REG-${student['No Pendaftaran']}*`, barX, barY + barHeight + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Kartu ini adalah bukti sah pendaftaran SPMB ${settings?.namaSekolah || 'Sekolah'}.`, 72, bottomY + 10);
    doc.text(`Dicetak secara otomatis pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.`, 72, bottomY + 16);

    doc.save(`Kartu_SPMB_${student['No Pendaftaran']}.pdf`);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const nama = String(getFieldValue(item, 'Nama Lengkap') || '');
      const nik = String(getFieldValue(item, 'NIK') || '');
      const no = String(item['No Pendaftaran'] || '');
      
      const matchesSearch = nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'Semua' || item.Status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [data, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Lulus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle size={12} /> Lulus</span>;
      case 'Tidak Lulus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={12} /> Tidak Lulus</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={12} /> Proses</span>;
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-300", isDarkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
            <p className={cn("mt-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>Kelola data pendaftaran SPMB {settings?.namaSekolah || 'Sekolah'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('has_registered');
                localStorage.removeItem('registered_no');
                document.cookie = "has_registered=; max-age=-99999999; path=/";
                Swal.fire({
                  icon: 'success',
                  title: 'Perangkat Direset',
                  text: 'Status pendaftaran perangkat Anda berhasil direset! Sekarang Anda dapat menguji coba kembali pengisian formulir.',
                  timer: 2500,
                  showConfirmButton: false
                });
              }}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm border",
                isDarkMode 
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              title="Reset status pendaftaran pada browser Anda agar bisa mencoba mengisi formulir kembali"
            >
              <RefreshCw size={15} /> Reset Status Uji Coba Form
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn("p-2 rounded-full transition-colors", isDarkMode ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200")}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6 border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'dashboard' 
                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <LayoutDashboard size={18} /> Data Pendaftar
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors",
              activeTab === 'settings' 
                ? "border-blue-500 text-blue-600 dark:text-blue-400" 
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Settings size={18} /> Pengaturan
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Pendaftar', value: data.length, color: 'bg-blue-500 text-white border-blue-600 shadow-md' },
                { label: 'Lulus', value: data.filter(item => item.Status === 'Lulus').length, color: 'bg-green-500 text-white border-green-600 shadow-md' },
                { label: 'Tidak Lulus', value: data.filter(item => item.Status === 'Tidak Lulus').length, color: 'bg-red-500 text-white border-red-600 shadow-md' },
                { label: 'Laki-laki', value: data.filter(item => { const jk = getFieldValue(item, 'Jenis Kelamin'); return jk && jk.toLowerCase().includes('laki'); }).length, color: 'bg-indigo-500 text-white border-indigo-600 shadow-md' },
                { label: 'Perempuan', value: data.filter(item => { const jk = getFieldValue(item, 'Jenis Kelamin'); return jk && jk.toLowerCase().includes('perempuan'); }).length, color: 'bg-pink-500 text-white border-pink-600 shadow-md' },
              ].map((stat, idx) => (
                <div key={idx} className={cn("p-4 rounded-xl border flex flex-col items-center justify-center text-center", stat.color)}>
                  <span className="text-sm font-medium opacity-90 mb-1">{stat.label}</span>
                  <span className="text-3xl font-bold">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Recharts Daily Registration Trend */}
            <div className={cn("rounded-2xl border shadow-sm p-5 mb-6 transition-colors", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className={cn("text-base font-bold", isDarkMode ? "text-white" : "text-slate-800")}>Grafik Tren Pendaftaran Harian</h3>
                  {showTrendChart && (
                    <p className={cn("text-xs font-medium mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>Statistik ditarik realtime berdasarkan Waktu Indonesia Barat (WIB / Asia/Jakarta)</p>
                  )}
                </div>
                <button
                  onClick={toggleTrendChart}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all",
                    isDarkMode 
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" 
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  {showTrendChart ? (
                    <>
                      <EyeOff size={14} /> Sembunyikan Grafik
                    </>
                  ) : (
                    <>
                      <Eye size={14} /> Tampilkan Grafik
                    </>
                  )}
                </button>
              </div>
              
              {showTrendChart && (
                <div className="h-72 w-full mt-2 select-none">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-slate-400 italic text-sm">
                      Belum ada data pendaftar harian untuk ditampilkan.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPendaftar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                        <XAxis 
                          dataKey="tanggal" 
                          tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 }} 
                          axisLine={{ stroke: isDarkMode ? "#475569" : "#cbd5e1" }}
                          tickLine={{ stroke: isDarkMode ? "#475569" : "#cbd5e1" }}
                        />
                        <YAxis 
                          allowDecimals={false}
                          tick={{ fill: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 11 }}
                          axisLine={{ stroke: isDarkMode ? "#475569" : "#cbd5e1" }}
                          tickLine={{ stroke: isDarkMode ? "#475569" : "#cbd5e1" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? "#0f172a" : "#ffffff", 
                            borderColor: isDarkMode ? "#334155" : "#e2e8f0",
                            color: isDarkMode ? "#ffffff" : "#0f172a",
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="Pendaftar" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorPendaftar)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>

            {/* Filters & Search */}
            <div className={cn("rounded-xl shadow-sm border p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className={isDarkMode ? "text-slate-400" : "text-slate-400"} />
                </div>
                <input
                  type="text"
                  placeholder="Cari Nama, NIK, atau No. Pendaftaran..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className={cn("block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors", 
                    isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
              </div>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={18} className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className={cn("block w-full py-2 pl-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors",
                      isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    )}
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Proses">Proses</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Tidak Lulus">Tidak Lulus</option>
                  </select>
                </div>
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap disabled:opacity-70"
                >
                  <RefreshCw size={16} className={cn(isLoading && "animate-spin")} /> Segarkan
                </button>
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                >
                  <Download size={16} /> Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={cn("rounded-xl shadow-sm border overflow-hidden", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className={isDarkMode ? "bg-slate-700 text-slate-200" : "bg-blue-50 text-blue-800"}>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">No. Pendaftaran</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Nama Lengkap</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Usia</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Jarak</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">NIK</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDarkMode ? "divide-slate-700" : "divide-slate-200")}>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-4" />
                          <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Memuat data...</p>
                        </td>
                      </tr>
                    ) : currentData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="mx-auto h-12 w-12 text-slate-400 mb-4"><FileText size={48} /></div>
                          <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Tidak ada data ditemukan</p>
                        </td>
                      </tr>
                    ) : (
                      currentData.map((item, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          key={item['No Pendaftaran']} 
                          className={cn("hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors")}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                            {item['No Pendaftaran']}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium">{getFieldValue(item, 'Nama Lengkap') || '-'}</div>
                            <div className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-500")}>{getFieldValue(item, 'Tempat Lahir') || '-'}, {formatDate(getFieldValue(item, 'Tanggal Lahir'))}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {calculateAge(getFieldValue(item, 'Tanggal Lahir'), settings?.tanggalCutoffUsia)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {getSafeDistance(item) !== '-' ? `${getSafeDistance(item)} km` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                            {getFieldValue(item, 'NIK') || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(item.Status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setSelectedStudent(item)} className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-2 py-1 rounded transition-colors" title="Lihat Detail">
                                <Eye size={18} />
                              </button>
                              {item.Status !== 'Lulus' && (
                                <button onClick={() => handleUpdateStatus(item['No Pendaftaran'], 'Lulus')} className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 px-2 py-1 rounded transition-colors" title="Ubah ke Lulus">
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              {item.Status !== 'Tidak Lulus' && (
                                <button onClick={() => handleUpdateStatus(item['No Pendaftaran'], 'Tidak Lulus')} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-2 py-1 rounded transition-colors" title="Ubah ke Tidak Lulus">
                                  <XCircle size={18} />
                                </button>
                              )}
                              <button onClick={() => printCard(item)} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-2 py-1 rounded transition-colors" title="Cetak Kartu">
                                <Printer size={18} />
                              </button>
                              
                              <button 
                                onClick={() => handleDeleteRegistration(item['No Pendaftaran'], getFieldValue(item, 'Nama Lengkap') || 'Siswa')} 
                                className="text-rose-600 hover:text-rose-950 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 px-2 py-1 rounded transition-colors" 
                                title="Hapus Data"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {!isLoading && filteredData.length > 0 && (
                <div className={cn("px-6 py-4 border-t flex items-center justify-between", isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white")}>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-medium">{filteredData.length}</span> data
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && localSettings && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={cn("rounded-xl shadow-sm border p-6", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
              
              <div className="flex items-center gap-4 mb-6 border-b dark:border-slate-700 pb-4 overflow-x-auto">
                <button
                  onClick={() => setSettingsTab('school')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'school'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Pengaturan Sekolah
                </button>
                <button
                  onClick={() => setSettingsTab('form')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'form'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Pengaturan Formulir
                </button>
                <button
                  onClick={() => setSettingsTab('surat')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'surat'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Pengaturan Surat
                </button>
                <button
                  onClick={() => setSettingsTab('daftar-ulang')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'daftar-ulang'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Pengaturan Daftar Ulang
                </button>
                <button
                  onClick={() => setSettingsTab('kepala-sekolah')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'kepala-sekolah'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Kepala Sekolah
                </button>
                <button
                  onClick={() => setSettingsTab('panduan')}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                    settingsTab === 'panduan'
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  )}
                >
                  Panduan Pendaftaran
                </button>
              </div>

              <div className="space-y-6">
                {settingsTab === 'school' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Nama Sekolah</label>
                      <input
                        type="text"
                        value={localSettings.namaSekolah}
                        onChange={e => setLocalSettings({...localSettings, namaSekolah: e.target.value})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Status Pendaftaran</label>
                      <select
                        value={localSettings.statusPendaftaran}
                        onChange={e => setLocalSettings({...localSettings, statusPendaftaran: e.target.value as any})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      >
                        <option value="Otomatis">Otomatis (Berdasarkan Jadwal)</option>
                        <option value="Buka">Buka (Manual)</option>
                        <option value="Tutup">Tutup (Manual)</option>
                      </select>
                    </div>
                    {localSettings.statusPendaftaran === 'Otomatis' && (
                      <div className="md:col-span-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                        <label className={cn("block text-sm font-semibold mb-1", isDarkMode ? "text-blue-300" : "text-blue-700")}>Tanggal & Waktu Pembukaan Pendaftaran (Otomatis)</label>
                        <input
                          type="datetime-local"
                          value={localSettings.tanggalPembukaanPendaftaran || '2026-06-29T08:00'}
                          onChange={e => setLocalSettings({...localSettings, tanggalPembukaanPendaftaran: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        <p className="text-xs text-slate-500 mt-1">Tanggal ini digunakan sebagai acuan hitung mundur (countdown) di Beranda dan pendaftaran otomatis akan terbuka tepat pada tanggal/waktu tersebut.</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Alamat</label>
                      <textarea
                        value={localSettings.alamat}
                        onChange={e => setLocalSettings({...localSettings, alamat: e.target.value})}
                        rows={2}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Koordinat Sekolah (Latitude, Longitude)</label>
                      <input
                        type="text"
                        value={localSettings.koordinatSekolah || ''}
                        onChange={e => setLocalSettings({...localSettings, koordinatSekolah: e.target.value})}
                        placeholder="Contoh: -6.200000, 106.816666"
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <p className="text-xs text-slate-500 mt-1">Gunakan format "Latitude, Longitude" (contoh: -6.200000, 106.816666). Digunakan untuk menghitung jarak rumah pendaftar ke sekolah.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tanggal Cutoff Usia</label>
                      <input
                        type="date"
                        value={localSettings.tanggalCutoffUsia || ''}
                        onChange={e => setLocalSettings({...localSettings, tanggalCutoffUsia: e.target.value})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <p className="text-xs text-slate-500 mt-1">Tanggal yang digunakan sebagai acuan untuk menghitung usia pendaftar (contoh: 1 Juli tahun berjalan). Jika dikosongkan, menggunakan tanggal saat pengisian pendaftaran.</p>
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Telepon</label>
                      <input
                        type="text"
                        value={localSettings.telepon}
                        onChange={e => setLocalSettings({...localSettings, telepon: e.target.value})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Email</label>
                      <input
                        type="email"
                        value={localSettings.email}
                        onChange={e => setLocalSettings({...localSettings, email: e.target.value})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tahun Pendaftaran</label>
                      <input
                        type="text"
                        value={localSettings.tahunPendaftaran || ''}
                        onChange={e => setLocalSettings({...localSettings, tahunPendaftaran: e.target.value})}
                        placeholder="Contoh: 2026/2027"
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Deskripsi Sekolah</label>
                      <textarea
                        value={localSettings.deskripsi}
                        onChange={e => setLocalSettings({...localSettings, deskripsi: e.target.value})}
                        rows={3}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Logo Sekolah (Upload)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImage(file, 180, 0.5);
                            setLocalSettings({...localSettings, logoSekolah: compressed});
                          }
                        }}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <input
                        type="text"
                        value={localSettings.logoSekolah || ''}
                        onChange={e => setLocalSettings({...localSettings, logoSekolah: e.target.value})}
                        placeholder="Atau tempel URL gambar logo eksternal di sini (misal: https://...)"
                        className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      {localSettings.logoSekolah && <img src={localSettings.logoSekolah} alt="Logo Sekolah" className="mt-2 h-16 object-contain border rounded bg-white p-1" />}
                    </div>
                    <div className="md:col-span-2">
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Favicon / Icon Tab Browser (Upload)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImage(file, 64, 0.7);
                            setLocalSettings({...localSettings, faviconSekolah: compressed});
                          }
                        }}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <input
                        type="text"
                        value={localSettings.faviconSekolah || ''}
                        onChange={e => setLocalSettings({...localSettings, faviconSekolah: e.target.value})}
                        placeholder="Atau tempel URL gambar favicon di sini (kosongkan untuk menggunakan logo sekolah)"
                        className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      {localSettings.faviconSekolah && <img src={localSettings.faviconSekolah} alt="Favicon Sekolah" className="mt-2 h-8 w-8 object-contain border rounded bg-white p-1" />}
                    </div>
                    <div className="md:col-span-2">
                       <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Gambar Header Beranda (Upload)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImage(file, 600, 0.45);
                            setLocalSettings({...localSettings, gambarHeaderBeranda: compressed});
                          }
                        }}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <input
                        type="text"
                        value={localSettings.gambarHeaderBeranda || ''}
                        onChange={e => setLocalSettings({...localSettings, gambarHeaderBeranda: e.target.value})}
                        placeholder="Atau tempel URL gambar header eksternal di sini (misal: https://...)"
                        className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      {localSettings.gambarHeaderBeranda && <img src={localSettings.gambarHeaderBeranda} alt="Header Beranda" className="mt-2 h-32 object-cover border rounded bg-white" />}
                    </div>
                    <div>
                      <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tanggal & Waktu Pengumuman Penerimaan (Otomatis)</label>
                      <input
                        type="datetime-local"
                        value={
                          localSettings.tanggalPengumuman
                            ? localSettings.tanggalPengumuman.includes('T')
                              ? localSettings.tanggalPengumuman
                              : `${localSettings.tanggalPengumuman}T08:00`
                            : ''
                        }
                        onChange={e => setLocalSettings({...localSettings, tanggalPengumuman: e.target.value})}
                        className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                      />
                      <p className="text-xs text-slate-500 mt-1">Sebelum tanggal & waktu ini, pendaftar akan melihat status "Proses".</p>
                    </div>

                    <div className="md:col-span-2 border-t border-dashed border-slate-700/30 pt-6 mt-4">
                      <div className={cn("p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4", localSettings.isMaintenance ? "border-amber-500 bg-amber-500/10" : isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                        <div className="space-y-1 max-w-full md:max-w-xl">
                          <h4 className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <span className="relative flex h-2 w-2">
                              {localSettings.isMaintenance && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                              <span className={cn("relative inline-flex rounded-full h-2 w-2", localSettings.isMaintenance ? "bg-amber-500" : "bg-slate-400")}></span>
                            </span>
                            Simulasi Server Down / Mode Maintenance (Trafik SPMB Tinggi)
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Aktifkan fitur ini jika ingin mensimulasikan server overload atau penonton/pendaftar membludak (seperti pendaftaran SPMB/PPDB crash saat pembukaan). Pengunjung publik akan melihat layar "HTTP 503 Server Overload" dan tidak bisa mendaftar sampai mode ini dinonaktifkan kembali.
                          </p>
                        </div>
                        <div className="flex items-center shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!localSettings.isMaintenance}
                              onChange={e => setLocalSettings({...localSettings, isMaintenance: e.target.checked})}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            <span className="ml-2 text-sm font-semibold select-none text-slate-700 dark:text-slate-300">
                              {localSettings.isMaintenance ? "AKTIF" : "NONAKTIF"}
                            </span>
                          </label>
                        </div>
                      </div>

                      {localSettings.isMaintenance && (
                        <div className="mt-4 space-y-4">
                          <div className="space-y-1">
                            <label className={cn("block text-sm font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>Judul Layar Maintenance</label>
                            <input
                              type="text"
                              value={localSettings.maintenanceTitle || ''}
                              onChange={e => setLocalSettings({...localSettings, maintenanceTitle: e.target.value})}
                              placeholder="Contoh: SITE UNDER MAINTENANCE"
                              className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className={cn("block text-sm font-medium", isDarkMode ? "text-slate-300" : "text-slate-700")}>Pesan Kustom Layar Overload / Maintenance</label>
                            <textarea
                              value={localSettings.maintenanceMessage || ''}
                              onChange={e => setLocalSettings({...localSettings, maintenanceMessage: e.target.value})}
                              rows={3}
                              placeholder="Tuliskan pesan penjelasan mengapa sistem overload atau sedang dalam pemeliharaan..."
                              className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                            />
                            <p className="text-xs text-slate-500">Jika dikosongkan, halaman akan menampilkan pesan bawaan pemeliharaan sistem.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settingsTab === 'daftar-ulang' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Pengaturan Daftar Ulang</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tanggal Daftar Ulang</label>
                        <input
                          type="date"
                          value={localSettings.tanggalDaftarUlang || ''}
                          onChange={e => setLocalSettings({...localSettings, tanggalDaftarUlang: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Persyaratan Daftar Ulang</label>
                        <textarea
                          value={localSettings.persyaratanDaftarUlang || ''}
                          onChange={e => setLocalSettings({...localSettings, persyaratanDaftarUlang: e.target.value})}
                          rows={4}
                          placeholder="1. Syarat pertama&#10;2. Syarat kedua"
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>

                      <div className="md:col-span-2">
                        {(() => {
                          const parseDriveLinks = (val?: string) => {
                            if (!val) return [];
                            const trimmed = val.trim();
                            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                              try {
                                const parsed = JSON.parse(trimmed);
                                if (Array.isArray(parsed)) {
                                  return parsed.map((item: any, index) => {
                                    if (typeof item === 'object' && item !== null && typeof item.url === 'string') {
                                      return {
                                        label: item.label || `Link Dokumen ${index + 1}`,
                                        url: item.url
                                      };
                                    } else if (typeof item === 'string') {
                                      return {
                                        label: `Link Dokumen ${index + 1}`,
                                        url: item.trim()
                                      };
                                    }
                                    return null;
                                  }).filter(Boolean) as { label: string; url: string }[];
                                }
                              } catch (e) {}
                            }
                            
                            const urls = trimmed.split(/[\n,;]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
                            if (urls.length > 0) {
                              return urls.map((url, idx) => ({
                                label: urls.length === 1 ? 'Formulir Daftar Ulang' : `Link Dokumen ${idx + 1}`,
                                url
                              }));
                            }
                            return [];
                          };

                          const currentLinks = parseDriveLinks(localSettings.googleDriveDaftarUlang);

                          const updateAndSaveLinks = (updatedLinks: { label: string; url: string }[]) => {
                            if (!localSettings) return;
                            setLocalSettings({
                              ...localSettings,
                              googleDriveDaftarUlang: JSON.stringify(updatedLinks)
                            });
                          };

                          return (
                            <div className="space-y-3">
                              <label className={cn("block text-sm font-bold mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                Dokumen / Link Google Drive Berkas Daftar Ulang (Bisa memasukkan beberapa link)
                              </label>
                              
                              <div className="space-y-3">
                                {currentLinks.map((link, idx) => (
                                  <div key={idx} className={cn("p-4 rounded-xl border flex flex-col md:flex-row gap-3 items-end md:items-center", isDarkMode ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200")}>
                                    <div className="w-full md:w-1/3">
                                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Nama / Label Berkas</label>
                                      <input
                                        type="text"
                                        value={link.label}
                                        placeholder="Contoh: Formulir Pendaftaran Ulang"
                                        onChange={e => {
                                          const newLinks = [...currentLinks];
                                          newLinks[idx].label = e.target.value;
                                          updateAndSaveLinks(newLinks);
                                        }}
                                        className={cn("w-full px-3 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      />
                                    </div>
                                    <div className="w-full md:flex-grow">
                                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Tautan / URL Google Drive</label>
                                      <input
                                        type="url"
                                        value={link.url}
                                        placeholder="https://drive.google.com/..."
                                        onChange={e => {
                                          const newLinks = [...currentLinks];
                                          newLinks[idx].url = e.target.value;
                                          updateAndSaveLinks(newLinks);
                                        }}
                                        className={cn("w-full px-3 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-blue-500", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      />
                                    </div>
                                    <div className="shrink-0 pt-2 md:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLinks = currentLinks.filter((_, i) => i !== idx);
                                          updateAndSaveLinks(newLinks);
                                        }}
                                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all"
                                        title="Hapus Link ini"
                                      >
                                        <Trash size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                
                                {currentLinks.length === 0 && (
                                  <div className="p-4 rounded-xl border border-dashed text-center text-xs text-slate-500 py-6 dark:border-slate-800">
                                    Belum ada link berkas Google Drive ditambahkan. Klik tombol di bawah untuk menambahkan link berkas.
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const newLinks = [...currentLinks, { label: `Link Dokumen ${currentLinks.length + 1}`, url: '' }];
                                    updateAndSaveLinks(newLinks);
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-bold transition-colors dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                >
                                  + Tambah Link Berkas Baru
                                </button>
                              </div>
                              <p className="text-xs text-slate-400">Siswa yang Lulus akan melihat tombol-tombol terpisah sesuai nama berkas untuk mengunduh dokumen secara langsung.</p>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="md:col-span-2 border-t border-dashed border-slate-200 dark:border-slate-800 pt-6 mt-4">
                        <div className={cn("p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4", localSettings.isRapatAktif ? "border-green-500 bg-green-500/10" : isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                          <div className="space-y-1 max-w-full md:max-w-xl">
                            <h4 className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                              Pengumuman Rapat Orang Tua / Wali Calon Siswa Baru
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Aktifkan fitur ini jika ingin mengumumkan jadwal koordinasi dan rapat orang tua menjelang masuk sekolah. Informasi ini akan ditampilkan di Beranda dan menu Cek Penerimaan.
                            </p>
                          </div>
                          <div className="flex items-center shrink-0">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!localSettings.isRapatAktif}
                                onChange={e => setLocalSettings({...localSettings, isRapatAktif: e.target.checked})}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                              <span className="ml-2 text-sm font-semibold select-none text-slate-700 dark:text-slate-300">
                                {localSettings.isRapatAktif ? "AKTIF" : "NONAKTIF"}
                              </span>
                            </label>
                          </div>
                        </div>

                        {localSettings.isRapatAktif && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Judul Pengumuman Rapat</label>
                              <input
                                type="text"
                                value={localSettings.rapatJudul || ''}
                                onChange={e => setLocalSettings({...localSettings, rapatJudul: e.target.value})}
                                className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                                placeholder="Contoh: Pengumuman Rapat Orang Tua / Wali Calon Siswa Baru"
                              />
                            </div>
                            <div>
                              <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Hari / Tanggal Rapat</label>
                              <input
                                type="text"
                                value={localSettings.rapatTanggal || ''}
                                onChange={e => setLocalSettings({...localSettings, rapatTanggal: e.target.value})}
                                className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                                placeholder="Contoh: Sabtu, 11 Juli 2026"
                              />
                            </div>
                            <div>
                              <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Waktu Rapat</label>
                              <input
                                type="text"
                                value={localSettings.rapatWaktu || ''}
                                onChange={e => setLocalSettings({...localSettings, rapatWaktu: e.target.value})}
                                className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                                placeholder="Contoh: 08:00 WIB s.d Selesai"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tempat Rapat</label>
                              <input
                                type="text"
                                value={localSettings.rapatTempat || ''}
                                onChange={e => setLocalSettings({...localSettings, rapatTempat: e.target.value})}
                                className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                                placeholder="Contoh: Aula Serbaguna SDN Citapen Tasikmalaya"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Deskripsi / Himbauan Rapat</label>
                              <textarea
                                value={localSettings.rapatDeskripsi || ''}
                                onChange={e => setLocalSettings({...localSettings, rapatDeskripsi: e.target.value})}
                                rows={3}
                                className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                                placeholder="Himbauan atau informasi tambahan untuk orang tua murid..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'kepala-sekolah' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Profil Kepala Sekolah & Visi Misi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={localSettings.namaKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, namaKepalaSekolah: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: Drs. H. Ahmad, M.Pd."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Foto Kepala Sekolah</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file, 240, 0.55);
                              setLocalSettings({...localSettings, fotoKepalaSekolah: compressed});
                            }
                          }}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        <input
                          type="text"
                          value={localSettings.fotoKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, fotoKepalaSekolah: e.target.value})}
                          placeholder="Atau tempel URL gambar foto kepala sekolah eksternal di sini..."
                          className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        {localSettings.fotoKepalaSekolah && <img src={localSettings.fotoKepalaSekolah} alt="Foto Kepala Sekolah" className="mt-2 h-32 object-cover border rounded bg-white" />}
                      </div>
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Sambutan Kepala Sekolah</label>
                        <textarea
                          value={localSettings.sambutanKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, sambutanKepalaSekolah: e.target.value})}
                          rows={5}
                          placeholder="Masukkan kata sambutan kepala sekolah..."
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Visi Sekolah</label>
                        <textarea
                          value={localSettings.visiSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, visiSekolah: e.target.value})}
                          rows={3}
                          placeholder="Masukkan visi sekolah..."
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Misi Sekolah</label>
                        <textarea
                          value={localSettings.misiSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, misiSekolah: e.target.value})}
                          rows={5}
                          placeholder="1. Misi pertama&#10;2. Misi kedua"
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'panduan' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Pengaturan Halaman Panduan</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Judul Panduan</label>
                        <input
                          type="text"
                          value={localSettings.panduanJudul || ''}
                          onChange={e => setLocalSettings({...localSettings, panduanJudul: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Panduan Pendaftaran SPMB"
                        />
                      </div>
                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Deskripsi Panduan</label>
                        <textarea
                          value={localSettings.panduanDeskripsi || ''}
                          onChange={e => setLocalSettings({...localSettings, panduanDeskripsi: e.target.value})}
                          rows={2}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Persiapkan dokumen berikut sebelum mulai mengisi formulir pendaftaran."
                        />
                      </div>
                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Pesan Peringatan (Alert)</label>
                        <textarea
                          value={localSettings.panduanPeringatan || ''}
                          onChange={e => setLocalSettings({...localSettings, panduanPeringatan: e.target.value})}
                          rows={3}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Pastikan semua dokumen di-scan atau difoto dengan jelas dan dapat terbaca..."
                        />
                      </div>

                      <div className="border-t pt-6 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-semibold">Dokumen yang Harus Disiapkan</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setLocalSettings({
                                  ...localSettings,
                                  panduanDokumen: [
                                    { id: "1", icon: "FileDigit", title: "KK (Kartu Keluarga)", description: "Scan KK Asli. Pastikan NIK dan nama calon siswa tercantum dengan benar." },
                                    { id: "2", icon: "FileBadge", title: "Akta Kelahiran", description: "Scan Akta Kelahiran Asli. Pastikan data nama dan tanggal lahir terbaca dengan jelas." },
                                    { id: "3", icon: "Home", title: "Surat Keterangan Domisili (Opsional)", description: "Scan Surat Keterangan Domisili Asli bagi siswa yang mendaftar jalur zonasi jika alamat KK berbeda." },
                                    { id: "4", icon: "School", title: "Ijazah TK/RA (Opsional)", description: "Scan Ijazah atau Surat Keterangan Lulus (SKL) asli dari TK/RA asal." },
                                    { id: "5", icon: "FileDigit", title: "NISN (Nomor Induk Siswa Nasional)", description: "Bukti cetak lembar NISN resmi pendaftar dari situs Kemendikbud." },
                                    { id: "6", icon: "Award", title: "Piagam Prestasi (Opsional)", description: "Scan Piagam Penghargaan atau Sertifikat kejuaraan asli jika mendaftar jalur prestasi." },
                                    { id: "7", icon: "UserCheck", title: "Surat Mutasi Orang Tua (Opsional)", description: "Scan surat keputusan penugasan mutasi perpindahan tugas orang tua asli dari instansi." }
                                  ]
                                });
                                Swal.fire({
                                  icon: 'success',
                                  title: 'Pilihan Dokumen Reset',
                                  text: 'Daftar dokumen persyaratan telah dipulihkan ke format standar sekolah dengan ikon yang disesuaikan!',
                                  timer: 2000,
                                  showConfirmButton: false
                                });
                              }}
                              className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                            >
                              Reset Dokumen Standar
                            </button>
                            <button
                              onClick={() => {
                                const newDocs = [...(localSettings.panduanDokumen || [])];
                                newDocs.push({ id: Date.now().toString(), icon: 'FileText', title: 'Dokumen Baru', description: 'Deskripsi dokumen' });
                                setLocalSettings({...localSettings, panduanDokumen: newDocs});
                              }}
                              className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 font-semibold"
                            >
                              + Tambah Dokumen
                            </button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {(localSettings.panduanDokumen || []).map((doc, index) => (
                            <div key={doc.id} className={cn("p-4 rounded-lg border grid grid-cols-1 md:grid-cols-12 gap-4 items-start", isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium mb-1 opacity-70">Ikon</label>
                                <select
                                  value={doc.icon}
                                  onChange={e => {
                                    const newDocs = [...(localSettings.panduanDokumen || [])];
                                    newDocs[index] = { ...newDocs[index], icon: e.target.value as any };
                                    setLocalSettings({...localSettings, panduanDokumen: newDocs});
                                  }}
                                  className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300")}
                                >
                                  <option value="FileDigit">FileDigit (KK)</option>
                                  <option value="FileBadge">FileBadge (Akta)</option>
                                  <option value="Home">Home (Domisili)</option>
                                  <option value="School">School (Ijazah)</option>
                                  <option value="Award">Award (Prestasi)</option>
                                  <option value="UserCheck">UserCheck (Mutasi)</option>
                                  <option value="FileText">FileText (Umum)</option>
                                </select>
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-xs font-medium mb-1 opacity-70">Nama Dokumen</label>
                                <input
                                  type="text"
                                  value={doc.title}
                                  onChange={e => {
                                    const newDocs = [...(localSettings.panduanDokumen || [])];
                                    newDocs[index] = { ...newDocs[index], title: e.target.value };
                                    setLocalSettings({...localSettings, panduanDokumen: newDocs});
                                  }}
                                  className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300")}
                                />
                              </div>
                              <div className="md:col-span-6">
                                <label className="block text-xs font-medium mb-1 opacity-70">Deskripsi</label>
                                <textarea
                                  value={doc.description}
                                  onChange={e => {
                                    const newDocs = [...(localSettings.panduanDokumen || [])];
                                    newDocs[index] = { ...newDocs[index], description: e.target.value };
                                    setLocalSettings({...localSettings, panduanDokumen: newDocs});
                                  }}
                                  rows={2}
                                  className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300")}
                                />
                              </div>
                              <div className="md:col-span-1 flex justify-end">
                                <button
                                  onClick={() => {
                                    const newDocs = (localSettings.panduanDokumen || []).filter((_, i) => i !== index);
                                    setLocalSettings({...localSettings, panduanDokumen: newDocs});
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-900/20 mt-5"
                                  title="Hapus Dokumen"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-6 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-semibold">Alur Pendaftaran</h4>
                          <button
                            onClick={() => {
                              const newAlur = [...(localSettings.panduanAlur || [])];
                              newAlur.push('Langkah baru');
                              setLocalSettings({...localSettings, panduanAlur: newAlur});
                            }}
                            className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60"
                          >
                            + Tambah Langkah
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(localSettings.panduanAlur || []).map((step, index) => (
                            <div key={index} className="flex gap-3 items-start">
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 mt-1 dark:bg-slate-700 dark:text-slate-300">
                                {index + 1}
                              </div>
                              <textarea
                                value={step}
                                onChange={e => {
                                  const newAlur = [...(localSettings.panduanAlur || [])];
                                  newAlur[index] = e.target.value;
                                  setLocalSettings({...localSettings, panduanAlur: newAlur});
                                }}
                                rows={2}
                                className={cn("flex-grow px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300")}
                              />
                              <button
                                onClick={() => {
                                  const newAlur = (localSettings.panduanAlur || []).filter((_, i) => i !== index);
                                  setLocalSettings({...localSettings, panduanAlur: newAlur});
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-900/20 mt-1"
                                title="Hapus Langkah"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'surat' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Pengaturan Surat Penerimaan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Nomor Surat</label>
                        <input
                          type="text"
                          value={localSettings.nomorSurat || ''}
                          onChange={e => setLocalSettings({...localSettings, nomorSurat: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: 421.2/001/SD/2026"
                        />
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tempat Surat</label>
                        <input
                          type="text"
                          value={localSettings.tempatSurat || ''}
                          onChange={e => setLocalSettings({...localSettings, tempatSurat: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: Jakarta"
                        />
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tanggal Surat (Kosongkan untuk tanggal hari ini)</label>
                        <input
                          type="text"
                          value={localSettings.tanggalSurat || ''}
                          onChange={e => setLocalSettings({...localSettings, tanggalSurat: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: 25 Juli 2026"
                        />
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={localSettings.namaKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, namaKepalaSekolah: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: Drs. H. Ahmad, M.Pd."
                        />
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>NIP Kepala Sekolah</label>
                        <input
                          type="text"
                          value={localSettings.nipKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, nipKepalaSekolah: e.target.value})}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                          placeholder="Contoh: 19700101 199512 1 001"
                        />
                      </div>

                       <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Kop Surat (Gambar)</label>
                        <input
                          key={localSettings.kopSurat ? 'kop-has' : 'kop-empty'}
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file, 1600, 0.85, 'image/jpeg');
                              setLocalSettings({...localSettings, kopSurat: compressed});
                            }
                          }}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        <input
                          type="text"
                          value={localSettings.kopSurat || ''}
                          onChange={e => setLocalSettings({...localSettings, kopSurat: e.target.value})}
                          placeholder="Atau tempel URL gambar kop surat eksternal di sini..."
                          className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        {localSettings.kopSurat && (
                          <div className="mt-2 flex items-center gap-3">
                            <img src={localSettings.kopSurat} alt="Kop Surat" className="h-16 object-contain border rounded bg-white p-1" />
                            <button
                              type="button"
                              onClick={() => setLocalSettings({...localSettings, kopSurat: ''})}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 rounded-md transition-colors"
                            >
                              Hapus Gambar
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Tanda Tangan Kepala Sekolah (Gambar)</label>
                        <input
                          key={localSettings.tandaTanganKepalaSekolah ? 'ttd-has' : 'ttd-empty'}
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file, 600, 0.8, 'image/png');
                              setLocalSettings({...localSettings, tandaTanganKepalaSekolah: compressed});
                            }
                          }}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        <input
                          type="text"
                          value={localSettings.tandaTanganKepalaSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, tandaTanganKepalaSekolah: e.target.value})}
                          placeholder="Atau tempel URL gambar tanda tangan eksternal di sini..."
                          className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        {localSettings.tandaTanganKepalaSekolah && (
                          <div className="mt-2 flex items-center gap-3">
                            <img src={localSettings.tandaTanganKepalaSekolah} alt="Tanda Tangan" className="h-16 object-contain border rounded bg-white p-1" />
                            <button
                              type="button"
                              onClick={() => setLocalSettings({...localSettings, tandaTanganKepalaSekolah: ''})}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 rounded-md transition-colors"
                            >
                              Hapus Gambar
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Stempel Sekolah (Gambar transparan disarankan)</label>
                        <input
                          key={localSettings.stempelSekolah ? 'stempel-has' : 'stempel-empty'}
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImage(file, 600, 0.8, 'image/png');
                              setLocalSettings({...localSettings, stempelSekolah: compressed});
                            }
                          }}
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        <input
                          type="text"
                          value={localSettings.stempelSekolah || ''}
                          onChange={e => setLocalSettings({...localSettings, stempelSekolah: e.target.value})}
                          placeholder="Atau tempel URL gambar stempel eksternal di sini..."
                          className={cn("w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                        {localSettings.stempelSekolah && (
                          <div className="mt-2 flex items-center gap-3">
                            <img src={localSettings.stempelSekolah} alt="Stempel" className="h-16 object-contain border rounded bg-white p-1" />
                            <button
                              type="button"
                              onClick={() => setLocalSettings({...localSettings, stempelSekolah: ''})}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 rounded-md transition-colors"
                            >
                              Hapus Gambar
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className={cn("block text-sm font-medium mb-1", isDarkMode ? "text-slate-300" : "text-slate-700")}>Catatan Tambahan / Pengumuman Lain</label>
                        <textarea
                          value={localSettings.catatanTambahan || ''}
                          onChange={e => setLocalSettings({...localSettings, catatanTambahan: e.target.value})}
                          rows={3}
                          placeholder="Contoh: Harap membawa materai 10.000 saat daftar ulang."
                          className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500", isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300")}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'form' && (
                  <div className="pt-2 space-y-8">
                    <div>
                      <h3 className="text-xl font-bold mb-1">Pengaturan Field Formulir Berdasarkan Sesi</h3>
                      <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        Formulir pendaftaran dibagi menjadi 4 sesi. Sesi akan terlewati secara otomatis saat pendaftaran jika tidak berisi field aktif.
                      </p>
                    </div>

                    {[
                      { id: 1, name: 'Sesi 1: Pengisian Data Calon Siswa' },
                      { id: 2, name: 'Sesi 2: Pengisian Nama Orang Tua Siswa' },
                      { id: 3, name: 'Sesi 3: Pengisian Nama Wali Siswa' },
                      { id: 4, name: 'Sesi 4: Upload Berkas' },
                    ].map((step) => {
                      const stepFields = (localSettings?.formFields || []).filter(f => {
                        if (f.session !== undefined) {
                          return Number(f.session) === step.id;
                        }
                        if (f.type === 'file') {
                          return step.id === 4;
                        }
                        const idLower = String(f.id || '').toLowerCase();
                        const labelLower = String(f.label || '').toLowerCase();
                        if (idLower.includes('wali') || labelLower.includes('wali')) {
                          return step.id === 3;
                        }
                        if (
                          idLower.includes('orang tua') || labelLower.includes('orang tua') ||
                          idLower.includes('ortu') || labelLower.includes('ortu') ||
                          idLower.includes('bapak') || labelLower.includes('bapak') ||
                          idLower.includes('ibu') || labelLower.includes('ibu') ||
                          idLower.includes('hp') || labelLower.includes('hp') ||
                          idLower.includes('telepon') || labelLower.includes('telepon') ||
                          idLower.includes('whatsapp') || labelLower.includes('whatsapp')
                        ) {
                          return step.id === 2;
                        }
                        return step.id === 1;
                      });

                      return (
                        <div key={step.id} className={cn("rounded-2xl border p-6", isDarkMode ? "bg-slate-850 border-slate-700" : "bg-white border-slate-200 shadow-sm")}>
                          <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-700">
                            <h4 className="font-bold text-md text-blue-600">{step.name}</h4>
                            <button
                              onClick={() => {
                                const tempId = `field_${Date.now()}`;
                                const newFields = [...(localSettings?.formFields || []), { 
                                  id: tempId, 
                                  label: 'Field Baru', 
                                  type: (step.id === 4 ? 'file' : 'text') as any, 
                                  required: false, 
                                  session: step.id as any,
                                  _tempKey: `stable_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                  _rawOptions: ''
                                }];
                                setLocalSettings({...localSettings!, formFields: newFields});
                              }}
                              className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-md font-semibold transition-colors dark:bg-blue-900/30 dark:text-blue-400"
                            >
                              + Tambah Field ke Sesi {step.id}
                            </button>
                          </div>

                          {stepFields.length === 0 ? (
                            <p className="text-sm text-slate-500 italic py-4">Tidak ada field khusus di sesi ini (Sesi akan dilewati secara otomatis).</p>
                          ) : (
                            <div className="space-y-4">
                              {stepFields.map((field) => {
                                const currentFieldKey = field._tempKey || field.id || field.label;
                                const globalIndex = (localSettings?.formFields || []).findIndex(f => {
                                  const fKey = f._tempKey || f.id || f.label;
                                  return fKey === currentFieldKey;
                                });
                                if (globalIndex === -1) return null;
                                return (
                                  <div key={currentFieldKey} className={cn("p-4 rounded-lg border grid grid-cols-1 md:grid-cols-12 gap-4 items-end", isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50")}>
                                    <div className="md:col-span-1 flex gap-1 justify-start pb-1">
                                      <button
                                        onClick={() => moveField(currentFieldKey, step.id, 'up')}
                                        disabled={stepFields.indexOf(field) === 0}
                                        className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Pindahkan Ke Atas"
                                      >
                                        <ArrowUp size={16} />
                                      </button>
                                      <button
                                        onClick={() => moveField(currentFieldKey, step.id, 'down')}
                                        disabled={stepFields.indexOf(field) === stepFields.length - 1}
                                        className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Pindahkan Ke Bawah"
                                      >
                                        <ArrowDown size={16} />
                                      </button>
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium mb-1 opacity-70">ID (Unik)</label>
                                      <input
                                        type="text"
                                        value={field.id}
                                        onChange={e => {
                                          const newFields = [...(localSettings?.formFields || [])];
                                          newFields[globalIndex] = { ...newFields[globalIndex], id: e.target.value };
                                          setLocalSettings({...localSettings!, formFields: newFields});
                                        }}
                                        className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium mb-1 opacity-70">Label</label>
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={e => {
                                          const newFields = [...(localSettings?.formFields || [])];
                                          const newLabel = e.target.value;
                                          const slugId = newLabel.toLowerCase()
                                            .replace(/[^a-z0-9\s-]/g, '')
                                            .replace(/\s+/g, '_')
                                            .trim();
                                          newFields[globalIndex] = { 
                                            ...newFields[globalIndex], 
                                            label: newLabel,
                                            id: slugId || newFields[globalIndex].id
                                          };
                                          setLocalSettings({...localSettings!, formFields: newFields});
                                        }}
                                        className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium mb-1 opacity-70">Tipe</label>
                                      <select
                                        value={field.type}
                                        onChange={e => {
                                          const newFields = [...(localSettings?.formFields || [])];
                                          newFields[globalIndex] = { ...newFields[globalIndex], type: e.target.value as any };
                                          setLocalSettings({...localSettings!, formFields: newFields});
                                        }}
                                        className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="select">Select</option>
                                        <option value="textarea">Textarea</option>
                                        <option value="file">File</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium mb-1 opacity-70">Grup Sesi</label>
                                      <select
                                        value={field.session || step.id}
                                        onChange={e => {
                                          const newFields = [...(localSettings?.formFields || [])];
                                          newFields[globalIndex] = { ...newFields[globalIndex], session: parseInt(e.target.value, 10) as any };
                                          setLocalSettings({...localSettings!, formFields: newFields});
                                        }}
                                        className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                      >
                                        <option value={1}>Sesi 1 (Calon Siswa)</option>
                                        <option value={2}>Sesi 2 (Orang Tua)</option>
                                        <option value={3}>Sesi 3 (Wali)</option>
                                        <option value={4}>Sesi 4 (Berkas)</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-2 flex items-center h-[38px] pb-2">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={e => {
                                            const newFields = [...(localSettings?.formFields || [])];
                                            newFields[globalIndex] = { ...newFields[globalIndex], required: e.target.checked };
                                            setLocalSettings({...localSettings!, formFields: newFields});
                                          }}
                                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium">Wajib</span>
                                      </label>
                                    </div>
                                    <div className="md:col-span-1 flex justify-end pb-1">
                                      <button
                                        onClick={() => {
                                          const newFields = (localSettings?.formFields || []).filter(f => {
                                            const fKey = f._tempKey || f.id || f.label;
                                            return fKey !== currentFieldKey;
                                          });
                                          setLocalSettings({...localSettings!, formFields: newFields});
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors dark:hover:bg-red-900/20 cursor-pointer"
                                        title="Hapus Field"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>
                                    {field.type === 'select' && (
                                      <div className="md:col-span-12 mt-2">
                                        <label className="block text-xs font-medium mb-1 opacity-70">Opsi (Pisahkan dengan koma)</label>
                                        <input
                                          type="text"
                                          value={field._rawOptions !== undefined ? field._rawOptions : (field.options?.join(', ') || '')}
                                          onChange={e => {
                                            const newFields = [...(localSettings?.formFields || [])];
                                            newFields[globalIndex] = { 
                                              ...newFields[globalIndex], 
                                              _rawOptions: e.target.value,
                                              options: e.target.value.split(',').map(s => s.trim()) 
                                            };
                                            setLocalSettings({...localSettings!, formFields: newFields});
                                          }}
                                          placeholder="Laki-laki, Perempuan"
                                          className={cn("w-full px-3 py-2 text-sm border rounded-md", isDarkMode ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-slate-300")}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : null}
                    Simpan Pengaturan
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl", isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900")}
            >
              <div className={cn("sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b", isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                <h2 className="text-xl font-bold">Detail Pendaftar</h2>
                <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Data Section */}
                  <div className="space-y-6">
                    {/* 1. Informasi Pendaftaran */}
                    <div className={cn("p-4 rounded-xl border", isDarkMode ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/50")}>
                      <h3 className="text-base font-bold pb-2 mb-3 border-b text-blue-600 dark:text-blue-400 dark:border-slate-700">
                        Informasi Pendaftaran
                      </h3>
                      <dl className="grid grid-cols-1 gap-y-2.5 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <dt className="text-slate-500 dark:text-slate-400">No. Pendaftaran</dt>
                          <dd className="col-span-2 font-semibold">{selectedStudent['No Pendaftaran']}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                          <dd className="col-span-2">{getStatusBadge(selectedStudent.Status)}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <dt className="text-slate-500 dark:text-slate-400">Waktu Daftar</dt>
                          <dd className="col-span-2 font-medium">
                            {formatJakartaTimestamp(selectedStudent.Timestamp || selectedStudent.timestamp)}
                          </dd>
                        </div>
                        
                        {getSafeDistance(selectedStudent) !== '-' && (
                          <div className="grid grid-cols-3 gap-4">
                            <dt className="text-slate-500 dark:text-slate-400">Jarak ke Sekolah</dt>
                            <dd className="col-span-2 font-semibold text-blue-600 dark:text-blue-400">
                              {getSafeDistance(selectedStudent)} km
                            </dd>
                          </div>
                        )}
                        
                        {selectedStudent['Koordinat Lokasi'] && (
                          <div className="grid grid-cols-3 gap-4">
                            <dt className="text-slate-500 dark:text-slate-400">Koordinat Lokasi</dt>
                            <dd className="col-span-2 font-medium">
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${selectedStudent['Koordinat Lokasi']}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {selectedStudent['Koordinat Lokasi']}
                              </a>
                            </dd>
                          </div>
                        )}

                        {selectedStudent['Alasan Penolakan'] && (
                          <div className="grid grid-cols-3 gap-4 text-rose-600 dark:text-rose-400">
                            <dt className="font-semibold">Alasan Penolakan</dt>
                            <dd className="col-span-2 font-semibold">{selectedStudent['Alasan Penolakan']}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* 2. Identitas Calon Siswa */}
                    <div className={cn("p-4 rounded-xl border", isDarkMode ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/50")}>
                      <h3 className="text-base font-bold pb-2 mb-3 border-b text-slate-800 dark:text-slate-200 dark:border-slate-700">
                        Identitas Calon Siswa
                      </h3>
                      <dl className="grid grid-cols-1 gap-y-2.5 text-sm">
                        {(() => {
                          const enriched = enrichFields(settings?.formFields || []);
                          const siswaFields = enriched.filter(f => f.session === 1 && f.type !== 'file');
                          const hasNisn = siswaFields.some(f => String(f.label || '').toUpperCase().includes('NISN'));
                          if (!hasNisn) {
                            const otherNisnField = enriched.find(f => String(f.label || '').toUpperCase().includes('NISN'));
                            if (otherNisnField) {
                              return [...siswaFields, otherNisnField];
                            }
                          }
                          return siswaFields;
                        })().map(field => {
                          const value = getFieldValue(selectedStudent, field.id);
                          return (
                            <React.Fragment key={field.id}>
                              <div className="grid grid-cols-3 gap-4">
                                <dt className="text-slate-500 dark:text-slate-400">{field.label}</dt>
                                <dd className="col-span-2 font-medium">
                                  {field.type === 'date' 
                                    ? formatDate(value) 
                                    : renderValue(value)}
                                </dd>
                              </div>
                              {(field.id === 'Tanggal Lahir' || field.label === 'Tanggal Lahir') && (
                                <div className="grid grid-cols-3 gap-4">
                                  <dt className="text-slate-500 dark:text-slate-400">Usia</dt>
                                  <dd className="col-span-2 font-medium text-emerald-600 dark:text-emerald-400">
                                    {calculateAge(value, settings?.tanggalCutoffUsia)}
                                  </dd>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </dl>
                    </div>

                    {/* 3. Data Orang Tua Kandung */}
                    <div className={cn("p-4 rounded-xl border", isDarkMode ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/50")}>
                      <h3 className="text-base font-bold pb-2 mb-3 border-b text-slate-800 dark:text-slate-200 dark:border-slate-700">
                        Data Orang Tua Kandung
                      </h3>
                      <dl className="grid grid-cols-1 gap-y-2.5 text-sm">
                        {enrichFields(settings?.formFields || []).filter(f => f.session === 2 && f.type !== 'file').map(field => {
                          const value = getFieldValue(selectedStudent, field.id);
                          return (
                            <div key={field.id} className="grid grid-cols-3 gap-4">
                              <dt className="text-slate-500 dark:text-slate-400">{field.label}</dt>
                              <dd className="col-span-2 font-medium">
                                {field.type === 'date' 
                                  ? formatDate(value) 
                                  : renderValue(value)}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>

                    {/* 4. Data Wali Siswa (Opsional) */}
                    {enrichFields(settings?.formFields || []).filter(f => f.session === 3 && f.type !== 'file').length > 0 && (
                      <div className={cn("p-4 rounded-xl border", isDarkMode ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50/50")}>
                        <h3 className="text-base font-bold pb-2 mb-3 border-b text-slate-800 dark:text-slate-200 dark:border-slate-700">
                          Data Wali Siswa (Opsional)
                        </h3>
                        <dl className="grid grid-cols-1 gap-y-2.5 text-sm">
                          {enrichFields(settings?.formFields || []).filter(f => f.session === 3 && f.type !== 'file').map(field => {
                            const value = getFieldValue(selectedStudent, field.id);
                            return (
                              <div key={field.id} className="grid grid-cols-3 gap-4">
                                <dt className="text-slate-500 dark:text-slate-400">{field.label}</dt>
                                <dd className="col-span-2 font-medium">
                                  {field.type === 'date' 
                                    ? formatDate(value) 
                                    : renderValue(value)}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    )}
                    
                    <div className="pt-4 flex gap-3">
                      {selectedStudent.Status !== 'Lulus' && (
                        <button onClick={() => handleUpdateStatus(selectedStudent['No Pendaftaran'], 'Lulus')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors">
                          Ubah ke Lulus
                        </button>
                      )}
                      {selectedStudent.Status !== 'Tidak Lulus' && (
                        <button onClick={() => handleUpdateStatus(selectedStudent['No Pendaftaran'], 'Tidak Lulus')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors">
                          Ubah ke Tidak Lulus
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteRegistration(selectedStudent['No Pendaftaran'], getFieldValue(selectedStudent, 'Nama Lengkap') || 'Siswa')} 
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
                        title="Hapus Data Siswa"
                      >
                        <Trash size={16} /> Hapus
                      </button>
                    </div>
                  </div>

                  {/* Files Section */}
                  <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-4 dark:border-slate-700">Berkas Upload</h3>
                    <div className="space-y-4">
                      {settings?.formFields.filter(f => f.type === 'file').map(field => {
                        const fileUrl = getFieldValue(selectedStudent, field.id);
                        const uploaded = isFileUploaded(fileUrl);
                        return (
                          <div key={field.id} className={cn("p-4 rounded-xl border", isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50")}>
                            <p className="text-sm font-medium mb-2">{field.label}</p>
                            {uploaded ? (
                              (typeof fileUrl === 'string' && fileUrl.startsWith('data:image')) ? (
                                <img src={fileUrl} alt={field.label} className="w-full h-32 object-cover rounded-lg border" />
                              ) : (
                                <a href={String(fileUrl)} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm flex items-center gap-2">
                                  <FileText size={16} /> Buka {field.label}
                                </a>
                              )
                            ) : (
                              <span className="text-sm text-slate-500">Tidak ada file</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
