const fs = require('fs');
let content = fs.readFileSync('src/components/MemoriaCalculoModal.tsx', 'utf-8');

// Modify the Export buttons to have active:scale-95 and better mobile padding
content = content.replace(
  /className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md"/g,
  'className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md active:scale-95 active:shadow-sm"'
);

// Specifically replace the text of "Excel (Memorias)" to "Exportar a Excel"
content = content.replace(
  /<span>📊 Excel \(Memorias\)<\/span>/g,
  '<span>📊 Exportar a Excel</span>'
);

// Print button
content = content.replace(
  /className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md"/g,
  'className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-md active:scale-95 active:shadow-sm"'
);

// Matriz Actas
content = content.replace(
  /className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"/g,
  'className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm active:scale-95"'
);

// Import Catalog
content = content.replace(
  /className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"/g,
  'className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm active:scale-95"'
);

fs.writeFileSync('src/components/MemoriaCalculoModal.tsx', content);
