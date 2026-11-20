import axios from 'axios';
import { getStoredToken, clearSessionStorageOnly } from '../utils/storage';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error?.response?.data?.code;
    if (
      error?.response?.status === 401 &&
      (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'USER_NOT_FOUND')
    ) {
      clearSessionStorageOnly();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('apilocate:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default http;
