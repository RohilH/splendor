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

const USER_FILE_PATH = path.resolve(process.cwd(), "server/data/users.json");

const normalizeUsername = (username: string): string =>
  username.trim().toLowerCase();

const ensureUserFile = async (): Promise<void> => {
  await fs.mkdir(path.dirname(USER_FILE_PATH), { recursive: true });

  try {
    await fs.access(USER_FILE_PATH);
  } catch {
    const initialPayload: UserFilePayload = { users: [] };
    await fs.writeFile(USER_FILE_PATH, JSON.stringify(initialPayload, null, 2), "utf-8");
  }
};

const readUsers = async (): Promise<UserRecord[]> => {
  await ensureUserFile();
  const fileContents = await fs.readFile(USER_FILE_PATH, "utf-8");
  const parsed = JSON.parse(fileContents) as UserFilePayload;
  return parsed.users;
};

const writeUsers = async (users: UserRecord[]): Promise<void> => {
  const payload: UserFilePayload = { users };
  await fs.writeFile(USER_FILE_PATH, JSON.stringify(payload, null, 2), "utf-8");
};

export class UserStore {
  public async getByUsername(username: string): Promise<UserRecord | null> {
    const users = await readUsers();
    const usernameKey = normalizeUsername(username);
    return users.find((user) => user.usernameKey === usernameKey) ?? null;
  }

  public async getById(userId: string): Promise<UserRecord | null> {
    const users = await readUsers();
    return users.find((user) => user.id === userId) ?? null;
  }

  public async create(input: {
    id: string;
    username: string;
    passwordHash: string;
  }): Promise<UserRecord> {
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
  }
}

export type { UserRecord };
