import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  type UserResult,
  type RefreshTokenResult,
  getLogin,
  refreshTokenApi
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import { type DataInfo, setToken, removeToken, userKey } from "@/utils/auth";
import {
  clearLocalSsoSession,
  clearOidcPkceState,
  performGlobalLogout,
  revokeCurrentOidcAccessToken,
  skipAutoSso
} from "@/utils/oidc";
import {
  clearLoginMethod,
  isSsoSession,
  setLoginMethod
} from "@/utils/login-session";

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? [],
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data) {
      return new Promise<UserResult>((resolve, reject) => {
        getLogin(data)
          .then(data => {
            if (data?.success) {
              setLoginMethod("password");
              setToken(data.data);
            }
            resolve(data);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 本地登出：仅清本应用 token（IdP 全局登出或其它 Tab 同步时调用） */
    async logOutLocal() {
      if (isSsoSession()) {
        await revokeCurrentOidcAccessToken();
      }
      skipAutoSso();
      clearLoginMethod();
      this.username = "";
      this.roles = [];
      this.permissions = [];
      removeToken();
      clearLocalSsoSession();
      clearOidcPkceState();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    },
    /** IAM 管理后台：SSO 退出 = 全局登出（所有接入系统同步退出） */
    logOut() {
      if (isSsoSession()) {
        this.logOutGlobal();
      } else {
        this.logOutLocal();
      }
    },
    /** 退出统一登录（销毁 IdP SSO 会话，并同步登出其它已接入应用） */
    logOutGlobal() {
      if (isSsoSession()) {
        performGlobalLogout();
      } else {
        this.logOutLocal();
      }
    },
    /** 刷新`token` */
    async handRefreshToken(data) {
      return new Promise<RefreshTokenResult>((resolve, reject) => {
        refreshTokenApi(data)
          .then(data => {
            if (data) {
              setToken(data.data);
              resolve(data);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
