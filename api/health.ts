import { getGeminiClient } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ai = getGeminiClient();
  return res.status(200).json({
    status: "ok",
    aiConfigured: !!ai,
    environment: process.env.VERCEL ? "vercel" : "server"
  });
}
