import { en } from './en';
import { ar } from './ar';

export type Locale = 'en' | 'ar';

export const translations = {
  en,
  ar,
};

export const useLocale = () => {
  const { locale, setLocale } = useUIStore();
  
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = (translations as any)[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
  
  return { t, locale, setLocale };
};

// Import useUIStore here to avoid circular dependency
import { useUIStore } from '@/store/uiSlice';