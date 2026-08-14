import React, { useState } from 'react';
import { InspectionElement, ProjectLayer, CameraNorm } from '../types';
import { ELECTRICAL_NODE_TYPES, getElectricalNodeMeta } from '../utils/layerUtils';
import { 
  X, 
  Plus, 
  MapPin, 
  Ruler, 
  Zap, 
  Boxes, 
  Layers, 
  Check, 
  Sparkles,
  Compass,
  HardHat
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayer: ProjectLayer;
  elements: InspectionElement[];
  onAddElement: (element: InspectionElement) => void;
  onInspectElement: (element: InspectionElement) => void;
  showToast: (msg: string) => void;
  defaultCenterPos?: { x: number; y: number };
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  activeLayer,
  elements,
  onAddElement,
  onInspectElement,
  showToast,
  defaultCenterPos = { x: 300, y: 300 }
}) => {
  if (!isOpen) return null;

  const [selectedLayer, setSelectedLayer] = useState<ProjectLayer>(activeLayer);
  const [selectedCategory, setSelectedCategory] = useState<'camera' | 'line'>('camera');
  
  // Civil Camera state
  const [camNorm, setCamNorm] = useState<CameraNorm>('SB850');
  
  // Civil Tramo state
  const [tramoMeters, setTramoMeters] = useState<number>(20);
  const [tramoPipes, setTramoPipes] = useState<string>('3x4" PVC Schedule 40');
  const [tramoCables, setTramoCables] = useState<string>('3#250 F+1#500N+1#6T');
  const [onlyPipes, setOnlyPipes] = useState<boolean>(false);

  // Electric Node state
  const [electricNodeType, setElectricNodeType] = useState<string>('tablero');
  const [electricVoltage, setElectricVoltage] = useState<number>(220);
  const [circuitTag, setCircuitTag] = useState<string>('ALIM-01');

  // Electric Circuit state
  const [circuitMeters, setCircuitMeters] = useState<number>(25);
  const [circuitPipes, setCircuitPipes] = useState<string>('Ducto EMT Ø 1 1/2"');
  const [circuitCables, setCircuitCables] = useState<string>('3#8 AWG Cu THHN + 1#10T');

  const civilCamerasCount = elements.filter(e => e.type === 'camera' && (e.layer || 'civil') === 'civil').length + 1;
  const civilTramosCount = elements.filter(e => e.type === 'line' && (e.layer || 'civil') === 'civil').length + 1;
  const electricNodesCount = elements.filter(e => e.type === 'camera' && e.layer === 'electrica').length + 1;
  const electricCircuitsCount = elements.filter(e => e.type === 'line' && e.layer === 'electrica').length + 1;

  const handleCreate = () => {
    const isElect = selectedLayer === 'electrica';
    let newEl: InspectionElement;

    if (selectedCategory === 'camera') {
      if (isElect) {
        const meta = getElectricalNodeMeta(electricNodeType);
        newEl = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          type: 'camera',
          layer: 'electrica',
          label: `${meta.prefix}${String(electricNodesCount).padStart(2, '0')}`,
          status: 'Pendiente',
          x: defaultCenterPos.x,
          y: defaultCenterPos.y,
          electricNodeType: electricNodeType,
          voltage: electricVoltage,
          circuitTag: circuitTag,
          signalStrength: 95,
          date: new Date().toISOString().split('T')[0]
        };
      } else {
        newEl = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          type: 'camera',
          layer: 'civil',
          label: `C-${String(civilCamerasCount).padStart(2, '0')}`,
          status: 'Pendiente',
          x: defaultCenterPos.x,
          y: defaultCenterPos.y,
          camType: camNorm,
          date: new Date().toISOString().split('T')[0]
        };
      }
    } else {
      if (isElect) {
        newEl = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          type: 'line',
          layer: 'electrica',
          label: `Circuito C-${String(electricCircuitsCount).padStart(2, '0')}`,
          status: 'Pendiente',
          x: defaultCenterPos.x - 60,
          y: defaultCenterPos.y,
          x2: defaultCenterPos.x + 60,
          y2: defaultCenterPos.y,
          meters: circuitMeters,
          pipes: circuitPipes,
          cables: circuitCables,
          circuitTag: circuitTag,
          date: new Date().toISOString().split('T')[0]
        };
      } else {
        newEl = {
          id: Date.now() + Math.floor(Math.random() * 100000),
          type: 'line',
          layer: 'civil',
          label: `Tramo T-${String(civilTramosCount).padStart(2, '0')}`,
          status: 'Pendiente',
          x: defaultCenterPos.x - 60,
          y: defaultCenterPos.y,
          x2: defaultCenterPos.x + 60,
          y2: defaultCenterPos.y,
          meters: tramoMeters,
          pipes: tramoPipes,
          cables: onlyPipes ? 'N/A - Solo Tubería' : tramoCables,
          onlyPipes: onlyPipes,
          date: new Date().toISOString().split('T')[0]
        };
      }
    }

    onAddElement(newEl);
    showToast(`Elemento "${newEl.label}" creado exitosamente`);
    onClose();
    onInspectElement(newEl);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl text-white flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Registrar Nuevo Elemento</h3>
              <p className="text-xs text-slate-400">Panel rápido de campo para inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Layer Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              1. Selecciona la Especialidad / Capa:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedLayer('civil')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  selectedLayer === 'civil'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.01]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <HardHat className="w-4 h-4" />
                <span>🏗️ Obras Civiles</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLayer('electrica')}
                className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  selectedLayer === 'electrica'
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md scale-[1.01]'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>⚡ Obras Eléctricas</span>
              </button>
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              2. Tipo de Elemento:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('camera')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                  selectedCategory === 'camera'
                    ? 'bg-slate-800 text-amber-300 border-amber-500/60 ring-1 ring-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {selectedLayer === 'electrica' ? (
                  <>
                    <Boxes className="w-5 h-5 text-cyan-400" />
                    <span>Tablero / Transformador / Nodo</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 text-rose-400" />
                    <span>Cámara / Caja de Inspección</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('line')}
                className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                  selectedCategory === 'line'
                    ? 'bg-slate-800 text-amber-300 border-amber-500/60 ring-1 ring-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {selectedLayer === 'electrica' ? (
                  <>
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span>Circuito / Conductor Eléctrico</span>
                  </>
                ) : (
                  <>
                    <Ruler className="w-5 h-5 text-emerald-400" />
                    <span>Tramo Canalización Subterránea</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Configuration Form */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            {/* CIVIL CAMERA FORM */}
            {selectedLayer === 'civil' && selectedCategory === 'camera' && (
              <>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Identificador Sugerido:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">C-{String(civilCamerasCount).padStart(2, '0')}</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Norma de Cámara:</label>
                  <select
                    value={camNorm}
                    onChange={(e) => setCamNorm(e.target.value as CameraNorm)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="SB850">SB850 - Cámara Baja Tensión (BT)</option>
                    <option value="SB858">SB858 - Telecomunicaciones / Datos</option>
                    <option value="SB851">SB851 - Media Tensión Paso (MT)</option>
                    <option value="SB853">SB853 - Media Tensión Derivación (MT)</option>
                  </select>
                </div>
              </>
            )}

            {/* CIVIL TRAMO FORM */}
            {selectedLayer === 'civil' && selectedCategory === 'line' && (
              <>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Identificador Sugerido:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">T-{String(civilTramosCount).padStart(2, '0')}</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Longitud Estimada (Metros):</label>
                  <div className="flex items-center gap-2">
                    {[10, 20, 30, 50].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTramoMeters(m)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                          tramoMeters === m ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m} m
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tubería / Ductos:</label>
                  <input
                    type="text"
                    value={tramoPipes}
                    onChange={(e) => setTramoPipes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                    placeholder='Ej: 3x4" PVC Schedule 40'
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 font-semibold">Cables / Conductores:</label>
                    <label className="text-[10px] text-amber-300 font-bold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyPipes}
                        onChange={(e) => setOnlyPipes(e.target.checked)}
                        className="rounded"
                      />
                      <span>Solo Tubería</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={onlyPipes}
                    value={onlyPipes ? 'N/A - Solo Tubería' : tramoCables}
                    onChange={(e) => setTramoCables(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-emerald-400"
                    placeholder="Ej: 3#250 F+1#500N+1#6T"
                  />
                </div>
              </>
            )}

            {/* ELECTRIC NODE FORM */}
            {selectedLayer === 'electrica' && selectedCategory === 'camera' && (
              <>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Identificador Sugerido:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">TD-{String(electricNodesCount).padStart(2, '0')}</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tipo de Nodo Eléctrico:</label>
                  <select
                    value={electricNodeType}
                    onChange={(e) => {
                      const nt = e.target.value;
                      setElectricNodeType(nt);
                      if (nt === 'transformador' || nt === 'barrajes_elastomericos') {
                        setElectricVoltage(13200);
                      } else {
                        setElectricVoltage(220);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
                  >
                    {ELECTRICAL_NODE_TYPES.map(n => (
                      <option key={n.id} value={n.id}>{n.icon} {n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Voltaje (V):</label>
                    <select
                      value={electricVoltage}
                      onChange={(e) => setElectricVoltage(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-amber-300 font-bold"
                    >
                      <option value={120}>120 V (Monofásico)</option>
                      <option value={208}>208 V (Bifásico)</option>
                      <option value={220}>220 V (Trifásico BT)</option>
                      <option value={440}>440 V (Industrial)</option>
                      <option value={13200}>13.2 kV (Media Tensión)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tag de Circuito:</label>
                    <input
                      type="text"
                      value={circuitTag}
                      onChange={(e) => setCircuitTag(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-cyan-300 font-mono font-bold"
                      placeholder="Ej: ALIM-01"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ELECTRIC CIRCUIT FORM */}
            {selectedLayer === 'electrica' && selectedCategory === 'line' && (
              <>
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                  <span className="text-slate-400 font-semibold">Identificador Sugerido:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">C-{String(electricCircuitsCount).padStart(2, '0')}</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Longitud de Circuito (Metros):</label>
                  <div className="flex items-center gap-2">
                    {[15, 25, 40, 60].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCircuitMeters(m)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                          circuitMeters === m ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m} m
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Canalización / Ducto EMT:</label>
                  <input
                    type="text"
                    value={circuitPipes}
                    onChange={(e) => setCircuitPipes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder='Ej: Ducto EMT Ø 1 1/2"'
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Conductores / Calibre:</label>
                  <input
                    type="text"
                    value={circuitCables}
                    onChange={(e) => setCircuitCables(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Ej: 3#8 AWG Cu THHN + 1#10T"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Check className="w-4 h-4" />
            <span>Crear y Abrir Ficha Técnica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
