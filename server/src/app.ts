import path from "node:path";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import mongoose from "mongoose";
import { parseEnv } from "./config/env.js";
import { MemoryCaseStore, MongoCaseStore, type CaseStore } from "./db/store.js";
import { createApp } from "./index.js";

const env = parseEnv(process.env);
let store: CaseStore;

if (process.env.MONGODB_URI) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    store = new MongoCaseStore();
    console.log("[db] connected to MongoDB");
  } catch {
    console.warn("[db] MongoDB unreachable, using in-memory store");
    store = new MemoryCaseStore();
  }
} else {
  store = new MemoryCaseStore();
}

const app = createApp({ env, store });

export default app;
