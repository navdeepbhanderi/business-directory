import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Locale = 'en' | 'ar';

interface NotificationSettings {
  offers: boolean;
  reviewsOnBookmarked: boolean;
  locationPromotions: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

interface UIState {
  theme: Theme;
  locale: Locale;
  mapView: boolean;
  filtersOpen: boolean;
  notifications: NotificationSettings;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleMapView: () => void;
  setFiltersOpen: (open: boolean) => void;
  setNotifications: (notifications: NotificationSettings) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      locale: 'en',
      mapView: false,
      filtersOpen: false,
      notifications: {
        offers: true,
        reviewsOnBookmarked: true,
        locationPromotions: false,
        frequency: 'instant',
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
      },
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      toggleMapView: () => set((state) => ({ mapView: !state.mapView })),
      setFiltersOpen: (open) => set({ filtersOpen: open }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'ui-storage',
    }
  )
);