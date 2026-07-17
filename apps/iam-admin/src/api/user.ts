import { http } from "@/utils/http";
import { unwrapPortalResponse } from "@/utils/iam-api";
import { handleAuthSessionTerminatedIfNeeded } from "@/utils/auth-session-terminated";

export type UserResult = {
  success: boolean;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  success: boolean;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

/** 登录 */
export const getLogin = (data?: object) => {
  return http
    .request<{ success?: boolean; data?: UserResult["data"] }>(
      "post",
      "/api/portal/login",
      {
        data: { ...data, appCode: "iam-admin" }
      }
    )
    .then(body => {
      const payload = unwrapPortalResponse<UserResult["data"]>(body);
      return { success: true, data: payload } as UserResult;
    });
};

/** 刷新 access_token（IAM 门户：OIDC refresh_token 或账密 session 续期） */
export const refreshTokenApi = (data: { refreshToken: string }) => {
  return http
    .request<{ success?: boolean; data?: RefreshTokenResult["data"] }>(
      "post",
      "/api/portal/refresh-token",
      {
        data: { ...data, appCode: "iam-admin" }
      }
    )
    .then(body => {
      const payload = unwrapPortalResponse<RefreshTokenResult["data"]>(body);
      return { success: true, data: payload } as RefreshTokenResult;
    })
    .catch(async error => {
      await handleAuthSessionTerminatedIfNeeded(error);
      return Promise.reject(error);
    });
};
