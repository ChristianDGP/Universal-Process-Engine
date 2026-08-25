import React, { useState } from "react";
import {
  BookOpen,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  Plus,
  Search,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Info
} from "lucide-react";
import { ReferenceDocument } from "../types";
import {
  parseUploadedReferenceFile,
  addReferenceDocument,
  deleteReferenceDocument
} from "../lib/referenceDocUtils";

interface ReferenceDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceDocuments: ReferenceDocument[];
  onDocumentsChange: (docs: ReferenceDocument[]) => void;
  selectedDocIds?: string[];
  onSelectDoc?: (docId: string) => void;
}

export const ReferenceDocumentsModal: React.FC<ReferenceDocumentsModalProps> = ({
  isOpen,
  onClose,
  referenceDocuments,
  onDocumentsChange,
  selectedDocIds = [],
  onSelectDoc
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const file = files[0];
      const parsedDoc = await parseUploadedReferenceFile(file);
      const updated = addReferenceDocument(parsedDoc);
      onDocumentsChange(updated);
      setUploadSuccess(`Documento "${file.name}" cargado y procesado exitosamente (${parsedDoc.sections.length} secciones extraídas).`);
      setExpandedDocId(parsedDoc.id);
    } catch (err: any) {
      console.error("Error parsing reference document:", err);
      setUploadError(`Error al procesar el archivo: ${err.message || "Formato no compatible"}`);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar el documento de referencia "${name}"?`)) {
      const updated = deleteReferenceDocument(id);
      onDocumentsChange(updated);
    }
  };

  const filteredDocs = referenceDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.summary && doc.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.authorOrEntity && doc.authorOrEntity.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.sections.some((s) => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      selectedTypeFilter === "ALL" || doc.type === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: ReferenceDocument["type"]) => {
    switch (type) {
      case "NORMA_TECNICA":
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-sm">Norma Técnica</span>;
      case "GUIA_CLINICA":
        return <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold text-[10px] rounded-sm">Guía Clínica</span>;
      case "PROTOCOLO":
        return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded-sm">Protocolo</span>;
      case "PAPER":
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-sm">Paper / Estudio</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] rounded-sm">Manual</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl rounded-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Biblioteca de Documentos de Referencia
              </h2>
              <p className="text-xs text-slate-300">
                Manuales, Papers, Guías Clínicas y Normas Técnicas para la estructuración de subprocesos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Banner & Search Controls */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, contenido, sección o entidad emisora..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-sm bg-white focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-sm px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="NORMA_TECNICA">Normas Técnicas</option>
                <option value="GUIA_CLINICA">Guías Clínicas</option>
                <option value="PROTOCOLO">Protocolos</option>
                <option value="PAPER">Papers / Estudios</option>
                <option value="MANUAL">Manuales Institucionales</option>
              </select>

              <label className="relative inline-flex items-center justify-center px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-sm cursor-pointer transition-colors shadow-xs shrink-0">
                <UploadCloud className="w-4 h-4 mr-1.5" />
                <span>{isUploading ? "Cargando..." : "Subir Documento"}</span>
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.txt,.json"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-sm p-8 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No se encontraron documentos de referencia</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Suba documentos en formato Word (.docx), PDF o Texto para utilizarlos como base oficial en la estructuración de subprocesos.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isExpanded = expandedDocId === doc.id;
              const isSelected = selectedDocIds.includes(doc.id);

              return (
                <div
                  key={doc.id}
                  className={`border rounded-sm transition-all bg-white ${
                    isSelected
                      ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {onSelectDoc && (
                        <button
                          type="button"
                          onClick={() => onSelectDoc(doc.id)}
                          className={`mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 hover:border-slate-400 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{doc.name}</h3>
                          {getTypeBadge(doc.type)}
                          <span className="text-[11px] font-mono text-slate-400">
                            {doc.sections.length} secciones
                          </span>
                        </div>

                        {doc.summary && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {doc.summary}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          {doc.authorOrEntity && (
                            <span><strong className="text-slate-700">Emisor:</strong> {doc.authorOrEntity}</span>
                          )}
                          <span>
                            <strong className="text-slate-700">Cargado:</strong> {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          <span className="uppercase font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-xs">
                            {doc.sourceType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {isExpanded ? "Ocultar Secciones" : "Ver Secciones"}
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDelete(doc.id, doc.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Sections Inspection */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Secciones y Pasos Procedimentales Extraídos
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {doc.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-slate-200 rounded-sm shadow-2xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs font-bold text-slate-900 leading-snug">
                                {sec.title}
                              </h5>
                              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-xs font-bold shrink-0">
                                Sección {idx + 1}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {sec.content}
                            </p>

                            {sec.suggestedActivities && sec.suggestedActivities.length > 0 && (
                              <div className="pt-1.5 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block mb-1">
                                  Actividades sugeridas:
                                </span>
                                <ul className="space-y-1 text-[11px] text-slate-700">
                                  {sec.suggestedActivities.map((act, aIdx) => (
                                    <li key={aIdx} className="flex items-start gap-1.5">
                                      <span className="text-indigo-500 font-bold">•</span>
                                      <span>{act}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {sec.normativeCodes && sec.normativeCodes.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                {sec.normativeCodes.map((code, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-xs border border-slate-200"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Total: <strong>{filteredDocs.length}</strong> documentos disponibles
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-sm transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
