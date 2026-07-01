import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSettings, AppSettings, getInitialMockSettings } from '../services/api';

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  refreshSettings: (directSettings?: AppSettings) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const cached = localStorage.getItem('app_settings_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse cached settings", e);
      }
    }
    return getInitialMockSettings();
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async (directSettings?: AppSettings) => {
    if (directSettings) {
      setSettings(directSettings);
      localStorage.setItem('app_settings_cache', JSON.stringify(directSettings));
      return;
    }
    
    try {
      const data = await getSettings();
      setSettings(data);
      localStorage.setItem('app_settings_cache', JSON.stringify(data));
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Poll settings every 5 seconds so all open devices sync changes (like Maintenance mode) in near real-time
    // Disable background settings polling when the active route is in the admin panel to prevent overwriting active edits.
    const interval = setInterval(() => {
      if (!window.location.pathname.startsWith('/admin')) {
        fetchSettings();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Sync browser favicon with configured school logo or custom favicon link dynamically
  useEffect(() => {
    if (settings) {
      const faviconUrl = settings.faviconSekolah || settings.logoSekolah || '/favicon.svg';
      const faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = faviconUrl;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
