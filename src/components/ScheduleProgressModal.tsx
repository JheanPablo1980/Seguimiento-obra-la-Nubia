import React, { useState, useMemo, useEffect } from 'react';
import { ScheduleItem, InspectionElement, AreaSector, AuthUser } from '../types';
import { INITIAL_SCHEDULE_ITEMS, DEFAULT_CONTRACTUAL_ITEMS } from '../data/sampleData';
import { normalizeActa, getAvailableActas } from '../utils/actaUtils';
import { detectColumnMapping, applyMappingToRows, REQUIRED_FIELDS, HEADER_ALIASES } from '../utils/importUtils';
import { calcularAvancePorCronograma } from '../utils/cronogramaUtils';
import { 
  X, 
  CalendarCheck, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Plus, 
  Layers, 
  Ruler, 
  ShieldAlert,
  Link,
  Zap,
  BarChart3,
  Edit2,
  Trash2,
  ListFilter,
  Upload,
  FileSpreadsheet,
  Download,
  FileUp,
  Sparkles,
  RefreshCw,
  FileText,
  Check
} from 'lucide-react';

interface ScheduleProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleItems: ScheduleItem[];
  onUpdateScheduleItems: (items: ScheduleItem[]) => void;
  elements: InspectionElement[];
  onUpdateElement: (updated: InspectionElement) => void;
  areas: AreaSector[];
  currentUser: AuthUser | null;
  showToast: (msg: string) => void;
  initialTab?: 'matrix' | 'bySector' | 'byElement' | 'manage' | 'import';
}

export const ScheduleProgressModal: React.FC<ScheduleProgressModalProps> = ({
  isOpen,
  onClose,
  scheduleItems,
  onUpdateScheduleItems,
  elements,
  onUpdateElement,
  areas,
  currentUser,
  showToast,
  initialTab = 'matrix'
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'bySector' | 'byElement' | 'manage' | 'import'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form for adding / editing schedule item
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(100);
  const [unit, setUnit] = useState<'mts' | 'unidades' | 'tramos' | 'm²'>('mts');
  const [entrega1Target, setEntrega1Target] = useState(60);
  const [entrega1Label, setEntrega1Label] = useState('Entrega 1 - Últ. semana Jul 2026');
  const [entrega2Target, setEntrega2Target] = useState(40);
  const [entrega2Label, setEntrega2Label] = useState('Entrega 2 - Agosto 2026');
  const [finalDeadline, setFinalDeadline] = useState('01/08/2026');
  const [category, setCategory] = useState<'tuberia' | 'camara' | 'sector' | 'general'>('tuberia');

  // States for importing Schedule
  const [pastedCsvText, setPastedCsvText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parsedPreviewItems, setParsedPreviewItems] = useState<ScheduleItem[]>([]);
  const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string>, step: 'summary' | 'review' } | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Record<string, Record<string, string>>>({});
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cronogramaMappingTemplates');
      if (saved) setSavedTemplates(JSON.parse(saved));
    } catch(e) {}
  }, []);
  
  const saveMappingTemplate = () => {
    const name = window.prompt('Nombre de la plantilla de mapeo: (ej. Microsoft Project, Cronograma Contratista A)');
    if (name && importMapping) {
      const newTemplates = { ...savedTemplates, [name]: importMapping.mapping };
      setSavedTemplates(newTemplates);
      localStorage.setItem('cronogramaMappingTemplates', JSON.stringify(newTemplates));
      showToast('Plantilla de mapeo guardada');
    }
  };
  
  const loadMappingTemplate = (name: string) => {
    if (savedTemplates[name] && importMapping) {
      setImportMapping({ ...importMapping, mapping: savedTemplates[name] });
      showToast('Plantilla de mapeo cargada');
    }
  };

  const [dragActive, setDragActive] = useState(false);

  // Helper point in polygon for sector name detection
  const getAreaNameForElement = (el: InspectionElement): string => {
    const targetX = el.type === 'camera' ? el.x : (el.x + (el.x2 ?? el.x)) / 2;
    const targetY = el.type === 'camera' ? el.y : (el.y + (el.y2 ?? el.y)) / 2;

    for (const area of areas) {
      if (!area.points || area.points.length < 3) continue;
      let inside = false;
      for (let i = 0, j = area.points.length - 1; i < area.points.length; j = i++) {
        const xi = area.points[i].x, yi = area.points[i].y;
        const xj = area.points[j].x, yj = area.points[j].y;
        const intersect = ((yi > targetY) !== (yj > targetY)) &&
            (targetX < (xj - xi) * (targetY - yi) / (yj - yi + 0.00001) + xi);
        if (intersect) inside = !inside;
      }
      if (inside) return `${area.code ? `[${area.code}] ` : ''}${area.name}`;
    }
    return 'Sin Área Defectuosa';
  };

  // Auto-detect & calculate progress for each schedule item
  const progressMap = useMemo(() => {
    const avances = calcularAvancePorCronograma(elements);
    const map: Record<string, {
      executed: number;
      inProgress: number;
      pending: number;
      count: number;
      completionPercent: number;
      elements: InspectionElement[];
    }> = {};

    scheduleItems.forEach(item => {
      map[item.id] = { executed: 0, inProgress: 0, pending: 0, count: 0, completionPercent: 0, elements: [] };
    });

    elements.forEach(el => {
      // Find matching schedule item: either explicit scheduleItemId or auto-match
      let matchedItemId = el.scheduleItemId;

      if (!matchedItemId) {
        if (el.type === 'line') {
          const pipeDesc = (el.pipes || '').toLowerCase();
          if (pipeDesc.includes('4"') || pipeDesc.includes('4 pulgadas') || pipeDesc.includes('ø4') || pipeDesc.includes('200502')) {
            matchedItemId = '200502';
          } else if (pipeDesc.includes('6"') || pipeDesc.includes('6 pulgadas') || pipeDesc.includes('ø6') || pipeDesc.includes('200503')) {
            matchedItemId = '200503';
          }
        } else if (el.type === 'camera') {
          if (el.camType === 'SB858') matchedItemId = 'CAM-858';
          else matchedItemId = 'CAM-850';
        }
      }

      if (matchedItemId && map[matchedItemId]) {
        const value = el.type === 'line' ? (el.meters || 0) : 1;
        map[matchedItemId].count += 1;
        map[matchedItemId].elements.push(el);

        if (el.status === 'Terminado') {
          map[matchedItemId].executed += value;
        } else if (el.status === 'En proceso') {
          map[matchedItemId].inProgress += value;
        } else {
          map[matchedItemId].pending += value;
        }
      }
    });

    // Populate completionPercent
    Object.keys(map).forEach(key => {
      map[key].completionPercent = avances[key] || 0;
    });
    return map;
  }, [scheduleItems, elements]);

  // Overall totals calculation
  const totals = useMemo(() => {
    let totalTarget = 0;
    let totalExecuted = 0;
    let totalEntrega1 = 0;
    let totalEntrega2 = 0;

    scheduleItems.forEach(item => {
      totalTarget += item.targetQuantity;
      totalEntrega1 += item.entrega1Target;
      totalEntrega2 += item.entrega2Target;
      const prog = progressMap[item.id];
      if (prog) {
        totalExecuted += prog.executed;
      }
    });

    let sumPcts = 0;
    let countPcts = 0;
    scheduleItems.forEach(item => {
      if (progressMap[item.id] && progressMap[item.id].completionPercent !== undefined) {
        sumPcts += progressMap[item.id].completionPercent;
        countPcts++;
      }
    });
    const globalPct = countPcts > 0 ? (sumPcts / countPcts) : 0;
    const entrega1Pct = totalEntrega1 > 0 ? Math.min(100, (totalExecuted / totalEntrega1) * 100) : 0;

    return {
      totalTarget,
      totalExecuted,
      totalEntrega1,
      totalEntrega2,
      globalPct: Math.round(globalPct * 10) / 10,
      entrega1Pct: Math.round(entrega1Pct * 10) / 10
    };
  }, [scheduleItems, progressMap]);

  if (!isOpen) return null;

  // Auto-link all existing elements to schedule items based on specifications
  const handleAutoLinkAll = () => {
    let linkedCount = 0;
    elements.forEach(el => {
      let targetCode: string | undefined = undefined;
      if (el.type === 'line') {
        const pipes = (el.pipes || '').toLowerCase();
        if (pipes.includes('4') || pipes.includes('ø4')) targetCode = '200502';
        else if (pipes.includes('6') || pipes.includes('ø6')) targetCode = '200503';
      } else if (el.type === 'camera') {
        if (el.camType === 'SB858') targetCode = 'CAM-858';
        else targetCode = 'CAM-850';
      }

      if (targetCode && el.scheduleItemId !== targetCode) {
        onUpdateElement({ ...el, scheduleItemId: targetCode });
        linkedCount++;
      }
    });

    showToast(`Se vincularon automáticamente ${linkedCount} elementos al cronograma`);
  };

  const handleExportConsolidatedActasCSV = () => {
    const actasSorted = getAvailableActas(elements, 10);

    const headerParts = ['ITEM', 'DESCRIPCIÓN', 'UNID', 'CANTIDAD', ...actasSorted];
    const csvLines = [headerParts.join(';')];

    const normKey = (k?: string) => (k || '').trim().replace(',', '.');

    const itemActaTotals = new Map<string, Map<string, number>>();

    elements.forEach(el => {
      if (el.status !== 'Terminado') return;
      const rawItem = el.itemCobro ? el.itemCobro.trim() : '';
      if (!rawItem) return;
      const key = normKey(rawItem);
      const normActa = normalizeActa(el.acta);
      const acta = normActa === 'Sin Asignar' ? 'Acta 1' : normActa;

      if (!itemActaTotals.has(key)) {
        itemActaTotals.set(key, new Map());
      }
      const actMap = itemActaTotals.get(key)!;
      const currentVal = actMap.get(acta) || 0;
      const addVal = el.type === 'line' ? (el.meters || 0) : 1;
      actMap.set(acta, currentVal + addVal);
    });

    const itemsMap = new Map<string, { item: string; description: string; unit: string; budgetQuantity: number }>();

    DEFAULT_CONTRACTUAL_ITEMS.forEach(ci => {
      itemsMap.set(normKey(ci.item), {
        item: ci.item,
        description: ci.description,
        unit: ci.unit,
        budgetQuantity: ci.budgetQuantity
      });
    });

    elements.forEach(el => {
      if (!el.itemCobro) return;
      const key = normKey(el.itemCobro);
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          item: el.itemCobro,
          description: el.itemDescripcion || (el.type === 'camera' ? 'Cámara / Caja' : 'Canalización'),
          unit: el.itemUnidad || (el.type === 'line' ? 'ML' : 'UN'),
          budgetQuantity: 0
        });
      }
    });

    itemsMap.forEach((ci, key) => {
      const actMap = itemActaTotals.get(key);
      const budgetStr = ci.budgetQuantity > 0 ? ci.budgetQuantity.toString().replace('.', ',') : '';

      const actaValues = actasSorted.map(actaName => {
        if (!actMap || !actMap.has(actaName)) return '';
        const val = actMap.get(actaName) || 0;
        if (val === 0) return '';
        return val % 1 === 0 ? val.toString() : val.toFixed(2).replace('.', ',');
      });

      const row = [
        ci.item.replace('.', ','),
        `"${ci.description.replace(/"/g, '""')}"`,
        ci.unit,
        budgetStr,
        ...actaValues
      ];

      csvLines.push(row.join(';'));
    });

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Formato_Acta_Consolidado_por_Columnas.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('¡Archivo de salida consolidado por Actas generado con éxito!');
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) {
      alert('Por favor ingrese el código y la descripción del rubro');
      return;
    }

    const newItem: ScheduleItem = {
      id: editingItem ? editingItem.id : (code.trim().toUpperCase() || `ITEM-${Date.now()}`),
      code: code.trim(),
      description: description.trim(),
      targetQuantity: Number(targetQuantity) || 0,
      unit,
      entrega1Target: Number(entrega1Target) || 0,
      entrega1Label,
      entrega2Target: Number(entrega2Target) || 0,
      entrega2Label,
      finalDeadline,
      category
    };

    if (editingItem) {
      onUpdateScheduleItems(scheduleItems.map(i => i.id === editingItem.id ? newItem : i));
      showToast(`Rubro [${code}] actualizado correctamente`);
    } else {
      onUpdateScheduleItems([...scheduleItems, newItem]);
      showToast(`Rubro [${code}] agregado al cronograma`);
    }

    handleResetForm();
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setCode(item.code);
    setDescription(item.description);
    setTargetQuantity(item.targetQuantity);
    setUnit(item.unit);
    setEntrega1Target(item.entrega1Target);
    setEntrega1Label(item.entrega1Label || 'Entrega 1 - Últ. semana Jul 2026');
    setEntrega2Target(item.entrega2Target);
    setEntrega2Label(item.entrega2Label || 'Entrega 2 - Agosto 2026');
    setFinalDeadline(item.finalDeadline || '01/08/2026');
    setCategory(item.category || 'tuberia');
    setActiveTab('manage');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Deseas eliminar este rubro del cronograma?')) {
      onUpdateScheduleItems(scheduleItems.filter(i => i.id !== id));
      showToast('Rubro eliminado');
    }
  };

  const handleResetForm = () => {
    setEditingItem(null);
    setCode('');
    setDescription('');
    setTargetQuantity(100);
    setUnit('mts');
    setEntrega1Target(60);
    setEntrega2Target(40);
  };

  const startCsvMapping = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert('El archivo no tiene suficientes filas.');
      return;
    }

    const parseLine = (line: string) => line.includes('\t')
      ? line.split('\t').map(p => p.trim().replace(/^"|"$/g, ''))
      : line.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine).filter(r => r.length >= 2);
    
    const detectedMapping = detectColumnMapping(headers);
    setImportMapping({ headers, rows, mapping: detectedMapping, step: 'summary' });
  };

  const handleProcessPastedText = () => {
    if (!pastedCsvText.trim()) {
      alert('Por favor pega texto en formato CSV o tabla de Excel');
      return;
    }
    startCsvMapping(pastedCsvText);
  };

  const handleApplyMapping = () => {
    if (!importMapping) return;
    
    // Check required fields
    const mappedValues = Object.values(importMapping.mapping);
    if (!mappedValues.includes('idUnicoCrono') || !mappedValues.includes('task')) {
      alert('ERROR:\nNo se encontró un identificador único de actividad (ID_UNICO_CRONO) o Actividad (Task).\nPor favor mapéalos manualmente.');
      return;
    }

    const mappedRows = applyMappingToRows(importMapping.headers, importMapping.rows, importMapping.mapping);
    
    const items: ScheduleItem[] = mappedRows.map((r: any, i) => {
      // Default extraction to maintain backward compatibility for old tools if fields are missing
      const idUnico = r.idUnicoCrono || `RUB-${i + 1}`;
      const description = r.task || `Rubro ${i + 1}`;
      return {
        id: idUnico,
        code: idUnico,
        description: description,
        targetQuantity: 100, // Dummy defaults if they didn't map them
        unit: 'mts',
        entrega1Target: 60,
        entrega2Target: 40,
        duracion: r.duracion,
        start: r.start,
        finish: r.finish,
        porcentajeCompletado: r.porcentajeCompletado,
        comienzoLineaBase: r.comienzoLineaBase,
        finLineaBase: r.finLineaBase,
        duracionLineaBase: r.duracionLineaBase,
        rawExtras: r.rawExtras
      } as ScheduleItem;
    });

    setParsedPreviewItems(items);
    setImportMapping(null);
    showToast(`CRONOGRAMA DETECTADO: ¡Se extrajeron ${items.length} actividades correctamente!`);
  };

  const handleApplyImport = () => {
    if (parsedPreviewItems.length === 0) return;

    if (importMode === 'replace') {
      onUpdateScheduleItems(parsedPreviewItems);
      showToast(`Cronograma reemplazado exitosamente con ${parsedPreviewItems.length} rubros`);
    } else {
      // Merge by code/id
      const existingMap = new Map(scheduleItems.map(i => [i.code, i]));
      parsedPreviewItems.forEach(item => {
        existingMap.set(item.code, item);
      });
      const merged = Array.from(existingMap.values());
      onUpdateScheduleItems(merged);
      showToast(`Cronograma actualizado: total ${merged.length} rubros`);
    }

    setParsedPreviewItems([]);
    setPastedCsvText('');
    setActiveTab('matrix');
  };

  const handleFileUpload = (file: File) => {

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const items = JSON.parse(content);
          setParsedPreviewItems(items);
          showToast(`Se procesaron ${items.length} rubros desde JSON`);
        } catch (err) {
          alert('Error al leer JSON: ' + (err as Error).message);
        }
      } else {
        startCsvMapping(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDefaultTemplate = () => {
    if (window.confirm('¿Cargar plantilla predeterminada de cronograma para obras de telecomunicaciones y energía?')) {
      onUpdateScheduleItems(INITIAL_SCHEDULE_ITEMS);
      showToast('¡Plantilla predeterminada de cronograma cargada con éxito!');
      setActiveTab('matrix');
    }
  };

  const handleDownloadTemplateCsv = () => {
    const csvContent = 'Codigo,Descripcion,MetaTotal,Unidad,Entrega1,Entrega2,FechaLimite,Categoria\n' +
      '200502,"Tubo PVC Ø4\", 6mts, Conduit",367,mts,250,117,01/08/2026,tuberia\n' +
      '200503,"Tubo PVC Ø6\", 6mts, Conduit",495,mts,350,145,01/08/2026,tuberia\n' +
      'CAM-850,"Cámaras SB850 (Baja Tensión)",15,unidades,10,5,01/08/2026,camara\n' +
      'CAM-858,"Cámaras Telecom SB858",10,unidades,7,3,01/08/2026,camara\n' +
      'FO-24,"Fibra Óptica Subterránea 24 FO",850,mts,500,350,15/08/2026,general\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Cronograma_Obra.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredItems = scheduleItems.filter(i => 
    i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-[96vw] max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Cronograma de Obra y Control de Avance</span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                  Vinculación ID
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Ligar IDs de tramos, cámaras y sectores con los rubros del cronograma de entregas (Julio - Agosto 2026)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global KPI Summary Bar */}
        <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Pendiente / Meta</span>
            <span className="text-lg font-black text-amber-400 font-mono mt-0.5">{totals.totalTarget.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">unidades/mts</span></span>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Avance Ejecutado Real</span>
            <span className="text-lg font-black text-emerald-400 font-mono mt-0.5">{totals.totalExecuted.toLocaleString()} <span className="text-[10px] text-emerald-500/80 font-sans">({totals.globalPct}%)</span></span>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Meta Entrega 1 (Jul 2026)</span>
            <span className="text-lg font-black text-sky-400 font-mono mt-0.5">{totals.totalEntrega1.toLocaleString()} <span className="text-[10px] text-sky-400/80 font-sans">({totals.entrega1Pct}%)</span></span>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Meta Entrega 2 (Ago 2026)</span>
            <span className="text-lg font-black text-indigo-400 font-mono mt-0.5">{totals.totalEntrega2.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">unidades</span></span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Matriz del Cronograma</span>
            </button>
            <button
              onClick={() => setActiveTab('bySector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'bySector'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Avance por Sector / Zona</span>
            </button>
            <button
              onClick={() => setActiveTab('byElement')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'byElement'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Detalle Tramos / Cámaras</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manage' || activeTab === 'import'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gestión de Rubros</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            
            <button
              onClick={() => setActiveTab('import')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
              title="Cargar cronograma desde Excel/CSV"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-200" />
              <span>📋 Cargar Cronograma (CSV)</span>
            </button>
            <button
              onClick={handleExportConsolidatedActasCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
              title="Descargar el archivo de salida en formato anexo con cantidades divididas en columnas por Acta (ACTA 1, ACTA 2, ACTA 3...)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span>📊 Exportar Output por Actas</span>
            </button>

            <button
              onClick={handleAutoLinkAll}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              title="Auto-vincular tramos y cámaras según diámetro de tubería o tipo"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Vincular por ID/Norma</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: SCHEDULE MATRIX TABLE */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar código o descripción (Ej. 200502)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Mostrando <strong className="text-white">{filteredItems.length}</strong> rubros del cronograma
                </span>
              </div>

              {/* Main Schedule Matrix Table (Format requested by user) */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-md bg-slate-950/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                      <th className="p-3 border-r border-slate-800">Código</th>
                      <th className="p-3 border-r border-slate-800 min-w-[200px]">Descripción</th>
                      <th className="p-3 border-r border-slate-800 text-right">Pendiente Total (Meta)</th>
                      <th className="p-3 border-r border-slate-800 text-center bg-sky-950/40 text-sky-200">Entrega 1 - Últ. semana Jul 2026</th>
                      <th className="p-3 border-r border-slate-800 text-center bg-indigo-950/40 text-indigo-200">Entrega 2 - Agosto 2026</th>
                      <th className="p-3 border-r border-slate-800 text-center">Fecha Límite</th>
                      <th className="p-3 border-r border-slate-800 text-right bg-emerald-950/40 text-emerald-200">Avance Real Ejecutado</th>
                      <th className="p-3 text-center min-w-[120px]">Estado / Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredItems.map(item => {
                      const prog = progressMap[item.id] || { executed: 0, inProgress: 0, pending: 0, count: 0, completionPercent: 0 };
                      const pctGlobal = Math.round((prog.completionPercent || 0) * 100) / 100;
                      const pctE1 = item.entrega1Target > 0 ? Math.round((prog.executed / item.entrega1Target) * 100) : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/50 transition">
                          <td className="p-3 font-mono font-bold text-amber-300 border-r border-slate-800/80">
                            {item.code}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 font-medium text-slate-200">
                            {item.description}
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {prog.count} elemento(s) de bitácora vinculados
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-800/80 text-right font-mono font-bold text-white">
                            {item.targetQuantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                          </td>
                          <td className="p-3 border-r border-slate-800/80 text-center font-mono font-medium bg-sky-950/20 text-sky-300">
                            {item.entrega1Target} <span className="text-[10px] text-slate-400">({item.targetQuantity > 0 ? Math.round((item.entrega1Target / item.targetQuantity) * 100) : 0}%)</span>
                          </td>
                          <td className="p-3 border-r border-slate-800/80 text-center font-mono font-medium bg-indigo-950/20 text-indigo-300">
                            {item.entrega2Target} <span className="text-[10px] text-slate-400">({item.targetQuantity > 0 ? Math.round((item.entrega2Target / item.targetQuantity) * 100) : 0}%)</span>
                          </td>
                          <td className="p-3 border-r border-slate-800/80 text-center text-slate-300 font-mono text-[11px]">
                            {item.finalDeadline || '01/08/2026'}
                          </td>
                          <td className="p-3 border-r border-slate-800/80 text-right font-mono font-bold text-emerald-400 bg-emerald-950/20">
                            {prog.executed} {item.unit} <span className="block text-[10px] font-sans font-semibold text-emerald-300">({pctGlobal}%)</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                pctGlobal >= 100
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : pctE1 >= 100
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              }`}>
                                {pctGlobal >= 100 ? 'Cumplido Total' : pctE1 >= 100 ? 'Entrega 1 OK' : 'En Proceso'}
                              </span>
                              {/* Small Progress Bar */}
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${pctGlobal >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                  style={{ width: `${Math.min(100, pctGlobal)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 border-t-2 border-slate-700 font-bold text-slate-200">
                      <td colSpan={2} className="p-3 border-r border-slate-800 text-right uppercase text-[11px] tracking-wider">
                        Total Unidades / Metros
                      </td>
                      <td className="p-3 border-r border-slate-800 text-right font-mono text-amber-300 text-sm">
                        {totals.totalTarget}
                      </td>
                      <td className="p-3 border-r border-slate-800 text-center font-mono text-sky-300 text-sm">
                        {totals.totalEntrega1}
                      </td>
                      <td className="p-3 border-r border-slate-800 text-center font-mono text-indigo-300 text-sm">
                        {totals.totalEntrega2}
                      </td>
                      <td className="p-3 border-r border-slate-800"></td>
                      <td className="p-3 border-r border-slate-800 text-right font-mono text-emerald-400 text-sm">
                        {totals.totalExecuted} ({totals.globalPct}%)
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESS BY SECTOR / ZONA */}
          {activeTab === 'bySector' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Avance de Obra Agrupado por Sector o Zona de Plano</span>
                </h3>
                <span className="text-xs text-slate-400">{areas.length} sectores demarcados</span>
              </div>

              {areas.length === 0 ? (
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
                  No hay sectores demarcados en el plano todavía. Utiliza la herramienta "Polígono de Sector" en el canvas para delimitar áreas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {areas.map(area => {
                    // Find elements inside or assigned to this sector
                    const sectorElements = elements.filter(el => getAreaNameForElement(el).includes(area.name) || getAreaNameForElement(el).includes(area.code));
                    const totalMeters = sectorElements.reduce((sum, el) => sum + (el.type === 'line' ? (el.meters || 0) : 0), 0);
                    const executedMeters = sectorElements.reduce((sum, el) => sum + (el.type === 'line' && el.status === 'Terminado' ? (el.meters || 0) : 0), 0);
                    const totalCameras = sectorElements.filter(el => el.type === 'camera').length;
                    const executedCameras = sectorElements.filter(el => el.type === 'camera' && el.status === 'Terminado').length;
                    
                    const pctMeters = totalMeters > 0 ? Math.round((executedMeters / totalMeters) * 100) : 0;

                    return (
                      <div key={area.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full border shrink-0"
                              style={{ backgroundColor: area.color?.fill || '#a855f7', borderColor: area.color?.stroke || '#7e22ce' }}
                            />
                            <div>
                              <h4 className="font-bold text-xs text-white">
                                {area.code ? `[${area.code}] ` : ''}{area.name}
                              </h4>
                              <span className="text-[10px] text-slate-400">Área estimada: {area.calculatedAreaM2 || 0} m²</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                            {pctMeters}% Avance
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Tuberías y Canalizaciones</span>
                            <span className="font-mono font-bold text-emerald-400">{executedMeters}m / {totalMeters}m</span>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">Cámaras e Inspecciones</span>
                            <span className="font-mono font-bold text-sky-400">{executedCameras} / {totalCameras} und</span>
                          </div>
                        </div>

                        {/* Visual Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Progreso Físico del Sector:</span>
                            <span className="font-bold text-white">{pctMeters}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-500 h-full transition-all" style={{ width: `${pctMeters}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ELEMENT BY ELEMENT DETAIL AND SCHEDULING LINK */}
          {activeTab === 'byElement' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-sky-400" />
                  <span>Asignación Individual de Rubro de Cronograma a Tramos y Cámaras</span>
                </h3>
                <span className="text-xs text-slate-400">{elements.length} elementos en bitácora</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
                      <th className="p-2.5">Etiqueta ID</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Especificación Tubería / Cámara</th>
                      <th className="p-2.5">Longitud / Medida</th>
                      <th className="p-2.5">Sector</th>
                      <th className="p-2.5">Estado</th>
                      <th className="p-2.5 min-w-[200px]">Código Cronograma Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {elements.map(el => (
                      <tr key={el.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-bold text-sky-300 font-mono">
                          {el.label}
                        </td>
                        <td className="p-2.5 capitalize text-slate-300">
                          {el.type === 'camera' ? 'Cámara' : 'Tramo'}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-amber-300">
                          {el.type === 'line' ? (el.pipes || 'Sin especif.') : (el.camType || 'SB850')}
                        </td>
                        <td className="p-2.5 font-mono text-slate-200">
                          {el.type === 'line' ? `${el.meters || 0}m` : '1 unidad'}
                        </td>
                        <td className="p-2.5 text-slate-400 text-[11px]">
                          {getAreaNameForElement(el)}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            el.status === 'Terminado' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            el.status === 'En proceso' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {el.status}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={el.scheduleItemId || ''}
                            onChange={(e) => {
                              onUpdateElement({ ...el, scheduleItemId: e.target.value || undefined });
                              showToast(`Elemento ${el.label} vinculado a ${e.target.value || 'Sin código'}`);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Sin Vincular --</option>
                            {scheduleItems.map(item => (
                              <option key={item.id} value={item.id}>
                                [{item.code}] {item.description}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MANAGE & EDIT SCHEDULE ITEMS */}
          {activeTab === 'manage' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Form to Add / Edit */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>{editingItem ? 'Editar Rubro' : 'Nuevo Rubro de Cronograma'}</span>
                  {editingItem && (
                    <button onClick={handleResetForm} className="text-[10px] text-amber-400 hover:underline">
                      Cancelar edición
                    </button>
                  )}
                </h3>

                <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Código del Rubro (Ej. 200502):</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Ej. 200502"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Descripción de la Tubería/Cámara/Actividad:</label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder='Ej. Tubo PVC Ø4", 6mts, Conduit'
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Pendiente Total (Meta):</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={targetQuantity}
                        onChange={(e) => setTargetQuantity(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-300 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Unidad de Medida:</label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                      >
                        <option value="mts">Metros (mts)</option>
                        <option value="unidades">Unidades (und)</option>
                        <option value="tramos">Tramos</option>
                        <option value="m²">Superficie (m²)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Metas por Entrega Programada</span>
                    
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Entrega 1 (Julio 2026):</label>
                      <input
                        type="number"
                        min="0"
                        value={entrega1Target}
                        onChange={(e) => setEntrega1Target(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-sky-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Entrega 2 (Agosto 2026):</label>
                      <input
                        type="number"
                        min="0"
                        value={entrega2Target}
                        onChange={(e) => setEntrega2Target(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Fecha Límite Final:</label>
                      <input
                        type="text"
                        value={finalDeadline}
                        onChange={(e) => setFinalDeadline(e.target.value)}
                        placeholder="01/08/2026"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingItem ? 'Guardar Cambios' : 'Agregar Rubro al Cronograma'}</span>
                  </button>
                </form>
              </div>

              {/* List of existing Schedule Items */}
              <div className="lg:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Listado de Rubros Registrados ({scheduleItems.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('import')}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3 text-amber-400" />
                    <span>Importar Excel / CSV</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {scheduleItems.map(item => (
                    <div key={item.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            {item.code}
                          </span>
                          <span className="font-bold text-xs text-white">{item.description}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Meta Total: <strong className="text-emerald-400 font-mono">{item.targetQuantity} {item.unit}</strong> | Entrega 1: <span className="text-sky-300">{item.entrega1Target}</span> | Entrega 2: <span className="text-indigo-300">{item.entrega2Target}</span> | Límite: {item.finalDeadline}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Editar rubro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                          title="Eliminar rubro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: IMPORT / LOAD CRONOGRAMA */}
          {activeTab === 'import' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Quick Template & Download Bar */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Opciones de Carga Rápida de Cronograma</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Carga la plantilla predeterminada de obra o descarga el formato Excel/CSV para llenar sin conexión.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadTemplateCsv}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Descargar Plantilla CSV</span>
                  </button>

                  <button
                    onClick={handleLoadDefaultTemplate}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-950" />
                    <span>Cargar Plantilla Predeterminada de Obra</span>
                  </button>
                </div>
              </div>

              {/* Grid 2 Columns: File Dropzone & Pasted CSV Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Column 1: File Dropzone */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Subir Archivo de Cronograma (.CSV, .XLSX, .JSON)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Arrastra tu archivo con la lista de rubros, cantidades metas, entregas y fecha límite.
                    </p>

                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-950/40'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <FileUp className="w-8 h-8 text-indigo-400 animate-bounce" />
                      <div className="text-center">
                        <span className="text-xs font-bold text-white block">Haz clic para seleccionar o arrastra tu archivo aquí</span>
                        <span className="text-[10px] text-slate-400">Archivos soportados: .csv, .xlsx, .json, .txt</span>
                      </div>
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls, .json, .txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300 block">Formato de Columnas en CSV:</span>
                    <p className="font-mono text-[10px] text-indigo-300">Codigo, Descripcion, MetaTotal, Unidad, Entrega1, Entrega2, FechaLimite, Categoria</p>
                  </div>
                </div>

                {/* Column 2: Copiar y Pegar Tabla de Excel */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>Copiar y Pegar desde Excel o Tabla</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Copia filas directamente desde Excel, Google Sheets o un bloc de notas y pégalas aquí.
                    </p>

                    <textarea
                      rows={5}
                      value={pastedCsvText}
                      onChange={(e) => setPastedCsvText(e.target.value)}
                      placeholder={'Ejemplo:\n200502, Tubo PVC 4", 367, mts, 250, 117, 01/08/2026, tuberia\n200503, Tubo PVC 6", 495, mts, 350, 145, 01/08/2026, tuberia'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    onClick={handleProcessPastedText}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Procesar y Extraer Rubros Pegados</span>
                  </button>
                </div>

              </div>

                            {/* Mapping UI */}
              {importMapping && (
                <div className="p-4 bg-slate-950 rounded-xl border border-sky-500/40 space-y-4 animate-in fade-in">
                  
                  {importMapping.step === 'summary' ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-sky-400 uppercase">CRONOGRAMA DETECTADO</h4>
                      </div>
                      <div className="text-slate-200 text-xs space-y-1">
                        <p className="font-bold text-emerald-400">✓ {importMapping.rows.length} actividades encontradas</p>
                        
                        {Object.values(importMapping.mapping).includes('idUnicoCrono') ? <p>✓ ID_UNICO_CRONO identificado</p> : <p className="text-red-400">✗ ID_UNICO_CRONO NO identificado</p>}
                        {Object.values(importMapping.mapping).includes('task') ? <p>✓ Actividad identificada</p> : <p className="text-red-400">✗ Actividad NO identificada</p>}
                        {Object.values(importMapping.mapping).includes('duracion') && <p>✓ Duración identificada</p>}
                        {Object.values(importMapping.mapping).includes('start') && <p>✓ Inicio identificado</p>}
                        {Object.values(importMapping.mapping).includes('finish') && <p>✓ Fin identificado</p>}
                        {Object.values(importMapping.mapping).includes('porcentajeCompletado') && <p>✓ Porcentaje completado identificado</p>}
                        {Object.values(importMapping.mapping).includes('comienzoLineaBase') && <p>✓ Línea base identificada</p>}
                        
                        <p className="mt-3 text-slate-400">
                          Idioma detectado: {importMapping.headers.some(h => h.toLowerCase().includes('task') || h.toLowerCase().includes('finish')) ? 'Inglés / Mixto' : 'Español'}
                        </p>
                        <p className="text-slate-400">
                          Columnas adicionales: {importMapping.headers.length - Object.keys(importMapping.mapping).length}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => setImportMapping(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                        >
                          Cancelar
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setImportMapping({...importMapping, step: 'review'})}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                          >
                            [ REVISAR MAPEO ]
                          </button>
                          <button
                            onClick={handleApplyMapping}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            [ IMPORTAR ]
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-sky-400">MAPEO DE COLUMNAS (CRONOGRAMA DETECTADO)</h4>
                      <p className="text-[11px] text-slate-400">Revisa y ajusta la relación entre los encabezados del archivo y los campos del sistema.</p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">✓ {importMapping.rows.length} actividades encontradas</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <th className="p-2 font-bold uppercase">Encabezado encontrado</th>
                          <th className="p-2 font-bold uppercase">Campo del sistema</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importMapping.headers.map((header, idx) => {
                          const mappedTo = importMapping.mapping[idx.toString()];
                          const isRequired = mappedTo === 'idUnicoCrono' || mappedTo === 'task';
                          return (
                            <tr key={idx} className="border-b border-slate-800 hover:bg-slate-900/50">
                              <td className="p-2 font-mono text-slate-300">
                                {header || `(Columna ${idx + 1})`}
                              </td>
                              <td className="p-2">
                                <select
                                  value={mappedTo || 'ignore'}
                                  onChange={(e) => {
                                    setImportMapping({
                                      ...importMapping,
                                      mapping: { ...importMapping.mapping, [idx.toString()]: e.target.value }
                                    });
                                  }}
                                  className={`w-full bg-slate-900 border rounded-lg px-2 py-1 text-xs ${isRequired ? 'border-amber-500/50 text-amber-300 font-bold' : 'border-slate-700 text-slate-200'}`}
                                >
                                  <option value="ignore">-- Ignorar (Columna Adicional) --</option>
                                  <option value="idUnicoCrono">ID_UNICO_CRONO ✓</option>
                                  <option value="task">Task / Actividad ✓</option>
                                  <option value="duracion">Duración ✓</option>
                                  <option value="start">Start / Inicio ✓</option>
                                  <option value="finish">Finish / Fin ✓</option>
                                  <option value="porcentajeCompletado">% completado ✓</option>
                                  <option value="comienzoLineaBase">Línea base inicio ✓</option>
                                  <option value="finLineaBase">Línea base fin ✓</option>
                                  <option value="duracionLineaBase">Línea base duración ✓</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportMapping(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveMappingTemplate}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition"
                        title="Guardar plantilla de mapeo"
                      >
                        Guardar Plantilla
                      </button>
                      {Object.keys(savedTemplates).length > 0 && (
                        <select 
                          onChange={(e) => {
                            if (e.target.value) loadMappingTemplate(e.target.value);
                            e.target.value = '';
                          }}
                          className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 border border-slate-700"
                        >
                          <option value="">Cargar Plantilla...</option>
                          {Object.keys(savedTemplates).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <button
                      onClick={handleApplyMapping}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      REVISAR MAPEO E IMPORTAR
                    </button>
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* Parsed Items Preview & Import Options */}
              {parsedPreviewItems.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Vista Previa de Rubros Extraídos ({parsedPreviewItems.length})</h4>
                        <p className="text-[11px] text-slate-400">Verifica los datos antes de aplicarlos a tu cronograma activo</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 text-[11px]">Modo de carga:</span>
                        <select
                          value={importMode}
                          onChange={(e) => setImportMode(e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold"
                        >
                          <option value="merge">Combinar con Cronograma Existente</option>
                          <option value="replace">Reemplazar Todo el Cronograma</option>
                        </select>
                      </div>

                      <button
                        onClick={handleApplyImport}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirmar y Guardar Cronograma</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto max-h-56 rounded-lg border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-2 border-r border-slate-800">ID_UNICO_CRONO</th>
                          <th className="p-2 border-r border-slate-800">Task</th>
                          <th className="p-2 text-center border-r border-slate-800">Inicio</th>
                          <th className="p-2 text-center border-r border-slate-800">Fin</th>
                          <th className="p-2 text-center border-r border-slate-800">Duración</th>
                          <th className="p-2 text-center border-r border-slate-800">% Completado</th>
                          <th className="p-2 text-center">Límite (Legacy)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                        {parsedPreviewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60">
                            <td className="p-2 font-bold text-amber-300">{item.code}</td>
                            <td className="p-2 text-white font-sans">{item.description}</td>
                            <td className="p-2 text-center text-sky-300">{item.start || '-'}</td>
                            <td className="p-2 text-center text-indigo-300">{item.finish || '-'}</td>
                            <td className="p-2 text-center text-emerald-400 font-bold">{item.duracion || '-'}</td>
                            <td className="p-2 text-center text-amber-400 font-bold">{item.porcentajeCompletado !== undefined ? `${item.porcentajeCompletado}%` : '-'}</td>
                            <td className="p-2 text-center text-slate-400 text-[10px]">{item.finalDeadline || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Cronograma sincronizado con bitácora física de obra</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
