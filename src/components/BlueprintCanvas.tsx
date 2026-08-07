import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { AreaSector, FreehandStroke, InspectionElement, Point, CameraNorm, ProjectMeta } from '../types';
import { ToolType } from './CanvasToolbar';
import { adjustTramoMeters } from '../utils/tramoUtils';
import { Plus, Minus, Ruler } from 'lucide-react';

export interface BlueprintCanvasRef {
  exportAnnotatedBlueprintPNG: (projectMeta?: ProjectMeta) => void;
  resetView: () => void;
}

interface BlueprintCanvasProps {
  ref?: React.Ref<BlueprintCanvasRef>;
  blueprintImg: HTMLImageElement | null;
  currentTool: ToolType;
  strokes: FreehandStroke[];
  elements: InspectionElement[];
  areas: AreaSector[];
  zoomLevel: number;
  iconScale?: number;
  showCameraLabels: boolean;
  showLineLabels: boolean;
  showAreaLabels: boolean;
  showSpecsLabels?: boolean;
  camPrefix: string;
  camCounter: number;
  camDefaultType: CameraNorm;
  // Area drawing state
  currentAreaPoints: Point[];
  onAddAreaPoint: (point: Point) => void;
  onFinishArea: () => void;
  // Handlers for user interactions
  onAddStroke: (stroke: FreehandStroke) => void;
  onAddElement: (element: InspectionElement) => void;
  onUpdateElement?: (element: InspectionElement) => void;
  onEraseAt: (point: Point) => void;
  onInspectElement: (element: InspectionElement) => void;
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  ref,
  blueprintImg,
  currentTool,
  strokes,
  elements,
  areas,
  zoomLevel,
  iconScale = 1.6,
  showCameraLabels,
  showLineLabels,
  showAreaLabels,
  showSpecsLabels = true,
  camPrefix,
  camCounter,
  camDefaultType,
  currentAreaPoints,
  onAddAreaPoint,
  onFinishArea,
  onAddStroke,
  onAddElement,
  onUpdateElement,
  onEraseAt,
  onInspectElement
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan State
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef<Point>({ x: 0, y: 0 });

  // Element Dragging State
  const draggedElementRef = useRef<{
    id: number;
    part: 'camera' | 'line-start' | 'line-end' | 'line-body';
    startCanvasPos: Point;
    origX: number;
    origY: number;
    origX2?: number;
    origY2?: number;
    hasMoved: boolean;
  } | null>(null);
  const [hoveredElementInfo, setHoveredElementInfo] = useState<{ id: number; part: string } | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<Point[]>([]);
  const straightLineStartRef = useRef<Point | null>(null);
  const [straightLinePreview, setStraightLinePreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [areaMousePos, setAreaMousePos] = useState<Point | null>(null);

  const SNAP_RADIUS = 25;

  // Coordinate conversion helper
  const getCanvasCoords = useCallback((clientX: number, clientY: number): { x: number; y: number; rawX: number; rawY: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, rawX: 0, rawY: 0 };

    const rect = canvas.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasRawX = rawX * scaleX;
    const canvasRawY = rawY * scaleY;

    const x = (canvasRawX - panX) / zoomLevel;
    const y = (canvasRawY - panY) / zoomLevel;

    return { x, y, rawX: canvasRawX, rawY: canvasRawY };
  }, [panX, panY, zoomLevel]);

  // Point in polygon test
  const pointInPolygon = (px: number, py: number, points: Point[]) => {
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

  // Label badge renderer
  const drawLabelBadge = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    labelText: string, 
    colorHex: string,
    subText?: string,
    scale: number = 1.6
  ) => {
    ctx.save();
    const titleFontSize = Math.max(11, Math.round(11 * (scale * 0.8)));
    const subFontSize = Math.max(9, Math.round(9 * (scale * 0.8)));

    ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
    const textMetrics = ctx.measureText(labelText);

    let subWidth = 0;
    if (subText) {
      ctx.font = `${subFontSize}px "JetBrains Mono", monospace, sans-serif`;
      subWidth = ctx.measureText(subText).width;
    }

    const dotSize = Math.max(6, Math.round(6 * (scale * 0.8)));
    const paddingX = Math.max(8, Math.round(10 * (scale * 0.8)));
    const contentWidth = Math.max(textMetrics.width, subWidth) + dotSize + Math.round(6 * (scale * 0.8));
    const bgWidth = contentWidth + paddingX * 2;
    const bgHeight = subText ? Math.round(32 * (scale * 0.8)) : Math.round(20 * (scale * 0.8));
    const cornerRadius = Math.max(5, Math.round(6 * (scale * 0.8)));

    // Subtle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(8 * (scale * 0.8));
    ctx.shadowOffsetY = Math.round(3 * (scale * 0.8));

    // Background rounded rectangle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, cornerRadius);
    ctx.fill();

    // Reset shadow for sharp lines & text
    ctx.shadowColor = 'transparent';

    // Border outline with status color
    ctx.strokeStyle = colorHex || '#38bdf8';
    ctx.lineWidth = Math.max(1.5, 1.5 * (scale * 0.8));
    ctx.stroke();

    // Status indicator dot
    const dotX = x - bgWidth / 2 + paddingX + dotSize / 2;
    const dotY = subText ? y - Math.round(6 * (scale * 0.8)) : y;

    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = colorHex || '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text rendering
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textX = dotX + dotSize / 2 + Math.round(5 * (scale * 0.8));

    if (subText) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(labelText, textX, y - Math.round(6 * (scale * 0.8)));

      ctx.fillStyle = '#fbbf24'; // Warm amber highlight for specs
      ctx.font = `${subFontSize}px "JetBrains Mono", monospace, sans-serif`;
      ctx.fillText(subText, x - bgWidth / 2 + paddingX, y + Math.round(8 * (scale * 0.8)));
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(labelText, textX, y);
    }

    ctx.restore();
  }, []);

  // Camera badge renderer with vector camera icon
  const drawCameraBadge = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    labelText: string,
    colorHex: string,
    status: string,
    size: number = 10,
    showLabel: boolean,
    subText?: string,
    scale: number = 1.6
  ) => {
    ctx.save();

    // Base circular badge diameter scaled for high human visibility
    const iconRadius = Math.max((size + 4) * scale, 18 * scale);

    // Outer glow shadow
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 10 * scale;

    // Outer dark background badge
    ctx.beginPath();
    ctx.arc(x, y, iconRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a'; // Deep dark slate background
    ctx.fill();

    ctx.shadowColor = 'transparent'; // turn off blur for sharp vector icon

    // Status colored border ring
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(2.5, 3 * scale);
    ctx.stroke();

    // Outer dashed locator ring
    ctx.beginPath();
    ctx.arc(x, y, iconRadius + 5 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);

    // DRAW VECTOR FLOOR INSPECTION CHAMBER (CÁMARA DE PISO) ICON
    ctx.save();
    const boxSize = 14 * scale;
    const boxX = x - boxSize / 2;
    const boxY = y - boxSize / 2;
    const rimMargin = 2.2 * scale;

    // 1. Outer Box Metallic Frame (Marco en ángulo)
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, 2 * scale);
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.stroke();

    // 2. Concrete Lid Plate (Tapa de concreto interior)
    const lidX = boxX + rimMargin;
    const lidY = boxY + rimMargin;
    const lidSize = boxSize - rimMargin * 2;

    ctx.beginPath();
    ctx.roundRect(lidX, lidY, lidSize, lidSize, 1 * scale);
    ctx.fillStyle = '#0f172a'; // Deep slate chamber interior
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(0.8, 1 * scale);
    ctx.stroke();

    // 3. Concrete Rebar Grid Pattern (Malla electro-soldada / 5 Ø 3/8 ambos sentidos)
    ctx.beginPath();
    // Horizontal grid line
    ctx.moveTo(lidX + 1.5 * scale, y);
    ctx.lineTo(lidX + lidSize - 1.5 * scale, y);
    // Vertical grid line
    ctx.moveTo(x, lidY + 1.5 * scale);
    ctx.lineTo(x, lidY + lidSize - 1.5 * scale);

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.stroke();

    // 4. Corner Anchors & Perspective Chamfers (Anclajes de marco / Profundidad pozo)
    ctx.beginPath();
    // Top-left
    ctx.moveTo(boxX + 0.5 * scale, boxY + 0.5 * scale);
    ctx.lineTo(lidX, lidY);
    // Top-right
    ctx.moveTo(boxX + boxSize - 0.5 * scale, boxY + 0.5 * scale);
    ctx.lineTo(lidX + lidSize, lidY);
    // Bottom-left
    ctx.moveTo(boxX + 0.5 * scale, boxY + boxSize - 0.5 * scale);
    ctx.lineTo(lidX, lidY + lidSize);
    // Bottom-right
    ctx.moveTo(boxX + boxSize - 0.5 * scale, boxY + boxSize - 0.5 * scale);
    ctx.lineTo(lidX + lidSize, lidY + lidSize);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(0.8, 1 * scale);
    ctx.stroke();

    // 5. Placa de Identificación / Norma (MT, BT, D)
    const upperSub = (subText || '').toUpperCase();
    let normCode = '';
    let normColor = '#f59e0b';

    if (upperSub.includes('MT')) {
      normCode = 'MT';
      normColor = '#d946ef'; // Magenta
    } else if (upperSub.includes('D') && !upperSub.includes('MOD') && !upperSub.includes('ADD')) {
      normCode = 'D';
      normColor = '#3b82f6'; // Blue
    } else if (upperSub.includes('BT')) {
      normCode = 'BT';
      normColor = '#10b981'; // Green / Magenta
    }

    if (normCode) {
      ctx.fillStyle = normColor;
      ctx.font = `black ${Math.round(6 * scale)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(normCode, x, y);
    } else {
      const tagW = 3.2 * scale;
      const tagH = 1.8 * scale;
      ctx.beginPath();
      ctx.roundRect(lidX + 1 * scale, lidY + 1 * scale, tagW, tagH, 0.5 * scale);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }

    ctx.restore();

    // Small Glowing Status Dot at top right (45 degrees)
    const dotAngle = -Math.PI / 4;
    const statusX = x + Math.cos(dotAngle) * iconRadius;
    const statusY = y + Math.sin(dotAngle) * iconRadius;

    ctx.beginPath();
    ctx.arc(statusX, statusY, 4.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, 1.8 * scale);
    ctx.stroke();

    // Label Badge below if enabled
    if (showLabel) {
      const badgeY = y + iconRadius + 18 * scale;

      // Leader line connecting camera node to label
      ctx.beginPath();
      ctx.moveTo(x, y + iconRadius + 2 * scale);
      ctx.lineTo(x, badgeY - 10 * scale);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = Math.max(1.5, 1.8 * scale);
      ctx.setLineDash([2 * scale, 2 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawLabelBadge(ctx, x, badgeY, labelText, colorHex, subText, scale);
    }

    ctx.restore();
  }, [drawLabelBadge]);

  // Conduit line renderer with industrial pipe casing and terminal nodes
  const drawLineElement = useCallback((
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    meters: number,
    colorHex: string,
    photosCount: number,
    showLabel: boolean,
    showSpecs: boolean,
    pipes?: string,
    cables?: string,
    scale: number = 1.6,
    acta?: string
  ) => {
    ctx.save();

    // 1. Outer Conduit Pipe Casing (Dark slate background with glow)
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 6 * scale;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(8, 12 * scale);
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // 2. Main Pipe Body
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(4, 6 * scale);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Inner Duct Core Stripe (gives realistic industrial conduit feel)
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.setLineDash([6 * scale, 5 * scale]);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Terminal Connection Boxes / Nodes at endpoints
    const drawTerminalNode = (nx: number, ny: number) => {
      ctx.save();
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 4 * scale;

      const nodeRadius = Math.max(6, 8.5 * scale);
      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = Math.max(1.5, 2.2 * scale);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    };

    drawTerminalNode(x1, y1);
    drawTerminalNode(x2, y2);

    // 5. Midpoint Label Badge
    if (showLabel) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const photoStr = photosCount > 0 ? ` 📷${photosCount}` : '';

      let subStr: string | undefined = undefined;
      if (showSpecs) {
        const parts = [];
        if (acta) parts.push(`[${acta}]`);
        if (pipes) parts.push(`Tub: ${pipes}`);
        if (cables) parts.push(`Cab: ${cables}`);
        if (parts.length > 0) subStr = parts.join(' | ');
      }

      drawLabelBadge(ctx, midX, midY, `${label} (${meters || 0}m)${photoStr}`, colorHex, subStr, scale);
    }

    ctx.restore();
  }, [drawLabelBadge]);

  // Imperative handle for exporting annotated PNG image with full metrajes, pipes & cables specs
  const exportAnnotatedBlueprintPNG = useCallback((projectMeta?: ProjectMeta) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Background blueprint image or dark grid
    if (blueprintImg && blueprintImg.complete && blueprintImg.width > 0) {
      ctx.drawImage(blueprintImg, 0, 0);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < exportCanvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, exportCanvas.height); ctx.stroke();
      }
      for (let y = 0; y < exportCanvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(exportCanvas.width, y); ctx.stroke();
      }
    }

    // 2. Sectors
    areas.forEach(area => {
      if (area.points.length < 3) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) ctx.lineTo(area.points[i].x, area.points[i].y);
      ctx.closePath();
      ctx.fillStyle = area.color.fill;
      ctx.fill();
      ctx.strokeStyle = area.color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      let cx = 0, cy = 0;
      area.points.forEach(p => { cx += p.x; cy += p.y; });
      cx /= area.points.length;
      cy /= area.points.length;
      const dimStr = area.calculatedAreaM2 ? ` (${area.calculatedAreaM2} m²)` : '';
      drawLabelBadge(ctx, cx, cy, `${area.name}${dimStr}`, area.color.stroke);
      ctx.restore();
    });

    // 3. Freehand strokes
    strokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.strokeStyle = s.color || 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = s.width || 12;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    });

    // 4. Inspection Elements
    elements.forEach(el => {
      let colorHex = '#94a3b8';
      if (el.status === 'En proceso') colorHex = '#f59e0b';
      if (el.status === 'Terminado') colorHex = '#10b981';

      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        drawLineElement(
          ctx,
          el.x,
          el.y,
          el.x2,
          el.y2,
          el.label,
          el.meters || 0,
          colorHex,
          el.photos?.length || 0,
          true,
          true,
          el.pipes,
          el.cables,
          iconScale,
          el.acta
        );
      } else if (el.type === 'camera') {
        const photoStr = el.photos && el.photos.length > 0 ? ` 📷${el.photos.length}` : '';
        const actaItemTag = [el.acta, el.itemCobro ? `Ítem ${el.itemCobro}` : ''].filter(Boolean).join(' | ');
        const camSubStr = [actaItemTag ? `[${actaItemTag}]` : '', el.camType].filter(Boolean).join(' ');
        const statusLabel = el.status === 'En proceso' && el.progressPercent !== undefined ? `En proceso (${el.progressPercent}%)` : el.status;
        drawCameraBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.size || 10, true, camSubStr, iconScale);
      }
    });

    // 5. Official Legend Stamp Box at bottom right
    const boxW = 350;
    const boxH = 130;
    const boxX = exportCanvas.width - boxW - 20;
    const boxY = exportCanvas.height - boxH - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('LEYENDA DE SEGUIMIENTO Y CONTROL DE OBRA', boxX + 14, boxY + 22);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`CONTRATISTA: ${projectMeta?.contractorName || 'Control de Canalizaciones'}`, boxX + 14, boxY + 42);
    ctx.fillText(`UBICACIÓN: ${projectMeta?.sectorLocation || 'Sector Principal'}`, boxX + 14, boxY + 57);

    const totalMeters = elements.filter(e => e.type === 'line').reduce((sum, e) => sum + (e.meters || 0), 0);
    const totalCams = elements.filter(e => e.type === 'camera').length;
    const completedM = elements.filter(e => e.type === 'line' && e.status === 'Terminado').reduce((sum, e) => sum + (e.meters || 0), 0);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(`METRAJE TOTAL: ${totalMeters} m  |  CÁMARAS: ${totalCams}`, boxX + 14, boxY + 77);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`AVANCE EJECUTADO: ${completedM} m (${totalMeters > 0 ? Math.round((completedM / totalMeters) * 100) : 0}%)`, boxX + 14, boxY + 95);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`FECHA: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, boxX + 14, boxY + 115);
    ctx.restore();

    // Trigger download
    const link = document.createElement('a');
    link.download = `Plano_Obra_${(projectMeta?.sectorLocation || 'Anotado').replace(/\s+/g, '_')}_Metrajes.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [blueprintImg, areas, strokes, elements, drawLabelBadge, drawCameraBadge]);

  // View resetting callback
  const resetView = useCallback(() => {
    setPanX(0);
    setPanY(0);
  }, []);

  // Automatically reset pan offset when blueprint image changes
  useEffect(() => {
    resetView();
  }, [blueprintImg, resetView]);

  useImperativeHandle(ref, () => ({
    exportAnnotatedBlueprintPNG,
    resetView
  }), [exportAnnotatedBlueprintPNG, resetView]);

  // Main Canvas Render Loop
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    // 1. Background blueprint image
    if (blueprintImg && blueprintImg.complete && blueprintImg.width > 0) {
      ctx.drawImage(blueprintImg, 0, 0);
    } else {
      // Default dark grid background if no custom blueprint image loaded yet
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLANO INTERACTIVO DE SEGUIMIENTO Y CONTROL', canvas.width / 2, canvas.height / 2);
    }

    // 2. Saved Sector Polygons
    areas.forEach(area => {
      if (area.points.length < 3) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = area.color.fill;
      ctx.fill();
      ctx.strokeStyle = area.color.stroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (showAreaLabels) {
        let cx = 0, cy = 0;
        area.points.forEach(p => { cx += p.x; cy += p.y; });
        cx /= area.points.length;
        cy /= area.points.length;

        const dimStr = area.calculatedAreaM2 ? ` (${area.calculatedAreaM2} m²)` : (area.widthMeters && area.lengthMeters ? ` (${area.widthMeters}x${area.lengthMeters}m)` : '');
        const labelStr = area.code ? `[${area.code}] ${area.name}${dimStr}` : `${area.name}${dimStr}`;
        drawLabelBadge(ctx, cx, cy, labelStr, area.color.stroke);
      }
      ctx.restore();
    });

    // 3. Active Area polygon in progress
    if (currentAreaPoints.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(currentAreaPoints[0].x, currentAreaPoints[0].y);
      for (let i = 1; i < currentAreaPoints.length; i++) {
        ctx.lineTo(currentAreaPoints[i].x, currentAreaPoints[i].y);
      }

      if (areaMousePos && currentTool === 'area') {
        if (currentAreaPoints.length >= 3) {
          const startPt = currentAreaPoints[0];
          const dist = Math.hypot(areaMousePos.x - startPt.x, areaMousePos.y - startPt.y);
          if (dist <= SNAP_RADIUS) {
            ctx.lineTo(startPt.x, startPt.y);
          } else {
            ctx.lineTo(areaMousePos.x, areaMousePos.y);
          }
        } else {
          ctx.lineTo(areaMousePos.x, areaMousePos.y);
        }
      }

      if (currentAreaPoints.length >= 2) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.fill();
      }

      ctx.strokeStyle = '#9333ea';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      currentAreaPoints.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, index === 0 ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#10b981' : '#a855f7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      ctx.restore();
    }

    // 4. Freehand strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    });

    // 5. Active Freehand Preview
    if (isDrawing && currentTool === 'highlight' && currentPathRef.current.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
      for (let i = 1; i < currentPathRef.current.length; i++) {
        ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
      }
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // 6. Inspection Elements (Conduit lines & Cameras)
    elements.forEach(el => {
      let colorHex = '#94a3b8'; // Pendiente
      if (el.status === 'En proceso') colorHex = '#f59e0b';
      if (el.status === 'Terminado') colorHex = '#10b981';

      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        drawLineElement(
          ctx,
          el.x,
          el.y,
          el.x2,
          el.y2,
          el.label,
          el.meters || 0,
          colorHex,
          el.photos?.length || 0,
          showLineLabels,
          showSpecsLabels,
          el.pipes,
          el.cables,
          iconScale,
          el.acta
        );
      } else if (el.type === 'camera') {
        const photoStr = el.photos && el.photos.length > 0 ? ` 📷${el.photos.length}` : '';
        const actaItemTag = [el.acta, el.itemCobro ? `Ítem ${el.itemCobro}` : ''].filter(Boolean).join(' | ');
        const camSubStr = showSpecsLabels ? [actaItemTag ? `[${actaItemTag}]` : '', el.camType].filter(Boolean).join(' ') : undefined;
        const statusLabel = el.status === 'En proceso' && el.progressPercent !== undefined ? `En proceso (${el.progressPercent}%)` : el.status;
        drawCameraBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.size || 10, showCameraLabels, camSubStr, iconScale);
      }
    });

    // 7. Straight Line Preview
    if (isDrawing && currentTool === 'straight' && straightLinePreview) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(straightLinePreview.x1, straightLinePreview.y1);
      ctx.lineTo(straightLinePreview.x2, straightLinePreview.y2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 8. Interactive Drag Handles / Active Selection Highlight in Pan Mode
    if (currentTool === 'pan') {
      elements.forEach(el => {
        const isHovered = hoveredElementInfo?.id === el.id;
        const isDragged = draggedElementRef.current?.id === el.id;

        if (isHovered || isDragged) {
          ctx.save();
          if (el.type === 'camera') {
            const rad = Math.max((el.size || 10) + 6, 18) * iconScale + 4;
            ctx.beginPath();
            ctx.arc(el.x, el.y, rad, 0, Math.PI * 2);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
            // Draw highlight casing around conduit
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x2, el.y2);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = Math.max(12, 16 * iconScale);
            ctx.lineCap = 'round';
            ctx.stroke();

            // Draw endpoint grab handles
            const drawEndpointHandle = (hx: number, hy: number, active: boolean) => {
              ctx.beginPath();
              ctx.arc(hx, hy, Math.max(7, 9 * iconScale), 0, Math.PI * 2);
              ctx.fillStyle = active ? '#38bdf8' : '#0f172a';
              ctx.fill();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.stroke();
            };

            const isStartActive = (isHovered && hoveredElementInfo?.part === 'line-start') || (isDragged && draggedElementRef.current?.part === 'line-start');
            const isEndActive = (isHovered && hoveredElementInfo?.part === 'line-end') || (isDragged && draggedElementRef.current?.part === 'line-end');

            drawEndpointHandle(el.x, el.y, isStartActive);
            drawEndpointHandle(el.x2, el.y2, isEndActive);
          }
          ctx.restore();
        }
      });
    }

    ctx.restore();
  }, [
    blueprintImg,
    panX,
    panY,
    zoomLevel,
    areas,
    showAreaLabels,
    currentAreaPoints,
    areaMousePos,
    currentTool,
    strokes,
    isDrawing,
    elements,
    showLineLabels,
    showCameraLabels,
    showSpecsLabels,
    straightLinePreview,
    drawCameraBadge,
    drawLineElement,
    iconScale,
    hoveredElementInfo,
    isDraggingElement
  ]);

  // Helper distance calculation
  const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Find camera or line hit part at canvas coordinate
  const findHitPart = useCallback((x: number, y: number): { element: InspectionElement; part: 'camera' | 'line-start' | 'line-end' | 'line-body' } | null => {
    // Check cameras first (caja de inspección)
    for (const el of elements) {
      if (el.type === 'camera') {
        const radius = Math.max((el.size || 10) + 8, 20) * iconScale;
        if (Math.hypot(el.x - x, el.y - y) <= radius) {
          return { element: el, part: 'camera' };
        }
      }
    }
    // Check lines (tramo / canalización)
    for (const el of elements) {
      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        const handleRadius = Math.max(14, 16 * iconScale);
        if (Math.hypot(el.x - x, el.y - y) <= handleRadius) {
          return { element: el, part: 'line-start' };
        }
        if (Math.hypot(el.x2 - x, el.y2 - y) <= handleRadius) {
          return { element: el, part: 'line-end' };
        }

        const dist = pointToSegmentDistance(x, y, el.x, el.y, el.x2, el.y2);
        if (dist <= Math.max(12, 14 * iconScale)) {
          return { element: el, part: 'line-body' };
        }
      }
    }
    return null;
  }, [elements, iconScale]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Adjust canvas size when container or blueprint dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (blueprintImg && blueprintImg.width > 0) {
      if (canvas.width !== blueprintImg.width) canvas.width = blueprintImg.width;
      if (canvas.height !== blueprintImg.height) canvas.height = blueprintImg.height;
    } else {
      const targetW = container.clientWidth || 1000;
      const targetH = container.clientHeight || 650;
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;
    }
  }, [blueprintImg]);

  // Mouse / Touch Event Handlers
  const handleMouseDown = (clientX: number, clientY: number) => {
    const pos = getCanvasCoords(clientX, clientY);

    if (currentTool === 'pan') {
      const hit = findHitPart(pos.x, pos.y);
      if (hit) {
        draggedElementRef.current = {
          id: hit.element.id,
          part: hit.part,
          startCanvasPos: { x: pos.x, y: pos.y },
          origX: hit.element.x,
          origY: hit.element.y,
          origX2: hit.element.x2,
          origY2: hit.element.y2,
          hasMoved: false
        };
        setIsDraggingElement(true);
        return;
      }

      setIsPanning(true);
      startPanRef.current = { x: pos.rawX - panX, y: pos.rawY - panY };
    } else if (currentTool === 'highlight') {
      setIsDrawing(true);
      currentPathRef.current = [{ x: pos.x, y: pos.y }];
    } else if (currentTool === 'straight') {
      setIsDrawing(true);
      straightLineStartRef.current = { x: pos.x, y: pos.y };
      setStraightLinePreview({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    } else if (currentTool === 'camera') {
      const camLabel = `${camPrefix}${String(camCounter).padStart(2, '0')}`;
      const newEl: InspectionElement = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        type: 'camera',
        label: camLabel,
        status: 'Pendiente',
        x: pos.x,
        y: pos.y,
        size: 9,
        camType: camDefaultType,
        voltage: 220,
        signalStrength: 90,
        date: new Date().toISOString().split('T')[0]
      };
      onAddElement(newEl);
    } else if (currentTool === 'area') {
      if (currentAreaPoints.length >= 3) {
        const startPt = currentAreaPoints[0];
        const distToStart = Math.hypot(pos.x - startPt.x, pos.y - startPt.y);
        if (distToStart <= SNAP_RADIUS) {
          onFinishArea();
          return;
        }
      }
      onAddAreaPoint({ x: pos.x, y: pos.y });
    } else if (currentTool === 'eraser') {
      setIsDrawing(true);
      onEraseAt({ x: pos.x, y: pos.y });
    }
  };

  const handleMouseMove = (clientX: number, clientY: number) => {
    const pos = getCanvasCoords(clientX, clientY);

    if (currentTool === 'area') {
      setAreaMousePos({ x: pos.x, y: pos.y });
    }

    // Element Dragging Logic
    if (draggedElementRef.current && currentTool === 'pan') {
      const drag = draggedElementRef.current;
      const dx = pos.x - drag.startCanvasPos.x;
      const dy = pos.y - drag.startCanvasPos.y;

      if (Math.hypot(dx, dy) > 3) {
        drag.hasMoved = true;
      }

      const targetEl = elements.find(e => e.id === drag.id);
      if (targetEl && onUpdateElement) {
        const updated: InspectionElement = { ...targetEl };

        if (drag.part === 'camera') {
          updated.x = Math.round(drag.origX + dx);
          updated.y = Math.round(drag.origY + dy);
        } else if (drag.part === 'line-start') {
          const newX = Math.round(drag.origX + dx);
          const newY = Math.round(drag.origY + dy);
          updated.x = newX;
          updated.y = newY;
          if (updated.x2 !== undefined && updated.y2 !== undefined) {
            const distPx = Math.hypot(updated.x2 - newX, updated.y2 - newY);
            updated.meters = Math.max(1, Math.round(distPx / 15));
          }
        } else if (drag.part === 'line-end') {
          const newX2 = Math.round((drag.origX2 ?? 0) + dx);
          const newY2 = Math.round((drag.origY2 ?? 0) + dy);
          updated.x2 = newX2;
          updated.y2 = newY2;
          const distPx = Math.hypot(newX2 - updated.x, newY2 - updated.y);
          updated.meters = Math.max(1, Math.round(distPx / 15));
        } else if (drag.part === 'line-body') {
          updated.x = Math.round(drag.origX + dx);
          updated.y = Math.round(drag.origY + dy);
          if (drag.origX2 !== undefined && drag.origY2 !== undefined) {
            updated.x2 = Math.round(drag.origX2 + dx);
            updated.y2 = Math.round(drag.origY2 + dy);
          }
        }

        onUpdateElement(updated);
      }
      return;
    }

    // Hover detection for pan mode
    if (currentTool === 'pan' && !isPanning) {
      const hit = findHitPart(pos.x, pos.y);
      if (hit) {
        setHoveredElementInfo({ id: hit.element.id, part: hit.part });
      } else if (hoveredElementInfo !== null) {
        setHoveredElementInfo(null);
      }
    }

    if (isPanning && currentTool === 'pan') {
      setPanX(pos.rawX - startPanRef.current.x);
      setPanY(pos.rawY - startPanRef.current.y);
    } else if (isDrawing && currentTool === 'highlight') {
      currentPathRef.current.push({ x: pos.x, y: pos.y });
      redraw();
    } else if (isDrawing && currentTool === 'straight' && straightLineStartRef.current) {
      setStraightLinePreview({
        x1: straightLineStartRef.current.x,
        y1: straightLineStartRef.current.y,
        x2: pos.x,
        y2: pos.y
      });
    } else if (isDrawing && currentTool === 'eraser') {
      onEraseAt({ x: pos.x, y: pos.y });
    }
  };

  const handleMouseUp = () => {
    if (draggedElementRef.current) {
      const drag = draggedElementRef.current;
      if (!drag.hasMoved) {
        // Simple tap without movement opens element detail inspector
        const hitEl = elements.find(e => e.id === drag.id);
        if (hitEl) {
          onInspectElement(hitEl);
        }
      }
      draggedElementRef.current = null;
      setIsDraggingElement(false);
    }
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing) {
      if (currentTool === 'highlight' && currentPathRef.current.length > 1) {
        onAddStroke({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          points: [...currentPathRef.current],
          color: 'rgba(250, 204, 21, 0.45)',
          width: 12
        });
      } else if (currentTool === 'straight' && straightLineStartRef.current && straightLinePreview) {
        const dx = straightLinePreview.x2 - straightLineStartRef.current.x;
        const dy = straightLinePreview.y2 - straightLineStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          const lineCount = elements.filter(e => e.type === 'line').length + 1;
          const label = `Tramo T-${String(lineCount).padStart(2, '0')}`;
          const approxMeters = Math.max(1, Math.round(Math.hypot(dx, dy) / 15));
          const newEl: InspectionElement = {
            id: Date.now() + Math.floor(Math.random() * 100000),
            type: 'line',
            label: label,
            status: 'Pendiente',
            x: straightLineStartRef.current.x,
            y: straightLineStartRef.current.y,
            x2: straightLinePreview.x2,
            y2: straightLinePreview.y2,
            meters: approxMeters,
            pipes: '6x6" PVC Schedule 40',
            cables: '3#250 F+1#500N+1#6T',
            date: new Date().toISOString().split('T')[0]
          };
          onAddElement(newEl);
        }
      }
      setIsDrawing(false);
      straightLineStartRef.current = null;
      setStraightLinePreview(null);
      currentPathRef.current = [];
    }
  };

  const getCursorClass = () => {
    if (currentTool === 'pan') {
      if (isDraggingElement) return 'cursor-grabbing';
      if (hoveredElementInfo) return 'cursor-move';
      if (isPanning) return 'cursor-grabbing';
      return 'cursor-grab';
    }
    return 'cursor-crosshair';
  };

  const hoveredElement = hoveredElementInfo ? elements.find(e => e.id === hoveredElementInfo.id) : null;
  const draggedElement = draggedElementRef.current ? elements.find(e => e.id === draggedElementRef.current?.id) : null;
  const activeLine = (hoveredElement?.type === 'line' ? hoveredElement : (draggedElement?.type === 'line' ? draggedElement : null));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[550px] sm:h-[650px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-300 flex items-center justify-center select-none"
    >
      {/* Floating Tramo Adjuster Tool bar over Canvas */}
      {activeLine && onUpdateElement && currentTool === 'pan' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/95 text-white border border-sky-400/80 shadow-2xl rounded-full px-3.5 py-1.5 flex items-center gap-2 z-30 backdrop-blur text-xs animate-in fade-in duration-150">
          <span className="font-extrabold text-sky-300 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-sky-400" />
            <span>{activeLine.label}:</span>
            <span className="text-amber-300 font-mono text-sm">{activeLine.meters || 0}m</span>
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-[10px] text-slate-300 font-semibold">Tramo:</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(adjustTramoMeters(activeLine, -5, true));
            }}
            className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded-full font-bold text-[11px] transition flex items-center gap-0.5 shadow-sm"
            title="Reducir 5 metros el tramo"
          >
            <Minus className="w-3 h-3" /> 5m
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(adjustTramoMeters(activeLine, -1, true));
            }}
            className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded-full font-bold text-[11px] transition flex items-center gap-0.5 shadow-sm"
            title="Reducir 1 metro el tramo"
          >
            <Minus className="w-3 h-3" /> 1m
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(adjustTramoMeters(activeLine, 1, true));
            }}
            className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-full font-bold text-[11px] transition flex items-center gap-0.5 shadow-sm"
            title="Aumentar 1 metro el tramo"
          >
            <Plus className="w-3 h-3" /> 1m
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateElement(adjustTramoMeters(activeLine, 5, true));
            }}
            className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-full font-bold text-[11px] transition flex items-center gap-0.5 shadow-sm"
            title="Aumentar 5 metros el tramo"
          >
            <Plus className="w-3 h-3" /> 5m
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`block max-w-full max-h-full object-contain ${getCursorClass()}`}
        onMouseDown={(e) => handleMouseDown(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMouseMove(e.clientX, e.clientY)}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setAreaMousePos(null);
          handleMouseUp();
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 1) handleMouseDown(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) handleMouseMove(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
};
