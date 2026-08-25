import {
  ProcessDefinition,
  SubprocessDefinition,
  ActivityFicha,
  SIPOCRow,
  KPIDefinition,
  ProcessStateMachine,
  JCIStandard,
  SIHSystem,
  ReferenceDocument
} from "../types";

export interface BuildProcessFromReferencesParams {
  processName: string;
  descriptionContext?: string;
  responsibleRole?: string;
  processOwner?: string;
  selectedJciStandards: JCIStandard[];
  selectedSihSystems: SIHSystem[];
  selectedReferenceDocuments: ReferenceDocument[];
}

/**
 * Builds a deterministic, highly-structured, institutional ProcessDefinition
 * grounded strictly on the provided JCI standards, SIH systems, and Reference Documents (papers, manuals, guides).
 * No generative AI hallucinations.
 */
export function buildProcessFromReferences(params: BuildProcessFromReferencesParams): ProcessDefinition {
  const {
    processName,
    descriptionContext = "",
    responsibleRole = "Jefatura de Servicio Clínico / Administrativo",
    processOwner = "Subdirección Médica y de Operaciones",
    selectedJciStandards,
    selectedSihSystems,
    selectedReferenceDocuments
  } = params;

  const cleanName = processName.trim() || "Proceso Estandarizado Institucional";

  // 1. Determine Subprocesses structure
  const subprocesses: SubprocessDefinition[] = [];
  let subIndexCounter = 1;

  // Case A: From Reference Documents sections
  if (selectedReferenceDocuments.length > 0) {
    for (const doc of selectedReferenceDocuments) {
      for (const section of doc.sections) {
        const subIndex = `4.${subIndexCounter}`;
        const activities: ActivityFicha[] = [];
        let actCounter = 1;

        const acts = section.suggestedActivities && section.suggestedActivities.length > 0
          ? section.suggestedActivities
          : [
              `Planificar y recepcionar requerimientos de ${section.title}`,
              `Ejecutar actividades operacionales de ${section.title}`,
              `Verificar y registrar resultados en sistema informático`
            ];

        for (const actName of acts) {
          const actIndex = `${subIndex}.${actCounter}`;
          
          // Match relevant SIH system or fallback
          const matchingSih = selectedSihSystems[(actCounter - 1) % Math.max(1, selectedSihSystems.length)] || null;
          const matchingJci = selectedJciStandards[(actCounter - 1) % Math.max(1, selectedJciStandards.length)] || null;

          const supportTech = matchingSih
            ? `[${matchingSih.code}] ${matchingSih.name}`
            : "Sistema de Información Hospitalaria (SIH)";

          const jciAttribute = matchingJci
            ? `[${matchingJci.code}] ${matchingJci.name}`
            : "";

          activities.push({
            index: actIndex,
            name: formatActivityName(actName),
            description: `El profesional responsable ${formatPresentTense(actName)} de acuerdo a las especificaciones y normativas establecidas en ${doc.name}.`,
            supportTech,
            infoInputs: `Documento de referencia (${doc.name}), requerimiento asistencial, datos del paciente o insumo.`,
            result: `Registro conforme en ${supportTech}, trazabilidad de la acción y emisión de comprobante de ejecución.`,
            rules: `Cumplimiento obligatorio de las pautas técnicas de ${section.title} y estándares de calidad institucional.`,
            variants: `En caso de contingencia informática, se utiliza formulario de respaldo en papel y posterior transcripción digital.`,
            responsibleRole: responsibleRole,
            jciAttribute: jciAttribute,
            jciSupportType: matchingJci ? "SISTEMA" : "NO_TIENE"
          });

          actCounter++;
        }

        const sipoc: SIPOCRow[] = [
          {
            supplier: `${subIndex} ${cleanSubprocessName(section.title)}`,
            inputs: activities[0]?.infoInputs || "Insumo de información inicial",
            subprocess: `Ejecución de actividades normadas de ${section.title} conforme a ${doc.name}.`,
            outputs: activities[activities.length - 1]?.result || "Resultado validado del subproceso",
            customer: "Paciente, Equipo Clínico y Subdirección Asistencial"
          }
        ];

        subprocesses.push({
          index: subIndex,
          name: cleanSubprocessName(section.title),
          narrative: `Subproceso orientado a ${section.content || section.title}, asegurando el cumplimiento estricto de las directrices documentadas en ${doc.name}.`,
          responsibleRole,
          activities,
          sipoc
        });

        subIndexCounter++;
      }
    }
  }

  // Case B: If no documents or to complement, build from SIH & JCI catalogs
  if (subprocesses.length === 0) {
    // Group SIH systems or JCI standards into sub-processes
    if (selectedSihSystems.length > 0) {
      for (const sys of selectedSihSystems) {
        const subIndex = `4.${subIndexCounter}`;
        const activities: ActivityFicha[] = [];
        let actCounter = 1;

        const featureList = sys.features && sys.features.length > 0
          ? sys.features.slice(0, 4)
          : [
              `Registrar datos en ${sys.name}`,
              `Procesar solicitud y verificar reglas de validación`,
              `Emitir informe de trazabilidad y cierre`
            ];

        for (const feat of featureList) {
          const actIndex = `${subIndex}.${actCounter}`;
          const matchingJci = selectedJciStandards[(actCounter - 1) % Math.max(1, selectedJciStandards.length)] || null;

          activities.push({
            index: actIndex,
            name: formatActivityName(feat),
            description: `El usuario operador ${formatPresentTense(feat)} mediante el módulo ${sys.name} asegurando la integridad de los datos.`,
            supportTech: `[${sys.code}] ${sys.name}`,
            infoInputs: `Parámetros de entrada de ${sys.name}, identificación de paciente o requerimiento de servicio.`,
            result: `Transacción registrada exitosamente en [${sys.code}] ${sys.name} y actualización de estado en línea.`,
            rules: `Regla de negocio: ${sys.objective}`,
            variants: `Excepción por indisponibilidad de red: registro local diferido con sincronización posterior.`,
            responsibleRole,
            jciAttribute: matchingJci ? `[${matchingJci.code}] ${matchingJci.name}` : "",
            jciSupportType: matchingJci ? "SISTEMA" : "NO_TIENE"
          });

          actCounter++;
        }

        const sipoc: SIPOCRow[] = [
          {
            supplier: `${subIndex} ${cleanSubprocessName(sys.name)}`,
            inputs: activities[0]?.infoInputs || "Datos de entrada del sistema",
            subprocess: `Transformación y procesamiento computacional mediante el sistema ${sys.name}.`,
            outputs: activities[activities.length - 1]?.result || "Resultado procesado en el sistema",
            customer: "Usuarios clínicos, administrativos y pacientes"
          }
        ];

        subprocesses.push({
          index: subIndex,
          name: cleanSubprocessName(sys.name),
          narrative: `Subproceso de apoyo operacional y tecnológico soportado por el sistema ${sys.name} (${sys.code}) para ${sys.objective}.`,
          responsibleRole,
          activities,
          sipoc
        });

        subIndexCounter++;
      }
    } else if (selectedJciStandards.length > 0) {
      for (const std of selectedJciStandards) {
        const subIndex = `4.${subIndexCounter}`;
        const activities: ActivityFicha[] = [];
        let actCounter = 1;

        const elemList = std.measurableElements && std.measurableElements.length > 0
          ? std.measurableElements.slice(0, 4)
          : [
              `Aplicar requisitos del estándar ${std.code}`,
              `Monitorear cumplimiento y adherencia`,
              `Registrar conformidad y auditoría de calidad`
            ];

        for (const elem of elemList) {
          const actIndex = `${subIndex}.${actCounter}`;

          activities.push({
            index: actIndex,
            name: formatActivityName(elem),
            description: `El equipo asistencial ${formatPresentTense(elem)} para dar estricto cumplimiento al estándar ${std.code}.`,
            supportTech: "Sistema de Información Hospitalaria (SIH)",
            infoInputs: `Pauta de cotejo, registro clínico y parámetros del estándar ${std.code}.`,
            result: `Evidencia auditable de cumplimiento del elemento medible ${std.code}.`,
            rules: `Estándar JCI: ${std.objective}`,
            variants: `Ante no conformidad, se genera alerta inmediata a la Unidad de Calidad y Seguridad del Paciente.`,
            responsibleRole,
            jciAttribute: `[${std.code}] ${std.name}`,
            jciSupportType: "PROCESO"
          });

          actCounter++;
        }

        const sipoc: SIPOCRow[] = [
          {
            supplier: `${subIndex} ${cleanSubprocessName(std.name)}`,
            inputs: activities[0]?.infoInputs || "Pauta de evaluación",
            subprocess: `Implementación y verificación activa del estándar de calidad JCI ${std.code}.`,
            outputs: activities[activities.length - 1]?.result || "Registro de conformidad",
            customer: "Comité de Calidad, Pacientes y Auditores JCI"
          }
        ];

        subprocesses.push({
          index: subIndex,
          name: cleanSubprocessName(std.name),
          narrative: `Subproceso de acreditación y garantía de seguridad clínica correspondiente al estándar ${std.code} - ${std.name}.`,
          responsibleRole,
          activities,
          sipoc
        });

        subIndexCounter++;
      }
    }
  }

  // Fallback if completely empty
  if (subprocesses.length === 0) {
    subprocesses.push({
      index: "4.1",
      name: "Recepción y Validación Inicial",
      narrative: `Subproceso inicial de recepción y verificación de conformidad para ${cleanName}.`,
      responsibleRole,
      activities: [
        {
          index: "4.1.1",
          name: "Recepcionar y registrar requerimiento institucional",
          description: `El profesional responsable recepciona el requerimiento y verifica la completitud de los antecedentes.`,
          supportTech: "Sistema de Información Hospitalaria (SIH)",
          infoInputs: "Formulario de solicitud, antecedentes clínicos y datos demográficos.",
          result: "Solicitud ingresada con número de folio único.",
          rules: "Validación de campos obligatorios e identificación correcta del usuario.",
          variants: "Rechazo inmediato si la documentación presenta inconsistencias críticas.",
          responsibleRole,
          jciSupportType: "NO_TIENE"
        },
        {
          index: "4.1.2",
          name: "Ejecutar actividades operacionales normadas",
          description: `El profesional ejecuta las pautas operacionales conforme a la norma técnica aplicable.`,
          supportTech: "Sistema de Información Hospitalaria (SIH)",
          infoInputs: "Folio asignado e instrucciones de trabajo.",
          result: "Actividad ejecutada y registrada en el sistema.",
          rules: "Adherencia a estándares de buenas prácticas asistenciales.",
          variants: "Derivación a comité técnico ante casos complejos.",
          responsibleRole,
          jciSupportType: "NO_TIENE"
        }
      ],
      sipoc: [
        {
          supplier: "4.1 Recepción y Validación Inicial",
          inputs: "Formulario de solicitud y antecedentes",
          subprocess: "Recepción, verificación y ejecución de pautas de trabajo.",
          outputs: "Registro de actividad y comprobante de ejecución",
          customer: "Paciente y Unidades Asistenciales"
        }
      ]
    });
  }

  // 2. Generate KPIs grounded in the selected standards and systems
  const kpis: KPIDefinition[] = [];
  let kpiId = 1;

  for (const std of selectedJciStandards.slice(0, 3)) {
    kpis.push({
      id: `KPI-${kpiId++}`,
      name: `Tasa de Cumplimiento Estándar JCI [${std.code}]`,
      description: `Porcentaje de atenciones y registros que cumplen satisfactoriamente con los elementos medibles de ${std.name}.`,
      formula: `(RegistrosConformes_${std.code.replace(".", "_")} / TotalAuditorias_${std.code.replace(".", "_")}) * 100`,
      periodicity: "Monthly",
      targetRange: ">= 95%",
      otherRanges: "< 90%",
      isJciLinked: true,
      jciStandard: `[${std.code}] ${std.name}`,
      jciSupportType: "PROCESO"
    });
  }

  for (const sys of selectedSihSystems.slice(0, 2)) {
    kpis.push({
      id: `KPI-${kpiId++}`,
      name: `Disponibilidad y Oportunidad en [${sys.code}] ${sys.name}`,
      description: `Porcentaje de transacciones completadas dentro del tiempo estándar establecido en el sistema ${sys.name}.`,
      formula: `(TransaccionesEnTiempo_${sys.code.replace(/\./g, "_")} / TotalTransacciones_${sys.code.replace(/\./g, "_")}) * 100`,
      periodicity: "Monthly",
      targetRange: ">= 98%",
      otherRanges: "< 92%",
      isJciLinked: false,
      jciSupportType: "SISTEMA"
    });
  }

  if (kpis.length === 0) {
    kpis.push({
      id: "KPI-1",
      name: "Tasa de Adherencia y Calidad de Registro",
      description: "Porcentaje de actividades ejecutadas y registradas conforme a la normativa vigente.",
      formula: "(ActividadesConformes / TotalActividadesEjecutadas) * 100",
      periodicity: "Monthly",
      targetRange: ">= 95%",
      otherRanges: "< 90%",
      isJciLinked: false,
      jciSupportType: "NO_TIENE"
    });
  }

  // 3. Construct State Machine
  const stateMachine: ProcessStateMachine = {
    states: ["Ingresado", "En_Revision", "En_Ejecucion", "Validado", "Completado", "Rechazado"],
    initialState: "Ingresado",
    transitions: [
      { from: "Ingresado", to: "En_Revision", action: "Enviar a revisión técnica", role: responsibleRole },
      { from: "En_Revision", to: "En_Ejecucion", action: "Aprobar y asignar ejecución", role: "Supervisor / Jefatura" },
      { from: "En_Revision", to: "Rechazado", action: "Rechazar por incumplimiento", role: "Supervisor / Jefatura" },
      { from: "En_Ejecucion", to: "Validado", action: "Completar actividades y registrar", role: responsibleRole },
      { from: "Validado", to: "Completado", action: "Cierre institucional y auditoría", role: "Control de Calidad" }
    ],
    custodyTransfers: [
      {
        state: "En_Revision",
        fromRole: responsibleRole,
        toRole: "Supervisor / Jefatura",
        trigger: "Ingreso de solicitud al sistema"
      },
      {
        state: "Validado",
        fromRole: responsibleRole,
        toRole: "Control de Calidad",
        trigger: "Término de la ejecución operativa"
      }
    ],
    exceptions: [
      {
        triggerState: "En_Revision",
        targetState: "Rechazado",
        handler: "Notificar causa de rechazo al emisor y archivar registro."
      }
    ],
    slaRules: [
      {
        state: "En_Revision",
        timeoutHours: 24,
        action: "Escalar automáticamente a jefatura por cumplimiento de plazo límite."
      },
      {
        state: "En_Ejecucion",
        timeoutHours: 48,
        action: "Generar alerta de retraso en tablero de control de gestión."
      }
    ]
  };

  // 4. Construct Glossary and Risks
  const glossary = [
    { term: "SIH", definition: "Sistemas de Información Hospitalarios institucionales del SSMSO." },
    { term: "JCI", definition: "Joint Commission International: Estándares de calidad y seguridad del paciente en salud." },
    { term: "FCE", definition: "Ficha Clínica Electrónica de atención de pacientes." },
    { term: "Trazabilidad", definition: "Capacidad de reconstruir el historial y ubicación de una acción o insumo mediante registros unívocos." },
    { term: "Doble Chequeo", definition: "Verificación independiente realizada por dos profesionales de salud previa a una acción de alto riesgo." }
  ];

  const risks = [
    "Riesgo de error en la identificación del paciente durante la ejecución del proceso.",
    "Riesgo de falla de conectividad o caída de los sistemas informáticos institucionales.",
    "Riesgo de incumplimiento de plazos máximos normados para la atención.",
    "Riesgo de omisión en el registro de trazabilidad en la ficha clínica o sistema de soporte."
  ];

  return {
    name: cleanName,
    description: descriptionContext || `Proceso diseñado y estructurado bajo los estándares de acreditación JCI, catálogo institucional de apoyo tecnológico SIH y documentos de referencia técnica.`,
    macroproceso: "Gestión Clínica y de Apoyo Asistencial",
    proceso: cleanName,
    microproceso: subprocesses.map((s) => s.name).join(" > "),
    scopeStart: `Recepción de requerimiento asistencial, indicación médica o evento desencadenante.`,
    scopeEnd: `Cierre del registro, emisión de resultados validados y actualización en el catálogo SIH.`,
    responsibleRole,
    processOwner,
    processInputs: `Solicitudes de atención, antecedentes clínicos, documentos de referencia normativa y recursos tecnológicos SIH.`,
    processOutputs: `Prestación asistencial efectuada, registro clínico conforme, informe de trazabilidad y métricas de calidad.`,
    suppliers: `Servicios de Urgencia, Consultorios de Especialidades, Central de Abastecimiento y Unidades de Apoyo.`,
    customers: `Pacientes, Equipo de Salud Asistencial, Subdirección Médica y Entidades Fiscalizadoras (MINSAL / JCI).`,
    risks,
    glossary,
    kpis,
    subprocesses,
    stateMachine
  };
}

function formatActivityName(name: string): string {
  let clean = name.trim().replace(/^[•\-\*\d\.\)\s]+/, "").trim();
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean;
}

function cleanSubprocessName(name: string): string {
  let clean = name.trim().replace(/^(\d+\.|\d+\.\d+|\d+\.\d+\.\d+)\s*/, "").trim();
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean;
}

function formatPresentTense(activity: string): string {
  const words = activity.trim().split(" ");
  const firstWord = words[0].toLowerCase();

  const conjugations: Record<string, string> = {
    realizar: "realiza",
    verificar: "verifica",
    registrar: "registra",
    evaluar: "evalúa",
    administrar: "administra",
    ejecutar: "ejecuta",
    notificar: "notifica",
    controlar: "controla",
    validar: "valida",
    solicitar: "solicita",
    recepcionar: "recepciona",
    identificar: "identifica",
    ingresar: "ingresa",
    comprobar: "comprueba",
    armar: "arma",
    sellar: "sella",
    cargar: "carga",
    monitorear: "monitorea",
    almacenar: "almacena",
    despachar: "despacha",
    prescribir: "prescribe",
    fraccionar: "fracciona",
    dispensar: "dispensa",
    efectuar: "efectúa",
    emitir: "emite",
    entregar: "entrega",
    cerrar: "cierra",
    categorizar: "categoriza",
    derivar: "deriva",
    asignar: "asigna",
    confirmar: "confirma",
    aplicar: "aplica"
  };

  if (conjugations[firstWord]) {
    words[0] = conjugations[firstWord];
    return words.join(" ");
  }

  return `ejecuta la actividad de ${activity.toLowerCase()}`;
}
