import { apiFetch } from "./api";
import type { AdminUser } from "@/store/admin-auth";

export interface AdminLoginResponse {
  accessToken: string;
  user: AdminUser;
}

export async function adminAuthLogin(email: string, password: string): Promise<AdminLoginResponse> {
  return apiFetch<AdminLoginResponse>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function adminAuthLogout(): Promise<void> {
  await apiFetch<void>("/admin/auth/logout", { method: "POST" });
}
