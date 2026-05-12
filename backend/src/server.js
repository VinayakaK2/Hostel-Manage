import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.PORT, () => {
  // Avoid logging secrets; startup signal only in development.
  if (env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.info(`API listening on port ${env.PORT}`);
  }
});
