import type { Request, Response } from "express";
import mongoose from "mongoose";
import { parseEnv } from "../server/src/config/env.js";
import { MemoryCaseStore, MongoCaseStore, type CaseStore } from "../server/src/db/store.js";
import { createApp } from "../server/src/index.js";

let appPromise: Promise<any> | null = null;

async function initializeApp() {
  const env = parseEnv(process.env);
  let store: CaseStore;

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      store = new MongoCaseStore();
      console.log("[vercel-api] Connected to MongoDB");
    } catch (err) {
      console.warn("[vercel-api] MongoDB connection failed, using in-memory store");
      store = new MemoryCaseStore();
    }
  } else {
    store = new MemoryCaseStore();
  }

  return createApp({ env, store });
}

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = initializeApp();
  }
  const app = await appPromise;
  return app(req, res);
}
