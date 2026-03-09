import { Router } from "express";
import type { AuthService } from "../auth/authService";

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

export const createAuthRoutes = (authService: AuthService): Router => {
  const router = Router();

  router.post("/session", async (req, res) => {
    const { username } = req.body as {
      username?: string;
    };

    if (!username) {
      res.status(400).json({ message: "Username is required." });
      return;
    }

    try {
      const result = await authService.createSession({ username });
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create session.";
      res.status(message === "Username is already taken." ? 409 : 400).json({
        message,
      });
    }
  });

  router.get("/me", async (req, res) => {
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

  return router;
};
