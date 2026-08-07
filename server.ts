import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { getGeminiClient, generateContentWithRetryAndFallback, formatGeminiUserError } from "./api/_gemini";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Health check API
app.get("/api/health", (req, res) => {
  const ai = getGeminiClient();
  res.json({ status: "ok", aiConfigured: !!ai });
});

// API endpoint to generate process
app.post("/api/generate", async (req, res) => {
  try {
    const { processName, descriptionContext } = req.body;
    if (!processName) {
      return res.status(400).json({ error: "Process name is required" });
    }

    const prompt = `Generate a complete process definition for the following business process:
Process Name: "${processName}"
Context/Details: "${descriptionContext || "Standard enterprise implementation."}"`;

    const response = await generateContentWithRetryAndFallback(prompt, 0.2);

    const responseText = response.text || "{}";
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }
    const processData = JSON.parse(cleanedText);

    res.json(processData);
  } catch (error: any) {
    console.error("Error generating process:", error);
    res.status(503).json({ error: formatGeminiUserError(error) });
  }
});

// API endpoint to parse Word (.docx) documents into ProcessDefinition structure
app.post("/api/parse-word", async (req, res) => {
  try {
    const { base64Docx, fileData, base64Data, rawText } = req.body;

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

    res.json(processData);
  } catch (error: any) {
    console.error("Error parsing Word document:", error);
    res.status(503).json({ error: formatGeminiUserError(error) });
  }
});

// Start server and handle Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
