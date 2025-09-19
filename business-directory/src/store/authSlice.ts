import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'guest' | 'user' | 'owner' | 'admin';

interface User {
  id: string;
  name: string;
  role: UserRole;
  premium?: boolean;
}

interface AuthState {
  role: UserRole;
  userId: string | null;
  premium: boolean;
  user: User | null;
  setRole: (role: UserRole) => void;
  setUserId: (userId: string | null) => void;
  setPremium: (premium: boolean) => void;
  setUser: (user: User | null) => void;
  signIn: (role: UserRole, userId: string) => void;
  signOut: () => void;
}

// Test accounts
const testAccounts = {
  user: {
    id: 'user1',
    name: 'Ahmed Al-Mansoori',
    role: 'user' as UserRole,
    premium: false,
  },
  owner: {
    id: 'owner1',
    name: 'Fatima Al-Zahra',
    role: 'owner' as UserRole,
    premium: true,
  },
  admin: {
    id: 'admin1',
    name: 'Mohammed Al-Sabah',
    role: 'admin' as UserRole,
    premium: false,
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: 'guest',
      userId: null,
      premium: false,
      user: null,
      setRole: (role) => set({ role }),
      setUserId: (userId) => set({ userId }),
      setPremium: (premium) => set({ premium }),
      setUser: (user) => set({ user }),
      signIn: (role, userId) => {
        const user = testAccounts[role as keyof typeof testAccounts];
        set({ 
          role, 
          userId, 
          user,
          premium: user?.premium || false
        });
      },
      signOut: () => set({ role: 'guest', userId: null, premium: false, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);