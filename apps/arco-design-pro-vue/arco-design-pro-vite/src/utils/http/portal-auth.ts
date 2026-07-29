import Axios from 'axios';
import { stringify } from 'qs';
import IAM_APP_CODE from '@/config/iam';
import { unwrapPortalResponse } from '@/utils/iam-api';
import { setToken } from '@/utils/auth';

/** 登录/刷新专用客户端，不走 IAM 拦截器，避免与 http 循环依赖 */
const authClient = Axios.create({
  timeout: 10000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  },
  paramsSerializer: (params) => stringify(params),
});

export type PortalLoginData = {
  username: string;
  password: string;
};

export type PortalTokenPayload = {
  avatar: string;
  username: string;
  nickname: string;
  roles: Array<string>;
  permissions: Array<string>;
  accessToken: string;
  refreshToken: string;
  expires: Date;
};

export async function portalLogin(data: PortalLoginData) {
  const { data: body } = await authClient.post('/api/portal/login', {
    ...data,
    appCode: IAM_APP_CODE,
  });
  return unwrapPortalResponse<PortalTokenPayload>(body);
}

export async function portalRefreshToken(refreshToken: string) {
  const { data: body } = await authClient.post('/api/portal/refresh-token', {
    refreshToken,
    appCode: IAM_APP_CODE,
  });
  return unwrapPortalResponse<
    Pick<PortalTokenPayload, 'accessToken' | 'refreshToken' | 'expires'>
  >(body);
}

/** 供 http 拦截器调用：刷新 accessToken 并持久化 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const payload = await portalRefreshToken(refreshToken);
  setToken(payload as PortalTokenPayload);
  return payload.accessToken;
}
