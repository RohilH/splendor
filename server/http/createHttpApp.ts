import express from "express";
import cors from "cors";
import { AuthService } from "../auth/authService";
import { createAuthRoutes } from "./authRoutes";
import { isOriginAllowed } from "./originPolicy";

export const createHttpApp = (
  authService: AuthService,
  options: {
    allowedOrigins: string[];
    requestLoggingEnabled: boolean;
  }
) => {
  const app = express();

  if (options.requestLoggingEnabled) {
    app.use((req, res, next) => {
      const startedAt = Date.now();
      res.on("finish", () => {
        console.info(
          `[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`
        );
      });
      next();
    });
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, isOriginAllowed(origin, options.allowedOrigins));
      },
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, wsPath: "/ws" });
  });
  app.use("/api/auth", createAuthRoutes(authService));

  return app;
};
