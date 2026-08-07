import React, { useState } from 'react';
import { InspectionElement, FilterState } from '../types';
import { normalizeActa } from '../utils/actaUtils';
import { Camera, Ruler, CalendarDays, TrendingUp, Filter, FileText, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface KpiMetricsProps {
  elements: InspectionElement[];
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({
  elements,
  filter,
  onFilterChange
}) => {
  const [showActasDetail, setShowActasDetail] = useState(true);

  // Filter elements according to date filter if set
  const filteredElements = elements.filter(e => {
    if (filter.startDate && e.date < filter.startDate) return false;
    if (filter.endDate && e.date > filter.endDate) return false;
    if (filter.actaFilter && normalizeActa(e.acta) !== filter.actaFilter) return false;
    return true;
  });

  // Calculate statistics per Acta
  const actasMap = new Map<string, {
    total: number;
    camerasTotal: number;
    camerasTerminado: number;
    tramosTotal: number;
    tramosMetersTotal: number;
    tramosMetersTerminado: number;
    terminado: number;
    enProceso: number;
    pendiente: number;
  }>();

  elements.forEach(e => {
    const key = normalizeActa(e.acta);
    if (!actasMap.has(key)) {
      actasMap.set(key, {
        total: 0,
        camerasTotal: 0,
        camerasTerminado: 0,
        tramosTotal: 0,
        tramosMetersTotal: 0,
        tramosMetersTerminado: 0,
        terminado: 0,
        enProceso: 0,
        pendiente: 0
      });
    }
    const stat = actasMap.get(key)!;
    stat.total += 1;
    if (e.status === 'Terminado') stat.terminado += 1;
    else if (e.status === 'En proceso') stat.enProceso += 1;
    else stat.pendiente += 1;

    if (e.type === 'camera') {
      stat.camerasTotal += 1;
      if (e.status === 'Terminado') stat.camerasTerminado += 1;
    } else if (e.type === 'line') {
      stat.tramosTotal += 1;
      const m = e.meters || 0;
      stat.tramosMetersTotal += m;
      if (e.status === 'Terminado') stat.tramosMetersTerminado += m;
    }
  });

  const actasSorted = Array.from(actasMap.entries()).sort((a, b) => {
    if (a[0] === 'Sin Asignar') return 1;
    if (b[0] === 'Sin Asignar') return -1;
    return a[0].localeCompare(b[0], undefined, { numeric: true });
  });

  const cameras = filteredElements.filter(e => e.type === 'camera');
  const tramos = filteredElements.filter(e => e.type === 'line');

  const totalCams = cameras.length;
  const installedCams = cameras.filter(c => c.status === 'Terminado').length;

  const totalPipeMeters = tramos.reduce((sum, t) => sum + (t.meters || 0), 0);
  const installedPipeMeters = tramos.filter(t => t.status === 'Terminado').reduce((sum, t) => sum + (t.meters || 0), 0);

  const dates = filteredElements.map(e => e.date).filter(Boolean).sort();
  let weeksActive = 1.0;
  let dateRangeStr = "Sin fechas registradas";

  if (dates.length > 0) {
    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);
    const diffTime = Math.max(0, maxDate.getTime() - minDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    weeksActive = Math.max(1.0, parseFloat((diffDays / 7).toFixed(1)));

    const formatDateStr = (dStr: string) => {
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dStr;
    };

    if (dates[0] === dates[dates.length - 1]) {
      dateRangeStr = `Fecha: ${formatDateStr(dates[0])}`;
    } else {
      dateRangeStr = `Del ${formatDateStr(dates[0])} al ${formatDateStr(dates[dates.length - 1])}`;
    }
  }

  const camRate = (installedCams / weeksActive).toFixed(1);
  const pipeRate = (installedPipeMeters / weeksActive).toFixed(1);

  const totalItems = filteredElements.length;
  const termCount = filteredElements.filter(e => e.status === 'Terminado').length;
  const procCount = filteredElements.filter(e => e.status === 'En proceso').length;
  const pendCount = filteredElements.filter(e => e.status === 'Pendiente').length;

  let progressPct = 0;
  if (totalItems > 0) {
    progressPct = Math.round(((termCount + procCount * 0.5) / totalItems) * 100);
  }

  const handlePreset = (preset: 'all' | 'last1' | 'last2' | 'last4') => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    if (preset !== 'all') {
      let days = 7;
      if (preset === 'last2') days = 14;
      if (preset === 'last4') days = 28;

      const past = new Date();
      past.setDate(now.getDate() - days);

      startDate = past.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    onFilterChange({
      ...filter,
      preset,
      startDate,
      endDate
    });
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white rounded-xl p-3.5 shadow-md flex flex-col gap-3">
      {/* Date Filter & Cutoff Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700/80 text-xs no-print">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Corte de Seguimiento:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">Desde:</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value, preset: 'all' })}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">Hasta:</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value, preset: 'all' })}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => handlePreset('all')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                filter.preset === 'all' && !filter.startDate ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => handlePreset('last1')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                filter.preset === 'last1' ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              Última Sem.
            </button>
            <button
              onClick={() => handlePreset('last2')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                filter.preset === 'last2' ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              Últimas 2 Sem.
            </button>
            <button
              onClick={() => handlePreset('last4')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                filter.preset === 'last4' ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              Últimas 4 Sem.
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Display Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Camera Metric */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Promedio Cámaras</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">{camRate}</span>
              <span className="text-[11px] font-semibold text-rose-300">cám / semana</span>
            </div>
            <span className="text-[10px] text-slate-400">Total: {installedCams} inst. / {totalCams} proy.</span>
          </div>
        </div>

        {/* Pipeline Metric */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold shrink-0">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Promedio Tubería</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">{pipeRate}</span>
              <span className="text-[11px] font-semibold text-sky-300">m / semana</span>
            </div>
            <span className="text-[10px] text-slate-400">Total: {installedPipeMeters}m inst. / {totalPipeMeters}m proy.</span>
          </div>
        </div>

        {/* Time Window Metric */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Ventana de Tiempo</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-white">{weeksActive.toFixed(1)}</span>
              <span className="text-[11px] font-semibold text-amber-300">semanas activo</span>
            </div>
            <span className="text-[10px] text-slate-400">{dateRangeStr}</span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="w-full pr-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avance Global</span>
              <span className="text-xs font-bold text-emerald-400">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {termCount} Term. / {procCount} Proc. / {pendCount} Pend.
            </span>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS POR ACTA DE COBRO / VALORIZACIÓN */}
      <div className="bg-slate-800/90 border border-emerald-700/60 rounded-lg p-3 mt-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">
              Estadísticas por Acta de Cobro
            </h3>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded text-[10px] font-extrabold">
              {actasSorted.length} {actasSorted.length === 1 ? 'Acta' : 'Actas'}
            </span>
            {filter.actaFilter && (
              <button
                onClick={() => onFilterChange({ ...filter, actaFilter: undefined })}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded font-bold transition flex items-center gap-1"
                title="Quitar filtro de acta"
              >
                <span>Filtrando por: <strong>{filter.actaFilter}</strong></span>
                <span className="text-amber-200 font-extrabold">✕</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowActasDetail(!showActasDetail)}
            className="text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 bg-slate-700/60 px-2 py-1 rounded border border-slate-600/60 transition"
          >
            <span>{showActasDetail ? 'Ocultar Detalle' : 'Mostrar Detalle'}</span>
            {showActasDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showActasDetail && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {actasSorted.map(([actaName, stats]) => {
              const totalItems = stats.total;
              const termItems = stats.terminado;
              const pctExec = totalItems > 0 ? Math.round((termItems / totalItems) * 100) : 0;
              const isSelected = filter.actaFilter === actaName;

              return (
                <div
                  key={actaName}
                  onClick={() => {
                    if (filter.actaFilter === actaName) {
                      onFilterChange({ ...filter, actaFilter: undefined });
                    } else {
                      onFilterChange({ ...filter, actaFilter: actaName });
                    }
                  }}
                  className={`bg-slate-900/90 rounded-lg p-2.5 border transition cursor-pointer relative overflow-hidden group hover:border-emerald-500/80 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-slate-900 shadow-md'
                      : 'border-slate-700/80 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Row: Title & Progress Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${actaName === 'Sin Asignar' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="font-extrabold text-xs text-white truncate" title={actaName}>
                        {actaName}
                      </span>
                    </div>
                    <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                      pctExec === 100
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : pctExec > 0
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {pctExec}% Term.
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pctExec}%` }}
                    />
                  </div>

                  {/* Executed metrics breakdown */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Cámaras</span>
                      <span className="font-bold text-white">
                        <strong className="text-emerald-400">{stats.camerasTerminado}</strong> / {stats.camerasTotal} inst.
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Canalización</span>
                      <span className="font-bold text-white">
                        <strong className="text-emerald-400">{stats.tramosMetersTerminado}m</strong> / {stats.tramosMetersTotal}m
                      </span>
                    </div>
                  </div>

                  {/* Status counts pills */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px]">
                    <div className="flex items-center gap-1" title="Terminados">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="font-bold text-emerald-300">{stats.terminado}</span>
                    </div>
                    <div className="flex items-center gap-1" title="En proceso">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-amber-300">{stats.enProceso}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Pendientes">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span className="font-bold text-rose-300">{stats.pendiente}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
