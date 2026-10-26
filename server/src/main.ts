/**
 * Server entry point. Everything that can fail at boot fails here, by name,
 * before a single request is handled.
 */

import path from "node:path";
import dotenv from "dotenv";

// Load .env from current directory, and also parent directory if launched from server subfolder
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
import mongoose from "mongoose";
import { parseEnv, EnvError } from "./config/env.js";
import { MemoryCaseStore, MongoCaseStore } from "./db/store.js";
import type { CaseStore } from "./db/store.js";
import { createApp } from "./index.js";

async function main(): Promise<void> {
  let env;
  try {
    env = parseEnv();
  } catch (err) {
    if (err instanceof EnvError) {
      console.error(`\n[boot] ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }

  let store: CaseStore;

  if (env.NODE_ENV === "test") {
    store = new MemoryCaseStore();
  } else {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      store = new MongoCaseStore();
      console.log("[db] connected");
    } catch (err) {
      // Fall back rather than refuse to start: the product still works, cases
      // just will not survive a restart. Say so loudly.
      console.warn(
        `[db] unreachable (${err instanceof Error ? err.name : "error"}). ` +
          `Running with an in-memory store: cases will not persist.`,
      );
      store = new MemoryCaseStore();
    }
  }

  const app = createApp({ env, store });

  app.listen(env.PORT, () => {
    console.log(`[server] http://localhost:${env.PORT}  (${env.NODE_ENV})`);
    console.log(`[server] CORS origin: ${env.CLIENT_ORIGIN}  trust proxy: ${env.TRUST_PROXY}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} — closing`);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(`[boot] ${err instanceof Error ? err.message : "failed"}`);
  process.exit(1);
});
