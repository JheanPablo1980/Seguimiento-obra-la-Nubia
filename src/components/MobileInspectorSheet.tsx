import React, { useState, useRef } from 'react';
import { InspectionElement, StatusType, ProjectLayer, ElementPhotoRecord, AuthUser } from '../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Camera, 
  Image as ImageIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  Sparkles, 
  Trash2, 
  Maximize2,
  HardHat,
  Zap,
  MapPin,
  FileText,
  Sliders,
  Plus,
  Minus,
  Check,
  Eye
} from 'lucide-react';
import { getElementPhotoRecords, syncElementPhotoRecords } from '../utils/photoUtils';

interface MobileInspectorSheetProps {
  element: InspectionElement | null;
  allElements: InspectionElement[];
  onClose: () => void;
  onUpdateElement: (updated: InspectionElement) => void;
  onSelectElement: (element: InspectionElement) => void;
  statusFilter?: 'all' | StatusType;
  onOpenFullDetails?: () => void;
  onOpenFullTelemetry?: () => void;
  onDeleteElement?: (id: number) => void;
  areaName?: string;
  showToast?: (msg: string) => void;
  currentUser?: AuthUser | null;
  onFastPhotoCapture?: (file: File, element: InspectionElement, findingText?: string) => void;
}

const QUICK_FIELD_TAGS = [
  '✅ Listo para vaciado',
  '🧱 Encofrado realizado',
  '⚡ Cableado pasado',
  '⚠️ Tubería obstruida',
  '📏 Medida verificada',
  '🔍 Falta tapa / acabado',
  '🎯 Conforme a plano'
];

export const MobileInspectorSheet: React.FC<MobileInspectorSheetProps> = ({
  element,
  allElements,
  onClose,
  onUpdateElement,
  onSelectElement,
  statusFilter = 'all',
  onOpenFullDetails,
  onOpenFullTelemetry,
  areaName = '',
  onFastPhotoCapture
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhotoForZoom, setSelectedPhotoForZoom] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState<string>('');
  const [isAddingCustomNote, setIsAddingCustomNote] = useState(false);

  if (!element) return null;

  // Filter elements of the same layer (and optionally statusFilter) for smooth next/previous stepping
  const currentLayerElements = allElements.filter(e => {
    const matchesLayer = (e.layer || 'civil') === (element.layer || 'civil');
    const matchesStatus = !statusFilter || statusFilter === 'all' || e.status === statusFilter;
    return matchesLayer && matchesStatus;
  });
  const currentIndex = currentLayerElements.findIndex(e => e.id === element.id);
  const prevElement = currentIndex > 0 ? currentLayerElements[currentIndex - 1] : null;
  const nextElement = currentIndex < currentLayerElements.length - 1 ? currentLayerElements[currentIndex + 1] : null;

  const currentPercent = element.progressPercent ?? (element.status === 'Terminado' ? 100 : element.status === 'En proceso' ? 50 : 0);

  // Status Change Handler
  const handleStatusSelect = (newStatus: StatusType) => {
    let newPercent = currentPercent;
    if (newStatus === 'Pendiente') {
      newPercent = 0;
    } else if (newStatus === 'En proceso') {
      if (newPercent === 0 || newPercent === 100) newPercent = 50;
    } else if (newStatus === 'Terminado') {
      newPercent = 100;
    }

    onUpdateElement({
      ...element,
      status: newStatus,
      progressPercent: newPercent,
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  // Percentage Change Handler
  const handlePercentChange = (newPercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPercent)));
    let newStatus: StatusType = element.status;
    if (clamped === 100) {
      newStatus = 'Terminado';
    } else if (clamped > 0) {
      newStatus = 'En proceso';
    } else {
      newStatus = 'Pendiente';
    }

    onUpdateElement({
      ...element,
      progressPercent: clamped,
      status: newStatus,
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  // Photo Capture
  const handlePhotoFile = (file: File, findingText?: string) => {
    if (onFastPhotoCapture) {
      onFastPhotoCapture(file, element, findingText);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1280;
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          const currentRecords = getElementPhotoRecords(element);
          const newRecord: ElementPhotoRecord = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            url: compressedBase64,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            stage: element.status,
            finding: findingText || 'Evidencia de inspección en terreno'
          };
          const updated = syncElementPhotoRecords(element, [newRecord, ...currentRecords]);
          onUpdateElement(updated);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoFile(file, quickNote || 'Foto capturada en terreno');
      e.target.value = '';
      setQuickNote('');
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoFile(file, quickNote || 'Foto adjuntada de galería');
      e.target.value = '';
      setQuickNote('');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const currentRecords = getElementPhotoRecords(element);
    const filtered = currentRecords.filter(p => p.id !== photoId);
    const updated = syncElementPhotoRecords(element, filtered);
    onUpdateElement(updated);
  };

  const handleAddQuickTag = (tag: string) => {
    const currentObs = element.observations ? `${element.observations}. ${tag}` : tag;
    onUpdateElement({
      ...element,
      observations: currentObs,
      lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const photoRecords = getElementPhotoRecords(element);
  const isElectric = element.layer === 'electrica';

  return (
    <>
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[350] transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Floating Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[360] max-w-2xl mx-auto bg-slate-900 border-t-2 border-x border-slate-700 rounded-t-3xl shadow-2xl text-white p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] max-h-[85vh] overflow-y-auto flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-200">
        
        {/* Drag Handle & Top Navigation Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!prevElement}
              onClick={() => prevElement && onSelectElement(prevElement)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                prevElement
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
                  : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-40'
              }`}
              title="Elemento Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <span className="text-[11px] font-mono text-slate-400 px-1">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${currentLayerElements.length}` : ''}
            </span>

            <button
              type="button"
              disabled={!nextElement}
              onClick={() => nextElement && onSelectElement(nextElement)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                nextElement
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
                  : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-40'
              }`}
              title="Elemento Siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grab Handle pill */}
          <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto hidden sm:block" />

          {/* Close & Full Details */}
          <div className="flex items-center gap-1.5">
            {(onOpenFullTelemetry || onOpenFullDetails) && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenFullTelemetry) onOpenFullTelemetry();
                  else if (onOpenFullDetails) onOpenFullDetails();
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                title="Abrir ficha técnica y actas"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ficha Completa</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition flex items-center gap-1 text-xs font-bold border border-slate-700 active:scale-95"
              title="Volver al plano"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Volver al Plano</span>
            </button>
          </div>
        </div>

        {/* Element Identity Banner */}
        <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${
              isElectric 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {isElectric ? <Zap className="w-6 h-6" /> : <HardHat className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white tracking-wide truncate">
                  {element.label}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isElectric ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {isElectric ? '⚡ Eléctrico' : '🏗️ Civil'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{areaName || 'Sector General'}</span>
                {element.type === 'line' && element.lengthMeters && (
                  <span className="text-sky-400 font-mono font-bold ml-1.5">
                    • {element.lengthMeters.toFixed(1)}m
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Current Progress Pill */}
          <div className="text-right shrink-0">
            <div className="text-xl font-black font-mono tracking-tight text-white">
              {currentPercent}%
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
              element.status === 'Terminado'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : element.status === 'En proceso'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {element.status}
            </span>
          </div>
        </div>

        {/* Pending Inspection Banner */}
        {element.status === 'Pendiente' && (
          <div className="p-2.5 bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-700/60 rounded-xl flex items-center gap-2 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">
              <strong>Elemento Pendiente:</strong> Toca abajo para cambiar el estado (En Proceso / Terminado) y adjuntar fotos de terreno.
            </span>
          </div>
        )}

        {/* 1. BIG TACTILE STATUS BUTTONS */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>1. Cambiar Estado de Inspección</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Pendiente */}
            <button
              type="button"
              onClick={() => handleStatusSelect('Pendiente')}
              className={`py-3 px-2 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 border-2 ${
                element.status === 'Pendiente'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-900/40 ring-2 ring-rose-400/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-rose-900/60 hover:text-rose-300'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              <span>Pendiente</span>
              <span className="text-[10px] font-mono opacity-80">0%</span>
            </button>

            {/* En Proceso */}
            <button
              type="button"
              onClick={() => handleStatusSelect('En proceso')}
              className={`py-3 px-2 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 border-2 ${
                element.status === 'En proceso'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-900/40 ring-2 ring-amber-400/50 font-black'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-amber-900/60 hover:text-amber-300'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>En Proceso</span>
              <span className="text-[10px] font-mono opacity-80">{currentPercent > 0 && currentPercent < 100 ? `${currentPercent}%` : '50%'}</span>
            </button>

            {/* Terminado */}
            <button
              type="button"
              onClick={() => handleStatusSelect('Terminado')}
              className={`py-3 px-2 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 border-2 ${
                element.status === 'Terminado'
                  ? 'bg-emerald-600 text-white border-emerald-300 shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-emerald-900/60 hover:text-emerald-300'
              }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Terminado</span>
              <span className="text-[10px] font-mono opacity-80">100%</span>
            </button>
          </div>
        </div>

        {/* 2. PROGRESS PERCENTAGE QUICK BUTTONS & SLIDER */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>2. Porcentaje de Avance ({currentPercent}%)</span>
            </label>

            {/* Step increment buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePercentChange(currentPercent - 10)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-black text-sm active:scale-90 border border-slate-700"
                title="-10%"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handlePercentChange(currentPercent + 10)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-black text-sm active:scale-90 border border-slate-700"
                title="+10%"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                currentPercent === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : currentPercent >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${currentPercent}%` }}
            />
          </div>

          {/* Quick % Pills */}
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentChange(pct)}
                className={`py-1.5 rounded-xl font-mono text-xs font-black transition active:scale-95 border ${
                  currentPercent === pct
                    ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md ring-1 ring-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 3. CAPTURE & ADD PHOTOS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Fotos de Terreno ({photoRecords.length})</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              Cámara directa Android / iOS
            </span>
          </div>

          {/* Photo Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Primary Big Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 border border-emerald-400 active:scale-95 transition"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>📸 Tomar Foto</span>
            </button>
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleCameraChange}
              className="hidden"
            />

            {/* Gallery Upload Button */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition"
            >
              <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
              <span>🖼️ Galería</span>
            </button>
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleGalleryChange}
              className="hidden"
            />
          </div>

          {/* Photo Thumbnails Carousel */}
          {photoRecords.length > 0 ? (
            <div className="flex items-center gap-2.5 overflow-x-auto p-1 py-1.5 scrollbar-thin">
              {photoRecords.map((photo) => (
                <div 
                  key={photo.id}
                  className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-700 group shadow-md"
                >
                  <img
                    src={photo.url}
                    alt={photo.finding || 'Foto de inspección'}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                    onClick={() => setSelectedPhotoForZoom(photo.url)}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-xs p-1 text-[9px] text-white truncate font-mono text-center">
                    {photo.timestamp || photo.date}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-md hover:bg-rose-500 shadow-sm"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
              No hay fotos adjuntas para {element.label}. Toca el botón verde para capturar.
            </div>
          )}
        </div>

        {/* 4. QUICK FIELD OBSERVATION CHIPS */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            <span>4. Notas / Hallazgos Rápidos</span>
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_FIELD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddQuickTag(tag)}
                className="px-2.5 py-1 bg-slate-950 hover:bg-purple-950 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-700/60 rounded-xl text-[11px] font-bold transition active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>

          {element.observations && (
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 mt-1">
              <span className="text-[10px] text-slate-500 font-mono block mb-0.5">Notas registradas:</span>
              <p className="font-sans leading-relaxed">{element.observations}</p>
            </div>
          )}
        </div>

        {/* Bottom Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl border border-emerald-400 active:scale-98 transition flex items-center justify-center gap-2 mt-1"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>LISTO / VOLVER AL PLANO</span>
        </button>
      </div>

      {/* Fullscreen Photo Zoom Modal */}
      {selectedPhotoForZoom && (
        <div 
          className="fixed inset-0 z-[400] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPhotoForZoom(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhotoForZoom(null)}
            className="absolute top-4 right-4 p-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedPhotoForZoom}
            alt="Foto en grande"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
          />
          <p className="text-xs text-slate-400 mt-3 font-mono">
            {element.label} • Toca en cualquier parte para cerrar
          </p>
        </div>
      )}
    </>
  );
};
