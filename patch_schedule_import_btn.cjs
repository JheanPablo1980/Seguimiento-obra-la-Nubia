const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const importBtn = `
            <button
              onClick={() => setActiveTab('import')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
              title="Cargar cronograma desde Excel/CSV"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-200" />
              <span>📋 Cargar Cronograma (CSV)</span>
            </button>
`;

content = content.replace(
  /<button\n\s*onClick=\{handleExportConsolidatedActasCSV\}/,
  importBtn + "            <button\n              onClick={handleExportConsolidatedActasCSV}"
);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
