import React, { useState, useEffect } from "react";
import {
  Users, ShieldCheck, User as UserIcon, Search, UserPlus, Lock, CheckCircle2,
  AlertCircle, Loader2, X, RefreshCw, Filter, ShieldAlert, Sliders, FileText, PlayCircle, BarChart2, Check
} from "lucide-react";
import { UserRole } from "../firebase";
import {
  UserProfile,
  UserPermissions,
  DEFAULT_ANALYST_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  subscribeToAllUsers,
  updateUserRole,
  updateUserPermissions,
} from "../firebaseSync";

interface UserManagerProps {
  currentUserEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

const MAIN_SUPER_ADMIN = "carayag@ugp-ssmso.cl";

export default function UserManager({
  currentUserEmail,
  isOpen,
  onClose,
}: UserManagerProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "analyst">("all");

  // New user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("analyst");
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Operation feedback state
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

  // Permissions modal state
  const [permissionsModalUser, setPermissionsModalUser] = useState<UserProfile | null>(null);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_ANALYST_PERMISSIONS);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Real-time subscription to all users in Firestore
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeToAllUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading users:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.role === "admin") ||
      (roleFilter === "analyst" && u.role === "analyst");

    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalAnalysts = users.filter((u) => u.role === "analyst").length;

  const handleRoleChange = async (targetEmail: string, newRole: UserRole) => {
    if (targetEmail.toLowerCase() === MAIN_SUPER_ADMIN) {
      setStatusMsg({
        type: "error",
        text: "El rol del Administrador Principal (carayag@ugp-ssmso.cl) no puede ser modificado.",
      });
      return;
    }

    setUpdatingEmail(targetEmail);
    setStatusMsg(null);

    try {
      await updateUserRole(targetEmail, newRole, currentUserEmail);
      setStatusMsg({
        type: "success",
        text: `Rol de ${targetEmail} actualizado a ${
          newRole === "admin" ? "Administrador" : "Analista"
        } exitosamente.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Error al actualizar el rol del usuario.",
      });
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserEmail.includes("@")) {
      setStatusMsg({ type: "error", text: "Por favor ingresa un correo electrónico válido." });
      return;
    }

    const cleanEmail = newUserEmail.trim().toLowerCase();
    setIsSubmittingNewUser(true);
    setStatusMsg(null);

    try {
      await updateUserRole(cleanEmail, newUserRole, currentUserEmail);
      setStatusMsg({
        type: "success",
        text: `Usuario ${cleanEmail} registrado/actualizado con rol de ${
          newUserRole === "admin" ? "Administrador" : "Analista"
        }.`,
      });
      setNewUserEmail("");
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Error al registrar la asignación de rol.",
      });
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  const openPermissionsModal = (user: UserProfile) => {
    setPermissionsModalUser(user);
    const defaultPerms = user.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_ANALYST_PERMISSIONS;
    setEditPermissions(user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : defaultPerms);
  };

  const handleSavePermissions = async () => {
    if (!permissionsModalUser) return;
    setSavingPermissions(true);
    setStatusMsg(null);

    try {
      await updateUserPermissions(permissionsModalUser.email, editPermissions, currentUserEmail);
      setStatusMsg({
        type: "success",
        text: `Permisos de acceso actualizados para ${permissionsModalUser.email} exitosamente.`,
      });
      setPermissionsModalUser(null);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Error al actualizar los permisos del usuario.",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 text-slate-950 flex items-center justify-center font-black rounded-xs shadow-xs">
              <Users className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none text-white">
                Administrador de Usuarios & Perfiles
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Asignación de Roles (Administrador / Analista) para cuentas institucional de Google
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Stats Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="font-mono text-slate-900 font-bold bg-white border border-slate-200 px-2 py-0.5 shadow-2xs">
                {users.length}
              </span>
              <span>Usuarios Registrados</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="font-mono bg-amber-100 border border-amber-200 px-2 py-0.5">
                {totalAdmins}
              </span>
              <span>Administradores</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span className="font-mono bg-slate-200 border border-slate-300 px-2 py-0.5">
                {totalAnalysts}
              </span>
              <span>Analistas</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Por defecto: <strong className="text-slate-800">carayag@ugp-ssmso.cl</strong> es Administrador.
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMsg && (
          <div
            className={`px-6 py-3 border-b text-xs font-semibold flex items-center justify-between ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pre-assign / Register User Form */}
          <div className="bg-slate-50 border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-slate-900" />
              Pre-asignar / Asignar Rol a un Correo Institucional
            </h3>
            <form onSubmit={handleAddUserSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ej. usuario.analista@ugp-ssmso.cl"
                  className="w-full bg-white border border-slate-300 text-xs px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                className="bg-white border border-slate-300 text-xs px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="analyst">Analista (Solo Lectura/Librería)</option>
                <option value="admin">Administrador (Control Total)</option>
              </select>

              <button
                type="submit"
                disabled={isSubmittingNewUser}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingNewUser ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Asignar Rol</span>
              </button>
            </form>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuario o correo..."
                className="w-full bg-white border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 border border-slate-200 bg-white p-0.5 text-xs font-semibold self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`px-3 py-1 transition-colors cursor-pointer ${
                  roleFilter === "all" ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("admin")}
                className={`px-3 py-1 transition-colors cursor-pointer ${
                  roleFilter === "admin" ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Admins ({totalAdmins})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("analyst")}
                className={`px-3 py-1 transition-colors cursor-pointer ${
                  roleFilter === "analyst" ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Analistas ({totalAnalysts})
              </button>
            </div>
          </div>

          {/* User List Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-900 mx-auto" />
              <p className="text-xs font-semibold">Cargando catálogo de usuarios desde Firestore...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No se encontraron usuarios</p>
              <p className="text-xs">Prueba ajustando el filtro de búsqueda o pre-asigna un nuevo usuario arriba.</p>
            </div>
          ) : (
            <div className="border border-slate-200 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-600 tracking-wider">
                  <tr>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Rol Asignado</th>
                    <th className="p-3 hidden md:table-cell">Último Acceso</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredUsers.map((user) => {
                    const isMainSuperAdmin = user.email.toLowerCase() === MAIN_SUPER_ADMIN;
                    const isSelf = user.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const isUpdating = updatingEmail === user.email;

                    return (
                      <tr
                        key={user.email}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelf ? "bg-amber-50/30" : ""
                        }`}
                      >
                        {/* User Column */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName || user.email}
                                className="w-8 h-8 rounded-full border border-slate-300 object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {(user.displayName || user.email)[0].toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  {user.displayName || user.email.split("@")[0]}
                                </span>
                                {isMainSuperAdmin && (
                                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Principal
                                  </span>
                                )}
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 font-bold text-[9px] uppercase">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Current Role Column */}
                        <td className="p-3">
                          {user.role === "admin" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                              Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs">
                              <UserIcon className="w-3.5 h-3.5 text-slate-600" />
                              Analista
                            </span>
                          )}
                        </td>

                        {/* Last Login Column */}
                        <td className="p-3 hidden md:table-cell text-slate-500 font-mono text-[11px]">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString("es-CL", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Sin acceso registrado"}
                        </td>

                        {/* Actions Column */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openPermissionsModal(user)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Configurar accesos a módulos y componentes"
                            >
                              <Sliders className="w-3.5 h-3.5 text-slate-700" />
                              <span>Permisos</span>
                            </button>

                            {isMainSuperAdmin ? (
                              <span className="text-[11px] text-slate-400 font-medium italic flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Principal
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {isUpdating ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                                ) : (
                                  <select
                                    value={user.role}
                                    onChange={(e) =>
                                      handleRoleChange(user.email, e.target.value as UserRole)
                                    }
                                    className="bg-white border border-slate-300 text-xs px-2.5 py-1 font-semibold text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                                  >
                                    <option value="analyst">Analista</option>
                                    <option value="admin">Administrador</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sincronización en tiempo real con Firestore</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Permissions Configuration Modal */}
      {permissionsModalUser && (
        <div className="fixed inset-0 z-65 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-400 text-slate-950 flex items-center justify-center font-black rounded-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    Configuración de Accesos por Módulo & Componentes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Usuario: <strong className="text-white font-mono">{permissionsModalUser.email}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionsModalUser(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <p className="text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 p-3">
                Seleccione los módulos y subcomponentes específicos a los cuales este usuario tendrá acceso habilitado dentro de la plataforma UPE.
              </p>

              {/* Taxonomy Filters Permission */}
              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Filter className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Filtros de Estructura Taxonómica (Proceso Activo)</span>
                      <p className="text-[11px] text-slate-500 font-normal">Permisos para visualizar y filtrar por Macroproceso, Proceso y Microproceso.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.taxonomyFilters?.view ?? true}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            taxonomyFilters: { ...(editPermissions.taxonomyFilters || { view: true, edit: true }), view: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-purple-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.taxonomyFilters?.edit ?? true}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            taxonomyFilters: { ...(editPermissions.taxonomyFilters || { view: true, edit: true }), edit: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-purple-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <span>Editar</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Module 1: 1. Documentación */}
              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">1. Documentación</span>
                      <p className="text-[11px] text-slate-500 font-normal">Acceso al visor de procesos, flujogramas y repositorio normativo.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.docAccess}
                      onChange={(e) =>
                        setEditPermissions({ ...editPermissions, docAccess: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className={`p-4 space-y-3 bg-white ${!editPermissions.docAccess ? 'opacity-50 pointer-events-none' : ''}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Puntos de Documentación (Visualizar & Editar independientes):</p>
                  
                  <div className="space-y-2">
                    {[
                      { key: "generalInfo", label: "1.1 Información General del Proceso", desc: "Ficha resumen y parámetros generales" },
                      { key: "fce", label: "1.2 Ficha de Caracterización y Especificación (FCE)", desc: "Especificaciones normativas y técnicas" },
                      { key: "tobeDiagram", label: "1.3 Diagrama de Flujo (BPMN 2.0 / Subprocesos)", desc: "Secuencia de subprocesos y actividades operativas" },
                      { key: "riskMatrix", label: "1.4 Matriz de Riesgos & Controles / Estados", desc: "Gestión de riesgos, SLA y transiciones de estado" },
                      { key: "additionalDocs", label: "1.5 Glosario, SIPOC, Indicadores y Roles", desc: "Glosario, matriz SIPOC, fichas KPI y roles humanos" },
                      { key: "procedureModel", label: "4. Descripción del Procedimiento Modelo de Nivel Operativo", desc: "Fichas descriptivas de subprocesos y actividades operativas" }
                    ].map((item) => {
                      const compState = (editPermissions.docComponents as any)[item.key] || { view: true, edit: true };
                      return (
                        <div key={item.key} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{item.label}</span>
                            <span className="text-[10px] text-slate-500">{item.desc}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={compState.view}
                                onChange={(e) =>
                                  setEditPermissions({
                                    ...editPermissions,
                                    docComponents: {
                                      ...editPermissions.docComponents,
                                      [item.key]: { ...compState, view: e.target.checked }
                                    }
                                  })
                                }
                                className="w-4 h-4 text-blue-600 rounded-xs border-slate-300 focus:ring-slate-900"
                              />
                              <span>Visualizar</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={compState.edit}
                                onChange={(e) =>
                                  setEditPermissions({
                                    ...editPermissions,
                                    docComponents: {
                                      ...editPermissions.docComponents,
                                      [item.key]: { ...compState, edit: e.target.checked }
                                    }
                                  })
                                }
                                className="w-4 h-4 text-blue-600 rounded-xs border-slate-300 focus:ring-slate-900"
                              />
                              <span>Editar</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Module 2: KPIs Dashboard */}
              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BarChart2 className="w-4 h-4 text-slate-900" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">2. KPIs Dashboard</span>
                      <p className="text-[11px] text-slate-500 font-normal">Acceso al tablero estructurado de indicadores clave de rendimiento (KPIs) y fichas de control.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.kpiAccess ?? true}
                      onChange={(e) =>
                        setEditPermissions({ ...editPermissions, kpiAccess: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                  </label>
                </div>
              </div>

              {/* Module 3: Simulador */}
              <div className="border border-slate-200 rounded-xs overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PlayCircle className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-900 text-sm">3. Simulador</span>
                      <p className="text-[11px] text-slate-500 font-normal">Acceso a simulación avanzada Monte Carlo, análisis estocástico y pruebas de instancias.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.simAccess}
                      onChange={(e) =>
                        setEditPermissions({ ...editPermissions, simAccess: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className={`p-4 space-y-3 bg-white ${!editPermissions.simAccess ? 'opacity-50 pointer-events-none' : ''}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Componentes del Simulador:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.simComponents.monteCarlo}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            simComponents: { ...editPermissions.simComponents, monteCarlo: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-amber-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Simulador Monte Carlo / Tiempos</span>
                        <span className="text-[10px] text-slate-500">Ejecución y escenarios probabilísticos</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.simComponents.kpisDashboard}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            simComponents: { ...editPermissions.simComponents, kpisDashboard: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-amber-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Panel KPIs & Análisis Gráfico</span>
                        <span className="text-[10px] text-slate-500">Indicadores de rendimiento y gráficos</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.simComponents.riskMatrix}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            simComponents: { ...editPermissions.simComponents, riskMatrix: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-amber-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Matriz de Riesgos & Eficiencia</span>
                        <span className="text-[10px] text-slate-500">Evaluación de cuellos de botella</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.simComponents.reports}
                        onChange={(e) =>
                          setEditPermissions({
                            ...editPermissions,
                            simComponents: { ...editPermissions.simComponents, reports: e.target.checked }
                          })
                        }
                        className="w-4 h-4 text-amber-600 rounded-xs border-slate-300 focus:ring-slate-900"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Exportación de Reportes</span>
                        <span className="text-[10px] text-slate-500">Descarga de reportes de simulación</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Los cambios se aplican de forma inmediata en tiempo real.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionsModalUser(null)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingPermissions}
                  onClick={handleSavePermissions}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPermissions && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Permisos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
