import { generateContentWithRetryAndFallback, formatGeminiUserError } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { processName, descriptionContext } = req.body || {};
    if (!processName || !processName.trim()) {
      return res.status(400).json({ error: "El nombre del proceso es requerido" });
    }

    const prompt = `Generate a complete process definition for the following business process:
Process Name: "${processName.trim()}"
Context/Details: "${descriptionContext ? descriptionContext.trim() : "Standard enterprise implementation."}"`;

    const response = await generateContentWithRetryAndFallback(prompt, 0.2);

    const responseText = response.text || "{}";
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    const processData = JSON.parse(cleanedText);

    return res.status(200).json(processData);
  } catch (error: any) {
    console.error("Error generating process on Vercel endpoint:", error);
    return res.status(503).json({ error: formatGeminiUserError(error) });
  }
}
