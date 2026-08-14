import React, { useState, useEffect, useRef, useMemo } from "react";
import { ProcessDefinition, SubprocessDefinition, BpmnGateway } from "../types";
import { getStartEvents, getSubprocessesForStartEvent } from "./FrameworkDocViewer";
import {
  Play, Pause, RotateCcw, FastForward, Activity, AlertTriangle, Flame,
  Clock, CheckCircle2, Sliders, BarChart3, HelpCircle, Layers, ArrowRight, ArrowDown,
  TrendingDown, Cpu, ChevronRight, Zap, Target, Gauge, ArrowDownRight,
  Sparkles, ShieldCheck, RefreshCw, XCircle, ArrowUpRight, Package, Box,
  FileSpreadsheet, ZoomIn, ZoomOut, Maximize2, Grid
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell, PieChart, Pie
} from "recharts";

interface FlowSimulationEngineProps {
  process: ProcessDefinition;
  simulatedVolume: number;
  simMode: "deterministic" | "stochastic";
  distributionType: string;
  meanTimeHours: number;
  varianceValue: number;
  resourceLimit: number;
  customErrorRate: number;
  targetSlaHours: number;
}

interface SimulatedNodeStats {
  id: string;
  index: string;
  name: string;
  role: string;
  type: "START" | "SUBPROCESS" | "GATEWAY" | "END" | "EXCEPTION_END";
  casesProcessed: number;
  casesInQueue: number; // Inventario / Casos que no logran salir del subproceso
  touchTimeHours: number; // Valor Agregado (VA)
  waitTimeHours: number;  // Sin Valor Agregado (NVA)
  transferTimeHours: number;
  totalLeadTimeHours: number;
  utilizationPct: number;
  isBottleneck: boolean;
  isSecondaryBottleneck: boolean;
  saturationLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

interface ActiveToken {
  id: string;
  caseNumber: number;
  currentNodeIndex: number;
  progress: number; // 0 to 1 along connector
  status: "ACTIVE" | "COMPLETED" | "REJECTED";
  isException: boolean;
}

export default function FlowSimulationEngine({
  process,
  simulatedVolume,
  simMode,
  distributionType,
  meanTimeHours,
  varianceValue,
  resourceLimit,
  customErrorRate,
  targetSlaHours,
}: FlowSimulationEngineProps) {
  // Navigation & Control States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 5x, 10x
  const [displayMode, setDisplayMode] = useState<"normal" | "heatmap" | "queue" | "time_breakdown">("normal");
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"flow" | "bottleneck" | "time_breakdown" | "pce">("flow");

  // Simulation execution state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [tokens, setTokens] = useState<ActiveToken[]>([]);
  const [completedCases, setCompletedCases] = useState<number>(0);
  const [rejectedCases, setRejectedCases] = useState<number>(0);
  const [inFlowCases, setInFlowCases] = useState<number>(0);
  const [nodeStats, setNodeStats] = useState<Record<string, SimulatedNodeStats>>({});

  // Dynamic live case counters per node (Casos procesados y Casos en Inventario/Cola)
  const [nodeLiveProcessed, setNodeLiveProcessed] = useState<Record<string, number>>({});
  const [nodeLiveQueue, setNodeLiveQueue] = useState<Record<string, number>>({});

  // Canvas View & Zoom Controls (100% idéntico a Modelo Descriptivo)
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [canvasHeight, setCanvasHeight] = useState<number>(550);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const diagramContentRef = useRef<HTMLDivElement>(null);

  const handleAutoFitDiagram = () => {
    if (!canvasContainerRef.current || !diagramContentRef.current) return;
    const containerWidth = canvasContainerRef.current.clientWidth - 48;
    const contentWidth = diagramContentRef.current.scrollWidth;
    if (contentWidth > 0) {
      const scale = Math.min(1.2, Math.max(0.3, Math.round((containerWidth / contentWidth) * 100) / 100));
      setZoomScale(scale);
    }
  };

  const startEvents = useMemo(() => getStartEvents(process), [process]);

  // Extract workflow elements (Lanes, Subprocesses, Gateways)
  const lanes = useMemo(() => {
    const roleSet = new Set<string>();
    if (process.responsibleRole) roleSet.add(process.responsibleRole);
    (process.subprocesses || []).forEach((s) => {
      if (s.responsibleRole) roleSet.add(s.responsibleRole);
      (s.activities || []).forEach((a) => {
        if (a.responsibleRole) roleSet.add(a.responsibleRole);
      });
    });
    (process.stateMachine?.custodyTransfers || []).forEach((c) => {
      if (c.fromRole) roleSet.add(c.fromRole);
      if (c.toRole) roleSet.add(c.toRole);
    });

    const uniqueRoles = Array.from(roleSet).filter(Boolean);
    if (uniqueRoles.length === 0) {
      return ["Operador del Proceso", "Supervisor / Validador", "Unidad Destinataria"];
    }
    return uniqueRoles;
  }, [process]);

  // Build sequential flow model nodes (Identical to Canvas Interactivo structure)
  const flowNodes = useMemo(() => {
    const nodes: {
      id: string;
      index: string;
      name: string;
      role: string;
      type: "START" | "SUBPROCESS" | "GATEWAY" | "END" | "EXCEPTION_END";
      sub?: SubprocessDefinition;
      gw?: BpmnGateway;
    }[] = [];

    // 1. Start Event(s) & Gateways connected directly to Start
    const allStartEvents = getStartEvents(process);
    allStartEvents.forEach((stEvent, stIdx) => {
      nodes.push({
        id: `node_start_${stEvent.id || stIdx}`,
        index: `START_${stIdx}`,
        name: stEvent.name || "Evento de Inicio",
        role: lanes[0] || "Solicitante",
        type: "START"
      });

      const gwAfterStart = process.stateMachine?.gateways?.filter(
        (g) => g.afterState === stEvent.id || g.afterState === stEvent.name
      );
      gwAfterStart?.forEach((gw) => {
        nodes.push({
          id: `node_gw_${gw.id}`,
          index: `GW-${gw.id}`,
          name: gw.name,
          role: gw.role || lanes[0],
          type: "GATEWAY",
          gw
        });
      });
    });

    // 2. Subprocesses & Gateways exactly matching process definition
    (process.subprocesses || []).forEach((sub, sIdx) => {
      const subRole = sub.responsibleRole || sub.activities?.[0]?.responsibleRole || lanes[sIdx % lanes.length];
      nodes.push({
        id: `node_sub_${sub.index}`,
        index: sub.index,
        name: sub.name,
        role: subRole,
        type: "SUBPROCESS",
        sub
      });

      // Check if there is a gateway after this subprocess
      const matchingGw = process.stateMachine?.gateways?.find(
        (g) => g.afterState === sub.name || g.afterState === sub.index
      );
      if (matchingGw) {
        nodes.push({
          id: `node_gw_${matchingGw.id}`,
          index: `GW-${matchingGw.id}`,
          name: matchingGw.name,
          role: matchingGw.role || subRole,
          type: "GATEWAY",
          gw: matchingGw
        });
      }
    });

    // If no gateways exist in model, add a default decision gateway after the review step for realistic simulation
    if (!nodes.some(n => n.type === "GATEWAY") && nodes.length > 2) {
      const midPoint = Math.min(2, nodes.length - 1);
      nodes.splice(midPoint + 1, 0, {
        id: "node_gw_eval",
        index: "GW-EVAL",
        name: "¿Requisitos y Validación Conformes?",
        role: lanes[1] || lanes[0],
        type: "GATEWAY",
        gw: {
          id: "gw_eval_default",
          name: "¿Requisitos y Validación Conformes?",
          type: "EXCLUSIVE_XOR",
          afterState: nodes[midPoint].name,
          conditionTrueTarget: "Aprobado",
          conditionFalseTarget: "Rechazo / Cuarentena",
          role: lanes[1] || lanes[0]
        }
      });
    }

    // 3. End Event
    nodes.push({
      id: "node_end",
      index: "END",
      name: process.scopeEnd || "Resultado Final / Proceso Concluido",
      role: lanes[lanes.length - 1] || lanes[0],
      type: "END"
    });

    return nodes;
  }, [process, lanes]);

  // Calculate static / analytical metrics for nodes based on process parameters
  const calculateStaticMetrics = useMemo(() => {
    const subCount = Math.max(1, process.subprocesses?.length || 3);
    const baseTouchPerSub = (meanTimeHours * 0.45) / subCount;
    const baseWaitPerSub = (meanTimeHours * 0.55) / subCount;

    const stats: Record<string, SimulatedNodeStats> = {};
    let highestUtil = 0;
    let bottleneckId = "";
    let secondHighestUtil = 0;
    let secondBottleneckId = "";

    flowNodes.forEach((node, idx) => {
      if (node.type === "START") {
        stats[node.id] = {
          id: node.id,
          index: node.index,
          name: node.name,
          role: node.role,
          type: "START",
          casesProcessed: simulatedVolume,
          casesInQueue: 0,
          touchTimeHours: 0.05,
          waitTimeHours: 0.05,
          transferTimeHours: 0,
          totalLeadTimeHours: 0.1,
          utilizationPct: 20,
          isBottleneck: false,
          isSecondaryBottleneck: false,
          saturationLevel: "LOW"
        };
        return;
      }

      if (node.type === "END") {
        const completedCount = Math.round(simulatedVolume * (1 - customErrorRate / 100));
        stats[node.id] = {
          id: node.id,
          index: node.index,
          name: node.name,
          role: node.role,
          type: "END",
          casesProcessed: completedCount,
          casesInQueue: 0,
          touchTimeHours: 0.05,
          waitTimeHours: 0,
          transferTimeHours: 0,
          totalLeadTimeHours: 0.05,
          utilizationPct: 15,
          isBottleneck: false,
          isSecondaryBottleneck: false,
          saturationLevel: "LOW"
        };
        return;
      }

      if (node.type === "GATEWAY") {
        const inCases = Math.round(simulatedVolume * (1 - (idx * 0.02)));
        stats[node.id] = {
          id: node.id,
          index: node.index,
          name: node.name,
          role: node.role,
          type: "GATEWAY",
          casesProcessed: inCases,
          casesInQueue: Math.round(inCases * 0.03),
          touchTimeHours: 0.15,
          waitTimeHours: 0.25,
          transferTimeHours: 0.1,
          totalLeadTimeHours: 0.5,
          utilizationPct: 45,
          isBottleneck: false,
          isSecondaryBottleneck: false,
          saturationLevel: "LOW"
        };
        return;
      }

      // Subprocess calculation with stochastic variance
      const isApprovalOrReview = node.name.toLowerCase().includes("control") ||
        node.name.toLowerCase().includes("aprob") ||
        node.name.toLowerCase().includes("inspecc") ||
        node.name.toLowerCase().includes("calidad") ||
        idx === 2;

      // Factors that increase time and queue for specific tasks
      const weightFactor = isApprovalOrReview ? 1.85 : (idx === 1 ? 1.1 : 0.85);
      const stochasticVariance = simMode === "stochastic" ? (1 + (Math.sin(idx * 2) * varianceValue * 0.25)) : 1;

      const touchTime = Number((baseTouchPerSub * weightFactor * stochasticVariance).toFixed(2));
      
      // Queuing Theory model: Wait time depends heavily on capacity and resource limits
      const effectiveCapacity = Math.max(1, Math.floor(resourceLimit / (flowNodes.length - 2)));
      const arrivalRate = simulatedVolume / (targetSlaHours || 8); // cases/hour
      const serviceRate = effectiveCapacity / touchTime; // capacity/hour
      const rawUtilization = Math.min(0.98, Math.max(0.25, (arrivalRate / serviceRate) * (isApprovalOrReview ? 1.4 : 0.9)));
      const utilPct = Number((rawUtilization * 100).toFixed(1));

      // Little's Law queue time estimation
      const queueTime = Number((touchTime * (rawUtilization / Math.max(0.04, 1 - rawUtilization)) * 0.45).toFixed(2));
      const transferTime = 0.15; // handoff time between roles
      const totalLead = Number((touchTime + queueTime + transferTime).toFixed(2));
      const queueCases = Math.round(arrivalRate * queueTime);

      if (utilPct > highestUtil) {
        secondHighestUtil = highestUtil;
        secondBottleneckId = bottleneckId;
        highestUtil = utilPct;
        bottleneckId = node.id;
      } else if (utilPct > secondHighestUtil) {
        secondHighestUtil = utilPct;
        secondBottleneckId = node.id;
      }

      const saturationLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
        utilPct >= 85 ? "CRITICAL" : utilPct >= 70 ? "HIGH" : utilPct >= 50 ? "MODERATE" : "LOW";

      stats[node.id] = {
        id: node.id,
        index: node.index,
        name: node.name,
        role: node.role,
        type: "SUBPROCESS",
        casesProcessed: Math.round(simulatedVolume * (1 - (idx * 0.03))),
        casesInQueue: queueCases,
        touchTimeHours: touchTime,
        waitTimeHours: queueTime,
        transferTimeHours: transferTime,
        totalLeadTimeHours: totalLead,
        utilizationPct: utilPct,
        isBottleneck: false,
        isSecondaryBottleneck: false,
        saturationLevel
      };
    });

    if (bottleneckId && stats[bottleneckId]) {
      stats[bottleneckId].isBottleneck = true;
    }
    if (secondBottleneckId && stats[secondBottleneckId] && secondBottleneckId !== bottleneckId) {
      stats[secondBottleneckId].isSecondaryBottleneck = true;
    }

    return stats;
  }, [flowNodes, simulatedVolume, simMode, meanTimeHours, varianceValue, resourceLimit, customErrorRate, targetSlaHours]);

  // Initialize node stats & live counters
  useEffect(() => {
    setNodeStats(calculateStaticMetrics);
    setCompletedCases(Math.round(simulatedVolume * (1 - customErrorRate / 100)));
    setRejectedCases(Math.round(simulatedVolume * (customErrorRate / 100)));
    setInFlowCases(0);

    const initialProcessed: Record<string, number> = {};
    const initialQueue: Record<string, number> = {};
    flowNodes.forEach((node, idx) => {
      if (node.type === "START") {
        initialProcessed[node.id] = simulatedVolume;
        initialQueue[node.id] = 0;
      } else if (node.type === "END") {
        initialProcessed[node.id] = Math.round(simulatedVolume * (1 - customErrorRate / 100));
        initialQueue[node.id] = 0;
      } else {
        const stats = calculateStaticMetrics[node.id];
        initialProcessed[node.id] = stats ? stats.casesProcessed : Math.round(simulatedVolume * (1 - (idx * 0.03)));
        initialQueue[node.id] = stats ? stats.casesInQueue : 0;
      }
    });
    setNodeLiveProcessed(initialProcessed);
    setNodeLiveQueue(initialQueue);
  }, [calculateStaticMetrics, simulatedVolume, customErrorRate, flowNodes]);

  // Overall Process Totals & PCE
  const processSummary = useMemo(() => {
    const allNodeStats = Object.values(nodeStats) as SimulatedNodeStats[];
    const nodes = allNodeStats.filter(n => n.type === "SUBPROCESS" || n.type === "GATEWAY");
    const totalTouchTime = Number(nodes.reduce((acc, n) => acc + n.touchTimeHours, 0).toFixed(2));
    const totalWaitTime = Number(nodes.reduce((acc, n) => acc + n.waitTimeHours, 0).toFixed(2));
    const totalTransferTime = Number(nodes.reduce((acc, n) => acc + n.transferTimeHours, 0).toFixed(2));
    const totalLeadTime = Number((totalTouchTime + totalWaitTime + totalTransferTime).toFixed(2));

    // Process Cycle Efficiency (PCE) = (Total Value-Added Time / Total Lead Time) * 100
    const pcePct = totalLeadTime > 0 ? Number(((totalTouchTime / totalLeadTime) * 100).toFixed(1)) : 0;

    // Lean Classification
    let leanMaturity = "Clase Mundial (> 25%)";
    let maturityColor = "text-emerald-700 bg-emerald-50 border-emerald-300";
    if (pcePct < 5) {
      leanMaturity = "Crítico / Alta Fricción (< 5%)";
      maturityColor = "text-rose-800 bg-rose-50 border-rose-300";
    } else if (pcePct < 15) {
      leanMaturity = "Estándar / Oportunidad de Reducción de Colas (5% - 15%)";
      maturityColor = "text-amber-800 bg-amber-50 border-amber-300";
    } else if (pcePct < 25) {
      leanMaturity = "Bueno / Flujo Optimizado (15% - 25%)";
      maturityColor = "text-blue-800 bg-blue-50 border-blue-300";
    }

    const bottleneckNode = allNodeStats.find(n => n.isBottleneck);

    return {
      totalTouchTime,
      totalWaitTime,
      totalTransferTime,
      totalLeadTime,
      pcePct,
      leanMaturity,
      maturityColor,
      bottleneckNode,
    };
  }, [nodeStats]);

  // Real-time animation loop for tokens & dynamic case count updates
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTokens((prevTokens) => {
        let updated = [...prevTokens];

        // 1. Advance existing tokens
        updated = updated
          .map((t) => {
            const nextProgress = t.progress + (0.12 * simSpeed);
            if (nextProgress >= 1) {
              const currentNode = flowNodes[t.currentNodeIndex];
              let nextNodeIdx = t.currentNodeIndex + 1;

              // If current node is a START event, skip any trailing START events
              if (currentNode && currentNode.type === "START") {
                while (nextNodeIdx < flowNodes.length && flowNodes[nextNodeIdx].type === "START") {
                  nextNodeIdx++;
                }
              }
              // If current node is a SUBPROCESS, check if there is a matching gateway directly after it
              else if (currentNode && currentNode.type === "SUBPROCESS") {
                const subIndex = currentNode.index || currentNode.id.replace("node_sub_", "");
                const subName = currentNode.name;
                
                // Check if a gateway in flowNodes comes after this subprocess
                const matchingGwIdx = flowNodes.findIndex(
                  (n, idx) => idx > t.currentNodeIndex && n.type === "GATEWAY" && n.gw && (n.gw.afterState === subName || n.gw.afterState === subIndex)
                );
                
                if (matchingGwIdx !== -1) {
                  nextNodeIdx = matchingGwIdx;
                } else {
                  // Next node in sequence; skip any START event nodes if present
                  while (nextNodeIdx < flowNodes.length && flowNodes[nextNodeIdx].type === "START") {
                    nextNodeIdx++;
                  }
                }
              }
              // Handle Gateway branching (Sí vs No routes)
              else if (currentNode && currentNode.type === "GATEWAY" && currentNode.gw) {
                const gw = currentNode.gw;
                if (t.isException) {
                  // Negative Branch (No / Excepción / Flecha que baja)
                  const targetName = gw.conditionFalseTarget;
                  if (targetName) {
                    const matchIdx = flowNodes.findIndex(
                      (n) => n.name === targetName || n.index === targetName || n.id === targetName || n.id === `node_sub_${targetName}`
                    );
                    if (matchIdx !== -1) {
                      nextNodeIdx = matchIdx;
                    } else {
                      // Custom target like "Rechazado" - complete as exception
                      setRejectedCases((c) => c + 1);
                      setInFlowCases((c) => Math.max(0, c - 1));
                      return null;
                    }
                  } else {
                    setRejectedCases((c) => c + 1);
                    setInFlowCases((c) => Math.max(0, c - 1));
                    return null;
                  }
                } else {
                  // Affirmative Branch (Sí / Conforme)
                  const targetName = gw.conditionTrueTarget;
                  if (targetName) {
                    const matchIdx = flowNodes.findIndex(
                      (n) => n.name === targetName || n.index === targetName || n.id === targetName || n.id === `node_sub_${targetName}`
                    );
                    if (matchIdx !== -1) {
                      nextNodeIdx = matchIdx;
                    } else {
                      while (nextNodeIdx < flowNodes.length && flowNodes[nextNodeIdx].type === "START") {
                        nextNodeIdx++;
                      }
                    }
                  } else {
                    while (nextNodeIdx < flowNodes.length && flowNodes[nextNodeIdx].type === "START") {
                      nextNodeIdx++;
                    }
                  }
                }
              }

              const passingNode = flowNodes[nextNodeIdx];

              if (passingNode) {
                // Increment dynamic cases processed for this node
                setNodeLiveProcessed((prev) => ({
                  ...prev,
                  [passingNode.id]: (prev[passingNode.id] || 0) + 1
                }));

                // If this is a bottleneck or congested node, accumulate inventory
                const isCongested = nodeStats[passingNode.id]?.isBottleneck || (passingNode.type === "SUBPROCESS" && Math.random() < 0.2);
                if (isCongested) {
                  setNodeLiveQueue((prev) => ({
                    ...prev,
                    [passingNode.id]: (prev[passingNode.id] || 0) + (Math.random() < 0.4 ? 1 : 0)
                  }));
                }
              }

              if (nextNodeIdx >= flowNodes.length || (passingNode && passingNode.type === "END")) {
                // Arrived at end or exception
                if (t.isException) {
                  setRejectedCases((c) => c + 1);
                } else {
                  setCompletedCases((c) => c + 1);
                }
                setInFlowCases((c) => Math.max(0, c - 1));
                return null;
              }
              return {
                ...t,
                currentNodeIndex: nextNodeIdx,
                progress: 0
              };
            }
            return {
              ...t,
              progress: nextProgress
            };
          })
          .filter(Boolean) as ActiveToken[];

        // 2. Spawn new tokens from Start
        if (Math.random() < 0.45 * simSpeed && updated.length < 24) {
          const isExc = Math.random() < (customErrorRate / 100);
          const startNodeIndices = flowNodes
            .map((n, idx) => (n.type === "START" ? idx : -1))
            .filter((idx) => idx !== -1);
          
          const spawnIdx = startNodeIndices.length > 0
            ? startNodeIndices[Math.floor(Math.random() * startNodeIndices.length)]
            : 0;

          const newToken: ActiveToken = {
            id: `tok_${Date.now()}_${Math.random()}`,
            caseNumber: Math.floor(1000 + Math.random() * 9000),
            currentNodeIndex: spawnIdx,
            progress: 0,
            status: "ACTIVE",
            isException: isExc
          };
          updated.push(newToken);
          setInFlowCases((c) => c + 1);
        }

        return updated;
      });

      setCurrentStep((s) => s + 1);
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, flowNodes, customErrorRate, nodeStats]);

  // Reset simulation
  const handleReset = () => {
    setIsPlaying(false);
    setTokens([]);
    setCompletedCases(Math.round(simulatedVolume * (1 - customErrorRate / 100)));
    setRejectedCases(Math.round(simulatedVolume * (customErrorRate / 100)));
    setInFlowCases(0);
    setCurrentStep(0);

    const initialProcessed: Record<string, number> = {};
    const initialQueue: Record<string, number> = {};
    flowNodes.forEach((node, idx) => {
      if (node.type === "START") {
        initialProcessed[node.id] = simulatedVolume;
        initialQueue[node.id] = 0;
      } else if (node.type === "END") {
        initialProcessed[node.id] = Math.round(simulatedVolume * (1 - customErrorRate / 100));
        initialQueue[node.id] = 0;
      } else {
        const stats = calculateStaticMetrics[node.id];
        initialProcessed[node.id] = stats ? stats.casesProcessed : Math.round(simulatedVolume * (1 - (idx * 0.03)));
        initialQueue[node.id] = stats ? stats.casesInQueue : 0;
      }
    });
    setNodeLiveProcessed(initialProcessed);
    setNodeLiveQueue(initialQueue);
  };

  // Instant Fast Forward
  const handleFastForward = () => {
    setIsPlaying(false);
    setTokens([]);
    setCompletedCases(Math.round(simulatedVolume * (1 - customErrorRate / 100)));
    setRejectedCases(Math.round(simulatedVolume * (customErrorRate / 100)));
    setInFlowCases(0);
    setCurrentStep(100);
  };

  // Advance simulation by specific time horizons (x1 hora, 24 horas, Mensual, Semestral, Anual)
  const handleAdvanceTime = (hours: number, label: string) => {
    const hourlyThroughput = Math.max(1, simulatedVolume / (targetSlaHours || 8));
    const processedIncrement = Math.round(hourlyThroughput * hours);
    const excIncrement = Math.round(processedIncrement * (customErrorRate / 100));

    setCompletedCases((c) => c + processedIncrement - excIncrement);
    setRejectedCases((r) => r + excIncrement);
    setInFlowCases((f) => Math.min(24, Math.max(2, Math.round(hourlyThroughput * 0.4))));

    // Update node dynamic counts
    setNodeLiveProcessed((prev) => {
      const updated = { ...prev };
      flowNodes.forEach((n, idx) => {
        const factor = 1 - (idx * 0.02);
        updated[n.id] = (updated[n.id] || 0) + Math.round(processedIncrement * factor);
      });
      return updated;
    });

    setNodeLiveQueue((prev) => {
      const updated = { ...prev };
      flowNodes.forEach((n) => {
        if (n.type === "SUBPROCESS") {
          const isBottleneck = nodeStats[n.id]?.isBottleneck;
          const delta = isBottleneck ? Math.round(processedIncrement * 0.08) : Math.round(processedIncrement * 0.02);
          updated[n.id] = (updated[n.id] || 0) + delta;
        }
      });
      return updated;
    });

    // Trigger visual bursts of tokens
    const burstCount = Math.min(12, Math.max(3, Math.round(hours > 24 ? 8 : 4)));
    const newBurstTokens: ActiveToken[] = Array.from({ length: burstCount }, (_, i) => ({
      id: `tok_burst_${Date.now()}_${i}`,
      caseNumber: Math.floor(1000 + Math.random() * 9000),
      currentNodeIndex: (i % (flowNodes.length - 1)),
      progress: (i * 0.2) % 1,
      status: "ACTIVE",
      isException: Math.random() < (customErrorRate / 100)
    }));
    setTokens(newBurstTokens);
    setCurrentStep((s) => s + Math.max(1, Math.round(hours)));
  };

  // Chart data for Time Breakdown per activity
  const timeBreakdownChartData = useMemo(() => {
    const allNodeStats = Object.values(nodeStats) as SimulatedNodeStats[];
    return allNodeStats
      .filter((n) => n.type === "SUBPROCESS" || n.type === "GATEWAY")
      .map((n) => ({
        name: n.index,
        fullName: n.name,
        touchTime: n.touchTimeHours,
        waitTime: n.waitTimeHours,
        transferTime: n.transferTimeHours,
        totalLead: n.totalLeadTimeHours,
        utilization: n.utilizationPct,
        isBottleneck: n.isBottleneck
      }));
  }, [nodeStats]);

  // Lean Value Stream Pie data
  const leanPieData = [
    { name: "Valor Agregado (Touch Time)", value: processSummary.totalTouchTime, color: "#10b981" },
    { name: "Espera en Cola (Desperdicio NVA)", value: processSummary.totalWaitTime, color: "#f43f5e" },
    { name: "Traspaso de Custodia (Handoff NVA)", value: processSummary.totalTransferTime, color: "#f59e0b" },
  ];

  // Reusable simulation toolbar component
  const simulationToolbar = (
    <div className="bg-slate-900 text-white border border-slate-800 p-4 shadow-md rounded-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Controls: Start / Pause / Reset / Speed */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 border border-slate-700 p-1 rounded-xs">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlaying
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title={isPlaying ? "Pausar Animación" : "Iniciar Navegación de Casos en Vivo"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Pausar" : "Start"}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Detener y Reiniciar Casos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stop</span>
            </button>

            <button
              type="button"
              onClick={handleFastForward}
              className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Completar Simulación al Instante"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fast</span>
            </button>
          </div>

          {/* Time Advance Controls (x1 hora, 24 horas, Mensual, Semestral, Anual) */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-xs text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Avanzar:
            </span>
            {[
              { label: "x1 (1h)", hours: 1, title: "Avanzar 1 Hora" },
              { label: "24h (Día)", hours: 24, title: "Avanzar 24 Horas / 1 Día" },
              { label: "Mensual", hours: 720, title: "Avanzar 1 Mes (30 días)" },
              { label: "Semestral", hours: 4320, title: "Avanzar 1 Semestre (6 meses)" },
              { label: "Anual", hours: 8760, title: "Avanzar 1 Año (365 días)" }
            ].map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => handleAdvanceTime(step.hours, step.label)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-200 font-bold text-[11px] rounded-xs transition-colors cursor-pointer border border-slate-700 hover:border-amber-500"
                title={step.title}
              >
                {step.label}
              </button>
            ))}
          </div>

          {/* Simulation Speed Control */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-xs text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Velocidad:</span>
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                className={`px-1.5 py-0.5 font-mono text-xs font-bold rounded-xs cursor-pointer ${
                  simSpeed === spd
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Display Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-xs text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Modo Vista:</span>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-white font-bold text-xs py-0.5 px-2 rounded-xs focus:outline-none cursor-pointer"
            >
              <option value="normal">Normal (Casos en Tránsito)</option>
              <option value="heatmap">Mapa de Calor (Saturación %)</option>
              <option value="queue">Inventario en Cola (Queue Size)</option>
              <option value="time_breakdown">Desglose VA vs NVA</option>
            </select>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-slate-950 border border-slate-700 px-3 py-1 flex items-center gap-2">
            <span className="text-slate-400">Total Demanda:</span>
            <strong className="text-white font-bold">{simulatedVolume} Casos</strong>
          </div>

          <div className="bg-slate-950 border border-rose-900/60 px-3 py-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <span className="text-rose-300">En Flujo:</span>
            <strong className="text-rose-400 font-bold">{inFlowCases} Casos</strong>
          </div>

          <div className="bg-slate-950 border border-emerald-900/60 px-3 py-1 flex items-center gap-2">
            <span className="text-emerald-400">Completados:</span>
            <strong className="text-emerald-300 font-bold">{completedCases}</strong>
          </div>

          {rejectedCases > 0 && (
            <div className="bg-slate-950 border border-rose-900/60 px-3 py-1 flex items-center gap-2">
              <span className="text-rose-400">Excepciones:</span>
              <strong className="text-rose-300 font-bold">{rejectedCases}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ANALYTICAL SUB-TABS (Flujo BPMN, Cuello de Botella, Desglose Tiempos, PCE)
         ========================================================================= */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveAnalysisTab("flow")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
            activeAnalysisTab === "flow"
              ? "border-slate-950 text-slate-950 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>1. Navegación en Vivo & Flujo BPMN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab("bottleneck")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
            activeAnalysisTab === "bottleneck"
              ? "border-slate-950 text-slate-950 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Flame className="w-4 h-4 text-rose-600" />
          <span>2. Identificación de Cuello de Botella</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab("time_breakdown")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
            activeAnalysisTab === "time_breakdown"
              ? "border-slate-950 text-slate-950 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>3. Desglose de Tiempos (VA vs NVA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab("pce")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
            activeAnalysisTab === "pce"
              ? "border-slate-950 text-slate-950 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Gauge className="w-4 h-4 text-emerald-600" />
          <span>4. Eficiencia del Ciclo (PCE Lean)</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LIVE BPMN CANVAS WITH ANIMATED TOKENS
         ========================================================================= */}
      {activeAnalysisTab === "flow" && (
        <div className="bg-white border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-800" />
                Modelado de Comportamiento Dinámico sobre el Flujo Descriptivo
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Visualice el paso de casos en tiempo real a través del diagrama descriptivo del proceso, compuertas de decisión, subprocesos y eventos con métricas dinámicas de simulación.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
                <span>Inicio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block"></span>
                <span>Subproceso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-400 rotate-45 inline-block"></span>
                <span>Compuerta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-rose-600 rounded-full inline-block"></span>
                <span>Término</span>
              </div>
            </div>
          </div>

          {/* BARRA DE CONTROLES DE CANVAS (ZOOM, GRID Y AJUSTE DE PANTALLA 100% IDÉNTICO A MODELO DESCRIPTIVO) */}
          <div className="border border-slate-300 bg-slate-50 p-3 space-y-3 shadow-xs rounded-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-900 font-extrabold text-sm">
                  Canvas Interactivo (Simulación en Vivo)
                </span>
              </div>

              {/* Controles de Malla / Grid y Zoom */}
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

                {/* Control de Zoom Scale y Fit */}
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

            {/* SIMULATION TOOLBAR POSITIONED EXACTLY ABOVE THE FLOW CANVAS */}
            {simulationToolbar}

            {/* CONTENEDOR PRINCIPAL DEL DIAGRAMA CON POOL BIZAGI Y LIENZO CONFIGURABLE */}
            <div className="border-2 border-slate-800 bg-white relative flex shadow-md overflow-hidden rounded-xs mt-3">
              {/* Pool / Carril Lateral Estilo Bizagi Modeler */}
              <div className="w-10 bg-slate-100 border-r-2 border-slate-800 flex items-center justify-center p-1 text-center font-black text-[11px] text-slate-800 tracking-wider uppercase select-none [writing-mode:vertical-lr] rotate-180 shrink-0">
                Modelo Descriptivo: {process.name || "TRASLADO DE PACIENTES"}
              </div>

              {/* Area de Lienzo / Canvas con Altura Configurable y Zoom */}
              <div
                ref={canvasContainerRef}
                style={{ height: `${canvasHeight}px`, minHeight: `${canvasHeight}px` }}
                className={`flex-1 overflow-x-auto overflow-y-auto p-6 transition-all relative flex items-center justify-center select-none ${
                  showGrid ? "bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]" : "bg-white"
                }`}
              >
                <div
                  ref={diagramContentRef}
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "center center"
                  }}
                  className="relative flex flex-col items-center justify-center gap-8 min-w-max py-4 px-4 divide-y divide-dashed divide-slate-200 transition-transform duration-200"
                >
                  {startEvents.map((stEvent, stIdx) => {
                    const flowSubs = getSubprocessesForStartEvent(process, stEvent, stIdx, startEvents);

                    return (
                      <div key={stEvent.id || stIdx} className="flex items-center gap-8 pt-4 first:pt-0 relative">
                        {/* Tag de Flujo si hay múltiples eventos de inicio */}
                        {startEvents.length > 1 && (
                          <div className="absolute -top-2.5 left-0 bg-slate-800 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-b-xs shadow-2xs z-10">
                            FLUJO DE PROCESO #{stIdx + 1}
                          </div>
                        )}

                        {/* 1. EVENTO DE INICIO (Círculo Verde BPMN 2.0 con Badge de Demanda) */}
                        <div className="flex flex-col items-center group relative mt-2">
                          <div className="absolute -top-3 -right-2 bg-slate-950 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-20 border border-slate-700">
                            {simulatedVolume}
                          </div>
                          <div className="w-13 h-13 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-md relative transition-transform hover:scale-105">
                            <span className="w-4 h-4 bg-emerald-600 rounded-full"></span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-800 mt-2 text-center max-w-[120px] uppercase leading-tight">
                            {stEvent.name || "EVENTO DE INICIO"}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5 text-center max-w-[130px]">
                            {stEvent.trigger || process.scopeStart || "Gatillo de Inicio"}
                          </span>
                        </div>

                        {/* Conector Flecha desde Evento de Inicio con Animación de Tokens */}
                        {(() => {
                          const startNodeId = `node_start_${stEvent.id || stIdx}`;
                          const startNodeIdx = flowNodes.findIndex(n => n.id === startNodeId);
                          const tokensAtStart = tokens.filter(t => t.currentNodeIndex === (startNodeIdx !== -1 ? startNodeIdx : 0));

                          return (
                            <div className="flex items-center text-slate-400 font-bold text-xs relative w-12 justify-center">
                              <div className="w-full h-0.5 bg-slate-300"></div>
                              <ArrowRight className="w-4 h-4 -ml-2 text-slate-400 absolute right-0" />

                              {/* Moving Cases animation overlay */}
                              {tokensAtStart.map((tok) => (
                                <div
                                  key={tok.id}
                                  className="absolute w-4 h-4 rounded-full shadow-lg bg-rose-600 border-2 border-white flex items-center justify-center text-[7px] font-black text-white ring-2 ring-rose-400/60 z-30 transition-all cursor-pointer hover:scale-125"
                                  style={{
                                    left: `${tok.progress * 100}%`,
                                    top: "-8px",
                                    transition: "left 0.12s linear"
                                  }}
                                  title={`Caso #${tok.caseNumber} en Tránsito desde Inicio`}
                                >
                                  •
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* COMPUERTAS CONECTADAS DIRECTAMENTE AL EVENTO DE INICIO */}
                        {process.stateMachine?.gateways
                          ?.filter((g) => g.afterState === stEvent.id || g.afterState === stEvent.name)
                          .map((gw) => {
                            const gwNodeId = `node_gw_${gw.id}`;
                            const gwNodeIdx = flowNodes.findIndex(n => n.id === gwNodeId);
                            const tokensAtGw = tokens.filter(t => t.currentNodeIndex === gwNodeIdx);
                            const gwLiveCount = nodeLiveProcessed[gwNodeId] ?? nodeStats[gwNodeId]?.casesProcessed ?? Math.round(simulatedVolume * 0.96);

                            return (
                              <React.Fragment key={gw.id}>
                                <div className="flex flex-col items-center group relative mx-2">
                                  <div className="absolute -top-3.5 right-0 bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-xs shadow-md z-20">
                                    {gwLiveCount} Casos
                                  </div>

                                  <div className="text-[10px] font-bold text-amber-950 text-center max-w-[120px] mb-1 leading-tight flex items-center gap-1 justify-center" title={gw.name}>
                                    <span>{gw.name}</span>
                                    {gw.type === "COMPLEX_JOIN" && (
                                      <span className="bg-amber-200 text-amber-950 font-bold text-[8px] px-1 py-0.2 rounded border border-amber-300 shrink-0">
                                        JOINT
                                      </span>
                                    )}
                                  </div>

                                  <div className="w-13 h-13 bg-amber-50 border-2 border-amber-600 rotate-45 flex items-center justify-center shadow-sm relative group hover:bg-amber-100 transition-colors">
                                    <div className="-rotate-45 flex items-center justify-center text-amber-950 font-black select-none text-xs">
                                      {gw.type === "PARALLEL_AND" ? "+" : gw.type === "INCLUSIVE_OR" ? "O" : gw.type === "COMPLEX_JOIN" ? "⤺" : "X"}
                                    </div>
                                  </div>

                                  <div className="mt-2 text-center space-y-0.5">
                                    {gw.type === "COMPLEX_JOIN" ? (
                                      <div className="text-[9px] font-bold text-amber-950 flex items-center justify-center gap-1 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                                        <span>Unión ➔</span>
                                        <span className="underline">{gw.conditionTrueTarget || "Siguiente Estado"}</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                                          <span>Sí {100 - customErrorRate}% ➔</span>
                                          <span className="underline">{gw.conditionTrueTarget || "Siguiente Estado"}</span>
                                        </div>
                                        {gw.conditionFalseTarget && (
                                          <div className="text-[9px] font-bold text-rose-700 flex items-center justify-center gap-1">
                                            <span>No {customErrorRate}% ➔</span>
                                            <span className="underline">{gw.conditionFalseTarget}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Conector Flecha desde Compuerta con Animación de Tokens en Ramas Sí / No */}
                                <div className="flex flex-col gap-1.5 items-center justify-center mx-1 relative shrink-0 min-w-[85px]">
                                  {/* Rama Afirmativa (Sí) */}
                                  <div className="flex items-center text-emerald-800 font-bold text-[9px] relative w-20 justify-between bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs" title={`Rama Afirmativa (Sí) ➔ ${gw.conditionTrueTarget || "Siguiente Estado"}`}>
                                    <span className="text-[8px] font-black uppercase text-emerald-900 shrink-0">Sí</span>
                                    <div className="w-full h-0.5 bg-emerald-500 mx-1 relative flex items-center">
                                      <ArrowRight className="w-3 h-3 text-emerald-700 absolute -right-1" />
                                      {tokensAtGw.filter(t => !t.isException).map((tok) => (
                                        <div
                                          key={tok.id}
                                          className="absolute w-3.5 h-3.5 rounded-full shadow-md bg-emerald-600 border-2 border-white flex items-center justify-center text-[6px] font-black text-white ring-2 ring-emerald-400/80 z-30 transition-all cursor-pointer hover:scale-125"
                                          style={{
                                            left: `${tok.progress * 100}%`,
                                            top: "-5px",
                                            transition: "left 0.12s linear"
                                          }}
                                          title={`Caso #${tok.caseNumber} (Conforme) en Rama Sí`}
                                        >
                                          ✓
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Rama Negativa (No) */}
                                  {gw.type !== "COMPLEX_JOIN" && (
                                    <div className="flex items-center text-rose-800 font-bold text-[9px] relative w-20 justify-between bg-rose-50/90 px-1.5 py-0.5 rounded border border-rose-300 shadow-2xs" title={`Rama Negativa (No) ➔ ${gw.conditionFalseTarget || "Rechazado / Excepción"}`}>
                                      <span className="text-[8px] font-black uppercase text-rose-900 shrink-0">No</span>
                                      <div className="w-full h-0.5 bg-rose-500 mx-1 relative flex items-center">
                                        <ArrowRight className="w-3 h-3 text-rose-700 absolute -right-1" />
                                        {tokensAtGw.filter(t => t.isException).map((tok) => (
                                          <div
                                            key={tok.id}
                                            className="absolute w-3.5 h-3.5 rounded-full shadow-md bg-rose-600 border-2 border-white flex items-center justify-center text-[6px] font-black text-white ring-2 ring-rose-400/80 z-30 transition-all cursor-pointer hover:scale-125"
                                            style={{
                                              left: `${tok.progress * 100}%`,
                                              top: "-5px",
                                              transition: "left 0.12s linear"
                                            }}
                                            title={`Caso #${tok.caseNumber} (Excepción) en Rama No`}
                                          >
                                            ✕
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}

                        {/* SUBPROCESOS Y COMPUERTAS DEL FLUJO */}
                        {flowSubs.map((sub, sInFlowIdx) => {
                          const subNodeId = `node_sub_${sub.index}`;
                          const subNodeIdx = flowNodes.findIndex(n => n.id === subNodeId);
                          const stats = nodeStats[subNodeId];
                          const sGlobalIdx = process.subprocesses.findIndex((s) => s.index === sub.index);
                          const liveCount = nodeLiveProcessed[subNodeId] ?? stats?.casesProcessed ?? Math.round(simulatedVolume * (1 - (sGlobalIdx * 0.03)));
                          const liveQueueCount = nodeLiveQueue[subNodeId] ?? stats?.casesInQueue ?? 0;
                          const activeTokensAtNode = tokens.filter(t => t.currentNodeIndex === (subNodeIdx !== -1 ? subNodeIdx : sGlobalIdx + 1));

                          const matchingGateways = process.stateMachine?.gateways?.filter(
                            (g) => g.afterState === sub.name || g.afterState === sub.index
                          ) || [];

                          // Visual heatmap / bottleneck border classes
                          let nodeBorderClass = "border-blue-700";
                          let nodeBgClass = "bg-white";

                          if (displayMode === "heatmap" && stats) {
                            if (stats.utilizationPct >= 85) {
                              nodeBorderClass = "border-rose-600 bg-rose-50 ring-2 ring-rose-300";
                            } else if (stats.utilizationPct >= 70) {
                              nodeBorderClass = "border-amber-500 bg-amber-50";
                            } else if (stats.utilizationPct >= 50) {
                              nodeBorderClass = "border-blue-400 bg-blue-50";
                            } else {
                              nodeBorderClass = "border-emerald-500 bg-emerald-50";
                            }
                          } else if (stats?.isBottleneck) {
                            nodeBorderClass = "border-rose-600 ring-2 ring-rose-400 animate-pulse";
                          }

                          return (
                            <React.Fragment key={sub.index}>
                              {/* 2. SUBPROCESS CARD (Diseño 100% idéntico a Modelo Descriptivo + Métricas Dinámicas) */}
                              <div className="flex flex-col items-center group relative">
                                <div className={`px-4 pt-3 pb-4 bg-white border-2 rounded-lg shadow-md transition-all min-w-[210px] max-w-[240px] relative ${nodeBorderClass} ${nodeBgClass}`}>
                                  {/* Header Card: Subprocess Tag, Bottleneck Badge & Live Cases Count */}
                                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5 border-b border-slate-100 pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="bg-blue-900 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded-xs">
                                        Subp {sub.index}
                                      </span>
                                      {stats?.isBottleneck && (
                                        <span className="bg-rose-600 text-white font-sans text-[8px] font-black uppercase px-1 py-0.5 rounded-xs flex items-center gap-0.5">
                                          <Flame className="w-2.5 h-2.5 fill-white" /> Cuello
                                        </span>
                                      )}
                                    </div>

                                    {/* Dynamic Live Processed Cases Count Badge */}
                                    <div className="flex items-center gap-1">
                                      <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-xs shadow-xs" title="Casos Procesados en este Subproceso">
                                        {liveCount} Casos
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subprocess Name */}
                                  <div className="text-xs font-bold text-slate-900 leading-snug py-1 text-center min-h-[34px] flex items-center justify-center">
                                    {sub.name}
                                  </div>

                                  {/* Metrics & Inventory (Casos en Cola / que no logran salir) */}
                                  <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1.5">
                                    {/* Inventory / Queue Badge */}
                                    <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 px-2 py-1 rounded-xs text-[10px] font-mono">
                                      <span className="text-amber-900 font-bold flex items-center gap-1">
                                        <Package className="w-3 h-3 text-amber-700" /> Inventario (Cola):
                                      </span>
                                      <strong className="text-amber-800 font-black">
                                        {liveQueueCount} {liveQueueCount === 1 ? "caso" : "casos"}
                                      </strong>
                                    </div>

                                    {/* Simulation Execution Times */}
                                    <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono">
                                      {displayMode === "time_breakdown" ? (
                                        <>
                                          <span className="text-emerald-700 font-bold" title="Touch Time (Valor Agregado)">
                                            VA: {stats?.touchTimeHours || 1.2}h
                                          </span>
                                          <span className="text-rose-600 font-bold" title="Wait Time (Espera)">
                                            NVA: {stats?.waitTimeHours || 0.5}h
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <span>Ciclo: <strong className="text-slate-900">{stats?.totalLeadTimeHours || 1.8}h</strong></span>
                                          <span>Ocup: <strong className={stats && stats.utilizationPct > 80 ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>{stats?.utilizationPct || 45}%</strong></span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Símbolo BPMN 2.0 Subproceso Colapsado [+] */}
                                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-800 w-4 h-4 rounded-xs flex items-center justify-center shadow-xs text-slate-900 font-extrabold text-[10px]" title="Símbolo BPMN 2.0 de Subproceso">
                                    +
                                  </div>
                                </div>
                              </div>

                              {/* Conector Flecha entre Subprocesos con Animación de Tokens */}
                              <div className="flex items-center text-slate-400 font-bold text-xs relative w-12 justify-center">
                                <div className="w-full h-0.5 bg-slate-300"></div>
                                <ArrowRight className="w-4 h-4 -ml-2 text-slate-400 absolute right-0" />

                                {/* Moving Cases animation overlay */}
                                {activeTokensAtNode.map((tok) => (
                                  <div
                                    key={tok.id}
                                    className="absolute w-4 h-4 rounded-full shadow-lg bg-rose-600 border-2 border-white flex items-center justify-center text-[7px] font-black text-white ring-2 ring-rose-400/60 z-30 transition-all cursor-pointer hover:scale-125"
                                    style={{
                                      left: `${tok.progress * 100}%`,
                                      top: "-8px",
                                      transition: "left 0.12s linear"
                                    }}
                                    title={`Caso #${tok.caseNumber} en Tránsito`}
                                  >
                                    •
                                  </div>
                                ))}
                              </div>

                              {/* COMPUERTAS CONECTADAS DESPUÉS DE ESTE SUBPROCESO */}
                              {matchingGateways.map((gw) => {
                                const gwNodeId = `node_gw_${gw.id}`;
                                const gwNodeIdx = flowNodes.findIndex(n => n.id === gwNodeId);
                                const tokensAtGw = tokens.filter(t => t.currentNodeIndex === gwNodeIdx);
                                const gwLiveCount = nodeLiveProcessed[gwNodeId] ?? nodeStats[gwNodeId]?.casesProcessed ?? Math.round(liveCount * 0.95);

                                return (
                                  <React.Fragment key={gw.id}>
                                    {/* 3. NODO COMPUERTA (Rombo Amarillo BPMN 2.0 con Ramas de Decisión Sí/No) */}
                                    <div className="flex items-center group relative mx-2">
                                      {/* Gateway Container Body */}
                                      <div className="flex flex-col items-center relative">
                                        {/* Dynamic Processed Cases Badge */}
                                        <div className="absolute -top-3.5 bg-amber-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-xs shadow-md z-20">
                                          {gwLiveCount} Casos
                                        </div>

                                        <div className="text-[10px] font-bold text-amber-950 text-center max-w-[120px] mb-1 leading-tight" title={gw.name}>
                                          {gw.name}
                                        </div>

                                        <div className="w-13 h-13 bg-amber-50 border-2 border-amber-600 rotate-45 flex items-center justify-center shadow-sm relative group hover:bg-amber-100 transition-colors">
                                          <div className="-rotate-45 flex items-center justify-center text-amber-950 font-black select-none text-xs">
                                            {gw.type === "PARALLEL_AND" ? "+" : gw.type === "INCLUSIVE_OR" ? "O" : "X"}
                                          </div>
                                        </div>

                                        {/* RAMA NEGATIVA (NO) - Flecha Vertical Descendente (que baja) */}
                                        {gw.type !== "COMPLEX_JOIN" && (
                                          <div className="mt-1 flex flex-col items-center relative z-20">
                                            {/* Linea Vertical Descendente con Tokens Animados */}
                                            <div className="w-0.5 h-7 bg-rose-500 relative flex items-center justify-center">
                                              <ArrowDown className="w-3.5 h-3.5 text-rose-700 absolute -bottom-1" />
                                              {tokensAtGw.filter(t => t.isException).map((tok) => (
                                                <div
                                                  key={tok.id}
                                                  className="absolute w-3.5 h-3.5 rounded-full shadow-md bg-rose-600 border-2 border-white flex items-center justify-center text-[6px] font-black text-white ring-2 ring-rose-400/80 z-30 transition-all cursor-pointer hover:scale-125"
                                                  style={{
                                                    top: `${tok.progress * 100}%`,
                                                    left: "-6px",
                                                    transition: "top 0.12s linear"
                                                  }}
                                                  title={`Caso #${tok.caseNumber} (Excepción) descendiendo por Rama No`}
                                                >
                                                  ✕
                                                </div>
                                              ))}
                                            </div>

                                            {/* Badge / Etiqueta de Destino de Excepción */}
                                            <div className="text-[9px] font-extrabold text-rose-900 bg-rose-50/95 border border-rose-300 px-2 py-0.5 rounded shadow-2xs text-center whitespace-nowrap mt-0.5 max-w-[160px]" title={`Caso Negativo (No ${customErrorRate}%) ➔ ${gw.conditionFalseTarget || "Rechazado"}`}>
                                              <div className="flex items-center gap-1 justify-center">
                                                <span className="bg-rose-600 text-white font-black px-1 rounded-2xs text-[8px] uppercase">No {customErrorRate}%</span>
                                                <span className="truncate underline font-bold">{gw.conditionFalseTarget || "Rechazado"}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* RAMA AFIRMATIVA (SÍ) - Conector Horizontal Flecha hacia la Derecha */}
                                      <div className="flex items-center text-emerald-800 font-bold text-[9px] relative w-20 justify-between bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs ml-3 shrink-0" title={`Rama Afirmativa (Sí) ➔ ${gw.conditionTrueTarget || "Siguiente Estado"}`}>
                                        <span className="text-[8px] font-black uppercase text-emerald-900 shrink-0">Sí</span>
                                        <div className="w-full h-0.5 bg-emerald-500 mx-1 relative flex items-center">
                                          <ArrowRight className="w-3.5 h-3.5 text-emerald-700 absolute -right-1" />
                                          {tokensAtGw.filter(t => !t.isException).map((tok) => (
                                            <div
                                              key={tok.id}
                                              className="absolute w-3.5 h-3.5 rounded-full shadow-md bg-emerald-600 border-2 border-white flex items-center justify-center text-[6px] font-black text-white ring-2 ring-emerald-400/80 z-30 transition-all cursor-pointer hover:scale-125"
                                              style={{
                                                left: `${tok.progress * 100}%`,
                                                top: "-5px",
                                                transition: "left 0.12s linear"
                                              }}
                                              title={`Caso #${tok.caseNumber} (Conforme) en Rama Sí`}
                                            >
                                              ✓
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}

                        {/* 4. EVENTO DE TÉRMINO (Círculo Rojo BPMN 2.0 con Badge de Casos Completados) */}
                        <div className="flex flex-col items-center group relative mt-2">
                          <div className="absolute -top-3 -right-2 bg-slate-950 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-20 border border-slate-700">
                            {completedCases}
                          </div>
                          <div className="w-13 h-13 rounded-full bg-rose-100 border-4 border-rose-600 flex items-center justify-center text-rose-700 shadow-md relative transition-transform hover:scale-105">
                            <span className="w-4 h-4 bg-rose-600 rounded-full"></span>
                          </div>
                          <span className="text-[11px] font-bold text-rose-800 mt-2 text-center max-w-[120px] uppercase leading-tight">
                            EVENTO DE TÉRMINO
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5 text-center max-w-[130px]">
                            {stEvent.endTrigger || process.scopeEnd || "Entregable Finalizado"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CONTROL MANUAL DE ALTURA DE CANVAS (IDÉNTICO A MODELO DESCRIPTIVO) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xs text-xs font-mono text-slate-700 mt-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="font-bold">Control Manual de Altura de Canvas:</span>
                <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 border border-slate-300 rounded-xs">{canvasHeight}px</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="range"
                  min={350}
                  max={1200}
                  step={25}
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Number(e.target.value))}
                  className="w-full sm:w-48 accent-blue-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setCanvasHeight((h) => Math.max(350, h - 100))}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded shadow-2xs text-[10px] cursor-pointer"
                >
                  - Reducir
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasHeight((h) => Math.min(1200, h + 250))}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-2xs text-[10px] cursor-pointer"
                >
                  + Aumentar Altura (+250px)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: IDENTIFICACIÓN DE CUELLO DE BOTELLA (BOTTLENECK ANALYSIS)
         ========================================================================= */}
      {activeAnalysisTab === "bottleneck" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bottleneck Alert Banner */}
          {processSummary.bottleneckNode ? (
            <div className="bg-rose-50 border-2 border-rose-600 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-sm">
                  <Flame className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-900 uppercase tracking-wider">
                      Cuello de Botella Primario Identificado
                    </span>
                    <span className="bg-rose-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-xs">
                      {processSummary.bottleneckNode.utilizationPct}% Saturación
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-950 mt-0.5">
                    {processSummary.bottleneckNode.index}: {processSummary.bottleneckNode.name}
                  </h4>
                  <p className="text-xs text-rose-800 mt-1 max-w-2xl">
                    Este subproceso restringe el flujo total del proceso. El tiempo de espera estimado en cola (NVA) alcanza <strong>{processSummary.bottleneckNode.waitTimeHours} horas</strong> por caso debido a capacidad de recursos limitada vs demanda de <strong>{simulatedVolume} casos</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-rose-200 p-3 rounded-sm text-xs font-mono space-y-1 min-w-[190px]">
                <div className="flex justify-between text-slate-600">
                  <span>Tiempo Ciclo:</span>
                  <strong className="text-slate-900">{processSummary.bottleneckNode.totalLeadTimeHours}h</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Espera en Cola:</span>
                  <strong className="text-rose-600">{processSummary.bottleneckNode.waitTimeHours}h</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Inventario (Cola):</span>
                  <strong className="text-amber-700">{processSummary.bottleneckNode.casesInQueue} casos</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Flujo balanceado: Ningún subproceso supera el 85% de saturación de capacidad para el volumen actual.</span>
            </div>
          )}

          {/* Bottleneck Detailed Table */}
          <div className="bg-white border border-slate-200 shadow-sm p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Matriz de Saturación y Tiempos por Actividad del Proceso
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-900 text-white font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nodo / Subproceso</th>
                    <th className="p-3">Rol Responsable</th>
                    <th className="p-3 text-right">Demanda (Casos)</th>
                    <th className="p-3 text-right">Inventario (Cola)</th>
                    <th className="p-3 text-right">Touch Time (VA)</th>
                    <th className="p-3 text-right">Espera Cola (NVA)</th>
                    <th className="p-3 text-right">Lead Time Total</th>
                    <th className="p-3 text-right">Ocupación %</th>
                    <th className="p-3 text-center">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.values(nodeStats) as SimulatedNodeStats[])
                    .filter((n) => n.type === "SUBPROCESS" || n.type === "GATEWAY")
                    .sort((a, b) => b.utilizationPct - a.utilizationPct)
                    .map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          item.isBottleneck ? "bg-rose-50/50 font-semibold" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold bg-slate-200 px-1.5 py-0.5 rounded-xs">
                              {item.index}
                            </span>
                            <span className="text-slate-900 max-w-[220px] truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 text-[11px]">{item.role}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">{item.casesProcessed}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">{item.casesInQueue}</td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-bold">{item.touchTimeHours}h</td>
                        <td className="p-3 text-right font-mono text-rose-600 font-bold">{item.waitTimeHours}h</td>
                        <td className="p-3 text-right font-mono text-slate-950 font-bold">{item.totalLeadTimeHours}h</td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[11px] ${
                              item.utilizationPct >= 85
                                ? "bg-rose-100 text-rose-800 font-black"
                                : item.utilizationPct >= 70
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.utilizationPct}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {item.isBottleneck ? (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-xs uppercase">
                              <Flame className="w-3 h-3 fill-white" /> Cuello Crítico
                            </span>
                          ) : item.isSecondaryBottleneck ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase">
                              Secundario
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Estable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DESGLOSE DE TIEMPOS (TOUCH TIME / VA vs WAITING TIME / NVA)
         ========================================================================= */}
      {activeAnalysisTab === "time_breakdown" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Tiempo Total de Ciclo (Lead Time)
              </span>
              <div className="text-2xl font-black text-slate-950 font-mono">
                {processSummary.totalLeadTime}h
              </div>
              <span className="text-[10px] text-slate-500">Duración promedio caso a caso</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 p-4 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Tiempo Valor Agregado (Touch Time)
              </span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {processSummary.totalTouchTime}h
              </div>
              <span className="text-[10px] text-emerald-800 font-medium">Trabajo activo / ejecución real</span>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 p-4 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                Tiempo en Espera (Colas NVA)
              </span>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {processSummary.totalWaitTime}h
              </div>
              <span className="text-[10px] text-rose-800 font-medium">Tiempo muerto en bandejas</span>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-4 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Traspasos & Handoffs (NVA)
              </span>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {processSummary.totalTransferTime}h
              </div>
              <span className="text-[10px] text-amber-800 font-medium">Fricción entre roles y áreas</span>
            </div>
          </div>

          {/* Stacked Bar Chart for Time Breakdown */}
          <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Desglose Comparativo de Tiempos por Etapa (Horas)
              </h4>
              <span className="text-[10px] font-mono text-slate-500">Touch Time vs Espera vs Traspaso</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeBreakdownChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="h" />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", color: "#fff", fontSize: "11px", border: "none" }}
                    formatter={(value: any, name: any) => [
                      `${value} horas`,
                      name === "touchTime" ? "Touch Time (VA)" : name === "waitTime" ? "Espera en Cola (NVA)" : "Traspaso (NVA)"
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    formatter={(value) => (
                      <span className="text-xs font-semibold text-slate-700">
                        {value === "touchTime" ? "Valor Agregado (Touch)" : value === "waitTime" ? "Espera en Cola" : "Traspaso Handoff"}
                      </span>
                    )}
                  />
                  <Bar dataKey="touchTime" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="waitTime" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="transferTime" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: EFICIENCIA DEL CICLO DEL PROCESO (PCE LEAN ANALYSIS)
         ========================================================================= */}
      {activeAnalysisTab === "pce" && (
        <div className="space-y-6 animate-fadeIn">
          {/* PCE Headline Metric & Gauge */}
          <div className="bg-white border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                  Eficiencia del Ciclo del Proceso (PCE - Process Cycle Efficiency)
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Métrica estándar Lean / Six Sigma que calcula la proporción del tiempo total de entrega invertido estrictamente en actividades que <strong>agregan valor real (Touch Time)</strong> versus los desperdicios por colas y transferencias.
              </p>
              <div className="bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700 border border-slate-200 rounded-sm">
                <strong>Fórmula:</strong> <span className="text-emerald-700 font-bold">PCE (%) = (Tiempo Valor Agregado / Tiempo de Ciclo Total) × 100</span>
              </div>
            </div>

            <div className="text-center p-5 bg-slate-50 border border-slate-200 rounded-lg min-w-[220px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                PCE Calculado
              </span>
              <div className="text-4xl font-black text-slate-950 font-mono my-1">
                {processSummary.pcePct}%
              </div>
              <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-xs border ${processSummary.maturityColor}`}>
                {processSummary.leanMaturity}
              </span>
            </div>
          </div>

          {/* Lean Value Stream Breakdown & Recommendations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart Value Stream */}
            <div className="bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                Composición de Valor Agregado vs Desperdicios (Muda)
              </h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leanPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {leanPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f172a", color: "#fff", fontSize: "11px", border: "none" }} />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-[11px] font-semibold text-slate-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Benchmarks & Lean Action Plan */}
            <div className="bg-white border border-slate-200 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Plan de Optimización TO-BE Lean
              </h4>

              <div className="space-y-3 text-xs">
                <div className="border-l-3 border-emerald-500 pl-3 space-y-0.5">
                  <strong className="text-slate-900 block font-bold">1. Reducción de Tiempos de Espera (Colas)</strong>
                  <p className="text-slate-600 leading-relaxed">
                    Al implementar auto-asignación en el ERP/WMS, se puede recortar el tiempo de espera en un <strong>40%</strong>, elevando el PCE a más del <strong>35%</strong>.
                  </p>
                </div>

                <div className="border-l-3 border-blue-500 pl-3 space-y-0.5">
                  <strong className="text-slate-900 block font-bold">2. Digitalización de Traspasos de Custodia</strong>
                  <p className="text-slate-600 leading-relaxed">
                    Eliminar firmas manuales y traspasos físicos mediante firma digital reduce la fricción de handoffs en <strong>0.3 horas por caso</strong>.
                  </p>
                </div>

                <div className="border-l-3 border-amber-500 pl-3 space-y-0.5">
                  <strong className="text-slate-900 block font-bold">3. Control Preventivo de Errores en Origen</strong>
                  <p className="text-slate-600 leading-relaxed">
                    Validar datos obligatorios en la etapa de inicio evita que el {customErrorRate}% de los casos ingresen al flujo para luego ser rechazados en la compuerta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

