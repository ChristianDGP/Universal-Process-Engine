import React, { useState, useEffect, useRef } from "react";
import { ProcessDefinition } from "../types";
import { PRESETS, BLANK_PROCESS_PRESET } from "../presets";
import { Sparkles, Loader2, BookmarkPlus, Library, Trash2, Download, Upload, Check, X, BookOpen, FileText, RotateCcw, Search, ChevronDown, HardDrive, Database, ShieldCheck, FileDown, FileUp, AlertTriangle, RefreshCw, Cloud, CloudCheck, CloudOff, Zap, ShieldAlert, Lock, FolderTree, Layers, Tag, Filter } from "lucide-react";
import { subscribeToCloudProcesses, saveProcessToCloud, deleteProcessFromCloud, bulkSyncProcessesToCloud, SavedProcessEntry } from "../firebaseSync";
import { generateFallbackProcess } from "../lib/processTemplateGenerator";
import { UserRole } from "../firebase";
import {
  TaxonomyItem,
  getStoredTaxonomy,
  saveStoredTaxonomy,
  resetTaxonomyToDefault,
  matchProcessToTaxonomy,
  parseTaxonomyCSV,
  taxonomyToCSV
} from "../taxonomy";

interface ProcessSelectorProps {
  currentProcess: ProcessDefinition;
  onProcessSelect: (process: ProcessDefinition) => void;
  onProcessUpdate?: (process: ProcessDefinition) => void;
  userRole?: UserRole;
}

export default function ProcessSelector({ currentProcess, onProcessSelect, userRole = "admin" }: ProcessSelectorProps) {
  const isAdmin = userRole === "admin";
  const [customName, setCustomName] = useState(() => {
    return sessionStorage.getItem("upe_custom_name_draft") || "";
  });
  const [customContext, setCustomContext] = useState(() => {
    return sessionStorage.getItem("upe_custom_context_draft") || "";
  });

  useEffect(() => {
    sessionStorage.setItem("upe_custom_name_draft", customName);
  }, [customName]);

  useEffect(() => {
    sessionStorage.setItem("upe_custom_context_draft", customContext);
  }, [customContext]);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [wordParsing, setWordParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Library modal & state
  const [showLibrary, setShowLibrary] = useState(false);
  const [savedProcesses, setSavedProcesses] = useState<SavedProcessEntry[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // In-app confirm modal state (replacing browser native confirm/alert)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);

  // Cloud Firebase state
  const [cloudConnected, setCloudConnected] = useState<boolean>(true);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Administration & Backup state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [adminMsg, setAdminMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Taxonomy & Structure State
  const [taxonomy, setTaxonomy] = useState<TaxonomyItem[]>(() => getStoredTaxonomy());
  const [libraryTab, setLibraryTab] = useState<"processes" | "taxonomy">("processes");
  const [filterMatchTab, setFilterMatchTab] = useState<"all" | "matched" | "others">("all");
  const [searchTaxonomyQuery, setSearchTaxonomyQuery] = useState("");

  // Active Process Taxonomy Filter & Selector State
  const [filterMacro, setFilterMacro] = useState<string>("");
  const [filterProc, setFilterProc] = useState<string>("");
  const [filterMicro, setFilterMicro] = useState<string>("");
  const [isMicroDropdownOpen, setIsMicroDropdownOpen] = useState<boolean>(false);
  const microComboRef = useRef<HTMLDivElement>(null);

  // New taxonomy node form state
  const [newMacro, setNewMacro] = useState("");
  const [newProc, setNewProc] = useState("");
  const [newMicro, setNewMicro] = useState("");
  const [taxMsg, setTaxMsg] = useState<string | null>(null);

  // Synchronize state with current active process when it changes
  useEffect(() => {
    if (currentProcess) {
      const match = matchProcessToTaxonomy(currentProcess, taxonomy);
      if (match.isMatched) {
        setFilterMacro(match.macroproceso);
        setFilterProc(match.proceso);
        setFilterMicro(match.microproceso);
      } else {
        setFilterMacro(currentProcess.macroproceso || "");
        setFilterProc(currentProcess.proceso || "");
        setFilterMicro(currentProcess.microproceso || "");
      }
    }
  }, [currentProcess, taxonomy]);

  // Click outside to close microproceso dropdown
  useEffect(() => {
    const handleClickOutsideMicro = (event: MouseEvent) => {
      if (microComboRef.current && !microComboRef.current.contains(event.target as Node)) {
        setIsMicroDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideMicro);
    return () => document.removeEventListener("mousedown", handleClickOutsideMicro);
  }, []);

  // Function: Assimilate all existing processes to Taxonomy structure
  const handleAssimilateProcesses = async () => {
    try {
      setCloudSyncing(true);
      let matchedCount = 0;
      let othersCount = 0;

      const updated = savedProcesses.map((entry) => {
        const matchRes = matchProcessToTaxonomy(entry.process, taxonomy);
        const updatedProc: ProcessDefinition = {
          ...entry.process,
          macroproceso: matchRes.macroproceso,
          proceso: matchRes.proceso,
          microproceso: matchRes.microproceso
        };
        if (matchRes.isMatched) {
          matchedCount++;
        } else {
          othersCount++;
        }
        return {
          ...entry,
          process: updatedProc
        };
      });

      setSavedProcesses(updated);
      localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));
      await bulkSyncProcessesToCloud(updated);

      // Also assimilate current active process
      const activeMatch = matchProcessToTaxonomy(currentProcess, taxonomy);
      if (activeMatch.isMatched || !currentProcess.macroproceso) {
        onProcessSelect({
          ...currentProcess,
          macroproceso: activeMatch.macroproceso,
          proceso: activeMatch.proceso,
          microproceso: activeMatch.microproceso
        });
      }

      setCloudSyncing(false);
      setSaveSuccessMsg(
        `¡Proceso de asimilación completado! ${matchedCount} diseño(s) asimilados con éxito a la estructura propuesta y ${othersCount} asignados a "Otros / Sin Clasificar".`
      );
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error(err);
      setCloudSyncing(false);
      setError("Error durante la asimilación de documentos.");
    }
  };

  // Function: Add node to taxonomy
  const handleAddTaxonomyNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacro.trim() || !newProc.trim() || !newMicro.trim()) {
      setTaxMsg("Por favor complete los 3 campos: Macroproceso, Proceso y Microproceso.");
      return;
    }
    const newNode: TaxonomyItem = {
      id: `tax_custom_${Date.now()}`,
      macroproceso: newMacro.trim(),
      proceso: newProc.trim(),
      microproceso: newMicro.trim()
    };
    const updated = [newNode, ...taxonomy];
    setTaxonomy(updated);
    saveStoredTaxonomy(updated);
    setNewMacro("");
    setNewProc("");
    setNewMicro("");
    setTaxMsg("Nivel de estructura añadido exitosamente a la taxonomía.");
    setTimeout(() => setTaxMsg(null), 3000);
  };

  // Function: Delete taxonomy node
  const handleDeleteTaxonomyNode = (id: string) => {
    const updated = taxonomy.filter((t) => t.id !== id);
    setTaxonomy(updated);
    saveStoredTaxonomy(updated);
  };

  // Function: Reset taxonomy to official 92 default items
  const handleResetTaxonomyToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: "Reestablecer Estructura Oficial",
      message: "¿Deseas reestablecer la estructura taxonómica oficial de 92 microprocesos? Se restaurarán los elementos originales.",
      confirmText: "Reestablecer",
      confirmVariant: "danger",
      onConfirm: () => {
        const def = resetTaxonomyToDefault();
        setTaxonomy(def);
        setTaxMsg("Estructura taxonómica reestablecida a la oficial de 92 microprocesos.");
        setTimeout(() => setTaxMsg(null), 3000);
      }
    });
  };

  // Function: Export taxonomy as CSV
  const handleExportTaxonomyCSV = () => {
    const csvContent = taxonomyToCSV(taxonomy);
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Estructura_Taxonomica_Procesos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Function: Import taxonomy from CSV file
  const handleImportTaxonomyCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseTaxonomyCSV(content);
        if (parsed.length > 0) {
          setTaxonomy(parsed);
          saveStoredTaxonomy(parsed);
          setTaxMsg(`¡Estructura importada exitosamente con ${parsed.length} microprocesos!`);
          setTimeout(() => setTaxMsg(null), 4000);
        } else {
          setTaxMsg("El archivo CSV no contiene registros válidos (Formato requerido: MACROPROCESO;PROCESO;MICROPROCESO).");
        }
      } catch (err) {
        setTaxMsg("Error al procesar el archivo CSV.");
      } finally {
        e.target.value = "";
      }
    };
  };

  // Subscribe to Firebase Cloud Firestore for real-time process synchronization
  useEffect(() => {
    // Initial load from localStorage for quick render
    try {
      const stored = localStorage.getItem("upe_saved_processes_v1");
      if (stored) {
        setSavedProcesses(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading library from localStorage:", err);
    }

    // Connect real-time Firebase Firestore listener
    const unsubscribe = subscribeToCloudProcesses(
      (cloudEntries) => {
        setCloudConnected(true);
        setCloudError(null);
        setSavedProcesses(cloudEntries || []);
        localStorage.setItem("upe_saved_processes_v1", JSON.stringify(cloudEntries || []));
      },
      (err) => {
        console.warn("Firebase Firestore connection status:", err);
        setCloudConnected(false);
        setCloudError(err.message || "Error al conectar con la nube Firebase");
      }
    );

    return () => unsubscribe();
  }, []);

  // Save current process into library and sync to Firebase Cloud
  const handleSaveToLibrary = async () => {
    try {
      setCloudSyncing(true);
      const newEntry: SavedProcessEntry = {
        id: `proc_${Date.now()}`,
        savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
        process: JSON.parse(JSON.stringify(currentProcess))
      };
      const updated = [newEntry, ...savedProcesses.filter(p => p.process.name !== currentProcess.name)];
      setSavedProcesses(updated);
      localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));
      
      // Sync to Firebase Cloud
      await saveProcessToCloud(newEntry);
      setCloudSyncing(false);

      setSaveSuccessMsg(`¡Proceso "${currentProcess.name}" guardado y sincronizado en Firebase Cloud!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setError(null);
    } catch (err) {
      console.error(err);
      setCloudSyncing(false);
      setError("Error al guardar el proceso en la librería local o en Firebase Cloud.");
    }
  };

  // Delete from library and Firebase Cloud
  const handleDeleteFromLibrary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = savedProcesses.find(p => p.id === id);
    const procName = target?.process?.name ? `"${target.process.name}"` : "este diseño";
    setConfirmModal({
      isOpen: true,
      title: "Eliminar diseño guardado",
      message: `¿Deseas eliminar ${procName} de la librería y de Firebase Cloud? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      confirmVariant: "danger",
      onConfirm: async () => {
        const updated = savedProcesses.filter(p => p.id !== id);
        setSavedProcesses(updated);
        localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));
        await deleteProcessFromCloud(id);
        setSaveSuccessMsg("Diseño eliminado correctamente de la librería y Firebase Cloud.");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    });
  };

  // Trigger manual cloud sync
  const handleManualCloudSync = async () => {
    try {
      setCloudSyncing(true);
      await bulkSyncProcessesToCloud(savedProcesses);
      setCloudSyncing(false);
      setAdminMsg({
        type: "success",
        text: `¡Sincronización manual exitosa! ${savedProcesses.length} modelo(s) respaldados en Firebase Firestore.`
      });
    } catch (err: any) {
      setCloudSyncing(false);
      setAdminMsg({
        type: "error",
        text: err.message || "Error al sincronizar con Firebase Cloud."
      });
    }
  };

  // Generate and Download Complete System Backup JSON
  const handleGenerateSystemBackup = () => {
    try {
      const backupPayload = {
        appName: "Sistema de Modelado de Procesos TO-BE (UPE)",
        backupVersion: "1.0",
        generatedAt: new Date().toISOString(),
        formattedDate: new Date().toLocaleString("es-CL"),
        totalProcesses: savedProcesses.length,
        activeProcess: currentProcess.name ? currentProcess : null,
        savedProcesses: savedProcesses
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const dateSuffix = new Date().toISOString().slice(0, 10);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Respaldo_Sistema_UPE_${dateSuffix}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setAdminMsg({
        type: "success",
        text: `¡Respaldo generado con éxito! Archivo de seguridad descargado conteniendo ${savedProcesses.length} proceso(s) guardados.`
      });
    } catch (err) {
      console.error(err);
      setAdminMsg({
        type: "error",
        text: "Ocurrió un error al empaquetar el archivo de respaldo."
      });
    }
  };

  // Restore System Backup JSON
  const handleRestoreSystemBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        let importedEntries: SavedProcessEntry[] = [];
        let loadedCount = 0;

        // Case 1: Standard Full System Backup JSON
        if (parsed && Array.isArray(parsed.savedProcesses)) {
          importedEntries = parsed.savedProcesses;
          loadedCount = importedEntries.length;
        } 
        // Case 2: Array of Saved Process Entries or ProcessDefinitions
        else if (Array.isArray(parsed)) {
          importedEntries = parsed.map((item, idx) => {
            if (item.process && item.process.name) return item;
            return {
              id: `proc_imported_${Date.now()}_${idx}`,
              savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
              process: item
            };
          });
          loadedCount = importedEntries.length;
        }
        // Case 3: Single Process Definition JSON
        else if (parsed && parsed.name && parsed.subprocesses) {
          const singleEntry: SavedProcessEntry = {
            id: `proc_imported_${Date.now()}`,
            savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
            process: parsed
          };
          importedEntries = [singleEntry];
          loadedCount = 1;
        } else {
          throw new Error("El archivo no tiene una estructura de respaldo de procesos válida.");
        }

        let updatedList: SavedProcessEntry[] = [];

        if (restoreMode === "replace") {
          updatedList = importedEntries;
        } else {
          // Merge mode: avoid exact duplicate ids or duplicate names
          const existingNames = new Set(savedProcesses.map(p => p.process.name));
          const newUnique = importedEntries.filter(entry => !existingNames.has(entry.process.name));
          updatedList = [...newUnique, ...savedProcesses];
        }

        setSavedProcesses(updatedList);
        localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updatedList));

        // If active process is included, optionally set it
        if (parsed.activeProcess && parsed.activeProcess.name) {
          onProcessSelect(parsed.activeProcess);
        } else if (importedEntries.length > 0 && restoreMode === "replace") {
          onProcessSelect(importedEntries[0].process);
        }

        setAdminMsg({
          type: "success",
          text: `¡Respaldo restaurado exitosamente! Se procesaron ${loadedCount} modelo(s) de proceso (${restoreMode === "replace" ? "Librería reemplazada" : "Librería combinada"}).`
        });
      } catch (err: any) {
        console.error(err);
        setAdminMsg({
          type: "error",
          text: err.message || "Error al interpretar el archivo de respaldo JSON."
        });
      } finally {
        e.target.value = "";
      }
    };
  };

  // Clear all library entries from local storage and Firebase Cloud
  const handleClearLibrary = () => {
    setConfirmModal({
      isOpen: true,
      title: "Vaciar Toda la Librería",
      message: "⚠️ ¿Está seguro de eliminar TODOS los procesos guardados en la librería y en Firebase Cloud? Esta acción no se puede deshacer a menos que tenga un respaldo descargado.",
      confirmText: "Sí, Vaciar Todo",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          setCloudSyncing(true);
          for (const p of savedProcesses) {
            await deleteProcessFromCloud(p.id);
          }
          setSavedProcesses([]);
          localStorage.removeItem("upe_saved_processes_v1");
          setCloudSyncing(false);
          setAdminMsg({
            type: "success",
            text: "La librería de procesos y la base de datos Firebase Cloud se han eliminado por completo."
          });
        } catch (err: any) {
          console.error(err);
          setCloudSyncing(false);
          setAdminMsg({
            type: "error",
            text: err.message || "Error al vaciar la librería en Firebase Cloud."
          });
        }
      }
    });
  };

  // Export JSON file
  const handleExportJSON = (proc: ProcessDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proc, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${proc.name.replace(/\s+/g, "_")}_TO_BE.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Word document (.docx)
  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWordParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const response = await fetch("/api/parse-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64Docx: base64Data, fileData: base64Data, fileName: file.name })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Error al procesar el archivo Word.");
          }

          const parsedProcess: ProcessDefinition = await response.json();
          onProcessSelect(parsedProcess);

          // Automatically save to library
          const newEntry: SavedProcessEntry = {
            id: `proc_${Date.now()}`,
            savedAt: new Date().toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }),
            process: JSON.parse(JSON.stringify(parsedProcess))
          };
          const updated = [newEntry, ...savedProcesses.filter(p => p.process.name !== parsedProcess.name)];
          setSavedProcesses(updated);
          localStorage.setItem("upe_saved_processes_v1", JSON.stringify(updated));

          setSaveSuccessMsg(`¡Informe Word "${file.name}" importado e incorporado a la librería exitosamente!`);
          setTimeout(() => setSaveSuccessMsg(null), 5000);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Error al interpretar la estructura del documento Word.");
        } finally {
          setWordParsing(false);
          e.target.value = "";
        }
      };
    } catch (err: any) {
      console.error(err);
      setError("No se pudo leer el archivo seleccionado.");
      setWordParsing(false);
    }
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.name && parsed.subprocesses) {
            onProcessSelect(parsed);
            setSaveSuccessMsg(`¡Proceso "${parsed.name}" importado y cargado en el área de trabajo!`);
            setTimeout(() => setSaveSuccessMsg(null), 4000);
            setError(null);
          } else {
            setError("El archivo JSON seleccionado no contiene una estructura válida de ProcessDefinition.");
          }
        } catch (err) {
          setError("Error al leer el archivo JSON. Verifique que el formato sea correcto.");
        }
      };
    }
  };

  const loadingMessages = [
    "Analizando el flujo operativo del negocio...",
    "Estructurando Definiciones y Glosario Técnico...",
    "Estableciendo FCE (Factores Críticos de Éxito) y Fórmulas de KPIs...",
    "Generando SIPOC y Mapeo de Subprocesos...",
    "Modelando Sección 4: Fichas de Actividad Operativa (4.X.Y en Tiempos Presentes)...",
    "Validando Apoyo Tecnológico e Insumos Físicos...",
    "Generando Matriz de Transición de Estados y SLAs...",
    "Finalizando Arquitectura de Base de Datos y Código de Negocio..."
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customContext.trim()) {
      setError("Debe ingresar tanto el Nombre del Proceso como el Contexto o Alcance Operativo para poder generar el modelo TO-BE.");
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2800);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processName: customName.trim(),
          descriptionContext: customContext.trim()
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al generar el proceso mediante la Inteligencia Artificial.");
      }

      const generatedProcess: ProcessDefinition = await response.json();
      if (!generatedProcess || !generatedProcess.name || !generatedProcess.subprocesses) {
        throw new Error("El modelo generado por la IA no devolvió la estructura completa esperada.");
      }

      onProcessSelect(generatedProcess);
      setSaveSuccessMsg(`¡Proceso "${generatedProcess.name}" generado exitosamente mediante IA!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
      setCustomName("");
      setCustomContext("");
      sessionStorage.removeItem("upe_custom_name_draft");
      sessionStorage.removeItem("upe_custom_context_draft");
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "No se pudo conectar con el servidor de IA.";
      setError(
        errMsg.includes("GEMINI_API_KEY") || errMsg.includes("Inteligencia Artificial") || errMsg.includes("HTML") || errMsg.includes("404")
          ? `${errMsg} (Nota: Recuerde presionar "Redeploy" en Vercel para aplicar los cambios en las variables de entorno. También puede usar el botón de abajo para generar la plantilla sin esperar a la IA).`
          : errMsg
      );
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleExecuteFallback = () => {
    const pName = customName.trim() || "Nuevo Proceso Operativo";
    const pCtx = customContext.trim() || "Atención y procesamiento estándar.";
    const fallback = generateFallbackProcess(pName, pCtx);

    onProcessSelect(fallback);
    setSaveSuccessMsg(`¡Proceso "${fallback.name}" generado exitosamente con la plantilla estructurada TO-BE!`);
    setTimeout(() => setSaveSuccessMsg(null), 5000);
    setError(null);
    setCustomName("");
    setCustomContext("");
    sessionStorage.removeItem("upe_custom_name_draft");
    sessionStorage.removeItem("upe_custom_context_draft");
  };

  // Searchable Combobox State
  const [comboboxQuery, setComboboxQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const isBlankProcess = (name?: string) => {
    return !name || name === BLANK_PROCESS_PRESET.name || name === "Proceso Sin Definir (En Blanco)";
  };

  // Sync input value with currentProcess.name
  useEffect(() => {
    if (isBlankProcess(currentProcess.name)) {
      setComboboxQuery("");
    } else {
      setComboboxQuery(currentProcess.name);
    }
  }, [currentProcess.name]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
        // Restore current process name in search query without resetting custom draft inputs
        if (!isBlankProcess(currentProcess.name)) {
          setComboboxQuery(currentProcess.name);
        } else {
          setComboboxQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentProcess.name]);

  // Clear or reset to Blank process
  const handleClearToBlank = () => {
    onProcessSelect(BLANK_PROCESS_PRESET);
    setComboboxQuery("");
    setCustomName("");
    setCustomContext("");
    sessionStorage.removeItem("upe_custom_name_draft");
    sessionStorage.removeItem("upe_custom_context_draft");
    setError(null);
    setIsComboboxOpen(false);
  };

  const handleSelectOption = (proc: ProcessDefinition) => {
    onProcessSelect(proc);
    if (isBlankProcess(proc.name)) {
      setComboboxQuery("");
    } else {
      setComboboxQuery(proc.name);
    }
    setIsComboboxOpen(false);
  };

  // Derived Taxonomy lists for Macroproceso, Proceso, Microproceso filters
  const macroList = Array.from(new Set(taxonomy.map((t) => t.macroproceso))).sort();

  const procList = Array.from(
    new Set(
      taxonomy
        .filter((t) => !filterMacro || t.macroproceso === filterMacro)
        .map((t) => t.proceso)
    )
  ).sort();

  const microListFiltered = taxonomy.filter((t) => {
    if (filterMacro && t.macroproceso !== filterMacro) return false;
    if (filterProc && t.proceso !== filterProc) return false;
    if (filterMicro && !t.microproceso.toLowerCase().includes(filterMicro.toLowerCase())) return false;
    return true;
  });

  const handleSelectFilterMacro = (macro: string) => {
    setFilterMacro(macro);
    if (macro) {
      const validProcs = taxonomy.filter((t) => t.macroproceso === macro).map((t) => t.proceso);
      if (filterProc && !validProcs.includes(filterProc)) {
        setFilterProc("");
      }
    }
  };

  const handleSelectFilterProc = (proc: string) => {
    setFilterProc(proc);
    if (proc && !filterMacro) {
      const found = taxonomy.find((t) => t.proceso === proc);
      if (found) {
        setFilterMacro(found.macroproceso);
      }
    }
  };

  const handleSelectMicroItem = (item: TaxonomyItem) => {
    setFilterMacro(item.macroproceso);
    setFilterProc(item.proceso);
    setFilterMicro(item.microproceso);
    setIsMicroDropdownOpen(false);

    // Update active process taxonomy classification directly
    onProcessSelect({
      ...currentProcess,
      macroproceso: item.macroproceso,
      proceso: item.proceso,
      microproceso: item.microproceso
    });

    // Check if a saved process matches this microproceso
    const matchProc = savedProcesses.find(
      (p) =>
        p.process.name.toLowerCase() === item.microproceso.toLowerCase() ||
        p.process.microproceso?.toLowerCase() === item.microproceso.toLowerCase()
    );
    if (matchProc) {
      onProcessSelect(matchProc.process);
      setSaveSuccessMsg(`¡Proceso cargado desde librería: "${matchProc.process.name}"!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleApplyToActiveProcess = () => {
    onProcessSelect({
      ...currentProcess,
      macroproceso: filterMacro || undefined,
      proceso: filterProc || undefined,
      microproceso: filterMicro || undefined
    });
    setSaveSuccessMsg("Clasificación taxonómica aplicada exitosamente al proceso activo.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleClearTaxonomyFilters = () => {
    setFilterMacro("");
    setFilterProc("");
    setFilterMicro("");
  };

  // Match evaluation for saved processes against Taxonomy structure
  const cleanQuery = comboboxQuery.toLowerCase().trim();

  const savedProcessesWithMatch = savedProcesses.map((entry) => {
    const matchRes = matchProcessToTaxonomy(entry.process, taxonomy);
    return { entry, matchRes };
  });

  const matchedSaved = savedProcessesWithMatch.filter(({ entry, matchRes }) => {
    const textMatch =
      entry.process.name.toLowerCase().includes(cleanQuery) ||
      (matchRes.microproceso && matchRes.microproceso.toLowerCase().includes(cleanQuery));
    if (!textMatch) return false;

    if (filterMacro && matchRes.macroproceso !== filterMacro && entry.process.macroproceso !== filterMacro) {
      return false;
    }
    if (filterProc && matchRes.proceso !== filterProc && entry.process.proceso !== filterProc) {
      return false;
    }
    if (filterMicro) {
      const targetMicro = filterMicro.toLowerCase();
      const matchMicro = matchRes.microproceso ? matchRes.microproceso.toLowerCase() : "";
      const procMicro = entry.process.microproceso ? entry.process.microproceso.toLowerCase() : "";
      const procName = entry.process.name.toLowerCase();
      if (!matchMicro.includes(targetMicro) && !procMicro.includes(targetMicro) && !procName.includes(targetMicro)) {
        return false;
      }
    }
    return true;
  });

  const othersSaved = savedProcessesWithMatch.filter(({ entry, matchRes }) => {
    if (matchRes.isMatched) return false;
    const textMatch = entry.process.name.toLowerCase().includes(cleanQuery);
    if (!textMatch) return false;

    if (filterMacro && entry.process.macroproceso !== filterMacro) return false;
    if (filterProc && entry.process.proceso !== filterProc) return false;
    if (filterMicro && !entry.process.name.toLowerCase().includes(filterMicro.toLowerCase())) return false;
    return true;
  });

  const totalMatchedCount = savedProcessesWithMatch.filter((x) => x.matchRes.isMatched).length;
  const totalOthersCount = savedProcessesWithMatch.filter((x) => !x.matchRes.isMatched).length;

  const isCustomCurrent =
    !isBlankProcess(currentProcess.name) &&
    !savedProcesses.some((p) => p.process.name === currentProcess.name) &&
    currentProcess.name.toLowerCase().includes(cleanQuery);

  const showBlankOption =
    cleanQuery === "" ||
    "blanco".includes(cleanQuery) ||
    "sin definir".includes(cleanQuery);

  return (
    <div className="bg-white border border-slate-200 shadow-sm p-6 mb-8">
      {/* Header bar with Searchable Combobox */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1 max-w-xl space-y-1.5" ref={comboboxRef}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <label htmlFor="process-search-input" className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-700" />
                Diseño de Proceso Activo
              </label>
            </div>
            {/* Classification Badge for Active Process */}
            {(() => {
              const curMatch = matchProcessToTaxonomy(currentProcess, taxonomy);
              if (curMatch.isMatched) {
                return (
                  <span
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1"
                    title={`Estructura Oficial: ${curMatch.macroproceso} > ${curMatch.proceso} > ${curMatch.microproceso}`}
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Match: {curMatch.microproceso}</span>
                  </span>
                );
              } else if (!isBlankProcess(currentProcess.name)) {
                return (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>Otros / Sin Clasificar</span>
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* Searchable Combobox Input & Dropdown */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="process-search-input"
                type="text"
                value={comboboxQuery}
                onFocus={() => setIsComboboxOpen(true)}
                onChange={(e) => {
                  setComboboxQuery(e.target.value);
                  setIsComboboxOpen(true);
                }}
                placeholder="Escriba para buscar por nombre o microproceso..."
                className="w-full bg-slate-50 border-2 border-slate-900 text-slate-900 font-bold text-sm pl-9 pr-16 py-2.5 focus:outline-none focus:bg-white shadow-sm transition-all"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {comboboxQuery && comboboxQuery !== BLANK_PROCESS_PRESET.name && (
                  <button
                    type="button"
                    onClick={handleClearToBlank}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                  className="p-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronDown className={`w-4 h-4 transform transition-transform ${isComboboxOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Floating Dropdown List */}
            {isComboboxOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-slate-900 shadow-xl max-h-80 overflow-y-auto divide-y divide-slate-100 font-sans">
                {/* Filter Tabs Header */}
                <div className="p-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1 text-[11px] font-bold sticky top-0 z-10">
                  <span className="text-slate-500 px-1 text-[10px] uppercase tracking-wider">Filtro:</span>
                  <button
                    type="button"
                    onClick={() => setFilterMatchTab("all")}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      filterMatchTab === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Todos ({savedProcesses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMatchTab("matched")}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                      filterMatchTab === "matched" ? "bg-emerald-800 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>Con Match ({totalMatchedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMatchTab("others")}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                      filterMatchTab === "others" ? "bg-amber-800 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    <span>Otros ({totalOthersCount})</span>
                  </button>
                </div>

                {/* Option: Blank / Sin Definir */}
                {showBlankOption && filterMatchTab !== "matched" && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(BLANK_PROCESS_PRESET)}
                    className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      isBlankProcess(currentProcess.name)
                        ? "bg-slate-100 text-slate-900 font-black"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      -- Proceso en Blanco (Sin Definir) --
                    </span>
                    {isBlankProcess(currentProcess.name) && (
                      <Check className="w-3.5 h-3.5 text-slate-900" />
                    )}
                  </button>
                )}

                {/* Group 1: Matches with Taxonomy */}
                {(filterMatchTab === "all" || filterMatchTab === "matched") && matchedSaved.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border-y border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>🟢 Diseños con Match en Estructura Taxonómica ({matchedSaved.length})</span>
                    </div>
                    {matchedSaved.map(({ entry, matchRes }) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectOption(entry.process)}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex flex-col gap-0.5 cursor-pointer border-b border-slate-50 last:border-b-0 ${
                          currentProcess.name === entry.process.name
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate text-slate-900">{entry.process.name}</span>
                          {currentProcess.name === entry.process.name && (
                            <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1 truncate">
                          <FolderTree className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{matchRes.macroproceso} &gt; {matchRes.proceso} &gt; <strong className="font-extrabold text-emerald-950">{matchRes.microproceso}</strong></span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Group 2: Others / Without Taxonomy Match */}
                {(filterMatchTab === "all" || filterMatchTab === "others") && othersSaved.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100/90 border-y border-amber-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-700" />
                      <span>⚪ Otros / Sin Clasificar ({othersSaved.length})</span>
                    </div>
                    {othersSaved.map(({ entry }) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectOption(entry.process)}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-b-0 ${
                          currentProcess.name === entry.process.name
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{entry.process.name}</span>
                        {currentProcess.name === entry.process.name && (
                          <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Group 3: Active Custom Process if not in library */}
                {isCustomCurrent && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100/80 border-y border-slate-100">
                      ✨ Proceso Activo Actual
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectOption(currentProcess)}
                      className="w-full text-left px-4 py-2 text-xs font-bold bg-slate-100 text-slate-900 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{currentProcess.name}</span>
                      <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />
                    </button>
                  </div>
                )}

                {/* No results state */}
                {matchedSaved.length === 0 && othersSaved.length === 0 && !showBlankOption && !isCustomCurrent && (
                  <div className="p-4 text-center text-xs text-slate-500 font-medium">
                    No se encontraron coincidencias para &quot;{comboboxQuery}&quot;.
                    <button
                      type="button"
                      onClick={handleClearToBlank}
                      className="block mx-auto mt-2 text-slate-900 font-bold underline hover:text-slate-700 cursor-pointer"
                    >
                      Volver a Proceso en Blanco
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
          {/* Action buttons: Save, Library, Admin/Backups */}
          {isAdmin && (
            <button
              onClick={handleSaveToLibrary}
              className="px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Guardar diseño de proceso actual en tu librería local"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-700" />
              Guardar Diseño
            </button>
          )}

          <button
            onClick={() => setShowLibrary(true)}
            className="px-3 py-2 text-xs font-bold bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 relative cursor-pointer shadow-sm"
            title="Explorar la Librería de Procesos"
          >
            <Library className="w-3.5 h-3.5 text-slate-300" />
            Librería ({savedProcesses.length})
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setAdminMsg(null);
                  setShowAdminModal(true);
                }}
                className="px-3 py-2 text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Gestión de respaldos, exportación e importación del sistema"
              >
                <HardDrive className="w-3.5 h-3.5 text-indigo-700" />
                Respaldos & Admin
              </button>

              <label className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs" title="Importar informe en Word (.docx) e incorporarlo a la librería">
                {wordParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" /> : <FileText className="w-3.5 h-3.5 text-blue-700" />}
                {wordParsing ? "Interpretando Word..." : "Importar Word (.docx)"}
                <input type="file" accept=".docx,.doc" onChange={handleImportWord} disabled={wordParsing} className="hidden" />
              </label>

              <label className="px-3 py-2 text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                Importar JSON
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Filtros de Clasificación Taxonómica (Macroproceso, Proceso, Microproceso por escritura o selección) */}
      <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-sm mt-5 space-y-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
            <FolderTree className="w-4 h-4 text-emerald-700" />
            <span>Filtros de Estructura Taxonómica (Proceso Activo)</span>
          </div>
          {(filterMacro || filterProc || filterMicro) && (
            <button
              type="button"
              onClick={handleClearTaxonomyFilters}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Macroproceso Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              1. Seleccionar Macroproceso
            </label>
            <select
              value={filterMacro}
              onChange={(e) => handleSelectFilterMacro(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-2 rounded focus:outline-none focus:border-slate-900 shadow-2xs cursor-pointer"
            >
              <option value="">-- Todos los Macroprocesos --</option>
              {macroList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 2. Proceso Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              2. Seleccionar Proceso
            </label>
            <select
              value={filterProc}
              onChange={(e) => handleSelectFilterProc(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs px-2.5 py-2 rounded focus:outline-none focus:border-slate-900 shadow-2xs cursor-pointer"
            >
              <option value="">-- Todos los Procesos --</option>
              {procList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 3. Microproceso Filter (Escritura o Selección) */}
          <div className="relative" ref={microComboRef}>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              3. Microproceso (Escritura / Selección)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={filterMicro}
                onChange={(e) => {
                  setFilterMicro(e.target.value);
                  setIsMicroDropdownOpen(true);
                }}
                onFocus={() => setIsMicroDropdownOpen(true)}
                placeholder="Escriba o seleccione un microproceso..."
                className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-xs pl-2.5 pr-8 py-2 rounded focus:outline-none focus:border-slate-900 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setIsMicroDropdownOpen(!isMicroDropdownOpen)}
                className="absolute right-2 text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
                title="Desplegar lista de microprocesos"
              >
                <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${isMicroDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Floating Dropdown for Microprocesos */}
            {isMicroDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 rounded text-xs font-sans">
                {microListFiltered.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 font-medium text-[11px]">
                    No se encontraron microprocesos en el filtro. Puede usar la palabra escrita como microproceso personalizado.
                  </div>
                ) : (
                  microListFiltered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectMicroItem(item)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors flex flex-col gap-0.5 cursor-pointer ${
                        filterMicro === item.microproceso ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item.microproceso}</span>
                        {filterMicro === item.microproceso && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className={`text-[10px] font-mono opacity-75 ${filterMicro === item.microproceso ? "text-slate-300" : "text-slate-500"}`}>
                        {item.macroproceso} &gt; {item.proceso}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Association Actions & Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Clasificación asignada:</span>
            <strong className="text-slate-900 font-mono">
              {filterMacro || "Sin especificar"} &gt; {filterProc || "Sin especificar"} &gt; {filterMicro || "Sin especificar"}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleApplyToActiveProcess}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Asignar esta estructura al Proceso Activo actual"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Asignar al Proceso Activo</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      <div className="border-t border-slate-100 my-5"></div>

      {/* Generator Form / Analyst Banner */}
      {!isAdmin ? (
        <div className="bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold">
              <Library className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">Modo Consulta (Perfil Analista)</span>
              <span className="text-slate-600 text-xs">
                Tienes acceso para explorar y revisar los procesos documentados en la <strong className="text-slate-900">Librería</strong>. La creación e importación de nuevos procesos está gestionada por la Administración.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowLibrary(true)}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Library className="w-3.5 h-3.5" />
            Abrir Librería ({savedProcesses.length})
          </button>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                Modelar Nuevo Proceso
                <span className="text-rose-600 font-bold ml-1">*</span>
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Compras Públicas, Onboarding de Personal, Triage Dental, Licitaciones..."
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-shadow bg-slate-50/50"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                Contexto o Alcance Operativo (Obligatorio)
                <span className="text-rose-600 font-bold ml-1">*</span>
              </label>
              <input
                type="text"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Ej. Inicia con la orden de pedido del área usuaria y finaliza con la firma del contrato digital por la dirección."
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-shadow bg-slate-50/50"
              />
            </div>
            <div className="md:self-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                )}
                Generar Proceso TO-BE
              </button>
            </div>
          </div>

          {loading && (
            <div className="bg-slate-50 border border-slate-100 p-4 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
              <div className="text-xs text-slate-600 font-medium">
                <span className="text-slate-900 font-semibold mr-1">Paso {loadingStep + 1} de {loadingMessages.length}:</span>
                {loadingMessages[loadingStep]}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-sm space-y-3 animate-fadeIn">
              <div className="flex items-start gap-2.5 text-xs text-rose-800 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-rose-950">Atención durante la generación con Inteligencia Artificial:</p>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-rose-700 font-medium">
                  ¿Desea generar la estructura base sin esperar a la IA?
                </span>
                <button
                  type="button"
                  onClick={handleExecuteFallback}
                  className="px-3.5 py-1.5 bg-rose-900 hover:bg-rose-950 text-white font-bold text-xs rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  Generar Estructura TO-BE Base (Modo Plantilla)
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* LIBRARY MODAL */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Library className="w-5 h-5 text-slate-800" />
                  Librería y Gestión de Estructura Taxonómica
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestione la estructura oficial de 92 microprocesos, asimile diseños existentes y consulte la librería.
                </p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-sm cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setLibraryTab("processes")}
                className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
                  libraryTab === "processes"
                    ? "border-slate-900 text-slate-900 bg-white shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <BookOpen className="w-4 h-4 text-slate-700" />
                <span>1. Diseños Guardados y Asimilación ({savedProcesses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab("taxonomy")}
                className={`px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
                  libraryTab === "taxonomy"
                    ? "border-slate-900 text-slate-900 bg-white shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <FolderTree className="w-4 h-4 text-emerald-700" />
                <span>2. Estructura Taxonómica ({taxonomy.length} Microprocesos)</span>
              </button>
            </div>

            {/* TAB 1: DISEÑOS GUARDADOS & ASIMILACIÓN */}
            {libraryTab === "processes" && (
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* Action Bar: Assimilate Documents */}
                <div className="bg-slate-900 text-white p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      Asimilación de Documentos Existentes a la Estructura
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      Evalúa todos los diseños guardados contra la estructura de {taxonomy.length} microprocesos. Los que hagan match se vincularán automáticamente a su Macroproceso y Proceso. Los que no coincidan quedarán clasificados en &quot;Otros / Sin Clasificar&quot;.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAssimilateProcesses}
                    disabled={cloudSyncing || savedProcesses.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {cloudSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>⚡ Asimilar Documentos Existentes</span>
                  </button>
                </div>

                {savedProcesses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 p-8">
                    <BookmarkPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">No hay procesos guardados en tu librería aún.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Puedes diseñar o modelar un proceso y hacer clic en el botón <strong className="text-slate-600">&quot;Guardar Diseño&quot;</strong> para almacenarlo aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    {savedProcesses.map((item) => {
                      const matchRes = matchProcessToTaxonomy(item.process, taxonomy);
                      const isCurrent = currentProcess.name === item.process.name;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            onProcessSelect(item.process);
                            setShowLibrary(false);
                          }}
                          className={`p-4 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isCurrent
                              ? "bg-slate-900 text-white border-slate-900 shadow-md"
                              : "bg-slate-50/70 border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-sm">{item.process.name}</h4>
                              {isCurrent && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500 text-white rounded shadow-2xs">
                                  Activo
                                </span>
                              )}
                              {matchRes.isMatched ? (
                                <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Match Oficial</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-amber-700" />
                                  <span>Otros / Sin Clasificar</span>
                                </span>
                              )}
                            </div>

                            {/* Taxonomy Breadcrumb Badge */}
                            {matchRes.isMatched && (
                              <div className={`text-[11px] font-mono flex items-center gap-1 ${isCurrent ? "text-emerald-300" : "text-emerald-800"}`}>
                                <FolderTree className="w-3.5 h-3.5 shrink-0" />
                                <span>{matchRes.macroproceso} &gt; {matchRes.proceso} &gt; <strong className="font-black">{matchRes.microproceso}</strong></span>
                              </div>
                            )}

                            <p className={`text-xs line-clamp-1 ${isCurrent ? "text-slate-300" : "text-slate-500"}`}>
                              {item.process.description}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] opacity-75 font-mono pt-0.5">
                              <span>Subprocesos: {item.process.subprocesses?.length || 0}</span>
                              <span>&bull;</span>
                              <span>Guardado: {item.savedAt}</span>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={(e) => handleExportJSON(item.process, e)}
                                className={`p-2 text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
                                  isCurrent
                                    ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                                title="Descargar JSON"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteFromLibrary(item.id, e)}
                                className="p-2 text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                title="Eliminar de librería"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GESTIONAR ESTRUCTURA TAXONÓMICA */}
            {libraryTab === "taxonomy" && (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Control bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 border border-slate-200 rounded">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Estructura Oficial de Procesos ({taxonomy.length} Microprocesos)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Soporta importación/exportación CSV y adición manual de niveles.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportTaxonomyCSV}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Exportar archivo CSV con los 92 microprocesos"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar CSV</span>
                    </button>

                    <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Importar CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportTaxonomyCSV}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetTaxonomyToDefault}
                      className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Reestablecer la lista oficial original de 92 microprocesos"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reestablecer Oficial (92)</span>
                    </button>
                  </div>
                </div>

                {taxMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded flex items-center gap-2 animate-fadeIn">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{taxMsg}</span>
                  </div>
                )}

                {/* Form to add a new taxonomy node */}
                <form onSubmit={handleAddTaxonomyNode} className="bg-slate-100/80 p-4 border border-slate-200 rounded space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-emerald-700" />
                    <span>Añadir Nuevo Nivel de Microproceso</span>
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Macroproceso *</label>
                      <input
                        type="text"
                        value={newMacro}
                        onChange={(e) => setNewMacro(e.target.value)}
                        placeholder="Ej. ESTRATÉGICO"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Proceso *</label>
                      <input
                        type="text"
                        value={newProc}
                        onChange={(e) => setNewProc(e.target.value)}
                        placeholder="Ej. Planificación Institucional"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Microproceso *</label>
                      <input
                        type="text"
                        value={newMicro}
                        onChange={(e) => setNewMicro(e.target.value)}
                        placeholder="Ej. Control de Metas Operativas"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-semibold focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                    <span>Guardar Nodo en Estructura Taxonómica</span>
                  </button>
                </form>

                {/* Search Taxonomy Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTaxonomyQuery}
                    onChange={(e) => setSearchTaxonomyQuery(e.target.value)}
                    placeholder="Filtrar por Macroproceso, Proceso o Microproceso..."
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Taxonomy Items Tree List */}
                <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-96 overflow-y-auto bg-white">
                  {taxonomy
                    .filter(
                      (item) =>
                        item.macroproceso.toLowerCase().includes(searchTaxonomyQuery.toLowerCase()) ||
                        item.proceso.toLowerCase().includes(searchTaxonomyQuery.toLowerCase()) ||
                        item.microproceso.toLowerCase().includes(searchTaxonomyQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div key={item.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                            {item.macroproceso} &bull; {item.proceso}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{item.microproceso}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTaxonomyNode(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Eliminar este microproceso de la estructura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span>{savedProcesses.length} procesos guardados</span>
                <span>&bull;</span>
                <span>{taxonomy.length} microprocesos en estructura</span>
              </span>
              <button
                onClick={() => setShowLibrary(false)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold hover:bg-slate-800 cursor-pointer rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMINISTRATION & BACKUP MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Administración y Gestión de Respaldos
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Genera o restaura una copia de seguridad consolidada de todos los diseños de procesos.
                </p>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Feedback messages */}
              {adminMsg && (
                <div
                  className={`p-4 text-xs font-semibold flex items-start justify-between gap-3 border ${
                    adminMsg.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {adminMsg.type === "success" ? (
                      <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    )}
                    <span>{adminMsg.text}</span>
                  </div>
                  <button
                    onClick={() => setAdminMsg(null)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Action 0: Firebase Cloud Sync */}
              <div className="p-4 border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-sm">
                    <CloudCheck className="w-5 h-5 text-emerald-700" />
                    Sincronización Cloud con Firebase Firestore
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                    cloudConnected ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}>
                    {cloudConnected ? "Conectado a Firestore 🟢" : "Desconectado (Modo Local)"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tus modelos de proceso están vinculados con la base de datos noSQL en tiempo real de <strong>Firebase Firestore</strong>. Los cambios guardados se reflejarán automáticamente en la nube.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleManualCloudSync}
                    disabled={cloudSyncing}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {cloudSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {cloudSyncing ? "Sincronizando..." : "Sincronizar Librería con Firebase Cloud"}
                  </button>
                  {cloudError && (
                    <span className="text-xs text-rose-700 font-medium">
                      ⚠️ {cloudError}
                    </span>
                  )}
                </div>
              </div>

              {/* Action 1: Export Complete Backup */}
              <div className="p-4 border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center gap-2.5 text-indigo-950 font-bold text-sm">
                  <FileDown className="w-5 h-5 text-indigo-700" />
                  Generar y Descargar Respaldo Completo
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exporta un archivo de respaldo estructurado en formato <strong>JSON</strong> que contiene la totalidad de los modelos de procesos guardados en la librería local (<strong>{savedProcesses.length} procesos</strong>) y la configuración del proceso activo.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateSystemBackup}
                  className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar Respaldo del Sistema (.json)
                </button>
              </div>

              {/* Action 2: Import & Restore Backup */}
              <div className="p-4 border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                  <FileUp className="w-5 h-5 text-slate-700" />
                  Subir y Restaurar Respaldo
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Carga un archivo de respaldo previo en formato <strong>.json</strong> para incorporar sus modelos a tu espacio de trabajo.
                </p>

                {/* Restoration Mode Selector */}
                <div className="space-y-2 bg-white p-3 border border-slate-200">
                  <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
                    Modo de Restauración:
                  </span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === "merge"}
                        onChange={() => setRestoreMode("merge")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Combinar (Agregar procesos sin duplicar)
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === "replace"}
                        onChange={() => setRestoreMode("replace")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Reemplazar (Sobrescribir librería actual)
                    </label>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm">
                  <Upload className="w-4 h-4 text-slate-300" />
                  Seleccionar Archivo de Respaldo (.json)
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreSystemBackup}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Action 3: Storage Status & Maintenance */}
              <div className="p-4 border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4 text-slate-600" />
                    Estado del Almacenamiento Local
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5">
                    {savedProcesses.length} registro(s)
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>Procesos almacenados en navegador: <strong>{savedProcesses.length}</strong></div>
                  <div>Proceso activo actual: <strong>{currentProcess.name || "Sin Definir (En Blanco)"}</strong></div>
                </div>

                {savedProcesses.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleClearLibrary}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Vaciar Librería Local
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Los respaldos se almacenan de forma segura y portable en formato JSON.
              </span>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE IN-PAGE CONFIRM MODAL */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-md w-full shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 text-xs font-semibold text-white transition-colors ${
                  confirmModal.confirmVariant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {confirmModal.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

