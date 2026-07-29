import Axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { stringify } from 'qs';
import { getToken, formatToken } from '@/utils/auth';
import { refreshAccessToken } from '@/utils/http/portal-auth';
import {
  extractAuthSessionTerminatedFromBody,
  extractAuthSessionTerminatedMessage,
  handleAuthSessionTerminatedIfNeeded,
  tagAuthSessionTerminatedError,
} from '@/utils/auth-session-terminated';
import {
  flushRefreshQueue,
  shouldRefreshAccessToken,
  type RefreshQueueItem,
} from '@/utils/token-refresh';
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig,
} from './types.d';

const defaultConfig: AxiosRequestConfig = {
  timeout: 10000,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  paramsSerializer: (params) => stringify(params),
};

const refreshQueue: RefreshQueueItem[] = [];
let isRefreshing = false;
const initConfig: PureHttpRequestConfig = {};
const axiosInstance: AxiosInstance = Axios.create(defaultConfig);

function retryOriginalRequest(config: PureHttpRequestConfig) {
  return new Promise((resolve, reject) => {
    refreshQueue.push({
      resolve: (token: string) => {
        if (!config.headers) config.headers = {};
        config.headers.Authorization = formatToken(token);
        resolve(config);
      },
      reject,
    });
  });
}

function setupRequestInterceptor(): void {
  axiosInstance.interceptors.request.use(
    async (config: PureHttpRequestConfig): Promise<any> => {
      if (typeof config.beforeRequestCallback === 'function') {
        config.beforeRequestCallback(config);
        return config;
      }
      if (initConfig.beforeRequestCallback) {
        initConfig.beforeRequestCallback(config);
        return config;
      }

      const whiteList = [
        '/api/portal/refresh-token',
        '/refresh-token',
        '/login',
        '/api/portal/login',
      ];
      if (whiteList.some((url) => config.url?.endsWith(url))) {
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
          (data?.expires !== undefined &&
            shouldRefreshAccessToken(data.expires));

        if (!needsRefresh && accessToken) {
          if (!config.headers) config.headers = {};
          config.headers.Authorization = formatToken(accessToken);
          resolve(config);
          return;
        }

        if (!refreshToken) {
          resolve(config);
          return;
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshAccessToken(refreshToken)
            .then((newAccessToken) => {
              flushRefreshQueue(refreshQueue, {
                ok: true,
                accessToken: newAccessToken,
              });
            })
            .catch(async (refreshError) => {
              if (extractAuthSessionTerminatedMessage(refreshError)) {
                tagAuthSessionTerminatedError(refreshError);
              }
              await handleAuthSessionTerminatedIfNeeded(refreshError);
              flushRefreshQueue(refreshQueue, {
                ok: false,
                error: refreshError,
              });
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        retryOriginalRequest(config)
          .then((resolved) => resolve(resolved))
          .catch((err) => reject(err));
      });
    },
    (error) => Promise.reject(error)
  );
}

function setupResponseInterceptor(): void {
  axiosInstance.interceptors.response.use(
    (response: PureHttpResponse) => {
      const terminated = extractAuthSessionTerminatedFromBody(response.data);
      if (terminated) {
        const err = Object.assign(new Error(terminated), {
          config: response.config,
          response,
          isAxiosError: true,
        });
        tagAuthSessionTerminatedError(err);
        handleAuthSessionTerminatedIfNeeded(err).catch(() => undefined);
        return Promise.reject(err);
      }
      const $config = response.config;
      if (typeof $config.beforeResponseCallback === 'function') {
        $config.beforeResponseCallback(response);
        return response.data;
      }
      if (initConfig.beforeResponseCallback) {
        initConfig.beforeResponseCallback(response);
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

function sendRequest<T>(config: PureHttpRequestConfig): Promise<T> {
  return axiosInstance
    .request(config)
    .then((data) => data as T)
    .catch((error) => Promise.reject(error));
}

function request<T>(
  method: RequestMethods,
  url: string,
  param?: AxiosRequestConfig,
  axiosConfig?: PureHttpRequestConfig
): Promise<T> {
  const config = {
    method,
    url,
    ...param,
    ...axiosConfig,
  } as PureHttpRequestConfig;

  return sendRequest<T>(config);
}

function post<T = unknown>(
  url: string,
  params?: AxiosRequestConfig,
  config?: PureHttpRequestConfig
): Promise<T> {
  return request<T>('post', url, params, config);
}

function get<T = unknown>(
  url: string,
  params?: AxiosRequestConfig,
  config?: PureHttpRequestConfig
): Promise<T> {
  return request<T>('get', url, params, config);
}

setupRequestInterceptor();
setupResponseInterceptor();

const http = {
  request,
  post,
  get,
};

export default http;
