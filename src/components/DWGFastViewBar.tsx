import React, { useState } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Search, 
  MoreHorizontal, 
  MessageSquare, 
  Pencil, 
  Edit3, 
  Layers, 
  Ruler, 
  ClipboardList,
  CheckCircle2,
  HardHat,
  Zap,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  FileText
} from 'lucide-react';
import { ProjectLayer, InspectionElement, AuthUser, ProjectMeta, StatusType } from '../types';

interface DWGFastViewBarProps {
  activeView: 'planos' | 'bitacora' | 'medir' | 'editar';
  onSelectView: (view: 'planos' | 'bitacora' | 'medir' | 'editar') => void;
  activeLayer: ProjectLayer;
  onChangeActiveLayer: (layer: ProjectLayer) => void;
  selectedElement: InspectionElement | null;
  statusFilter?: 'all' | StatusType;
  onChangeStatusFilter?: (status: 'all' | StatusType) => void;
  pendingCount?: number;
  onOpenQuickEdit?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onResetFitView?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenSearch?: () => void;
  onSaveCloud?: () => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onExitInspector?: () => void;
  onOpenDailyTracking?: () => void;
  onExportPNG?: () => void;
  onOpenAiRecognition?: () => void;
  currentUser?: AuthUser | null;
  projectMeta?: ProjectMeta;
}

export const DWGFastViewBar: React.FC<DWGFastViewBarProps> = ({
  activeView,
  onSelectView,
  activeLayer,
  onChangeActiveLayer,
  selectedElement,
  statusFilter = 'all',
  onChangeStatusFilter,
  pendingCount = 0,
  onOpenQuickEdit,
  onUndo,
  onRedo,
  onResetFitView,
  onToggleFullscreen,
  isFullscreen = false,
  onOpenSearch,
  onSaveCloud,
  syncStatus,
  onExitInspector,
  onOpenDailyTracking,
  onExportPNG,
  onOpenAiRecognition,
  currentUser,
  projectMeta
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      {/* Top Floating Toolbar (Estilo DWG FastView) */}
      <div className="fixed top-2 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-xl z-[90] flex items-center justify-between gap-1.5 bg-black/90 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full border border-slate-700/80 shadow-2xl no-print">
        {/* Left: Close / Exit Inspector */}
        <button
          type="button"
          onClick={onExitInspector}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-rose-600 flex items-center justify-center text-slate-200 hover:text-white transition shrink-0"
          title="Salir del Modo Inspector (Ir a Administrador)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Center Actions: Save, Undo, Redo, Fit, Search, Fullscreen, Pending Filter */}
        <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center">
          {/* Quick Pending Filter Pill */}
          {onChangeStatusFilter && (
            <button
              type="button"
              onClick={() => onChangeStatusFilter(statusFilter === 'Pendiente' ? 'all' : 'Pendiente')}
              className={`px-2 py-1 rounded-full text-[10px] font-black transition flex items-center gap-1 border ${
                statusFilter === 'Pendiente'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-1 ring-rose-400 animate-pulse'
                  : 'bg-slate-800/90 text-amber-300 border-amber-500/40 hover:bg-slate-700'
              }`}
              title="Filtrar solo elementos Pendientes para inspeccionar"
            >
              <span>⚠️ Pendientes</span>
              {pendingCount > 0 && (
                <span className="bg-black/60 px-1 py-0.2 rounded-full font-mono text-[9px]">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* Save / Sync */}
          <button
            type="button"
            onClick={onSaveCloud}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition shrink-0"
            title="Guardar y Sincronizar en la Nube"
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            ) : syncStatus === 'synced' ? (
              <Save className="w-4 h-4 text-emerald-400" />
            ) : (
              <Save className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Undo */}
          <button
            type="button"
            onClick={onUndo}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition shrink-0"
            title="Deshacer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={onRedo}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition shrink-0"
            title="Rehacer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fit View / Frame */}
          <button
            type="button"
            onClick={onResetFitView}
            className="p-1.5 rounded-full hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition shrink-0"
            title="Ajustar y Centrar Plano 100%"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-sky-300 transition shrink-0"
            title="Buscar Elemento en Plano"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className={`p-1.5 rounded-full transition shrink-0 ${
              isFullscreen ? 'bg-rose-600/80 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa CAD"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* More Actions Menu (...) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className={`p-1.5 rounded-full transition shrink-0 ${
                isMoreMenuOpen ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Más Herramientas"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute top-10 right-0 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 z-[100] space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (onOpenDailyTracking) onOpenDailyTracking();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-bold transition"
                >
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Bitácora Diaria de Obra</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (onExportPNG) onExportPNG();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-bold transition"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Exportar Plano PNG Anotado</span>
                </button>
                {onOpenAiRecognition && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenAiRecognition();
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2 font-bold transition"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Reconocimiento IA de Plano</span>
                  </button>
                )}
                <div className="border-t border-slate-800 my-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (onExitInspector) onExitInspector();
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-rose-950/60 text-rose-300 rounded-lg flex items-center gap-2 font-bold transition"
                >
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>Modo Administrador</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Lateral Floating Badge [ A≡ ] (Direct Bitácora / Note Shortcut) */}
        <button
          type="button"
          onClick={() => onSelectView('bitacora')}
          className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-sky-600 text-sky-400 hover:text-white flex flex-col items-center justify-center font-mono font-black text-[10px] leading-tight transition shrink-0 border border-slate-700"
          title="Ver Bitácora de Observaciones"
        >
          <span className="font-extrabold text-xs">A≡</span>
        </button>
      </div>

      {/* Bottom Navigation Toolbar (Estilo Menú Inferior DWG FastView) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 z-[95] px-1 sm:px-2 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-around text-white shadow-2xl no-print min-h-[58px]">
        {/* 1. Plano (Canvas Interactivo) */}
        <button
          type="button"
          onClick={() => onSelectView('planos')}
          className={`min-w-0 flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 text-center ${
            activeView === 'planos'
              ? 'text-amber-400 bg-amber-500/15 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pencil className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">Plano</span>
        </button>

        {/* 2. Bitácora (Control y Registro) */}
        <button
          type="button"
          onClick={() => onSelectView('bitacora')}
          className={`min-w-0 flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 text-center ${
            activeView === 'bitacora'
              ? 'text-teal-400 bg-teal-500/15 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">Bitácora</span>
        </button>

        {/* 3. Editar (Ficha rápida del elemento seleccionado) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenQuickEdit) onOpenQuickEdit();
            else onSelectView('bitacora');
          }}
          className={`min-w-0 flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 text-center ${
            activeView === 'editar' || selectedElement
              ? 'text-sky-400 bg-sky-500/15 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Edit3 className="w-5 h-5 shrink-0" />
            {selectedElement && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">
            {selectedElement ? 'Editar' : 'Editar'}
          </span>
        </button>

        {/* 4. Capa (Alternar Civil / Eléctrica) */}
        <button
          type="button"
          onClick={() => onChangeActiveLayer(activeLayer === 'civil' ? 'electrica' : 'civil')}
          className={`min-w-0 flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 text-center ${
            activeLayer === 'civil'
              ? 'text-amber-300 hover:bg-amber-500/10'
              : 'text-cyan-300 hover:bg-cyan-500/10'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 shrink-0" />
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
              activeLayer === 'civil' ? 'bg-amber-400' : 'bg-cyan-400'
            }`}></span>
          </div>
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">
            {activeLayer === 'civil' ? 'Civil' : 'Eléctrica'}
          </span>
        </button>

        {/* 5. Medir (Herramienta de Metraje y Trazado) */}
        <button
          type="button"
          onClick={() => onSelectView('medir')}
          className={`min-w-0 flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition active:scale-95 text-center ${
            activeView === 'medir'
              ? 'text-emerald-400 bg-emerald-500/15 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ruler className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">Medir</span>
        </button>
      </div>
    </>
  );
};
