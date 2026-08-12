export interface TaxonomyItem {
  id: string;
  macroproceso: string;
  proceso: string;
  microproceso: string;
}

// 92 Official taxonomy items from the provided CSV specification
export const DEFAULT_TAXONOMY: TaxonomyItem[] = [
  { id: "tax_1", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo a la Atención Urgencia", microproceso: "Admisión a Urgencias" },
  { id: "tax_2", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Ambulatoria", microproceso: "Admisión Ambulatoria" },
  { id: "tax_3", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Ambulatoria", microproceso: "Admisión Toma de Muestras" },
  { id: "tax_4", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Ambulatoria", microproceso: "Gestión de Agenda" },
  { id: "tax_5", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Ambulatoria", microproceso: "Gestión de Citas" },
  { id: "tax_6", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Hospitalaria", microproceso: "Admisión a Hospitalización" },
  { id: "tax_7", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Hospitalaria", microproceso: "Gestión de Camas" },
  { id: "tax_8", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Apoyo Atención Hospitalaria", microproceso: "Gestión Visitas Hospitalizados" },
  { id: "tax_9", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de la Demanda", microproceso: "Gestión de IC" },
  { id: "tax_10", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de la Demanda", microproceso: "Listas de Espera GES" },
  { id: "tax_11", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de la Demanda", microproceso: "Listas de Espera No GES" },
  { id: "tax_12", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de Pacientes bajo control", microproceso: "Gestión Prequirúrgico" },
  { id: "tax_13", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de Pacientes bajo control", microproceso: "Quimioterapia" },
  { id: "tax_14", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Gestión de Pacientes bajo control", microproceso: "TACO" },
  { id: "tax_15", macroproceso: "Apoyo Administrativo a la Atención Clínica", proceso: "Procedimientos especiales", microproceso: "Gestión de Fallecidos" },
  { id: "tax_16", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Abastecimiento", microproceso: "Gestión de Bodegas" },
  { id: "tax_17", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Abastecimiento", microproceso: "Gestión de Compras" },
  { id: "tax_18", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Abastecimiento", microproceso: "Gestión de Contratos" },
  { id: "tax_19", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Abastecimiento", microproceso: "Planificación de Compras" },
  { id: "tax_20", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Esterilización", microproceso: "Desinfección de Alto Nivel DAN" },
  { id: "tax_21", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Esterilización", microproceso: "Esterilización" },
  { id: "tax_22", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Administración de Activos" },
  { id: "tax_23", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Gestión de Presupuesto" },
  { id: "tax_24", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Gestión de Tesorería" },
  { id: "tax_25", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Ingresos y Gastos" },
  { id: "tax_26", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Liquidación de Pago" },
  { id: "tax_27", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Monitoreo Auditoría CC" },
  { id: "tax_28", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Recaudación Ambulatoria" },
  { id: "tax_29", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Finanzas", microproceso: "Recaudación Hospitalizados" },
  { id: "tax_30", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Asistencia" },
  { id: "tax_31", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Beneficios Funcionarios" },
  { id: "tax_32", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Capacitación Funcionario" },
  { id: "tax_33", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Contratación" },
  { id: "tax_34", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Licencias Médicas" },
  { id: "tax_35", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Reclutamiento" },
  { id: "tax_36", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Recursos Humanos", microproceso: "Trato Laboral" },
  { id: "tax_37", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Gestión de Mesa de Ayuda" },
  { id: "tax_38", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Mantenimiento de Equipos" },
  { id: "tax_39", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Mantenimiento Infraestructura" },
  { id: "tax_40", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Roperia" },
  { id: "tax_41", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Servicios de Vestidores" },
  { id: "tax_42", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Traslado de Pacientes" },
  { id: "tax_43", macroproceso: "Apoyo Administrativo Logístico e Industrial", proceso: "Servicios Generales", microproceso: "Traslado Externo de Pacientes" },
  { id: "tax_44", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Anatomía Patológica" },
  { id: "tax_45", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Autopsia" },
  { id: "tax_46", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Citología Misceláneas" },
  { id: "tax_47", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Gestión de Material en Archivo" },
  { id: "tax_48", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Procesamiento de Biopsias" },
  { id: "tax_49", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Anatomía Patológica", microproceso: "Procesamiento de Citología PAP" },
  { id: "tax_50", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Farmacia", microproceso: "Farmacia Ambulatoria" },
  { id: "tax_51", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Farmacia", microproceso: "Farmacia de Urgencias" },
  { id: "tax_52", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Farmacia", microproceso: "Farmacia Hospitalizados" },
  { id: "tax_53", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Imagenología", microproceso: "Imagenología" },
  { id: "tax_54", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Laboratorio", microproceso: "Hematología" },
  { id: "tax_55", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Laboratorio", microproceso: "Laboratorio" },
  { id: "tax_56", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Laboratorio", microproceso: "Recepción de Laboratorio Clínico" },
  { id: "tax_57", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Laboratorio", microproceso: "Toma de Muestras Ambulatoria" },
  { id: "tax_58", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Laboratorio", microproceso: "Uroanálisis" },
  { id: "tax_59", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Medicina Física y Rehabilitación", microproceso: "Kinesiología Ambulatoria" },
  { id: "tax_60", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Medicina Física y Rehabilitación", microproceso: "Kinesiología Hospitalizados" },
  { id: "tax_61", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Nutrición", microproceso: "Alimentación y Nutrición" },
  { id: "tax_62", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Nutrición", microproceso: "ANI Adulto Ambulatoria" },
  { id: "tax_63", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Nutrición", microproceso: "ANI Adulto Atención Cerrada" },
  { id: "tax_64", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Nutrición", microproceso: "ANI Adulto Domiciliaria" },
  { id: "tax_65", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Nutrición", microproceso: "Servicio de Nutrición Enteral" },
  { id: "tax_66", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Pabellón Quirúrgico", microproceso: "Gestión de Pabellones e IQ" },
  { id: "tax_67", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Pabellón Quirúrgico", microproceso: "Intervenciones Quirúrgicas" },
  { id: "tax_68", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Pabellón Quirúrgico", microproceso: "Procedimientos Endoscópicos" },
  { id: "tax_69", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Procedimientos", microproceso: "Diálisis" },
  { id: "tax_70", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Unidad de Medicina Transfusional", microproceso: "Gestión de Donantes" },
  { id: "tax_71", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Unidad de Medicina Transfusional", microproceso: "Gestión de Hemocomponentes" },
  { id: "tax_72", macroproceso: "Apoyo diagnóstico y terapéuticos", proceso: "Unidad de Medicina Transfusional", microproceso: "Gestión de Transfusión Sanguínea" },
  { id: "tax_73", macroproceso: "Dirección", proceso: "Control de Gestión", microproceso: "Elaboración de Reportes" },
  { id: "tax_74", macroproceso: "Dirección", proceso: "Control de Gestión", microproceso: "Programación PCA" },
  { id: "tax_75", macroproceso: "Dirección", proceso: "Gestión de Calidad", microproceso: "Gestión IAAS" },
  { id: "tax_76", macroproceso: "Dirección", proceso: "Gestión de Proyectos", microproceso: "Gestión de Proyectos" },
  { id: "tax_77", macroproceso: "Dirección", proceso: "Relacionamiento con la Comunidad", microproceso: "Gestión de OIRS" },
  { id: "tax_78", macroproceso: "Dirección", proceso: "Relacionamiento con la Comunidad", microproceso: "Relaciones Públicas" },
  { id: "tax_79", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Endodoncia" },
  { id: "tax_80", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Odontopediatría" },
  { id: "tax_81", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Ortodoncia" },
  { id: "tax_82", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Periodoncia" },
  { id: "tax_83", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Radiología Dental" },
  { id: "tax_84", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de Rehabilitación Oral" },
  { id: "tax_85", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención de TTM" },
  { id: "tax_86", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención Dental" },
  { id: "tax_87", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Atención Procedimientos" },
  { id: "tax_88", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Cirugía Maxilofacial" },
  { id: "tax_89", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Cirugía Menor Ambulatoria" },
  { id: "tax_90", macroproceso: "Principales", proceso: "Atención Ambulatoria", microproceso: "Consultas Ambulatorias" },
  { id: "tax_91", macroproceso: "Principales", proceso: "Atención Hospitalizados", microproceso: "Hospital de Día MQ" },
  { id: "tax_92", macroproceso: "Principales", proceso: "Atención Hospitalizados", microproceso: "Hospital de Día SM" },
  { id: "tax_93", macroproceso: "Principales", proceso: "Atención Hospitalizados", microproceso: "Hospitalización" },
  { id: "tax_94", macroproceso: "Principales", proceso: "Atención Hospitalizados", microproceso: "Hospitalización Domiciliaria" },
  { id: "tax_95", macroproceso: "Principales", proceso: "Atención Urgencia", microproceso: "Atención de Urgencias" }
];

const TAXONOMY_STORAGE_KEY = "upe_official_taxonomy_v1";

export function getStoredTaxonomy(): TaxonomyItem[] {
  try {
    const raw = localStorage.getItem(TAXONOMY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading taxonomy from localStorage:", e);
  }
  return DEFAULT_TAXONOMY;
}

export function saveStoredTaxonomy(taxonomy: TaxonomyItem[]): void {
  try {
    localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(taxonomy));
  } catch (e) {
    console.error("Error saving taxonomy to localStorage:", e);
  }
}

export function resetTaxonomyToDefault(): TaxonomyItem[] {
  saveStoredTaxonomy(DEFAULT_TAXONOMY);
  return DEFAULT_TAXONOMY;
}

// Helper to normalize strings for robust fuzzy matching
function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ") // replace special chars with space
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult {
  isMatched: boolean;
  macroproceso: string;
  proceso: string;
  microproceso: string;
  matchedItem?: TaxonomyItem;
  score?: number;
}

/**
 * Evaluates whether a process matches the official taxonomy.
 * Returns match status and classification.
 */
export function matchProcessToTaxonomy(
  process: { name: string; description?: string; processOwner?: string; macroproceso?: string; proceso?: string; microproceso?: string },
  taxonomyList: TaxonomyItem[] = getStoredTaxonomy()
): MatchResult {
  const UNCLASSIFIED = "Otros / Sin Clasificar";

  // 1. Direct explicit classification check
  if (process.macroproceso && process.proceso && process.microproceso && process.macroproceso !== UNCLASSIFIED) {
    const directMatch = taxonomyList.find(
      (item) =>
        item.macroproceso.toLowerCase() === process.macroproceso?.toLowerCase() &&
        item.proceso.toLowerCase() === process.proceso?.toLowerCase() &&
        item.microproceso.toLowerCase() === process.microproceso?.toLowerCase()
    );
    if (directMatch) {
      return {
        isMatched: true,
        macroproceso: directMatch.macroproceso,
        proceso: directMatch.proceso,
        microproceso: directMatch.microproceso,
        matchedItem: directMatch
      };
    }
  }

  // Normalize process text sources
  const normName = normalizeText(process.name || "");
  const normDesc = normalizeText(process.description || "");
  const normOwner = normalizeText(process.processOwner || "");
  const fullText = `${normName} ${normDesc} ${normOwner}`;

  if (!normName) {
    return {
      isMatched: false,
      macroproceso: UNCLASSIFIED,
      proceso: UNCLASSIFIED,
      microproceso: UNCLASSIFIED
    };
  }

  // 2. Exact or substring match against Microproceso
  let bestMatch: TaxonomyItem | null = null;
  let highestScore = 0;

  for (const item of taxonomyList) {
    const normMicro = normalizeText(item.microproceso);
    const normProc = normalizeText(item.proceso);
    const normMacro = normalizeText(item.macroproceso);

    // Exact microproceso match with name
    if (normName === normMicro || normName.includes(normMicro) || normMicro.includes(normName)) {
      return {
        isMatched: true,
        macroproceso: item.macroproceso,
        proceso: item.proceso,
        microproceso: item.microproceso,
        matchedItem: item,
        score: 100
      };
    }

    // Keyword word overlaps
    const microWords = normMicro.split(" ").filter((w) => w.length > 3);
    let matchCount = 0;
    for (const word of microWords) {
      if (normName.includes(word)) {
        matchCount++;
      }
    }

    if (microWords.length > 0) {
      const ratio = matchCount / microWords.length;
      if (ratio > 0.6 && ratio > highestScore) {
        highestScore = ratio;
        bestMatch = item;
      }
    }

    // Match with Proceso or Macroproceso in name
    if (!bestMatch && (normName.includes(normProc) || normProc.includes(normName))) {
      bestMatch = item;
      highestScore = 0.5;
    }
  }

  if (bestMatch) {
    return {
      isMatched: true,
      macroproceso: bestMatch.macroproceso,
      proceso: bestMatch.proceso,
      microproceso: bestMatch.microproceso,
      matchedItem: bestMatch,
      score: Math.round(highestScore * 100)
    };
  }

  // Fallback: No match found
  return {
    isMatched: false,
    macroproceso: UNCLASSIFIED,
    proceso: UNCLASSIFIED,
    microproceso: UNCLASSIFIED
  };
}

/**
 * Parses CSV string (using semicolon ';' or comma ',') into TaxonomyItem array.
 */
export function parseTaxonomyCSV(csvText: string): TaxonomyItem[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const items: TaxonomyItem[] = [];
  // Skip header if present
  const startIdx = lines[0].toLowerCase().includes("macroproceso") ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.includes(";") ? line.split(";") : line.split(",");
    if (parts.length >= 3) {
      const macro = parts[0].trim();
      const proc = parts[1].trim();
      const micro = parts[2].trim();
      if (macro && proc && micro) {
        items.push({
          id: `tax_custom_${Date.now()}_${i}`,
          macroproceso: macro,
          proceso: proc,
          microproceso: micro
        });
      }
    }
  }
  return items;
}

/**
 * Converts TaxonomyItem array to downloadable CSV.
 */
export function taxonomyToCSV(taxonomyList: TaxonomyItem[]): string {
  let csv = "MACROPROCESO;PROCESO;MICROPROCESO\n";
  for (const item of taxonomyList) {
    csv += `${item.macroproceso};${item.proceso};${item.microproceso}\n`;
  }
  return csv;
}
