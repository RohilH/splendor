import { afterEach, describe, expect, it } from "vitest";
import { parseApiResponse } from "../httpClient";
import { getApiUrl, getSocketUrl } from "../runtimeConfig";

const originalApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const originalWsBaseUrl = import.meta.env.VITE_WS_BASE_URL;

const setRuntimeEnv = (values: {
  apiBaseUrl?: string | undefined;
  wsBaseUrl?: string | undefined;
}): void => {
  const env = import.meta.env as Record<string, string | undefined>;
  if (values.apiBaseUrl === undefined) {
    delete env.VITE_API_BASE_URL;
  } else {
    env.VITE_API_BASE_URL = values.apiBaseUrl;
  }

  if (values.wsBaseUrl === undefined) {
    delete env.VITE_WS_BASE_URL;
  } else {
    env.VITE_WS_BASE_URL = values.wsBaseUrl;
  }
};

describe("runtimeConfig", () => {
  afterEach(() => {
    setRuntimeEnv({
      apiBaseUrl: originalApiBaseUrl,
      wsBaseUrl: originalWsBaseUrl,
    });
  });

  it("builds API urls from VITE_API_BASE_URL", () => {
    setRuntimeEnv({
      apiBaseUrl: "https://api.example.com/",
      wsBaseUrl: undefined,
    });

    expect(getApiUrl("/api/auth/session")).toBe("https://api.example.com/api/auth/session");
  });

  it("derives websocket url from VITE_API_BASE_URL when VITE_WS_BASE_URL is unset", () => {
    setRuntimeEnv({
      apiBaseUrl: "https://api.example.com/base/",
      wsBaseUrl: undefined,
    });

    expect(getSocketUrl()).toBe("wss://api.example.com/ws");
  });

  it("prefers VITE_WS_BASE_URL when configured", () => {
    setRuntimeEnv({
      apiBaseUrl: "https://api.example.com",
      wsBaseUrl: "wss://ws.example.com/socket",
    });

    expect(getSocketUrl()).toBe("wss://ws.example.com/socket");
  });
});

describe("parseApiResponse", () => {
  it("returns parsed JSON for successful responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

    await expect(parseApiResponse<{ ok: boolean }>(response, "/api/health")).resolves.toEqual({
      ok: true,
    });
  });

  it("surfaces non-JSON backend errors without JSON parse failures", async () => {
    const response = new Response("The page could not be found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });

    await expect(parseApiResponse(response, "/api/auth/session")).rejects.toThrow(
      "Backend returned a non-JSON 404 response"
    );
  });
});
