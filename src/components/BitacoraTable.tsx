import React, { useState, useEffect } from 'react';
import { InspectionElement, FilterState, StatusType, CameraNorm, GlobalConfig, ContractualItem } from '../types';
import { formatExecutionTime } from '../utils/timeUtils';
import { adjustTramoMeters } from '../utils/tramoUtils';
import { normalizeActa, getAvailableActas } from '../utils/actaUtils';
import { 
  ClipboardList, 
  Plus, 
  Minus,
  Crosshair, 
  Trash2, 
  MapPin, 
  Ruler, 
  Search, 
  Activity,
  Camera
} from 'lucide-react';

interface BitacoraTableProps {
  elements: InspectionElement[];
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onUpdateElement: (updated: InspectionElement) => void;
  onDeleteElement: (id: number) => void;
  onDeleteAllElements?: () => void;
  onLocateElement: (element: InspectionElement) => void;
  onAddTramo: () => void;
  onAddCamera: () => void;
  onInspectElement: (element: InspectionElement) => void;
  getAreaNameForElement: (element: InspectionElement) => string;
  globalConfig?: GlobalConfig;
}

export const BitacoraTable: React.FC<BitacoraTableProps> = ({
  elements,
  filter,
  onFilterChange,
  onUpdateElement,
  onDeleteElement,
  onDeleteAllElements,
  onLocateElement,
  onAddTramo,
  onAddCamera,
  onInspectElement,
  getAreaNameForElement,
  globalConfig
}) => {
  const [contractItems, setContractItems] = useState<ContractualItem[]>([]);

  useEffect(() => {
    const loadItems = () => {
      const saved = localStorage.getItem('obra_contract_items_v1');
      if (saved) {
        try {
          setContractItems(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    };
    
    loadItems();
    
    window.addEventListener('contractItemsUpdated', loadItems);
    
    return () => window.removeEventListener('contractItemsUpdated', loadItems);
  }, []);

  // Generate list of actas based on configured totalActas (default 10) plus any custom assigned actas
  const availableActas = getAvailableActas(elements, globalConfig?.totalActas || 10);

  // Apply tab, date, status, search filtering
  const filteredElements = elements.filter(el => {
    if (filter.activeTab !== 'all' && el.type !== filter.activeTab) return false;

    if (filter.startDate && el.date < filter.startDate) return false;
    if (filter.endDate && el.date > filter.endDate) return false;

    if (filter.statusFilter !== 'all' && el.status !== filter.statusFilter) return false;
    if (filter.actaFilter && normalizeActa(el.acta) !== filter.actaFilter) return false;

    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase();
      const matchLabel = el.label.toLowerCase().includes(q);
      const matchPipes = el.pipes?.toLowerCase().includes(q) ?? false;
      const matchCables = el.cables?.toLowerCase().includes(q) ?? false;
      const matchNorm = el.camType?.toLowerCase().includes(q) ?? false;
      const matchActa = el.acta?.toLowerCase().includes(q) ?? false;
      const matchItem = el.itemCobro?.toLowerCase().includes(q) ?? false;
      const matchDesc = el.itemDescripcion?.toLowerCase().includes(q) ?? false;
      const matchObs = el.observations?.toLowerCase().includes(q) ?? false;
      if (!matchLabel && !matchPipes && !matchCables && !matchNorm && !matchActa && !matchItem && !matchDesc && !matchObs) return false;
    }

    return true;
  });

  const getStatusBadgeClass = (status: StatusType) => {
    if (status === 'Terminado') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === 'En proceso') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const countAll = elements.length;
  const countCameras = elements.filter(e => e.type === 'camera').length;
  const countTramos = elements.filter(e => e.type === 'line').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-sky-600" />
            <span>Bitácora de Inspección</span>
          </h2>
          <p className="text-xs text-slate-400">Listado de cámaras y tramos canalizados</p>
        </div>
        <div className="flex items-center gap-1.5">
          {elements.length > 0 && onDeleteAllElements && (
            <button
              onClick={onDeleteAllElements}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
              title="Borrar todos los tramos y cámaras de la bitácora y del plano"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Borrar Tramos y Cámaras</span>
            </button>
          )}
          <button
            onClick={onAddCamera}
            className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
          >
            <Plus className="w-3 h-3" />
            <span>Cámara</span>
          </button>
          <button
            onClick={onAddTramo}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
          >
            <Plus className="w-3 h-3" />
            <span>Tramo</span>
          </button>
        </div>
      </div>

      {/* Bitácora Tabs & Search */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs gap-1 no-print">
          <button
            onClick={() => onFilterChange({ ...filter, activeTab: 'all' })}
            className={`flex-1 py-1 px-2 rounded-md font-bold transition text-center ${
              filter.activeTab === 'all' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            Todos ({countAll})
          </button>
          <button
            onClick={() => onFilterChange({ ...filter, activeTab: 'camera' })}
            className={`flex-1 py-1 px-2 rounded-md font-bold transition text-center flex items-center justify-center gap-1 ${
              filter.activeTab === 'camera' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Cámaras ({countCameras})</span>
          </button>
          <button
            onClick={() => onFilterChange({ ...filter, activeTab: 'line' })}
            className={`flex-1 py-1 px-2 rounded-md font-bold transition text-center flex items-center justify-center gap-1 ${
              filter.activeTab === 'line' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-sky-600" />
            <span>Tramos ({countTramos})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar cámara, tramo, tubería, cable..."
              value={filter.searchQuery}
              onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-8 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
          <select
            value={filter.statusFilter}
            onChange={(e) => onFilterChange({ ...filter, statusFilter: e.target.value as any })}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700"
          >
            <option value="all">Estado: Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso">En proceso</option>
            <option value="Terminado">Terminado</option>
          </select>
          <select
            value={filter.actaFilter || 'all'}
            onChange={(e) => onFilterChange({ ...filter, actaFilter: e.target.value === 'all' ? undefined : e.target.value })}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700"
          >
            <option value="all">Acta: Todas</option>
            <option value="Sin Asignar">Sin Asignar</option>
            {availableActas.map(actaName => (
              <option key={actaName} value={actaName}>{actaName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto responsive-table max-h-[500px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <th className="py-2 px-3 min-w-[320px]">Elemento / Sector</th>
              <th className="py-2 px-2 text-center min-w-[140px]">Estado</th>
              <th className="py-2 px-2 text-center min-w-[130px]">ID Unico crono</th>
              <th className="py-2 px-2 text-center min-w-[130px]">Acta</th>
              <th className="py-2 px-2 text-center min-w-[160px]">Ítem Cobro</th>
              <th className="py-2 px-2 text-left min-w-[160px]">Observaciones</th>
              <th className="py-2 px-2 text-center min-w-[120px]">Fecha</th>
              <th className="py-2 px-2 text-center min-w-[100px]">T. Ejecución</th>
              <th className="py-2 px-1 text-center w-16 no-print">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredElements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                  <div className="flex flex-col items-center gap-1">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                    <span>No hay elementos registrados en la bitácora</span>
                    <span className="text-xs text-slate-400">Dibuja tramos o coloca cámaras en el plano</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredElements.map(el => {
                const areaBadge = getAreaNameForElement(el);

                return (
                  <tr key={el.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                    <td className="py-2 px-3" data-label="Elemento">
                      <div className="flex items-center justify-between gap-1">
                        <input
                          type="text"
                          value={el.label}
                          onChange={(e) => onUpdateElement({ ...el, label: e.target.value })}
                          className="font-extrabold text-slate-800 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none w-28"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {areaBadge}
                          </span>
                          {el.scheduleItemId && (
                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200" title="Código de Cronograma">
                              [{el.scheduleItemId}]
                            </span>
                          )}
                        </div>
                      </div>

                      {el.type === 'camera' ? (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-xs text-slate-500 font-semibold">Norma:</span>
                          <select
                            value={el.camType || 'SB850'}
                            onChange={(e) => onUpdateElement({ ...el, camType: e.target.value as CameraNorm })}
                            className="text-xs px-1.5 py-0.5 border border-slate-200 rounded font-mono bg-white"
                          >
                            <option value="SB858">SB858 (Comunicaciones)</option>
                            <option value="SB850">SB850 (BT)</option>
                            <option value="SB851">SB851 (MT)</option>
                            <option value="SB853">SB853 (MT)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="mt-1.5 space-y-1.5 bg-slate-50/80 p-1.5 rounded-lg border border-slate-200/80 text-xs">
                          {/* First row: Tubería & Cables */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="min-w-0">
                              <span className="text-xs text-slate-500 font-semibold block mb-0.5">Tubería</span>
                              <input
                                type="text"
                                placeholder="Ej: 3x4 pulg"
                                value={el.pipes || ''}
                                onChange={(e) => onUpdateElement({ ...el, pipes: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center justify-between mb-0.5 gap-1">
                                <span className="text-xs text-slate-500 font-semibold truncate">Cables</span>
                                <label className="text-[10px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300 font-bold flex items-center gap-1 cursor-pointer shrink-0 hover:bg-amber-100">
                                  <input
                                    type="checkbox"
                                    checked={el.onlyPipes || false}
                                    onChange={(e) => onUpdateElement({
                                      ...el,
                                      onlyPipes: e.target.checked,
                                      cables: e.target.checked ? 'N/A - Solo Tubería' : (el.cables === 'N/A - Solo Tubería' ? '' : el.cables)
                                    })}
                                    className="w-3 h-3 text-amber-600 rounded focus:ring-amber-500"
                                  />
                                  <span className="whitespace-nowrap">Solo Tubería</span>
                                </label>
                              </div>
                              <input
                                type="text"
                                placeholder="Ej: FO 24 FO"
                                disabled={el.onlyPipes}
                                value={el.onlyPipes ? 'N/A (Solo Tubería)' : (el.cables || '')}
                                onChange={(e) => onUpdateElement({ ...el, cables: e.target.value })}
                                className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          </div>

                          {/* Second row: Longitud Metros */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                            <span className="text-xs text-slate-500 font-semibold shrink-0">Metros de Tramo (m):</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onUpdateElement(adjustTramoMeters(el, -1, true))}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-xs font-bold transition flex items-center justify-center shrink-0"
                                title="Reducir 1m"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={el.meters || 0}
                                min={1}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  onUpdateElement(adjustTramoMeters(el, val, false));
                                }}
                                className="w-16 text-center py-0.5 px-1 bg-white border border-slate-300 rounded-md text-xs font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <button
                                type="button"
                                onClick={() => onUpdateElement(adjustTramoMeters(el, 1, true))}
                                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-md text-xs font-bold transition flex items-center justify-center shrink-0"
                                title="Aumentar 1m"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-slate-600 ml-0.5">m</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-2 text-center" data-label="Estado">
                      <select
                        value={el.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as StatusType;
                          let newPercent = el.progressPercent;
                          if (newStatus === 'En proceso' && (newPercent === undefined || newPercent === 0)) {
                            newPercent = 50;
                          } else if (newStatus === 'Terminado') {
                            newPercent = 100;
                          } else if (newStatus === 'Pendiente') {
                            newPercent = 0;
                          }
                          onUpdateElement({ ...el, status: newStatus, progressPercent: newPercent });
                        }}
                        className={`w-full px-2 py-1 text-sm font-bold rounded-lg cursor-pointer border ${getStatusBadgeClass(el.status)}`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Terminado">Terminado</option>
                      </select>

                      {el.status === 'En proceso' && (
                        <div className="mt-1 flex items-center justify-center gap-1 bg-amber-50/90 border border-amber-300 rounded px-1.5 py-0.5 shadow-xs">
                          <span className="text-xs font-extrabold text-amber-800 shrink-0">% Avance:</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={el.progressPercent !== undefined ? el.progressPercent : 50}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              onUpdateElement({ ...el, progressPercent: val });
                            }}
                            className="w-12 px-1 py-0.5 text-center text-xs font-black text-amber-900 bg-white border border-amber-400 rounded focus:ring-1 focus:ring-amber-500"
                            title="Ingresar porcentaje de avance de ejecución (0-100%)"
                          />
                          <span className="text-xs font-black text-amber-800">%</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-1 text-center" data-label="ID Unico crono">
                      <input
                        type="text"
                        placeholder="ID crono"
                        value={el.scheduleItemId || ''}
                        onChange={(e) => onUpdateElement({ ...el, scheduleItemId: e.target.value })}
                        className="w-full px-1.5 py-1 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded text-sm text-slate-700 font-mono text-center transition bg-slate-50 focus:bg-white"
                        title="ID Único del Cronograma"
                      />
                    </td>
                    <td className="py-2 px-1 text-center" data-label="Acta">
                      <select
                        value={normalizeActa(el.acta) === 'Sin Asignar' ? '' : normalizeActa(el.acta)}
                        onChange={(e) => onUpdateElement({ ...el, acta: e.target.value })}
                        className="w-full px-1.5 py-1 border border-emerald-300 rounded text-sm font-bold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/90 focus:bg-white focus:ring-1 focus:ring-emerald-500 text-center transition cursor-pointer"
                        title="Seleccionar Acta de cobro asignada"
                      >
                        <option value="">-- Sin Acta --</option>
                        {availableActas.map(actaName => (
                          <option key={actaName} value={actaName}>
                            {actaName}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2 px-1 text-center" data-label="Ítem Cobro">
                      <select
                        value={el.itemCobro || ''}
                        onChange={(e) => {
                          const selectedItem = e.target.value;
                          const contractItem = contractItems.find(c => c.item === selectedItem);
                          if (contractItem) {
                            onUpdateElement({ 
                              ...el, 
                              itemCobro: contractItem.item,
                              itemDescripcion: contractItem.description,
                              itemUnidad: contractItem.unit
                            });
                          } else {
                            onUpdateElement({ ...el, itemCobro: selectedItem });
                          }
                        }}
                        className="w-full px-1 py-1 border border-sky-300 rounded text-sm font-bold text-sky-900 bg-sky-50/70 hover:bg-sky-100/90 focus:bg-white focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
                        title="Ítem del acta/presupuesto"
                      >
                        <option value="">-- Sin Ítem --</option>
                        {contractItems.map((ci, idx) => (
                          <option key={`${ci.item}_${idx}`} value={ci.item}>
                            {ci.item} - {ci.description.slice(0, 30)}
                          </option>
                        ))}
                        {el.itemCobro && !contractItems.find(c => c.item === el.itemCobro) && (
                          <option value={el.itemCobro}>{el.itemCobro}</option>
                        )}
                      </select>
                    </td>

                    <td className="py-2 px-2 text-left" data-label="Observaciones">
                      <input
                        type="text"
                        placeholder="Sin observaciones..."
                        value={el.observations || ''}
                        onChange={(e) => onUpdateElement({ ...el, observations: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded text-sm text-slate-700 bg-slate-50/60 transition placeholder:text-slate-300 placeholder:italic"
                        title="Notas u observaciones de campo"
                      />
                    </td>

                    <td className="py-2 px-2 text-center" data-label="Fecha">
                      <input
                        type="date"
                        value={el.date}
                        onChange={(e) => onUpdateElement({ ...el, date: e.target.value })}
                        className="px-1 py-1 border border-slate-200 rounded text-sm text-slate-700"
                      />
                    </td>

                    <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600" data-label="T. Ejec.">
                      {el.startDate ? formatExecutionTime(el.startDate, el.endDate) : "-"}
                    </td>
                    <td className="py-2 px-1 text-center no-print" data-label="Acción">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onInspectElement(el)}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded flex items-center gap-0.5"
                          title="Tomar / Ver Fotos y Bitácora"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {el.photos && el.photos.length > 0 && (
                            <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1 rounded-full">
                              {el.photos.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => onInspectElement(el)}
                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                          title="Detalle Bitácora"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onLocateElement(el)}
                          className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                          title="Ubicar en plano"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteElement(el.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
