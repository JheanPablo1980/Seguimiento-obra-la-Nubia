export function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[%]/g, ' percent ')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const HEADER_ALIASES: Record<string, string[]> = {
  idUnicoCrono: [
    'identificador exclusivo', 'identificador unico', 'id unico', 'id unico crono',
    'unique id', 'unique identifier', 'unique id crono', 'unique cronogram id',
    'id', 'activity id', 'task id', 'codigo', 'item', 'rubro'
  ],
  task: [
    'task', 'tarea', 'actividad', 'nombre actividad', 'nombre de actividad',
    'actividad del cronograma', 'task name', 'activity', 'activity name',
    'description', 'descripción', 'descripcion'
  ],
  duracion: [
    'duración', 'duracion', 'duration', 'duración actividad', 'activity duration', 'task duration'
  ],
  start: [
    'start', 'inicio', 'fecha inicio', 'fecha de inicio', 'inicio actividad',
    'inicio de actividad', 'start date', 'activity start', 'task start'
  ],
  finish: [
    'finish', 'fin', 'fecha fin', 'fecha de fin', 'fecha final', 'finalización',
    'finalizacion', 'fecha de finalizacion', 'finish date', 'end date', 'end',
    'activity finish', 'task finish'
  ],
  porcentajeCompletado: [
    'percent completado', 'percent completo', 'percent avance', 'avance',
    'porcentaje avance', 'porcentaje completado', 'porcentaje de avance',
    'percent complete', 'percent completed', 'percent complete', 'percentage complete',
    'progress', 'percent progress', 'completion', 'percent completion'
  ],
  comienzoLineaBase: [
    'comienzo de linea base estimado', 'comienzo de linea base', 'inicio de linea base',
    'inicio linea base', 'inicio lb', 'baseline start', 'baseline start date',
    'estimated baseline start', 'baseline estimated start'
  ],
  finLineaBase: [
    'fin de linea base', 'fin linea base', 'final linea base', 'fecha fin linea base',
    'baseline finish', 'baseline finish date', 'baseline end'
  ],
  duracionLineaBase: [
    'duracion de linea base', 'duracion linea base', 'duracion lb', 'baseline duration',
    'baseline duration 1', 'baseline duration1'
  ]
};

export const REQUIRED_FIELDS = ['idUnicoCrono', 'task'];

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedTargets = new Set<string>();

  headers.forEach((header, index) => {
    const norm = normalizeHeader(header);
    
    // Level 1: Exact / Normalized Match against the target keys
    if (Object.keys(HEADER_ALIASES).map(k => k.toLowerCase()).includes(norm)) {
       const target = Object.keys(HEADER_ALIASES).find(k => k.toLowerCase() === norm)!;
       if (!usedTargets.has(target)) {
         mapping[index.toString()] = target;
         usedTargets.add(target);
         return;
       }
    }

    // Level 3: Aliases
    for (const [targetField, aliases] of Object.entries(HEADER_ALIASES)) {
      if (usedTargets.has(targetField)) continue;
      
      const normAliases = aliases.map(normalizeHeader);
      if (normAliases.includes(norm)) {
        mapping[index.toString()] = targetField;
        usedTargets.add(targetField);
        break;
      }
    }
  });

  return mapping;
}

// Convert parsed CSV rows into standard internal structure
export function applyMappingToRows(
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>
) {
  return rows.map(row => {
    const obj: any = { rawExtras: {} };
    headers.forEach((header, index) => {
      const target = mapping[index.toString()];
      const val = row[index];
      if (target && target !== 'ignore') {
        if (target === 'porcentajeCompletado') {
          // Parse percentage
          if (val) {
             const clean = val.replace('%', '').trim();
             const num = parseFloat(clean.replace(',', '.'));
             obj[target] = isNaN(num) ? 0 : num;
          } else {
             obj[target] = 0;
          }
        } else {
          obj[target] = val;
        }
      } else {
        // Unknown or ignored columns
        obj.rawExtras[header] = val;
      }
    });
    return obj;
  });
}
