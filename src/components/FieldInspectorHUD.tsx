import React, { useState } from 'react';
import { InspectionElement, ProjectLayer, StatusType, ProjectMeta, AuthUser } from '../types';
import { 
  HardHat, 
  Zap, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  Crosshair,
  Camera,
  Calendar,
  Shield,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FieldInspectorHUDProps {
  currentUser: AuthUser | null;
  projectMeta: ProjectMeta;
  activeLayer: ProjectLayer;
  onChangeActiveLayer: (layer: ProjectLayer) => void;
  elements: InspectionElement[];
  selectedElement: InspectionElement | null;
  onSelectElement: (element: InspectionElement) => void;
  statusFilter: 'all' | StatusType;
  onChangeStatusFilter: (status: 'all' | StatusType) => void;
  iconScale: number;
  onChangeIconScale: (scale: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetCenter: () => void;
  onOpenDailyTracking: () => void;
  onToggleAdminMode: () => void;
  onOpenAuthModal: () => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
}

export const FieldInspectorHUD: React.FC<FieldInspectorHUDProps> = ({
  currentUser,
  projectMeta,
  activeLayer,
  onChangeActiveLayer,
  elements,
  selectedElement,
  onSelectElement,
  statusFilter,
  onChangeStatusFilter,
  iconScale,
  onChangeIconScale,
  isFullscreen,
  onToggleFullscreen,
  onResetCenter,
  onOpenDailyTracking,
  onToggleAdminMode,
  onOpenAuthModal,
  syncStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter elements by layer
  const layerElements = elements.filter(e => (e.layer || 'civil') === activeLayer);

  // Status counts
  const totalLayer = layerElements.length;
  const pendingCount = layerElements.filter(e => e.status === 'Pendiente').length;
  const processCount = layerElements.filter(e => e.status === 'En proceso').length;
  const doneCount = layerElements.filter(e => e.status === 'Terminado').length;
  const totalPercent = totalLayer > 0 ? Math.round((doneCount / totalLayer) * 100) : 0;

  // Filtered elements based on statusFilter and searchQuery
  const filteredElements = layerElements.filter(e => {
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesSearch = !searchQuery || e.label.toLowerCase().includes(searchQuery.toLowerCase()) || (e.observations || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Cycle next / prev
  const currentIdx = selectedElement ? filteredElements.findIndex(e => e.id === selectedElement.id) : -1;
  const handlePrev = () => {
    if (filteredElements.length === 0) return;
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : filteredElements.length - 1;
    onSelectElement(filteredElements[prevIdx]);
  };
  const handleNext = () => {
    if (filteredElements.length === 0) return;
    const nextIdx = currentIdx < filteredElements.length - 1 ? currentIdx + 1 : 0;
    onSelectElement(filteredElements[nextIdx]);
  };

  const cycleScale = () => {
    if (iconScale <= 1.6) onChangeIconScale(2.2);
    else if (iconScale <= 2.2) onChangeIconScale(2.8);
    else if (iconScale <= 2.8) onChangeIconScale(3.5);
    else if (iconScale <= 3.5) onChangeIconScale(4.5);
    else onChangeIconScale(1.6);
  };

  return (
    <div className="flex flex-col gap-2 w-full no-print">
      {/* Top Main Inspector Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 text-white shadow-xl space-y-2">
        {/* Row 1: Inspector & Project Badge + Sync & Progress */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-amber-500 rounded-xl text-slate-950 font-black shrink-0 shadow-md">
              <HardHat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-300 truncate">
                  {projectMeta.inspectorName || currentUser?.fullName || 'Inspector en Terreno'}
                </span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700 font-mono uppercase">
                  Móvil
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate block">
                {projectMeta.projectName || 'Proyecto de Obra'} • {projectMeta.sectorLocation || 'Frente General'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sync Pill */}
            <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-slate-950 font-bold">
              {syncStatus === 'synced' ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden xs:inline">En Línea</span>
                </span>
              ) : syncStatus === 'syncing' ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span className="hidden xs:inline">Guardando</span>
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span className="hidden xs:inline">Offline</span>
                </span>
              )}
            </div>

            {/* Total Progress Badge */}
            <div className="text-[11px] bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-black font-mono">
              {doneCount}/{totalLayer} ({totalPercent}%)
            </div>

            {/* Fullscreen Quick Button */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded-lg text-xs font-black flex items-center gap-1 border transition shadow-sm ${
                isFullscreen
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300'
              }`}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa en celular"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Row 2: Dynamic Layer Switcher + Scale + Quick Search */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Layer Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 flex-1 min-w-[190px]">
            <button
              type="button"
              onClick={() => onChangeActiveLayer('civil')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition ${
                activeLayer === 'civil'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-1 ring-white/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>🏗️ Civiles</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeActiveLayer('electrica')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition ${
                activeLayer === 'electrica'
                  ? 'bg-cyan-400 text-slate-950 shadow-md font-black ring-1 ring-white/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Eléctricas</span>
            </button>
          </div>

          {/* Quick Tools: Scale, Center, Search, Mode */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Scale Toggle */}
            <button
              type="button"
              onClick={cycleScale}
              className="px-2 py-1.5 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              title="Ajustar tamaño de íconos"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{iconScale}x</span>
            </button>

            {/* Reset Center */}
            <button
              type="button"
              onClick={onResetCenter}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition"
              title="Centrar plano al 100%"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Toggle Search Bar */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(s => !s)}
              className={`p-2 rounded-xl text-xs font-bold border transition ${
                isSearchOpen || searchQuery
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Buscar elemento en el plano"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Switch to Admin Mode */}
            <button
              type="button"
              onClick={onToggleAdminMode}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition"
              title="Cambiar a vista de administración"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Quick Search Input */}
        {isSearchOpen && (
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-sky-500/50 animate-in fade-in duration-150">
            <Search className="w-4 h-4 text-sky-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cámara, caja o tramo (ej. SB-01, TR-02)..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-bold"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Row 3: Dynamic Status Filter Tabs (Todos, Pendientes, En Proceso, Terminados) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Todos */}
          <button
            type="button"
            onClick={() => onChangeStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 border ${
              statusFilter === 'all'
                ? 'bg-slate-100 text-slate-950 border-white shadow-sm font-black'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span>Todos</span>
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {totalLayer}
            </span>
          </button>

          {/* Pendientes */}
          <button
            type="button"
            onClick={() => onChangeStatusFilter('Pendiente')}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 border ${
              statusFilter === 'Pendiente'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md font-black'
                : 'bg-slate-950 text-rose-300 border-slate-800 hover:border-rose-900/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pendientes</span>
            <span className="bg-rose-950 text-rose-200 border border-rose-800 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {pendingCount}
            </span>
          </button>

          {/* En Proceso */}
          <button
            type="button"
            onClick={() => onChangeStatusFilter('En proceso')}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 border ${
              statusFilter === 'En proceso'
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                : 'bg-slate-950 text-amber-300 border-slate-800 hover:border-amber-900/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En Proceso</span>
            <span className="bg-amber-950 text-amber-200 border border-amber-800 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {processCount}
            </span>
          </button>

          {/* Terminados */}
          <button
            type="button"
            onClick={() => onChangeStatusFilter('Terminado')}
            className={`px-2.5 py-1.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 border ${
              statusFilter === 'Terminado'
                ? 'bg-emerald-600 text-white border-emerald-300 shadow-md font-black'
                : 'bg-slate-950 text-emerald-300 border-slate-800 hover:border-emerald-900/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terminados</span>
            <span className="bg-emerald-950 text-emerald-200 border border-emerald-800 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {doneCount}
            </span>
          </button>
        </div>

        {/* Row 4: Fast Element Carousel / Stepper if elements exist */}
        {filteredElements.length > 0 && (
          <div className="flex items-center justify-between gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 border border-slate-800"
              title="Elemento Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Picker Dropdown */}
            <select
              value={selectedElement?.id || ''}
              onChange={(e) => {
                const el = filteredElements.find(item => item.id === Number(e.target.value));
                if (el) onSelectElement(el);
              }}
              className="bg-slate-900 text-xs font-black text-white border border-slate-700 rounded-lg px-2.5 py-1.5 flex-1 max-w-[240px] text-center truncate focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Seleccionar Elemento ({filteredElements.length}) --</option>
              {filteredElements.map(el => (
                <option key={el.id} value={el.id}>
                  {el.label} ({el.status} - {el.progressPercent ?? (el.status === 'Terminado' ? 100 : el.status === 'En proceso' ? 50 : 0)}%)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 border border-slate-800"
              title="Elemento Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
