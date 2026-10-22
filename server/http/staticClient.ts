import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const clientDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../dist"
);

const isApiOrSocketPath = (requestPath: string): boolean =>
  requestPath === "/ws" ||
  requestPath.startsWith("/ws/") ||
  requestPath === "/api" ||
  requestPath.startsWith("/api/");

/**
 * Serves the built frontend from `dist/` when it exists, with an SPA fallback,
 * so a single deployment can host the game client and multiplayer backend on
 * one origin. When `dist/` is absent (local dev uses the Vite server), this is
 * a no-op.
 */
export const attachStaticClient = (app: express.Express): boolean => {
  const indexHtmlPath = path.join(clientDistDir, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    return false;
  }

  app.use(express.static(clientDistDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || isApiOrSocketPath(req.path)) {
      next();
      return;
    }

    res.sendFile(indexHtmlPath);
  });

  return true;
};
