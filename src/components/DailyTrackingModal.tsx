import React, { useState, useEffect } from 'react';
import { AreaSector, AuthUser, DailyTrackingLog, InspectionElement, ProjectMeta } from '../types';
import { supabaseDailyTracking, supabaseAudit } from '../lib/supabase';

import { summarizeCables } from '../utils/cableParser';
import { 
  X, 
  Calendar, 
  Save, 
  History, 
  CheckCircle, 
  Clock, 
  CloudSun, 
  UserCheck, 
  FileText, 
  Ruler, 
  Trash2, 
  Printer, 
  Download, 
  HardHat, 
  Building2, 
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface DailyTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectMeta: ProjectMeta;
  elements: InspectionElement[];
  areas: AreaSector[];
  currentUser: AuthUser | null;
  showToast: (msg: string) => void;
  onAddActivityLog: (msg: string, type: 'status_change' | 'element_added' | 'sector_created' | 'telemetry_alert', severity?: 'info' | 'success' | 'warning') => void;
}

export const DailyTrackingModal: React.FC<DailyTrackingModalProps> = ({
  isOpen,
  onClose,
  projectMeta,
  elements,
  areas,
  currentUser,
  showToast,
  onAddActivityLog
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'save' | 'history'>('save');
  const [historyLogs, setHistoryLogs] = useState<DailyTrackingLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<DailyTrackingLog | null>(null);

  // Form states for saving today's tracking
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState<string>(projectMeta.inspectorName || currentUser?.fullName || '');
  const [contractorName, setContractorName] = useState<string>(projectMeta.contractorName || '');
  const [sectorLocation, setSectorLocation] = useState<string>(projectMeta.sectorLocation || '');
  const [weatherCondition, setWeatherCondition] = useState<'Despejado' | 'Lluvia' | 'Nublado' | 'Viento Fuerte'>('Despejado');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [workSummary, setWorkSummary] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto calculated metrics
  const totalElements = elements.length;
  const completedElements = elements.filter(e => e.status === 'Terminado').length;
  const inProgressElements = elements.filter(e => e.status === 'En proceso').length;
  const pendingElements = elements.filter(e => e.status === 'Pendiente').length;

  const lineElements = elements.filter(e => e.type === 'line');
  const totalMetersExecuted = lineElements
    .filter(e => e.status === 'Terminado')
    .reduce((sum, e) => sum + (e.meters || 0), 0);
  const totalMetersPending = lineElements
    .filter(e => e.status !== 'Terminado')
    .reduce((sum, e) => sum + (e.meters || 0), 0);

  const cableSummaries = summarizeCables(lineElements);
  const cableMetersTotal = cableSummaries.reduce((sum, g) => sum + g.totalMeters, 0);

  // Load history when tab changes or opens
  useEffect(() => {
    loadHistory();
  }, [isOpen]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const logs = await supabaseDailyTracking.fetchLogs();
      setHistoryLogs(logs);
    } catch (err) {
      console.warn('Error fetching daily tracking logs history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveDailyTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workSummary.trim()) {
      showToast('Por favor describe un breve resumen de los trabajos realizados hoy.');
      return;
    }

    setIsSaving(true);
    const newLog: DailyTrackingLog = {
      id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: dateStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inspectorName: inspectorName || projectMeta.inspectorName || 'Inspector de Obra',
      contractorName: contractorName || projectMeta.contractorName || 'Sin contratista',
      sectorLocation: sectorLocation || projectMeta.sectorLocation || 'General',
      weatherCondition,
      supervisorName,
      workSummary,
      observations,
      totalElements,
      completedElements,
      inProgressElements,
      pendingElements,
      totalMetersExecuted,
      totalMetersPending,
      cableMetersTotal,
      elementsSnapshot: elements,
      areasSnapshot: areas,
      projectMetaSnapshot: {
        ...projectMeta,
        inspectorName: inspectorName || projectMeta.inspectorName,
        contractorName: contractorName || projectMeta.contractorName,
        sectorLocation: sectorLocation || projectMeta.sectorLocation,
      },
      cableSummariesSnapshot: cableSummaries,
      createdBy: currentUser?.email || 'Inspector Local',
      createdAt: new Date().toISOString()
    };

    const res = await supabaseDailyTracking.saveLog(newLog);
    setIsSaving(false);

    if (res.success) {
      showToast(`¡Seguimiento del día (${dateStr}) guardado con éxito!`);
      onAddActivityLog(
        `Seguimiento Diario Guardado (${dateStr}): ${completedElements}/${totalElements} elementos listos, ${totalMetersExecuted}m ejecutados.`,
        'status_change',
        'success'
      );

      // Audit Log
      await supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'inspector@obra.com',
        userName: currentUser?.fullName || inspectorName || 'Inspector',
        userRole: currentUser?.role || 'inspector',
        actionType: 'create',
        entityType: 'bitacora_log',
        entityId: newLog.id,
        entityName: `Bitácora ${dateStr}`,
        details: `Guardó bitácora del día ${dateStr} (${completedElements}/${totalElements} terminados, ${totalMetersExecuted}m ejecutados)`,
        newValue: JSON.stringify({ date: dateStr, summary: workSummary, executedMeters: totalMetersExecuted, completedElements })
      });

      setWorkSummary('');
      setObservations('');
      await loadHistory();
      setActiveTab('history');
    } else {
      showToast('No se pudo guardar el seguimiento diario.');
    }
  };

  const handleDeleteLog = async (id: string, dateLabel: string) => {
    if (window.confirm(`¿Deseas eliminar el registro del seguimiento del día ${dateLabel}?`)) {
      await supabaseDailyTracking.deleteLog(id);

      await supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Administrador',
        userRole: currentUser?.role || 'admin',
        actionType: 'delete',
        entityType: 'bitacora_log',
        entityId: id,
        entityName: `Bitácora ${dateLabel}`,
        details: `Eliminó el registro diario del ${dateLabel}`
      });

      showToast('Registro diario eliminado');
      setHistoryLogs(prev => prev.filter(l => l.id !== id));
      if (selectedLogDetail?.id === id) setSelectedLogDetail(null);
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-800/90 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Seguimiento y Registro Diario de Obra</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-mono">
                  Bitácora Digital
                </span>
              </h2>
              <p className="text-xs text-slate-400">Guarda instantáneas diarias del avance físico y metrajes de la inspección</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950 border-b border-slate-800 px-5 py-2 flex items-center gap-2 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('save')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'save'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Guardar Avance de Hoy</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Registros ({historyLogs.length})</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-300">
          {activeTab === 'save' ? (
            <form onSubmit={handleSaveDailyTracking} className="space-y-5">
              
              {/* Computed Live Metrics Card */}
              <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Información Completa de Pantalla Registrada
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Obra: {projectMeta.projectName || 'Sin título'}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Cámaras (Puntos)</span>
                    <span className="text-base font-extrabold text-white font-mono">
                      {elements.filter(e => e.type === 'camera').length}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Tramos / Canalizaciones</span>
                    <span className="text-base font-extrabold text-white font-mono">
                      {lineElements.length}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-emerald-400 text-[10px] block font-semibold">Ejecutado (m)</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">{totalMetersExecuted} m</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-amber-400 text-[10px] block font-semibold">Pendiente (m)</span>
                    <span className="text-base font-extrabold text-amber-300 font-mono">{totalMetersPending} m</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-indigo-300 text-[10px] block font-semibold">Cableado Est.</span>
                    <span className="text-base font-extrabold text-indigo-300 font-mono">{cableMetersTotal} m</span>
                  </div>
                </div>

                {cableSummaries.length > 0 && (
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px] flex flex-wrap gap-2 items-center">
                    <span className="text-slate-400 font-semibold">Calibres en pantalla:</span>
                    {cableSummaries.map((c, i) => (
                      <span key={i} className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono text-[10px] border border-slate-700">
                        {c.gauge}: <strong className="text-white">{c.totalMeters}m</strong> ({c.totalConductors} hilos)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Fecha del Registro
                  </label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <HardHat className="w-3.5 h-3.5 text-sky-400" /> Inspector / Residente
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="Ing. Responsable"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Empresa / Contratista
                  </label>
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="Ej. Consorcio Eléctrico Norte"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <CloudSun className="w-3.5 h-3.5 text-amber-300" /> Clima / Condición Atmosférica
                  </label>
                  <select
                    value={weatherCondition}
                    onChange={(e: any) => setWeatherCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Despejado">☀️ Despejado / Soleado</option>
                    <option value="Nublado">☁️ Nublado</option>
                    <option value="Lluvia">🌧️ Lluvia / Húmedo</option>
                    <option value="Viento Fuerte">💨 Viento Fuerte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Supervisor de Obra
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Nombre del Supervisor"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-400" /> Ubicación / Sector
                  </label>
                  <input
                    type="text"
                    value={sectorLocation}
                    onChange={(e) => setSectorLocation(e.target.value)}
                    placeholder="Ej. Sector Manzana 4"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Work Summary */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Resumen del Trabajo Ejecutado Hoy
                </label>
                <textarea
                  required
                  rows={3}
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="Describe los avances logrados hoy (ej. Instalación de 80m de tubería conduit de 3 pulgadas en tramo T-1 a T-4, vaciado de concreto en cámara C-102)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observaciones, Novedades o Incidencias
                </label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Menciona retrasos por clima, falta de materiales o interferencias encontradas en terreno..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs transition shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span>Guardando en Supabase...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Registro del Día ({dateStr})</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <span>Cargando historial de seguimiento diario desde Supabase...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="py-12 text-center bg-slate-800/50 rounded-2xl border border-slate-800 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">No hay registros diarios guardados aún</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Completa el formulario en la pestaña "Guardar Avance de Hoy" para registrar el progreso físico de la obra.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 hover:border-slate-600 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-mono font-bold text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> {log.date}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono">
                            {log.timestamp}
                          </span>
                          {log.weatherCondition && (
                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-amber-200/90 border border-slate-700">
                              {log.weatherCondition}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedLogDetail(selectedLogDetail?.id === log.id ? null : log)}
                            className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <span>{selectedLogDetail?.id === log.id ? 'Ocultar Detalle' : 'Ver Registro'}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedLogDetail?.id === log.id ? 'rotate-90' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id, log.date)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Summary Metrics Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Inspector</span>
                          <span className="font-bold text-slate-200 truncate block">{log.inspectorName}</span>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Ejecutado Hoy</span>
                          <span className="font-bold text-emerald-400 font-mono">{log.totalMetersExecuted} m</span>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Completados</span>
                          <span className="font-bold text-sky-400 font-mono">{log.completedElements} / {log.totalElements}</span>
                        </div>
                        <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Registrado Por</span>
                          <span className="font-bold text-slate-300 truncate block font-mono text-[10px]">{log.createdBy || 'Inspector'}</span>
                        </div>
                      </div>

                      {/* Work Description preview */}
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                        <span className="font-bold text-amber-300 text-[10px] block uppercase mb-0.5">Resumen de Avance:</span>
                        <p className="line-clamp-2 leading-relaxed">{log.workSummary}</p>
                      </div>

                      {/* Expanded Log Detail View */}
                      {selectedLogDetail?.id === log.id && (
                        <div className="pt-3 border-t border-slate-700/80 space-y-4 bg-slate-900/90 p-4 rounded-xl text-xs animate-in fade-in duration-150">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-amber-400" /> Snapshot Completo de la Inspección ({log.date})
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {log.id}</span>
                          </div>

                          {/* Project info snapshot */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px]">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Obra / Proyecto:</span>
                              <strong className="text-white">{log.projectMetaSnapshot?.projectName || log.sectorLocation || 'General'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Contratista:</span>
                              <strong className="text-slate-200">{log.contractorName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Inspector / Supervisor:</span>
                              <strong className="text-slate-200">{log.inspectorName} {log.supervisorName ? `(${log.supervisorName})` : ''}</strong>
                            </div>
                          </div>

                          {/* Physical Progress % */}
                          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-200">Avance Físico Registrado:</span>
                              <span className="font-mono font-extrabold text-emerald-400">
                                {log.totalElements > 0 ? Math.round((log.completedElements / log.totalElements) * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all"
                                style={{ width: `${log.totalElements > 0 ? Math.round((log.completedElements / log.totalElements) * 100) : 0}%` }}
                              />
                            </div>
                          </div>

                          {log.observations && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg">
                              <span className="font-bold text-amber-300 text-[10px] block uppercase">Novedades / Observaciones:</span>
                              <p className="text-amber-100/90 mt-0.5">{log.observations}</p>
                            </div>
                          )}

                          {/* Cable Summaries Snapshot per Gauge */}
                          {log.cableSummariesSnapshot && log.cableSummariesSnapshot.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="font-bold text-amber-400 text-[11px] block flex items-center gap-1">
                                <Ruler className="w-3.5 h-3.5" /> Consolidado de Cables por Calibre ({log.date}):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {log.cableSummariesSnapshot.map((gauge, idx) => (
                                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-[11px]">
                                    <div>
                                      <span className="font-extrabold text-amber-300 block">{gauge.gauge}</span>
                                      <span className="text-[10px] text-slate-400">{gauge.acometidasCount} tramos ({gauge.totalConductors} hilos)</span>
                                    </div>
                                    <span className="font-mono font-bold text-white text-xs">{gauge.totalMeters} m</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Elements summary snapshot count */}
                          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div className="space-x-3 text-slate-300">
                              <span>📷 Cámaras: <strong className="text-white">{log.elementsSnapshot?.filter(e => e.type === 'camera').length || 0}</strong></span>
                              <span>📏 Tramos: <strong className="text-white">{log.elementsSnapshot?.filter(e => e.type === 'line').length || 0}</strong></span>
                              <span>📍 Sectores: <strong className="text-white">{log.areasSnapshot?.length || 0}</strong></span>
                            </div>
                            <span className="text-slate-400 text-[10px]">Guardado en Supabase Cloud / Local</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Control de Obra y Metrajes</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
