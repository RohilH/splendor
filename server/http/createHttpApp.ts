import express from "express";
import cors from "cors";
import { AuthService } from "../auth/authService";

const parseBearerToken = (headerValue: string | undefined): string | null => {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const createHttpApp = (authService: AuthService) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required." });
      return;
    }

    try {
      const result = await authService.register({ username, password });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : "Registration failed.",
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({ message: "Username and password are required." });
      return;
    }

    try {
      const result = await authService.login({ username, password });
      res.json(result);
    } catch (error) {
      res.status(401).json({
        message: error instanceof Error ? error.message : "Login failed.",
      });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const user = await authService.getUserFromToken(token);
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    res.json({ user });
  });

  return app;
};
