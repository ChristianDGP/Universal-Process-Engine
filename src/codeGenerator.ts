import { ProcessDefinition } from "./types";

export function generateSQLSchema(process: ProcessDefinition): string {
  const statesEnumName = `${process.name.replace(/[^a-zA-Z0-9]/g, "")}_states_enum`;
  const formattedEnumStates = process.stateMachine.states.map(s => `'${s}'`).join(", ");

  return `-- =========================================================================
-- SYSTEM ARCHITECTURE: DATABASE SCHEMA (PostgreSQL / Prisma / Drizzle)
-- PROCESS: ${process.name}
-- CREATED: ${new Date().toISOString().split("T")[0]}
-- =========================================================================

-- 1. Create Enums for State Machine
CREATE TYPE "${statesEnumName}" AS ENUM (${formattedEnumStates});

-- 2. Master Process Table
CREATE TABLE "processes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "responsible_role" VARCHAR(100) NOT NULL,
  "process_owner" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Subprocesses Table
CREATE TABLE "subprocesses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "process_id" UUID NOT NULL REFERENCES "processes"("id") ON DELETE CASCADE,
  "index_code" VARCHAR(10) NOT NULL, -- e.g., '4.1'
  "name" VARCHAR(255) NOT NULL,
  "narrative" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Operational Activities Table (4.X.Y Fichas)
CREATE TABLE "activities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "subprocess_id" UUID NOT NULL REFERENCES "subprocesses"("id") ON DELETE CASCADE,
  "index_code" VARCHAR(15) NOT NULL, -- e.g., '4.1.1'
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "support_tech" VARCHAR(150),
  "info_inputs" TEXT,
  "result" TEXT,
  "business_rules" TEXT,
  "variants_exceptions" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Process Instances Table (State Machine Holder)
CREATE TABLE "process_instances" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "process_id" UUID NOT NULL REFERENCES "processes"("id"),
  "current_state" "${statesEnumName}" NOT NULL DEFAULT '${process.stateMachine.initialState}',
  "current_activity_index" VARCHAR(15) NOT NULL, -- e.g., '4.1.1'
  "custodian_role" VARCHAR(100) NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "started_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "sla_deadline" TIMESTAMP WITH TIME ZONE,
  "sla_breached" BOOLEAN DEFAULT FALSE
);

-- 6. Audit Trail & Custody Transfer Log (SIPOC Conformant)
CREATE TABLE "instance_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "instance_id" UUID NOT NULL REFERENCES "process_instances"("id") ON DELETE CASCADE,
  "activity_index" VARCHAR(15) NOT NULL,
  "activity_name" VARCHAR(255) NOT NULL,
  "operator_name" VARCHAR(150) NOT NULL,
  "operator_role" VARCHAR(100) NOT NULL,
  "action_taken" VARCHAR(50) NOT NULL, -- e.g., 'SUBMIT', 'APPROVE', 'REJECT', 'QUARANTINE'
  "previous_state" VARCHAR(100) NOT NULL,
  "new_state" VARCHAR(100) NOT NULL,
  "custody_transferred_to" VARCHAR(100),
  "execution_details" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Automated KPI Metric Cache
CREATE TABLE "kpi_metrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "process_id" UUID NOT NULL REFERENCES "processes"("id"),
  "kpi_id" VARCHAR(100) NOT NULL,
  "kpi_name" VARCHAR(150) NOT NULL,
  "calculated_value" NUMERIC(10, 4) NOT NULL,
  "evaluation_period" VARCHAR(100) NOT NULL,
  "status" VARCHAR(50) NOT NULL, -- 'SATISFACTORIO', 'INSATISFACTORIO', 'ALERTA'
  "last_calculated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for Fast Searching & SLAs
CREATE INDEX "idx_process_instances_state" ON "process_instances"("current_state");
CREATE INDEX "idx_process_instances_sla" ON "process_instances"("sla_deadline", "sla_breached");
CREATE INDEX "idx_instance_logs_instance" ON "instance_logs"("instance_id");
CREATE INDEX "idx_kpi_metrics_lookup" ON "kpi_metrics"("process_id", "kpi_id");
`;
}

export function generateBusinessLogic(process: ProcessDefinition): string {
  const nameSafe = process.name.replace(/[^a-zA-Z0-9]/g, "");

  return `/**
 * =========================================================================
 * SYSTEM IMPLEMENTATION: STATE MACHINE & AUTOMATED KPI CALCULATION ENGINE
 * PROCESS: ${process.name}
 * LANGUAGE: TypeScript (Enterprise Class Pattern)
 * =========================================================================
 */

export type ProcessState = ${process.stateMachine.states.map(s => `"${s}"`).join(" | ")};

export interface ProcessVariables {
  [key: string]: any;
}

export interface ActivityPayload {
  activityIndex: string;
  operatorName: string;
  operatorRole: string;
  action: string;
  details?: string;
  variablesToUpdate?: Record<string, any>;
}

export class ${nameSafe}Engine {
  private initialState: ProcessState = "${process.stateMachine.initialState}";
  private validStates: Set<ProcessState> = new Set([
    ${process.stateMachine.states.map(s => `"${s}"`).join(",\n    ")}
  ]);

  /**
   * Evaluates and fires state transition according to established institutional BPMN rules.
   */
  public transitionState(
    currentState: ProcessState,
    action: string,
    role: string
  ): { nextState: ProcessState; custodyTransferredTo: string | null; isSLAEscalated: boolean } {
    
    // 1. Check matching standard transition
    const transition = this.getTransition(currentState, action, role);
    
    if (transition) {
      // Find if this triggers a Custody Transfer
      const custody = this.getCustodyTransfer(transition.to);
      return {
        nextState: transition.to as ProcessState,
        custodyTransferredTo: custody ? custody.toRole : null,
        isSLAEscalated: false
      };
    }

    // 2. Check for Exception Handlers
    const exceptionPath = this.getExceptionHandler(currentState, action);
    if (exceptionPath) {
      return {
        nextState: exceptionPath.targetState as ProcessState,
        custodyTransferredTo: "Jefe de Calidad / Administrador de Incidentes",
        isSLAEscalated: true
      };
    }

    throw new Error(\`Violación de Regla de Negocio: No existe una transición válida desde el estado '\${currentState}' para la acción '\${action}' bajo el rol '\${role}'.\`);
  }

  /**
   * Calculates the core Critical Success Factors (FCE / KPIs) using the institutional mathematical models.
   */
  public calculateKPIs(instances: any[]): Record<string, { value: number; status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" }> {
    const results: Record<string, { value: number; status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" }> = {};

    ${process.kpis.map(kpi => {
      return `// --- KPI: ${kpi.name} (${kpi.id}) ---
    // Fórmula: ${kpi.formula}
    // Periodicidad: ${kpi.periodicity}
    try {
      const calculation = this.compute_${kpi.id}(instances);
      let status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" = "ALERTA";
      
      // Evaluation Range: ${kpi.targetRange} vs ${kpi.otherRanges}
      if (${parseTargetToJS(kpi.targetRange, 'calculation')}) {
        status = "SATISFACTORIO";
      } else if (${parseTargetToJS(kpi.otherRanges, 'calculation')}) {
        status = "INSATISFACTORIO";
      }

      results["${kpi.id}"] = { value: calculation, status };
    } catch (e) {
      results["${kpi.id}"] = { value: 0, status: "ALERTA" };
    }
    `;
    }).join("\n    ")}

    return results;
  }

  // --- PRIVATE IMPLEMENTATION DETAILS ---

  private getTransition(from: ProcessState, action: string, role: string) {
    const transitions = [
      ${process.stateMachine.transitions.map(t => {
        return `{ from: "${t.from}", to: "${t.to}", action: "${t.action}", role: "${t.role}" }`;
      }).join(",\n      ")}
    ];
    return transitions.find(
      t => t.from === from && 
      t.action.toLowerCase().trim() === action.toLowerCase().trim() && 
      t.role.toLowerCase().trim() === role.toLowerCase().trim()
    );
  }

  private getCustodyTransfer(targetState: string) {
    const transfers = [
      ${process.stateMachine.custodyTransfers.map(c => {
        return `{ state: "${c.state}", fromRole: "${c.fromRole}", toRole: "${c.toRole}", trigger: "${c.trigger}" }`;
      }).join(",\n      ")}
    ];
    return transfers.find(t => t.state === targetState);
  }

  private getExceptionHandler(fromState: string, action: string) {
    const exceptions = [
      ${process.stateMachine.exceptions.map(e => {
        return `{ triggerState: "${e.triggerState}", targetState: "${e.targetState}", handler: "${e.handler}" }`;
      }).join(",\n      ")}
    ];
    // Exceptions trigger if action indicates error/deviation
    if (action.toUpperCase().includes("RECHAZAR") || action.toUpperCase().includes("FALLAR") || action.toUpperCase().includes("ALERT")) {
      return exceptions.find(e => e.triggerState === fromState);
    }
    return null;
  }

  ${process.kpis.map(kpi => {
    return `private compute_${kpi.id}(instances: any[]): number {
    if (instances.length === 0) return 100; // Default baseline
    
    // Mock simulation arithmetic following the exact formula: ${kpi.formula}
    ${getKPIComputationStubs(kpi.id)}
  }`;
  }).join("\n\n  ")}
}
`;
}

function parseTargetToJS(condition: string, varName: string): string {
  // e.g., "Satisfactorio >= 95%" or "<= 4 Horas"
  const clean = condition.replace(/[a-zA-Z]/g, "").replace("%", "").trim();
  const match = clean.match(/([>=<!]+)?\s*([0-9.]+)/);
  if (match) {
    const operator = match[1] || "==";
    const value = match[2];
    return `${varName} ${operator} ${value}`;
  }
  return `${varName} >= 95`;
}

function getKPIComputationStubs(kpiId: string): string {
  if (kpiId.includes("rec_time") || kpiId.includes("triage_time")) {
    return `const validTimes = instances
      .filter(i => i.variables.elapsedHours !== undefined)
      .map(i => Number(i.variables.elapsedHours));
    if (validTimes.length === 0) return 2.5; // default 2.5 hours
    const sum = validTimes.reduce((acc, t) => acc + t, 0);
    return Number((sum / validTimes.length).toFixed(2));`;
  }
  if (kpiId.includes("quality_rate") || kpiId.includes("reclassification_rate")) {
    const total = `instances.length`;
    const occurrences = `instances.filter(i => i.currentState === "Rejected" || i.currentState === "Quarantined" || i.slaBreached).length`;
    return `const total = ${total};
    const occurrences = ${occurrences};
    return Number(((occurrences / total) * 100).toFixed(1));`;
  }
  // Default stock accuracy or general rate
  return `const compliant = instances.filter(i => !i.slaBreached).length;
    return Number(((compliant / instances.length) * 100).toFixed(1));`;
}

export function generateRESTApiSpecs(process: ProcessDefinition): string {
  let spec = `## REST API SPECIFICATIONS (BPMN Activity Fichas 4.X.Y Gateway)
Process: ${process.name}
Protocol: HTTPS / JSON REST v1.0
Base URL: \`https://api.process-engine.internal/v1/processes/${process.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}\`

---

### GLOBAL SECURITY & CONTEXT HEADERS
All Operational Activity requests must include:
| Header | Type | Description |
|---|---|---|
| \`Authorization\` | \`String\` | Bearer JWT token reflecting authorized operational role |
| \`X-Process-Correlation-ID\` | \`UUID\` | Unique correlation ID for tracing throughout WMS/HIS/ERP |

---

`;

  process.subprocesses.forEach(sub => {
    spec += `### SUBPROCESO ${sub.index}: ${sub.name}\n\n`;
    sub.activities.forEach(act => {
      const endpointPath = `/activities/${act.index}`;
      spec += `#### ACTIVITY ${act.index}: ${act.name}
**Endpoint:** \`POST ${endpointPath}\`
**Operational Role Authorized:** \`${process.responsibleRole}\` or similar sub-role.

**Request Header:**
\`\`\`json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>"
}
\`\`\`

**Request Body (JSON Schema):**
\`\`\`json
{
  "instanceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "operatorName": "Dr. Fernando Pérez",
  "timestamp": "${new Date().toISOString()}",
  "inputData": {
    "infoInputsVerified": "${act.infoInputs}",
    "supportTechUsed": "${act.supportTech}"
  },
  "action": "COMPLETE",
  "notes": "Activity executed normally in accordance with rules."
}
\`\`\`

**Response (Success - 200 OK):**
\`\`\`json
{
  "status": "SUCCESS",
  "message": "Activity ${act.index} recorded successfully.",
  "transition": {
    "activityIndex": "${act.index}",
    "previousState": "Draft",
    "newState": "Pending_Quality",
    "custodyTransferredTo": "Inspector de Calidad",
    "timestamp": "${new Date().toISOString()}"
  },
  "resultState": {
    "outputProduced": "${act.result}",
    "businessRulesComplied": true
  }
}
\`\`\`

**Response (Business Rule Exception - 422 Unprocessable Entity):**
\`\`\`json
{
  "status": "REJECTED_BY_BUSINESS_RULE",
  "errorCode": "RULE_VIOLATION",
  "violatedRule": "${act.rules}",
  "message": "The transaction cannot be processed because it violates procedural business logic.",
  "remedialAction": "${act.variants}"
}
\`\`\`

---

`;
    });
  });

  return spec;
}
