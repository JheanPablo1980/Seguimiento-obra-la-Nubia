const fs = require('fs');

let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

// 1. Imports
if (!content.includes('import { detectColumnMapping, applyMappingToRows, REQUIRED_FIELDS }')) {
  content = content.replace(
    "import { normalizeActa, getAvailableActas } from '../utils/actaUtils';",
    "import { normalizeActa, getAvailableActas } from '../utils/actaUtils';\nimport { detectColumnMapping, applyMappingToRows, REQUIRED_FIELDS, HEADER_ALIASES } from '../utils/importUtils';"
  );
}

// 2. Add state for importMapping
if (!content.includes('const [importMapping')) {
  content = content.replace(
    "const [parsedPreviewItems, setParsedPreviewItems] = useState<ScheduleItem[]>([]);",
    `const [parsedPreviewItems, setParsedPreviewItems] = useState<ScheduleItem[]>([]);
  const [importMapping, setImportMapping] = useState<{ headers: string[], rows: string[][], mapping: Record<string, string> } | null>(null);`
  );
}

// 3. Replace parseCsvToScheduleItems and handleProcessPastedText
// We will replace the whole parseCsvToScheduleItems block up to handleLoadDefaultTemplate
const oldParseCsvStart = `  // Helper function to parse CSV/TSV text into ScheduleItem array`;
const oldParseCsvEnd = `const handleLoadDefaultTemplate = () => {`;

const oldBlock = content.substring(content.indexOf(oldParseCsvStart), content.indexOf(oldParseCsvEnd));

const newBlock = `  const startCsvMapping = (text: string) => {
    const lines = text.split(/\\r?\\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      alert('El archivo no tiene suficientes filas.');
      return;
    }

    const parseLine = (line: string) => line.includes('\\t')
      ? line.split('\\t').map(p => p.trim().replace(/^"|"$/g, ''))
      : line.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine).filter(r => r.length >= 2);
    
    const detectedMapping = detectColumnMapping(headers);
    setImportMapping({ headers, rows, mapping: detectedMapping });
  };

  const handleProcessPastedText = () => {
    if (!pastedCsvText.trim()) {
      alert('Por favor pega texto en formato CSV o tabla de Excel');
      return;
    }
    startCsvMapping(pastedCsvText);
  };

  const handleApplyMapping = () => {
    if (!importMapping) return;
    
    // Check required fields
    const mappedValues = Object.values(importMapping.mapping);
    if (!mappedValues.includes('idUnicoCrono') || !mappedValues.includes('task')) {
      alert('ERROR:\\nNo se encontró un identificador único de actividad (ID_UNICO_CRONO) o Actividad (Task).\\nPor favor mapéalos manualmente.');
      return;
    }

    const mappedRows = applyMappingToRows(importMapping.headers, importMapping.rows, importMapping.mapping);
    
    const items: ScheduleItem[] = mappedRows.map((r: any, i) => {
      // Default extraction to maintain backward compatibility for old tools if fields are missing
      const idUnico = r.idUnicoCrono || \`RUB-\${i + 1}\`;
      const description = r.task || \`Rubro \${i + 1}\`;
      return {
        id: idUnico,
        code: idUnico,
        description: description,
        targetQuantity: 100, // Dummy defaults if they didn't map them
        unit: 'mts',
        entrega1Target: 60,
        entrega2Target: 40,
        duracion: r.duracion,
        start: r.start,
        finish: r.finish,
        porcentajeCompletado: r.porcentajeCompletado,
        comienzoLineaBase: r.comienzoLineaBase,
        finLineaBase: r.finLineaBase,
        duracionLineaBase: r.duracionLineaBase,
        rawExtras: r.rawExtras
      } as ScheduleItem;
    });

    setParsedPreviewItems(items);
    setImportMapping(null);
    showToast(\`CRONOGRAMA DETECTADO: ¡Se extrajeron \${items.length} actividades correctamente!\`);
  };

  const handleApplyImport = () => {
    if (parsedPreviewItems.length === 0) return;

    if (importMode === 'replace') {
      onUpdateScheduleItems(parsedPreviewItems);
      showToast(\`Cronograma reemplazado exitosamente con \${parsedPreviewItems.length} rubros\`);
    } else {
      // Merge by code/id
      const existingMap = new Map(scheduleItems.map(i => [i.code, i]));
      parsedPreviewItems.forEach(item => {
        existingMap.set(item.code, item);
      });
      const merged = Array.from(existingMap.values());
      onUpdateScheduleItems(merged);
      showToast(\`Cronograma actualizado: total \${merged.length} rubros\`);
    }

    setParsedPreviewItems([]);
    setPastedCsvText('');
    setActiveTab('matrix');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const items = JSON.parse(content);
          setParsedPreviewItems(items);
          showToast(\`Se procesaron \${items.length} rubros desde JSON\`);
        } catch (err) {
          alert('Error al leer JSON: ' + (err as Error).message);
        }
      } else {
        startCsvMapping(content);
      }
    };
    reader.readAsText(file);
  };

  `;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
