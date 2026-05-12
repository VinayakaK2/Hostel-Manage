import dotenv from "dotenv";

dotenv.config();

const requiredInProduction = ["JWT_SECRET", "DATABASE_URL"];

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return undefined;
  }
  return value;
}

export const env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: Number(getEnv("PORT", "4000")),
  DATABASE_URL: getEnv("DATABASE_URL"),
  JWT_SECRET: getEnv("JWT_SECRET", "dev-only-change-in-production"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "8h"),
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:5173"),
};

if (env.NODE_ENV === "production") {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
