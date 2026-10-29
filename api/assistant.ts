import {
  assistantHttpResponse,
  parseAssistantBody,
} from "../server/assistant";

interface RequestLike {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  const body = await parseAssistantBody(req.body);
  const result = await assistantHttpResponse(req.method, body, req.headers);
  res.setHeader("Cache-Control", "no-store");
  res.status(result.status).json(result.body);
}
