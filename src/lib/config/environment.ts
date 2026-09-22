const removeTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = removeTrailingSlashes(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
);

export const REALTIME_BASE_URL = removeTrailingSlashes(
  import.meta.env.VITE_REALTIME_BASE_URL || 'http://localhost:8081',
);
