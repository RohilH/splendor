const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const normalizeConfiguredUrl = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimTrailingSlash(trimmed);
};

const normalizePath = (path: string): string => (path.startsWith("/") ? path : `/${path}`);

export const getApiBaseUrl = (): string | null =>
  normalizeConfiguredUrl(import.meta.env.VITE_API_BASE_URL);

const getConfiguredWsUrl = (): string | null =>
  normalizeConfiguredUrl(import.meta.env.VITE_WS_BASE_URL);

const deriveSocketUrlFromApiBaseUrl = (apiBaseUrl: string): string => {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.hash = "";
  return trimTrailingSlash(url.toString());
};

export const getApiUrl = (path: string): string => {
  const normalizedPath = normalizePath(path);
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return normalizedPath;
  }

  return `${apiBaseUrl}${normalizedPath}`;
};

export const getSocketUrl = (): string => {
  const configuredWsUrl = getConfiguredWsUrl();
  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (apiBaseUrl) {
    return deriveSocketUrlFromApiBaseUrl(apiBaseUrl);
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
};
