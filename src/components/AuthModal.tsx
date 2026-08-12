import React, { useState } from 'react';
import { AuthUser } from '../types';
import { supabaseAuth, isSupabaseConfigured, supabaseProfiles } from '../lib/supabase';
import { X, LogIn, UserPlus, LogOut, Key, Mail, User, ShieldCheck, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onUserChanged: (user: AuthUser | null) => void;
  showToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  showToast
}) => {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabaseConnected = isSupabaseConfigured();

  const handleQuickLogin = async (quickEmail: string, quickPass: string, quickName: string) => {
    setErrorMessage('');
    setLoading(true);
    try {
      const cleanEmail = quickEmail.trim();
      const lowerEmail = cleanEmail.toLowerCase();
      const isTargetAdmin = lowerEmail === 'jheanmurillo73@gmail.com' ;

      // Check if profile is inactive
      const profiles = await supabaseProfiles.fetchProfiles();
      const existingProf = profiles.find(p => p.email.toLowerCase() === lowerEmail);
      if (existingProf && existingProf.status === 'inactive') {
        setErrorMessage(`❌ El perfil de ${cleanEmail} se encuentra INACTIVO / DADO DE BAJA. Por favor solicite la reactivación al Administrador.`);
        setLoading(false);
        return;
      }

      let activeUser: AuthUser | null = null;
      const { user, error } = await supabaseAuth.signInWithEmail(cleanEmail, quickPass);
      if (user) {
        activeUser = user;
      } else {
        const { user: newUser } = await supabaseAuth.signUpWithEmail(cleanEmail, quickPass, quickName);
        if (newUser) {
          activeUser = newUser;
        } else {
          // Guaranteed fallback for admin/quick login
          activeUser = {
            id: `usr_${Date.now()}`,
            email: cleanEmail,
            fullName: quickName,
            role: isTargetAdmin ? 'admin' : 'inspector',
            provider: 'Sesión Directa'
          };
          localStorage.setItem('obra_control_user_session', JSON.stringify(activeUser));
        }
      }

      // Ensure role property is set
      activeUser.role = isTargetAdmin ? 'admin' : (activeUser.role || 'inspector');

      await supabaseProfiles.saveProfile({
        id: activeUser.id,
        email: activeUser.email,
        fullName: activeUser.fullName || quickName,
        role: isTargetAdmin ? 'admin' : (existingProf?.role === 'admin' ? 'admin' : 'inspector'),
        status: 'active',
        createdAt: new Date().toISOString()
      });

      onUserChanged(activeUser);
      showToast(`¡Sesión iniciada como ${activeUser.fullName || activeUser.email}!`);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión rápida');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const lowerEmail = cleanEmail.toLowerCase();
      const isTargetAdmin = lowerEmail === 'jheanmurillo73@gmail.com' ;

      const profiles = await supabaseProfiles.fetchProfiles();
      const existingProf = profiles.find(p => p.email.toLowerCase() === lowerEmail);

      if (!isSignUp && existingProf && existingProf.status === 'inactive') {
        setErrorMessage(`❌ El perfil de ${cleanEmail} ha sido DADO DE BAJA por el Administrador.`);
        setLoading(false);
        return;
      }

      let activeUser: AuthUser | null = null;

      if (isSignUp) {
        const { user, error } = await supabaseAuth.signUpWithEmail(cleanEmail, password, fullName);
        if (user) {
          activeUser = user;
        } else if (isTargetAdmin) {
          activeUser = {
            id: `usr_admin_${Date.now()}`,
            email: cleanEmail,
            fullName: fullName || cleanEmail.split('@')[0],
            role: 'admin',
            provider: 'Sesión Local Admin'
          };
          localStorage.setItem('obra_control_user_session', JSON.stringify(activeUser));
        } else {
          setErrorMessage(error || 'Error al crear la cuenta');
          setLoading(false);
          return;
        }
      } else {
        const { user, error } = await supabaseAuth.signInWithEmail(cleanEmail, password);
        if (user) {
          activeUser = user;
        } else if (isTargetAdmin) {
          // If cloud login fails for admin user, auto-fallback so admin is never locked out
          activeUser = {
            id: `usr_admin_${Date.now()}`,
            email: cleanEmail,
            fullName: fullName || cleanEmail.split('@')[0] || 'Jhean Murillo (Admin)',
            role: 'admin',
            provider: 'Sesión Local Admin'
          };
          localStorage.setItem('obra_control_user_session', JSON.stringify(activeUser));
        } else {
          setErrorMessage(error || 'Credenciales de acceso incorrectas');
          setLoading(false);
          return;
        }
      }

      if (activeUser) {
        activeUser.role = isTargetAdmin ? 'admin' : (activeUser.role || 'inspector');

        await supabaseProfiles.saveProfile({
          id: activeUser.id,
          email: activeUser.email,
          fullName: activeUser.fullName || fullName || cleanEmail.split('@')[0],
          role: isTargetAdmin ? 'admin' : 'inspector',
          status: 'active',
          createdAt: new Date().toISOString()
        });

        onUserChanged(activeUser);
        showToast(`Sesión iniciada como ${activeUser.fullName || activeUser.email}`);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado durante la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseAuth.signOut();
    onUserChanged(null);
    showToast('Sesión cerrada correctamente');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Autenticación Supabase</span>
                {supabaseConnected ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Cloud
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                    Modo Demo / Local
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Control de acceso de inspectores y supervisores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            /* Logged in view */
            <div className="space-y-4">
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border ${
                    (currentUser.email.toLowerCase() === 'jheanmurillo73@gmail.com' || currentUser.role === 'admin' || currentUser.email.toLowerCase().includes('admin'))
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50'
                  }`}>
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{currentUser.fullName}</h3>
                    <p className="text-xs text-slate-300 font-mono">{currentUser.email}</p>
                    
                    {(currentUser.email.toLowerCase() === 'jheanmurillo73@gmail.com' || currentUser.role === 'admin' || currentUser.email.toLowerCase().includes('admin')) ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-bold inline-block mt-1">
                        🛡️ Rol: Administrador Designado (Control Total)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-md font-bold inline-block mt-1">
                        👷 Rol: Inspector de Campo
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-400 pt-2 border-t border-slate-700/70 space-y-1">
                  <p>• ID Usuario: <span className="font-mono text-slate-300">{currentUser.id}</span></p>
                  <p>• Autenticación: <span className="text-emerald-400 font-medium">{currentUser.provider}</span></p>
                  <p className="text-[11px] text-slate-400">
                    {(currentUser.email.toLowerCase() === 'jheanmurillo73@gmail.com' || currentUser.role === 'admin' || currentUser.email.toLowerCase().includes('admin'))
                      ? '✓ Tienes privilegios de Administrador para configurar sectores, KPI y subir planos.'
                      : '✓ Tienes permisos de Inspector para registrar avances diarios, bitácora y capturar fotos.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            /* Login/Register Form */
            <div>
              {/* Preset Account Quick Fill */}
              <div className="mb-3 p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <p className="text-[11px] text-slate-400 font-medium">Accesos Rápidos Directos:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setEmail('jheanmurillo73@gmail.com');
                      setPassword('Admin123!');
                      setFullName('Jhean Murillo (Admin)');
                      handleQuickLogin('jheanmurillo73@gmail.com', 'Admin123!', 'Jhean Murillo (Admin)');
                    }}
                    className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold text-left transition disabled:opacity-50"
                  >
                    👑 Entrar como Administrador<br/>
                    <span className="font-mono text-[10px] text-slate-400">jheanmurillo73@gmail.com</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setEmail('inspector@obramat.com');
                      setPassword('Inspector123!');
                      setFullName('Ing. Inspector de Campo');
                      handleQuickLogin('inspector@obramat.com', 'Inspector123!', 'Ing. Inspector de Campo');
                    }}
                    className="flex-1 py-1.5 px-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-semibold text-left transition disabled:opacity-50"
                  >
                    👷 Entrar como Inspector<br/>
                    <span className="font-mono text-[10px] text-slate-400">inspector@obramat.com</span>
                  </button>
                </div>
              </div>
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800 mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMessage(''); }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                    !isSignUp ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-400" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMessage(''); }}
                  className={`py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                    isSignUp ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Crear Cuenta</span>
                </button>
              </div>

              {!supabaseConnected && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200/90 flex gap-2.5 items-start">
                  <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">Aviso Supabase:</span> Para conectar tu proyecto de Supabase en producción, agrega <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300 font-mono">VITE_SUPABASE_URL</code> y <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-300 font-mono">VITE_SUPABASE_ANON_KEY</code> a las variables de entorno. Puedes probar el inicio de sesión local de inmediato.
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {isSignUp && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nombre Completo del Inspector</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Ing. Carlos Mendoza"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="inspector@empresa.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contraseña</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-bold text-white transition shadow-md flex items-center justify-center gap-2 ${
                    isSignUp
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                      : 'bg-sky-600 hover:bg-sky-500 shadow-sky-950/50'
                  }`}
                >
                  {loading ? (
                    <span>Procesando...</span>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Registrarse en Supabase</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Ingresar al Sistema</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="bg-slate-950/80 px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Seguridad de Obra</span>
          <span className="text-slate-300 font-mono">v2.4 - Supabase Auth</span>
        </div>
      </div>
    </div>
  );
};
