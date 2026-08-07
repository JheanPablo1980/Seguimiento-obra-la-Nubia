import React, { useState, useRef, useEffect } from 'react';
import { InspectionElement, ProjectMeta, ContractualItem, GlobalConfig } from '../types';
import { DEFAULT_CONTRACTUAL_ITEMS } from '../data/sampleData';
import { normalizeActa, getAvailableActas } from '../utils/actaUtils';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Camera, 
  Map as MapIcon, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Edit2, 
  Trash2,
  Upload,
  FileSpreadsheet,
  FileUp,
  Sparkles,
  Check,
  FolderPlus,
  ListPlus,
  RefreshCw
} from 'lucide-react';

interface MemoriaCalculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: InspectionElement[];
  projectMeta: ProjectMeta;
  blueprintImg: HTMLImageElement | null;
  onUpdateElement: (updated: InspectionElement) => void;
  onUpdateProjectMeta?: (meta: ProjectMeta) => void;
  showToast?: (msg: string) => void;
  initialShowImport?: boolean;
  globalConfig?: GlobalConfig;
}

interface ItemGroup {
  itemNo: string;
  description: string;
  unit: string;
  budgetQty: number;
  executedQty: number;
  elementsList: InspectionElement[];
}

export const MemoriaCalculoModal: React.FC<MemoriaCalculoModalProps> = ({
  isOpen,
  onClose,
  elements,
  projectMeta,
  blueprintImg,
  onUpdateElement,
  showToast,
  initialShowImport = false,
  globalConfig
}) => {
  // State for contract items budget catalog
  const [contractItems, setContractItems] = useState<ContractualItem[]>(() => {
    try {
      const saved = localStorage.getItem('obra_contract_items_v1');
      return saved ? JSON.parse(saved) : DEFAULT_CONTRACTUAL_ITEMS;
    } catch {
      return DEFAULT_CONTRACTUAL_ITEMS;
    }
  });

  // State for current selected Acta filter
  const [selectedActa, setSelectedActa] = useState<string>('Acta 1');
  
  // State for current selected Item or 'all'
  const [selectedItemNo, setSelectedItemNo] = useState<string>('all');

  // Custom observation state per item/acta memory sheet
  const [sheetNotes, setSheetNotes] = useState<Record<string, string>>({});

  // States for Loading / Importing Actas Modal
  const [showImportActaModal, setShowImportActaModal] = useState(false);
  const [actaImportTab, setActaImportTab] = useState<'upload' | 'batch' | 'catalog'>('upload');
  const [pastedActaCsv, setPastedActaCsv] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Batch assignment state
  const [batchActaName, setBatchActaName] = useState('Acta 1');
  const [batchTargetFilter, setBatchTargetFilter] = useState<'finished' | 'all' | 'unassigned'>('finished');
  const [batchItemCobro, setBatchItemCobro] = useState('3.63');

  useEffect(() => {
    if (isOpen && initialShowImport) {
      setShowImportActaModal(true);
    }
  }, [isOpen, initialShowImport]);

  if (!isOpen) return null;

  // Get list of unique normalized actas present in elements plus defaults
  const availableActas = getAvailableActas(elements, globalConfig?.totalActas || 10);

  // Get elements filtered by current Acta
  const actaElements = elements.filter(e => {
    if (selectedActa === 'all') return true;
    return normalizeActa(e.acta) === selectedActa;
  });

  // Helper to normalize item code for matching (e.g. "3.59" vs "3,59" vs " 3.59 ")
  const normItemKey = (k?: string) => (k || '').trim().replace(',', '.').toLowerCase();

  // Group elements by Item
  const itemsMap = new Map<string, ItemGroup>();

  // Initialize with contract items list
  contractItems.forEach(ci => {
    const key = normItemKey(ci.item);
    itemsMap.set(key, {
      itemNo: ci.item,
      description: ci.description,
      unit: ci.unit,
      budgetQty: ci.budgetQuantity,
      executedQty: 0,
      elementsList: []
    });
  });

  // Fill with elements data
  actaElements.forEach(el => {
    const rawItem = el.itemCobro && el.itemCobro.trim() ? el.itemCobro.trim() : 'Sin Ítem';
    const itemKey = normItemKey(rawItem);

    if (!itemsMap.has(itemKey)) {
      itemsMap.set(itemKey, {
        itemNo: rawItem,
        description: el.itemDescripcion || (el.type === 'camera' ? 'Cámara de inspección / caja' : 'Tramo de canalización'),
        unit: el.itemUnidad || (el.type === 'line' ? 'M' : 'UN'),
        budgetQty: 0,
        executedQty: 0,
        elementsList: []
      });
    }

    const group = itemsMap.get(itemKey)!;
    group.elementsList.push(el);

    // Calculate executed quantity
    if (el.type === 'line') {
      const m = el.meters || 0;
      if (el.status === 'Terminado' || el.acta) {
        group.executedQty += m > 0 ? m : 1;
      }
    } else {
      if (el.status === 'Terminado' || el.acta) {
        group.executedQty += 1;
      }
    }
  });

  // Display item groups that have elements assigned to the current Acta or have executed quantity
  const allItemsList: ItemGroup[] = (Array.from(itemsMap.values()) as ItemGroup[]).filter(g => g.elementsList.length > 0 || g.executedQty > 0);

  // Filter items according to selectedItemNo dropdown
  const displayedItems = selectedItemNo === 'all'
    ? allItemsList
    : allItemsList.filter(g => g.itemNo === selectedItemNo);

  const handlePrint = () => {
    window.print();
  };

  const handleExportConsolidatedActasCSV = () => {
    // Collect all actas present in elements or default list
    const actasSorted = getAvailableActas(elements, globalConfig?.totalActas || 10);

    // Semicolon delimited header matching the attached format:
    // ITEM;DESCRIPCIÓN;UNID;CANTIDAD;ACTA 1;ACTA 2;ACTA 3...
    const headerParts = ['ITEM', 'DESCRIPCIÓN', 'UNID', 'CANTIDAD', ...actasSorted];
    const csvLines = [headerParts.join(';')];

    // Helper to normalize item code for matching (e.g. "3.62" or "3,62")
    const normKey = (k?: string) => (k || '').trim().replace(',', '.');

    // Build map itemKey -> Map<actaName, totalExecutedQty>
    const itemActaTotals = new Map<string, Map<string, number>>();

    elements.forEach(el => {
      if (el.status !== 'Terminado') return; // only finished/executed elements
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

    // Build ordered items list from contractItems + elements
    const itemsMap = new Map<string, { item: string; description: string; unit: string; budgetQuantity: number }>();

    contractItems.forEach(ci => {
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

    // Produce CSV rows matching the exact requested format: ITEM;DESCRIPCIÓN;UNID;CANTIDAD;ACTA1;ACTA 2;ACTA 3...
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

    const csvContent = '\uFEFF' + csvLines.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Formato_Acta_Consolidado_por_Columnas.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (showToast) showToast('¡Archivo de salida por Actas exportado exitosamente!');
  };

  // Helper to parse a single CSV row, respecting quotes and auto-detecting delimiters
  const parseCsvRow = (row: string, delimiter?: string): string[] => {
    let delim = delimiter;
    if (!delim) {
      const semicolons = (row.match(/;/g) || []).length;
      const commas = (row.match(/,/g) || []).length;
      const tabs = (row.match(/\t/g) || []).length;

      if (tabs > semicolons && tabs > commas) delim = '\t';
      else if (semicolons >= commas) delim = ';';
      else delim = ',';
    }

    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Helper to match target string (ID or Label) against elements list
  const findMatchingElement = (targetStr: string, currentElements: InspectionElement[]): InspectionElement | undefined => {
    if (!targetStr) return undefined;
    const raw = targetStr.trim();
    if (!raw) return undefined;

    const rawLower = raw.toLowerCase();

    // 1. Direct match by ID (numeric or string)
    const byId = currentElements.find(e => String(e.id).toLowerCase() === rawLower);
    if (byId) return byId;

    // 2. Direct match by exact label
    const byExactLabel = currentElements.find(e => e.label.trim().toLowerCase() === rawLower);
    if (byExactLabel) return byExactLabel;

    // 3. Clean normalized label match
    const cleanNorm = (str: string) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^(tramo|cámara|camara|caja|punto|tuberia|tubería|id|#)\s*/i, '')
        .replace(/[\s\-_/.]/g, '');
    };

    const normTarget = cleanNorm(raw);
    if (!normTarget) return undefined;

    const byNormLabel = currentElements.find(e => cleanNorm(e.label) === normTarget);
    if (byNormLabel) return byNormLabel;

    // 4. Flexible zero-padding matching (e.g. "T1" <-> "T01" or "C1" <-> "C01")
    const normTargetWithZero = normTarget.replace(/([a-z])(\d)$/i, '$10$2');
    const normTargetNoZero = normTarget.replace(/([a-z])0+(\d+)$/i, '$1$2');

    return currentElements.find(e => {
      const elNorm = cleanNorm(e.label);
      const elNormWithZero = elNorm.replace(/([a-z])(\d)$/i, '$10$2');
      const elNormNoZero = elNorm.replace(/([a-z])0+(\d+)$/i, '$1$2');

      return elNorm === normTargetWithZero ||
             elNorm === normTargetNoZero ||
             elNormWithZero === normTarget ||
             elNormNoZero === normTarget;
    });
  };

  // Helper to parse and process CSV data for Acta assignment
  const handleProcessActaCsvText = (text: string) => {
    if (!text || !text.trim()) {
      const emptyMsg = 'El contenido del archivo o texto está vacío.';
      if (showToast) showToast(emptyMsg);
      else alert(emptyMsg);
      return;
    }

    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    // Determine overall delimiter from first few lines
    const sampleLine = lines[0];
    const semiCount = (sampleLine.match(/;/g) || []).length;
    const commaCount = (sampleLine.match(/,/g) || []).length;
    const tabCount = (sampleLine.match(/\t/g) || []).length;

    let docDelim = ';';
    if (tabCount > semiCount && tabCount > commaCount) docDelim = '\t';
    else if (commaCount > semiCount) docDelim = ',';

    const firstLineParts = parseCsvRow(lines[0], docDelim);
    const firstCellVal = firstLineParts[0] || '';

    // Check if line 0's first cell matches an element in project
    const matchesElementInRow0 = findMatchingElement(firstCellVal, elements);

    let hasHeader = false;
    if (!matchesElementInRow0) {
      // Check if first line contains clear header keywords
      hasHeader = firstLineParts.some(p => {
        const clean = p.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return clean === 'id' || clean === 'etiqueta' || clean === 'id_o_etiqueta' || clean === 'acta' ||
               clean === 'item' || clean === 'rubro' || clean === 'codigo' || clean.includes('descripcion') || clean.includes('elemento');
      });
    }

    let idColIdx = -1;
    let labelColIdx = -1;
    let actaColIdx = -1;
    let itemColIdx = -1;
    let descColIdx = -1;

    if (hasHeader) {
      firstLineParts.forEach((part, idx) => {
        const p = part.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (p === 'id' || p === 'codigo' || p.includes('id_o_etiqueta') || p.includes('id_etiqueta')) {
          idColIdx = idx;
        } else if (p.includes('etiqueta') || p.includes('elemento') || p.includes('nombre') || p.includes('tramo') || p.includes('camara')) {
          labelColIdx = idx;
        } else if (p.includes('acta')) {
          actaColIdx = idx;
        } else if (p.includes('item') || p.includes('rubro')) {
          itemColIdx = idx;
        } else if (p.includes('descrip') || p.includes('observ') || p.includes('detalle')) {
          descColIdx = idx;
        }
      });
    }

    // Default positions if headers were not explicitly mapped
    if (idColIdx === -1 && labelColIdx === -1) idColIdx = 0;
    if (actaColIdx === -1) actaColIdx = 1;
    if (itemColIdx === -1 && firstLineParts.length >= 3) itemColIdx = 2;
    if (descColIdx === -1 && firstLineParts.length >= 4) descColIdx = 3;

    const startIdx = hasHeader ? 1 : 0;
    let updatedCount = 0;
    let firstAssignedActa = '';

    // Create a local map of elements to apply updates iteratively
    const updatedMap = new Map(elements.map(e => [e.id, { ...e }]));

    lines.slice(startIdx).forEach(line => {
      let parts = parseCsvRow(line, docDelim);
      if (parts.length < 2) {
        // Fallback retry with alternate delimiters
        if (line.includes(';')) parts = parseCsvRow(line, ';');
        else if (line.includes(',')) parts = parseCsvRow(line, ',');
        else if (line.includes('\t')) parts = parseCsvRow(line, '\t');
      }
      if (parts.length < 2) return;

      // Try matching by ID column first, then Label column if available
      let targetVal1 = idColIdx !== -1 ? parts[idColIdx] : parts[0];
      let targetVal2 = labelColIdx !== -1 ? parts[labelColIdx] : parts[0];

      let matched = findMatchingElement(targetVal1, Array.from(updatedMap.values()));
      if (!matched && targetVal2 && targetVal2 !== targetVal1) {
        matched = findMatchingElement(targetVal2, Array.from(updatedMap.values()));
      }

      // If still not matched, scan all parts in row for matching element label
      if (!matched) {
        for (const p of parts) {
          const candidate = findMatchingElement(p, Array.from(updatedMap.values()));
          if (candidate) {
            matched = candidate;
            break;
          }
        }
      }

      if (!matched) return;

      // Extract Acta name
      let rawActa = (actaColIdx !== -1 && parts[actaColIdx]) ? parts[actaColIdx] : '';
      if (!rawActa || rawActa.trim().toLowerCase() === matched.label.trim().toLowerCase()) {
        const candidate = parts.find(p => p.toLowerCase().includes('acta') && p.trim().toLowerCase() !== matched.label.trim().toLowerCase());
        if (candidate) rawActa = candidate;
        else {
          rawActa = parts.find(p => p.trim() !== matched.label.trim() && p.trim() !== String(matched.id)) || parts[1] || 'Acta 1';
        }
      }

      const targetActa = normalizeActa(rawActa);
      const targetItem = (itemColIdx !== -1 && parts[itemColIdx]) ? parts[itemColIdx] : '';
      const targetDesc = (descColIdx !== -1 && parts[descColIdx]) ? parts[descColIdx] : '';

      if (!firstAssignedActa && targetActa !== 'Sin Asignar') {
        firstAssignedActa = targetActa;
      }

      const updatedEl: InspectionElement = {
        ...matched,
        acta: targetActa,
        status: 'Terminado', // Automatically mark element as Terminado when assigned to an Acta de Cobro
        itemCobro: targetItem ? targetItem : matched.itemCobro,
        itemDescripcion: targetDesc ? targetDesc : matched.itemDescripcion
      };

      updatedMap.set(matched.id, updatedEl);
      updatedCount++;
    });

    if (updatedCount > 0) {
      // Save all updated elements via parent handler
      Array.from(updatedMap.values()).forEach(updatedEl => {
        const original = elements.find(e => e.id === updatedEl.id);
        if (original && (original.acta !== updatedEl.acta || original.itemCobro !== updatedEl.itemCobro || original.itemDescripcion !== updatedEl.itemDescripcion || original.status !== updatedEl.status)) {
          onUpdateElement(updatedEl);
        }
      });

      if (firstAssignedActa) {
        setSelectedActa(firstAssignedActa);
      }

      const confirmMsg = `✅ ¡Acta de Cobro asignada exitosamente!\n\nSe vincularon ${updatedCount} elemento(s) al [${firstAssignedActa || 'Acta'}].`;
      if (showToast) showToast(`✅ ¡Carga de Acta exitosa! ${updatedCount} elementos vinculados a [${firstAssignedActa || 'Acta'}].`);
      alert(confirmMsg);

      setPastedActaCsv('');
      setShowImportActaModal(false);
    } else {
      const exampleLabels = elements.slice(0, 6).map(e => e.label).join(', ');
      const msg = `⚠️ No se encontraron elementos coincidentes en la bitácora para asignar.\n\n` +
                  `Verifica que el archivo CSV contenga las etiquetas creadas en tu proyecto (Ej: ${exampleLabels || 'T-01, C-01'}).`;
      if (showToast) showToast('No se encontraron coincidencias en la bitácora para asignar.');
      alert(msg);
    }
  };

  const handleFileUploadActa = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleProcessActaCsvText(content);
      } else {
        const emptyMsg = 'El archivo está vacío o no se pudo leer.';
        if (showToast) showToast(emptyMsg);
        else alert(emptyMsg);
      }
    };
    reader.onerror = () => {
      const errorMsg = 'Error al leer el archivo CSV.';
      if (showToast) showToast(errorMsg);
      else alert(errorMsg);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleBatchAssignActa = () => {
    let targets = elements;
    if (batchTargetFilter === 'finished') {
      targets = elements.filter(e => e.status === 'Terminado');
    } else if (batchTargetFilter === 'unassigned') {
      targets = elements.filter(e => !e.acta || normalizeActa(e.acta) === 'Sin Asignar');
    }

    if (targets.length === 0) {
      alert('No hay elementos que coincidan con el filtro seleccionado.');
      return;
    }

    const assignedActa = normalizeActa(batchActaName);
    let updatedCount = 0;
    targets.forEach(el => {
      onUpdateElement({
        ...el,
        acta: assignedActa,
        itemCobro: batchItemCobro || el.itemCobro
      });
      updatedCount++;
    });

    if (showToast) showToast(`¡${updatedCount} elementos asignados a [${assignedActa}]!`);
    else alert(`¡${updatedCount} elementos asignados a [${assignedActa}]!`);

    setSelectedActa(assignedActa);
    setShowImportActaModal(false);
  };

  const handleDownloadActaTemplateCsv = () => {
    const csvContent = '\uFEFF' +
      'ID_o_Etiqueta;Acta;ItemCobro;ItemDescripcion;Observaciones\n' +
      'T-01;Acta 1;6.1 D;"CANALIZACIÓN SUBTERRÁNEA PVC 4"" SCH 40";"Aprobado en inspección de terreno"\n' +
      'C-01;Acta 1;3.59;"CÁMARA DE INSPECCIÓN ELÉCTRICA EN CONCRETO";"Instalada con marco y tapa"\n' +
      'T-02;Acta 2;6.1 E;"ACOMETIDA TRIFÁSICA CABLE 3#250 F+1#500N";"En proceso de pruebas"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Asignacion_Actas_Obra.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Navigation Bar (No Print) */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                Memorias de Cálculo - Acta de Cobro
              </h2>
              <p className="text-[11px] text-slate-400">
                Formato oficial de soporte de cobro con cantidades presupuestadas, ejecutadas, plano y registros fotográficos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowImportActaModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
              title="Cargar archivo CSV con asignación de Actas o realizar asignación masiva"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>📥 Cargar / Asignar Acta</span>
            </button>

            <button
              onClick={handleExportConsolidatedActasCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
              title="Generar y descargar el archivo de salida en el formato anexo con columnas por cada Acta (ACTA 1, ACTA 2, ACTA 3, etc.)"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>📊 Exportar Matriz por Actas (CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md"
              title="Imprimir o guardar como PDF oficial de soporte de cobro"
            >
              <Printer className="w-4 h-4 text-sky-200" />
              <span>🖨️ Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Filter Controls Bar (No Print) */}
        <div className="bg-slate-100 p-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 no-print text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Seleccionar Acta de Cobro:
            </span>
            <div className="flex items-center gap-1">
              {availableActas.map(actaName => (
                <button
                  key={actaName}
                  onClick={() => {
                    setSelectedActa(actaName);
                    setSelectedItemNo('all');
                  }}
                  className={`px-3 py-1 rounded-lg font-extrabold text-xs transition border ${
                    selectedActa === actaName
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {actaName}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedActa('all');
                  setSelectedItemNo('all');
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition border ${
                  selectedActa === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
              >
                Todas las Actas
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 text-[11px]">Filtrar por Ítem:</span>
            <select
              value={selectedItemNo}
              onChange={(e) => setSelectedItemNo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">-- Ver Todos los Ítems --</option>
              {allItemsList.map(item => (
                <option key={item.itemNo} value={item.itemNo}>
                  Ítem {item.itemNo} - {item.description.slice(0, 30)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-50 flex-1 print:p-0 print:bg-white">
          {displayedItems.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">No hay ítems con cantidad ejecutada para {selectedActa}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Solo se muestran los ítems que poseen <strong>cantidad ejecutada mayor a 0</strong>. Marque los elementos como <strong>"Terminado"</strong> y asígnelos al número de <strong>Acta</strong> correspondientes en la Bitácora para visualizarlos aquí.
              </p>
            </div>
          ) : (
            displayedItems.map((itemGroup, idx) => {
              const noteKey = `${selectedActa}_${itemGroup.itemNo}`;
              const noteVal = sheetNotes[noteKey] || '';

              return (
                <div
                  key={itemGroup.itemNo + '_' + idx}
                  className="bg-white border-2 border-slate-900 rounded-lg p-4 sm:p-6 shadow-sm font-sans space-y-4 print:border-slate-900 print:shadow-none print:break-after-page"
                >
                  {/* Official Header Table matching Screenshot layout */}
                  <div className="border-2 border-slate-900 rounded overflow-hidden">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-900 text-[11px] sm:text-xs font-black uppercase text-slate-900 tracking-wider">
                          <th className="py-2 px-3 border-r-2 border-slate-900 w-20">ITEM</th>
                          <th className="py-2 px-4 border-r-2 border-slate-900 text-left">DESCRIPCIÓN</th>
                          <th className="py-2 px-3 border-r-2 border-slate-900 w-20">UNID</th>
                          <th className="py-2 px-3 border-r-2 border-slate-900 w-36">CANTIDAD PRESUPUESTO</th>
                          <th className="py-2 px-3 w-36">CANTIDAD EJECUTADA</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-xs sm:text-sm font-bold text-slate-900">
                          <td className="py-3 px-3 border-r-2 border-slate-900 font-black bg-slate-50 text-emerald-800">
                            {itemGroup.itemNo}
                          </td>
                          <td className="py-3 px-4 border-r-2 border-slate-900 text-left uppercase font-black">
                            {itemGroup.description}
                          </td>
                          <td className="py-3 px-3 border-r-2 border-slate-900 font-bold text-slate-700">
                            {itemGroup.unit}
                          </td>
                          <td className="py-3 px-3 border-r-2 border-slate-900 font-bold text-slate-700 bg-slate-50/50">
                            {itemGroup.budgetQty}
                          </td>
                          <td className="py-3 px-3 font-black text-emerald-700 text-base bg-emerald-50">
                            {itemGroup.executedQty}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Secondary info banner */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <div>
                      <span>PROYECTO: </span>
                      <strong className="text-slate-900">{projectMeta.sectorLocation || 'Proyecto Eléctrico / Telecomunicaciones'}</strong>
                    </div>
                    <div>
                      <span>CONTRATISTA: </span>
                      <strong className="text-slate-900">{projectMeta.contractorName || 'Contratista de Obra'}</strong>
                    </div>
                    <div>
                      <span>ACTA: </span>
                      <strong className="text-emerald-800 font-extrabold">{selectedActa}</strong>
                    </div>
                  </div>

                  {/* Middle Box: Plan & Location Excerpt */}
                  <div className="border-2 border-slate-900 rounded p-3 space-y-2 relative bg-slate-50/50">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                        <MapIcon className="w-4 h-4 text-emerald-600" />
                        <span>UBICACIÓN EN PLANO DE OBRA - {selectedActa} (ÍTEM {itemGroup.itemNo})</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {itemGroup.elementsList.length} elementos vinculados
                      </span>
                    </div>

                    {/* Canvas/Elements Graphic representation */}
                    <div className="relative bg-slate-900 rounded-lg border border-slate-800 p-4 min-h-[180px] flex flex-col justify-between text-white overflow-hidden">
                      {/* Sub-elements list tags */}
                      <div className="flex flex-wrap gap-2 z-10">
                        {itemGroup.elementsList.map(el => (
                          <div
                            key={el.id}
                            className={`px-3 py-1.5 rounded-md border text-xs font-bold flex items-center gap-2 shadow-sm ${
                              el.status === 'Terminado'
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500'
                                : 'bg-amber-950/90 text-amber-300 border-amber-500'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current" />
                            <span>{el.label}</span>
                            <span className="text-[10px] opacity-80">
                              ({el.type === 'line' ? `${el.meters || 0}m` : (el.camType || 'Cámara')})
                            </span>
                            <span className="bg-slate-800 text-slate-200 text-[9px] px-1.5 py-0.5 rounded font-mono">
                              {el.status === 'En proceso' && el.progressPercent !== undefined ? `En proceso (${el.progressPercent}%)` : el.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Callout box overlay */}
                      <div className="mt-4 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-200 text-xs font-mono flex items-center justify-between">
                        <div>
                          <strong className="text-white">{selectedActa}</strong> — Ítem {itemGroup.itemNo} ({itemGroup.description})
                        </div>
                        <div className="font-bold text-rose-300">
                          Total Ejecutado: {itemGroup.executedQty} {itemGroup.unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photographic Evidence Grid (Anexo Fotográfico) */}
                  <div className="border-2 border-slate-900 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>REGISTRO Y EVIDENCIA FOTOGRÁFICA EN CAMPO</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Soporte técnico fotográfico del ítem
                      </span>
                    </div>

                    {/* Photos grid */}
                    {(() => {
                      const allPhotos: Array<{ elLabel: string; photoUrl: string }> = [];
                      itemGroup.elementsList.forEach(el => {
                        if (el.photos && el.photos.length > 0) {
                          el.photos.forEach(p => {
                            allPhotos.push({ elLabel: el.label, photoUrl: p });
                          });
                        }
                      });

                      if (allPhotos.length === 0) {
                        return (
                          <div className="p-6 text-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-xs space-y-2">
                            <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-bold">No se han adjuntado fotografías de evidencia aún para los elementos de este ítem.</p>
                            <p className="text-[11px] text-slate-400">
                              Puede adjuntar fotos directamente haciendo clic en los elementos del plano o en la bitácora.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {allPhotos.map((photoItem, pIdx) => (
                            <div key={pIdx} className="border border-slate-300 rounded overflow-hidden bg-slate-100 flex flex-col">
                              <img
                                src={photoItem.photoUrl}
                                alt={`Evidencia ${photoItem.elLabel}`}
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-1.5 bg-slate-900 text-white text-[10px] font-bold text-center truncate">
                                {photoItem.elLabel} - Foto #{pIdx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* OBSERVACIONES Footer Box matching screenshot */}
                  <div className="border-2 border-slate-900 rounded p-3 space-y-1 bg-white">
                    <label className="text-xs font-black text-slate-900 uppercase block tracking-wider">
                      OBSERVACIONES:
                    </label>
                    <textarea
                      rows={3}
                      value={noteVal}
                      onChange={(e) => setSheetNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                      placeholder="Escriba las observaciones del ítem cobrado, novedades técnicas, ensayos de laboratorio o notas de inspección..."
                      className="w-full text-xs text-slate-800 p-2 border border-slate-300 rounded focus:border-slate-900 focus:ring-0 no-print"
                    />
                    {/* Print version of observations */}
                    <div className="hidden print:block text-xs text-slate-800 font-medium min-h-[40px] whitespace-pre-wrap">
                      {noteVal || 'Sin observaciones adicionales registradas.'}
                    </div>
                  </div>

                  {/* Signatures section for print */}
                  <div className="hidden print:grid grid-cols-2 gap-8 pt-8">
                    <div className="border-t border-slate-900 pt-1 text-center text-xs font-bold text-slate-800">
                      <div>INSPECTOR DE OBRA</div>
                      <div className="text-[10px] font-normal text-slate-600">{projectMeta.inspectorName || 'Firma de Inspector'}</div>
                    </div>
                    <div className="border-t border-slate-900 pt-1 text-center text-xs font-bold text-slate-800">
                      <div>SUPERVISOR / CONTRATISTA</div>
                      <div className="text-[10px] font-normal text-slate-600">{projectMeta.contractorName || 'Firma de Contratista'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal for Importing / Assigning Actas */}
        {showImportActaModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Cargar Archivo y Asignar Acta de Cobro</h3>
                    <p className="text-xs text-slate-400">Importa asignaciones por CSV o realiza asignaciones en lote</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowImportActaModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActaImportTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                    actaImportTab === 'upload'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Subir Archivo CSV / Pegar Datos</span>
                </button>

                <button
                  onClick={() => setActaImportTab('batch')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                    actaImportTab === 'batch'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Asignación Masiva Rápida</span>
                </button>
              </div>

              {/* Sub-Tab 1: Upload CSV / Paste */}
              {actaImportTab === 'upload' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">1. Subir Archivo (.CSV / .TXT)</span>
                      <button
                        onClick={handleDownloadActaTemplateCsv}
                        className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 underline text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar Plantilla CSV</span>
                      </button>
                    </div>

                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileUploadActa(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
                        dragActive
                          ? 'border-amber-500 bg-amber-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <FileUp className="w-7 h-7 text-amber-400" />
                      <span className="font-bold text-white text-xs">Haz clic para seleccionar o arrastra tu archivo CSV aquí</span>
                      <span className="text-[10px] text-slate-400">Columnas esperadas: ID_o_Etiqueta, Acta, ItemCobro, ItemDescripcion</span>
                      <input
                        type="file"
                        accept=".csv, .txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUploadActa(e.target.files[0]);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 block">2. O Copiar y Pegar Texto desde Excel</span>
                    <textarea
                      rows={4}
                      value={pastedActaCsv}
                      onChange={(e) => setPastedActaCsv(e.target.value)}
                      placeholder={'Ejemplo:\nT-01, Acta 1, 6.1 D, CANALIZACION PVC 4"\nC-01, Acta 1, 3.59, CAMARA CONCRETO SB850'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />

                    <button
                      onClick={() => handleProcessActaCsvText(pastedActaCsv)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Procesar y Asignar Actas</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Batch Assignment */}
              {actaImportTab === 'batch' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Nombre del Acta de Cobro:</label>
                    <input
                      type="text"
                      value={batchActaName}
                      onChange={(e) => setBatchActaName(e.target.value)}
                      placeholder="Ej. Acta 1, Acta 2, Acta 3 - Agosto 2026"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Seleccionar Elementos a Asignar:</label>
                    <select
                      value={batchTargetFilter}
                      onChange={(e) => setBatchTargetFilter(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-bold"
                    >
                      <option value="finished">Solo Elementos "Terminados" ({elements.filter(e => e.status === 'Terminado').length})</option>
                      <option value="unassigned">Solo Elementos "Sin Acta Asignada" ({elements.filter(e => !e.acta || e.acta === 'Sin Asignar').length})</option>
                      <option value="all">Todos los Elementos Registrados ({elements.length})</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300 block">Asignar Ítem Contractual (Opcional):</label>
                    <select
                      value={batchItemCobro}
                      onChange={(e) => setBatchItemCobro(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                    >
                      {contractItems.map(ci => (
                        <option key={ci.item} value={ci.item}>
                          {ci.item} - {ci.description} ({ci.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleBatchAssignActa}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aplicar Asignación de Acta en Lote</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
