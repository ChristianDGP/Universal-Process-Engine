import { JCIStandard } from "../types";
import { normalizeText } from "./sihUtils";
import { INITIAL_JCI_CATALOG } from "../data/jciCatalogPreset";

/**
 * Performs a smart match on a JCIStandard object against a search query.
 * Handles partial terms, accents, singular/plural variations, and matches across
 * code, name, chapter, objective, measurable elements, and category.
 */
export function jciMatchesQuery(std: JCIStandard, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qClean = normalizeText(query);
  const qWords = qClean.split(/\s+/).filter(Boolean);

  const stdText = normalizeText(
    `${std.code} ${std.name} ${std.chapter} ${std.objective} ${(std.measurableElements || []).join(" ")} ${std.category || ""}`
  );

  return qWords.every((word) => {
    if (stdText.includes(word)) return true;
    if (word.endsWith("s") && stdText.includes(word.slice(0, -1))) return true;
    if (word.endsWith("es") && stdText.includes(word.slice(0, -2))) return true;
    return false;
  });
}

/**
 * Automatically detects and formats the JCI Standard Code and Measurable Element
 * for a process activity ficha based on its name and description.
 */
export function autoDetectJCIForFicha(
  activityName: string,
  activityDescription: string = "",
  customCatalog?: JCIStandard[]
): string {
  if (!activityName || !activityName.trim()) return "No tiene";

  const fullText = normalizeText(`${activityName} ${activityDescription}`);
  const catalog = customCatalog && customCatalog.length > 0 ? customCatalog : INITIAL_JCI_CATALOG;

  // Rule 1: Patient Identification (IPSG.1)
  if (
    fullText.includes("identific") ||
    fullText.includes("admision") ||
    fullText.includes("fichar") ||
    fullText.includes("rotul") ||
    fullText.includes("brazalete") ||
    fullText.includes("rut") ||
    fullText.includes("etiquet") ||
    fullText.includes("recepcion del paciente")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.1") || catalog[0];
    const elem = std.measurableElements?.[0] || "Identificación con 2 identificadores únicos.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 2: Effective Communication / Handoff / Critical Results (IPSG.2)
  if (
    fullText.includes("comunicac") ||
    fullText.includes("traspaso") ||
    fullText.includes("entrega de turno") ||
    fullText.includes("sbar") ||
    fullText.includes("saer") ||
    fullText.includes("resultado critico") ||
    fullText.includes("orden verbal") ||
    fullText.includes("orden telefonica") ||
    fullText.includes("notific") ||
    fullText.includes("informar al medico")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.2") || catalog[1];
    const elem = std.measurableElements?.[2] || std.measurableElements?.[0] || "Uso de metodología estandarizada para el traspaso de información clínica.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 3: High Risk Medication / High Alert / Electrolites (IPSG.3 / MMU.6 / MMU.4)
  if (
    fullText.includes("alto riesgo") ||
    fullText.includes("electrolito") ||
    fullText.includes("potasio") ||
    fullText.includes("lasa") ||
    fullText.includes("doble chequeo") ||
    fullText.includes("farmaco de alerta") ||
    fullText.includes("concentrado")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.3") || catalog[2];
    const elem = std.measurableElements?.[2] || std.measurableElements?.[0] || "Doble chequeo independiente antes de la administración de fármacos de alto riesgo.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 4: Safe Surgery / Procedure Time-Out (IPSG.4)
  if (
    fullText.includes("cirug") ||
    fullText.includes("quirurg") ||
    fullText.includes("time-out") ||
    fullText.includes("pausa de seguridad") ||
    fullText.includes("marcado de sitio") ||
    fullText.includes("pabellon") ||
    fullText.includes("prequirurg") ||
    fullText.includes("intervenc")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.4") || catalog[3];
    const elem = std.measurableElements?.[1] || std.measurableElements?.[0] || "Pausa de Seguridad (Time-Out) inmediatamente antes del inicio del procedimiento.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 5: Hand Hygiene / IAAS (IPSG.5)
  if (
    fullText.includes("higiene de manos") ||
    fullText.includes("lavado de manos") ||
    fullText.includes("alcohol gel") ||
    fullText.includes("infeccion") ||
    fullText.includes("iaas") ||
    fullText.includes("limpieza antiseptica")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.5") || catalog[4];
    const elem = std.measurableElements?.[0] || "Cumplimiento de los 5 Momentos de la Higiene de Manos de la OMS.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 6: Fall Risk (IPSG.6)
  if (
    fullText.includes("caida") ||
    fullText.includes("morse") ||
    fullText.includes("downtown") ||
    fullText.includes("riesgo de caida") ||
    fullText.includes("baranda") ||
    fullText.includes("contencion")
  ) {
    const std = catalog.find((s) => s.code === "IPSG.6") || catalog[5];
    const elem = std.measurableElements?.[0] || "Evaluación inicial y reevaluación del riesgo de caídas mediante escala validada.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 7: Triage & Admission (ACC.1)
  if (
    fullText.includes("triaje") ||
    fullText.includes("triage") ||
    fullText.includes("categoriz") ||
    fullText.includes("urgencia") ||
    fullText.includes("ingreso") ||
    fullText.includes("manchester") ||
    fullText.includes("esi")
  ) {
    const std = catalog.find((s) => s.code === "ACC.1") || catalog[6];
    const elem = std.measurableElements?.[1] || std.measurableElements?.[0] || "Evaluación del triaje estructurado y criterios explícitos de admisión.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 8: Patient Transfer / Referral (ACC.2)
  if (
    fullText.includes("traslado") ||
    fullText.includes("derivacion") ||
    fullText.includes("epicrisis") ||
    fullText.includes("transferencia")
  ) {
    const std = catalog.find((s) => s.code === "ACC.2") || catalog[7];
    const elem = std.measurableElements?.[0] || "Formulario estandarizado de epicrisis y resumen de traslado clínico.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 9: Initial Assessment / Anamnesis (AOP.1)
  if (
    fullText.includes("evaluacion") ||
    fullText.includes("anamnesis") ||
    fullText.includes("examen fisico") ||
    fullText.includes("valoracion") ||
    fullText.includes("diagnostico inicial")
  ) {
    const std = catalog.find((s) => s.code === "AOP.1") || catalog[8];
    const elem = std.measurableElements?.[0] || "Evaluación inicial médica y de enfermería integral registrada oportunamente.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 10: Care Plan (COP.1)
  if (
    fullText.includes("plan de atencion") ||
    fullText.includes("plan de cuidados") ||
    fullText.includes("multidisciplin")
  ) {
    const std = catalog.find((s) => s.code === "COP.1") || catalog[9];
    const elem = std.measurableElements?.[0] || "Plan de atención multidisciplinario documentado en la ficha clínica.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 11: Medical Prescription / Orders (MMU.4)
  if (
    fullText.includes("prescripc") ||
    fullText.includes("orden medica") ||
    fullText.includes("conciliac") ||
    fullText.includes("receta") ||
    fullText.includes("indicacion medica")
  ) {
    const std = catalog.find((s) => s.code === "MMU.4") || catalog[10];
    const elem = std.measurableElements?.[0] || "Prescripción médica completa con dosis, vía, frecuencia y diagnóstico.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 12: Medication Administration (MMU.6)
  if (
    fullText.includes("administr") ||
    fullText.includes("inyecc") ||
    fullText.includes("puncion") ||
    fullText.includes("infus") ||
    fullText.includes("dosis") ||
    fullText.includes("farmaco") ||
    fullText.includes("medicament")
  ) {
    const std = catalog.find((s) => s.code === "MMU.6") || catalog[11];
    const elem = std.measurableElements?.[0] || "Verificación de los '5 Correctos' de la administración de fármacos.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 13: Sterilization / Disinfection (PCI.5)
  if (
    fullText.includes("esteriliz") ||
    fullText.includes("autoclave") ||
    fullText.includes("dan") ||
    fullText.includes("instrumental") ||
    fullText.includes("material esteril")
  ) {
    const std = catalog.find((s) => s.code === "PCI.5") || catalog[12];
    const elem = std.measurableElements?.[0] || "Monitoreo y controles químicos/biológicos en cada ciclo de esterilización.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Rule 14: Medical Record Integrity / Info Management (MOI.1)
  if (
    fullText.includes("ficha clinica") ||
    fullText.includes("registro clinico") ||
    fullText.includes("resguardo") ||
    fullText.includes("historia clinica") ||
    fullText.includes("firma")
  ) {
    const std = catalog.find((s) => s.code === "MOI.1") || catalog[13];
    const elem = std.measurableElements?.[1] || "Registro con fecha, hora, firma e identificación del profesional.";
    return `${std.code} - ${std.name} | Elemento Medible: ${elem}`;
  }

  // Fallback: Score matching against all standards in catalog
  let bestMatch: JCIStandard | null = null;
  let bestScore = 0;

  for (const std of catalog) {
    let score = 0;
    const stdWords = normalizeText(`${std.code} ${std.name} ${std.objective} ${(std.measurableElements || []).join(" ")}`).split(/\s+/);
    const actWords = fullText.split(/\s+/);

    for (const word of actWords) {
      if (word.length > 3 && stdWords.includes(word)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = std;
    }
  }

  if (bestMatch && bestScore >= 2) {
    const elem = bestMatch.measurableElements?.[0] || "Cumplimiento del estándar JCI.";
    return `${bestMatch.code} - ${bestMatch.name} | Elemento Medible: ${elem}`;
  }

  return "No tiene";
}

