import { JCIStandard, JCICategory } from "../types";

export const OFFICIAL_JCI_CATEGORIES: JCICategory[] = [
  { code: "IPSG", name: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)" },
  { code: "ACC", name: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)" },
  { code: "AOP", name: "Evaluación de los Pacientes (Assessment of Patients)" },
  { code: "COP", name: "Atención de los Pacientes (Care of Patients)" },
  { code: "ASC", name: "Atención Anestésica y Quirúrgica (Anesthesia and Surgical Care)" },
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
  // =========================================================================
  // METAS INTERNACIONALES DE SEGURIDAD DEL PACIENTE (IPSG)
  // =========================================================================
  {
    id: "IPSG.1",
    code: "IPSG.1",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Identificación Correcta de Pacientes",
    objective: "La organización desarrolla e implementa un proceso para mejorar la precisión en la identificación de pacientes mediante al menos dos identificadores únicos (ej. Nombre completo y RUN/Ficha Clínica), excluyendo el número de cama o sala.",
    measurableElements: [
      "Los pacientes son identificados utilizando al menos dos identificadores únicos en todas las atenciones clínicas y administrativas.",
      "Identificación previa y activa antes de la administración de cualquier medicamento, sangre, hemoderivados o nutrición parenteral.",
      "Identificación activa previa a la toma de muestras de laboratorio, fluidos corporales e imágenes diagnósticas.",
      "Identificación activa antes de realizar cualquier procedimiento quirúrgico, invasivo o traslado.",
      "Verificación obligatoria de pulsera de identificación estandarizada con código de barras al ingreso hospitalario y reposición inmediata si se deteriora."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.2",
    code: "IPSG.2",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Mejora de la Comunicación Efectiva",
    objective: "La organización desarrolla e implementa un proceso para mejorar la efectividad y oportunidad de la comunicación verbal, telefónica y de traspaso de pacientes entre los profesionales de la salud.",
    measurableElements: [
      "Aplicación obligatoria del protocolo 'Escribir - Leer - Confirmar' (Write down, Read back, Confirm) para órdenes verbales o telefónicas de prescripciones.",
      "Definición institucional, difusión y notificación oportuna de valores críticos de laboratorio, imágenes y monitorización fisiológica.",
      "Uso de metodología estructurada y estandarizada (ej. SBAR: Situación, Antecedentes, Evaluación, Recomendación) durante el traspaso de pacientes y entregas de turno.",
      "Registro inmediato con fecha, hora, nombre y rol de los profesionales emisores y receptores de información clínica crítica."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.3",
    code: "IPSG.3",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Seguridad de Medicamentos de Alto Riesgo",
    objective: "La organización desarrolla e implementa un proceso para mejorar la seguridad en el manejo, almacenamiento, prescripción, preparación y administración de medicamentos de alto riesgo y fármacos de alerta máxima.",
    measurableElements: [
      "Elaboración y actualización anual de la lista institucional de medicamentos de alto riesgo y fármacos con nombres o aspecto similar (LASA - Look-Alike / Sound-Alike).",
      "Identificación visual diferenciada y etiquetado de advertencia para electrolitos concentrados y citostáticos.",
      "Almacenamiento restringido y bajo llave de electrolitos concentrados fuera de áreas clínicas generales, permitiéndose sólo en unidades críticas bajo protocolo.",
      "Doble chequeo independiente obligatorio (dos profesionales) antes de la preparación y administración de fármacos de alto riesgo (insulinas, anticoagulantes, opioides, quimioterapia)."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.4",
    code: "IPSG.4",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Cirugía y Procedimientos Seguros",
    objective: "Garantizar la realización de cirugías y procedimientos invasivos en el sitio correcto, con el procedimiento correcto y al paciente correcto en todas las áreas donde se realicen intervenciones.",
    measurableElements: [
      "Marcación inequívoca del sitio quirúrgico/anatómico realizada por el cirujano responsable antes del ingreso al quirófano y con participación del paciente cuando esté consciente.",
      "Proceso de verificación preoperatoria integral de consentimientos, exámenes preoperatorios, hemoderivados e implantes disponibles.",
      "Ejecución de la Pausa de Seguridad Quirúrgica (Time-Out) inmediatamente antes del inicio de la incisión o procedimiento, con participación activa de todo el equipo.",
      "Aplicación estandarizada de la Lista de Chequeo Quirúrgico de la OMS (Entrada, Pausa Quirúrgica y Salida con recuento de compresas e instrumental)."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.5",
    code: "IPSG.5",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Infecciones Asociadas a la Atención (Higiene de Manos)",
    objective: "La organización adopta e implementa las directrices de higiene de manos de la OMS / CDC para reducir sustancialmente el riesgo de infecciones asociadas a la atención de salud (IAAS).",
    measurableElements: [
      "Cumplimiento y adhesión estricta a los '5 Momentos de la Higiene de Manos' recomendados por la OMS en todas las unidades asistenciales.",
      "Disponibilidad universal y permanente de dispensadores de solución alcohólica en el punto de atención y lavamanos operativos con jabón y toallas desechables.",
      "Programa continuo de capacitación y evaluación práctica de la técnica de lavado y desinfección de manos para todo el personal asistencial y de apoyo.",
      "Monitorización observacional periódica de la adherencia a la higiene de manos y retroalimentación mensual a las jefaturas de servicio."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.6",
    code: "IPSG.6",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Daño por Caídas",
    objective: "La organización desarrolla e implementa un proceso para evaluar y reevaluar continuamente el riesgo de caídas en todos los pacientes y aplicar medidas preventivas individualizadas.",
    measurableElements: [
      "Evaluación inicial del riesgo de caídas al ingreso hospitalario utilizando una escala validada y adaptada a la población (ej. Morse, Downtown, Macdems).",
      "Reevaluación periódica del riesgo de caídas ante cambios de medicación, sedación, traslados entre unidades o deterioro del estado neurológico/funcional.",
      "Identificación visual de pacientes con alto riesgo de caída (ej. distintivo en pulsera y ficha clínica).",
      "Implementación de medidas de seguridad ambiental: barandas elevadas, timbres de llamada al alcance, iluminación adecuada y calzado antideslizante."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // ACCESO A LA ATENCIÓN Y CONTINUIDAD (ACC)
  // =========================================================================
  {
    id: "ACC.1",
    code: "ACC.1",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Admisión, Ingreso y Triaje Clínico",
    objective: "La organización cuenta con un proceso estandarizado para la evaluación de necesidades asistenciales, priorización de urgencias (Triaje) e ingreso de pacientes según su capacidad resolutiva.",
    measurableElements: [
      "Criterios clínicos y administrativos estandarizados para la admisión e ingreso a servicios ambulatorios, hospitalización y unidades de cuidados intensivos.",
      "Sistema de triaje estructurado y validado (ESI / Manchester) en el Servicio de Urgencia para categorizar la gravedad y tiempo de atención.",
      "Información clara y oportuna al paciente y acompañante respecto a las opciones de atención, tiempos de espera estimados y coberturas previsionales."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.2",
    code: "ACC.2",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Continuidad y Coordinación Asistencial en Transiciones",
    objective: "Garantizar la continuidad de la atención clínica durante todas las fases de la atención, traslados internos entre unidades y derivaciones a otros centros de la red asistencial.",
    measurableElements: [
      "Registro de epicrisis y resumen clínico de traslado estandarizado con diagnósticos, tratamientos administrados y plan de cuidados pendiente.",
      "Coordinación previa, confirmación de cama y recepción informada por el equipo de la unidad receptora.",
      "Acompañamiento por personal de salud competente y equipamiento de soporte vital según nivel de complejidad y riesgo del paciente durante el transporte."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.3",
    code: "ACC.3",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Planificación del Alta y Continuidad de Cuidados",
    objective: "La organización cuenta con un proceso estructurado para la planificación del alta hospitalaria coordinada con el paciente, familia y la red de atención primaria.",
    measurableElements: [
      "Inicio de la planificación del alta desde el ingreso del paciente considerando factores clínicos, sociales y de red de apoyo familiar.",
      "Entrega obligatoria al momento del egreso del informe de alta médica (epicrisis) y hoja de indicaciones de enfermería por escrito y explicada verbalmente.",
      "Receta médica completa con conciliación de fármacos al alta y coordinación de citas de control o derivación a la atención primaria."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.4",
    code: "ACC.4",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Transporte Asistencial y Gestión de Ambulancias",
    objective: "Garantizar que el transporte de pacientes en vehículos institucionales o contratados cumpla con estándares de seguridad, equipamiento y competencia técnica del personal.",
    measurableElements: [
      "Mantenimiento preventivo periódico y certificación de operatividad de la flota de ambulancias y equipos biomédicos de transporte.",
      "Dotación de insumos de reanimación, oxígeno, medicamentos de urgencia y desfibrilador operativo en cada móvil de traslado.",
      "Registro formal del monitoreo de signos vitales e incidentes ocurridos durante el trayecto de traslado."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // EVALUACIÓN DE LOS PACIENTES (AOP)
  // =========================================================================
  {
    id: "AOP.1",
    code: "AOP.1",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Evaluación Inicial Médica y de Enfermería",
    objective: "Todos los pacientes reciben una evaluación médica y de enfermería integral, oportuna y documentada en la ficha clínica al ingreso hospitalario.",
    measurableElements: [
      "Evaluación médica inicial documentada dentro de los marcos temporales normados (máximo 24 horas tras el ingreso o inmediato en urgencias).",
      "Valoración integral de enfermería completada dentro de las primeras 24 horas que incluye anamnesis, valoración por patrones/necesidades y tamizajes de riesgo.",
      "Evaluación sistemática del dolor, estado nutricional, riesgo de úlceras por presión (Braden) y capacidad funcional al ingreso."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "AOP.2",
    code: "AOP.2",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Reevaluación Médica y Monitoreo Continuo",
    objective: "Los pacientes son reevaluados a intervalos regulares a lo largo de su estancia para determinar su respuesta al tratamiento y planificar la continuidad de cuidados.",
    measurableElements: [
      "Reevaluación médica diaria documentada en la ficha clínica para pacientes hospitalizados, y con mayor frecuencia en unidades críticas o pacientes inestables.",
      "Registro de constantes vitales por enfermería según frecuencia pautada o ante cambios en la condición hemodinámica del paciente.",
      "Reevaluación formal de la respuesta clínica tras intervenciones diagnósticas, quirúrgicas o farmacológicas relevantes."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "AOP.5",
    code: "AOP.5",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Servicios de Laboratorio Clínico y Banco de Sangre",
    objective: "Los servicios de laboratorio clínico cumplen con estándares de bioseguridad, control de calidad analítico, oportunidad en resultados y trazabilidad de muestras.",
    measurableElements: [
      "Programa integral de control de calidad interno diario y participación en programas de evaluación externa de la calidad (PEEC).",
      "Protocolo formal de notificación inmediata y registro de resultados de alerta o valores críticos a los médicos tratantes.",
      "Trazabilidad unívoca de muestras biológicas con código de barras desde la toma, transporte, procesamiento hasta el descarte.",
      "Disponibilidad de reactivos vigentes, mantenimiento y calibración documentada de analizadores automatizados."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "AOP.6",
    code: "AOP.6",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Servicios de Diagnóstico por Imágenes y Radiología",
    objective: "Los servicios de imágenes diagnósticas operan bajo estrictas normas de radioprotección, control de calidad, mantención de equipos y emisión oportuna de informes radiológicos.",
    measurableElements: [
      "Programa de protección radiológica para pacientes, acompañantes y personal ocupacionalmente expuesto (dosimetría personal, blindaje).",
      "Control de calidad y calibración periódica de equipos de rayos X, tomografía computarizada, resonancia y ecografía.",
      "Emisión y validación de informes radiológicos por médicos especialistas dentro de los plazos establecidos según nivel de urgencia.",
      "Protocolo para el uso seguro de medios de contraste radiológico con tamizaje de función renal previa y manejo de reacciones anafilácticas."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // ATENCIÓN DE LOS PACIENTES (COP)
  // =========================================================================
  {
    id: "COP.1",
    code: "COP.1",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Plan de Atención Integrado y Multidisciplinario",
    objective: "La atención de cada paciente es planificada y coordinada de forma multidisciplinaria mediante un plan de cuidados individualizado basado en la evaluación clínica.",
    measurableElements: [
      "Plan de atención individualizado documentado en la ficha clínica dentro de las primeras 24 horas del ingreso.",
      "Coordinación e integración de objetivos terapéuticos entre médicos, enfermeros, kinesiólogos, nutricionistas y farmacéuticos.",
      "Actualización y ajuste del plan de cuidados en función de la evolución clínica y reevaluaciones periódicas del paciente."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.2",
    code: "COP.2",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Manejo de Emergencias Clínicas y Reanimación Cardiopulmonar",
    objective: "La organización cuenta con un sistema estandarizado y oportuno de respuesta a emergencias médicas y paro cardiorrespiratorio en todas las instalaciones del hospital (Código Azul).",
    measurableElements: [
      "Disponibilidad de carros de paro equipados, revisados diariamente por enfermería y sellados con precinto de seguridad en todas las unidades.",
      "Desfibriladores automáticos/manuales operativos con pruebas diarias de descarga documentadas.",
      "Equipo de respuesta rápida o Código Azul con activación unificada y tiempos de respuesta monitorizados.",
      "Personal asistencial capacitado y certificado en soporte vital básico (BLS) y avanzado (ACLS/PALS)."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.3",
    code: "COP.3",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Atención de Pacientes de Alto Riesgo y Servicios Críticos",
    objective: "Provisión de cuidados especializados y seguros a poblaciones vulnerables y pacientes de alto riesgo (UCI, pacientes comatosos, pacientes inmunodeprimidos, pacientes en contención).",
    measurableElements: [
      "Guías clínicas y protocolos específicos para el manejo de pacientes en unidades de cuidados intensivos e intermedios.",
      "Protocolo estricto para la indicación, monitoreo continuo y retiro oportuno de contenciones físicas o farmacológicas.",
      "Protección y resguardo reforzado para pacientes vulnerables: recién nacidos, niños, adultos mayores dependientes y pacientes psiquiátricos."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.4",
    code: "COP.4",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Terapia Nutricional y Manejo de Dietas",
    objective: "Garantizar que la prescripción, preparación, almacenamiento y distribución de alimentos y nutrición clínica cumplan con las necesidades terapéuticas y normas de inocuidad.",
    measurableElements: [
      "Prescripción médica y nutricional de dietas terapéuticas, nutrición enteral y nutrición parenteral documentada en ficha.",
      "Trazabilidad y control higiénico-sanitario en la preparación y distribución de raciones alimentarias y fórmulas lácteas (SEDILE).",
      "Monitoreo de la tolerancia digestiva, ingesta calórico-proteica y balance hidroelectrolítico en pacientes con soporte nutricional especializado."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.6",
    code: "COP.6",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Manejo y Control del Dolor",
    objective: "Todos los pacientes tienen derecho a una evaluación sistemática, oportuna y tratamiento efectivo del dolor.",
    measurableElements: [
      "Evaluación inicial del dolor mediante escalas validadas acordes a la edad y estado cognitivo (EVA, Escala Numérica, FLACC, Campbell).",
      "Tratamiento analgésico pautado y escalonado según intensidad del dolor documentado en la ficha clínica.",
      "Reevaluación obligatoria de la intensidad del dolor posterior a la administración de analgésicos para verificar eficacia terapéutica.",
      "Educación al paciente y familia sobre el reporte y manejo de síntomas dolorosos."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.7",
    code: "COP.7",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Cuidados al Final de la Vida y Cuidados Paliativos",
    objective: "Proveer atención compasiva, respetuosa y de alivio sintomático a pacientes en etapa terminal y apoyo integral a sus familias.",
    measurableElements: [
      "Evaluación y manejo oportuno del dolor, disnea, náuseas y otros síntomas angustiantes en el paciente terminal.",
      "Respeto a las voluntades anticipadas, valores culturales y creencias espirituales del paciente y su familia.",
      "Acompañamiento continuo y facilidades de estancia para la familia durante el proceso de agonía y duelo."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // ATENCIÓN ANESTÉSICA Y QUIRÚRGICA (ASC)
  // =========================================================================
  {
    id: "ASC.1",
    code: "ASC.1",
    chapter: "Atención Anestésica y Quirúrgica (Anesthesia and Surgical Care)",
    name: "Organización y Bioseguridad de Pabellones Quirúrgicos",
    objective: "Los servicios quirúrgicos y pabellones de operaciones operan bajo estrictas normas de bioseguridad, control ambiental, flujo de personal y equipamiento estandarizado.",
    measurableElements: [
      "Zonificación estricta de áreas quirúrgicas (zona no restringida, semirrestringida y restringida) con control de acceso.",
      "Control y monitoreo continuo de presión positiva de aire, humedad y temperatura en salas de operaciones.",
      "Protocolo estandarizado para la limpieza y desinfección de pabellones entre cirugías y limpieza terminal diaria."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ASC.3",
    code: "ASC.3",
    chapter: "Atención Anestésica y Quirúrgica (Anesthesia and Surgical Care)",
    name: "Sedación Procedimental y Moderada",
    objective: "La administración de sedación consciente y moderada fuera de pabellón central cumple con los mismos estándares de seguridad que la anestesia general.",
    measurableElements: [
      "Evaluación previa a la sedación para identificar factores de riesgo de vía aérea difícil o comorbilidades.",
      "Monitoreo continuo de frecuencia cardíaca, saturación de oxígeno, presión arterial y nivel de conciencia durante el procedimiento.",
      "Criterios explícitos de recuperación postanestésica antes del alta o traslado del paciente."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ASC.5",
    code: "ASC.5",
    chapter: "Atención Anestésica y Quirúrgica (Anesthesia and Surgical Care)",
    name: "Evaluación Preanestésica y Consentimiento",
    objective: "Cada paciente sometido a anestesia recibe una evaluación preanestésica documentada y otorga su consentimiento informado específico.",
    measurableElements: [
      "Evaluación preanestésica completa realizada por médico anestesiólogo antes del ingreso al pabellón quirúrgico (clasificación ASA, vía aérea, ayuno).",
      "Formulación y registro del plan anestésico individualizado en la ficha clínica.",
      "Consentimiento informado específico de anestesia firmado por el paciente o su representante legal tras recibir explicación de riesgos y alternativas."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ASC.7",
    code: "ASC.7",
    chapter: "Atención Anestésica y Quirúrgica (Anesthesia and Surgical Care)",
    name: "Cuidados Postanestésicos y Alta de Recuperación (URPA)",
    objective: "Los pacientes reciben atención y monitorización postanestésica continua y son dados de alta de la Unidad de Recuperación Postanestésica bajo criterios objetivos estandarizados.",
    measurableElements: [
      "Monitoreo hemodinámico, respiratorio y de estado de conciencia continuo documentado en la hoja de recuperación.",
      "Aplicación de escala validada (ej. Aldrete modificado o White-Fast) para autorizar el egreso de la URPA a sala de hospitalización.",
      "Informe operatorio y protocolo quirúrgico redactado y firmado por el cirujano responsable inmediatamente al término de la intervención."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // GESTIÓN Y USO DE MEDICAMENTOS (MMU)
  // =========================================================================
  {
    id: "MMU.1",
    code: "MMU.1",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Organización y Selección del Arsenal Farmacológico",
    objective: "La organización cuenta con un sistema integral de gestión de medicamentos dirigido por profesionales farmacéuticos y respaldado por un Comité de Farmacia y Terapéutica activo.",
    measurableElements: [
      "Existencia de un Vademécum o Arsenal Farmacológico Institucional aprobado y revisado anualmente.",
      "Mecanismo estandarizado para la solicitud y evaluación de medicamentos no incluidos en el arsenal ante situaciones clínicas excepcionales.",
      "Supervisión continua por químicos farmacéuticos de todos los puntos de almacenamiento y dispensación de medicamentos."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.2",
    code: "MMU.2",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Almacenamiento Seguro y Control de Cadena de Frío",
    objective: "Los medicamentos se almacenan bajo condiciones controladas de temperatura, humedad, seguridad y custodia para preservar su integridad y prevenir accesos no autorizados.",
    measurableElements: [
      "Monitoreo y registro diario continuo de temperatura y humedad en farmacias, bodegas y botiquines clínicos.",
      "Control estricto de cadena de frío (2°C a 8°C) para medicamentos termolábiles y vacunas con alarmas sonoras y respaldo eléctrico.",
      "Custodia bajo doble llave o código seguro de medicamentos estupefacientes y psicotrópicos con libro de control oficial al día.",
      "Revisión mensual de fechas de vencimiento y retiro inmediato de fármacos caducados o deteriorados."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.3",
    code: "MMU.3",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Prescripción y Ordenamiento Médico Seguro",
    objective: "Las recetas y prescripciones médicas son claras, completas, legibles, autenticadas y registradas conforme a políticas institucionales que eviten errores de dosificación.",
    measurableElements: [
      "Elementos obligatorios en toda prescripción: nombre del paciente, RUN, fármaco genérico/DCI, dosis exacta, vía, frecuencia y diagnóstico.",
      "Verificación obligatoria de antecedentes de alergias a medicamentos antes de la emisión de la primera orden médica.",
      "Proceso de conciliación medicamentosa formal al ingreso, transferencias entre servicios y al alta hospitalaria.",
      "Uso exclusivo de abreviaturas estandarizadas autorizadas y prohibición de abreviaturas peligrosas o ambiguas."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.4",
    code: "MMU.4",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Preparación y Dispensación por Dosis Unitaria",
    objective: "Los medicamentos se preparan y dispensan en un entorno limpio y seguro, priorizando el sistema de dosis unitaria e individualizada para cada paciente.",
    measurableElements: [
      "Revisión y validación farmacéutica de la orden médica previa a la dispensación (dosis, duplicidad, interacciones y compatibilidad).",
      "Preparación de mezclas intravenosas, nutrición parenteral y quimioterapia en campanas de flujo laminar estériles por personal calificado.",
      "Etiquetado claro de cada dosis unitaria con nombre del paciente, dos identificadores, nombre del fármaco, dosis, vía, fecha y hora de preparación y caducidad."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.5",
    code: "MMU.5",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Administración Segura de Medicamentos y Verificación de Correctos",
    objective: "La administración de medicamentos es ejecutada exclusivamente por personal de enfermería legalmente facultado mediante la verificación sistemática de los correctos de seguridad.",
    measurableElements: [
      "Verificación activa de los '5 Correctos' (Paciente correcto, Medicamento correcto, Dosis correcta, Vía correcta, Hora correcta) al pie de cama.",
      "Doble chequeo independiente documentado para la administración de electrolitos concentrados, insulina, anticoagulantes y quimioterápicos.",
      "Registro inmediato de la administración (o motivo fundado de omisión) en la hoja de registro clínico de enfermería."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.7",
    code: "MMU.7",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Farmacovigilancia y Reporte de Eventos por Medicamentos",
    objective: "La organización cuenta con un proceso activo de monitorización, reporte y análisis de reacciones adversas a medicamentos (RAM) y errores de medicación.",
    measurableElements: [
      "Monitoreo clínico del paciente posterior a la administración de medicamentos para detectar posibles efectos adversos.",
      "Notificación no punitiva e investigación de incidentes y errores de medicación (cuasi-fallas, errores de prescripción, dispensación o administración).",
      "Reporte obligatorio y oportuno de reacciones adversas graves al Instituto de Salud Pública (ISP) y MINSAL."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // EDUCACIÓN DEL PACIENTE Y LA FAMILIA (PFE)
  // =========================================================================
  {
    id: "PFE.1",
    code: "PFE.1",
    chapter: "Educación del Paciente y la Familia (Patient and Family Education)",
    name: "Evaluación de Necesidades Educativas",
    objective: "La organización evalúa las necesidades educativas individuales del paciente y su familia considerando su nivel de alfabetización en salud, idioma, cultura y barreras cognitivas.",
    measurableElements: [
      "Evaluación inicial de conocimientos y disposición para el aprendizaje del paciente y cuidador principal.",
      "Identificación y abordaje de barreras idiomáticas, auditivas, visuales o culturales en la entrega de información médica.",
      "Plan de educación individualizado incorporado en el plan integral de atención."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "PFE.2",
    code: "PFE.2",
    chapter: "Educación del Paciente y la Familia (Patient and Family Education)",
    name: "Educación en Autocuidado, Medicación y Dispositivos",
    objective: "El equipo de salud brinda educación estructurada y verificable en el uso seguro de medicamentos, manejo de dispositivos médicos (sondas, drenajes, ostomías) y prevención de complicaciones en el hogar.",
    measurableElements: [
      "Instrucción práctica sobre el uso seguro de medicamentos prescritos al alta, posibles efectos secundarios e interacciones con alimentos.",
      "Entrenamiento guiado al paciente y cuidador en el manejo de dispositivos médicos, técnicas de curación y signos de alarma para consultar a urgencias.",
      "Verificación de la comprensión mediante la técnica de 'Teach-Back' (pedir al paciente que explique con sus palabras lo aprendido) documentada en la ficha."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // MEJORA DE LA CALIDAD Y SEGURIDAD DEL PACIENTE (QPS)
  // =========================================================================
  {
    id: "QPS.1",
    code: "QPS.1",
    chapter: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)",
    name: "Liderazgo del Programa Institucional de Calidad",
    objective: "El equipo directivo lidera y asigna recursos a un programa continuo e integral de mejora de la calidad y seguridad del paciente en toda la institución.",
    measurableElements: [
      "Plan Anual de Calidad y Seguridad del Paciente aprobado por la Dirección y difundido a todo el personal.",
      "Designación formal de un Departamento o Unidad de Calidad con profesionales competentes con dedicación exclusiva.",
      "Presentación trimestral de informes de calidad y seguridad al Comité Directivo para la toma de decisiones estratégicas."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "QPS.3",
    code: "QPS.3",
    chapter: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)",
    name: "Medición y Monitoreo de Indicadores Clínicos y de Gestión",
    objective: "La organización recopila, analiza y utiliza sistemáticamente datos de indicadores de estructura, proceso y resultado para monitorear el desempeño de las áreas asistenciales y de soporte.",
    measurableElements: [
      "Tablero institucional de indicadores clínicos prioritarios (mortalidad, reingresos no programados, IAAS, tiempos de espera, satisfacción usuaria).",
      "Metodología estandarizada de recolección, validación estadística y análisis de tendencias de datos.",
      "Implementación de ciclos de mejora continua (PDCA / PHVA) cuando los indicadores no alcanzan las metas comprometidas."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "QPS.7",
    code: "QPS.7",
    chapter: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)",
    name: "Gestión de Eventos Centinela y Análisis Causa Raíz (RCA)",
    objective: "La organización cuenta con un sistema riguroso para la identificación, reporte obligatorio, análisis causa raíz multidisciplinario y ejecución de planes de acción correctiva ante eventos centinela.",
    measurableElements: [
      "Definición institucional explícita y conocida de eventos centinela y eventos adversos graves.",
      "Obligatoriedad de notificación inmediata del evento centinela dentro de las primeras 24 horas de ocurrido.",
      "Realización de Análisis Causa Raíz (RCA) exhaustivo completado en un plazo máximo de 45 días calendario.",
      "Diseño e implementación de un plan de acción con responsables, plazos y mecanismos de auditoría para prevenir la recurrencia del evento."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // PREVENCIÓN Y CONTROL DE INFECCIONES (PCI)
  // =========================================================================
  {
    id: "PCI.1",
    code: "PCI.1",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Programa y Vigilancia Epidemiológica de IAAS",
    objective: "La organización cuenta con un programa integral de Prevención y Control de Infecciones Asociadas a la Atención de Salud (IAAS) liderado por un Comité especializado.",
    measurableElements: [
      "Vigilancia epidemiológica activa de infecciones prioritarias (Infección de Herida Operatoria, ITU asociada a Catéter Urinario, Bacteriemia asociada a CVC, Neumonía asociada a Ventilación Mecánica).",
      "Cálculo mensual de tasas de incidencia y comparación contra estándares nacionales (MINSAL / CDC).",
      "Definición de paquetes de medidas preventivas (Bundles) y supervisión periódica de su cumplimiento en terreno."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "PCI.2",
    code: "PCI.2",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Medidas de Aislamiento y Precauciones Estándar",
    objective: "Implementación rigurosa de precauciones estándar para todos los pacientes y precauciones basadas en el mecanismo de transmisión (Contacto, Gotitas, Aéreo).",
    measurableElements: [
      "Uso correcto de Elementos de Protección Personal (EPP: mascarillas N95/quirúrgicas, pecheras, guantes, protección ocular) según tipo de aislamiento.",
      "Disponibilidad de habitaciones individuales con presión negativa y filtros HEPA para aislamiento por vía aérea (ej. Tuberculosis, Sarampión).",
      "Señalética estandarizada y visible en el exterior de las habitaciones con las indicaciones de aislamiento requeridas."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "PCI.5",
    code: "PCI.5",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Trazabilidad, Esterilización y Desinfección de Alto Nivel",
    objective: "Procesos estandarizados de limpieza, desinfección de alto nivel (DAN) y esterilización de instrumental quirúrgico, equipos y dispositivos médicos de reuso.",
    measurableElements: [
      "Monitoreo físico, químico y biológico documentado en cada ciclo de esterilización en autoclaves de vapor y peróxido de hidrógeno.",
      "Trazabilidad unívoca de cada caja quirúrgica e implante mediante código de barras desde la central de esterilización hasta la ficha del paciente receptor.",
      "Almacenamiento de material estéril en condiciones normadas de temperatura (18°-22°C), humedad (30-60%) e integridad del empaque."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "PCI.7",
    code: "PCI.7",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Salud del Personal y Manejo de Accidentes Cortopunzantes",
    objective: "Protección de la salud del personal de salud mediante programas de inmunización, manejo seguro de elementos cortopunzantes y profilaxis post-exposición.",
    measurableElements: [
      "Programa de vacunación obligatoria del personal (Hepatitis B, Influenza, COVID-19, etc.).",
      "Disponibilidad de contenedores rígidos amarillos para descarte de material cortopunzante en los puntos de atención.",
      "Protocolo activo y accesible las 24 horas para la atención inmediata, consejería, serología y profilaxis post-exposición a fluidos corporales de alto riesgo."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // GOBERNANZA, LIDERAZGO Y DIRECCIÓN (GLD)
  // =========================================================================
  {
    id: "GLD.1",
    code: "GLD.1",
    chapter: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)",
    name: "Marco de Gobernanza y Responsabilidad Directiva",
    objective: "La máxima autoridad y el cuerpo directivo son responsables de la calidad, seguridad, viabilidad financiera y cumplimiento ético y legal de la organización.",
    measurableElements: [
      "Estructura organizacional, misión, visión y líneas de autoridad formalmente definidas y aprobadas.",
      "Supervisión periódica de la calidad de la atención y seguridad del paciente por parte de la Junta Directiva.",
      "Asignación equitativa y transparente de recursos humanos, tecnológicos y financieros para responder a las necesidades de la comunidad."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "GLD.3",
    code: "GLD.3",
    chapter: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)",
    name: "Liderazgo de Servicios Clínicos y Departamentos",
    objective: "Cada servicio clínico y departamento administrativo cuenta con una jefatura calificada responsable de la gestión asistencial, guías clínicas y desempeño del personal.",
    measurableElements: [
      "Jefaturas médicas y de enfermería designadas con perfiles de competencia acordes a la especialidad del servicio.",
      "Elaboración, actualización y difusión de manuales de organización, procedimientos y guías clínicas basadas en evidencia.",
      "Evaluación continua del desempeño y cumplimiento de metas operacionales del departamento."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "GLD.11",
    code: "GLD.11",
    chapter: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)",
    name: "Gestión Ética y Comité de Ética Asistencial",
    objective: "La organización establece un marco de conducta ética y cuenta con un Comité de Ética Asistencial para orientar y resolver dilemas bioéticos en la atención de pacientes.",
    measurableElements: [
      "Código de Ética y Conducta institucional conocido y suscrito por todo el personal de la institución.",
      "Comité de Ética Asistencial multidisciplinario constituido formalmente para atender consultas de pacientes, familiares y profesionales.",
      "Protocolo para el respeto a la autonomía del paciente, consentimiento informado, directrices anticipadas y objeción de conciencia."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // GESTIÓN Y SEGURIDAD DE INSTALACIONES (FMS)
  // =========================================================================
  {
    id: "FMS.1",
    code: "FMS.1",
    chapter: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    name: "Plan Integral de Seguridad Física y Ambiental",
    objective: "La organización diseña, implementa y mantiene un plan integral para garantizar instalaciones físicas seguras para pacientes, funcionarios y visitantes.",
    measurableElements: [
      "Programa de inspecciones semestrales de seguridad en todas las dependencias del hospital para identificar y mitigar riesgos físicos.",
      "Control de accesos a áreas críticas o restringidas (pabellones, farmacia, gases clínicos, subestaciones eléctricas).",
      "Plan de contingencia y mitigación ante riesgos de desastres naturales o emergencias externas (terremotos, inundaciones)."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "FMS.4",
    code: "FMS.4",
    chapter: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    name: "Protección y Seguridad Contra Incendios",
    objective: "La organización cuenta con un programa activo de prevención, detección, combate de incendios y rutas de evacuación seguras y señalizadas.",
    measurableElements: [
      "Sistemas de detección temprana de humo y calor y red húmeda/seca de extinción inspeccionados y operativos.",
      "Extintores de incendios adecuados al tipo de riesgo, certificados y con mantención anual vigente.",
      "Vías de evacuación despejadas, puertas cortafuego operativas y luces de emergencia funcionales.",
      "Realización de simulacros periódicos de evacuación ante incendios con participación del personal de todas las jornadas."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "FMS.7",
    code: "FMS.7",
    chapter: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    name: "Gestión y Mantenimiento Preventivo de Equipos Médicos",
    objective: "Los equipos médicos y biomédicos son inventariados, inspeccionados, calibrados y mantenidos preventivamente para asegurar su funcionamiento seguro y confiable.",
    measurableElements: [
      "Inventario completo y actualizado de todo el equipamiento médico con hoja de vida y clasificación por nivel de riesgo.",
      "Programa riguroso de mantenimiento preventivo y calibración periódica ejecutado por personal técnico calificado o proveedores autorizados.",
      "Protocolo para el retiro inmediato de servicio, etiquetado de fuera de servicio y reemplazo de equipos defectuosos o en alerta técnica."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "FMS.8",
    code: "FMS.8",
    chapter: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    name: "Sistemas de Suministros Básicos y Gases Clínicos",
    objective: "Garantizar el suministro ininterrumpido y seguro de electricidad, agua potable, gases medicinales y climatización en todas las áreas críticas del hospital.",
    measurableElements: [
      "Grupos electrógenos de respaldo de emergencia con transferencia automática en menos de 10 segundos para áreas críticas (UCI, Urgencias, Pabellón).",
      "Pruebas mensuales documentadas de funcionamiento de generadores bajo carga real de trabajo.",
      "Centrales de gases clínicos (oxígeno, aire medicinal, vacío) con monitoreo continuo de presión, banco de reserva y alarmas operativas.",
      "Control bacteriológico y fisicoquímico periódico de la calidad del agua potable y de las plantas de tratamiento de diálisis."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // CALIFICACIONES Y EDUCACIÓN DEL PERSONAL (SQE)
  // =========================================================================
  {
    id: "SQE.1",
    code: "SQE.1",
    chapter: "Calificaciones y Educación del Personal (Staff Qualifications and Education)",
    name: "Planificación y Dotación de Personal de Salud",
    objective: "La organización define la cantidad, perfiles y competencias del personal requeridos para satisfacer de forma segura las necesidades asistenciales de los pacientes.",
    measurableElements: [
      "Cálculo técnico y asignación de dotaciones de médicos, enfermeros y técnicos según nivel de complejidad y ocupación de camas.",
      "Perfiles de cargo y descriptores de funciones actualizados para cada puesto asistencial y de apoyo.",
      "Monitoreo de horas extraordinarias, ausentismo y cobertura oportuna de reemplazos."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "SQE.9",
    code: "SQE.9",
    chapter: "Calificaciones y Educación del Personal (Staff Qualifications and Education)",
    name: "Habilitación y Otorgamiento de Privilegios Clínicos Médicos (Credentialing)",
    objective: "Proceso uniforme y documentado para la verificación de títulos, especialidades y otorgamiento periódico de privilegios clínicos al cuerpo médico.",
    measurableElements: [
      "Verificación primaria de títulos universitarios, especialidades y registro en la Superintendencia de Salud (SIS) previa a la contratación.",
      "Otorgamiento formal por la Dirección Médica de los privilegios clínicos y procedimientos específicos que cada profesional está facultado para realizar.",
      "Reevaluación y reotorgamiento periódico de privilegios clínicos cada 2 o 3 años basada en el desempeño y resultados asistenciales."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "SQE.14",
    code: "SQE.14",
    chapter: "Calificaciones y Educación del Personal (Staff Qualifications and Education)",
    name: "Capacitación Continua y Entrenamiento en Reanimación",
    objective: "El personal de salud recibe orientación institucional, capacitación continua en seguridad del paciente y reentrenamiento periódico en soporte vital.",
    measurableElements: [
      "Programa de inducción y orientación general y específica para todo el personal nuevo.",
      "Capacitaciones anuales obligatorias en Metas de Seguridad (IPSG), Prevención de IAAS, Manejo de Residuos (REAS) y Derechos del Paciente.",
      "Entrenamiento y certificación periódica en Reanimación Cardiopulmonar (BLS / ACLS) para el personal de atención directa."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // GESTIÓN DE LA INFORMACIÓN (MOI)
  // =========================================================================
  {
    id: "MOI.1",
    code: "MOI.1",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Confidencialidad, Seguridad e Integridad de la Ficha Clínica",
    objective: "La ficha clínica (electrónica o física) del paciente es única, legible, confidencial, protegida contra alteraciones y accesible oportunamente al equipo de salud tratante.",
    measurableElements: [
      "Políticas estrictas de acceso restringido, contraseñas seguras y perfiles de usuario auditables para la visualización de fichas clínicas.",
      "Resguardo absoluto de la confidencialidad y datos sensibles conforme a la Ley 19.628 y Ley 20.584 de Derechos del Paciente.",
      "Registro de cada atención con fecha, hora, nombre, profesión y firma o autenticación digital del profesional tratante.",
      "Prohibición de enmiendas, borrones o sobreescritura en registros clínicos físicos o digitales."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MOI.2",
    code: "MOI.2",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Estandarización de Terminología, Diagnósticos y Símbolos Clínicos",
    objective: "La organización estandariza los códigos diagnósticos, procedimientos, símbolos y define una lista de abreviaturas explícitamente prohibidas.",
    measurableElements: [
      "Uso de clasificaciones diagnósticas y procedimentales internacionales oficiales (CIE-10 / CIE-11, SNOMED-CT, Fonasa).",
      "Lista institucional de abreviaturas, siglas y símbolos autorizados y su distribución a todos los servicios clínicos.",
      "Lista formal de 'Abreviaturas Peligrosas Prohibidas' (ej. 'U' por unidades, 'QD' por diario) y auditorías de cumplimiento."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MOI.3",
    code: "MOI.3",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Oportunidad y Completitud de los Registros Clínicos",
    objective: "La organización establece y supervisa los plazos máximos para el registro de ingresos, evoluciones diarias, protocolos quirúrgicos y confección de epicrisis.",
    measurableElements: [
      "Protocolo operatorio completado y firmado inmediatamente al término de la intervención quirúrgica.",
      "Confección y entrega obligatoria de la epicrisis al paciente al momento del alta hospitalaria.",
      "Auditorías mensuales de calidad de la ficha clínica para medir completitud, legibilidad y oportunidad de los registros."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MOI.7",
    code: "MOI.7",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Continuidad Operativa, Respaldo y Ciberseguridad TI",
    objective: "La organización cuenta con políticas de seguridad de la información, copias de respaldo automatizadas y planes de contingencia ante caídas de los sistemas informáticos.",
    measurableElements: [
      "Políticas de respaldo diario automatizado y almacenamiento de copias de seguridad en ubicación externa segura.",
      "Plan de contingencia ante caída del sistema informático (paso a formularios de registro manual en papel) y recuperación de desastres.",
      "Medidas de ciberseguridad: cortafuegos, antivirus corporativo, cifrado de datos en reposo y en tránsito y pruebas periódicas de vulnerabilidad."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  }
];
