import { promises as fs } from "node:fs";
import path from "node:path";

interface UserRecord {
  id: string;
  username: string;
  usernameKey: string;
  passwordHash: string;
  createdAt: string;
}

interface UserFilePayload {
  users: UserRecord[];
}

const getUserFilePath = (): string => {
  const configuredPath = process.env.USER_STORE_FILE;
  if (configuredPath) {
    return path.resolve(configuredPath);
  }
  return path.resolve(process.cwd(), "server/data/users.json");
};

const normalizeUsername = (username: string): string =>
  username.trim().toLowerCase();

const ensureUserFile = async (): Promise<void> => {
  const userFilePath = getUserFilePath();
  await fs.mkdir(path.dirname(userFilePath), { recursive: true });

  try {
    await fs.access(userFilePath);
  } catch {
    const initialPayload: UserFilePayload = { users: [] };
    await fs.writeFile(userFilePath, JSON.stringify(initialPayload, null, 2), "utf-8");
  }
};

const readUsers = async (): Promise<UserRecord[]> => {
  const userFilePath = getUserFilePath();
  await ensureUserFile();
  const fileContents = await fs.readFile(userFilePath, "utf-8");

  try {
    const parsed = JSON.parse(fileContents) as UserFilePayload;
    return parsed.users;
  } catch {
    const backupPath = `${userFilePath}.corrupt-${Date.now()}`;
    await fs.copyFile(userFilePath, backupPath);
    const initialPayload: UserFilePayload = { users: [] };
    await fs.writeFile(userFilePath, JSON.stringify(initialPayload, null, 2), "utf-8");
    return [];
  }
};

const writeUsers = async (users: UserRecord[]): Promise<void> => {
  const userFilePath = getUserFilePath();
  const tempPath = `${userFilePath}.tmp`;
  const payload: UserFilePayload = { users };
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf-8");
  await fs.rename(tempPath, userFilePath);
};

export class UserStore {
  private static lock: Promise<void> = Promise.resolve();

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const runOperation = UserStore.lock.then(operation);
    UserStore.lock = runOperation.then(
      () => undefined,
      () => undefined
    );
    return runOperation;
  }

  public async getByUsername(username: string): Promise<UserRecord | null> {
    return this.withLock(async () => {
      const users = await readUsers();
      const usernameKey = normalizeUsername(username);
      return users.find((user) => user.usernameKey === usernameKey) ?? null;
    });
  }

  public async getById(userId: string): Promise<UserRecord | null> {
    return this.withLock(async () => {
      const users = await readUsers();
      return users.find((user) => user.id === userId) ?? null;
    });
  }

  public async create(input: {
    id: string;
    username: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    return this.withLock(async () => {
      const users = await readUsers();
      const username = input.username.trim();
      const usernameKey = normalizeUsername(username);

      const existing = users.find((user) => user.usernameKey === usernameKey);
      if (existing) {
        throw new Error("Username is already taken.");
      }

      const userRecord: UserRecord = {
        id: input.id,
        username,
        usernameKey,
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
      };

      users.push(userRecord);
      await writeUsers(users);
      return userRecord;
    });
  }
}

export type { UserRecord };
