import { createOpenAI } from "@ai-sdk/openai";

const optionalHeader = (key: string, value?: string) =>
  value ? { [key]: value } : {};

export const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    ...optionalHeader("HTTP-Referer", process.env.OPENROUTER_REFERRER),
    ...optionalHeader("X-Title", process.env.OPENROUTER_TITLE),
  },
});
