import React, { useState } from "react";
import { ProcessDefinition, SubprocessDefinition, ActivityFicha, BpmnGateway, StateTransition, KPIDefinition } from "../types";
import { UserRole } from "../firebase";
import {
  FileText, Table, Layers, HelpCircle, Activity, Plus, Edit2, Trash2, AlertCircle, Check, X,
  Info, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ExternalLink, GitFork, ArrowLeft,
  MoveLeft, MoveRight, Sliders, PlusCircle, Play, StopCircle, RefreshCw, Save, GripVertical,
  Minus, Maximize2, Minimize2, Grid, ZoomIn, ZoomOut
} from "lucide-react";

interface FrameworkDocViewerProps {
  process: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
  userRole?: UserRole;
}

export default function FrameworkDocViewer({ process, onProcessChange, userRole = "admin" }: FrameworkDocViewerProps) {
  const isAdmin = userRole === "admin";
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
  const [isNewInitialSub, setIsNewInitialSub] = useState<boolean>(false);
  const [customInitialSubName, setCustomInitialSubName] = useState<string>("");

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

  // Drag and Drop State for BPMN 2.0 Subprocesses & Palette
  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);
  const [dragOverSubIndex, setDragOverSubIndex] = useState<number | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [validationErrors, setValidationError] = useState<string[] | null>(null);

  // Canvas Height & Layout Settings (Bizagi Modeler Style)
  const [canvasHeight, setCanvasHeight] = useState<number>(550); // Default 550px height
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Function to validate diagram consistency and save
  const handleSaveModelWithValidation = () => {
    const errors: string[] = [];

    // 1. Check Evento de Inicio
    const hasStart = process.scopeStart && process.scopeStart.trim() !== "" && !process.scopeStart.toLowerCase().includes("por definir");
    if (!hasStart) {
      errors.push("Falta configurar el Evento de Inicio (🟢). Debe ingresar un evento o gatillo válido de inicio.");
    }

    // 2. Check Subprocesos
    if (!process.subprocesses || process.subprocesses.length === 0) {
      errors.push("Debe existir al menos un Subproceso (🟦) configurado en la secuencia del proceso.");
    }

    // 3. Check Evento de Término
    const hasEnd = process.scopeEnd && process.scopeEnd.trim() !== "" && !process.scopeEnd.toLowerCase().includes("por definir");
    if (!hasEnd) {
      errors.push("Falta configurar el Evento de Término (🔴). Debe ingresar el entregable o resultado final.");
    }

    if (errors.length > 0) {
      setValidationError(errors);
      setSaveToastVisible(false);
      return;
    }

    // Passed validation
    setValidationError(null);
    const synced = syncProcessModel(process);
    if (onProcessChange) onProcessChange(synced);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 4000);
  };

  // Function to reorder subprocesses via Drag and Drop
  const handleReorderSubprocesses = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (fromIdx >= updated.subprocesses.length || toIdx >= updated.subprocesses.length) return;

    const [moved] = updated.subprocesses.splice(fromIdx, 1);
    updated.subprocesses.splice(toIdx, 0, moved);

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
  };

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

  // General Info Modal State
  const [generalModalOpen, setGeneralModalOpen] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    name: "",
    description: "",
    responsibleRole: "",
    processOwner: "",
    scopeStart: "",
    scopeEnd: "",
    suppliers: "",
    customers: "",
    processInputs: "",
    processOutputs: ""
  });

  // Glossary Modal State
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
  const [editingGlossaryIndex, setEditingGlossaryIndex] = useState<number | null>(null);
  const [glossaryForm, setGlossaryForm] = useState<{ term: string; definition: string }>({ term: "", definition: "" });

  // Risk Modal State
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [editingRiskIndex, setEditingRiskIndex] = useState<number | null>(null);
  const [riskForm, setRiskForm] = useState<string>("");

  // SIPOC Modal State
  const [sipocModalOpen, setSipocModalOpen] = useState(false);
  const [editingSipocSubIndex, setEditingSipocSubIndex] = useState<string | null>(null);
  const [sipocForm, setSipocForm] = useState({ supplier: "", inputs: "", outputs: "", customer: "" });

  // KPI Modal State
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [kpiForm, setKpiForm] = useState<KPIDefinition>({
    id: "",
    name: "",
    description: "",
    formula: "",
    periodicity: "Monthly",
    targetRange: "",
    otherRanges: ""
  });

  // Handler: Move Activity Up/Down
  const handleMoveActivity = (subIndex: string, actIndex: string, direction: "up" | "down") => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    const targetSub = updated.subprocesses.find((s) => s.index === subIndex);
    if (!targetSub) return;

    const aIdx = targetSub.activities.findIndex((a) => a.index === actIndex);
    if (aIdx === -1) return;

    const targetIdx = direction === "up" ? aIdx - 1 : aIdx + 1;
    if (targetIdx < 0 || targetIdx >= targetSub.activities.length) return;

    const temp = targetSub.activities[aIdx];
    targetSub.activities[aIdx] = targetSub.activities[targetIdx];
    targetSub.activities[targetIdx] = temp;

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
  };

  // Handler: Save General Info
  const handleSaveGeneralInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    updated.name = generalForm.name;
    updated.description = generalForm.description;
    updated.responsibleRole = generalForm.responsibleRole;
    updated.processOwner = generalForm.processOwner;
    updated.scopeStart = generalForm.scopeStart;
    updated.scopeEnd = generalForm.scopeEnd;
    updated.suppliers = generalForm.suppliers;
    updated.customers = generalForm.customers;
    updated.processInputs = generalForm.processInputs;
    updated.processOutputs = generalForm.processOutputs;

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setGeneralModalOpen(false);
  };

  // Handler: Save Glossary Item
  const handleSaveGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!glossaryForm.term.trim()) return;
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (!updated.glossary) updated.glossary = [];

    if (editingGlossaryIndex !== null && editingGlossaryIndex >= 0) {
      updated.glossary[editingGlossaryIndex] = { ...glossaryForm };
    } else {
      updated.glossary.push({ ...glossaryForm });
    }

    if (onProcessChange) onProcessChange(updated);
    setGlossaryModalOpen(false);
  };

  // Handler: Delete Glossary Item
  const handleDeleteGlossary = (index: number) => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (updated.glossary) {
      updated.glossary.splice(index, 1);
      if (onProcessChange) onProcessChange(updated);
    }
  };

  // Handler: Save Risk Item
  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskForm.trim()) return;
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (!updated.risks) updated.risks = [];

    if (editingRiskIndex !== null && editingRiskIndex >= 0) {
      updated.risks[editingRiskIndex] = riskForm.trim();
    } else {
      updated.risks.push(riskForm.trim());
    }

    if (onProcessChange) onProcessChange(updated);
    setRiskModalOpen(false);
  };

  // Handler: Delete Risk Item
  const handleDeleteRisk = (index: number) => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (updated.risks) {
      updated.risks.splice(index, 1);
      if (onProcessChange) onProcessChange(updated);
    }
  };

  // Handler: Save SIPOC Row
  const handleSaveSipoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSipocSubIndex) return;
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    const targetSub = updated.subprocesses.find((s) => s.index === editingSipocSubIndex);
    if (targetSub) {
      targetSub.sipoc = [
        {
          supplier: sipocForm.supplier,
          inputs: sipocForm.inputs,
          subprocess: targetSub.name,
          outputs: sipocForm.outputs,
          customer: sipocForm.customer
        }
      ];
      const synced = syncProcessModel(updated);
      if (onProcessChange) onProcessChange(synced);
    }
    setSipocModalOpen(false);
  };

  // Handler: Save KPI Item
  const handleSaveKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiForm.name.trim()) return;
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (!updated.kpis) updated.kpis = [];

    if (editingKpiId) {
      const idx = updated.kpis.findIndex((k) => k.id === editingKpiId);
      if (idx !== -1) {
        updated.kpis[idx] = { ...kpiForm, id: editingKpiId };
      }
    } else {
      const newId = `KPI-${updated.kpis.length + 1}`;
      updated.kpis.push({ ...kpiForm, id: newId });
    }

    if (onProcessChange) onProcessChange(updated);
    setKpiModalOpen(false);
  };

  // Handler: Delete KPI Item
  const handleDeleteKpi = (kpiId: string) => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (updated.kpis) {
      updated.kpis = updated.kpis.filter((k) => k.id !== kpiId);
      if (onProcessChange) onProcessChange(updated);
    }
  };

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

    let targetInitialState = startForm.initialState;
    if ((isNewInitialSub || updated.subprocesses.length === 0) && customInitialSubName.trim()) {
      targetInitialState = customInitialSubName.trim();
    }

    if (targetInitialState) {
      // Check if targetInitialState exists in subprocesses
      const exists = updated.subprocesses.some((s) => s.name.toLowerCase() === targetInitialState.toLowerCase());
      if (!exists) {
        // Automatically create new subproceso
        const nextIdx = `4.${updated.subprocesses.length + 1}`;
        const newSub: SubprocessDefinition = {
          index: nextIdx,
          name: targetInitialState,
          narrative: `Subproceso inicial de ${targetInitialState}`,
          sipoc: [
            {
              supplier: updated.suppliers || "Proveedor de Inicio",
              inputs: startForm.scopeStart || "Gatillo de Inicio",
              subprocess: targetInitialState,
              outputs: updated.processOutputs || "Entregable Registrado",
              customer: updated.customers || "Unidad Destinataria"
            }
          ],
          activities: [
            {
              index: `${nextIdx}.1`,
              name: `Ejecutar ${targetInitialState}`,
              description: `Se inicia la gestión de ${targetInitialState} conforme al gatillo de entrada.`,
              supportTech: "Sistema ERP / Módulo de Gestión",
              infoInputs: startForm.scopeStart || "Gatillo de Inicio",
              result: `${targetInitialState} Ejecutado`,
              rules: "No tiene",
              variants: "No tiene"
            }
          ]
        };
        updated.subprocesses.push(newSub);
      }

      if (!updated.stateMachine) {
        updated.stateMachine = { states: [], initialState: "", transitions: [], custodyTransfers: [], exceptions: [], slaRules: [] };
      }
      updated.stateMachine.initialState = targetInitialState;
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  Matriz de Factores Críticos de Éxito y KPIs Operativos
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Indicadores clave formulados matemáticamente para el control continuo de la eficiencia y calidad del proceso TO-BE.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingKpiId(null);
                  setKpiForm({
                    id: "",
                    name: "",
                    description: "",
                    formula: "(EntregablesConformes / TotalProcesados) * 100",
                    periodicity: "Monthly",
                    targetRange: ">= 95%",
                    otherRanges: "< 90%"
                  });
                  setKpiModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Indicador KPI</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {process.kpis.map((kpi) => (
                <div key={kpi.id} className="border border-slate-200 p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors relative group">
                  <div className="flex justify-between items-start">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                      {kpi.periodicity}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKpiId(kpi.id);
                          setKpiForm(kpi);
                          setKpiModalOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                        title="Editar KPI"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKpi(kpi.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Eliminar KPI"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="text-xs text-slate-400 font-mono ml-1">#{kpi.id}</span>
                    </div>
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
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  1. Definiciones (Glosario Técnico)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGlossaryIndex(null);
                    setGlossaryForm({ term: "", definition: "" });
                    setGlossaryModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Término</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {process.glossary.map((g, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 p-4 relative group">
                    <div className="flex justify-between items-start">
                      <strong className="text-xs font-bold text-slate-900 block">{g.term}</strong>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGlossaryIndex(i);
                            setGlossaryForm({ term: g.term, definition: g.definition });
                            setGlossaryModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                          title="Editar Término"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGlossary(i)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Eliminar Término"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 mt-1 block leading-relaxed">{g.definition}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. PROCESO */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-base font-bold text-slate-900">
                  2. PROCESO: {process.name.toUpperCase()}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setGeneralForm({
                      name: process.name || "",
                      description: process.description || "",
                      responsibleRole: process.responsibleRole || "",
                      processOwner: process.processOwner || "",
                      scopeStart: process.scopeStart || "",
                      scopeEnd: process.scopeEnd || "",
                      suppliers: process.suppliers || "",
                      customers: process.customers || "",
                      processInputs: process.processInputs || "",
                      processOutputs: process.processOutputs || ""
                    });
                    setGeneralModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Información General y Alcance (2.1 - 2.2)</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2.1. Alcance del Proceso</h5>
                  <p className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 p-4">
                    El proceso trata de <span className="font-semibold text-slate-900">{process.scopeStart || "recepción de la solicitud"}</span>. El <span className="font-semibold text-slate-900">{process.name}</span> se puede realizar en la unidad de <span className="font-semibold text-slate-900">{process.processOwner || "la Unidad Responsable"}</span> y culmina con <span className="font-semibold text-slate-900">{process.scopeEnd || "el entregable finalizado"}</span>.
                  </p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">2.2. Descripción General del Proceso</h5>
                  <div className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 p-4 space-y-3">
                    <p>
                      El proceso <span className="font-semibold text-slate-900">{process.name}</span> se realizará en la unidad de <span className="font-semibold text-slate-900">{process.processOwner || "la Unidad Responsable"}</span>. Este proceso {process.description || "gestiona de manera coordinada cada una de las actividades requeridas para alcanzar el objetivo operativo."}
                    </p>
                    <p className="font-semibold text-slate-800 border-t border-slate-200/80 pt-2.5">
                      Todo lo anterior deberá ser soportado por un sistema de información que permita mantener la trazabilidad de la información en todo momento.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Ficha del Proceso */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  3. Ficha Descriptiva del Proceso
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRiskIndex(null);
                      setRiskForm("");
                      setRiskModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Riesgo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneralForm({
                        name: process.name || "",
                        description: process.description || "",
                        responsibleRole: process.responsibleRole || "",
                        processOwner: process.processOwner || "",
                        scopeStart: process.scopeStart || "",
                        scopeEnd: process.scopeEnd || "",
                        suppliers: process.suppliers || "",
                        customers: process.customers || "",
                        processInputs: process.processInputs || "",
                        processOutputs: process.processOutputs || ""
                      });
                      setGeneralModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Ficha Descriptiva</span>
                  </button>
                </div>
              </div>
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
                      <td className="p-3 text-slate-800 font-medium">{process.scopeStart || process.processInputs}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 bg-slate-50 font-bold text-slate-700">Resultados / Entregables</td>
                      <td className="p-3 text-slate-800 font-medium">{process.scopeEnd || process.processOutputs}</td>
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
                        <ul className="space-y-1.5">
                          {process.risks.map((risk, i) => (
                            <li key={i} className="flex items-center justify-between group bg-slate-50/60 p-1.5 border border-slate-100 rounded">
                              <span className="text-xs text-slate-800 font-medium">&bull; {risk}</span>
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRiskIndex(i);
                                    setRiskForm(risk);
                                    setRiskModalOpen(true);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                                  title="Editar Riesgo"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRisk(i)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Eliminar Riesgo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </li>
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

                  {/* Botón: GUARDAR CAMBIOS Y ACTUALIZAR RESTO DE PUNTOS */}
                  <button
                    type="button"
                    onClick={handleSaveModelWithValidation}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] transition-colors flex items-center gap-1.5 shadow-md border border-emerald-400"
                    title="Guardar Cambios BPMN 2.0 y Sincronizar el Resto de las Secciones (3.5 SIPOC, Fichas 4, Alcance 2.1)"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>💾 Guardar Cambios BPMN 2.0</span>
                  </button>
                </div>
              </div>

              {/* Banner de Confirmación al Presionar Guardar (Éxito) */}
              {saveToastVisible && (
                <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>¡Modelo BPMN 2.0 guardado con éxito! Se han actualizado automáticamente las secciones de Alcance (2.1), Ficha Descriptiva (3), SIPOC (3.5), Fichas de Actividades (4) y Simulador.</span>
                  </div>
                  <button onClick={() => setSaveToastVisible(false)} className="text-emerald-700 hover:text-emerald-950 font-bold">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Banner de Inconsistencia (Error de Validación al Guardar) */}
              {validationErrors && validationErrors.length > 0 && (
                <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r text-xs text-rose-900 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-rose-900 border-b border-rose-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Inconsistencia detectada en el Modelo BPMN 2.0 — No se pueden guardar los cambios:</span>
                    </div>
                    <button onClick={() => setValidationError(null)} className="text-rose-700 hover:text-rose-950 font-bold">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-rose-800 font-medium">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Paleta de Elementos BPMN 2.0 Arrastrábles */}
              <div className="bg-slate-100 border border-slate-200/90 p-2.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="text-sm">🎨</span>
                  <span>Paleta de Elementos BPMN 2.0 (Arrastra y Suelta sobre el Canvas):</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Evento Inicio */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/bpmn-element", "START_EVENT");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-[11px] rounded flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-sm"
                    title="Arrastra este Evento de Inicio sobre el diagrama para configurarlo"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>🟢 Evento Inicio</span>
                  </div>

                  {/* Subproceso */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/bpmn-element", "SUBPROCESS");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 font-bold text-[11px] rounded flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-sm"
                    title="Arrastra este Subproceso sobre el diagrama para agregarlo"
                  >
                    <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                    <span>🟦 Subproceso</span>
                  </div>

                  {/* Compuerta */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/bpmn-element", "GATEWAY");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] rounded flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-sm"
                    title="Arrastra esta Compuerta sobre el diagrama para agregarla"
                  >
                    <GitFork className="w-3.5 h-3.5 text-amber-700" />
                    <span>🔀 Compuerta</span>
                  </div>

                  {/* Evento Término */}
                  <div
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/bpmn-element", "END_EVENT");
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] rounded flex items-center gap-1.5 cursor-grab active:cursor-grabbing shadow-sm"
                    title="Arrastra este Evento de Término sobre el diagrama para configurarlo"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                    <span>🔴 Evento Término</span>
                  </div>
                </div>
              </div>

              {/* Diagrama BPMN 2.0 Interactivo de Subprocesos, Estados y Compuertas */}
              <div className="border border-slate-300 bg-slate-50 p-3 space-y-3 shadow-sm rounded-sm">
                {/* Header de Controles de Canvas y Altura */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-900 font-extrabold text-sm">
                      Canvas Interactivo BPMN 2.0 (Bizagi Modeler)
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold border border-blue-200">
                      Altura: {canvasHeight}px
                    </span>
                  </div>

                  {/* Botones de Control de Altura y Red / Grid */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Presets Rápido de Altura */}
                    <span className="text-[11px] text-slate-500 font-normal mr-1 hidden sm:inline">Presets de Altura:</span>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(400)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                        canvasHeight === 400 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      400px (Compacto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(550)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                        canvasHeight === 550 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      550px (Estándar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(800)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                        canvasHeight === 800 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      800px (Amplio)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(1100)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                        canvasHeight === 1100 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      1100px (Extendido)
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1"></div>

                    {/* Ajuste Dinámico +/- */}
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(prev => Math.max(350, prev - 150))}
                      className="p-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded shadow-2xs"
                      title="Reducir Altura del Canvas (-150px)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(prev => Math.min(1800, prev + 200))}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded flex items-center gap-1 shadow-2xs"
                      title="Aumentar Altura del Canvas (+200px)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+200px</span>
                    </button>

                    {/* Toggle Grid */}
                    <button
                      type="button"
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-1 border rounded transition-colors ${
                        showGrid ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white text-slate-600 border-slate-300"
                      }`}
                      title="Alternar Malla de Fondo / Grid"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contenedor Principal del Diagrama con Pool Bizagi & Scroll Area */}
                <div className="border-2 border-slate-800 bg-white relative flex shadow-md overflow-hidden">
                  {/* Pool / Carril Lateral Estilo Bizagi Modeler */}
                  <div className="w-10 bg-slate-100 border-r-2 border-slate-800 flex items-center justify-center p-1 text-center font-black text-[11px] text-slate-800 tracking-wider uppercase select-none [writing-mode:vertical-lr] rotate-180 shrink-0">
                    Modelo Descriptivo: {process.name || "Proceso BPMN 2.0"}
                  </div>

                  {/* Area de Lienzo / Canvas con Altura Configurable */}
                  <div
                    style={{ height: `${canvasHeight}px`, minHeight: `${canvasHeight}px` }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const bpmnType = e.dataTransfer.getData("application/bpmn-element");
                      if (bpmnType === "START_EVENT") {
                        setStartForm({
                          scopeStart: process.scopeStart || "",
                          initialState: process.stateMachine?.initialState || (process.subprocesses[0]?.name || "")
                        });
                        if (process.subprocesses.length === 0) {
                          setIsNewInitialSub(true);
                          setCustomInitialSubName("");
                        } else {
                          setIsNewInitialSub(false);
                          setCustomInitialSubName("");
                        }
                        setStartModalOpen(true);
                      } else if (bpmnType === "SUBPROCESS") {
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
                      } else if (bpmnType === "GATEWAY") {
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
                      } else if (bpmnType === "END_EVENT") {
                        setEndForm({
                          scopeEnd: process.scopeEnd || "",
                          alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined"
                        });
                        setEndModalOpen(true);
                      }
                    }}
                    className={`flex-1 overflow-x-auto overflow-y-auto p-6 transition-all relative ${
                      showGrid ? "bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-max min-h-full py-4 px-2">
                      {/* Evento de Inicio (Círculo Verde BPMN 2.0) */}
                      <div className="flex flex-col items-center group relative">
                        <button
                          type="button"
                          onClick={() => {
                            setStartForm({
                              scopeStart: process.scopeStart || "",
                              initialState: process.stateMachine?.initialState || (process.subprocesses[0]?.name || "")
                            });
                            if (process.subprocesses.length === 0) {
                              setIsNewInitialSub(true);
                              setCustomInitialSubName("");
                            } else {
                              setIsNewInitialSub(false);
                              setCustomInitialSubName("");
                            }
                            setStartModalOpen(true);
                          }}
                          className="w-13 h-13 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-md transition-transform hover:scale-110 relative"
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
                        const isDragging = draggedSubIndex === sIdx;
                        const isDragOver = dragOverSubIndex === sIdx;

                        return (
                          <React.Fragment key={sub.index}>
                            {/* Tarjeta de Subproceso / Estado (Bizagi BPMN 2.0 Style with [+] Badge) */}
                            <div
                              draggable={true}
                              onDragStart={(e) => {
                                setDraggedSubIndex(sIdx);
                                e.dataTransfer.setData("text/plain", sIdx.toString());
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverSubIndex !== sIdx) {
                                  setDragOverSubIndex(sIdx);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverSubIndex === sIdx) {
                                  setDragOverSubIndex(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverSubIndex(null);
                                const sourceIdxStr = e.dataTransfer.getData("text/plain");
                                const sourceIdx = parseInt(sourceIdxStr, 10);
                                if (!isNaN(sourceIdx) && sourceIdx !== sIdx) {
                                  handleReorderSubprocesses(sourceIdx, sIdx);
                                }
                                setDraggedSubIndex(null);
                              }}
                              className={`flex flex-col items-center group relative cursor-grab active:cursor-grabbing transition-all ${
                                isDragging ? "opacity-40 scale-95" : ""
                              }`}
                            >
                              <div className={`px-4 pt-3 pb-4 bg-white border-2 rounded-lg shadow-md transition-all min-w-[200px] max-w-[230px] relative ${
                                isDragOver ? "border-blue-600 ring-2 ring-blue-300 bg-blue-50/40" : "border-blue-700 hover:border-blue-900 hover:shadow-lg"
                              }`}>
                                {/* Header Card: Drag Handle, Subprocess Number & Action Buttons */}
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5 border-b border-slate-100 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" title="Arrastrar para reordenar" />
                                    <span className="bg-blue-900 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-xs">
                                      Subp {sub.index}
                                    </span>
                                  </div>
                                  
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
                                <div className="text-xs font-bold text-slate-900 leading-snug py-1 text-center">
                                  {sub.name}
                                </div>

                                {/* Indicador Estándar BPMN 2.0 Subproceso Colapsado [+] (Bizagi Modeler Style) */}
                                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-800 w-4 h-4 rounded-xs flex items-center justify-center shadow-xs text-slate-900 font-extrabold text-[10px]" title="Símbolo BPMN 2.0 de Subproceso">
                                  +
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
                          className="w-13 h-13 rounded-full bg-rose-100 border-4 border-rose-600 flex items-center justify-center text-rose-700 shadow-md transition-transform hover:scale-110 relative"
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

                {/* Barra Inferior Interactiva para Ajustar Altura del Canvas */}
                <div className="bg-slate-100 border border-slate-300 p-2.5 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Control Manual de Altura de Canvas: <strong>{canvasHeight}px</strong></span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={350}
                      max={1600}
                      step={50}
                      value={canvasHeight}
                      onChange={(e) => setCanvasHeight(Number(e.target.value))}
                      className="w-44 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      title="Desliza para cambiar la altura del lienzo"
                    />
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(prev => Math.max(350, prev - 100))}
                      className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded flex items-center gap-1 shadow-2xs"
                    >
                      <Minus className="w-3 h-3" /> Reducir
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasHeight(prev => Math.min(1800, prev + 250))}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" /> Aumentar Altura (+250px)
                    </button>
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
                      <th className="p-3 text-right">Acciones</th>
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
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSipocSubIndex(sub.index);
                                setSipocForm({
                                  supplier: s.supplier,
                                  inputs: s.inputs,
                                  outputs: s.outputs,
                                  customer: s.customer
                                });
                                setSipocModalOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded inline-flex items-center gap-1 shadow-2xs"
                              title="Editar Ficha SIPOC de este Subproceso"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              <span>Editar SIPOC</span>
                            </button>
                          </td>
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
                  process.subprocesses.map((sub, sIdx) => {
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
                          {/* Reorder Subprocess */}
                          {sIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveSubprocess(sub.index, "up")}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                              title="Mover Subproceso Arriba"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {sIdx < process.subprocesses.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveSubprocess(sub.index, "down")}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                              title="Mover Subproceso Abajo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                                    {/* Reorder Activity Up / Down */}
                                    {sub.activities.findIndex((a) => a.index === act.index) > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveActivity(sub.index, act.index, "up")}
                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-sm"
                                        title="Mover Actividad Arriba"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {sub.activities.findIndex((a) => a.index === act.index) < sub.activities.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveActivity(sub.index, act.index, "down")}
                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-sm"
                                        title="Mover Actividad Abajo"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                    )}
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
              {/* Aviso de Granularidad BPMN */}
              <div className="bg-amber-50 border border-amber-200/90 p-2.5 rounded text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Principio de Granularidad BPMN 2.0:</strong> Evite agrupar acciones compuestas en un solo nombre (ej. evitar <em>"Solicitud y Asignación de Requerimientos"</em>). Se deben dividir en subprocesos independientes (ej. 1. <em>"Solicitud de Requerimiento"</em> y 2. <em>"Asignación de Requerimiento"</em>).
                </div>
              </div>

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
              {/* Regla de Granularidad */}
              <div className="bg-amber-50 border border-amber-200/90 p-2.5 rounded text-[11px] text-amber-900 flex items-start gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Regla de Granularidad Atómica:</strong> Cada actividad debe representar una única acción unitaria atómica (verbo en infinitivo). Evite agrupar etapas compuestas (ej. separar <em>"Solicitar y Asignar"</em> en dos actividades individuales).
                </div>
              </div>

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
                <label className="block font-bold text-slate-700 mb-1">Estado Inicial / Subproceso Vinculado</label>
                <div className="space-y-2">
                  {process.subprocesses.length > 0 && (
                    <select
                      value={isNewInitialSub ? "__NEW__" : startForm.initialState}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsNewInitialSub(true);
                          setCustomInitialSubName("");
                        } else {
                          setIsNewInitialSub(false);
                          setStartForm({ ...startForm, initialState: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                    >
                      {process.subprocesses.map((sub) => (
                        <option key={sub.index} value={sub.name}>
                          {sub.name} (Subproceso {sub.index})
                        </option>
                      ))}
                      <option value="__NEW__">➕ Crear y Vincular Un Nuevo Subproceso...</option>
                    </select>
                  )}

                  {(isNewInitialSub || process.subprocesses.length === 0) && (
                    <div className="bg-blue-50/80 p-3 border border-blue-200 rounded space-y-1.5 animate-fadeIn">
                      <label className="block font-bold text-blue-950 text-[11px]">
                        {process.subprocesses.length === 0
                          ? "Nombre del Primer Subproceso a Crear:"
                          : "Nombre del Nuevo Subproceso Inicial:"}
                      </label>
                      <input
                        type="text"
                        required
                        value={customInitialSubName}
                        onChange={(e) => setCustomInitialSubName(e.target.value)}
                        placeholder="Ej. Recepción y Admitido de Paciente / Solicitud"
                        className="w-full px-3 py-2 border border-blue-300 bg-white text-slate-900 font-bold focus:outline-none focus:border-blue-700"
                      />
                      <p className="text-[10px] text-blue-800 font-medium">
                        ✨ Al guardar, se creará automáticamente este subproceso en el diagrama y se conectará directamente con el Evento de Inicio.
                      </p>
                    </div>
                  )}
                </div>
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

      {/* MODAL: GENERAL PROCESS INFO & SCOPE (2.1, 2.2, Section 3) */}
      {generalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 max-w-2xl w-full shadow-2xl my-8 animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Editar Información General y Alcance (Puntos 2 y 3)
              </h3>
              <button onClick={() => setGeneralModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGeneralInfo} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nombre del Proceso</label>
                  <input
                    type="text"
                    required
                    value={generalForm.name}
                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Rol Responsable</label>
                  <input
                    type="text"
                    required
                    value={generalForm.responsibleRole}
                    onChange={(e) => setGeneralForm({ ...generalForm, responsibleRole: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Dueño del Proceso (Unidad Responsable)</label>
                <input
                  type="text"
                  required
                  value={generalForm.processOwner}
                  onChange={(e) => setGeneralForm({ ...generalForm, processOwner: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Descripción General del Proceso (Punto 2.2)</label>
                <textarea
                  rows={3}
                  required
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Evento de Inicio / Gatillo (Scope Start)</label>
                  <input
                    type="text"
                    required
                    value={generalForm.scopeStart}
                    onChange={(e) => setGeneralForm({ ...generalForm, scopeStart: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Entregable Final / Resultado (Scope End)</label>
                  <input
                    type="text"
                    required
                    value={generalForm.scopeEnd}
                    onChange={(e) => setGeneralForm({ ...generalForm, scopeEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Proveedores / Relaciones (Section 3)</label>
                  <input
                    type="text"
                    value={generalForm.suppliers}
                    onChange={(e) => setGeneralForm({ ...generalForm, suppliers: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Usuarios / Destinatarios (Section 3)</label>
                  <input
                    type="text"
                    value={generalForm.customers}
                    onChange={(e) => setGeneralForm({ ...generalForm, customers: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGeneralModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GLOSSARY ITEM (POINT 1) */}
      {glossaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full shadow-2xl animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                {editingGlossaryIndex !== null ? "Editar Término del Glosario" : "Agregar Término al Glosario"}
              </h3>
              <button onClick={() => setGlossaryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGlossary} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Término / Concepto</label>
                <input
                  type="text"
                  required
                  value={glossaryForm.term}
                  onChange={(e) => setGlossaryForm({ ...glossaryForm, term: e.target.value })}
                  placeholder="Ej. SLA, Guía de Despacho, ERP, Orden de Compra"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">Definición Técnica</label>
                <textarea
                  rows={3}
                  required
                  value={glossaryForm.definition}
                  onChange={(e) => setGlossaryForm({ ...glossaryForm, definition: e.target.value })}
                  placeholder="Descripción concisa y técnica del concepto en el contexto del proceso..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGlossaryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar Término
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RISK ITEM (POINT 3.3) */}
      {riskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full shadow-2xl animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {editingRiskIndex !== null ? "Editar Riesgo Identificado" : "Agregar Riesgo Identificado"}
              </h3>
              <button onClick={() => setRiskModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRisk} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Descripción del Riesgo</label>
                <textarea
                  rows={3}
                  required
                  value={riskForm}
                  onChange={(e) => setRiskForm(e.target.value)}
                  placeholder="Ej. Incumplimiento de SLA por caídas temporales en la conectividad del sistema ERP..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRiskModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar Riesgo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SIPOC ROW (POINT 3.5) */}
      {sipocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full shadow-2xl animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                Editar Ficha SIPOC (Subproceso {editingSipocSubIndex})
              </h3>
              <button onClick={() => setSipocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSipoc} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">S - Proveedor (Supplier)</label>
                <input
                  type="text"
                  required
                  value={sipocForm.supplier}
                  onChange={(e) => setSipocForm({ ...sipocForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">I - Insumos de Entrada (Inputs)</label>
                <input
                  type="text"
                  required
                  value={sipocForm.inputs}
                  onChange={(e) => setSipocForm({ ...sipocForm, inputs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">O - Entregable / Resultado (Outputs)</label>
                <input
                  type="text"
                  required
                  value={sipocForm.outputs}
                  onChange={(e) => setSipocForm({ ...sipocForm, outputs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">C - Usuario / Cliente (Customer)</label>
                <input
                  type="text"
                  required
                  value={sipocForm.customer}
                  onChange={(e) => setSipocForm({ ...sipocForm, customer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSipocModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar Ficha SIPOC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KPI ITEM (FRAMEWORK 1) */}
      {kpiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full shadow-2xl animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                {editingKpiId ? `Editar Indicador KPI (${editingKpiId})` : "Agregar Indicador KPI Operativo"}
              </h3>
              <button onClick={() => setKpiModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveKpi} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nombre del KPI</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.name}
                    onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
                    placeholder="Ej. Tasa de Cumplimiento de SLA"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Periodicidad</label>
                  <select
                    value={kpiForm.periodicity}
                    onChange={(e) => setKpiForm({ ...kpiForm, periodicity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                  >
                    <option value="Daily">Diario</option>
                    <option value="Weekly">Semanal</option>
                    <option value="Monthly">Mensual</option>
                    <option value="Annual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Descripción / Propósito</label>
                <textarea
                  rows={2}
                  required
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  placeholder="Mide el porcentaje de trámites cerrados dentro del margen de SLA definido..."
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Fórmula Matemática de Cálculo</label>
                <input
                  type="text"
                  required
                  value={kpiForm.formula}
                  onChange={(e) => setKpiForm({ ...kpiForm, formula: e.target.value })}
                  placeholder="Ej. (TrámitesConformes / TotalTrámites) * 100"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-emerald-700 mb-1">Rango Meta / Deseado</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.targetRange}
                    onChange={(e) => setKpiForm({ ...kpiForm, targetRange: e.target.value })}
                    placeholder="Ej. >= 95%"
                    className="w-full px-3 py-2 border border-slate-200 bg-emerald-50/40 text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-700 mb-1">Rango Insatisfactorio</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.otherRanges}
                    onChange={(e) => setKpiForm({ ...kpiForm, otherRanges: e.target.value })}
                    placeholder="Ej. < 90%"
                    className="w-full px-3 py-2 border border-slate-200 bg-rose-50/40 text-slate-800 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setKpiModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Guardar KPI
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

