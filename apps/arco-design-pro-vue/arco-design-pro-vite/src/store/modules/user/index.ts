import { defineStore } from 'pinia';
import {
  getLogin,
  refreshTokenApi,
  type LoginData,
  type RefreshTokenResult,
  type UserResult,
} from '@/api/iam/portal-user';
import { setToken, removeToken, getToken, userKey } from '@/utils/auth';
import storageLocal from '@/utils/storage-local';
import type { DataInfo } from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import { UserState, RoleType } from './types';
import useAppStore from '../app';

const useUserStore = defineStore('user', {
  state: (): UserState => {
    const cached = storageLocal().getItem<DataInfo<number>>(userKey);
    return {
      name: cached?.nickname || cached?.username || undefined,
      avatar: cached?.avatar || undefined,
      job: undefined,
      organization: undefined,
      location: undefined,
      email: undefined,
      introduction: undefined,
      personalWebsite: undefined,
      jobName: undefined,
      organizationName: undefined,
      locationName: undefined,
      phone: undefined,
      registrationDate: undefined,
      accountId: undefined,
      certification: undefined,
      role: (cached?.roles?.[0] || '') as RoleType,
      roles: cached?.roles ?? [],
      permissions: cached?.permissions ?? [],
    };
  },

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },
  },

  actions: {
    switchRoles() {
      return new Promise((resolve) => {
        this.role = this.role === 'user' ? 'admin' : 'user';
        resolve(this.role);
      });
    },

    setInfo(partial: Partial<UserState>) {
      this.$patch(partial);
    },

    resetInfo() {
      this.$reset();
    },

    syncFromToken() {
      const token = getToken();
      if (!token) return;
      this.setInfo({
        name: token.nickname || token.username,
        avatar: token.avatar,
        role: (token.roles?.[0] || 'admin') as RoleType,
        roles: token.roles ?? [],
        permissions: token.permissions ?? [],
      });
    },

    async info() {
      this.syncFromToken();
    },

    async login(loginForm: LoginData) {
      const res = await getLogin(loginForm);
      if (res?.success && res.data) {
        setToken(res.data);
        this.syncFromToken();
      }
      return res;
    },

    async handRefreshToken(data: {
      refreshToken: string;
    }): Promise<RefreshTokenResult> {
      const res = await refreshTokenApi(data);
      if (res?.data) {
        setToken(res.data);
      }
      return res;
    },

    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      removeToken();
      removeRouteListener();
      appStore.clearServerMenu();
    },

    async logoutLocal() {
      this.logoutCallBack();
    },

    async logout() {
      this.logoutCallBack();
    },
  },
});

export default useUserStore;
