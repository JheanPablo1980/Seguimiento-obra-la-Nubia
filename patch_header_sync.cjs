const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Add syncStatus to interface
content = content.replace(/currentUser\?: AuthUser \| null;\n\}/, "currentUser?: AuthUser | null;\n  syncStatus?: 'synced' | 'syncing' | 'offline';\n}");

// Add to destructuring
content = content.replace(/currentUser\n\}\) => \{/, "currentUser,\n  syncStatus = 'synced'\n}) => {");

// Add indicator UI
const indicatorUI = `
        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white drop-shadow-sm flex items-center gap-2">
            Seguimiento de Obra
            {syncStatus === 'synced' && <span title="Sincronizado con la nube" className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
            {syncStatus === 'syncing' && <span title="Guardando cambios..." className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
            {syncStatus === 'offline' && <span title="Sin conexión (Modo Local)" className="w-2 h-2 rounded-full bg-rose-500"></span>}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-300 font-medium">La Nubia - Telemetría y Bitácora</p>
        </div>
`;

content = content.replace(/<div className="flex flex-col">\n\s*<h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white drop-shadow-sm">\n\s*Seguimiento de Obra\n\s*<\/h1>\n\s*<p className="text-\[10px\] sm:text-xs text-slate-300 font-medium">La Nubia - Telemetría y Bitácora<\/p>\n\s*<\/div>/, indicatorUI);

fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched Header.tsx for sync status");
