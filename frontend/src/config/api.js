const DEFAULT_API_BASE_URL = 'https://digilab-thcs-tamquan.onrender.com/api';
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8001/api';

function detectBaseUrl() {
  const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envApiBaseUrl) return envApiBaseUrl;

  const host = window?.location?.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return LOCAL_API_BASE_URL;
  }

  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = detectBaseUrl();

export const API_CONFIG = {
  defaultBaseUrl: DEFAULT_API_BASE_URL,
  localBaseUrl: LOCAL_API_BASE_URL,
  currentBaseUrl: API_BASE_URL,
};
