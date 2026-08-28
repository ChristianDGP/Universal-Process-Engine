import React, { useState, useEffect, useRef } from "react";
import { SIHSystem, ProcessDefinition } from "../types";
import { OFFICIAL_SIH_CATEGORIES, INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";
import { parseSIHDocumentFile, exportSIHCatalogToWord } from "../lib/docxParser";
import { systemMatchesQuery, getActiveSihCatalog, saveActiveSihCatalog, SIH_STORAGE_KEY } from "../lib/sihUtils";
import {
  Server, Upload, Download, Plus, Search, Filter, Edit3, Trash2, CheckCircle2,
  AlertTriangle, Shield, Layers, FileText, RefreshCw, X, Check, Cpu, Link2,
  ExternalLink, Sparkles, BookOpen, AlertCircle, HelpCircle, ChevronRight,
  ChevronDown, Copy
} from "lucide-react";

interface SIHModuleProps {
  currentProcess?: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
  userRole?: string;
}

export default function SIHModule({
  currentProcess,
  onProcessChange,
  userRole = "admin"
}: SIHModuleProps) {
  // Load state from getActiveSihCatalog (handles automatic version upgrades & preserves 14 features for 1.4.4)
  const [sihCatalog, setSihCatalog] = useState<SIHSystem[]>(() => getActiveSihCatalog());

  // Filter & View States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "matrix" | "table">("cards");
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Edit / Create Modal State
  const [editingSystem, setEditingSystem] = useState<SIHSystem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save changes to LocalStorage
  useEffect(() => {
    saveActiveSihCatalog(sihCatalog);
  }, [sihCatalog]);

  // Statistics calculation
  const totalSystems = sihCatalog.length;
  const supportedCount = sihCatalog.filter((s) => s.supportStatus === "SOPORTADO" || !s.supportStatus).length;
  const inProgressCount = sihCatalog.filter((s) => s.supportStatus === "EN_IMPLEMENTACION").length;
  const gapCount = sihCatalog.filter((s) => s.supportStatus === "BRECHA" || s.supportStatus === "REQUERIDO").length;

  // Filtered Systems
  const filteredSystems = sihCatalog.filter((sys) => {
    const matchesSearch = systemMatchesQuery(sys, searchTerm);

    const matchesArea = selectedArea === "ALL" || sys.area === selectedArea;
    const matchesStatus =
      selectedStatus === "ALL" ||
      sys.supportStatus === selectedStatus ||
      (selectedStatus === "SOPORTADO" && !sys.supportStatus);

    return matchesSearch && matchesArea && matchesStatus;
  });

  // Handle Word/DOCX File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const parsedSystems = await parseSIHDocumentFile(file);
      if (parsedSystems.length === 0) {
        setUploadStatus({
          success: false,
          message: "No se pudieron extraer sistemas estructurados. Verifique que el documento contenga la estructura del Anexo de TI SSMSO."
        });
      } else {
        // Merge or replace catalog
        setSihCatalog((prev) => {
          // Add newly parsed systems, avoiding exact code duplicates or appending
          const existingCodes = new Set(prev.map((s) => s.code));
          const newAdded = parsedSystems.filter((s) => !existingCodes.has(s.code));
          return [...prev, ...newAdded];
        });

        setUploadStatus({
          success: true,
          message: `¡Carga exitosa! Se procesaron ${parsedSystems.length} sistemas de información desde el documento Word/texto.`
        });
      }
    } catch (err: any) {
      console.error("Error processing file upload:", err);
      setUploadStatus({
        success: false,
        message: err.message || "Error al procesar el archivo Word. Asegúrese de que sea formato .docx."
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reset to SSMSO Default Catalog
  const handleResetToOfficialPreset = () => {
    if (window.confirm("¿Está seguro de restablecer el catálogo al Anexo Oficial SSMSO Mayo 2025? Se perderán las modificaciones locales no guardadas.")) {
      setSihCatalog(INITIAL_SIH_CATALOG);
      setUploadStatus({
        success: true,
        message: "Se ha restablecido el catálogo completo con los 50+ sistemas del Anexo Oficial SSMSO Mayo 2025."
      });
    }
  };

  // Delete System
  const handleDeleteSystem = (id: string) => {
    if (window.confirm("¿Desea eliminar este sistema del catálogo SIH?")) {
      setSihCatalog((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Save System (Edit or Create)
  const handleSaveSystem = (updated: SIHSystem) => {
    setSihCatalog((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      } else {
        return [updated, ...prev];
      }
    });
    setEditingSystem(null);
    setIsCreatingNew(false);
  };

  // Group filtered systems by Area
  const groupedByArea: Record<string, SIHSystem[]> = {};
  filteredSystems.forEach((sys) => {
    const areaName = sys.area || "Otras Áreas";
    if (!groupedByArea[areaName]) groupedByArea[areaName] = [];
    groupedByArea[areaName].push(sys);
  });

  // Extract list of all process activities for mapping
  const allProcessActivities = currentProcess
    ? currentProcess.subprocesses.flatMap((sub) =>
        sub.activities.map((act) => ({
          index: act.index,
          name: act.name,
          subprocessName: sub.name,
          currentTech: act.supportTech
        }))
      )
    : [];

  return (
    <div className="space-y-6 text-slate-900">
      {/* MODULE HEADER BANNER */}
      <div className="bg-slate-900 text-white p-6 shadow-md border-b-4 border-amber-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              Anexo TI &bull; SSMSO Mayo 2025
            </span>
            <span className="text-xs font-mono text-slate-400">Módulo SIH v2.0</span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1 flex items-center gap-2.5">
            <Server className="w-6 h-6 text-amber-400" />
            Catálogo de Sistemas de Información Hospitalarios (SIH)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Identificación y mantenimiento del apoyo tecnológico: características, objetivos, funcionalidades y reglas de interoperabilidad según la estructura oficial del Capítulo de TI.
          </p>
        </div>

        {/* TOP TOOLBAR ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".docx,.doc,.txt,.json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Cargar archivo Word (.docx) o JSON con especificación de sistemas"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? "Procesando..." : "Cargar Archivo Word"}</span>
          </button>

          <button
            onClick={() => exportSIHCatalogToWord(sihCatalog)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Exportar catálogo mantenido a documento Word (.doc)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar a Word</span>
          </button>

          {userRole === "admin" && (
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setEditingSystem({
                  id: `SIH-NEW-${Date.now()}`,
                  code: "1.1.18",
                  area: OFFICIAL_SIH_CATEGORIES[0].name,
                  name: "",
                  objective: "",
                  features: [""],
                  integrations: [""],
                  supportStatus: "SOPORTADO"
                });
              }}
              className="px-3.5 py-2 bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>Nuevo Sistema</span>
            </button>
          )}

          <button
            onClick={handleResetToOfficialPreset}
            className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            title="Restablecer al Anexo Oficial SSMSO (Mayo 2025)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* UPLOAD ALERT STATUS */}
      {uploadStatus && (
        <div className={`p-4 text-xs font-bold flex items-center justify-between border ${
          uploadStatus.success ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-rose-50 text-rose-900 border-rose-300"
        }`}>
          <div className="flex items-center gap-2">
            {uploadStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{uploadStatus.message}</span>
          </div>
          <button onClick={() => setUploadStatus(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Sistemas SIH
            </span>
            <span className="text-2xl font-black text-slate-950 mt-0.5 block">{totalSystems}</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Registrados en Catálogo</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-800">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Soportados / Operativos
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-0.5 block">{supportedCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
              {Math.round((supportedCount / Math.max(totalSystems, 1)) * 100)}% Cobertura
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              En Implementación
            </span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">{inProgressCount}</span>
            <span className="text-[10px] text-amber-600 font-bold mt-1 block">En proceso de despliegue</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
              Brechas Tecnológicas
            </span>
            <span className="text-2xl font-black text-rose-700 mt-0.5 block">{gapCount}</span>
            <span className="text-[10px] text-rose-600 font-bold mt-1 block">Requeridos / Por Adquirir</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ej. 1.1.1), nombre, objetivo, funcionalidad o ley (ej. Norma 820)..."
              className="w-full bg-white border border-slate-300 pl-9 pr-8 py-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-slate-950 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-slate-950 focus:outline-none max-w-[240px] truncate"
            >
              <option value="ALL">Todas las Áreas (6)</option>
              {OFFICIAL_SIH_CATEGORIES.map((cat) => (
                <option key={cat.code} value={cat.name}>
                  {cat.code} {cat.name}
                </option>
              ))}
            </select>

            {/* Support Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-slate-950 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="SOPORTADO">Soportado / Operativo</option>
              <option value="EN_IMPLEMENTACION">En Implementación</option>
              <option value="BRECHA">Brecha Tecnológica</option>
              <option value="REQUERIDO">Requerido / Por Adquirir</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex border border-slate-300 bg-white p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewMode === "cards" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Vista de Fichas Estructuradas por Área"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Fichas</span>
              </button>

              <button
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewMode === "matrix" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Vista Matriz de Apoyo Tecnológico SIH vs Proceso Activo"
              >
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Matriz Proceso</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER VIEW: MATRIX OF SIH VS PROCESS ACTIVITIES */}
      {viewMode === "matrix" && (
        <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                Matriz de Mapeo: Apoyo Tecnológico SIH vs Actividades del Proceso ({currentProcess?.name || "Proceso Activo"})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Identificación directa de qué sistema SIH da soporte a cada ficha de actividad (Secuencia 4.X.N) del proceso actual.
              </p>
            </div>
          </div>

          {!allProcessActivities || allProcessActivities.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 text-xs">
              No hay actividades de proceso configuradas en la pestaña "1. Documentación". Cargue o cree un proceso para visualizar el mapeo interactivo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                    <th className="p-3 border border-slate-800 w-24">Actividad</th>
                    <th className="p-3 border border-slate-800">Nombre de la Ficha</th>
                    <th className="p-3 border border-slate-800">Subproceso</th>
                    <th className="p-3 border border-slate-800">Sistema SIH Recomendado / Vinculado</th>
                    <th className="p-3 border border-slate-800 w-36">Estado Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {allProcessActivities.map((act) => {
                    // Find matching SIH system linked or matching name
                    const linkedSih = sihCatalog.find(
                      (s) =>
                        s.linkedProcessActivities?.includes(act.index) ||
                        act.currentTech.toLowerCase().includes(s.name.toLowerCase()) ||
                        s.name.toLowerCase().includes(act.name.toLowerCase().split(" ")[0])
                    );

                    return (
                      <tr key={act.index} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-950 border border-slate-200 bg-slate-50">
                          {act.index}
                        </td>
                        <td className="p-3 border border-slate-200 font-bold text-slate-900">
                          {act.name}
                        </td>
                        <td className="p-3 border border-slate-200 text-slate-600 text-[11px]">
                          {act.subprocessName}
                        </td>
                        <td className="p-3 border border-slate-200">
                          {linkedSih ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px]">
                                {linkedSih.code}
                              </span>
                              <span className="font-bold text-slate-900">{linkedSih.name}</span>
                              <span className="text-[10px] text-slate-500">({linkedSih.area})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] italic">
                              Soporte: {act.currentTech || "Sin SIH asociado"}
                            </span>
                          )}
                        </td>
                        <td className="p-3 border border-slate-200">
                          {linkedSih ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1 ${
                              linkedSih.supportStatus === "SOPORTADO" || !linkedSih.supportStatus
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : linkedSih.supportStatus === "EN_IMPLEMENTACION"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-rose-100 text-rose-900 border border-rose-300"
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {linkedSih.supportStatus || "SOPORTADO"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              NO VINCULADO
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW: CARDS & FICHAS BY AREA (DEFAULT) */}
      {viewMode === "cards" && (
        <div className="space-y-8">
          {Object.keys(groupedByArea).length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 text-slate-500 space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No se encontraron sistemas de información</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hay sistemas SIH que coincidan con la búsqueda "{searchTerm}". Intente limpiar los filtros o agregar un nuevo sistema.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedArea("ALL");
                  setSelectedStatus("ALL");
                }}
                className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            Object.entries(groupedByArea).map(([areaName, systems]) => (
              <div key={areaName} className="space-y-4">
                {/* AREA GROUP HEADER */}
                <div className="bg-slate-900 text-white px-5 py-3 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h3 className="font-black text-xs uppercase tracking-wider">
                      {areaName}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-amber-300 px-2.5 py-0.5 border border-slate-700">
                    {systems.length} {systems.length === 1 ? "SISTEMA" : "SISTEMAS"}
                  </span>
                </div>

                {/* SYSTEMS CARDS GRID */}
                <div className="grid grid-cols-1 gap-6">
                  {systems.map((sys) => (
                    <div
                      key={sys.id}
                      className="bg-white border border-slate-300 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden"
                    >
                      {/* SYSTEM HEADER ROW */}
                      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs shrink-0">
                            {sys.code}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
                              <span>{sys.name}</span>
                              {sys.providerVendor && (
                                <span className="text-[10px] font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 font-bold">
                                  {sys.providerVendor}
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {sys.area}
                            </p>
                          </div>
                        </div>

                        {/* STATUS BADGE & ACTIONS */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 border ${
                            sys.supportStatus === "EN_IMPLEMENTACION"
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : sys.supportStatus === "BRECHA" || sys.supportStatus === "REQUERIDO"
                              ? "bg-rose-50 text-rose-900 border-rose-300"
                              : "bg-emerald-50 text-emerald-900 border-emerald-300"
                          }`}>
                            {sys.supportStatus === "EN_IMPLEMENTACION" ? (
                              <Cpu className="w-3.5 h-3.5 text-amber-600" />
                            ) : sys.supportStatus === "BRECHA" ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{sys.supportStatus || "SOPORTADO"}</span>
                          </span>

                          {userRole === "admin" && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                              <button
                                onClick={() => setEditingSystem(sys)}
                                className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Editar Sistema SIH"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSystem(sys.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar del Catálogo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* STRUCTURED TABLE CONTENT (MATCHING OCR DOCUMENT SCHEMA) */}
                      <div className="p-5 space-y-4">
                        {/* OBJECTIVE */}
                        <div>
                          <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Objetivo del Sistema
                          </span>
                          <p className="text-xs text-slate-900 leading-relaxed font-normal bg-slate-50/70 border border-slate-200/80 p-3">
                            {sys.objective}
                          </p>
                        </div>

                        {/* RELEVANT FEATURES */}
                        <div>
                          <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Funcionalidades ({sys.features.length})</span>
                          </span>
                          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800 bg-white border border-slate-200 p-3.5">
                            {sys.features.map((feat, idx) => (
                              <li key={idx} className="leading-relaxed pl-1 font-medium">
                                <span className="text-slate-900">{feat}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* INTEROPERABILITY & INTEGRATIONS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div>
                            <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Interoperabilidad / Integraciones ({sys.integrations.length})
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3">
                              {sys.integrations.map((integ, idx) => (
                                <li key={idx} className="text-slate-800 font-medium">
                                  {integ}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* LEGAL CONSIDERATIONS / NORMAS */}
                          <div>
                            <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-amber-600" />
                              Consideraciones Legales / Normativas
                            </span>
                            <div className="bg-amber-50/50 border border-amber-200 p-3 text-xs text-amber-950 font-medium leading-relaxed min-h-[60px]">
                              {sys.legalConsiderations || "Conforme a regulaciones estándar de salud digital (Ley 20.584, Ley 19.628)."}
                            </div>
                          </div>
                        </div>

                        {/* LINKED PROCESS ACTIVITIES */}
                        {sys.linkedProcessActivities && sys.linkedProcessActivities.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-700 uppercase text-[10px]">Actividades del Proceso Soportadas:</span>
                            <div className="flex flex-wrap gap-1">
                              {sys.linkedProcessActivities.map((actIdx) => (
                                <span key={actIdx} className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 font-mono font-bold text-[10px]">
                                  Ficha {actIdx}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT / CREATE SYSTEM MODAL */}
      {(editingSystem || isCreatingNew) && (
        <SIHEditorModal
          system={editingSystem!}
          isCreating={isCreatingNew}
          allProcessActivities={allProcessActivities}
          onSave={handleSaveSystem}
          onClose={() => {
            setEditingSystem(null);
            setIsCreatingNew(false);
          }}
        />
      )}
    </div>
  );
}

// EDITOR MODAL COMPONENT
interface SIHEditorModalProps {
  system: SIHSystem;
  isCreating: boolean;
  allProcessActivities: Array<{ index: string; name: string }>;
  onSave: (updated: SIHSystem) => void;
  onClose: () => void;
}

function SIHEditorModal({
  system,
  isCreating,
  allProcessActivities,
  onSave,
  onClose
}: SIHEditorModalProps) {
  const [formData, setFormData] = useState<SIHSystem>({ ...system });

  // Handle Feature item change
  const handleFeatureChange = (index: number, value: string) => {
    const updated = [...formData.features];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, features: updated }));
  };

  const handleAddFeature = () => {
    setFormData((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Handle Integration item change
  const handleIntegrationChange = (index: number, value: string) => {
    const updated = [...formData.integrations];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, integrations: updated }));
  };

  const handleAddIntegration = () => {
    setFormData((prev) => ({ ...prev, integrations: [...prev.integrations, ""] }));
  };

  const handleRemoveIntegration = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      integrations: prev.integrations.filter((_, i) => i !== index)
    }));
  };

  // Handle Linked Process Activity Toggle
  const toggleLinkedActivity = (actIndex: string) => {
    const current = formData.linkedProcessActivities || [];
    const exists = current.includes(actIndex);
    const updated = exists ? current.filter((a) => a !== actIndex) : [...current, actIndex];
    setFormData((prev) => ({ ...prev, linkedProcessActivities: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Por favor ingrese el nombre del sistema de información.");
      return;
    }
    // Clean empty features/integrations
    const cleanedFeatures = formData.features.filter((f) => f.trim().length > 0);
    const cleanedIntegrations = formData.integrations.filter((i) => i.trim().length > 0);

    onSave({
      ...formData,
      features: cleanedFeatures.length > 0 ? cleanedFeatures : ["Funcionalidad general del sistema."],
      integrations: cleanedIntegrations.length > 0 ? cleanedIntegrations : ["Maestro de pacientes"]
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col my-auto text-slate-900">
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-tight">
                {isCreating ? "Registrar Nuevo Sistema SIH" : `Editar Sistema SIH: ${formData.code}`}
              </h3>
              <p className="text-xs text-slate-400">
                Estructura normalizada según el Anexo de Tecnologías de Información SSMSO
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* CODE, AREA & STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Código / ID (ej. 1.1.1)
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full border border-slate-300 p-2 font-mono text-xs font-bold text-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Área / Categoría SIH
              </label>
              <select
                value={formData.area}
                onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                className="w-full border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none"
              >
                {OFFICIAL_SIH_CATEGORIES.map((cat) => (
                  <option key={cat.code} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Estado de Apoyo Tecnológico
              </label>
              <select
                value={formData.supportStatus || "SOPORTADO"}
                onChange={(e) => setFormData((prev) => ({ ...prev, supportStatus: e.target.value as any }))}
                className="w-full border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none"
              >
                <option value="SOPORTADO">SOPORTADO / OPERATIVO</option>
                <option value="EN_IMPLEMENTACION">EN IMPLEMENTACIÓN</option>
                <option value="BRECHA">BRECHA TECNOLÓGICA</option>
                <option value="REQUERIDO">REQUERIDO / POR ADQUIRIR</option>
              </select>
            </div>
          </div>

          {/* SYSTEM NAME & PROVIDER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Nombre del Sistema de Información
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ej. Maestro de pacientes, Ficha Clínica electrónica"
                className="w-full border border-slate-300 p-2 text-xs font-bold text-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Proveedor / Software (Opcional)
              </label>
              <input
                type="text"
                value={formData.providerVendor || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, providerVendor: e.target.value }))}
                placeholder="ej. SIDRA / Rayen / ERP / Q-Flow"
                className="w-full border border-slate-300 p-2 text-xs text-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none"
              />
            </div>
          </div>

          {/* OBJECTIVE */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Objetivo del Sistema
            </label>
            <textarea
              rows={3}
              required
              value={formData.objective}
              onChange={(e) => setFormData((prev) => ({ ...prev, objective: e.target.value }))}
              placeholder="Describa el alcance y propósito del sistema de información..."
              className="w-full border border-slate-300 p-2.5 text-xs text-slate-900 leading-relaxed focus:ring-1 focus:ring-slate-950 focus:outline-none"
            />
          </div>

          {/* RELEVANT FEATURES LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Funcionalidades
              </label>
              <button
                type="button"
                onClick={handleAddFeature}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Funcionalidad
              </button>
            </div>

            <div className="space-y-2">
              {formData.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 w-6 shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => handleFeatureChange(idx, e.target.value)}
                    placeholder="Descripción de la funcionalidad..."
                    className="flex-1 border border-slate-300 p-2 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* INTEGRATIONS & INTEROPERABILITY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Interoperabilidad e Integraciones
              </label>
              <button
                type="button"
                onClick={handleAddIntegration}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Integración
              </button>
            </div>

            <div className="space-y-2">
              {formData.integrations.map((integ, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 w-6 shrink-0">
                    •
                  </span>
                  <input
                    type="text"
                    value={integ}
                    onChange={(e) => handleIntegrationChange(idx, e.target.value)}
                    placeholder="Sistema o API con la que se integra (ej. FONASA, FCE, Registro Civil)..."
                    className="flex-1 border border-slate-300 p-2 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  />
                  {formData.integrations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIntegration(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LEGAL CONSIDERATIONS */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Consideraciones Legales / Normativa Aplicable
            </label>
            <input
              type="text"
              value={formData.legalConsiderations || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, legalConsiderations: e.target.value }))}
              placeholder="ej. Norma Técnica 820 DEIS 2023, Ley 20.584, Ley 19.628"
              className="w-full border border-slate-300 p-2 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950 focus:outline-none"
            />
          </div>

          {/* LINKED PROCESS ACTIVITIES SELECTOR */}
          {allProcessActivities.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Vincular a Fichas de Actividad del Proceso Activo
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto border border-slate-200 p-3 bg-slate-50">
                {allProcessActivities.map((act) => {
                  const isChecked = (formData.linkedProcessActivities || []).includes(act.index);
                  return (
                    <label
                      key={act.index}
                      className={`flex items-center gap-2 p-2 border text-xs cursor-pointer select-none transition-colors ${
                        isChecked ? "bg-blue-50 border-blue-400 text-blue-950 font-bold" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLinkedActivity(act.index)}
                        className="rounded-none border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="font-mono">{act.index}</span>
                      <span className="truncate">{act.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Guardar Sistema SIH
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
