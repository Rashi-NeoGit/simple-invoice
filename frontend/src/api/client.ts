import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

export const ACCESS_TOKEN_STORAGE_KEY = 'simpleinvoice.accessToken';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error?.response?.status === 401;
    const alreadyOnLogin = window.location.pathname === '/login';
    if (isUnauthorized && !alreadyOnLogin) {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
