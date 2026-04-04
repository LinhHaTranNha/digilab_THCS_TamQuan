const DEFAULT_API_BASE_URL = 'https://digilab-thcs-tamquan.onrender.com/api';

function normalizeApiBaseUrl(value) {
  if (!value) {
    return '';
  }

  // Remove trailing slash so route joins are consistent.
  return value.trim().replace(/\/+$/, '');
}

const envApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const API_BASE_URL = envApiBaseUrl || DEFAULT_API_BASE_URL;

export const API_CONFIG = {
  defaultBaseUrl: DEFAULT_API_BASE_URL,
  currentBaseUrl: API_BASE_URL,
};