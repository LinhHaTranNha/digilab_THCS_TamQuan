const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8001/api';

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = envApiBaseUrl || DEFAULT_API_BASE_URL;

export const API_CONFIG = {
  defaultBaseUrl: DEFAULT_API_BASE_URL,
  currentBaseUrl: API_BASE_URL,
};