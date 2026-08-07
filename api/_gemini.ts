import { GoogleGenAI } from "@google/genai";

export const systemInstruction = `You are an expert Enterprise System Architect and Business Process Engineer.
You will generate a highly detailed, professional, and institutionally-sound business process definition following the TO-BE process specification standard and FCE / KPI monitoring frameworks.
You must return your response STRICTLY as a single JSON object. Do not include any markdown backticks or explanation text around it, only the raw JSON.

CRITICAL TO-BE & BPMN 2.0 SPECIFICATION RULES:
1. Subprocess Names (Ref. 3.3.2 BPMN 2.0): Must be ABSTRACT NOUNS referring to the product or outcome of the subprocess (e.g. "Recepción e Inspección de Insumos", "Categorización y Clasificación de Pacientes").
2. Activity Names (Ref. 2.2 BPMN 2.0): ATOMIC ACTIVITIES ONLY. NEVER combine two actions in a single name (e.g. NEVER "Recepcionar muestras y validar códigos"). Must be split into distinct atomic activities ("Recibir Muestras", "Validar Código"). Each activity MUST start with a SINGLE INFINITIVE VERB. VOCABULARY RULE: Always prefer "Recibir" instead of "Recepcionar". Do NOT artificially limit the number of activities; use as many as needed to model the full workflow.
3. Activity Description: Paragraph describing what the activity does in PRESENT TENSE ("tiempo presente", e.g., "El operador verifica la orden de compra y registra...").
4. Events & Results (Ref. 2.2 BPMN 2.0): Expressed in PAST PARTICIPLE phrase representing a finished state. For VALIDATION / VERIFICATION / INSPECTION / APPROVAL activities, MUST include AT LEAST 2 EXPLICIT RESULTS (e.g., "Conforme: Documentación validada y aceptada / No Conforme: Registro rechazado por inconformidad").
5. Support Tech: IT software system or module. MANDATORY: MUST NOT contain Office, Drive, Mail, Hardware, or Equipamiento.
6. Insumos de Información: Activating event or result of previous activity. MANDATORY: MUST NOT contain Protocolos or Manuales. (Protocol/manual rules MUST go under "rules").
7. Reglas de Negocio: Specific rule or protocol (e.g. "Aplicar Protocolo XXX", "Aplicar Norma Técnica YYY"). MANDATORY: When an activity involves validation/decision logic with multiple criteria, PRIVILEGE using "rules" to detail all decision conditions, acceptance criteria, and rejection thresholds. If no specific rules exist, set value EXACTLY to "No tiene".
8. Variantes: Rare execution forms or cross-references. If none exist, set value EXACTLY to "No tiene".
9. Cross-references ("Referencias cruzadas"): If an activity references or repeats another activity, use cross-references (e.g. "Ver Actividad 4.1.1"). Do not duplicate identical fichas.
10. COMPLETE SEQUENCE: Each subprocess MUST contain detailed sequential activities (4.X.1, 4.X.2, 4.X.3, 4.X.4, etc., typically 3 to 6 per subprocess or more if needed) to fully model the complete operational workflow without skipping steps or clumping tasks.
11. ESTADOS OFICIALES Y ALINEACIÓN CON SUBPROCESOS BPMN 2.0 (Ref. 3.4 y 3.5): El arreglo "stateMachine.states" debe corresponder exactamente 1 a 1 en orden secuencial con la lista de subprocesos definidos en "subprocesses" (Ref. 3.5), de modo que cada estado oficial coincida directamente con su etapa/subproceso correspondiente desde el Evento de Inicio (Gatillo) hasta el Evento de Término.

The JSON object MUST match the following TypeScript interface exactly:

interface ProcessDefinition {
  name: string;
  description: string;
  scopeStart: string;
  scopeEnd: string;
  responsibleRole: string;
  processOwner: string;
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
    formula: string;
    periodicity: "Daily" | "Weekly" | "Monthly" | "Quarterly";
    targetRange: string;
    otherRanges: string;
  }[];
  subprocesses: {
    index: string;
    name: string;
    narrative: string;
    activities: {
      index: string;
      name: string;
      description: string;
      supportTech: string;
      infoInputs: string;
      result: string;
      rules: string;
      variants: string;
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
    states: string[];
    initialState: string;
    transitions: { from: string; to: string; action: string; role: string; }[];
    custodyTransfers: { state: string; fromRole: string; toRole: string; trigger: string; }[];
    exceptions: { triggerState: string; targetState: string; handler: string; }[];
    slaRules: { state: string; timeoutHours: number; action: string; }[];
  };
}

Create 3-5 subprocesses (4.1, 4.2, 4.3, etc.) and for EACH subprocess provide 3 to 6 comprehensive, step-by-step activities (4.1.1, 4.1.2, 4.1.3, 4.1.4...). All names, definitions, descriptions, formulas, and technical aspects must feel robust and institutional in Spanish.`;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY_2;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function generateContentWithRetryAndFallback(promptContent: string, temperature = 0.2) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("No se encontró la clave GEMINI_API_KEY ni GEMINI_API_KEY2 en las variables de entorno del servidor de Vercel.");
  }

  const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest"];
  let lastErr: any = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: promptContent,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature,
          },
        });
        return res;
      } catch (err: any) {
        lastErr = err;
        const errStr = JSON.stringify(err || {});
        const isRetryable = errStr.includes("503") || errStr.includes("429") || errStr.includes("UNAVAILABLE") || errStr.includes("HIGH_DEMAND") || err?.status === 503;
        if (isRetryable && attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 1200));
        } else if (!isRetryable) {
          break;
        }
      }
    }
  }
  throw lastErr;
}

export function formatGeminiUserError(error: any): string {
  const errStr = String(error?.message || error || "");
  if (errStr.includes("GEMINI_API_KEY") || errStr.includes("GEMINI_API_KEY2")) {
    return "Falta configurar la clave GEMINI_API_KEY / GEMINI_API_KEY2 en las variables de entorno de Vercel y hacer un Re-deploy.";
  }
  if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("demand")) {
    return "El modelo de Inteligencia Artificial está experimentando una alta demanda temporal en los servidores de Google. Por favor, reintente en unos segundos.";
  }
  if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
    return "Se ha alcanzado el límite de peticiones de la API. Por favor, espere un momento e intente nuevamente.";
  }
  return error?.message || "Error al procesar la solicitud con Inteligencia Artificial.";
}
