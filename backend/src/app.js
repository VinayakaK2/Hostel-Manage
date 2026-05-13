import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./auth/auth.routes.js";
import adminRoutes from "./admin/admin.routes.js";
import wardenRoutes from "./warden/warden.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Parse the CORS_ORIGIN env var — supports comma-separated list of allowed origins
// e.g. "https://hostel-manage-pi.vercel.app,https://hostel-manage-cp2w.vercel.app"
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    // Allow any origin that appears in the whitelist; reject all others
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/warden", wardenRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});

app.use(errorHandler);

export default app;
