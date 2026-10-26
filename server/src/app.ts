import path from "node:path";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import mongoose from "mongoose";
import type { Request, Response } from "express";
import { parseEnv } from "./config/env.js";
import { MemoryCaseStore, MongoCaseStore, type CaseStore } from "./db/store.js";
import { createApp } from "./index.js";

let appInstance: any = null;

async function getOrCreateApp() {
  if (appInstance) return appInstance;

  const env = parseEnv(process.env);
  let store: CaseStore;

  const mongoUri = process.env.MONGODB_URI;
  const isRemoteMongo = mongoUri && !mongoUri.includes("127.0.0.1") && !mongoUri.includes("localhost");

  if (isRemoteMongo) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      store = new MongoCaseStore();
      console.log("[db] connected to remote MongoDB");
    } catch (err) {
      console.warn("[db] MongoDB unreachable, falling back to memory store:", err);
      store = new MemoryCaseStore();
    }
  } else {
    store = new MemoryCaseStore();
  }

  appInstance = createApp({ env, store });
  return appInstance;
}

export default async function handler(req: Request, res: Response) {
  try {
    const app = await getOrCreateApp();
    return app(req, res);
  } catch (err: any) {
    console.error("[server-boot-error]", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "server_initialization_error",
        message: err?.message || "Server initialization failed",
      });
    }
  }
}
