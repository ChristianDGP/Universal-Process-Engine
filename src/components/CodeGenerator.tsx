import React, { useState } from "react";
import { ProcessDefinition } from "../types";
import { generateSQLSchema, generateBusinessLogic, generateRESTApiSpecs } from "../codeGenerator";
import { Database, Code, ShieldCheck, Copy, Check } from "lucide-react";

interface CodeGeneratorProps {
  process: ProcessDefinition;
}

export default function CodeGenerator({ process }: CodeGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"sql" | "engine" | "api">("sql");
  const [copied, setCopied] = useState(false);

  const sqlContent = generateSQLSchema(process);
  const engineContent = generateBusinessLogic(process);
  const apiContent = generateRESTApiSpecs(process);

  const getActiveCode = () => {
    switch (activeTab) {
      case "sql":
        return sqlContent;
      case "engine":
        return engineContent;
      case "api":
        return apiContent;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Code Header */}
      <div className="bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Especificaciones Técnicas Autogeneradas</h3>
          <p className="text-xs text-slate-500 mt-0.5">Esquemas, Algoritmos y Contratos API alineados al modelo TO-BE</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex border border-slate-200 p-0.5 bg-slate-100">
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
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-medium"
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

      {/* Code Viewer Panel */}
      <div className="flex-1 bg-slate-900 text-slate-300 font-mono text-xs overflow-auto p-6 leading-relaxed relative">
        <pre className="whitespace-pre-wrap select-all">{getActiveCode()}</pre>
      </div>

      {/* Footer helper */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 text-xs text-slate-500">
        {activeTab === "sql" && "Este esquema DDL soporta persistencia transaccional y auditorías detalladas (SIPOC y control de custodia)."}
        {activeTab === "engine" && "Motor de transiciones de estados tipo Autómata de Ejecución con cálculo automatizado de indicadores FCE en base a las fórmulas institucionales."}
        {activeTab === "api" && "Definición detallada de contratos REST JSON que corresponden a cada Ficha de Actividad Operativa de la Sección 4."}
      </div>
    </div>
  );
}
