export interface PermissionApplicationBrief {
  id: string;
  name: string;
  code: string;
}

export interface PermissionDetailDto {
  id: string;
  name: string;
  code: string;
  resource: string;
  action: string;
  applicationId: string | null;
  application: PermissionApplicationBrief | null;
  createdAt: Date;
  updatedAt: Date;
}
