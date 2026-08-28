import { SIHSystem, SIHCategory } from "../types";

export const OFFICIAL_SIH_CATEGORIES: SIHCategory[] = [
  {
    code: "1.1",
    name: "Apoyo administrativo a la atención clínica e información al usuario",
  },
  {
    code: "1.2",
    name: "Atención Clínica",
  },
  {
    code: "1.3",
    name: "Apoyo al Diagnóstico y terapéutico",
  },
  {
    code: "1.4",
    name: "Apoyo Logístico",
  },
  {
    code: "1.5",
    name: "Apoyo Administrativo",
  },
  {
    code: "1.6",
    name: "Gestión de la Información",
  },
];

export const INITIAL_SIH_CATALOG: SIHSystem[] = [
  // =========================================================================
  // 1.1 Apoyo administrativo a la atención clínica e información al usuario
  // =========================================================================
  {
    id: "SIH-1.1.1",
    code: "1.1.1",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Maestro de pacientes",
    objective: "Administrar el Kardex electrónico de pacientes, usuarios del sistema de salud, manteniendo actualizado los datos demográficos y evitando la duplicación de registros. Siendo el único maestro oficial de pacientes de la institución.",
    supportStatus: "SOPORTADO",
    providerVendor: "SIDRA / Maestro Paciente Central",
    features: [
      "Registro de nuevos pacientes y sus datos demográficos: Cédula de identidad, número de pasaporte, nombres, apellidos, fotografía.",
      "Registros de direcciones, teléfonos y otros datos del paciente.",
      "Registro de medio de contacto preferente (Teléfonos, casilla electrónica).",
      "Registro del nombre social cuando corresponda.",
      "Algoritmo de comprobación del dígito verificador y lectura de cédula.",
      "Registro de condición de paciente preferente (mayores, discapacidad, cuidadores).",
      "Registro de paciente PRAIS.",
      "Registro de recién nacidos asociados al RUT de la madre con distintivo de nacimientos múltiples.",
      "Registro de pacientes no identificados (NN + Correlativo) y extranjeros con DNI/Pasaporte (Norma Técnica 820).",
      "Algoritmo de búsqueda de posibles registros duplicados y unificación/reversión de registros.",
      "Consultas del maestro e informes de gestión."
    ],
    integrations: [
      "Interoperabilidad con todos los sistemas del hospital para actualización centralizada.",
      "Referencias y Contrarreferencias.",
      "Integración con FONASA (certificación previsional, validación PRAIS, datos de contacto).",
      "Integración con Registro Civil (Nacimientos, defunciones, vigencia de cédula).",
      "Integración con Maestro Paciente del Servicio de Salud (SSMSO)."
    ],
    legalConsiderations: "Norma Técnica 820 (Estándares de Información de Salud, DEIS 2023) - Norma Técnica 820-0231-Año 2023."
  },
  {
    id: "SIH-1.1.2",
    code: "1.1.2",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Referencias y Contrarreferencias",
    objective: "Interoperar con la red las Referencias y Contrarreferencias (GES y NoGES), asegurando la pertinencia administrativa, completitud y calidad de los datos.",
    supportStatus: "SOPORTADO",
    providerVendor: "Plataforma de Referencia SSMSO",
    features: [
      "Recibir referencias GES y NoGES desde la red destinadas al Hospital (Poder Judicial, SENAME, otros Servicios de Salud).",
      "Recepción mediante capa de integración SSMSO o registro de referencias en papel/correo.",
      "Revisión de pertinencia administrativa y rechazo automático ante datos incompletos o erróneos.",
      "Alta de pacientes nuevos en el Maestro de Pacientes provenientes de la referencia recibida.",
      "Actualización de datos de contacto de pacientes existentes.",
      "Envío de referencias y contrarreferencias emitidas por el hospital a otros establecimientos según mapa de derivación.",
      "Consultas e informes de gestión."
    ],
    integrations: [
      "Maestro de Pacientes.",
      "Sistemas de los establecimientos de la RED del SSMSO.",
      "Bus de integración / Middleware regional."
    ],
    legalConsiderations: "Protocolo de interoperabilidad Referencia y Contrarreferencia SSMSO, Norma Técnica 820 DEIS 2023, Norma Técnica 118 MINSAL 2017."
  },
  {
    id: "SIH-1.1.3",
    code: "1.1.3",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Gestión de la demanda",
    objective: "Administrar las solicitudes de interconsultas y derivaciones GES y NoGES. Gestionar la pertinencia clínica, listas de espera, priorización y trazabilidad desde el ingreso hasta el egreso.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Sistema de Lista de Espera / SIDRA",
    features: [
      "Recibir referencias GES y NoGES desde el sistema de referencia y contrarreferencia y ficha clínica.",
      "Evaluación del coordinador de la especialidad sobre pertinencia clínica de la derivación.",
      "Devolución o rechazo por falta de pertinencia administrativa o clínica.",
      "Clasificación por criterio biomédico (gravedad, urgencia, inestabilidad hemodinámica, CIE-10).",
      "Priorización mediante algoritmos definidos por legislación vigente.",
      "Gestión de lista de espera con egreso administrativo por inasistencia o fallecimiento.",
      "Integración con citación de pacientes y orquestación de atenciones.",
      "Emisión de contrarreferencias de egreso clínico."
    ],
    integrations: [
      "Maestro de pacientes.",
      "Agenda y cita de atención ambulatoria.",
      "Urgencia, Hospitalización y Hospitalización domiciliaria.",
      "Sistemas diagnósticos (Laboratorio, RIS/PACS, Anatomía Patológica).",
      "Listas de espera MINSAL."
    ],
    legalConsiderations: "Norma Técnica 820 DEIS 2023, Norma Técnica 118 MINSAL 2017 (Registro de Listas de Espera)."
  },
  {
    id: "SIH-1.1.4",
    code: "1.1.4",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "GES (Garantías Explícitas en Salud)",
    objective: "Configuración, gestión y control de las Garantías Explícitas en Salud (GES/AUGE) para garantizar acceso, calidad, oportunidad y protección financiera.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema de Control GES AUGE",
    features: [
      "Configuración de enfermedades según diagnóstico GES (CIE-10), grado, decreto y tipo de garantía.",
      "Configuración de etapas, prestaciones trazadoras, plazos y canasta de medicamentos.",
      "Ingreso y egreso de pacientes GES con registro de fechas y documentos.",
      "Actualización de estados (Atención vigente, pendiente, atendida, vencida) y etapas (sospecha, confirmación, tratamiento, seguimiento).",
      "Emisión de cartas de notificación e Informes de Proceso Diagnóstico (IPD).",
      "Planillas de producción para entidades controladoras (FONASA/Superintendencia)."
    ],
    integrations: [
      "Ficha Clínica Electrónica.",
      "Maestro de Pacientes.",
      "Sistema de Citación y Admisión."
    ],
    legalConsiderations: "Ley 19.966 de Garantías Explícitas en Salud (GES/AUGE)."
  },
  {
    id: "SIH-1.1.5",
    code: "1.1.5",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Agenda y citas",
    objective: "Gestionar las agendas de los recursos críticos y lugares/salas para coordinar la atención presencial y teleconsulta de pacientes.",
    supportStatus: "SOPORTADO",
    providerVendor: "Agendamiento Ambulatorio / CDT",
    features: [
      "Programación de agendas de profesionales, salas, equipos y tipos de cupo (nuevo, control, receta, exámenes).",
      "Diferenciación de agendas presenciales y teleconsulta, convenio institucional y no institucional.",
      "Asociación de prestaciones e insumos por defecto cargados a la cuenta al confirmar atención.",
      "Gestión de box de atención y estados (habilitado, bloqueado, ubicación).",
      "Apertura automática de agenda por N meses y adición de sobrecupos / cupos abreviados.",
      "Suspensión total/parcial de agendas y lista de reasignación.",
      "Citación con prioridad GES desde listas de espera SSMSO.",
      "Integración para teleconsulta (Google Meet, videollamada) con envío automático de enlace por correo.",
      "Llamado a pacientes con integración a voz/pantallas y módulo Call Center."
    ],
    integrations: [
      "Maestro de Pacientes.",
      "Referencia y Contrarreferencia.",
      "Ficha Clínica.",
      "Motor SIDRA, FONASA y Call Center."
    ],
    legalConsiderations: "Reglamento de citaciones y agendas MINSAL."
  },
  {
    id: "SIH-1.1.6",
    code: "1.1.6",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Admisión ambulatoria",
    objective: "Admisión, recepción de pacientes y gestión de filas en tótems y salas de espera para Admisión, Recaudación, Farmacia, Toma de Muestras e Imágenes.",
    supportStatus: "SOPORTADO",
    providerVendor: "Totems / Gestión de Filas Q-Flow",
    features: [
      "Aviso de llegada en tótem de autoatención el día de la cita.",
      "Obtención de número de atención en tótem respetando ley de paciente preferente.",
      "Manejo de colas de prioridad y re-llamado por inasistencia.",
      "Despliegue de llamados en monitores de sala de espera y voceo con soporte para discapacidad auditiva/visual.",
      "Alertas al paciente sobre actividades pendientes (exámenes por tomar, remedios vencidos).",
      "Emisión de brazalete de identificación."
    ],
    integrations: [
      "Registro Civil / Maestro de Pacientes.",
      "Sistemas de Admisión y Recaudación."
    ],
    legalConsiderations: "Ley 20.584 de Derechos y Deberes del Paciente, Ley de Atención Preferente."
  },
  {
    id: "SIH-1.1.7",
    code: "1.1.7",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Gestión de Urgencia",
    objective: "Gestionar la atención de urgencia (Maternal, Adulto, Pediátrica y Dental) desde el Triage inicial, priorización y ubicación en box hasta el alta o derivación.",
    supportStatus: "SOPORTADO",
    providerVendor: "Ficha Clínica de Urgencia (FCU)",
    features: [
      "Triage y categorización de urgencia según motivo de consulta y signos vitales.",
      "Asignación de identificador transitorio NN para no identificados y posterior unificación.",
      "Alertas por tiempos de espera excedidos en sala de espera.",
      "Mapa visual de salas/box de la urgencia con códigos de colores sobre estado del paciente.",
      "Llamado a pantallas de sala de espera.",
      "Registro de accidentes del trabajo, tránsito (parte judicial, aseguradora).",
      "Emisión de brazalete y lectura de código de barras.",
      "Egreso del paciente (Alta clínica, administrativa, derivación a hospitalización/CESFAM)."
    ],
    integrations: [
      "Maestro de pacientes.",
      "Referencia y Contrarreferencia.",
      "Hospitalizados, Ficha Clínica, Laboratorio, RIS/PACS, Farmacia, Cuenta de Pacientes."
    ],
    legalConsiderations: "Ley de Urgencia (Ley 19.650), Ley 20.584."
  },
  {
    id: "SIH-1.1.8",
    code: "1.1.8",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Prequirúrgico",
    objective: "Gestionar el proceso prequirúrgico del paciente con indicación de cirugía, pronóstico de fecha de intervención y control de requisitos.",
    supportStatus: "BRECHA",
    providerVendor: "Sistema Prequirúrgico / Pabellones",
    features: [
      "Consulta y priorización de lista de espera quirúrgica No GES (SIGTE).",
      "Actualización de salidas de lista quirúrgica (intervenciones realizadas, renuncias).",
      "Gestión de consentimiento informado, pase anestésico y pronóstico de fecha.",
      "Formulario de solicitud de cama para hospitalización por intervención quirúrgica.",
      "Gestión del preingreso: contacto, control de requisitos clínicos y administrativos."
    ],
    integrations: [
      "Maestro de pacientes, Ficha Clínica, Pabellones Quirúrgicos, UGCC MINSAL."
    ],
    legalConsiderations: "Normativa SIGTE MINSAL."
  },
  {
    id: "SIH-1.1.9",
    code: "1.1.9",
    area: "Apoyo administrativo a la atención clínica e información al usuario",
    name: "Gestión de camas",
    objective: "Gestionar el recurso cama del hospital durante todo el ciclo de hospitalización (ingreso, traslados, altas) bajo un modelo de gestión de camas indiferenciado.",
    supportStatus: "SOPORTADO",
    providerVendor: "Gestión de Camas Hospitalarias",
    features: [
      "Mapa visual de camas por piso y sector con estados (disponible, reservada, reparación, bloqueada, aislamiento).",
      "Orden de hospitalización y solicitudes de traslado entre unidades.",
      "Habilitación de cunas virtuales (1 a N) asociadas a una cama para recién nacidos sanos.",
      "Movimiento de pacientes, trazabilidad y censo diario.",
      "Alertas de sospecha de alta, cama liberada y estado de aseo.",
      "Sugerencias automatizadas de derivación a hospitalización domiciliaria."
    ],
    integrations: [
      "Maestro de Pacientes, Ficha Clínica, UGCC DIGERA MINSAL, Ley de Urgencia."
    ],
    legalConsiderations: "Norma UGCC MINSAL."
  },

  // =========================================================================
  // 1.2 Atención Clínica
  // =========================================================================
  {
    id: "SIH-1.2.1",
    code: "1.2.1",
    area: "Atención Clínica",
    name: "Ficha Clínica electrónica",
    objective: "Sistema de información para llevar el historial clínico único del paciente basado en episodios y encuentros. Permite registrar anamnesis, diagnósticos, evoluciones, prescripciones y solicitudes con CDSS.",
    supportStatus: "SOPORTADO",
    providerVendor: "Ficha Clínica Electrónica Institucional",
    features: [
      "Historia clínica única e íntegra accesible vía WEB.",
      "Firma digital simple y avanzada para profesionales de salud.",
      "Lectura de brazaletes con código de barras, biometría o RFID.",
      "Configuración de formularios estructurados por especialidad (evitando texto libre).",
      "Codificación clínica estandarizada: CIE-10, SNOMED-CT, CIF.",
      "Registro de constantes vitales con visualización gráfica evolutiva.",
      "Alertas de enfermedades GES y notificación obligatoria.",
      "Indicación de exámenes, medicamentos, dietas e interconsultas.",
      "Soporte de decisiones clínicas (CDSS) para prescripción segura."
    ],
    integrations: [
      "Maestro de pacientes, Laboratorio, RIS/PACS, Anatomía Patológica, Farmacia, Pabellones, UGCC, Registro Nacional de Vacunas."
    ],
    legalConsiderations: "Ley 19.628 de Protección de Datos Personales, Ley 20.584 de Derechos y Deberes del Paciente."
  },
  {
    id: "SIH-1.2.2",
    code: "1.2.2",
    area: "Atención Clínica",
    name: "Ficha Clínica Dental",
    objective: "Herramienta digital electrónica para facilitar la atención dental del paciente con odontograma interactivo, presupuestos e historial especializado.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Ficha Dental Digital",
    features: [
      "Odontograma y periodontograma gráfico interactivo.",
      "Formularios parametrizables por especialidades odontológicas (Endodoncia, Ortodoncia, Cirugía Bucal, Maxilofacial).",
      "Elaboración de presupuestos y plan de tratamientos (antes y después).",
      "Integración con FCE para prescripción y administración de fármacos."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Maestro de Pacientes, Agendas, RIS/PACS."
    ],
    legalConsiderations: "Ley 19.628, Ley 20.584."
  },
  {
    id: "SIH-1.2.3",
    code: "1.2.3",
    area: "Atención Clínica",
    name: "Cuidado de pacientes y estación de enfermería",
    objective: "Gestión de las actividades programadas de enfermería, Planes de Cuidados de Enfermería (PAE) basados en NANDA, NIC, NOC y cotejo de administración.",
    supportStatus: "SOPORTADO",
    providerVendor: "Estación de Enfermería FCE",
    features: [
      "Proceso de Atención de Enfermería (PAE) con taxonomías NANDA, NIC, NOC.",
      "Valoración de riesgo / dependencia y asignación de horarios/frecuencias.",
      "Alertas de tareas de enfermería atrasadas o desviaciones en plan de cuidados.",
      "Lista de cotejo de actividades planificadas y administración de medicamentos."
    ],
    integrations: [
      "Maestro de pacientes, Ficha Clínica, Farmacia, Laboratorio, Llamado de Enfermería."
    ],
    legalConsiderations: "Ley 20.584."
  },
  {
    id: "SIH-1.2.4",
    code: "1.2.4",
    area: "Atención Clínica",
    name: "Monitoreo centralizado del plan de tratamiento y cuidado de pacientes",
    objective: "Supervisar y controlar parámetros, signos vitales y actividades de tratamiento de pacientes ambulatorios e in situ integrados a la FCE y App móvil.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Central de Monitoreo Clínico",
    features: [
      "Captura de datos de síntomas (dolor, fiebre) y signos vitales (presión, temperatura) desde App móvil o monitores.",
      "Algoritmos automatizados para detección de no adherencia al tratamiento y riesgos vitales."
    ],
    integrations: [
      "Ficha Clínica Electrónica, App Mi Hospital, Maestro de Pacientes."
    ]
  },
  {
    id: "SIH-1.2.5",
    code: "1.2.5",
    area: "Atención Clínica",
    name: "Soporte de Decisiones Clínicas (CDSS)",
    objective: "Proveer mejores prácticas y guías clínicas basadas en evidencia para disminuir errores en prescripción de medicamentos y reacciones adversas.",
    supportStatus: "BRECHA",
    providerVendor: "Engine CDSS / Vademécum Interactivo",
    features: [
      "Verificación automática de interacciones medicamentosas peligrosas.",
      "Alertas por alergias, duplicidades de terapia y contraindicaciones al prescribir.",
      "Adhesión a guías clínicas institucionales y bases de conocimientos médicos."
    ],
    integrations: [
      "Ficha Clínica, Farmacia, Laboratorio."
    ]
  },

  // =========================================================================
  // 1.3 Apoyo al Diagnóstico y terapéutico
  // =========================================================================
  {
    id: "SIH-1.3.1",
    code: "1.3.1",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Laboratorio Clínico (LIS)",
    objective: "Gestionar los recursos del laboratorio clínico y la trazabilidad de muestras desde la solicitud, toma de muestras con código de barras, analizadores automatizados hasta la publicación de resultados.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema LIS de Laboratorio",
    features: [
      "Solicitud de exámenes desde FCE y emisión de etiquetas de código de barras.",
      "Trazabilidad de muestra con fecha, hora, actor y estado (tomada, recibida, procesada).",
      "Integración bidireccional con analizadores automatizados de muestras.",
      "Aprobación automática de resultados dentro de parámetros preconfigurados.",
      "Publicación de informes de resultados firmados en portal Web/PDF para el paciente y médico."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Maestro de Pacientes, Analizadores automatizados, Portal del Paciente."
    ]
  },
  {
    id: "SIH-1.3.2",
    code: "1.3.2",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "RIS / PACS",
    objective: "Gestionar exámenes de imágenes médicas (Rayos X, TAC, Resonancia, Ecografía), integración DICOM con equipos de imágenes, informes con dictado por voz y visor Web.",
    supportStatus: "SOPORTADO",
    providerVendor: "RIS / PACS Institucional",
    features: [
      "Agendamiento de equipos e integración bidireccional DICOM con modales de imágenes.",
      "Almacenamiento centralizado PACS de estudios de imagen.",
      "Ambiente de informes con plantillas y transcripción de voz a texto.",
      "Visor de imágenes DICOM web para médicos clínicos y descarga del paciente."
    ],
    integrations: [
      "Ficha Clínica, Agendas, Equipos de Imágenes DICOM, Portal Web."
    ]
  },
  {
    id: "SIH-1.3.3",
    code: "1.3.3",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Exámenes de especialidades",
    objective: "Gestionar exámenes de especialidades (Electrocardiograma, Holter, Espirometría, Endoscopia, Ecografía) desde agendamiento hasta la entrega de informe con imágenes.",
    supportStatus: "SOPORTADO",
    providerVendor: "Módulo de Exámenes de Especialidad",
    features: [
      "Agendamiento de equipos de especialidad (Holter, EKG, EEG, Endoscopia).",
      "Captura y adjunto de imágenes/gráficos al informe final.",
      "Consulta de histórico de exámenes por paciente."
    ],
    integrations: ["Ficha Clínica, Agendas, Equipos Médicos."]
  },
  {
    id: "SIH-1.3.4",
    code: "1.3.4",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Anatomía Patológica",
    objective: "Gestionar el laboratorio de Anatomía Patológica, trazabilidad de muestras (biopsias, citologías), procesamiento de bloques/casetes/láminas, reconocimiento de voz e informes.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Sistema de Anatomía Patológica (AP)",
    features: [
      "Identificación unívoca con etiqueta de código QR de muestras, casetes y láminas.",
      "Impresión de etiquetas directamente en rotuladores de bloques y láminas.",
      "Dictado por voz para patólogos en macroscopía y microscopía.",
      "Integración con inmunoteñidores automáticos y captura de fotos microscópicas.",
      "Gestión de archivo físico de tacos y placas de biopsias."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Pabellones Quirúrgicos, Maestro de Pacientes."
    ]
  },
  {
    id: "SIH-1.3.5",
    code: "1.3.5",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Alimentación y Nutrición",
    objective: "Gestionar la alimentación y nutrición de pacientes, integración entre indicación clínica y unidades productivas (UCP, SEDILE, CEFE, Lactario) y trazabilidad de raciones.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema de Gestión Nutricional",
    features: [
      "Cribaje y valoración nutricional de pacientes.",
      "Prescripción de regímenes básicos, especiales, fórmulas enterales y lácteas.",
      "Cálculo automático de producción de raciones para la UCP / SEDILE.",
      "Etiquetado con código QR para carros de distribución de raciones.",
      "Registro de ingesta y alergias alimentarias en Ficha Clínica."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Módulo de Camas, Sistema de Concesionario de Alimentos."
    ]
  },
  {
    id: "SIH-1.3.6",
    code: "1.3.6",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Farmacia",
    objective: "Gestionar el arsenal farmacológico, preparación, dispensación por dosis unitaria en farmacia ambulatoria, hospitalizados y urgencia, con alertas de seguridad clínica.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema de Farmacia y Dosis Unitaria",
    features: [
      "Gestión del arsenal farmacológico e integración con prescripción electrónica FCE.",
      "Fraccionamiento, re-envasado y etiquetado con código de barras.",
      "Dispensación por dosis unitaria para pacientes hospitalizados.",
      "Validación de dosis máximas, alergias y RAMs en tiempo real.",
      "Integración con carruseles horizontales/verticales (Pyxis/Omnicell).",
      "Receta médica electrónica y libro de controlados ISP."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Bodega de Abastecimiento, Carruseles de Dispensación, FONASA."
    ]
  },
  {
    id: "SIH-1.3.7",
    code: "1.3.7",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Medicina Física y Rehabilitación",
    objective: "Gestionar el proceso de rehabilitación funcional y kinesiología, asignación de protocolos de fisioterapia y cuantificación del desempeño.",
    supportStatus: "SOPORTADO",
    providerVendor: "Módulo Kinesiología / Rehabilitación",
    features: [
      "Listas de trabajo kinesiológico recibidas desde la prescripción médica FCE.",
      "Asignación de protocolos de fisioterapia y registro de sesiones ejecutadas.",
      "Evaluación de calidad y satisfacción del paciente."
    ],
    integrations: ["Ficha Clínica, Agendas, Maestro de Pacientes."]
  },
  {
    id: "SIH-1.3.8",
    code: "1.3.8",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Diálisis",
    objective: "Gestionar el tratamiento dialítico (hemediálisis, diálisis peritoneal) para pacientes agudos y crónicos, control de peso, accesos vasculares y trasplante renal.",
    supportStatus: "SOPORTADO",
    providerVendor: "Módulo Diálisis Hospitalaria",
    features: [
      "Programación de sesiones de hemodiálisis y diálisis peritoneal.",
      "Registro de parámetros pre/post diálisis (pesos, ultrafiltración, signos vitales).",
      "Seguimiento de lista de espera de trasplante renal."
    ],
    integrations: ["Ficha Clínica, Laboratorio, Maestro de Pacientes."]
  },
  {
    id: "SIH-1.3.9",
    code: "1.3.9",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Pabellones Quirúrgicos",
    objective: "Gestionar salas de cirugía, programación de tabla quirúrgica, pausa de cirugía segura, protocolo anestésico/operatorio e integración con máquinas de anestesia.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema Pabellón Quirúrgico",
    features: [
      "Programación de salas de operaciones por especialidades y tipo de cirugía.",
      "Registro de Pausa de Cirugía Segura (Checklist de Seguridad del Paciente).",
      "Protocolo operatorio e informe de anestesia con gráfico de constantes vitales.",
      "Relojes de control de tiempos (tiempo de isquemia, paro cardiorrespiratorio).",
      "Integración con máquinas de anestesia y monitores."
    ],
    integrations: [
      "Ficha Clínica, Esterilización, Farmacia, Bodega de Insumos, SIGTE."
    ],
    legalConsiderations: "Norma Técnica 118 MINSAL de Listas de Espera Quirúrgicas."
  },
  {
    id: "SIH-1.3.10",
    code: "1.3.10",
    area: "Apoyo al Diagnóstico y terapéutico",
    name: "Unidad de Medicina Transfusional (UMT)",
    objective: "Gestionar componentes sanguíneos, pruebas de compatibilidad pretransfusional, despacho, administración de transfusiones y hemovigilancia activa.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema UMT / Banco de Sangre",
    features: [
      "Control de stock de hemocomponentes por grupo sanguíneo y factor Rh.",
      "Pruebas de compatibilidad e inmunohematología pretransfusional.",
      "Alertas de incompatibilidad sanguínea antes del despacho.",
      "Registro de la transfusión a pie de cama y hemovigilancia de reacciones adversas.",
      "Seroteca de muestras de pacientes transfundidos."
    ],
    integrations: [
      "Ficha Clínica Electrónica, Centro de Sangre Regional, Laboratorio."
    ]
  },

  // =========================================================================
  // 1.4 Apoyo Logístico
  // =========================================================================
  {
    id: "SIH-1.4.1",
    code: "1.4.1",
    area: "Apoyo Logístico",
    name: "Esterilización",
    objective: "Gestionar la provisión de esterilización de instrumental y cajas quirúrgicas, trazabilidad por lote/código hasta el paciente en quirófano.",
    supportStatus: "SOPORTADO",
    providerVendor: "Trazabilidad Central de Esterilización",
    features: [
      "Recepción y lavado de instrumental propio y de proveedores externos.",
      "Trazabilidad por código de barras / matricial de cajas quirúrgicas.",
      "Integración con autoclaves, lavadoras ultrasónicas y peróxido.",
      "Validación digital de controles químicos, biológicos y físicos.",
      "Despacho en carros para pabellones quirúrgicos."
    ],
    integrations: ["Pabellones Quirúrgicos, Ficha Clínica, Dental."]
  },
  {
    id: "SIH-1.4.2",
    code: "1.4.2",
    area: "Apoyo Logístico",
    name: "Ropería y vestuario",
    objective: "Gestionar prendas reutilizables, ropa de cama y uniformes de personal mediante chips de lectura RFID y dispensadores automatizados.",
    supportStatus: "REQUERIDO",
    providerVendor: "Control RFID Ropería",
    features: [
      "Lectura masiva de prendas mediante chip RFID en entradas/salidas de lavandería.",
      "Dispensadores automatizados de uniformes para funcionarios.",
      "Control de inventario de ropa de cama por bodegas clínicas."
    ],
    integrations: ["Gestión de Personas, Bodegas, Ficha Clínica."]
  },
  {
    id: "SIH-1.4.3",
    code: "1.4.3",
    area: "Apoyo Logístico",
    name: "Gestor de Flota",
    objective: "Administrar servicios de traslado de pacientes y funcionarios (hospitalización domiciliaria, entrega de medicamentos) en vehículos con seguimiento GPS.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Gestión de Flota / GPS Móviles",
    features: [
      "Monitoreo GPS en tiempo real de ambulancias y vehículos en terreno.",
      "Asignación de choferes, turnos y gestión de rutas.",
      "Workflow de solicitudes de traslado desde Ficha Clínica."
    ],
    integrations: ["Hospitalización Domiciliaria, UGCC, Mesa de Ayuda."]
  },
  {
    id: "SIH-1.4.4",
    code: "1.4.4",
    area: "Apoyo Logístico",
    name: "Traslados de pacientes",
    objective: "Gestionar y coordinar los traslados de pacientes y equipamiento, tanto inter-hospitalario como al interior de las dependencias del hospital, disponiendo de agendas de solicitudes, flujos de trabajo (workflow), administración gráfica de flota de dispositivos (camillas, sillas de ruedas, carritos), control de estados, trazabilidad de tiempos, origen y destino, requerimientos especiales e informes históricos.",
    supportStatus: "SOPORTADO",
    providerVendor: "Gestor de Flota y traslados de pacientes",
    features: [
      "Disponer de una agenda para ingresar las solicitudes de traslado de pacientes, así como la administración de los mismos.",
      "La solicitud de traslado debe al menos considerar área organizacional del solicitante, día, hora o rango de horas, lugar de retiro del paciente, área organizacional o lugar de traslado, contacto para retirar paciente, contacto que recibe a paciente, nombre del paciente entre otros datos.",
      "Capacidad de manejar flujos de trabajo (workflow) de ingreso de solicitudes y aprobaciones de traslado.",
      "Permitir la obtención de informes y consultas de traslados vigentes e históricos.",
      "Capacidad de manejar flota de dispositivos (camillas de traslado, sillas de rueda, carritos eléctricos, otros) para traslados al interior de las dependencias del mismo hospital.",
      "Capacidad gráfica de administración inter-hospitalario de dispositivos de traslados (sillas y otros).",
      "Estado de las camillas de traslado, sillas de ruedas (en uso, disponibles, en mantención, de baja).",
      "Capacidad de manejar flujos de trabajo (workflow) de ingreso de solicitudes y aprobaciones de traslado interno.",
      "Disponer de una agenda para ingresar las solicitudes pendientes de traslado de pacientes, así como la administración de los mismos.",
      "La solicitud de traslado debe al menos considerar área organizacional del solicitante, día, hora o rango de horas, lugar de retiro del paciente, área organizacional o lugar de traslado, contacto para retirar paciente, contacto que recibe a paciente, nombre del paciente entre otros datos, aislamiento, dispositivo con cual trasladar.",
      "Fuerte relación con las funcionalidades de mantenimiento y activo fijo (podría haber traslados de equipos de monitoreo y otros).",
      "Permitir la obtención de informes y consultas de traslados vigentes e históricos.",
      "Traslados de muestras a laboratorio, anatomía patológica.",
      "Registro de inicio y término del traslado (de pacientes, de equipos, insumos, muestras)."
    ],
    integrations: [
      "Atención Ambulatoria y Agenda",
      "Atención Hospitalizados",
      "Atención de urgencias",
      "Ficha Clínica electrónica",
      "Gestión de camas",
      "Pabellones Quirúrgicos",
      "Gestión de fallecidos"
    ]
  },
  {
    id: "SIH-1.4.5",
    code: "1.4.5",
    area: "Apoyo Logístico",
    name: "Gestión de fallecidos",
    objective: "Gestionar la trazabilidad del paciente fallecido desde la constatación médica, traslado a morgue, ubicación en cámara y entrega a familiares o SML.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema de Custodia y Fallecidos",
    features: [
      "Generación de solicitud de traslado a morgue con correlativo único.",
      "Alertas de bioseguridad por fallecimiento a causa de enfermedades infecciosas.",
      "Emisión de brazalete y etiquetas para el fallecido.",
      "Registro de entrega a familiar/tutor o Servicio Médico Legal (SML)."
    ],
    integrations: ["Ficha Clínica, Anatomía Patológica, Registro Civil."]
  },

  // =========================================================================
  // 1.5 Apoyo Administrativo
  // =========================================================================
  {
    id: "SIH-1.5.1",
    code: "1.5.1",
    area: "Apoyo Administrativo",
    name: "Prestaciones y Convenios",
    objective: "Gestionar aranceles, prestaciones, convenio con aseguradoras (FONASA, ISAPRE, CAPREDENA) y leyes especiales (Ley de Urgencia, PRAIS, Accidentes del Trabajo).",
    supportStatus: "SOPORTADO",
    providerVendor: "Aranceles y Convenios ERP",
    features: [
      "Arancel FONASA grupos/subgrupos y homologación con prestaciones del hospital.",
      "Listas de precios para Modalidad Libre Elección (MLE) y Atención Institucional (MAI).",
      "Configuración de convenios y leyes especiales (Ley de Urgencia 19.650, Ley 16.774)."
    ],
    integrations: ["Cuentas de Pacientes, Recaudación, FONASA."]
  },
  {
    id: "SIH-1.5.2",
    code: "1.5.2",
    area: "Apoyo Administrativo",
    name: "Cuentas de pacientes",
    objective: "Centralizar y valorizar todas las atenciones, días cama, medicamentos e insumos cargados a la cuenta corriente del paciente previo al cierre financiero.",
    supportStatus: "SOPORTADO",
    providerVendor: "Cuenta Corriente de Pacientes",
    features: [
      "Apertura, pre-análisis y cierre de cuenta corriente paciente.",
      "Valorización automática según previsión, seguros y leyes aplicables.",
      "Reapertura de cuentas por cargos rezagados o revisión de objeciones."
    ],
    integrations: ["Admisión, Facturación, Cobranzas, Contabilidad."]
  },
  {
    id: "SIH-1.5.3",
    code: "1.5.3",
    area: "Apoyo Administrativo",
    name: "Gestor de documentos",
    objective: "Facilitar la recepción, creación, flujos de firma electrónica simple y avanzada (Firma.gob.cl) y preservación de documentos administrativos y resoluciones.",
    supportStatus: "SOPORTADO",
    providerVendor: "Gestor Documental Digital / Segpres",
    features: [
      "Workflow de aprobación y firmado digital de resoluciones y contratos.",
      "Integración con Firma.gob.cl para Firma Electrónica Avanzada.",
      "Biblioteca documental estructurada por organigrama con buscador de texto."
    ],
    integrations: ["Firma.gob.cl, ClaveÚnica, Gestión de Calidad."]
  },
  {
    id: "SIH-1.5.4",
    code: "1.5.4",
    area: "Apoyo Administrativo",
    name: "Mesa de ayuda, Soporte, Mantenimiento y Gestión de activos",
    objective: "Administración del activo fijo hospitalario (equipos médicos, TI, edificios), mantenimiento preventivo/correctivo y tickets de soporte técnico.",
    supportStatus: "SOPORTADO",
    providerVendor: "Mantenimiento & Mesa de Ayuda OT",
    features: [
      "Ficha de activo fijo con etiquetado de código de barras / QR.",
      "Programación de mantenimientos preventivos y órdenes de trabajo (OT).",
      "Generación de tickets de soporte técnico con ruteo automático por categoría.",
      "Generación de informes de depreciación y cálculo de vida útil."
    ],
    integrations: ["Abastecimiento, Contabilidad, Bodegas."]
  },
  {
    id: "SIH-1.5.5",
    code: "1.5.5",
    area: "Apoyo Administrativo",
    name: "Abastecimiento - Solicitudes y Gestión de compra",
    objective: "Gestionar el proceso de compras e interacciones con Mercado Público / ChileCompra y CENABAS desde la solicitud de pedido hasta la orden de compra.",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema de Compras ERP / Mercado Público",
    features: [
      "Solicitudes de pedido centralizadas y descentralizadas por centro de costo.",
      "Generación e integración de órdenes de compra con Mercado Público (ChileCompra).",
      "Gestión de planes de compra CENABAS.",
      "Workflow de autorizaciones con firma electrónica."
    ],
    integrations: ["Mercado Público, CENABAS, Presupuesto, Contabilidad, SIGFE."]
  },
  {
    id: "SIH-1.5.6",
    code: "1.5.6",
    area: "Apoyo Administrativo",
    name: "Abastecimiento - Gestión de bodegas, stock y distribución",
    objective: "Gestionar múltiples bodegas de insumos clínicos, fármacos, aseo y repuestos, puntos de reorden, FIFO/LIFO e integración con carruseles horizontales/verticales.",
    supportStatus: "SOPORTADO",
    providerVendor: "Gestión de Bodegas & Stockey",
    features: [
      "Administración de bodegas con jerarquías y ubicaciones fila/columna.",
      "Control de inventario por números de serie y lotes con fecha de vencimiento.",
      "Integración con carruseles de almacenamiento automatizado (Stockey).",
      "Puntos de reorden e inventario tipo FIFO / LIFO."
    ],
    integrations: ["Farmacia, Abastecimiento, Contabilidad, Carruseles."]
  },
  {
    id: "SIH-1.5.7",
    code: "1.5.7",
    area: "Apoyo Administrativo",
    name: "Gestión de Personas",
    objective: "Herramientas de reclutamiento, administración de contratos, control de asistencia por huella/reloj digital, pago de sueldos y capacitaciones.",
    supportStatus: "SOPORTADO",
    providerVendor: "SIRH / Gestión de Personas",
    features: [
      "Organigrama, cargos y personal permanente/reemplazo.",
      "Marcaje de asistencia digital (reloj digital, huella).",
      "Integración con el sistema SIRH del estado.",
      "Prevención de riesgos y carpetas de capacitación."
    ],
    integrations: ["SIRH, Contabilidad, Tesorería."]
  },
  {
    id: "SIH-1.5.8",
    code: "1.5.8",
    area: "Apoyo Administrativo",
    name: "Finanzas - Presupuesto",
    objective: "Facilitar la formulación y control presupuestario de recursos operacionales e inversión integrados con los sistemas del Estado (SIGFE).",
    supportStatus: "SOPORTADO",
    providerVendor: "Sistema Presupuestario / SIGFE",
    features: [
      "Control presupuestario por centro de costo e ítem de gasto.",
      "Integración automática con registros del sistema SIGFE.",
      "Emisión de Certificados de Disponibilidad Presupuestaria (CDP)."
    ],
    integrations: ["SIGFE, Contabilidad, Compras, Tesorería."]
  },
  {
    id: "SIH-1.5.9",
    code: "1.5.9",
    area: "Apoyo Administrativo",
    name: "Finanzas - Contabilidad",
    objective: "Registro de transacciones económicas y contables en cuentas de mayor, libros contables, balance de comprobación y reportes de auditoría.",
    supportStatus: "SOPORTADO",
    providerVendor: "ERP Contable / SIGFE 2",
    features: [
      "Libros de mayor, diario, asientos automáticos e integración con SIGFE 2.",
      "Conciliaciones bancarias y cuadratura de auxiliares."
    ],
    integrations: ["SIGFE 2, Tesorería, Cuentas por Cobrar, Facturación."]
  },
  {
    id: "SIH-1.5.10",
    code: "1.5.10",
    area: "Apoyo Administrativo",
    name: "Finanzas - Facturación",
    objective: "Administración y emisión de facturas electrónicas afectas, exentas y boletas tributarias integradas con el SII.",
    supportStatus: "SOPORTADO",
    providerVendor: "Facturación Electrónica ACEPTA / SII",
    features: [
      "Emisión de facturas electrónicas a pacientes y aseguradoras.",
      "Integración directa con el SII y proveedor ACEPTA."
    ],
    integrations: ["SII, ACEPTA, Cobranzas, Contabilidad."]
  },

  // =========================================================================
  // 1.6 Gestión de la Información
  // =========================================================================
  {
    id: "SIH-1.6.1",
    code: "1.6.1",
    area: "Gestión de la Información",
    name: "Control de Gestión",
    objective: "Herramienta que facilita planificar, monitorear y controlar la operación del hospital mediante indicadores estratégicos, fórmulas de cálculo, tableros de mando y generación de estadísticas de producción asistencial y presupuestaria.",
    supportStatus: "SOPORTADO",
    providerVendor: "Tablero de Control de Gestión",
    features: [
      "Definición y cálculo automático de indicadores clave de rendimiento (KPIs) hospitalarios.",
      "Definición de umbrales, metas y alertas tempranas por desviación de metas.",
      "Emisión y consolidación de Reportes Estadísticos Mensuales (REM) para el DEIS / MINSAL.",
      "Tableros de mando ejecutivos con segmentación por servicio clínico, unidad de apoyo y centro de costo.",
      "Monitoreo de ocupación de camas, estancia media, rotación y tasas de reingreso.",
      "Seguimiento de compromisos de gestión (COMGES) y convenios de desempeño institucional."
    ],
    integrations: ["SIRH, SIGFE, Data Warehouse, Ficha Clínica, Admisión y Egresos."],
    legalConsiderations: "Compromisos de Gestión (COMGES) MINSAL, Serie REM DEIS."
  },
  {
    id: "SIH-1.6.2",
    code: "1.6.2",
    area: "Gestión de la Información",
    name: "Gestión de Calidad y seguridad del paciente",
    objective: "Evaluar el cumplimiento de estándares de acreditación en salud, normas técnicas institucionales, monitorización de eventos adversos y verificación de habilitación profesional del personal asistencial.",
    supportStatus: "SOPORTADO",
    providerVendor: "Calidad & Acreditación Institucional",
    features: [
      "Seguimiento y auditoría continua de los estándares de acreditación de la Superintendencia de Salud (Manual de Estándares Generales de Acreditación).",
      "Registro, notificación y análisis causa-raíz de eventos adversos, incidentes sin daño y eventos centinela.",
      "Seguimiento de planes de mejora continua y acciones correctivas / preventivas.",
      "Verificación de requisitos académicos, títulos, especialidades y vigencia en el Registro Nacional de Prestadores Individuales (RNPI).",
      "Monitorización de pautas de cotejo de calidad clínica (ej. consentimientos informados, fichas clínicas, listas de chequeo).",
      "Gestión documental de protocolos, guías clínicas y procedimientos operativos estandarizados (POE)."
    ],
    integrations: ["Gestión de Personas, Ficha Clínica, Mesa de Ayuda, Registro de Incidencias."],
    legalConsiderations: "Ley 20.584 de Derechos y Deberes de los Pacientes, DFL N° 1/2005 y Reglamento de Acreditación de Prestadores Institucionales de Salud."
  },
  {
    id: "SIH-1.6.3",
    code: "1.6.3",
    area: "Gestión de la Información",
    name: "Registro de Incidencias",
    objective: "Notificación anónima o nominativa de incidencias, anomalías, fallas de equipamiento o desvíos en la calidad del servicio para investigación forense, análisis de fallas y propuestas de mejora.",
    supportStatus: "SOPORTADO",
    providerVendor: "Registro de Incidencias Institucional",
    features: [
      "Registro web de incidencias por categoría, tipo de riesgo, servicio y nivel de impacto.",
      "Modalidad de reporte confidencial y anónimo para fomentar la cultura no punitiva de seguridad.",
      "Asignación de investigador responsable y registro de investigación forense / análisis de barreras.",
      "Generación de reportes de recurrencia, mapas de calor de riesgo y matriz de riesgos por área.",
      "Alertas automáticas a comités de seguridad ante incidencias de alto impacto o eventos centinela."
    ],
    integrations: ["Gestión de Calidad, Prevención de Riesgos, IAAS."],
    legalConsiderations: "Norma Técnica General de Seguridad del Paciente MINSAL."
  },
  {
    id: "SIH-1.6.4",
    code: "1.6.4",
    area: "Gestión de la Información",
    name: "Gestión OIRS",
    objective: "Constituye una herramienta o medio de atención por medio de la cual las personas acceden e interactúan con el hospital, garantizando su derecho a informarse, sugerir y reclamar, para contribuir a la conformación de un Gobierno moderno y al servicio de los ciudadanos.",
    supportStatus: "SOPORTADO",
    providerVendor: "Plataforma OIRS / MINSAL",
    features: [
      "Permite el ingreso de consultas, felicitaciones, reclamos, sugerencias, por parte de cualquier ciudadano que haya sido atendido o no por la institución.",
      "Permita ingresar los datos del solicitante (Tipo de persona (natural, jurídica), Fecha de requerimiento, Nombres, sexo, fecha de nacimiento, domicilio, teléfonos de contacto, correos electrónicos, institución que origina el requerimiento, tipo de requerimiento, permitir describir el requerimiento y adjuntar archivos.",
      "Permitir actualizar base de contactabilidad OIRS y datos demográficos de los solicitantes.",
      "Permitir facilidades interculturales (Por ejemplo, manejo de traductores para español - Creole).",
      "Permite que operadores de OIRS capturen solicitudes ciudadanas, las califiquen y deriven a instituciones competentes para su respuesta.",
      "Permitir que usuarios de la institución derivada tomen casos de atención.",
      "Permitir Clasificar áreas responsivas al interior del hospital de tal forma de agrupar los reclamos y en general los tipos de interacciones para derivarlas de manera rápida y simple a los responsables de dar respuesta.",
      "Permitir tracking de tiempo por cada solicitud, grupo de solicitudes y totales por cada etapa definida, así como tiempos máximos de permanencia en cada una de ellas, generando semáforos de alerta y alarmas ante atrasos en las respuestas a las consultas ciudadanas.",
      "Permitir internamente un workflow de tracking de respuesta para que las áreas responsables de responder el requerimiento ciudadano, puedan ingresar digitalmente su respuesta y documentos soportantes.",
      "Permitir que el workflow de respuesta pueda derivar a quien corresponda alertas de demoras de respuesta, si se ha superado los rangos de tiempos de respuesta definidos para cada requerimiento o solicitud ciudadana.",
      "Permitir envíos automáticos de respuestas al ciudadano mediante correo electrónico y/o facilitar la generación de respuestas, para su envío mediante correo certificado.",
      "Obtener informes y consultas por tipo de requerimiento, localidad, participantes, institución, fecha, y usuario de atención.",
      "Disponer de un sistema para tomar encuestas de satisfacción, mediante dispositivos móviles como tabletas u otros medios electrónicos, permitir tabular los resultados, disponer de mecanismos de difusión de los resultados (mails particulares, masivos, tableros-pantallas) y disponer de herramientas estadísticas descriptivas y que permitan realizar inferencias."
    ],
    integrations: [
      "Sistema OIRS MINSAL.",
      "Maestro de Pacientes.",
      "Gestión de Calidad y Experiencia Usuaria.",
      "Sistema de Correo Electrónico y Notificaciones Institucionales."
    ],
    legalConsiderations: "Ley 19.880 sobre Bases de los Procedimientos Administrativos, Ley 20.584 de Derechos y Deberes de las Personas en Salud, D.S. N° 35/2012 Reglamento sobre Reclamos OIRS."
  },
  {
    id: "SIH-1.6.5",
    code: "1.6.5",
    area: "Gestión de la Información",
    name: "Gestión de Proyectos",
    objective: "Gestionar proyectos de inversión y desarrollo hospitalario, carta Gantt, paquetes de trabajo, hitos, control presupuestario y vinculación con compras y abastecimiento.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Sistema de Gestión de Proyectos",
    features: [
      "Carta Gantt interactiva con control de avances, ruta crítica e hitos de entrega.",
      "Generación de lista de materiales (BOM) y compras asociadas a cada proyecto.",
      "Control presupuestario por línea de financiamiento (FNDR, fondos sectoriales, fondos propios).",
      "Gestión de riesgos del proyecto y control de cambios en alcance y plazos.",
      "Seguimiento de actas de recepción de obras, equipamiento y puesta en marcha."
    ],
    integrations: ["Abastecimiento, Presupuesto, Contabilidad, Activo Fijo."],
    legalConsiderations: "Normas del Sistema Nacional de Inversiones (SNI) Ministerio de Desarrollo Social."
  },
  {
    id: "SIH-1.6.6",
    code: "1.6.6",
    area: "Gestión de la Información",
    name: "Data Warehouse, Data Lake (Ciencia de datos)",
    objective: "Estructuras de datos multidimensionales y repositorio centralizado para analítica avanzada, inteligencia de negocios, modelos predictivos y reportes estadísticos REM.",
    supportStatus: "EN_IMPLEMENTACION",
    providerVendor: "Data Warehouse / BI Institucional",
    features: [
      "Extracción, transformación y carga (ETL/ELT) automatizada de datos relacionales y no relacionales desde todos los sistemas del hospital.",
      "Generación automatizada y validación cruzada de Reportes Estadísticos Mensuales (REM) y DEIS.",
      "Modelos analíticos predictivos para estimación de demanda en urgencia, estancias y ausentismo.",
      "Construcción de cubos OLAP y data marts temáticos (quirúrgico, camas, farmacia, laboratorio).",
      "Tableros de analítica avanzada con gobierno de datos y trazabilidad del linaje de datos."
    ],
    integrations: ["Todos los sistemas transaccionales del hospital, SIDRA, MINSAL DEIS."],
    legalConsiderations: "Ley 19.628 sobre Protección de la Vida Privada / Datos Personales, Estándares de Ciberseguridad Ley 21.663."
  },
  {
    id: "SIH-1.6.7",
    code: "1.6.7",
    area: "Gestión de la Información",
    name: "Grupo Relacionados por diagnóstico (GRD)",
    objective: "Clasificar y agrupar el producto hospitalario por casuística, nivel de complejidad y riesgo para estimar costos, facturación por IR-GRD e índices de eficiencia clínica.",
    supportStatus: "SOPORTADO",
    providerVendor: "Agrupador GRD / MINSAL",
    features: [
      "Codificación automatizada y asistida de diagnósticos principales, secundarios (CIE-10) y procedimientos (CIE-9-MC / ACHS).",
      "Control de desempeño clínico y casuística hospitalaria (case-mix index / CMI).",
      "Cálculo de indicadores de severidad, riesgo de mortalidad, estancia media ajustada y ratio de complejidad.",
      "Detección y auditoría de complicaciones intrahospitalarias y comorbilidades mayores (CC/MCC).",
      "Estimación de costos por paciente y facturación FONASA por paquete de transferencia GRD."
    ],
    integrations: ["Ficha Clínica, Ficha de Urgencia, Hospitalizados, Pabellón Quirúrgico, Facturación."],
    legalConsiderations: "Metodología IR-GRD FONASA / MINSAL, Norma Técnica DEIS."
  }
];
