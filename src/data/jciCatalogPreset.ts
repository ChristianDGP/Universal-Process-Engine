import { JCIStandard, JCICategory } from "../types";

export const OFFICIAL_JCI_CATEGORIES: JCICategory[] = [
  { code: "IPSG", name: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)" },
  { code: "ACC", name: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)" },
  { code: "AOP", name: "Evaluación de los Pacientes (Assessment of Patients)" },
  { code: "COP", name: "Atención de los Pacientes (Care of Patients)" },
  { code: "MMU", name: "Gestión y Uso de Medicamentos (Medication Management and Use)" },
  { code: "PFE", name: "Educación del Paciente y la Familia (Patient and Family Education)" },
  { code: "QPS", name: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)" },
  { code: "PCI", name: "Prevención y Control de Infecciones (Prevention and Control of Infections)" },
  { code: "GLD", name: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)" },
  { code: "FMS", name: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)" },
  { code: "SQE", name: "Calificaciones y Educación del Personal (Staff Qualifications and Education)" },
  { code: "MOI", name: "Gestión de la Información (Management of Information)" }
];

export const INITIAL_JCI_CATALOG: JCIStandard[] = [
  // METAS INTERNACIONALES (IPSG)
  {
    id: "IPSG.1",
    code: "IPSG.1",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Identificación Correcta de Pacientes",
    objective: "La organización desarrolla e implementa un proceso para mejorar la precisión en la identificación de pacientes mediante al menos dos identificadores únicos (ej. Nombre completo y Rut/Ficha).",
    measurableElements: [
      "Los pacientes son identificados utilizando dos identificadores únicos en todas las atenciones.",
      "Identificación previa a la administración de medicamentos, sangre o hemoderivados.",
      "Identificación previa a la toma de muestras de laboratorio e imágenes clínicas.",
      "Verificación de pulsera de identificación estandarizada al ingreso hospitalario."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.2",
    code: "IPSG.2",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Mejora de la Comunicación Efectiva",
    objective: "La organización desarrolla e implementa un proceso para mejorar la efectividad de la comunicación verbal y/o telefónica entre los profesionales de la salud (Escribir, Leer y Confirmar).",
    measurableElements: [
      "Aplicación del protocolo 'Escribir - Leer - Confirmar' para órdenes verbales o telefónicas.",
      "Verificación verbal y reporte estructurado de resultados de exámenes críticos.",
      "Uso de metodología estandarizada para el traspaso de información clínica (ej. SBAR / SAER) en entregas de turno."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.3",
    code: "IPSG.3",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Seguridad de Medicamentos de Alto Riesgo",
    objective: "La organización desarrolla e implementa un proceso para mejorar la seguridad en el manejo de medicamentos de alto riesgo, concentrados electrolíticos y fármacos de alerta máxima.",
    measurableElements: [
      "Identificación y etiquetado diferenciado de medicamentos de alto riesgo y Look-Alike / Sound-Alike (LASA).",
      "Almacenamiento restringido de electrolitos concentrados fuera de áreas clínicas generales.",
      "Doble chequeo independiente antes de la administración de fármacos de alto riesgo."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.4",
    code: "IPSG.4",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Cirugía y Procedimientos Seguros",
    objective: "Garantizar la realización de cirugías y procedimientos invasivos en el sitio correcto, con el procedimiento correcto y al paciente correcto.",
    measurableElements: [
      "Marcación del sitio quirúrgico por el cirujano responsable con participación del paciente.",
      "Verificación preoperatoria y Pausa de Seguridad (Time-Out) inmediatamente antes del inicio del procedimiento.",
      "Uso de la Lista de Chequeo Quirúrgico de la OMS estandarizada."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.5",
    code: "IPSG.5",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Infecciones (Higiene de Manos)",
    objective: "La organización adopta e implementa las pautas de higiene de manos de la OMS / CDC para reducir el riesgo de infecciones asociadas a la atención de salud (IAAS).",
    measurableElements: [
      "Cumplimiento de los 5 Momentos de la Higiene de Manos de la OMS en todas las unidades asistenciales.",
      "Disponibilidad de insumos de alcohol gel y lavamanos operativos en los puntos de atención.",
      "Monitoreo periódico de la adherencia a la higiene de manos por el equipo de IAAS."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.6",
    code: "IPSG.6",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Daño por Caídas",
    objective: "La organización desarrolla e implementa un proceso para evaluar y reevaluar el riesgo de caídas en todos los pacientes hospitalizados y aplicar medidas preventivas.",
    measurableElements: [
      "Evaluación inicial del riesgo de caídas mediante escala validada (ej. Morse / Downtown) al ingreso.",
      "Reevaluación continua ante cambios de condición clínica o traslados.",
      "Implementación de medidas de contención ambiental y barandas de seguridad elevadas."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },

  // ACCESO Y CONTINUIDAD (ACC)
  {
    id: "ACC.1",
    code: "ACC.1",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Admisión, Ingreso y Triaje Clínico",
    objective: "Proceso estandarizado para la evaluación de necesidades asistenciales, priorización de urgencias (Triaje) e ingreso de pacientes según capacidad resolutiva.",
    measurableElements: [
      "Criterios explícitos de admisión e ingreso a unidades generales y críticas.",
      "Evaluación del triaje estructurado (ESI / Manchester) en el servicio de urgencia.",
      "Información clara al paciente sobre costos, tratamientos proyectados y cobertura."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.2",
    code: "ACC.2",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Continuidad y Coordinación del Traslado de Pacientes",
    objective: "Garantizar la continuidad de la atención durante las transiciones asistenciales, traslados internos y derivaciones externas.",
    measurableElements: [
      "Formulario estandarizado de epicrisis y resumen de traslado clínico.",
      "Coordinación previa y confirmación de recepción en la unidad de destino.",
      "Acompañamiento por personal competente según nivel de complejidad clínica."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // EVALUACIÓN DE PACIENTES (AOP)
  {
    id: "AOP.1",
    code: "AOP.1",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Evaluación Inicial Médica y de Enfermería",
    objective: "Todos los pacientes reciben una evaluación médica y de enfermería integral y oportuna al ingreso hospitalario.",
    measurableElements: [
      "Evaluación de enfermería completada dentro de las primeras 24 horas de ingreso.",
      "Anamnesis y examen físico médico registrado oportunamente en la ficha clínica.",
      "Evaluación del dolor, estado nutricional y tamizaje de riesgo funcional."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // ATENCIÓN DE PACIENTES (COP)
  {
    id: "COP.1",
    code: "COP.1",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Plan de Atención Integrado e Individualizado",
    objective: "La atención de cada paciente es planificada y coordinada de forma multidisciplinaria mediante un plan de cuidados individualizado.",
    measurableElements: [
      "Plan de atención multidisciplinario documentado en la ficha clínica.",
      "Revisiones periódicas del plan de cuidados según evolución clínica.",
      "Coordinación activa entre médicos, enfermeros, kinesiologos y profesionales afines."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // GESTIÓN DE MEDICAMENTOS (MMU)
  {
    id: "MMU.4",
    code: "MMU.4",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Prescripción y Ordenamiento Médico Seguro",
    objective: "Las prescripciones médicas son legibles, completas, fechadas y registradas según estándares institucionales para prevenir errores de medicación.",
    measurableElements: [
      "Prescripción médica completa con dosis, vía, frecuencia y diagnóstico.",
      "Verificación de antecedentes de alergias a medicamentos antes de la primera dosis.",
      "Proceso de conciliación medicamentosa al ingreso, traslado y alta."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.6",
    code: "MMU.6",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Administración Segura de Medicamentos",
    objective: "Proceso seguro para la administración de medicamentos verificando los 5 Correctos (paciente, fármaco, dosis, vía y hora).",
    measurableElements: [
      "Verificación de los '5 Correctos' de la administración de fármacos.",
      "Registro inmediato de la administración o rechazo en la hoja de enfermería.",
      "Monitorización del paciente posterior a la administración de medicamentos críticos."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // PREVENCIÓN Y CONTROL DE INFECCIONES (PCI)
  {
    id: "PCI.5",
    code: "PCI.5",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Trazabilidad y Esterilización de Equipamiento Médico",
    objective: "Procesos estandarizados de limpieza, desinfección de alto nivel (DAN) y esterilización de instrumental e insumos de reuso.",
    measurableElements: [
      "Monitoreo y controles químicos/biológicos en cada ciclo de esterilización.",
      "Trazabilidad completa del instrumental desde la Central de Esterilización hasta el pabellón.",
      "Almacenamiento de material estéril en condiciones normadas de temperatura y humedad."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // GESTIÓN DE LA INFORMACIÓN (MOI)
  {
    id: "MOI.1",
    code: "MOI.1",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Integridad y Registro en la Ficha Clínica",
    objective: "La ficha clínica del paciente es única, legible, protegida en confidencialidad y completa en sus registros clínicos.",
    measurableElements: [
      "Acceso restringido y autenticación para visualización de fichas clínicas.",
      "Registro con fecha, hora, firma y timbre o identificación electrónica del profesional.",
      "Resguardo de datos sensibles conforme a regulaciones vigentes de derechos del paciente."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  }
];
