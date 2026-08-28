import { ProcessDefinition } from "../types";

/**
 * Genera una definición de proceso institucional estructurada TO-BE / BPMN 2.0
 * cuando la API de Gemini no está disponible o cuando falla la conexión con el servidor.
 */
export function generateFallbackProcess(processName: string, descriptionContext: string): ProcessDefinition {
  const cleanName = processName.trim() || "Gestión de Procesos Operativos";
  const cleanContext = descriptionContext.trim() || "Atención y procesamiento estándar de requerimientos institucionales.";

  return {
    name: cleanName,
    description: `Modelo de proceso TO-BE optimizado para la ${cleanName}. ${cleanContext}`,
    scopeStart: `Recepción e Ingesta Inicial de Requerimiento / Solicitud de ${cleanName}`,
    scopeEnd: `Entrega de Producto / Solución Finalizada y Registro Institucional`,
    responsibleRole: "Coordinador Responsable del Proceso",
    processOwner: "Subdirección / Jefatura de Operaciones y Procesos",
    processInputs: `Solicitudes de ${cleanName}, Documentación de Respaldos, Formulario de Ingreso`,
    processOutputs: `Entregable de ${cleanName} Finalizado, Certificado / Comprobante de Término, Registro en Sistema ERP`,
    suppliers: "Usuarios Solicitantes, Unidades Internas, Proveedores de Insumos",
    customers: "Ciudadanía, Pacientes, Beneficiarios, Unidades Institucionales Destinatarias",
    risks: [
      `Riesgo 1: Demoras en la validación inicial de solicitudes de ${cleanName} por documentación incompleta.`,
      `Riesgo 2: Errores en la captura de datos en el sistema institucional durante la fase de análisis.`,
      `Riesgo 3: Incumplimiento de SLA por sobrecarga operativa en la fase de ejecución y control.`,
      `Riesgo 4: Inconsistencias en los registros históricos y auditoría de decisiones.`
    ],
    glossary: [
      {
        term: "SLA (Service Level Agreement)",
        definition: "Acuerdo de nivel de servicio que define el tiempo máximo establecido para resolver cada etapa del proceso."
      },
      {
        term: "FCE (Factor Crítico de Éxito)",
        definition: "Elemento clave de la operación que garantiza el cumplimiento de los estándares institucionales esperados."
      },
      {
        term: "Sistema ERP / Core",
        definition: "Plataforma de software institucional centralizada utilizada para el registro y trazabilidad de las actividades."
      }
    ],
    kpis: [
      {
        id: "KPI-01",
        name: `Nivel de Cumplimiento de SLA en ${cleanName}`,
        description: "Mide el porcentaje de solicitudes atendidas dentro de los plazos estipulados.",
        formula: "([Número de solicitudes atendidas en SLA] / [Número total de solicitudes recibidas en periodo determinado]) * 100",
        periodicity: "Monthly",
        targetRange: ">= 92%",
        otherRanges: "< 85%",
        isJciLinked: true,
        jciStandard: "IPSG.2 - Mejora de la Comunicación Efectiva y Oportunidad",
        jciSupportType: "PROCESO"
      },
      {
        id: "KPI-02",
        name: "Tasa de Conformidad al Primer Intento (First Time Right)",
        description: "Porcentaje de trámites procesados sin requerir reprocesos ni observaciones.",
        formula: "([Número de solicitudes sin reproceso ni observaciones] / [Número total de solicitudes procesadas en periodo determinado]) * 100",
        periodicity: "Monthly",
        targetRange: ">= 88%",
        otherRanges: "< 80%",
        isJciLinked: true,
        jciStandard: "MOI.1 - Gestión de la Información y Calidad de Registros",
        jciSupportType: "SISTEMA"
      },
      {
        id: "KPI-03",
        name: "Índice de Satisfacción del Usuario / Beneficiario",
        description: "Evaluación promedio del nivel de satisfacción tras la finalización del servicio.",
        formula: "([Puntaje total de satisfacción obtenido] / [Puntaje máximo de evaluación posible]) * 100",
        periodicity: "Quarterly",
        targetRange: ">= 90%",
        otherRanges: "< 75%",
        isJciLinked: false,
        jciSupportType: "DOCUMENTO"
      }
    ],
    subprocesses: [
      {
        index: "4.1",
        name: "Recepción y Admisibilidad de Solicitudes",
        narrative: `Primer subproceso focalizado en la ingesta, registro y validación documental inicial para la ${cleanName}.`,
        sipoc: [
          {
            supplier: "Usuario Solicitante",
            inputs: "Formulario de Solicitud y Anexos",
            subprocess: "Recepción y Admisibilidad de Solicitudes",
            outputs: "Solicitud Ingestada y Foliada",
            customer: "Unidad Analista"
          }
        ],
        activities: [
          {
            index: "4.1.1",
            name: "Recibir Solicitud",
            description: "El operador ingresa al portal institucional, descarga la solicitud presentada y verifica la presencia de los antecedentes adjuntos obligatorios.",
            supportTech: "Sistema ERP Institucional",
            infoInputs: "Formulario de Ingreso y Adjuntos",
            result: "Conforme: Solicitud recibida y foliada en sistema / No Conforme: Solicitud rechazada por falta de requisitos mínimos",
            rules: "Aplicar Reglamento de Admisibilidad Institucional Art. 12.",
            variants: "No tiene"
          },
          {
            index: "4.1.2",
            name: "Validar Antecedentes",
            description: "El analista contrasta la información entregada contra las bases de datos oficiales para corroborar veracidad y consistencia de los datos.",
            supportTech: "Sistema de Verificación y Registro ERP",
            infoInputs: "Solicitud Foliada",
            result: "Conforme: Documentación validada y aceptada / No Conforme: Registro devuelto para subsanación de observaciones",
            rules: "Privilegiar revisión de vigencia y completitud documental.",
            variants: "No tiene"
          },
          {
            index: "4.1.3",
            name: "Categorizar Solicitud",
            description: "El sistema asigna la prioridad y el flujo correspondiente según el tipo de trámite y la complejidad del requerimiento.",
            supportTech: "Motor de Reglas y Categorización",
            infoInputs: "Solicitud Validada",
            result: "Solicitud Categorizada y Priorizada",
            rules: "Aplicar Matriz de Priorización según nivel de urgencia.",
            variants: "No tiene"
          }
        ]
      },
      {
        index: "4.2",
        name: "Análisis y Evaluación Técnica",
        narrative: `Subproceso destinado al examen sustantivo y evaluación de factibilidad técnica/operativa para la ${cleanName}.`,
        sipoc: [
          {
            supplier: "Unidad de Recepción",
            inputs: "Solicitud Categorizada",
            subprocess: "Análisis y Evaluación Técnica",
            outputs: "Informe Técnico / Dictamen Favorable",
            customer: "Comité Aprobador"
          }
        ],
        activities: [
          {
            index: "4.2.1",
            name: "Analizar Requerimiento",
            description: "El profesional especialista examina las especificaciones técnicas y legales aplicables para emitir un juicio calificado.",
            supportTech: "Sistema de Análisis Técnico",
            infoInputs: "Solicitud Categorizada",
            result: "Análisis Técnico Completado",
            rules: "Aplicar Estándares Técnicos y Normativa Vigente.",
            variants: "No tiene"
          },
          {
            index: "4.2.2",
            name: "Elaborar Dictamen",
            description: "El especialista redacta el borrador de dictamen o informe fundado de evaluación con las conclusiones del análisis.",
            supportTech: "Sistema de Informes e Integración",
            infoInputs: "Análisis Técnico Completado",
            result: "Informe Técnico Elaborado",
            rules: "Utilizar plantilla institucional estandarizada.",
            variants: "No tiene"
          }
        ]
      },
      {
        index: "4.3",
        name: "Aprobación y Resolución Formal",
        narrative: `Instancia de revisión jerárquica y formalización de la decisión ejecutiva del proceso.`,
        sipoc: [
          {
            supplier: "Unidad Analista",
            inputs: "Informe Técnico Elaborado",
            subprocess: "Aprobación y Resolución Formal",
            outputs: "Resolución Aprobada / Visada",
            customer: "Unidad Ejecutora"
          }
        ],
        activities: [
          {
            index: "4.3.1",
            name: "Revisar Dictamen",
            description: "La jefatura visadora revisa el informe consolidado y valida el sustento de la recomendación formulada.",
            supportTech: "Sistema de Visado y Firma Digital",
            infoInputs: "Informe Técnico Elaborado",
            result: "Conforme: Visado autorizado / No Conforme: Devuelto con observaciones técnicas",
            rules: "Requiere firma electrónica avanzada de la autoridad.",
            variants: "No tiene"
          },
          {
            index: "4.3.2",
            name: "Emitir Resolución",
            description: "Se genera el acto administrativo u orden oficial que autoriza formalmente la ejecución o entrega.",
            supportTech: "Sistema de Gestión Documental",
            infoInputs: "Visado Autorizado",
            result: "Resolución Emitida y Notificada",
            rules: "Registrar correlativo oficial de resolución.",
            variants: "No tiene"
          }
        ]
      },
      {
        index: "4.4",
        name: "Ejecución, Entrega y Cierre Operativo",
        narrative: `Etapa final orientada al cumplimiento efectivo del servicio, entrega al beneficiario y cierre de expediente.`,
        sipoc: [
          {
            supplier: "Jefatura Aprobadora",
            inputs: "Resolución Emitida",
            subprocess: "Ejecución, Entrega y Cierre Operativo",
            outputs: "Entregable Recibido y Expediente Cerrado",
            customer: "Usuario Final / Auditoría"
          }
        ],
        activities: [
          {
            index: "4.4.1",
            name: "Ejecutar Operación",
            description: "El equipo operativo lleva a cabo las acciones comprometidas en la resolución aprobada.",
            supportTech: "Sistema de Ejecución Operativa",
            infoInputs: "Resolución Emitida",
            result: "Operación Ejecutada Exitosamente",
            rules: "Seguir protocolo estricto de ejecución en terreno / sistema.",
            variants: "No tiene"
          },
          {
            index: "4.4.2",
            name: "Entregar Producto",
            description: "Se efectúa la entrega formal del bien, servicio o certificado al usuario solicitante recopilando acuse de recibo.",
            supportTech: "Sistema de Notificación y Entregas",
            infoInputs: "Operación Ejecutada",
            result: "Acuse de Recibo Firmado y Registrado",
            rules: "Verificar identidad del receptor al momento de la entrega.",
            variants: "No tiene"
          },
          {
            index: "4.4.3",
            name: "Cerrar Expediente",
            description: "El sistema consolida la trazabilidad de tiempos, guarda la documentación de respaldo y marca la solicitud en estado Finalizado.",
            supportTech: "Sistema de Gestión e Indicadores ERP",
            infoInputs: "Acuse de Recibo Firmado",
            result: "Expediente Archivante y Estado Finalizado",
            rules: "Archivar según norma de gestión documental.",
            variants: "No tiene"
          }
        ]
      }
    ],
    stateMachine: {
      states: [
        "Recepción y Admisibilidad de Solicitudes",
        "Análisis y Evaluación Técnica",
        "Aprobación y Resolución Formal",
        "Ejecución, Entrega y Cierre Operativo"
      ],
      initialState: "Recepción y Admisibilidad de Solicitudes",
      transitions: [
        {
          from: "Recepción y Admisibilidad de Solicitudes",
          to: "Análisis y Evaluación Técnica",
          action: "Validación y Admisibilidad Aprobada",
          role: "Operador de Recepción"
        },
        {
          from: "Análisis y Evaluación Técnica",
          to: "Aprobación y Resolución Formal",
          action: "Dictamen Técnico Favorable Emitido",
          role: "Analista Técnico"
        },
        {
          from: "Aprobación y Resolución Formal",
          to: "Ejecución, Entrega y Cierre Operativo",
          action: "Resolución Firmada y Autorizada",
          role: "Jefatura Visadora"
        }
      ],
      custodyTransfers: [
        {
          state: "Análisis y Evaluación Técnica",
          fromRole: "Operador de Recepción",
          toRole: "Analista Técnico",
          trigger: "Pase de Expediente Admitido"
        },
        {
          state: "Aprobación y Resolución Formal",
          fromRole: "Analista Técnico",
          toRole: "Jefatura Visadora",
          trigger: "Envío a Firma de Acto Administrativo"
        }
      ],
      exceptions: [
        {
          triggerState: "Recepción y Admisibilidad de Solicitudes",
          targetState: "Rechazado",
          handler: "Devolución con Oficio de Inadmisibilidad"
        },
        {
          triggerState: "Análisis y Evaluación Técnica",
          targetState: "Quarantined",
          handler: "Solicitud de Aclaración de Antecedentes al Usuario"
        }
      ],
      slaRules: [
        {
          state: "Recepción y Admisibilidad de Solicitudes",
          timeoutHours: 24,
          action: "Alerta de Vencimiento Próximo a Recepción"
        },
        {
          state: "Análisis y Evaluación Técnica",
          timeoutHours: 48,
          action: "Escalamiento Preventivo a Jefatura de Análisis"
        },
        {
          state: "Aprobación y Resolución Formal",
          timeoutHours: 24,
          action: "Recordatorio Urgente de Firma Pendiente"
        },
        {
          state: "Ejecución, Entrega y Cierre Operativo",
          timeoutHours: 48,
          action: "Notificación de Seguimiento de Entrega"
        }
      ]
    }
  };
}

export function ensureProcessSubprocessKpis(process: ProcessDefinition): ProcessDefinition {
  if (!process.subprocesses || process.subprocesses.length === 0) return process;

  let kpis = [...(process.kpis || [])];

  process.subprocesses.forEach((sub, sIdx) => {
    const matchingKpi = kpis.find(k => k.id.includes(sub.index) || k.description.toLowerCase().includes(sub.name.toLowerCase()) || k.name.toLowerCase().includes(sub.name.toLowerCase()));

    if (!matchingKpi) {
      const firstAct = sub.activities[0];
      const lastAct = sub.activities[sub.activities.length - 1];
      const tech = firstAct?.supportTech || "Plataforma Core Institucional";
      const inputData = firstAct?.infoInputs || sub.sipoc?.[0]?.inputs || "Insumos de Entrada";
      const resultData = lastAct?.result || sub.sipoc?.[0]?.outputs || "Entregable Conforme";
      const rules = firstAct?.rules || "Normativa Estándar";
      const role = sub.responsibleRole || firstAct?.responsibleRole || process.responsibleRole || "Rol Operativo";
      const actCount = sub.activities.length;

      // Select purpose prefix to avoid sub-process index naming
      const prefixes = [
        "Cumplimiento de",
        "Tasa de efectividad en",
        "Eficiencia de",
        "Oportunidad en",
        "Precisión de"
      ];
      const selectedPrefix = prefixes[sIdx % prefixes.length];
      const kpiName = `${selectedPrefix} ${sub.name}`;

      // Generate a clean slug from the purpose name to avoid sub-process indices like "KPI-4_1"
      const cleanSlug = kpiName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, "_")      // replace non-alphanumeric with underscore
        .replace(/_+/g, "_")             // collapse multiple underscores
        .trim()
        .replace(/^_+|_+$/g, "")         // trim leading/trailing underscores
        .substring(0, 40);               // limit length

      const kpiId = `kpi_${cleanSlug}`;

      kpis.push({
        id: kpiId,
        name: kpiName,
        description: `Mide el rendimiento, cumplimiento de SLA y conformidad de ${sub.name} considerando sus ${actCount} actividades, ejecutadas por ${role}.`,
        formula: `${kpiId.toUpperCase()} = ( ActividadesConformes / ${actCount} ) * ( 1 - TasaIncidencias ) [Soporte: ${tech} | Insumos: ${inputData} | Resultado: ${resultData} | Reglas: ${rules}]`,
        periodicity: sIdx % 2 === 0 ? "Monthly" : "Daily",
        targetRange: ">= 95.0%",
        otherRanges: "< 90.0%"
      });
    }
  });

  return { ...process, kpis };
}

