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

  it("creates a session and resolves /me", async () => {
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const username = `auth_route_user_${Date.now()}`;

    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    expect(sessionResponse.status).toBe(201);
    const sessionPayload = (await sessionResponse.json()) as {
      token: string;
      user: { id: string; username: string };
    };

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${sessionPayload.token}`,
      },
    });
    expect(meResponse.status).toBe(200);
    const mePayload = (await meResponse.json()) as {
      user: { id: string; username: string };
    };
    expect(mePayload.user.id).toBe(sessionPayload.user.id);
  });

  it("rejects duplicate usernames", async () => {
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;
    const username = `auth_route_dupe_${Date.now()}`;

    const firstResponse = await fetch(`${baseUrl}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await fetch(`${baseUrl}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.toUpperCase() }),
    });
    expect(duplicateResponse.status).toBe(409);
  });

  it("rejects unauthorized /me requests", async () => {
    serverInstance = createMultiplayerServer();
    const port = await listen(serverInstance.server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/auth/me`);
    expect(response.status).toBe(401);
  });
});
