export interface UserRoleAssignmentRoleBrief {
  id: string;
  name: string;
  code: string;
  applicationId: string | null;
  type: string;
}

export interface UserRoleAssignmentUserBrief {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface UserRoleAssignmentItem {
  id: string;
  userId: string;
  roleId: string;
  applicationId: string | null;
  createdAt: Date;
  role: UserRoleAssignmentRoleBrief;
  user: UserRoleAssignmentUserBrief;
}
