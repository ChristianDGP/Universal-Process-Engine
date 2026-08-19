import React, { useState, useMemo, useEffect } from "react";
import { JCIStandard } from "../types";
import { OFFICIAL_JCI_CATEGORIES, INITIAL_JCI_CATALOG } from "../data/jciCatalogPreset";
import { jciMatchesQuery, autoDetectJCIForFicha, autoDetectJCISupportType } from "../lib/jciUtils";
import {
  Award, Search, X, Check, Filter, Layers, CheckCircle2,
  AlertCircle, ChevronRight, ArrowRight, Sparkles, RefreshCw, FileText, Cpu
} from "lucide-react";

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
    selectedStandard?: JCIStandard | null
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

  // Selection states
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [supportType, setSupportType] = useState<"DOCUMENTO" | "PROCESO" | "SISTEMA">("PROCESO");
  const [includeStandardName, setIncludeStandardName] = useState<boolean>(true);
  const [includeElements, setIncludeElements] = useState<boolean>(true);
  const [customResultText, setCustomResultText] = useState<string>(currentValue || "");

  // On open, attempt to pre-select based on currentValue
  useEffect(() => {
    if (isOpen) {
      setCustomResultText(currentValue || "");
      
      // Determine initial support type
      if (currentSupportType === "DOCUMENTO" || currentSupportType === "DOCUMENTAL") {
        setSupportType("DOCUMENTO");
      } else if (currentSupportType === "SISTEMA" || currentSupportType === "SISTEMICO") {
        setSupportType("SISTEMA");
      } else if (currentSupportType === "PROCESO" || currentSupportType === "PROCESAL") {
        setSupportType("PROCESO");
      } else {
        // Auto-detect support type
        const detectedSupport = autoDetectJCISupportType(activityName || "", activityDescription || "", supportTech || "");
        if (detectedSupport === "DOCUMENTO" || detectedSupport === "SISTEMA" || detectedSupport === "PROCESO") {
          setSupportType(detectedSupport);
        } else {
          setSupportType("PROCESO");
        }
      }

      if (!currentValue || currentValue.toLowerCase().trim() === "no aplica" || currentValue.toLowerCase().trim() === "no tiene") {
        setSelectedCode(currentValue?.toLowerCase().trim() === "no aplica" ? "NO_APLICA" : "");
      } else {
        const valLower = currentValue.toLowerCase();
        const matched = catalog.find(
          (std) =>
            valLower.includes(`[${std.code.toLowerCase()}]`) ||
            valLower.includes(std.code.toLowerCase()) ||
            valLower.includes(std.name.toLowerCase())
        );
        if (matched) {
          setSelectedCode(matched.code);
          const cat = OFFICIAL_JCI_CATEGORIES.find((c) => matched.code.startsWith(c.code));
          if (cat) setSelectedChapter(cat.code);
          setIncludeElements(valLower.includes("elementos medibles") || valLower.includes("requisitos"));
        } else {
          setSelectedCode("");
        }
      }
    }
  }, [isOpen, currentValue, currentSupportType, activityName, activityDescription, supportTech, catalog]);

  // Selected standard object
  const activeStandard = useMemo(() => {
    if (!selectedCode || selectedCode === "NO_APLICA" || selectedCode === "CUSTOM") return null;
    return catalog.find((s) => s.code === selectedCode || s.id === selectedCode) || null;
  }, [selectedCode, catalog]);

  // Generate formatted text whenever selection or options change
  useEffect(() => {
    if (selectedCode === "NO_APLICA") {
      setCustomResultText("No aplica");
      return;
    }
    if (!activeStandard) {
      return;
    }

    let text = "";
    if (includeStandardName) {
      text = `${activeStandard.code} - ${activeStandard.name}`;
    }

    if (includeElements && activeStandard.measurableElements && activeStandard.measurableElements.length > 0) {
      const elemsSample = activeStandard.measurableElements.slice(0, 3).join("; ");
      text = text ? `${text} | Elementos Medibles: ${elemsSample}` : `Elementos Medibles: ${elemsSample}`;
    }

    if (text) {
      setCustomResultText(text);
    }
  }, [selectedCode, activeStandard, includeStandardName, includeElements]);

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

  const handleApply = () => {
    onApply(customResultText.trim(), supportType, activeStandard);
    onClose();
  };

  const handleSelectNoAplica = () => {
    setSelectedCode("NO_APLICA");
    setCustomResultText("No aplica");
    onApply("No aplica", undefined, null);
    onClose();
  };

  const handleAutoDetect = () => {
    const autoVal = autoDetectJCIForFicha(activityName || "", activityDescription || "", catalog);
    if (autoVal && autoVal !== "No aplica" && autoVal !== "No tiene") {
      const matched = catalog.find(
        (std) => autoVal.includes(std.code) || autoVal.includes(std.name)
      );
      if (matched) {
        setSelectedCode(matched.code);
        const cat = OFFICIAL_JCI_CATEGORIES.find((c) => matched.code.startsWith(c.code));
        if (cat) setSelectedChapter(cat.code);
      }
      setCustomResultText(autoVal);
    } else {
      setCustomResultText(autoVal || "No aplica");
      setSelectedCode("NO_APLICA");
    }

    const detectedSupport = autoDetectJCISupportType(activityName || "", activityDescription || "", supportTech || "");
    if (detectedSupport === "DOCUMENTO" || detectedSupport === "SISTEMA" || detectedSupport === "PROCESO") {
      setSupportType(detectedSupport);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-300 w-full max-w-6xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden rounded-xs">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-indigo-950 text-white flex justify-between items-center shrink-0 border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500 text-white rounded-xs shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Módulo de Selección: Estándares JCI (Joint Commission International)
                </h3>
                <span className="bg-indigo-400/20 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  {catalog.length} Estándares Acreditación
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Despliegue estructurado por capítulos, elementos medibles y tipo de soporte documental/procesal/sistémico
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
        <div className="bg-indigo-50/70 border-b border-indigo-100 p-3 shrink-0 space-y-2.5">
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
                  <span className="max-w-[120px] truncate">{cat.name.split("(")[0]}</span>
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
                  placeholder="Buscar por código (ej. IPSG.1, AOP.5.11), palabra clave (ej. identificación, transfusión) o requisito..."
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
                title="Detectar automáticamente estándar JCI y soporte según nombre y descripción de la actividad"
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

        {/* MAIN BODY: CATALOG CARDS ON LEFT, SELECTION CONFIG & RESULT PREVIEW ON RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT PANE: EXPANSIVE CATALOG OF JCI STANDARDS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
              <span>Estándares JCI ({filteredStandards.length}):</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Haga clic sobre un estándar para seleccionarlo e inspeccionar sus elementos medibles
              </span>
            </div>

            {filteredStandards.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-indigo-400" />
                <p className="font-semibold text-slate-700">No se encontraron estándares con los filtros aplicados.</p>
                <p className="text-[11px]">Intente limpiar la búsqueda o seleccionar otro capítulo del menú superior.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedChapter("ALL");
                  }}
                  className="px-3 py-1 bg-indigo-900 text-white text-xs font-bold mt-2"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredStandards.map((std) => {
                  const isSelected = selectedCode === std.code;
                  return (
                    <div
                      key={std.id || std.code}
                      onClick={() => setSelectedCode(std.code)}
                      className={`p-3.5 border transition-all cursor-pointer select-none rounded-xs ${
                        isSelected
                          ? "bg-indigo-50/95 border-indigo-600 ring-2 ring-indigo-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-2xs"
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-indigo-900 text-white rounded-xs">
                            {std.code}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {std.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-xs transition-colors ${
                              isSelected
                                ? "bg-indigo-900 text-white"
                                : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200"
                            }`}
                          >
                            {isSelected ? "✓ Seleccionado" : "Seleccionar"}
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

                      {/* MEASURABLE ELEMENTS */}
                      {std.measurableElements && std.measurableElements.length > 0 && (
                        <div className="bg-indigo-50/60 p-2.5 border border-indigo-100 text-xs space-y-1 rounded-xs">
                          <span className="font-bold text-indigo-950 text-[11px] block flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            Elementos Medibles / Requisitos de Auditoría ({std.measurableElements.length}):
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                            {std.measurableElements.map((elem, idx) => (
                              <li key={idx} className="leading-snug">
                                {elem}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANE: SELECTION & OUTPUT PREVIEW PANEL */}
          <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-300 flex flex-col p-4 shrink-0 shadow-lg justify-between space-y-3">
            <div className="space-y-3 overflow-y-auto">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Configuración del Atributo JCI
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ajuste el estándar, elementos medibles y tipo de soporte
                </p>
              </div>

              {/* ACTIVE STANDARD PREVIEW CARD */}
              {activeStandard ? (
                <div className="bg-indigo-50/90 border border-indigo-300 p-3 rounded-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs bg-indigo-950 text-white px-2 py-0.5 rounded-xs">
                      {activeStandard.code}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 border border-indigo-200">
                      Estándar Acreditado
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-900">
                    {activeStandard.name}
                  </h5>
                  <p className="text-[11px] text-slate-600 line-clamp-3">
                    {activeStandard.objective}
                  </p>
                </div>
              ) : selectedCode === "NO_APLICA" ? (
                <div className="bg-slate-100 border border-slate-300 p-3 rounded-xs space-y-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <X className="w-4 h-4 text-slate-600" />
                    Sin Vinculación JCI
                  </div>
                  <p className="text-[11px] text-slate-600">
                    La actividad quedará clasificada como "No aplica", indicando que no está sujeta directamente a un estándar JCI específico.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xs text-center text-xs text-slate-500">
                  <Award className="w-6 h-6 mx-auto text-indigo-400 mb-1" />
                  <p className="font-bold text-slate-700">Ningún estándar seleccionado</p>
                  <p className="text-[11px] mt-0.5">Seleccione un estándar del catálogo a la izquierda o pulse Auto-detectar.</p>
                </div>
              )}

              {/* TIPO DE SOPORTE SELECTOR (DOCUMENTO / PROCESO / SISTEMA) */}
              <div className="space-y-1.5 pt-1">
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
              {activeStandard && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">
                    Elementos a incluir en el resultado:
                  </span>
                  
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeStandardName}
                      onChange={(e) => setIncludeStandardName(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span>Código y Nombre del Estándar</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeElements}
                      onChange={(e) => setIncludeElements(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span>Elementos Medibles JCI</span>
                  </label>
                </div>
              )}

              {/* RESULT TEXT PREVIEW */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Valor Resultado (Atributo JCI):
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Editable</span>
                </div>
                <textarea
                  rows={3}
                  value={customResultText}
                  onChange={(e) => setCustomResultText(e.target.value)}
                  placeholder="Seleccione un estándar o ingrese el texto deseado..."
                  className="w-full p-2.5 text-xs font-semibold bg-white border border-indigo-200 text-slate-950 focus:outline-none focus:border-indigo-600 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Este texto será asignado directamente al campo <strong>Atributo JCI</strong> de la ficha.
                </p>
              </div>
            </div>

            {/* MODAL BOTTOM ACTIONS */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
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
                <span>Aplicar a la Ficha</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
