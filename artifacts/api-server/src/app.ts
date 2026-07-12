import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { UPLOADS_DIR, ensureUploadsDir } from "./lib/storage";
import { createRateLimit } from "./middlewares/rate-limit";

const app: Express = express();
ensureUploadsDir();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api",
  createRateLimit({
    id: "api-global",
    max: 240,
    windowMs: 60_000,
    skip: (req) => req.path === "/healthz",
  }),
);

app.use(
  "/uploads",
  express.static(UPLOADS_DIR, { maxAge: "1d", index: false }),
);
app.use("/api", router);

// Serves the built SPA in production, when bundled alongside the frontend's
// build output (see build.mjs / Railway deploy). Absent in local dev, where
// Vite serves the frontend separately and proxies /api to this server.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(
  currentDir,
  "..",
  "..",
  "wedding-invitation",
  "dist",
  "public",
);
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

export default app;
