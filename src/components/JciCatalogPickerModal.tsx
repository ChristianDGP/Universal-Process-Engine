import React, { useState, useMemo, useEffect } from "react";
import { JCIStandard } from "../types";
import { OFFICIAL_JCI_CATEGORIES, INITIAL_JCI_CATALOG } from "../data/jciCatalogPreset";
import { jciMatchesQuery, autoDetectJCIForFicha, autoDetectJCISupportType } from "../lib/jciUtils";
import {
  Award, Search, X, Check, Filter, Layers, CheckCircle2,
  AlertCircle, ChevronRight, ChevronDown, ChevronUp, ArrowRight, Sparkles, RefreshCw, FileText, Cpu, Plus, Trash2
} from "lucide-react";

export interface SelectedJciStandardConfig {
  code: string;
  selectedElements: string[];
}

interface JciCatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  currentSupportType?: string;
  activityName?: string;
  activityDescription?: string;
  supportTech?: string;
  onApply: (
    resultText: string,
    supportType: "DOCUMENTO" | "PROCESO" | "SISTEMA" | undefined,
    selectedStandards?: JCIStandard[]
  ) => void;
}

const STORAGE_KEY = "jci_catalog_state_v1";

export default function JciCatalogPickerModal({
  isOpen,
  onClose,
  currentValue,
  currentSupportType,
  activityName,
  activityDescription,
  supportTech,
  onApply
}: JciCatalogPickerModalProps) {
  // Load JCI catalog
  const catalog = useMemo<JCIStandard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading JCI catalog from storage:", e);
    }
    return INITIAL_JCI_CATALOG;
  }, [isOpen]);

  // Filters
  const [selectedChapter, setSelectedChapter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Multiple selection state
  const [selectedConfigs, setSelectedConfigs] = useState<SelectedJciStandardConfig[]>([]);
  const [expandedStandards, setExpandedStandards] = useState<Record<string, boolean>>({});

  // Support type state
  const [supportType, setSupportType] = useState<"DOCUMENTO" | "PROCESO" | "SISTEMA">("PROCESO");
  
  // Format options
  const [includeStandardName, setIncludeStandardName] = useState<boolean>(true);
  const [includeElements, setIncludeElements] = useState<boolean>(true);
  const [customResultText, setCustomResultText] = useState<string>(currentValue || "");
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Helper: Generate structured result text from selected standards
  const buildResultText = (
    configs: SelectedJciStandardConfig[],
    incName: boolean,
    incElems: boolean
  ): string => {
    if (configs.length === 0) {
      return "No aplica";
    }

    const segments = configs.map((cfg) => {
      const std = catalog.find((s) => s.code === cfg.code);
      if (!std) return cfg.code;

      let part = incName ? `${std.code} - ${std.name}` : std.code;

      if (incElems && cfg.selectedElements.length > 0) {
        const elemsStr = cfg.selectedElements.join("; ");
        part = `${part} | Elementos Medibles: ${elemsStr}`;
      }

      return part;
    });

    return segments.join(" ; ");
  };

  // On open, parse and initialize multiple standards from currentValue
  useEffect(() => {
    if (isOpen) {
      setIsManualEdit(false);
      setCustomResultText(currentValue || "");

      // Determine initial support type
      if (currentSupportType === "DOCUMENTO" || currentSupportType === "DOCUMENTAL") {
        setSupportType("DOCUMENTO");
      } else if (currentSupportType === "SISTEMA" || currentSupportType === "SISTEMICO") {
        setSupportType("SISTEMA");
      } else if (currentSupportType === "PROCESO" || currentSupportType === "PROCESAL") {
        setSupportType("PROCESO");
      } else {
        const detectedSupport = autoDetectJCISupportType(activityName || "", activityDescription || "", supportTech || "");
        if (detectedSupport === "DOCUMENTO" || detectedSupport === "SISTEMA" || detectedSupport === "PROCESO") {
          setSupportType(detectedSupport);
        } else {
          setSupportType("PROCESO");
        }
      }

      // Parse existing value for multiple standards
      if (!currentValue || currentValue.toLowerCase().trim() === "no aplica" || currentValue.toLowerCase().trim() === "no tiene") {
        setSelectedConfigs([]);
      } else {
        const valLower = currentValue.toLowerCase();
        const matchedConfigs: SelectedJciStandardConfig[] = [];

        catalog.forEach((std) => {
          const codeLower = std.code.toLowerCase();
          if (valLower.includes(`[${codeLower}]`) || valLower.includes(codeLower) || valLower.includes(std.name.toLowerCase())) {
            // Find which elements are in text if any, or default to all
            const matchedElems: string[] = [];
            if (std.measurableElements && std.measurableElements.length > 0) {
              std.measurableElements.forEach((elem) => {
                // If the element snippet is in the text or no specific element filter was recorded
                if (valLower.includes(elem.toLowerCase().slice(0, 20))) {
                  matchedElems.push(elem);
                }
              });
              if (matchedElems.length === 0) {
                // Default to all elements for this standard
                matchedElems.push(...std.measurableElements);
              }
            }

            matchedConfigs.push({
              code: std.code,
              selectedElements: matchedElems
            });
          }
        });

        setSelectedConfigs(matchedConfigs);
        setIncludeElements(valLower.includes("elementos medibles") || valLower.includes("requisitos"));
      }
    }
  }, [isOpen, currentValue, currentSupportType, activityName, activityDescription, supportTech, catalog]);

  // Sync customResultText whenever selection or options change (unless manually typed by user)
  useEffect(() => {
    if (!isManualEdit) {
      const generated = buildResultText(selectedConfigs, includeStandardName, includeElements);
      setCustomResultText(generated);
    }
  }, [selectedConfigs, includeStandardName, includeElements, isManualEdit]);

  // Filtered standards list
  const filteredStandards = useMemo(() => {
    return catalog.filter((std) => {
      const matchQuery = jciMatchesQuery(std, searchTerm);
      const matchChapter =
        selectedChapter === "ALL" ||
        std.code.startsWith(selectedChapter) ||
        std.chapter.toLowerCase().includes(selectedChapter.toLowerCase());
      return matchQuery && matchChapter;
    });
  }, [catalog, searchTerm, selectedChapter]);

  // Count standards per chapter
  const countPerChapter = useMemo(() => {
    const counts: Record<string, number> = {};
    catalog.forEach((std) => {
      const cat = OFFICIAL_JCI_CATEGORIES.find((c) => std.code.startsWith(c.code));
      const codeKey = cat ? cat.code : std.chapter.split(" ")[0];
      counts[codeKey] = (counts[codeKey] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  if (!isOpen) return null;

  // Toggle selection of standard
  const handleToggleStandard = (std: JCIStandard) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const exists = prev.some((c) => c.code === std.code);
      if (exists) {
        return prev.filter((c) => c.code !== std.code);
      } else {
        return [
          ...prev,
          {
            code: std.code,
            selectedElements: std.measurableElements ? [...std.measurableElements] : []
          }
        ];
      }
    });
  };

  // Toggle a single measurable element for a standard
  const handleToggleElement = (std: JCIStandard, element: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const existingCfg = prev.find((c) => c.code === std.code);
      if (!existingCfg) {
        // Standard was not selected yet, select it with this element
        return [
          ...prev,
          {
            code: std.code,
            selectedElements: [element]
          }
        ];
      }

      const hasElement = existingCfg.selectedElements.includes(element);
      const updatedElements = hasElement
        ? existingCfg.selectedElements.filter((e) => e !== element)
        : [...existingCfg.selectedElements, element];

      if (updatedElements.length === 0) {
        // If no elements remain, keep standard with 0 elements or remove it based on preference
        // Keep it so the user can just have the standard name
        return prev.map((c) => (c.code === std.code ? { ...c, selectedElements: [] } : c));
      }

      return prev.map((c) => (c.code === std.code ? { ...c, selectedElements: updatedElements } : c));
    });
  };

  // Select all elements for a standard
  const handleSelectAllElements = (std: JCIStandard) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const existing = prev.find((c) => c.code === std.code);
      const allElems = std.measurableElements ? [...std.measurableElements] : [];
      if (!existing) {
        return [...prev, { code: std.code, selectedElements: allElems }];
      }
      return prev.map((c) => (c.code === std.code ? { ...c, selectedElements: allElems } : c));
    });
  };

  // Clear all elements for a standard
  const handleClearElements = (stdCode: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) =>
      prev.map((c) => (c.code === stdCode ? { ...c, selectedElements: [] } : c))
    );
  };

  // Remove a standard from selection
  const handleRemoveStandard = (stdCode: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => prev.filter((c) => c.code !== stdCode));
  };

  // Mark No Aplica
  const handleSelectNoAplica = () => {
    setSelectedConfigs([]);
    setCustomResultText("No aplica");
    setIsManualEdit(false);
    onApply("No aplica", undefined, []);
    onClose();
  };

  // Auto-detect JCI
  const handleAutoDetect = () => {
    setIsManualEdit(false);
    const autoVal = autoDetectJCIForFicha(activityName || "", activityDescription || "", catalog);
    if (autoVal && autoVal !== "No aplica" && autoVal !== "No tiene") {
      const matched = catalog.filter(
        (std) => autoVal.includes(std.code) || autoVal.includes(std.name)
      );
      if (matched.length > 0) {
        setSelectedConfigs(
          matched.map((m) => ({
            code: m.code,
            selectedElements: m.measurableElements ? [...m.measurableElements] : []
          }))
        );
        const firstCat = OFFICIAL_JCI_CATEGORIES.find((c) => matched[0].code.startsWith(c.code));
        if (firstCat) setSelectedChapter(firstCat.code);
      }
      setCustomResultText(autoVal);
    } else {
      setSelectedConfigs([]);
      setCustomResultText("No aplica");
    }

    const detectedSupport = autoDetectJCISupportType(activityName || "", activityDescription || "", supportTech || "");
    if (detectedSupport === "DOCUMENTO" || detectedSupport === "SISTEMA" || detectedSupport === "PROCESO") {
      setSupportType(detectedSupport);
    }
  };

  // Apply to activity ficha
  const handleApply = () => {
    const selectedStandardsList = selectedConfigs
      .map((cfg) => catalog.find((s) => s.code === cfg.code))
      .filter((s): s is JCIStandard => Boolean(s));

    onApply(customResultText.trim(), supportType, selectedStandardsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-300 w-full max-w-7xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden rounded-xs">
        
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-4 bg-indigo-950 text-white flex justify-between items-center shrink-0 border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500 text-white rounded-xs shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Módulo de Selección Múltiple: Estándares JCI (Joint Commission International)
                </h3>
                <span className="bg-indigo-400/20 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  Selección de 1 o más Estándares
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Seleccione uno o varios estándares JCI y elija con precisión los elementos medibles requeridos para la actividad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-xs transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TOOLBAR: CHAPTER PILLS & SEARCH */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 p-2.5 sm:p-3 shrink-0 space-y-2">
          {/* CHAPTER TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedChapter("ALL")}
              className={`px-3 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedChapter === "ALL"
                  ? "bg-indigo-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-indigo-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos los Capítulos</span>
              <span className="text-[10px] font-mono opacity-80">({catalog.length})</span>
            </button>

            {OFFICIAL_JCI_CATEGORIES.map((cat) => {
              const isCatSelected = selectedChapter === cat.code;
              const count = countPerChapter[cat.code] || 0;
              return (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => setSelectedChapter(cat.code)}
                  className={`px-2.5 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                    isCatSelected
                      ? "bg-indigo-600 text-white shadow-xs border border-indigo-700"
                      : "bg-white text-slate-700 hover:bg-indigo-100/70 border border-indigo-200"
                  }`}
                  title={`${cat.code} - ${cat.name}`}
                >
                  <span className="font-mono font-black">{cat.code}</span>
                  <span className="max-w-[110px] truncate">{cat.name.split("(")[0]}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH AND QUICK ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código (ej. IPSG.1, AOP.5.11), palabra clave o requisito..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white border border-indigo-200 text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDetect}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs rounded-xs"
                title="Detectar automáticamente estándares JCI según nombre y descripción de la actividad"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Auto-detectar JCI</span>
              </button>

              <button
                type="button"
                onClick={handleSelectNoAplica}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs rounded-xs"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Marcar "No aplica"</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN BODY: CATALOG CARDS ON LEFT, MULTI-SELECTION AND RESULT PREVIEW ON RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT PANE: EXPANSIVE CATALOG OF JCI STANDARDS WITH CHECKBOXES & SELECTABLE ELEMENTS */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <span>Catálogo de Estándares ({filteredStandards.length}):</span>
                <span className="text-indigo-900 bg-indigo-100 px-2 py-0.2 rounded-xs text-[11px] font-mono">
                  {selectedConfigs.length} seleccionado(s)
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Marque la casilla de cada estándar para agregarlo al resultado múltiple
              </span>
            </div>

            {filteredStandards.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-indigo-400" />
                <p className="font-semibold text-slate-700">No se encontraron estándares con los filtros aplicados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedChapter("ALL");
                  }}
                  className="px-3 py-1 bg-indigo-900 text-white text-xs font-bold mt-2 rounded-xs"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredStandards.map((std) => {
                  const selectedConfig = selectedConfigs.find((c) => c.code === std.code);
                  const isSelected = Boolean(selectedConfig);
                  const selectedElemCount = selectedConfig ? selectedConfig.selectedElements.length : 0;
                  const totalElems = std.measurableElements ? std.measurableElements.length : 0;

                  return (
                    <div
                      key={std.id || std.code}
                      className={`p-3.5 border transition-all select-none rounded-xs ${
                        isSelected
                          ? "bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 shadow-2xs"
                      }`}
                    >
                      {/* CARD HEADER WITH MULTI-SELECT CHECKBOX */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStandard(std)}
                              className="w-4 h-4 text-indigo-600 rounded-none focus:ring-indigo-600 cursor-pointer"
                            />
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-indigo-950 text-white rounded-xs">
                              {std.code}
                            </span>
                          </label>
                          <h4
                            onClick={() => handleToggleStandard(std)}
                            className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-indigo-950"
                          >
                            {std.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-950 px-2 py-0.5 border border-indigo-300 rounded-xs">
                              {selectedElemCount}/{totalElems} Elem. Medibles
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleStandard(std)}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-indigo-900 text-white hover:bg-indigo-800"
                                : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Seleccionado</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Añadir</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* CHAPTER BADGE */}
                      <div className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                        <span className="text-slate-700 font-bold">Capítulo:</span>
                        <span className="bg-indigo-50 text-indigo-950 px-1.5 py-0.2 border border-indigo-200 font-medium">
                          {std.chapter}
                        </span>
                      </div>

                      {/* OBJECTIVE */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                        {std.objective}
                      </p>

                      {/* MEASURABLE ELEMENTS WITH INDIVIDUAL CHECKBOXES */}
                      {std.measurableElements && std.measurableElements.length > 0 && (
                        <div className="bg-indigo-50/70 p-2.5 border border-indigo-200 text-xs space-y-1.5 rounded-xs">
                          <div className="flex items-center justify-between text-indigo-950 text-[11px] font-bold">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              Elementos Medibles / Requisitos de Auditoría ({std.measurableElements.length}):
                            </span>

                            <div className="flex items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleSelectAllElements(std)}
                                className="text-indigo-800 hover:underline font-bold cursor-pointer"
                              >
                                Todos
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={() => handleClearElements(std.code)}
                                className="text-slate-600 hover:underline font-medium cursor-pointer"
                              >
                                Ninguno
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 pt-0.5">
                            {std.measurableElements.map((elem, idx) => {
                              const isElemChecked =
                                selectedConfig?.selectedElements.includes(elem) || false;
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-start gap-2 p-1.5 rounded-xs cursor-pointer text-[11px] transition-colors ${
                                    isElemChecked
                                      ? "bg-indigo-100/90 text-indigo-950 font-medium border border-indigo-300"
                                      : "hover:bg-indigo-100/40 text-slate-700 border border-transparent"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isElemChecked}
                                    onChange={() => handleToggleElement(std, elem)}
                                    className="w-3.5 h-3.5 mt-0.5 text-indigo-600 rounded-none focus:ring-indigo-600 cursor-pointer"
                                  />
                                  <span className="leading-snug flex-1">{elem}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANE: ITEM-BY-ITEM MULTI-SELECTION LIST & OUTPUT PREVIEW PANEL */}
          <div className="w-full md:w-[420px] bg-white border-t md:border-t-0 md:border-l border-slate-300 flex flex-col p-3.5 sm:p-4 shrink-0 shadow-lg justify-between space-y-3 overflow-hidden">
            <div className="space-y-3 overflow-y-auto pr-1">
              
              {/* PANEL HEADER */}
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Valor Resultado (Atributo JCI)
                  </h4>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-indigo-950 text-white rounded-xs">
                    {selectedConfigs.length} Estándar(es)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visualización y gestión detallada de los estándares seleccionados
                </p>
              </div>

              {/* LIST OF SELECTED STANDARDS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Estándares Seleccionados ({selectedConfigs.length}):</span>
                  {selectedConfigs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConfigs([]);
                        setIsManualEdit(false);
                      }}
                      className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpiar Todo
                    </button>
                  )}
                </div>

                {selectedConfigs.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xs text-center text-xs text-slate-500 space-y-1">
                    <Award className="w-6 h-6 mx-auto text-indigo-400" />
                    <p className="font-bold text-slate-700">Ningún estándar seleccionado</p>
                    <p className="text-[11px] text-slate-500">
                      Marque 1 o más estándares del catálogo a la izquierda, o presione <strong>Auto-detectar JCI</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedConfigs.map((cfg) => {
                      const std = catalog.find((s) => s.code === cfg.code);
                      const isExpanded = expandedStandards[cfg.code] || false;
                      const elemCount = cfg.selectedElements.length;
                      const totalElems = std?.measurableElements?.length || 0;

                      return (
                        <div
                          key={cfg.code}
                          className="p-2.5 bg-indigo-50/90 border border-indigo-300 rounded-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="font-mono font-black text-[11px] bg-indigo-950 text-white px-1.5 py-0.5 rounded-xs shrink-0">
                                {cfg.code}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {std?.name || cfg.code}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStandard(cfg.code)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Quitar este estándar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* SUB-BAR WITH ELEMENT BADGE & TOGGLE */}
                          <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-indigo-200/70">
                            <span className="text-indigo-950 font-bold">
                              {elemCount > 0 ? `${elemCount}/${totalElems} elementos medibles` : "Sin elementos detallados"}
                            </span>

                            {totalElems > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStandards((prev) => ({
                                    ...prev,
                                    [cfg.code]: !prev[cfg.code]
                                  }))
                                }
                                className="text-indigo-800 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Ocultar elementos</span>
                                    <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Ver elementos</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* EXPANDED ELEMENTS FOR THIS STANDARD */}
                          {isExpanded && std?.measurableElements && (
                            <div className="bg-white p-2 border border-indigo-200 space-y-1 rounded-xs text-[10px] mt-1">
                              {std.measurableElements.map((elem, eIdx) => {
                                const checked = cfg.selectedElements.includes(elem);
                                return (
                                  <label
                                    key={eIdx}
                                    className="flex items-start gap-1.5 cursor-pointer hover:bg-slate-50 p-0.5 rounded-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleElement(std, elem)}
                                      className="w-3 h-3 mt-0.5 text-indigo-600 rounded-none focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <span className={checked ? "text-indigo-950 font-medium leading-tight" : "text-slate-500 leading-tight"}>
                                      {elem}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TIPO DE SOPORTE SELECTOR (DOCUMENTO / PROCESO / SISTEMA) */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">
                  Tipo de Soporte de Cumplimiento JCI:
                </span>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSupportType("DOCUMENTO")}
                    className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                      supportType === "DOCUMENTO"
                        ? "bg-blue-600 text-white border-blue-700 font-bold shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs flex items-center gap-1 font-bold">📄 Documento</div>
                    <div className="text-[9px] opacity-80 mt-0.5 truncate">Norma / Protocolo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSupportType("PROCESO")}
                    className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                      supportType === "PROCESO"
                        ? "bg-teal-700 text-white border-teal-800 font-bold shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs flex items-center gap-1 font-bold">🔄 Proceso</div>
                    <div className="text-[9px] opacity-80 mt-0.5 truncate">Flujo Operativo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSupportType("SISTEMA")}
                    className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                      supportType === "SISTEMA"
                        ? "bg-amber-600 text-white border-amber-700 font-bold shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs flex items-center gap-1 font-bold">💻 Sistema</div>
                    <div className="text-[9px] opacity-80 mt-0.5 truncate">Sistema SIH</div>
                  </button>
                </div>
              </div>

              {/* FORMAT OPTIONS CHECKBOXES */}
              {selectedConfigs.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">
                    Formato del Texto Resultado:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-1.5 border border-slate-200 rounded-xs hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={includeStandardName}
                        onChange={(e) => {
                          setIncludeStandardName(e.target.checked);
                          setIsManualEdit(false);
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                      <span className="text-[11px]">Código y Nombre</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-1.5 border border-slate-200 rounded-xs hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={includeElements}
                        onChange={(e) => {
                          setIncludeElements(e.target.checked);
                          setIsManualEdit(false);
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      />
                      <span className="text-[11px]">Elementos Medibles</span>
                    </label>
                  </div>
                </div>
              )}

              {/* RESULT TEXT PREVIEW */}
              <div className="pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Texto Resultado Consolidado:
                  </label>
                  {isManualEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualEdit(false);
                        setCustomResultText(buildResultText(selectedConfigs, includeStandardName, includeElements));
                      }}
                      className="text-[10px] text-indigo-700 hover:underline font-bold cursor-pointer"
                    >
                      Regenerar desde selección
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={customResultText}
                  onChange={(e) => {
                    setCustomResultText(e.target.value);
                    setIsManualEdit(true);
                  }}
                  placeholder="Seleccione uno o más estándares para componer el valor del atributo JCI..."
                  className="w-full p-2.5 text-xs font-semibold bg-white border border-indigo-200 text-slate-950 focus:outline-none focus:border-indigo-600 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Este texto será asignado al atributo <strong>Atributo JCI</strong> de la ficha.
                </p>
              </div>
            </div>

            {/* MODAL BOTTOM ACTIONS */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!customResultText.trim()}
                className="px-5 py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-black rounded-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a la Ficha ({selectedConfigs.length})</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
