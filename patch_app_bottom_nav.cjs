const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const bottomNav = `
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-2 z-[100] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('dashboard')} className={\`flex flex-col items-center p-2 \${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'}\`}>
            <LayoutGrid className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Panel</span>
          </button>
          <button onClick={() => setActiveTab('sectores')} className={\`flex flex-col items-center p-2 \${activeTab === 'sectores' ? 'text-blue-600' : 'text-slate-500'}\`}>
            <Building2 className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Sectores</span>
          </button>
          <button onClick={() => setActiveTab('planos')} className={\`flex flex-col items-center p-2 \${activeTab === 'planos' ? 'text-blue-600' : 'text-slate-500'}\`}>
            <MapIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Planos</span>
          </button>
          <button onClick={() => setActiveTab('bitacora')} className={\`flex flex-col items-center p-2 \${activeTab === 'bitacora' ? 'text-blue-600' : 'text-slate-500'}\`}>
            <ClipboardList className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Bitácora</span>
          </button>
        </div>
      )}
    </div>
`;

content = content.replace(/    <\/div>\n\s*\);\n\}/, bottomNav + "  );\n}");

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx bottom nav");
