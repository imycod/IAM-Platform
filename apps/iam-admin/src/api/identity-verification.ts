import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";
import type { Paginated } from "./identity-auth";

export interface VerificationItem {
  id: string;
  identifier: string;
  value: string;
  type: string;
  expiresAt: string;
  consumedAt?: string | null;
  createdAt?: string;
}

export interface VerificationForm {
  identifier: string;
  value: string;
  type: string;
  ttlSeconds?: number;
  expiresAt?: string;
}

export const getVerifications = (params?: {
  page?: number;
  pageSize?: number;
  identifier?: string;
  type?: string;
}) =>
  http
    .get<unknown>("/api/verifications", { params })
    .then(body => unwrapIamPayload<Paginated<VerificationItem>>(body));

export const createVerification = (data: VerificationForm) =>
  http
    .post<unknown>("/api/verifications", { data })
    .then(body => unwrapIamPayload<VerificationItem>(body));

export const updateVerification = (id: string, data: Partial<VerificationForm & { consumedAt?: string }>) =>
  http
    .request<unknown>("patch", `/api/verifications/${id}`, { data })
    .then(body => unwrapIamPayload<VerificationItem>(body));

export const deleteVerification = (id: string) =>
  http.request<unknown>("delete", `/api/verifications/${id}`);
