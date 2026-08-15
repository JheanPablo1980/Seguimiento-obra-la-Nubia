import React, { useRef, useState } from 'react';
import { 
  Compass, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Printer, 
  Download, 
  Sparkles, 
  FileText,
  Calendar,
  UserCheck,
  ShieldCheck,
  User,
  HardHat,
  Shield,
  Image,
  Settings,
  History,
  CalendarCheck,
  FileSpreadsheet,
  Menu,
  X,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  ClipboardList,
  Building2,
  Zap,
  Cloud,
  CloudOff,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { AuthUser, ProjectLayer } from '../types';

interface HeaderProps {
  onFileUpload: (file: File) => void;
  pdfDoc: any;
  currentPdfPage: number;
  totalPdfPages: number;
  onPrevPdfPage: () => void;
  onNextPdfPage: () => void;
  onClearCanvas: () => void;
  onExportPDF: () => void;
  onOpenDataBackup: () => void;
  onOpenConfig?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenScheduleProgress?: (tab?: 'matrix' | 'bySector' | 'byElement' | 'manage' | 'import') => void;
  onOpenMemoriaModal?: (showImport?: boolean) => void;
  onOpenAiRecognition?: () => void;
  showCharts: boolean;
  onToggleCharts: () => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onOpenDailyTrackingModal: () => void;
  appMode: 'admin' | 'field';
  onToggleAppMode: () => void;
  onExportAnnotatedBlueprintPNG: () => void;
  activeTab?: string;
  onSelectTab?: (tab: 'dashboard' | 'planos' | 'bitacora' | 'sectores') => void;
  activeLayer?: ProjectLayer;
  onChangeActiveLayer?: (layer: ProjectLayer) => void;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  onFileUpload,
  pdfDoc,
  currentPdfPage,
  totalPdfPages,
  onPrevPdfPage,
  onNextPdfPage,
  onClearCanvas,
  onExportPDF,
  onOpenDataBackup,
  onOpenConfig,
  onOpenVersionHistory,
  onOpenScheduleProgress,
  onOpenMemoriaModal,
  onOpenAiRecognition,
  showCharts,
  onToggleCharts,
  currentUser,
  onOpenAuthModal,
  onOpenDailyTrackingModal,
  appMode,
  onToggleAppMode,
  onExportAnnotatedBlueprintPNG,
  activeTab = 'dashboard',
  onSelectTab,
  activeLayer = 'civil',
  onChangeActiveLayer,
  syncStatus = 'synced'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
      setIsMobileMenuOpen(false);
    }
  };

  const handleNavigate = (tab: 'dashboard' | 'planos' | 'bitacora' | 'sectores') => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-slate-900 text-white p-2.5 sm:p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-2.5 border border-slate-800 relative z-30">
        {/* Left: Brand / Title + Mode & Sync Pills */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-2.5 rounded-xl flex items-center justify-center font-black shadow-md shrink-0 transition-transform active:scale-95 ${
            appMode === 'field' ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40' : 'bg-sky-500 text-slate-950 ring-2 ring-sky-400/40'
          }`}>
            {appMode === 'field' ? <HardHat className="w-5 h-5 sm:w-6 sm:h-6" /> : <Compass className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-tight text-white truncate">
                Control de Obra
              </h1>

              {/* Mode Badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${
                appMode === 'field' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              }`}>
                {appMode === 'field' ? <HardHat className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                <span>{appMode === 'field' ? 'Campo' : 'Admin'}</span>
              </span>

              {/* Active Layer Pill (Mobile & Desktop) */}
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 border ${
                activeLayer === 'electrica'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                {activeLayer === 'electrica' ? '⚡ Eléctrica' : '🏗️ Civil'}
              </span>

              {/* Sync Status Indicator */}
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                syncStatus === 'synced' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800' :
                syncStatus === 'syncing' ? 'text-amber-400 bg-amber-950/60 border border-amber-800 animate-pulse' :
                'text-rose-400 bg-rose-950/60 border border-rose-800'
              }`}>
                {syncStatus === 'synced' ? <Cloud className="w-3 h-3 text-emerald-400" /> :
                 syncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" /> :
                 <CloudOff className="w-3 h-3 text-rose-400" />}
                <span className="hidden md:inline">{syncStatus === 'synced' ? 'Nube OK' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}</span>
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block mt-0.5">
              {appMode === 'field'
                ? 'Acceso de Inspector: Planos, Metrajes y Registro de Hallazgos'
                : 'Gestión Integral: Canalizaciones, Cámaras, Metrajes, Cronograma y Actas'}
            </p>
          </div>
        </div>

        {/* Right Desktop Bar (Hidden on Mobile < lg) */}
        <div className="hidden lg:flex items-center gap-2 no-print flex-wrap">
          {/* Toggle Mode Button */}
          <button
            type="button"
            onClick={onToggleAppMode}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm border active:scale-95 ${
              appMode === 'field'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 hover:from-amber-400 hover:to-yellow-400'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 hover:from-sky-500 hover:to-blue-500'
            }`}
            title="Alternar entre vista de Administrador y Vista Compacta de Campo"
          >
            {appMode === 'field' ? (
              <>
                <Shield className="w-4 h-4 text-slate-950" />
                <span>Ver como Administrador</span>
              </>
            ) : (
              <>
                <HardHat className="w-4 h-4 text-white" />
                <span>Ver Modo Campo (Inspector)</span>
              </>
            )}
          </button>

          {/* Field mode action buttons */}
          {appMode === 'field' && (
            <>
              {/* Guardar/Exportar Imagen con Tramos y Metrajes */}
              <button
                type="button"
                onClick={onExportAnnotatedBlueprintPNG}
                className="min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                title="Guardar imagen del plano con todos los tramos, metrajes, tuberías y calibres dibujados"
              >
                <Image className="w-4 h-4 text-emerald-200" />
                <span>Guardar Plano PNG</span>
              </button>

              {/* Guardar Seguimiento del Día Button */}
              <button
                type="button"
                onClick={onOpenDailyTrackingModal}
                className="min-h-[40px] bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                title="Guardar o consultar la bitácora del avance del día"
              >
                <Calendar className="w-4 h-4 text-slate-950" />
                <span>Seguimiento del Día</span>
              </button>
            </>
          )}

          {/* Cronograma y Avance de Obra Button (Admin Only) */}
          {appMode === 'admin' && onOpenScheduleProgress && (
            <button
              type="button"
              onClick={() => onOpenScheduleProgress('matrix')}
              className="min-h-[40px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-indigo-500/50 shadow-sm active:scale-95"
              title="Ver matriz del cronograma de entregas y avance físico por ID de tubería/cámara/sector"
            >
              <CalendarCheck className="w-4 h-4 text-amber-300" />
              <span>Cronograma y Avance</span>
            </button>
          )}

          {/* Memoria de Cálculo / Actas Button (Admin Only) */}
          {appMode === 'admin' && onOpenMemoriaModal && (
            <button
              type="button"
              onClick={() => onOpenMemoriaModal(false)}
              className="min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm border border-emerald-500/50 active:scale-95"
              title="Abrir memorias de cálculo y resumen por Actas de Cobro"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>Actas</span>
            </button>
          )}

          {/* Supabase Auth User Button */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border active:scale-95 ${
              currentUser
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="Autenticación Supabase de inspectores"
          >
            {currentUser ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[110px] truncate">{currentUser.fullName || currentUser.email}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Login Supabase</span>
              </>
            )}
          </button>

          {/* Admin only action buttons */}
          {appMode === 'admin' && (
            <>
              {/* Realtime Charts view toggle */}
              <button
                type="button"
                onClick={onToggleCharts}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border active:scale-95 ${
                  showCharts
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-300" />
                <span>{showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}</span>
              </button>

              {/* File Upload Button */}
              <label className="min-h-[40px] bg-sky-600 hover:bg-sky-500 text-white border border-sky-500 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 transition shadow-sm active:scale-95">
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>Cargar Plano</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.jpg,.jpeg,.png,.webp,.pdf"
                  className="hidden"
                />
              </label>

              {/* AI Auto-Recognition Button */}
              {onOpenAiRecognition && (
                <button
                  type="button"
                  onClick={onOpenAiRecognition}
                  className="min-h-[40px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-500/20 active:scale-95"
                  title="Reconocer automáticamente cámaras (BT, MT, D) y canalizaciones en el plano JPG/PNG con IA"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Escanear IA</span>
                </button>
              )}

              {/* PDF Navigation Controls */}
              {pdfDoc && (
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-200 gap-1.5 min-h-[40px]">
                  <button
                    type="button"
                    onClick={onPrevPdfPage}
                    disabled={currentPdfPage <= 1}
                    className="p-1.5 hover:text-sky-400 disabled:opacity-40 rounded-lg active:scale-90"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xs font-bold">
                    Pág {currentPdfPage}/{totalPdfPages}
                  </span>
                  <button
                    type="button"
                    onClick={onNextPdfPage}
                    disabled={currentPdfPage >= totalPdfPages}
                    className="p-1.5 hover:text-sky-400 disabled:opacity-40 rounded-lg active:scale-90"
                    title="Siguiente Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Clear Canvas */}
              <button
                type="button"
                onClick={onClearCanvas}
                className="min-h-[40px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                title="Limpiar trazos agregados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Limpiar</span>
              </button>

              {/* Version History & Audit Log */}
              {onOpenVersionHistory && (
                <button
                  type="button"
                  onClick={onOpenVersionHistory}
                  className="min-h-[40px] bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                  title="Historial de Versiones y Auditoría Supabase"
                >
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Historial</span>
                </button>
              )}

              {/* Module Config & User Status */}
              {onOpenConfig && (
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="min-h-[40px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition hover:border-amber-400 shadow-sm active:scale-95"
                  title="Configuración de Perfiles, Tuberías y Supabase DB"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>Config</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Mobile Quick Action Buttons & Hamburger Button (< lg) */}
        <div className="flex items-center gap-1.5 lg:hidden no-print shrink-0">
          {/* Quick AI Scan on Mobile if available */}
          {onOpenAiRecognition && appMode === 'admin' && (
            <button
              type="button"
              onClick={onOpenAiRecognition}
              className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center border border-purple-400 shadow-md active:scale-90 transition"
              title="Escanear plano con IA"
              aria-label="Escanear plano con IA"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
            </button>
          )}

          {/* Quick PNG Blueprint Export on Mobile */}
          <button
            type="button"
            onClick={onExportAnnotatedBlueprintPNG}
            className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center border border-emerald-400 shadow-md active:scale-90 transition"
            title="Descargar Plano PNG con Metrajes"
            aria-label="Descargar Plano PNG"
          >
            <Image className="w-5 h-5 text-emerald-100" />
          </button>

          {/* Primary Thumb-Friendly Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700 shadow-md active:scale-90 transition"
            aria-label="Abrir Menú Principal"
            title="Abrir Menú"
          >
            <Menu className="w-6 h-6 text-sky-400" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          MOBILE-FIRST HAMBURGER DRAWER / SLIDE-OVER SHEET (100% RESPONSIVE)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[400] flex justify-end animate-in fade-in duration-200">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 text-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2.5 rounded-xl font-bold ${
                  appMode === 'field' ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-slate-950'
                }`}>
                  {appMode === 'field' ? <HardHat className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-white truncate">
                    Menú de Control
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    Plano de Seguimiento e Inspección
                  </p>
                </div>
              </div>

              {/* Close Button (Thumb-Sized min 44px) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 flex items-center justify-center active:scale-90 transition"
                aria-label="Cerrar Menú"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 divide-y divide-slate-800/80 text-sm">
              {/* Section 0: User Profile / Auth Status */}
              <div className="pt-1">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center font-bold shrink-0 border border-slate-700">
                      {currentUser ? <UserCheck className="w-5 h-5 text-emerald-400" /> : <User className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {currentUser?.fullName || currentUser?.email || 'Inspector No Registrado'}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <span>{syncStatus === 'synced' ? 'Sincronizado Supabase' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Modo Offline'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAuthModal();
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0 border border-sky-400 shadow active:scale-95 transition"
                  >
                    {currentUser ? 'Cuenta' : 'Ingresar'}
                  </button>
                </div>
              </div>

              {/* Section 1: Mode Switcher (Admin vs Campo) */}
              <div className="pt-4 space-y-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                  Modo de Operación
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (appMode !== 'admin') onToggleAppMode();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition active:scale-95 ${
                      appMode === 'admin'
                        ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Administrador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (appMode !== 'field') onToggleAppMode();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition active:scale-95 ${
                      appMode === 'field'
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <HardHat className="w-4 h-4" />
                    <span>Inspector Campo</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Active Layer Switcher (Civiles vs Eléctricas) */}
              {onChangeActiveLayer && (
                <div className="pt-4 space-y-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                    Capa Activa de Trabajo
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeActiveLayer('civil');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition active:scale-95 ${
                        activeLayer === 'civil'
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <HardHat className="w-4 h-4" />
                      <span>🏗️ Obras Civiles</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onChangeActiveLayer('electrica');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition active:scale-95 ${
                        activeLayer === 'electrica'
                          ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>⚡ Obras Eléctricas</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Section 3: Navigation Views & Tabs */}
              <div className="pt-4 space-y-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                  Navegación de Módulos
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate('dashboard')}
                    className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between border transition active:scale-98 ${
                      activeTab === 'dashboard'
                        ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className="w-5 h-5 text-sky-400" />
                      <span>Panel de Control (Dashboard)</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('planos')}
                    className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between border transition active:scale-98 ${
                      activeTab === 'planos'
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-5 h-5 text-amber-400" />
                      <span>Plano Interactivo & Metrajes</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('bitacora')}
                    className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between border transition active:scale-98 ${
                      activeTab === 'bitacora'
                        ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardList className="w-5 h-5 text-teal-400" />
                      <span>Bitácora de Registro & Control</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('sectores')}
                    className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl font-bold text-xs flex items-center justify-between border transition active:scale-98 ${
                      activeTab === 'sectores'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-purple-400" />
                      <span>Sectores, Manzanas y Zonas</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>
                </div>
              </div>

              {/* Section 4: Blueprint File & PDF Controls */}
              <div className="pt-4 space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                  Gestión del Plano
                </span>

                {/* Upload Big Thumb Button */}
                <label className="w-full min-h-[48px] py-3 px-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md border border-sky-400 active:scale-95 transition">
                  <Upload className="w-5 h-5 text-amber-300 shrink-0" />
                  <span>Cargar Plano (JPG, PNG, PDF)</span>
                  <input
                    type="file"
                    ref={mobileFileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                  />
                </label>

                {/* AI Auto Recognition in Drawer */}
                {onOpenAiRecognition && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAiRecognition();
                    }}
                    className="w-full min-h-[48px] py-3 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md border border-purple-400 active:scale-95 transition"
                  >
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    <span>Escanear Plano con Inteligencia Artificial</span>
                  </button>
                )}

                {/* PDF Page Controls if PDF Loaded */}
                {pdfDoc && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-medium">Páginas PDF:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onPrevPdfPage}
                        disabled={currentPdfPage <= 1}
                        className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold border border-slate-700 active:scale-90"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="font-mono text-xs font-black text-amber-400 px-1">
                        {currentPdfPage} / {totalPdfPages}
                      </span>
                      <button
                        type="button"
                        onClick={onNextPdfPage}
                        disabled={currentPdfPage >= totalPdfPages}
                        className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-bold border border-slate-700 active:scale-90"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Reports, Tools & Operations */}
              <div className="pt-4 space-y-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                  Reportes y Herramientas
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {/* Cronograma Button */}
                  {onOpenScheduleProgress && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenScheduleProgress('matrix');
                      }}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <CalendarCheck className="w-5 h-5 text-indigo-400" />
                        <span>Cronograma de Entregas & Avance</span>
                      </div>
                      <span className="text-xs">→</span>
                    </button>
                  )}

                  {/* Actas Button */}
                  {onOpenMemoriaModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenMemoriaModal(false);
                      }}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        <span>Memorias de Cálculo & Actas de Cobro</span>
                      </div>
                      <span className="text-xs">→</span>
                    </button>
                  )}

                  {/* Daily Tracking Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenDailyTrackingModal();
                    }}
                    className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-amber-400" />
                      <span>Registro Diario de Inspección</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  {/* Export Annotated PNG */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onExportAnnotatedBlueprintPNG();
                    }}
                    className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Image className="w-5 h-5 text-emerald-400" />
                      <span>Exportar Plano Anotado (PNG)</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  {/* Export PDF Report */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onExportPDF();
                    }}
                    className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Printer className="w-5 h-5 text-sky-400" />
                      <span>Generar Informe PDF de Obra</span>
                    </div>
                    <span className="text-xs">→</span>
                  </button>

                  {/* Version History */}
                  {onOpenVersionHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenVersionHistory();
                      }}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-indigo-400" />
                        <span>Historial de Versiones & Auditoría</span>
                      </div>
                      <span className="text-xs">→</span>
                    </button>
                  )}

                  {/* System Settings */}
                  {onOpenConfig && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenConfig();
                      }}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-5 h-5 text-amber-400" />
                        <span>Configuración del Sistema</span>
                      </div>
                      <span className="text-xs">→</span>
                    </button>
                  )}

                  {/* Clear Drawings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onClearCanvas();
                    }}
                    className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 font-bold text-xs flex items-center justify-between active:scale-98 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-5 h-5 text-rose-400" />
                      <span>Limpiar Trazos del Plano</span>
                    </div>
                    <span className="text-xs">⚠️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-400 shrink-0">
              <p className="font-semibold text-slate-300">Sistema Móvil de Control de Obra</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Versión Mobile-First Optimizada para Campo</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

