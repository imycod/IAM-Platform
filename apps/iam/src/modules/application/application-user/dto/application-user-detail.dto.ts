import { ApplicationUserStatus } from '../entities/application-user.entity';

export interface ApplicationUserUserBrief {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  status: string;
}

export interface ApplicationUserApplicationBrief {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface ApplicationUserRoleBrief {
  id: string;
  name: string;
  code: string;
  accessRoleId: string | null;
}

export interface ApplicationUserDetailDto {
  id: string;
  applicationId: string;
  userId: string;
  applicationRoleId: string | null;
  status: ApplicationUserStatus | string;
  grantedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: ApplicationUserUserBrief | null;
  application: ApplicationUserApplicationBrief | null;
  applicationRole: ApplicationUserRoleBrief | null;
}
