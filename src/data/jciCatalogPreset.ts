import { JCIStandard, JCICategory } from "../types";

export const OFFICIAL_JCI_CATEGORIES: JCICategory[] = [
  { code: "IPSG", name: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)" },
  { code: "ACC", name: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)" },
  { code: "AOP", name: "Evaluación de los Pacientes (Assessment of Patients)" },
  { code: "COP", name: "Atención de los Pacientes (Care of Patients)" },
  { code: "ASC", name: "Anestesia y Atención Quirúrgica (Anesthesia and Surgical Care)" },
  { code: "MMU", name: "Gestión y Uso de Medicamentos (Medication Management and Use)" },
  { code: "PFE", name: "Educación del Paciente y la Familia (Patient and Family Education)" },
  { code: "QPS", name: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)" },
  { code: "PCI", name: "Prevención y Control de Infecciones (Prevention and Control of Infections)" },
  { code: "GLD", name: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)" },
  { code: "FMS", name: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)" },
  { code: "SQE", name: "Calificaciones y Educación del Personal (Staff Qualifications and Education)" },
  { code: "MOI", name: "Gestión de la Información (Management of Information)" },
  { code: "PCC", name: "Atención Centrada en el Paciente (Patient-Centered Care)" }
];

export const INITIAL_JCI_CATALOG: JCIStandard[] = [
  // =========================================================================
  // 1. METAS INTERNACIONALES DE SEGURIDAD DEL PACIENTE (IPSG)
  // =========================================================================
  {
    id: "IPSG.1",
    code: "IPSG.1",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Identificación Correcta de Pacientes",
    objective: "La organización desarrolla e implementa un proceso para mejorar la precisión en la identificación de pacientes mediante al menos dos identificadores únicos en todos los puntos de atención.",
    measurableElements: [
      "Los pacientes son identificados utilizando al menos dos identificadores únicos (ej. nombre completo y número de cédula/RUT/número de historia clínica), nunca por número de habitación o cama.",
      "Identificación activa del paciente previa a la administración de cualquier medicamento, sangre, hemoderivados o nutrición parenteral.",
      "Identificación previa a la toma de muestras de sangre, fluidos corporales, biopsias y realización de exámenes diagnósticos o procedimientos clínicos.",
      "Uso obligatorio de pulsera de identificación estandarizada, resistente al agua y legible colocada al momento de la admisión/ingreso.",
      "Protocolo específico para la identificación de pacientes en estado de inconsciencia, confusión, recién nacidos y homónimos.",
      "Verificación cruzada de identidad verbal con el paciente o acompañante cuando su estado clínico lo permita."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.2",
    code: "IPSG.2",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Mejora de la Comunicación Efectiva",
    objective: "La organización desarrolla e implementa un proceso para mejorar la efectividad de la comunicación verbal y/o telefónica, el traspaso de información clínica y el reporte oportuno de valores críticos.",
    measurableElements: [
      "Aplicación obligatoria del protocolo 'Escribir - Leer - Confirmar' (Read-Back) para órdenes verbales o telefónicas de medicación y tratamientos.",
      "Definición y difusión institucional del listado de valores críticos de laboratorio, imagenología y monitorización diagnóstica.",
      "Proceso estandarizado para la notificación y registro inmediato de resultados de exámenes críticos al médico tratante dentro de tiempos límites definidos.",
      "Uso de metodología estructurada y validada para el traspaso de información clínica (ej. SBAR / SAER) en entregas de turno médico y de enfermería.",
      "Documentación obligatoria del traspaso clínico entre servicios y en traslados intrahospitalarios o extrahospitalarios."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.3",
    code: "IPSG.3",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Seguridad de Medicamentos de Alto Riesgo",
    objective: "La organización desarrolla e implementa un proceso para mejorar la seguridad en el manejo de medicamentos de alto riesgo, concentrados electrolíticos y fármacos con nombres o aspecto similar (LASA).",
    measurableElements: [
      "Identificación y etiquetado diferenciado con señalética de alerta visual para medicamentos de alto riesgo y fármacos LASA (Look-Alike / Sound-Alike).",
      "Restricción y retiro de electrolitos concentrados (ej. Cloruro de Potasio concentrado, Cloruro de Sodio hipertónico) de las áreas de hospitalización general.",
      "Almacenamiento seguro bajo llave y con acceso controlado para electrolitos concentrados en farmacia y unidades críticas autorizadas.",
      "Doble chequeo independiente documentado antes de la preparación y administración de medicamentos de alto riesgo, citostáticos, anticoagulantes e insulina.",
      "Protocolos estandarizados de dosificación, dilución, velocidad de infusión y administración con bombas programables."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.4",
    code: "IPSG.4",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Cirugía y Procedimientos Seguros",
    objective: "Garantizar la realización de cirugías y procedimientos invasivos en el sitio anatómico correcto, con el procedimiento correcto y al paciente correcto.",
    measurableElements: [
      "Marcación del sitio quirúrgico inequívoca e indeleble realizada por el profesional responsable del procedimiento con la participación del paciente despierto.",
      "Proceso de verificación preoperatoria integral previo al ingreso al quirófano (documentación, consentimientos, exámenes, instrumental, prótesis).",
      "Realización sistemática y en voz alta de la Pausa de Seguridad (Time-Out) inmediatamente antes de la incisión quirúrgica o inicio del procedimiento invasivo.",
      "Aplicación y firma en la ficha clínica de la Lista de Chequeo Quirúrgico de la OMS (Entrada, Pausa Quirúrgica y Salida).",
      "Verificación postoperatoria del recuento completo de gasas, compresas, agujas e instrumental quirúrgico."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.5",
    code: "IPSG.5",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Infecciones Asociadas a la Atención (Higiene de Manos)",
    objective: "La organización adopta e implementa las directrices de higiene de manos de la OMS / CDC para reducir el riesgo de infecciones asociadas a la atención de salud (IAAS).",
    measurableElements: [
      "Adopción e implementación institucional de los '5 Momentos para la Higiene de Manos' definidos por la Organización Mundial de la Salud (OMS).",
      "Disponibilidad permanente de dispensadores de solución alcohólica (alcohol gel) en cada punto de atención, box clínico y pie de cama de hospitalización.",
      "Instalaciones de lavado de manos con agua corriente, jabón antiséptico y toallas desechables operativas en todas las áreas clínicas.",
      "Programa continuo de capacitación, evaluación y reentrenamiento en técnica correcta de lavado de manos para todo el personal asistencial y de apoyo.",
      "Medición y reporte trimestral de los índices de adherencia a la higiene de manos por servicio clínico con planes de intervención ante bajas tasas."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "IPSG.6",
    code: "IPSG.6",
    chapter: "Metas Internacionales de Seguridad del Paciente (International Patient Safety Goals)",
    name: "Reducción del Riesgo de Daño por Caídas",
    objective: "La organización desarrolla e implementa un proceso integral para evaluar, reevaluar el riesgo de caídas en todos los pacientes y aplicar medidas preventivas adaptadas.",
    measurableElements: [
      "Evaluación sistemática del riesgo de caídas al ingreso hospitalario y en urgencias mediante una escala validada institucionalmente (ej. Morse, Downton, Macdems).",
      "Reevaluación periódica del riesgo de caídas ante cambios de medicación sedante, traslados entre unidades, postoperatorio o deterioro del estado general.",
      "Identificación visual del paciente con alto riesgo de caídas (ej. brazalete de color distintivo, señalética en cabecera de cama).",
      "Implementación de intervenciones preventivas individualizadas: barandas elevadas, timbre al alcance, calzado antideslizante, asistencia en deambulación y educación familiar.",
      "Registro, investigación y análisis de causas de todas las caídas ocurridas para retroalimentar el plan de prevención institucional."
    ],
    category: "SAFETY_GOALS",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 2. ACCESO A LA ATENCIÓN Y CONTINUIDAD (ACC)
  // =========================================================================
  {
    id: "ACC.1",
    code: "ACC.1",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Admisión, Ingreso y Triaje Clínico",
    objective: "Proceso estandarizado para la evaluación oportuna de necesidades asistenciales, priorización de urgencias mediante triaje estructurado e ingreso de pacientes según capacidad resolutiva institucional.",
    measurableElements: [
      "Criterios explícitos y documentados para la admisión de pacientes a servicios ambulatorios, urgencia, hospitalización general y unidades de cuidados intensivos.",
      "Sistema de triaje estructurado y validado (ej. ESI / Manchester) operado por personal capacitado las 24 horas en el servicio de urgencia.",
      "Tiempos máximos de espera establecidos y monitorizados por categoría de triaje desde el arribo hasta la primera atención médica.",
      "Evaluación de la pertinencia clínica y capacidad institucional previo a la admisión de pacientes electivos o de urgencia.",
      "Proceso claro de orientación e información al paciente y acompañantes sobre derechos, deberes, aranceles, coberturas y normas de convivencia."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.2",
    code: "ACC.2",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Continuidad y Coordinación Asistencial",
    objective: "Garantizar la continuidad ininterrumpida de los cuidados clínicos a lo largo de las distintas etapas, unidades asistenciales y transiciones de cuidado.",
    measurableElements: [
      "Asignación de un médico tratante responsable de coordinar la atención integral del paciente durante toda su estancia hospitalaria.",
      "Plan de cuidados interdisciplinario compartido entre médicos, enfermeros, kinesiólogos, nutricionistas y farmacéuticos clínicos.",
      "Procedimiento formal de traspaso y recepción de pacientes entre turnos y entre diferentes servicios clínicos (ej. Urgencia a Pabellón o UPC).",
      "Registro cronológico y completo en la ficha clínica de todas las decisiones asistenciales, interconsultas y evoluciones clínicas."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.3",
    code: "ACC.3",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Proceso de Alta Médica y Plan de Egreso",
    objective: "Planificación anticipada del egreso hospitalario para garantizar un alta segura, entrega de indicaciones comprensibles y continuidad del tratamiento extrahospitalario.",
    measurableElements: [
      "Planificación del alta iniciada tempranamente durante la hospitalización considerando necesidades biológicas, sociales y funcionales del paciente.",
      "Emisión y entrega obligatoria del informe de alta médica / epicrisis completa que resume diagnósticos, procedimientos, evolución y exámenes relevantes.",
      "Instrucciones por escrito y explicadas al paciente/familia sobre medicamentos prescritos (dosis, horario, duración), signos de alarma y cuidados en el hogar.",
      "Coordinación de citaciones para controles médicos post-alta y retiro o derivación de recetas en farmacia ambulatoria.",
      "Protocolo formal para el manejo del alta contra opinión médica (alta voluntaria) con firma de desistimiento informado."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ACC.4",
    code: "ACC.4",
    chapter: "Acceso a la Atención y Continuidad de la Atención (Access to Care and Continuity)",
    name: "Traslado y Derivación Extrahospitalaria de Pacientes",
    objective: "Regulación y coordinación de los traslados y derivaciones a otros centros de salud para asegurar la estabilidad clínica del paciente durante el transporte.",
    measurableElements: [
      "Criterios explícitos para la derivación de pacientes cuando la organización no cuenta con la capacidad resolutiva o especialidad requerida.",
      "Coordinación previa, comunicación médica directa y confirmación de recepción y disponibilidad de cama en el hospital receptor.",
      "Acompañamiento del paciente durante el traslado por personal de salud competente con equipamiento de soporte vital acorde a la gravedad clínica.",
      "Entrega de copia de la epicrisis, exámenes complementarios y registro del monitoreo y eventos ocurridos durante el trayecto en ambulancia."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 3. EVALUACIÓN DE LOS PACIENTES (AOP)
  // =========================================================================
  {
    id: "AOP.1",
    code: "AOP.1",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Evaluación Integral Inicial Médica y de Enfermería",
    objective: "Todos los pacientes admitidos reciben una evaluación clínica integral, oportuna y estructurada para identificar sus necesidades diagnósticas y terapéuticas.",
    measurableElements: [
      "Evaluación médica inicial documentada dentro de las primeras 24 horas de hospitalización o antes si la condición clínica lo requiere.",
      "Anamnesis completa, antecedentes mórbidos, quirúrgicos, alergias, fármacos habituales y examen físico minucioso registrados en la ficha clínica.",
      "Evaluación de enfermería inicial completada dentro de las primeras 24 horas abarcando signos vitales, necesidades básicas, riesgo de caídas y riesgo de UPP.",
      "Evaluación del dolor mediante escalas visuales/numéricas estandarizadas al ingreso y en cada control de enfermería.",
      "Tamizaje de riesgo nutricional y derivación temprana a especialista en nutrición clínica ante pacientes en riesgo."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "AOP.5",
    code: "AOP.5",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Servicios de Laboratorio Clínico y Banco de Sangre",
    objective: "Los servicios de laboratorio clínico y medicina transfusional operan bajo estrictos controles de calidad, bioseguridad y oportunidad diagnóstica.",
    measurableElements: [
      "Disponibilidad de catálogo oficial de exámenes de laboratorio con tiempos de respuesta (TAT) definidos para urgencias y rutina.",
      "Programa riguroso de control de calidad interno diario y participación en programas de evaluación externa de calidad (PEEC / RIQAS).",
      "Protocolos de bioseguridad, manejo de residuos biológicos y mantenimiento preventivo calibrado de analizadores automatizados.",
      "Trazabilidad completa de unidades de sangre y hemoderivados desde la recepción hasta la transfusión con pruebas de compatibilidad pretransfusional."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "AOP.6",
    code: "AOP.6",
    chapter: "Evaluación de los Pacientes (Assessment of Patients)",
    name: "Servicios de Radiología e Imagenología Diagnóstica",
    objective: "Garantizar la realización segura de exámenes de imagenología con protección radiológica y entrega oportuna de informes radiológicos interpretados.",
    measurableElements: [
      "Programa formal de protección radiológica para pacientes y personal ocupacionalmente expuesto según normas regulatorias vigentes.",
      "Informes radiológicos emitidos y firmados por médicos radiólogos dentro de plazos estipulados según urgencia clínica.",
      "Verificación de antecedentes de alergias a medios de contraste iodados/gadolinio y función renal previa (creatinina/VFG).",
      "Control de mantenimiento periódico y dosimetría de equipos de rayos X, tomografía computarizada y resonancia magnética."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 4. ATENCIÓN DE LOS PACIENTES (COP)
  // =========================================================================
  {
    id: "COP.1",
    code: "COP.1",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Plan de Atención Integrado e Individualizado",
    objective: "La atención de cada paciente es planificada y coordinada de forma multidisciplinaria mediante un plan de cuidados individualizado actualizado según la evolución clínica.",
    measurableElements: [
      "Elaboración de un plan de cuidados multidisciplinario individualizado registrado en la ficha clínica dentro de las primeras 24 horas.",
      "Integración de metas terapéuticas compartidas entre el equipo médico, enfermería, farmacia y profesionales de apoyo terapéutico.",
      "Actualización y reevaluación periódica del plan de atención conforme a la respuesta al tratamiento y cambios en el estado del paciente.",
      "Indicaciones médicas claras, fechadas, con firma, timbre o firma electrónica avanzada del profesional emisor."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.3",
    code: "COP.3",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Atención de Pacientes de Alto Riesgo y Servicios Críticos",
    objective: "Políticas y protocolos estandarizados para la atención segura de pacientes en estado crítico, paro cardiorrespiratorio, coma o soporte vital avanzado.",
    measurableElements: [
      "Protocolos clínicos específicos para la atención en Unidades de Paciente Crítico (UCI / UTI) con ratios de enfermería/paciente normados.",
      "Disponibilidad de carros de paro estandarizados con desfibrilador operativo, revisados y sellados diariamente en todas las áreas clínicas.",
      "Activación de Equipos de Respuesta Rápida (ERR) / Código Azul ante deterioro clínico agudo o signos de alarma tempranos.",
      "Protocolos para la prevención de eventos adversos en ventilación mecánica invasiva y monitoreo hemodinámico continuo."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "COP.8",
    code: "COP.8",
    chapter: "Atención de los Pacientes (Care of Patients)",
    name: "Terapia Transfusional y Manejo de Hemoderivados",
    objective: "Administración segura y controlada de sangre y componentes sanguíneos con monitorización estrecha de posibles reacciones adversas.",
    measurableElements: [
      "Consentimiento informado específico firmado por el paciente o representante legal previo a la transfusión de hemoderivados.",
      "Verificación de doble chequeo independiente de la unidad de sangre, compatibilidad y datos del receptor a pie de cama.",
      "Monitorización estricta de signos vitales antes, a los 15 minutos de iniciada la transfusión y al término del procedimiento.",
      "Protocolo de notificación y manejo inmediato ante sospecha de reacción transfusional adversa o hemólisis aguda."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 5. ANESTESIA Y ATENCIÓN QUIRÚRGICA (ASC)
  // =========================================================================
  {
    id: "ASC.1",
    code: "ASC.1",
    chapter: "Anestesia y Atención Quirúrgica (Anesthesia and Surgical Care)",
    name: "Servicios de Anestesia y Sedación Moderada/Profunda",
    objective: "Los servicios de anestesia y sedación son dirigidos por profesionales calificados y cuentan con protocolos homogéneos en toda la institución.",
    measurableElements: [
      "Todos los actos anestésicos y procedimientos de sedación profunda son administrados exclusivamente por anestesiólogos o personal médico acreditado.",
      "Evaluación preanestésica documentada previa a la inducción que incluye clasificación ASA, evaluación de vía aérea difícil y ayuno.",
      "Plan anestésico individualizado discutido con el paciente con consentimiento informado de anestesia firmado.",
      "Disponibilidad permanente de monitorización fisiológica continua (ECG, PANI, pulsioximetría, capnografía) durante todo el acto quirúrgico."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "ASC.7",
    code: "ASC.7",
    chapter: "Anestesia y Atención Quirúrgica (Anesthesia and Surgical Care)",
    name: "Cuidados Postanestésicos y Criterios de Alta de Recuperación",
    objective: "Monitorización y recuperación segura de los pacientes en la Unidad de Recuperación Postanestésica (URPA) con criterios objetivos de egreso.",
    measurableElements: [
      "Monitoreo continuo de signos vitales, nivel de conciencia, saturación de oxígeno y dolor en URPA.",
      "Uso de escala estandarizada de recuperación postanestésica (ej. Escala de Aldrete modificada) para evaluar la recuperación.",
      "Criterios explícitos y documentados de alta de recuperación hacia la sala de hospitalización o domicilio en cirugía mayor ambulatoria.",
      "Registro de la indicación médica de egreso de URPA firmada por el médico anestesiólogo responsable."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 6. GESTIÓN Y USO DE MEDICAMENTOS (MMU)
  // =========================================================================
  {
    id: "MMU.1",
    code: "MMU.1",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Organización y Gestión del Sistema de Medicamentos",
    objective: "La organización cuenta con una gestión centralizada y segura para la selección, adquisición, almacenamiento y dispensación de medicamentos.",
    measurableElements: [
      "Existencia de un Arsenal Farmacológico institucional oficial aprobado por el Comité de Farmacia y Terapéutica.",
      "Control de inventario, condiciones normadas de temperatura y humedad en almacenes y refrigeradores de farmacia con registro diario.",
      "Gestión de medicamentos controlados (estupefacientes y psicotrópicos) bajo libro foliado oficial, doble llave y arqueos periódicos.",
      "Sistema de trazabilidad para lotes, fechas de vencimiento y protocolos de retiro oportuno de fármacos expirados o recall sanitario."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.4",
    code: "MMU.4",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Prescripción y Ordenamiento Médico Seguro",
    objective: "Las prescripciones médicas son legibles, completas, fechadas y registradas según estándares institucionales para prevenir errores de medicación.",
    measurableElements: [
      "Prescripción médica completa con nombre genérico, dosis exacta, unidad de medida, vía de administración, frecuencia y diagnóstico asociado.",
      "Verificación obligatoria de antecedentes de alergias farmacológicas antes de emitir cualquier receta o primera dosis.",
      "Proceso sistemático de conciliación medicamentosa al ingreso, en cada traslado interservicio y al egreso hospitalario.",
      "Políticas institucionales claras sobre abreviaturas prohibidas de alto riesgo para evitar confusiones de dosificación."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "MMU.6",
    code: "MMU.6",
    chapter: "Gestión y Uso de Medicamentos (Medication Management and Use)",
    name: "Administración Segura de Medicamentos y Monitoreo",
    objective: "Proceso seguro para la administración de medicamentos verificando sistemáticamente los correctos de enfermería y vigilando efectos adversos.",
    measurableElements: [
      "Verificación estricta de los correctos de administración: Paciente correcto, Medicamento correcto, Dosis correcta, Vía correcta, Hora correcta y Registro oportuno.",
      "Registro inmediato de la administración o motivo de suspensión/rechazo en la hoja de enfermería y ficha clínica electrónica.",
      "Monitoreo clínico del paciente posterior a la administración de medicamentos para evaluar eficacia y detectar reacciones adversas (RAM).",
      "Notificación obligatoria y oportuna de sospechas de Reacciones Adversas a Medicamentos (RAM) al Centro Nacional de Farmacovigilancia."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 7. EDUCACIÓN DEL PACIENTE Y LA FAMILIA (PFE)
  // =========================================================================
  {
    id: "PFE.1",
    code: "PFE.1",
    chapter: "Educación del Paciente y la Familia (Patient and Family Education)",
    name: "Educación Integral y Participación en el Autocuidado",
    objective: "La organización proporciona educación estructurada y adaptada culturalmente al paciente y familia para fomentar el autocuidado y la toma de decisiones informadas.",
    measurableElements: [
      "Evaluación inicial de las necesidades educativas del paciente considerando idioma, nivel de alfabetización, limitaciones sensoriales y preferencias culturales.",
      "Educación personalizada sobre el uso seguro de medicamentos prescritos, interacciones con alimentos, dieta especial y manejo del dolor.",
      "Instrucción práctica sobre el uso de dispositivos médicos en el hogar (ej. glucómetros, inhaladores, oxígeno domiciliario, sondas).",
      "Registro documental en la ficha clínica de la educación brindada y verificación de la comprensión por parte del paciente o cuidador."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 8. MEJORA DE LA CALIDAD Y SEGURIDAD (QPS)
  // =========================================================================
  {
    id: "QPS.1",
    code: "QPS.1",
    chapter: "Mejora de la Calidad y Seguridad del Paciente (Quality Improvement and Patient Safety)",
    name: "Programa Institucional de Calidad y Seguridad del Paciente",
    objective: "Liderazgo y ejecución de un programa integral y continuo de mejora de la calidad y gestión del riesgo clínico en toda la organización.",
    measurableElements: [
      "Programa anual de Calidad y Seguridad del Paciente aprobado por la Dirección y difundido a todos los estamentos del hospital.",
      "Selección y medición mensual de indicadores clínicos prioritarios (mortalidad, reingresos, infecciones, complicaciones quirúrgicas).",
      "Uso de metodología formal para el análisis causa-raíz (ACR / Diagrama de Ishikawa) ante la ocurrencia de eventos centinela o cuasifallas graves.",
      "Implementación, seguimiento y reevaluación de planes de acción correctiva derivados de auditorías clínicas y comités técnicos."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 9. PREVENCIÓN Y CONTROL DE INFECCIONES (PCI)
  // =========================================================================
  {
    id: "PCI.1",
    code: "PCI.1",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Programa de Control de IAAS y Vigilancia Epidemiológica",
    objective: "Programa institucional exhaustivo para la vigilancia, prevención y control de infecciones asociadas a la atención de salud (IAAS) y resistencia antimicrobiana.",
    measurableElements: [
      "Comité de IAAS multidisciplinario liderado por médico infectólogo y enfermera de control de infecciones con dedicación exclusiva.",
      "Vigilancia epidemiológica activa de infecciones de sitio quirúrgico, neumonía asociada a ventilación mecánica, ITU por catéter urinario e infecciones del torrente sanguíneo por CVC.",
      "Protocolos estrictos de aislamiento de contacto, gotas y aéreo para pacientes con microorganismos multirresistentes o patógenos emergentes.",
      "Programa de Optimización de Uso de Antimicrobianos (PROA) para prevenir la resistencia bacteriana institucional."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },
  {
    id: "PCI.5",
    code: "PCI.5",
    chapter: "Prevención y Control de Infecciones (Prevention and Control of Infections)",
    name: "Esterilización y Desinfección de Instrumental Médico",
    objective: "Procesos estandarizados y trazables de limpieza, desinfección de alto nivel (DAN) y esterilización de instrumental y dispositivos de reuso.",
    measurableElements: [
      "Central de Esterilización centralizada con flujo unidireccional estricto (área sucia, área de preparación y área estéril).",
      "Monitoreo físico, químico y biológico en cada ciclo de esterilización con archivo de registros por el tiempo normado.",
      "Trazabilidad completa mediante código de barras de cada caja de instrumental desde el lavado hasta el uso en pabellón quirúrgico.",
      "Almacenamiento de material estéril en condiciones controladas de temperatura, humedad y rotación de stock PEPS."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 10. GOBERNANZA, LIDERAZGO Y DIRECCIÓN (GLD)
  // =========================================================================
  {
    id: "GLD.1",
    code: "GLD.1",
    chapter: "Gobernanza, Liderazgo y Dirección (Governance, Leadership, and Direction)",
    name: "Gobernanza y Responsabilidad Directiva",
    objective: "La estructura directiva y el gobierno institucional establecen la misión, visión, políticas éticas y garantizan los recursos para una atención de calidad y segura.",
    measurableElements: [
      "Estructura organizacional y organigrama formalmente definidos con líneas de autoridad y rendición de cuentas transparentes.",
      "Asignación presupuestaria garantizada para los programas de calidad, seguridad del paciente y mantenimiento de infraestructura crítica.",
      "Código de ética institucional y mecanismos formales para resolver dilemas éticos a través del Comité de Ética Asistencial.",
      "Evaluación periódica del desempeño de los líderes de servicios clínicos y administrativos."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 11. GESTIÓN Y SEGURIDAD DE INSTALACIONES (FMS)
  // =========================================================================
  {
    id: "FMS.1",
    code: "FMS.1",
    chapter: "Gestión y Seguridad de Instalaciones (Facility Management and Safety)",
    name: "Plan Maestro de Seguridad de Instalaciones y Gestión de Emergencias",
    objective: "La organización planifica e implementa un programa integral para garantizar un entorno físico seguro, mantenimiento preventivo de sistemas críticos y preparación ante catástrofes.",
    measurableElements: [
      "Plan maestro de seguridad de instalaciones que abarca seguridad física, materiales peligrosos, emergencias y equipos médicos.",
      "Plan de emergencias y desastres internos/externos con realización anual de simulacros de evacuación y manejo de víctimas múltiples.",
      "Mantenimiento preventivo e inspección periódica de sistemas de gases medicinales, red eléctrica de respaldo (generadores) y suministro de agua potable.",
      "Sistemas de detección temprana de incendios, rociadores, extintores vigentes y brigada de emergencia capacitada."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 12. CALIFICACIONES Y EDUCACIÓN DEL PERSONAL (SQE)
  // =========================================================================
  {
    id: "SQE.1",
    code: "SQE.1",
    chapter: "Calificaciones y Educación del Personal (Staff Qualifications and Education)",
    name: "Planificación, Selección y Competencias del Personal",
    objective: "Procesos rigurosos para la selección, verificación de credenciales, asignación de privilegios clínicos y capacitación continua del personal de salud.",
    measurableElements: [
      "Verificación formal de títulos, diplomas, especialidades y registro en la Superintendencia de Salud (RNPI) para todos los profesionales médicos y no médicos.",
      "Proceso formal de asignación y renovación periódica de privilegios clínicos para procedimientos específicos según experiencia y competencias demostradas.",
      "Programa de inducción institucional y orientación específica de servicio para todo el personal nuevo.",
      "Programa anual de capacitación continua en soporte vital (BLS / ACLS), seguridad del paciente y prevención de IAAS."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 13. GESTIÓN DE LA INFORMACIÓN (MOI)
  // =========================================================================
  {
    id: "MOI.1",
    code: "MOI.1",
    chapter: "Gestión de la Información (Management of Information)",
    name: "Integridad, Seguridad y Confidencialidad de la Ficha Clínica",
    objective: "La ficha clínica del paciente es única, protegida en su confidencialidad, accesible oportunamente para el equipo de salud autorizado y completa en todos sus registros.",
    measurableElements: [
      "Cada paciente cuenta con una ficha clínica única que concentra todas las atenciones ambulatorias, de urgencia y hospitalización.",
      "Mecanismos estrictos de autenticación, control de acceso por perfiles y auditoría de accesos a la Ficha Clínica Electrónica para resguardar el secreto médico.",
      "Registros clínicos legibles, completos, fechados, cronológicos con identificación inequívoca del profesional emisor mediante firma electrónica o firma y timbre.",
      "Procedimientos estandarizados de custodia, respaldo digital periódico (backup) y plan de contingencia ante caída del sistema informático."
    ],
    category: "HEALTHCARE_MANAGEMENT",
    supportStatus: "CUMPLIDO"
  },

  // =========================================================================
  // 14. ATENCIÓN CENTRADA EN EL PACIENTE (PCC)
  // =========================================================================
  {
    id: "PCC.1",
    code: "PCC.1",
    chapter: "Atención Centrada en el Paciente (Patient-Centered Care)",
    name: "Derechos del Paciente, Consentimiento Informado y Privacidad",
    objective: "Respeto irrestricto de los derechos de los pacientes, su autonomía, dignidad, confidencialidad y obtención obligatoria del consentimiento informado.",
    measurableElements: [
      "Difusión visible y cumplimiento de la Carta de Derechos y Deberes de los Pacientes conforme a la Ley 20.584.",
      "Obtención del consentimiento informado por escrito, previo a cualquier procedimiento quirúrgico, anestésico, transfusión o procedimiento invasivo mayor, tras explicar beneficios, riesgos y alternativas.",
      "Resguardo de la privacidad e intimidad corporal del paciente durante exámenes físicos, procedimientos y traslados dentro del establecimiento.",
      "Canalización, investigación y respuesta oportuna a reclamos, sugerencias y felicitaciones a través de la oficina OIRS y comités éticos."
    ],
    category: "PATIENT_CENTERED",
    supportStatus: "CUMPLIDO"
  }
];
