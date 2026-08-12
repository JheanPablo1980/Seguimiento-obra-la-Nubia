const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleProgressModal.tsx', 'utf-8');

if (!content.includes('import { calcularAvancePorCronograma }')) {
  content = content.replace(
    "import { normalizeActa, getAvailableActas } from '../utils/actaUtils';",
    "import { normalizeActa, getAvailableActas } from '../utils/actaUtils';\nimport { calcularAvancePorCronograma } from '../utils/cronogramaUtils';"
  );
}

// Modify progressMap definition
const oldProgressMapDef = `const progressMap = useMemo(() => {
    const map: Record<string, {
      executed: number;
      inProgress: number;
      pending: number;
      count: number;
      elements: InspectionElement[];
    }> = {};`;

const newProgressMapDef = `const progressMap = useMemo(() => {
    const avances = calcularAvancePorCronograma(elements);
    const map: Record<string, {
      executed: number;
      inProgress: number;
      pending: number;
      count: number;
      completionPercent: number;
      elements: InspectionElement[];
    }> = {};`;

content = content.replace(oldProgressMapDef, newProgressMapDef);

// Add completionPercent inside initialization
content = content.replace(
  `map[item.id] = { executed: 0, inProgress: 0, pending: 0, count: 0, elements: [] };`,
  `map[item.id] = { executed: 0, inProgress: 0, pending: 0, count: 0, completionPercent: 0, elements: [] };`
);

// Add completionPercent population
content = content.replace(
  `return map;\n  }, [scheduleItems, elements]);`,
  `// Populate completionPercent
    Object.keys(map).forEach(key => {
      map[key].completionPercent = avances[key] || 0;
    });
    return map;
  }, [scheduleItems, elements]);`
);

// Replace pctGlobal usage in the table mapping
const oldPctGlobal = `const pctGlobal = item.targetQuantity > 0 ? Math.round((prog.executed / item.targetQuantity) * 100) : 0;`;
const newPctGlobal = `const pctGlobal = Math.round(prog.completionPercent * 100) / 100; // already a percentage, just rounding for display if needed`;

content = content.replace(oldPctGlobal, newPctGlobal);

// Check if we need to replace how it's formatted
content = content.replace(
  `const pctGlobal = Math.round(prog.completionPercent * 100) / 100; // already a percentage, just rounding for display if needed`,
  `const pctGlobal = Math.round((prog.completionPercent || 0) * 100) / 100;`
);

fs.writeFileSync('src/components/ScheduleProgressModal.tsx', content);
