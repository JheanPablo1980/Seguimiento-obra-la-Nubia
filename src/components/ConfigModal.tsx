import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  UserCheck, 
  UserX, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Database, 
  Cable, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  X,
  HardHat,
  Shield,
  Activity,
  Copy,
  Check,
  FileText,
  ClipboardList
} from 'lucide-react';
import { UserProfile, GlobalConfig, AuthUser } from '../types';
import { supabaseProfiles, isSupabaseConfigured, SUPABASE_TABLES_SQL_SCHEMA } from '../lib/supabase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  globalConfig: GlobalConfig;
  onUpdateGlobalConfig: (newConfig: GlobalConfig) => void;
  showToast: (msg: string) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  globalConfig,
  onUpdateGlobalConfig,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'cables' | 'database'>('profiles');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // New profile form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'inspector'>('inspector');
  const [showAddForm, setShowAddForm] = useState(false);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<{
    isOnline: boolean;
    profilesCount: number;
    logsCount: number;
    elementsCount: number;
    scheduleCount: number;
    areasCount: number;
    historyCount: number;
    message: string;
    details: string;
  } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_TABLES_SQL_SCHEMA);
    setCopiedSql(true);
    showToast('¡Script SQL de tablas de Supabase copiado al portapapeles!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      runDiagnostics();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const list = await supabaseProfiles.fetchProfiles();
      setProfiles(list);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    setCheckingDb(true);
    try {
      const res = await supabaseProfiles.checkDatabaseDiagnostics();
      setDiagnostics(res);
    } catch (err) {
      console.error('Diagnostics check failed:', err);
    } finally {
      setCheckingDb(false);
    }
  };

  const handleToggleStatus = async (email: string, currentStatus: 'active' | 'inactive') => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabaseProfiles.updateProfileStatus(email, nextStatus);
    showToast(`Estado de ${email} actualizado a: ${nextStatus === 'active' ? 'ACTIVO' : 'DADO DE BAJA'}`);
    await loadProfiles();
    await runDiagnostics();
  };

  const handleDeleteProfile = async (email: string) => {
    if (confirm(`¿Estás seguro de eliminar el perfil ${email}?`)) {
      await supabaseProfiles.deleteProfile(email);
      showToast(`Perfil ${email} eliminado`);
      await loadProfiles();
      await runDiagnostics();
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    const newProfile: UserProfile = {
      id: `usr_${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      fullName: newName.trim() || newEmail.split('@')[0],
      role: newRole,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await supabaseProfiles.saveProfile(newProfile);
    showToast(`Nuevo perfil registrado: ${newProfile.fullName}`);
    setNewEmail('');
    setNewName('');
    setShowAddForm(false);
    await loadProfiles();
    await runDiagnostics();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Módulo de Configuración & Estado de Perfiles
              </h2>
              <p className="text-xs text-slate-400">
                Gestión de accesos, bajas de inspectores, parámetros de canalización y diagnóstico de Supabase DB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition border-t border-x ${
              activeTab === 'profiles'
                ? 'bg-slate-900 text-amber-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestión de Perfiles ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cables')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition border-t border-x ${
              activeTab === 'cables'
                ? 'bg-slate-900 text-sky-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Cable className="w-4 h-4" />
            <span>Parámetros & Actas</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl flex items-center gap-2 transition border-t border-x ${
              activeTab === 'database'
                ? 'bg-slate-900 text-emerald-400 border-slate-800 border-b-slate-900'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Confirmación Supabase DB</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: USER PROFILES MANAGEMENT */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    Estado de Inspectores y Administradores
                  </h3>
                  <p className="text-xs text-slate-400">
                    Los usuarios dados de baja no podrán iniciar sesión ni registrar avances de obra.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Perfil</span>
                </button>
              </div>

              {/* Add Profile Form */}
              {showAddForm && (
                <form onSubmit={handleCreateProfile} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-amber-300">Registrar Nuevo Perfil de Usuario</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="Correo electrónico"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as 'admin' | 'inspector')}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="inspector">👷 Inspector de Campo</option>
                      <option value="admin">👑 Administrador</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Guardar Perfil
                    </button>
                  </div>
                </form>
              )}

              {/* Profiles Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Usuario / Correo</th>
                      <th className="p-2.5">Rol</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5">Registrado</th>
                      <th className="p-2.5 text-right">Acciones (Dar de Baja)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {profiles.map(p => {
                      const isActive = p.status === 'active';
                      const isAdmin = p.role === 'admin';

                      return (
                        <tr key={p.email} className="hover:bg-slate-800/40 transition">
                          <td className="p-2.5">
                            <div className="font-bold text-white">{p.fullName}</div>
                            <div className="font-mono text-[11px] text-slate-400">{p.email}</div>
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isAdmin
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                            }`}>
                              {isAdmin ? <Shield className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
                              {isAdmin ? 'Administrador' : 'Inspector'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isActive ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserX className="w-3.5 h-3.5 text-rose-400" />}
                              {isActive ? 'Activo' : 'Dado de baja / Inactivo'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 font-mono text-[10px]">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleStatus(p.email, p.status)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                                  isActive
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                                title={isActive ? 'Dar de baja a este usuario' : 'Reactivar usuario'}
                              >
                                {isActive ? (
                                  <>
                                    <UserX className="w-3 h-3 text-rose-400" />
                                    <span>Dar de Baja</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3 text-emerald-400" />
                                    <span>Reactivar</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteProfile(p.email)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                                title="Eliminar del todo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CABLE CONSOLIDATION & TRAMO SETTINGS */}
          {activeTab === 'cables' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cable className="w-4 h-4 text-sky-400" />
                      Consolidado de Cables y Conductores Eléctricos
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Activa o desactiva las tablas de metrajes de cables. En obras donde solo se requiere avance de tuberías y cámaras, deshabilitar esta opción limpia la interfaz.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalConfig.enableCableConsolidation}
                      onChange={e => {
                        onUpdateGlobalConfig({
                          ...globalConfig,
                          enableCableConsolidation: e.target.checked
                        });
                        showToast(`Consolidado de Cables ${e.target.checked ? 'HABILITADO' : 'DESHABILITADO'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Opción por Tramo: "Solo Tubería (Sin Cableado)"
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Permite que en el panel de telemetría de cada tramo se pueda marcar si requiere solo tubería de canalización sin conductores.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={globalConfig.allowOnlyPipesOption}
                      onChange={e => {
                        onUpdateGlobalConfig({
                          ...globalConfig,
                          allowOnlyPipesOption: e.target.checked
                        });
                        showToast(`Opción 'Solo Tubería en tramo' ${e.target.checked ? 'HABILITADA' : 'DESHABILITADA'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Lock Blueprint Layout Setting */}
                <div className="border-t border-slate-800 pt-3.5 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-rose-400" />
                      Fijar Plano de Obra (Bloqueo de Layout)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bloquea el diseño estructural del plano. Impide crear, mover o borrar trazos, cámaras y áreas.
                      Permite interactuar, actualizar estados y revisar propiedades.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!globalConfig.lockBlueprintLayout}
                      onChange={e => {
                        onUpdateGlobalConfig({
                          ...globalConfig,
                          lockBlueprintLayout: e.target.checked
                        });
                        showToast(`Plano de Obra ${e.target.checked ? 'FIJADO (Bloqueado)' : 'DESBLOQUEADO'}`);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* Actas de Obra total quantity setting */}
                <div className="border-t border-slate-800 pt-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        Cantidad de Actas de Obra en Lista (N)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Define la cantidad de actas (Acta 1, Acta 2, ... Acta N) disponibles en la lista desplegable de la Bitácora y Filtros.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={globalConfig.totalActas || 10}
                        onChange={e => {
                          const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                          onUpdateGlobalConfig({
                            ...globalConfig,
                            totalActas: val
                          });
                          showToast(`Cantidad de Actas de Obra configurada a ${val} actas`);
                        }}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-emerald-300 text-center focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400 font-bold">Actas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Opciones de la lista:</span>
                    {Array.from({ length: Math.min(12, globalConfig.totalActas || 10) }, (_, i) => `Acta ${i + 1}`).map(actaName => (
                      <span key={actaName} className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded font-mono font-bold">
                        {actaName}
                      </span>
                    ))}
                    {(globalConfig.totalActas || 10) > 12 && (
                      <span className="text-slate-400 font-bold italic">+{(globalConfig.totalActas || 10) - 12} más...</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-sky-950/20 border border-sky-800/40 rounded-xl text-xs text-sky-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  💡 ¿Cómo funciona el tramo "Solo Tubería"?
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Cuando seleccionas un tramo en el plano y abres el Inspector de Telemetría, puedes marcar la casilla <strong className="text-amber-300">"Solo Tubería (Sin Cable)"</strong>. El sistema calculará la canalización en metros lineales y excluirá el tramo del cómputo de cables.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SUPABASE DATABASE CONFIRMATION */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    Estado de Conexión de Tablas en Supabase DB
                  </h3>
                  <p className="text-xs text-slate-400">
                    Monitorea la sincronización en tiempo real de las 6 tablas principales del proyecto de obra.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySqlSchema}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    title="Copiar Script DDL para ejecutar en Supabase SQL Editor"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{copiedSql ? '¡SQL Copiado!' : 'Copiar Script SQL Tablas'}</span>
                  </button>

                  <button
                    onClick={runDiagnostics}
                    disabled={checkingDb}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
                    <span>{checkingDb ? 'Verificando...' : 'Verificar Tablas Ahora'}</span>
                  </button>
                </div>
              </div>

              {/* Connection Status Banner */}
              {diagnostics && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  diagnostics.isOnline
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {diagnostics.isOnline ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                    )}
                    <span className="font-bold text-sm">{diagnostics.message}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{diagnostics.details}</p>

                  {/* 6-Table Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-amber-300 font-mono">profiles</code></span>
                      <span className="font-mono text-base font-extrabold text-emerald-400">{diagnostics.profilesCount} <span className="text-[10px] text-slate-400 font-normal">usuarios</span></span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-sky-300 font-mono">inspection_elements</code></span>
                      <span className="font-mono text-base font-extrabold text-sky-400">{diagnostics.elementsCount} <span className="text-[10px] text-slate-400 font-normal">elementos</span></span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-indigo-300 font-mono">schedule_items</code></span>
                      <span className="font-mono text-base font-extrabold text-indigo-300">{diagnostics.scheduleCount} <span className="text-[10px] text-slate-400 font-normal">rubros</span></span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-emerald-300 font-mono">daily_tracking_logs</code></span>
                      <span className="font-mono text-base font-extrabold text-emerald-300">{diagnostics.logsCount} <span className="text-[10px] text-slate-400 font-normal">informes</span></span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-purple-300 font-mono">area_sectors</code></span>
                      <span className="font-mono text-base font-extrabold text-purple-300">{diagnostics.areasCount} <span className="text-[10px] text-slate-400 font-normal">sectores</span></span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-0.5">
                      <span className="text-[11px] text-slate-400 block">Tabla <code className="text-amber-400 font-mono">version_history</code></span>
                      <span className="font-mono text-base font-extrabold text-amber-400">{diagnostics.historyCount} <span className="text-[10px] text-slate-400 font-normal">auditorías</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Arrival Checklist */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Garantía de Sincronización Completa
                </h4>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Creación de Usuarios:</strong> Al registrar un nuevo inspector o cambiar estado, la información se persiste en <code className="text-amber-300 font-mono">profiles</code>.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Elementos de Plano:</strong> Tramos, cámaras, tuberías y fotos se almacenan en <code className="text-sky-300 font-mono">inspection_elements</code>.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Cronograma y Metas:</strong> Los rubros y avances por entrega se conectan con <code className="text-indigo-300 font-mono">schedule_items</code>.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Informes Diarios y Auditoría:</strong> Las firmas y fotos diarias se sincronizan con <code className="text-emerald-300 font-mono">daily_tracking_logs</code> y <code className="text-amber-400 font-mono">version_history_logs</code>.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
          >
            Cerrar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
