import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ProjectMeta, 
  AreaSector, 
  InspectionElement, 
  FreehandStroke, 
  FilterState, 
  ActivityLog, 
  Point, 
  CameraNorm,
  AuthUser,
  GlobalConfig,
  ScheduleItem
} from './types';
import { 
  INITIAL_PROJECT_META, 
  INITIAL_AREAS, 
  INITIAL_ELEMENTS,
  INITIAL_SCHEDULE_ITEMS
} from './data/sampleData';

import { Header } from './components/Header';
import { ProjectMetaBar } from './components/ProjectMetaBar';
import { KpiMetrics } from './components/KpiMetrics';
import { RealtimeCharts } from './components/RealtimeCharts';
import { BlueprintCanvas, BlueprintCanvasRef } from './components/BlueprintCanvas';
import { CanvasToolbar, ToolType } from './components/CanvasToolbar';
import { SectorCards } from './components/SectorCards';
import { SectorSummaryTable } from './components/SectorSummaryTable';
import { BitacoraTable } from './components/BitacoraTable';
import { AreaModal } from './components/AreaModal';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { DataBackupModal } from './components/DataBackupModal';
import { DeleteConfirmModal, DeleteMode } from './components/DeleteConfirmModal';
import { AuthModal } from './components/AuthModal';
import { DailyTrackingModal } from './components/DailyTrackingModal';
import { ConfigModal } from './components/ConfigModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { ScheduleProgressModal } from './components/ScheduleProgressModal';
import { MemoriaCalculoModal } from './components/MemoriaCalculoModal';
import { AiRecognitionModal } from './components/AiRecognitionModal';
import { CollapsibleModule } from './components/CollapsibleModule';

import { 
  supabaseAuth, 
  supabaseAudit, 
  supabaseElements, 
  supabaseSchedule, 
  supabaseAreas, 
  supabaseProjectMeta 
} from './lib/supabase';

import { CheckCircle2, AlertCircle, Building2, TrendingUp, BarChart3, Layers, Grid, Map as MapIcon, ClipboardList, Minimize2, Maximize2, LayoutGrid } from 'lucide-react';

const ADMIN_EMAIL = 'jheanmurillo73@gmail.com';

export default function App() {
  // Persistent Application State with LocalStorage fallbacks
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(() => {
    try {
      const saved = localStorage.getItem('obra_project_meta_v2');
      return saved ? JSON.parse(saved) : INITIAL_PROJECT_META;
    } catch (e) {
      return INITIAL_PROJECT_META;
    }
  });

  const [areas, setAreas] = useState<AreaSector[]>(() => {
    try {
      const saved = localStorage.getItem('obra_areas_v2');
      return saved ? JSON.parse(saved) : INITIAL_AREAS;
    } catch (e) {
      return INITIAL_AREAS;
    }
  });

  const [elements, setElements] = useState<InspectionElement[]>(() => {
    try {
      const saved = localStorage.getItem('obra_elements_v2');
      return saved ? JSON.parse(saved) : INITIAL_ELEMENTS;
    } catch (e) {
      return INITIAL_ELEMENTS;
    }
  });

  const [strokes, setStrokes] = useState<FreehandStroke[]>(() => {
    try {
      const saved = localStorage.getItem('obra_strokes_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem('obra_activity_logs_v2');
      return saved ? JSON.parse(saved) : [
        {
          id: '1',
          timestamp: new Date().toLocaleTimeString(),
          message: 'Sistema de Control e Inspección de Obra iniciado.',
          type: 'telemetry_alert',
          severity: 'info'
        }
      ];
    } catch (e) {
      return [
        {
          id: '1',
          timestamp: new Date().toLocaleTimeString(),
          message: 'Sistema de Control e Inspección de Obra iniciado.',
          type: 'telemetry_alert',
          severity: 'info'
        }
      ];
    }
  });

  // Initial Cloud Data Hydration on Startup
  useEffect(() => {
    async function hydrateCloudData() {
      try {
        const cloudMeta = await supabaseProjectMeta.fetchMeta();
        if (cloudMeta) setProjectMeta(cloudMeta);

        const cloudAreas = await supabaseAreas.fetchAreas();
        if (cloudAreas && cloudAreas.length > 0) setAreas(cloudAreas);

        const cloudElements = await supabaseElements.fetchElements();
        if (cloudElements && cloudElements.length > 0) setElements(cloudElements);

        const cloudSchedule = await supabaseSchedule.fetchScheduleItems();
        if (cloudSchedule && cloudSchedule.length > 0) setScheduleItems(cloudSchedule);
      } catch (err) {
        console.warn('Note: Initial Supabase cloud fetch fallback:', err);
      }
    }
    hydrateCloudData();
  }, []);

  // Automatic LocalStorage & Supabase Cloud sync effects
  useEffect(() => {
    try { localStorage.setItem('obra_project_meta_v2', JSON.stringify(projectMeta)); } catch (e) {}
    supabaseProjectMeta.saveMeta(projectMeta);
  }, [projectMeta]);

  useEffect(() => {
    try { localStorage.setItem('obra_areas_v2', JSON.stringify(areas)); } catch (e) {}
    supabaseAreas.saveAreas(areas);
  }, [areas]);

  useEffect(() => {
    try { localStorage.setItem('obra_elements_v2', JSON.stringify(elements)); } catch (e) {}
    supabaseElements.saveAllElements(elements);
  }, [elements]);

  useEffect(() => {
    try { localStorage.setItem('obra_strokes_v2', JSON.stringify(strokes)); } catch (e) {}
  }, [strokes]);

  useEffect(() => {
    try { localStorage.setItem('obra_activity_logs_v2', JSON.stringify(activityLogs)); } catch (e) {}
  }, [activityLogs]);

  // Global Configuration & Modals State
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(() => {
    try {
      const saved = localStorage.getItem('obra_global_config_v1');
      return saved ? JSON.parse(saved) : { enableCableConsolidation: true, allowOnlyPipesOption: true };
    } catch (e) {
      return { enableCableConsolidation: true, allowOnlyPipesOption: true };
    }
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('obra_global_config_v1', JSON.stringify(globalConfig)); } catch (e) {}
  }, [globalConfig]);

  // Supabase Auth, Daily Tracking, Schedule & Version History Modals
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDailyTrackingModalOpen, setIsDailyTrackingModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);

  // Schedule / Cronograma Items State
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem('obra_schedule_items_v1');
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULE_ITEMS;
    } catch (e) {
      return INITIAL_SCHEDULE_ITEMS;
    }
  });

  const [isScheduleProgressModalOpen, setIsScheduleProgressModalOpen] = useState(false);
  const [scheduleInitialTab, setScheduleInitialTab] = useState<'matrix' | 'bySector' | 'byElement' | 'manage' | 'import'>('matrix');

  useEffect(() => {
    try { localStorage.setItem('obra_schedule_items_v1', JSON.stringify(scheduleItems)); } catch (e) {}
    supabaseSchedule.saveScheduleItems(scheduleItems);
  }, [scheduleItems]);


  // UI View Controls & App Mode (Admin vs Field)
  const [appMode, setAppMode] = useState<'admin' | 'field'>('admin');

  // Check Supabase session on mount & enforce role
  useEffect(() => {
    supabaseAuth.getSessionUser().then(user => {
      if (user) {
        setCurrentUser(user);
        const lowerEmail = user.email.trim().toLowerCase();
        const isAdmin = lowerEmail === ADMIN_EMAIL.toLowerCase() || user.role === 'admin' || lowerEmail.includes('admin');
        setAppMode(isAdmin ? 'admin' : 'field');
      } else {
        // If not logged in, default to field inspector mode for security
        setAppMode('field');
      }
    });
  }, []);

  const handleUserChanged = (user: AuthUser | null) => {
    setCurrentUser(user);
    if (user) {
      const lowerEmail = user.email.trim().toLowerCase();
      const isAdmin = lowerEmail === ADMIN_EMAIL.toLowerCase() || user.role === 'admin' || lowerEmail.includes('admin');
      if (isAdmin) {
        setAppMode('admin');
        showToast(`¡Sesión de Administrador activa! (${user.email})`);
      } else {
        setAppMode('field');
        showToast(`Sesión de Inspector activa (${user.fullName || user.email})`);
      }
    } else {
      setAppMode('field');
      showToast('Sesión cerrada');
    }
  };

  // Blueprint Image State
  const [blueprintImg, setBlueprintImg] = useState<HTMLImageElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(0);

  // UI View Controls & App Mode (Admin vs Field)
  const [showCharts, setShowCharts] = useState(true);
  
  // Collapsible Modules State
  const [collapsedModules, setCollapsedModules] = useState<{
    meta: boolean;
    kpis: boolean;
    charts: boolean;
    sectors: boolean;
    summaryTable: boolean;
    canvas: boolean;
    bitacora: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('obra_collapsed_modules_v2');
      return saved ? JSON.parse(saved) : {
        meta: false,
        kpis: false,
        charts: false,
        sectors: false,
        summaryTable: false,
        canvas: false,
        bitacora: false
      };
    } catch (e) {
      return {
        meta: false,
        kpis: false,
        charts: false,
        sectors: false,
        summaryTable: false,
        canvas: false,
        bitacora: false
      };
    }
  });

  useEffect(() => {
    try { localStorage.setItem('obra_collapsed_modules_v2', JSON.stringify(collapsedModules)); } catch (e) {}
  }, [collapsedModules]);

  const toggleModule = (moduleKey: keyof typeof collapsedModules) => {
    setCollapsedModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const setAllModulesCollapse = (collapse: boolean) => {
    setCollapsedModules({
      meta: collapse,
      kpis: collapse,
      charts: collapse,
      sectors: collapse,
      summaryTable: collapse,
      canvas: collapse,
      bitacora: collapse
    });
    showToast(collapse ? 'Todos los módulos han sido contraídos' : 'Todos los módulos han sido expandidos');
  };
  const canvasRef = useRef<BlueprintCanvasRef>(null);

  // Canvas Toolbar State
  const [currentTool, setCurrentTool] = useState<ToolType>('highlight');
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Camera creation state
  const [camPrefix, setCamPrefix] = useState('C-');
  const [camCounter, setCamCounter] = useState(9);
  const [camDefaultType, setCamDefaultType] = useState<CameraNorm>('SB850');

  // Label & Icon Scale state
  const [showCameraLabels, setShowCameraLabels] = useState(true);
  const [showLineLabels, setShowLineLabels] = useState(true);
  const [showAreaLabels, setShowAreaLabels] = useState(true);
  const [showSpecsLabels, setShowSpecsLabels] = useState(true);
  const [iconScale, setIconScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('obra_icon_scale_v1');
      return saved ? parseFloat(saved) : 1.6;
    } catch (e) {
      return 1.6;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('obra_icon_scale_v1', iconScale.toString()); } catch (e) {}
  }, [iconScale]);

  // Area demarcation & Delete modal state
  const [currentAreaPoints, setCurrentAreaPoints] = useState<Point[]>([]);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaSector | null>(null);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    mode: DeleteMode;
    area?: AreaSector | null;
    itemCount?: number;
  }>({
    isOpen: false,
    mode: 'single_area',
    area: null,
    itemCount: 0
  });

  // Inspection Drawer
  const [inspectedElement, setInspectedElement] = useState<InspectionElement | null>(null);

  // Data Backup Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Memoria de Cálculo / Acta Modal State
  const [isMemoriaModalOpen, setIsMemoriaModalOpen] = useState(false);
  const [memoriaInitialImport, setMemoriaInitialImport] = useState<boolean>(false);

  // AI Blueprint Recognition Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleImportAiElements = (newElements: InspectionElement[], summaryMsg: string) => {
    setElements(prev => [...prev, ...newElements]);
    setActivityLogs(prev => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: summaryMsg,
        type: 'element_added',
        severity: 'success'
      },
      ...prev
    ]);
  };

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Filter State
  const [filter, setFilter] = useState<FilterState>({
    startDate: '',
    endDate: '',
    preset: 'all',
    activeTab: 'all',
    searchQuery: '',
    statusFilter: 'all'
  });

  // Handle PDF & Image Upload
  const handleFileUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');

    if (isPdf) {
      // Use FileReader & PDF.js global if available or render pdf
      const reader = new FileReader();
      reader.onload = (e) => {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          pdfjs.getDocument({ data: typedarray }).promise.then((pdf: any) => {
            setPdfDoc(pdf);
            setTotalPdfPages(pdf.numPages);
            setCurrentPdfPage(1);
            renderPdfPage(pdf, 1);
          }).catch((err: any) => {
            console.error('Error procesando PDF:', err);
            showToast('Error al procesar el archivo PDF');
          });
        } else {
          showToast('Cargador PDF no disponible, reintente con una imagen (JPG/PNG)');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Image upload
      const imgUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setBlueprintImg(img);
        setPdfDoc(null);
        setZoomLevel(1.0);
        if (canvasRef.current) {
          canvasRef.current.resetView();
        }
        showToast(`Plano "${file.name}" cargado y ajustado al lienzo`);
      };
      img.src = imgUrl;
    }
  };

  const renderPdfPage = (pdf: any, pageNum: number) => {
    pdf.getPage(pageNum).then((page: any) => {
      const viewport = page.getViewport({ scale: 2.0 });
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      page.render({ canvasContext: tempCtx, viewport }).promise.then(() => {
        const img = new Image();
        img.onload = () => {
          setBlueprintImg(img);
          setZoomLevel(1.0);
          if (canvasRef.current) {
            canvasRef.current.resetView();
          }
          showToast(`PDF Página ${pageNum} cargada (Ajustada al lienzo)`);
        };
        img.src = tempCanvas.toDataURL('image/png');
      });
    });
  };

  const handlePrevPdfPage = () => {
    if (pdfDoc && currentPdfPage > 1) {
      const p = currentPdfPage - 1;
      setCurrentPdfPage(p);
      renderPdfPage(pdfDoc, p);
    }
  };

  const handleNextPdfPage = () => {
    if (pdfDoc && currentPdfPage < totalPdfPages) {
      const p = currentPdfPage + 1;
      setCurrentPdfPage(p);
      renderPdfPage(pdfDoc, p);
    }
  };

  // Canvas Actions
  const handleAddStroke = (stroke: FreehandStroke) => {
    setStrokes(prev => [...prev, stroke]);
  };

  const handleAddElement = (element: InspectionElement) => {
    setElements(prev => [...prev, element]);
    if (element.type === 'camera') {
      setCamCounter(c => c + 1);
      showToast(`Cámara ${element.label} agregada`);
    } else {
      showToast(`Tramo ${element.label} (${element.meters}m) registrado`);
    }

    // Audit log event
    supabaseAudit.logEvent({
      userEmail: currentUser?.email || 'anonimo@obra.com',
      userName: currentUser?.fullName || currentUser?.email || 'Inspector',
      userRole: currentUser?.role || 'inspector',
      actionType: 'create',
      entityType: element.type === 'camera' ? 'camara' : 'tramo',
      entityId: String(element.id),
      entityName: element.label,
      details: element.type === 'camera'
        ? `Creó cámara ${element.label} (${element.camType || 'Cámara'}) en posición (${Math.round(element.x)}, ${Math.round(element.y)})`
        : `Registró tramo ${element.label} de ${element.meters || 0}m [${element.pipes || 'Tubería'}] (${element.cables || 'Sin especif.'})`,
      newValue: JSON.stringify({ label: element.label, camType: element.camType, meters: element.meters, cables: element.cables, status: element.status, x: element.x, y: element.y })
    });
  };

  const handleUpdateElement = (updated: InspectionElement) => {
    const oldEl = elements.find(e => e.id === updated.id);
    setElements(prev => prev.map(e => e.id === updated.id ? updated : e));
    if (inspectedElement && inspectedElement.id === updated.id) {
      setInspectedElement(updated);
    }

    const isMoved = oldEl && (Math.abs(oldEl.x - updated.x) > 2 || Math.abs(oldEl.y - updated.y) > 2 || (oldEl.x2 !== undefined && updated.x2 !== undefined && Math.abs(oldEl.x2 - updated.x2) > 2));
    const actionType = isMoved ? 'move' : (oldEl?.status !== updated.status ? 'status_change' : 'update');

    supabaseAudit.logEvent({
      userEmail: currentUser?.email || 'anonimo@obra.com',
      userName: currentUser?.fullName || currentUser?.email || 'Inspector',
      userRole: currentUser?.role || 'inspector',
      actionType,
      entityType: updated.type === 'camera' ? 'camara' : 'tramo',
      entityId: String(updated.id),
      entityName: updated.label,
      details: isMoved 
        ? `Cambió la ubicación de ${updated.type === 'camera' ? 'cámara' : 'tramo'} ${updated.label}`
        : `Actualizó datos/estado de ${updated.type === 'camera' ? 'cámara' : 'tramo'} ${updated.label} (${updated.status})`,
      previousValue: oldEl ? JSON.stringify({ label: oldEl.label, status: oldEl.status, meters: oldEl.meters, x: oldEl.x, y: oldEl.y }) : undefined,
      newValue: JSON.stringify({ label: updated.label, status: updated.status, meters: updated.meters, x: updated.x, y: updated.y })
    });
  };

  const handleDeleteElement = (id: number) => {
    const targetEl = elements.find(e => e.id === id);
    setElements(prev => prev.filter(e => e.id !== id));
    if (inspectedElement && inspectedElement.id === id) {
      setInspectedElement(null);
    }
    showToast('Elemento eliminado de la bitácora');

    if (targetEl) {
      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'anonimo@obra.com',
        userName: currentUser?.fullName || currentUser?.email || 'Inspector',
        userRole: currentUser?.role || 'inspector',
        actionType: 'delete',
        entityType: targetEl.type === 'camera' ? 'camara' : 'tramo',
        entityId: String(targetEl.id),
        entityName: targetEl.label,
        details: `Eliminó ${targetEl.type === 'camera' ? 'cámara' : 'tramo'} ${targetEl.label}`,
        previousValue: JSON.stringify({ label: targetEl.label, meters: targetEl.meters, status: targetEl.status, camType: targetEl.camType })
      });
    }
  };



  const handleEraseAt = (point: Point) => {
    const radius = 25;
    // Erase strokes
    setStrokes(prev => prev.filter(s => !s.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < radius)));

    // Erase elements
    setElements(prev => prev.filter(el => {
      if (el.type === 'camera') {
        return Math.hypot(el.x - point.x, el.y - point.y) >= radius;
      }
      if (el.type === 'line' && el.x2 !== undefined && el.y2 !== undefined) {
        const dist = pointToSegmentDistance(point.x, point.y, el.x, el.y, el.x2, el.y2);
        return dist >= radius;
      }
      return true;
    }));
  };

  const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Locate element on canvas
  const handleLocateElement = (element: InspectionElement) => {
    setZoomLevel(1.8);
    setInspectedElement(element);
    showToast(`Ubicar ${element.label} en el plano`);
  };

  // Area Sector Actions
  const handleAddAreaPoint = (point: Point) => {
    setCurrentAreaPoints(prev => [...prev, point]);
  };

  const handleFinishArea = () => {
    if (currentAreaPoints.length < 3) {
      showToast('Se requieren al menos 3 puntos para cerrar un sector');
      return;
    }
    setEditingArea(null);
    setIsAreaModalOpen(true);
  };

  const handleSaveArea = (
    code: string,
    name: string,
    color: any,
    dims?: { widthMeters?: number; lengthMeters?: number; calculatedAreaM2?: number; notes?: string }
  ) => {
    if (editingArea) {
      setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, code, name, color, ...dims } : a));
      showToast(`Sector "${code} - ${name}" actualizado`);

      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Usuario',
        userRole: currentUser?.role || 'admin',
        actionType: 'update',
        entityType: 'area',
        entityId: String(editingArea.id),
        entityName: `${code} - ${name}`,
        details: `Actualizó sector "${code} - ${name}" (${dims?.calculatedAreaM2 || '0'} m²)`,
        previousValue: JSON.stringify({ code: editingArea.code, name: editingArea.name, calculatedAreaM2: editingArea.calculatedAreaM2 }),
        newValue: JSON.stringify({ code, name, calculatedAreaM2: dims?.calculatedAreaM2 })
      });
    } else {
      const newArea: AreaSector = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        code,
        name,
        points: [...currentAreaPoints],
        color,
        ...dims
      };
      setAreas(prev => [...prev, newArea]);
      setCurrentAreaPoints([]);
      showToast(`Sector "${code} - ${name}" registrado exitosamente`);

      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Usuario',
        userRole: currentUser?.role || 'admin',
        actionType: 'create',
        entityType: 'area',
        entityId: String(newArea.id),
        entityName: `${code} - ${name}`,
        details: `Demarcó nuevo sector "${code} - ${name}" (${dims?.calculatedAreaM2 || '0'} m²)`,
        newValue: JSON.stringify({ code, name, calculatedAreaM2: dims?.calculatedAreaM2 })
      });

      setActivityLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Nuevo sector "${code} - ${name}" registrado`,
          type: 'sector_created',
          severity: 'success'
        },
        ...logs.slice(0, 19)
      ]);
    }
    setIsAreaModalOpen(false);
    setEditingArea(null);
  };


  const handleEditArea = (areaId: number) => {
    const target = areas.find(a => a.id === areaId);
    if (target) {
      setEditingArea(target);
      setIsAreaModalOpen(true);
    }
  };

  const handleDeleteArea = (areaId: number) => {
    const target = areas.find(a => a.id === areaId);
    if (target) {
      setDeleteModalConfig({
        isOpen: true,
        mode: 'single_area',
        area: target
      });
    }
  };

  const handleDeleteAllAreas = () => {
    if (areas.length === 0) return;
    setDeleteModalConfig({
      isOpen: true,
      mode: 'all_areas',
      itemCount: areas.length
    });
  };

  const handleDeleteAllElements = () => {
    if (elements.length === 0) return;
    setDeleteModalConfig({
      isOpen: true,
      mode: 'all_elements',
      itemCount: elements.length
    });
  };

  const confirmDeleteAction = () => {
    const { mode, area } = deleteModalConfig;

    if (mode === 'single_area' && area) {
      setAreas(prev => prev.filter(a => a.id !== area.id));
      if (editingArea?.id === area.id) {
        setEditingArea(null);
        setIsAreaModalOpen(false);
      }
      showToast(`Sector ${area.code ? `[${area.code}]` : ''} "${area.name}" eliminado correctamente`);

      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Administrador',
        userRole: currentUser?.role || 'admin',
        actionType: 'delete',
        entityType: 'area',
        entityId: String(area.id),
        entityName: `${area.code || ''} ${area.name}`,
        details: `Eliminó el sector "${area.code || ''} ${area.name}"`,
        previousValue: JSON.stringify({ code: area.code, name: area.name })
      });

      setActivityLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Sector "${area.name}" (${area.code || 'S/N'}) eliminado de la obra`,
          type: 'sector_created',
          severity: 'warning'
        },
        ...logs.slice(0, 19)
      ]);
    } else if (mode === 'all_areas') {
      const count = areas.length;
      setAreas([]);
      setEditingArea(null);
      setIsAreaModalOpen(false);
      showToast(`Se han eliminado todos los sectores (${count} zonas)`);

      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Administrador',
        userRole: currentUser?.role || 'admin',
        actionType: 'delete',
        entityType: 'area',
        details: `Eliminó masivamente todos los sectores demarcados (${count} sectores)`
      });

      setActivityLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Todos los sectores demarcados (${count}) han sido eliminados.`,
          type: 'sector_created',
          severity: 'warning'
        },
        ...logs.slice(0, 19)
      ]);
    } else if (mode === 'all_elements') {
      const count = elements.length;
      setElements([]);
      setInspectedElement(null);

      supabaseAudit.logEvent({
        userEmail: currentUser?.email || 'admin@obra.com',
        userName: currentUser?.fullName || 'Administrador',
        userRole: currentUser?.role || 'admin',
        actionType: 'delete',
        entityType: 'tramo',
        details: `Eliminó masivamente todos los elementos de la bitácora (${count} tramos y cámaras)`
      });

      showToast(`Se han eliminado todos los elementos (${count} tramos y cámaras)`);
      setActivityLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          message: `Todos los tramos y cámaras (${count}) fueron eliminados de la obra.`,
          type: 'telemetry_alert',
          severity: 'warning'
        },
        ...logs.slice(0, 19)
      ]);
    }

    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
  };


  // Helper point in polygon test for bitácora area badge
  const getAreaNameForElement = (el: InspectionElement): string => {
    const targetX = el.type === 'camera' ? el.x : (el.x + (el.x2 ?? el.x)) / 2;
    const targetY = el.type === 'camera' ? el.y : (el.y + (el.y2 ?? el.y)) / 2;

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

    const found = areas.find(a => pointInPolygon(targetX, targetY, a.points));
    if (!found) return 'Sin Área';
    return found.code ? `${found.code}` : found.name;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-2 sm:p-4 flex flex-col gap-3 max-w-[1700px] mx-auto print-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <Header
        onFileUpload={handleFileUpload}
        pdfDoc={pdfDoc}
        currentPdfPage={currentPdfPage}
        totalPdfPages={totalPdfPages}
        onPrevPdfPage={handlePrevPdfPage}
        onNextPdfPage={handleNextPdfPage}
        onClearCanvas={() => {
          setStrokes([]);
          setCurrentAreaPoints([]);
          showToast('Trazos y marcas del plano limpiados');
        }}
        onExportPDF={() => window.print()}
        onOpenDataBackup={() => setIsBackupModalOpen(true)}
        showCharts={showCharts}
        onToggleCharts={() => setShowCharts(!showCharts)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDailyTrackingModal={() => setIsDailyTrackingModalOpen(true)}
        appMode={appMode}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenVersionHistory={() => setIsVersionHistoryModalOpen(true)}
        onOpenScheduleProgress={(tab) => {
          setScheduleInitialTab(tab || 'matrix');
          setIsScheduleProgressModalOpen(true);
        }}
        onOpenMemoriaModal={(showImport) => {
          setMemoriaInitialImport(!!showImport);
          setIsMemoriaModalOpen(true);
        }}
        onOpenAiRecognition={() => setIsAiModalOpen(true)}

        onToggleAppMode={() => {
          const userEmail = currentUser?.email?.trim().toLowerCase() || '';
          const isUserAdmin = userEmail === ADMIN_EMAIL.toLowerCase() || currentUser?.role === 'admin' || userEmail.includes('admin');
          
          if (appMode === 'field' && !isUserAdmin) {
            setIsAuthModalOpen(true);
            showToast(`Inicia sesión como ${ADMIN_EMAIL} para activar el Modo Administrador`);
            return;
          }

          const nextMode = appMode === 'admin' ? 'field' : 'admin';
          setAppMode(nextMode);
          if (nextMode === 'field') {
            setCurrentTool('pan');
            showToast('Modo Inspección de Campo activado');
          } else {
            showToast('Modo Administrador activado (Edición y Configuración)');
          }
        }}
        onExportAnnotatedBlueprintPNG={() => {
          if (canvasRef.current) {
            canvasRef.current.exportAnnotatedBlueprintPNG(projectMeta);
            showToast('Plano anotado generado y descargado en PNG');
          }
        }}
      />

      {/* Quick Modules Collapse/Expand Control Bar */}
      <div className="bg-slate-900/90 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-sm text-xs no-print">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Vista de Módulos
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold">
            {Object.values(collapsedModules).filter(Boolean).length} / {Object.keys(collapsedModules).length} contraídos
          </span>
        </div>

        {/* Quick Module Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <button
            onClick={() => toggleModule('meta')}
            className={`px-2 py-1 rounded font-bold border transition ${
              !collapsedModules.meta
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Mostrar/Ocultar Datos del Proyecto"
          >
            📋 Proyecto
          </button>

          {appMode === 'admin' && (
            <>
              <button
                onClick={() => toggleModule('kpis')}
                className={`px-2 py-1 rounded font-bold border transition ${
                  !collapsedModules.kpis
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Mostrar/Ocultar Métricas e Indicadores KPI"
              >
                📊 KPIs y Actas
              </button>

              <button
                onClick={() => toggleModule('charts')}
                className={`px-2 py-1 rounded font-bold border transition ${
                  !collapsedModules.charts
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Mostrar/Ocultar Gráficos de Inspección"
              >
                📈 Gráficos
              </button>

              <button
                onClick={() => toggleModule('sectors')}
                className={`px-2 py-1 rounded font-bold border transition ${
                  !collapsedModules.sectors
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Mostrar/Ocultar Avance por Sectores"
              >
                🗺️ Sectores
              </button>

              <button
                onClick={() => toggleModule('summaryTable')}
                className={`px-2 py-1 rounded font-bold border transition ${
                  !collapsedModules.summaryTable
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Mostrar/Ocultar Matriz Consolidada Sectorial"
              >
                📑 Matriz
              </button>
            </>
          )}

          <button
            onClick={() => toggleModule('canvas')}
            className={`px-2 py-1 rounded font-bold border transition ${
              !collapsedModules.canvas
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Mostrar/Ocultar Plano Interactivo"
          >
            📐 Plano
          </button>

          <button
            onClick={() => toggleModule('bitacora')}
            className={`px-2 py-1 rounded font-bold border transition ${
              !collapsedModules.bitacora
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Mostrar/Ocultar Bitácora de Registro"
          >
            📝 Bitácora
          </button>
        </div>

        {/* Global Expand / Collapse Actions */}
        <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-2">
          <button
            onClick={() => setAllModulesCollapse(false)}
            className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold flex items-center gap-1 transition text-[11px]"
            title="Expandir todos los módulos de la aplicación"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Expandir Todos</span>
          </button>
          <button
            onClick={() => setAllModulesCollapse(true)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold flex items-center gap-1 transition text-[11px] border border-slate-700"
            title="Contraer todos los módulos de la aplicación"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Contraer Todos</span>
          </button>
        </div>
      </div>

      {/* Project Meta Inputs Bar Module */}
      <CollapsibleModule
        id="meta"
        title="Datos Generales del Proyecto de Obra"
        subtitle="Inspector de obra, empresa contratista/frente, fecha de inspección y ubicación"
        icon={<Building2 className="w-4 h-4 text-amber-600" />}
        badge={
          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
            {elements.length} elementos registrados
          </span>
        }
        isCollapsed={collapsedModules.meta}
        onToggle={() => toggleModule('meta')}
        headerBgClass="bg-amber-50/40"
      >
        <ProjectMetaBar
          meta={projectMeta}
          onChange={setProjectMeta}
          totalElements={elements.length}
        />
      </CollapsibleModule>

      {/* KPI Performance Dashboard Module (Admin Mode Only) */}
      {appMode === 'admin' && (
        <CollapsibleModule
          id="kpis"
          title="Panel de Métricas e Indicadores KPI"
          subtitle="Avances físicos, porcentajes de ejecución y estadísticas detalladas por Acta de Cobro"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          badge={
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
              {elements.filter(e => e.status === 'Terminado').length} / {elements.length} Terminados
            </span>
          }
          isCollapsed={collapsedModules.kpis}
          onToggle={() => toggleModule('kpis')}
          headerBgClass="bg-emerald-50/40"
        >
          <KpiMetrics
            elements={elements}
            filter={filter}
            onFilterChange={setFilter}
          />
        </CollapsibleModule>
      )}

      {/* Realtime Charts View Module */}
      {showCharts && appMode === 'admin' && (
        <CollapsibleModule
          id="charts"
          title="Gráficos de Avance y Distribución en Tiempo Real"
          subtitle="Visualización analítica de metrajes de canalización y cámaras por sector"
          icon={<BarChart3 className="w-4 h-4 text-sky-600" />}
          isCollapsed={collapsedModules.charts}
          onToggle={() => toggleModule('charts')}
          headerBgClass="bg-sky-50/40"
        >
          <RealtimeCharts
            areas={areas}
            elements={elements}
          />
        </CollapsibleModule>
      )}

      {/* Sector Progress Cards Module */}
      {appMode === 'admin' && (
        <CollapsibleModule
          id="sectors"
          title="Sectores y Zonas de Trabajo Demarcadas"
          subtitle="Seguimiento individualizado por sectores geográficos del plano"
          icon={<Layers className="w-4 h-4 text-purple-600" />}
          badge={
            <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-bold">
              {areas.length} zonas
            </span>
          }
          isCollapsed={collapsedModules.sectors}
          onToggle={() => toggleModule('sectors')}
          headerBgClass="bg-purple-50/40"
        >
          <SectorCards
            areas={areas}
            elements={elements}
            onEditArea={handleEditArea}
            onDeleteArea={handleDeleteArea}
            onDeleteAllAreas={handleDeleteAllAreas}
            onStartDemarcating={() => setCurrentTool('area')}
          />
        </CollapsibleModule>
      )}

      {/* Consolidated Sector Matrix Table Module */}
      {appMode === 'admin' && (
        <CollapsibleModule
          id="summaryTable"
          title="Matriz Consolidada de Materiales por Sector"
          subtitle="Cuadro acumulado de tuberías, cables, calibres, metrajes y cámaras por zona"
          icon={<Grid className="w-4 h-4 text-indigo-600" />}
          isCollapsed={collapsedModules.summaryTable}
          onToggle={() => toggleModule('summaryTable')}
          headerBgClass="bg-indigo-50/40"
        >
          <SectorSummaryTable
            areas={areas}
            elements={elements}
            onRefresh={() => showToast('Tabla consolidada sectorial actualizada')}
            onEditArea={handleEditArea}
            onDeleteArea={handleDeleteArea}
            onDeleteAllAreas={handleDeleteAllAreas}
            enableCableConsolidation={globalConfig.enableCableConsolidation}
          />
        </CollapsibleModule>
      )}

      {/* Main Grid: Left Canvas + Toolbar, Right Bitácora Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column: Canvas & Toolbar */}
        <div className={`${
          collapsedModules.bitacora && !collapsedModules.canvas
            ? 'lg:col-span-12'
            : collapsedModules.canvas && !collapsedModules.bitacora
            ? 'lg:col-span-12'
            : 'lg:col-span-7'
        } flex flex-col gap-2`}>
          <CollapsibleModule
            id="canvas"
            title="Plano Interactivo & Herramientas de Inspección"
            subtitle="Cargue de plano en PDF/Imagen, demarcación de zonas y trazado"
            icon={<MapIcon className="w-4 h-4 text-blue-600" />}
            badge={
              <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
                Zoom {Math.round(zoomLevel * 100)}%
              </span>
            }
            isCollapsed={collapsedModules.canvas}
            onToggle={() => toggleModule('canvas')}
            headerBgClass="bg-blue-50/40"
          >
            <div className="p-2 space-y-2">
              <CanvasToolbar
                currentTool={currentTool}
                onSelectTool={setCurrentTool}
                areaPointCount={currentAreaPoints.length}
                onUndoAreaPoint={() => {
                  setCurrentAreaPoints(pts => pts.slice(0, -1));
                  showToast('Último punto eliminado');
                }}
                onFinishArea={handleFinishArea}
                onCancelArea={() => {
                  setCurrentAreaPoints([]);
                  showToast('Demarcación cancelada');
                }}
                camPrefix={camPrefix}
                onCamPrefixChange={setCamPrefix}
                camCounter={camCounter}
                onCamCounterChange={setCamCounter}
                camDefaultType={camDefaultType}
                onCamDefaultTypeChange={setCamDefaultType}
                zoomLevel={zoomLevel}
                onZoomIn={() => setZoomLevel(z => Math.min(4.0, z * 1.25))}
                onZoomOut={() => setZoomLevel(z => Math.max(0.3, z * 0.8))}
                onZoomReset={() => setZoomLevel(1.0)}
                onZoomFit={() => {
                  setZoomLevel(1.0);
                  if (canvasRef.current) {
                    canvasRef.current.resetView();
                  }
                  showToast('Plano ajustado al lienzo');
                }}
                showCameraLabels={showCameraLabels}
                onToggleCameraLabels={() => setShowCameraLabels(!showCameraLabels)}
                showLineLabels={showLineLabels}
                onToggleLineLabels={() => setShowLineLabels(!showLineLabels)}
                showAreaLabels={showAreaLabels}
                onToggleAreaLabels={() => setShowAreaLabels(!showAreaLabels)}
                showSpecsLabels={showSpecsLabels}
                onToggleSpecsLabels={() => setShowSpecsLabels(!showSpecsLabels)}
                iconScale={iconScale}
                onChangeIconScale={(s) => {
                  setIconScale(s);
                  showToast(`Escala de íconos ajustada a ${s}x`);
                }}
                appMode={appMode}
                onOpenAiRecognition={() => setIsAiModalOpen(true)}
              />

              <BlueprintCanvas
                ref={canvasRef}
                blueprintImg={blueprintImg}
                currentTool={currentTool}
                strokes={strokes}
                elements={elements}
                areas={areas}
                zoomLevel={zoomLevel}
                iconScale={iconScale}
                showCameraLabels={showCameraLabels}
                showLineLabels={showLineLabels}
                showAreaLabels={showAreaLabels}
                showSpecsLabels={showSpecsLabels}
                camPrefix={camPrefix}
                camCounter={camCounter}
                camDefaultType={camDefaultType}
                currentAreaPoints={currentAreaPoints}
                onAddAreaPoint={handleAddAreaPoint}
                onFinishArea={handleFinishArea}
                onAddStroke={handleAddStroke}
                onAddElement={handleAddElement}
                onUpdateElement={handleUpdateElement}
                onEraseAt={handleEraseAt}
                onInspectElement={setInspectedElement}
              />
            </div>
          </CollapsibleModule>
        </div>

        {/* Right Column: Bitácora Table */}
        <div className={`${
          collapsedModules.canvas && !collapsedModules.bitacora
            ? 'lg:col-span-12'
            : collapsedModules.bitacora && !collapsedModules.canvas
            ? 'lg:col-span-12'
            : 'lg:col-span-5'
        } flex flex-col gap-2`}>
          <CollapsibleModule
            id="bitacora"
            title="Bitácora de Registro y Control de Inspección"
            subtitle="Lista detallada de elementos, estado, actas, observaciones y fecha"
            icon={<ClipboardList className="w-4 h-4 text-teal-600" />}
            badge={
              <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold">
                {elements.length} elementos
              </span>
            }
            isCollapsed={collapsedModules.bitacora}
            onToggle={() => toggleModule('bitacora')}
            headerBgClass="bg-teal-50/40"
          >
            <BitacoraTable
              elements={elements}
              filter={filter}
              onFilterChange={setFilter}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDeleteAllElements={handleDeleteAllElements}
              onLocateElement={handleLocateElement}
              onAddTramo={() => {
                const lineCount = elements.filter(e => e.type === 'line').length + 1;
                const label = `Tramo T-${String(lineCount).padStart(2, '0')}`;
                const newEl: InspectionElement = {
                  id: Date.now() + Math.floor(Math.random() * 100000),
                  type: 'line',
                  label,
                  status: 'Pendiente',
                  x: 200,
                  y: 200,
                  x2: 350,
                  y2: 200,
                  meters: 25,
                  pipes: '6x6" PVC Schedule 40',
                  cables: '3#250 F+1#500N+1#6T',
                  date: new Date().toISOString().split('T')[0]
                };
                handleAddElement(newEl);
              }}
              onAddCamera={() => {
                const camLabel = `${camPrefix}${String(camCounter).padStart(2, '0')}`;
                const newEl: InspectionElement = {
                  id: Date.now() + Math.floor(Math.random() * 100000),
                  type: 'camera',
                  label: camLabel,
                  status: 'Pendiente',
                  x: 300,
                  y: 300,
                  camType: camDefaultType,
                  voltage: 220,
                  signalStrength: 95,
                  date: new Date().toISOString().split('T')[0]
                };
                handleAddElement(newEl);
              }}
              onInspectElement={setInspectedElement}
              getAreaNameForElement={getAreaNameForElement}
              globalConfig={globalConfig}
            />
          </CollapsibleModule>
        </div>
      </div>

      {/* Area Demarcation Modal */}
      <AreaModal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        editingArea={editingArea}
        areaPoints={currentAreaPoints}
        nextAreaNumber={areas.length + 1}
        elements={elements}
        onSaveArea={handleSaveArea}
        onDeleteArea={handleDeleteArea}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalConfig.isOpen}
        mode={deleteModalConfig.mode}
        area={deleteModalConfig.area}
        itemCount={deleteModalConfig.itemCount}
        onClose={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteAction}
      />

      {/* Telemetry Inspection Drawer */}
      <TelemetryDrawer
        element={inspectedElement}
        onClose={() => setInspectedElement(null)}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
        areaName={inspectedElement ? getAreaNameForElement(inspectedElement) : ''}
        scheduleItems={scheduleItems}
        globalConfig={globalConfig}
      />

      {/* Data Backup / Export Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        meta={projectMeta}
        areas={areas}
        elements={elements}
        onImportData={(data) => {
          if (data.meta) setProjectMeta(data.meta);
          if (data.areas) setAreas(data.areas);
          if (data.elements) setElements(data.elements);
          showToast('Datos de inspección restaurados correctamente');
        }}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        showToast={showToast}
      />

      {/* Daily Tracking / Bitácora Modal */}
      <DailyTrackingModal
        isOpen={isDailyTrackingModalOpen}
        onClose={() => setIsDailyTrackingModalOpen(false)}
        projectMeta={projectMeta}
        elements={elements}
        areas={areas}
        currentUser={currentUser}
        showToast={showToast}
        onAddActivityLog={(msg, type, severity) => {
          setActivityLogs(logs => [
            {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              timestamp: new Date().toLocaleTimeString(),
              message: msg,
              type,
              severity
            },
            ...logs.slice(0, 19)
          ]);
        }}
      />

      {/* Configuration & Profiles Management Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentUser={currentUser}
        globalConfig={globalConfig}
        onUpdateGlobalConfig={(newCfg) => {
          setGlobalConfig(newCfg);
          supabaseAudit.logEvent({
            userEmail: currentUser?.email || 'admin@obra.com',
            userName: currentUser?.fullName || 'Administrador',
            userRole: currentUser?.role || 'admin',
            actionType: 'update',
            entityType: 'config',
            entityName: 'Configuración de Obra',
            details: `Actualizó preferencias globales (Consolidado: ${newCfg.enableCableConsolidation ? 'Sí' : 'No'}, Solo Tuberías: ${newCfg.allowOnlyPipesOption ? 'Sí' : 'No'})`
          });
        }}
        showToast={showToast}
      />

      {/* Version History & Supabase Audit Log Modal */}
      <VersionHistoryModal
        isOpen={isVersionHistoryModalOpen}
        onClose={() => setIsVersionHistoryModalOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
      />
      {/* Schedule / Cronograma & Progress Control Modal */}
      <ScheduleProgressModal
        isOpen={isScheduleProgressModalOpen}
        onClose={() => setIsScheduleProgressModalOpen(false)}
        scheduleItems={scheduleItems}
        onUpdateScheduleItems={(items) => setScheduleItems(items)}
        elements={elements}
        onUpdateElement={handleUpdateElement}
        areas={areas}
        currentUser={currentUser}
        showToast={showToast}
        initialTab={scheduleInitialTab}
      />

      {/* Memoria de Cálculo del Acta de Cobro Modal */}
      <MemoriaCalculoModal
        isOpen={isMemoriaModalOpen}
        onClose={() => setIsMemoriaModalOpen(false)}
        elements={elements}
        projectMeta={projectMeta}
        blueprintImg={blueprintImg}
        onUpdateElement={handleUpdateElement}
        showToast={showToast}
        initialShowImport={memoriaInitialImport}
      />

      {/* AI Blueprint Recognition Modal */}
      <AiRecognitionModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        blueprintImg={blueprintImg}
        onImportElements={handleImportAiElements}
        showToast={showToast}
      />
    </div>
  );
}

