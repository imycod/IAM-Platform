import {
  portalLogin,
  portalRefreshToken,
  type PortalLoginData,
  type PortalTokenPayload,
} from '@/utils/http/portal-auth';

export type UserResult = {
  success: boolean;
  data: PortalTokenPayload;
};

export type RefreshTokenResult = {
  success: boolean;
  data: Pick<PortalTokenPayload, 'accessToken' | 'refreshToken' | 'expires'>;
};

export type LoginData = PortalLoginData;

/** IAM 门户登录 */
export const getLogin = (data?: LoginData) =>
  portalLogin(data ?? { username: '', password: '' }).then(
    (payload) => ({ success: true, data: payload } as UserResult)
  );

/** 刷新 access_token */
export const refreshTokenApi = (data: { refreshToken: string }) =>
  portalRefreshToken(data.refreshToken).then(
    (payload) => ({ success: true, data: payload } as RefreshTokenResult)
  );

export type { UserResult as IamUserResult };
