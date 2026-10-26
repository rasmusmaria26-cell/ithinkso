import path from "node:path";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
import { parseEnv } from "./config/env.js";
import { MemoryCaseStore } from "./db/store.js";
import { createApp } from "./index.js";
const env = parseEnv(process.env);
const store = new MemoryCaseStore();
const app = createApp({ env, store });
export default app;
//# sourceMappingURL=app.js.map