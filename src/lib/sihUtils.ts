import { SIHSystem } from "../types";
import { INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";

export const SIH_STORAGE_KEY = "sih_catalog_state_v3";

/**
 * Normalizes text for search by converting to lowercase, removing accents/diacritics,
 * and stripping punctuation dots/commas.
 */
export function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\t,;:]/g, " ")
    .trim();
}

/**
 * Retrieves the authoritative SIH Catalog.
 * Ensures the latest preset definitions (such as 1.4.4 with all 14 features) are always preserved and merged.
 */
export function getActiveSihCatalog(): SIHSystem[] {
  try {
    const saved = localStorage.getItem(SIH_STORAGE_KEY);
    if (!saved) {
      // Clean previous versions
      localStorage.removeItem("sih_catalog_state_v1");
      localStorage.removeItem("sih_catalog_state_v2");
      localStorage.setItem(SIH_STORAGE_KEY, JSON.stringify(INITIAL_SIH_CATALOG));
      return INITIAL_SIH_CATALOG;
    }

    const parsed: SIHSystem[] = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with INITIAL_SIH_CATALOG to ensure that updated systems (like 1.4.4 with 14 features) are always up to date
      const merged = INITIAL_SIH_CATALOG.map((presetSys) => {
        const userSys = parsed.find((p) => p.code === presetSys.code);
        if (!userSys) return presetSys;
        // If preset has 14 features or more than userSys, use the authoritative preset features
        if ((presetSys.features?.length || 0) > (userSys.features?.length || 0) || presetSys.code === "1.4.4") {
          return {
            ...userSys,
            name: presetSys.name,
            objective: presetSys.objective,
            features: presetSys.features,
            integrations: presetSys.integrations,
            providerVendor: presetSys.providerVendor || userSys.providerVendor
          };
        }
        return userSys;
      });

      // Include any user-created custom systems not in preset
      const customSystems = parsed.filter((p) => !INITIAL_SIH_CATALOG.some((preset) => preset.code === p.code));
      const fullList = [...merged, ...customSystems];
      localStorage.setItem(SIH_STORAGE_KEY, JSON.stringify(fullList));
      return fullList;
    }
  } catch (e) {
    console.error("Error reading SIH catalog from storage:", e);
  }
  return INITIAL_SIH_CATALOG;
}

/**
 * Saves the SIH catalog to localStorage.
 */
export function saveActiveSihCatalog(catalog: SIHSystem[]): void {
  try {
    localStorage.setItem(SIH_STORAGE_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.error("Error saving SIH catalog to storage:", e);
  }
}

/**
 * Finds a matching SIHSystem given an arbitrary text (e.g. from an activity supportTech field).
 */
export function findSihSystemByText(text: string, catalog?: SIHSystem[]): SIHSystem | null {
  if (!text) return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();
  if (lower === "no tiene" || lower === "no aplica" || lower === "ninguno" || lower === "manual") {
    return null;
  }

  const activeCatalog = catalog && catalog.length > 0 ? catalog : getActiveSihCatalog();

  // 1. Direct code match in brackets or standalone: e.g. [1.4.4] or 1.4.4
  for (const sys of activeCatalog) {
    const codePattern = new RegExp(`(^|\\s|\\[|-)(${sys.code.replace(".", "\\.")})($|\\s|\\]|-)`, "i");
    if (codePattern.test(raw)) {
      return sys;
    }
  }

  // 2. Direct name match
  const normInput = normalizeText(raw);
  for (const sys of activeCatalog) {
    const normName = normalizeText(sys.name);
    if (normInput.includes(normName) || normName.includes(normInput)) {
      return sys;
    }
  }

  // 3. Keyword heuristic match for specific known systems
  if (normInput.includes("traslado") || normInput.includes("camilla") || normInput.includes("camillero")) {
    const s144 = activeCatalog.find((s) => s.code === "1.4.4");
    if (s144) return s144;
  }
  if (normInput.includes("bodega") || normInput.includes("wms") || normInput.includes("insumo")) {
    const s141 = activeCatalog.find((s) => s.code === "1.4.1");
    if (s141) return s141;
  }
  if (normInput.includes("ficha clinica") || normInput.includes("his") || normInput.includes("anamnesis")) {
    const s114 = activeCatalog.find((s) => s.code === "1.1.4");
    if (s114) return s114;
  }
  if (normInput.includes("agenda") || normInput.includes("ambulatorio") || normInput.includes("cita")) {
    const s111 = activeCatalog.find((s) => s.code === "1.1.1");
    if (s111) return s111;
  }
  if (normInput.includes("urgencia") || normInput.includes("triage") || normInput.includes("categorizacion")) {
    const s112 = activeCatalog.find((s) => s.code === "1.1.2");
    if (s112) return s112;
  }

  return null;
}

/**
 * Standardizes an arbitrary Apoyo Tecnológico text to the official canonical SIH naming convention:
 * Format: "SIH - [Código] [Nombre]" or "SIH - [Código] [Nombre] | Funcionalidades: [f1; f2]"
 * If "no tiene", returns "No tiene".
 */
export function standardizeSihSupportTech(rawText: string, catalog?: SIHSystem[]): string {
  if (!rawText) return "No tiene";
  let trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "no tiene" || lower === "no aplica" || lower === "ninguno" || lower === "manual") {
    return "No tiene";
  }

  // Strip invalid/unregistered phrases like "Módulo Traslado de Pacientes" -> replace with canonical catalog name
  trimmed = trimmed
    .replace(/módulo\s+traslado\s+de\s+pacientes/gi, "1.4.4 Traslados de pacientes")
    .replace(/SIH\s*-\s*Módulo\s+de\s+/gi, "SIH - ")
    .replace(/SIH\s*-\s*Módulo\s+/gi, "SIH - ")
    .replace(/Módulo\s+de\s+/gi, "")
    .replace(/Módulo\s+/gi, "");

  const activeCatalog = catalog && catalog.length > 0 ? catalog : getActiveSihCatalog();
  const matchedSys = findSihSystemByText(trimmed, activeCatalog);

  if (matchedSys) {
    return `SIH - ${matchedSys.code} ${matchedSys.name}`;
  }

  if (trimmed.startsWith("SIH - ")) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Matches SIH features against an activity's name and description.
 * Returns only the features that correspond to the activity ("marcar en función del nombre de la ficha").
 */
export function matchFeaturesForActivity(
  activityName: string,
  activityDesc?: string,
  features?: string[]
): {
  matchedFeatures: string[];
  hasMatch: boolean;
  isBrecha: boolean;
} {
  if (!features || features.length === 0) {
    return { matchedFeatures: [], hasMatch: false, isBrecha: true };
  }

  if (!activityName || !activityName.trim()) {
    return { matchedFeatures: [...features], hasMatch: true, isBrecha: false };
  }

  const actNorm = normalizeText(`${activityName} ${activityDesc || ""}`);
  
  const stopWords = new Set([
    "para", "esta", "este", "como", "con", "del", "las", "los", "una", "uno",
    "por", "sobre", "entre", "hacia", "hasta", "mediante", "traves", "segun",
    "actividad", "proceso", "paso", "ficha", "modulo"
  ]);

  const actWords = actNorm
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const matchedFeatures: string[] = [];

  features.forEach((feat) => {
    const featNorm = normalizeText(feat);
    // Check if significant action or entity words match or overlap
    const wordOverlap = actWords.filter((w) => {
      if (featNorm.includes(w)) return true;
      // Stemming checks for Spanish action verbs (e.g. registrar -> registr, solicitud -> solicit)
      if (w.length >= 5) {
        const stem = w.slice(0, -2);
        if (featNorm.includes(stem)) return true;
      }
      return false;
    });

    if (wordOverlap.length > 0) {
      matchedFeatures.push(feat);
    }
  });

  const hasMatch = matchedFeatures.length > 0;
  const isBrecha = !hasMatch;

  return { matchedFeatures, hasMatch, isBrecha };
}

/**
 * Performs a smart match on a SIHSystem object against a search query.
 * Handles partial terms, accents, singular/plural variations, and matches across
 * code, name, area, objective, features, vendor, and legal fields.
 */
export function systemMatchesQuery(sys: SIHSystem, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qClean = normalizeText(query);
  const qWords = qClean.split(/\s+/).filter(Boolean);

  const sysText = normalizeText(
    `${sys.code} ${sys.name} ${sys.area} ${sys.objective} ${(sys.features || []).join(" ")} ${sys.providerVendor || ""} ${sys.legalConsiderations || ""}`
  );

  return qWords.every((word) => {
    if (sysText.includes(word)) return true;
    if (word.endsWith("s") && sysText.includes(word.slice(0, -1))) return true;
    if (word.endsWith("es") && sysText.includes(word.slice(0, -2))) return true;
    return false;
  });
}
