import Cookies from 'js-cookie';
import storageLocal from '@/utils/storage-local';
import { resetAuthSessionTerminatedState } from '@/utils/auth-session-state';
import { TokenKey, multipleTabsKey } from '@/utils/auth-cookie-keys';

export { TokenKey, multipleTabsKey };

export interface DataInfo<T> {
  accessToken: string;
  expires: T;
  refreshToken: string;
  avatar?: string;
  username?: string;
  nickname?: string;
  roles?: Array<string>;
  permissions?: Array<string>;
}

export const userKey = 'user-info';

export function getToken(): DataInfo<number> | null {
  let fromCookie: DataInfo<number> | null = null;
  const rawCookie = Cookies.get(TokenKey);
  if (rawCookie) {
    try {
      fromCookie = JSON.parse(rawCookie) as DataInfo<number>;
    } catch {
      fromCookie = null;
    }
  }
  const fromLs = storageLocal().getItem<DataInfo<number>>(userKey);

  if (fromCookie?.accessToken) {
    return fromCookie;
  }
  if (fromLs?.accessToken && fromLs.refreshToken) {
    return {
      ...fromLs,
      accessToken: fromLs.accessToken,
      refreshToken: fromLs.refreshToken,
      expires: fromLs.expires,
    };
  }
  return fromCookie ?? fromLs ?? null;
}

export function setToken(data: DataInfo<Date>) {
  resetAuthSessionTerminatedState();
  const { accessToken, refreshToken } = data;
  const expires = new Date(data.expires).getTime();
  const cookieString = JSON.stringify({ accessToken, expires, refreshToken });

  if (expires > 0) {
    Cookies.set(TokenKey, cookieString, {
      expires: (expires - Date.now()) / 86400000,
    });
  } else {
    Cookies.set(TokenKey, cookieString);
  }

  Cookies.set(multipleTabsKey, 'true');

  const existing = storageLocal().getItem<DataInfo<number>>(userKey);
  storageLocal().setItem(userKey, {
    accessToken,
    refreshToken,
    expires,
    avatar: data.avatar ?? existing?.avatar ?? '',
    username: data.username ?? existing?.username ?? '',
    nickname: data.nickname ?? existing?.nickname ?? '',
    roles: data.roles ?? existing?.roles ?? [],
    permissions: data.permissions ?? existing?.permissions ?? [],
  });
}

export function removeToken() {
  Cookies.remove(TokenKey);
  Cookies.remove(multipleTabsKey);
  storageLocal().removeItem(userKey);
}

export const clearToken = removeToken;

export const isLogin = () => !!getToken()?.accessToken;

export const formatToken = (token: string): string => `Bearer ${token}`;

/** 兼容旧 interceptor：返回 accessToken 字符串 */
export const getAccessToken = (): string | null =>
  getToken()?.accessToken ?? null;

export function hasPerms(value: string | Array<string>): boolean {
  if (!value) return false;
  const allPerms = '*:*:*';
  const token = getToken();
  const permissions = token?.permissions ?? [];
  if (!permissions.length) return false;
  if (permissions.length === 1 && permissions[0] === allPerms) return true;
  if (typeof value === 'string') {
    return permissions.includes(value);
  }
  return value.every((v) => permissions.includes(v));
}
