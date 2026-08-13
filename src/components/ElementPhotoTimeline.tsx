import React, { useState } from 'react';
import { InspectionElement, ElementPhotoRecord, FindingStage } from '../types';
import { 
  getElementPhotoRecords, 
  syncElementPhotoRecords, 
  groupPhotoRecordsByDate, 
  formatFindingDate,
  getStageBadgeStyle 
} from '../utils/photoUtils';
import { 
  Camera, 
  Calendar, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Filter, 
  Clock, 
  FileText,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface ElementPhotoTimelineProps {
  element: InspectionElement;
  onUpdateElement: (updated: InspectionElement) => void;
  compact?: boolean;
}

export const ElementPhotoTimeline: React.FC<ElementPhotoTimelineProps> = ({
  element,
  onUpdateElement,
  compact = false
}) => {
  const photoRecords = getElementPhotoRecords(element);

  // New photo input form state
  const [newPhotoDate, setNewPhotoDate] = useState<string>(
    element.date || new Date().toISOString().split('T')[0]
  );
  const [newPhotoStage, setNewPhotoStage] = useState<FindingStage>('Hallazgo');
  const [newPhotoFinding, setNewPhotoFinding] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);

  // Filter state
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Editing existing photo record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editStage, setEditStage] = useState<FindingStage>('Hallazgo');
  const [editFinding, setEditFinding] = useState<string>('');

  // Fullscreen Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Unique dates available
  const availableDates = Array.from(new Set(photoRecords.map(r => r.date).filter(Boolean))).sort().reverse();

  // Filter records
  const filteredRecords = photoRecords.filter(rec => {
    if (selectedDateFilter !== 'all' && rec.date !== selectedDateFilter) return false;
    if (selectedStageFilter !== 'all') {
      if (selectedStageFilter === 'hallazgos') {
        const s = (rec.stage || '').toLowerCase();
        if (!s.includes('hallazgo') && !s.includes('no conformidad')) return false;
      } else if (rec.stage !== selectedStageFilter) {
        return false;
      }
    }
    return true;
  });

  const groupedPhotos = groupPhotoRecordsByDate(filteredRecords);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingUpload(true);
    const fileList = Array.from(files);
    let processedCount = 0;
    const newRecords: ElementPhotoRecord[] = [];

    fileList.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            newRecords.push({
              id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              url: compressedDataUrl,
              date: newPhotoDate || new Date().toISOString().split('T')[0],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              stage: newPhotoStage || 'Hallazgo',
              finding: newPhotoFinding.trim(),
              severity: newPhotoStage === 'No Conformidad' ? 'Grave' : 'Normal'
            });
          }

          processedCount++;
          if (processedCount === fileList.length) {
            const updatedList = [...photoRecords, ...newRecords];
            const updatedElement = syncElementPhotoRecords(element, updatedList);
            onUpdateElement(updatedElement);
            setNewPhotoFinding('');
            setIsAddingNew(false);
            setIsProcessingUpload(false);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta fotografía y su registro de hallazgo?')) {
      const updatedList = photoRecords.filter(r => r.id !== recordId);
      const updatedElement = syncElementPhotoRecords(element, updatedList);
      onUpdateElement(updatedElement);
      if (lightboxIndex !== null) setLightboxIndex(null);
    }
  };

  const handleStartEdit = (rec: ElementPhotoRecord) => {
    setEditingRecordId(rec.id);
    setEditDate(rec.date);
    setEditStage(rec.stage || 'Hallazgo');
    setEditFinding(rec.finding || '');
  };

  const handleSaveEdit = (recordId: string) => {
    const updatedList = photoRecords.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          date: editDate || r.date,
          stage: editStage,
          finding: editFinding.trim()
        };
      }
      return r;
    });
    const updatedElement = syncElementPhotoRecords(element, updatedList);
    onUpdateElement(updatedElement);
    setEditingRecordId(null);
  };

  const totalFindings = photoRecords.filter(r => {
    const s = (r.stage || '').toLowerCase();
    return s.includes('hallazgo') || s.includes('no conformidad') || (r.finding && r.finding.length > 0);
  }).length;

  return (
    <div className="space-y-3">
      {/* Header with KPI Counts */}
      <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-sky-300 text-xs uppercase tracking-wider">
              Trazabilidad Fotográfica por Fecha
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold">
              📷 {photoRecords.length} fotos
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-bold">
              ⚠️ {totalFindings} hallazgos
            </span>
          </div>
        </div>

        {/* Date & Stage Filter Toolbar */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" /> Filtrar por Fecha:
            </label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">Todas las fechas ({availableDates.length})</option>
              {availableDates.map(d => (
                <option key={d} value={d}>
                  {formatFindingDate(d)} ({photoRecords.filter(r => r.date === d).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-sky-400" /> Filtrar por Etapa / Tipo:
            </label>
            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="all">Todas las etapas</option>
              <option value="hallazgos">⚠️ Solo Hallazgos y No Conformidades</option>
              <option value="Avance de Obra">✅ Avance de Obra</option>
              <option value="Antes">🔍 Antes de Ejecución</option>
              <option value="Durante">⚙️ Durante Ejecución</option>
              <option value="Después">🏁 Después / Terminado</option>
              <option value="Inspección">📋 Inspección Rutinaria</option>
            </select>
          </div>
        </div>
      </div>

      {/* Button to toggle New Photo & Finding Form */}
      {!isAddingNew ? (
        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="w-full py-2 px-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
        >
          <Camera className="w-4 h-4" />
          <span>+ Registrar Foto y Hallazgo por Fecha</span>
        </button>
      ) : (
        /* Form to Add Photo with Specific Date & Finding */
        <div className="bg-slate-800 border border-sky-500/80 rounded-xl p-3.5 space-y-3 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-sky-400" />
              Nueva Evidencia Fotográfica y Hallazgo
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-300 font-semibold block mb-1">
                Fecha del Hallazgo / Foto:
              </label>
              <input
                type="date"
                value={newPhotoDate}
                onChange={(e) => setNewPhotoDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-300 font-semibold block mb-1">
                Etapa / Clasificación:
              </label>
              <select
                value={newPhotoStage}
                onChange={(e) => setNewPhotoStage(e.target.value as FindingStage)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-sky-200 font-bold focus:outline-none focus:border-sky-400 cursor-pointer"
              >
                <option value="Hallazgo">⚠️ Hallazgo de Obra</option>
                <option value="No Conformidad">🚨 No Conformidad Crítica</option>
                <option value="Avance de Obra">✅ Avance de Obra</option>
                <option value="Antes">🔍 Estado Previo (Antes)</option>
                <option value="Durante">⚙️ En Ejecución (Durante)</option>
                <option value="Después">🏁 Elemento Terminado (Después)</option>
                <option value="Inspección">📋 Inspección Rutinaria</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-300 font-semibold block mb-1">
              Descripción del Hallazgo / Observación Técnica:
            </label>
            <textarea
              rows={2}
              value={newPhotoFinding}
              onChange={(e) => setNewPhotoFinding(e.target.value)}
              placeholder="Ej: Interferencia con tubería de agua a 1.10m de profundidad / Conexión de ducto PVC realizada..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400 resize-none"
            />
          </div>

          {/* Photo File Selector */}
          <div>
            <label className="w-full py-2.5 px-3 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-sky-500">
              <Camera className="w-4 h-4" />
              <span>{isProcessingUpload ? 'Procesando imágenes...' : 'Tomar Foto / Seleccionar Archivo'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                disabled={isProcessingUpload}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Las fotos se guardarán automáticamente asignadas a la fecha <strong>{newPhotoDate}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Timeline of Photos Grouped by Date */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-950/60 p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs space-y-1">
          <Camera className="w-8 h-8 mx-auto mb-1 opacity-30 text-slate-400" />
          <p className="font-bold text-slate-400">Sin fotografías para los filtros seleccionados</p>
          <p className="text-[11px] text-slate-500">
            {photoRecords.length === 0
              ? 'Haz clic en el botón superior para agregar la primera evidencia fotográfica con su fecha.'
              : 'Prueba cambiando el filtro de fecha o etapa.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPhotos).map(([groupDate, records]) => {
            const dateFindingCount = records.filter(r => r.finding || (r.stage || '').includes('Hallazgo')).length;
            return (
              <div key={groupDate} className="space-y-2 bg-slate-950/40 rounded-xl p-2.5 border border-slate-800">
                {/* Date Header Stamp */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-amber-300">
                      {formatFindingDate(groupDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {records.length} {records.length === 1 ? 'foto' : 'fotos'}
                    </span>
                    {dateFindingCount > 0 && (
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-700/60 px-1.5 py-0.5 rounded font-bold">
                        {dateFindingCount} {dateFindingCount === 1 ? 'hallazgo' : 'hallazgos'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Photos in this Date Group */}
                <div className="space-y-2.5">
                  {records.map((rec) => {
                    const isEditing = editingRecordId === rec.id;
                    const stageStyle = getStageBadgeStyle(rec.stage);
                    const globalIdx = photoRecords.findIndex(r => r.id === rec.id);

                    return (
                      <div 
                        key={rec.id} 
                        className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded-lg p-2 flex flex-col gap-2 transition"
                      >
                        {isEditing ? (
                          /* Inline Edit Mode */
                          <div className="space-y-2 p-1 bg-slate-950 rounded border border-sky-500/80 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Fecha:</label>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-amber-300 font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Etapa:</label>
                                <select
                                  value={editStage}
                                  onChange={(e) => setEditStage(e.target.value as FindingStage)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-sky-200 font-bold"
                                >
                                  <option value="Hallazgo">⚠️ Hallazgo</option>
                                  <option value="No Conformidad">🚨 No Conformidad</option>
                                  <option value="Avance de Obra">✅ Avance de Obra</option>
                                  <option value="Antes">🔍 Antes</option>
                                  <option value="Durante">⚙️ Durante</option>
                                  <option value="Después">🏁 Después</option>
                                  <option value="Inspección">📋 Inspección</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Descripción del Hallazgo:</label>
                              <textarea
                                rows={2}
                                value={editFinding}
                                onChange={(e) => setEditFinding(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white resize-none"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRecordId(null)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(rec.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Photo Item View */
                          <div className="flex gap-2.5 items-start">
                            {/* Photo Thumbnail */}
                            <div 
                              className="relative group w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer"
                              onClick={() => setLightboxIndex(globalIdx)}
                            >
                              <img
                                src={rec.url}
                                alt="Evidencia"
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            {/* Details & Finding Notes */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between gap-1 text-xs">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}>
                                  {rec.stage || 'Inspección'}
                                </span>
                                {rec.timestamp && (
                                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" /> {rec.timestamp}
                                  </span>
                                )}
                              </div>

                              {/* Finding text */}
                              {rec.finding ? (
                                <p className="text-[11px] text-slate-200 font-medium bg-slate-950/70 rounded p-1.5 border border-slate-800 line-clamp-3">
                                  {rec.finding}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-500 italic">
                                  Sin descripción de hallazgo registrada.
                                </p>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(rec)}
                                  className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded transition"
                                  title="Editar fecha y hallazgo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLightboxIndex(globalIdx)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                                  title="Ampliar foto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(rec.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition"
                                  title="Eliminar foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && photoRecords[lightboxIndex] && (
        <div 
          className="fixed inset-0 bg-black/95 z-[150] flex flex-col items-center justify-between p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Lightbox Top Bar */}
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white border-b border-slate-800 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-sky-400">
                {element.label} ({element.type === 'camera' ? 'Cámara' : 'Tramo'})
              </span>
              <span className="text-xs text-slate-400 border-l border-slate-700 pl-2">
                Foto {lightboxIndex + 1} de {photoRecords.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={photoRecords[lightboxIndex].url}
                download={`Evidencia_${element.label}_${photoRecords[lightboxIndex].date}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                title="Descargar foto"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Image Display */}
          <div 
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={photoRecords[lightboxIndex].url}
              alt="Evidencia en alta resolución"
              className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-700 shadow-2xl"
            />

            {/* Next Button */}
            {lightboxIndex < photoRecords.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Info Bar */}
          <div 
            className="w-full max-w-4xl bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1.5 text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {formatFindingDate(photoRecords[lightboxIndex].date)}
                </span>
                {photoRecords[lightboxIndex].timestamp && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({photoRecords[lightboxIndex].timestamp})
                  </span>
                )}
              </div>

              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStageBadgeStyle(photoRecords[lightboxIndex].stage).bg} ${getStageBadgeStyle(photoRecords[lightboxIndex].stage).text} ${getStageBadgeStyle(photoRecords[lightboxIndex].stage).border}`}>
                {photoRecords[lightboxIndex].stage || 'Inspección'}
              </span>
            </div>

            {photoRecords[lightboxIndex].finding && (
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Hallazgo / Observación Técnica:
                </span>
                <p className="text-xs font-medium">{photoRecords[lightboxIndex].finding}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
