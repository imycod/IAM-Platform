export interface ApplicationRoleAccessRoleBrief {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface ApplicationRoleDetailDto {
  id: string;
  applicationId: string;
  name: string;
  code: string;
  accessRoleId: string | null;
  accessRole: ApplicationRoleAccessRoleBrief | null;
  permissionIds: string[];
  permissionCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}
