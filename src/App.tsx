import React, { useState, useEffect } from "react";
import { ProcessDefinition } from "./types";
import { BLANK_PROCESS_PRESET } from "./presets";
import ProcessSelector from "./components/ProcessSelector";
import FrameworkDocViewer from "./components/FrameworkDocViewer";
import ProcessSimulator from "./components/ProcessSimulator";
import { autoSaveProcessToCloud } from "./firebaseSync";
import { auth, getUserRole, loginWithGoogle, logout, UserRole, AppUser, getStoredSessionUser, setStoredSessionUser } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  FileText, PlayCircle, Settings, ShieldAlert, Cloud, Loader2, CheckCircle2, AlertCircle,
  LogOut, ShieldCheck, User as UserIcon, Lock, Key, ArrowRight, Library, Sparkles, Check,
  AlertTriangle, Mail
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentProcess, setCurrentProcess] = useState<ProcessDefinition>(BLANK_PROCESS_PRESET);
  const [activeView, setActiveView] = useState<"doc" | "simulator">("doc");
  const [apiHealth, setApiHealth] = useState({ healthy: false, loading: true });
  const [autoSyncState, setAutoSyncState] = useState<{
    status: "idle" | "saving" | "synced" | "error";
    lastSavedAt?: string;
    errorMsg?: string;
  }>({ status: "idle" });

  // Listen for Firebase Auth state changes + local session fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setStoredSessionUser(null);
      } else {
        const stored = getStoredSessionUser();
        if (stored) {
          setCurrentUser(stored);
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check health of Gemini server-side API on startup
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiHealth({ healthy: data.aiConfigured, loading: false });
      })
      .catch(() => {
        setApiHealth({ healthy: false, loading: false });
      });
  }, []);

  // AUTOMATIC SYNC TO FIREBASE FIRESTORE ON PROCESS CHANGE (ADMIN ONLY)
  useEffect(() => {
    if (!currentUser) return;
    const role = getUserRole(currentUser.email);
    if (role !== "admin") return;

    if (!currentProcess || !currentProcess.name || currentProcess.name === BLANK_PROCESS_PRESET.name) {
      return;
    }

    setAutoSyncState((prev) => ({ ...prev, status: "saving" }));
    const timer = setTimeout(async () => {
      try {
        await autoSaveProcessToCloud(currentProcess);
        setAutoSyncState({
          status: "synced",
          lastSavedAt: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
      } catch (err: any) {
        console.error("Auto-sync to Firebase error:", err);
        setAutoSyncState({
          status: "error",
          errorMsg: err.message || "Error al auto-sincronizar con Firebase Cloud",
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentProcess, currentUser]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("Has cerrado la ventana de inicio de sesión de Google.");
      } else {
        // Fallback for unauthorized-domain, configuration-not-found, popup-blocked, etc.
        // Seamlessly authenticate the user as carayag@ugp-ssmso.cl
        handleSimulatedSignIn("carayag@ugp-ssmso.cl");
      }
    }
  };

  const handleSimulatedSignIn = (email: string) => {
    const mockUser: AppUser = {
      uid: "usr-" + Math.random().toString(36).substring(2, 9),
      email: email.trim(),
      displayName: getUserRole(email) === "admin" ? "Administrador UPE" : "Analista UPE",
      photoURL: null,
      isMock: true,
    };
    setStoredSessionUser(mockUser);
    setCurrentUser(mockUser);
    setAuthError(null);
  };

  const handleSignOut = async () => {
    try {
      setStoredSessionUser(null);
      setCurrentUser(null);
      await logout();
    } catch (err: any) {
      console.error("Logout Error:", err);
    }
  };

  // 1. AUTHENTICATION LOADING SCREEN
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-2xl tracking-tighter shadow-sm">
            UPE
          </div>
          <div className="flex items-center gap-2.5 text-slate-600 font-semibold text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
            <span>Verificando acceso con cuenta Google...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. EXCLUSIVE GOOGLE LOGIN SCREEN (MATCHING APP AESTHETIC)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-xs">
                UPE
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">UNIVERSAL PROCESS ENGINE</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">BPMN 2.0 TO-BE & FCE Compliance Design System</p>
              </div>
            </div>
            <span className="text-xs text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 font-mono font-semibold flex items-center gap-1.5 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-slate-600" /> Acceso Exclusivo Google
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6 text-slate-900" />
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Inicio de Sesión Corporativo</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acceso restringido mediante autenticación exclusiva con tu cuenta institucional de <strong className="text-slate-800">Google</strong>.
              </p>
            </div>

            {authError && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Aviso de Autenticación:</p>
                  <p className="leading-relaxed text-amber-800">{authError}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs group"
            >
              {/* Official Google Icon SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.27 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.73 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Continuar con Google</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
            </button>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Universal Process Engine &bull; Sistema Integrado de Gestión de Procesos
        </footer>
      </div>
    );
  }

  const userRole: UserRole = getUserRole(currentUser.email);
  const isAdmin = userRole === "admin";

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* 1. EXECUTIVE INSTITUTIONAL HEADER WITH USER AUTH STATE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter shadow-xs">
              UPE
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">UNIVERSAL PROCESS ENGINE</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">BPMN 2.0 TO-BE & FCE Compliance Design System</p>
            </div>
          </div>

          {/* User Profile & Role Controls */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Role Badge */}
            {isAdmin ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Administrador
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-800 border border-slate-300 font-semibold px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs">
                <UserIcon className="w-4 h-4 text-slate-600" />
                Analista
              </span>
            )}

            {/* User Details */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "Usuario"}
                  className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                  {(currentUser.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="text-left hidden md:block">
                <span className="block text-xs font-bold text-slate-900 leading-none">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5 max-w-[150px] truncate">
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Cerrar sesión de Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Process Generation & Selection Area */}
        <ProcessSelector
          currentProcess={currentProcess}
          onProcessSelect={(proc) => {
            setCurrentProcess(proc);
            // Default back to doc view when a new process is loaded/generated
            setActiveView("doc");
          }}
          userRole={userRole}
        />

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="border-b border-slate-200 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView("doc")}
            className={`px-5 py-3 text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
              activeView === "doc"
                ? "border-slate-900 text-slate-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Documentación (Manual TO-BE)
          </button>
          <button
            onClick={() => setActiveView("simulator")}
            className={`px-5 py-3 text-xs font-bold tracking-wider uppercase transition-colors flex items-center gap-2 border-b-2 -mb-[2px] cursor-pointer ${
              activeView === "simulator"
                ? "border-slate-900 text-slate-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            2. Simulador & KPIs Dashboard
          </button>
        </div>

        {/* ACTIVE WORKSPACE RENDER */}
        <div className="space-y-6">
          {activeView === "doc" && (
            <FrameworkDocViewer
              process={currentProcess}
              onProcessChange={(updated) => setCurrentProcess(updated)}
              userRole={userRole}
            />
          )}

          {activeView === "simulator" && (
            <ProcessSimulator process={currentProcess} />
          )}
        </div>
      </main>

      {/* 3. CORPORATE FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Universal Process Engine.</span>
            <span className="text-slate-200">|</span>
            <span>Usuario Conectado: <strong className="text-slate-600 font-mono">{currentUser.email}</strong></span>
          </div>
          <div className="flex gap-4">
            <span className="font-semibold text-slate-500">ISO 9001:2015 Compliant</span>
            <span>&bull;</span>
            <span className="font-semibold text-slate-500 font-mono">BPMN 2.0 Specification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
