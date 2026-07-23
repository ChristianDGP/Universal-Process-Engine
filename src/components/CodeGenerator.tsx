import React, { useState } from "react";
import { ProcessDefinition } from "../types";
import { generateSQLSchema, generateBusinessLogic, generateRESTApiSpecs } from "../codeGenerator";
import { saveProcessToCloud, SavedProcessEntry } from "../firebaseSync";
import firebaseConfig from "../../firebase-applet-config.json";
import { Database, Code, ShieldCheck, Copy, Check, Cloud, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";

interface CodeGeneratorProps {
  process: ProcessDefinition;
}

export default function CodeGenerator({ process }: CodeGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"sql" | "engine" | "api" | "firebase">("sql");
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sqlContent = generateSQLSchema(process);
  const engineContent = generateBusinessLogic(process);
  const apiContent = generateRESTApiSpecs(process);

  const firestoreDocumentPayload = JSON.stringify(
    {
      collection: "processes",
      documentId: `proc_${Date.now()}`,
      savedAt: new Date().toLocaleString("es-CL"),
      project: firebaseConfig.projectId || "upengine-27a11",
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      process: process,
    },
    null,
    2
  );

  const getActiveCode = () => {
    switch (activeTab) {
      case "sql":
        return sqlContent;
      case "engine":
        return engineContent;
      case "api":
        return apiContent;
      case "firebase":
        return firestoreDocumentPayload;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncCurrentProcessToFirestore = async () => {
    setSyncing(true);
    setSyncSuccess(null);
    setSyncError(null);
    try {
      const entry: SavedProcessEntry = {
        id: `proc_${Date.now()}`,
        savedAt: new Date().toLocaleString("es-CL"),
        process: JSON.parse(JSON.stringify(process)),
      };
      await saveProcessToCloud(entry);
      setSyncSuccess(`¡Modelo "${process.name}" sincronizado con éxito en Firebase Firestore!`);
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "Error al conectar con la base de datos de Firebase.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Code Header */}
      <div className="bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            Especificaciones Técnicas & Persistencia
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Esquemas DDL, Motor TypeScript, Contratos API REST y Colecciones Firebase NoSQL</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs */}
          <div className="flex border border-slate-200 p-0.5 bg-slate-100 flex-wrap">
            <button
              onClick={() => setActiveTab("sql")}
              className={`px-3 py-1 text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeTab === "sql"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SQL (PostgreSQL)
            </button>
            <button
              onClick={() => setActiveTab("engine")}
              className={`px-3 py-1 text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeTab === "engine"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Engine (TS)
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`px-3 py-1 text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeTab === "api"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              REST API Spec
            </button>
            <button
              onClick={() => setActiveTab("firebase")}
              className={`px-3 py-1 text-xs font-bold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeTab === "firebase"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-emerald-800 hover:text-emerald-950 bg-emerald-50"
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              Firebase Firestore (NoSQL)
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Direct Sync Banner for Firebase Tab */}
      {activeTab === "firebase" && (
        <div className="bg-emerald-900 border-b border-emerald-800 text-emerald-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span><strong>Colección activa:</strong> /processes</span>
            <span className="text-emerald-400">|</span>
            <span><strong>Project ID:</strong> {firebaseConfig.projectId || "upengine-27a11"}</span>
          </div>
          <div className="flex items-center gap-3">
            {syncSuccess && (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {syncSuccess}
              </span>
            )}
            {syncError && (
              <span className="text-rose-300 font-bold">
                ⚠️ {syncError}
              </span>
            )}
            <button
              type="button"
              onClick={handleSyncCurrentProcessToFirestore}
              disabled={syncing}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-colors flex items-center gap-1.5 cursor-pointer rounded-xs"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {syncing ? "Sincronizando..." : "Sincronizar este modelo en Firebase Cloud"}
            </button>
          </div>
        </div>
      )}

      {/* Code Viewer Panel */}
      <div className="flex-1 bg-slate-900 text-slate-300 font-mono text-xs overflow-auto p-6 leading-relaxed relative">
        <pre className="whitespace-pre-wrap select-all">{getActiveCode()}</pre>
      </div>

      {/* Footer helper */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 text-xs text-slate-500">
        {activeTab === "sql" && "Este esquema DDL soporta persistencia transaccional y auditorías detalladas (SIPOC y control de custodia)."}
        {activeTab === "engine" && "Motor de transiciones de estados tipo Autómata de Ejecución con cálculo automatizado de indicadores FCE en base a las fórmulas institucionales."}
        {activeTab === "api" && "Definición detallada de contratos REST JSON que corresponden a cada Ficha de Actividad Operativa de la Sección 4."}
        {activeTab === "firebase" && "Esquema del documento NoSQL listo para persistencia en tiempo real dentro de la colección '/processes' en Firebase Firestore."}
      </div>
    </div>
  );
}
