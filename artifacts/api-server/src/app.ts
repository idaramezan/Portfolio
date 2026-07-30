import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get(["/studio-letter", "/studio-mail"], (request, response) => {
  const queryIndex = request.originalUrl.indexOf("?");
  const query = queryIndex >= 0 ? request.originalUrl.slice(queryIndex) : "";
  return response.redirect(301, `/newsletter${query}`);
});

// Serve uploaded artwork images
const uploadsDir =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use(
  "/api/uploads",
  express.static(uploadsDir, { maxAge: "1y", immutable: true }),
);

app.use("/api", router);
app.use(
  (
    error: Error & { code?: string },
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (error.code === "LIMIT_FILE_SIZE")
      return response
        .status(413)
        .json({ error: "Each uploaded file must be 5 MB or smaller" });
    if (error.code === "LIMIT_FILE_COUNT")
      return response
        .status(400)
        .json({ error: "A campaign can contain at most 20 stickers" });
    return next(error);
  },
);

if (process.env.NODE_ENV === "production") {
  // The API and built portfolio are deployed together as one Railway service.
  const frontendCandidates = [
    path.resolve(process.cwd(), "artifacts/aida-portfolio/dist/public"),
    path.resolve(process.cwd(), "../aida-portfolio/dist/public"),
  ];
  const frontendDir =
    frontendCandidates.find((candidate) =>
      fs.existsSync(path.join(candidate, "index.html")),
    ) || frontendCandidates[0];
  app.get(["/favicon.png", "/apple-touch-icon.png"], (request, response) => {
    response.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response.sendFile(path.join(frontendDir, request.path.slice(1)));
  });
  app.use(
    express.static(frontendDir, {
      maxAge: "1y",
      immutable: true,
      index: false,
    }),
  );
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/"))
      return next();
    response.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return response.sendFile(path.join(frontendDir, "index.html"));
  });
}

export default app;
