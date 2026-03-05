import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMultiplayerServer } from "../../createServer";

const listen = (server: ReturnType<typeof createMultiplayerServer>["server"]) =>
  new Promise<number>((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
    server.once("error", reject);
  });

const closeServer = (server: ReturnType<typeof createMultiplayerServer>["server"]) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

describe("auth routes", () => {
  let userStoreFilePath = "";
  let serverInstance: ReturnType<typeof createMultiplayerServer> | null = null;

  beforeEach(() => {
    userStoreFilePath = `/tmp/splendor-auth-routes-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.json`;
    process.env.USER_STORE_FILE = userStoreFilePath;
  });

  afterEach(async () => {
    if (serverInstance) {
      await closeServer(serverInstance.server);
      serverInstance = null;
    }
    await fs.rm(userStoreFilePath, { force: true });
    delete process.env.USER_STORE_FILE;
  });

  it("registers, logs in, and resolves /me", async () => {
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const username = `auth_route_user_${Date.now()}`;
    const password = "password123";

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    expect(registerResponse.status).toBe(201);
    const registerPayload = (await registerResponse.json()) as {
      token: string;
      user: { id: string; username: string };
    };

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    expect(loginResponse.status).toBe(200);
    const loginPayload = (await loginResponse.json()) as {
      token: string;
      user: { id: string; username: string };
    };
    expect(loginPayload.user.id).toBe(registerPayload.user.id);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginPayload.token}`,
      },
    });
    expect(meResponse.status).toBe(200);
    const mePayload = (await meResponse.json()) as {
      user: { id: string; username: string };
    };
    expect(mePayload.user.id).toBe(registerPayload.user.id);
  });

  it("rejects unauthorized /me requests", async () => {
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/auth/me`);
    expect(response.status).toBe(401);
  });
});
