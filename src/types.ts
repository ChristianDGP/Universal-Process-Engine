export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  formula: string; // Exact mathematical expression, e.g., "(ApprovedPurchases / TotalRequests) * 100"
  periodicity: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  targetRange: string; // Satisfactorio condition, e.g., ">= 95%"
  otherRanges: string; // Insatisfactorio condition, e.g., "< 90%"
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

// Types for simulation
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
