const fs = require('fs');

let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const anchor = `const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string> } | null>(null);`;
const replacement = `const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string>, step: 'summary' | 'review' } | null>(null);`;

content = content.replace(anchor, replacement);

const anchor2 = `setImportMapping({ headers, rows, mapping: detectedMapping });`;
const replacement2 = `setImportMapping({ headers, rows, mapping: detectedMapping, step: 'summary' });`;

content = content.replace(anchor2, replacement2);

const anchor3 = `<div className="flex items-center justify-between border-b border-slate-800 pb-3">`;
const replacement3 = `
                  {importMapping.step === 'summary' ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-sky-400 uppercase">CRONOGRAMA DETECTADO</h4>
                      </div>
                      <div className="text-slate-200 text-xs space-y-1">
                        <p className="font-bold text-emerald-400">✓ {importMapping.rows.length} actividades encontradas</p>
                        
                        {Object.values(importMapping.mapping).includes('idUnicoCrono') ? <p>✓ ID_UNICO_CRONO identificado</p> : <p className="text-red-400">✗ ID_UNICO_CRONO NO identificado</p>}
                        {Object.values(importMapping.mapping).includes('task') ? <p>✓ Actividad identificada</p> : <p className="text-red-400">✗ Actividad NO identificada</p>}
                        {Object.values(importMapping.mapping).includes('duracion') && <p>✓ Duración identificada</p>}
                        {Object.values(importMapping.mapping).includes('start') && <p>✓ Inicio identificado</p>}
                        {Object.values(importMapping.mapping).includes('finish') && <p>✓ Fin identificado</p>}
                        {Object.values(importMapping.mapping).includes('porcentajeCompletado') && <p>✓ Porcentaje completado identificado</p>}
                        {Object.values(importMapping.mapping).includes('comienzoLineaBase') && <p>✓ Línea base identificada</p>}
                        
                        <p className="mt-3 text-slate-400">
                          Idioma detectado: {importMapping.headers.some(h => h.toLowerCase().includes('task') || h.toLowerCase().includes('finish')) ? 'Inglés / Mixto' : 'Español'}
                        </p>
                        <p className="text-slate-400">
                          Columnas adicionales: {importMapping.headers.length - Object.keys(importMapping.mapping).length}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => setImportMapping(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                        >
                          Cancelar
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setImportMapping({...importMapping, step: 'review'})}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
                          >
                            [ REVISAR MAPEO ]
                          </button>
                          <button
                            onClick={handleApplyMapping}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            [ IMPORTAR ]
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">`;

content = content.replace(anchor3, replacement3);

const anchor4 = `REVISAR MAPEO E IMPORTAR
                    </button>
                  </div>
                </div>
              )}`;

const replacement4 = `REVISAR MAPEO E IMPORTAR
                    </button>
                  </div>
                  </>
                  )}
                </div>
              )}`;

content = content.replace(anchor4, replacement4);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
