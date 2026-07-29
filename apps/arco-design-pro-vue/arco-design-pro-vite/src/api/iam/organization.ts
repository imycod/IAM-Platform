import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export interface OrganizationItem {
  id: string;
  parentId: string | null;
  name: string;
  code: string;
  type: string;
  status: string;
  sort: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationForm {
  name: string;
  code: string;
  parentId?: string | null;
  type?: string;
  status?: string;
  sort?: number;
}

export interface DepartmentItem {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  code: string;
  path: string | null;
  leaderEmployeeId: string | null;
  sort: number;
  createdAt?: string;
}

export interface DepartmentForm {
  organizationId: string;
  name: string;
  code: string;
  parentId?: string | null;
  leaderEmployeeId?: string | null;
  sort?: number;
}

export interface PositionItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  level: number;
  createdAt?: string;
}

export interface PositionForm {
  organizationId: string;
  name: string;
  code: string;
  level?: number;
}

export interface EmployeeItem {
  id: string;
  userId: string;
  organizationId: string;
  departmentId: string | null;
  positionId: string | null;
  employeeNo: string | null;
  status: string;
  hiredAt: string | null;
  userEmail?: string | null;
  userName?: string | null;
  organizationName?: string | null;
  departmentName?: string | null;
  positionName?: string | null;
}

export interface EmployeeForm {
  userId: string;
  organizationId: string;
  departmentId?: string | null;
  positionId?: string | null;
  employeeNo?: string | null;
  status?: string;
  hiredAt?: string | null;
}

export interface TeamItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  organizationName?: string | null;
  memberCount?: number;
  createdAt?: string;
}

export interface TeamForm {
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
}

export const getOrganizations = () =>
  http
    .get<unknown>('/api/organizations')
    .then((body) => unwrapIamPayload<OrganizationItem[]>(body));

export const createOrganization = (data: OrganizationForm) =>
  http
    .post<unknown>('/api/organizations', { data })
    .then((body) => unwrapIamPayload<OrganizationItem>(body));

export const updateOrganization = (
  id: string,
  data: Partial<OrganizationForm>
) =>
  http
    .request<unknown>('patch', `/api/organizations/${id}`, { data })
    .then((body) => unwrapIamPayload<OrganizationItem>(body));

export const deleteOrganization = (id: string) =>
  http.request<unknown>('delete', `/api/organizations/${id}`);

export const getDepartments = (params?: { organizationId?: string }) =>
  http
    .get<unknown>('/api/departments', { params })
    .then((body) => unwrapIamPayload<DepartmentItem[]>(body));

export const createDepartment = (data: DepartmentForm) =>
  http
    .post<unknown>('/api/departments', { data })
    .then((body) => unwrapIamPayload<DepartmentItem>(body));

export const updateDepartment = (id: string, data: Partial<DepartmentForm>) =>
  http
    .request<unknown>('patch', `/api/departments/${id}`, { data })
    .then((body) => unwrapIamPayload<DepartmentItem>(body));

export const deleteDepartment = (id: string) =>
  http.request<unknown>('delete', `/api/departments/${id}`);

export const getPositions = (params?: { organizationId?: string }) =>
  http
    .get<unknown>('/api/positions', { params })
    .then((body) => unwrapIamPayload<PositionItem[]>(body));

export const createPosition = (data: PositionForm) =>
  http
    .post<unknown>('/api/positions', { data })
    .then((body) => unwrapIamPayload<PositionItem>(body));

export const updatePosition = (id: string, data: Partial<PositionForm>) =>
  http
    .request<unknown>('patch', `/api/positions/${id}`, { data })
    .then((body) => unwrapIamPayload<PositionItem>(body));

export const deletePosition = (id: string) =>
  http.request<unknown>('delete', `/api/positions/${id}`);

export const getEmployees = (params?: {
  organizationId?: string;
  userId?: string;
}) =>
  http
    .get<unknown>('/api/employees', { params })
    .then((body) => unwrapIamPayload<EmployeeItem[]>(body));

export const createEmployee = (data: EmployeeForm) =>
  http
    .post<unknown>('/api/employees', { data })
    .then((body) => unwrapIamPayload<EmployeeItem>(body));

export const updateEmployee = (id: string, data: Partial<EmployeeForm>) =>
  http
    .request<unknown>('patch', `/api/employees/${id}`, { data })
    .then((body) => unwrapIamPayload<EmployeeItem>(body));

export const deleteEmployee = (id: string) =>
  http.request<unknown>('delete', `/api/employees/${id}`);

export const getTeams = (params?: { organizationId?: string }) =>
  http
    .get<unknown>('/api/teams', { params })
    .then((body) => unwrapIamPayload<TeamItem[]>(body));

export const createTeam = (data: TeamForm) =>
  http
    .post<unknown>('/api/teams', { data })
    .then((body) => unwrapIamPayload<TeamItem>(body));

export const updateTeam = (id: string, data: Partial<TeamForm>) =>
  http
    .request<unknown>('patch', `/api/teams/${id}`, { data })
    .then((body) => unwrapIamPayload<TeamItem>(body));

export const deleteTeam = (id: string) =>
  http.request<unknown>('delete', `/api/teams/${id}`);
