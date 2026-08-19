import React, { useState, useMemo, useEffect } from "react";
import { SIHSystem } from "../types";
import { OFFICIAL_SIH_CATEGORIES, INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";
import { systemMatchesQuery } from "../lib/sihUtils";
import {
  Server, Search, X, Check, Filter, Layers, CheckCircle2,
  AlertCircle, ChevronRight, Cpu, ArrowRight, Sparkles, BookOpen
} from "lucide-react";

interface SihCatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onApply: (resultText: string, selectedSystem?: SIHSystem | null) => void;
}

const STORAGE_KEY = "sih_catalog_state_v1";

export default function SihCatalogPickerModal({
  isOpen,
  onClose,
  currentValue,
  onApply
}: SihCatalogPickerModalProps) {
  // Load SIH catalog
  const catalog = useMemo<SIHSystem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading SIH catalog from storage:", e);
    }
    return INITIAL_SIH_CATALOG;
  }, [isOpen]);

  // Filters
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selected system state
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [includeSystemName, setIncludeSystemName] = useState<boolean>(true);
  const [includeFeatures, setIncludeFeatures] = useState<boolean>(true);
  const [includeStatus, setIncludeStatus] = useState<boolean>(false);
  const [customResultText, setCustomResultText] = useState<string>(currentValue || "");

  // On open, attempt to pre-select based on currentValue
  useEffect(() => {
    if (isOpen) {
      setCustomResultText(currentValue || "");
      if (!currentValue || currentValue.toLowerCase().trim() === "no tiene") {
        setSelectedCode(currentValue?.toLowerCase().trim() === "no tiene" ? "NO_TIENE" : "");
      } else {
        const valLower = currentValue.toLowerCase();
        const matched = catalog.find(
          (sys) =>
            valLower.includes(`[${sys.code.toLowerCase()}]`) ||
            valLower.includes(sys.code.toLowerCase()) ||
            valLower.includes(sys.name.toLowerCase())
        );
        if (matched) {
          setSelectedCode(matched.code);
          setSelectedArea(matched.area || "ALL");
          setIncludeFeatures(valLower.includes("funcionalidades") || valLower.includes("módulo"));
        } else {
          setSelectedCode("");
        }
      }
    }
  }, [isOpen, currentValue, catalog]);

  // Selected system object
  const activeSystem = useMemo(() => {
    if (!selectedCode || selectedCode === "NO_TIENE" || selectedCode === "CUSTOM") return null;
    return catalog.find((s) => s.code === selectedCode || s.id === selectedCode) || null;
  }, [selectedCode, catalog]);

  // Generate formatted text whenever selection or options change
  useEffect(() => {
    if (selectedCode === "NO_TIENE") {
      setCustomResultText("No tiene");
      return;
    }
    if (!activeSystem) {
      return;
    }

    let text = "";
    if (includeSystemName) {
      text = `${activeSystem.code} - ${activeSystem.name}`;
      if (includeStatus && activeSystem.supportStatus) {
        text += ` [${activeSystem.supportStatus}]`;
      }
    }

    if (includeFeatures && activeSystem.features && activeSystem.features.length > 0) {
      const featSample = activeSystem.features.slice(0, 3).join("; ");
      text = text ? `${text} | Funcionalidades: ${featSample}` : `Funcionalidades: ${featSample}`;
    }

    if (text) {
      setCustomResultText(text);
    }
  }, [selectedCode, activeSystem, includeSystemName, includeFeatures, includeStatus]);

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

  const handleApply = () => {
    onApply(customResultText.trim(), activeSystem);
    onClose();
  };

  const handleSelectNoTiene = () => {
    setSelectedCode("NO_TIENE");
    setCustomResultText("No tiene");
    onApply("No tiene", null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-300 w-full max-w-6xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden rounded-xs">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xs shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                  Módulo de Selección: Catálogo SIH (Sistemas de Información)
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                  {catalog.length} Sistemas Disponibles
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Despliegue estructurado de sistemas, módulos y funcionalidades para apoyo tecnológico de la actividad
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

        {/* TOP TOOLBAR: CATEGORY PILLS & FILTERS */}
        <div className="bg-slate-100 border-b border-slate-200 p-3 shrink-0 space-y-2.5">
          {/* CATEGORY TABS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedArea("ALL")}
              className={`px-3 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedArea === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas las Áreas</span>
              <span className="text-[10px] font-mono opacity-80">({catalog.length})</span>
            </button>

            {OFFICIAL_SIH_CATEGORIES.map((cat) => {
              const isCatSelected = selectedArea === cat.name;
              const count = countPerArea[cat.name] || 0;
              return (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => setSelectedArea(cat.name)}
                  className={`px-2.5 py-1.5 font-bold rounded-xs shrink-0 transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                    isCatSelected
                      ? "bg-amber-600 text-white shadow-xs border border-amber-700"
                      : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                  }`}
                  title={`${cat.code} ${cat.name}`}
                >
                  <span className="font-mono font-black">{cat.code}</span>
                  <span className="max-w-[140px] truncate">{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH AND SECONDARY FILTERS */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Búsqueda rápida por nombre, código (ej. 1.4.4, Traslados), funcionalidad o proveedor..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-slate-950 shadow-2xs"
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

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="SOPORTADO">Soportado</option>
                <option value="EN_IMPLEMENTACION">En Implementación</option>
                <option value="BRECHA">Brecha / Requerido</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectNoTiene}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold border border-slate-400 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Marcar como actividad presencial/manual sin software"
              >
                <X className="w-3.5 h-3.5 text-slate-600" />
                <span>Marcar "No tiene" (Manual / Presencial)</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN BODY: CATALOG CARDS ON LEFT, SELECTION CONFIG & RESULT PREVIEW ON RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT PANE: EXPANSIVE CATALOG OF SYSTEMS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
              <span>Sistemas en Catálogo ({filteredSystems.length}):</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Haga clic sobre un sistema para seleccionarlo e inspeccionar sus funcionalidades
              </span>
            </div>

            {filteredSystems.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">No se encontraron sistemas con los filtros aplicados.</p>
                <p className="text-[11px]">Intente limpiar el buscador o seleccionar otra área del menú superior.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedArea("ALL");
                    setSelectedStatus("ALL");
                  }}
                  className="px-3 py-1 bg-slate-900 text-white text-xs font-bold mt-2"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSystems.map((sys) => {
                  const isSelected = selectedCode === sys.code;
                  return (
                    <div
                      key={sys.id || sys.code}
                      onClick={() => setSelectedCode(sys.code)}
                      className={`p-3.5 border transition-all cursor-pointer select-none rounded-xs ${
                        isSelected
                          ? "bg-amber-50/95 border-amber-500 ring-2 ring-amber-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/80 shadow-2xs"
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 bg-slate-900 text-white rounded-xs">
                            {sys.code}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {sys.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs border ${
                              sys.supportStatus === "SOPORTADO" || !sys.supportStatus
                                ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                                : sys.supportStatus === "EN_IMPLEMENTACION"
                                ? "bg-blue-100 text-blue-950 border-blue-300"
                                : "bg-amber-100 text-amber-950 border-amber-300"
                            }`}
                          >
                            {sys.supportStatus === "SOPORTADO" || !sys.supportStatus
                              ? "Soportado"
                              : sys.supportStatus === "EN_IMPLEMENTACION"
                              ? "En Implementación"
                              : "Brecha"}
                          </span>

                          <button
                            type="button"
                            className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-xs transition-colors ${
                              isSelected
                                ? "bg-slate-950 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                            }`}
                          >
                            {isSelected ? "✓ Seleccionado" : "Seleccionar"}
                          </button>
                        </div>
                      </div>

                      {/* AREA BADGE */}
                      <div className="text-[10px] text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
                        <span className="text-slate-700 font-bold">Área:</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 border border-slate-200">{sys.area}</span>
                        {sys.providerVendor && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-700 font-bold">Proveedor/Sistema:</span>
                            <span className="text-slate-600 italic">{sys.providerVendor}</span>
                          </>
                        )}
                      </div>

                      {/* OBJECTIVE */}
                      <p className="text-xs text-slate-700 leading-relaxed mb-2.5">
                        {sys.objective}
                      </p>

                      {/* FEATURES LIST */}
                      {sys.features && sys.features.length > 0 && (
                        <div className="bg-slate-100/80 p-2.5 border border-slate-200/90 text-xs space-y-1 rounded-xs">
                          <span className="font-bold text-slate-800 text-[11px] block flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-amber-600" />
                            Funcionalidades del Sistema ({sys.features.length}):
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                            {sys.features.map((feat, idx) => (
                              <li key={idx} className="leading-snug">
                                {feat}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* INTEGRATIONS */}
                      {sys.integrations && sys.integrations.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-1">
                          <span className="font-bold text-slate-700">Integración:</span>
                          {sys.integrations.map((integ, iIdx) => (
                            <span key={iIdx} className="bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded-xs text-[10px]">
                              {integ}
                            </span>
                          ))}
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
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Configuración del Atributo
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Personalice la información que se trasladará a la Ficha de Actividad
                </p>
              </div>

              {/* ACTIVE SYSTEM PREVIEW CARD */}
              {activeSystem ? (
                <div className="bg-amber-50/80 border border-amber-300 p-3 rounded-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs bg-slate-950 text-white px-2 py-0.5 rounded-xs">
                      {activeSystem.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-200">
                      {activeSystem.supportStatus || "SOPORTADO"}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-slate-900">
                    {activeSystem.name}
                  </h5>
                  <p className="text-[11px] text-slate-600 line-clamp-3">
                    {activeSystem.objective}
                  </p>
                </div>
              ) : selectedCode === "NO_TIENE" ? (
                <div className="bg-slate-100 border border-slate-300 p-3 rounded-xs space-y-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <X className="w-4 h-4 text-slate-600" />
                    Actividad Manual / Presencial
                  </div>
                  <p className="text-[11px] text-slate-600">
                    La actividad quedará catalogada con "No tiene", indicando que no requiere software informático.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xs text-center text-xs text-slate-500">
                  <Server className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="font-bold text-slate-700">Ningún sistema seleccionado</p>
                  <p className="text-[11px] mt-0.5">Seleccione un sistema del catálogo a la izquierda.</p>
                </div>
              )}

              {/* FORMAT OPTIONS CHECKBOXES */}
              {activeSystem && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Elementos a incluir en el resultado:
                  </span>
                  
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeSystemName}
                      onChange={(e) => setIncludeSystemName(e.target.checked)}
                      className="w-4 h-4 text-slate-950 focus:ring-slate-950"
                    />
                    <span>Código y Nombre del Sistema</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeFeatures}
                      onChange={(e) => setIncludeFeatures(e.target.checked)}
                      className="w-4 h-4 text-slate-950 focus:ring-slate-950"
                    />
                    <span>Funcionalidades Clave</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer bg-slate-50 p-2 border border-slate-200 rounded-xs hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={includeStatus}
                      onChange={(e) => setIncludeStatus(e.target.checked)}
                      className="w-4 h-4 text-slate-950 focus:ring-slate-950"
                    />
                    <span>Estado del Soporte ([SOPORTADO])</span>
                  </label>
                </div>
              )}

              {/* RESULT TEXT PREVIEW */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                    Valor Resultado (Apoyo Tecnológico):
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Editable</span>
                </div>
                <textarea
                  rows={3}
                  value={customResultText}
                  onChange={(e) => setCustomResultText(e.target.value)}
                  placeholder="Seleccione un sistema o ingrese el texto deseado..."
                  className="w-full p-2.5 text-xs font-semibold bg-white border border-slate-300 text-slate-950 focus:outline-none focus:border-slate-950 rounded-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Este texto será asignado directamente al campo <strong>Apoyo Tecnológico</strong> de la ficha.
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
                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black rounded-xs flex items-center gap-1.5 shadow-md cursor-pointer"
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
