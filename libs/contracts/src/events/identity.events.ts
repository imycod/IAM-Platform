/**
 * 领域事件常量与负载定义。跨域协作优先走事件（解耦），而非直接注入实现。
 */
export const IdentityEvents = {
  UserRegistered: 'identity.user.registered',
  UserDeleted: 'identity.user.deleted',
  UserStatusChanged: 'identity.user.status_changed',
  UserLoggedIn: 'identity.user.logged_in',
} as const;

export interface UserRegisteredPayload {
  userId: string;
  email?: string | null;
  phone?: string | null;
}

export interface UserDeletedPayload {
  userId: string;
}

export interface UserStatusChangedPayload {
  userId: string;
  status: string;
}

export interface UserLoggedInPayload {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}
