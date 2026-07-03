import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";

export interface ApplicationItem {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationForm {
  name: string;
  code: string;
  type?: string;
  status?: string;
  description?: string | null;
}

export const getApplications = () =>
  http
    .get<unknown>("/api/applications")
    .then(body => unwrapIamPayload<ApplicationItem[]>(body));

export const createApplication = (data: ApplicationForm) =>
  http
    .post<unknown>("/api/applications", { data })
    .then(body => unwrapIamPayload<ApplicationItem>(body));

export const updateApplication = (id: string, data: Partial<ApplicationForm>) =>
  http
    .request<unknown>("patch", `/api/applications/${id}`, { data })
    .then(body => unwrapIamPayload<ApplicationItem>(body));

export const deleteApplication = (id: string) =>
  http.request<unknown>("delete", `/api/applications/${id}`);
