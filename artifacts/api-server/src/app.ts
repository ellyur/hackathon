import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { sessionMiddleware } from "./lib/session.js";

const app: Express = express();

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

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use("/api", router);

// Centralised JSON error handler — must be last middleware
app.use(
  (
    err: Error & { status?: number; statusCode?: number },
    _req: import("express").Request,
    res: import("express").Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: import("express").NextFunction,
  ) => {
    const status = err.status ?? err.statusCode ?? 500;
    logger.error({ err }, "Unhandled error");
    res.status(status).json({ error: err.message ?? "Internal server error" });
  },
);

export default app;
