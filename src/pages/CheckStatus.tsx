import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Printer, Download, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkStatus } from '../services/api';
import { cn, formatRapatTanggal } from '../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';
import { useSettings } from '../context/SettingsContext';

interface SafeImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

const ensureSafePdfImage = (src: string): Promise<SafeImageResult> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ dataUrl: '', width: 0, height: 0 });
      return;
    }

    const img = new Image();
    if (src.startsWith('http') || src.startsWith('//')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: src, width: img.width, height: img.height });
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        // Use PNG if it's a transparent signature/stamp or explicitly PNG
        const isPng = src.includes('image/png') || src.endsWith('.png') || src.includes('stempel') || src.includes('tandaTangan') || src.includes('tanda_tangan');
        const format = isPng ? 'image/png' : 'image/jpeg';
        
        resolve({
          dataUrl: canvas.toDataURL(format, 0.95),
          width: img.width,
          height: img.height
        });
      } catch (err) {
        console.error("Failed to convert image via canvas", err);
        resolve({ dataUrl: src, width: img.width, height: img.height });
      }
    };
    img.onerror = () => {
      console.warn("Failed to load image in ensureSafePdfImage. Resolving to empty string to prevent PDF rendering issues.");
      resolve({ dataUrl: '', width: 0, height: 0 });
    };
    img.src = src;
  });
};

export default function CheckStatus() {
  const { settings } = useSettings();
  const [noPendaftaran, setNoPendaftaran] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    noPendaftaran: string;
    namaLengkap: string;
    status: string;
    alasanPenolakan?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noPendaftaran.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await checkStatus(noPendaftaran);
      if (response.status === 'success') {
        setResult(response.data);
      } else {
        setError(response.message || 'Data tidak ditemukan');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menghubungi server');
    } finally {
      setIsLoading(false);
    }
  };

  const printBuktiLulus = async (data: any) => {
    if (!data) return;
    
    let swalInstance: any = null;
    try {
      swalInstance = Swal.fire({
        title: 'Menyiapkan Bukti Diterima...',
        text: 'Sedang memproses gambar kop surat, stempel, dan tanda tangan.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    } catch (err) {
      console.warn("Swal loading not triggered", err);
    }

    let safeKop: SafeImageResult | null = null;
    let safeStempel: SafeImageResult | null = null;
    let safeTtd: SafeImageResult | null = null;

    try {
      if (settings?.kopSurat) {
        safeKop = await ensureSafePdfImage(settings.kopSurat);
      }
      if (settings?.stempelSekolah) {
        safeStempel = await ensureSafePdfImage(settings.stempelSekolah);
      }
      if (settings?.tandaTanganKepalaSekolah) {
        safeTtd = await ensureSafePdfImage(settings.tandaTanganKepalaSekolah);
      }
    } catch (e) {
      console.error("Error preloading images for PDF", e);
    } finally {
      try {
        if (swalInstance) {
          Swal.close();
        }
      } catch (e) {}
    }

    const doc = new jsPDF();
    let currentY = 20;
    
    const rawTahun = settings?.tahunPendaftaran || new Date().getFullYear().toString();
    const tahunAjaran = rawTahun.includes('/') ? rawTahun : `${rawTahun}/${parseInt(rawTahun, 10) + 1}`;
    
    // Header (Kop Surat) with dynamic height to prevent "gepeng" (stretched/squished) look
    // and starting closer to the top (y = 5) for a tighter, neater appearance.
    let kopHeight = 30;
    if (safeKop && safeKop.dataUrl) {
      try {
        const kopFormat = safeKop.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        if (safeKop.width > 0 && safeKop.height > 0) {
          const aspectRatio = safeKop.width / safeKop.height;
          kopHeight = 170 / aspectRatio;
          // Limit max height to avoid push down of layout
          if (kopHeight > 38) {
            kopHeight = 38;
          }
        }
        doc.addImage(safeKop.dataUrl, kopFormat, 20, 5, 170, kopHeight);
      } catch (e) {
        console.error("Error adding kop surat image", e);
      }
    }
    
    // Draw separator line closer to the Kop Surat
    currentY = 5 + kopHeight + 3;
    doc.line(20, currentY, 190, currentY);
    
    // Move below the line for the official title
    currentY += 12;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKTI DITERIMA SPMB', 105, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Ajaran ${tahunAjaran}`, 105, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFontSize(11);
    const nomorSurat = settings?.nomorSurat || `001/SPMB/${tahunAjaran.replace('/', '-')}`;
    doc.text(`Nomor: ${nomorSurat}`, 105, currentY, { align: 'center' });
    
    currentY += 12;
    
    // Content
    doc.setFontSize(11);
    doc.text('Berdasarkan hasil seleksi Penerimaan Peserta Didik Baru (SPMB),', 20, currentY);
    currentY += 7;
    doc.text('menyatakan bahwa:', 20, currentY);
    currentY += 13;
    
    const lineSpacing = 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('No. Pendaftaran', 30, currentY);
    doc.text(':', 70, currentY);
    doc.text(data.noPendaftaran || '-', 75, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Nama Lengkap', 30, currentY + lineSpacing);
    doc.text(':', 70, currentY + lineSpacing);
    doc.text(data.namaLengkap || '-', 75, currentY + lineSpacing);
    
    doc.text('Status', 30, currentY + lineSpacing * 2);
    doc.text(':', 70, currentY + lineSpacing * 2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 128, 0); // Green
    doc.text('DITERIMA', 75, currentY + lineSpacing * 2);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Requirements
    currentY += lineSpacing * 4;
    doc.setFont('helvetica', 'normal');
    doc.text('Diharapkan segera melakukan daftar ulang dengan membawa persyaratan berikut:', 20, currentY);
    
    currentY += lineSpacing;
    const reqText = (settings?.persyaratanDaftarUlang || '1. Bukti Diterima ini (dicetak)\n2. Fotokopi Akta Kelahiran (2 lembar)\n3. Fotokopi Kartu Keluarga (2 lembar)\n4. Pas Foto 3x4 (4 lembar)\n5. Melakukan pembayaran administrasi awal').replace(/Bukti Kelulusan/g, 'Bukti Diterima');
    const splitReq = doc.splitTextToSize(reqText, 160);
    doc.text(splitReq, 25, currentY);
    
    currentY += splitReq.length * 6 + 15;
    // Cap currentY to ensure the signature block starts at a high enough position and doesn't overlap or align with footer
    if (currentY > 225) {
      currentY = 225;
    }
 
    // Signature Area
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tempat = settings?.tempatSurat || '....................';
    const tanggal = settings?.tanggalSurat ? safeFormatDate(settings.tanggalSurat, false) : dateStr;
    
    doc.text(`${tempat}, ${tanggal}`, 140, currentY);
    doc.text('Kepala Sekolah', 140, currentY + 6);
    
    if (safeStempel && safeStempel.dataUrl) {
      try {
        const stempelFormat = safeStempel.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(safeStempel.dataUrl, stempelFormat, 120, currentY + 8, 30, 30);
      } catch (e) {
        console.error("Error adding stempel", e);
      }
    }
    
    // Tanda tangan kepala sekolah menggunakan barcode agar rapi sesuai instruksi
    try {
      const barcodeX = 140;
      const barcodeY = currentY + 10;
      const barcodeHeight = 12;
      doc.setFillColor(0, 0, 0);
      const linePattern = [1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 2, 2, 1, 3];
      let currentXOffset = 0;
      for (let idx = 0; idx < linePattern.length; idx++) {
        const w = linePattern[idx] * 0.45;
        if (idx % 2 === 0) {
          doc.rect(barcodeX + currentXOffset, barcodeY, w, barcodeHeight, 'F');
        }
        currentXOffset += w + 0.45;
      }
      doc.setFontSize(6.5);
      doc.setFont('courier', 'normal');
      doc.text(`*SIGN-KS-${data.noPendaftaran || settings?.nipKepalaSekolah || 'WIB'}*`, barcodeX, barcodeY + barcodeHeight + 4);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text("Tanda Tangan Elektronik Sah", barcodeX, barcodeY + barcodeHeight + 8);
    } catch (e) {
      console.error("Error drawing barcode signature", e);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.namaKepalaSekolah || 'Kepala Sekolah', 140, currentY + 35);
    doc.setFont('helvetica', 'normal');
    if (settings?.nipKepalaSekolah) {
      doc.text(`NIP. ${settings.nipKepalaSekolah}`, 140, currentY + 40);
    }
    
    // Catatan Tambahan
    if (settings?.catatanTambahan) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const splitCatatan = doc.splitTextToSize(`Catatan: ${settings.catatanTambahan}`, 170);
      doc.text(splitCatatan, 20, 260);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(110, 110, 110); // Muted gray color
    doc.text(`Dicetak pada: ${dateStr}`, 20, 287);
    doc.setTextColor(0, 0, 0); // Reset color to black
    
    doc.save(`Bukti_Diterima_${data.noPendaftaran}.pdf`);
  };

  const printDokumenDaftarUlang = (data: any) => {
    if (!data) return;
    
    const doc = new jsPDF();
    let currentY = 20;
    
    // PAGE 1: FORMULIR DAFTAR ULANG
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PEMERINTAH KOTA TASIKMALAYA', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.text('DINAS PENDIDIKAN', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.setFontSize(13);
    doc.text('SDN CITAPEN TASIKMALAYA', 105, currentY, { align: 'center' });
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Otto Iskandardinata No.12, Citapen, Kec. Tawang, Kota Tasikmalaya, Jawa Barat 46115', 105, currentY, { align: 'center' });
    currentY += 4;
    doc.line(20, currentY, 190, currentY);
    doc.line(20, currentY + 0.5, 190, currentY + 0.5);
    currentY += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMULIR DAFTAR ULANG PESERTA DIDIK BARU (SPMB)', 105, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`TAHUN AJARAN 2026/2027`, 105, currentY, { align: 'center' });
    currentY += 12;
    
    doc.setFontSize(10);
    const renderRow1 = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 25, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(':', 75, currentY);
      doc.text(value || '________________________________________________', 80, currentY);
      currentY += 8;
    };
    
    renderRow1('No. Pendaftaran', data.noPendaftaran || '-');
    renderRow1('Nama Lengkap', data.namaLengkap || '-');
    renderRow1('NIK Siswa', data.NIK || '________________________________________________');
    renderRow1('No. KK', data['No. KK'] || '________________________________________________');
    renderRow1('No. Akta Kelahiran', data['No. Akta Kelahiran'] || '________________________________________________');
    renderRow1('Tempat, Tanggal Lahir', (data['Tempat Lahir'] || '____________________') + ', ' + (data['Tanggal Lahir'] || '____________________'));
    renderRow1('Jenis Kelamin', data['Jenis Kelamin'] || '____________________');
    renderRow1('Alamat Calon Siswa', data.Alamat || '________________________________________________');
    renderRow1('Nama Orang Tua / Wali', data['Nama Orang Tua'] || '____________________');
    renderRow1('No. WhatsApp Aktif', data['No HP'] || '____________________');
    
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('PERNYATAAN DAFTAR ULANG:', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    const statementText = 'Saya yang bertanda tangan di bawah ini menyatakan dengan sadar dan sungguh-sungguh melakukan daftar ulang di SDN Citapen sebagai Calon Siswa Baru Tahun Ajaran 2026/2027 dan siap membawa semua dokumen persyaratan pendukung.';
    const splitStatement = doc.splitTextToSize(statementText, 170);
    doc.text(splitStatement, 20, currentY);
    currentY += splitStatement.length * 5 + 15;
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tempat = settings?.tempatSurat || 'Tasikmalaya';
    const tanggal = settings?.tanggalSurat ? safeFormatDate(settings.tanggalSurat, false) : dateStr;
    
    doc.text(`${tempat}, ${tanggal}`, 130, currentY);
    currentY += 6;
    doc.text('Panitia Penerimaan,', 25, currentY);
    doc.text('Orang Tua / Wali Murid,', 130, currentY);
    currentY += 24;
    doc.line(25, currentY, 70, currentY);
    doc.line(130, currentY, 180, currentY);
    doc.text('( Panitia SPMB )', 25, currentY + 4);
    doc.text(`( ${data['Nama Orang Tua'] || '____________________'} )`, 130, currentY + 4);
    
    // PAGE 2: SURAT PERNYATAAN MENAATI TATA TERTIB SEKOLAH
    doc.addPage();
    currentY = 20;
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT PERNYATAAN ORANG TUA / WALI SISWA', 105, currentY, { align: 'center' });
    currentY += 5;
    doc.setFontSize(10);
    doc.text('TENTANG KESEDIAAN MENYETUJUI TATA TERTIB SEKOLAH', 105, currentY, { align: 'center' });
    currentY += 4;
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Saya yang bertanda tangan di bawah ini:', 20, currentY);
    currentY += 8;
    
    renderRow1('Nama Lengkap Orang Tua', data['Nama Orang Tua'] || '____________________');
    renderRow1('Alamat Orang Tua', data.Alamat || '________________________________________________');
    renderRow1('Nomor Telp/HP', data['No HP'] || '____________________');
    renderRow1('Merupakan Orang Tua dari', data.namaLengkap || '____________________');
    renderRow1('No. Pendaftaran SPMB', data.noPendaftaran || '-');
    
    currentY += 6;
    doc.text('Menyatakan dengan sesungguhnya bahwa selaku Orang Tua/Wali siap untuk:', 20, currentY);
    currentY += 8;
    
    const rules = [
      '1. Membimbing dan memastikan putra-putri kami mematuhi seluruh peraturan sekolah.',
      '2. Mendukung secara penuh seluruh program pendidikan dan kurikulum di SDN Citapen.',
      '3. Berkomunikasi dengan sopan dan menyelesaikan setiap kendala siswa secara baik dengan Guru.',
      '4. Menghadiri pertemuan, rapat komite, dan undangan resmi sekolah tepat waktu.',
      '5. Mengawasi absensi dan ketertiban belajar siswa demi meraih prestasi belajar yang maksimal.'
    ];
    
    rules.forEach((rule) => {
      const splitRule = doc.splitTextToSize(rule, 170);
      doc.text(splitRule, 20, currentY);
      currentY += splitRule.length * 6;
    });
    
    currentY += 8;
    doc.text('Demikian surat pernyataan ini kami buat secara sukarela, sadar, dan bertandatangan di atas materai untuk dipergunakan dalam pemberkasan daftar ulang siswa baru.', 20, currentY);
    currentY += 20;
    
    doc.text(`${tempat}, ${tanggal}`, 130, currentY);
    currentY += 6;
    doc.text('Mengetahui / Siswa,', 25, currentY);
    doc.text('Orang Tua / Wali,', 130, currentY);
    currentY += 6;
    doc.setFontSize(8);
    doc.text('Materai Rp 10.000', 130, currentY);
    doc.setFontSize(10);
    currentY += 18;
    
    doc.line(25, currentY, 70, currentY);
    doc.line(130, currentY, 180, currentY);
    
    doc.text(`( ${data.namaLengkap || '____________________'} )`, 25, currentY + 4);
    doc.text(`( ${data['Nama Orang Tua'] || '____________________'} )`, 130, currentY + 4);
    
    doc.save(`Dokumen_Sekolah_DaftarUlang_${data.noPendaftaran}.pdf`);
  };

  const safeFormatDate = (dateString?: string, includeTime: boolean = true) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    const formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const hasTime = dateString.includes('T') || dateString.includes(':') || dateString.includes(' ');
    
    if (hasTime && includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${formattedDate} pukul ${hours}:${minutes} WIB`;
    }
    return formattedDate;
  };

  const getStatusDisplay = (status: string, data?: any) => {
    let displayStatus = status;
    if (settings?.tanggalPengumuman) {
      const pengumumanDate = new Date(settings.tanggalPengumuman);
      if (!isNaN(pengumumanDate.getTime())) {
        const now = new Date();
        const hasTime = settings.tanggalPengumuman.includes('T') || settings.tanggalPengumuman.includes(':');
        if (!hasTime) {
          pengumumanDate.setHours(0, 0, 0, 0);
        }
        if (now < pengumumanDate) {
          displayStatus = 'Proses';
        }
      }
    }

    switch (displayStatus) {
      case 'Lulus':
        return (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 md:p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-green-800 mb-2">Selamat! Anda Diterima</h3>
            <p className="text-green-700 mb-6 font-medium">Anda dinyatakan DITERIMA seleksi SPMB Online {settings?.namaSekolah || 'SDN Citapen'}.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left mb-6">
              {/* Left Column: Requirements */}
              <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 font-semibold text-xs mb-4 flex items-start gap-2.5">
                    <span className="bg-red-200 text-red-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">!</span>
                    <span>Calon siswa wajib membawa seluruh berkas fisik persyaratan lengkap & dokumen sekolah ketika daftar ulang ke sekolah.</span>
                  </div>
                  
                  <h4 className="font-bold text-green-800 mb-2 text-sm uppercase tracking-wide">Persyaratan Daftar Ulang (Wajib Dibawa):</h4>
                  {settings?.tanggalDaftarUlang && (
                    <p className="text-sm text-green-700 mb-3 font-semibold">
                      Jadwal Daftar Ulang: {safeFormatDate(settings.tanggalDaftarUlang)}
                    </p>
                  )}
                  <div className="text-sm text-slate-700 whitespace-pre-line space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-155 leading-relaxed font-sans">
                    {(settings?.persyaratanDaftarUlang || '1. Membawa Bukti Diterima yang dicetak\n2. Membawa Fotokopi Akta Kelahiran (2 lembar)\n3. Membawa Fotokopi Kartu Keluarga (2 lembar)\n4. Membawa Pas Foto 3x4 (4 lembar)\n5. Melakukan pembayaran administrasi awal').replace(/Bukti Kelulusan/g, 'Bukti Diterima')}
                  </div>
                </div>
              </div>

              {/* Right Column: Google Drive Downloads & Rapat Orang Tua */}
              <div className="space-y-6 flex flex-col justify-start">
                {settings?.googleDriveDaftarUlang && (() => {
                  const parseGoogleDriveLinks = (val?: string) => {
                    if (!val) return [];
                    const trimmed = val.trim();
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                      try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                          return parsed.map((item: any, index) => {
                            if (typeof item === 'object' && item !== null && item.url) {
                              return {
                                label: item.label || `Link Dokumen ${index + 1}`,
                                url: item.url.trim()
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
                      } catch (e) {
                        console.warn("JSON parse failed", e);
                      }
                    }
                    
                    // Backwards compatibility with comma or newline separated plain URLs
                    const urls = trimmed.split(/[\n,;]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
                    if (urls.length > 0) {
                      return urls.map((url, idx) => ({
                        label: urls.length === 1 ? 'Buka Google Drive Berkas Resmi' : `Unduh Dokumen ${idx + 1}`,
                        url
                      }));
                    }
                    
                    if (trimmed) {
                      return [{
                        label: 'Buka Google Drive Berkas Resmi',
                        url: trimmed
                      }];
                    }
                    return [];
                  };

                  const links = parseGoogleDriveLinks(settings.googleDriveDaftarUlang);
                  if (links.length === 0) return null;

                  return (
                    <div className="p-5 rounded-2xl border border-indigo-200 bg-white text-indigo-900 shadow-sm flex-1">
                      <h5 className="font-bold flex items-center gap-2 text-indigo-900 text-sm">
                        <Download size={16} /> Berkas yang harus diunduh dan dicetak ({links.length})
                      </h5>
                      <p className="text-xs text-indigo-700 mt-1 mb-3.5 leading-relaxed">
                        Silakan unduh dokumen/formulir tambahan resmi di bawah melalui Google Drive, cetak mandiri di rumah, dan bawa saat melakukan pendaftaran ulang fisik ke sekolah:
                      </p>
                      <div className="flex flex-col gap-2 mt-2">
                        {links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold px-4 py-3 rounded-xl transition-colors border border-indigo-150 shadow-xs"
                          >
                            <span className="flex items-center gap-2">
                              <Download size={14} className="text-indigo-600" />
                              {link.label}
                            </span>
                            <ArrowRight size={14} className="text-indigo-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {settings?.isRapatAktif && (
                  <div className="p-5 rounded-2xl border border-amber-200 bg-white text-slate-800 shadow-sm flex-1">
                    <h5 className="font-bold flex items-center gap-2 text-amber-800 text-sm">
                      <Calendar size={16} /> {settings.rapatJudul || "Pemberitahuan Rapat Orang Tua"}
                    </h5>
                    <div className="text-xs text-slate-700 space-y-2 mt-2 leading-relaxed">
                      <p>{settings.rapatDeskripsi}</p>
                      <div className="pt-3 select-none font-semibold text-slate-800 grid grid-cols-1 gap-1 border-t border-amber-150 mt-2 text-xs">
                         <div>📅 <b>Hari / Tanggal:</b> {formatRapatTanggal(settings.rapatTanggal) || "Sabtu, 11 Juli 2026"}</div>
                         <div>⏰ <b>Waktu:</b> {settings.rapatWaktu || "08:00 WIB s.d Selesai"}</div>
                         <div>📍 <b>Tempat:</b> {settings.rapatTempat || "Aula SDN Citapen"}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={() => printBuktiLulus(data)}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-2/3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-98 uppercase tracking-wide text-xs md:text-sm"
              >
                <Printer size={18} /> Cetak Bukti Diterima
              </button>
            </div>
          </div>
        );
      case 'Tidak Lulus':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-red-800 mb-2">Mohon Maaf, Anda Tidak Diterima</h3>
            <p className="text-red-700 mb-4">Tetap semangat dan jangan menyerah.</p>
            {data?.alasanPenolakan && (
              <div className="bg-white rounded-lg p-4 border border-red-100 text-left">
                <h4 className="font-semibold text-red-800 mb-1 text-sm">Alasan:</h4>
                 <p className="text-sm text-red-700 whitespace-pre-line">{data.alasanPenolakan}</p>
              </div>
            )}
          </div>
        );
      default:
        const parsePengumuman = settings?.tanggalPengumuman ? new Date(settings.tanggalPengumuman) : null;
        const hasTime = settings?.tanggalPengumuman ? (settings.tanggalPengumuman.includes('T') || settings.tanggalPengumuman.includes(':')) : false;
        const compareDate = parsePengumuman ? new Date(parsePengumuman) : null;
        if (compareDate && !hasTime) {
          compareDate.setHours(0, 0, 0, 0);
        }
        const isBeforePengumuman = compareDate && !isNaN(compareDate.getTime()) && new Date() < compareDate;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="text-amber-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-amber-800 mb-2">Data Sedang Diproses</h3>
            <p className="text-amber-700">
              {isBeforePengumuman 
                ? `Pengumuman hasil seleksi penerimaan akan dibuka pada tanggal ${safeFormatDate(settings.tanggalPengumuman)}.` 
                : 'Berkas Anda sedang dalam tahap verifikasi panitia.'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className={cn("w-full transition-all duration-500 ease-in-out", result && result.status === 'Lulus' ? "max-w-5xl" : "max-w-2xl")}>
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium">
          <ArrowLeft size={16} className="mr-1" /> Kembali ke Beranda
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-2">Cek Status Penerimaan</h2>
            <p className="text-blue-100 text-sm">Masukkan nomor pendaftaran Anda untuk melihat hasil seleksi SPMB.</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSearch} className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nomor Pendaftaran</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={noPendaftaran}
                  onChange={(e) => setNoPendaftaran(e.target.value)}
                  className="flex-grow px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Contoh: SPMB-2026/2027-H8K3"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-70 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>
            </form>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 p-4 rounded-xl text-sm text-center border border-red-100">
                {error}
              </motion.div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500 mb-1">No. Pendaftaran</span>
                      <span className="font-semibold text-slate-900">{result.noPendaftaran}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1">Nama Lengkap</span>
                      <span className="font-semibold text-slate-900">{result.namaLengkap}</span>
                    </div>
                  </div>
                </div>
                
                {getStatusDisplay(result.status, result)}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
