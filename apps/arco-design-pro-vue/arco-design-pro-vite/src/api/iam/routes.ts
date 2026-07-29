import http from '@/utils/http';
import { unwrapPortalResponse } from '@/utils/iam-api';
import IAM_APP_CODE from '@/config/iam';

type Result = {
  success: boolean;
  data: Array<any>;
};

export const getAsyncRoutes = () => {
  return http
    .request<Result>('get', '/api/portal/get-async-routes', {
      params: { appCode: IAM_APP_CODE },
    })
    .then((body) => {
      const routes = unwrapPortalResponse<Array<any>>(body);
      return { success: true, data: routes } as Result;
    });
};
