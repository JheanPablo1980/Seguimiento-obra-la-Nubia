import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleModuleProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
  headerBgClass?: string;
}

export const CollapsibleModule: React.FC<CollapsibleModuleProps> = ({
  title,
  subtitle,
  icon,
  badge,
  isCollapsed,
  onToggle,
  children,
  headerActions,
  className = '',
  headerBgClass = 'bg-white'
}) => {
  return (
    <div className={`transition-all duration-200 rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Module Header Bar */}
      <div
        onClick={onToggle}
        className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none border-b transition ${
          isCollapsed ? 'border-transparent bg-slate-50 hover:bg-slate-100/90' : `border-slate-200/80 ${headerBgClass} hover:opacity-95`
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight truncate">
                {title}
              </h2>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerActions && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
              {headerActions}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition flex items-center justify-center"
            title={isCollapsed ? "Expandir Módulo" : "Contraer Módulo"}
            aria-label={isCollapsed ? "Expandir Módulo" : "Contraer Módulo"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Module Body */}
      {!isCollapsed && (
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
