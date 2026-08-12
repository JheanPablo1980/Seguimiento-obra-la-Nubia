const fs = require('fs');

let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const anchor = `{/* Parsed Items Preview & Import Options */}`;

const mappingUI = `              {/* Mapping UI */}
              {importMapping && (
                <div className="p-4 bg-slate-950 rounded-xl border border-sky-500/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-sky-400">MAPEO DE COLUMNAS (CRONOGRAMA DETECTADO)</h4>
                      <p className="text-[11px] text-slate-400">Revisa y ajusta la relación entre los encabezados del archivo y los campos del sistema.</p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">✓ {importMapping.rows.length} actividades encontradas</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <th className="p-2 font-bold uppercase">Encabezado encontrado</th>
                          <th className="p-2 font-bold uppercase">Campo del sistema</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importMapping.headers.map((header, idx) => {
                          const mappedTo = importMapping.mapping[idx.toString()];
                          const isRequired = mappedTo === 'idUnicoCrono' || mappedTo === 'task';
                          return (
                            <tr key={idx} className="border-b border-slate-800 hover:bg-slate-900/50">
                              <td className="p-2 font-mono text-slate-300">
                                {header || \`(Columna \${idx + 1})\`}
                              </td>
                              <td className="p-2">
                                <select
                                  value={mappedTo || 'ignore'}
                                  onChange={(e) => {
                                    setImportMapping({
                                      ...importMapping,
                                      mapping: { ...importMapping.mapping, [idx.toString()]: e.target.value }
                                    });
                                  }}
                                  className={\`w-full bg-slate-900 border rounded-lg px-2 py-1 text-xs \${isRequired ? 'border-amber-500/50 text-amber-300 font-bold' : 'border-slate-700 text-slate-200'}\`}
                                >
                                  <option value="ignore">-- Ignorar (Columna Adicional) --</option>
                                  <option value="idUnicoCrono">ID_UNICO_CRONO ✓</option>
                                  <option value="task">Task / Actividad ✓</option>
                                  <option value="duracion">Duración ✓</option>
                                  <option value="start">Start / Inicio ✓</option>
                                  <option value="finish">Finish / Fin ✓</option>
                                  <option value="porcentajeCompletado">% completado ✓</option>
                                  <option value="comienzoLineaBase">Línea base inicio ✓</option>
                                  <option value="finLineaBase">Línea base fin ✓</option>
                                  <option value="duracionLineaBase">Línea base duración ✓</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setImportMapping(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleApplyMapping}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      REVISAR MAPEO E IMPORTAR
                    </button>
                  </div>
                </div>
              )}

              {/* Parsed Items Preview & Import Options */}`;

content = content.replace(anchor, mappingUI);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
