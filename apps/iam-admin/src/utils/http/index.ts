import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer,
  AxiosError
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getToken, formatToken } from "@/utils/auth";
import { useUserStoreHook } from "@/store/modules/user";
import {
  extractAuthSessionTerminatedFromBody,
  extractAuthSessionTerminatedMessage,
  handleAuthSessionTerminatedIfNeeded,
  tagAuthSessionTerminatedError
} from "@/utils/auth-session-terminated";
import {
  flushRefreshQueue,
  shouldRefreshAccessToken,
  type RefreshQueueItem
} from "@/utils/token-refresh";

const defaultConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  private static refreshQueue: RefreshQueueItem[] = [];

  private static isRefreshing = false;

  private static initConfig: PureHttpRequestConfig = {};

  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  private static retryOriginalRequest(config: PureHttpRequestConfig) {
    return new Promise((resolve, reject) => {
      PureHttp.refreshQueue.push({
        resolve: (token: string) => {
          config.headers["Authorization"] = formatToken(token);
          resolve(config);
        },
        reject
      });
    });
  }

  private static runRefresh(refreshToken: string): Promise<string> {
    return useUserStoreHook()
      .handRefreshToken({ refreshToken })
      .then(res => res.data.accessToken);
  }

  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }

        const whiteList = [
          "/api/portal/refresh-token",
          "/refresh-token",
          "/login",
          "/api/portal/login"
        ];
        if (whiteList.some(url => config.url?.endsWith(url))) {
          return config;
        }

        return new Promise((resolve, reject) => {
          const data = getToken();
          const refreshToken = data?.refreshToken;
          const accessToken = data?.accessToken;

          if (!refreshToken && !accessToken) {
            resolve(config);
            return;
          }

          const needsRefresh =
            !accessToken ||
            (data?.expires !== undefined && shouldRefreshAccessToken(data.expires));

          if (!needsRefresh && accessToken) {
            config.headers["Authorization"] = formatToken(accessToken);
            resolve(config);
            return;
          }

          if (!PureHttp.isRefreshing) {
            PureHttp.isRefreshing = true;
            PureHttp.runRefresh(refreshToken!)
              .then(accessToken => {
                flushRefreshQueue(PureHttp.refreshQueue, { ok: true, accessToken });
              })
              .catch(async refreshError => {
                if (extractAuthSessionTerminatedMessage(refreshError)) {
                  tagAuthSessionTerminatedError(refreshError);
                }
                await handleAuthSessionTerminatedIfNeeded(refreshError);
                flushRefreshQueue(PureHttp.refreshQueue, {
                  ok: false,
                  error: refreshError
                });
              })
              .finally(() => {
                PureHttp.isRefreshing = false;
              });
          }

          PureHttp.retryOriginalRequest(config)
            .then(resolved => resolve(resolved))
            .catch(err => reject(err));
        });
      },
      error => Promise.reject(error)
    );
  }

  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const terminated = extractAuthSessionTerminatedFromBody(response.data);
        if (terminated) {
          const err = new AxiosError(
            terminated,
            AxiosError.ERR_BAD_REQUEST,
            response.config,
            response.request,
            response
          );
          tagAuthSessionTerminatedError(err);
          void handleAuthSessionTerminatedIfNeeded(err);
          return Promise.reject(err);
        }
        const $config = response.config;
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        return response.data;
      },
      async (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        if (extractAuthSessionTerminatedMessage($error)) {
          tagAuthSessionTerminatedError($error);
          await handleAuthSessionTerminatedIfNeeded($error);
        }
        return Promise.reject($error);
      }
    );
  }

  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();
