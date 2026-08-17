import { SIHSystem } from "../types";

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
