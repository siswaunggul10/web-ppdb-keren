import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRapatTanggal(dateStr: string): string {
  if (!dateStr) return '';
  // Check if it's already in Indonesian format or contains day names like "Senin", "Selasa", etc.
  const indonesianDays = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
  const lowerStr = dateStr.toLowerCase();
  if (indonesianDays.some(day => lowerStr.includes(day))) {
    return dateStr;
  }

  // Try to parse it as a date
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(date);
  } catch (e) {
    return dateStr;
  }
}

