import React from 'react';
import { ProjectMeta } from '../types';
import { UserCheck, Building2, Calendar, MapPin, Layers } from 'lucide-react';

interface ProjectMetaBarProps {
  meta: ProjectMeta;
  onChange: (meta: ProjectMeta) => void;
  totalElements: number;
}

export const ProjectMetaBar: React.FC<ProjectMetaBarProps> = ({
  meta,
  onChange,
  totalElements
}) => {
  const handleInputChange = (field: keyof ProjectMeta, value: string) => {
    onChange({
      ...meta,
      [field]: value
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs relative">
      <div>
        <label className="text-slate-500 font-semibold mb-1 flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5 text-sky-600" />
          <span>Inspector de Obra:</span>
        </label>
        <input
          type="text"
          value={meta.inspectorName}
          onChange={(e) => handleInputChange('inspectorName', e.target.value)}
          placeholder="Nombre del inspector"
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
        />
      </div>

      <div>
        <label className="text-slate-500 font-semibold mb-1 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-amber-600" />
          <span>Contratista / Frente:</span>
        </label>
        <input
          type="text"
          value={meta.contractorName}
          onChange={(e) => handleInputChange('contractorName', e.target.value)}
          placeholder="Empresa o Frente"
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
        />
      </div>

      <div>
        <label className="text-slate-500 font-semibold mb-1 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>Fecha de Inspección:</span>
        </label>
        <input
          type="date"
          value={meta.inspectionDate}
          onChange={(e) => handleInputChange('inspectionDate', e.target.value)}
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
        />
      </div>

      <div>
        <label className="text-slate-500 font-semibold mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
            <span>Ubicación / Sector:</span>
          </span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
            <Layers className="w-3 h-3 text-emerald-600" />
            {totalElements} elem.
          </span>
        </label>
        <input
          type="text"
          value={meta.sectorLocation}
          onChange={(e) => handleInputChange('sectorLocation', e.target.value)}
          placeholder="Ej: Manzana A - Lotes 1 al 12"
          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
        />
      </div>
    </div>
  );
};
