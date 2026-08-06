import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize GoogleGenAI server-side with proper user agent header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined. AI generation will be unavailable.");
}

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiConfigured: !!ai });
});

const systemInstruction = `You are an expert Enterprise System Architect and Business Process Engineer.
You will generate a highly detailed, professional, and institutionally-sound business process definition following the TO-BE process specification standard and FCE / KPI monitoring frameworks.
You must return your response STRICTLY as a single JSON object. Do not include any markdown backticks or explanation text around it, only the raw JSON.

CRITICAL TO-BE & BPMN 2.0 SPECIFICATION RULES:
1. Subprocess Names (Ref. 3.3.2 BPMN 2.0): Must be ABSTRACT NOUNS referring to the product or outcome of the subprocess (e.g. "Recepción e Inspección de Insumos", "Categorización y Clasificación de Pacientes").
2. Activity Names (Ref. 2.2 BPMN 2.0): Must start with an INFINITIVE VERB (unconjugated, e.g., "Verificar documentación", "Evaluar signos vitales", "Registrar ingreso").
3. Activity Description: Paragraph describing what the activity does in PRESENT TENSE ("tiempo presente", e.g., "El operador verifica la orden de compra y registra...").
4. Events & Results (Ref. 2.2 BPMN 2.0): Expressed in PAST PARTICIPLE phrase representing a finished state (e.g., "Orden recibida", "Pacientes categorizados").
5. Support Tech: IT software system or module. MANDATORY: MUST NOT contain Office, Drive, Mail, Hardware, or Equipamiento.
6. Insumos de Información: Activating event or result of previous activity. MANDATORY: MUST NOT contain Protocolos or Manuales. (Protocol/manual rules MUST go under "rules").
7. Reglas de Negocio: Specific rule or protocol (e.g. "Aplicar Protocolo XXX", "Aplicar Norma Técnica YYY"). If no specific rules exist, set value EXACTLY to "No tiene".
8. Variantes: Rare execution forms or cross-references. If none exist, set value EXACTLY to "No tiene".
9. Cross-references ("Referencias cruzadas"): If an activity references or repeats another activity, use cross-references (e.g. "Ver Actividad 4.1.1"). Do not duplicate identical fichas.
10. COMPLETE SEQUENCE: Each subprocess MUST contain between 3 and 6 detailed sequential activities (4.X.1, 4.X.2, 4.X.3, 4.X.4, etc.) to fully model the complete operational workflow without skipping steps.
11. ESTADOS OFICIALES Y ALINEACIÓN CON SUBPROCESOS BPMN 2.0 (Ref. 3.4 y 3.5): El arreglo "stateMachine.states" debe corresponder exactamente 1 a 1 en orden secuencial con la lista de subprocesos definidos en "subprocesses" (Ref. 3.5), de modo que cada estado oficial coincida directamente con su etapa/subproceso correspondiente desde el Evento de Inicio (Gatillo) hasta el Evento de Término.

The JSON object MUST match the following TypeScript interface exactly:

interface ProcessDefinition {
  name: string;
  description: string;
  scopeStart: string;
  scopeEnd: string;
  responsibleRole: string;
  processOwner: string; // e.g., "Subdirección de Finanzas"
  processInputs: string;
  processOutputs: string;
  suppliers: string;
  customers: string;
  risks: string[];
  glossary: { term: string; definition: string }[];
  kpis: {
    id: string;
    name: string;
    description: string;
    formula: string; // e.g. "(A / B) * 100"
    periodicity: "Daily" | "Weekly" | "Monthly" | "Quarterly";
    targetRange: string; // Satisfactorio condition, e.g. ">= 95%"
    otherRanges: string; // Insatisfactorio condition, e.g. "< 90%"
  }[];
  subprocesses: {
    index: string; // e.g. "4.1"
    name: string;
    narrative: string;
    activities: {
      index: string; // e.g. "4.1.1"
      name: string;
      description: string; // present tense
      supportTech: string; // IT system (NO Office/Mail/Hardware)
      infoInputs: string; // Input event/data (NO Protocols/Manuals)
      result: string; // Past participle phrase
      rules: string; // Business rule or "No tiene"
      variants: string; // Variant or "No tiene"
    }[];
    sipoc: {
      supplier: string;
      inputs: string;
      subprocess: string;
      outputs: string;
      customer: string;
    }[];
  }[];
  stateMachine: {
    states: string[]; // e.g. ["Draft", "Pending", "Approved", "Executed", "Rejected", "Quarantined"]
    initialState: string;
    transitions: {
      from: string;
      to: string;
      action: string;
      role: string;
    }[];
    custodyTransfers: {
      state: string;
      fromRole: string;
      toRole: string;
      trigger: string;
    }[];
    exceptions: {
      triggerState: string;
      targetState: string;
      handler: string;
    }[];
    slaRules: {
      state: string;
      timeoutHours: number;
      action: string;
    }[];
  };
}

Create 3-5 subprocesses (4.1, 4.2, 4.3, etc.) and for EACH subprocess provide 3 to 6 comprehensive, step-by-step activities (4.1.1, 4.1.2, 4.1.3, 4.1.4...). All names, definitions, descriptions, formulas, and technical aspects must feel robust and institutional in Spanish.`;

// Helper function for Gemini API calls with retries and fallback
async function generateContentWithRetryAndFallback(promptContent: string, temperature = 0.2) {
  if (!ai) {
    throw new Error("Gemini API Client is not configured. Please supply a GEMINI_API_KEY.");
  }

  const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest"];
  let lastErr: any = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini API] Attempt ${attempt} using model '${model}'...`);
        const res = await ai.models.generateContent({
          model,
          contents: promptContent,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            temperature,
          },
        });
        return res;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Gemini API] Model '${model}' attempt ${attempt} failed: ${err?.message || err}`);
        const errStr = JSON.stringify(err || {});
        const isRetryable = errStr.includes("503") || errStr.includes("429") || errStr.includes("UNAVAILABLE") || errStr.includes("HIGH_DEMAND") || err?.status === 503;
        if (isRetryable && attempt < 3) {
          const backoffMs = attempt * 1200;
          console.log(`[Gemini API] Retrying in ${backoffMs}ms...`);
          await new Promise((r) => setTimeout(r, backoffMs));
        } else if (!isRetryable) {
          break;
        }
      }
    }
  }
  throw lastErr;
}

function formatGeminiUserError(error: any): string {
  const errStr = String(error?.message || error || "");
  if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("demand")) {
    return "El modelo de Inteligencia Artificial está experimentando una alta demanda temporal en los servidores de Google. Por favor, reintente en unos segundos.";
  }
  if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
    return "Se ha alcanzado el límite de peticiones de la API. Por favor, espere un momento e intente nuevamente.";
  }
  return error?.message || "Error al procesar la solicitud con Inteligencia Artificial.";
}

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
