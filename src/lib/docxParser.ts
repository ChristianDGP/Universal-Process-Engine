import mammoth from "mammoth";
import { SIHSystem } from "../types";

/**
 * Parses an uploaded Word file (.docx), text file, or JSON file
 * into structured SIHSystem objects according to SSMSO document format.
 */
export async function parseSIHDocumentFile(file: File): Promise<SIHSystem[]> {
  const fileName = file.name.toLowerCase();

  // 1. JSON File Support
  if (fileName.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data as SIHSystem[];
    } else if (data.systems && Array.isArray(data.systems)) {
      return data.systems as SIHSystem[];
    }
    throw new Error("El archivo JSON no contiene un formato de catálogo SIH válido.");
  }

  // 2. Word File (.docx / .doc) using mammoth
  let rawText = "";
  if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value;
    } catch (err) {
      console.warn("Mammoth extraction failed, falling back to FileReader as text", err);
      rawText = await file.text();
    }
  } else {
    // Plain text or markdown
    rawText = await file.text();
  }

  return parseSIHTextContent(rawText);
}

/**
 * Robust text parser that extracts SIH systems structured like the SSMSO specification document.
 * Handles single lines, multi-line paragraphs, headers with/without colons, tables, bullets, and numbers.
 */
export function parseSIHTextContent(rawText: string): SIHSystem[] {
  if (!rawText || !rawText.trim()) return [];

  const systems: SIHSystem[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let currentArea = "Apoyo General de TI";
  let currentSystemCode = "";
  let currentSystemName = "";
  let currentObjective = "";
  let currentFeatures: string[] = [];
  let currentIntegrations: string[] = [];
  let currentLegal = "";

  let currentSection: "NONE" | "OBJETIVO" | "FEATURES" | "INTEGRATIONS" | "LEGAL" = "NONE";

  function pushCurrentSystem() {
    if (currentSystemName || currentObjective || currentFeatures.length > 0) {
      const codeClean = currentSystemCode || `SIH-${systems.length + 1}`;
      systems.push({
        id: `SIH-${codeClean}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: codeClean,
        area: currentArea,
        name: currentSystemName || `Sistema de Información ${codeClean}`,
        objective: currentObjective.trim() || "Objetivo funcional del sistema en la operación hospitalaria.",
        features: currentFeatures.length > 0 ? [...currentFeatures] : ["Funcionalidad general de la aplicación."],
        integrations: currentIntegrations.length > 0 ? [...currentIntegrations] : ["Maestro de pacientes"],
        legalConsiderations: currentLegal.trim() || undefined,
        supportStatus: "SOPORTADO"
      });
    }

    // Reset current item accumulators
    currentSystemCode = "";
    currentSystemName = "";
    currentObjective = "";
    currentFeatures = [];
    currentIntegrations = [];
    currentLegal = "";
    currentSection = "NONE";
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Detect Category / Area headers e.g. "1.1. Apoyo administrativo..." or "1.6 Gestión de la Información"
    const categoryMatch = line.match(/^(?:Área\s+|Area\s+)?(1\.[1-9])\.?\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s\-\/\(\)]+)$/i);
    if (categoryMatch) {
      currentArea = categoryMatch[2].trim();
      continue;
    }

    // 2. Detect System Code & Name e.g. "1.6.4. Gestión OIRS", "1.1.1 Maestro de pacientes", "SIH-1.6.4 - Gestión OIRS"
    const systemCodeMatch = line.match(/^(?:SIH[\-_])?(1\.\d+\.\d+)\.?\s*(?:[\-–—:]\s*)?(.+)$/i);
    if (systemCodeMatch) {
      pushCurrentSystem();
      currentSystemCode = systemCodeMatch[1];
      currentSystemName = systemCodeMatch[2].replace(/\.$/, "").trim();
      currentSection = "NONE";
      continue;
    }

    // 3. Detect Explicit "Área" line e.g. "Área Gestión de la Información" or "Área: Gestión de la Información"
    const areaExplicitMatch = line.match(/^(?:Área|Area|Área Funcional|Area Funcional)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
    if (areaExplicitMatch) {
      const extractedArea = areaExplicitMatch[1].trim();
      if (extractedArea.length > 2) {
        currentArea = extractedArea;
      }
      continue;
    }

    // 4. Detect Explicit "Sistema de Información" line e.g. "Sistema de Información Gestión OIRS" or "Sistema: ..."
    const sysNameExplicitMatch = line.match(/^(?:Sistema de Información|Sistema de Informacion|Sistema|Nombre del Sistema)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
    if (sysNameExplicitMatch) {
      const extractedName = sysNameExplicitMatch[1].trim();
      if (extractedName.length > 1) {
        currentSystemName = extractedName.replace(/\.$/, "").trim();
      }
      continue;
    }

    // 5. Detect Objective section e.g. "Objetivo Constituye una herramienta..." or "Objetivo: ..." or "Objetivo" alone
    const objMatch = line.match(/^(?:Objetivo|Objetivo General|Propósito|Proposito)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
    if (objMatch) {
      currentSection = "OBJETIVO";
      currentObjective = objMatch[1].trim();
      continue;
    } else if (line.match(/^(?:Objetivo|Objetivo General|Propósito|Proposito)\s*[:\-–—\t]?$/i)) {
      currentSection = "OBJETIVO";
      continue;
    }

    // 6. Detect Features section e.g. "Funcionalidades más relevantes", "Funcionalidades:", "Requerimientos Funcionales"
    if (
      line.match(/^(?:Funcionalidades más relevantes|Funcionalidades mas relevantes|Funcionalidades Relevantes|Funcionalidades|Requerimientos Funcionales|Requisitos Funcionales|Características Relevantes)\s*[:\-–—\t]?$/i) ||
      line.toLowerCase().startsWith("funcionalidades más relevantes") ||
      line.toLowerCase().startsWith("funcionalidades mas relevantes") ||
      line.toLowerCase().startsWith("funcionalidades:") ||
      line.toLowerCase().startsWith("requisitos funcionales")
    ) {
      currentSection = "FEATURES";
      continue;
    }

    // 7. Detect Integrations section e.g. "Interoperabilidad / Integraciones", "Integraciones:", "Interoperabilidad"
    if (
      line.match(/^(?:Interoperabilidad\s*\/?\s*Integraciones|Interoperabilidad e Integraciones|Integraciones|Interoperabilidad|Integración con otros sistemas)\s*[:\-–—\t]?$/i) ||
      line.toLowerCase().startsWith("interoperabilidad") ||
      line.toLowerCase().startsWith("integraciones:") ||
      line.toLowerCase().startsWith("integración con otros")
    ) {
      const inlineIntMatch = line.match(/^(?:Interoperabilidad|Integraciones|Integración)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
      currentSection = "INTEGRATIONS";
      if (inlineIntMatch && inlineIntMatch[1].trim().length > 3) {
        currentIntegrations.push(inlineIntMatch[1].trim());
      }
      continue;
    }

    // 8. Detect Legal considerations section
    if (
      line.match(/^(?:Consideraciones [Ll]egales\s*\/?\s*[Nn]ormativas|Consideraciones [Ll]egales|Normativa [Aa]plicable|Marco [Ll]egal|Normativa)\s*[:\-–—\t]?$/i) ||
      line.toLowerCase().startsWith("consideraciones legales") ||
      line.toLowerCase().startsWith("normativa aplicable") ||
      line.toLowerCase().startsWith("marco legal")
    ) {
      const inlineLegMatch = line.match(/^(?:Consideraciones [Ll]egales|Normativa|Marco Legal)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
      currentSection = "LEGAL";
      if (inlineLegMatch && inlineLegMatch[1].trim().length > 3) {
        currentLegal = inlineLegMatch[1].trim();
      }
      continue;
    }

    // 9. Accumulate lines based on active currentSection
    if (currentSection === "OBJETIVO") {
      if (currentObjective) currentObjective += " " + line;
      else currentObjective = line;
    } else if (currentSection === "FEATURES") {
      // Clean bullet, number or list prefix e.g. "1.", "•", "-", "a)"
      const cleanLine = line.replace(/^[\d+\.\-\*\•\o\▪\▫\►\)]+\s*/, "").trim();
      if (cleanLine.length > 2) {
        currentFeatures.push(cleanLine);
      }
    } else if (currentSection === "INTEGRATIONS") {
      const cleanLine = line.replace(/^[\d+\.\-\*\•\o\▪\▫\►\)]+\s*/, "").trim();
      if (cleanLine.length > 2) {
        currentIntegrations.push(cleanLine);
      }
    } else if (currentSection === "LEGAL") {
      if (currentLegal) currentLegal += " " + line;
      else currentLegal = line;
    }
  }

  // Push final accumulated system
  pushCurrentSystem();

  return systems;
}

/**
 * Exports the SIH Catalog back to Word-compatible HTML Document (.doc / .docx)
 */
export function exportSIHCatalogToWord(systems: SIHSystem[]) {
  const htmlHeader = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Catálogo SIH - Apoyo Tecnológico</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111827; }
        h1 { font-size: 18pt; font-weight: bold; color: #0f172a; text-align: center; margin-bottom: 20px; }
        h2 { font-size: 14pt; font-weight: bold; color: #1e293b; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; vertical-align: top; font-size: 10pt; }
        th { background-color: #f1f5f9; font-weight: bold; text-align: left; width: 25%; }
        ul, ol { margin: 4px 0; padding-left: 20px; }
        li { margin-bottom: 3px; }
        .code-badge { font-weight: bold; color: #1e3a8a; }
      </style>
    </head>
    <body>
      <h1>CAPÍTULO DE TI - PROYECTO TECNOLOGÍAS DE INFORMACIÓN Y COMUNICACIONES</h1>
      <p style="text-align:center; font-style:italic;">Catálogo Oficial de Sistemas de Información Hospitalarios (SIH) y Apoyo Tecnológico</p>
      <p style="text-align:center;">Generado el ${new Date().toLocaleDateString("es-CL")}</p>
      <hr/>
  `;

  let htmlBody = "";

  // Group systems by Area
  const areaGroups: Record<string, SIHSystem[]> = {};
  systems.forEach((sys) => {
    const areaName = sys.area || "Otras Áreas";
    if (!areaGroups[areaName]) areaGroups[areaName] = [];
    areaGroups[areaName].push(sys);
  });

  for (const [areaName, sysList] of Object.entries(areaGroups)) {
    htmlBody += `<h2>ÁREA: ${areaName.toUpperCase()}</h2>`;

    sysList.forEach((sys) => {
      htmlBody += `
        <table>
          <tr>
            <th>Área</th>
            <td>${sys.area}</td>
          </tr>
          <tr>
            <th>Sistema de Información</th>
            <td><strong class="code-badge">${sys.code || sys.id}</strong> - ${sys.name}</td>
          </tr>
          <tr>
            <th>Objetivo</th>
            <td>${sys.objective}</td>
          </tr>
          <tr>
            <th>Funcionalidades</th>
            <td>
              <ol>
                ${sys.features.map((f) => `<li>${f}</li>`).join("")}
              </ol>
            </td>
          </tr>
          <tr>
            <th>Interoperabilidad / Integraciones</th>
            <td>
              <ul>
                ${sys.integrations.map((i) => `<li>${i}</li>`).join("")}
              </ul>
            </td>
          </tr>
          ${
            sys.legalConsiderations
              ? `<tr>
                  <th>Consideraciones Legales / Normativas</th>
                  <td>${sys.legalConsiderations}</td>
                </tr>`
              : ""
          }
        </table>
      `;
    });
  }

  const htmlFooter = `</body></html>`;
  const fullHtml = htmlHeader + htmlBody + htmlFooter;

  const blob = new Blob(["\ufeff", fullHtml], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Catalogo_SIH_Apoyo_Tecnologico_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
