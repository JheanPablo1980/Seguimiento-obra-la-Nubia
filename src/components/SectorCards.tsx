import React from 'react';
import { AreaSector, InspectionElement } from '../types';
import { VectorSquare, Edit, Trash2 } from 'lucide-react';

interface SectorCardsProps {
  areas: AreaSector[];
  elements: InspectionElement[];
  onEditArea: (areaId: number) => void;
  onDeleteArea: (areaId: number) => void;
  onDeleteAllAreas?: () => void;
  onStartDemarcating: () => void;
}

export const SectorCards: React.FC<SectorCardsProps> = ({
  areas,
  elements,
  onEditArea,
  onDeleteArea,
  onDeleteAllAreas,
  onStartDemarcating
}) => {
  // Helper point in polygon test
  const pointInPolygon = (px: number, py: number, points: { x: number; y: number }[]) => {
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 text-purple-700 p-1.5 rounded-lg font-bold text-xs">
            <VectorSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Estadística de Avance por Áreas / Sectores</h2>
            <p className="text-[11px] text-slate-400">Desglose de cámaras y metros de canalización agrupados por zona</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 font-medium">
            Áreas demarcadas: <span className="font-bold text-purple-700">{areas.length}</span>
          </div>
          {areas.length > 0 && onDeleteAllAreas && (
            <button
              onClick={onDeleteAllAreas}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
              title="Borrar todas las áreas y sectores demarcados"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Borrar Todos los Sectores</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {areas.length === 0 ? (
          <div className="col-span-full py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5">
            <VectorSquare className="w-8 h-8 text-purple-300" />
            <p className="text-xs font-semibold text-slate-600">No hay áreas o sectores demarcados</p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Usa la herramienta <strong>Demarcar Área</strong> en la barra del plano para encerrar un sector (haz clic en los vértices y presiona "Finalizar Área").
            </p>
            <button
              onClick={onStartDemarcating}
              className="mt-1 bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
            >
              Demarcar Primer Sector
            </button>
          </div>
        ) : (
          areas.map(area => {
            const camsInArea = elements.filter(e => e.type === 'camera' && pointInPolygon(e.x, e.y, area.points));
            const linesInArea = elements.filter(e => e.type === 'line' && pointInPolygon((e.x + (e.x2 ?? e.x)) / 2, (e.y + (e.y2 ?? e.y)) / 2, area.points));

            const totalCams = camsInArea.length;
            const termCams = camsInArea.filter(c => c.status === 'Terminado').length;

            const totalMeters = linesInArea.reduce((sum, l) => sum + (l.meters || 0), 0);
            const termMeters = linesInArea.filter(l => l.status === 'Terminado').reduce((sum, l) => sum + (l.meters || 0), 0);

            const totalItems = totalCams + linesInArea.length;
            const termItems = termCams + linesInArea.filter(l => l.status === 'Terminado').length;
            const pct = totalItems > 0 ? Math.round((termItems / totalItems) * 100) : 0;

            return (
              <div
                key={area.id}
                className="bg-slate-50 border border-purple-200 rounded-xl p-3 flex flex-col gap-2 relative shadow-sm hover:border-purple-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border shadow-sm shrink-0"
                      style={{ backgroundColor: area.color.stroke, borderColor: area.color.badge }}
                    />
                    <span className="font-bold text-xs text-slate-800 truncate" title={`${area.code || ''} ${area.name}`}>
                      {area.code && (
                        <span className="bg-purple-100 text-purple-800 text-[10px] px-1 py-0.5 rounded mr-1 font-mono">
                          {area.code}
                        </span>
                      )}
                      {area.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditArea(area.id)}
                      className="text-slate-400 hover:text-purple-700 text-xs p-1 transition rounded hover:bg-purple-50"
                      title="Editar Nombre y Dimensiones del Sector"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteArea(area.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs p-1 transition rounded hover:bg-rose-50"
                      title="Eliminar Sector"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dimensions display if set */}
                {(area.calculatedAreaM2 || area.widthMeters || area.lengthMeters) && (
                  <div className="text-[10px] text-purple-900 bg-purple-100/60 font-medium px-2 py-1 rounded-md border border-purple-200/60 flex items-center justify-between">
                    <span>
                      Dimensiones: {area.widthMeters ? `${area.widthMeters}m` : '—'} x {area.lengthMeters ? `${area.lengthMeters}m` : '—'}
                    </span>
                    <span className="font-bold text-purple-950">
                      {area.calculatedAreaM2 ? `${area.calculatedAreaM2} m²` : ''}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Cámaras:</span>
                    <span className="font-bold text-slate-700">{termCams} / {totalCams} inst.</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Canalización:</span>
                    <span className="font-bold text-slate-700">{termMeters}m / {totalMeters}m</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
