import express from "express";
import cors from "cors";
import { AuthService } from "../auth/authService";
import { createAuthRoutes } from "./authRoutes";

export const createHttpApp = (authService: AuthService) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", createAuthRoutes(authService));

  return app;
};
