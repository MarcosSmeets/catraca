import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthStore } from "@/store/auth";
import type { User } from "./mock-data";

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

async function fetchProfile(): Promise<User> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<User>("/me/profile", { accessToken: token });
}

async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<User>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

async function changePassword(data: ChangePasswordRequest): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  return apiFetch<void>("/users/me/password", {
    method: "PUT",
    body: JSON.stringify(data),
    accessToken: token,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}
