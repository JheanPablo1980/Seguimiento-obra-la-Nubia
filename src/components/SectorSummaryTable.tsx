import React, { useState } from 'react';
import { AreaSector, InspectionElement } from '../types';
import { Table, RefreshCw, Edit, Trash2, Zap, Calculator, Layers } from 'lucide-react';
import { summarizeCables, parseCableSpecification } from '../utils/cableParser';

interface SectorSummaryTableProps {
  areas: AreaSector[];
  elements: InspectionElement[];
  onRefresh?: () => void;
  onEditArea?: (areaId: number) => void;
  onDeleteArea?: (areaId: number) => void;
  onDeleteAllAreas?: () => void;
  enableCableConsolidation?: boolean;
}

export const SectorSummaryTable: React.FC<SectorSummaryTableProps> = ({
  areas,
  elements,
  onRefresh,
  onEditArea,
  onDeleteArea,
  onDeleteAllAreas,
  enableCableConsolidation = true
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

  const sectorSummaries: Array<{
    id?: number;
    code: string;
    name: string;
    colorStroke: string;
    widthMeters?: number;
    lengthMeters?: number;
    calculatedAreaM2?: number;
    totalCams: number;
    termCams: number;
    camTypesStr: string;
    totalMeters: number;
    termMeters: number;
    pipesStr: string;
    cablesStr: string;
    cablesParsedStr: string;
    pct: number;
  }> = [];

  // Process defined area sectors
  areas.forEach(area => {
    const camsInArea = elements.filter(e => e.type === 'camera' && pointInPolygon(e.x, e.y, area.points));
    const linesInArea = elements.filter(e => e.type === 'line' && pointInPolygon((e.x + (e.x2 ?? e.x)) / 2, (e.y + (e.y2 ?? e.y)) / 2, area.points));

    const totalCams = camsInArea.length;
    const termCams = camsInArea.filter(c => c.status === 'Terminado').length;

    const camTypesObj: Record<string, number> = {};
    camsInArea.forEach(c => {
      const type = c.camType || 'SB850';
      camTypesObj[type] = (camTypesObj[type] || 0) + 1;
    });
    const camTypesStr = Object.entries(camTypesObj).map(([t, count]) => `${count} ${t}`).join(', ') || 'N/A';

    const totalMeters = linesInArea.reduce((sum, l) => sum + (l.meters || 0), 0);
    const termMeters = linesInArea.filter(l => l.status === 'Terminado').reduce((sum, l) => sum + (l.meters || 0), 0);

    const pipesSet = Array.from(new Set(linesInArea.map(l => l.pipes).filter(Boolean)));
    const cablesList = linesInArea.map(l => l.cables).filter(Boolean) as string[];

    // Parse cables for this sector based on lines/tramos in this area
    const sectorGaugeSummaries = summarizeCables(linesInArea);
    const cablesParsedStr = sectorGaugeSummaries
      .map(g => `${g.gauge}: ${g.totalMeters}m (${g.totalConductors} hilos)`)
      .join(' | ') || cablesList.join(', ') || 'Sin especif.';

    const totalItems = totalCams + linesInArea.length;
    const termItems = termCams + linesInArea.filter(l => l.status === 'Terminado').length;
    const pct = totalItems > 0 ? Math.round((termItems / totalItems) * 100) : 0;

    sectorSummaries.push({
      id: area.id,
      code: area.code,
      name: area.name,
      colorStroke: (typeof area.color === 'object' && area.color?.stroke) ? area.color.stroke : (typeof area.color === 'string' ? area.color : '#9333ea'),
      widthMeters: area.widthMeters,
      lengthMeters: area.lengthMeters,
      calculatedAreaM2: area.calculatedAreaM2,
      totalCams,
      termCams,
      camTypesStr,
      totalMeters,
      termMeters,
      pipesStr: pipesSet.join(', ') || 'Sin especif.',
      cablesStr: Array.from(new Set(cablesList)).join(', ') || 'Sin especif.',
      cablesParsedStr,
      pct
    });
  });

  // Process elements outside defined sectors
  const unassignedCams = elements.filter(e => e.type === 'camera' && !areas.some(a => pointInPolygon(e.x, e.y, a.points)));
  const unassignedLines = elements.filter(e => e.type === 'line' && !areas.some(a => pointInPolygon((e.x + (e.x2 ?? e.x)) / 2, (e.y + (e.y2 ?? e.y)) / 2, a.points)));

  if (unassignedCams.length > 0 || unassignedLines.length > 0) {
    const totalCams = unassignedCams.length;
    const termCams = unassignedCams.filter(c => c.status === 'Terminado').length;

    const camTypesObj: Record<string, number> = {};
    unassignedCams.forEach(c => {
      const type = c.camType || 'SB850';
      camTypesObj[type] = (camTypesObj[type] || 0) + 1;
    });
    const camTypesStr = Object.entries(camTypesObj).map(([t, count]) => `${count} ${t}`).join(', ') || 'N/A';

    const totalMeters = unassignedLines.reduce((sum, l) => sum + (l.meters || 0), 0);
    const termMeters = unassignedLines.filter(l => l.status === 'Terminado').reduce((sum, l) => sum + (l.meters || 0), 0);

    const pipesSet = Array.from(new Set(unassignedLines.map(l => l.pipes).filter(Boolean)));
    const cablesList = unassignedLines.map(l => l.cables).filter(Boolean) as string[];

    const sectorGaugeSummaries = summarizeCables(unassignedLines);
    const cablesParsedStr = sectorGaugeSummaries
      .map(g => `${g.gauge}: ${g.totalMeters}m (${g.totalConductors} hilos)`)
      .join(' | ') || cablesList.join(', ') || 'Sin especif.';

    const totalItems = totalCams + unassignedLines.length;
    const termItems = termCams + unassignedLines.filter(l => l.status === 'Terminado').length;
    const pct = totalItems > 0 ? Math.round((termItems / totalItems) * 100) : 0;

    sectorSummaries.push({
      code: 'S/N',
      name: 'Elementos Sin Sector Demarcado',
      colorStroke: '#64748b',
      totalCams,
      termCams,
      camTypesStr,
      totalMeters,
      termMeters,
      pipesStr: pipesSet.join(', ') || 'Sin especif.',
      cablesStr: Array.from(new Set(cablesList)).join(', ') || 'Sin especif.',
      cablesParsedStr,
      pct
    });
  }

  // Global cable summary across ALL line elements
  const allLineElements = elements.filter(e => e.type === 'line');
  const globalGaugeSummaries = summarizeCables(allLineElements);
  const totalCableMetersGlobal = globalGaugeSummaries.reduce((sum, g) => sum + g.totalMeters, 0);

  // Totals calculations
  let grandTotalCams = 0;
  let grandTermCams = 0;
  let grandTotalMeters = 0;
  let grandTermMeters = 0;

  sectorSummaries.forEach(s => {
    grandTotalCams += s.totalCams;
    grandTermCams += s.termCams;
    grandTotalMeters += s.totalMeters;
    grandTermMeters += s.termMeters;
  });

  const totalLinesCount = elements.filter(e => e.type === 'line').length;
  const termLinesCount = elements.filter(e => e.type === 'line' && e.status === 'Terminado').length;
  const grandTotalItems = grandTotalCams + totalLinesCount;
  const grandTermItems = grandTermCams + termLinesCount;
  const grandPct = grandTotalItems > 0 ? Math.round((grandTermItems / grandTotalItems) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg font-bold text-xs">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Consolidado de Canalizaciones y Cámaras por Sector
            </h2>
            <p className="text-[11px] text-slate-400">
              Resumen tabular consolidado de metrajes, tuberías/cableados y cámaras agrupadas por zona
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {areas.length > 0 && onDeleteAllAreas && (
            <button
              onClick={onDeleteAllAreas}
              className="no-print bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
              title="Borrar todas las áreas y sectores demarcados"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Borrar Todos los Sectores</span>
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="no-print text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              <th className="py-2.5 px-3">Sector / Zona</th>
              <th className="py-2.5 px-3">Dimensiones / Área</th>
              <th className="py-2.5 px-3">Cámaras (Instaladas / Total)</th>
              <th className="py-2.5 px-3">Canalización (Metros)</th>
              <th className="py-2.5 px-3">Tubería & Cableado Predominante</th>
              <th className="py-2.5 px-3 text-center">Avance Sectorial</th>
              <th className="py-2.5 px-3 text-center no-print w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sectorSummaries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  <span>No hay datos sectorizados disponibles. Demarque áreas o añada elementos en el plano.</span>
                </td>
              </tr>
            ) : (
              sectorSummaries.map((s, idx) => (
                <tr key={`${s.code}-${s.name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.colorStroke }} />
                      <div>
                        <span className="font-bold text-slate-800">
                          {s.code !== 'S/N' && (
                            <span className="bg-purple-100 text-purple-800 text-[10px] px-1 py-0.5 rounded font-mono mr-1">
                              {s.code}
                            </span>
                          )}
                          {s.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {s.widthMeters || s.lengthMeters || s.calculatedAreaM2 ? (
                      <div className="text-[11px] font-medium text-slate-700">
                        {s.widthMeters && s.lengthMeters && (
                          <div className="font-semibold text-slate-800">{s.widthMeters}m × {s.lengthMeters}m</div>
                        )}
                        {s.calculatedAreaM2 && (
                          <div className="text-[10px] text-purple-700 font-bold">{s.calculatedAreaM2} m²</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Sin dim. registradas</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-800">
                      {s.termCams} / {s.totalCams} <span className="text-[10px] font-normal text-slate-500">cámaras</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={s.camTypesStr}>
                      {s.camTypesStr}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-800">
                      {s.termMeters}m / {s.totalMeters}m <span className="text-[10px] font-normal text-slate-500">instalados</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {s.totalMeters > 0 ? Math.round((s.termMeters / s.totalMeters) * 100) : 0}% ejecutado
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-[11px] text-slate-700 font-medium">
                      Tub: <span className="text-slate-900 font-semibold">{s.pipesStr}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                      Cab: <span className="text-slate-800">{s.cablesStr}</span>
                    </div>
                    {s.cablesParsedStr && s.cablesParsedStr !== 'Sin especif.' && (
                      <div className="text-[9.5px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 mt-1 font-mono font-medium leading-snug">
                        {s.cablesParsedStr}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center w-36">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-indigo-700 shrink-0 w-8">{s.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center no-print">
                    {s.id && (onEditArea || onDeleteArea) ? (
                      <div className="flex items-center justify-center gap-1">
                        {onEditArea && (
                          <button
                            onClick={() => onEditArea(s.id!)}
                            className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition"
                            title="Editar Dimensiones y Nombre"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteArea && (
                          <button
                            onClick={() => onDeleteArea(s.id!)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                            title="Eliminar Sector"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {sectorSummaries.length > 0 && (
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
              <tr>
                <td className="py-3 px-3 uppercase text-slate-700 tracking-wider">TOTAL GENERAL CONSOLIDADOS</td>
                <td className="py-3 px-3 text-purple-900 font-extrabold">
                  {sectorSummaries.reduce((acc, curr) => acc + (curr.calculatedAreaM2 || 0), 0)} m²
                </td>
                <td className="py-3 px-3 text-slate-900 font-extrabold">{grandTermCams} / {grandTotalCams} Cámaras</td>
                <td className="py-3 px-3 text-slate-900 font-extrabold">{grandTermMeters}m / {grandTotalMeters}m Canalizados</td>
                <td className="py-3 px-3 text-slate-500 text-[10px]">Tuberías y cableados según especificación de planos</td>
                <td className="py-3 px-3 text-center text-indigo-900 font-extrabold text-sm">{grandPct}% Avance Total</td>
                <td className="py-3 px-3 text-center no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Consolidated Cable Breakdown Panel by Calibre */}
      {enableCableConsolidation ? (
        <div className="mt-3 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-4 shadow-md border border-indigo-900/50 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/20 text-amber-400 p-2 rounded-lg border border-amber-500/30 font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  Consolidado Desglosado de Cantidades de Cable por Calibre
                </h3>
                <p className="text-[11px] text-slate-300">
                  Calculado de la tarjeta de bitacora de inspección: Conductores <span className="font-mono text-amber-300">('x' o '#')</span> × Metros de cada Tramo/Acometida registrada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs shrink-0 self-start sm:self-auto">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 font-semibold text-[11px]">
                Calculado desde Bitácora
              </span>
            </div>
          </div>

          {globalGaugeSummaries.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-xs">
              No se han detectado especificaciones de cableado registradas en los tramos de la bitácora.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Grid of Gauge Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {globalGaugeSummaries.map((g, idx) => (
                  <div
                    key={g.gauge + idx}
                    className="bg-slate-800/90 border border-slate-700/90 rounded-xl p-3 flex flex-col justify-between gap-1.5 hover:border-amber-500/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                        {g.gauge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {g.acometidasCount} tramo{g.acometidasCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex flex-col pt-1">
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Conductores Totales:</span>
                        <span className="font-bold text-slate-200">{g.totalConductors} hilos</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Metraje acumulado:</span>
                        <span className="font-mono text-slate-300">∑(hilos × metros tramo)</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/80 flex items-baseline justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Cable:</span>
                      <span className="text-base font-black text-amber-300 tracking-tight font-mono">
                        {g.totalMeters} <span className="text-xs font-semibold text-slate-300">mts</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total General Banner */}
              <div className="bg-indigo-900/60 border border-indigo-700/60 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-slate-200">
                    SUMATORIA TOTAL DE CABLEADOS ELÉCTRICOS (TODOS LOS CALIBRES)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300 font-normal mr-2">
                    Total acumulado en bitácora ({globalGaugeSummaries.length} calibres):
                  </span>
                  <span className="text-base font-extrabold text-amber-300 font-mono">
                    {totalCableMetersGlobal} <span className="text-xs text-slate-200">mts</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-amber-500/50" />
          <span>Consolidado de Cables deshabilitado desde el módulo de Configuración de la obra.</span>
        </div>
      )}
    </div>
  );
};
