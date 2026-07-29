import type { RouteRecordNormalized } from 'vue-router';

import type { IamMenuRoute } from '@/router/utils/iam-routes';

export interface AppState {
  theme: string;
  colorWeak: boolean;
  navbar: boolean;
  menu: boolean;
  topMenu: boolean;
  hideMenu: boolean;
  menuCollapse: boolean;
  footer: boolean;
  themeColor: string;
  menuWidth: number;
  globalSettings: boolean;
  device: string;
  tabBar: boolean;
  menuFromServer: boolean;
  serverMenu: RouteRecordNormalized[];
  serverMenuRaw: IamMenuRoute[];
  [key: string]: unknown;
}
