import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  correlationId?: string;
  timestamp?: string;
}

export interface ApiErrorPayload {
  success: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

const TOKEN_KEY = 'unihub_access_token';
const REFRESH_KEY = 'unihub_refresh_token';
const USER_KEY = 'unihub_user';

// Base URL points to Gateway root (e.g. http://localhost:8080)
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const API_ORIGIN = rawBase.replace(/\/api\/?$/, '');

export const http = axios.create({
  baseURL: API_ORIGIN,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setStoredSession(accessToken: string, refreshToken: string, userJson: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, userJson);
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Correlation-Id'] = crypto.randomUUID();
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  try {
    const res = await axios.post<
      ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
        user: unknown;
      }>
    >(`${API_ORIGIN}/api/v1/auth/refresh`, { refreshToken });

    const { accessToken, refreshToken: newRefresh, user } = res.data.data;
    setStoredSession(accessToken, newRefresh, JSON.stringify(user));
    return accessToken;
  } catch {
    clearStoredSession();
    return null;
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/api/v1/auth/login') &&
      !original.url?.includes('/api/v1/auth/refresh')
    ) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const nextToken = await refreshPromise;
      if (nextToken) {
        original.headers.Authorization = `Bearer ${nextToken}`;
        return http(original);
      }
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi hệ thống'): string {
  if (axios.isAxiosError<ApiErrorPayload>(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  return fallback;
}
