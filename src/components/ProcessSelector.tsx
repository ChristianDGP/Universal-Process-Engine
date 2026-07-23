import React, { useState, useEffect, useRef } from "react";
import { ProcessDefinition } from "../types";
import { PRESETS, BLANK_PROCESS_PRESET } from "../presets";
import { Sparkles, Loader2, BookmarkPlus, Library, Trash2, Download, Upload, Check, X, BookOpen, FileText, RotateCcw, Search, ChevronDown } from "lucide-react";

interface SavedProcessEntry {
  id: string;
  savedAt: string;
  process: ProcessDefinition;
}

interface ProcessSelectorProps {
  currentProcess: ProcessDefinition;
  onProcessSelect: (process: ProcessDefinition) => void;
  onProcessUpdate?: (process: ProcessDefinition) => void;
}

export default function ProcessSelector({ currentProcess, onProcessSelect }: ProcessSelectorProps) {
  const [customName, setCustomName] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [wordParsing, setWordParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library modal & state
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedProcesses, setSavedProcesses] = useState<SavedProcessEntry[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load saved processes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("upe_saved_processes_v1");
      if (stored) {
        setSavedProcesses(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading library from localStorage:", err);
    }
  }, []);

  // Save current process into library
  const handleSaveToLibrary = () => {
    try {
      const newEntry: SavedProcessEntry = {
        id: `proc_${Date.now()}`,
        savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
        process: JSON.parse(JSON.stringify(currentProcess))
      };
      const updated = [newEntry, ...savedProcesses.filter(p => p.process.name !== currentProcess.name)];
      setSavedProcesses(updated);
      localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));
      
      setSaveSuccessMsg(`¡Proceso "${currentProcess.name}" guardado exitosamente en la librería!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar en el almacenamiento local.");
    }
  };

  // Delete from library
  const handleDeleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Deseas eliminar este diseño guardado de la librería?")) return;
    const updated = savedProcesses.filter(p => p.id !== id);
    setSavedProcesses(updated);
    localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));
  };

  // Export JSON file
  const handleExportJSON = (proc: ProcessDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proc, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${proc.name.replace(/\s+/g, "_")}_TO_BE.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Word document (.docx)
  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWordParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const response = await fetch("/api/parse-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64Docx: base64Data, fileData: base64Data, fileName: file.name })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Error al procesar el archivo Word.");
          }

          const parsedProcess: ProcessDefinition = await response.json();
          onProcessSelect(parsedProcess);

          // Automatically save to library
          const newEntry: SavedProcessEntry = {
            id: `proc_${Date.now()}`,
            savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
            process: JSON.parse(JSON.stringify(parsedProcess))
          };
          const updated = [newEntry, ...savedProcesses.filter(p => p.process.name !== parsedProcess.name)];
          setSavedProcesses(updated);
          localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));

          setSaveSuccessMsg(`¡Informe Word "${file.name}" importado e incorporado a la librería exitosamente!`);
          setTimeout(() => setSaveSuccessMsg(null), 5000);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Error al interpretar la estructura del documento Word.");
        } finally {
          setWordParsing(false);
          e.target.value = "";
        }
      };
    } catch (err: any) {
      console.error(err);
      setError("No se pudo leer el archivo seleccionado.");
      setWordParsing(false);
    }
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.name && parsed.subprocesses) {
            onProcessSelect(parsed);
            alert(`Proceso "${parsed.name}" importado y cargado en el área de trabajo.`);
          } else {
            alert("El archivo JSON no tiene una estructura válida de ProcessDefinition.");
          }
        } catch (err) {
          alert("Error al leer el archivo JSON.");
        }
      };
    }
  };

  const loadingMessages = [
    "Analizando el flujo operativo del negocio...",
    "Estructurando Definiciones y Glosario Técnico...",
    "Estableciendo FCE (Factores Críticos de Éxito) y Fórmulas de KPIs...",
    "Generando SIPOC y Mapeo de Subprocesos...",
    "Modelando Sección 4: Fichas de Actividad Operativa (4.X.Y en Tiempos Presentes)...",
    "Validando Apoyo Tecnológico e Insumos Físicos...",
    "Generando Matriz de Transición de Estados y SLAs...",
    "Finalizando Arquitectura de Base de Datos y Código de Negocio..."
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customContext.trim()) {
      setError("Debe ingresar tanto el Nombre del Proceso como el Contexto o Alcance Operativo para poder generar el modelo TO-BE.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2800);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processName: customName,
          descriptionContext: customContext
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al generar el proceso");
      }

      const generatedProcess: ProcessDefinition = await response.json();
      onProcessSelect(generatedProcess);
      setCustomName("");
      setCustomContext("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo conectar con el servidor de IA.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Searchable Combobox State
  const [comboboxQuery, setComboboxQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const isBlankProcess = (name?: string) => {
    return !name || name === BLANK_PROCESS_PRESET.name || name === "Proceso Sin Definir (En Blanco)";
  };

  // Sync input value with currentProcess.name
  useEffect(() => {
    if (isBlankProcess(currentProcess.name)) {
      setComboboxQuery("");
    } else {
      setComboboxQuery(currentProcess.name);
    }
  }, [currentProcess.name]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
        // Restore current process name if left mismatched or empty
        if (!comboboxQuery.trim()) {
          handleClearToBlank();
        } else if (!isBlankProcess(currentProcess.name)) {
          setComboboxQuery(currentProcess.name);
        } else {
          setComboboxQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentProcess.name, comboboxQuery]);

  // Clear or reset to Blank process
  const handleClearToBlank = () => {
    onProcessSelect(BLANK_PROCESS_PRESET);
    setComboboxQuery("");
    setCustomName("");
    setCustomContext("");
    setError(null);
    setIsComboboxOpen(false);
  };

  const handleSelectOption = (proc: ProcessDefinition) => {
    onProcessSelect(proc);
    if (isBlankProcess(proc.name)) {
      setComboboxQuery("");
    } else {
      setComboboxQuery(proc.name);
    }
    setIsComboboxOpen(false);
  };

  // Filter options based on user typing
  const cleanQuery = comboboxQuery.toLowerCase().trim();

  const filteredSaved = savedProcesses.filter((entry) =>
    entry.process.name.toLowerCase().includes(cleanQuery)
  );

  const isCustomCurrent =
    !isBlankProcess(currentProcess.name) &&
    !savedProcesses.some((p) => p.process.name === currentProcess.name) &&
    currentProcess.name.toLowerCase().includes(cleanQuery);

  const showBlankOption =
    cleanQuery === "" ||
    "blanco".includes(cleanQuery) ||
    "sin definir".includes(cleanQuery);

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-6 mb-8">
      {/* Header bar with Searchable Combobox */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1 max-w-xl space-y-1.5" ref={comboboxRef}>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="process-search-input" className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-700" />
              Diseño de Proceso Activo
            </label>

            <button
              type="button"
              onClick={handleClearToBlank}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Limpiar y volver a estado en blanco"
            >
              <RotateCcw className="w-3 h-3 text-slate-600" />
              Limpiar (Quedar en Blanco)
            </button>
          </div>

          {/* Searchable Combobox Input & Dropdown */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="process-search-input"
                type="text"
                value={comboboxQuery}
                onFocus={() => setIsComboboxOpen(true)}
                onChange={(e) => {
                  setComboboxQuery(e.target.value);
                  setIsComboboxOpen(true);
                }}
                placeholder="Escriba para buscar o seleccione un proceso..."
                className="w-full bg-slate-50 border-2 border-slate-900 text-slate-900 font-bold text-sm pl-9 pr-16 py-2.5 focus:outline-none focus:bg-white shadow-sm transition-all"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {comboboxQuery && comboboxQuery !== BLANK_PROCESS_PRESET.name && (
                  <button
                    type="button"
                    onClick={handleClearToBlank}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                  className="p-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronDown className={`w-4 h-4 transform transition-transform ${isComboboxOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Floating Dropdown List */}
            {isComboboxOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-slate-900 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 font-sans">
                {/* Option: Blank / Sin Definir */}
                {showBlankOption && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(BLANK_PROCESS_PRESET)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      isBlankProcess(currentProcess.name)
                        ? "bg-slate-100 text-slate-900 font-black"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      -- Proceso en Blanco (Sin Definir) --
                    </span>
                    {isBlankProcess(currentProcess.name) && (
                      <Check className="w-3.5 h-3.5 text-slate-900" />
                    )}
                  </button>
                )}

                {/* Option Group: Librería de Procesos Guardados */}
                {filteredSaved.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 border-y border-slate-100">
                      📦 Librería de Procesos Guardados
                    </div>
                    {filteredSaved.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectOption(entry.process)}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          currentProcess.name === entry.process.name
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{entry.process.name}</span>
                        {currentProcess.name === entry.process.name && (
                          <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Option Group: Custom / Current Process */}
                {isCustomCurrent && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 border-y border-slate-100">
                      ✨ Proceso Activo
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(currentProcess)}
                      className="w-full text-left px-4 py-2 text-xs font-bold bg-slate-100 text-slate-900 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{currentProcess.name}</span>
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                    </button>
                  </div>
                )}

                {/* No results state */}
                {!showBlankOption && filteredSaved.length === 0 && !isCustomCurrent && (
                  <div className="p-4 text-center text-xs text-slate-500 font-medium">
                    No se encontraron coincidencias para &quot;{comboboxQuery}&quot;.
                    <button
                      type="button"
                      onClick={handleClearToBlank}
                      className="block mx-auto mt-2 text-slate-900 font-bold underline hover:text-slate-700"
                    >
                      Volver a Proceso en Blanco
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
          {/* Action buttons: Save & Library */}
          <button
            onClick={handleSaveToLibrary}
            className="px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Guardar diseño de proceso actual en tu librería local"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Guardar Diseño
          </button>

          <button
            onClick={() => setShowLibrary(true)}
            className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1.5 relative cursor-pointer"
          >
            <Library className="w-3.5 h-3.5 text-slate-600" />
            Librería ({savedProcesses.length})
          </button>

          <label className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors flex items-center gap-1.5" title="Importar informe en Word (.docx) e incorporarlo a la librería">
            {wordParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" /> : <FileText className="w-3.5 h-3.5 text-blue-700" />}
            {wordParsing ? "Interpretando Word..." : "Importar Word (.docx)"}
            <input type="file" accept=".docx,.doc" onChange={handleImportWord} disabled={wordParsing} className="hidden" />
          </label>

          <label className="px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            Importar JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      <div className="border-t border-slate-100 my-5"></div>

      {/* Generator Form */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
              Modelar Nuevo Proceso
              <span className="text-rose-600 font-bold ml-1">*</span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej. Compras Públicas, Onboarding de Personal, Triage Dental, Licitaciones..."
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-shadow bg-slate-50/50"
            />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
              Contexto o Alcance Operativo (Obligatorio)
              <span className="text-rose-600 font-bold ml-1">*</span>
            </label>
            <input
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="Ej. Inicia con la orden de pedido del área usuaria y finaliza con la firma del contrato digital por la dirección."
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-shadow bg-slate-50/50"
            />
          </div>
          <div className="md:self-end">
            <button
              type="submit"
              disabled={loading || !customName.trim() || !customContext.trim()}
              className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              )}
              Generar Proceso TO-BE
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-slate-50 border border-slate-100 p-4 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
            <div className="text-xs text-slate-600 font-medium">
              <span className="text-slate-900 font-semibold mr-1">Paso {loadingStep + 1} de {loadingMessages.length}:</span>
              {loadingMessages[loadingStep]}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </form>

      {/* LIBRARY MODAL */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-scaleUp">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Library className="w-5 h-5 text-slate-700" />
                  Librería de Diseños de Procesos Guardados
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona y carga cualquier diseño de proceso previamente guardado en este equipo.
                </p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {savedProcesses.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BookmarkPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No hay procesos guardados en tu librería aún.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Puedes diseñar o modelar un proceso y hacer clic en el botón <strong className="text-slate-600">"Guardar Diseño"</strong> para almacenarlo aquí.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {savedProcesses.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onProcessSelect(item.process);
                        setShowLibrary(false);
                      }}
                      className={`p-4 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        currentProcess.name === item.process.name
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50/60 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{item.process.name}</h4>
                          {currentProcess.name === item.process.name && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500 text-white">
                              Activo
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 line-clamp-1 ${currentProcess.name === item.process.name ? "text-slate-300" : "text-slate-500"}`}>
                          {item.process.description}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] mt-2 opacity-75 font-mono">
                          <span>Subprocesos: {item.process.subprocesses.length}</span>
                          <span>&bull;</span>
                          <span>Guardado: {item.savedAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={(e) => handleExportJSON(item.process, e)}
                          className={`p-2 text-xs font-medium border transition-colors flex items-center gap-1 ${
                            currentProcess.name === item.process.name
                              ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          title="Descargar JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFromLibrary(item.id, e)}
                          className="p-2 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                          title="Eliminar de librería"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span>{savedProcesses.length} procesos guardados en almacenamiento local</span>
              <button
                onClick={() => setShowLibrary(false)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

