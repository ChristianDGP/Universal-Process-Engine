import React, { useState, useRef } from "react";
import {
  Calculator, Check, AlertCircle, Sparkles, Variable, RotateCcw, Copy, Code, Eye
} from "lucide-react";

interface FormulaEditorProps {
  initialFormula: string;
  onSave: (formula: string) => void;
  onCancel?: () => void;
  isInline?: boolean;
}

// Common BPM & KPI Variables for Quick Insertion
const PROCESS_VARIABLES = [
  { label: "Artículos Entregados a Unidad Clínica", token: "[Número de articulos entregados a unidad clinica en periodo determinado]", desc: "Insumos entregados exitosamente" },
  { label: "Total Artículos Programados", token: "[Número total de articulos programados para la unidad clinica en periodo determinado]", desc: "Plan total de insumos programados" },
  { label: "Solicitudes Atendidas en SLA", token: "[Número de solicitudes atendidas en SLA]", desc: "Casos dentro del plazo establecido" },
  { label: "Total Solicitudes Recibidas", token: "[Número total de solicitudes recibidas en periodo determinado]", desc: "Total de casos ingresados al proceso" },
  { label: "Solicitudes Sin Reproceso", token: "[Número de solicitudes sin reproceso ni observaciones]", desc: "Trámites conformes al primer intento" },
  { label: "Puntaje de Satisfacción Obtenido", token: "[Puntaje total de satisfacción obtenido]", desc: "Suma de calificaciones de usuarios" },
  { label: "Tiempo SLA Objetivo", token: "[Tiempo SLA Objetivo]", desc: "Duración estándar definida (horas)" },
  { label: "Tiempo Real de Ejecución", token: "[Tiempo Real de Ejecución]", desc: "Duración real acumulada (horas)" },
  { label: "Gasto Operativo Incurrido", token: "[Gasto Operativo Incurrido ($)]", desc: "Costo real del proceso ($)" },
  { label: "Presupuesto Asignado", token: "[Presupuesto Asignado ($)]", desc: "Presupuesto proyectado ($)" },
];

// Mathematical Operators
const MATH_OPERATORS = [
  { symbol: "+", label: "Suma", insert: " + " },
  { symbol: "-", label: "Resta", insert: " - " },
  { symbol: "×", label: "Multiplicación", insert: " * " },
  { symbol: "÷", label: "División", insert: " / " },
  { symbol: "(", label: "Abre Paréntesis", insert: "(" },
  { symbol: ")", label: "Cierra Paréntesis", insert: ")" },
  { symbol: "%", label: "Porcentaje (100)", insert: " * 100" },
  { symbol: "^", label: "Potencia", insert: " ^ " },
];

// Math Functions
const MATH_FUNCTIONS = [
  { symbol: "Σ", label: "Suma Total", insert: "SUM(" },
  { symbol: "AVG", label: "Promedio (μ)", insert: "AVG(" },
  { symbol: "COUNT", label: "Conteo (N)", insert: "COUNT(" },
  { symbol: "MIN", label: "Valor Mínimo", insert: "MIN(" },
  { symbol: "MAX", label: "Valor Máximo", insert: "MAX(" },
  { symbol: "STDEV", label: "Desviación Estándar (σ)", insert: "STDEV(" },
];

// Preset Formula Templates
const FORMULA_TEMPLATES = [
  {
    title: "Entrega a Unidad Clínica (%)",
    formula: "([Número de articulos entregados a unidad clinica en periodo determinado] / [Número total de articulos programados para la unidad clinica en periodo determinado]) * 100",
    desc: "Mide el cumplimiento de entrega de insumos sobre la programación clínica."
  },
  {
    title: "% Cumplimiento SLA de Atención",
    formula: "([Número de solicitudes atendidas en SLA] / [Número total de solicitudes recibidas en periodo determinado]) * 100",
    desc: "Mide el porcentaje de casos procesados dentro del tiempo esperado."
  },
  {
    title: "Tasa de Conformidad (First Time Right)",
    formula: "([Número de solicitudes sin reproceso ni observaciones] / [Número total de solicitudes recibidas en periodo determinado]) * 100",
    desc: "Calcula el porcentaje de trámites conforme al primer intento."
  },
  {
    title: "Índice de Eficiencia de Tiempo",
    formula: "([Tiempo SLA Objetivo] / [Tiempo Real de Ejecución]) * 100",
    desc: "Compara el tiempo de respuesta presupuestado contra el ejecutado."
  },
  {
    title: "Costo Promedio por Caso Operativo",
    formula: "[Gasto Operativo Incurrido ($)] / [Número total de solicitudes recibidas en periodo determinado]",
    desc: "Divide el gasto operativo total entre las instancias cerradas."
  }
];

export function parseFractionExpression(formula: string) {
  if (!formula || !formula.trim()) return null;

  let clean = formula.trim();

  // Strip prefix KPI = or kpi =
  clean = clean.replace(/^KPI\s*=\s*/i, "");

  // Check for division sign
  if (!clean.includes("/") && !clean.includes("÷")) return null;

  // Split multiplier if exists at the end, e.g. * 100, x 100, × 100, *100, x100, %
  let multiplier = "";
  const multMatch = clean.match(/\)\s*[\*xX×]?\s*(\d+(?:\.\d+)?)$/i) || clean.match(/[\*xX×]\s*(\d+(?:\.\d+)?)$/i);
  if (multMatch) {
    multiplier = `x100`;
    clean = clean.substring(0, multMatch.index).trim();
  } else if (clean.endsWith("%")) {
    multiplier = "x100";
    clean = clean.replace(/%$/, "").trim();
  }

  // Strip surrounding parentheses if present around the entire fraction: ( NUM / DEN )
  if (clean.startsWith("(") && clean.endsWith(")")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }

  const slashIndex = clean.includes("/") ? clean.indexOf("/") : clean.indexOf("÷");
  if (slashIndex === -1) return null;

  let numStr = clean.substring(0, slashIndex).trim();
  let denStr = clean.substring(slashIndex + 1).trim();

  // Strip brackets or parens if wrapped around numerator/denominator
  numStr = numStr.replace(/^[\(\[]/, "").replace(/[\)\]]$/, "").trim();
  denStr = denStr.replace(/^[\(\[]/, "").replace(/[\)\]]$/, "").trim();

  if (!numStr || !denStr) return null;

  return {
    numerator: numStr,
    denominator: denStr,
    multiplier: multiplier || (formula.includes("100") ? "x100" : "")
  };
}

export function parseFormulaTokens(formula: string) {
  if (!formula) return [];
  const regex = /(\[[^\]]+\]|\b[A-Za-z_][A-Za-z0-9_]*\b|\d+(?:\.\d+)?|[\+\-\*\/\(\)\^\%\=])/g;
  const matches = formula.match(regex);
  if (!matches) return [{ type: "raw", value: formula }];

  return matches.map((item) => {
    const trimmed = item.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return { type: "variable", value: trimmed };
    }
    if (["+", "-", "*", "/", "×", "÷"].includes(trimmed)) {
      return { type: "operator", value: trimmed === "*" ? "×" : trimmed === "/" ? "÷" : trimmed };
    }
    if (["(", ")"].includes(trimmed)) {
      return { type: "parenthesis", value: trimmed };
    }
    if (!isNaN(Number(trimmed))) {
      return { type: "number", value: trimmed };
    }
    if (["SUM", "AVG", "COUNT", "MIN", "MAX", "STDEV"].includes(trimmed.toUpperCase())) {
      return { type: "function", value: trimmed.toUpperCase() };
    }
    return { type: "text", value: trimmed };
  });
}

// Visualizer component for mathematical fraction rendering matching user's image
export function FormulaVisualizer({
  formula,
  showToggle = true,
}: {
  formula: string;
  showToggle?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"math" | "tokens">("math");
  const fractionData = parseFractionExpression(formula);

  if (!formula || formula.trim() === "") {
    return (
      <span className="text-xs text-slate-400 font-mono italic">
        Sin fórmula especificada
      </span>
    );
  }

  // MATHEMATICAL FRACTION VIEW MATCHING USER IMAGE (LaTeX style)
  if (viewMode === "math" && fractionData) {
    return (
      <div className="bg-white border border-slate-200/90 p-4 shadow-2xs rounded-xs overflow-x-auto space-y-2">
        <div className="flex items-center justify-center min-w-max py-3 px-4 select-none">
          {/* KPI = */}
          <span className="font-serif italic text-base sm:text-lg text-slate-900 pr-2 font-normal">
            KPI =
          </span>

          {/* Left Parenthesis '(' */}
          <span className="text-4xl sm:text-5xl font-serif font-extralight text-slate-800 leading-none px-0.5 flex items-center -mt-1 select-none">
            (
          </span>

          {/* Fraction Stack */}
          <div className="inline-flex flex-col items-center justify-center px-2 mx-1">
            {/* Numerator */}
            <div className="text-xs sm:text-sm font-serif italic text-slate-900 border-b border-slate-900 pb-1.5 px-3 text-center leading-relaxed font-normal">
              {fractionData.numerator}
            </div>
            {/* Denominator */}
            <div className="text-xs sm:text-sm font-serif italic text-slate-900 pt-1.5 px-3 text-center leading-relaxed font-normal">
              {fractionData.denominator}
            </div>
          </div>

          {/* Right Parenthesis ')' */}
          <span className="text-4xl sm:text-5xl font-serif font-extralight text-slate-800 leading-none px-0.5 flex items-center -mt-1 select-none">
            )
          </span>

          {/* Multiplier e.g. x100 */}
          {fractionData.multiplier && (
            <span className="font-serif italic text-sm sm:text-base text-slate-900 pl-1 font-normal">
              {fractionData.multiplier}
            </span>
          )}
        </div>

        {showToggle && (
          <div className="flex justify-end border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={() => setViewMode("tokens")}
              className="text-[10px] text-slate-500 hover:text-slate-900 font-mono flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Code className="w-3 h-3" />
              <span>Ver Vista de Tokens</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Token-based fallback or explicitly requested mode
  const tokens = parseFormulaTokens(formula);
  return (
    <div className="bg-white border border-slate-200/90 p-3 shadow-2xs rounded-xs space-y-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 font-serif italic text-sm text-slate-900">
        <span>KPI =</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {tokens.map((tok, idx) => {
          if (tok.type === "variable") {
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-slate-100 text-slate-900 border border-slate-300 font-bold px-2 py-0.5 text-[11px] tracking-tight shadow-2xs"
              >
                <Variable className="w-3 h-3 text-slate-700 shrink-0" />
                <span>{tok.value}</span>
              </span>
            );
          }
          if (tok.type === "operator") {
            return (
              <span
                key={idx}
                className="font-black text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-xs font-mono"
              >
                {tok.value}
              </span>
            );
          }
          if (tok.type === "parenthesis") {
            return (
              <span key={idx} className="font-extrabold text-slate-950 text-sm px-0.5">
                {tok.value}
              </span>
            );
          }
          if (tok.type === "function") {
            return (
              <span
                key={idx}
                className="bg-slate-900 text-white font-mono font-bold text-[10px] uppercase px-1.5 py-0.5"
              >
                {tok.value}
              </span>
            );
          }
          if (tok.type === "number") {
            return (
              <span
                key={idx}
                className="font-bold text-slate-900 bg-slate-50 border border-slate-200 px-1.5 py-0.5 font-mono text-xs"
              >
                {tok.value}
              </span>
            );
          }
          return (
            <span key={idx} className="text-slate-800 font-medium">
              {tok.value}
            </span>
          );
        })}
      </div>
      {showToggle && fractionData && (
        <div className="flex justify-end border-t border-slate-100 pt-1.5">
          <button
            type="button"
            onClick={() => setViewMode("math")}
            className="text-[10px] text-slate-500 hover:text-slate-900 font-serif italic flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>Ver Formato Fracción Matemática (LaTeX)</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function FormulaEditor({
  initialFormula,
  onSave,
  onCancel,
  isInline = false,
}: FormulaEditorProps) {
  const [formula, setFormula] = useState<string>(initialFormula || "");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Parentheses syntax validation
  const validateSyntax = (text: string) => {
    let balance = 0;
    for (const char of text) {
      if (char === "(") balance++;
      if (char === ")") balance--;
      if (balance < 0) return { valid: false, message: "Paréntesis de cierre insospechado o fuera de orden." };
    }
    if (balance !== 0) return { valid: false, message: "Paréntesis desbalanceados (falta cerrar o abrir)." };
    if (!text.trim()) return { valid: false, message: "La fórmula está vacía." };
    return { valid: true, message: "Sintaxis de expresión correcta." };
  };

  const syntaxStatus = validateSyntax(formula);

  const insertToken = (insertText: string) => {
    if (!inputRef.current) {
      setFormula((prev) => prev + insertText);
      return;
    }

    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const current = formula;
    const updated = current.substring(0, start) + insertText + current.substring(end);

    setFormula(updated);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = start + insertText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border border-slate-300 p-5 space-y-5 shadow-sm text-slate-900 ${isInline ? "" : "max-w-3xl mx-auto"}`}>
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-950 uppercase tracking-tight flex items-center gap-2">
              Editor de Fórmulas Matemáticas
            </h3>
            <p className="text-xs text-slate-500">
              Cree, modifique y visualice expresiones matemáticas formateadas como fracción
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syntaxStatus.valid ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Sintaxis Válida
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Atención
            </span>
          )}
        </div>
      </div>

      {/* TEXT AREA INPUT */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Expresión Álgebraica (Entrada Directa)
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            {copied ? "¡Copiado!" : "Copiar Fórmula"}
          </button>
        </div>

        <textarea
          ref={inputRef}
          rows={3}
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Escriba o inserte variables y operadores p. ej: ([Número de articulos entregados a unidad clinica...] / [Número total de articulos programados...]) * 100"
          className="w-full border border-slate-300 p-3 font-mono text-xs font-bold text-slate-950 focus:ring-1 focus:ring-slate-950 focus:outline-none bg-slate-50/50 leading-relaxed"
        />

        {!syntaxStatus.valid && formula.trim() !== "" && (
          <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {syntaxStatus.message}
          </p>
        )}
      </div>

      {/* LIVE FORMULA VISUALIZER - MATHEMATICAL FRACTION */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            Vista Previa de Ecuación Matemática (Fracción LaTeX)
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">Renderizado Formal</span>
        </div>
        <FormulaVisualizer formula={formula} showToggle={true} />
      </div>

      {/* INTERACTIVE TOOLBAR TABS */}
      <div className="space-y-4 pt-1">
        {/* Process Variables Section */}
        <div className="space-y-2">
          <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Variable className="w-3.5 h-3.5 text-slate-700" />
            Variables de Proceso / Dominio Clínico
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PROCESS_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertToken(v.token)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={v.desc}
              >
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Math Operators & Functions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Operadores Básicos
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MATH_OPERATORS.map((op) => (
                <button
                  key={op.label}
                  type="button"
                  onClick={() => insertToken(op.insert)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-950 border border-slate-300 text-xs font-mono font-black shadow-2xs cursor-pointer transition-colors"
                  title={op.label}
                >
                  {op.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Funciones Matemáticas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MATH_FUNCTIONS.map((fn) => (
                <button
                  key={fn.label}
                  type="button"
                  onClick={() => insertToken(fn.insert)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold cursor-pointer transition-colors"
                  title={fn.label}
                >
                  {fn.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BPM Formula Templates */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Plantillas de Fórmulas Matemáticas
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FORMULA_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.title}
                type="button"
                onClick={() => setFormula(tmpl.formula)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left cursor-pointer transition-colors group"
              >
                <span className="block text-xs font-bold text-slate-950 group-hover:text-blue-700">
                  {tmpl.title}
                </span>
                <span className="block text-[11px] font-mono text-slate-600 mt-0.5 truncate">
                  {tmpl.formula}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setFormula("")}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpiar
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(formula)}
            className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            Aplicar Fórmula
          </button>
        </div>
      </div>
    </div>
  );
}
