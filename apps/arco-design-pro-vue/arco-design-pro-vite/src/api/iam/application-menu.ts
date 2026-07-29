import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export interface ApplicationMenuItem {
  id: string;
  applicationId: string;
  parentId: string | null;
  name: string;
  path: string | null;
  icon: string | null;
  permissionCode: string | null;
  sort: number;
  children?: ApplicationMenuItem[];
}

export interface ApplicationMenuForm {
  parentId?: string;
  name: string;
  path?: string;
  icon?: string;
  sort?: number;
  permissionCode?: string;
}

export const getApplicationMenus = (applicationId: string, tree = false) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/menus`, {
      params: tree ? { tree: 'true' } : undefined,
    })
    .then((body) => unwrapIamPayload<ApplicationMenuItem[]>(body));

export const createApplicationMenu = (
  applicationId: string,
  data: ApplicationMenuForm
) =>
  http
    .post<unknown>(`/api/applications/${applicationId}/menus`, { data })
    .then((body) => unwrapIamPayload<ApplicationMenuItem>(body));

export const updateApplicationMenu = (
  applicationId: string,
  id: string,
  data: Partial<ApplicationMenuForm>
) =>
  http
    .request<unknown>(
      'patch',
      `/api/applications/${applicationId}/menus/${id}`,
      { data }
    )
    .then((body) => unwrapIamPayload<ApplicationMenuItem>(body));

export const deleteApplicationMenu = (applicationId: string, id: string) =>
  http.request<unknown>(
    'delete',
    `/api/applications/${applicationId}/menus/${id}`
  );
