import React, { useState, useMemo, useEffect } from "react";
import { SIHSystem } from "../types";
import { OFFICIAL_SIH_CATEGORIES, INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";
import { systemMatchesQuery } from "../lib/sihUtils";
import { parseSihDocumentText } from "../lib/sihDocumentParser";
import {
  Server, Search, X, Check, Filter, Layers, CheckCircle2,
  AlertCircle, ChevronRight, ChevronDown, ChevronUp, Cpu, ArrowRight, Sparkles, BookOpen, Plus, Trash2,
  UploadCloud, FileText, RotateCcw
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
}

const STORAGE_KEY = "sih_catalog_state_v2";

export default function SihCatalogPickerModal({
  isOpen,
  onClose,
  currentValue,
  onApply
}: SihCatalogPickerModalProps) {
  // Load & stateful SIH catalog
  const [catalog, setCatalog] = useState<SIHSystem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("sih_catalog_state_v1");
      if (saved) {
        const parsed: SIHSystem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, SIHSystem>();
          INITIAL_SIH_CATALOG.forEach((item) => map.set(item.code, { ...item }));
          parsed.forEach((item) => {
            const existing = map.get(item.code);
            if (existing) {
              if (item.features && existing.features && item.features.length >= existing.features.length) {
                map.set(item.code, { ...existing, ...item });
              } else {
                map.set(item.code, { ...item, features: existing.features, objective: existing.objective || item.objective });
              }
            } else {
              map.set(item.code, item);
            }
          });
          return Array.from(map.values());
        }
      }
    } catch (e) {
      console.error("Error reading SIH catalog from storage:", e);
    }
    return INITIAL_SIH_CATALOG;
  });

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Multiple selection state
  const [selectedConfigs, setSelectedConfigs] = useState<SelectedSihSystemConfig[]>([]);
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({});

  // Format options
  const [includeSystemName, setIncludeSystemName] = useState<boolean>(true);
  const [includeFeatures, setIncludeFeatures] = useState<boolean>(true);
  const [includeStatus, setIncludeStatus] = useState<boolean>(false);
  const [customResultText, setCustomResultText] = useState<string>(currentValue || "");
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false);

  // Import / Update from Document State
  const [showImportDrawer, setShowImportDrawer] = useState<boolean>(false);
  const [importRawText, setImportRawText] = useState<string>("");
  const [importNotification, setImportNotification] = useState<string | null>(null);

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

      let part = incName ? `${sys.code} - ${sys.name}` : sys.code;

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

  // On open, parse and initialize multiple systems from currentValue
  useEffect(() => {
    if (isOpen) {
      setIsManualEdit(false);
      setCustomResultText(currentValue || "");

      if (!currentValue || currentValue.toLowerCase().trim() === "no tiene" || currentValue.toLowerCase().trim() === "no aplica" || currentValue.toLowerCase().trim() === "ninguno") {
        setSelectedConfigs([]);
      } else {
        const valLower = currentValue.toLowerCase();
        const matchedConfigs: SelectedSihSystemConfig[] = [];

        catalog.forEach((sys) => {
          const codeLower = sys.code.toLowerCase();
          if (valLower.includes(`[${codeLower}]`) || valLower.includes(codeLower) || valLower.includes(sys.name.toLowerCase())) {
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
        setIncludeFeatures(valLower.includes("funcionalidades") || valLower.includes("módulo"));
      }
    }
  }, [isOpen, currentValue, catalog]);

  // Sync customResultText whenever selection or options change (unless manually typed)
  useEffect(() => {
    if (!isManualEdit) {
      const generated = buildResultText(selectedConfigs, includeSystemName, includeFeatures, includeStatus);
      setCustomResultText(generated);
    }
  }, [selectedConfigs, includeSystemName, includeFeatures, includeStatus, isManualEdit]);

  // Parsed preview for text import
  const parsedImportedSystems = useMemo(() => {
    if (!importRawText.trim()) return [];
    return parseSihDocumentText(importRawText);
  }, [importRawText]);

  // Save imported systems into catalog
  const handleSaveImportedSystems = () => {
    if (parsedImportedSystems.length === 0) return;

    const map = new Map<string, SIHSystem>();
    catalog.forEach((s) => map.set(s.code, s));
    parsedImportedSystems.forEach((s) => map.set(s.code, s));

    const updated = Array.from(map.values());
    setCatalog(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving updated SIH catalog to localStorage:", e);
    }

    setImportNotification(`¡Se han importado/actualizado exitosamente ${parsedImportedSystems.length} módulo(s) en el Catálogo SIH!`);
    setTimeout(() => {
      setShowImportDrawer(false);
      setImportRawText("");
      setImportNotification(null);
    }, 2000);
  };

  // Reset to full official catalog
  const handleResetCatalog = () => {
    if (window.confirm("¿Desea restablecer el Catálogo SIH a la versión oficial completa (incluyendo las 13 funcionalidades de Gestión OIRS y todos los módulos hospitalarios)?")) {
      setCatalog(INITIAL_SIH_CATALOG);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SIH_CATALOG));
      } catch (e) {
        console.error("Error resetting SIH catalog:", e);
      }
    }
  };

  // Filtered systems list
  const filteredSystems = useMemo(() => {
    return catalog.filter((sys) => {
      const matchQuery = systemMatchesQuery(sys, searchTerm);
      const matchArea = selectedArea === "ALL" || sys.area === selectedArea;
      const matchStatus = selectedStatus === "ALL" || (sys.supportStatus || "SOPORTADO") === selectedStatus;
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

  // Toggle a single feature for a system
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

      return prev.map((c) => (c.code === sys.code ? { ...c, selectedFeatures: updatedFeats } : c));
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
      return prev.map((c) => (c.code === sys.code ? { ...c, selectedFeatures: allFeats } : c));
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
      <div className="bg-white border border-slate-300 w-full max-w-7xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden rounded-xs">
        
        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xs shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Módulo de Selección Múltiple: Catálogo de Sistemas Informáticos Hospitalarios (SIH)
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  Selección de 1 o más Sistemas SIH
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

          {/* SEARCH AND FILTER STATUS */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código (ej. SIH-01), nombre (ej. Trackcare), o funcionalidad (ej. recetas, agenda)..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
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
            </div>

            {/* ACTIONS: IMPORT, RESET, NO TIENE */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowImportDrawer(!showImportDrawer)}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-xs font-bold border border-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs rounded-xs"
                title="Importar o actualizar módulos y funcionalidades desde documento técnico (Word/PDF/Texto)"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-700" />
                <span>📥 Importar desde Documento / Texto</span>
              </button>

              <button
                type="button"
                onClick={handleResetCatalog}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs rounded-xs"
                title="Restablecer catálogo oficial con todas las funcionalidades completas"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Restablecer Catálogo Oficial</span>
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

          {/* IMPORT DRAWER / SECTION */}
          {showImportDrawer && (
            <div className="bg-indigo-950/5 border border-indigo-300 p-3.5 rounded-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Importador Inteligente de Módulos Técnicos SIH
                  </h4>
                  <span className="bg-indigo-100 text-indigo-900 text-[10px] font-bold px-2 py-0.5 border border-indigo-200 rounded-xs">
                    Extracción de Todas las Funcionalidades (1..N)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportDrawer(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-600">
                Pegue directamente el texto del documento técnico del módulo SIH (incluyendo Código, Área, Objetivo y la lista completa de Funcionalidades más relevantes 1..N). El sistema extraerá y estructurará automáticamente cada funcionalidad.
              </p>

              {importNotification && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importNotification}</span>
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder={`Ejemplo de texto a pegar:
1.6.4. Gestión OIRS
Área    Gestión de la Información
Sistema de Información    Gestión OIRS
Objetivo    Constituye una herramienta o medio de atención...
Funcionalidades más relevantes
1.    Permite el ingreso de consultas, felicitaciones, reclamos, sugerencias...
2.    Permita ingresar los datos del solicitante...
13.   Disponer de un sistema para tomar encuestas de satisfacción...`}
                  className="w-full p-2.5 text-xs font-mono bg-white border border-indigo-200 text-slate-900 focus:outline-none focus:border-indigo-600 rounded-xs shadow-inner"
                />

                {parsedImportedSystems.length > 0 && (
                  <div className="bg-white p-3 border border-indigo-200 rounded-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                      <span>Módulos detectados ({parsedImportedSystems.length}):</span>
                      <span className="text-emerald-700 font-mono text-[11px]">
                        ✓ Formato válido y estructurado
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {parsedImportedSystems.map((sys, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-xs space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-black text-slate-900 bg-amber-200 px-1.5 py-0.5 rounded-xs">
                              {sys.code}
                            </span>
                            <span className="font-bold text-slate-900 flex-1 ml-2">{sys.name}</span>
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 border border-indigo-200">
                              {sys.features.length} Funcionalidades extraídas
                            </span>
                          </div>
                          {sys.objective && (
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              <strong>Objetivo:</strong> {sys.objective}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-500 line-clamp-2">
                            <strong>Funcionalidades:</strong> {sys.features.slice(0, 3).join(" | ")}... ({sys.features.length} en total)
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveImportedSystems}
                        className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black rounded-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Guardar y Actualizar {parsedImportedSystems.length} Módulo(s) en el Catálogo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MAIN BODY: CATALOG CARDS ON LEFT, MULTI-SELECTION AND RESULT PREVIEW ON RIGHT */}
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
                Marque la casilla de cada sistema para agregarlo al apoyo tecnológico
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
                  className="px-3 py-1 bg-slate-900 text-white text-xs font-bold mt-2 rounded-xs"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSystems.map((sys) => {
                  const selectedConfig = selectedConfigs.find((c) => c.code === sys.code);
                  const isSelected = Boolean(selectedConfig);
                  const selectedFeatCount = selectedConfig ? selectedConfig.selectedFeatures.length : 0;
                  const totalFeats = sys.features ? sys.features.length : 0;

                  return (
                    <div
                      key={sys.id || sys.code}
                      className={`p-3.5 border transition-all select-none rounded-xs ${
                        isSelected
                          ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 shadow-2xs"
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
                              {sys.code}
                            </span>
                          </label>
                          <h4
                            onClick={() => handleToggleSystem(sys)}
                            className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-amber-900"
                          >
                            {sys.name}
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

                          {isSelected && (
                            <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 border border-amber-300 rounded-xs">
                              {selectedFeatCount}/{totalFeats} Funcionalidades
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleSystem(sys)}
                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xs transition-colors cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-amber-600 text-white hover:bg-amber-700"
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
                          {sys.area}
                        </span>
                      </div>

                      {/* OBJECTIVE / PURPOSE */}
                      {sys.objective && (
                        <div className="text-xs text-slate-700 leading-relaxed mb-2.5 bg-slate-50 p-2 border border-slate-200 rounded-xs">
                          <span className="font-bold text-slate-900 block mb-0.5">Objetivo:</span>
                          {sys.objective}
                        </div>
                      )}

                      {/* FEATURES WITH INDIVIDUAL CHECKBOXES */}
                      {sys.features && sys.features.length > 0 && (
                        <div className="bg-amber-50/70 p-2.5 border border-amber-200 text-xs space-y-1.5 rounded-xs">
                          <div className="flex items-center justify-between text-amber-950 text-[11px] font-bold">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-amber-600" />
                              Funcionalidades y Módulos ({sys.features.length}):
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

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                            {sys.features.map((feat, idx) => {
                              const isFeatChecked =
                                selectedConfig?.selectedFeatures.includes(feat) || false;
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-start gap-2 p-1.5 rounded-xs cursor-pointer text-[11px] transition-colors ${
                                    isFeatChecked
                                      ? "bg-amber-100/90 text-amber-950 font-medium border border-amber-300"
                                      : "hover:bg-amber-100/40 text-slate-700 border border-transparent"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isFeatChecked}
                                    onChange={() => handleToggleFeature(sys, feat)}
                                    className="w-3.5 h-3.5 mt-0.5 text-amber-600 rounded-none focus:ring-amber-600 cursor-pointer"
                                  />
                                  <span className="leading-snug flex-1">{feat}</span>
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
                              {featCount > 0 ? `${featCount}/${totalFeats} funcionalidades` : "Sin funcionalidades seleccionadas"}
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
                                    <span>Ocultar funcionalidades</span>
                                    <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Ver funcionalidades</span>
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
                                    <span className={checked ? "text-amber-950 font-medium leading-tight" : "text-slate-500 leading-tight"}>
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
                        setCustomResultText(buildResultText(selectedConfigs, includeSystemName, includeFeatures, includeStatus));
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
    </div>
  );
}
