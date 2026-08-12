const fs = require('fs');
let content = fs.readFileSync('src/components/BitacoraTable.tsx', 'utf-8');

// Headers
content = content.replace(
  '<th className="py-2 px-2 text-center min-w-[130px]">Acta</th>',
  '<th className="py-2 px-2 text-center min-w-[130px]">ID Unico crono</th>\n              <th className="py-2 px-2 text-center min-w-[130px]">Acta</th>'
);

// Body
const targetBody = `<td className="py-2 px-1 text-center">
                      <select
                        value={normalizeActa(el.acta) === 'Sin Asignar' ? '' : normalizeActa(el.acta)}`;

const replacementBody = `<td className="py-2 px-1 text-center" data-label="ID Unico crono">
                      <input
                        type="text"
                        placeholder="ID crono"
                        value={el.scheduleItemId || ''}
                        onChange={(e) => onUpdateElement({ ...el, scheduleItemId: e.target.value })}
                        className="w-full px-1.5 py-1 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded text-sm text-slate-700 font-mono text-center transition bg-slate-50 focus:bg-white"
                        title="ID Único del Cronograma"
                      />
                    </td>
                    <td className="py-2 px-1 text-center" data-label="Acta">
                      <select
                        value={normalizeActa(el.acta) === 'Sin Asignar' ? '' : normalizeActa(el.acta)}`;

content = content.replace(targetBody, replacementBody);

fs.writeFileSync('src/components/BitacoraTable.tsx', content);
