const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const tableHeader = `<th className="p-2 border-r border-slate-800">Cód/ID</th>
                            <th className="p-2 border-r border-slate-800">Descripción / Tarea</th>
                            <th className="p-2 text-center border-r border-slate-800">Meta Total</th>
                            <th className="p-2 text-center border-r border-slate-800">Entrega 1</th>
                            <th className="p-2 text-center border-r border-slate-800">Entrega 2</th>
                            <th className="p-2 text-center">Límite</th>`;

const newTableHeader = `<th className="p-2 border-r border-slate-800">ID_UNICO_CRONO</th>
                            <th className="p-2 border-r border-slate-800">Task</th>
                            <th className="p-2 text-center border-r border-slate-800">Inicio</th>
                            <th className="p-2 text-center border-r border-slate-800">Fin</th>
                            <th className="p-2 text-center border-r border-slate-800">Duración</th>
                            <th className="p-2 text-center border-r border-slate-800">% Completado</th>
                            <th className="p-2 text-center">Límite (Legacy)</th>`;

content = content.replace(tableHeader, newTableHeader);

const tableBody = `<td className="p-2 font-bold text-amber-300">{item.code}</td>
                            <td className="p-2 text-white font-sans">{item.description}</td>
                            <td className="p-2 text-center text-emerald-400 font-bold">{item.targetQuantity} {item.unit}</td>
                            <td className="p-2 text-center text-sky-300">{item.entrega1Target}</td>
                            <td className="p-2 text-center text-indigo-300">{item.entrega2Target}</td>
                            <td className="p-2 text-center text-slate-300">{item.finalDeadline}</td>`;

const newTableBody = `<td className="p-2 font-bold text-amber-300">{item.code}</td>
                            <td className="p-2 text-white font-sans">{item.description}</td>
                            <td className="p-2 text-center text-sky-300">{item.start || '-'}</td>
                            <td className="p-2 text-center text-indigo-300">{item.finish || '-'}</td>
                            <td className="p-2 text-center text-emerald-400 font-bold">{item.duracion || '-'}</td>
                            <td className="p-2 text-center text-amber-400 font-bold">{item.porcentajeCompletado !== undefined ? \`\${item.porcentajeCompletado}%\` : '-'}</td>
                            <td className="p-2 text-center text-slate-400 text-[10px]">{item.finalDeadline || '-'}</td>`;

content = content.replace(tableBody, newTableBody);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
