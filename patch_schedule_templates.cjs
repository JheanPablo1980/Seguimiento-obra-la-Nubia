const fs = require('fs');

let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

const anchor = `const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string>, step: 'summary' | 'review' } | null>(null);`;
const replacement = `const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string>, step: 'summary' | 'review' } | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Record<string, Record<string, string>>>({});
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cronogramaMappingTemplates');
      if (saved) setSavedTemplates(JSON.parse(saved));
    } catch(e) {}
  }, []);
  
  const saveMappingTemplate = () => {
    const name = window.prompt('Nombre de la plantilla de mapeo: (ej. Microsoft Project, Cronograma Contratista A)');
    if (name && importMapping) {
      const newTemplates = { ...savedTemplates, [name]: importMapping.mapping };
      setSavedTemplates(newTemplates);
      localStorage.setItem('cronogramaMappingTemplates', JSON.stringify(newTemplates));
      showToast('Plantilla de mapeo guardada');
    }
  };
  
  const loadMappingTemplate = (name: string) => {
    if (savedTemplates[name] && importMapping) {
      setImportMapping({ ...importMapping, mapping: savedTemplates[name] });
      showToast('Plantilla de mapeo cargada');
    }
  };
`;

content = content.replace(anchor, replacement);

const anchorUI = `<div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setImportMapping(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                    >
                      Cancelar
                    </button>`;

const replaceUI = `<div className="flex justify-between items-center pt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportMapping(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveMappingTemplate}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition"
                        title="Guardar plantilla de mapeo"
                      >
                        Guardar Plantilla
                      </button>
                      {Object.keys(savedTemplates).length > 0 && (
                        <select 
                          onChange={(e) => {
                            if (e.target.value) loadMappingTemplate(e.target.value);
                            e.target.value = '';
                          }}
                          className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 border border-slate-700"
                        >
                          <option value="">Cargar Plantilla...</option>
                          {Object.keys(savedTemplates).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      )}
                    </div>`;

content = content.replace(anchorUI, replaceUI);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
