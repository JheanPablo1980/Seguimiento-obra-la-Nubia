import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { AreaSector, FreehandStroke, InspectionElement, Point, CameraNorm, ProjectMeta, ProjectLayer, StatusType } from '../types';
import { ToolType } from './CanvasToolbar';
import { adjustTramoMeters } from '../utils/tramoUtils';
import { getElementPhotoRecords } from '../utils/photoUtils';
import { normalizeLayer } from '../utils/layerUtils';
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
  onZoomChange?: (zoom: number) => void;
  iconScale?: number;
  className?: string;
  // Multi-Layer Props
  activeLayer?: ProjectLayer;
  layerVisibility?: { civil: boolean; electrica: boolean };
  // Visibility
  showCameraLabels: boolean;
  showLineLabels: boolean;
  showAreaLabels: boolean;
  showSpecsLabels?: boolean;
  camPrefix: string;
  camCounter: number;
  camDefaultType: CameraNorm;
  isLocked?: boolean;
  selectedElementId?: number | null;
  statusFilter?: 'all' | StatusType;
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
  onZoomChange,
  iconScale = 2.2,
  className,
  activeLayer = 'civil',
  layerVisibility = { civil: true, electrica: true },
  showCameraLabels,
  showLineLabels,
  showAreaLabels,
  showSpecsLabels = true,
  camPrefix,
  camCounter,
  camDefaultType,
  isLocked = false,
  selectedElementId,
  statusFilter = 'all',
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
    currentDx?: number;
    currentDy?: number;
  } | null>(null);
  const [hoveredElementInfo, setHoveredElementInfo] = useState<{ id: number; part: string } | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<Point[]>([]);
  const straightLineStartRef = useRef<Point | null>(null);
  const straightLinePreviewRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
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

  // Helper distance calculation
  const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Filter elements based on layer visibility
  const isElementVisible = useCallback((el: InspectionElement) => {
    const l = normalizeLayer(el.layer);
    if (layerVisibility) {
      return layerVisibility[l] !== false;
    }
    return true;
  }, [layerVisibility]);

  // Label badge renderer
  const drawLabelBadge = useCallback((
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    labelText: string, 
    colorHex: string,
    subText?: string,
    scale: number = 1.6,
    isElectric: boolean = false,
    isDimmed: boolean = false
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
    if (isDimmed) {
      ctx.shadowColor = 'transparent';
    } else {
      ctx.shadowColor = isElectric ? 'rgba(6, 182, 212, 0.4)' : 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(8 * (scale * 0.8));
      ctx.shadowOffsetY = Math.round(3 * (scale * 0.8));
    }

    // Background rounded rectangle
    if (isDimmed) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    } else {
      ctx.fillStyle = isElectric ? 'rgba(8, 20, 44, 0.96)' : 'rgba(15, 23, 42, 0.94)';
    }
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, cornerRadius);
    ctx.fill();

    // Reset shadow for sharp lines & text
    ctx.shadowColor = 'transparent';

    // Border outline with status color or electric cyan or dim gray
    ctx.strokeStyle = isDimmed ? '#64748b' : (isElectric ? '#06b6d4' : (colorHex || '#38bdf8'));
    ctx.lineWidth = isDimmed ? Math.max(1, 1 * (scale * 0.8)) : Math.max(1.5, 1.5 * (scale * 0.8));
    ctx.stroke();

    // Status indicator dot
    const dotX = x - bgWidth / 2 + paddingX + dotSize / 2;
    const dotY = subText ? y - Math.round(6 * (scale * 0.8)) : y;

    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isDimmed ? '#64748b' : (colorHex || (isElectric ? '#06b6d4' : '#38bdf8'));
    ctx.fill();
    ctx.strokeStyle = isDimmed ? '#475569' : '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text rendering
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textX = dotX + dotSize / 2 + Math.round(5 * (scale * 0.8));

    if (subText) {
      ctx.fillStyle = isDimmed ? '#94a3b8' : '#f8fafc';
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(labelText, textX, y - Math.round(6 * (scale * 0.8)));

      ctx.fillStyle = isDimmed ? '#64748b' : (isElectric ? '#67e8f9' : '#fbbf24'); // Cyan highlight for electric specs, Amber for civil
      ctx.font = `${subFontSize}px "JetBrains Mono", monospace, sans-serif`;
      ctx.fillText(subText, x - bgWidth / 2 + paddingX, y + Math.round(8 * (scale * 0.8)));
    } else {
      ctx.fillStyle = isDimmed ? '#94a3b8' : '#f8fafc';
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(labelText, textX, y);
    }

    ctx.restore();
  }, []);

  // Civil Floor Inspection Chamber badge renderer
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
    scale: number = 1.6,
    isDimmed: boolean = false
  ) => {
    ctx.save();

    // Base circular badge diameter scaled for high human visibility
    const iconRadius = Math.max((size + 4) * scale, 18 * scale);

    if (isDimmed) {
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(x, y, iconRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();

      // Status colored border ring -> dim gray
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.stroke();

      // Outer dashed locator ring -> dim gray
      ctx.beginPath();
      ctx.arc(x, y, iconRadius + 5 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(0.8, 1 * scale);
      ctx.setLineDash([3 * scale, 3 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
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
    }

    // DRAW VECTOR FLOOR INSPECTION CHAMBER (CÁMARA DE PISO CIVIL) ICON
    ctx.save();
    const boxSize = 14 * scale;
    const boxX = x - boxSize / 2;
    const boxY = y - boxSize / 2;
    const rimMargin = 2.2 * scale;

    // 1. Outer Box Metallic Frame (Marco en ángulo)
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, 2 * scale);
    ctx.fillStyle = isDimmed ? '#475569' : colorHex;
    ctx.fill();
    ctx.strokeStyle = isDimmed ? '#64748b' : '#ffffff';
    ctx.lineWidth = Math.max(0.8, 1.2 * scale);
    ctx.stroke();

    // 2. Concrete Lid Plate (Tapa de concreto interior)
    const lidX = boxX + rimMargin;
    const lidY = boxY + rimMargin;
    const lidSize = boxSize - rimMargin * 2;

    ctx.beginPath();
    ctx.roundRect(lidX, lidY, lidSize, lidSize, 1 * scale);
    ctx.fillStyle = isDimmed ? '#1e293b' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = isDimmed ? '#475569' : '#ffffff';
    ctx.lineWidth = Math.max(0.6, 1 * scale);
    ctx.stroke();

    // 3. Concrete Rebar Grid Pattern (Malla electro-soldada)
    ctx.beginPath();
    ctx.moveTo(lidX + 1.5 * scale, y);
    ctx.lineTo(lidX + lidSize - 1.5 * scale, y);
    ctx.moveTo(x, lidY + 1.5 * scale);
    ctx.lineTo(x, lidY + lidSize - 1.5 * scale);

    ctx.strokeStyle = isDimmed ? '#64748b' : colorHex;
    ctx.lineWidth = Math.max(0.8, 1.2 * scale);
    ctx.stroke();

    // 4. Corner Anchors & Perspective Chamfers
    ctx.beginPath();
    ctx.moveTo(boxX + 0.5 * scale, boxY + 0.5 * scale);
    ctx.lineTo(lidX, lidY);
    ctx.moveTo(boxX + boxSize - 0.5 * scale, boxY + 0.5 * scale);
    ctx.lineTo(lidX + lidSize, lidY);
    ctx.moveTo(boxX + 0.5 * scale, boxY + boxSize - 0.5 * scale);
    ctx.lineTo(lidX, lidY + lidSize);
    ctx.moveTo(boxX + boxSize - 0.5 * scale, boxY + boxSize - 0.5 * scale);
    ctx.lineTo(lidX + lidSize, lidY + lidSize);

    ctx.strokeStyle = isDimmed ? 'rgba(100, 116, 139, 0.4)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(0.6, 1 * scale);
    ctx.stroke();

    // 5. Placa de Identificación / Norma (MT, BT, D)
    const upperSub = (subText || '').toUpperCase();
    let normCode = '';
    let normColor = isDimmed ? '#94a3b8' : '#f59e0b';

    if (!isDimmed) {
      if (upperSub.includes('MT')) {
        normCode = 'MT';
        normColor = '#d946ef';
      } else if (upperSub.includes('D') && !upperSub.includes('MOD') && !upperSub.includes('ADD')) {
        normCode = 'D';
        normColor = '#3b82f6';
      } else if (upperSub.includes('BT')) {
        normCode = 'BT';
        normColor = '#10b981';
      }
    } else {
      if (upperSub.includes('MT')) normCode = 'MT';
      else if (upperSub.includes('D')) normCode = 'D';
      else if (upperSub.includes('BT')) normCode = 'BT';
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
      ctx.fillStyle = isDimmed ? '#64748b' : '#f59e0b';
      ctx.fill();
    }

    ctx.restore();

    // Small Status Dot at top right
    const dotAngle = -Math.PI / 4;
    const statusX = x + Math.cos(dotAngle) * iconRadius;
    const statusY = y + Math.sin(dotAngle) * iconRadius;

    ctx.beginPath();
    ctx.arc(statusX, statusY, 4.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = isDimmed ? '#64748b' : colorHex;
    ctx.fill();
    ctx.strokeStyle = isDimmed ? '#475569' : '#ffffff';
    ctx.lineWidth = Math.max(1.2, 1.8 * scale);
    ctx.stroke();

    // Label Badge below if enabled
    if (showLabel) {
      const badgeY = y + iconRadius + 18 * scale;

      // Leader line connecting camera node to label
      ctx.beginPath();
      ctx.moveTo(x, y + iconRadius + 2 * scale);
      ctx.lineTo(x, badgeY - 10 * scale);
      ctx.strokeStyle = isDimmed ? '#475569' : colorHex;
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.setLineDash([2 * scale, 2 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawLabelBadge(ctx, x, badgeY, labelText, colorHex, subText, scale, false, isDimmed);
    }

    ctx.restore();
  }, [drawLabelBadge]);

  // Electrical Node badge renderer (Tableros TD, Transformadores TR, Cámaras Eléctricas CE, Luminarias LUM, etc.)
  const drawElectricNodeBadge = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    labelText: string,
    colorHex: string,
    status: string,
    nodeType: string = 'tablero',
    size: number = 10,
    showLabel: boolean,
    subText?: string,
    scale: number = 1.6,
    isDimmed: boolean = false
  ) => {
    ctx.save();

    const iconRadius = Math.max((size + 5) * scale, 19 * scale);

    if (isDimmed) {
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(x, y, iconRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();

      // Outer ring -> dim gray
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1.5, 2 * scale);
      ctx.stroke();

      // Secondary concentric ring -> dim gray
      ctx.beginPath();
      ctx.arc(x, y, iconRadius + 5 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(0.8, 1 * scale);
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Cyan / Electric Amber outer glow
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12 * scale;

      // Dark octagonal / circular electrical enclosure base
      ctx.beginPath();
      ctx.arc(x, y, iconRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#08142c'; // High-tech electric navy
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Outer neon ring
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = Math.max(2.5, 3 * scale);
      ctx.stroke();

      // Secondary concentric circuit locator ring
      ctx.beginPath();
      ctx.arc(x, y, iconRadius + 5 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = Math.max(1.2, 1.5 * scale);
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // DRAW SPECIALIZED ELECTRICAL VECTOR ICON INSIDE
    ctx.save();
    const boxSize = 15 * scale;
    const boxX = x - boxSize / 2;
    const boxY = y - boxSize / 2;

    const upperLabel = labelText.toUpperCase();
    const isTD = nodeType === 'tablero' || upperLabel.startsWith('TD');
    const isTR = nodeType === 'transformador' || upperLabel.startsWith('TR');
    const isBarrajes = nodeType === 'barrajes_elastomericos' || nodeType === 'barraje' || upperLabel.startsWith('BE') || upperLabel.startsWith('BAR');
    const isContador = nodeType === 'contador_electrico' || nodeType === 'contador' || nodeType === 'medidor' || upperLabel.startsWith('MED') || upperLabel.startsWith('CNT');
    const isLUM = nodeType === 'luminaria' || upperLabel.startsWith('LUM');
    const isSPT = nodeType === 'spt' || upperLabel.startsWith('SPT');

    if (isTD) {
      // 1. DISTRIBUTION BOARD PANEL (Tablero Eléctrico / TD)
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 2 * scale);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#38bdf8';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      ctx.stroke();

      // Breakers rows
      ctx.fillStyle = isDimmed ? '#475569' : '#f59e0b';
      const bW = 2 * scale;
      const bH = 3.5 * scale;
      ctx.fillRect(boxX + 2.5 * scale, boxY + 2.5 * scale, bW, bH);
      ctx.fillRect(boxX + 5.5 * scale, boxY + 2.5 * scale, bW, bH);
      ctx.fillRect(boxX + 2.5 * scale, boxY + 8 * scale, bW, bH);
      ctx.fillRect(boxX + 5.5 * scale, boxY + 8 * scale, bW, bH);

      // Central Lightning Bolt ⚡
      ctx.beginPath();
      ctx.moveTo(x + 2 * scale, boxY + 2 * scale);
      ctx.lineTo(x - 1 * scale, y);
      ctx.lineTo(x + 2 * scale, y);
      ctx.lineTo(x - 2 * scale, boxY + boxSize - 2 * scale);
      ctx.lineTo(x + 0.5 * scale, y + 1 * scale);
      ctx.lineTo(x - 1.5 * scale, y + 1 * scale);
      ctx.closePath();
      ctx.fillStyle = isDimmed ? '#64748b' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#94a3b8' : '#ffffff';
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();
    } else if (isTR) {
      // 2. TRANSFORMER SUBSTATION (Transformador / TR 🔋)
      // Main transformer tank housing
      ctx.beginPath();
      ctx.roundRect(boxX + 0.5 * scale, boxY + 1 * scale, boxSize - 1 * scale, boxSize - 2 * scale, 2 * scale);
      ctx.fillStyle = isDimmed ? '#1e293b' : '#1e1b4b'; // Deep sub-station indigo
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#f59e0b';
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();

      // Inductive transformer magnetic coils (Two overlapping primary & secondary loops)
      const rCoil = 4.2 * scale;
      ctx.beginPath();
      ctx.arc(x - 2.5 * scale, y + 0.5 * scale, rCoil, 0, Math.PI * 2);
      ctx.strokeStyle = isDimmed ? '#64748b' : '#fbbf24'; // Primary winding gold
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 2.5 * scale, y + 0.5 * scale, rCoil, 0, Math.PI * 2);
      ctx.strokeStyle = isDimmed ? '#475569' : '#38bdf8'; // Secondary winding cyan
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();

      // Top High Voltage Bushing Terminals (MT Bushings)
      ctx.fillStyle = isDimmed ? '#475569' : '#f59e0b';
      ctx.fillRect(x - 4.5 * scale, boxY - 1 * scale, 1.8 * scale, 2.5 * scale);
      ctx.fillRect(x - 0.9 * scale, boxY - 1 * scale, 1.8 * scale, 2.5 * scale);
      ctx.fillRect(x + 2.7 * scale, boxY - 1 * scale, 1.8 * scale, 2.5 * scale);

      // Spark symbol in core center
      ctx.fillStyle = isDimmed ? '#94a3b8' : '#ffffff';
      ctx.font = `bold ${Math.round(7 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', x, y + 0.5 * scale);
    } else if (isBarrajes) {
      // 3. ELASTOMERIC BUSBAR / PREMOLDED JUNCTIONS (Barrajes Elastoméricos / BE 🪢)
      // Outer elastomer modular jacket
      ctx.beginPath();
      ctx.roundRect(boxX, boxY + 2 * scale, boxSize, boxSize - 4 * scale, 3 * scale);
      ctx.fillStyle = isDimmed ? '#1e293b' : '#2e1065'; // Premium elastomer purple
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#c084fc';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Central Copper Busbar Spine
      ctx.fillStyle = isDimmed ? '#475569' : '#f59e0b';
      ctx.fillRect(boxX + 2 * scale, y - 1 * scale, boxSize - 4 * scale, 2 * scale);

      // Premolded T-Body Boots / 3-Way Insulated Sleeves
      const bootW = 3.2 * scale;
      const bootH = 4.2 * scale;
      
      // Top boot entry
      ctx.fillStyle = isDimmed ? '#334155' : '#a855f7';
      ctx.beginPath();
      ctx.roundRect(x - bootW / 2, boxY - 0.5 * scale, bootW, bootH, 1 * scale);
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#f3e8ff';
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();

      // Bottom left & right tap boots
      ctx.fillStyle = isDimmed ? '#334155' : '#9333ea';
      ctx.beginPath();
      ctx.roundRect(x - 5 * scale, y + 1 * scale, 3 * scale, 4.5 * scale, 1 * scale);
      ctx.roundRect(x + 2 * scale, y + 1 * scale, 3 * scale, 4.5 * scale, 1 * scale);
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#e9d5ff';
      ctx.lineWidth = 0.8 * scale;
      ctx.stroke();

      // Gold Terminal Contact Studs
      ctx.fillStyle = isDimmed ? '#64748b' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, boxY + 1 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.arc(x - 3.5 * scale, y + 3.5 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.arc(x + 3.5 * scale, y + 3.5 * scale, 1.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (isContador) {
      // 4. ELECTRIC ENERGY METER / KWH COUNTER (Contador Eléctrico / MED ⏱️)
      // Circular / Rounded Meter Enclosure
      ctx.beginPath();
      ctx.roundRect(boxX + 0.5 * scale, boxY + 0.5 * scale, boxSize - 1 * scale, boxSize - 1 * scale, 3 * scale);
      ctx.fillStyle = isDimmed ? '#1e293b' : '#064e3b'; // Deep emerald metering enclosure
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#34d399';
      ctx.lineWidth = 1.6 * scale;
      ctx.stroke();

      // Meter LCD / Digital Display Window
      const screenW = boxSize - 4 * scale;
      const screenH = 4.5 * scale;
      ctx.fillStyle = '#022c22';
      ctx.fillRect(x - screenW / 2, boxY + 2.5 * scale, screenW, screenH);
      ctx.strokeStyle = isDimmed ? '#334155' : '#10b981';
      ctx.lineWidth = 0.8 * scale;
      ctx.strokeRect(x - screenW / 2, boxY + 2.5 * scale, screenW, screenH);

      // Digital kWh read text / segments
      ctx.fillStyle = isDimmed ? '#64748b' : '#6ee7b7';
      ctx.font = `bold ${Math.round(3.8 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0842.5', x, boxY + 4.8 * scale);

      // Rotating disc / Load Status indicator
      ctx.beginPath();
      ctx.arc(x, y + 3 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = isDimmed ? '#475569' : '#34d399';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();

      // Optical Pulse Blinking LED
      ctx.beginPath();
      ctx.arc(x + 4 * scale, y + 3 * scale, 1 * scale, 0, Math.PI * 2);
      ctx.fillStyle = isDimmed ? '#64748b' : '#ef4444';
      ctx.fill();
    } else if (isLUM) {
      // 5. LUMINAIRE / LIGHTING FIXTURE (Luminaria / LUM 💡)
      ctx.beginPath();
      ctx.arc(x, y - 1 * scale, 4.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = isDimmed ? '#334155' : '#fef08a';
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#f59e0b';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Light beam rays
      ctx.strokeStyle = isDimmed ? '#475569' : '#fef08a';
      ctx.lineWidth = 1.2 * scale;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * 5.5 * scale, y - 1 * scale + Math.sin(ang) * 5.5 * scale);
        ctx.lineTo(x + Math.cos(ang) * 7.5 * scale, y - 1 * scale + Math.sin(ang) * 7.5 * scale);
        ctx.stroke();
      }
    } else if (isSPT) {
      // 6. GROUNDING SYSTEM (Puesta a tierra / SPT ⏚)
      ctx.strokeStyle = isDimmed ? '#64748b' : '#10b981';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x, boxY + 2 * scale);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Ground horizontal bars
      ctx.beginPath();
      ctx.moveTo(x - 5 * scale, y);
      ctx.lineTo(x + 5 * scale, y);
      ctx.moveTo(x - 3.5 * scale, y + 2.5 * scale);
      ctx.lineTo(x + 3.5 * scale, y + 2.5 * scale);
      ctx.moveTo(x - 2 * scale, y + 5 * scale);
      ctx.lineTo(x + 2 * scale, y + 5 * scale);
      ctx.stroke();
    } else {
      // 7. ELECTRICAL JUNCTION / CHAMBER (Cámara Eléctrica CE / Caja CP)
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 2 * scale);
      ctx.fillStyle = isDimmed ? '#1e293b' : '#0369a1';
      ctx.fill();
      ctx.strokeStyle = isDimmed ? '#64748b' : '#38bdf8';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Terminal blocks inside
      ctx.fillStyle = isDimmed ? '#334155' : '#f8fafc';
      ctx.fillRect(boxX + 2 * scale, y - 1 * scale, boxSize - 4 * scale, 2 * scale);
      ctx.fillStyle = isDimmed ? '#64748b' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Top Right Status indicator dot
    const dotAngle = -Math.PI / 4;
    const statusX = x + Math.cos(dotAngle) * iconRadius;
    const statusY = y + Math.sin(dotAngle) * iconRadius;

    ctx.beginPath();
    ctx.arc(statusX, statusY, 4.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = isDimmed ? '#64748b' : colorHex;
    ctx.fill();
    ctx.strokeStyle = isDimmed ? '#475569' : '#ffffff';
    ctx.lineWidth = Math.max(1.2, 1.8 * scale);
    ctx.stroke();

    // Label Badge below
    if (showLabel) {
      const badgeY = y + iconRadius + 18 * scale;

      ctx.beginPath();
      ctx.moveTo(x, y + iconRadius + 2 * scale);
      ctx.lineTo(x, badgeY - 10 * scale);
      ctx.strokeStyle = isDimmed ? '#475569' : '#06b6d4';
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.setLineDash([2 * scale, 2 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawLabelBadge(ctx, x, badgeY, `⚡ ${labelText}`, colorHex, subText, scale, true, isDimmed);
    }

    ctx.restore();
  }, [drawLabelBadge]);

  // Line renderer: supports Civil Conduits and Electrical Circuits
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
    acta?: string,
    isElectric: boolean = false,
    isDimmed: boolean = false
  ) => {
    ctx.save();

    if (isElectric) {
      // --- ELECTRICAL CIRCUIT / FEEDER LINE STYLING ---
      if (isDimmed) {
        ctx.shadowColor = 'transparent';

        // 2. High-Tech Cable Conduit Casing in dim slate
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.lineWidth = Math.max(6, 8 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 3. Main Cable Conductor Body in dim gray
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(2.5, 3.5 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Electric Pulse Dash Line in faint gray
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = Math.max(1, 1.2 * scale);
        ctx.setLineDash([4 * scale, 6 * scale]);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // 1. Electric Glow Shadow
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8 * scale;

        // 2. High-Tech Cable Conduit Casing
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#08142c';
        ctx.lineWidth = Math.max(8, 11 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // 3. Main Glowing Cable Conductor Body
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = colorHex === '#94a3b8' ? '#06b6d4' : colorHex;
        ctx.lineWidth = Math.max(4, 5.5 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Electric Pulse Dash Line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.2, 2 * scale);
        ctx.setLineDash([4 * scale, 6 * scale]);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5. Electric Terminal Node Blocks
      const drawElectricTerminal = (nx: number, ny: number) => {
        ctx.save();
        if (isDimmed) {
          ctx.shadowColor = 'transparent';
        } else {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 6 * scale;
        }

        const nodeRadius = Math.max(6, 8.5 * scale);
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? 'rgba(15, 23, 42, 0.8)' : '#08142c';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = isDimmed ? '#64748b' : '#06b6d4';
        ctx.lineWidth = isDimmed ? Math.max(1, 1.5 * scale) : Math.max(1.5, 2.2 * scale);
        ctx.stroke();

        // ⚡ symbol dot
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? '#64748b' : '#f59e0b';
        ctx.fill();

        ctx.restore();
      };

      drawElectricTerminal(x1, y1);
      drawElectricTerminal(x2, y2);

      // 6. Label Badge
      if (showLabel) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const photoStr = photosCount > 0 ? ` 📷${photosCount}` : '';

        let subStr: string | undefined = undefined;
        if (showSpecs) {
          const parts = [];
          if (acta) parts.push(`[${acta}]`);
          if (cables) parts.push(`Conductor: ${cables}`);
          if (pipes) parts.push(`Ducto: ${pipes}`);
          if (parts.length > 0) subStr = parts.join(' | ');
        }

        drawLabelBadge(ctx, midX, midY, `⚡ ${label} (${meters || 0}m)${photoStr}`, colorHex, subStr, scale, true, isDimmed);
      }
    } else {
      // --- CIVIL CONDUIT / TRENCH DUCT BANK STYLING ---
      if (isDimmed) {
        ctx.shadowColor = 'transparent';

        // Outer Conduit Pipe Casing in dim slate
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.lineWidth = Math.max(6, 8 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // Main Pipe Body in dim gray
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.max(2.5, 3.5 * scale);
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner Duct Core Stripe in faint gray
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = Math.max(0.8, 1 * scale);
        ctx.setLineDash([6 * scale, 5 * scale]);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
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

        // 3. Inner Duct Core Stripe
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.setLineDash([6 * scale, 5 * scale]);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Terminal Connection Boxes
      const drawTerminalNode = (nx: number, ny: number) => {
        ctx.save();
        if (isDimmed) {
          ctx.shadowColor = 'transparent';
        } else {
          ctx.shadowColor = colorHex;
          ctx.shadowBlur = 4 * scale;
        }

        const nodeRadius = Math.max(6, 8.5 * scale);
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? 'rgba(15, 23, 42, 0.8)' : '#0f172a';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = isDimmed ? '#64748b' : colorHex;
        ctx.lineWidth = isDimmed ? Math.max(1, 1.5 * scale) : Math.max(1.5, 2.2 * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isDimmed ? '#64748b' : '#ffffff';
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

        drawLabelBadge(ctx, midX, midY, `${label} (${meters || 0}m)${photoStr}`, colorHex, subStr, scale, false, isDimmed);
      }
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

    // 2. Area sectors
    areas.forEach(area => {
      if (area.points.length < 3) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();

      const fillColor = (typeof area.color === 'object' && area.color && 'fill' in area.color && area.color.fill)
        ? area.color.fill
        : (typeof area.color === 'string' && area.color ? area.color : 'rgba(168, 85, 247, 0.22)');
      const strokeColor = (typeof area.color === 'object' && area.color && 'stroke' in area.color && area.color.stroke)
        ? area.color.stroke
        : (typeof area.borderColor === 'string' && area.borderColor ? area.borderColor : '#9333ea');

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const cx = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
      const cy = area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length;
      const dimStr = area.calculatedAreaM2 ? ` (${area.calculatedAreaM2} m²)` : '';
      drawLabelBadge(ctx, cx, cy, `${area.name}${dimStr}`, strokeColor, undefined, iconScale, false);
      ctx.restore();
    });

    // 3. Freehand strokes
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

    // 4. Inspection Elements (respecting layer visibility)
    const visibleElements = elements.filter(isElementVisible);

    visibleElements.forEach(el => {
      let colorHex = '#94a3b8';
      if (el.status === 'En proceso') colorHex = '#f59e0b';
      if (el.status === 'Terminado') colorHex = '#10b981';

      const pCount = getElementPhotoRecords(el).length;
      const isElectric = normalizeLayer(el.layer) === 'electrica';

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
          pCount,
          true,
          true,
          el.pipes,
          el.cables,
          iconScale,
          el.acta,
          isElectric
        );
      } else if (el.type === 'camera') {
        const photoStr = pCount > 0 ? ` 📷${pCount}` : '';
        const actaItemTag = [el.acta, el.itemCobro ? `Ítem ${el.itemCobro}` : ''].filter(Boolean).join(' | ');
        const camSubStr = [actaItemTag ? `[${actaItemTag}]` : '', el.camType || el.circuitTag].filter(Boolean).join(' ');
        const statusLabel = el.status === 'En proceso' && el.progressPercent !== undefined ? `En proceso (${el.progressPercent}%)` : el.status;

        if (isElectric) {
          drawElectricNodeBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.electricNodeType || 'tablero', el.size || 10, true, camSubStr, iconScale);
        } else {
          drawCameraBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.size || 10, true, camSubStr, iconScale);
        }
      }
    });

    // 5. Official Legend Stamp Box at bottom right
    const boxW = 360;
    const boxH = 145;
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
    ctx.fillText(`CONTRATISTA: ${projectMeta?.contractorName || 'Control de Obras Civiles y Eléctricas'}`, boxX + 14, boxY + 42);
    ctx.fillText(`UBICACIÓN: ${projectMeta?.sectorLocation || 'Sector Principal'}`, boxX + 14, boxY + 57);

    const totalMeters = visibleElements.filter(e => e.type === 'line').reduce((sum, e) => sum + (e.meters || 0), 0);
    const totalCams = visibleElements.filter(e => e.type === 'camera').length;
    const completedM = visibleElements.filter(e => e.type === 'line' && e.status === 'Terminado').reduce((sum, e) => sum + (e.meters || 0), 0);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(`METRAJE TOTAL: ${totalMeters} m  |  CÁMARAS / NODOS: ${totalCams}`, boxX + 14, boxY + 77);

    ctx.fillStyle = '#10b981';
    ctx.fillText(`AVANCE EJECUTADO: ${completedM} m (${totalMeters > 0 ? Math.round((completedM / totalMeters) * 100) : 0}%)`, boxX + 14, boxY + 95);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 9px monospace';
    const civCount = visibleElements.filter(e => normalizeLayer(e.layer) === 'civil').length;
    const elecCount = visibleElements.filter(e => normalizeLayer(e.layer) === 'electrica').length;
    ctx.fillText(`CAPAS ACTIVAS: 🏗️ Civiles (${civCount}) | ⚡ Eléctricas (${elecCount})`, boxX + 14, boxY + 113);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText(`FECHA: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, boxX + 14, boxY + 131);
    ctx.restore();

    // Trigger download
    const link = document.createElement('a');
    link.download = `Plano_Obra_${(projectMeta?.sectorLocation || 'Anotado').replace(/\s+/g, '_')}_Metrajes.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [blueprintImg, areas, strokes, elements, isElementVisible, drawLabelBadge, drawCameraBadge, drawElectricNodeBadge, drawLineElement, iconScale]);

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

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background Grid Pattern
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    // Subtle background grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5 / zoomLevel;
    const gridSize = 40;
    const startX = Math.floor(-panX / (gridSize * zoomLevel)) * gridSize;
    const endX = startX + Math.ceil(canvas.width / (gridSize * zoomLevel)) * gridSize + gridSize;
    const startY = Math.floor(-panY / (gridSize * zoomLevel)) * gridSize;
    const endY = startY + Math.ceil(canvas.height / (gridSize * zoomLevel)) * gridSize + gridSize;

    for (let gx = startX; gx <= endX; gx += gridSize) {
      ctx.beginPath(); ctx.moveTo(gx, startY); ctx.lineTo(gx, endY); ctx.stroke();
    }
    for (let gy = startY; gy <= endY; gy += gridSize) {
      ctx.beginPath(); ctx.moveTo(startX, gy); ctx.lineTo(endX, gy); ctx.stroke();
    }

    // 2. Blueprint image
    if (blueprintImg && blueprintImg.complete && blueprintImg.width > 0) {
      ctx.drawImage(blueprintImg, 0, 0);
    }

    // 3. Area sectors
    areas.forEach(area => {
      if (area.points.length < 3) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();

      const fillColor = (typeof area.color === 'object' && area.color && 'fill' in area.color && area.color.fill)
        ? area.color.fill
        : (typeof area.color === 'string' && area.color ? area.color : 'rgba(168, 85, 247, 0.22)');
      const strokeColor = (typeof area.color === 'object' && area.color && 'stroke' in area.color && area.color.stroke)
        ? area.color.stroke
        : (typeof area.borderColor === 'string' && area.borderColor ? area.borderColor : '#9333ea');

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Area label
      if (showAreaLabels) {
        const cx = area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length;
        const cy = area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length;
        const dimStr = area.calculatedAreaM2 ? ` (${area.calculatedAreaM2} m²)` : (area.widthMeters && area.lengthMeters ? ` (${area.widthMeters}x${area.lengthMeters}m)` : '');
        const labelStr = area.code ? `[${area.code}] ${area.name}${dimStr}` : `${area.name}${dimStr}`;
        drawLabelBadge(ctx, cx, cy, labelStr, strokeColor, undefined, iconScale, false);
      }
      ctx.restore();
    });

    // 4. Area currently being drawn
    if (currentAreaPoints.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(currentAreaPoints[0].x, currentAreaPoints[0].y);
      for (let i = 1; i < currentAreaPoints.length; i++) {
        ctx.lineTo(currentAreaPoints[i].x, currentAreaPoints[i].y);
      }
      if (areaMousePos) {
        ctx.lineTo(areaMousePos.x, areaMousePos.y);
      }
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      currentAreaPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, idx === 0 ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#ec4899' : '#a855f7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      ctx.restore();
    }

    // 5. Freehand strokes
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

    // Freehand stroke currently being drawn
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

    // 6. Inspection Elements (Conduit lines, Cameras & Electrical Nodes, respecting layer visibility)
    const visibleElements = elements.filter(isElementVisible);
    const activeNormalized = normalizeLayer(activeLayer);

    // Split elements: background dimmed elements vs active foreground elements
    const dimmedElements = visibleElements.filter(el => {
      const layerMatches = normalizeLayer(el.layer) === activeNormalized;
      const statusMatches = statusFilter === 'all' || el.status === statusFilter;
      return !(layerMatches && statusMatches);
    });
    const activeElements = visibleElements.filter(el => {
      const layerMatches = normalizeLayer(el.layer) === activeNormalized;
      const statusMatches = statusFilter === 'all' || el.status === statusFilter;
      return layerMatches && statusMatches;
    });

    const renderElement = (baseEl: InspectionElement, isDimmed: boolean) => {
      // Apply real-time drag offsets if this element is currently being dragged
      let el = baseEl;
      if (draggedElementRef.current && draggedElementRef.current.id === baseEl.id) {
        const drag = draggedElementRef.current;
        const dx = drag.currentDx || 0;
        const dy = drag.currentDy || 0;
        
        el = { ...baseEl };
        if (drag.part === 'camera') {
          el.x = drag.origX + dx;
          el.y = drag.origY + dy;
        } else if (drag.part === 'line-start') {
          el.x = drag.origX + dx;
          el.y = drag.origY + dy;
        } else if (drag.part === 'line-end') {
          el.x2 = (drag.origX2 ?? 0) + dx;
          el.y2 = (drag.origY2 ?? 0) + dy;
        } else if (drag.part === 'line-body') {
          el.x = drag.origX + dx;
          el.y = drag.origY + dy;
          if (el.x2 !== undefined && el.y2 !== undefined) {
            el.x2 = (drag.origX2 ?? 0) + dx;
            el.y2 = (drag.origY2 ?? 0) + dy;
          }
        }
      }

      let colorHex = '#94a3b8'; // Pendiente
      if (el.status === 'En proceso') colorHex = '#f59e0b';
      if (el.status === 'Terminado') colorHex = '#10b981';

      const pCount = getElementPhotoRecords(el).length;
      const isElectric = normalizeLayer(el.layer) === 'electrica';

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
          pCount,
          showLineLabels,
          showSpecsLabels,
          el.pipes,
          el.cables,
          iconScale,
          el.acta,
          isElectric,
          isDimmed
        );
      } else if (el.type === 'camera') {
        const photoStr = pCount > 0 ? ` 📷${pCount}` : '';
        const actaItemTag = [el.acta, el.itemCobro ? `Ítem ${el.itemCobro}` : ''].filter(Boolean).join(' | ');
        const camSubStr = showSpecsLabels ? [actaItemTag ? `[${actaItemTag}]` : '', el.camType || el.circuitTag].filter(Boolean).join(' ') : undefined;
        const statusLabel = el.status === 'En proceso' && el.progressPercent !== undefined ? `En proceso (${el.progressPercent}%)` : el.status;

        if (isElectric) {
          drawElectricNodeBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.electricNodeType || 'tablero', el.size || 10, showCameraLabels, camSubStr, iconScale, isDimmed);
        } else {
          drawCameraBadge(ctx, el.x, el.y, `${el.label}${photoStr}`, colorHex, statusLabel, el.size || 10, showCameraLabels, camSubStr, iconScale, isDimmed);
        }
      }
    };

    // 1st Pass: Render inactive layer in soft dim gray (gris tenue) as background reference
    dimmedElements.forEach(el => renderElement(el, true));

    // 2nd Pass: Render active layer elements with full vibrancy and focus
    activeElements.forEach(el => renderElement(el, false));

    // 7. Straight Line Preview
    const straightPreview = straightLinePreviewRef.current;
    if (isDrawing && currentTool === 'straight' && straightPreview) {
      const isElectric = activeLayer === 'electrica';
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(straightPreview.x1, straightPreview.y1);
      ctx.lineTo(straightPreview.x2, straightPreview.y2);
      ctx.strokeStyle = isElectric ? '#06b6d4' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 8. Interactive Drag Handles / Active Selection Highlight in Pan Mode
    if (currentTool === 'pan') {
      visibleElements.forEach(baseEl => {
        const isHovered = hoveredElementInfo?.id === baseEl.id;
        const isDragged = draggedElementRef.current?.id === baseEl.id;

        if (isHovered || isDragged) {
          let el = baseEl;
          if (isDragged && draggedElementRef.current) {
            const drag = draggedElementRef.current;
            const dx = drag.currentDx || 0;
            const dy = drag.currentDy || 0;
            
            el = { ...baseEl };
            if (drag.part === 'camera') {
              el.x = drag.origX + dx;
              el.y = drag.origY + dy;
            } else if (drag.part === 'line-start') {
              el.x = drag.origX + dx;
              el.y = drag.origY + dy;
            } else if (drag.part === 'line-end') {
              el.x2 = (drag.origX2 ?? 0) + dx;
              el.y2 = (drag.origY2 ?? 0) + dy;
            } else if (drag.part === 'line-body') {
              el.x = drag.origX + dx;
              el.y = drag.origY + dy;
              if (el.x2 !== undefined && el.y2 !== undefined) {
                el.x2 = (drag.origX2 ?? 0) + dx;
                el.y2 = (drag.origY2 ?? 0) + dy;
              }
            }
          }

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

    // 9. Selected Element High-Visibility Locator Ring (for mobile inspector)
    if (selectedElementId) {
      const selectedEl = visibleElements.find(e => e.id === selectedElementId);
      if (selectedEl) {
        ctx.save();
        if (selectedEl.type === 'camera') {
          const baseRad = Math.max((selectedEl.size || 10) + 6, 18) * iconScale;
          // Outer glowing amber/gold halo
          ctx.beginPath();
          ctx.arc(selectedEl.x, selectedEl.y, baseRad + 10 * iconScale, 0, Math.PI * 2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 16;
          ctx.stroke();

          // Crosshair indicators
          const crossLen = 8 * iconScale;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(selectedEl.x, selectedEl.y - baseRad - crossLen - 4);
          ctx.lineTo(selectedEl.x, selectedEl.y - baseRad - 4);
          ctx.moveTo(selectedEl.x, selectedEl.y + baseRad + 4);
          ctx.lineTo(selectedEl.x, selectedEl.y + baseRad + crossLen + 4);
          ctx.moveTo(selectedEl.x - baseRad - crossLen - 4, selectedEl.y);
          ctx.lineTo(selectedEl.x - baseRad - 4, selectedEl.y);
          ctx.moveTo(selectedEl.x + baseRad + 4, selectedEl.y);
          ctx.lineTo(selectedEl.x + baseRad + crossLen + 4, selectedEl.y);
          ctx.stroke();
        } else if (selectedEl.type === 'line' && selectedEl.x2 !== undefined && selectedEl.y2 !== undefined) {
          ctx.beginPath();
          ctx.moveTo(selectedEl.x, selectedEl.y);
          ctx.lineTo(selectedEl.x2, selectedEl.y2);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = Math.max(14, 18 * iconScale);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }
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
    isElementVisible,
    activeLayer,
    showLineLabels,
    showCameraLabels,
    showSpecsLabels,
    drawCameraBadge,
    drawElectricNodeBadge,
    drawLineElement,
    drawLabelBadge,
    iconScale,
    hoveredElementInfo,
    isDraggingElement,
    selectedElementId,
    statusFilter
  ]);

  // Find camera or line hit part at canvas coordinate (respecting visible elements only, prioritizing active layer)
  const findHitPart = useCallback((x: number, y: number): { element: InspectionElement; part: 'camera' | 'line-start' | 'line-end' | 'line-body' } | null => {
    const visibleElements = elements.filter(isElementVisible);
    const activeNormalized = normalizeLayer(activeLayer);

    // Sort visible elements so active layer elements are tested first
    const sortedElements = [
      ...visibleElements.filter(e => normalizeLayer(e.layer) === activeNormalized),
      ...visibleElements.filter(e => normalizeLayer(e.layer) !== activeNormalized)
    ];

    // Check cameras & nodes first
    for (const el of sortedElements) {
      if (el.type === 'camera') {
        const radius = Math.max((el.size || 10) + 8, 20) * iconScale;
        if (Math.hypot(el.x - x, el.y - y) <= radius) {
          return { element: el, part: 'camera' };
        }
      }
    }
    // Check lines (tramo / canalización / circuito)
    for (const el of sortedElements) {
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
  }, [elements, iconScale, isElementVisible, activeLayer]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Adjust canvas size when container or blueprint dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      if (blueprintImg && blueprintImg.width > 0) {
        if (canvas.width !== blueprintImg.width) canvas.width = blueprintImg.width;
        if (canvas.height !== blueprintImg.height) canvas.height = blueprintImg.height;
      } else {
        const targetW = container.clientWidth || 1000;
        const targetH = container.clientHeight || 650;
        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;
      }
      redraw();
    };

    updateSize();

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(container);
      return () => ro.disconnect();
    }
  }, [blueprintImg, redraw]);

  // Mouse / Touch Event Handlers
  const activePointers = useRef(new Map<number, {x: number, y: number}>());
  const initialPinchDist = useRef<number | null>(null);
  const initialZoomLevel = useRef(zoomLevel);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.target) e.target.setPointerCapture(e.pointerId);

    if (activePointers.current.size === 2 && onZoomChange) {
      const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];
      initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialZoomLevel.current = zoomLevel;
      return;
    }

    if (activePointers.current.size === 1) {
      handleMouseDown(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.current.size === 2 && initialPinchDist.current && onZoomChange) {
      const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const zoomFactor = currentDist / initialPinchDist.current;
      const newZoom = Math.min(Math.max(initialZoomLevel.current * zoomFactor, 0.2), 5.0);
      onZoomChange(newZoom);
      return;
    }

    if (activePointers.current.size <= 1) {
      handleMouseMove(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointers.current.delete(e.pointerId);
    if (e.target && e.target.hasPointerCapture(e.pointerId)) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe catch
      }
    }

    if (activePointers.current.size < 2) {
      initialPinchDist.current = null;
    }

    if (activePointers.current.size === 0) {
      handleMouseUp();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointerUp(e);
  };

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
    } else if (currentTool === 'highlight' && !isLocked) {
      setIsDrawing(true);
      currentPathRef.current = [{ x: pos.x, y: pos.y }];
    } else if (currentTool === 'straight' && !isLocked) {
      setIsDrawing(true);
      straightLineStartRef.current = { x: pos.x, y: pos.y };
      straightLinePreviewRef.current = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
      redraw();
    } else if (currentTool === 'camera' && !isLocked) {
      const camLabel = `${camPrefix}${String(camCounter).padStart(2, '0')}`;
      const isElectric = activeLayer === 'electrica';
      
      let nodeType: string | undefined = undefined;
      if (isElectric) {
        const p = camPrefix.toUpperCase();
        if (p.startsWith('TR')) nodeType = 'transformador';
        else if (p.startsWith('BE') || p.startsWith('BAR')) nodeType = 'barrajes_elastomericos';
        else if (p.startsWith('MED') || p.startsWith('CNT')) nodeType = 'contador_electrico';
        else if (p.startsWith('TD')) nodeType = 'tablero';
        else if (p.startsWith('LUM')) nodeType = 'luminaria';
        else if (p.startsWith('SPT')) nodeType = 'spt';
        else if (p.startsWith('CP')) nodeType = 'caja_paso';
        else if (p.startsWith('PF')) nodeType = 'punto_fuerza';
        else nodeType = 'camara_electrica';
      }
      
      const newEl: InspectionElement = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        type: 'camera',
        label: camLabel,
        layer: isElectric ? 'electrica' : 'civil',
        status: 'Pendiente',
        x: pos.x,
        y: pos.y,
        size: 9,
        camType: isElectric ? undefined : camDefaultType,
        electricNodeType: nodeType,
        circuitTag: isElectric ? `ACOMETIDA-${camLabel}` : undefined,
        voltage: nodeType === 'transformador' ? 13200 : (nodeType === 'barrajes_elastomericos' ? 13200 : 220),
        signalStrength: 90,
        date: new Date().toISOString().split('T')[0]
      };
      onAddElement(newEl);
    } else if (currentTool === 'area' && !isLocked) {
      if (currentAreaPoints.length >= 3) {
        const startPt = currentAreaPoints[0];
        const distToStart = Math.hypot(pos.x - startPt.x, pos.y - startPt.y);
        if (distToStart <= SNAP_RADIUS) {
          onFinishArea();
          return;
        }
      }
      onAddAreaPoint({ x: pos.x, y: pos.y });
    } else if (currentTool === 'eraser' && !isLocked) {
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

      if (!isLocked && Math.hypot(dx, dy) > 3) {
        drag.hasMoved = true;
      }
      
      if (!isLocked) {
        drag.currentDx = dx;
        drag.currentDy = dy;
      }
      redraw();
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
      straightLinePreviewRef.current = {
        x1: straightLineStartRef.current.x,
        y1: straightLineStartRef.current.y,
        x2: pos.x,
        y2: pos.y
      };
      redraw();
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
      } else if (onUpdateElement) {
        // Apply final position update
        const targetEl = elements.find(e => e.id === drag.id);
        if (targetEl) {
          const updated: InspectionElement = { ...targetEl };
          const dx = drag.currentDx || 0;
          const dy = drag.currentDy || 0;

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
      }
      draggedElementRef.current = null;
      setIsDraggingElement(false);
      redraw();
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
      } else if (currentTool === 'straight' && straightLineStartRef.current && straightLinePreviewRef.current) {
        const preview = straightLinePreviewRef.current;
        const dx = preview.x2 - straightLineStartRef.current.x;
        const dy = preview.y2 - straightLineStartRef.current.y;
        if (Math.hypot(dx, dy) > 10) {
          const isElectric = activeLayer === 'electrica';
          const lineCount = elements.filter(e => e.type === 'line' && normalizeLayer(e.layer) === (isElectric ? 'electrica' : 'civil')).length + 1;
          const label = isElectric 
            ? `Circuito E-${String(lineCount).padStart(2, '0')}` 
            : `Tramo T-${String(lineCount).padStart(2, '0')}`;
          const approxMeters = Math.max(1, Math.round(Math.hypot(dx, dy) / 15));
          
          const newEl: InspectionElement = {
            id: Date.now() + Math.floor(Math.random() * 100000),
            type: 'line',
            label: label,
            layer: isElectric ? 'electrica' : 'civil',
            status: 'Pendiente',
            x: straightLineStartRef.current.x,
            y: straightLineStartRef.current.y,
            x2: preview.x2,
            y2: preview.y2,
            meters: approxMeters,
            pipes: isElectric ? '2" Conduit EMT / PVC' : '6x6" PVC Schedule 40',
            cables: isElectric ? '3#4/0 AWG Cu + 1#4/0(N) + 1#4(T)' : '3#250 F+1#500N+1#6T',
            date: new Date().toISOString().split('T')[0]
          };
          onAddElement(newEl);
        }
      }
      setIsDrawing(false);
      straightLineStartRef.current = null;
      straightLinePreviewRef.current = null;
      currentPathRef.current = [];
      redraw();
    }
  };

  const getCursorClass = () => {
    if (currentTool === 'pan') {
      if (isDraggingElement) return 'cursor-grabbing';
      if (hoveredElementInfo) return 'cursor-grab';
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    if (currentTool === 'highlight' || currentTool === 'straight') return 'cursor-crosshair';
    if (currentTool === 'camera') return 'cursor-cell';
    if (currentTool === 'area') return 'cursor-crosshair';
    if (currentTool === 'eraser') return 'cursor-not-allowed';
    return 'cursor-default';
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800 ${className || 'w-full h-[650px]'} ${getCursorClass()}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="w-full h-full block touch-none"
      />

      {/* Floating Active Layer & Mode Pill */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-2 shadow-lg pointer-events-none no-print">
        {activeLayer === 'electrica' ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-300 font-extrabold flex items-center gap-1">
              ⚡ Capa Eléctrica Activa
            </span>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-300 font-extrabold flex items-center gap-1">
              🏗️ Capa Obras Civiles Activa
            </span>
          </>
        )}
        <span className="text-slate-500">|</span>
        <span className="text-slate-300 text-[11px]">
          {currentTool === 'pan' ? 'Inspeccionar / Arrastrar' : (currentTool === 'straight' ? 'Trazar Línea' : (currentTool === 'camera' ? 'Colocar Nodo' : currentTool))}
        </span>
      </div>
    </div>
  );
};
