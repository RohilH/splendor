import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { UserStore } from "./userStore";
import { getEnvConfig } from "../config/env";

const JWT_EXPIRY = "14d";

interface AuthUser {
  id: string;
  username: string;
}

interface JwtPayload {
  userId: string;
}

export class AuthService {
  private readonly userStore: UserStore;
  private readonly jwtSecret = getEnvConfig().jwtSecret;

  public constructor(userStore?: UserStore) {
    this.userStore = userStore ?? new UserStore();
  }

  public async createSession(input: { username: string }): Promise<{ token: string; user: AuthUser }> {
    const username = input.username.trim();

    if (!username) {
      throw new Error("Username is required.");
    }

    const userRecord = await this.userStore.create({
      id: nanoid(16),
      username,
    });

    const user: AuthUser = { id: userRecord.id, username: userRecord.username };
    const token = this.signToken(user.id);

    return { token, user };
  }

  public async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      const userRecord = await this.userStore.getById(decoded.userId);
      if (!userRecord) {
        return null;
      }

      return {
        id: userRecord.id,
        username: userRecord.username,
      };
    } catch {
      return null;
    }
  }

  private signToken(userId: string): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: JWT_EXPIRY });
  }
}

export type { AuthUser };
