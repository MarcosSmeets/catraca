import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "organizer";
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "catraca-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
