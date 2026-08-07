import React, { useState, useEffect } from 'react';
import { VersionHistoryLog, AuthUser } from '../types';
import { supabaseAudit, isSupabaseConfigured } from '../lib/supabase';
import { 
  X, 
  History, 
  Search, 
  Filter, 
  RotateCw, 
  User, 
  Clock, 
  Trash2, 
  Download, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Camera, 
  FileText, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  showToast: (msg: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  showToast
}) => {
  const [logs, setLogs] = useState<VersionHistoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await supabaseAudit.fetchHistory(150);
      setLogs(data);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar historial de versiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = async () => {
    if (!window.confirm('¿Está seguro de eliminar todo el historial de auditoría? Esta acción no se puede deshacer.')) {
      return;
    }
    setLoading(true);
    await supabaseAudit.clearHistory();
    setLogs([]);
    setLoading(false);
    showToast('Historial de versiones purgado correctamente');
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Fecha y Hora', 'Usuario', 'Email', 'Rol', 'Acción', 'Tipo Entidad', 'Detalles', 'Valor Anterior', 'Valor Nuevo'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('es-ES'),
      `"${l.userName || ''}"`,
      `"${l.userEmail || ''}"`,
      l.userRole,
      l.actionType,
      l.entityType,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_versiones_obra_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Historial exportado en formato CSV');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEntity = selectedEntity === 'all' || log.entityType === selectedEntity;
    const matchesAction = selectedAction === 'all' || log.actionType === selectedAction;

    return matchesSearch && matchesEntity && matchesAction;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'tramo': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'camara': return <Camera className="w-4 h-4 text-sky-500" />;
      case 'area': return <Layers className="w-4 h-4 text-emerald-500" />;
      case 'bitacora_log': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'config': return <Sliders className="w-4 h-4 text-purple-500" />;
      default: return <History className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Creación</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Modificación</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Eliminación</span>;
      case 'move':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Ubicación</span>;
      case 'status_change':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Estado</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-white">
                  Historial de Versiones & Auditoría Supabase
                </h2>
                {isSupabaseConfigured() ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Cloud Sync
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-semibold">
                    <AlertCircle className="w-3 h-3 text-amber-400" /> Local Sync
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Registro detallado de cambios en tramos, cámaras, bitácora y ubicaciones por usuario y fecha
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por usuario, tramo, cámara o detalle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Entity Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las Entidades</option>
                <option value="tramo">⚡ Tramos / Acometidas</option>
                <option value="camara">📷 Cámaras</option>
                <option value="bitacora_log">📋 Bitácora Diario</option>
                <option value="area">📐 Áreas / Sectores</option>
                <option value="config">⚙️ Configuración</option>
              </select>
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las Acciones</option>
                <option value="create">Creación</option>
                <option value="update">Modificación</option>
                <option value="move">Cambio de Ubicación</option>
                <option value="delete">Eliminación</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={loadHistory}
              disabled={loading}
              title="Sincronizar cambios"
              className="p-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={handleClearHistory}
                disabled={logs.length === 0}
                className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                title="Limpiar registro de auditoría"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Cargando historial de auditoría desde Supabase...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No se encontraron registros de auditoría</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Los cambios realizados en tramos, cámaras o la bitácora quedarán registrados automáticamente aquí.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const formattedDate = new Date(log.timestamp).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'medium'
              });

              return (
                <div
                  key={log.id}
                  className={`border rounded-xl transition bg-white ${
                    isExpanded ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Main Row */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5 p-2 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
                        {getEntityIcon(log.entityType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {getActionBadge(log.actionType)}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {log.details}
                          </span>
                          {log.entityName && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded">
                              {log.entityName}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.userName}
                            <span className="text-[10px] font-mono text-slate-400">({log.userEmail})</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formattedDate}
                          </span>

                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-indigo-500" />
                            <span className="uppercase text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                              {log.userRole}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 text-slate-400 hover:text-slate-600">
                      <span className="text-[10px] text-slate-400">Ver detalles</span>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 rounded-b-xl text-xs space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {log.previousValue && (
                          <div className="bg-rose-50/80 border border-rose-200 p-2.5 rounded-lg">
                            <div className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider mb-1">
                              Valor Anterior
                            </div>
                            <pre className="text-[11px] font-mono text-rose-900 whitespace-pre-wrap break-all bg-white/80 p-2 rounded border border-rose-200/60 max-h-36 overflow-y-auto">
                              {log.previousValue}
                            </pre>
                          </div>
                        )}

                        {log.newValue && (
                          <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg">
                            <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                              Nuevo Valor
                            </div>
                            <pre className="text-[11px] font-mono text-emerald-900 whitespace-pre-wrap break-all bg-white/80 p-2 rounded border border-emerald-200/60 max-h-36 overflow-y-auto">
                              {log.newValue}
                            </pre>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span>ID Registro: <code className="font-mono">{log.id}</code></span>
                        <span>Tipo de Entidad: <code className="font-mono uppercase">{log.entityType}</code></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> registros de auditoría
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
