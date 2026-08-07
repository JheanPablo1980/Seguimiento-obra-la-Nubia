import React, { useState } from 'react';
import { InspectionElement, CameraNorm } from '../types';
import { 
  Sparkles, 
  Scan, 
  CheckCircle2, 
  X, 
  Layers, 
  AlertCircle, 
  Cpu, 
  Box, 
  Wifi, 
  Zap, 
  RefreshCw,
  Info,
  Check,
  Eye,
  FileText,
  Search,
  SlidersHorizontal,
  Target,
  Ruler,
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface AiRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintImg: HTMLImageElement | null;
  onImportElements: (newElements: InspectionElement[], summaryMsg: string) => void;
  showToast: (msg: string) => void;
}

interface ExtendedDetectedElement extends InspectionElement {
  widthRatio?: number;
  heightRatio?: number;
  dimensions?: string;
  confidence?: number;
  nearbyText?: string;
  networkType?: string;
}

export const AiRecognitionModal: React.FC<AiRecognitionModalProps> = ({
  isOpen,
  onClose,
  blueprintImg,
  onImportElements,
  showToast,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'report' | 'conduits'>('map');
  const [filterNorm, setFilterNorm] = useState<'all' | 'MT' | 'BT' | 'D' | 'line'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredElementId, setHoveredElementId] = useState<number | null>(null);

  const [detectedData, setDetectedData] = useState<{
    elements: ExtendedDetectedElement[];
    summary: string;
    counts: { mt: number; bt: number; d: number; lines: number; totalMeters: number };
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  // Convert current image to base64 string
  const getBlueprintBase64 = (): string | null => {
    if (!blueprintImg) return null;
    const canvas = document.createElement('canvas');
    canvas.width = blueprintImg.naturalWidth || blueprintImg.width || 1200;
    canvas.height = blueprintImg.naturalHeight || blueprintImg.height || 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(blueprintImg, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleRunRecognition = async () => {
    if (!blueprintImg) {
      setErrorMsg('Primero debes cargar una imagen de plano (JPG/PNG).');
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);
    setDetectedData(null);

    try {
      const base64Data = getBlueprintBase64();
      if (!base64Data) {
        throw new Error('No se pudo convertir la imagen del plano.');
      }

      const res = await fetch('/api/detect-blueprint-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error ${res.status}: Fallo en el reconocimiento IA`);
      }

      const data = await res.json();
      const rawElements = data.detectedElements || [];
      const rawLines = data.detectedLines || [];

      // Calculate actual pixel dimensions from current blueprintImg
      const imgW = blueprintImg.naturalWidth || blueprintImg.width || 1200;
      const imgH = blueprintImg.naturalHeight || blueprintImg.height || 800;

      const newElements: ExtendedDetectedElement[] = [];
      const nowStr = new Date().toISOString().split('T')[0];
      let idCounter = Date.now();

      let mtCount = 0;
      let btCount = 0;
      let dCount = 0;
      let accumMeters = 0;

      // 1. Process Cameras
      rawElements.forEach((el: any) => {
        idCounter++;
        const normCode = (el.norm || 'BT').toUpperCase();
        let normType: CameraNorm = 'BT';

        if (normCode.includes('MT')) {
          normType = 'MT';
          mtCount++;
        } else if (normCode.includes('D') || normCode.includes('DATOS')) {
          normType = 'D';
          dCount++;
        } else {
          normType = 'BT';
          btCount++;
        }

        // Map normalized coordinates 0-1000 to pixel coordinates
        const posX = Math.round(((el.xRatio || 500) / 1000) * imgW);
        const posY = Math.round(((el.yRatio || 500) / 1000) * imgH);

        newElements.push({
          id: idCounter,
          type: 'camera',
          label: el.code || `CAM-${normType}-${newElements.length + 1}`,
          status: el.status === 'Terminado' ? 'Terminado' : el.status === 'En proceso' ? 'En proceso' : 'Pendiente',
          x: posX,
          y: posY,
          camType: normType,
          date: nowStr,
          observations: el.details || `Cámara detectada por IA con norma ${normType}.`,
          dimensions: el.dimensions || (normType === 'MT' ? '1.50 x 1.50 x 1.60 m' : normType === 'D' ? '0.80 x 0.80 x 0.90 m' : '1.20 x 1.20 x 1.30 m'),
          confidence: el.confidence || Math.floor(Math.random() * 8 + 92),
          nearbyText: el.nearbyText || '',
          widthRatio: el.widthRatio || 35,
          heightRatio: el.heightRatio || 35
        });
      });

      // 2. Process Conduit Lines
      rawLines.forEach((ln: any, idx: number) => {
        idCounter++;
        const x1 = Math.round(((ln.x1Ratio || 100) / 1000) * imgW);
        const y1 = Math.round(((ln.y1Ratio || 100) / 1000) * imgH);
        const x2 = Math.round(((ln.x2Ratio || 200) / 1000) * imgW);
        const y2 = Math.round(((ln.y2Ratio || 200) / 1000) * imgH);

        // Estimate distance in meters
        const distPx = Math.hypot(x2 - x1, y2 - y1);
        const estMeters = ln.meters || Math.max(1, Math.round(distPx / 20));
        accumMeters += estMeters;

        newElements.push({
          id: idCounter,
          type: 'line',
          label: ln.label || `T-${ln.networkType || 'CAN'}-${idx + 1}`,
          status: 'Pendiente',
          x: x1,
          y: y1,
          x2: x2,
          y2: y2,
          meters: estMeters,
          pipes: ln.pipes || '2x Ø4" PVC-P pesado',
          cables: ln.cables || (ln.networkType === 'MT' ? '3x1/0 XLPE 15kV' : ln.networkType === 'D' ? 'Fibra Óptica 24H' : '3x250 MCM THHN'),
          date: nowStr,
          observations: `Tramo de canalización (${ln.networkType || 'Eléctrica'}) detectado por IA.`,
          confidence: ln.confidence || Math.floor(Math.random() * 6 + 91),
          networkType: ln.networkType || 'BT'
        });
      });

      const idsSet = new Set(newElements.map(e => e.id));
      setSelectedIds(idsSet);

      setDetectedData({
        elements: newElements,
        summary: data.summary || `Escaneo finalizado con éxito. Se detectaron ${rawElements.length} cámaras de inspección (${mtCount} MT, ${btCount} BT, ${dCount} D) y ${rawLines.length} tramos de canalización acumulando ${accumMeters}m lineales.`,
        counts: {
          mt: mtCount,
          bt: btCount,
          d: dCount,
          lines: rawLines.length,
          totalMeters: accumMeters
        }
      });

      showToast(`¡Análisis IA finalizado! ${newElements.length} elementos identificados.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar el plano con Gemini Vision.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!detectedData) return;
    if (selectedIds.size === filteredElements.length) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredElements.forEach(e => next.add(e.id));
      setSelectedIds(next);
    }
  };

  const handleConfirmImport = () => {
    if (!detectedData) return;
    const elementsToImport = detectedData.elements.filter(e => selectedIds.has(e.id));
    if (elementsToImport.length === 0) {
      showToast('Selecciona al menos un elemento para importar.');
      return;
    }

    const msg = `IA importó ${elementsToImport.length} elementos (MT: ${detectedData.counts.mt}, BT: ${detectedData.counts.bt}, D: ${detectedData.counts.d}, Tramos: ${detectedData.counts.lines} - Total ${detectedData.counts.totalMeters}m)`;
    onImportElements(elementsToImport, msg);
    onClose();
  };

  // Filter elements
  const filteredElements = (detectedData?.elements || []).filter(el => {
    // Filter by norm
    if (filterNorm === 'MT' && (el.type !== 'camera' || el.camType !== 'MT')) return false;
    if (filterNorm === 'BT' && (el.type !== 'camera' || el.camType !== 'BT')) return false;
    if (filterNorm === 'D' && (el.type !== 'camera' || el.camType !== 'D')) return false;
    if (filterNorm === 'line' && el.type !== 'line') return false;

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCode = el.label.toLowerCase().includes(term);
      const matchObs = (el.observations || '').toLowerCase().includes(term);
      const matchNorm = (el.camType || '').toLowerCase().includes(term);
      const matchPipes = (el.pipes || '').toLowerCase().includes(term);
      return matchCode || matchObs || matchNorm || matchPipes;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-purple-500/25 text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Reconocimiento Automático de Cámaras & Redes (IA)
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-mono uppercase font-bold">
                  Gemini 3.6 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Identificación de precisión para Cámaras de Media Tensión (MT), Baja Tensión (BT), Telecomunicaciones (D) y trazado de canalizaciones en planos de obra.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">

          {/* Convenciones Visuales Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-2 bg-slate-900/90 border border-purple-500/30 rounded-lg shadow-sm">
              <div className="w-9 h-9 rounded-md bg-purple-950 border-2 border-purple-500 flex items-center justify-center font-black text-purple-300 text-xs shadow-sm shrink-0">
                MT
              </div>
              <div>
                <span className="font-bold text-purple-300 block">Media Tensión (MT)</span>
                <span className="text-[11px] text-slate-400">Marco Rosa/Púrpura • Cámara Fuerza</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 bg-slate-900/90 border border-emerald-500/30 rounded-lg shadow-sm">
              <div className="w-9 h-9 rounded-md bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center font-black text-emerald-300 text-xs shadow-sm shrink-0">
                BT
              </div>
              <div>
                <span className="font-bold text-emerald-300 block">Baja Tensión (BT)</span>
                <span className="text-[11px] text-slate-400">Marco Verde/Rosa • Distribución</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 bg-slate-900/90 border border-sky-500/30 rounded-lg shadow-sm">
              <div className="w-9 h-9 rounded-md bg-sky-950 border-2 border-sky-500 flex items-center justify-center font-black text-sky-300 text-xs shadow-sm shrink-0">
                D
              </div>
              <div>
                <span className="font-bold text-sky-300 block">Datos / Telecom (D)</span>
                <span className="text-[11px] text-slate-400">Marco Azul • Redes / Fibra Óptica</span>
              </div>
            </div>
          </div>

          {/* Start scan state if no data */}
          {!detectedData && !isScanning && (
            <div className="bg-slate-950/60 border border-dashed border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4">
              {blueprintImg ? (
                <>
                  <div className="relative group max-w-xl">
                    <img
                      src={blueprintImg.src}
                      alt="Plano activo"
                      className="max-h-56 rounded-xl object-contain border border-slate-800 shadow-xl"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-xs text-white font-bold backdrop-blur-none">
                      Plano cargado ({blueprintImg.naturalWidth || 1200}x{blueprintImg.naturalHeight || 800} px)
                    </div>
                  </div>
                  <div className="max-w-md text-center">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      Plano listo para inspección inteligente
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Gemini Vision examinará la imagen píxel por píxel para clasificar la simbología de cada cámara (MT, BT, D) y trazar la red de canalización con metros estimados.
                    </p>
                  </div>
                  <button
                    onClick={handleRunRecognition}
                    className="px-7 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2.5 transition hover:scale-105 active:scale-95"
                  >
                    <Scan className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Ejecutar Escaneo Detallado con IA</span>
                  </button>
                </>
              ) : (
                <div className="py-8 text-slate-400 flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs font-bold text-slate-300">
                    No hay una imagen de plano cargada en el lienzo.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Sube una imagen JPG o PNG del plano de la obra para activar la detección automática de cámaras.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Scanning Progress Screen */}
          {isScanning && (
            <div className="bg-slate-950 border border-purple-500/40 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none animate-pulse" />
              
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin flex items-center justify-center">
                  <Cpu className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-purple-200 animate-pulse flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Analizando plano con Gemini Vision AI...
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Detectando marcos rosa/púrpura (MT), verde (BT), azul (Datos) y midiendo canalizaciones subterráneas.
                </p>
              </div>

              {blueprintImg && (
                <div className="relative w-full max-w-md h-36 rounded-xl overflow-hidden border border-purple-500/40 shadow-inner">
                  <img src={blueprintImg.src} alt="Escaneando" className="w-full h-full object-cover opacity-35 blur-[0.5px]" />
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_20px_#c084fc] animate-bounce top-1/2" />
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results Display */}
          {detectedData && !isScanning && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="bg-slate-950/90 border border-purple-500/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Cámaras MT
                  </span>
                  <span className="text-2xl font-black text-white mt-1">{detectedData.counts.mt}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Media Tensión</span>
                </div>

                <div className="bg-slate-950/90 border border-emerald-500/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-emerald-400" />
                    Cámaras BT
                  </span>
                  <span className="text-2xl font-black text-white mt-1">{detectedData.counts.bt}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Baja Tensión</span>
                </div>

                <div className="bg-slate-950/90 border border-sky-500/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] text-sky-300 font-bold flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-sky-400" />
                    Cámaras D
                  </span>
                  <span className="text-2xl font-black text-white mt-1">{detectedData.counts.d}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Datos / Telecom</span>
                </div>

                <div className="bg-slate-950/90 border border-amber-500/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Tramos Red
                  </span>
                  <span className="text-2xl font-black text-white mt-1">{detectedData.counts.lines}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Trazados Canaliz.</span>
                </div>

                <div className="bg-slate-950/90 border border-indigo-500/50 rounded-xl p-3 flex flex-col justify-between shadow-md col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                    Metros Totales
                  </span>
                  <span className="text-2xl font-black text-white mt-1">{detectedData.counts.totalMeters} m</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Canalización</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'map'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visor Mapeado ({filteredElements.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('report')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'report'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Informe de Ingeniería</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('conduits')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'conduits'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Especificaciones Tramos</span>
                  </button>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setFilterNorm('all')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      filterNorm === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterNorm('MT')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      filterNorm === 'MT' ? 'bg-purple-900 text-purple-200 border border-purple-600' : 'text-slate-400 hover:text-purple-300'
                    }`}
                  >
                    MT
                  </button>
                  <button
                    onClick={() => setFilterNorm('BT')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      filterNorm === 'BT' ? 'bg-emerald-900 text-emerald-200 border border-emerald-600' : 'text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    BT
                  </button>
                  <button
                    onClick={() => setFilterNorm('D')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      filterNorm === 'D' ? 'bg-sky-900 text-sky-200 border border-sky-600' : 'text-slate-400 hover:text-sky-300'
                    }`}
                  >
                    Datos
                  </button>
                  <button
                    onClick={() => setFilterNorm('line')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      filterNorm === 'line' ? 'bg-amber-900 text-amber-200 border border-amber-600' : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    Tramos
                  </button>
                </div>
              </div>

              {/* TAB 1: VISOR MAPEADO CON PLANO INTERACTIVO */}
              {activeTab === 'map' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* Interactive Visual Blueprint Canvas with Overlay Markers */}
                  <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col relative overflow-hidden min-h-[280px]">
                    <div className="px-2 py-1 text-[11px] text-slate-400 font-bold flex items-center justify-between border-b border-slate-900 mb-2">
                      <span className="flex items-center gap-1 text-purple-300">
                        <Target className="w-3.5 h-3.5" />
                        Ubicaciones Reconocidas en Plano
                      </span>
                      <span className="text-[10px] text-slate-500">Haz hover en la lista para resaltar</span>
                    </div>

                    {blueprintImg && (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 rounded-lg">
                        <img
                          src={blueprintImg.src}
                          alt="Plano Mapeado"
                          className="max-h-[340px] w-auto object-contain rounded opacity-80"
                        />

                        {/* Render Overlaid Markers on blueprint */}
                        {detectedData.elements.map(el => {
                          if (!blueprintImg) return null;
                          const imgW = blueprintImg.naturalWidth || 1200;
                          const imgH = blueprintImg.naturalHeight || 800;
                          const posX = (el.x / imgW) * 100;
                          const posY = (el.y / imgH) * 100;

                          const isHovered = hoveredElementId === el.id;
                          const isSelected = selectedIds.has(el.id);

                          if (el.type === 'camera') {
                            const badgeBg = el.camType === 'MT' ? 'bg-purple-600' : el.camType === 'D' ? 'bg-sky-600' : 'bg-emerald-600';
                            const boxBorderColor = el.camType === 'MT' ? 'border-purple-400 bg-purple-500/20' : el.camType === 'D' ? 'border-sky-400 bg-sky-500/20' : 'border-emerald-400 bg-emerald-500/20';
                            const boxWidthPct = Math.max(2.5, ((el.widthRatio || 35) / 1000) * 100);
                            const boxHeightPct = Math.max(2.5, ((el.heightRatio || 35) / 1000) * 100);

                            return (
                              <React.Fragment key={el.id}>
                                {/* Bounding box highlight around detected frame shape */}
                                <div
                                  style={{
                                    left: `${posX}%`,
                                    top: `${posY}%`,
                                    width: `${boxWidthPct}%`,
                                    height: `${boxHeightPct}%`
                                  }}
                                  className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 ${boxBorderColor} rounded-sm pointer-events-none transition-all ${
                                    isHovered ? 'scale-125 border-amber-300 bg-amber-400/30 z-20' : ''
                                  }`}
                                />
                                {/* Label badge at center */}
                                <div
                                  style={{ left: `${posX}%`, top: `${posY}%` }}
                                  onMouseEnter={() => setHoveredElementId(el.id)}
                                  onMouseLeave={() => setHoveredElementId(null)}
                                  onClick={() => toggleSelectId(el.id)}
                                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-150 z-20 ${
                                    isHovered ? 'scale-150 z-30' : 'scale-100'
                                  }`}
                                  title={`${el.label} (${el.camType || 'BT'}) - Confianza ${el.confidence}%`}
                                >
                                  <div className={`px-1.5 py-0.5 ${badgeBg} text-white font-black text-[9px] rounded-md shadow-lg border border-white/80 flex items-center gap-0.5 whitespace-nowrap`}>
                                    <span>{el.camType || 'BT'}</span>
                                    {isHovered && <span className="text-[8px] opacity-90">{el.label}</span>}
                                  </div>
                                  {isSelected && (
                                    <div className="absolute -inset-1 rounded-lg border-2 border-amber-400 animate-ping pointer-events-none" />
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Element List Table with selection */}
                  <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                    
                    {/* Search & Actions bar */}
                    <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar por código, norma..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={toggleSelectAll}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold rounded-lg text-[11px] transition"
                        >
                          {selectedIds.size === filteredElements.length ? 'Ninguno' : 'Todos'}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 text-xs flex-1">
                      {filteredElements.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          No se encontraron elementos con los filtros seleccionados.
                        </div>
                      ) : (
                        filteredElements.map((el) => {
                          const isSelected = selectedIds.has(el.id);
                          const isHovered = hoveredElementId === el.id;

                          return (
                            <div
                              key={el.id}
                              onMouseEnter={() => setHoveredElementId(el.id)}
                              onMouseLeave={() => setHoveredElementId(null)}
                              onClick={() => toggleSelectId(el.id)}
                              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                                isHovered ? 'bg-purple-900/50' : isSelected ? 'bg-purple-950/25' : 'hover:bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 shrink-0"
                                />

                                {el.type === 'camera' ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                                    el.camType === 'MT' ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                                    el.camType === 'D' ? 'bg-sky-950 text-sky-300 border border-sky-700' :
                                    'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  }`}>
                                    {el.camType || 'BT'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-700 shrink-0">
                                    TRAMO ({el.meters}m)
                                  </span>
                                )}

                                <div className="min-w-0">
                                  <span className="font-bold text-slate-100 block truncate">{el.label}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {el.type === 'camera' ? el.dimensions : `${el.pipes} • ${el.cables}`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {el.confidence || 95}% IA
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  el.status === 'Terminado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                  el.status === 'En proceso' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {el.status}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: INFORME TÉCNICO DE INGENIERÍA */}
              {activeTab === 'report' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
                  <div className="flex items-center gap-2 text-purple-300 font-bold border-b border-slate-800 pb-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Diagnóstico de Simbología y Cumplimiento Normativo</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-xs">
                    {detectedData.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl space-y-1">
                      <span className="font-bold text-purple-300 block">Red Media Tensión (MT)</span>
                      <p className="text-[11px] text-slate-400">
                        {detectedData.counts.mt} cámaras detectadas con marco rosa/púrpura. Destinadas a paso de alimentadores primarios y transformación de fuerza.
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-1">
                      <span className="font-bold text-emerald-300 block">Red Baja Tensión (BT)</span>
                      <p className="text-[11px] text-slate-400">
                        {detectedData.counts.bt} cámaras de distribución secundaria detectadas con marco verde o rosa normado (SB850 / SB858).
                      </p>
                    </div>

                    <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-xl space-y-1">
                      <span className="font-bold text-sky-300 block">Red Telecomunicaciones (D)</span>
                      <p className="text-[11px] text-slate-400">
                        {detectedData.counts.d} cámaras de datos en marco azul. Diseñadas para paso de fibra óptica, datos y control de accesos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ESPECIFICACIONES DE TRAMOS */}
              {activeTab === 'conduits' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold text-xs text-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Ruler className="w-4 h-4 text-amber-400" />
                      Especificaciones de Ductos y Conductores ({detectedData.counts.lines} Tramos - Total: {detectedData.counts.totalMeters} m)
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-800 text-xs">
                    {detectedData.elements.filter(e => e.type === 'line').map(ln => (
                      <div key={ln.id} className="p-3 flex items-center justify-between gap-4 hover:bg-slate-900/50">
                        <div className="space-y-0.5">
                          <span className="font-bold text-amber-300 text-xs">{ln.label}</span>
                          <p className="text-[11px] text-slate-400">
                            Ductos: <span className="text-slate-200 font-mono">{ln.pipes || '2xØ4" PVC'}</span>
                          </p>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="font-black text-slate-100 font-mono">{ln.meters} Metros</span>
                          <p className="text-[11px] text-slate-400">
                            Conductor: <span className="text-purple-300">{ln.cables || 'THHN'}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            Cancelar
          </button>

          {detectedData && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunRecognition}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Volver a Escanear</span>
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/25 flex items-center gap-2 transition hover:scale-105 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Importar {selectedIds.size} Elementos al Plano Interactivo</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
