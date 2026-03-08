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

  it("registers and logs in a user", async () => {
    const registration = await authService.register({
      username: "AuthUser",
      password: "password123",
    });

    expect(registration.user.username).toBe("AuthUser");
    expect(registration.token).toBeTypeOf("string");

    const login = await authService.login({
      username: "AuthUser",
      password: "password123",
    });

    expect(login.user.id).toBe(registration.user.id);
    expect(login.token).toBeTypeOf("string");
  });

  it("rejects duplicate username registration", async () => {
    await authService.register({
      username: "DupeUser",
      password: "password123",
    });

    await expect(
      authService.register({
        username: "dupeuser",
        password: "password123",
      })
    ).rejects.toThrow("Username is already taken.");
  });

  it("resolves user from token and handles invalid token", async () => {
    const registration = await authService.register({
      username: "TokenUser",
      password: "password123",
    });

    const fromToken = await authService.getUserFromToken(registration.token);
    expect(fromToken?.id).toBe(registration.user.id);

    const invalid = await authService.getUserFromToken("not-a-token");
    expect(invalid).toBeNull();
  });

  it("enforces minimum password length", async () => {
    await expect(
      authService.register({
        username: "ShortPass",
        password: "123",
      })
    ).rejects.toThrow("Password must be at least 6 characters.");
  });
});
