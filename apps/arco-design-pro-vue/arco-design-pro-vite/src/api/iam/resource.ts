import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export interface ResourceItem {
  id: string;
  name: string;
  code: string;
  type: string | null;
  attributes: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceForm {
  name: string;
  code: string;
  type?: string;
  attributes?: Record<string, unknown> | null;
}

export const getResources = (params?: {
  code?: string;
  name?: string;
  type?: string;
}) =>
  http
    .get<unknown>('/api/resources', { params })
    .then((body) => unwrapIamPayload<ResourceItem[]>(body));

export const getResource = (id: string) =>
  http
    .get<unknown>(`/api/resources/${id}`)
    .then((body) => unwrapIamPayload<ResourceItem>(body));

export const createResource = (data: ResourceForm) =>
  http
    .post<unknown>('/api/resources', { data })
    .then((body) => unwrapIamPayload<ResourceItem>(body));

export const updateResource = (id: string, data: Partial<ResourceForm>) =>
  http
    .request<unknown>('patch', `/api/resources/${id}`, { data })
    .then((body) => unwrapIamPayload<ResourceItem>(body));

export const deleteResource = (id: string) =>
  http.request<unknown>('delete', `/api/resources/${id}`);

export const syncResourcesFromPermissions = () =>
  http
    .post<unknown>('/api/resources/sync-from-permissions')
    .then((body) =>
      unwrapIamPayload<{ created: number; skipped: number }>(body)
    );
