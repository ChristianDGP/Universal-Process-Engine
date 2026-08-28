import mammoth from "mammoth";
import { JCIStandard } from "../types";
import { OFFICIAL_JCI_CATEGORIES } from "../data/jciCatalogPreset";

/**
 * Parses an uploaded Word file (.docx), text file, or JSON file
 * into structured JCIStandard objects according to JCI accreditation standards format.
 */
export async function parseJCIDocumentFile(file: File): Promise<JCIStandard[]> {
  const fileName = file.name.toLowerCase();

  // 1. JSON File Support
  if (fileName.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data as JCIStandard[];
    } else if (data.standards && Array.isArray(data.standards)) {
      return data.standards as JCIStandard[];
    }
    throw new Error("El archivo JSON no contiene un catálogo JCI válido.");
  }

  // 2. Word File (.docx / .doc) using mammoth
  let rawText = "";
  if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value;
    } catch (err) {
      console.warn("Mammoth extraction failed for JCI docx, falling back to FileReader as text", err);
      rawText = await file.text();
    }
  } else {
    // Plain text or markdown
    rawText = await file.text();
  }

  return parseJCITextContent(rawText);
}

/**
 * Robust text parser that extracts JCI standards structured from JCI 7th Edition document text.
 * Handles headers with/without colons, multi-line paragraphs, tables, bullets, and numbers.
 */
export function parseJCITextContent(rawText: string): JCIStandard[] {
  if (!rawText || !rawText.trim()) return [];

  const standards: JCIStandard[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let currentChapter = OFFICIAL_JCI_CATEGORIES[0].name;
  let currentCode = "";
  let currentName = "";
  let currentObjective = "";
  let currentElements: string[] = [];
  let currentStatus: "CUMPLIDO" | "EN_EVALUACION" | "BRECHA" = "CUMPLIDO";

  let currentSection: "NONE" | "OBJECTIVE" | "ELEMENTS" = "NONE";

  function pushCurrentStandard() {
    if (currentCode || currentName || currentObjective || currentElements.length > 0) {
      const codeClean = currentCode || `JCI.${standards.length + 1}`;
      standards.push({
        id: codeClean,
        code: codeClean,
        chapter: currentChapter,
        name: currentName || `Estándar JCI ${codeClean}`,
        objective: currentObjective.trim() || "Propósito y requerimientos del estándar de acreditación JCI.",
        measurableElements: currentElements.length > 0 ? [...currentElements] : ["Cumplimiento de políticas y protocolos institucionales."],
        supportStatus: currentStatus
      });
    }

    currentCode = "";
    currentName = "";
    currentObjective = "";
    currentElements = [];
    currentStatus = "CUMPLIDO";
    currentSection = "NONE";
  }

  // Known JCI Chapter prefixes mapping to full titles
  const chapterPrefixMap: Record<string, string> = {
    IPSG: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    ACC: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    AOP: "Evaluación de los Pacientes (Assessment of Patients)",
    COP: "Atención de los Pacientes (Care of Patients)",
    ASC: "Anestesia y Atención Quirúrgica (Anesthesia and Surgical Care)",
    MMU: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    PFE: "Educación del Paciente y la Familia (Patient and Family Education)",
    QPS: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)",
    PCI: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    GLD: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)",
    FMS: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    SQE: "Calificaciones y Educación del Personal (Staff Qualifications and Education)",
    MOI: "Gestión de la Información (Management of Information)",
    PCC: "Atención Centrada en el Paciente (Patient-Centered Care)"
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Detect Chapter Header e.g. "Capítulo: Acceso a la Atención (ACC)", "METAS INTERNACIONALES (IPSG)"
    let detectedChapter = false;
    for (const [code, fullName] of Object.entries(chapterPrefixMap)) {
      if (
        line.toUpperCase().includes(`(${code})`) ||
        line.toUpperCase().includes(`[${code}]`) ||
        (line.toUpperCase().startsWith(code) && line.length < 60 && !line.match(/^[A-Z]{2,4}\s*[\.\-]\s*\d+/i)) ||
        (line.toUpperCase().startsWith("CAPÍTULO") && line.toUpperCase().includes(code)) ||
        (line.toUpperCase().startsWith("CAPITULO") && line.toUpperCase().includes(code))
      ) {
        currentChapter = fullName;
        detectedChapter = true;
        break;
      }
    }
    if (detectedChapter) continue;

    // 2. Detect Standard Code & Name e.g. "Estándar IPSG.1", "IPSG.1 Identificación de Pacientes", "ACC.1.1 Criterios de Ingreso", "Estándar: MMU.4"
    const stdMatch = line.match(/^(?:Estándar|Estandar|Standard|Cód\.|Cod\.|Código)?\s*[:\-–—]?\s*([A-Z]{2,4})[\.\-\s](\d+(?:\.\d+)?)\.?\s*(?:[\-–—:]\s*)?(.*)$/i);
    if (stdMatch) {
      const prefix = stdMatch[1].toUpperCase();
      if (chapterPrefixMap[prefix]) {
        pushCurrentStandard();
        currentCode = `${prefix}.${stdMatch[2]}`;
        currentChapter = chapterPrefixMap[prefix];
        const restOfLine = stdMatch[3]?.trim();
        if (restOfLine && restOfLine.length > 0) {
          currentName = restOfLine.replace(/\.$/, "").trim();
        }
        currentSection = "OBJECTIVE";
        continue;
      }
    }

    // 3. Detect Explicit "Nombre / Título" line
    const titleExplicitMatch = line.match(/^(?:Título|Titulo|Nombre del Estándar|Nombre del Estandar|Nombre)(?:\s*[:\-–—\t]|\s+)(.+)$/i);
    if (titleExplicitMatch && titleExplicitMatch[1].trim().length > 2) {
      currentName = titleExplicitMatch[1].trim().replace(/\.$/, "");
      continue;
    }

    // 4. Detect Objective / Purpose / Intención section
    const objMatch = line.match(/^(?:Propósito|Proposito|Intención|Intencion|Objetivo|Requisitos del Estándar|Requisitos)(?:\s+de\s+[A-Z]{2,4}[\.\-\s]\d+(?:\.\d+)?)?(?:\s*[:\-–—\t]|\s+)(.+)$/i);
    if (objMatch) {
      currentSection = "OBJECTIVE";
      currentObjective = objMatch[1].trim();
      continue;
    } else if (line.match(/^(?:Propósito|Proposito|Intención|Intencion|Objetivo|Requisitos del Estándar|Requisitos)(?:\s+de\s+[A-Z]{2,4}[\.\-\s]\d+(?:\.\d+)?)?\s*[:\-–—\t]?$/i)) {
      currentSection = "OBJECTIVE";
      continue;
    }

    // 5. Detect Measurable Elements section e.g. "Elementos Medibles de IPSG.1", "Elementos medibles:", "Criterios de Evaluación"
    if (
      line.match(/^(?:Elementos [Mm]edibles(?:\s+de\s+[A-Z]{2,4}[\.\-\s]\d+(?:\.\d+)?)?|Criterios de [Ee]valuación|Puntos de [Vv]erificación|Requerimientos de [Cc]umplimiento)\s*[:\-–—\t]?$/i) ||
      line.toLowerCase().startsWith("elementos medibles") ||
      line.toLowerCase().startsWith("criterios de evaluación") ||
      line.toLowerCase().startsWith("criterios de evaluacion")
    ) {
      currentSection = "ELEMENTS";
      continue;
    }

    // 6. Detect Support Status e.g. "Estado: CUMPLIDO", "Estado de Cumplimiento: BRECHA"
    const statusMatch = line.match(/^(?:Estado|Estado de Cumplimiento|Cumplimiento)\s*[:\-–—\t]\s*(CUMPLIDO|EN_EVALUACION|BRECHA|CUMPLE|NO CUMPLE|PARCIAL)/i);
    if (statusMatch) {
      const rawStatus = statusMatch[1].toUpperCase();
      if (rawStatus.includes("BRECHA") || rawStatus.includes("NO CUMPLE")) {
        currentStatus = "BRECHA";
      } else if (rawStatus.includes("EVALUACION") || rawStatus.includes("PARCIAL")) {
        currentStatus = "EN_EVALUACION";
      } else {
        currentStatus = "CUMPLIDO";
      }
      continue;
    }

    // 7. Accumulate lines based on active section
    if (currentSection === "ELEMENTS") {
      // Clean bullet, number or letter prefix e.g. "1.", "•", "-", "a)", "EM 1."
      const cleanLine = line.replace(/^(?:EM\s*\d+\.?|[\d+\.\-\*\•\o\▪\▫\►\)]+)\s*/i, "").trim();
      if (cleanLine.length > 2) {
        currentElements.push(cleanLine);
      }
    } else if (currentSection === "OBJECTIVE") {
      if (!currentName && line.length < 90 && !line.endsWith(".")) {
        currentName = line;
      } else {
        if (currentObjective) currentObjective += " " + line;
        else currentObjective = line;
      }
    }
  }

  // Push final standard
  pushCurrentStandard();

  return standards;
}

/**
 * Exports the JCI Standards Catalog to a Word-compatible HTML Document (.doc)
 */
export function exportJCICatalogToWord(standards: JCIStandard[]) {
  const htmlHeader = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Catálogo de Acreditación JCI - Estándares de Calidad</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #0f172a; }
        h1 { font-size: 18pt; font-weight: bold; color: #1e1b4b; text-align: center; margin-bottom: 8px; }
        .subtitle { text-align: center; font-style: italic; color: #4338ca; font-size: 12pt; margin-bottom: 20px; }
        h2 { font-size: 13pt; font-weight: bold; color: #312e81; border-bottom: 2px solid #4338ca; padding-bottom: 4px; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; vertical-align: top; font-size: 10pt; }
        th { background-color: #e0e7ff; font-weight: bold; text-align: left; width: 25%; color: #1e1b4b; }
        ul, ol { margin: 4px 0; padding-left: 20px; }
        li { margin-bottom: 3px; }
        .code-badge { font-weight: bold; color: #312e81; background-color: #e0e7ff; padding: 2px 6px; }
      </style>
    </head>
    <body>
      <h1>CATÁLOGO OFICIAL DE ESTÁNDARES DE ACREDITACIÓN JCI</h1>
      <p class="subtitle">Joint Commission International - 7ma Edición Estándares Hospitalarios</p>
      <p style="text-align:center; font-size:10pt; color:#64748b;">Generado el ${new Date().toLocaleDateString("es-CL")}</p>
      <hr/>
  `;

  let htmlBody = "";

  // Group standards by Chapter
  const chapterGroups: Record<string, JCIStandard[]> = {};
  standards.forEach((std) => {
    const chapterName = std.chapter || "Otros Estándares JCI";
    if (!chapterGroups[chapterName]) chapterGroups[chapterName] = [];
    chapterGroups[chapterName].push(std);
  });

  for (const [chapterName, stdList] of Object.entries(chapterGroups)) {
    htmlBody += `<h2>CAPÍTULO JCI: ${chapterName.toUpperCase()}</h2>`;

    stdList.forEach((std) => {
      htmlBody += `
        <table>
          <tr>
            <th>Código Estándar</th>
            <td><strong class="code-badge">${std.code}</strong></td>
          </tr>
          <tr>
            <th>Nombre / Título</th>
            <td><strong>${std.name}</strong></td>
          </tr>
          <tr>
            <th>Capítulo JCI</th>
            <td>${std.chapter}</td>
          </tr>
          <tr>
            <th>Propósito / Requerimientos</th>
            <td>${std.objective}</td>
          </tr>
          <tr>
            <th>Elementos Medibles</th>
            <td>
              <ol>
                ${(std.measurableElements || []).map((e) => `<li>${e}</li>`).join("")}
              </ol>
            </td>
          </tr>
          <tr>
            <th>Estado de Cumplimiento</th>
            <td>${std.supportStatus || "CUMPLIDO"}</td>
          </tr>
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
  a.download = `Catalogo_JCI_Acreditacion_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
