import React, { useRef } from 'react';
import { 
  Compass, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Printer, 
  Download, 
  Sparkles,
  FileText,
  Calendar,
  UserCheck,
  ShieldCheck,
  User,
  HardHat,
  Shield,
  Image,
  Settings,
  History,
  CalendarCheck,
  FileSpreadsheet
} from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  onFileUpload: (file: File) => void;
  pdfDoc: any;
  currentPdfPage: number;
  totalPdfPages: number;
  onPrevPdfPage: () => void;
  onNextPdfPage: () => void;
  onClearCanvas: () => void;
  onExportPDF: () => void;
  onOpenDataBackup: () => void;
  onOpenConfig?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenScheduleProgress?: (tab?: 'matrix' | 'bySector' | 'byElement' | 'manage' | 'import') => void;
  onOpenMemoriaModal?: (showImport?: boolean) => void;
  onOpenAiRecognition?: () => void;
  showCharts: boolean;
  onToggleCharts: () => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onOpenDailyTrackingModal: () => void;
  appMode: 'admin' | 'field';
  onToggleAppMode: () => void;
  onExportAnnotatedBlueprintPNG: () => void;
}


export const Header: React.FC<HeaderProps> = ({
  onFileUpload,
  pdfDoc,
  currentPdfPage,
  totalPdfPages,
  onPrevPdfPage,
  onNextPdfPage,
  onClearCanvas,
  onExportPDF,
  onOpenDataBackup,
  onOpenConfig,
  onOpenVersionHistory,
  onOpenScheduleProgress,
  onOpenMemoriaModal,
  onOpenAiRecognition,
  showCharts,
  onToggleCharts,
  currentUser,
  onOpenAuthModal,
  onOpenDailyTrackingModal,
  appMode,
  onToggleAppMode,
  onExportAnnotatedBlueprintPNG
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-slate-900 text-white p-3.5 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg flex items-center justify-center font-bold shadow-sm ${
          appMode === 'field' ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-slate-950'
        }`}>
          {appMode === 'field' ? <HardHat className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Plano de Seguimiento y Control de Obra</h1>
            <span className={`inline-flex items-center gap-1 border text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              appMode === 'field' 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
            }`}>
              {appMode === 'field' ? <HardHat className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {appMode === 'field' ? 'Modo Inspección Campo' : 'Modo Administrador'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {appMode === 'field'
              ? 'Vista compacta para inspectores: actualización de avances y captura de fotos'
              : 'Canalizaciones Eléctricas / Telecomunicaciones, Cámaras y Cajas de Inspección'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 no-print flex-wrap">
        {/* Toggle Mode Button */}
        <button
          onClick={onToggleAppMode}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm border ${
            appMode === 'field'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 hover:from-amber-400 hover:to-yellow-400'
              : 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 hover:from-sky-500 hover:to-blue-500'
          }`}
          title="Alternar entre vista de Administrador y Vista Compacta de Campo"
        >
          {appMode === 'field' ? (
            <>
              <Shield className="w-4 h-4 text-slate-950" />
              <span>Ver como Administrador</span>
            </>
          ) : (
            <>
              <HardHat className="w-4 h-4 text-white" />
              <span>Ver Modo Campo (Inspector)</span>
            </>
          )}
        </button>

        {/* Field mode action buttons */}
        {appMode === 'field' && (
          <>
            {/* Guardar/Exportar Imagen con Tramos y Metrajes */}
            <button
              onClick={onExportAnnotatedBlueprintPNG}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Guardar imagen del plano con todos los tramos, metrajes, tuberías y calibres dibujados"
            >
              <Image className="w-4 h-4 text-emerald-200" />
              <span>Guardar Plano PNG (Metrajes/Calibres)</span>
            </button>

            {/* Guardar Seguimiento del Día Button */}
            <button
              onClick={onOpenDailyTrackingModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Guardar o consultar la bitácora del avance del día"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>Seguimiento del Día</span>
            </button>
          </>
        )}

        {/* Cronograma y Avance de Obra Button */}
        {onOpenScheduleProgress && (
          <button
            onClick={() => onOpenScheduleProgress('matrix')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border border-indigo-500/50 shadow-sm"
            title="Ver matriz del cronograma de entregas y avance físico por ID de tubería/cámara/sector"
          >
            <CalendarCheck className="w-4 h-4 text-amber-300" />
            <span>Cronograma y Avance</span>
          </button>
        )}

        {/* Memoria de Cálculo / Actas Button */}
        {onOpenMemoriaModal && (
          <button
            onClick={() => onOpenMemoriaModal(false)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm border border-emerald-500/50"
            title="Abrir memorias de cálculo y resumen por Actas de Cobro"
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>Actas</span>
          </button>
        )}

        {/* Supabase Auth User Button */}
        <button
          onClick={onOpenAuthModal}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
            currentUser
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/30'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
          title="Autenticación Supabase de inspectores"
        >
          {currentUser ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[110px] truncate">{currentUser.fullName || currentUser.email}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Login Supabase</span>
            </>
          )}
        </button>

        {/* Admin only action buttons */}
        {appMode === 'admin' && (
          <>
            {/* Realtime Charts view toggle */}
            <button
              onClick={onToggleCharts}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                showCharts
                  ? 'bg-sky-600 text-white border-sky-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-300" />
              <span>{showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}</span>
            </button>

            {/* File Upload Button */}
            <label className="bg-sky-600 hover:bg-sky-500 text-white border border-sky-500 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 transition shadow-sm">
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>Cargar Plano (JPG / PNG / PDF)</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
              />
            </label>

            {/* AI Auto-Recognition Button */}
            {onOpenAiRecognition && (
              <button
                onClick={onOpenAiRecognition}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-500/20 hover:scale-105 active:scale-95"
                title="Reconocer automáticamente cámaras (BT, MT, D) y canalizaciones en el plano JPG/PNG con IA"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Escanear Plano (IA BT/MT/D)</span>
              </button>
            )}

            {/* PDF Navigation Controls */}
            {pdfDoc && (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 gap-1.5">
                <button
                  onClick={onPrevPdfPage}
                  disabled={currentPdfPage <= 1}
                  className="p-1 hover:text-sky-400 disabled:opacity-40"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px]">
                  Pág {currentPdfPage}/{totalPdfPages}
                </span>
                <button
                  onClick={onNextPdfPage}
                  disabled={currentPdfPage >= totalPdfPages}
                  className="p-1 hover:text-sky-400 disabled:opacity-40"
                  title="Siguiente Página"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Clear Canvas */}
            <button
              onClick={onClearCanvas}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Limpiar trazos agregados"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Limpiar Trazos</span>
            </button>

            {/* Data Backup / Import */}
            <button
              onClick={onOpenDataBackup}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Exportar / Importar Datos JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Datos JSON</span>
            </button>

            {/* Version History & Audit Log */}
            {onOpenVersionHistory && (
              <button
                onClick={onOpenVersionHistory}
                className="bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                title="Historial de Versiones y Auditoría Supabase"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Historial Versiones</span>
              </button>
            )}

            {/* Module Config & User Status */}
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition hover:border-amber-400 shadow-sm"
                title="Configuración de Perfiles, Tuberías y Supabase DB"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span>Configuración</span>
              </button>
            )}

          </>
        )}

        {/* Export / Print PDF */}
        <button
          onClick={onExportPDF}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-400" />
          <span>Imprimir / PDF</span>
        </button>
      </div>
    </header>
  );
};


