import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";
import type { Paginated } from "./identity-auth";

export interface DeviceItem {
  id: string;
  userId: string;
  deviceName?: string | null;
  deviceType: string;
  os?: string | null;
  browser?: string | null;
  fingerprint?: string | null;
  trusted: boolean;
  lastActiveAt?: string | null;
  user?: { email?: string | null; name?: string | null };
}

export interface DeviceForm {
  userId: string;
  deviceName?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  fingerprint?: string;
  trusted?: boolean;
}

export const getDevices = (params?: { page?: number; pageSize?: number; userId?: string }) =>
  http.get<unknown>("/api/devices", { params }).then(body => unwrapIamPayload<Paginated<DeviceItem>>(body));

export const createDevice = (data: DeviceForm) =>
  http.post<unknown>("/api/devices", { data }).then(body => unwrapIamPayload<DeviceItem>(body));

export const updateDevice = (id: string, data: Partial<DeviceForm>) =>
  http.request<unknown>("patch", `/api/devices/${id}`, { data }).then(body => unwrapIamPayload<DeviceItem>(body));

export const deleteDevice = (id: string) => http.request<unknown>("delete", `/api/devices/${id}`);
