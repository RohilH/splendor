import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { UserStore } from "./userStore";
import { getEnvConfig } from "../config/env";

const JWT_EXPIRY = "14d";
const MIN_PASSWORD_LENGTH = 6;

interface AuthUser {
  id: string;
  username: string;
}

interface JwtPayload {
  userId: string;
}

export class AuthService {
  private readonly userStore = new UserStore();
  private readonly jwtSecret = getEnvConfig().jwtSecret;

  public async register(input: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const username = input.username.trim();
    const password = input.password.trim();

    if (!username) {
      throw new Error("Username is required.");
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRecord = await this.userStore.create({
      id: nanoid(16),
      username,
      passwordHash,
    });

    const user: AuthUser = { id: userRecord.id, username: userRecord.username };
    const token = this.signToken(user.id);

    return { token, user };
  }

  public async login(input: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const username = input.username.trim();
    const password = input.password.trim();

    const userRecord = await this.userStore.getByUsername(username);
    if (!userRecord) {
      throw new Error("Invalid username or password.");
    }

    const passwordMatches = await bcrypt.compare(password, userRecord.passwordHash);
    if (!passwordMatches) {
      throw new Error("Invalid username or password.");
    }

    const token = this.signToken(userRecord.id);
    return {
      token,
      user: {
        id: userRecord.id,
        username: userRecord.username,
      },
    };
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
