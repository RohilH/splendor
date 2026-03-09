import { getApiUrl } from "./runtimeConfig";

interface ErrorPayload {
  message?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseJson = (input: string): unknown | null => {
  if (!input) {
    return null;
  }

  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

const getErrorMessage = (
  response: Response,
  requestUrl: string,
  payload: ErrorPayload | null,
  rawBody: string
): string => {
  if (payload?.message) {
    return payload.message;
  }

  const responsePreview = rawBody.trim().slice(0, 120);
  if (responsePreview) {
    return `Backend returned a non-JSON ${response.status} response for ${requestUrl}: ${responsePreview}`;
  }

  return `Backend request failed with status ${response.status} for ${requestUrl}.`;
};

export const parseApiResponse = async <T>(
  response: Response,
  requestUrl: string
): Promise<T> => {
  const rawBody = await response.text();
  const parsed = parseJson(rawBody);
  const payload = isObject(parsed) ? (parsed as ErrorPayload & T) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(response, requestUrl, payload, rawBody));
  }

  if (!rawBody) {
    return {} as T;
  }

  if (!payload) {
    throw new Error(
      `Backend returned invalid JSON for ${requestUrl}. Check the deployed API URL and backend logs.`
    );
  }

  return payload as T;
};

export const postJson = async <T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> => {
  const requestUrl = getApiUrl(path);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<T>(response, requestUrl);
};
