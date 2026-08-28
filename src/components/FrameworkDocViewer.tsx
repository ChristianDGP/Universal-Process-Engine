import React, { useState } from "react";
import { ProcessDefinition, SubprocessDefinition, ActivityFicha, BpmnGateway, BpmnStartEvent, StateTransition, KPIDefinition, SIHSystem, JCIStandard } from "../types";
import { UserRole } from "../firebase";
import { UserPermissions } from "../firebaseSync";
import { ensureProcessSubprocessKpis } from "../lib/processTemplateGenerator";
import { OFFICIAL_SIH_CATEGORIES, INITIAL_SIH_CATALOG } from "../data/sihCatalogPreset";
import {
  systemMatchesQuery,
  getActiveSihCatalog,
  saveActiveSihCatalog,
  findSihSystemByText,
  standardizeSihSupportTech
} from "../lib/sihUtils";
import { OFFICIAL_JCI_CATEGORIES, INITIAL_JCI_CATALOG } from "../data/jciCatalogPreset";
import { jciMatchesQuery, autoDetectJCIForFicha, autoDetectJCISupportType } from "../lib/jciUtils";
import SihCatalogPickerModal from "./SihCatalogPickerModal";
import JciCatalogPickerModal from "./JciCatalogPickerModal";
import {
  FileText, Table, Layers, HelpCircle, Activity, Plus, Edit2, Trash2, AlertCircle, Check, X,
  Info, ChevronDown, ChevronUp, AlertTriangle, ArrowRight, ExternalLink, GitFork, ArrowLeft,
  MoveLeft, MoveRight, Sliders, PlusCircle, Play, StopCircle, RefreshCw, Save, GripVertical,
  Minus, Maximize2, Minimize2, Grid, ZoomIn, ZoomOut, Hand, MousePointer, ShieldCheck, Lock, ShieldAlert, Search, Server, Award
} from "lucide-react";

interface FrameworkDocViewerProps {
  process: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
  userRole?: UserRole;
  permissions?: UserPermissions;
}

const FORBIDDEN_SOFTWARE_TERMS = [
  "sistema", "wms", "erp", "sap", "software", "módulo", "modulo", "plataforma",
  "bot", "algoritmo", "aplicación", "portal web", "base de datos", "pantalla", "interfaz"
];

export function extractHumanRolesFromActivity(act: ActivityFicha): string[] {
  const roles: string[] = [];

  if (act.responsibleRole && act.responsibleRole.trim()) {
    const splitRoles = act.responsibleRole
      .split(/[,;/]| e | y /i)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const r of splitRoles) {
      if (!FORBIDDEN_SOFTWARE_TERMS.some((term) => r.toLowerCase().includes(term))) {
        roles.push(r);
      }
    }
  }

  if (roles.length === 0 && act.description && act.description.trim()) {
    const match = act.description.match(
      /^(?:El|La|Los|Las|Un|Una)\s+([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]{3,35}?)\s+(?:solicita|descarga|ingresa|envía|extrae|adjunta|realiza|analiza|desplaza|traslada|verifica|valida|ejecuta|emite|registra|confirma|notifica|revisa|gestiona|supervisa|coordina|aprueba|evalúa|recibe|prepara|obtiene|envia|aplica)\b/i
    );
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!FORBIDDEN_SOFTWARE_TERMS.some((term) => candidate.toLowerCase().includes(term))) {
        roles.push(candidate);
      }
    }
  }

  return roles;
}

export function getSubprocessHumanRoles(sub: SubprocessDefinition, fallback?: string): string {
  const allRoles: string[] = [];

  (sub.activities || []).forEach((act) => {
    const actRoles = extractHumanRolesFromActivity(act);
    allRoles.push(...actRoles);
  });

  const uniqueRoles: string[] = [];
  const seenLower = new Set<string>();

  for (const r of allRoles) {
    const trimmed = r.trim();
    const lower = trimmed.toLowerCase();
    if (!lower || FORBIDDEN_SOFTWARE_TERMS.some((term) => lower.includes(term))) continue;
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      const formatted = trimmed
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      uniqueRoles.push(formatted);
    }
  }

  if (uniqueRoles.length > 0) {
    return uniqueRoles.join(", ");
  }

  if (sub.responsibleRole && !FORBIDDEN_SOFTWARE_TERMS.some((t) => sub.responsibleRole!.toLowerCase().includes(t))) {
    return sub.responsibleRole;
  }

  if (fallback && !FORBIDDEN_SOFTWARE_TERMS.some((t) => fallback.toLowerCase().includes(t))) {
    return fallback;
  }

  return "Personal Operativo";
}

export function getStartEvents(proc: ProcessDefinition): BpmnStartEvent[] {
  if (proc.stateMachine?.startEvents && proc.stateMachine.startEvents.length > 0) {
    return proc.stateMachine.startEvents;
  }
  return [
    {
      id: "start-1",
      name: "EVENTO DE INICIO",
      trigger: proc.scopeStart || "Recepción de solicitud o requerimiento de inicio",
      targetSubprocessIndex: proc.subprocesses[0]?.index || "4.1",
      endTrigger: proc.scopeEnd || "Insumos almacenados o entregable final de proceso"
    }
  ];
}

export function getSubprocessesForStartEvent(
  proc: ProcessDefinition,
  stEvent: BpmnStartEvent,
  stIdx: number,
  allStartEvents: BpmnStartEvent[]
): SubprocessDefinition[] {
  const subs = proc.subprocesses || [];
  if (allStartEvents.length <= 1) {
    return subs;
  }

  // 1. Explicit startEventId match
  const explicit = subs.filter((s) => s.startEventId === stEvent.id);
  if (explicit.length > 0) {
    return explicit;
  }

  // 2. Sequence-based fallback slicing by targetSubprocessIndex
  const targetIdx = stEvent.targetSubprocessIndex || "";
  const nextStEvent = allStartEvents[stIdx + 1];
  const nextTargetIdx = nextStEvent?.targetSubprocessIndex || "";

  let startSubIdx = subs.findIndex(
    (s) => s.index === targetIdx || s.name.toLowerCase() === targetIdx.toLowerCase()
  );

  if (startSubIdx === -1) {
    if (stIdx === 0) {
      startSubIdx = 0;
    } else {
      return [];
    }
  }

  let endSubIdx = subs.length;
  if (nextTargetIdx) {
    const foundNext = subs.findIndex(
      (s) => s.index === nextTargetIdx || s.name.toLowerCase() === nextTargetIdx.toLowerCase()
    );
    if (foundNext !== -1 && foundNext > startSubIdx) {
      endSubIdx = foundNext;
    }
  }

  return subs.slice(startSubIdx, endSubIdx);
}

export default function FrameworkDocViewer({ process: rawProcess, onProcessChange, userRole = "admin", permissions }: FrameworkDocViewerProps) {
  const process = React.useMemo(() => ensureProcessSubprocessKpis(rawProcess), [rawProcess]);
  const isAdmin = userRole === "admin";

  const docPerms = React.useMemo(() => {
    const defaultPerms = {
      generalInfo: { view: true, edit: true },
      fce: { view: true, edit: true },
      tobeDiagram: { view: true, edit: true },
      riskMatrix: { view: true, edit: true },
      additionalDocs: { view: true, edit: true },
      procedureModel: { view: true, edit: true }
    };
    if (!permissions || !permissions.docComponents) {
      return defaultPerms;
    }
    return {
      generalInfo: {
        view: permissions.docComponents.generalInfo?.view ?? true,
        edit: permissions.docComponents.generalInfo?.edit ?? true,
      },
      fce: {
        view: permissions.docComponents.fce?.view ?? true,
        edit: permissions.docComponents.fce?.edit ?? true,
      },
      tobeDiagram: {
        view: permissions.docComponents.tobeDiagram?.view ?? true,
        edit: permissions.docComponents.tobeDiagram?.edit ?? true,
      },
      riskMatrix: {
        view: permissions.docComponents.riskMatrix?.view ?? true,
        edit: permissions.docComponents.riskMatrix?.edit ?? true,
      },
      additionalDocs: {
        view: permissions.docComponents.additionalDocs?.view ?? true,
        edit: permissions.docComponents.additionalDocs?.edit ?? true,
      },
      procedureModel: {
        view: permissions.docComponents.procedureModel?.view ?? true,
        edit: permissions.docComponents.procedureModel?.edit ?? true,
      },
    };
  }, [permissions]);

  if (permissions && permissions.docAccess === false) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-8 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-black text-rose-950 uppercase tracking-tight">Acceso Restringido a Documentación</h3>
        <p className="text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
          El administrador del sistema ha deshabilitado el acceso al módulo de Documentación para su cuenta.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<"fce" | "tobe">("tobe");

  // Redirect activeTab if restricted
  React.useEffect(() => {
    const canViewFceTab = isAdmin || docPerms.fce.view || docPerms.additionalDocs.view;
    if (activeTab === "fce" && !canViewFceTab) {
      setActiveTab("tobe");
    }
  }, [docPerms, isAdmin, activeTab]);

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
  const [editingStartEventId, setEditingStartEventId] = useState<string | null>(null);
  const [startForm, setStartForm] = useState<{
    id: string;
    name: string;
    trigger: string;
    targetSubprocessIndex: string;
    endTrigger: string;
  }>({
    id: "start-1",
    name: "EVENTO DE INICIO",
    trigger: process?.scopeStart || "",
    targetSubprocessIndex: process?.subprocesses[0]?.index || "4.1",
    endTrigger: process?.scopeEnd || ""
  });
  const [isNewInitialSub, setIsNewInitialSub] = useState<boolean>(false);
  const [customInitialSubName, setCustomInitialSubName] = useState<string>("");

  const openStartEventModal = (stEvent?: BpmnStartEvent) => {
    const allStartEvents = getStartEvents(process);
    if (stEvent) {
      setEditingStartEventId(stEvent.id);
      setStartForm({
        id: stEvent.id,
        name: stEvent.name || "EVENTO DE INICIO",
        trigger: stEvent.trigger || process.scopeStart || "",
        targetSubprocessIndex: stEvent.targetSubprocessIndex || process.subprocesses[0]?.index || "4.1",
        endTrigger: stEvent.endTrigger || process.scopeEnd || ""
      });
      setIsNewInitialSub(false);
      setCustomInitialSubName("");
    } else {
      // Add new secondary start event
      setEditingStartEventId(null);
      const newId = `start_${Date.now()}`;
      setStartForm({
        id: newId,
        name: `EVENTO DE INICIO ${allStartEvents.length + 1}`,
        trigger: "Arribo de solicitud o requerimiento secundario",
        targetSubprocessIndex: "__NEW__",
        endTrigger: "Entregable o resultado de cierre de este flujo"
      });
      setIsNewInitialSub(true);
      setCustomInitialSubName("");
    }
    setStartModalOpen(true);
  };

  // End Event Editing Modal State
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [endForm, setEndForm] = useState<{
    scopeEnd: string;
    alternateStates: string;
    associatedStartEventId: string;
    associatedSubprocessIndex: string;
  }>({
    scopeEnd: process?.scopeEnd || "",
    alternateStates: process?.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined",
    associatedStartEventId: "",
    associatedSubprocessIndex: ""
  });

  // Gateway BPMN 2.0 Modal State
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [editingGatewayId, setEditingGatewayId] = useState<string | null>(null);
  const [gatewayForm, setGatewayForm] = useState<{
    name: string;
    type: "EXCLUSIVE_XOR" | "PARALLEL_AND" | "INCLUSIVE_OR" | "COMPLEX_JOIN";
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

  // Mantenedor de Artefactos State (Acceso Exclusivo Administrador)
  const [artifactManagerOpen, setArtifactManagerOpen] = useState(false);
  const [artifactFilterType, setArtifactFilterType] = useState<string>("ALL");
  const [artifactSearchQuery, setArtifactSearchQuery] = useState<string>("");

  // Drag and Drop State for BPMN 2.0 Subprocesses & Palette
  const [draggedSubIndex, setDraggedSubIndex] = useState<number | null>(null);
  const [dragOverSubIndex, setDragOverSubIndex] = useState<number | null>(null);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [validationErrors, setValidationError] = useState<string[] | null>(null);

  // Canvas Height, Zoom & Layout Settings (Bizagi Modeler Style)
  const [canvasHeight, setCanvasHeight] = useState<number>(550); // Default 550px height
  const [zoomScale, setZoomScale] = useState<number>(1.0); // Default 100% zoom
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [contentBounds, setContentBounds] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Measure unscaled content bounds for perfect zoom wrapping without left truncation
  React.useEffect(() => {
    if (!diagramContentRef.current) return;
    const updateBounds = () => {
      if (diagramContentRef.current) {
        const rect = diagramContentRef.current.getBoundingClientRect();
        const currentScale = zoomScale || 1.0;
        const unscaledW = rect.width / currentScale;
        const unscaledH = rect.height / currentScale;
        if (unscaledW > 0 && unscaledH > 0) {
          setContentBounds({ width: unscaledW, height: unscaledH });
        }
      }
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(diagramContentRef.current);
    return () => observer.disconnect();
  }, [process, zoomScale, activeTab, collapsedSubs]);

  // Quick Connect Modal State (+) (Punto 3.2)
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [connectorSource, setConnectorSource] = useState<{
    type: "START_EVENT" | "SUBPROCESS" | "GATEWAY" | "END_EVENT";
    id?: string;
    subIndex?: string;
    subName?: string;
    flowStartEventId?: string;
  } | null>(null);
  const [insertAfterSubIndex, setInsertAfterSubIndex] = useState<string | null>(null);

  // Pan / Hand Tool Navigation State (Punto 3.3)
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const diagramContentRef = React.useRef<HTMLDivElement>(null);

  // Tracking positions of all BPMN nodes for dynamic vertical connections and precise label overlays
  const [elementPositions, setElementPositions] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

  const findTargetNodeId = React.useCallback((targetStr: string) => {
    if (!targetStr) return null;
    const targetClean = targetStr.trim();
    
    // 1. Check if it's a gateway ID
    const gwById = process.stateMachine?.gateways?.find((g) => g.id === targetClean);
    if (gwById) return `gw-${gwById.id}`;
    
    // 2. Check if it's a gateway name
    const gwByName = process.stateMachine?.gateways?.find((g) => g.name === targetClean);
    if (gwByName) return `gw-${gwByName.id}`;
    
    // 3. Check if it's a subprocess index
    const subById = process.subprocesses.find((s) => s.index === targetClean);
    if (subById) return `sub-${subById.index}`;
    
    // 4. Check if it's a subprocess name
    const subByName = process.subprocesses.find((s) => s.name === targetClean);
    if (subByName) return `sub-${subByName.index}`;
    
    return null;
  }, [process]);

  const measurePositions = React.useCallback(() => {
    if (!diagramContentRef.current) return;
    const container = diagramContentRef.current;
    const contentRect = container.getBoundingClientRect();
    const elements = container.querySelectorAll("[data-node-id]");
    const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};
    elements.forEach((el) => {
      const id = el.getAttribute("data-node-id");
      if (!id) return;
      const rect = el.getBoundingClientRect();
      positions[id] = {
        x: (rect.left - contentRect.left) / zoomScale,
        y: (rect.top - contentRect.top) / zoomScale,
        w: rect.width / zoomScale,
        h: rect.height / zoomScale,
      };
    });
    setElementPositions(positions);
  }, [zoomScale]);

  React.useEffect(() => {
    measurePositions();
    const t1 = setTimeout(measurePositions, 100);
    const t2 = setTimeout(measurePositions, 350);
    const t3 = setTimeout(measurePositions, 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [process, zoomScale, collapsedSubs, measurePositions, activeTab]);

  React.useEffect(() => {
    window.addEventListener("resize", measurePositions);
    return () => window.removeEventListener("resize", measurePositions);
  }, [measurePositions]);

  // Auto-fit function for Diagram View (Punto 3.1)
  const handleAutoFitDiagram = React.useCallback(() => {
    if (!canvasContainerRef.current || !diagramContentRef.current) return;
    const container = canvasContainerRef.current;
    const content = diagramContentRef.current;

    const currentScale = zoomScale || 1.0;
    const unscaledWidth = content.scrollWidth / currentScale;
    const unscaledHeight = content.scrollHeight / currentScale;

    const availableWidth = container.clientWidth - 48; // padding
    const availableHeight = container.clientHeight - 48;

    if (unscaledWidth > 0 && availableWidth > 0) {
      const scaleX = availableWidth / unscaledWidth;
      const scaleY = availableHeight / unscaledHeight;
      let computedScale = Math.min(scaleX, scaleY);
      computedScale = Math.max(0.35, Math.min(1.0, Math.floor(computedScale * 100) / 100));
      setZoomScale(computedScale);
    }
  }, [zoomScale]);

  // Auto-fit diagram on load or process change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (canvasContainerRef.current && diagramContentRef.current) {
        const container = canvasContainerRef.current;
        const content = diagramContentRef.current;
        const naturalWidth = content.scrollWidth;
        const containerWidth = container.clientWidth - 48;
        if (naturalWidth > containerWidth && containerWidth > 0) {
          let computedScale = Math.min(1.0, containerWidth / naturalWidth);
          computedScale = Math.max(0.4, Math.floor(computedScale * 100) / 100);
          setZoomScale(computedScale);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [process]);

  // Mouse Handlers for Pan Mode / Permanent Hand Navigation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasContainerRef.current) return;
    if ((e.target as HTMLElement).closest("button, input, select, textarea, a")) return;

    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: canvasContainerRef.current.scrollLeft,
      scrollTop: canvasContainerRef.current.scrollTop
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !canvasContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    canvasContainerRef.current.scrollLeft = panStart.scrollLeft - dx;
    canvasContainerRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handleCanvasMouseUpOrLeave = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

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
  const [sihPickerModalOpen, setSihPickerModalOpen] = useState(false);
  const [sihDetailModalSystem, setSihDetailModalSystem] = useState<SIHSystem | null>(null);
  const [sihTargetDirectActivity, setSihTargetDirectActivity] = useState<{
    subIdx: number;
    actIdx: number;
    initialTech: string;
  } | null>(null);

  const handleOpenSihForActivityDirect = (subIdx: number, actIdx: number, currentTech: string) => {
    setSihTargetDirectActivity({ subIdx, actIdx, initialTech: currentTech });
    setSihPickerModalOpen(true);
  };

  const handleStandardizeAllSihSupportTech = () => {
    const catalog = getActiveSihCatalog();
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    let countChanged = 0;

    updated.subprocesses?.forEach((sub) => {
      sub.activities?.forEach((act) => {
        if (act.supportTech) {
          const standardized = standardizeSihSupportTech(act.supportTech, catalog);
          if (standardized !== act.supportTech) {
            act.supportTech = standardized;
            countChanged++;
          }
        }
      });
    });

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setSaveToastVisible(true);
    setTimeout(() => setSaveToastVisible(false), 3000);
  };

  const [jciPickerModalOpen, setJciPickerModalOpen] = useState(false);
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

  // SIH Listbox, Search & Match Checkboxes State for Activity Ficha Editing (Punto 4)
  const [sihSelectedCode, setSihSelectedCode] = useState<string>("");
  const [sihSearchTerm, setSihSearchTerm] = useState<string>("");
  const [sihSelectedArea, setSihSelectedArea] = useState<string>("ALL");
  const [sihSelectedStatus, setSihSelectedStatus] = useState<string>("ALL");
  const [sihMatchOptionSystem, setSihMatchOptionSystem] = useState<boolean>(true);
  const [sihMatchOptionFeatures, setSihMatchOptionFeatures] = useState<boolean>(true);

  // Sync SIH selected system when editing an activity card
  React.useEffect(() => {
    if (actModalOpen) {
      setSihSearchTerm("");
      setSihSelectedArea("ALL");
      setSihSelectedStatus("ALL");
      if (actForm.supportTech) {
        const catalog = getActiveSihCatalog();
        const currentTechLower = actForm.supportTech.toLowerCase();
        const matched = catalog.find(
          (sys) =>
            currentTechLower.includes(sys.code.toLowerCase()) ||
            currentTechLower.includes(sys.name.toLowerCase())
        );
        if (matched) {
          setSihSelectedCode(matched.code);
          setSihMatchOptionFeatures(currentTechLower.includes("funcionalidades"));
          setSihMatchOptionSystem(currentTechLower.includes(matched.name.toLowerCase()) || currentTechLower.includes(matched.code.toLowerCase()));
        } else {
          setSihSelectedCode("");
        }
      } else {
        setSihSelectedCode("");
        setSihMatchOptionSystem(true);
        setSihMatchOptionFeatures(false);
      }
    }
  }, [actModalOpen, actForm.index]);

  const applySihMatch = (sysCode: string, matchSystem: boolean, matchFeatures: boolean) => {
    if (!sysCode || sysCode === "CUSTOM") return;
    const catalog = getActiveSihCatalog();
    const sys = catalog.find((s) => s.code === sysCode || s.id === sysCode);
    if (!sys) return;

    const systemPart = matchSystem ? `${sys.code} - ${sys.name}` : "";
    const featuresPart = matchFeatures && sys.features && sys.features.length > 0
      ? `Funcionalidades: ${sys.features.join("; ")}`
      : "";

    let result = "";
    if (matchSystem && matchFeatures) {
      result = `${systemPart} | ${featuresPart}`;
    } else if (matchSystem) {
      result = systemPart;
    } else if (matchFeatures) {
      result = featuresPart;
    } else {
      result = systemPart;
    }

    setActForm((prev) => ({
      ...prev,
      supportTech: result
    }));
  };

  const handleSihSelectChange = (code: string) => {
    setSihSelectedCode(code);
    if (code === "NO_TIENE") {
      setActForm((prev) => ({ ...prev, supportTech: "No tiene" }));
    } else if (code && code !== "CUSTOM") {
      applySihMatch(code, sihMatchOptionSystem, sihMatchOptionFeatures);
    }
  };

  const handleMatchToggleSystem = (checked: boolean) => {
    setSihMatchOptionSystem(checked);
    if (sihSelectedCode && sihSelectedCode !== "CUSTOM") {
      applySihMatch(sihSelectedCode, checked, sihMatchOptionFeatures);
    }
  };

  const handleMatchToggleFeatures = (checked: boolean) => {
    setSihMatchOptionFeatures(checked);
    if (sihSelectedCode && sihSelectedCode !== "CUSTOM") {
      applySihMatch(sihSelectedCode, sihMatchOptionSystem, checked);
    }
  };

  // JCI Listbox, Search & Match Checkboxes State for Activity Ficha Editing
  const [jciSelectedCode, setJciSelectedCode] = useState<string>("");
  const [jciSearchTerm, setJciSearchTerm] = useState<string>("");
  const [jciSelectedChapter, setJciSelectedChapter] = useState<string>("ALL");
  const [jciMatchOptionStandard, setJciMatchOptionStandard] = useState<boolean>(true);
  const [jciMatchOptionElements, setJciMatchOptionElements] = useState<boolean>(true);

  // Helper to load current JCI catalog from localStorage or preset
  const getActiveJciCatalog = React.useCallback((): JCIStandard[] => {
    try {
      const stored = localStorage.getItem("jci_catalog_state_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not read jci_catalog_state_v1", e);
    }
    return INITIAL_JCI_CATALOG;
  }, []);

  // Sync JCI selected standard when editing an activity card
  React.useEffect(() => {
    if (actModalOpen) {
      setJciSearchTerm("");
      setJciSelectedChapter("ALL");
      if (actForm.jciAttribute) {
        const catalog = getActiveJciCatalog();
        const currentJciLower = actForm.jciAttribute.toLowerCase();
        const matched = catalog.find(
          (std) =>
            currentJciLower.includes(std.code.toLowerCase()) ||
            currentJciLower.includes(std.name.toLowerCase())
        );
        if (matched) {
          setJciSelectedCode(matched.code);
          setJciMatchOptionElements(currentJciLower.includes("elementos medibles") || currentJciLower.includes("requisitos"));
          setJciMatchOptionStandard(currentJciLower.includes(matched.name.toLowerCase()) || currentJciLower.includes(matched.code.toLowerCase()));
        } else {
          setJciSelectedCode("");
        }
      } else {
        setJciSelectedCode("");
        setJciMatchOptionStandard(true);
        setJciMatchOptionElements(false);
      }
    }
  }, [actModalOpen, actForm.index]);

  const applyJciMatch = (stdCode: string, matchStandard: boolean, matchElements: boolean) => {
    if (!stdCode || stdCode === "CUSTOM") return;
    const catalog = getActiveJciCatalog();
    const std = catalog.find((s) => s.code === stdCode || s.id === stdCode);
    if (!std) return;

    const stdPart = matchStandard ? `${std.code} - ${std.name}` : "";
    const elemsPart = matchElements && std.measurableElements && std.measurableElements.length > 0
      ? `Elementos Medibles: ${std.measurableElements.slice(0, 3).join("; ")}`
      : "";

    let result = "";
    if (matchStandard && matchElements) {
      result = `${stdPart} | ${elemsPart}`;
    } else if (matchStandard) {
      result = stdPart;
    } else if (matchElements) {
      result = elemsPart;
    } else {
      result = stdPart;
    }

    setActForm((prev) => ({
      ...prev,
      jciAttribute: result
    }));
  };

  const handleJciSelectChange = (code: string) => {
    setJciSelectedCode(code);
    if (code === "NO_APLICA") {
      setActForm((prev) => ({ ...prev, jciAttribute: "No aplica" }));
    } else if (code && code !== "CUSTOM") {
      applyJciMatch(code, jciMatchOptionStandard, jciMatchOptionElements);
    }
  };

  const handleMatchToggleJciStandard = (checked: boolean) => {
    setJciMatchOptionStandard(checked);
    if (jciSelectedCode && jciSelectedCode !== "CUSTOM") {
      applyJciMatch(jciSelectedCode, checked, jciMatchOptionElements);
    }
  };

  const handleMatchToggleJciElements = (checked: boolean) => {
    setJciMatchOptionElements(checked);
    if (jciSelectedCode && jciSelectedCode !== "CUSTOM") {
      applyJciMatch(jciSelectedCode, jciMatchOptionStandard, checked);
    }
  };

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
  const [sipocForm, setSipocForm] = useState({ supplier: "", inputs: "", subprocess: "", outputs: "", customer: "" });

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
    otherRanges: "",
    isJciLinked: false,
    jciStandard: "",
    jciSupportType: "PROCESO"
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
          supplier: sipocForm.supplier || targetSub.name,
          inputs: sipocForm.inputs,
          subprocess: sipocForm.subprocess || targetSub.narrative || `Transformación de ${targetSub.name}`,
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

      // Sync SIPOC rows (Punto 3.5 Matriz SIPOC):
      // S (Subproceso): El nombre en secuencia 4.x (mismo nombre del subproceso)
      // I (Entrada): Extrae automáticamente insumo de información de la primera Ficha de Actividad (4.X.1)
      // P (Procesamiento): Texto resumen de la narrativa de transformación realizada durante la ejecución de las fichas
      // O (Resultado): Extrae automáticamente el resultado registrado en la última Ficha de Actividad del subproceso (4.X.N)
      // C (Usuarios/Destinatarios): Extrae cargos o responsables humanos descritos en las Fichas de Actividad (sin repetir, separados por coma, excluyendo software)
      const firstActInput = (sub.activities && sub.activities.length > 0 && sub.activities[0].infoInputs) ? sub.activities[0].infoInputs : (updated.processInputs || "Insumo inicial del subproceso");
      const lastActResult = (sub.activities && sub.activities.length > 0 && sub.activities[sub.activities.length - 1].result) ? sub.activities[sub.activities.length - 1].result : (updated.processOutputs || "Resultado final del subproceso");
      
      const subNarrative = sub.narrative || (sub.activities && sub.activities.length > 0
        ? sub.activities.map(a => a.description).filter(Boolean).join(" ")
        : `Transformación y ejecución de ${sub.name}`);

      const subActors = getSubprocessHumanRoles(sub, updated.responsibleRole || updated.customers);

      const cleanSubName = sub.name.replace(/^(\(?4\.\d+\)?\.?\s*)+/i, "").trim();
      const subprocessFullName = `${subIndex} ${cleanSubName || sub.name}`;

      if (!Array.isArray(sub.sipoc) || sub.sipoc.length === 0) {
        sub.sipoc = [
          {
            supplier: subprocessFullName,
            inputs: firstActInput,
            subprocess: subNarrative,
            outputs: lastActResult,
            customer: subActors
          }
        ];
      } else {
        sub.sipoc = sub.sipoc.map((s) => {
          const cleanP = (s.subprocess && s.subprocess.trim() !== sub.name.trim() && s.subprocess.trim() !== cleanSubName) ? s.subprocess : subNarrative;
          return {
            ...s,
            supplier: s.supplier && s.supplier.trim() ? s.supplier : subprocessFullName,
            inputs: s.inputs && s.inputs.trim() ? s.inputs : firstActInput,
            subprocess: cleanP,
            outputs: s.outputs && s.outputs.trim() ? s.outputs : lastActResult,
            customer: s.customer && s.customer.trim() ? s.customer : subActors
          };
        });
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

    if (!updated.stateMachine) {
      updated.stateMachine = { states: [], initialState: "", transitions: [], custodyTransfers: [], exceptions: [], slaRules: [] };
    }

    let currentStartEvents = getStartEvents(updated);
    let targetSubIdx = startForm.targetSubprocessIndex;

    // Handle creation of a new initial subprocess if user selected __NEW__ or entered custom name
    if ((isNewInitialSub || targetSubIdx === "__NEW__" || updated.subprocesses.length === 0) && customInitialSubName.trim()) {
      const nextIdx = `4.${updated.subprocesses.length + 1}`;
      const newSubName = customInitialSubName.trim();
      const newSub: SubprocessDefinition = {
        index: nextIdx,
        name: newSubName,
        narrative: `Subproceso de ${newSubName}`,
        startEventId: startForm.id,
        sipoc: [
          {
            supplier: `${nextIdx} ${newSubName}`,
            inputs: startForm.trigger || "Gatillo de Inicio",
            subprocess: `Transformación y ejecución de ${newSubName}`,
            outputs: startForm.endTrigger || updated.processOutputs || "Entregable Registrado",
            customer: updated.responsibleRole || "Operador de Proceso"
          }
        ],
        activities: [
          {
            index: `${nextIdx}.1`,
            name: `Ejecutar ${newSubName}`,
            description: `Se inicia la gestión de ${newSubName} conforme al gatillo de entrada.`,
            supportTech: "Sistema de Gestión Institucional / SIH",
            infoInputs: startForm.trigger || "Gatillo de Inicio",
            result: `${newSubName} Ejecutado`,
            rules: "No tiene",
            variants: "No tiene"
          }
        ]
      };
      updated.subprocesses.push(newSub);
      targetSubIdx = nextIdx;
    }

    const newStartEventObj: BpmnStartEvent = {
      id: startForm.id || `start_${Date.now()}`,
      name: startForm.name.trim() || `EVENTO DE INICIO ${currentStartEvents.length + 1}`,
      trigger: startForm.trigger.trim() || "Gatillo de inicio",
      targetSubprocessIndex: targetSubIdx || updated.subprocesses[0]?.index || "4.1",
      endTrigger: startForm.endTrigger.trim() || "Entregable final de proceso"
    };

    const existingIdx = currentStartEvents.findIndex((s) => s.id === startForm.id);
    if (existingIdx >= 0) {
      currentStartEvents[existingIdx] = newStartEventObj;
    } else {
      currentStartEvents.push(newStartEventObj);
    }

    // Explicitly link target subprocess to this start event
    if (targetSubIdx && targetSubIdx !== "__NEW__") {
      const subObj = updated.subprocesses.find((s) => s.index === targetSubIdx || s.name === targetSubIdx);
      if (subObj) {
        subObj.startEventId = newStartEventObj.id;
      }
    }

    updated.stateMachine.startEvents = currentStartEvents;

    // Keep scopeStart & scopeEnd in sync with primary start event
    if (currentStartEvents.length > 0) {
      updated.scopeStart = currentStartEvents[0].trigger;
      if (currentStartEvents[0].endTrigger) {
        updated.scopeEnd = currentStartEvents[0].endTrigger;
      }
    }

    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setStartModalOpen(false);
  };

  // Handler: Delete Start Event
  const handleDeleteStartEvent = (stId: string) => {
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    if (updated.stateMachine?.startEvents) {
      updated.stateMachine.startEvents = updated.stateMachine.startEvents.filter((s) => s.id !== stId);
    }
    updated.subprocesses.forEach((s) => {
      if (s.startEventId === stId) {
        delete s.startEventId;
      }
    });
    const synced = syncProcessModel(updated);
    if (onProcessChange) onProcessChange(synced);
    setStartModalOpen(false);
  };

  // Handler: Save End Event
  const handleSaveEndEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
    updated.scopeEnd = endForm.scopeEnd;

    if (!updated.stateMachine) {
      updated.stateMachine = { states: [], initialState: "", transitions: [], custodyTransfers: [], exceptions: [], slaRules: [] };
    }

    const currentStartEvents = getStartEvents(updated);
    currentStartEvents.forEach((st) => {
      if (!endForm.associatedStartEventId || st.id === endForm.associatedStartEventId) {
        st.endTrigger = endForm.scopeEnd;
      }
    });
    updated.stateMachine.startEvents = currentStartEvents;

    // Link associated subprocess if selected
    if (endForm.associatedSubprocessIndex) {
      const sub = updated.subprocesses.find((s) => s.index === endForm.associatedSubprocessIndex);
      if (sub && Array.isArray(sub.sipoc) && sub.sipoc.length > 0) {
        sub.sipoc[0].outputs = endForm.scopeEnd;
      }
    }

    // Parse alternate terminal states (e.g. "Rechazado, Quarantined")
    if (endForm.alternateStates) {
      const altStates = endForm.alternateStates.split(",").map((s) => s.trim()).filter(Boolean);
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

    const cleanForm = {
      ...gatewayForm,
      conditionFalseTarget: gatewayForm.type === "COMPLEX_JOIN" ? "" : gatewayForm.conditionFalseTarget
    };

    if (editingGatewayId) {
      const idx = updated.stateMachine.gateways.findIndex((g) => g.id === editingGatewayId);
      if (idx !== -1) {
        updated.stateMachine.gateways[idx] = {
          ...cleanForm,
          id: editingGatewayId
        };
      }
    } else {
      const newGateway: BpmnGateway = {
        ...cleanForm,
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

  const handleDeleteArtifactFromManager = (type: string, id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Eliminar Artefacto: ${name}`,
      message: `¿Está seguro de que desea eliminar este artefacto del proceso? Esta acción puede alterar los flujos y transiciones del diagrama. No se puede deshacer.`,
      confirmText: "Eliminar definitivamente",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
        if (type === "START_EVENT") {
          if (updated.stateMachine?.startEvents) {
            updated.stateMachine.startEvents = updated.stateMachine.startEvents.filter((s) => s.id !== id);
          }
          updated.subprocesses.forEach((s) => {
            if (s.startEventId === id) {
              delete s.startEventId;
            }
          });
        } else if (type === "SUBPROCESS") {
          updated.subprocesses = updated.subprocesses.filter((s) => s.index !== id);
        } else if (type === "GATEWAY") {
          if (updated.stateMachine?.gateways) {
            updated.stateMachine.gateways = updated.stateMachine.gateways.filter((g) => g.id !== id);
          }
        }
        const synced = syncProcessModel(updated);
        if (onProcessChange) onProcessChange(synced);
      }
    });
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
            supportTech: "Sistema de Información Hospitalaria (SIH)",
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
      if (insertAfterSubIndex) {
        const pos = updated.subprocesses.findIndex((s) => s.index === insertAfterSubIndex);
        if (pos !== -1) {
          updated.subprocesses.splice(pos + 1, 0, newSub);
        } else {
          updated.subprocesses.push(newSub);
        }
        setInsertAfterSubIndex(null);
      } else {
        updated.subprocesses.push(newSub);
      }
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
    const cleanSupportTech = actForm.supportTech
      ? standardizeSihSupportTech(actForm.supportTech, getActiveSihCatalog())
      : "No tiene";

    const targetSub = updated.subprocesses.find((s) => s.index === editingAct?.subIndex);
    if (!targetSub) return;

    if (editingAct?.actIndex && editingAct.actIndex !== "new") {
      // Edit activity
      const actIdx = targetSub.activities.findIndex((a) => a.index === editingAct.actIndex);
      if (actIdx !== -1) {
        targetSub.activities[actIdx] = {
          ...actForm,
          supportTech: cleanSupportTech,
          rules: cleanRules,
          variants: cleanVariants
        };
      }
    } else {
      // Add new activity
      const newActIndex = `${targetSub.index}.${targetSub.activities.length + 1}`;
      targetSub.activities.push({
        ...actForm,
        supportTech: cleanSupportTech,
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

  // Recursive renderer for BPMN Gateways (including chained gateways and JOINT gateways)
  const renderGatewayNode = (gw: BpmnGateway, stEventId?: string, visitedIds = new Set<string>()) => {
    if (visitedIds.has(gw.id)) return null;
    const nextVisited = new Set(visitedIds);
    nextVisited.add(gw.id);

    const childGateways = process.stateMachine?.gateways?.filter(
      (child) =>
        !nextVisited.has(child.id) &&
        child.id !== gw.id &&
        ((gw.name && gw.name.trim() !== "" && child.afterState === gw.name) || child.afterState === gw.id)
    ) || [];

    return (
      <React.Fragment key={gw.id}>
        {/* Rombo / Nodo Compuerta BPMN 2.0 */}
        <div className="flex flex-col items-center group relative" data-node-id={`gw-${gw.id}`}>
          {/* Nombre de la compuerta por encima del rombo */}
          <div className="text-[10px] font-bold text-amber-950 text-center max-w-[120px] mb-1 leading-tight flex items-center gap-1 justify-center">
            <span>{gw.name}</span>
            {gw.type === "COMPLEX_JOIN" && (
              <span className="bg-amber-200 text-amber-950 font-bold text-[8px] px-1 py-0.2 rounded border border-amber-300 shrink-0">
                JOINT
              </span>
            )}
          </div>

          <div className="w-14 h-14 bg-amber-50 border-2 border-amber-600 rotate-45 flex items-center justify-center shadow-sm relative group hover:bg-amber-100 transition-colors">
            <div className="-rotate-45 flex items-center justify-center text-amber-950 font-black select-none">
              {gw.type === "EXCLUSIVE_XOR" && (
                <span className="sr-only">XOR</span>
              )}
              {gw.type === "PARALLEL_AND" && (
                <svg className="w-8 h-8 text-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="4" x2="12" y2="20" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                </svg>
              )}
              {gw.type === "INCLUSIVE_OR" && (
                <svg className="w-8 h-8 text-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              )}
              {gw.type === "COMPLEX_JOIN" && (
                /* Símbolo de Unión JOINT (Convergencia) */
                <svg className="w-8 h-8 text-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" title="Compuerta JOINT (Unión / Convergente)">
                  <path d="M 4 6 L 11 12 L 18 12" />
                  <path d="M 4 18 L 11 12" />
                  <path d="M 15 9 L 18 12 L 15 15" fill="currentColor" />
                </svg>
              )}
            </div>

            {/* Botones de Acción en Compuerta */}
            {(isAdmin || docPerms.tobeDiagram.edit) && (
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
                      conditionFalseTarget: gw.conditionFalseTarget || "",
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
            )}
          </div>

          {/* Descripción Ramas Decisión / Destino de Unión (Hided if target is a measured node on canvas) */}
          <div className="mt-3 text-center space-y-0.5">
            {gw.type === "COMPLEX_JOIN" ? (
              !findTargetNodeId(gw.conditionTrueTarget) && (
                <div className="text-[9px] font-bold text-amber-950 flex items-center justify-center gap-1 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                  <span>Unión ➔</span>
                  <span className="underline">{gw.conditionTrueTarget || "Siguiente Estado"}</span>
                </div>
              )
            ) : (
              <>
                {!findTargetNodeId(gw.conditionTrueTarget) && (
                  <div className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                    <span>Sí ➔</span>
                    <span className="underline">{gw.conditionTrueTarget || "Siguiente Estado"}</span>
                  </div>
                )}
                {gw.conditionFalseTarget && !findTargetNodeId(gw.conditionFalseTarget) && (
                  <div className="text-[9px] font-bold text-rose-700 flex items-center justify-center gap-1">
                    <span>No ➔</span>
                    <span className="underline">{gw.conditionFalseTarget}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Flecha Conectora de Salida con Icono + en lado Derecho */}
        <div className="flex items-center text-slate-400 font-bold text-xs px-1 relative group/conn">
          <div className="w-3 h-0.5 bg-slate-300"></div>
          <button
            type="button"
            onClick={() => {
              setConnectorSource({
                type: "GATEWAY",
                id: gw.id,
                subName: gw.name,
                flowStartEventId: stEventId
              });
              setConnectorModalOpen(true);
            }}
            className="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 z-10 cursor-pointer"
            title="Conectar nuevo artefacto después de esta Compuerta"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <div className="w-3 h-0.5 bg-slate-300"></div>
          <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
        </div>

        {/* Chained Gateways connected from this Gateway */}
        {childGateways.map((cg) => renderGatewayNode(cg, stEventId, nextVisited))}
      </React.Fragment>
    );
  };

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
          {(isAdmin || docPerms.fce.view || docPerms.additionalDocs.view) && (
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
          )}
        </div>
      </div>

      <div className="p-6 lg:p-8">
        {activeTab === "fce" ? (
          /* FRAMEWORK 1: FACTORES CRÍTICOS DE ÉXITO (FCE) */
          !(isAdmin || docPerms.additionalDocs.view) ? (
            <div className="bg-rose-50 border border-rose-200 p-8 text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="text-base font-black text-rose-950 uppercase tracking-tight">Acceso Restringido</h3>
              <p className="text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
                El administrador del sistema ha deshabilitado el acceso a la Ficha de Indicadores y KPIs de este proceso.
              </p>
            </div>
          ) : (
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
                {(isAdmin || docPerms.additionalDocs.edit) && (
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
                        otherRanges: "< 90%",
                        isJciLinked: false,
                        jciStandard: "",
                        jciSupportType: "PROCESO"
                      });
                      setKpiModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Indicador KPI</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {process.kpis.map((kpi) => (
                  <div key={kpi.id} className="border border-slate-200 p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors relative group">
                    <div className="flex justify-between items-start">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                        {kpi.periodicity}
                      </span>
                      <div className="flex items-center gap-1">
                        {(isAdmin || docPerms.additionalDocs.edit) && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingKpiId(kpi.id);
                                setKpiForm({
                                  id: kpi.id,
                                  name: kpi.name,
                                  description: kpi.description,
                                  formula: kpi.formula,
                                  periodicity: kpi.periodicity,
                                  targetRange: kpi.targetRange,
                                  otherRanges: kpi.otherRanges,
                                  isJciLinked: kpi.isJciLinked ?? false,
                                  jciStandard: kpi.jciStandard ?? "",
                                  jciSupportType: (kpi.jciSupportType === "DOCUMENTAL" ? "DOCUMENTO" : kpi.jciSupportType === "PROCESAL" ? "PROCESO" : kpi.jciSupportType === "SISTEMICO" ? "SISTEMA" : kpi.jciSupportType) ?? "PROCESO"
                                });
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
                          </>
                        )}
                        <span className="text-xs text-slate-400 font-mono ml-1">#{kpi.id}</span>
                      </div>
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm mt-3">{kpi.name}</h5>

                    {/* JCI & SOPORTE BADGES */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {kpi.isJciLinked || (kpi.jciStandard && kpi.jciStandard.trim() !== "") ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-extrabold text-indigo-950 bg-indigo-100 px-2 py-0.5 border border-indigo-300 rounded-xs shadow-2xs">
                          <Award className="w-3 h-3 text-indigo-700 shrink-0" />
                          JCI: {kpi.jciStandard || "Asociado a JCI"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded-xs">
                          JCI: No Asociado
                        </span>
                      )}

                      {(kpi.jciSupportType === "DOCUMENTO" || kpi.jciSupportType === "DOCUMENTAL") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded-xs" title="Soporte: Contenido en Documento / Protocolo institucional">
                          📄 Documento
                        </span>
                      )}
                      {(kpi.jciSupportType === "PROCESO" || kpi.jciSupportType === "PROCESAL" || (!kpi.jciSupportType && kpi.isJciLinked)) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 border border-teal-200 rounded-xs" title="Soporte: Contenido en Proceso / Flujo Operativo">
                          🔄 Proceso
                        </span>
                      )}
                      {(kpi.jciSupportType === "SISTEMA" || kpi.jciSupportType === "SISTEMICO") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-50 px-1.5 py-0.5 border border-amber-300 rounded-xs" title="Soporte: Contenido en Sistema / Software SIH">
                          💻 Sistema (SIH)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2.5 leading-relaxed h-12 overflow-y-auto">
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
          )
        ) : (() => {
          /* FRAMEWORK 2: MODELO PROPUESTO (TO BE) */
          // Calculate dynamic section numbers according to visible components
          const canViewSec1 = isAdmin || docPerms.additionalDocs.view;
          const canViewSec2 = isAdmin || docPerms.generalInfo.view;
          const canViewSec3 = isAdmin || docPerms.fce.view;
          const canViewSec34 = isAdmin || docPerms.tobeDiagram.view;
          const canViewSec35 = isAdmin || docPerms.additionalDocs.view;
          const canViewSec4 = isAdmin || docPerms.procedureModel.view;

          const visibleCount = [canViewSec1, canViewSec2, canViewSec3, canViewSec34, canViewSec35, canViewSec4].filter(Boolean).length;
          const isSingleModule = visibleCount === 1;

          // Compute main section index numbers dynamically
          let mainCounter = 0;
          const numSec1 = canViewSec1 ? `${++mainCounter}.` : "";
          const numSec2 = canViewSec2 ? `${++mainCounter}.` : "";
          
          let numSec3 = "";
          let numSec31 = "";
          let numSec32 = "";
          let numSec34 = "";
          let numSec35 = "";

          if (canViewSec3) {
            const currentMain = ++mainCounter;
            numSec3 = `${currentMain}.`;
            numSec31 = `${currentMain}.1.`;
            numSec32 = `${currentMain}.2.`;
            numSec34 = canViewSec34 ? `${currentMain}.4.` : "";
            numSec35 = canViewSec35 ? `${currentMain}.5.` : "";
          } else {
            // If Section 3 is not visible, individual sub-sections get their own dynamic main numbers
            if (canViewSec34) {
              numSec34 = isSingleModule ? "1.0." : `${++mainCounter}.`;
            }
            if (canViewSec35) {
              numSec35 = isSingleModule ? "1.0." : `${++mainCounter}.`;
            }
          }

          let numSec4 = "";
          if (canViewSec4) {
            numSec4 = isSingleModule ? "1.0." : `${++mainCounter}.`;
          }

          // Calculate all unique SIPOC inputs (I) separated by comma
          const sipocInputsList = Array.from(
            new Set(
              process.subprocesses
                .flatMap((sub) => {
                  const firstActInput = sub.activities && sub.activities.length > 0 && sub.activities[0].infoInputs ? sub.activities[0].infoInputs : "";
                  const sipocInputs = Array.isArray(sub.sipoc) && sub.sipoc.length > 0 ? sub.sipoc.map((s) => s.inputs) : [];
                  return [firstActInput, ...sipocInputs];
                })
                .map((i) => (i || "").trim())
                .filter((i) => i.length > 0 && i !== "Insumo inicial del subproceso")
            )
          );

          // Calculate all unique SIPOC outputs (O) separated by comma
          const sipocOutputsList = Array.from(
            new Set(
              process.subprocesses
                .flatMap((sub) => {
                  const lastActResult = sub.activities && sub.activities.length > 0 && sub.activities[sub.activities.length - 1].result ? sub.activities[sub.activities.length - 1].result : "";
                  const sipocOutputs = Array.isArray(sub.sipoc) && sub.sipoc.length > 0 ? sub.sipoc.map((s) => s.outputs) : [];
                  return [lastActResult, ...sipocOutputs];
                })
                .map((o) => (o || "").trim())
                .filter((o) => o.length > 0 && o !== "Resultado final del subproceso")
            )
          );

          const displayProcessInputs = sipocInputsList.length > 0
            ? sipocInputsList.join(", ")
            : (process.processInputs || process.scopeStart || "No definidos");

          const displayProcessOutputs = sipocOutputsList.length > 0
            ? sipocOutputsList.join(", ")
            : (process.processOutputs || process.scopeEnd || "No definidos");

          return (
          <div className="space-y-12 animate-fadeIn max-w-none">
            {/* 1. Definiciones */}
            {canViewSec1 && (
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    {numSec1} Definiciones (Glosario Técnico)
                  </h4>
                  {(isAdmin || docPerms.additionalDocs.edit) && (
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
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {process.glossary.map((g, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 p-4 relative group">
                      <div className="flex justify-between items-start">
                        <strong className="text-xs font-bold text-slate-900 block">{g.term}</strong>
                        {(isAdmin || docPerms.additionalDocs.edit) && (
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
                        )}
                      </div>
                      <span className="text-xs text-slate-600 mt-1 block leading-relaxed">{g.definition}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. PROCESO */}
            {canViewSec2 && (
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-base font-bold text-slate-900">
                    {numSec2} PROCESO: {process.name.toUpperCase()}
                  </h4>
                  {(isAdmin || docPerms.generalInfo.edit) && (
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
                      <span>Editar Información General y Alcance ({numSec2 ? `${numSec2}1 - ${numSec2}2` : "2.1 - 2.2"})</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{numSec2 ? `${numSec2}1.` : "2.1."} Alcance del Proceso</h5>
                    <p className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 p-4">
                      El proceso trata de <span className="font-semibold text-slate-900">{process.scopeStart || "recepción de la solicitud"}</span>. El <span className="font-semibold text-slate-900">{process.name}</span> se puede realizar en la unidad de <span className="font-semibold text-slate-900">{process.processOwner || "la Unidad Responsable"}</span> y culmina con <span className="font-semibold text-slate-900">{process.scopeEnd || "el entregable finalizado"}</span>.
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{numSec2 ? `${numSec2}2.` : "2.2."} Descripción General del Proceso</h5>
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
            )}

            {/* 3.4. Modelo Descriptivo */}
            {canViewSec34 && (
              <section className="space-y-4" id="section-3-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    {numSec34} Modelo Descriptivo
                  </h4>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200 self-start sm:self-auto uppercase tracking-wider">
                    Metodología BPMN 2.0
                  </span>
                </div>

                {/* BARRA DE HERRAMIENTAS DE EDICIÓN BPMN 2.0 (SECCIÓN 3.4) */}
                {(isAdmin || docPerms.tobeDiagram.edit) && (
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
                      openStartEventModal(getStartEvents(process)[0]);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Editar Evento de Inicio (Gatillo) y Estado Inicial"
                  >
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>🟢 Evento de Inicio</span>
                  </button>

                  {/* Botón: Añadir Segundo Evento de Inicio */}
                  <button
                    type="button"
                    onClick={() => openStartEventModal()}
                    className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-sm border border-emerald-400"
                    title="Añadir un 2° o Múltiple Evento de Inicio para definir un Flujo Paralelo/Secundario"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>🟢 + Evento de Inicio</span>
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

                  {/* Botón: MANTENEDOR DE ARTEFACTOS (ACCESO EXCLUSIVO ADMINISTRADOR) */}
                  <button
                    type="button"
                    onClick={() => setArtifactManagerOpen(true)}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 shadow-md border border-purple-500 cursor-pointer"
                    title="Mantenedor de Artefactos del Diagrama (Acceso Exclusivo Administrador)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                    <span>🛡️ Mantenedor Artefactos {isAdmin ? "[ADMIN]" : ""}</span>
                  </button>
                </div>
              </div>
            )}

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
              {(isAdmin || docPerms.tobeDiagram.edit) && (
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
            )}

              {/* Diagrama BPMN 2.0 Interactivo de Subprocesos, Estados y Compuertas */}
              <div className="border border-slate-300 bg-slate-50 p-3 space-y-3 shadow-sm rounded-sm">
                {/* Header de Controles de Canvas */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-slate-900 font-extrabold text-sm">
                      Canvas Interactivo
                    </span>
                  </div>

                  {/* Controles de Red / Grid y Zoom */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Toggle Grid */}
                    <button
                      type="button"
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-1 border rounded transition-colors cursor-pointer ${
                        showGrid ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white text-slate-600 border-slate-300"
                      }`}
                      title="Alternar Malla de Fondo / Grid"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

                    {/* Control de Zoom Scale y Fit (3.1) */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-300">
                      <span className="text-[10px] font-bold text-slate-700 px-1 flex items-center gap-1">
                        <ZoomIn className="w-3 h-3 text-slate-800" />
                        <span>Zoom:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.max(0.3, Math.round((prev - 0.1) * 10) / 10))}
                        className="p-1 bg-white hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 rounded shadow-2xs cursor-pointer flex items-center justify-center"
                        title="Alejar / Zoom Out (-10%)"
                      >
                        <ZoomOut className="w-3.5 h-3.5 text-slate-900" />
                      </button>
                      <span className="text-[11px] font-black text-slate-900 w-11 text-center select-none font-mono">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale((prev) => Math.min(1.8, Math.round((prev + 0.1) * 10) / 10))}
                        className="p-1 bg-white hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 rounded shadow-2xs cursor-pointer flex items-center justify-center"
                        title="Acercar / Zoom In (+10%)"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-slate-900" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoFitDiagram}
                        className="px-2 py-0.5 bg-blue-700 text-white hover:bg-blue-800 text-[10px] font-bold rounded shadow-2xs cursor-pointer ml-1 flex items-center gap-1"
                        title="Ajustar y ver 100% de los componentes en pantalla"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Ajustar Pantalla</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomScale(1.0)}
                        className="px-2 py-0.5 bg-slate-800 text-white hover:bg-slate-900 text-[10px] font-bold rounded shadow-2xs cursor-pointer"
                        title="Zoom Real 100%"
                      >
                        100% Real
                      </button>
                    </div>
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
                    ref={canvasContainerRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUpOrLeave}
                    onMouseLeave={handleCanvasMouseUpOrLeave}
                    style={{ height: `${canvasHeight}px`, minHeight: `${canvasHeight}px` }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const bpmnType = e.dataTransfer.getData("application/bpmn-element");
                      if (bpmnType === "START_EVENT") {
                        openStartEventModal();
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
                          alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined",
                          associatedStartEventId: "",
                          associatedSubprocessIndex: ""
                        });
                        setEndModalOpen(true);
                      }
                    }}
                    className={`flex-1 overflow-x-auto overflow-y-auto p-6 transition-all relative flex select-none ${
                      isPanning ? "cursor-grabbing" : "cursor-grab"
                    } ${
                      showGrid ? "bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]" : "bg-white"
                    }`}
                  >
                    <div
                      style={{
                        width: contentBounds.width ? `${contentBounds.width * zoomScale}px` : "auto",
                        height: contentBounds.height ? `${contentBounds.height * zoomScale}px` : "auto",
                      }}
                      className="m-auto relative flex items-start justify-start shrink-0"
                    >
                      <div
                        ref={diagramContentRef}
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: "top left"
                        }}
                        className="relative flex flex-col items-start gap-6 min-w-max py-4 px-4 divide-y divide-dashed divide-slate-200 transition-transform duration-200"
                      >
                      {getStartEvents(process).map((stEvent, stIdx, allStartEvents) => {
                        const flowSubs = getSubprocessesForStartEvent(process, stEvent, stIdx, allStartEvents);

                        return (
                          <div key={stEvent.id} className="flex items-center gap-10 pt-4 first:pt-0 relative">
                            {/* Flag / Tag de Flujo Secundario si hay más de 1 evento de inicio */}
                            {allStartEvents.length > 1 && (
                              <div className="absolute -top-1.5 left-0 bg-slate-800 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-b-xs shadow-2xs z-10 flex items-center gap-1.5">
                                <span>FLUJO DE PROCESO #{stIdx + 1}</span>
                                {stIdx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStartEvent(stEvent.id)}
                                    className="ml-1 text-rose-300 hover:text-white font-black"
                                    title="Eliminar este Evento de Inicio"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Evento de Inicio (Círculo Verde BPMN 2.0) */}
                            <div className="flex flex-col items-center group relative mt-2" data-node-id={`start-${stEvent.id}`}>
                              <button
                                type="button"
                                onClick={() => openStartEventModal(stEvent)}
                                className="w-13 h-13 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-md transition-transform hover:scale-110 relative"
                                title="Editar este Evento de Inicio"
                              >
                                <span className="w-4 h-4 bg-emerald-600 rounded-full"></span>
                                <div className="absolute -top-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Edit2 className="w-2.5 h-2.5" />
                                </div>
                              </button>
                              <span className="text-[11px] font-bold text-emerald-800 mt-2 text-center max-w-[120px] uppercase">
                                {stEvent.name || "EVENTO DE INICIO"}
                              </span>
                              <span className="text-[10px] text-slate-600 text-center max-w-[140px] italic line-clamp-2 mt-0.5">
                                {stEvent.trigger || "Gatillo de Inicio"}
                              </span>
                            </div>

                            {/* Conector Flecha con Icono + (3.2) */}
                            <div className="flex items-center text-slate-400 font-bold text-xs px-1 relative group/conn">
                              <div className="w-4 h-0.5 bg-slate-300"></div>
                              <button
                                type="button"
                                onClick={() => {
                                  setConnectorSource({
                                    type: "START_EVENT",
                                    id: stEvent.id,
                                    flowStartEventId: stEvent.id
                                  });
                                  setConnectorModalOpen(true);
                                }}
                                className="w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 z-10 cursor-pointer"
                                title="Conectar nuevo artefacto después de este Evento de Inicio"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                              <div className="w-4 h-0.5 bg-slate-300"></div>
                              <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                            </div>

                            {/* Renderizar compuertas conectadas directamente al Evento de Inicio si existen */}
                            {process.stateMachine?.gateways
                              ?.filter((g) => g.afterState === stEvent.id || g.afterState === stEvent.name)
                              .map((gw) => renderGatewayNode(gw, stEvent.id))}

                            {/* Subprocesos y Compuertas BPMN 2.0 en este flujo */}
                            {flowSubs.map((sub) => {
                              const sIdx = process.subprocesses.findIndex((s) => s.index === sub.index);
                              const slaRule = process.stateMachine?.slaRules?.find((s) => s.state === sub.name);
                              const matchingGateways = process.stateMachine?.gateways?.filter((g) => g.afterState === sub.name || g.afterState === sub.index) || [];
                              const isDragging = draggedSubIndex === sIdx;
                              const isDragOver = dragOverSubIndex === sIdx;

                              return (
                                <React.Fragment key={sub.index}>
                                  {/* Tarjeta de Subproceso / Estado */}
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
                                    data-node-id={`sub-${sub.index}`}
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

                                      {/* Indicador Estándar BPMN 2.0 Subproceso Colapsado [+] */}
                                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-800 w-4 h-4 rounded-xs flex items-center justify-center shadow-xs text-slate-900 font-extrabold text-[10px]" title="Símbolo BPMN 2.0 de Subproceso">
                                        +
                                      </div>
                                    </div>
                                  </div>

                                  {/* Conector Flecha entre Estados con Icono + (3.2) */}
                                  <div className="flex items-center text-slate-400 font-bold text-xs px-1 relative group/conn">
                                    <div className="w-4 h-0.5 bg-slate-300"></div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConnectorSource({
                                          type: "SUBPROCESS",
                                          subIndex: sub.index,
                                          subName: sub.name,
                                          flowStartEventId: stEvent.id
                                        });
                                        setConnectorModalOpen(true);
                                      }}
                                      className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 z-10 cursor-pointer"
                                      title={`Conectar nuevo artefacto después de Subproceso ${sub.index}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                    <div className="w-4 h-0.5 bg-slate-300"></div>
                                    <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                                  </div>

                                  {/* Renderizar Compuertas BPMN si existen después de este estado */}
                                  {matchingGateways.map((gw) => renderGatewayNode(gw, stEvent.id))}
                                  {false && matchingGateways.map((gw) => (
                                    <React.Fragment key={gw.id}>
                                      {/* Flecha Conectora a Compuerta con Icono + (3.2) */}
                                      <div className="flex items-center text-slate-400 font-bold text-xs px-1 relative group/conn">
                                        <div className="w-3 h-0.5 bg-slate-300"></div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConnectorSource({
                                              type: "GATEWAY",
                                              id: gw.id,
                                              subName: gw.afterState,
                                              flowStartEventId: stEvent.id
                                            });
                                            setConnectorModalOpen(true);
                                          }}
                                          className="w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 z-10 cursor-pointer"
                                          title="Conectar nuevo artefacto después de esta Compuerta"
                                        >
                                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                        </button>
                                        <div className="w-3 h-0.5 bg-slate-300"></div>
                                        <ArrowRight className="w-4 h-4 -ml-1 text-slate-400" />
                                      </div>

                                      {/* Rombo / Nodo Compuerta BPMN 2.0 */}
                                      <div className="flex flex-col items-center group relative">
                                        {/* Nombre de la compuerta por encima del rombo */}
                                        <div className="text-[10px] font-bold text-amber-950 text-center max-w-[110px] mb-1 leading-tight">
                                          {gw.name}
                                        </div>

                                        <div className="w-14 h-14 bg-amber-50 border-2 border-amber-600 rotate-45 flex items-center justify-center shadow-sm relative group hover:bg-amber-100 transition-colors">
                                          <div className="-rotate-45 flex items-center justify-center text-amber-950 font-black select-none">
                                            {gw.type === "EXCLUSIVE_XOR" && (
                                              /* b. Tipo XOR (Compuerta simple, sin elementos en su interior) */
                                              <span className="sr-only">XOR</span>
                                            )}
                                            {gw.type === "PARALLEL_AND" && (
                                              /* c. Tipo AND (Compuerta con símbolo + en su interior occupying >=50% of diamond) */
                                              <svg className="w-8 h-8 text-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="4" x2="12" y2="20" />
                                                <line x1="4" y1="12" x2="20" y2="12" />
                                              </svg>
                                            )}
                                            {gw.type === "INCLUSIVE_OR" && (
                                              /* d. Tipo OR (Compuerta con círculo O en su interior occupying >=50% of diamond) */
                                              <svg className="w-8 h-8 text-amber-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                                                <circle cx="12" cy="12" r="8" />
                                              </svg>
                                            )}
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
                                </React.Fragment>
                              );
                            })}

                            {/* Si no hay subprocesos en este flujo todavía */}
                            {flowSubs.length === 0 && (
                              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center text-slate-400 text-xs italic min-w-[160px]">
                                Sin subprocesos asignados <br />
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
                                      slaAction: "Escalamiento preventivo",
                                      initialActivityName: "Ejecutar Verificación Inicial"
                                    });
                                    setSubModalOpen(true);
                                  }}
                                  className="text-blue-600 underline font-bold mt-1 inline-block"
                                >
                                  + Agregar Subproceso aquí
                                </button>
                              </div>
                            )}

                            {/* Evento de Término (Círculo Rojo BPMN 2.0) con Icono + (3.2) */}
                            <div className="flex flex-col items-center group relative mt-2" data-node-id={`end-${stEvent.id}`}>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const flowSubs = getSubprocessesForStartEvent(process, stEvent, stIdx, getStartEvents(process));
                                    const lastSubInFlow = flowSubs[flowSubs.length - 1];
                                    setEndForm({
                                      scopeEnd: stEvent.endTrigger || process.scopeEnd || "",
                                      alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined",
                                      associatedStartEventId: stEvent.id,
                                      associatedSubprocessIndex: lastSubInFlow?.index || process.subprocesses[process.subprocesses.length - 1]?.index || ""
                                    });
                                    setEndModalOpen(true);
                                  }}
                                  className="w-13 h-13 rounded-full bg-rose-100 border-4 border-rose-600 flex items-center justify-center text-rose-700 shadow-md transition-transform hover:scale-110 relative"
                                  title="Editar Evento de Término para este flujo"
                                >
                                  <span className="w-4 h-4 bg-rose-600 rounded-full"></span>
                                  <div className="absolute -top-1 -right-1 bg-slate-900 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConnectorSource({
                                      type: "END_EVENT",
                                      id: stEvent.id,
                                      flowStartEventId: stEvent.id
                                    });
                                    setConnectorModalOpen(true);
                                  }}
                                  className="w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 z-10 cursor-pointer"
                                  title="Conectar o agregar nuevo Flujo / Evento"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </div>
                              <span className="text-[11px] font-bold text-rose-800 mt-2 text-center max-w-[120px] uppercase">
                                EVENTO DE TÉRMINO
                              </span>
                              <span className="text-[10px] text-slate-600 text-center max-w-[140px] italic line-clamp-2 mt-0.5">
                                {stEvent.endTrigger || process.scopeEnd || "Entregable Finalizado"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dynamic BPMN Connections Overlay for Vertical and Advanced Divergent Flows */}
                      <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
                        <defs>
                          <marker
                            id="arrow-head-blue"
                            markerWidth="10"
                            markerHeight="10"
                            refX="6"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M0,0 L0,6 L6,3 Z" fill="#2563eb" />
                          </marker>
                        </defs>
                        
                        {(() => {
                          const lines: React.ReactNode[] = [];
                          if (!process.stateMachine?.gateways) return null;
                          
                          process.stateMachine.gateways.forEach((gw) => {
                            // Affirmative Path (Yes / True)
                            const trueTargetId = findTargetNodeId(gw.conditionTrueTarget);
                            if (trueTargetId) {
                              const posA = elementPositions[`gw-${gw.id}`];
                              const posB = elementPositions[trueTargetId];
                              if (posA && posB && Math.abs(posA.y - posB.y) >= 50) {
                                const x1 = posA.x + posA.w / 2;
                                const y1 = posA.y + posA.h;
                                const x2 = posB.x + posB.w / 2;
                                const y2 = posB.y;
                                const yM = (y1 + y2) / 2;
                                
                                let d = "";
                                if (Math.abs(x1 - x2) < 20) {
                                  d = `M ${x1} ${y1} L ${x1} ${y2}`;
                                } else {
                                  d = `M ${x1} ${y1} L ${x1} ${yM} L ${x2} ${yM} L ${x2} ${y2}`;
                                }
                                
                                lines.push(
                                  <path
                                    key={`line-true-${gw.id}`}
                                    d={d}
                                    fill="none"
                                    stroke="#2563eb"
                                    strokeWidth="2"
                                    markerEnd="url(#arrow-head-blue)"
                                  />
                                );
                              }
                            }
                            
                            // Negative Path (No / False)
                            const falseTargetId = findTargetNodeId(gw.conditionFalseTarget);
                            if (falseTargetId) {
                              const posA = elementPositions[`gw-${gw.id}`];
                              const posB = elementPositions[falseTargetId];
                              if (posA && posB && Math.abs(posA.y - posB.y) >= 50) {
                                const x1 = posA.x + posA.w / 2;
                                const y1 = posA.y + posA.h;
                                const x2 = posB.x + posB.w / 2;
                                const y2 = posB.y;
                                const yM = (y1 + y2) / 2;
                                
                                let d = "";
                                if (Math.abs(x1 - x2) < 20) {
                                  d = `M ${x1} ${y1} L ${x1} ${y2}`;
                                } else {
                                  d = `M ${x1} ${y1} L ${x1} ${yM} L ${x2} ${yM} L ${x2} ${y2}`;
                                }
                                
                                lines.push(
                                  <path
                                    key={`line-false-${gw.id}`}
                                    d={d}
                                    fill="none"
                                    stroke="#2563eb"
                                    strokeWidth="2"
                                    markerEnd="url(#arrow-head-blue)"
                                  />
                                );
                              }
                            }
                          });
                          return lines;
                        })()}
                      </svg>

                      {/* Dynamic HTML Labels and Plus Buttons Overlay Layer */}
                      <div className="absolute inset-0 pointer-events-none z-20">
                        {(() => {
                          const overlays: React.ReactNode[] = [];
                          if (!process.stateMachine?.gateways) return null;
                          
                          process.stateMachine.gateways.forEach((gw) => {
                            const gwNodeId = `gw-${gw.id}`;
                            const posA = elementPositions[gwNodeId];
                            if (!posA) return;
                            
                            const flowStartEventId = (gw.afterState && getStartEvents(process).find(st => st.id === gw.afterState || st.name === gw.afterState)?.id) || "start-1";
                            
                            // Affirmative Path Labels (skip if COMPLEX_JOIN / JOINT)
                            if (gw.type !== "COMPLEX_JOIN") {
                              const trueTargetId = findTargetNodeId(gw.conditionTrueTarget);
                              if (trueTargetId) {
                                const posB = elementPositions[trueTargetId];
                                if (posB) {
                                  const isVertical = Math.abs(posA.y - posB.y) >= 50;
                                  if (isVertical) {
                                    const x1 = posA.x + posA.w / 2;
                                    const y1 = posA.y + posA.h;
                                    const x2 = posB.x + posB.w / 2;
                                    const y2 = posB.y;
                                    const xm = (x1 + x2) / 2;
                                    const ym = (y1 + y2) / 2;
                                    
                                    overlays.push(
                                      <React.Fragment key={`overlay-true-v-${gw.id}`}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConnectorSource({
                                              type: "GATEWAY",
                                              id: gw.id,
                                              subName: gw.name,
                                              flowStartEventId: flowStartEventId
                                            });
                                            setConnectorModalOpen(true);
                                          }}
                                          className="absolute pointer-events-auto w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 cursor-pointer"
                                          style={{
                                            left: `${xm}px`,
                                            top: `${ym}px`,
                                            transform: "translate(-50%, -50%)"
                                          }}
                                          title="Conectar nuevo artefacto en flujo vertical"
                                        >
                                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                        </button>
                                        <div
                                          className="absolute text-[10px] font-bold text-emerald-700 bg-white/95 px-2 py-0.5 rounded shadow-sm border border-emerald-100 whitespace-nowrap"
                                          style={{
                                            left: `${xm + 16}px`,
                                            top: `${ym}px`,
                                            transform: "translate(0, -50%)"
                                          }}
                                        >
                                          Sí
                                        </div>
                                      </React.Fragment>
                                    );
                                  } else {
                                    const xm = (posA.x + posA.w + posB.x) / 2;
                                    const ym = posA.y + posA.h / 2 - 20;
                                    overlays.push(
                                      <div
                                        key={`overlay-true-h-${gw.id}`}
                                        className="absolute text-[10px] font-bold text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded whitespace-nowrap shadow-2xs"
                                        style={{
                                          left: `${xm}px`,
                                          top: `${ym}px`,
                                          transform: "translate(-50%, -50%)"
                                        }}
                                      >
                                        Sí
                                      </div>
                                    );
                                  }
                                }
                              }
                            }
                            
                            // Negative Path Labels
                            const falseTargetId = findTargetNodeId(gw.conditionFalseTarget);
                            if (falseTargetId) {
                              const posB = elementPositions[falseTargetId];
                              if (posB) {
                                const isVertical = Math.abs(posA.y - posB.y) >= 50;
                                if (isVertical) {
                                  const x1 = posA.x + posA.w / 2;
                                  const y1 = posA.y + posA.h;
                                  const x2 = posB.x + posB.w / 2;
                                  const y2 = posB.y;
                                  const xm = (x1 + x2) / 2;
                                  const ym = (y1 + y2) / 2;
                                  
                                  overlays.push(
                                    <React.Fragment key={`overlay-false-v-${gw.id}`}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConnectorSource({
                                            type: "GATEWAY",
                                            id: gw.id,
                                            subName: gw.name,
                                            flowStartEventId: flowStartEventId
                                          });
                                          setConnectorModalOpen(true);
                                        }}
                                        className="absolute pointer-events-auto w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md transition-transform hover:scale-125 cursor-pointer"
                                        style={{
                                          left: `${xm}px`,
                                          top: `${ym}px`,
                                          transform: "translate(-50%, -50%)"
                                        }}
                                        title="Conectar nuevo artefacto en flujo vertical"
                                      >
                                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                      </button>
                                      <div
                                        className="absolute text-[10px] font-bold text-rose-700 bg-white/95 px-2 py-0.5 rounded shadow-sm border border-rose-100 whitespace-nowrap"
                                        style={{
                                          left: `${xm + 16}px`,
                                          top: `${ym}px`,
                                          transform: "translate(0, -50%)"
                                        }}
                                      >
                                        No
                                      </div>
                                    </React.Fragment>
                                  );
                                } else {
                                  const xm = (posA.x + posA.w + posB.x) / 2;
                                  const ym = posA.y + posA.h / 2 + 20;
                                  overlays.push(
                                    <div
                                      key={`overlay-false-h-${gw.id}`}
                                      className="absolute text-[10px] font-bold text-rose-700 bg-white/80 px-1.5 py-0.5 rounded whitespace-nowrap shadow-2xs"
                                      style={{
                                        left: `${xm}px`,
                                        top: `${ym}px`,
                                        transform: "translate(-50%, -50%)"
                                      }}
                                    >
                                      No
                                    </div>
                                  );
                                }
                              }
                            }
                            

                          });
                          return overlays;
                        })()}
                      </div>
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
          )}

            {/* 3. Ficha Descriptiva del Proceso */}
            {canViewSec3 && (
              <section className="space-y-4" id="section-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {numSec3} Ficha Descriptiva del Proceso
                  </h4>
                  <div className="flex items-center gap-2">
                    {(isAdmin || docPerms.riskMatrix.edit) && (
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
                    )}
                    {(isAdmin || docPerms.fce.edit) && (
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
                            processInputs: process.processInputs || displayProcessInputs,
                            processOutputs: process.processOutputs || displayProcessOutputs
                          });
                          setGeneralModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Ficha Descriptiva</span>
                      </button>
                    )}
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
                        <td className="p-3 text-slate-800 font-medium">{displayProcessInputs}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-3 bg-slate-50 font-bold text-slate-700">Resultados / Entregables</td>
                        <td className="p-3 text-slate-800 font-medium">{displayProcessOutputs}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-3 bg-slate-50 font-bold text-slate-700">Proveedores / Relaciones</td>
                        <td className="p-3 text-slate-600">{process.suppliers}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-3 bg-slate-50 font-bold text-slate-700">Usuarios / Destinatarios</td>
                        <td className="p-3 text-slate-600">{process.customers}</td>
                      </tr>
                      {(isAdmin || docPerms.riskMatrix.view) && (
                        <tr>
                          <td className="p-3 bg-slate-50 font-bold text-slate-700">Riesgos Identificados</td>
                          <td className="p-3 text-slate-600">
                            <ul className="space-y-1.5">
                              {process.risks.map((risk, i) => (
                                <li key={i} className="flex items-center justify-between group bg-slate-50/60 p-1.5 border border-slate-100 rounded">
                                  <span className="text-xs text-slate-800 font-medium">&bull; {risk}</span>
                                  {(isAdmin || docPerms.riskMatrix.edit) && (
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
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 3.5. Matriz SIPOC */}
            {canViewSec35 && (
              <section className="space-y-4" id="section-3-5">
              <h4 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-500" />
                  {numSec35} Ficha de Subprocesos (Matriz SIPOC)
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-normal">
                  Ref. BPMN 2.0
                </span>
              </h4>
              <div className="border border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider font-bold text-[10px]">
                      <th className="p-3 min-w-[150px]">S (Subproceso)</th>
                      <th className="p-3 min-w-[160px]">I (Entrada)</th>
                      <th className="p-3 min-w-[200px]">P (Procesamiento)</th>
                      <th className="p-3 min-w-[160px]">O (Resultado)</th>
                      <th className="p-3 min-w-[150px]">C (Usuarios o Destinatarios)</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {process.subprocesses.flatMap((sub) => {
                      const firstActInput = sub.activities && sub.activities.length > 0 && sub.activities[0].infoInputs ? sub.activities[0].infoInputs : "";
                      const lastActResult = sub.activities && sub.activities.length > 0 && sub.activities[sub.activities.length - 1].result ? sub.activities[sub.activities.length - 1].result : "";
                      const subNarrative = sub.narrative || (sub.activities && sub.activities.length > 0 ? sub.activities.map(a => a.description).filter(Boolean).join(" ") : `Resumen de transformación de ${sub.name}`);
                      const subActors = getSubprocessHumanRoles(sub, process.responsibleRole || process.customers);
                      const cleanSubName = sub.name.replace(/^(\(?4\.\d+\)?\.?\s*)+/i, "").trim();
                      const displayS = `${sub.index} ${cleanSubName || sub.name}`;

                      const sipocList = Array.isArray(sub.sipoc) && sub.sipoc.length > 0 ? sub.sipoc : [
                        {
                          supplier: displayS,
                          inputs: firstActInput || "Insumo inicial del subproceso",
                          subprocess: subNarrative,
                          outputs: lastActResult || "Resultado final del subproceso",
                          customer: subActors || "Usuarios o Destinatarios"
                        }
                      ];

                      return sipocList.map((s, idx) => {
                        const displayP = (s.subprocess && s.subprocess.trim() !== sub.name.trim() && s.subprocess.trim() !== cleanSubName) ? s.subprocess : subNarrative;
                        const displayI = firstActInput || s.inputs || "Insumo inicial del subproceso";
                        const displayO = lastActResult || s.outputs || "Resultado final del subproceso";
                        const displayC = subActors || s.customer;

                        return (
                          <tr key={`${sub.index}-${idx}`} id={`sipoc-sub-${sub.index}`} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              {displayS}
                            </td>
                            <td className="p-3 text-slate-600">
                              {displayI}
                            </td>
                            <td className="p-3 text-slate-700">
                              {displayP}
                            </td>
                            <td className="p-3 text-slate-600">
                              {displayO}
                            </td>
                            <td className="p-3 text-slate-700 font-medium">
                              {displayC}
                            </td>
                            <td className="p-3 text-right">
                              {(isAdmin || docPerms.additionalDocs.edit) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSipocSubIndex(sub.index);
                                    setSipocForm({
                                      supplier: displayS,
                                      inputs: displayI,
                                      subprocess: displayP,
                                      outputs: displayO,
                                      customer: displayC
                                    });
                                    setSipocModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded inline-flex items-center gap-1 shadow-2xs"
                                  title="Editar Ficha SIPOC de este Subproceso"
                                >
                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                  <span>Editar SIPOC</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

            {/* 4. PROCEDIMIENTO MODELO DE NIVEL OPERATIVO (EDITABLE) */}
            {canViewSec4 && (
              <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {numSec4} DESCRIPCIÓN DEL PROCEDIMIENTO MODELO DE NIVEL OPERATIVO
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

                  {(isAdmin || docPerms.procedureModel.edit) && (
                    <button
                      type="button"
                      onClick={handleStandardizeAllSihSupportTech}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Estandarizar y homologar automáticamente todos los nombres de Apoyo Tecnológico SIH en las fichas del proceso"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                      Estandarizar Nombres SIH
                    </button>
                  )}

                  {(isAdmin || docPerms.procedureModel.edit) && (
                    <button
                      onClick={() => {
                        setEditingSubIndex(null);
                        setSubForm({ index: `4.${process.subprocesses.length + 1}`, name: "", narrative: "" });
                        setSubModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 ml-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Subproceso
                    </button>
                  )}
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
                    {(isAdmin || docPerms.procedureModel.edit) && (
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
                    )}
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
                            {(isAdmin || docPerms.procedureModel.edit) && sIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveSubprocess(sub.index, "up")}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded"
                                title="Mover Subproceso Arriba"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(isAdmin || docPerms.procedureModel.edit) && sIdx < process.subprocesses.length - 1 && (
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
                            {(isAdmin || docPerms.procedureModel.edit) && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>

                      {/* Subprocess Content (Collapsible) */}
                      {!isCollapsed && (
                        <div className="p-6 space-y-4 animate-fadeIn">
                          <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                            {sub.narrative}
                          </p>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            {sub.activities.map((act, aIdx) => (
                              <div key={act.index} className="bg-white border border-slate-200 p-4 space-y-3 relative group hover:border-slate-400 transition-colors shadow-xs">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5">
                                    Ficha {act.index}
                                  </span>
                                  
                                  <div className="flex items-center gap-1">
                                    {/* Reorder Activity Up / Down */}
                                    {(isAdmin || docPerms.procedureModel.edit) && sub.activities.findIndex((a) => a.index === act.index) > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveActivity(sub.index, act.index, "up")}
                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-sm"
                                        title="Mover Actividad Arriba"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {(isAdmin || docPerms.procedureModel.edit) && sub.activities.findIndex((a) => a.index === act.index) < sub.activities.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveActivity(sub.index, act.index, "down")}
                                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-sm"
                                        title="Mover Actividad Abajo"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {(isAdmin || docPerms.procedureModel.edit) && (
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
                                    )}
                                    {(isAdmin || docPerms.procedureModel.edit) && (
                                      <button
                                        onClick={() => handleDeleteActivity(sub.index, act.index)}
                                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-sm"
                                        title="Eliminar Actividad"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <h6 className="font-bold text-xs text-slate-900">{act.name}</h6>
                                
                                <div className="space-y-2 text-[11px] leading-relaxed">
                                  <p className="text-slate-600">
                                    <span className="font-bold text-slate-800">Descripción:</span> {act.description}
                                  </p>
                                  <div className="text-slate-600 flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <span className="font-bold text-slate-800">JCI:</span>{" "}
                                    {(() => {
                                      const displayVal =
                                        act.jciAttribute && act.jciAttribute.trim() !== "" && act.jciAttribute !== "AUTO"
                                          ? act.jciAttribute
                                          : autoDetectJCIForFicha(act.name, act.description, getActiveJciCatalog());

                                      const hasJci =
                                        displayVal &&
                                        displayVal.trim() !== "" &&
                                        displayVal.toLowerCase().trim() !== "no aplica" &&
                                        displayVal.toLowerCase().trim() !== "no tiene";

                                      if (hasJci) {
                                        const support =
                                          act.jciSupportType && act.jciSupportType !== "NO_TIENE"
                                            ? act.jciSupportType
                                            : autoDetectJCISupportType(act.name, act.description, act.supportTech);

                                        return (
                                          <div className="inline-flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-indigo-950 bg-indigo-100/90 px-2 py-0.5 border border-indigo-300 rounded-xs shadow-2xs">
                                              <Award className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                                              {displayVal}
                                            </span>
                                            {(support === "DOCUMENTO" || support === "DOCUMENTAL") && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded-xs" title="Soporte: Contenido en Documento / Protocolo institucional">
                                                📄 Documento
                                              </span>
                                            )}
                                            {(support === "PROCESO" || support === "PROCESAL") && (
                                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 border border-teal-200 rounded-xs" title="Soporte: Contenido en Proceso / Flujo Operativo">
                                                🔄 Proceso
                                              </span>
                                            )}
                                            {(support === "SISTEMA" || support === "SISTEMICO") && (
                                              <button
                                                type="button"
                                                onClick={() => handleOpenSihForActivityDirect(sIdx, aIdx, act.supportTech || "")}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 border border-amber-300 rounded-xs cursor-pointer transition-colors"
                                                title="Soporte: Contenido en Sistema / Software SIH. Haga clic para ver catálogo SIH"
                                              >
                                                💻 Sistema (SIH)
                                              </button>
                                            )}
                                          </div>
                                        );
                                      }
                                      return <span className="italic text-slate-400 font-medium">No tiene</span>;
                                    })()}
                                  </div>
                                  <div className="text-slate-600 flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <span className="font-bold text-slate-800">Apoyo Tecnológico:</span>{" "}
                                    {(!act.supportTech || act.supportTech.toLowerCase().trim() === "no tiene" || act.supportTech.toLowerCase().trim() === "no aplica" || act.supportTech.toLowerCase().trim() === "ninguno") ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSihForActivityDirect(sIdx, aIdx, "")}
                                        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 border border-slate-300 rounded-xs uppercase tracking-wider cursor-pointer transition-colors"
                                        title="Haga clic para ver el catálogo SIH y asignar sistema"
                                      >
                                        <X className="w-3 h-3 text-slate-500" />
                                        No tiene (Actividad Manual / Presencial)
                                      </button>
                                    ) : (
                                      <div className="inline-flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSihForActivityDirect(sIdx, aIdx, act.supportTech || "")}
                                          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-amber-950 bg-amber-100/90 hover:bg-amber-200/90 px-2 py-0.5 border border-amber-300 rounded-xs shadow-2xs cursor-pointer transition-all hover:scale-101 text-left"
                                          title="Haga clic para ver la ficha técnica y seleccionar funcionalidades del sistema SIH"
                                        >
                                          <Server className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          {act.supportTech}
                                        </button>
                                        {(() => {
                                          const sihCatalog = getActiveSihCatalog();
                                          const matchedSys = findSihSystemByText(act.supportTech, sihCatalog);
                                          if (matchedSys) {
                                            return (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSihDetailModalSystem(matchedSys);
                                                }}
                                                className="inline-flex items-center gap-1 font-sans text-[10px] font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 border border-amber-500 rounded-xs shadow-2xs cursor-pointer transition-colors"
                                                title="Abrir ventana emergente con la Ficha Técnica Oficial (14 Funcionalidades) de este sistema"
                                              >
                                                <Maximize2 className="w-3 h-3 text-slate-950" />
                                                <span>Ficha Oficial ({matchedSys.features?.length || 0})</span>
                                              </button>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    )}
                                  </div>
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
          )}
        </div>
        );
      })()}
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
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoVal = autoDetectJCIForFicha(newName, actForm.description, getActiveJciCatalog());
                    
                    // Automate JCI detection if user hasn't typed a completely custom manual non-auto attribute
                    const currentJci = actForm.jciAttribute || "";
                    const isAutoOrEmpty =
                      !currentJci.trim() ||
                      currentJci === "No tiene" ||
                      currentJci.startsWith("IPSG.") ||
                      currentJci.startsWith("ACC.") ||
                      currentJci.startsWith("AOP.") ||
                      currentJci.startsWith("COP.") ||
                      currentJci.startsWith("MMU.") ||
                      currentJci.startsWith("PCI.") ||
                      currentJci.startsWith("MOI.") ||
                      currentJci.startsWith("SQE.") ||
                      currentJci.startsWith("FMS.") ||
                      currentJci.startsWith("GLD.") ||
                      currentJci.startsWith("PFR.") ||
                      currentJci.startsWith("PFE.") ||
                      currentJci.startsWith("QPS.") ||
                      currentJci.startsWith("IPSG") ||
                      currentJci === "No aplica";

                    setActForm({
                      ...actForm,
                      name: newName,
                      jciAttribute: isAutoOrEmpty ? autoVal : currentJci
                    });
                  }}
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

              {/* Responsable / Cargo Operativo */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-800">Responsable / Cargo Operativo</label>
                  <span className="text-[10px] text-slate-500">Cargo o rol humano</span>
                </div>
                <input
                  type="text"
                  value={actForm.responsibleRole || ""}
                  onChange={(e) => setActForm({ ...actForm, responsibleRole: e.target.value })}
                  placeholder="Ej. Recepcionista de bodega, Inspector de calidad"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * Indique el cargo o rol humano responsable. No incluya sistemas informáticos ni software.
                </p>
              </div>

              {/* Apoyo Tecnológico (Catálogo SIH - Módulo Integrado) */}
              <div className="border border-slate-300 bg-slate-50/90 p-3.5 space-y-3 rounded-xs shadow-2xs">
                <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500 text-slate-950 rounded-xs">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="block font-black text-slate-900 text-xs uppercase tracking-wider">
                        Apoyo Tecnológico (Catálogo SIH)
                      </label>
                      <p className="text-[10px] text-slate-500">Módulo institucional de software y sistemas hospitalarios</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSihPickerModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Abrir módulo para explorar catálogo de sistemas SIH y seleccionar funcionalidades"
                    >
                      <Server className="w-3.5 h-3.5 text-amber-400" />
                      <span>Explorar y Seleccionar SIH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSihSelectedCode("NO_TIENE");
                        setActForm((prev) => ({ ...prev, supportTech: "No tiene" }));
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 rounded-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Marcar esta actividad como manual/presencial sin sistema"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500" />
                      <span>Marcar "No tiene"</span>
                    </button>
                  </div>
                </div>

                {/* VISUAL STATUS DISPLAY OF ASSIGNED SIH */}
                <div className="bg-white p-2.5 border border-slate-200 rounded-xs">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-700">Estado Actual de Apoyo Tecnológico:</span>
                    {actForm.supportTech && actForm.supportTech.toLowerCase().trim() !== "no tiene" && (
                      <span className="font-mono text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 border border-amber-200">
                        Sistema Vinculado
                      </span>
                    )}
                  </div>
                  {(!actForm.supportTech || actForm.supportTech.toLowerCase().trim() === "no tiene") ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 rounded-xs">
                      <X className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Actividad clasificada como manual / presencial (sin software).</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-slate-900 bg-amber-50/60 p-2 border border-amber-200 rounded-xs font-semibold">
                      <Server className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{actForm.supportTech}</span>
                    </div>
                  )}
                </div>

                {/* RESULT ATTRIBUTE INPUT */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Valor Asignado al Atributo (Apoyo Tecnológico):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Editable</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={actForm.supportTech}
                    onChange={(e) => setActForm({ ...actForm, supportTech: e.target.value })}
                    placeholder="Ej. 1.4.4 - Traslados de pacientes | Funcionalidades: Solicitud interna de camilleros..."
                    className={`w-full px-3 py-2 border bg-white text-slate-950 font-semibold text-xs focus:outline-none rounded-xs ${
                      hasTechForbidden ? "border-amber-400 bg-amber-50/30" : "border-slate-300 focus:border-slate-950"
                    }`}
                  />
                  {hasTechForbidden ? (
                    <p className="mt-1 text-[11px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 p-1.5 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <strong>Regla Ficha:</strong> No debe ir Office / Drive / Mail / Hardware / Equipamiento. Utilice el módulo SIH o marque "No tiene".
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-400">
                      * Puede ajustar el texto directamente o utilizar el botón <strong>Explorar y Seleccionar SIH</strong> para cargar el módulo del catálogo.
                    </p>
                  )}
                </div>
              </div>

              {/* Atributo JCI (Joint Commission International - Módulo Integrado) */}
              <div className="border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-3 rounded-xs shadow-2xs">
                <div className="flex flex-wrap justify-between items-center border-b border-indigo-200 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded-xs">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="block font-black text-indigo-950 text-xs uppercase tracking-wider">
                        Atributo JCI (Joint Commission International)
                      </label>
                      <p className="text-[10px] text-slate-500">Módulo de estándares internacionales, elementos medibles y tipo de soporte</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setJciPickerModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Abrir módulo para explorar catálogo de estándares JCI, requisitos y elementos medibles"
                    >
                      <Award className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Explorar y Seleccionar JCI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const autoVal = autoDetectJCIForFicha(actForm.name, actForm.description, getActiveJciCatalog());
                        const autoSupp = autoDetectJCISupportType(actForm.name, actForm.description, actForm.supportTech);
                        setActForm((prev) => ({ ...prev, jciAttribute: autoVal, jciSupportType: autoSupp }));
                      }}
                      className="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-semibold text-xs border border-indigo-300 rounded-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Detectar automáticamente estándar JCI y soporte según nombre y descripción"
                    >
                      <RefreshCw className="w-3 h-3 text-indigo-700" />
                      <span>Auto-detectar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJciSelectedCode("NO_APLICA");
                        setActForm((prev) => ({ ...prev, jciAttribute: "No aplica" }));
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 rounded-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500" />
                      <span>Marcar "No aplica"</span>
                    </button>
                  </div>
                </div>

                {/* VISUAL STATUS DISPLAY OF ASSIGNED JCI */}
                <div className="bg-white p-2.5 border border-indigo-200 rounded-xs">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-700">Estado Actual de Acreditación JCI:</span>
                    {actForm.jciAttribute && actForm.jciAttribute.toLowerCase().trim() !== "no aplica" && actForm.jciAttribute.toLowerCase().trim() !== "no tiene" && (
                      <span className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 border border-indigo-200">
                        Estándar Vinculado
                      </span>
                    )}
                  </div>
                  {(!actForm.jciAttribute || actForm.jciAttribute.toLowerCase().trim() === "no aplica" || actForm.jciAttribute.toLowerCase().trim() === "no tiene") ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 rounded-xs">
                      <X className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Sin vinculación directa con Estándar JCI ("No aplica").</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-indigo-950 bg-indigo-50/70 p-2 border border-indigo-200 rounded-xs font-semibold">
                        <Award className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                        <span className="leading-snug">{actForm.jciAttribute}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs pt-0.5">
                        <span className="text-slate-600 font-bold text-[11px]">Soporte Actual:</span>
                        {actForm.jciSupportType === "DOCUMENTO" || actForm.jciSupportType === "DOCUMENTAL" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-50 px-2 py-0.5 border border-blue-200 text-[10px]">
                            📄 Documento (Norma / Política institucional)
                          </span>
                        ) : actForm.jciSupportType === "SISTEMA" || actForm.jciSupportType === "SISTEMICO" ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-950 bg-amber-50 px-2 py-0.5 border border-amber-300 text-[10px]">
                            💻 Sistema (Soporte SIH)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-teal-900 bg-teal-50 px-2 py-0.5 border border-teal-200 text-[10px]">
                            🔄 Proceso (Flujo Operativo)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* TIPO DE SOPORTE JCI SELECTOR BUTTONS */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                      Tipo de Soporte de Cumplimiento JCI:
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActForm({ ...actForm, jciSupportType: "DOCUMENTO" })}
                      className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                        actForm.jciSupportType === "DOCUMENTO" || actForm.jciSupportType === "DOCUMENTAL"
                          ? "bg-blue-600 text-white border-blue-700 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">📄 Documento</div>
                      <div className="text-[10px] opacity-80 mt-0.5 truncate">Norma / Política</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActForm({ ...actForm, jciSupportType: "PROCESO" })}
                      className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                        actForm.jciSupportType === "PROCESO" || actForm.jciSupportType === "PROCESAL" || (!actForm.jciSupportType && actForm.jciAttribute && actForm.jciAttribute !== "No tiene" && actForm.jciAttribute !== "No aplica")
                          ? "bg-teal-700 text-white border-teal-800 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">🔄 Proceso</div>
                      <div className="text-[10px] opacity-80 mt-0.5 truncate">Flujo Operativo</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActForm({ ...actForm, jciSupportType: "SISTEMA" })}
                      className={`p-2 border text-left rounded-xs transition-all cursor-pointer ${
                        actForm.jciSupportType === "SISTEMA" || actForm.jciSupportType === "SISTEMICO"
                          ? "bg-amber-600 text-white border-amber-700 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">💻 Sistema</div>
                      <div className="text-[10px] opacity-80 mt-0.5 truncate">Sistema SIH</div>
                    </button>
                  </div>
                </div>

                {/* RESULT ATTRIBUTE INPUT */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                      Valor Asignado al Atributo (JCI):
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Editable</span>
                  </div>
                  <input
                    type="text"
                    value={actForm.jciAttribute || ""}
                    onChange={(e) => setActForm({ ...actForm, jciAttribute: e.target.value })}
                    placeholder="Ej. IPSG.1 - Identificación Correcta de Pacientes | Elementos Medibles: Identificación con 2 identificadores..."
                    className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-950 font-semibold text-xs focus:outline-none focus:border-indigo-600 rounded-xs"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    * Puede ajustar el texto directamente o utilizar el botón <strong>Explorar y Seleccionar JCI</strong> para abrir el catálogo con todos los elementos medibles.
                  </p>
                </div>
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
                    <option value="COMPLEX_JOIN">Unión / Convergente (JOINT - Conecta, no bifurca)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ubicación (Origen de la conexión)</label>
                  <select
                    value={gatewayForm.afterState}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, afterState: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <optgroup label="Subprocesos / Estados">
                      {process.subprocesses.map((sub) => (
                        <option key={`sub_${sub.index}`} value={sub.name}>
                          Subp {sub.index}: {sub.name}
                        </option>
                      ))}
                    </optgroup>
                    {process.stateMachine?.gateways && process.stateMachine.gateways.length > 0 && (
                      <optgroup label="Compuertas Existentes (Conectar desde Compuerta)">
                        {process.stateMachine.gateways
                          .filter((g) => g.id !== editingGatewayId)
                          .map((gw) => (
                            <option key={`gw_${gw.id}`} value={gw.id}>
                              Compuerta: {gw.name} ({gw.type})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {getStartEvents(process).length > 0 && (
                      <optgroup label="Eventos de Inicio">
                        {getStartEvents(process).map((st) => (
                          <option key={`st_${st.id}`} value={st.id}>
                            Evento de Inicio: {st.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {gatewayForm.type === "COMPLEX_JOIN" && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-950 rounded text-[11px] leading-relaxed flex items-start gap-2">
                  <div className="w-5 h-5 rounded bg-amber-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ➜
                  </div>
                  <div>
                    <strong>Compuerta JOINT (Unión / Convergencia):</strong>
                    <p className="text-[10px] text-amber-900 mt-0.5">
                      Esta compuerta unifica múltiples flujos o conexiones (desde subprocesos u otras compuertas) en un único camino de salida. No bifurca en ramas afirmativas/negativas.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {gatewayForm.type === "COMPLEX_JOIN" ? "Destino de Unión / Continuación" : "Rama Afirmativa (Sí / Conforme)"}
                  </label>
                  {(() => {
                    const existingGatewaysForTarget = process.stateMachine?.gateways?.filter((g) => g.id !== editingGatewayId) || [];
                    const isTrueTargetSubprocess = process.subprocesses.some((s) => s.name === gatewayForm.conditionTrueTarget);
                    const isTrueTargetGateway = existingGatewaysForTarget.some((gw) => gw.name === gatewayForm.conditionTrueTarget || gw.id === gatewayForm.conditionTrueTarget);
                    const isTrueTargetTerminal = gatewayForm.conditionTrueTarget === "EVENTO DE TÉRMINO";
                    const selectValue = isTrueTargetSubprocess
                      ? gatewayForm.conditionTrueTarget
                      : isTrueTargetGateway
                      ? (existingGatewaysForTarget.find((gw) => gw.name === gatewayForm.conditionTrueTarget || gw.id === gatewayForm.conditionTrueTarget)?.name || gatewayForm.conditionTrueTarget)
                      : isTrueTargetTerminal
                      ? "EVENTO DE TÉRMINO"
                      : gatewayForm.conditionTrueTarget
                      ? "__CUSTOM__"
                      : "";

                    return (
                      <>
                        <select
                          value={selectValue}
                          onChange={(e) => {
                            if (e.target.value !== "__CUSTOM__") {
                              setGatewayForm({ ...gatewayForm, conditionTrueTarget: e.target.value });
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 mb-1"
                        >
                          <option value="">(Siguiente Subproceso en secuencia)</option>
                          <optgroup label="Subprocesos / Estados">
                            {process.subprocesses.map((sub) => (
                              <option key={sub.index} value={sub.name}>
                                Subp {sub.index}: {sub.name}
                              </option>
                            ))}
                          </optgroup>
                          {existingGatewaysForTarget.length > 0 && (
                            <optgroup label="Compuertas Existentes">
                              {existingGatewaysForTarget.map((gw) => (
                                <option key={`true_gw_${gw.id}`} value={gw.name}>
                                  Compuerta: {gw.name} ({gw.type === "COMPLEX_JOIN" ? "JOINT" : gw.type})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="EVENTO DE TÉRMINO">EVENTO DE TÉRMINO</option>
                          <option value="__CUSTOM__">Otro destino personalizado...</option>
                        </select>
                        <input
                          type="text"
                          value={gatewayForm.conditionTrueTarget}
                          onChange={(e) => setGatewayForm({ ...gatewayForm, conditionTrueTarget: e.target.value })}
                          placeholder="Escriba destino o deje vacío para siguiente estado"
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                        />
                      </>
                    );
                  })()}
                </div>

                {gatewayForm.type !== "COMPLEX_JOIN" && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rama Negativa (No / Excepción)</label>
                    {(() => {
                      const existingGatewaysForTarget = process.stateMachine?.gateways?.filter((g) => g.id !== editingGatewayId) || [];
                      const isFalseTargetSubprocess = process.subprocesses.some((s) => s.name === gatewayForm.conditionFalseTarget);
                      const isFalseTargetGateway = existingGatewaysForTarget.some((gw) => gw.name === gatewayForm.conditionFalseTarget || gw.id === gatewayForm.conditionFalseTarget);
                      const isFalseTargetTerminal = ["Rechazado", "Cancelado", "Quarantined", "Devuelto a Proveedor", "EVENTO DE TÉRMINO"].includes(gatewayForm.conditionFalseTarget);
                      const selectValue = isFalseTargetTerminal
                        ? gatewayForm.conditionFalseTarget
                        : isFalseTargetSubprocess
                        ? gatewayForm.conditionFalseTarget
                        : isFalseTargetGateway
                        ? (existingGatewaysForTarget.find((gw) => gw.name === gatewayForm.conditionFalseTarget || gw.id === gatewayForm.conditionFalseTarget)?.name || gatewayForm.conditionFalseTarget)
                        : gatewayForm.conditionFalseTarget
                        ? "__CUSTOM__"
                        : "";

                      return (
                        <>
                          <select
                            value={selectValue}
                            onChange={(e) => {
                              if (e.target.value !== "__CUSTOM__") {
                                setGatewayForm({ ...gatewayForm, conditionFalseTarget: e.target.value });
                              }
                            }}
                            className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 mb-1"
                          >
                            <option value="Rechazado">Rechazado (Estado Terminal)</option>
                            <option value="Cancelado">Cancelado (Estado Terminal)</option>
                            <option value="Devuelto a Proveedor">Devuelto a Proveedor</option>
                            <option value="Quarantined">En Cuarentena / Retenido</option>
                            <option value="EVENTO DE TÉRMINO">EVENTO DE TÉRMINO</option>
                            <optgroup label="Subprocesos / Estados">
                              {process.subprocesses.map((sub) => (
                                <option key={sub.index} value={sub.name}>
                                  Subp {sub.index}: {sub.name}
                                </option>
                              ))}
                            </optgroup>
                            {existingGatewaysForTarget.length > 0 && (
                              <optgroup label="Compuertas Existentes">
                                {existingGatewaysForTarget.map((gw) => (
                                  <option key={`false_gw_${gw.id}`} value={gw.name}>
                                    Compuerta: {gw.name} ({gw.type === "COMPLEX_JOIN" ? "JOINT" : gw.type})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="__CUSTOM__">Otro destino personalizado...</option>
                          </select>
                          <input
                            type="text"
                            value={gatewayForm.conditionFalseTarget}
                            onChange={(e) => setGatewayForm({ ...gatewayForm, conditionFalseTarget: e.target.value })}
                            placeholder="Ej. Rechazado, Quarantined"
                            className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                          />
                        </>
                      );
                    })()}
                  </div>
                )}
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

      {/* START EVENT EDIT / CREATE MODAL */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                {editingStartEventId ? "Configurar Evento de Inicio BPMN 2.0" : "Añadir Nuevo Evento de Inicio (Segundo Flujo)"}
              </h3>
              <button onClick={() => setStartModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStartEvent} className="space-y-4 text-xs">
              {/* Selector de Evento de Inicio Existente o Crear Nuevo */}
              {getStartEvents(process).length > 0 && (
                <div className="bg-slate-50 p-2 border border-slate-200 rounded flex justify-between items-center gap-2">
                  <span className="font-bold text-slate-700">Modo de Configuración:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openStartEventModal(getStartEvents(process)[0])}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        editingStartEventId === getStartEvents(process)[0]?.id ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Evento #1 (Principal)
                    </button>
                    <button
                      type="button"
                      onClick={() => openStartEventModal()}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        !editingStartEventId ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      ➕ Añadir 2° Evento
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre / Etiqueta del Evento de Inicio</label>
                <input
                  type="text"
                  required
                  value={startForm.name}
                  onChange={(e) => setStartForm({ ...startForm, name: e.target.value })}
                  placeholder="Ej. EVENTO DE INICIO: REQUERIMIENTO CLIENTE"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 font-bold focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gatillo / Disparador de Entrada (Entrada del Proceso)</label>
                <textarea
                  rows={2}
                  required
                  value={startForm.trigger}
                  onChange={(e) => setStartForm({ ...startForm, trigger: e.target.value })}
                  placeholder="Ej. Recepción de solicitud de compra o aviso de devolución de producto por cliente"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subproceso Inicial al que se Conecta este Flujo</label>
                <div className="space-y-2">
                  {process.subprocesses.length > 0 && (
                    <select
                      value={isNewInitialSub ? "__NEW__" : startForm.targetSubprocessIndex}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsNewInitialSub(true);
                          setCustomInitialSubName("");
                        } else {
                          setIsNewInitialSub(false);
                          setStartForm({ ...startForm, targetSubprocessIndex: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
                    >
                      {process.subprocesses.map((sub) => (
                        <option key={sub.index} value={sub.index}>
                          Subproceso {sub.index}: {sub.name}
                        </option>
                      ))}
                      <option value="__NEW__">➕ Crear y Vincular Un Nuevo Subproceso...</option>
                    </select>
                  )}

                  {(isNewInitialSub || process.subprocesses.length === 0) && (
                    <div className="bg-blue-50/80 p-3 border border-blue-200 rounded space-y-1.5 animate-fadeIn">
                      <label className="block font-bold text-blue-950 text-[11px]">
                        Nombre del Nuevo Subproceso para este Flujo:
                      </label>
                      <input
                        type="text"
                        required
                        value={customInitialSubName}
                        onChange={(e) => setCustomInitialSubName(e.target.value)}
                        placeholder="Ej. 4.4 Gestión de Devoluciones y Reclamos"
                        className="w-full px-3 py-2 border border-blue-300 bg-white text-slate-900 font-bold focus:outline-none focus:border-blue-700"
                      />
                      <p className="text-[10px] text-blue-800 font-medium">
                        ✨ Se creará automáticamente este subproceso en el diagrama BPMN y quedará vinculado a este Evento de Inicio.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gatillo / Resultado de Término para este Flujo</label>
                <input
                  type="text"
                  required
                  value={startForm.endTrigger}
                  onChange={(e) => setStartForm({ ...startForm, endTrigger: e.target.value })}
                  placeholder="Ej. Producto reemplazado o nota de crédito emitida conforme"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingStartEventId && getStartEvents(process).length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStartEvent(editingStartEventId)}
                    className="px-3 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold rounded flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Evento</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
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
                <label className="block font-bold text-slate-700 mb-1">Subproceso Precedente / Asociado (3.2.b)</label>
                <select
                  value={endForm.associatedSubprocessIndex || ""}
                  onChange={(e) => setEndForm({ ...endForm, associatedSubprocessIndex: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                >
                  <option value="">(Cualquiera / Último Subproceso del Flujo)</option>
                  {process.subprocesses.map((sub) => (
                    <option key={sub.index} value={sub.index}>
                      Subproceso {sub.index}: {sub.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  * Asocia este evento de término al resultado u output del subproceso seleccionado.
                </p>
              </div>

              {getStartEvents(process).length > 1 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Flujo / Evento de Inicio Asociado</label>
                  <select
                    value={endForm.associatedStartEventId || ""}
                    onChange={(e) => setEndForm({ ...endForm, associatedStartEventId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <option value="">(Todos los flujos del proceso)</option>
                    {getStartEvents(process).map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}: {st.trigger}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                <label className="block font-bold text-slate-800 mb-0.5">S (SUBPROCESO)</label>
                <p className="text-[10px] text-slate-500 mb-1">Nombre del subproceso perteneciente a la secuencia 4.X (ej. 4.1 Nombre del Subproceso)</p>
                <input
                  type="text"
                  required
                  value={sipocForm.supplier}
                  onChange={(e) => setSipocForm({ ...sipocForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-0.5">I (Entrada)</label>
                <p className="text-[10px] text-slate-500 mb-1">Evento de inicio del subproceso (mismos que el insumo de información de la primera ficha del subproceso)</p>
                <input
                  type="text"
                  required
                  value={sipocForm.inputs}
                  onChange={(e) => setSipocForm({ ...sipocForm, inputs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-0.5">P (Procesamiento o función de transformación)</label>
                <p className="text-[10px] text-slate-500 mb-1">Texto resumen de lo que se transforma en la ejecución del subproceso o lo que hace el subproceso</p>
                <textarea
                  rows={2}
                  required
                  value={sipocForm.subprocess}
                  onChange={(e) => setSipocForm({ ...sipocForm, subprocess: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-0.5">O (Resultado)</label>
                <p className="text-[10px] text-slate-500 mb-1">Evento(s) del fin del subproceso (mismos que el resultado de la última ficha del subproceso)</p>
                <input
                  type="text"
                  required
                  value={sipocForm.outputs}
                  onChange={(e) => setSipocForm({ ...sipocForm, outputs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-0.5">C (Usuarios o destinatarios)</label>
                <p className="text-[10px] text-slate-500 mb-1">Actores participantes del subproceso</p>
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

              {/* SECCIÓN JCI & TIPO DE SOPORTE */}
              <div className="bg-indigo-50/60 border border-indigo-200 p-4 space-y-3.5 rounded-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-2">
                  <div>
                    <label className="font-extrabold text-indigo-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <Award className="w-4 h-4 text-indigo-700 shrink-0" />
                      Vinculación con Acreditación JCI
                    </label>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Indique si este indicador evalúa el cumplimiento de estándares Joint Commission International.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-indigo-300 hover:border-indigo-500 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={!!kpiForm.isJciLinked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const detectedStd = checked && !kpiForm.jciStandard
                          ? autoDetectJCIForFicha(kpiForm.name, kpiForm.description, getActiveJciCatalog())
                          : kpiForm.jciStandard;
                        const detectedSupp = checked && (!kpiForm.jciSupportType || kpiForm.jciSupportType === "NO_TIENE")
                          ? autoDetectJCISupportType(kpiForm.name, kpiForm.description)
                          : (kpiForm.jciSupportType || "PROCESAL");
                        setKpiForm({
                          ...kpiForm,
                          isJciLinked: checked,
                          jciStandard: checked ? (detectedStd === "No tiene" ? "" : detectedStd) : "",
                          jciSupportType: checked ? detectedSupp : kpiForm.jciSupportType
                        });
                      }}
                      className="w-4 h-4 rounded-none text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-950 select-none">
                      {kpiForm.isJciLinked ? "✅ Asociado a JCI" : "No Asociado a JCI"}
                    </span>
                  </label>
                </div>

                {kpiForm.isJciLinked && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-800 uppercase">
                          Estándar JCI Asociado:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const detected = autoDetectJCIForFicha(kpiForm.name, kpiForm.description, getActiveJciCatalog());
                            if (detected && detected !== "No tiene") {
                              setKpiForm((prev) => ({ ...prev, jciStandard: detected }));
                            }
                          }}
                          className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                          title="Auto-detectar estándar según nombre y fórmula del KPI"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Auto-detectar Estándar
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <select
                          value={
                            getActiveJciCatalog().some((s) => kpiForm.jciStandard?.includes(s.code))
                              ? getActiveJciCatalog().find((s) => kpiForm.jciStandard?.includes(s.code))?.code
                              : ""
                          }
                          onChange={(e) => {
                            const code = e.target.value;
                            if (code) {
                              const std = getActiveJciCatalog().find((s) => s.code === code);
                              if (std) {
                                setKpiForm((prev) => ({
                                  ...prev,
                                  jciStandard: `${std.code} - ${std.name}`
                                }));
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-indigo-300 text-indigo-950 focus:outline-none focus:border-indigo-600"
                        >
                          <option value="">-- Seleccionar de catálogo JCI --</option>
                          {getActiveJciCatalog().map((std) => (
                            <option key={std.id} value={std.code}>
                              [{std.code}] {std.name} — {std.chapter.split(" ")[0]}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={kpiForm.jciStandard || ""}
                          onChange={(e) => setKpiForm({ ...kpiForm, jciStandard: e.target.value })}
                          placeholder="Ej. IPSG.1 - Identificación Correcta de Pacientes"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TIPO DE SOPORTE DEL INDICADOR (Documental, Procesal, Sistémico) */}
                <div className="pt-2 border-t border-indigo-200/80">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Tipo de Soporte de Cumplimiento:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const supp = autoDetectJCISupportType(kpiForm.name, kpiForm.description);
                        setKpiForm((prev) => ({ ...prev, jciSupportType: supp }));
                      }}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      title="Sugerir soporte según fórmula y descripción"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Sugerir Soporte
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setKpiForm({ ...kpiForm, jciSupportType: "DOCUMENTO" })}
                      className={`p-2.5 border text-left rounded-xs transition-all cursor-pointer ${
                        kpiForm.jciSupportType === "DOCUMENTO" || kpiForm.jciSupportType === "DOCUMENTAL"
                          ? "bg-blue-600 text-white border-blue-700 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">📄 Documento</div>
                      <div className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        Adherencia a norma, política o documento formal
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKpiForm({ ...kpiForm, jciSupportType: "PROCESO" })}
                      className={`p-2.5 border text-left rounded-xs transition-all cursor-pointer ${
                        kpiForm.jciSupportType === "PROCESO" || kpiForm.jciSupportType === "PROCESAL" || !kpiForm.jciSupportType
                          ? "bg-teal-700 text-white border-teal-800 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">🔄 Proceso</div>
                      <div className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        Tiempos, SLA y ejecución de actividades
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKpiForm({ ...kpiForm, jciSupportType: "SISTEMA" })}
                      className={`p-2.5 border text-left rounded-xs transition-all cursor-pointer ${
                        kpiForm.jciSupportType === "SISTEMA" || kpiForm.jciSupportType === "SISTEMICO"
                          ? "bg-amber-600 text-white border-amber-700 font-bold shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs flex items-center gap-1">💻 Sistema</div>
                      <div className="text-[10px] opacity-80 mt-0.5 leading-tight">
                        Registros automáticos y extracción SIH
                      </div>
                    </button>
                  </div>
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

      {/* MODAL: CONECTOR RÁPIDO (+) (POINT 3.2) */}
      {connectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full shadow-2xl animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Conectar Siguiente Artefacto BPMN
              </h3>
              <button onClick={() => setConnectorModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Seleccione el artefacto BPMN 2.0 que desea agregar a continuación de este elemento:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Opción 1: Subproceso */}
                <button
                  type="button"
                  onClick={() => {
                    setConnectorModalOpen(false);
                    setEditingSubIndex(null);
                    if (connectorSource?.type === "SUBPROCESS") {
                      setInsertAfterSubIndex(connectorSource.subIndex);
                    }
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
                  className="p-3 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/80 rounded-lg text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    +
                  </div>
                  <div>
                    <div className="font-bold text-blue-950 text-sm">Agregar Subproceso</div>
                    <div className="text-[11px] text-slate-600">Crea una nueva etapa o actividad agrupada en la secuencia del proceso</div>
                  </div>
                </button>

                {/* Opción 2a: Compuerta de Decisión */}
                <button
                  type="button"
                  onClick={() => {
                    setConnectorModalOpen(false);
                    setEditingGatewayId(null);
                    const afterState = connectorSource?.type === "START_EVENT"
                      ? (connectorSource.id || "start-1")
                      : connectorSource?.type === "GATEWAY"
                      ? (connectorSource.id || "gw-1")
                      : (connectorSource?.subName || connectorSource?.id || process.subprocesses[process.subprocesses.length - 1]?.name || "");
                    setGatewayForm({
                      name: "¿Atributos y Documentación Conformes?",
                      type: "EXCLUSIVE_XOR",
                      afterState,
                      conditionTrueTarget: "",
                      conditionFalseTarget: "Rechazado",
                      role: process.responsibleRole || "Operador de Proceso"
                    });
                    setGatewayModalOpen(true);
                  }}
                  className="p-3 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 rounded-lg text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 rotate-45 shadow-2xs group-hover:scale-105 transition-transform">
                    <span className="-rotate-45">◇</span>
                  </div>
                  <div>
                    <div className="font-bold text-amber-950 text-sm">Agregar Compuerta de Decisión</div>
                    <div className="text-[11px] text-slate-600">Bifurca o evalúa decisiones (XOR Exclusiva, AND Paralela, u OR Inclusiva)</div>
                  </div>
                </button>

                {/* Opción 2b: Compuerta JOINT (Unión / Convergencia) */}
                <button
                  type="button"
                  onClick={() => {
                    setConnectorModalOpen(false);
                    setEditingGatewayId(null);
                    const afterState = connectorSource?.type === "START_EVENT"
                      ? (connectorSource.id || "start-1")
                      : connectorSource?.type === "GATEWAY"
                      ? (connectorSource.id || "gw-1")
                      : (connectorSource?.subName || connectorSource?.id || process.subprocesses[process.subprocesses.length - 1]?.name || "");
                    setGatewayForm({
                      name: "Unión de Flujos / Convergencia",
                      type: "COMPLEX_JOIN",
                      afterState,
                      conditionTrueTarget: "",
                      conditionFalseTarget: "",
                      role: process.responsibleRole || "Operador de Proceso"
                    });
                    setGatewayModalOpen(true);
                  }}
                  className="p-3 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/80 rounded-lg text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <GitFork className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-purple-950 text-sm">Agregar Compuerta JOINT (Unión)</div>
                    <div className="text-[11px] text-slate-600">Punto de convergencia que solo conecta sin bifurcar (tras Evento de Inicio o entre Subprocesos)</div>
                  </div>
                </button>

                {/* Opción 3: Evento de Término */}
                <button
                  type="button"
                  onClick={() => {
                    setConnectorModalOpen(false);
                    setEndForm({
                      scopeEnd: process.scopeEnd || "",
                      alternateStates: process.stateMachine?.exceptions?.map((e) => e.targetState).join(", ") || "Rechazado, Quarantined",
                      associatedStartEventId: connectorSource?.flowStartEventId || "",
                      associatedSubprocessIndex: connectorSource?.subIndex || ""
                    });
                    setEndModalOpen(true);
                  }}
                  className="p-3 border border-rose-200 bg-rose-50/50 hover:bg-rose-100/80 rounded-lg text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    ●
                  </div>
                  <div>
                    <div className="font-bold text-rose-950 text-sm">Editar Evento de Término</div>
                    <div className="text-[11px] text-slate-600">Define los entregables finales y salidas de excepción de este flujo</div>
                  </div>
                </button>

                {/* Opción 4: Nuevo Evento de Inicio */}
                <button
                  type="button"
                  onClick={() => {
                    setConnectorModalOpen(false);
                    openStartEventModal();
                  }}
                  className="p-3 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80 rounded-lg text-left transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    ○
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 text-sm">Agregar Nuevo Flujo (Evento de Inicio)</div>
                    <div className="text-[11px] text-slate-600">Crea una nueva ruta de ejecución paralela o alternativa en el proceso</div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConnectorModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANTENEDOR DE ARTEFACTOS (ACCESO EXCLUSIVO ADMINISTRADOR) */}
      {artifactManagerOpen && (() => {
        const getAllArtifacts = () => {
          const list: Array<{
            id: string;
            name: string;
            type: "START_EVENT" | "SUBPROCESS" | "GATEWAY";
            subType?: string;
            details: string;
          }> = [];

          // Add Start Events
          getStartEvents(process).forEach((st) => {
            list.push({
              id: st.id,
              name: st.name || "Evento de Inicio",
              type: "START_EVENT",
              details: `Gatillo: ${st.trigger || "N/A"} ➔ Destino: Subp. ${st.targetSubprocessIndex || "N/A"}`
            });
          });

          // Add Subprocesses
          process.subprocesses.forEach((sub) => {
            list.push({
              id: sub.index,
              name: sub.name,
              type: "SUBPROCESS",
              details: `Narrativa: ${sub.narrative || "N/A"} | Actividades: ${sub.activities?.length || 0} | Rol: ${sub.responsibleRole || "N/A"}`
            });
          });

          // Add Gateways
          (process.stateMachine?.gateways || []).forEach((gw) => {
            const typeLabel = gw.type === "COMPLEX_JOIN" ? "JOINT" : gw.type;
            list.push({
              id: gw.id,
              name: gw.name || "Compuerta sin nombre",
              type: "GATEWAY",
              subType: typeLabel,
              details: `Origen (afterState): ${gw.afterState} | Destino Conforme: ${gw.conditionTrueTarget || "(Secuencial)"}${gw.conditionFalseTarget ? " / No Conforme: " + gw.conditionFalseTarget : ""}`
            });
          });

          return list;
        };

        const filteredArtifacts = getAllArtifacts().filter((art) => {
          // Type Filter
          if (artifactFilterType !== "ALL") {
            if (artifactFilterType === "START_EVENT" && art.type !== "START_EVENT") return false;
            if (artifactFilterType === "SUBPROCESS" && art.type !== "SUBPROCESS") return false;
            if (artifactFilterType === "GATEWAY" && art.type !== "GATEWAY") return false;
          }

          // Search query
          if (artifactSearchQuery.trim()) {
            const q = artifactSearchQuery.toLowerCase();
            return (
              art.id.toLowerCase().includes(q) ||
              art.name.toLowerCase().includes(q) ||
              art.details.toLowerCase().includes(q) ||
              (art.subType && art.subType.toLowerCase().includes(q))
            );
          }

          return true;
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-scaleUp">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                  <span>Panel de Control de Artefactos {isAdmin ? "[ACCESO EXCLUSIVO ADMINISTRADOR]" : ""}</span>
                </h3>
                <button onClick={() => setArtifactManagerOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description / Banner */}
              <div className="bg-purple-50 border border-purple-100 p-3 mt-3 rounded-lg text-xs text-purple-950 flex gap-2.5 items-start shrink-0">
                <ShieldAlert className="w-4.5 h-4.5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Panel de Administración de la Estructura:</strong>
                  <p className="text-[11px] text-purple-900 mt-0.5">
                    Este panel le permite listar y eliminar de forma directa todos los componentes del diagrama de procesos (Eventos de Inicio, Subprocesos y Compuertas). La eliminación directa es irreversible y reestructurará la secuencia del diagrama del flujo actual.
                  </p>
                </div>
              </div>

              {/* Controls (Filters and Search) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "ALL", label: "Todos los Artefactos" },
                    { value: "START_EVENT", label: "Eventos de Inicio 🟢" },
                    { value: "SUBPROCESS", label: "Subprocesos 🟦" },
                    { value: "GATEWAY", label: "Compuertas / Joints 🔶" }
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setArtifactFilterType(tab.value)}
                      className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                        artifactFilterType === tab.value
                          ? "bg-purple-700 border-purple-800 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={artifactSearchQuery}
                    onChange={(e) => setArtifactSearchQuery(e.target.value)}
                    placeholder="Buscar artefactos..."
                    className="w-full pl-8 pr-3 py-1 border border-slate-200 bg-slate-50/50 text-slate-800 text-xs focus:outline-none focus:border-purple-600 rounded"
                  />
                </div>
              </div>

              {/* List Table */}
              <div className="mt-4 flex-1 overflow-y-auto border border-slate-100 rounded">
                {!isAdmin ? (
                  <div className="p-8 text-center text-rose-600 font-bold text-xs flex flex-col items-center justify-center gap-2">
                    <Lock className="w-8 h-8 text-rose-500" />
                    <span>Acceso Denegado. Solo los administradores pueden gestionar artefactos desde este listado.</span>
                  </div>
                ) : filteredArtifacts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">
                    No se encontraron artefactos con los criterios de filtrado seleccionados.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-3 w-32">Categoría / Tipo</th>
                        <th className="p-3 w-28">Identificador</th>
                        <th className="p-3 w-48">Nombre / Etiqueta</th>
                        <th className="p-3">Detalle Técnico / Conexión</th>
                        <th className="p-3 w-20 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredArtifacts.map((art) => {
                        let typeColor = "bg-slate-100 text-slate-800 border-slate-200";
                        if (art.type === "START_EVENT") typeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                        else if (art.type === "SUBPROCESS") typeColor = "bg-blue-50 text-blue-800 border-blue-200";
                        else if (art.type === "GATEWAY") {
                          typeColor = art.subType === "JOINT"
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-amber-50 text-amber-800 border-amber-200";
                        }

                        return (
                          <tr key={`${art.type}_${art.id}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}>
                                {art.type === "START_EVENT" && "🟢 Inicio"}
                                {art.type === "SUBPROCESS" && "🟦 Subproceso"}
                                {art.type === "GATEWAY" && (art.subType === "JOINT" ? "🟣 Joint" : "🔶 " + art.subType)}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 font-bold whitespace-nowrap select-all">
                              {art.id}
                            </td>
                            <td className="p-3 font-bold text-slate-900 leading-tight">
                              {art.name}
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] leading-normal font-medium max-w-[280px] truncate animate-fadeIn" title={art.details}>
                              {art.details}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteArtifactFromManager(art.type, art.id, art.name)}
                                className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Eliminar Artefacto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-4 shrink-0">
                <span className="text-[10px] text-slate-500">
                  Mostrando <strong>{filteredArtifacts.length}</strong> de <strong>{getAllArtifacts().length}</strong> artefactos
                </span>
                <button
                  type="button"
                  onClick={() => setArtifactManagerOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 text-xs cursor-pointer"
                >
                  Cerrar Panel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SIH CATALOG PICKER MODAL */}
      <SihCatalogPickerModal
        isOpen={sihPickerModalOpen}
        onClose={() => {
          setSihPickerModalOpen(false);
          setSihTargetDirectActivity(null);
        }}
        currentValue={sihTargetDirectActivity ? sihTargetDirectActivity.initialTech : actForm.supportTech}
        onApply={(resultText, selectedSystems) => {
          if (sihTargetDirectActivity) {
            const { subIdx, actIdx } = sihTargetDirectActivity;
            const updated = JSON.parse(JSON.stringify(process)) as ProcessDefinition;
            if (updated.subprocesses?.[subIdx]?.activities?.[actIdx]) {
              updated.subprocesses[subIdx].activities[actIdx].supportTech = resultText;
            }
            const synced = syncProcessModel(updated);
            if (onProcessChange) onProcessChange(synced);
            setSihTargetDirectActivity(null);
          } else {
            setActForm((prev) => ({ ...prev, supportTech: resultText }));
          }
          if (Array.isArray(selectedSystems) && selectedSystems.length > 0) {
            setSihSelectedCode(selectedSystems[0].code);
          }
        }}
      />

      {/* SIH STANDALONE SYSTEM DETAIL MODAL (FICHA TÉCNICA OFICIAL) */}
      {sihDetailModalSystem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col animate-scaleUp overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-mono text-xs font-black rounded-xs">
                    {sihDetailModalSystem.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    {sihDetailModalSystem.macroCategory} • {sihDetailModalSystem.subcategory}
                  </span>
                </div>
                <h4 className="text-base font-black text-white">
                  {sihDetailModalSystem.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSihDetailModalSystem(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 space-y-1.5">
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Propósito y Alcance del Sistema SIH
                </h5>
                <p className="text-slate-700 leading-relaxed">
                  {sihDetailModalSystem.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 font-semibold rounded-xs">
                    Nivel: {sihDetailModalSystem.level}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold rounded-xs">
                    Obligatoriedad: {sihDetailModalSystem.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Funcionalidades Oficiales del Sistema ({sihDetailModalSystem.features?.length || 0})
                  </h5>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Estándar Catálogo Nacional SIH
                  </span>
                </div>

                <div className="space-y-2 border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto p-2 bg-slate-50/50">
                  {sihDetailModalSystem.features && sihDetailModalSystem.features.length > 0 ? (
                    sihDetailModalSystem.features.map((feat, fIdx) => (
                      <div key={fIdx} className="p-2 bg-white flex items-start gap-2.5 hover:bg-slate-50">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0 rounded-xs">
                          #{fIdx + 1}
                        </span>
                        <p className="text-[11px] text-slate-800 leading-relaxed">
                          {feat}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-slate-500 italic">
                      No hay funcionalidades registradas.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-mono text-slate-600">
                {sihDetailModalSystem.features?.length || 0} funcionalidades certificadas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (sihDetailModalSystem) {
                      const text = `SIH - [${sihDetailModalSystem.code}] ${sihDetailModalSystem.name} | Funcionalidades: ${sihDetailModalSystem.features.join("; ")}`;
                      navigator.clipboard?.writeText(text);
                    }
                    setSihDetailModalSystem(null);
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Copiar Ficha Completa
                </button>
                <button
                  type="button"
                  onClick={() => setSihDetailModalSystem(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JCI CATALOG PICKER MODAL */}
      <JciCatalogPickerModal
        isOpen={jciPickerModalOpen}
        onClose={() => setJciPickerModalOpen(false)}
        currentValue={actForm.jciAttribute || ""}
        currentSupportType={actForm.jciSupportType}
        activityName={actForm.name}
        activityDescription={actForm.description}
        supportTech={actForm.supportTech}
        onApply={(resultText, supportType, selectedStandards) => {
          setActForm((prev) => ({
            ...prev,
            jciAttribute: resultText,
            jciSupportType: supportType
          }));
          if (Array.isArray(selectedStandards) && selectedStandards.length > 0) {
            setJciSelectedCode(selectedStandards[0].code);
          }
        }}
      />

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

