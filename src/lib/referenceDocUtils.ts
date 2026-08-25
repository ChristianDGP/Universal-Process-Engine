import { ReferenceDocument, ReferenceDocumentSection } from "../types";
import mammoth from "mammoth";

const STORAGE_KEY = "upe_reference_documents_v1";

export const DEFAULT_REFERENCE_DOCUMENTS: ReferenceDocument[] = [
  {
    id: "REF-MINSAL-RUMED-01",
    name: "Manual de Normas de Esterilización y Desinfección en RUMED (MINSAL)",
    type: "NORMA_TECNICA",
    uploadedAt: "2025-01-10T10:00:00.000Z",
    sourceType: "docx",
    authorOrEntity: "División de Gestión de la Red Asistencial (DIGERA / MINSAL)",
    summary: "Establece los requisitos técnicos, trazabilidad por código de barras, etapas de lavado, inspección, empaque, esterilización y almacenamiento para centrales de esterilización.",
    sections: [
      {
        title: "1. Recepción y Lavado de Instrumental Quirúrgico",
        content: "Recepción de cajas e instrumental contaminado en área sucia, registro en sistema de trazabilidad, descontaminación enzimática y lavado automatizado en termodesinfectadoras.",
        suggestedActivities: [
          "Recepcionar y verificar instrumental en área sucia",
          "Realizar lavado enzimático y descontaminación ultrasónica",
          "Comprobar integridad física y limpieza bajo lupa de aumento"
        ],
        normativeCodes: ["PCI.5", "SIH-1.4.1"]
      },
      {
        title: "2. Preparación, Armado y Empaque",
        content: "Inspección de filo, lubricación de articulaciones, armado de cajas según pauta quirúrgica, incorporación de integradores químicos clase 5 y sellado hermético.",
        suggestedActivities: [
          "Armar y verificar cajas quirúrgicas contra pauta institucional",
          "Colocar indicador químico interno clase 5 o 6",
          "Sellar y rotular paquete con etiqueta de código de barras y vencimiento"
        ],
        normativeCodes: ["PCI.5", "SIH-1.4.1"]
      },
      {
        title: "3. Ciclo de Esterilización y Validación de Parámetros",
        content: "Carga de autoclaves de vapor o peróxido de hidrógeno, monitoreo de temperatura, presión y tiempo, lectura de indicadores biológicos de lectura rápida.",
        suggestedActivities: [
          "Cargar autoclave y programar ciclo según tipo de material",
          "Monitorear parámetros físicos de presión, tiempo y temperatura",
          "Verificar y registrar viraje de control biológico e integrador químico"
        ],
        normativeCodes: ["PCI.5", "SIH-1.4.1", "FMS.7"]
      },
      {
        title: "4. Almacenamiento Estéril y Despacho a Pabellones",
        content: "Custodia en bodega de material estéril con control estricto de temperatura (18-22°C) y humedad (30-60%), despacho en carros cerrados a pabellón.",
        suggestedActivities: [
          "Almacenar material estéril en estanterías normadas",
          "Controlar condiciones ambientales de temperatura y humedad",
          "Despachar paquetes estériles con registro de trazabilidad al paciente"
        ],
        normativeCodes: ["PCI.5", "SIH-1.4.1", "SIH-1.3.9"]
      }
    ]
  },
  {
    id: "REF-FARMA-SEG-02",
    name: "Guía de Seguridad en Gestión y Uso de Medicamentos de Alto Riesgo",
    type: "GUIA_CLINICA",
    uploadedAt: "2025-01-15T12:30:00.000Z",
    sourceType: "pdf",
    authorOrEntity: "Comité de Farmacia y Terapéutica Institucional",
    summary: "Guía técnica para la prescripción electrónica, validación farmacéutica, preparación en dosis unitaria y administración con doble chequeo de fármacos de alto riesgo y LASA.",
    sections: [
      {
        title: "1. Prescripción Electrónica y Conciliación Medicamentosa",
        content: "Generación de receta electrónica con verificación de alergias, dosificación por función renal y conciliación medicamentosa al ingreso hospitalario.",
        suggestedActivities: [
          "Verificar alergias previas y función renal del paciente",
          "Prescribir orden médica electrónica en FCE con dosis y vía explícita",
          "Ejecutar conciliación medicamentosa al ingreso asistencial"
        ],
        normativeCodes: ["IPSG.3", "MMU.3", "SIH-1.2.1", "SIH-1.3.6"]
      },
      {
        title: "2. Validación Farmacéutica y Dispensación por Dosis Unitaria",
        content: "Revisión técnica de la orden médica por químico farmacéutico, fraccionamiento, rotulado con código de barras y dispensación en carros de unidosis.",
        suggestedActivities: [
          "Validar farmacéuticamente interacciones y compatibilidades",
          "Fraccionar y re-envasar medicamento en dosis unitaria con código de barras",
          "Dispensar carro de medicación individualizada por paciente"
        ],
        normativeCodes: ["IPSG.3", "MMU.4", "SIH-1.3.6"]
      },
      {
        title: "3. Administración Segura y Doble Chequeo Independiente",
        content: "Verificación de los 5 correctos al pie de cama, lectura de código de barras de pulsera y fármaco, doble chequeo por dos enfermeros para medicamentos de alto riesgo.",
        suggestedActivities: [
          "Identificar al paciente con dos identificadores activos",
          "Efectuar doble chequeo independiente para fármacos de alto riesgo",
          "Administrar medicamento y registrar en hoja clínica de enfermería"
        ],
        normativeCodes: ["IPSG.1", "IPSG.3", "MMU.5", "SIH-1.2.3"]
      }
    ]
  },
  {
    id: "REF-ADM-CONTINUIDAD-03",
    name: "Protocolo Institucional de Admisión, Triaje y Continuidad de la Atención",
    type: "PROTOCOLO",
    uploadedAt: "2025-01-20T09:15:00.000Z",
    sourceType: "docx",
    authorOrEntity: "Subdirección de Gestión del Cuidado y Admisión",
    summary: "Define los flujos de recepción de pacientes, categorización de urgencia según Manchester/ESI, asignación de camas, traslados interservicios y planificación del alta.",
    sections: [
      {
        title: "1. Admisión y Categorización de Urgencia (Triaje)",
        content: "Recepción en tótem o mesón de admisión, verificación de identidad y previsión FONASA/ISAPRE, categorización clínica C1 a C5 por enfermería.",
        suggestedActivities: [
          "Registrar datos demográficos y previsión en Maestro de Pacientes",
          "Categorizar motivo de consulta y signos vitales en Triaje",
          "Derivar a box de reanimación o sala de espera según gravedad"
        ],
        normativeCodes: ["ACC.1", "IPSG.1", "SIH-1.1.1", "SIH-1.1.7"]
      },
      {
        title: "2. Asignación de Camas y Censo Hospitalario",
        content: "Gestión centralizada de camas según complejidad clínica, aislamiento requerido y censo en tiempo real.",
        suggestedActivities: [
          "Solicitar cama de hospitalización desde urgencia o pabellón",
          "Asignar cama disponible en Sistema de Gestión de Camas",
          "Confirmar traslado y recepción del paciente en sala de hospitalizados"
        ],
        normativeCodes: ["ACC.2", "SIH-1.1.9", "SIH-1.2.5"]
      },
      {
        title: "3. Planificación del Alta y Entrega de Epicrisis",
        content: "Coordinación del egreso hospitalario, entrega de epicrisis médica, receta de alta y citación a control ambulatorio.",
        suggestedActivities: [
          "Emitir informe médico de alta (Epicrisis) con plan terapéutico",
          "Entregar indicaciones de enfermería y receta de medicamentos al paciente",
          "Cerrar episodio clínico y liberar cama en censo hospitalario"
        ],
        normativeCodes: ["ACC.3", "MOI.3", "SIH-1.2.1", "SIH-1.1.9"]
      }
    ]
  }
];

export function getStoredReferenceDocuments(): ReferenceDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REFERENCE_DOCUMENTS));
      return DEFAULT_REFERENCE_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_REFERENCE_DOCUMENTS;
  } catch (err) {
    console.error("Error reading reference documents from storage:", err);
    return DEFAULT_REFERENCE_DOCUMENTS;
  }
}

export function saveReferenceDocuments(docs: ReferenceDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Error saving reference documents to storage:", err);
  }
}

export const saveStoredReferenceDocuments = saveReferenceDocuments;

export function addReferenceDocument(doc: ReferenceDocument): ReferenceDocument[] {
  const current = getStoredReferenceDocuments();
  const updated = [doc, ...current.filter((d) => d.id !== doc.id)];
  saveReferenceDocuments(updated);
  return updated;
}

export function deleteReferenceDocument(id: string): ReferenceDocument[] {
  const current = getStoredReferenceDocuments();
  const updated = current.filter((d) => d.id !== id);
  saveReferenceDocuments(updated);
  return updated;
}

export async function parseUploadedReferenceFile(file: File): Promise<ReferenceDocument> {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  let rawText = "";

  if (extension === "docx" || extension === "doc") {
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      rawText = result.value || "";
    } catch (err) {
      console.warn("Mammoth extraction failed, falling back to text read:", err);
      rawText = await file.text();
    }
  } else if (extension === "json") {
    try {
      const jsonContent = await file.text();
      const parsed = JSON.parse(jsonContent);
      if (parsed.name && Array.isArray(parsed.sections)) {
        return {
          id: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: parsed.name,
          type: parsed.type || "MANUAL",
          uploadedAt: new Date().toISOString(),
          sourceType: "json",
          sizeBytes: file.size,
          authorOrEntity: parsed.authorOrEntity || "Institución",
          summary: parsed.summary || "",
          sections: parsed.sections,
          rawContent: jsonContent.slice(0, 10000)
        };
      }
      rawText = jsonContent;
    } catch {
      rawText = await file.text();
    }
  } else {
    rawText = await file.text();
  }

  // Parse sections from extracted text
  const sections = extractSectionsFromText(rawText);

  let docType: ReferenceDocument["type"] = "MANUAL";
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes("guia") || lowerName.includes("guía")) docType = "GUIA_CLINICA";
  else if (lowerName.includes("paper") || lowerName.includes("estudio") || lowerName.includes("investigacion")) docType = "PAPER";
  else if (lowerName.includes("norma") || lowerName.includes("reglamento")) docType = "NORMA_TECNICA";
  else if (lowerName.includes("protocolo") || lowerName.includes("procedimiento")) docType = "PROTOCOLO";

  return {
    id: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: fileName.replace(/\.[^/.]+$/, "").replace(/[_]/g, " "),
    type: docType,
    uploadedAt: new Date().toISOString(),
    sourceType: (extension as any) || "docx",
    sizeBytes: file.size,
    authorOrEntity: "Documento Institucional Cargado",
    summary: rawText.slice(0, 240).replace(/\s+/g, " ") + (rawText.length > 240 ? "..." : ""),
    sections: sections.length > 0 ? sections : [
      {
        title: "Contenido Principal del Documento",
        content: rawText.slice(0, 2000),
        suggestedActivities: [
          "Verificar requisitos y normas del documento de referencia",
          "Ejecutar actividades operacionales conformes al procedimiento",
          "Registrar evidencias y validar cumplimiento normativo"
        ]
      }
    ],
    rawContent: rawText.slice(0, 15000)
  };
}

function extractSectionsFromText(text: string): ReferenceDocumentSection[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const sections: ReferenceDocumentSection[] = [];

  let currentTitle = "";
  let currentContentLines: string[] = [];
  let currentActivities: string[] = [];

  for (const line of lines) {
    const isHeader =
      /^(?:secci[oó]n|cap[ií]tulo|etapa|fase|paso|\d+\.|\d+\.\d+)\s+[^:]{3,}/i.test(line) ||
      (line.length < 80 && line.endsWith(":") && !line.includes(","));

    if (isHeader) {
      if (currentTitle && (currentContentLines.length > 0 || currentActivities.length > 0)) {
        sections.push({
          title: currentTitle,
          content: currentContentLines.join(" ").slice(0, 800),
          suggestedActivities: currentActivities.length > 0 ? currentActivities : [
            `Ejecutar paso operativo para ${currentTitle}`,
            `Validar cumplimiento técnico de ${currentTitle}`,
            `Registrar resultado en sistema informático`
          ]
        });
      }
      currentTitle = line.replace(/[:]$/, "");
      currentContentLines = [];
      currentActivities = [];
    } else {
      if (!currentTitle) {
        currentTitle = "Introducción y Alcance del Procedimiento";
      }

      // Check if line looks like an action item / activity
      if (/^[•\-\*]\s+|^\d+\)\s+|^(?:realizar|verificar|registrar|evaluar|administrar|ejecutar|notificar|controlar|validar|solicitar)\s+/i.test(line)) {
        const cleanAct = line.replace(/^[•\-\*\d\.\)\s]+/, "").trim();
        if (cleanAct.length > 8 && currentActivities.length < 5) {
          currentActivities.push(cleanAct);
        }
      } else {
        currentContentLines.push(line);
      }
    }
  }

  if (currentTitle && (currentContentLines.length > 0 || currentActivities.length > 0)) {
    sections.push({
      title: currentTitle,
      content: currentContentLines.join(" ").slice(0, 800),
      suggestedActivities: currentActivities.length > 0 ? currentActivities : [
        `Ejecutar actividades operacionales de ${currentTitle}`,
        `Registrar conformidad técnica en sistema`
      ]
    });
  }

  return sections;
}
