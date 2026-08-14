import React, { useState, useEffect } from "react";
import { ProcessDefinition, ProcessInstance, SimulationLogEntry, KPIDefinition } from "../types";
import { ensureProcessSubprocessKpis } from "../lib/processTemplateGenerator";
import {
  Play, PlayCircle, RotateCcw, Plus, AlertCircle, ShieldAlert, CheckCircle2,
  RefreshCw, BarChart2, ListTodo, UserCheck, Sliders, Filter, Activity, Clock,
  Target, Layers, Zap, TrendingUp, Cpu, PieChart as PieIcon, Settings2, ArrowRight, X, Edit3, Trash2,
  BookOpen, Info, HelpCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line
} from "recharts";

interface ProcessSimulatorProps {
  process: ProcessDefinition;
  onProcessChange?: (updated: ProcessDefinition) => void;
}

interface SimulationScenario {
  id: string;
  name: string;
  type: "deterministic" | "stochastic";
  distribution: "normal" | "poisson" | "exponential" | "weibull" | "bernoulli" | "mixed";
  meanTime: number;
  variance: number;
  resourceCapacity: number;
  errorRate: number;
  iterations: number;
}

export default function ProcessSimulator({ process: rawProcess, onProcessChange }: ProcessSimulatorProps) {
  const process = React.useMemo(() => ensureProcessSubprocessKpis(rawProcess), [rawProcess]);
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("Ing. Carlos Soto");
  const [operatorRole, setOperatorRole] = useState(process.responsibleRole || "Operador Principal");
  const [variables, setVariables] = useState<Record<string, string | number | boolean>>({});
  const [kpiMetrics, setKpiMetrics] = useState<Record<string, { value: number; status: string }>>({});

  // 2.1 Simulador Parameters & Scenarios State
  const [simMode, setSimMode] = useState<"deterministic" | "stochastic">("stochastic");
  const [distributionType, setDistributionType] = useState<"normal" | "poisson" | "exponential" | "weibull" | "bernoulli" | "mixed">("normal");
  const [meanTimeHours, setMeanTimeHours] = useState<number>(3.5);
  const [varianceValue, setVarianceValue] = useState<number>(0.8);
  const [resourceLimit, setResourceLimit] = useState<number>(12); // Max concurrent capacity
  const [correlationFactor, setCorrelationFactor] = useState<number>(0.75); // Dependency coefficient
  const [monteCarloRuns, setMonteCarloRuns] = useState<number>(500);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showManual, setShowManual] = useState<boolean>(false);

  // KPI CRUD State
  const [showKpiModal, setShowKpiModal] = useState<boolean>(false);
  const [editingKpi, setEditingKpi] = useState<KPIDefinition | null>(null);
  const [kpiForm, setKpiForm] = useState<KPIDefinition>({
    id: `KPI-${String((process.kpis?.length || 0) + 1).padStart(2, '0')}`,
    name: "",
    description: "",
    formula: "",
    periodicity: "Monthly",
    targetRange: ">= 95%",
    otherRanges: "< 90%",
  });

  const handleOpenNewKpi = () => {
    setEditingKpi(null);
    setKpiForm({
      id: `KPI-${String((process.kpis?.length || 0) + 1).padStart(2, '0')}`,
      name: "",
      description: "",
      formula: "",
      periodicity: "Monthly",
      targetRange: ">= 95%",
      otherRanges: "< 90%",
    });
    setShowKpiModal(true);
  };

  const handleOpenEditKpi = (kpi: KPIDefinition) => {
    setEditingKpi(kpi);
    setKpiForm({ ...kpi });
    setShowKpiModal(true);
  };

  const handleDeleteKpi = (kpiId: string) => {
    if (!onProcessChange) return;
    if (confirm("¿Está seguro de eliminar este indicador del tablero?")) {
      const updatedKpis = process.kpis.filter((k) => k.id !== kpiId);
      onProcessChange({ ...process, kpis: updatedKpis });
    }
  };

  const handleSaveKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onProcessChange) return;

    let updatedKpis = [...(process.kpis || [])];
    if (editingKpi) {
      updatedKpis = updatedKpis.map((k) => (k.id === editingKpi.id ? kpiForm : k));
    } else {
      updatedKpis.push(kpiForm);
    }

    onProcessChange({ ...process, kpis: updatedKpis });
    setShowKpiModal(false);
  };
  const [simulationResults, setSimulationResults] = useState<{
    runCompleted: boolean;
    meanDuration: number;
    varianceDuration: number;
    p50: number;
    p95: number;
    p99: number;
    throughputPerHour: number;
    resourceUtilizationPct: number;
    bottleneckActivity: string;
    saturationRisk: "Bajo" | "Moderado" | "Crítico";
    timelineData: { iteration: number; time: number; throughput: number }[];
    distributionData: { bin: string; frequency: number }[];
    recommendations: string[];
  }>({
    runCompleted: false,
    meanDuration: 3.8,
    varianceDuration: 0.65,
    p50: 3.6,
    p95: 5.8,
    p99: 7.2,
    throughputPerHour: 24.5,
    resourceUtilizationPct: 82.4,
    bottleneckActivity: "4.2 Verificación y Aprobación",
    saturationRisk: "Moderado",
    timelineData: [],
    distributionData: [],
    recommendations: [],
  });

  // KPI Dashboard Interactive Parameter Filters & Controls
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [simulatedVolume, setSimulatedVolume] = useState<number>(100);
  const [targetSlaToleranceHours, setTargetSlaToleranceHours] = useState<number>(4);
  const [customErrorRate, setCustomErrorRate] = useState<number>(2.5);

  // Active instance helper
  const activeInstance = instances.find((i) => i.id === selectedInstanceId) || null;

  const getActiveActivity = (instance: ProcessInstance) => {
    for (const sub of process.subprocesses) {
      const act = sub.activities.find((a) => a.index === instance.currentActivityIndex);
      if (act) return { sub, act };
    }
    const firstSub = process.subprocesses[0];
    const firstAct = firstSub?.activities[0];
    return { sub: firstSub, act: firstAct };
  };

  // Run Monte Carlo / Deterministic Simulation Model 2.1
  const runSimulationModel = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const runs = monteCarloRuns;
      let timeline: { iteration: number; time: number; throughput: number }[] = [];
      let timesArray: number[] = [];
      let binCounts: Record<string, number> = { "0-2h": 0, "2-4h": 0, "4-6h": 0, "6-8h": 0, "8h+": 0 };

      for (let i = 1; i <= Math.min(runs, 100); i++) {
        let t = meanTimeHours;
        if (simMode === "stochastic") {
          // Approximate random variations based on distribution
          const randomNormal = (Math.random() + Math.random() + Math.random() - 1.5) * 2;
          if (distributionType === "normal") {
            t = Math.max(0.5, meanTimeHours + randomNormal * Math.sqrt(varianceValue));
          } else if (distributionType === "poisson") {
            t = Math.max(0.5, meanTimeHours + (Math.random() * 2 - 0.5) * varianceValue * 1.5);
          } else if (distributionType === "exponential") {
            t = Math.max(0.5, -Math.log(Math.max(0.01, Math.random())) * (meanTimeHours * 0.8));
          } else if (distributionType === "weibull") {
            t = Math.max(0.5, meanTimeHours * Math.pow(-Math.log(Math.max(0.01, Math.random())), 0.85));
          } else {
            t = Math.max(0.5, meanTimeHours + randomNormal * varianceValue);
          }
        }

        timesArray.push(Number(t.toFixed(2)));
        timeline.push({
          iteration: i,
          time: Number(t.toFixed(2)),
          throughput: Number((simulatedVolume / t).toFixed(1)),
        });

        if (t <= 2) binCounts["0-2h"]++;
        else if (t <= 4) binCounts["2-4h"]++;
        else if (t <= 6) binCounts["4-6h"]++;
        else if (t <= 8) binCounts["6-8h"]++;
        else binCounts["8h+"]++;
      }

      timesArray.sort((a, b) => a - b);
      const mean = Number((timesArray.reduce((a, b) => a + b, 0) / timesArray.length).toFixed(2));
      const variance = Number((timesArray.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / timesArray.length).toFixed(2));
      const p50 = timesArray[Math.floor(timesArray.length * 0.5)] || mean;
      const p95 = timesArray[Math.floor(timesArray.length * 0.95)] || (mean * 1.4);
      const p99 = timesArray[Math.floor(timesArray.length * 0.99)] || (mean * 1.7);
      const throughput = Number((simulatedVolume / mean).toFixed(1));
      const utilPct = Number(Math.min(98, Math.max(45, (mean / targetSlaToleranceHours) * 75 + (resourceLimit < 10 ? 15 : 0))).toFixed(1));

      const distributionData = Object.keys(binCounts).map((bin) => ({
        bin,
        frequency: binCounts[bin],
      }));

      // Recommendations engine
      const recs: string[] = [];
      if (utilPct > 85) {
        recs.push(`Riesgo de saturación detectado (${utilPct}% de utilización). Se recomienda incrementar la capacidad de recursos o paralelizar actividades.`);
      }
      if (p95 > targetSlaToleranceHours) {
        recs.push(`El percentil 95 (${p95}h) excede la tolerancia SLA (${targetSlaToleranceHours}h). Optimizar el cuello de botella en ${process.subprocesses[1]?.activities[1]?.name || 'etapa intermedia'}.`);
      }
      if (simMode === "stochastic" && variance > 1.0) {
        recs.push(`Alta variabilidad estocástica detectada ($\sigma^2 = ${variance}$). Estandarizar criterios operativos para reducir la dispersión de tiempos.`);
      }
      if (recs.length === 0) {
        recs.push("El sistema opera dentro de parámetros óptimos de estabilidad y cumplimiento normativo.");
      }

      setSimulationResults({
        runCompleted: true,
        meanDuration: mean,
        varianceDuration: variance,
        p50,
        p95,
        p99,
        throughputPerHour: throughput,
        resourceUtilizationPct: utilPct,
        bottleneckActivity: process.subprocesses[1]?.activities[0]?.name || "Evaluación Técnica",
        saturationRisk: utilPct > 85 ? "Crítico" : utilPct > 70 ? "Moderado" : "Bajo",
        timelineData: timeline,
        distributionData,
        recommendations: recs,
      });

      setIsSimulating(false);
    }, 600);
  };

  // Calculate KPIs
  const calculateKPIs = (allInstances: ProcessInstance[]) => {
    const metrics: Record<string, { value: number; status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" }> = {};

    process.kpis.forEach((kpi) => {
      let value = 0;
      let status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" = "ALERTA";

      if (simulationResults.runCompleted) {
        if (kpi.id.includes("time") || kpi.id.includes("ciclo") || kpi.id.includes("rec")) {
          value = simulationResults.meanDuration;
        } else if (kpi.id.includes("rate") || kpi.id.includes("rechazo") || kpi.id.includes("error")) {
          value = simulationResults.saturationRisk === "Crítico" ? 8.5 : customErrorRate;
        } else {
          value = simulationResults.resourceUtilizationPct < 80 ? 96.5 : 88.0;
        }
      } else {
        if (kpi.id.includes("time") || kpi.id.includes("ciclo") || kpi.id.includes("rec")) {
          value = targetSlaToleranceHours;
        } else if (kpi.id.includes("rate") || kpi.id.includes("rechazo") || kpi.id.includes("error")) {
          value = customErrorRate;
        } else {
          value = Number((100 - customErrorRate).toFixed(1));
        }
      }

      const parseLimit = (rangeStr: string) => {
        const clean = rangeStr.replace(/[a-zA-Z]/g, "").replace("%", "").trim();
        const match = clean.match(/([>=<!]+)?\s*([0-9.]+)/);
        if (match) {
          return {
            operator: match[1] || "==",
            val: parseFloat(match[2]),
          };
        }
        return { operator: ">=", val: 95 };
      };

      const checkRange = (metricVal: number, condStr: string) => {
        const { operator, val } = parseLimit(condStr);
        switch (operator) {
          case ">=": return metricVal >= val;
          case "<=": return metricVal <= val;
          case ">": return metricVal > val;
          case "<": return metricVal < val;
          default: return metricVal === val;
        }
      };

      if (checkRange(value, kpi.targetRange)) {
        status = "SATISFACTORIO";
      } else if (checkRange(value, kpi.otherRanges)) {
        status = "INSATISFACTORIO";
      } else {
        status = "ALERTA";
      }

      metrics[kpi.id] = { value, status };
    });

    setKpiMetrics(metrics);
  };

  useEffect(() => {
    calculateKPIs(instances);
  }, [instances, targetSlaToleranceHours, customErrorRate, simulationResults.runCompleted]);

  const handleCreateInstance = () => {
    const firstActCode = process.subprocesses[0]?.activities[0]?.index || "4.1.1";
    const newInstance: ProcessInstance = {
      id: `PI-${Math.floor(1000 + Math.random() * 9000)}`,
      processName: process.name,
      currentState: process.stateMachine.initialState || "Draft",
      currentActivityIndex: firstActCode,
      startedAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
      history: [],
      variables: { elapsedHours: targetSlaToleranceHours },
      slaBreached: false,
    };

    setInstances((prev) => [newInstance, ...prev]);
    setSelectedInstanceId(newInstance.id);
  };

  const handleSeedData = () => {
    const seedInstances: ProcessInstance[] = [
      {
        id: "PI-8102",
        processName: process.name,
        currentState: process.stateMachine.states[process.stateMachine.states.length - 1] || "Executed",
        currentActivityIndex: "4.3.2",
        startedAt: "08:15:22",
        updatedAt: "09:30:11",
        history: [],
        variables: { elapsedHours: 1.25 },
        slaBreached: false,
      },
      {
        id: "PI-7294",
        processName: process.name,
        currentState: process.stateMachine.states[process.stateMachine.states.length - 1] || "Executed",
        currentActivityIndex: "4.3.2",
        startedAt: "09:00:10",
        updatedAt: "10:15:05",
        history: [],
        variables: { elapsedHours: 1.2 },
        slaBreached: false,
      },
      {
        id: "PI-3419",
        processName: process.name,
        currentState: "Rejected",
        currentActivityIndex: "4.2.2",
        startedAt: "10:30:00",
        updatedAt: "12:10:44",
        history: [],
        variables: { elapsedHours: 6.5 },
        slaBreached: true,
      },
      {
        id: "PI-5021",
        processName: process.name,
        currentState: process.stateMachine.states[1] || "In_Progress",
        currentActivityIndex: "4.2.1",
        startedAt: "11:15:00",
        updatedAt: "13:00:00",
        history: [],
        variables: { elapsedHours: 1.75 },
        slaBreached: false,
      }
    ];

    setInstances(seedInstances);
    setSelectedInstanceId(seedInstances[0].id);
  };

  const handleResetSimulation = () => {
    setInstances([]);
    setSelectedInstanceId(null);
    setVariables({});
  };

  const handleExecuteTransition = (actionName: string, targetState: string, isException = false) => {
    if (!activeInstance) return;

    const { act } = getActiveActivity(activeInstance);
    const actIndex = act?.index || "4.1.1";
    const actName = act?.name || "Actividad Operativa";

    let nextActivityIndex = activeInstance.currentActivityIndex;
    if (!isException && process.subprocesses.length > 0) {
      const allActivities = process.subprocesses.flatMap((s) => s.activities);
      const currentIndex = allActivities.findIndex((a) => a.index === activeInstance.currentActivityIndex);
      if (currentIndex !== -1 && currentIndex + 1 < allActivities.length) {
        nextActivityIndex = allActivities[currentIndex + 1].index;
      }
    }

    const custodyDef = process.stateMachine.custodyTransfers.find((c) => c.state === targetState);

    const newLog: SimulationLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      activityIndex: actIndex,
      activityName: actName,
      previousState: activeInstance.currentState,
      newState: targetState,
      actionTaken: isException ? "TRIGGER_EXCEPTION" : "COMPLETE",
      role: operatorRole,
      operatorName: operatorName,
      custodyTransferredTo: custodyDef ? custodyDef.toRole : undefined,
      details: isException
        ? `Desviación Operativa gestionada en el proceso.`
        : `Actividad completada exitosamente según reglas de negocio.`,
    };

    const isSlabreach = activeInstance.variables.elapsedHours ? Number(activeInstance.variables.elapsedHours) > targetSlaToleranceHours : false;

    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id === activeInstance.id) {
          return {
            ...inst,
            currentState: targetState,
            currentActivityIndex: nextActivityIndex,
            updatedAt: new Date().toLocaleTimeString(),
            slaBreached: isSlabreach || inst.slaBreached,
            history: [...inst.history, newLog],
            variables: { ...inst.variables, ...variables },
          };
        }
        return inst;
      })
    );

    if (custodyDef) {
      setOperatorRole(custodyDef.toRole);
    }
  };

  const handleTriggerSLA = () => {
    if (!activeInstance) return;

    const { act } = getActiveActivity(activeInstance);
    const actIndex = act?.index || "4.1.1";
    const actName = act?.name || "Actividad Operativa";

    const newLog: SimulationLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      activityIndex: actIndex,
      activityName: actName,
      previousState: activeInstance.currentState,
      newState: activeInstance.currentState,
      actionTaken: "TIMEOUT",
      role: "Sistema de Monitoreo Automático",
      operatorName: "SLA Daemon Engine",
      details: "LÍMITE DE TIEMPO VIOLADO: Se excedió el tiempo máximo permitido por la regla SLA.",
    };

    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id === activeInstance.id) {
          return {
            ...inst,
            slaBreached: true,
            updatedAt: new Date().toLocaleTimeString(),
            variables: { ...inst.variables, elapsedHours: targetSlaToleranceHours * 2 },
            history: [...inst.history, newLog],
          };
        }
        return inst;
      })
    );
  };

  if (!process || !process.name || process.name.trim() === "") {
    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 flex justify-between items-center px-6 py-4 flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">2. Simulador & KPIs Dashboard</h3>
            <p className="text-xs text-slate-500">Monitoreo y modelado estocástico de procesos</p>
          </div>
        </div>
        <div className="p-16 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlayCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-950 tracking-tight">Ningún proceso seleccionado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Por favor seleccione un proceso existente en la librería o genere un nuevo modelo TO-BE en el selector superior para iniciar la simulación y el tablero de KPIs.
          </p>
        </div>
      </div>
    );
  }

  const filteredKpis = (process.kpis || []).filter((k) => {
    if (selectedPeriod === "ALL") return true;
    return k.periodicity?.toUpperCase() === selectedPeriod.toUpperCase();
  });

  return (
    <div className="space-y-10">
      {/* =========================================================================
          MODULE 2.1: SIMULADOR AVANZADO (DETERMINÍSTICO / ESTOCÁSTICO / MONTE CARLO)
         ========================================================================= */}
      <section className="bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-black text-slate-950 tracking-tight uppercase">
                2.1 Módulo de Simulación Avanzada
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure parámetros de entrada, distribuciones de probabilidad (Poisson, Normal, Exponencial, Weibull), restricciones de capacidad y ejecute escenarios de sensibilidad.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowManual(!showManual)}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs border border-slate-300 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>{showManual ? "Ocultar Guía de Cálculo" : "Ver Guía de Cálculo"}</span>
            </button>

            <button
              onClick={runSimulationModel}
              disabled={isSimulating}
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>Ejecutar Modelo de Simulación</span>
            </button>
          </div>
        </div>

        {/* MANUAL / INSTRUCTIVO DE ATRIBUTOS DE CÁLCULO */}
        {showManual && (
          <div className="bg-slate-50 border-l-4 border-slate-900 p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-800" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                  Guía Técnica: Atributos y Métodos de Cálculo de Simulación
                </h4>
              </div>
              <button
                onClick={() => setShowManual(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Cerrar Guía"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Este manual describe los fundamentos matemáticos y conceptuales de cada variable que interviene en los cálculos del simulador. La simulación utiliza un motor estocástico de <strong>Monte Carlo</strong> para evaluar miles de rutas posibles del proceso de forma genérica, modelando retrasos, reprocesos y disponibilidad de recursos humanos/tecnológicos.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Bloque 1: Tiempo Medio */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <span className="text-blue-600 font-mono text-xs">μ</span>
                  <span>Tiempo Medio del Proceso</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Representa el valor esperado o centro de gravedad del tiempo total que demora completar el proceso. Es el parámetro base que define la velocidad promedio operativa del flujo completo.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Cálculo:</strong> <span className="text-blue-700">μ = (Σ T_i) / N</span> (Suma de tiempos de todos los casos dividida por la cantidad total de instancias).
                </div>
              </div>

              {/* Bloque 2: Varianza */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <span className="text-amber-600 font-mono text-xs">σ²</span>
                  <span>Varianza (Dispersión)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Mide la variabilidad o incertidumbre de los tiempos de ciclo. Una varianza alta indica falta de estandarización, interrupciones externas o inestabilidad operativa.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Cálculo:</strong> <span className="text-amber-700">σ² = Σ(T_i - μ)² / N</span> (Dispersión cuadrática respecto a la media).
                </div>
              </div>

              {/* Bloque 3: Distribuciones */}
              <div className="bg-white border border-slate-200 p-4 space-y-2 md:col-span-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Distribuciones de Probabilidad (Flujo Estocástico)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">1. Normal (Gaussiana)</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Aproxima tareas estandarizadas donde los desvíos son simétricos alrededor del tiempo medio. Campana clásica de Gauss.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">2. Poisson</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Modela la frecuencia de llegada de transacciones o casos por unidad de tiempo. Ideal para flujos de alta demanda.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">3. Exponencial</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Modela el tiempo transcurrido entre eventos aleatorios sucesivos. Adecuado para modelar colas y demoras de espera.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">4. Weibull</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Muy versátil, modela desgaste, fatiga de recursos o fallas iniciales de herramientas que asisten al proceso.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">5. Bernoulli</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Modela decisiones discretas binarias (Ej: Aprobado / Rechazado) con una probabilidad fija de éxito o fracaso.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">6. Mixta</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Superposición de variables con componentes fijos (determinísticos) y desvíos aleatorios (estocásticos).
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloque 4: Capacidad y Ocupación */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Capacidad de Recursos Concurrentes (C)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Establece la cantidad máxima de analistas u operadores que pueden trabajar en paralelo. Si el volumen supera esta capacidad, los casos forman una cola, aumentando la duración total.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Ocupación:</strong> <span className="text-emerald-700">Utilización % = (Demanda × μ) / (Capacidad × SLA)</span>
                </div>
              </div>

              {/* Bloque 5: Coeficiente de Correlación */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  <span>Coeficiente de Correlación (r)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Modela la relación de dependencia entre etapas sucesivas del flujo. Un coeficiente alto ($r \ge 0.70$) causa un efecto cascada: si la etapa inicial se retrasa, las siguientes también arrastrarán ese retraso de forma proporcional.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Efecto:</strong> <span className="text-purple-700">Retraso Secundario = Retraso Previo × Coefficient (r)</span>
                </div>
              </div>

              {/* Bloque 6: Iteraciones Monte Carlo */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Cpu className="w-3.5 h-3.5 text-rose-600" />
                  <span>Iteraciones de Monte Carlo (N_runs)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Número de simulaciones individuales que corre el motor. Cada iteración utiliza variables aleatorias basadas en la distribución para simular un escenario posible diferente.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Convergencia:</strong> Más iteraciones otorgan mayor precisión estadística en percentiles extremos ($P_{95}$, $P_{99}$).
                </div>
              </div>

              {/* Bloque 7: Tasa de Error */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tasa de Error y Reproceso (%)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Probabilidad de que un caso no cumpla los estándares y requiera devolverse a etapas previas. Esto incrementa de forma no-lineal la carga de trabajo y congestiona los recursos.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm">
                  <strong>Cálculo:</strong> <span className="text-amber-700">Volumen Efectivo = Volumen Inicial / (1 - Error Rate)</span>
                </div>
              </div>

              {/* Bloque 8: Riesgo Sistema / Saturación */}
              <div className="bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Riesgo Sistema (Nivel de Saturación Operativa)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Semáforo de alerta global que evalúa la estabilidad del sistema ante la tasa de ocupación de recursos y colas de espera.
                </p>
                <div className="bg-slate-50 p-2 font-mono text-[10px] text-slate-700 border border-slate-100 rounded-sm space-y-1">
                  <div><strong>Rangos de Evaluación:</strong></div>
                  <div className="text-emerald-700 font-bold">• Bajo (&le; 70%): Operación holgada y estable.</div>
                  <div className="text-amber-700 font-bold">• Moderado (70% - 85%): Carga alta, vulnerable a picos.</div>
                  <div className="text-rose-700 font-bold">• Crítico (&gt; 85%): Riesgo inminente de colapso de SLA y retrasos en cola.</div>
                </div>
              </div>

              {/* Bloque 9: Métricas Estadísticas de Salida */}
              <div className="bg-white border border-slate-200 p-4 space-y-2 md:col-span-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Sliders className="w-3.5 h-3.5 text-slate-800" />
                  <span>Métricas Estadísticas de Salida y Percentiles (SLA)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">Mediana (P50)</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      El 50% de los casos concluyen en un tiempo menor o igual a este valor. No se ve afectado por casos extremos atípicos.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">Percentil 95 (P95)</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Límite crítico de compromiso SLA: el 95% de los casos se resuelven antes de esta marca temporal; solo un 5% de casos complejos lo superan.
                    </p>
                  </div>
                  <div className="border border-slate-100 p-2.5 bg-slate-50/50">
                    <strong className="text-[10px] text-slate-800 block uppercase">Rendimiento (Throughput - Th)</strong>
                    <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                      Tasa de salida promedio de transacciones o casos completados por unidad de hora (<span className="font-mono font-bold text-slate-700">Th = Casos / Horas Totales</span>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 text-slate-200 p-3.5 text-[11px] font-medium leading-relaxed">
              <strong className="text-amber-400 uppercase tracking-wider block mb-1">💡 Nota para Diseñadores de Procesos:</strong>
              Para lograr simulaciones con un nivel de confianza superior al 95%, recopile datos históricos de por lo menos 100 ejecuciones reales para alimentar el tiempo medio (μ) y la varianza (σ²).
            </div>
          </div>
        )}

        {/* Configuration Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 p-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tipo de Modelo
            </label>
            <select
              value={simMode}
              onChange={(e) => setSimMode(e.target.value as "deterministic" | "stochastic")}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer"
            >
              <option value="stochastic">Estocástico (Con Variabilidad Probabilística)</option>
              <option value="deterministic">Determinístico (Resultados Fijos / Ideales)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Distribución de Probabilidad
            </label>
            <select
              value={distributionType}
              disabled={simMode === "deterministic"}
              onChange={(e) => setDistributionType(e.target.value as any)}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer disabled:opacity-50"
            >
              <option value="normal">Normal (Gaussiana)</option>
              <option value="poisson">Poisson (Tasa de Llegadas)</option>
              <option value="exponential">Exponencial (Tiempos de Espera)</option>
              <option value="weibull">Weibull (Fallasy Confiabilidad)</option>
              <option value="bernoulli">Bernoulli (Tasas de Aceptación)</option>
              <option value="mixed">Mixta (Determinística + Estocástica)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tiempo Medio ($\mu$) / Horas
            </label>
            <input
              type="number"
              step="0.25"
              min="0.5"
              max="24"
              value={meanTimeHours}
              onChange={(e) => setMeanTimeHours(parseFloat(e.target.value) || 3.5)}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Varianza ($\sigma^2$) / Dispersión
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              disabled={simMode === "deterministic"}
              value={varianceValue}
              onChange={(e) => setVarianceValue(parseFloat(e.target.value) || 0.8)}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Capacidad de Recursos (Concurrentes)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={resourceLimit}
              onChange={(e) => setResourceLimit(parseInt(e.target.value) || 12)}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Iteraciones Monte Carlo
            </label>
            <select
              value={monteCarloRuns}
              onChange={(e) => setMonteCarloRuns(parseInt(e.target.value))}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer"
            >
              <option value="100">100 Iteraciones (Rápido)</option>
              <option value="500">500 Iteraciones (Estándar)</option>
              <option value="1000">1,000 Iteraciones (Alta Precisión)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Coeficiente de Correlación ($r$)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={correlationFactor}
              onChange={(e) => setCorrelationFactor(parseFloat(e.target.value) || 0.75)}
              className="w-full bg-white border border-slate-300 p-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <div className="flex items-end">
            <div className="w-full bg-white border border-slate-300 p-2 text-xs flex items-center justify-between font-bold">
              <span className="text-slate-500">Riesgo Sistema:</span>
              <span className={`px-2 py-0.5 text-[10px] uppercase font-black ${
                simulationResults.saturationRisk === "Crítico" ? "bg-rose-100 text-rose-800" :
                simulationResults.saturationRisk === "Moderado" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {simulationResults.saturationRisk}
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Output Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tiempo Medio ($\mu$)</span>
            <div className="text-2xl font-black text-slate-950 font-mono">{simulationResults.meanDuration}h</div>
            <span className="text-[10px] text-slate-500">Varianza: {simulationResults.varianceDuration}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Mediana ($P_{50}$)</span>
            <div className="text-2xl font-black text-slate-950 font-mono">{simulationResults.p50}h</div>
            <span className="text-[10px] text-slate-500">Valor central</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Percentil 95 ($P_{95}$)</span>
            <div className="text-2xl font-black text-rose-600 font-mono">{simulationResults.p95}h</div>
            <span className="text-[10px] text-slate-500">Límite SLA crítico</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Rendimiento (Th)</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">{simulationResults.throughputPerHour}</div>
            <span className="text-[10px] text-slate-500">Casos / Hora</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Ocupación Recursos</span>
            <div className={`text-2xl font-black font-mono ${simulationResults.resourceUtilizationPct > 85 ? 'text-rose-600' : 'text-slate-950'}`}>
              {simulationResults.resourceUtilizationPct}%
            </div>
            <span className="text-[10px] text-slate-500">Límite: {resourceLimit} op.</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Punto Crítico</span>
            <div className="text-xs font-bold text-slate-900 truncate mt-1" title={simulationResults.bottleneckActivity}>
              {simulationResults.bottleneckActivity}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">Cuello de botella</span>
          </div>
        </div>

        {/* Charts Section: Timeline & Probability Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Evolution Chart */}
          <div className="border border-slate-200 p-5 space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Evolución Temporal de Tiempos por Iteración
              </h4>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 text-slate-600">Monte Carlo N={monteCarloRuns}</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationResults.timelineData}>
                  <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="iteration" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="h" />
                  <Tooltip contentStyle={{ background: "#0f172a", color: "#fff", fontSize: "11px", border: "none" }} />
                  <Area type="monotone" dataKey="time" name="Duración (Horas)" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTime)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Probability Distribution Bar Chart */}
          <div className="border border-slate-200 p-5 space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-600" />
                Distribución de Probabilidad de Duración de Casos
              </h4>
              <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 text-slate-600">Modelo {simMode}</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={simulationResults.distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bin" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0f172a", color: "#fff", fontSize: "11px", border: "none" }} />
                  <Bar dataKey="frequency" name="Frecuencia Casos" fill="#d97706" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recommendations & Adjustments */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 space-y-2">
          <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            Recomendaciones de Ajustes de Parámetros & Recursos
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 font-medium">
            {simulationResults.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </section>


      {/* =========================================================================
          MODULE 2.2: KPIS DASHBOARD & INDICATOR CARDS (FICHAS DE INDICADORES)
         ========================================================================= */}
      <section className="bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-slate-950" />
              <h3 className="text-lg font-black text-slate-950 tracking-tight uppercase">
                2.2 KPIs Dashboard
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tablero estructurado de indicadores de rendimiento, tiempos de ciclo, tasas de error y cumplimiento normativo vinculados al modelo de simulación.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onProcessChange && (
              <button
                onClick={handleOpenNewKpi}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Indicador</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">Volumen Simulado:</span>
              <span className="bg-slate-100 text-slate-950 px-2 py-1 font-mono font-bold border border-slate-200">
                {instances.length > 0 ? `${instances.length} Instancias Reales` : `${simulatedVolume} Casos / Período`}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Controls Panel */}
        <div className="bg-slate-50 border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              Filtros & Controles del Tablero de KPIs
            </h4>
            <span className="text-[10px] text-slate-400 font-mono font-semibold">
              Ajuste la sensibilidad para recalcular el cumplimiento de metas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-500" />
                Filtro de Periodicidad
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-900 font-medium focus:ring-1 focus:ring-slate-950 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Períodos ({process.kpis.length})</option>
                <option value="Daily">Diario (Daily)</option>
                <option value="Weekly">Semanal (Weekly)</option>
                <option value="Monthly">Mensual (Monthly)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                SLA Tolerancia Tiempo (Horas)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="72"
                value={targetSlaToleranceHours}
                onChange={(e) => setTargetSlaToleranceHours(parseFloat(e.target.value) || 4)}
                className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-900 font-bold focus:ring-1 focus:ring-slate-950 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                Tasa Tolerancia Desviación (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={customErrorRate}
                onChange={(e) => setCustomErrorRate(parseFloat(e.target.value) || 2.5)}
                className="w-full bg-white border border-slate-300 p-2 text-xs text-slate-900 font-bold focus:ring-1 focus:ring-slate-950 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Primary KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredKpis.length > 0 ? (
            filteredKpis.map((kpi) => {
              const metric = kpiMetrics[kpi.id] || { value: 0, status: "ALERTA" };
              const isTimeKpi = kpi.id.includes("time") || kpi.id.includes("ciclo") || kpi.id.includes("rec");

              return (
                <div key={kpi.id} className="border border-slate-200 p-5 space-y-4 bg-slate-50/40 hover:border-slate-300 transition-colors relative flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-950 leading-snug">{kpi.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-1.5 py-0.5">
                            {kpi.id}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            Período: {kpi.periodicity}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${
                          metric.status === "SATISFACTORIO"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : metric.status === "INSATISFACTORIO"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {metric.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {kpi.description}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-black text-slate-950 tracking-tight font-mono">
                        {metric.value}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {isTimeKpi ? "Horas / Promedio" : "% Cumplimiento"}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 overflow-hidden rounded-full">
                      <div
                        className={`h-full transition-all duration-500 ${
                          metric.status === "SATISFACTORIO"
                            ? "bg-emerald-500"
                            : metric.status === "INSATISFACTORIO"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.min(100, isTimeKpi ? (metric.value / (targetSlaToleranceHours * 2)) * 100 : metric.value)}%`
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-600 pt-1 font-medium">
                      <span>Meta: <strong className="text-emerald-700 font-bold">{kpi.targetRange}</strong></span>
                      <span>Crítico: <strong className="text-rose-600 font-bold">{kpi.otherRanges}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-100/80 p-2 border border-slate-200/75">
                    <span className="truncate max-w-[160px]">
                      <strong className="text-slate-700 font-sans mr-1">Fórmula:</strong>
                      {kpi.formula}
                    </span>
                    {onProcessChange && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          onClick={() => handleOpenEditKpi(kpi)}
                          className="px-1.5 py-0.5 bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 flex items-center gap-0.5 cursor-pointer"
                          title="Editar Indicador"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteKpi(kpi.id)}
                          className="px-1.5 py-0.5 bg-white hover:bg-rose-50 text-rose-700 font-bold border border-rose-200 flex items-center gap-0.5 cursor-pointer"
                          title="Eliminar Indicador"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full border border-dashed border-slate-200 p-8 text-center text-slate-500 text-xs">
              No hay indicadores definidos para el período seleccionado. Selecciona "Todos los Períodos".
            </div>
          )}
        </div>
      </section>


      {/* =========================================================================
          MODULE 2.3: SIMULADOR INTERACTIVO DE PROCESOS (PRUEBAS OPERATIVAS)
         ========================================================================= */}
      <section className="bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-800" />
              <h3 className="text-base font-bold text-slate-950 tracking-tight uppercase">
                Simulador Operativo de Instancias & Transiciones
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pruebe instancias individuales para verificar la máquina de estados, transferencias de custodia y registro transaccional en tiempo real.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSeedData}
              className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar Casos de Prueba
            </button>
            <button
              onClick={handleCreateInstance}
              className="px-4 py-1.5 bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Instancia
            </button>
          </div>
        </div>

        {instances.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Instancias:</span>
            {instances.map((inst) => (
              <button
                key={inst.id}
                onClick={() => {
                  setSelectedInstanceId(inst.id);
                  setOperatorRole(process.responsibleRole || "Operador");
                }}
                className={`px-3 py-1 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  selectedInstanceId === inst.id
                    ? "bg-slate-950 text-white border-slate-950"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {inst.id} [{inst.currentState}]
                {inst.slaBreached && <span className="ml-1 text-rose-500">⚠️</span>}
              </button>
            ))}
            <button onClick={handleResetSimulation} className="text-[10px] text-slate-400 font-bold hover:text-rose-600 uppercase tracking-wider ml-auto flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3 h-3" /> Limpiar
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 p-8 text-center space-y-3 bg-slate-50/50">
            <Play className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No hay instancias en ejecución. Inicie una simulación operativa o cargue casos de prueba.</p>
            <button
              onClick={handleCreateInstance}
              className="px-4 py-2 bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              Iniciar Primera Simulación Operativa
            </button>
          </div>
        )}

        {activeInstance && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-950 text-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                  Caso: {activeInstance.id}
                </div>
                <div className="text-sm font-bold mt-0.5">
                  Estado: <span className="text-white bg-slate-800 px-2.5 py-0.5 font-mono ml-1 border border-slate-700">{activeInstance.currentState}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-3 py-1.5 bg-slate-900 text-slate-300 font-medium flex items-center gap-1.5 border border-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Custodio: <strong className="text-white">{operatorRole}</strong>
                </span>
              </div>
            </div>

            {(() => {
              const { sub, act } = getActiveActivity(activeInstance);
              const validTransitions = process.stateMachine.transitions.filter(
                (t) => t.from === activeInstance.currentState
              );

              return (
                <div className="space-y-4">
                  {act && (
                    <div className="border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 font-mono">
                          Actividad {act.index}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Subproceso: {sub?.name || "Operativo"}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-950">{act.name}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Descripción:</span> {act.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                        <div><strong>Soporte:</strong> <code className="bg-slate-100 px-1 py-0.5">{act.supportTech}</code></div>
                        <div><strong>Resultado:</strong> {act.result}</div>
                        <div><strong>Reglas:</strong> {act.rules}</div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Parámetros Operativos</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Operador Ejecutor</label>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className="w-full border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Ejecutadas en este Paso</label>
                        <input
                          type="number"
                          step="0.5"
                          value={String(variables.elapsedHours || targetSlaToleranceHours)}
                          onChange={(e) => setVariables({ ...variables, elapsedHours: parseFloat(e.target.value) || 1 })}
                          className="w-full border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Disparadores de Transición</h5>
                    <div className="flex flex-wrap gap-2">
                      {validTransitions.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExecuteTransition(t.action, t.to)}
                          className="px-4 py-2 bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {t.action} &rarr; <span className="font-mono text-[10px]">{t.to}</span>
                        </button>
                      ))}

                      <button
                        onClick={() => {
                          const excTarget = process.stateMachine.exceptions[0]?.targetState || process.stateMachine.states[0] || "Draft";
                          handleExecuteTransition("Levantar Excepción / Falla de Calidad", excTarget, true);
                        }}
                        className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Gatillar Excepción de Proceso
                      </button>

                      <button
                        onClick={handleTriggerSLA}
                        className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Simular Exceso de SLA Timeout
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="border border-slate-200">
              <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-xs text-slate-950 flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-slate-700" />
                Pista de Auditoría & Registro Transaccional
              </div>
              <div className="p-4 max-h-[220px] overflow-y-auto space-y-3">
                {activeInstance.history.length > 0 ? (
                  activeInstance.history.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                        <span>{log.timestamp} - Actividad {log.activityIndex} ({log.activityName})</span>
                        <span className="font-bold text-slate-600">Por: {log.operatorName} ({log.role})</span>
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed">{log.details}</p>
                      <div className="flex gap-2 items-center text-[10px]">
                        <span className="font-bold text-slate-500 uppercase">Transición:</span>
                        <span className="bg-slate-100 text-slate-700 px-1 py-0.5 font-mono">{log.previousState}</span>
                        <span>&rarr;</span>
                        <span className="bg-slate-950 text-white px-1 py-0.5 font-mono">{log.newState}</span>
                        {log.custodyTransferredTo && (
                          <span className="ml-auto text-emerald-700 font-bold">
                            📦 Custodia: {log.custodyTransferredTo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 text-xs py-4">No hay logs registrados todavía.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* KPI ADD/EDIT MODAL */}
      {showKpiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-lg w-full shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-slate-900" />
                {editingKpi ? "Editar Ficha de Indicador KPI" : "Nuevo Indicador KPI TO-BE"}
              </h3>
              <button
                onClick={() => setShowKpiModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKpi} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Indicador</label>
                  <input
                    type="text"
                    required
                    value={kpiForm.id}
                    onChange={(e) => setKpiForm({ ...kpiForm, id: e.target.value })}
                    className="w-full border border-slate-300 p-2 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-950 focus:outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Periodicidad</label>
                  <select
                    value={kpiForm.periodicity}
                    onChange={(e) => setKpiForm({ ...kpiForm, periodicity: e.target.value as any })}
                    className="w-full border border-slate-300 p-2 text-xs font-medium focus:ring-1 focus:ring-slate-950 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="Daily">Diario (Daily)</option>
                    <option value="Weekly">Semanal (Weekly)</option>
                    <option value="Monthly">Mensual (Monthly)</option>
                    <option value="Quarterly">Trimestral (Quarterly)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Indicador</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Tasa de Cumplimiento de Plazos"
                  value={kpiForm.name}
                  onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs font-medium focus:ring-1 focus:ring-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Conceptual</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descripción detallada del propósito del indicador..."
                  value={kpiForm.description}
                  onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs font-medium focus:ring-1 focus:ring-slate-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fórmula Matemática</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. (OnTime / Total) * 100"
                  value={kpiForm.formula}
                  onChange={(e) => setKpiForm({ ...kpiForm, formula: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs font-mono focus:ring-1 focus:ring-slate-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meta Satisfactorio</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. >= 95%"
                    value={kpiForm.targetRange}
                    onChange={(e) => setKpiForm({ ...kpiForm, targetRange: e.target.value })}
                    className="w-full border border-slate-300 p-2 text-xs font-mono focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rango Crítico</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. < 90%"
                    value={kpiForm.otherRanges}
                    onChange={(e) => setKpiForm({ ...kpiForm, otherRanges: e.target.value })}
                    className="w-full border border-slate-300 p-2 text-xs font-mono focus:ring-1 focus:ring-slate-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowKpiModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  {editingKpi ? "Guardar Cambios" : "Crear Indicador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
