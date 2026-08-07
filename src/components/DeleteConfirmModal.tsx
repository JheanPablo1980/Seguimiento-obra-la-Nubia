import React from 'react';
import { AreaSector } from '../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export type DeleteMode = 'single_area' | 'all_areas' | 'all_elements';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  mode?: DeleteMode;
  area?: AreaSector | null;
  itemCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  mode = 'single_area',
  area,
  itemCount = 0,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  let title = '¿Eliminar este sector?';
  let subtitle = 'Esta acción removerá la delimitación del sector y sus consolidados';
  let confirmLabel = 'Sí, Eliminar Sector';

  if (mode === 'all_areas') {
    title = '¿Eliminar TODOS los sectores?';
    subtitle = `Se eliminarán permanentemente las ${itemCount} áreas/sectores delimitadas en la obra.`;
    confirmLabel = `Sí, Borrar Todos los Sectores (${itemCount})`;
  } else if (mode === 'all_elements') {
    title = '¿Eliminar TODOS los tramos y cámaras?';
    subtitle = `Se removerán permanentemente los ${itemCount} elementos registrados (tramos canalizados y cámaras).`;
    confirmLabel = `Sí, Borrar Tramos y Cámaras (${itemCount})`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'single_area' && area && (
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex flex-col gap-1 text-xs">
            <div className="font-bold text-rose-950 flex items-center gap-1.5">
              <span className="bg-rose-200/80 text-rose-800 text-[10px] px-1.5 py-0.5 rounded font-mono">
                {area.code}
              </span>
              <span>{area.name}</span>
            </div>
            {area.calculatedAreaM2 && (
              <div className="text-[11px] text-rose-800 font-medium">
                Área registrada: {area.calculatedAreaM2} m² ({area.widthMeters ?? '—'}m × {area.lengthMeters ?? '—'}m)
              </div>
            )}
          </div>
        )}

        {(mode === 'all_areas' || mode === 'all_elements') && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Advertencia irrecuperable:</p>
              <p className="text-[11px] text-rose-800">
                {mode === 'all_areas'
                  ? 'Las áreas borradas deberán ser trazadas de nuevo sobre el plano si deseas reconstruir la estadística sectorial.'
                  : 'Se borrarán todos los metros de cableado, tuberías, fotos e inspecciones asignadas a las cámaras y tramos.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

