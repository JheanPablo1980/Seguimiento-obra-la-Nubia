import React from 'react';
import { AreaSector, InspectionElement } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Zap } from 'lucide-react';

interface RealtimeChartsProps {
  areas: AreaSector[];
  elements: InspectionElement[];
}

export const RealtimeCharts: React.FC<RealtimeChartsProps> = ({
  areas,
  elements
}) => {
  // Compute chart data grouped by sector
  const sectorChartData = areas.map(area => {
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

    const camsInArea = elements.filter(e => e.type === 'camera' && pointInPolygon(e.x, e.y, area.points));
    const linesInArea = elements.filter(e => e.type === 'line' && pointInPolygon((e.x + (e.x2 ?? e.x)) / 2, (e.y + (e.y2 ?? e.y)) / 2, area.points));

    const totalCams = camsInArea.length;
    const termCams = camsInArea.filter(c => c.status === 'Terminado').length;

    const totalMeters = linesInArea.reduce((sum, l) => sum + (l.meters || 0), 0);
    const termMeters = linesInArea.filter(l => l.status === 'Terminado').reduce((sum, l) => sum + (l.meters || 0), 0);

    return {
      name: area.code || area.name,
      fullName: area.name,
      'Cámaras Instaladas': termCams,
      'Cámaras Proyectadas': totalCams,
      'Metros Instalados (m)': termMeters,
      'Metros Proyectados (m)': totalMeters
    };
  });

  return (
    <div className="w-full mb-2">
      {/* Sector Progress Comparison Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="bg-sky-100 text-sky-700 p-2 rounded-lg font-bold text-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Visualización en Tiempo Real por Sector</h2>
              <p className="text-[11px] text-slate-400">Comparativa de metrajes y cámaras por zona de inspección</p>
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full pt-2">
          {sectorChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Metros Instalados (m)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Metros Proyectados (m)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cámaras Instaladas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Demarque áreas para visualizar la gráfica comparativa sectorial
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
