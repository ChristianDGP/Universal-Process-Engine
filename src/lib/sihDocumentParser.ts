import { SIHSystem } from "../types";

/**
 * Intelligent SIH Technical Specification Document Parser
 * Parses single or multi-module texts/documents extracted from Word (.docx), PDF, or raw text tables.
 */
export function parseSihDocumentText(rawText: string): SIHSystem[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const systems: SIHSystem[] = [];

  // Split by module section headers, e.g.:
  // "1.6.4. Gestión OIRS" or "1.6.4 Gestión OIRS" or "SIH-1.6.4" or "### 1.6.4"
  const moduleHeaderRegex = /(?:^|\n)(?:###\s*|#\s*)?(?:SIH-)?(\d+\.\d+(?:\.\d+)?)\.?\s*[\t: -]+([^\n\r]+)/gi;
  
  const matches: { index: number; code: string; title: string; fullMatch: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = moduleHeaderRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      code: match[1].trim(),
      title: match[2].replace(/\t+/g, " ").trim(),
      fullMatch: match[0]
    });
  }

  if (matches.length === 0) {
    // Attempt fallback single block parsing if user pasted just one module without header match
    const single = parseSingleSihBlock(text, "1.0.0", "Módulo SIH");
    if (single && single.features && single.features.length > 0) {
      return [single];
    }
    return [];
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const blockText = text.substring(startIndex, endIndex);

    const parsed = parseSingleSihBlock(blockText, current.code, current.title);
    if (parsed) {
      systems.push(parsed);
    }
  }

  return systems;
}

function parseSingleSihBlock(blockText: string, fallbackCode: string, fallbackName: string): SIHSystem | null {
  const lines = blockText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let code = fallbackCode;
  let name = fallbackName;
  let area = "Gestión de la Información";
  let objective = "";
  let supportStatus: "SOPORTADO" | "EN_IMPLEMENTACION" | "BRECHA" = "SOPORTADO";
  const features: string[] = [];
  const integrations: string[] = [];

  // Check header line
  const headerMatch = blockText.match(/(?:^|\n)(?:###\s*|#\s*)?(?:SIH-)?(\d+\.\d+(?:\.\d+)?)\.?\s*[\t: -]+([^\n\r]+)/i);
  if (headerMatch) {
    code = headerMatch[1].trim();
    name = headerMatch[2].replace(/^(?:Sistema de Información|Nombre|Módulo)[\t: ]+/i, "").trim();
  }

  // Extract Area
  const areaMatch = blockText.match(/(?:Área|Area)[\t :]+([^\n\r]+)/i);
  if (areaMatch) {
    area = areaMatch[1].trim();
  } else {
    // Guess area from code
    if (code.startsWith("1.1")) area = "Procesos Ambulatorios";
    else if (code.startsWith("1.2")) area = "Procesos de Urgencia y Hospitalizados";
    else if (code.startsWith("1.3")) area = "Apoyo al Diagnóstico y terapéutico";
    else if (code.startsWith("1.4")) area = "Apoyo Logístico";
    else if (code.startsWith("1.5")) area = "Apoyo Administrativo";
    else if (code.startsWith("1.6")) area = "Gestión de la Información";
  }

  // Extract Sistema de Información / Name if explicitly on separate line
  const sysNameMatch = blockText.match(/Sistema de Información[\t :]+([^\n\r]+)/i);
  if (sysNameMatch && sysNameMatch[1].trim()) {
    name = sysNameMatch[1].trim();
  }

  // Extract Objetivo
  const objMatch = blockText.match(/Objetivo[\t :]+([\s\S]*?)(?=(?:Funcionalidades|Requisitos|Integraciones|Estado|Área|Area|\d+\.\s+Permit|\n\s*\n\d+\.|$))/i);
  if (objMatch) {
    objective = objMatch[1].replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
  }

  // Extract Estado de Soporte
  if (/brecha/i.test(blockText)) supportStatus = "BRECHA";
  else if (/en implementaci[oó]n/i.test(blockText) || /en desarrollo/i.test(blockText)) supportStatus = "EN_IMPLEMENTACION";
  else supportStatus = "SOPORTADO";

  // Extract Funcionalidades más relevantes
  // Could be in a section labeled "Funcionalidades más relevantes" or numbered list 1. 2. ... 13.
  const featSectionMatch = blockText.match(/(?:Funcionalidades(?: más relevantes)?|Requisitos del Sistema)[\t :]*\n?([\s\S]*?)(?=(?:Integraciones|Consideraciones Legales|Interoperabilidad|Área|$))/i);
  const targetTextForFeatures = featSectionMatch ? featSectionMatch[1] : blockText;

  // Extract all numbered items: e.g. "1.  Permite...", "2. Permita...", "13. Disponer..."
  const featureRegex = /(?:^|\n)\s*(\d{1,2})[\.\)-]\s*[\t ]*([^\n]+(?:\n(?!\s*\d{1,2}[\.\)-]|\s*(?:Área|Objetivo|Integraciones|Sistema))[\t ]*[^\n]+)*)/g;
  let featMatch: RegExpExecArray | null;

  while ((featMatch = featureRegex.exec(targetTextForFeatures)) !== null) {
    const rawFeat = featMatch[2]
      .replace(/\t+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (rawFeat && rawFeat.length > 5 && !rawFeat.toLowerCase().startsWith("área") && !rawFeat.toLowerCase().startsWith("sistema de")) {
      features.push(rawFeat);
    }
  }

  // If no numbered items found, check bullet points
  if (features.length === 0) {
    const bulletRegex = /(?:^|\n)\s*[-•*]\s*([^\n]+(?:\n(?!\s*[-•*]|\s*(?:Área|Objetivo|Integraciones))[\t ]*[^\n]+)*)/g;
    let bulletMatch: RegExpExecArray | null;
    while ((bulletMatch = bulletRegex.exec(targetTextForFeatures)) !== null) {
      const rawFeat = bulletMatch[1].replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
      if (rawFeat && rawFeat.length > 5) {
        features.push(rawFeat);
      }
    }
  }

  // Extract Integrations
  const integMatch = blockText.match(/(?:Integraciones|Interoperabilidad)[\t :]+([^\n\r]+)/i);
  if (integMatch) {
    integrations.push(integMatch[1].trim());
  }

  return {
    id: `SIH-${code}`,
    code,
    area,
    name,
    objective: objective || `Gestionar y operar las funcionalidades de ${name} para el hospital.`,
    supportStatus,
    providerVendor: name,
    features: features.length > 0 ? features : [`Operación estándar de ${name}`],
    integrations: integrations.length > 0 ? integrations : ["Ficha Clínica Electrónica, SIH Central"]
  };
}
