import React, { useState, useEffect } from 'react';
import { AreaSector, AreaColor, InspectionElement, Point } from '../types';
import { AREA_COLOR_PALETTE } from '../data/sampleData';
import { VectorSquare, X, Check, MapPin, Ruler, Trash2, Box } from 'lucide-react';

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingArea: AreaSector | null;
  areaPoints: Point[];
  nextAreaNumber: number;
  elements: InspectionElement[];
  onSaveArea: (
    code: string,
    name: string,
    color: AreaColor,
    dimensions?: {
      widthMeters?: number;
      lengthMeters?: number;
      calculatedAreaM2?: number;
      notes?: string;
    }
  ) => void;
  onDeleteArea?: (areaId: number) => void;
}

export const AreaModal: React.FC<AreaModalProps> = ({
  isOpen,
  onClose,
  editingArea,
  areaPoints,
  nextAreaNumber,
  elements,
  onSaveArea,
  onDeleteArea
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [widthMeters, setWidthMeters] = useState<number | ''>('');
  const [lengthMeters, setLengthMeters] = useState<number | ''>('');
  const [calculatedAreaM2, setCalculatedAreaM2] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Helper point in polygon test
  const pointInPolygon = (px: number, py: number, points: Point[]) => {
    let isInside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
          (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }
    return isInside;
  };

  useEffect(() => {
    if (editingArea) {
      setCode(editingArea.code || `SEC-${String(editingArea.id).padStart(2, '0')}`);
      setName(editingArea.name);
      const idx = AREA_COLOR_PALETTE.findIndex(c => c.stroke === editingArea.color.stroke);
      setSelectedColorIdx(idx >= 0 ? idx : 0);
      setWidthMeters(editingArea.widthMeters ?? '');
      setLengthMeters(editingArea.lengthMeters ?? '');
      setCalculatedAreaM2(editingArea.calculatedAreaM2 ?? '');
      setNotes(editingArea.notes || '');
    } else {
      setCode(`SEC-${String(nextAreaNumber).padStart(2, '0')}`);
      setName(`Sector ${nextAreaNumber}`);
      setSelectedColorIdx((nextAreaNumber - 1) % AREA_COLOR_PALETTE.length);
      setWidthMeters('');
      setLengthMeters('');
      setCalculatedAreaM2('');
      setNotes('');
    }
  }, [editingArea, nextAreaNumber, isOpen]);

  // Auto calculate m2 if width and length are set
  const handleWidthChange = (val: string) => {
    const w = val === '' ? '' : Number(val);
    setWidthMeters(w);
    if (typeof w === 'number' && typeof lengthMeters === 'number') {
      setCalculatedAreaM2(Math.round(w * lengthMeters * 10) / 10);
    }
  };

  const handleLengthChange = (val: string) => {
    const l = val === '' ? '' : Number(val);
    setLengthMeters(l);
    if (typeof widthMeters === 'number' && typeof l === 'number') {
      setCalculatedAreaM2(Math.round(widthMeters * l * 10) / 10);
    }
  };

  if (!isOpen) return null;

  const pts = editingArea ? editingArea.points : areaPoints;
  const camsInArea = elements.filter(e => e.type === 'camera' && pointInPolygon(e.x, e.y, pts));
  const linesInArea = elements.filter(e => e.type === 'line' && pointInPolygon((e.x + (e.x2 ?? e.x)) / 2, (e.y + (e.y2 ?? e.y)) / 2, pts));
  const totalMeters = linesInArea.reduce((sum, l) => sum + (l.meters || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    onSaveArea(
      code.trim().toUpperCase(),
      name.trim(),
      AREA_COLOR_PALETTE[selectedColorIdx],
      {
        widthMeters: widthMeters === '' ? undefined : Number(widthMeters),
        lengthMeters: lengthMeters === '' ? undefined : Number(lengthMeters),
        calculatedAreaM2: calculatedAreaM2 === '' ? undefined : Number(calculatedAreaM2),
        notes: notes.trim()
      }
    );
  };

  const handleDelete = () => {
    if (editingArea && onDeleteArea) {
      onDeleteArea(editingArea.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-100 text-purple-700 p-2 rounded-xl">
              <VectorSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {editingArea ? 'Editar Sector / Dimensiones' : 'Cerrar y Registrar Sector'}
              </h3>
              <p className="text-xs text-slate-500">Configura nombre, dimensiones físicas y color del sector</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block font-bold text-slate-700 mb-1">ID / Código *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: SEC-01"
                required
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs font-bold uppercase"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Nombre del Sector / Área *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Manzana A - Lotes 1 al 12"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs font-medium"
              />
            </div>
          </div>

          {/* Dimensiones Físicas del Sector */}
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[11px] uppercase tracking-wider">
              <Box className="w-4 h-4 text-purple-700" />
              <span>Editar Dimensiones del Sector (Metraje Real)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Ancho (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={widthMeters}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  placeholder="Ej: 25.5"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Largo (m)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lengthMeters}
                  onChange={(e) => handleLengthChange(e.target.value)}
                  placeholder="Ej: 40.0"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-purple-950 mb-0.5">Área (m²)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={calculatedAreaM2}
                  onChange={(e) => setCalculatedAreaM2(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 1020"
                  className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-extrabold text-purple-900 bg-purple-100/50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Color de Identificación Visual</label>
            <div className="flex items-center gap-2 pt-1">
              {AREA_COLOR_PALETTE.map((col, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedColorIdx(idx)}
                  className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center border-2 ${
                    selectedColorIdx === idx ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col.stroke }}
                >
                  {selectedColorIdx === idx && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas de Sector</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Zona con cruce de alta tensión en lindero norte"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Resumen de elementos encerrados en este sector:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Cámaras: <strong className="text-slate-800">{camsInArea.length}</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                <Ruler className="w-4 h-4 text-sky-600" />
                <span>Tubería: <strong className="text-slate-800">{totalMeters} m</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            {editingArea && onDeleteArea ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Sector</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingArea ? 'Actualizar Sector' : 'Guardar Sector'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
