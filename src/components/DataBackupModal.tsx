import React, { useState } from 'react';
import { AreaSector, InspectionElement, ProjectMeta } from '../types';
import { Download, Upload, X, Check, Copy, FileSpreadsheet } from 'lucide-react';
import { normalizarPorcentaje } from '../utils/cronogramaUtils';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: ProjectMeta;
  areas: AreaSector[];
  elements: InspectionElement[];
  onImportData: (data: { meta: ProjectMeta; areas: AreaSector[]; elements: InspectionElement[] }) => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  meta,
  areas,
  elements,
  onImportData
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentData = {
    meta,
    areas,
    elements,
    exportTimestamp: new Date().toISOString()
  };

  const jsonString = JSON.stringify(currentData, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Seguimiento_Obra_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    // Generate CSV for inspection elements
    let csv = 'ID,Tipo,Etiqueta,ID_UNICO_CRONO,Estado,Porcentaje_Avance,Acta,Observaciones,Fecha,Norma,Pipas_Tuberia,Cables,Metros\n';
    elements.forEach(el => {
      const pct = normalizarPorcentaje(el.progressPercent, el.status);
      csv += `"${el.id}","${el.type}","${el.label}","${el.scheduleItemId || ''}","${el.status}","${pct}%","${el.acta || ''}","${(el.observations || '').replace(/"/g, '""')}","${el.date}","${el.camType || ''}","${el.pipes || ''}","${el.cables || ''}","${el.meters || 0}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bitacora_Obra_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed && parsed.meta && Array.isArray(parsed.areas) && Array.isArray(parsed.elements)) {
        onImportData(parsed);
        onClose();
      } else {
        alert('Formato JSON inválido. Debe contener "meta", "areas" y "elements".');
      }
    } catch (err) {
      alert('Error al procesar el JSON: ' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Copia de Seguridad y Exportación de Datos</h3>
              <p className="text-xs text-slate-500">Guarda o restaura tus inspecciones y mediciones en JSON/CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadJSON}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Backup JSON</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV (Excel)</span>
          </button>
          <button
            onClick={handleCopyJSON}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        {/* Restore section */}
        <form onSubmit={handleImportSubmit} className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Restaurar / Importar Datos desde JSON:</span>
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Pega aquí el JSON exportado previamente..."
            rows={4}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={!jsonInput.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-40"
            >
              Importar Datos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
