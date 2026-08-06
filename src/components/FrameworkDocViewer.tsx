import React, { useState } from "react";
import { ProcessDefinition, SubprocessDefinition, ActivityFicha, BpmnGateway, StateTransition } from "../types";
import {
  FileText, Table, Layers, HelpCircle, Activity, Plus, Edit2, Trash2, AlertCircle, Check, X,
  Info, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ExternalLink, GitFork, ArrowLeft,
  MoveLeft, MoveRight, Sliders, PlusCircle, Play, StopCircle, RefreshCw
} from "lucide-react";

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

  // Subprocess / State Editing State in 3.4 & 4
  const [editingSubIndex, setEditingSubIndex] = useState<string | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subForm, setSubForm] = useState<{
    index: string;
    name: string;
    role: string;
    narrative: string;
    slaHours: number;
    slaAction: string;
    initialActivityName: string;
  }>({
    index: "",
    name: "",
    role: "Operador de Proceso",
    narrative: "",
    slaHours: 12,
    slaAction: "Alerta de escalamiento por sobrepaso de SLA",
    initialActivityName: "Ejecutar Verificación Inicial"
  });

  // Start Event Editing Modal State
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startForm, setStartForm] = useState<{ scopeStart: string; initialState: string }>({
    scopeStart: process?.scopeStart || "",
    initialState: process?.stateMachine?.initialState || ""
  });

  // End Event Editing Modal State
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endForm, setEndForm] = useState<{ scopeEnd: string; alternateStates: string }>({
    scopeEnd: process?.scopeEnd || "",
    alternateStates: process?.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined"
  });

  // Gateway BPMN 2.0 Modal State
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [editingGatewayId, setEditingGatewayId] = useState<string | null>(null);
  const [gatewayForm, setGatewayForm] = useState<{
    name: string;
    type: "EXCLUSIVE_XOR" | "PARALLEL_AND" | "INCLUSIVE_OR";
    afterState: string;
    conditionTrueTarget: string;
    conditionFalseTarget: string;
    role: string;
  }>({
    name: "¿Atributos y Documentación Conformes?",
    type: "EXCLUSIVE_XOR",
    afterState: "",
    conditionTrueTarget: "",
    conditionFalseTarget: "Rechazado",
    role: process?.responsibleRole || "Operador de Proceso"
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

  // Core Function: Unified Syncing of Process Model across 3.4, 3.5, 4, StateMachine, Simulator & CodeGen
  const syncProcessModel = (proc: ProcessDefinition): ProcessDefinition => {
    const updated = JSON.parse(JSON.stringify(proc)) as ProcessDefinition;

    if (!updated.stateMachine) {
      updated.stateMachine = {
        states: [],
        initialState: "",
        transitions: [],
        custodyTransfers: [],
        exceptions: [],
        slaRules: []
      };
    }

    // 1. Re-index subprocesses and ensure SIPOC rows and activities are aligned
    updated.subprocesses = updated.subprocesses.map((sub: SubprocessDefinition, sIdx: number) => {
      const subIndex = `4.${sIdx + 1}`;
      sub.index = subIndex;

      // Sync SIPOC rows
      if (!sub.sipoc || sub.sipoc.length === 0) {
        sub.sipoc = [
          {
            supplier: updated.suppliers || "Proveedor Externo / Interno",
            inputs: updated.processInputs || "Insumo o Solicitud de Proceso",
            subprocess: sub.name,
            outputs: updated.processOutputs || "Entregable Registrado",
            customer: updated.customers || "Unidad Destinataria"
          }
        ];
      } else {
        sub.sipoc = sub.sipoc.map((s) => ({
          ...s,
          subprocess: sub.name
        }));
      }

      // Sync activities indices
      sub.activities = sub.activities.map((act: ActivityFicha, aIdx: number) => {
        act.index = `${subIndex}.${aIdx + 1}`;
        if (!act.rules || !act.rules.trim()) act.rules = "No tiene";
        if (!act.variants || !act.variants.trim()) act.variants = "No tiene";
        return act;
      });

      return sub;
    });

    // 2. Sync stateMachine.states with subprocess names
    const subNames = updated.subprocesses.map((s) => s.name);
    updated.stateMachine.states = subNames;

    if (!updated.stateMachine.initialState && subNames.length > 0) {
      updated.stateMachine.initialState = subNames[0];
    }

    // 3. Generate sequential transitions between consecutive states
    const newTransitions: StateTransition[] = [];
    for (let i = 0; i < subNames.length - 1; i++) {
      const from = subNames[i];
      const to = subNames[i + 1];
      const role = updated.subprocesses[i]?.activities[0]?.supportTech || updated.responsibleRole || "Operador Proceso";
      newTransitions.push({
        from,
        to,
        action: `Avanzar de ${from} a ${to}`,
        role
      });
    }

    // Incorporate BPMN Gateways decision transitions if present
    if (updated.stateMachine.gateways) {
      updated.stateMachine.gateways.forEach((gw) => {
        if (gw.afterState && gw.conditionTrueTarget) {
          newTransitions.push({
            from: gw.afterState,
            to: gw.conditionTrueTarget,
            action: `Decisión ${gw.name}: Conforme / Aprobado`,
            role: gw.role || updated.responsibleRole
          });
        }
        if (gw.afterState && gw.conditionFalseTarget) {
          newTransitions.push({
            from: gw.afterState,
            to: gw.conditionFalseTarget,
            action: `Decisión ${gw.name}: No Conforme / Rechazo`,
            role: gw.role || updated.responsibleRole
          });
        }
      });
    }

    updated.stateMachine.transitions = newTransitions;

    // 4. Sync SLA rules for every state
    const existingSlas = updated.stateMachine.slaRules || [];
    updated.stateMachine.slaRules = subNames.map((st) => {
      const existing = existingSlas.find((s) => s.state === st);
      return (
        existing || {
          state: st,
          timeoutHours: 12,
          action: `Notificar alerta de escalamiento por retraso en ${st}`
        }
      );
    });

    return updated;
  };

  // Handler: Save Start Event
  const handleSaveStartEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    updated.scopeStart = startForm.scopeStart;
    if (startForm.initialState) {
      if (!updated.stateMachine) {
        updated.stateMachine = { states: [], initialState: "", transitions: [], custodyTransfers: [], exceptions: [], slaRules: [] };
      }
      updated.stateMachine.initialState = startForm.initialState;
    }
    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setStartModalOpen(false);
  };

  // Handler: Save End Event
  const handleSaveEndEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    updated.scopeEnd = endForm.scopeEnd;
    
    // Parse alternate terminal states (e.g. "Rechazado, Quarantined")
    if (endForm.alternateStates) {
      const altStates = endForm.alternateStates.split(",").map((s) => s.trim()).filter(Boolean);
      if (!updated.stateMachine) {
        updated.stateMachine = { states: [], initialState: "", transitions: [], custodyTransfers: [], exceptions: [], slaRules: [] };
      }
      updated.stateMachine.exceptions = altStates.map((st) => ({
        triggerState: "Cualquier Estado",
        targetState: st,
        handler: `Tratamiento de excepción e ingreso a estado terminal '${st}'`
      }));
    }
    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setEndModalOpen(false);
  };

  // Handler: Save BPMN Gateway
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayForm.name.trim() || !gatewayForm.afterState) return;

    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (!updated.stateMachine.gateways) {
      updated.stateMachine.gateways = [];
    }

    if (editingGatewayId) {
      const idx = updated.stateMachine.gateways.findIndex((g) => g.id === editingGatewayId);
      if (idx !== -1) {
        updated.stateMachine.gateways[idx] = {
          ...gatewayForm,
          id: editingGatewayId
        };
      }
    } else {
      const newGateway: BpmnGateway = {
        ...gatewayForm,
        id: `gw_${Date.now()}`
      };
      updated.stateMachine.gateways.push(newGateway);
    }

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setGatewayModalOpen(false);
    setEditingGatewayId(null);
  };

  // Handler: Delete BPMN Gateway
  const handleDeleteGateway = (gatewayId: string) => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (updated.stateMachine?.gateways) {
      updated.stateMachine.gateways = updated.stateMachine.gateways.filter((g) => g.id !== gatewayId);
    }
    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
  };

  // Handler: Reorder Subprocesses (Move Up / Down or Left / Right in sequence)
  const handleMoveSubprocess = (subIndex: string, direction: "up" | "down") => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    const sIdx = updated.subprocesses.findIndex((s) => s.index === subIndex);
    if (sIdx === -1) return;

    const targetIdx = direction === "up" ? sIdx - 1 : sIdx + 1;
    if (targetIdx < 0 || targetIdx >= updated.subprocesses.length) return;

    // Swap subprocesses
    const temp = updated.subprocesses[sIdx];
    updated.subprocesses[sIdx] = updated.subprocesses[targetIdx];
    updated.subprocesses[targetIdx] = temp;

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
  };

  // Handler: Save Subprocess / State
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

        // Update SLA rule if exists or add it
        const slaIdx = updated.stateMachine?.slaRules?.findIndex((s) => s.state === targetSub.name);
        if (slaIdx !== undefined && slaIdx !== -1 && updated.stateMachine?.slaRules) {
          updated.stateMachine.slaRules[slaIdx] = {
            state: subForm.name,
            timeoutHours: subForm.slaHours || 12,
            action: subForm.slaAction || "Alerta de escalamiento por retraso de SLA"
          };
        }
      }
    } else {
      // Create new subprocess
      const newSubIndex = `4.${updated.subprocesses.length + 1}`;
      const initialActName = subForm.initialActivityName?.trim() || "Ejecutar Verificación Inicial";

      const newSub: SubprocessDefinition = {
        index: newSubIndex,
        name: subForm.name,
        narrative: subForm.narrative || "Descripción del subproceso operativo.",
        activities: [
          {
            index: `${newSubIndex}.1`,
            name: initialActName,
            description: `El ${subForm.role || "operador"} realiza la acción en el sistema para la etapa de ${subForm.name}.`,
            supportTech: "Módulo del Sistema ERP / HIS",
            infoInputs: "Insumo o solicitud recibida",
            result: "Conforme: Registro validado y guardado / No Conforme: Inconformidad detectada",
            rules: "Aplicar procedimiento operativo estándar.",
            variants: "No tiene"
          }
        ],
        sipoc: [
          {
            supplier: "Área Usuaria / Proveedor Interno",
            inputs: "Solicitud o Documentación de Entrada",
            subprocess: subForm.name,
            outputs: "Entregable Registrado",
            customer: "Unidad Destinataria"
          }
        ]
      };
      updated.subprocesses.push(newSub);
    }

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setSubModalOpen(false);
  };

  const handleDeleteSubprocess = (subIndex: string) => {
    const sub = process.subprocesses.find((s) => s.index === subIndex);
    const subName = sub ? `"${sub.name}" (${subIndex})` : `Subproceso ${subIndex}`;
    setConfirmModal({
      isOpen: true,
      title: "Eliminar Subproceso",
      message: `¿Deseas eliminar el ${subName} y todas sus actividades contenidas? Esta acción actualizará automáticamente todas las secciones (3.4, 3.5 SIPOC, 4 Fichas y Simulador).`,
      confirmText: "Eliminar Subproceso",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
        updated.subprocesses = updated.subprocesses.filter((s) => s.index !== subIndex);
        const synced = syncProcessModel(updated);
        if (onProcessChange) onProcessChange(synced);
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

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
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
          const synced = syncProcessModel(updated);
          if (onProcessChange) onProcessChange(synced);
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

              {/* BARRA DE HERRAMIENTAS DE EDICIÓN BPMN 2.0 (SECCIÓN 3.4) */}
              <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold tracking-tight">Herramientas de Edición BPMN 2.0 & Subprocesos</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón: Evento de Inicio */}
                  <button
                    type="button"
                    onClick={() => {
                      setStartForm({
                        scopeStart: process.scopeStart || "",
                        initialState: process.stateMachine?.initialState || (process.subprocesses[0]?.name || "")
                      });
                      setStartModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Editar Evento de Inicio (Gatillo) y Estado Inicial"
                  >
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>🟢 Evento de Inicio</span>
                  </button>

                  {/* Botón: Añadir Subproceso / Estado */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubIndex(null);
                      setSubForm({
                        index: "",
                        name: "",
                        role: process.responsibleRole || "Operador de Proceso",
                        narrative: "",
                        slaHours: 12,
                        slaAction: "Escalamiento preventivo a Jefatura por sobrepaso de SLA",
                        initialActivityName: "Ejecutar Verificación Inicial"
                      });
                      setSubModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Añadir un nuevo Subproceso / Estado al Flujo Operativo"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>➕ Nuevo Subproceso / Estado</span>
                  </button>

                  {/* Botón: Añadir Compuerta BPMN */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGatewayId(null);
                      const lastState = process.subprocesses[process.subprocesses.length - 1]?.name || "";
                      setGatewayForm({
                        name: "¿Atributos y Documentación Conformes?",
                        type: "EXCLUSIVE_XOR",
                        afterState: lastState,
                        conditionTrueTarget: "",
                        conditionFalseTarget: "Rechazado",
                        role: process.responsibleRole || "Operador de Proceso"
                      });
                      setGatewayModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Añadir Compuerta BPMN 2.0 (Decisión XOR, Paralela AND, Inclusiva OR)"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>🔀 Compuerta BPMN</span>
                  </button>

                  {/* Botón: Evento de Término */}
                  <button
                    type="button"
                    onClick={() => {
                      setEndForm({
                        scopeEnd: process.scopeEnd || "",
                        alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined"
                      });
                      setEndModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Editar Evento de Término y Estados Finales/Excepciones"
                  >
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>🔴 Evento de Término</span>
                  </button>
                </div>
              </div>

              {/* Diagrama BPMN 2.0 Interactivo de Subprocesos, Estados y Compuertas */}
              <div className="border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Diagrama Interactivo BPMN 2.0 (Edición & Reordenamiento Directo)
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                    Usa los controles ✏️ Editar, 🗑️ Eliminar, ⬅️ ➡️ Mover para modificar el flujo
                  </span>
                </div>

                {/* Contenedor Flujo BPMN con Scroll Horizontal */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex items-center gap-3 min-w-max py-4 px-3">
                    {/* Evento de Inicio (Círculo Verde BPMN 2.0) */}
                    <div className="flex flex-col items-center group relative">
                      <button
                        type="button"
                        onClick={() => {
                          setStartForm({
                            scopeStart: process.scopeStart || "",
                            initialState: process.stateMachine?.initialState || (process.subprocesses[0]?.name || "")
                          });
                          setStartModalOpen(true);
                        }}
                        className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-sm transition-transform hover:scale-110 relative"
                        title="Editar Evento de Inicio"
                      >
                        <span className="w-4 h-4 bg-emerald-600 rounded-full"></span>
                        <div className="absolute -top-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-2.5 h-2.5" />
                        </div>
                      </button>
                      <span className="text-[11px] font-bold text-emerald-800 mt-2 text-center max-w-[110px]">
                        EVENTO DE INICIO
                      </span>
                      <span className="text-[10px] text-slate-600 text-center max-w-[130px] italic line-clamp-2 mt-0.5">
                        {process.scopeStart || "Gatillo de Inicio"}
                      </span>
                    </div>

                    {/* Conector Flecha */}
                    <div className="flex items-center text-slate-400 font-bold text-xs px-1">
                      <div className="w-8 h-0.5 bg-slate-300"></div>
                      <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                    </div>

                    {/* Subprocesos y Compuertas BPMN 2.0 */}
                    {process.subprocesses.map((sub, sIdx) => {
                      const slaRule = process.stateMachine?.slaRules?.find((s) => s.state === sub.name);
                      const matchingGateways = process.stateMachine?.gateways?.filter((g) => g.afterState === sub.name) || [];

                      return (
                        <React.Fragment key={sub.index}>
                          {/* Tarjeta de Subproceso / Estado */}
                          <div className="flex flex-col items-center group relative">
                            <div className="px-4 py-3 bg-white border-2 border-slate-800 shadow-md transition-all min-w-[210px] max-w-[240px] relative hover:border-blue-600">
                              {/* Header Card: Index & Action Buttons */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5 border-b border-slate-100 pb-1.5">
                                <span className="bg-slate-900 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                                  Subp {sub.index}
                                </span>
                                
                                {/* Controles de Edición Rápida */}
                                <div className="flex items-center gap-1">
                                  {/* Mover Izquierda */}
                                  {sIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSubprocess(sub.index, "up")}
                                      className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded"
                                      title="Mover Subproceso a la izquierda"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {/* Mover Derecha */}
                                  {sIdx < process.subprocesses.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSubprocess(sub.index, "down")}
                                      className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded"
                                      title="Mover Subproceso a la derecha"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  {/* Editar */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubIndex(sub.index);
                                      setSubForm({
                                        index: sub.index,
                                        name: sub.name,
                                        role: process.responsibleRole || "Operador de Proceso",
                                        narrative: sub.narrative || "",
                                        slaHours: slaRule?.timeoutHours || 12,
                                        slaAction: slaRule?.action || "Alerta por sobrepaso de SLA",
                                        initialActivityName: sub.activities[0]?.name || "Ejecutar Verificación Inicial"
                                      });
                                      setSubModalOpen(true);
                                    }}
                                    className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded"
                                    title="Editar Subproceso y Estado"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {/* Eliminar */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubprocess(sub.index)}
                                    className="p-1 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded"
                                    title="Eliminar Subproceso"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Nombre del Subproceso */}
                              <div className="text-xs font-bold text-slate-900 leading-snug">
                                {sub.name}
                              </div>

                              {/* Narrativa Breve */}
                              {sub.narrative && (
                                <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 italic" title={sub.narrative}>
                                  {sub.narrative}
                                </div>
                              )}

                              {/* Footer Card: Rol & SLA */}
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-semibold text-slate-600">
                                <span className="truncate max-w-[120px]">{process.responsibleRole || "Operador"}</span>
                                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 font-bold font-mono">
                                  SLA: {slaRule?.timeoutHours || 12}h
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Renderizar Compuertas BPMN si existen después de este estado */}
                          {matchingGateways.map((gw) => (
                            <React.Fragment key={gw.id}>
                              {/* Flecha Conectora a Compuerta */}
                              <div className="flex items-center text-slate-400 font-bold text-xs px-1">
                                <div className="w-6 h-0.5 bg-slate-300"></div>
                                <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                              </div>

                              {/* Rombo / Nodo Compuerta BPMN 2.0 */}
                              <div className="flex flex-col items-center group relative">
                                <div className="w-28 h-28 bg-amber-50 border-2 border-amber-600 rotate-45 flex items-center justify-center shadow-md relative group hover:bg-amber-100/80 transition-colors">
                                  <div className="-rotate-45 text-center px-1">
                                    <div className="flex items-center justify-center text-amber-800 mb-0.5">
                                      <GitFork className="w-4 h-4" />
                                    </div>
                                    <div className="text-[9px] font-bold text-amber-950 leading-tight max-w-[80px]">
                                      {gw.name}
                                    </div>
                                    <div className="text-[8px] font-mono text-amber-700 mt-0.5">
                                      [{gw.type.replace("EXCLUSIVE_", "")}]
                                    </div>
                                  </div>

                                  {/* Botones de Acción en Compuerta */}
                                  <div className="-rotate-45 absolute -top-3 -right-3 flex items-center gap-0.5 bg-slate-900 text-white p-1 shadow">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingGatewayId(gw.id);
                                        setGatewayForm({
                                          name: gw.name,
                                          type: gw.type,
                                          afterState: gw.afterState,
                                          conditionTrueTarget: gw.conditionTrueTarget,
                                          conditionFalseTarget: gw.conditionFalseTarget,
                                          role: gw.role
                                        });
                                        setGatewayModalOpen(true);
                                      }}
                                      className="hover:text-blue-400 p-0.5"
                                      title="Editar Compuerta"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGateway(gw.id)}
                                      className="hover:text-rose-400 p-0.5"
                                      title="Eliminar Compuerta"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Descripción Ramas Decisión */}
                                <div className="mt-3 text-center space-y-0.5">
                                  <div className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                                    <span>Sí ➔</span>
                                    <span className="underline">{gw.conditionTrueTarget || "Siguiente Estado"}</span>
                                  </div>
                                  {gw.conditionFalseTarget && (
                                    <div className="text-[9px] font-bold text-rose-700 flex items-center justify-center gap-1">
                                      <span>No ➔</span>
                                      <span className="underline">{gw.conditionFalseTarget}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </React.Fragment>
                          ))}

                          {/* Conector Flecha entre Estados */}
                          <div className="flex items-center text-slate-400 font-bold text-xs px-1">
                            <div className="w-8 h-0.5 bg-slate-300"></div>
                            <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Evento de Término (Círculo Rojo BPMN 2.0) */}
                    <div className="flex flex-col items-center group relative">
                      <button
                        type="button"
                        onClick={() => {
                          setEndForm({
                            scopeEnd: process.scopeEnd || "",
                            alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined"
                          });
                          setEndModalOpen(true);
                        }}
                        className="w-12 h-12 rounded-full bg-rose-100 border-4 border-rose-600 flex items-center justify-center text-rose-700 shadow-sm transition-transform hover:scale-110 relative"
                        title="Editar Evento de Término"
                      >
                        <span className="w-4 h-4 bg-rose-600 rounded-full"></span>
                        <div className="absolute -top-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-2.5 h-2.5" />
                        </div>
                      </button>
                      <span className="text-[11px] font-bold text-rose-800 mt-2 text-center max-w-[110px]">
                        EVENTO DE TÉRMINO
                      </span>
                      <span className="text-[10px] text-slate-600 text-center max-w-[140px] italic line-clamp-2 mt-0.5">
                        {process.scopeEnd || "Entregable Finalizado"}
                      </span>
                    </div>
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

      {/* GATEWAY EDIT/CREATE MODAL */}
      {gatewayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <GitFork className="w-4 h-4 text-amber-600" />
                {editingGatewayId ? "Editar Compuerta BPMN 2.0" : "Añadir Nueva Compuerta BPMN 2.0"}
              </h3>
              <button onClick={() => setGatewayModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre / Pregunta de Decisión de la Compuerta</label>
                <input
                  type="text"
                  required
                  value={gatewayForm.name}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                  placeholder="Ej. ¿Atributos y Documentación Conformes?"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Compuerta BPMN</label>
                  <select
                    value={gatewayForm.type}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                  >
                    <option value="EXCLUSIVE_XOR">Exclusiva (XOR - Una sola rama)</option>
                    <option value="PARALLEL_AND">Paralela (AND - Todas las ramas)</option>
                    <option value="INCLUSIVE_OR">Inclusiva (OR - Una o más ramas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ubicación (Después del Estado)</label>
                  <select
                    value={gatewayForm.afterState}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, afterState: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    {process.subprocesses.map((sub) => (
                      <option key={sub.index} value={sub.name}>
                        {sub.name} (Subp {sub.index})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rama Afirmativa (Sí / Conforme)</label>
                  <input
                    type="text"
                    value={gatewayForm.conditionTrueTarget}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, conditionTrueTarget: e.target.value })}
                    placeholder="Dejar vacío para siguiente estado"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rama Negativa (No / Excepción)</label>
                  <input
                    type="text"
                    value={gatewayForm.conditionFalseTarget}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, conditionFalseTarget: e.target.value })}
                    placeholder="Ej. Rechazado, Quarantined"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol Responsable de la Evaluación</label>
                <input
                  type="text"
                  value={gatewayForm.role}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, role: e.target.value })}
                  placeholder="Ej. Inspector de Calidad / Validador"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGatewayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Guardar Compuerta BPMN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* START EVENT EDIT MODAL */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                Editar Evento de Inicio BPMN 2.0 (Circulo Verde)
              </h3>
              <button onClick={() => setStartModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStartEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gatillo / Disparador de Inicio de Proceso</label>
                <textarea
                  rows={3}
                  required
                  value={startForm.scopeStart}
                  onChange={(e) => setStartForm({ ...startForm, scopeStart: e.target.value })}
                  placeholder="Ej. Recepción de solicitud de compra o requerimiento de cliente"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado Inicial del Proceso</label>
                <select
                  value={startForm.initialState}
                  onChange={(e) => setStartForm({ ...startForm, initialState: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                >
                  {process.subprocesses.map((sub) => (
                    <option key={sub.index} value={sub.name}>
                      {sub.name} (Subproceso {sub.index})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStartModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Guardar Evento de Inicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* END EVENT EDIT MODAL */}
      {endModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                Editar Evento de Término BPMN 2.0 (Circulo Rojo)
              </h3>
              <button onClick={() => setEndModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEndEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Entregable / Evento de Término Principal</label>
                <textarea
                  rows={3}
                  required
                  value={endForm.scopeEnd}
                  onChange={(e) => setEndForm({ ...endForm, scopeEnd: e.target.value })}
                  placeholder="Ej. Producto o servicio entregado a conformidad con acta firmada"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estados Finales Alternativos / Excepciones (Separados por coma)</label>
                <input
                  type="text"
                  value={endForm.alternateStates}
                  onChange={(e) => setEndForm({ ...endForm, alternateStates: e.target.value })}
                  placeholder="Ej. Rechazado, Cancelado, Devuelto a Proveedor"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Estos estados se registrarán en la máquina de estados del proceso como finales anómalos o de rechazo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEndModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Guardar Evento de Término
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

