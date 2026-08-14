import React, { useState, useEffect } from 'react';
import { InspectionElement, StatusType, CameraNorm, ScheduleItem, GlobalConfig, VersionHistoryLog, ContractualItem } from '../types';
import { DEFAULT_CONTRACTUAL_ITEMS } from '../data/sampleData';
import { supabaseAudit } from '../lib/supabase';
import { adjustTramoMeters } from '../utils/tramoUtils';
import { normalizeActa, getAvailableActas } from '../utils/actaUtils';
import { normalizeLayer, ELECTRICAL_NODE_TYPES } from '../utils/layerUtils';
import { ElementPhotoTimeline } from './ElementPhotoTimeline';
import { getElementPhotoRecords } from '../utils/photoUtils';
import { ClipboardList, Clock, X, ShieldCheck, Activity, AlertTriangle, Trash2, Calendar, Tag, Ruler, Wifi, Camera, Image, Eye, CalendarCheck, FileText, Plus, Minus, Move, History, Sparkles } from 'lucide-react';

interface TelemetryDrawerProps {
  element: InspectionElement | null;
  onClose: () => void;
  onUpdateElement: (updated: InspectionElement) => void;
  onDeleteElement?: (id: number) => void;
  areaName: string;
  scheduleItems?: ScheduleItem[];
  globalConfig?: GlobalConfig;
  initialTab?: 'details' | 'photos' | 'history';
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  element,
  onClose,
  onUpdateElement,
  onDeleteElement,
  areaName,
  scheduleItems = [],
  globalConfig,
  initialTab = 'details'
}) => {
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'history'>(initialTab);
  const [historyLogs, setHistoryLogs] = useState<VersionHistoryLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [contractItems, setContractItems] = useState<ContractualItem[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const loadContractItems = () => {
      const saved = localStorage.getItem('obra_contract_items_v1');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setContractItems(parsed);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setContractItems(DEFAULT_CONTRACTUAL_ITEMS);
    };

    loadContractItems();
    window.addEventListener('contractItemsUpdated', loadContractItems);
    return () => window.removeEventListener('contractItemsUpdated', loadContractItems);
  }, []);

  useEffect(() => {
    if (element && activeTab === 'history') {
      const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const logs = await supabaseAudit.fetchHistoryForElement(String(element.id), 50);
          setHistoryLogs(logs);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [element?.id, activeTab]);

  if (!element) return null;

  const drawerActas = getAvailableActas([element], globalConfig?.totalActas || 10);

  const handleDelete = () => {
    if (!onDeleteElement) return;
    const typeLabel = element.type === 'camera' ? 'cámara' : 'canalización / tramo';
    if (window.confirm(`¿Seguro que deseas eliminar la ${typeLabel} "${element.label}" de la bitácora de obra?`)) {
      onDeleteElement(element.id);
      onClose();
    }
  };

  const handleStatusChange = (newStatus: StatusType) => {
    let newPercent = element.progressPercent;
    if (newStatus === 'En proceso' && (newPercent === undefined || newPercent === 0)) {
      newPercent = 50;
    } else if (newStatus === 'Terminado') {
      newPercent = 100;
    } else if (newStatus === 'Pendiente') {
      newPercent = 0;
    }
    onUpdateElement({
      ...element,
      status: newStatus,
      progressPercent: newPercent,
      lastUpdate: new Date().toLocaleTimeString()
    });
  };

  const photoRecords = getElementPhotoRecords(element);
  const totalFindings = photoRecords.filter(r => {
    const s = (r.stage || '').toLowerCase();
    return s.includes('hallazgo') || s.includes('no conformidad') || (r.finding && r.finding.length > 0);
  }).length;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[350] transition-opacity" 
        onClick={onClose} 
      />
      <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-slate-900 text-white shadow-2xl z-[360] p-4 sm:p-5 flex flex-col justify-between border-l border-slate-800 animate-in slide-in-from-right duration-200 overflow-y-auto pb-[max(24px,calc(env(safe-area-inset-bottom)+20px))]">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Edición de Bitácora</span>
              </h3>
              <p className="text-xs text-slate-400">{element.type === 'camera' ? 'Cámara / Caja de Inspección' : 'Canalización / Tramo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDeleteElement && (
              <button
                onClick={handleDelete}
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 p-1.5 rounded-lg transition"
                title={`Eliminar ${element.type === 'camera' ? 'cámara' : 'tramo'}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Tab Navigator */}
        <div className="flex bg-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition ${activeTab === 'details' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Eye className="w-3.5 h-3.5" /> Detalles
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md font-semibold transition ${activeTab === 'photos' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Fotos</span>
            <span className="bg-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {photoRecords.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold transition ${activeTab === 'history' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <History className="w-3.5 h-3.5" /> Historial
          </button>
        </div>

        {activeTab === 'photos' ? (
          <div className="space-y-4">
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Evidencia y Trazabilidad de {element.label}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Almacenamiento y cronología de fotos y hallazgos por fecha.
                  </p>
                </div>
                <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-bold">
                  {areaName || 'Sector general'}
                </span>
              </div>
            </div>

            <ElementPhotoTimeline
              element={element}
              onUpdateElement={onUpdateElement}
            />
          </div>
        ) : activeTab === 'details' ? (
          <>
            {/* Basic Info: Editable Label & Date */}
            <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700/80 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-sky-400" /> Identificador / Etiqueta
            </label>
            <input
              type="text"
              value={element.label}
              onChange={(e) => onUpdateElement({ ...element, label: e.target.value, lastUpdate: new Date().toLocaleTimeString() })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-extrabold focus:outline-none focus:border-sky-500"
              placeholder="Ej. C-01 o Tramo T-05"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" /> Fecha Inspección
              </label>
              <input
                type="date"
                value={element.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => onUpdateElement({ ...element, date: e.target.value, lastUpdate: new Date().toLocaleTimeString() })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Sector Asignado</label>
              <span className="block font-bold text-purple-300 bg-purple-950/80 px-2 py-1 rounded border border-purple-800 text-[11px] truncate">
                {areaName || 'Sin área'}
              </span>
            </div>
          </div>
        </div>

        {/* Tramo Length Adjustment Section (for line elements) */}
        {element.type === 'line' && (
          <div className="bg-slate-800/90 rounded-xl p-3 border border-sky-500/70 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-sky-400" /> Modificar Tramo en Gráfico
              </label>
              <span className="text-[10px] bg-sky-950 text-sky-200 border border-sky-600 px-2 py-0.5 rounded font-black">
                {element.meters || 0} m
              </span>
            </div>

            <p className="text-[10px] text-slate-300">
              Aumenta o reduce la longitud del tramo de canalización. Las coordenadas del plano se actualizarán proporcionalmente.
            </p>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onUpdateElement(adjustTramoMeters(element, -5, true))}
                className="px-2 py-1 bg-slate-950 hover:bg-rose-950/70 text-rose-300 border border-rose-800 rounded font-bold text-xs flex items-center gap-1 transition"
                title="Reducir 5 metros"
              >
                <Minus className="w-3 h-3" /> 5m
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement(adjustTramoMeters(element, -1, true))}
                className="px-2.5 py-1 bg-slate-950 hover:bg-rose-900/50 text-rose-300 border border-rose-700/70 rounded font-bold text-xs flex items-center gap-1 transition"
                title="Reducir 1 metro"
              >
                <Minus className="w-3 h-3" /> 1m
              </button>

              <div className="flex-1 flex items-center justify-center bg-slate-950 border border-sky-500 rounded px-2 py-1">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={element.meters || 0}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 1);
                    onUpdateElement(adjustTramoMeters(element, val, false));
                  }}
                  className="w-14 text-center font-black text-amber-300 bg-transparent text-xs focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 font-bold">m</span>
              </div>

              <button
                type="button"
                onClick={() => onUpdateElement(adjustTramoMeters(element, 1, true))}
                className="px-2.5 py-1 bg-slate-950 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/70 rounded font-bold text-xs flex items-center gap-1 transition"
                title="Aumentar 1 metro"
              >
                <Plus className="w-3 h-3" /> 1m
              </button>
              <button
                type="button"
                onClick={() => onUpdateElement(adjustTramoMeters(element, 5, true))}
                className="px-2 py-1 bg-slate-950 hover:bg-emerald-950/70 text-emerald-300 border border-emerald-800 rounded font-bold text-xs flex items-center gap-1 transition"
                title="Aumentar 5 metros"
              >
                <Plus className="w-3 h-3" /> 5m
              </button>
            </div>
          </div>
        )}

        {/* Acta de Cobro / Valorización Section */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-emerald-700/60 space-y-2">
          <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-emerald-400" /> Acta de Cobro / Facturación
            </span>
            {element.acta && (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold">
                {element.acta}
              </span>
            )}
          </label>
          <div className="space-y-1.5">
            <select
              value={normalizeActa(element.acta) === 'Sin Asignar' ? '' : normalizeActa(element.acta)}
              onChange={(e) => onUpdateElement({
                ...element,
                acta: e.target.value,
                lastUpdate: new Date().toLocaleTimeString()
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Sin Asignar --</option>
              {drawerActas.map(actaName => (
                <option key={actaName} value={actaName}>
                  {actaName}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 flex-wrap text-[10px]">
              <span className="text-slate-400">Rápido:</span>
              {drawerActas.slice(0, 5).map((actaName) => (
                <button
                  key={actaName}
                  type="button"
                  onClick={() => onUpdateElement({
                    ...element,
                    acta: actaName,
                    lastUpdate: new Date().toLocaleTimeString()
                  })}
                  className={`px-2 py-0.5 rounded font-semibold border transition ${
                    element.acta === actaName
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {actaName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ítem Contractual / Cobro para Memoria de Cálculo */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-sky-600/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-sky-400" /> Ítem de Cobro / Memoria de Cálculo
            </label>
            {element.itemCobro && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Ítem {element.itemCobro}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-300 block mb-1">Cargar Ítem desde el Acta / Presupuesto:</span>
            <select
              value={element.itemCobro || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const foundItem = contractItems.find(c => c.item === selectedVal);
                if (foundItem) {
                  onUpdateElement({
                    ...element,
                    itemCobro: foundItem.item,
                    itemDescripcion: foundItem.description,
                    itemUnidad: foundItem.unit,
                    lastUpdate: new Date().toLocaleTimeString()
                  });
                } else {
                  onUpdateElement({
                    ...element,
                    itemCobro: selectedVal,
                    lastUpdate: new Date().toLocaleTimeString()
                  });
                }
              }}
              className="w-full bg-slate-950 border border-sky-500/50 rounded p-2 text-white font-bold text-xs focus:ring-1 focus:ring-sky-400 cursor-pointer"
            >
              <option value="">-- Seleccionar Ítem del Acta --</option>
              <optgroup label="📋 Ítems del Acta de Obra / Presupuesto">
                {contractItems.map((ci, idx) => (
                  <option key={`${ci.item}_${idx}`} value={ci.item}>
                    {ci.item} - {ci.description} ({ci.unit})
                  </option>
                ))}
              </optgroup>
              {element.itemCobro && !contractItems.find(c => c.item === element.itemCobro) && (
                <optgroup label="✏️ Personalizado">
                  <option value={element.itemCobro}>{element.itemCobro} - {element.itemDescripcion || 'Personalizado'}</option>
                </optgroup>
              )}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block mb-0.5">N° Ítem</span>
              <input
                type="text"
                value={element.itemCobro || ''}
                onChange={(e) => onUpdateElement({
                  ...element,
                  itemCobro: e.target.value,
                  lastUpdate: new Date().toLocaleTimeString()
                })}
                placeholder="Ej: 3.63, 6.1 D"
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold text-xs"
              />
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Descripción del Ítem</span>
              <input
                type="text"
                value={element.itemDescripcion || ''}
                onChange={(e) => onUpdateElement({
                  ...element,
                  itemDescripcion: e.target.value,
                  lastUpdate: new Date().toLocaleTimeString()
                })}
                placeholder="Ej: SEI CAMPANA PVC 4''"
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Observaciones / Notas de Campo Section */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-sky-700/60 space-y-2">
          <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-400" /> Observaciones y Notas de Campo
          </label>
          <textarea
            rows={3}
            value={element.observations || ''}
            onChange={(e) => onUpdateElement({
              ...element,
              observations: e.target.value,
              lastUpdate: new Date().toLocaleTimeString()
            })}
            placeholder="Ingrese observaciones, novedades técnicas, pendientes o detalles de instalación..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 resize-y"
          />
        </div>

        {/* Link to Schedule / Cronograma Item */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-indigo-700/60 space-y-2">
          <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" /> Vínculo con Cronograma de Obra
          </label>
          <div className="space-y-1.5">
            <select
              value={element.scheduleItemId || ''}
              onChange={(e) => onUpdateElement({
                ...element,
                scheduleItemId: e.target.value || undefined,
                lastUpdate: new Date().toLocaleTimeString()
              })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-200 font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Seleccionar Código de Rubro en Cronograma --</option>
              {scheduleItems.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {item.description} ({item.targetQuantity} {item.unit})
                </option>
              ))}
            </select>
            {element.scheduleItemId ? (
              <div className="text-[10px] text-indigo-300 bg-indigo-950/80 p-2 rounded border border-indigo-800 flex items-center justify-between">
                <span>Código asignado: <strong className="text-amber-300 font-mono">{element.scheduleItemId}</strong></span>
                <span className="text-emerald-400 font-bold">
                  +{element.type === 'line' ? `${element.meters || 0}m` : '1 und'} suma al avance
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                Sugerencia: Vincula este {element.type === 'camera' ? 'elemento' : 'tramo'} a rubros como 200502 (Ø4") o 200503 (Ø6") para calcular el avance en tiempo real.
              </p>
            )}
          </div>
        </div>

        {/* Status Selector Switcher */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Estado de Inspección en Bitácora
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => handleStatusChange('Pendiente')}
              className={`py-1.5 rounded-md font-bold transition text-[11px] flex items-center justify-center gap-1 ${
                element.status === 'Pendiente'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-slate-400" /> Pendiente
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('En proceso')}
              className={`py-1.5 rounded-md font-bold transition text-[11px] flex items-center justify-center gap-1 ${
                element.status === 'En proceso'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3 text-amber-300" /> En Proceso
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('Terminado')}
              className={`py-1.5 rounded-md font-bold transition text-[11px] flex items-center justify-center gap-1 ${
                element.status === 'Terminado'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-300" /> Terminado
            </button>
          </div>

          {element.status === 'En proceso' && (
            <div className="mt-2 bg-amber-950/60 border border-amber-600/80 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" /> Porcentaje de Avance
                </span>
                <div className="flex items-center gap-1 bg-amber-900/80 border border-amber-500 px-2 py-0.5 rounded font-black text-amber-200">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={element.progressPercent !== undefined ? element.progressPercent : 50}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      onUpdateElement({
                        ...element,
                        progressPercent: val,
                        lastUpdate: new Date().toLocaleTimeString()
                      });
                    }}
                    className="w-12 bg-slate-950 text-center font-bold text-amber-300 border border-amber-500 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <span>%</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={element.progressPercent !== undefined ? element.progressPercent : 50}
                onChange={(e) => onUpdateElement({
                  ...element,
                  progressPercent: Number(e.target.value),
                  lastUpdate: new Date().toLocaleTimeString()
                })}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />

              {/* Quick Percentage Presets */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="text-slate-400">Atajos:</span>
                {[10, 25, 50, 75, 90].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onUpdateElement({
                      ...element,
                      progressPercent: pct,
                      lastUpdate: new Date().toLocaleTimeString()
                    })}
                    className={`px-2 py-0.5 rounded font-bold border transition ${
                      (element.progressPercent ?? 50) === pct
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-amber-200 border-amber-800/80 hover:bg-amber-900/50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photos & Findings Section */}
        <ElementPhotoTimeline
          element={element}
          onUpdateElement={onUpdateElement}
        />

        {/* Technical Specs & Dimensions Editing */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700/80 flex flex-col gap-2.5 text-xs">
          <span className="font-bold text-sky-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-sky-400" /> Especificaciones de la Bitácora
          </span>

          {element.type === 'camera' ? (
            <div className="flex flex-col gap-2.5 text-slate-300">
              {normalizeLayer(element.layer) === 'electrica' ? (
                <>
                  <div>
                    <label className="text-[10px] text-cyan-400 font-bold block mb-1">Tipo de Nodo Eléctrico:</label>
                    <select
                      value={element.electricNodeType || 'tablero'}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        const matching = ELECTRICAL_NODE_TYPES.find(n => n.id === nextType);
                        onUpdateElement({
                          ...element,
                          electricNodeType: nextType,
                          voltage: nextType === 'transformador' || nextType === 'barrajes_elastomericos' ? 13200 : (element.voltage || 220),
                          lastUpdate: new Date().toLocaleTimeString()
                        });
                      }}
                      className="w-full bg-slate-950 border border-cyan-700/80 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      {ELECTRICAL_NODE_TYPES.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.icon} {n.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tag Circuito / Alimentador:</label>
                      <input
                        type="text"
                        placeholder="Ej: ALIM-TR-01"
                        value={element.circuitTag || ''}
                        onChange={(e) => onUpdateElement({ ...element, circuitTag: e.target.value, lastUpdate: new Date().toLocaleTimeString() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tensión Operación (V):</label>
                      <input
                        type="number"
                        placeholder="220 / 13200"
                        value={element.voltage || 220}
                        onChange={(e) => onUpdateElement({ ...element, voltage: Number(e.target.value) || 0, lastUpdate: new Date().toLocaleTimeString() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0">Norma de Caja:</span>
                  <select
                    value={element.camType || 'SB850'}
                    onChange={(e) => onUpdateElement({ ...element, camType: e.target.value as CameraNorm, lastUpdate: new Date().toLocaleTimeString() })}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-sky-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="SB858">SB858 (Telecom)</option>
                    <option value="SB850">SB850 (BT)</option>
                    <option value="SB851">SB851 (MT)</option>
                    <option value="SB853">SB853 (MT)</option>
                  </select>
                </div>
              )}

              <div className="pt-1 border-t border-slate-700/60">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-400" /> Nivel Prueba / Continuidad (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={element.signalStrength || 95}
                    onChange={(e) => onUpdateElement({ ...element, signalStrength: Number(e.target.value) || 0, lastUpdate: new Date().toLocaleTimeString() })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-300 font-mono font-bold"
                  />
                </div>
              </div>

              {normalizeLayer(element.layer) === 'civil' && (
                <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Medidas de Norma:</span>
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">
                    {element.camType === 'SB858' && '0.9m × 0.9m'}
                    {element.camType === 'SB850' && '1.3m × 1.3m'}
                    {element.camType === 'SB851' && '1.5m × 1.5m'}
                    {element.camType === 'SB853' && '2.6m × 1.5m'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 text-slate-300">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Longitud del Tramo (Metros):</label>
                <input
                  type="number"
                  min="1"
                  value={element.meters || 0}
                  onChange={(e) => onUpdateElement({ ...element, meters: Number(e.target.value) || 0, lastUpdate: new Date().toLocaleTimeString() })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Especificación Tuberías / Ductos:</label>
                <input
                  type="text"
                  value={element.pipes || ''}
                  onChange={(e) => onUpdateElement({ ...element, pipes: e.target.value, lastUpdate: new Date().toLocaleTimeString() })}
                  placeholder="Ej: 6x6 PVC Schedule 40"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-sky-300 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="pt-1.5 border-t border-slate-700/60">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-lg border border-slate-800 hover:border-amber-500/50 transition">
                  <input
                    type="checkbox"
                    checked={element.onlyPipes || false}
                    onChange={(e) => onUpdateElement({
                      ...element,
                      onlyPipes: e.target.checked,
                      cables: e.target.checked ? 'N/A - Solo Tubería' : (element.cables === 'N/A - Solo Tubería' ? '' : element.cables),
                      lastUpdate: new Date().toLocaleTimeString()
                    })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">Tramo Solo Tubería (Sin Cable)</span>
                    <span className="text-[10px] text-slate-400 block">Excluye este tramo del cálculo de conductores</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Cableado y Calibre:</label>
                <input
                  type="text"
                  disabled={element.onlyPipes}
                  value={element.onlyPipes ? 'N/A (Solo Tubería)' : (element.cables || '')}
                  onChange={(e) => onUpdateElement({ ...element, cables: e.target.value, lastUpdate: new Date().toLocaleTimeString() })}
                  placeholder="Ej: 3#250 F+1#500N+1#6T"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete Element Action Button */}
        {onDeleteElement && (
          <button
            onClick={handleDelete}
            className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 hover:border-rose-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mt-1 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar de la Bitácora</span>
          </button>
        )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700 pb-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Línea de Tiempo de Ejecución</h4>
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Activity className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-xs">Cargando historial...</span>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="text-center text-slate-500 py-10 text-xs">
                No hay registros de historial para este elemento.
              </div>
            ) : (
              <div className="relative border-l border-slate-700 ml-3 space-y-5">
                {historyLogs.map(log => (
                  <div key={log.id} className="relative pl-5">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-amber-500"></div>
                    <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/80 shadow-sm flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-sky-300 font-mono font-medium">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded font-bold">{log.userName}</span>
                      </div>
                      <p className="text-xs text-slate-200">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Última mod: {element.lastUpdate || 'Reciente'}</span>
        </span>
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold"
        >
          Cerrar Panel
        </button>
      </div>

      {/* Photo Full-Screen Modal Preview */}
      {activePhotoUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-2 rounded-full bg-slate-800/80"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activePhotoUrl}
              alt="Evidencia Ampliada"
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-slate-700 shadow-2xl"
            />
            <span className="text-slate-300 text-xs mt-3 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              Evidencia de {element.label} ({element.type === 'camera' ? 'Cámara' : 'Tramo'})
            </span>
          </div>
        </div>
      )}
      </div>
    </>
  );
};


