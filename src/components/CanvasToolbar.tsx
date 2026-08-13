import React from 'react';
import { CameraNorm, ProjectLayer } from '../types';
import { 
  Hand, 
  Highlighter, 
  Ruler, 
  MapPin, 
  VectorSquare, 
  Eraser, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Eye, 
  EyeOff, 
  Undo2, 
  Check, 
  X,
  Layers,
  FileSpreadsheet,
  Sparkles,
  Zap,
  HardHat,
  Boxes
} from 'lucide-react';
import { ELECTRICAL_NODE_TYPES } from '../utils/layerUtils';

export type ToolType = 'pan' | 'highlight' | 'straight' | 'camera' | 'area' | 'eraser';

interface CanvasToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  // Layer Management
  activeLayer?: ProjectLayer;
  onChangeActiveLayer?: (layer: ProjectLayer) => void;
  layerVisibility?: { civil: boolean; electrica: boolean };
  onToggleLayerVisibility?: (layer: ProjectLayer) => void;
  // Area drawing controls
  areaPointCount: number;
  onUndoAreaPoint: () => void;
  onFinishArea: () => void;
  onCancelArea: () => void;
  // Camera & Node config
  camPrefix: string;
  onCamPrefixChange: (val: string) => void;
  camCounter: number;
  onCamCounterChange: (val: number) => void;
  camDefaultType: CameraNorm;
  onCamDefaultTypeChange: (val: CameraNorm) => void;
  // Zoom
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit?: () => void;
  isLocked?: boolean;
  // Visibility
  showCameraLabels: boolean;
  onToggleCameraLabels: () => void;
  showLineLabels: boolean;
  onToggleLineLabels: () => void;
  showAreaLabels: boolean;
  onToggleAreaLabels: () => void;
  showSpecsLabels: boolean;
  onToggleSpecsLabels: () => void;
  iconScale?: number;
  onChangeIconScale?: (scale: number) => void;
  appMode?: 'admin' | 'field';
  onOpenAiRecognition?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  currentTool,
  onSelectTool,
  activeLayer = 'civil',
  onChangeActiveLayer,
  layerVisibility = { civil: true, electrica: true },
  onToggleLayerVisibility,
  areaPointCount,
  onUndoAreaPoint,
  onFinishArea,
  onCancelArea,
  camPrefix,
  onCamPrefixChange,
  camCounter,
  onCamCounterChange,
  camDefaultType,
  onCamDefaultTypeChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  isLocked = false,
  showCameraLabels,
  onToggleCameraLabels,
  showLineLabels,
  onToggleLineLabels,
  showAreaLabels,
  onToggleAreaLabels,
  showSpecsLabels,
  onToggleSpecsLabels,
  iconScale = 1.6,
  onChangeIconScale,
  appMode = 'admin',
  onOpenAiRecognition
}) => {
  const isElectric = activeLayer === 'electrica';

  return (
    <div className="flex flex-col gap-2">
      {/* 1. LAYER MANAGEMENT & MULTI-LAYER CONTROLLER BAR */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 shadow-md no-print text-white flex flex-wrap items-center justify-between gap-2.5">
        {/* Active Working Layer Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Capa Activa de Trabajo:</span>
            <span className="sm:hidden">Capa:</span>
          </span>

          <div className="inline-flex bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
            {/* Obras Civiles Tab */}
            <button
              type="button"
              onClick={() => {
                if (onChangeActiveLayer) {
                  onChangeActiveLayer('civil');
                  if (camPrefix.startsWith('TD') || camPrefix.startsWith('TR') || camPrefix.startsWith('CE')) {
                    onCamPrefixChange('C-');
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-black flex items-center gap-1.5 transition-all ${
                activeLayer === 'civil'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Capa Obras Civiles: Excavación, canalizaciones, bancos de ductos y cámaras de concreto"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>🏗️ Obras Civiles</span>
            </button>

            {/* Obras Eléctricas Tab */}
            <button
              type="button"
              onClick={() => {
                if (onChangeActiveLayer) {
                  onChangeActiveLayer('electrica');
                  if (camPrefix === 'C-' || camPrefix === 'C') {
                    onCamPrefixChange('TD-');
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-black flex items-center gap-1.5 transition-all ${
                activeLayer === 'electrica'
                  ? 'bg-cyan-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Capa Obras Eléctricas: Redes de cableado, circuitos, alimentadores, tableros, transformadores y empalmes"
            >
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>⚡ Obras Eléctricas</span>
            </button>
          </div>
        </div>

        {/* Layer Visibility Toggles (Eye Controls for Overlapping) */}
        {onToggleLayerVisibility && (
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Superposición:</span>
            </span>

            {/* Toggle Civil Layer Visibility */}
            <button
              type="button"
              onClick={() => onToggleLayerVisibility('civil')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border transition ${
                layerVisibility.civil
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/80 shadow-2xs'
                  : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60 line-through'
              }`}
              title="Mostrar / Ocultar Capa de Obras Civiles en el plano"
            >
              {layerVisibility.civil ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              <span>Civiles</span>
            </button>

            {/* Toggle Electrica Layer Visibility */}
            <button
              type="button"
              onClick={() => onToggleLayerVisibility('electrica')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 border transition ${
                layerVisibility.electrica
                  ? 'bg-cyan-950/70 text-cyan-300 border-cyan-600/80 shadow-2xs'
                  : 'bg-slate-950 text-slate-500 border-slate-800 opacity-60 line-through'
              }`}
              title="Mostrar / Ocultar Capa de Obras Eléctricas en el plano"
            >
              {layerVisibility.electrica ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              <span>Eléctricas</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN TOOLBAR: DRAWING TOOLS, ZOOM & AI */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Pan / Inspect Tool */}
          <button
            onClick={() => onSelectTool('pan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              currentTool === 'pan'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
            title="Mover lienzo o hacer clic y arrastrar cámaras, tableros o canalizaciones para reubicarlas en el plano"
          >
            <Hand className="w-3.5 h-3.5 text-amber-900" />
            <span>Mover / Inspeccionar</span>
          </button>

          {appMode === 'admin' && (
            <>
              {/* Highlight Tool */}
              <button
                onClick={() => onSelectTool('highlight')}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                  currentTool === 'highlight'
                    ? 'bg-sky-100 text-sky-900 border-sky-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Resaltador / Trazo libre"
              >
                <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                <span>Resaltador</span>
              </button>

              {/* Straight Line Tool (Adaptive by active layer) */}
              <button
                onClick={() => onSelectTool('straight')}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                  currentTool === 'straight'
                    ? isElectric
                      ? 'bg-cyan-100 text-cyan-950 border-cyan-400 shadow-sm ring-1 ring-cyan-400'
                      : 'bg-sky-100 text-sky-900 border-sky-300 shadow-sm ring-1 ring-sky-300'
                    : isElectric
                      ? 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border-cyan-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isElectric ? "Trazar Cableado / Circuito Eléctrico" : "Trazo Recto de Canalización Subterránea"}
              >
                {isElectric ? (
                  <Zap className="w-3.5 h-3.5 text-cyan-600" />
                ) : (
                  <Ruler className="w-3.5 h-3.5 text-sky-600" />
                )}
                <span>{isElectric ? '⚡ Trazar Cableado / Circuito' : 'Trazar Canalización'}</span>
              </button>

              {/* Camera / Electrical Node Tool (Adaptive by active layer) */}
              <button
                onClick={() => onSelectTool('camera')}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                  currentTool === 'camera'
                    ? isElectric
                      ? 'bg-cyan-100 text-cyan-950 border-cyan-400 shadow-sm ring-1 ring-cyan-400'
                      : 'bg-rose-100 text-rose-900 border-rose-300 shadow-sm ring-1 ring-rose-300'
                    : isElectric
                      ? 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 border-cyan-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isElectric ? "Colocar Tablero, Transformador o Nodo Eléctrico" : "Colocar Cámara de Inspección o Caja"}
              >
                {isElectric ? (
                  <Boxes className="w-3.5 h-3.5 text-cyan-600" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>{isElectric ? '⚡ Tableros / Nodos' : 'Cámaras / Cajas'}</span>
              </button>

              {/* Area Demarcation Tool */}
              <button
                onClick={() => onSelectTool('area')}
                disabled={isLocked}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                  currentTool === 'area'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Demarcar polígono de sector"
              >
                <VectorSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>Demarcar Área</span>
              </button>

              {/* Eraser Tool */}
              <button
                onClick={() => onSelectTool('eraser')}
                disabled={isLocked}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                  currentTool === 'eraser'
                    ? 'bg-slate-800 text-white border-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Borrador"
              >
                <Eraser className="w-3.5 h-3.5 text-slate-500" />
                <span>Borrador</span>
              </button>

              {/* AI Auto-Recognition Button */}
              {onOpenAiRecognition && (
                <button
                  onClick={onOpenAiRecognition}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-purple-400 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition hover:scale-105 active:scale-95"
                  title="Reconocer automáticamente cámaras BT, MT, D y canalizaciones con Inteligencia Artificial"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Escanear Plano IA</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Zoom & Sub-tool Controls */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 flex-wrap">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              onClick={onZoomOut}
              title="Alejar"
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              title="Acercar"
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomReset}
              title="Restablecer vista a 100%"
              className="px-2 py-1 text-slate-500 hover:text-sky-600 hover:bg-white rounded border-l border-slate-200 transition text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={onZoomFit || onZoomReset}
              title="Ajustar plano al lienzo (Zoom-to-Fit)"
              className="px-2 py-1 text-indigo-700 hover:text-indigo-900 hover:bg-white rounded border-l border-slate-200 transition text-[11px] font-bold flex items-center gap-1 bg-indigo-50/80"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Ajustar al Lienzo</span>
            </button>
          </div>

          {/* Dynamic Area Action Bar */}
          {currentTool === 'area' && appMode === 'admin' && (
            <div className="flex items-center gap-1 text-xs bg-purple-50 p-1 rounded-lg border border-purple-200">
              <button
                onClick={onUndoAreaPoint}
                disabled={areaPointCount === 0}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-2 py-1 rounded transition disabled:opacity-40"
                title="Deshacer punto"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onFinishArea}
                disabled={areaPointCount < 3}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
                  areaPointCount >= 3
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                    : 'bg-purple-300 text-purple-100 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finalizar ({areaPointCount} pts)</span>
              </button>
              <button
                onClick={onCancelArea}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded transition"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Camera / Node Prefix & Type Options */}
          {currentTool === 'camera' && appMode === 'admin' && (
            <div className={`flex items-center gap-1.5 text-xs p-1 rounded-lg border ${
              isElectric 
                ? 'bg-cyan-50 text-cyan-900 border-cyan-200' 
                : 'bg-rose-50 text-slate-600 border-rose-200'
            }`}>
              <span className="font-bold text-slate-600">{isElectric ? 'Nodo:' : 'Prefijo:'}</span>
              {isElectric ? (
                <select
                  value={camPrefix}
                  onChange={(e) => onCamPrefixChange(e.target.value)}
                  className="px-1.5 py-0.5 border border-cyan-300 rounded text-xs font-black bg-white text-cyan-950"
                >
                  {ELECTRICAL_NODE_TYPES.map(n => (
                    <option key={n.id} value={n.prefix}>
                      {n.icon} {n.prefix} ({n.label.split('/')[0].trim()})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={camPrefix}
                  onChange={(e) => onCamPrefixChange(e.target.value)}
                  className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold uppercase bg-white"
                />
              )}
              <span className="font-medium text-slate-500">N°:</span>
              <input
                type="number"
                value={camCounter}
                min={1}
                onChange={(e) => onCamCounterChange(parseInt(e.target.value) || 1)}
                className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold bg-white"
              />
              {!isElectric && (
                <select
                  value={camDefaultType}
                  onChange={(e) => onCamDefaultTypeChange(e.target.value as CameraNorm)}
                  className="px-1.5 py-0.5 border border-slate-300 rounded text-xs font-bold bg-white text-slate-800"
                >
                  <option value="SB858">SB858 - 0,9x0,9m</option>
                  <option value="SB850">SB850 - 1,3x1,3m (BT)</option>
                  <option value="SB851">SB851 - 1,5x1,5m (MT)</option>
                  <option value="SB853">SB853 - 2,6x1,5m (MT)</option>
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. CANVAS DISPLAY TOGGLES & SCALE CONTROLLER BAR */}
      <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-700 no-print flex-wrap gap-2 shadow-xs">
        <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Etiquetas en Plano:</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cameras / Nodos Toggle */}
          <button
            onClick={onToggleCameraLabels}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition ${
              showCameraLabels
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showCameraLabels ? <Eye className="w-3.5 h-3.5 text-rose-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Nodos/Cámaras: <strong className={showCameraLabels ? 'text-rose-700' : 'text-slate-400'}>{showCameraLabels ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* Tramos Toggle */}
          <button
            onClick={onToggleLineLabels}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition ${
              showLineLabels
                ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showLineLabels ? <Eye className="w-3.5 h-3.5 text-sky-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Líneas/Tramos: <strong className={showLineLabels ? 'text-sky-700' : 'text-slate-400'}>{showLineLabels ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* Specs Toggle */}
          <button
            onClick={onToggleSpecsLabels}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition ${
              showSpecsLabels
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${showSpecsLabels ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Tuberías/Calibres: <strong className={showSpecsLabels ? 'text-amber-700' : 'text-slate-400'}>{showSpecsLabels ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* Sectores Toggle */}
          <button
            onClick={onToggleAreaLabels}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition ${
              showAreaLabels
                ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showAreaLabels ? <Eye className="w-3.5 h-3.5 text-purple-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Sectores: <strong className={showAreaLabels ? 'text-purple-700' : 'text-slate-400'}>{showAreaLabels ? 'ON' : 'OFF'}</strong></span>
          </button>

          {/* Icon & Element Size Selector for Scaled PDFs */}
          {onChangeIconScale && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-900 ml-auto sm:ml-0">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold">Escala Íconos:</span>
              <select
                value={iconScale}
                onChange={(e) => onChangeIconScale(parseFloat(e.target.value))}
                className="bg-white text-indigo-950 font-bold border border-indigo-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                title="Aumentar el tamaño de cámaras, canalizaciones y etiquetas para planos PDF escalados o de alta resolución"
              >
                <option value={1.0}>1.0x (Normal)</option>
                <option value={1.3}>1.3x (Mediano)</option>
                <option value={1.6}>1.6x (Grande - Ideal PDFs)</option>
                <option value={2.0}>2.0x (Extra Grande)</option>
                <option value={2.5}>2.5x (Súper Gigante)</option>
                <option value={3.0}>3.0x (3.0x - Ultra Gigante)</option>
                <option value={4.0}>4.0x (4.0x - Máxima Visibilidad)</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
