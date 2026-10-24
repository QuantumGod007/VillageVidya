import { spawn } from "node:child_process";
import { readFile, writeFile, rename } from "node:fs/promises";
import { format } from "prettier";
const path = "src/lib/data-access/database.types.ts";
const child = spawn(
  process.platform === "win32"
    ? "node_modules/.bin/supabase.cmd"
    : "node_modules/.bin/supabase",
  ["gen", "types", "typescript", "--local", "--schema", "public"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
let content = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  content += chunk;
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
const code = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0 || !content.includes("export type Database ="))
  throw new Error("Type generation failed; existing types were preserved.");
content = await format(content, { parser: "typescript" });
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== content)
    throw new Error(
      "Generated types differ. Run npm run db:types and commit the result.",
    );
} else {
  await writeFile(`${path}.tmp`, content);
  await rename(`${path}.tmp`, path);
}
