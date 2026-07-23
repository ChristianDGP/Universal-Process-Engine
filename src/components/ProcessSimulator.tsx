import React, { useState, useEffect } from "react";
import { ProcessDefinition, ProcessInstance, SimulationLogEntry } from "../types";
import { Play, RotateCcw, Plus, AlertCircle, ShieldAlert, CheckCircle2, RefreshCw, BarChart2, ListTodo, UserCheck, Sliders, Filter, Activity, Clock, Target, Layers } from "lucide-react";

interface ProcessSimulatorProps {
  process: ProcessDefinition;
}

export default function ProcessSimulator({ process }: ProcessSimulatorProps) {
  const [instances, setInstances] = useState<ProcessInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("Ing. Carlos Soto");
  const [operatorRole, setOperatorRole] = useState(process.responsibleRole || "Operador Principal");
  const [variables, setVariables] = useState<Record<string, string | number | boolean>>({});
  const [kpiMetrics, setKpiMetrics] = useState<Record<string, { value: number; status: string }>>({});
  
  // KPI Dashboard Interactive Parameter Filters & Controls
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL");
  const [simulatedVolume, setSimulatedVolume] = useState<number>(100);
  const [targetSlaToleranceHours, setTargetSlaToleranceHours] = useState<number>(4);
  const [customErrorRate, setCustomErrorRate] = useState<number>(2.5);

  // Active instance helper
  const activeInstance = instances.find((i) => i.id === selectedInstanceId) || null;

  // Find the activity schema currently active for the selected instance
  const getActiveActivity = (instance: ProcessInstance) => {
    for (const sub of process.subprocesses) {
      const act = sub.activities.find((a) => a.index === instance.currentActivityIndex);
      if (act) return { sub, act };
    }
    const firstSub = process.subprocesses[0];
    const firstAct = firstSub?.activities[0];
    return { sub: firstSub, act: firstAct };
  };

  // Helper to calculate KPIs based on instances and interactive parameters
  const calculateKPIs = (allInstances: ProcessInstance[]) => {
    const metrics: Record<string, { value: number; status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" }> = {};

    process.kpis.forEach((kpi) => {
      let value = 0;
      let status: "SATISFACTORIO" | "INSATISFACTORIO" | "ALERTA" = "ALERTA";

      if (allInstances.length === 0) {
        // Base estimation derived from parameter controls
        if (kpi.id.includes("time") || kpi.id.includes("ciclo") || kpi.id.includes("rec")) {
          value = targetSlaToleranceHours;
        } else if (kpi.id.includes("rate") || kpi.id.includes("rechazo") || kpi.id.includes("error")) {
          value = customErrorRate;
        } else {
          value = Number((100 - customErrorRate).toFixed(1));
        }
      } else {
        if (kpi.id.includes("time") || kpi.id.includes("ciclo") || kpi.id.includes("rec")) {
          const times = allInstances
            .map((i) => Number(i.variables.elapsedHours || targetSlaToleranceHours))
            .filter((t) => !isNaN(t));
          value = times.length > 0 ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)) : targetSlaToleranceHours;
        } else if (kpi.id.includes("rate") || kpi.id.includes("rechazo") || kpi.id.includes("error")) {
          const occurrences = allInstances.filter((i) => i.currentState === "Rejected" || i.currentState === "Quarantined" || i.slaBreached).length;
          value = Number(((occurrences / allInstances.length) * 100).toFixed(1));
        } else {
          const compliant = allInstances.filter((i) => !i.slaBreached && i.currentState !== "Rejected").length;
          value = Number(((compliant / allInstances.length) * 100).toFixed(1));
        }
      }

      // Check condition against targetRange
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
  }, [instances, targetSlaToleranceHours, customErrorRate]);

  // Create a brand new instance
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

  // Fast-populate seed data
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

  // Perform operational transition
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

  const filteredKpis = process.kpis.filter((k) => {
    if (selectedPeriod === "ALL") return true;
    return k.periodicity?.toUpperCase() === selectedPeriod.toUpperCase();
  });

  return (
    <div className="space-y-8">
      {/* =========================================================================
          1. ESTRUCTURA PRINCIPAL: KPIS DASHBOARD EN TIEMPO REAL
         ========================================================================= */}
      <section className="bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-slate-900" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                KPIs Dashboard en Tiempo Real
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                TELEMETRÍA TO-BE ACTIVA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monitoreo ejecutivo de Factores Críticos de Éxito (FCE) e indicadores operativos calculados con los parámetros del proceso.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-500">Volumen Simulado:</span>
            <span className="bg-slate-100 text-slate-900 px-2 py-1 font-mono font-bold border border-slate-200">
              {instances.length > 0 ? `${instances.length} Instancias Reales` : `${simulatedVolume} Casos / Período`}
            </span>
          </div>
        </div>

        {/* Dynamic Parameter Controls Panel */}
        <div className="bg-slate-50 border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              Parámetros de Entrada & Sensibilidad del Negocio
            </h4>
            <span className="text-[10px] text-slate-400 font-mono font-semibold">
              Ajuste los valores para recalcular los indicadores en tiempo real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filter by Periodicity */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-500" />
                Filtro de Periodicidad
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
              >
                <option value="ALL">Todos los Períodos ({process.kpis.length})</option>
                <option value="Daily">Diario (Daily)</option>
                <option value="Weekly">Semanal (Weekly)</option>
                <option value="Monthly">Mensual (Monthly)</option>
              </select>
            </div>

            {/* Target SLA Threshold Parameter */}
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
                className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
              />
            </div>

            {/* Error/Rejection Threshold Rate Parameter */}
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
                className="w-full bg-white border border-slate-200 p-2 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
              />
            </div>

            {/* Simulated Case Volume Slider */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Carga Proyectada</span>
                <span className="font-mono text-slate-900 font-bold">{simulatedVolume} solicitudes</span>
              </label>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={simulatedVolume}
                onChange={(e) => setSimulatedVolume(parseInt(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer mt-1"
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
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{kpi.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-bold bg-slate-200/70 text-slate-700 px-1.5 py-0.5">
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

                  {/* Meter & Number display */}
                  <div className="bg-white border border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                        {metric.value}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {isTimeKpi ? "Horas / Promedio" : "% Cumplimiento"}
                      </span>
                    </div>

                    {/* Progress Bar */}
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

                  <div className="text-[10px] text-slate-500 font-mono bg-slate-100/70 p-2 border border-slate-200/60 truncate">
                    <span className="font-bold text-slate-700 font-sans mr-1">Fórmula:</span>
                    {kpi.formula}
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

        {/* Detailed KPI Table Overview */}
        <div className="border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 p-3 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200">
            <Target className="w-4 h-4 text-slate-700" />
            Matriz Consolidada de Indicadores de Gestión y Metas de Desempeño
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">ID / Indicador</th>
                  <th className="p-3">Fórmula Mathemática</th>
                  <th className="p-3">Frecuencia</th>
                  <th className="p-3">Rango Aceptable</th>
                  <th className="p-3">Rango Crítico</th>
                  <th className="p-3 text-right">Estado Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {process.kpis.map((kpi) => {
                  const metric = kpiMetrics[kpi.id] || { value: 0, status: "ALERTA" };
                  return (
                    <tr key={kpi.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {kpi.name}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">#{kpi.id}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">{kpi.formula}</td>
                      <td className="p-3 text-slate-700 font-semibold">{kpi.periodicity}</td>
                      <td className="p-3 text-emerald-700 font-bold">{kpi.targetRange}</td>
                      <td className="p-3 text-rose-600 font-bold">{kpi.otherRanges}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                          metric.status === "SATISFACTORIO" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {metric.value} ({metric.status})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>


      {/* =========================================================================
          2. ESTRUCTURA SECUNDARIA: SIMULADOR INTERACTIVO DE PROCESOS
         ========================================================================= */}
      <section className="bg-white border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                Simulador Interactivo de Procesos (Pruebas Operativas & Transiciones)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Motor secundario de pruebas para validar transiciones de estado, reglas de negocio, transferencias de custodia y violaciones de SLA.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSeedData}
              className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cargar Casos de Prueba
            </button>
            <button
              onClick={handleCreateInstance}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Instancia
            </button>
          </div>
        </div>

        {/* Instances Bar */}
        {instances.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Instancias Simuladas:</span>
            {instances.map((inst) => (
              <button
                key={inst.id}
                onClick={() => {
                  setSelectedInstanceId(inst.id);
                  setOperatorRole(process.responsibleRole || "Operador");
                }}
                className={`px-3 py-1 text-xs font-mono font-bold border transition-colors ${
                  selectedInstanceId === inst.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {inst.id} [{inst.currentState}]
                {inst.slaBreached && <span className="ml-1 text-rose-500">⚠️</span>}
              </button>
            ))}
            <button onClick={handleResetSimulation} className="text-[10px] text-slate-400 font-bold hover:text-rose-600 uppercase tracking-wider ml-auto flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Limpiar
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 p-8 text-center space-y-3 bg-slate-50/50">
            <Play className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">No hay instancias en ejecución. Inicie una simulación operativa o ejecute casos de prueba para testear la máquina de estados.</p>
            <button
              onClick={handleCreateInstance}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              Iniciar Primera Simulación Operativa
            </button>
          </div>
        )}

        {/* Active Simulation Workspace */}
        {activeInstance && (
          <div className="space-y-6 animate-fadeIn">
            {/* Active State Header Banner */}
            <div className="bg-slate-900 text-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                  Caso Simulado: {activeInstance.id}
                </div>
                <div className="text-sm font-bold mt-0.5">
                  Estado Actual: <span className="text-white bg-slate-800 px-2.5 py-0.5 font-mono ml-1 border border-slate-700">{activeInstance.currentState}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 font-medium flex items-center gap-1.5 border border-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Custodio Actual: <strong className="text-white">{operatorRole}</strong>
                </span>
              </div>
            </div>

            {/* Active Activity Details */}
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
                          Ficha Actividad {act.index}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Subproceso: {sub?.name || "Operativo"}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{act.name}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-800">Descripción:</span> {act.description}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                        <div><strong>Apoyo Tecnológico:</strong> <code className="bg-slate-100 px-1 py-0.5">{act.supportTech}</code></div>
                        <div><strong>Resultado:</strong> {act.result}</div>
                        <div><strong>Reglas de Negocio:</strong> {act.rules}</div>
                        <div><strong>Variantes:</strong> {act.variants}</div>
                      </div>
                    </div>
                  )}

                  {/* Simulator Data Input */}
                  <div className="bg-white border border-slate-200 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Parámetros de la Transición Operativa</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Operador Ejecutor</label>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className="w-full border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Horas Ejecutadas en este Paso</label>
                        <input
                          type="number"
                          step="0.5"
                          value={String(variables.elapsedHours || targetSlaToleranceHours)}
                          onChange={(e) => setVariables({ ...variables, elapsedHours: parseFloat(e.target.value) || 1 })}
                          className="w-full border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Triggers */}
                  <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Disparadores de Transición (State Machine)</h5>
                    <div className="flex flex-wrap gap-2">
                      {validTransitions.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExecuteTransition(t.action, t.to)}
                          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {t.action} &rarr; <span className="font-mono text-[10px]">{t.to}</span>
                        </button>
                      ))}

                      {/* Exception Trigger */}
                      <button
                        onClick={() => {
                          const excTarget = process.stateMachine.exceptions[0]?.targetState || process.stateMachine.states[0] || "Draft";
                          handleExecuteTransition("Levantar Excepción / Falla de Calidad", excTarget, true);
                        }}
                        className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Gatillar Excepción de Proceso
                      </button>

                      {/* SLA Timeout Simulation */}
                      <button
                        onClick={handleTriggerSLA}
                        className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Simular Exceso de SLA Timeout
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Audit Logs */}
            <div className="border border-slate-200">
              <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-slate-600" />
                Pista de Auditoría y Registro Transaccional de Custodia (Audit Logs)
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
                        <span className="bg-slate-900 text-white px-1 py-0.5 font-mono">{log.newState}</span>
                        {log.custodyTransferredTo && (
                          <span className="ml-auto text-emerald-700 font-bold">
                            📦 Custodia: {log.custodyTransferredTo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 text-xs py-4">No hay logs registrados todavía. Presione una de las acciones de transición arriba para simular.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
