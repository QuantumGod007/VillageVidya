import { writeFile } from "node:fs/promises";
import { localConfig } from "./local.mjs";
const config = localConfig();
// Only public browser configuration. Refuse to overwrite existing local choices.
await writeFile(
  ".env.local",
  `VITE_APP_MODE=supabase\nVITE_SUPABASE_URL=${config.url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${config.publicKey}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Created ignored .env.local with public client configuration only. Restart Vite.",
);
