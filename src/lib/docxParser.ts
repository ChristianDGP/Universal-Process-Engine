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
    if (currentSystemName || currentObjective) {
      const codeClean = currentSystemCode || `SIH-${systems.length + 1}`;
      systems.push({
        id: `SIH-${codeClean}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: codeClean,
        area: currentArea,
        name: currentSystemName || "Sistema de Información Cargado",
        objective: currentObjective.trim() || "Sin objetivo especificado.",
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

    // Detect Category / Area headers e.g. "1.1. Apoyo administrativo a la atención clínica" or "1.2. Atención Clínica"
    const categoryMatch = line.match(/^1\.\d+\.?\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s\-\/\(\)]+)/i);
    if (categoryMatch && !line.match(/^1\.\d+\.\d+/)) {
      currentArea = categoryMatch[1].trim();
      continue;
    }

    // Detect System Code & Name e.g. "1.1.1. Maestro de pacientes." or "1.3.6. Farmacia"
    const systemCodeMatch = line.match(/^(1\.\d+\.\d+)\.?\s+(.+)$/);
    if (systemCodeMatch) {
      pushCurrentSystem();
      currentSystemCode = systemCodeMatch[1];
      currentSystemName = systemCodeMatch[2].replace(/\.$/, "").trim();
      continue;
    }

    // Check for table header keywords e.g. "Área", "Sistema de Información", "Objetivo"
    if (line.toLowerCase().startsWith("área") || line.toLowerCase().startsWith("area")) {
      const parts = line.split(/[:\t]+/);
      if (parts.length > 1 && parts[1].trim()) {
        currentArea = parts[1].trim();
      }
      continue;
    }

    if (line.toLowerCase().startsWith("sistema de información") || line.toLowerCase().startsWith("sistema:")) {
      const parts = line.split(/[:\t]+/);
      if (parts.length > 1 && parts[1].trim()) {
        if (!currentSystemName) {
          currentSystemName = parts[1].trim();
        }
      }
      continue;
    }

    // Detect Objective
    if (line.toLowerCase().startsWith("objetivo")) {
      currentSection = "OBJETIVO";
      const parts = line.split(/[:\t]+/);
      if (parts.length > 1 && parts[1].trim()) {
        currentObjective = parts[1].trim();
      }
      continue;
    }

    // Detect Features section
    if (line.toLowerCase().includes("funcionalidades más relevantes") || line.toLowerCase().includes("funcionalidades")) {
      currentSection = "FEATURES";
      continue;
    }

    // Detect Integrations section
    if (line.toLowerCase().includes("interoperabilidad") || line.toLowerCase().includes("integraciones")) {
      currentSection = "INTEGRATIONS";
      continue;
    }

    // Detect Legal considerations
    if (line.toLowerCase().includes("consideraciones legales") || line.toLowerCase().includes("normativa")) {
      currentSection = "LEGAL";
      const parts = line.split(/[:\t]+/);
      if (parts.length > 1 && parts[1].trim()) {
        currentLegal = parts[1].trim();
      }
      continue;
    }

    // Accumulate lines based on currentSection
    if (currentSection === "OBJETIVO") {
      if (currentObjective) currentObjective += " " + line;
      else currentObjective = line;
    } else if (currentSection === "FEATURES") {
      // Clean bullet/number prefix
      const cleanLine = line.replace(/^[\d+\.\-\*\•\o]+\s*/, "").trim();
      if (cleanLine.length > 3) {
        currentFeatures.push(cleanLine);
      }
    } else if (currentSection === "INTEGRATIONS") {
      const cleanLine = line.replace(/^[\d+\.\-\*\•\o]+\s*/, "").trim();
      if (cleanLine.length > 2) {
        currentIntegrations.push(cleanLine);
      }
    } else if (currentSection === "LEGAL") {
      if (currentLegal) currentLegal += " " + line;
      else currentLegal = line;
    }
  }

  // Push final accumulator
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
