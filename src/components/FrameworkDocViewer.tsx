import React, { useState } from "react";
import { ProcessDefinition, SubprocessDefinition, ActivityFicha } from "../types";
import { FileText, Table, Layers, HelpCircle, Activity, Plus, Edit2, Trash2, AlertCircle, Check, X, Info, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";

interface FrameworkDocViewerProps {
  process: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
}

export default function FrameworkDocViewer({ process, onProcessChange }: FrameworkDocViewerProps) {
  const [activeTab, setActiveTab] = useState<"fce" | "tobe">("tobe");

  // Section 4 Collapse / Expand State
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});

  const toggleSubCollapse = (subIndex: string) => {
    setCollapsedSubs((prev) => {
      const currentCollapsed = prev[subIndex] !== undefined ? prev[subIndex] : true;
      return {
        ...prev,
        [subIndex]: !currentCollapsed
      };
    });
  };

  const toggleCollapseAll = (collapse: boolean) => {
    const newState: Record<string, boolean> = {};
    process.subprocesses.forEach((sub) => {
      newState[sub.index] = collapse;
    });
    setCollapsedSubs(newState);
  };

  // Subprocess Editing State
  const [editingSubIndex, setEditingSubIndex] = useState<string | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subForm, setSubForm] = useState<{ index: string; name: string; narrative: string }>({
    index: "",
    name: "",
    narrative: ""
  });

  // In-page confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Activity Ficha Editing State
  const [editingAct, setEditingAct] = useState<{ subIndex: string; actIndex: string } | null>(null);
  const [actModalOpen, setActModalOpen] = useState(false);
  const [actForm, setActForm] = useState<ActivityFicha>({
    index: "",
    name: "",
    description: "",
    supportTech: "",
    infoInputs: "",
    result: "",
    rules: "No tiene",
    variants: "No tiene"
  });

  // Validation helpers for TO-BE Ficha constraints
  const forbiddenTechRegex = /(office|excel|word|drive|mail|outlook|hardware|equipamiento|monitor|teclado|pc\b|mouse)/i;
  const forbiddenInputsRegex = /(protocolo|manual|guía técnica|instructivo)/i;

  const hasTechForbidden = forbiddenTechRegex.test(actForm.supportTech);
  const hasInputsForbidden = forbiddenInputsRegex.test(actForm.infoInputs);

  // Re-index subprocesses and activities automatically
  const reindexProcess = (proc: ProcessDefinition): ProcessDefinition => {
    const updated = JSON.parse(JSON.stringify(proc));
    updated.subprocesses = updated.subprocesses.map((sub: SubprocessDefinition, sIdx: number) => {
      const subIndex = `4.${sIdx + 1}`;
      sub.index = subIndex;

      // Update SIPOC subproceso index reference
      sub.sipoc = sub.sipoc.map((s) => ({
        ...s,
        subprocess: `${sub.name}`
      }));

      sub.activities = sub.activities.map((act: ActivityFicha, aIdx: number) => {
        act.index = `${subIndex}.${aIdx + 1}`;
        if (!act.rules || !act.rules.trim()) act.rules = "No tiene";
        if (!act.variants || !act.variants.trim()) act.variants = "No tiene";
        return act;
      });
      return sub;
    });
    return updated;
  };

  const handleSaveSubprocess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name.trim()) return;

    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;

    if (editingSubIndex) {
      // Edit existing subprocess
      const targetSub = updated.subprocesses.find((s) => s.index === editingSubIndex);
      if (targetSub) {
        targetSub.name = subForm.name;
        targetSub.narrative = subForm.narrative;
      }
    } else {
      // Create new subprocess
      const newSubIndex = `4.${updated.subprocesses.length + 1}`;
      const newSub: SubprocessDefinition = {
        index: newSubIndex,
        name: subForm.name,
        narrative: subForm.narrative || "Descripción del subproceso operativo.",
        activities: [
          {
            index: `${newSubIndex}.1`,
            name: "Ejecución de Actividad Inicial",
            description: "El operador ejecuta la verificación inicial en el sistema.",
            supportTech: "Módulo del Sistema ERP / HIS",
            infoInputs: "Evento de activación o solicitud registrada",
            result: "Actividad ejecutada",
            rules: "No tiene",
            variants: "No tiene"
          }
        ],
        sipoc: [
          {
            supplier: "Área Usuaria / Sistema",
            inputs: "Solicitud de Proceso",
            subprocess: subForm.name,
            outputs: "Entregable Registrado",
            customer: "Unidad Destinataria"
          }
        ]
      };
      updated.subprocesses.push(newSub);
    }

    const reindexed = reindexProcess(updated);
    if (onProcessChange) onProcessChange(reindexed);
    setSubModalOpen(false);
  };

  const handleDeleteSubprocess = (subIndex: string) => {
    const sub = process.subprocesses.find((s) => s.index === subIndex);
    const subName = sub ? `"${sub.name}" (${subIndex})` : `Subproceso ${subIndex}`;
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Subproceso",
      message: `¿Deseas eliminar el ${subName} y todas sus actividades contenidas? Esta acción reindexará el mapa de procesos.`,
      confirmText: "Eliminar Subproceso",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
        updated.subprocesses = updated.subprocesses.filter((s) => s.index !== subIndex);
        const reindexed = reindexProcess(updated);
        if (onProcessChange) onProcessChange(reindexed);
      }
    });
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actForm.name.trim()) return;

    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    const cleanRules = actForm.rules.trim() ? actForm.rules.trim() : "No tiene";
    const cleanVariants = actForm.variants.trim() ? actForm.variants.trim() : "No tiene";

    const targetSub = updated.subprocesses.find((s) => s.index === editingAct?.subIndex);
    if (!targetSub) return;

    if (editingAct?.actIndex && editingAct.actIndex !== "new") {
      // Edit activity
      const actIdx = targetSub.activities.findIndex((a) => a.index === editingAct.actIndex);
      if (actIdx !== -1) {
        targetSub.activities[actIdx] = {
          ...actForm,
          rules: cleanRules,
          variants: cleanVariants
        };
      }
    } else {
      // Add new activity
      const newActIndex = `${targetSub.index}.${targetSub.activities.length + 1}`;
      targetSub.activities.push({
        ...actForm,
        index: newActIndex,
        rules: cleanRules,
        variants: cleanVariants
      });
    }

    const reindexed = reindexProcess(updated);
    if (onProcessChange) onProcessChange(reindexed);
    setActModalOpen(false);
  };

  const handleDeleteActivity = (subIndex: string, actIndex: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Ficha de Actividad",
      message: `¿Deseas eliminar la Ficha de Actividad ${actIndex}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar Actividad",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
        const targetSub = updated.subprocesses.find((s) => s.index === subIndex);
        if (targetSub) {
          targetSub.activities = targetSub.activities.filter((a) => a.index !== actIndex);
          const reindexed = reindexProcess(updated);
          if (onProcessChange) onProcessChange(reindexed);
        }
      }
    });
  };

  if (!process || !process.name || process.name.trim() === "") {
    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab Header */}
        <div className="bg-slate-50 border-b border-slate-200 flex justify-between items-center px-6 py-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Manual de Especificación de Procesos</h3>
            <p className="text-xs text-slate-500">Documentación de Estándares Institucionales TO-BE & FCE</p>
          </div>
        </div>
        <div className="p-16 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight">Ningún proceso seleccionado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Por favor seleccione un proceso existente en la librería o genere un nuevo modelo TO-BE en el selector superior para visualizar la especificación técnica, matriz FCE y actividades.
          </p>
        </div>
      </div>
    );
  }

  // Map official states (3.4) with subprocesses (3.5) for BPMN 2.0 alignment
  const mappedStatesAndSubs = (() => {
    const states = process.stateMachine?.states || [];
    const subs = process.subprocesses || [];
    const transitions = process.stateMachine?.transitions || [];

    const maxLen = Math.max(states.length, subs.length);
    const result = [];

    for (let i = 0; i < maxLen; i++) {
      const sub = subs[i];
      const stateName = states[i] || (sub ? `Estado (${sub.name})` : `Estado #${i + 1}`);
      const trans = transitions.find((t) => t.from === stateName || t.to === stateName);
      const role = trans?.role || process.responsibleRole || "Operador Proceso";

      result.push({
        stateName,
        subIndex: sub?.index,
        subName: sub?.name,
        role,
        isInitial: i === 0 || stateName === process.stateMachine?.initialState,
        isFinal: i === maxLen - 1
      });
    }

    return result;
  })();

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab Header */}
      <div className="bg-slate-50 border-b border-slate-200 flex justify-between items-center px-6 py-4 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Manual de Especificación de Procesos</h3>
          <p className="text-xs text-slate-500">Documentación de Estándares Institucionales TO-BE & FCE</p>
        </div>
        <div className="flex border border-slate-200 p-0.5 bg-slate-100">
          <button
            onClick={() => setActiveTab("tobe")}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              activeTab === "tobe"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Mapeo TO-BE (Framework 2)
          </button>
          <button
            onClick={() => setActiveTab("fce")}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              activeTab === "fce"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Factores Críticos de Éxito (Framework 1)
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        {activeTab === "fce" ? (
          /* FRAMEWORK 1: FACTORES CRÍTICOS DE ÉXITO (FCE) */
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                Matriz de Factores Críticos de Éxito y KPIs Operativos
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Indicadores clave formulados matemáticamente para el control continuo de la eficiencia y calidad del proceso TO-BE.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {process.kpis.map((kpi) => (
                <div key={kpi.id} className="border border-slate-200 p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                      {kpi.periodicity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{kpi.id}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm mt-3">{kpi.name}</h5>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed h-12 overflow-y-auto">
                    {kpi.description}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fórmula</span>
                      <code className="text-xs font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-sm block mt-1 overflow-x-auto whitespace-nowrap">
                        {kpi.formula}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Meta</span>
                        <span className="text-xs font-semibold text-slate-800">{kpi.targetRange}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Insatisfactorio</span>
                        <span className="text-xs font-semibold text-slate-800">{kpi.otherRanges}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* FRAMEWORK 2: MODELO PROPUESTO (TO BE) */
          <div className="space-y-12 animate-fadeIn max-w-none">
            {/* 1. Definiciones */}
            <section className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                1. Definiciones (Glosario Técnico)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {process.glossary.map((g, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-4">
                    <strong className="text-xs font-bold text-slate-900 block">{g.term}</strong>
                    <span className="text-xs text-slate-600 mt-1 block leading-relaxed">{g.definition}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. PROCESO */}
            <section className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                2. PROCESO: {process.name.toUpperCase()}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2.1. Alcance del Proceso</h5>
                  <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 text-xs leading-relaxed text-slate-600">
                    <div>
                      <span className="font-bold text-slate-900">Gatillo de Inicio:</span> {process.scopeStart}
                    </div>
                    <div className="border-t border-slate-200 my-2 pt-2">
                      <span className="font-bold text-slate-900">Estado de Finalización:</span> {process.scopeEnd}
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2.2. Descripción General del Proceso</h5>
                  <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 p-4">
                    {process.description}
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Ficha del Proceso */}
            <section className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                3. Ficha Descriptiva del Proceso
              </h4>
              <div className="border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700 w-1/4">Nombre del Proceso</td>
                      <td className="p-3 text-slate-800 font-bold">{process.name}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Responsable del Proceso</td>
                      <td className="p-3 text-slate-800 font-medium">{process.responsibleRole}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Dueño del Proceso</td>
                      <td className="p-3 text-slate-800 font-medium">{process.processOwner}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Entradas del Proceso</td>
                      <td className="p-3 text-slate-600">{process.processInputs}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Resultados / Entregables</td>
                      <td className="p-3 text-slate-600">{process.processOutputs}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Proveedores / Relaciones</td>
                      <td className="p-3 text-slate-600">{process.suppliers}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Usuarios / Destinatarios</td>
                      <td className="p-3 text-slate-600">{process.customers}</td>
                    </tr>
                    <tr>
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Riesgos Identificados</td>
                      <td className="p-3 text-slate-600">
                        <ul className="list-disc pl-4 space-y-1">
                          {process.risks.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3.4. Modelo Descriptivo */}
            <section className="space-y-4" id="section-3-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  3.4. Modelo Descriptivo (Estados Oficiales del Proceso y Diagrama BPMN 2.0)
                </h4>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200 self-start sm:self-auto uppercase tracking-wider">
                  Metodología BPMN 2.0
                </span>
              </div>

              {/* Diagrama BPMN 2.0 de Estados Oficiales Enlazados con Subprocesos */}
              <div className="border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Flujo de Estados Oficiales Enlazados con Subprocesos (Punto 3.5)
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                    Haz clic en un estado para ir a su Subproceso en 3.5 (SIPOC)
                  </span>
                </div>

                {/* Contenedor Flujo BPMN con Scroll Horizontal */}
                <div className="overflow-x-auto pb-3">
                  <div className="flex items-center gap-3 min-w-max py-4 px-3">
                    {/* Evento de Inicio (Círculo Verde BPMN 2.0) */}
                    <div className="flex flex-col items-center group">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-sm transition-transform group-hover:scale-105" title="Evento de Inicio BPMN 2.0 (Círculo Verde)">
                        <span className="w-4 h-4 bg-emerald-600 rounded-full"></span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 mt-2 text-center max-w-[110px]">
                        EVENTO DE INICIO
                      </span>
                      <span className="text-[10px] text-slate-500 text-center max-w-[130px] italic line-clamp-2 mt-0.5">
                        {process.scopeStart || "Gatillo de Inicio"}
                      </span>
                    </div>

                    {/* Conector Flecha */}
                    <div className="flex items-center text-slate-400 font-bold text-xs px-1">
                      <div className="w-8 h-0.5 bg-slate-300"></div>
                      <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                    </div>

                    {/* Estados Oficiales Enlazados a Subprocesos */}
                    {mappedStatesAndSubs.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <a
                          href={item.subIndex ? `#sipoc-sub-${item.subIndex}` : `#section-3-5`}
                          onClick={(e) => {
                            if (item.subIndex) {
                              e.preventDefault();
                              const el = document.getElementById(`sipoc-sub-${item.subIndex}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }}
                          className="flex flex-col items-center group hover:no-underline"
                        >
                          <div className="px-4 py-3 bg-white border-2 border-slate-800 shadow-sm hover:border-blue-600 hover:bg-blue-50/50 transition-all text-center min-w-[160px] max-w-[210px] relative">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1 border-b border-slate-100 pb-1">
                              <span className="font-bold text-slate-700">Estado #{idx + 1}</span>
                              {item.subIndex && (
                                <span className="bg-slate-900 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                                  Subp {item.subIndex}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 leading-snug">
                              {item.stateName}
                            </div>
                            {item.subName && (
                              <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[180px] italic" title={item.subName}>
                                {item.subName}
                              </div>
                            )}
                            <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-600">
                              <span className="truncate max-w-[140px]">{item.role}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </a>

                        {/* Conector Flecha entre Estados */}
                        <div className="flex items-center text-slate-400 font-bold text-xs px-1">
                          <div className="w-8 h-0.5 bg-slate-300"></div>
                          <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                        </div>
                      </React.Fragment>
                    ))}

                    {/* Evento de Término (Círculo Rojo BPMN 2.0) */}
                    <div className="flex flex-col items-center group">
                      <div className="w-12 h-12 rounded-full bg-rose-100 border-4 border-rose-600 flex items-center justify-center text-rose-700 shadow-sm transition-transform group-hover:scale-105" title="Evento de Término BPMN 2.0 (Círculo Rojo)">
                        <span className="w-4 h-4 bg-rose-600 rounded-full"></span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-800 mt-2 text-center max-w-[110px]">
                        EVENTO DE TÉRMINO
                      </span>
                      <span className="text-[10px] text-slate-500 text-center max-w-[130px] italic line-clamp-2 mt-0.5">
                        {process.scopeEnd || "Entregable Finalizado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tablas Descriptivas de Estados y SLAs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="border border-slate-200">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 font-semibold text-xs text-slate-700 flex items-center justify-between">
                    <span>Matriz de Coincidencia de Estados Oficiales y Subprocesos</span>
                    <span className="text-[10px] font-mono text-slate-500">3.4 ↔ 3.5</span>
                  </div>
                  <div className="p-3 space-y-2 max-h-[220px] overflow-y-auto">
                    {mappedStatesAndSubs.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                            {st.stateName}
                          </div>
                          {st.subName && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              Subproceso: ({st.subIndex}) {st.subName}
                            </div>
                          )}
                        </div>
                        {st.subIndex && (
                          <a
                            href={`#sipoc-sub-${st.subIndex}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const el = document.getElementById(`sipoc-sub-${st.subIndex}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] transition-colors flex items-center gap-1 shrink-0"
                          >
                            Ir a 3.5 SIPOC
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 font-semibold text-xs text-slate-700">
                    SLA y Escalación Operativa por Estado
                  </div>
                  <div className="p-3 space-y-3 max-h-[220px] overflow-y-auto">
                    {process.stateMachine.slaRules.map((rule, idx) => (
                      <div key={idx} className="text-xs leading-relaxed text-slate-600 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="font-bold text-rose-600 uppercase tracking-wider mr-1.5">[SLA {rule.state}]</span>
                        Límite: <strong className="text-slate-900">{rule.timeoutHours}h</strong>. <span className="italic">{rule.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 3.5. Matriz SIPOC */}
            <section className="space-y-4" id="section-3-5">
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-500" />
                  3.5. Ficha de Subprocesos (Matriz SIPOC)
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  Ref. BPMN 2.0
                </span>
              </h4>
              <div className="border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider font-bold text-[10px]">
                      <th className="p-3">S (Proveedor)</th>
                      <th className="p-3">I (Insumo)</th>
                      <th className="p-3">P (Subproceso)</th>
                      <th className="p-3">O (Entregable)</th>
                      <th className="p-3">C (Usuario Final)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {process.subprocesses.flatMap((sub) =>
                      sub.sipoc.map((s, idx) => (
                        <tr key={`${sub.index}-${idx}`} id={`sipoc-sub-${sub.index}`} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-slate-700 font-medium">{s.supplier}</td>
                          <td className="p-3 text-slate-600">{s.inputs}</td>
                          <td className="p-3 font-bold text-slate-900">
                            ({sub.index}) {sub.name}
                          </td>
                          <td className="p-3 text-slate-600">{s.outputs}</td>
                          <td className="p-3 text-slate-700 font-medium">{s.customer}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. PROCEDIMIENTO MODELO DE NIVEL OPERATIVO (EDITABLE) */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    4. DESCRIPCIÓN DEL PROCEDIMIENTO MODELO DE NIVEL OPERATIVO
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200">
                      BPMN 2.0 & FCE
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Subprocesos (Sustantivos abstractos Ref. 3.3.2) y Actividades Operativas TO-BE (Verbos infinitivos Ref. 2.2).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => toggleCollapseAll(false)}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1"
                    title="Expandir el contenido de todos los subprocesos"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Expandir Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapseAll(true)}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1"
                    title="Colapsar la vista de todos los subprocesos"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Colapsar Todos
                  </button>

                  <button
                    onClick={() => {
                      setEditingSubIndex(null);
                      setSubForm({ index: `4.${process.subprocesses.length + 1}`, name: "", narrative: "" });
                      setSubModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 ml-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Subproceso
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {process.subprocesses.length === 0 ? (
                  <div className="border border-dashed border-slate-300 p-8 text-center space-y-3 bg-slate-50/60">
                    <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                    <h5 className="font-bold text-sm text-slate-800">Diseño de Proceso en Blanco</h5>
                    <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                      No hay subprocesos ni fichas de actividad modeladas aún. Ingrese el <strong>Nombre del Proceso</strong> y el <strong>Contexto o Alcance Operativo (Obligatorio)</strong> en el panel superior para generar la arquitectura TO-BE, o construya manualmente los subprocesos.
                    </p>
                    <button
                      onClick={() => {
                        setEditingSubIndex(null);
                        setSubForm({ index: "4.1", name: "", narrative: "" });
                        setSubModalOpen(true);
                      }}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Primer Subproceso (4.1)
                    </button>
                  </div>
                ) : (
                  process.subprocesses.map((sub) => {
                    const isCollapsed = collapsedSubs[sub.index] !== undefined ? collapsedSubs[sub.index] : true;

                  return (
                    <div key={sub.index} className="border border-slate-200 bg-slate-50/30 transition-all">
                      {/* Header del Subproceso */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-100/50">
                        <button
                          type="button"
                          onClick={() => toggleSubCollapse(sub.index)}
                          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity group"
                        >
                          <span className="p-1 bg-slate-200 text-slate-700 group-hover:bg-slate-300 transition-colors">
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold">
                            {sub.index}
                          </span>
                          <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {sub.name}
                            <span className="text-[10px] font-normal text-slate-500 font-mono">
                              ({sub.activities.length} {sub.activities.length === 1 ? "actividad" : "actividades"})
                            </span>
                          </h5>
                        </button>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => toggleSubCollapse(sub.index)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                          >
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="w-3 h-3 text-slate-500" /> Expandir
                              </>
                            ) : (
                              <>
                                <ChevronUp className="w-3 h-3 text-slate-500" /> Colapsar
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSubIndex(sub.index);
                              setSubForm({ index: sub.index, name: sub.name, narrative: sub.narrative });
                              setSubModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSubprocess(sub.index)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Eliminar
                          </button>
                          <button
                            onClick={() => {
                              setEditingAct({ subIndex: sub.index, actIndex: "new" });
                              setActForm({
                                index: `${sub.index}.${sub.activities.length + 1}`,
                                name: "",
                                description: "",
                                supportTech: "",
                                infoInputs: "",
                                result: "",
                                rules: "No tiene",
                                variants: "No tiene"
                              });
                              setActModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            + Actividad
                          </button>
                        </div>
                      </div>

                      {/* Subprocess Content (Collapsible) */}
                      {!isCollapsed && (
                        <div className="p-6 space-y-4 animate-fadeIn">
                          <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                            {sub.narrative}
                          </p>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {sub.activities.map((act) => (
                              <div key={act.index} className="bg-white border border-slate-200 p-4 space-y-3 relative group hover:border-slate-400 transition-colors shadow-xs">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5">
                                    Ficha {act.index}
                                  </span>
                                  
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingAct({ subIndex: sub.index, actIndex: act.index });
                                        setActForm(act);
                                        setActModalOpen(true);
                                      }}
                                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-sm"
                                      title="Editar Ficha"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteActivity(sub.index, act.index)}
                                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-sm"
                                      title="Eliminar Actividad"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <h6 className="font-bold text-xs text-slate-900">{act.name}</h6>
                                
                                <div className="space-y-2 text-[11px] leading-relaxed">
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Descripción:</span> {act.description}
                                  </p>
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Apoyo Tecnológico:</span>{" "}
                                    <code className="font-mono text-slate-900 bg-slate-50 px-1 py-0.5 border border-slate-100">
                                      {act.supportTech}
                                    </code>
                                  </p>
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Insumos de Información:</span> {act.infoInputs}
                                  </p>
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Resultado:</span> {act.result}
                                  </p>
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Reglas de Negocio:</span>{" "}
                                    <span className={act.rules === "No tiene" ? "italic text-slate-400" : "text-slate-700"}>
                                      {act.rules}
                                    </span>
                                  </p>
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Variantes / Edge cases:</span>{" "}
                                    <span className={act.variants === "No tiene" ? "italic text-slate-400" : "text-slate-700"}>
                                      {act.variants}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* SUBPROCESS EDIT/CREATE MODAL */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSubIndex ? `Editar Subproceso ${editingSubIndex}` : "Agregar Nuevo Subproceso (4.X)"}
              </h3>
              <button onClick={() => setSubModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubprocess} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">Nombre del Subproceso</label>
                  <span className="text-[10px] text-slate-500 font-mono">Ref. 3.3.2 Manual BPMN 2.0</span>
                </div>
                <input
                  type="text"
                  required
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  placeholder="Ej. Control de Calidad y Muestreo (Sustantivo abstracto referente al producto)"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Debe usarse sustantivo abstracto referente al producto o resultado del subproceso.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Narrativa Operativa del Subproceso</label>
                <textarea
                  rows={3}
                  value={subForm.narrative}
                  onChange={(e) => setSubForm({ ...subForm, narrative: e.target.value })}
                  placeholder="Descripción resumida del objetivo operativo y alcance de este subproceso."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Guardar Subproceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY FICHA EDIT/CREATE MODAL */}
      {actModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingAct?.actIndex && editingAct.actIndex !== "new"
                    ? `Editar Ficha TO-BE ${actForm.index}`
                    : `Agregar Nueva Ficha de Actividad a Subproceso ${editingAct?.subIndex}`}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Estándar de Especificación Ficha TO-BE Institucional</p>
              </div>
              <button onClick={() => setActModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Nombre de la actividad */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Nombre de la Actividad</label>
                  <span className="text-[10px] text-slate-500 font-mono">Verbo Infinitivo (Ref. 2.2 BPMN 2.0)</span>
                </div>
                <input
                  type="text"
                  required
                  value={actForm.name}
                  onChange={(e) => setActForm({ ...actForm, name: e.target.value })}
                  placeholder="Ej. Verificar Arribo y Documentación (verbo en infinitivo)"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                />
              </div>

              {/* Descripción (en tiempo presente) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Descripción de la Actividad</label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                    En TO-BE: Describir en Tiempo Presente
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={actForm.description}
                  onChange={(e) => setActForm({ ...actForm, description: e.target.value })}
                  placeholder="Ej. El recepcionista de bodega solicita la guía de despacho y verifica en el ERP que exista la Orden de Compra..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Apoyo Tecnológico */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Apoyo Tecnológico</label>
                  <span className="text-[10px] text-slate-500">Sistema / Módulo Informático</span>
                </div>
                <input
                  type="text"
                  required
                  value={actForm.supportTech}
                  onChange={(e) => setActForm({ ...actForm, supportTech: e.target.value })}
                  placeholder="Ej. Módulo de Compras del ERP SAP, Sistema WMS, Ficha Clínica HIS"
                  className={`w-full px-3 py-2 border bg-slate-50/50 text-slate-800 focus:outline-none ${
                    hasTechForbidden ? "border-amber-400 bg-amber-50/30" : "border-slate-200 focus:border-slate-900"
                  }`}
                />
                {hasTechForbidden ? (
                  <p className="mt-1 text-[11px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 p-1.5 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <strong>Regla Ficha:</strong> No debe ir Office / Drive / Mail / Hardware / Equipamiento. Utiliza el módulo o sistema de software correspondiente.
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">
                    * No debe ir Office / Drive / Mail / Hardware / Equipamiento.
                  </p>
                )}
              </div>

              {/* Insumos de Información */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Insumos de Información</label>
                  <span className="text-[10px] text-slate-500">Resultado anterior / Evento activador</span>
                </div>
                <input
                  type="text"
                  required
                  value={actForm.infoInputs}
                  onChange={(e) => setActForm({ ...actForm, infoInputs: e.target.value })}
                  placeholder="Ej. Arribo de transporte con guía de despacho, Ficha clínica aperturada"
                  className={`w-full px-3 py-2 border bg-slate-50/50 text-slate-800 focus:outline-none ${
                    hasInputsForbidden ? "border-amber-400 bg-amber-50/30" : "border-slate-200 focus:border-slate-900"
                  }`}
                />
                {hasInputsForbidden ? (
                  <p className="mt-1 text-[11px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 p-1.5 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <strong>Regla Ficha:</strong> No deben ir Protocolos / Manuales. Agrégalos en "Reglas de Negocio" (ej: 'Aplicar protocolo XXX').
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">
                    * Instancia que activa la actividad (resultado previo). No incluir manuales o protocolos.
                  </p>
                )}
              </div>

              {/* Resultado */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Resultado</label>
                  <span className="text-[10px] text-slate-500 font-mono">Participio (Ref. 2.2 BPMN 2.0)</span>
                </div>
                <input
                  type="text"
                  required
                  value={actForm.result}
                  onChange={(e) => setActForm({ ...actForm, result: e.target.value })}
                  placeholder="Ej. Pre-ingreso de documento registrado, Pallets etiquetados"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Describir en participio (estado finalizado, ej. "Orden recibida").
                </p>
              </div>

              {/* Reglas de Negocio */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Reglas de Negocio / Protocolos</label>
                  <span className="text-[10px] text-slate-500">Si no tiene reglas, indicar "No tiene"</span>
                </div>
                <input
                  type="text"
                  value={actForm.rules}
                  onChange={(e) => setActForm({ ...actForm, rules: e.target.value })}
                  placeholder="Ej. Aplicar protocolo de bioseguridad XXX o indicar 'No tiene'"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Aquí deben ir los manuales, guías o normas aplicables (ej: "Aplicar protocolo XXX").
                </p>
              </div>

              {/* Variantes & Referencias Cruzadas */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Variantes / Referencia Cruzada</label>
                  <span className="text-[10px] text-slate-500">Si no tiene variantes, indicar "No tiene"</span>
                </div>
                <input
                  type="text"
                  value={actForm.variants}
                  onChange={(e) => setActForm({ ...actForm, variants: e.target.value })}
                  placeholder="Ej. Ver Actividad 4.1.1 (referencia cruzada) o indicar 'No tiene'"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Si la actividad se repite exactamente, no duplicar la ficha; incorporar Referencia Cruzada (ej: "Ver Actividad 4.1.1").
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar Ficha TO-BE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NATIVE IN-PAGE CONFIRM MODAL */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                {confirmModal.confirmText || "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

