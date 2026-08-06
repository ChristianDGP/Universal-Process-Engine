import { ProcessDefinition } from "./types";

export const BLANK_PROCESS_PRESET: ProcessDefinition = {
  name: "",
  description: "Diseño de proceso listo para ser estructurado. Ingrese el Nombre del Proceso y el Contexto/Alcance Operativo en la barra superior para generar el modelo TO-BE completo.",
  scopeStart: "Por definir según el alcance operativo ingresado.",
  scopeEnd: "Por definir según el objetivo final del proceso.",
  responsibleRole: "Responsable Operativo del Proceso",
  processOwner: "Jefatura / Dirección Dueña del Proceso",
  processInputs: "Documentos, solicitudes o datos de entrada iniciales.",
  processOutputs: "Resultados, entregables o registros finales generados.",
  suppliers: "Proveedores de información o insumos internos/externos.",
  customers: "Beneficiarios o usuarios finales del resultado del proceso.",
  risks: [
    "Falta de definición de controles de calidad en puntos de traspaso.",
    "Tiempos de espera excesivos por autorizaciones manuales no estandarizadas."
  ],
  glossary: [
    { term: "Modelo TO-BE", definition: "Diseño futuro optimizado del proceso que incorpora buenas prácticas y automatizaciones." }
  ],
  kpis: [
    {
      id: "kpi_ciclo_general",
      name: "Tiempo Total del Ciclo de Atención",
      description: "Mide el tiempo promedio transcurrido desde el inicio del proceso hasta su entrega final.",
      formula: "KPI = Promedio(FechaFin - FechaInicio)",
      periodicity: "Daily",
      targetRange: "Satisfactorio <= 24 Horas",
      otherRanges: "Insatisfactorio > 48 Horas"
    },
    {
      id: "kpi_calidad_entrega",
      name: "Tasa de Conformidad de Entregables",
      description: "Porcentaje de casos procesados sin errores ni observaciones en primera instancia.",
      formula: "KPI = (CasosConformes / TotalCasos) * 100",
      periodicity: "Weekly",
      targetRange: "Satisfactorio >= 95%",
      otherRanges: "Insatisfactorio < 90%"
    }
  ],
  subprocesses: [],
  stateMachine: {
    states: ["Draft", "In_Progress", "Under_Review", "Approved", "Executed"],
    initialState: "Draft",
    transitions: [
      { from: "Draft", action: "Aperturar Caso", to: "In_Progress", role: "Operador Inicial" },
      { from: "In_Progress", action: "Enviar a Revisión", to: "Under_Review", role: "Operador Proceso" },
      { from: "Under_Review", action: "Aprobar Dictamen", to: "Approved", role: "Revisor / Supervisor" },
      { from: "Approved", action: "Finalizar Ejecución", to: "Executed", role: "Responsable Final" }
    ],
    exceptions: [
      { triggerState: "In_Progress", targetState: "Draft", handler: "Rechazo por observaciones de forma en datos iniciales" }
    ],
    custodyTransfers: [
      { state: "Under_Review", fromRole: "Operador Proceso", toRole: "Revisor / Supervisor", trigger: "Envío de expediente a revisión" },
      { state: "Approved", fromRole: "Revisor / Supervisor", toRole: "Responsable Final", trigger: "Aprobación formal del dictamen" }
    ],
    slaRules: [
      { state: "In_Progress", timeoutHours: 12, action: "Alerta preventiva al operador" },
      { state: "Under_Review", timeoutHours: 24, action: "Escalamiento a Jefatura de Área" }
    ]
  }
};

export const WAREHOUSE_LOGISTICS_PRESET: ProcessDefinition = {
  name: "Gestión de Abastecimiento y Logística de Bodega",
  description: "Proceso estándar para la recepción, control de calidad, almacenamiento e inventario de materias primas e insumos médicos.",
  scopeStart: "Recepción de solicitud de compra aprobada o arribo de camión de proveedor con guía de despacho.",
  scopeEnd: "Insumos almacenados en racks con registro digital en WMS y notificación de disponibilidad enviada al área solicitante.",
  responsibleRole: "Jefe de Bodega y Logística",
  processOwner: "Subdirección de Operaciones y Logística",
  processInputs: "Guía de despacho de proveedor, Orden de compra digital, Factura, Solicitud de insumos.",
  processOutputs: "Acta de recepción conforme, Reporte de stock actualizado en ERP, Alertas de quiebre de stock.",
  suppliers: "Proveedores nacionales e internacionales de insumos, Departamento de Adquisiciones.",
  customers: "Unidades clínicas operativas, Centros de costo internos, Área de control financiero.",
  risks: [
    "Diferencia entre stock físico y digital registrado en WMS.",
    "Merma por quiebre de cadena de frío en insumos termosensibles.",
    "Ingreso de insumos dañados o vencidos al stock operativo."
  ],
  glossary: [
    { term: "WMS (Warehouse Management System)", definition: "Sistema de software que permite gestionar el inventario y controlar las operaciones de almacenamiento." },
    { term: "Guía de Despacho", definition: "Documento tributario obligatorio que acompaña el traslado de mercaderías y acredita la entrega física." },
    { term: "SKU (Stock Keeping Unit)", definition: "Identificador único asignado a un producto para rastrear su inventario de forma unitaria." }
  ],
  kpis: [
    {
      id: "kpi_rec_time",
      name: "Tiempo de Recepción y Registro",
      description: "Mide el tiempo promedio transcurrido desde el ingreso del camión del proveedor hasta el registro final en el WMS.",
      formula: "KPI = Promedio(FechaRegistroWMS - FechaArriboProveedor)",
      periodicity: "Daily",
      targetRange: "Satisfactorio <= 4 Horas",
      otherRanges: "Insatisfactorio > 8 Horas"
    },
    {
      id: "kpi_quality_rate",
      name: "Tasa de Rechazo de Recepción",
      description: "Porcentaje de guías de despacho rechazadas parcial o totalmente por inconformidades técnicas o de calidad.",
      formula: "KPI = (GuiasRechazadas / TotalGuiasRecibidas) * 100",
      periodicity: "Weekly",
      targetRange: "Satisfactorio < 2%",
      otherRanges: "Insatisfactorio >= 5%"
    },
    {
      id: "kpi_stock_accuracy",
      name: "Precisión de Inventario (IRA)",
      description: "Grado de concordancia entre las existencias físicas en bodega y el registro digital en el sistema de gestión.",
      formula: "KPI = (ItemsSinDiscrepancia / TotalItemsAuditados) * 100",
      periodicity: "Monthly",
      targetRange: "Satisfactorio >= 98.5%",
      otherRanges: "Insatisfactorio < 95%"
    }
  ],
  subprocesses: [
    {
      index: "4.1",
      name: "Recepción e Inspección de Insumos",
      narrative: "Consiste en la recepción del transporte en andén, la validación de la documentación fiscal (guía de despacho vs. orden de compra) y la inspección visual exterior.",
      sipoc: [
        {
          supplier: "Transportista / Proveedor",
          inputs: "Camión con carga, Guía de despacho fiscal",
          subprocess: "Recepción e Inspección de Insumos",
          outputs: "Pre-recepción conforme o Rechazo en andén",
          customer: "Bodegueros de turno"
        }
      ],
      activities: [
        {
          index: "4.1.1",
          name: "Verificar Documentación Fiscal de Arribo",
          description: "El recepcionista de bodega solicita la guía de despacho física y verifica en el ERP que exista una Orden de Compra activa vinculada en estado Liberada.",
          supportTech: "Módulo de Compras del ERP SAP",
          infoInputs: "Arribo de transporte con guía de despacho",
          result: "Conforme: Pre-ingreso de documento aprobado y registrado / No Conforme: Reclamación en andén por orden no liberada o inconsistencia",
          rules: "Aplicar procedimiento de validación tributaria y Orden de Compra en estado Liberada.",
          variants: "Si la guía de despacho presenta inconformidades graves, se genera rechazo directo en andén."
        },
        {
          index: "4.1.2",
          name: "Descargar Mercadería e Inspeccionar Bultos",
          description: "El operador descarga la mercadería en la zona de tránsito, realizando conteo de bultos y verificación del estado exterior de las cajas.",
          supportTech: "Sistema WMS / Módulo de Recepción",
          infoInputs: "Pre-ingreso de documento registrado",
          result: "Pallets etiquetados temporalmente en zona de tránsito",
          rules: "No tiene",
          variants: "En caso de detectar bultos dañados o mojados, trasladar a zona de Cuarentena (Ver Actividad 4.2.1)."
        },
        {
          index: "4.1.3",
          name: "Generar Tarjeta de Recepción en Andén",
          description: "El recepcionista ingresa las cantidades preliminares recibidas y emite la tarjeta física de recepción temporal para adosar a cada pallet.",
          supportTech: "Sistema WMS / Impresora de Código de Barras",
          infoInputs: "Pallets etiquetados temporalmente en zona de tránsito",
          result: "Tarjeta de recepción temporal adosada a bultos",
          rules: "Aplicar Instructivo de Etiquetado de Recepción Provisional.",
          variants: "No tiene"
        },
        {
          index: "4.1.4",
          name: "Notificar Disponibilidad para Control Técnico",
          description: "El sistema envía una notificación automática al equipo de calidad para programar el muestreo técnico de los bultos en zona de tránsito.",
          supportTech: "Módulo de Notificaciones de Flujo ERP/WMS",
          infoInputs: "Tarjeta de recepción temporal adosada a bultos",
          result: "Alerta de inspección técnica enviada a Calidad",
          rules: "No tiene",
          variants: "No tiene"
        }
      ]
    },
    {
      index: "4.2",
      name: "Control de Calidad y Muestreo",
      narrative: "Validación técnica detallada de las especificaciones de los insumos, lotes, fechas de vencimiento y cadena de frío si aplica, previo a su liberación para almacenamiento.",
      sipoc: [
        {
          supplier: "Bodeguero / Operador de Recepción",
          inputs: "Pallets en tránsito temporal",
          subprocess: "Control de Calidad y Muestreo",
          outputs: "Lote Liberado o Lote Rechazado por Calidad",
          customer: "Jefe de Bodega / WMS"
        }
      ],
      activities: [
        {
          index: "4.2.1",
          name: "Validar Atributos Críticos de Lote",
          description: "El inspector técnico de calidad extrae muestras aleatorias, verifica fechas de vencimiento, integridad de envases primarios y registros de temperatura.",
          supportTech: "Portal Web de Calidad de Insumos",
          infoInputs: "Pallets etiquetados temporalmente en zona de tránsito",
          result: "Conforme: Dictamen técnico aprobado y lote liberado / No Conforme: Lote retenido y rechazado o derivado a cuarentena",
          rules: "Aplicar Norma Técnica de Inspección Muestral AQL y rango 2°C a 8°C para productos refrigerados.",
          variants: "Si la temperatura sobrepasa el rango permitido, el lote completo pasa a estado Quarantined."
        },
        {
          index: "4.2.2",
          name: "Registrar Certificado de Análisis de Proveedor",
          description: "El inspector adjunta la copia digital del certificado de análisis de laboratorio entregado por el fabricante en la ficha del lote.",
          supportTech: "Módulo de Gestión Documental de Calidad",
          infoInputs: "Dictamen técnico de calidad ingresado",
          result: "Certificado de calidad adjunto en expediente digital",
          rules: "Aplicar Exigencia de Trazabilidad de Lotes de Fabricante.",
          variants: "No tiene"
        },
        {
          index: "4.2.3",
          name: "Confirmar Liberación Digital de Stock",
          description: "Una vez emitido el dictamen conforme, se realiza la confirmación digital en el sistema WMS, activando los SKU para inventario disponible.",
          supportTech: "Sistema WMS / Módulo de Inventarios ERP",
          infoInputs: "Certificado de calidad adjunto en expediente digital",
          result: "Insumos liberados en inventario disponible",
          rules: "Solo personal con rol Inspector de Calidad ejecuta la liberación en sistema.",
          variants: "No tiene"
        }
      ]
    },
    {
      index: "4.3",
      name: "Almacenamiento y Ubicación Definitiva",
      narrative: "Proceso de traslado físico y almacenamiento de los insumos en las estanterías o racks de la bodega siguiendo la estrategia de optimización asignada por el WMS.",
      sipoc: [
        {
          supplier: "WMS / Inspector de Calidad",
          inputs: "Insumos liberados con código SKU definitivo",
          subprocess: "Almacenamiento y Ubicación Definitiva",
          outputs: "Ubicación en rack confirmada y stock disponible",
          customer: "Área de Despacho / Solicitantes internos"
        }
      ],
      activities: [
        {
          index: "4.3.1",
          name: "Asignar Ubicación por Algoritmo WMS",
          description: "El WMS analiza el tipo de SKU, nivel de rotación y dimensiones del pallet para determinar la ubicación óptima en estanterías.",
          supportTech: "Algoritmo de optimización de putaway del WMS",
          infoInputs: "Insumos liberados en inventario disponible",
          result: "Instrucción de putaway asignada",
          rules: "Ubicación segregada requerida para productos químicos o inflamables.",
          variants: "En caso de ubicación física obstruida, el sistema re-calcula una posición alternativa automáticamente."
        },
        {
          index: "4.3.2",
          name: "Trasladar Bultos a Zona de Almacenamiento",
          description: "El operador de apilador desplaza la carga desde la zona de recepción hasta el pasillo y rack asignado por la orden de trabajo.",
          supportTech: "Terminal de Radiofrecuencia WMS",
          infoInputs: "Instrucción de putaway asignada",
          result: "Pallet posicionado en pasillo de destino",
          rules: "Aplicar Manual de Seguridad Logística de Cargas Pesadas.",
          variants: "No tiene"
        },
        {
          index: "4.3.3",
          name: "Confirmar Posicionamiento en Racks",
          description: "El operador traslada la carga a la posición asignada y confirma la ubicación en el sistema WMS para dejar el stock disponible.",
          supportTech: "Sistema WMS / Módulo de Control de Ubicaciones",
          infoInputs: "Pallet posicionado en pasillo de destino",
          result: "Almacenamiento definitivo confirmado en estantería",
          rules: "No tiene",
          variants: "No tiene"
        }
      ]
    }
  ],
  stateMachine: {
    states: ["Draft", "Pending_Quality", "Quarantined", "Approved_Quality", "Executed_Stored", "Rejected"],
    initialState: "Draft",
    transitions: [
      { from: "Draft", to: "Pending_Quality", action: "Confirmar pre-recepción e ingreso a andén", role: "Recepcionista de Bodega" },
      { from: "Pending_Quality", to: "Approved_Quality", action: "Liberar lote conforme control técnico", role: "Inspector de Calidad" },
      { from: "Pending_Quality", to: "Quarantined", action: "Identificar desviación o quiebre de cadena de frío", role: "Inspector de Calidad" },
      { from: "Pending_Quality", to: "Rejected", action: "Rechazar por daños graves o vencimiento directo", role: "Inspector de Calidad" },
      { from: "Quarantined", to: "Approved_Quality", action: "Liberación especial tras validación de laboratorio externo", role: "Jefe de Calidad" },
      { from: "Quarantined", to: "Rejected", action: "Rechazar definitivamente tras peritaje técnico", role: "Jefe de Calidad" },
      { from: "Approved_Quality", to: "Executed_Stored", action: "Confirmar almacenamiento físico en estantería (Putaway)", role: "Operador de Grúa" }
    ],
    custodyTransfers: [
      { state: "Pending_Quality", fromRole: "Recepcionista de Bodega", toRole: "Inspector de Calidad", trigger: "Guía pre-recibida digitalmente en ERP" },
      { state: "Approved_Quality", fromRole: "Inspector de Calidad", toRole: "Operador de Grúa", trigger: "Liberación técnica en WMS" },
      { state: "Executed_Stored", fromRole: "Operador de Grúa", toRole: "Jefe de Bodega y Logística", trigger: "Escaneo de confirmación en ubicación de rack" }
    ],
    exceptions: [
      { triggerState: "Pending_Quality", targetState: "Quarantined", handler: "Generar orden de inspección técnica profunda y notificar a compras corporativas." },
      { triggerState: "Quarantined", targetState: "Rejected", handler: "Emitir acta de destrucción o devolución aduanera, bloquear SKU y activar póliza de seguro de transporte." }
    ],
    slaRules: [
      { state: "Pending_Quality", timeoutHours: 4, action: "Notificación de alerta naranja por SMS/Mail al Jefe de Calidad por retraso en andén." },
      { state: "Quarantined", timeoutHours: 24, action: "Escalamiento automático a Gerencia de Operaciones para dictamen de disposición final." }
    ]
  }
};

export const CLINICAL_TRIAGE_PRESET: ProcessDefinition = {
  name: "Triaje Clínico de Urgencia (Modelo ESI)",
  description: "Proceso de evaluación clínica rápida para pacientes que acuden al Servicio de Urgencia, clasificando su nivel de gravedad y priorizando la atención médica.",
  scopeStart: "Ingreso del paciente al mesón de admisión del Servicio de Urgencia.",
  scopeEnd: "Paciente ingresado a box de reanimación o sala de espera con categorización asignada e inicio de tiempos máximos de espera (SLA).",
  responsibleRole: "Enfermero/a Categorizador/a de Urgencia",
  processOwner: "Dirección de Urgencia y Gestión de Camas",
  processInputs: "Cédula de identidad, registro de síntomas iniciales, signos vitales.",
  processOutputs: "Ficha clínica de urgencia categorizada (ESI-1 a ESI-5), brazalete asignado.",
  suppliers: "Pacientes espontáneos, servicios de ambulancias (SAMU/Privados), derivaciones consultorios de atención primaria.",
  customers: "Médicos clínicos de urgencia, Médicos de reanimación, Área de derivaciones y hospitalización.",
  risks: [
    "Subcategorización de un paciente con síntomas atípicos de infarto agudo al miocardio.",
    "Retraso en la evaluación inicial por alta congestión en sala de espera.",
    "Falta de comunicación de cambio de estado clínico (deterioro) del paciente en sala de espera."
  ],
  glossary: [
    { term: "ESI (Emergency Severity Index)", definition: "Algoritmo de triaje clínico de 5 niveles basado en la gravedad y cantidad de recursos requeridos." },
    { term: "Saturación de Oxígeno (SpO2)", definition: "Medida del porcentaje de oxígeno transportado por la hemoglobina en la sangre." },
    { term: "Box de Reanimación", definition: "Sala de urgencia equipada con soporte vital avanzado para atender pacientes críticos." }
  ],
  kpis: [
    {
      id: "kpi_triage_time",
      name: "Tiempo Puerta-Triaje",
      description: "Tiempo transcurrido desde que el paciente toca el mesón de admisión hasta que se completa su categorización por enfermería.",
      formula: "KPI = Promedio(FechaCategorizacion - FechaAdmision)",
      periodicity: "Daily",
      targetRange: "Satisfactorio <= 10 Minutos",
      otherRanges: "Insatisfactorio > 15 Minutos"
    },
    {
      id: "kpi_sla_compliance",
      name: "Cumplimiento de Tiempo de Espera (SLA)",
      description: "Porcentaje de pacientes atendidos por un médico dentro de los tiempos máximos definidos para su categoría de urgencia.",
      formula: "KPI = (PacientesAtendidosEnSLA / TotalPacientesAtendidos) * 100",
      periodicity: "Weekly",
      targetRange: "Satisfactorio >= 95%",
      otherRanges: "Insatisfactorio < 90%"
    },
    {
      id: "kpi_reclassification_rate",
      name: "Tasa de Reclasificación por Deterioro",
      description: "Pacientes que requirieron ser re-evaluados y subidos de categoría clínica mientras esperaban atención médica.",
      formula: "KPI = (PacientesReclasificadosHaciaArriba / TotalPacientesEnEspera) * 100",
      periodicity: "Monthly",
      targetRange: "Satisfactorio < 1%",
      otherRanges: "Insatisfactorio >= 3%"
    }
  ],
  subprocesses: [
    {
      index: "4.1",
      name: "Admisión e Ingreso Administrativo",
      narrative: "Apertura del episodio clínico de urgencia en el sistema hospitalario y registro inicial de datos demográficos del paciente.",
      sipoc: [
        {
          supplier: "Paciente / Acompañante / SAMU",
          inputs: "Documento de identidad, motivo de consulta verbal",
          subprocess: "Admisión Administrativa",
          outputs: "Ficha clínica digital abierta en estado Inicial",
          customer: "Enfermero/a Categorizador/a"
        }
      ],
      activities: [
        {
          index: "4.1.1",
          name: "Solicitar Documento e Identificar Paciente",
          description: "El administrativo de admisión solicita la cédula de identidad o pasaporte para verificar la identidad del paciente en el Registro Civil.",
          supportTech: "Módulo de Admisión HIS / Interfaz Registro Civil",
          infoInputs: "Llegada de paciente a mesón de admisión",
          result: "Identidad de paciente validada",
          rules: "Aplicar Ley de Derechos y Deberes del Paciente.",
          variants: "En caso de paciente no identificado (NN), utilizar protocolo de enrolamiento biométrico de emergencia."
        },
        {
          index: "4.1.2",
          name: "Registrar Admisión y Aperturar Episodio",
          description: "El personal de admisión registra los datos del paciente en la ficha clínica electrónica e ingresa el motivo de consulta principal.",
          supportTech: "Ficha Clínica Electrónica HIS Hospitalario",
          infoInputs: "Identidad de paciente validada",
          result: "Episodio de urgencia aperturado",
          rules: "Toda admisión debe vincularse a un folio de atención único de urgencia.",
          variants: "No tiene"
        },
        {
          index: "4.1.3",
          name: "Imprimir Brazalete e Identificador Físico",
          description: "Se imprime el brazalete de identificación con código de barras y se coloca en la muñeca del paciente para asegurar la trazabilidad clínica.",
          supportTech: "Impresora Térmica de Brazaletes Clínicos",
          infoInputs: "Episodio de urgencia aperturado",
          result: "Brazalete de trazabilidad colocado a paciente",
          rules: "Aplicar Estándar de Identificación Correcta del Paciente.",
          variants: "No tiene"
        }
      ]
    },
    {
      index: "4.2",
      name: "Evaluación Fisiológica y Categorización ESI",
      narrative: "Evaluación por enfermería de signos vitales, escala de dolor, antecedentes mórbidos y categorización final de gravedad.",
      sipoc: [
        {
          supplier: "Personal de Admisión / HIS",
          inputs: "Ficha clínica abierta en estado Inicial, paciente físico",
          subprocess: "Evaluación Fisiológica y Categorización ESI",
          outputs: "Paciente categorizado (Nivel ESI) y derivado a zona médica",
          customer: "Médico de Turno / Sala de espera"
        }
      ],
      activities: [
        {
          index: "4.2.1",
          name: "Controlar Signos Vitales de Paciente",
          description: "La enfermera de triaje mide y registra la frecuencia cardíaca, presión arterial, saturación de oxígeno, glicemia y temperatura en la ficha electrónica.",
          supportTech: "Ficha Clínica Electrónica HIS / Módulo de Triaje",
          infoInputs: "Brazalete de trazabilidad colocado a paciente",
          result: "Signos vitales registrados",
          rules: "Aplicar Criterios de Alerta Fisiológica Crítica.",
          variants: "En caso de inestabilidad hemodinámica extrema, trasladar directamente a Box de Reanimación (Ver Actividad 4.3.1)."
        },
        {
          index: "4.2.2",
          name: "Categorizar Gravedad de Paciente ESI",
          description: "La enfermera evalúa la necesidad de recursos y constantes vitales para asignar el nivel ESI del 1 al 5 en el sistema hospitalario.",
          supportTech: "Módulo de Categorización HIS con soporte ESI",
          infoInputs: "Signos vitales registrados",
          result: "ESI 1-2: Prioridad crítica asignada y derivación directa a Reanimación/Box / ESI 3-5: Prioridad no crítica asignada y derivación a Sala de Espera",
          rules: "Aplicar Manual del Algoritmo ESI Versión 4. Priorizar de acuerdo a parámetros fisiológicos y factores de riesgo.",
          variants: "No tiene"
        },
        {
          index: "4.2.3",
          name: "Generar Ficha de Prioridad de Atención",
          description: "Se valida el cierre de la categorización en el sistema y se emite la orden de espera activa en el tablero visual del Servicio de Urgencia.",
          supportTech: "Sistema de Control de Espera Urgencia HIS",
          infoInputs: "Categorización ESI asignada",
          result: "Orden de espera activa generada en tablero",
          rules: "No tiene",
          variants: "No tiene"
        }
      ]
    },
    {
      index: "4.3",
      name: "Distribución y Monitoreo de Pacientes",
      narrative: "Traslado del paciente a la zona que corresponda según su gravedad y gestión de alertas de permanencia.",
      sipoc: [
        {
          supplier: "Enfermera Categorizadora",
          inputs: "Paciente categorizado",
          subprocess: "Distribución y Monitoreo de Pacientes",
          outputs: "Paciente ingresado a consulta o monitoreado en sala",
          customer: "Personal Clínico de Box / Enfermería de Sala"
        }
      ],
      activities: [
        {
          index: "4.3.1",
          name: "Derivar Paciente a Zona de Atención",
          description: "Se deriva físicamente al paciente a box clínico o sala de espera según la categoría asignada, registrando la transferencia de custodia.",
          supportTech: "Sistema de Control de Flujo Urgencia HIS",
          infoInputs: "Orden de espera activa generada en tablero",
          result: "Conforme: Custodia clínica transferida a Box o Sala de Espera / No Conforme: Paciente retenido en triaje por reevaluación o saturación de capacidad",
          rules: "Aplicar Protocolo de Transferencia Segura de Custodia Clínica.",
          variants: "No tiene"
        },
        {
          index: "4.3.2",
          name: "Monitorear Tiempos de Espera en Sala",
          description: "El gestor de sala monitorea continuamente los tiempos transcurridos en sala de espera para detectar posibles vencimientos de SLA por nivel ESI.",
          supportTech: "Panel Visual de Monitoreo de Sala Urgencia",
          infoInputs: "Custodia clínica transferida",
          result: "Reporte de estado de sala actualizado",
          rules: "Aplicar Tiempos Máximos de Espera de Norma Técnica.",
          variants: "No tiene"
        },
        {
          index: "4.3.3",
          name: "Reevaluar Signos Vitales por Prolongación de Espera",
          description: "Si un paciente en sala de espera supera los 60 minutos (ESI 3), la enfermera realiza un nuevo control de signos vitales para descartar deterioro.",
          supportTech: "Módulo de Reevaluación de Triaje HIS",
          infoInputs: "Reporte de estado de sala actualizado",
          result: "Reevaluación clínica de espera registrada",
          rules: "Obligatorio en ESI 3 al cumplir 60 minutos.",
          variants: "Si hay deterioro de parámetros, reclasificar a nivel ESI superior."
        }
      ]
    }
  ],
  stateMachine: {
    states: ["Draft", "Pending_Triage", "Critical_Reanimacion", "Pending_Medical_Box", "Waiting_Room", "Discharged_Or_Hospitalized"],
    initialState: "Draft",
    transitions: [
      { from: "Draft", to: "Pending_Triage", action: "Confirmar registro administrativo inicial", role: "Personal de Admisión" },
      { from: "Pending_Triage", to: "Critical_Reanimacion", action: "Clasificación como ESI-1 (Peligro de vida)", role: "Enfermero/a Categorizador/a" },
      { from: "Pending_Triage", to: "Pending_Medical_Box", action: "Clasificación como ESI-2 (Gravedad alta)", role: "Enfermero/a Categorizador/a" },
      { from: "Pending_Triage", to: "Waiting_Room", action: "Clasificación como ESI-3, 4 o 5", role: "Enfermero/a Categorizador/a" },
      { from: "Waiting_Room", to: "Pending_Medical_Box", action: "Asignar box médico libre por orden de prioridad", role: "Gestor de Sala" },
      { from: "Waiting_Room", to: "Critical_Reanimacion", action: "Reclasificación urgente por deterioro clínico agudo", role: "Enfermero/a de Monitoreo" },
      { from: "Pending_Medical_Box", to: "Discharged_Or_Hospitalized", action: "Alta médica o indicación de hospitalización formal", role: "Médico de Turno" },
      { from: "Critical_Reanimacion", to: "Discharged_Or_Hospitalized", action: "Traslado a Pabellón / UCI tras estabilización", role: "Médico de Reanimación" }
    ],
    custodyTransfers: [
      { state: "Pending_Triage", fromRole: "Personal de Admisión", toRole: "Enfermero/a Categorizador/a", trigger: "Apertura de ficha HIS en sistema" },
      { state: "Critical_Reanimacion", fromRole: "Enfermero/a Categorizador/a", toRole: "Médico de Reanimación", trigger: "Ingreso físico a Box de Reanimación" },
      { state: "Pending_Medical_Box", fromRole: "Enfermero/a Categorizador/a", toRole: "Médico de Turno", trigger: "Asignación de box médico en HIS" }
    ],
    exceptions: [
      { triggerState: "Waiting_Room", targetState: "Critical_Reanimacion", handler: "Inmediata activación de Clave Azul (Código de paro) e ingreso a box 1." },
      { triggerState: "Pending_Medical_Box", targetState: "Waiting_Room", handler: "Retorno temporal a sala de espera si el paciente solicita salir a firmar consentimiento o baño, bajo monitoreo." }
    ],
    slaRules: [
      { state: "Pending_Triage", timeoutHours: 0.16, action: "Alerta en panel de urgencia por sobrepaso de 10 minutos para control de triaje." },
      { state: "Waiting_Room", timeoutHours: 1, action: "Obligatoriedad de control de signos vitales secundario para pacientes ESI-3 que lleven 60 minutos esperando." }
    ]
  }
};

export const PRESETS: Record<string, ProcessDefinition> = {
  blank: BLANK_PROCESS_PRESET,
  warehouse: WAREHOUSE_LOGISTICS_PRESET,
  clinical: CLINICAL_TRIAGE_PRESET
};

