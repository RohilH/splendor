import { promises as fs } from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AuthService } from "../authService";
import { UserStore } from "../userStore";

const tempUserStorePath = () =>
  `/tmp/splendor-auth-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`;

describe("AuthService", () => {
  let userStorePath = "";
  let authService: AuthService;

  beforeEach(() => {
    userStorePath = tempUserStorePath();
    authService = new AuthService(new UserStore(userStorePath));
  });

  afterEach(async () => {
    await fs.rm(userStorePath, { force: true });
    const backupFiles = await fs.readdir("/tmp");
    const matchingBackups = backupFiles
      .filter((fileName) => fileName.startsWith(`${userStorePath.split("/").pop()}.corrupt-`))
      .map((fileName) => `/tmp/${fileName}`);
    await Promise.all(matchingBackups.map((filePath) => fs.rm(filePath, { force: true })));
  });

  it("creates a session for a unique username", async () => {
    const session = await authService.createSession({
      username: "AuthUser",
    });

    expect(session.user.username).toBe("AuthUser");
    expect(session.token).toBeTypeOf("string");
  });

  it("rejects duplicate usernames", async () => {
    await authService.createSession({
      username: "DupeUser",
    });

    await expect(
      authService.createSession({
        username: "dupeuser",
      })
    ).rejects.toThrow("Username is already taken.");
  });

  it("resolves user from token and handles invalid token", async () => {
    const registration = await authService.createSession({
      username: "TokenUser",
    });

    const fromToken = await authService.getUserFromToken(registration.token);
    expect(fromToken?.id).toBe(registration.user.id);

    const invalid = await authService.getUserFromToken("not-a-token");
    expect(invalid).toBeNull();
  });

  it("requires a username", async () => {
    await expect(
      authService.createSession({
        username: "   ",
      })
    ).rejects.toThrow("Username is required.");
  });
});
