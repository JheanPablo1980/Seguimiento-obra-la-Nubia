import React, { useState, useRef, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { toPng } from 'html-to-image';
import { InspectionElement, ProjectMeta, ContractualItem, GlobalConfig } from '../types';
import { MemoriaCanvasMiniature } from '../components/MemoriaCanvasMiniature';
import { DEFAULT_CONTRACTUAL_ITEMS } from '../data/sampleData';
import { normalizeActa, getAvailableActas } from '../utils/actaUtils';
import { normalizarPorcentaje, calcularAvancePorCronograma } from '../utils/cronogramaUtils';
import { getElementPhotoRecords, formatFindingDate, getStageBadgeStyle } from '../utils/photoUtils';
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
  inProgressQty: number;
  elementsList: InspectionElement[];
}

export const MemoriaCalculoModal: React.FC<MemoriaCalculoModalProps> = ({
  isOpen,
  onClose,
  elements,
  projectMeta,
  blueprintImg,
  onUpdateElement,
  onUpdateProjectMeta,
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
  
  // State to filter items by execution status
  const [itemFilterStatus, setItemFilterStatus] = useState<'all' | 'executed' | 'in_progress'>('all');

  // Custom observation state per item/acta memory sheet
  const [sheetNotes, setSheetNotes] = useState<Record<string, string>>({});

  // States for Loading / Importing Actas Modal
  const [showImportActaModal, setShowImportActaModal] = useState(false);
  const [actaImportTab, setActaImportTab] = useState<'upload' | 'batch' | 'catalog'>('upload');
  const [pastedActaCsv, setPastedActaCsv] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState<{ updatedElements: InspectionElement[], firstActa: string } | null>(null);

  // Batch assignment state
  const [batchActaName, setBatchActaName] = useState('Acta 1');
  const [batchTargetFilter, setBatchTargetFilter] = useState<'finished' | 'all' | 'unassigned'>('finished');
  const [batchItemCobro, setBatchItemCobro] = useState('3.63');

  const [pendingActaDocument, setPendingActaDocument] = useState<{ file: File; dataUrl: string; type: string } | null>(null);

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
      inProgressQty: 0,
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
        inProgressQty: 0,
        elementsList: []
      });
    }

    const group = itemsMap.get(itemKey)!;
    group.elementsList.push(el);

    // Calculate executed quantity
    let baseQty = 1;
    if (el.type === 'line') {
      baseQty = (el.meters && el.meters > 0) ? el.meters : 1;
    }

    if (el.status === 'Terminado') {
      group.executedQty += baseQty;
    } else if (el.status === 'En proceso') {
      group.inProgressQty += baseQty;
      const pct = normalizarPorcentaje(el.progressPercent, el.status);
      group.executedQty += baseQty * (pct / 100);
    } else if (el.acta) {
      group.executedQty += baseQty;
    }
  });

  // Display item groups. We show all items from the catalog so the user can see what's loaded, even if executed is 0.
  const allItemsList: ItemGroup[] = Array.from(itemsMap.values()) as ItemGroup[];

  // Filter items according to execution status for the dropdown
  const filteredForDropdown = allItemsList.filter(g => {
    if (itemFilterStatus === 'executed') {
      return g.elementsList.some(el => el.status === 'Terminado' || !!el.acta || (el.status === 'En proceso' && el.progressPercent !== undefined && el.progressPercent > 0));
    }
    if (itemFilterStatus === 'in_progress') {
      return g.elementsList.some(el => el.status === 'En proceso');
    }
    return true;
  });

  // Filter items according to selectedItemNo dropdown
  const displayedItems = filteredForDropdown.filter(g => {
    if (selectedItemNo !== 'all' && g.itemNo !== selectedItemNo) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportMemoriasExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistema de Control de Obras y Telecomunicaciones';
      wb.lastModifiedBy = projectMeta.inspectorName || 'Inspector de Obra';
      wb.created = new Date();

      if (displayedItems.length === 0) {
        alert("No hay ítems para exportar.");
        return;
      }

      if (showToast) showToast('Generando Excel con formatos ejecutivos e imágenes... Esto puede tardar un momento.');

      const thinBorderDef: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };

      const darkMediumBorderDef: Partial<ExcelJS.Borders> = {
        top: { style: 'medium', color: { argb: '0F172A' } },
        left: { style: 'medium', color: { argb: '0F172A' } },
        bottom: { style: 'medium', color: { argb: '0F172A' } },
        right: { style: 'medium', color: { argb: '0F172A' } }
      };

      for (let idx = 0; idx < displayedItems.length; idx++) {
        const itemGroup = displayedItems[idx];
        const filteredElements = itemGroup.elementsList.filter(el => {
          if (itemFilterStatus === 'executed') {
            return el.status === 'Terminado' || !!el.acta || (el.status === 'En proceso' && el.progressPercent !== undefined && el.progressPercent > 0);
          }
          if (itemFilterStatus === 'in_progress') {
            return el.status === 'En proceso';
          }
          return true;
        });

        let sheetName = `Ítem ${itemGroup.itemNo}`.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '_');
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.worksheets.some(ws => ws.name === finalSheetName)) {
           finalSheetName = `${sheetName.substring(0, 27)}_${counter}`;
           counter++;
        }
        
        const ws = wb.addWorksheet(finalSheetName, {
          views: [{ showGridLines: true }],
          pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });

        // Definición de anchos de columna optimizados
        ws.columns = [
          { key: 'col1', width: 16 }, // ITEM / Etiqueta
          { key: 'col2', width: 54 }, // DESCRIPCION / Tipo
          { key: 'col3', width: 14 }, // UNID / Estado
          { key: 'col4', width: 24 }, // CANTIDAD PRESUPUESTO / Avance
          { key: 'col5', width: 24 }, // CANTIDAD EJECUTADA / Cantidad Aportada
        ];

        // --- FILA 1: ENCABEZADO PRINCIPAL DE LA MEMORIA ---
        const row1 = ws.getRow(1);
        row1.height = 26;
        row1.values = ["ITEM", "DESCRIPCIÓN", "UNIDAD", "CANTIDAD PRESUPUESTO", "CANTIDAD EJECUTADA"];
        for (let col = 1; col <= 5; col++) {
          const cell = row1.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: col === 1 || col === 3 ? 'center' : (col >= 4 ? 'right' : 'left')
          };
          cell.border = {
            top: { style: 'medium', color: { argb: '0F172A' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: col === 1 ? '0F172A' : '475569' } },
            right: { style: col === 5 ? 'medium' : 'thin', color: { argb: col === 5 ? '0F172A' : '475569' } },
            bottom: { style: 'thin', color: { argb: '0F172A' } }
          };
        }

        // --- FILA 2: DATOS DEL ÍTEM DE COBRO ---
        const row2 = ws.getRow(2);
        row2.height = 46;
        row2.values = [
          itemGroup.itemNo,
          itemGroup.description.toUpperCase(),
          itemGroup.unit || 'UN',
          itemGroup.budgetQty,
          parseFloat(itemGroup.executedQty.toFixed(2))
        ];

        // Fila 2 Estilos celda a celda
        const cellA2 = row2.getCell(1);
        cellA2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };
        cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cellA2.alignment = { vertical: 'middle', horizontal: 'center' };
        cellA2.border = {
          left: { style: 'medium', color: { argb: '0F172A' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } }
        };

        const cellB2 = row2.getCell(2);
        cellB2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
        cellB2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
        cellB2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cellB2.border = {
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } }
        };

        const cellC2 = row2.getCell(3);
        cellC2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '334155' } };
        cellC2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cellC2.alignment = { vertical: 'middle', horizontal: 'center' };
        cellC2.border = {
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } }
        };

        const cellD2 = row2.getCell(4);
        cellD2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '0F172A' } };
        cellD2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        cellD2.alignment = { vertical: 'middle', horizontal: 'right' };
        cellD2.numFmt = '#,##0.00';
        cellD2.border = {
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } }
        };

        const cellE2 = row2.getCell(5);
        cellE2.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '047857' } };
        cellE2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
        cellE2.alignment = { vertical: 'middle', horizontal: 'right' };
        cellE2.numFmt = '#,##0.00';
        cellE2.border = {
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'medium', color: { argb: '0F172A' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } }
        };

        // --- FILA 3: ESPACIADOR ---
        ws.getRow(3).height = 6;

        // --- FILA 4: RECUADRO INFORMATIVO DEL PROYECTO ---
        const row4 = ws.getRow(4);
        row4.height = 24;
        row4.values = [
          `PROYECTO: ${projectMeta.sectorLocation || 'Obra Eléctrica / Telecomunicaciones'}`,
          "",
          `CONTRATISTA: ${projectMeta.contractorName || 'Contratista General'}`,
          "",
          `ACTA: ${selectedActa}`
        ];
        ws.mergeCells('A4:B4');
        ws.mergeCells('C4:D4');

        for (let c = 1; c <= 5; c++) {
          const cell = row4.getCell(c);
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
          cell.alignment = { vertical: 'middle', horizontal: c === 5 ? 'center' : 'left' };
          cell.border = {
            top: { style: 'thin', color: { argb: '94A3B8' } },
            bottom: { style: 'thin', color: { argb: '94A3B8' } },
            left: { style: c === 1 ? 'medium' : 'thin', color: { argb: c === 1 ? '0F172A' : 'CBD5E1' } },
            right: { style: c === 5 ? 'medium' : 'thin', color: { argb: c === 5 ? '0F172A' : 'CBD5E1' } }
          };
        }
        row4.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '065F46' } };
        row4.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };

        // --- FILA 5: ESPACIADOR ---
        ws.getRow(5).height = 6;

        // --- FILA 6: ENCABEZADOS DE RECUADROS VISUALES (PLANO Y REGISTRO FOTOGRÁFICO) ---
        const row6 = ws.getRow(6);
        row6.height = 24;
        row6.values = [
          "UBICACIÓN EN PLANO DE OBRA",
          "",
          "REGISTRO Y EVIDENCIA FOTOGRÁFICA EN CAMPO",
          "",
          ""
        ];
        ws.mergeCells('A6:B6');
        ws.mergeCells('C6:E6');

        for (let col = 1; col <= 5; col++) {
          const cell = row6.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.border = {
            top: { style: 'medium', color: { argb: '0F172A' } },
            left: { style: col === 1 || col === 3 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            right: { style: col === 2 || col === 5 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            bottom: { style: 'medium', color: { argb: '0F172A' } }
          };
        }

        // --- FILAS 7 A 19: CONTENEDORES CON MARCO PARA IMÁGENES (312pt altura) ---
        for (let r = 7; r <= 19; r++) {
          const rObj = ws.getRow(r);
          rObj.height = 24;
          for (let col = 1; col <= 5; col++) {
            const cell = rObj.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col <= 2 ? '0B1329' : 'F8FAFC' } };
            cell.border = {
              top: r === 7 ? { style: 'medium', color: { argb: '0F172A' } } : undefined,
              bottom: r === 19 ? { style: 'medium', color: { argb: '0F172A' } } : undefined,
              left: col === 1 || col === 3 ? { style: 'medium', color: { argb: '0F172A' } } : undefined,
              right: col === 2 || col === 5 ? { style: 'medium', color: { argb: '0F172A' } } : undefined
            };
          }
        }
        ws.mergeCells('A7:B19');
        ws.mergeCells('C7:E19');

        // Helper para insertar imágenes proporcionales sin deformación en Excel
        const addProportionalImageToExcel = async (
          imgBase64: string,
          startCol: number,
          endCol: number,
          startRow: number,
          endRow: number,
          colWidths: number[],
          rowHeights: number[]
        ) => {
          try {
            const imageId = wb.addImage({
              base64: imgBase64,
              extension: 'png',
            });

            const dims = await new Promise<{ width: number; height: number }>((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ width: img.naturalWidth || img.width || 800, height: img.naturalHeight || img.height || 500 });
              img.onerror = () => resolve({ width: 800, height: 500 });
              img.src = imgBase64;
            });

            // Convertir anchos de columna y alturas de fila a píxeles equivalentes
            const totalContainerWidthPx = colWidths.reduce((sum, w) => sum + w * 7.5, 0);
            const totalContainerHeightPx = rowHeights.reduce((sum, h) => sum + h * 1.333, 0);

            const imgAspect = dims.width / dims.height;
            const containerAspect = totalContainerWidthPx / totalContainerHeightPx;

            const totalCols = endCol - startCol;
            const totalRows = endRow - startRow;

            // Margen interior de seguridad para preservar los bordes nítidos
            const paddingRatio = 0.015;
            let actualColSpan = totalCols * (1 - paddingRatio * 2);
            let actualRowSpan = totalRows * (1 - paddingRatio * 2);

            if (imgAspect > containerAspect) {
              actualColSpan = totalCols * (1 - paddingRatio * 2);
              const targetHeightPx = (totalContainerWidthPx * (1 - paddingRatio * 2)) / imgAspect;
              const heightFraction = targetHeightPx / totalContainerHeightPx;
              actualRowSpan = totalRows * Math.min(heightFraction, 1 - paddingRatio * 2);
            } else {
              actualRowSpan = totalRows * (1 - paddingRatio * 2);
              const targetWidthPx = (totalContainerHeightPx * (1 - paddingRatio * 2)) * imgAspect;
              const widthFraction = targetWidthPx / totalContainerWidthPx;
              actualColSpan = totalCols * Math.min(widthFraction, 1 - paddingRatio * 2);
            }

            // Centrado horizontal y vertical exacto dentro del contenedor
            const tlCol = startCol + (totalCols - actualColSpan) / 2;
            const tlRow = startRow + (totalRows - actualRowSpan) / 2;

            ws.addImage(imageId, {
              tl: { col: tlCol, row: tlRow },
              br: { col: tlCol + actualColSpan, row: tlRow + actualRowSpan },
              editAs: 'oneCell'
            } as any);
          } catch(e) {
            console.error("Error adding proportional image to Excel", e);
          }
        };

        const visualRowHeights = new Array(13).fill(24);

        // Capturar plano en alta resolución y ubicar sin deformación
        const mapEl = document.getElementById(`map-capture-${itemGroup.itemNo}`);
        if (mapEl) {
          try {
            const mapBase64 = await toPng(mapEl, { pixelRatio: 3, cacheBust: true });
            await addProportionalImageToExcel(
              mapBase64,
              0, // Col A
              2, // Col B derecha
              6, // Fila 7
              19, // Fila 19
              [16, 54],
              visualRowHeights
            );
          } catch(e) { console.error("Error capturing map", e); }
        }

        const photoEl = document.getElementById(`photo-capture-${itemGroup.itemNo}`);
        if (photoEl) {
          try {
            const photoBase64 = await toPng(photoEl, { pixelRatio: 3, cacheBust: true });
            await addProportionalImageToExcel(
              photoBase64,
              2, // Col C
              5, // Col E derecha
              6, // Fila 7
              19, // Fila 19
              [14, 24, 24],
              visualRowHeights
            );
          } catch(e) { console.error("Error capturing photos", e); }
        }

        // --- FILA 20: ESPACIADOR ---
        ws.getRow(20).height = 6;

        // --- FILA 21: ENCABEZADO DE OBSERVACIONES ---
        const row21 = ws.getRow(21);
        row21.height = 22;
        row21.values = ["OBSERVACIONES:", "", "", "", ""];
        ws.mergeCells('A21:E21');
        for (let col = 1; col <= 5; col++) {
          const cell = row21.getCell(col);
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          cell.border = {
            top: { style: 'medium', color: { argb: '0F172A' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            right: { style: col === 5 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            bottom: { style: 'thin', color: { argb: '0F172A' } }
          };
        }

        // --- FILAS 22 A 24: RECUADRO DE TEXTO DE OBSERVACIONES ---
        const noteKey = `${selectedActa}_${itemGroup.itemNo}`;
        const noteVal = sheetNotes[noteKey] || '';
        for (let r = 22; r <= 24; r++) {
          const rObj = ws.getRow(r);
          rObj.height = 18;
          for (let col = 1; col <= 5; col++) {
            const cell = rObj.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAFA' } };
            cell.border = {
              left: col === 1 ? { style: 'medium', color: { argb: '0F172A' } } : undefined,
              right: col === 5 ? { style: 'medium', color: { argb: '0F172A' } } : undefined,
              bottom: r === 24 ? { style: 'medium', color: { argb: '0F172A' } } : undefined
            };
          }
        }
        ws.mergeCells('A22:E24');
        const noteCell = ws.getCell('A22');
        noteCell.value = noteVal || 'Sin observaciones técnicas adicionales registradas para este ítem en el acta actual.';
        noteCell.font = { name: 'Calibri', size: 9.5, italic: !noteVal, color: { argb: noteVal ? '0F172A' : '64748B' } };
        noteCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

        // --- FILA 25: ESPACIADOR ---
        ws.getRow(25).height = 6;

        // --- FILA 26: TÍTULO DE LA TABLA DETALLADA ---
        const row26 = ws.getRow(26);
        row26.height = 24;
        row26.values = ["DETALLE DE ELEMENTOS (MEMORIA DE CÁLCULO)", "", "", "", ""];
        ws.mergeCells('A26:E26');
        for (let col = 1; col <= 5; col++) {
          const cell = row26.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'medium', color: { argb: '0F172A' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            right: { style: col === 5 ? 'medium' : 'thin', color: { argb: '0F172A' } },
            bottom: { style: 'thin', color: { argb: '475569' } }
          };
        }

        // --- FILA 27: ENCABEZADOS DE COLUMNAS DE LA TABLA ---
        const row27 = ws.getRow(27);
        row27.height = 22;
        row27.values = ["Etiqueta", "Tipo", "Estado", "Avance", "Cantidad Aportada"];
        for (let col = 1; col <= 5; col++) {
          const cell = row27.getCell(col);
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: col === 1 || col === 3 || col === 4 ? 'center' : (col === 5 ? 'right' : 'left')
          };
          cell.border = {
            top: { style: 'thin', color: { argb: '475569' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: col === 1 ? '0F172A' : '64748B' } },
            right: { style: col === 5 ? 'medium' : 'thin', color: { argb: col === 5 ? '0F172A' : '64748B' } },
            bottom: { style: 'medium', color: { argb: '0F172A' } }
          };
        }

        // --- FILAS 28+: REGISTROS DETALLADOS DE ELEMENTOS ---
        let currentRowIdx = 28;
        let totalSumAportada = 0;

        filteredElements.forEach((el, elemIdx) => {
          let baseQty = el.type === 'line' ? (el.meters || 1) : 1;
          let aportada = 0;
          if (el.status === 'Terminado') {
             aportada = baseQty;
          } else if (el.status === 'En proceso') {
             if (el.progressPercent !== undefined) {
                aportada = baseQty * (el.progressPercent / 100);
             }
          } else if (el.acta) {
             aportada = baseQty;
          }

          totalSumAportada += aportada;

          const dRow = ws.getRow(currentRowIdx);
          dRow.height = 20;
          dRow.values = [
            el.label,
            el.camType || el.pipes || (el.type === 'line' ? 'Canalización' : 'Cámara'),
            el.status,
            el.status === 'En proceso' && el.progressPercent !== undefined ? `${el.progressPercent}%` : (el.status === 'Terminado' ? '100%' : '100%'),
            parseFloat(aportada.toFixed(2))
          ];

          const isEven = elemIdx % 2 === 0;
          const rowBg = isEven ? 'FFFFFF' : 'F8FAFC';

          // Celda A: Etiqueta
          const c1 = dRow.getCell(1);
          c1.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
          c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          c1.alignment = { vertical: 'middle', horizontal: 'center' };
          c1.border = {
            left: { style: 'medium', color: { argb: '0F172A' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Celda B: Tipo
          const c2 = dRow.getCell(2);
          c2.font = { name: 'Calibri', size: 9.5, color: { argb: '334155' } };
          c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          c2.border = {
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Celda C: Estado
          const c3 = dRow.getCell(3);
          const isFinished = el.status === 'Terminado';
          const isInProg = el.status === 'En proceso';
          c3.font = {
            name: 'Calibri',
            size: 9,
            bold: true,
            color: { argb: isFinished ? '065F46' : (isInProg ? '92400E' : '475569') }
          };
          c3.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isFinished ? 'ECFDF5' : (isInProg ? 'FEF3C7' : rowBg) }
          };
          c3.alignment = { vertical: 'middle', horizontal: 'center' };
          c3.border = {
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Celda D: Avance
          const c4 = dRow.getCell(4);
          c4.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
          c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          c4.alignment = { vertical: 'middle', horizontal: 'center' };
          c4.border = {
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Celda E: Cantidad Aportada
          const c5 = dRow.getCell(5);
          c5.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '047857' } };
          c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          c5.alignment = { vertical: 'middle', horizontal: 'right' };
          c5.numFmt = '#,##0.00';
          c5.border = {
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'medium', color: { argb: '0F172A' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          currentRowIdx++;
        });

        // --- FILA DE TOTALES CON DOBLE LÍNEA ---
        const totalRow = ws.getRow(currentRowIdx);
        totalRow.height = 24;
        totalRow.values = ["TOTAL APORTADO AL ÍTEM:", "", "", "", parseFloat(totalSumAportada.toFixed(2))];
        ws.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);

        for (let col = 1; col <= 4; col++) {
          const cell = totalRow.getCell(col);
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '065F46' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.border = {
            top: { style: 'medium', color: { argb: '047857' } },
            bottom: { style: 'double', color: { argb: '047857' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: col === 1 ? '0F172A' : 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        }

        const totValCell = totalRow.getCell(5);
        totValCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '047857' } };
        totValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
        totValCell.alignment = { vertical: 'middle', horizontal: 'right' };
        totValCell.numFmt = '#,##0.00';
        totValCell.border = {
          top: { style: 'medium', color: { argb: '047857' } },
          bottom: { style: 'double', color: { argb: '047857' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'medium', color: { argb: '0F172A' } }
        };

        // --- SECCIÓN DE FIRMAS Y APROBACIÓN ---
        const sigRowIdx = currentRowIdx + 3;
        ws.getRow(sigRowIdx - 1).height = 14;

        const sigRow1 = ws.getRow(sigRowIdx);
        sigRow1.height = 20;
        sigRow1.values = ["INSPECTOR DE OBRA", "", "", "SUPERVISOR / CONTRATISTA", ""];
        ws.mergeCells(`A${sigRowIdx}:B${sigRowIdx}`);
        ws.mergeCells(`D${sigRowIdx}:E${sigRowIdx}`);

        const sigA = sigRow1.getCell(1);
        sigA.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
        sigA.alignment = { vertical: 'middle', horizontal: 'center' };
        sigA.border = { top: { style: 'medium', color: { argb: '0F172A' } } };

        const sigD = sigRow1.getCell(4);
        sigD.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '0F172A' } };
        sigD.alignment = { vertical: 'middle', horizontal: 'center' };
        sigD.border = { top: { style: 'medium', color: { argb: '0F172A' } } };

        const sigRow2 = ws.getRow(sigRowIdx + 1);
        sigRow2.height = 18;
        sigRow2.values = [
          projectMeta.inspectorName || 'Firma de Inspector',
          "",
          "",
          projectMeta.contractorName || 'Firma de Contratista',
          ""
        ];
        ws.mergeCells(`A${sigRowIdx + 1}:B${sigRowIdx + 1}`);
        ws.mergeCells(`D${sigRowIdx + 1}:E${sigRowIdx + 1}`);

        const sigSubA = sigRow2.getCell(1);
        sigSubA.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: '64748B' } };
        sigSubA.alignment = { vertical: 'middle', horizontal: 'center' };

        const sigSubD = sigRow2.getCell(4);
        sigSubD.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: '64748B' } };
        sigSubD.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const fileName = `Memorias_${selectedActa.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (showToast) showToast('¡Memorias de cálculo exportadas a Excel con diseño ejecutivo e imágenes proporcionales!');
    } catch (err: any) {
      console.error("Error exporting to Excel", err);
      alert("Error al exportar Excel: " + (err.message || err));
    }
  };

  const handleExportConsolidatedActasExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistema de Control de Obras y Telecomunicaciones';
      wb.lastModifiedBy = projectMeta.inspectorName || 'Inspector de Obra';
      wb.created = new Date();

      const actasSorted = getAvailableActas(elements, globalConfig?.totalActas || 10);
      const normKey = (k?: string) => (k || '').trim().replace(',', '.');
      const itemActaTotals = new Map<string, Map<string, number>>();

      elements.forEach(el => {
        let aportada = 0;
        let baseQty = el.type === 'line' ? (el.meters || 1) : 1;
        
        if (el.status === 'Terminado') {
           aportada = baseQty;
        } else if (el.status === 'En proceso') {
           if (el.progressPercent !== undefined) {
             aportada = baseQty * (el.progressPercent / 100);
           }
        } else if (el.acta) {
           aportada = baseQty;
        }
        
        if (aportada === 0) return;

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
        actMap.set(acta, currentVal + aportada);
      });

      const itemsMapLocal = new Map<string, { item: string; description: string; unit: string; budgetQuantity: number }>();
      contractItems.forEach(ci => {
        itemsMapLocal.set(normKey(ci.item), {
          item: ci.item,
          description: ci.description,
          unit: ci.unit,
          budgetQuantity: ci.budgetQuantity
        });
      });

      elements.forEach(el => {
        if (!el.itemCobro) return;
        const key = normKey(el.itemCobro);
        if (!itemsMapLocal.has(key)) {
          itemsMapLocal.set(key, {
            item: el.itemCobro,
            description: el.itemDescripcion || (el.type === 'camera' ? 'Cámara / Caja' : 'Canalización'),
            unit: el.itemUnidad || (el.type === 'line' ? 'ML' : 'UN'),
            budgetQuantity: 0
          });
        }
      });

      const ws = wb.addWorksheet("Matriz por Actas", {
        views: [{ showGridLines: true }]
      });

      // Anchos de columna
      const colsDef = [
        { width: 14 }, // ITEM
        { width: 48 }, // DESCRIPCION
        { width: 12 }, // UNID
        { width: 22 }, // CANTIDAD PRESUPUESTO
        ...actasSorted.map(() => ({ width: 18 })) // Cada Acta
      ];
      ws.columns = colsDef;

      // Fila 1: Título Consolidado
      const titleRow = ws.getRow(1);
      titleRow.height = 28;
      const totalColCount = 4 + actasSorted.length;
      titleRow.values = ["CONSOLIDADO DE CANTIDADES EJECUTADAS POR ACTAS DE COBRO", ...Array(totalColCount - 1).fill("")];
      ws.mergeCells(1, 1, 1, totalColCount);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Fila 2: Información del Proyecto
      const infoRow = ws.getRow(2);
      infoRow.height = 22;
      infoRow.values = [
        `PROYECTO: ${projectMeta.sectorLocation || 'General'} | CONTRATISTA: ${projectMeta.contractorName || 'General'}`,
        ...Array(totalColCount - 1).fill("")
      ];
      ws.mergeCells(2, 1, 2, totalColCount);
      const infoCell = infoRow.getCell(1);
      infoCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '1E293B' } };
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      // Fila 3: Espaciador
      ws.getRow(3).height = 8;

      // Fila 4: Encabezados de Columnas
      const headerRow = ws.getRow(4);
      headerRow.height = 24;
      headerRow.values = ['ITEM', 'DESCRIPCIÓN', 'UNID', 'CANTIDAD PRESUPUESTO', ...actasSorted];
      
      for (let col = 1; col <= totalColCount; col++) {
        const cell = headerRow.getCell(col);
        const isActaCol = col > 4;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isActaCol ? '0F766E' : '1E293B' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 1 || col === 3 ? 'center' : (col >= 4 ? 'right' : 'left')
        };
        cell.border = {
          top: { style: 'medium', color: { argb: '0F172A' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: '475569' } },
          right: { style: 'thin', color: { argb: '475569' } }
        };
      }

      let rowIdx = 5;
      const colTotals = Array(actasSorted.length).fill(0);
      let totalBudgetSum = 0;

      itemsMapLocal.forEach((ci, key) => {
        const actMap = itemActaTotals.get(key);
        const rowData: any[] = [
          ci.item,
          ci.description,
          ci.unit,
          ci.budgetQuantity > 0 ? parseFloat(ci.budgetQuantity.toFixed(2)) : 0
        ];
        totalBudgetSum += ci.budgetQuantity > 0 ? ci.budgetQuantity : 0;

        actasSorted.forEach((actaName, aIdx) => {
          const val = (actMap && actMap.get(actaName)) ? actMap.get(actaName)! : 0;
          rowData.push(parseFloat(val.toFixed(2)));
          colTotals[aIdx] += val;
        });

        const dRow = ws.getRow(rowIdx);
        dRow.height = 20;
        dRow.values = rowData;

        const isEven = (rowIdx - 5) % 2 === 0;
        const rowBg = isEven ? 'FFFFFF' : 'F8FAFC';

        for (let col = 1; col <= totalColCount; col++) {
          const cell = dRow.getCell(col);
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: '0F172A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: col === 1 || col === 3 ? 'center' : (col >= 4 ? 'right' : 'left')
          };
          if (col >= 4) {
            cell.numFmt = '#,##0.00';
            if (col > 4 && typeof cell.value === 'number' && cell.value > 0) {
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: '047857' } };
            }
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };
        }

        rowIdx++;
      });

      // Fila de Totales
      const footRow = ws.getRow(rowIdx);
      footRow.height = 24;
      const footValues: any[] = ["TOTALES", "", "", parseFloat(totalBudgetSum.toFixed(2))];
      colTotals.forEach(tot => footValues.push(parseFloat(tot.toFixed(2))));
      footRow.values = footValues;
      ws.mergeCells(rowIdx, 1, rowIdx, 3);

      for (let col = 1; col <= totalColCount; col++) {
        const cell = footRow.getCell(col);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '065F46' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: col <= 3 ? 'right' : 'right'
        };
        if (col >= 4) cell.numFmt = '#,##0.00';
        cell.border = {
          top: { style: 'medium', color: { argb: '047857' } },
          bottom: { style: 'double', color: { argb: '047857' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      }

      const fileName = `Matriz_Actas_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (showToast) showToast('¡Matriz de actas exportada a Excel exitosamente!');
    } catch (err) {
      console.error(err);
      alert('Error exportando archivo de excel');
    }
  };

  // Helper to parse full CSV text supporting multiline strings
  const parseFullCsv = (text: string, delimiter?: string): string[][] => {
    let delim = delimiter;
    if (!delim) {
      const sample = text.slice(0, 1000);
      const semicolons = (sample.match(/;/g) || []).length;
      const commas = (sample.match(/,/g) || []).length;
      const tabs = (sample.match(/\t/g) || []).length;
      if (tabs > semicolons && tabs > commas) delim = '\t';
      else if (semicolons >= commas) delim = ';';
      else delim = ',';
    }

    const result: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c)) { // Only add non-empty rows
           result.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c)) {
      result.push(currentRow);
    }
    return result;
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
    const rows = parseFullCsv(cleanText);
    if (rows.length === 0) return;

    const firstLineParts = rows[0];
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
    const updatedMap = new Map<number, InspectionElement>(elements.map(e => [e.id, { ...e }]));

    rows.slice(startIdx).forEach(parts => {
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
      // Create pending assignments instead of applying directly
      const updatedElementsToApply = Array.from(updatedMap.values()).filter(updatedEl => {
        const original = elements.find(e => e.id === updatedEl.id);
        return original && (original.acta !== updatedEl.acta || original.itemCobro !== updatedEl.itemCobro || original.itemDescripcion !== updatedEl.itemDescripcion || original.status !== updatedEl.status);
      });
      
      setPendingAssignments({ updatedElements: updatedElementsToApply, firstActa: firstAssignedActa });
    } else {
      const exampleLabels = elements.slice(0, 6).map(e => e.label).join(', ');
      const msg = `⚠️ No se encontraron elementos coincidentes en la bitácora para asignar.\n\n` +
                  `Verifica que el archivo CSV contenga las etiquetas creadas en tu proyecto (Ej: ${exampleLabels || 'T-01, C-01'}).`;
      if (showToast) showToast('No se encontraron coincidencias en la bitácora para asignar.');
      alert(msg);
    }
  };

  const confirmPendingAssignments = () => {
    if (!pendingAssignments) return;
    pendingAssignments.updatedElements.forEach(el => onUpdateElement(el));
    if (pendingAssignments.firstActa) {
      setSelectedActa(pendingAssignments.firstActa);
    }
    
    if (showToast) showToast(`✅ ¡Asignación exitosa! ${pendingAssignments.updatedElements.length} elementos vinculados a [${pendingAssignments.firstActa || 'Acta'}].`);
    
    setPastedActaCsv('');
    setPendingAssignments(null);
    setShowImportActaModal(false);
  };

  const cancelPendingAssignments = () => {
    setPendingAssignments(null);
  };

  const handleFileUploadActa = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
          handleProcessActaCsvText(csvText);
        } catch (err) {
          const errorMsg = 'Error al leer el archivo Excel.';
          if (showToast) showToast(errorMsg);
          else alert(errorMsg);
        }
      };
      reader.onerror = () => {
        const errorMsg = 'Error al leer el archivo Excel.';
        if (showToast) showToast(errorMsg);
        else alert(errorMsg);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

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

  const handleFileUploadCatalog = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
          handleProcessCatalogCsvText(csvText);
        } catch (err) {
          const errorMsg = 'Error al leer el archivo Excel.';
          if (showToast) showToast(errorMsg);
          else alert(errorMsg);
        }
      };
      reader.onerror = () => {
        const errorMsg = 'Error al leer el archivo Excel.';
        if (showToast) showToast(errorMsg);
        else alert(errorMsg);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleProcessCatalogCsvText(content);
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

  const handleProcessCatalogCsvText = (text: string) => {
    if (!text || !text.trim()) {
      const emptyMsg = 'El contenido del archivo o texto está vacío.';
      if (showToast) showToast(emptyMsg);
      else alert(emptyMsg);
      return;
    }

    const cleanText = text.replace(/^\uFEFF/, '');
    const rows = parseFullCsv(cleanText);
    if (rows.length === 0) return;

    const newItems: ContractualItem[] = [];

    // Skip header if it exists
    const firstLineParts = rows[0];
    let startIdx = 0;
    if (firstLineParts.some(p => {
      const clean = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return clean.includes('item') || clean.includes('descrip') || clean.includes('unid') || clean.includes('cant');
    })) {
      startIdx = 1;
    }

    for (let i = startIdx; i < rows.length; i++) {
      const parts = rows[i];
      if (parts.length >= 4) {
        const item = parts[0].trim();
        const description = parts[1].trim();
        const unit = parts[2].trim();
        // Handle numbers with commas (e.g. 8,00 -> 8.00)
        let budgetStr = parts[3].trim().replace(/\./g, '').replace(',', '.');
        const budgetQuantity = parseFloat(budgetStr) || 0;
        
        if (item && description && item !== 'SUBTOTAL PRELIMINARES' && item !== 'SUBTOTAL ACOMETIDAS' && !item.toLowerCase().includes('subtotal')) {
          newItems.push({ item, description, unit, budgetQuantity });
        }
      }
    }

    if (newItems.length > 0) {
      setContractItems(newItems);
      localStorage.setItem('obra_contract_items_v1', JSON.stringify(newItems));
      window.dispatchEvent(new Event('contractItemsUpdated'));
      if (showToast) showToast(`✅ ¡Catálogo cargado! ${newItems.length} ítems registrados.`);
      else alert(`✅ ¡Catálogo cargado! ${newItems.length} ítems registrados.`);
      setPastedActaCsv('');
      setShowImportActaModal(false);
    } else {
      alert('⚠️ No se pudo procesar el catálogo. Verifica que las columnas sean ITEM, DESCRIPCION, UNIDAD, CANTIDAD_PRESUPUESTO.');
    }
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

  const handleActaDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProjectMeta) return;

    if (file.size > 5 * 1024 * 1024) {
      if (showToast) showToast('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        let fileType = file.type;
        const name = file.name.toLowerCase();
        if (!fileType || fileType === 'application/octet-stream' || fileType === '') {
          if (name.endsWith('.csv')) fileType = 'text/csv';
          else if (name.endsWith('.xlsx') || name.endsWith('.xls')) fileType = 'application/vnd.ms-excel';
          else if (name.endsWith('.pdf')) fileType = 'application/pdf';
          else fileType = 'application/octet-stream';
        }
        
        setPendingActaDocument({ file, dataUrl, type: fileType });
      }
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again if cancelled
    e.target.value = '';
  };

  const handleConfirmActaDocument = () => {
    if (!pendingActaDocument || !onUpdateProjectMeta) return;

    const { file, dataUrl } = pendingActaDocument;
    const currentDocs = projectMeta.actaDocuments || {};
    
    onUpdateProjectMeta({
      ...projectMeta,
      actaDocuments: {
        ...currentDocs,
        [selectedActa]: {
          fileUrl: dataUrl,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    if (showToast) showToast(`Acta cargada exitosamente: ${file.name}`);
    setPendingActaDocument(null);
  };

  const handleCancelActaDocument = () => {
    setPendingActaDocument(null);
  };

  const renderCsvPreview = (dataUrl: string) => {
    try {
      const base64 = dataUrl.split(',')[1];
      // Use decodeURIComponent and escape to handle UTF-8 characters safely
      const decoded = decodeURIComponent(escape(atob(base64)));
      const lines = decoded.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return <div className="p-8 text-slate-500 font-bold">CSV vacío</div>;
  
      const sampleLine = lines[0];
      const semiCount = (sampleLine.match(/;/g) || []).length;
      const commaCount = (sampleLine.match(/,/g) || []).length;
      const tabCount = (sampleLine.match(/\t/g) || []).length;

      let docDelim = ';';
      if (tabCount > semiCount && tabCount > commaCount) docDelim = '\t';
      else if (commaCount > semiCount) docDelim = ',';

      const rows = lines.map(line => line.split(docDelim)); 
      const headers = rows[0];
      const dataRows = rows.slice(1, 101); 
  
      return (
        <div className="w-full h-[400px] overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-100 sticky top-0 shadow-sm">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-2 border-b border-slate-300 font-bold text-slate-700 whitespace-nowrap bg-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-200 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="p-2 text-slate-600 truncate max-w-[200px]" title={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 101 && (
            <div className="text-center p-3 text-slate-500 text-xs italic bg-slate-50 border-t border-slate-200">
              ... y {rows.length - 101} filas más ocultas
            </div>
          )}
        </div>
      );
    } catch (err) {
      return (
        <div className="text-slate-500 flex flex-col items-center gap-2 p-8 text-center">
          <FileText className="w-16 h-16 text-slate-400" />
          <p className="font-bold">Error al leer la vista previa del archivo CSV.</p>
        </div>
      );
    }
  };

  const renderDocumentPreview = (dataUrl: string, fileName: string, fileType?: string) => {
    const match = dataUrl.match(/^data:([^;]+);/);
    const mimeType = fileType || (match ? match[1] : '') || (fileName.toLowerCase().endsWith('.csv') ? 'text/csv' : 'application/octet-stream');

    if (mimeType.startsWith('image/')) {
      return (
        <img 
          src={dataUrl} 
          alt="Vista Previa de Acta" 
          className="max-w-full max-h-[600px] object-contain mx-auto"
        />
      );
    } else if (mimeType === 'application/pdf') {
      return (
        <iframe 
          src={dataUrl} 
          className="w-full h-[600px]" 
          title="Vista Previa de PDF"
        />
      );
    } else if (mimeType === 'text/csv' || (mimeType === 'application/vnd.ms-excel' && fileName.toLowerCase().endsWith('.csv')) || fileName.toLowerCase().endsWith('.csv')) {
      return renderCsvPreview(dataUrl);
    } else {
      return (
        <div className="text-slate-500 flex flex-col items-center gap-2 p-8 text-center bg-white rounded-lg border border-slate-200 w-full">
          <FileText className="w-16 h-16 text-slate-400" />
          <p className="font-bold">Vista previa no disponible para este tipo de archivo.</p>
          <a href={dataUrl} download={fileName} className="mt-2 text-sky-600 hover:underline font-bold text-sm">
            📥 Descargar Archivo
          </a>
        </div>
      );
    }
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
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => {
                  setActaImportTab('catalog');
                  setShowImportActaModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                title="Cargar archivo con el catálogo contractual (ítems de presupuesto)"
              >
                <FileText className="w-4 h-4 text-indigo-200" />
                <span>📋 Cargar Catálogo (Excel/CSV)</span>
              </button>
              {contractItems.length > 0 && (
                <span className="text-[10px] text-indigo-300 font-bold text-center leading-none">{contractItems.length} ítems cargados</span>
              )}
            </div>

            <button
              onClick={handleExportConsolidatedActasExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm active:scale-95"
              title="Generar y descargar el archivo de salida en el formato anexo con columnas por cada Acta (ACTA 1, ACTA 2, ACTA 3, etc.)"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>📊 Excel (Matriz Actas)</span>
            </button>


            <button
              onClick={handleExportMemoriasExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md active:scale-95 active:shadow-sm"
              title="Exportar memorias de cálculo de esta acta a un libro de Excel (una hoja por ítem)"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>📊 Exportar a Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md active:scale-95 active:shadow-sm"
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

          <div className="flex items-center gap-4 flex-wrap">
            {selectedActa !== 'all' && (
              <div className="flex items-center gap-2 border-r border-slate-300 pr-4">
                {projectMeta.actaDocuments?.[selectedActa] ? (
                  <a
                    href={projectMeta.actaDocuments[selectedActa].fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                    title={`Ver documento cargado el ${new Date(projectMeta.actaDocuments[selectedActa].uploadedAt).toLocaleString()}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">{projectMeta.actaDocuments[selectedActa].fileName}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 text-[11px] italic hidden sm:inline-block">Sin soporte cargado</span>
                )}
                
                <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Cargar Archivo del Acta (PDF/Excel)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*,.csv,.xlsx,.xls"
                    onChange={handleActaDocumentUpload}
                  />
                </label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 text-[11px]">Filtrar por Ítem:</span>
              <select
                value={selectedItemNo}
                onChange={(e) => setSelectedItemNo(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[280px]"
              >
                <option value="all">-- Ver Todos los Ítems --</option>
                {(() => {
                  const execItems = filteredForDropdown.filter(g => g.elementsList.some(el => el.status === 'Terminado' || !!el.acta || (el.status === 'En proceso' && el.progressPercent !== undefined && el.progressPercent > 0)));
                  const progItems = filteredForDropdown.filter(g => g.elementsList.some(el => el.status === 'En proceso') && !execItems.includes(g));
                  const otherItems = filteredForDropdown.filter(g => !execItems.includes(g) && !progItems.includes(g));

                  return (
                    <>
                      {execItems.length > 0 && (
                        <optgroup label="Ítems Ejecutados">
                          {execItems.map((item, idx) => (
                            <option key={`exec_${item.itemNo}_${idx}`} value={item.itemNo}>
                              Ítem {item.itemNo} - {item.description.slice(0, 30)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {progItems.length > 0 && (
                        <optgroup label="Ítems en Proceso">
                          {progItems.map((item, idx) => (
                            <option key={`prog_${item.itemNo}_${idx}`} value={item.itemNo}>
                              Ítem {item.itemNo} - {item.description.slice(0, 30)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherItems.length > 0 && (
                        <optgroup label="Otros Ítems">
                          {otherItems.map((item, idx) => (
                            <option key={`other_${item.itemNo}_${idx}`} value={item.itemNo}>
                              Ítem {item.itemNo} - {item.description.slice(0, 30)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
              <select
                value={itemFilterStatus}
                onChange={(e) => {
                  setItemFilterStatus(e.target.value as any);
                  setSelectedItemNo('all');
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 ml-2"
              >
                <option value="all">Estado: Todos</option>
                <option value="executed">Sólo ítems ejecutados</option>
                <option value="in_progress">Sólo ítems en proceso</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-8 bg-slate-50 flex-1 print:p-0 print:bg-white">
          {selectedActa !== 'all' && projectMeta.actaDocuments?.[selectedActa] && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6 print:hidden">
              <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Soporte del Acta Cargado: {projectMeta.actaDocuments[selectedActa].fileName}
                </h3>
              </div>
              <div className="p-0 bg-slate-50 w-full overflow-hidden flex items-center justify-center">
                {renderDocumentPreview(
                  projectMeta.actaDocuments[selectedActa].fileUrl,
                  projectMeta.actaDocuments[selectedActa].fileName
                )}
              </div>
            </div>
          )}

          {displayedItems.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">No hay ítems registrados en el presupuesto o catálogo</h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                El sistema calcula las cantidades automáticamente sumando los elementos del plano según su ítem asociado.<br/><br/>
                <strong>1.</strong> Asegúrate de haber cargado tu presupuesto base desde el botón <strong>Cargar Catálogo (Excel/CSV)</strong>.<br/>
                <strong>2.</strong> Marca los elementos del plano (cámaras, ductos) como <strong>"Terminado"</strong>, asígnales el <strong>{selectedActa}</strong>, y un <strong>Ítem de Cobro</strong> desde la bitácora o la asignación masiva.<br/>
                <br/>
                <em>Nota: El botón "Cargar Archivo del Acta (PDF/Excel)" solo adjunta el documento original como soporte visual, no procesa las cantidades.</em>
              </p>
            </div>
          ) : (
            displayedItems.map((itemGroup, idx) => {
              const noteKey = `${selectedActa}_${itemGroup.itemNo}`;
              const noteVal = sheetNotes[noteKey] || '';

              const filteredElements = itemGroup.elementsList.filter(el => {
                if (itemFilterStatus === 'executed') {
                  return el.status === 'Terminado' || el.acta || (el.status === 'En proceso' && el.progressPercent !== undefined && el.progressPercent > 0);
                }
                if (itemFilterStatus === 'in_progress') {
                  return el.status === 'En proceso';
                }
                return true;
              });

              return (
                <div
                  key={itemGroup.itemNo + '_' + idx}
                  className="bg-white border-2 border-slate-900 rounded-lg p-4 sm:p-6 shadow-sm font-sans flex flex-col space-y-4 print:border-slate-900 print:shadow-none print:break-after-page print:min-h-[1000px]"
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
                            {itemGroup.executedQty.toFixed(2)}
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

                  {/* Middle Section: Plan Location & Photographic Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {/* Middle Box: Plan & Location Excerpt */}
                    <div className="border-2 border-slate-900 rounded p-3 space-y-2 relative bg-slate-50/50 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase">
                          <MapIcon className="w-4 h-4 text-emerald-600" />
                          <span>UBICACIÓN EN PLANO DE OBRA - {selectedActa} (ÍTEM {itemGroup.itemNo})</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {filteredElements.length} elementos vinculados
                        </span>
                      </div>

                      {/* Canvas/Elements Graphic representation */}
                      <div id={`map-capture-${itemGroup.itemNo}`} className="relative bg-slate-900 rounded-lg border border-slate-800 p-4 min-h-[340px] flex flex-col justify-between text-white overflow-hidden flex-1">
                        <MemoriaCanvasMiniature blueprintImg={blueprintImg} elements={filteredElements} />
                        {/* Sub-elements list tags */}
                        <div className="flex flex-wrap gap-2 z-10">
                          {filteredElements.map(el => (
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
                        <div className="mt-4 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-200 text-xs font-mono flex items-center justify-between z-10 relative">
                          <div>
                            <strong className="text-white">{selectedActa}</strong> — Ítem {itemGroup.itemNo}
                          </div>
                          <div className="font-bold text-rose-300">
                            Total Ejecutado: {itemGroup.executedQty.toFixed(2)} {itemGroup.unit}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Photographic Evidence Grid (Anexo Fotográfico) */}
                    <div className="border-2 border-slate-900 rounded p-3 space-y-2 flex flex-col">
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
                      <div id={`photo-capture-${itemGroup.itemNo}`} className="flex-1 flex flex-col relative bg-white">
                      {(() => {
                        const allPhotos: Array<{ 
                          elLabel: string; 
                          photoUrl: string; 
                          date: string; 
                          finding?: string; 
                          stage?: string;
                        }> = [];
                        
                        filteredElements.forEach(el => {
                          const records = getElementPhotoRecords(el);
                          records.forEach(r => {
                            allPhotos.push({
                              elLabel: el.label,
                              photoUrl: r.url,
                              date: r.date,
                              finding: r.finding,
                              stage: r.stage
                            });
                          });
                        });

                        if (allPhotos.length === 0) {
                          return (
                            <div className="p-6 text-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-xs space-y-2 flex-1 flex flex-col justify-center">
                              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="font-bold">No se han adjuntado fotografías de evidencia aún para los elementos de este ítem.</p>
                              <p className="text-[11px] text-slate-400">
                                Puede adjuntar fotos directamente haciendo clic en los elementos del plano o en la bitácora.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 gap-3 flex-1">
                            {allPhotos.map((photoItem, pIdx) => {
                              const badgeStyle = getStageBadgeStyle(photoItem.stage);
                              return (
                                <div key={pIdx} className="border border-slate-300 rounded overflow-hidden bg-slate-50 flex flex-col shadow-xs">
                                  <img
                                    src={photoItem.photoUrl}
                                    alt={`Evidencia ${photoItem.elLabel}`}
                                    className="w-full flex-1 object-cover min-h-[140px] max-h-[260px]"
                                  />
                                  <div className="p-2 bg-slate-900 text-white text-[10px] flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-sky-300 truncate">
                                        {photoItem.elLabel}
                                      </span>
                                      <span className="text-amber-300 font-mono text-[9px] shrink-0">
                                        📅 {formatFindingDate(photoItem.date)}
                                      </span>
                                    </div>
                                    {photoItem.finding && (
                                      <p className="text-[9px] text-slate-300 bg-slate-950/80 rounded px-1.5 py-0.5 border border-slate-800 line-clamp-2">
                                        <strong>Hallazgo:</strong> {photoItem.finding}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      </div>
                    </div>
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

                  {/* DETALLE DE ELEMENTOS (MEMORIA DE CÁLCULO) */}
                  <div className="border-2 border-slate-900 rounded overflow-hidden">
                    <div className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider py-1.5 px-3 text-center">
                      DETALLE DE ELEMENTOS (MEMORIA DE CÁLCULO)
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-700 text-white font-bold text-[11px]">
                          <th className="py-1.5 px-3 text-center border-r border-slate-600 w-24">Etiqueta</th>
                          <th className="py-1.5 px-3 border-r border-slate-600">Tipo</th>
                          <th className="py-1.5 px-3 text-center border-r border-slate-600 w-28">Estado</th>
                          <th className="py-1.5 px-3 text-center border-r border-slate-600 w-24">Avance</th>
                          <th className="py-1.5 px-3 text-right w-36">Cantidad Aportada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredElements.map((el, eIdx) => {
                          let baseQty = el.type === 'line' ? (el.meters || 1) : 1;
                          let aportada = 0;
                          if (el.status === 'Terminado') {
                            aportada = baseQty;
                          } else if (el.status === 'En proceso') {
                            if (el.progressPercent !== undefined) {
                              aportada = baseQty * (el.progressPercent / 100);
                            }
                          } else if (el.acta) {
                            aportada = baseQty;
                          }

                          return (
                            <tr key={el.id || eIdx} className={`border-b border-slate-200 ${eIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="py-1.5 px-3 text-center font-bold text-slate-900 border-r border-slate-200">
                                {el.label}
                              </td>
                              <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200">
                                {el.camType || el.pipes || (el.type === 'line' ? 'Canalización' : 'Cámara')}
                              </td>
                              <td className="py-1.5 px-3 text-center border-r border-slate-200">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  el.status === 'Terminado' ? 'bg-emerald-100 text-emerald-800' : (el.status === 'En proceso' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                                }`}>
                                  {el.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200">
                                {el.status === 'En proceso' && el.progressPercent !== undefined ? `${el.progressPercent}%` : (el.status === 'Terminado' ? '100%' : '100%')}
                              </td>
                              <td className="py-1.5 px-3 text-right font-black text-emerald-700">
                                {aportada.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-emerald-50 font-black text-xs text-emerald-900 border-t-2 border-slate-900">
                          <td colSpan={4} className="py-2 px-3 text-right uppercase">
                            TOTAL APORTADO AL ÍTEM:
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-800 text-sm">
                            {filteredElements.reduce((acc, el) => {
                              let baseQty = el.type === 'line' ? (el.meters || 1) : 1;
                              if (el.status === 'Terminado') return acc + baseQty;
                              if (el.status === 'En proceso' && el.progressPercent !== undefined) return acc + (baseQty * el.progressPercent / 100);
                              if (el.acta) return acc + baseQty;
                              return acc;
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
                    <h3 className="font-bold text-base text-white">
                      {actaImportTab === 'catalog' ? 'Cargar Catálogo Contractual' : 'Importar Asignaciones de Elementos (CSV)'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {actaImportTab === 'catalog' ? 'Sube el presupuesto oficial del contrato' : 'Importa asignaciones por CSV o realiza asignaciones en lote'}
                    </p>
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
                <button
                  onClick={() => setActaImportTab('catalog')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                    actaImportTab === 'catalog'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Cargar Catálogo</span>
                </button>
              </div>

              {/* Sub-Tab 1: Upload CSV / Paste */}
              {actaImportTab === 'upload' && (
                <div className="space-y-4 text-xs">
                  {pendingAssignments ? (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Check className="w-5 h-5" />
                        <h4 className="font-bold text-sm">Vista Previa de Asignaciones ({pendingAssignments.updatedElements.length})</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Se detectaron {pendingAssignments.updatedElements.length} asignaciones de elementos en tu archivo. Por favor verifica que la información es correcta antes de confirmar.
                      </p>
                      
                      <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-800 sticky top-0 shadow-sm">
                            <tr>
                              <th className="p-2 border-b border-slate-700 font-bold text-slate-300">Etiqueta</th>
                              <th className="p-2 border-b border-slate-700 font-bold text-slate-300">Acta a Asignar</th>
                              <th className="p-2 border-b border-slate-700 font-bold text-slate-300">Ítem de Cobro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingAssignments.updatedElements.slice(0, 50).map((el, idx) => (
                              <tr key={idx} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                <td className="p-2 font-bold text-slate-200">{el.label}</td>
                                <td className="p-2 text-emerald-400 font-bold">{el.acta}</td>
                                <td className="p-2 text-amber-300">{el.itemCobro}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {pendingAssignments.updatedElements.length > 50 && (
                          <div className="text-center p-2 text-slate-500 bg-slate-800 text-[10px]">
                            ... {pendingAssignments.updatedElements.length - 50} filas más ocultas
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={cancelPendingAssignments}
                          className="px-4 py-2 font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          Cancelar y Volver
                        </button>
                        <button
                          onClick={confirmPendingAssignments}
                          className="px-4 py-2 font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition shadow-md flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar Asignaciones
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">1. Subir Archivo (Excel o CSV)</span>
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
                          <span className="font-bold text-white text-xs">Haz clic para seleccionar o arrastra tu archivo Excel/CSV aquí</span>
                          <span className="text-[10px] text-slate-400">Columnas esperadas: ID_o_Etiqueta, Acta, ItemCobro, ItemDescripcion</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv, .txt"
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
                          <span>Previsualizar Asignaciones</span>
                        </button>
                      </div>
                    </>
                  )}
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
                      {contractItems.map((ci, idx) => (
                        <option key={`${ci.item}_${idx}`} value={ci.item}>
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

              {/* Sub-Tab 3: Load Catalog */}
              {actaImportTab === 'catalog' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200">Cargar Catálogo Contractual (Excel/CSV)</h4>
                    <p className="text-slate-400">Sube un archivo de Excel (.xlsx) o CSV con los ítems y cantidades de tu contrato. Este catálogo reemplazará la lista actual y se guardará localmente para el proyecto.</p>
                    <p className="text-slate-500 italic">Columnas esperadas: ITEM, DESCRIPCION, UNIDAD, CANTIDAD (las cantidades decimales pueden usar coma o punto).</p>
                  </div>
                  
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUploadCatalog(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
                      dragActive
                        ? 'border-emerald-500 bg-emerald-950/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <FileUp className="w-7 h-7 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Haz clic para seleccionar o arrastra tu Catálogo Excel/CSV aquí</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, .txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUploadCatalog(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 block">O Copiar y Pegar Texto desde Excel:</span>
                    <textarea
                      rows={4}
                      value={pastedActaCsv}
                      onChange={(e) => setPastedActaCsv(e.target.value)}
                      placeholder={'Ejemplo:\n1.1;EXCAVACION MANUAL;M3;500.5\n1.2;RELLENO COMPACTADO;M3;400'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleProcessCatalogCsvText(pastedActaCsv)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Procesar Catálogo</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Acta Document Confirmation Modal */}
        {pendingActaDocument && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Confirmar Soporte de Acta: {selectedActa}
                </h3>
                <button onClick={handleCancelActaDocument} className="text-slate-400 hover:text-red-500 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 flex-1 flex flex-col items-center bg-slate-100 min-h-[300px] max-h-[60vh] overflow-auto">
                <div className="mb-4 text-center">
                  <p className="text-slate-600 font-medium text-sm">Estás a punto de adjuntar el siguiente documento:</p>
                  <p className="font-bold text-slate-800">{pendingActaDocument.file.name}</p>
                </div>
                
                <div className="w-full flex-1 rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-white flex items-center justify-center relative">
                  {pendingActaDocument.type.startsWith('image/') ? (
                    <img 
                      src={pendingActaDocument.dataUrl} 
                      alt="Vista Previa de Acta" 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : pendingActaDocument.type === 'application/pdf' ? (
                    <iframe 
                      src={pendingActaDocument.dataUrl} 
                      className="w-full h-[500px]" 
                      title="Vista Previa de PDF"
                    />
                  ) : (pendingActaDocument.type === 'text/csv' || (pendingActaDocument.type === 'application/vnd.ms-excel' && pendingActaDocument.file.name.toLowerCase().endsWith('.csv')) || pendingActaDocument.file.name.toLowerCase().endsWith('.csv')) ? (
                    renderCsvPreview(pendingActaDocument.dataUrl)
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center gap-2 p-8 text-center">
                      <FileText className="w-16 h-16 text-slate-400" />
                      <p className="font-bold">Vista previa no disponible para este tipo de archivo.</p>
                      <p className="text-sm">El archivo se guardará correctamente.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={handleCancelActaDocument}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmActaDocument}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-md flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Confirmar Carga
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
