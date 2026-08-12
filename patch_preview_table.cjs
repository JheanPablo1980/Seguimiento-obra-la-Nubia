const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const anchor = `<th className="p-2">Código</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 text-center">Meta Total</th>
                          <th className="p-2 text-center">Entrega 1</th>
                          <th className="p-2 text-center">Entrega 2</th>
                          <th className="p-2 text-center">Fecha Límite</th>`;

const repl = `<th className="p-2 border-r border-slate-800">ID_UNICO_CRONO</th>
                          <th className="p-2 border-r border-slate-800">Task</th>
                          <th className="p-2 text-center border-r border-slate-800">Inicio</th>
                          <th className="p-2 text-center border-r border-slate-800">Fin</th>
                          <th className="p-2 text-center border-r border-slate-800">Duración</th>
                          <th className="p-2 text-center border-r border-slate-800">% Completado</th>
                          <th className="p-2 text-center">Límite (Legacy)</th>`;

content = content.replace(anchor, repl);

const anchor2 = `<td className="p-2 font-bold text-amber-300">{item.code}</td>
                            <td className="p-2 text-white font-sans">{item.description}</td>
                            <td className="p-2 text-center text-emerald-400 font-bold">{item.targetQuantity} {item.unit}</td>
                            <td className="p-2 text-center text-sky-300">{item.entrega1Target}</td>
                            <td className="p-2 text-center text-indigo-300">{item.entrega2Target}</td>
                            <td className="p-2 text-center text-slate-300">{item.finalDeadline}</td>`;

const repl2 = `<td className="p-2 font-bold text-amber-300 border-r border-slate-800/50">{item.code}</td>
                            <td className="p-2 text-white font-sans border-r border-slate-800/50 truncate max-w-[200px]" title={item.description}>{item.description}</td>
                            <td className="p-2 text-center text-sky-300 border-r border-slate-800/50">{item.start || '-'}</td>
                            <td className="p-2 text-center text-indigo-300 border-r border-slate-800/50">{item.finish || '-'}</td>
                            <td className="p-2 text-center text-emerald-400 font-bold border-r border-slate-800/50">{item.duracion || '-'}</td>
                            <td className="p-2 text-center text-amber-400 font-bold border-r border-slate-800/50">{item.porcentajeCompletado !== undefined && item.porcentajeCompletado !== null ? \`\${item.porcentajeCompletado}%\` : '-'}</td>
                            <td className="p-2 text-center text-slate-400 text-[10px]">{item.finalDeadline || '-'}</td>`;

content = content.replace(anchor2, repl2);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
