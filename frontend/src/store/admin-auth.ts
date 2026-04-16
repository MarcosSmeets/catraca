import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "organizer" | "staff" | "platform_admin";
  organizationId?: string | null;
}

interface AdminAuthState {
  adminUser: AdminUser | null;
  adminToken: string | null;
  setAdminAuth: (user: AdminUser, token: string) => void;
  clear: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      adminUser: null,
      adminToken: null,
      setAdminAuth: (adminUser, adminToken) => set({ adminUser, adminToken }),
      clear: () => set({ adminUser: null, adminToken: null }),
    }),
    {
      name: "catraca-admin-auth",
      partialize: (state) => ({
        adminUser: state.adminUser,
        adminToken: state.adminToken,
      }),
    }
  )
);
