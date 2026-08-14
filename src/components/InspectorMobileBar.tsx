import React, { useRef } from 'react';
import { AuthUser, ProjectLayer, ProjectMeta } from '../types';
import { 
  HardHat, 
  Zap, 
  Layers, 
  Calendar, 
  Camera, 
  Image, 
  Shield, 
  UserCheck, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  ZoomIn
} from 'lucide-react';

interface InspectorMobileBarProps {
  currentUser: AuthUser | null;
  projectMeta: ProjectMeta;
  activeLayer: ProjectLayer;
  onChangeActiveLayer: (layer: ProjectLayer) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onOpenDailyTracking: () => void;
  onExportPNG: () => void;
  onToggleAppMode: () => void;
  onOpenAuthModal: () => void;
  onFastPhotoCapture?: (file: File) => void;
  totalElementsCount: number;
  completedCount: number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  iconScale?: number;
  onChangeIconScale?: (scale: number) => void;
}

export const InspectorMobileBar: React.FC<InspectorMobileBarProps> = ({
  currentUser,
  projectMeta,
  activeLayer,
  onChangeActiveLayer,
  syncStatus,
  onOpenDailyTracking,
  onExportPNG,
  onToggleAppMode,
  onOpenAuthModal,
  onFastPhotoCapture,
  totalElementsCount,
  completedCount,
  onToggleFullscreen,
  isFullscreen = false,
  iconScale = 2.2,
  onChangeIconScale
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFastPhotoCapture) {
      onFastPhotoCapture(file);
      e.target.value = '';
    }
  };

  const cycleIconScale = () => {
    if (!onChangeIconScale) return;
    if (iconScale <= 1.6) onChangeIconScale(2.2);
    else if (iconScale <= 2.2) onChangeIconScale(2.8);
    else if (iconScale <= 2.8) onChangeIconScale(3.5);
    else onChangeIconScale(1.6);
  };

  const percent = totalElementsCount > 0 ? Math.round((completedCount / totalElementsCount) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white shadow-lg space-y-2 no-print">
      {/* Row 1: Inspector Profile, Project Location, & Sync Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-amber-500 rounded-lg text-slate-950 font-black shrink-0 shadow-sm">
            <HardHat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-300 truncate">
                {projectMeta.inspectorName || currentUser?.fullName || 'Inspector de Obra'}
              </span>
              <button
                onClick={onOpenAuthModal}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-semibold shrink-0"
              >
                {currentUser ? 'Cuenta' : 'Login'}
              </button>
            </div>
            <span className="text-[10px] text-slate-400 truncate block">
              {projectMeta.sectorLocation || 'Frente General de Obra'}
            </span>
          </div>
        </div>

        {/* Sync & Progress Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-slate-950 font-bold">
            {syncStatus === 'synced' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>En Línea</span>
              </span>
            ) : syncStatus === 'syncing' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Guardando</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Offline</span>
              </span>
            )}
          </div>

          <div className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-black">
            {percent}% Avance
          </div>
        </div>
      </div>

      {/* Row 2: Thumb-Friendly Layer Switcher + Fullscreen + Quick Actions */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        {/* Layer Selector */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-1 min-w-[170px]">
          <button
            type="button"
            onClick={() => onChangeActiveLayer('civil')}
            className={`flex-1 py-1.5 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeLayer === 'civil'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>🏗️ Civiles</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeActiveLayer('electrica')}
            className={`flex-1 py-1.5 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeLayer === 'electrica'
                ? 'bg-cyan-400 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Eléctricas</span>
          </button>
        </div>

        {/* Fullscreen & Quick Actions Buttons for Field Inspector */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Prominent Fullscreen Toggle Button */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-sm border ${
                isFullscreen
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 animate-pulse'
              }`}
              title={isFullscreen ? "Salir de Pantalla Completa" : "Ver plano en Pantalla Completa del celular"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'Salir' : '⛶ Pantalla Completa'}</span>
            </button>
          )}

          {/* Quick Icon Scale Toggle */}
          {onChangeIconScale && (
            <button
              type="button"
              onClick={cycleIconScale}
              className="px-2 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              title="Ajustar tamaño de íconos en el plano"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Íconos {iconScale}x</span>
            </button>
          )}

          {/* Quick Photo Capture Button using Android camera */}
          <label className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs" title="Tomar foto con la cámara del celular">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Foto</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleCapturePhoto}
              className="hidden"
            />
          </label>

          {/* Daily tracking button */}
          <button
            type="button"
            onClick={onOpenDailyTracking}
            className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
            title="Seguimiento Diario de Obra"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Diario</span>
          </button>

          {/* PNG Export */}
          <button
            type="button"
            onClick={onExportPNG}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
            title="Guardar Plano Anotado en Imagen PNG"
          >
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          {/* Switch to Admin Mode */}
          <button
            type="button"
            onClick={onToggleAppMode}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            title="Cambiar a Vista de Administrador"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
