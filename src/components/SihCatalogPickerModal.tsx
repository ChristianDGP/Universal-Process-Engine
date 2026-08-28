import React, { useState, useMemo, useEffect } from "react";
import { SIHSystem } from "../types";
import { OFFICIAL_SIH_CATEGORIES, INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";
import {
  systemMatchesQuery,
  getActiveSihCatalog,
  saveActiveSihCatalog,
  findSihSystemByText,
  standardizeSihSupportTech
} from "../lib/sihUtils";
import { HighlightText } from "./HighlightText";
import {
  Server,
  Search,
  X,
  Check,
  Layers,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Table,
  LayoutGrid,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Info
} from "lucide-react";

export interface SelectedSihSystemConfig {
  code: string;
  selectedFeatures: string[];
}

interface SihCatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onApply: (resultText: string, selectedSystems?: SIHSystem[]) => void;
  catalog?: SIHSystem[];
  initialDetailSystemCode?: string;
}

// Helper to extract a clean search keyword from currentValue
function extractCleanSearchKeyword(raw: string, catalog: SIHSystem[]): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "no tiene" || lower === "no aplica" || lower === "ninguno" || lower === "manual") {
    return "";
  }

  // Check if it directly matches a system code or name
  for (const sys of catalog) {
    if (lower.includes(sys.code.toLowerCase())) {
      return sys.code;
    }
    if (lower.includes(sys.name.toLowerCase())) {
      return sys.name;
    }
  }

  // Strip prefixes like "SIH -", "SIH", "Módulo de", "Módulo", "Sistema de", "Sistema"
  let cleaned = trimmed
    .replace(/^(\s*SIH\s*-\s*|\s*SIH\s+|\s*Módulo\s+de\s+|\s*Módulo\s+|\s*Sistema\s+de\s+|\s*Sistema\s+)/i, "")
    .replace(/\|.*$/i, "") // remove '| Funcionalidades: ...'
    .replace(/\[.*?\]/g, "") // remove brackets
    .trim();

  // If there's a trailing semicolon or punctuation, clean it
  cleaned = cleaned.replace(/[;,\.]+$/, "").trim();

  return cleaned;
}

export default function SihCatalogPickerModal({
  isOpen,
  onClose,
  currentValue,
  onApply,
  catalog: propCatalog,
  initialDetailSystemCode
}: SihCatalogPickerModalProps) {
  // Load authoritative SIH catalog from getActiveSihCatalog (merges preset with 14 features for 1.4.4)
  const catalog = useMemo<SIHSystem[]>(() => {
    if (propCatalog && propCatalog.length > 0) return propCatalog;
    return getActiveSihCatalog();
  }, [isOpen, propCatalog]);

  // Filters & Search
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS">("CARDS");

  // Multiple selection state
  const [selectedConfigs, setSelectedConfigs] = useState<SelectedSihSystemConfig[]>([]);
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);

  // Detail Modal for a single system (Ficha Técnica Formal Emergente)
  const [detailModalSystem, setDetailModalSystem] = useState<SIHSystem | null>(null);

  // Format options for result string
  const [includeSystemName, setIncludeSystemName] = useState<boolean>(true);
  const [includeFeatures, setIncludeFeatures] = useState<boolean>(true);
  const [includeStatus, setIncludeStatus] = useState<boolean>(false);
  const [customResultText, setCustomResultText] = useState<string>(currentValue || "");
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Helper: Build consolidated result string
  const buildResultText = (
    configs: SelectedSihSystemConfig[],
    incName: boolean,
    incFeats: boolean,
    incStat: boolean
  ): string => {
    if (configs.length === 0) {
      return "No tiene";
    }

    const segments = configs.map((cfg) => {
      const sys = catalog.find((s) => s.code === cfg.code);
      if (!sys) return cfg.code;

      let part = incName ? `SIH - ${sys.name}` : `SIH - ${sys.code}`;

      if (incStat && sys.supportStatus) {
        part += ` [${sys.supportStatus}]`;
      }

      if (incFeats && cfg.selectedFeatures.length > 0) {
        const featStr = cfg.selectedFeatures.join("; ");
        part = `${part} | Funcionalidades: ${featStr}`;
      }

      return part;
    });

    return segments.join(" ; ");
  };

  // On open, parse and initialize multiple systems and pre-filter matching systems
  useEffect(() => {
    if (isOpen) {
      setIsManualEdit(false);
      setCustomResultText(currentValue || "");

      // Pre-filter with clean search keyword so only matching systems appear initially
      const initialQuery = extractCleanSearchKeyword(currentValue || "", catalog);
      setSearchTerm(initialQuery);
      setSelectedArea("ALL");
      setSelectedStatus("ALL");

      if (
        !currentValue ||
        currentValue.toLowerCase().trim() === "no tiene" ||
        currentValue.toLowerCase().trim() === "no aplica" ||
        currentValue.toLowerCase().trim() === "ninguno"
      ) {
        setSelectedConfigs([]);
      } else {
        const valLower = currentValue.toLowerCase();
        const matchedConfigs: SelectedSihSystemConfig[] = [];

        catalog.forEach((sys) => {
          const codeLower = sys.code.toLowerCase();
          const nameLower = sys.name.toLowerCase();
          if (
            valLower.includes(`[${codeLower}]`) ||
            valLower.includes(codeLower) ||
            valLower.includes(nameLower)
          ) {
            // Find which features are in text if any, or default to all
            const matchedFeats: string[] = [];
            if (sys.features && sys.features.length > 0) {
              sys.features.forEach((feat) => {
                if (valLower.includes(feat.toLowerCase().slice(0, 15))) {
                  matchedFeats.push(feat);
                }
              });
              if (matchedFeats.length === 0) {
                // Default to all features
                matchedFeats.push(...sys.features);
              }
            }

            matchedConfigs.push({
              code: sys.code,
              selectedFeatures: matchedFeats
            });
          }
        });

        setSelectedConfigs(matchedConfigs);
        setIncludeFeatures(
          valLower.includes("funcionalidades") ||
          valLower.includes("módulo") ||
          valLower.includes("traslado")
        );
      }
    }
  }, [isOpen, currentValue, catalog]);

  // Sync customResultText whenever selection or options change (unless manually typed)
  useEffect(() => {
    if (!isManualEdit) {
      const generated = buildResultText(
        selectedConfigs,
        includeSystemName,
        includeFeatures,
        includeStatus
      );
      setCustomResultText(generated);
    }
  }, [selectedConfigs, includeSystemName, includeFeatures, includeStatus, isManualEdit]);

  // Filtered systems list (Matches query, area, status)
  const filteredSystems = useMemo(() => {
    return catalog.filter((sys) => {
      const matchQuery = systemMatchesQuery(sys, searchTerm);
      const matchArea = selectedArea === "ALL" || sys.area === selectedArea;
      const matchStatus =
        selectedStatus === "ALL" || (sys.supportStatus || "SOPORTADO") === selectedStatus;
      return matchQuery && matchArea && matchStatus;
    });
  }, [catalog, searchTerm, selectedArea, selectedStatus]);

  // Count systems per area
  const countPerArea = useMemo(() => {
    const counts: Record<string, number> = {};
    catalog.forEach((sys) => {
      counts[sys.area] = (counts[sys.area] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  if (!isOpen) return null;

  // Toggle selection of system
  const handleToggleSystem = (sys: SIHSystem) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const exists = prev.some((c) => c.code === sys.code);
      if (exists) {
        return prev.filter((c) => c.code !== sys.code);
      } else {
        return [
          ...prev,
          {
            code: sys.code,
            selectedFeatures: sys.features ? [...sys.features] : []
          }
        ];
      }
    });
  };

  // Toggle a single feature for a system (manual check)
  const handleToggleFeature = (sys: SIHSystem, feature: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const existingCfg = prev.find((c) => c.code === sys.code);
      if (!existingCfg) {
        return [
          ...prev,
          {
            code: sys.code,
            selectedFeatures: [feature]
          }
        ];
      }

      const hasFeat = existingCfg.selectedFeatures.includes(feature);
      const updatedFeats = hasFeat
        ? existingCfg.selectedFeatures.filter((f) => f !== feature)
        : [...existingCfg.selectedFeatures, feature];

      return prev.map((c) =>
        c.code === sys.code ? { ...c, selectedFeatures: updatedFeats } : c
      );
    });
  };

  // Select all features for a system
  const handleSelectAllFeatures = (sys: SIHSystem) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => {
      const existing = prev.find((c) => c.code === sys.code);
      const allFeats = sys.features ? [...sys.features] : [];
      if (!existing) {
        return [...prev, { code: sys.code, selectedFeatures: allFeats }];
      }
      return prev.map((c) =>
        c.code === sys.code ? { ...c, selectedFeatures: allFeats } : c
      );
    });
  };

  // Clear all features for a system
  const handleClearFeatures = (sysCode: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) =>
      prev.map((c) => (c.code === sysCode ? { ...c, selectedFeatures: [] } : c))
    );
  };

  // Remove a system from selection
  const handleRemoveSystem = (sysCode: string) => {
    setIsManualEdit(false);
    setSelectedConfigs((prev) => prev.filter((c) => c.code !== sysCode));
  };

  // Mark No tiene
  const handleSelectNoTiene = () => {
    setSelectedConfigs([]);
    setCustomResultText("No tiene");
    setIsManualEdit(false);
    onApply("No tiene", []);
    onClose();
  };

  // Apply selection
  const handleApply = () => {
    const selectedSystemsList = selectedConfigs
      .map((cfg) => catalog.find((s) => s.code === cfg.code))
      .filter((s): s is SIHSystem => Boolean(s));

    onApply(customResultText.trim(), selectedSystemsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-300 w-full max-w-7xl h-[94vh] max-h-[920px] flex flex-col shadow-2xl overflow-hidden rounded-xs">
        
        {/* MODAL HEADER */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xs shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Módulo de Selección Múltiple: Catálogo de Sistemas Informáticos Hospitalarios (SIH)
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                  SELECCIÓN DE 1 O MÁS SISTEMAS SIH
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Navegue por el ecosistema de software y seleccione los sistemas y sus funcionalidades específicas asociadas a la actividad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TOOLBAR: AREA PILLS & SEARCH */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-2.5 sm:p-3 shrink-0 space-y-2">
          {/* AREA CATEGORY TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedArea("ALL")}
              className={`px-3 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedArea === "ALL"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas las Áreas</span>
              <span className="text-[10px] font-mono opacity-80">({catalog.length})</span>
            </button>

            {OFFICIAL_SIH_CATEGORIES.map((cat) => {
              const isAreaSelected = selectedArea === cat.name;
              const count = countPerArea[cat.name] || 0;
              return (
                <button
                  key={cat.code || cat.name}
                  type="button"
                  onClick={() => setSelectedArea(cat.name)}
                  className={`px-2.5 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                    isAreaSelected
                      ? "bg-slate-900 text-amber-400 shadow-xs border border-slate-950"
                      : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH, STATUS FILTER & VIEW TOGGLES */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código (ej. 1.4.4), nombre (ej. traslados), o funcionalidad (ej. camillas, rutas)..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* SUPPORT STATUS FILTER */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-amber-600 shadow-2xs rounded-xs"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="SOPORTADO">🟢 Soportado / Operativo</option>
                <option value="EN_IMPLEMENTACION">🟡 En Implementación</option>
                <option value="BRECHA">🔴 Brecha / Pendiente</option>
              </select>

              {/* FORMAT / VIEW MODE TOGGLE */}
              <div className="flex items-center border border-slate-300 rounded-xs bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("CARDS")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-xs flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === "CARDS"
                      ? "bg-slate-900 text-amber-400 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Vista de Tarjetas Interactivas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("TABLE")}
                  className={`px-2 py-1 text-[11px] font-bold rounded-xs flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === "TABLE"
                      ? "bg-slate-900 text-amber-400 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Vista de Ficha Técnica Formal (Tabla Oficial)"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ficha Formal</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllExpanded(!allExpanded)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>Colapsar</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>Expandir todas</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSelectNoTiene}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs rounded-xs"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Marcar "No tiene" (Actividad Manual)</span>
              </button>
            </div>
          </div>

          {/* ACTIVE FILTER / MATCH NOTICE */}
          {searchTerm && (
            <div className="flex items-center justify-between bg-amber-100/80 border border-amber-300 px-3 py-1 text-[11px] rounded-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-semibold">
                <Search className="w-3.5 h-3.5 text-amber-700" />
                <span>Mostrando solo coincidencias para el texto:</span>
                <span className="font-mono font-black bg-white px-2 py-0.2 border border-amber-300 text-amber-900 rounded-xs">
                  «{searchTerm}»
                </span>
                <span className="text-slate-600 font-normal">
                  ({filteredSystems.length} sistema(s) coincidente(s))
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-amber-900 hover:text-amber-950 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                Mostrar todo el catálogo
              </button>
            </div>
          )}
        </div>

        {/* MAIN BODY: CATALOG CARDS/TABLE ON LEFT, MULTI-SELECTION AND RESULT PREVIEW ON RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT PANE: EXPANSIVE CATALOG OF SIH SYSTEMS WITH CHECKBOXES & SELECTABLE FEATURES */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
              <span className="flex items-center gap-1.5">
                <span>Catálogo SIH ({filteredSystems.length}):</span>
                <span className="text-amber-950 bg-amber-100 px-2 py-0.2 rounded-xs text-[11px] font-mono border border-amber-300">
                  {selectedConfigs.length} seleccionado(s)
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Marque la casilla de cada sistema y elija las funcionalidades requeridas
              </span>
            </div>

            {filteredSystems.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-amber-500" />
                <p className="font-semibold text-slate-700">No se encontraron sistemas con los filtros aplicados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedArea("ALL");
                    setSelectedStatus("ALL");
                  }}
                  className="px-3 py-1 bg-slate-900 text-white text-xs font-bold mt-2 rounded-xs cursor-pointer"
                >
                  Restablecer Filtros y Ver Todo
                </button>
              </div>
            ) : viewMode === "TABLE" ? (
              /* ========================================================================= */
              /* FORMATO 1: FICHA TÉCNICA FORMAL (TABLA OFICIAL CON CHECKBOXES)           */
              /* ========================================================================= */
              <div className="space-y-4">
                {filteredSystems.map((sys) => {
                  const selectedConfig = selectedConfigs.find((c) => c.code === sys.code);
                  const isSelected = Boolean(selectedConfig);
                  const selectedFeatCount = selectedConfig ? selectedConfig.selectedFeatures.length : 0;
                  const totalFeats = sys.features ? sys.features.length : 0;
                  const isExpanded = allExpanded || expandedSystems[sys.code] || false;

                  return (
                    <div
                      key={sys.id || sys.code}
                      className={`border transition-all rounded-xs overflow-hidden shadow-xs ${
                        isSelected
                          ? "border-amber-500 ring-2 ring-amber-400 bg-white"
                          : "border-slate-300 bg-white hover:border-amber-300"
                      }`}
                    >
                      {/* TABLA DE FICHA TÉCNICA OFICIAL */}
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          {/* CABECERA: CÓDIGO Y NOMBRE DEL SISTEMA */}
                          <tr className="bg-slate-900 text-white border-b border-slate-800">
                            <th colSpan={2} className="p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSystem(sys)}
                                      className="w-4 h-4 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer"
                                    />
                                    <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-xs">
                                      <HighlightText text={sys.code} query={searchTerm} />
                                    </span>
                                  </label>
                                  <span className="font-black text-sm tracking-wide text-white">
                                    <HighlightText text={sys.name} query={searchTerm} />
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {sys.supportStatus === "SOPORTADO" && (
                                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/50 rounded-xs">
                                      🟢 Soportado
                                    </span>
                                  )}
                                  {sys.supportStatus === "EN_IMPLEMENTACION" && (
                                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 border border-amber-500/50 rounded-xs">
                                      🟡 En Implementación
                                    </span>
                                  )}
                                  {sys.supportStatus === "BRECHA" && (
                                    <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 border border-rose-500/50 rounded-xs">
                                      🔴 Brecha
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setDetailModalSystem(sys)}
                                    className="px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-2xs"
                                    title="Ver Ficha Técnica Oficial Completa con todas las características"
                                  >
                                    <Maximize2 className="w-3 h-3 text-slate-950" />
                                    <span>Ficha Oficial ({sys.features?.length || 0})</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleSystem(sys)}
                                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                                        : "bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-600"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Seleccionado ({selectedFeatCount})</span>
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
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {/* FILA METADATOS: ÁREA Y PROVEEDOR */}
                          <tr className="bg-slate-50/80">
                            <td className="w-1/2 p-2.5 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-0.5">
                                Área:
                              </span>
                              <span className="text-slate-800 font-medium">
                                <HighlightText text={sys.area} query={searchTerm} />
                              </span>
                            </td>
                            <td className="w-1/2 p-2.5">
                              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-0.5">
                                Sistema de Información:
                              </span>
                              <span className="text-slate-800 font-medium">
                                <HighlightText
                                  text={sys.providerVendor || `Sistema ${sys.name}`}
                                  query={searchTerm}
                                />
                              </span>
                            </td>
                          </tr>

                          {/* FILA OBJETIVO */}
                          <tr>
                            <td colSpan={2} className="p-3 bg-white">
                              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-1">
                                Objetivo:
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                <HighlightText text={sys.objective} query={searchTerm} />
                              </p>
                            </td>
                          </tr>

                          {/* FILA FUNCIONALIDADES MÁS RELEVANTES CON CHECKBOXES INTERACTIVOS */}
                          {sys.features && sys.features.length > 0 && (
                            <tr className="bg-amber-50/40">
                              <td colSpan={2} className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                                    <Cpu className="w-4 h-4 text-amber-600" />
                                    <span>
                                      Funcionalidades más relevantes ({sys.features.length}):
                                    </span>
                                    {isSelected && (
                                      <span className="ml-2 text-[10px] font-mono bg-amber-200/80 text-amber-950 px-2 py-0.2 border border-amber-300 rounded-xs">
                                        {selectedFeatCount} marcadas
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllFeatures(sys)}
                                      className="text-amber-900 hover:text-amber-950 font-bold hover:underline cursor-pointer"
                                    >
                                      Marcar Todas
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleClearFeatures(sys.code)}
                                      className="text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
                                    >
                                      Ninguna
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  {sys.features.map((feat, fIdx) => {
                                    const isFeatChecked =
                                      selectedConfig?.selectedFeatures.includes(feat) || false;
                                    return (
                                      <label
                                        key={fIdx}
                                        className={`flex items-start gap-2.5 p-2 rounded-xs cursor-pointer text-xs border transition-colors ${
                                          isFeatChecked
                                            ? "bg-amber-100/90 text-amber-950 font-medium border-amber-300 shadow-2xs"
                                            : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50 hover:border-amber-200"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isFeatChecked}
                                          onChange={() => handleToggleFeature(sys, feat)}
                                          className="w-4 h-4 mt-0.5 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer shrink-0"
                                        />
                                        <div className="leading-snug flex-1 flex items-start gap-2">
                                          <span className="font-mono font-bold text-[11px] text-amber-900/80 shrink-0">
                                            {fIdx + 1}.
                                          </span>
                                          <span>
                                            <HighlightText text={feat} query={searchTerm} />
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* FILA INTEROPERABILIDAD / INTEGRACIONES */}
                          {sys.integrations && sys.integrations.length > 0 && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={2} className="p-3">
                                <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider mb-1">
                                  Interoperabilidad / Integraciones:
                                </span>
                                <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-700">
                                  {sys.integrations.map((integ, iIdx) => (
                                    <li key={iIdx}>
                                      <HighlightText text={integ} query={searchTerm} />
                                    </li>
                                  ))}
                                </ol>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================================= */
              /* FORMATO 2: VISTA TARJETAS (COMO EN TU CAPTURA DE PANTALLA)                */
              /* ========================================================================= */
              <div className="grid grid-cols-1 gap-3">
                {filteredSystems.map((sys) => {
                  const selectedConfig = selectedConfigs.find((c) => c.code === sys.code);
                  const isSelected = Boolean(selectedConfig);
                  const selectedFeatCount = selectedConfig ? selectedConfig.selectedFeatures.length : 0;
                  const totalFeats = sys.features ? sys.features.length : 0;
                  const isExpanded = allExpanded || expandedSystems[sys.code] || false;

                  return (
                    <div
                      key={sys.id || sys.code}
                      className={`p-3.5 border transition-all rounded-xs shadow-xs ${
                        isSelected
                          ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-400"
                          : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20"
                      }`}
                    >
                      {/* CARD HEADER WITH MULTI-SELECT CHECKBOX */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSystem(sys)}
                              className="w-4 h-4 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer"
                            />
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-slate-900 text-amber-400 rounded-xs">
                              <HighlightText text={sys.code} query={searchTerm} />
                            </span>
                          </label>
                          <h4
                            onClick={() => handleToggleSystem(sys)}
                            className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-amber-900"
                          >
                            <HighlightText text={sys.name} query={searchTerm} />
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* SUPPORT STATUS BADGE */}
                          {sys.supportStatus === "SOPORTADO" && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-xs">
                              🟢 Soportado
                            </span>
                          )}
                          {sys.supportStatus === "EN_IMPLEMENTACION" && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-300 rounded-xs">
                              🟡 En Implementación
                            </span>
                          )}
                          {sys.supportStatus === "BRECHA" && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 border border-rose-200 rounded-xs">
                              🔴 Brecha / Pendiente
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailModalSystem(sys)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 bg-slate-900 text-amber-300 hover:bg-slate-800 hover:text-white shadow-2xs border border-slate-700"
                            title="Ver Ficha Técnica Formal Completa con todas las características"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ver Ficha ({sys.features?.length || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleSystem(sys)}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-amber-600 text-white hover:bg-amber-700 shadow-2xs"
                                : "bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300"
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

                      {/* AREA BADGE */}
                      <div className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                        <span className="text-slate-700 font-bold">Área Funcional:</span>
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 border border-slate-200 font-medium">
                          <HighlightText text={sys.area} query={searchTerm} />
                        </span>
                      </div>

                      {/* DESCRIPTION / OBJECTIVE */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                        <HighlightText text={sys.objective} query={searchTerm} />
                      </p>

                      {/* FEATURES WITH INDIVIDUAL CHECKBOXES & SELECTABLE NUMBERING */}
                      {sys.features && sys.features.length > 0 && (
                        <div className="bg-amber-50/70 p-2.5 border border-amber-200 text-xs space-y-1.5 rounded-xs">
                          <div className="flex items-center justify-between text-amber-950 text-[11px] font-bold">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-amber-600" />
                              <span>Funcionalidades y Requerimientos ({sys.features.length}):</span>
                            </span>

                            <div className="flex items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleSelectAllFeatures(sys)}
                                className="text-amber-900 hover:underline font-bold cursor-pointer"
                              >
                                Todas
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                onClick={() => handleClearFeatures(sys.code)}
                                className="text-slate-600 hover:underline font-medium cursor-pointer"
                              >
                                Ninguna
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                            {sys.features.map((feat, idx) => {
                              const isFeatChecked =
                                selectedConfig?.selectedFeatures.includes(feat) || false;
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-start gap-2 p-1.5 rounded-xs cursor-pointer text-[11px] transition-colors border ${
                                    isFeatChecked
                                      ? "bg-amber-100/90 text-amber-950 font-medium border-amber-300 shadow-2xs"
                                      : "bg-white/80 hover:bg-amber-100/40 text-slate-700 border-amber-200/50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isFeatChecked}
                                    onChange={() => handleToggleFeature(sys, feat)}
                                    className="w-3.5 h-3.5 mt-0.5 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer shrink-0"
                                  />
                                  <span className="leading-snug flex-1">
                                    <HighlightText text={feat} query={searchTerm} />
                                  </span>
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
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Valor Resultado (Apoyo Tecnológico)
                  </h4>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded-xs">
                    {selectedConfigs.length} Sistema(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visualización y gestión detallada de los sistemas SIH seleccionados
                </p>
              </div>

              {/* LIST OF SELECTED SYSTEMS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Sistemas Seleccionados ({selectedConfigs.length}):</span>
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
                    <Server className="w-6 h-6 mx-auto text-amber-500" />
                    <p className="font-bold text-slate-700">Ningún sistema seleccionado</p>
                    <p className="text-[11px] text-slate-500">
                      Marque 1 o más sistemas del catálogo a la izquierda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedConfigs.map((cfg) => {
                      const sys = catalog.find((s) => s.code === cfg.code);
                      const isExpanded = expandedSystems[cfg.code] || false;
                      const featCount = cfg.selectedFeatures.length;
                      const totalFeats = sys?.features?.length || 0;

                      return (
                        <div
                          key={cfg.code}
                          className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="font-mono font-black text-[11px] bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded-xs shrink-0">
                                {cfg.code}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {sys?.name || cfg.code}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSystem(cfg.code)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Quitar este sistema"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* SUB-BAR WITH FEATURE BADGE & TOGGLE */}
                          <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-amber-200/70">
                            <span className="text-amber-950 font-bold">
                              {featCount > 0
                                ? `${featCount}/${totalFeats} funcionalidades`
                                : "Sin funcionalidades seleccionadas"}
                            </span>

                            {totalFeats > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSystems((prev) => ({
                                    ...prev,
                                    [cfg.code]: !prev[cfg.code]
                                  }))
                                }
                                className="text-amber-900 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Ocultar</span>
                                    <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Ver seleccionadas</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* EXPANDED FEATURES FOR THIS SYSTEM */}
                          {isExpanded && sys?.features && (
                            <div className="bg-white p-2 border border-amber-200 space-y-1 rounded-xs text-[10px] mt-1">
                              {sys.features.map((feat, fIdx) => {
                                const checked = cfg.selectedFeatures.includes(feat);
                                return (
                                  <label
                                    key={fIdx}
                                    className="flex items-start gap-1.5 cursor-pointer hover:bg-slate-50 p-0.5 rounded-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleFeature(sys, feat)}
                                      className="w-3 h-3 mt-0.5 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer"
                                    />
                                    <span
                                      className={
                                        checked
                                          ? "text-amber-950 font-medium leading-tight"
                                          : "text-slate-500 leading-tight"
                                      }
                                    >
                                      {feat}
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

              {/* FORMAT OPTIONS CHECKBOXES */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block">
                  Formato del Texto Resultado:
                </span>
                
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-1.5 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeSystemName}
                      onChange={(e) => {
                        setIncludeSystemName(e.target.checked);
                        setIsManualEdit(false);
                      }}
                      className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-600 cursor-pointer"
                    />
                    <span className="text-[11px]">Código y Nombre del Sistema</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-1.5 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeFeatures}
                      onChange={(e) => {
                        setIncludeFeatures(e.target.checked);
                        setIsManualEdit(false);
                      }}
                      className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-600 cursor-pointer"
                    />
                    <span className="text-[11px]">Funcionalidades Seleccionadas</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-1.5 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeStatus}
                      onChange={(e) => {
                        setIncludeStatus(e.target.checked);
                        setIsManualEdit(false);
                      }}
                      className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-600 cursor-pointer"
                    />
                    <span className="text-[11px]">Estado del Sistema (Soportado / Brecha)</span>
                  </label>
                </div>
              </div>

              {/* RESULT TEXT PREVIEW */}
              <div className="pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                    Texto Resultado Consolidado:
                  </label>
                  {isManualEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualEdit(false);
                        setCustomResultText(
                          buildResultText(
                            selectedConfigs,
                            includeSystemName,
                            includeFeatures,
                            includeStatus
                          )
                        );
                      }}
                      className="text-[10px] text-amber-700 hover:underline font-bold cursor-pointer"
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
                  placeholder="Seleccione uno o más sistemas para componer el valor de Apoyo Tecnológico..."
                  className="w-full p-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-950 focus:outline-none focus:border-amber-600 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Este texto será asignado al campo <strong>Apoyo Tecnológico</strong> de la ficha.
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
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black rounded-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a la Ficha ({selectedConfigs.length})</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE FICHA TÉCNICA FORMAL COMPLETA EMERGENTE (SI HACE CLIC EN DETALLE)  */}
      {/* ========================================================================= */}
      {detailModalSystem && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden rounded-xs">
            {/* CABECERA */}
            <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-xs">
                  {detailModalSystem.code}
                </span>
                <h3 className="font-black text-sm tracking-wide text-white">
                  Ficha Técnica Oficial: {detailModalSystem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalSystem(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO TABLA FORMAL */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs shadow-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th colSpan={2} className="p-3 font-black text-sm">
                      {detailModalSystem.code}. {detailModalSystem.name}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200 w-1/3">
                      Área:
                    </td>
                    <td className="p-2.5 text-slate-800 font-semibold">
                      {detailModalSystem.area}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      Sistema de Información / Proveedor:
                    </td>
                    <td className="p-2.5 text-slate-800 font-semibold">
                      {detailModalSystem.providerVendor || `Sistema ${detailModalSystem.name}`}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      Estado de Implementación:
                    </td>
                    <td className="p-2.5">
                      {detailModalSystem.supportStatus === "SOPORTADO" && (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 rounded-xs">
                          🟢 Soportado / Operativo
                        </span>
                      )}
                      {detailModalSystem.supportStatus === "EN_IMPLEMENTACION" && (
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-300 rounded-xs">
                          🟡 En Implementación
                        </span>
                      )}
                      {detailModalSystem.supportStatus === "BRECHA" && (
                        <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 border border-rose-300 rounded-xs">
                          🔴 Brecha / Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      Objetivo:
                    </td>
                    <td className="p-2.5 text-slate-800 leading-relaxed">
                      {detailModalSystem.objective}
                    </td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td className="p-2.5 font-bold text-amber-950 border-r border-slate-200 align-top">
                      Funcionalidades más relevantes ({detailModalSystem.features.length}):
                      <div className="mt-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSelectAllFeatures(detailModalSystem)}
                          className="block text-[10px] font-bold text-amber-900 hover:underline cursor-pointer"
                        >
                          ✓ Marcar Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearFeatures(detailModalSystem.code)}
                          className="block text-[10px] font-bold text-slate-600 hover:underline cursor-pointer"
                        >
                          ✕ Desmarcar Todas
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="space-y-1.5">
                        {detailModalSystem.features.map((feat, idx) => {
                          const cfg = selectedConfigs.find((c) => c.code === detailModalSystem.code);
                          const isFeatChecked = cfg?.selectedFeatures.includes(feat) || false;
                          return (
                            <label
                              key={idx}
                              className={`flex items-start gap-2 p-1.5 rounded-xs cursor-pointer border text-xs ${
                                isFeatChecked
                                  ? "bg-amber-100 font-medium text-amber-950 border-amber-300"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isFeatChecked}
                                onChange={() => handleToggleFeature(detailModalSystem, feat)}
                                className="w-4 h-4 mt-0.5 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer shrink-0"
                              />
                              <div className="flex-1">
                                <strong className="font-mono text-amber-900 mr-1.5">{idx + 1}.</strong>
                                <span>{feat}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                  {detailModalSystem.integrations && detailModalSystem.integrations.length > 0 && (
                    <tr className="bg-slate-50/70">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200 align-top">
                        Interoperabilidad / Integraciones:
                      </td>
                      <td className="p-2.5">
                        <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                          {detailModalSystem.integrations.map((integ, iIdx) => (
                            <li key={iIdx}>{integ}</li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER MODAL DETALLE */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">
                  {detailModalSystem.features.length} funcionalidades disponibles en esta ficha técnica oficial.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Ensure system is in selectedConfigs with all or current checked features
                    const cfg = selectedConfigs.find((c) => c.code === detailModalSystem.code);
                    if (!cfg) {
                      setSelectedConfigs((prev) => [
                        ...prev,
                        {
                          code: detailModalSystem.code,
                          selectedFeatures: detailModalSystem.features ? [...detailModalSystem.features] : []
                        }
                      ]);
                    }
                    setDetailModalSystem(null);
                  }}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Aceptar y Añadir a Selección</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalSystem(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xs cursor-pointer shadow-xs"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
