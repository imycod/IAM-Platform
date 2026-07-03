import { http } from "@/utils/http";
import { unwrapPortalResponse } from "@/utils/iam-api";

type Result = {
  success: boolean;
  data: Array<any>;
};

export const getAsyncRoutes = () => {
  return http
    .request<Result>("get", "/api/portal/get-async-routes", {
      params: { appCode: "iam-admin" }
    })
    .then(body => {
      const routes = unwrapPortalResponse<Array<any>>(body);
      return { success: true, data: routes } as Result;
    });
};
