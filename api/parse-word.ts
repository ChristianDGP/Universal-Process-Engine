import mammoth from "mammoth";
import { generateContentWithRetryAndFallback, formatGeminiUserError } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { base64Docx, fileData, base64Data, rawText } = req.body || {};

    let extractedDocumentText = rawText || "";
    const base64Content = base64Docx || fileData || base64Data;

    if (base64Content) {
      try {
        const buffer = Buffer.from(base64Content, "base64");
        const result = await mammoth.extractRawText({ buffer });
        extractedDocumentText = result.value || "";
      } catch (mammothErr: any) {
        console.warn("Mammoth extraction failed, trying string fallback:", mammothErr);
        const rawString = Buffer.from(base64Content, "base64").toString("utf-8");
        extractedDocumentText = rawString.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      }
    }

    if (!extractedDocumentText || !extractedDocumentText.trim()) {
      return res.status(400).json({ error: "No text could be extracted from the provided Word document. Asegúrese de que el archivo sea un documento .docx válido." });
    }

    const parsePrompt = `You are provided with the text extracted from a business process report or Word document:
---
${extractedDocumentText.slice(0, 25000)}
---

Analyze this document thoroughly and transform its contents into a complete, institutional ProcessDefinition JSON structure following BPMN 2.0 and TO-BE standards.
Map every subprocess and activity mentioned in the document. Ensure:
- Subprocess names are abstract nouns referring to the product.
- Activity names start with INFINITIVE VERBS.
- Activity descriptions are in PRESENT TENSE.
- Each subprocess contains all relevant activities described in the document (3-6 activities per subprocess).
- Include SIPOC, KPIs, Glossary, Risks, and State Machine based on the document's contents.`;

    const response = await generateContentWithRetryAndFallback(parsePrompt, 0.1);

    const responseText = response.text || "{}";
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    const processData = JSON.parse(cleanedText);

    return res.status(200).json(processData);
  } catch (error: any) {
    console.error("Error parsing Word document on Vercel endpoint:", error);
    return res.status(503).json({ error: formatGeminiUserError(error) });
  }
}
