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
  supplier: string;
  inputs: string;
  subprocess: string;
  outputs: string;
  customer: string;
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
}

export interface SubprocessDefinition {
  index: string; // e.g. "4.1"
  name: string;
  narrative: string;
  activities: ActivityFicha[];
  sipoc: SIPOCRow[];
}

export interface StateTransition {
  from: string;
  to: string;
  action: string;
  role: string;
}

export interface BpmnGateway {
  id: string;
  name: string; // e.g., "¿Documentación y Atributos Conformes?"
  type: "EXCLUSIVE_XOR" | "PARALLEL_AND" | "INCLUSIVE_OR";
  afterState: string; // State or subprocess after which gateway is evaluated
  conditionTrueTarget: string; // e.g., Next Subprocess / State
  conditionFalseTarget: string; // e.g., Exception State / Rechazo
  role: string;
}

export interface ProcessStateMachine {
  states: string[]; // e.g., ["Draft", "Pending", "Approved", "Executed", "Rejected", "Quarantined"]
  initialState: string;
  transitions: StateTransition[];
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
