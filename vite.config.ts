import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {
  assistantHttpResponse,
  createAssistantService,
  environmentFrom,
  parseAssistantBody,
} from "./server/assistant";

async function requestBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > 8_000) return null;
    chunks.push(value);
  }
  return parseAssistantBody(Buffer.concat(chunks));
}

function localAssistantApi(environment: ReturnType<typeof environmentFrom>) {
  const service = createAssistantService({ environment });
  return {
    name: "village-vidya-local-assistant-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/assistant", async (request, response) => {
        const body = await requestBody(request);
        const result = await assistantHttpResponse(
          request.method,
          body,
          request.headers,
          service,
        );
        response.statusCode = result.status;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = environmentFrom({
    ...process.env,
    ...loadEnv(mode, process.cwd(), ""),
  });
  return {
    plugins: [react(), tailwindcss(), localAssistantApi(environment)],
    test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], css: false },
    build: { chunkSizeWarningLimit: 600 },
  };
});
