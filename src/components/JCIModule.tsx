import React, { useState, useEffect, useRef } from "react";
import { JCIStandard, ProcessDefinition } from "../types";
import { OFFICIAL_JCI_CATEGORIES, INITIAL_JCI_CATALOG } from "../data/jciCatalogPreset";
import { parseJCIDocumentFile, exportJCICatalogToWord } from "../lib/jciDocxParser";
import { jciMatchesQuery } from "../lib/jciUtils";
import {
  Award, Upload, Download, Plus, Search, Filter, Edit3, Trash2, CheckCircle2,
  AlertTriangle, Shield, Layers, FileText, RefreshCw, X, Check, ShieldCheck,
  ChevronRight, ChevronDown, Copy, BookOpen, Loader2, AlertCircle
} from "lucide-react";

interface JCIModuleProps {
  currentProcess?: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
  userRole?: string;
}

const STORAGE_KEY = "jci_catalog_state_v1";

export default function JCIModule({
  currentProcess,
  onProcessChange,
  userRole = "admin"
}: JCIModuleProps) {
  // Load state from localStorage or initialize with JCI preset
  const [jciCatalog, setJciCatalog] = useState<JCIStandard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading JCI catalog from local storage:", e);
    }
    return INITIAL_JCI_CATALOG;
  });

  // Filter & View States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Edit / Create Modal State
  const [editingStandard, setEditingStandard] = useState<JCIStandard | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [standardForm, setStandardForm] = useState<JCIStandard>({
    id: "",
    code: "",
    chapter: OFFICIAL_JCI_CATEGORIES[0].name,
    name: "",
    objective: "",
    measurableElements: [],
    supportStatus: "CUMPLIDO"
  });
  const [elementsInput, setElementsInput] = useState("");

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jciCatalog));
    } catch (e) {
      console.error("Error saving JCI catalog to localStorage:", e);
    }
  }, [jciCatalog]);

  // Statistics calculation
  const totalStandards = jciCatalog.length;
  const compliantCount = jciCatalog.filter((s) => s.supportStatus === "CUMPLIDO" || !s.supportStatus).length;
  const evalCount = jciCatalog.filter((s) => s.supportStatus === "EN_EVALUACION").length;
  const gapCount = jciCatalog.filter((s) => s.supportStatus === "BRECHA").length;

  // Filtered Standards
  const filteredStandards = jciCatalog.filter((std) => {
    const matchesSearch = jciMatchesQuery(std, searchTerm);
    const matchesChapter = selectedChapter === "ALL" || std.chapter.includes(selectedChapter) || std.code.startsWith(selectedChapter);
    const matchesStatus =
      selectedStatus === "ALL" ||
      std.supportStatus === selectedStatus ||
      (selectedStatus === "CUMPLIDO" && !std.supportStatus);

    return matchesSearch && matchesChapter && matchesStatus;
  });

  // Handle Document File Upload (.docx, .json, .txt)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const parsedStandards = await parseJCIDocumentFile(file);
      if (parsedStandards.length === 0) {
        setUploadStatus({
          success: false,
          message: "No se pudieron extraer estándares JCI estructurados. Verifique que el documento contenga códigos JCI válidos (ej. IPSG.1, ACC.1, AOP.2)."
        });
      } else {
        // Add newly parsed standards, avoiding exact code duplicates
        setJciCatalog((prev) => {
          const existingCodes = new Set(prev.map((s) => s.code.toUpperCase()));
          const newAdded = parsedStandards.filter((s) => !existingCodes.has(s.code.toUpperCase()));
          return [...prev, ...newAdded];
        });

        setUploadStatus({
          success: true,
          message: `¡Carga exitosa! Se procesaron e incorporaron ${parsedStandards.length} estándares JCI desde el archivo cargado.`
        });
      }
    } catch (err: any) {
      console.error("Error processing JCI file upload:", err);
      setUploadStatus({
        success: false,
        message: err.message || "Error al procesar el archivo. Asegúrese de que sea un formato Word (.docx), JSON o TXT válido."
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reset to Default Official JCI Catalog
  const handleResetToOfficialPreset = () => {
    if (window.confirm("¿Está seguro de restablecer el catálogo de Estándares JCI al predeterminado de la 7ma Edición? Se perderán las modificaciones locales no guardadas.")) {
      setJciCatalog(INITIAL_JCI_CATALOG);
      setUploadStatus({
        success: true,
        message: "Se ha restablecido el catálogo oficial de estándares de acreditación JCI 7ma Edición."
      });
    }
  };

  // Export Catalog to Word
  const handleExportWord = () => {
    exportJCICatalogToWord(jciCatalog);
  };

  // Handle Save (Create or Edit)
  const handleSaveStandard = (e: React.FormEvent) => {
    e.preventDefault();
    const elementsList = elementsInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const updatedStandard: JCIStandard = {
      ...standardForm,
      measurableElements: elementsList
    };

    if (isCreatingNew) {
      setJciCatalog((prev) => [updatedStandard, ...prev]);
      setUploadStatus({
        success: true,
        message: `¡Estándar ${updatedStandard.code} creado exitosamente!`
      });
    } else {
      setJciCatalog((prev) =>
        prev.map((item) => (item.id === updatedStandard.id ? updatedStandard : item))
      );
      setUploadStatus({
        success: true,
        message: `¡Estándar ${updatedStandard.code} actualizado correctamente!`
      });
    }

    setEditingStandard(null);
    setIsCreatingNew(false);
  };

  // Delete Standard
  const handleDeleteStandard = (id: string) => {
    if (confirm("¿Está seguro de eliminar este estándar del catálogo de acreditación JCI?")) {
      setJciCatalog((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* HIDDEN FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".docx,.doc,.json,.txt"
        className="hidden"
      />

      {/* HEADER DE MÓDULO JCI */}
      <div className="bg-slate-900 text-white p-6 shadow-md border border-slate-800 rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-500 text-white uppercase tracking-wider rounded-xs">
                Módulo Global
              </span>
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Estándares Internacionales de Calidad y Seguridad
              </span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
              <Award className="w-6 h-6 text-indigo-400 shrink-0" />
              <span>Acreditación JCI (Joint Commission International)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Catálogo institucional de estándares y metas internacionales de seguridad del paciente (IPSG) de la Joint Commission International.
              Permite gestionar el nivel de cumplimiento, cargar o exportar el documento normativo y vincular los atributos JCI directamente en las Fichas de Actividades del proceso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Subir archivo Word (.docx), JSON o TXT con estándares JCI"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Procesando archivo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-indigo-200" />
                  <span>Subir Archivo (.docx/.json)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Descargar el catálogo de Estándares JCI en formato Word (.doc)"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Exportar Word</span>
            </button>

            <button
              type="button"
              onClick={handleResetToOfficialPreset}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Restablecer al catálogo oficial de la 7ma Edición JCI"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restablecer</span>
            </button>

            <button
              onClick={() => {
                const newCode = `JCI.${jciCatalog.length + 1}`;
                setStandardForm({
                  id: newCode,
                  code: newCode,
                  chapter: OFFICIAL_JCI_CATEGORIES[0].name,
                  name: "",
                  objective: "",
                  measurableElements: [],
                  supportStatus: "CUMPLIDO"
                });
                setElementsInput("");
                setIsCreatingNew(true);
                setEditingStandard({
                  id: newCode,
                  code: newCode,
                  chapter: OFFICIAL_JCI_CATEGORIES[0].name,
                  name: "",
                  objective: "",
                  measurableElements: []
                });
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Estándar</span>
            </button>
          </div>
        </div>

        {/* METRICAS DE ESTÁNDARES JCI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/80 p-3 border border-slate-700/80 rounded-xs">
            <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Total Estándares JCI</span>
            <span className="text-lg font-black text-white">{totalStandards}</span>
          </div>

          <div className="bg-slate-800/80 p-3 border border-slate-700/80 rounded-xs">
            <span className="block text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Cumplidos / Vigentes</span>
            <span className="text-lg font-black text-emerald-300">{compliantCount}</span>
          </div>

          <div className="bg-slate-800/80 p-3 border border-slate-700/80 rounded-xs">
            <span className="block text-[10px] text-blue-400 font-mono uppercase tracking-wider">En Evaluación</span>
            <span className="text-lg font-black text-blue-300">{evalCount}</span>
          </div>

          <div className="bg-slate-800/80 p-3 border border-slate-700/80 rounded-xs">
            <span className="block text-[10px] text-amber-400 font-mono uppercase tracking-wider">Brecha / Pendientes</span>
            <span className="text-lg font-black text-amber-300">{gapCount}</span>
          </div>
        </div>
      </div>

      {/* CONTROLES DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ej. IPSG.1), nombre, capítulo o elemento medible..."
              className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-slate-950 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-950 cursor-pointer max-w-[220px] truncate"
            >
              <option value="ALL">Todos los Capítulos JCI</option>
              {OFFICIAL_JCI_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  [{cat.code}] {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-950 cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="CUMPLIDO">Cumplido / Vigente</option>
              <option value="EN_EVALUACION">En Evaluación</option>
              <option value="BRECHA">Brecha / Pendiente</option>
            </select>

            <div className="flex items-center border border-slate-300 bg-slate-50 p-0.5 rounded-xs">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                  viewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                  viewMode === "table" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tabla
              </button>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
          <span>Mostrando <strong>{filteredStandards.length}</strong> de {jciCatalog.length} estándares JCI</span>
          {searchTerm && <span className="font-mono text-slate-600">Filtro activo: "{searchTerm}"</span>}
        </div>
      </div>

      {/* RENDER VISTA TARJETAS O TABLA */}
      {filteredStandards.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No se encontraron estándares JCI</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No coinciden elementos con el filtro "{searchTerm}". Intente cambiar el término de búsqueda o seleccionar otro capítulo.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStandards.map((std) => (
            <div
              key={std.id}
              className="bg-white border border-slate-200 p-5 space-y-3 relative group hover:border-slate-400 transition-colors shadow-2xs"
            >
              <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs bg-indigo-950 text-white px-2 py-0.5 rounded-xs">
                    {std.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                    {std.chapter.split(" ")[0]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border ${
                    std.supportStatus === "CUMPLIDO" || !std.supportStatus
                      ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                      : std.supportStatus === "EN_EVALUACION"
                      ? "bg-blue-100 text-blue-950 border-blue-300"
                      : "bg-amber-100 text-amber-950 border-amber-300"
                  }`}>
                    {std.supportStatus === "CUMPLIDO" || !std.supportStatus
                      ? "Cumplido"
                      : std.supportStatus === "EN_EVALUACION"
                      ? "En Evaluación"
                      : "Brecha"}
                  </span>

                  <button
                    onClick={() => {
                      setIsCreatingNew(false);
                      setStandardForm(std);
                      setElementsInput((std.measurableElements || []).join("\n"));
                      setEditingStandard(std);
                    }}
                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xs cursor-pointer"
                    title="Editar Estándar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteStandard(std.id)}
                    className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer"
                    title="Eliminar Estándar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-sm leading-snug">{std.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 italic">{std.chapter}</p>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 border border-slate-100">
                {std.objective}
              </p>

              {std.measurableElements && std.measurableElements.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Elementos Medibles ({std.measurableElements.length}):
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {std.measurableElements.map((elem, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{elem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="p-3 w-24">Código</th>
                <th className="p-3 w-48">Capítulo</th>
                <th className="p-3">Nombre del Estándar JCI</th>
                <th className="p-3">Propósito / Requisitos</th>
                <th className="p-3 w-32">Estado</th>
                <th className="p-3 w-20 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStandards.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-extrabold text-slate-900">{std.code}</td>
                  <td className="p-3 font-semibold text-slate-700">{std.chapter}</td>
                  <td className="p-3 font-bold text-slate-900">{std.name}</td>
                  <td className="p-3 text-slate-600 leading-relaxed">{std.objective}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                      std.supportStatus === "CUMPLIDO" || !std.supportStatus
                        ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                        : std.supportStatus === "EN_EVALUACION"
                        ? "bg-blue-100 text-blue-950 border-blue-300"
                        : "bg-amber-100 text-amber-950 border-amber-300"
                    }`}>
                      {std.supportStatus === "CUMPLIDO" || !std.supportStatus
                        ? "Cumplido"
                        : std.supportStatus === "EN_EVALUACION"
                        ? "En Evaluación"
                        : "Brecha"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setIsCreatingNew(false);
                          setStandardForm(std);
                          setElementsInput((std.measurableElements || []).join("\n"));
                          setEditingStandard(std);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStandard(std.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR / EDITAR ESTÁNDAR JCI */}
      {editingStandard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                {isCreatingNew ? "Nuevo Estándar JCI" : `Editar Estándar ${standardForm.code}`}
              </h3>
              <button onClick={() => setEditingStandard(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStandard} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Código Estándar JCI</label>
                  <input
                    type="text"
                    required
                    value={standardForm.code}
                    onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })}
                    placeholder="Ej. IPSG.1, ACC.2, MMU.4"
                    className="w-full px-3 py-2 border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Estado de Cumplimiento</label>
                  <select
                    value={standardForm.supportStatus || "CUMPLIDO"}
                    onChange={(e) => setStandardForm({ ...standardForm, supportStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-950"
                  >
                    <option value="CUMPLIDO">Cumplido / Vigente</option>
                    <option value="EN_EVALUACION">En Evaluación</option>
                    <option value="BRECHA">Brecha / Pendiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Capítulo de Acreditación JCI</label>
                <select
                  value={standardForm.chapter}
                  onChange={(e) => setStandardForm({ ...standardForm, chapter: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-slate-950"
                >
                  {OFFICIAL_JCI_CATEGORIES.map((cat) => (
                    <option key={cat.code} value={cat.name}>
                      [{cat.code}] {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nombre / Título del Estándar</label>
                <input
                  type="text"
                  required
                  value={standardForm.name}
                  onChange={(e) => setStandardForm({ ...standardForm, name: e.target.value })}
                  placeholder="Ej. Identificación Correcta de Pacientes"
                  className="w-full px-3 py-2 border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Propósito / Declaración del Estándar</label>
                <textarea
                  rows={3}
                  required
                  value={standardForm.objective}
                  onChange={(e) => setStandardForm({ ...standardForm, objective: e.target.value })}
                  placeholder="Descripción detallada del propósito y requerimientos de calidad JCI."
                  className="w-full px-3 py-2 border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Elementos Medibles (Un elemento por línea)
                </label>
                <textarea
                  rows={4}
                  value={elementsInput}
                  onChange={(e) => setElementsInput(e.target.value)}
                  placeholder="Ej.&#10;Identificación con dos identificadores únicos&#10;Verificación previa a administración de fármacos&#10;Uso de pulsera estandarizada"
                  className="w-full px-3 py-2 border border-slate-300 font-mono text-[11px] text-slate-800 focus:outline-none focus:border-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStandard(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Guardar Estándar JCI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
