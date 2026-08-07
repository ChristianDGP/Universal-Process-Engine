import React, { useState, useEffect } from "react";
import { ProcessDefinition } from "./types";
import { BLANK_PROCESS_PRESET, WAREHOUSE_LOGISTICS_PRESET } from "./presets";
import ProcessSelector from "./components/ProcessSelector";
import FrameworkDocViewer from "./components/FrameworkDocViewer";
import ProcessSimulator from "./components/ProcessSimulator";
import { autoSaveProcessToCloud } from "./firebaseSync";
import { FileText, PlayCircle, Settings, ShieldAlert, Cloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function App() {
  const [currentProcess, setCurrentProcess] = useState<ProcessDefinition>(BLANK_PROCESS_PRESET);
  const [activeView, setActiveView] = useState<"doc" | "simulator">("doc");
  const [apiHealth, setApiHealth] = useState({ healthy: false, loading: true });
  const [autoSyncState, setAutoSyncState] = useState<{
    status: "idle" | "saving" | "synced" | "error";
    lastSavedAt?: string;
    errorMsg?: string;
  }>({ status: "idle" });

  // Check health of Gemini server-side API on startup
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiHealth({ healthy: data.aiConfigured, loading: false });
      })
      .catch(() => {
        setApiHealth({ healthy: false, loading: false });
      });
  }, []);

  // AUTOMATIC SYNC TO FIREBASE FIRESTORE ON PROCESS CHANGE
  useEffect(() => {
    if (!currentProcess || !currentProcess.name || currentProcess.name === BLANK_PROCESS_PRESET.name) {
      return;
    }

    setAutoSyncState((prev) => ({ ...prev, status: "saving" }));
    const timer = setTimeout(async () => {
      try {
        await autoSaveProcessToCloud(currentProcess);
        setAutoSyncState({
          status: "synced",
          lastSavedAt: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
      } catch (err: any) {
        console.error("Auto-sync to Firebase error:", err);
        setAutoSyncState({
          status: "error",
          errorMsg: err.message || "Error al auto-sincronizar con Firebase Cloud",
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentProcess]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* 1. EXECUTIVE INSTITUTIONAL HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-sm">
              UPE
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">UNIVERSAL PROCESS ENGINE</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">BPMN 2.0 TO-BE & FCE Compliance Design System</p>
            </div>
          </div>

          {/* Header right controls */}
        </div>
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Process Generation & Selection Area */}
        <ProcessSelector
          currentProcess={currentProcess}
          onProcessSelect={(proc) => {
            setCurrentProcess(proc);
            // Default back to doc view when a new process is loaded/generated
            setActiveView("doc");
          }}
        />

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="border-b border-slate-200 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView("doc")}
            className={`px-5 py-3 text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 border-b-2 -mb-[2px] ${
              activeView === "doc"
                ? "border-slate-900 text-slate-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Documentación (Manual TO-BE)
          </button>
          <button
            onClick={() => setActiveView("simulator")}
            className={`px-5 py-3 text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 border-b-2 -mb-[2px] ${
              activeView === "simulator"
                ? "border-slate-900 text-slate-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            2. Simulador & KPIs Dashboard
          </button>
        </div>

        {/* ACTIVE WORKSPACE RENDER */}
        <div className="space-y-6">
          {activeView === "doc" && (
            <FrameworkDocViewer
              process={currentProcess}
              onProcessChange={(updated) => setCurrentProcess(updated)}
            />
          )}

          {activeView === "simulator" && (
            <ProcessSimulator process={currentProcess} />
          )}
        </div>
      </main>

      {/* 3. CORPORATE FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Universal Process Engine.</span>
            <span className="text-slate-200">|</span>
            <span>Estándares de Procesos Corporativos</span>
          </div>
          <div className="flex gap-4">
            <span className="font-semibold text-slate-500">ISO 9001:2015 Compliant</span>
            <span>&bull;</span>
            <span className="font-semibold text-slate-500 font-mono">BPMN 2.0 Specification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
