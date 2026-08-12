const fs = require('fs');
let content = fs.readFileSync('src/components/BitacoraTable.tsx', 'utf-8');

content = content.replace(/<td className="py-2 px-3">/g, '<td className="py-2 px-3" data-label="Elemento">');
content = content.replace(/<td className="py-2 px-2 text-center">\n\s*<select\n\s*value=\{el\.status\}/g, '<td className="py-2 px-2 text-center" data-label="Estado">\n                      <select\n                        value={el.status}');
content = content.replace(/<td className="py-2 px-1 text-center">\n\s*<select\n\s*value=\{el\.acta \|\| ''\}/g, '<td className="py-2 px-1 text-center" data-label="Acta">\n                      <select\n                        value={el.acta || \'\'}');
content = content.replace(/<td className="py-2 px-1 text-center">\n\s*<select\n\s*value=\{el\.itemCobro \|\| ''\}/g, '<td className="py-2 px-1 text-center" data-label="Ítem Cobro">\n                      <select\n                        value={el.itemCobro || \'\'}');
content = content.replace(/<td className="py-2 px-2 text-left">\n\s*<input/g, '<td className="py-2 px-2 text-left" data-label="Observaciones">\n                      <input');
content = content.replace(/<td className="py-2 px-2 text-center">\n\s*<input/g, '<td className="py-2 px-2 text-center" data-label="Fecha">\n                      <input');
content = content.replace(/<td className="py-2 px-2 text-center font-mono text-\[11px\] text-slate-600">/g, '<td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600" data-label="T. Ejec.">');
content = content.replace(/<td className="py-2 px-1 text-center no-print">/g, '<td className="py-2 px-1 text-center no-print" data-label="Acción">');

content = content.replace(/<div className="overflow-x-auto/g, '<div className="overflow-x-auto responsive-table');

fs.writeFileSync('src/components/BitacoraTable.tsx', content);
