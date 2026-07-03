import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";
import type { Paginated } from "./identity-auth";

export interface ProfileItem {
  id: string;
  userId: string;
  nickname?: string | null;
  avatar?: string | null;
  gender: string;
  birthday?: string | null;
  language: string;
  timezone: string;
  bio?: string | null;
  user?: { email?: string | null; name?: string | null };
}

export interface ProfileForm {
  userId: string;
  nickname?: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  language?: string;
  timezone?: string;
  bio?: string;
}

export const getProfiles = (params?: { page?: number; pageSize?: number; userId?: string }) =>
  http.get<unknown>("/api/profiles", { params }).then(body => unwrapIamPayload<Paginated<ProfileItem>>(body));

export const createProfile = (data: ProfileForm) =>
  http.post<unknown>("/api/profiles", { data }).then(body => unwrapIamPayload<ProfileItem>(body));

export const updateProfile = (id: string, data: Partial<ProfileForm>) =>
  http.request<unknown>("patch", `/api/profiles/${id}`, { data }).then(body => unwrapIamPayload<ProfileItem>(body));

export const deleteProfile = (id: string) => http.request<unknown>("delete", `/api/profiles/${id}`);
