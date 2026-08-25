export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  formula: string; // Exact mathematical expression, e.g., "(ApprovedPurchases / TotalRequests) * 100"
  periodicity: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";
  targetRange: string; // Satisfactorio condition, e.g., ">= 95%"
  otherRanges: string; // Insatisfactorio condition, e.g., "< 90%"
  isJciLinked?: boolean; // Indicates whether KPI is linked to JCI accreditation
  jciStandard?: string; // e.g. "[IPSG.1] Identificación Correcta de Pacientes"
  jciSupportType?: "DOCUMENTO" | "PROCESO" | "SISTEMA" | "DOCUMENTAL" | "PROCESAL" | "SISTEMICO" | "NO_TIENE"; // 📄 Documento, 🔄 Proceso, 💻 Sistema
}

export interface ProcessGlossaryItem {
  term: string;
  definition: string;
}

export interface SIPOCRow {
  supplier: string;   // S (SUBPROCESO): El nombre del subproceso en la secuencia 4.x (tantas filas como la secuencia de x tenga)
  inputs: string;     // I (Entrada): Insumo de información proveniente de la primera Ficha de Actividad (4.X.1)
  subprocess: string; // P (Procesamiento o función de transformación): Texto resumen de la narrativa de transformación realizada durante la ejecución de las fichas del subproceso
  outputs: string;    // O (Resultado): Resultado registrado en la última Ficha de Actividad del subproceso (4.X.N)
  customer: string;   // C (Usuarios o destinatarios): Actores participantes descritos en las fichas del subproceso
}

export interface ActivityFicha {
  index: string; // e.g. "4.1.1"
  name: string;
  description: string;
  supportTech: string; // System / Software interface
  infoInputs: string; // Input data / docs
  result: string; // Output state / docs
  rules: string; // Business rules
  variants: string; // Edge cases, exception paths
  responsibleRole?: string; // Participant actor / role
  jciAttribute?: string; // Joint Commission International (JCI) accreditation standard / goal
  jciSupportType?: "DOCUMENTO" | "PROCESO" | "SISTEMA" | "DOCUMENTAL" | "PROCESAL" | "SISTEMICO" | "NO_TIENE"; // 📄 Documento, 🔄 Proceso, 💻 Sistema
}

export interface SubprocessDefinition {
  index: string; // e.g. "4.1"
  name: string;
  narrative: string;
  responsibleRole?: string;
  startEventId?: string; // ID of the start event flow line this subprocess belongs to
  activities: ActivityFicha[];
  sipoc: SIPOCRow[];
}

export interface StateTransition {
  from: string;
  to: string;
  action: string;
  role: string;
}

export interface BpmnStartEvent {
  id: string;
  name: string; // e.g. "EVENTO DE INICIO" or "EVENTO DE INICIO 2"
  trigger: string; // e.g. "Recepción de solicitud de compra aprobada..."
  targetSubprocessIndex?: string; // e.g. "4.1" or "4.4"
  endTrigger?: string; // Outcome for end event of this flow
}

export interface BpmnGateway {
  id: string;
  name: string; // e.g., "¿Documentación Conforme?" o "Unificación de Solicitudes"
  type: "EXCLUSIVE_XOR" | "PARALLEL_AND" | "INCLUSIVE_OR" | "COMPLEX_JOIN";
  afterState: string; // State, Gateway, or Subprocess after which gateway is evaluated
  conditionTrueTarget: string; // Target Subprocess or State (or single destination for JOINT)
  conditionFalseTarget: string; // Exception State / Rechazo (empty for JOINT)
  role: string;
}

export interface ProcessStateMachine {
  states: string[]; // e.g., ["Draft", "Pending", "Approved", "Executed", "Rejected", "Quarantined"]
  initialState: string;
  transitions: StateTransition[];
  startEvents?: BpmnStartEvent[];
  gateways?: BpmnGateway[];
  endEvents?: string[];
  custodyTransfers: {
    state: string;
    fromRole: string;
    toRole: string;
    trigger: string;
  }[];
  exceptions: {
    triggerState: string;
    targetState: string;
    handler: string;
  }[];
  slaRules: {
    state: string;
    timeoutHours: number;
    action: string;
  }[];
}

export interface ProcessDefinition {
  name: string;
  description: string;
  macroproceso?: string;
  proceso?: string;
  microproceso?: string;
  scopeStart: string;
  scopeEnd: string;
  responsibleRole: string;
  processOwner: string; // e.g., "Subdirección de Operaciones"
  processInputs: string;
  processOutputs: string;
  suppliers: string;
  customers: string;
  risks: string[];
  glossary: ProcessGlossaryItem[];
  kpis: KPIDefinition[];
  subprocesses: SubprocessDefinition[];
  stateMachine: ProcessStateMachine;
}

// Types for SIH (Sistemas de Información Hospitalarios / Apoyo Tecnológico)
export interface SIHSystem {
  id: string; // e.g. "1.1.1"
  code: string; // e.g. "1.1.1"
  area: string; // Category Area name
  name: string; // System name
  objective: string; // Purpose / Objective
  features: string[]; // Relevent features
  integrations: string[]; // Interoperability / Integrations
  legalConsiderations?: string; // Legal considerations / Normas
  supportStatus?: "SOPORTADO" | "EN_IMPLEMENTACION" | "BRECHA" | "REQUERIDO";
  linkedProcessActivities?: string[]; // Linked process activity indices e.g. ["4.1.1"]
  providerVendor?: string; // Vendor / Software system
  notes?: string;
}

export interface SIHCategory {
  code: string; // e.g. "1.1"
  name: string; // e.g. "Apoyo administrativo a la atención clínica e información al usuario"
  systemsCount?: number;
}

// Types for JCI (Joint Commission International - Acreditación de Calidad)
export interface JCIStandard {
  id: string; // e.g. "IPSG.1"
  code: string; // e.g. "IPSG.1"
  chapter: string; // e.g. "IPSG - Metas Internacionales de Seguridad del Paciente"
  name: string; // Title / Name
  objective: string; // Purpose / Standard statement
  measurableElements: string[]; // Elementos Medibles / Requisitos
  category?: "PATIENT_CENTERED" | "HEALTHCARE_MANAGEMENT" | "SAFETY_GOALS";
  supportStatus?: "CUMPLIDO" | "EN_EVALUACION" | "BRECHA";
  linkedProcessActivities?: string[];
  notes?: string;
}

export interface JCICategory {
  code: string; // e.g. "IPSG"
  name: string; // e.g. "Metas Internacionales de Seguridad del Paciente"
  standardsCount?: number;
}

export interface ReferenceDocumentSection {
  title: string;
  content: string;
  suggestedActivities?: string[];
  normativeCodes?: string[];
}

export interface ReferenceDocument {
  id: string;
  name: string;
  type: "MANUAL" | "PAPER" | "GUIA_CLINICA" | "NORMA_TECNICA" | "PROTOCOLO" | "OTRO";
  uploadedAt: string;
  sourceType: "docx" | "pdf" | "txt" | "json";
  sizeBytes?: number;
  authorOrEntity?: string;
  summary?: string;
  sections: ReferenceDocumentSection[];
  rawContent?: string;
}

export interface SimulationLogEntry {
  timestamp: string;
  activityIndex: string;
  activityName: string;
  previousState: string;
  newState: string;
  actionTaken: "APPROVE" | "REJECT" | "TRIGGER_EXCEPTION" | "COMPLETE" | "SUBMIT" | "QUARANTINE" | "TIMEOUT";
  role: string;
  operatorName: string;
  custodyTransferredTo?: string;
  details: string;
}

export interface ProcessInstance {
  id: string;
  processName: string;
  currentState: string;
  currentActivityIndex: string; // e.g., "4.1.1"
  startedAt: string;
  updatedAt: string;
  history: SimulationLogEntry[];
  variables: Record<string, string | number | boolean>;
  slaDeadline?: string;
  slaBreached: boolean;
}
